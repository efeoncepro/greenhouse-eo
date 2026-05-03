-- Up Migration

-- TASK-765 Slice 1: Hard-gate source_account_id
--
-- Cuando una payment_order transiciona a un estado terminal (paid/settled/closed),
-- DEBE tener source_account_id NOT NULL. Hoy la tabla acepta NULL en cualquier
-- estado, lo que permitio el incidente 2026-05-01 donde 2 ordenes quedaron paid
-- sin cuenta origen y por ende sin afectar account_balances downstream.
--
-- Patron NOT VALID + VALIDATE diferido: agregar el CHECK como NOT VALID protege
-- todas las INSERT/UPDATE futuras sin escanear la tabla; despues del backfill
-- (slice 8) se puede VALIDATE para enforcement total. Mientras tanto, las dos
-- ordenes zombie del incidente quedan visibles via:
--   SELECT order_id, title, paid_at FROM greenhouse_finance.payment_orders
--   WHERE state IN ('paid','settled','closed') AND source_account_id IS NULL;
--
-- El triger anti-zombie de slice 6 hace enforcement complementario a nivel de
-- transicion (BEFORE INSERT/UPDATE) y es el gate dinamico que produce el error
-- legible para el operator. Este CHECK es la red de seguridad estatica.

ALTER TABLE greenhouse_finance.payment_orders
  ADD CONSTRAINT payment_orders_source_account_required_when_paid CHECK (
    state IN ('draft', 'pending_approval', 'approved', 'submitted', 'cancelled', 'failed')
    OR source_account_id IS NOT NULL
  ) NOT VALID;


-- Down Migration

ALTER TABLE greenhouse_finance.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_source_account_required_when_paid;
