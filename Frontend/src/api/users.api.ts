import { apiClient } from './client';
import { UserRole } from '../types';
import { AuthUserDto } from './auth.api';

export interface UserListResponseData {
  users: AuthUserDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  teamId?: string | null;
  managerId?: string | null;
  teamLeadId?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  teamId?: string | null;
  managerId?: string | null;
  teamLeadId?: string | null;
}

export const usersApi = {
  listUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    apiClient.get<UserListResponseData>('/users', { params }),

  getUserById: (id: string) => apiClient.get<AuthUserDto>(`/users/${id}`),

  createUser: (data: CreateUserInput) => apiClient.post<AuthUserDto>('/users', data),

  updateUser: (id: string, data: UpdateUserInput) =>
    apiClient.patch<AuthUserDto>(`/users/${id}`, data),

  updateStatus: (id: string, status: 'active' | 'restricted' | 'inactive') =>
    apiClient.patch<AuthUserDto>(`/users/${id}/status`, { status }),

  resetPassword: (id: string, newPassword: string) =>
    apiClient.post<null>(`/users/${id}/reset-password`, { newPassword }),
};
