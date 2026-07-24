import { NextApiRequest, NextApiResponse } from 'next';
import { getClientIp, getPayloadSizeBytes, rejectIfRateLimited } from '@/lib/rate-limit';

const MAX_PAYLOAD_BYTES = 4 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ message: 'Payload too large' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'subscribe',
    key: getClientIp(req),
    limit: 5,
    windowMs: 60 * 1000,
  })) return;

  const { email, name, source } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
  const normalizedName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
  const normalizedSource = typeof source === 'string' ? source.trim().slice(0, 40) : 'website';
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
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
        email_address: normalizedEmail,
        status: 'subscribed',
        merge_fields: {
          FNAME: normalizedName,
          SOURCE: normalizedSource,
        },
        tags: ['waitlist', normalizedSource],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorData = await response.json() as { title?: string };
      console.error('Mailchimp API error status:', response.status);
      
      // 如果用户已存在，返回成功
      if (response.status === 400 && errorData.title === 'Member Exists') {
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
