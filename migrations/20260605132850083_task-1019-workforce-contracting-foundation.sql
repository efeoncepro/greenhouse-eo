-- Up Migration
--
-- TASK-1019 — Workforce Contracting Studio foundation (offer letters + employment contracts).
-- Implements GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1 §3 (lifecycles) + §6 (data model).
-- Mirrors the battle-tested TASK-992 client_lifecycle / TASK-760 offboarding pattern:
--   - workforce_contracting_cases       (aggregate root, state machine per case_kind)
--   - workforce_contracting_drafts      (versioned bilingual drafts, validation snapshots)
--   - workforce_contracting_ai_runs     (Claude drafting ledger, advisory-only)
--   - workforce_contracting_case_events (append-only audit log)
--
-- Schema notes (reconciled against real PG schema 2026-06-05):
--   - Domain schema is greenhouse_hr (workforce/HR), FKs cross to greenhouse_core anchors.
--   - identity_profiles.profile_id / members.member_id / organizations.organization_id are TEXT.
--   - The canonical user table is greenhouse_core.client_users(user_id) (greenhouse_core.users
--     does not exist; TASK-760/992 precedent).
--   - work_relationship_onboarding_cases lives in greenhouse_hr (TASK-875).
--   - Bilingual is mandatory: required_languages always contains es-CL + en-US.
--   - signable_format (pdf|docx) is a reserved dimension; TASK-1019 renders nothing.
--   - status uses ONE column with a CHECK conditional on case_kind (offer vs contract status
--     sets are declared in full; transitions are enforced by the TS state machine AND the
--     DB transition-guard trigger — defense in depth, TASK-700/765 pattern).

-- 1. Cases (aggregate root + state machine)
CREATE TABLE IF NOT EXISTS greenhouse_hr.workforce_contracting_cases (
  case_id                            TEXT PRIMARY KEY,
  case_kind                          TEXT NOT NULL
                                     CHECK (case_kind IN ('offer_letter','employment_contract')),

  subject_identity_profile_id        TEXT NOT NULL
                                     REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  member_id                          TEXT
                                     REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  work_relationship_onboarding_case_id TEXT
                                     REFERENCES greenhouse_hr.work_relationship_onboarding_cases(onboarding_case_id) ON DELETE SET NULL,
  source_offer_case_id               TEXT
                                     REFERENCES greenhouse_hr.workforce_contracting_cases(case_id) ON DELETE SET NULL,
  operating_entity_organization_id   TEXT NOT NULL
                                     REFERENCES greenhouse_core.organizations(organization_id),

  jurisdiction_pack_code             TEXT NOT NULL,
  required_languages                 TEXT[] NOT NULL DEFAULT ARRAY['es-CL','en-US']::TEXT[],
  authoritative_language             TEXT NOT NULL DEFAULT 'es-CL'
                                     CHECK (authoritative_language IN ('es-CL','en-US')),
  signable_format                    TEXT NOT NULL DEFAULT 'pdf'
                                     CHECK (signable_format IN ('pdf','docx')),
  signature_provider                 TEXT NOT NULL DEFAULT 'zapsign'
                                     CHECK (signature_provider IN ('zapsign')),

  status                             TEXT NOT NULL,

  target_start_date                  DATE,
  contract_type_snapshot             TEXT,
  pay_regime_snapshot                TEXT,
  payroll_via_snapshot               TEXT,
  legal_review_reference             TEXT,

  created_by_user_id                 TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  voided_at                          TIMESTAMPTZ,
  void_reason                        TEXT,
  metadata_json                      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Bilingual invariant: both canonical languages always required.
  CONSTRAINT workforce_contracting_cases_bilingual_check
    CHECK ('es-CL' = ANY(required_languages) AND 'en-US' = ANY(required_languages)),

  -- legalReviewReference >= 10 chars when present (TASK-894 invariant, DB defense).
  CONSTRAINT workforce_contracting_cases_legal_review_ref_check
    CHECK (legal_review_reference IS NULL OR char_length(legal_review_reference) >= 10),

  -- status must belong to the set valid for its case_kind.
  CONSTRAINT workforce_contracting_cases_status_by_kind_check CHECK (
    (case_kind = 'offer_letter' AND status IN (
       'draft','ai_drafted','pending_internal_review','approved','sent','viewed',
       'accepted','rejected','expired','withdrawn','converted_to_contract'
     ))
    OR
    (case_kind = 'employment_contract' AND status IN (
       'intake_pending','ai_drafted','validation_blocked','pending_review','legal_review',
       'internal_approved','ready_for_pdf','ready_for_signature','sent_for_signature',
       'partially_signed','fully_signed','registered_external','active','rejected','voided',
       'expired','superseded','signature_failed','needs_amendment'
     ))
  )
);

-- One active (non-terminal) case per subject + kind.
CREATE UNIQUE INDEX IF NOT EXISTS workforce_contracting_cases_one_active_per_kind
  ON greenhouse_hr.workforce_contracting_cases (subject_identity_profile_id, case_kind)
  WHERE status NOT IN (
    'accepted','rejected','expired','withdrawn','converted_to_contract',
    'active','voided','superseded'
  );

CREATE INDEX IF NOT EXISTS workforce_contracting_cases_status_kind
  ON greenhouse_hr.workforce_contracting_cases (status, case_kind);
CREATE INDEX IF NOT EXISTS workforce_contracting_cases_subject
  ON greenhouse_hr.workforce_contracting_cases (subject_identity_profile_id);
CREATE INDEX IF NOT EXISTS workforce_contracting_cases_onboarding
  ON greenhouse_hr.workforce_contracting_cases (work_relationship_onboarding_case_id)
  WHERE work_relationship_onboarding_case_id IS NOT NULL;

-- 2. Drafts (versioned bilingual content + validation snapshots; pre-EPIC-001 versioning)
CREATE TABLE IF NOT EXISTS greenhouse_hr.workforce_contracting_drafts (
  draft_id                     TEXT PRIMARY KEY,
  case_id                      TEXT NOT NULL
                               REFERENCES greenhouse_hr.workforce_contracting_cases(case_id) ON DELETE CASCADE,
  draft_version                INTEGER NOT NULL,
  source                       TEXT NOT NULL CHECK (source IN ('manual','claude_ai','imported')),
  status                       TEXT NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','superseded','approved_for_pdf')),
  structured_content_json      JSONB NOT NULL,
  validation_snapshot_json     JSONB,
  language_parity_snapshot_json JSONB,
  content_hash                 TEXT NOT NULL,
  approved_at                  TIMESTAMPTZ,
  approved_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_by_user_id           TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workforce_contracting_drafts_version_unique UNIQUE (case_id, draft_version),
  CONSTRAINT workforce_contracting_drafts_approved_check
    CHECK (status <> 'approved_for_pdf' OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS workforce_contracting_drafts_case
  ON greenhouse_hr.workforce_contracting_drafts (case_id, draft_version DESC);

-- 3. AI runs (Claude drafting ledger, advisory-only, auditable + reproducible)
CREATE TABLE IF NOT EXISTS greenhouse_hr.workforce_contracting_ai_runs (
  ai_run_id              TEXT PRIMARY KEY,
  case_id                TEXT NOT NULL
                         REFERENCES greenhouse_hr.workforce_contracting_cases(case_id) ON DELETE CASCADE,
  draft_id               TEXT REFERENCES greenhouse_hr.workforce_contracting_drafts(draft_id) ON DELETE SET NULL,
  provider               TEXT NOT NULL,
  model                  TEXT NOT NULL,
  prompt_version         TEXT NOT NULL,
  prompt_hash            TEXT,
  input_snapshot_hash    TEXT NOT NULL,
  output_hash            TEXT,
  status                 TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  language_parity_status TEXT CHECK (language_parity_status IN ('pass','warning','fail')),
  usage_json             JSONB,
  error_summary          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_contracting_ai_runs_case
  ON greenhouse_hr.workforce_contracting_ai_runs (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_contracting_ai_runs_failed
  ON greenhouse_hr.workforce_contracting_ai_runs (created_at DESC)
  WHERE status = 'failed';

-- 4. Case events (append-only audit log)
CREATE TABLE IF NOT EXISTS greenhouse_hr.workforce_contracting_case_events (
  event_id      TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL
                REFERENCES greenhouse_hr.workforce_contracting_cases(case_id) ON DELETE CASCADE,
  event_kind    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workforce_contracting_case_events_case
  ON greenhouse_hr.workforce_contracting_case_events (case_id, occurred_at DESC);

-- 5. updated_at maintenance triggers
CREATE OR REPLACE FUNCTION greenhouse_hr.touch_workforce_contracting_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workforce_contracting_cases_touch_updated_at ON greenhouse_hr.workforce_contracting_cases;
CREATE TRIGGER trg_workforce_contracting_cases_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.workforce_contracting_cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_workforce_contracting_cases_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_workforce_contracting_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workforce_contracting_drafts_touch_updated_at ON greenhouse_hr.workforce_contracting_drafts;
CREATE TRIGGER trg_workforce_contracting_drafts_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.workforce_contracting_drafts
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_workforce_contracting_drafts_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_workforce_contracting_ai_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workforce_contracting_ai_runs_touch_updated_at ON greenhouse_hr.workforce_contracting_ai_runs;
CREATE TRIGGER trg_workforce_contracting_ai_runs_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.workforce_contracting_ai_runs
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_workforce_contracting_ai_runs_updated_at();

-- 6. Append-only triggers for the audit log (anti-UPDATE / anti-DELETE)
CREATE OR REPLACE FUNCTION greenhouse_hr.workforce_contracting_case_events_no_mutate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'workforce_contracting_case_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_update_on_workforce_contracting_case_events ON greenhouse_hr.workforce_contracting_case_events;
CREATE TRIGGER prevent_update_on_workforce_contracting_case_events
  BEFORE UPDATE ON greenhouse_hr.workforce_contracting_case_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.workforce_contracting_case_events_no_mutate();

DROP TRIGGER IF EXISTS prevent_delete_on_workforce_contracting_case_events ON greenhouse_hr.workforce_contracting_case_events;
CREATE TRIGGER prevent_delete_on_workforce_contracting_case_events
  BEFORE DELETE ON greenhouse_hr.workforce_contracting_case_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.workforce_contracting_case_events_no_mutate();

-- 7. Case status transition guard (state machine matrices per case_kind, §3.1/§3.2).
--    Defense-in-depth layer 1; the TS state machine (state-machine.ts) is primary enforcement.
CREATE OR REPLACE FUNCTION greenhouse_hr.workforce_contracting_case_transition_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.case_kind = 'offer_letter' THEN
    IF NOT (
      (OLD.status = 'draft'                   AND NEW.status IN ('ai_drafted','withdrawn')) OR
      (OLD.status = 'ai_drafted'              AND NEW.status IN ('pending_internal_review','draft','withdrawn')) OR
      (OLD.status = 'pending_internal_review' AND NEW.status IN ('approved','ai_drafted','rejected','withdrawn')) OR
      (OLD.status = 'approved'                AND NEW.status IN ('sent','withdrawn')) OR
      (OLD.status = 'sent'                    AND NEW.status IN ('viewed','accepted','rejected','expired','withdrawn')) OR
      (OLD.status = 'viewed'                  AND NEW.status IN ('accepted','rejected','expired','withdrawn')) OR
      (OLD.status = 'accepted'                AND NEW.status IN ('converted_to_contract'))
    ) THEN
      RAISE EXCEPTION 'Invalid workforce_contracting offer_letter transition: % -> %', OLD.status, NEW.status;
    END IF;
  ELSIF OLD.case_kind = 'employment_contract' THEN
    IF NOT (
      (OLD.status = 'intake_pending'      AND NEW.status IN ('ai_drafted','voided')) OR
      (OLD.status = 'ai_drafted'          AND NEW.status IN ('validation_blocked','pending_review','voided')) OR
      (OLD.status = 'validation_blocked'  AND NEW.status IN ('ai_drafted','pending_review','voided')) OR
      (OLD.status = 'pending_review'      AND NEW.status IN ('legal_review','validation_blocked','needs_amendment','rejected','voided')) OR
      (OLD.status = 'legal_review'        AND NEW.status IN ('internal_approved','needs_amendment','rejected','voided')) OR
      (OLD.status = 'internal_approved'   AND NEW.status IN ('ready_for_pdf','needs_amendment','voided')) OR
      (OLD.status = 'ready_for_pdf'       AND NEW.status IN ('ready_for_signature','needs_amendment','voided')) OR
      (OLD.status = 'ready_for_signature' AND NEW.status IN ('sent_for_signature','needs_amendment','voided')) OR
      (OLD.status = 'sent_for_signature'  AND NEW.status IN ('partially_signed','fully_signed','signature_failed','expired','voided')) OR
      (OLD.status = 'partially_signed'    AND NEW.status IN ('fully_signed','signature_failed','expired','voided')) OR
      (OLD.status = 'signature_failed'    AND NEW.status IN ('sent_for_signature','voided')) OR
      (OLD.status = 'fully_signed'        AND NEW.status IN ('registered_external','active')) OR
      (OLD.status = 'registered_external' AND NEW.status IN ('active')) OR
      (OLD.status = 'active'              AND NEW.status IN ('superseded','needs_amendment')) OR
      (OLD.status = 'needs_amendment'     AND NEW.status IN ('ai_drafted','pending_review','voided'))
    ) THEN
      RAISE EXCEPTION 'Invalid workforce_contracting employment_contract transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workforce_contracting_case_transition_check ON greenhouse_hr.workforce_contracting_cases;
CREATE TRIGGER trg_workforce_contracting_case_transition_check
  BEFORE UPDATE OF status ON greenhouse_hr.workforce_contracting_cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.workforce_contracting_case_transition_check();

-- 8. Ownership + grants (canonical owner greenhouse_ops; runtime read/write)
ALTER TABLE greenhouse_hr.workforce_contracting_cases OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.workforce_contracting_drafts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.workforce_contracting_ai_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.workforce_contracting_case_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.touch_workforce_contracting_cases_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.touch_workforce_contracting_drafts_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.touch_workforce_contracting_ai_runs_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.workforce_contracting_case_events_no_mutate() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.workforce_contracting_case_transition_check() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_cases TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_drafts TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_ai_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_case_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_cases TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_drafts TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_ai_runs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_case_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_cases TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_drafts TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_ai_runs TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workforce_contracting_case_events TO greenhouse_migrator;

-- 9. Anti pre-up-marker verification (aborts if DDL did not land)
DO $$
DECLARE
  table_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hr'
    AND table_name IN (
      'workforce_contracting_cases','workforce_contracting_drafts',
      'workforce_contracting_ai_runs','workforce_contracting_case_events'
    );
  IF table_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1019: expected 4 workforce_contracting tables, got %. Migration markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'prevent_update_on_workforce_contracting_case_events',
    'prevent_delete_on_workforce_contracting_case_events',
    'trg_workforce_contracting_case_transition_check'
  );
  IF trigger_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1019: expected 3 governance triggers, got %.', trigger_count;
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_workforce_contracting_case_transition_check ON greenhouse_hr.workforce_contracting_cases;
DROP TRIGGER IF EXISTS prevent_delete_on_workforce_contracting_case_events ON greenhouse_hr.workforce_contracting_case_events;
DROP TRIGGER IF EXISTS prevent_update_on_workforce_contracting_case_events ON greenhouse_hr.workforce_contracting_case_events;
DROP TRIGGER IF EXISTS trg_workforce_contracting_ai_runs_touch_updated_at ON greenhouse_hr.workforce_contracting_ai_runs;
DROP TRIGGER IF EXISTS trg_workforce_contracting_drafts_touch_updated_at ON greenhouse_hr.workforce_contracting_drafts;
DROP TRIGGER IF EXISTS trg_workforce_contracting_cases_touch_updated_at ON greenhouse_hr.workforce_contracting_cases;

DROP TABLE IF EXISTS greenhouse_hr.workforce_contracting_case_events;
DROP TABLE IF EXISTS greenhouse_hr.workforce_contracting_ai_runs;
DROP TABLE IF EXISTS greenhouse_hr.workforce_contracting_drafts;
DROP TABLE IF EXISTS greenhouse_hr.workforce_contracting_cases;

DROP FUNCTION IF EXISTS greenhouse_hr.workforce_contracting_case_transition_check();
DROP FUNCTION IF EXISTS greenhouse_hr.workforce_contracting_case_events_no_mutate();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_workforce_contracting_ai_runs_updated_at();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_workforce_contracting_drafts_updated_at();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_workforce_contracting_cases_updated_at();
