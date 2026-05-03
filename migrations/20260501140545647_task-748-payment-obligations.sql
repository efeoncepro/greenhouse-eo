-- Up Migration

-- TASK-748 — Payment Obligations Foundation V1
-- Modela obligaciones financieras componentizadas (que se debe pagar y por que)
-- separadas del registro de pago real (expenses + expense_payments). No
-- reemplaza expenses. Permite que Payroll → Finance pase por una capa
-- explicita de obligacion antes de programar y pagar.
--
-- Idempotencia: unique partial por (source_kind, source_ref, obligation_kind,
-- beneficiary_id, period_id) WHERE status NOT IN ('superseded','cancelled').
-- Re-export del mismo periodo NO duplica obligations.
--
-- Inmutabilidad: row activa no muta sus campos canonicos. Cambios crean nuevas
-- rows con superseded_by chain (mismo patron que payroll_adjustments TASK-745).

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_obligations (
  obligation_id            TEXT PRIMARY KEY,
  -- space_id NULLABLE en V1 (member.space_id no esta resuelto para entries
  -- legacy). Cuando emerja resolver member→space, se pobla via UPDATE futuro.
  space_id                 TEXT,
  source_kind              TEXT NOT NULL CHECK (source_kind IN (
                             'payroll',
                             'supplier_invoice',
                             'tax_obligation',
                             'manual',
                             'reliquidation_delta'
                           )),
  source_ref               TEXT NOT NULL,
  period_id                TEXT,
  beneficiary_type         TEXT NOT NULL CHECK (beneficiary_type IN (
                             'member',
                             'supplier',
                             'tax_authority',
                             'processor',
                             'other'
                           )),
  beneficiary_id           TEXT NOT NULL,
  beneficiary_name         TEXT,
  obligation_kind          TEXT NOT NULL CHECK (obligation_kind IN (
                             'employee_net_pay',
                             'employer_social_security',
                             'employee_withheld_component',
                             'provider_payroll',
                             'processor_fee',
                             'fx_component',
                             'manual'
                           )),
  amount                   NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency                 TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  status                   TEXT NOT NULL DEFAULT 'generated' CHECK (status IN (
                             'generated',
                             'scheduled',
                             'partially_paid',
                             'paid',
                             'reconciled',
                             'closed',
                             'cancelled',
                             'superseded'
                           )),
  due_date                 DATE,
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  superseded_by            TEXT REFERENCES greenhouse_finance.payment_obligations(obligation_id) DEFERRABLE INITIALLY DEFERRED,
  cancelled_reason         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotencia canonica: solo 1 obligation viva por (source, kind, beneficiary, period).
-- 'superseded' y 'cancelled' coexisten como historico fuera del unique.
CREATE UNIQUE INDEX IF NOT EXISTS payment_obligations_idempotency_uniq
  ON greenhouse_finance.payment_obligations (
    source_kind,
    source_ref,
    obligation_kind,
    beneficiary_id,
    COALESCE(period_id, '__no_period__')
  )
  WHERE status NOT IN ('superseded', 'cancelled');

CREATE INDEX IF NOT EXISTS payment_obligations_status_idx
  ON greenhouse_finance.payment_obligations (status);

CREATE INDEX IF NOT EXISTS payment_obligations_period_status_idx
  ON greenhouse_finance.payment_obligations (period_id, status)
  WHERE period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_obligations_beneficiary_idx
  ON greenhouse_finance.payment_obligations (beneficiary_type, beneficiary_id, status);

CREATE INDEX IF NOT EXISTS payment_obligations_source_idx
  ON greenhouse_finance.payment_obligations (source_kind, source_ref);

CREATE INDEX IF NOT EXISTS payment_obligations_space_idx
  ON greenhouse_finance.payment_obligations (space_id)
  WHERE space_id IS NOT NULL;

-- Trigger updated_at automatico
CREATE OR REPLACE FUNCTION greenhouse_finance.payment_obligations_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_obligations_updated_at_trigger ON greenhouse_finance.payment_obligations;

CREATE TRIGGER payment_obligations_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.payment_obligations
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.payment_obligations_set_updated_at();

COMMENT ON TABLE greenhouse_finance.payment_obligations IS
  'TASK-748 - Componentized payment obligations. Generated by source events (payroll_period.exported, etc) and consumed downstream by payment_orders (TASK-750). Coexiste con expenses sin reemplazarlos. See docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.';

COMMENT ON COLUMN greenhouse_finance.payment_obligations.obligation_kind IS
  'employee_net_pay = neto al colaborador; employer_social_security = aporte previsional consolidado; employee_withheld_component = retencion entregada al estado (SII); provider_payroll = placeholder Deel/EOR; processor_fee = costo plataforma de pago; fx_component = costo cambiario; manual = entrada manual.';

COMMENT ON COLUMN greenhouse_finance.payment_obligations.source_kind IS
  'payroll = generado desde payroll_period.exported; supplier_invoice = factura proveedor; tax_obligation = SII u otra autoridad; manual = entrada humana; reliquidation_delta = TASK-409 reliquidacion v2 vs v1.';


-- Down Migration

DROP TRIGGER IF EXISTS payment_obligations_updated_at_trigger ON greenhouse_finance.payment_obligations;
DROP FUNCTION IF EXISTS greenhouse_finance.payment_obligations_set_updated_at();
DROP TABLE IF EXISTS greenhouse_finance.payment_obligations;
