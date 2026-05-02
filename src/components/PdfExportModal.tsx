import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewTab } from './TabBar';

interface PdfExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (views: ViewTab[]) => void;
}

const ALL_VIEWS: ViewTab[] = ['calendar', 'gantt', 'timeline', 'list', 'kanban', 'agenda'];

export function PdfExportModal({ open, onClose, onExport }: PdfExportModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Set<ViewTab>>(new Set(ALL_VIEWS));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const toggle = (view: ViewTab) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(view)) next.delete(view);
      else next.add(view);
      return next;
    });
  };

  const handleExport = async () => {
    setGenerating(true);
    const views = ALL_VIEWS.filter((v) => selected.has(v));
    onExport(views);
    setGenerating(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="w-full max-w-md rounded-xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/50 dark:bg-gray-800"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('pdf.title')}
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          {t('pdf.selectViews')}
        </p>
        <div className="space-y-2">
          {ALL_VIEWS.map((view) => (
            <label key={view} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={selected.has(view)}
                onChange={() => toggle(view)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t(`tabs.${view}`)}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('pdf.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={selected.size === 0 || generating}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
          >
            {generating ? t('pdf.generating') : t('pdf.export')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
