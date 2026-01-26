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
  isStreaming?: boolean;
}

/** 主题文件夹类型 */
export type TopicFolder =
  | 'emotion'
  | 'learning'
  | 'exercise'
  | 'nutrition'
  | 'social'
  | 'sleep'
  | 'school'
  | 'supplement';

/** 会话 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  folderKey: TopicFolder | null;
  messageCount: number;
  lastMessage?: string;
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
