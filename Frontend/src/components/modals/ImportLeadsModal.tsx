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
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check
} from 'lucide-react';
import { ModalShell, FormField, Textarea, Button } from '../ui';

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
  const [isImporting, setIsImporting] = useState(false);

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

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'CSV file size exceeds 5MB limit.' });
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
    if (isImporting) return;
    setFeedback(null);

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

        if (
          index === 0 &&
          (parts[0]?.toLowerCase() === 'name' ||
           parts[0]?.toLowerCase() === 'business' ||
           parts[1]?.toLowerCase() === 'phone' ||
           parts[1]?.toLowerCase() === 'name')
        ) {
          return;
        }

        const isLegacyRow =
          isFileLegacyHeader ||
          (parts.length >= 10 &&
            (/new|contacted|follow-up|qualified|won|hold|cold|returned|converted|lost/i.test(parts[7] || '') ||
             /urgent|high|medium|low/i.test(parts[8] || '') ||
             /good|average|poor/i.test(parts[9] || '')));

        if (isLegacyRow) {
          const businessName = parts[0]?.trim() || '';
          const name = parts[1]?.trim() || '';
          const phone = parts[2]?.trim() || '';
          const email = parts[3]?.trim() || '';
          const city = parts[4]?.trim() || 'Lahore';
          const servicesRaw = parts[5]?.trim() || '';
          const valuePKRRaw = parts[6]?.trim() || '';
          const statusRaw = parts[7]?.trim() || '';
          const priorityRaw = parts[8]?.trim() || '';
          const qualityRaw = parts[9]?.trim() || '';
          const sourceRaw = parts[10]?.trim() || '';

          if (!name || !phone) {
            skippedCount++;
            return;
          }

          const services = servicesRaw
            ? servicesRaw.split(';').map(s => s.trim()).filter(Boolean)
            : ['Custom Software Development'];

          const source = normalizeLeadSource(sourceRaw);
          const status = normalizeLeadStatus(statusRaw);
          const priority = normalizePriority(priorityRaw);
          const quality = normalizeLeadQuality(qualityRaw);
          const valuePKR = normalizeValuePKR(valuePKRRaw) || 50000;

          newLeads.push({
            name,
            businessName: businessName || `${name}'s Business`,
            phone,
            email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
            city,
            services,
            valuePKR,
            source,
            status,
            priority,
            quality,
            assignedToId: currentUser.id,
            assignedToName: currentUser.name,
            teamId: currentUser.teamId || '',
            teamName: currentUser.teamName || '',
            budgetType: 'No Budget Discussed',
            notes: 'Imported via CSV file (legacy format)'
          });
        } else {
          const name = parts[0]?.trim() || '';
          const phone = parts[1]?.trim() || '';
          const businessName = parts[2]?.trim() || '';
          const email = parts[3]?.trim() || '';
          const city = parts[4]?.trim() || 'Lahore';
          const servicesRaw = parts[5]?.trim() || '';
          const valuePKRRaw = parts[6]?.trim() || '';
          const sourceRaw = parts[7]?.trim() || '';

          if (!name || !phone) {
            skippedCount++;
            return;
          }

          const services = servicesRaw
            ? servicesRaw.split(';').map(s => s.trim()).filter(Boolean)
            : ['Custom Software Development'];

          const source = normalizeLeadSource(sourceRaw);
          const valuePKR = normalizeValuePKR(valuePKRRaw) || 50000;

          newLeads.push({
            name,
            phone,
            businessName: businessName || `${name}'s Business`,
            email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
            city,
            services,
            valuePKR,
            source,
            status: 'New',
            priority: 'Medium',
            quality: 'Average',
            assignedToId: currentUser.id,
            assignedToName: currentUser.name,
            teamId: currentUser.teamId || '',
            teamName: currentUser.teamName || '',
            budgetType: 'No Budget Discussed',
            notes: 'Imported via CSV file'
          });
        }
      });

      if (newLeads.length === 0) {
        setFeedback({
          type: 'error',
          message: 'No valid lead rows could be extracted. Required columns: Name and Phone.'
        });
        return;
      }

      importLeads(newLeads);
      setFeedback({
        type: 'success',
        message: `Successfully imported ${newLeads.length} leads${
          skippedCount > 0 ? ` (${skippedCount} invalid rows were skipped)` : ''
        }.`
      });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Import failed: ${err.message || 'Check CSV formatting.'}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <span className="text-xs text-[#64748B] dark:text-slate-400">
        Assigned Rep: <strong>{currentUser?.name || 'Current User'}</strong>
      </span>

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
          onClick={handleImport}
          disabled={!canBulkImportExport || isImporting}
          leftIcon={<Upload className="w-4 h-4" />}
        >
          {isImporting ? 'Importing...' : 'Import Leads'}
        </Button>
      </div>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Bulk Import Leads from CSV"
      subtitle="Import prospective customer accounts and inquiries directly into the CRM"
      icon={<FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />}
      footer={modalFooter}
    >
      <form onSubmit={handleImport} className="space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
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

        {/* Template & Upload Controls */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-[#E5EAF1] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">
              CSV Format Specification
            </h4>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
              Required columns: <strong className="text-[#0F172A] dark:text-slate-200">Name, Phone</strong>. Optional: Business, Email, City, Service, ValuePKR, Source.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5 text-[#2563EB]" />}
            >
              CSV Template
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-3.5 h-3.5 text-[#2563EB]" />}
            >
              {fileName ? 'Change File' : 'Upload File'}
            </Button>
          </div>
        </div>

        {fileName && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4 text-emerald-600" />
              Loaded file: {fileName}
            </span>
            <button
              type="button"
              onClick={() => {
                setFileName(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-emerald-700 hover:underline cursor-pointer font-semibold"
            >
              Clear
            </button>
          </div>
        )}

        <FormField
          label="Preview / Paste CSV Data"
          hint="Comma-separated values with header"
        >
          <Textarea
            rows={7}
            value={csvText}
            onChange={e => {
              setCsvText(e.target.value);
              setFileName(null);
            }}
            placeholder="Name,Phone,Business,Email,City,Service,ValuePKR,Source"
            className="font-mono text-xs"
          />
        </FormField>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs text-[#64748B] dark:text-slate-400 border border-[#E5EAF1] dark:border-slate-800 flex flex-col gap-1">
          <span>
            Unsupplied fields will be safely initialized: <strong>Status: New</strong>, <strong>Priority: Medium</strong>, <strong>Quality: Average</strong>.
          </span>
          {!canBulkImportExport && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Notice: Your user role currently does not possess bulk import authorization.
            </span>
          )}
        </div>
      </form>
    </ModalShell>
  );
};
