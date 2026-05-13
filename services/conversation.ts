// services/conversation.ts - Conversation Service Layer
// Client-side API calls for conversation management

import { Conversation, Message, TopicFolder } from '../types/chat';

/** Conversation with messages */
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

/** Create conversation request */
export interface CreateConversationRequest {
  title?: string;
  folderKey?: TopicFolder | null;
}

/** Update conversation request */
export interface UpdateConversationRequest {
  title?: string;
  folderKey?: TopicFolder | null;
  isPinned?: boolean;
}

/** Generate conversation title request */
export interface GenerateConversationTitleRequest {
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  fallbackTitle?: string;
}

/**
 * List all conversations for current user
 */
export async function listConversations(): Promise<Conversation[]> {
  const response = await fetch('/api/conversations', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  // Handle different response formats
  return data.conversations || data || [];
}

/**
 * Create a new conversation
 */
export async function createConversation(
  request: CreateConversationRequest = {}
): Promise<Conversation> {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get a conversation with its messages
 */
export async function getConversation(id: string): Promise<ConversationWithMessages> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update a conversation
 */
export async function updateConversation(
  id: string,
  request: UpdateConversationRequest
): Promise<Conversation> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a concise title for a newly-created conversation.
 * This is a best-effort background enhancement; callers should ignore failures.
 */
export async function generateConversationTitle(
  request: GenerateConversationTitleRequest
): Promise<{ title: string; skipped?: boolean }> {
  const response = await fetch('/api/conversations/generate-title', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
}

/**
 * Conversation service object for convenience
 */
export const conversationService = {
  list: listConversations,
  create: createConversation,
  get: getConversation,
  update: updateConversation,
  generateTitle: generateConversationTitle,
  delete: deleteConversation,
};

export default conversationService;
