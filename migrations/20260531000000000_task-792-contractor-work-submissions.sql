-- Up Migration
--
-- TASK-792 — Contractor Work Submissions + Approval/Dispute Flow (Slice 1).
--
-- Evidencia de trabajo del contractor (timesheet, milestone, deliverable,
-- project_fee, expense, off_cycle_adjustment) con lifecycle de aprobación/
-- disputa/rechazo, ANTES de generar un payable (TASK-793). La aprobación
-- operacional NO es ejecución de pago.
--
-- Decisiones canónicas (CLAUDE.md TASK-792):
--   - FK NOT NULL a contractor_engagements (TASK-790) ON DELETE RESTRICT.
--   - State machine + CHECK + audit append-only trio (patrón TASK-700/765/790).
--   - D-792-1: la evidencia (assets) reusa el ledger TASK-791
--     `contractor_invoice_assets` vía nueva columna additiva
--     `contractor_work_submission_id` (FK). Delivery refs (project/sprint) viven
--     en metadata_json (refs canónicas, no texto libre).
--   - D-792-3: `consumed_by_payable_id` TEXT NULL forward-compat (TASK-793 setea
--     + agrega FK). Readiness = approved AND consumed IS NULL.
--   - Guardrail payroll: NUNCA alimenta payroll_entries/adjustments/compensation_versions.

CREATE SEQUENCE IF NOT EXISTS greenhouse_hr.seq_contractor_work_submission_public_id;

CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_work_submissions (
  contractor_work_submission_id  TEXT PRIMARY KEY,
  public_id                      TEXT NOT NULL UNIQUE,
  contractor_engagement_id       TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_engagements(contractor_engagement_id) ON DELETE RESTRICT,
  submission_type                TEXT NOT NULL
    CHECK (submission_type IN (
      'timesheet',
      'milestone',
      'deliverable',
      'project_fee',
      'expense',
      'off_cycle_adjustment'
    )),
  title                          TEXT,
  service_period_start           DATE,
  service_period_end             DATE,
  quantity                       NUMERIC(18,4)
    CHECK (quantity IS NULL OR quantity >= 0),
  unit                           TEXT
    CHECK (unit IS NULL OR unit IN ('hours', 'days', 'milestone', 'deliverable', 'fixed')),
  rate_amount_snapshot           NUMERIC(18,2)
    CHECK (rate_amount_snapshot IS NULL OR rate_amount_snapshot >= 0),
  gross_amount                   NUMERIC(18,2)
    CHECK (gross_amount IS NULL OR gross_amount >= 0),
  currency                       TEXT
    CHECK (currency IS NULL OR char_length(currency) = 3),
  status                         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'submitted',
      'approved',
      'disputed',
      'rejected',
      'cancelled'
    )),
  submitted_by_user_id           TEXT,
  submitted_at                   TIMESTAMPTZ,
  reviewed_by_user_id            TEXT,
  reviewed_at                    TIMESTAMPTZ,
  review_reason                  TEXT,
  -- Forward-compat: TASK-793 crea contractor_payables y agrega la FK.
  consumed_by_payable_id         TEXT,
  consumed_at                    TIMESTAMPTZ,
  metadata_json                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id             TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contractor_work_submissions_period_order
    CHECK (service_period_end IS NULL OR service_period_start IS NULL OR service_period_end >= service_period_start),
  -- Una submission aprobada (consumible por payable) DEBE tener monto bruto.
  CONSTRAINT contractor_work_submissions_approved_requires_gross
    CHECK (status <> 'approved' OR gross_amount IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_contractor_work_submissions_engagement
  ON greenhouse_hr.contractor_work_submissions (contractor_engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_work_submissions_status
  ON greenhouse_hr.contractor_work_submissions (status);

-- Soporta el readiness reader (approved + no consumido) y el dup-guard del payable.
CREATE INDEX IF NOT EXISTS idx_contractor_work_submissions_ready
  ON greenhouse_hr.contractor_work_submissions (contractor_engagement_id)
  WHERE status = 'approved' AND consumed_by_payable_id IS NULL;

-- Soporta el reliability signal review_overdue (submitted|disputed).
CREATE INDEX IF NOT EXISTS idx_contractor_work_submissions_pending_review
  ON greenhouse_hr.contractor_work_submissions (status, submitted_at)
  WHERE status IN ('submitted', 'disputed');

-- Append-only audit log de cambios materiales del lifecycle.
CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_work_submission_events (
  event_id                       TEXT PRIMARY KEY,
  contractor_work_submission_id  TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_work_submissions(contractor_work_submission_id) ON DELETE CASCADE,
  event_type                     TEXT NOT NULL
    CHECK (event_type IN (
      'created',
      'submitted',
      'approved',
      'disputed',
      'rejected',
      'cancelled',
      'consumed',
      'updated'
    )),
  from_status                    TEXT,
  to_status                      TEXT,
  actor_user_id                  TEXT,
  reason                         TEXT,
  metadata_json                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_work_submission_events_submission
  ON greenhouse_hr.contractor_work_submission_events (contractor_work_submission_id, created_at DESC);

-- D-792-1: evidencia del work submission reusa el ledger TASK-791. Columna
-- additiva (NULL para filas existentes; ADD COLUMN no dispara el trigger
-- anti-UPDATE porque es DDL, no UPDATE de fila).
ALTER TABLE greenhouse_hr.contractor_invoice_assets
  ADD COLUMN IF NOT EXISTS contractor_work_submission_id TEXT
    REFERENCES greenhouse_hr.contractor_work_submissions(contractor_work_submission_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_invoice_assets_work_submission
  ON greenhouse_hr.contractor_invoice_assets (contractor_work_submission_id)
  WHERE contractor_work_submission_id IS NOT NULL;

-- Trigger: touch updated_at.
CREATE OR REPLACE FUNCTION greenhouse_hr.touch_contractor_work_submissions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contractor_work_submissions_touch_updated_at
BEFORE UPDATE ON greenhouse_hr.contractor_work_submissions
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.touch_contractor_work_submissions_updated_at();

-- Trigger: valida transiciones del state machine a nivel DB (defense-in-depth).
-- Matriz canónica (mirror del helper TS `assertValidSubmissionTransition`):
--   draft     -> submitted | cancelled
--   submitted -> approved | disputed | rejected | cancelled
--   disputed  -> submitted | rejected | cancelled
--   approved  -> cancelled
--   rejected  -> (terminal)
--   cancelled -> (terminal)
-- Mismo estado (sin cambio) siempre permitido (metadata / consumption updates).
CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_work_submissions_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft'     AND NEW.status IN ('submitted', 'cancelled')) OR
    (OLD.status = 'submitted' AND NEW.status IN ('approved', 'disputed', 'rejected', 'cancelled')) OR
    (OLD.status = 'disputed'  AND NEW.status IN ('submitted', 'rejected', 'cancelled')) OR
    (OLD.status = 'approved'  AND NEW.status IN ('cancelled'))
  ) THEN
    RAISE EXCEPTION 'contractor_work_submissions: invalid status transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contractor_work_submissions_validate_transition
BEFORE UPDATE ON greenhouse_hr.contractor_work_submissions
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_work_submissions_validate_transition();

-- Append-only enforcement sobre el audit log.
CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_work_submission_events is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_work_submission_events is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_contractor_work_submission_events_no_update
BEFORE UPDATE ON greenhouse_hr.contractor_work_submission_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_update();

CREATE TRIGGER trg_contractor_work_submission_events_no_delete
BEFORE DELETE ON greenhouse_hr.contractor_work_submission_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_delete();

-- Grants (ownership queda en greenhouse_ops, dueño canónico).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submissions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submissions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submissions TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submission_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submission_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_work_submission_events TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_work_submission_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_work_submission_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_work_submission_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_contractor_work_submissions_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_work_submissions_validate_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_work_submission_events_prevent_delete() TO greenhouse_runtime;

-- Anti pre-up-marker bug guard (CLAUDE.md migration markers).
DO $$
DECLARE
  has_table      boolean;
  has_events     boolean;
  has_evidence_c boolean;
  has_transition boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_work_submissions'
  ) INTO has_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_work_submission_events'
  ) INTO has_events;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr'
      AND table_name = 'contractor_invoice_assets'
      AND column_name = 'contractor_work_submission_id'
  ) INTO has_evidence_c;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_hr'
      AND p.proname = 'contractor_work_submissions_validate_transition'
  ) INTO has_transition;

  IF NOT has_table THEN
    RAISE EXCEPTION 'TASK-792 anti pre-up-marker: greenhouse_hr.contractor_work_submissions was NOT created.';
  END IF;
  IF NOT has_events THEN
    RAISE EXCEPTION 'TASK-792 anti pre-up-marker: greenhouse_hr.contractor_work_submission_events was NOT created.';
  END IF;
  IF NOT has_evidence_c THEN
    RAISE EXCEPTION 'TASK-792 anti pre-up-marker: contractor_invoice_assets.contractor_work_submission_id was NOT added.';
  END IF;
  IF NOT has_transition THEN
    RAISE EXCEPTION 'TASK-792 anti pre-up-marker: transition-validation trigger fn was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hr.idx_contractor_invoice_assets_work_submission;
ALTER TABLE greenhouse_hr.contractor_invoice_assets
  DROP COLUMN IF EXISTS contractor_work_submission_id;

DROP TRIGGER IF EXISTS trg_contractor_work_submission_events_no_delete ON greenhouse_hr.contractor_work_submission_events;
DROP TRIGGER IF EXISTS trg_contractor_work_submission_events_no_update ON greenhouse_hr.contractor_work_submission_events;
DROP TRIGGER IF EXISTS trg_contractor_work_submissions_validate_transition ON greenhouse_hr.contractor_work_submissions;
DROP TRIGGER IF EXISTS trg_contractor_work_submissions_touch_updated_at ON greenhouse_hr.contractor_work_submissions;

DROP FUNCTION IF EXISTS greenhouse_hr.contractor_work_submission_events_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_work_submission_events_prevent_update();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_work_submissions_validate_transition();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_contractor_work_submissions_updated_at();

DROP TABLE IF EXISTS greenhouse_hr.contractor_work_submission_events;
DROP TABLE IF EXISTS greenhouse_hr.contractor_work_submissions;

DROP SEQUENCE IF EXISTS greenhouse_hr.seq_contractor_work_submission_public_id;
