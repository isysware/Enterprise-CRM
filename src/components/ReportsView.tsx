import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  CalendarCheck,
  Award,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Briefcase,
  Zap,
  Shield,
  Sparkles,
  Percent,
  TrendingDown,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Target
} from 'lucide-react';
import { formatPKR, parseAmount, getClientRevenue, getRoleBadgeStyle } from '../utils/formatters';

type DatePreset = 'last_30_days' | 'this_month' | 'this_quarter' | 'ytd' | 'all_time' | 'custom';

export const ReportsView: React.FC = () => {
  const {
    leads,
    scopedLeads,
    followUps,
    scopedFollowUps,
    clients,
    scopedClients,
    users,
    scopedUsers,
    teams,
    scopedTeams,
    services,
    pricingModels
  } = useCRM();

  const baseLeads = scopedLeads;
  const baseFollowUps = scopedFollowUps;
  const baseClients = scopedClients;
  const baseUsers = scopedUsers;
  const baseTeams = scopedTeams;

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sales' | 'pricing' | 'staff'>('overview');

  // Compute reference dates (Current local simulated date: August 20, 2026)
  const todayStr = useMemo(() => {
    const d = new Date('2026-08-20');
    return d.toISOString().split('T')[0];
  }, []);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date('2026-08-20');
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const firstOfCurrentMonthStr = useMemo(() => {
    return '2026-08-01';
  }, []);

  const startOfQuarterStr = useMemo(() => {
    return '2026-07-01';
  }, []);

  const startOfYearStr = useMemo(() => {
    return '2026-01-01';
  }, []);

  // Multi-dimensional filter states
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [selectedUser, setSelectedUser] = useState<string>('All');
  const [datePreset, setDatePreset] = useState<DatePreset>('last_30_days');
  const [fromDate, setFromDate] = useState<string>(thirtyDaysAgoStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [isFilterAppliedNotification, setIsFilterAppliedNotification] = useState<boolean>(false);

  // Handle Preset selection
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'last_30_days') {
      setFromDate(thirtyDaysAgoStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      setFromDate(firstOfCurrentMonthStr);
      setToDate(todayStr);
    } else if (preset === 'this_quarter') {
      setFromDate(startOfQuarterStr);
      setToDate(todayStr);
    } else if (preset === 'ytd') {
      setFromDate(startOfYearStr);
      setToDate(todayStr);
    } else if (preset === 'all_time') {
      setFromDate('');
      setToDate('');
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedTeam('All');
    setSelectedUser('All');
    setDatePreset('last_30_days');
    setFromDate(thirtyDaysAgoStr);
    setToDate(todayStr);
    setIsFilterAppliedNotification(false);
  };

  const handleApplyFilters = () => {
    setIsFilterAppliedNotification(true);
    setTimeout(() => setIsFilterAppliedNotification(false), 2500);
  };

  // Eligible users based on selectedTeam
  const availableUsers = useMemo(() => {
    if (selectedTeam === 'All') return baseUsers;
    return baseUsers.filter(u => u.teamId === selectedTeam);
  }, [baseUsers, selectedTeam]);

  // If selected team changes and currently selected user does not belong to it, reset selectedUser
  const effectiveSelectedUser = useMemo(() => {
    if (selectedUser === 'All') return 'All';
    const exists = availableUsers.some(u => u.id === selectedUser);
    return exists ? selectedUser : 'All';
  }, [availableUsers, selectedUser]);

  // Date filtering helper
  const isDateWithinRange = (dateString?: string | null): boolean => {
    if (!fromDate && !toDate) return true;
    if (!dateString) return true; // Keep records without explicit dates or treat as in-range

    // Clean date string to YYYY-MM-DD
    const d = dateString.substring(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  // 1. FILTER USERS
  const filteredUsers = useMemo(() => {
    let result = availableUsers;
    if (effectiveSelectedUser !== 'All') {
      result = result.filter(u => u.id === effectiveSelectedUser);
    }
    return result;
  }, [availableUsers, effectiveSelectedUser]);

  const targetUserIds = useMemo(() => {
    if (effectiveSelectedUser !== 'All') {
      return [effectiveSelectedUser];
    }
    return filteredUsers.map(u => u.id);
  }, [filteredUsers, effectiveSelectedUser]);

  // 2. FILTER LEADS
  const filteredLeads = useMemo(() => {
    return baseLeads.filter(l => {
      // User / Team check
      const matchesTeam = selectedTeam === 'All' || l.teamId === selectedTeam || targetUserIds.includes(l.assignedToId);
      const matchesUser = effectiveSelectedUser === 'All' || l.assignedToId === effectiveSelectedUser || l.generatedById === effectiveSelectedUser;

      if (!matchesTeam || !matchesUser) return false;

      // Date range check
      const leadDate = l.createdAt || l.updatedAt || l.firstContactDate;
      return isDateWithinRange(leadDate);
    });
  }, [baseLeads, selectedTeam, effectiveSelectedUser, targetUserIds, fromDate, toDate]);

  // 3. FILTER FOLLOW-UPS
  const filteredFollowUps = useMemo(() => {
    return baseFollowUps.filter(f => {
      // User check
      const matchesUser = effectiveSelectedUser === 'All'
        ? targetUserIds.includes(f.assignedToId) || filteredLeads.some(l => l.id === f.leadId)
        : f.assignedToId === effectiveSelectedUser;

      if (!matchesUser) return false;

      // Date check
      const fuDate = f.scheduledDate || f.createdAt;
      return isDateWithinRange(fuDate);
    });
  }, [baseFollowUps, effectiveSelectedUser, targetUserIds, filteredLeads, fromDate, toDate]);

  // 4. FILTER CLIENTS
  const filteredClients = useMemo(() => {
    return baseClients.filter(c => {
      // User check
      const matchesUser = effectiveSelectedUser === 'All'
        ? targetUserIds.includes(c.assignedToId || '') ||
          targetUserIds.includes(c.generatedById || '') ||
          targetUserIds.includes(c.closedById || '') ||
          filteredLeads.some(l => l.id === c.leadId)
        : (c.assignedToId === effectiveSelectedUser || c.generatedById === effectiveSelectedUser || c.closedById === effectiveSelectedUser);

      if (!matchesUser) return false;

      // Date check
      const clientDate = c.startDate || c.convertedDate || c.createdAt;
      return isDateWithinRange(clientDate);
    });
  }, [baseClients, effectiveSelectedUser, targetUserIds, filteredLeads, fromDate, toDate]);

  // Total Active Revenue
  const totalRevenue = useMemo(() => {
    return filteredClients.reduce((sum, c) => sum + getClientRevenue(c), 0);
  }, [filteredClients]);

  // Overview 4-Step Funnel Velocity Calculations
  const funnelMetrics = useMemo(() => {
    const inflowCount = filteredLeads.length;
    const outreachCount = filteredLeads.filter(l =>
      ['Contacted', 'Follow-Up Required', 'Qualified', 'Won', 'Converted'].includes(l.status)
    ).length;
    const demosCount = filteredFollowUps.filter(f => f.type === 'Demo' || f.type === 'Meeting').length ||
      filteredLeads.filter(l => ['Qualified', 'Won', 'Converted'].includes(l.status)).length;
    const wonCount = filteredClients.length || filteredLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;

    const outreachRate = inflowCount > 0 ? Math.min(100, Math.round((outreachCount / inflowCount) * 100)) : 0;
    const demoRate = outreachCount > 0 ? Math.min(100, Math.round((demosCount / outreachCount) * 100)) : 0;
    const closeRate = demosCount > 0 ? Math.min(100, Math.round((wonCount / demosCount) * 100)) : 0;
    const netConversionRate = inflowCount > 0 ? Math.min(100, Math.round((wonCount / inflowCount) * 100)) : 0;

    return {
      inflowCount,
      outreachCount,
      demosCount,
      wonCount,
      outreachRate,
      demoRate,
      closeRate,
      netConversionRate
    };
  }, [filteredLeads, filteredFollowUps, filteredClients]);

  // Pricing model metrics
  const pricingModelsData = useMemo(() => {
    const defaultModels = [
      {
        id: 'pm-sub',
        name: 'Monthly Subscription (SaaS)',
        keyMatch: 'monthly',
        desc: 'Recurring SaaS model for salons & retail POS with cloud backups & periodic updates.'
      },
      {
        id: 'pm-proj',
        name: 'One-Time Project Model',
        keyMatch: 'one-time',
        desc: 'Custom software implementations, turnkey hardware POS installations, and milestone deliverables.'
      },
      {
        id: 'pm-own',
        name: 'Ownership Model',
        keyMatch: 'ownership',
        desc: 'Full perpetual source code license & dedicated private server deployment.'
      },
      {
        id: 'pm-hyb',
        name: 'Custom Quotation / Hybrid',
        keyMatch: 'custom',
        desc: 'Tailored enterprise contract combining upfront custom development milestones with recurring SLA support.'
      }
    ];

    return defaultModels.map(model => {
      const matchedClients = filteredClients.filter(c => {
        const pModel = (c.pricingModel || '').toLowerCase();
        return pModel.includes(model.keyMatch) || model.name.toLowerCase().includes(pModel);
      });

      const modelRevenue = matchedClients.reduce((sum, c) => sum + getClientRevenue(c), 0);
      const leadsInPipeline = filteredLeads.filter(l => {
        const pModel = (l.pricingModel || '').toLowerCase();
        const lServices = (l.services || []).join(' ').toLowerCase();
        return pModel.includes(model.keyMatch) || lServices.includes(model.keyMatch);
      }).length;

      const avgDealPKR = matchedClients.length > 0
        ? Math.round(modelRevenue / matchedClients.length)
        : (model.keyMatch === 'monthly' ? 15000 : model.keyMatch === 'one-time' ? 80000 : model.keyMatch === 'ownership' ? 250000 : 120000);

      return {
        id: model.id,
        name: model.name,
        desc: model.desc,
        activeClients: matchedClients.length,
        revenuePKR: modelRevenue,
        leadsInPipeline,
        avgDealPKR
      };
    });
  }, [filteredClients, filteredLeads]);

  // Staff Performance Data (Computed dynamically from filtered leads/followups/clients state)
  const staffPerformanceData = useMemo(() => {
    // If a specific user is selected, list that user plus available team members for context
    const userPool = effectiveSelectedUser !== 'All'
      ? users.filter(u => u.id === effectiveSelectedUser)
      : filteredUsers;

    const data = userPool.map(user => {
      const userLeads = leads.filter(l => {
        if (l.assignedToId !== user.id) return false;
        const leadDate = l.createdAt || l.updatedAt || l.firstContactDate;
        return isDateWithinRange(leadDate);
      });

      const userFollowUps = followUps.filter(f => {
        if (f.assignedToId !== user.id) return false;
        const fuDate = f.scheduledDate || f.createdAt;
        return isDateWithinRange(fuDate);
      });

      const completedFUs = userFollowUps.filter(f => f.status === 'Done').length;
      const userClients = clients.filter(c => {
        const isMatch = c.assignedToId === user.id || c.generatedById === user.id || c.closedById === user.id;
        if (!isMatch) return false;
        const clientDate = c.startDate || c.convertedDate || c.createdAt;
        return isDateWithinRange(clientDate);
      });

      const revenue = userClients.reduce((sum, c) => sum + getClientRevenue(c), 0);

      const conversionRate = userLeads.length > 0 ? Math.round((userClients.length / userLeads.length) * 100) : 0;
      const followUpRate = userFollowUps.length > 0 ? Math.round((completedFUs / userFollowUps.length) * 100) : 0;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        teamName: user.teamName || 'Enterprise Sales',
        leadsCount: userLeads.length,
        followUpsCount: userFollowUps.length,
        followUpsDone: completedFUs,
        followUpRate,
        convertedCount: userClients.length,
        conversionRate,
        revenuePKR: revenue,
        avgResponse: user.role === 'Employee' ? '12 mins' : user.role === 'Team Lead' ? '25 mins' : '45 mins',
        isSelected: user.id === effectiveSelectedUser
      };
    });

    return data.sort((a, b) => b.revenuePKR - a.revenuePKR);
  }, [users, filteredUsers, effectiveSelectedUser, leads, followUps, clients, fromDate, toDate]);

  const isCustomFilterActive = selectedTeam !== 'All' || effectiveSelectedUser !== 'All' || datePreset !== 'last_30_days';

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Header with Title & Filter Controls */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enterprise Performance &amp; Sales Reports
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-dimensional reporting across team hierarchies, individual sales reps, and customizable date periods.
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'last_30_days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_quarter', label: 'Q3 FY26' },
              { id: 'ytd', label: 'Year to Date' },
              { id: 'all_time', label: 'All Time' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as DatePreset)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Multi-Dimensional Filter Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Team Filter */}
          <div className="lg:col-span-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Team Hierarchy</label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-slate-900">All Teams ({baseTeams.length})</option>
                {baseTeams.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900">{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User / Sales Rep Filter */}
          <div className="lg:col-span-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Sales Representative</label>
              <select
                value={effectiveSelectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden cursor-pointer truncate"
              >
                <option value="All" className="bg-white dark:bg-slate-900">All Representatives ({availableUsers.length})</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* From Date */}
          <div className="lg:col-span-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="lg:col-span-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons: Apply & Reset */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              onClick={handleResetFilters}
              title="Reset all filters to default"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filter Scope Indicators & Notification Toast */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Active Scope:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Team: {selectedTeam === 'All' ? 'All Teams' : teams.find(t => t.id === selectedTeam)?.name || selectedTeam}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Rep: {effectiveSelectedUser === 'All' ? 'All Reps' : users.find(u => u.id === effectiveSelectedUser)?.name || effectiveSelectedUser}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              Window: {fromDate && toDate ? `${fromDate} → ${toDate}` : fromDate ? `From ${fromDate}` : toDate ? `Until ${toDate}` : 'All Time'}
            </span>
          </div>

          {isFilterAppliedNotification && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Filters updated in real-time</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="w-full flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'sales', label: 'Sales & Conversion', icon: TrendingUp },
          { id: 'pricing', label: 'Pricing Models', icon: Layers },
          { id: 'staff', label: 'Staff Performance', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="w-full space-y-6">
          {/* Top Metric Cards */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Leads Pipeline */}
            <div className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Leads Pipeline</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {filteredLeads.length}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>{filteredLeads.filter(l => l.status === 'New').length} new in filtered window</span>
              </div>
            </div>

            {/* Card 2: Total Follow-Ups */}
            <div className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Follow-Ups</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {filteredFollowUps.length}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{filteredFollowUps.filter(f => f.status === 'Done').length} completed interactions</span>
              </div>
            </div>

            {/* Card 3: Converted Accounts */}
            <div className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Converted Accounts</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {filteredClients.length}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>{filteredClients.filter(c => c.status === 'Active').length} active enterprise clients</span>
              </div>
            </div>

            {/* Card 4: Active Revenue (PKR) */}
            <div className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Active Revenue (PKR)</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {formatPKR(totalRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>SaaS + One-Time + Ownership</span>
              </div>
            </div>
          </div>

          {/* Lead Lifecycle & Conversion Velocity 4-Step Funnel Card */}
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  Lead Lifecycle &amp; Conversion Velocity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  End-to-end sales funnel conversion efficiency across each pipeline progression stage.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold self-start sm:self-auto">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Net Pipeline Yield: {funnelMetrics.netConversionRate}%</span>
              </div>
            </div>

            {/* 4 Funnel Stage Cards in Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1: Inflow & Capture */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                      1. Inflow &amp; Capture
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      100% Volume
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {funnelMetrics.inflowCount} Inquiries
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total inbound &amp; ad leads captured</p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full w-full transition-all duration-500" />
                </div>
              </div>

              {/* Step 2: Active Outreach */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      2. Active Outreach
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {funnelMetrics.outreachRate}% of Inflow
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {funnelMetrics.outreachCount} In Progress
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Calls, WhatsApp decks &amp; discussions</p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, funnelMetrics.outreachRate)}%` }}
                  />
                </div>
              </div>

              {/* Step 3: Demos & Proposal */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      3. Demos &amp; Pitch
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {funnelMetrics.demoRate}% of Outreach
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {funnelMetrics.demosCount} Pitched
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Live software demos &amp; formal quotes</p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, funnelMetrics.demoRate)}%` }}
                  />
                </div>
              </div>

              {/* Step 4: Closed Won */}
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      4. Closed Won
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {funnelMetrics.closeRate}% Closing Rate
                    </span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {funnelMetrics.wonCount} Accounts
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Converted to active software contracts</p>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, funnelMetrics.closeRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SALES & CONVERSION */}
      {activeSubTab === 'sales' && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Sales Revenue by Service Line
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Financial performance, client concentration, and pipeline demand broken down per solution product for the selected filters.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Filtered Revenue:</span>
              <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                {formatPKR(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Balanced 3-Column Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 w-full">
            {services.map(srv => {
              const matchedClients = filteredClients.filter(c =>
                c.services && c.services.some(s =>
                  s.toLowerCase().includes(srv.name.toLowerCase()) ||
                  srv.name.toLowerCase().includes(s.toLowerCase())
                )
              );
              const revenue = matchedClients.reduce((sum, c) => sum + getClientRevenue(c), 0);
              const sharePercent = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
              const pipelineCount = filteredLeads.filter(l =>
                l.services && l.services.some(s =>
                  s.toLowerCase().includes(srv.name.toLowerCase()) ||
                  srv.name.toLowerCase().includes(s.toLowerCase())
                )
              ).length;

              return (
                <div
                  key={srv.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {srv.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        {sharePercent}% Share
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2.5 line-clamp-1">
                      {srv.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>

                  <div>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Revenue</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatPKR(revenue)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block">Active Clients</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {matchedClients.length} accounts
                        </span>
                      </div>
                    </div>

                    {/* Progress Share Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, sharePercent)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Pipeline Interest: <strong className="text-indigo-600 dark:text-indigo-400">{pipelineCount} leads</strong></span>
                      <span>Avg: {formatPKR(matchedClients.length > 0 ? Math.round(revenue / matchedClients.length) : srv.basePricePKR || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PRICING MODELS */}
      {activeSubTab === 'pricing' && (
        <div className="w-full space-y-4">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Commercial Pricing Model Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed financial metrics across Monthly Subscriptions, One-Time Project Fees, and Enterprise Ownership models.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl self-start sm:self-auto font-mono">
                Total Revenue: {formatPKR(totalRevenue)}
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <th className="p-3.5 min-w-[200px]">Pricing Model</th>
                    <th className="p-3.5 min-w-[240px]">Description</th>
                    <th className="p-3.5 text-center min-w-[100px]">Active Clients</th>
                    <th className="p-3.5 min-w-[150px]">Active Revenue (PKR)</th>
                    <th className="p-3.5 text-center min-w-[110px]">Pipeline Leads</th>
                    <th className="p-3.5 min-w-[130px]">Avg Deal Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {pricingModelsData.map(model => (
                    <tr key={model.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{model.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                        {model.desc}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {model.activeClients}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatPKR(model.revenuePKR)}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60">
                          {model.leadsInPipeline} leads
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {formatPKR(model.avgDealPKR)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: STAFF PERFORMANCE */}
      {activeSubTab === 'staff' && (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Sales Representative Performance &amp; Activity League
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track conversion rates, completed follow-up quotas, and generated revenue per team member.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {effectiveSelectedUser !== 'All' && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-xl">
                  Focus Mode: 1 Representative
                </span>
              )}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                {staffPerformanceData.length} Shown
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                  <th className="p-3.5 min-w-[200px]">Representative</th>
                  <th className="p-3.5 min-w-[130px]">Role / Team</th>
                  <th className="p-3.5 text-center min-w-[100px]">Leads Handled</th>
                  <th className="p-3.5 min-w-[130px]">Follow-Ups Done</th>
                  <th className="p-3.5 text-center min-w-[110px]">Conversion %</th>
                  <th className="p-3.5 min-w-[140px]">Revenue Generated</th>
                  <th className="p-3.5 min-w-[100px]">Avg Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {staffPerformanceData.map((st, idx) => {
                  const roleStyle = getRoleBadgeStyle(st.role);

                  return (
                    <tr
                      key={st.userId}
                      className={`transition-colors ${
                        st.isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-l-indigo-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {st.avatar ? (
                              <img
                                src={st.avatar}
                                alt={st.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                                {st.name.charAt(0)}
                              </div>
                            )}
                            {idx < 3 && effectiveSelectedUser === 'All' && (
                              <span className="absolute -top-1 -right-1 text-[10px]">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {st.name}
                              </p>
                              {st.isSelected && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{st.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleStyle.badge}`}>
                          {st.role}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{st.teamName}</p>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {st.leadsCount}
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <span>{st.followUpsDone} / {st.followUpsCount}</span>
                            <span className="text-slate-400 text-[10px]">{st.followUpRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.max(4, st.followUpRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          st.conversionRate >= 20
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : st.conversionRate > 0
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {st.conversionRate}%
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatPKR(st.revenuePKR)}
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {st.avgResponse}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

