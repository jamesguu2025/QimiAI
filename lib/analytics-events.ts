export const ANALYTICS_EVENT_NAMES = [
  'landing:cta_click',
  'auth:signup_success',
  'auth:login_success',
  'onboarding:step_complete',
  'onboarding:step_dropoff',
  'chat:first_message_sent',
  'chat:message_sent',
  'chat:history_viewed',
  'chat:message_count_milestone_reach',
  'memory:fact_extracted',
  'plan:save_prompt_show',
  'plan:save_prompt_click',
  'plan:item_saved',
  'plan:library_viewed',
  'plan:generation_started',
  'plan:generation_completed',
  'plan:generation_failed',
  'plan:composed_saved',
  'plan:item_checked_in',
  'quota:limit_reached',
  'contact:form_submitted',
  'chat:error',
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const EVENT_PROPERTY_ALLOWLIST: Record<AnalyticsEventName, readonly string[]> = {
  'landing:cta_click': ['cta_id', 'cta_location', 'destination', 'auth_state', 'experiment_key'],
  'auth:signup_success': ['method', 'consent_captured'],
  'auth:login_success': ['method'],
  'onboarding:step_complete': ['step_number', 'step_key', 'selected_count', 'mode'],
  'onboarding:step_dropoff': ['step_number', 'step_key', 'time_on_step_ms', 'last_valid_state', 'mode'],
  'chat:first_message_sent': ['conversation_type', 'auth_state', 'has_attachment', 'folder_key'],
  'chat:message_sent': ['conversation_type', 'auth_state', 'folder_key'],
  'chat:history_viewed': ['auth_state'],
  'chat:message_count_milestone_reach': ['milestone', 'auth_state', 'conversation_id_hash'],
  'memory:fact_extracted': ['added_count', 'updated_count', 'deleted_count', 'source', 'conversation_id_hash'],
  'plan:save_prompt_show': ['prompt_source', 'category', 'conversation_id_hash'],
  'plan:save_prompt_click': ['prompt_source', 'category', 'conversation_id_hash'],
  'plan:item_saved': ['save_source', 'category'],
  'plan:library_viewed': ['saved_plan_count', 'composed_plan_count'],
  'plan:generation_started': ['generation_source', 'source_count'],
  'plan:generation_completed': ['generation_source', 'source_count', 'remaining'],
  'plan:generation_failed': ['generation_source', 'error_code', 'retryable'],
  'plan:composed_saved': ['source_count', 'topic_count'],
  'plan:item_checked_in': ['category', 'checked_in'],
  'quota:limit_reached': ['feature', 'auth_state', 'period'],
  'contact:form_submitted': ['source', 'has_session'],
  'chat:error': ['error_stage', 'error_code', 'http_status', 'auth_state', 'retryable', 'conversation_id_hash'],
};

const FORBIDDEN_PROPERTY_KEYS = new Set([
  'email',
  'name',
  'child_name',
  'childName',
  'contact',
  'message',
  'prompt',
  'response',
  'chat_text',
  'chatText',
  'memory_value',
  'memoryValue',
  'plan_strategy',
  'planStrategy',
  'plan_pain_point',
  'planPainPoint',
  'user_agent',
  'userAgent',
  'ip',
  'ip_address',
  'ipAddress',
  'referrer',
  'oauth_account_id',
]);

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export function sanitizeAnalyticsProperties(
  eventName: AnalyticsEventName,
  rawProperties: unknown
): AnalyticsProperties {
  if (!rawProperties || typeof rawProperties !== 'object' || Array.isArray(rawProperties)) {
    return {};
  }

  const allowed = new Set(EVENT_PROPERTY_ALLOWLIST[eventName]);
  const sanitized: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(rawProperties as Record<string, unknown>)) {
    if (!allowed.has(key) || FORBIDDEN_PROPERTY_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, 160);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean' || value === null) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function hasForbiddenAnalyticsProperty(rawProperties: unknown) {
  if (!rawProperties || typeof rawProperties !== 'object' || Array.isArray(rawProperties)) {
    return false;
  }

  return Object.keys(rawProperties as Record<string, unknown>).some((key) => FORBIDDEN_PROPERTY_KEYS.has(key));
}
