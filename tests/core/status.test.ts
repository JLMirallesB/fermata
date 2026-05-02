import { describe, it, expect } from 'vitest';
import { deriveStatus } from '../../src/core/status';

describe('deriveStatus', () => {
  it('returns "todo" when tags include "todo"', () => {
    expect(deriveStatus(['todo'])).toBe('todo');
  });

  it('returns "doing" when tags include "doing"', () => {
    expect(deriveStatus(['doing'])).toBe('doing');
  });

  it('returns "done" when tags include "done"', () => {
    expect(deriveStatus(['done'])).toBe('done');
  });

  it('returns "none" when no status tags are present', () => {
    expect(deriveStatus(['feature', 'urgent'])).toBe('none');
  });

  it('returns "none" for empty tags', () => {
    expect(deriveStatus([])).toBe('none');
  });

  it('prioritizes "todo" over "doing" and "done"', () => {
    expect(deriveStatus(['doing', 'todo', 'done'])).toBe('todo');
  });

  it('prioritizes "doing" over "done"', () => {
    expect(deriveStatus(['done', 'doing'])).toBe('doing');
  });

  it('is case-insensitive', () => {
    expect(deriveStatus(['TODO'])).toBe('todo');
    expect(deriveStatus(['Doing'])).toBe('doing');
    expect(deriveStatus(['DONE'])).toBe('done');
  });

  it('works with status tag among other tags', () => {
    expect(deriveStatus(['feature', 'todo', 'urgent'])).toBe('todo');
  });
});
