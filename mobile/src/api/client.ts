import axios, { AxiosError } from 'axios';

import { ApiError } from '../types';

// Expo copies EXPO_PUBLIC_* values from mobile/.env into the app when it bundles.
const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env and restart Expo.');
}

export const api = axios.create({ baseURL, timeout: 15000 });

// Kept in memory so every request can read it instantly. AuthContext is the only writer,
// and it also saves the token to SecureStore so it survives an app restart.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

// Runs before every request: attach the login token.
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Runs after every failed request. A 401 means the token expired or is invalid, so log out.
// It only fires if the request carried the current token, which leaves out two cases:
// a wrong password on the login screen (no token sent), and a slow reply to an old token
// arriving after the user has already logged in again.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const sentAuth = error.config?.headers?.Authorization;
    if (error.response?.status === 401 && authToken && sentAuth === `Bearer ${authToken}`) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** True when the server never answered: no internet, backend stopped, or a timeout. */
export const isNetworkError = (error: unknown) => axios.isAxiosError(error) && !error.response;

/** The message to show the user: the backend's own text if it replied, a plain one if it didn't. */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (!error.response) {
      return "Can't reach the server. Check your connection and that the backend is running.";
    }
  }
  return 'Something went wrong. Please try again.';
};
