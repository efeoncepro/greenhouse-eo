-- Up Migration

-- TASK-1718 — exact application-scoped candidate review packet.
-- The projection stores only minimized, redacted text extracted from a clean PDF.
-- It never stores raw bytes, contact fields, legal identity, assessment answers or scanner details.

CREATE TABLE greenhouse_hiring.candidate_document_review_projection (
  projection_id TEXT PRIMARY KEY DEFAULT ('cdrp-' || gen_random_uuid()::text),
  asset_id TEXT NOT NULL REFERENCES greenhouse_core.assets(asset_id) ON DELETE RESTRICT,
  application_id TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  extraction_version TEXT NOT NULL,
  redaction_policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready','ocr_required','blocked','failed','stale')),
  text_content TEXT,
  page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0),
  source_updated_at TIMESTAMPTZ NOT NULL,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT candidate_document_review_ready_shape CHECK (
    (status = 'ready' AND text_content IS NOT NULL AND length(text_content) > 0)
    OR (status <> 'ready' AND text_content IS NULL)
  ),
  UNIQUE (asset_id, content_hash, extraction_version, redaction_policy_version)
);
CREATE INDEX candidate_document_review_application_idx
  ON greenhouse_hiring.candidate_document_review_projection(application_id, extracted_at DESC);

CREATE TABLE greenhouse_hiring.candidate_review_access_audit (
  access_audit_id TEXT PRIMARY KEY DEFAULT ('cdraa-' || gen_random_uuid()::text),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed','denied')),
  route_kind TEXT NOT NULL CHECK (route_kind IN ('application_list','review_packet')),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'authorized','runtime_capability_denied','delegated_scope_denied',
    'delegated_context_invalid','reader_disabled','resource_not_found','stale_content'
  )),
  purpose TEXT CHECK (purpose IN (
    'screening_review','interview_preparation','evidence_comparison','audit_review'
  )),
  agent_host TEXT CHECK (agent_host ~ '^[a-z0-9][a-z0-9._-]{1,63}$'),
  actor_user_id TEXT NOT NULL,
  oauth_client_id TEXT NOT NULL,
  oauth_access_token_id TEXT,
  correlation_id TEXT,
  application_id TEXT,
  field_classes TEXT[] NOT NULL DEFAULT ARRAY[]::text[]
);
CREATE INDEX candidate_review_access_audit_occurred_idx
  ON greenhouse_hiring.candidate_review_access_audit(occurred_at DESC, outcome, reason_code);

CREATE TRIGGER trg_candidate_review_access_audit_append_only
BEFORE UPDATE OR DELETE ON greenhouse_hiring.candidate_review_access_audit
FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_talent_pool_history_mutation();

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key,module,allowed_actions,allowed_scopes,description,introduced_at,deprecated_at)
VALUES (
  'hiring.candidate.review.read','hiring',ARRAY['read'],ARRAY['tenant'],
  'Read an exact application-scoped, purpose-gated candidate review packet with minimized CV text.',NOW(),NULL
)
ON CONFLICT (capability_key) DO UPDATE SET
  module=EXCLUDED.module,allowed_actions=EXCLUDED.allowed_actions,
  allowed_scopes=EXCLUDED.allowed_scopes,description=EXCLUDED.description,deprecated_at=NULL;

INSERT INTO greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id,sister_platform_consumer_id,client_id,client_name,
  client_status,client_type,require_human_session,redirect_uris,allowed_scopes,
  code_ttl_seconds,access_token_ttl_seconds,require_pkce,issue_identity_inline,
  policy_json,metadata_json
)
VALUES (
  'spoauth-client-efeonce-mcp-hiring-review','spc-efeonce-mcp-gateway',
  'efeonce-mcp-hiring-review','Efeonce MCP delegated candidate review reader',
  'active','confidential',FALSE,ARRAY['https://mcp.efeonce.org/mcp']::text[],
  ARRAY['hiring.candidate.review.read']::text[],300,300,TRUE,FALSE,
  '{"schemaVersion":"1","audience":{"tenantTypes":["efeonce_internal"]},"requiredScopes":["hiring.candidate.review.read"],"capabilityScopes":["hiring.candidate.review.read"],"claims":{"includeGreenhouseRoles":false},"revocation":{"mode":"userinfo_revalidation","revalidateAfterSeconds":15,"requireOnPrivilegedAction":true}}'::jsonb,
  '{"resourceFamily":"hiring","grantType":"rfc8693_internal","purpose":"candidate_review_packet"}'::jsonb
)
ON CONFLICT (sister_platform_oauth_client_id) DO NOTHING;

ALTER TABLE greenhouse_hiring.candidate_document_review_projection OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.candidate_review_access_audit OWNER TO greenhouse_ops;
GRANT SELECT,INSERT,UPDATE,DELETE ON greenhouse_hiring.candidate_document_review_projection
  TO greenhouse_runtime,greenhouse_app,greenhouse_migrator_user;
GRANT SELECT,INSERT ON greenhouse_hiring.candidate_review_access_audit
  TO greenhouse_runtime,greenhouse_app,greenhouse_migrator_user;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key='hiring.candidate.review.read' AND deprecated_at IS NULL) THEN
    RAISE EXCEPTION 'TASK-1718 capability missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.sister_platform_oauth_clients
    WHERE sister_platform_oauth_client_id='spoauth-client-efeonce-mcp-hiring-review'
      AND allowed_scopes=ARRAY['hiring.candidate.review.read']::text[]) THEN
    RAISE EXCEPTION 'TASK-1718 MCP Hiring OAuth scope contract missing';
  END IF;
END $$;

-- Down Migration

DELETE FROM greenhouse_core.sister_platform_oauth_clients
WHERE sister_platform_oauth_client_id='spoauth-client-efeonce-mcp-hiring-review';
UPDATE greenhouse_core.capabilities_registry SET deprecated_at=NOW()
WHERE capability_key='hiring.candidate.review.read' AND deprecated_at IS NULL;
DROP TABLE IF EXISTS greenhouse_hiring.candidate_review_access_audit;
DROP TABLE IF EXISTS greenhouse_hiring.candidate_document_review_projection;
