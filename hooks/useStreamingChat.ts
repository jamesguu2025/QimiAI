import { useState, useCallback, useRef } from 'react';
import { RAGSource } from '../types/api';
import { FileAttachment } from '../components/Chat/ChatInput';

// ============================================================================
// SSE 数据类型定义（符合后端 API 规范）
// ============================================================================

/** SSE 事件类型 */
export type SSEEventType = 'token' | 'done' | 'error' | 'sources';

/** SSE 数据包 */
export interface SSEChunk {
  type: SSEEventType;
  content?: string;
  sources?: RAGSource[];
  error?: string;
  totalTokens?: number;
}

/** 附件类型 */
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

/** 消息类型 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  attachments?: Attachment[];
  isStreaming?: boolean;
}

// ============================================================================
// Mock 响应数据
// ============================================================================

const MOCK_RESPONSES: Record<string, { content: string; sources: RAGSource[] }> = {
  adhd: {
    content: "ADHD (Attention Deficit Hyperactivity Disorder) is a neurodevelopmental condition involving persistent patterns of inattention, hyperactivity, and impulsivity.\n\nKey aspects include:\n*   Difficulty sustaining attention\n*   Struggling with organization\n*   Restlessness or fidgeting\n\nManagement often involves a combination of behavioral strategies, medication, and support.",
    sources: [
      { title: "NIMH: ADHD", url: "https://www.nimh.nih.gov/health/topics/adhd" },
      { title: "CDC: What is ADHD?", url: "https://www.cdc.gov/ncbddd/adhd/facts.html" }
    ]
  },
  sleep: {
    content: "Sleep issues are common with ADHD. A consistent bedtime routine is crucial.\n\n**Tips for better sleep:**\n1.  Limit screens 1 hour before bed.\n2.  Use white noise or calming music.\n3.  Keep the room cool and dark.\n\nMelatonin supplements are sometimes used, but consult a doctor first.",
    sources: [
      { title: "Sleep Foundation: ADHD and Sleep", url: "https://www.sleepfoundation.org/adhd-and-sleep" }
    ]
  },
  iep: {
    content: "Navigating the IEP process can be daunting. I can help you understand your rights, suggest goals, or draft a letter to the school.\n\n**Where should we start?**\n*   Understanding the evaluation process\n*   Drafting SMART goals\n*   Requesting a meeting",
    sources: [
      { title: "Understood.org: IEP Guide", url: "https://www.understood.org/ieps" }
    ]
  },
  default: {
    content: "I understand. Could you tell me more about that? I'm here to listen and provide support based on verified medical guidelines.",
    sources: []
  },
  attachment: {
    content: "Thank you for sharing those files with me.\n\n**What I can help with:**\n*   Analyze images of documents or homework\n*   Review PDFs of school reports or IEPs\n*   Help interpret Word documents\n\nCould you tell me more about what you'd like me to look at?",
    sources: []
  }
};

// ============================================================================
// 工具函数
// ============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getMockResponse(input: string, hasAttachments: boolean) {
  if (hasAttachments) return MOCK_RESPONSES.attachment;
  const lower = input.toLowerCase();
  if (lower.includes('adhd')) return MOCK_RESPONSES.adhd;
  if (lower.includes('sleep')) return MOCK_RESPONSES.sleep;
  if (lower.includes('iep')) return MOCK_RESPONSES.iep;
  return MOCK_RESPONSES.default;
}

// ============================================================================
// Mock SSE 流生成器
// ============================================================================

async function* mockSSEStream(response: string, sources: RAGSource[]): AsyncGenerator<SSEChunk> {
  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield { type: 'token', content: words[i] + (i < words.length - 1 ? ' ' : '') };
    await sleep(30 + Math.random() * 70);
  }
  if (sources.length > 0) yield { type: 'sources', sources };
  yield { type: 'done', totalTokens: words.length };
}

// ============================================================================
// useStreamingChat Hook
// ============================================================================

export interface UseStreamingChatReturn {
  messages: Message[];
  isStreaming: boolean;
  canStop: boolean;
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  stopGeneration: () => void;
  clearHistory: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useStreamingChat(initialMessages: Message[] = []): UseStreamingChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStoppedRef = useRef(false);

  const sendMessage = useCallback(async (content: string, attachments?: FileAttachment[]) => {
    const messageAttachments: Attachment[] | undefined = attachments?.map(a => ({
      id: a.id, name: a.name, type: a.type, size: a.size, url: a.url
    }));

    const displayContent = content || (attachments?.length ? `[Attached ${attachments.length} file(s)]` : '');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayContent,
      attachments: messageAttachments
    };

    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setIsStreaming(true);
    isStoppedRef.current = false;

    try {
      const { content: responseContent, sources } = getMockResponse(content, !!attachments?.length);
      let accumulated = '';

      for await (const chunk of mockSSEStream(responseContent, sources)) {
        if (isStoppedRef.current) break;

        if (chunk.type === 'token' && chunk.content) {
          accumulated += chunk.content;
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: accumulated } : msg
          ));
        } else if (chunk.type === 'sources' && chunk.sources) {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, sources: chunk.sources } : msg
          ));
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
      ));
    } catch (error) {
      console.error('[useStreamingChat] Error:', error);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopGeneration = useCallback(() => {
    isStoppedRef.current = true;
    setIsStreaming(false);
    setMessages(prev => prev.map(msg =>
      msg.isStreaming ? { ...msg, isStreaming: false } : msg
    ));
  }, []);

  const clearHistory = useCallback(() => setMessages([]), []);

  return {
    messages,
    isStreaming,
    canStop: isStreaming,
    sendMessage,
    stopGeneration,
    clearHistory,
    setMessages
  };
}

export default useStreamingChat;
