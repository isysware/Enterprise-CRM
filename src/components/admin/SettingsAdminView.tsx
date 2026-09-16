import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  RotateCcw,
  Building2,
  FileSignature,
  Layers,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { SettingsSubTab } from '../../types';
import { SettingsBrandingTab } from './settings/SettingsBrandingTab';
import { SettingsLetterheadTab } from './settings/SettingsLetterheadTab';
import { SettingsPricingTab } from './settings/SettingsPricingTab';
import { SettingsCommunicationTab } from './settings/SettingsCommunicationTab';

interface SettingsAdminViewProps {
  activeTab?: SettingsSubTab;
  setActiveTab?: (tab: SettingsSubTab) => void;
}

export const SettingsAdminView: React.FC<SettingsAdminViewProps> = ({
  activeTab: controlledActiveTab,
  setActiveTab: setControlledActiveTab
}) => {
  const { resetToFactoryDefaults, settings } = useCRM();

  // Internal local state fallback if not controlled
  const [localActiveTab, setLocalActiveTab] = useState<SettingsSubTab>('branding');
  const currentTab = controlledActiveTab || localActiveTab;

  const handleTabChange = (tab: SettingsSubTab) => {
    if (setControlledActiveTab) {
      setControlledActiveTab(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };

  // Toast / Feedback State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('Settings saved successfully!');

  const handleSaveSuccess = (message: string) => {
    setToastMessage(message);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  const handleFactoryReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all system configurations and custom pricing models to factory defaults? This will restore original branding, letterhead templates, and SLA rules.'
      )
    ) {
      resetToFactoryDefaults();
      handleSaveSuccess('System configurations successfully reset to initial defaults.');
    }
  };

  const TABS_CONFIG = [
    {
      id: 'branding' as SettingsSubTab,
      label: 'Organization Identity',
      subtitle: 'Branding, Logo & Currency',
      icon: Building2,
      step: '01'
    },
    {
      id: 'letterhead' as SettingsSubTab,
      label: 'Letterhead & PDF Builder',
      subtitle: 'Corporate ID, A4 Template & Signature',
      icon: FileSignature,
      step: '02'
    },
    {
      id: 'pricing' as SettingsSubTab,
      label: 'Software Pricing Models',
      subtitle: 'Dynamic Schemas & Billing Models',
      icon: Layers,
      step: '03'
    },
    {
      id: 'communication' as SettingsSubTab,
      label: 'Communication & Alerts',
      subtitle: 'WhatsApp Template & SLA Timers',
      icon: MessageCircle,
      step: '04'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              System Settings &amp; Configuration
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Modular Control
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure application branding, corporate letterhead, custom dynamic pricing schemas, and automated communication alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {savedSuccess && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl shadow-xs transition-all animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleFactoryReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title="Reset system configurations to initial defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Factory Reset</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL MULTI-TAB NAVIGATION PILLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              {/* Active Indicator Top Accent Bar */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              )}

              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  Tab {tab.step}
                </span>
              </div>

              <div>
                <h3
                  className={`font-bold text-xs truncate ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {tab.label}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {tab.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENT VIEW */}
      <div className="space-y-6">
        {currentTab === 'branding' && (
          <SettingsBrandingTab onSaveSuccess={handleSaveSuccess} />
        )}

        {currentTab === 'letterhead' && (
          <SettingsLetterheadTab onSaveSuccess={handleSaveSuccess} />
        )}

        {currentTab === 'pricing' && (
          <SettingsPricingTab onSaveSuccess={handleSaveSuccess} />
        )}

        {currentTab === 'communication' && (
          <SettingsCommunicationTab onSaveSuccess={handleSaveSuccess} />
        )}
      </div>
    </div>
  );
};
