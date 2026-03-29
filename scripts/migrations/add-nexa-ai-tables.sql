-- ══════════════════════════════════════════════════════
-- Nexa backend persistence, feedback and thread history
-- Schema: greenhouse_ai
-- Ref: TASK-114
-- ══════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS greenhouse_ai;

CREATE TABLE IF NOT EXISTS greenhouse_ai.nexa_threads (
  thread_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  client_id         TEXT NOT NULL,
  title             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexa_threads_user
  ON greenhouse_ai.nexa_threads (user_id, client_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_ai.nexa_messages (
  message_id        TEXT PRIMARY KEY,
  thread_id         UUID NOT NULL REFERENCES greenhouse_ai.nexa_threads(thread_id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  tool_invocations  JSONB,
  suggestions       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  model_id          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexa_messages_thread
  ON greenhouse_ai.nexa_messages (thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS greenhouse_ai.nexa_feedback (
  feedback_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id       TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  client_id         TEXT NOT NULL,
  sentiment         TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative')),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nexa_feedback_response_user UNIQUE (response_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_nexa_feedback_user
  ON greenhouse_ai.nexa_feedback (user_id, client_id, created_at DESC);
