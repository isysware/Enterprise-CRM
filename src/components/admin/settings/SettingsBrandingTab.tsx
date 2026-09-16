import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../../context/CRMContext';
import {
  Building2,
  Save,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  AlertCircle,
  Eye,
  Check
} from 'lucide-react';

interface SettingsBrandingTabProps {
  onSaveSuccess: (message: string) => void;
}

const PRESET_LOGOS = [
  {
    name: 'iSysware Modern',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    tag: 'SaaS Indigo'
  },
  {
    name: 'Apex Solutions',
    url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=200&auto=format&fit=crop&q=80',
    tag: 'Fintech Emerald'
  },
  {
    name: 'TechFlow Global',
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&auto=format&fit=crop&q=80',
    tag: 'Enterprise Blue'
  }
];

export const SettingsBrandingTab: React.FC<SettingsBrandingTabProps> = ({ onSaveSuccess }) => {
  const { settings, updateSettings } = useCRM();

  const [applicationName, setApplicationName] = useState(settings.applicationName || 'CRM');
  const [companyName, setCompanyName] = useState(settings.companyName || 'iSysware');
  const [companyLogo, setCompanyLogo] = useState(settings.companyLogo || '');
  const [currency, setCurrency] = useState(settings.currency || 'PKR');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || 'Rs.');
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Karachi (UTC+5)');

  const [logoInputTab, setLogoInputTab] = useState<'upload' | 'url' | 'preset'>('upload');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApplicationName(settings.applicationName || 'CRM');
    setCompanyName(settings.companyName || 'iSysware');
    setCompanyLogo(settings.companyLogo || '');
    setCurrency(settings.currency || 'PKR');
    setCurrencySymbol(settings.currencySymbol || 'Rs.');
    setTimezone(settings.timezone || 'Asia/Karachi (UTC+5)');
  }, [settings]);

  // Handle Image File Upload (Base64 conversion)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setLogoError('Image size exceeds 3MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogo(reader.result);
      }
    };
    reader.onerror = () => {
      setLogoError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Handle URL Link
  const handleApplyLogoUrl = () => {
    if (!customLogoUrl.trim()) return;
    setCompanyLogo(customLogoUrl.trim());
    setCustomLogoUrl('');
    setLogoError(null);
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    setCompanyLogo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Currency quick-select helper
  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    if (val === 'PKR') setCurrencySymbol('Rs.');
    else if (val === 'USD') setCurrencySymbol('$');
    else if (val === 'AED') setCurrencySymbol('AED');
    else if (val === 'SAR') setCurrencySymbol('SR');
    else if (val === 'GBP') setCurrencySymbol('£');
    else if (val === 'EUR') setCurrencySymbol('€');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const brandingData = {
      applicationName: applicationName.trim() || 'CRM',
      companyName: companyName.trim() || 'iSysware',
      companyLogo,
      currency,
      currencySymbol,
      timezone
    };

    updateSettings(brandingData, 'branding', 'Organization Identity & Branding');

    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      onSaveSuccess('Organization Identity & Branding settings saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    }, 400);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Brand Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Organization &amp; Application Identity (Branding)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure primary company name, logo mark, currency standards, and timezone.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Real-Time Sync
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Logo Uploader & Real-time Live Previews */}
          <div className="lg:col-span-5 space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Company Logo Mark &amp; Brand Asset
            </label>

            {/* Logo Preview Container */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center gap-4">
                {/* Square Preview */}
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-xs relative group">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block">Square</span>
                </div>

                {/* Circular Preview */}
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-xs">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Logo Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs">
                        {applicationName ? applicationName.substring(0, 2).toUpperCase() : 'CRM'}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block">Circular</span>
                </div>

                {/* Info & Remove Button */}
                <div className="flex-1 min-w-0 pl-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {companyLogo ? 'Custom Logo Active' : 'Default Monogram In Use'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    PNG, SVG, JPG, WebP (Max 3MB)
                  </p>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Tabs */}
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLogoInputTab('upload')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    logoInputTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputTab('url')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    logoInputTab === 'url'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputTab('preset')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    logoInputTab === 'preset'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Presets</span>
                </button>
              </div>

              {logoInputTab === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="company-logo-upload-input"
                  />
                  <label
                    htmlFor="company-logo-upload-input"
                    className="w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-all text-center group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1.5 transition-colors" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Click to choose image file
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Direct Base64 encoding — persists instantly
                    </span>
                  </label>
                </div>
              )}

              {logoInputTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={customLogoUrl}
                    onChange={e => setCustomLogoUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyLogoUrl}
                    className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
              )}

              {logoInputTab === 'preset' && (
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCompanyLogo(preset.url)}
                      className={`p-2 rounded-xl border text-left flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        companyLogo === preset.url
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-8 h-8 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {logoError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}
            </div>

            {/* Live Navigation Mockup Preview */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-indigo-400" />
                  Sidebar Branding Preview
                </span>
                <span className="text-indigo-400">Live Mockup</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="Brand"
                      className="w-full h-full object-contain p-0.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="font-extrabold text-indigo-400 text-xs">
                      {applicationName ? applicationName.substring(0, 2).toUpperCase() : 'CR'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">
                      {applicationName || 'CRM'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Enterprise
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {companyName || 'iSysware'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Identity Form Fields */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Application Display Name
                </label>
                <input
                  type="text"
                  value={applicationName}
                  onChange={e => setApplicationName(e.target.value)}
                  placeholder="e.g. Apex CRM or CRM"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Displayed on top browser tab, navbar header, and login portals.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. iSysware Solutions"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Appears in client proposals, commercial quotes, and invoices.
                </p>
              </div>
            </div>

            {/* Currency & Financial Standards */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                Operating Currency &amp; Formatting
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Operating Currency Code
                  </label>
                  <select
                    value={currency}
                    onChange={e => handleCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Currency Display Symbol
                  </label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={e => setCurrencySymbol(e.target.value)}
                    placeholder="e.g. Rs. or PKR"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                System Timezone Standard
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Asia/Karachi (UTC+5)">Asia/Karachi (UTC+5:00 - Pakistan Standard Time)</option>
                <option value="Asia/Dubai (UTC+4)">Asia/Dubai (UTC+4:00 - Gulf Standard Time)</option>
                <option value="Asia/Riyadh (UTC+3)">Asia/Riyadh (UTC+3:00 - Arabia Standard Time)</option>
                <option value="Europe/London (UTC+0/+1)">Europe/London (UTC+0:00 - GMT/BST)</option>
                <option value="America/New_York (UTC-5/-4)">America/New_York (UTC-5:00 - EST/EDT)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Used for scheduling follow-up notifications, calendar agenda, and SLA timelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Independent Module Storage: <code className="text-indigo-600 dark:text-indigo-400 font-mono">apex_crm_settings_branding</code></span>
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
          <span>{isSaved ? 'Branding Saved!' : 'Save Branding Settings'}</span>
        </button>
      </div>
    </form>
  );
};
