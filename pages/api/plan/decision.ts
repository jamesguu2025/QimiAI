import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';
import type { PlanCategory } from '../../../types/plan';
import { PLAN_CATEGORIES } from '../../../types/plan';
import { actorKey, consumePersistentRateLimit } from '../../../lib/ai-usage';
import { getAnalyticsUserIdByEmail } from '../../../lib/analytics';

type PlanDecision = {
  shouldPropose: boolean;
  category: PlanCategory | null;
};

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const VALID_CATEGORIES = new Set(PLAN_CATEGORIES.map((category) => category.id));
const MAX_PAYLOAD_BYTES = 16 * 1024;

function cleanJsonResponse(responseText: string): string {
  return responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function normalizeDecision(value: unknown): PlanDecision {
  if (!value || typeof value !== 'object') {
    return { shouldPropose: false, category: null };
  }

  const data = value as { shouldPropose?: unknown; should_propose?: unknown; category?: unknown };
  const shouldPropose = data.shouldPropose === true || data.should_propose === true;
  const category = typeof data.category === 'string' && VALID_CATEGORIES.has(data.category as PlanCategory)
    ? data.category as PlanCategory
    : null;

  return {
    shouldPropose,
    category: shouldPropose ? category : null,
  };
}

async function evaluatePlanDecision(assistantContent: string): Promise<PlanDecision> {
  if (!DEEPSEEK_API_KEY || assistantContent.trim().length < 100) {
    return { shouldPropose: false, category: null };
  }

  const prompt = `Decide whether this assistant message should show a "Save to Growth Plan" button.

Return JSON only:
{
  "shouldPropose": boolean,
  "category": "emotion" | "learning" | "exercise" | "nutrition" | "social" | "sleep" | "school" | null
}

Return shouldPropose=true only when ALL are true:
1. The message contains a self-contained Growth Plan-ready section or clearly plan-like block, not just scattered tips inside a research summary.
2. It has at least 2 concrete action steps a parent can try, not just questions, explanations, or broad directions.
3. It includes concrete timing, frequency, quantity, sequence, or implementation detail.
4. The actionable part can be saved without the parent needing to reread the whole research explanation.
5. The actionable part is framed as something the parent can actually do next, not merely evidence, possible options, or questions to answer before a plan is built.

Return false for:
- replies that mainly ask questions before building a plan
- generic explanations, reassurance, research summaries, or loose tip lists without a clear plan-like structure
- replies that say they will build a plan after the parent answers more questions
- medication dosage/change instructions, crisis/emergency instructions, legal-only advice
- messages promising to build a plan later

If true, choose the closest category.

ASSISTANT MESSAGE:
${assistantContent}`;

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: 'You are a strict classifier for whether a chat reply contains a saveable ADHD support action plan. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      temperature: 0,
      max_tokens: 120,
      thinking: DEEPSEEK_THINKING,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`LLM plan decision failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    return { shouldPropose: false, category: null };
  }

  return normalizeDecision(JSON.parse(cleanJsonResponse(text)));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'plan-decision',
    key: session.user.email,
    limit: 30,
    windowMs: 60 * 1000,
  })) {
    return;
  }

  const { assistantContent } = req.body || {};
  if (typeof assistantContent !== 'string') {
    return res.status(400).json({ error: 'assistantContent is required' });
  }

  try {
    const userId = await getAnalyticsUserIdByEmail(session.user.email);
    if (!userId) return res.status(404).json({ error: 'User not found' });
    const minuteLimit = await consumePersistentRateLimit({
      actorKey: actorKey('user', userId), scope: 'plan_decision',
    });
    if (!minuteLimit.allowed) {
      res.setHeader('Retry-After', String(minuteLimit.retryAfterSeconds));
      return res.status(429).json({ error: 'Too many requests' });
    }
    const decision = await evaluatePlanDecision(assistantContent.trim().slice(0, 8000));
    return res.status(200).json(decision);
  } catch (error) {
    console.warn('[plan/decision] graceful no-show:', error);
    return res.status(200).json({ shouldPropose: false, category: null });
  }
}
