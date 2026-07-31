import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ensureGuestSession } from '@/lib/guest-session';
import { actorKey, AI_USAGE_LIMITS, readAiQuota, shanghaiDayKey, shanghaiWeekKey } from '@/lib/ai-usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      const guestId = ensureGuestSession(req, res);
      const chat = await readAiQuota(actorKey('guest', guestId), 'chat', 'lifetime', AI_USAGE_LIMITS.guestChatLifetime);
      return res.status(200).json({ authState: 'guest', chat: { ...chat, period: 'lifetime' }, planAi: null });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase.from('users').select('id').eq('email', session.user.email).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    const userActor = actorKey('user', user.id);
    const [chat, planAi] = await Promise.all([
      readAiQuota(userActor, 'chat', `day:${shanghaiDayKey()}`, AI_USAGE_LIMITS.freeChatDaily),
      readAiQuota(userActor, 'plan_ai', shanghaiWeekKey(), AI_USAGE_LIMITS.planAiWeekly),
    ]);
    return res.status(200).json({
      authState: 'authenticated',
      chat: { ...chat, period: 'day' },
      planAi: { ...planAi, period: 'week' },
    });
  } catch (error) {
    console.error('[quota/status] failed:', error);
    return res.status(503).json({ error: 'Unable to load usage limits' });
  }
}
