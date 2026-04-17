-- Up Migration
-- TASK-451 — Blindar password_hash contra rotaciones automáticas
-- Ver ISSUE-053 para la causa raíz.
-- Trigger de defensa: cualquier UPDATE que modifique password_hash debe estar
-- autorizado explícitamente por la transacción vía app.password_change_authorized='true'.

CREATE OR REPLACE FUNCTION greenhouse_core.guard_password_hash_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    IF current_setting('app.password_change_authorized', TRUE) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'password_hash mutation not authorized. Set app.password_change_authorized=true within the transaction (user-initiated flow only).'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION greenhouse_core.guard_password_hash_mutation() IS
  'TASK-451: rechaza escrituras a client_users.password_hash salvo que la transacción setee app.password_change_authorized=true. Ver docs/issues/open/ISSUE-053.';

DROP TRIGGER IF EXISTS client_users_password_guard ON greenhouse_core.client_users;

CREATE TRIGGER client_users_password_guard
BEFORE UPDATE ON greenhouse_core.client_users
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_password_hash_mutation();

-- Down Migration

DROP TRIGGER IF EXISTS client_users_password_guard ON greenhouse_core.client_users;
DROP FUNCTION IF EXISTS greenhouse_core.guard_password_hash_mutation();