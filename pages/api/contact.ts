import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { title, message, contact } = req.body;

  if (!title || !message || !contact) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    // Log the contact form submission
    console.log('[Contact Form]', {
      title,
      message,
      contact,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
