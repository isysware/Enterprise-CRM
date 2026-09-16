import React, { useEffect, useMemo } from 'react';
import { PricingModelField } from '../../types';
import { DollarSign, Tag, Info, Hash, Type, ChevronDown, Calendar, CheckSquare } from 'lucide-react';
import { formatPKR } from '../../utils/formatters';

interface DynamicPricingFieldsFormProps {
  fields?: PricingModelField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  currencySymbol?: string;
  onTotalChange?: (total: number) => void;
  gridCols?: 2 | 3;
}

export const DynamicPricingFieldsForm: React.FC<DynamicPricingFieldsFormProps> = ({
  fields = [],
  values,
  onChange,
  currencySymbol = 'Rs.',
  onTotalChange,
  gridCols = 3
}) => {
  // Calculate total whenever values or fields change
  const totalValue = useMemo(() => {
    if (!fields || fields.length === 0) return 0;
    return fields.reduce((sum, field) => {
      if (field.includeInTotal) {
        const val = Number(values[field.key]) || 0;
        return sum + val;
      }
      return sum;
    }, 0);
  }, [fields, values]);

  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(totalValue);
    }
  }, [totalValue, onTotalChange]);

  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-1">
      <div className={`grid grid-cols-1 ${gridCols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'} gap-3.5`}>
        {fields.map(field => {
          const rawVal = values[field.key];
          const val = rawVal !== undefined ? rawVal : (field.defaultValue !== undefined ? field.defaultValue : '');

          if (field.type === 'currency' || field.type === 'number') {
            return (
              <div key={field.id || field.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{field.label}</span>
                    {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
                  </label>
                  {field.includeInTotal && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded">
                      In Total
                    </span>
                  )}
                </div>

                <div className="relative rounded-xl shadow-xs">
                  {field.type === 'currency' && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      {currencySymbol}
                    </div>
                  )}
                  <input
                    type="number"
                    min={0}
                    value={val === '' ? '' : val}
                    onChange={e => {
                      const num = e.target.value === '' ? '' : Number(e.target.value);
                      onChange(field.key, num);
                    }}
                    placeholder={field.placeholder || (field.type === 'currency' ? 'e.g. 15000' : '0')}
                    required={field.isRequired}
                    className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-3 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                      field.type === 'currency' ? 'pl-8' : 'pl-3'
                    }`}
                  />
                </div>
              </div>
            );
          }

          if (field.type === 'dropdown') {
            const options = field.options && field.options.length > 0 ? field.options : ['Standard', 'Premium', 'Enterprise'];
            return (
              <div key={field.id || field.key} className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{field.label}</span>
                  {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={val || options[0]}
                    onChange={e => onChange(field.key, e.target.value)}
                    required={field.isRequired}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                  >
                    {options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            );
          }

          if (field.type === 'date') {
            return (
              <div key={field.id || field.key} className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{field.label}</span>
                  {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
                </label>
                <input
                  type="date"
                  value={val || ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  required={field.isRequired}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            );
          }

          // Default text input
          return (
            <div key={field.id || field.key} className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{field.label}</span>
                {field.isRequired && <span className="text-rose-500 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={val || ''}
                onChange={e => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || 'Enter details...'}
                required={field.isRequired}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
