import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs transition-all duration-150 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed ${
          error
            ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
            : 'border-[#E5EAF1] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
