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
  color: string;
}

/** 分类列表 */
export const PLAN_CATEGORIES: CategoryInfo[] = [
  { id: 'emotion', name: 'Emotional Support', color: '#FF6B6B' },
  { id: 'learning', name: 'Learning Strategies', color: '#4ECDC4' },
  { id: 'exercise', name: 'Exercise & Movement', color: '#45B7D1' },
  { id: 'nutrition', name: 'Diet & Nutrition', color: '#96CEB4' },
  { id: 'social', name: 'Social Skills', color: '#DDA0DD' },
  { id: 'sleep', name: 'Sleep & Rest', color: '#6C5CE7' },
  { id: 'school', name: 'School Communication', color: '#FDCB6E' },
];

/** 打卡日期 */
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/** 结构化干预内容块。contentMarkdown 使用 GFM，支持表格/列表。 */
export interface PlanContentBlock {
  title?: string;
  contentMarkdown: string;
}

/** 成长方案项目 */
export interface ActionPlanItem {
  id: string;
  userId: string;
  category: PlanCategory;
  painPoint: string;
  strategy: string;
  strategySummary?: string;
  explanationMarkdown?: string;
  interventionBlocks?: PlanContentBlock[];
  star: boolean;
  checkInDays: WeekDay[];
  lastCheckIn?: string;
  sourceConversationId?: string;
  sourceMessageId?: string;
  sourceTime?: string;
  sourceType?: 'manual' | 'chat';
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
  strategySummary?: string;
  explanationMarkdown?: string;
  interventionBlocks?: PlanContentBlock[];
  sourceConversationId?: string;
  sourceMessageId?: string;
  sourceTime?: string;
  sourceType?: 'manual' | 'chat';
}

/** A compiled, cross-topic plan created from Saved Plan sources. */
export interface ComposedPlan {
  id: string;
  userId: string;
  title: string;
  summary: string;
  explanationMarkdown?: string;
  topicCategories: PlanCategory[];
  interventionBlocks: PlanContentBlock[];
  sourcePlanIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateComposedPlanRequest {
  title: string;
  summary: string;
  explanationMarkdown?: string;
  interventionBlocks: PlanContentBlock[];
  sourcePlanIds: string[];
}

/** 更新方案项目请求 */
export interface UpdatePlanItemRequest {
  painPoint?: string;
  strategy?: string;
  strategySummary?: string;
  explanationMarkdown?: string;
  interventionBlocks?: PlanContentBlock[];
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
