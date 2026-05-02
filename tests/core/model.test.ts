import { describe, it, expect } from 'vitest';
import { parseTasks, parseTagColors } from '../../src/core/model';

describe('parseTagColors', () => {
  it('extracts tag colors from text', () => {
    const text = '#important: red\n#urgent: #ff0000\n\n2024-01-01: Task';
    const colors = parseTagColors(text);
    expect(colors).toEqual({ important: 'red', urgent: '#ff0000' });
  });

  it('returns empty object when no tag colors defined', () => {
    const colors = parseTagColors('2024-01-01: Task');
    expect(colors).toEqual({});
  });

  it('handles indented tag definitions', () => {
    const text = '  #myTag: blue\n2024-01-01: Task';
    const colors = parseTagColors(text);
    expect(colors).toEqual({ myTag: 'blue' });
  });
});

describe('parseTasks', () => {
  it('parses a simple document with one task', () => {
    const text = '2024-01-01 / 2024-01-10: My first task';
    const { tasks } = parseTasks(text);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-0');
    expect(tasks[0].title).toBe('My first task');
    expect(tasks[0].start).toBeInstanceOf(Date);
    expect(tasks[0].end).toBeInstanceOf(Date);
    expect(tasks[0].tags).toEqual([]);
    expect(tasks[0].assignees).toEqual([]);
    expect(tasks[0].milestone).toBe(false);
    expect(tasks[0].status).toBe('none');
    expect(tasks[0].color).toBeNull();
  });

  it('parses tasks with tag colors defined', () => {
    const text = '#important: red\n\n2024-01-01: Task #important';
    const { tasks, tagColors } = parseTasks(text);

    expect(tagColors).toEqual({ important: 'red' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].color).toBe('red');
    expect(tasks[0].tags).toEqual(['important']);
  });

  it('parses tasks in sections', () => {
    const text = '# Development\n2024-01-01 / 2024-01-10: Build feature\n\n# Testing\n2024-02-01 / 2024-02-05: Write tests';
    const { tasks } = parseTasks(text);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].section).toBe('Development');
    expect(tasks[0].title).toBe('Build feature');
    expect(tasks[1].section).toBe('Testing');
    expect(tasks[1].title).toBe('Write tests');
  });

  it('parses milestones (single date)', () => {
    const text = '2024-06-15: Launch day';
    const { tasks } = parseTasks(text);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].milestone).toBe(true);
    expect(tasks[0].title).toBe('Launch day');
  });

  it('parses assignees from properties', () => {
    const text = '2024-01-01 / 2024-01-10: Task A\nassignee: Alice\n\n2024-02-01 / 2024-02-10: Task B\nassignees: Bob, Charlie';
    const { tasks } = parseTasks(text);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].assignees).toEqual(['Alice']);
    expect(tasks[1].assignees).toEqual(['Bob', 'Charlie']);
  });

  it('parses multiple tags', () => {
    const text = '2024-01-01: Task #feature #urgent #todo';
    const { tasks } = parseTasks(text);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].tags).toContain('feature');
    expect(tasks[0].tags).toContain('urgent');
    expect(tasks[0].tags).toContain('todo');
    expect(tasks[0].status).toBe('todo');
  });

  it('returns empty array for empty document', () => {
    const { tasks } = parseTasks('');
    expect(tasks).toEqual([]);
  });

  it('assigns correct color from first tag', () => {
    const text = '#feature: blue\n#urgent: orange\n\n2024-01-01: Task #feature #urgent';
    const { tasks } = parseTasks(text);

    expect(tasks[0].color).toBe('blue');
  });

  it('returns null color when tag has no color defined', () => {
    const text = '2024-01-01: Task #uncolored';
    const { tasks } = parseTasks(text);

    expect(tasks[0].color).toBeNull();
  });

  it('generates sequential task IDs', () => {
    const text = '2024-01-01: Task A\n2024-01-02: Task B\n2024-01-03: Task C';
    const { tasks } = parseTasks(text);

    expect(tasks[0].id).toBe('task-0');
    expect(tasks[1].id).toBe('task-1');
    expect(tasks[2].id).toBe('task-2');
  });

  it('stores text ranges for each task', () => {
    const text = '2024-01-01: Task A\n2024-01-02: Task B';
    const { tasks } = parseTasks(text);

    expect(tasks[0].textRange.from).toBe(0);
    expect(tasks[0].textRange.to).toBeGreaterThan(0);
    expect(tasks[1].textRange.from).toBeGreaterThan(tasks[0].textRange.from);
  });
});
