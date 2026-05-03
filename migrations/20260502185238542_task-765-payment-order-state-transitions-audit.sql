-- Up Migration

-- TASK-765 Slice 6: Audit log append-only de transiciones de estado de
-- payment_orders. Hoy el outbox tiene los eventos pero es read-once para
-- el reactor — no es la fuente de verdad historica que un auditor pueda
-- consultar mucho despues. Esta tabla es esa fuente.
--
-- Append-only enforcement: trigger BEFORE UPDATE OR DELETE prohibe
-- cualquier modificacion. La unica forma de modificar el log es INSERT.
-- Para correcciones (errores en `actor_user_id` o `reason`), insertar una
-- nueva fila con `metadata_json.correction_of = <transition_id>`.

CREATE TABLE greenhouse_finance.payment_order_state_transitions (
  transition_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  actor_user_id TEXT,
  reason TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payment_order_state_transitions_order_idx
  ON greenhouse_finance.payment_order_state_transitions (order_id, occurred_at);

-- Index parcial para queries de slice 7 (reliability signals): filtrar
-- transiciones a estados terminales recientes para detectar paid sin
-- expense_payment downstream.
CREATE INDEX payment_order_state_transitions_to_state_idx
  ON greenhouse_finance.payment_order_state_transitions (to_state, occurred_at)
  WHERE to_state IN ('paid', 'settled', 'closed', 'cancelled', 'failed');

-- Append-only enforcement.
CREATE OR REPLACE FUNCTION greenhouse_finance.assert_state_transitions_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'payment_order_state_transitions es append-only. Para correcciones, insertar nueva fila con metadata_json.correction_of=<transition_id>';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_order_state_transitions_no_update_trigger
  BEFORE UPDATE ON greenhouse_finance.payment_order_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_state_transitions_append_only();

CREATE TRIGGER payment_order_state_transitions_no_delete_trigger
  BEFORE DELETE ON greenhouse_finance.payment_order_state_transitions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_state_transitions_append_only();

-- Backfill defensivo: para cada payment_order existente que ya este en
-- estados post-creacion, insertar fila sintetica con `from_state='unknown_legacy'`
-- y metadata indicando legacy. Esto da continuidad al log para auditoria
-- historica sin reconstruir el camino real.
INSERT INTO greenhouse_finance.payment_order_state_transitions (
  transition_id, order_id, from_state, to_state, actor_user_id, reason,
  metadata_json, occurred_at
)
SELECT
  'pst-legacy-' || order_id AS transition_id,
  order_id,
  'unknown_legacy' AS from_state,
  state AS to_state,
  COALESCE(approved_by, created_by) AS actor_user_id,
  'TASK-765 backfill defensivo — estado post-creacion sin historia previa al audit log' AS reason,
  jsonb_build_object('legacy', TRUE, 'backfilled_at', NOW()::text) AS metadata_json,
  COALESCE(paid_at, approved_at, submitted_at, created_at) AS occurred_at
FROM greenhouse_finance.payment_orders
WHERE state <> 'draft';


-- Down Migration

DROP TRIGGER IF EXISTS payment_order_state_transitions_no_delete_trigger
  ON greenhouse_finance.payment_order_state_transitions;
DROP TRIGGER IF EXISTS payment_order_state_transitions_no_update_trigger
  ON greenhouse_finance.payment_order_state_transitions;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_state_transitions_append_only();
DROP TABLE IF EXISTS greenhouse_finance.payment_order_state_transitions;
