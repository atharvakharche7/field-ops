import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as authApi from '../api/auth';
import { getAuthToken, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { User } from '../types';

const TOKEN_KEY = 'fieldops.token';
const USER_KEY = 'fieldops.user';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean; // true only while the app checks for a saved login on startup
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const parseUser = (json: string | null): User | null => {
  try {
    return json ? (JSON.parse(json) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    // Otherwise the next person to log in on this phone could briefly see these tickets.
    queryClient.clear();
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setAuthToken(result.token);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, result.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user)),
    ]);
    setUser(result.user);
  }, []);

  // Any request that gets a 401 logs the user out, wherever in the app it happened.
  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // On startup, restore a saved login.
  useEffect(() => {
    const restore = async () => {
      let token: string | null = null;
      let savedUser: User | null = null;
      try {
        [token, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY).then(parseUser),
        ]);
      } catch {
        // Android can lose the encryption key after a device restore. Treat it as logged out.
      }

      if (!token) {
        setIsLoading(false);
        return;
      }
      setAuthToken(token);

      // Open straight away with the saved user, so a technician with no signal can still
      // get in. The offline queue depends on this.
      if (savedUser) {
        setUser(savedUser);
        setIsLoading(false);
      }

      // Then check the token with the server in the background. An expired token gets a 401,
      // and the interceptor logs out. A network error changes nothing: we're just offline.
      try {
        const fresh = await authApi.me();
        // Skip if the user logged out or switched accounts while this request was running.
        if (getAuthToken() === token) {
          setUser(fresh);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
        }
      } catch {
        // Handled above: 401 by the interceptor, network errors deliberately ignored.
      } finally {
        setIsLoading(false);
      }
    };
    void restore();
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
