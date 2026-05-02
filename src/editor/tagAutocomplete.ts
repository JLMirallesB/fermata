import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

const TAG_DEF_REGEX = /^\s*#(\w+):\s*(\S+)/;

function extractDefinedTags(doc: string): { tag: string; color: string }[] {
  const tags: { tag: string; color: string }[] = [];
  for (const line of doc.split('\n')) {
    const m = line.match(TAG_DEF_REGEX);
    if (m) tags.push({ tag: m[1], color: m[2] });
  }
  return tags;
}

export function tagCompletionSource(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/#\w*/);
  if (!before) return null;

  const line = context.state.doc.lineAt(before.from);
  const lineText = line.text;

  if (TAG_DEF_REGEX.test(lineText) && lineText.indexOf(':') < before.from - line.from) {
    return null;
  }
  if (/^\s*#\w*:\s*$/.test(lineText.slice(0, before.from - line.from + before.text.length))) {
    return null;
  }

  const tags = extractDefinedTags(context.state.doc.toString());
  if (tags.length === 0) return null;

  const typed = before.text.slice(1).toLowerCase();

  return {
    from: before.from,
    options: tags
      .filter((t) => t.tag.toLowerCase().includes(typed))
      .map((t) => ({
        label: `#${t.tag}`,
        type: 'keyword',
        boost: t.tag.toLowerCase().startsWith(typed) ? 1 : 0,
        apply: `#${t.tag}`,
        detail: t.color,
      })),
    validFor: /^#\w*$/,
  };
}
