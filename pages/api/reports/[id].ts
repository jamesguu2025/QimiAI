// pages/api/reports/[id].ts - GET single report, DELETE report + image

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.query.id as string;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid report id' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get-or-create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError && userError.code === 'PGRST116') {
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
        console.error('[reports/[id]] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[reports/[id]] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (req.method === 'GET') {
      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error && error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Report not found' });
      }
      if (error) {
        console.error('[reports/[id]] fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(200).json({
        report: {
          id: report.id,
          title: report.title,
          imageUrl: report.image_url,
          analysis: report.analysis,
          status: report.status,
          createdAt: report.created_at,
        },
      });
    }

    if (req.method === 'DELETE') {
      // Fetch report to get image URL
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('id, image_url, user_id')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Report not found' });
      }
      if (fetchError) {
        console.error('[reports/[id]] fetch for delete error:', fetchError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Delete from storage
      if (report.image_url) {
        const urlParts = report.image_url.split('/reports/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[urlParts.length - 1];
          await supabase.storage.from('reports').remove([storagePath]);
        }
      }

      // Delete DB row
      await supabase
        .from('reports')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('[reports/[id]] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
