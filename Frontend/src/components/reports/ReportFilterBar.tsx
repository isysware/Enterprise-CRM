import React from 'react';
import {
  Filter,
  Calendar,
  RotateCcw,
  Users,
  Network,
  Tag,
  Briefcase,
  Layers
} from 'lucide-react';
import { Team, User, UserRole } from '../../types';
import { DatePreset, ReportFilterState, ReportId } from './types';

interface ReportFilterBarProps {
  activeReport: ReportId;
  currentUserRole?: UserRole;
  filterState: ReportFilterState;
  onChangeFilter: (updates: Partial<ReportFilterState>) => void;
  onResetFilters: () => void;
  availableTeams: Team[];
  availableUsers: User[];
  availableSources: string[];
  availableServices: string[];
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  activeReport,
  currentUserRole,
  filterState,
  onChangeFilter,
  onResetFilters,
  availableTeams,
  availableUsers,
  availableSources,
  availableServices
}) => {
  const isEmployee = currentUserRole === 'Employee';

  // Determine relevance of filters per report
  const showSourceFilter = ['sales-pipeline', 'source-service', 'clients-conversions'].includes(activeReport);
  const showServiceFilter = ['sales-pipeline', 'source-service', 'commercial-revenue'].includes(activeReport);
  const showStatusFilter = ['sales-pipeline', 'followups-activity'].includes(activeReport);
  const showTeamFilter = !isEmployee && ['sales-pipeline', 'team-staff', 'followups-activity', 'clients-conversions'].includes(activeReport);
  const showUserFilter = !isEmployee && ['sales-pipeline', 'team-staff', 'followups-activity', 'clients-conversions'].includes(activeReport);

  const handlePresetSelect = (preset: DatePreset) => {
    const today = new Date().toISOString().split('T')[0];
    let from = '';
    let to = today;

    if (preset === 'today') {
      from = today;
    } else if (preset === 'this_month') {
      from = `${today.substring(0, 7)}-01`;
    } else if (preset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      from = d.toISOString().split('T')[0];
    } else if (preset === 'all_time') {
      from = '';
      to = '';
    } else if (preset === 'custom') {
      from = filterState.fromDate || today;
      to = filterState.toDate || today;
    }

    onChangeFilter({
      datePreset: preset,
      fromDate: from,
      toDate: to
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs mb-5">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Report Filters
          </span>
        </div>

        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Responsive Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 items-end">
        {/* Date Preset */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Date Preset
          </label>
          <select
            value={filterState.datePreset}
            onChange={e => handlePresetSelect(e.target.value as DatePreset)}
            className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filterState.fromDate}
            onChange={e => onChangeFilter({ fromDate: e.target.value, datePreset: 'custom' })}
            className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filterState.toDate}
            onChange={e => onChangeFilter({ toDate: e.target.value, datePreset: 'custom' })}
            className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Team Filter */}
        {showTeamFilter && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Team
            </label>
            <select
              value={filterState.teamId}
              onChange={e => onChangeFilter({ teamId: e.target.value, userId: 'All' })}
              className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Scoped Teams</option>
              {availableTeams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sales Rep / User Filter */}
        {showUserFilter && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Sales Rep / User
            </label>
            <select
              value={filterState.userId}
              onChange={e => onChangeFilter({ userId: e.target.value })}
              className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Scoped Reps</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lead Source Filter */}
        {showSourceFilter && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Lead Source
            </label>
            <select
              value={filterState.source}
              onChange={e => onChangeFilter({ source: e.target.value })}
              className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Sources</option>
              {availableSources.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Service Filter */}
        {showServiceFilter && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Service
            </label>
            <select
              value={filterState.service}
              onChange={e => onChangeFilter({ service: e.target.value })}
              className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Services</option>
              {availableServices.map(srv => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={filterState.status}
              onChange={e => onChangeFilter({ status: e.target.value })}
              className="w-full h-[38px] bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Follow-Up Required">Follow-Up Required</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
