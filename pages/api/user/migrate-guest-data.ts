// pages/api/user/migrate-guest-data.ts
// Migrate guest data to user account on registration
// Updated: 2026-03-17 - Write to child_profiles instead of users table

// Note: This file has many issues, will rewrite completely

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

interface GuestData {
  childBirthday?: { year: number; month: number };
  challenges?: SelectedChallenge[];
  chatHistory?: Array<{
    id: string;
    role: string;
    content: string;
  }>;
  firstQuestion?: string;
}

interface MigrateRequest {
  guestSessionId: string;
  chatHistory?: GuestData['chatHistory'];
  childProfile?: {
    birthYear?: number;
    birthMonth?: number;
    challenges?: SelectedChallenge[];
  };
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

    // Support both formats:
    // Old client sends: { userId, guestData: { childBirthday, challenges, chatHistory } }
    // New format:       { chatHistory, childProfile: { birthYear, birthMonth, challenges } }
    const rawBody = req.body;
    let chatHistory: MigrateRequest['chatHistory'];
    let childProfile: MigrateRequest['childProfile'];

    if (rawBody.guestData) {
      // Client sends guestData format
      const gd = rawBody.guestData;
      chatHistory = gd.chatHistory;
      childProfile = {
        birthYear: gd.childBirthday?.year,
        birthMonth: gd.childBirthday?.month,
        challenges: gd.challenges,
      };
    } else {
      // Direct format
      chatHistory = rawBody.chatHistory;
      childProfile = rawBody.childProfile;
    }

    const supabase = getSupabaseAdmin();

    // Get user ID from database
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    let userId: string;

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: session.user.email,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'google',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[migrate-guest-data] Failed to create user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = newUser.id;
    } else if (userError) {
      console.error('[migrate-guest-data] User lookup error:', userError);
      return res.status(500).json({ error: 'Database error' });
    } else {
      userId = existingUser.id;
    }

    // Upsert child profile (birth date and challenges)
    if (childProfile) {
      const { birthYear, birthMonth, challenges } = childProfile;

      const upsertData: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (birthYear !== undefined) upsertData.birth_year = birthYear;
      if (birthMonth !== undefined) upsertData.birth_month = birthMonth;
      // Supabase handles JSONB serialization automatically - pass array directly
      if (challenges !== undefined) upsertData.challenges = challenges;

      const { error: upsertError } = await supabase
        .from('child_profiles')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single()

      if (upsertError) {
        console.error('[migrate-guest-data] Failed to upsert child profile:', upsertError);
        return res.status(500).json({ error: 'Failed to save child profile' });
      }
    }

    // Migrate chat history to conversations if there's any
    if (chatHistory && chatHistory.length > 0) {
      // Create a new conversation for the migrated chat
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: (rawBody.guestData?.firstQuestion || rawBody.firstQuestion || 'Migrated Chat').slice(0, 50),
          folder_key: null,
        })
        .select()
        .single()

      if (!convError && conversation) {
        // Insert messages
        const messagesToInsert = chatHistory.map((msg, index) => ({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          created_at: new Date(Date.now() + index).toISOString(),
        }));

        await supabase.from('messages').insert(messagesToInsert);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[migrate-guest-data] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
