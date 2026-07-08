-- Up Migration

-- TASK-353 Slice 4 — Capabilities V1 del dominio Hiring / ATS (8).
-- Seed idempotente en capabilities_registry (SSOT DB) espejando el catálogo TS
-- (src/config/entitlements-catalog.ts) + grants en runtime.ts (mismo PR).
-- publish/decide se modelan como verbo `execute` (gobernanza: publicar un opening /
-- decidir una postulación son commands, no CRUD). Grant: internal ∪ EFEONCE_ADMIN ∪
-- HR_MANAGER ∪ EFEONCE_OPERATIONS (∪ EFEONCE_ACCOUNT para read/write). NUNCA client_*.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.demand.read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-353 — Leer demandas de talento (TalentDemand). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.demand.write', 'hiring', ARRAY['create', 'update'], ARRAY['tenant'],
   'TASK-353 — Crear/actualizar demandas de talento. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.opening.read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-353 — Leer openings (HiringOpening) internos. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.opening.write', 'hiring', ARRAY['create', 'update'], ARRAY['tenant'],
   'TASK-353 — Crear/actualizar openings (incluye editar el payload público). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.opening.publish', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-353 — Publicar/despublicar un opening (proyección pública allowlist). Verbo execute (gobernanza). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
   NOW(), NULL),
  ('hiring.application.read', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-353 — Leer postulaciones (HiringApplication), unidad del pipeline. Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.application.write', 'hiring', ARRAY['create', 'update'], ARRAY['tenant'],
   'TASK-353 — Crear/actualizar postulaciones (incluye reconciliar candidate facet + cambiar stage). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS + EFEONCE_ACCOUNT.',
   NOW(), NULL),
  ('hiring.application.decide', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-353 — Decidir una postulación (selected/rejected/…) + snapshot de handoff. Verbo execute (gobernanza). Grant: internal + EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
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
  WHERE capability_key IN (
    'hiring.demand.read', 'hiring.demand.write', 'hiring.opening.read', 'hiring.opening.write',
    'hiring.opening.publish', 'hiring.application.read', 'hiring.application.write', 'hiring.application.decide')
    AND deprecated_at IS NULL;

  IF seeded_count <> 8 THEN
    RAISE EXCEPTION 'TASK-353 anti pre-up-marker check: hiring capabilities NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'hiring.demand.read', 'hiring.demand.write', 'hiring.opening.read', 'hiring.opening.write',
  'hiring.opening.publish', 'hiring.application.read', 'hiring.application.write', 'hiring.application.decide')
  AND deprecated_at IS NULL;
