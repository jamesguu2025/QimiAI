/**
 * RAG Service Client for ADHD Research Paper Retrieval
 *
 * Connects to the shared RAG API at http://101.37.25.249:8000
 * Used by both mini-program and web version
 *
 * 双LLM架构：
 * - 第一个LLM (summarizePapers): 提取论文核心发现，保留关键数据，转为通俗语言
 * - 第二个LLM (主对话): 基于精炼后的摘要与用户对话
 *
 * 参考: docs/PROMPT_SYSTEM_ARCHITECTURE.md 第8.4节
 */

import { linkMatchedPlainAuthorYearRefs } from '../utils/source-reconciliation';
import {
  groupEvidenceForInjection,
  classifyEvidenceForQuestion,
  describeEvidenceEn,
  buildRelevanceGatePrompt,
  parseRelevanceGateDecisions,
  type EvidenceGroups,
} from '../lib/rag-evidence';

// RAG API configuration
const RAG_API_BASE = process.env.RAG_API_BASE || 'http://47.110.88.11:8000';

// 智能摘要开关（双LLM架构）
const ENABLE_SMART_SUMMARY = process.env.ENABLE_SMART_SUMMARY === 'true';

// 证据重排/分层注入开关（默认开启，可秒回滚为旧的平铺行为）
// 移植自小程序 rag-service.js；见 lib/rag-evidence.ts。
const ENABLE_EVIDENCE_RERANK = process.env.RAG_EVIDENCE_RERANK !== 'false';

// 跨领域相关性闸门开关（两段式检索的 stage-1）。默认开启，可秒回滚。
// LLM-as-judge，纯函数在 lib/rag-evidence.ts；fail-open，绝不因判官出错阻断回答。
const ENABLE_RELEVANCE_GATE = process.env.RAG_RELEVANCE_GATE !== 'false';

// DeepSeek API configuration (for summarization LLM)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };

/**
 * Paper result from RAG API
 */
export interface AuthorDetailed {
  name?: string;
  lastname?: string;
  firstname?: string;
  initials?: string;
  affiliation?: string;
  affiliations?: string[];
}

export interface PaperResult {
  idx: number;
  score: number;
  title: string;
  abstract: string;
  content?: string;
  year: number;
  journal: string;
  authors?: string[];
  types?: string[];
  url?: string;
  pmid?: string;
  doi?: string;
  domain?: string;
  topic?: string;
  topics?: string[];
  pub_date?: string | null;
  is_retracted?: boolean;
  is_high_evidence?: boolean;
  correction_status?: string | null;
  journal_iso_abbr?: string | null;
  nlm_unique_id?: string | null;
  date_revised?: string | null;
  source?: string | null;
  language?: string | null;
  mesh_terms?: unknown;
  keywords?: unknown;
  publication_types?: string[] | null;
  chemicals?: unknown;
  grants?: unknown;
  coi_statement?: string | null;
  group_authors?: string[] | null;
  authors_detailed?: AuthorDetailed[] | null;
  journal_country?: string | null;
  databanks?: unknown;
  llm_reason?: string | null;
  llm_confidence?: number | string | null;
  llm_category?: string | null;
}

function getPaperUrl(paper: PaperResult): string {
  if (paper.url) return paper.url;
  if (paper.doi) return `https://doi.org/${paper.doi}`;
  if (paper.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}`;
  return '';
}

function isRetractedPaper(paper: PaperResult): boolean {
  const haystack = [
    paper.title,
    paper.abstract,
    paper.journal,
    ...(paper.types || []),
  ].filter(Boolean).join(' ').toLowerCase();

  return /\bretraction\b|\bretracted\b|撤稿/.test(haystack);
}

function filterUsablePapers(papers: PaperResult[]): PaperResult[] {
  const usable = papers.filter(paper => !isRetractedPaper(paper));
  if (usable.length !== papers.length) {
    console.warn(`[RAG] Filtered ${papers.length - usable.length} retracted paper(s) from retrieved results`);
  }
  return usable;
}

function formatAuthorAffiliations(authorsDetailed?: AuthorDetailed[] | null): string {
  if (!Array.isArray(authorsDetailed) || authorsDetailed.length === 0) return '';
  return authorsDetailed
    .map((author) => {
      const name = author.name || [author.firstname, author.lastname].filter(Boolean).join(' ');
      const affiliations = Array.isArray(author.affiliations) && author.affiliations.length > 0
        ? author.affiliations
        : author.affiliation
          ? [author.affiliation]
          : [];
      if (!name || affiliations.length === 0) return '';
      return `${name}: ${affiliations.join(' | ')}`;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Search request options
 */
export interface SearchOptions {
  query: string;
  top_k?: number;
  year_min?: number;
  year_max?: number;
  must_types?: string[];
  topics?: string[];
}

/**
 * Search ADHD research papers
 */
export async function searchPapers(options: SearchOptions): Promise<PaperResult[]> {
  try {
    const response = await fetch(`${RAG_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: options.query,
        top_k: options.top_k || 10,
        year_min: options.year_min,
        year_max: options.year_max,
        must_types: options.must_types,
        topics: options.topics,
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`);
    }

    const papers: PaperResult[] = await response.json();
    return filterUsablePapers(papers);
  } catch (error) {
    console.error('[RAG Service] Search failed:', error);
    throw error;
  }
}

/**
 * Format RAG results for LLM consumption
 *
 * Converts paper results into a formatted string that the LLM can understand
 */
export function formatPapersForLLM(
  papers: PaperResult[],
  userQuestion?: string,
  evidenceGroups?: EvidenceGroups<PaperResult> | null,
): string {
  if (papers.length === 0) {
    return 'No relevant research papers found for this query.';
  }

  const primaryKeys = new Set(
    (evidenceGroups?.primary || []).map(p => p.pmid || p.doi || p.title || '')
  );
  const paperKey = (p: PaperResult) => p.pmid || p.doi || p.title || '';

  const sections: string[] = evidenceGroups
    ? [
        `Found ${papers.length} relevant research papers, sorted and tiered by evidence strength.`,
        'Build the core answer from PRIMARY papers; treat SUPPORTING papers as background or adjacent evidence only.',
        '',
      ]
    : [
        `Found ${papers.length} relevant research papers:`,
        '',
      ];

  papers.forEach((paper, index) => {
    sections.push(`## Paper ${index + 1}: ${paper.title}`);

    if (evidenceGroups) {
      const tier = primaryKeys.has(paperKey(paper)) ? 'PRIMARY' : 'SUPPORTING';
      sections.push(`**Evidence Tier**: ${tier} — ${describeEvidenceEn(classifyEvidenceForQuestion(paper, userQuestion || ''))}`);
    }

    sections.push(`**Year**: ${paper.year}`);
    sections.push(`**Journal**: ${paper.journal}`);

    if (paper.types && paper.types.length > 0) {
      sections.push(`**Study Type**: ${paper.types.join(', ')}`);
    }

    if (paper.authors && paper.authors.length > 0) {
      sections.push(`**Authors**: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`);
    }

    const affiliations = formatAuthorAffiliations(paper.authors_detailed);
    if (affiliations) {
      sections.push(`**Author Affiliations**: ${affiliations}`);
    }

    sections.push(`**Relevance Score**: ${(paper.score * 100).toFixed(1)}%`);
    sections.push('');
    sections.push(`**Abstract**: ${paper.abstract}`);
    sections.push('');

    if (paper.url) {
      sections.push(`**Source**: ${paper.url}`);
      sections.push('');
    } else if (paper.doi) {
      sections.push(`**Source**: https://doi.org/${paper.doi}`);
      sections.push('');
    } else if (paper.pmid) {
      sections.push(`**Source**: https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}`);
      sections.push('');
    }
  });

  return sections.join('\n');
}

/**
 * Analyze paper topics distribution
 *
 * Groups papers by topic and returns statistics
 */
export function analyzePaperTopics(papers: PaperResult[]): Record<string, number> {
  const topicCounts: Record<string, number> = {};

  papers.forEach(paper => {
    if (paper.topic) {
      topicCounts[paper.topic] = (topicCounts[paper.topic] || 0) + 1;
    }
  });

  return topicCounts;
}

/**
 * Check if RAG service is healthy
 */
export async function checkRAGHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get RAG service statistics
 */
export async function getRAGStats(): Promise<any> {
  try {
    const response = await fetch(`${RAG_API_BASE}/stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[RAG Service] Failed to get stats:', error);
    return null;
  }
}

/**
 * RAG Tool Call Result
 */
export interface RAGToolCallResult {
  formattedText: string;  // For LLM consumption
  sources: Array<{        // For frontend display
    title: string;
    url: string;
    snippet?: string;
    year?: number | string;
    journal?: string;
    authors?: string[];
    authors_detailed?: AuthorDetailed[] | null;
    journal_country?: string | null;
    doi?: string;
    pmid?: string;
  }>;
  papers?: PaperResult[]; // Full paper data for server-side context persistence
}

/**
 * Unified anti-drift citation policy for retrieved research.
 *
 * Keep this as the single source of truth for RAG faithfulness rules. The chat
 * endpoint and the smart-summary LLM both use this wording so citation behavior
 * does not drift across retrieval paths.
 */
export function buildRagCitationRule(sourceCount?: number): string {
  const paperLabel = sourceCount === 1 ? 'paper' : 'papers';
  const countLine = sourceCount && sourceCount > 0
    ? `You have ${sourceCount} retrieved research ${paperLabel}. Use them, but faithfulness comes first.`
    : 'Use retrieved research only when it is actually provided. Faithfulness comes first.';

  return `RAG citation policy — faithful, calibrated, no invented evidence.

${countLine}

Non-negotiable source rules:
- Use only information present in the retrieved title, abstract, authors, author affiliations, year, journal, DOI, PMID, or source URL.
- Do not invent or fill in missing institutions, sample sizes, effect sizes, mechanisms, protocols, percentages, diagnoses, or outcomes.
- Practical unsourced schedules, durations, and observation windows must be labeled as practical starting estimates, not research-derived parameters.
- Practical plans may include simple timing, but every unsourced timing must state the reasoning basis, such as tolerance, habit-building, and observing trends. Do not present practical tracking windows as evidence-backed improvement timelines.
- Do not shorten or reinterpret research durations. If a study used 12 weeks or 26 weeks, keep that exact duration tied to that study and do not present a different expected improvement window.
- Do not attach exact week ranges to parent/therapist anecdotal experience unless a retrieved source states that range. Use qualitative wording instead, such as "some families report gradual changes, while others see little change."
- Do not put exact week ranges in "reasonable to hope for", "what to expect", or expected-benefits tables unless a current retrieved source directly supports the exact range and the citation is in the same row or paragraph.
- If an abstract does not state a detail, omit it. If the detail is important, write that it was not available in the retrieved abstract.
- Do not swap findings across papers. A parameter, population, reflex type, intervention, or outcome belongs only to the paper that explicitly states it.
- Do not cite papers just to reach a citation count. Cite fewer papers when fewer are directly relevant.
- Never use retracted papers as supporting evidence. If a retrieved item is a retraction notice, ignore it as evidence and say the evidence base is weaker if that matters.

Evidence calibration:
- Direct evidence: the paper directly studied the user-relevant question. You may cite it as direct support.
- Indirect evidence: the paper studied a nearby construct or population. Say it is indirect and explain the practical inference cautiously.
- Mechanistic or practical judgment: no retrieved paper directly supports the claim. Label it as practical judgment or a mechanism-based guess, not research-backed advice.
- Weak but directly relevant evidence (small pilot / feasibility study, case report, small sample): cite it rather than dropping it, but present it transparently so the parent can weigh it. Say what it is, what it suggests (e.g. relevant population, promising direction), and its limits (preliminary, small sample, not powered to prove effectiveness, not yet generalizable). Do not restate a feasibility / acceptability / adherence finding as a proven effect on the child's learning or development, and do not silently omit a directly relevant study.
- Correlation stays correlation. Do not upgrade associations into causal claims unless the abstract supports that design and conclusion.
- For primitive reflex integration, sensory integration, vestibular training, semantic networks, ADHD, reading, writing, posture, and child-development claims: do not claim a direct causal pathway unless a retrieved study directly tested that exact pathway. Default to "early", "indirect", "mixed", or "not directly established" when appropriate.
- Do not link ADHD brain imaging, frontoparietal networks, frontal lobe findings, brainstem findings, or attention-network abnormalities to retained/unintegrated primitive reflexes unless the retrieved paper directly measured primitive reflexes in that same study. If a paper is only about ADHD neural connectivity, cite it only for ADHD neural connectivity.
- Do not infer a specific child's brain-network structure, connection efficiency, or causal bottleneck from one parent example. You may describe it as a possible hypothesis and suggest observation or professional assessment.
- When the parent asks you to confirm a causal model, separate "what the observation supports" from "what remains a hypothesis." Do not say the chain is accurate, established, or direct unless the retrieved papers establish that exact chain.
- For child-specific or family-education cases involving behavior, learning, discipline, motivation, homework, routines, emotion, sleep, social relationships, school fit, language, attention, sensory/motor patterns, development, regression, asymmetry, primitive reflexes, sensory integration, or unclear cause, do not let research retrieval override layered formulation. Give a bounded first read, name the possible layers, ask the 1-2 most diagnostic missing questions, and avoid a full plan until the likely bottleneck is clearer.
- Do not reduce a complex child/family presentation to one surface label such as motivation, behavior, attention, bad habits, parenting style, sensory seeking, primitive reflexes, anxiety, or weak muscles. Separate what the observation supports from what still needs assessment.
- For collapsed arches that appear seated but collapse standing, do not conclude "bones and ligaments are normal" from text alone. Say it may fit a flexible arch pattern and ask whether the arch appears on tiptoe plus whether there is pain, limping, tight calves/heel cords, frequent falls, or broader one-sided weakness.
- Medical, medication, diagnosis, emergency, and safety-sensitive topics require extra caution. Do not imply the parent can self-diagnose or change treatment based on retrieved papers.

Citation style:
- Prefer 1-3 directly relevant clickable Markdown citations in the body for evidence-based claims.
- Hedge with words, not by dropping the citation. When a paper in the citation-handle list supports a claim, cite it with its clickable handle even if the evidence is weak, mixed, or indirect — put the caution in the sentence itself ("a small study suggests X, though findings are not consistent [handle]"). Only fall back to an unlinked "one retrieved study" when no specific handle in the list actually applies; do not use the unlinked phrasing as a way to avoid citing a paper you were given.
- When using an author-year citation, link it to the matching source URL when available. Use the exact citation handles and source URLs shown in the retrieved context; do not write plain "Author et al., Year" text.
- If you use a Markdown evidence table with a "Study" column, every author-year value in that column must be a clickable Markdown citation from the current source list. If you cannot link it, use "one retrieved study" instead of the author-year.
- If you cannot attach the source URL, do not use an author-year citation. Write "one retrieved study", "one earlier source", or "the retrieved review" instead.
- Mention limitations plainly: small sample, narrow population, indirect evidence, mixed findings, or missing product-specific evidence.
- It is acceptable to say "I do not see direct evidence in the retrieved papers" when that is true.`;
}

function toRAGSource(paper: PaperResult) {
  return {
    title: paper.title,
    url: getPaperUrl(paper),
    snippet: paper.abstract.slice(0, 200) + (paper.abstract.length > 200 ? '...' : ''),
    year: paper.year,
    journal: paper.journal,
    authors: paper.authors,
    authors_detailed: paper.authors_detailed,
    journal_country: paper.journal_country,
    doi: paper.doi,
    pmid: paper.pmid,
  };
}

function buildCitationHandles(sources: RAGToolCallResult['sources']): string {
  return sources
    .filter(source => source.url)
    .map((source, index) => {
      const firstAuthor = Array.isArray(source.authors) && source.authors.length > 0
        ? source.authors[0]
        : Array.isArray(source.authors_detailed) && source.authors_detailed.length > 0
          ? source.authors_detailed[0]?.lastname || source.authors_detailed[0]?.name
          : null;
      const familyName = firstAuthor?.trim().split(/\s+/)[0]?.replace(/[^a-z-]/gi, '');
      const year = source.year ? String(source.year) : null;
      const label = familyName && year
        ? `${familyName} et al. (${year})`
        : `Source ${index + 1}`;
      return `${index + 1}. [${label}](${source.url}) — ${source.title}`;
    })
    .join('\n');
}

/**
 * Execute RAG search from LLM tool call
 *
 * This is called when the LLM uses the search_adhd_research tool
 * Returns both formatted text for LLM and structured sources for frontend
 */
export async function executeRAGToolCall(toolCall: {
  function: { name: string; arguments: string };
}): Promise<RAGToolCallResult> {
  try {
    // Parse tool call arguments
    const args = JSON.parse(toolCall.function.arguments);

    if (!args.query || typeof args.query !== 'string') {
      throw new Error('Invalid query parameter');
    }

    // Execute search
    const papers = await searchPapers({
      query: args.query,
      top_k: args.top_k || 10,
    });

    // Format for LLM
    const formattedResults = formatPapersForLLM(papers);

    // Analyze topics
    const topicDistribution = analyzePaperTopics(papers);
    const topicsInfo = Object.entries(topicDistribution)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => `${topic}: ${count} papers`)
      .join(', ');

    const formattedText = `${formattedResults}\n\n**Topic Distribution**: ${topicsInfo}`;

    // Convert papers to frontend sources format
    const sources = papers.map(toRAGSource);

    return {
      formattedText,
      sources,
    };
  } catch (error) {
    console.error('[RAG Service] Tool call execution failed:', error);
    return {
      formattedText: `Error executing RAG search: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
}

/**
 * Smart summary: condense retrieved abstracts without adding unsupported claims.
 *
 * First LLM in the two-LLM RAG path. It should reduce token load while
 * preserving source fidelity. It must not infer missing details from titles,
 * prior knowledge, or general ADHD expertise.
 *
 * @param papers - 论文列表
 * @param userQuestion - 用户问题
 * @returns English evidence summary, or null to fall back to raw formatting.
 */
export async function summarizePapers(
  papers: PaperResult[],
  userQuestion: string,
  citationHandles?: string,
  sources?: RAGToolCallResult['sources'],
  evidenceGroups?: EvidenceGroups<PaperResult> | null,
): Promise<string | null> {
  const startTime = Date.now();

  try {
    if (papers.length === 0) {
      console.warn('[RAG] Smart summary skipped: no papers retrieved');
      return null;
    }

    console.log(`[RAG] Starting smart summary for ${papers.length} papers`);

    const primaryKeys = new Set(
      (evidenceGroups?.primary || []).map(p => p.pmid || p.doi || p.title || '')
    );
    const paperKey = (p: PaperResult) => p.pmid || p.doi || p.title || '';

    // Feed full abstracts, not extracted sentence fragments. Fragment picking was
    // a known source of citation drift in the mini-program RAG path.
    const papersText = papers.map((paper, i) => {
      const year = paper.year || 'recent year';
      const authors = paper.authors?.join(', ') || 'authors not provided';
      const affiliations = formatAuthorAffiliations(paper.authors_detailed) || 'author affiliations not provided';
      const title = paper.title || 'Untitled study';
      const journal = paper.journal || 'journal not provided';
      const content = paper.abstract || '';
      const sourceUrl = getPaperUrl(paper) || 'source URL not provided';
      const identifier = paper.pmid ? `PMID: ${paper.pmid}` : paper.doi ? `DOI: ${paper.doi}` : 'PMID/DOI not provided';

      // Evidence positioning (ported rerank/tiering). Tells the summarizer which
      // papers may back the core answer vs. which are background/adjacent only.
      const evidenceLine = evidenceGroups
        ? `Evidence tier: ${primaryKeys.has(paperKey(paper)) ? 'PRIMARY' : 'SUPPORTING'} — ${describeEvidenceEn(classifyEvidenceForQuestion(paper, userQuestion))}\n`
        : '';

      return `Paper ${i + 1}
Title: ${title}
${evidenceLine}Authors: ${authors}
Author Affiliations: ${affiliations}
Year: ${year}
Journal: ${journal}
Source URL: ${sourceUrl}
Identifier: ${identifier}
Abstract:
${content.substring(0, 4000)}${content.length > 4000 ? '\n[Abstract truncated after 4000 characters.]' : ''}`;
    }).join('\n\n---\n\n');

    const evidenceTierInstruction = evidenceGroups
      ? `

Evidence-tier discipline (each paper is pre-labeled PRIMARY or SUPPORTING):
- Build the core answer from PRIMARY papers. Cite them as direct support only when population, age, and outcome match the user's child.
- SUPPORTING papers are background or adjacent evidence. You may use them for context or next-step direction, but do not present them as direct evidence for the core question.
- If there is no PRIMARY paper, say the direct evidence is limited rather than upgrading a SUPPORTING paper into a direct answer.`
      : '';

    const prompt = `You are an evidence summarization assistant for Qimi AI.

Your job is to summarize retrieved ADHD and child-development research for a parent-facing assistant. Write in English.

User question:
${userQuestion}

${buildRagCitationRule(papers.length)}${evidenceTierInstruction}

Guardrail-over-agreement rule:
- Do not validate unsupported parent conclusions.
- If the parent's premise is unsupported by the evidence, note the gap respectfully.
- Do not agree with a claim just because it sounds confident.

Exact-number-source discipline:
- Concrete numbers (sample sizes, percentages, effect sizes, frequencies, durations) must come from the abstracts.
- If a number is not stated, do not invent or approximate it.
- Label practical estimates explicitly.

Summary requirements:
1. Extract only the 3-5 findings most relevant to the user question.
2. For each finding, name the source naturally with author/team and year, linked in Markdown when a source URL is available.
3. If citation handles are provided below, copy those handles exactly instead of writing plain author-year text.
4. Preserve concrete numbers only when the abstract explicitly states them.
5. Do not add institutions, mechanisms, sample sizes, or effect sizes unless the abstract states them.
6. Say when evidence is direct, indirect, early, mixed, or not specific to the user's exact question.
7. Keep it concise and practical for English-speaking parents.
8. Output 350-650 words. No title, no preface, no JSON.

Citation handles to copy exactly:
${citationHandles || 'No citation handles available.'}

Retrieved papers:
${papersText}
`;

    // 调用 DeepSeek API 生成摘要
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1800,
        temperature: 0.2,
        stream: false,
        thinking: DEEPSEEK_THINKING,
      }),
      signal: AbortSignal.timeout(60000), // 60 seconds
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    let summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('Empty response from LLM');
    }

    if (sources && sources.length > 0) {
      summary = linkMatchedPlainAuthorYearRefs(summary, sources);
    }

    const duration = Date.now() - startTime;
    console.log(`[RAG] ✅ Smart summary generated, length: ${summary.length} chars, duration: ${duration}ms`);

    return summary;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[RAG] ❌ Smart summary failed (${duration}ms):`, error);

    return null;  // 返回 null 触发降级到旧逻辑
  }
}

/**
 * Cross-domain relevance gate (stage-1 of two-stage retrieval).
 *
 * Drops papers the LLM judge marks as clearly off-domain BEFORE evidence tiering,
 * so an off-domain systematic review can no longer be promoted to PRIMARY.
 * Fail-open on every path: no key, error, timeout, unparseable output, or an
 * empty result all fall back to returning the papers unchanged.
 */
async function applyRelevanceGate(question: string, papers: PaperResult[]): Promise<PaperResult[]> {
  if (!ENABLE_RELEVANCE_GATE || !DEEPSEEK_API_KEY || !question?.trim() || papers.length <= 1) {
    return papers;
  }

  try {
    const prompt = buildRelevanceGatePrompt(question, papers);
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0,
        stream: false,
        thinking: DEEPSEEK_THINKING,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`relevance gate API error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const keep = parseRelevanceGateDecisions(raw, papers.length);
    const kept = papers.filter((_, i) => keep[i]);
    const dropped = papers.length - kept.length;

    // Guard: never let the gate empty the whole set — fall back to all papers.
    if (kept.length === 0) {
      console.warn('[RAG] Relevance gate would drop all papers; ignoring gate (fail-open)');
      return papers;
    }
    if (dropped > 0) {
      console.log(`[RAG] Relevance gate dropped ${dropped}/${papers.length} off-domain paper(s)`);
    }
    return kept;
  } catch (error) {
    console.warn('[RAG] Relevance gate failed; keeping all papers (fail-open):', error instanceof Error ? error.message : error);
    return papers;
  }
}

/**
 * 执行 RAG 搜索并返回结果（支持双LLM架构）
 *
 * 如果 ENABLE_SMART_SUMMARY=true，使用双LLM架构：
 * 1. 先调用 summarizePapers 生成精炼摘要
 * 2. 将摘要作为 formattedText 返回给主对话LLM
 *
 * 否则使用原始模式：直接将完整论文内容传给LLM
 */
export async function executeRAGWithSmartSummary(
  query: string,
  userQuestion: string,
  topK: number = 10
): Promise<RAGToolCallResult & { summaryMode: 'smart' | 'raw' }> {
  // 1. 执行搜索
  const retrievedPapers = await searchPapers({ query, top_k: topK });

  if (retrievedPapers.length === 0) {
    return {
      formattedText: `No relevant research papers were retrieved for this query.\n\n${buildRagCitationRule(0)}\n\nAnswer from general knowledge only. Do not cite named studies, sample sizes, effect sizes, or source links for this turn.`,
      sources: [],
      papers: retrievedPapers,
      summaryMode: 'raw',
    };
  }

  // 2. 相关性闸门（两段式 stage-1）：先剔除明显跨领域的论文，
  // 否则跑题的系统综述会在下一步被顶成主证据。
  const gatedPapers = await applyRelevanceGate(userQuestion, retrievedPapers);

  // 3. 证据重排 + 分层（移植自小程序）。语义相似度 ≠ 证据强度：
  // 把低外推/跑题论文压到补充层或剔除，把强证据顶到主证据层。
  const evidenceGroups: EvidenceGroups<PaperResult> | null =
    ENABLE_EVIDENCE_RERANK && userQuestion
      ? groupEvidenceForInjection(gatedPapers, userQuestion)
      : null;

  // 注入用论文：重排后取 主证据 + 补充证据（也顺带裁掉 cap 之外的噪声）。
  const papers = evidenceGroups
    ? [...evidenceGroups.primary, ...evidenceGroups.supporting]
    : gatedPapers;

  if (evidenceGroups) {
    console.log(
      `[RAG] 证据分层: 主证据 ${evidenceGroups.primary.length} 篇, 补充 ${evidenceGroups.supporting.length} 篇, ` +
        `检索 ${retrievedPapers.length} 篇, 过闸后 ${gatedPapers.length} 篇 (问题类型=${evidenceGroups.questionType})`
    );
  }

  // 4. 转换为前端显示格式（已按证据排序）
  const sources = papers.map(toRAGSource);

  const sourceLinks = sources
    .filter(source => source.url)
    .map((source, index) => `${index + 1}. [${source.title}](${source.url})`)
    .join('\n');
  const citationHandles = buildCitationHandles(sources);

  // 4. 根据开关决定使用哪种模式
  if (ENABLE_SMART_SUMMARY && userQuestion) {
    console.log('[RAG] 🚀 智能摘要已启用，开始生成综合摘要...');

    const summary = await summarizePapers(papers, userQuestion, citationHandles, sources, evidenceGroups);

    if (summary) {
      console.log('[RAG] ✅ 智能摘要生成成功');
      return {
        formattedText: `Research support: found ${papers.length} relevant ADHD studies.\n\n${summary}\n\nCitation handles to copy exactly when citing in the answer:\n${citationHandles || 'No citation handles available.'}\n\nClickable source links:\n${sourceLinks || 'No source links available.'}`,
        sources,
        papers,
        summaryMode: 'smart',
      };
    }

    // 摘要失败，降级到原始格式化
    console.warn('[RAG] ⚠️ 智能摘要生成失败，降级到原始格式化');
  }

  // 5. 原始模式：完整论文内容（分层标注证据定位）
  const formattedResults = formatPapersForLLM(papers, userQuestion, evidenceGroups);
  const topicDistribution = analyzePaperTopics(papers);
  const topicsInfo = Object.entries(topicDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => `${topic}: ${count} papers`)
    .join(', ');

  return {
    formattedText: `${formattedResults}\n\n**Citation Handles To Copy Exactly**:\n${citationHandles || 'No citation handles available.'}\n\n**Clickable Source Links**:\n${sourceLinks || 'No source links available.'}\n\n**Topic Distribution**: ${topicsInfo}`,
    sources,
    papers,
    summaryMode: 'raw',
  };
}

export default {
  searchPapers,
  formatPapersForLLM,
  analyzePaperTopics,
  checkRAGHealth,
  getRAGStats,
  executeRAGToolCall,
  summarizePapers,
  executeRAGWithSmartSummary,
};
