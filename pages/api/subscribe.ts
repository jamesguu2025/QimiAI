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
    // MailerLite API 配置
    const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
    const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

    if (!MAILERLITE_API_KEY || !MAILERLITE_GROUP_ID) {
      console.error('MailerLite API credentials not configured');
      return res.status(500).json({ message: 'Service configuration error' });
    }

    // 调用 MailerLite API 添加订阅者
    const response = await fetch(`https://connect.mailerlite.com/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        name: name || '',
        groups: [MAILERLITE_GROUP_ID],
        fields: {
          source: source || 'website',
          subscribed_at: new Date().toISOString(),
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MailerLite API error:', errorData);
      
      // 如果用户已存在，返回成功
      if (response.status === 409) {
        return res.status(200).json({ 
          message: 'You are already subscribed!', 
          success: true 
        });
      }
      
      return res.status(400).json({ 
        message: 'Failed to subscribe. Please try again.' 
      });
    }

    const data = await response.json();
    
    return res.status(200).json({ 
      message: 'Successfully subscribed to our waitlist!', 
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
}
