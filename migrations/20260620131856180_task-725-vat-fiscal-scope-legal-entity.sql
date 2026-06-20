-- Up Migration

-- TASK-725 — Re-scope del IVA del `space_id` operacional a la entidad legal
-- (operating entity). El IVA / F29 se declara por RUT (una entidad legal = una
-- posición consolidada/mes), no por space/cliente. Esta migración relaja la
-- dependencia de `space_id` para que el materializador pueda agrupar por
-- `organization_id` (operating entity) e incluir documentos sin space (overhead).
-- `space_id`/`client_id` quedan como ETIQUETA analítica de contraparte (nullable).
-- Cierra la causa de datos de ISSUE-101 (crédito fiscal excluido por el filtro
-- `space_id IS NOT NULL`).

-- 1. space_id deja de ser obligatorio (relajación forward-only de NOT NULL).
ALTER TABLE greenhouse_finance.vat_ledger_entries
  ALTER COLUMN space_id DROP NOT NULL;

ALTER TABLE greenhouse_finance.vat_monthly_positions
  ALTER COLUMN space_id DROP NOT NULL;

-- 2. La unicidad de la posición pasa de (space_id, periodo) a
--    (organization_id = operating entity, periodo): 1 posición por entidad
--    legal por mes. Parcial porque organization_id es nullable.
DROP INDEX IF EXISTS greenhouse_finance.vat_monthly_positions_space_period_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS vat_monthly_positions_org_period_uniq
  ON greenhouse_finance.vat_monthly_positions (organization_id, period_year, period_month)
  WHERE organization_id IS NOT NULL;

-- 3. Anti pre-up-marker bug guard: aborta si la nullability o el índice no
--    quedaron como se espera.
DO $$
DECLARE
  ledger_space_nullable text;
  position_space_nullable text;
  org_uniq_exists boolean;
BEGIN
  SELECT is_nullable INTO ledger_space_nullable
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_finance'
    AND table_name = 'vat_ledger_entries'
    AND column_name = 'space_id';

  SELECT is_nullable INTO position_space_nullable
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_finance'
    AND table_name = 'vat_monthly_positions'
    AND column_name = 'space_id';

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_finance'
      AND indexname = 'vat_monthly_positions_org_period_uniq'
  ) INTO org_uniq_exists;

  IF ledger_space_nullable <> 'YES' THEN
    RAISE EXCEPTION 'TASK-725 anti pre-up-marker check: vat_ledger_entries.space_id NO quedó nullable.';
  END IF;

  IF position_space_nullable <> 'YES' THEN
    RAISE EXCEPTION 'TASK-725 anti pre-up-marker check: vat_monthly_positions.space_id NO quedó nullable.';
  END IF;

  IF NOT org_uniq_exists THEN
    RAISE EXCEPTION 'TASK-725 anti pre-up-marker check: índice vat_monthly_positions_org_period_uniq NO fue creado.';
  END IF;
END
$$;

-- Down Migration

-- Revierte el swap de índice de unicidad. La relajación de NOT NULL es
-- forward-only (restaurarla fallaría si ya existen filas con space_id NULL,
-- que es justamente el estado objetivo del re-scope); las columnas quedan
-- nullable a propósito.
DROP INDEX IF EXISTS greenhouse_finance.vat_monthly_positions_org_period_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS vat_monthly_positions_space_period_uniq
  ON greenhouse_finance.vat_monthly_positions (space_id, period_year, period_month);
