import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 shrink-0">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-[38px] px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs transition-all duration-150 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-[#E5EAF1] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 flex items-center text-slate-400 dark:text-slate-500 shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
