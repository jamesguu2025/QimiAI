import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mailchimp API 配置
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID || !MAILCHIMP_SERVER_PREFIX) {
      // 本地开发时从线上拉取真实数据
      try {
        const fallback = await fetch('https://www.qimiai.to/api/waitlist-count');
        const fallbackData = await fallback.json();
        if (fallbackData.success) {
          return res.status(200).json(fallbackData);
        }
      } catch (e) {
        // fallback also failed
      }
      return res.status(500).json({ message: 'Service configuration error' });
    }

    // 构建 Mailchimp API URL 获取订阅者统计
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}`;

    // 调用 Mailchimp API 获取列表信息
    const response = await fetch(mailchimpUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mailchimp API error:', errorData);
      return res.status(400).json({ 
        message: 'Failed to fetch subscriber count',
        error: errorData.detail || errorData.title
      });
    }

    const data = await response.json();
    
    // 获取订阅者数量
    const subscriberCount = data.stats?.member_count || 0;
    
    return res.status(200).json({ 
      success: true,
      count: subscriberCount,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Subscriber count error:', error);
    return res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
}
