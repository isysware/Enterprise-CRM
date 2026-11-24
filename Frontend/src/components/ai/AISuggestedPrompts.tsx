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

    // Role-specific base definitions
    const isManagerOrTL = ['Manager', 'Team Lead'].includes(role);

    switch (currentPage) {
      case 'dashboard':
        if (isEmployee) {
          list.push({
            id: 'dash-emp-1',
            label: 'Summarize my visible pipeline',
            prompt: 'Summarize my visible pipeline and personal deal stages.',
            category: 'summary'
          });
          list.push({
            id: 'dash-emp-2',
            label: 'Which leads need attention?',
            prompt: 'Which of my assigned leads require attention today?',
            category: 'action'
          });
          list.push({
            id: 'dash-emp-3',
            label: 'My pending follow-ups',
            prompt: 'List my scheduled and overdue follow-up tasks.',
            category: 'action'
          });
        } else if (isManagerOrTL) {
          list.push({
            id: 'dash-mgr-1',
            label: 'Pipeline summary',
            prompt: 'Provide a pipeline summary for my authorized hierarchy.',
            category: 'summary'
          });
          list.push({
            id: 'dash-mgr-2',
            label: 'Team workload',
            prompt: 'Analyze active lead allocations and workload balance across our team members.',
            category: 'analysis'
          });
          list.push({
            id: 'dash-mgr-3',
            label: 'Rep performance',
            prompt: 'Compare sales velocity, responsiveness, and conversion rates across representatives.',
            category: 'analysis'
          });
          list.push({
            id: 'dash-mgr-4',
            label: 'Missed follow-ups',
            prompt: 'Review missed follow-ups across the team and identify stalled opportunities.',
            category: 'action'
          });
        } else {
          // Super Admin / Admin
          list.push({
            id: 'dash-adm-1',
            label: 'Pipeline summary',
            prompt: 'Provide an organization-level sales pipeline summary with stage distribution.',
            category: 'summary'
          });
          list.push({
            id: 'dash-adm-2',
            label: 'Team workload',
            prompt: 'Review organization-wide workload distribution and capacity across teams.',
            category: 'analysis'
          });
          list.push({
            id: 'dash-adm-3',
            label: 'Rep performance',
            prompt: 'Analyze conversion rates and performance metrics across departments.',
            category: 'analysis'
          });
          list.push({
            id: 'dash-adm-4',
            label: 'Missed follow-ups',
            prompt: 'Identify all overdue customer touchpoints and compliance bottlenecks.',
            category: 'action'
          });
        }
        break;

      case 'leads':
        list.push({
          id: 'leads-1',
          label: 'Summarize my visible pipeline',
          prompt: isEmployee
            ? 'Summarize my assigned leads and current pipeline value.'
            : 'Summarize my visible pipeline with stage-wise deal volume.',
          category: 'summary'
        });
        list.push({
          id: 'leads-2',
          label: 'Which leads need attention?',
          prompt: 'Which leads need attention based on urgency, age, and last activity?',
          category: 'action'
        });
        list.push({
          id: 'leads-3',
          label: 'Show urgent/high-priority leads',
          prompt: 'Filter and list all urgent or high-priority leads needing prompt follow-up.',
          category: 'action'
        });
        list.push({
          id: 'leads-4',
          label: 'Draft a follow-up message',
          prompt: 'Draft a professional follow-up message for hot prospects.',
          category: 'draft'
        });
        break;

      case 'followups':
      case 'calendar':
        list.push({
          id: 'fu-1',
          label: 'What is due today?',
          prompt: 'What follow-ups and client meetings are scheduled for today?',
          category: 'action'
        });
        list.push({
          id: 'fu-2',
          label: 'Which follow-ups are overdue?',
          prompt: 'Which follow-ups are overdue, and what are their priority levels?',
          category: 'action'
        });
        list.push({
          id: 'fu-3',
          label: 'Summarize my pending activity',
          prompt: isEmployee
            ? 'Summarize my pending activity and upcoming follow-ups.'
            : 'Summarize pending activity across my authorized team scope.',
          category: 'summary'
        });
        break;

      case 'clients':
        list.push({
          id: 'cli-1',
          label: 'Summarize active clients',
          prompt: 'Summarize active clients, contract value, and subscribed services.',
          category: 'summary'
        });
        list.push({
          id: 'cli-2',
          label: 'Show recent conversions',
          prompt: 'Show recently converted leads and closing attribution details.',
          category: 'summary'
        });
        if (capabilities.canGenerateProposals) {
          list.push({
            id: 'cli-3',
            label: 'Upsell proposal ideas',
            prompt: 'Identify potential renewal or software add-on opportunities for active accounts.',
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
          list.push({
            id: 'rep-1',
            label: 'Explain this report',
            prompt: 'Explain this report, key metric benchmarks, and highlights within authorized scope.',
            category: 'analysis'
          });
          list.push({
            id: 'rep-2',
            label: 'Summarize conversion performance',
            prompt: 'Summarize conversion performance and stage conversion ratios.',
            category: 'summary'
          });
          if (isSupervisorOrAdmin && !isEmployee) {
            list.push({
              id: 'rep-3',
              label: 'Compare authorized teams/users',
              prompt: 'Compare authorized teams/users in terms of deal generation and closing efficiency.',
              category: 'analysis'
            });
          }
        }
        break;

      case 'incoming-leads':
        if (!isEmployee) {
          list.push({
            id: 'inc-1',
            label: 'Analyze incoming leads',
            prompt: 'Review unassigned incoming leads and identify highest-value opportunities.',
            category: 'action'
          });
          list.push({
            id: 'inc-2',
            label: 'Channel source attribution',
            prompt: 'Break down incoming lead volume by Meta Ads, WhatsApp, and Web channels.',
            category: 'summary'
          });
        }
        break;

      default:
        list.push({
          id: 'gen-1',
          label: isEmployee ? 'Summarize my visible pipeline' : 'Pipeline summary',
          prompt: isEmployee
            ? 'Summarize my assigned leads and immediate priorities.'
            : 'Summarize our visible sales pipeline and current progress.',
          category: 'summary'
        });
        list.push({
          id: 'gen-2',
          label: 'Which leads need attention?',
          prompt: 'Which leads or overdue activities need immediate intervention?',
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
