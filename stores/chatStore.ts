// stores/chatStore.ts - Chat State Management with Zustand

import { create } from 'zustand';
import { Message, Conversation, TopicFolder, Attachment } from '../types/chat';
import { RAGSource } from '../types';
import { sendMessage as sendChatMessage, stopGeneration } from '../services/chat';

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

  // Load conversations from API (to be implemented in Sprint 1.2)
  loadConversations: async () => {
    // TODO: Implement in Sprint 1.2
    // const conversations = await conversationService.list();
    // set({ conversations });
  },

  // Select a conversation and load its messages (to be implemented in Sprint 1.2)
  selectConversation: async (conversationId: string) => {
    // TODO: Implement in Sprint 1.2
    // const conversation = await conversationService.get(conversationId);
    // const messages = await conversationService.getMessages(conversationId);
    // set({ currentConversation: conversation, messages });
    console.log('Select conversation:', conversationId);
  },

  // Create new chat
  createNewChat: () => {
    set({
      messages: [WELCOME_MESSAGE],
      currentConversation: null,
      error: null,
    });
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
