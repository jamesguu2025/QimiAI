// pages/api/conversations/[id]/messages.ts - Messages API
// POST: Add message to conversation

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../../lib/rate-limit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  // Get user session
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userId = user.id;

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.method === 'POST') {
      if (getPayloadSizeBytes(req) > 64 * 1024) return res.status(413).json({ error: 'Payload too large' });
      if (rejectIfRateLimited(req, res, {
        namespace: 'message-create',
        key: userId,
        limit: 120,
        windowMs: 10 * 60 * 1000,
      })) return;

      // Add message to conversation
      const { role, content, sources, attachments } = req.body;

      if (!role || typeof content !== 'string' || !content.trim() || content.length > 20_000) {
        return res.status(400).json({ error: 'Role and content are required' });
      }

      if (role !== 'user' && role !== 'assistant') {
        return res.status(400).json({ error: 'Role must be "user" or "assistant"' });
      }
      if (sources !== undefined && sources !== null && (!Array.isArray(sources) || sources.length > 20)) {
        return res.status(400).json({ error: 'Invalid sources' });
      }
      if (attachments !== undefined && attachments !== null && (!Array.isArray(attachments) || attachments.length > 5)) {
        return res.status(400).json({ error: 'Invalid attachments' });
      }

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: id,
          role,
          content: content.trim(),
          sources: sources || null,
          attachments: attachments || null,
        })
        .select()
        .single();

      if (msgError) {
        console.error('[messages] Failed to create:', msgError);
        return res.status(500).json({ error: 'Failed to save message' });
      }

      const formattedMessage = {
        id: message.id,
        role: message.role,
        content: message.content,
        sources: message.sources,
        attachments: message.attachments,
        timestamp: message.created_at,
      };

      return res.status(201).json(formattedMessage);

    } else if (req.method === 'GET') {
      // Get all messages for conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('[messages] Failed to load:', msgError);
        return res.status(500).json({ error: 'Failed to load messages' });
      }

      const formattedMessages = messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        attachments: m.attachments,
        timestamp: m.created_at,
      }));

      return res.status(200).json({ messages: formattedMessages });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('[messages] API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
