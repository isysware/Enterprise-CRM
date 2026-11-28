import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { ServiceItem, PricingModel } from '../../types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  X,
  Tag
} from 'lucide-react';
import { formatPKR } from '../../utils/formatters';
import {
  ModalShell,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  ConfirmDialog
} from '../ui';

export const ServicesAdminView: React.FC = () => {
  const { services, addService, updateService, deleteService, pricingModels } = useCRM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteConfirmService, setDeleteConfirmService] = useState<ServiceItem | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pricingModelFilter, setPricingModelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ERP');
  const [pricingModel, setPricingModel] = useState<PricingModel>('Monthly Subscription');
  const [defaultPricePKR, setDefaultPricePKR] = useState<number | string>(25000);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Available categories for filtering
  const availableCategories = useMemo(() => {
    return Array.from(new Set(services.map(s => s.category).filter(Boolean))).sort();
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = srv.name.toLowerCase().includes(q);
        const matchCat = srv.category.toLowerCase().includes(q);
        const matchDesc = (srv.description || '').toLowerCase().includes(q);
        const matchPricing = (srv.pricingModel || '').toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc && !matchPricing) return false;
      }

      if (categoryFilter !== 'All' && srv.category !== categoryFilter) {
        return false;
      }

      if (pricingModelFilter !== 'All' && srv.pricingModel !== pricingModelFilter) {
        return false;
      }

      if (statusFilter !== 'All') {
        const isSrvActive = srv.isActive !== false;
        if (statusFilter === 'Active' && !isSrvActive) return false;
        if (statusFilter === 'Inactive' && isSrvActive) return false;
      }

      return true;
    });
  }, [services, searchQuery, categoryFilter, pricingModelFilter, statusFilter]);

  // Derived real metrics
  const totalCount = services.length;
  const activeCount = services.filter(s => s.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;
  const totalPricingSum = services.reduce((sum, s) => sum + (s.defaultPricePKR || s.basePricePKR || 0), 0);
  const avgPrice = totalCount > 0 ? Math.round(totalPricingSum / totalCount) : 0;
  const categoriesCount = availableCategories.length;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'All' ||
    pricingModelFilter !== 'All' ||
    statusFilter !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setPricingModelFilter('All');
    setStatusFilter('All');
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setCategory('ERP');
    setPricingModel('Monthly Subscription');
    setDefaultPricePKR('');
    setDescription('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setName(srv.name);
    setCategory(srv.category);
    setPricingModel(srv.pricingModel);
    setDefaultPricePKR(srv.defaultPricePKR ?? srv.basePricePKR ?? 0);
    setDescription(srv.description || '');
    setIsActive(srv.isActive !== false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedPrice = Number(defaultPricePKR) || 0;

    if (editingService) {
      await updateService({
        ...editingService,
        name: name.trim(),
        category: category.trim(),
        pricingModel,
        defaultPricePKR: parsedPrice,
        basePricePKR: parsedPrice,
        description: description.trim(),
        isActive
      });
      setEditingService(null);
    } else {
      await addService({
        name: name.trim(),
        category: category.trim(),
        pricingModel,
        defaultPricePKR: parsedPrice,
        basePricePKR: parsedPrice,
        description: description.trim(),
        isActive
      });
      setIsAddModalOpen(false);
    }
  };

  const handleDelete = (srv: ServiceItem) => {
    setDeleteConfirmService(srv);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmService) return;
    deleteService(deleteConfirmService.id);
    setDeleteConfirmService(null);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-medium text-[#0F172A] dark:text-white tracking-tight">
              Services &amp; Pricing Catalog
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalCount} Services
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Standard software packages, school ERPs, salon management systems, and pricing models in PKR.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Service</span>
        </button>
      </div>

      {/* 2. Compact Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Total Services
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-[#0F172A] dark:text-white">
              {totalCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300">
              Catalog
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            All configured software offerings
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Active in Quotes
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Active
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Available for sales proposals
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Inactive Services
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-medium text-[#0F172A] dark:text-white">
              {inactiveCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
              Archived
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Hidden from new sales quotations
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Avg Default Price
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-medium text-[#0F172A] dark:text-white truncate font-mono">
              {formatPKR(avgPrice)}
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Average baseline package rate
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Filter Catalog
            </span>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              ({filteredServices.length} of {totalCount})
            </span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search services or packages..."
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Model Filter */}
          <div>
            <select
              value={pricingModelFilter}
              onChange={e => setPricingModelFilter(e.target.value)}
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Pricing Models</option>
              {pricingModels && pricingModels.length > 0 ? (
                pricingModels.map(pm => (
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
              className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <Package className="w-10 h-10 mx-auto mb-3 text-[#64748B] opacity-50" />
          <h3 className="font-bold text-[#0F172A] dark:text-white text-sm">No services match your filters</h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your search criteria or resetting filters to see available services.'
              : 'Add your first software service or product package to start building client proposals.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleResetFilters}
              type="button"
              className="mt-4 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              type="button"
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors cursor-pointer"
            >
              + Add First Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(srv => {
            const price = srv.defaultPricePKR || srv.basePricePKR || 0;
            const isSrvActive = srv.isActive !== false;

            return (
              <div
                key={srv.id}
                className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                      {srv.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
                        {srv.pricingModel}
                      </span>
                      <button
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                        title={`Edit ${srv.name}`}
                        aria-label={`Edit ${srv.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(srv)}
                        className="p-1 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={`Delete ${srv.name}`}
                        aria-label={`Delete ${srv.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-medium text-base text-[#0F172A] dark:text-white tracking-tight">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                    {srv.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E5EAF1] dark:border-slate-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 block">
                      Default Price
                    </span>
                    <span className="text-lg font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatPKR(price)}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isSrvActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isSrvActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Service Modal */}
      <ModalShell
        isOpen={isAddModalOpen || !!editingService}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingService(null);
        }}
        size="lg"
        title={editingService ? `Edit Service: ${editingService.name}` : 'Add New Service / Package'}
        subtitle={editingService ? 'Update catalog pricing, billing model and deliverables' : 'Define a new software solution or service package in the enterprise catalog'}
        icon={<Package className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingService(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="service-admin-form"
              variant="primary"
              size="sm"
            >
              {editingService ? 'Save Service' : 'Create Service'}
            </Button>
          </div>
        }
      >
        <form id="service-admin-form" onSubmit={handleSave} className="space-y-4 text-xs">
          <FormField label="Service / Software Name" required>
            <Input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Education Management System (Premium)"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Category" required>
              <Input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="EDU ERP, Vertical SaaS, Web App..."
              />
            </FormField>

            <FormField label="Pricing Model" required>
              <Select
                value={pricingModel}
                onChange={e => setPricingModel(e.target.value as PricingModel)}
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
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Default Price (PKR)" required>
              <Input
                type="number"
                required
                min={0}
                value={defaultPricePKR}
                onChange={e => setDefaultPricePKR(e.target.value)}
                placeholder="e.g. 25000"
                className="font-mono font-medium"
              />
            </FormField>

            <FormField label="Catalog Status" required>
              <Select
                value={isActive ? 'true' : 'false'}
                onChange={e => setIsActive(e.target.value === 'true')}
              >
                <option value="true">Active (Visible in Quotes &amp; Proposals)</option>
                <option value="false">Inactive / Archived</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Description & Key Deliverables">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Features, modules included, user seats, warranty..."
            />
          </FormField>
        </form>
      </ModalShell>

      {/* 6. Destructive Confirm Dialog for Service Deletion */}
      <ConfirmDialog
        isOpen={!!deleteConfirmService}
        onClose={() => setDeleteConfirmService(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Service Offering"
        entityName={deleteConfirmService ? deleteConfirmService.name : ''}
        consequence="Deletes this service offering from the active services catalog. Existing historical proposals and closed client contracts will retain their recorded line items."
        confirmLabel="Delete Service"
        confirmVariant="danger"
      />
    </div>
  );
};
