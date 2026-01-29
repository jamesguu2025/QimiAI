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
  delete: deleteConversation,
};

export default conversationService;
