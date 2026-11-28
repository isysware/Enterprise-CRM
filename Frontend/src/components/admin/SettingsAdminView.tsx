import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { SettingsSubTab } from '../../types';
import { SettingsBrandingTab } from './settings/SettingsBrandingTab';
import { SettingsLetterheadTab } from './settings/SettingsLetterheadTab';
import { SettingsPricingTab } from './settings/SettingsPricingTab';
import { SettingsCommunicationTab } from './settings/SettingsCommunicationTab';
import { SettingsDeleteManagementTab } from './settings/SettingsDeleteManagementTab';
import { PageHeader, ConfirmDialog } from '../ui';

interface SettingsAdminViewProps {
  activeTab?: SettingsSubTab;
  setActiveTab?: (tab: SettingsSubTab) => void;
}

const SETTINGS_PAGES: Record<SettingsSubTab, { title: string; description: string }> = {
  branding: {
    title: 'Organization Identity',
    description: 'Manage company branding, application identity, currency and regional configuration.'
  },
  letterhead: {
    title: 'Letterhead & PDF Builder',
    description: 'Configure proposal letterhead, document branding, clauses and authorized signatures.'
  },
  pricing: {
    title: 'Software Pricing Models',
    description: 'Manage commercial pricing models and their dynamic pricing fields.'
  },
  communication: {
    title: 'Communication & Alerts',
    description: 'Configure communication preferences, templates and operational alert thresholds.'
  },
  'delete-management': {
    title: 'Delete Management & Data Purge',
    description: 'Permanently purge selected CRM data categories from PostgreSQL database with transactional integrity.'
  }
};

export const SettingsAdminView: React.FC<SettingsAdminViewProps> = ({
  activeTab: controlledActiveTab
}) => {
  const { resetToFactoryDefaults } = useCRM();

  // Internal local state fallback if not controlled
  const [localActiveTab] = useState<SettingsSubTab>('branding');
  const currentTab = controlledActiveTab || localActiveTab;

  // Toast / Feedback State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('Settings saved successfully!');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSaveSuccess = (message: string) => {
    setToastMessage(message);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  const handleFactoryResetConfirm = () => {
    resetToFactoryDefaults();
    handleSaveSuccess('System configurations successfully reset to initial defaults.');
    setShowResetConfirm(false);
  };

  const currentPage = SETTINGS_PAGES[currentTab] || SETTINGS_PAGES.branding;

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Dedicated Settings Child Page Header */}
      <PageHeader
        title={currentPage.title}
        subtitle={currentPage.description}
        actions={
          <div className="flex items-center gap-3">
            {savedSuccess && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl shadow-xs transition-all animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset system configurations to initial defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Settings</span>
            </button>
          </div>
        }
      />

      {/* 2. Dedicated Settings Sub-Page Content View (Driven solely by Main Sidebar) */}
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

        {currentTab === 'delete-management' && (
          <SettingsDeleteManagementTab onSaveSuccess={handleSaveSuccess} />
        )}
      </div>

      {/* Factory Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleFactoryResetConfirm}
        title="Reset All Settings to Defaults?"
        description="Are you sure you want to reset all system configurations and custom pricing models to initial defaults? This will restore original branding, letterhead templates, and operational rules."
        confirmLabel="Reset All Settings"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};
