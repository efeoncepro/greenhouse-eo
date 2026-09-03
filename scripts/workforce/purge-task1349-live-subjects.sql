-- TASK-1349 — purga QUIRÚRGICA de los sujetos SINTÉTICOS del live smoke (2026-09-03).
-- Alcance: SOLO members con display_name 'TASK-1349 live %' Y primary_email 't1349-…@efeoncepro.com', sus perfiles,
-- usuarios y todas las filas que los referencian (member_id / profile_id / identity_profile_id / user_id /
-- aggregate_id) en los schemas greenhouse_*. Ninguna persona real cumple ese predicado. Aborta si el conjunto está
-- vacío o si algún member del conjunto no es sintético.
-- Ejecutar UNA vez con: pnpm pg:connect:shell  →  \i scripts/workforce/purge-task1349-live-subjects.sql
BEGIN;

CREATE TEMP TABLE purge_members ON COMMIT DROP AS
  SELECT member_id, identity_profile_id AS profile_id
    FROM greenhouse_core.members
   WHERE display_name LIKE 'TASK-1349 live %' AND primary_email LIKE 't1349-%@efeoncepro.com';

CREATE TEMP TABLE purge_users ON COMMIT DROP AS
  SELECT user_id FROM greenhouse_core.client_users
   WHERE identity_profile_id IN (SELECT profile_id FROM purge_members) OR email LIKE 't1349-%@efeoncepro.com';

CREATE TEMP TABLE purge_aggregates ON COMMIT DROP AS
  SELECT member_id AS id FROM purge_members
  UNION SELECT profile_id FROM purge_members WHERE profile_id IS NOT NULL
  UNION SELECT user_id FROM purge_users
  UNION SELECT offboarding_case_id FROM greenhouse_hr.work_relationship_offboarding_cases WHERE member_id IN (SELECT member_id FROM purge_members)
  UNION SELECT relationship_id FROM greenhouse_core.person_legal_entity_relationships WHERE profile_id IN (SELECT profile_id FROM purge_members);

DO $$
DECLARE
  n_members integer;
  n_real integer;
  r record;
  deleted integer;
  total integer := 0;
  pass integer := 0;
  progress boolean := TRUE;
BEGIN
  SELECT count(*) INTO n_members FROM purge_members;
  IF n_members = 0 THEN RAISE EXCEPTION 'purge: conjunto vacío — nada que borrar'; END IF;
  SELECT count(*) INTO n_real FROM greenhouse_core.members m JOIN purge_members p USING (member_id)
   WHERE m.display_name NOT LIKE 'TASK-1349 live %';
  IF n_real > 0 THEN RAISE EXCEPTION 'purge: % member(s) no sintéticos en el conjunto — ABORT', n_real; END IF;
  RAISE NOTICE 'purge: % members sintéticos, % usuarios', n_members, (SELECT count(*) FROM purge_users);

  -- Borrado iterativo: cada pasada intenta todas las tablas referenciantes; las que fallan por FK se reintentan
  -- en la siguiente pasada hasta que no haya progreso.
  WHILE progress AND pass < 12 LOOP
    progress := FALSE; pass := pass + 1;
    FOR r IN
      SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
       WHERE c.table_schema LIKE 'greenhouse%'
         AND c.column_name IN ('member_id','profile_id','identity_profile_id','user_id','aggregate_id')
         AND NOT (c.table_schema = 'greenhouse_core' AND c.table_name IN ('members','client_users','identity_profiles'))
    LOOP
      BEGIN
        IF r.column_name = 'member_id' THEN
          EXECUTE format('DELETE FROM %I.%I WHERE %I IN (SELECT member_id FROM purge_members)', r.table_schema, r.table_name, r.column_name);
        ELSIF r.column_name IN ('profile_id','identity_profile_id') THEN
          EXECUTE format('DELETE FROM %I.%I WHERE %I IN (SELECT profile_id FROM purge_members)', r.table_schema, r.table_name, r.column_name);
        ELSIF r.column_name = 'user_id' THEN
          EXECUTE format('DELETE FROM %I.%I WHERE %I IN (SELECT user_id FROM purge_users)', r.table_schema, r.table_name, r.column_name);
        ELSE
          EXECUTE format('DELETE FROM %I.%I WHERE %I IN (SELECT id FROM purge_aggregates)', r.table_schema, r.table_name, r.column_name);
        END IF;
        GET DIAGNOSTICS deleted = ROW_COUNT;
        IF deleted > 0 THEN
          total := total + deleted; progress := TRUE;
          RAISE NOTICE 'pass % — %.% (%): % fila(s)', pass, r.table_schema, r.table_name, r.column_name, deleted;
        END IF;
      EXCEPTION WHEN foreign_key_violation THEN
        progress := TRUE; -- reintentar en la siguiente pasada
      WHEN undefined_column OR datatype_mismatch OR invalid_text_representation THEN
        NULL; -- columna con otro tipo/semántica: no aplica
      END;
    END LOOP;
  END LOOP;

  DELETE FROM greenhouse_core.client_users WHERE user_id IN (SELECT user_id FROM purge_users);
  GET DIAGNOSTICS deleted = ROW_COUNT; total := total + deleted; RAISE NOTICE 'client_users: %', deleted;
  DELETE FROM greenhouse_core.members WHERE member_id IN (SELECT member_id FROM purge_members);
  GET DIAGNOSTICS deleted = ROW_COUNT; total := total + deleted; RAISE NOTICE 'members: %', deleted;
  DELETE FROM greenhouse_core.identity_profiles WHERE profile_id IN (SELECT profile_id FROM purge_members);
  GET DIAGNOSTICS deleted = ROW_COUNT; total := total + deleted; RAISE NOTICE 'identity_profiles: %', deleted;
  RAISE NOTICE 'purge total: % fila(s) en % pasadas', total, pass;
END $$;

COMMIT;

SELECT count(*) AS remaining_synthetic_members FROM greenhouse_core.members WHERE display_name LIKE 'TASK-1349 live %';
SELECT count(*) AS remaining_synthetic_users FROM greenhouse_core.client_users WHERE email LIKE 't1349-%@efeoncepro.com';
