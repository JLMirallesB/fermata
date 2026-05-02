import type { Task } from './model.js';

/**
 * Format a Date to YYYY-MM-DD string.
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates represent the same calendar day (UTC-agnostic, uses local).
 */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Build the date range string for a task line.
 * Single date for milestones, `from / to` for ranges.
 */
function buildDateString(start: Date, end: Date): string {
  if (sameDay(start, end)) {
    return formatDate(start);
  }
  return `${formatDate(start)} / ${formatDate(end)}`;
}

/**
 * Build tag string from tags array: `#tag1 #tag2`
 */
function buildTagString(tags: string[]): string {
  if (tags.length === 0) return '';
  return tags.map((t) => `#${t}`).join(' ');
}

/**
 * Build the first line of a task: `dateRange: title #tags`
 */
function buildFirstLine(
  start: Date,
  end: Date,
  title: string,
  tags: string[],
): string {
  const datePart = buildDateString(start, end);
  const tagPart = buildTagString(tags);
  const parts = [title];
  if (tagPart) parts.push(tagPart);
  return `${datePart}: ${parts.join(' ')}`;
}

/**
 * Build properties lines (e.g., `assignee: name`).
 */
function buildPropertiesLines(assignees: string[]): string[] {
  if (assignees.length === 0) return [];
  if (assignees.length === 1) {
    return [`assignee: ${assignees[0]}`];
  }
  return [`assignees: ${assignees.join(', ')}`];
}

/**
 * Ensure status tags are consistent: remove old status tags
 * and add the new one if not 'none'.
 */
function applyStatusToTags(tags: string[], status: 'todo' | 'doing' | 'done' | 'none'): string[] {
  const statusTags = new Set(['todo', 'doing', 'done']);
  const filtered = tags.filter((t) => !statusTags.has(t.toLowerCase()));
  if (status !== 'none') {
    filtered.push(status);
  }
  return filtered;
}

/**
 * Surgically edit a task within a Markwhen document.
 *
 * Replaces ONLY the text range of the specified task, preserving
 * everything else in the document exactly as-is.
 */
export function editTask(
  document: string,
  task: Task,
  changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>,
): string {
  const { from, to } = task.textRange;

  // Resolve final values by merging changes with current task data
  const title = changes.title ?? task.title;
  const start = changes.start ?? task.start;
  const end = changes.end ?? task.end;
  let tags = changes.tags ?? [...task.tags];
  const assignees = changes.assignees ?? [...task.assignees];

  // If status changed, update tags accordingly
  if (changes.status !== undefined) {
    tags = applyStatusToTags(tags, changes.status);
  }

  // Build new task text
  const firstLine = buildFirstLine(start, end, title, tags);
  const propLines = buildPropertiesLines(assignees);

  const lines = [firstLine, ...propLines];
  const newText = lines.join('\n');

  // Splice: replace only the task's range in the document
  const before = document.slice(0, from);
  const after = document.slice(to);
  return before + newText + after;
}
