import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Lead,
  LeadStatus,
  Priority,
  LeadQuality,
  LeadSource,
  BudgetType,
  BudgetDetails,
  FollowUpType
} from '../../types';
import {
  Building2,
  Phone,
  Mail,
  User,
  DollarSign,
  Calendar,
  Clock,
  Layers,
  FileText,
  UserCheck,
  Check,
  Sparkles,
  MapPin
} from 'lucide-react';
import { formatPKR, getLocalDateString } from '../../utils/formatters';
import { DynamicPricingFieldsForm } from '../common/DynamicPricingFieldsForm';
import { ModalShell, FormField, Input, Select, Textarea, Button, Badge } from '../ui';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, leadToEdit }) => {
  const { addLead, updateLead, users, assignableUsers, services, sources, currentUser, pricingModels, settings } = useCRM();
  const isEmployeeRole = currentUser?.role === 'Employee';
  const availableReps = useMemo(() => {
    if (isEmployeeRole) return currentUser ? [currentUser] : [];
    return assignableUsers && assignableUsers.length > 0 ? assignableUsers : users;
  }, [assignableUsers, currentUser, isEmployeeRole, users]);

  // Basic Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [quality, setQuality] = useState<LeadQuality | ''>('');
  const [status, setStatus] = useState<LeadStatus | ''>('');

  // Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Dynamic Budget Details
  const [budgetType, setBudgetType] = useState<BudgetType | ''>('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Common Budget Notes
  const [budgetNotes, setBudgetNotes] = useState('');

  // Initial Note & Optional First Follow-Up
  const [initialNote, setInitialNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('14:00');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('Call');
  const [assignedToId, setAssignedToId] = useState(isEmployeeRole ? currentUser?.id || '' : '');

  // Validation state
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [assignedToError, setAssignedToError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve the selected pricing model strictly from live PostgreSQL-backed pricingModels.
  const activePricingModel = useMemo(() => {
    if (!budgetType) return null;
    return pricingModels?.find(pm => pm.name === budgetType || pm.id === budgetType) || null;
  }, [budgetType, pricingModels]);

  // Handle PostgreSQL-defined dynamic pricing field changes.
  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  };

  // Populate or reset form
  useEffect(() => {
    setNameError('');
    setPhoneError('');
    setSourceError('');
    setBudgetError('');
    setAssignedToError('');
    if (leadToEdit) {
      setName(leadToEdit.name || '');
      setPhone(leadToEdit.phone ? leadToEdit.phone.replace(/\D/g, '').slice(0, 11) : '');
      setEmail(leadToEdit.email || '');
      setCompany(leadToEdit.businessName || '');
      setCity(leadToEdit.city || '');
      setSource(leadToEdit.source || '');
      setPriority(leadToEdit.priority || '');
      setQuality(leadToEdit.quality || '');
      setStatus(leadToEdit.status || '');
      setSelectedServices(leadToEdit.services?.length ? leadToEdit.services : []);

      const bType = (leadToEdit.pricingModel || leadToEdit.budgetType || '') as BudgetType | '';
      const matchedPm = pricingModels?.find(pm => pm.id === leadToEdit.pricingModelId || pm.name === bType);
      setBudgetType((matchedPm?.name || bType) as BudgetType | '');

      if (leadToEdit.budgetDetails) {
        const bd = leadToEdit.budgetDetails;
        setBudgetNotes(bd.budgetNotes ?? '');
        setCustomFieldValues(bd.customFieldValues ? { ...bd.customFieldValues } : {});
      } else {
        setBudgetNotes('');
        setCustomFieldValues({});
      }

      setInitialNote(leadToEdit.notes || '');
      setFollowUpDate(leadToEdit.nextFollowUpDate || '');
      setFollowUpTime(leadToEdit.nextFollowUpTime || '14:00');
      setFollowUpType(leadToEdit.nextFollowUpType || 'Call');
      setAssignedToId(leadToEdit.assignedToId || (isEmployeeRole ? currentUser?.id || '' : ''));
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCompany('');
      setCity('');
      setSource('');
      setPriority('');
      setQuality('');
      setStatus('');
      setSelectedServices([]);
      setBudgetType('');
      setCustomFieldValues({});
      setBudgetNotes('');
      setInitialNote('');
      setFollowUpDate(getTomorrowDate());
      setFollowUpTime('14:00');
      setFollowUpType('Call');
      setAssignedToId(isEmployeeRole ? currentUser?.id || '' : '');
    }
  }, [leadToEdit, isOpen, currentUser, isEmployeeRole]);

  useEffect(() => {
    if (activePricingModel?.fields && activePricingModel.fields.length > 0) {
      setCustomFieldValues(prev => {
        const next = { ...prev };
        let hasChanges = false;
        activePricingModel.fields!.forEach(f => {
          if (next[f.key] === undefined && f.defaultValue !== undefined) {
            next[f.key] = f.defaultValue;
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }
  }, [activePricingModel]);

  const selectedServicesBaseValue = useMemo(() => {
    return selectedServices.reduce((total, serviceName) => {
      const service = services.find(item => item.name === serviceName);
      return total + Number(service?.defaultPricePKR || 0);
    }, 0);
  }, [selectedServices, services]);

  const calculatedLeadValue = useMemo(() => {
    if (activePricingModel?.fields && activePricingModel.fields.length > 0) {
      const dynamicTotal = activePricingModel.fields.reduce((total, field) => {
        if (!field.includeInTotal) return total;
        const value = Number(customFieldValues[field.key]);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0);

      // Once the user enters pricing-model amounts, those values become the deal value.
      if (dynamicTotal > 0) return dynamicTotal;
    }

    // Before/without custom commercial amounts, use the real selected service catalog price.
    return selectedServicesBaseValue;
  }, [activePricingModel, customFieldValues, selectedServicesBaseValue]);

  const toggleService = (srvName: string) => {
    if (selectedServices.includes(srvName)) {
      setSelectedServices(prev => prev.filter(s => s !== srvName));
    } else {
      setSelectedServices(prev => [...prev, srvName]);
    }
  };

  const allServiceNames = useMemo(() => {
    return Array.from(new Set(services.map(s => s.name)));
  }, [services]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let hasError = false;
    if (!name.trim()) {
      setNameError('Client name is required');
      hasError = true;
    } else {
      setNameError('');
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      setPhoneError('Phone number is required');
      hasError = true;
    } else if (cleanPhone.length !== 11) {
      setPhoneError('Phone number must be exactly 11 digits (e.g. 03001234567)');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (!source || !source.trim()) {
      setSourceError('Please select a Lead Source');
      hasError = true;
    } else {
      setSourceError('');
    }

    if (!budgetType) {
      setBudgetError('Please select a Budget Model');
      hasError = true;
    } else {
      setBudgetError('');
    }

    if (!assignedToId) {
      setAssignedToError('Please select a Representative');
      hasError = true;
    } else {
      setAssignedToError('');
    }

    if (hasError) return;

    const assignedUser = users.find(u => u.id === assignedToId) || availableReps.find(u => u.id === assignedToId);

    const effectiveStatus = (status || 'New') as LeadStatus;
    const effectivePriority = (priority || 'Medium') as Priority;
    const effectiveQuality = (quality || 'Average') as LeadQuality;
    const effectiveBudgetType = budgetType as BudgetType;

    const budgetDetails: BudgetDetails = {
      budgetType: effectiveBudgetType,
      budgetNotes,
      customFieldValues,
      totalCalculatedValuePKR: calculatedLeadValue
    };

    const resolvedPricingModelId = activePricingModel?.id || pricingModels?.find(pm => pm.name === effectiveBudgetType)?.id;
    const pricingModelMapped = activePricingModel?.name || effectiveBudgetType;

    const effectiveBusinessName = company.trim() || name.trim() || 'Prospective Client';
    const effectiveEmail = email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;

    if (leadToEdit) {
      updateLead({
        ...leadToEdit,
        name: name.trim(),
        businessName: effectiveBusinessName,
        phone: cleanPhone,
        email: effectiveEmail,
        city: city.trim(),
        services: selectedServices,
        valuePKR: calculatedLeadValue,
        status: effectiveStatus,
        priority: effectivePriority,
        quality: effectiveQuality,
        source: source.trim() as LeadSource,
        budgetType: effectiveBudgetType,
        budgetDetails,
        pricingModelId: resolvedPricingModelId || leadToEdit.pricingModelId,
        pricingModelName: pricingModelMapped,
        pricingModel: pricingModelMapped,
        assignedToId,
        assignedToName: assignedUser?.name || 'Unassigned',
        teamId: assignedUser?.teamId || '',
        teamName: assignedUser?.teamName || '',
        notes: initialNote,
        nextFollowUpDate: followUpDate || undefined,
        nextFollowUpTime: followUpDate ? followUpTime : undefined,
        nextFollowUpType: followUpDate ? followUpType : undefined
      });
    } else {
      addLead({
        name: name.trim(),
        businessName: effectiveBusinessName,
        phone: cleanPhone,
        email: effectiveEmail,
        city: city.trim(),
        services: selectedServices,
        valuePKR: calculatedLeadValue,
        status: effectiveStatus,
        priority: effectivePriority,
        quality: effectiveQuality,
        source: source.trim() as LeadSource,
        budgetType: effectiveBudgetType,
        budgetDetails,
        pricingModelId: resolvedPricingModelId,
        pricingModelName: pricingModelMapped,
        pricingModel: pricingModelMapped,
        assignedToId,
        assignedToName: assignedUser?.name || 'Unassigned',
        teamId: assignedUser?.teamId || '',
        teamName: assignedUser?.teamName || '',
        notes: initialNote,
        nextFollowUpDate: followUpDate || undefined,
        nextFollowUpTime: followUpDate ? followUpTime : undefined,
        nextFollowUpType: followUpDate ? followUpType : undefined,
        tags: [effectiveBudgetType, effectivePriority].filter(Boolean)
      });
    }

    setIsSubmitting(true);
    onClose();
    setIsSubmitting(false);
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
        <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
        <span>Estimated pipeline value: <strong>{formatPKR(calculatedLeadValue)}</strong></span>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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
          {isSubmitting ? 'Saving...' : leadToEdit ? 'Save Changes' : 'Create Lead'}
        </Button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={leadToEdit ? 'Edit Lead Record' : 'Create New Lead'}
      subtitle="Capture client inquiry, configure commercial budget, and set follow-up assignment"
      icon={<Building2 className="w-5 h-5 text-[#2563EB]" />}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: CONTACT & BUSINESS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <User className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              1. Contact &amp; Business Details
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Client Name" required error={nameError}>
              <Input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. Saima Tariq"
                error={!!nameError}
              />
            </FormField>

            <FormField label="Phone (WhatsApp Active)" required error={phoneError}>
              <Input
                type="text"
                value={phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setPhone(digits);
                  if (phoneError) setPhoneError('');
                }}
                maxLength={11}
                placeholder="03001234567 (11 digits)"
                error={!!phoneError}
              />
            </FormField>

            <FormField label="Email Address">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@company.com"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
              />
            </FormField>

            <FormField label="Company / Business Name">
              <Input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Bella Spa & Salon"
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
              />
            </FormField>

            <FormField label="City / Location">
              <Input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Lahore, Karachi, Islamabad"
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
              />
            </FormField>

            <FormField label="Lead Source" required error={sourceError}>
              <Select
                value={source}
                onChange={e => {
                  setSource(e.target.value as LeadSource);
                  if (sourceError) setSourceError('');
                }}
                error={!!sourceError}
              >
                <option value="">-- Select Lead Source --</option>
                {sources.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* SECTION 2: QUALIFICATION & STATUS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              2. Pipeline Status &amp; Priority
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <FormField label="Lead Status">
              <Select
                value={status}
                onChange={e => setStatus(e.target.value as LeadStatus)}
              >
                <option value="">-- Select Status --</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow-Up Required">Follow-Up Required</option>
                <option value="Qualified">Qualified</option>
                <option value="Won">Won (Deal Closed)</option>
                <option value="Lost">Lost</option>
                <option value="Hold">Hold</option>
                <option value="Cold">Cold</option>
                <option value="Returned">Returned</option>
              </Select>
            </FormField>

            <FormField label="Priority">
              <Select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
              >
                <option value="">-- Select Priority --</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent 🔥</option>
              </Select>
            </FormField>

            <FormField label="Lead Quality">
              <Select
                value={quality}
                onChange={e => setQuality(e.target.value as LeadQuality)}
              >
                <option value="">-- Select Lead Quality --</option>
                <option value="Good">Good (High Intent)</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* SECTION 3: SERVICES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2563EB]" />
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                3. Requested Services &amp; Solutions
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
              {selectedServices.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {allServiceNames.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                No services configured yet. Configure your services in Admin &gt; Services.
              </div>
            ) : (
              allServiceNames.map(srvName => {
                const isSelected = selectedServices.includes(srvName);
                return (
                  <button
                    type="button"
                    key={srvName}
                    onClick={() => toggleService(srvName)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                        ? 'bg-[#EFF6FF] dark:bg-blue-950/40 border-[#2563EB] text-[#2563EB] dark:text-blue-300 shadow-xs ring-1 ring-[#2563EB]/20'
                        : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 text-[#0F172A] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-md bg-[#2563EB] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug">
                        {srvName}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 4: DYNAMIC BUDGET & COMMERCIALS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                4. Commercial Model &amp; Budget
              </h4>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Calculated Deal Value:
              </span>
              <span className="font-mono font-medium text-xs text-emerald-800 dark:text-emerald-200">
                {formatPKR(calculatedLeadValue)}
              </span>
            </div>
          </div>

          <FormField label="Select Budget Model" required error={budgetError}>
            <Select
              value={budgetType}
              onChange={e => {
                setBudgetType(e.target.value as BudgetType);
                setCustomFieldValues({});
                if (budgetError) setBudgetError('');
              }}
              error={!!budgetError}
            >
              <option value="">-- Select Budget Model --</option>
              {pricingModels
                .filter(pm => pm.isActive)
                .map(pm => (
                  <option key={pm.id} value={pm.name}>
                    {pm.name} ({pm.billingType})
                  </option>
                ))}
            </Select>
          </FormField>

          {/* DYNAMIC FORM RENDERING FROM THE SELECTED DATABASE PRICING MODEL */}
          {budgetType && activePricingModel?.fields && activePricingModel.fields.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activePricingModel.name}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {activePricingModel.billingType}
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
                  {activePricingModel.fields.length} dynamic budget fields
                </span>
              </div>

              <DynamicPricingFieldsForm
                fields={activePricingModel.fields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                currencySymbol={settings?.currencySymbol || 'Rs.'}
              />

              <FormField label="Budget Notes & Terms">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="Pricing discussion notes, milestone conditions, discount approvals, or payment schedule details..."
                />
              </FormField>
            </div>
          )}

          {budgetType && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-3 animate-fadeIn">
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                This pricing model has no custom deal fields. Until a commercial amount is entered through a configured pricing field, the calculated deal value uses the selected service catalog price.
              </p>
              <FormField label="Budget Notes & Terms">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="Pricing discussion notes, milestone conditions, discount approvals, or payment schedule details..."
                />
              </FormField>
            </div>
          )}
        </div>

        {/* SECTION 5: OWNERSHIP & FOLLOW-UP */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              5. Ownership &amp; Follow-Up Schedule
            </h4>
          </div>

          <FormField
            label="Assign Representative"
            required
            error={assignedToError}
            hint={isEmployeeRole ? 'Locked to your account' : undefined}
          >
            <Select
              value={assignedToId}
              onChange={e => {
                setAssignedToId(e.target.value);
                if (assignedToError) setAssignedToError('');
              }}
              disabled={isEmployeeRole}
              error={!!assignedToError}
            >
              {!isEmployeeRole && <option value="">-- Select Representative --</option>}
              {availableReps.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role} ({u.teamName || 'Direct Team'})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <FormField label="Follow-Up Date">
              <Input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
              />
            </FormField>

            <FormField label="Time">
              <Input
                type="time"
                value={followUpTime}
                onChange={e => setFollowUpTime(e.target.value)}
              />
            </FormField>

            <FormField label="Follow-Up Type">
              <Select
                value={followUpType}
                onChange={e => setFollowUpType(e.target.value as FollowUpType)}
              >
                <option value="Call">Phone Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Meeting">In-Person Meeting</option>
                <option value="Demo">Software Demo</option>
                <option value="Email">Email Follow-Up</option>
                <option value="Visit">Site Visit</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Initial Inquiry / Discussion Notes">
            <Textarea
              rows={3}
              value={initialNote}
              onChange={e => setInitialNote(e.target.value)}
              placeholder="Client requirements, software pain points, number of staff/branches, demo feedback..."
            />
          </FormField>
        </div>
      </form>
    </ModalShell>
  );
};
