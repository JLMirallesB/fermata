import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import { formatDate } from '../core/edit';
import { ProgressBar } from '../components/ProgressBar';
import { TaskTooltip } from '../components/TaskTooltip';

interface TimelineViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function TimelineView({ tasks, tagColors, onTaskClick }: TimelineViewProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ca-ES-valencia' ? 'ca' : i18n.language;

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [tasks],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; tasks: Task[] }>();
    for (const task of sorted) {
      const key = monthKey(task.start);
      if (!map.has(key)) {
        map.set(key, { label: formatMonthLabel(task.start, locale), tasks: [] });
      }
      map.get(key)!.tasks.push(task);
    }
    return [...map.values()];
  }, [sorted, locale]);

  const todayKey = monthKey(new Date());
  const todayStr = formatDate(new Date());

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        No tasks
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4 py-8">
      <div className="relative mx-auto max-w-3xl">
        {/* Central line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700" />

        {grouped.map((group) => {
          const isCurrentMonth = monthKey(group.tasks[0].start) === todayKey;
          return (
            <div key={group.label} className="mb-8">
              {/* Month label */}
              <div className="relative mb-6 flex justify-center">
                <span className={`relative z-10 rounded-full px-4 py-1 text-sm font-semibold ${
                  isCurrentMonth
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {group.label}
                </span>
              </div>

              {/* Tasks alternating left/right */}
              {group.tasks.map((task, i) => {
                const isLeft = i % 2 === 0;
                const color = task.color ?? tagColors[task.tags[0]] ?? '#6366f1';
                const isToday = formatDate(task.start) === todayStr;

                return (
                  <div
                    key={task.id}
                    className={`relative mb-4 flex items-start ${isLeft ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* Dot on the center line */}
                    <div
                      className={`absolute left-1/2 top-4 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white dark:border-gray-900 ${
                        isToday ? 'ring-2 ring-red-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />

                    {/* Card */}
                    <TaskTooltip task={task}>
                      <div
                        onClick={() => onTaskClick(task)}
                        className={`w-[calc(50%-24px)] cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 ${
                          isLeft ? 'mr-auto text-right' : 'ml-auto text-left'
                        }`}
                        style={{ borderColor: color, borderLeftWidth: isLeft ? 1 : 3, borderRightWidth: isLeft ? 3 : 1 }}
                      >
                        <div className={`flex items-center gap-2 ${isLeft ? 'flex-row-reverse' : ''}`}>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {task.milestone ? '◆ ' : ''}{task.title}
                          </span>
                          {task.notes.length > 0 && <span className="text-gray-400">💬</span>}
                        </div>

                        <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${isLeft ? 'text-right' : 'text-left'}`}>
                          {formatDate(task.start)}
                          {!task.milestone && ` — ${formatDate(task.end)}`}
                        </div>

                        {task.section && (
                          <div className={`mt-1 text-xs text-gray-400 dark:text-gray-500 ${isLeft ? 'text-right' : 'text-left'}`}>
                            {task.section}
                          </div>
                        )}

                        {task.assignees.length > 0 && (
                          <div className={`mt-1 text-xs text-gray-400 dark:text-gray-500 ${isLeft ? 'text-right' : 'text-left'}`}>
                            {task.assignees.join(', ')}
                          </div>
                        )}

                        {task.checklist.length > 0 && (
                          <div className={`mt-1.5 ${isLeft ? 'flex justify-end' : ''}`}>
                            <ProgressBar checklist={task.checklist} />
                          </div>
                        )}

                        {task.tags.length > 0 && (
                          <div className={`mt-2 flex flex-wrap gap-1 ${isLeft ? 'justify-end' : ''}`}>
                            {task.tags.filter((tg) => !['todo', 'doing', 'done'].includes(tg.toLowerCase())).map((tag) => (
                              <span
                                key={tag}
                                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                style={{ backgroundColor: tagColors[tag] ?? '#6b7280' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </TaskTooltip>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Today marker */}
        <div className="relative flex justify-center">
          <span className="relative z-10 rounded-full bg-red-500 px-3 py-0.5 text-xs font-semibold text-white">
            {todayStr}
          </span>
        </div>
      </div>
    </div>
  );
}
