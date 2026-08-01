import type { NextApiRequest, NextApiResponse } from 'next';
import { listAdhdFeedItems, type AdhdFeedItem } from '@/lib/blog';

type ResponseBody = { items: AdhdFeedItem[] } | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const items = await listAdhdFeedItems(50);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json({ items });
  } catch (error) {
    console.error('[public/content/adhd] Feed query failed', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Unable to load the public content feed' });
  }
}
