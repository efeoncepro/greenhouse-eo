-- Up Migration

-- ────────────────────────────────────────────────────────────────────────────
-- TASK-1169 — OTD imputable alineado a la cohorte member×month del bono (shadow)
--
-- Materialización SHADOW (ningún consumer productivo la lee; el bono no cambia).
-- Grano = member×month, idéntico a `metrics_by_member` del bono. Solo el OTD
-- corregido por freeze + sus counts (NO duplica las 22 métricas de
-- `metrics_by_member` → respeta SSOT). Decisión B′-PG
-- (ADR GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 §16.10).
--
-- Diseño delta: baseline legacy = recompute LIVE del reader canónico del bono
-- (`computeMemberMetricsBatch`; el materializado de períodos cerrados está
-- stale, probe 2026-06-19). Los candidatos mejorables (late_drop + overdue) se
-- enumeran de BQ `v_tasks_enriched` con la expresión canónica del bono; los
-- flips salen de la intersección con el M2 shadow PG
-- `task_attributable_lateness_shadow`. El freeze mejora el OTD por DOS
-- mecanismos: numerador (`late_drop → on_time`) y denominador
-- (`overdue → carry_over`, sale del denominador). Harness auto-validante:
-- `cohort_reproduced` exige reproducir el legacy antes de confiar el corregido;
-- si no reproduce → `cohort_mismatch` + `otd_pct_corrected = null` (NUNCA 0).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Tabla shadow member×month
CREATE TABLE IF NOT EXISTS greenhouse_delivery.otd_attributable_member_month_shadow (
  member_id TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  -- Baseline legacy (recompute live del reader canónico del bono)
  otd_pct_legacy NUMERIC NULL,
  on_time_count INTEGER NOT NULL DEFAULT 0,
  late_drop_count INTEGER NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  eligible_task_count INTEGER NOT NULL DEFAULT 0,

  -- Corrección de freeze (delta sobre el baseline, dos mecanismos)
  otd_pct_corrected NUMERIC NULL,
  numerator_flip_count INTEGER NOT NULL DEFAULT 0, -- late_drop → on_time (sube numerador)
  denominator_drop_count INTEGER NOT NULL DEFAULT 0, -- overdue → carry_over (sale del denominador)
  improvable_candidate_count INTEGER NOT NULL DEFAULT 0, -- late_drop + overdue en cohorte
  freeze_covered_count INTEGER NOT NULL DEFAULT 0, -- candidatos con fila en el M2 shadow

  -- Harness auto-validante + degradación honesta
  cohort_reproduced BOOLEAN NOT NULL DEFAULT FALSE,
  data_status TEXT NOT NULL CHECK (data_status IN ('valid', 'cohort_mismatch', 'unavailable', 'no_freeze_data')),
  formula_version TEXT NOT NULL,

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Grano canónico = member×month (idéntico a metrics_by_member del bono)
  PRIMARY KEY (member_id, period_year, period_month),

  -- Invariantes de robustez (no exhaustivos; el helper TS es SSOT)
  CONSTRAINT otd_attr_mm_flips_within_candidates CHECK (
    numerator_flip_count + denominator_drop_count <= improvable_candidate_count
  ),
  CONSTRAINT otd_attr_mm_corrected_ge_legacy CHECK (
    otd_pct_corrected IS NULL OR otd_pct_legacy IS NULL OR otd_pct_corrected >= otd_pct_legacy
  )
);

-- 1b. Índices de lectura (signal member-month + reconciliación por período)
CREATE INDEX IF NOT EXISTS otd_attr_mm_period_idx
  ON greenhouse_delivery.otd_attributable_member_month_shadow (period_year, period_month);

CREATE INDEX IF NOT EXISTS otd_attr_mm_divergence_idx
  ON greenhouse_delivery.otd_attributable_member_month_shadow (period_year, period_month)
  WHERE data_status = 'valid' AND otd_pct_corrected IS DISTINCT FROM otd_pct_legacy;

CREATE INDEX IF NOT EXISTS otd_attr_mm_status_idx
  ON greenhouse_delivery.otd_attributable_member_month_shadow (data_status, computed_at DESC);

-- 2. Ownership + grants (canonical Greenhouse)
ALTER TABLE greenhouse_delivery.otd_attributable_member_month_shadow OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.otd_attributable_member_month_shadow
  TO greenhouse_runtime;

-- 3. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
DO $$
DECLARE
  table_exists BOOLEAN;
  pk_exists BOOLEAN;
  flips_check_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'otd_attributable_member_month_shadow'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'otd_attributable_member_month_shadow'
      AND constraint_type = 'PRIMARY KEY'
  ) INTO pk_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'greenhouse_delivery'
      AND constraint_name = 'otd_attr_mm_flips_within_candidates'
  ) INTO flips_check_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1169 anti pre-up-marker check: greenhouse_delivery.otd_attributable_member_month_shadow was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT pk_exists THEN
    RAISE EXCEPTION 'TASK-1169 anti pre-up-marker check: PRIMARY KEY (member_id, period_year, period_month) missing.';
  END IF;

  IF NOT flips_check_exists THEN
    RAISE EXCEPTION 'TASK-1169 anti pre-up-marker check: CHECK otd_attr_mm_flips_within_candidates missing.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_delivery.otd_attributable_member_month_shadow;
