import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireBlogAdmin, validateBlogWrite } from '@/lib/blog-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminEmail = await requireBlogAdmin(req, res);
  if (!adminEmail) return;
  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('blog_articles').select('*').order('updated_at', { ascending: false }).limit(100);
      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }
    if (req.method === 'POST') {
      const payload = validateBlogWrite(req.body);
      const { data: user } = await supabase.from('users').select('id').eq('email', adminEmail).maybeSingle();
      const { data, error } = await supabase
        .from('blog_articles')
        .insert({ ...payload, author: 'Qimi AI', created_by: user?.id || null, updated_by: user?.id || null })
        .select('*')
        .single();
      if (error) throw error;
      return res.status(201).json({ article: data });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Blog operation failed';
    const status = /required|Invalid|must/.test(message) ? 400 : 500;
    console.error('[admin/blog] Operation failed', error);
    return res.status(status).json({ error: status === 400 ? message : 'Blog operation failed' });
  }
}
