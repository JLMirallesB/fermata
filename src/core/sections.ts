import type { Task } from './model';

export interface SectionNode {
  name: string;
  path: string[];
  key: string;
  children: SectionNode[];
  tasks: Task[];
}

export function buildSectionTree(tasks: Task[]): SectionNode {
  const root: SectionNode = { name: '', path: [], key: '', children: [], tasks: [] };

  for (const task of tasks) {
    let current = root;
    for (let i = 0; i < task.sectionPath.length; i++) {
      const name = task.sectionPath[i];
      const key = task.sectionPath.slice(0, i + 1).join(' > ');
      let child = current.children.find((c) => c.name === name);
      if (!child) {
        child = { name, path: task.sectionPath.slice(0, i + 1), key, children: [], tasks: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.tasks.push(task);
  }

  return root;
}

export function collectAllSectionKeys(node: SectionNode): string[] {
  const keys: string[] = [];
  if (node.key) keys.push(node.key);
  for (const child of node.children) {
    keys.push(...collectAllSectionKeys(child));
  }
  return keys;
}

export function collectUniqueSections(tasks: Task[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const task of tasks) {
    for (let i = 0; i < task.sectionPath.length; i++) {
      const key = task.sectionPath.slice(0, i + 1).join(' > ');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}
