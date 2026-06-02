-- Up Migration
--
-- TASK-960 Slice 1 — Contractor Remittance Advice correlative number allocator.
--
-- A Remittance Advice ("Comprobante de Pago") is a read-only projection of a paid
-- ContractorPayable. It carries its OWN gapless correlative number `EO-RA-NNNNNN`,
-- allocated ATOMICALLY (advisory lock, mirror of TASK-700 allocate_account_number)
-- and persisted ONCE per payable (idempotent — re-emitting the same payable always
-- shows the same number). A gap in the series = a voided document = audit red flag.
--
-- The series is scoped by `issuer_organization_id` (the Operating Entity that pays).
-- V1 has a single Operating Entity (Efeonce Group SpA) so the series is effectively
-- single; multi-entity inherits a per-issuer series for free, no code change.

-- 1. Registry table — append-only allocation log (one row per emitted document).
CREATE TABLE IF NOT EXISTS greenhouse_hr.remittance_advice_numbers (
  registry_id            BIGSERIAL PRIMARY KEY,
  issuer_organization_id TEXT NOT NULL REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  contractor_payable_id  TEXT NOT NULL REFERENCES greenhouse_hr.contractor_payables (contractor_payable_id) ON DELETE RESTRICT,
  sequential_value       INTEGER NOT NULL,
  remittance_number      TEXT NOT NULL,
  format_version         SMALLINT NOT NULL DEFAULT 1,
  allocated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT remittance_advice_numbers_seq_positive
    CHECK (sequential_value > 0 AND sequential_value <= 999999),
  CONSTRAINT remittance_advice_numbers_format_known
    CHECK (format_version = 1),
  CONSTRAINT remittance_advice_numbers_format_shape
    CHECK (remittance_number ~ '^EO-RA-[0-9]{6}$')
);

-- One document number per payable (idempotency anchor).
CREATE UNIQUE INDEX IF NOT EXISTS remittance_advice_numbers_payable_unique
  ON greenhouse_hr.remittance_advice_numbers (contractor_payable_id);

-- Global uniqueness of the printed number.
CREATE UNIQUE INDEX IF NOT EXISTS remittance_advice_numbers_number_unique
  ON greenhouse_hr.remittance_advice_numbers (remittance_number);

-- Per-issuer gapless sequence integrity.
CREATE UNIQUE INDEX IF NOT EXISTS remittance_advice_numbers_issuer_seq_unique
  ON greenhouse_hr.remittance_advice_numbers (issuer_organization_id, sequential_value);

-- Supports MAX(sequential_value) per issuer under the advisory lock.
CREATE INDEX IF NOT EXISTS remittance_advice_numbers_issuer_seq_desc
  ON greenhouse_hr.remittance_advice_numbers (issuer_organization_id, sequential_value DESC);

COMMENT ON TABLE greenhouse_hr.remittance_advice_numbers IS
'TASK-960 — append-only allocation log of contractor Remittance Advice correlative numbers (EO-RA-NNNNNN). One row per emitted document, allocated atomically by allocate_remittance_advice_number(). Gapless per issuer_organization_id. Never mutate or delete emitted rows — a gap = a voided document = audit red flag.';

-- 2. Atomic allocator — advisory lock per issuer + idempotent per payable.
CREATE OR REPLACE FUNCTION greenhouse_hr.allocate_remittance_advice_number(
  p_issuer_organization_id TEXT,
  p_contractor_payable_id  TEXT
)
RETURNS TABLE (
  remittance_number TEXT,
  sequential_value  INTEGER,
  format_version    SMALLINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_lock_key  BIGINT;
  v_existing  RECORD;
  v_next_seq  INTEGER;
  v_number    TEXT;
BEGIN
  -- Per-issuer advisory lock to serialize concurrent allocations.
  v_lock_key := hashtextextended('remittance_advice:' || p_issuer_organization_id, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Idempotency: a payable already issued keeps its original number.
  SELECT r.remittance_number, r.sequential_value, r.format_version
    INTO v_existing
    FROM greenhouse_hr.remittance_advice_numbers r
   WHERE r.contractor_payable_id = p_contractor_payable_id;

  IF FOUND THEN
    remittance_number := v_existing.remittance_number;
    sequential_value  := v_existing.sequential_value;
    format_version    := v_existing.format_version;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Next gapless sequential for this issuer.
  SELECT COALESCE(MAX(r.sequential_value), 0) + 1
    INTO v_next_seq
    FROM greenhouse_hr.remittance_advice_numbers r
   WHERE r.issuer_organization_id = p_issuer_organization_id;

  IF v_next_seq > 999999 THEN
    RAISE EXCEPTION 'allocate_remittance_advice_number: sequence exhausted for issuer % (>999999)', p_issuer_organization_id;
  END IF;

  v_number := 'EO-RA-' || LPAD(v_next_seq::text, 6, '0');

  INSERT INTO greenhouse_hr.remittance_advice_numbers (
    issuer_organization_id, contractor_payable_id, sequential_value, remittance_number, format_version
  )
  VALUES (
    p_issuer_organization_id, p_contractor_payable_id, v_next_seq, v_number, 1
  );

  remittance_number := v_number;
  sequential_value  := v_next_seq;
  format_version    := 1;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION greenhouse_hr.allocate_remittance_advice_number(TEXT, TEXT) IS
'TASK-960 — atomic, gapless, idempotent allocator of EO-RA-NNNNNN. Advisory lock per issuer_organization_id; re-allocating the same payable returns its original number. Single source of truth — mirror in src/lib/contractor-engagements/remittance/remittance-number-allocator.ts.';

-- 3. GRANTs — runtime reads + allocates; ops owns.
GRANT SELECT, INSERT ON greenhouse_hr.remittance_advice_numbers TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.remittance_advice_numbers_registry_id_seq TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.allocate_remittance_advice_number(TEXT, TEXT) TO greenhouse_runtime;

-- 4. Anti pre-up-marker guard — abort if the table/function did not actually materialize.
DO $$
DECLARE
  v_table_exists    boolean;
  v_function_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'remittance_advice_numbers'
  ) INTO v_table_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_hr' AND p.proname = 'allocate_remittance_advice_number'
  ) INTO v_function_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'TASK-960 anti pre-up-marker: greenhouse_hr.remittance_advice_numbers was NOT created. Markers may be inverted.';
  END IF;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'TASK-960 anti pre-up-marker: greenhouse_hr.allocate_remittance_advice_number was NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP FUNCTION IF EXISTS greenhouse_hr.allocate_remittance_advice_number(TEXT, TEXT);
DROP TABLE IF EXISTS greenhouse_hr.remittance_advice_numbers;