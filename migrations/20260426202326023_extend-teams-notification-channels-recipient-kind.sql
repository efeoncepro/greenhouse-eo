-- Up Migration
-- TASK-671: extend teams_notification_channels with recipient discriminator so a single
-- channel_kind='teams_bot' row can target a Teams channel, a static 1:1 chat, a fixed
-- group chat, or dynamically resolve a Microsoft Graph user from the event payload.

ALTER TABLE greenhouse_core.teams_notification_channels
  ADD COLUMN IF NOT EXISTS recipient_kind text NOT NULL DEFAULT 'channel',
  ADD COLUMN IF NOT EXISTS recipient_user_id text NULL,
  ADD COLUMN IF NOT EXISTS recipient_chat_id text NULL,
  ADD COLUMN IF NOT EXISTS recipient_routing_rule_json jsonb NULL;

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_recipient_kind_check;

ALTER TABLE greenhouse_core.teams_notification_channels
  ADD CONSTRAINT teams_notification_channels_recipient_kind_check
  CHECK (recipient_kind IN ('channel','chat_1on1','chat_group','dynamic_user'));

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_recipient_consistency_check;

-- The recipient consistency constraint only applies to bot-driven transports
-- (teams_bot / graph_rsc). Legacy azure_logic_app rows route via secret_ref webhook URL
-- and do not need team_id/channel_id at the row level.
ALTER TABLE greenhouse_core.teams_notification_channels
  ADD CONSTRAINT teams_notification_channels_recipient_consistency_check
  CHECK (
    channel_kind = 'azure_logic_app'
    OR (recipient_kind = 'channel'      AND team_id IS NOT NULL AND channel_id IS NOT NULL)
    OR (recipient_kind = 'chat_1on1'    AND recipient_user_id IS NOT NULL)
    OR (recipient_kind = 'chat_group'   AND recipient_chat_id IS NOT NULL)
    OR (recipient_kind = 'dynamic_user' AND recipient_routing_rule_json IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_teams_channels_recipient_kind
  ON greenhouse_core.teams_notification_channels (recipient_kind)
  WHERE disabled_at IS NULL;

COMMENT ON COLUMN greenhouse_core.teams_notification_channels.recipient_kind IS
  'TASK-671: surface for the bot transport. channel = post to teams channel; chat_1on1 = static DM; chat_group = static group chat; dynamic_user = resolve member at runtime from event payload.';

COMMENT ON COLUMN greenhouse_core.teams_notification_channels.recipient_user_id IS
  'Microsoft Graph user id (aadObjectId) for static recipient_kind=chat_1on1 rows.';

COMMENT ON COLUMN greenhouse_core.teams_notification_channels.recipient_chat_id IS
  'Microsoft Graph chat id for static recipient_kind=chat_group rows.';

COMMENT ON COLUMN greenhouse_core.teams_notification_channels.recipient_routing_rule_json IS
  'Mapping rule for recipient_kind=dynamic_user. Shape: {"from":"payload.<dot.path.to.member_id>"}. The sender extracts a member_id from the event payload and resolves it via resolveTeamsUserForMember(memberId).';

-- Down Migration

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_recipient_consistency_check;

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_recipient_kind_check;

DROP INDEX IF EXISTS greenhouse_core.idx_teams_channels_recipient_kind;

ALTER TABLE greenhouse_core.teams_notification_channels
  DROP COLUMN IF EXISTS recipient_routing_rule_json,
  DROP COLUMN IF EXISTS recipient_chat_id,
  DROP COLUMN IF EXISTS recipient_user_id,
  DROP COLUMN IF EXISTS recipient_kind;
