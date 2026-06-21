-- Up Migration

-- TASK-1193 — Finance fiscal/document action capability gates (Wave 2 F9).
-- Seed de 16 capabilities finas por acción para las mutaciones de documentos
-- fiscales/financieros: DTE emission (single + batch), income/expenses create/update/
-- payment, income factoring, HES lifecycle (create/submit/approve/reject) y purchase
-- orders (create/update/cancel). Grant (runtime.ts, mismo PR): FINANCE_ADMIN +
-- EFEONCE_ADMIN (write); FINANCE_ANALYST read-only. La capability es SOLO gate de
-- acceso; la emisión DTE sigue por Nubox, los pagos por los readers normalizados y la
-- state machine de HES en command/DB.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('finance.income.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Crear documento de ingreso. POST /api/finance/income.', NOW(), NULL),
  ('finance.income.update', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Editar documento de ingreso. PUT /api/finance/income/[id].', NOW(), NULL),
  ('finance.income.emit_dte', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Emitir DTE de un ingreso (Nubox). POST /api/finance/income/[id]/emit-dte.', NOW(), NULL),
  ('finance.income.batch_emit_dte', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Emisión batch de DTE. POST /api/finance/income/batch-emit-dte.', NOW(), NULL),
  ('finance.income.record_payment', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Registrar/reconciliar pago de ingreso. POST /api/finance/income/[id]/payment(s) + /reconcile-payments.', NOW(), NULL),
  ('finance.income.factor', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Registrar cesión de facturas (factoring). POST /api/finance/income/[id]/factor.', NOW(), NULL),
  ('finance.expenses.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Crear gasto (single + bulk). POST /api/finance/expenses, /expenses/bulk.', NOW(), NULL),
  ('finance.expenses.update', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Editar gasto. PUT /api/finance/expenses/[id].', NOW(), NULL),
  ('finance.expenses.record_payment', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Registrar pago de gasto. POST /api/finance/expenses/[id]/payments.', NOW(), NULL),
  ('finance.hes.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Crear HES (hoja de entrada de servicio). POST /api/finance/hes.', NOW(), NULL),
  ('finance.hes.submit', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Enviar HES a aprobación. POST /api/finance/hes/[id]/submit.', NOW(), NULL),
  ('finance.hes.approve', 'finance', ARRAY['approve'], ARRAY['tenant'], 'TASK-1193 — Aprobar HES. POST /api/finance/hes/[id]/approve.', NOW(), NULL),
  ('finance.hes.reject', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Rechazar HES. POST /api/finance/hes/[id]/reject.', NOW(), NULL),
  ('finance.purchase_orders.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1193 — Crear orden de compra. POST /api/finance/purchase-orders.', NOW(), NULL),
  ('finance.purchase_orders.update', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Editar orden de compra. PUT /api/finance/purchase-orders/[id].', NOW(), NULL),
  ('finance.purchase_orders.cancel', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1193 — Cancelar orden de compra. POST /api/finance/purchase-orders/[id]/cancel.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: aborta si los 16 seeds no quedaron realmente aplicados.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'finance.income.create', 'finance.income.update', 'finance.income.emit_dte',
    'finance.income.batch_emit_dte', 'finance.income.record_payment', 'finance.income.factor',
    'finance.expenses.create', 'finance.expenses.update', 'finance.expenses.record_payment',
    'finance.hes.create', 'finance.hes.submit', 'finance.hes.approve', 'finance.hes.reject',
    'finance.purchase_orders.create', 'finance.purchase_orders.update', 'finance.purchase_orders.cancel'
  )
    AND deprecated_at IS NULL;

  IF seeded_count <> 16 THEN
    RAISE EXCEPTION 'TASK-1193 anti pre-up-marker check: expected 16 capabilities seeded, found %. Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'finance.income.create', 'finance.income.update', 'finance.income.emit_dte',
  'finance.income.batch_emit_dte', 'finance.income.record_payment', 'finance.income.factor',
  'finance.expenses.create', 'finance.expenses.update', 'finance.expenses.record_payment',
  'finance.hes.create', 'finance.hes.submit', 'finance.hes.approve', 'finance.hes.reject',
  'finance.purchase_orders.create', 'finance.purchase_orders.update', 'finance.purchase_orders.cancel'
)
  AND deprecated_at IS NULL;
