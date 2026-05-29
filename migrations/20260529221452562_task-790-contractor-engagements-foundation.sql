-- Up Migration
--
-- TASK-790 — Contractor Engagements Runtime + Classification Risk (Slice 1).
--
-- Aggregate canonico `ContractorEngagement` bajo Workforce/HR (greenhouse_hr).
-- Modela el contrato operativo de prestacion de servicios contractor/honorarios:
-- payment model + cadence, tax/compliance owner (mandatory), provider refs,
-- classification risk first-class y lifecycle state machine.
--
-- Reglas duras (CLAUDE.md / arch GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1):
--   - El engagement FK-anchora a una relacion person<->entidad ACTIVA via
--     person_legal_entity_relationships.relationship_id. NO crea relaciones
--     (eso es TASK-789/891). ON DELETE RESTRICT preserva el anchor.
--   - `payroll_via` aqui es el canal DEL ENGAGEMENT (enum propio), ortogonal a
--     members.payroll_via. NUNCA se escribe a members.{payroll_via,contract_type,pay_regime}.
--   - `relationship_subtype` es SSOT fino del engagement (5 valores); el subtype
--     coarse de la relacion (metadata.relationshipSubtype IN {contractor,honorarios})
--     se valida por consistencia de familia en el helper canonico, sin write-back.
--   - Contractor payables NUNCA entran como payroll_entries/compensation_versions/
--     final_settlements. Este aggregate es la fundacion; el pago nace en 791-793.
--
-- State machine + CHECK + audit trio (pattern TASK-700/765):
--   - contractor_engagements: mutable, CHECK sobre enums + trigger BEFORE UPDATE
--     que valida transiciones + CHECK de risk-gate para `active`.
--   - contractor_engagement_events: append-only con triggers anti-UPDATE/anti-DELETE.
--   - Outbox events v1 los emite el store (no la migracion).

CREATE SEQUENCE IF NOT EXISTS greenhouse_hr.seq_contractor_engagement_public_id;

CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_engagements (
  contractor_engagement_id          TEXT PRIMARY KEY,
  public_id                         TEXT NOT NULL UNIQUE,
  profile_id                        TEXT NOT NULL
    REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  member_id                         TEXT
    REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  person_legal_entity_relationship_id TEXT NOT NULL
    REFERENCES greenhouse_core.person_legal_entity_relationships(relationship_id) ON DELETE RESTRICT,
  legal_entity_organization_id      TEXT NOT NULL
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  country_code                      TEXT NOT NULL,
  tax_residency_country_code        TEXT,
  relationship_subtype              TEXT NOT NULL
    CHECK (relationship_subtype IN (
      'honorarios_cl',
      'freelance',
      'independent_professional',
      'international_contractor',
      'provider_platform'
    )),
  payroll_via                       TEXT NOT NULL
    CHECK (payroll_via IN (
      'internal',
      'deel',
      'remote',
      'oyster',
      'manual_provider',
      'direct_international'
    )),
  currency                          TEXT NOT NULL
    CHECK (char_length(currency) = 3),
  payment_currency                  TEXT
    CHECK (payment_currency IS NULL OR char_length(payment_currency) = 3),
  fx_policy_code                    TEXT,
  provider_contract_id              TEXT,
  provider_worker_id                TEXT,
  payment_model                     TEXT NOT NULL
    CHECK (payment_model IN (
      'fixed_recurring',
      'weekly_timesheet',
      'milestone',
      'project_fee',
      'payg_invoice',
      'off_cycle'
    )),
  rate_type                         TEXT NOT NULL
    CHECK (rate_type IN (
      'fixed',
      'hourly',
      'daily',
      'milestone',
      'project',
      'retainer'
    )),
  rate_amount                       NUMERIC(18,2)
    CHECK (rate_amount IS NULL OR rate_amount >= 0),
  payment_cadence                   TEXT NOT NULL
    CHECK (payment_cadence IN (
      'weekly',
      'biweekly',
      'semi_monthly',
      'monthly',
      'milestone',
      'on_invoice',
      'off_cycle'
    )),
  requires_invoice                  BOOLEAN NOT NULL DEFAULT TRUE,
  requires_work_approval            BOOLEAN NOT NULL DEFAULT TRUE,
  tax_compliance_owner              TEXT NOT NULL
    CHECK (tax_compliance_owner IN (
      'greenhouse_policy',
      'provider_owned',
      'manual_review_required',
      'country_engine_owned'
    )),
  tax_withholding_policy_code       TEXT,
  tax_withholding_rate_snapshot     NUMERIC(6,5)
    CHECK (tax_withholding_rate_snapshot IS NULL OR (tax_withholding_rate_snapshot >= 0 AND tax_withholding_rate_snapshot <= 1)),
  bonus_policy                      TEXT NOT NULL DEFAULT 'none'
    CHECK (bonus_policy IN ('none', 'fixed', 'ico_backed')),
  classification_risk_status        TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (classification_risk_status IN (
      'clear',
      'needs_review',
      'legal_review_required',
      'blocked'
    )),
  classification_reviewed           BOOLEAN NOT NULL DEFAULT FALSE,
  classification_risk_factors       JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'pending_review',
      'active',
      'paused',
      'ending',
      'ended',
      'cancelled'
    )),
  start_date                        DATE NOT NULL,
  end_date                          DATE,
  metadata_json                     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id                TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Risk gate (defense-in-depth a nivel DB): un engagement `active` jamas puede
  -- coexistir con riesgo de clasificacion bloqueante. El helper canonico tambien
  -- enforce esto, pero la CHECK lo hace imposible de bypass por SQL directo.
  CONSTRAINT contractor_engagements_active_requires_clear_risk
    CHECK (status <> 'active' OR classification_risk_status NOT IN ('legal_review_required', 'blocked')),
  -- end_date solo coherente cuando existe (no en el pasado relativo al start).
  CONSTRAINT contractor_engagements_end_after_start
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_contractor_engagements_profile
  ON greenhouse_hr.contractor_engagements (profile_id);

CREATE INDEX IF NOT EXISTS idx_contractor_engagements_relationship
  ON greenhouse_hr.contractor_engagements (person_legal_entity_relationship_id);

CREATE INDEX IF NOT EXISTS idx_contractor_engagements_member
  ON greenhouse_hr.contractor_engagements (member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_engagements_status
  ON greenhouse_hr.contractor_engagements (status);

-- Soporta el reliability signal `hr.contractor_engagement.classification_risk_open`.
CREATE INDEX IF NOT EXISTS idx_contractor_engagements_risk_open
  ON greenhouse_hr.contractor_engagements (classification_risk_status)
  WHERE classification_risk_status IN ('legal_review_required', 'blocked');

-- Append-only audit log de cambios materiales del lifecycle.
CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_engagement_events (
  event_id                          TEXT PRIMARY KEY,
  contractor_engagement_id          TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_engagements(contractor_engagement_id) ON DELETE CASCADE,
  event_type                        TEXT NOT NULL
    CHECK (event_type IN (
      'created',
      'updated',
      'status_changed',
      'classification_reviewed',
      'classification_risk_flagged'
    )),
  from_status                       TEXT,
  to_status                         TEXT,
  from_classification_risk_status   TEXT,
  to_classification_risk_status     TEXT,
  actor_user_id                     TEXT,
  reason                            TEXT,
  metadata_json                     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_engagement_events_engagement
  ON greenhouse_hr.contractor_engagement_events (contractor_engagement_id, created_at DESC);

-- Trigger: touch updated_at.
CREATE OR REPLACE FUNCTION greenhouse_hr.touch_contractor_engagements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contractor_engagements_touch_updated_at
BEFORE UPDATE ON greenhouse_hr.contractor_engagements
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.touch_contractor_engagements_updated_at();

-- Trigger: valida transiciones del state machine a nivel DB (defense-in-depth).
-- Matriz canonica (mirror del helper TS `assertValidEngagementTransition`):
--   draft          -> pending_review | active | cancelled
--   pending_review -> active | draft | cancelled
--   active         -> paused | ending | cancelled
--   paused         -> active | ending | cancelled
--   ending         -> ended | active | cancelled
--   ended          -> (terminal)
--   cancelled      -> (terminal)
-- Mismo estado (sin cambio) siempre permitido (updates de metadata/risk).
CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_engagements_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft'          AND NEW.status IN ('pending_review', 'active', 'cancelled')) OR
    (OLD.status = 'pending_review' AND NEW.status IN ('active', 'draft', 'cancelled')) OR
    (OLD.status = 'active'         AND NEW.status IN ('paused', 'ending', 'cancelled')) OR
    (OLD.status = 'paused'         AND NEW.status IN ('active', 'ending', 'cancelled')) OR
    (OLD.status = 'ending'         AND NEW.status IN ('ended', 'active', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'contractor_engagements: invalid status transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contractor_engagements_validate_transition
BEFORE UPDATE ON greenhouse_hr.contractor_engagements
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_engagements_validate_transition();

-- Triggers: append-only enforcement sobre el audit log.
CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_engagement_events_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_engagement_events is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_engagement_events_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_engagement_events is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_contractor_engagement_events_no_update
BEFORE UPDATE ON greenhouse_hr.contractor_engagement_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_engagement_events_prevent_update();

CREATE TRIGGER trg_contractor_engagement_events_no_delete
BEFORE DELETE ON greenhouse_hr.contractor_engagement_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_engagement_events_prevent_delete();

-- Grants (runtime DML; ownership queda en greenhouse_ops, dueno canonico).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagements TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagements TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagements TO greenhouse_migrator_user;

-- El audit log permite INSERT pero los triggers bloquean UPDATE/DELETE.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagement_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagement_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_engagement_events TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_engagement_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_engagement_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_engagement_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_contractor_engagements_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_engagements_validate_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_engagement_events_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_engagement_events_prevent_delete() TO greenhouse_runtime;

-- Anti pre-up-marker bug guard (CLAUDE.md migration markers): aborta si los
-- objetos no quedaron realmente creados (sintoma de markers invertidos).
DO $$
DECLARE
  has_engagements   boolean;
  has_events        boolean;
  has_risk_gate     boolean;
  has_transition_fn boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_engagements'
  ) INTO has_engagements;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_engagement_events'
  ) INTO has_events;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_engagements_active_requires_clear_risk'
  ) INTO has_risk_gate;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_hr'
      AND p.proname = 'contractor_engagements_validate_transition'
  ) INTO has_transition_fn;

  IF NOT has_engagements THEN
    RAISE EXCEPTION 'TASK-790 anti pre-up-marker: greenhouse_hr.contractor_engagements was NOT created.';
  END IF;
  IF NOT has_events THEN
    RAISE EXCEPTION 'TASK-790 anti pre-up-marker: greenhouse_hr.contractor_engagement_events was NOT created.';
  END IF;
  IF NOT has_risk_gate THEN
    RAISE EXCEPTION 'TASK-790 anti pre-up-marker: risk-gate CHECK constraint was NOT created.';
  END IF;
  IF NOT has_transition_fn THEN
    RAISE EXCEPTION 'TASK-790 anti pre-up-marker: transition-validation trigger function was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_contractor_engagement_events_no_delete ON greenhouse_hr.contractor_engagement_events;
DROP TRIGGER IF EXISTS trg_contractor_engagement_events_no_update ON greenhouse_hr.contractor_engagement_events;
DROP TRIGGER IF EXISTS trg_contractor_engagements_validate_transition ON greenhouse_hr.contractor_engagements;
DROP TRIGGER IF EXISTS trg_contractor_engagements_touch_updated_at ON greenhouse_hr.contractor_engagements;

DROP FUNCTION IF EXISTS greenhouse_hr.contractor_engagement_events_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_engagement_events_prevent_update();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_engagements_validate_transition();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_contractor_engagements_updated_at();

DROP TABLE IF EXISTS greenhouse_hr.contractor_engagement_events;
DROP TABLE IF EXISTS greenhouse_hr.contractor_engagements;

DROP SEQUENCE IF EXISTS greenhouse_hr.seq_contractor_engagement_public_id;
