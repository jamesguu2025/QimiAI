// services/api-client.ts - 统一 HTTP 客户端

import { API_BASE, REQUEST_TIMEOUT } from '../constants/api';
import { ApiError, SSEChunk } from '../types';

/** 请求配置 */
interface RequestConfig extends RequestInit {
  timeout?: number;
}

/**
 * API 客户端类
 * 提供统一的 HTTP 请求方法和 SSE 流式请求支持
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 设置认证 Token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * 清除认证 Token
   */
  clearAuthToken(): void {
    const { Authorization, ...rest } = this.defaultHeaders as Record<string, string>;
    this.defaultHeaders = rest;
  }

  /**
   * 通用请求方法
   */
  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || REQUEST_TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.code || errorData.error || 'UNKNOWN_ERROR',
          errorData.message || `HTTP ${response.status}`,
          errorData.details
        );
      }

      // 处理空响应
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(408, 'TIMEOUT', 'Request timeout');
        }
        throw new ApiError(0, 'NETWORK_ERROR', error.message);
      }

      throw new ApiError(0, 'UNKNOWN_ERROR', 'An unknown error occurred');
    }
  }

  /**
   * SSE 流式请求
   */
  async *stream(
    endpoint: string,
    body: unknown,
    signal?: AbortSignal
  ): AsyncGenerator<SSEChunk> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.code || 'STREAM_ERROR',
        errorData.message || 'Stream request failed'
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError(0, 'NO_BODY', 'Response has no body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk = JSON.parse(data) as SSEChunk;
              yield chunk;
            } catch {
              // 忽略无法解析的行
              console.warn('[ApiClient] Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // 便捷方法
  get<T>(endpoint: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// 导出单例实例
export const apiClient = new ApiClient(API_BASE);

// 导出类（用于测试或创建其他实例）
export { ApiClient };
