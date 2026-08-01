/**
 * Lightweight semantic router for deciding whether a chat turn needs RAG.
 *
 * This mirrors the mini-program's required decision-call pattern: the model
 * must return a structured yes/no decision before the main answer is generated.
 */

export interface RagRouterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface RagRouteDecision {
  shouldSearch: boolean;
  query: string;
  reason: string;
  useCachedContext?: boolean;
}

interface CachedRagContext {
  hasContext: boolean;
  query?: string;
  question?: string;
  topicKey?: string | null;
  sourceCount?: number;
}

interface RouteRagNeedOptions {
  messages: RagRouterMessage[];
  currentUserMessage: string;
  folderKey?: string | null;
  signal?: AbortSignal;
  cachedRagContext?: CachedRagContext;
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };

function tokenizeTopic(text: string): Set<string> {
  const normalized = text.toLowerCase();
  const englishTokens = normalized.match(/[a-z][a-z0-9-]{2,}/g) || [];
  const chineseMatches = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const stop = new Set([
    'the', 'and', 'for', 'with', 'about', 'what', 'when', 'where', 'does', 'this', 'that',
    'children', 'child', 'kids', 'parent', 'parents', 'adhd',
    '什么', '这个', '那个', '孩子', '家长', '那么', '就是', '目前', '包括', '比如',
  ]);
  return new Set([...englishTokens, ...chineseMatches].filter(token => !stop.has(token)));
}

function topicOverlapScore(current: string, cached: string): number {
  const currentTokens = tokenizeTopic(current);
  const cachedTokens = tokenizeTopic(cached);
  if (currentTokens.size === 0 || cachedTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of currentTokens) {
    if (cachedTokens.has(token)) overlap += 1;
  }
  return overlap / Math.min(currentTokens.size, cachedTokens.size);
}

function isAcknowledgementOrClosingTurn(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const ackPatterns = [
    /\b(got it|understood|makes sense|that makes sense|ok|okay|thanks|thank you|i see|clear|sounds good)\b/i,
    /\b(we can|i can|we should|i should|we will|i will)\b.{0,120}\b(start|try|do|proceed|continue)\b/i,
    /\b(should not|shouldn't|do not|don't)\b.{0,80}\b(expect|assume|count on)\b/i,
    /(明白|懂了|了解|好的|可以|先做|开始|不要期待|不能期待|不期待)/,
  ];

  const looksLikeAck = normalized.length <= 220 && ackPatterns.some(pattern => pattern.test(text));
  if (!looksLikeAck) return false;

  const asksNewQuestion = /[?？]|what|when|where|why|how|which|could|can|would|is it|does|do we|tell me|explain|recommend|suggest|plan|evidence|study|research|source|citation|compare|safe|effective|risk|effectiveness|frequency|schedule|timeline|dose|dosage|improve|improvement|benefit/i.test(normalized);
  return !asksNewQuestion;
}

function reasonSaysNoEvidenceTurn(reason: string): boolean {
  return /not asking (a )?(new )?evidence question|not a request for (new )?research|conversational\/emotional|emotional turn|personal opinion|acknowledg/i.test(reason);
}

export function isLikelySameRagTopic(currentMessage: string, cachedContext?: CachedRagContext): boolean {
  if (isAcknowledgementOrClosingTurn(currentMessage)) return false;
  if (!cachedContext?.hasContext || !cachedContext.sourceCount) return false;
  const cachedText = [cachedContext.query, cachedContext.question, cachedContext.topicKey].filter(Boolean).join('\n');
  if (!cachedText.trim()) return false;

  const score = topicOverlapScore(currentMessage, cachedText);
  const current = currentMessage.toLowerCase();
  const cached = cachedText.toLowerCase();

  const domainPairs = [
    ['primitive reflex', 'reflex'],
    ['reflex integration', '反射整合'],
    ['neural integration', '神经整合'],
    ['primitive reflex', '原始反射'],
    ['primitive reflex', '神经反射'],
    ['原始反射', '反射'],
    ['semantic', '语义'],
    ['language', '语言'],
    ['sensory', '感觉'],
    ['exercise', '运动'],
    ['training', '训练'],
    ['real-world', '实际'],
    ['practitioner', '干预师'],
    ['nutrition', '营养'],
    ['medication', '药物'],
  ];
  const sharedDomain = domainPairs.some(([en, cn]) =>
    (current.includes(en) || current.includes(cn)) && (cached.includes(en) || cached.includes(cn))
  );

  return score >= 0.18 || sharedDomain;
}

const RAG_DECISION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'decide_rag_search',
    description: `Decide whether this user turn needs retrieval from Qimi's curated ADHD and child-development research library before answering.

Return should_search=true when the user is asking for a concrete recommendation, plan, intervention, treatment-adjacent guidance, safety/effectiveness judgment, comparison, or evidence-sensitive explanation where external research would materially improve accuracy.

Return should_search=false for greetings, thanks, simple acknowledgements, pure emotional support, app/navigation requests, rewriting/summarizing/translating, or follow-up detail collection where the user is only answering a clarifying question.

Use recent conversation context. A short follow-up can still require search if it depends on an earlier evidence-sensitive topic. If relevant research was already supplied in the recent context and is still enough for the same topic, return false.

Do not decide by keyword matching. Decide by the user's intent, risk level, and whether grounded research is needed before giving advice.`,
    parameters: {
      type: 'object' as const,
      properties: {
        should_search: {
          type: 'boolean',
          description: 'Whether the answer should retrieve research first. When uncertain for child health, development, education, behavior, sleep, nutrition, exercise, or family intervention advice, choose true.',
        },
        use_cached_context: {
          type: 'boolean',
          description: 'Whether the available cached research context is clearly the right evidence base for this same-topic follow-up. Only true when the current turn is not asking a meaningfully new evidence question.',
        },
        query: {
          type: 'string',
          description: 'If should_search is true, write a concise English research query capturing the evidence need and relevant context. If false, use an empty string.',
        },
        reason: {
          type: 'string',
          description: 'Brief internal reason for observability. Do not include private details beyond the minimal decision rationale.',
        },
      },
      required: ['should_search', 'use_cached_context', 'reason'],
    },
  },
};

function compactRecentMessages(messages: RagRouterMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0
    )
    .slice(-6)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 700),
    }));
}

function buildDecisionMessages(options: RouteRagNeedOptions) {
  const recentMessages = compactRecentMessages(options.messages);
  const context = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  const cachedInfo = options.cachedRagContext?.hasContext
    ? `\n- Cached research context exists from a prior turn (query: "${options.cachedRagContext.query || ''}", ${options.cachedRagContext.sourceCount || 0} sources). If the current question is on the same topic, cached context is sufficient and should_search should be false. If the question is a new evidence topic, return true.`
    : '';

  return [
    {
      role: 'system',
      content: `You are a lightweight RAG routing classifier for Qimi AI.

Your only job is to decide whether the next assistant answer should first retrieve research papers.

Output by calling decide_rag_search. Do not answer the user.

Decision policy:
- Prefer should_search=true when the user is asking what to do, how to fix/improve/manage something, whether an approach works, whether something is safe, how long it takes, or how options compare, and the topic concerns a child or family support domain where evidence matters.
- Prefer should_search=false when this is casual conversation, gratitude, pure emotional validation, app workflow, a request to rewrite/summarize existing text, or a clarification detail that does not itself ask for advice.
- Consider recent context, not only the latest sentence.
- If the same topic already has research context in recent messages, avoid repeating retrieval unless the user asks a meaningfully new evidence question.
- If cached context is clearly same-topic and sufficient, return should_search=false and use_cached_context=true.
- If this is general chat or a non-evidence turn, return should_search=false and use_cached_context=false.
- Do not use keyword matching. Judge semantic intent and evidence need.${cachedInfo}`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        folderKey: options.folderKey || null,
        currentUserMessage: options.currentUserMessage,
        recentConversation: context,
        cachedContext: options.cachedRagContext?.hasContext
          ? { query: options.cachedRagContext.query, topicKey: options.cachedRagContext.topicKey, sourceCount: options.cachedRagContext.sourceCount }
          : null,
      }),
    },
  ];
}

function createAbortSignalWithTimeout(signal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let abortHandler: (() => void) | null = null;

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      controller.abort();
    } else {
      abortHandler = () => {
        clearTimeout(timeout);
        controller.abort();
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    },
  };
}

export async function routeRagNeed(options: RouteRagNeedOptions): Promise<RagRouteDecision> {
  const current = options.currentUserMessage?.trim() || '';
  if (!current) {
    return { shouldSearch: false, query: '', reason: 'empty user message' };
  }

  if (!DEEPSEEK_API_KEY) {
    console.warn('[RagRouter] LLM API key not configured; skipping router');
    return { shouldSearch: false, query: '', reason: 'router unavailable' };
  }

  const startedAt = Date.now();

  try {
    const timeoutSignal = createAbortSignalWithTimeout(options.signal, 6000);
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: buildDecisionMessages(options),
        tools: [RAG_DECISION_TOOL],
        tool_choice: 'required',
        stream: false,
        temperature: 0.1,
        max_tokens: 180,
        thinking: DEEPSEEK_THINKING,
      }),
      signal: timeoutSignal.signal,
    }).finally(timeoutSignal.cleanup);

    if (!response.ok) {
      throw new Error(`router API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    if (!rawArgs || toolCall?.function?.name !== 'decide_rag_search') {
      throw new Error('router did not return decide_rag_search tool call');
    }

    const args = JSON.parse(rawArgs);
    const shouldSearch = args.should_search === true;
    const query = shouldSearch
      ? String(args.query || current).trim()
      : '';
    const reasonText = String(args.reason || 'no reason provided').slice(0, 240);
    const reasonClaimsSameTopic = /same topic|cached context (is|was)? sufficient|same evidence|prior research|已有|同一|同主题|缓存|足够/i.test(reasonText);
    const hasCachedContext = Boolean(options.cachedRagContext?.hasContext && options.cachedRagContext.sourceCount);
    const acknowledgementOnly = isAcknowledgementOrClosingTurn(current);
    const nonEvidenceTurn = reasonSaysNoEvidenceTurn(reasonText);
    const useCachedContext = shouldSearch
      ? false
      : acknowledgementOnly || nonEvidenceTurn
        ? false
      : hasCachedContext && (
          args.use_cached_context === true
          || reasonClaimsSameTopic
          || isLikelySameRagTopic(current, options.cachedRagContext)
        );
    const reason = reasonText;

    console.log('[RagRouter] decision', {
      shouldSearch,
      queryLength: query.length,
      reason,
      useCachedContext,
      acknowledgementOnly,
      nonEvidenceTurn,
      latencyMs: Date.now() - startedAt,
    });

    return { shouldSearch, query, reason, useCachedContext };
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    console.warn('[RagRouter] decision failed; applying deterministic fallback:', error instanceof Error ? error.message : error);
    return deterministicFallback(options.currentUserMessage, options.cachedRagContext);
  }
}

/**
 * Deterministic fallback when the router LLM fails.
 *
 * Evidence-sensitive topics default to search unless fresh cached context
 * already covers the same topic. Non-evidence turns default to no search.
 */
function deterministicFallback(
  userMessage: string,
  cachedContext?: CachedRagContext,
): RagRouteDecision {
  const evidencePatterns = /\b(effectiveness|safe|safety|evidence|frequency|schedule|supplement|nutrition|medication|exercises?|sensory|training|comparison|dosage|dose|rate|improvement|outcome|intervention|therapy|treatment|benefit|side.?effect|risk|study|research|clinical|trial|randomized|meta.?analysis|systematic.?review|developmental?|motor|physical|language|speech|posture|gait|balance|coordination|flatfoot|flat.?feet|arch|arches|collapsed|regression|fallback|primitive reflex|reflex integration|vestibular|proprioception|orthopedic|physiotherapy|physical therapy|occupational therapy)\b/i;
  const cnEvidencePatterns = /(效果|安全|证据|频率|剂量|补充|营养|药物|运动|感觉统合|训练|对比|改善|干预|治疗|副作用|风险|研究|临床|试验|发育|运动发育|语言发育|姿势|步态|平衡|协调|足弓|扁平足|塌陷|退步|倒退|原始反射|反射整合|前庭|本体觉|骨科|物理治疗|作业治疗)/;

  const isEvidenceSensitive = evidencePatterns.test(userMessage) || cnEvidencePatterns.test(userMessage);

  if (isEvidenceSensitive) {
    if (isLikelySameRagTopic(userMessage, cachedContext)) {
      console.log('[RagRouter] fallback: evidence-sensitive but cached context available, skipping search');
      return { shouldSearch: false, query: '', reason: 'router failed; same-topic cached context available', useCachedContext: true };
    }
    console.log('[RagRouter] fallback: evidence-sensitive, defaulting to search');
    return { shouldSearch: true, query: userMessage.slice(0, 200), reason: 'router failed; evidence-sensitive fallback' };
  }

  return {
    shouldSearch: false,
    query: '',
    reason: 'router failed; non-evidence fallback',
    useCachedContext: !isAcknowledgementOrClosingTurn(userMessage) && isLikelySameRagTopic(userMessage, cachedContext),
  };
}
