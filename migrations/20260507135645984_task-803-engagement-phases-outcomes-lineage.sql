-- Up Migration

-- TASK-803 — Engagement Phases + Outcomes + Lineage
-- ============================================================================
-- Capa 3 de EPIC-014. Persiste fases declarativas, outcome terminal y grafo
-- de lineage para services/engagements. Ajustes de discovery:
--   1. Todos los FKs a services usan TEXT (TASK-801: services.service_id es text).
--   2. report_asset_id y next_quotation_id usan TEXT porque assets/quotations
--      también son text en el runtime real.
--   3. Outcomes son append-only por hard rule arquitectónica, reforzado con
--      triggers BEFORE UPDATE/DELETE en DB.
--   4. TASK-813 excluye services legacy_seed_archived/unmapped en helpers; la DB
--      mantiene FKs genéricas para preservar integridad sin acoplarse a estado vivo.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.engagement_phases (
  phase_id          text PRIMARY KEY DEFAULT ('engagement-phase-' || gen_random_uuid()::text),
  service_id        text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  phase_name        text NOT NULL CHECK (length(btrim(phase_name)) >= 2),
  phase_kind        text NOT NULL CHECK (phase_kind = ANY (ARRAY[
    'kickoff'::text,
    'operation'::text,
    'reporting'::text,
    'decision'::text,
    'custom'::text
  ])),
  phase_order       integer NOT NULL CHECK (phase_order > 0),
  start_date        date NOT NULL,
  end_date          date,
  status            text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending'::text,
    'in_progress'::text,
    'completed'::text,
    'skipped'::text
  ])),
  deliverables_json jsonb,
  completed_at      timestamptz,
  completed_by      text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_phases_date_range_check
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT engagement_phases_completion_state_check
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL)
      OR (status <> 'completed' AND completed_at IS NULL)
    ),
  CONSTRAINT engagement_phases_completed_by_check
    CHECK (completed_by IS NULL OR status = 'completed'),
  UNIQUE (service_id, phase_order)
);

CREATE INDEX IF NOT EXISTS engagement_phases_service_status_idx
  ON greenhouse_commercial.engagement_phases (service_id, status, phase_order);

CREATE INDEX IF NOT EXISTS engagement_phases_service_timeline_idx
  ON greenhouse_commercial.engagement_phases (service_id, start_date, phase_order);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.engagement_outcomes (
  outcome_id           text PRIMARY KEY DEFAULT ('engagement-outcome-' || gen_random_uuid()::text),
  service_id           text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  outcome_kind         text NOT NULL CHECK (outcome_kind = ANY (ARRAY[
    'converted'::text,
    'adjusted'::text,
    'dropped'::text,
    'cancelled_by_client'::text,
    'cancelled_by_provider'::text
  ])),
  decision_date        date NOT NULL,
  report_asset_id      text
    REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  metrics_json         jsonb,
  decision_rationale   text NOT NULL CHECK (length(btrim(decision_rationale)) >= 10),
  cancellation_reason  text,
  next_service_id      text
    REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL,
  next_quotation_id    text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  decided_by           text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  decided_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_outcomes_service_unique UNIQUE (service_id),
  CONSTRAINT engagement_outcomes_cancellation_reason_check
    CHECK (
      outcome_kind NOT IN ('cancelled_by_client', 'cancelled_by_provider')
      OR (cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) >= 10)
    ),
  CONSTRAINT engagement_outcomes_non_cancellation_reason_check
    CHECK (
      outcome_kind IN ('cancelled_by_client', 'cancelled_by_provider')
      OR cancellation_reason IS NULL
    ),
  CONSTRAINT engagement_outcomes_conversion_target_check
    CHECK (
      outcome_kind <> 'converted'
      OR next_service_id IS NOT NULL
      OR next_quotation_id IS NOT NULL
    ),
  CONSTRAINT engagement_outcomes_next_service_not_self_check
    CHECK (next_service_id IS NULL OR next_service_id <> service_id)
);

CREATE INDEX IF NOT EXISTS engagement_outcomes_decision_idx
  ON greenhouse_commercial.engagement_outcomes (decision_date DESC, outcome_kind);

CREATE INDEX IF NOT EXISTS engagement_outcomes_next_service_idx
  ON greenhouse_commercial.engagement_outcomes (next_service_id)
  WHERE next_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS engagement_outcomes_next_quotation_idx
  ON greenhouse_commercial.engagement_outcomes (next_quotation_id)
  WHERE next_quotation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_outcomes_assert_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'engagement_outcomes is append-only. Insert a corrective outcome/audit record instead of %.', TG_OP
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS engagement_outcomes_no_update_trigger
  ON greenhouse_commercial.engagement_outcomes;

CREATE TRIGGER engagement_outcomes_no_update_trigger
  BEFORE UPDATE ON greenhouse_commercial.engagement_outcomes
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_outcomes_assert_append_only();

DROP TRIGGER IF EXISTS engagement_outcomes_no_delete_trigger
  ON greenhouse_commercial.engagement_outcomes;

CREATE TRIGGER engagement_outcomes_no_delete_trigger
  BEFORE DELETE ON greenhouse_commercial.engagement_outcomes
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_outcomes_assert_append_only();

CREATE TABLE IF NOT EXISTS greenhouse_commercial.engagement_lineage (
  lineage_id          text PRIMARY KEY DEFAULT ('engagement-lineage-' || gen_random_uuid()::text),
  parent_service_id   text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  child_service_id    text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  relationship_kind   text NOT NULL CHECK (relationship_kind = ANY (ARRAY[
    'converted_to'::text,
    'spawned_from'::text,
    'replaced_by'::text,
    'renewed_from'::text,
    'adjusted_into'::text
  ])),
  transition_date     date NOT NULL,
  transition_reason   text NOT NULL CHECK (length(btrim(transition_reason)) >= 10),
  recorded_by         text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_lineage_not_self_check
    CHECK (parent_service_id <> child_service_id),
  CONSTRAINT engagement_lineage_unique
    UNIQUE (parent_service_id, child_service_id, relationship_kind)
);

CREATE INDEX IF NOT EXISTS engagement_lineage_parent_idx
  ON greenhouse_commercial.engagement_lineage (parent_service_id);

CREATE INDEX IF NOT EXISTS engagement_lineage_child_idx
  ON greenhouse_commercial.engagement_lineage (child_service_id);

COMMENT ON TABLE greenhouse_commercial.engagement_phases IS
  'TASK-803. Declarative operational phases for engagement services. Reusable beyond Sample Sprints.';

COMMENT ON TABLE greenhouse_commercial.engagement_outcomes IS
  'TASK-803. Terminal engagement outcome. One row per service; append-only enforced by trigger.';

COMMENT ON TABLE greenhouse_commercial.engagement_lineage IS
  'TASK-803. Service lineage graph for conversions, replacements, renewals and adjusted follow-ons.';

COMMENT ON COLUMN greenhouse_commercial.engagement_phases.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by contract (TASK-801), not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_outcomes.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by contract (TASK-801), not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_outcomes.report_asset_id IS
  'Optional FK to canonical asset registry (greenhouse_core.assets.asset_id). TEXT by runtime contract.';

COMMENT ON COLUMN greenhouse_commercial.engagement_outcomes.next_quotation_id IS
  'Optional FK to the canonical quotation that prices the post-conversion service. TEXT by runtime contract.';

COMMENT ON COLUMN greenhouse_commercial.engagement_lineage.parent_service_id IS
  'Parent service in the engagement lineage graph. TEXT by services.service_id contract.';

COMMENT ON COLUMN greenhouse_commercial.engagement_lineage.child_service_id IS
  'Child service in the engagement lineage graph. TEXT by services.service_id contract.';

GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_phases TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_commercial.engagement_outcomes TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_commercial.engagement_lineage TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_phases TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_commercial.engagement_outcomes TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_commercial.engagement_lineage TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_phases TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_outcomes TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_lineage TO greenhouse_migrator;

-- Down Migration

REVOKE SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_phases FROM greenhouse_runtime;
REVOKE SELECT, INSERT ON greenhouse_commercial.engagement_outcomes FROM greenhouse_runtime;
REVOKE SELECT, INSERT ON greenhouse_commercial.engagement_lineage FROM greenhouse_runtime;

REVOKE SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_phases FROM greenhouse_app;
REVOKE SELECT, INSERT ON greenhouse_commercial.engagement_outcomes FROM greenhouse_app;
REVOKE SELECT, INSERT ON greenhouse_commercial.engagement_lineage FROM greenhouse_app;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_phases FROM greenhouse_migrator;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_outcomes FROM greenhouse_migrator;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_lineage FROM greenhouse_migrator;

DROP TRIGGER IF EXISTS engagement_outcomes_no_delete_trigger
  ON greenhouse_commercial.engagement_outcomes;
DROP TRIGGER IF EXISTS engagement_outcomes_no_update_trigger
  ON greenhouse_commercial.engagement_outcomes;
DROP FUNCTION IF EXISTS greenhouse_commercial.engagement_outcomes_assert_append_only();

DROP INDEX IF EXISTS greenhouse_commercial.engagement_lineage_child_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_lineage_parent_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_outcomes_next_quotation_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_outcomes_next_service_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_outcomes_decision_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_phases_service_timeline_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_phases_service_status_idx;

DROP TABLE IF EXISTS greenhouse_commercial.engagement_lineage;
DROP TABLE IF EXISTS greenhouse_commercial.engagement_outcomes;
DROP TABLE IF EXISTS greenhouse_commercial.engagement_phases;
