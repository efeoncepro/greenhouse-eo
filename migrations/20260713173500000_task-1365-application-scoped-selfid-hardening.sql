-- Up Migration

-- TASK-1365 hardening: self-ID is scoped to the application that presented the
-- consent surface. This prevents a later consent from projecting onto historical
-- applications for the same identity (prospective-only, no implicit backfill).

ALTER TABLE greenhouse_hiring.hiring_demographic_selfid
  ADD COLUMN IF NOT EXISTS application_id TEXT
    REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM greenhouse_hiring.hiring_demographic_selfid
    WHERE application_id IS NULL
  ) THEN
    RAISE EXCEPTION 'TASK-1365 application scope requires explicit remediation for existing self-ID rows.';
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_demographic_selfid
  ALTER COLUMN application_id SET NOT NULL;

DO $$
DECLARE
  identity_unique_name TEXT;
BEGIN
  SELECT constraint_name INTO identity_unique_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name = 'hiring_demographic_selfid'
    AND constraint_type = 'UNIQUE'
    AND constraint_name <> 'hiring_demographic_selfid_application_dimension_key';

  IF identity_unique_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE greenhouse_hiring.hiring_demographic_selfid DROP CONSTRAINT %I',
      identity_unique_name
    );
  END IF;
END
$$;

ALTER TABLE greenhouse_hiring.hiring_demographic_selfid
  ADD CONSTRAINT hiring_demographic_selfid_application_dimension_key
  UNIQUE (application_id, dimension_key);

CREATE OR REPLACE FUNCTION greenhouse_hiring.assert_demographic_selfid_application_subject()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM greenhouse_hiring.hiring_application app
    WHERE app.application_id = NEW.application_id
      AND app.identity_profile_id = NEW.identity_profile_id
  ) THEN
    RAISE EXCEPTION 'hiring_demographic_selfid application/identity mismatch.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER demographic_selfid_application_subject_trigger
  BEFORE INSERT OR UPDATE OF application_id, identity_profile_id
  ON greenhouse_hiring.hiring_demographic_selfid
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_demographic_selfid_application_subject();

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
  ON selfid.application_id = progress.application_id
 AND selfid.withdrawn_at IS NULL
 AND selfid.retention_expires_at > NOW()
CROSS JOIN stage_targets target
GROUP BY progress.cohort_month, selfid.dimension_key, selfid.category_key, target.stage, templates.template_id
HAVING COUNT(DISTINCT progress.application_id) >= 10;

COMMENT ON VIEW greenhouse_hiring.assessment_fairness IS
  'TASK-1365 aggregate-only monthly fairness projection. Self-ID is application-scoped, k=10 is enforced in PostgreSQL, and no individual identifiers are exposed.';

-- Down Migration

-- Intentional no-op. Reverting application scope could silently project a later
-- consent onto historical applications, so this privacy hardening is irreversible.
SELECT 1;
