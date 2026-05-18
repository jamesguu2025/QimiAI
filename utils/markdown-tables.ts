export function extractMarkdownTables(markdown: string, maxTables = 3): string[] {
  const lines = markdown.split(/\r?\n/);
  const tables: string[] = [];
  const seen = new Set<string>();

  const isPipeRow = (line: string) => {
    const trimmed = line.trim();
    return trimmed.includes('|') && trimmed.replace(/\|/g, '').trim().length > 0;
  };

  const isSeparatorRow = (line: string) => (
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
  );

  for (let index = 1; index < lines.length; index++) {
    if (!isSeparatorRow(lines[index]) || !isPipeRow(lines[index - 1])) continue;

    let start = index - 1;
    while (start > 0 && isPipeRow(lines[start - 1])) {
      start--;
    }

    let end = index + 1;
    while (end < lines.length && isPipeRow(lines[end])) {
      end++;
    }

    const table = lines.slice(start, end).join('\n').trim();
    if (!seen.has(table) && table.split('\n').length >= 3) {
      seen.add(table);
      tables.push(table.slice(0, 4000));
      if (tables.length >= maxTables) break;
    }
  }

  return tables;
}
