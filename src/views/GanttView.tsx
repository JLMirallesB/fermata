import { useMemo, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../core/model';
import { buildSectionTree, type SectionNode } from '../core/sections';
import { ProgressBar } from '../components/ProgressBar';
import { TaskTooltip } from '../components/TaskTooltip';
import { ColorDots } from '../components/ColorDots';

interface GanttViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

const ROW_HEIGHT = 40;
const ROW_GAP = 2;
const LABEL_WIDTH = 280;
const DEFAULT_DAY_WIDTH = 24;
const MIN_DAY_WIDTH = 4;
const MAX_DAY_WIDTH = 80;
const HEADER_HEIGHT = 40;
const PADDING = 16;
const DIAMOND_SIZE = 8;
const INDENT = 16;

const SUB_HEADER_HEIGHT = 24;
const TOTAL_HEADER = HEADER_HEIGHT + SUB_HEADER_HEIGHT;

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const WEEKDAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

type SubMark = { label: string; x: number; width: number };

function buildSubMarks(minDate: Date, totalDays: number, dw: number): SubMark[] {
  const marks: SubMark[] = [];

  if (dw >= 40) {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      const dayNum = d.getDate();
      const wd = WEEKDAY_SHORT[d.getDay()];
      marks.push({ label: `${wd} ${dayNum}`, x: i * dw, width: dw });
    }
  } else if (dw >= 14) {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      if (d.getDate() % 5 === 1 || d.getDate() === 1) {
        const end = Math.min(i + 5, totalDays);
        marks.push({ label: String(d.getDate()), x: i * dw, width: (end - i) * dw });
      }
    }
  } else {
    const d = new Date(minDate);
    const dayOfWeek = d.getDay();
    let offset = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    if (offset === 0) offset = 7;
    while (offset < totalDays) {
      const weekDate = new Date(minDate);
      weekDate.setDate(weekDate.getDate() + offset);
      const weekNum = getWeekNumber(weekDate);
      const nextWeek = Math.min(offset + 7, totalDays);
      marks.push({ label: `S${weekNum}`, x: offset * dw, width: (nextWeek - offset) * dw });
      offset += 7;
    }
  }

  return marks;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

type RowItem =
  | { type: 'section'; key: string; label: string; depth: number; hasChildren: boolean; y: number }
  | { type: 'task'; task: Task; depth: number; y: number };

function flattenTree(
  node: SectionNode,
  collapsed: Set<string>,
  depth: number,
  items: RowItem[],
  counter: { value: number },
): void {
  for (const child of node.children) {
    const hasChildren = child.children.length > 0 || child.tasks.length > 0;
    items.push({
      type: 'section',
      key: child.key,
      label: child.name,
      depth,
      hasChildren,
      y: counter.value * (ROW_HEIGHT + ROW_GAP),
    });
    counter.value++;

    if (!collapsed.has(child.key)) {
      flattenTree(child, collapsed, depth + 1, items, counter);
      for (const task of child.tasks) {
        items.push({
          type: 'task',
          task,
          depth: depth + 1,
          y: counter.value * (ROW_HEIGHT + ROW_GAP),
        });
        counter.value++;
      }
    }
  }

  for (const task of node.tasks) {
    if (node.key === '') {
      items.push({
        type: 'task',
        task,
        depth,
        y: counter.value * (ROW_HEIGHT + ROW_GAP),
      });
      counter.value++;
    }
  }
}

export function GanttView({ tasks, tagColors, onTaskClick }: GanttViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelsBodyRef = useRef<HTMLDivElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const tree = useMemo(() => buildSectionTree(tasks), [tasks]);

  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      return { minDate: new Date(), totalDays: 30 };
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
    return { minDate: minD, totalDays: daysBetween(minD, maxD) };
  }, [tasks]);

  const months = useMemo(() => {
    const maxD = new Date(minDate);
    maxD.setDate(maxD.getDate() + totalDays);
    const result: { label: string; x: number; width: number }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    while (d <= maxD) {
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const startDay = Math.max(0, daysBetween(minDate, d));
      const endDay = Math.min(totalDays, daysBetween(minDate, nextMonth));
      if (endDay > startDay) {
        result.push({ label: formatMonth(d), x: startDay * dayWidth, width: (endDay - startDay) * dayWidth });
      }
      d.setTime(nextMonth.getTime());
    }
    return result;
  }, [minDate, totalDays, dayWidth]);

  const subMarks = useMemo(
    () => buildSubMarks(minDate, totalDays, dayWidth),
    [minDate, totalDays, dayWidth],
  );

  const todayX = useMemo(() => {
    const today = new Date();
    const days = daysBetween(minDate, today);
    if (days < 0 || days > totalDays) return null;
    return days * dayWidth;
  }, [minDate, totalDays, dayWidth]);

  const rowItems = useMemo(() => {
    const items: RowItem[] = [];
    const counter = { value: 0 };
    flattenTree(tree, collapsed, 0, items, counter);
    return items;
  }, [tree, collapsed]);

  const bodyHeight = rowItems.length > 0
    ? rowItems[rowItems.length - 1].y + ROW_HEIGHT + PADDING
    : PADDING;
  const chartWidth = totalDays * dayWidth;

  const arrows = useMemo(() => {
    const taskRows = rowItems.filter((r): r is RowItem & { type: 'task' } => r.type === 'task');
    const byEventId = new Map<string, typeof taskRows[number]>();
    for (const row of taskRows) {
      if (row.task.eventId) byEventId.set(row.task.eventId, row);
    }

    const result: { fromX: number; fromY: number; toX: number; toY: number; conflict: boolean }[] = [];
    for (const row of taskRows) {
      for (const dep of row.task.depends) {
        const source = byEventId.get(dep);
        if (!source) continue;

        const sourceStart = daysBetween(minDate, source.task.start);
        const sourceEnd = daysBetween(minDate, source.task.end);
        const targetStart = daysBetween(minDate, row.task.start);

        const fromX = source.task.milestone
          ? sourceStart * dayWidth
          : sourceEnd * dayWidth;
        const toX = row.task.milestone
          ? targetStart * dayWidth
          : targetStart * dayWidth;

        const conflict = !source.task.milestone && !row.task.milestone && row.task.start < source.task.end;

        result.push({
          fromX,
          fromY: source.y + ROW_HEIGHT / 2,
          toX,
          toY: row.y + ROW_HEIGHT / 2,
          conflict,
        });
      }
    }
    return result;
  }, [rowItems, minDate, dayWidth]);

  const handleChartScroll = useCallback(() => {
    if (scrollRef.current) {
      if (labelsBodyRef.current) {
        labelsBodyRef.current.scrollTop = scrollRef.current.scrollTop;
      }
      if (monthsRef.current) {
        monthsRef.current.scrollLeft = scrollRef.current.scrollLeft;
      }
    }
  }, []);

  const handleLabelsScroll = useCallback(() => {
    if (scrollRef.current && labelsBodyRef.current) {
      scrollRef.current.scrollTop = labelsBodyRef.current.scrollTop;
    }
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        {t('list.noTasks')}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sticky label column */}
      <div
        className="shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        style={{ width: LABEL_WIDTH }}
      >
        <div
          className="flex items-center justify-center gap-1 border-b border-gray-200 bg-gray-50 px-2 dark:border-gray-700 dark:bg-gray-800"
          style={{ height: TOTAL_HEADER }}
        >
          <button
            onClick={() => setDayWidth((w) => Math.max(MIN_DAY_WIDTH, Math.round(w / 1.4)))}
            className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_DAY_WIDTH}
            max={MAX_DAY_WIDTH}
            value={dayWidth}
            onChange={(e) => setDayWidth(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-indigo-500"
          />
          <button
            onClick={() => setDayWidth((w) => Math.min(MAX_DAY_WIDTH, Math.round(w * 1.4)))}
            className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            +
          </button>
        </div>
        <div
          ref={labelsBodyRef}
          onScroll={handleLabelsScroll}
          className="relative overflow-y-auto overflow-x-hidden"
          style={{ height: `calc(100% - ${TOTAL_HEADER}px)` }}
        >
          <div style={{ height: bodyHeight, position: 'relative' }}>
            {rowItems.map((item, i) => {
              if (item.type === 'section') {
                const isCollapsed = collapsed.has(item.key);
                return (
                  <div
                    key={`s-${i}`}
                    className="absolute flex cursor-pointer select-none items-center gap-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    style={{ height: ROW_HEIGHT, top: item.y, left: 0, right: 0, paddingLeft: 8 + item.depth * INDENT }}
                    onClick={() => toggleCollapse(item.key)}
                  >
                    <span className="inline-block w-4 text-center text-[10px] text-gray-400">
                      {item.hasChildren ? (isCollapsed ? '▶' : '▼') : ''}
                    </span>
                    {item.label}
                  </div>
                );
              }
              const isHovered = hoveredTaskId === item.task.id;
              return (
                <TaskTooltip task={item.task} key={item.task.id}>
                <div
                  onClick={() => onTaskClick(item.task)}
                  onMouseEnter={() => setHoveredTaskId(item.task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  className={`absolute flex cursor-pointer items-center gap-2 ${
                    isHovered
                      ? 'bg-indigo-50 dark:bg-indigo-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  style={{ height: ROW_HEIGHT, top: item.y, left: 0, right: 0, paddingLeft: 8 + item.depth * INDENT }}
                >
                  {item.task.colors.length > 0 && (
                    <ColorDots colors={item.task.colors} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs leading-tight text-gray-700 dark:text-gray-300" style={{ wordBreak: 'break-word' }}>
                        {item.task.milestone ? '◆ ' : ''}{item.task.title}
                      </span>
                      {item.task.notes.length > 0 && <span className="shrink-0 text-[10px] text-gray-400">💬</span>}
                    </div>
                    {item.task.checklist.length > 0 && (
                      <div className="mt-0.5">
                        <ProgressBar checklist={item.task.checklist} />
                      </div>
                    )}
                  </div>
                </div>
                </TaskTooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart area with sticky month header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky two-row header */}
        <div
          ref={monthsRef}
          className="shrink-0 overflow-hidden border-b border-gray-200 dark:border-gray-700"
          style={{ height: TOTAL_HEADER }}
        >
          <div style={{ width: chartWidth, height: TOTAL_HEADER }} className="relative">
            {/* Top row: months */}
            {months.map((m, i) => (
              <div
                key={`m-${i}`}
                className="absolute flex items-center justify-center border-b border-r border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                style={{ left: m.x, width: m.width, height: HEADER_HEIGHT, top: 0 }}
              >
                {m.label}
              </div>
            ))}
            {/* Bottom row: sub marks */}
            {subMarks.map((s, i) => (
              <div
                key={`s-${i}`}
                className="absolute flex items-center justify-center border-r border-gray-100 bg-white text-[9px] text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                style={{ left: s.x, width: s.width, height: SUB_HEADER_HEIGHT, top: HEADER_HEIGHT }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart body */}
        <div
          ref={scrollRef}
          onScroll={handleChartScroll}
          className="flex-1 overflow-auto"
        >
          <svg width={chartWidth} height={bodyHeight} className="font-sans">
            {/* Grid lines aligned with sub marks */}
            {subMarks.map((s, i) => (
              <line key={`grid-${i}`} x1={s.x} y1={0} x2={s.x} y2={bodyHeight} stroke="#e5e7eb" strokeWidth={0.5} opacity={0.5} />
            ))}

            {todayX !== null && (
              <line x1={todayX} y1={0} x2={todayX} y2={bodyHeight} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
            )}

          {rowItems.map((item) => {
            if (item.type !== 'task') return null;
            const { task, y } = item;
            const barY = y;
            const startDay = daysBetween(minDate, task.start);
            const endDay = daysBetween(minDate, task.end);
            const barX = startDay * dayWidth;
            const barWidth = Math.max((endDay - startDay) * dayWidth, 2);
            const taskColors = task.colors.length > 0 ? task.colors.slice(0, 3) : [task.color ?? tagColors[task.tags[0]] ?? '#6366f1'];
            const primaryColor = taskColors[0];

            return (
              <g
                key={task.id}
                onClick={() => onTaskClick(task)}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className="cursor-pointer"
              >
                <rect
                  x={0} y={barY} width={chartWidth} height={ROW_HEIGHT}
                  fill={hoveredTaskId === task.id ? 'rgba(99,102,241,0.06)' : 'transparent'}
                  className="hover:fill-gray-50/50 dark:hover:fill-gray-800/20"
                />
                {task.milestone ? (
                  <polygon
                    points={`${barX},${barY + ROW_HEIGHT / 2 - DIAMOND_SIZE} ${barX + DIAMOND_SIZE},${barY + ROW_HEIGHT / 2} ${barX},${barY + ROW_HEIGHT / 2 + DIAMOND_SIZE} ${barX - DIAMOND_SIZE},${barY + ROW_HEIGHT / 2}`}
                    fill={primaryColor}
                  />
                ) : taskColors.length === 1 ? (
                  <rect x={barX} y={barY + 8} width={barWidth} height={ROW_HEIGHT - 16} rx={4} fill={primaryColor} opacity={0.85} />
                ) : (
                  <g>
                    <clipPath id={`clip-${task.id}`}>
                      <rect x={barX} y={barY + 8} width={barWidth} height={ROW_HEIGHT - 16} rx={4} />
                    </clipPath>
                    <g clipPath={`url(#clip-${task.id})`}>
                      {taskColors.map((c, ci) => {
                        const segW = barWidth / taskColors.length;
                        return (
                          <rect
                            key={ci}
                            x={barX + ci * segW}
                            y={barY + 8}
                            width={segW}
                            height={ROW_HEIGHT - 16}
                            fill={c}
                            opacity={0.85}
                          />
                        );
                      })}
                    </g>
                  </g>
                )}
              </g>
            );
          })}

          {/* Dependency arrows */}
          <defs>
            <marker id="arrow-normal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#6366f1" />
            </marker>
            <marker id="arrow-conflict" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
            </marker>
          </defs>
          {arrows.map((a, i) => {
            const midX = a.fromX + (a.toX - a.fromX) / 2;
            const stroke = a.conflict ? '#ef4444' : '#6366f1';
            const marker = a.conflict ? 'url(#arrow-conflict)' : 'url(#arrow-normal)';
            return (
              <path
                key={`dep-${i}`}
                d={`M${a.fromX},${a.fromY} C${midX},${a.fromY} ${midX},${a.toY} ${a.toX},${a.toY}`}
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                strokeDasharray={a.conflict ? '4 2' : 'none'}
                markerEnd={marker}
                opacity={0.7}
              />
            );
          })}
          </svg>
        </div>
      </div>
    </div>
  );
}
