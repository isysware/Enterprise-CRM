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
  FollowUpType,
  PricingModelItem
} from '../../types';
import {
  X,
  Building2,
  Phone,
  Mail,
  User,
  DollarSign,
  Calendar,
  Clock,
  MessageSquare,
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  CreditCard,
  Layers,
  FileText,
  UserCheck,
  Check
} from 'lucide-react';
import { formatPKR } from '../../utils/formatters';
import { DynamicPricingFieldsForm } from '../common/DynamicPricingFieldsForm';

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

    // Mirror to legacy state for backward compatibility if matching keys exist
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

  // Initialize today's date formatted
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Populate or reset form
  useEffect(() => {
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

        // Populate customFieldValues
        if (bd.customFieldValues && Object.keys(bd.customFieldValues).length > 0) {
          setCustomFieldValues(bd.customFieldValues);
        } else {
          // Initialize from existing budget details if available
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
      // Default reset
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

  // When active pricing model changes, ensure default field values are seeded if not present
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

  // Calculate Total Lead Value (PKR) dynamically
  const calculatedLeadValue = useMemo(() => {
    if (budgetType === 'No Budget Discussed') {
      return selectedServices.length * 25000;
    }

    // If active pricing model has custom fields configured with includeInTotal
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

    // Fallback standard calculations
    if (budgetType === 'Monthly Subscription Model' || activePricingModel?.billingType === 'monthly_recurring') {
      const sub = Number(customFieldValues.monthly_fee ?? monthlySubscriptionFee) || 0;
      const setup = Number(customFieldValues.setup_fee ?? oneTimeSetupFee) || 0;
      const support = Number(customFieldValues.support_fee ?? monthlySupportFee) || 0;
      const other = Number(customFieldValues.other_fee ?? monthlyOtherFeeAmount) || 0;
      return setup + (sub + support) * 12 + other;
    }
    if (budgetType === 'Ownership Model' || activePricingModel?.billingType === 'ownership') {
      const own = Number(customFieldValues.ownership_price ?? ownershipPrice) || 0;
      const setup = Number(customFieldValues.setup_fee ?? ownershipSetupFee) || 0;
      const support = Number(customFieldValues.support_fee ?? ownershipSupportFee) || 0;
      const other = Number(customFieldValues.other_fee ?? ownershipOtherFeeAmount) || 0;
      return own + setup + (support * 12) + other;
    }
    if (budgetType === 'One-Time Project Model' || activePricingModel?.billingType === 'one_time') {
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


  if (!isOpen) return null;

  // Toggle service selection
  const toggleService = (srvName: string) => {
    if (selectedServices.includes(srvName)) {
      if (selectedServices.length > 1) {
        setSelectedServices(prev => prev.filter(s => s !== srvName));
      }
    } else {
      setSelectedServices(prev => [...prev, srvName]);
    }
  };

  // Combine default services + custom services defined in Admin Services
  const allServiceNames = Array.from(
    new Set([...DEFAULT_SERVICE_OPTIONS, ...services.map(s => s.name)])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assignedUser = users.find(u => u.id === assignedToId);

    // Build structured budget details
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
        name,
        businessName: effectiveBusinessName,
        phone,
        email: effectiveEmail,
        city,
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
        name,
        businessName: effectiveBusinessName,
        phone,
        email: effectiveEmail,
        city,
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

    onClose();
  };

  return (
    <div
      id="create-lead-modal-backdrop"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div
        id="create-lead-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col my-auto animate-scaleUp overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {leadToEdit ? 'Edit Lead Record' : 'Create New Lead'}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Dynamic Form
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Capture client inquiry, configure budget model, and assign rep
              </p>
            </div>
          </div>

          <button
            id="close-lead-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* SECTION A: BASIC DETAILS (2-Column Grid) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                A. Basic Contact &amp; Business Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Client Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Saima Tariq"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone (WhatsApp Active) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Business Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Bella Spa & Salon"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value as LeadSource)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {sources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent 🔥</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quality
                </label>
                <select
                  value={quality}
                  onChange={e => setQuality(e.target.value as LeadQuality)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Good">Good (High Intent)</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as LeadStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                </select>
              </div>
            </div>
          </div>

          {/* SECTION B: SERVICES (Multi-select Checkbox Grid) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  B. Services &amp; Products
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
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
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-500'
                        : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-snug ${isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {srvName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION C: DYNAMIC BUDGET DETAILS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  C. Dynamic Budget Details
                </h3>
              </div>

              {/* Calculated Value Highlight */}
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Total Deal Value:
                </span>
                <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-200">
                  {formatPKR(calculatedLeadValue)}
                </span>
              </div>
            </div>

            {/* Budget Type Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Budget Type *
              </label>
              <select
                value={budgetType}
                onChange={e => setBudgetType(e.target.value as BudgetType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
              </select>
            </div>

            {/* DYNAMIC FORM RENDERING BY BUDGET TYPE */}

            {/* Option 1: No Budget Discussed */}
            {budgetType === 'No Budget Discussed' && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 animate-fadeIn">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Budget Notes
                </label>
                <textarea
                  rows={3}
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  placeholder="No budget discussed yet. Add optional note about client expectations, branch scale, or follow-up pricing targets..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Option 2: Dynamic Schema Rendering for Active Pricing Model with Custom Fields */}
            {budgetType !== 'No Budget Discussed' && activePricingModel?.fields && activePricingModel.fields.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {activePricingModel.name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {activePricingModel.billingType}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {activePricingModel.fields.length} dynamic budget fields
                  </span>
                </div>

                <DynamicPricingFieldsForm
                  fields={activePricingModel.fields}
                  values={customFieldValues}
                  onChange={handleCustomFieldChange}
                  currencySymbol={settings?.currencySymbol || 'Rs.'}
                />

                {/* Budget Notes */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Budget Notes &amp; Terms
                  </label>
                  <textarea
                    rows={2}
                    value={budgetNotes}
                    onChange={e => setBudgetNotes(e.target.value)}
                    placeholder="Pricing discussion notes, milestone conditions, discount approvals, or payment schedule details..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Fallback Option 3: Legacy Monthly Subscription Model (if no fields array in model) */}
            {budgetType === 'Monthly Subscription Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-fadeIn">
                {/* Row 1 (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Subscription Fee (PKR) *
                    </label>
                    <input
                      type="number"
                      value={monthlySubscriptionFee}
                      onChange={e => setMonthlySubscriptionFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      One-Time Setup Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={oneTimeSetupFee}
                      onChange={e => setOneTimeSetupFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 10000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Support Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={monthlySupportFee}
                      onChange={e => setMonthlySupportFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 2000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Row 2 (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={monthlyOtherFeeAmount}
                      onChange={e => setMonthlyOtherFeeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Optional (e.g. 0)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total Initial Payment (PKR)
                    </label>
                    <input
                      type="number"
                      value={monthlyTotalInitialPayment}
                      onChange={e => setMonthlyTotalInitialPayment(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 17000"
                      className="w-full bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3 py-2 font-mono font-extrabold text-emerald-800 dark:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Description
                    </label>
                    <input
                      type="text"
                      value={monthlyOtherFeeDescription}
                      onChange={e => setMonthlyOtherFeeDescription(e.target.value)}
                      placeholder="e.g. SMS gateway credits, training"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Budget Notes */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Notes
                  </label>
                  <textarea
                    rows={2}
                    value={budgetNotes}
                    onChange={e => setBudgetNotes(e.target.value)}
                    placeholder="Budget discussed during first call: 3-month upfront commitment with 1 free month support..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Fallback Option 4: Legacy Ownership Model */}
            {budgetType === 'Ownership Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-fadeIn">
                {/* Row 1 (3 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ownership Price (PKR) *
                    </label>
                    <input
                      type="number"
                      value={ownershipPrice}
                      onChange={e => setOwnershipPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 150000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Setup Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={ownershipSetupFee}
                      onChange={e => setOwnershipSetupFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 20000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Monthly Support Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={ownershipSupportFee}
                      onChange={e => setOwnershipSupportFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Row 2 (2 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={ownershipOtherFeeAmount}
                      onChange={e => setOwnershipOtherFeeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Optional (e.g. 0)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Description
                    </label>
                    <input
                      type="text"
                      value={ownershipOtherFeeDescription}
                      onChange={e => setOwnershipOtherFeeDescription(e.target.value)}
                      placeholder="e.g. Server deployment, source code license"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Budget Notes */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Notes
                  </label>
                  <textarea
                    rows={2}
                    value={budgetNotes}
                    onChange={e => setBudgetNotes(e.target.value)}
                    placeholder="Ownership pricing discussion notes: On-premise server deployment requested with 1-year included maintenance..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Fallback Option 5: Legacy One-Time Project Model */}
            {budgetType === 'One-Time Project Model' && (!activePricingModel?.fields || activePricingModel.fields.length === 0) && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-fadeIn">
                {/* Row 1 (2 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total Project Price (PKR) *
                    </label>
                    <input
                      type="number"
                      value={totalProjectPrice}
                      onChange={e => setTotalProjectPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 85000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Advance / Milestone Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={advanceMilestoneAmount}
                      onChange={e => setAdvanceMilestoneAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 30000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Row 2 (2 Cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Amount (PKR)
                    </label>
                    <input
                      type="number"
                      value={oneTimeOtherFeeAmount}
                      onChange={e => setOneTimeOtherFeeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Optional (e.g. 0)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Other Fee Description
                    </label>
                    <input
                      type="text"
                      value={oneTimeOtherFeeDescription}
                      onChange={e => setOneTimeOtherFeeDescription(e.target.value)}
                      placeholder="e.g. Domain + hosting fee, third-party API keys"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Budget Notes */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Notes
                  </label>
                  <textarea
                    rows={2}
                    value={budgetNotes}
                    onChange={e => setBudgetNotes(e.target.value)}
                    placeholder="Project milestone & deliverable pricing details: 50% advance, 50% upon QA approval..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION D: INITIAL NOTE & OPTIONAL FIRST FOLLOW-UP */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                D. Initial Note &amp; Follow-Up Schedule
              </h3>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Inquiry / Discussion Notes
              </label>
              <textarea
                rows={3}
                value={initialNote}
                onChange={e => setInitialNote(e.target.value)}
                placeholder="Client requirements, software pain points, number of staff/branches, demo feedback..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Schedule Follow-up Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-up Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={e => setFollowUpTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-up Type
                </label>
                <select
                  value={followUpType}
                  onChange={e => setFollowUpType(e.target.value as FollowUpType)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Meeting">In-Person Meeting</option>
                  <option value="Demo">Software Demo</option>
                  <option value="Email">Email Follow-Up</option>
                  <option value="Visit">Site Visit</option>
                </select>
              </div>
            </div>

            {/* Assign To Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Assign Representative *
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
                className={`w-full border rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                  isEmployeeRole
                    ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 cursor-pointer'
                }`}
              >
                {availableReps.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role} ({u.teamName || 'Direct Team'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION E: MODAL ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Calculated deal value will be saved automatically</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="cancel-lead-btn"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="save-lead-submit-btn"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{leadToEdit ? 'Save Lead Changes' : 'Save Lead'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
