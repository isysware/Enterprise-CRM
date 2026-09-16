import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Team, User } from '../../types';
import {
  Network,
  Plus,
  Users,
  Shield,
  Edit2,
  Trash2,
  UserPlus,
  Check,
  X,
  Search,
  Briefcase,
  Layers,
  Crown,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { getRoleBadgeStyle } from '../../utils/formatters';

export const TeamsAdminView: React.FC = () => {
  const { teams, users, addTeam, updateTeam, deleteTeam, currentUser } = useCRM();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);

  // Form State for Create / Edit Team Modal
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [formError, setFormError] = useState('');

  // Potential Managers and Team Leads
  const managerCandidates = users.filter(
    u => u.role === 'Manager' || u.role === 'Admin' || u.role === 'Super Admin'
  );
  const teamLeadCandidates = users.filter(
    u => u.role === 'Team Lead' || u.role === 'Manager'
  );
  // All active staff eligible for team membership
  const eligibleEmployees = users.filter(u => u.isActive);

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
    
    // Find current manager ID or fallback
    const matchedMgr = users.find(u => u.name === team.managerName || u.id === team.managerId);
    setSelectedManagerId(matchedMgr?.id || team.managerId || managerCandidates[0]?.id || '');

    // Find current lead ID or fallback
    const matchedLead = users.find(u => u.name === team.leaderName || u.id === team.leaderId);
    setSelectedTeamLeadId(matchedLead?.id || team.leaderId || teamLeadCandidates[0]?.id || '');

    // Find current team members (from team.memberIds and users whose teamId === team.id)
    const currentMemberIds = Array.from(new Set([
      ...(team.memberIds || []),
      ...users.filter(u => u.teamId === team.id).map(u => u.id)
    ]));
    setSelectedMemberIds(currentMemberIds);
    setMemberSearchQuery('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Quick Manage Members Modal
  const handleOpenManageMembers = (team: Team) => {
    setManagingMembersTeam(team);
    const currentMemberIds = Array.from(new Set([
      ...(team.memberIds || []),
      ...users.filter(u => u.teamId === team.id).map(u => u.id)
    ]));
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

    // Auto-include manager & team lead in memberIds if selected
    const allMembers = Array.from(new Set([
      ...selectedMemberIds,
      ...(selectedTeamLeadId ? [selectedTeamLeadId] : []),
      ...(selectedManagerId ? [selectedManagerId] : [])
    ]));

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

  // Toggle member selection helper
  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Delete Team
  const handleDeleteTeam = (team: Team) => {
    if (window.confirm(`Are you sure you want to delete the team "${team.name}"? Members assigned to this team will become unassigned.`)) {
      deleteTeam(team.id);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar with Primary "+ Create New Team" Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Sales &amp; Departmental Teams
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {teams.length} Teams
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure sales divisions, assign reporting managers and team leads, and organize representatives by territory.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Team</span>
        </button>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map(team => {
          // Dynamic team members (strictly deduplicated)
          const rawMembers = users.filter(u => u.teamId === team.id || team.memberIds?.includes(u.id));
          const members = Array.from(new Map<string, typeof users[0]>(rawMembers.map(m => [m.id, m])).values());
          const managerUser = users.find(u => u.name === team.managerName || u.id === team.managerId);
          const leadUser = users.find(u => u.name === team.leaderName || u.id === team.leaderId);

          return (
            <div
              key={team.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Team Card Header: Icon, Code & Dynamic Member Count Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                          {team.name}
                        </h3>
                        {team.code && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                            {team.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'Active'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Member Count Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>{members.length} Active Members</span>
                  </span>
                </div>

                {/* Team Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[32px]">
                  {team.description || 'No description provided for this departmental team.'}
                </p>

                {/* Hierarchy Badges: Assigned Manager & Assigned Team Lead */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-purple-500" />
                      Assigned Manager:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {team.managerName || managerUser?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Assigned Team Lead:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {team.leaderName || leadUser?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Team Employees List with Role Badges & Avatars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Team Members &amp; Staff:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {members.length} Total
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {members.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No employees currently assigned to this team.</p>
                    ) : (
                      members.map(m => {
                        const roleStyle = getRoleBadgeStyle(m.role);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={m.avatar}
                                alt={m.name}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                              <div className="truncate">
                                <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                                  {m.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                              </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${roleStyle.badge}`}>
                              <span className={`w-1 h-1 rounded-full ${roleStyle.dot}`} />
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
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(team)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Edit Team</span>
                  </button>

                  <button
                    onClick={() => handleOpenManageMembers(team)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Manage Members</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteTeam(team)}
                  title="Delete Team"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT TEAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Network className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingTeam ? `Edit Team: ${editingTeam.name}` : 'Create New Sales Team'}
                </h3>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
              {/* Team Name & Code / Key */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Enterprise & Salon Sales"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Team Code / Key
                  </label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={e => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ESS"
                    maxLength={6}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Focuses on Supermarkets and Custom POS"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Assign Manager & Assign Team Lead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Assign Team Manager
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={e => setSelectedManagerId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select Reporting Manager...</option>
                    {managerCandidates.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Assign Team Lead
                  </label>
                  <select
                    value={selectedTeamLeadId}
                    onChange={e => setSelectedTeamLeadId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Select Team Lead...</option>
                    {teamLeadCandidates.map(tl => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Select Employees to Add to this Team */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Add Team Members ({selectedMemberIds.length} Selected)
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    Multi-select Employees
                  </span>
                </div>

                {/* Filter Search inside employee list */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="Search employees by name or email..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-1 bg-slate-50/50 dark:bg-slate-800/20">
                  {eligibleEmployees
                    .filter(u =>
                      u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                    )
                    .map(u => {
                      const isSelected = selectedMemberIds.includes(u.id);
                      const roleStyle = getRoleBadgeStyle(u.role);

                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleMember(u.id)}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by div onClick
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                                {u.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {u.teamName && !isSelected && (
                              <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                in {u.teamName}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.badge}`}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  {editingTeam ? 'Save Team Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MANAGE MEMBERS MODAL */}
      {managingMembersTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Manage Team Members
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {managingMembersTeam.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setManagingMembersTeam(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                placeholder="Search staff to add or remove..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Member List */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-1 bg-slate-50/50 dark:bg-slate-800/20">
              {eligibleEmployees
                .filter(u =>
                  u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                )
                .map(u => {
                  const isSelected = selectedMemberIds.includes(u.id);
                  const roleStyle = getRoleBadgeStyle(u.role);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleMember(u.id)}
                      className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.badge}`}>
                        {u.role}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setManagingMembersTeam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMembersOnly}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Membership ({selectedMemberIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

