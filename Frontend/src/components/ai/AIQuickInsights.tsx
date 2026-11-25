import React from 'react';
import { formatPKR } from '../../utils/formatters';
import { TrendingUp, AlertTriangle, Clock, Layers } from 'lucide-react';

interface AIQuickInsightsProps {
  totalPipelineValuePKR: number;
  activeLeadsCount: number;
  urgentLeadsCount: number;
  overdueFollowUpsCount: number;
  scopeLabel: string;
}

export const AIQuickInsights: React.FC<AIQuickInsightsProps> = ({
  totalPipelineValuePKR,
  activeLeadsCount,
  urgentLeadsCount,
  overdueFollowUpsCount,
  scopeLabel
}) => {
  return (
    <div className="bg-slate-50/80 dark:bg-slate-850/60 rounded-xl p-3 border border-[#E5EAF1] dark:border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-[#2563EB]" />
          <span>CRM Quick Insights</span>
        </span>
        <span className="text-[9px] font-medium text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
          Deterministic ({scopeLabel})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Metric 1: Pipeline Value */}
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Active Pipeline</span>
          </div>
          <p className="font-medium font-mono text-[12px] text-[#0F172A] dark:text-white mt-0.5 truncate">
            {formatPKR(totalPipelineValuePKR)}
          </p>
        </div>

        {/* Metric 2: Active Leads */}
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <Layers className="w-3 h-3 text-[#2563EB]" />
            <span>Active Leads</span>
          </div>
          <p className="font-medium text-[12px] text-[#0F172A] dark:text-white mt-0.5">
            {activeLeadsCount} <span className="text-[10px] font-normal text-slate-400">leads</span>
          </p>
        </div>

        {/* Metric 3: Urgent Leads */}
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Urgent / High</span>
          </div>
          <p className="font-medium text-[12px] text-amber-700 dark:text-amber-300 mt-0.5">
            {urgentLeadsCount} <span className="text-[10px] font-normal text-slate-400">priority</span>
          </p>
        </div>

        {/* Metric 4: Missed / Overdue Follow-ups */}
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <Clock className="w-3 h-3" />
            <span>Overdue Follow-ups</span>
          </div>
          <p className="font-medium text-[12px] text-rose-700 dark:text-rose-300 mt-0.5">
            {overdueFollowUpsCount} <span className="text-[10px] font-normal text-slate-400">missed</span>
          </p>
        </div>
      </div>
    </div>
  );
};
