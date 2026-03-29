-- Ensure projection refresh deduplication works for the persistent queue.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'greenhouse_sync'
      AND table_name = 'projection_refresh_queue'
      AND constraint_name = 'projection_refresh_queue_projection_entity_unique'
  ) THEN
    ALTER TABLE greenhouse_sync.projection_refresh_queue
      ADD CONSTRAINT projection_refresh_queue_projection_entity_unique
      UNIQUE (projection_name, entity_type, entity_id);
  END IF;
END $$;

