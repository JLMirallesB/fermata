import { gutter, GutterMarker, type EditorView } from '@codemirror/view';

let globalCallback: ((lineNo: number, view: EditorView) => void) | null = null;

export function setAddEventCallback(cb: ((lineNo: number, view: EditorView) => void) | null) {
  globalCallback = cb;
}

class AddEventMarker extends GutterMarker {
  lineNo: number;

  constructor(lineNo: number) {
    super();
    this.lineNo = lineNo;
  }

  toDOM(view: EditorView): Node {
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-block;width:16px;height:100%;position:relative;';

    const btn = document.createElement('span');
    btn.textContent = '+';
    btn.style.cssText = 'cursor:pointer;font-size:14px;font-weight:700;color:#6366f1;line-height:1;padding:0 2px;border-radius:2px;opacity:0;transition:opacity 0.15s;position:absolute;top:50%;transform:translateY(-50%);';

    wrap.appendChild(btn);

    wrap.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
    });
    wrap.addEventListener('mouseleave', () => {
      btn.style.opacity = '0';
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'rgba(99,102,241,0.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (globalCallback) globalCallback(this.lineNo, view);
    });
    return wrap;
  }
}

export const addEventGutter = gutter({
  class: 'cm-add-event-gutter',
  lineMarker(view, line) {
    const lineObj = view.state.doc.lineAt(line.from);
    if (lineObj.text.trim() === '') {
      return new AddEventMarker(lineObj.number);
    }
    return null;
  },
});
