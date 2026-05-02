import { useMemo } from 'react';
import { parseTasks, type Task } from '../core/model';

export function useModel(text: string): { tasks: Task[]; tagColors: Record<string, string> } {
  return useMemo(() => {
    if (!text.trim()) return { tasks: [], tagColors: {} };
    try {
      return parseTasks(text);
    } catch {
      return { tasks: [], tagColors: {} };
    }
  }, [text]);
}
