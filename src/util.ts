export const wordCountRE = /\P{Z}*[\p{L}\p{N}]\P{Z}*/gu;
export const commentRE = /(?:<!--[\s\S]*?-->|%%[\s\S]*?(?!%%)[\s\S]+?%%)/g;

export function stripComments(text: string): string {
  return text.replace(commentRE, '');
}

export function getWordCount(text: string): number {
  return (stripComments(text).match(wordCountRE) || []).length;
}
