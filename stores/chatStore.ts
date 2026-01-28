// stores/chatStore.ts - Chat State Management with Zustand

import { create } from 'zustand';
import { Message, Conversation, TopicFolder, Attachment } from '../types/chat';
import { RAGSource } from '../types';
import { sendMessage as sendChatMessage, stopGeneration } from '../services/chat';
import {
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
} from '../services/conversation';

/** Welcome message */
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello. I'm Qimi AI.\n\nI can help you understand ADHD symptoms, find management strategies, or just listen.\n\nHow can I help you today?",
  timestamp: new Date().toISOString(),
};

/** Chat state */
interface ChatState {
  // Messages
  messages: Message[];
  isStreaming: boolean;

  // Current conversation
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isLoadingConversations: boolean;

  // Abort controller for stopping stream
  abortController: AbortController | null;

  // Error state
  error: string | null;
}

/** Chat actions */
interface ChatActions {
  // Message actions
  sendMessage: (content: string, attachments?: Attachment[], forceRAG?: boolean) => Promise<void>;
  stopStream: () => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Conversation actions
  setCurrentConversation: (conversation: Conversation | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  createNewChat: () => void;
  createConversation: (title?: string, folderKey?: TopicFolder | null) => Promise<Conversation>;
  updateCurrentConversation: (title?: string, folderKey?: TopicFolder | null) => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  deleteConversationById: (conversationId: string) => Promise<void>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

/** Chat store */
export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // Initial state
  messages: [WELCOME_MESSAGE],
  isStreaming: false,
  currentConversation: null,
  conversations: [],
  isLoadingConversations: false,
  abortController: null,
  error: null,

  // Send message with streaming response
  sendMessage: async (content: string, attachments?: Attachment[], forceRAG?: boolean) => {
    const { currentConversation, abortController: existingController } = get();

    // Cancel any existing stream
    if (existingController) {
      existingController.abort();
    }

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content || (attachments?.length ? `[Attached ${attachments.length} file(s)]` : ''),
      timestamp: new Date().toISOString(),
      attachments,
    };

    // Create placeholder AI message
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    // Add messages to state
    set(state => ({
      messages: [...state.messages, userMessage, aiMessage],
      isStreaming: true,
      error: null,
    }));

    // Create new abort controller
    const controller = new AbortController();
    set({ abortController: controller });

    let accumulated = '';
    let sources: RAGSource[] = [];

    // Build conversation history for dynamic prompt (exclude welcome message and current user message)
    const { messages } = get();
    const conversationHistory = messages
      .filter(msg => msg.id !== 'welcome' && msg.id !== userMessage.id && msg.id !== aiMessageId)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    try {
      await sendChatMessage(
        {
          content,
          attachments,
          conversationId: currentConversation?.id,
          signal: controller.signal,
          conversationHistory,
          forceRAG,
          // TODO: Pass userProfile when available (from guest storage or user session)
        },
        {
          onToken: (token) => {
            accumulated += token;
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, content: accumulated, statusMessage: undefined }
                  : msg
              ),
            }));
          },
          onSources: (newSources) => {
            sources = newSources;
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, sources: newSources }
                  : msg
              ),
            }));
          },
          onStatus: (statusMsg) => {
            // Log status to browser console for easy verification
            console.log('[Qimi] Status:', statusMsg);
            if (statusMsg.includes('智能摘要')) {
              console.log('[Qimi] ✅ 双LLM智能摘要模式已启用！');
            } else if (statusMsg.includes('原始模式')) {
              console.log('[Qimi] ⚠️ 使用原始模式（智能摘要未启用）');
            }
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, statusMessage: statusMsg }
                  : msg
              ),
            }));
          },
          onDone: () => {
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, isStreaming: false, statusMessage: undefined, sources }
                  : msg
              ),
              isStreaming: false,
              abortController: null,
            }));
          },
          onError: (error) => {
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, isStreaming: false, statusMessage: undefined, content: accumulated || 'An error occurred.' }
                  : msg
              ),
              isStreaming: false,
              abortController: null,
              error,
            }));
          },
        }
      );
    } catch (error) {
      // Handle abort
      if (error instanceof Error && error.name === 'AbortError') {
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, isStreaming: false }
              : msg
          ),
          isStreaming: false,
          abortController: null,
        }));
        return;
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, isStreaming: false, content: accumulated || `Error: ${errorMessage}` }
            : msg
        ),
        isStreaming: false,
        abortController: null,
        error: errorMessage,
      }));
    }
  },

  // Stop streaming
  stopStream: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      stopGeneration().catch(() => {});
    }

    set(state => ({
      messages: state.messages.map(msg =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      ),
      isStreaming: false,
      abortController: null,
    }));
  },

  // Clear messages
  clearMessages: () => {
    set({ messages: [WELCOME_MESSAGE], currentConversation: null });
  },

  // Set messages
  setMessages: (messages) => {
    set({ messages });
  },

  // Add a single message
  addMessage: (message) => {
    set(state => ({
      messages: [...state.messages, message],
    }));
  },

  // Set current conversation
  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  // Set conversations list
  setConversations: (conversations) => {
    set({ conversations });
  },

  // Load conversations from API
  // Note: This will fail for guests (401), which is expected behavior
  loadConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const conversations = await listConversations();
      set({ conversations, isLoadingConversations: false });
    } catch (error) {
      // Don't log error for 401 (unauthorized/guest users)
      const errorMsg = error instanceof Error ? error.message : 'Failed to load conversations';
      if (!errorMsg.includes('Unauthorized') && !errorMsg.includes('401')) {
        console.error('[chatStore] Failed to load conversations:', error);
      }
      set({
        isLoadingConversations: false,
        // Don't set error for unauthorized (guest users)
        error: errorMsg.includes('Unauthorized') || errorMsg.includes('401') ? null : errorMsg,
      });
    }
  },

  // Select a conversation and load its messages
  selectConversation: async (conversationId: string) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const conversationWithMessages = await getConversation(conversationId);
      const { messages: loadedMessages, ...conversation } = conversationWithMessages;

      // Convert backend messages to our Message type with welcome message
      const formattedMessages: Message[] = [WELCOME_MESSAGE];
      if (loadedMessages && loadedMessages.length > 0) {
        for (const msg of loadedMessages) {
          formattedMessages.push({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            sources: msg.sources,
            attachments: msg.attachments,
          });
        }
      }

      set({
        currentConversation: conversation as Conversation,
        messages: formattedMessages,
        isLoadingConversations: false,
      });
    } catch (error) {
      console.error('[chatStore] Failed to load conversation:', error);
      set({
        isLoadingConversations: false,
        error: error instanceof Error ? error.message : 'Failed to load conversation',
      });
    }
  },

  // Create new chat (local only, no API call)
  createNewChat: () => {
    set({
      messages: [WELCOME_MESSAGE],
      currentConversation: null,
      error: null,
    });
  },

  // Create a new conversation via API
  createConversation: async (title?: string, folderKey?: TopicFolder | null) => {
    try {
      const conversation = await createConversation({ title, folderKey });
      set(state => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        messages: [WELCOME_MESSAGE],
      }));
      return conversation;
    } catch (error) {
      console.error('[chatStore] Failed to create conversation:', error);
      throw error;
    }
  },

  // Update current conversation
  updateCurrentConversation: async (title?: string, folderKey?: TopicFolder | null) => {
    const { currentConversation } = get();
    if (!currentConversation) {
      throw new Error('No current conversation');
    }

    try {
      const updated = await updateConversation(currentConversation.id, { title, folderKey });
      set(state => ({
        currentConversation: updated,
        conversations: state.conversations.map(c =>
          c.id === updated.id ? updated : c
        ),
      }));
    } catch (error) {
      console.error('[chatStore] Failed to update conversation:', error);
      throw error;
    }
  },

  // Delete current conversation
  deleteCurrentConversation: async () => {
    const { currentConversation } = get();
    if (!currentConversation) {
      throw new Error('No current conversation');
    }

    try {
      await deleteConversation(currentConversation.id);
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== currentConversation.id),
        currentConversation: null,
        messages: [WELCOME_MESSAGE],
      }));
    } catch (error) {
      console.error('[chatStore] Failed to delete conversation:', error);
      throw error;
    }
  },

  // Delete a conversation by ID
  deleteConversationById: async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      const { currentConversation } = get();
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        // If we deleted the current conversation, reset
        ...(currentConversation?.id === conversationId ? {
          currentConversation: null,
          messages: [WELCOME_MESSAGE],
        } : {}),
      }));
    } catch (error) {
      console.error('[chatStore] Failed to delete conversation:', error);
      throw error;
    }
  },

  // Error handling
  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Export welcome message for reuse
export { WELCOME_MESSAGE };

// Export types
export type { ChatState, ChatActions };
