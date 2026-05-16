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
}

interface RouteRagNeedOptions {
  messages: RagRouterMessage[];
  currentUserMessage: string;
  folderKey?: string | null;
  signal?: AbortSignal;
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };

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
        query: {
          type: 'string',
          description: 'If should_search is true, write a concise English research query capturing the evidence need and relevant context. If false, use an empty string.',
        },
        reason: {
          type: 'string',
          description: 'Brief internal reason for observability. Do not include private details beyond the minimal decision rationale.',
        },
      },
      required: ['should_search', 'reason'],
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
- Do not use keyword matching. Judge semantic intent and evidence need.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        folderKey: options.folderKey || null,
        currentUserMessage: options.currentUserMessage,
        recentConversation: context,
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
    console.warn('[RagRouter] DEEPSEEK_API_KEY not configured; skipping router');
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
    const reason = String(args.reason || 'no reason provided').slice(0, 240);

    console.log('[RagRouter] decision', {
      shouldSearch,
      queryLength: query.length,
      reason,
      latencyMs: Date.now() - startedAt,
    });

    return { shouldSearch, query, reason };
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }
    console.warn('[RagRouter] decision failed; continuing without RAG:', error instanceof Error ? error.message : error);
    return { shouldSearch: false, query: '', reason: 'router failed' };
  }
}
