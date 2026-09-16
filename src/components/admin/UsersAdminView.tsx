import React, { useState, useRef } from 'react';
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
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Clock,
  Phone,
  Search,
  Filter,
  RotateCcw,
  Network,
  Briefcase,
  Crown,
  X,
  Upload,
  Link as LinkIcon,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { getRoleBadgeStyle } from '../../utils/formatters';

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
    canManageUser
  } = useCRM();

  // Filters State
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+92 300 0000000');
  const [role, setRole] = useState<UserRole>('Employee');
  const [teamId, setTeamId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [teamLeadName, setTeamLeadName] = useState('');
  const [password, setPassword] = useState('Emp@123');
  const [isActive, setIsActive] = useState(true);
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

  // Handle native image upload and convert to Base64 (with canvas downsampling for optimal local storage)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Downsample to max 256x256 to ensure snappy UI and keep LocalStorage usage minimal
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

  // When teamId changes in form, auto-sync Manager and Team Lead if available
  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId);
    if (!newTeamId) {
      return;
    }
    const team = teams.find(t => t.id === newTeamId);
    if (team) {
      if (team.managerName) {
        setManagerName(team.managerName);
      }
      if (team.leaderName) {
        setTeamLeadName(team.leaderName);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('+92 300 0000000');
    setRole('Employee');
    const defaultTeam = teams[0];
    setTeamId(defaultTeam?.id || '');
    setManagerName(defaultTeam?.managerName || managerOptions[0]?.name || 'Abdur Rehman Arain');
    setTeamLeadName(defaultTeam?.leaderName || teamLeadOptions[0]?.name || 'Team Lead Umair');
    setPassword('Emp@123');
    setIsActive(true);
    setAvatar('');
    setImageError(false);
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    if (!canManageUser(u)) {
      alert('Security Policy: You are not authorized to modify this user account.');
      return;
    }
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '+92 300 0000000');
    setRole(u.role);
    setTeamId(u.teamId || '');
    setManagerName(u.managerName || '');
    setTeamLeadName(u.teamLeadName || '');
    setPassword(u.password || 'Emp@123');
    setIsActive(u.isActive);
    setAvatar(u.avatar || '');
    setImageError(false);
    setErrorMessage('');
  };

  const handleToggleStatus = (u: User) => {
    if (!canManageUser(u)) {
      alert('Security Policy: You are not authorized to change this user status.');
      return;
    }
    const res = toggleUserStatus(u.id);
    if (!res.success && res.error) {
      alert(res.error);
    }
  };

  const handleDelete = (u: User) => {
    if (!canManageUser(u)) {
      alert('Security Policy: You are not authorized to delete this user account.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete user account "${u.name}"?`)) {
      const res = deleteUser(u.id);
      if (!res.success && res.error) {
        alert(res.error);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const teamObj = teams.find(t => t.id === teamId);

    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim() || 'User')}`;
    const finalAvatar = avatar.trim() || (editingUser ? editingUser.avatar : defaultAvatar) || defaultAvatar;

    if (editingUser) {
      const res = updateUser({
        ...editingUser,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        teamId: teamId || undefined,
        teamName: teamObj?.name,
        managerName: managerName.trim(),
        teamLeadName: teamLeadName.trim(),
        password: password.trim(),
        avatar: finalAvatar,
        isActive
      });

      if (!res.success && res.error) {
        setErrorMessage(res.error);
        return;
      }
      setEditingUser(null);
    } else {
      addUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        teamId: teamId || undefined,
        teamName: teamObj?.name,
        managerName: managerName.trim(),
        teamLeadName: teamLeadName.trim(),
        avatar: finalAvatar,
        isActive: true,
        password: password.trim(),
        lastLogin: 'Never'
      });
      setIsAddModalOpen(false);
    }
  };

  // Filtered users
  const baseUsersList = scopedUsers && scopedUsers.length > 0 ? scopedUsers : users;
  const filteredUsers = baseUsersList.filter(u => {
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

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Users &amp; Role Assignments
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {filteredUsers.length} of {users.length} Users
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage organizational hierarchy, team assignments, reporting managers, and credentials.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New User</span>
        </button>
      </div>

      {/* Global Team & Role Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Filter Users &amp; Teams
            </span>
          </div>

          {(searchFilter || selectedRoleFilter !== 'All' || selectedTeamFilter !== 'All' || selectedStatusFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchFilter('');
                setSelectedRoleFilter('All');
                setSelectedTeamFilter('All');
                setSelectedStatusFilter('All');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search User
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Name, email, phone..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Team
            </label>
            <select
              value={selectedTeamFilter}
              onChange={e => setSelectedTeamFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Teams ({teams.length})</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code || 'TEAM'})</option>
              ))}
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[200px]">User &amp; Email</th>
                <th className="p-3.5 min-w-[130px]">Role</th>
                <th className="p-3.5 min-w-[160px]">Team</th>
                <th className="p-3.5 min-w-[140px]">Reporting Manager</th>
                <th className="p-3.5 min-w-[140px]">Team Lead</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
                <th className="p-3.5 min-w-[110px]">Last Login</th>
                <th className="p-3.5 min-w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No CRM users match the selected team or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const badgeStyle = getRoleBadgeStyle(u.role);
                  const canModifyThisUser = canManageUser(u);
                  const teamObj = teams.find(t => t.id === u.teamId);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* User */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-slate-400 font-mono">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeStyle.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                          {u.role}
                        </span>
                      </td>

                      {/* Team Column with Badge */}
                      <td className="p-3.5">
                        {teamObj || u.teamName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Network className="w-3 h-3 text-indigo-500" />
                            <span>{teamObj?.name || u.teamName}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Manager */}
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-1 text-xs">
                          <Briefcase className="w-3 h-3 text-purple-500 shrink-0" />
                          <span>{u.managerName || '-'}</span>
                        </div>
                      </td>

                      {/* Team Lead */}
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-1 text-xs">
                          <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{u.teamLeadName || '-'}</span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={!canModifyThisUser}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                            u.isActive
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100'
                              : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                          } ${!canModifyThisUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {u.lastLogin || 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        {canModifyThisUser ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit User Details"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              title="Delete User"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Protected</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Add New CRM User'}
                </h3>
              </div>

              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Compute live avatar display */}
            {(() => {
              const displayAvatar = avatar.trim() || (editingUser?.avatar ? editingUser.avatar : (name.trim() ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}` : ''));
              const isCustomAvatar = Boolean(avatar.trim() || (editingUser?.avatar && editingUser.avatar !== `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(editingUser.name)}`));

              return (
                <form onSubmit={handleSave} className="space-y-4 text-xs">
                  {/* Dedicated Profile Picture / Avatar Uploader Section */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Profile Picture / Avatar</span>
                      </label>
                      {avatar.trim() ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          Custom Avatar Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Auto-generated or upload custom
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {/* Circular Avatar Preview (64x64px) */}
                      <div className="relative shrink-0">
                        {displayAvatar && !imageError ? (
                          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-indigo-500/40 dark:ring-indigo-400/40 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center">
                            <img
                              src={displayAvatar}
                              alt={name || 'Avatar Preview'}
                              onError={() => setImageError(true)}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center ring-2 ring-indigo-300 dark:ring-indigo-700 shadow-md">
                            {(name.trim() || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Upload or Change Photo"
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-500 transition-transform active:scale-90 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Upload Controls & URL Input */}
                      <div className="flex-1 w-full space-y-2.5">
                        {/* Hidden Native File Picker */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Photo</span>
                          </button>

                          {(avatar || (editingUser && isCustomAvatar)) && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove / Reset</span>
                            </button>
                          )}
                        </div>

                        {/* Image URL Text Input */}
                        <div className="relative">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={avatar}
                            onChange={e => {
                              setAvatar(e.target.value);
                              setImageError(false);
                            }}
                            placeholder="Or paste image URL (Unsplash, web link, etc.)"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          Supports native image upload (auto-compressed Base64) or direct HTTPS image URLs.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Umair Ejaz"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. umairejaz098@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Phone Number & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Role Assignment *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {currentUser?.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              {/* Team Assignment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Team Assignment
                </label>
                <select
                  value={teamId}
                  onChange={e => handleTeamChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Unassigned / None</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.code ? `(${t.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Hierarchy Dropdowns: Reporting Manager & Team Lead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Reporting Manager
                  </label>
                  <select
                    value={managerName}
                    onChange={e => setManagerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">None / Direct</option>
                    {managerOptions.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Team Lead
                  </label>
                  <select
                    value={teamLeadName}
                    onChange={e => setTeamLeadName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">None / Direct</option>
                    {teamLeadOptions.map(tl => (
                      <option key={tl.id} value={tl.name}>
                        {tl.name} ({tl.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {editingUser ? 'Password / Reset Credentials' : 'Initial Password *'}
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Emp@123"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Save User Profile
                </button>
              </div>
            </form>
          );
        })()}
          </div>
        </div>
      )}
    </div>
  );
};

