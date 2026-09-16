import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { Lead, LeadStatus, Priority, LeadSource, LeadQuality } from '../types';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Eye,
  Edit2,
  UserCheck,
  Trash2,
  MessageCircle,
  Phone,
  Calendar,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  LayoutList,
  Columns3,
  ArrowRight,
  MoreVertical,
  Clock,
  Sparkles,
  FileSignature
} from 'lucide-react';
import {
  formatPKR,
  formatDate,
  getWhatsAppUrl,
  getStatusBadgeStyle,
  getPriorityBadge,
  getQualityBadge
} from '../utils/formatters';

interface LeadsViewProps {
  onOpenNewLeadModal: () => void;
  onOpenImportModal: () => void;
  onOpenEditLeadModal: (lead: Lead) => void;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenReassignModal: (lead: Lead) => void;
  onOpenConvertModal?: (leadId: string) => void;
  onOpenProposalModal?: (lead: Lead) => void;
}

const KANBAN_STAGES: { status: LeadStatus; label: string; dotColor: string; bgLight: string; bgDark: string }[] = [
  { status: 'New', label: 'New Inquiries', dotColor: 'bg-indigo-500', bgLight: 'bg-indigo-50/40', bgDark: 'dark:bg-indigo-950/20' },
  { status: 'Contacted', label: 'Contacted', dotColor: 'bg-blue-500', bgLight: 'bg-blue-50/40', bgDark: 'dark:bg-blue-950/20' },
  { status: 'Follow-Up Required', label: 'Follow-Up Required', dotColor: 'bg-amber-500', bgLight: 'bg-amber-50/40', bgDark: 'dark:bg-amber-950/20' },
  { status: 'Hold', label: 'On Hold', dotColor: 'bg-purple-500', bgLight: 'bg-purple-50/40', bgDark: 'dark:bg-purple-950/20' },
  { status: 'Cold', label: 'Cold / Inactive', dotColor: 'bg-slate-400', bgLight: 'bg-slate-50/40', bgDark: 'dark:bg-slate-900/40' },
  { status: 'Returned', label: 'Returned', dotColor: 'bg-rose-400', bgLight: 'bg-rose-50/40', bgDark: 'dark:bg-rose-950/20' },
  { status: 'Converted', label: 'Converted Deals', dotColor: 'bg-emerald-500', bgLight: 'bg-emerald-50/40', bgDark: 'dark:bg-emerald-950/20' },
  { status: 'Lost', label: 'Lost Inquiries', dotColor: 'bg-zinc-500', bgLight: 'bg-zinc-50/40', bgDark: 'dark:bg-zinc-900/40' }
];

export const LeadsView: React.FC<LeadsViewProps> = ({
  onOpenNewLeadModal,
  onOpenImportModal,
  onOpenEditLeadModal,
  onOpenLeadDetail,
  onOpenReassignModal,
  onOpenConvertModal,
  onOpenProposalModal
}) => {
  const {
    filteredLeads,
    filterState,
    setFilterState,
    users,
    scopedUsers,
    teams,
    scopedTeams,
    services,
    sources,
    deleteLead,
    canEditLeadItem,
    canDeleteLeadItem,
    canReassignLeadItem,
    canCreateLeads,
    canBulkImportExport,
    canGenerateProposals,
    changeLeadStatus,
    currentUser
  } = useCRM();

  const availableUsers = scopedUsers;
  const availableTeams = scopedTeams;

  // Dual View Mode: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Local state for temporary filter inputs before clicking Apply
  const [localFilters, setLocalFilters] = useState(filterState);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>('Contacted');
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Synchronize localFilters when global filterState resets (e.g. after user switch)
  useEffect(() => {
    setLocalFilters(filterState);
  }, [filterState]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterState(localFilters);
  };

  const handleResetFilter = () => {
    const resetValues = {
      search: '',
      status: 'All' as const,
      assignedToId: 'All',
      teamId: 'All',
      service: 'All',
      source: 'All' as const,
      fromDate: '',
      toDate: '',
      quality: 'All' as const,
      priority: 'All' as const
    };
    setLocalFilters(resetValues);
    setFilterState(resetValues);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedLeadIds(prev => [...prev, id]);
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedLeadIds.length === 0) return;
    selectedLeadIds.forEach(id => {
      changeLeadStatus(id, bulkStatus);
    });
    setSelectedLeadIds([]);
  };

  const exportCSV = () => {
    const headers = [
      'Business Name',
      'Client Name',
      'Phone',
      'Email',
      'City',
      'Services',
      'Value PKR',
      'Status',
      'Priority',
      'Quality',
      'Source',
      'Assigned To',
      'Created Date',
      'Next Follow Up'
    ];
    const rows = filteredLeads.map(l => [
      `"${l.businessName.replace(/"/g, '""')}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      `"${l.city}"`,
      `"${l.services.join('; ')}"`,
      l.valuePKR,
      l.status,
      l.priority,
      l.quality,
      l.source,
      `"${l.assignedToName}"`,
      l.createdAt.split('T')[0],
      l.nextFollowUpDate || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CRM_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusOptions: (LeadStatus | 'All')[] = [
    'All',
    'New',
    'Follow-Up Required',
    'Contacted',
    'Hold',
    'Cold',
    'Returned',
    'Converted',
    'Lost'
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header Controls with Dual View Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lead Management
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {filteredLeads.length} Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage inquiries, assign representatives, trigger direct WhatsApp outreach, and monitor stage progression.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Dual View Toggle Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Pipeline View</span>
            </button>
          </div>

          {canBulkImportExport && (
            <>
              <button
                onClick={onOpenImportModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {canCreateLeads && (
            <button
              onClick={onOpenNewLeadModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Filter Leads Pipeline
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
            >
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {/* Search */}
          <div className="xl:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={localFilters.search}
                onChange={e => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Client, Salon, Phone, City..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={localFilters.status}
              onChange={e => setLocalFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {statusOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* User / Agent */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              User / Agent
            </label>
            <select
              value={localFilters.assignedToId}
              onChange={e => setLocalFilters(prev => ({ ...prev, assignedToId: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">{currentUser?.role === 'Employee' ? 'My Leads Only' : 'All Permitted Reps'}</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Team
            </label>
            <select
              value={localFilters.teamId}
              onChange={e => setLocalFilters(prev => ({ ...prev, teamId: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Permitted Teams</option>
              {availableTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Service
            </label>
            <select
              value={localFilters.service}
              onChange={e => setLocalFilters(prev => ({ ...prev, service: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Services</option>
              {services.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Source
            </label>
            <select
              value={localFilters.source}
              onChange={e => setLocalFilters(prev => ({ ...prev, source: e.target.value as any }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Sources</option>
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Bulk Action Bar (when checkboxes selected) */}
      {selectedLeadIds.length > 0 && viewMode === 'table' && (
        <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-center justify-between gap-4 animate-fadeIn">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            {selectedLeadIds.length} leads selected
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Change Status to:</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as LeadStatus)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="New">New</option>
              <option value="Follow-Up Required">Follow-Up Required</option>
              <option value="Contacted">Contacted</option>
              <option value="Hold">Hold</option>
              <option value="Cold">Cold</option>
              <option value="Returned">Returned</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
            <button
              type="button"
              onClick={handleBulkStatusChange}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer"
            >
              Update Selected
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE: KANBAN PIPELINE */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1400px]">
            {KANBAN_STAGES.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.status === stage.status);
              const stageValuePKR = stageLeads.reduce((acc, l) => acc + (l.valuePKR || 0), 0);

              return (
                <div
                  key={stage.status}
                  className="flex-1 min-w-[280px] max-w-[320px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col max-h-[750px] shadow-xs"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          {stage.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPKR(stageValuePKR)}
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="p-3 overflow-y-auto space-y-3 flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map(lead => {
                        const priorityStyle = getPriorityBadge(lead.priority);
                        const qualityStyle = getQualityBadge(lead.quality);
                        const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);
                        const isToday = lead.nextFollowUpDate === new Date().toISOString().split('T')[0];
                        const isPast = lead.nextFollowUpDate && lead.nextFollowUpDate < new Date().toISOString().split('T')[0];

                        // Find agent avatar
                        const assignedUser = users.find(u => u.id === lead.assignedToId);

                        return (
                          <div
                            key={lead.id}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all hover:border-indigo-300 dark:hover:border-indigo-600 group flex flex-col gap-2.5"
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                  {lead.businessName.charAt(0)}
                                </div>
                                <div>
                                  <button
                                    onClick={() => onOpenLeadDetail(lead.id)}
                                    className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left line-clamp-1 cursor-pointer"
                                  >
                                    {lead.businessName}
                                  </button>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {lead.name}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityStyle.badge}`}>
                                {priorityStyle.label}
                              </span>
                            </div>

                            {/* Services & Value */}
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {lead.services.slice(0, 1).map(s => (
                                  <span
                                    key={s}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 truncate"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {lead.services.length > 1 && (
                                  <span className="text-[10px] text-slate-400">+{lead.services.length - 1}</span>
                                )}
                              </div>
                              <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                                {formatPKR(lead.valuePKR)}
                              </span>
                            </div>

                            {/* Phone & Triggers */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="WhatsApp Chat"
                                  aria-label={`Open WhatsApp chat with ${lead.name}`}
                                  className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`tel:${lead.phone}`}
                                  title="Call Phone"
                                  aria-label={`Call ${lead.name} at ${lead.phone}`}
                                  className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  {lead.phone}
                                </span>
                              </div>

                              {canGenerateProposals && onOpenProposalModal && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenProposalModal(lead);
                                  }}
                                  title="Generate Enterprise Proposal & Quotation"
                                  aria-label="Generate Enterprise Proposal & Quotation"
                                  className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors cursor-pointer"
                                >
                                  <FileSignature className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Follow up status badge */}
                            {lead.nextFollowUpDate && (
                              <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg ${
                                isPast
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                  : isToday
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                              }`}>
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  Follow-up: {formatDate(lead.nextFollowUpDate)} {lead.nextFollowUpTime || ''}
                                </span>
                              </div>
                            )}

                            {/* Card Footer: Agent Avatar & Stage Mover */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <div className="flex items-center gap-1.5" title={`Assigned to ${lead.assignedToName}`}>
                                {assignedUser?.avatar ? (
                                  <img
                                    src={assignedUser.avatar}
                                    alt={lead.assignedToName}
                                    className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300">
                                    {lead.assignedToName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[90px]">
                                  {lead.assignedToName}
                                </span>
                              </div>

                              {/* Quick Move Stage Select */}
                              <select
                                value={lead.status}
                                onChange={e => {
                                  const targetSt = e.target.value as LeadStatus;
                                  if ((targetSt === 'Converted' || targetSt === 'Won') && onOpenConvertModal) {
                                    onOpenConvertModal(lead.id);
                                  } else {
                                    changeLeadStatus(lead.id, targetSt);
                                  }
                                }}
                                className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 focus:outline-none cursor-pointer"
                              >
                                {statusOptions.filter(s => s !== 'All').map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs table-auto">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-2 py-2.5 w-8 text-center">
                    <button onClick={toggleSelectAll} className="cursor-pointer">
                      {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-2.5 py-2.5">Client &amp; Contact</th>
                  <th className="px-2.5 py-2.5">Services</th>
                  <th className="px-2.5 py-2.5 whitespace-nowrap">Value (PKR)</th>
                  <th className="px-2.5 py-2.5">Status</th>
                  <th className="px-2.5 py-2.5 whitespace-nowrap">Priority / Quality</th>
                  <th className="px-2.5 py-2.5">Assignee &amp; Source</th>
                  <th className="px-2.5 py-2.5 whitespace-nowrap">Timeline (Dates)</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No leads matched your filter criteria.</p>
                      <button
                        onClick={handleResetFilter}
                        className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const statusStyle = getStatusBadgeStyle(lead.status);
                    const priorityStyle = getPriorityBadge(lead.priority);
                    const qualityStyle = getQualityBadge(lead.quality);
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);

                    const isToday = lead.nextFollowUpDate === new Date().toISOString().split('T')[0];
                    const isPast = lead.nextFollowUpDate && lead.nextFollowUpDate < new Date().toISOString().split('T')[0];

                    const assignedUser = users.find(u => u.id === lead.assignedToId);

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => toggleSelectLead(lead.id)} className="cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Client, Business & Contact (Merged) */}
                        <td className="px-2.5 py-2">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {lead.businessName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => onOpenLeadDetail(lead.id)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left truncate max-w-[150px] sm:max-w-[180px] cursor-pointer"
                                  title={lead.businessName}
                                >
                                  {lead.businessName}
                                </button>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-normal">
                                  {lead.city}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                                  {lead.name}
                                </span>
                                <span>•</span>
                                <div className="inline-flex items-center gap-1 font-mono text-slate-800 dark:text-slate-200">
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Direct WhatsApp Chat"
                                    className="p-0.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={`tel:${lead.phone}`}
                                    title="Direct Phone Call"
                                    className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                  <span className="text-[11px]">{lead.phone}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Services */}
                        <td className="px-2.5 py-2">
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {lead.services.slice(0, 2).map(srv => (
                              <span
                                key={srv}
                                className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[120px]"
                                title={srv}
                              >
                                {srv}
                              </span>
                            ))}
                            {lead.services.length > 2 && (
                              <span className="text-[9px] font-semibold text-slate-400" title={lead.services.slice(2).join(', ')}>
                                +{lead.services.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Value in PKR */}
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {formatPKR(lead.valuePKR)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {lead.status}
                          </span>
                        </td>

                        {/* Priority & Quality (Stacked) */}
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`inline-block text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-medium border ${priorityStyle.badge}`}>
                              {priorityStyle.label}
                            </span>
                            <span className={`inline-block text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-medium border ${qualityStyle.badge}`}>
                              {qualityStyle.label}
                            </span>
                          </div>
                        </td>

                        {/* Assignee & Source (Stacked) */}
                        <td className="px-2.5 py-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {assignedUser?.avatar ? (
                                <img
                                  src={assignedUser.avatar}
                                  alt={lead.assignedToName}
                                  className="w-4 h-4 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 uppercase shrink-0">
                                  {lead.assignedToName.charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[90px]">
                                {lead.assignedToName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate max-w-[95px]">
                              {lead.source}
                            </span>
                          </div>
                        </td>

                        {/* Dates (Timeline - Merged Created & Follow-up) */}
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          <div className="space-y-0.5 font-mono text-[10px] sm:text-[11px]">
                            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span className="text-[9px] font-sans uppercase font-bold text-slate-400">Created:</span>
                              <span>{formatDate(lead.createdAt)}</span>
                            </div>
                            {lead.nextFollowUpDate ? (
                              <div className={`flex items-center gap-1 font-semibold ${
                                isPast ? 'text-rose-600 dark:text-rose-400' : isToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                <span className="text-[9px] font-sans uppercase font-bold opacity-80">Next:</span>
                                <span>
                                  {formatDate(lead.nextFollowUpDate)} {lead.nextFollowUpTime || ''}
                                </span>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-[10px]">No follow-up</div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-2.5 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-0.5 justify-end">
                            <button
                              onClick={() => onOpenLeadDetail(lead.id)}
                              title="View Lead Details & Timeline"
                              aria-label="View Lead Details & Timeline"
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canGenerateProposals && onOpenProposalModal && (
                              <button
                                onClick={() => onOpenProposalModal(lead)}
                                title="Generate Enterprise Proposal & Quotation"
                                aria-label="Generate Enterprise Proposal & Quotation"
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onOpenConvertModal && lead.status !== 'Converted' && (
                              <button
                                onClick={() => onOpenConvertModal(lead.id)}
                                title="Convert Lead to Client"
                                aria-label="Convert Lead to Client"
                                className="p-1 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canEditLeadItem(lead) && (
                              <button
                                onClick={() => onOpenEditLeadModal(lead)}
                                title="Edit Lead Details"
                                aria-label="Edit Lead Details"
                                className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canReassignLeadItem(lead) && (
                              <button
                                onClick={() => onOpenReassignModal(lead)}
                                title="Reassign Representative"
                                aria-label="Reassign Representative"
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteLeadItem(lead) && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete lead "${lead.businessName}"?`)) {
                                    deleteLead(lead.id);
                                  }
                                }}
                                title="Delete Lead"
                                aria-label="Delete Lead"
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
