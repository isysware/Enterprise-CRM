import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  UserCheck,
  Tag,
  AlertCircle,
  FileText,
  Video,
  Send,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  FileSignature,
  Printer
} from 'lucide-react';
import {
  formatPKR,
  formatDate,
  formatDateTime,
  getWhatsAppUrl,
  getStatusBadgeStyle,
  getPriorityBadge,
  getQualityBadge
} from '../../utils/formatters';
import { LeadStatus, ActivityType, Lead, Proposal } from '../../types';

interface LeadDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onOpenScheduleModal: (leadId: string) => void;
  onOpenConvertModal?: (leadId: string) => void;
  onOpenProposalModal?: (lead: Lead, existingProposal?: Proposal) => void;
}

const STAGES_FLOW: { status: LeadStatus; label: string }[] = [
  { status: 'New', label: 'New' },
  { status: 'Contacted', label: 'Contacted' },
  { status: 'Follow-Up Required', label: 'Follow-Up' },
  { status: 'Hold', label: 'Hold' },
  { status: 'Converted', label: 'Converted' }
];

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  onClose,
  onOpenScheduleModal,
  onOpenConvertModal,
  onOpenProposalModal
}) => {
  const {
    leads,
    followUps,
    proposals,
    canGenerateProposals,
    changeLeadStatus,
    addLeadActivity,
    reassignLead,
    users,
    assignableUsers,
    currentUser,
    canReassignLeadItem,
    canEditLeadItem
  } = useCRM();

  // Activity Form state
  const [activityType, setActivityType] = useState<ActivityType>('call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityOutcome, setActivityOutcome] = useState('Interested');
  const [activityDuration, setActivityDuration] = useState('10 mins');
  const [activityNotes, setActivityNotes] = useState('');
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);

  if (!leadId) return null;
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return null;

  const leadFollowUps = followUps.filter(f => f.leadId === lead.id);
  const leadProposals = (proposals || []).filter(p => p.leadId === lead.id);
  const statusStyle = getStatusBadgeStyle(lead.status);
  const priorityStyle = getPriorityBadge(lead.priority);
  const qualityStyle = getQualityBadge(lead.quality);
  const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);

  // Combine lead activities and followups chronologically
  const timelineItems = [
    ...(lead.activities || []).map(act => ({
      id: act.id,
      type: act.type,
      title: act.title,
      notes: act.notes,
      timestamp: act.timestamp,
      author: act.author,
      outcome: act.outcome,
      duration: act.duration,
      isFollowUp: false
    })),
    ...leadFollowUps.map(fu => ({
      id: fu.id,
      type: (fu.type.toLowerCase() === 'call' ? 'call' : fu.type.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'meeting') as ActivityType,
      title: `Follow-up ${fu.type}: ${fu.status}`,
      notes: fu.notes + (fu.resultNotes ? ` (Outcome: ${fu.resultNotes})` : ''),
      timestamp: fu.createdAt || `${fu.scheduledDate}T${fu.scheduledTime || '09:00'}:00.000Z`,
      author: fu.assignedToName,
      outcome: fu.status,
      duration: undefined,
      isFollowUp: true
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim() && !activityNotes.trim()) return;

    addLeadActivity(lead.id, {
      type: activityType,
      title: activityTitle.trim() || `${activityType.toUpperCase()} with ${lead.name}`,
      notes: activityNotes.trim(),
      outcome: activityOutcome,
      duration: activityDuration,
      author: currentUser?.name || 'Representative'
    });

    setActivityTitle('');
    setActivityNotes('');
    setIsActivityFormOpen(false);
  };

  const handleQuickStageClick = (targetStatus: LeadStatus) => {
    if (targetStatus === 'Converted' || targetStatus === 'Won') {
      if (onOpenConvertModal) {
        onOpenConvertModal(lead.id);
        return;
      }
    }
    if (lead.status !== targetStatus) {
      changeLeadStatus(lead.id, targetStatus);
    }
  };

  const currentStageIndex = STAGES_FLOW.findIndex(s => s.status === lead.status);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slideLeft">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              {lead.businessName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {lead.businessName}
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyle.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} inline-block mr-1`} />
                  {lead.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contact: <span className="font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span> • {lead.city}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right mr-2 hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deal Value</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {formatPKR(lead.valuePKR)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Interactive Stage Progression Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Stage Progression
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {lead.status}
              </span>
            </div>

            {/* Steps line */}
            <div className="grid grid-cols-5 gap-1 relative">
              {STAGES_FLOW.map((stage, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = lead.status === stage.status;

                return (
                  <button
                    key={stage.status}
                    onClick={() => handleQuickStageClick(stage.status)}
                    title={`Click to set stage to ${stage.label}`}
                    className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : isPassed
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-white text-indigo-600 font-bold'
                        : isPassed
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {isPassed ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      {stage.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Other Stages (Hold, Cold, Returned, Lost) selector */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Other Outcome Stages:</span>
              <div className="flex gap-1.5">
                {(['Hold', 'Cold', 'Returned', 'Lost'] as LeadStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => handleQuickStageClick(st)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      lead.status === st
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`tel:${lead.phone}`}
              className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition-colors"
            >
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>Direct Call</span>
            </a>

            <button
              onClick={() => onOpenScheduleModal(lead.id)}
              className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Follow-Up</span>
            </button>

            {canGenerateProposals && onOpenProposalModal && (
              <button
                onClick={() => onOpenProposalModal(lead)}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <FileSignature className="w-4 h-4" />
                <span>Proposal</span>
              </button>
            )}

            <button
              onClick={() => setIsActivityFormOpen(!isActivityFormOpen)}
              className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Log Note</span>
            </button>

            {onOpenConvertModal && (
              <button
                onClick={() => onOpenConvertModal(lead.id)}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Convert</span>
              </button>
            )}
          </div>

          {/* Activity Logger Panel */}
          {isActivityFormOpen && (
            <form onSubmit={handleLogActivity} className="bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                  Log New Interaction
                </span>
                <button
                  type="button"
                  onClick={() => setIsActivityFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                  <select
                    value={activityType}
                    onChange={e => setActivityType(e.target.value as ActivityType)}
                    className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="meeting">Physical Meeting</option>
                    <option value="demo">Product Demo</option>
                    <option value="email">Email</option>
                    <option value="note">General Note</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Outcome</label>
                  <select
                    value={activityOutcome}
                    onChange={e => setActivityOutcome(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Interested">Interested / Positive</option>
                    <option value="Call Back">Call Back Requested</option>
                    <option value="Scheduled Demo">Scheduled Demo</option>
                    <option value="Price Objection">Price Objection</option>
                    <option value="Not Reachable">Not Reachable / Busy</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Lost Interest">Lost Interest</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Duration</label>
                  <input
                    type="text"
                    value={activityDuration}
                    onChange={e => setActivityDuration(e.target.value)}
                    placeholder="e.g. 10 mins"
                    className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Summary Title</label>
                  <input
                    type="text"
                    value={activityTitle}
                    onChange={e => setActivityTitle(e.target.value)}
                    placeholder="e.g. Feature Demo Call"
                    className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notes & Next Steps</label>
                <textarea
                  value={activityNotes}
                  onChange={e => setActivityNotes(e.target.value)}
                  placeholder="Enter detailed conversation outcome, client questions, pricing discussed..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Activity Log
                </button>
              </div>
            </form>
          )}

          {/* Lead Information Specifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Lead Contact & Deal Specifications
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Phone Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">{lead.phone}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Email Address</span>
                <span className="font-mono text-slate-900 dark:text-white mt-0.5 block truncate">{lead.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Location / City</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{lead.city}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Lead Source</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{lead.source}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Priority & Quality</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityStyle.badge}`}>
                    {priorityStyle.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${qualityStyle.badge}`}>
                    {qualityStyle.label}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[11px] block">Assigned Rep & Team</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[120px]">
                    {lead.assignedToName}
                  </span>
                  {canReassignLeadItem(lead) && (
                    <select
                      value={lead.assignedToId}
                      onChange={e => {
                        const targetUser = users.find(u => u.id === e.target.value);
                        if (targetUser) {
                          reassignLead(lead.id, targetUser.id, targetUser.name, targetUser.teamId || lead.teamId, targetUser.teamName || lead.teamName);
                        }
                      }}
                      className="text-[10px] bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold rounded px-1 py-0.5 border border-slate-300 dark:border-slate-600 focus:outline-none cursor-pointer"
                    >
                      {(assignableUsers && assignableUsers.length > 0 ? assignableUsers : users).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Services Requested */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block mb-1.5 font-bold uppercase">Requested Services & Systems</span>
              <div className="flex flex-wrap gap-1.5">
                {lead.services.map(srv => (
                  <span
                    key={srv}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Budget & Commercial Model Breakdown */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Commercial Model &amp; Budget
                </span>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  {lead.budgetType || lead.pricingModel || 'No Budget Discussed'}
                </span>
              </div>

              {lead.budgetDetails && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 text-[11px]">
                  {lead.budgetDetails.monthlySubscriptionFee !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Monthly Sub</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.monthlySubscriptionFee)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.oneTimeSetupFee !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Setup Fee</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.oneTimeSetupFee)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.monthlySupportFee !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Support Fee</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.monthlySupportFee)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.totalInitialPayment !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Initial Payment</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{formatPKR(lead.budgetDetails.totalInitialPayment)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.ownershipPrice !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Ownership Price</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.ownershipPrice)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.totalProjectPrice !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Project Price</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.totalProjectPrice)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.advanceMilestoneAmount !== undefined && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Advance Amount</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.advanceMilestoneAmount)}</span>
                    </div>
                  )}
                  {lead.budgetDetails.otherFeeAmount ? (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-slate-400 block text-[10px]">Other Fee</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPKR(lead.budgetDetails.otherFeeAmount)}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {lead.budgetDetails?.budgetNotes && (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
                  Notes: {lead.budgetDetails.budgetNotes}
                </div>
              )}
            </div>

            {/* Generated Enterprise Proposals & Quotations */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-indigo-900 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Proposals &amp; Quotations ({leadProposals.length})
                </span>
                {canGenerateProposals && onOpenProposalModal && (
                  <button
                    type="button"
                    onClick={() => onOpenProposalModal(lead)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Proposal</span>
                  </button>
                )}
              </div>

              {leadProposals.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                  No proposal generated yet. Click above to generate an A4 branded proposal &amp; quotation with PDF export.
                </p>
              ) : (
                <div className="space-y-2">
                  {leadProposals.map(prop => (
                    <div
                      key={prop.id}
                      className="bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-400">
                            {prop.proposalNumber}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            prop.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : prop.status === 'Sent'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : prop.status === 'Declined'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {prop.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {prop.title}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(prop.createdAt)} • Valid till {formatDate(prop.validUntil)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                          {formatPKR(prop.grandTotalPKR)}
                        </div>
                        {onOpenProposalModal && (
                          <button
                            type="button"
                            onClick={() => onOpenProposalModal(lead, prop)}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View / Print PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Context Notes */}
            {lead.notes && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px] block mb-1 font-bold uppercase">Original Inquiry Notes</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Full Activity & Interaction Timeline */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Chronological Activity Timeline ({timelineItems.length})
                </h3>
              </div>
              <button
                onClick={() => setIsActivityFormOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Log New Activity</span>
              </button>
            </div>

            <div className="space-y-3">
              {timelineItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No interaction activities logged yet for this lead.
                </div>
              ) : (
                timelineItems.map((item, index) => {
                  let badgeBg = 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200';
                  let icon = <Phone className="w-3.5 h-3.5" />;

                  if (item.type === 'whatsapp') {
                    badgeBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200';
                    icon = <MessageCircle className="w-3.5 h-3.5" />;
                  } else if (item.type === 'meeting') {
                    badgeBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200';
                    icon = <Calendar className="w-3.5 h-3.5" />;
                  } else if (item.type === 'demo') {
                    badgeBg = 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200';
                    icon = <Sparkles className="w-3.5 h-3.5" />;
                  } else if (item.type === 'stage_change') {
                    badgeBg = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200';
                    icon = <ArrowRight className="w-3.5 h-3.5" />;
                  } else if (item.type === 'reassign') {
                    badgeBg = 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200';
                    icon = <UserCheck className="w-3.5 h-3.5" />;
                  }

                  return (
                    <div
                      key={item.id || index}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs flex items-start gap-3"
                    >
                      <div className={`p-2 rounded-xl border ${badgeBg} shrink-0 mt-0.5`}>
                        {icon}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {formatDateTime(item.timestamp)}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span>By: <strong className="text-slate-700 dark:text-slate-300">{item.author}</strong></span>
                          {item.outcome && (
                            <span>• Outcome: <strong className="text-indigo-600 dark:text-indigo-400">{item.outcome}</strong></span>
                          )}
                          {item.duration && (
                            <span>• Duration: {item.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
