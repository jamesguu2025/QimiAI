import { RAGSource } from '../types/api';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAuthorSurname(source: RAGSource): string | null {
  const firstAuthor = Array.isArray(source.authors) ? source.authors[0] : null;
  if (!firstAuthor) return null;

  const cleaned = firstAuthor.trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/\s+/);
  return parts[0] || null;
}

function isInsideMarkdownLink(content: string, startIndex: number, endIndex: number): boolean {
  const previousOpenBracket = content.lastIndexOf('[', startIndex);
  const previousCloseBracket = content.lastIndexOf(']', startIndex);
  const nextCloseBracket = content.indexOf(']', endIndex);
  const nextOpenParen = content.indexOf('(', endIndex);

  return (
    previousOpenBracket > previousCloseBracket &&
    nextCloseBracket !== -1 &&
    nextOpenParen === nextCloseBracket + 1
  );
}

export function linkifyResearchCitations(content: string, sources?: RAGSource[]): string {
  if (!content || !sources || sources.length === 0) return content;

  let linkedContent = content;

  for (const source of sources) {
    if (!source.url || !source.year) continue;

    const surname = getAuthorSurname(source);
    if (!surname) continue;

    const year = String(source.year);
    const pattern = new RegExp(`\\b${escapeRegExp(surname)}\\s+et\\s+al\\.?(?:\\s*\\(${escapeRegExp(year)}\\)|,?\\s+${escapeRegExp(year)})`, 'gi');

    linkedContent = linkedContent.replace(pattern, (match, offset: number) => {
      const endIndex = offset + match.length;
      if (isInsideMarkdownLink(linkedContent, offset, endIndex)) {
        return match;
      }

      return `[${match}](${source.url})`;
    });
  }

  return linkedContent;
}
