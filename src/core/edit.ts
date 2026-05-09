import { parseTasks, type Task, type ChecklistItem } from './model.js';

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
 * Only modifies the first line and assignee properties,
 * preserving checklists, comments, id, depends, and all other content.
 */
export function editTask(
  document: string,
  task: Task,
  changes: Partial<Pick<Task, 'title' | 'start' | 'end' | 'tags' | 'assignees' | 'status'>>,
): string {
  const { from, to } = task.textRange;
  const taskText = document.slice(from, to);
  const taskLines = taskText.split('\n');

  const title = changes.title ?? task.title;
  const start = changes.start ?? task.start;
  const end = changes.end ?? task.end;
  let tags = changes.tags ?? [...task.tags];
  const assignees = changes.assignees ?? [...task.assignees];

  if (changes.status !== undefined) {
    tags = applyStatusToTags(tags, changes.status);
  }

  // Replace only the first line
  taskLines[0] = buildFirstLine(start, end, title, tags);

  // Update assignee/assignees property lines
  const assigneeIdx = taskLines.findIndex((l) => /^\s*assignees?:/.test(l));
  const newAssigneeLines = buildPropertiesLines(assignees);

  if (assigneeIdx >= 0) {
    if (newAssigneeLines.length > 0) {
      taskLines[assigneeIdx] = newAssigneeLines[0];
    } else {
      taskLines.splice(assigneeIdx, 1);
    }
  } else if (newAssigneeLines.length > 0) {
    // Insert after first line, before any checklist/comment
    let insertAt = 1;
    while (insertAt < taskLines.length && /^\s*[\w\-.]+:/.test(taskLines[insertAt])) {
      insertAt++;
    }
    taskLines.splice(insertAt, 0, newAssigneeLines[0]);
  }

  const newText = taskLines.join('\n');
  return document.slice(0, from) + newText + document.slice(to);
}

/**
 * Toggle a single checklist item's checked state.
 * Replaces `[x]` with `[ ]` or vice versa at the item's range.
 */
export function toggleChecklistItem(
  document: string,
  item: ChecklistItem,
): string {
  const { from, to } = item.range;
  const replacement = item.checked ? '[ ]' : '[x]';
  return document.slice(0, from) + replacement + document.slice(to);
}

/**
 * Replace all notes (comments) of a task with new content.
 * Edits from last to first to keep offsets valid.
 */
export function editTaskNotes(
  document: string,
  task: Task,
  newNotes: string[],
): string {
  const oldRanges = task.noteRanges;
  let result = document;

  // Remove old notes from last to first
  for (let i = oldRanges.length - 1; i >= 0; i--) {
    const { from, to } = oldRanges[i];
    const lineStart = result.lastIndexOf('\n', from - 1) + 1;
    const lineEnd = result.indexOf('\n', to);
    const deleteEnd = lineEnd === -1 ? result.length : lineEnd + 1;
    result = result.slice(0, lineStart) + result.slice(deleteEnd);
  }

  if (newNotes.length === 0) return result;

  // Find insertion point: after the first line of the task
  const reparsed = parseTasks(result);
  const updatedTask = reparsed.tasks.find((t) => t.id === task.id);
  if (!updatedTask) return result;

  const firstLineEnd = result.indexOf('\n', updatedTask.textRange.from);
  if (firstLineEnd === -1) {
    const notesText = '\n' + newNotes.map((n) => `// ${n}`).join('\n');
    return result + notesText;
  }

  const notesText = newNotes.map((n) => `// ${n}`).join('\n') + '\n';
  return result.slice(0, firstLineEnd + 1) + notesText + result.slice(firstLineEnd + 1);
}

export function editTaskDepends(
  document: string,
  task: Task,
  depends: string[],
): string {
  const taskText = document.slice(task.textRange.from, task.textRange.to);
  const lines = taskText.split('\n');

  const dependsIdx = lines.findIndex((l) => /^\s*depends:/.test(l));

  if (depends.length === 0) {
    if (dependsIdx >= 0) {
      lines.splice(dependsIdx, 1);
    }
  } else {
    const newLine = `depends: ${depends.join(', ')}`;
    if (dependsIdx >= 0) {
      lines[dependsIdx] = newLine;
    } else {
      const insertAfter = lines.findIndex((l, i) => i > 0 && /^\s*\w+:/.test(l));
      if (insertAfter >= 0) {
        lines.splice(insertAfter + 1, 0, newLine);
      } else {
        lines.splice(1, 0, newLine);
      }
    }
  }

  const newText = lines.join('\n');
  return document.slice(0, task.textRange.from) + newText + document.slice(task.textRange.to);
}
