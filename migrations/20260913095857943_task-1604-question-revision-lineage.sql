-- Up Migration
CREATE TABLE greenhouse_hiring.hiring_question_revision (
  source_question_id TEXT PRIMARY KEY REFERENCES greenhouse_hiring.hiring_question(question_id) ON DELETE RESTRICT,
  revision_question_id TEXT NOT NULL UNIQUE REFERENCES greenhouse_hiring.hiring_question(question_id) ON DELETE RESTRICT,
  source_digest TEXT NOT NULL CHECK (source_digest ~ '^[0-9a-f]{64}$'),
  target_digest TEXT NOT NULL CHECK (target_digest ~ '^[0-9a-f]{64}$'),
  actor_user_id TEXT NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_question_id <> revision_question_id)
);
CREATE FUNCTION greenhouse_hiring.assert_question_revision_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'assessment_question_revision_append_only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER hiring_question_revision_append_only BEFORE UPDATE OR DELETE
  ON greenhouse_hiring.hiring_question_revision FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hiring.assert_question_revision_append_only();
GRANT SELECT, INSERT ON greenhouse_hiring.hiring_question_revision TO greenhouse_runtime;
DO $$
BEGIN
  IF to_regclass('greenhouse_hiring.hiring_question_revision') IS NULL
     OR to_regprocedure('greenhouse_hiring.assert_question_revision_append_only()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='hiring_question_revision_append_only') THEN
    RAISE EXCEPTION 'TASK-1604 question revision migration incomplete';
  END IF;
END;
$$;
-- Down Migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_question_revision) THEN
    RAISE EXCEPTION 'Cannot remove question revision history after use';
  END IF;
END;
$$;
DROP TRIGGER hiring_question_revision_append_only ON greenhouse_hiring.hiring_question_revision;
DROP FUNCTION greenhouse_hiring.assert_question_revision_append_only();
DROP TABLE greenhouse_hiring.hiring_question_revision;
