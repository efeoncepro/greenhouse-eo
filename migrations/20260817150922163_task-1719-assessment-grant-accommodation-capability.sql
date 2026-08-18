-- Up Migration

-- TASK-1719 — Capability del write path de ajustes razonables (accommodations) sobre la
-- evaluación de un candidato. Cierra la Open Question 7 del ADR de assignment policy.
-- Seed idempotente en capabilities_registry espejando el catálogo TS + el grant en
-- runtime.ts (mismo PR: el guard `capability-grant-coverage.test.ts` rompe el build si no).
--
-- Por qué una capability propia y NO `hiring.assessment.author`: autorar el banco de preguntas
-- es craft de contenido; conceder una adaptación es una decisión de People sobre UNA persona
-- concreta, con trazabilidad de quién la otorgó y cuándo. Verbos y radios distintos.
--
-- Grant role-only (EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS), el mismo tier de
-- gobernanza que `hiring.application.decide` y `hiring.assessment.policy.govern`.
-- Deliberadamente SIN routeGroup `internal`: todo tenant interno lo porta incondicionalmente,
-- así que incluirlo dejaría que collaborator/designer/people_viewer alteren las condiciones de
-- rendición de una prueba. NUNCA client_*.
--
-- El MOTIVO del ajuste no se persiste en ninguna columna: revelaría condición de discapacidad
-- (categoría protegida). Se guarda sólo el arreglo operativo (minutos) + actor + timestamp.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.grant_accommodation', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1719 — Otorgar un ajuste razonable (tiempo extra, 1..180 min) sobre un candidate_test en assigned/sent/in_progress. Persiste SOLO el arreglo operativo + grantedBy + grantedAt; el motivo del ajuste NUNCA se guarda (categoría protegida). Grant role-only: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
   NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el seed no quedó aplicado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'hiring.assessment.grant_accommodation'
    AND deprecated_at IS NULL;
  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1719 anti pre-up-marker check: grant_accommodation capability NOT seeded (count=%).', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.assessment.grant_accommodation'
  AND deprecated_at IS NULL;
