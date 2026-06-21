-- Up Migration

-- TASK-1192 — Finance payment & treasury capability gates (Wave 1 F9).
-- Seed de 13 capabilities finas por acción para las mutaciones más sensibles de
-- pagos/tesorería (Payment Orders lifecycle, bank accounts/transfers, settlement
-- payment, shareholder current account). Cierran el gap "acceso al módulo Finance"
-- vs "puede ejecutar ESTA acción financiera". Grant (runtime.ts, mismo PR):
-- FINANCE_ADMIN + EFEONCE_ADMIN (write); FINANCE_ANALYST queda read-only.
-- La capability es SOLO gate de acceso; los invariantes (state machine, source
-- account, anti-zombie, outbox) siguen viviendo en command/DB.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('finance.payment_orders.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Crear payment order. POST /api/admin/finance/payment-orders.', NOW(), NULL),
  ('finance.payment_orders.update', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Editar payment order draft. PATCH /api/admin/finance/payment-orders/[orderId].', NOW(), NULL),
  ('finance.payment_orders.submit', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Enviar payment order a aprobación. POST .../[orderId]/submit.', NOW(), NULL),
  ('finance.payment_orders.approve', 'finance', ARRAY['approve'], ARRAY['tenant'], 'TASK-1192 — Aprobar payment order. POST .../[orderId]/approve.', NOW(), NULL),
  ('finance.payment_orders.schedule', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Programar payment order. POST .../[orderId]/schedule.', NOW(), NULL),
  ('finance.payment_orders.mark_paid', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Marcar payment order como pagada (rebaja banco atómica). POST .../[orderId]/mark-paid.', NOW(), NULL),
  ('finance.payment_orders.cancel', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Cancelar payment order. POST .../[orderId]/cancel.', NOW(), NULL),
  ('finance.bank_accounts.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Crear cuenta bancaria/instrumento de tesorería. POST /api/finance/bank.', NOW(), NULL),
  ('finance.bank_accounts.update', 'finance', ARRAY['update'], ARRAY['tenant'], 'TASK-1192 — Editar cuenta bancaria. POST /api/finance/bank/[accountId].', NOW(), NULL),
  ('finance.bank_transfers.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Registrar transferencia interna entre cuentas. POST /api/finance/bank/transfer.', NOW(), NULL),
  ('finance.settlements.record_payment', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Registrar pago de settlement. POST /api/finance/settlements/payment.', NOW(), NULL),
  ('finance.shareholder_account.create', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Crear cuenta corriente de accionista. POST /api/finance/shareholder-account.', NOW(), NULL),
  ('finance.shareholder_account.record_movement', 'finance', ARRAY['create'], ARRAY['tenant'], 'TASK-1192 — Registrar movimiento de cuenta corriente de accionista. POST /api/finance/shareholder-account/[id]/movements.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard: aborta si los 13 seeds no quedaron realmente aplicados.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'finance.payment_orders.create', 'finance.payment_orders.update', 'finance.payment_orders.submit',
    'finance.payment_orders.approve', 'finance.payment_orders.schedule', 'finance.payment_orders.mark_paid',
    'finance.payment_orders.cancel', 'finance.bank_accounts.create', 'finance.bank_accounts.update',
    'finance.bank_transfers.create', 'finance.settlements.record_payment',
    'finance.shareholder_account.create', 'finance.shareholder_account.record_movement'
  )
    AND deprecated_at IS NULL;

  IF seeded_count <> 13 THEN
    RAISE EXCEPTION 'TASK-1192 anti pre-up-marker check: expected 13 capabilities seeded, found %. Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'finance.payment_orders.create', 'finance.payment_orders.update', 'finance.payment_orders.submit',
  'finance.payment_orders.approve', 'finance.payment_orders.schedule', 'finance.payment_orders.mark_paid',
  'finance.payment_orders.cancel', 'finance.bank_accounts.create', 'finance.bank_accounts.update',
  'finance.bank_transfers.create', 'finance.settlements.record_payment',
  'finance.shareholder_account.create', 'finance.shareholder_account.record_movement'
)
  AND deprecated_at IS NULL;
