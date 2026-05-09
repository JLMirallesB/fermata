import { useRef, useEffect } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { autocompletion } from '@codemirror/autocomplete';
import { markwhenLanguage } from './markwhenLang';
import { colorSwatchPlugin } from './colorWidgets';
import { tagDotsPlugin } from './tagDots';
import { tagCompletionSource } from './tagAutocomplete';
import { foldHeadingsService } from './foldHeadings';
import { addEventGutter, setAddEventCallback } from './addEventGutter';

const lightTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  '.cm-content': { padding: '8px 0' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
}, { dark: false });

const darkTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', backgroundColor: '#111827', color: '#d1d5db' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  '.cm-content': { padding: '8px 0', caretColor: '#e5e7eb' },
  '.cm-cursor': { borderLeftColor: '#e5e7eb' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: '#6b7280' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.05)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(99,102,241,0.3) !important' },
}, { dark: true });

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#4f46e5', fontWeight: '600' },
  { tag: tags.tagName, color: '#7c3aed' },
  { tag: tags.heading, color: '#1e40af', fontWeight: '600' },
  { tag: tags.propertyName, color: '#6d28d9' },
  { tag: tags.number, color: '#0e7490' },
  { tag: tags.meta, color: '#15803d', fontWeight: '600' },
  { tag: tags.punctuation, color: '#9ca3af' },
  { tag: tags.string, color: '#047857' },
]);

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.keyword, color: '#a5b4fc', fontWeight: '600' },
  { tag: tags.tagName, color: '#c4b5fd' },
  { tag: tags.heading, color: '#93c5fd', fontWeight: '600' },
  { tag: tags.propertyName, color: '#a78bfa' },
  { tag: tags.number, color: '#67e8f9' },
  { tag: tags.meta, color: '#4ade80', fontWeight: '600' },
  { tag: tags.punctuation, color: '#6b7280' },
  { tag: tags.string, color: '#34d399' },
]);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  dark?: boolean;
  onCreateEvent?: (insertAt: number) => void;
}

export function Editor({ value, onChange, dark = false, onCreateEvent }: EditorProps) {
  const onCreateEventRef = useRef(onCreateEvent);
  onCreateEventRef.current = onCreateEvent;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = dark;

    setAddEventCallback((lineNo, view) => {
      const line = view.state.doc.line(lineNo);
      if (onCreateEventRef.current) {
        onCreateEventRef.current(line.from);
      }
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        foldGutter(),
        addEventGutter,
        foldHeadingsService,
        highlightActiveLine(),
        highlightSpecialChars(),
        drawSelection(),
        rectangularSelection(),
        history(),
        bracketMatching(),
        highlightSelectionMatches(),
        isDark ? darkTheme : lightTheme,
        syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
        markwhenLanguage,
        colorSwatchPlugin,
        tagDotsPlugin,
        autocompletion({
          override: [tagCompletionSource],
          activateOnTyping: true,
        }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate editor when theme changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-white dark:bg-gray-900"
    />
  );
}
