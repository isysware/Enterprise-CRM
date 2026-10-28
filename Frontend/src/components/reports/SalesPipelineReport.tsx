import React from 'react';
import {
  TrendingUp,
  Layers,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Lead } from '../../types';
import { formatPKR, parseAmount } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface SalesPipelineReportProps {
  leads: Lead[];
}

export const SalesPipelineReport: React.FC<SalesPipelineReportProps> = ({ leads }) => {
  // Calculations strictly from authorized filtered leads
  const totalLeads = leads.length;

  const openLeads = leads.filter(l =>
    ['New', 'Contacted', 'Follow-Up Required', 'Qualified'].includes(l.status)
  );
  const convertedLeads = leads.filter(l =>
    ['Converted', 'Won'].includes(l.status)
  );
  const lostLeads = leads.filter(l => l.status === 'Lost');

  const totalPipelineValue = leads.reduce((sum, l) => sum + parseAmount(l.value), 0);
  const openPipelineValue = openLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
  const convertedValue = convertedLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);

  const conversionRate = totalLeads > 0
    ? Math.round((convertedLeads.length / totalLeads) * 100)
    : 0;

  // Stages breakdown
  const stages: { label: string; count: number; value: number; color: string; bg: string }[] = [
    {
      label: 'New Inflow',
      count: leads.filter(l => l.status === 'New').length,
      value: leads.filter(l => l.status === 'New').reduce((sum, l) => sum + parseAmount(l.value), 0),
      color: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900'
    },
    {
      label: 'Contacted',
      count: leads.filter(l => l.status === 'Contacted').length,
      value: leads.filter(l => l.status === 'Contacted').reduce((sum, l) => sum + parseAmount(l.value), 0),
      color: 'text-indigo-700 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900'
    },
    {
      label: 'Follow-Up Required',
      count: leads.filter(l => l.status === 'Follow-Up Required').length,
      value: leads.filter(l => l.status === 'Follow-Up Required').reduce((sum, l) => sum + parseAmount(l.value), 0),
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900'
    },
    {
      label: 'Qualified',
      count: leads.filter(l => l.status === 'Qualified').length,
      value: leads.filter(l => l.status === 'Qualified').reduce((sum, l) => sum + parseAmount(l.value), 0),
      color: 'text-purple-700 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900'
    },
    {
      label: 'Converted / Won',
      count: convertedLeads.length,
      value: convertedValue,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900'
    },
    {
      label: 'Lost / Closed',
      count: lostLeads.length,
      value: lostLeads.reduce((sum, l) => sum + parseAmount(l.value), 0),
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Leads */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Leads
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {totalLeads}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              100%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Scoped portfolio volume
          </p>
        </div>

        {/* Open Pipeline */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Open Pipeline
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {openLeads.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {totalLeads > 0 ? Math.round((openLeads.length / totalLeads) * 100) : 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Active outreach &amp; qualified
          </p>
        </div>

        {/* Converted */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Converted Deals
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {convertedLeads.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Won
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Closed customer accounts
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Conversion Rate
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {conversionRate}%
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              Net
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Lead-to-client win velocity
          </p>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pipeline Value
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatPKR(totalPipelineValue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Open: {formatPKR(openPipelineValue)}
          </p>
        </div>
      </div>

      {/* 2. Pipeline Stages Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pipeline Stage Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live funnel stages, opportunity count, and volume in PKR
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map(st => (
            <div
              key={st.label}
              className={`p-3 rounded-xl border ${st.bg} flex flex-col justify-between`}
            >
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {st.label}
                </p>
                <p className={`text-xl font-extrabold mt-1 ${st.color}`}>
                  {st.count}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {formatPKR(st.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detailed Sales & Pipeline Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Sales &amp; Pipeline Data Grid
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {leads.length} scoped opportunity records
            </p>
          </div>
        </div>

        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[200px]">Lead / Business</th>
                <th className="p-3.5 min-w-[150px]">Contact Info</th>
                <th className="p-3.5 min-w-[150px]">Service</th>
                <th className="p-3.5 min-w-[120px]">Source</th>
                <th className="p-3.5 min-w-[130px]">Status</th>
                <th className="p-3.5 min-w-[100px]">Priority</th>
                <th className="p-3.5 min-w-[140px]">Assigned Rep</th>
                <th className="p-3.5 min-w-[140px]">Team</th>
                <th className="p-3.5 min-w-[130px] text-right">Lead Value</th>
                <th className="p-3.5 min-w-[110px]">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    No sales leads match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const val = parseAmount(lead.value);
                  const isWon = ['Converted', 'Won'].includes(lead.status);
                  const isLost = lead.status === 'Lost';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Business */}
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {lead.businessName || lead.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {lead.name}
                        </p>
                      </td>

                      {/* Contact */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <p>{lead.phone}</p>
                        {lead.email && <p className="text-slate-400 text-[10px]">{lead.email}</p>}
                      </td>

                      {/* Services */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {lead.services && lead.services.length > 0 ? (
                            lead.services.slice(0, 2).map(srv => (
                              <span
                                key={srv}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {srv}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">General Inquiry</span>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {lead.source || 'Direct'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isWon
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : isLost
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isWon ? 'bg-emerald-500' : isLost ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                          />
                          {lead.status}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            lead.priority === 'High' || lead.priority === 'Urgent'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : lead.priority === 'Medium'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {lead.priority || 'Medium'}
                        </span>
                      </td>

                      {/* Rep */}
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {lead.assignedToName || 'Unassigned'}
                      </td>

                      {/* Team */}
                      <td className="p-3.5 text-slate-500">
                        {lead.teamName || '-'}
                      </td>

                      {/* Value */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {val > 0 ? formatPKR(val) : '-'}
                      </td>

                      {/* Created */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {lead.createdAt ? lead.createdAt.substring(0, 10) : '-'}
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
