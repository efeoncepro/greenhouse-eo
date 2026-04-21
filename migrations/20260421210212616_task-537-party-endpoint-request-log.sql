-- Up Migration

-- TASK-537: append-only request log used as the rate-limit substrate for
-- `/api/commercial/parties/search` and `/api/commercial/parties/adopt`.
--
-- Similar to TASK-539 `deal_create_attempts`, but narrower: this table does
-- not own an orchestration workflow, only per-user window counts + audit
-- breadcrumbs for the party search/adopt lane.

SET search_path = greenhouse_commercial, public;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.party_endpoint_requests (
  party_endpoint_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_key text NOT NULL,
  actor_user_id text NOT NULL,
  tenant_scope text NOT NULL,
  hubspot_company_id text,
  query_text text,
  query_fingerprint text,
  response_status integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT party_endpoint_requests_endpoint_key_valid
    CHECK (endpoint_key IN ('search', 'adopt')),
  CONSTRAINT party_endpoint_requests_response_status_valid
    CHECK (response_status BETWEEN 100 AND 599)
);

CREATE INDEX IF NOT EXISTS idx_party_endpoint_requests_actor_window
  ON greenhouse_commercial.party_endpoint_requests (endpoint_key, actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_endpoint_requests_tenant_window
  ON greenhouse_commercial.party_endpoint_requests (endpoint_key, tenant_scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_endpoint_requests_hubspot_company
  ON greenhouse_commercial.party_endpoint_requests (hubspot_company_id, created_at DESC)
  WHERE hubspot_company_id IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.party_endpoint_requests IS
  'TASK-537: append-only request log and rate-limit substrate for party search/adopt endpoints.';

COMMENT ON COLUMN greenhouse_commercial.party_endpoint_requests.query_fingerprint IS
  'Normalized lowercase search term used only for audit/debug. Not unique.';

GRANT SELECT, INSERT
  ON greenhouse_commercial.party_endpoint_requests
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_party_endpoint_requests_hubspot_company;
DROP INDEX IF EXISTS greenhouse_commercial.idx_party_endpoint_requests_tenant_window;
DROP INDEX IF EXISTS greenhouse_commercial.idx_party_endpoint_requests_actor_window;

DROP TABLE IF EXISTS greenhouse_commercial.party_endpoint_requests;
