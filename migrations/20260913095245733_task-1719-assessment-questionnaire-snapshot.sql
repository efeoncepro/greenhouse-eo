-- Up Migration

-- TASK-1719 D4: immutable questionnaire per instance. Additive; NULL is honest legacy.
ALTER TABLE greenhouse_hiring.hiring_assessment
  ADD COLUMN questionnaire_snapshot_json JSONB;

ALTER TABLE greenhouse_hiring.hiring_assessment
  ADD CONSTRAINT hiring_assessment_questionnaire_shape CHECK (
    questionnaire_snapshot_json IS NULL OR (
      method = 'candidate_test'
      AND jsonb_typeof(questionnaire_snapshot_json) = 'object'
      AND questionnaire_snapshot_json->>'version' = '1'
      AND jsonb_typeof(questionnaire_snapshot_json->'rows') = 'array'
      AND jsonb_array_length(questionnaire_snapshot_json->'rows') > 0
      AND questionnaire_snapshot_json->>'contentDigest' ~ '^[0-9a-f]{64}$'
      AND questionnaire_snapshot_json->>'policyDigest' ~ '^[0-9a-f]{64}$'
      AND questionnaire_snapshot_json ?& ARRAY['version','rows','contentDigest','policyDigest']
    )
  );

CREATE FUNCTION greenhouse_hiring.assert_assessment_questionnaire_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Even legacy NULL cannot be backfilled and represented as original evidence.
  IF NEW.questionnaire_snapshot_json IS DISTINCT FROM OLD.questionnaire_snapshot_json
     OR (OLD.questionnaire_snapshot_json IS NOT NULL AND (
       NEW.template_id IS DISTINCT FROM OLD.template_id OR
       NEW.application_id IS DISTINCT FROM OLD.application_id OR
       NEW.method IS DISTINCT FROM OLD.method)) THEN
    RAISE EXCEPTION 'assessment_questionnaire_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hiring_assessment_questionnaire_immutable
  BEFORE UPDATE ON greenhouse_hiring.hiring_assessment
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_assessment_questionnaire_immutable();

-- Internal only, contains sensitive correction data. Every consumer joins BOTH identifiers.
-- Legacy branch deliberately retains live-bank semantics; it never claims original evidence.
CREATE VIEW greenhouse_hiring.hiring_assessment_question AS
SELECT a.assessment_id, q.question_id, q.competency_id, q.level, q.type, q.prompt,
       q.options_json, q.answer_key_json, q.rubric_json,
       q.competency_key, q.competency_name, q.weight
FROM greenhouse_hiring.hiring_assessment a
CROSS JOIN LATERAL jsonb_to_recordset(a.questionnaire_snapshot_json->'rows') AS q(
  question_id TEXT, competency_id TEXT, level TEXT, type TEXT, prompt TEXT,
  options_json JSONB, answer_key_json JSONB, rubric_json JSONB,
  competency_key TEXT, competency_name TEXT, weight NUMERIC
)
WHERE a.questionnaire_snapshot_json IS NOT NULL
UNION ALL
SELECT a.assessment_id, q.question_id, q.competency_id, q.level, q.type, q.prompt,
       q.options_json, q.answer_key_json, q.rubric_json, c.key, c.name, tm.weight
FROM greenhouse_hiring.hiring_assessment a
CROSS JOIN greenhouse_hiring.hiring_question q
JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = q.competency_id
LEFT JOIN greenhouse_hiring.hiring_assessment_template_module tm
  ON tm.template_id = a.template_id AND tm.competency_id = q.competency_id
WHERE a.questionnaire_snapshot_json IS NULL;

GRANT SELECT ON greenhouse_hiring.hiring_assessment_question TO greenhouse_runtime;

-- Responses retain an FK to the bank ID. Preserve that ID even before the first response.
CREATE INDEX hiring_assessment_questionnaire_lookup
  ON greenhouse_hiring.hiring_assessment USING GIN (questionnaire_snapshot_json jsonb_path_ops)
  WHERE questionnaire_snapshot_json IS NOT NULL;

CREATE FUNCTION greenhouse_hiring.assert_snapshot_question_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.question_id IS NOT DISTINCT FROM OLD.question_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment a
             WHERE a.questionnaire_snapshot_json IS NOT NULL
               AND a.questionnaire_snapshot_json @> jsonb_build_object('rows', jsonb_build_array(jsonb_build_object('question_id', OLD.question_id)))) THEN
    RAISE EXCEPTION 'assessment_snapshot_question_referenced' USING ERRCODE = '23503';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hiring_question_snapshot_reference
  BEFORE DELETE OR UPDATE OF question_id ON greenhouse_hiring.hiring_question
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.assert_snapshot_question_reference();


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='greenhouse_hiring' AND table_name='hiring_assessment'
                   AND column_name='questionnaire_snapshot_json')
     OR to_regclass('greenhouse_hiring.hiring_assessment_question') IS NULL
     OR to_regprocedure('greenhouse_hiring.assert_assessment_questionnaire_immutable()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='hiring_assessment_questionnaire_immutable')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hiring_assessment_questionnaire_shape')
     OR to_regclass('greenhouse_hiring.hiring_assessment_questionnaire_lookup') IS NULL
     OR to_regprocedure('greenhouse_hiring.assert_snapshot_question_reference()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='hiring_question_snapshot_reference') THEN
    RAISE EXCEPTION 'TASK-1719 questionnaire snapshot migration incomplete';
  END IF;
END;
$$;

-- Down Migration
-- Never erase captured evidence to roll back application code.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment WHERE questionnaire_snapshot_json IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot remove questionnaire snapshots after use';
  END IF;
END;
$$;
DROP TRIGGER hiring_question_snapshot_reference ON greenhouse_hiring.hiring_question;
DROP FUNCTION greenhouse_hiring.assert_snapshot_question_reference();
DROP INDEX greenhouse_hiring.hiring_assessment_questionnaire_lookup;
DROP VIEW greenhouse_hiring.hiring_assessment_question;
DROP TRIGGER hiring_assessment_questionnaire_immutable ON greenhouse_hiring.hiring_assessment;
DROP FUNCTION greenhouse_hiring.assert_assessment_questionnaire_immutable();
ALTER TABLE greenhouse_hiring.hiring_assessment DROP CONSTRAINT hiring_assessment_questionnaire_shape;
ALTER TABLE greenhouse_hiring.hiring_assessment DROP COLUMN questionnaire_snapshot_json;
