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

    // Header keys: title:, dateFormat:, description:, view:, etc. (at line start)
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

    // Property keys: assignee:, assignees:, or any key: at start of line with leading whitespace allowed
    if (stream.sol() && stream.match(/^\s*\w+:/)) {
      return 'propertyName';
    }

    // Date ranges: YYYY-MM-DD / YYYY-MM-DD or single dates YYYY-MM-DD
    if (stream.match(/^\d{4}-\d{2}-\d{2}\s*\/\s*\d{4}-\d{2}-\d{2}/)) {
      return 'number';
    }
    if (stream.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'number';
    }

    // Also match relative dates and casual dates: month year, etc.
    // Match date-like patterns more loosely
    if (stream.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
      return 'number';
    }

    // Inline tags: #tagname (not at line start or after a tag definition)
    if (stream.match(/^#\w+/)) {
      return 'tag';
    }

    // Skip to next interesting character
    stream.next();
    return null;
  },
};

export const markwhenLanguage = StreamLanguage.define(markwhenParser);
