-- Up Migration
--
-- TASK-708 Slice 0 — D3: external_signal_auto_adopt_policies
-- ==========================================================
-- Politica declarativa por (source_system, space_id) que controla si una senal
-- en estado resolved_high_confidence se auto-promueve a payment canonico
-- (`auto_adopt`) o queda en cola admin para revision humana (`review`).
--
-- Default global: cualquier (source_system, space_id) NO listado = `review`.
-- El default es politica conservadora: ningun source_system escala a auto-adopt
-- sin firma humana explicita en la tabla.
--
-- Hard rules:
--   - UNIQUE (source_system, space_id) WHERE is_active → una sola politica
--     activa por par (NULL space_id = catch-all tenant-wide).
--   - mode CHECK soft enum ('review' | 'auto_adopt').
--   - created_by NOT NULL → toda politica queda firmada.
--   - space_id FK to spaces(space_id) ON DELETE CASCADE (politica cae si el
--     tenant se elimina).

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.external_signal_auto_adopt_policies (
  policy_id      TEXT PRIMARY KEY,
  source_system  TEXT NOT NULL,
  space_id       TEXT,
  mode           TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT,

  CONSTRAINT external_signal_auto_adopt_policies_mode_check
    CHECK (mode IN ('review', 'auto_adopt')),

  CONSTRAINT external_signal_auto_adopt_policies_space_fkey
    FOREIGN KEY (space_id)
    REFERENCES greenhouse_core.spaces (space_id)
    ON DELETE CASCADE
);

-- Una sola politica activa por (source_system, space_id). Se crea como dos
-- partial unique indexes porque PostgreSQL UNIQUE no soporta NULL como valor
-- distinguible directo en la clausula UNIQUE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_signal_auto_adopt_policies_active_with_space
  ON greenhouse_finance.external_signal_auto_adopt_policies (source_system, space_id)
  WHERE is_active AND space_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_external_signal_auto_adopt_policies_active_global
  ON greenhouse_finance.external_signal_auto_adopt_policies (source_system)
  WHERE is_active AND space_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_external_signal_auto_adopt_policies_lookup
  ON greenhouse_finance.external_signal_auto_adopt_policies (source_system, space_id, is_active);

COMMENT ON TABLE greenhouse_finance.external_signal_auto_adopt_policies IS
  'TASK-708 D3: politica declarativa de adopcion automatica vs review humana, por (source_system, space_id). Default global cuando no hay row activa: review.';

COMMENT ON COLUMN greenhouse_finance.external_signal_auto_adopt_policies.mode IS
  'review = senal queda en cola admin /finance/external-signals con capability finance.cash.adopt-external-signal. auto_adopt = senal con resolved_high_confidence promueve automaticamente al payment canonico via la API del modulo external-cash-signals.';

COMMENT ON COLUMN greenhouse_finance.external_signal_auto_adopt_policies.space_id IS
  'NULL = politica global tenant-wide para ese source_system. NOT NULL = override por space.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_external_signal_auto_adopt_policies_lookup;
DROP INDEX IF EXISTS greenhouse_finance.uq_external_signal_auto_adopt_policies_active_global;
DROP INDEX IF EXISTS greenhouse_finance.uq_external_signal_auto_adopt_policies_active_with_space;

DROP TABLE IF EXISTS greenhouse_finance.external_signal_auto_adopt_policies;
