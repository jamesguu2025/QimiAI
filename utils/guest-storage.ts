/**
 * Guest Storage - 访客数据存储层
 *
 * 用于在用户注册前临时存储访客数据（孩子信息、对话历史等）
 * 符合行业标准：localStorage 存储，登录后静默迁移
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface SelectedChallenge {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
}

export interface GuestData {
  childBirthday?: { year: number; month: number };
  childAge?: number; // 计算得出
  challenges?: SelectedChallenge[];
  firstQuestion?: string;
  chatHistory?: Message[];
  messageCount: number;
  createdAt: string;
  lastVisit?: string;
}

const GUEST_KEY = 'qimi_guest_data';
// TODO: 测试阶段暂时禁用消息限制，上线前改回 5
const MAX_GUEST_MESSAGES = 999;

export const guestStorage = {
  /**
   * 保存访客数据（合并更新）
   */
  save: (data: Partial<GuestData>) => {
    if (typeof window === 'undefined') return;

    const existing = guestStorage.get();
    const updated = {
      ...existing,
      ...data,
      lastVisit: new Date().toISOString()
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
  },

  /**
   * 获取访客数据
   */
  get: (): GuestData | null => {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(GUEST_KEY);
    return data ? JSON.parse(data) : null;
  },

  /**
   * 检查是否达到消息限制
   */
  hasReachedLimit: (): boolean => {
    const data = guestStorage.get();
    return (data?.messageCount || 0) >= MAX_GUEST_MESSAGES;
  },

  /**
   * 获取剩余消息数
   */
  getRemainingMessages: (): number => {
    const data = guestStorage.get();
    return Math.max(0, MAX_GUEST_MESSAGES - (data?.messageCount || 0));
  },

  /**
   * 增加消息计数
   */
  incrementMessageCount: () => {
    const data = guestStorage.get() || {
      messageCount: 0,
      createdAt: new Date().toISOString()
    };
    guestStorage.save({
      ...data,
      messageCount: (data.messageCount || 0) + 1
    });
  },

  /**
   * 添加消息到历史记录
   */
  addMessage: (message: Message) => {
    const data = guestStorage.get() || {
      messageCount: 0,
      createdAt: new Date().toISOString(),
      chatHistory: []
    };
    const chatHistory = [...(data.chatHistory || []), message];
    guestStorage.save({ ...data, chatHistory });
  },

  /**
   * 初始化访客会话（新版：支持生日、挑战、首个问题）
   */
  initSession: (
    childBirthday: { year: number; month: number },
    challenges: SelectedChallenge[],
    firstQuestion: string
  ) => {
    // 计算年龄
    const today = new Date();
    const birthDate = new Date(childBirthday.year, childBirthday.month - 1);
    let childAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0) childAge--;

    guestStorage.save({
      childBirthday,
      childAge,
      challenges,
      firstQuestion,
      messageCount: 0,
      chatHistory: [],
      createdAt: new Date().toISOString()
    });
  },

  /**
   * 检查是否已完成引导
   */
  hasCompletedOnboarding: (): boolean => {
    const data = guestStorage.get();
    return !!(data?.childAge);
  },

  /**
   * 检查是否是回访用户
   */
  isReturningUser: (): boolean => {
    const data = guestStorage.get();
    if (!data?.lastVisit) return false;

    const lastVisit = new Date(data.lastVisit);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60);

    return hoursDiff > 1; // 超过1小时视为回访
  },

  /**
   * 清除访客数据
   */
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GUEST_KEY);
  },

  /**
   * 迁移数据到用户账户（注册后调用）
   * 静默迁移，用户无感知
   */
  migrateToUser: async (userId: string): Promise<boolean> => {
    const guestData = guestStorage.get();
    if (!guestData) return false;

    try {
      const response = await fetch('/api/user/migrate-guest-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, guestData })
      });

      if (response.ok) {
        guestStorage.clear();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to migrate guest data:', error);
      return false;
    }
  },

  /**
   * 获取最大消息数限制
   */
  getMaxMessages: () => MAX_GUEST_MESSAGES
};

export default guestStorage;
