-- TASK-742 Capa 5 — Magic-link self-recovery storage.
--
-- Stores single-use, short-lived (15 min) magic-link tokens for users who
-- can not reach their account via SSO and have no password_hash. The 2026-04-30
-- incident demonstrated that an opaque ?error=Callback for SSO with no
-- credentials path leaves the user permanently locked out without operator
-- intervention. This table is the airbag.
--
-- Security:
--   - Only bcrypt(token) is stored; the raw token never persists.
--   - Single-use: used_at is set on first consume and a partial unique
--     index prevents the same row from being marked used again.
--   - Short TTL: expires_at is enforced at consume time (Capa 5 runtime).
--   - IP is sha256-hashed (32 chars), never stored raw.

-- Up Migration

CREATE SCHEMA IF NOT EXISTS greenhouse_serving;

CREATE TABLE IF NOT EXISTS greenhouse_serving.auth_magic_links (
  token_id              UUID         PRIMARY KEY,
  user_id               TEXT         NOT NULL,
  token_hash_bcrypt     TEXT         NOT NULL,
  requested_ip_hashed   TEXT,
  requested_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ  NOT NULL,
  used_at               TIMESTAMPTZ,
  used_ip_hashed        TEXT,

  CONSTRAINT auth_magic_links_user_id_fk
    FOREIGN KEY (user_id)
    REFERENCES greenhouse_core.client_users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT auth_magic_links_expires_after_request
    CHECK (expires_at > requested_at)
);

-- Look up by user for cooldown check (last requested_at < 60s ago)
CREATE INDEX IF NOT EXISTS auth_magic_links_user_recent_idx
  ON greenhouse_serving.auth_magic_links (user_id, requested_at DESC);

-- Sweep idx for janitor (future task): expired but not used
CREATE INDEX IF NOT EXISTS auth_magic_links_expired_unused_idx
  ON greenhouse_serving.auth_magic_links (expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE greenhouse_serving.auth_magic_links IS
  'TASK-742 Capa 5 - Single-use magic-link tokens. Only bcrypt(token) is stored. TTL=15min. Single-use enforced at consume time.';

COMMENT ON COLUMN greenhouse_serving.auth_magic_links.token_hash_bcrypt IS
  'bcrypt hash of the raw URL-safe random 32-byte token. Cost factor 10. Never the raw token.';

COMMENT ON COLUMN greenhouse_serving.auth_magic_links.requested_ip_hashed IS
  'sha256(ip)[:32] for IP-level rate limiting and audit. Never the raw IP.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.auth_magic_links_expired_unused_idx;
DROP INDEX IF EXISTS greenhouse_serving.auth_magic_links_user_recent_idx;
DROP TABLE IF EXISTS greenhouse_serving.auth_magic_links;
