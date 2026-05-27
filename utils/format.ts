// utils/format.ts - 格式化工具函数

/**
 * 格式化文件大小
 * @param bytes 文件大小（字节）
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * 获取文件类型分类
 * @param mimeType MIME类型
 * @returns 文件类型分类
 */
export function getFileCategory(mimeType: string): 'image' | 'pdf' | 'word' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  return 'other';
}

/**
 * 格式化日期
 * @param dateString ISO日期字符串
 * @param options 格式化选项
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options);
}

/**
 * 格式化相对时间
 * @param dateString ISO日期字符串
 * @returns 相对时间字符串（如 "2 hours ago"）
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(dateString);
}

/**
 * 截断文本
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 截断后缀
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
