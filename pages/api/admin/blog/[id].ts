import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireBlogAdmin, validateBlogWrite } from '@/lib/blog-admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminEmail = await requireBlogAdmin(req, res);
  if (!adminEmail) return;
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!UUID_PATTERN.test(id)) return res.status(400).json({ error: 'Invalid article ID' });
  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('blog_articles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Article not found' });
      return res.status(200).json({ article: data });
    }
    if (req.method === 'PATCH') {
      const payload = validateBlogWrite(req.body, true);
      if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'No fields to update' });
      const { data: user } = await supabase.from('users').select('id').eq('email', adminEmail).maybeSingle();
      const { data, error } = await supabase
        .from('blog_articles')
        .update({ ...payload, author: 'Qimi AI', updated_by: user?.id || null })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Article not found' });
      return res.status(200).json({ article: data });
    }
    if (req.method === 'DELETE') {
      const { data, error } = await supabase.from('blog_articles').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Article not found' });
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Blog operation failed';
    const status = /required|Invalid|must/.test(message) ? 400 : 500;
    console.error('[admin/blog/id] Operation failed', error);
    return res.status(status).json({ error: status === 400 ? message : 'Blog operation failed' });
  }
}
