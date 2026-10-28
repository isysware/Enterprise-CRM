import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseClasses =
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]';

    // Variant classes
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 border border-[#2563EB]',
      secondary:
        'bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E5EAF1] shadow-xs focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-750',
      outline:
        'bg-transparent hover:bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30 hover:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 dark:hover:bg-blue-950/30',
      ghost:
        'bg-transparent hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] focus-visible:ring-2 focus-visible:ring-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500/40 border border-rose-600',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500/40 border border-emerald-600'
    };

    // Size classes
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
      md: 'h-9 px-3.5 text-xs font-semibold rounded-xl gap-2',
      lg: 'h-10 px-4 text-sm font-semibold rounded-xl gap-2',
      icon: 'h-9 w-9 p-0 rounded-xl',
      'icon-sm': 'h-8 w-8 p-0 rounded-lg'
    };

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            {size !== 'icon' && size !== 'icon-sm' && children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
