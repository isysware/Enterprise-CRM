import React from 'react';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Briefcase,
  Layers,
  DollarSign
} from 'lucide-react';
import { ReportId } from './types';

interface ReportNavigationProps {
  activeReport: ReportId;
  onSelectReport: (id: ReportId) => void;
  counts?: Partial<Record<ReportId, number>>;
}

interface NavItem {
  id: ReportId;
  label: string;
  icon: React.ElementType;
  badgeText?: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'sales-pipeline',
    label: 'Sales & Pipeline',
    icon: TrendingUp,
    description: 'Leads, stages, win rate, deal values'
  },
  {
    id: 'team-staff',
    label: 'Team & Staff Performance',
    icon: Users,
    description: 'Rep conversion, assigned leads, workload'
  },
  {
    id: 'followups-activity',
    label: 'Follow-Ups & Activity',
    icon: CalendarCheck,
    description: 'Scheduled tasks, due today, completion rate'
  },
  {
    id: 'clients-conversions',
    label: 'Clients & Conversions',
    icon: Briefcase,
    description: 'Converted accounts, acquisition source, value'
  },
  {
    id: 'source-service',
    label: 'Source & Service Performance',
    icon: Layers,
    description: 'Meta Ads, WhatsApp, website, service demand'
  },
  {
    id: 'commercial-revenue',
    label: 'Commercial & Revenue',
    icon: DollarSign,
    description: 'SaaS, project pricing, average deal size'
  }
];

export const ReportNavigation: React.FC<ReportNavigationProps> = ({
  activeReport,
  onSelectReport,
  counts
}) => {
  return (
    <>
      {/* Mobile / Tablet Horizontal Bar */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-2 shadow-xs mb-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeReport === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectReport(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Left Rail Navigation */}
      <nav
        aria-label="Reports Navigation"
        className="hidden lg:block w-72 shrink-0 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3 shadow-xs self-start sticky top-2"
      >
        <div className="px-3 py-2.5 border-b border-[#E5EAF1] dark:border-slate-800 mb-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Reports Center
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidated CRM Analytics
          </p>
        </div>

        <div className="space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeReport === item.id;
            const count = counts?.[item.id];

            return (
              <button
                key={item.id}
                onClick={() => onSelectReport(item.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-blue-900 dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.label}
                    </p>
                    {count !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold shrink-0">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
