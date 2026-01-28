// pages/api/conversations/[id].ts - Single Conversation API
// Uses Supabase for data persistence

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
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
        lastMessage: conversation.last_message,
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
      // Update conversation
      const { title, folderKey } = req.body;

      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (folderKey !== undefined) updateData.folder_key = folderKey;

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
        lastMessage: updated.last_message,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };

      return res.status(200).json(formattedConversation);

    } else if (req.method === 'DELETE') {
      // Delete conversation (messages will cascade)
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[conversations] Failed to delete:', deleteError);
        return res.status(500).json({ error: 'Failed to delete conversation' });
      }

      return res.status(204).end();

    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('[conversations] API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
