// pages/api/chat/stop.ts - Stop Chat Generation API
// Proxies to backend /adviser/stop

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { API_BASE, ENDPOINTS } from '../../../constants/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from session or guest cookie
    const session = await getServerSession(req, res, authOptions);
    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (req.cookies['qimi_guest_session']) {
      userId = `guest_${req.cookies['qimi_guest_session']}`;
    } else {
      // For DeepSeek direct connection, stop is handled client-side via AbortController
      // Return success without backend call
      return res.status(200).json({ success: true, message: 'Stop handled client-side' });
    }

    const { conversationId } = req.body;

    // Build request body for backend
    const backendBody = {
      userId,
      conversationId,
    };

    // Make request to backend
    const backendUrl = `${API_BASE}${ENDPOINTS.CHAT.STOP}`;
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendBody),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return res.status(backendResponse.status).json({
        error: 'Failed to stop generation',
        details: errorData,
      });
    }

    const data = await backendResponse.json().catch(() => ({ success: true }));
    return res.status(200).json(data);
  } catch (error) {
    console.error('[chat/stop] Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
