import React, { useState, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead, LeadSource, LeadStatus, Priority, LeadQuality } from '../../types';
import {
  parseCsvRow,
  normalizeLeadSource,
  normalizeLeadStatus,
  normalizePriority,
  normalizeLeadQuality,
  normalizeValuePKR
} from '../../utils/csvParser';
import {
  FileSpreadsheet,
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ isOpen, onClose }) => {
  const { importLeads, currentUser, canBulkImportExport } = useCRM();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default initial content using the simple format with a sample row
  const [csvText, setCsvText] = useState<string>(
    `Name,Phone,Business,Email,City,Service,ValuePKR,Source\nAli Khan,+923001234567,ABC Traders,ali@example.com,Lahore,ERP,150000,Referral\nSara Ahmed,+923219876543,Luxe Spa,sara@luxespa.pk,Karachi,POS Solution,95000,Social Ads`
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Download simple CSV template
  const handleDownloadTemplate = () => {
    const headers = 'Name,Phone,Business,Email,City,Service,ValuePKR,Source';
    const sampleRow = 'Ali Khan,+923001234567,ABC Traders,ali@example.com,Lahore,ERP,150000,Referral';
    const csvContent = `${headers}\n${sampleRow}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'crm_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Client-side file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFeedback({ type: 'error', message: 'Please select a valid .csv file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (typeof text === 'string') {
        setCsvText(text);
        setFileName(file.name);
        setFeedback(null);
      }
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Failed to read file from disk.' });
    };
    reader.readAsText(file);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // 8. Bulk import permission must fail closed
    if (!canBulkImportExport || !currentUser) {
      setFeedback({ type: 'error', message: 'You do not have permission to bulk import leads.' });
      return;
    }

    const trimmed = csvText.trim();
    if (!trimmed) {
      setFeedback({ type: 'error', message: 'CSV data is empty. Please upload or paste CSV records.' });
      return;
    }

    try {
      const rawLines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (rawLines.length === 0) {
        setFeedback({ type: 'error', message: 'No records found in CSV.' });
        return;
      }

      const newLeads: Partial<Lead>[] = [];
      let skippedCount = 0;

      // Detect if header indicates legacy 11-column format
      let isFileLegacyHeader = false;
      const firstLineParts = parseCsvRow(rawLines[0]);
      if (
        firstLineParts.length >= 8 &&
        firstLineParts[0]?.toLowerCase() === 'business' &&
        firstLineParts[1]?.toLowerCase() === 'name' &&
        firstLineParts[2]?.toLowerCase() === 'phone'
      ) {
        isFileLegacyHeader = true;
      }

      rawLines.forEach((line, index) => {
        const parts = parseCsvRow(line);

        // Skip header line
        if (
          index === 0 &&
          (parts[0]?.toLowerCase() === 'name' ||
           parts[0]?.toLowerCase() === 'business' ||
           parts[1]?.toLowerCase() === 'phone' ||
           parts[1]?.toLowerCase() === 'name')
        ) {
          return;
        }

        // Format detection: Legacy 11-column vs Simple 8-column format
        const isLegacyRow =
          isFileLegacyHeader ||
          (parts.length >= 10 &&
            (/new|contacted|follow-up|qualified|won|hold|cold|returned|converted|lost/i.test(parts[7] || '') ||
             /urgent|high|medium|low/i.test(parts[8] || '') ||
             /good|average|poor/i.test(parts[9] || '')));

        let name = '';
        let phone = '';
        let businessName = '';
        let email = '';
        let city = '';
        let service = '';
        let valuePKR = 0;
        let status: LeadStatus = 'New';
        let priority: Priority = 'Medium';
        let quality: LeadQuality = 'Average';
        let source: LeadSource = 'CSV Import';

        if (isLegacyRow) {
          // Legacy format: Business, Name, Phone, Email, City, Service, ValuePKR, Status, Priority, Quality, Source
          businessName = parts[0] || '';
          name = parts[1] || '';
          phone = parts[2] || '';
          email = parts[3] || '';
          city = parts[4] || '';
          service = parts[5] || '';
          valuePKR = normalizeValuePKR(parts[6]);
          status = normalizeLeadStatus(parts[7]);
          priority = normalizePriority(parts[8]);
          quality = normalizeLeadQuality(parts[9]);
          source = normalizeLeadSource(parts[10]);
        } else {
          // Simple format: Name, Phone, Business, Email, City, Service, ValuePKR, Source
          name = parts[0] || '';
          phone = parts[1] || '';
          businessName = parts[2] || '';
          email = parts[3] || '';
          city = parts[4] || '';
          service = parts[5] || '';
          valuePKR = normalizeValuePKR(parts[6]);
          source = normalizeLeadSource(parts[7]);
          status = 'New';
          priority = 'Medium';
          quality = 'Average';
        }

        // Validate required fields: Name and Phone
        if (!name.trim() || !phone.trim()) {
          skippedCount++;
          return;
        }

        newLeads.push({
          name: name.trim(),
          phone: phone.trim(),
          businessName: (businessName.trim() || name.trim()),
          email: email.trim(),
          city: city.trim(),
          services: service.trim() ? [service.trim()] : [],
          valuePKR,
          status,
          priority,
          quality,
          source,
          assignedToId: currentUser.id,
          // Explicitly do not invent follow-up or commercial pricing model
          nextFollowUpDate: undefined,
          nextFollowUpTime: undefined,
          nextFollowUpType: undefined,
          pricingModel: undefined,
          notes: 'Bulk imported lead record.',
          tags: ['Imported', 'CSV']
        });
      });

      if (newLeads.length === 0) {
        setFeedback({
          type: 'error',
          message: `No valid leads could be parsed. Ensure each row has both Name and Phone (${skippedCount} invalid rows skipped).`
        });
        return;
      }

      const importedCount = importLeads(newLeads);

      if (importedCount === 0) {
        setFeedback({
          type: 'error',
          message: 'Import failed. You may lack bulk import permissions or records were rejected by the system.'
        });
        return;
      }

      const successNotice = skippedCount > 0
        ? `Successfully imported ${importedCount} leads. (${skippedCount} malformed rows skipped due to missing Name or Phone)`
        : `Successfully imported all ${importedCount} leads into the active pipeline.`;

      setFeedback({ type: 'success', message: successNotice });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Error parsing CSV format. Please verify standard comma separation.'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import Leads (CSV)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk upload prospective leads with safe system defaults
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Notices */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleImport} className="space-y-4 text-xs">
          {/* Quick Actions & Field Guide */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                CSV Column Requirements
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Required: Name, Phone
                </span>
                <span className="text-slate-400">
                  Optional: Business, Email, City, Service, ValuePKR, Source
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-download-csv-template"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs text-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Download CSV Template</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />

              <button
                type="button"
                id="btn-upload-csv-file"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{fileName ? 'Change File' : 'Upload CSV File'}</span>
              </button>
            </div>
          </div>

          {fileName && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Loaded file: {fileName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFileName(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-emerald-700 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* CSV Text / Paste Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Preview / Paste CSV Data
              </label>
              <span className="text-[10px] text-slate-400">
                Comma-separated values with optional header
              </span>
            </div>
            <textarea
              rows={6}
              value={csvText}
              onChange={e => {
                setCsvText(e.target.value);
                setFileName(null);
              }}
              placeholder="Name,Phone,Business,Email,City,Service,ValuePKR,Source"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Defaults info banner */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-1">
            <span>
              Unsupplied attributes will default safely: <strong>Status: New</strong>, <strong>Priority: Medium</strong>, <strong>Quality: Average</strong>.
            </span>
            {!canBulkImportExport && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Note: Your current role does not permit bulk importing leads.
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Assignee: {currentUser?.name || 'Assigned Representative'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-import"
                disabled={!canBulkImportExport}
                className={`px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${
                  !canBulkImportExport
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Leads</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
