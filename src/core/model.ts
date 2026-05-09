import { parse, isEvent } from '@markwhen/parser';
import type { Event, EventGroup, Eventy } from '@markwhen/parser';
import { deriveStatus, type KanbanStatus } from './status.js';

export interface ChecklistItem {
  label: string;
  checked: boolean;
  range: { from: number; to: number };
}

export interface Task {
  id: string;
  eventId: string | null;
  title: string;
  start: Date;
  end: Date;
  section: string;
  sectionPath: string[];
  tags: string[];
  assignees: string[];
  milestone: boolean;
  color: string | null;
  colors: string[];
  status: KanbanStatus;
  textRange: { from: number; to: number };
  checklist: ChecklistItem[];
  notes: string[];
  noteRanges: { from: number; to: number }[];
  depends: string[];
}

export interface TagColor {
  tag: string;
  color: string;
}

/**
 * Extract tag-to-color mapping from raw Markwhen text.
 * Format: `#tagname: color` at the start of a line (before any events).
 */
export function parseTagColors(text: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const regex = /^\s*#(\w+):\s*(\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    colors[match[1]] = match[2];
  }
  return colors;
}

/**
 * Extract assignees from event properties.
 * Supports `assignee` (single) and `assignees` (comma-separated).
 */
function extractAssignees(properties: Record<string, string>): string[] {
  const result: string[] = [];

  const single = properties['assignee'] as string | undefined;
  if (single) {
    result.push(...single.split(',').map((s) => s.trim()).filter(Boolean));
  }

  const multi = properties['assignees'] as string | undefined;
  if (multi) {
    result.push(...multi.split(',').map((s) => s.trim()).filter(Boolean));
  }

  return result;
}

/**
 * Determine if an event is a milestone by checking its datePart string.
 * A milestone has a single date (no `/` separator in the date part).
 */
function extractChecklist(event: Event): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const checkboxSups = event.supplemental
    .filter((s) => s.type === 'checkbox') as unknown as { type: string; raw: string; value: boolean }[];
  const ranges = event.matchedListItems;

  let supIndex = 0;
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (range.type === 'checkboxItemIndicator') {
      const label = supIndex < checkboxSups.length ? checkboxSups[supIndex].raw : '';
      items.push({
        label,
        checked: !!range.content,
        range: { from: range.from, to: range.to },
      });
      supIndex++;
    }
  }
  return items;
}

function isMilestone(event: Event): boolean {
  const datePart = event.firstLine.datePart ?? '';
  return !datePart.includes('/');
}

/**
 * Walk the event tree, collecting tasks with their parent section context.
 */
function extractNotes(
  event: Event,
  text: string,
  commentRanges: { from: number; to: number }[],
): { notes: string[]; noteRanges: { from: number; to: number }[] } {
  const eventFrom = event.textRanges.whole.from;
  const eventTo = event.textRanges.whole.to;
  const notes: string[] = [];
  const ranges: { from: number; to: number }[] = [];
  for (const cr of commentRanges) {
    if (cr.from >= eventFrom && cr.to <= eventTo) {
      const raw = text.slice(cr.from, cr.to);
      const cleaned = raw.replace(/^\/\/\s?/, '').trim();
      if (cleaned) {
        notes.push(cleaned);
        ranges.push(cr);
      }
    }
  }
  return { notes, noteRanges: ranges };
}

function walkEvents(
  node: Eventy,
  path: string[],
  tasks: Task[],
  tagColors: Record<string, string>,
  text: string,
  commentRanges: { from: number; to: number }[],
): void {
  if (isEvent(node)) {
    const event = node;
    const tags = event.tags;
    const assignees = extractAssignees(event.properties as Record<string, string>);
    const tagColorList = tags.map((tg) => tagColors[tg]).filter((c): c is string => !!c);
    const firstTagColor = tagColorList.length > 0 ? tagColorList[0] : null;

    const props = event.properties as Record<string, string>;
    const dependsRaw = props['depends'] ?? '';
    const depends = dependsRaw ? dependsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    const task: Task = {
      id: `task-${tasks.length}`,
      eventId: event.id ?? null,
      title: event.firstLine.restTrimmed,
      start: new Date(event.dateRangeIso.fromDateTimeIso),
      end: new Date(event.dateRangeIso.toDateTimeIso),
      section: path[path.length - 1] ?? '',
      sectionPath: path,
      tags,
      assignees,
      milestone: isMilestone(event),
      color: firstTagColor,
      colors: tagColorList,
      status: deriveStatus(tags),
      textRange: {
        from: event.textRanges.whole.from,
        to: event.textRanges.whole.to,
      },
      checklist: extractChecklist(event),
      ...extractNotes(event, text, commentRanges),
      depends,
    };
    tasks.push(task);
  } else {
    const group = node as EventGroup;
    const childPath = group.title ? [...path, group.title] : path;
    for (const child of group.children) {
      walkEvents(child, childPath, tasks, tagColors, text, commentRanges);
    }
  }
}

/**
 * Parse Markwhen text into normalized Task[] and tag color mapping.
 */
export function parseTasks(text: string): { tasks: Task[]; tagColors: Record<string, string> } {
  const tagColors = parseTagColors(text);
  const result = parse(text);
  const tasks: Task[] = [];

  const seen = new Set<string>();
  const commentRanges = result.ranges
    .filter((r) => r.type === 'comment')
    .filter((r) => {
      const key = `${r.from}:${r.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({ from: r.from, to: r.to }));

  walkEvents(result.events, [], tasks, tagColors, text, commentRanges);

  return { tasks, tagColors };
}
