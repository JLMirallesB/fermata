import { foldService } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

const HEADING_REGEX = /^(#{1,6})\s+/;

function headingLevel(line: string): number {
  const m = line.match(HEADING_REGEX);
  return m ? m[1].length : 0;
}

export const foldHeadingsService = foldService.of(
  (state: EditorState, lineStart: number) => {
    const line = state.doc.lineAt(lineStart);
    const level = headingLevel(line.text);
    if (level === 0) return null;

    let end = line.to;
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const next = state.doc.line(i);
      const nextLevel = headingLevel(next.text);
      if (nextLevel > 0 && nextLevel <= level) break;
      end = next.to;
    }

    if (end <= line.to) return null;
    return { from: line.to, to: end };
  },
);
