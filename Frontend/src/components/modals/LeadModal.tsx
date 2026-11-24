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

const DEFAULT_SERVICE_OPTIONS = [
  'Education Management System (premium)',
  'Education Management System (Lite)',
  'Salon Management System',
  'Custom Website Development',
  'Custom Software Development'
];

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, leadToEdit }) => {
  const { addLead, updateLead, users, assignableUsers, services, sources, currentUser, pricingModels, settings } = useCRM();
  const availableReps = assignableUsers && assignableUsers.length > 0 ? assignableUsers : (currentUser ? [currentUser] : users);
  const isEmployeeRole = currentUser?.role === 'Employee';

  // Basic Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+92 300 ');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('Lahore');
  const [source, setSource] = useState<LeadSource>('Call');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [quality, setQuality] = useState<LeadQuality>('Average');
  const [status, setStatus] = useState<LeadStatus>('New');

  // Services
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Salon Management System'
  ]);

  // Dynamic Budget Details
  const [budgetType, setBudgetType] = useState<BudgetType>('No Budget Discussed');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  // Monthly Subscription fields (legacy / fallback)
  const [monthlySubscriptionFee, setMonthlySubscriptionFee] = useState<number | ''>(5000);
  const [oneTimeSetupFee, setOneTimeSetupFee] = useState<number | ''>(10000);
  const [monthlySupportFee, setMonthlySupportFee] = useState<number | ''>(2000);
  const [monthlyOtherFeeAmount, setMonthlyOtherFeeAmount] = useState<number | ''>('');
  const [monthlyOtherFeeDescription, setMonthlyOtherFeeDescription] = useState('');
  const [monthlyTotalInitialPayment, setMonthlyTotalInitialPayment] = useState<number | ''>(17000);

  // Ownership Model fields (legacy / fallback)
  const [ownershipPrice, setOwnershipPrice] = useState<number | ''>(150000);
  const [ownershipSetupFee, setOwnershipSetupFee] = useState<number | ''>(20000);
  const [ownershipSupportFee, setOwnershipSupportFee] = useState<number | ''>(5000);
  const [ownershipOtherFeeAmount, setOwnershipOtherFeeAmount] = useState<number | ''>('');
  const [ownershipOtherFeeDescription, setOwnershipOtherFeeDescription] = useState('');

  // One-Time Project Model fields (legacy / fallback)
  const [totalProjectPrice, setTotalProjectPrice] = useState<number | ''>(85000);
  const [advanceMilestoneAmount, setAdvanceMilestoneAmount] = useState<number | ''>(30000);
  const [oneTimeOtherFeeAmount, setOneTimeOtherFeeAmount] = useState<number | ''>('');
  const [oneTimeOtherFeeDescription, setOneTimeOtherFeeDescription] = useState('');

  // Common Budget Notes
  const [budgetNotes, setBudgetNotes] = useState('');

  // Initial Note & Optional First Follow-Up
  const [initialNote, setInitialNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('14:00');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('Call');
  const [assignedToId, setAssignedToId] = useState(currentUser?.id || users[0]?.id || '');

  // Validation state
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find matching pricing model item based on current budgetType
  const activePricingModel = useMemo(() => {
    if (budgetType === 'No Budget Discussed') return null;
    return pricingModels?.find(pm => 
      pm.name.toLowerCase() === budgetType.toLowerCase() ||
      (budgetType === 'Monthly Subscription Model' && (pm.name.includes('Monthly') || pm.name.includes('Subscription'))) ||
      (budgetType === 'Ownership Model' && pm.name.includes('Ownership')) ||
      (budgetType === 'One-Time Project Model' && (pm.name.includes('One-Time') || pm.name.includes('Project')))
    ) || null;
  }, [budgetType, pricingModels]);

  // Handle custom field changes
  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [key]: value
    }));

    if (key === 'monthly_fee' || key === 'monthlyFee' || key === 'monthlySubscriptionFee') {
      setMonthlySubscriptionFee(value);
    } else if (key === 'setup_fee' || key === 'setupFee' || key === 'oneTimeSetupFee') {
      setOneTimeSetupFee(value);
      setOwnershipSetupFee(value);
    } else if (key === 'support_fee' || key === 'supportFee' || key === 'monthlySupportFee') {
      setMonthlySupportFee(value);
      setOwnershipSupportFee(value);
    } else if (key === 'ownership_price' || key === 'ownershipPrice') {
      setOwnershipPrice(value);
    } else if (key === 'project_price' || key === 'totalProjectPrice' || key === 'total_price') {
      setTotalProjectPrice(value);
    } else if (key === 'advance_payment' || key === 'advanceMilestoneAmount') {
      setAdvanceMilestoneAmount(value);
    }
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
    if (leadToEdit) {
      setName(leadToEdit.name || '');
      setPhone(leadToEdit.phone || '+92 300 ');
      setEmail(leadToEdit.email || '');
      setCompany(leadToEdit.businessName || '');
      setCity(leadToEdit.city || 'Lahore');
      setSource(leadToEdit.source || 'Call');
      setPriority(leadToEdit.priority || 'Medium');
      setQuality(leadToEdit.quality || 'Average');
      setStatus(leadToEdit.status || 'New');
      setSelectedServices(leadToEdit.services?.length ? leadToEdit.services : ['Salon Management System']);
      
      const bType = leadToEdit.budgetType || (leadToEdit.pricingModel === 'Monthly Subscription' ? 'Monthly Subscription Model' : leadToEdit.pricingModel === 'Ownership Model' ? 'Ownership Model' : leadToEdit.pricingModel === 'One-Time Project' ? 'One-Time Project Model' : 'No Budget Discussed');
      setBudgetType(bType);

      if (leadToEdit.budgetDetails) {
        const bd = leadToEdit.budgetDetails;
        setMonthlySubscriptionFee(bd.monthlySubscriptionFee ?? 5000);
        setOneTimeSetupFee(bd.oneTimeSetupFee ?? 10000);
        setMonthlySupportFee(bd.monthlySupportFee ?? 2000);
        setMonthlyOtherFeeAmount(bd.otherFeeAmount ?? '');
        setMonthlyOtherFeeDescription(bd.otherFeeDescription ?? '');
        setMonthlyTotalInitialPayment(bd.totalInitialPayment ?? 17000);

        setOwnershipPrice(bd.ownershipPrice ?? 150000);
        setOwnershipSetupFee(bd.setupFee ?? 20000);
        setOwnershipSupportFee(bd.monthlySupportFee ?? 5000);
        setOwnershipOtherFeeAmount(bd.otherFeeAmount ?? '');
        setOwnershipOtherFeeDescription(bd.otherFeeDescription ?? '');

        setTotalProjectPrice(bd.totalProjectPrice ?? 85000);
        setAdvanceMilestoneAmount(bd.advanceMilestoneAmount ?? 30000);
        setOneTimeOtherFeeAmount(bd.otherFeeAmount ?? '');
        setOneTimeOtherFeeDescription(bd.otherFeeDescription ?? '');

        setBudgetNotes(bd.budgetNotes ?? '');

        if (bd.customFieldValues && Object.keys(bd.customFieldValues).length > 0) {
          setCustomFieldValues(bd.customFieldValues);
        } else {
          setCustomFieldValues({
            monthly_fee: bd.monthlySubscriptionFee ?? 5000,
            setup_fee: bd.oneTimeSetupFee ?? bd.setupFee ?? 10000,
            support_fee: bd.monthlySupportFee ?? 2000,
            ownership_price: bd.ownershipPrice ?? 150000,
            project_price: bd.totalProjectPrice ?? 85000,
            advance_payment: bd.advanceMilestoneAmount ?? 30000,
            other_fee: bd.otherFeeAmount ?? '',
            other_fee_desc: bd.otherFeeDescription ?? ''
          });
        }
      } else {
        setBudgetNotes('');
        setCustomFieldValues({});
      }

      setInitialNote(leadToEdit.notes || '');
      setFollowUpDate(leadToEdit.nextFollowUpDate || '');
      setFollowUpTime(leadToEdit.nextFollowUpTime || '14:00');
      setFollowUpType(leadToEdit.nextFollowUpType || 'Call');
      setAssignedToId(leadToEdit.assignedToId || currentUser?.id || users[0]?.id || '');
    } else {
      setName('');
      setPhone('+92 300 ');
      setEmail('');
      setCompany('');
      setCity('Lahore');
      setSource('Call');
      setPriority('Medium');
      setQuality('Average');
      setStatus('New');
      setSelectedServices(['Salon Management System']);
      setBudgetType('No Budget Discussed');

      setMonthlySubscriptionFee(5000);
      setOneTimeSetupFee(10000);
      setMonthlySupportFee(2000);
      setMonthlyOtherFeeAmount('');
      setMonthlyOtherFeeDescription('');
      setMonthlyTotalInitialPayment(17000);

      setOwnershipPrice(150000);
      setOwnershipSetupFee(20000);
      setOwnershipSupportFee(5000);
      setOwnershipOtherFeeAmount('');
      setOwnershipOtherFeeDescription('');

      setTotalProjectPrice(85000);
      setAdvanceMilestoneAmount(30000);
      setOneTimeOtherFeeAmount('');
      setOneTimeOtherFeeDescription('');

      setCustomFieldValues({});
      setBudgetNotes('');
      setInitialNote('');
      setFollowUpDate(getTomorrowDate());
      setFollowUpTime('14:00');
      setFollowUpType('Call');
      setAssignedToId(currentUser?.id || users[0]?.id || '');
    }
  }, [leadToEdit, isOpen, currentUser, users]);

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

  const calculatedLeadValue = useMemo(() => {
    if (budgetType === 'No Budget Discussed') {
      return selectedServices.length * 25000;
    }

    if (activePricingModel?.fields && activePricingModel.fields.length > 0) {
      const sum = activePricingModel.fields.reduce((acc, field) => {
        if (field.includeInTotal) {
          const val = Number(customFieldValues[field.key]);
          return acc + (isNaN(val) ? 0 : val);
        }
        return acc;
      }, 0);
      if (sum > 0) return sum;
    }

    if (budgetType === 'Monthly Subscription Model' || (activePricingModel?.billingType as string) === 'monthly_recurring' || activePricingModel?.billingType === 'Recurring') {
      const sub = Number(customFieldValues.monthly_fee ?? monthlySubscriptionFee) || 0;
      const setup = Number(customFieldValues.setup_fee ?? oneTimeSetupFee) || 0;
      const support = Number(customFieldValues.support_fee ?? monthlySupportFee) || 0;
      const other = Number(customFieldValues.other_fee ?? monthlyOtherFeeAmount) || 0;
      return setup + (sub + support) * 12 + other;
    }
    if (budgetType === 'Ownership Model' || (activePricingModel?.billingType as string) === 'ownership' || activePricingModel?.billingType === 'Hybrid') {
      const own = Number(customFieldValues.ownership_price ?? ownershipPrice) || 0;
      const setup = Number(customFieldValues.setup_fee ?? ownershipSetupFee) || 0;
      const support = Number(customFieldValues.support_fee ?? ownershipSupportFee) || 0;
      const other = Number(customFieldValues.other_fee ?? ownershipOtherFeeAmount) || 0;
      return own + setup + (support * 12) + other;
    }
    if (budgetType === 'One-Time Project Model' || (activePricingModel?.billingType as string) === 'one_time' || activePricingModel?.billingType === 'Fixed') {
      const proj = Number(customFieldValues.project_price ?? totalProjectPrice) || 0;
      const other = Number(customFieldValues.other_fee ?? oneTimeOtherFeeAmount) || 0;
      return proj + other;
    }
    return 0;
  }, [
    budgetType,
    activePricingModel,
    customFieldValues,
    selectedServices,
    monthlySubscriptionFee,
    oneTimeSetupFee,
    monthlySupportFee,
    monthlyOtherFeeAmount,
    ownershipPrice,
    ownershipSetupFee,
    ownershipSupportFee,
    ownershipOtherFeeAmount,
    totalProjectPrice,
    oneTimeOtherFeeAmount
  ]);

  const toggleService = (srvName: string) => {
    if (selectedServices.includes(srvName)) {
      if (selectedServices.length > 1) {
        setSelectedServices(prev => prev.filter(s => s !== srvName));
      }
    } else {
      setSelectedServices(prev => [...prev, srvName]);
    }
  };

  const allServiceNames = Array.from(
    new Set([...DEFAULT_SERVICE_OPTIONS, ...services.map(s => s.name)])
  );

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

    if (!phone.trim() || phone.trim() === '+92 300') {
      setPhoneError('Valid active phone number is required');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (hasError) return;

    const assignedUser = users.find(u => u.id === assignedToId);

    const budgetDetails: BudgetDetails = {
      budgetType,
      budgetNotes,
      customFieldValues,
      totalCalculatedValuePKR: calculatedLeadValue
    };

    if (budgetType === 'Monthly Subscription Model') {
      budgetDetails.monthlySubscriptionFee = Number(customFieldValues.monthly_fee ?? monthlySubscriptionFee) || 0;
      budgetDetails.oneTimeSetupFee = Number(customFieldValues.setup_fee ?? oneTimeSetupFee) || 0;
      budgetDetails.monthlySupportFee = Number(customFieldValues.support_fee ?? monthlySupportFee) || 0;
      budgetDetails.otherFeeAmount = Number(customFieldValues.other_fee ?? monthlyOtherFeeAmount) || 0;
      budgetDetails.totalInitialPayment = Number(customFieldValues.total_initial ?? monthlyTotalInitialPayment) || 0;
      budgetDetails.otherFeeDescription = customFieldValues.other_fee_desc ?? monthlyOtherFeeDescription;
    } else if (budgetType === 'Ownership Model') {
      budgetDetails.ownershipPrice = Number(customFieldValues.ownership_price ?? ownershipPrice) || 0;
      budgetDetails.setupFee = Number(customFieldValues.setup_fee ?? ownershipSetupFee) || 0;
      budgetDetails.monthlySupportFee = Number(customFieldValues.support_fee ?? ownershipSupportFee) || 0;
      budgetDetails.otherFeeAmount = Number(customFieldValues.other_fee ?? ownershipOtherFeeAmount) || 0;
      budgetDetails.otherFeeDescription = customFieldValues.other_fee_desc ?? ownershipOtherFeeDescription;
    } else if (budgetType === 'One-Time Project Model') {
      budgetDetails.totalProjectPrice = Number(customFieldValues.project_price ?? totalProjectPrice) || 0;
      budgetDetails.advanceMilestoneAmount = Number(customFieldValues.advance_payment ?? advanceMilestoneAmount) || 0;
      budgetDetails.otherFeeAmount = Number(customFieldValues.other_fee ?? oneTimeOtherFeeAmount) || 0;
      budgetDetails.otherFeeDescription = customFieldValues.other_fee_desc ?? oneTimeOtherFeeDescription;
    }

    const pricingModelMapped =
      budgetType === 'Monthly Subscription Model'
        ? 'Monthly Subscription'
        : budgetType === 'Ownership Model'
        ? 'Ownership Model'
        : 'One-Time Project';

    const effectiveBusinessName = company.trim() || name.trim() || 'Prospective Client';
    const effectiveEmail = email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;

    if (leadToEdit) {
      updateLead({
        ...leadToEdit,
        name: name.trim(),
        businessName: effectiveBusinessName,
        phone: phone.trim(),
        email: effectiveEmail,
        city: city.trim(),
        services: selectedServices,
        valuePKR: calculatedLeadValue,
        status,
        priority,
        quality,
        source,
        budgetType,
        budgetDetails,
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
        phone: phone.trim(),
        email: effectiveEmail,
        city: city.trim(),
        services: selectedServices,
        valuePKR: calculatedLeadValue,
        status,
        priority,
        quality,
        source,
        budgetType,
        budgetDetails,
        pricingModel: pricingModelMapped,
        assignedToId,
        assignedToName: assignedUser?.name || 'Unassigned',
        teamId: assignedUser?.teamId || '',
        teamName: assignedUser?.teamName || '',
        notes: initialNote,
        nextFollowUpDate: followUpDate || undefined,
        nextFollowUpTime: followUpDate ? followUpTime : undefined,
        nextFollowUpType: followUpDate ? followUpType : undefined,
        tags: [budgetType, priority]
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
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                placeholder="+92 300 1234567"
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
                placeholder="e.g. Lahore"
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
              />
            </FormField>

            <FormField label="Lead Source">
              <Select
                value={source}
                onChange={e => setSource(e.target.value as LeadSource)}
              >
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
            {allServiceNames.map(srvName => {
              const isSelected = selectedServices.includes(srvName);
              return (
                <button
                  type="button"
                  key={srvName}
                  onClick={() => toggleService(srvName)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
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
            })}
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
              <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-200">
                {formatPKR(calculatedLeadValue)}
              </span>
            </div>
          </div>

          <FormField label="Select Budget Model" required>
            <Select
              value={budgetType}
              onChange={e => setBudgetType(e.target.value as BudgetType)}
            >
              <option value="No Budget Discussed">1. No Budget Discussed</option>
              <option value="Monthly Subscription Model">2. Monthly Subscription Model (SaaS)</option>
              <option value="Ownership Model">3. Ownership Model (Lifetime License)</option>
              <option value="One-Time Project Model">4. One-Time Project Model</option>
              {pricingModels && pricingModels.length > 0 && (
                pricingModels
                  .filter(pm => 
                    pm.isActive && 
                    !['Monthly Subscription (SaaS)', 'Monthly Subscription Model', 'One-Time Project Model', 'Ownership Model'].includes(pm.name)
                  )
                  .map((pm, idx) => (
                    <option key={pm.id} value={pm.name}>
                      {idx + 5}. {pm.name} ({pm.billingType})
                    </option>
                  ))
              )}
            </Select>
          </FormField>

          {/* DYNAMIC FORM RENDERING BY BUDGET TYPE */}
          {budgetType === 'No Budget Discussed' && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-2 animate-fadeIn">
              <FormField label="Budget Notes">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="No budget discussed yet. Add optional note about client expectations, branch scale, or follow-up pricing targets..."
                />
              </FormField>
            </div>
          )}

          {budgetType !== 'No Budget Discussed' && activePricingModel?.fields && activePricingModel.fields.length > 0 && (
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

          {budgetType === 'Monthly Subscription Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <FormField label="Monthly Fee (PKR)" required>
                  <Input
                    type="number"
                    value={monthlySubscriptionFee}
                    onChange={e => setMonthlySubscriptionFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5000"
                  />
                </FormField>

                <FormField label="One-Time Setup Fee (PKR)">
                  <Input
                    type="number"
                    value={oneTimeSetupFee}
                    onChange={e => setOneTimeSetupFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10000"
                  />
                </FormField>

                <FormField label="Monthly Support Fee (PKR)">
                  <Input
                    type="number"
                    value={monthlySupportFee}
                    onChange={e => setMonthlySupportFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2000"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <FormField label="Other Fee Amount (PKR)">
                  <Input
                    type="number"
                    value={monthlyOtherFeeAmount}
                    onChange={e => setMonthlyOtherFeeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Optional (e.g. 0)"
                  />
                </FormField>

                <FormField label="Total Initial Payment (PKR)">
                  <Input
                    type="number"
                    value={monthlyTotalInitialPayment}
                    onChange={e => setMonthlyTotalInitialPayment(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 17000"
                  />
                </FormField>

                <FormField label="Other Fee Description">
                  <Input
                    type="text"
                    value={monthlyOtherFeeDescription}
                    onChange={e => setMonthlyOtherFeeDescription(e.target.value)}
                    placeholder="e.g. SMS credits, onboarding"
                  />
                </FormField>
              </div>

              <FormField label="Budget Notes">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="Budget notes..."
                />
              </FormField>
            </div>
          )}

          {budgetType === 'Ownership Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <FormField label="Ownership Price (PKR)" required>
                  <Input
                    type="number"
                    value={ownershipPrice}
                    onChange={e => setOwnershipPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 150000"
                  />
                </FormField>

                <FormField label="Setup Fee (PKR)">
                  <Input
                    type="number"
                    value={ownershipSetupFee}
                    onChange={e => setOwnershipSetupFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 20000"
                  />
                </FormField>

                <FormField label="Monthly Support Fee (PKR)">
                  <Input
                    type="number"
                    value={ownershipSupportFee}
                    onChange={e => setOwnershipSupportFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5000"
                  />
                </FormField>
              </div>

              <FormField label="Budget Notes">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="Ownership pricing discussion notes..."
                />
              </FormField>
            </div>
          )}

          {budgetType === 'One-Time Project Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-[#E5EAF1] dark:border-slate-800 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField label="Total Project Price (PKR)" required>
                  <Input
                    type="number"
                    value={totalProjectPrice}
                    onChange={e => setTotalProjectPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 85000"
                  />
                </FormField>

                <FormField label="Advance / Milestone Amount (PKR)">
                  <Input
                    type="number"
                    value={advanceMilestoneAmount}
                    onChange={e => setAdvanceMilestoneAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 30000"
                  />
                </FormField>
              </div>

              <FormField label="Budget Notes">
                <Textarea
                  rows={2}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="Project milestone & deliverable pricing details..."
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
            hint={isEmployeeRole ? 'Locked to your account' : undefined}
          >
            <Select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              disabled={isEmployeeRole}
            >
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
