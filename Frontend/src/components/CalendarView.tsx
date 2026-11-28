import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { FollowUp } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Phone,
  RotateCcw,
  CalendarDays,
  ListFilter,
  Check,
  Building2,
  User,
  ArrowRight
} from 'lucide-react';
import { getWhatsAppUrl, getLocalDateString, formatDate, formatTime } from '../utils/formatters';
import { EmptyState, PageHeader, Button } from './ui';

interface CalendarViewProps {
  onOpenScheduleModal: (initialDate?: string) => void;
  onOpenRescheduleModal: (followUp: FollowUp) => void;
  onOpenLeadDetail: (leadId: string) => void;
}



export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenScheduleModal,
  onOpenRescheduleModal,
  onOpenLeadDetail
}) => {
  const { scopedFollowUps, completeFollowUp } = useCRM();

  // Current calendar view date (defaults to current date)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getLocalDateString());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate days in month and start day
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = useMemo(() => getLocalDateString(), []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(getLocalDateString(today));
  };

  // Group follow-ups by scheduledDate (YYYY-MM-DD)
  const followUpsByDate = useMemo(() => {
    return scopedFollowUps.reduce((acc, fu) => {
      if (!acc[fu.scheduledDate]) {
        acc[fu.scheduledDate] = [];
      }
      acc[fu.scheduledDate].push(fu);
      return acc;
    }, {} as Record<string, FollowUp[]>);
  }, [scopedFollowUps]);

  // Selected Day's events
  const selectedDayEvents = useMemo(() => {
    return followUpsByDate[selectedDateStr] || [];
  }, [followUpsByDate, selectedDateStr]);

  // Month total events
  const monthEventsCount = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return scopedFollowUps.filter(f => f.scheduledDate?.startsWith(monthPrefix)).length;
  }, [scopedFollowUps, year, month]);

  // Generate calendar grid cells
  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNumber: number;
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
      events: FollowUp[];
    } | null> = [];
    // Empty padding cells for start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null);
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        dateStr: dayStr,
        isToday: dayStr === todayStr,
        isSelected: dayStr === selectedDateStr,
        events: followUpsByDate[dayStr] || []
      });
    }
    return cells;
  }, [year, month, firstDayOfMonth, daysInMonth, todayStr, selectedDateStr, followUpsByDate]);

  // Agenda view items sorted chronologically
  const agendaDates = useMemo(() => {
    const sortedDates = Object.keys(followUpsByDate).sort();
    return sortedDates.map(dStr => ({
      dateStr: dStr,
      events: followUpsByDate[dStr]
    }));
  }, [followUpsByDate]);

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <PageHeader
        title="Calendar"
        subtitle="Plan and monitor scheduled lead follow-ups and sales activity."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenScheduleModal(selectedDateStr)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Schedule Follow-Up
          </Button>
        }
      />

      {/* 2. Unified Calendar Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Navigation Controls & Month Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            aria-label="Go to Today"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-white tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              ({monthEventsCount} activities)
            </span>
          </div>
        </div>

        {/* Right: View Mode Toggle (Month vs Agenda) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'month'
                ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-300 shadow-2xs'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === 'agenda'
                ? 'bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-300 shadow-2xs'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* 3. Main Calendar Body: Responsive Grid or Agenda */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Calendar Month Matrix: 8 columns on large screens */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-[#E5EAF1] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5 text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#E5EAF1] dark:divide-slate-800/80">
              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[90px] sm:min-h-[110px] bg-slate-50/50 dark:bg-slate-950/20 p-2"
                    />
                  );
                }

                const { dayNumber, dateStr, isToday, isSelected, events } = cell;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-all cursor-pointer select-none ${isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#2563EB] ring-inset'
                        : isToday
                          ? 'bg-blue-50/30 dark:bg-blue-950/15'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                  >
                    {/* Top Row: Date Number and Activity Count */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isToday
                            ? 'bg-[#2563EB] text-white shadow-2xs font-medium'
                            : isSelected
                              ? 'bg-blue-100 dark:bg-blue-900 text-[#2563EB] dark:text-blue-300'
                              : 'text-[#0F172A] dark:text-slate-300'
                          }`}
                      >
                        {dayNumber}
                      </span>

                      {events.length > 0 && (
                        <span className="text-[10px] font-mono font-medium text-[#2563EB] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.2 rounded-md">
                          {events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Chips List */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {events.slice(0, 2).map(ev => {
                        const isDone =
                          ev.status === 'Done' ||
                          ev.status === 'Completed' ||
                          (ev.status as string)?.toLowerCase() === 'completed' ||
                          (ev.status as string)?.toLowerCase() === 'done';
                        const isMissed =
                          ev.status === 'Missed' ||
                          (ev.scheduledDate < todayStr && ev.status === 'Pending');

                        let chipStyle =
                          'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border-blue-200 dark:border-blue-900';
                        if (isDone) {
                          chipStyle =
                            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                        } else if (isMissed) {
                          chipStyle =
                            'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                        }

                        return (
                          <div
                            key={ev.id}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${chipStyle}`}
                            title={`${formatTime(ev.scheduledTime)} - ${ev.clientBusiness || ev.clientName} (${ev.type})`}
                          >
                            <span className="font-bold shrink-0">{formatTime(ev.scheduledTime)}</span>
                            <span className="truncate">{ev.clientBusiness || ev.clientName}</span>
                          </div>
                        );
                      })}

                      {events.length > 2 && (
                        <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-semibold block text-center">
                          +{events.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Activity Panel: 4 columns on large screens */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  Selected Date
                </span>
                <h3 className="text-base font-medium text-[#0F172A] dark:text-white mt-0.5">
                  {formatDate(selectedDateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenScheduleModal(selectedDateStr)}
                className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* List of Activities for Selected Date */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B] dark:text-slate-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No follow-ups scheduled for this day
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Select another day or add an activity to this slot.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenScheduleModal(selectedDateStr)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline pt-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule an appointment</span>
                  </button>
                </div>
              ) : (
                selectedDayEvents.map(ev => {
                  const waUrl = getWhatsAppUrl(ev.phone, ev.clientName, ev.clientBusiness);
                  const isDone =
                    ev.status === 'Done' ||
                    ev.status === 'Completed' ||
                    (ev.status as string)?.toLowerCase() === 'completed' ||
                    (ev.status as string)?.toLowerCase() === 'done';
                  const isMissed =
                    ev.status === 'Missed' ||
                    (ev.scheduledDate < todayStr && ev.status === 'Pending');

                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Top: Business / Lead Name & Time */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                            {ev.clientBusiness || ev.clientName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                            <span>{ev.clientName}</span>
                            <span>•</span>
                            <span className="truncate">{ev.assignedToName || 'Rep'}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : isMissed
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                            }`}
                        >
                          {formatTime(ev.scheduledTime)} ({ev.type})
                        </span>
                      </div>

                      {/* Notes / Details */}
                      {ev.notes && (
                        <p className="text-[11px] text-[#64748B] dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-[#E5EAF1] dark:border-slate-800">
                          {ev.notes}
                        </p>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                        {/* Direct Communication Links */}
                        <div className="flex items-center gap-2.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${ev.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        </div>

                        {/* Status Mutations */}
                        <div className="flex items-center gap-2">
                          {!isDone ? (
                            <>
                              <button
                                type="button"
                                onClick={() => completeFollowUp(ev.id, 'Completed from calendar')}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenRescheduleModal(ev)}
                                className="text-[11px] font-medium text-amber-600 hover:text-amber-700 cursor-pointer"
                              >
                                Reschedule
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View: Clean vertical list grouped by dates */
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
            <div>
              <h3 className="text-base font-medium text-[#0F172A] dark:text-white">
                Upcoming Agenda &amp; Activities
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Chronological listing of scheduled tasks and touchpoints
              </p>
            </div>
          </div>

          {agendaDates.length === 0 ? (
            <EmptyState
              title="No Scheduled Follow-Ups"
              description="There are currently no scheduled appointments or activities in your pipeline."
              actionLabel="Schedule Follow-Up"
              onAction={() => onOpenScheduleModal()}
            />
          ) : (
            <div className="space-y-6">
              {agendaDates.map(({ dateStr, events }) => (
                <div key={dateStr} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {formatDate(dateStr)}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                      {events.length} {events.length === 1 ? 'activity' : 'activities'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {events.map(ev => {
                      const waUrl = getWhatsAppUrl(ev.phone, ev.clientName, ev.clientBusiness);
                      const isDone =
                        ev.status === 'Done' ||
                        ev.status === 'Completed' ||
                        (ev.status as string)?.toLowerCase() === 'completed' ||
                        (ev.status as string)?.toLowerCase() === 'done';
                      const isMissed =
                        ev.status === 'Missed' ||
                        (ev.scheduledDate < todayStr && ev.status === 'Pending');

                      return (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-xl border border-[#E5EAF1] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-xs text-[#0F172A] dark:text-white">
                                {ev.clientBusiness || ev.clientName}
                              </p>
                              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                                {ev.clientName} • Rep: {ev.assignedToName || 'Rep'}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${isDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isMissed
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-blue-50 text-[#2563EB] border-blue-200'
                                }`}
                            >
                              {formatTime(ev.scheduledTime)} ({ev.type})
                            </span>
                          </div>

                          {ev.notes && (
                            <p className="text-[11px] text-[#64748B] dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-[#E5EAF1] dark:border-slate-800">
                              {ev.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </a>
                              <a
                                href={`tel:${ev.phone}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </a>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isDone ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => completeFollowUp(ev.id, 'Completed from calendar')}
                                    className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                  >
                                    Done
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenRescheduleModal(ev)}
                                    className="text-[11px] font-medium text-amber-600 hover:underline cursor-pointer"
                                  >
                                    Reschedule
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
