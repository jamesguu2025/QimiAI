-- Analytics MVP event table

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  session_id TEXT,
  page_path TEXT NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  environment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON analytics_events(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time
  ON analytics_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_time
  ON analytics_events(session_id, occurred_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Browser clients must not read or write analytics rows directly.
-- Analytics writes go through pages/api/analytics/event.ts using the service role.
