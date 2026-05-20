// pages/api/chat/stream.ts - Chat SSE Stream API with RAG Tool Calling
// Direct connection to DeepSeek API with dynamic prompt system and RAG support

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { buildSystemMessage, UserProfile } from '../../../lib/prompts';
import {
  executeRAGWithSmartSummary,
} from '../../../services/rag-service';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { isTopicFolder, normalizeTopicFolder, TopicFolder } from '../../../types/chat';
import { routeRagNeed } from '../../../lib/rag-router';
import { trackServerEvent } from '../../../lib/analytics';
import { getClientIp, getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

type ChatSource = {
  title: string;
  url: string;
  snippet?: string;
  year?: number | string;
  journal?: string;
  authors?: string[];
  doi?: string;
  pmid?: string;
};
type HistoryMessage = { role: string; content: string; sources?: ChatSource[] };

// DeepSeek V3.2/V4 emits DSML markers using FULLWIDTH vertical lines (U+FF5C `｜`),
// often doubled: `<｜｜DSML｜｜tagname>`. ASCII `|` is also seen in some variants.
// We normalize `｜` → `|` and match 1+ pipes on either side of `DSML`.

// Strip DSML markup from AI responses before saving to DB or passing as context.
// Leaving raw DSML in saved messages causes the model to imitate the format in subsequent turns.
function stripDsml(text: string): string {
  // Normalize fullwidth pipes to ASCII so a single set of patterns covers both variants.
  const normalized = text.replace(/｜/g, '|');
  // Named element blocks: <|+DSML|+tagname ...>...</|+DSML|+tagname> — strip iteratively for nesting
  const namedBlock = /<\|+DSML\|+[A-Za-z_]\w*[^>]*>[\s\S]*?<\/\|+DSML\|+[A-Za-z_]\w*>/g;
  let result = normalized;
  let prev = '';
  while (result !== prev) {
    prev = result;
    result = result.replace(namedBlock, '');
  }
  return result
    .replace(/<\|+DSML\|+invoke\s+[^>]*\/>\s*(?:<\|+DSML\|+>)?/g, '')  // self-closing invocations
    .replace(/<\|+DSML\|+>[\s\S]*?<\/?\|+DSML\|+>/g, '')                // unnamed blocks
    .replace(/<\/\|+DSML\|+[A-Za-z_]\w*>/g, '')                         // orphaned close tags
    .replace(/<\|+DSML\|+[A-Za-z_]\w*[^>]*>/g, '')                      // orphaned open tags
    .replace(/<\|+DSML\|*[\s\S]*$/, '')                                 // trailing partial
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Streaming DSML filter — mirrors vLLM's server-side prefix-buffer fix client-side.
// Known issue: DeepSeek V3.2/V4 with tool_choice=auto + stream=true intermittently leaks
// DSML tool-call XML as plain content (vLLM #40800, sglang #14695). We buffer any tail
// that could be the start of a DSML marker (in either ASCII or fullwidth variant) and
// swallow entire DSML blocks before emit.

// A complete DSML opening prefix: `<` + 1+ pipes + `DSML` + 1+ pipes (pipes already normalized).
const DSML_OPEN_PREFIX_RE = /<\|+DSML\|+/;
// Partial DSML start at the very end of the buffer — any prefix of the full pattern.
// Must include the bare `<` case so 1-char chunked streams (worst case) still hold it.
const DSML_PARTIAL_TAIL_RE = /<(?:\|+(?:D(?:S(?:M(?:L\|*)?)?)?)?)?$/;
// Stricter: definite partial marker (used at flush time to drop, not at-stream to hold).
const DSML_DEFINITE_PARTIAL_RE = /<\|+(?:D(?:S(?:M(?:L\|*)?)?)?)?$/;

interface DsmlFilterState {
  buffer: string;
  waitingForClose: RegExp | null;
}

function createDsmlFilter(): DsmlFilterState {
  return { buffer: '', waitingForClose: null };
}

function feedDsmlFilter(state: DsmlFilterState, chunk: string): string {
  // Normalize fullwidth pipes to ASCII so all downstream matching is single-form.
  state.buffer += chunk.replace(/｜/g, '|');
  let out = '';

  while (state.buffer.length > 0) {
    if (state.waitingForClose) {
      const m = state.buffer.match(state.waitingForClose);
      if (!m || m.index === undefined) {
        // No close yet — keep a bounded tail in case the close marker is split across chunks.
        const keep = Math.min(state.buffer.length, 40);
        state.buffer = state.buffer.slice(-keep);
        return out;
      }
      state.buffer = state.buffer.substring(m.index + m[0].length);
      state.waitingForClose = null;
      continue;
    }

    const openMatch = state.buffer.match(DSML_OPEN_PREFIX_RE);
    if (!openMatch || openMatch.index === undefined) {
      // No full DSML prefix. Hold any partial-marker tail; emit the rest.
      const partial = state.buffer.match(DSML_PARTIAL_TAIL_RE);
      if (partial && partial.index !== undefined) {
        out += state.buffer.substring(0, partial.index);
        state.buffer = state.buffer.substring(partial.index);
      } else {
        out += state.buffer;
        state.buffer = '';
      }
      return out;
    }

    // Found a DSML start — emit content before it, then classify the opening tag.
    out += state.buffer.substring(0, openMatch.index);
    state.buffer = state.buffer.substring(openMatch.index);
    const prefixLen = openMatch[0].length;

    // Unnamed block: <|+DSML|+>
    if (state.buffer.charAt(prefixLen) === '>') {
      state.buffer = state.buffer.substring(prefixLen + 1);
      state.waitingForClose = /<\/\|+DSML\|+>/;
      continue;
    }

    const gt = state.buffer.indexOf('>');
    if (gt === -1) return out; // wait for opening tag to complete

    const openTag = state.buffer.substring(0, gt + 1);

    // Self-closing: <|+DSML|+invoke .../>
    if (openTag.endsWith('/>')) {
      state.buffer = state.buffer.substring(gt + 1);
      const trailing = state.buffer.match(/^<\|+DSML\|+>/);
      if (trailing) state.buffer = state.buffer.substring(trailing[0].length);
      continue;
    }

    // Named: <|+DSML|+tagname ...>
    const afterPrefix = openTag.substring(prefixLen);
    const tag = afterPrefix.match(/^([A-Za-z_]\w*)/);
    if (tag) {
      state.buffer = state.buffer.substring(gt + 1);
      state.waitingForClose = new RegExp(`<\\/\\|+DSML\\|+${tag[1]}>`);
      continue;
    }

    // Unrecognized shape — emit first char to avoid infinite loop.
    out += state.buffer[0];
    state.buffer = state.buffer.substring(1);
  }

  return out;
}

function flushDsmlFilter(state: DsmlFilterState): string {
  if (state.waitingForClose) {
    state.buffer = '';
    state.waitingForClose = null;
    return '';
  }
  // Drop a clearly-partial DSML marker; emit anything else (including a stray `<`).
  const tail = state.buffer;
  state.buffer = '';
  return DSML_DEFINITE_PARTIAL_RE.test(tail) ? '' : tail;
}

// DeepSeek API configuration from environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_THINKING = { type: 'disabled' };
const MAX_CHAT_PAYLOAD_BYTES = 64 * 1024;
const AUTH_DAILY_CHAT_LIMIT = 50;
const GUEST_LIFETIME_CHAT_LIMIT = 10;
const GUEST_SESSION_COOKIE = 'qimi_guest_session';
const GUEST_CHAT_QUOTA_COOKIE = 'qimi_guest_chat_quota';
const ENABLE_RAG = process.env.ENABLE_RAG === 'true';

function shouldReusePriorSources(userMessage: string): boolean {
  return /\b(re-?output|rewrite|restate|repeat|again|same answer|previous answer|above|same plan)\b|重新输出|再输出|重写|复述|再说一遍|刚才|上面|同一个方案/i.test(userMessage);
}

function getRecentHistorySources(conversationHistory: unknown): ChatSource[] {
  if (!Array.isArray(conversationHistory)) return [];

  const seen = new Set<string>();
  const sources: ChatSource[] = [];
  for (const msg of conversationHistory.slice(-10).reverse() as HistoryMessage[]) {
    if (!Array.isArray(msg.sources) || msg.sources.length === 0) continue;
    for (const source of msg.sources) {
      if (!source?.url || !source.title || seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push({
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        year: source.year,
        journal: source.journal,
        authors: source.authors,
        doi: source.doi,
        pmid: source.pmid,
      });
      if (sources.length >= 10) return sources;
    }
  }
  return sources;
}

function formatSourceLinksForPrompt(sources: ChatSource[]): string {
  return sources
    .filter(source => source.url)
    .map((source, index) => {
      const meta = [
        source.year,
        source.journal,
        Array.isArray(source.authors) && source.authors.length > 0 ? `${source.authors[0]}${source.authors.length > 1 ? ' et al.' : ''}` : null,
      ].filter(Boolean).join(' | ');
      return `${index + 1}. [${source.title}](${source.url})${meta ? ` — ${meta}` : ''}`;
    })
    .join('\n');
}

function getCookieAttributes() {
  const attrs = ['Path=/', 'Max-Age=31536000', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') attrs.push('Secure');
  return attrs.join('; ');
}

function getCookieSigningSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'qimi-local-dev-secret';
}

function signGuestUsage(sessionId: string, count: number) {
  return createHmac('sha256', getCookieSigningSecret())
    .update(`${sessionId}.${count}`)
    .digest('base64url');
}

function readGuestUsage(rawValue: string | undefined, sessionId: string) {
  if (!rawValue) return 0;
  const [countText, signature] = rawValue.split('.');
  const count = Number.parseInt(countText || '', 10);
  if (!Number.isFinite(count) || count < 0 || !signature) return 0;

  const expected = signGuestUsage(sessionId, count);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return 0;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return 0;
  return count;
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  res.setHeader('Set-Cookie', Array.isArray(current) ? [...current, cookie] : [String(current), cookie]);
}

function setSignedGuestUsage(res: NextApiResponse, sessionId: string, count: number) {
  const signature = signGuestUsage(sessionId, count);
  appendSetCookie(res, `${GUEST_CHAT_QUOTA_COOKIE}=${count}.${signature}; ${getCookieAttributes()}`);
}

function ensureGuestSession(req: NextApiRequest, res: NextApiResponse) {
  const existing = req.cookies[GUEST_SESSION_COOKIE];
  if (existing) return existing;

  const sessionId = randomUUID();
  appendSetCookie(res, `${GUEST_SESSION_COOKIE}=${sessionId}; ${getCookieAttributes()}`);
  return sessionId;
}

function shanghaiDayStartIso() {
  const offsetMs = 8 * 60 * 60 * 1000;
  const shanghaiNow = new Date(Date.now() + offsetMs);
  shanghaiNow.setUTCHours(0, 0, 0, 0);
  return new Date(shanghaiNow.getTime() - offsetMs).toISOString();
}

async function countUserMessagesToday(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { count, error } = await supabase
    .from('messages')
    .select('id, conversations!inner(user_id)', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('conversations.user_id', userId)
    .gte('created_at', shanghaiDayStartIso());

  if (error) {
    console.error('[chat/stream] Daily quota count failed:', error);
    return null;
  }

  return count || 0;
}

function buildRagAnswerInstruction(sourceCount: number): string {
  const paperLabel = sourceCount === 1 ? 'paper' : 'papers';
  return `Use the retrieved research as the backbone for this answer, not as optional decoration.

How to answer:
- Start by answering the parent's actual question in plain English.
- Let the studies constrain the recommendation: intervention choice, frequency, duration, expected benefit, limits, and confidence should come from the research when available.
- If a study provides concrete parameters, use them instead of inventing generic ones.
- Do not turn the answer into a literature review. Mention the evidence naturally where it supports a key point.
- Include 1-3 clickable Markdown citations in the body when making evidence-based claims, using the source links provided above.
- If you mention an author-year citation such as "Capodieci et al. (2017)", it must be a Markdown link using the matching source URL, e.g. "[Capodieci et al. (2017)](https://...)". Never leave author-year citations as plain text when the source URL is available.
- Also rely on the separate "Based on ${sourceCount} research ${paperLabel}" source list that the UI will show below the message.
- If the research does not directly support a claim, say that part is practical judgment or clinical/common-sense guidance rather than pretending it is paper-backed.
- Do not let retrieved research override the consultative flow. For broad personalized behavior problems, give a short evidence-informed orientation, then ask the most diagnostic follow-up question before recommending a specific plan.
- During information gathering, do not output a Growth Plan-ready action table just because papers were retrieved. First clarify the failure point and what the parent has already tried.
- If the plan readiness gate is met and you include saveable guidance, format a compact Growth Plan-ready block with: Goal, Try this for, action table when there are multiple steps, Watch for, and Why this may help. This block should be self-contained enough to save.
- Use a Markdown table for multiple actions, stages, repeated timing/frequency fields, school/home comparisons, or weekly schedules.
- For a single strategy, keep When, How often, and How long on separate lines.`;
}

/**
 * Save messages to database for logged-in users
 */
async function saveMessagesToDatabase(
  userEmail: string,
  userMessage: string,
  aiResponse: string,
  conversationId?: string,
  sources?: ChatSource[],
  folderKey?: TopicFolder | null
): Promise<{ conversationId: string; userId: string; userMessageCount: number } | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.log('[chat/stream] User not found, skipping message save');
      return null;
    }

    let convId = conversationId;

    if (convId) {
      const { data: ownedConversation, error: ownershipError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', convId)
        .eq('user_id', user.id)
        .single();

      if (ownershipError || !ownedConversation) {
        console.warn('[chat/stream] Refusing to save to conversation not owned by user');
        return null;
      }
    }

    // Create conversation if not provided
    if (!convId) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          folder_key: folderKey || null,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[chat/stream] Failed to create conversation:', convError);
        return null;
      }
      convId = newConv.id;
      console.log('[chat/stream] Created new conversation:', convId);
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: userMessage,
      });

    if (userMsgError) {
      console.error('[chat/stream] Failed to save user message:', userMsgError);
    }

    // Save AI response — strip DSML before storing so history stays clean
    const { error: aiMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: stripDsml(aiResponse),
        sources: sources || null,
      });

    if (aiMsgError) {
      console.error('[chat/stream] Failed to save AI message:', aiMsgError);
    }

    // Update conversation's updated_at to move it to top of recent list
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[chat/stream] Failed to update conversation timestamp:', updateError);
    }

    const { count: userMessageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)
      .eq('role', 'user');

    console.log('[chat/stream] Messages saved to conversation:', convId);
    return convId ? { conversationId: convId, userId: user.id, userMessageCount: userMessageCount || 0 } : null;
  } catch (error) {
    console.error('[chat/stream] Error saving messages:', error);
    return null;
  }
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

// Message interface for conversation history
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key is configured
  if (!DEEPSEEK_API_KEY) {
    console.error('[chat/stream] DEEPSEEK_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Create AbortController to cancel DeepSeek API calls when client disconnects
  const abortController = new AbortController();
  let clientDisconnected = false;

  // Listen for client disconnect - multiple event listeners for reliability
  const handleDisconnect = (eventName: string) => {
    if (!clientDisconnected) {
      console.log(`[chat/stream] ${eventName} event - client disconnecting`);
      clientDisconnected = true;
      abortController.abort();
    }
  };

  res.on('close', () => handleDisconnect('close'));
  res.on('finish', () => {
    console.log('[chat/stream] Response finished normally');
  });

  // Also listen on socket for more reliable disconnect detection
  if (res.socket) {
    res.socket.on('close', () => handleDisconnect('socket.close'));
    res.socket.on('error', () => handleDisconnect('socket.error'));
  }

  let authStateForError: 'authenticated' | 'guest' = 'guest';

  try {
    // Get user ID from session or guest cookie (for logging/rate limiting)
    const session = await getServerSession(req, res, authOptions);
    authStateForError = session?.user?.email ? 'authenticated' : 'guest';
    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      userId = `guest_${ensureGuestSession(req, res)}`;
    }

    const { content, attachments, conversationHistory, userProfile, forceRAG, conversationId } = req.body;
    if (getPayloadSizeBytes(req) > MAX_CHAT_PAYLOAD_BYTES) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    if (rejectIfRateLimited(req, res, {
      namespace: 'chat-stream',
      key: session?.user?.email || getClientIp(req),
      limit: session?.user?.email ? 60 : 15,
      windowMs: 60 * 1000,
    })) {
      return;
    }

    const reusableSources = shouldReusePriorSources(content || '')
      ? getRecentHistorySources(conversationHistory)
      : [];
    const requestedFolderKey = isTopicFolder(req.body.folderKey)
      ? normalizeTopicFolder(req.body.folderKey)
      : null;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Store user message for later saving
    const userMessage = content || '';

    // Prepare conversation history for module identification
    const historyForModule: ChatMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-5).map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      : [];

    // Enrich userProfile with memory context (familyNotes + extractedFacts)
    const supabaseMemory = getSupabaseAdmin();
    let enrichedProfile = userProfile as UserProfile | null;
    let authenticatedUserId: string | null = null;
    if (session?.user?.email) {
      try {
        const { data: userData } = await supabaseMemory
          .from('users')
          .select('id')
          .eq('email', session.user.email)
          .single();

        if (userData) {
          authenticatedUserId = userData.id;
          // Get profile summary
          const { data: summaryData } = await supabaseMemory
            .from('profile_summaries')
            .select('summary')
            .eq('user_id', userData.id)
            .single();

          // Get top 5 active memory items by recency
          const { data: memoryItems } = await supabaseMemory
            .from('memory_items')
            .select('category, fact_key, fact_value')
            .eq('user_id', userData.id)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(5);

          const memoryContext: Record<string, unknown> = { ...(enrichedProfile || {}) };
          if (summaryData?.summary) {
            memoryContext.familyNotes = summaryData.summary;
          }
          if (memoryItems && memoryItems.length > 0) {
            memoryContext.extractedFacts = memoryItems.map(
              (i: { category: string; fact_key: string; fact_value: string }) =>
                `[${i.category}] ${i.fact_key}: ${i.fact_value}`
            );
          }
          enrichedProfile = memoryContext as UserProfile;
          console.log(`[chat/stream] Injected memory context: summary=${!!summaryData?.summary}, facts=${memoryItems?.length || 0}`);
        }
      } catch (memErr) {
        console.error('[chat/stream] Memory retrieval failed, skipping:', memErr);
        // Silent failure — memory errors must not block chat
      }
    }

    if (session?.user?.email) {
      if (!authenticatedUserId) {
        return res.status(404).json({ error: 'User not found' });
      }

      const messagesToday = await countUserMessagesToday(supabaseMemory, authenticatedUserId);
      if (messagesToday === null) {
        return res.status(503).json({ error: 'Unable to check quota' });
      }
      if (messagesToday >= AUTH_DAILY_CHAT_LIMIT) {
        return res.status(429).json({ error: 'Daily chat limit reached' });
      }
    } else {
      const guestSessionId = ensureGuestSession(req, res);
      const usedCount = readGuestUsage(req.cookies[GUEST_CHAT_QUOTA_COOKIE], guestSessionId);
      if (usedCount >= GUEST_LIFETIME_CHAT_LIMIT) {
        return res.status(429).json({ error: 'Guest chat limit reached' });
      }
      setSignedGuestUsage(res, guestSessionId, usedCount + 1);
    }

    if (conversationId) {
      if (!session?.user?.email || !authenticatedUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: ownedConversation, error: ownershipError } = await supabaseMemory
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', authenticatedUserId)
        .single();

      if (ownershipError || !ownedConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    }

    // Build dynamic system prompt with module injection
    console.log(`[chat/stream] Building system prompt for user ${userId}`);
    const systemPrompt = await buildSystemMessage(
      enrichedProfile,
      content || '',
      historyForModule
    );
    console.log(`[chat/stream] System prompt built, ${systemPrompt.length} characters`);

    // Build messages array for DeepSeek
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if provided — strip any DSML from past assistant messages
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.role === 'assistant' ? stripDsml(msg.content) : msg.content,
          });
        }
      }
    }

    if (reusableSources.length > 0) {
      messages.push({
        role: 'system',
        content: `The user is asking to restate or re-output a previous answer. Reuse these previously retrieved research source links when citing evidence in the new answer. Include clickable Markdown links in the body when referencing specific studies:\n${formatSourceLinksForPrompt(reusableSources)}`,
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: content || '' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Pre-create conversation for logged-in users (before streaming starts)
    let activeConversationId = conversationId;
    const hadExistingConversation = Boolean(conversationId);

    if (session?.user?.email && !activeConversationId) {
      const supabase = getSupabaseAdmin();
      if (authenticatedUserId) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            user_id: authenticatedUserId,
            title,
            folder_key: requestedFolderKey,
          })
          .select('id, folder_key')
          .single();

        if (newConv) {
          activeConversationId = newConv.id;
          console.log('[chat/stream] Pre-created conversation:', activeConversationId);
          // Send as first SSE event so frontend gets the ID before any tokens
          res.write(`data: ${JSON.stringify({
            type: 'conversation_created',
            conversationId: newConv.id,
            folderKey: newConv.folder_key,
          })}\n\n`);
        }
      }
    }

    if (reusableSources.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'sources', sources: reusableSources })}\n\n`);
    }

    // Shared accumulator to track content even if abort happens
    const accumulator = { content: '', sources: reusableSources };

    // Call DeepSeek with potential RAG tool support
    const { fullResponse, sources } = await streamChatWithRAG(
      messages,
      res,
      forceRAG || false,
      abortController.signal,
      accumulator,
      requestedFolderKey
    );

    // Final check if client is still connected before saving
    const socketDestroyed = (res.socket as any)?.destroyed === true;
    const isDisconnected = clientDisconnected || res.writableEnded || socketDestroyed;

    console.log('[chat/stream] Pre-save check - disconnected:', isDisconnected,
      'clientDisconnected:', clientDisconnected,
      'writableEnded:', res.writableEnded,
      'socketDestroyed:', socketDestroyed,
      'responseLength:', fullResponse.length);

    // Save messages to database for logged-in users
    // Like ChatGPT/Claude.ai: Save partial response even if user clicked stop
    if (session?.user?.email && fullResponse) {
      if (isDisconnected) {
        console.log('[chat/stream] Client disconnected, saving partial response');
      }
      const savedChat = await saveMessagesToDatabase(
        session.user.email,
        userMessage,
        fullResponse,
        activeConversationId,
        sources,
        requestedFolderKey
      );

      if (savedChat?.userMessageCount === 1) {
        await trackServerEvent(req, 'chat:first_message_sent', {
          conversation_type: hadExistingConversation ? 'existing' : 'new',
          auth_state: 'authenticated',
          has_attachment: Array.isArray(attachments) && attachments.length > 0,
          folder_key: requestedFolderKey || 'general',
        }, { userId: savedChat.userId, pagePath: '/chat' });
      }

      if (savedChat) {
        if ([1, 3, 5, 10, 20].includes(savedChat.userMessageCount)) {
          await trackServerEvent(req, 'chat:message_count_milestone_reach', {
            milestone: savedChat.userMessageCount,
            auth_state: 'authenticated',
          }, { userId: savedChat.userId, pagePath: '/chat' });
        }
      }

      // Fire-and-forget memory extraction — gate runs inside extract.ts
      if (activeConversationId) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:4000';
        fetch(`${baseUrl}/api/memory/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: req.headers.cookie || '',
          },
          body: JSON.stringify({ conversationId: activeConversationId }),
        }).catch(() => {
          // Silent failure — extraction errors must not affect chat
        });
        console.log('[chat/stream] Memory extraction triggered for conversation:', activeConversationId);
      }
    }

  } catch (error) {
    // Handle abort errors silently (client disconnect)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[chat/stream] Request aborted due to client disconnect');
      return;
    }
    console.error('[chat/stream] Handler error:', error);
    await trackServerEvent(req, 'chat:error', {
      error_stage: 'handler',
      error_code: error instanceof Error ? error.name : 'unknown',
      http_status: 500,
      auth_state: authStateForError,
      retryable: true,
    }, { pagePath: '/chat' });
    // Don't try to send JSON response if headers already sent (SSE mode)
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Shared accumulator type for tracking streamed content
 */
interface StreamAccumulator {
  content: string;
  sources: ChatSource[];
}

/**
 * Stream chat with RAG tool calling support
 * Handles multi-turn tool calling workflow
 * Returns the full AI response and sources for database storage
 */
async function streamChatWithRAG(
  messages: ChatMessage[],
  res: NextApiResponse,
  forceRAG: boolean = false,
  abortSignal?: AbortSignal,
  accumulator?: StreamAccumulator,
  folderKey?: TopicFolder | null
): Promise<{ fullResponse: string; sources: ChatSource[] }> {
  // Use external accumulator if provided, otherwise create local one
  const acc = accumulator || { content: '', sources: [] };
  let fullResponse = '';
  let collectedSources: ChatSource[] = [...acc.sources];

  try {
    // If forceRAG is enabled and ENABLE_RAG is true, make direct RAG call first
    // 使用双LLM架构：第一个LLM提取论文核心发现，第二个LLM与用户对话
    if (forceRAG && ENABLE_RAG) {
      console.log('[chat/stream] Force RAG mode enabled - making direct RAG call');

      // Get the user's last message
      const userMessage = messages[messages.length - 1];

      writeStatus(res, 'Searching the ADHD research library...');

      try {
        // Execute RAG search with smart summary (双LLM架构)
        // 如果 ENABLE_SMART_SUMMARY=true，会先用第一个LLM生成精炼摘要
        const ragResult = await executeRAGWithSmartSummary(
          userMessage.content,  // query
          userMessage.content,  // userQuestion (for smart summary)
          10                    // top_k
        );

        // Log which mode was used
        console.log(`[chat/stream] Force RAG: Using ${ragResult.summaryMode} mode`);

        // Send sources to frontend and collect for database
        if (ragResult.sources.length > 0) {
          console.log(`[chat/stream] Force RAG: Sending ${ragResult.sources.length} paper sources to frontend`);
          res.write(`data: ${JSON.stringify({ type: 'sources', sources: ragResult.sources })}\n\n`);
          collectedSources = ragResult.sources;
        }

        // Inject RAG results into conversation as a system message
        messages.push({
          role: 'system',
          content: `Research papers found for the user's question:\n\n${ragResult.formattedText}\n\n${buildRagAnswerInstruction(ragResult.sources.length)}`
        });

        // Send status update with mode info
        const modeInfo = ragResult.summaryMode === 'smart' ? '(智能摘要)' : '(原始模式)';
        writeStatus(
          res,
          `Found ${ragResult.sources.length} research ${ragResult.sources.length === 1 ? 'paper' : 'papers'} ${modeInfo}. Synthesizing answer...`
        );
      } catch (error) {
        console.error('[chat/stream] Force RAG search failed:', error);
        // Continue without RAG if it fails
      }
    }

    // Capture current user question once — used as context for routing and retrieval
    const userQuestion = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // Web RAG routing follows the mini-program's two-stage decision pattern:
    // a required, non-streaming classifier first decides whether retrieval is needed.
    // The final streaming call then answers with no tools attached, which avoids
    // auto tool-call misses and DSML/tool-call leakage in the user-visible stream.
    if (!forceRAG && ENABLE_RAG) {
      const decision = await routeRagNeed({
        messages,
        currentUserMessage: userQuestion,
        folderKey,
        signal: abortSignal,
      });

      if (decision.shouldSearch) {
        console.log('[chat/stream] RAG router selected search:', {
          queryLength: decision.query.length,
          reason: decision.reason,
        });
        writeStatus(res, 'Searching the ADHD research library...');

        try {
          const ragResult = await executeRAGWithSmartSummary(
            decision.query || userQuestion,
            userQuestion,
            10
          );

          console.log(`[chat/stream] Router RAG: Using ${ragResult.summaryMode} mode`);

          if (ragResult.sources.length > 0) {
            console.log(`[chat/stream] Router RAG: Sending ${ragResult.sources.length} paper sources to frontend`);
            collectedSources = ragResult.sources;
            acc.sources = collectedSources;
            res.write(`data: ${JSON.stringify({ type: 'sources', sources: collectedSources })}\n\n`);
          }

          messages.push({
            role: 'system',
            content: `Research papers found for the user's question:\n\n${ragResult.formattedText}\n\n${buildRagAnswerInstruction(ragResult.sources.length)}`,
          });

          const paperLabel = ragResult.sources.length === 1 ? 'paper' : 'papers';
          writeStatus(res, `Found ${ragResult.sources.length} research ${paperLabel}. Synthesizing answer...`);
        } catch (error) {
          console.error('[chat/stream] Router RAG search failed:', error);
          messages.push({
            role: 'system',
            content: 'Research retrieval was attempted but failed. Answer from your general knowledge, avoid pretending that papers were retrieved, and recommend professional evaluation when the topic is medical or safety-sensitive.',
          });
        }
      } else {
        console.log('[chat/stream] RAG router skipped search:', decision.reason);
      }
    }

    // Streaming answer pass. RAG, when needed, has already been injected above.
    const MAX_TOOL_ROUNDS = 1;
    let needForcedSynthesis = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const requestBody: any = {
        model: DEEPSEEK_MODEL,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        thinking: DEEPSEEK_THINKING,
      };

      if (round === 0) {
        console.log(ENABLE_RAG
          ? '[chat/stream] RAG decision completed before final stream'
          : '[chat/stream] RAG disabled - using general knowledge only');
      }

      const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[chat/stream] DeepSeek API error (round ${round}):`, response.status, errorText);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'API request failed' })}\n\n`);
        res.end();
        return { fullResponse, sources: collectedSources };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}\n\n`);
        res.end();
        return { fullResponse, sources: collectedSources };
      }

      const { finishReason, toolCalls, content } = await processOneRound(
        reader, res, abortSignal, acc, fullResponse
      );

      fullResponse += content;
      acc.content = fullResponse;
      console.log(`[chat/stream] Round ${round}: finish_reason=${finishReason}, tool_calls=${toolCalls.length}, content_chars=${content.length}`);

      // Natural stop — model wrote its answer
      if (finishReason === 'stop') break;

      // Tool calls requested — execute and continue loop
      if (finishReason === 'tool_calls' && toolCalls.length > 0) {
        if (round === MAX_TOOL_ROUNDS - 1) {
          // Cap reached with model still wanting tools (DeepSeek #15 repetitive-call quirk).
          // Don't execute the Nth tool call — the model has enough data from prior rounds.
          // Trigger forced synthesis below instead.
          console.warn(`[chat/stream] Hit MAX_TOOL_ROUNDS=${MAX_TOOL_ROUNDS}, forcing synthesis`);
          needForcedSynthesis = true;
          break;
        }

        messages.push({
          role: 'assistant',
          content: content || '',
          tool_calls: toolCalls,
        });

        const roundSources: ChatSource[] = [];
        writeStatus(res, 'Searching the ADHD research library...');

        for (const toolCall of toolCalls) {
          try {
            console.log(`[chat/stream] Executing tool: ${toolCall.function.name}`);
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeRAGWithSmartSummary(
              args.query || '', userQuestion, args.top_k || 10
            );
            console.log(`[chat/stream] Tool result using ${toolResult.summaryMode} mode`);
            messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult.formattedText });
            roundSources.push(...toolResult.sources);
          } catch (error) {
            console.error('[chat/stream] Tool execution failed:', error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
            });
          }
        }

        if (roundSources.length > 0) {
          collectedSources = [...collectedSources, ...roundSources];
          res.write(`data: ${JSON.stringify({ type: 'sources', sources: collectedSources })}\n\n`);
        }

        const paperLabel = roundSources.length === 1 ? 'paper' : 'papers';
        writeStatus(res, `Found ${roundSources.length} research ${paperLabel}. Synthesizing answer...`);
        continue;
      }

      // Unexpected finish reason (e.g. 'length', 'content_filter') — close gracefully
      console.warn(`[chat/stream] Round ${round}: unexpected finish_reason=${finishReason}`);
      if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      break;
    }

    // Forced synthesis: model burned through MAX_TOOL_ROUNDS without producing an answer.
    // LangChain's `early_stopping_method='generate'` pattern — one final call without tools,
    // forcing the model to synthesize from the research it already has.
    if (needForcedSynthesis && !abortSignal?.aborted) {
      console.log('[chat/stream] Starting forced synthesis pass');
      writeStatus(res, 'Synthesizing answer from research...');

      // Inject explicit instruction so the model doesn't try to emit DSML tool-calls anyway
      messages.push({
        role: 'system',
        content: `You have all the research findings you need above. Write your final answer to the user now based on these findings. Do NOT request additional searches or emit any tool-call markup.\n\n${buildRagAnswerInstruction(collectedSources.length)}`,
      });

      const synthResponse = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
          thinking: DEEPSEEK_THINKING,
          // No tools passed — model cannot call tools, must produce text
        }),
        signal: abortSignal,
      });

      if (synthResponse.ok) {
        const synthReader = synthResponse.body?.getReader();
        if (synthReader) {
          const { content: synthContent, finishReason: synthFinish } = await processOneRound(
            synthReader, res, abortSignal, acc, fullResponse
          );
          fullResponse += synthContent;
          acc.content = fullResponse;
          console.log(`[chat/stream] Forced synthesis: finish_reason=${synthFinish}, content_chars=${synthContent.length}`);
        }
      } else {
        console.error('[chat/stream] Forced synthesis call failed:', synthResponse.status);
      }

      if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    }

    res.end();
    return { fullResponse, sources: collectedSources };
  } catch (error) {
    // Handle abort errors - return partial response for saving (like ChatGPT/Claude.ai)
    if (error instanceof Error && error.name === 'AbortError') {
      // Use accumulator content which is updated in real-time
      const partialContent = acc.content || fullResponse;
      console.log(`[chat/stream] Stream aborted, returning partial response (${partialContent.length} chars from accumulator)`);
      if (!res.writableEnded) {
        res.end();
      }
      // Return whatever was accumulated - will be saved to database
      return { fullResponse: partialContent, sources: acc.sources.length > 0 ? acc.sources : collectedSources };
    }
    console.error('[chat/stream] Stream error:', error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
      res.end();
    }
    // On error, still return partial response if any
    const partialContent = acc.content || fullResponse;
    return { fullResponse: partialContent, sources: acc.sources.length > 0 ? acc.sources : collectedSources };
  }
}

/**
 * Check if client connection is still alive
 */
function isClientConnected(res: NextApiResponse, abortSignal?: AbortSignal): boolean {
  // Check multiple conditions
  const socketDestroyed = (res.socket as any)?.destroyed === true;
  const writableEnded = res.writableEnded;
  const aborted = abortSignal?.aborted === true;

  if (socketDestroyed || writableEnded || aborted) {
    console.log('[chat/stream] Client disconnected check - socket:', socketDestroyed, 'writable:', writableEnded, 'aborted:', aborted);
    return false;
  }
  return true;
}

function writeStatus(res: NextApiResponse, message: string) {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ type: 'status', message })}\n\n`);
  }
}

/**
 * Process one round of the streaming API response.
 * Emits 'done' SSE only on finish_reason='stop'; all other termination is the caller's responsibility.
 * baseContent tracks content from prior rounds so the accumulator stays cumulative for abort saves.
 */
async function processOneRound(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: NextApiResponse,
  abortSignal?: AbortSignal,
  accumulator?: StreamAccumulator,
  baseContent: string = ''
): Promise<{
  finishReason: string | null;
  toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  content: string;
}> {
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const dsmlFilter = createDsmlFilter();
  const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
  let currentToolCallIndex = -1;
  let finishReason: string | null = null;

  try {
    while (true) {
      if (!isClientConnected(res, abortSignal)) {
        console.log('[chat/stream] Client disconnected during round');
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            const choice = data.choices?.[0];
            if (!choice) continue;

            if (choice.delta?.content) {
              const safe = feedDsmlFilter(dsmlFilter, choice.delta.content);
              if (safe) {
                content += safe;
                if (accumulator) accumulator.content = baseContent + content;
                res.write(`data: ${JSON.stringify({ type: 'token', content: safe })}\n\n`);
              }
            }

            if (choice.delta?.tool_calls) {
              for (const toolCallDelta of choice.delta.tool_calls) {
                const index = toolCallDelta.index;
                if (index > currentToolCallIndex) {
                  currentToolCallIndex = index;
                  toolCalls[index] = {
                    id: toolCallDelta.id || `call_${Date.now()}_${index}`,
                    type: 'function',
                    function: { name: toolCallDelta.function?.name || '', arguments: '' },
                  };
                }
                if (toolCallDelta.function?.name) toolCalls[index].function.name = toolCallDelta.function.name;
                if (toolCallDelta.function?.arguments) toolCalls[index].function.arguments += toolCallDelta.function.arguments;
              }
            }

            if (choice.finish_reason) finishReason = choice.finish_reason;
          } catch {
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const tail = flushDsmlFilter(dsmlFilter);
  if (tail) {
    content += tail;
    if (accumulator) accumulator.content = baseContent + content;
    res.write(`data: ${JSON.stringify({ type: 'token', content: tail })}\n\n`);
  }

  if (finishReason === 'stop') {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  }

  return { finishReason, toolCalls, content };
}
