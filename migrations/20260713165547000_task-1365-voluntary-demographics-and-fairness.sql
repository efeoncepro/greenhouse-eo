-- Up Migration

-- TASK-1365 — Voluntary demographic self-ID + privacy-safe fairness read model.
-- The sensitive source table is physically separate from hiring_application and assessment
-- scoring. The only read surface granted to runtime consumers is an aggregate view that
-- suppresses buckets below k=10 before rows leave PostgreSQL.

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_demographic_selfid (
  selfid_id               TEXT PRIMARY KEY DEFAULT ('hsid-' || gen_random_uuid()::text),
  identity_profile_id     TEXT NOT NULL
                            REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  dimension_key           TEXT NOT NULL CHECK (dimension_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  category_key            TEXT NOT NULL CHECK (category_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  consent_policy_version  TEXT NOT NULL CHECK (char_length(consent_policy_version) BETWEEN 1 AND 100),
  consent_granted_at      TIMESTAMPTZ NOT NULL,
  retention_expires_at    TIMESTAMPTZ NOT NULL,
  withdrawn_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identity_profile_id, dimension_key),
  CHECK (retention_expires_at > consent_granted_at),
  CHECK (withdrawn_at IS NULL OR withdrawn_at >= consent_granted_at)
);

CREATE INDEX IF NOT EXISTS hiring_demographic_selfid_active_idx
  ON greenhouse_hiring.hiring_demographic_selfid (dimension_key, category_key, retention_expires_at)
  WHERE withdrawn_at IS NULL;

CREATE TRIGGER hiring_demographic_selfid_touch_updated_at
  BEFORE UPDATE ON greenhouse_hiring.hiring_demographic_selfid
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_demographic_selfid_audit (
  audit_id                TEXT PRIMARY KEY DEFAULT ('hsia-' || gen_random_uuid()::text),
  selfid_id               TEXT NOT NULL
                            REFERENCES greenhouse_hiring.hiring_demographic_selfid (selfid_id) ON DELETE RESTRICT,
  action                  TEXT NOT NULL CHECK (action IN ('captured', 'updated', 'withdrawn')),
  consent_policy_version  TEXT NOT NULL,
  actor_kind              TEXT NOT NULL CHECK (actor_kind IN ('candidate_token', 'system')),
  actor_user_id           TEXT,
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hiring_demographic_selfid_audit_selfid_idx
  ON greenhouse_hiring.hiring_demographic_selfid_audit (selfid_id, occurred_at);

CREATE OR REPLACE FUNCTION greenhouse_hiring.assert_demographic_selfid_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'hiring_demographic_selfid_audit es append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER demographic_selfid_audit_no_update_trigger
  BEFORE UPDATE ON greenhouse_hiring.hiring_demographic_selfid_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_demographic_selfid_audit_append_only();

CREATE TRIGGER demographic_selfid_audit_no_delete_trigger
  BEFORE DELETE ON greenhouse_hiring.hiring_demographic_selfid_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_demographic_selfid_audit_append_only();

CREATE TABLE IF NOT EXISTS greenhouse_hr.assessment_fairness_evidence (
  evidence_id       TEXT PRIMARY KEY DEFAULT ('afev-' || gen_random_uuid()::text),
  scope_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  window_months     INTEGER NOT NULL CHECK (window_months BETWEEN 1 AND 24),
  sample_size       INTEGER NOT NULL CHECK (sample_size >= 0),
  verdict           TEXT NOT NULL CHECK (verdict IN ('insufficient_sample', 'monitoring', 'adverse_impact')),
  result_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_by       TEXT,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_fairness_evidence_computed_idx
  ON greenhouse_hr.assessment_fairness_evidence (computed_at);

CREATE OR REPLACE FUNCTION greenhouse_hr.assert_fairness_evidence_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'assessment_fairness_evidence es append-only (evidencia AI-Act).';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fairness_evidence_no_update_trigger
  BEFORE UPDATE ON greenhouse_hr.assessment_fairness_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_fairness_evidence_append_only();

CREATE TRIGGER fairness_evidence_no_delete_trigger
  BEFORE DELETE ON greenhouse_hr.assessment_fairness_evidence
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.assert_fairness_evidence_append_only();

CREATE OR REPLACE VIEW greenhouse_hiring.assessment_fairness AS
WITH stage_targets(stage, stage_rank) AS (
  VALUES
    ('screening'::text, 1),
    ('qualified'::text, 2),
    ('shortlisted'::text, 3),
    ('client_review'::text, 4),
    ('interview'::text, 5),
    ('decision_pending'::text, 6),
    ('selected'::text, 7)
),
event_progress AS (
  SELECT e.aggregate_id AS application_id,
         MAX(CASE
           WHEN e.event_type = 'hiring.application.decided'
             AND e.payload_json->>'decision' = 'selected' THEN 7
           WHEN e.payload_json->>'stage' = 'screening' THEN 1
           WHEN e.payload_json->>'stage' = 'qualified' THEN 2
           WHEN e.payload_json->>'stage' = 'shortlisted' THEN 3
           WHEN e.payload_json->>'stage' = 'client_review' THEN 4
           WHEN e.payload_json->>'stage' = 'interview' THEN 5
           WHEN e.payload_json->>'stage' = 'decision_pending' THEN 6
           WHEN e.payload_json->>'stage' IN ('selected', 'handoff_ready') THEN 7
           ELSE 0
         END) AS max_stage_rank
  FROM greenhouse_sync.outbox_events e
  WHERE e.aggregate_type = 'hiring_application'
    AND e.event_type IN (
      'hiring.application.created',
      'hiring.application.stage_changed',
      'hiring.application.decided'
    )
  GROUP BY e.aggregate_id
),
application_progress AS (
  SELECT app.application_id,
         app.identity_profile_id,
         date_trunc('month', app.created_at)::date AS cohort_month,
         app.decision,
         GREATEST(
           COALESCE(ep.max_stage_rank, 0),
           CASE app.stage
             WHEN 'screening' THEN 1
             WHEN 'qualified' THEN 2
             WHEN 'shortlisted' THEN 3
             WHEN 'client_review' THEN 4
             WHEN 'interview' THEN 5
             WHEN 'decision_pending' THEN 6
             WHEN 'selected' THEN 7
             WHEN 'handoff_ready' THEN 7
             ELSE 0
           END
         ) AS max_stage_rank
  FROM greenhouse_hiring.hiring_application app
  LEFT JOIN event_progress ep ON ep.application_id = app.application_id
),
application_templates AS (
  SELECT application_id, NULL::text AS template_id
  FROM application_progress
  UNION
  SELECT DISTINCT assessment.application_id, assessment.template_id
  FROM greenhouse_hiring.hiring_assessment assessment
  WHERE assessment.template_id IS NOT NULL
)
SELECT progress.cohort_month,
       selfid.dimension_key,
       selfid.category_key,
       target.stage,
       templates.template_id,
       COUNT(DISTINCT progress.application_id)::integer AS eligible_count,
       COUNT(DISTINCT progress.application_id) FILTER (
         WHERE CASE
           WHEN target.stage = 'selected' THEN progress.decision = 'selected'
           ELSE progress.max_stage_rank >= target.stage_rank
         END
       )::integer AS advanced_count
FROM application_progress progress
JOIN application_templates templates ON templates.application_id = progress.application_id
JOIN greenhouse_hiring.hiring_demographic_selfid selfid
  ON selfid.identity_profile_id = progress.identity_profile_id
 AND selfid.withdrawn_at IS NULL
 AND selfid.retention_expires_at > NOW()
CROSS JOIN stage_targets target
GROUP BY progress.cohort_month, selfid.dimension_key, selfid.category_key, target.stage, templates.template_id
HAVING COUNT(DISTINCT progress.application_id) >= 10;

COMMENT ON VIEW greenhouse_hiring.assessment_fairness IS
  'TASK-1365 aggregate-only monthly fairness projection. k=10 is enforced in the view; no candidate/application identifiers are exposed.';

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.fairness_read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-1365 — Leer únicamente agregados k-anon de fairness/adverse-impact. Grant role-only de gobernanza; nunca client_* ni routeGroup internal.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

REVOKE ALL ON greenhouse_hiring.hiring_demographic_selfid FROM PUBLIC;
REVOKE ALL ON greenhouse_hiring.hiring_demographic_selfid_audit FROM PUBLIC;
REVOKE ALL ON greenhouse_hr.assessment_fairness_evidence FROM PUBLIC;
REVOKE ALL ON greenhouse_hiring.assessment_fairness FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON greenhouse_hiring.hiring_demographic_selfid TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_demographic_selfid_audit TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_hr.assessment_fairness_evidence TO greenhouse_runtime, greenhouse_app;
GRANT SELECT ON greenhouse_hiring.assessment_fairness TO greenhouse_runtime, greenhouse_app;

DO $$
DECLARE
  source_table_count integer;
  safe_view_count integer;
  leaked_column_count integer;
  capability_count integer;
BEGIN
  SELECT COUNT(*) INTO source_table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_demographic_selfid';

  SELECT COUNT(*) INTO safe_view_count
  FROM information_schema.views
  WHERE table_schema = 'greenhouse_hiring' AND table_name = 'assessment_fairness';

  SELECT COUNT(*) INTO leaked_column_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name = 'assessment_fairness'
    AND column_name IN ('identity_profile_id', 'application_id', 'assessment_id', 'candidate_facet_id');

  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.assessment.fairness_read' AND deprecated_at IS NULL;

  IF source_table_count <> 1 OR safe_view_count <> 1 OR leaked_column_count <> 0 OR capability_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1365 anti pre-up-marker guard failed (table %, view %, leaked %, capability %).',
      source_table_count, safe_view_count, leaked_column_count, capability_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.assessment.fairness_read' AND deprecated_at IS NULL;

DROP VIEW IF EXISTS greenhouse_hiring.assessment_fairness;

DROP TRIGGER IF EXISTS fairness_evidence_no_update_trigger ON greenhouse_hr.assessment_fairness_evidence;
DROP TRIGGER IF EXISTS fairness_evidence_no_delete_trigger ON greenhouse_hr.assessment_fairness_evidence;
DROP FUNCTION IF EXISTS greenhouse_hr.assert_fairness_evidence_append_only();
DROP TABLE IF EXISTS greenhouse_hr.assessment_fairness_evidence;

DROP TRIGGER IF EXISTS demographic_selfid_audit_no_update_trigger ON greenhouse_hiring.hiring_demographic_selfid_audit;
DROP TRIGGER IF EXISTS demographic_selfid_audit_no_delete_trigger ON greenhouse_hiring.hiring_demographic_selfid_audit;
DROP FUNCTION IF EXISTS greenhouse_hiring.assert_demographic_selfid_audit_append_only();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_demographic_selfid_audit;

DROP TRIGGER IF EXISTS hiring_demographic_selfid_touch_updated_at ON greenhouse_hiring.hiring_demographic_selfid;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_demographic_selfid;
