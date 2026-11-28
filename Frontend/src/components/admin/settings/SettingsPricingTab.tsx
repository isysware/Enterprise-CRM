import React, { useState } from 'react';
import { useCRM } from '../../../context/CRMContext';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  DollarSign,
  Tag,
  Save,
  Check,
  X,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Info,
  CheckCircle2,
  Copy,
  HelpCircle
} from 'lucide-react';
import { PricingModelItem, PricingModelField, FieldInputType } from '../../../types';
import { formatPKR } from '../../../utils/formatters';
import {
  ModalShell,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  ConfirmDialog
} from '../../ui';

interface SettingsPricingTabProps {
  onSaveSuccess: (message: string) => void;
}

export const SettingsPricingTab: React.FC<SettingsPricingTabProps> = ({ onSaveSuccess }) => {
  const {
    settings,
    updateSettings,
    pricingModels,
    addPricingModel,
    updatePricingModel,
    deletePricingModel
  } = useCRM();

  const [defaultPricingModel, setDefaultPricingModel] = useState<string>(
    settings.defaultPricingModel || ''
  );

  // Pricing Model Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPricingModel, setEditingPricingModel] = useState<PricingModelItem | null>(null);
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<PricingModelItem | null>(null);
  const [pmName, setPmName] = useState('');
  const [pmBillingType, setPmBillingType] = useState<PricingModelItem['billingType'] | ''>('');
  const [pmSetupFee, setPmSetupFee] = useState<number | ''>('');
  const [pmFrequency, setPmFrequency] = useState('');
  const [pmDescription, setPmDescription] = useState('');
  const [pmIsActive, setPmIsActive] = useState(true);
  const [pmFields, setPmFields] = useState<PricingModelField[]>([]);
  const [pmError, setPmError] = useState<string | null>(null);
  const [tabActionError, setTabActionError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);

  // Helper to generate a clean camelCase key from label
  const generateFieldKey = (label: string) => {
    return (
      label
        .toLowerCase()
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .filter(Boolean)
        .map((word, idx) => (idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join('') || `field_${Date.now() % 10000}`
    );
  };

  // Open Add Pricing Model Modal
  const handleOpenAddPricingModal = () => {
    setEditingPricingModel(null);
    setPmName('');
    setPmBillingType('');
    setPmSetupFee('');
    setPmFrequency('');
    setPmDescription('');
    setPmIsActive(true);
    setPmFields([]);
    setPmError(null);
    setIsPricingModalOpen(true);
  };

  // Open Edit Pricing Model Modal
  const handleOpenEditPricingModal = (model: PricingModelItem) => {
    setEditingPricingModel(model);
    setPmName(model.name);
    setPmBillingType(model.billingType);
    setPmSetupFee(model.defaultSetupFeePKR || 0);
    setPmFrequency(model.defaultBillingFrequency || '');
    setPmDescription(model.description);
    setPmIsActive(model.isActive);
    setPmFields(model.fields && model.fields.length > 0 ? [...model.fields] : []);
    setPmError(null);
    setIsPricingModalOpen(true);
  };

  // Duplicate Pricing Model
  const handleDuplicatePricingModel = (model: PricingModelItem) => {
    addPricingModel({
      name: `${model.name} (Copy)`,
      billingType: model.billingType,
      defaultSetupFeePKR: model.defaultSetupFeePKR,
      defaultBillingFrequency: model.defaultBillingFrequency,
      description: model.description,
      isActive: true,
      fields: model.fields ? model.fields.map(f => ({ ...f, id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}` })) : []
    });
    onSaveSuccess(`Pricing model "${model.name}" duplicated successfully!`);
  };

  // Add Field to Current Model
  const handleAddField = (presetType: FieldInputType = 'currency') => {
    const newField: PricingModelField = {
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: presetType === 'currency' ? 'New Fee Field (PKR)' : presetType === 'dropdown' ? 'Contract Tier' : 'Custom Field',
      key: presetType === 'currency' ? `customFee_${Date.now() % 10000}` : `customField_${Date.now() % 10000}`,
      type: presetType,
      options: presetType === 'dropdown' ? ['Standard', 'Premium', 'Enterprise'] : undefined,
      defaultValue: presetType === 'currency' ? 0 : presetType === 'dropdown' ? 'Standard' : '',
      placeholder: presetType === 'currency' ? 'e.g. 5000' : 'Enter value...',
      isRequired: false,
      includeInTotal: presetType === 'currency' || presetType === 'number'
    };
    setPmFields(prev => [...prev, newField]);
  };

  // Update Field
  const handleUpdateField = (index: number, updates: Partial<PricingModelField>) => {
    setPmFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Remove Field
  const handleRemoveField = (index: number) => {
    setPmFields(prev => prev.filter((_, i) => i !== index));
  };

  // Reorder Field Up/Down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    setPmFields(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Save Pricing Model
  const handleSavePricingModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmError(null);

    if (!pmName.trim()) {
      setPmError('Model name is required.');
      return;
    }

    if (!pmBillingType) {
      setPmError('Please select a billing structure.');
      return;
    }

    const sanitizedFields: PricingModelField[] = pmFields.map(f => {
      const label = f.label.trim() || 'Untitled Field';
      const key = (f.key && f.key.trim()) ? f.key.trim() : generateFieldKey(label);
      return {
        ...f,
        label,
        key
      };
    });

    setIsSavingModel(true);

    try {
      if (editingPricingModel) {
        const updated = await updatePricingModel({
          ...editingPricingModel,
          name: pmName.trim(),
          billingType: pmBillingType as PricingModelItem['billingType'],
          defaultSetupFeePKR: Number(pmSetupFee) || 0,
          defaultBillingFrequency: pmFrequency.trim(),
          description: pmDescription.trim(),
          isActive: pmIsActive,
          fields: sanitizedFields
        });
        if (!updated) {
          setPmError('Failed to update pricing model. Please check the fields and try again.');
          setIsSavingModel(false);
          return;
        }
        onSaveSuccess(`Pricing model "${pmName}" updated with ${sanitizedFields.length} dynamic fields!`);
      } else {
        const created = await addPricingModel({
          name: pmName.trim(),
          billingType: pmBillingType as PricingModelItem['billingType'],
          defaultSetupFeePKR: Number(pmSetupFee) || 0,
          defaultBillingFrequency: pmFrequency.trim(),
          description: pmDescription.trim(),
          isActive: pmIsActive,
          fields: sanitizedFields
        });
        if (!created) {
          setPmError('Failed to create pricing model in database. Please check the fields and try again.');
          setIsSavingModel(false);
          return;
        }
        onSaveSuccess(`New pricing model "${pmName}" created and saved to database!`);
      }

      setIsPricingModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save pricing model.';
      setPmError(message);
    } finally {
      setIsSavingModel(false);
    }
  };

  // Delete Pricing Model
  const handleDeletePricingModel = (model: PricingModelItem) => {
    setDeleteConfirmModel(model);
  };

  const handleConfirmDeleteModel = async () => {
    if (!deleteConfirmModel) return;
    setTabActionError(null);
    const res = await deletePricingModel(deleteConfirmModel.id);
    if (res.success) {
      onSaveSuccess(`Pricing model "${deleteConfirmModel.name}" deleted.`);
    } else {
      setTabActionError(res.error || 'Cannot delete model.');
    }
    setDeleteConfirmModel(null);
  };

  const getBillingTypeBadge = (type: PricingModelItem['billingType']) => {
    switch (type) {
      case 'Recurring':
        return 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Milestone':
        return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'Fixed':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Hybrid':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const handleSaveDefaultPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setTabActionError(null);
    if (!defaultPricingModel) {
      setTabActionError('Please select a default pricing model first.');
      return;
    }
    setIsSaving(true);

    try {
      await updateSettings(
        { defaultPricingModel },
        'pricing_config',
        'Software Pricing Configuration'
      );

      const targetModel = pricingModels.find(m => m.name === defaultPricingModel);
      if (targetModel && !targetModel.isSystemDefault) {
        await updatePricingModel({
          ...targetModel,
          isSystemDefault: true
        });
      }

      setIsSaved(true);
      onSaveSuccess('Default Software Pricing Model saved successfully!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save default pricing model.';
      setTabActionError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {tabActionError && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{tabActionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setTabActionError(null)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF1] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                Software Pricing Models &amp; Dynamic Schemas
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Configure SaaS subscriptions, one-time project fees, custom retainers, and dynamic proposal input fields.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPricingModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs shadow-blue-500/20 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Pricing Model</span>
          </button>
        </div>

        {/* Default Selection Card */}
        <form onSubmit={handleSaveDefaultPricing} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F7F9FC] dark:bg-slate-800/50 border border-[#E5EAF1] dark:border-slate-700">
          <div className="space-y-0.5">
            <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200">
              Default System Pricing Model
            </label>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400">
              Automatically pre-selected when creating new leads, generating commercial proposals, and converting clients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={defaultPricingModel}
              onChange={e => setDefaultPricingModel(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-medium focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden cursor-pointer"
            >
              <option value="">-- Select Default Pricing Model --</option>
              {pricingModels.map(pm => (
                <option key={pm.id} value={pm.name}>
                  {pm.name} ({pm.billingType})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSaving || !defaultPricingModel}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-xs shadow-blue-500/20"
            >
              {isSaving ? 'Saving...' : 'Set Default'}
            </button>
          </div>
        </form>

        {/* Pricing Models Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E5EAF1] dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[#64748B] dark:text-slate-400 border-b border-[#E5EAF1] dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Model Name &amp; Description</th>
                <th className="py-3 px-3">Billing Type</th>
                <th className="py-3 px-3">Default Setup Fee</th>
                <th className="py-3 px-3">Frequency</th>
                <th className="py-3 px-3">Dynamic Fields</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] dark:divide-slate-800">
              {pricingModels.map(model => {
                const isDefault = defaultPricingModel === model.name;

                return (
                  <tr
                    key={model.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F172A] dark:text-white">
                            {model.name}
                          </span>
                          {isDefault && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-1">
                          {model.description || 'Standard software contract model'}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBillingTypeBadge(model.billingType)}`}>
                        {model.billingType}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-[#0F172A] dark:text-slate-200 font-mono">
                      {formatPKR(model.defaultSetupFeePKR || 0)}
                    </td>

                    <td className="py-3.5 px-3 text-[#64748B] dark:text-slate-400">
                      {model.defaultBillingFrequency || 'N/A'}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Sliders className="w-3 h-3 text-[#2563EB]" />
                        <span>{model.fields?.length || 0} fields</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${model.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}>
                        {model.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPricingModal(model)}
                          title="Edit Dynamic Schema"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] hover:text-[#2563EB] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicatePricingModel(model)}
                          title="Duplicate Model"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] hover:text-emerald-600 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePricingModel(model)}
                          title="Delete Model"
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Configuration: Connected to PostgreSQL Database</span>
        </div>

        <button
          type="button"
          onClick={handleSaveDefaultPricing}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaved ? 'Configuration Saved!' : 'Save Pricing Models Configuration'}</span>
        </button>
      </div>

      {/* MODAL: ADD / EDIT PRICING MODEL & DYNAMIC SCHEMA BUILDER */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E5EAF1] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563EB] dark:text-blue-400" />
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {editingPricingModel ? `Edit Model: ${editingPricingModel.name}` : 'Create New Pricing Model'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePricingModel} className="p-5 space-y-5 overflow-y-auto flex-1">
              {pmError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pmError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Pricing Model Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pmName}
                    onChange={e => setPmName(e.target.value)}
                    placeholder="e.g. Enterprise Cloud SaaS"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Billing Structure
                  </label>
                  <select
                    value={pmBillingType}
                    onChange={e => setPmBillingType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Select Billing Structure --</option>
                    <option value="Recurring">Recurring Subscription (Monthly/Annual)</option>
                    <option value="Milestone">Milestone-Based Turnkey Project</option>
                    <option value="Fixed">Fixed Price / One-Off Licensing</option>
                    <option value="Hybrid">Hybrid (Setup Fee + Monthly Retainer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Default Setup / Deployment Fee (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pmSetupFee}
                    onChange={e => setPmSetupFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    Default Billing Frequency
                  </label>
                  <input
                    type="text"
                    value={pmFrequency}
                    onChange={e => setPmFrequency(e.target.value)}
                    placeholder="e.g. Monthly, Quarterly, Annual"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  Description / Contract Terms Summary
                </label>
                <textarea
                  rows={2}
                  value={pmDescription}
                  onChange={e => setPmDescription(e.target.value)}
                  placeholder="Explain billing milestones or subscription terms..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white focus:ring-1 focus:ring-[#2563EB] focus:outline-hidden"
                />
              </div>

              {/* DYNAMIC FIELD SCHEMA BUILDER */}
              <div className="pt-3 border-t border-[#E5EAF1] dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Custom Proposal &amp; Deal Input Fields</span>
                    </h4>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                      Fields rendered when this model is selected in Lead conversion and Proposal Builder.
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddField('currency')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 cursor-pointer"
                    >
                      + Fee (PKR)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('dropdown')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
                    >
                      + Dropdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('text')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
                    >
                      + Text
                    </button>
                  </div>
                </div>

                {pmFields.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    <p className="text-xs text-[#64748B]">No custom fields defined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pmFields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="p-3 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-700 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-[#64748B] w-4">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={field.label}
                              onChange={e => handleUpdateField(idx, { label: e.target.value, key: generateFieldKey(e.target.value) })}
                              placeholder="Field Label (e.g. Monthly Retainer)"
                              className="flex-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white"
                            />
                            <select
                              value={field.type}
                              onChange={e => handleUpdateField(idx, { type: e.target.value as FieldInputType })}
                              className="px-2 py-1 text-[11px] rounded-lg border border-[#E5EAF1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-medium cursor-pointer"
                            >
                              <option value="currency">Currency (PKR)</option>
                              <option value="number">Number</option>
                              <option value="text">Text</option>
                              <option value="dropdown">Dropdown</option>
                              <option value="date">Date</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveField(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === pmFields.length - 1}
                              onClick={() => handleMoveField(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveField(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Options / Flags row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#E5EAF1] dark:border-slate-700/60">
                          <span className="font-mono text-[10px] text-[#64748B]">
                            key: <span className="text-[#2563EB] dark:text-blue-400">{field.key}</span>
                          </span>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.isRequired}
                                onChange={e => handleUpdateField(idx, { isRequired: e.target.checked })}
                                className="rounded text-[#2563EB] focus:ring-0"
                              />
                              <span>Required</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.includeInTotal}
                                onChange={e => handleUpdateField(idx, { includeInTotal: e.target.checked })}
                                className="rounded text-[#2563EB] focus:ring-0"
                              />
                              <span>Add to Total PKR</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF1] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModel}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSavingModel && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>
                    {isSavingModel
                      ? 'Saving...'
                      : editingPricingModel
                        ? 'Update Model'
                        : 'Create Model'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
