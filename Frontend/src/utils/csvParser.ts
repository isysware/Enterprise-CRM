import { LeadSource, LeadStatus, Priority, LeadQuality } from '../types';

/**
 * Reusable CSV single-row parser supporting:
 * - comma-separated fields
 * - fields wrapped in double quotes
 * - commas inside quoted values
 * - escaped quotes represented by ""
 */
export function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote inside quoted field: "" -> "
          current += '"';
          i += 2;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        // If there were whitespace characters accumulated before the opening quote, discard them
        if (current.trim() === '') {
          current = '';
        }
        i++;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export const VALID_LEAD_SOURCES: LeadSource[] = [
  'Meta Ads',
  'Google Ads',
  'WhatsApp',
  'Call',
  'Website',
  'Referral',
  'Existing Client',
  'Walk-in',
  'Other',
  'Social Ads',
  'Inbound',
  'Direct Walk-in',
  'Event',
  'Follow-Up',
  'Facebook Ads',
  'Instagram Ads',
  'Direct',
  'CSV Import'
];

export function normalizeLeadSource(sourceStr?: string): LeadSource {
  if (!sourceStr || !sourceStr.trim()) {
    return 'Direct';
  }
  const trimmed = sourceStr.trim();
  const clean = trimmed.toLowerCase();
  const match = VALID_LEAD_SOURCES.find(s => s.toLowerCase() === clean);
  return match || (trimmed as LeadSource);
}

export const VALID_LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Follow-Up Required',
  'Qualified',
  'Won',
  'Hold',
  'Cold',
  'Returned',
  'Converted',
  'Lost'
];

export function normalizeLeadStatus(statusStr?: string): LeadStatus {
  if (!statusStr || !statusStr.trim()) {
    return 'New';
  }
  const clean = statusStr.trim().toLowerCase();
  const match = VALID_LEAD_STATUSES.find(s => s.toLowerCase() === clean);
  return match || 'New';
}

export const VALID_PRIORITIES: Priority[] = ['Urgent', 'High', 'Medium', 'Low'];

export function normalizePriority(priorityStr?: string): Priority {
  if (!priorityStr || !priorityStr.trim()) {
    return 'Medium';
  }
  const clean = priorityStr.trim().toLowerCase();
  const match = VALID_PRIORITIES.find(p => p.toLowerCase() === clean);
  return match || 'Medium';
}

export const VALID_QUALITIES: LeadQuality[] = ['Good', 'Average', 'Poor'];

export function normalizeLeadQuality(qualityStr?: string): LeadQuality {
  if (!qualityStr || !qualityStr.trim()) {
    return 'Average';
  }
  const clean = qualityStr.trim().toLowerCase();
  const match = VALID_QUALITIES.find(q => q.toLowerCase() === clean);
  return match || 'Average';
}

export function normalizeValuePKR(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, '').trim());
  if (isNaN(num) || num < 0) return 0;
  return num;
}
