import React from 'react';
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Client } from '../../types';
import { formatPKR, parseAmount, getClientRevenue } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface ClientsConversionsReportProps {
  clients: Client[];
}

export const ClientsConversionsReport: React.FC<ClientsConversionsReportProps> = ({ clients }) => {
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Active' || !c.status).length;
  const totalRevenue = clients.reduce((sum, c) => sum + getClientRevenue(c), 0);
  const avgDealSize = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  // Source breakdown
  const sourceMap = new Map<string, { count: number; revenue: number }>();
  clients.forEach(c => {
    const src = c.source || 'Direct';
    const rev = getClientRevenue(c);
    const existing = sourceMap.get(src) || { count: 0, revenue: 0 };
    sourceMap.set(src, {
      count: existing.count + 1,
      revenue: existing.revenue + rev
    });
  });

  const sourcesList = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    count: data.count,
    revenue: data.revenue,
    percentage: totalClients > 0 ? Math.round((data.count / totalClients) * 100) : 0
  }));

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted Clients</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalClients}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Closed Deals
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Successfully acquired accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Clients</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeClients}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Currently active accounts</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Converted Value</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatPKR(totalRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Accumulated contract revenue</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Deal Size</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 truncate">
              {formatPKR(avgDealSize)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Mean closed deal valuation</p>
        </div>
      </div>

      {/* 2. Conversion Sources Summary */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
          Client Acquisition by Origin Channel
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Where closed customers originated and revenue contribution per channel
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sourcesList.map(item => (
            <div
              key={item.source}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.source}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                    {item.percentage}%
                  </span>
                </div>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {item.count} clients
                </p>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                {formatPKR(item.revenue)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detailed Clients Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Converted Accounts Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {clients.length} scoped client records
            </p>
          </div>
        </div>

        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[200px]">Client / Business</th>
                <th className="p-3.5 min-w-[150px]">Contact Info</th>
                <th className="p-3.5 min-w-[160px]">Service Contract</th>
                <th className="p-3.5 min-w-[120px]">Origin Source</th>
                <th className="p-3.5 min-w-[150px]">Pricing Model</th>
                <th className="p-3.5 min-w-[130px] text-right">Contract Value</th>
                <th className="p-3.5 min-w-[120px]">Converted Date</th>
                <th className="p-3.5 min-w-[140px]">Account Rep</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    No converted clients match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                clients.map(client => {
                  const rev = getClientRevenue(client);
                  const isActive = client.status === 'Active' || !client.status;

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {client.businessName || client.clientName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {client.clientName}
                        </p>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <p>{client.phone}</p>
                        {client.email && <p className="text-[10px] text-slate-400">{client.email}</p>}
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {client.services && client.services.length > 0 ? (
                            client.services.slice(0, 2).map(srv => (
                              <span
                                key={srv}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {srv}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Contract Agreement</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {client.source || 'Direct'}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {client.pricingModel || 'Custom / SaaS'}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatPKR(rev)}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {client.convertedDate || client.startDate || '-'}
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                        {client.assignedToName || 'Assigned Rep'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {client.status || 'Active'}
                        </span>
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
