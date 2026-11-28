import { AiAssistantResponse, AiChatMessage, AiActionProposal } from './ai.validator';

export interface ScopedCrmContext {
  actor: {
    id: string;
    name: string;
    role: string;
  };
  summary: {
    totalLeads: number;
    openLeadsCount: number;
    newLeadsCount: number;
    wonLeadsCount: number;
    lostLeadsCount: number;
    conversionRate: number;
    totalLeadValuePKR: number;
    activePipelineValuePKR: number;
    hotUrgentLeadsCount: number;
    totalClientsCount: number;
    convertedContractValuePKR: number;
    completedFollowUpsCount: number;
    pendingFollowUpsCount: number;
    pipelineValuePKR: number;
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

    // 2. Multi-Metric / Comprehensive Operational Analysis
    const hasTotalLeadVal = lower.includes('total lead value') || (lower.includes('total value') && !lower.includes('contract'));
    const hasTotalLeads = (lower.includes('total lead') || lower.includes('how many lead')) && !hasTotalLeadVal;
    const hasActivePipeline = lower.includes('active pipeline') || lower.includes('pipeline value');
    const hasConversion = lower.includes('conversion') || lower.includes('converted') || lower.includes('win rate');
    const hasNewLeads = lower.includes('new lead') || lower.includes('open lead');
    const hasHotLeads = lower.includes('hot lead') || lower.includes('urgent');
    const hasClients = lower.includes('client') || lower.includes('contract value');
    const hasFollowUps = lower.includes('completed follow') || lower.includes('pending follow');

    const matchedMetrics = [
      hasTotalLeads,
      hasTotalLeadVal,
      hasActivePipeline,
      hasConversion,
      hasNewLeads,
      hasHotLeads,
      hasClients,
      hasFollowUps
    ].filter(Boolean).length;

    const isComprehensiveReport =
      matchedMetrics >= 2 ||
      lower.includes('multi') ||
      lower.includes('baseline') ||
      lower.includes('all metric') ||
      lower.includes('all the metric') ||
      lower.includes('kpi') ||
      lower.includes('summary') ||
      lower.includes('overview') ||
      (lower.includes('report') && !lower.includes('staff'));

    if (isComprehensiveReport) {
      const comprehensiveAnswer =
        `### 📊 Scoped CRM Pipeline Summary & Operational Analysis (${context.actor.role} scope)\n\n` +
        `• **Total Leads**: ${context.summary.totalLeads}\n` +
        `• **New / Open Leads**: ${context.summary.openLeadsCount} (New: ${context.summary.newLeadsCount})\n` +
        `• **Converted Deals**: ${context.summary.wonLeadsCount}\n` +
        `• **Conversion Rate**: ${context.summary.conversionRate}%\n` +
        `• **Total Lead Value**: PKR ${context.summary.totalLeadValuePKR.toLocaleString()}\n` +
        `• **Active Pipeline Value**: PKR ${context.summary.activePipelineValuePKR.toLocaleString()} *(strictly excludes Won/Converted & Lost)*\n` +
        `• **Hot / Urgent Leads**: ${context.summary.hotUrgentLeadsCount}\n` +
        `• **Active Clients**: ${context.summary.totalClientsCount}\n` +
        `• **Converted Contract Value**: PKR ${context.summary.convertedContractValuePKR.toLocaleString()}\n` +
        `• **Completed Follow-Ups**: ${context.summary.completedFollowUpsCount}\n` +
        `• **Pending Follow-Ups**: ${context.summary.pendingFollowUpsCount}\n\n` +
        `*Data calculated strictly from live scoped PostgreSQL database records.*`;

      return {
        answer: comprehensiveAnswer,
        insights: {
          totalScopedLeads: context.summary.totalLeads,
          openLeadsCount: context.summary.openLeadsCount,
          newLeadsCount: context.summary.newLeadsCount,
          wonLeadsCount: context.summary.wonLeadsCount,
          conversionRate: context.summary.conversionRate,
          totalLeadValuePKR: context.summary.totalLeadValuePKR,
          activePipelineValuePKR: context.summary.activePipelineValuePKR,
          hotUrgentLeadsCount: context.summary.hotUrgentLeadsCount,
          totalClientsCount: context.summary.totalClientsCount,
          convertedContractValuePKR: context.summary.convertedContractValuePKR,
          completedFollowUpsCount: context.summary.completedFollowUpsCount,
          pendingFollowUpsCount: context.summary.pendingFollowUpsCount,
          pipelineValuePKR: context.summary.activePipelineValuePKR,
          conversionsCount: context.summary.totalClientsCount,
        },
        suggestedPrompts: ['Show missed follow-ups', "Show today's leads", 'Show source performance', 'Show staff performance'],
        source: 'internal_crm_database',
      };
    }

    // 3. Single Metric: Total Lead Value
    if (lower.includes('total lead value') || (lower.includes('total value') && !lower.includes('contract'))) {
      return {
        answer:
          `The **Total Lead Value** within your authorized scope (${context.actor.role}) is **PKR ${context.summary.totalLeadValuePKR.toLocaleString()}**, covering all ${context.summary.totalLeads} scoped leads.\n\n` +
          `*(Note: **Active Pipeline Value**, which excludes Converted and Lost deals, is **PKR ${context.summary.activePipelineValuePKR.toLocaleString()}**)*`,
        insights: {
          totalLeadValuePKR: context.summary.totalLeadValuePKR,
          activePipelineValuePKR: context.summary.activePipelineValuePKR,
          totalScopedLeads: context.summary.totalLeads,
        },
        suggestedPrompts: ['What is active pipeline value?', 'Give me a pipeline summary'],
        source: 'internal_crm_database',
      };
    }

    // 4. Single Metric: Active Pipeline Value
    if (lower.includes('active pipeline') || (lower.includes('pipeline value') && !lower.includes('total lead value'))) {
      return {
        answer:
          `The **Active Pipeline Value** within your authorized scope (${context.actor.role}) is **PKR ${context.summary.activePipelineValuePKR.toLocaleString()}** across ${context.summary.openLeadsCount} active open leads.\n\n` +
          `Converted and Lost deals are strictly excluded from the active pipeline.\n` +
          `*(Total cumulative Lead Value across all ${context.summary.totalLeads} leads is **PKR ${context.summary.totalLeadValuePKR.toLocaleString()}**)*`,
        insights: {
          activePipelineValuePKR: context.summary.activePipelineValuePKR,
          totalLeadValuePKR: context.summary.totalLeadValuePKR,
          totalScopedLeads: context.summary.totalLeads,
          openLeadsCount: context.summary.openLeadsCount,
        },
        suggestedPrompts: ['What is total lead value?', 'Show conversion rate'],
        source: 'internal_crm_database',
      };
    }

    // 5. Single Metric: Conversion Rate / Converted Deals
    if (lower.includes('conversion rate') || lower.includes('converted deal') || lower.includes('win rate')) {
      return {
        answer:
          `Your **Conversion Rate** is **${context.summary.conversionRate}%** with **${context.summary.wonLeadsCount}** converted deal(s) out of **${context.summary.totalLeads}** total leads.\n\n` +
          `Closed client contract value is **PKR ${context.summary.convertedContractValuePKR.toLocaleString()}**.`,
        insights: {
          conversionRate: context.summary.conversionRate,
          wonLeadsCount: context.summary.wonLeadsCount,
          totalScopedLeads: context.summary.totalLeads,
          convertedContractValuePKR: context.summary.convertedContractValuePKR,
        },
        suggestedPrompts: ['Show active pipeline value', 'Show recent conversions'],
        source: 'internal_crm_database',
      };
    }

    // 6. Single Metric: Hot / Urgent Leads
    if (lower.includes('hot') || lower.includes('urgent')) {
      return {
        answer: `You have **${context.summary.hotUrgentLeadsCount}** Hot / Urgent priority lead(s) requiring immediate attention in your authorized scope.`,
        insights: {
          hotUrgentLeadsCount: context.summary.hotUrgentLeadsCount,
          totalScopedLeads: context.summary.totalLeads,
        },
        suggestedPrompts: ["Show today's follow-ups", 'Give me a pipeline summary'],
        source: 'internal_crm_database',
      };
    }

    // 7. Single Metric: Clients & Contract Value
    if (lower.includes('client') || lower.includes('contract value')) {
      const convs = context.recentConversions;
      const convRows = convs
        .slice(0, 5)
        .map((c) => `• **${c.businessName}** (${c.clientName}) — PKR ${Number(c.finalValuePKR).toLocaleString()} on ${c.convertedDate}`)
        .join('\n');

      return {
        answer:
          `### 🏆 Clients & Revenue Summary (${context.actor.role} scope)\n\n` +
          `• **Active Clients**: ${context.summary.totalClientsCount}\n` +
          `• **Converted Contract Value**: PKR ${context.summary.convertedContractValuePKR.toLocaleString()}\n\n` +
          (convRows ? `**Recent Acquisitions:**\n${convRows}` : ''),
        insights: {
          totalClientsCount: context.summary.totalClientsCount,
          convertedContractValuePKR: context.summary.convertedContractValuePKR,
          totalScopedLeads: context.summary.totalLeads,
        },
        suggestedPrompts: ['Show pipeline summary', 'Show source performance'],
        source: 'internal_crm_database',
      };
    }

    // 8. Tomorrow's Follow-Ups
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

    // 9. Missed / Overdue Follow-Ups
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

    // 10. General Follow-Ups Query
    if (lower.includes('follow') || lower.includes('touchpoint')) {
      return {
        answer:
          `### 📅 Follow-Ups Activity (${context.actor.role} scope)\n\n` +
          `• **Completed Follow-Ups**: ${context.summary.completedFollowUpsCount}\n` +
          `• **Pending Follow-Ups**: ${context.summary.pendingFollowUpsCount}\n` +
          `• **Due Today**: ${context.followUps.today.length}\n` +
          `• **Missed / Overdue**: ${context.followUps.missed.length}\n` +
          `• **Tomorrow**: ${context.followUps.tomorrow.length}`,
        insights: {
          completedFollowUpsCount: context.summary.completedFollowUpsCount,
          pendingFollowUpsCount: context.summary.pendingFollowUpsCount,
          missedFollowUpsCount: context.followUps.missed.length,
          upcomingFollowUpsCount: context.followUps.today.length,
        },
        suggestedPrompts: ['Show missed follow-ups', "Show tomorrow's follow-ups", 'Pipeline summary'],
        source: 'internal_crm_database',
      };
    }

    // 11. Specifically Today's Created Leads
    if (lower.includes("today's lead") || lower.includes('todays lead') || lower.includes('leads today') || lower.includes('created today')) {
      const count = context.todayLeads.length;
      if (count === 0) {
        return {
          answer: `There are currently no new leads created today within your authorized scope (${context.actor.role}). You have ${context.summary.totalLeads} total leads in your pipeline.`,
          insights: {
            totalScopedLeads: context.summary.totalLeads,
            totalLeadValuePKR: context.summary.totalLeadValuePKR,
            activePipelineValuePKR: context.summary.activePipelineValuePKR,
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
        answer: `You have **${count}** lead(s) created today within your scope:\n\n${leadItems}\n\nTotal cumulative lead value for your scope is **PKR ${context.summary.totalLeadValuePKR.toLocaleString()}** (Active Pipeline: PKR ${context.summary.activePipelineValuePKR.toLocaleString()}).`,
        insights: {
          totalScopedLeads: context.summary.totalLeads,
          totalLeadValuePKR: context.summary.totalLeadValuePKR,
          activePipelineValuePKR: context.summary.activePipelineValuePKR,
        },
        suggestedPrompts: ['Show missed follow-ups', 'Show pipeline summary', 'Show client conversions'],
        source: 'internal_crm_database',
      };
    }

    // 12. Staff Performance / Team Workload
    if (lower.includes('staff') || lower.includes('performance') || lower.includes('team')) {
      if (!context.staffPerformance || context.staffPerformance.length === 0) {
        return {
          answer: `As an **${context.actor.role}**, your performance context is personal-only. You currently manage **${context.summary.totalLeads}** leads with **PKR ${context.summary.activePipelineValuePKR.toLocaleString()}** in active pipeline value.`,
          insights: {
            totalScopedLeads: context.summary.totalLeads,
            pipelineValuePKR: context.summary.activePipelineValuePKR,
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
          pipelineValuePKR: context.summary.activePipelineValuePKR,
        },
        suggestedPrompts: ['Show pipeline summary', 'Show client conversions'],
        source: 'internal_crm_database',
      };
    }

    // 13. Lead Source Performance
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
        `• **Total Leads**: ${context.summary.totalLeads} (Total Value: PKR ${context.summary.totalLeadValuePKR.toLocaleString()})\n` +
        `• **Active Pipeline**: PKR ${context.summary.activePipelineValuePKR.toLocaleString()} across ${context.summary.openLeadsCount} open leads\n` +
        `• **Converted Deals**: ${context.summary.wonLeadsCount} (${context.summary.conversionRate}% win rate)\n` +
        `• **Follow-Ups**: ${context.summary.completedFollowUpsCount} completed, ${context.summary.pendingFollowUpsCount} pending\n\n` +
        `How can I assist you further with your leads, pipeline, or reporting?`,
      insights: {
        totalScopedLeads: context.summary.totalLeads,
        totalLeadValuePKR: context.summary.totalLeadValuePKR,
        activePipelineValuePKR: context.summary.activePipelineValuePKR,
        wonLeadsCount: context.summary.wonLeadsCount,
        conversionRate: context.summary.conversionRate,
        completedFollowUpsCount: context.summary.completedFollowUpsCount,
        pendingFollowUpsCount: context.summary.pendingFollowUpsCount,
      },
      suggestedPrompts: ["Show pipeline summary", "Show today's leads", 'Show missed follow-ups', "Show tomorrow's follow-ups"],
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
