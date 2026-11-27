import { apiClient } from './client';
import { UserRole } from '../types';

export interface RolePermissionMatrixDto {
  role: UserRole;
  description: string;
  isProtected: boolean;
  capabilities: Record<string, boolean>;
}

export const rolesApi = {
  getRoles: () => apiClient.get<UserRole[]>('/roles'),

  getAllMatrices: () => apiClient.get<RolePermissionMatrixDto[]>('/roles/permissions'),

  updateCapability: (role: UserRole, capability: string, isGranted: boolean) =>
    apiClient.put<RolePermissionMatrixDto>(`/roles/${encodeURIComponent(role)}/permissions`, {
      capability,
      isGranted,
    }),

  resetDefaults: () => apiClient.post<RolePermissionMatrixDto[]>('/roles/permissions/reset'),
};
