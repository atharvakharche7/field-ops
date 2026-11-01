import { LoginResponse, User } from '../types';
import { api } from './client';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
  return data;
};

export const me = async (): Promise<User> => {
  const { data } = await api.get<User>('/api/auth/me');
  return data;
};
