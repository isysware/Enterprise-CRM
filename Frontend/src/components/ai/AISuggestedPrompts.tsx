import React, { useMemo } from 'react';
import { SuggestedPrompt } from './types';
import { Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

interface AISuggestedPromptsProps {
  currentPage: string;
  role: string;
  capabilities: {
    canViewReports: boolean;
    canGenerateProposals: boolean;
    canViewAllLeads: boolean;
    canAccessAdmin: boolean;
  };
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export const AISuggestedPrompts: React.FC<AISuggestedPromptsProps> = ({
  currentPage,
  role,
  capabilities,
  onSelectPrompt,
  disabled
}) => {
  const isEmployee = role === 'Employee';
  const isSupervisorOrAdmin = ['Super Admin', 'Admin', 'Manager', 'Team Lead'].includes(role);
  const isAdminOrSuper = ['Super Admin', 'Admin'].includes(role);

  const suggestedPrompts = useMemo<SuggestedPrompt[]>(() => {
    const list: SuggestedPrompt[] = [];

    switch (currentPage) {
      case 'dashboard':
        list.push({
          id: 'dash-1',
          label: 'Summarize my pipeline',
          prompt: isEmployee
            ? 'Summarize my current assigned leads and active deal pipeline.'
            : 'Summarize our overall sales pipeline, stage distribution, and active value.',
          category: 'summary'
        });
        list.push({
          id: 'dash-2',
          label: 'What needs attention?',
          prompt: 'Identify the most critical leads or overdue activities needing attention today.',
          category: 'action'
        });
        list.push({
          id: 'dash-3',
          label: 'Show missed follow-ups',
          prompt: 'List all overdue follow-ups within my scope and recommend next steps.',
          category: 'action'
        });

        if (isSupervisorOrAdmin && !isEmployee) {
          list.push({
            id: 'dash-4',
            label: 'Explain team performance',
            prompt: 'Explain current conversion metrics, team velocity, and pipeline bottlenecks.',
            category: 'analysis'
          });
        }
        break;

      case 'leads':
        list.push({
          id: 'leads-1',
          label: 'Summarize visible leads',
          prompt: 'Provide a breakdown of my visible leads by status, deal value, and priority.',
          category: 'summary'
        });
        list.push({
          id: 'leads-2',
          label: 'Which leads require attention?',
          prompt: 'Highlight urgent leads or leads in early stages that have not been contacted recently.',
          category: 'action'
        });
        list.push({
          id: 'leads-3',
          label: 'Draft a follow-up message',
          prompt: 'Draft a professional WhatsApp and email follow-up message for high-priority leads.',
          category: 'draft'
        });
        list.push({
          id: 'leads-4',
          label: 'Explain this pipeline',
          prompt: 'Analyze conversion rates across New, Contacted, and Qualified stages.',
          category: 'analysis'
        });
        break;

      case 'followups':
      case 'calendar':
        list.push({
          id: 'fu-1',
          label: 'Summarize overdue follow-ups',
          prompt: 'Summarize all overdue calls and meetings, sorted by urgency and deal impact.',
          category: 'summary'
        });
        list.push({
          id: 'fu-2',
          label: 'What should I prioritize today?',
          prompt: 'Give me a recommended schedule and priority order for today\'s scheduled follow-ups.',
          category: 'action'
        });
        list.push({
          id: 'fu-3',
          label: 'Draft follow-up greeting',
          prompt: 'Draft an effective follow-up script addressing a client who missed a scheduled call.',
          category: 'draft'
        });
        break;

      case 'clients':
        list.push({
          id: 'cli-1',
          label: 'Summarize my clients',
          prompt: 'Summarize active converted accounts, total contract value, and recurring services.',
          category: 'summary'
        });
        list.push({
          id: 'cli-2',
          label: 'Draft client check-in message',
          prompt: 'Draft a professional quarterly relationship review email for active clients.',
          category: 'draft'
        });
        if (capabilities.canGenerateProposals) {
          list.push({
            id: 'cli-3',
            label: 'Upsell proposal ideas',
            prompt: 'Suggest potential software upgrades or add-on modules for existing client profiles.',
            category: 'analysis'
          });
        }
        break;

      case 'reports':
      case 'reports-sales-pipeline':
      case 'reports-team-staff':
      case 'reports-followups-activity':
      case 'reports-clients-conversions':
      case 'reports-source-service':
      case 'reports-commercial-revenue':
        if (capabilities.canViewReports) {
          if (currentPage === 'reports-team-staff') {
            list.push({
              id: 'rep-team-1',
              label: 'Explain team performance',
              prompt: 'Analyze conversion rates, response times, and workload balance across our sales staff.',
              category: 'analysis'
            });
            list.push({
              id: 'rep-team-2',
              label: 'Identify top performers',
              prompt: 'Who are our highest converting representatives and what deal volume have they closed?',
              category: 'summary'
            });
            list.push({
              id: 'rep-team-3',
              label: 'Analyze workload distribution',
              prompt: 'Review active lead allocations and pinpoint reps who may be over or under capacity.',
              category: 'analysis'
            });
          } else if (currentPage === 'reports-followups-activity') {
            list.push({
              id: 'rep-fu-1',
              label: 'Summarize follow-up compliance',
              prompt: 'Explain our follow-up completion rate and highlight recurring overdue patterns.',
              category: 'analysis'
            });
            list.push({
              id: 'rep-fu-2',
              label: 'Analyze activity velocity',
              prompt: 'Review scheduled touches, completion cadence, and responsiveness on high-priority leads.',
              category: 'summary'
            });
          } else if (currentPage === 'reports-clients-conversions') {
            list.push({
              id: 'rep-cli-1',
              label: 'Analyze client acquisition',
              prompt: 'Summarize converted client numbers, conversion cycle times, and retention rates.',
              category: 'summary'
            });
            list.push({
              id: 'rep-cli-2',
              label: 'Average client value',
              prompt: 'What is our average client deal size and which segments generate highest lifetime value?',
              category: 'analysis'
            });
          } else if (currentPage === 'reports-source-service') {
            list.push({
              id: 'rep-src-1',
              label: 'Evaluate lead source ROI',
              prompt: 'Which lead acquisition channels (Meta Ads, WhatsApp, Website) deliver highest conversion yields?',
              category: 'analysis'
            });
            list.push({
              id: 'rep-src-2',
              label: 'Demand across services',
              prompt: 'Break down customer demand by software service offering and identify top growth drivers.',
              category: 'summary'
            });
          } else if (currentPage === 'reports-commercial-revenue') {
            list.push({
              id: 'rep-rev-1',
              label: 'Explain commercial revenue',
              prompt: 'Summarize realized revenue, pending receivables, and average deal sizes in PKR.',
              category: 'summary'
            });
            list.push({
              id: 'rep-rev-2',
              label: 'Pricing model performance',
              prompt: 'Analyze revenue distribution across dynamic pricing models, one-time versus recurring fees.',
              category: 'analysis'
            });
          } else {
            list.push({
              id: 'rep-1',
              label: 'Explain this report',
              prompt: 'Explain the key insights and trends from this sales analytics report.',
              category: 'analysis'
            });
            list.push({
              id: 'rep-2',
              label: 'Summarize pipeline velocity',
              prompt: 'Summarize win/loss ratios, average deal size, and sales velocity.',
              category: 'summary'
            });
            list.push({
              id: 'rep-3',
              label: 'Highlight conversion bottlenecks',
              prompt: 'Pinpoint which lead stages experience the highest drop-off rate and why.',
              category: 'analysis'
            });
          }
        }
        break;

      case 'users':
      case 'teams':
      case 'roles':
        if (isAdminOrSuper) {
          list.push({
            id: 'adm-1',
            label: 'Explain team coverage',
            prompt: 'Summarize team assignments, supervisory leadership, and staff distribution.',
            category: 'analysis'
          });
          list.push({
            id: 'adm-2',
            label: 'Role governance summary',
            prompt: 'Explain the access scope and security capabilities assigned across roles.',
            category: 'summary'
          });
        }
        break;

      default:
        list.push({
          id: 'gen-1',
          label: isEmployee ? 'Summarize my leads' : 'Summarize pipeline',
          prompt: isEmployee
            ? 'Summarize my currently assigned leads and immediate priorities.'
            : 'Summarize current sales pipeline and top priorities.',
          category: 'summary'
        });
        list.push({
          id: 'gen-2',
          label: isEmployee ? 'My missed follow-ups' : 'Show overdue follow-ups',
          prompt: 'Review overdue follow-ups and recommend recovery actions.',
          category: 'action'
        });
        break;
    }

    return list;
  }, [currentPage, role, capabilities, isEmployee, isSupervisorOrAdmin, isAdminOrSuper]);

  if (suggestedPrompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
        <Sparkles className="w-3 h-3 text-[#2563EB]" />
        <span>Suggested Prompts</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {suggestedPrompts.map(sp => (
          <button
            key={sp.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(sp.prompt)}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[#E5EAF1] dark:border-slate-700 hover:border-[#2563EB]/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 hover:text-[#2563EB] dark:hover:text-blue-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={sp.prompt}
          >
            <MessageSquare className="w-3 h-3 text-slate-400 group-hover:text-[#2563EB] transition-colors shrink-0" />
            <span className="truncate max-w-[190px]">{sp.label}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all shrink-0 text-[#2563EB]" />
          </button>
        ))}
      </div>
    </div>
  );
};
