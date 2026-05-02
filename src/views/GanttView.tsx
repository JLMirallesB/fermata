import { useMemo, useRef, useCallback, useState } from 'react';
import type { Task } from '../core/model';
import { buildSectionTree, type SectionNode } from '../core/sections';
import { ProgressBar } from '../components/ProgressBar';
import { TaskTooltip } from '../components/TaskTooltip';

interface GanttViewProps {
  tasks: Task[];
  tagColors: Record<string, string>;
  onTaskClick: (task: Task) => void;
}

const ROW_HEIGHT = 40;
const ROW_GAP = 2;
const LABEL_WIDTH = 280;
const DAY_WIDTH = 24;
const HEADER_HEIGHT = 40;
const PADDING = 16;
const DIAMOND_SIZE = 8;
const INDENT = 16;

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelsBodyRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
        result.push({ label: formatMonth(d), x: startDay * DAY_WIDTH, width: (endDay - startDay) * DAY_WIDTH });
      }
      d.setTime(nextMonth.getTime());
    }
    return result;
  }, [minDate, totalDays]);

  const todayX = useMemo(() => {
    const today = new Date();
    const days = daysBetween(minDate, today);
    if (days < 0 || days > totalDays) return null;
    return days * DAY_WIDTH;
  }, [minDate, totalDays]);

  const rowItems = useMemo(() => {
    const items: RowItem[] = [];
    const counter = { value: 0 };
    flattenTree(tree, collapsed, 0, items, counter);
    return items;
  }, [tree, collapsed]);

  const bodyHeight = rowItems.length > 0
    ? rowItems[rowItems.length - 1].y + ROW_HEIGHT + PADDING
    : PADDING;
  const chartWidth = totalDays * DAY_WIDTH;

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
        const sourceEndDay = daysBetween(minDate, source.task.end);
        const targetStartDay = daysBetween(minDate, row.task.start);
        const conflict = row.task.start < source.task.end;
        result.push({
          fromX: sourceEndDay * DAY_WIDTH,
          fromY: HEADER_HEIGHT + source.y + ROW_HEIGHT / 2,
          toX: targetStartDay * DAY_WIDTH,
          toY: HEADER_HEIGHT + row.y + ROW_HEIGHT / 2,
          conflict,
        });
      }
    }
    return result;
  }, [rowItems, minDate]);

  const handleChartScroll = useCallback(() => {
    if (scrollRef.current && labelsBodyRef.current) {
      labelsBodyRef.current.scrollTop = scrollRef.current.scrollTop;
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
        No tasks
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
          className="border-b border-gray-200 bg-gray-50 px-2 dark:border-gray-700 dark:bg-gray-800"
          style={{ height: HEADER_HEIGHT }}
        />
        <div
          ref={labelsBodyRef}
          onScroll={handleLabelsScroll}
          className="relative overflow-y-auto overflow-x-hidden"
          style={{ height: `calc(100% - ${HEADER_HEIGHT}px)` }}
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
              return (
                <TaskTooltip task={item.task} key={item.task.id}>
                <div
                  onClick={() => onTaskClick(item.task)}
                  className="absolute flex cursor-pointer items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  style={{ height: ROW_HEIGHT, top: item.y, left: 0, right: 0, paddingLeft: 8 + item.depth * INDENT }}
                >
                  {item.task.color && (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.task.color }}
                    />
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

      {/* Scrollable chart area */}
      <div
        ref={scrollRef}
        onScroll={handleChartScroll}
        className="flex-1 overflow-auto"
      >
        <svg width={chartWidth} height={HEADER_HEIGHT + bodyHeight} className="font-sans">
          {months.map((m, i) => (
            <g key={i}>
              <rect x={m.x} y={0} width={m.width} height={HEADER_HEIGHT} className="fill-gray-50 dark:fill-gray-800" stroke="#e5e7eb" strokeWidth={0.5} />
              <text x={m.x + m.width / 2} y={HEADER_HEIGHT / 2 + 4} textAnchor="middle" className="fill-gray-600 dark:fill-gray-400" fontSize={11}>{m.label}</text>
            </g>
          ))}

          {todayX !== null && (
            <line x1={todayX} y1={0} x2={todayX} y2={HEADER_HEIGHT + bodyHeight} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
          )}

          {rowItems.map((item) => {
            if (item.type !== 'task') return null;
            const { task, y } = item;
            const barY = HEADER_HEIGHT + y;
            const startDay = daysBetween(minDate, task.start);
            const endDay = daysBetween(minDate, task.end);
            const barX = startDay * DAY_WIDTH;
            const barWidth = Math.max((endDay - startDay) * DAY_WIDTH, 2);
            const color = task.color ?? tagColors[task.tags[0]] ?? '#6366f1';

            return (
              <g key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
                <rect x={0} y={barY} width={chartWidth} height={ROW_HEIGHT} className="fill-transparent hover:fill-gray-50/50 dark:hover:fill-gray-800/20" />
                {task.milestone ? (
                  <polygon
                    points={`${barX},${barY + ROW_HEIGHT / 2 - DIAMOND_SIZE} ${barX + DIAMOND_SIZE},${barY + ROW_HEIGHT / 2} ${barX},${barY + ROW_HEIGHT / 2 + DIAMOND_SIZE} ${barX - DIAMOND_SIZE},${barY + ROW_HEIGHT / 2}`}
                    fill={color}
                  />
                ) : (
                  <rect x={barX} y={barY + 8} width={barWidth} height={ROW_HEIGHT - 16} rx={4} fill={color} opacity={0.85} />
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
  );
}
