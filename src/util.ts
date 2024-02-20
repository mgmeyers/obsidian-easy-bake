import {
  BlockSubpathResult,
  CachedMetadata,
  HeadingSubpathResult,
} from 'obsidian';

export const wordCountRE = /\P{Z}*[\p{L}\p{N}]\P{Z}*/gu;
export const commentRE = /(?:<!--[\s\S]*?-->|%%[\s\S]*?(?!%%)[\s\S]+?%%)/g;

export function stripComments(text: string): string {
  return text.replace(commentRE, '');
}

export function getWordCount(text: string): number {
  return (stripComments(text).match(wordCountRE) || []).length;
}

export function dedent(text: string) {
  const firstIndent = text.match(/^([ \t]*)/);
  if (firstIndent) {
    return text.replace(
      //                            Escape tab chars
      new RegExp(`^${firstIndent[0].replace(/\\/g, '\\$&')}`, 'gm'),
      ''
    );
  }
  return text;
}

export function applyIndent(text: string, indent?: string) {
  if (!indent) return text;
  return text.trim().replace(/(\r?\n)/g, `$1${indent}`);
}

export function stripFirstBullet(text: string) {
  if (!text) return text;
  return text.replace(/^[ \t]*(?:[-*+]|[0-9]+[.)]) +/, '');
}

export function stripBlockId(text: string) {
  if (!text) return text;
  return text.replace(/ +\^[^ \n\r]+$/gm, '');
}

export function stripFrontmatter(text: string) {
  if (!text) return text;
  return text.replace(/^---[\s\S]+?\r?\n---(?:\r?\n\s*|$)/, '');
}

export function sanitizeBakedContent(text: string) {
  return stripBlockId(stripFrontmatter(text));
}

export function extractSubpath(
  content: string,
  subpathResult: HeadingSubpathResult | BlockSubpathResult,
  cache: CachedMetadata
) {
  let text = content;

  if (subpathResult.type === 'block' && subpathResult.list && cache.listItems) {
    const targetItem = subpathResult.list;
    const ancestors = new Set<number>([targetItem.position.start.line]);
    const start =
      targetItem.position.start.offset - targetItem.position.start.col;

    let end = targetItem.position.end.offset;
    let found = false;

    for (const item of cache.listItems) {
      if (targetItem === item) {
        found = true;
        continue;
      } else if (!found) {
        // Keep seeking until we find the target
        continue;
      }

      if (!ancestors.has(item.parent)) break;
      ancestors.add(item.position.start.line);
      end = item.position.end.offset;
    }

    text = stripBlockId(dedent(content.substring(start, end)));
  } else {
    const start = subpathResult.start.offset;
    const end = subpathResult.end ? subpathResult.end.offset : content.length;
    text = stripBlockId(content.substring(start, end));
  }

  return text;
}
