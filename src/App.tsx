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
import { Lead, FollowUp, Proposal, SettingsSubTab } from './types';

const THEME_STORAGE_KEY = 'apex_crm_theme_dark';

const MainLayout: React.FC = () => {
  const { currentUser, canAccessAdmin, canViewIncomingLeads, setFilterState } = useCRM();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('branding');
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return true; // Default to dark enterprise theme
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  // If user is not authenticated, show unified login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Safety fallback if non-admin tries to view admin route
  if (['users', 'roles', 'teams', 'services', 'sources', 'logs', 'settings'].includes(activeTab) && !canAccessAdmin) {
    setActiveTab('dashboard');
  }

  // Safety fallback if user tries to view incoming-leads without eligibility or permission
  if (activeTab === 'incoming-leads') {
    const isEligibleRole = currentUser && ['super_admin', 'admin', 'manager', 'team_lead'].includes(
      currentUser.role.toLowerCase().replace(/\s+/g, '_')
    );
    if (!isEligibleRole || !canViewIncomingLeads) {
      setActiveTab('dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settingsSubTab={settingsSubTab}
        setSettingsSubTab={setSettingsSubTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          onOpenLeadDetail={handleOpenLeadDetail}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 w-full min-h-screen px-3 sm:px-4 lg:px-5 py-4">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToLeads={handleNavigateToLeads}
              onNavigateToFollowUps={handleNavigateToFollowUps}
              onOpenLeadDetail={handleOpenLeadDetail}
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

          {activeTab === 'reports' && <ReportsView />}

          {/* Admin Routes */}
          {activeTab === 'users' && <UsersAdminView />}
          {activeTab === 'roles' && <RolesAdminView />}
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
