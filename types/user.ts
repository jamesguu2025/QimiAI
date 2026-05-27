// types/user.ts - 用户相关类型

/** 用户 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: 'google' | 'facebook' | 'email';
  createdAt: string;
  updatedAt: string;
}

/** 孩子档案 */
export interface ChildProfile {
  birthYear: number;
  birthMonth: number;
  name?: string;
  gender?: 'boy' | 'girl' | 'other';
  challenges: string[];
}

/** 挑战类别 */
export interface ChallengeCategory {
  id: string;
  name: string;
  challenges: Challenge[];
}

/** 挑战项 */
export interface Challenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

/** 访客数据 */
export interface GuestData {
  sessionId: string;
  childProfile?: ChildProfile;
  chatHistory: GuestMessage[];
  messageCount: number;
  maxMessages: number;
  createdAt: string;
  expiresAt: string;
  hasCompletedOnboarding: boolean;
}

/** 访客消息（简化版） */
export interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** 订阅计划 */
export type SubscriptionPlan = 'free' | 'basic' | 'premium';

/** 订阅信息 */
export interface Subscription {
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt?: string;
  renewsAt?: string;
}

/** 用户配额 */
export interface UserQuota {
  messagesUsed: number;
  messagesLimit: number;
  ragQueriesUsed: number;
  ragQueriesLimit: number;
  resetAt: string;
}

/** 用户设置 */
export interface UserSettings {
  notifications: boolean;
  emailUpdates: boolean;
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
}

/** 访客迁移请求 */
export interface MigrateGuestRequest {
  guestSessionId: string;
  chatHistory: GuestMessage[];
  childProfile?: ChildProfile;
}
