/**
 * RAG context store — server-side answer-time paper context persistence.
 *
 * Stores and retrieves full retrieved abstracts so same-topic follow-ups
 * can reuse prior paper context without drifting from short snippets.
 * Full abstracts never leave the server prompt path.
 */

import { getSupabaseAdmin } from './supabase';
import { buildRagCitationRule } from '../services/rag-service';

export type RAGAuthorDetailed = {
  name?: string;
  lastname?: string;
  firstname?: string;
  initials?: string;
  affiliation?: string;
  affiliations?: string[];
};

export type RAGContextPaper = {
  title: string;
  abstract: string;
  year?: number | string;
  journal?: string;
  authors?: string[];
  authors_detailed?: RAGAuthorDetailed[] | null;
  journal_country?: string | null;
  url?: string;
  doi?: string;
  pmid?: string;
  score?: number;
  topic?: string;
  types?: string[];
};

type ChatSource = {
  title: string;
  url: string;
  snippet?: string;
  year?: number | string;
  journal?: string;
  authors?: string[];
  authors_detailed?: RAGAuthorDetailed[] | null;
  journal_country?: string | null;
  doi?: string;
  pmid?: string;
};

export interface RagContext {
  id: string;
  conversation_id: string | null;
  user_id: string | null;
  guest_session_id: string | null;
  topic_key: string | null;
  query: string;
  question: string;
  papers: RAGContextPaper[];
  sources: ChatSource[];
  created_at: string;
  expires_at: string;
}

/**
 * Load the latest active (non-expired) RAG context for a conversation or guest session.
 */
export async function getLatestRagContext(input: {
  conversationId?: string | null;
  userId?: string | null;
  guestSessionId?: string | null;
  now?: Date;
}): Promise<RagContext | null> {
  const supabase = getSupabaseAdmin();
  const now = (input.now || new Date()).toISOString();

  let query = supabase
    .from('conversation_rag_contexts')
    .select('*')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1);

  if (input.conversationId) {
    query = query.eq('conversation_id', input.conversationId);
  } else if (input.guestSessionId) {
    query = query.eq('guest_session_id', input.guestSessionId);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error || !data) return null;

  return {
    ...data,
    papers: Array.isArray(data.papers) ? data.papers : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}

/**
 * Save a new RAG context row, replacing any prior context for the same conversation/session.
 */
export async function saveRagContext(input: {
  conversationId?: string | null;
  userId?: string | null;
  guestSessionId?: string | null;
  topicKey?: string | null;
  query: string;
  question: string;
  papers: RAGContextPaper[];
  sources: ChatSource[];
  ttlHours?: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const ttlHours = input.ttlHours || 24;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  const row: Record<string, unknown> = {
    conversation_id: input.conversationId || null,
    user_id: input.userId || null,
    guest_session_id: input.guestSessionId || null,
    topic_key: input.topicKey || null,
    query: input.query,
    question: input.question,
    papers: input.papers,
    sources: input.sources,
    expires_at: expiresAt,
  };

  const baseExpiryUpdate = supabase
    .from('conversation_rag_contexts')
    .update({ expires_at: now })
    .gt('expires_at', now);

  const { error: expireError } = input.conversationId
    ? await baseExpiryUpdate.eq('conversation_id', input.conversationId)
    : input.guestSessionId
      ? await baseExpiryUpdate.eq('guest_session_id', input.guestSessionId)
      : { error: null };

  if (expireError) {
    console.error('[rag-context-store] Failed to expire prior context:', expireError);
  }

  const { error } = await supabase
    .from('conversation_rag_contexts')
    .insert(row);

  if (error) {
    console.error('[rag-context-store] Failed to save context:', error);
  }
}

/**
 * Format RAG context for prompt injection.
 *
 * Includes full abstracts (truncated at maxCharsPerPaper), source identifiers,
 * citation rules, and a mode label (fresh vs cached).
 */
export function formatRagContextForPrompt(input: {
  papers: RAGContextPaper[];
  sources: ChatSource[];
  question: string;
  mode: 'fresh' | 'cached';
  maxPapers?: number;
  maxCharsPerPaper?: number;
}): string {
  const maxPapers = input.maxPapers || 8;
  const maxChars = input.maxCharsPerPaper || 4000;
  const papers = input.papers.slice(0, maxPapers);

  const modeLabel = input.mode === 'cached'
    ? 'CACHED RESEARCH CONTEXT — these papers are the core research basis for this same-topic follow-up. Use them as the primary evidence source.'
    : 'FRESH RESEARCH CONTEXT — newly retrieved papers for this question.';

  const paperSections = papers.map((paper, i) => {
    const identifiers: string[] = [];
    if (paper.url) identifiers.push(`URL: ${paper.url}`);
    if (paper.doi) identifiers.push(`DOI: ${paper.doi}`);
    if (paper.pmid) identifiers.push(`PMID: ${paper.pmid}`);

    const meta: string[] = [];
    if (paper.year) meta.push(`Year: ${paper.year}`);
    if (paper.journal) meta.push(`Journal: ${paper.journal}`);
    if (paper.authors && paper.authors.length > 0) {
      meta.push(`Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`);
    }
    if (paper.journal_country) {
      meta.push(`Journal Country: ${paper.journal_country}`);
    }
    const affiliations = Array.isArray(paper.authors_detailed)
      ? paper.authors_detailed
          .map((author) => {
            const name = author.name || [author.firstname, author.lastname].filter(Boolean).join(' ');
            const authorAffiliations = Array.isArray(author.affiliations) && author.affiliations.length > 0
              ? author.affiliations
              : author.affiliation
                ? [author.affiliation]
                : [];
            return name && authorAffiliations.length > 0
              ? `${name}: ${authorAffiliations.join(' | ')}`
              : '';
          })
          .filter(Boolean)
          .join('; ')
      : '';
    if (affiliations) {
      meta.push(`Author Affiliations: ${affiliations}`);
    }
    if (paper.types && paper.types.length > 0) {
      meta.push(`Type: ${paper.types.join(', ')}`);
    }
    if (paper.score !== undefined) {
      meta.push(`Relevance: ${(paper.score * 100).toFixed(1)}%`);
    }

    const abstract = paper.abstract
      ? paper.abstract.slice(0, maxChars) + (paper.abstract.length > maxChars ? '\n[Abstract truncated]' : '')
      : 'Abstract not available.';

    return `Paper ${i + 1}: ${paper.title}
${meta.join(' | ')}
${identifiers.join(' | ')}
${abstract}`;
  });

  return `${modeLabel}

User question: ${input.question}

${buildRagCitationRule(papers.length)}

Citation boundary:
- Only cite URLs, PMIDs, or DOIs from the papers in this ${input.mode} research context.
- Do not cite links that appear only in earlier chat history, memory snippets, or user text.

${paperSections.join('\n\n---\n\n')}`;
}

/**
 * Build a question-anchoring system message to append after RAG context injection.
 */
export function buildQuestionAnchor(question: string): string {
  return `Current question to answer: "${question}"

Answer this question directly. Do not expand into nearby paper topics that are not asked about. Stay grounded in the research context above and your general knowledge. If the research does not cover the specific question, say so plainly.`;
}
