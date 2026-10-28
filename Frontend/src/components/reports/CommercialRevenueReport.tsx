import React from 'react';
import {
  DollarSign,
  Layers,
  TrendingUp,
  CheckCircle2,
  Briefcase,
  PieChart
} from 'lucide-react';
import { Client, Lead, PricingModelItem } from '../../types';
import { formatPKR, parseAmount, getClientRevenue } from '../../utils/formatters';
import { DataTableScrollFrame } from '../ui';

interface CommercialRevenueReportProps {
  clients: Client[];
  leads: Lead[];
  pricingModels?: PricingModelItem[];
}

export const CommercialRevenueReport: React.FC<CommercialRevenueReportProps> = ({
  clients,
  leads
}) => {
  const totalRevenue = clients.reduce((sum, c) => sum + getClientRevenue(c), 0);
  const totalPipelineValue = leads.reduce((sum, l) => sum + parseAmount(l.value), 0);
  const activeClientsCount = clients.filter(c => c.status === 'Active' || !c.status).length;
  const avgDealSize = clients.length > 0 ? Math.round(totalRevenue / clients.length) : 0;

  // Canonical Pricing Models Breakdown based on real client data
  const modelDefinitions = [
    {
      id: 'saas',
      name: 'Monthly Subscription (SaaS)',
      matchKeys: ['monthly', 'subscription', 'saas'],
      description: 'Recurring monthly licensing, cloud backups, and ongoing support'
    },
    {
      id: 'onetime',
      name: 'One-Time Project Model',
      matchKeys: ['one-time', 'project', 'turnkey'],
      description: 'Milestone-based custom development & hardware POS deployment'
    },
    {
      id: 'ownership',
      name: 'Ownership Model',
      matchKeys: ['ownership', 'perpetual', 'license'],
      description: 'Full perpetual software source code license on private servers'
    },
    {
      id: 'hybrid',
      name: 'Custom Quotation / Hybrid',
      matchKeys: ['hybrid', 'custom', 'quotation'],
      description: 'Tailored enterprise contract combining setup fee with SLA retainers'
    }
  ];

  const breakdown = modelDefinitions.map(def => {
    const matchedClients = clients.filter(c => {
      const pm = (c.pricingModel || '').toLowerCase();
      return def.matchKeys.some(k => pm.includes(k));
    });

    const revenue = matchedClients.reduce((sum, c) => sum + getClientRevenue(c), 0);
    const avgDeal = matchedClients.length > 0 ? Math.round(revenue / matchedClients.length) : 0;
    const shareOfRev = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;

    // Open pipeline leads interested in this model
    const matchedLeads = leads.filter(l => {
      const pm = (l.pricingModel || '').toLowerCase();
      const srv = (l.services || []).join(' ').toLowerCase();
      return def.matchKeys.some(k => pm.includes(k) || srv.includes(k));
    });

    const pipelineVal = matchedLeads.reduce((sum, l) => sum + parseAmount(l.value), 0);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      clientCount: matchedClients.length,
      revenue,
      shareOfRev,
      avgDeal,
      leadsCount: matchedLeads.length,
      pipelineVal
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Client Revenue</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatPKR(totalRevenue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Realized contract revenue</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Client Accounts</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {activeClientsCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Paying
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Generating active billings</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mean Deal Valuation</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 truncate">
              {formatPKR(avgDealSize)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Average closed contract size</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Pipeline Capital</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
              {formatPKR(totalPipelineValue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total active deal volume in stage</p>
        </div>
      </div>

      {/* 2. Pricing Models Breakdown Grid */}
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
                <th className="p-3.5 min-w-[150px] text-right">Realized Revenue</th>
                <th className="p-3.5 min-w-[120px] text-right">Revenue Share</th>
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
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {b.clientCount}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
                  <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
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
