import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { ServiceItem, PricingModel } from '../../types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Sparkles,
  Layers,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { formatPKR } from '../../utils/formatters';

export const ServicesAdminView: React.FC = () => {
  const { services, addService, updateService, deleteService, pricingModels } = useCRM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ERP');
  const [pricingModel, setPricingModel] = useState<PricingModel>('Monthly Subscription');
  const [defaultPricePKR, setDefaultPricePKR] = useState(85000);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setCategory('ERP');
    setPricingModel('Monthly Subscription');
    setDefaultPricePKR(85000);
    setDescription('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setName(srv.name);
    setCategory(srv.category);
    setPricingModel(srv.pricingModel);
    setDefaultPricePKR(srv.defaultPricePKR || srv.basePricePKR || 0);
    setDescription(srv.description);
    setIsActive(srv.isActive);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateService({
        ...editingService,
        name,
        category,
        pricingModel,
        defaultPricePKR: Number(defaultPricePKR),
        basePricePKR: Number(defaultPricePKR),
        description,
        isActive
      });
      setEditingService(null);
    } else {
      addService({
        name,
        category,
        pricingModel,
        defaultPricePKR: Number(defaultPricePKR),
        basePricePKR: Number(defaultPricePKR),
        description,
        isActive
      });
      setIsAddModalOpen(false);
    }
  };

  const handleDelete = (srv: ServiceItem) => {
    if (window.confirm(`Delete service "${srv.name}"?`)) {
      deleteService(srv.id);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Services &amp; Pricing Catalog
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {services.length} Services
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standard software packages, school ERPs, salon management systems, and pricing models in PKR.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Service</span>
        </button>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No services in catalog</p>
          <p className="text-xs text-slate-500 mt-1">Add your first software service or product package</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(srv => {
            const price = srv.defaultPricePKR || srv.basePricePKR || 0;
            return (
              <div
                key={srv.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {srv.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {srv.pricingModel}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                        title="Edit Service"
                        aria-label={`Edit ${srv.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(srv)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete Service"
                        aria-label={`Delete ${srv.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  {srv.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {srv.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Default Price</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatPKR(price)}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  srv.isActive !== false
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {srv.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add / Edit Service Modal */}
      {(isAddModalOpen || editingService) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingService ? `Edit Service: ${editingService.name}` : 'Add New Service / Package'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service / Software Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Education Management System (premium)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="EDU ERP, Vertical SaaS, Website..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pricing Model *
                  </label>
                  <select
                    value={pricingModel}
                    onChange={e => setPricingModel(e.target.value as PricingModel)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    {pricingModels && pricingModels.length > 0 ? (
                      pricingModels.filter(pm => pm.isActive).map(pm => (
                        <option key={pm.id} value={pm.name}>
                          {pm.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Monthly Subscription">Monthly Subscription</option>
                        <option value="One-Time Project">One-Time Project</option>
                        <option value="Ownership Model">Ownership Model</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={defaultPricePKR}
                    onChange={e => setDefaultPricePKR(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Active Catalog Status
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={e => setIsActive(e.target.value === 'true')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                  >
                    <option value="true">Active (Visible in Quotes & Leads)</option>
                    <option value="false">Inactive / Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description &amp; Key Deliverables
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Features, offline support, user licenses included..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
