-- Up Migration

-- TASK-1072 Rollout — asignar el rol `designer` (ADITIVO) a Daniela Ferreira,
-- Andrés Carlosama y Melkin Hernández (decisión del operador 2026-06-10).
--
-- Regla del operador: los 3 reciben `designer` ADEMÁS de `collaborator`. NO se les
-- quita ningún rol existente; Daniela conserva su `efeonce_operations` (los "otros
-- roles adicionales" mencionados). Aditivo + idempotente.
--
-- Lifecycle-aware (TASK-987): la nueva fila es active=TRUE, status='active',
-- effective_from=NOW(), effective_to=NULL — el predicado canónico de derivación de
-- acceso (active AND (effective_to IS NULL OR effective_to > now())) la cuenta.
-- INSERT ... SELECT ... WHERE NOT EXISTS (no hay unique constraint en
-- (user_id, role_code); el guard evita duplicar un grant activo). Re-correr es seguro.
--
-- Los 3 ya tienen `collaborator` activo (verificado live) — no se re-inserta. Solo
-- se agrega `designer`. session_360 deriva route_groups+role_codes en vivo desde
-- user_role_assignments; no requiere refresh adicional (la sesión vigente lo toma al
-- próximo login / refresh de sesión).

INSERT INTO greenhouse_core.user_role_assignments
  (assignment_id, user_id, role_code, status, active, effective_from, effective_to, assigned_by_user_id, created_at, updated_at)
SELECT
  'ura-task1072-designer-' || u.user_id,
  u.user_id,
  'designer',
  'active',
  TRUE,
  NOW(),
  NULL,
  'migration:TASK-1072',
  NOW(),
  NOW()
FROM (VALUES
  ('user-efeonce-internal-daniela-ferreira'),
  ('user-efeonce-internal-andres-carlosama'),
  ('user-efeonce-internal-melkin-hernandez')
) AS u(user_id)
WHERE NOT EXISTS (
  SELECT 1 FROM greenhouse_core.user_role_assignments ura
   WHERE ura.user_id = u.user_id
     AND ura.role_code = 'designer'
     AND ura.active
     AND (ura.effective_to IS NULL OR ura.effective_to > NOW())
);

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE assigned integer;
BEGIN
  SELECT COUNT(*) INTO assigned
    FROM greenhouse_core.user_role_assignments
   WHERE role_code = 'designer'
     AND active
     AND (effective_to IS NULL OR effective_to > NOW())
     AND user_id IN (
       'user-efeonce-internal-daniela-ferreira',
       'user-efeonce-internal-andres-carlosama',
       'user-efeonce-internal-melkin-hernandez'
     );

  IF assigned < 3 THEN
    RAISE EXCEPTION 'TASK-1072 anti pre-up-marker: expected 3 active designer assignments, got %. Markers may be inverted.', assigned;
  END IF;
END
$$;

-- Down Migration

-- Lifecycle-aware revert (NO row delete): cierra el grant designer de los 3 marcándolo
-- inactivo + effective_to=NOW(). Preserva audit + NO toca collaborator ni efeonce_operations.
UPDATE greenhouse_core.user_role_assignments
SET active = FALSE, status = 'revoked', effective_to = NOW(), updated_at = NOW()
WHERE role_code = 'designer'
  AND assigned_by_user_id = 'migration:TASK-1072'
  AND user_id IN (
    'user-efeonce-internal-daniela-ferreira',
    'user-efeonce-internal-andres-carlosama',
    'user-efeonce-internal-melkin-hernandez'
  );
