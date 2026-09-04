-- Up Migration
-- Capabilities registry parity backfill (detectado 2026-09-04 por el test live
-- `src/lib/capabilities-registry/parity.live.test.ts` durante TASK-1631).
--
-- Once capabilities existen en `src/config/entitlements-catalog.ts` (y se `can()`-chequean en runtime)
-- pero nunca recibieron su fila en `greenhouse_core.capabilities_registry`, violando la regla
-- "capability ⇒ seed en registry + catálogo TS en el mismo PR" (CLAUDE.md §Capability ⇒ grant coverage).
-- Tasks de origen: TASK-1211 (commercial.quote.simulate), TASK-1269 (fix_it.generate), TASK-1279
-- (lead.open), TASK-1242 (lead_handoff.execute), TASK-1239 (report.publish), TASK-1235 (report.read),
-- TASK-1243 (report.read_client), TASK-1244 (report.review), TASK-1255 (lead_pii.reveal), commit
-- ece391362 sin task (public_site.bridge.inspect) y TASK-1225 (comparison_table.author).
--
-- `module` y `allowed_actions` copian EXACTAMENTE el catálogo TS (el checker compara ambos);
-- `allowed_scopes` es superset del `defaultScope` TS. El catálogo TS NO se toca.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('commercial.quote.simulate', 'commercial', ARRAY['read'], ARRAY['tenant'],
   'TASK-1211 — Simular una cotización (read parity) sin persistir; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.fix_it.generate', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1269 — Generar artefactos fix-it del AI Visibility Grader; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.lead.open', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1279 — Enviar el reporte AEO y abrir oportunidad/lead con consentimiento; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.lead_handoff.execute', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1242 — Ejecutar el handoff de lead AI Visibility a HubSpot; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.report.publish', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1239 — Publicar snapshot público del grader report; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.report.read', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1235 — Leer el grader report interno; backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.report.read_client', 'growth', ARRAY['read'], ARRAY['own', 'organization'],
   'TASK-1243 — Leer el grader report de la propia organización cliente (grader_profile↔org); backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.ai_visibility.report.review', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1244 — Revisar evidencia del grader report (state machine + ledger); backfill de paridad 2026-09-04.', NOW(), NULL),
  ('growth.forms.lead_pii.reveal', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1255 — Revelar PII de un lead de forms con razón + audit (Ley 21.719); backfill de paridad 2026-09-04.', NOW(), NULL),
  ('platform.public_site.bridge.inspect', 'platform', ARRAY['read'], ARRAY['all'],
   'Public site bridge inspection API (commit ece391362, 2026-06-14, sin task); backfill de paridad 2026-09-04.', NOW(), NULL),
  ('platform.public_site.comparison_table.author', 'platform', ARRAY['execute'], ARRAY['all'],
   'TASK-1225 — Autorar tablas comparativas del sitio público (command gobernado); backfill de paridad 2026-09-04.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT count(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'commercial.quote.simulate',
    'growth.ai_visibility.fix_it.generate',
    'growth.ai_visibility.lead.open',
    'growth.ai_visibility.lead_handoff.execute',
    'growth.ai_visibility.report.publish',
    'growth.ai_visibility.report.read',
    'growth.ai_visibility.report.read_client',
    'growth.ai_visibility.report.review',
    'growth.forms.lead_pii.reveal',
    'platform.public_site.bridge.inspect',
    'platform.public_site.comparison_table.author'
  ) AND deprecated_at IS NULL;
  IF seeded_count <> 11 THEN
    RAISE EXCEPTION 'capabilities-registry-parity-backfill anti pre-up-marker check: se esperaban 11 capabilities activas y hay %.', seeded_count;
  END IF;
END
$$;

-- Down Migration

-- Se deprecan, nunca se borran (patrón TASK-840).
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key IN (
   'commercial.quote.simulate',
   'growth.ai_visibility.fix_it.generate',
   'growth.ai_visibility.lead.open',
   'growth.ai_visibility.lead_handoff.execute',
   'growth.ai_visibility.report.publish',
   'growth.ai_visibility.report.read',
   'growth.ai_visibility.report.read_client',
   'growth.ai_visibility.report.review',
   'growth.forms.lead_pii.reveal',
   'platform.public_site.bridge.inspect',
   'platform.public_site.comparison_table.author'
 );
