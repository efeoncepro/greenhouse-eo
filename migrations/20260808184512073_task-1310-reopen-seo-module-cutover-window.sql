-- Up Migration

-- TASK-1310 follow-up — reabrir la ventana expand/contract del cutover `seo_v1 → seo_v2`.
--
-- INCIDENTE (2026-08-08, ISSUE-118): la migración `20260808131441444_task-1310-seo-client-view-codes`
-- hizo expand Y contract en el MISMO paso — creó `seo_v2`, le asignó las orgs, y de inmediato
-- superseded los assignments `seo_v1` poniéndoles `effective_to`. El contract llegó antes de que
-- TODOS los runtimes tuvieran el dual-read `SEO_MODULE_KEYS_READ`: Vercel producción corre `main`,
-- que todavía pide `seo_v1` literal. Resultado medido contra producción: Grupo Berel y Efeonce
-- pasaron a `hasModule=false` y los cinco lanes ecosystem devolvieron `greenhouse_seo_lane_404`.
--
-- Esta migración reabre la ventana: devuelve `effective_to = NULL` a los assignments `seo_v1`
-- superseded, dejando AMBAS claves vigentes durante la migración. El resolver de entitlement filtra
-- `module_key = ANY(SEO_MODULE_KEYS_READ)` con `ORDER BY created_at DESC LIMIT 1`, así que NO hay
-- doble conteo de cuota ni de presupuesto: el runtime con dual-read toma `seo_v2` (más nuevo) y el
-- runtime viejo toma `seo_v1`.
--
-- ⚠️ El contract real —superseder `seo_v1`— NO va acá. Va en su propia migración, y sólo después de
-- que `main` tenga el dual-read desplegado y verificado con el canary del provider contra
-- `https://greenhouse.efeoncepro.com`. Ese es el punto entero del patrón expand/contract:
-- "never breaking-change in a single deploy".

UPDATE greenhouse_client_portal.module_assignments
   SET effective_to = NULL,
       updated_at = NOW()
 WHERE module_key = 'seo_v1'
   AND status IN ('active', 'pilot')
   AND effective_to IS NOT NULL;

-- Anti pre-up-marker bug guard + invariante de la ventana: mientras el cutover esté abierto, ambas
-- claves deben cubrir EXACTAMENTE las mismas organizaciones. Una ventana asimétrica es justo el
-- estado que tumbó producción (unas orgs resolubles por un runtime y no por el otro).
DO $$
DECLARE
  v1_count integer;
  v2_count integer;
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO v1_count
  FROM greenhouse_client_portal.module_assignments
  WHERE module_key = 'seo_v1' AND effective_to IS NULL AND status IN ('active', 'pilot');

  SELECT COUNT(*) INTO v2_count
  FROM greenhouse_client_portal.module_assignments
  WHERE module_key = 'seo_v2' AND effective_to IS NULL AND status IN ('active', 'pilot');

  IF v1_count <> v2_count THEN
    RAISE EXCEPTION
      'TASK-1310 reopen: ventana de cutover asimetrica (seo_v1=% vigentes, seo_v2=%). Ambas claves deben cubrir las mismas orgs mientras el dual-read este abierto.',
      v1_count, v2_count;
  END IF;

  SELECT COUNT(*) INTO orphan_count
  FROM (
    SELECT organization_id FROM greenhouse_client_portal.module_assignments
     WHERE module_key = 'seo_v2' AND effective_to IS NULL AND status IN ('active', 'pilot')
    EXCEPT
    SELECT organization_id FROM greenhouse_client_portal.module_assignments
     WHERE module_key = 'seo_v1' AND effective_to IS NULL AND status IN ('active', 'pilot')
  ) AS orphans;

  IF orphan_count <> 0 THEN
    RAISE EXCEPTION
      'TASK-1310 reopen: % organizacion(es) con seo_v2 vigente pero sin seo_v1 vigente. Un runtime sin dual-read las veria sin modulo.',
      orphan_count;
  END IF;
END
$$;

-- Down Migration

-- El undo es volver a cerrar la ventana (estado inmediatamente posterior a la migración de
-- viewCodes). Reversible y sin pérdida: `effective_to` es un marcador de vigencia, no un DELETE.
UPDATE greenhouse_client_portal.module_assignments
   SET effective_to = CURRENT_DATE,
       updated_at = NOW()
 WHERE module_key = 'seo_v1'
   AND status IN ('active', 'pilot')
   AND effective_to IS NULL;
