import React, { useState, useEffect } from 'react';
import { useCRM } from '../../../context/CRMContext';
import {
  Trash2,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  CheckSquare,
  Square,
  Layers,
  Database,
  CheckCircle2,
  Lock,
  X
} from 'lucide-react';
import { deleteManagementApi, DeleteCategoryItem } from '../../../api';

interface SettingsDeleteManagementTabProps {
  onSaveSuccess: (message: string) => void;
}

export const SettingsDeleteManagementTab: React.FC<SettingsDeleteManagementTabProps> = ({
  onSaveSuccess
}) => {
  const { currentUser, refetchReferenceData, refetchOperationalData } = useCRM();

  const [categories, setCategories] = useState<DeleteCategoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch summary counts
  const fetchSummary = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await deleteManagementApi.getSummary();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load data category counts from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Super Admin security check
  if (currentUser?.role !== 'Super Admin') {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
          Super Admin Authorization Required
        </h3>
        <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
          Delete Management is strictly restricted to authenticated Super Administrators. Your current account role does not have authorization to perform database purges.
        </p>
      </div>
    );
  }

  // Toggle selection
  const toggleCategory = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Quick selections
  const handleSelectAll = () => {
    setSelectedIds(new Set(categories.map(c => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectOperational = () => {
    const operationalIds = ['leads', 'follow_ups', 'clients', 'proposals', 'incoming_leads', 'activity_logs', 'notifications'];
    setSelectedIds(new Set(operationalIds));
  };

  const handleSelectCatalogs = () => {
    const catalogIds = ['services', 'lead_sources', 'pricing_models', 'teams'];
    setSelectedIds(new Set(catalogIds));
  };

  // Selected items calculation
  const selectedItems = categories.filter(c => selectedIds.has(c.id));
  const totalSelectedRecords = selectedItems.reduce((acc, c) => acc + c.count, 0);

  // Open confirmation modal
  const handleOpenConfirm = () => {
    if (selectedIds.size === 0) return;
    setConfirmInput('');
    setDeleteError(null);
    setIsConfirmModalOpen(true);
  };

  // Execute purge
  const handleExecutePurge = async () => {
    if (confirmInput.trim() !== 'DELETE') {
      setDeleteError('You must type "DELETE" exactly to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteManagementApi.purge(Array.from(selectedIds), 'DELETE');
      setIsConfirmModalOpen(false);
      setSelectedIds(new Set());
      onSaveSuccess(res.message || 'Selected categories purged successfully.');

      // Refresh live system state
      await Promise.allSettled([
        fetchSummary(),
        refetchReferenceData(),
        refetchOperationalData ? refetchOperationalData() : Promise.resolve()
      ]);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to complete data deletion. Transaction was rolled back.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDangerBadge = (level: DeleteCategoryItem['dangerLevel']) => {
    switch (level) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP ADVISORY CARD */}
      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-xs flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Super Admin Data Purge &amp; Lifecycle Management
            </h3>
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              title="Refresh record counts"
              className="inline-flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 hover:text-amber-950 font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Counts</span>
            </button>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
            Select the categories below to permanently delete their records from PostgreSQL. All deletions are executed inside an atomic transaction with foreign-key cascades handled safely.
          </p>
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Core Protection Guarantee: Super Admin account(s), system Roles &amp; RBAC matrix, schema migrations, and core configuration are permanently protected and cannot be deleted.</span>
          </p>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* 2. CATEGORY SELECTION CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Deselect All
          </button>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={handleSelectOperational}
            className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-colors"
          >
            Operational Data Only
          </button>
          <button
            type="button"
            onClick={handleSelectCatalogs}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
          >
            Catalogs Only
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="font-bold text-[#0F172A] dark:text-white">{selectedIds.size}</span> of {categories.length} categories selected
          {selectedIds.size > 0 && (
            <span className="ml-2 font-semibold text-rose-600 dark:text-rose-400">
              ({totalSelectedRecords.toLocaleString()} records will be deleted)
            </span>
          )}
        </div>
      </div>

      {/* 3. CATEGORIES GRID */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B] mt-3 font-medium">Loading database categories and record counts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const isSelected = selectedIds.has(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`relative rounded-2xl border p-4 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-sm ring-1 ring-rose-400/40'
                    : 'bg-white dark:bg-slate-900 border-[#E5EAF1] dark:border-slate-800 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600 text-transparent'
                      }`}>
                        <CheckSquare className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                        {cat.name}
                      </h4>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getDangerBadge(cat.dangerLevel)}`}>
                      {cat.dangerLevel}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={cat.dependenciesNote}>
                    {cat.dependenciesNote}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-[#0F172A] dark:text-white">
                      {cat.count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">records</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BOTTOM ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-[#64748B] dark:text-slate-400">
          {selectedIds.size === 0 ? (
            <span>No data categories selected. Select one or more categories above to proceed.</span>
          ) : (
            <span className="text-slate-900 dark:text-white font-medium">
              Ready to delete <strong className="text-rose-600">{selectedIds.size}</strong> category(ies) containing <strong className="text-rose-600">{totalSelectedRecords.toLocaleString()}</strong> records.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={selectedIds.size === 0 || isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shadow-rose-600/20"
        >
          <Trash2 className="w-4 h-4" />
          <span>Permanently Delete Selected Data</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. STRONG CONFIRMATION MODAL WITH KEYWORD CHECK ('DELETE')                */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                    Confirm Permanent Data Deletion
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Irreversible PostgreSQL Transaction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deletion Scope Summary */}
            <div className="space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                You have chosen to permanently purge the following <strong>{selectedItems.length}</strong> categories:
              </p>

              <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 divide-y divide-slate-100 dark:divide-slate-800 space-y-2 text-xs">
                {selectedItems.map(item => (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {item.dependenciesNote}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-600 shrink-0 ml-2">
                      {item.count.toLocaleString()} rows
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <p className="font-bold">⚠️ Warning: Data cannot be recovered once purged!</p>
                <p className="text-[11px] leading-relaxed">
                  Total of <strong>{totalSelectedRecords.toLocaleString()}</strong> rows will be deleted. Protected Super Admin accounts and core system structures will remain intact.
                </p>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Type <span className="font-mono text-rose-600 px-1 py-0.5 bg-rose-50 dark:bg-rose-950 rounded">DELETE</span> to confirm permanent purge:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={confirmInput.trim() !== 'DELETE' || isDeleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shadow-rose-600/20"
              >
                {isDeleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isDeleting ? 'Purging Data...' : 'Confirm & Purge Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
