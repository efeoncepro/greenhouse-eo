-- Make the reactive log projection-aware so one successful projection does not
-- suppress the rest of the handlers for the same outbox event.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'greenhouse_sync'
      AND table_name = 'outbox_reactive_log'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE greenhouse_sync.outbox_reactive_log DROP CONSTRAINT outbox_reactive_log_pkey;
  END IF;
END $$;

ALTER TABLE greenhouse_sync.outbox_reactive_log
  ALTER COLUMN event_id SET NOT NULL,
  ALTER COLUMN handler SET NOT NULL;

ALTER TABLE greenhouse_sync.outbox_reactive_log
  ADD PRIMARY KEY (event_id, handler);

