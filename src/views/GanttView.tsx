import { useMemo } from 'react';
import type { Task } from '../core/model';

interface GanttViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

const ROW_HEIGHT = 36;
const ROW_GAP = 4;
const LABEL_WIDTH = 200;
const DAY_WIDTH = 24;
const HEADER_HEIGHT = 40;
const PADDING = 16;
const DIAMOND_SIZE = 8;

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (86400000));
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function GanttView({ tasks, tagColors, onTaskClick }: GanttViewProps) {
  const { minDate, maxDate, totalDays, sections } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: now, totalDays: 30, sections: new Map<string, Task[]>() };
    }

    let min = tasks[0].start;
    let max = tasks[0].end;
    for (const t of tasks) {
      if (t.start < min) min = t.start;
      if (t.end > max) max = t.end;
    }

    const padDays = 7;
    const minD = new Date(min);
    minD.setDate(minD.getDate() - padDays);
    const maxD = new Date(max);
    maxD.setDate(maxD.getDate() + padDays);

    const secs = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.section || '';
      if (!secs.has(key)) secs.set(key, []);
      secs.get(key)!.push(t);
    }

    return { minDate: minD, maxDate: maxD, totalDays: daysBetween(minD, maxD), sections: secs };
  }, [tasks]);

  const months = useMemo(() => {
    const result: { label: string; x: number; width: number }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    while (d <= maxDate) {
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const startDay = Math.max(0, daysBetween(minDate, d));
      const endDay = Math.min(totalDays, daysBetween(minDate, nextMonth));
      if (endDay > startDay) {
        result.push({
          label: formatMonth(d),
          x: startDay * DAY_WIDTH,
          width: (endDay - startDay) * DAY_WIDTH,
        });
      }
      d.setTime(nextMonth.getTime());
    }
    return result;
  }, [minDate, maxDate, totalDays]);

  const todayX = useMemo(() => {
    const today = new Date();
    const days = daysBetween(minDate, today);
    if (days < 0 || days > totalDays) return null;
    return days * DAY_WIDTH;
  }, [minDate, totalDays]);

  let rowIndex = 0;
  const rows: { task: Task; y: number; section?: string; isSectionHeader?: boolean }[] = [];
  const sectionHeaders: { label: string; y: number }[] = [];

  for (const [section, sectionTasks] of sections) {
    if (section) {
      sectionHeaders.push({ label: section, y: HEADER_HEIGHT + rowIndex * (ROW_HEIGHT + ROW_GAP) });
      rowIndex++;
    }
    for (const task of sectionTasks) {
      rows.push({ task, y: HEADER_HEIGHT + rowIndex * (ROW_HEIGHT + ROW_GAP) });
      rowIndex++;
    }
  }

  const chartWidth = totalDays * DAY_WIDTH;
  const chartHeight = HEADER_HEIGHT + rowIndex * (ROW_HEIGHT + ROW_GAP) + PADDING;
  const svgWidth = LABEL_WIDTH + chartWidth;

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        No tasks
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <svg width={svgWidth} height={chartHeight} className="font-sans">
        {/* Month headers */}
        {months.map((m, i) => (
          <g key={i}>
            <rect
              x={LABEL_WIDTH + m.x}
              y={0}
              width={m.width}
              height={HEADER_HEIGHT}
              className="fill-gray-100 dark:fill-gray-800"
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={LABEL_WIDTH + m.x + m.width / 2}
              y={HEADER_HEIGHT / 2 + 4}
              textAnchor="middle"
              className="fill-gray-600 dark:fill-gray-400"
              fontSize={11}
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* Today marker */}
        {todayX !== null && (
          <line
            x1={LABEL_WIDTH + todayX}
            y1={0}
            x2={LABEL_WIDTH + todayX}
            y2={chartHeight}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}

        {/* Section headers */}
        {sectionHeaders.map((sh, i) => (
          <text
            key={`sh-${i}`}
            x={8}
            y={sh.y + ROW_HEIGHT / 2 + 4}
            className="fill-gray-800 dark:fill-gray-200"
            fontSize={12}
            fontWeight="bold"
          >
            {sh.label}
          </text>
        ))}

        {/* Task rows */}
        {rows.map(({ task, y }) => {
          const startDay = daysBetween(minDate, task.start);
          const endDay = daysBetween(minDate, task.end);
          const barX = LABEL_WIDTH + startDay * DAY_WIDTH;
          const barWidth = Math.max((endDay - startDay) * DAY_WIDTH, 2);
          const color = task.color ?? tagColors[task.tags[0]] ?? '#6366f1';

          return (
            <g
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="cursor-pointer"
            >
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={svgWidth}
                height={ROW_HEIGHT}
                className="fill-transparent hover:fill-gray-50 dark:hover:fill-gray-800/30"
              />
              {/* Label */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={12}
              >
                {task.title.length > 25 ? task.title.slice(0, 22) + '...' : task.title}
              </text>

              {task.milestone ? (
                <polygon
                  points={`${barX},${y + ROW_HEIGHT / 2 - DIAMOND_SIZE} ${barX + DIAMOND_SIZE},${y + ROW_HEIGHT / 2} ${barX},${y + ROW_HEIGHT / 2 + DIAMOND_SIZE} ${barX - DIAMOND_SIZE},${y + ROW_HEIGHT / 2}`}
                  fill={color}
                />
              ) : (
                <rect
                  x={barX}
                  y={y + 6}
                  width={barWidth}
                  height={ROW_HEIGHT - 12}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
