import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_TITLE_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function fallbackTitleFromMessage(message: string) {
  const trimmed = message.trim();
  return trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : '');
}

function cleanTitle(rawTitle: string, userMessage: string) {
  const title = rawTitle
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) return fallbackTitleFromMessage(userMessage);
  if (title.length <= 60) return title;
  return title.slice(0, 57).trimEnd() + '...';
}

function canReplaceExistingTitle(existingTitle: string | null | undefined, expectedFallback: string) {
  const title = (existingTitle || '').trim();
  return !title || title === 'New Conversation' || title === expectedFallback;
}

async function generateTitle(userMessage: string, assistantMessage: string) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.2,
      max_tokens: 40,
      messages: [
        {
          role: 'system',
          content: [
            'Generate a concise chat title for an ADHD family support conversation.',
            'Return the title only, with no quotes and no punctuation wrapper.',
            'Use the same language as the user.',
            'English: 3-6 words. Chinese: 4-12 Chinese characters when possible.',
            'Do not use emoji. Do not diagnose. Do not mention Qimi.',
          ].join(' '),
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
    throw new Error(`DeepSeek title generation failed: ${response.status}`);
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

    const rawTitle = await generateTitle(userMessage, assistantMessage);
    const title = cleanTitle(rawTitle, userMessage);

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
