import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Team, User } from '../../types';
import {
  Network,
  Plus,
  Users,
  Briefcase,
  Crown,
  Edit2,
  Trash2,
  UserPlus,
  Check,
  X,
  Search,
  AlertCircle
} from 'lucide-react';
import { getRoleBadgeStyle } from '../../utils/formatters';
import {
  EmptyState,
  ModalShell,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Badge,
  ConfirmDialog
} from '../ui';

export const TeamsAdminView: React.FC = () => {
  const { teams, users, addTeam, updateTeam, deleteTeam } = useCRM();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<Team | null>(null);

  // Form State for Create / Edit Team Modal
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [formError, setFormError] = useState('');

  // Candidates for Managers and Team Leads
  const managerCandidates = useMemo(
    () => users.filter(u => u.role === 'Manager' || u.role === 'Admin' || u.role === 'Super Admin'),
    [users]
  );
  const teamLeadCandidates = useMemo(
    () => users.filter(u => u.role === 'Team Lead' || u.role === 'Manager'),
    [users]
  );
  const eligibleEmployees = useMemo(() => users.filter(u => u.isActive), [users]);

  // Derived real summary counts
  const totalTeamsCount = teams.length;
  const activeTeamsCount = teams.length;
  const uniqueManagersCount = useMemo(() => {
    return new Set(teams.map(t => t.managerName || t.managerId).filter(Boolean)).size;
  }, [teams]);
  const uniqueLeadsCount = useMemo(() => {
    return new Set(teams.map(t => t.leaderName || t.leaderId).filter(Boolean)).size;
  }, [teams]);
  const assignedMembersCount = useMemo(() => {
    const ids = new Set<string>();
    teams.forEach(t => {
      (t.memberIds || []).forEach(mId => ids.add(mId));
      users.filter(u => u.teamId === t.id).forEach(u => ids.add(u.id));
    });
    return ids.size;
  }, [teams, users]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamCode('');
    setDescription('');
    setSelectedManagerId(managerCandidates[0]?.id || '');
    setSelectedTeamLeadId(teamLeadCandidates[0]?.id || '');
    setSelectedMemberIds([]);
    setMemberSearchQuery('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamCode(team.code || '');
    setDescription(team.description || '');

    const matchedMgr = users.find(u => u.name === team.managerName || u.id === team.managerId);
    setSelectedManagerId(matchedMgr?.id || team.managerId || managerCandidates[0]?.id || '');

    const matchedLead = users.find(u => u.name === team.leaderName || u.id === team.leaderId);
    setSelectedTeamLeadId(matchedLead?.id || team.leaderId || teamLeadCandidates[0]?.id || '');

    const currentMemberIds = Array.from(
      new Set([...(team.memberIds || []), ...users.filter(u => u.teamId === team.id).map(u => u.id)])
    );
    setSelectedMemberIds(currentMemberIds);
    setMemberSearchQuery('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Quick Manage Members Modal
  const handleOpenManageMembers = (team: Team) => {
    setManagingMembersTeam(team);
    const currentMemberIds = Array.from(
      new Set([...(team.memberIds || []), ...users.filter(u => u.teamId === team.id).map(u => u.id)])
    );
    setSelectedMemberIds(currentMemberIds);
    setMemberSearchQuery('');
  };

  // Save Team (Create or Edit)
  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setFormError('Team Name is required.');
      return;
    }

    const assignedMgr = users.find(u => u.id === selectedManagerId);
    const assignedLead = users.find(u => u.id === selectedTeamLeadId);

    const allMembers = Array.from(
      new Set([
        ...selectedMemberIds,
        ...(selectedTeamLeadId ? [selectedTeamLeadId] : []),
        ...(selectedManagerId ? [selectedManagerId] : [])
      ])
    );

    if (editingTeam) {
      updateTeam({
        ...editingTeam,
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase() || teamName.trim().substring(0, 3).toUpperCase(),
        description: description.trim(),
        managerId: selectedManagerId,
        managerName: assignedMgr?.name || '',
        leaderId: selectedTeamLeadId,
        leaderName: assignedLead?.name || '',
        memberIds: allMembers
      });
    } else {
      addTeam({
        name: teamName.trim(),
        code: teamCode.trim().toUpperCase() || teamName.trim().substring(0, 3).toUpperCase(),
        description: description.trim(),
        managerId: selectedManagerId,
        managerName: assignedMgr?.name || '',
        leaderId: selectedTeamLeadId,
        leaderName: assignedLead?.name || '',
        memberIds: allMembers
      });
    }

    setIsCreateModalOpen(false);
    setEditingTeam(null);
  };

  // Save Members from Quick Manage Members Modal
  const handleSaveMembersOnly = () => {
    if (!managingMembersTeam) return;

    updateTeam({
      ...managingMembersTeam,
      memberIds: selectedMemberIds
    });

    setManagingMembersTeam(null);
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleDeleteTeam = (team: Team) => {
    setDeleteConfirmTeam(team);
  };

  const handleConfirmDeleteTeam = () => {
    if (!deleteConfirmTeam) return;
    deleteTeam(deleteConfirmTeam.id);
    setDeleteConfirmTeam(null);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-[#0F172A] dark:text-white tracking-tight">
            Teams
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Manage organizational sales teams, managers, team leads and assigned members.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Team</span>
        </button>
      </div>

      {/* 2. Team Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Total Teams
          </p>
          <p className="text-xl font-medium text-[#0F172A] dark:text-white mt-1">
            {totalTeamsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Active Units
          </p>
          <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            {activeTeamsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Assigned Managers
          </p>
          <p className="text-xl font-medium text-purple-600 dark:text-purple-400 mt-1">
            {uniqueManagersCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Team Leads
          </p>
          <p className="text-xl font-medium text-amber-600 dark:text-amber-400 mt-1">
            {uniqueLeadsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Assigned Staff
          </p>
          <p className="text-xl font-medium text-[#2563EB] dark:text-blue-400 mt-1">
            {assignedMembersCount}
          </p>
        </div>
      </div>

      {/* 3. Team Cards Directory */}
      {teams.length === 0 ? (
        <EmptyState
          title="No Teams Created"
          description="Create sales teams to group representatives, assign reporting managers, and track divisional performance."
          actionLabel="Create Team"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map(team => {
            const rawMembers = users.filter(u => u.teamId === team.id || team.memberIds?.includes(u.id));
            const members = Array.from(new Map<string, User>(rawMembers.map(m => [m.id, m])).values());
            const managerUser = users.find(u => u.name === team.managerName || u.id === team.managerId);
            const leadUser = users.find(u => u.name === team.leaderName || u.id === team.leaderId);

            return (
              <div
                key={team.id}
                className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="space-y-4">
                  {/* Card Header: Team Name, Code, and Member Count */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 dark:border-blue-900">
                        <Network className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-base text-[#0F172A] dark:text-white leading-tight">
                            {team.name}
                          </h3>
                          {team.code && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                              {team.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                          {members.length} {members.length === 1 ? 'member' : 'members'} assigned
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      <Users className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed min-h-[32px]">
                    {team.description || 'No description provided for this organizational team.'}
                  </p>

                  {/* Hierarchy Clarity Section */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                        <span>Team Manager:</span>
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-white text-xs">
                        {team.managerName || managerUser?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                      <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span>Team Lead:</span>
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-white text-xs">
                        {team.leaderName || leadUser?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 tracking-wider">
                        Staff Members
                      </span>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono">
                        {members.length} Total
                      </span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {members.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          No staff members assigned to this team yet.
                        </p>
                      ) : (
                        members.map(m => {
                          const roleStyle = getRoleBadgeStyle(m.role);
                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={m.avatar}
                                  alt={m.name}
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                />
                                <div className="truncate">
                                  <p className="font-semibold text-[#0F172A] dark:text-white truncate text-xs">
                                    {m.name}
                                  </p>
                                  <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
                                    {m.email}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleStyle.badge}`}
                              >
                                {m.role}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions: [Edit Team], [Manage Members], [Delete Team] */}
                <div className="pt-4 mt-4 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(team)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenManageMembers(team)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Members</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(team)}
                    title="Delete Team"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TEAM MODAL */}
      <ModalShell
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title={editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create New Team'}
        subtitle={editingTeam ? 'Update team designation, management leadership and assigned members' : 'Provision a new organizational branch with manager and team lead oversight'}
        icon={<Network className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="team-admin-form"
              variant="primary"
              size="sm"
            >
              {editingTeam ? 'Save Team Changes' : 'Create Team'}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form id="team-admin-form" onSubmit={handleSaveTeam} className="space-y-4 text-xs">
          {/* Team Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <FormField label="Team Name" required>
                <Input
                  type="text"
                  required
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Enterprise Sales"
                />
              </FormField>
            </div>

            <div>
              <FormField label="Team Code">
                <Input
                  type="text"
                  value={teamCode}
                  onChange={e => setTeamCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ENT"
                  maxLength={6}
                  className="font-mono font-medium uppercase"
                />
              </FormField>
            </div>
          </div>

          {/* Description */}
          <FormField label="Description">
            <Textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Operational scope, market focus or territory..."
            />
          </FormField>

          {/* Assign Manager & Team Lead */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Team Manager">
              <Select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
              >
                <option value="">Select Reporting Manager...</option>
                {managerCandidates.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Team Lead">
              <Select
                value={selectedTeamLeadId}
                onChange={e => setSelectedTeamLeadId(e.target.value)}
              >
                <option value="">Select Team Lead...</option>
                {teamLeadCandidates.map(tl => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name} ({tl.role})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Members Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-[#0F172A] dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Team Members ({selectedMemberIds.length} Selected)
              </label>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                placeholder="Search staff to assign..."
                className="pl-8 text-xs"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-[#E5EAF1] dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-1 bg-slate-50/50 dark:bg-slate-800/20">
              {eligibleEmployees
                .filter(
                  u =>
                    u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                )
                .map(u => {
                  const isSelected = selectedMemberIds.includes(u.id);
                  const isPrimary = u.teamId === editingTeam?.id;
                  const roleStyle = getRoleBadgeStyle(u.role);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleMember(u.id)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-[#2563EB] cursor-pointer"
                        />
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-semibold text-[#0F172A] dark:text-white truncate text-xs">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPrimary ? (
                          <Badge variant="primary" size="sm">
                            Primary
                          </Badge>
                        ) : u.teamName ? (
                          <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            in {u.teamName}
                          </span>
                        ) : null}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.badge}`}
                        >
                          {u.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </form>
      </ModalShell>

      {/* QUICK MANAGE MEMBERS MODAL */}
      <ModalShell
        isOpen={!!managingMembersTeam}
        onClose={() => setManagingMembersTeam(null)}
        size="lg"
        title="Manage Team Members"
        subtitle={managingMembersTeam ? `Configure active members for ${managingMembersTeam.name}` : ''}
        icon={<UserPlus className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setManagingMembersTeam(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveMembersOnly}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save Membership ({selectedMemberIds.length})
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          {/* Filter Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={memberSearchQuery}
              onChange={e => setMemberSearchQuery(e.target.value)}
              placeholder="Search staff to add or remove..."
              className="pl-8 text-xs"
            />
          </div>

          {/* Member List */}
          <div className="max-h-60 overflow-y-auto border border-[#E5EAF1] dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-1 bg-slate-50/50 dark:bg-slate-800/20">
            {eligibleEmployees
              .filter(
                u =>
                  u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
              )
              .map(u => {
                const isSelected = selectedMemberIds.includes(u.id);
                const isPrimary = u.teamId === managingMembersTeam?.id;
                const roleStyle = getRoleBadgeStyle(u.role);

                return (
                  <div
                    key={u.id}
                    onClick={() => handleToggleMember(u.id)}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-[#2563EB] cursor-pointer"
                      />
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-bold text-[#0F172A] dark:text-white truncate text-xs">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPrimary ? (
                        <Badge variant="primary" size="sm">
                          Primary
                        </Badge>
                      ) : u.teamName ? (
                        <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          in {u.teamName}
                        </span>
                      ) : null}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.badge}`}
                      >
                        {u.role}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </ModalShell>

      {/* DESTRUCTIVE CONFIRM DIALOG FOR TEAM DELETION */}
      <ConfirmDialog
        isOpen={!!deleteConfirmTeam}
        onClose={() => setDeleteConfirmTeam(null)}
        onConfirm={handleConfirmDeleteTeam}
        title="Delete Team"
        entityName={deleteConfirmTeam ? deleteConfirmTeam.name : ''}
        consequence="Members assigned to this team will become unassigned, and hierarchy oversight will revert to direct administrative management."
        confirmLabel="Delete Team"
        confirmVariant="danger"
      />
    </div>
  );
};
