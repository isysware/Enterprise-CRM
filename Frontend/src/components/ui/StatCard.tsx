import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type StatCardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  change?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  change,
  onClick,
  className = ''
}) => {
  const iconVariants: Record<StatCardVariant, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    danger: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
  };

  return (
    <div
      onClick={onClick}
      className={`h-[114px] bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-[#2563EB] dark:hover:border-slate-700' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">
          {title}
        </span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconVariants[variant]}`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-medium text-[#0F172A] dark:text-white leading-none tracking-tight truncate">
            {value}
          </div>

          {change && (
            <div
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0 ${
                change.isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
              }`}
            >
              {change.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{change.value}</span>
            </div>
          )}
        </div>

        {(subtitle || change?.label) && (
          <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
            {change?.label || subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
