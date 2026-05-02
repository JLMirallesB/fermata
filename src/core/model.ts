import { parse, isEvent } from '@markwhen/parser';
import type { Event, EventGroup, Eventy } from '@markwhen/parser';
import { deriveStatus, type KanbanStatus } from './status.js';

export interface Task {
  id: string;
  title: string;
  start: Date;
  end: Date;
  section: string;
  tags: string[];
  assignees: string[];
  milestone: boolean;
  color: string | null;
  status: KanbanStatus;
  textRange: { from: number; to: number };
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
function isMilestone(event: Event): boolean {
  const datePart = event.firstLine.datePart ?? '';
  return !datePart.includes('/');
}

/**
 * Walk the event tree, collecting tasks with their parent section context.
 */
function walkEvents(
  node: Eventy,
  section: string,
  tasks: Task[],
  tagColors: Record<string, string>,
): void {
  if (isEvent(node)) {
    const event = node;
    const tags = event.tags;
    const assignees = extractAssignees(event.properties as Record<string, string>);
    const firstTagColor = tags.length > 0 ? (tagColors[tags[0]] ?? null) : null;

    const task: Task = {
      id: `task-${tasks.length}`,
      title: event.firstLine.restTrimmed,
      start: new Date(event.dateRangeIso.fromDateTimeIso),
      end: new Date(event.dateRangeIso.toDateTimeIso),
      section,
      tags,
      assignees,
      milestone: isMilestone(event),
      color: firstTagColor,
      status: deriveStatus(tags),
      textRange: {
        from: event.textRanges.whole.from,
        to: event.textRanges.whole.to,
      },
    };
    tasks.push(task);
  } else {
    const group = node as EventGroup;
    const groupSection = group.title || section;
    for (const child of group.children) {
      walkEvents(child, groupSection, tasks, tagColors);
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

  walkEvents(result.events, '', tasks, tagColors);

  return { tasks, tagColors };
}
