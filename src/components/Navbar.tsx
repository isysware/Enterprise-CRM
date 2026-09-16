import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { ActiveTab } from './Sidebar';
import {
  Menu,
  Bell,
  LogOut,
  ChevronRight,
  AlertTriangle,
  CalendarCheck,
  UserPlus,
  CheckCircle2,
  X,
  ArrowRight,
  CheckCheck,
  Check
} from 'lucide-react';
import { getRoleBadgeStyle } from '../utils/formatters';

interface NavbarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
  onOpenLeadDetail?: (leadId: string) => void;
}

interface NotificationItem {
  id: string;
  type: 'missed_followup' | 'today_followup' | 'lead_assigned' | 'system';
  title: string;
  message: string;
  time: string;
  targetTab?: ActiveTab;
  targetLeadId?: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

const NOTIF_READ_STORAGE_KEY = 'apex_crm_read_notifications';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  onOpenMobileMenu,
  onOpenLeadDetail
}) => {
  const { currentUser, logout, scopedFollowUps, scopedLeads } = useCRM();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_READ_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {
      console.error('Failed to read notification storage:', e);
    }
    return new Set();
  });
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Sync read notification IDs with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_READ_STORAGE_KEY, JSON.stringify(Array.from(readNotifIds)));
    } catch (e) {
      console.error('Failed to save notification storage:', e);
    }
  }, [readNotifIds]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const roleStyle = getRoleBadgeStyle(currentUser.role);

  // Map ActiveTab to clean breadcrumb title
  const getTabTitle = (tab: ActiveTab): { section?: string; page: string } => {
    switch (tab) {
      case 'dashboard':
        return { page: 'Dashboard' };
      case 'leads':
        return { page: 'Leads' };
      case 'incoming-leads':
        return { page: 'Incoming Leads' };
      case 'followups':
        return { page: 'Follow-ups' };
      case 'calendar':
        return { page: 'Calendar' };
      case 'clients':
        return { page: 'Clients' };
      case 'reports':
        return { page: 'Reports' };
      case 'users':
        return { section: 'Admin', page: 'Users Management' };
      case 'roles':
        return { section: 'Admin', page: 'Roles & Permissions' };
      case 'teams':
        return { section: 'Admin', page: 'Sales Teams' };
      case 'services':
        return { section: 'Admin', page: 'Services Catalog' };
      case 'sources':
        return { section: 'Admin', page: 'Lead Sources' };
      case 'logs':
        return { section: 'Admin', page: 'Audit Logs' };
      case 'settings':
        return { section: 'Admin', page: 'System Settings' };
      default:
        return { page: 'Dashboard' };
    }
  };

  const breadcrumb = getTabTitle(activeTab);

  // Dynamic Notifications calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const missedFollowUps = scopedFollowUps.filter(
    f => f.status === 'Missed' || (f.scheduledDate < todayStr && f.status === 'Pending')
  );
  const todayFollowUps = scopedFollowUps.filter(
    f => f.scheduledDate === todayStr && f.status === 'Pending'
  );
  const urgentLeads = scopedLeads.filter(l => l.priority === 'Urgent' && l.status !== 'Converted');

  // Build notifications array
  const rawNotifications: NotificationItem[] = [
    ...missedFollowUps.slice(0, 4).map(f => ({
      id: `notif-missed-${f.id}`,
      type: 'missed_followup' as const,
      title: 'Missed Follow-up Alert',
      message: `Overdue follow-up with ${f.clientBusiness || f.clientName} (${f.scheduledTime})`,
      time: `Due ${f.scheduledDate}`,
      targetTab: 'followups' as ActiveTab,
      targetLeadId: f.leadId,
      isRead: readNotifIds.has(`notif-missed-${f.id}`),
      priority: 'high' as const
    })),
    ...todayFollowUps.slice(0, 4).map(f => ({
      id: `notif-today-${f.id}`,
      type: 'today_followup' as const,
      title: "Today's Follow-up Scheduled",
      message: `${f.type} touchpoint with ${f.clientBusiness || f.clientName} at ${f.scheduledTime}`,
      time: 'Today',
      targetTab: 'followups' as ActiveTab,
      targetLeadId: f.leadId,
      isRead: readNotifIds.has(`notif-today-${f.id}`),
      priority: 'medium' as const
    })),
    ...urgentLeads.slice(0, 3).map(l => ({
      id: `notif-lead-${l.id}`,
      type: 'lead_assigned' as const,
      title: 'Urgent Priority Lead',
      message: `${l.businessName || l.name} (${l.city}) requires immediate outreach response.`,
      time: 'Action required',
      targetTab: 'leads' as ActiveTab,
      targetLeadId: l.id,
      isRead: readNotifIds.has(`notif-lead-${l.id}`),
      priority: 'high' as const
    }))
  ];

  // If no dynamic alerts exist, provide a baseline system alert
  if (rawNotifications.length === 0) {
    rawNotifications.push({
      id: 'notif-welcome',
      type: 'system',
      title: 'System Ready',
      message: `Logged in as ${currentUser.name} (${currentUser.role}). All follow-ups are on schedule.`,
      time: 'Just now',
      isRead: readNotifIds.has('notif-welcome'),
      priority: 'low'
    });
  }

  // Active unread notifications
  const activeUnreadNotifications = rawNotifications.filter(n => !n.isRead);
  const unreadCount = activeUnreadNotifications.length;

  const handleMarkAllRead = () => {
    setReadNotifIds(prev => {
      const updated = new Set(prev);
      rawNotifications.forEach(n => updated.add(n.id));
      return updated;
    });
  };

  const handleMarkSingleRead = (id: string) => {
    setReadNotifIds(prev => new Set(prev).add(id));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    handleMarkSingleRead(item.id);
    setIsNotifOpen(false);

    if (item.targetTab) {
      onNavigate(item.targetTab);
    }
    if (item.targetLeadId && onOpenLeadDetail) {
      // Short delay to ensure view transition renders smoothly
      setTimeout(() => {
        onOpenLeadDetail(item.targetLeadId!);
      }, 50);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu Toggle & Page Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Breadcrumb & Title */}
        <div className="flex items-center gap-2">
          {breadcrumb.section && (
            <>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
                {breadcrumb.section}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
            </>
          )}
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {breadcrumb.page}
          </h1>

          {/* Active Portal Badge */}
          <span className={`hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 ml-2 rounded-full border ${roleStyle.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Right-Aligned Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Notifications & Alerts"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Drawer / Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
              {/* Header Row */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications &amp; Alerts
                  </span>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      {unreadCount} New
                    </span>
                  ) : (
                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      0 New
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all as read</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification Content Body */}
              {activeUnreadNotifications.length === 0 ? (
                /* Empty State: You're all caught up! 🎉 */
                <div className="py-10 px-6 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-xs">
                    🎉
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      No new notifications
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                      You're all caught up! All scheduled follow-ups and leads are up to date.
                    </p>
                  </div>
                </div>
              ) : (
                /* Notification Items List */
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750">
                  {activeUnreadNotifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="group p-3.5 text-left transition-all cursor-pointer flex items-start gap-3 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-slate-800 relative"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.type === 'missed_followup' ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : item.type === 'today_followup' ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : item.type === 'lead_assigned' ? (
                          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                            <UserPlus className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      </div>

                      {/* Individual Dismiss / Mark Read Check Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkSingleRead(item.id);
                        }}
                        title="Mark as read"
                        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* View All Follow-Ups Action Footer */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-center">
                <button
                  onClick={() => {
                    onNavigate('followups');
                    setIsNotifOpen(false);
                  }}
                  className="w-full text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
                >
                  <span>Open Follow-Up Manager</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modern Logout Button */}
        <button
          onClick={logout}
          title="Sign out of CRM session"
          className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800/60 font-semibold text-xs py-2 px-3 sm:px-3.5 rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-rose-500" />
          <span className="font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};
