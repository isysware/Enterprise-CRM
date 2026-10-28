import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button, ButtonVariant } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  entityName?: string;
  consequence?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant | string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityName,
  consequence,
  description,
  confirmLabel = 'Delete Record',
  cancelLabel = 'Cancel',
  variant,
  confirmVariant = 'danger',
  isLoading = false
}) => {
  const resolvedConfirmVariant = (confirmVariant || (variant === 'danger' ? 'danger' : 'primary')) as ButtonVariant;
  const message = description || consequence;

  const footer = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClose}
        disabled={isLoading}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={resolvedConfirmVariant}
        size="sm"
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmLabel}
      </Button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={title}
      icon={<AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
      footer={footer}
    >
      <div className="space-y-3.5 text-xs">
        <p className="text-[#64748B] dark:text-slate-400">
          Are you sure you want to proceed with this operation?
        </p>

        {entityName && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[#E5EAF1] dark:border-slate-700">
            <span className="text-[10px] uppercase font-bold text-[#64748B] dark:text-slate-400 block tracking-wider">
              Target Record
            </span>
            <span className="font-extrabold text-[#0F172A] dark:text-white text-sm block mt-0.5 truncate">
              {entityName}
            </span>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
            <p className="font-medium text-xs leading-relaxed">
              {message}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
