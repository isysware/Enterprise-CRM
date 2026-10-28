import React from 'react';
import {
  CalendarCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  MessageSquare,
  Video,
  Mail,
  UserCheck
} from 'lucide-react';
import { FollowUp, Lead } from '../../types';
import { DataTableScrollFrame } from '../ui';

interface FollowUpsActivityReportProps {
  followUps: FollowUp[];
  leads: Lead[];
}

export const FollowUpsActivityReport: React.FC<FollowUpsActivityReportProps> = ({
  followUps,
  leads
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const dueToday = followUps.filter(f => f.scheduledDate === todayStr && f.status === 'Pending').length;
  const missed = followUps.filter(f =>
    f.status === 'Missed' || (f.status === 'Pending' && f.scheduledDate < todayStr)
  ).length;
  const upcoming = followUps.filter(f =>
    f.status === 'Pending' && f.scheduledDate > todayStr
  ).length;
  const completed = followUps.filter(f => f.status === 'Done').length;
  const total = followUps.length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Breakdown by follow-up type
  const types = ['Call', 'WhatsApp', 'Meeting', 'Demo', 'Email'];
  const typeBreakdown = types.map(t => {
    const matched = followUps.filter(f => (f.type || '').toLowerCase() === t.toLowerCase());
    const done = matched.filter(f => f.status === 'Done').length;
    return {
      type: t,
      total: matched.length,
      done,
      rate: matched.length > 0 ? Math.round((done / matched.length) * 100) : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Today</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{dueToday}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Immediate
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Scheduled for {todayStr}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Missed / Overdue</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{missed}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              Attention
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires urgent rescheduling</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{upcoming}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Scheduled
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Future pipeline touchpoints</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{completed}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Done
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Logged outreach interactions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{completionRate}%</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Overall
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Activity fulfillment ratio</p>
        </div>
      </div>

      {/* 2. Type Breakdown Cards */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
          Activity by Channel &amp; Type
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Distribution across Phone Calls, WhatsApp chats, Demos, and In-Person meetings
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {typeBreakdown.map(tb => (
            <div
              key={tb.type}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {tb.type}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  {tb.rate}%
                </span>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {tb.total}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {tb.done} completed
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detailed Follow-ups Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Follow-Up Activity Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {followUps.length} scoped interactions
            </p>
          </div>
        </div>

        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[180px]">Client / Lead</th>
                <th className="p-3.5 min-w-[120px]">Type</th>
                <th className="p-3.5 min-w-[140px]">Scheduled Date</th>
                <th className="p-3.5 min-w-[110px]">Time</th>
                <th className="p-3.5 min-w-[140px]">Assigned Agent</th>
                <th className="p-3.5 min-w-[120px]">Status</th>
                <th className="p-3.5 min-w-[220px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {followUps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No follow-up records found matching selected filter criteria.
                  </td>
                </tr>
              ) : (
                followUps.map(fu => {
                  const isDone = fu.status === 'Done';
                  const isOverdue = fu.status === 'Missed' || (fu.status === 'Pending' && fu.scheduledDate < todayStr);

                  return (
                    <tr key={fu.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {fu.clientName}
                        {fu.clientBusiness && (
                          <p className="text-[11px] font-normal text-slate-500">{fu.clientBusiness}</p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {fu.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {fu.scheduledDate}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {fu.scheduledTime || '-'}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {fu.assignedToName || 'Assigned Agent'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : isOverdue
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`} />
                          {isOverdue ? 'Overdue' : fu.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                        {fu.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </div>
    </div>
  );
};
