// services/chat.ts - Chat Service Layer

import { SSEChunk, RAGSource } from '../types';
import { Attachment, TopicFolder, Message } from '../types/chat';

/** User profile for context injection */
export interface UserProfile {
  childBirthday?: { year: number; month: number } | string;
  challenges?: Array<{ id: string; name: string; categoryId?: string; categoryName?: string }>;
  familyNotes?: string;
  extractedFacts?: string[];
}

/** Send message request options */
export interface SendMessageOptions {
  content: string;
  attachments?: Attachment[];
  conversationId?: string;
  folderKey?: TopicFolder;
  signal?: AbortSignal;
  conversationHistory?: Array<{ role: string; content: string }>;
  userProfile?: UserProfile;
  forceRAG?: boolean; // Force RAG mode - when true, always use RAG
}

/** Chat service response */
export interface ChatStreamCallbacks {
  onToken: (content: string) => void;
  onSources: (sources: RAGSource[]) => void;
  onStatus: (message: string) => void;
  onDone: (totalTokens?: number) => void;
  onError: (error: string) => void;
  onConversationCreated?: (conversationId: string) => void;
}

/**
 * Send a message and receive streaming response
 */
export async function sendMessage(
  options: SendMessageOptions,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const { content, attachments, conversationId, folderKey, signal, conversationHistory, userProfile, forceRAG } = options;

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      attachments,
      conversationId,
      folderKey,
      conversationHistory,
      userProfile,
      forceRAG,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            callbacks.onDone();
            return;
          }

          try {
            const chunk = JSON.parse(data) as SSEChunk;

            switch (chunk.type) {
              case 'token':
                if (chunk.content) {
                  callbacks.onToken(chunk.content);
                }
                break;
              case 'sources':
                if (chunk.sources) {
                  callbacks.onSources(chunk.sources);
                }
                break;
              case 'status':
                if (chunk.message) {
                  callbacks.onStatus(chunk.message);
                }
                break;
              case 'done':
                callbacks.onDone(chunk.totalTokens);
                return;
              case 'conversation_created':
                if (chunk.conversationId) {
                  callbacks.onConversationCreated?.(chunk.conversationId);
                }
                break;
              case 'error':
                callbacks.onError(chunk.error || 'Unknown error');
                return;
            }
          } catch {
            // Ignore unparseable lines
          }
        }
      }
    }

    // Stream ended without explicit done event
    callbacks.onDone();
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stop message generation
 */
export async function stopGeneration(conversationId?: string): Promise<void> {
  const response = await fetch('/api/chat/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ conversationId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to stop generation');
  }
}

/**
 * Create a chat service instance with convenience methods
 */
export const chatService = {
  sendMessage,
  stopGeneration,
};

export default chatService;
