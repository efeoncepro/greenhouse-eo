-- Up Migration

-- TASK-1735 hardening (auditoría arch M1 / talent #4, 2026-08-16): la inmutabilidad de
-- proposed_json/input_digest/application_id de una propuesta era solo de código. El
-- terminal-once pasa a ser estructural: UPDATE solo sobre las columnas de decisión.

REVOKE UPDATE ON greenhouse_hiring.hiring_application_dossier_proposal FROM greenhouse_runtime;
GRANT UPDATE (status, decision_note, confirmed_by, confirmed_at, updated_at)
  ON greenhouse_hiring.hiring_application_dossier_proposal TO greenhouse_runtime;

DO $$
DECLARE broad_update boolean; col_update boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='greenhouse_hiring' AND table_name='hiring_application_dossier_proposal'
      AND grantee='greenhouse_runtime' AND privilege_type='UPDATE'
  ) INTO broad_update;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_column_grants
    WHERE table_schema='greenhouse_hiring' AND table_name='hiring_application_dossier_proposal'
      AND grantee='greenhouse_runtime' AND privilege_type='UPDATE' AND column_name='status'
  ) INTO col_update;

  IF broad_update OR NOT col_update THEN
    RAISE EXCEPTION 'TASK-1735 column-grant hardening check failed: broad=% col=%', broad_update, col_update;
  END IF;
END
$$;

-- Down Migration

REVOKE UPDATE (status, decision_note, confirmed_by, confirmed_at, updated_at)
  ON greenhouse_hiring.hiring_application_dossier_proposal FROM greenhouse_runtime;
GRANT UPDATE ON greenhouse_hiring.hiring_application_dossier_proposal TO greenhouse_runtime;
