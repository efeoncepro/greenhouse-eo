-- Up Migration
-- TASK-671: cache the Bot Framework conversation reference returned by the
-- first successful Connector send. Avoids walking the regional fallback list
-- (`/teams` → `/amer` → `/emea` → `/apac`) on every subsequent send for the
-- same target. Region drift is rare; when it happens we invalidate the row
-- and re-discover.

CREATE TABLE IF NOT EXISTS greenhouse_core.teams_bot_conversation_references (
  reference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable lookup key. For channel sends: 'channel:<teamId>:<channelId>'.
  -- For chat_1on1: 'user:<aadObjectId>'. For chat_group: 'chat:<chatId>'.
  reference_key text NOT NULL,
  bot_app_id text NOT NULL,
  azure_tenant_id text NOT NULL,
  -- Connector serviceUrl that succeeded (e.g. https://smba.trafficmanager.net/teams).
  service_url text NOT NULL,
  -- Conversation id returned by the Connector (`{channelId};messageid=…` for
  -- channels, the chat id for chats). NULL until the first successful send.
  conversation_id text NULL,
  last_used_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_success_at timestamptz NULL,
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_at timestamptz NULL,
  last_failure_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT teams_bot_conversation_references_unique UNIQUE (bot_app_id, reference_key)
);

CREATE INDEX IF NOT EXISTS idx_teams_bot_conv_refs_last_used
  ON greenhouse_core.teams_bot_conversation_references (last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_bot_conv_refs_failure_count
  ON greenhouse_core.teams_bot_conversation_references (failure_count DESC)
  WHERE failure_count > 0;

COMMENT ON TABLE greenhouse_core.teams_bot_conversation_references IS
  'TASK-671: per-target cache of the Bot Framework conversation reference (serviceUrl + conversation id). Hot-path optimization for the connector dispatcher. failure_count drives the in-memory circuit breaker.';

COMMENT ON COLUMN greenhouse_core.teams_bot_conversation_references.reference_key IS
  'Stable lookup key. ''channel:<teamId>:<channelId>'' | ''user:<aadObjectId>'' | ''chat:<chatId>''. Unique per bot_app_id.';

COMMENT ON COLUMN greenhouse_core.teams_bot_conversation_references.service_url IS
  'Bot Framework serviceUrl that has worked at least once for this target. Region drift is rare; on persistent failure we mark failure_count high and the dispatcher re-discovers via the candidate list.';

COMMENT ON COLUMN greenhouse_core.teams_bot_conversation_references.last_failure_reason IS
  'Redacted summary of the last failure (no tokens, no stacks). For ops dashboards only.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.teams_bot_conversation_references;
