import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Sparkles,
  FileSignature,
  X,
  ChevronDown
} from 'lucide-react';
import {
  formatPKR,
  formatDate,
  formatTime,
  getLocalDateString,
  getWhatsAppUrl,
  getStatusBadgeStyle,
  getPriorityBadge,
  getQualityBadge
} from '../utils/formatters';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select, EmptyState, DataTableScrollFrame, ConfirmDialog } from './ui';

interface LeadsViewProps {
  onOpenNewLeadModal: () => void;
  onOpenImportModal: () => void;
  onOpenEditLeadModal: (lead: Lead) => void;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenReassignModal: (lead: Lead) => void;
  onOpenConvertModal?: (leadId: string) => void;
  onOpenProposalModal?: (lead: Lead) => void;
}

const KANBAN_STAGES: { status: LeadStatus; label: string; dotColor: string }[] = [
  { status: 'New', label: 'New Inquiries', dotColor: 'bg-sky-500' },
  { status: 'Contacted', label: 'Contacted', dotColor: 'bg-blue-600' },
  { status: 'Follow-Up Required', label: 'Follow-Up Required', dotColor: 'bg-amber-500' },
  { status: 'Hold', label: 'On Hold', dotColor: 'bg-slate-400' },
  { status: 'Cold', label: 'Cold / Inactive', dotColor: 'bg-cyan-500' },
  { status: 'Returned', label: 'Returned', dotColor: 'bg-rose-400' },
  { status: 'Converted', label: 'Converted Deals', dotColor: 'bg-emerald-500' },
  { status: 'Lost', label: 'Lost Inquiries', dotColor: 'bg-zinc-400' }
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
    scopedLeads,
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

  // View Mode: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filter inputs
  const [localFilters, setLocalFilters] = useState(filterState);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>('Contacted');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null);

  useEffect(() => {
    setLocalFilters(filterState);
  }, [filterState]);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      'Created At',
      'Next Follow-Up Date',
      'Next Follow-Up Time'
    ];

    const rows = filteredLeads.map(l => [
      `"${l.businessName.replace(/"/g, '""')}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.city}"`,
      `"${l.services.join('; ')}"`,
      l.valuePKR || 0,
      `"${l.status}"`,
      `"${l.priority}"`,
      `"${l.quality}"`,
      `"${l.source}"`,
      `"${l.assignedToName}"`,
      `"${l.createdAt ? formatDate(l.createdAt) : ''}"`,
      `"${l.nextFollowUpDate ? formatDate(l.nextFollowUpDate) : ''}"`,
      `"${l.nextFollowUpTime ? formatTime(l.nextFollowUpTime) : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const summaryCounts = useMemo(() => {
    return {
      total: scopedLeads.length,
      newCount: scopedLeads.filter(l => l.status === 'New').length,
      hotCount: scopedLeads.filter(l => l.priority === 'Urgent' || l.quality === 'Good').length,
      followUpCount: scopedLeads.filter(l => l.status === 'Follow-Up Required').length,
      convertedCount: scopedLeads.filter(l => l.status === 'Converted').length
    };
  }, [scopedLeads]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.search) count++;
    if (filterState.status !== 'All') count++;
    if (filterState.priority !== 'All') count++;
    if (filterState.quality !== 'All') count++;
    if (filterState.source !== 'All') count++;
    if (filterState.assignedToId !== 'All') count++;
    if (filterState.teamId !== 'All') count++;
    if (filterState.service !== 'All') count++;
    if (filterState.fromDate || filterState.toDate) count++;
    return count;
  }, [filterState]);

  return (
    <div className="space-y-5 pb-12">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="Leads"
        subtitle="Manage, qualify and assign enterprise opportunities."
        badge={
          <Badge variant="primary" size="sm">
            {filteredLeads.length} of {scopedLeads.length} Leads
          </Badge>
        }
        actions={
          <>
            {canBulkImportExport && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenImportModal}
                  leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                >
                  Import CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportCSV}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export CSV
                </Button>
              </>
            )}

            {canCreateLeads && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenNewLeadModal}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Lead
              </Button>
            )}
          </>
        }
      />

      {/* B. SUMMARY STRIP (Compact Cards / Chips) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            const updated = { ...filterState, status: 'All' as const };
            setLocalFilters(updated);
            setFilterState(updated);
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            filterState.status === 'All'
              ? 'bg-[#EFF6FF] border-blue-300 dark:bg-blue-950/40 dark:border-blue-800'
              : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">Total Leads</div>
          <div className="text-xl font-medium text-[#0F172A] dark:text-white mt-0.5">{summaryCounts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const updated = { ...filterState, status: 'New' as const };
            setLocalFilters(updated);
            setFilterState(updated);
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            filterState.status === 'New'
              ? 'bg-sky-50 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800'
              : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">New Inquiries</div>
          <div className="text-xl font-medium text-[#0F172A] dark:text-white mt-0.5">{summaryCounts.newCount}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const updated = { ...filterState, priority: 'Urgent' as const };
            setLocalFilters(updated);
            setFilterState(updated);
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            filterState.priority === 'Urgent'
              ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
              : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Hot / Urgent</div>
          <div className="text-xl font-medium text-[#0F172A] dark:text-white mt-0.5">{summaryCounts.hotCount}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const updated = { ...filterState, status: 'Follow-Up Required' as const };
            setLocalFilters(updated);
            setFilterState(updated);
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            filterState.status === 'Follow-Up Required'
              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
              : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Follow-Up Required</div>
          <div className="text-xl font-medium text-[#0F172A] dark:text-white mt-0.5">{summaryCounts.followUpCount}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            const updated = { ...filterState, status: 'Converted' as const };
            setLocalFilters(updated);
            setFilterState(updated);
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            filterState.status === 'Converted'
              ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Converted Deals</div>
          <div className="text-xl font-medium text-[#0F172A] dark:text-white mt-0.5">{summaryCounts.convertedCount}</div>
        </button>
      </div>

      {/* C. FILTER BAR CONTAINER */}
      <Card>
        <div className="p-3.5 space-y-3">
          {/* Main Filter Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Search input and quick selects */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="w-full sm:w-64">
                <Input
                  value={localFilters.search}
                  onChange={e => {
                    const updated = { ...localFilters, search: e.target.value };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                  placeholder="Search leads, business, phone..."
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  rightIcon={
                    localFilters.search ? (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...localFilters, search: '' };
                          setLocalFilters(updated);
                          setFilterState(updated);
                        }}
                        className="hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              {/* Status Select */}
              <div className="w-36">
                <Select
                  value={localFilters.status}
                  onChange={e => {
                    const updated = { ...localFilters, status: e.target.value as any };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Follow-Up Required">Follow-Up Required</option>
                  <option value="Hold">Hold</option>
                  <option value="Cold">Cold</option>
                  <option value="Returned">Returned</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </Select>
              </div>

              {/* Priority Select */}
              <div className="w-32">
                <Select
                  value={localFilters.priority}
                  onChange={e => {
                    const updated = { ...localFilters, priority: e.target.value as any };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Priority</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </div>

              {/* Source Select */}
              <div className="w-36">
                <Select
                  value={localFilters.source}
                  onChange={e => {
                    const updated = { ...localFilters, source: e.target.value as any };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Sources</option>
                  {sources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </Select>
              </div>

              {/* Advanced Filter Toggle Button */}
              <Button
                variant={showAdvancedFilters ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                leftIcon={<Filter className="w-3.5 h-3.5" />}
              >
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilter}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-slate-500 hover:text-rose-600"
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Right: View Switcher (Table vs Kanban) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-end lg:self-center">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table view"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                title="Kanban pipeline view"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>
          </div>

          {/* Advanced Collapsible Filter Row */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-[#E5EAF1] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
              {/* Quality Select */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Lead Quality</label>
                <Select
                  value={localFilters.quality}
                  onChange={e => {
                    const updated = { ...localFilters, quality: e.target.value as any };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Qualities</option>
                  <option value="Good">Good Quality ⭐</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor / Unqualified</option>
                </Select>
              </div>

              {/* Service Select */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Service Required</label>
                <Select
                  value={localFilters.service}
                  onChange={e => {
                    const updated = { ...localFilters, service: e.target.value };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Services</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              </div>

              {/* Assigned Representative */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Assigned Representative</label>
                <Select
                  value={localFilters.assignedToId}
                  onChange={e => {
                    const updated = { ...localFilters, assignedToId: e.target.value };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Permitted Users</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </Select>
              </div>

              {/* Team Select */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Team</label>
                <Select
                  value={localFilters.teamId}
                  onChange={e => {
                    const updated = { ...localFilters, teamId: e.target.value };
                    setLocalFilters(updated);
                    setFilterState(updated);
                  }}
                >
                  <option value="All">All Permitted Teams</option>
                  {availableTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedLeadIds.length > 0 && viewMode === 'table' && (
        <div className="bg-[#EFF6FF] dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between gap-4 animate-fadeIn">
          <span className="text-xs font-bold text-[#2563EB] dark:text-blue-300 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] dark:text-slate-400">Change Status to:</span>
            <div className="w-40">
              <Select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value as LeadStatus)}
              >
                <option value="New">New</option>
                <option value="Follow-Up Required">Follow-Up Required</option>
                <option value="Contacted">Contacted</option>
                <option value="Hold">Hold</option>
                <option value="Cold">Cold</option>
                <option value="Returned">Returned</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </Select>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkStatusChange}
            >
              Apply Status
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLeadIds([])}
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* D. TABLE VIEW */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <DataTableScrollFrame>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      title="Select all"
                      className="cursor-pointer text-[#64748B] hover:text-[#0F172A]"
                    >
                      {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#2563EB]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 min-w-[200px]">Lead / Business</th>
                  <th className="p-3 min-w-[140px]">Contact</th>
                  <th className="p-3 min-w-[130px]">Service</th>
                  <th className="p-3 min-w-[100px]">Source</th>
                  <th className="p-3 min-w-[110px]">Status</th>
                  <th className="p-3 min-w-[110px]">Priority / Quality</th>
                  <th className="p-3 min-w-[110px]">Value</th>
                  <th className="p-3 min-w-[140px]">Assigned Rep</th>
                  <th className="p-3 min-w-[140px]">Next Follow-Up</th>
                  <th className="p-3 min-w-[140px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center">
                      <EmptyState
                        title="No leads found matching your criteria"
                        description="Try adjusting your search keywords, clearing status filters, or creating a new lead."
                        actionLabel="Clear Filters"
                        onAction={handleResetFilter}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const statusStyle = getStatusBadgeStyle(lead.status);
                    const priorityStyle = getPriorityBadge(lead.priority);
                    const qualityStyle = getQualityBadge(lead.quality);
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);

                    const today = getLocalDateString();
                    const isToday = lead.nextFollowUpDate === today;
                    const isPast = lead.nextFollowUpDate && lead.nextFollowUpDate < today;

                    const assignedUser = users.find(u => u.id === lead.assignedToId);

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectLead(lead.id)}
                            className="cursor-pointer text-[#64748B] hover:text-[#0F172A]"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#2563EB]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Business & City */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {lead.businessName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onOpenLeadDetail(lead.id)}
                                className="font-bold text-xs text-[#0F172A] dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors text-left truncate block cursor-pointer"
                              >
                                {lead.businessName}
                              </button>
                              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                                {lead.city}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Person & Quick Links */}
                        <td className="p-3">
                          <p className="font-semibold text-xs text-[#0F172A] dark:text-slate-200 truncate">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                            <a
                              href={`tel:${lead.phone}`}
                              title="Call phone"
                              className="p-1 rounded bg-slate-100 text-[#64748B] hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <span className="text-[11px] font-mono text-[#64748B] truncate">
                              {lead.phone}
                            </span>
                          </div>
                        </td>

                        {/* Services */}
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-[130px]">
                            {lead.services.slice(0, 2).map(srv => (
                              <span
                                key={srv}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[110px]"
                                title={srv}
                              >
                                {srv}
                              </span>
                            ))}
                            {lead.services.length > 2 && (
                              <span className="text-[9px] font-semibold text-[#64748B]">
                                +{lead.services.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Source */}
                        <td className="p-3">
                          <span className="text-xs text-[#64748B] dark:text-slate-400 truncate block">
                            {lead.source}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {lead.status}
                          </span>
                        </td>

                        {/* Priority & Quality */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${priorityStyle.badge}`}>
                              {priorityStyle.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${qualityStyle.badge}`}>
                              {qualityStyle.label}
                            </span>
                          </div>
                        </td>

                        {/* Value PKR */}
                        <td className="p-3 whitespace-nowrap font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                          {formatPKR(lead.valuePKR)}
                        </td>

                        {/* Assigned Rep */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {assignedUser?.avatar ? (
                              <img
                                src={assignedUser.avatar}
                                alt={lead.assignedToName}
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-[#0F172A] shrink-0">
                                {lead.assignedToName.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-xs text-[#0F172A] dark:text-slate-200 truncate max-w-[95px]">
                              {lead.assignedToName}
                            </span>
                          </div>
                        </td>

                        {/* Next Follow-Up */}
                        <td className="p-3 whitespace-nowrap">
                          {lead.nextFollowUpDate ? (
                            <div className={`font-mono text-[11px] font-semibold ${
                              isPast ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-[#0F172A] dark:text-slate-300'
                            }`}>
                              <div>{formatDate(lead.nextFollowUpDate)}</div>
                              <div className="text-[10px] font-normal text-[#64748B]">{lead.nextFollowUpTime ? formatTime(lead.nextFollowUpTime) : ''}</div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">None scheduled</span>
                          )}
                        </td>

                        {/* E. ROW ACTIONS */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => onOpenLeadDetail(lead.id)}
                              title="View Lead Details"
                              className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canGenerateProposals && onOpenProposalModal && (
                              <button
                                type="button"
                                onClick={() => onOpenProposalModal(lead)}
                                title="Generate Proposal & Quotation"
                                className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onOpenConvertModal && lead.status !== 'Converted' && (
                              <button
                                type="button"
                                onClick={() => onOpenConvertModal(lead.id)}
                                title="Convert to Client"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canEditLeadItem(lead) && (
                              <button
                                type="button"
                                onClick={() => onOpenEditLeadModal(lead)}
                                title="Edit Lead"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canReassignLeadItem(lead) && (
                              <button
                                type="button"
                                onClick={() => onOpenReassignModal(lead)}
                                title="Reassign Representative"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDeleteLeadItem(lead) && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmLead(lead)}
                                title="Delete Lead"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
          </DataTableScrollFrame>
        </Card>
      )}

      {/* F. KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1400px]">
            {KANBAN_STAGES.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.status === stage.status);
              const stageValuePKR = stageLeads.reduce((acc, l) => acc + (l.valuePKR || 0), 0);

              return (
                <div
                  key={stage.status}
                  className="flex-1 min-w-[280px] max-w-[320px] bg-slate-50 dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl flex flex-col max-h-[750px] shadow-xs"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-[#E5EAF1] dark:border-slate-800 bg-white dark:bg-slate-850 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                        <h3 className="font-bold text-xs text-[#0F172A] dark:text-white uppercase tracking-wider">
                          {stage.label}
                        </h3>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <div className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {formatPKR(stageValuePKR)}
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="p-3 overflow-y-auto space-y-3 flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="p-6 text-center text-[#64748B] text-xs border border-dashed border-[#E5EAF1] dark:border-slate-800 rounded-xl">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map(lead => {
                        const priorityStyle = getPriorityBadge(lead.priority);
                        const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);
                        const assignedUser = users.find(u => u.id === lead.assignedToId);

                        return (
                          <div
                            key={lead.id}
                            className="bg-white dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-600 flex flex-col gap-2.5"
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                                  {lead.businessName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => onOpenLeadDetail(lead.id)}
                                    className="font-bold text-xs text-[#0F172A] dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors text-left line-clamp-1 cursor-pointer block"
                                  >
                                    {lead.businessName}
                                  </button>
                                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                                    {lead.name}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityStyle.badge} shrink-0`}>
                                {priorityStyle.label}
                              </span>
                            </div>

                            {/* Service and Value */}
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5EAF1] dark:border-slate-700">
                              <div className="flex flex-wrap gap-1 max-w-[140px]">
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
                              <span className="font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                                {formatPKR(lead.valuePKR)}
                              </span>
                            </div>

                            {/* Footer: Rep, Next Follow-Up & Quick WhatsApp */}
                            <div className="flex items-center justify-between pt-1 border-t border-[#E5EAF1] dark:border-slate-700 text-[11px] text-[#64748B]">
                              <div className="flex items-center gap-1.5 truncate">
                                {assignedUser?.avatar ? (
                                  <img
                                    src={assignedUser.avatar}
                                    alt={lead.assignedToName}
                                    className="w-4 h-4 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-[#0F172A] shrink-0">
                                    {lead.assignedToName.charAt(0)}
                                  </div>
                                )}
                                <span className="truncate max-w-[85px]">{lead.assignedToName}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp"
                                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => onOpenLeadDetail(lead.id)}
                                  title="View details"
                                  className="p-1 rounded text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {/* Delete Lead Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmLead}
        onClose={() => setDeleteConfirmLead(null)}
        onConfirm={() => {
          if (deleteConfirmLead) {
            deleteLead(deleteConfirmLead.id);
            setDeleteConfirmLead(null);
          }
        }}
        title={`Delete Lead "${deleteConfirmLead?.businessName}"?`}
        description="Are you sure you want to delete this lead? This action cannot be undone and will permanently remove this lead and all associated activities."
        confirmLabel="Delete Lead"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};
