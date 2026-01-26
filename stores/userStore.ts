// stores/userStore.ts - 用户状态管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, GuestData, ChildProfile, Subscription, UserQuota } from '../types';

/** 用户状态 */
interface UserState {
  // 用户信息
  user: User | null;
  isAuthenticated: boolean;

  // 访客模式
  isGuest: boolean;
  guestData: GuestData | null;
  guestMessageCount: number;

  // 孩子档案
  childProfile: ChildProfile | null;

  // 订阅和配额
  subscription: Subscription | null;
  quota: UserQuota | null;

  // 加载状态
  isLoading: boolean;
  error: string | null;
}

/** 用户操作 */
interface UserActions {
  // 认证
  setUser: (user: User | null) => void;
  logout: () => void;

  // 访客模式
  setGuestMode: (isGuest: boolean) => void;
  setGuestData: (data: GuestData | null) => void;
  incrementGuestMessageCount: () => void;
  resetGuestData: () => void;

  // 孩子档案
  setChildProfile: (profile: ChildProfile | null) => void;

  // 订阅和配额
  setSubscription: (subscription: Subscription | null) => void;
  setQuota: (quota: UserQuota | null) => void;
  decrementQuota: (type: 'messages' | 'ragQueries') => void;

  // 加载状态
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // 工具方法
  hasReachedLimit: () => boolean;
  getRemainingMessages: () => number;
}

/** 访客模式配置 */
const GUEST_CONFIG = {
  maxMessages: 5,
  sessionDurationHours: 24,
};

/** 用户 Store */
export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isAuthenticated: false,
      isGuest: true,
      guestData: null,
      guestMessageCount: 0,
      childProfile: null,
      subscription: null,
      quota: null,
      isLoading: false,
      error: null,

      // 认证操作
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isGuest: !user,
          error: null,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isGuest: true,
          subscription: null,
          quota: null,
          error: null,
        });
      },

      // 访客模式操作
      setGuestMode: (isGuest) => {
        set({ isGuest });
      },

      setGuestData: (data) => {
        set({
          guestData: data,
          guestMessageCount: data?.messageCount || 0,
        });
      },

      incrementGuestMessageCount: () => {
        const { guestMessageCount, guestData } = get();
        const newCount = guestMessageCount + 1;
        set({
          guestMessageCount: newCount,
          guestData: guestData
            ? { ...guestData, messageCount: newCount }
            : null,
        });
      },

      resetGuestData: () => {
        set({
          guestData: null,
          guestMessageCount: 0,
        });
      },

      // 孩子档案操作
      setChildProfile: (profile) => {
        set({ childProfile: profile });
      },

      // 订阅和配额操作
      setSubscription: (subscription) => {
        set({ subscription });
      },

      setQuota: (quota) => {
        set({ quota });
      },

      decrementQuota: (type) => {
        const { quota } = get();
        if (!quota) return;

        if (type === 'messages') {
          set({
            quota: {
              ...quota,
              messagesUsed: quota.messagesUsed + 1,
            },
          });
        } else if (type === 'ragQueries') {
          set({
            quota: {
              ...quota,
              ragQueriesUsed: quota.ragQueriesUsed + 1,
            },
          });
        }
      },

      // 加载状态操作
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      // 工具方法
      hasReachedLimit: () => {
        const { isGuest, guestMessageCount, quota, isAuthenticated } = get();

        if (isGuest) {
          return guestMessageCount >= GUEST_CONFIG.maxMessages;
        }

        if (isAuthenticated && quota) {
          return quota.messagesUsed >= quota.messagesLimit;
        }

        return false;
      },

      getRemainingMessages: () => {
        const { isGuest, guestMessageCount, quota, isAuthenticated } = get();

        if (isGuest) {
          return Math.max(0, GUEST_CONFIG.maxMessages - guestMessageCount);
        }

        if (isAuthenticated && quota) {
          return Math.max(0, quota.messagesLimit - quota.messagesUsed);
        }

        return 0;
      },
    }),
    {
      name: 'qimi-user-store',
      // 只持久化部分状态
      partialize: (state) => ({
        guestData: state.guestData,
        guestMessageCount: state.guestMessageCount,
        childProfile: state.childProfile,
      }),
    }
  )
);

// 导出配置常量
export { GUEST_CONFIG };

// 导出类型
export type { UserState, UserActions };
