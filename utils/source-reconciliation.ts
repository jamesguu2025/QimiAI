/**
 * Source reconciliation.
 *
 * Extracts URLs, DOI strings, and PMID references from the final assistant
 * answer and matches them against the current/cached source set. Returns
 * the reconciled source list (injected sources + matched cited sources)
 * without adding unrelated retrieval noise.
 */

type ChatSource = {
  title: string;
  url: string;
  snippet?: string;
  year?: number | string;
  journal?: string;
  authors?: string[];
  authors_detailed?: Array<{
    name?: string;
    lastname?: string;
    firstname?: string;
    initials?: string;
    affiliation?: string;
    affiliations?: string[];
  }> | null;
  journal_country?: string | null;
  doi?: string;
  pmid?: string;
};

/**
 * Extract all URLs, DOI references, and PMID URLs from text.
 */
export function extractCitationIdentifiers(text: string): Set<string> {
  const ids = new Set<string>();

  // Markdown links: [text](url)
  const mdLinkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRe.exec(text)) !== null) {
    ids.add(match[2]);
  }

  // Bare URLs
  const urlRe = /https?:\/\/[^\s)\]>"']+/g;
  while ((match = urlRe.exec(text)) !== null) {
    ids.add(match[0]);
  }

  // DOI references
  const doiRe = /10\.\d{4,}\/[^\s,;)"']+/g;
  while ((match = doiRe.exec(text)) !== null) {
    ids.add(`https://doi.org/${match[0]}`);
  }

  // PMID references
  const pmidRe = /PMID[:\s]*(\d+)/gi;
  while ((match = pmidRe.exec(text)) !== null) {
    ids.add(`https://pubmed.ncbi.nlm.nih.gov/${match[1]}`);
  }

  return ids;
}

/**
 * Check if a source matches any of the extracted citation identifiers.
 */
function sourceMatchesId(source: ChatSource, ids: Set<string>): boolean {
  if (source.url && ids.has(source.url)) return true;
  if (source.doi) {
    const doiUrl = `https://doi.org/${source.doi}`;
    if (ids.has(doiUrl)) return true;
  }
  if (source.pmid) {
    const pmidUrl = `https://pubmed.ncbi.nlm.nih.gov/${source.pmid}`;
    if (ids.has(pmidUrl)) return true;
  }
  return false;
}

function sourcePoolText(sources: ChatSource[]): string {
  return sources.map((source) => [
    source.title,
    source.url,
    source.doi,
    source.pmid,
    ...(source.authors || []),
    ...(source.authors_detailed || []).flatMap((author) => [
      author.name,
      author.lastname,
      author.firstname,
      author.affiliation,
      ...(author.affiliations || []),
    ]),
  ].filter(Boolean).join(' ')).join(' ').toLowerCase();
}

function sourcePoolHasFamilyName(sourceText: string, familyName: string): boolean {
  const normalized = familyName.replace(/[^a-z-]/gi, '').toLowerCase();
  return normalized.length >= 4 && sourceText.includes(normalized);
}

function sourceFamilyNames(source: ChatSource): string[] {
  const names = new Set<string>();

  for (const author of source.authors || []) {
    const family = author.trim().split(/\s+/)[0]?.replace(/[^a-z-]/gi, '');
    if (family && family.length >= 4) names.add(family.toLowerCase());
  }

  for (const author of source.authors_detailed || []) {
    const family = (author.lastname || author.name?.trim().split(/\s+/).slice(-1)[0] || '')
      .replace(/[^a-z-]/gi, '');
    if (family && family.length >= 4) names.add(family.toLowerCase());
  }

  return [...names];
}

function splitMarkdownLinks(text: string): Array<{ text: string; linked: boolean }> {
  const parts: Array<{ text: string; linked: boolean }> = [];
  const linkRe = /\[[^\]]*\]\([^)]+\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), linked: false });
    }
    parts.push({ text: match[0], linked: true });
    lastIndex = linkRe.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), linked: false });
  }

  return parts;
}

/**
 * Convert plain author-year references into Markdown links only when the
 * reference uniquely matches a current source by family name + year + URL.
 */
export function linkMatchedPlainAuthorYearRefs(text: string, sources: ChatSource[]): string {
  if (!text || sources.length === 0) return text;

  const sourceByKey = new Map<string, ChatSource[]>();
  for (const source of sources) {
    if (!source.url || !source.year) continue;
    const year = String(source.year).match(/\b(20\d{2}|19\d{2})\b/)?.[1];
    if (!year) continue;

    for (const family of sourceFamilyNames(source)) {
      const key = `${family}:${year}`;
      const matches = sourceByKey.get(key) || [];
      matches.push(source);
      sourceByKey.set(key, matches);
    }
  }

  if (sourceByKey.size === 0) return text;

  return splitMarkdownLinks(text).map((part) => {
    if (part.linked) return part.text;

    return part.text.replace(
      /\b([A-Z][a-zA-Z-]{3,})(\s+(?:et\s+al\.?|and\s+[A-Z][a-zA-Z-]{3,}|&\s+[A-Z][a-zA-Z-]{3,}))?[,\s]*(?:\(|,)?\s*(20\d{2}|19\d{2})\)?/g,
      (match, familyName, collaborators, year) => {
        const key = `${familyName.replace(/[^a-z-]/gi, '').toLowerCase()}:${year}`;
        const matches = sourceByKey.get(key) || [];
        if (matches.length !== 1) return match;

        const label = `${familyName}${collaborators || ''} (${year})`;
        return `[${label}](${matches[0].url})`;
      }
    );
  }).join('');
}

/**
 * Remove plain-text study names that are not represented in the current
 * source list. This is a final persistence safeguard; prompts should still
 * prefer linked current-source citations during generation.
 */
export function sanitizeUnmatchedNamedStudyRefs(text: string, sources: ChatSource[]): string {
  if (!text || sources.length === 0) return text;
  const sourceText = sourcePoolText(sources);

  let sanitized = text
    .replace(/\s*\[\[?Source\]?\]\(\[prior source link omitted\]\)/gi, '')
    .replace(/\[prior source link omitted\]/gi, '')
    .replace(/\[prior PMID omitted\]/gi, '');

  sanitized = sanitized.replace(
    /\b([A-Z][a-zA-Z-]{3,})(?:\s+(et\s+al\.?|and\s+[A-Z][a-zA-Z-]{3,}|&\s+[A-Z][a-zA-Z-]{3,}))?[,\s]*(?:\(|,)?\s*(20\d{2}|19\d{2})\)?/g,
    (match, familyName) => sourcePoolHasFamilyName(sourceText, familyName) ? match : 'one retrieved source'
  );

  sanitized = sanitized.replace(
    /\b(20\d{2}|19\d{2})\s+(study|pilot study|review|meta-analysis)\s+by\s*([A-Z][a-zA-Z-]{3,})/g,
    (match, year, studyType, familyName) => sourcePoolHasFamilyName(sourceText, familyName) ? match : `one earlier ${studyType}`
  );

  sanitized = sanitized.replace(
    /\b(the\s+)?([A-Z][a-zA-Z-]{3,})\s+(study|pilot study|review|meta-analysis)\b/g,
    (match, article, familyName) => sourcePoolHasFamilyName(sourceText, familyName) ? match : 'one retrieved source'
  );

  return sanitized;
}

export interface NamedStudyRefFilterState {
  buffer: string;
  sources: ChatSource[];
}

export function createNamedStudyRefFilter(sources: ChatSource[]): NamedStudyRefFilterState {
  return { buffer: '', sources };
}

export function feedNamedStudyRefFilter(
  state: NamedStudyRefFilterState,
  chunk: string,
): string {
  state.buffer += chunk;
  const boundary = Math.max(
    state.buffer.lastIndexOf('. '),
    state.buffer.lastIndexOf('! '),
    state.buffer.lastIndexOf('? '),
    state.buffer.lastIndexOf('\n'),
  );

  if (boundary === -1 && state.buffer.length < 1200) return '';

  const splitAt = boundary === -1 ? state.buffer.length : boundary + 1;
  const out = state.buffer.slice(0, splitAt);
  state.buffer = state.buffer.slice(splitAt);

  return sanitizeUnmatchedNamedStudyRefs(
    linkMatchedPlainAuthorYearRefs(out, state.sources),
    state.sources,
  );
}

export function flushNamedStudyRefFilter(state: NamedStudyRefFilterState): string {
  const out = state.buffer;
  state.buffer = '';
  return sanitizeUnmatchedNamedStudyRefs(
    linkMatchedPlainAuthorYearRefs(out, state.sources),
    state.sources,
  );
}

/**
 * Reconcile the answer's cited identifiers against the available sources.
 *
 * Returns injected sources (always included) plus any cited sources from
 * the full source pool that match identifiers in the answer text.
 * Does not add unrelated retrieval noise just to increase source count.
 */
export function reconcileSources(input: {
  answerText: string;
  injectedSources: ChatSource[];
  fullSourcePool: ChatSource[];
}): ChatSource[] {
  const citedIds = extractCitationIdentifiers(input.answerText);
  if (citedIds.size === 0) {
    return input.injectedSources;
  }

  const seen = new Set<string>();
  const result: ChatSource[] = [];

  // Always include injected sources first
  for (const source of input.injectedSources) {
    const key = source.url || source.doi || source.pmid || source.title;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(source);
    }
  }

  // Add cited sources from the full pool that aren't already included
  for (const source of input.fullSourcePool) {
    const key = source.url || source.doi || source.pmid || source.title;
    if (key && seen.has(key)) continue;
    if (sourceMatchesId(source, citedIds)) {
      if (key) seen.add(key);
      result.push(source);
    }
  }

  return result;
}
