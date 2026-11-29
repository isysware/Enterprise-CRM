import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { Lead, LeadStatus, Priority, User } from '../types';
import {
  Users,
  Flame,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Sparkles,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Filter,
  Share2,
  History,
  Target,
  UserCheck,
  CheckCircle,
  DollarSign,
  Plus,
  BarChart3,
  Search,
  Layers,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  HelpCircle
} from 'lucide-react';
import {
  formatPKR,
  parseAmount,
  getRoleBadgeStyle,
  getLocalDateString,
  classifyFollowUp,
  formatDate,
  formatTime
} from '../utils/formatters';
import {
  PageHeader,
  Button,
  DonutChart,
  DistributionBar,
  DataTableScrollFrame,
  Badge,
  Input,
  Select
} from './ui';

interface DashboardViewProps {
  onNavigateToLeads: (statusFilter?: string) => void;
  onNavigateToFollowUps: (tab?: string) => void;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenNewLead?: () => void;
  onNavigateToReports?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToLeads,
  onNavigateToFollowUps,
  onOpenLeadDetail,
  onOpenNewLead,
  onNavigateToReports
}) => {
  const {
    currentUser,
    metrics,
    scopedFollowUps,
    completeFollowUp,
    activityLogs,
    scopedLeads,
    users,
    scopedUsers,
    teams,
    scopedTeams,
    canCreateLeads,
    canViewReports
  } = useCRM();

  if (!currentUser) return null;

  const todayStr = getLocalDateString();

  // Helper to safely extract lead value
  const getLeadValue = (lead: Lead): number => {
    const val = parseAmount(lead.valuePKR);
    if (val > 0) return val;
    if (lead.budgetDetails?.totalCalculatedValuePKR) {
      return parseAmount(lead.budgetDetails.totalCalculatedValuePKR);
    }
    return 0;
  };

  // Dynamic greeting based on browser-local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Follow-up subsets
  const todayFollowUpsList = useMemo(() => {
    return scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'today');
  }, [scopedFollowUps, todayStr]);

  const missedFollowUpsList = useMemo(() => {
    return scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'missed');
  }, [scopedFollowUps, todayStr]);

  const upcomingFollowUpsList = useMemo(() => {
    return scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'upcoming');
  }, [scopedFollowUps, todayStr]);

  const completedFollowUpsList = useMemo(() => {
    return scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'completed');
  }, [scopedFollowUps, todayStr]);

  // Lead subsets and financial calculations
  const activeLeads = useMemo(() => {
    return scopedLeads.filter(l => l.status !== 'Lost' && l.status !== 'Converted');
  }, [scopedLeads]);

  const totalPipelineValue = useMemo(() => {
    return scopedLeads.reduce((acc, lead) => acc + getLeadValue(lead), 0);
  }, [scopedLeads]);

  const activePipelineValue = useMemo(() => {
    return activeLeads.reduce((acc, lead) => acc + getLeadValue(lead), 0);
  }, [activeLeads]);

  const averageLeadValue = useMemo(() => {
    if (scopedLeads.length === 0) return 0;
    return Math.round(totalPipelineValue / scopedLeads.length);
  }, [totalPipelineValue, scopedLeads.length]);

  const conversionRate = useMemo(() => {
    if (scopedLeads.length === 0) return 0;
    return Number(((metrics.convertedLeads / scopedLeads.length) * 100).toFixed(1));
  }, [metrics.convertedLeads, scopedLeads.length]);

  const urgentLeadsCount = useMemo(() => {
    return scopedLeads.filter(l =>
      (l.quality === 'Good' || (l.quality as any) === 'High' || (l.quality as any) === 'Hot' || l.priority === 'Urgent') &&
      l.status !== 'Converted' &&
      l.status !== 'Won' &&
      l.status !== 'Lost'
    ).length;
  }, [scopedLeads]);
  // Stage performance breakdown (Values and Counts)
  const stageDefs: { status: LeadStatus; label: string; color: string; hexColor: string }[] = useMemo(() => [
    { status: 'New', label: 'New', color: 'bg-sky-500', hexColor: '#0ea5e9' },
    { status: 'Contacted', label: 'Contacted', color: 'bg-blue-600', hexColor: '#2563eb' },
    { status: 'Follow-Up Required', label: 'Follow-Up Required', color: 'bg-amber-500', hexColor: '#f59e0b' },
    { status: 'Hold', label: 'Hold', color: 'bg-slate-400', hexColor: '#94a3b8' },
    { status: 'Cold', label: 'Cold', color: 'bg-cyan-500', hexColor: '#06b6d4' },
    { status: 'Returned', label: 'Returned', color: 'bg-rose-500', hexColor: '#f43f5e' },
    { status: 'Converted', label: 'Converted', color: 'bg-emerald-500', hexColor: '#10b981' }
  ], []);

  const stageBreakdown = useMemo(() => {
    return stageDefs.map(def => {
      const stageLeads = scopedLeads.filter(l => l.status === def.status);
      const count = stageLeads.length;
      const value = stageLeads.reduce((acc, l) => acc + getLeadValue(l), 0);
      const countPercent = scopedLeads.length > 0 ? Math.round((count / scopedLeads.length) * 100) : 0;
      const valuePercent = totalPipelineValue > 0 ? Math.round((value / totalPipelineValue) * 100) : 0;
      return {
        ...def,
        count,
        value,
        countPercent,
        valuePercent
      };
    });
  }, [stageDefs, scopedLeads, totalPipelineValue]);

  // Proportional stage segments for the top distribution bar
  const pipelineSegments = useMemo(() => {
    return stageBreakdown.map(s => ({
      id: s.status,
      label: s.label,
      value: s.count,
      color: s.hexColor
    }));
  }, [stageBreakdown]);

  // Pipeline Snapshot Donut (Converted vs In-Progress vs Lost)
  const snapshotDonutData = useMemo(() => {
    const convertedCount = metrics.convertedLeads;
    const lostCount = metrics.lostLeads;
    const inProgressCount = Math.max(0, scopedLeads.length - convertedCount - lostCount);
    return [
      { id: 'converted', label: 'Converted Deals', value: convertedCount, color: '#10b981' },
      { id: 'active', label: 'Active Pipeline', value: inProgressCount, color: '#2563eb' },
      { id: 'lost', label: 'Lost Inquiries', value: lostCount, color: '#94a3b8' }
    ];
  }, [metrics.convertedLeads, metrics.lostLeads, scopedLeads.length]);

  // Lead Sources breakdown
  const sourcePerformance = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    scopedLeads.forEach(l => {
      const src = l.source || 'Direct';
      if (!map[src]) map[src] = { count: 0, value: 0 };
      map[src].count += 1;
      map[src].value += getLeadValue(l);
    });
    return Object.entries(map)
      .map(([source, data]) => ({
        source,
        count: data.count,
        value: data.value,
        percent: scopedLeads.length > 0 ? Math.round((data.count / scopedLeads.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count || b.value - a.value)
      .slice(0, 5);
  }, [scopedLeads]);

  // Follow-Up Health Donut
  const followUpHealthData = useMemo(() => [
    { id: 'today', label: 'Due Today', value: todayFollowUpsList.length, color: '#f59e0b' },
    { id: 'missed', label: 'Missed', value: missedFollowUpsList.length, color: '#f43f5e' },
    { id: 'upcoming', label: 'Upcoming', value: upcomingFollowUpsList.length, color: '#2563eb' },
    { id: 'done', label: 'Completed', value: completedFollowUpsList.length, color: '#10b981' }
  ], [todayFollowUpsList.length, missedFollowUpsList.length, upcomingFollowUpsList.length, completedFollowUpsList.length]);

  // Lead Quality calculation
  const totalQuality =
    (metrics.qualityBreakdown['Good'] || 0) +
    (metrics.qualityBreakdown['Average'] || 0) +
    (metrics.qualityBreakdown['Poor'] || 0) || 1;
  const goodCount = metrics.qualityBreakdown['Good'] || 0;
  const avgCount = metrics.qualityBreakdown['Average'] || 0;
  const poorCount = metrics.qualityBreakdown['Poor'] || 0;

  const qualityDonutData = useMemo(() => [
    { id: 'good', label: 'Good Quality ⭐', value: goodCount, color: '#10b981' },
    { id: 'avg', label: 'Average Quality', value: avgCount, color: '#94a3b8' },
    { id: 'poor', label: 'Disqualified', value: poorCount, color: '#f43f5e' }
  ], [goodCount, avgCount, poorCount]);

  // Priority Mix breakdown
  const priorityMix = useMemo(() => {
    const counts: Record<Priority, number> = {
      Urgent: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    scopedLeads.forEach(l => {
      if (counts[l.priority] !== undefined) {
        counts[l.priority] += 1;
      } else {
        counts.Medium += 1;
      }
    });
    const total = scopedLeads.length || 1;
    return [
      { priority: 'Urgent' as Priority, label: 'Urgent 🔥', count: counts.Urgent, percent: Math.round((counts.Urgent / total) * 100), color: '#ef4444' },
      { priority: 'High' as Priority, label: 'High ⚡', count: counts.High, percent: Math.round((counts.High / total) * 100), color: '#f59e0b' },
      { priority: 'Medium' as Priority, label: 'Medium', count: counts.Medium, percent: Math.round((counts.Medium / total) * 100), color: '#2563eb' },
      { priority: 'Low' as Priority, label: 'Low', count: counts.Low, percent: Math.round((counts.Low / total) * 100), color: '#94a3b8' }
    ];
  }, [scopedLeads]);

  // Team Workload breakdown
  const teamWorkload = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedLeads.forEach(l => {
      const repId = l.assignedToId || 'unassigned';
      counts[repId] = (counts[repId] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts), 1);

    const repList = Object.entries(counts).map(([repId, count]) => {
      const user = users.find(u => u.id === repId);
      return {
        id: repId,
        name: user ? user.name : (repId === 'unassigned' ? 'Unassigned' : 'Unknown Rep'),
        role: user?.role || 'Sales Rep',
        avatar: user?.avatar,
        leadCount: count,
        percentOfMax: Math.round((count / maxCount) * 100)
      };
    });

    repList.sort((a, b) => b.leadCount - a.leadCount);
    return repList.slice(0, 5);
  }, [scopedLeads, users]);

  // Recent activity logs
  const recentLogs = useMemo(() => {
    return activityLogs.slice(0, 5);
  }, [activityLogs]);

  // ===========================================================================
  // PERFORMANCE CENTER DATA DERIVATIONS (SCOPE-SAFE ORGANIZATIONAL PERFORMANCE)
  // ===========================================================================
  const isEmployee = currentUser.role === 'Employee';

  const [performanceTab, setPerformanceTab] = useState<'teams' | 'leads' | 'users'>(
    isEmployee ? 'users' : 'teams'
  );
  const [perfSearch, setPerfSearch] = useState('');
  const [perfTeamFilter, setPerfTeamFilter] = useState('All');
  const [perfSortBy, setPerfSortBy] = useState<'value' | 'leads' | 'conversion'>('value');

  // 1. Team Performance Data (Only teams in current actor's hard scope)
  const teamPerformanceData = useMemo(() => {
    return scopedTeams.map(team => {
      const teamMembers = scopedUsers.filter(u => u.teamId === team.id && u.isActive);
      const memberIds = teamMembers.map(u => u.id);
      const teamLeads = scopedLeads.filter(l => l.teamId === team.id || memberIds.includes(l.assignedToId));
      const assignedLeadsCount = teamLeads.length;
      const convertedLeadsCount = teamLeads.filter(l => l.status === 'Converted').length;
      const conversionRateNum = assignedLeadsCount > 0 ? (convertedLeadsCount / assignedLeadsCount) * 100 : 0;
      const pipelineValue = teamLeads.reduce((acc, l) => acc + getLeadValue(l), 0);
      const missedFollowUps = scopedFollowUps.filter(
        f => classifyFollowUp(f, todayStr) === 'missed' &&
          (memberIds.includes(f.assignedToId) || teamLeads.some(l => l.id === f.leadId))
      ).length;

      const managerName = team.managerName || users.find(u => u.id === team.managerId)?.name || 'Direct';
      const leaderName = team.leaderName || users.find(u => u.id === team.leaderId)?.name || 'Unassigned';

      return {
        id: team.id,
        name: team.name,
        managerName,
        leaderName,
        activeMembersCount: teamMembers.length,
        assignedLeadsCount,
        convertedLeadsCount,
        conversionRate: Number(conversionRateNum.toFixed(1)),
        pipelineValue,
        missedFollowUps
      };
    });
  }, [scopedTeams, scopedUsers, scopedLeads, scopedFollowUps, users, todayStr]);

  // 2. Team Lead Performance Data (Only Team Leads within actor's hard scope)
  const teamLeadPerformanceData = useMemo(() => {
    const teamLeads = scopedUsers.filter(
      u => u.role === 'Team Lead' || scopedTeams.some(t => t.leaderId === u.id || t.leaderName === u.name)
    );

    return teamLeads.map(tl => {
      const team = scopedTeams.find(t => t.id === tl.teamId || t.leaderId === tl.id || t.leaderName === tl.name);
      const teamName = tl.teamName || team?.name || 'Assigned Team';

      const teamMembers = scopedUsers.filter(
        u => u.id !== tl.id && (u.teamLeadId === tl.id || u.teamLeadName === tl.name || (team && u.teamId === team.id && u.role === 'Employee'))
      );
      const subUserIds = [tl.id, ...teamMembers.map(u => u.id)];

      const tlLeads = scopedLeads.filter(l => subUserIds.includes(l.assignedToId) || (team && l.teamId === team.id));
      const assignedLeadsCount = tlLeads.length;
      const convertedLeadsCount = tlLeads.filter(l => l.status === 'Converted').length;
      const conversionRateNum = assignedLeadsCount > 0 ? (convertedLeadsCount / assignedLeadsCount) * 100 : 0;
      const pipelineValue = tlLeads.reduce((acc, l) => acc + getLeadValue(l), 0);
      const pendingFollowUps = scopedFollowUps.filter(f => subUserIds.includes(f.assignedToId) && f.status === 'Pending').length;
      const missedFollowUps = scopedFollowUps.filter(
        f => subUserIds.includes(f.assignedToId) && classifyFollowUp(f, todayStr) === 'missed'
      ).length;

      return {
        id: tl.id,
        name: tl.name,
        avatar: tl.avatar,
        teamName,
        membersCount: teamMembers.length,
        assignedLeadsCount,
        convertedLeadsCount,
        conversionRate: Number(conversionRateNum.toFixed(1)),
        pipelineValue,
        pendingFollowUps,
        missedFollowUps
      };
    });
  }, [scopedUsers, scopedTeams, scopedLeads, scopedFollowUps, todayStr]);

  // 3. User Performance Data (Only authorized active users in actor's hard scope)
  const userPerformanceData = useMemo(() => {
    return scopedUsers.filter(u => u.isActive).map(u => {
      const userLeads = scopedLeads.filter(l => l.assignedToId === u.id);
      const assignedLeadsCount = userLeads.length;
      const newLeadsCount = userLeads.filter(l => l.status === 'New').length;
      const convertedLeadsCount = userLeads.filter(l => l.status === 'Converted').length;
      const conversionRateNum = assignedLeadsCount > 0 ? (convertedLeadsCount / assignedLeadsCount) * 100 : 0;
      const pipelineValue = userLeads.reduce((acc, l) => acc + getLeadValue(l), 0);
      const pendingFollowUps = scopedFollowUps.filter(f => f.assignedToId === u.id && f.status === 'Pending').length;
      const missedFollowUps = scopedFollowUps.filter(
        f => f.assignedToId === u.id && classifyFollowUp(f, todayStr) === 'missed'
      ).length;
      const teamName = u.teamName || scopedTeams.find(t => t.id === u.teamId)?.name || 'General';

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.role,
        teamName,
        assignedLeadsCount,
        newLeadsCount,
        convertedLeadsCount,
        conversionRate: Number(conversionRateNum.toFixed(1)),
        pipelineValue,
        pendingFollowUps,
        missedFollowUps
      };
    });
  }, [scopedUsers, scopedLeads, scopedFollowUps, scopedTeams, todayStr]);

  // Filtered & Sorted datasets for Performance Center
  const filteredTeams = useMemo(() => {
    let list = [...teamPerformanceData];
    if (perfSearch.trim()) {
      const q = perfSearch.toLowerCase().trim();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.leaderName.toLowerCase().includes(q));
    }
    if (perfSortBy === 'value') list.sort((a, b) => b.pipelineValue - a.pipelineValue);
    else if (perfSortBy === 'leads') list.sort((a, b) => b.assignedLeadsCount - a.assignedLeadsCount);
    else if (perfSortBy === 'conversion') list.sort((a, b) => b.conversionRate - a.conversionRate);
    return list;
  }, [teamPerformanceData, perfSearch, perfSortBy]);

  const filteredTeamLeads = useMemo(() => {
    let list = [...teamLeadPerformanceData];
    if (perfSearch.trim()) {
      const q = perfSearch.toLowerCase().trim();
      list = list.filter(tl => tl.name.toLowerCase().includes(q) || tl.teamName.toLowerCase().includes(q));
    }
    if (perfTeamFilter !== 'All') {
      list = list.filter(tl => tl.teamName === perfTeamFilter);
    }
    if (perfSortBy === 'value') list.sort((a, b) => b.pipelineValue - a.pipelineValue);
    else if (perfSortBy === 'leads') list.sort((a, b) => b.assignedLeadsCount - a.assignedLeadsCount);
    else if (perfSortBy === 'conversion') list.sort((a, b) => b.conversionRate - a.conversionRate);
    return list;
  }, [teamLeadPerformanceData, perfSearch, perfTeamFilter, perfSortBy]);

  const filteredUsers = useMemo(() => {
    let list = [...userPerformanceData];
    if (perfSearch.trim()) {
      const q = perfSearch.toLowerCase().trim();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.teamName.toLowerCase().includes(q));
    }
    if (perfTeamFilter !== 'All') {
      list = list.filter(u => u.teamName === perfTeamFilter);
    }
    if (perfSortBy === 'value') list.sort((a, b) => b.pipelineValue - a.pipelineValue);
    else if (perfSortBy === 'leads') list.sort((a, b) => b.assignedLeadsCount - a.assignedLeadsCount);
    else if (perfSortBy === 'conversion') list.sort((a, b) => b.conversionRate - a.conversionRate);
    return list;
  }, [userPerformanceData, perfSearch, perfTeamFilter, perfSortBy]);

  const roleStyle = getRoleBadgeStyle(currentUser.role);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ========================================================================= */}
      {/* COMPACT PAGE HEADER                                                       */}
      {/* ========================================================================= */}
      <PageHeader
        title="Dashboard"
        subtitle="Enterprise pipeline overview and today's sales activity."
        badge={
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
            {currentUser.role} Portal
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToLeads()}
              leftIcon={<Filter className="w-3.5 h-3.5" />}
            >
              Filter Leads
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateToFollowUps('today')}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
            >
              Today&apos;s Follow-Ups ({metrics.todayFollowUps})
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. WELCOME HERO — BLUE ENTERPRISE CRM STYLE                                */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#3B82F6] text-white p-4 sm:px-6 sm:py-4.5 shadow-xs">
        {/* Subtle abstract geometric pattern on right (CSS/SVG only, no stock photos) */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none overflow-hidden opacity-10 hidden md:block">
          <svg viewBox="0 0 400 300" className="w-full h-full object-cover">
            <circle cx="300" cy="150" r="120" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
            <circle cx="300" cy="150" r="80" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M 220 220 L 260 160 L 310 190 L 370 110" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="370" cy="110" r="8" fill="currentColor" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-3.5 sm:gap-4 min-h-[165px] sm:min-h-[175px]">
          {/* Top Row: Greeting & Permission-Aware Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-semibold border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CRM Workspace Active
                </span>
                <span className="text-[11px] text-blue-100/90 font-medium font-mono hidden sm:inline" suppressHydrationWarning>
                  {formatDate(getLocalDateString())}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight mt-0.5" suppressHydrationWarning>
                {greeting}, {currentUser.name}
              </h1>

              <p className="text-blue-100/90 text-xs sm:text-[13px] font-normal leading-relaxed max-w-xl">
                Monitor your sales pipeline, team activity, follow-ups and conversion performance from one centralized workspace.
              </p>
            </div>

            {/* Permission-aware action buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {canCreateLeads && (
                <button
                  type="button"
                  onClick={() => onOpenNewLead ? onOpenNewLead() : onNavigateToLeads()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#2563EB] hover:bg-blue-50 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>
              )}

              {canViewReports && (
                <button
                  type="button"
                  onClick={() => onNavigateToReports ? onNavigateToReports() : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/25 font-semibold text-xs backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>View Reports</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigateToFollowUps(missedFollowUpsList.length > 0 ? 'missed' : 'today')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/25 font-semibold text-xs backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Review Follow-Ups</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: 4 Real Quick Context Metrics with Dividers */}
          <div className="pt-2.5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="pr-2 sm:border-r sm:border-white/20">
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">
                Scoped Pipeline
              </span>
              <span className="text-sm sm:text-base font-medium text-white font-mono">
                {scopedLeads.length} Leads
              </span>
            </div>

            <div className="pr-2 sm:border-r sm:border-white/20">
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">
                Total Pipeline Value
              </span>
              <span className="text-sm sm:text-base font-medium text-white font-mono">
                {formatPKR(totalPipelineValue)}
              </span>
            </div>

            <div className="pr-2 sm:border-r sm:border-white/20">
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">
                Missed Follow-Ups
              </span>
              <span className={`text-sm sm:text-base font-medium font-mono ${missedFollowUpsList.length > 0 ? 'text-rose-200' : 'text-white'}`}>
                {missedFollowUpsList.length} Tasks
              </span>
            </div>

            <div>
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">
                Hot / Urgent Leads
              </span>
              <span className="text-sm sm:text-base font-medium text-amber-200 font-mono">
                {urgentLeadsCount} Leads
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP KPI STRIP (SHORTER & MORE PREMIUM, ~110-120px)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Leads (Subtle Blue Visual Anchor) */}
        <div
          onClick={() => onNavigateToLeads('All')}
          className="h-[114px] bg-gradient-to-br from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 border border-blue-200/90 dark:border-blue-900/60 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs hover:border-[#2563EB] dark:hover:border-blue-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 uppercase tracking-wider">
              Total Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight">
              {metrics.totalLeads}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              {activeLeads.length} active in pipeline
            </p>
          </div>
        </div>

        {/* KPI 2: New Leads */}
        <div
          onClick={() => onNavigateToLeads('New')}
          className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs hover:border-[#2563EB] dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              New Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight">
              {metrics.newLeads}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              {Math.round(((metrics.newLeads || 0) / (metrics.totalLeads || 1)) * 100)}% of current pipeline
            </p>
          </div>
        </div>

        {/* KPI 3: Converted Deals */}
        <div
          onClick={() => onNavigateToLeads('Converted')}
          className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs hover:border-emerald-400 dark:hover:border-emerald-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Converted Deals
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight">
              {metrics.convertedLeads}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              {conversionRate}% current conversion rate
            </p>
          </div>
        </div>

        {/* KPI 4: Pending Follow-Ups */}
        <div
          onClick={() => onNavigateToFollowUps('upcoming')}
          className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs hover:border-amber-400 dark:hover:border-amber-800 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Pending Follow-Ups
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight">
              {metrics.pendingFollowUps}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              {todayFollowUpsList.length} due today • {missedFollowUpsList.length} missed
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPACT INLINE STATUS ROW                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mr-1">
            Status Triage:
          </span>

          {/* Hot Leads */}
          <button
            type="button"
            onClick={() => onNavigateToLeads('All')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer text-xs group"
            title="View Hot Leads"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Hot Leads</span>
            <span className="font-mono font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.2 rounded text-[11px]">
              {metrics.hotLeads}
            </span>
          </button>

          {/* Missed */}
          <button
            type="button"
            onClick={() => onNavigateToFollowUps('missed')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer text-xs group"
            title="Review Missed Follow-Ups"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Missed</span>
            <span className={`font-mono font-medium px-1.5 py-0.2 rounded text-[11px] ${metrics.missedFollowUps > 0
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
              {metrics.missedFollowUps}
            </span>
          </button>

          {/* Stale */}
          <button
            type="button"
            onClick={() => onNavigateToLeads('All')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer text-xs group"
            title="View Stale Leads"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Stale</span>
            <span className="font-mono font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.2 rounded text-[11px]">
              {metrics.staleLeads}
            </span>
          </button>

          {/* Lost */}
          <button
            type="button"
            onClick={() => onNavigateToLeads('Lost')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer text-xs group"
            title="View Lost Inquiries"
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Lost</span>
            <span className="font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.2 rounded text-[11px]">
              {metrics.lostLeads}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-[#64748B] dark:text-slate-500 hidden sm:inline">
          Click any badge to filter records
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 4. HERO ANALYTICS SECTION (LEFT 8 COLS, RIGHT 4 COLS)                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT (8 COLS): PIPELINE PERFORMANCE */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              {/* Header with Active Leads & Active Pipeline Value */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                      Pipeline Performance
                      <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900">
                        {activeLeads.length} Active Leads
                      </span>
                    </h2>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      Actual lead stage distribution and pipeline value in PKR
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    Active Pipeline Value
                  </span>
                  <span className="text-sm font-medium text-[#2563EB] dark:text-blue-400 font-mono">
                    {formatPKR(activePipelineValue)}
                  </span>
                </div>
              </div>

              {/* Stacked Proportional Flow Overview */}
              <div className="py-3 border-b border-[#E5EAF1] dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] dark:text-slate-400 mb-1.5">
                  <span>Stage Flow Ratio</span>
                  <span className="font-mono">{metrics.totalLeads} Total Scoped</span>
                </div>
                <DistributionBar
                  segments={pipelineSegments}
                  height={8}
                  onSegmentClick={(id) => onNavigateToLeads(id)}
                />
              </div>

              {/* Stage-by-Stage Breakdown Rows with Values */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
                {stageBreakdown.map(stage => (
                  <div
                    key={stage.status}
                    onClick={() => onNavigateToLeads(stage.status)}
                    className="py-2 px-1 rounded-lg hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    title={`Stage: ${stage.label} • ${stage.count} leads (${stage.countPercent}%) • Value: ${formatPKR(stage.value)}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.color} shrink-0`} />
                        <span className="font-semibold text-[#0F172A] dark:text-slate-200 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors truncate">
                          {stage.label}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                          ({stage.count} {stage.count === 1 ? 'lead' : 'leads'})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white">
                          {formatPKR(stage.value)}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono w-10 text-right">
                          {stage.countPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all duration-300`}
                        style={{ width: `${Math.max(stage.countPercent, stage.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="pt-3 mt-3 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between text-xs text-[#64748B]">
              <span>Click any stage row to filter leads</span>
              <button
                type="button"
                onClick={() => onNavigateToLeads('All')}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT (4 COLS): PIPELINE SNAPSHOT */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                    Pipeline Snapshot
                  </h2>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 tracking-wider">
                  Real Time
                </span>
              </div>

              {/* 4 Metric Tiles Grid */}
              <div className="grid grid-cols-2 gap-2.5 py-3">
                <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    Total Value
                  </span>
                  <div className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 truncate">
                    {formatPKR(totalPipelineValue)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    Avg Lead Deal
                  </span>
                  <div className="text-xs sm:text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 truncate">
                    {formatPKR(averageLeadValue)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    Conversion Rate
                  </span>
                  <div className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate">
                    {conversionRate}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                    Urgent Leads
                  </span>
                  <div className="text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 font-mono mt-0.5 truncate">
                    {urgentLeadsCount}
                  </div>
                </div>
              </div>

              {/* Converted vs Open Visual Donut */}
              <div className="pt-2">
                <DonutChart
                  data={snapshotDonutData}
                  size={120}
                  strokeWidth={16}
                  centerValue={`${conversionRate}%`}
                  centerLabel="Won"
                  showLegend={true}
                  className="w-full justify-center"
                />
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#E5EAF1] dark:border-slate-800 text-center">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                {metrics.convertedLeads} converted deals of {scopedLeads.length} total scoped leads
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SECOND ANALYTICS ROW                                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT (7 COLS): LEAD SOURCE PERFORMANCE */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Lead Source Performance
                    </h2>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      Channel volume and pipeline value generated
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900">
                  {sourcePerformance.length} Channels
                </span>
              </div>

              {/* Source ranking list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-2">
                {sourcePerformance.length === 0 ? (
                  <p className="text-xs text-[#64748B] py-6 text-center">No source records available</p>
                ) : (
                  sourcePerformance.map((src, index) => (
                    <div
                      key={src.source}
                      onClick={() => onNavigateToLeads('All')}
                      className="py-2.5 px-1 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer group"
                      title={`${src.source}: ${src.count} leads • Value: ${formatPKR(src.value)}`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-[#0F172A] dark:text-slate-200 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors truncate">
                            {src.source}
                          </span>
                          <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                            • {src.count} {src.count === 1 ? 'lead' : 'leads'} ({src.percent}%)
                          </span>
                        </div>

                        <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white shrink-0">
                          {formatPKR(src.value)}
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(src.percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between text-xs text-[#64748B]">
              <span>Real source attribution from current scoped leads</span>
              <button
                type="button"
                onClick={() => onNavigateToLeads('All')}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Filter by Channel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT (5 COLS): FOLLOW-UP HEALTH */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Follow-Up Health
                    </h2>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      Task completion and schedule triage
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900">
                  {todayFollowUpsList.length} Due Today
                </span>
              </div>

              {/* Segmented Donut Chart */}
              <div className="py-3">
                <DonutChart
                  data={followUpHealthData}
                  size={125}
                  strokeWidth={16}
                  centerValue={scopedFollowUps.length}
                  centerLabel="Tasks"
                  showLegend={true}
                  className="w-full justify-center"
                />
              </div>

              {/* Operational Status Callout */}
              <div className="mt-2 space-y-2">
                {todayFollowUpsList.length === 0 ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">All caught up for today.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">{todayFollowUpsList.length} follow-up calls/meetings due today.</span>
                    <button
                      type="button"
                      onClick={() => onNavigateToFollowUps('today')}
                      className="font-bold underline cursor-pointer hover:text-amber-900"
                    >
                      View
                    </button>
                  </div>
                )}

                {missedFollowUpsList.length > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
                    <span className="font-semibold">{missedFollowUpsList.length} overdue / missed touchpoints.</span>
                    <button
                      type="button"
                      onClick={() => onNavigateToFollowUps('missed')}
                      className="font-bold underline cursor-pointer hover:text-rose-900"
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#E5EAF1] dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => onNavigateToFollowUps('upcoming')}
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Follow-Up Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. THIRD ROW — THREE COMPACT INSIGHT PANELS                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel A: Lead Quality */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                  Lead Quality
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">{scopedLeads.length} Leads</span>
            </div>

            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={qualityDonutData}
                size={120}
                strokeWidth={16}
                centerValue={scopedLeads.length}
                centerLabel="Total"
                showLegend={true}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[#E5EAF1] dark:border-slate-800 text-center text-[11px] text-[#64748B]">
            {goodCount} high-intent prospects qualified
          </div>
        </div>

        {/* Panel B: Priority Mix */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                  Priority Mix
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">Urgency</span>
            </div>

            <div className="space-y-2.5 py-2">
              {priorityMix.map(p => (
                <div key={p.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A] dark:text-slate-200">
                      {p.label}
                    </span>
                    <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white">
                      {p.count} <span className="text-[10px] text-[#64748B] font-normal">({p.percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(p.percent, p.count > 0 ? 4 : 0)}%`,
                        backgroundColor: p.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[#E5EAF1] dark:border-slate-800 text-center text-[11px] text-[#64748B]">
            {urgentLeadsCount} leads marked urgent for closing
          </div>
        </div>

        {/* Panel C: Team Workload */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                  Team Workload
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">Distribution</span>
            </div>

            <div className="space-y-2 py-2">
              {teamWorkload.map(rep => (
                <div key={rep.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {rep.avatar ? (
                        <img
                          src={rep.avatar}
                          alt={rep.name}
                          className="w-4.5 h-4.5 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full bg-[#2563EB] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {rep.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-[#0F172A] dark:text-slate-200 truncate">
                        {rep.name}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white shrink-0">
                      {rep.leadCount}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(rep.percentOfMax, 6)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[#E5EAF1] dark:border-slate-800 text-center text-[11px] text-[#64748B]">
            Active lead allocation across representatives
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MANAGEMENT PERFORMANCE CENTER (SCOPE-SAFE ORGANIZATIONAL PERFORMANCE) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5">
        {/* Header with Title & Operational Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                Performance Center
                <span className="text-[10px] font-semibold bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900">
                  {currentUser.role} Scope
                </span>
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Compare current lead ownership, pipeline and conversion activity across your authorized organizational scope.
              </p>
            </div>
          </div>

          {/* Internal Tab Switcher (Teams, Team Leads, Users) */}
          {!isEmployee && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setPerformanceTab('teams')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${performanceTab === 'teams'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
              >
                Teams ({scopedTeams.length})
              </button>

              <button
                type="button"
                onClick={() => setPerformanceTab('leads')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${performanceTab === 'leads'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
              >
                Team Leads ({teamLeadPerformanceData.length})
              </button>

              <button
                type="button"
                onClick={() => setPerformanceTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${performanceTab === 'users'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
              >
                Users ({userPerformanceData.length})
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Permission Enforcement (canViewReports) */}
        {!canViewReports ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-bold text-sm text-[#0F172A] dark:text-white">
              Reporting &amp; Performance Access Restricted
            </p>
            <p className="mt-1 max-w-md mx-auto">
              Your profile requires the <strong>View Reports</strong> capability to access comparative metrics. Contact your administrator if this was granted in error.
            </p>
          </div>
        ) : isEmployee ? (
          /* ========================================================================= */
          /* EMPLOYEE PERSONAL PERFORMANCE VIEW (NO CROSS-USER RANKINGS / ZERO LEAKAGE) */
          /* ========================================================================= */
          <div className="pt-4 space-y-4">
            <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-blue-300" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {currentUser.name} (My Performance Overview)
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Individual portfolio summary for current assigned records
                  </p>
                </div>
              </div>
              <Badge variant="primary" size="sm">Individual Scope</Badge>
            </div>

            {/* Employee's personal metrics grid */}
            {userPerformanceData.filter(u => u.id === currentUser.id).map(myPerf => (
              <div key={myPerf.id} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Assigned Leads</span>
                  <span className="text-lg font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">{myPerf.assignedLeadsCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Pipeline Value</span>
                  <span className="text-lg font-medium text-[#2563EB] dark:text-blue-400 font-mono mt-0.5 block">{formatPKR(myPerf.pipelineValue)}</span>
                </div>
                <div className="p-3 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Conversion Rate</span>
                  <span className="text-lg font-medium text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">{myPerf.conversionRate}%</span>
                </div>
                <div className="p-3 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Pending Tasks</span>
                  <span className="text-lg font-medium text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">{myPerf.pendingFollowUps}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ========================================================================= */
          /* MANAGEMENT ORGANIZATIONAL PERFORMANCE VIEW (TEAMS / TEAM LEADS / USERS)   */
          /* ========================================================================= */
          <div className="pt-3 space-y-3.5">
            {/* Context Summary Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {performanceTab === 'teams' && (
                <>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Visible Teams</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">{scopedTeams.length}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Assigned Leads</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">
                      {teamPerformanceData.reduce((acc, t) => acc + t.assignedLeadsCount, 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Total Pipeline</span>
                    <span className="text-sm font-medium text-[#2563EB] dark:text-blue-400 font-mono mt-0.5 block">
                      {formatPKR(teamPerformanceData.reduce((acc, t) => acc + t.pipelineValue, 0))}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Converted Deals</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {teamPerformanceData.reduce((acc, t) => acc + t.convertedLeadsCount, 0)}
                    </span>
                  </div>
                </>
              )}

              {performanceTab === 'leads' && (
                <>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Team Leads</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">{teamLeadPerformanceData.length}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Managed Reps</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">
                      {teamLeadPerformanceData.reduce((acc, tl) => acc + tl.membersCount, 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Sub-Team Pipeline</span>
                    <span className="text-sm font-medium text-[#2563EB] dark:text-blue-400 font-mono mt-0.5 block">
                      {formatPKR(teamLeadPerformanceData.reduce((acc, tl) => acc + tl.pipelineValue, 0))}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Converted Deals</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {teamLeadPerformanceData.reduce((acc, tl) => acc + tl.convertedLeadsCount, 0)}
                    </span>
                  </div>
                </>
              )}

              {performanceTab === 'users' && (
                <>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Authorized Reps</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">{userPerformanceData.length}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Assigned Leads</span>
                    <span className="text-sm font-medium text-[#0F172A] dark:text-white font-mono mt-0.5 block">
                      {userPerformanceData.reduce((acc, u) => acc + u.assignedLeadsCount, 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Total Pipeline</span>
                    <span className="text-sm font-medium text-[#2563EB] dark:text-blue-400 font-mono mt-0.5 block">
                      {formatPKR(userPerformanceData.reduce((acc, u) => acc + u.pipelineValue, 0))}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Converted Deals</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {userPerformanceData.reduce((acc, u) => acc + u.convertedLeadsCount, 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Compact Filters & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="w-full sm:w-64">
                <Input
                  value={perfSearch}
                  onChange={e => setPerfSearch(e.target.value)}
                  placeholder={`Search ${performanceTab}...`}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {performanceTab !== 'teams' && scopedTeams.length > 1 && (
                  <div className="w-36">
                    <Select
                      value={perfTeamFilter}
                      onChange={e => setPerfTeamFilter(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="All">All Teams</option>
                      {scopedTeams.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="w-40">
                  <Select
                    value={perfSortBy}
                    onChange={e => setPerfSortBy(e.target.value as any)}
                    className="h-8 text-xs"
                  >
                    <option value="value">Sort: Pipeline Value</option>
                    <option value="leads">Sort: Assigned Leads</option>
                    <option value="conversion">Sort: Conversion Rate</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Performance Data Grid with Top Scroll Sync */}
            <div className="border border-[#E5EAF1] dark:border-slate-800 rounded-xl overflow-hidden">
              <DataTableScrollFrame>
                {/* 1. TAB: TEAMS PERFORMANCE */}
                {performanceTab === 'teams' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3 min-w-[180px]">Team Name</th>
                        <th className="p-3 min-w-[140px]">Manager</th>
                        <th className="p-3 min-w-[140px]">Team Lead</th>
                        <th className="p-3 min-w-[90px] text-center" title="Active member count in scope">Members</th>
                        <th className="p-3 min-w-[110px]" title="Current leads owned by the selected team">Assigned Leads</th>
                        <th className="p-3 min-w-[100px]" title="Current scoped leads with canonical Converted status">Converted</th>
                        <th className="p-3 min-w-[130px]" title="Converted / Assigned Leads percentage">Conversion Rate</th>
                        <th className="p-3 min-w-[130px]" title="Sum of current scoped lead values">Pipeline Value</th>
                        <th className="p-3 min-w-[110px] text-right" title="Current canonical missed follow-up records in scope">Missed Tasks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
                      {filteredTeams.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-xs text-[#64748B]">
                            No team records found matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTeams.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="p-3 font-bold text-xs text-[#0F172A] dark:text-white">
                              {t.name}
                            </td>
                            <td className="p-3 text-xs text-[#64748B] dark:text-slate-300">
                              {t.managerName}
                            </td>
                            <td className="p-3 text-xs text-[#64748B] dark:text-slate-300">
                              {t.leaderName}
                            </td>
                            <td className="p-3 text-center font-mono text-xs text-[#0F172A] dark:text-white">
                              {t.activeMembersCount}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#0F172A] dark:text-white">
                              {t.assignedLeadsCount}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                              {t.convertedLeadsCount}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white w-10">
                                  {t.conversionRate}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(t.conversionRate, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#2563EB] dark:text-blue-400">
                              {formatPKR(t.pipelineValue)}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-mono text-xs font-medium ${t.missedFollowUps > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#64748B]'}`}>
                                {t.missedFollowUps}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 2. TAB: TEAM LEADS PERFORMANCE */}
                {performanceTab === 'leads' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3 min-w-[180px]">Team Lead</th>
                        <th className="p-3 min-w-[160px]">Assigned Team</th>
                        <th className="p-3 min-w-[90px] text-center" title="Direct reporting members in hard scope">Reps</th>
                        <th className="p-3 min-w-[110px]" title="Current leads owned by the selected team/lead">Assigned Leads</th>
                        <th className="p-3 min-w-[100px]" title="Current scoped leads with canonical Converted status">Converted</th>
                        <th className="p-3 min-w-[130px]" title="Converted / Assigned Leads percentage">Conversion Rate</th>
                        <th className="p-3 min-w-[130px]" title="Sum of current scoped lead values">Pipeline Value</th>
                        <th className="p-3 min-w-[100px]" title="Current pending follow-up records in scope">Pending</th>
                        <th className="p-3 min-w-[100px] text-right" title="Current canonical missed follow-up records in scope">Missed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
                      {filteredTeamLeads.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-xs text-[#64748B]">
                            No team lead records found matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTeamLeads.map(tl => (
                          <tr key={tl.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {tl.avatar ? (
                                  <img src={tl.avatar} alt={tl.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-[10px]">
                                    {tl.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                                  {tl.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-[#64748B] dark:text-slate-300 truncate">
                              {tl.teamName}
                            </td>
                            <td className="p-3 text-center font-mono text-xs text-[#0F172A] dark:text-white">
                              {tl.membersCount}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#0F172A] dark:text-white">
                              {tl.assignedLeadsCount}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                              {tl.convertedLeadsCount}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white w-10">
                                  {tl.conversionRate}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(tl.conversionRate, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#2563EB] dark:text-blue-400">
                              {formatPKR(tl.pipelineValue)}
                            </td>
                            <td className="p-3 font-mono text-xs text-[#64748B]">
                              {tl.pendingFollowUps}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-mono text-xs font-medium ${tl.missedFollowUps > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#64748B]'}`}>
                                {tl.missedFollowUps}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* 3. TAB: USERS PERFORMANCE */}
                {performanceTab === 'users' && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3 min-w-[180px]">User</th>
                        <th className="p-3 min-w-[110px]">Role</th>
                        <th className="p-3 min-w-[140px]">Team</th>
                        <th className="p-3 min-w-[100px]" title="Current leads owned by the selected user">Assigned</th>
                        <th className="p-3 min-w-[90px]" title="Uncontacted / new prospects">New</th>
                        <th className="p-3 min-w-[100px]" title="Current scoped leads with canonical Converted status">Converted</th>
                        <th className="p-3 min-w-[130px]" title="Converted / Assigned Leads percentage">Conversion Rate</th>
                        <th className="p-3 min-w-[130px]" title="Sum of current scoped lead values">Pipeline Value</th>
                        <th className="p-3 min-w-[90px]" title="Current pending follow-up records in scope">Pending</th>
                        <th className="p-3 min-w-[90px] text-right" title="Current canonical missed follow-up records in scope">Missed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-xs text-[#64748B]">
                            No user records found matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-[10px]">
                                    {u.name.charAt(0)}
                                  </div>
                                )}
                                <span className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                                  {u.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-[#64748B] dark:text-slate-300 truncate">
                              {u.teamName}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#0F172A] dark:text-white">
                              {u.assignedLeadsCount}
                            </td>
                            <td className="p-3 font-mono text-xs text-sky-600 dark:text-sky-400">
                              {u.newLeadsCount}
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                              {u.convertedLeadsCount}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium text-[#0F172A] dark:text-white w-10">
                                  {u.conversionRate}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(u.conversionRate, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-medium text-xs text-[#2563EB] dark:text-blue-400">
                              {formatPKR(u.pipelineValue)}
                            </td>
                            <td className="p-3 font-mono text-xs text-[#64748B]">
                              {u.pendingFollowUps}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`font-mono text-xs font-medium ${u.missedFollowUps > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#64748B]'}`}>
                                {u.missedFollowUps}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </DataTableScrollFrame>
            </div>

            {/* Performance Definitions Footer Note */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-[#64748B] flex-wrap gap-2">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Conversion Rate = Converted / Assigned Leads • Current snapshot data only</span>
              </span>
              <span>All metrics computed strictly within your authorized RBAC scope</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. RECENT ACTIVITY — FULL WIDTH BUT COMPACT                               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Recent Activity Audit
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Latest operational system events and representative actions
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[#64748B] dark:text-slate-400">
            Live Stream
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-[#64748B] py-6 text-center">No recent activity recorded</p>
          ) : (
            recentLogs.map(log => (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-850/50 rounded-lg px-1 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0F172A] dark:text-slate-200 truncate">
                      {log.action} • <span className="font-medium text-[#2563EB] dark:text-blue-400">{log.entityTitle}</span>
                    </p>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 hidden sm:inline">
                    {log.userName}
                  </span>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
