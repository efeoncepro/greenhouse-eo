-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.reconciliation_ai_suggestions (
  suggestion_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE RESTRICT,
  period_id TEXT NOT NULL REFERENCES greenhouse_finance.reconciliation_periods(period_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id) ON DELETE RESTRICT,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'match',
    'group_match',
    'drift_explanation',
    'import_mapping',
    'closure_review',
    'anomaly'
  )),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'draft',
    'proposed',
    'accepted',
    'rejected',
    'expired',
    'superseded',
    'failed'
  )),
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  statement_row_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  candidate_payment_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  candidate_settlement_leg_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  proposed_action_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  evidence_factors_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  rationale TEXT NOT NULL DEFAULT '',
  simulation_json JSONB,
  model_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  rejected_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  superseded_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reconciliation_ai_suggestions_review_consistency_check
    CHECK (
      (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by_user_id IS NOT NULL)
      OR (status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by_user_id IS NOT NULL)
      OR (status NOT IN ('accepted', 'rejected'))
    ),
  CONSTRAINT reconciliation_ai_suggestions_json_shapes_check
    CHECK (
      jsonb_typeof(proposed_action_json) = 'object'
      AND jsonb_typeof(evidence_factors_json) = 'array'
      AND jsonb_typeof(output_json) = 'object'
      AND (simulation_json IS NULL OR jsonb_typeof(simulation_json) = 'object')
    )
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_ai_suggestions_space_status
  ON greenhouse_finance.reconciliation_ai_suggestions (space_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reconciliation_ai_suggestions_period_status
  ON greenhouse_finance.reconciliation_ai_suggestions (period_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reconciliation_ai_suggestions_account_period
  ON greenhouse_finance.reconciliation_ai_suggestions (account_id, period_id, suggestion_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reconciliation_ai_suggestions_input
  ON greenhouse_finance.reconciliation_ai_suggestions (period_id, prompt_version, input_hash, suggestion_type)
  WHERE status IN ('draft', 'proposed', 'accepted');

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_reconciliation_ai_suggestions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reconciliation_ai_suggestions_touch_updated_at
  ON greenhouse_finance.reconciliation_ai_suggestions;

CREATE TRIGGER trg_reconciliation_ai_suggestions_touch_updated_at
  BEFORE UPDATE ON greenhouse_finance.reconciliation_ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_reconciliation_ai_suggestions_touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.reconciliation_ai_suggestions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.reconciliation_ai_suggestions TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.reconciliation_ai_suggestions TO greenhouse_app;

COMMENT ON TABLE greenhouse_finance.reconciliation_ai_suggestions IS
  'TASK-723: sugerencias asistidas para conciliacion bancaria. Advisory-only, human-in-the-loop, con tenant scope por space_id y auditoria de prompt/model/input/output.';

COMMENT ON COLUMN greenhouse_finance.reconciliation_ai_suggestions.space_id IS
  'Tenant scope denormalizado desde reconciliation_periods/accounts. Todas las queries runtime deben filtrar por este campo o derivarlo desde el periodo.';

COMMENT ON COLUMN greenhouse_finance.reconciliation_ai_suggestions.candidate_settlement_leg_ids IS
  'Targets canonicos preferidos post TASK-708/TASK-722. candidate_payment_ids queda solo para fallback legacy payment-only.';

COMMENT ON COLUMN greenhouse_finance.reconciliation_ai_suggestions.proposed_action_json IS
  'JSON validado por runtime con action, targetIds y payload. Nunca ejecuta writes automaticos.';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP TRIGGER IF EXISTS trg_reconciliation_ai_suggestions_touch_updated_at
  ON greenhouse_finance.reconciliation_ai_suggestions;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_reconciliation_ai_suggestions_touch_updated_at();

DROP INDEX IF EXISTS greenhouse_finance.uq_reconciliation_ai_suggestions_input;
DROP INDEX IF EXISTS greenhouse_finance.idx_reconciliation_ai_suggestions_account_period;
DROP INDEX IF EXISTS greenhouse_finance.idx_reconciliation_ai_suggestions_period_status;
DROP INDEX IF EXISTS greenhouse_finance.idx_reconciliation_ai_suggestions_space_status;

DROP TABLE IF EXISTS greenhouse_finance.reconciliation_ai_suggestions;
