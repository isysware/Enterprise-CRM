import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types';
import { UserCheck, X } from 'lucide-react';

interface ReassignModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({ lead, onClose }) => {
  const { users, assignableUsers, reassignLead, currentUser } = useCRM();
  const availableUsers = assignableUsers && assignableUsers.length > 0 ? assignableUsers : (currentUser ? [currentUser] : users);
  const [newRepId, setNewRepId] = useState(
    availableUsers.find(u => u.id === lead?.assignedToId)?.id ||
    availableUsers[0]?.id ||
    currentUser?.id ||
    ''
  );
  const [reassignReason, setReassignReason] = useState('Territory workload balancing');

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reassignLead(lead.id, newRepId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reassign Lead Representative
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
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Lead Details:</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{lead.businessName}</p>
            <p className="text-slate-500">{lead.name} • {lead.phone}</p>
            <p className="text-slate-400 text-[11px] mt-1">Currently assigned to: <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.assignedToName}</span></p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select New Assigned Agent *
            </label>
            <select
              value={newRepId}
              onChange={e => setNewRepId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role} - {u.teamName || 'Sales'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reassignment Reason / Note
            </label>
            <input
              type="text"
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              placeholder="e.g. Higher capacity, regional representative..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
            >
              Confirm Reassignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
