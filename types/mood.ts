// types/mood.ts - 心情追踪相关类型

/** 心情等级 */
export type MoodLevel =
  | 'very_anxious'
  | 'anxious'
  | 'neutral'
  | 'calm'
  | 'very_calm';

/** 心情等级对应分数 */
export const MOOD_SCORES: Record<MoodLevel, number> = {
  very_anxious: 1,
  anxious: 2,
  neutral: 3,
  calm: 4,
  very_calm: 5,
};

/** 心情等级对应表情 */
export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  very_anxious: '😰',
  anxious: '😟',
  neutral: '😐',
  calm: '🙂',
  very_calm: '😊',
};

/** 心情来源 */
export type MoodSource = 'manual' | 'chat';

/** 心情记录 */
export interface MoodRecord {
  id: string;
  userId: string;
  mood: MoodLevel;
  score: number;
  timestamp: string;
  source: MoodSource;
  note?: string;
}

/** 心情统计 */
export interface MoodStats {
  averageScore: number;
  totalRecords: number;
  moodDistribution: Record<MoodLevel, number>;
  trend: 'improving' | 'stable' | 'declining';
}

/** 心情历史查询范围 */
export type MoodHistoryRange = '7d' | '30d' | '6m' | '1y';

/** 心情记录请求 */
export interface RecordMoodRequest {
  mood: MoodLevel;
  note?: string;
  source?: MoodSource;
}

/** 心情历史请求 */
export interface MoodHistoryRequest {
  range: MoodHistoryRange;
  startDate?: string;
  endDate?: string;
}
