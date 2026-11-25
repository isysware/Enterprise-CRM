import React, { useState } from 'react';
import {
  Layers,
  Megaphone,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Lead, Client, ServiceItem } from '../../types';
import { formatPKR, parseAmount } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface SourceServiceReportProps {
  leads: Lead[];
  clients: Client[];
  sources: string[];
  services: ServiceItem[];
}

export const SourceServiceReport: React.FC<SourceServiceReportProps> = ({
  leads,
  clients,
  sources,
  services
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'services'>('sources');

  const totalLeads = leads.length;

  // 1. LEAD SOURCE PERFORMANCE DATA
  const allSources = Array.from(
    new Set([
      ...sources,
      ...leads.map(l => l.source).filter(Boolean)
    ])
  );

  const sourceData = allSources.map(src => {
    const matchedLeads = leads.filter(l => l.source === src);
    const converted = matchedLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
    const value = matchedLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
    const conversionRate = matchedLeads.length > 0 ? Math.round((converted / matchedLeads.length) * 100) : 0;
    const shareOfLeads = totalLeads > 0 ? Math.round((matchedLeads.length / totalLeads) * 100) : 0;

    return {
      source: src,
      leadCount: matchedLeads.length,
      convertedCount: converted,
      conversionRate,
      pipelineValue: value,
      shareOfLeads
    };
  }).sort((a, b) => b.leadCount - a.leadCount);

  // 2. SERVICE PERFORMANCE DATA
  const allServiceNames = Array.from(
    new Set([
      ...services.map(s => s.name),
      ...leads.flatMap(l => l.services || []).filter(Boolean)
    ])
  );

  const serviceData = allServiceNames.map(srvName => {
    const matchedLeads = leads.filter(l => (l.services || []).includes(srvName));
    const converted = matchedLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
    const value = matchedLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);
    const conversionRate = matchedLeads.length > 0 ? Math.round((converted / matchedLeads.length) * 100) : 0;

    return {
      service: srvName,
      leadCount: matchedLeads.length,
      convertedCount: converted,
      conversionRate,
      pipelineValue: value
    };
  }).sort((a, b) => b.leadCount - a.leadCount);

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF1] dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sources'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Lead Acquisition Sources ({sourceData.length})
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Service &amp; Product Solutions ({serviceData.length})
        </button>
      </div>

      {/* 1. SOURCES VIEW */}
      {activeTab === 'sources' && (
        <div className="space-y-5">
          {/* Top Sources Mini Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sourceData.slice(0, 5).map(sd => (
              <div
                key={sd.source}
                className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {sd.source}
                  </span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {sd.shareOfLeads}%
                  </span>
                </div>
                <p className="text-2xl font-medium text-slate-900 dark:text-white mt-1.5">
                  {sd.leadCount}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span>Win: {sd.conversionRate}%</span>
                  <span className="font-mono">{formatPKR(sd.pipelineValue)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Full Sources Table */}
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Lead Source Performance Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acquisition channels, lead volumes, conversion yields, and total generated pipeline
              </p>
            </div>

            <DataTableScrollFrame>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3.5 min-w-[180px]">Lead Source</th>
                    <th className="p-3.5 min-w-[120px] text-right">Leads Count</th>
                    <th className="p-3.5 min-w-[120px] text-right">Share of Leads</th>
                    <th className="p-3.5 min-w-[120px] text-right">Converted</th>
                    <th className="p-3.5 min-w-[120px] text-right">Conversion Rate</th>
                    <th className="p-3.5 min-w-[160px] text-right">Total Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sourceData.map(sd => (
                    <tr key={sd.source} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {sd.source}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {sd.leadCount}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {sd.shareOfLeads}%
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {sd.convertedCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {sd.conversionRate}%
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {formatPKR(sd.pipelineValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableScrollFrame>
          </div>
        </div>
      )}

      {/* 2. SERVICES VIEW */}
      {activeTab === 'services' && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Service &amp; Solution Demand Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Service inquiries, conversion success, and overall commercial pipeline value
            </p>
          </div>

          <DataTableScrollFrame>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 min-w-[200px]">Service Offering</th>
                  <th className="p-3.5 min-w-[120px] text-right">Inquiries / Leads</th>
                  <th className="p-3.5 min-w-[120px] text-right">Converted</th>
                  <th className="p-3.5 min-w-[120px] text-right">Win Rate</th>
                  <th className="p-3.5 min-w-[160px] text-right">Total Deal Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {serviceData.map(sd => (
                  <tr key={sd.service} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {sd.service}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {sd.leadCount}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {sd.convertedCount}
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                      {sd.conversionRate}%
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {formatPKR(sd.pipelineValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableScrollFrame>
        </div>
      )}
    </div>
  );
};
