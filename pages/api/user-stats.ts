import { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/user-stats
 * 获取全球注册用户统计（小程序 + 网页版）
 * 代理到后端 api.xingbanai.cn/api/stats/users
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.xingbanai.cn';

  try {
    const response = await fetch(`${API_BASE}/api/stats/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Backend API error:', response.status);
      // 降级返回 0
      return res.status(200).json({ success: true, count: 0 });
    }

    const data = await response.json();

    if (data.success && data.data) {
      return res.status(200).json({
        success: true,
        count: data.data.total || 0,
        breakdown: data.data.breakdown,
        lastUpdated: data.data.lastUpdated,
      });
    }

    // 后端返回格式不对，降级返回 0
    return res.status(200).json({ success: true, count: 0 });

  } catch (error) {
    console.error('User stats error:', error);
    // 降级返回 0，不影响页面加载
    return res.status(200).json({ success: true, count: 0 });
  }
}
