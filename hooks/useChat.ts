// hooks/useChat.ts - Chat Hook using Zustand store

import { useCallback } from 'react';
import { useChatStore, WELCOME_MESSAGE } from '../stores/chatStore';
import { Message, Attachment } from '../types/chat';

/**
 * Chat hook return type
 */
export interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  canStop: boolean;
  error: string | null;
  sendMessage: (content: string, attachments?: Attachment[], forceRAG?: boolean) => Promise<void>;
  stopGeneration: () => void;
  clearHistory: () => void;
  setMessages: (messages: Message[]) => void;
}

/**
 * Hook for chat functionality using real API
 */
export function useChat(initialMessages?: typeof WELCOME_MESSAGE[]): UseChatReturn {
  const {
    messages,
    isStreaming,
    error,
    sendMessage: storeSendMessage,
    stopStream,
    clearMessages,
    setMessages,
  } = useChatStore();

  // Initialize messages if provided (only on first render)
  // Note: The store is already initialized with WELCOME_MESSAGE

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[], forceRAG?: boolean) => {
      await storeSendMessage(content, attachments, forceRAG);
    },
    [storeSendMessage]
  );

  const stopGeneration = useCallback(() => {
    stopStream();
  }, [stopStream]);

  const clearHistory = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  return {
    messages,
    isStreaming,
    canStop: isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearHistory,
    setMessages,
  };
}

export default useChat;
