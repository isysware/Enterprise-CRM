import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { IncomingLead, User } from '../types';
import {
  Inbox,
  Sparkles,
  Share2,
  MessageCircle,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  QrCode,
  Smartphone,
  Info,
  Lock
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

// NOTE/TODO: Future backend must support a generic per-user integration access override, managed by Super Admin in the Users module.
// This will allow Super Admin to enable/disable Incoming Leads access for a specific eligible Admin/Manager/Team Lead without creating module-specific authorization hacks.
// Employee remains structurally excluded unless product rules are deliberately changed later.

export const IncomingLeadsView: React.FC = () => {
  const {
    currentUser,
    incomingLeads,
    assignIncomingLead,
    assignableUsers,
    users,
    canCreateLeads,
    canViewIncomingLeads,
    canAssignIncomingLeads,
    canManageIntegrations
  } = useCRM();

  // Local state for assign selections: incomingId -> selectedUserId
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'meta_ads' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'assigned'>('all');

  // Integration modals state
  const [activeModal, setActiveModal] = useState<'meta' | 'whatsapp' | null>(null);
  const [whatsAppMethod, setWhatsAppMethod] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Eligible assignees based on current user's operational hierarchy (unconditional hook)
  const eligibleAssignees: User[] = useMemo(() => {
    // assignableUsers provides the legitimate targets allowed by hard scope
    return assignableUsers.filter(u => u.isActive);
  }, [assignableUsers]);

  // Filtered incoming leads list (unconditional hook)
  const filteredIncomingLeads = useMemo(() => {
    return incomingLeads.filter(lead => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesPhone = lead.phone.toLowerCase().includes(q);
        const matchesCampaign = lead.campaignName?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesPhone && !matchesCampaign) return false;
      }

      // Source Filter
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [incomingLeads, searchQuery, sourceFilter, statusFilter]);

  // KPI Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIncomingCount = incomingLeads.filter(
    l => l.receivedAt && l.receivedAt.startsWith(todayStr)
  ).length;

  const unassignedCount = incomingLeads.filter(l => l.status === 'new').length;

  const assignedTodayCount = incomingLeads.filter(
    l => l.status === 'assigned' && l.assignedAt && l.assignedAt.startsWith(todayStr)
  ).length;

  // Check role access: explicitly super_admin, admin, manager, team_lead + canViewIncomingLeads
  const normalizedUserRole = currentUser?.role ? currentUser.role.toLowerCase().replace(/\s+/g, '_') : '';
  const isEligibleRole = ['super_admin', 'admin', 'manager', 'team_lead'].includes(normalizedUserRole);
  const hasIncomingAccess = isEligibleRole && canViewIncomingLeads;

  if (!hasIncomingAccess) {
    return (
      <div id="incoming-leads-unauthorized" className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You do not have permission to view the Incoming Leads Inbox.
        </p>
      </div>
    );
  }

  const handleSelectAssignee = (incomingId: string, userId: string) => {
    setSelectedAssignees(prev => ({
      ...prev,
      [incomingId]: userId
    }));
  };

  const handleAssignAndAdd = (lead: IncomingLead) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Enforce permissions independently
    if (!canViewIncomingLeads || !canAssignIncomingLeads || !canCreateLeads) {
      setErrorMsg('You do not have permission to assign incoming leads.');
      return;
    }

    // Get selected user for this lead, or fallback to first eligible assignee
    const targetUserId = selectedAssignees[lead.id] || eligibleAssignees[0]?.id;

    if (!targetUserId) {
      setErrorMsg('Please select an active team member to assign this lead.');
      return;
    }

    const assignedUser = users.find(u => u.id === targetUserId);
    const success = assignIncomingLead(lead.id, targetUserId);

    if (success) {
      setSuccessMsg(`"${lead.name}" successfully added to Leads and assigned to ${assignedUser?.name || 'Representative'}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg('Failed to assign lead. It may already be assigned, duplicate externalId exists, or you lack lead creation permission.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const getAssignedUserName = (userId?: string) => {
    if (!userId) return '—';
    const found = users.find(u => u.id === userId);
    return found ? found.name : 'Assigned User';
  };

  const handleOpenModal = (modal: 'meta' | 'whatsapp') => {
    setModalFeedback(null);
    setActiveModal(modal);
  };

  return (
    <div id="incoming-leads-container" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Inbox className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incoming Leads
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            New leads received from connected Meta and WhatsApp channels.
          </p>
        </div>

        {/* Global Feedback Banners */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div id="kpi-today-incoming" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Incoming</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {todayIncomingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Leads received today</p>
        </div>

        <div id="kpi-unassigned" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unassigned Queue</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {unassignedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting agent assignment</p>
        </div>

        <div id="kpi-assigned-today" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {assignedTodayCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Added to CRM pipeline today</p>
        </div>
      </div>

      {/* Connection Panel */}
      <div id="incoming-leads-connection-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Connected Lead Generation Channels
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Backend Integration Required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Meta Lead Ads Card */}
          <div id="connection-card-meta" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    META LEAD ADS
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Facebook & Instagram Lead Forms
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Disconnected
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-400">
                Backend OAuth/Webhook integration required
              </span>

              {canManageIntegrations ? (
                <button
                  id="btn-meta-connect"
                  type="button"
                  onClick={() => handleOpenModal('meta')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer transition-colors"
                >
                  Configure Connection
                </button>
              ) : (
                <span
                  title="You do not have permission to manage integrations."
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium cursor-not-allowed"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Read-Only</span>
                </span>
              )}
            </div>
          </div>

          {/* WhatsApp Card */}
          <div id="connection-card-whatsapp" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    WHATSAPP
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click-to-WhatsApp & Direct Chat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Disconnected
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-400">
                Backend server connector required
              </span>

              {canManageIntegrations ? (
                <button
                  id="btn-whatsapp-connect"
                  type="button"
                  onClick={() => handleOpenModal('whatsapp')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-colors"
                >
                  Configure Connection
                </button>
              ) : (
                <span
                  title="You do not have permission to manage integrations."
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium cursor-not-allowed"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Read-Only</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by prospect name, phone, or campaign..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Source:</span>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New (Unassigned)</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assign To</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIncomingLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No incoming leads found
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {incomingLeads.length === 0
                        ? 'New leads from Meta Ads or WhatsApp will appear here.'
                        : 'No leads match the current filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncomingLeads.map(lead => {
                  const isAssigned = lead.status === 'assigned';
                  const currentAssigneeId = selectedAssignees[lead.id] || eligibleAssignees[0]?.id || '';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Received */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {lead.receivedAt ? formatDate(lead.receivedAt) : '—'}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div>
                          <span>{lead.name}</span>
                          {lead.message && (
                            <p className="text-[11px] text-slate-400 font-normal line-clamp-1 max-w-xs mt-0.5">
                              "{lead.message}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {lead.phone}
                      </td>

                      {/* Campaign */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                        {lead.campaignName || '—'}
                        {lead.adName && (
                          <span className="block text-[10px] text-slate-400 truncate">
                            Ad: {lead.adName}
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.source === 'meta_ads' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Share2 className="w-3 h-3" />
                            <span>Meta Ads</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Assigned</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            New
                          </span>
                        )}
                      </td>

                      {/* Assign To Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAssigned ? (
                          <div className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{getAssignedUserName(lead.assignedToId)}</span>
                          </div>
                        ) : (
                          <select
                            value={currentAssigneeId}
                            onChange={e => handleSelectAssignee(lead.id, e.target.value)}
                            disabled={!canAssignIncomingLeads || !canCreateLeads}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {eligibleAssignees.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {isAssigned ? (
                          <span className="text-[11px] font-medium text-slate-400 italic">
                            Added to Leads
                          </span>
                        ) : (!canAssignIncomingLeads || !canCreateLeads) ? (
                          <button
                            type="button"
                            disabled
                            title={
                              !canAssignIncomingLeads
                                ? 'You do not have permission to assign incoming leads.'
                                : 'You do not have permission to create leads.'
                            }
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs cursor-not-allowed flex items-center gap-1.5 ml-auto border border-slate-200 dark:border-slate-700"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Permission Denied</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignAndAdd(lead)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assign & Add to Leads</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connection Modal: WhatsApp (Future Real Flow Contract) */}
      {activeModal === 'whatsapp' && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[calc(100dvh-32px)] flex flex-col shadow-2xl animate-scaleUp overflow-hidden">
            {/* Header - Fixed */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="whatsapp-modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    WhatsApp Integration
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Secure backend connection
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close WhatsApp integration modal"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
              {/* Connection Status Row */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  Disconnected
                </span>
              </div>

              {/* Connection Method Selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 text-[11px]">
                  Connection Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsAppMethod('qr')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      whatsAppMethod === 'qr'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsAppMethod('pairing')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      whatsAppMethod === 'pairing'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pairing Code</span>
                  </button>
                </div>
              </div>

              {/* QR Code Mode */}
              {whatsAppMethod === 'qr' && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-2.5">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                    Scan from WhatsApp &gt; Linked Devices when the backend provides a QR code.
                  </p>

                  {/* Compact QR Placeholder (~160px x 160px) */}
                  <div className="w-40 h-40 mx-auto rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900">
                    <QrCode className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      QR Code
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Waiting for backend
                    </span>
                  </div>
                </div>
              )}

              {/* Pairing Code Mode */}
              {whatsAppMethod === 'pairing' && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                  <div>
                    <label htmlFor="whatsapp-pairing-phone" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business WhatsApp Number
                    </label>
                    <input
                      id="whatsapp-pairing-phone"
                      type="text"
                      placeholder="+92 300 1234567"
                      value={pairingPhone}
                      onChange={e => setPairingPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    A secure pairing code will be requested from the backend.
                  </p>
                </div>
              )}

              {/* Session Details: Compact line when disconnected */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  No active WhatsApp session.
                </span>
              </div>

              {/* Feedback Banner */}
              {modalFeedback && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{modalFeedback}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                No session credentials or authentication keys are stored in client state.
              </p>
            </div>

            {/* Footer - Fixed */}
            <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setModalFeedback('Backend integration required. Connection will be activated during server setup.')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer transition-colors shadow-xs text-center"
              >
                Start Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Modal: Meta Lead Ads (Future Real Flow Contract) */}
      {activeModal === 'meta' && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meta-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[calc(100dvh-32px)] flex flex-col shadow-2xl animate-scaleUp overflow-hidden">
            {/* Header - Fixed */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="meta-modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Meta Lead Ads
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Secure Meta account connection
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Meta integration modal"
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
              {/* Connection Status Row */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  Disconnected
                </span>
              </div>

              {/* Clean Stepper */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Connection Process
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>Connect Meta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>Authorize Account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>Select Facebook Page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      4
                    </span>
                    <span>Activate Lead Sync</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>New leads appear automatically in Incoming Leads</span>
                </div>
              </div>

              {/* Connected Details: Compact line when disconnected */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  No Meta account connected.
                </span>
              </div>

              {/* Feedback Banner */}
              {modalFeedback && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{modalFeedback}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tokens, app secrets, and webhook signatures are handled exclusively on the backend server and are never exposed in browser storage.
              </p>
            </div>

            {/* Footer - Fixed */}
            <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setModalFeedback('Backend OAuth/Webhook integration required.')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer transition-colors shadow-xs text-center"
              >
                Connect Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
