-- Up Migration

-- TASK-1700 — capability `growth.seo.work_queue.decide` (parity con entitlements-catalog.ts y
-- con el grant en runtime.ts, los tres en el MISMO PR: el guard de cobertura
-- `capability-grant-coverage.test.ts` rompe el build si una capability `can()`-checked no
-- tiene grant a ningún rol real).
--
-- 🔴 VER Y DECIDIR SON DOS PERMISOS. `growth.seo.observation.read` abre la cola;
-- ésta habilita aceptar/diferir/descartar/marcar hecho. Un analista puede leer el plan
-- completo sin poder retirarle trabajo al equipo, y esa separación es el motivo de que la
-- capability exista en vez de reusar la de lectura.
--
-- Es el punto de CONFIRMACIÓN HUMANA del loop propose → confirm → execute: un agente puede
-- proponer la decisión, pero sólo una sesión humana con esta capability muta. El command
-- NO ejecuta nada downstream — registra el hecho y nada más.
--
-- Grant: set operador growth (mismo que target.configure / audit.run).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.seo.work_queue.decide',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1700 — Decidir sobre una entrada de la cola priorizada de trabajo SEO (accepted/deferred/dismissed/done). Append-only, anclada al sujeto y NO ejecuta ningún command downstream: es el punto de confirmación humana del loop propose -> confirm -> execute. Separada de observation.read a proposito: ver la cola y decidir sobre ella son dos permisos. Grant: set operador growth.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el seed no quedó aplicado.
DO $$
DECLARE seeded integer;
BEGIN
  SELECT COUNT(*) INTO seeded
    FROM greenhouse_core.capabilities_registry
   WHERE capability_key = 'growth.seo.work_queue.decide'
     AND deprecated_at IS NULL;

  IF seeded <> 1 THEN
    RAISE EXCEPTION 'TASK-1700 anti pre-up-marker: growth.seo.work_queue.decide NO quedó sembrada (count=%). Markers posiblemente invertidos.', seeded;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.seo.work_queue.decide'
  AND deprecated_at IS NULL;
