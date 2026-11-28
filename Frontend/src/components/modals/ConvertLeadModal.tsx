import React, { useState, useEffect, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types';
import {
  CheckCircle2,
  DollarSign,
  Building2,
  UserCheck,
  Tag,
  FileText,
  CreditCard,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Check
} from 'lucide-react';
import { formatPKR, getLocalDateString } from '../../utils/formatters';
import { DynamicPricingFieldsForm } from '../common/DynamicPricingFieldsForm';
import { ModalShell, FormField, Input, Select, Textarea, Button, Badge } from '../ui';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess
}) => {
  const { users, assignableUsers, convertLeadToClient, currentUser, pricingModels, settings, services } = useCRM();
  const availableReps = assignableUsers && assignableUsers.length > 0 ? assignableUsers : (currentUser ? [currentUser] : users);

  // Section A: Closing Info (3 Columns)
  const [generatedById, setGeneratedById] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [closedById, setClosedById] = useState<string>('');

  // Section B: Final Services Multi-Select
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Section C: Dynamic Final Pricing Section
  const [pricingModel, setPricingModel] = useState<string>('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(settings?.currency || 'PKR');

  // One-Time Project Fields (fallback)
  const [oneTimeProjectPrice, setOneTimeProjectPrice] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [remainingPayment, setRemainingPayment] = useState<number>(0);
  const [supportFeeAfterDelivery, setSupportFeeAfterDelivery] = useState<number>(0);
  const [otherFeeAmount, setOtherFeeAmount] = useState<number>(0);
  const [otherFeeDescription, setOtherFeeDescription] = useState<string>('');
  const [pricingNotes, setPricingNotes] = useState<string>('');

  // Monthly Subscription Fields (fallback)
  const [monthlySubscriptionFee, setMonthlySubscriptionFee] = useState<number>(0);
  const [oneTimeSetupFee, setOneTimeSetupFee] = useState<number>(0);
  const [monthlySupportFee, setMonthlySupportFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ownership Fields (fallback)
  const [ownershipPrice, setOwnershipPrice] = useState<number>(0);

  // Additional Details
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [packageDetails, setPackageDetails] = useState<string>('');
  const [conversionNote, setConversionNote] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Find active pricing model
  const activePricingModel = useMemo(() => {
    return pricingModels?.find(pm =>
      pm.id === lead?.pricingModelId ||
      pm.name.toLowerCase() === pricingModel.toLowerCase() ||
      (pricingModel === 'Monthly Subscription Model' && (pm.name.includes('Monthly') || pm.name.includes('Subscription'))) ||
      (pricingModel === 'Ownership Model' && pm.name.includes('Ownership')) ||
      (pricingModel === 'One-Time Project Model' && (pm.name.includes('One-Time') || pm.name.includes('Project')))
    ) || null;
  }, [pricingModel, pricingModels, lead?.pricingModelId]);

  // Calculate total from dynamic schema fields
  const calculatedTotal = useMemo(() => {
    if (activePricingModel?.fields && activePricingModel.fields.length > 0) {
      return activePricingModel.fields.reduce((acc, f) => {
        if (f.includeInTotal) {
          const val = Number(customFieldValues[f.key] ?? f.defaultValue);
          return acc + (isNaN(val) ? 0 : val);
        }
        return acc;
      }, 0);
    }
    return 0;
  }, [activePricingModel, customFieldValues]);

  // Sync calculated total to final price if available
  useEffect(() => {
    if (calculatedTotal > 0) {
      setFinalPrice(calculatedTotal);
    }
  }, [calculatedTotal]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const availableServiceNames = useMemo(() => {
    return services.map(s => s.name);
  }, [services]);

  // Initialize modal state when lead changes
  useEffect(() => {
    if (lead) {
      setGeneratedById(lead.assignedToId || (users[0]?.id ?? ''));
      setAssignedToId(lead.assignedToId || (users[0]?.id ?? ''));
      setClosedById(currentUser?.id || users[0]?.id || '');

      if (lead.services && lead.services.length > 0) {
        setSelectedServices(lead.services);
      } else {
        setSelectedServices([]);
      }

      if (lead.budgetDetails?.customFieldValues) {
        setCustomFieldValues(lead.budgetDetails.customFieldValues);
      } else {
        setCustomFieldValues({});
      }

      const matchedPm = pricingModels?.find(pm =>
        pm.id === lead.pricingModelId ||
        pm.name === lead.pricingModel ||
        pm.name === lead.budgetType
      );
      const matchedModelName = matchedPm?.name || lead.pricingModel || lead.budgetType || (pricingModels && pricingModels.length > 0 ? pricingModels[0].name : '');
      setPricingModel(matchedModelName);

      const dealVal = lead.valuePKR || lead.budgetDetails?.totalProjectPrice || lead.budgetDetails?.totalInitialPayment || 0;
      setFinalPrice(dealVal);
      setOneTimeProjectPrice(dealVal);
      setAdvancePayment(lead.budgetDetails?.advanceMilestoneAmount || 0);
      setRemainingPayment(Math.max(0, dealVal - (lead.budgetDetails?.advanceMilestoneAmount || 0)));
      setMonthlySubscriptionFee(lead.budgetDetails?.monthlySubscriptionFee || 0);
      setOneTimeSetupFee(lead.budgetDetails?.oneTimeSetupFee || lead.budgetDetails?.setupFee || 0);
      setOwnershipPrice(lead.budgetDetails?.ownershipPrice || dealVal);

      setErrorMsg('');
    }
  }, [lead, users, currentUser]);

  const toggleService = (srv: string) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  const handleModelChange = (modelName: string) => {
    setPricingModel(modelName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !lead) return;

    if (!assignedToId) {
      setErrorMsg('Please select an assigned representative.');
      return;
    }
    if (!closedById) {
      setErrorMsg('Please select who closed the deal.');
      return;
    }
    if (finalPrice <= 0) {
      setErrorMsg('Final deal value must be greater than zero.');
      return;
    }

    const assignedUser = users.find(u => u.id === assignedToId);
    const closedByUser = users.find(u => u.id === closedById);
    const genUser = users.find(u => u.id === generatedById);

    const clientPayload: any = {
      name: lead.name,
      businessName: lead.businessName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      services: selectedServices.length > 0 ? selectedServices : lead.services,
      finalPrice: finalPrice,
      pricingModel: pricingModel,
      pricingModelId: activePricingModel?.id || lead.pricingModelId,
      pricingModelName: activePricingModel?.name || pricingModel,
      leadGeneratedById: generatedById,
      leadGeneratedByName: genUser?.name || lead.assignedToName,
      assignedToId: assignedToId,
      assignedToName: assignedUser?.name || lead.assignedToName,
      teamId: assignedUser?.teamId || lead.teamId,
      teamName: assignedUser?.teamName || lead.teamName,
      closedById: closedById,
      closedByName: closedByUser?.name || currentUser?.name || 'Closer',
      closingDate: getLocalDateString(),
      source: lead.source,
      status: 'Active',
      dealTerms: paymentTerms,
      packageDetails: packageDetails,
      conversionNotes: conversionNote,
      budgetDetails: {
        ...lead.budgetDetails,
        budgetType: pricingModel as any,
        totalCalculatedValuePKR: finalPrice,
        customFieldValues: customFieldValues
      }
    };

    setIsSubmitting(true);
    convertLeadToClient(lead.id, clientPayload);
    if (onSuccess) onSuccess();
    onClose();
    setIsSubmitting(false);
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Contract Total: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{currency} {finalPrice.toLocaleString()}</strong></span>
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
          variant="success"
          size="md"
          onClick={handleSubmit}
          disabled={isSubmitting}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          {isSubmitting ? 'Converting...' : 'Convert to Client'}
        </Button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Convert Lead to Closed Client"
      subtitle={`Finalize commercial contract and customer onboarding for ${lead?.businessName || lead?.name || 'Lead'}`}
      icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Lead Summary Overview */}
        <div className="bg-slate-50 dark:bg-slate-850 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
              Lead Information
            </span>
            <h4 className="font-medium text-[#0F172A] dark:text-white text-sm mt-0.5">
              {lead?.businessName}
            </h4>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Contact: <strong className="text-[#0F172A] dark:text-slate-200">{lead?.name}</strong> • {lead?.phone} • {lead?.city}
            </p>
          </div>

          <div className="text-right sm:shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 block">Lead Est. Value</span>
            <span className="font-mono font-medium text-xs text-slate-700 dark:text-slate-300">
              {formatPKR(lead?.valuePKR || 0)}
            </span>
          </div>
        </div>

        {/* Section A: Team Closing Attribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <UserCheck className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              A. Team Closing Attribution
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <FormField label="Lead Generated By" required>
              <Select
                value={generatedById}
                onChange={e => setGeneratedById(e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Assigned Account Manager" required>
              <Select
                value={assignedToId}
                onChange={e => setAssignedToId(e.target.value)}
              >
                {availableReps.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Deal Closed By" required>
              <Select
                value={closedById}
                onChange={e => setClosedById(e.target.value)}
              >
                {availableReps.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Section B: Final Services Included */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                B. Final Services Included
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
              {selectedServices.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableServiceNames.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                No services configured yet. Configure services in Admin &gt; Services.
              </div>
            ) : (
              availableServiceNames.map(srv => {
                const isSelected = selectedServices.includes(srv);
                return (
                  <button
                    type="button"
                    key={srv}
                    onClick={() => toggleService(srv)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                      )}
                    </div>
                    <span className="font-semibold text-xs leading-snug">{srv}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Section C: Dynamic Final Pricing Section */}
        <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                C. Final Pricing &amp; Contract Value
              </h4>
            </div>

            {calculatedTotal > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Formula Total: {settings?.currencySymbol || 'Rs.'} {calculatedTotal.toLocaleString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Pricing Model" required>
              <Select
                value={pricingModel}
                onChange={e => handleModelChange(e.target.value)}
              >
                {pricingModels && pricingModels.length > 0 ? (
                  pricingModels.filter(pm => pm.isActive).map(pm => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name} ({pm.billingType})
                    </option>
                  ))
                ) : (
                  <option value="">-- No Pricing Models Configured --</option>
                )}
                {pricingModels && pricingModels.length > 0 && (
                  <option value="Custom Quotation / Hybrid">Custom Quotation / Hybrid</option>
                )}
              </Select>
            </FormField>

            <FormField label={`Final Price (${currency})`} required>
              <Input
                type="number"
                value={finalPrice || ''}
                onChange={e => setFinalPrice(Number(e.target.value))}
                placeholder="e.g. 80000"
              />
            </FormField>
          </div>

          {/* Dynamic schema fields */}
          {activePricingModel?.fields && activePricingModel.fields.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <DynamicPricingFieldsForm
                fields={activePricingModel.fields}
                values={customFieldValues}
                onChange={handleCustomFieldChange}
                currencySymbol={settings?.currencySymbol || 'Rs.'}
              />
            </div>
          )}
        </div>

        {/* Section D: Deal Terms & Notes */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF1] dark:border-slate-800">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              D. Deal Terms, Package &amp; Notes
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Payment Terms">
              <Input
                type="text"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30,000 Advance, 50,000 after delivery"
              />
            </FormField>

            <FormField label="Package Details">
              <Input
                type="text"
                value={packageDetails}
                onChange={e => setPackageDetails(e.target.value)}
                placeholder="e.g. 1 Branch license with training"
              />
            </FormField>
          </div>

          <FormField label="Conversion Note">
            <Textarea
              rows={2}
              value={conversionNote}
              onChange={e => setConversionNote(e.target.value)}
              placeholder="Add final conversion details, agreed contract scope, or client remarks..."
            />
          </FormField>
        </div>
      </form>
    </ModalShell>
  );
};
