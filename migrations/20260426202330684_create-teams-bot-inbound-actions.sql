-- Up Migration
-- TASK-671: persist every Action.Submit received from the Bot Framework so handler
-- execution is idempotent (the bot will retry on transient errors) and so we have an
-- audit trail of who clicked what and when.

CREATE TABLE IF NOT EXISTS greenhouse_core.teams_bot_inbound_actions (
  inbound_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bot_app_id text NOT NULL,
  azure_tenant_id text NOT NULL,
  from_aad_object_id text NOT NULL,
  conversation_id text NOT NULL,
  activity_id text NOT NULL,
  action_id text NOT NULL,
  action_data_json jsonb,
  idempotency_key text NOT NULL,
  handler_status text NOT NULL DEFAULT 'pending',
  handler_started_at timestamptz NULL,
  handler_finished_at timestamptz NULL,
  handler_error_summary text NULL,
  resolved_user_id text NULL,
  resolved_member_id text NULL,
  CONSTRAINT teams_bot_inbound_actions_handler_status_check
    CHECK (handler_status IN (
      'pending',
      'succeeded',
      'failed',
      'rejected_unauthorized',
      'rejected_unknown_action',
      'rejected_disabled_action'
    )),
  CONSTRAINT teams_bot_inbound_actions_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_teams_bot_inbound_actions_received_at
  ON greenhouse_core.teams_bot_inbound_actions (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_bot_inbound_actions_handler_status
  ON greenhouse_core.teams_bot_inbound_actions (handler_status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_bot_inbound_actions_resolved_user
  ON greenhouse_core.teams_bot_inbound_actions (resolved_user_id, received_at DESC)
  WHERE resolved_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_bot_inbound_actions_action_id
  ON greenhouse_core.teams_bot_inbound_actions (action_id, received_at DESC);

COMMENT ON TABLE greenhouse_core.teams_bot_inbound_actions IS
  'TASK-671: audit + idempotency log for Action.Submit invocations from the Greenhouse Teams bot. One row per (activity_id, action_id, from_aad_object_id) tuple via idempotency_key. handler_status drives reliability dashboard signals.';

COMMENT ON COLUMN greenhouse_core.teams_bot_inbound_actions.idempotency_key IS
  'Stable hash sha256(activity_id|action_id|from_aad_object_id). Bot Framework may retry; the unique constraint blocks double-execution.';

COMMENT ON COLUMN greenhouse_core.teams_bot_inbound_actions.handler_error_summary IS
  'Redacted error description (no tokens, no PII) suitable for the reliability dashboard.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.teams_bot_inbound_actions;
