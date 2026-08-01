-- Durable AI-cost quotas and fixed-window rate limits.
-- All access is server-side through the service role; browsers receive no policies.

CREATE TABLE IF NOT EXISTS public.ai_usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key TEXT NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('chat', 'plan_ai')),
  window_key TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_key, feature, window_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quotas_actor_feature
  ON public.ai_usage_quotas(actor_key, feature, updated_at DESC);

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.api_rate_limit_buckets (
  actor_key TEXT NOT NULL,
  scope TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (actor_key, scope)
);

ALTER TABLE public.api_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_actor_key TEXT,
  p_feature TEXT,
  p_window_key TEXT,
  p_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, used_count INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INTEGER;
BEGIN
  IF p_actor_key IS NULL OR length(p_actor_key) < 3
     OR p_feature NOT IN ('chat', 'plan_ai')
     OR p_window_key IS NULL OR length(p_window_key) < 1
     OR p_limit < 1 THEN
    RAISE EXCEPTION 'Invalid quota arguments';
  END IF;

  INSERT INTO public.ai_usage_quotas(actor_key, feature, window_key, used_count)
  VALUES (p_actor_key, p_feature, p_window_key, 0)
  ON CONFLICT (actor_key, feature, window_key) DO NOTHING;

  SELECT q.used_count INTO v_used
  FROM public.ai_usage_quotas q
  WHERE q.actor_key = p_actor_key
    AND q.feature = p_feature
    AND q.window_key = p_window_key
  FOR UPDATE;

  IF v_used >= p_limit THEN
    RETURN QUERY SELECT false, v_used, 0;
    RETURN;
  END IF;

  UPDATE public.ai_usage_quotas q
  SET used_count = q.used_count + 1, updated_at = NOW()
  WHERE q.actor_key = p_actor_key
    AND q.feature = p_feature
    AND q.window_key = p_window_key
  RETURNING q.used_count INTO v_used;

  RETURN QUERY SELECT true, v_used, GREATEST(0, p_limit - v_used);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_actor_key TEXT,
  p_scope TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, request_count INTEGER, remaining INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started TIMESTAMPTZ;
  v_count INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_actor_key IS NULL OR length(p_actor_key) < 3
     OR p_scope IS NULL OR length(p_scope) < 1
     OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit arguments';
  END IF;

  INSERT INTO public.api_rate_limit_buckets(actor_key, scope, window_started_at, request_count)
  VALUES (p_actor_key, p_scope, v_now, 0)
  ON CONFLICT (actor_key, scope) DO NOTHING;

  SELECT b.window_started_at, b.request_count INTO v_started, v_count
  FROM public.api_rate_limit_buckets b
  WHERE b.actor_key = p_actor_key AND b.scope = p_scope
  FOR UPDATE;

  IF v_started <= v_now - make_interval(secs => p_window_seconds) THEN
    v_started := v_now;
    v_count := 0;
  END IF;

  IF v_count >= p_limit THEN
    UPDATE public.api_rate_limit_buckets b
    SET window_started_at = v_started, request_count = v_count, updated_at = v_now
    WHERE b.actor_key = p_actor_key AND b.scope = p_scope;
    RETURN QUERY SELECT false, v_count, 0,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_started + make_interval(secs => p_window_seconds) - v_now)))::INTEGER);
    RETURN;
  END IF;

  v_count := v_count + 1;
  UPDATE public.api_rate_limit_buckets b
  SET window_started_at = v_started, request_count = v_count, updated_at = v_now
  WHERE b.actor_key = p_actor_key AND b.scope = p_scope;

  RETURN QUERY SELECT true, v_count, GREATEST(0, p_limit - v_count), 0;
END;
$$;

REVOKE ALL ON TABLE public.ai_usage_quotas FROM anon, authenticated;
REVOKE ALL ON TABLE public.api_rate_limit_buckets FROM anon, authenticated;
GRANT SELECT ON TABLE public.ai_usage_quotas TO service_role;
REVOKE ALL ON FUNCTION public.consume_ai_quota(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
