import type { Task } from './model';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatIcsDate(date: Date): string {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

function formatIcsDateTime(date: Date): string {
  return (
    formatIcsDate(date) +
    'T' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;
  const parts: string[] = [line.slice(0, MAX)];
  let i = MAX;
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return parts.join('\r\n');
}

function uid(task: Task, index: number): string {
  const base = task.eventId ?? task.id;
  return `${base}-${index}@fermata`;
}

export function exportIcs(tasks: Task[]): string {
  const now = formatIcsDateTime(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fermata//Fermata//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < sorted.length; i++) {
    const task = sorted[i];
    const isAllDay =
      task.start.getHours() === 0 &&
      task.start.getMinutes() === 0 &&
      task.end.getHours() === 0 &&
      task.end.getMinutes() === 0;

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid(task, i)}`));
    lines.push(`DTSTAMP:${now}`);

    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(task.start)}`);
      if (task.milestone) {
        lines.push(`DTEND;VALUE=DATE:${formatIcsDate(task.start)}`);
      } else {
        const endPlusOne = new Date(task.end);
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endPlusOne)}`);
      }
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(task.start)}`);
      lines.push(`DTEND:${formatIcsDateTime(task.end)}`);
    }

    lines.push(foldLine(`SUMMARY:${escapeIcsText(task.title)}`));

    const descParts: string[] = [];
    if (task.section) descParts.push(task.section);
    if (task.notes.length > 0) descParts.push(...task.notes);
    if (task.checklist.length > 0) {
      for (const item of task.checklist) {
        descParts.push(`${item.checked ? '[x]' : '[ ]'} ${item.label}`);
      }
    }
    if (descParts.length > 0) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`));
    }

    if (task.tags.length > 0) {
      lines.push(foldLine(`CATEGORIES:${task.tags.map(escapeIcsText).join(',')}`));
    }

    if (task.status === 'done') {
      lines.push('STATUS:COMPLETED');
    } else if (task.status === 'doing') {
      lines.push('STATUS:IN-PROCESS');
    } else if (task.status === 'todo') {
      lines.push('STATUS:NEEDS-ACTION');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
