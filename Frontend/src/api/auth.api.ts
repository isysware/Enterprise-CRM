import { apiClient } from './client';
import { UserRole } from '../types';

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'restricted' | 'inactive';
  isActive: boolean;
  teamId?: string;
  teamName?: string;
  managerId?: string;
  managerName?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  avatarUrl?: string;
  avatar?: string;
  phone?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginResponseData {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

export interface GetMeResponseData {
  user: AuthUserDto;
  permissions: Record<string, boolean>;
  scope: {
    managedTeamIds: string[];
    subordinateUserIds: string[];
    scopedTeamIds?: string[];
    assignableUserIds?: string[];
    isSuperAdmin?: boolean;
    isAdmin?: boolean;
    isManager?: boolean;
    isTeamLead?: boolean;
    isEmployee?: boolean;
  };
}

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<LoginResponseData>('/auth/login', credentials),

  logout: () => apiClient.post<null>('/auth/logout'),

  getMe: () => apiClient.get<GetMeResponseData>('/auth/me'),

  refresh: () => apiClient.post<LoginResponseData>('/auth/refresh'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<null>('/auth/change-password', data),
};
