import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';

interface GuestData {
  childBirthday?: { year: number; month: number };
  challenges?: { id: string; name: string; categoryId: string; categoryName: string }[];
  chatHistory?: { id: string; role: string; content: string }[];
  messageCount?: number;
  onboardingCompleted?: boolean;
  firstQuestion?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { guestData } = req.body as { userId: string; guestData: GuestData };

    if (!guestData) {
      return res.status(400).json({ error: 'No guest data provided' });
    }

    const supabase = getSupabaseAdmin();

    // Get user ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with guest data (child info, challenges)
    if (guestData.childBirthday || guestData.challenges) {
      await supabase
        .from('users')
        .update({
          child_birthday: guestData.childBirthday,
          challenges: guestData.challenges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // Migrate chat history to conversations if there's any
    if (guestData.chatHistory && guestData.chatHistory.length > 0) {
      // Create a new conversation for the migrated chat
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: guestData.firstQuestion?.slice(0, 50) || 'Migrated Chat',
          folder_key: null,
        })
        .select()
        .single();

      if (!convError && conversation) {
        // Insert messages
        const messages = guestData.chatHistory.map((msg, index) => ({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          created_at: new Date(Date.now() + index).toISOString(),
        }));

        await supabase.from('messages').insert(messages);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
