import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import { formatDate } from '../core/edit';
import { ProgressBar } from '../components/ProgressBar';
import { TaskTooltip } from '../components/TaskTooltip';
import { ColorDots } from '../components/ColorDots';

interface ListViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

type SortKey = 'title' | 'start' | 'end' | 'section' | 'assignees';

export function ListView({ tasks, tagColors, onTaskClick }: ListViewProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('start');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'start':
        cmp = a.start.getTime() - b.start.getTime();
        break;
      case 'end':
        cmp = a.end.getTime() - b.end.getTime();
        break;
      case 'section':
        cmp = a.section.localeCompare(b.section);
        break;
      case 'assignees':
        cmp = a.assignees.join(', ').localeCompare(b.assignees.join(', '));
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const arrow = sortAsc ? ' ↑' : ' ↓';

  const thClass = 'cursor-pointer select-none px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        {t('list.noTasks')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[600px]">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
          <tr>
            <th onClick={() => handleSort('title')} className={thClass}>
              {t('list.title')}{sortKey === 'title' ? arrow : ''}
            </th>
            <th onClick={() => handleSort('start')} className={thClass}>
              {t('list.start')}{sortKey === 'start' ? arrow : ''}
            </th>
            <th onClick={() => handleSort('end')} className={thClass}>
              {t('list.end')}{sortKey === 'end' ? arrow : ''}
            </th>
            <th onClick={() => handleSort('section')} className={thClass}>
              {t('list.section')}{sortKey === 'section' ? arrow : ''}
            </th>
            <th onClick={() => handleSort('assignees')} className={thClass}>
              {t('list.assignees')}{sortKey === 'assignees' ? arrow : ''}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('list.tags')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sorted.map((task) => (
            <tr
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                <TaskTooltip task={task}>
                  <div className="flex items-center gap-2">
                    {task.colors.length > 0 && <ColorDots colors={task.colors} />}
                    <span>{task.milestone ? '◆ ' : ''}{task.title}</span>
                    {task.notes.length > 0 && <span className="text-gray-400">💬</span>}
                    <ProgressBar checklist={task.checklist} />
                  </div>
                </TaskTooltip>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {formatDate(task.start)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {formatDate(task.end)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {task.section}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {task.assignees.join(', ')}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: tagColors[tag] ?? '#6b7280' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
