import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import type { KanbanStatus } from '../core/status';
import { formatDate } from '../core/edit';

interface EditTaskModalProps {
  task: Task | null;
  onSave: (task: Task, changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>) => void;
  onClose: () => void;
}

function dateToInputValue(d: Date): string {
  return formatDate(d);
}

export function EditTaskModal({ task, onSave, onClose }: EditTaskModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [assignees, setAssignees] = useState('');
  const [status, setStatus] = useState<KanbanStatus>('none');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStartDate(dateToInputValue(task.start));
      setEndDate(dateToInputValue(task.end));
      const statusTags = new Set(['todo', 'doing', 'done']);
      setTags(task.tags.filter((tg) => !statusTags.has(tg.toLowerCase())).join(', '));
      setAssignees(task.assignees.join(', '));
      setStatus(task.status);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [task]);

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

  const handleSave = () => {
    if (!task) return;
    const statusTags = new Set(['todo', 'doing', 'done']);
    const originalNonStatusTags = task.tags.filter((tg) => !statusTags.has(tg.toLowerCase()));
    const newNonStatusTags = tags.split(',').map((s) => s.trim()).filter(Boolean);
    const newAssignees = assignees.split(',').map((s) => s.trim()).filter(Boolean);

    const changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>> = {};

    if (title !== task.title) changes.title = title;
    if (startDate !== dateToInputValue(task.start)) changes.start = new Date(startDate + 'T00:00:00');
    if (endDate !== dateToInputValue(task.end)) changes.end = new Date(endDate + 'T00:00:00');
    if (JSON.stringify(newNonStatusTags) !== JSON.stringify(originalNonStatusTags)) changes.tags = newNonStatusTags;
    if (JSON.stringify(newAssignees) !== JSON.stringify(task.assignees)) changes.assignees = newAssignees;
    if (status !== task.status) changes.status = status;

    onSave(task, changes);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!task) return null;

  const inputClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="w-full max-w-lg rounded-xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/50 dark:bg-gray-800"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('modal.editTask')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('modal.title')}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('modal.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('modal.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('modal.tags')}</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder={t('modal.tagsHelp')} />
          </div>
          <div>
            <label className={labelClass}>{t('modal.assignees')}</label>
            <input type="text" value={assignees} onChange={(e) => setAssignees(e.target.value)} className={inputClass} placeholder={t('modal.assigneesHelp')} />
          </div>
          <div>
            <label className={labelClass}>{t('modal.status')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as KanbanStatus)} className={inputClass}>
              <option value="none">{t('status.none')}</option>
              <option value="todo">{t('status.todo')}</option>
              <option value="doing">{t('status.doing')}</option>
              <option value="done">{t('status.done')}</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('modal.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
          >
            {t('modal.save')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
