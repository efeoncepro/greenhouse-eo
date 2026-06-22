-- Up Migration

-- TASK-1187 — Deprecar `space_id`/`client_id` en `vat_monthly_positions`.
--
-- Post-TASK-725 el scope fiscal del IVA es la entidad legal (operating entity);
-- la posición mensual consolida por `organization_id` y SIEMPRE escribe
-- `space_id = NULL` / `client_id = NULL` (verificado en BD viva: 30/30 filas NULL).
-- Estas columnas quedan como metadata muerta. Se marcan deprecated vía
-- COMMENT (additive, sin cambio de comportamiento). La remoción física
-- (DROP COLUMN) queda como follow-up opcional diferido.
--
-- NO se tocan `vat_ledger_entries.space_id`/`client_id`: ahí siguen vivos como
-- tag analítico de contraparte por asiento (53/56 filas non-null) — se conservan.

COMMENT ON COLUMN greenhouse_finance.vat_monthly_positions.space_id IS
  'DEPRECATED (TASK-1187, post-TASK-725): el scope fiscal es la entidad legal (organization_id); la posición consolida por entidad y esta columna queda siempre NULL. No usar como dimensión. Remoción física diferida.';

COMMENT ON COLUMN greenhouse_finance.vat_monthly_positions.client_id IS
  'DEPRECATED (TASK-1187, post-TASK-725): el scope fiscal es la entidad legal (organization_id); la posición consolida por entidad y esta columna queda siempre NULL. No usar como dimensión. Remoción física diferida.';

-- Anti pre-up-marker bug guard: aborta si el COMMENT no quedó aplicado.
DO $$
DECLARE space_comment text;
DECLARE client_comment text;
BEGIN
  SELECT col_description(c.oid, a.attnum) INTO space_comment
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'greenhouse_finance'
    AND c.relname = 'vat_monthly_positions'
    AND a.attname = 'space_id';

  SELECT col_description(c.oid, a.attnum) INTO client_comment
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'greenhouse_finance'
    AND c.relname = 'vat_monthly_positions'
    AND a.attname = 'client_id';

  IF space_comment IS NULL OR space_comment NOT LIKE 'DEPRECATED (TASK-1187%' THEN
    RAISE EXCEPTION 'TASK-1187 deprecation check: vat_monthly_positions.space_id deprecation comment was NOT applied.';
  END IF;

  IF client_comment IS NULL OR client_comment NOT LIKE 'DEPRECATED (TASK-1187%' THEN
    RAISE EXCEPTION 'TASK-1187 deprecation check: vat_monthly_positions.client_id deprecation comment was NOT applied.';
  END IF;
END
$$;

-- Down Migration

COMMENT ON COLUMN greenhouse_finance.vat_monthly_positions.space_id IS NULL;
COMMENT ON COLUMN greenhouse_finance.vat_monthly_positions.client_id IS NULL;
