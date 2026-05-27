// types/chat.ts - 聊天相关类型

import { RAGSource } from './api';

/** 消息角色 */
export type MessageRole = 'user' | 'assistant';

/** 附件类型分类 */
export type AttachmentCategory = 'image' | 'pdf' | 'doc' | 'text' | 'other';

/** 附件 */
export interface Attachment {
  id: string;
  type: string; // MIME type (e.g., 'image/jpeg', 'application/pdf')
  name: string;
  size: number;
  base64?: string;
  url?: string;
}

/** 消息 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  sources?: RAGSource[];
  statusMessage?: string; // Status update like "Searching research papers..."
  isStreaming?: boolean;
  sourceMessageId?: string; // Persisted database message id when available
  sourceConversationId?: string; // Persisted conversation id for source lookup/fallback
}

/** 主题文件夹类型 */
export const TOPIC_FOLDER_KEYS = [
  'emotion',
  'learning',
  'exercise',
  'nutrition',
  'social',
  'sleep',
  'school',
  'supplements',
] as const;

export type TopicFolder =
  | (typeof TOPIC_FOLDER_KEYS)[number]
  | 'supplement';

export function isTopicFolder(value: unknown): value is TopicFolder {
  return typeof value === 'string' && (
    (TOPIC_FOLDER_KEYS as readonly string[]).includes(value) ||
    value === 'supplement'
  );
}

export function normalizeTopicFolder(value: TopicFolder | null | undefined): (typeof TOPIC_FOLDER_KEYS)[number] | null {
  if (!value) return null;
  return value === 'supplement' ? 'supplements' : value;
}

/** 会话 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  folderKey: TopicFolder | null;
  messageCount: number;
  lastMessage?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 发送消息请求 */
export interface SendMessageRequest {
  conversationId?: string;
  content: string;
  attachments?: Attachment[];
  folderKey?: TopicFolder;
}

/** 聊天配置 */
export interface ChatConfig {
  maxAttachments: number;
  maxAttachmentSize: number; // bytes
  supportedFileTypes: string[];
}

/** 默认聊天配置 */
export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  maxAttachments: 5,
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  supportedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
};
