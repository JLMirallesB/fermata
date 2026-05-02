export type KanbanStatus = 'todo' | 'doing' | 'done' | 'none';

export function deriveStatus(tags: string[]): KanbanStatus {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.includes('todo')) return 'todo';
  if (lower.includes('doing')) return 'doing';
  if (lower.includes('done')) return 'done';
  return 'none';
}
