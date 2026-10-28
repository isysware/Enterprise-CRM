import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  closeOnEscape?: boolean;
  className?: string;
  bodyClassName?: string;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  closeOnEscape = true,
  className = '',
  bodyClassName = ''
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<DrawerSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen ${sizeClasses[size]} bg-white dark:bg-slate-900 border-l border-[#E5EAF1] dark:border-slate-800 shadow-2xl flex flex-col animate-slideLeft ${className}`}
        >
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-[#E5EAF1] dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <div className="text-xs text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className={`p-5 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-850/80 border-t border-[#E5EAF1] dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
