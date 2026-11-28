import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { IncomingLead, User } from '../types';
import { integrationsApi, MetaConnectionStatus, WhatsAppConnectionStatus } from '../api';
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
  Lock,
  Phone
} from 'lucide-react';
import { formatDate, formatTime, formatDateTime, getLocalDateString, getWhatsAppUrl } from '../utils/formatters';
import { PageHeader, Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard, Badge, Button, Input, Select, EmptyState, DataTableScrollFrame, ModalShell, FormField } from './ui';

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

  // Integration modals state & real backend status
  const [activeModal, setActiveModal] = useState<'meta' | 'whatsapp' | null>(null);
  const [whatsAppMethod, setWhatsAppMethod] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [isInitializingWa, setIsInitializingWa] = useState(false);

  useEffect(() => {
    if (!canManageIntegrations) return;
    let isMounted = true;
    const fetchStatuses = async () => {
      try {
        const [mRes, wRes] = await Promise.allSettled([
          integrationsApi.getMetaStatus(),
          integrationsApi.getWhatsAppStatus()
        ]);
        if (isMounted) {
          if (mRes.status === 'fulfilled') setMetaStatus(mRes.value);
          if (wRes.status === 'fulfilled') setWhatsAppStatus(wRes.value);
        }
      } catch {
        // preserve disconnected state
      }
    };
    fetchStatuses();
    return () => {
      isMounted = false;
    };
  }, [canManageIntegrations]);

  // Operational Assign & Add dialog state
  const [assignModalLead, setAssignModalLead] = useState<IncomingLead | null>(null);
  const [modalTargetUserId, setModalTargetUserId] = useState<string>('');

  // Eligible assignees based on current user's operational hierarchy
  const eligibleAssignees: User[] = useMemo(() => {
    return assignableUsers.filter(u => u.isActive);
  }, [assignableUsers]);

  // Filtered incoming leads list
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
  const todayStr = getLocalDateString();
  const todayIncomingCount = incomingLeads.filter(
    l => l.receivedAt && getLocalDateString(new Date(l.receivedAt)) === todayStr
  ).length;

  const unassignedCount = incomingLeads.filter(l => l.status === 'new').length;

  const assignedTodayCount = incomingLeads.filter(
    l => l.status === 'assigned' && l.assignedAt && getLocalDateString(new Date(l.assignedAt)) === todayStr
  ).length;

  // Check role access
  const normalizedUserRole = currentUser?.role ? currentUser.role.toLowerCase().replace(/\s+/g, '_') : '';
  const isEligibleRole = ['super_admin', 'admin', 'manager', 'team_lead'].includes(normalizedUserRole);
  const hasIncomingAccess = isEligibleRole && canViewIncomingLeads;

  if (!hasIncomingAccess) {
    return (
      <div id="incoming-leads-unauthorized" className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#E5EAF1] dark:border-slate-800">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#0F172A] dark:text-white mb-1">Access Restricted</h2>
        <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
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

  const handleAssignAndAdd = (lead: IncomingLead, overrideUserId?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Enforce permissions independently
    if (!canViewIncomingLeads || !canAssignIncomingLeads || !canCreateLeads) {
      setErrorMsg('You do not have permission to assign incoming leads.');
      return;
    }

    // Get selected user for this lead, or fallback to first eligible assignee
    const targetUserId = overrideUserId || selectedAssignees[lead.id] || eligibleAssignees[0]?.id;

    if (!targetUserId) {
      setErrorMsg('Please select an active team member to assign this lead.');
      return;
    }

    const assignedUser = users.find(u => u.id === targetUserId);
    const success = assignIncomingLead(lead.id, targetUserId);

    if (success) {
      setSuccessMsg(`"${lead.name}" successfully added to Leads and assigned to ${assignedUser?.name || 'Representative'}.`);
      setAssignModalLead(null);
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

  return (
    <div id="incoming-leads-container" className="space-y-6 pb-12">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="Incoming Leads"
        subtitle="Review new Meta and WhatsApp prospects before assigning them to the CRM pipeline."
        badge={
          <Badge variant="primary" size="sm">
            {unassignedCount} Unassigned Prospects
          </Badge>
        }
      />

      {/* Notifications Alert Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* B. TOP SUMMARY STRIP (3 Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Today's Incoming"
          value={todayIncomingCount}
          subtitle="Received in past 24 hours"
          variant="primary"
          icon={<Inbox className="w-5 h-5 text-[#2563EB]" />}
        />
        <StatCard
          title="Unassigned Queue"
          value={unassignedCount}
          subtitle="Awaiting CRM pipeline assignment"
          variant="warning"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Assigned Today"
          value={assignedTodayCount}
          subtitle="Transferred to active team reps"
          variant="success"
          icon={<UserCheck className="w-5 h-5" />}
        />
      </div>

      {/* C. INTEGRATION STATUS STRIP (Two Compact Status Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Meta Lead Ads Card */}
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                  Meta Lead Ads
                </h4>
                {metaStatus?.status === 'connected' ? (
                  <Badge variant="success" size="sm">Connected</Badge>
                ) : metaStatus?.status === 'configured' ? (
                  <Badge variant="primary" size="sm">Configured</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Disconnected</Badge>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                Facebook &amp; Instagram Forms • Webhooks &amp; Lead Sync
              </p>
            </div>
          </div>

          {canManageIntegrations && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalFeedback(null);
                setActiveModal('meta');
              }}
              className="shrink-0"
            >
              Configure
            </Button>
          )}
        </Card>

        {/* WhatsApp Business Card */}
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                  WhatsApp Business
                </h4>
                {whatsAppStatus?.status === 'connected' ? (
                  <Badge variant="success" size="sm">Connected</Badge>
                ) : whatsAppStatus?.status === 'connecting' || whatsAppStatus?.status === 'qr_ready' ? (
                  <Badge variant="warning" size="sm">
                    {whatsAppStatus.status === 'qr_ready' ? 'Scan QR' : 'Connecting'}
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Disconnected</Badge>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                Baileys / Node.js Engine • QR / Pairing Sync
              </p>
            </div>
          </div>

          {canManageIntegrations && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalFeedback(null);
                setActiveModal('whatsapp');
              }}
              className="shrink-0"
            >
              Configure
            </Button>
          )}
        </Card>
      </div>

      {/* D. INCOMING QUEUE TABLE */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle>Incoming Prospect Queue</CardTitle>
            <CardDescription>
              Review prospects from Meta Ads &amp; WhatsApp before delegating to CRM representatives
            </CardDescription>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search prospect or phone..."
                leftIcon={<Search className="w-3.5 h-3.5" />}
                rightIcon={
                  searchQuery ? (
                    <button type="button" onClick={() => setSearchQuery('')} className="cursor-pointer">
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="w-32">
              <Select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value as any)}
              >
                <option value="all">All Sources</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </div>

            <div className="w-32">
              <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="new">Unassigned</option>
                <option value="assigned">Assigned</option>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Table List */}
        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[120px]">Received</th>
                <th className="p-3.5 min-w-[180px]">Prospect</th>
                <th className="p-3.5 min-w-[140px]">Phone</th>
                <th className="p-3.5 min-w-[120px]">Source</th>
                <th className="p-3.5 min-w-[160px]">Campaign / Ad</th>
                <th className="p-3.5 min-w-[200px]">Message Preview</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
                <th className="p-3.5 min-w-[180px]">Assign To</th>
                <th className="p-3.5 min-w-[170px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
              {filteredIncomingLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <EmptyState
                      title="No incoming integration leads found"
                      description="When leads arrive from connected Meta Ads forms or WhatsApp chats, they will populate here ready for triage."
                    />
                  </td>
                </tr>
              ) : (
                filteredIncomingLeads.map(lead => {
                  const isAssigned = lead.status === 'assigned';
                  const selectedUserId = selectedAssignees[lead.id] || eligibleAssignees[0]?.id || '';
                  const waUrl = getWhatsAppUrl(lead.phone, lead.name);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isAssigned ? 'opacity-70 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      {/* Received Time */}
                      <td className="p-3.5 font-mono text-[11px] text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                        <div>{formatDate(lead.receivedAt)}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatTime(lead.receivedAt)}
                        </div>
                      </td>

                      {/* Prospect */}
                      <td className="p-3.5">
                        <p className="font-bold text-xs text-[#0F172A] dark:text-white">
                          {lead.name}
                        </p>
                        {lead.email && (
                          <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-[160px]">
                            {lead.email}
                          </p>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#0F172A] dark:text-slate-200">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                          <span>{lead.phone}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="p-3.5 whitespace-nowrap">
                        {lead.source === 'meta_ads' ? (
                          <Badge variant="primary" size="sm" icon={<Share2 className="w-3 h-3" />}>
                            Meta Ads
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" icon={<MessageCircle className="w-3 h-3" />}>
                            WhatsApp
                          </Badge>
                        )}
                      </td>

                      {/* Campaign / Ad */}
                      <td className="p-3.5">
                        <p className="font-semibold text-xs text-[#0F172A] dark:text-white truncate max-w-[160px]">
                          {lead.campaignName || 'Direct Outreach'}
                        </p>
                        {lead.adSetName && (
                          <p className="text-[10px] text-[#64748B] truncate max-w-[160px]">
                            {lead.adSetName}
                          </p>
                        )}
                      </td>

                      {/* Message Preview */}
                      <td className="p-3.5">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px] bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-[#E5EAF1] dark:border-slate-800">
                          {lead.message || lead.customFields?.inquiry || 'Inquiry submitted from lead ad.'}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isAssigned ? (
                          <Badge variant="neutral" size="sm">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            New
                          </Badge>
                        )}
                      </td>

                      {/* Assign To Dropdown */}
                      <td className="p-3.5">
                        {isAssigned ? (
                          <div className="text-[11px] text-[#64748B]">
                            <span className="font-semibold text-[#0F172A] dark:text-slate-200">
                              {getAssignedUserName(lead.assignedToUserId)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {lead.assignedAt ? formatDateTime(lead.assignedAt) : ''}
                            </div>
                          </div>
                        ) : (
                          <Select
                            value={selectedUserId}
                            disabled={!canAssignIncomingLeads || !canCreateLeads}
                            onChange={e => handleSelectAssignee(lead.id, e.target.value)}
                            className="text-xs"
                          >
                            {eligibleAssignees.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>

                      {/* E. Action: Assign & Add to Leads */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1">
                            <Check className="w-3.5 h-3.5" /> Added to CRM
                          </span>
                        ) : !canAssignIncomingLeads || !canCreateLeads ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            leftIcon={<Lock className="w-3 h-3 text-slate-400" />}
                            title="Permission required to assign and add leads"
                          >
                            Locked
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setAssignModalLead(lead);
                              setModalTargetUserId(selectedAssignees[lead.id] || eligibleAssignees[0]?.id || '');
                            }}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          >
                            Assign &amp; Add
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </Card>

      {/* ========================================================================= */}
      {/* C. OPERATIONAL DIALOG: ASSIGN & ADD INCOMING LEAD                         */}
      {/* ========================================================================= */}
      <ModalShell
        isOpen={!!assignModalLead}
        onClose={() => setAssignModalLead(null)}
        size="lg"
        title="Assign & Add Incoming Lead"
        subtitle="Review prospect details and assign to CRM representative"
        icon={<UserCheck className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModalLead(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (assignModalLead) {
                  handleAssignAndAdd(assignModalLead, modalTargetUserId);
                }
              }}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm &amp; Add Lead
            </Button>
          </>
        }
      >
        {assignModalLead && (
          <div className="space-y-4">
            {/* Prospect Information Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                  Prospect Information
                </span>
                <Badge
                  variant={assignModalLead.source === 'meta_ads' ? 'primary' : 'success'}
                  size="sm"
                >
                  {assignModalLead.source === 'meta_ads' ? 'Meta Ads' : 'WhatsApp'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Full Name</span>
                  <span className="font-bold text-[#0F172A] dark:text-white text-sm">
                    {assignModalLead.name}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Phone Number</span>
                  <span className="font-mono font-medium text-[#0F172A] dark:text-white">
                    {assignModalLead.phone}
                  </span>
                </div>

                {assignModalLead.campaignName && (
                  <div>
                    <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Campaign</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-200">
                      {assignModalLead.campaignName}
                    </span>
                  </div>
                )}

                {assignModalLead.adName && (
                  <div>
                    <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Ad</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-200">
                      {assignModalLead.adName}
                    </span>
                  </div>
                )}

                {(assignModalLead.customFields?.service || assignModalLead.customFields?.inquiry) && (
                  <div className="sm:col-span-2">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Interested Service / Solution</span>
                    <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                      {assignModalLead.customFields?.service || assignModalLead.customFields?.inquiry}
                    </span>
                  </div>
                )}

                {assignModalLead.message && (
                  <div className="sm:col-span-2">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[11px]">Inquiry Message</span>
                    <p className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 text-xs leading-relaxed">
                      {assignModalLead.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Assignment */}
            <div className="space-y-2">
              <FormField
                label="Assign To Representative"
                required
                helperText="Assign to an active sales representative or manager within your hierarchy scope"
              >
                <Select
                  value={modalTargetUserId}
                  onChange={e => setModalTargetUserId(e.target.value)}
                >
                  {eligibleAssignees.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role} {u.teamName ? `(${u.teamName})` : ''}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        )}
      </ModalShell>

      {/* ========================================================================= */}
      {/* CONNECTION MODAL: WHATSAPP (STANDARDIZED WITH MODALSHELL)                 */}
      {/* ========================================================================= */}
      <ModalShell
        isOpen={activeModal === 'whatsapp'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="WhatsApp Integration"
        subtitle="Secure backend connection"
        icon={<MessageCircle className="w-5 h-5 text-emerald-600" />}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isInitializingWa}
              onClick={async () => {
                setIsInitializingWa(true);
                try {
                  const updated = await integrationsApi.initWhatsAppSession();
                  setWhatsAppStatus(updated);
                  setModalFeedback('WhatsApp session initialized on backend. Ready for device scan / code pairing.');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Failed to initialize WhatsApp session';
                  setModalFeedback(`Error: ${msg}`);
                } finally {
                  setIsInitializingWa(false);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              {isInitializingWa ? 'Initializing...' : 'Start Connection'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700">
            <span className="font-semibold text-[#0F172A] dark:text-slate-300">Status</span>
            {whatsAppStatus?.status === 'connected' ? (
              <Badge variant="success" size="sm">Connected</Badge>
            ) : whatsAppStatus?.status === 'qr_ready' || whatsAppStatus?.status === 'pending' ? (
              <Badge variant="warning" size="sm">QR Ready</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Disconnected</Badge>
            )}
          </div>

          <div>
            <label className="block text-[#0F172A] dark:text-slate-300 font-semibold mb-1.5 text-[11px]">
              Connection Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWhatsAppMethod('qr')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  whatsAppMethod === 'qr'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-[#E5EAF1] dark:border-slate-700 text-[#64748B] hover:bg-slate-50'
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
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-[#E5EAF1] dark:border-slate-700 text-[#64748B] hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Pairing Code</span>
              </button>
            </div>
          </div>

          {whatsAppMethod === 'qr' && (
            <div className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-2.5">
              <p className="text-[11px] text-[#64748B] leading-relaxed max-w-sm mx-auto">
                Scan from WhatsApp &gt; Linked Devices when the backend provides a QR code.
              </p>
              <div className="w-40 h-40 mx-auto rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900">
                <QrCode className="w-8 h-8 text-slate-300 mb-1.5" />
                <span className="text-[11px] font-semibold text-[#0F172A] dark:text-slate-300">QR Code</span>
                <span className="text-[10px] text-[#64748B] mt-0.5">Waiting for backend</span>
              </div>
            </div>
          )}

          {whatsAppMethod === 'pairing' && (
            <div className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
              <div>
                <label htmlFor="whatsapp-pairing-phone" className="block text-[11px] font-semibold text-[#0F172A] dark:text-slate-300 mb-1">
                  Business WhatsApp Number
                </label>
                <input
                  id="whatsapp-pairing-phone"
                  type="text"
                  placeholder="03001234567 (11 digits)"
                  value={pairingPhone}
                  onChange={e => setPairingPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-700 text-xs font-mono text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-[#64748B]">
                A secure pairing code will be requested from the backend.
              </p>
            </div>
          )}

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700">
            <span className="text-[11px] text-[#64748B]">
              {whatsAppStatus?.sessionName ? `Session: ${whatsAppStatus.sessionName}` : 'No active WhatsApp session.'}
            </span>
          </div>

          {modalFeedback && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{modalFeedback}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            No session credentials or authentication keys are stored in client state.
          </p>
        </div>
      </ModalShell>

      {/* ========================================================================= */}
      {/* CONNECTION MODAL: META LEAD ADS (STANDARDIZED WITH MODALSHELL)            */}
      {/* ========================================================================= */}
      <ModalShell
        isOpen={activeModal === 'meta'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="Meta Lead Ads Integration"
        subtitle="Facebook & Instagram Lead Sync"
        icon={<Share2 className="w-5 h-5 text-[#1877F2]" />}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalFeedback('Meta OAuth flow will be configured with the backend API.')}
            >
              Connect with Meta
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700">
            <span className="font-semibold text-[#0F172A] dark:text-slate-300">Status</span>
            {metaStatus?.status === 'connected' ? (
              <Badge variant="success" size="sm">Connected</Badge>
            ) : metaStatus?.status === 'configured' ? (
              <Badge variant="primary" size="sm">Configured</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Disconnected</Badge>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <span className="font-semibold text-[#0F172A] dark:text-white block">OAuth &amp; Webhook Setup</span>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Real Meta integration will authenticate via OAuth 2.0 and subscribe to leadgen webhooks on the secure Node.js backend.
            </p>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700">
            <span className="text-[11px] text-[#64748B]">
              {metaStatus?.pageName ? `Connected Page: ${metaStatus.pageName}` : 'No Meta account connected.'}
            </span>
          </div>

          {modalFeedback && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{modalFeedback}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            OAuth access tokens and app secrets are verified server-side only.
          </p>
        </div>
      </ModalShell>
    </div>
  );
};
