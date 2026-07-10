/**
 * RAG 跨境延迟探针
 *
 * 两种用法：
 * 1) 本地/服务器直接跑：  node scripts/rag-latency-probe.mjs
 * 2) 放成 Vercel API 路由：把 handler 思路搬进 app/api/rag-probe/route.ts
 *    （Vercel 上务必在 Region 设置里把函数固定到北美区，比如 iad1/sfo1，
 *      否则默认就近区会污染测量结果）
 *
 * 测的是「网页服务器 → 阿里云 RAG」这一跳的真实网络耗时，
 * 不含 LLM 生成时间。跑真实 /search（带 payload）比 /health 更有代表性。
 */

const RAG_BASE_URL = process.env.RAG_BASE_URL || 'http://47.110.88.11:8000';
const RAG_API_KEY = process.env.RAG_API_KEY || '';
const ROUNDS = Number(process.env.PROBE_ROUNDS || 10);
const PROBE_QUERY =
  process.env.PROBE_QUERY ||
  'collapsed foot arch in child with developmental delay, slow progress with exercises';

function pct(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function timedSearch() {
  const started = performance.now();
  let ok = false;
  let bytes = 0;
  let status = 0;
  try {
    const res = await fetch(`${RAG_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(RAG_API_KEY ? { Authorization: `Bearer ${RAG_API_KEY}` } : {}),
      },
      body: JSON.stringify({ query: PROBE_QUERY, top_k: 10 }),
      signal: AbortSignal.timeout(15000),
    });
    status = res.status;
    const text = await res.text();
    bytes = text.length;
    ok = res.ok;
  } catch (err) {
    return { ms: performance.now() - started, ok: false, status, bytes, error: String(err) };
  }
  return { ms: performance.now() - started, ok, status, bytes };
}

async function main() {
  console.log(`Probing ${RAG_BASE_URL}/search  (${ROUNDS} rounds, top_k=10)\n`);
  const samples = [];
  for (let i = 0; i < ROUNDS; i++) {
    const r = await timedSearch();
    samples.push(r);
    console.log(
      `round ${String(i + 1).padStart(2)}: ${r.ms.toFixed(0).padStart(5)}ms  ` +
        `http=${r.status} bytes=${r.bytes}${r.error ? '  ERR=' + r.error : ''}`
    );
  }
  const good = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  const failed = samples.length - good.length;
  if (good.length) {
    const avg = good.reduce((a, b) => a + b, 0) / good.length;
    console.log(
      `\nok=${good.length}/${samples.length} fail=${failed}\n` +
        `min=${good[0].toFixed(0)}ms  p50=${pct(good, 50).toFixed(0)}ms  ` +
        `p90=${pct(good, 90).toFixed(0)}ms  max=${good[good.length - 1].toFixed(0)}ms  ` +
        `avg=${avg.toFixed(0)}ms`
    );
  } else {
    console.log(`\nALL FAILED (${failed}/${samples.length}) — 检查网络/防火墙/API key`);
  }
}

main();
