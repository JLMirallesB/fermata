import {
  Decoration,
  type DecorationSet,
  WidgetType,
  ViewPlugin,
  type ViewUpdate,
  EditorView,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const TAG_DEF_REGEX = /^\s*#(\w+):\s*(\S+)/;
const INLINE_TAG_REGEX = /#(\w+)/g;

class TagDotWidget extends WidgetType {
  tagColor: string;

  constructor(tagColor: string) {
    super();
    this.tagColor = tagColor;
  }

  toDOM(): HTMLElement {
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:2px;vertical-align:middle;background:${this.tagColor};`;
    return dot;
  }

  eq(other: TagDotWidget): boolean {
    return this.tagColor === other.tagColor;
  }
}

function extractTagColors(doc: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const line of doc.split('\n')) {
    const m = line.match(TAG_DEF_REGEX);
    if (m) colors[m[1]] = m[2];
  }
  return colors;
}

function isTagDefLine(text: string): boolean {
  return TAG_DEF_REGEX.test(text);
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const colors = extractTagColors(view.state.doc.toString());

  if (Object.keys(colors).length === 0) return builder.finish();

  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i);
    if (isTagDefLine(line.text)) continue;

    let match: RegExpExecArray | null;
    INLINE_TAG_REGEX.lastIndex = 0;
    while ((match = INLINE_TAG_REGEX.exec(line.text)) !== null) {
      const tagName = match[1];
      const color = colors[tagName];
      if (!color) continue;
      const pos = line.from + match.index;
      builder.add(pos, pos, Decoration.widget({
        widget: new TagDotWidget(color),
        side: -1,
      }));
    }
  }

  return builder.finish();
}

export const tagDotsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
