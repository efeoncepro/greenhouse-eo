-- Up Migration
--
-- TASK-922 (M2) — Shadow table del atraso imputable + bucket OTD reason-aware.
-- ADR GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 §16 (M2 freeze/reason-aware).
--
-- SHADOW (no audit append-only): es una proyección derivada, recomputada por el
-- consumer reactivo `notion_attributable_lateness_compute` (UPSERT por task,
-- último cómputo gana). NO la lee el bono — gated por ATTRIBUTABLE_LATENESS_OTD_ENABLED
-- (default OFF). El cutover del bono es una task futura gated (8 stop-gates + HR).
--
-- Diseño (decisión M2): el cómputo del freeze (multi-ciclo, 3-estado, clamp
-- post-fairDeadline) + fairDeadline (desde reschedules con reason confirmado) vive
-- en el helper TS canónico `calculateAttributableLateness` (source of truth), NO
-- en un mirror BQ (no mantenible en paridad). Esta tabla persiste su output en PG
-- (donde viven las fuentes: tasks + task_status_transitions + task_due_date_changes).
-- Mirror del patrón RpA V2 (TASK-913/916): helper + snapshot + reactive consumer.
--
-- Almacena DOS buckets para medir la divergencia POR freeze (paridad shadow):
--   bucket_attributable (freeze ON) vs bucket_no_freeze (mismos inputs, freeze OFF).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Shadow table (UPSERT por task)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_delivery.task_attributable_lateness_shadow (
  task_source_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  -- Fecha justa = original + Σ extensiones cliente/scope confirmadas.
  fair_deadline DATE NULL,

  -- Atraso imputable (días, puede ser fraccional por timestamps).
  attributable_days_late NUMERIC NOT NULL DEFAULT 0,
  frozen_days_excluded NUMERIC NOT NULL DEFAULT 0,

  -- Bucket reason-aware con freeze ON (lo que alimentaría el bono al cutover).
  bucket_attributable TEXT NOT NULL CHECK (bucket_attributable IN (
    'on_time', 'late_drop', 'overdue', 'carry_over', 'not_applicable'
  )),

  -- Mismo input pero freeze OFF — baseline para medir la divergencia POR freeze.
  bucket_no_freeze TEXT NOT NULL CHECK (bucket_no_freeze IN (
    'on_time', 'late_drop', 'overdue', 'carry_over', 'not_applicable'
  )),

  -- Bucket legacy synced (performance_indicator_code) al momento del cómputo,
  -- para auditar divergencia vs el clasificador actual (nullable — puede faltar).
  bucket_legacy TEXT NULL,

  data_status TEXT NOT NULL CHECK (data_status IN ('valid', 'unavailable', 'legacy_unknown')),
  formula_version TEXT NOT NULL,

  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: divergencia por freeze (signal shadow_paridad).
CREATE INDEX IF NOT EXISTS task_attributable_lateness_shadow_divergence_idx
  ON greenhouse_delivery.task_attributable_lateness_shadow (computed_at DESC)
  WHERE bucket_attributable <> bucket_no_freeze;

-- Hot path: filas valid (excluye unavailable/legacy_unknown de las métricas).
CREATE INDEX IF NOT EXISTS task_attributable_lateness_shadow_status_idx
  ON greenhouse_delivery.task_attributable_lateness_shadow (data_status, computed_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Ownership + grants (canonical Greenhouse)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_delivery.task_attributable_lateness_shadow OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_delivery.task_attributable_lateness_shadow
  TO greenhouse_runtime;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Anti pre-up-marker guard (TASK-768 / ISSUE-068 canonical pattern)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  table_exists BOOLEAN;
  divergence_idx_exists BOOLEAN;
  bucket_check_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_delivery'
      AND table_name = 'task_attributable_lateness_shadow'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_delivery'
      AND indexname = 'task_attributable_lateness_shadow_divergence_idx'
  ) INTO divergence_idx_exists;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'greenhouse_delivery'
      AND t.relname = 'task_attributable_lateness_shadow'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%bucket_attributable%'
  ) INTO bucket_check_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-922 anti pre-up-marker: greenhouse_delivery.task_attributable_lateness_shadow was NOT created. Migration markers may be inverted.';
  END IF;

  IF NOT divergence_idx_exists THEN
    RAISE EXCEPTION 'TASK-922 anti pre-up-marker: task_attributable_lateness_shadow_divergence_idx NOT created.';
  END IF;

  IF NOT bucket_check_exists THEN
    RAISE EXCEPTION 'TASK-922 anti pre-up-marker: bucket_attributable CHECK constraint NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_delivery.task_attributable_lateness_shadow_status_idx;
DROP INDEX IF EXISTS greenhouse_delivery.task_attributable_lateness_shadow_divergence_idx;
DROP TABLE IF EXISTS greenhouse_delivery.task_attributable_lateness_shadow;
