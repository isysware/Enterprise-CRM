import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { Client } from '../types';
import {
  Briefcase,
  Plus,
  Search,
  Building2,
  DollarSign,
  Calendar,
  MessageCircle,
  Phone,
  Layers,
  CheckCircle2,
  RotateCcw,
  Eye,
  Filter,
  Users,
  Tag,
  Clock,
  X,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { formatPKR, formatDate, getWhatsAppUrl, getClientRevenue } from '../utils/formatters';
import { DataTableScrollFrame, EmptyState, ModalShell, Button, ConfirmDialog } from './ui';

interface ClientsViewProps {
  onOpenNewClientModal: () => void;
  onOpenLeadDetail?: (leadId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onOpenNewClientModal,
  onOpenLeadDetail
}) => {
  const {
    clients,
    scopedClients,
    scopedUsers,
    scopedTeams,
    services,
    sources,
    returnClientToLead,
    currentUser,
    pricingModels,
    settings
  } = useCRM();

  const clientList = scopedClients || clients;
  const baseUsers = scopedUsers;
  const baseTeams = scopedTeams;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [pricingModelFilter, setPricingModelFilter] = useState('All');

  // Client Details Modal
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [returnConfirmClient, setReturnConfirmClient] = useState<Client | null>(null);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clientList.filter(c => {
      // Search: Name, phone, email, business, service
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBiz = (c.businessName || '').toLowerCase().includes(q);
        const matchContact = (c.clientName || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const matchSrv = (c.services || []).some(s => s.toLowerCase().includes(q));
        if (!matchBiz && !matchContact && !matchPhone && !matchEmail && !matchSrv) return false;
      }

      // Status
      if (statusFilter !== 'All') {
        const clientStatus = c.status || 'Active';
        if (clientStatus !== statusFilter) return false;
      }

      // Service
      if (serviceFilter !== 'All') {
        if (!c.services || !c.services.some(s => s.toLowerCase().includes(serviceFilter.toLowerCase()))) {
          return false;
        }
      }

      // User / Owner
      if (userFilter !== 'All') {
        const isMatch =
          c.assignedToId === userFilter ||
          c.assignedToName === userFilter ||
          c.generatedById === userFilter ||
          c.closedById === userFilter;
        if (!isMatch) return false;
      }

      // Team
      if (teamFilter !== 'All') {
        const rep = baseUsers.find(u => u.id === c.assignedToId || u.name === c.assignedToName);
        if (rep && rep.teamId !== teamFilter) return false;
      }

      // Origin Source
      if (sourceFilter !== 'All') {
        if (c.source !== sourceFilter) return false;
      }

      // Pricing Model
      if (pricingModelFilter !== 'All') {
        const pm = (c.pricingModel || '').toLowerCase();
        if (!pm.includes(pricingModelFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [clientList, searchQuery, statusFilter, serviceFilter, userFilter, teamFilter, sourceFilter, pricingModelFilter, baseUsers]);

  // Derived real metrics
  const totalClientsCount = clientList.length;
  const activeClientsCount = clientList.filter(c => c.status === 'Active' || !c.status).length;
  const totalClientRevenue = clientList.reduce((sum, c) => sum + getClientRevenue(c), 0);
  const avgClientValue = totalClientsCount > 0 ? Math.round(totalClientRevenue / totalClientsCount) : 0;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'All' ||
    serviceFilter !== 'All' ||
    userFilter !== 'All' ||
    teamFilter !== 'All' ||
    sourceFilter !== 'All' ||
    pricingModelFilter !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setServiceFilter('All');
    setUserFilter('All');
    setTeamFilter('All');
    setSourceFilter('All');
    setPricingModelFilter('All');
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium text-[#0F172A] dark:text-white tracking-tight">
            Clients
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Manage converted customer accounts and ongoing commercial relationships.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewClientModal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* 2. Real Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Clients */}
        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Total Clients
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300">
              Accounts
            </span>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight">
              {totalClientsCount}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              All closed &amp; converted customer records
            </p>
          </div>
        </div>

        {/* Active Clients */}
        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Active Accounts
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <div>
            <div className="text-2xl font-medium text-emerald-600 dark:text-emerald-400 leading-none tracking-tight">
              {activeClientsCount}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              Currently active commercial partnerships
            </p>
          </div>
        </div>

        {/* Total Client Value */}
        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Total Client Value
            </span>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight truncate">
              {formatPKR(totalClientRevenue)}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              Realized contract &amp; active revenue
            </p>
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              Average Client Value
            </span>
          </div>
          <div>
            <div className="text-2xl font-medium text-[#2563EB] dark:text-blue-400 leading-none tracking-tight truncate">
              {formatPKR(avgClientValue)}
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
              Mean closed client contract yield
            </p>
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Filter Accounts
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Search Client
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Business, contact, phone, email..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Service
            </label>
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Services</option>
              {services.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rep / Owner */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Account Rep
            </label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">
                {currentUser?.role === 'Employee' ? 'My Accounts' : 'All Staff'}
              </option>
              {baseUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Model */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-1">
              Pricing Model
            </label>
            <select
              value={pricingModelFilter}
              onChange={e => setPricingModelFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Models</option>
              <option value="SaaS">SaaS / Subscription</option>
              <option value="One-Time">One-Time Project</option>
              <option value="Ownership">Perpetual Ownership</option>
              <option value="Hybrid">Custom / Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Client Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[220px]">Client / Business</th>
                <th className="p-3.5 min-w-[160px]">Service</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
                <th className="p-3.5 min-w-[140px]">Account Rep</th>
                <th className="p-3.5 min-w-[140px]">Pricing Model</th>
                <th className="p-3.5 min-w-[120px] text-right">Contract Value</th>
                <th className="p-3.5 min-w-[110px]">Origin</th>
                <th className="p-3.5 min-w-[120px]">Converted</th>
                <th className="p-3.5 min-w-[160px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    {clientList.length === 0 ? (
                      <EmptyState
                        title="No Converted Clients"
                        description="You do not have any converted customer accounts yet. When a lead is converted, it appears here."
                        actionLabel="Add Client"
                        onAction={onOpenNewClientModal}
                      />
                    ) : (
                      <EmptyState
                        title="No Matching Clients"
                        description="No customer accounts match your active search and filter criteria."
                        actionLabel="Clear Filters"
                        onAction={handleResetFilters}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const waUrl = getWhatsAppUrl(client.phone, client.clientName, client.businessName);
                  const clientValue = getClientRevenue(client);
                  const isClientActive = client.status === 'Active' || !client.status;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Company & Primary Contact */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200 dark:border-blue-900">
                            {(client.businessName || client.clientName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                              {client.businessName || client.clientName}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                              <span>{client.clientName}</span>
                              <span>•</span>
                              <span className="font-mono">{client.phone}</span>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="text-emerald-600 hover:text-emerald-700 inline-flex items-center ml-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Services */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {client.services && client.services.length > 0 ? (
                            client.services.map(srv => (
                              <span
                                key={srv}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[160px]"
                              >
                                {srv}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">Standard Service</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isClientActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isClientActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{isClientActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Account Rep / Owner */}
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {client.assignedToName || 'Unassigned'}
                        </span>
                      </td>

                      {/* Pricing Model */}
                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {client.pricingModel || 'Subscription'}
                        </span>
                      </td>

                      {/* Contract Value */}
                      <td className="p-3.5 text-right font-mono font-medium text-[#0F172A] dark:text-white text-xs">
                        {formatPKR(clientValue)}
                      </td>

                      {/* Origin Source */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        {client.source || 'Direct'}
                      </td>

                      {/* Converted Date */}
                      <td className="p-3.5 font-mono text-[#64748B] dark:text-slate-400 text-[11px]">
                        {formatDate(client.convertedDate || client.startDate || '')}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedClientDetail(client)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          {client.leadId && onOpenLeadDetail && (
                            <button
                              type="button"
                              onClick={() => onOpenLeadDetail(client.leadId!)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 hover:bg-blue-100 font-semibold text-[11px] transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                            >
                              Lead
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setReturnConfirmClient(client)}
                            title="Reverse conversion back to active lead pipeline"
                            className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold text-[11px] transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </div>

      {/* 5. Client Details Modal */}
      <ModalShell
        isOpen={!!selectedClientDetail}
        onClose={() => setSelectedClientDetail(null)}
        size="lg"
        title={selectedClientDetail?.businessName || selectedClientDetail?.clientName}
        subtitle={selectedClientDetail ? `ID: ${selectedClientDetail.id} • Converted: ${formatDate(selectedClientDetail.convertedDate || selectedClientDetail.startDate || '')}` : undefined}
        icon={<Building2 className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex justify-end w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedClientDetail(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedClientDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-[#E5EAF1] dark:border-slate-800">
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 block font-bold uppercase tracking-wider">
                  Contact Person
                </span>
                <span className="font-semibold text-[#0F172A] dark:text-white block mt-0.5">
                  {selectedClientDetail.clientName}
                </span>
                <span className="block font-mono text-[#64748B] dark:text-slate-400 mt-0.5">
                  {selectedClientDetail.phone}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-[#E5EAF1] dark:border-slate-800">
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 block font-bold uppercase tracking-wider">
                  Pricing Model
                </span>
                <span className="font-semibold text-[#2563EB] dark:text-blue-400 block mt-0.5">
                  {selectedClientDetail.pricingModel || 'Subscription'}
                </span>
                <span className="block font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatPKR(getClientRevenue(selectedClientDetail))}
                </span>
              </div>
            </div>

            {/* Custom Field Breakdown */}
            {selectedClientDetail.customFieldValues && Object.keys(selectedClientDetail.customFieldValues).length > 0 ? (
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/40 pb-1.5">
                  <span className="text-[10px] font-bold text-[#2563EB] dark:text-blue-300 uppercase tracking-wider">
                    Commercial Fee Structure
                  </span>
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300 text-xs">
                    Total: {formatPKR(getClientRevenue(selectedClientDetail))}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(selectedClientDetail.customFieldValues).map(([k, v]) => {
                    if (v === '' || v === undefined || v === null) return null;
                    const matchedField = pricingModels?.flatMap(pm => pm.fields || []).find(f => f.key === k);
                    const label = matchedField?.label || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const isCurrency = matchedField?.type === 'currency' || typeof v === 'number';

                    return (
                      <div
                        key={k}
                        className="flex justify-between items-center py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40"
                      >
                        <span className="text-[#64748B] dark:text-slate-400 text-[11px] truncate mr-2">{label}:</span>
                        <span className="font-mono font-semibold text-[#0F172A] dark:text-slate-200 text-[11px]">
                          {isCurrency && (typeof v === 'number' || !isNaN(Number(v)))
                            ? formatPKR(Number(v || 0))
                            : String(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedClientDetail.paymentTerms && (
              <div className="text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-[#E5EAF1] dark:border-slate-800">
                <span className="font-bold text-[#0F172A] dark:text-slate-200 block mb-0.5">Payment Terms:</span>
                <span className="text-[#64748B] dark:text-slate-400">{selectedClientDetail.paymentTerms}</span>
              </div>
            )}

            {selectedClientDetail.conversionNotes && (
              <div className="text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-[#E5EAF1] dark:border-slate-800">
                <span className="font-bold text-[#0F172A] dark:text-slate-200 block mb-0.5">Conversion Remarks:</span>
                <span className="text-[#64748B] dark:text-slate-400">{selectedClientDetail.conversionNotes}</span>
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* Reverse Conversion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!returnConfirmClient}
        onClose={() => setReturnConfirmClient(null)}
        onConfirm={() => {
          if (returnConfirmClient) {
            returnClientToLead(returnConfirmClient.id);
            setReturnConfirmClient(null);
          }
        }}
        title={`Reverse conversion for "${returnConfirmClient?.businessName}"?`}
        description="Are you sure you want to reverse this client's converted status? This will restore the account back to an active lead in the sales pipeline."
        confirmLabel="Reverse & Return to Lead"
        cancelLabel="Cancel"
        variant="warning"
      />
    </div>
  );
};
