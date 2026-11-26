'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useCRM } from '../context/CRMContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  Briefcase,
  BarChart3,
  UserCog,
  ShieldCheck,
  Network,
  Package,
  Megaphone,
  History,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Building2,
  FileSignature,
  Layers,
  MessageCircle,
  Inbox,
  TrendingUp,
  DollarSign,
  X
} from 'lucide-react';
import { getRoleBadgeStyle, getLocalDateString, classifyFollowUp } from '../utils/formatters';
import { SettingsSubTab } from '../types';
import { ReportId } from './reports/types';

export type ActiveTab =
  | 'dashboard'
  | 'leads'
  | 'incoming-leads'
  | 'followups'
  | 'calendar'
  | 'clients'
  | 'reports'
  | 'users'
  | 'roles'
  | 'teams'
  | 'services'
  | 'sources'
  | 'logs'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  reportSubTab?: ReportId;
  setReportSubTab?: (tab: ReportId) => void;
  settingsSubTab?: SettingsSubTab;
  setSettingsSubTab?: (tab: SettingsSubTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'apex_crm_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  reportSubTab = 'sales-pipeline',
  setReportSubTab,
  settingsSubTab = 'branding',
  setSettingsSubTab,
  isOpenMobile,
  setIsOpenMobile
}) => {
  const {
    currentUser,
    canAccessAdmin,
    canManageUsers,
    canManageRoles,
    canManageTeams,
    canManageServices,
    canViewReports,
    canViewClients,
    canViewAuditLogs,
    canAccessSettings,
    canViewIncomingLeads,
    scopedLeads,
    scopedFollowUps,
    incomingLeads,
    settings
  } = useCRM();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState<boolean>(() => activeTab === 'reports');
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(() => activeTab === 'settings');

  const shouldReduceMotion = useReducedMotion();
  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

  // Accordion behavior: expanding Reports collapses Settings, expanding Settings collapses Reports
  useEffect(() => {
    if (activeTab === 'reports') {
      setIsReportsMenuOpen(true);
      setIsSettingsMenuOpen(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'settings') {
      setIsSettingsMenuOpen(true);
      setIsReportsMenuOpen(false);
    }
  }, [activeTab]);

  const toggleReportsMenu = () => {
    setIsReportsMenuOpen(prev => {
      const next = !prev;
      if (next) setIsSettingsMenuOpen(false);
      return next;
    });
  };

  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen(prev => {
      const next = !prev;
      if (next) setIsReportsMenuOpen(false);
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  if (!currentUser) return null;

  const todayStr = getLocalDateString();
  const todayDueCount = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'today').length;
  const missedCount = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'missed').length;

  const canAccessIncomingLeads =
    ['Super Admin', 'Admin', 'Manager', 'Team Lead'].includes(currentUser.role) &&
    canViewIncomingLeads;
  const unassignedIncomingCount = incomingLeads.filter(l => l.status === 'new').length;

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { id: 'leads', label: 'Leads', icon: Users, badge: scopedLeads.length, visible: true },
    {
      id: 'incoming-leads',
      label: 'Incoming Leads',
      icon: Inbox,
      badge: unassignedIncomingCount > 0 ? unassignedIncomingCount : undefined,
      visible: canAccessIncomingLeads
    },
    { 
      id: 'followups', 
      label: 'Follow-Ups', 
      icon: CalendarCheck, 
      alertBadge: todayDueCount > 0 ? `${todayDueCount} Today` : missedCount > 0 ? `${missedCount} Missed` : undefined,
      isUrgent: todayDueCount > 0 || missedCount > 0,
      visible: true
    },
    { id: 'calendar', label: 'Calendar', icon: Calendar, visible: true },
    { id: 'clients', label: 'Clients', icon: Briefcase, visible: canViewClients },
    { id: 'reports', label: 'Reports', icon: BarChart3, visible: canViewReports }
  ].filter(item => item.visible);

  const adminNavItems = [
    { id: 'users', label: 'Users', icon: UserCog, visible: canManageUsers },
    { id: 'roles', label: 'Roles & Perms', icon: ShieldCheck, visible: currentUser.role === 'Super Admin' && canManageRoles },
    { id: 'teams', label: 'Teams', icon: Network, visible: canManageTeams },
    { id: 'services', label: 'Services', icon: Package, visible: canManageServices },
    { id: 'sources', label: 'Lead Sources', icon: Megaphone, visible: canManageServices || canAccessAdmin },
    { id: 'logs', label: 'Activity Logs', icon: History, visible: canViewAuditLogs },
    { id: 'settings', label: 'Settings', icon: Settings, visible: canAccessSettings }
  ].filter(item => item.visible);

  const reportSubItems: { id: ReportId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'sales-pipeline', label: 'Sales & Pipeline', icon: TrendingUp },
    { id: 'team-staff', label: 'Team & Staff', icon: Users },
    { id: 'followups-activity', label: 'Follow-Ups & Activity', icon: CalendarCheck },
    { id: 'clients-conversions', label: 'Clients & Conversions', icon: Briefcase },
    { id: 'source-service', label: 'Source & Service', icon: Layers },
    { id: 'commercial-revenue', label: 'Commercial & Revenue', icon: DollarSign }
  ];

  const settingsSubItems: { id: SettingsSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'branding', label: 'Organization Identity', icon: Building2 },
    { id: 'letterhead', label: 'Letterhead & PDF', icon: FileSignature },
    { id: 'pricing', label: 'Pricing Models', icon: Layers },
    { id: 'communication', label: 'Communication & Alerts', icon: MessageCircle }
  ];

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  const roleStyle = getRoleBadgeStyle(currentUser.role);

  return (
    <>
      {/* ========================================================================= */}
      {/* MOBILE DRAWER WITH MOTION BACKDROP & SLIDE                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springTransition}
              onClick={() => setIsOpenMobile(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
              aria-hidden="true"
            />

            {/* Mobile Drawer Panel */}
            <motion.aside
              key="mobile-sidebar-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={springTransition}
              className="fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-white dark:bg-slate-900 border-r border-[#E5EAF1] dark:border-slate-800 flex flex-col justify-between shadow-2xl lg:hidden select-none"
            >
              {/* Mobile Header with Branding & Close Button */}
              <div className="p-3.5 sm:p-4 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    <img
                      src={settings.companyLogo || '/isysware-logo.png'}
                      alt={settings.companyName || 'Logo'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/isysware-logo.png';
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0F172A] dark:text-white text-sm tracking-tight truncate">
                        {settings.applicationName || 'Apex CRM'}
                      </span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/60 dark:text-blue-400 px-1 py-0.2 rounded shrink-0">
                        v2.5
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium truncate">
                      {settings.companyName || 'iSysware'}
                    </p>
                  </div>
                </div>

                {/* Mobile Close Button */}
                <button
                  onClick={() => setIsOpenMobile(false)}
                  title="Close menu"
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Scrollable Navigation */}
              <div className="flex-1 overflow-y-auto sidebar-scrollbar px-2.5 py-3 space-y-4">
                <div>
                  <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    WORKSPACE
                  </p>
                  <nav className="space-y-0.5">
                    {mainNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isReportsItem = item.id === 'reports';

                      const handleItemClick = () => {
                        if (isReportsItem) {
                          if (activeTab !== 'reports') {
                            setActiveTab('reports');
                            if (!reportSubTab) setReportSubTab?.('sales-pipeline');
                            setIsReportsMenuOpen(true);
                            setIsSettingsMenuOpen(false);
                          } else {
                            toggleReportsMenu();
                          }
                        } else {
                          handleSelectTab(item.id as ActiveTab);
                        }
                      };

                      return (
                        <div key={item.id} className="space-y-0.5">
                          <button
                            onClick={handleItemClick}
                            className={`w-full h-[38px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer relative group ${
                              isActive
                                ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isReportsItem ? (
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isReportsMenuOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'}`} />
                            ) : (
                              <>
                                {item.badge !== undefined && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${isActive ? 'bg-[#2563EB] text-white dark:bg-blue-600' : 'bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {item.badge}
                                  </span>
                                )}
                                {item.alertBadge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900">
                                    {item.alertBadge}
                                  </span>
                                )}
                              </>
                            )}
                          </button>

                          {isReportsItem && isReportsMenuOpen && (
                            <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-800 my-1 space-y-0.5 animate-fadeIn">
                              {reportSubItems.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = activeTab === 'reports' && (reportSubTab === sub.id || (!reportSubTab && sub.id === 'sales-pipeline'));
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => {
                                      setActiveTab('reports');
                                      setReportSubTab?.(sub.id);
                                      setIsOpenMobile(false);
                                    }}
                                    className={`w-full h-[34px] flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors text-left cursor-pointer ${
                                      isSubActive
                                        ? 'bg-blue-50/70 text-[#2563EB] font-medium border-l-2 border-[#2563EB] pl-2 rounded-r-md dark:bg-blue-950/50 dark:text-blue-300'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 rounded-md'
                                    }`}
                                  >
                                    <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                                    <span className="truncate">{sub.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>

                {adminNavItems.length > 0 && (
                  <div className="pt-2 border-t border-[#E5EAF1] dark:border-slate-800">
                    <div className="px-3 flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        ADMINISTRATION
                      </p>
                      <span className="text-[9px] font-mono bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.2 rounded border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-400">
                        {currentUser.role === 'Super Admin' ? 'Super' : 'Admin'}
                      </span>
                    </div>
                    <nav className="space-y-0.5">
                      {adminNavItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isSettingsItem = item.id === 'settings';

                        const handleItemClick = () => {
                          if (isSettingsItem) {
                            if (activeTab !== 'settings') {
                              setActiveTab('settings');
                              if (!settingsSubTab) setSettingsSubTab?.('branding');
                              setIsSettingsMenuOpen(true);
                              setIsReportsMenuOpen(false);
                            } else {
                              toggleSettingsMenu();
                            }
                          } else {
                            handleSelectTab(item.id as ActiveTab);
                          }
                        };

                        return (
                          <div key={item.id} className="space-y-0.5">
                            <button
                              onClick={handleItemClick}
                              className={`w-full h-[38px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer relative group ${
                                isActive
                                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {isSettingsItem && (
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isSettingsMenuOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'}`} />
                              )}
                            </button>

                            {isSettingsItem && isSettingsMenuOpen && (
                              <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-800 my-1 space-y-0.5 animate-fadeIn">
                                {settingsSubItems.map((sub) => {
                                  const SubIcon = sub.icon;
                                  const isSubActive = activeTab === 'settings' && settingsSubTab === sub.id;
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        setActiveTab('settings');
                                        setSettingsSubTab?.(sub.id);
                                        setIsOpenMobile(false);
                                      }}
                                      className={`w-full h-[34px] flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors text-left cursor-pointer ${
                                        isSubActive
                                          ? 'bg-blue-50/70 text-[#2563EB] font-medium border-l-2 border-[#2563EB] pl-2 rounded-r-md dark:bg-blue-950/50 dark:text-blue-300'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 rounded-md'
                                      }`}
                                    >
                                      <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                                      <span className="truncate">{sub.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>

              {/* Mobile Bottom Workspace Indicator */}
              <div className="p-3 px-3.5 border-t border-[#E5EAF1] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950/60 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate">
                      {settings.companyName || 'iSysware'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">v2.5</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR WITH SMOOTH MOTION PACKAGE COLLAPSE / EXPAND              */}
      {/* ========================================================================= */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={springTransition}
        className="hidden lg:flex flex-col justify-between h-full bg-white dark:bg-slate-900 border-r border-[#E5EAF1] dark:border-slate-800 shrink-0 select-none overflow-hidden"
      >
        {/* Brand Header & Toggle */}
        <div className={`border-b border-[#E5EAF1] dark:border-slate-800 flex items-center bg-white dark:bg-slate-900 shrink-0 min-h-[64px] ${
          isCollapsed ? 'justify-center px-2' : 'justify-between gap-2 p-3.5 sm:p-4'
        }`}>
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full relative group">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                title="Expand Sidebar"
                className="cursor-pointer focus:outline-none flex items-center justify-center"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <img
                    src={settings.companyLogo || '/isysware-logo.png'}
                    alt={settings.companyName || 'Logo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/isysware-logo.png';
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src={settings.companyLogo || '/isysware-logo.png'}
                    alt={settings.companyName || 'Logo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/isysware-logo.png';
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0 overflow-hidden whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#0F172A] dark:text-white text-sm tracking-tight truncate">
                      {settings.applicationName || 'Apex CRM'}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/60 dark:text-blue-400 px-1 py-0.2 rounded shrink-0">
                      v2.5
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium truncate">
                    {settings.companyName || 'iSysware'}
                  </p>
                </div>
              </div>

              {/* Desktop Collapse Toggle Button */}
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse Sidebar"
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar px-2.5 py-3 space-y-4">
          {/* Main Navigation Section */}
          <div>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springTransition}
                  className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 whitespace-nowrap overflow-hidden"
                >
                  WORKSPACE
                </motion.p>
              )}
            </AnimatePresence>

            <nav className="space-y-0.5">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isReportsItem = item.id === 'reports';

                const handleItemClick = () => {
                  if (isReportsItem) {
                    if (activeTab !== 'reports') {
                      setActiveTab('reports');
                      if (!reportSubTab) setReportSubTab?.('sales-pipeline');
                      setIsReportsMenuOpen(true);
                      setIsSettingsMenuOpen(false);
                    } else {
                      toggleReportsMenu();
                    }
                  } else {
                    handleSelectTab(item.id as ActiveTab);
                  }
                };

                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      type="button"
                      key={item.id}
                      onClick={handleItemClick}
                      title={isCollapsed ? `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ''}${item.alertBadge ? ` • ${item.alertBadge}` : ''}` : undefined}
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2 h-[38px]' : 'justify-between px-3 py-2 h-[38px]'} rounded-lg text-xs font-medium transition-colors cursor-pointer relative group ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                        
                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              transition={springTransition}
                              className="truncate whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && isReportsItem && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={springTransition}
                            className="shrink-0 pointer-events-none"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isReportsMenuOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'
                              }`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && !isReportsItem && item.badge !== undefined && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={springTransition}
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                              isActive
                                ? 'bg-[#2563EB] text-white dark:bg-blue-600'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && !isReportsItem && item.alertBadge && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={springTransition}
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                              isActive 
                                ? 'bg-amber-400 text-slate-950' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                            }`}
                          >
                            {item.alertBadge}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Badge Dot for Collapsed Mode */}
                      {isCollapsed && (item.badge !== undefined || item.alertBadge) && (
                        <span
                          title={`${item.label}: ${item.alertBadge || `${item.badge} items`}`}
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                            item.alertBadge ? 'bg-amber-500' : 'bg-[#2563EB]'
                          }`}
                        />
                      )}
                    </button>

                    {/* Expandable Reports Sub-Menu (Only in expanded desktop view) */}
                    {isReportsItem && !isCollapsed && isReportsMenuOpen && (
                      <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-800 my-1 space-y-0.5 animate-fadeIn">
                        {reportSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeTab === 'reports' && (reportSubTab === sub.id || (!reportSubTab && sub.id === 'sales-pipeline'));

                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveTab('reports');
                                setReportSubTab?.(sub.id);
                              }}
                              className={`w-full h-[34px] flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium transition-all text-left cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#EFF6FF] text-[#2563EB] font-medium border-l-2 border-[#2563EB] pl-2 rounded-r-md dark:bg-blue-950/50 dark:text-blue-300'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 rounded-md'
                              }`}
                            >
                              <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Administration Section */}
          {adminNavItems.length > 0 && (
            <div className="pt-2 border-t border-[#E5EAF1] dark:border-slate-800">
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={springTransition}
                    className="px-3 flex items-center justify-between mb-2 overflow-hidden whitespace-nowrap"
                  >
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      ADMINISTRATION
                    </p>
                    <span className="text-[9px] font-mono bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.2 rounded border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-400">
                      {currentUser.role === 'Super Admin' ? 'Super' : 'Admin'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <nav className="space-y-0.5">
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isSettingsItem = item.id === 'settings';

                  const handleItemClick = () => {
                    if (isSettingsItem) {
                      if (activeTab !== 'settings') {
                        setActiveTab('settings');
                        if (!settingsSubTab) setSettingsSubTab?.('branding');
                        setIsSettingsMenuOpen(true);
                        setIsReportsMenuOpen(false);
                      } else {
                        toggleSettingsMenu();
                      }
                    } else {
                      handleSelectTab(item.id as ActiveTab);
                    }
                  };

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={handleItemClick}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2 h-[38px]' : 'justify-between px-3 py-2 h-[38px]'} rounded-lg text-xs font-medium transition-colors cursor-pointer relative group ${
                          isActive
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                          <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                          
                          <AnimatePresence initial={false}>
                            {!isCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                transition={springTransition}
                                className="truncate whitespace-nowrap"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                          {!isCollapsed && isSettingsItem && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={springTransition}
                              className="shrink-0 pointer-events-none"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isSettingsMenuOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'
                                }`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>

                      {/* Expandable Settings Sub-Menu (Only in expanded desktop view) */}
                      {isSettingsItem && !isCollapsed && isSettingsMenuOpen && (
                        <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-800 my-1 space-y-0.5 animate-fadeIn">
                          {settingsSubItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeTab === 'settings' && settingsSubTab === sub.id;

                            return (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setActiveTab('settings');
                                  setSettingsSubTab?.(sub.id);
                                }}
                                className={`w-full h-[34px] flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium transition-all text-left cursor-pointer ${
                                  isSubActive
                                    ? 'bg-[#EFF6FF] text-[#2563EB] font-medium border-l-2 border-[#2563EB] pl-2 rounded-r-md dark:bg-blue-950/50 dark:text-blue-300'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 rounded-md'
                                }`}
                              >
                                <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Bottom Workspace Indicator (Minimal & Refined) */}
        <div className="p-3 border-t border-[#E5EAF1] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-[#0F172A] dark:text-white truncate">
                  {settings.companyName || 'iSysware CRM'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">v2.5</span>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};
