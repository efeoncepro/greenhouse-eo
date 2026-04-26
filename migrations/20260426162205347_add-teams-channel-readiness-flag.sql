-- Up Migration
--
-- Teams channel readiness flag.
-- ===============================
--
-- Channels in `greenhouse_core.teams_notification_channels` declare their
-- secret in `secret_ref` (e.g. `greenhouse-teams-finance-alerts-webhook`)
-- but the actual secret value lives in GCP Secret Manager. Historically,
-- if the secret wasn't provisioned, the sender failed at runtime with
-- `missing_secret: secret_ref=…` and the failure was counted in
-- `source_sync_runs WHERE status='failed'` — surfacing as a Teams
-- Notifications subsystem warning in the reliability dashboard.
--
-- That collapses two distinct states into one:
--   1. Channel is fully provisioned but the send failed (real incident).
--   2. Channel is configured in PG but the operator hasn't yet provisioned
--      the secret in Secret Manager (pending setup, not an incident).
--
-- This migration adds a `provisioning_status` field with three values:
--   - `'ready'`         (default): secret is provisioned and the channel is operational.
--   - `'pending_setup'` : channel row exists in PG but the secret is missing
--                         in Secret Manager. Sends are skipped silently and
--                         the channel does NOT contribute to dashboard
--                         failure counters.
--   - `'configured_but_failing'` : secret was provisioned at some point but
--                                  the latest send failed (real incident).
--
-- The Cloud Run readiness check (in `services/ops-worker/server.ts` startup
-- and exposed via the admin endpoint) inspects each active channel,
-- attempts a `gcloud secrets describe` (or equivalent SDK call), and
-- updates `provisioning_status` accordingly. The dashboard query for
-- "Teams Notifications failed" filters `WHERE provisioning_status <> 'pending_setup'`.

ALTER TABLE greenhouse_core.teams_notification_channels
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (provisioning_status IN ('ready', 'pending_setup', 'configured_but_failing')),
  ADD COLUMN IF NOT EXISTS provisioning_status_updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS provisioning_status_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_channels_provisioning_status
  ON greenhouse_core.teams_notification_channels (provisioning_status)
  WHERE disabled_at IS NULL;

COMMENT ON COLUMN greenhouse_core.teams_notification_channels.provisioning_status IS
'Lifecycle of the channel''s secret provisioning. `pending_setup` means the '
'channel row exists in PG but the GCP Secret Manager secret named by '
'`secret_ref` is missing — sends are skipped silently and the channel does '
'NOT count against the Teams Notifications dashboard failure metric. '
'Updated by the readiness check at ops-worker startup and after each send.';

-- Backfill: known-missing secrets from the 2026-04-26 incident.
-- Marking them `pending_setup` removes the noise from the reliability
-- dashboard until the operator provisions them in Secret Manager.
UPDATE greenhouse_core.teams_notification_channels
   SET provisioning_status = 'pending_setup',
       provisioning_status_updated_at = NOW(),
       provisioning_status_reason = 'backfill_2026_04_26:secret_missing_in_gcp_secret_manager'
 WHERE secret_ref = 'greenhouse-teams-finance-alerts-webhook'
   AND provisioning_status = 'ready';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_teams_channels_provisioning_status;

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP COLUMN IF EXISTS provisioning_status,
  DROP COLUMN IF EXISTS provisioning_status_updated_at,
  DROP COLUMN IF EXISTS provisioning_status_reason;
