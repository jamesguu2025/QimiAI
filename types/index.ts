// types/index.ts - 统一导出所有类型

// API 相关
export type {
  ApiResponse,
  SSEEventType,
  SSEChunk,
  RAGSource,
  PaginationParams,
  PaginatedResponse,
} from './api';
export { ApiError } from './api';

// 聊天相关
export type {
  MessageRole,
  AttachmentCategory,
  Attachment,
  Message,
  TopicFolder,
  Conversation,
  SendMessageRequest,
  ChatConfig,
} from './chat';
export { DEFAULT_CHAT_CONFIG } from './chat';

// 心情追踪相关
export type {
  MoodLevel,
  MoodSource,
  MoodRecord,
  MoodStats,
  MoodHistoryRange,
  RecordMoodRequest,
  MoodHistoryRequest,
} from './mood';
export { MOOD_SCORES, MOOD_EMOJIS } from './mood';

// 成长方案相关
export type {
  PlanCategory,
  CategoryInfo,
  WeekDay,
  ActionPlanItem,
  ActionPlan,
  CreatePlanItemRequest,
  UpdatePlanItemRequest,
  GeneratePlanRequest,
  ExportPdfRequest,
} from './plan';
export { PLAN_CATEGORIES } from './plan';

// 用户相关
export type {
  User,
  ChildProfile,
  ChallengeCategory,
  Challenge,
  GuestData,
  GuestMessage,
  SubscriptionPlan,
  Subscription,
  UserQuota,
  UserSettings,
  MigrateGuestRequest,
} from './user';
