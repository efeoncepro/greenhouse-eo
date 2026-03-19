-- ══════════════════════════════════════════════════════
-- Transactional Email System — auth_tokens
-- Ref: CODEX_TASK_Transactional_Email_System.md
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS greenhouse_core.auth_tokens (
  token_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT,
  email        TEXT NOT NULL,
  client_id    TEXT,
  token_type   TEXT NOT NULL CHECK (token_type IN ('reset', 'invite', 'verify')),
  token_hash   TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN DEFAULT false,
  used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON greenhouse_core.auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email_type ON greenhouse_core.auth_tokens(email, token_type);
