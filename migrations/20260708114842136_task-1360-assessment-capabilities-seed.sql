-- Up Migration

-- TASK-1360 Slice 5 — Capabilities del Assessment Engine (3). Seed idempotente en
-- capabilities_registry espejando el catálogo TS + grants en runtime.ts (mismo PR).
-- Grant: read+author a internal ∪ EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS ∪ EFEONCE_ACCOUNT;
-- score (execute) least-privilege sin comercial. NUNCA client_*.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-1360 — Leer catálogo de competencias, plantillas, instancias y scorecard de assessment. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.assessment.author', 'hiring', ARRAY['create', 'update'], ARRAY['tenant'],
   'TASK-1360 — Crear/editar preguntas (SME gate) + plantillas + asignar instancias de assessment. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.assessment.score', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1360 — Registrar/corregir puntaje humano + finalizar assessment (rollup advisory). Verbo execute (gobernanza). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
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
  WHERE capability_key IN ('hiring.assessment.read', 'hiring.assessment.author', 'hiring.assessment.score')
    AND deprecated_at IS NULL;
  IF seeded_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1360 anti pre-up-marker check: assessment capabilities NOT seeded (count=%).', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('hiring.assessment.read', 'hiring.assessment.author', 'hiring.assessment.score')
  AND deprecated_at IS NULL;
