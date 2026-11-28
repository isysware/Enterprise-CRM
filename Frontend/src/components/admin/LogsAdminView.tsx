import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  History,
  Search,
  Filter,
  User,
  Activity,
  Calendar,
  X,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { formatDateTime, getLocalDateString } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

export const LogsAdminView: React.FC = () => {
  const { activityLogs, users } = useCRM();

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedUser, setSelectedUser] = useState('All');

  // Extract distinct actions & users for filters
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(activityLogs.map(l => l.action).filter(Boolean))).sort();
  }, [activityLogs]);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(activityLogs.map(l => l.userName).filter(Boolean))).sort();
  }, [activityLogs]);

  // Active Actors KPI: Count distinct valid actor_id values that still exist in users table;
  // strictly exclude actor_name variants and legacy activity_logs rows with actor_id NULL/unmatched.
  const activeActorsCount = useMemo(() => {
    const validUserIds = new Set(users.map(u => u.id).filter(Boolean));
    const distinctValidActorIds = new Set(
      activityLogs
        .map(l => l.userId)
        .filter((actorId): actorId is string => Boolean(actorId && validUserIds.has(actorId)))
    );
    return distinctValidActorIds.size;
  }, [activityLogs, users]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(l => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchUser = l.userName.toLowerCase().includes(q);
        const matchAction = l.action.toLowerCase().includes(q);
        const matchTarget = (l.entityTitle || '').toLowerCase().includes(q);
        const matchDetails = (l.details || '').toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchTarget && !matchDetails) return false;
      }

      if (selectedAction !== 'All' && l.action !== selectedAction) {
        return false;
      }

      if (selectedUser !== 'All' && l.userName !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [activityLogs, search, selectedAction, selectedUser]);

  // Derived real metrics
  const totalEvents = activityLogs.length;
  const uniqueUsersCount = uniqueUsers.length;
  const todayStr = getLocalDateString();
  const todayEventsCount = activityLogs.filter(l => {
    return l.timestamp && getLocalDateString(new Date(l.timestamp)) === todayStr;
  }).length;

  const hasActiveFilters = search.trim() !== '' || selectedAction !== 'All' || selectedUser !== 'All';

  const handleResetFilters = () => {
    setSearch('');
    setSelectedAction('All');
    setSelectedUser('All');
  };

  const getActionBadgeClasses = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
    }
    if (act.includes('create') || act.includes('add') || act.includes('convert')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    }
    if (act.includes('edit') || act.includes('update') || act.includes('reassign')) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    }
    return 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-[#0F172A] dark:text-white tracking-tight">
              Activity Logs
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalEvents} Audit Events
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Immutable tracking of user actions, lead status updates, follow-up completions, and assignments.
          </p>
        </div>
      </div>

      {/* 2. Compact Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Total Log Events
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-[#0F172A] dark:text-white">
              {totalEvents}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300">
              Recorded
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Total operations logged in CRM
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Today's Activity
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-emerald-600 dark:text-emerald-400">
              {todayEventsCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Today
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Events recorded during today's shift
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Active Actors
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-[#0F172A] dark:text-white">
              {activeActorsCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              Users
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Distinct staff members with audit logs
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Distinct Actions
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-[#0F172A] dark:text-white">
              {uniqueActions.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              Types
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Unique event categories tracked
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Filter Audit Trail
            </span>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              ({filteredLogs.length} of {totalEvents})
            </span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user, action, target, or details..."
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Users / Actors</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Table View */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <th className="p-3.5 min-w-[150px]">Timestamp</th>
                <th className="p-3.5 min-w-[150px]">Actor / User</th>
                <th className="p-3.5 min-w-[140px]">Action</th>
                <th className="p-3.5 min-w-[180px]">Target Record</th>
                <th className="p-3.5 min-w-[260px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#64748B] dark:text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#64748B]" />
                    <p className="font-bold text-[#0F172A] dark:text-white text-sm">No activity logs found</p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      {hasActiveFilters
                        ? 'Try adjusting your search query or dropdown filters.'
                        : 'No events have been logged yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        type="button"
                        className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-[#64748B] dark:text-slate-400 text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#64748B] text-[10px] font-bold">
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#0F172A] dark:text-white">{log.userName}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${getActionBadgeClasses(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-[#0F172A] dark:text-slate-200">
                      {log.entityTitle}
                    </td>
                    <td className="p-3.5 text-[#64748B] dark:text-slate-400 leading-relaxed">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </div>
    </div>
  );
};
