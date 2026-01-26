// types/api.ts - 统一API响应格式

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** SSE 事件类型 */
export type SSEEventType = 'token' | 'done' | 'error' | 'sources';

/** SSE 数据块 */
export interface SSEChunk {
  type: SSEEventType;
  content?: string;
  sources?: RAGSource[];
  error?: string;
  totalTokens?: number;
}

/** RAG 来源 */
export interface RAGSource {
  title: string;
  url: string;
  snippet?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** API 错误类 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
