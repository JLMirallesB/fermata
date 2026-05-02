import { StreamLanguage, type StreamParser } from '@codemirror/language';

interface MarkwhenState {
  inHeader: boolean;
}

const markwhenParser: StreamParser<MarkwhenState> = {
  startState(): MarkwhenState {
    return { inHeader: true };
  },
  token(stream, _state): string | null {
    // Comments: //
    if (stream.match(/^\/\/.*/)) {
      return 'comment';
    }

    // Checked checkbox: - [x]
    if (stream.match(/^-\s*\[x\]/i)) {
      return 'meta';
    }

    // Unchecked checkbox: - [ ]
    if (stream.match(/^-\s*\[ \]/)) {
      return 'punctuation';
    }

    // Header keys at line start
    if (stream.sol() && stream.match(/^(title|dateFormat|description|view|timezone|tz):/)) {
      return 'keyword';
    }

    // Tag definitions at line start: #tagname: color
    if (stream.sol() && stream.match(/^#\w+:/)) {
      return 'tag';
    }

    // Section headers: # Section Name (markdown style)
    if (stream.sol() && stream.match(/^#{1,6}\s+.*/)) {
      return 'heading';
    }

    // Property keys: assignee:, assignees:, or any key: value
    if (stream.sol() && stream.match(/^\s*(assignee|assignees|location|id|percent|completed):/)) {
      return 'propertyName';
    }

    // Generic property key at start of line
    if (stream.sol() && stream.match(/^\s*[\w\-.]+:/)) {
      return 'propertyName';
    }

    // Date ranges: YYYY-MM-DD / YYYY-MM-DD
    if (stream.match(/^\d{4}-\d{2}-\d{2}\s*\/\s*\d{4}-\d{2}-\d{2}/)) {
      return 'number';
    }
    // Single dates: YYYY-MM-DD
    if (stream.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'number';
    }

    // European/American dates: d/m/y
    if (stream.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
      return 'number';
    }

    // Inline tags: #tagname
    if (stream.match(/^#\w+/)) {
      return 'tag';
    }

    // List item indicator: -
    if (stream.sol() && stream.match(/^-\s/)) {
      return 'punctuation';
    }

    stream.next();
    return null;
  },
};

export const markwhenLanguage = StreamLanguage.define(markwhenParser);
