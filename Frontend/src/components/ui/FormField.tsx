import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  helperText,
  children,
  className = '',
  id
}) => {
  const effectiveHint = hint || helperText;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="flex items-center justify-between text-xs font-semibold text-[#0F172A] dark:text-slate-200"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </span>
          {effectiveHint && !error && (
            <span className="text-[11px] font-normal text-[#64748B] dark:text-slate-400">
              {effectiveHint}
            </span>
          )}
        </label>
      )}

      {children}

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 pt-0.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
