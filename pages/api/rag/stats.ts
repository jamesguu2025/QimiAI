import { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/rag/stats
 * Get RAG paper database statistics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const RAG_API_BASE = process.env.RAG_API_BASE || 'http://47.110.88.11:8000';

  try {
    const response = await fetch(`${RAG_API_BASE}/stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return res.status(200).json({ success: true, totalPapers: 0 });
    }

    const stats = await response.json();
    return res.status(200).json({
      success: true,
      totalPapers: stats?.total_papers || 0,
    });
  } catch (error) {
    console.error('[RAG Stats] Error:', error);
    return res.status(200).json({ success: true, totalPapers: 0 });
  }
}
