import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, name, source } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Mailchimp API 配置
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID || !MAILCHIMP_SERVER_PREFIX) {
      console.error('Mailchimp API credentials not configured');
      return res.status(500).json({ message: 'Service configuration error' });
    }

    // 构建 Mailchimp API URL
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;

    // 调用 Mailchimp API 添加订阅者
    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: name || '',
          SOURCE: source || 'website',
        },
        tags: ['waitlist', source || 'website'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mailchimp API error:', errorData);
      
      // 如果用户已存在，返回成功
      if (response.status === 400 && errorData.title === 'Member Exists') {
        return res.status(200).json({ 
          message: 'You are already subscribed!', 
          success: true 
        });
      }
      
      return res.status(400).json({ 
        message: 'Failed to subscribe. Please try again.',
        error: errorData.detail || errorData.title
      });
    }

    const data = await response.json();
    
    return res.status(200).json({ 
      message: 'Successfully subscribed to our waitlist!', 
      success: true,
      data: {
        id: data.id,
        email: data.email_address,
        status: data.status
      }
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
}
