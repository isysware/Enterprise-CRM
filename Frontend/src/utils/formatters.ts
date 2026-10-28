import { UserRole, LeadStatus, Priority, LeadQuality, Client, FollowUpStatus } from '../types';

/**
 * Robust numeric sanitization helper function.
 * Handles numbers, formatted currency strings (e.g. "Rs. 85,000", "$150,000"),
 * undefined, null, or empty string values safely without ever producing NaN.
 */
export function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? 0 : val;
  }
  // Strip currency prefixes, commas, spaces, letters, etc.
  const str = String(val).trim();
  const cleaned = str.replace(/[^0-9.-]+/g, '');
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

/**
 * Format any currency value safely into Pakistani Rupee string (e.g., "Rs. 340,000")
 */
export function formatPKR(amount: any): string {
  const num = parseAmount(amount);
  return `Rs. ${num.toLocaleString('en-PK')}`;
}

/**
 * Safely extracts the active revenue / final price from a Client object.
 */
export function getClientRevenue(client: Partial<Client> | null | undefined): number {
  if (!client) return 0;
  if (client.activeRevenuePKR !== undefined && client.activeRevenuePKR !== null) {
    const val = parseAmount(client.activeRevenuePKR);
    if (val > 0) return val;
  }
  if (client.finalPrice !== undefined && client.finalPrice !== null) {
    const val = parseAmount(client.finalPrice);
    if (val > 0) return val;
  }
  if (client.totalCalculatedValuePKR !== undefined && client.totalCalculatedValuePKR !== null) {
    const val = parseAmount(client.totalCalculatedValuePKR);
    if (val > 0) return val;
  }
  if ((client as any).revenuePKR !== undefined && (client as any).revenuePKR !== null) {
    const val = parseAmount((client as any).revenuePKR);
    if (val > 0) return val;
  }
  if (client.pricingDetails) {
    const pd = client.pricingDetails;
    if (pd.totalCalculatedValuePKR) return parseAmount(pd.totalCalculatedValuePKR);
    if (pd.oneTimeProjectPrice) return parseAmount(pd.oneTimeProjectPrice);
    if (pd.monthlySubscriptionFee) return parseAmount(pd.monthlySubscriptionFee);
    if (pd.ownershipPrice) return parseAmount(pd.ownershipPrice);
  }
  return 0;
}

export function cleanPhoneForWhatsApp(phone: string): string {
  // Strip all non-numeric characters, ensure standard country code
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `92${digits.slice(1)}`;
  }
  if (!digits.startsWith('92') && digits.length === 10) {
    return `92${digits}`;
  }
  return digits;
}

export function getWhatsAppUrl(phone: string, clientName?: string, businessName?: string): string {
  const clean = cleanPhoneForWhatsApp(phone);
  const text = encodeURIComponent(
    `Assalam-o-Alaikum ${clientName || 'Sir/Madam'} (${businessName || 'Business'}), hope you are doing well! Reaching out from Apex Software regarding your inquiry for the Salon Management System.`
  );
  return `https://wa.me/${clean}?text=${text}`;
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type FollowUpCategory = 'today' | 'upcoming' | 'missed' | 'completed';

export function classifyFollowUp(
  followUp: { scheduledDate: string; status: FollowUpStatus | string },
  todayStr: string = getLocalDateString()
): FollowUpCategory {
  if (followUp.status === 'Done') {
    return 'completed';
  }
  const dateStr = (followUp.scheduledDate || '').split('T')[0];
  if (followUp.status === 'Missed') {
    return 'missed';
  }
  if (dateStr === todayStr) {
    return 'today';
  }
  if (dateStr > todayStr) {
    return 'upcoming';
  }
  return 'missed';
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, timeString?: string): string {
  if (!dateString) return '-';
  const formattedDate = formatDate(dateString);
  if (timeString) {
    return `${formattedDate} at ${timeString}`;
  }
  return formattedDate;
}

export function getRoleBadgeStyle(role: UserRole): { badge: string; dot: string } {
  switch (role) {
    case 'Super Admin':
      return {
        badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-600'
      };
    case 'Admin':
      return {
        badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-600'
      };
    case 'Manager':
      return {
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-600'
      };
    case 'Team Lead':
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-600'
      };
    case 'Employee':
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-500'
      };
  }
}

export function getStatusBadgeStyle(status: LeadStatus): { badge: string; dot: string; text: string } {
  switch (status) {
    case 'New':
      return {
        badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        dot: 'bg-sky-500',
        text: 'text-sky-700 dark:text-sky-300'
      };
    case 'Follow-Up Required':
      return {
        badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300'
      };
    case 'Qualified':
      return {
        badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        text: 'text-indigo-700 dark:text-indigo-300'
      };
    case 'Won':
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300'
      };
    case 'Contacted':
      return {
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-300'
      };
    case 'Hold':
      return {
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        text: 'text-slate-600 dark:text-slate-400'
      };
    case 'Cold':
      return {
        badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        dot: 'bg-cyan-500',
        text: 'text-cyan-700 dark:text-cyan-300'
      };
    case 'Returned':
      return {
        badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        dot: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-300'
      };
    case 'Converted':
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300'
      };
    case 'Lost':
      return {
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-300'
      };
  }
}

export function getQualityBadge(quality: LeadQuality): { label: string; badge: string } {
  switch (quality) {
    case 'Good':
      return {
        label: 'Good Quality ⭐',
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      };
    case 'Average':
      return {
        label: 'Average',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      };
    case 'Poor':
      return {
        label: 'Poor',
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      };
  }
}

export function getPriorityBadge(priority: Priority): { label: string; badge: string } {
  switch (priority) {
    case 'Urgent':
      return {
        label: 'Urgent 🔥',
        badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold'
      };
    case 'High':
      return {
        label: 'High ⚡',
        badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold'
      };
    case 'Medium':
      return {
        label: 'Medium',
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    case 'Low':
      return {
        label: 'Low',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
      };
  }
}
