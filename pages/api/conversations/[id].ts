// pages/api/conversations/[id].ts - Single Conversation API
// Uses Supabase for data persistence

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getPayloadSizeBytes, rejectIfRateLimited } from '../../../lib/rate-limit';
import { isTopicFolder, normalizeTopicFolder } from '../../../types/chat';

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

    // For DELETE, skip the verification query - just delete directly
    if (req.method === 'DELETE') {
      if (rejectIfRateLimited(req, res, {
        namespace: 'conversation-delete',
        key: userId,
        limit: 30,
        windowMs: 10 * 60 * 1000,
      })) return;
      const { error: deleteError, count } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[conversations] Failed to delete:', deleteError);
        return res.status(500).json({ error: 'Failed to delete conversation' });
      }

      if (count === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(204).end();
    }

    // For GET and PATCH, verify conversation exists and belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.method === 'GET') {
      // Get conversation with messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('[conversations] Failed to load messages:', msgError);
        return res.status(500).json({ error: 'Failed to load messages' });
      }

      // Transform to frontend format
      const formattedConversation = {
        id: conversation.id,
        userId: conversation.user_id,
        title: conversation.title,
        folderKey: conversation.folder_key,
        messageCount: conversation.message_count,
        isPinned: conversation.is_pinned || false,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          attachments: m.attachments,
          timestamp: m.created_at,
        })),
      };

      return res.status(200).json(formattedConversation);

    } else if (req.method === 'PATCH') {
      if (getPayloadSizeBytes(req) > 4 * 1024) return res.status(413).json({ error: 'Payload too large' });
      if (rejectIfRateLimited(req, res, {
        namespace: 'conversation-update',
        key: userId,
        limit: 60,
        windowMs: 10 * 60 * 1000,
      })) return;

      // Update conversation
      const { title, folderKey, isPinned } = req.body;

      const updateData: Record<string, unknown> = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
          return res.status(400).json({ error: 'Invalid title' });
        }
        updateData.title = title.replace(/\s+/g, ' ').trim();
      }
      if (folderKey !== undefined) {
        if (folderKey !== null && !isTopicFolder(folderKey)) return res.status(400).json({ error: 'Invalid folder' });
        updateData.folder_key = folderKey ? normalizeTopicFolder(folderKey) : null;
      }
      if (isPinned !== undefined) {
        if (typeof isPinned !== 'boolean') return res.status(400).json({ error: 'Invalid pin value' });
        updateData.is_pinned = isPinned;
      }
      if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No fields to update' });

      const { data: updated, error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[conversations] Failed to update:', updateError);
        return res.status(500).json({ error: 'Failed to update conversation' });
      }

      const formattedConversation = {
        id: updated.id,
        userId: updated.user_id,
        title: updated.title,
        folderKey: updated.folder_key,
        messageCount: updated.message_count,
        isPinned: updated.is_pinned || false,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };

      return res.status(200).json(formattedConversation);

    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('[conversations] API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
