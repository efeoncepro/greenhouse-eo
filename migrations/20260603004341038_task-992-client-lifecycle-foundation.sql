-- Up Migration
--
-- TASK-992 — Client Lifecycle Orchestrator (onboarding) foundation.
-- Implements GREENHOUSE_CLIENT_LIFECYCLE_V1 §5-§6 (onboarding scope of V1.0):
--   - client_lifecycle_cases            (aggregate, state machine)
--   - client_lifecycle_case_events      (append-only audit log)
--   - client_lifecycle_checklist_templates (declarative, versioned, append-only)
--   - client_lifecycle_checklist_items  (materialized snapshot per case)
-- Mirrors the battle-tested TASK-760 work_relationship_offboarding_cases pattern.
--
-- Schema notes vs the V1 contract DDL (reconciled against real PG schema 2026-06-03):
--   - organizations.organization_id is TEXT (not UUID) -> FK columns are TEXT.
--   - The canonical user table is greenhouse_core.client_users(user_id);
--     greenhouse_core.users does not exist (TASK-760 precedent).
--   - template_code on cases/items is a SNAPSHOT column (templates use a composite
--     PK (template_code, item_code), so a column FK is not PG-valid). Integrity is
--     enforced by the command (only materializes from active template rows) plus the
--     reliability signal client.lifecycle.case_without_template.

-- 1. Checklist templates (declarative, append-only, versioned via effective_from/to)
CREATE TABLE IF NOT EXISTS greenhouse_core.client_lifecycle_checklist_templates (
  template_code     TEXT NOT NULL,
  case_kind         TEXT NOT NULL CHECK (case_kind IN ('onboarding','offboarding','reactivation')),
  item_code         TEXT NOT NULL,
  item_label        TEXT NOT NULL,
  item_description  TEXT,
  required          BOOLEAN NOT NULL DEFAULT TRUE,
  default_order     INTEGER NOT NULL,
  owner_role        TEXT NOT NULL
                    CHECK (owner_role IN ('commercial','finance','operations','hr','identity','it')),
  blocks_completion BOOLEAN NOT NULL DEFAULT TRUE,
  requires_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to      DATE,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (template_code, item_code)
);

CREATE INDEX IF NOT EXISTS client_lifecycle_templates_active
  ON greenhouse_core.client_lifecycle_checklist_templates (template_code, default_order)
  WHERE effective_to IS NULL;

-- 2. Cases (aggregate root + state machine)
CREATE TABLE IF NOT EXISTS greenhouse_core.client_lifecycle_cases (
  case_id              TEXT PRIMARY KEY,
  organization_id      TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  client_id            TEXT REFERENCES greenhouse_core.clients(client_id),
  case_kind            TEXT NOT NULL
                       CHECK (case_kind IN ('onboarding','offboarding','reactivation')),
  status               TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','in_progress','blocked','completed','cancelled')),

  trigger_source       TEXT NOT NULL
                       CHECK (trigger_source IN ('hubspot_deal','manual','renewal','churn_signal','migration','adopt')),
  triggered_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  reason               TEXT,
  effective_date       DATE NOT NULL,
  target_completion_date DATE,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,

  blocked_reason_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  previous_case_id     TEXT REFERENCES greenhouse_core.client_lifecycle_cases(case_id),
  metadata_json        JSONB NOT NULL DEFAULT '{}'::jsonb,

  template_code        TEXT NOT NULL,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT client_lifecycle_cases_offboarding_reason_check
    CHECK (case_kind <> 'offboarding' OR (reason IS NOT NULL AND length(reason) >= 10)),
  CONSTRAINT client_lifecycle_cases_reactivation_lineage_check
    CHECK (case_kind <> 'reactivation' OR previous_case_id IS NOT NULL),
  CONSTRAINT client_lifecycle_cases_terminal_timestamp_check
    CHECK (status NOT IN ('completed','cancelled') OR completed_at IS NOT NULL OR cancelled_at IS NOT NULL),
  CONSTRAINT client_lifecycle_cases_completion_timestamp_check
    CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CONSTRAINT client_lifecycle_cases_cancellation_timestamp_check
    CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT client_lifecycle_cases_effective_window_check
    CHECK (effective_date <= COALESCE(target_completion_date, effective_date + INTERVAL '365 days'))
);

-- Only one active case per (organization_id, case_kind)
CREATE UNIQUE INDEX IF NOT EXISTS client_lifecycle_cases_one_active_per_kind
  ON greenhouse_core.client_lifecycle_cases (organization_id, case_kind)
  WHERE status NOT IN ('completed','cancelled');

CREATE INDEX IF NOT EXISTS client_lifecycle_cases_status_kind
  ON greenhouse_core.client_lifecycle_cases (status, case_kind)
  WHERE status NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS client_lifecycle_cases_client_id
  ON greenhouse_core.client_lifecycle_cases (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS client_lifecycle_cases_organization_id
  ON greenhouse_core.client_lifecycle_cases (organization_id);
CREATE INDEX IF NOT EXISTS client_lifecycle_cases_target_completion
  ON greenhouse_core.client_lifecycle_cases (target_completion_date) WHERE status NOT IN ('completed','cancelled');

-- 3. Case events (append-only audit log)
CREATE TABLE IF NOT EXISTS greenhouse_core.client_lifecycle_case_events (
  event_id          TEXT PRIMARY KEY,
  case_id           TEXT NOT NULL REFERENCES greenhouse_core.client_lifecycle_cases(case_id) ON DELETE CASCADE,
  event_kind        TEXT NOT NULL,
  from_status       TEXT,
  to_status         TEXT,
  payload_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id     TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_lifecycle_case_events_case_id
  ON greenhouse_core.client_lifecycle_case_events (case_id, occurred_at DESC);

-- 4. Checklist items (materialized snapshot at case open)
CREATE TABLE IF NOT EXISTS greenhouse_core.client_lifecycle_checklist_items (
  item_id            TEXT PRIMARY KEY,
  case_id            TEXT NOT NULL REFERENCES greenhouse_core.client_lifecycle_cases(case_id) ON DELETE CASCADE,
  template_code      TEXT NOT NULL,
  item_code          TEXT NOT NULL,
  item_label         TEXT NOT NULL,
  required           BOOLEAN NOT NULL,
  blocks_completion  BOOLEAN NOT NULL,
  requires_evidence  BOOLEAN NOT NULL,
  owner_role         TEXT NOT NULL,
  display_order      INTEGER NOT NULL,

  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed','skipped','blocked','not_applicable')),

  evidence_asset_id  TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  notes              TEXT,
  completed_at       TIMESTAMPTZ,
  completed_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  blocked_reason     TEXT,
  metadata_json      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT client_lifecycle_items_completion_timestamp_check
    CHECK (status NOT IN ('completed','skipped') OR completed_at IS NOT NULL),
  CONSTRAINT client_lifecycle_items_evidence_required_check
    CHECK (status <> 'completed' OR (NOT requires_evidence) OR evidence_asset_id IS NOT NULL),
  CONSTRAINT client_lifecycle_items_blocked_reason_check
    CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL),
  CONSTRAINT client_lifecycle_items_unique_per_case UNIQUE (case_id, item_code)
);

CREATE INDEX IF NOT EXISTS client_lifecycle_items_case_id
  ON greenhouse_core.client_lifecycle_checklist_items (case_id, display_order);
CREATE INDEX IF NOT EXISTS client_lifecycle_items_pending
  ON greenhouse_core.client_lifecycle_checklist_items (case_id)
  WHERE status NOT IN ('completed','skipped','not_applicable');

-- 5. updated_at maintenance triggers
CREATE OR REPLACE FUNCTION greenhouse_core.touch_client_lifecycle_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_lifecycle_cases_touch_updated_at ON greenhouse_core.client_lifecycle_cases;
CREATE TRIGGER trg_client_lifecycle_cases_touch_updated_at
  BEFORE UPDATE ON greenhouse_core.client_lifecycle_cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.touch_client_lifecycle_cases_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_core.touch_client_lifecycle_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_lifecycle_items_touch_updated_at ON greenhouse_core.client_lifecycle_checklist_items;
CREATE TRIGGER trg_client_lifecycle_items_touch_updated_at
  BEFORE UPDATE ON greenhouse_core.client_lifecycle_checklist_items
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.touch_client_lifecycle_items_updated_at();

-- 6. Append-only triggers for the audit log (anti-UPDATE / anti-DELETE)
CREATE OR REPLACE FUNCTION greenhouse_core.client_lifecycle_case_events_no_mutate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'client_lifecycle_case_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_update_on_client_lifecycle_case_events ON greenhouse_core.client_lifecycle_case_events;
CREATE TRIGGER prevent_update_on_client_lifecycle_case_events
  BEFORE UPDATE ON greenhouse_core.client_lifecycle_case_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.client_lifecycle_case_events_no_mutate();

DROP TRIGGER IF EXISTS prevent_delete_on_client_lifecycle_case_events ON greenhouse_core.client_lifecycle_case_events;
CREATE TRIGGER prevent_delete_on_client_lifecycle_case_events
  BEFORE DELETE ON greenhouse_core.client_lifecycle_case_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.client_lifecycle_case_events_no_mutate();

-- 7. Case status transition guard (state machine matrix §6.3 + completed gate)
--    Defense-in-depth layer 1; the TS state machine is the primary enforcement.
--    completed requires all required+blocking items resolved unless the session
--    explicitly authorizes a blocker override (SET LOCAL app.client_lifecycle_blocker_override = 'true').
CREATE OR REPLACE FUNCTION greenhouse_core.client_lifecycle_case_transition_check()
RETURNS TRIGGER AS $$
DECLARE
  pending_required INTEGER;
  override_authorized BOOLEAN;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allowed transition matrix (GREENHOUSE_CLIENT_LIFECYCLE_V1 §6.3)
  IF NOT (
    (OLD.status = 'draft'       AND NEW.status IN ('in_progress','cancelled')) OR
    (OLD.status = 'in_progress' AND NEW.status IN ('blocked','completed','cancelled')) OR
    (OLD.status = 'blocked'     AND NEW.status IN ('in_progress','completed','cancelled')) OR
    (OLD.status = 'completed'   AND FALSE) OR
    (OLD.status = 'cancelled'   AND FALSE)
  ) THEN
    RAISE EXCEPTION 'Invalid client_lifecycle_case transition: % -> %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'completed' THEN
    override_authorized := COALESCE(current_setting('app.client_lifecycle_blocker_override', true), 'false') = 'true';

    IF NOT override_authorized THEN
      SELECT COUNT(*) INTO pending_required
      FROM greenhouse_core.client_lifecycle_checklist_items i
      WHERE i.case_id = NEW.case_id
        AND i.required = TRUE
        AND i.blocks_completion = TRUE
        AND i.status NOT IN ('completed','skipped','not_applicable');

      IF pending_required > 0 THEN
        RAISE EXCEPTION 'Cannot complete client_lifecycle_case %: % required blocking item(s) still pending', NEW.case_id, pending_required;
      END IF;

      IF array_length(NEW.blocked_reason_codes, 1) > 0 THEN
        RAISE EXCEPTION 'Cannot complete client_lifecycle_case %: blocked_reason_codes not empty without override', NEW.case_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_lifecycle_case_transition_check ON greenhouse_core.client_lifecycle_cases;
CREATE TRIGGER trg_client_lifecycle_case_transition_check
  BEFORE UPDATE OF status ON greenhouse_core.client_lifecycle_cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.client_lifecycle_case_transition_check();

-- 8. Seed standard_onboarding_v1 (GREENHOUSE_CLIENT_LIFECYCLE_V1 §5.5, 10 items, verbatim)
INSERT INTO greenhouse_core.client_lifecycle_checklist_templates
  (template_code, case_kind, item_code, item_label, item_description, required, default_order, owner_role, blocks_completion, requires_evidence)
VALUES
  ('standard_onboarding_v1','onboarding','verify_hubspot_company_synced','Verificar company HubSpot sincronizada en Greenhouse',NULL,TRUE,1,'commercial',TRUE,FALSE),
  ('standard_onboarding_v1','onboarding','confirm_legal_documents','Confirmar firma de contrato/MSA',NULL,TRUE,2,'commercial',TRUE,TRUE),
  ('standard_onboarding_v1','onboarding','declare_engagement_kind','Declarar engagement_kind del servicio (regular/pilot/trial/poc/discovery)',NULL,TRUE,3,'commercial',TRUE,FALSE),
  ('standard_onboarding_v1','onboarding','declare_commercial_terms','Declarar engagement_commercial_terms activos',NULL,TRUE,4,'commercial',TRUE,FALSE),
  ('standard_onboarding_v1','onboarding','declare_engagement_phases','Declarar fases del engagement (kickoff/operation/reporting/decision)',NULL,TRUE,5,'commercial',TRUE,FALSE),
  ('standard_onboarding_v1','onboarding','assign_team_members','Asignar miembros vía client_team_assignments con FTE',NULL,TRUE,6,'operations',TRUE,FALSE),
  ('standard_onboarding_v1','onboarding','provision_notion_workspace','Provisionar workspace Notion para el cliente',NULL,FALSE,7,'operations',FALSE,TRUE),
  ('standard_onboarding_v1','onboarding','provision_communication_channels','Configurar Teams channel + email subscriptions',NULL,FALSE,8,'operations',FALSE,FALSE),
  ('standard_onboarding_v1','onboarding','provision_client_users_access','Provisionar acceso al portal cliente (si aplica)',NULL,FALSE,9,'identity',FALSE,FALSE),
  ('standard_onboarding_v1','onboarding','confirm_billing_setup','Confirmar setup de facturación (Nubox + payment terms)',NULL,TRUE,10,'finance',TRUE,FALSE)
ON CONFLICT (template_code, item_code) DO NOTHING;

-- 9. Ownership + grants (canonical owner greenhouse_ops; runtime read/write)
ALTER TABLE greenhouse_core.client_lifecycle_cases OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_lifecycle_case_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_lifecycle_checklist_templates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_lifecycle_checklist_items OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.touch_client_lifecycle_cases_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.touch_client_lifecycle_items_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.client_lifecycle_case_events_no_mutate() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.client_lifecycle_case_transition_check() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_cases TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_case_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_templates TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_items TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_cases TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_case_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_templates TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_items TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_cases TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_case_events TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_templates TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.client_lifecycle_checklist_items TO greenhouse_migrator;

-- 10. Anti pre-up-marker verification (aborts if DDL/seed did not land)
DO $$
DECLARE
  table_count INTEGER;
  template_items INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_core'
    AND table_name IN (
      'client_lifecycle_cases','client_lifecycle_case_events',
      'client_lifecycle_checklist_templates','client_lifecycle_checklist_items'
    );
  IF table_count <> 4 THEN
    RAISE EXCEPTION 'TASK-992: expected 4 client_lifecycle tables, got %. Migration markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO template_items
  FROM greenhouse_core.client_lifecycle_checklist_templates
  WHERE template_code = 'standard_onboarding_v1';
  IF template_items <> 10 THEN
    RAISE EXCEPTION 'TASK-992: expected 10 standard_onboarding_v1 template items, got %.', template_items;
  END IF;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'prevent_update_on_client_lifecycle_case_events',
    'prevent_delete_on_client_lifecycle_case_events',
    'trg_client_lifecycle_case_transition_check'
  );
  IF trigger_count <> 3 THEN
    RAISE EXCEPTION 'TASK-992: expected 3 governance triggers, got %.', trigger_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_client_lifecycle_case_transition_check ON greenhouse_core.client_lifecycle_cases;
DROP TRIGGER IF EXISTS prevent_delete_on_client_lifecycle_case_events ON greenhouse_core.client_lifecycle_case_events;
DROP TRIGGER IF EXISTS prevent_update_on_client_lifecycle_case_events ON greenhouse_core.client_lifecycle_case_events;
DROP TRIGGER IF EXISTS trg_client_lifecycle_items_touch_updated_at ON greenhouse_core.client_lifecycle_checklist_items;
DROP TRIGGER IF EXISTS trg_client_lifecycle_cases_touch_updated_at ON greenhouse_core.client_lifecycle_cases;

DROP TABLE IF EXISTS greenhouse_core.client_lifecycle_checklist_items;
DROP TABLE IF EXISTS greenhouse_core.client_lifecycle_case_events;
DROP TABLE IF EXISTS greenhouse_core.client_lifecycle_checklist_templates;
DROP TABLE IF EXISTS greenhouse_core.client_lifecycle_cases;

DROP FUNCTION IF EXISTS greenhouse_core.client_lifecycle_case_transition_check();
DROP FUNCTION IF EXISTS greenhouse_core.client_lifecycle_case_events_no_mutate();
DROP FUNCTION IF EXISTS greenhouse_core.touch_client_lifecycle_items_updated_at();
DROP FUNCTION IF EXISTS greenhouse_core.touch_client_lifecycle_cases_updated_at();
