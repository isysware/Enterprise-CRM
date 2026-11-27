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
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Paperclip,
  CheckCircle2,
  TrendingUp,
  Calendar,
  PhoneCall,
  FileText,
  Users
} from 'lucide-react';
import { AIMessage } from './types';
import { aiApi } from '../../api';
import { buildAIAuthorizedContext, getAIScopeType } from '../../utils/buildAIAuthorizedContext';
import { formatPKR } from '../../utils/formatters';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
}

interface QuickTopic {
  id: string;
  label: string;
  prompt: string;
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
  const [showDetails, setShowDetails] = useState(false);

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
  const todayStr = new Date().toISOString().split('T')[0];

  // Scoped metrics
  const totalPipelineVal = scopedLeads.reduce((s, l) => s + (Number(l.valuePKR) || 0), 0);
  const activeLeadsCount = scopedLeads.filter(l => !['Lost', 'Converted', 'Cold'].includes(l.status)).length;
  const dueTodayFUs = scopedFollowUps.filter(f => f.scheduledDate === todayStr && f.status === 'Pending').length;
  const overdueFUs = scopedFollowUps.filter(f => f.status === 'Pending' && f.scheduledDate < todayStr).length;

  // Options / Topic pills based on user request & reference image
  const QUICK_TOPICS: QuickTopic[] = [
    {
      id: 'leads',
      label: 'Leads',
      prompt: `Provide a quick summary of our ${activeLeadsCount} active leads and recent deal stages.`
    },
    {
      id: 'followups',
      label: 'Follow-Ups',
      prompt: `What follow-ups are due today (${dueTodayFUs}) or overdue (${overdueFUs})?`
    },
    {
      id: 'clients',
      label: 'Clients',
      prompt: `Give me an overview of converted customer accounts (${scopedClients.length} clients).`
    },
    {
      id: 'pipeline',
      label: 'Pipeline Value',
      prompt: `What is our current authorized pipeline valuation? (Active: ${formatPKR(totalPipelineVal)})`
    },
    {
      id: 'proposals',
      label: 'Proposals',
      prompt: 'Summarize commercial quotations and draft proposals currently active.'
    },
    {
      id: 'reports',
      label: 'Reports',
      prompt: 'Summarize sales velocity, conversion yields, and departmental benchmarks.'
    },
    {
      id: 'urgent',
      label: 'Urgent Tasks',
      prompt: 'Which high priority and urgent leads require immediate attention?'
    },
    {
      id: 'due-today',
      label: 'Due Today',
      prompt: `List all calls, visits, and follow-up activities scheduled for today (${todayStr}).`
    },
    {
      id: 'team',
      label: 'Team Performance',
      prompt: 'How is sales accountability and agent follow-up discipline tracking this month?'
    },
    {
      id: 'insights',
      label: 'Quick Insights',
      prompt: 'Provide high-level recommendations to increase our CRM deal closure velocity.'
    }
  ];

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
    buildAIAuthorizedContext(
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
      const historyPayload = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const mappedScope = ['leads', 'follow-ups', 'pipeline', 'staff', 'clients', 'dashboard', 'reports', 'calendar'].includes(currentPage)
        ? currentPage
        : 'general';

      const res = await aiApi.askAssistant({
        prompt: text,
        contextScope: mappedScope,
        history: historyPayload
      });

      let reply = res.answer;
      if (res.insights && res.insights.length > 0) {
        reply += '\n\n**Insights:**\n' + res.insights.map(i => `• ${i}`).join('\n');
      }

      const botMsg: AIMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: unknown) {
      const errorMsg: AIMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Unable to connect to AI assistant service. Please check network and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 sm:hidden"
        aria-hidden="true"
      />

      {/* Floating CRM Copilot Widget (Matches user reference design in Royal Blue) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="CRM Copilot"
        className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 w-[94vw] sm:w-[420px] h-[590px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-[#E5EAF1] dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-fadeIn font-sans"
      >
        {/* ========================================================================= */}
        {/* 1. TOP BANNER: USER'S ROYAL BLUE THEME WITH AVATAR & GREETING             */}
        {/* ========================================================================= */}
        <div className="bg-[#2563EB] text-white p-5 pb-4 relative shrink-0 shadow-xs">
          {/* Top Bar: Icon + User Name + Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                Hello {currentUser.name}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Close chat"
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Welcome Text Matching Reference */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Welcome to our live CRM Copilot!
            </h3>
            <p className="text-xs text-blue-100/90 font-normal leading-relaxed">
              Start chatting with us - we will be happy to help.
            </p>
          </div>

          {/* "My details ⌄" toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-white/90 hover:text-white font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>My details</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Expandable User & Scope Details Card */}
            {showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs text-white space-y-1.5 animate-fadeIn">
                <div className="flex justify-between">
                  <span className="text-blue-100">Portal Role:</span>
                  <span className="font-bold">{currentUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Authorized Scope:</span>
                  <span className="font-semibold">{scopeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Active Deals:</span>
                  <span className="font-mono font-bold">{activeLeadsCount} Leads</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Pipeline Load:</span>
                  <span className="font-mono font-bold">{formatPKR(totalPipelineVal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. QUICK TOPIC OPTIONS (PILLS CLUSTER MATCHING REFERENCE IMAGE)            */}
        {/* ========================================================================= */}
        <div className="p-3.5 pb-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            <span>Quick Options</span>
            <span className="text-[10px] lowercase font-normal text-slate-400">Click to ask</span>
          </div>

          {/* Pill Chips Cluster */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {QUICK_TOPICS.map(topic => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSendMessage(topic.prompt)}
                disabled={isSubmitting}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-blue-400 font-semibold border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CONVERSATION MESSAGES SCROLL AREA                                      */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC] dark:bg-slate-950/50 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                How can we help you today?
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Click any option above like <strong>Leads</strong>, <strong>Follow-Ups</strong>, or <strong>Pipeline Value</strong>, or type your message below.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } space-y-1`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2563EB] text-white rounded-br-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))
          )}

          {isSubmitting && (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#2563EB] text-xs w-fit shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span className="text-slate-600 dark:text-slate-300 text-[11px]">Analyzing CRM data...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* 4. COMPOSER FOOTER (MATCHING REFERENCE "What can we help you with?")       */}
        {/* ========================================================================= */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="What can we help you with?"
                disabled={isSubmitting}
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:opacity-50 transition-all"
              />
              <button
                type="button"
                onClick={() => handleSendMessage('Summarize my visible pipeline and urgent tasks.')}
                title="Quick attach context"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isSubmitting}
              className="w-9 h-9 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send message"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </>
  );
};
