import {
  EditorView,
  Decoration,
  type DecorationSet,
  WidgetType,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const TAG_COLOR_LINE = /^(\s*#\w+:\s*)(\S+)\s*$/;

class ColorSwatchWidget extends WidgetType {
  color: string;
  pos: number;
  len: number;

  constructor(color: string, pos: number, len: number) {
    super();
    this.color = color;
    this.pos = pos;
    this.len = len;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-color-swatch';
    wrap.style.cssText = 'display:inline-flex;align-items:center;margin-left:4px;vertical-align:middle;';

    const swatch = document.createElement('span');
    swatch.style.cssText = `display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid rgba(128,128,128,0.4);cursor:pointer;background:${this.color};vertical-align:middle;`;

    const input = document.createElement('input');
    input.type = 'color';
    input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
    try {
      input.value = this.normalizeToHex(this.color);
    } catch {
      input.value = '#000000';
    }

    const pos = this.pos;
    const len = this.len;

    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });

    input.addEventListener('input', () => {
      view.dispatch({
        changes: { from: pos, to: pos + len, insert: input.value },
      });
    });

    wrap.appendChild(swatch);
    wrap.appendChild(input);
    return wrap;
  }

  private normalizeToHex(color: string): string {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
      const r = color[1], g = color[2], b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = color;
    return ctx.fillStyle;
  }

  eq(other: ColorSwatchWidget): boolean {
    return this.color === other.color && this.pos === other.pos && this.len === other.len;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i);
    const match = line.text.match(TAG_COLOR_LINE);
    if (!match) continue;

    const prefixLen = match[1].length;
    const colorStr = match[2];
    const colorFrom = line.from + prefixLen;

    const deco = Decoration.widget({
      widget: new ColorSwatchWidget(colorStr, colorFrom, colorStr.length),
      side: 1,
    });
    builder.add(line.to, line.to, deco);
  }

  return builder.finish();
}

export const colorSwatchPlugin = ViewPlugin.fromClass(
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
