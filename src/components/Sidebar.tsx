import React, { useState, useEffect } from 'react';
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
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Building2,
  FileSignature,
  Layers,
  MessageCircle,
  Inbox
} from 'lucide-react';
import { getRoleBadgeStyle } from '../utils/formatters';
import { SettingsSubTab } from '../types';

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
  settingsSubTab?: SettingsSubTab;
  setSettingsSubTab?: (tab: SettingsSubTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'apex_crm_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settingsSubTab = 'branding',
  setSettingsSubTab,
  isOpenMobile,
  setIsOpenMobile
}) => {
  const {
    currentUser,
    logout,
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(() => activeTab === 'settings');

  // Keep settings sub-menu open when activeTab changes to settings
  useEffect(() => {
    if (activeTab === 'settings') {
      setIsSettingsMenuOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  if (!currentUser) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDueCount = scopedFollowUps.filter(f => f.scheduledDate === todayStr && f.status === 'Pending').length;
  const missedCount = scopedFollowUps.filter(f => f.status === 'Missed' || (f.scheduledDate < todayStr && f.status === 'Pending')).length;

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
    { id: 'roles', label: 'Roles & Perms', icon: ShieldCheck, visible: canManageRoles },
    { id: 'teams', label: 'Teams', icon: Network, visible: canManageTeams },
    { id: 'services', label: 'Services', icon: Package, visible: canManageServices },
    { id: 'sources', label: 'Lead Sources', icon: Megaphone, visible: canManageServices || canAccessAdmin },
    { id: 'logs', label: 'Activity Logs', icon: History, visible: canViewAuditLogs },
    { id: 'settings', label: 'Settings', icon: Settings, visible: canAccessSettings }
  ].filter(item => item.visible);

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  const roleStyle = getRoleBadgeStyle(currentUser.role);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-200 ease-in-out shrink-0 ${
          isCollapsed ? 'lg:w-16 w-60' : 'lg:w-56 w-60'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header & Toggle */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {settings.companyLogo ? (
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-md shadow-black/40">
                <img
                  src={settings.companyLogo}
                  alt={settings.companyName || 'Logo'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0 font-extrabold text-xs">
                {settings.applicationName ? settings.applicationName.substring(0, 2).toUpperCase() : <Sparkles className="w-4 h-4" />}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-sm tracking-tight truncate">
                    {settings.applicationName || 'Apex CRM'}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded shrink-0">
                    v2.5
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {settings.companyName || 'iSysware'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Main Navigation Section */}
          <div>
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Main Navigation
              </p>
            )}
            <nav className="space-y-0.5">
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id as ActiveTab)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-medium transition-colors cursor-pointer relative group ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {!isCollapsed && item.alertBadge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                          isActive 
                            ? 'bg-amber-400 text-slate-950' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {item.alertBadge}
                      </span>
                    )}

                    {/* Badge Dot for Collapsed Mode */}
                    {isCollapsed && (item.badge !== undefined || item.alertBadge) && (
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        item.alertBadge ? 'bg-amber-400' : 'bg-indigo-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Administration Section */}
          {adminNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              {!isCollapsed && (
                <div className="px-2.5 flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Admin
                  </p>
                  <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/20">
                    {currentUser.role === 'Super Admin' ? 'Super' : 'Admin'}
                  </span>
                </div>
              )}
              <nav className="space-y-0.5">
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isSettingsItem = item.id === 'settings';

                  const settingsSubItems: { id: SettingsSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
                    { id: 'branding', label: 'Organization Identity', icon: Building2 },
                    { id: 'letterhead', label: 'Letterhead & PDF Builder', icon: FileSignature },
                    { id: 'pricing', label: 'Software Pricing Models', icon: Layers },
                    { id: 'communication', label: 'Communication & Alerts', icon: MessageCircle }
                  ];

                  const handleItemClick = () => {
                    if (isSettingsItem) {
                      setActiveTab('settings');
                      if (activeTab === 'settings') {
                        setIsSettingsMenuOpen(prev => !prev);
                      } else {
                        setIsSettingsMenuOpen(true);
                      }
                      setIsOpenMobile(false);
                    } else {
                      handleSelectTab(item.id as ActiveTab);
                    }
                  };

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={handleItemClick}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-2.5 py-2'} rounded-xl text-xs font-medium transition-colors cursor-pointer relative group ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && isSettingsItem && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                              isSettingsMenuOpen ? 'rotate-180 text-white' : 'text-slate-400'
                            }`}
                          />
                        )}
                      </button>

                      {/* Expandable Settings Sub-Menu */}
                      {isSettingsItem && !isCollapsed && isSettingsMenuOpen && (
                        <div className="ml-3 pl-2.5 border-l-2 border-slate-800 my-1 space-y-0.5 animate-fadeIn">
                          {settingsSubItems.map((sub, idx) => {
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
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer ${
                                  isSubActive
                                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-1.5'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                              >
                                <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                                <span className="truncate">{idx + 1}. {sub.label}</span>
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

        {/* Bottom User Profile Card */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/60">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                title={`${currentUser.name} (${currentUser.role})`}
                className="relative"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                />
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-slate-900 ${roleStyle.dot}`} />
              </div>
              <button
                onClick={logout}
                title="Sign out of CRM session"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${roleStyle.dot}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-snug">{currentUser.name}</p>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 mt-0.5 rounded-full border ${roleStyle.badge}`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign out of CRM session"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
