import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import type { KanbanStatus } from '../core/status';

interface KanbanViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

const COLUMNS: KanbanStatus[] = ['todo', 'doing', 'done', 'none'];

export function KanbanView({ tasks, tagColors, onTaskClick }: KanbanViewProps) {
  const { t } = useTranslation();

  const grouped = COLUMNS.reduce<Record<KanbanStatus, Task[]>>((acc, col) => {
    acc[col] = tasks.filter((task) => task.status === col);
    return acc;
  }, { todo: [], doing: [], done: [], none: [] });

  const columnColors: Record<KanbanStatus, string> = {
    todo: 'border-amber-400',
    doing: 'border-indigo-400',
    done: 'border-green-400',
    none: 'border-gray-300 dark:border-gray-600',
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => (
        <div
          key={col}
          className={`flex w-72 shrink-0 flex-col rounded-lg border-t-4 bg-gray-50 dark:bg-gray-800/50 ${columnColors[col]}`}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t(`kanban.${col}`)}
            </h3>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {grouped[col].length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
            {grouped[col].map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start gap-2">
                  {task.color && (
                    <span
                      className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {task.milestone ? '◆ ' : ''}{task.title}
                  </span>
                </div>
                {task.section && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {task.section}
                  </div>
                )}
                {task.assignees.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {task.assignees.join(', ')}
                  </div>
                )}
                {task.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {task.tags.filter((tg) => !['todo', 'doing', 'done'].includes(tg.toLowerCase())).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: tagColors[tag] ?? '#6b7280' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
