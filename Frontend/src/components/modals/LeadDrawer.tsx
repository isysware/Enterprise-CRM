import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
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
import { DrawerShell, Button, Badge, FormField, Input, Select, Textarea } from '../ui';

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
  { status: 'Qualified', label: 'Qualified' },
  { status: 'Won', label: 'Won' },
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
  const [activityOutcome, setActivityOutcome] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);

  const lead = leads.find(l => l.id === leadId);

  if (!leadId || !lead) return null;

  const leadFollowUps = followUps.filter(f => f.leadId === lead.id);
  const leadProposals = (proposals || []).filter(p => p.leadId === lead.id);
  const statusStyle = getStatusBadgeStyle(lead.status);
  const priorityStyle = getPriorityBadge(lead.priority);
  const qualityStyle = getQualityBadge(lead.quality);
  const waUrl = getWhatsAppUrl(lead.phone, lead.name, lead.businessName);

  // Combine lead activities and followups chronologically without fabricating data
  const timelineItems = [
    ...(lead.activities || []).map(act => ({
      id: act.id,
      type: act.type,
      title: act.title,
      notes: act.notes,
      timestamp: act.timestamp,
      author: act.author || undefined,
      outcome: act.outcome || undefined,
      duration: act.duration || undefined,
      isFollowUp: false
    })),
    ...leadFollowUps.map(fu => ({
      id: fu.id,
      type: (fu.type.toLowerCase() === 'call' ? 'call' : fu.type.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'meeting') as ActivityType,
      title: `Follow-up ${fu.type}: ${fu.status}`,
      notes: fu.notes,
      timestamp: fu.createdAt || `${fu.scheduledDate}T${fu.scheduledTime || '09:00'}:00.000Z`,
      author: fu.assignedToName || undefined,
      outcome: fu.resultNotes ? fu.resultNotes : undefined,
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
      outcome: activityOutcome.trim() || undefined,
      duration: activityDuration.trim() || undefined
    });

    setActivityTitle('');
    setActivityNotes('');
    setActivityDuration('');
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

  const drawerTitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-medium text-[#0F172A] dark:text-white text-base">
        {lead.businessName}
      </span>
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusStyle.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} inline-block mr-1`} />
        {lead.status}
      </span>
    </div>
  );

  const drawerSubtitle = (
    <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
      <span>{lead.name}</span>
      <span>•</span>
      <span>{lead.city}</span>
      <span>•</span>
      <span className="font-mono">{lead.phone}</span>
    </div>
  );

  const drawerFooter = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400">
        <span>Pipeline Value:</span>
        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
          {formatPKR(lead.valuePKR)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onOpenConvertModal && lead.status !== 'Converted' && (
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={() => onOpenConvertModal(lead.id)}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Convert Lead
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <DrawerShell
      isOpen={!!leadId}
      onClose={onClose}
      size="xl"
      title={drawerTitle}
      subtitle={drawerSubtitle}
      icon={<Building2 className="w-5 h-5 text-[#2563EB]" />}
      footer={drawerFooter}
    >
      <div className="space-y-6">
        {/* Deal Value Hero Strip */}
        <div className="bg-gradient-to-r from-[#EFF6FF] to-blue-50/40 dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 block">
              Estimated Deal Value
            </span>
            <span className="text-2xl font-medium font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatPKR(lead.valuePKR)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold ${priorityStyle.badge}`}>
              Priority: {priorityStyle.label}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-lg border font-semibold ${qualityStyle.badge}`}>
              Quality: {qualityStyle.label}
            </span>
          </div>
        </div>

        {/* Interactive Stage Progression Bar */}
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">
                Pipeline Stage Progression
              </span>
              <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                Current Status: {lead.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <label htmlFor="lead-status-select" className="text-[11px] text-[#64748B] dark:text-slate-400">
                Set Status:
              </label>
              <select
                id="lead-status-select"
                value={lead.status}
                onChange={e => handleQuickStageClick(e.target.value as LeadStatus)}
                className="text-xs font-semibold px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-[#0F172A] dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                {(['New', 'Contacted', 'Follow-Up Required', 'Qualified', 'Won', 'Hold', 'Cold', 'Returned', 'Converted', 'Lost'] as LeadStatus[]).map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Steps line */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
            {STAGES_FLOW.map((stage, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = lead.status === stage.status;

              return (
                <button
                  key={stage.status}
                  type="button"
                  onClick={() => handleQuickStageClick(stage.status)}
                  title={`Click to set stage to ${stage.label}`}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold shadow-xs'
                      : isPassed
                      ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border-blue-200 dark:border-blue-900 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent
                      ? 'bg-white text-[#2563EB] font-bold'
                      : isPassed
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                  </div>
                  <span className="text-[10px] text-center leading-tight truncate w-full">
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Other Outcome Stages */}
          <div className="mt-3 pt-3 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-[#64748B] dark:text-slate-400 text-[11px]">Outcome &amp; Terminus States:</span>
            <div className="flex gap-1.5 flex-wrap">
              {(['Hold', 'Cold', 'Returned', 'Lost'] as LeadStatus[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleQuickStageClick(st)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    lead.status === st
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp</span>
          </a>

          <a
            href={`tel:${lead.phone}`}
            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 text-[#2563EB] dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <Phone className="w-4 h-4 text-[#2563EB]" />
            <span>Direct Call</span>
          </a>

          <button
            type="button"
            onClick={() => onOpenScheduleModal(lead.id)}
            className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Follow-Up</span>
          </button>

          {canGenerateProposals && onOpenProposalModal && (
            <button
              type="button"
              onClick={() => onOpenProposalModal(lead)}
              className="p-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] border border-[#2563EB] flex items-center justify-center gap-1.5 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              <span>Proposal</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsActivityFormOpen(!isActivityFormOpen)}
            className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Log Note</span>
          </button>

          {onOpenConvertModal && (
            <button
              type="button"
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
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                Log Interaction &amp; Activity
              </span>
              <button
                type="button"
                onClick={() => setIsActivityFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                <select
                  value={activityType}
                  onChange={e => setActivityType(e.target.value as ActivityType)}
                  className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
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
                  className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
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
                  className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Summary Title</label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={e => setActivityTitle(e.target.value)}
                  placeholder="e.g. Feature Demo Call"
                  className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notes &amp; Next Steps</label>
              <textarea
                value={activityNotes}
                onChange={e => setActivityNotes(e.target.value)}
                placeholder="Enter detailed conversation outcome, client questions, pricing discussed..."
                rows={2}
                className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Save Activity Log
              </Button>
            </div>
          </form>
        )}

        {/* Lead Contact Specifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
            Contact &amp; Account Specifications
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Phone Number</span>
              <span className="font-mono font-medium text-[#0F172A] dark:text-white mt-0.5 block">{lead.phone}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Email Address</span>
              <span className="font-mono text-[#0F172A] dark:text-white mt-0.5 block truncate">{lead.email}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Location / City</span>
              <span className="font-semibold text-[#0F172A] dark:text-white mt-0.5 block">{lead.city}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Lead Source</span>
              <span className="font-semibold text-[#0F172A] dark:text-white mt-0.5 block">{lead.source}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Priority &amp; Quality</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityStyle.badge}`}>
                  {priorityStyle.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${qualityStyle.badge}`}>
                  {qualityStyle.label}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block">Assigned Representative</span>
              <div className="flex items-center justify-between mt-1 gap-1">
                <span className="font-bold text-[#0F172A] dark:text-white text-xs truncate">
                  {lead.assignedToName}
                </span>
                {canReassignLeadItem(lead) && (
                  <select
                    value={lead.assignedToId}
                    onChange={e => {
                      const targetUser = users.find(u => u.id === e.target.value);
                      if (targetUser) {
                        reassignLead(lead.id, targetUser.id);
                      }
                    }}
                    className="text-[10px] bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-300 font-semibold rounded px-1.5 py-0.5 border border-[#E5EAF1] dark:border-slate-600 focus:outline-none cursor-pointer"
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
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800">
            <span className="text-[#64748B] dark:text-slate-400 text-[11px] block mb-1.5 font-bold uppercase">
              Requested Services &amp; Systems
            </span>
            <div className="flex flex-wrap gap-1.5">
              {lead.services.map(srv => (
                <span
                  key={srv}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-blue-950 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900"
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
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                {lead.budgetType || lead.pricingModel || 'No Budget Discussed'}
              </span>
            </div>

            {lead.budgetDetails && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 text-[11px]">
                {lead.budgetDetails.monthlySubscriptionFee !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Monthly Sub</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.monthlySubscriptionFee)}</span>
                  </div>
                )}
                {lead.budgetDetails.oneTimeSetupFee !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Setup Fee</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.oneTimeSetupFee)}</span>
                  </div>
                )}
                {lead.budgetDetails.monthlySupportFee !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Support Fee</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.monthlySupportFee)}</span>
                  </div>
                )}
                {lead.budgetDetails.totalInitialPayment !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Initial Payment</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">{formatPKR(lead.budgetDetails.totalInitialPayment)}</span>
                  </div>
                )}
                {lead.budgetDetails.ownershipPrice !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Ownership Price</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.ownershipPrice)}</span>
                  </div>
                )}
                {lead.budgetDetails.totalProjectPrice !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Project Price</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.totalProjectPrice)}</span>
                  </div>
                )}
                {lead.budgetDetails.advanceMilestoneAmount !== undefined && (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Advance Amount</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.advanceMilestoneAmount)}</span>
                  </div>
                )}
                {lead.budgetDetails.otherFeeAmount ? (
                  <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[#64748B] dark:text-slate-400 block text-[10px]">Other Fee</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{formatPKR(lead.budgetDetails.otherFeeAmount)}</span>
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
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#2563EB] dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5 text-[#2563EB]" />
                Proposals &amp; Quotations ({leadProposals.length})
              </span>
              {canGenerateProposals && onOpenProposalModal && (
                <button
                  type="button"
                  onClick={() => onOpenProposalModal(lead)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Proposal</span>
                </button>
              )}
            </div>

            {leadProposals.length === 0 ? (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 py-1">
                No proposal generated yet. Click above to generate an A4 branded proposal &amp; quotation with PDF export.
              </p>
            ) : (
              <div className="space-y-2">
                {leadProposals.map(prop => (
                  <div
                    key={prop.id}
                    className="bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-[11px] text-[#2563EB] dark:text-blue-400">
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
                      <p className="text-[11px] font-medium text-[#0F172A] dark:text-slate-200 truncate mt-0.5">
                        {prop.title}
                      </p>
                      <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                        {formatDate(prop.createdAt)} • Valid till {formatDate(prop.validUntil)}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
                        {formatPKR(prop.grandTotalPKR)}
                      </div>
                      {onOpenProposalModal && (
                        <button
                          type="button"
                          onClick={() => onOpenProposalModal(lead, prop)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View PDF</span>
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
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E5EAF1] dark:border-slate-800 text-xs">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] block mb-1 font-bold uppercase">
                Original Inquiry Notes
              </span>
              <p className="text-[#0F172A] dark:text-slate-300 leading-relaxed">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Chronological Activity Timeline */}
        <div className="space-y-3 pt-4 border-t border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                Chronological Activity Timeline ({timelineItems.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsActivityFormOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Activity</span>
            </button>
          </div>

          <div className="space-y-3">
            {timelineItems.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] dark:text-slate-400 text-xs border border-dashed border-[#E5EAF1] dark:border-slate-800 rounded-2xl">
                No interaction activities logged yet for this lead.
              </div>
            ) : (
              timelineItems.map((item, index) => {
                let badgeBg = 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border-blue-200';
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
                  badgeBg = 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border-blue-200';
                  icon = <ArrowRight className="w-3.5 h-3.5" />;
                } else if (item.type === 'reassign') {
                  badgeBg = 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200';
                  icon = <UserCheck className="w-3.5 h-3.5" />;
                }

                return (
                  <div
                    key={item.id || index}
                    className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs flex items-start gap-3"
                  >
                    <div className={`p-2 rounded-xl border ${badgeBg} shrink-0 mt-0.5`}>
                      {icon}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#0F172A] dark:text-white">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B] dark:text-slate-400 shrink-0">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.notes}
                        </p>
                      )}

                      {(item.author || item.outcome || item.duration) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#64748B] dark:text-slate-400">
                          {item.author && (
                            <span>By: <strong className="text-[#0F172A] dark:text-slate-200">{item.author}</strong></span>
                          )}
                          {item.outcome && (
                            <span>• Outcome: <strong className="text-[#2563EB] dark:text-blue-400">{item.outcome}</strong></span>
                          )}
                          {item.duration && (
                            <span>• Duration: {item.duration}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
};
