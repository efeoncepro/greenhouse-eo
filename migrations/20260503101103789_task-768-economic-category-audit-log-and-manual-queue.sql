-- Up Migration

-- TASK-768 Slice 3 — Audit log append-only + manual queue para backfill de
-- economic_category. Pattern reusa el shape de TASK-765
-- (payment_order_state_transitions): trigger anti-update/delete, timestamp
-- automatico, evidence_json para audit trail completo.

-- 1. Audit log append-only del resolver (cada resolucion que escribe la
--    columna queda registrada con la regla matched, confidence, evidence).

CREATE TABLE greenhouse_finance.economic_category_resolution_log (
  log_id              TEXT PRIMARY KEY,
  target_kind         TEXT NOT NULL CHECK (target_kind IN ('expense', 'income')),
  target_id           TEXT NOT NULL,
  resolved_category   TEXT NOT NULL,
  matched_rule        TEXT NOT NULL,
  confidence          TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'manual_required')),
  evidence_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_by         TEXT NOT NULL,
  resolved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_finance.economic_category_resolution_log IS
  'TASK-768: append-only audit log de cada resolucion del resolver canonico. '
  'Cada fila documenta como una expense_id o income_id recibio su economic_category. '
  'Trigger anti-update/delete (mismo patron TASK-765) garantiza inmutabilidad.';

CREATE INDEX economic_category_resolution_log_target_idx
  ON greenhouse_finance.economic_category_resolution_log (target_kind, target_id);

CREATE INDEX economic_category_resolution_log_batch_idx
  ON greenhouse_finance.economic_category_resolution_log (batch_id)
  WHERE batch_id IS NOT NULL;

-- 2. Manual queue: filas que el resolver no pudo clasificar con confidence
--    suficiente (low / manual_required). Operador resuelve via UI Slice 6.

CREATE TABLE greenhouse_finance.economic_category_manual_queue (
  queue_id            TEXT PRIMARY KEY,
  target_kind         TEXT NOT NULL CHECK (target_kind IN ('expense', 'income')),
  target_id           TEXT NOT NULL,
  candidate_category  TEXT,
  candidate_confidence TEXT CHECK (candidate_confidence IN ('high', 'medium', 'low', 'manual_required')),
  candidate_rule      TEXT,
  candidate_evidence  JSONB DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'resolved', 'archived')),
  resolved_by         TEXT,
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT economic_category_manual_queue_unique
    UNIQUE (target_kind, target_id)
);

COMMENT ON TABLE greenhouse_finance.economic_category_manual_queue IS
  'TASK-768: cola de filas pendientes de clasificacion manual. UI Slice 6 '
  'expone /admin/finance/data-quality/economic-category-queue para resolver. '
  'Filas resueltas mantienen status=resolved + auditoria.';

CREATE INDEX economic_category_manual_queue_pending_idx
  ON greenhouse_finance.economic_category_manual_queue (created_at)
  WHERE status = 'pending';

-- 3. Trigger anti-update/delete del audit log (pattern TASK-765)

CREATE OR REPLACE FUNCTION greenhouse_finance.assert_economic_category_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'economic_category_resolution_log es append-only. Para correcciones, insertar nueva fila con evidence_json.correction_of referenciando la fila original.'
    USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER economic_category_resolution_log_no_update_trigger
  BEFORE UPDATE ON greenhouse_finance.economic_category_resolution_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_economic_category_log_append_only();

CREATE TRIGGER economic_category_resolution_log_no_delete_trigger
  BEFORE DELETE ON greenhouse_finance.economic_category_resolution_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_economic_category_log_append_only();

-- 4. Trigger updated_at automatico en manual queue

CREATE OR REPLACE FUNCTION greenhouse_finance.economic_category_queue_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER economic_category_manual_queue_touch_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.economic_category_manual_queue
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.economic_category_queue_touch_updated_at();

-- Down Migration

DROP TRIGGER IF EXISTS economic_category_manual_queue_touch_updated_at_trigger ON greenhouse_finance.economic_category_manual_queue;
DROP FUNCTION IF EXISTS greenhouse_finance.economic_category_queue_touch_updated_at();
DROP TRIGGER IF EXISTS economic_category_resolution_log_no_delete_trigger ON greenhouse_finance.economic_category_resolution_log;
DROP TRIGGER IF EXISTS economic_category_resolution_log_no_update_trigger ON greenhouse_finance.economic_category_resolution_log;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_economic_category_log_append_only();
DROP TABLE IF EXISTS greenhouse_finance.economic_category_manual_queue;
DROP TABLE IF EXISTS greenhouse_finance.economic_category_resolution_log;
