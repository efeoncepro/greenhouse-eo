-- Up Migration

-- TASK-1714 Slice 1 — Capability del reveal de identidad de un CANDIDATO. Seed idempotente en
-- capabilities_registry espejando el catálogo TS + grant en runtime.ts (mismo PR).
--
-- Por qué una capability propia y NO `person.legal_profile.reveal_sensitive`: esa vive en el
-- módulo `hr`, sólo la portan FINANCE_ADMIN + EFEONCE_ADMIN, y granteársela al tier que opera
-- Hiring abriría el reveal sobre TODA persona del módulo (colaboradores, ex-colaboradores y sus
-- direcciones). El radio de ésta es exacto: la identidad de un candidato.
--
-- Grant role-only (EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS), el mismo tier de gobernanza
-- que `hiring.application.decide`. Deliberadamente SIN routeGroup `internal`: todo tenant interno
-- lo porta incondicionalmente, así que incluirlo convertiría el reveal de PII en un permiso de
-- facto universal. NUNCA client_*.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.candidate.reveal_identity', 'hiring', ARRAY['read'], ARRAY['tenant'],
   'TASK-1714 — Revelar el valor completo del documento de identidad de un candidato (capability + motivo >=5 chars + audit append-only). El candidato se ancla por identity_profile_id/candidate_facet_id, NUNCA por member_id. Grant role-only: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.',
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
  WHERE capability_key = 'hiring.candidate.reveal_identity'
    AND deprecated_at IS NULL;
  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1714 anti pre-up-marker check: reveal_identity capability NOT seeded (count=%).', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'hiring.candidate.reveal_identity'
  AND deprecated_at IS NULL;
