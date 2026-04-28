-- Up Migration
--
-- TASK-708 Slice 0 — D5 (audit log): external_signal_resolution_attempts
-- =====================================================================
-- Audit log de cada evaluacion de reglas de matching contra una signal.
-- Independiente de si la regla resulta activa/desactiva/borrada despues —
-- el log preserva la decision en el momento que se tomo, con evaluator_version
-- pinned para reproducibilidad cuando el algoritmo evolucione.
--
-- Hard rules:
--   - signal_id FK con ON DELETE CASCADE → si se borra la senal, se borra su log.
--   - matched_rule_id FK con ON DELETE SET NULL → preserva audit aunque la regla
--     se elimine despues (evento es snapshot inmutable).
--   - resolution_outcome CHECK soft enum.
--   - rules_evaluated JSONB → array de {rule_id, matched, reason} para
--     reproducibilidad.

SET search_path = greenhouse_finance, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.external_signal_resolution_attempts (
  attempt_id            TEXT PRIMARY KEY,
  signal_id             TEXT NOT NULL,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rules_evaluated       JSONB NOT NULL,
  matched_rule_id       TEXT,
  resolution_outcome    TEXT NOT NULL,
  resolution_account_id TEXT,
  evaluator_version     TEXT NOT NULL,

  CONSTRAINT external_signal_resolution_attempts_outcome_check
    CHECK (resolution_outcome IN ('resolved', 'ambiguous', 'no_match')),

  CONSTRAINT external_signal_resolution_attempts_rules_evaluated_array_check
    CHECK (jsonb_typeof(rules_evaluated) = 'array'),

  CONSTRAINT external_signal_resolution_attempts_signal_fkey
    FOREIGN KEY (signal_id)
    REFERENCES greenhouse_finance.external_cash_signals (signal_id)
    ON DELETE CASCADE,

  CONSTRAINT external_signal_resolution_attempts_matched_rule_fkey
    FOREIGN KEY (matched_rule_id)
    REFERENCES greenhouse_finance.account_signal_matching_rules (rule_id)
    ON DELETE SET NULL,

  CONSTRAINT external_signal_resolution_attempts_resolution_account_fkey
    FOREIGN KEY (resolution_account_id)
    REFERENCES greenhouse_finance.accounts (account_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_external_signal_resolution_attempts_signal
  ON greenhouse_finance.external_signal_resolution_attempts (signal_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_signal_resolution_attempts_outcome
  ON greenhouse_finance.external_signal_resolution_attempts (resolution_outcome, evaluated_at DESC);

COMMENT ON TABLE greenhouse_finance.external_signal_resolution_attempts IS
  'TASK-708 D5 audit log: cada evaluacion del rule engine contra una senal. Inmutable, preservada aun si reglas se borran/desactivan. evaluator_version pinned permite reproducir decisiones historicas cuando el algoritmo evolucione.';

COMMENT ON COLUMN greenhouse_finance.external_signal_resolution_attempts.rules_evaluated IS
  'Array of {rule_id, matched: bool, reason: string}. Preserva reglas que fallaron y su razon, no solo la ganadora. Permite debuggear por que una senal no se resolvio.';

COMMENT ON COLUMN greenhouse_finance.external_signal_resolution_attempts.evaluator_version IS
  'Semver del codigo evaluador en el momento de la decision. Cambiar el algoritmo bumpea version para que historico permanezca interpretable.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_external_signal_resolution_attempts_outcome;
DROP INDEX IF EXISTS greenhouse_finance.idx_external_signal_resolution_attempts_signal;

DROP TABLE IF EXISTS greenhouse_finance.external_signal_resolution_attempts;
