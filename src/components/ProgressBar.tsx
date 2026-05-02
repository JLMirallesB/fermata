import type { ChecklistItem } from '../core/model';

interface ProgressBarProps {
  checklist: ChecklistItem[];
}

export function ProgressBar({ checklist }: ProgressBarProps) {
  if (checklist.length === 0) return null;

  const done = checklist.filter((c) => c.checked).length;
  const total = checklist.length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
        {done}/{total}
      </span>
    </div>
  );
}
