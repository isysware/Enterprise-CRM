import React, { useState, useMemo } from 'react';
import {
  Users,
  Network,
  Shield,
  Award,
  CalendarCheck,
  TrendingUp,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Lead, FollowUp, User, Team, UserRole } from '../../types';
import { formatPKR, parseAmount } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface TeamStaffReportProps {
  currentUser: User | null;
  scopedUsers: User[];
  scopedTeams: Team[];
  scopedLeads: Lead[];
  scopedFollowUps: FollowUp[];
  selectedTeamId?: string;
  selectedUserId?: string;
}

export const TeamStaffReport: React.FC<TeamStaffReportProps> = ({
  currentUser,
  scopedUsers,
  scopedTeams,
  scopedLeads,
  scopedFollowUps,
  selectedTeamId = 'All',
  selectedUserId = 'All'
}) => {
  const isEmployee = currentUser?.role === 'Employee';

  // Sub-section tab for non-employees
  const [subSection, setSubSection] = useState<'reps' | 'teams' | 'managers'>('reps');

  // Today reference for follow-ups
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. REP PERFORMANCE METRICS
  const repMetrics = useMemo(() => {
    let usersToCompute = scopedUsers;

    if (isEmployee) {
      usersToCompute = scopedUsers.filter(u => u.id === currentUser?.id);
    } else {
      if (selectedTeamId && selectedTeamId !== 'All') {
        usersToCompute = usersToCompute.filter(u => u.teamId === selectedTeamId);
      }
      if (selectedUserId && selectedUserId !== 'All') {
        usersToCompute = usersToCompute.filter(u => u.id === selectedUserId);
      }
    }

    return usersToCompute.map(user => {
      const userLeads = scopedLeads.filter(l => l.assignedToId === user.id);
      const converted = userLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
      const pipelineVal = userLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
      const convRate = userLeads.length > 0 ? Math.round((converted / userLeads.length) * 100) : 0;

      const userFUs = scopedFollowUps.filter(f => f.assignedToId === user.id);
      const pendingFUs = userFUs.filter(f => f.status === 'Pending').length;
      const missedFUs = userFUs.filter(f => f.status === 'Missed' || (f.status === 'Pending' && f.scheduledDate < todayStr)).length;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamName: user.teamName || 'Direct',
        assignedCount: userLeads.length,
        convertedCount: converted,
        conversionRate: convRate,
        pipelineValue: pipelineVal,
        pendingFollowUps: pendingFUs,
        missedFollowUps: missedFUs
      };
    });
  }, [scopedUsers, scopedLeads, scopedFollowUps, isEmployee, currentUser, selectedTeamId, selectedUserId, todayStr]);

  // 2. TEAM PERFORMANCE METRICS
  const teamMetrics = useMemo(() => {
    if (isEmployee) return [];

    let teamsToCompute = scopedTeams;
    if (selectedTeamId && selectedTeamId !== 'All') {
      teamsToCompute = teamsToCompute.filter(t => t.id === selectedTeamId);
    }
    if (selectedUserId && selectedUserId !== 'All') {
      const userObj = scopedUsers.find(u => u.id === selectedUserId);
      if (userObj?.teamId) {
        teamsToCompute = teamsToCompute.filter(t => t.id === userObj.teamId);
      } else {
        teamsToCompute = teamsToCompute.filter(t => t.memberIds?.includes(selectedUserId));
      }
    }

    return teamsToCompute.map(team => {
      const teamLeads = scopedLeads.filter(l => l.teamId === team.id);
      const converted = teamLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
      const pipelineVal = teamLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
      const convRate = teamLeads.length > 0 ? Math.round((converted / teamLeads.length) * 100) : 0;

      const teamUserIds = team.memberIds || [];
      const teamFUs = scopedFollowUps.filter(f => teamUserIds.includes(f.assignedToId));
      const pendingFUs = teamFUs.filter(f => f.status === 'Pending').length;
      const missedFUs = teamFUs.filter(f => f.status === 'Missed' || (f.status === 'Pending' && f.scheduledDate < todayStr)).length;

      return {
        teamId: team.id,
        name: team.name,
        code: team.code,
        managerName: team.managerName || 'Unassigned',
        leaderName: team.leaderName || 'Unassigned',
        memberCount: team.memberIds?.length || 0,
        assignedCount: teamLeads.length,
        convertedCount: converted,
        conversionRate: convRate,
        pipelineValue: pipelineVal,
        pendingFollowUps: pendingFUs,
        missedFollowUps: missedFUs
      };
    });
  }, [scopedTeams, scopedUsers, scopedLeads, scopedFollowUps, isEmployee, selectedTeamId, selectedUserId, todayStr]);

  // 3. MANAGERS / LEADS METRICS
  const managerMetrics = useMemo(() => {
    if (isEmployee) return [];

    let leaders = scopedUsers.filter(u => u.role === 'Manager' || u.role === 'Team Lead');
    if (selectedTeamId && selectedTeamId !== 'All') {
      leaders = leaders.filter(l => l.teamId === selectedTeamId);
    }
    if (selectedUserId && selectedUserId !== 'All') {
      leaders = leaders.filter(l => l.id === selectedUserId);
    }

    return leaders.map(leader => {
      // Leads where assigned or reporting
      const leaderLeads = scopedLeads.filter(l =>
        l.assignedToId === leader.id ||
        (leader.teamId && l.teamId === leader.teamId)
      );
      const converted = leaderLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
      const pipelineVal = leaderLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
      const convRate = leaderLeads.length > 0 ? Math.round((converted / leaderLeads.length) * 100) : 0;

      return {
        userId: leader.id,
        name: leader.name,
        role: leader.role,
        teamName: leader.teamName || 'Leadership',
        totalLeads: leaderLeads.length,
        convertedCount: converted,
        conversionRate: convRate,
        pipelineValue: pipelineVal
      };
    });
  }, [scopedUsers, scopedLeads, isEmployee, selectedTeamId, selectedUserId]);

  // If Employee role: show single-user "My Performance" card and personal metrics
  if (isEmployee) {
    const myStats = repMetrics[0] || {
      assignedCount: 0,
      convertedCount: 0,
      conversionRate: 0,
      pipelineValue: 0,
      pendingFollowUps: 0,
      missedFollowUps: 0
    };

    return (
      <div className="space-y-6">
        {/* Personal Performance Header */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                My Performance Center
              </h2>
              <p className="text-xs text-slate-500">
                Personal sales metrics, win rate, and follow-up workload
              </p>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Leads</p>
            <div>
              <p className="text-2xl font-medium text-slate-900 dark:text-white leading-none tracking-tight">{myStats.assignedCount}</p>
            </div>
          </div>
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Converted</p>
            <div>
              <p className="text-2xl font-medium text-emerald-600 dark:text-emerald-400 leading-none tracking-tight">{myStats.convertedCount}</p>
            </div>
          </div>
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</p>
            <div>
              <p className="text-2xl font-medium text-blue-600 dark:text-blue-400 leading-none tracking-tight">{myStats.conversionRate}%</p>
            </div>
          </div>
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Value</p>
            <div>
              <p className="text-lg font-medium text-slate-900 dark:text-white leading-none tracking-tight truncate">{formatPKR(myStats.pipelineValue)}</p>
            </div>
          </div>
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Follow-Ups</p>
            <div>
              <p className="text-2xl font-medium text-amber-600 dark:text-amber-400 leading-none tracking-tight">{myStats.pendingFollowUps}</p>
            </div>
          </div>
          <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missed Follow-Ups</p>
            <div>
              <p className="text-2xl font-medium text-rose-600 dark:text-rose-400 leading-none tracking-tight">{myStats.missedFollowUps}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-employee view: Sub-tabs for Reps, Teams, Managers
  return (
    <div className="space-y-5">
      {/* Sub-section tab switcher */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF1] dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubSection('reps')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subSection === 'reps'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Sales Representatives ({repMetrics.length})
        </button>

        <button
          onClick={() => setSubSection('teams')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subSection === 'teams'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Teams &amp; Departments ({teamMetrics.length})
        </button>

        <button
          onClick={() => setSubSection('managers')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subSection === 'managers'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Managers &amp; Leads ({managerMetrics.length})
        </button>
      </div>

      {/* 1. SALES REPS TABLE */}
      {subSection === 'reps' && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Sales Representative Performance Table
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live scoped conversion velocity and active deal load per agent
            </p>
          </div>

          <DataTableScrollFrame>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 min-w-[180px]">Sales Rep</th>
                  <th className="p-3.5 min-w-[120px]">Role</th>
                  <th className="p-3.5 min-w-[150px]">Team</th>
                  <th className="p-3.5 min-w-[120px] text-right">Assigned Leads</th>
                  <th className="p-3.5 min-w-[120px] text-right">Converted</th>
                  <th className="p-3.5 min-w-[120px] text-right">Conversion Rate</th>
                  <th className="p-3.5 min-w-[140px] text-right">Pipeline Value</th>
                  <th className="p-3.5 min-w-[120px] text-right">Pending F/U</th>
                  <th className="p-3.5 min-w-[120px] text-right">Missed F/U</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {repMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      No sales representatives match the selected filters.
                    </td>
                  </tr>
                ) : (
                  repMetrics.map(r => (
                    <tr key={r.userId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{r.email}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {r.teamName}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {r.assignedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {r.convertedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {r.conversionRate}%
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {formatPKR(r.pipelineValue)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {r.pendingFollowUps}
                      </td>
                      <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                        {r.missedFollowUps}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableScrollFrame>
        </div>
      )}

      {/* 2. TEAMS TABLE */}
      {subSection === 'teams' && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Department &amp; Team Performance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated team deal loads, reporting lines, and overall pipeline velocity
            </p>
          </div>

          <DataTableScrollFrame>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 min-w-[200px]">Team Name</th>
                  <th className="p-3.5 min-w-[150px]">Manager</th>
                  <th className="p-3.5 min-w-[150px]">Team Lead</th>
                  <th className="p-3.5 min-w-[100px] text-right">Reps</th>
                  <th className="p-3.5 min-w-[120px] text-right">Leads</th>
                  <th className="p-3.5 min-w-[120px] text-right">Converted</th>
                  <th className="p-3.5 min-w-[120px] text-right">Win Rate</th>
                  <th className="p-3.5 min-w-[140px] text-right">Pipeline Value</th>
                  <th className="p-3.5 min-w-[120px] text-right">Pending F/U</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {teamMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      No teams match the selected filters.
                    </td>
                  </tr>
                ) : (
                  teamMetrics.map(t => (
                    <tr key={t.teamId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                        {t.code && <p className="text-[10px] text-slate-400 font-mono">Code: {t.code}</p>}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {t.managerName}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {t.leaderName}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {t.memberCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {t.assignedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {t.convertedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {t.conversionRate}%
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {formatPKR(t.pipelineValue)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {t.pendingFollowUps}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableScrollFrame>
        </div>
      )}

      {/* 3. MANAGERS TABLE */}
      {subSection === 'managers' && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Managers &amp; Leadership Performance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisory deal flow, departmental conversion, and branch accountability
            </p>
          </div>

          <DataTableScrollFrame>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 min-w-[200px]">Leader / Manager</th>
                  <th className="p-3.5 min-w-[120px]">Role</th>
                  <th className="p-3.5 min-w-[160px]">Team</th>
                  <th className="p-3.5 min-w-[120px] text-right">Total Leads</th>
                  <th className="p-3.5 min-w-[120px] text-right">Converted</th>
                  <th className="p-3.5 min-w-[120px] text-right">Win Rate</th>
                  <th className="p-3.5 min-w-[150px] text-right">Pipeline Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {managerMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No managers or team leads match the selected filters.
                    </td>
                  </tr>
                ) : (
                  managerMetrics.map(m => (
                    <tr key={m.userId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {m.teamName}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {m.totalLeads}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {m.convertedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {m.conversionRate}%
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {formatPKR(m.pipelineValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableScrollFrame>
        </div>
      )}
    </div>
  );
};
