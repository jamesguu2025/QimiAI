// pages/api/chat/stream.ts - Chat SSE Stream API with RAG Tool Calling
// Direct connection to DeepSeek API with dynamic prompt system and RAG support

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { buildSystemMessage, UserProfile } from '../../../lib/prompts';
import { getRagTools } from '../../../lib/rag-definitions';
import {
  executeRAGToolCall,
  executeRAGWithSmartSummary,
  RAGToolCallResult
} from '../../../services/rag-service';
import { getSupabaseAdmin } from '../../../lib/supabase';

// DeepSeek API configuration from environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const ENABLE_RAG = process.env.ENABLE_RAG === 'true';

/**
 * Save messages to database for logged-in users
 */
async function saveMessagesToDatabase(
  userEmail: string,
  userMessage: string,
  aiResponse: string,
  conversationId?: string,
  sources?: Array<{ title: string; url: string; snippet?: string }>
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.log('[chat/stream] User not found, skipping message save');
      return null;
    }

    let convId = conversationId;

    // Create conversation if not provided
    if (!convId) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[chat/stream] Failed to create conversation:', convError);
        return null;
      }
      convId = newConv.id;
      console.log('[chat/stream] Created new conversation:', convId);
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: userMessage,
      });

    if (userMsgError) {
      console.error('[chat/stream] Failed to save user message:', userMsgError);
    }

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: aiResponse,
        sources: sources || null,
      });

    if (aiMsgError) {
      console.error('[chat/stream] Failed to save AI message:', aiMsgError);
    }

    // Update conversation's updated_at to move it to top of recent list
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    if (updateError) {
      console.error('[chat/stream] Failed to update conversation timestamp:', updateError);
    }

    console.log('[chat/stream] Messages saved to conversation:', convId);
    return convId ?? null;
  } catch (error) {
    console.error('[chat/stream] Error saving messages:', error);
    return null;
  }
}

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

  // Create AbortController to cancel DeepSeek API calls when client disconnects
  const abortController = new AbortController();
  let clientDisconnected = false;

  // Listen for client disconnect - multiple event listeners for reliability
  const handleDisconnect = (eventName: string) => {
    if (!clientDisconnected) {
      console.log(`[chat/stream] ${eventName} event - client disconnecting`);
      clientDisconnected = true;
      abortController.abort();
    }
  };

  res.on('close', () => handleDisconnect('close'));
  res.on('finish', () => {
    console.log('[chat/stream] Response finished normally');
  });

  // Also listen on socket for more reliable disconnect detection
  if (res.socket) {
    res.socket.on('close', () => handleDisconnect('socket.close'));
    res.socket.on('error', () => handleDisconnect('socket.error'));
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

    const { content, attachments, conversationHistory, userProfile, forceRAG, conversationId } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Store user message for later saving
    const userMessage = content || '';

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

    // Shared accumulator to track content even if abort happens
    const accumulator = { content: '', sources: [] as Array<{ title: string; url: string; snippet?: string }> };

    // Call DeepSeek with potential RAG tool support
    const { fullResponse, sources } = await streamChatWithRAG(messages, res, forceRAG || false, abortController.signal, accumulator);

    // Final check if client is still connected before saving
    const socketDestroyed = (res.socket as any)?.destroyed === true;
    const isDisconnected = clientDisconnected || res.writableEnded || socketDestroyed;

    console.log('[chat/stream] Pre-save check - disconnected:', isDisconnected,
      'clientDisconnected:', clientDisconnected,
      'writableEnded:', res.writableEnded,
      'socketDestroyed:', socketDestroyed,
      'responseLength:', fullResponse.length);

    // Save messages to database for logged-in users
    // Like ChatGPT/Claude.ai: Save partial response even if user clicked stop
    if (session?.user?.email && fullResponse) {
      if (isDisconnected) {
        console.log('[chat/stream] Client disconnected, saving partial response');
      }
      const savedConvId = await saveMessagesToDatabase(
        session.user.email,
        userMessage,
        fullResponse,
        conversationId,
        sources
      );

      // If a new conversation was created, send the ID to frontend
      if (savedConvId && !conversationId) {
        // Note: This is sent after [DONE], frontend should handle this
        console.log('[chat/stream] New conversation created:', savedConvId);
      }
    }

  } catch (error) {
    // Handle abort errors silently (client disconnect)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[chat/stream] Request aborted due to client disconnect');
      return;
    }
    console.error('[chat/stream] Handler error:', error);
    // Don't try to send JSON response if headers already sent (SSE mode)
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Shared accumulator type for tracking streamed content
 */
interface StreamAccumulator {
  content: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
}

/**
 * Stream chat with RAG tool calling support
 * Handles multi-turn tool calling workflow
 * Returns the full AI response and sources for database storage
 */
async function streamChatWithRAG(
  messages: ChatMessage[],
  res: NextApiResponse,
  forceRAG: boolean = false,
  abortSignal?: AbortSignal,
  accumulator?: StreamAccumulator
): Promise<{ fullResponse: string; sources: Array<{ title: string; url: string; snippet?: string }> }> {
  // Use external accumulator if provided, otherwise create local one
  const acc = accumulator || { content: '', sources: [] };
  let fullResponse = '';
  let collectedSources: Array<{ title: string; url: string; snippet?: string }> = [];

  try {
    // If forceRAG is enabled and ENABLE_RAG is true, make direct RAG call first
    // 使用双LLM架构：第一个LLM提取论文核心发现，第二个LLM与用户对话
    if (forceRAG && ENABLE_RAG) {
      console.log('[chat/stream] Force RAG mode enabled - making direct RAG call');

      // Get the user's last message
      const userMessage = messages[messages.length - 1];

      // Send status update
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Searching research papers...' })}\n\n`);

      try {
        // Execute RAG search with smart summary (双LLM架构)
        // 如果 ENABLE_SMART_SUMMARY=true，会先用第一个LLM生成精炼摘要
        const ragResult = await executeRAGWithSmartSummary(
          userMessage.content,  // query
          userMessage.content,  // userQuestion (for smart summary)
          10                    // top_k
        );

        // Log which mode was used
        console.log(`[chat/stream] Force RAG: Using ${ragResult.summaryMode} mode`);

        // Send sources to frontend and collect for database
        if (ragResult.sources.length > 0) {
          console.log(`[chat/stream] Force RAG: Sending ${ragResult.sources.length} paper sources to frontend`);
          res.write(`data: ${JSON.stringify({ type: 'sources', sources: ragResult.sources })}\n\n`);
          collectedSources = ragResult.sources;
        }

        // Inject RAG results into conversation as a system message
        messages.push({
          role: 'system',
          content: `Research papers found for the user's question:\n\n${ragResult.formattedText}\n\nPlease provide a comprehensive answer based on these research findings.`
        });

        // Send status update with mode info
        const modeInfo = ragResult.summaryMode === 'smart' ? '(智能摘要)' : '(原始模式)';
        res.write(`data: ${JSON.stringify({ type: 'status', message: `Research papers retrieved ${modeInfo}, generating response...` })}\n\n`);
      } catch (error) {
        console.error('[chat/stream] Force RAG search failed:', error);
        // Continue without RAG if it fails
      }
    }

    // Prepare request body
    const requestBody: any = {
      model: DEEPSEEK_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    };

    // Add RAG tools if enabled and NOT in forceRAG mode
    // (in forceRAG mode, we already injected RAG results)
    if (ENABLE_RAG && !forceRAG) {
      requestBody.tools = getRagTools();
      console.log('[chat/stream] RAG tools enabled - AI can decide when to search papers');
    } else if (!ENABLE_RAG) {
      console.log('[chat/stream] RAG disabled - using general knowledge only');
    } else {
      console.log('[chat/stream] Force RAG mode - RAG results already injected');
    }

    // First API call
    const response = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat/stream] DeepSeek API error:', response.status, errorText);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'API request failed' })}\n\n`);
      res.end();
      return { fullResponse: '', sources: [] };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}\n\n`);
      res.end();
      return { fullResponse: '', sources: [] };
    }

    // Process stream and check for tool calls
    // Pass accumulator to update in real-time for partial saves
    const { shouldExecuteTools, toolCalls, assistantMessage } = await processFirstStream(reader, res, abortSignal, acc);

    // Track partial response (for saving even if user stops mid-stream)
    fullResponse = assistantMessage;
    acc.content = assistantMessage;

    // If AI requested tool calls, execute them and make second API call
    if (shouldExecuteTools && toolCalls.length > 0) {
      console.log(`[chat/stream] AI requested ${toolCalls.length} tool calls, executing RAG search...`);

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: assistantMessage || '',
        tool_calls: toolCalls
      });

      // Collect all sources from all tool calls
      const allSources: Array<{ title: string; url: string; snippet?: string }> = [];

      // Execute each tool call and add results
      // 使用双LLM架构：如果开启智能摘要，先用第一个LLM提取核心发现
      for (const toolCall of toolCalls) {
        try {
          console.log(`[chat/stream] Executing tool: ${toolCall.function.name}`);

          // Parse tool arguments to get query
          const args = JSON.parse(toolCall.function.arguments);
          const query = args.query || '';

          // Get user's original question for smart summary context
          const userMessage = messages.find(m => m.role === 'user');
          const userQuestion = userMessage?.content || query;

          // Use smart summary if available
          const toolResult = await executeRAGWithSmartSummary(
            query,
            userQuestion,
            args.top_k || 10
          );

          console.log(`[chat/stream] Tool result using ${toolResult.summaryMode} mode`);

          // Add formatted text to conversation for LLM
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult.formattedText
          });

          // Collect sources for frontend
          allSources.push(...toolResult.sources);

          // Send a status update to client with mode info
          const modeInfo = toolResult.summaryMode === 'smart' ? '(智能摘要)' : '';
          res.write(`data: ${JSON.stringify({ type: 'status', message: `Research papers retrieved ${modeInfo}, generating response...` })}\n\n`);
        } catch (error) {
          console.error(`[chat/stream] Tool execution failed:`, error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`
          });
        }
      }

      // Send sources to frontend immediately after tool execution and collect for database
      if (allSources.length > 0) {
        console.log(`[chat/stream] Sending ${allSources.length} paper sources to frontend`);
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: allSources })}\n\n`);
        collectedSources = allSources;
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
        signal: abortSignal,
      });

      if (!secondResponse.ok) {
        console.error('[chat/stream] Second API call failed');
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response with research' })}\n\n`);
        res.end();
        return { fullResponse: '', sources: collectedSources };
      }

      const secondReader = secondResponse.body?.getReader();
      if (secondReader) {
        fullResponse = await streamFinalResponse(secondReader, res, abortSignal);
      }
    }

    res.end();
    return { fullResponse, sources: collectedSources };
  } catch (error) {
    // Handle abort errors - return partial response for saving (like ChatGPT/Claude.ai)
    if (error instanceof Error && error.name === 'AbortError') {
      // Use accumulator content which is updated in real-time
      const partialContent = acc.content || fullResponse;
      console.log(`[chat/stream] Stream aborted, returning partial response (${partialContent.length} chars from accumulator)`);
      if (!res.writableEnded) {
        res.end();
      }
      // Return whatever was accumulated - will be saved to database
      return { fullResponse: partialContent, sources: acc.sources.length > 0 ? acc.sources : collectedSources };
    }
    console.error('[chat/stream] Stream error:', error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
      res.end();
    }
    // On error, still return partial response if any
    const partialContent = acc.content || fullResponse;
    return { fullResponse: partialContent, sources: acc.sources.length > 0 ? acc.sources : collectedSources };
  }
}

/**
 * Check if client connection is still alive
 */
function isClientConnected(res: NextApiResponse, abortSignal?: AbortSignal): boolean {
  // Check multiple conditions
  const socketDestroyed = (res.socket as any)?.destroyed === true;
  const writableEnded = res.writableEnded;
  const aborted = abortSignal?.aborted === true;

  if (socketDestroyed || writableEnded || aborted) {
    console.log('[chat/stream] Client disconnected check - socket:', socketDestroyed, 'writable:', writableEnded, 'aborted:', aborted);
    return false;
  }
  return true;
}

/**
 * Process first stream and detect tool calls
 */
async function processFirstStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: NextApiResponse,
  abortSignal?: AbortSignal,
  accumulator?: StreamAccumulator
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
      // Check if client is still connected
      if (!isClientConnected(res, abortSignal)) {
        console.log('[chat/stream] Client disconnected during first stream processing');
        break;
      }

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
              // Update accumulator in real-time for partial saves on abort
              if (accumulator) {
                accumulator.content = assistantMessage;
              }
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
 * Returns the collected response text for database storage
 */
async function streamFinalResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: NextApiResponse,
  abortSignal?: AbortSignal
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let collectedResponse = '';

  try {
    while (true) {
      // Check if client is still connected
      if (!isClientConnected(res, abortSignal)) {
        console.log('[chat/stream] Client disconnected during final stream');
        break;
      }

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
              collectedResponse += tokenContent;
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

  return collectedResponse;
}
