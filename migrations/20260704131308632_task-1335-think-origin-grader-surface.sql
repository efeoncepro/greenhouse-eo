-- Up Migration

-- TASK-1335 — Autorizar `https://think.efeoncepro.com` SOLO para la surface del
-- AI Visibility Grader (`fhsf-ai-visibility-grader`, hoy `origin_allowlist_json=[]`).
-- Con esto el origin de Think entra a la UNIÓN gobernada de transporte CORS (resolver
-- de `src/app/api/public/growth/forms/cors.ts`) Y habilita la surface-auth del submit
-- del grader (por si Think manda `surfaceId`). Doble defensa alineada, cero drift.
--
-- Additive + idempotente: APPEND sin duplicar. NUNCA `replace` del array. NO toca
-- `fhsf-efeonce-aeo-diagnostic` (la surface de `/aeo-2`) ni `fhsf-efeonce-lead-gen-web`.

UPDATE greenhouse_growth.form_host_surface
   SET origin_allowlist_json = origin_allowlist_json || '["https://think.efeoncepro.com"]'::jsonb,
       updated_at = NOW()
 WHERE surface_id = 'fhsf-ai-visibility-grader'
   AND NOT origin_allowlist_json @> '["https://think.efeoncepro.com"]'::jsonb;

-- Anti pre-up-marker bug guard: aborta si el origin NO quedó en la surface del grader.
DO $$
DECLARE origin_present boolean;
BEGIN
  SELECT origin_allowlist_json @> '["https://think.efeoncepro.com"]'::jsonb
    INTO origin_present
    FROM greenhouse_growth.form_host_surface
   WHERE surface_id = 'fhsf-ai-visibility-grader';

  IF origin_present IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'TASK-1335: https://think.efeoncepro.com NOT present in fhsf-ai-visibility-grader.origin_allowlist_json after append (surface missing or update failed).';
  END IF;
END
$$;

-- Down Migration

-- Quita SOLO el origin de Think de la surface del grader (append reversible).
UPDATE greenhouse_growth.form_host_surface
   SET origin_allowlist_json = origin_allowlist_json - 'https://think.efeoncepro.com',
       updated_at = NOW()
 WHERE surface_id = 'fhsf-ai-visibility-grader';
