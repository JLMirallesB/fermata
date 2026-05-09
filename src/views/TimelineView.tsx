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

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

function dateKey(d: Date): string {
  return formatDate(d);
}

function formatDayLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMonthLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

type DayEntry = {
  date: string;
  label: string;
  starts: Task[];
  ends: Task[];
  milestones: Task[];
};

export function TimelineView({ tasks, tagColors, onTaskClick }: TimelineViewProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'ca-ES-valencia' ? 'ca' : i18n.language;

  const { days, monthBreaks } = useMemo(() => {
    if (tasks.length === 0) return { days: [], monthBreaks: new Set<string>() };

    const dayMap = new Map<string, DayEntry>();

    const ensureDay = (d: Date): DayEntry => {
      const key = dateKey(d);
      if (!dayMap.has(key)) {
        dayMap.set(key, { date: key, label: formatDayLabel(d, locale), starts: [], ends: [], milestones: [] });
      }
      return dayMap.get(key)!;
    };

    for (const task of tasks) {
      if (task.milestone) {
        ensureDay(task.start).milestones.push(task);
      } else {
        ensureDay(task.start).starts.push(task);
        ensureDay(task.end).ends.push(task);
      }
    }

    const sorted = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    const filtered = sorted.filter((d) => d.starts.length > 0 || d.ends.length > 0 || d.milestones.length > 0);

    const breaks = new Set<string>();
    let lastMonth = '';
    for (const day of filtered) {
      const m = day.date.slice(0, 7);
      if (m !== lastMonth) {
        breaks.add(day.date);
        lastMonth = m;
      }
    }

    return { days: filtered, monthBreaks: breaks };
  }, [tasks, locale]);

  const todayStr = formatDate(new Date());

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        {t('list.noTasks')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4 py-6">
      <div className="mx-auto max-w-4xl">
        {days.map((day) => {
          const isToday = day.date === todayStr;
          const showMonth = monthBreaks.has(day.date);
          const d = new Date(day.date + 'T00:00:00');
          const leftItems = [...day.milestones, ...day.starts];
          const rightItems = day.ends;
          return (
            <div key={day.date}>
              {/* Month separator */}
              {showMonth && (
                <div className="mb-4 mt-2 flex justify-center">
                  <span className="rounded-full bg-gray-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {formatMonthLabel(d, locale)}
                  </span>
                </div>
              )}

              {/* Day row */}
              <div className="mb-3 flex items-stretch gap-0">
                {/* Left column: starts + milestones */}
                <div className="flex w-[calc(50%-40px)] flex-col gap-1.5 pr-2">
                  {leftItems.map((task) => (
                    <TimelineCard
                      key={task.id}
                      task={task}
                      side="start"
                      tagColors={tagColors}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                  {leftItems.length === 0 && rightItems.length > 0 && (
                    <div className="min-h-[40px]" />
                  )}
                </div>

                {/* Center axis */}
                <div className="relative flex w-[80px] shrink-0 flex-col items-center">
                  {/* Vertical line */}
                  <div className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  {/* Date badge */}
                  <div className={`relative z-10 mt-2 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold leading-tight ${
                    isToday
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'
                  }`}>
                    {day.label}
                  </div>
                </div>

                {/* Right column: ends */}
                <div className="flex w-[calc(50%-40px)] flex-col gap-1.5 pl-2">
                  {rightItems.map((task) => (
                    <TimelineCard
                      key={`end-${task.id}`}
                      task={task}
                      side="end"
                      tagColors={tagColors}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                  {rightItems.length === 0 && leftItems.length > 0 && (
                    <div className="min-h-[40px]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Today marker if not already a day */}
        {!days.some((d) => d.date === todayStr) && (
          <div className="mt-4 flex justify-center">
            <span className="rounded-full bg-red-500 px-3 py-0.5 text-xs font-semibold text-white">
              {todayStr}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineCard({
  task,
  side,
  tagColors,
  onTaskClick,
}: {
  task: Task;
  side: 'start' | 'end';
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}) {
  const { t } = useTranslation();
  const color = task.color ?? tagColors[task.tags[0]] ?? '#6366f1';
  const days = daysBetween(task.start, task.end);
  const isRange = !task.milestone && days > 1;
  const isStart = side === 'start';
  const cardId = `tl-${task.id}-${side}`;
  const pairedId = `tl-${task.id}-${isStart ? 'end' : 'start'}`;

  const goToPaired = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(pairedId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400'), 1500);
    }
  };

  return (
    <TaskTooltip task={task}>
      <div
        id={cardId}
        onClick={() => onTaskClick(task)}
        className={`cursor-pointer rounded-lg border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 ${
          isStart ? 'border-l-3 border-r-0' : 'border-r-3 border-l-0'
        }`}
        style={{
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          [isStart ? 'borderLeftColor' : 'borderRightColor']: color,
        }}
      >
        {/* Header */}
        <div className={`flex items-center gap-1.5 ${isStart ? '' : 'flex-row-reverse'}`}>
          {/* Start/end/milestone indicator */}
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase text-white"
            style={{ backgroundColor: color }}
          >
            {task.milestone ? '◆' : isStart ? '▸' : '◂'}
          </span>
          <span className={`min-w-0 flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 ${isStart ? '' : 'text-right'}`}>
            {task.title}
          </span>
          {task.notes.length > 0 && <span className="shrink-0 text-[10px] text-gray-400">💬</span>}
          {isRange && (
            <button
              onClick={goToPaired}
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title={isStart ? formatDate(task.end) : formatDate(task.start)}
            >
              {isStart ? `⤓ ${t('list.end')}` : `⤒ ${t('list.start')}`}
            </button>
          )}
        </div>

        {/* Date info */}
        {isRange && (
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 ${isStart ? '' : 'justify-end'}`}>
            <span>{formatDate(task.start)}</span>
            <span className="text-gray-300 dark:text-gray-600">→</span>
            <span>{formatDate(task.end)}</span>
            <span className="rounded bg-gray-100 px-1 tabular-nums text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              {days}d
            </span>
          </div>
        )}

        {/* Bottom row */}
        <div className={`mt-1 flex items-center gap-2 ${isStart ? '' : 'flex-row-reverse'}`}>
          {/* Tags */}
          {task.tags.length > 0 && (
            <div className={`flex flex-wrap gap-0.5 ${isStart ? '' : 'justify-end'}`}>
              {task.tags.filter((tg) => !['todo', 'doing', 'done'].includes(tg.toLowerCase())).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                  style={{ backgroundColor: tagColors[tag] ?? '#6b7280' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {task.assignees.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {task.assignees.join(', ')}
            </span>
          )}

          {task.checklist.length > 0 && (
            <ProgressBar checklist={task.checklist} />
          )}
        </div>
      </div>
    </TaskTooltip>
  );
}
