-- Up Migration

-- TASK-1204 Slice 1 — Corrección de la tasa PPM.
-- TASK-1189 sembró `ppm_rate_config` con un placeholder 0,25% (`source =
-- 'placeholder_pending_contador'`) explícitamente pendiente de validación
-- contable. El F29 real de mayo 2026 del SII confirma la tasa vigente: 0,125%
-- (línea 70: base 5.800.000 × 0,125% = 7.250). Esto corrige el doble que
-- veníamos materializando (14.500 → 7.250).
--
-- Idempotente: sólo toca filas aún en placeholder. La re-materialización de las
-- posiciones PPM corre aparte (runtime).

SET search_path TO public, greenhouse_finance;

UPDATE greenhouse_finance.ppm_rate_config
SET rate = 0.00125,
    source = 'sii_f29_confirmed_2026'
WHERE source = 'placeholder_pending_contador';

-- Anti pre-up-marker guard: aborta si quedó alguna fila en placeholder (señal de
-- que el UPDATE no aplicó).
DO $$
DECLARE stale_count integer;
BEGIN
  SELECT COUNT(*) INTO stale_count
  FROM greenhouse_finance.ppm_rate_config
  WHERE source = 'placeholder_pending_contador';

  IF stale_count > 0 THEN
    RAISE EXCEPTION 'TASK-1204 PPM rate check: % filas siguen en placeholder_pending_contador tras el UPDATE.', stale_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_finance.ppm_rate_config
SET rate = 0.0025,
    source = 'placeholder_pending_contador'
WHERE source = 'sii_f29_confirmed_2026';