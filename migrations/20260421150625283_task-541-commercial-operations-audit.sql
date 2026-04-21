-- Up Migration
-- TASK-541 Fase G: audit substrate for the quote-to-cash choreography. Every
-- invocation of `convertQuoteToCash` writes exactly one row here. The
-- `correlation_id` is the primary correlation key propagated into the
-- payload of every downstream outbox event emitted during the operation so
-- support can reconstruct the full chain.

SET search_path = greenhouse_commercial, public;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.commercial_operations_audit (
  operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid NOT NULL UNIQUE,
  operation_type text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  trigger_source text NOT NULL,
  actor_user_id text NOT NULL,
  tenant_scope text NOT NULL,
  organization_id text
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  quotation_id text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  contract_id text
    REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE SET NULL,
  client_id text
    REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  hubspot_deal_id text,
  total_amount_clp numeric(18, 2),
  approval_id text,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  CONSTRAINT commercial_operations_audit_type_valid
    CHECK (operation_type IN ('quote_to_cash')),
  CONSTRAINT commercial_operations_audit_status_valid
    CHECK (status IN ('started', 'completed', 'failed', 'pending_approval', 'idempotent_hit')),
  CONSTRAINT commercial_operations_audit_trigger_valid
    CHECK (trigger_source IN (
      'operator',
      'contract_signed',
      'deal_won_hubspot',
      'reactive_auto'
    )),
  CONSTRAINT commercial_operations_audit_completed_consistent
    CHECK (
      (status IN ('completed', 'failed', 'pending_approval', 'idempotent_hit') AND completed_at IS NOT NULL)
      OR (status = 'started' AND completed_at IS NULL)
    )
);

-- Hot-path indexes.
CREATE INDEX IF NOT EXISTS idx_commercial_ops_audit_quotation
  ON greenhouse_commercial.commercial_operations_audit (quotation_id, started_at DESC)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_ops_audit_status_pending
  ON greenhouse_commercial.commercial_operations_audit (status, started_at DESC)
  WHERE status IN ('started', 'pending_approval');

CREATE INDEX IF NOT EXISTS idx_commercial_ops_audit_contract
  ON greenhouse_commercial.commercial_operations_audit (contract_id, started_at DESC)
  WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_ops_audit_deal
  ON greenhouse_commercial.commercial_operations_audit (hubspot_deal_id, started_at DESC)
  WHERE hubspot_deal_id IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.commercial_operations_audit IS
  'TASK-541: append-only audit + correlation substrate for atomic commercial choreographies (quote-to-cash today, future op types). The correlation_id is propagated into outbox event payloads.';

COMMENT ON COLUMN greenhouse_commercial.commercial_operations_audit.trigger_source IS
  'operator (explicit API) · contract_signed (reserved for reactive future) · deal_won_hubspot (inbound deal sync triggered auto-promoter) · reactive_auto (other projections).';

COMMENT ON COLUMN greenhouse_commercial.commercial_operations_audit.correlation_id IS
  'UNIQUE uuid emitted in every outbox event payload produced during this operation — ties party/client/contract/deal events into a single narrative for support + replay.';

GRANT SELECT, INSERT, UPDATE
  ON greenhouse_commercial.commercial_operations_audit
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_ops_audit_deal;
DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_ops_audit_contract;
DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_ops_audit_status_pending;
DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_ops_audit_quotation;

DROP TABLE IF EXISTS greenhouse_commercial.commercial_operations_audit;
