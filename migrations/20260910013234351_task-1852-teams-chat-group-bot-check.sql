-- Up Migration

-- TASK-1852: `teams_notification_channels_kind_bot_check` (TASK-669) predates recipient kinds
-- (TASK-671) and still demands team_id + channel_id for EVERY teams_bot row, which makes a
-- persisted `recipient_kind='chat_group'` (static group chat) impossible even though the
-- dispatcher supports it and `teams_notification_channels_recipient_consistency_check` already
-- governs which target columns each recipient kind requires. Relax the legacy check to the
-- bot identity only; the recipient consistency check keeps owning team/channel/chat/user targets.
ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_kind_bot_check;

ALTER TABLE greenhouse_core.teams_notification_channels
  ADD CONSTRAINT teams_notification_channels_kind_bot_check CHECK (
    channel_kind NOT IN ('teams_bot', 'graph_rsc')
    OR (bot_app_id IS NOT NULL AND azure_tenant_id IS NOT NULL)
  );

-- Anti pre-up-marker guard: the relaxed definition must be the one persisted.
DO $$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition
    FROM pg_constraint
   WHERE conrelid = 'greenhouse_core.teams_notification_channels'::regclass
     AND conname = 'teams_notification_channels_kind_bot_check';

  IF definition IS NULL OR definition LIKE '%team_id IS NOT NULL%' THEN
    RAISE EXCEPTION 'TASK-1852 anti pre-up-marker check: teams_notification_channels_kind_bot_check was not relaxed (definition: %)', COALESCE(definition, '<missing>');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_core.teams_notification_channels'::regclass
       AND conname = 'teams_notification_channels_recipient_consistency_check'
  ) THEN
    RAISE EXCEPTION 'TASK-1852: recipient consistency check is missing; refusing to relax the bot check without it.';
  END IF;
END
$$;

-- Down Migration

-- Restores the TASK-669 definition. Fails if a chat_group/chat_1on1/dynamic_user teams_bot row exists;
-- disable or delete those rows first (they are the reason this migration exists).
ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_kind_bot_check;

ALTER TABLE greenhouse_core.teams_notification_channels
  ADD CONSTRAINT teams_notification_channels_kind_bot_check CHECK (
    channel_kind NOT IN ('teams_bot', 'graph_rsc')
    OR (bot_app_id IS NOT NULL AND team_id IS NOT NULL AND channel_id IS NOT NULL AND azure_tenant_id IS NOT NULL)
  );
