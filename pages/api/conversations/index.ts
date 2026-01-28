// pages/api/conversations/index.ts - Conversations List & Create API
// Uses Supabase for data persistence

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get user session
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const supabase = getSupabaseAdmin();
  const userEmail = session.user.email;

  try {
    // Get or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userEmail,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'google',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[conversations] Failed to create user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[conversations] User lookup error:', userError);
      return res.status(500).json({ error: 'Database error' });
    }

    const userId = user!.id;

    if (req.method === 'GET') {
      // List conversations for this user
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[conversations] Failed to list:', error);
        return res.status(500).json({ error: 'Failed to load conversations' });
      }

      // Transform to frontend format
      const formattedConversations = conversations.map(c => ({
        id: c.id,
        userId: c.user_id,
        title: c.title,
        folderKey: c.folder_key,
        messageCount: c.message_count,
        lastMessage: c.last_message,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      return res.status(200).json({ conversations: formattedConversations });

    } else if (req.method === 'POST') {
      // Create new conversation
      const { title, folderKey } = req.body;

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || 'New Conversation',
          folder_key: folderKey || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[conversations] Failed to create:', error);
        return res.status(500).json({ error: 'Failed to create conversation' });
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
      };

      return res.status(201).json(formattedConversation);

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
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
