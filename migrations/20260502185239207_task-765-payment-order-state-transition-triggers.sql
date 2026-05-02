-- Up Migration

-- TASK-765 Slice 6: Trigger PG anti-zombie sobre payment_orders.
-- Defense in depth complementaria al CHECK constraint estatico
-- (slice 1) y a los TS guards (`assertSourceAccountForPaid`,
-- `assertValidPaymentOrderStateTransition`). Si el TS guard se
-- bypassa por alguna razon (admin SQL, futuro auto-scheduler con bug,
-- migration mal hecha), este trigger lo bloquea con mensaje legible.
--
-- Reglas enforced:
--
-- 1. state='paid' EXIGE paid_at IS NOT NULL.
-- 2. state='paid' EXIGE source_account_id IS NOT NULL.
-- 3. Transiciones de estado deben matchear la matrix canonica que mirror
--    `src/lib/finance/payment-orders/transitions.ts`. Test de paridad
--    TS<->SQL en transitions.test.ts asegura que ambas no se desincronicen.

CREATE OR REPLACE FUNCTION greenhouse_finance.assert_payment_order_state_invariants()
RETURNS TRIGGER AS $$
BEGIN
  -- Invariante 1: state='paid' requiere paid_at.
  IF NEW.state = 'paid' AND NEW.paid_at IS NULL THEN
    RAISE EXCEPTION 'payment_orders_paid_requires_paid_at: order=% NEW.state=paid pero paid_at IS NULL', NEW.order_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Invariante 2: state='paid' requiere source_account_id (mirror del CHECK
  -- constraint, pero con error mas legible y trazable a TS code path).
  IF NEW.state = 'paid' AND NEW.source_account_id IS NULL THEN
    RAISE EXCEPTION 'payment_orders_paid_requires_source_account_id: order=% — selecciona la cuenta bancaria origen antes de marcar como pagada', NEW.order_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Invariante 3: matrix de transiciones canonica (mirror de TRANSITION_MATRIX
  -- en src/lib/finance/payment-orders/transitions.ts).
  -- Solo aplica en UPDATE cuando hay cambio real de estado.
  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    IF NOT (
      (OLD.state = 'draft' AND NEW.state IN ('pending_approval', 'cancelled')) OR
      (OLD.state = 'pending_approval' AND NEW.state IN ('approved', 'cancelled', 'draft')) OR
      (OLD.state = 'approved' AND NEW.state IN ('scheduled', 'submitted', 'paid', 'cancelled')) OR
      (OLD.state = 'scheduled' AND NEW.state IN ('submitted', 'paid', 'cancelled')) OR
      (OLD.state = 'submitted' AND NEW.state IN ('paid', 'failed', 'cancelled')) OR
      (OLD.state = 'paid' AND NEW.state IN ('settled', 'cancelled')) OR
      (OLD.state = 'settled' AND NEW.state = 'closed') OR
      (OLD.state = 'failed' AND NEW.state IN ('approved', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'payment_orders_invalid_state_transition: order=% from=% to=% no esta en la matrix permitida', NEW.order_id, OLD.state, NEW.state
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT OR UPDATE: enforce desde el primer write.
-- NO incluye DELETE — el delete es responsabilidad del cascade FK existente
-- y de las politicas de retention (no del state machine).
CREATE TRIGGER payment_orders_anti_zombie_trigger
  BEFORE INSERT OR UPDATE ON greenhouse_finance.payment_orders
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_payment_order_state_invariants();


-- Down Migration

DROP TRIGGER IF EXISTS payment_orders_anti_zombie_trigger ON greenhouse_finance.payment_orders;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_payment_order_state_invariants();
