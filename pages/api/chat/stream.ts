// pages/api/chat/stream.ts - Chat SSE Stream API with RAG Tool Calling
// Direct connection to DeepSeek API with dynamic prompt system and RAG support

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { buildSystemMessage, UserProfile } from '../../../lib/prompts';
import { getRagTools } from '../../../lib/rag-definitions';
import { executeRAGToolCall } from '../../../services/rag-service';

// DeepSeek API configuration from environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const ENABLE_RAG = process.env.ENABLE_RAG === 'true';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

// Message interface for conversation history
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key is configured
  if (!DEEPSEEK_API_KEY) {
    console.error('[chat/stream] DEEPSEEK_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Get user ID from session or guest cookie (for logging/rate limiting)
    const session = await getServerSession(req, res, authOptions);
    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (req.cookies['qimi_guest_session']) {
      userId = `guest_${req.cookies['qimi_guest_session']}`;
    } else {
      userId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    const { content, attachments, conversationHistory, userProfile } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Prepare conversation history for module identification
    const historyForModule: ChatMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-5).map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      : [];

    // Build dynamic system prompt with module injection
    console.log(`[chat/stream] Building system prompt for user ${userId}`);
    const systemPrompt = await buildSystemMessage(
      userProfile as UserProfile | null,
      content || '',
      historyForModule
    );
    console.log(`[chat/stream] System prompt built, ${systemPrompt.length} characters`);

    // Build messages array for DeepSeek
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if provided
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: content || '' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Call DeepSeek with potential RAG tool support
    await streamChatWithRAG(messages, res);

  } catch (error) {
    console.error('[chat/stream] Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Stream chat with RAG tool calling support
 * Handles multi-turn tool calling workflow
 */
async function streamChatWithRAG(
  messages: ChatMessage[],
  res: NextApiResponse
): Promise<void> {
  try {
    // Prepare request body
    const requestBody: any = {
      model: DEEPSEEK_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    };

    // Add RAG tools if enabled
    if (ENABLE_RAG) {
      requestBody.tools = getRagTools();
      console.log('[chat/stream] RAG tools enabled - AI can decide when to search papers');
    } else {
      console.log('[chat/stream] RAG disabled - using general knowledge only');
    }

    // First API call
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat/stream] DeepSeek API error:', response.status, errorText);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'API request failed' })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}\n\n`);
      res.end();
      return;
    }

    // Process stream and check for tool calls
    const { shouldExecuteTools, toolCalls, assistantMessage } = await processFirstStream(reader, res);

    // If AI requested tool calls, execute them and make second API call
    if (shouldExecuteTools && toolCalls.length > 0) {
      console.log(`[chat/stream] AI requested ${toolCalls.length} tool calls, executing RAG search...`);

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: assistantMessage || '',
        tool_calls: toolCalls
      });

      // Execute each tool call and add results
      for (const toolCall of toolCalls) {
        try {
          console.log(`[chat/stream] Executing tool: ${toolCall.function.name}`);
          const toolResult = await executeRAGToolCall(toolCall);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult
          });

          // Send a status update to client
          res.write(`data: ${JSON.stringify({ type: 'status', message: 'Research papers retrieved, generating response...' })}\n\n`);
        } catch (error) {
          console.error(`[chat/stream] Tool execution failed:`, error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`
          });
        }
      }

      // Second API call with tool results
      console.log('[chat/stream] Making second API call with RAG results...');
      const secondResponse = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!secondResponse.ok) {
        console.error('[chat/stream] Second API call failed');
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response with research' })}\n\n`);
        res.end();
        return;
      }

      const secondReader = secondResponse.body?.getReader();
      if (secondReader) {
        await streamFinalResponse(secondReader, res);
      }
    }

    res.end();
  } catch (error) {
    console.error('[chat/stream] Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
    res.end();
  }
}

/**
 * Process first stream and detect tool calls
 */
async function processFirstStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: NextApiResponse
): Promise<{
  shouldExecuteTools: boolean;
  toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  assistantMessage: string;
}> {
  const decoder = new TextDecoder();
  let buffer = '';
  let assistantMessage = '';
  const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
  let currentToolCallIndex = -1;
  let finishReason: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            const choice = data.choices?.[0];

            if (!choice) continue;

            // Handle content delta (stream text to user)
            if (choice.delta?.content) {
              assistantMessage += choice.delta.content;
              res.write(`data: ${JSON.stringify({ type: 'token', content: choice.delta.content })}\n\n`);
            }

            // Handle tool calls delta
            if (choice.delta?.tool_calls) {
              for (const toolCallDelta of choice.delta.tool_calls) {
                const index = toolCallDelta.index;

                // Initialize new tool call
                if (index > currentToolCallIndex) {
                  currentToolCallIndex = index;
                  toolCalls[index] = {
                    id: toolCallDelta.id || `call_${Date.now()}_${index}`,
                    type: 'function',
                    function: {
                      name: toolCallDelta.function?.name || '',
                      arguments: ''
                    }
                  };
                }

                // Append function name
                if (toolCallDelta.function?.name) {
                  toolCalls[index].function.name = toolCallDelta.function.name;
                }

                // Append function arguments
                if (toolCallDelta.function?.arguments) {
                  toolCalls[index].function.arguments += toolCallDelta.function.arguments;
                }
              }
            }

            // Capture finish reason
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }
          } catch (parseError) {
            // Skip unparseable lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Determine if we should execute tools
  const shouldExecuteTools = finishReason === 'tool_calls' && toolCalls.length > 0;

  if (shouldExecuteTools) {
    console.log(`[chat/stream] Finish reason: tool_calls, collected ${toolCalls.length} tool calls`);
  } else if (finishReason) {
    console.log(`[chat/stream] Finish reason: ${finishReason}`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  }

  return { shouldExecuteTools, toolCalls, assistantMessage };
}

/**
 * Stream final response after tool execution
 */
async function streamFinalResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: NextApiResponse
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          if (trimmedLine === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
          }
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            const tokenContent = data.choices?.[0]?.delta?.content;

            if (tokenContent) {
              res.write(`data: ${JSON.stringify({ type: 'token', content: tokenContent })}\n\n`);
            }

            if (data.choices?.[0]?.finish_reason === 'stop') {
              res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            }
          } catch {
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
