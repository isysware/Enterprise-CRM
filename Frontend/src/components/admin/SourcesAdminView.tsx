import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Search,
  Share2,
  Globe,
  MessageCircle,
  Users,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ModalShell,
  FormField,
  Input,
  Button,
  ConfirmDialog
} from '../ui';

export const SourcesAdminView: React.FC = () => {
  const { sources, leads, addSource, updateSource, deleteSource } = useCRM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [deleteConfirmSource, setDeleteConfirmSource] = useState<{ name: string; leadCount: number } | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const q = searchQuery.toLowerCase().trim();
    return sources.filter(s => s.toLowerCase().includes(q));
  }, [sources, searchQuery]);

  // Operational master data metrics
  const totalSourcesCount = sources.length;
  const activeSourcesCount = sources.filter(s => leads.some(l => l.source === s)).length;
  const unusedSourcesCount = totalSourcesCount - activeSourcesCount;
  const totalAttributedLeads = leads.length;

  const handleOpenAdd = () => {
    setEditingSource(null);
    setSourceName('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (src: string) => {
    setEditingSource(src);
    setSourceName(src);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) return;

    if (editingSource) {
      updateSource(editingSource, sourceName.trim());
      setEditingSource(null);
    } else {
      addSource(sourceName.trim());
      setIsAddModalOpen(false);
    }
  };

  const handleDelete = (src: string) => {
    const leadCount = leads.filter(l => l.source === src).length;
    setDeleteConfirmSource({ name: src, leadCount });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmSource) return;
    deleteSource(deleteConfirmSource.name);
    setDeleteConfirmSource(null);
  };

  // Helper to pick an appropriate icon for common source channels
  const getSourceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('whatsapp') || lower.includes('chat')) {
      return MessageCircle;
    }
    if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram') || lower.includes('social')) {
      return Share2;
    }
    if (lower.includes('google') || lower.includes('web') || lower.includes('site') || lower.includes('seo')) {
      return Globe;
    }
    if (lower.includes('referral') || lower.includes('partner') || lower.includes('network')) {
      return Users;
    }
    return Megaphone;
  };

  // Channel classification helper for master data context
  const getChannelCategory = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('whatsapp') || lower.includes('meta') || lower.includes('google') || lower.includes('ads')) {
      return 'Digital Marketing / Paid';
    }
    if (lower.includes('referral') || lower.includes('network') || lower.includes('partner')) {
      return 'Partnership & Referral';
    }
    if (lower.includes('walk-in') || lower.includes('direct') || lower.includes('call')) {
      return 'Direct Outreach';
    }
    return 'General Inbound Channel';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Lead Sources
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalSourcesCount} Channels
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Manage operational lead acquisition channels and master ingestion categories.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Source</span>
        </button>
      </div>

      {/* 2. Operational Master Data Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Total Sources
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {totalSourcesCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300">
              Catalog
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Configured acquisition master channels
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Active in Pipeline
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {activeSourcesCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              In Use
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Channels with linked prospect records
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Unused Channels
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-700 dark:text-slate-200">
              {unusedSourcesCount}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
              Available
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Available channels with zero linked leads
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Linked Leads
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
              {totalAttributedLeads}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              Records
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">
            Total CRM leads mapped to channels
          </p>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search lead sources..."
            className="w-full bg-[#F7F9FC] dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] font-bold cursor-pointer self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Search</span>
          </button>
        )}
      </div>

      {/* 4. Sources Master Directory Cards Grid */}
      {filteredSources.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-[#64748B] opacity-50" />
          <h3 className="font-bold text-[#0F172A] dark:text-white text-sm">No lead sources found</h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery.trim()
              ? 'No lead sources match your search query. Try clearing the filter.'
              : 'Add your first lead source to start tracking customer acquisition channels.'}
          </p>
          {searchQuery.trim() ? (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              className="mt-4 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              type="button"
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors cursor-pointer"
            >
              + Add First Source
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map(src => {
            const count = leads.filter(l => l.source === src).length;
            const isAssigned = count > 0;
            const Icon = getSourceIcon(src);
            const category = getChannelCategory(src);

            return (
              <div
                key={src}
                className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-[#0F172A] dark:text-white block">
                          {src}
                        </span>
                        <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">
                          {category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(src)}
                        className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={`Edit ${src}`}
                        aria-label={`Edit ${src}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(src)}
                        className="p-1 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={`Delete ${src}`}
                        aria-label={`Delete ${src}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
                      Attributed Leads
                    </span>
                    <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                      {count}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                      isAssigned
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isAssigned ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>In Use ({count} Leads)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                        <span>Unassigned / Safe to Delete</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Source Modal */}
      <ModalShell
        isOpen={isAddModalOpen || !!editingSource}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSource(null);
        }}
        size="md"
        title={editingSource ? `Edit Source: ${editingSource}` : 'Add New Lead Channel / Source'}
        subtitle={editingSource ? 'Update lead channel label in the master sources catalog' : 'Register a new marketing channel or referral origin for lead attribution'}
        icon={<Megaphone className="w-5 h-5 text-[#2563EB]" />}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingSource(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="source-admin-form"
              variant="primary"
              size="sm"
            >
              {editingSource ? 'Save Source' : 'Create Source'}
            </Button>
          </div>
        }
      >
        <form id="source-admin-form" onSubmit={handleSave} className="space-y-4 text-xs">
          <FormField label="Source Channel Name" required helperText="e.g. Meta Ads, Google Ads, WhatsApp, Direct Walk-in...">
            <Input
              type="text"
              required
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="e.g. Meta Ads, Google Ads, WhatsApp, Direct Walk-in..."
            />
          </FormField>
        </form>
      </ModalShell>

      {/* 6. Destructive Confirm Dialog for Source Deletion */}
      <ConfirmDialog
        isOpen={!!deleteConfirmSource}
        onClose={() => setDeleteConfirmSource(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Lead Source"
        entityName={deleteConfirmSource ? deleteConfirmSource.name : ''}
        consequence={
          deleteConfirmSource?.leadCount && deleteConfirmSource.leadCount > 0
            ? `Warning: ${deleteConfirmSource.leadCount} lead(s) are currently attributed to "${deleteConfirmSource.name}". Deleting this master channel may affect record references and historical metrics.`
            : 'Removes this unused acquisition channel from the master sources catalog.'
        }
        confirmLabel="Delete Source"
        confirmVariant="danger"
      />
    </div>
  );
};
