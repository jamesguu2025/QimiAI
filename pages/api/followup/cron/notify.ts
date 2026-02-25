// pages/api/followup/cron/notify.ts — Daily Mailchimp notification cron
import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { upsertMailchimpMember, addMailchimpTag } from '../_mailchimp';

export const config = { maxDuration: 60 };

const APP_URL = process.env.APP_URL || 'https://qimiai.to';

function generateUnsubToken(uid: string): string {
  const secret = process.env.FOLLOWUP_UNSUBSCRIBE_SECRET || '';
  return createHash('sha256').update(uid + secret).digest('hex');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check Mailchimp config
  if (!process.env.MAILCHIMP_API_KEY) {
    console.warn('[cron/notify] MAILCHIMP_API_KEY not set, skipping');
    return res.status(200).json({ processed: 0, synced: 0, tagged: 0, errors: 0 });
  }

  const supabase = getSupabaseAdmin();
  const stats = { processed: 0, synced: 0, tagged: 0, errors: 0 };

  try {
    // Query pending follow-ups
    const { data: pendingItems, error: queryError } = await supabase
      .from('followup_items')
      .select('id, user_id, method_short_name, follow_up_question')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (queryError || !pendingItems?.length) {
      return res.status(200).json(stats);
    }

    for (const item of pendingItems) {
      stats.processed++;

      try {
        // Get user email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', item.user_id)
          .single();

        if (userError || !user?.email) {
          console.error('[cron/notify] User not found:', item.user_id);
          stats.errors++;
          continue;
        }

        // Build merge fields
        const followupUrl = `${APP_URL}/followup/${item.id}`;
        const unsubToken = generateUnsubToken(item.user_id);
        const unsubUrl = `${APP_URL}/api/followup/unsubscribe?uid=${item.user_id}&token=${unsubToken}`;

        // Upsert member with merge fields
        const upsertResult = await upsertMailchimpMember(
          user.email,
          {
            FOLLOWUP_METHOD: item.method_short_name,
            FOLLOWUP_Q: item.follow_up_question,
            FOLLOWUP_URL: followupUrl,
            UNSUB_URL: unsubUrl,
          },
          user.name || undefined
        );

        if (!upsertResult.success) {
          console.error('[cron/notify] Mailchimp upsert failed:', upsertResult.error);
          stats.errors++;
          continue;
        }
        stats.synced++;

        // Add tag to trigger automation
        const tagResult = await addMailchimpTag(user.email, 'followup_pending');
        if (!tagResult.success) {
          console.error('[cron/notify] Mailchimp tag failed:', tagResult.error);
          stats.errors++;
          continue;
        }
        stats.tagged++;

        // Update status to scheduled
        const { error: updateError } = await supabase
          .from('followup_items')
          .update({
            status: 'scheduled',
            scheduled_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          console.error('[cron/notify] Status update error:', updateError);
          // Non-critical — Mailchimp will still send
        }
      } catch (error) {
        console.error('[cron/notify] Processing error for item:', item.id, error);
        stats.errors++;
      }
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('[cron/notify] Cron error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
