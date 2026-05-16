-- Up Migration

-- TASK-893 V1.1 follow-up (2026-05-16) — projected_payroll_snapshots gana 3
-- columnas NULLABLE para reflejar la ventana de participation efectiva del
-- miembro cuando `prorationFactor < 1` (mid-month entry / exit). Cero impact
-- backward-compat: rows existentes quedan NULL en estos campos; consumers
-- legacy que sólo leen `working_days_cut` / `working_days_total` siguen
-- operando idénticamente.
--
-- Distinción semántica canonical (arch-architect verdict 2026-05-16):
--
--   - working_days_cut / working_days_total: días hábiles del PERÍODO
--     calendar-derived (global, mismo valor para todos los miembros).
--   - participation_working_days: días hábiles efectivos del MIEMBRO en su
--     ventana de participation. NULL cuando full-period.
--   - participation_start_date / participation_end_date: ventana exacta del
--     miembro (mirror eligibleFrom / eligibleTo del resolver TASK-893).
--
-- Bug latente cubierto en TASK-898 V1.2: misma ambigüedad en payroll_entries.
-- working_days_in_period (DB persistido por buildPayrollEntry runtime).
-- Migration + columna en payroll_entries queda V1.2.

ALTER TABLE greenhouse_serving.projected_payroll_snapshots
  ADD COLUMN IF NOT EXISTS participation_working_days INTEGER NULL,
  ADD COLUMN IF NOT EXISTS participation_start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS participation_end_date DATE NULL;

COMMENT ON COLUMN greenhouse_serving.projected_payroll_snapshots.participation_working_days IS
  'TASK-893 V1.1 — días hábiles efectivos del miembro en su ventana de participation. NULL cuando full-period (prorationFactor = 1). Distinto de working_days_cut (calendar-derived global).';

COMMENT ON COLUMN greenhouse_serving.projected_payroll_snapshots.participation_start_date IS
  'TASK-893 V1.1 — fecha de inicio efectiva de participation del miembro en el período (eligibleFrom del resolver). NULL cuando full-period.';

COMMENT ON COLUMN greenhouse_serving.projected_payroll_snapshots.participation_end_date IS
  'TASK-893 V1.1 — fecha de fin efectiva de participation del miembro en el período (eligibleTo del resolver). NULL cuando full-period o open-ended.';

-- Anti pre-up-marker check (CLAUDE.md canonical regla migration markers).
-- Aborta si las 3 columns NO quedaron realmente creadas en la tabla.
DO $$
DECLARE
  expected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_serving'
    AND table_name = 'projected_payroll_snapshots'
    AND column_name IN ('participation_working_days', 'participation_start_date', 'participation_end_date');

  IF expected_count <> 3 THEN
    RAISE EXCEPTION 'TASK-893 V1.1 anti pre-up-marker check: expected 3 participation_* columns in projected_payroll_snapshots, got %', expected_count;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_serving.projected_payroll_snapshots
  DROP COLUMN IF EXISTS participation_working_days,
  DROP COLUMN IF EXISTS participation_start_date,
  DROP COLUMN IF EXISTS participation_end_date;
