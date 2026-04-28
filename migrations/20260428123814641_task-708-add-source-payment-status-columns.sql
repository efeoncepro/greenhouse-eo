-- Up Migration
--
-- TASK-708 Slice 0 — D2: separate source_payment_status from canonical payment_status
-- ===================================================================================
-- Hoy, lo que dice Nubox sobre "pagado segun documento" se mezcla con el
-- canonical payment_status que deberia derivar SOLO de payments canonicos
-- Greenhouse. Aca separamos:
--
--   - income.source_payment_status / expenses.source_payment_status (NUEVO)
--     Lo que dice el documento upstream (Nubox: 'pagado', 'pendiente', etc).
--     Es informativo, audit-grade. UI puede mostrarlo como pill diferenciado.
--
--   - income.payment_status / expenses.payment_status (EXISTENTE)
--     Estado canonico de caja Greenhouse. Derivado por trigger desde SUM
--     de payments canonicos NOT superseded. NUNCA escrito por sync.
--
-- En Slice 0 solo agregamos las columnas. Los triggers que enforzan la
-- derivacion canonica viven en migraciones separadas (task-708-create-derive-
-- income-amount-paid-trigger y task-708-extend-expense-amount-paid-trigger-
-- supersede).

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS source_payment_status TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS source_payment_status TEXT;

COMMENT ON COLUMN greenhouse_finance.income.source_payment_status IS
  'TASK-708 D2: estado pagado segun la fuente upstream (Nubox sale.estado, etc). Independiente del canonical payment_status que deriva de payments canonicos Greenhouse. UI puede mostrar ambos diferenciados. NULL = la fuente no provee senal.';

COMMENT ON COLUMN greenhouse_finance.expenses.source_payment_status IS
  'TASK-708 D2: estado pagado segun la fuente upstream (Nubox purchase.estado, etc). Independiente del canonical payment_status que deriva de payments canonicos Greenhouse.';

-- Down Migration

ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS source_payment_status;

ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS source_payment_status;
