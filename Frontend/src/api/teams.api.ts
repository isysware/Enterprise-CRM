import { apiClient } from './client';

export interface TeamDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  status: 'active' | 'inactive' | 'archived';
  memberCount?: number;
  memberIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TeamListResponseData {
  teams: TeamDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTeamInput {
  name: string;
  code: string;
  description?: string;
  managerId?: string | null;
  teamLeadId?: string | null;
}

export interface UpdateTeamInput {
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
  teamLeadId?: string | null;
  status?: 'active' | 'inactive' | 'archived';
}

export const teamsApi = {
  listTeams: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<TeamListResponseData>('/teams', { params }),

  getTeamById: (id: string) => apiClient.get<TeamDto>(`/teams/${id}`),

  createTeam: (data: CreateTeamInput) => apiClient.post<TeamDto>('/teams', data),

  updateTeam: (id: string, data: UpdateTeamInput) =>
    apiClient.patch<TeamDto>(`/teams/${id}`, data),

  deleteTeam: (id: string) => apiClient.delete<null>(`/teams/${id}`),

  addMember: (teamId: string, userId: string, isPrimary = false) =>
    apiClient.post<{ teamId: string; userId: string; isPrimary: boolean }>(
      `/teams/${teamId}/members`,
      { userId, isPrimary }
    ),

  removeMember: (teamId: string, userId: string) =>
    apiClient.delete<null>(`/teams/${teamId}/members/${userId}`),
};
