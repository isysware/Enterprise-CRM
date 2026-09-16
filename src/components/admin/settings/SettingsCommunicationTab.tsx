import React, { useState, useEffect } from 'react';
import { useCRM } from '../../../context/CRMContext';
import {
  MessageCircle,
  Bell,
  Clock,
  Save,
  Check,
  CheckCircle2,
  Sparkles,
  Send,
  HelpCircle,
  CheckCheck,
  MessageSquare
} from 'lucide-react';

interface SettingsCommunicationTabProps {
  onSaveSuccess: (message: string) => void;
}

const DYNAMIC_TOKENS = [
  { token: '{{clientName}}', label: 'Client Name', sample: 'Tariq Mahmood' },
  { token: '{{companyName}}', label: 'Our Company', sample: 'iSysware' },
  { token: '{{repName}}', label: 'Sales Rep', sample: 'Abdur Rehman' },
  { token: '{{serviceName}}', label: 'Inquired Service', sample: 'Enterprise CRM' },
  { token: '{{dealValue}}', label: 'Deal Value', sample: 'Rs. 150,000' },
  { token: '{{city}}', label: 'Client City', sample: 'Karachi' }
];

export const SettingsCommunicationTab: React.FC<SettingsCommunicationTabProps> = ({ onSaveSuccess }) => {
  const { settings, updateSettings } = useCRM();

  const [staleLeadDays, setStaleLeadDays] = useState(settings.staleLeadDays || 7);
  const [followUpReminderMinutes, setFollowUpReminderMinutes] = useState(settings.followUpReminderMinutes || 30);
  const [enableWhatsAppDirect, setEnableWhatsAppDirect] = useState(settings.enableWhatsAppDirect !== false);
  const [enableNotifications, setEnableNotifications] = useState(settings.enableNotifications !== false);
  const [whatsappGreetingTemplate, setWhatsappGreetingTemplate] = useState(
    settings.whatsappGreetingTemplate ||
      'Assalam-o-Alaikum {{clientName}}, this is {{repName}} from {{companyName}}. We are following up regarding your inquiry for {{serviceName}}. How can we assist you today?'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setStaleLeadDays(settings.staleLeadDays || 7);
    setFollowUpReminderMinutes(settings.followUpReminderMinutes || 30);
    setEnableWhatsAppDirect(settings.enableWhatsAppDirect !== false);
    setEnableNotifications(settings.enableNotifications !== false);
    setWhatsappGreetingTemplate(
      settings.whatsappGreetingTemplate ||
        'Assalam-o-Alaikum {{clientName}}, this is {{repName}} from {{companyName}}. We are following up regarding your inquiry for {{serviceName}}. How can we assist you today?'
    );
  }, [settings]);

  // Insert token at cursor position in textarea
  const handleInsertToken = (token: string) => {
    setWhatsappGreetingTemplate(prev => `${prev} ${token}`);
  };

  // Generate simulated message for live bubble preview
  const getSimulatedMessage = () => {
    let msg = whatsappGreetingTemplate;
    DYNAMIC_TOKENS.forEach(item => {
      msg = msg.split(item.token).join(item.sample);
    });
    return msg;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const commData = {
      staleLeadDays: Number(staleLeadDays) || 7,
      followUpReminderMinutes: Number(followUpReminderMinutes) || 30,
      enableWhatsAppDirect,
      enableNotifications,
      whatsappGreetingTemplate: whatsappGreetingTemplate.trim()
    };

    updateSettings(commData, 'communication', 'Communication & Alerts');

    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      onSaveSuccess('Communication & Alert settings saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    }, 400);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Communication, Alerts &amp; SLA Threshold Rules
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure WhatsApp outbound direct messaging, follow-up timer alarms, and stale lead SLA thresholds.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: SLA LIMITS & TIMERS */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Lead Automation &amp; SLA Follow-Up Timers</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Stale Lead Threshold (Days)
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {staleLeadDays} Days
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="90"
                value={staleLeadDays}
                onChange={e => setStaleLeadDays(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Leads without any customer contact or logged activity for this number of days will automatically be flagged as <span className="text-amber-600 dark:text-amber-400 font-semibold">Stale</span> on the dashboard.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Follow-Up Reminder Lead Time (Minutes)
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {followUpReminderMinutes} Mins
                </span>
              </div>
              <select
                value={followUpReminderMinutes}
                onChange={e => setFollowUpReminderMinutes(Number(e.target.value) || 30)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before (Recommended)</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={1440}>1 day before</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Advances follow-up alarms in the top notification dropdown and agenda view prior to scheduled meeting.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: SYSTEM CHANNELS & NOTIFICATION TOGGLES */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            <span>Channel &amp; Alert Capabilities</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={enableWhatsAppDirect}
                onChange={e => setEnableWhatsAppDirect(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  One-Click WhatsApp Outbound
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Allows sales reps to trigger pre-filled WhatsApp Web or mobile chats directly from lead contact cards.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={enableNotifications}
                onChange={e => setEnableNotifications(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Desktop &amp; In-App Notification Alerts
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Display visual badge counts, overdue task warnings, and toast notifications across the CRM header.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* SECTION 3: WHATSAPP GREETING & OUTBOUND MESSAGE CUSTOMIZER */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>Default WhatsApp Outreach Message Template</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customizable greeting template used when clicking the WhatsApp quick-chat button.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Editor with Token Buttons */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Insert Token:
                </span>
                {DYNAMIC_TOKENS.map(t => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => handleInsertToken(t.token)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    {t.token}
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={whatsappGreetingTemplate}
                onChange={e => setWhatsappGreetingTemplate(e.target.value)}
                placeholder="Type your WhatsApp greeting template..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
              />
              <p className="text-[10px] text-slate-400">
                Dynamic tokens will be automatically substituted with the real lead, sales rep, and company names when opening WhatsApp.
              </p>
            </div>

            {/* Right: Live WhatsApp Bubble Simulator */}
            <div className="lg:col-span-5 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Live WhatsApp Chat Simulation
              </label>

              <div className="p-4 rounded-2xl bg-[#0b141a] text-slate-100 border border-slate-800 shadow-inner flex flex-col justify-end min-h-[160px]">
                <div className="max-w-[90%] ml-auto bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none shadow-md text-xs leading-relaxed space-y-1 relative">
                  <p className="whitespace-pre-wrap">{getSimulatedMessage()}</p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/80 pt-0.5">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Independent Module Storage: <code className="text-indigo-600 dark:text-indigo-400 font-mono">apex_crm_settings_communication</code></span>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaved ? 'Alerts Saved!' : 'Save Communication & Alert Settings'}</span>
        </button>
      </div>
    </form>
  );
};
