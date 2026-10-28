import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types';
import { UserCheck, Check } from 'lucide-react';
import { ModalShell, FormField, Select, Input, Button } from '../ui';

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

  const modalFooter = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleSubmit}
        leftIcon={<Check className="w-4 h-4" />}
      >
        Confirm Reassignment
      </Button>
    </div>
  );

  return (
    <ModalShell
      isOpen={!!lead}
      onClose={onClose}
      size="md"
      title="Reassign Lead Ownership"
      subtitle="Transfer lead responsibility to another team member"
      icon={<UserCheck className="w-5 h-5 text-[#2563EB]" />}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Context Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-[#E5EAF1] dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
            Target Record
          </span>
          <p className="font-extrabold text-[#0F172A] dark:text-white mt-1 text-sm">
            {lead.businessName}
          </p>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            {lead.name} • {lead.phone} • {lead.city}
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            Currently assigned to: <strong className="text-[#0F172A] dark:text-slate-200">{lead.assignedToName}</strong>
          </p>
        </div>

        <FormField label="Select New Assigned Agent" required>
          <Select
            value={newRepId}
            onChange={e => setNewRepId(e.target.value)}
          >
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role} - {u.teamName || 'Sales Team'})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Reassignment Reason / Transfer Note">
          <Input
            type="text"
            value={reassignReason}
            onChange={e => setReassignReason(e.target.value)}
            placeholder="e.g. Higher capacity, regional representative..."
          />
        </FormField>
      </form>
    </ModalShell>
  );
};
