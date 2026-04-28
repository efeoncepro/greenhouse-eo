-- Up Migration
--
-- TASK-708 Slice 0 — D5: account_signal_matching_rules
-- =====================================================
-- Reglas declarativas como datos (no codigo). Cada regla mapea un predicate
-- (regex sobre bank_description, payment_method, currency, amount range, etc.)
-- a una cuenta canonica Greenhouse. Cero deploy para agregar/quitar reglas.
--
-- Reglas de evaluacion (vive en TS, evaluador en src/lib/finance/external-cash-signals/):
--   - una sola regla matchea → resolved_high_confidence (auto-adopt si D3 lo permite)
--   - >= 2 reglas matchean → unresolved con resolution_outcome='ambiguous' (review humano)
--   - cero reglas matchean → unresolved con resolution_outcome='no_match'
--
-- match_predicate_json shape (canonico, evolutivo):
--   {
--     "bank_description_regex": string (opcional),
--     "payment_method_in": string[] (opcional),
--     "currency_eq": string (opcional),
--     "amount_min": number (opcional),
--     "amount_max": number (opcional),
--     "metadata_match": object (opcional, exact-match contra source_payload_json fields)
--   }
-- Los campos opcionales se combinan con AND. Vacio = matchea todo (peligroso;
-- se previene en el evaluador TS).

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_signal_matching_rules (
  rule_id              TEXT PRIMARY KEY,
  source_system        TEXT NOT NULL,
  space_id             TEXT,
  match_predicate_json JSONB NOT NULL,
  resolved_account_id  TEXT NOT NULL,
  priority             INT NOT NULL DEFAULT 100,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_by           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ,
  rule_provenance      TEXT NOT NULL,
  notes                TEXT,

  CONSTRAINT account_signal_matching_rules_provenance_check
    CHECK (rule_provenance IN ('admin_ui', 'migration_seed', 'imported_from_legacy')),

  CONSTRAINT account_signal_matching_rules_predicate_object_check
    CHECK (jsonb_typeof(match_predicate_json) = 'object'),

  CONSTRAINT account_signal_matching_rules_resolved_account_fkey
    FOREIGN KEY (resolved_account_id)
    REFERENCES greenhouse_finance.accounts (account_id)
    ON DELETE RESTRICT,

  CONSTRAINT account_signal_matching_rules_space_fkey
    FOREIGN KEY (space_id)
    REFERENCES greenhouse_core.spaces (space_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_signal_matching_rules_lookup
  ON greenhouse_finance.account_signal_matching_rules (source_system, space_id, is_active, priority DESC)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_account_signal_matching_rules_expiry
  ON greenhouse_finance.account_signal_matching_rules (expires_at)
  WHERE expires_at IS NOT NULL AND is_active;

COMMENT ON TABLE greenhouse_finance.account_signal_matching_rules IS
  'TASK-708 D5: reglas declarativas (datos, no codigo) que mapean predicates de senal a una cuenta canonica. Auto-resolucion solo cuando una y solo una regla matchea (binario, no probabilistico). Reglas expirables via expires_at.';

COMMENT ON COLUMN greenhouse_finance.account_signal_matching_rules.match_predicate_json IS
  'Shape: {bank_description_regex?, payment_method_in?, currency_eq?, amount_min?, amount_max?, metadata_match?}. Campos combinados con AND. Vacio = catch-all (prevenido en evaluador).';

COMMENT ON COLUMN greenhouse_finance.account_signal_matching_rules.priority IS
  'Mayor priority gana cuando se imprime el log de evaluacion, pero NO desempata. Si dos reglas matchean, ambas se reportan y la senal queda unresolved/ambiguous. La idea: una regla mal escrita es responsabilidad de revisar, no de decidir arbitrariamente.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_account_signal_matching_rules_expiry;
DROP INDEX IF EXISTS greenhouse_finance.idx_account_signal_matching_rules_lookup;

DROP TABLE IF EXISTS greenhouse_finance.account_signal_matching_rules;
