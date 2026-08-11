-- Up Migration

-- ISSUE-149 — paridad TS↔DB de route_group_scope (TASK-987 contract).
--
-- `greenhouse_core.roles.route_group_scope` es la fuente que gana al mintear el
-- JWT (`identity-store` → `access.ts:179`; el mapeo ROLE_ROUTE_GROUPS de
-- `role-route-mapping.ts` es solo fallback). Medido 2026-08-11: 3 roles
-- driftearon respecto del mapeo vigente — efeonce_admin sin
-- {client,finance,hr,people,my,ai_tooling} (síntoma real: el superadmin sin
-- bloque personal en el avatar tras TASK-1388), efeonce_operations y
-- hr_payroll sin {people}. El seed del rol designer (TASK-1072) declara el
-- contrato: route_group_scope DEBE igualar ROLE_ROUTE_GROUPS[role].
--
-- Idempotente: UPDATE a los valores canónicos exactos del mapeo TS.

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal','admin','client','commercial','finance','hr','people','my','ai_tooling']::TEXT[]
WHERE role_code = 'efeonce_admin';

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal','people']::TEXT[]
WHERE role_code = 'efeonce_operations';

UPDATE greenhouse_core.roles
SET route_group_scope = ARRAY['internal','hr','people']::TEXT[]
WHERE role_code = 'hr_payroll';

-- Anti pre-up-marker check: los 3 scopes deben quedar EXACTAMENTE en paridad
-- con ROLE_ROUTE_GROUPS (contención en ambos sentidos = igualdad de conjuntos).
DO $$
DECLARE
  admin_ok boolean;
  ops_ok boolean;
  payroll_ok boolean;
BEGIN
  SELECT route_group_scope @> ARRAY['internal','admin','client','commercial','finance','hr','people','my','ai_tooling']::TEXT[]
     AND route_group_scope <@ ARRAY['internal','admin','client','commercial','finance','hr','people','my','ai_tooling']::TEXT[]
    INTO admin_ok FROM greenhouse_core.roles WHERE role_code = 'efeonce_admin';

  SELECT route_group_scope @> ARRAY['internal','people']::TEXT[]
     AND route_group_scope <@ ARRAY['internal','people']::TEXT[]
    INTO ops_ok FROM greenhouse_core.roles WHERE role_code = 'efeonce_operations';

  SELECT route_group_scope @> ARRAY['internal','hr','people']::TEXT[]
     AND route_group_scope <@ ARRAY['internal','hr','people']::TEXT[]
    INTO payroll_ok FROM greenhouse_core.roles WHERE role_code = 'hr_payroll';

  IF NOT COALESCE(admin_ok, false) OR NOT COALESCE(ops_ok, false) OR NOT COALESCE(payroll_ok, false) THEN
    RAISE EXCEPTION 'ISSUE-149 anti pre-up-marker check: route_group_scope NO quedó en paridad con ROLE_ROUTE_GROUPS (admin=% ops=% payroll=%). Markers may be inverted.', admin_ok, ops_ok, payroll_ok;
  END IF;
END
$$;

-- Down Migration

-- Restaura los valores drifteados medidos el 2026-08-11 (solo para rollback
-- de emergencia; el estado deseado es el de Up).
UPDATE greenhouse_core.roles SET route_group_scope = ARRAY['admin','commercial','internal']::TEXT[] WHERE role_code = 'efeonce_admin';
UPDATE greenhouse_core.roles SET route_group_scope = ARRAY['internal']::TEXT[] WHERE role_code = 'efeonce_operations';
UPDATE greenhouse_core.roles SET route_group_scope = ARRAY['internal','hr']::TEXT[] WHERE role_code = 'hr_payroll';
