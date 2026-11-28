import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { FollowUp, FollowUpType } from '../../types';
import { Calendar, Clock, MessageSquare, User, Phone, Check } from 'lucide-react';
import { ModalShell, FormField, Input, Select, Textarea, Button } from '../ui';
import { getLocalDateString } from '../../utils/formatters';

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
  const [scheduledDate, setScheduledDate] = useState(initialDate || getLocalDateString());
  const [scheduledTime, setScheduledTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [notes, setNotes] = useState('');
  const [assignedToId, setAssignedToId] = useState(currentUser?.id || users[0]?.id || '');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
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
    } else {
      setScheduledDate(initialDate || getLocalDateString());
      if (initialLeadId) {
        const l = leads.find(item => item.id === initialLeadId);
        if (l) {
          setLeadId(l.id);
          setClientName(l.name);
          setClientBusiness(l.businessName);
          setPhone(l.phone);
          setAssignedToId(l.assignedToId);
        }
      } else {
        setLeadId('');
        setClientName('');
        setClientBusiness('');
        setPhone('+92 300 ');
        setNotes('');
        setAssignedToId(currentUser?.id || users[0]?.id || '');
      }
    }
  }, [followUpToReschedule, initialLeadId, initialDate, leads, currentUser, users, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: Record<string, string> = {};
    if (!clientBusiness.trim()) newErrors.clientBusiness = 'Business name is required';
    if (!clientName.trim()) newErrors.clientName = 'Contact person is required';
    if (!phone.trim() || phone.trim() === '+92 300') newErrors.phone = 'Phone number is required';
    if (!scheduledDate) newErrors.scheduledDate = 'Date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const assignedUser = users.find(u => u.id === assignedToId);

    setIsSubmitting(true);
    try {
      if (followUpToReschedule) {
        if (followUpToReschedule.status === 'Done' || (followUpToReschedule.status as string) === 'Completed') {
          setErrors({ scheduledDate: 'Cannot reschedule a completed follow-up' });
          return;
        }

        await rescheduleFollowUp(
          followUpToReschedule.id,
          scheduledDate,
          scheduledTime,
          notes || 'Rescheduled follow-up call.',
          type,
          assignedToId
        );
      } else {
        await addFollowUp({
          leadId: leadId || undefined,
          clientName: clientName.trim(),
          clientBusiness: clientBusiness.trim(),
          phone: phone.trim(),
          scheduledDate,
          scheduledTime,
          type,
          source: 'Follow-Up',
          notes: notes.trim() || 'Scheduled follow-up contact.',
          assignedToId,
          assignedToName: assignedUser?.name || 'Assigned Agent',
          status: 'Pending'
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit follow-up modal:', err);
    } finally {
      setIsSubmitting(false);
    }
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
        disabled={isSubmitting}
        leftIcon={<Check className="w-4 h-4" />}
      >
        {isSubmitting ? 'Scheduling...' : followUpToReschedule ? 'Update Follow-Up' : 'Schedule Appointment'}
      </Button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={followUpToReschedule ? 'Reschedule Follow-Up' : 'Schedule New Follow-Up'}
      subtitle="Set target date, time, interaction type, and assigned rep"
      icon={<Calendar className="w-5 h-5 text-[#2563EB]" />}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!followUpToReschedule && (
          <FormField label="Link Existing Lead (Optional)">
            <Select
              value={leadId}
              onChange={e => handleLeadSelect(e.target.value)}
            >
              <option value="">-- Choose Lead or enter details below --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.businessName} ({l.name} - {l.phone})
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Business Name" required error={errors.clientBusiness}>
            <Input
              type="text"
              value={clientBusiness}
              onChange={e => {
                setClientBusiness(e.target.value);
                if (errors.clientBusiness) setErrors(prev => ({ ...prev, clientBusiness: '' }));
              }}
              placeholder="e.g. Apex Studio"
              error={!!errors.clientBusiness}
            />
          </FormField>

          <FormField label="Contact Person" required error={errors.clientName}>
            <Input
              type="text"
              value={clientName}
              onChange={e => {
                setClientName(e.target.value);
                if (errors.clientName) setErrors(prev => ({ ...prev, clientName: '' }));
              }}
              placeholder="e.g. Tariq Khan"
              error={!!errors.clientName}
            />
          </FormField>
        </div>

        <FormField label="Phone Number" required error={errors.phone}>
          <Input
            type="text"
            value={phone}
            onChange={e => {
              setPhone(e.target.value);
              if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
            }}
            placeholder="+92 300 1234567"
            error={!!errors.phone}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Date" required error={errors.scheduledDate}>
            <Input
              type="date"
              value={scheduledDate}
              onChange={e => {
                setScheduledDate(e.target.value);
                if (errors.scheduledDate) setErrors(prev => ({ ...prev, scheduledDate: '' }));
              }}
              error={!!errors.scheduledDate}
            />
          </FormField>

          <FormField label="Time" required>
            <Input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </FormField>

          <FormField label="Type">
            <Select
              value={type}
              onChange={e => setType(e.target.value as FollowUpType)}
            >
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Demo">Demo</option>
              <option value="Visit">Visit</option>
            </Select>
          </FormField>
        </div>

        <FormField
          label="Assigned Representative"
          required
          hint={isEmployeeRole ? 'Locked to your account' : undefined}
        >
          <Select
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
            disabled={isEmployeeRole}
          >
            {availableReps.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Objective & Notes">
          <Textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Present software demo & discuss pricing options..."
          />
        </FormField>
      </form>
    </ModalShell>
  );
};
