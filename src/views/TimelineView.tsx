import { useMemo } from 'react';
import type { Task } from '../core/model';

interface TimelineViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

const LANE_HEIGHT = 32;
const LANE_GAP = 4;
const HEADER_HEIGHT = 36;
const DAY_WIDTH = 20;
const PADDING = 16;
const DIAMOND_SIZE = 7;

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

interface Lane {
  task: Task;
  row: number;
}

function layoutLanes(tasks: Task[]): Lane[] {
  const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const rowEnds: number[] = [];
  const lanes: Lane[] = [];

  for (const task of sorted) {
    let placed = false;
    for (let r = 0; r < rowEnds.length; r++) {
      if (task.start.getTime() >= rowEnds[r]) {
        rowEnds[r] = task.end.getTime();
        lanes.push({ task, row: r });
        placed = true;
        break;
      }
    }
    if (!placed) {
      rowEnds.push(task.end.getTime());
      lanes.push({ task, row: rowEnds.length - 1 });
    }
  }

  return lanes;
}

export function TimelineView({ tasks, tagColors, onTaskClick }: TimelineViewProps) {
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: now, totalDays: 30 };
    }

    let min = tasks[0].start;
    let max = tasks[0].end;
    for (const t of tasks) {
      if (t.start < min) min = t.start;
      if (t.end > max) max = t.end;
    }

    const padDays = 5;
    const minD = new Date(min);
    minD.setDate(minD.getDate() - padDays);
    const maxD = new Date(max);
    maxD.setDate(maxD.getDate() + padDays);

    return { minDate: minD, maxDate: maxD, totalDays: daysBetween(minD, maxD) };
  }, [tasks]);

  const lanes = useMemo(() => layoutLanes(tasks), [tasks]);
  const maxRow = lanes.reduce((m, l) => Math.max(m, l.row), -1) + 1;

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

  const chartWidth = totalDays * DAY_WIDTH;
  const chartHeight = HEADER_HEIGHT + maxRow * (LANE_HEIGHT + LANE_GAP) + LANE_HEIGHT + PADDING;

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        No tasks
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <svg width={chartWidth} height={chartHeight} className="font-sans">
        {/* Month headers */}
        {months.map((m, i) => (
          <g key={i}>
            <rect
              x={m.x}
              y={0}
              width={m.width}
              height={HEADER_HEIGHT}
              className="fill-gray-100 dark:fill-gray-800"
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={m.x + m.width / 2}
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
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={chartHeight}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}

        {/* Task blocks */}
        {lanes.map(({ task, row }) => {
          const startDay = daysBetween(minDate, task.start);
          const endDay = daysBetween(minDate, task.end);
          const x = startDay * DAY_WIDTH;
          const w = Math.max((endDay - startDay) * DAY_WIDTH, 2);
          const y = HEADER_HEIGHT + row * (LANE_HEIGHT + LANE_GAP);
          const color = task.color ?? tagColors[task.tags[0]] ?? '#6366f1';

          return (
            <g
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="cursor-pointer"
            >
              {task.milestone ? (
                <>
                  <polygon
                    points={`${x},${y + LANE_HEIGHT / 2 - DIAMOND_SIZE} ${x + DIAMOND_SIZE},${y + LANE_HEIGHT / 2} ${x},${y + LANE_HEIGHT / 2 + DIAMOND_SIZE} ${x - DIAMOND_SIZE},${y + LANE_HEIGHT / 2}`}
                    fill={color}
                  />
                  <text
                    x={x + DIAMOND_SIZE + 4}
                    y={y + LANE_HEIGHT / 2 + 4}
                    className="fill-gray-700 dark:fill-gray-300"
                    fontSize={11}
                  >
                    {task.title}
                  </text>
                </>
              ) : (
                <>
                  <rect
                    x={x}
                    y={y + 4}
                    width={w}
                    height={LANE_HEIGHT - 8}
                    rx={4}
                    fill={color}
                    opacity={0.85}
                  />
                  {w > 40 && (
                    <text
                      x={x + 6}
                      y={y + LANE_HEIGHT / 2 + 4}
                      fill="white"
                      fontSize={11}
                      fontWeight={500}
                    >
                      {task.title.length > w / 7 ? task.title.slice(0, Math.floor(w / 7) - 1) + '…' : task.title}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
