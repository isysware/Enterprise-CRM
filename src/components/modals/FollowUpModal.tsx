import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { FollowUp, FollowUpType } from '../../types';
import { X, Calendar, Clock, MessageSquare, User, Phone } from 'lucide-react';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUpToReschedule?: FollowUp | null;
  initialLeadId?: string | null;
  initialDate?: string;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  followUpToReschedule,
  initialLeadId,
  initialDate
}) => {
  const { leads, users, assignableUsers, addFollowUp, rescheduleFollowUp, currentUser } = useCRM();
  const availableReps = assignableUsers && assignableUsers.length > 0 ? assignableUsers : (currentUser ? [currentUser] : users);
  const isEmployeeRole = currentUser?.role === 'Employee';

  const [leadId, setLeadId] = useState(initialLeadId || '');
  const [clientName, setClientName] = useState('');
  const [clientBusiness, setClientBusiness] = useState('');
  const [phone, setPhone] = useState('+92 300 ');
  const [scheduledDate, setScheduledDate] = useState(initialDate || '2026-08-20');
  const [scheduledTime, setScheduledTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [notes, setNotes] = useState('');
  const [assignedToId, setAssignedToId] = useState(currentUser?.id || users[0]?.id || '');

  useEffect(() => {
    if (followUpToReschedule) {
      setLeadId(followUpToReschedule.leadId || '');
      setClientName(followUpToReschedule.clientName);
      setClientBusiness(followUpToReschedule.clientBusiness);
      setPhone(followUpToReschedule.phone);
      setScheduledDate(followUpToReschedule.scheduledDate);
      setScheduledTime(followUpToReschedule.scheduledTime);
      setType(followUpToReschedule.type);
      setNotes(followUpToReschedule.notes);
      setAssignedToId(followUpToReschedule.assignedToId);
    } else if (initialLeadId) {
      const l = leads.find(item => item.id === initialLeadId);
      if (l) {
        setLeadId(l.id);
        setClientName(l.name);
        setClientBusiness(l.businessName);
        setPhone(l.phone);
        setAssignedToId(l.assignedToId);
      }
    }
  }, [followUpToReschedule, initialLeadId, leads]);

  if (!isOpen) return null;

  const handleLeadSelect = (selectedId: string) => {
    setLeadId(selectedId);
    const l = leads.find(item => item.id === selectedId);
    if (l) {
      setClientName(l.name);
      setClientBusiness(l.businessName);
      setPhone(l.phone);
      setAssignedToId(l.assignedToId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = users.find(u => u.id === assignedToId);

    if (followUpToReschedule) {
      rescheduleFollowUp(
        followUpToReschedule.id,
        scheduledDate,
        scheduledTime,
        notes || 'Rescheduled follow-up call.'
      );
    } else {
      addFollowUp({
        leadId: leadId || undefined,
        clientName,
        clientBusiness,
        phone,
        scheduledDate,
        scheduledTime,
        type,
        source: 'Follow-Up',
        notes: notes || 'Scheduled follow-up contact.',
        assignedToId,
        assignedToName: assignedUser?.name || 'Assigned Agent',
        status: 'Pending'
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {followUpToReschedule ? 'Reschedule Follow-Up' : 'Schedule New Follow-Up'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {!followUpToReschedule && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Link Existing Lead (Optional)
              </label>
              <select
                value={leadId}
                onChange={e => handleLeadSelect(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Choose Lead or enter details below --</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.businessName} ({l.name} - {l.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Business / Salon Name *
              </label>
              <input
                type="text"
                required
                value={clientBusiness}
                onChange={e => setClientBusiness(e.target.value)}
                placeholder="Salon Name"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Contact Person"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as FollowUpType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="Call">Call</option>
                <option value="Meeting">Meeting</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Demo">Demo</option>
                <option value="Visit">Visit</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Assigned Representative
              </label>
              {isEmployeeRole && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Locked to your account
                </span>
              )}
            </div>
            <select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              disabled={isEmployeeRole}
              className={`w-full border rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 ${
                isEmployeeRole
                  ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                  : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer'
              }`}
            >
              {availableReps.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Objective &amp; Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Present POS demo & discuss pricing..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
            >
              {followUpToReschedule ? 'Update Follow-Up' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
