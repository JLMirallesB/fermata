import { describe, it, expect } from 'vitest';
import { editTask, formatDate } from '../../src/core/edit';
import { parseTasks } from '../../src/core/model';

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const d = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDate(d)).toBe('2024-01-15');
  });

  it('pads single-digit months and days', () => {
    const d = new Date(2024, 2, 5); // Mar 5, 2024
    expect(formatDate(d)).toBe('2024-03-05');
  });
});

describe('editTask', () => {
  it('changes a task title, rest of document unchanged', () => {
    const doc = '2024-01-01 / 2024-01-10: Original title';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { title: 'New title' });

    expect(result).toContain('New title');
    expect(result).not.toContain('Original title');
    expect(result).toContain('2024-01-01');
  });

  it('changes a task dates', () => {
    const doc = '2024-01-01 / 2024-01-10: My task';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      start: new Date(2024, 5, 1),
      end: new Date(2024, 5, 15),
    });

    expect(result).toContain('2024-06-01 / 2024-06-15');
    expect(result).toContain('My task');
  });

  it('adds a tag to a task', () => {
    const doc = '2024-01-01 / 2024-01-10: My task';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      tags: ['urgent'],
    });

    expect(result).toContain('#urgent');
    expect(result).toContain('My task');
  });

  it('removes a tag from a task', () => {
    const doc = '2024-01-01 / 2024-01-10: My task #urgent #feature';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      tags: ['feature'],
    });

    expect(result).toContain('#feature');
    expect(result).not.toContain('#urgent');
  });

  it('changes assignee', () => {
    const doc = '2024-01-01 / 2024-01-10: My task\nassignee: Alice';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      assignees: ['Bob'],
    });

    expect(result).toContain('assignee: Bob');
    expect(result).not.toContain('Alice');
  });

  it('adds assignee to task that had none', () => {
    const doc = '2024-01-01 / 2024-01-10: My task';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      assignees: ['Alice'],
    });

    expect(result).toContain('assignee: Alice');
    expect(result).toContain('My task');
  });

  it('edits a task in the middle of a document, preserving surrounding text', () => {
    const doc = [
      '2024-01-01 / 2024-01-10: First task',
      '',
      '2024-02-01 / 2024-02-10: Middle task',
      '',
      '2024-03-01 / 2024-03-10: Last task',
    ].join('\n');

    const { tasks } = parseTasks(doc);
    const middleTask = tasks[1];
    const result = editTask(doc, middleTask, { title: 'Updated middle' });

    // The text before and after should be preserved
    expect(result).toContain('First task');
    expect(result).toContain('Last task');
    expect(result).toContain('Updated middle');
    expect(result).not.toContain('Middle task');
  });

  it('preserves comments in document when editing a task between others', () => {
    const doc = [
      '// Header comment',
      '',
      '2024-01-01 / 2024-01-10: First task',
      '',
      '// Middle comment',
      '',
      '2024-02-01 / 2024-02-10: Second task',
      '',
      '2024-03-01 / 2024-03-10: Third task',
    ].join('\n');

    const { tasks } = parseTasks(doc);
    // Edit the third task (whose range does not include the middle comment)
    const result = editTask(doc, tasks[2], { title: 'Updated third' });

    expect(result).toContain('// Header comment');
    expect(result).toContain('// Middle comment');
    expect(result).toContain('First task');
    expect(result).toContain('Second task');
    expect(result).toContain('Updated third');
    expect(result).not.toContain('Third task');
  });

  it('edits a milestone (single date) to become a range', () => {
    const doc = '2024-06-15: Launch day';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      start: new Date(2024, 5, 15),
      end: new Date(2024, 5, 20),
    });

    expect(result).toContain('2024-06-15 / 2024-06-20');
    expect(result).toContain('Launch day');
  });

  it('changes status by updating tags', () => {
    const doc = '2024-01-01 / 2024-01-10: My task #todo';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { status: 'done' });

    expect(result).toContain('#done');
    expect(result).not.toContain('#todo');
  });

  it('removes status tags when setting status to none', () => {
    const doc = '2024-01-01 / 2024-01-10: My task #doing #feature';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { status: 'none' });

    expect(result).toContain('#feature');
    expect(result).not.toContain('#doing');
  });

  it('handles multiple assignees', () => {
    const doc = '2024-01-01 / 2024-01-10: Team task';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], {
      assignees: ['Alice', 'Bob', 'Charlie'],
    });

    expect(result).toContain('assignees: Alice, Bob, Charlie');
  });

  it('removes assignees when setting empty array', () => {
    const doc = '2024-01-01 / 2024-01-10: My task\nassignee: Alice';
    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { assignees: [] });

    expect(result).not.toContain('assignee');
    expect(result).toContain('My task');
  });

  it('preserves checklists, id, depends and comments when editing title', () => {
    const doc = [
      '2024-01-01 / 2024-01-10: Original task #fase1',
      'id: task-a',
      'depends: task-b',
      'assignee: Ana',
      '- [x] Step one',
      '- [ ] Step two',
      '// Important note',
    ].join('\n');

    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { title: 'Updated task' });

    expect(result).toContain('Updated task');
    expect(result).toContain('id: task-a');
    expect(result).toContain('depends: task-b');
    expect(result).toContain('assignee: Ana');
    expect(result).toContain('- [x] Step one');
    expect(result).toContain('- [ ] Step two');
    expect(result).toContain('// Important note');
  });

  it('preserves checklists and comments when changing assignee', () => {
    const doc = [
      '2024-01-01 / 2024-01-10: My task',
      'assignee: Alice',
      '- [x] Done item',
      '// A comment',
    ].join('\n');

    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { assignees: ['Bob'] });

    expect(result).toContain('assignee: Bob');
    expect(result).not.toContain('Alice');
    expect(result).toContain('- [x] Done item');
    expect(result).toContain('// A comment');
  });

  it('preserves tag colors and other header content', () => {
    const doc = [
      '#important: red',
      '#urgent: orange',
      '',
      '2024-01-01: My task #important',
    ].join('\n');

    const { tasks } = parseTasks(doc);
    const result = editTask(doc, tasks[0], { title: 'Updated task' });

    expect(result).toContain('#important: red');
    expect(result).toContain('#urgent: orange');
    expect(result).toContain('Updated task');
  });
});
