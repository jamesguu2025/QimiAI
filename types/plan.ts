// types/plan.ts - 成长方案相关类型

/** 方案分类 */
export type PlanCategory =
  | 'emotion'
  | 'learning'
  | 'exercise'
  | 'nutrition'
  | 'social'
  | 'sleep'
  | 'school';

/** 分类信息 */
export interface CategoryInfo {
  id: PlanCategory;
  name: string;
  icon: string;
  color: string;
}

/** 分类列表 */
export const PLAN_CATEGORIES: CategoryInfo[] = [
  { id: 'emotion', name: 'Emotional Support', icon: '❤️', color: '#FF6B6B' },
  { id: 'learning', name: 'Learning Strategies', icon: '📚', color: '#4ECDC4' },
  { id: 'exercise', name: 'Exercise & Movement', icon: '🏃', color: '#45B7D1' },
  { id: 'nutrition', name: 'Diet & Nutrition', icon: '🥗', color: '#96CEB4' },
  { id: 'social', name: 'Social Skills', icon: '👥', color: '#DDA0DD' },
  { id: 'sleep', name: 'Sleep & Rest', icon: '🌙', color: '#6C5CE7' },
  { id: 'school', name: 'School Communication', icon: '🏫', color: '#FDCB6E' },
];

/** 打卡日期 */
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/** 成长方案项目 */
export interface ActionPlanItem {
  id: string;
  userId: string;
  category: PlanCategory;
  painPoint: string;
  strategy: string;
  star: boolean;
  checkInDays: WeekDay[];
  lastCheckIn?: string;
  sourceMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 成长方案 */
export interface ActionPlan {
  items: ActionPlanItem[];
  totalItems: number;
  starredCount: number;
  lastUpdated: string;
}

/** 创建方案项目请求 */
export interface CreatePlanItemRequest {
  category: PlanCategory;
  painPoint: string;
  strategy: string;
  sourceMessageId?: string;
}

/** 更新方案项目请求 */
export interface UpdatePlanItemRequest {
  painPoint?: string;
  strategy?: string;
  category?: PlanCategory;
  star?: boolean;
  checkInDays?: WeekDay[];
}

/** 从对话生成方案请求 */
export interface GeneratePlanRequest {
  conversationId: string;
  messageId?: string;
}

/** 导出 PDF 请求 */
export interface ExportPdfRequest {
  itemIds: string[];
  includeCheckInHistory?: boolean;
}
