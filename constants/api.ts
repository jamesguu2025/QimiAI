// constants/api.ts - API端点定义

/** 后端 API 基础 URL */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.xingbanai.cn';

/** API 端点 */
export const ENDPOINTS = {
  // 认证
  AUTH: {
    LOGIN: '/auth/login',
    WX_LOGIN: '/auth/wx-login',
  },

  // 聊天
  CHAT: {
    STREAM: '/adviser/chat-stream',
    SYNC: '/adviser/chat',
    STOP: '/adviser/stop',
  },

  // 会话
  CONVERSATIONS: {
    LIST: '/conversations',
    CREATE: '/conversations',
    GET: (id: string) => `/conversations/${id}`,
    UPDATE: (id: string) => `/conversations/${id}`,
    DELETE: (id: string) => `/conversations/${id}`,
    MESSAGES: (id: string) => `/messages/${id}`,
  },

  // 心情追踪
  MOOD: {
    RECORD: '/api/mood/record',
    HISTORY: '/api/mood/history',
    STATS: '/api/mood/stats',
    DELETE: (id: string) => `/api/mood/record/${id}`,
  },

  // 成长方案
  PLAN: {
    GET: '/api/action-plan',
    GENERATE: '/api/action-plan/generate',
    SAVE_FROM_CHAT: '/api/action-plan/save-from-chat-stream',
    STAR: '/api/action-plan/star',
    CHECK_IN: '/api/action-plan/check-in',
    UPDATE_ITEM: (id: string) => `/api/action-plan/items/${id}`,
    DELETE_ITEM: '/api/action-plan/item',
    EXPORT_PDF: '/api/action-plan/export-pdf',
  },

  // 配额
  QUOTA: {
    USE: '/api/quota/use',
    STATUS: '/api/quota/status',
  },

  // 用户资料
  PROFILE: {
    GET: '/profile/get',
    INIT: '/profile/quick-init',
    UPDATE: '/profile/update',
  },
} as const;

/** 请求超时时间 (ms) */
export const REQUEST_TIMEOUT = 30000;

/** 流式请求超时时间 (ms) */
export const STREAM_TIMEOUT = 120000;

/** 重试次数 */
export const MAX_RETRIES = 3;

/** 重试延迟 (ms) */
export const RETRY_DELAY = 1000;
