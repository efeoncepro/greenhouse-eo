-- Up Migration

-- TASK-805 — Engagement Progress Snapshots Weekly Cadence.
-- ============================================================================
-- Capa 6 de EPIC-014. Persiste snapshots semanales de progreso para services
-- non-regular (Sample Sprints). Ajustes de discovery:
--   1. service_id usa TEXT (TASK-801: greenhouse_core.services.service_id es text).
--   2. recorded_by queda nullable en DB por ON DELETE SET NULL; helper lo exige.
--   3. metrics_json es flexible en V1, pero debe ser objeto JSONB no vacio.
--   4. La tabla es append-only: correcciones posteriores viven en audit/outbox
--      de TASK-808 o en una fila de otro snapshot_date, no por UPDATE/DELETE.

CREATE TABLE greenhouse_commercial.engagement_progress_snapshots (
  snapshot_id text PRIMARY KEY DEFAULT ('engagement-progress-snapshot-' || gen_random_uuid()::text),
  service_id text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  metrics_json jsonb NOT NULL,
  qualitative_notes text,
  recorded_by text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_progress_snapshots_service_date_unique
    UNIQUE (service_id, snapshot_date),
  CONSTRAINT engagement_progress_snapshots_metrics_object_check
    CHECK (
      jsonb_typeof(metrics_json) = 'object'
      AND metrics_json <> '{}'::jsonb
    ),
  CONSTRAINT engagement_progress_snapshots_notes_shape_check
    CHECK (
      qualitative_notes IS NULL
      OR length(btrim(qualitative_notes)) >= 3
    )
);

CREATE INDEX engagement_progress_service_date_idx
  ON greenhouse_commercial.engagement_progress_snapshots (service_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_progress_snapshots_assert_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'engagement_progress_snapshots is append-only. Insert a new dated snapshot instead of %.', TG_OP
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_progress_snapshots_no_update_trigger
  BEFORE UPDATE ON greenhouse_commercial.engagement_progress_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_progress_snapshots_assert_append_only();

CREATE TRIGGER engagement_progress_snapshots_no_delete_trigger
  BEFORE DELETE ON greenhouse_commercial.engagement_progress_snapshots
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_progress_snapshots_assert_append_only();

COMMENT ON TABLE greenhouse_commercial.engagement_progress_snapshots IS
  'TASK-805. Weekly progress snapshots for non-regular engagement services; append-only forensic trail.';

COMMENT ON COLUMN greenhouse_commercial.engagement_progress_snapshots.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by TASK-801 contract, not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_progress_snapshots.metrics_json IS
  'Schema-flexible V1 progress metrics. Must be a non-empty JSON object; templates by engagement_kind are V2.';

COMMENT ON COLUMN greenhouse_commercial.engagement_progress_snapshots.recorded_by IS
  'Actor who recorded the snapshot. Nullable at DB level to preserve history if client_users row is deleted; helper requires input.';

GRANT SELECT, INSERT ON TABLE greenhouse_commercial.engagement_progress_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT ON TABLE greenhouse_commercial.engagement_progress_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE greenhouse_commercial.engagement_progress_snapshots TO greenhouse_migrator;

-- Down Migration

REVOKE SELECT, INSERT ON TABLE greenhouse_commercial.engagement_progress_snapshots FROM greenhouse_runtime;
REVOKE SELECT, INSERT ON TABLE greenhouse_commercial.engagement_progress_snapshots FROM greenhouse_app;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE greenhouse_commercial.engagement_progress_snapshots FROM greenhouse_migrator;

DROP TRIGGER IF EXISTS engagement_progress_snapshots_no_delete_trigger
  ON greenhouse_commercial.engagement_progress_snapshots;
DROP TRIGGER IF EXISTS engagement_progress_snapshots_no_update_trigger
  ON greenhouse_commercial.engagement_progress_snapshots;
DROP FUNCTION IF EXISTS greenhouse_commercial.engagement_progress_snapshots_assert_append_only();

DROP INDEX IF EXISTS greenhouse_commercial.engagement_progress_service_date_idx;
DROP TABLE IF EXISTS greenhouse_commercial.engagement_progress_snapshots;
