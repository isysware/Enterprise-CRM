import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { formatDate, getWhatsAppUrl } from '../utils/formatters';

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

  const todayStr = new Date().toISOString().split('T')[0];

  // Tab Filtering logic
  const todayList = scopedFollowUps.filter(
    f => f.scheduledDate === todayStr && f.status === 'Pending'
  );

  const missedList = scopedFollowUps.filter(
    f => (f.status === 'Missed' || (f.scheduledDate < todayStr && f.status === 'Pending'))
  );

  const upcomingList = scopedFollowUps.filter(
    f => f.scheduledDate > todayStr && f.status === 'Pending'
  );

  const doneList = scopedFollowUps.filter(f => f.status === 'Done');

  let currentTabList: FollowUp[] = [];
  if (activeTab === 'today') currentTabList = todayList;
  else if (activeTab === 'missed') currentTabList = missedList;
  else if (activeTab === 'upcoming') currentTabList = upcomingList;
  else if (activeTab === 'done') currentTabList = doneList;

  // Search, Type & Team filters
  const filteredList = currentTabList.filter(fu => {
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
    if (selectedTeam !== 'All') {
      const assignedUser = users.find(u => u.id === fu.assignedToId);
      const leadObj = leads.find(l => l.id === fu.leadId);
      const fuTeamId = assignedUser?.teamId || leadObj?.teamId;
      if (fuTeamId !== selectedTeam) {
        return false;
      }
    }
    return true;
  });

  const tabDefs = [
    { id: 'today', label: 'Today', count: todayList.length, icon: Calendar, color: 'text-amber-600 dark:text-amber-400' },
    { id: 'missed', label: 'Missed', count: missedList.length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
    { id: 'upcoming', label: 'Upcoming', count: upcomingList.length, icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'done', label: 'Done', count: doneList.length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' }
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Follow-Ups Tracker
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {todayList.length} Due Today
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stay on top of calls, demos, client visits, and WhatsApp updates. Complete or reschedule directly.
          </p>
        </div>

        <button
          onClick={onOpenScheduleModal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Schedule Follow-Up</span>
        </button>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {tabDefs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Type filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search follow-ups..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Team:</span>
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">{currentUser?.role === 'Employee' ? 'My Team' : 'All Permitted Teams'}</option>
              {baseTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Type:</span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Demo">Demo</option>
              <option value="Visit">Visit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[200px]">Client &amp; Business</th>
                <th className="p-3.5 min-w-[160px]">Phone / WhatsApp</th>
                <th className="p-3.5 min-w-[140px]">Date / Time</th>
                <th className="p-3.5 min-w-[110px]">Type</th>
                <th className="p-3.5 min-w-[100px]">Source</th>
                <th className="p-3.5 min-w-[110px]">Status</th>
                <th className="p-3.5 min-w-[220px]">Notes</th>
                <th className="p-3.5 min-w-[140px]">Assigned To</th>
                <th className="p-3.5 min-w-[150px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No follow-ups found under &quot;{activeTab}&quot;.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map(fu => {
                  const waUrl = getWhatsAppUrl(fu.phone, fu.clientName, fu.clientBusiness);
                  const isDone = fu.status === 'Done';
                  const isMissed = fu.status === 'Missed' || (fu.scheduledDate < todayStr && fu.status === 'Pending');

                  return (
                    <tr
                      key={fu.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Client */}
                      <td className="p-3.5">
                        <div>
                          <button
                            onClick={() => fu.leadId && onOpenLeadDetail(fu.leadId)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
                          >
                            {fu.clientBusiness}
                          </button>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {fu.clientName}
                          </p>
                        </div>
                      </td>

                      {/* Phone & WhatsApp Link */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{fu.phone}</span>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Direct WhatsApp Message"
                            className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`tel:${fu.phone}`}
                            title="Call Phone"
                            className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Date / Time */}
                      <td className="p-3.5 font-mono">
                        <div className={`font-semibold ${isMissed ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {formatDate(fu.scheduledDate)}
                        </div>
                        <span className="text-[10px] text-slate-400">at {fu.scheduledTime}</span>
                      </td>

                      {/* Type */}
                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {fu.type}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {fu.source}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : isMissed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-3 h-3" /> Missed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <p className="line-clamp-2">{fu.notes}</p>
                        {fu.resultNotes && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            Outcome: {fu.resultNotes}
                          </p>
                        )}
                      </td>

                      {/* Assigned Rep */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5" title={`Assigned to ${fu.assignedToName}`}>
                          {(() => {
                            const assignedUser = users.find(u => u.id === fu.assignedToId || u.name === fu.assignedToName);
                            if (assignedUser?.avatar) {
                              return (
                                <img
                                  src={assignedUser.avatar}
                                  alt={fu.assignedToName}
                                  className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600 shrink-0"
                                />
                              );
                            }
                            return (
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                {(fu.assignedToName || 'U').charAt(0).toUpperCase()}
                              </div>
                            );
                          })()}
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[120px]">
                            {fu.assignedToName}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {!isDone && (
                            <button
                              onClick={() => completeFollowUp(fu.id, 'Follow-up executed successfully.')}
                              title="Mark Follow-up as Completed"
                              aria-label="Mark Follow-up as Completed"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {!isDone && fu.leadId && onOpenConvertModal && (
                            <button
                              onClick={() => onOpenConvertModal(fu.leadId!)}
                              title="Convert Lead to Client"
                              aria-label="Convert Lead to Client"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onOpenRescheduleModal(fu)}
                            title="Reschedule Follow-Up"
                            aria-label="Reschedule Follow-Up"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {fu.leadId && (
                            <button
                              onClick={() => onOpenLeadDetail(fu.leadId)}
                              title="View Lead Details"
                              aria-label="View Lead Details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
