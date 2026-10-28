import React, { useState, useRef, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { User, UserRole } from '../../types';
import {
  UserCog,
  Plus,
  ShieldCheck,
  Edit2,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Network,
  Briefcase,
  Crown,
  X,
  Upload,
  Link as LinkIcon,
  Camera,
  Search,
  Filter,
  Users,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  DataTableScrollFrame,
  EmptyState,
  ModalShell,
  FormField,
  Input,
  Select,
  Button,
  Badge,
  ConfirmDialog
} from '../ui';

export const UsersAdminView: React.FC = () => {
  const {
    users,
    scopedUsers,
    teams,
    scopedTeams,
    currentUser,
    addUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    canManageSuperAdminAccount,
    canManageUser,
    canCreateUserWithRole,
    canTransitionUserRole,
    getAllowedTargetRoles
  } = useCRM();

  const allowedTargetRoles = getAllowedTargetRoles();
  const canCreateAnyUser = allowedTargetRoles.length > 0;

  // Filters State
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+92 300 0000000');
  const [role, setRole] = useState<UserRole>('Employee');
  const [isActive, setIsActive] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [teamLeadName, setTeamLeadName] = useState('');
  const [password, setPassword] = useState('Emp@123');
  const [avatar, setAvatar] = useState('');
  const [imageError, setImageError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered list of Managers and Team Leads for dropdowns
  const managerOptions = users.filter(
    u => u.role === 'Manager' || u.role === 'Admin' || u.role === 'Super Admin'
  );
  const teamLeadOptions = users.filter(
    u => u.role === 'Team Lead' || u.role === 'Manager'
  );

  // Handle native image upload and downsample to max 256x256
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(optimizedUrl);
          setImageError(false);
        } else {
          setAvatar(dataUrl);
          setImageError(false);
        }
      };
      img.onerror = () => {
        setAvatar(dataUrl);
        setImageError(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sync Manager and Team Lead when team changes in modal
  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId);
    if (newTeamId) {
      const selectedTeam = teams.find(t => t.id === newTeamId);
      if (selectedTeam) {
        if (selectedTeam.managerName) setManagerName(selectedTeam.managerName);
        if (selectedTeam.leaderName) setTeamLeadName(selectedTeam.leaderName);
      }
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!canCreateAnyUser) {
      setActionFeedback({ type: 'error', message: 'Security Policy: You are not authorized to create new user accounts.' });
      return;
    }
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('+92 300 0000000');
    const defaultRole = allowedTargetRoles.includes('Employee')
      ? 'Employee'
      : allowedTargetRoles[0] || 'Employee';
    setRole(defaultRole as UserRole);
    setIsActive(true);
    const defaultTeam = teams[0];
    setTeamId(defaultTeam?.id || '');
    setManagerName(defaultTeam?.managerName || '');
    setTeamLeadName(defaultTeam?.leaderName || '');
    setPassword('Emp@123');
    setAvatar('');
    setImageError(false);
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (userToEdit: User) => {
    if (!canManageUser(userToEdit)) {
      setActionFeedback({ type: 'error', message: 'Security Policy: You are not authorized to edit this protected account.' });
      return;
    }
    setEditingUser(userToEdit);
    setName(userToEdit.name);
    setEmail(userToEdit.email);
    setPhone(userToEdit.phone || '+92 300 0000000');
    setRole(userToEdit.role);
    setIsActive(userToEdit.isActive !== false);
    setTeamId(userToEdit.teamId || '');
    setManagerName(userToEdit.managerName || '');
    setTeamLeadName(userToEdit.teamLeadName || '');
    setPassword(userToEdit.password || 'Emp@123');
    setAvatar(userToEdit.avatar || '');
    setImageError(false);
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  // Toggle user status
  const handleToggleStatus = (targetUser: User) => {
    const res = toggleUserStatus(targetUser.id);
    if (!res.success && res.error) {
      setActionFeedback({ type: 'error', message: res.error });
    } else {
      setActionFeedback({ type: 'success', message: `User "${targetUser.name}" status updated.` });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Delete user with ConfirmDialog
  const handleDelete = (targetUser: User) => {
    if (!canManageUser(targetUser)) {
      setActionFeedback({ type: 'error', message: 'Security Policy: You are not authorized to delete this protected account.' });
      return;
    }
    setDeleteConfirmUser(targetUser);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    const res = deleteUser(deleteConfirmUser.id);
    if (!res.success && res.error) {
      setActionFeedback({ type: 'error', message: res.error });
    } else {
      setActionFeedback({ type: 'success', message: `User account deleted.` });
      setTimeout(() => setActionFeedback(null), 3000);
    }
    setDeleteConfirmUser(null);
  };

  // Save Modal
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Full name and email address are required.');
      return;
    }

    const assignedTeam = teams.find(t => t.id === teamId);
    const finalAvatar =
      avatar.trim() ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    if (editingUser) {
      if (role !== editingUser.role && !canTransitionUserRole(editingUser, role)) {
        setErrorMessage(
          `Security Policy: You are not authorized to assign the role "${role}".`
        );
        return;
      }

      const res = updateUser({
        ...editingUser,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        isActive,
        teamId: teamId || undefined,
        teamName: assignedTeam?.name || undefined,
        managerName: managerName.trim(),
        teamLeadName: teamLeadName.trim(),
        avatar: finalAvatar,
        password: password.trim()
      });

      if (!res.success && res.error) {
        setErrorMessage(res.error);
        return;
      }
      setIsAddModalOpen(false);
      setEditingUser(null);
    } else {
      if (!canCreateUserWithRole(role)) {
        setErrorMessage(
          `Security Policy: You are not authorized to create an account with role "${role}".`
        );
        return;
      }

      const res = addUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        isActive,
        teamId: teamId || undefined,
        teamName: assignedTeam?.name || undefined,
        managerName: managerName.trim(),
        teamLeadName: teamLeadName.trim(),
        avatar: finalAvatar,
        password: password.trim()
      });

      if (!res.success && res.error) {
        setErrorMessage(res.error);
        return;
      }
      setIsAddModalOpen(false);
    }
  };

  // Filtered users list
  const baseUsersList = scopedUsers && scopedUsers.length > 0 ? scopedUsers : users;
  const filteredUsers = useMemo(() => {
    return baseUsersList.filter(u => {
      // Search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = (u.phone || '').toLowerCase().includes(q);
        const matchTeam = (u.teamName || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchTeam) return false;
      }

      // Role
      if (selectedRoleFilter !== 'All' && u.role !== selectedRoleFilter) {
        return false;
      }

      // Team
      if (selectedTeamFilter !== 'All') {
        if (selectedTeamFilter === 'Unassigned') {
          if (u.teamId) return false;
        } else {
          if (u.teamId !== selectedTeamFilter) return false;
        }
      }

      // Status
      if (selectedStatusFilter !== 'All') {
        const isAct = selectedStatusFilter === 'Active';
        if (u.isActive !== isAct) return false;
      }

      return true;
    });
  }, [baseUsersList, searchFilter, selectedRoleFilter, selectedTeamFilter, selectedStatusFilter]);

  // Derived counts for summary strip
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.isActive).length;
  const managersCount = users.filter(u => u.role === 'Manager').length;
  const teamLeadsCount = users.filter(u => u.role === 'Team Lead').length;
  const employeesCount = users.filter(u => u.role === 'Employee').length;

  const hasActiveFilters =
    searchFilter.trim() !== '' ||
    selectedRoleFilter !== 'All' ||
    selectedTeamFilter !== 'All' ||
    selectedStatusFilter !== 'All';

  const handleResetFilters = () => {
    setSearchFilter('');
    setSelectedRoleFilter('All');
    setSelectedTeamFilter('All');
    setSelectedStatusFilter('All');
  };

  // Restrained semantic role badge helper
  const getRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'Super Admin':
        return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold';
      case 'Admin':
        return 'bg-blue-50 text-[#2563EB] border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900 font-bold';
      case 'Manager':
        return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900 font-bold';
      case 'Team Lead':
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900 font-bold';
      case 'Employee':
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold';
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Users
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Manage CRM access, operational users and organizational assignments.
          </p>
        </div>

        {canCreateAnyUser && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold transition-all ${
            actionFeedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Compact Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Total Users
          </p>
          <p className="text-xl font-extrabold text-[#0F172A] dark:text-white mt-1">
            {totalUsersCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Active Accounts
          </p>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {activeUsersCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Managers
          </p>
          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {managersCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Team Leads
          </p>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {teamLeadsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Employees / Reps
          </p>
          <p className="text-xl font-extrabold text-slate-700 dark:text-slate-200 mt-1">
            {employeesCount}
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Filter Users
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-1">
              Search User
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Name, email, phone..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-1">
              Team
            </label>
            <select
              value={selectedTeamFilter}
              onChange={e => setSelectedTeamFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Teams ({teams.length})</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.code ? `(${t.code})` : ''}
                </option>
              ))}
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[220px]">User &amp; Contact</th>
                <th className="p-3.5 min-w-[120px]">Role</th>
                <th className="p-3.5 min-w-[150px]">Team</th>
                <th className="p-3.5 min-w-[140px]">Reporting Manager</th>
                <th className="p-3.5 min-w-[140px]">Team Lead</th>
                <th className="p-3.5 min-w-[110px]">Status</th>
                <th className="p-3.5 min-w-[130px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <EmptyState
                      title="No Users Found"
                      description="No user accounts match your active search and filter criteria."
                      actionLabel="Clear Filters"
                      onAction={handleResetFilters}
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const canModifyThisUser = canManageUser(u);
                  const isProtected = !canModifyThisUser;
                  const teamObj = teams.find(t => t.id === u.teamId);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User & Contact */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-[#0F172A] dark:text-white truncate">
                                {u.name}
                              </p>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 font-semibold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                              {isProtected && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                  <ShieldCheck className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Protected</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono truncate">
                              {u.email}
                            </p>
                            {u.phone && (
                              <p className="text-[10px] text-slate-400 font-mono truncate">{u.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="p-3.5">
                        {teamObj || u.teamName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] dark:text-slate-200">
                            <Network className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            <span>{teamObj?.name || u.teamName}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Reporting Manager */}
                      <td className="p-3.5 text-[#64748B] dark:text-slate-300">
                        {u.managerName ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Briefcase className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>{u.managerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Team Lead */}
                      <td className="p-3.5 text-[#64748B] dark:text-slate-300">
                        {u.teamLeadName ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{u.teamLeadName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {canModifyThisUser ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                              u.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{u.isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                            title="Protected account: Status cannot be modified"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{u.isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        {canModifyThisUser ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              title="Edit User Details"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              title="Delete User"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </div>

      {/* 5. Add / Edit User Modal */}
      <ModalShell
        isOpen={isAddModalOpen || !!editingUser}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingUser(null);
        }}
        size="xl"
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Add New User'}
        subtitle={editingUser ? 'Update user credentials, role hierarchy and team assignment' : 'Provision a new team member account with role-scoped access'}
        icon={<UserCog className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-admin-form"
              variant="primary"
              size="sm"
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        }
      >
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live avatar preview computation */}
        {(() => {
          const displayAvatar =
            avatar.trim() ||
            (editingUser?.avatar
              ? editingUser.avatar
              : name.trim()
              ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  name.trim()
                )}`
              : '');

          return (
            <form id="user-admin-form" onSubmit={handleSave} className="space-y-5 text-xs">
              {/* SECTION 1: IDENTITY */}
              <div className="space-y-3.5">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                  Identity Details
                </span>

                {/* Avatar Uploader Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0F172A] dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Profile Picture</span>
                    </label>
                    {avatar.trim() && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200">
                        Custom Avatar
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="relative shrink-0">
                      {displayAvatar && !imageError ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-blue-500/30 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center">
                          <img
                            src={displayAvatar}
                            alt={name || 'Avatar Preview'}
                            onError={() => setImageError(true)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center ring-2 ring-blue-400 shadow-md">
                          {(name.trim() || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload photo"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md hover:bg-[#1D4ED8] transition-transform active:scale-90 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Upload Image
                        </Button>

                        {avatar && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                          type="url"
                          value={avatar}
                          onChange={e => {
                            setAvatar(e.target.value);
                            setImageError(false);
                          }}
                          placeholder="Or enter direct image URL"
                          className="pl-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField label="Full Name" required>
                    <Input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Asad Khan"
                    />
                  </FormField>

                  <FormField label="Email Address" required>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. asad@isysware.com"
                      className="font-mono"
                    />
                  </FormField>
                </div>

                {/* Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField label="Phone Number">
                    <Input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+92 300 0000000"
                      className="font-mono"
                    />
                  </FormField>
                </div>
              </div>

              {/* SECTION 2: ACCESS & HIERARCHY */}
              <div className="space-y-3.5 pt-4 border-t border-[#E5EAF1] dark:border-slate-800">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                  Access &amp; Hierarchy
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField
                    label="Role Assignment"
                    required
                    helperText="Governed by strict enterprise hierarchy"
                  >
                    <Select
                      value={role}
                      onChange={e => setRole(e.target.value as UserRole)}
                    >
                      {allowedTargetRoles.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Account Status" required>
                    <Select
                      value={isActive ? 'active' : 'inactive'}
                      onChange={e => setIsActive(e.target.value === 'active')}
                    >
                      <option value="active">Active (Access Enabled)</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </Select>
                  </FormField>
                </div>

                {/* Team Assignment */}
                <FormField label="Team Assignment">
                  <Select
                    value={teamId}
                    onChange={e => handleTeamChange(e.target.value)}
                  >
                    <option value="">Unassigned / None</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.code ? `(${t.code})` : ''}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {/* Reporting Manager & Team Lead */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField label="Reporting Manager">
                    <Select
                      value={managerName}
                      onChange={e => setManagerName(e.target.value)}
                    >
                      <option value="">None / Direct</option>
                      {managerOptions.map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Team Lead">
                    <Select
                      value={teamLeadName}
                      onChange={e => setTeamLeadName(e.target.value)}
                    >
                      <option value="">None / Direct</option>
                      {teamLeadOptions.map(tl => (
                        <option key={tl.id} value={tl.name}>
                          {tl.name} ({tl.role})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* SECTION 3: CREDENTIALS */}
              <div className="space-y-3.5 pt-4 border-t border-[#E5EAF1] dark:border-slate-800">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                  Credentials
                </span>

                <FormField
                  label={editingUser ? 'Password / Reset Credentials' : 'Initial Password'}
                  required
                  helperText="Minimum 6 characters for user authentication"
                >
                  <Input
                    type="text"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Emp@123"
                    className="font-mono"
                  />
                </FormField>
              </div>
            </form>
          );
        })()}
      </ModalShell>

      {/* 6. Destructive Confirm Dialog for User Deletion */}
      <ConfirmDialog
        isOpen={!!deleteConfirmUser}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        entityName={deleteConfirmUser ? `${deleteConfirmUser.name} (${deleteConfirmUser.role})` : ''}
        consequence="Permanently removes this user account and revokes access to the CRM platform. Reassigned records and historical audit logs will remain preserved."
        confirmLabel="Delete User"
        confirmVariant="danger"
      />
    </div>
  );
};
