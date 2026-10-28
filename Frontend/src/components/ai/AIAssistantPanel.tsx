import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Info,
  Layers,
  MapPin,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { AIMessage } from './types';
import { AISuggestedPrompts } from './AISuggestedPrompts';
import { AIQuickInsights } from './AIQuickInsights';
import { buildAIAuthorizedContext, getAIScopeType } from '../../utils/buildAIAuthorizedContext';
import { aiAssistantService } from '../../services/aiAssistantService';
import { formatPKR } from '../../utils/formatters';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  currentPage
}) => {
  const {
    currentUser,
    scopedLeads,
    scopedClients,
    scopedFollowUps,
    canViewAllLeads,
    canViewReports,
    canGenerateProposals,
    canManageFollowUps,
    canBulkImportExport,
    canViewIncomingLeads,
    canAccessAdmin
  } = useCRM();

  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  if (!currentUser) return null;
  if (!isOpen) return null;

  const scopeLabel = getAIScopeType(currentUser.role);

  // High-level metrics for Quick Insights
  const todayStr = new Date().toISOString().split('T')[0];
  const totalPipelineValuePKR = scopedLeads.reduce(
    (sum, l) => sum + (Number(l.valuePKR) || 0),
    0
  );
  const activeLeadsCount = scopedLeads.filter(
    l => !['Lost', 'Converted', 'Cold', 'Returned'].includes(l.status)
  ).length;
  const urgentLeadsCount = scopedLeads.filter(
    l => l.priority === 'Urgent' || l.priority === 'High'
  ).length;
  const overdueFollowUpsCount = scopedFollowUps.filter(
    fu => fu.status === 'Pending' && fu.scheduledDate < todayStr
  ).length;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSubmitting) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSubmitting(true);

    // Build the sanitized, role-scoped AI business context
    const requestPayload = buildAIAuthorizedContext(
      {
        currentUser,
        currentPage,
        scopedLeads,
        scopedClients,
        scopedFollowUps,
        capabilities: {
          canViewAllLeads: !!canViewAllLeads,
          canViewReports: !!canViewReports,
          canGenerateProposals: !!canGenerateProposals,
          canManageFollowUps: !!canManageFollowUps,
          canBulkImportExport: !!canBulkImportExport,
          canViewIncomingLeads: !!canViewIncomingLeads,
          canAccessAdmin: !!canAccessAdmin
        }
      },
      text
    );

    try {
      const response = await aiAssistantService.sendMessage(requestPayload);

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          response.message ||
          'AI Assistant is ready in the CRM interface. The secure AI service will be connected during backend integration.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotice: true
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          'Secure AI service is not connected yet. Backend integration will be mounted during server deployment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotice: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const formatPageName = (page: string) => {
    if (page.startsWith('reports-')) {
      const sub = page.replace('reports-', '');
      const reportLabels: Record<string, string> = {
        'sales-pipeline': 'Reports: Sales & Pipeline',
        'team-staff': 'Reports: Team & Staff',
        'followups-activity': 'Reports: Follow-Ups',
        'clients-conversions': 'Reports: Clients',
        'source-service': 'Reports: Source & Service',
        'commercial-revenue': 'Reports: Commercial'
      };
      return reportLabels[sub] || 'Reports';
    }
    switch (page) {
      case 'incoming-leads':
        return 'Incoming Leads';
      case 'followups':
        return 'Follow-Ups';
      case 'reports':
        return 'Reports';
      default:
        return page.charAt(0).toUpperCase() + page.slice(1);
    }
  };

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 sm:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="CRM AI Assistant"
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white dark:bg-slate-900 border-l border-[#E5EAF1] dark:border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="p-4 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm text-[#0F172A] dark:text-white truncate">
                  AI Assistant
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  Frontend Preview
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                {currentUser.name} • {currentUser.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close Assistant"
              aria-label="Close Assistant panel"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CONTEXT BAR (Safe Context Chips)                                       */}
        {/* ========================================================================= */}
        <div className="px-4 py-2.5 bg-[#F7F9FC] dark:bg-slate-850 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Context:
          </span>

          {/* Current Page Chip */}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {formatPageName(currentPage)}
          </span>

          {/* Role Chip */}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3 h-3 text-[#2563EB]" />
            {currentUser.role}
          </span>

          {/* Authorized Scope Chip */}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            <Layers className="w-3 h-3 text-[#2563EB]" />
            {scopeLabel}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 3. SCROLLABLE CONVERSATION & INSIGHTS BODY                                */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* CRM Quick Insights Section */}
          <AIQuickInsights
            totalPipelineValuePKR={totalPipelineValuePKR}
            activeLeadsCount={activeLeadsCount}
            urgentLeadsCount={urgentLeadsCount}
            overdueFollowUpsCount={overdueFollowUpsCount}
            scopeLabel={scopeLabel}
          />

          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0F172A] dark:text-white">
                    How can I help with your CRM work?
                  </h3>
                  <p className="text-[10px] text-[#64748B] dark:text-slate-400">
                    Scoped to your authorized data as {currentUser.role}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed">
                The CRM Assistant helps summarize pipeline metrics, surface urgent follow-ups, and draft professional communications.
              </p>

              {/* Status Note */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Backend AI integration pending. Client context contracts and scope ceilings are active.
                </span>
              </div>
            </div>
          )}

          {/* Contextual Suggested Prompts */}
          <AISuggestedPrompts
            currentPage={currentPage}
            role={currentUser.role}
            capabilities={{
              canViewReports: !!canViewReports,
              canGenerateProposals: !!canGenerateProposals,
              canViewAllLeads: !!canViewAllLeads,
              canAccessAdmin: !!canAccessAdmin
            }}
            onSelectPrompt={prompt => handleSendMessage(prompt)}
            disabled={isSubmitting}
          />

          {/* Message History */}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              } space-y-1`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2563EB] text-white rounded-br-xs shadow-xs'
                    : msg.isNotice
                    ? 'bg-blue-50/70 dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700 text-[#0F172A] dark:text-slate-200 rounded-bl-xs'
                    : 'bg-white dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 rounded-bl-xs shadow-2xs'
                }`}
              >
                {msg.isNotice && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] dark:text-blue-400 mb-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Service Notice</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-[10px] text-slate-400 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {/* Submitting indicator */}
          {isSubmitting && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-[#64748B] dark:text-slate-400 text-xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
              <span>Verifying authorized context...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* 4. COMPOSER / INPUT FOOTER                                                */}
        {/* ========================================================================= */}
        <div className="p-3.5 border-t border-[#E5EAF1] dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Ask about pipeline, leads, follow-ups..."
              disabled={isSubmitting}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSubmitting}
              className="w-9 h-9 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send prompt"
              aria-label="Send prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Frontend Preview Contract</span>
            <span>AI backend not connected</span>
          </div>
        </div>
      </aside>
    </>
  );
};
