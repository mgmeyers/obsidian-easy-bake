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

function dedent(str: string) {
  const firstIndent = str.match(/^([ \t]*)/);
  if (firstIndent) {
    return str.replace(
      // Escape tab chars
      new RegExp(`^${firstIndent[0].replace(/\\/g, '\\$&')}`, 'gm'),
      ''
    );
  }
  return str;
}

function stripBlockId(str: string) {
  return str.replace(/ +\^[^ \n\r]+$/gm, '');
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
