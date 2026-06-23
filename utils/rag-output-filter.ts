/**
 * RAG process-leak filter.
 *
 * Removes common tool/process artifacts from streamed and final assistant
 * output. Runs after the DSML filter. Must not delete legitimate phrases
 * like "the research suggests" that are part of the final answer.
 */

// Patterns that indicate RAG/tool process chatter leaking into user-visible output.
// Each pattern is carefully scoped to avoid removing legitimate answer content.
const PROCESS_LEAK_PATTERNS: Array<{ re: RegExp; label: string }> = [
  // English process chatter
  { re: /I (will|am (now |going to ))?(search|query|call|invoke|use) (the |my |our )?(RAG|research|paper|tool|database|retrieval|search)( tool| system| engine| library| API)?[.!]?\s*/gi, label: 'process-chatter-en' },
  { re: /I (will |am (now )?)?(now )?(look (up|into|for)|check|find|retrieve|pull up|fetch|access) (the |some |relevant )?(research|papers|studies|evidence|sources|literature|database)[.!]?\s*/gi, label: 'process-chatter-en' },
  { re: /Let me (search|query|call|invoke|use|look up|check|find|retrieve|pull up|fetch|access) (the |my |our |some |relevant )?(RAG|research|paper|tool|database|retrieval|search|studies|evidence|sources|literature)( tool| system| engine| library| API)?[.!]?\s*/gi, label: 'process-chatter-en' },
  { re: /calling (the |my |our )?(RAG|research|paper|tool|database|retrieval|search)( tool| system| engine| library| API)?[.!]?\s*/gi, label: 'process-chatter-en' },
  { re: /querying (the |my |our )?(research|paper|ADHD|RAG|retrieval|search)( database| system| engine| library| API)?[.!]?\s*/gi, label: 'process-chatter-en' },
  { re: /I (have |'ve )?(found|retrieved|searched|looked up|pulled up|fetched|accessed) \d+ (research |paper |study |source )?(results|papers|studies|sources|records)[.!]?\s*/gi, label: 'process-chatter-en' },

  // JSON-like tool call residuals
  { re: /\{[^{}]*"(query|top_k|should_search|search_query|query_text)"[^{}]*\}/g, label: 'json-tool-residual' },
  { re: /\bquery\s*[:=]\s*["'][^"']*["']/gi, label: 'json-tool-residual' },
  { re: /\btop_k\s*[:=]\s*\d+/gi, label: 'json-tool-residual' },
  { re: /\bshould_search\s*[:=]\s*(true|false)/gi, label: 'json-tool-residual' },

  // Chinese process chatter
  { re: /我来(为你|帮你|给你)?(检索|搜索|查询|调用|查找|搜索一下|查一下)[^。！.]*[。！.]?\s*/g, label: 'process-chatter-cn' },
  { re: /正在(调用|使用|查询|检索|搜索)(RAG|研究|论文|工具|数据库|检索|搜索)[^。！.]*[。！.]?\s*/g, label: 'process-chatter-cn' },
  { re: /我(需要|先|将|会|要)(检索|搜索|查询|调用|查找|搜索一下|查一下)[^。！.]*[。！.]?\s*/g, label: 'process-chatter-cn' },
  { re: /搜索论文[^。！.]*[。！.]?\s*/g, label: 'process-chatter-cn' },
  { re: /调用(研究|论文|RAG|检索|搜索)(工具|系统|引擎|数据库|API)[^。！.]*[。！.]?\s*/g, label: 'process-chatter-cn' },
];

/**
 * Filter RAG process leakage from text.
 * Returns the cleaned text.
 */
export function filterRagProcessLeak(text: string): string {
  let result = text;
  for (const { re } of PROCESS_LEAK_PATTERNS) {
    result = result.replace(re, '');
  }
  // Clean up multiple blank lines left by removals.
  // Do not trim here: the streaming filter buffers chunk tails, and trimming
  // every partial chunk deletes significant spaces between emitted tokens.
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

export interface RagProcessLeakFilterState {
  buffer: string;
}

export function createRagProcessLeakFilter(): RagProcessLeakFilterState {
  return { buffer: '' };
}

/**
 * Streaming variant. Keeps a short tail so process chatter split across chunks
 * can still be removed before it reaches the client.
 */
export function feedRagProcessLeakFilter(
  state: RagProcessLeakFilterState,
  chunk: string,
): string {
  state.buffer += chunk;
  const cleaned = filterRagProcessLeak(state.buffer);
  const keep = Math.min(cleaned.length, 180);
  const emitLength = Math.max(0, cleaned.length - keep);
  const out = cleaned.slice(0, emitLength);
  state.buffer = cleaned.slice(emitLength);
  return out;
}

export function flushRagProcessLeakFilter(state: RagProcessLeakFilterState): string {
  const out = filterRagProcessLeak(state.buffer);
  state.buffer = '';
  return out;
}

/**
 * Check if text contains RAG process leakage (for replay assertions).
 */
export function detectRagProcessLeak(text: string): string[] {
  const detected: string[] = [];
  for (const { re, label } of PROCESS_LEAK_PATTERNS) {
    if (re.test(text)) {
      detected.push(label);
      re.lastIndex = 0; // reset for safety
    }
  }
  return detected;
}
