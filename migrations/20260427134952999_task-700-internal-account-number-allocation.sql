-- Up Migration
--
-- Internal Account Number Allocation Algorithm (TASK-700)
-- =========================================================
--
-- Canonical, reusable allocator for human-readable internal account numbers
-- across all "wallet-like" instruments in Greenhouse. Today it powers
-- shareholder current accounts (CCA); tomorrow employee/freelancer/client
-- wallets, intercompany loans, factoring accounts, etc. — without re-deriving
-- the algorithm in any consumer.
--
-- Format (version 1):
--
--   {tenantCode2}-{typeCode2}-{DV1}-{seq4}
--
--   Example: 01-90-7-0001
--            └┘ └┘ └┘ └──┘
--             │  │  │   └─ 4-digit zero-padded sequential per (tenant, type)
--             │  │  └───── Luhn mod-10 check digit over payload tenant‖type‖seq
--             │  └──────── 2-digit type code (90 = shareholder_account)
--             └─────────── 2-digit numeric tenant code (01 = Efeonce, 02 = Sky)
--
-- Properties:
--   - All-numeric identifier with bank-style hyphen grouping.
--   - The last 4 characters are ALWAYS pure digits (the sequential), so the
--     standard `•••• {last4}` masking pattern produces uniquely identifiable
--     suffixes within (tenant, type). Cero colisión visual until the 9.999th
--     account in the same scope.
--   - DV at position 3 from left (NOT at the end) so it cannot get cropped or
--     contaminate the last-4 mask. Computed via Luhn mod-10 (always 0-9, never
--     a "K" character — preserves all-numeric contract).
--   - Version-tagged in the registry (`format_version`) so future formats can
--     coexist with v1 without invalidating any emitted number.
--
-- Components:
--
--   1. greenhouse_core.spaces.numeric_code (NEW NOT NULL UNIQUE column)
--      Explicit 2-digit code per tenant. Auto-seeded from creation order.
--
--   2. greenhouse_finance.internal_account_type_catalog (NEW table)
--      Catalog of type codes. Seeded with '90' = shareholder_account.
--      Ranges reserved for future families:
--        00-09  system / reserved
--        10-19  user wallets (employee, freelancer, contractor)
--        20-29  client wallets / credit balances
--        30-39  supplier wallets / credits
--        40-69  reserved (technical, escrow, FX hedging)
--        70-79  intercompany loans
--        80-89  factoring / structured finance
--        90-99  shareholder & equity-related (CCA today, partner/founder later)
--
--   3. greenhouse_finance.account_number_registry (NEW table)
--      Single source of truth for ALL allocated numbers across instrument
--      families. Reverse lookup, audit trail, multi-table targeting. Replaces
--      per-type sequences with a queryable allocation log.
--
--   4. greenhouse_finance.luhn_check_digit(payload TEXT) (NEW function)
--      Canonical Luhn mod-10 implementation. IMMUTABLE, used by both the
--      backfill in this migration and any runtime allocator going forward.
--
--   5. greenhouse_finance.allocate_account_number(...) (NEW function)
--      Atomic allocator: takes (space_id, type_code, target_table, target_id),
--      acquires advisory lock, computes next sequential, builds the formatted
--      number, persists registry row, returns the number. Used by TS allocator
--      (`src/lib/finance/internal-account-number/allocate.ts`) for runtime
--      allocations. Same function does the backfill below.
--
--   6. accounts.account_number unique partial index for shareholder accounts.
--      Bank accounts may legitimately share `account_number` strings across
--      different banks (the actual bank account number is unique per bank,
--      not globally), so we scope the UNIQUE to category='shareholder_account'.
--
-- ⚠️ FOR AGENTS / FUTURE DEVS:
-- - DO NOT manually compose internal account numbers in any module. Always
--   call `allocate_account_number(...)` (SQL) or the TS allocator at
--   `src/lib/finance/internal-account-number/allocate.ts`.
-- - DO NOT alter the format inline. If you need a new format, bump
--   `format_version` and update both the SQL function and the TS module.
-- - DO NOT bypass the registry by writing directly to `accounts.account_number`
--   for a category that uses the registry. The registry is the audit trail.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- =========================================================================
-- 1. greenhouse_core.spaces — add numeric_code (2-digit canonical tenant code)
-- =========================================================================

ALTER TABLE greenhouse_core.spaces
  ADD COLUMN IF NOT EXISTS numeric_code CHAR(2);

COMMENT ON COLUMN greenhouse_core.spaces.numeric_code IS
'Canonical 2-digit numeric tenant code used by greenhouse_finance.allocate_account_number. Range 01-98 for tenants; 00 and 99 reserved for system/test/technical partitions. Immutable post-assignment — emitted account numbers reference it.';

-- Auto-seed numeric_code for any existing space row that does not yet have one.
-- Deterministic ordering by created_at so re-runs are stable.
WITH ordered AS (
  SELECT
    space_id,
    LPAD(
      (ROW_NUMBER() OVER (ORDER BY created_at ASC, space_id ASC))::text,
      2,
      '0'
    ) AS seq_code
  FROM greenhouse_core.spaces
  WHERE numeric_code IS NULL
)
UPDATE greenhouse_core.spaces s
   SET numeric_code = ordered.seq_code
  FROM ordered
 WHERE s.space_id = ordered.space_id;

ALTER TABLE greenhouse_core.spaces
  ALTER COLUMN numeric_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spaces_numeric_code_format'
  ) THEN
    ALTER TABLE greenhouse_core.spaces
      ADD CONSTRAINT spaces_numeric_code_format
      CHECK (numeric_code ~ '^[0-9]{2}$');
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS spaces_numeric_code_unique
  ON greenhouse_core.spaces (numeric_code);

-- =========================================================================
-- 2. internal_account_type_catalog
-- =========================================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.internal_account_type_catalog (
  type_code      CHAR(2) PRIMARY KEY,
  category_slug  TEXT NOT NULL UNIQUE,
  display_name   TEXT NOT NULL,
  family         TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT internal_account_type_code_format CHECK (type_code ~ '^[0-9]{2}$'),
  CONSTRAINT internal_account_family_known CHECK (
    family IN ('shareholder', 'wallet', 'loan', 'factoring', 'system')
  )
);

COMMENT ON TABLE greenhouse_finance.internal_account_type_catalog IS
'Catalog of 2-digit type codes for internal account number allocation. Each row reserves a code range for an instrument family. Extend by inserting new rows — the allocator does NOT need migration to support a new type. See docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md for canonical range allocation.';

-- Seed: only the type that is materialized today. Future families (wallets,
-- loans, factoring, partner accounts) get inserted by their own task when
-- they ship. We do NOT seed reserved-but-unused codes — that creates dead
-- catalog rows and tempts callers to use them prematurely.
INSERT INTO greenhouse_finance.internal_account_type_catalog
  (type_code, category_slug, display_name, family)
VALUES
  ('90', 'shareholder_account', 'Cuenta corriente accionista', 'shareholder')
ON CONFLICT (type_code) DO NOTHING;

-- =========================================================================
-- 3. account_number_registry — global allocation log
-- =========================================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_number_registry (
  registry_id        BIGSERIAL PRIMARY KEY,
  space_id           TEXT NOT NULL REFERENCES greenhouse_core.spaces (space_id) ON DELETE RESTRICT,
  type_code          CHAR(2) NOT NULL REFERENCES greenhouse_finance.internal_account_type_catalog (type_code) ON DELETE RESTRICT,
  sequential_value   INTEGER NOT NULL,
  account_number     TEXT NOT NULL,
  format_version     SMALLINT NOT NULL DEFAULT 1,
  assigned_to_table  TEXT NOT NULL,
  assigned_to_id     TEXT NOT NULL,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT account_number_registry_seq_positive
    CHECK (sequential_value > 0 AND sequential_value <= 9999),
  CONSTRAINT account_number_registry_format_known
    CHECK (format_version = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS account_number_registry_number_unique
  ON greenhouse_finance.account_number_registry (account_number);

CREATE UNIQUE INDEX IF NOT EXISTS account_number_registry_scope_seq_unique
  ON greenhouse_finance.account_number_registry (space_id, type_code, sequential_value);

CREATE INDEX IF NOT EXISTS account_number_registry_target_lookup
  ON greenhouse_finance.account_number_registry (assigned_to_table, assigned_to_id);

CREATE INDEX IF NOT EXISTS account_number_registry_scope_seq_desc
  ON greenhouse_finance.account_number_registry (space_id, type_code, sequential_value DESC);

COMMENT ON TABLE greenhouse_finance.account_number_registry IS
'Global allocation log of all internal account numbers issued by allocate_account_number(). Reverse-lookup index from a printed number to the row that owns it. Replaces per-(tenant,type) Postgres sequences with a single auditable, queryable, multi-table-aware allocator. Extend by adding new format_version values; never mutate emitted rows.';

-- =========================================================================
-- 4. luhn_check_digit — canonical Luhn mod-10
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.luhn_check_digit(payload TEXT)
RETURNS CHAR(1)
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  total INTEGER := 0;
  i INTEGER;
  digit INTEGER;
  position_from_right INTEGER;
  doubled INTEGER;
BEGIN
  IF payload !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'luhn_check_digit: payload must be all digits, got %', payload;
  END IF;

  FOR i IN 1..length(payload) LOOP
    position_from_right := length(payload) - i + 1;
    digit := substr(payload, i, 1)::INTEGER;

    -- Generation: rightmost digit of payload sits at position 2 from right
    -- in the final (payload + DV) number, so it gets doubled. Then alternate.
    IF position_from_right % 2 = 1 THEN
      doubled := digit * 2;
      IF doubled > 9 THEN
        doubled := doubled - 9;
      END IF;
      total := total + doubled;
    ELSE
      total := total + digit;
    END IF;
  END LOOP;

  RETURN ((10 - (total % 10)) % 10)::TEXT;
END;
$$;

COMMENT ON FUNCTION greenhouse_finance.luhn_check_digit(TEXT) IS
'Canonical Luhn mod-10 check digit generator. Returns a single 0-9 character. Used by allocate_account_number(). Mirror implementation lives at src/lib/finance/internal-account-number/luhn.ts — both must stay in sync.';

-- =========================================================================
-- 5. allocate_account_number — atomic allocator
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.allocate_account_number(
  p_space_id          TEXT,
  p_type_code         CHAR(2),
  p_assigned_to_table TEXT,
  p_assigned_to_id    TEXT
)
RETURNS TABLE (
  account_number   TEXT,
  format_version   SMALLINT,
  sequential_value INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_code  CHAR(2);
  v_lock_key     BIGINT;
  v_next_seq     INTEGER;
  v_payload      TEXT;
  v_dv           CHAR(1);
  v_number       TEXT;
BEGIN
  -- Resolve tenant code.
  SELECT s.numeric_code INTO v_tenant_code
    FROM greenhouse_core.spaces s
   WHERE s.space_id = p_space_id;

  IF v_tenant_code IS NULL THEN
    RAISE EXCEPTION 'allocate_account_number: space_id % has no numeric_code', p_space_id;
  END IF;

  -- Validate type is registered + active.
  IF NOT EXISTS (
    SELECT 1 FROM greenhouse_finance.internal_account_type_catalog
    WHERE type_code = p_type_code AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'allocate_account_number: type_code % not registered or inactive', p_type_code;
  END IF;

  -- Per-(space,type) advisory lock to serialize concurrent allocations.
  v_lock_key := hashtextextended(p_space_id || ':' || p_type_code, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Compute next sequential.
  SELECT COALESCE(MAX(r.sequential_value), 0) + 1
    INTO v_next_seq
    FROM greenhouse_finance.account_number_registry r
   WHERE r.space_id = p_space_id
     AND r.type_code = p_type_code;

  IF v_next_seq > 9999 THEN
    RAISE EXCEPTION 'allocate_account_number: sequential exhausted for space=% type=% (>9999)', p_space_id, p_type_code;
  END IF;

  v_payload := v_tenant_code || p_type_code || LPAD(v_next_seq::text, 4, '0');
  v_dv := greenhouse_finance.luhn_check_digit(v_payload);
  v_number :=
    v_tenant_code || '-' ||
    p_type_code   || '-' ||
    v_dv          || '-' ||
    LPAD(v_next_seq::text, 4, '0');

  INSERT INTO greenhouse_finance.account_number_registry (
    space_id, type_code, sequential_value, account_number,
    format_version, assigned_to_table, assigned_to_id
  )
  VALUES (
    p_space_id, p_type_code, v_next_seq, v_number,
    1, p_assigned_to_table, p_assigned_to_id
  );

  account_number := v_number;
  format_version := 1;
  sequential_value := v_next_seq;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION greenhouse_finance.allocate_account_number(TEXT, CHAR, TEXT, TEXT) IS
'Atomic internal account number allocator. Acquires advisory lock per (space,type), computes next sequential, builds Luhn-checked formatted number, persists registry row. Single source of truth — every internal account number in Greenhouse must come from here (or its TS mirror src/lib/finance/internal-account-number/allocate.ts).';

-- =========================================================================
-- 6. accounts.account_number — UNIQUE partial index for shareholder accounts
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS accounts_shareholder_account_number_unique
  ON greenhouse_finance.accounts (account_number)
  WHERE instrument_category = 'shareholder_account'
    AND account_number IS NOT NULL;

COMMENT ON INDEX greenhouse_finance.accounts_shareholder_account_number_unique IS
'Partial UNIQUE on accounts.account_number scoped to shareholder accounts. Bank accounts may legitimately share account_number strings across different banks, so the unique scope is per category. Pairs with account_number_registry.account_number UNIQUE for cross-table integrity.';

-- =========================================================================
-- 7. Backfill existing shareholder accounts via the canonical allocator
-- =========================================================================

DO $$
DECLARE
  rec RECORD;
  alloc RECORD;
  v_space_id TEXT;
BEGIN
  FOR rec IN
    SELECT a.account_id, sa.space_id
      FROM greenhouse_finance.accounts a
      LEFT JOIN greenhouse_finance.shareholder_accounts sa ON sa.account_id = a.account_id
     WHERE a.instrument_category = 'shareholder_account'
       AND a.account_number IS NULL
     ORDER BY a.created_at ASC, a.account_id ASC
  LOOP
    -- Resolve space_id: prefer shareholder_accounts.space_id; fallback to the
    -- single existing space (Efeonce) if the link table is empty for this row.
    v_space_id := rec.space_id;

    IF v_space_id IS NULL THEN
      SELECT space_id INTO v_space_id
        FROM greenhouse_core.spaces
       ORDER BY created_at ASC, space_id ASC
       LIMIT 1;
    END IF;

    IF v_space_id IS NULL THEN
      RAISE EXCEPTION 'backfill: no space available to allocate number for %', rec.account_id;
    END IF;

    SELECT * INTO alloc FROM greenhouse_finance.allocate_account_number(
      v_space_id, '90', 'accounts', rec.account_id
    );

    UPDATE greenhouse_finance.accounts
       SET account_number = alloc.account_number,
           account_number_full = alloc.account_number,
           updated_at = CURRENT_TIMESTAMP
     WHERE account_id = rec.account_id;
  END LOOP;
END$$;

-- =========================================================================
-- 8. Grants
-- =========================================================================

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.internal_account_type_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.internal_account_type_catalog TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.internal_account_type_catalog TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_number_registry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_number_registry TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.account_number_registry TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_finance.account_number_registry_registry_id_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_finance.account_number_registry_registry_id_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_finance.account_number_registry_registry_id_seq TO greenhouse_app;

GRANT EXECUTE ON FUNCTION greenhouse_finance.luhn_check_digit(TEXT) TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_finance.luhn_check_digit(TEXT) TO greenhouse_migrator;
GRANT EXECUTE ON FUNCTION greenhouse_finance.luhn_check_digit(TEXT) TO greenhouse_app;

GRANT EXECUTE ON FUNCTION greenhouse_finance.allocate_account_number(TEXT, CHAR, TEXT, TEXT) TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_finance.allocate_account_number(TEXT, CHAR, TEXT, TEXT) TO greenhouse_migrator;
GRANT EXECUTE ON FUNCTION greenhouse_finance.allocate_account_number(TEXT, CHAR, TEXT, TEXT) TO greenhouse_app;

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_finance.accounts_shareholder_account_number_unique;

UPDATE greenhouse_finance.accounts
   SET account_number = NULL,
       account_number_full = NULL
 WHERE instrument_category = 'shareholder_account';

DROP FUNCTION IF EXISTS greenhouse_finance.allocate_account_number(TEXT, CHAR, TEXT, TEXT);
DROP FUNCTION IF EXISTS greenhouse_finance.luhn_check_digit(TEXT);

DROP INDEX IF EXISTS greenhouse_finance.account_number_registry_scope_seq_desc;
DROP INDEX IF EXISTS greenhouse_finance.account_number_registry_target_lookup;
DROP INDEX IF EXISTS greenhouse_finance.account_number_registry_scope_seq_unique;
DROP INDEX IF EXISTS greenhouse_finance.account_number_registry_number_unique;
DROP TABLE IF EXISTS greenhouse_finance.account_number_registry;

DROP TABLE IF EXISTS greenhouse_finance.internal_account_type_catalog;

DROP INDEX IF EXISTS greenhouse_core.spaces_numeric_code_unique;
ALTER TABLE greenhouse_core.spaces DROP CONSTRAINT IF EXISTS spaces_numeric_code_format;
ALTER TABLE greenhouse_core.spaces DROP COLUMN IF EXISTS numeric_code;
