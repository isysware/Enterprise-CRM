import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { FollowUp, FollowUpType } from '../types';
import {
  CalendarCheck,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  MessageCircle,
  Phone,
  RotateCcw,
  Eye,
  Search,
  Filter,
  Sparkles,
  X
} from 'lucide-react';
import { getWhatsAppUrl, getLocalDateString, classifyFollowUp, formatDate, formatTime } from '../utils/formatters';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select, EmptyState, DataTableScrollFrame } from './ui';

interface FollowUpsViewProps {
  initialTab?: 'today' | 'missed' | 'upcoming' | 'done';
  onOpenScheduleModal: () => void;
  onOpenRescheduleModal: (followUp: FollowUp) => void;
  onOpenLeadDetail: (leadId: string) => void;
  onOpenConvertModal?: (leadId: string) => void;
}



export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  initialTab = 'today',
  onOpenScheduleModal,
  onOpenRescheduleModal,
  onOpenLeadDetail,
  onOpenConvertModal
}) => {
  const { scopedFollowUps, completeFollowUp, currentUser, teams, scopedTeams, users, scopedUsers, leads } = useCRM();
  const baseTeams = scopedTeams;
  const [activeTab, setActiveTab] = useState<'today' | 'missed' | 'upcoming' | 'done'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('All');

  const todayStr = getLocalDateString();

  // Scoped employees based on selected team
  const availableEmployees = useMemo(() => {
    if (selectedTeam === 'All') return scopedUsers;
    return scopedUsers.filter(u => u.teamId === selectedTeam);
  }, [scopedUsers, selectedTeam]);

  // Base follow-ups strictly filtered by Team and Employee
  const baseFollowUps = useMemo(() => {
    return scopedFollowUps.filter(fu => {
      if (selectedTeam !== 'All') {
        const assignedUser = users.find(u => u.id === fu.assignedToId);
        const leadObj = leads.find(l => l.id === fu.leadId);
        const fuTeamId = assignedUser?.teamId || leadObj?.teamId;
        if (fuTeamId !== selectedTeam) {
          return false;
        }
      }
      if (selectedEmployee !== 'All') {
        const matchId = fu.assignedToId === selectedEmployee;
        const emp = users.find(u => u.id === selectedEmployee);
        const matchName = emp && (fu.assignedToName === emp.name || fu.assignedToName === emp.email);
        if (!matchId && !matchName) {
          return false;
        }
      }
      return true;
    });
  }, [scopedFollowUps, selectedTeam, selectedEmployee, users, leads]);

  // Tab Filtering logic based on team/employee filtered baseFollowUps
  const todayList = useMemo(() => baseFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'today'), [baseFollowUps, todayStr]);
  const missedList = useMemo(() => baseFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'missed'), [baseFollowUps, todayStr]);
  const upcomingList = useMemo(() => baseFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'upcoming'), [baseFollowUps, todayStr]);
  const doneList = useMemo(() => baseFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'completed'), [baseFollowUps, todayStr]);

  const currentTabList = useMemo(() => {
    if (activeTab === 'today') return todayList;
    if (activeTab === 'missed') return missedList;
    if (activeTab === 'upcoming') return upcomingList;
    if (activeTab === 'done') return doneList;
    return [];
  }, [activeTab, todayList, missedList, upcomingList, doneList]);

  // Search & Type filters applied on current active tab list
  const filteredList = useMemo(() => {
    return currentTabList.filter(fu => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchClient = fu.clientName.toLowerCase().includes(q);
        const matchBiz = fu.clientBusiness.toLowerCase().includes(q);
        const matchPhone = fu.phone.toLowerCase().includes(q);
        const matchNotes = fu.notes.toLowerCase().includes(q);
        if (!matchClient && !matchBiz && !matchPhone && !matchNotes) return false;
      }
      if (selectedType !== 'All' && fu.type !== selectedType) {
        return false;
      }
      return true;
    });
  }, [currentTabList, searchQuery, selectedType]);

  const tabDefs = [
    { id: 'today', label: 'Due Today', count: todayList.length, icon: Calendar, variant: 'warning' as const },
    { id: 'missed', label: 'Missed Follow-Ups', count: missedList.length, icon: AlertTriangle, variant: 'danger' as const },
    { id: 'upcoming', label: 'Upcoming Activity', count: upcomingList.length, icon: Clock, variant: 'primary' as const },
    { id: 'done', label: 'Completed', count: doneList.length, icon: CheckCircle2, variant: 'success' as const }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="Follow-Ups"
        subtitle="Manage due, missed and upcoming customer follow-up activity."
        badge={
          <Badge variant={todayList.length > 0 ? 'warning' : 'neutral'} size="sm">
            {todayList.length} Due Today
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenScheduleModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Schedule Follow-Up
          </Button>
        }
      />

      {/* C. PRIMARY SEGMENTED FILTERS / TABS & SEARCH ROW */}
      <Card>
        <div className="p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Segmented Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
              {tabDefs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${isActive
                        ? 'bg-white dark:bg-slate-900 text-[#2563EB] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${isActive
                          ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/60'
                          : 'bg-white/80 dark:bg-slate-700 text-[#64748B] dark:text-slate-300'
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Filters: Search, Team, Employee & Type */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="w-full sm:w-56">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search customer, phone, notes..."
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                  rightIcon={
                    searchQuery ? (
                      <button type="button" onClick={() => setSearchQuery('')} className="cursor-pointer">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              <div className="w-36">
                <Select
                  value={selectedTeam}
                  onChange={e => {
                    setSelectedTeam(e.target.value);
                    setSelectedEmployee('All');
                  }}
                >
                  <option value="All">{currentUser?.role === 'Employee' ? 'My Team' : 'All Teams'}</option>
                  {baseTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-40">
                <Select
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                >
                  <option value="All">{currentUser?.role === 'Employee' ? 'My Follow-Ups' : 'All Employees'}</option>
                  {availableEmployees.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-32">
                <Select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Call">Call</option>
                  <option value="Meeting">Meeting</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Demo">Demo</option>
                  <option value="Visit">Visit</option>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* D. LIST / TABLE CONTAINER */}
      <Card className="overflow-hidden">
        <DataTableScrollFrame>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-[#E5EAF1] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[130px]">Due Date / Time</th>
                <th className="p-3.5 min-w-[200px]">Lead / Customer</th>
                <th className="p-3.5 min-w-[150px]">Contact</th>
                <th className="p-3.5 min-w-[110px]">Type</th>
                <th className="p-3.5 min-w-[100px]">Source</th>
                <th className="p-3.5 min-w-[110px]">Status</th>
                <th className="p-3.5 min-w-[220px]">Notes / Context</th>
                <th className="p-3.5 min-w-[140px]">Assigned Rep</th>
                <th className="p-3.5 min-w-[140px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <EmptyState
                      title={`No follow-ups found under "${activeTab}"`}
                      description="You're either all caught up with scheduled tasks, or no records matched your filter filters."
                      actionLabel="Schedule Follow-Up"
                      onAction={onOpenScheduleModal}
                    />
                  </td>
                </tr>
              ) : (
                filteredList.map(fu => {
                  const waUrl = getWhatsAppUrl(fu.phone, fu.clientName, fu.clientBusiness);
                  const isDone =
                    fu.status === 'Done' ||
                    fu.status === 'Completed' ||
                    (fu.status as string)?.toLowerCase() === 'completed' ||
                    (fu.status as string)?.toLowerCase() === 'done';
                  const isMissed =
                    fu.status === 'Missed' ||
                    (fu.scheduledDate < todayStr && fu.status === 'Pending');

                  const assignedUser = users.find(u => u.id === fu.assignedToId || u.name === fu.assignedToName);

                  return (
                    <tr
                      key={fu.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Due Date & Time */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className={`font-mono text-xs font-semibold ${isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F172A] dark:text-slate-200'
                          }`}>
                          {formatDate(fu.scheduledDate)}
                        </div>
                        <span className="text-[11px] text-[#64748B] font-mono">at {formatTime(fu.scheduledTime)}</span>
                      </td>

                      {/* Lead / Customer */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => fu.leadId && onOpenLeadDetail(fu.leadId)}
                          className="font-bold text-xs text-[#0F172A] dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors text-left truncate block cursor-pointer"
                        >
                          {fu.clientBusiness}
                        </button>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                          {fu.clientName}
                        </p>
                      </td>

                      {/* Phone & Direct Links */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-[#0F172A] dark:text-slate-300">{fu.phone}</span>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Direct WhatsApp"
                            className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                          <a
                            href={`tel:${fu.phone}`}
                            title="Call phone"
                            className="p-1 rounded bg-slate-100 text-[#64748B] hover:bg-slate-200 transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge variant="primary" size="sm">
                          {fu.type}
                        </Badge>
                      </td>

                      {/* Source */}
                      <td className="p-3.5 text-[#64748B] whitespace-nowrap">
                        {fu.source || 'CRM'}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isDone ? (
                          <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Done
                          </Badge>
                        ) : isMissed ? (
                          /* Subtle danger emphasis: small red badge/icon, not a full red card background */
                          <Badge variant="danger" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                            Missed
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" icon={<Clock className="w-3 h-3" />}>
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Notes / Context */}
                      <td className="p-3.5 text-[#64748B] dark:text-slate-300">
                        <p className="line-clamp-2 max-w-[220px]">{fu.notes}</p>
                        {fu.resultNotes && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            Outcome: {fu.resultNotes}
                          </p>
                        )}
                      </td>

                      {/* Assigned Representative */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5" title={`Assigned to ${fu.assignedToName}`}>
                          {assignedUser?.avatar ? (
                            <img
                              src={assignedUser.avatar}
                              alt={fu.assignedToName}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#E5EAF1] dark:ring-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-[#0F172A] shrink-0">
                              {(fu.assignedToName || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-xs text-[#0F172A] dark:text-slate-200 truncate max-w-[110px]">
                            {fu.assignedToName}
                          </span>
                        </div>
                      </td>

                      {/* E. ACTIONS: Mark Done, Convert Lead, Reschedule, View Lead (SEPARATE ACTIONS!) */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* 1. Mark Done Action */}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => completeFollowUp(fu.id, 'Follow-up executed successfully.')}
                              title="Mark Done"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* 2. Convert Lead Action (SEPARATE from Mark Done!) */}
                          {!isDone && fu.leadId && onOpenConvertModal && (
                            <button
                              type="button"
                              onClick={() => onOpenConvertModal(fu.leadId!)}
                              title="Convert Lead to Client"
                              className="p-1.5 text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}

                          {/* 3. Reschedule Action */}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => onOpenRescheduleModal(fu)}
                              title="Reschedule follow-up"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* 4. View Lead Action */}
                          {fu.leadId && (
                            <button
                              type="button"
                              onClick={() => onOpenLeadDetail(fu.leadId)}
                              title="View Lead Details"
                              className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableScrollFrame>
      </Card>
    </div>
  );
};
