import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_TITLE_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const MAX_ENGLISH_TITLE_CHARS = 36;
const MAX_CJK_TITLE_CHARS = 14;
const MAX_PAYLOAD_BYTES = 8 * 1024;

function fallbackTitleFromMessage(message: string) {
  const trimmed = message.trim();
  return trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : '');
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEchoTitle(title: string, userMessage: string, fallbackTitle: string) {
  const normalizedTitle = normalizeTitle(title);
  const normalizedUserMessage = normalizeTitle(userMessage);
  const normalizedFallback = normalizeTitle(fallbackTitle);

  if (!normalizedTitle) return true;
  if (normalizedTitle === normalizedFallback) return true;
  if (normalizedFallback.startsWith(normalizedTitle) || normalizedTitle.startsWith(normalizedFallback)) return true;
  if (normalizedUserMessage.startsWith(normalizedTitle) && normalizedTitle.length > 24) return true;
  return false;
}

function hasCjk(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function shouldGenerateEnglishTitle(userMessage: string) {
  return !hasCjk(userMessage);
}

function clampTitleLength(title: string) {
  if (hasCjk(title)) {
    return title.length > MAX_CJK_TITLE_CHARS ? title.slice(0, MAX_CJK_TITLE_CHARS) : title;
  }

  if (title.length <= MAX_ENGLISH_TITLE_CHARS) return title;

  const words = title.split(/\s+/);
  let nextTitle = '';
  for (const word of words) {
    const candidate = nextTitle ? `${nextTitle} ${word}` : word;
    if (candidate.length > MAX_ENGLISH_TITLE_CHARS) break;
    nextTitle = candidate;
  }

  return nextTitle || title.slice(0, MAX_ENGLISH_TITLE_CHARS).trim();
}

function cleanTitle(rawTitle: string) {
  const title = rawTitle
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .replace(/^title\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) return '';
  return clampTitleLength(title);
}

function canReplaceExistingTitle(existingTitle: string | null | undefined, expectedFallback: string) {
  const title = (existingTitle || '').trim();
  return !title || title === 'New Conversation' || title === expectedFallback;
}

async function generateTitle(userMessage: string, assistantMessage: string, retry = false) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const languageRule = shouldGenerateEnglishTitle(userMessage)
    ? 'Generate the title in English. For ambiguous or short inputs like "hi", default to English.'
    : 'The user message contains Chinese characters, so a Chinese title is allowed.';

  const systemPrompt = retry
    ? [
        'Create a short topic label for this chat.',
        'Return ONLY a noun phrase, not the user sentence.',
        'Do not start with "I", "why", "how", or "what".',
        'Examples: "Child Sleep Dreams", "Homework Meltdowns", "Medication Questions".',
        languageRule,
        'No emoji. No quotes.',
      ].join(' ')
    : [
        'Generate a concise chat title for an ADHD family support conversation.',
        'Return the title only, with no quotes and no punctuation wrapper.',
        languageRule,
        'English: 2-5 words. Chinese: 4-12 Chinese characters only when the user wrote Chinese.',
        'Make it a topic label, not a copy of the user question.',
        'Do not use emoji. Do not diagnose. Do not mention Qimi.',
      ].join(' ');

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      thinking: DEEPSEEK_THINKING,
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            `User message:\n${userMessage.slice(0, 1000)}`,
            `Assistant reply:\n${assistantMessage.slice(0, 1200)}`,
          ].join('\n\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM title generation failed: ${response.status}`);
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content || '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'conversation-title',
    key: session.user.email,
    limit: 20,
    windowMs: 60 * 1000,
  })) {
    return;
  }

  const { conversationId, userMessage, assistantMessage, fallbackTitle } = req.body || {};
  if (
    typeof conversationId !== 'string' ||
    typeof userMessage !== 'string' ||
    typeof assistantMessage !== 'string' ||
    !conversationId.trim() ||
    !userMessage.trim() ||
    !assistantMessage.trim()
  ) {
    return res.status(400).json({ error: 'conversationId, userMessage, and assistantMessage are required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, title, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const expectedFallback = typeof fallbackTitle === 'string' && fallbackTitle.trim()
      ? fallbackTitle.trim()
      : fallbackTitleFromMessage(userMessage);

    if (!canReplaceExistingTitle(conversation.title, expectedFallback)) {
      return res.status(200).json({ title: conversation.title, skipped: true });
    }

    const requireEnglishTitle = shouldGenerateEnglishTitle(userMessage);
    let rawTitle = await generateTitle(userMessage, assistantMessage);
    let title = cleanTitle(rawTitle);

    if (isEchoTitle(title, userMessage, expectedFallback) || (requireEnglishTitle && hasCjk(title))) {
      rawTitle = await generateTitle(userMessage, assistantMessage, true);
      title = cleanTitle(rawTitle);
    }

    if (!title || isEchoTitle(title, userMessage, expectedFallback) || (requireEnglishTitle && hasCjk(title))) {
      return res.status(200).json({ title: conversation.title, skipped: true });
    }

    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select('title')
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ error: 'Failed to update conversation title' });
    }

    return res.status(200).json({ title: updated.title, skipped: false });
  } catch (error) {
    console.error('[conversations/generate-title] Failed:', error);
    return res.status(500).json({ error: 'Failed to generate conversation title' });
  }
}
