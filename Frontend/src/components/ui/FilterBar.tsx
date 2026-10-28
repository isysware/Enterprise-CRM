import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onClearFilters?: () => void;
  activeFilterCount?: number;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  actions,
  onClearFilters,
  activeFilterCount = 0,
  className = ''
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-[#E5EAF1] dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
        {onSearchChange !== undefined && (
          <div className="w-full sm:w-64 lg:w-72 shrink-0">
            <Input
              value={searchValue || ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={
                searchValue ? (
                  <button
                    onClick={() => onSearchChange('')}
                    className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>
        )}

        {filters && (
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {filters}
          </div>
        )}

        {activeFilterCount > 0 && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<X className="w-3.5 h-3.5" />}
            className="text-xs text-[#64748B] hover:text-rose-600"
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
