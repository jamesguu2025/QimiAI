// pages/api/chat/stop.ts - Stop Chat Generation API
// For direct DeepSeek connection, stop is handled client-side via AbortController
// This endpoint simply acknowledges the stop request

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For DeepSeek direct connection architecture:
  // - Client closes the SSE connection
  // - Server detects disconnect via socket close/error events
  // - AbortController cancels the DeepSeek API fetch
  // - Partial response is saved to database
  //
  // This endpoint just acknowledges the stop request.
  // The actual stopping is handled by the client closing the connection.
  return res.status(200).json({ success: true, message: 'Stop acknowledged' });
}
