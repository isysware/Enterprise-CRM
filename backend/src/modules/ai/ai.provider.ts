import { AiAssistantResponse, AiChatMessage, AiActionProposal } from './ai.validator';

export interface ScopedCrmContext {
  actor: {
    id: string;
    name: string;
    role: string;
  };
  summary: {
    totalLeads: number;
    pipelineValuePKR: number;
    wonLeadsCount: number;
    lostLeadsCount: number;
    conversionsCount: number;
  };
  todayLeads: Array<{
    id: string;
    name: string;
    businessName: string | null;
    status: string;
    valuePKR: number;
    source: string;
    priority: string;
  }>;
  followUps: {
    missed: Array<{
      id: string;
      leadName?: string;
      phone?: string;
      scheduledDate: string;
      scheduledTime?: string | null;
      type: string;
    }>;
    today: Array<{
      id: string;
      leadName?: string;
      phone?: string;
      scheduledDate: string;
      scheduledTime?: string | null;
      type: string;
    }>;
    tomorrow: Array<{
      id: string;
      leadName?: string;
      phone?: string;
      scheduledDate: string;
      scheduledTime?: string | null;
      type: string;
    }>;
  };
  staffPerformance?: Array<{
    userName: string;
    role: string;
    teamName: string;
    assignedLeads: number;
    wonLeads: number;
    pipelineValuePKR: number;
  }>;
  recentConversions: Array<{
    clientName: string;
    businessName: string;
    finalValuePKR: number;
    convertedDate: string;
  }>;
  sourcesBreakdown: Array<{
    source: string;
    totalLeads: number;
    wonLeads: number;
  }>;
}

export interface IAiProvider {
  generateResponse(
    prompt: string,
    context: ScopedCrmContext,
    history?: AiChatMessage[]
  ): Promise<AiAssistantResponse>;
}

/**
 * Deterministic CRM Copilot Provider
 * Produces accurate, deterministic CRM operational responses based strictly on authorized PostgreSQL records.
 * Strictly NO external web queries; safe fallback when external LLM credentials are not configured.
 */
export class DeterministicCrmCopilotProvider implements IAiProvider {
  public async generateResponse(
    prompt: string,
    context: ScopedCrmContext,
    _history?: AiChatMessage[]
  ): Promise<AiAssistantResponse> {
    const lower = prompt.toLowerCase();

    // 1. Check for Mutation / Write Request
    const isMutation =
      lower.includes('change status') ||
      lower.includes('mark') ||
      lower.includes('update lead') ||
      lower.includes('delete') ||
      lower.includes('create lead') ||
      lower.includes('reassign') ||
      lower.includes('send proposal') ||
      lower.includes('send message');

    if (isMutation) {
      let actionType = 'MUTATION_REQUESTED';
      let endpoint = '/api/v1/leads';

      if (lower.includes('status') || lower.includes('won') || lower.includes('lost')) {
        actionType = 'CHANGE_STATUS';
        endpoint = '/api/v1/leads/:id/status';
      } else if (lower.includes('delete')) {
        actionType = 'DELETE_LEAD';
        endpoint = '/api/v1/leads/:id';
      } else if (lower.includes('reassign')) {
        actionType = 'REASSIGN_LEAD';
        endpoint = '/api/v1/leads/:id/reassign';
      }

      const proposal: AiActionProposal = {
        actionType,
        targetEntity: 'LEAD',
        proposedPayload: { promptRequested: prompt },
        requiresConfirmation: true,
        warning:
          'Security Policy: The CRM Copilot is an analysis tool and does NOT silently mutate records. Mutating actions require explicit user review, capability authorization, and execution through standard CRM API endpoints.',
        apiEndpoint: endpoint,
      };

      return {
        answer: `I detected a request to perform a CRM mutation (${actionType}). For data integrity and organizational security, CRM records cannot be altered automatically by the assistant. Please review and execute this action through the appropriate CRM interface or API endpoint: \`${endpoint}\`.`,
        actionProposal: proposal,
        source: 'internal_crm_database',
      };
    }

    // 2. Today's Leads / New Leads
    if (lower.includes("today's lead") || lower.includes('todays lead') || lower.includes('leads today') || lower.includes('new leads')) {
      const count = context.todayLeads.length;
      if (count === 0) {
        return {
          answer: `There are currently no new leads created today within your authorized scope (${context.actor.role}). You have ${context.summary.totalLeads} total active leads in your pipeline.`,
          insights: {
            totalScopedLeads: context.summary.totalLeads,
            pipelineValuePKR: context.summary.pipelineValuePKR,
          },
          suggestedPrompts: ['What are my missed follow-ups?', 'Give me a pipeline summary', "Tomorrow's follow-ups"],
          source: 'internal_crm_database',
        };
      }

      const leadItems = context.todayLeads
        .slice(0, 5)
        .map(
          (l) =>
            `• **${l.name}** (${l.businessName || 'Individual'}) - Status: *${l.status}*, Value: PKR ${Number(l.valuePKR).toLocaleString()}, Priority: ${l.priority}`
        )
        .join('\n');

      return {
        answer: `You have **${count}** lead(s) created today within your scope:\n\n${leadItems}\n\nTotal pipeline value for your scope is **PKR ${context.summary.pipelineValuePKR.toLocaleString()}**.`,
        insights: {
          totalScopedLeads: context.summary.totalLeads,
          pipelineValuePKR: context.summary.pipelineValuePKR,
        },
        suggestedPrompts: ['Show missed follow-ups', 'Show pipeline summary', 'Show client conversions'],
        source: 'internal_crm_database',
      };
    }

    // 3. Tomorrow's Follow-Ups / Upcoming Follow-Ups
    if (lower.includes('tomorrow') && lower.includes('follow')) {
      const tomorrowList = context.followUps.tomorrow;
      if (tomorrowList.length === 0) {
        return {
          answer: `You have **0** follow-ups scheduled for tomorrow within your authorized scope. Make sure to schedule any necessary touchpoints with open leads.`,
          insights: {
            upcomingFollowUpsCount: 0,
            missedFollowUpsCount: context.followUps.missed.length,
          },
          suggestedPrompts: ['Show missed follow-ups', "Show today's follow-ups", 'Give me a pipeline summary'],
          source: 'internal_crm_database',
        };
      }

      const items = tomorrowList
        .map((f) => `• [${f.type}] with **${f.leadName || 'Lead'}** at ${f.scheduledTime || 'TBD'} (Phone: ${f.phone || 'N/A'})`)
        .join('\n');

      return {
        answer: `You have **${tomorrowList.length}** follow-up(s) scheduled for tomorrow:\n\n${items}`,
        insights: {
          upcomingFollowUpsCount: tomorrowList.length,
          missedFollowUpsCount: context.followUps.missed.length,
        },
        suggestedPrompts: ['Check missed follow-ups', 'Review pipeline summary'],
        source: 'internal_crm_database',
      };
    }

    // 4. Missed / Overdue Follow-Ups
    if (lower.includes('missed') || lower.includes('overdue')) {
      const missedList = context.followUps.missed;
      if (missedList.length === 0) {
        return {
          answer: `Great news! You have **0 missed follow-ups** within your authorized scope. All scheduled interactions are up to date.`,
          insights: {
            missedFollowUpsCount: 0,
            upcomingFollowUpsCount: context.followUps.today.length + context.followUps.tomorrow.length,
          },
          suggestedPrompts: ["What are today's follow-ups?", 'Show pipeline summary', 'Show recent conversions'],
          source: 'internal_crm_database',
        };
      }

      const items = missedList
        .slice(0, 5)
        .map((f) => `• [${f.type}] with **${f.leadName || 'Lead'}** scheduled for ${f.scheduledDate} (Phone: ${f.phone || 'N/A'})`)
        .join('\n');

      return {
        answer: `⚠️ Attention: You have **${missedList.length}** missed follow-up(s) requiring immediate attention:\n\n${items}`,
        insights: {
          missedFollowUpsCount: missedList.length,
          totalScopedLeads: context.summary.totalLeads,
        },
        suggestedPrompts: ['Show pipeline summary', "What are tomorrow's follow-ups?"],
        source: 'internal_crm_database',
      };
    }

    // 5. Pipeline Summary / Overview
    if (lower.includes('pipeline') || lower.includes('summary') || lower.includes('overview')) {
      return {
        answer:
          `### 📊 Authorized CRM Pipeline Summary (${context.actor.role} scope)\n\n` +
          `• **Total Leads**: ${context.summary.totalLeads}\n` +
          `• **Active Pipeline Value**: PKR ${context.summary.pipelineValuePKR.toLocaleString()}\n` +
          `• **Deals Won / Converted**: ${context.summary.wonLeadsCount}\n` +
          `• **Deals Lost**: ${context.summary.lostLeadsCount}\n` +
          `• **Pending Follow-ups Today**: ${context.followUps.today.length}\n` +
          `• **Overdue Follow-ups**: ${context.followUps.missed.length}`,
        insights: {
          totalScopedLeads: context.summary.totalLeads,
          pipelineValuePKR: context.summary.pipelineValuePKR,
          missedFollowUpsCount: context.followUps.missed.length,
          upcomingFollowUpsCount: context.followUps.today.length,
        },
        suggestedPrompts: ['Show missed follow-ups', "Show today's leads", 'Show staff performance'],
        source: 'internal_crm_database',
      };
    }

    // 6. Staff Performance / Team Workload
    if (lower.includes('staff') || lower.includes('performance') || lower.includes('team')) {
      if (!context.staffPerformance || context.staffPerformance.length === 0) {
        return {
          answer: `As an **${context.actor.role}**, your performance context is personal-only. You currently manage **${context.summary.totalLeads}** leads with **PKR ${context.summary.pipelineValuePKR.toLocaleString()}** in pipeline value.`,
          insights: {
            totalScopedLeads: context.summary.totalLeads,
            pipelineValuePKR: context.summary.pipelineValuePKR,
          },
          source: 'internal_crm_database',
        };
      }

      const staffRows = context.staffPerformance
        .slice(0, 5)
        .map(
          (s) =>
            `• **${s.userName}** (${s.role}, ${s.teamName}) — ${s.assignedLeads} leads, ${s.wonLeads} won, PKR ${Number(s.pipelineValuePKR).toLocaleString()}`
        )
        .join('\n');

      return {
        answer: `### 👥 Staff Performance Breakdown (within your supervisory hierarchy):\n\n${staffRows}`,
        insights: {
          totalScopedLeads: context.summary.totalLeads,
          pipelineValuePKR: context.summary.pipelineValuePKR,
        },
        suggestedPrompts: ['Show pipeline summary', 'Show client conversions'],
        source: 'internal_crm_database',
      };
    }

    // 7. Client Conversions
    if (lower.includes('conversion') || lower.includes('client')) {
      const convs = context.recentConversions;
      if (convs.length === 0) {
        return {
          answer: `There are currently **0** client conversions recorded within your authorized scope.`,
          insights: { conversionsCount: 0 },
          source: 'internal_crm_database',
        };
      }

      const convRows = convs
        .slice(0, 5)
        .map((c) => `• **${c.businessName}** (${c.clientName}) — PKR ${Number(c.finalValuePKR).toLocaleString()} on ${c.convertedDate}`)
        .join('\n');

      return {
        answer: `### 🏆 Recent Client Conversions:\n\n${convRows}\n\nTotal converted clients in scope: **${convs.length}**.`,
        insights: {
          conversionsCount: convs.length,
          totalScopedLeads: context.summary.totalLeads,
        },
        suggestedPrompts: ['Show pipeline summary', 'Show source performance'],
        source: 'internal_crm_database',
      };
    }

    // 8. Lead Source Performance
    if (lower.includes('source') || lower.includes('channel')) {
      const sources = context.sourcesBreakdown;
      const srcRows = sources
        .map((s) => `• **${s.source}**: ${s.totalLeads} leads, ${s.wonLeads} won deals`)
        .join('\n');

      return {
        answer: `### 📈 Lead Source Performance:\n\n${srcRows}`,
        insights: { totalScopedLeads: context.summary.totalLeads },
        source: 'internal_crm_database',
      };
    }

    // Default Operational Briefing
    return {
      answer:
        `Hello ${context.actor.name}! Here is your current CRM operational briefing based on your **${context.actor.role}** authorized access:\n\n` +
        `• **Scoped Leads**: ${context.summary.totalLeads} (PKR ${context.summary.pipelineValuePKR.toLocaleString()} pipeline value)\n` +
        `• **Pending Follow-ups Today**: ${context.followUps.today.length}\n` +
        `• **Missed Follow-ups**: ${context.followUps.missed.length}\n` +
        `• **Tomorrow's Follow-ups**: ${context.followUps.tomorrow.length}\n\n` +
        `How can I assist you further with your leads or sales operations?`,
      insights: {
        totalScopedLeads: context.summary.totalLeads,
        pipelineValuePKR: context.summary.pipelineValuePKR,
        missedFollowUpsCount: context.followUps.missed.length,
        upcomingFollowUpsCount: context.followUps.today.length,
      },
      suggestedPrompts: ["Show today's leads", 'Show missed follow-ups', "Show tomorrow's follow-ups", 'Give me a pipeline summary'],
      source: 'internal_crm_database',
    };
  }
}

/**
 * Provider Factory
 */
export const getAiProvider = (): IAiProvider => {
  // Uses deterministic CRM Copilot provider which guarantees data privacy,
  // strict PostgreSQL scoping, and zero fake credentials
  return new DeterministicCrmCopilotProvider();
};
