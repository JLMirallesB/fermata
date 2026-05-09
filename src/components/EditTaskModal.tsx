import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, ChecklistItem } from '../core/model';
import type { KanbanStatus } from '../core/status';
import { formatDate } from '../core/edit';
import { ChipInput } from './ChipInput';

interface EditTaskModalProps {
  task: Task | null;
  allTasks: Task[];
  allTags: string[];
  allAssignees: string[];
  tagColors: Record<string, string>;
  onSave: (task: Task, changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>) => void;
  onClose: () => void;
  onToggleChecklist: (item: ChecklistItem) => void;
  onSaveNotes: (task: Task, notes: string[]) => void;
  onSetDepends: (task: Task, depends: string[]) => void;
}

function dateToInputValue(d: Date): string {
  return formatDate(d);
}

export function EditTaskModal({ task, allTasks, allTags, allAssignees, tagColors, onSave, onClose, onToggleChecklist, onSaveNotes, onSetDepends }: EditTaskModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [assigneesList, setAssigneesList] = useState<string[]>([]);
  const [status, setStatus] = useState<KanbanStatus>('none');
  const [notesText, setNotesText] = useState('');

  const taskId = task?.id ?? null;

  useEffect(() => {
    if (task && taskId) {
      setTitle(task.title);
      setStartDate(dateToInputValue(task.start));
      setEndDate(dateToInputValue(task.end));
      const statusTags = new Set(['todo', 'doing', 'done']);
      setTagsList(task.tags.filter((tg) => !statusTags.has(tg.toLowerCase())));
      setAssigneesList([...task.assignees]);
      setStatus(task.status);
      setNotesText(task.notes.join('\n'));
      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }
    } else {
      dialogRef.current?.close();
    }
    // Only reset form fields when a different task is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

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

    const changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>> = {};

    if (title !== task.title) changes.title = title;
    if (startDate !== dateToInputValue(task.start)) changes.start = new Date(startDate + 'T00:00:00');
    if (endDate !== dateToInputValue(task.end)) changes.end = new Date(endDate + 'T00:00:00');
    if (JSON.stringify(tagsList) !== JSON.stringify(originalNonStatusTags)) changes.tags = tagsList;
    if (JSON.stringify(assigneesList) !== JSON.stringify(task.assignees)) changes.assignees = assigneesList;
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
            <ChipInput
              value={tagsList}
              onChange={setTagsList}
              suggestions={allTags}
              placeholder={t('modal.tagsHelp')}
              chipColor={(tag) => tagColors[tag]}
            />
          </div>
          <div>
            <label className={labelClass}>{t('modal.assignees')}</label>
            <ChipInput
              value={assigneesList}
              onChange={setAssigneesList}
              suggestions={allAssignees}
              placeholder={t('modal.assigneesHelp')}
            />
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
          {task.checklist.length > 0 && (
            <div>
              <label className={labelClass}>
                {t('modal.checklist')}
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  {task.checklist.filter((c) => c.checked).length}/{task.checklist.length}
                </span>
              </label>
              <div className="mt-1 space-y-1">
                {task.checklist.map((item, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggleChecklist(item)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={item.checked ? 'line-through opacity-60' : ''}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className={labelClass}>{t('modal.notes')}</label>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={() => {
                if (!task) return;
                const newNotes = notesText.split('\n').map((l) => l.trim()).filter(Boolean);
                if (JSON.stringify(newNotes) !== JSON.stringify(task.notes)) {
                  onSaveNotes(task, newNotes);
                }
              }}
              rows={2}
              className={inputClass}
              placeholder={t('modal.notesHelp')}
            />
          </div>
          <div>
            <label className={labelClass}>{t('modal.depends')}</label>
            {(() => {
              const available = allTasks.filter((t) => t.eventId && t.id !== task.id);
              if (available.length === 0) {
                return <p className="text-xs text-gray-400 dark:text-gray-500">{t('modal.dependsNone')}</p>;
              }
              const depIds = task.depends;
              const dependsOn = allTasks.filter((t) => t.eventId && depIds.includes(t.eventId));
              const dependedBy = allTasks.filter((t) => task.eventId && t.depends.includes(task.eventId));
              return (
                <div className="space-y-2">
                  {dependsOn.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dependsOn.map((dep) => (
                        <span key={dep.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {dep.title}
                          {dep.end > task.start && (
                            <span className="text-red-500" title={t('modal.dependsConflict')}>!</span>
                          )}
                          <button
                            onClick={() => onSetDepends(task, depIds.filter((d) => d !== dep.eventId))}
                            className="ml-0.5 text-indigo-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {dependedBy.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('modal.dependedBy')}: {dependedBy.map((d) => d.title).join(', ')}
                    </div>
                  )}
                  <select
                    className={inputClass}
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId || !task) return;
                      onSetDepends(task, [...depIds, selectedId]);
                    }}
                  >
                    <option value="">{t('modal.dependsAdd')}</option>
                    {available.filter((at) => !depIds.includes(at.eventId!)).map((at) => (
                      <option key={at.id} value={at.eventId!}>{at.title}</option>
                    ))}
                  </select>
                </div>
              );
            })()}
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
