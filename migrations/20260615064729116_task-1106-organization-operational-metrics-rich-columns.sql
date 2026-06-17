-- Up Migration
--
-- TASK-1106 — Account 360 delivery serving contract hardening (closes ISSUE-087 / Sentry JAVASCRIPT-NEXTJS-7H).
--
-- `greenhouse_serving.organization_operational_metrics` nació como cache operativo COMPACTO y nunca
-- tuvo las columnas ricas que el facet `delivery` empezó a leer (rpa_median / pipeline_velocity /
-- stuck_asset_pct). El reader `src/lib/account-360/facets/delivery.ts` une esta tabla con
-- `ico_organization_metrics` (que SÍ las tiene) y SELECTea las 3 columnas en AMBAS ramas del UNION,
-- produciendo `column "rpa_median" does not exist` (42703) contra la rama compacta.
--
-- Decisión de contrato (TASK-1106 Slice 1): PARITY. Se enriquece la tabla compacta con las 3 columnas
-- (nullable, additive) y se backfillea desde `ico_organization_metrics` por (organization_id,
-- period_year, period_month). Así el contrato queda EXPLÍCITO y alineado entre DDL, setup SQL,
-- proyección, tipos y reader canónico, en lugar de un shape implícito que "parece" parity.
--
-- BigQuery `ico_engine.metrics_by_organization` sigue siendo el source of truth analítico;
-- `greenhouse_serving.*` es serving cache read-optimized. Las columnas replican exactamente las
-- precisiones de `ico_organization_metrics` (rpa_median NUMERIC(6,2), pipeline_velocity NUMERIC(8,2),
-- stuck_asset_pct NUMERIC(5,2)).

ALTER TABLE greenhouse_serving.organization_operational_metrics
  ADD COLUMN IF NOT EXISTS rpa_median        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pipeline_velocity NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS stuck_asset_pct   NUMERIC(5,2);

-- Backfill acotado desde el espejo rico, casando por la PK natural compartida.
UPDATE greenhouse_serving.organization_operational_metrics AS oom
SET
  rpa_median        = iom.rpa_median,
  pipeline_velocity = iom.pipeline_velocity,
  stuck_asset_pct   = iom.stuck_asset_pct
FROM greenhouse_serving.ico_organization_metrics AS iom
WHERE oom.organization_id = iom.organization_id
  AND oom.period_year = iom.period_year
  AND oom.period_month = iom.period_month;

-- Anti pre-up-marker bug guard (CLAUDE.md "Database — Migration markers"): aborta si el DDL no quedó
-- realmente aplicado (markers invertidos / sección Up vacía).
DO $$
DECLARE present_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO present_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_serving'
    AND table_name = 'organization_operational_metrics'
    AND column_name IN ('rpa_median', 'pipeline_velocity', 'stuck_asset_pct');

  IF present_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1106 anti pre-up-marker: expected 3 rich columns on greenhouse_serving.organization_operational_metrics, found %', present_count;
  END IF;
END
$$;

-- Las columnas additive heredan los grants existentes de la tabla (greenhouse_app / greenhouse_ops);
-- no se requieren GRANTs nuevos a nivel columna.

-- Down Migration

ALTER TABLE greenhouse_serving.organization_operational_metrics
  DROP COLUMN IF EXISTS rpa_median,
  DROP COLUMN IF EXISTS pipeline_velocity,
  DROP COLUMN IF EXISTS stuck_asset_pct;
