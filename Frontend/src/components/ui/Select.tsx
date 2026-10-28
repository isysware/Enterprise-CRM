import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, leftIcon, options, children, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 shrink-0">
            {leftIcon}
          </div>
        )}

        <select
          ref={ref}
          disabled={disabled}
          className={`w-full h-[38px] px-3 py-2 pr-9 text-xs font-medium text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl appearance-none shadow-xs transition-all duration-150 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${
            leftIcon ? 'pl-9' : ''
          } ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-[#E5EAF1] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 shrink-0">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
