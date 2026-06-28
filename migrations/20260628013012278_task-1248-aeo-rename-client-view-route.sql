-- Up Migration

-- TASK-1248 — Naming pass AEO: la vista cliente pasa de `/growth/ai-visibility/report` (filtra la taxonomía
-- interna "growth" en una URL de cliente) a `/aeo` (término de mercado, client-clean), y el label a "AEO".
-- Forward-fix idempotente sobre el seed previo (migración 20260627204627526). No toca grants.

UPDATE greenhouse_core.view_registry
SET route_path = '/aeo',
    label = 'AEO',
    description = 'Informe AEO client-scoped (TASK-1248): puntaje, dimensiones, plan AEO y tendencia. Deep-link, sin evidencia cruda.',
    updated_at = NOW(),
    updated_by = 'migration:TASK-1248-aeo-rename'
WHERE view_code = 'cliente.ai_visibility_report';

-- Anti pre-up-marker guard: aborta si el route_path no quedó actualizado.
DO $$
DECLARE
  renamed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO renamed_count
  FROM greenhouse_core.view_registry
  WHERE view_code = 'cliente.ai_visibility_report' AND route_path = '/aeo' AND label = 'AEO';

  IF renamed_count < 1 THEN
    RAISE EXCEPTION 'TASK-1248 AEO rename check: cliente.ai_visibility_report no quedó en /aeo (got %)', renamed_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.view_registry
SET route_path = '/growth/ai-visibility/report',
    label = 'Visibilidad en IA',
    updated_at = NOW(),
    updated_by = 'migration:TASK-1248-aeo-rename:down'
WHERE view_code = 'cliente.ai_visibility_report';