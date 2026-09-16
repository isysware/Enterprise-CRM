import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { formatPKR } from '../../utils/formatters';

export const SourcesAdminView: React.FC = () => {
  const { sources, leads, addSource, updateSource, deleteSource } = useCRM();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('');

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
    if (leadCount > 0) {
      if (!window.confirm(`Warning: ${leadCount} leads are currently attributed to "${src}". Delete anyway?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete source "${src}"?`)) return;
    }
    deleteSource(src);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lead Ingestion &amp; Acquisition Sources
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {sources.length} Sources
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure acquisition channels (Meta Ads, Google Ads, WhatsApp, Referrals) and track conversion ROI.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Source</span>
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(src => {
          const sourceLeads = leads.filter(l => l.source === src);
          const count = sourceLeads.length;
          const converted = sourceLeads.filter(l => l.status === 'Converted').length;
          const totalValuePKR = sourceLeads.reduce((sum, l) => sum + (l.valuePKR || 0), 0);
          const conversionRate = count > 0 ? Math.round((converted / count) * 100) : 0;

          return (
            <div
              key={src}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {src}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(src)}
                      className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Source"
                      aria-label={`Edit source ${src}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(src)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Source"
                      aria-label={`Delete source ${src}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Leads</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Conversion</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{conversionRate}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pipeline Value</span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPKR(totalValuePKR)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {converted} Won
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Source Modal */}
      {(isAddModalOpen || editingSource) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingSource ? `Edit Source: ${editingSource}` : 'Add New Lead Channel / Source'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Name *
                </label>
                <input
                  type="text"
                  required
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  placeholder="e.g. Meta Ads, TikTok, Direct Walk-in..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSource(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
