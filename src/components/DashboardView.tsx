import React from 'react';
import { useCRM } from '../context/CRMContext';
import {
  Users,
  Flame,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Sparkles,
  Clock,
  MessageCircle,
  Phone,
  ArrowRight,
  TrendingUp,
  Award,
  Filter
} from 'lucide-react';
import { formatDateTime, getWhatsAppUrl, getRoleBadgeStyle, getStatusBadgeStyle } from '../utils/formatters';

interface DashboardViewProps {
  onNavigateToLeads: (statusFilter?: string) => void;
  onNavigateToFollowUps: (tab?: string) => void;
  onOpenLeadDetail: (leadId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToLeads,
  onNavigateToFollowUps,
  onOpenLeadDetail
}) => {
  const { currentUser, metrics, scopedFollowUps, completeFollowUp, activityLogs } = useCRM();

  if (!currentUser) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUpsList = scopedFollowUps.filter(
    f => f.scheduledDate === todayStr && f.status === 'Pending'
  );

  // 9 Metric Cards specifications
  const metricCards = [
    {
      id: 'total-leads',
      label: 'Total Leads',
      value: metrics.totalLeads,
      icon: Users,
      color: 'indigo',
      border: 'border-indigo-200 dark:border-indigo-800/80',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      onClick: () => onNavigateToLeads('All')
    },
    {
      id: 'hot-leads',
      label: 'Hot Leads',
      value: metrics.hotLeads,
      icon: Flame,
      color: 'rose',
      border: 'border-rose-200 dark:border-rose-800/80',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      text: 'text-rose-600 dark:text-rose-400',
      onClick: () => onNavigateToLeads('All')
    },
    {
      id: 'converted',
      label: 'Converted',
      value: metrics.convertedLeads,
      icon: CheckCircle2,
      color: 'emerald',
      border: 'border-emerald-200 dark:border-emerald-800/80',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => onNavigateToLeads('Converted')
    },
    {
      id: 'lost',
      label: 'Lost',
      value: metrics.lostLeads,
      icon: XCircle,
      color: 'slate',
      border: 'border-slate-200 dark:border-slate-800/80',
      bg: 'bg-slate-50 dark:bg-slate-900/40',
      text: 'text-slate-600 dark:text-slate-400',
      onClick: () => onNavigateToLeads('Lost')
    },
    {
      id: 'today-followups',
      label: 'Today Follow-Ups',
      value: metrics.todayFollowUps,
      icon: Calendar,
      color: 'amber',
      border: 'border-amber-200 dark:border-amber-800/80',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      text: 'text-amber-600 dark:text-amber-400',
      isHighlight: metrics.todayFollowUps > 0,
      onClick: () => onNavigateToFollowUps('today')
    },
    {
      id: 'missed',
      label: 'Missed',
      value: metrics.missedFollowUps,
      icon: AlertTriangle,
      color: 'red',
      border: 'border-red-200 dark:border-red-800/80',
      bg: 'bg-red-50/50 dark:bg-red-950/20',
      text: 'text-red-600 dark:text-red-400',
      isHighlight: metrics.missedFollowUps > 0,
      onClick: () => onNavigateToFollowUps('missed')
    },
    {
      id: 'new-leads',
      label: 'New Leads',
      value: metrics.newLeads,
      icon: Sparkles,
      color: 'sky',
      border: 'border-sky-200 dark:border-sky-800/80',
      bg: 'bg-sky-50/50 dark:bg-sky-950/20',
      text: 'text-sky-600 dark:text-sky-400',
      onClick: () => onNavigateToLeads('New')
    },
    {
      id: 'stale-leads',
      label: 'Stale Leads',
      value: metrics.staleLeads,
      icon: Clock,
      color: 'orange',
      border: 'border-orange-200 dark:border-orange-800/80',
      bg: 'bg-orange-50/50 dark:bg-orange-950/20',
      text: 'text-orange-600 dark:text-orange-400',
      onClick: () => onNavigateToLeads('All')
    },
    {
      id: 'pending-followups',
      label: 'Pending Follow-Ups',
      value: metrics.pendingFollowUps,
      icon: TrendingUp,
      color: 'purple',
      border: 'border-purple-200 dark:border-purple-800/80',
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      text: 'text-purple-600 dark:text-purple-400',
      onClick: () => onNavigateToFollowUps('upcoming')
    }
  ];

  // Pipeline Status Bars
  const pipelineStatuses = [
    { label: 'New', count: metrics.statusBreakdown['New'] || 0, color: 'bg-sky-500', statusKey: 'New' },
    { label: 'Returned', count: metrics.statusBreakdown['Returned'] || 0, color: 'bg-orange-500', statusKey: 'Returned' },
    { label: 'Cold', count: metrics.statusBreakdown['Cold'] || 0, color: 'bg-cyan-500', statusKey: 'Cold' },
    { label: 'Contacted', count: metrics.statusBreakdown['Contacted'] || 0, color: 'bg-blue-500', statusKey: 'Contacted' },
    { label: 'Follow-Up Required', count: metrics.statusBreakdown['Follow-Up Required'] || 0, color: 'bg-amber-500', statusKey: 'Follow-Up Required' },
    { label: 'Hold', count: metrics.statusBreakdown['Hold'] || 0, color: 'bg-slate-500', statusKey: 'Hold' }
  ];

  // Quality bars
  const totalQuality = (metrics.qualityBreakdown['Good'] || 0) + (metrics.qualityBreakdown['Average'] || 0) + (metrics.qualityBreakdown['Poor'] || 0) || 1;
  const goodPercent = Math.round(((metrics.qualityBreakdown['Good'] || 0) / totalQuality) * 100);
  const avgPercent = Math.round(((metrics.qualityBreakdown['Average'] || 0) / totalQuality) * 100);

  const roleStyle = getRoleBadgeStyle(currentUser.role);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Welcome & Portal Context */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard Overview
            </h1>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleStyle.badge}`}>
              {currentUser.role} Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.name}</span>. Here is your enterprise pipeline status and today&apos;s actionable follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToLeads()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Leads</span>
          </button>
          <button
            onClick={() => onNavigateToFollowUps('today')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Today&apos;s Follow-Ups ({metrics.todayFollowUps})</span>
          </button>
        </div>
      </div>

      {/* 9 Status Metric Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Lead Status &amp; Performance KPIs
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click any metric to view scoped records
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-3 sm:gap-3.5">
          {metricCards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={card.onClick}
                className={`text-left p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${card.border} ${card.bg} ${
                  card.isHighlight ? 'ring-2 ring-amber-400/40' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight">
                    {card.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.text} bg-white/80 dark:bg-slate-800/80`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className={`text-2xl font-black tracking-tight ${card.text}`}>
                    {card.value}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Pipeline & Lead Quality vs Today's Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Pipeline Distribution & Quality */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Pipeline Progress Bars */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lead Status Pipeline
                </h3>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {metrics.totalLeads} Active Leads
              </span>
            </div>

            <div className="space-y-3.5">
              {pipelineStatuses.map(pipe => {
                const total = metrics.totalLeads || 1;
                const percentage = Math.round((pipe.count / total) * 100);
                const badgeInfo = getStatusBadgeStyle(pipe.statusKey as any);

                return (
                  <div
                    key={pipe.label}
                    onClick={() => onNavigateToLeads(pipe.statusKey)}
                    className="group cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${pipe.color}`} />
                        <span className="text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {pipe.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-bold">
                          {pipe.count}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono w-8 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pipe.color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, pipe.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead Quality Progress Bars */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lead Quality Breakdown
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                AI &amp; Manual Triage
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Average Quality */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Average Quality
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {metrics.qualityBreakdown['Average'] || 40}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded-full"
                    style={{ width: `${avgPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Standard inquiries needing discovery</p>
              </div>

              {/* Good Quality */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Good Quality ⭐
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {metrics.qualityBreakdown['Good'] || 4}
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${goodPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                  High-intent salon owners &amp; urgent budgets
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Actionable Today Follow-Ups & Recent Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Follow-Ups (Actionable List) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Today&apos;s Follow-Ups ({todayFollowUpsList.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateToFollowUps('today')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {todayFollowUpsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up for today!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No pending follow-up calls due right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayFollowUpsList.map(fu => {
                    const waUrl = getWhatsAppUrl(fu.phone, fu.clientName, fu.clientBusiness);

                    return (
                      <div
                        key={fu.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              onClick={() => fu.leadId && onOpenLeadDetail(fu.leadId)}
                              className="text-left font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                              {fu.clientBusiness}
                            </button>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Contact: {fu.clientName} ({fu.scheduledTime})
                            </p>
                          </div>

                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {fu.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-1 bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[11px]">
                          {fu.notes}
                        </p>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            {/* WhatsApp Direct Link */}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>

                            {/* Phone Call Link */}
                            <a
                              href={`tel:${fu.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>Call</span>
                            </a>
                          </div>

                          {/* Complete Button */}
                          <button
                            onClick={() => completeFollowUp(fu.id, 'Follow-up executed successfully.')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Done</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={() => onNavigateToFollowUps('missed')}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Review {metrics.missedFollowUps} Missed Follow-Ups</span>
              </button>
            </div>
          </div>

          {/* Recent Activity Audit Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Activity Audit
              </h3>
              <span className="text-[11px] text-slate-500">Real-time</span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {activityLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-xs flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {log.action} • <span className="font-normal text-slate-500">{log.entityTitle}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {log.details}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
