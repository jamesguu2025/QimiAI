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
  childName?: string;
  childBirthday?: { year: number; month: number };
  gender?: 'boy' | 'girl' | 'other';
  challenges?: SelectedChallenge[];
  chatHistory?: Array<{
    id: string;
    role: string;
    content: string;
    timestamp?: string;
  }>;
  firstQuestion?: string;
}

interface MigrateRequest {
  guestSessionId: string;
  migrationId?: string;
  chatHistory?: GuestData['chatHistory'];
  childProfile?: {
    name?: string;
    birthYear?: number;
    birthMonth?: number;
    gender?: 'boy' | 'girl' | 'other';
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
    const migrationId = typeof rawBody.migrationId === 'string'
      ? rawBody.migrationId.slice(0, 255)
      : undefined;

    if (rawBody.guestData) {
      // Client sends guestData format
      const gd = rawBody.guestData;
      chatHistory = gd.chatHistory;
      childProfile = {
        name: typeof gd.childName === 'string' ? gd.childName : undefined,
        birthYear: gd.childBirthday?.year,
        birthMonth: gd.childBirthday?.month,
        gender: gd.gender,
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
      const { name, birthYear, birthMonth, gender, challenges } = childProfile;

      const upsertData: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) upsertData.name = name.trim().slice(0, 50) || null;
      if (birthYear !== undefined) upsertData.birth_year = birthYear;
      if (birthMonth !== undefined) upsertData.birth_month = birthMonth;
      if (gender !== undefined && ['boy', 'girl', 'other'].includes(gender)) upsertData.gender = gender;
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
      const firstUserMessage = chatHistory.find(msg => msg.role === 'user')?.content;

      if (!firstUserMessage) {
        console.log('[migrate-guest-data] Skipping migration without user messages');
        return res.status(200).json({ success: true, skipped: true, reason: 'no_user_messages' });
      }

      const title = (rawBody.guestData?.firstQuestion || rawBody.firstQuestion || firstUserMessage).slice(0, 50);
      let canUseMigrationId = Boolean(migrationId);

      if (migrationId) {
        const { data: existingByMigrationId, error: migrationIdLookupError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('guest_migration_id', migrationId)
          .maybeSingle();

        if (!migrationIdLookupError && existingByMigrationId) {
          console.log('[migrate-guest-data] Skipping duplicate migration id:', existingByMigrationId.id);
          return res.status(200).json({
            success: true,
            conversationId: existingByMigrationId.id,
            skipped: true,
          });
        }

        if (migrationIdLookupError && (
          migrationIdLookupError.code === '42703' ||
          migrationIdLookupError.message?.includes('guest_migration_id')
        )) {
          canUseMigrationId = false;
        } else if (migrationIdLookupError) {
          console.error('[migrate-guest-data] Failed to check migration id:', migrationIdLookupError);
          return res.status(500).json({ error: 'Failed to check migration id' });
        }
      }

      const { data: possibleDuplicates, error: duplicateLookupError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('title', title)
        .order('created_at', { ascending: false })
        .limit(20);

      if (duplicateLookupError) {
        console.error('[migrate-guest-data] Failed to check duplicates:', duplicateLookupError);
        return res.status(500).json({ error: 'Failed to check existing migrations' });
      }

      if (possibleDuplicates && possibleDuplicates.length > 0) {
        const duplicateIds = possibleDuplicates.map(conversation => conversation.id);
        const { data: existingMessages, error: messageLookupError } = await supabase
          .from('messages')
          .select('conversation_id, role, content, created_at')
          .in('conversation_id', duplicateIds)
          .order('created_at', { ascending: true });

        if (messageLookupError) {
          console.error('[migrate-guest-data] Failed to check duplicate messages:', messageLookupError);
          return res.status(500).json({ error: 'Failed to check existing messages' });
        }

        const targetSignature = chatHistory
          .map(msg => `${msg.role}:${msg.content}`)
          .join('\n---\n');
        for (const conversation of possibleDuplicates) {
          const conversationMessages = (existingMessages || [])
            .filter(msg => msg.conversation_id === conversation.id)
          const existingSignature = conversationMessages
            .map(msg => `${msg.role}:${msg.content}`)
            .join('\n---\n');
          const existingFirstUserMessage = conversationMessages.find(msg => msg.role === 'user')?.content;

          if (
            existingSignature === targetSignature ||
            (firstUserMessage && existingFirstUserMessage === firstUserMessage)
          ) {
            console.log('[migrate-guest-data] Skipping duplicate migration:', conversation.id);
            return res.status(200).json({
              success: true,
              conversationId: conversation.id,
              skipped: true,
            });
          }
        }
      }

      // Create a new conversation for the migrated chat
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title,
          folder_key: null,
          ...(canUseMigrationId && migrationId ? { guest_migration_id: migrationId } : {}),
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

        const { error: insertMessagesError } = await supabase.from('messages').insert(messagesToInsert);
        if (insertMessagesError) {
          console.error('[migrate-guest-data] Failed to insert messages:', insertMessagesError);
          return res.status(500).json({ error: 'Failed to migrate messages' });
        }

        console.log('[migrate-guest-data] Migrated guest chat:', conversation.id);
      } else if (convError) {
        console.error('[migrate-guest-data] Failed to create conversation:', convError);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[migrate-guest-data] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
