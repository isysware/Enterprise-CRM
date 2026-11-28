import React from 'react';
import { Client, Lead, PricingModelItem } from '../../types';
import { formatPKR, parseAmount, getClientRevenue } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface CommercialRevenueReportProps {
  clients: Client[];
  leads: Lead[];
  pricingModels?: PricingModelItem[];
  filterBar?: React.ReactNode;
}

export const CommercialRevenueReport: React.FC<CommercialRevenueReportProps> = ({
  clients,
  leads,
  pricingModels = [],
  filterBar
}) => {
  const totalRevenue = clients.reduce((sum, c) => sum + getClientRevenue(c), 0);
  const totalLeadValue = leads.reduce((sum, l) => sum + parseAmount(l.valuePKR ?? (l as any).value), 0);
  const openLeads = leads.filter(l => !['Converted', 'Won', 'Lost'].includes(l.status));
  const openPipelineValue = openLeads.reduce((sum, l) => sum + parseAmount(l.valuePKR ?? (l as any).value), 0);
  const activeClientsCount = clients.filter(c => c.status === 'Active' || !c.status).length;
  const avgDealSize = clients.length > 0 ? Math.round(totalRevenue / clients.length) : 0;

  // Assign every record to exactly one configured model, or Unassigned.
  // Never infer commercial assignments from service names, tags or notes.
  const modelDefinitions = Array.from(new Map(pricingModels.map(pm => [pm.id, {
    id: pm.id,
    name: pm.name,
    description: pm.description || 'Configured commercial pricing structure'
  }])).values());
  const configuredIds = new Set(modelDefinitions.map(pm => pm.id));
  const unassignedId = '__unassigned__';
  const resolveModelId = (record: Client | Lead): string => {
    const id = record.pricingModelId;
    return id && configuredIds.has(id) ? id : unassignedId;
  };

  const clientBuckets = new Map<string, Client[]>();
  const leadBuckets = new Map<string, Lead[]>();
  for (const client of clients) {
    const key = resolveModelId(client);
    const bucket = clientBuckets.get(key) || [];
    bucket.push(client);
    clientBuckets.set(key, bucket);
  }
  for (const lead of openLeads) {
    const key = resolveModelId(lead);
    const bucket = leadBuckets.get(key) || [];
    bucket.push(lead);
    leadBuckets.set(key, bucket);
  }

  if (clientBuckets.has(unassignedId) || leadBuckets.has(unassignedId)) {
    modelDefinitions.push({
      id: unassignedId,
      name: 'Unassigned Pricing Model',
      description: 'No valid configured pricing model reference saved'
    });
  }

  const breakdown = modelDefinitions.map(def => {
    const matchedClients = clientBuckets.get(def.id) || [];
    const matchedLeads = leadBuckets.get(def.id) || [];
    const revenue = matchedClients.reduce((sum, c) => sum + getClientRevenue(c), 0);
    return {
      ...def,
      clientCount: matchedClients.filter(c => c.status === 'Active' || !c.status).length,
      revenue,
      shareOfRev: totalRevenue > 0 ? Number(((revenue / totalRevenue) * 100).toFixed(2)) : 0,
      avgDeal: matchedClients.length > 0 ? Math.round(revenue / matchedClients.length) : 0,
      leadsCount: matchedLeads.length,
      pipelineVal: matchedLeads.reduce((sum, l) => sum + parseAmount(l.valuePKR ?? (l as any).value), 0)
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted Contract Value</span>
          <div>
            <div className="text-2xl font-medium text-slate-900 dark:text-white leading-none tracking-tight truncate">
              {formatPKR(totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">Closed contract value</p>
          </div>
        </div>

        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Clients</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <div>
            <div className="text-2xl font-medium text-emerald-600 dark:text-emerald-400 leading-none tracking-tight">
              {activeClientsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">Currently active accounts</p>
          </div>
        </div>

        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mean Deal Valuation</span>
          <div>
            <div className="text-2xl font-medium text-blue-600 dark:text-blue-400 leading-none tracking-tight truncate">
              {formatPKR(avgDealSize)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">Average closed contract size</p>
          </div>
        </div>

        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Pipeline Capital</span>
          <div>
            <div className="text-2xl font-medium text-indigo-600 dark:text-indigo-400 leading-none tracking-tight truncate">
              {formatPKR(openPipelineValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">Total Lead Value: {formatPKR(totalLeadValue)}</p>
          </div>
        </div>
      </div>

      {/* 2. Global Filter Bar (Filters BELOW Cards) */}
      {filterBar}

      {/* 3. Pricing Models Breakdown Grid */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF1] dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Commercial Pricing Model Performance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active subscriptions, one-time software deliveries, perpetual ownership, and hybrid enterprise contracts
          </p>
        </div>

        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[220px]">Pricing Model Structure</th>
                <th className="p-3.5 min-w-[120px] text-right">Active Accounts</th>
                <th className="p-3.5 min-w-[150px] text-right">Contract Value</th>
                <th className="p-3.5 min-w-[120px] text-right">Contract Value Share</th>
                <th className="p-3.5 min-w-[140px] text-right">Avg Contract Size</th>
                <th className="p-3.5 min-w-[120px] text-right">Leads in Pipeline</th>
                <th className="p-3.5 min-w-[150px] text-right">Pipeline Capital</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {breakdown.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{b.description}</p>
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                    {b.clientCount}
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {formatPKR(b.revenue)}
                  </td>
                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {b.shareOfRev}%
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatPKR(b.avgDeal)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    {b.leadsCount}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatPKR(b.pipelineVal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </div>
    </div>
  );
};
