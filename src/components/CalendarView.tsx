import React, { useState } from 'react';
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
  Eye,
  RotateCcw
} from 'lucide-react';
import { formatDate, getWhatsAppUrl } from '../utils/formatters';

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

  // Current calendar view date (default to August 2026 as per workspace mock timeline)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 20)); // Month is 0-indexed: 7 = August
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: FollowUp[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate days in month and start day
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = '2026-08-20';

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
    setCurrentDate(new Date(2026, 7, 20));
  };

  // Group follow-ups by scheduledDate (YYYY-MM-DD)
  const followUpsByDate = scopedFollowUps.reduce((acc, fu) => {
    if (!acc[fu.scheduledDate]) {
      acc[fu.scheduledDate] = [];
    }
    acc[fu.scheduledDate].push(fu);
    return acc;
  }, {} as Record<string, FollowUp[]>);

  // Generate calendar grid cells
  const calendarCells = [];
  // Empty padding cells for start of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: d,
      dateStr: dayStr,
      isToday: dayStr === todayStr,
      events: followUpsByDate[dayStr] || []
    });
  }

  const handleDayClick = (dateStr: string, events: FollowUp[]) => {
    setSelectedDayEvents({ dateStr, events });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {monthNames[month]} {year}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive monthly schedule with follow-up appointments, demos &amp; calls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleGoToday}
            aria-label="Go to current month"
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Today
          </button>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-1">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onOpenScheduleModal()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Schedule</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Day Headers (Sun - Sat) */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[110px] sm:min-h-[125px] bg-slate-50/40 dark:bg-slate-950/20 p-2"
                />
              );
            }

            const { dayNumber, dateStr, isToday, events } = cell;

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(dateStr, events)}
                className={`min-h-[110px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                  isToday
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-400/60 inset-0'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600'
                    }`}
                  >
                    {dayNumber}
                  </span>

                  {events.length > 0 && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded">
                      {events.length}
                    </span>
                  )}
                </div>

                {/* Event Chips List */}
                <div className="space-y-1 my-1 flex-1 overflow-hidden">
                  {events.slice(0, 3).map(ev => {
                    const isDone = ev.status === 'Done';
                    const isMissed = ev.status === 'Missed' || (ev.scheduledDate < todayStr && ev.status === 'Pending');

                    let chipStyle = 'bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
                    if (isDone) {
                      chipStyle = 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                    } else if (isMissed) {
                      chipStyle = 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
                    } else if (ev.scheduledDate === todayStr) {
                      chipStyle = 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700';
                    }

                    return (
                      <div
                        key={ev.id}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate flex items-center gap-1 ${chipStyle}`}
                        title={`${ev.scheduledTime} - ${ev.clientBusiness} (${ev.type})`}
                      >
                        <span className="font-bold shrink-0">{ev.scheduledTime}</span>
                        <span className="truncate">{ev.clientBusiness}</span>
                      </div>
                    );
                  })}

                  {events.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-semibold block text-center">
                      +{events.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Drawer / Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Schedule for {formatDate(selectedDayEvents.dateStr)}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDayEvents.events.length} follow-up appointments scheduled
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedDayEvents.events.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>No appointments for this date.</p>
                  <button
                    onClick={() => {
                      const date = selectedDayEvents.dateStr;
                      setSelectedDayEvents(null);
                      onOpenScheduleModal(date);
                    }}
                    className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    + Schedule new follow-up on this day
                  </button>
                </div>
              ) : (
                selectedDayEvents.events.map(ev => {
                  const waUrl = getWhatsAppUrl(ev.phone, ev.clientName, ev.clientBusiness);

                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">
                            {ev.clientBusiness}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {ev.clientName} • Rep: {ev.assignedToName}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {ev.scheduledTime} ({ev.type})
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
                        {ev.notes}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                          <a
                            href={`tel:${ev.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          {ev.status !== 'Done' && (
                            <button
                              onClick={() => completeFollowUp(ev.id, 'Completed from calendar')}
                              className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                            >
                              Mark Done
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedDayEvents(null);
                              onOpenRescheduleModal(ev);
                            }}
                            className="text-[11px] text-amber-600 hover:underline cursor-pointer"
                          >
                            Reschedule
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Add Action */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  const date = selectedDayEvents.dateStr;
                  setSelectedDayEvents(null);
                  onOpenScheduleModal(date);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add appointment for this day</span>
              </button>

              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
