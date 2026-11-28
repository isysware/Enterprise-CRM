'use client';

import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { LoginPage } from './components/LoginPage';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LeadsView } from './components/LeadsView';
import { IncomingLeadsView } from './components/IncomingLeadsView';
import { FollowUpsView } from './components/FollowUpsView';
import { CalendarView } from './components/CalendarView';
import { ClientsView } from './components/ClientsView';
import { ReportsView } from './components/ReportsView';

// Admin Sub-Views
import { UsersAdminView } from './components/admin/UsersAdminView';
import { RolesAdminView } from './components/admin/RolesAdminView';
import { TeamsAdminView } from './components/admin/TeamsAdminView';
import { ServicesAdminView } from './components/admin/ServicesAdminView';
import { SourcesAdminView } from './components/admin/SourcesAdminView';
import { LogsAdminView } from './components/admin/LogsAdminView';
import { SettingsAdminView } from './components/admin/SettingsAdminView';

// Modals & Drawers
import { LeadDrawer } from './components/modals/LeadDrawer';
import { LeadModal } from './components/modals/LeadModal';
import { FollowUpModal } from './components/modals/FollowUpModal';
import { ReassignModal } from './components/modals/ReassignModal';
import { ImportLeadsModal } from './components/modals/ImportLeadsModal';
import { ConvertLeadModal } from './components/modals/ConvertLeadModal';
import { ProposalBuilderModal } from './components/modals/ProposalBuilderModal';
import { AIAssistantLauncher, AIAssistantPanel } from './components/ai';
import { Lead, FollowUp, Proposal, SettingsSubTab } from './types';
import { ReportId } from './components/reports/types';

const MainLayout: React.FC = () => {
  const { currentUser, canAccessAdmin, canViewIncomingLeads, setFilterState, isAuthLoading } = useCRM();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [reportSubTab, setReportSubTab] = useState<ReportId>('sales-pipeline');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('branding');
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Enforce approved blue/white light theme only (clean up any legacy dark mode artifacts)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('apex_crm_theme_dark');
      document.documentElement.classList.remove('dark');
    } catch {
      // ignore
    }
  }, []);

  // Modal / Drawer state
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpToReschedule, setFollowUpToReschedule] = useState<FollowUp | null>(null);
  const [followUpInitialLeadId, setFollowUpInitialLeadId] = useState<string | null>(null);
  const [followUpInitialDate, setFollowUpInitialDate] = useState<string | undefined>(undefined);
  const [reassignLeadTarget, setReassignLeadTarget] = useState<Lead | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [convertLeadTarget, setConvertLeadTarget] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [proposalLeadTarget, setProposalLeadTarget] = useState<Lead | null>(null);
  const [existingProposalTarget, setExistingProposalTarget] = useState<Proposal | undefined>(undefined);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const { leads } = useCRM();

  // Navigation helpers
  const handleNavigateToLeads = (statusFilter?: string) => {
    if (statusFilter) {
      setFilterState(prev => ({ ...prev, status: statusFilter as any }));
    }
    setActiveTab('leads');
  };

  const handleNavigateToFollowUps = (tab?: string) => {
    setActiveTab('followups');
  };

  const handleOpenLeadDetail = (id: string) => {
    setDrawerLeadId(id);
  };

  const handleOpenProposalModal = (lead: Lead, existingProp?: Proposal) => {
    setProposalLeadTarget(lead);
    setExistingProposalTarget(existingProp);
    setIsProposalModalOpen(true);
  };

  const handleOpenConvertLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setConvertLeadTarget(lead);
      setIsConvertModalOpen(true);
    }
  };

  const handleOpenNewLead = () => {
    setLeadToEdit(null);
    setIsLeadModalOpen(true);
  };

  const handleOpenEditLead = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsLeadModalOpen(true);
  };

  const handleOpenScheduleFollowUp = (initialDateOrLeadId?: string) => {
    setFollowUpToReschedule(null);
    if (initialDateOrLeadId && initialDateOrLeadId.startsWith('lead-')) {
      setFollowUpInitialLeadId(initialDateOrLeadId);
      setFollowUpInitialDate(undefined);
    } else if (initialDateOrLeadId) {
      setFollowUpInitialDate(initialDateOrLeadId);
      setFollowUpInitialLeadId(null);
    } else {
      setFollowUpInitialLeadId(null);
      setFollowUpInitialDate(undefined);
    }
    setIsFollowUpModalOpen(true);
  };

  const handleOpenReschedule = (fu: FollowUp) => {
    setFollowUpToReschedule(fu);
    setIsFollowUpModalOpen(true);
  };

  const handleOpenReassign = (lead: Lead) => {
    setReassignLeadTarget(lead);
  };

  // Authorization / navigation fallback effect (Next-safe, not executed during render)
  useEffect(() => {
    if (!currentUser) return;

    if (['users', 'roles', 'teams', 'services', 'sources', 'logs', 'settings'].includes(activeTab) && !canAccessAdmin) {
      setActiveTab('dashboard');
      return;
    }

    if (activeTab === 'roles' && currentUser.role !== 'Super Admin') {
      setActiveTab('dashboard');
      return;
    }

    if (activeTab === 'incoming-leads') {
      const isEligibleRole = ['super_admin', 'admin', 'manager', 'team_lead'].includes(
        currentUser.role.toLowerCase().replace(/\s+/g, '_')
      );
      if (!isEligibleRole || !canViewIncomingLeads) {
        setActiveTab('dashboard');
      }
    }
  }, [activeTab, currentUser, canAccessAdmin, canViewIncomingLeads]);

  // While verifying active session on initial load or reload
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium mt-3">Connecting to Enterprise CRM session...</p>
      </div>
    );
  }

  // If user is not authenticated, show unified login page
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F7F9FC] text-[#0F172A] flex flex-col lg:flex-row font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reportSubTab={reportSubTab}
        setReportSubTab={setReportSubTab}
        settingsSubTab={settingsSubTab}
        setSettingsSubTab={setSettingsSubTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          reportSubTab={reportSubTab}
          settingsSubTab={settingsSubTab}
          onNavigate={setActiveTab}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          onOpenLeadDetail={handleOpenLeadDetail}
        />

        {/* Dynamic Page Views - Primary Vertical Scroll Container */}
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden px-3.5 sm:px-5 lg:px-6 py-5">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToLeads={handleNavigateToLeads}
              onNavigateToFollowUps={handleNavigateToFollowUps}
              onOpenLeadDetail={handleOpenLeadDetail}
              onOpenNewLead={handleOpenNewLead}
              onNavigateToReports={(reportId?: string) => {
                setActiveTab('reports');
                if (reportId && ['sales-pipeline', 'team-staff', 'followups-activity', 'clients-conversions', 'source-service', 'commercial-revenue'].includes(reportId)) {
                  setReportSubTab(reportId as ReportId);
                }
              }}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsView
              onOpenNewLeadModal={handleOpenNewLead}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenEditLeadModal={handleOpenEditLead}
              onOpenLeadDetail={handleOpenLeadDetail}
              onOpenReassignModal={handleOpenReassign}
              onOpenConvertModal={handleOpenConvertLead}
              onOpenProposalModal={handleOpenProposalModal}
            />
          )}

          {activeTab === 'incoming-leads' &&
            currentUser &&
            ['super_admin', 'admin', 'manager', 'team_lead'].includes(
              currentUser.role.toLowerCase().replace(/\s+/g, '_')
            ) &&
            canViewIncomingLeads && (
              <IncomingLeadsView />
            )}

          {activeTab === 'followups' && (
            <FollowUpsView
              onOpenScheduleModal={() => handleOpenScheduleFollowUp()}
              onOpenRescheduleModal={handleOpenReschedule}
              onOpenLeadDetail={handleOpenLeadDetail}
              onOpenConvertModal={handleOpenConvertLead}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onOpenScheduleModal={handleOpenScheduleFollowUp}
              onOpenRescheduleModal={handleOpenReschedule}
              onOpenLeadDetail={handleOpenLeadDetail}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              onOpenNewClientModal={handleOpenNewLead}
              onOpenLeadDetail={handleOpenLeadDetail}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              activeReportId={reportSubTab}
              onChangeReport={setReportSubTab}
            />
          )}

          {/* Admin Routes */}
          {activeTab === 'users' && <UsersAdminView />}
          {activeTab === 'roles' && currentUser.role === 'Super Admin' && <RolesAdminView />}
          {activeTab === 'teams' && <TeamsAdminView />}
          {activeTab === 'services' && <ServicesAdminView />}
          {activeTab === 'sources' && <SourcesAdminView />}
          {activeTab === 'logs' && <LogsAdminView />}
          {activeTab === 'settings' && (
            <SettingsAdminView
              activeTab={settingsSubTab}
              setActiveTab={setSettingsSubTab}
            />
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onOpenScheduleModal={(leadId) => handleOpenScheduleFollowUp(leadId)}
        onOpenConvertModal={handleOpenConvertLead}
        onOpenProposalModal={handleOpenProposalModal}
      />

      <ConvertLeadModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setConvertLeadTarget(null);
        }}
        lead={convertLeadTarget}
        onSuccess={() => {
          setActiveTab('clients');
        }}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setLeadToEdit(null);
        }}
        leadToEdit={leadToEdit}
      />

      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => {
          setIsFollowUpModalOpen(false);
          setFollowUpToReschedule(null);
          setFollowUpInitialLeadId(null);
        }}
        followUpToReschedule={followUpToReschedule}
        initialLeadId={followUpInitialLeadId}
        initialDate={followUpInitialDate}
      />

      <ReassignModal
        lead={reassignLeadTarget}
        onClose={() => setReassignLeadTarget(null)}
      />

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <ProposalBuilderModal
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setProposalLeadTarget(null);
          setExistingProposalTarget(undefined);
        }}
        lead={proposalLeadTarget}
        existingProposal={existingProposalTarget}
      />

      {/* Global AI Assistant Launcher & Panel (Hidden on reporting pages) */}
      {activeTab !== 'reports' && (
        <AIAssistantLauncher
          isOpen={isAIAssistantOpen}
          onToggle={() => setIsAIAssistantOpen(prev => !prev)}
        />
      )}
      <AIAssistantPanel
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        currentPage={activeTab === 'reports' ? `reports-${reportSubTab}` : activeTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <MainLayout />
    </CRMProvider>
  );
}
