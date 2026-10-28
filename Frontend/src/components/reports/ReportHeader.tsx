import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Shield,
  CheckCircle2,
  Info
} from 'lucide-react';
import { UserRole } from '../../types';

interface ReportHeaderProps {
  title: string;
  description: string;
  userRole?: UserRole;
  filterSummary?: string[];
  recordCount?: number;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
  onExportPDF?: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  description,
  userRole,
  filterSummary = [],
  recordCount,
  onExportExcel,
  onExportCSV,
  onPrint,
  onExportPDF
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      setFeedback('Generating print view for PDF export. In dialog, select "Save as PDF".');
      setTimeout(() => setFeedback(null), 3500);
      window.print();
    }
  };

  const handleExportExcel = () => {
    if (onExportExcel) {
      onExportExcel();
      setFeedback('Excel (.xlsx) report generated and downloaded.');
      setTimeout(() => setFeedback(null), 3000);
    } else if (onExportCSV) {
      onExportCSV();
      setFeedback('Report spreadsheet downloaded.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 space-y-3 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title & Scope Badge */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {title}
            </h1>
            {userRole && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Shield className="w-3 h-3 text-blue-500" />
                <span>{userRole} Scope</span>
              </span>
            )}
            {recordCount !== undefined && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {recordCount} records
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>

        {/* Export Controls Toolbar: [ Excel ] [ PDF ] [ Print ] */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleExportExcel}
            title="Download Real Excel (.xlsx) Spreadsheet"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            title="Export Clean PDF Document"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>PDF</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Formatted Report"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-[#E5EAF1] dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Active Filter Summary Strip */}
      {filterSummary.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">Active Filters:</span>
          {filterSummary.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
