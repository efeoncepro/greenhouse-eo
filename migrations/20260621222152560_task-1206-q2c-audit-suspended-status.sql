-- Up Migration

-- TASK-1206 — Q2C canonical close command.
--
-- La estrategia `contract_only` del comando de cierre Quote-to-Cash deja la operación
-- en estado SUSPENDIDO (deal con contrato, sin income/AR todavía) — NUNCA un cierre
-- terminal. Para que `commercial_operations_audit` pueda registrar ese estado, la CHECK
-- constraint `commercial_operations_audit_status_valid` debe admitir `'suspended'`.
--
-- Aditivo + reversible: solo amplía el dominio de valores permitidos. No reescribe filas.
-- Drift espejo en TS: `COMMERCIAL_OPERATION_STATUSES` en
-- src/lib/commercial/party/commands/convert-quote-to-cash-types.ts (actualizar en el mismo PR).

ALTER TABLE greenhouse_commercial.commercial_operations_audit
  DROP CONSTRAINT IF EXISTS commercial_operations_audit_status_valid;

ALTER TABLE greenhouse_commercial.commercial_operations_audit
  ADD CONSTRAINT commercial_operations_audit_status_valid
  CHECK (status IN ('started', 'completed', 'failed', 'pending_approval', 'idempotent_hit', 'suspended'));

-- Anti pre-up-marker bug guard: aborta si la constraint no admite 'suspended' post-DDL.
DO $$
DECLARE constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'commercial_operations_audit_status_valid';

  IF constraint_def IS NULL OR position('suspended' in constraint_def) = 0 THEN
    RAISE EXCEPTION 'TASK-1206 anti pre-up-marker check: commercial_operations_audit_status_valid does NOT allow ''suspended''. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

-- Revertir al dominio previo (sin 'suspended'). Si existieran filas 'suspended' al revertir,
-- el ADD constraint fallaría — por diseño: hay que resolver/limpiar esas operaciones antes.
ALTER TABLE greenhouse_commercial.commercial_operations_audit
  DROP CONSTRAINT IF EXISTS commercial_operations_audit_status_valid;

ALTER TABLE greenhouse_commercial.commercial_operations_audit
  ADD CONSTRAINT commercial_operations_audit_status_valid
  CHECK (status IN ('started', 'completed', 'failed', 'pending_approval', 'idempotent_hit'));