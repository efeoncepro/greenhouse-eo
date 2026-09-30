-- Up Migration
-- TASK-1950: additive commercial demonstrations; no changes to legacy X-Ray or Insights.
CREATE SCHEMA IF NOT EXISTS greenhouse_xray AUTHORIZATION greenhouse_ops;
SET search_path = greenhouse_xray, greenhouse_core, public;

CREATE TABLE greenhouse_xray.cases (
  case_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  prospect_reference text NOT NULL CHECK (length(prospect_reference) BETWEEN 1 AND 200),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_id)
);
CREATE TABLE greenhouse_xray.drafts (
  case_id uuid PRIMARY KEY,
  organization_id text NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  intent_json jsonb NOT NULL CHECK (jsonb_typeof(intent_json) = 'object'),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, case_id) REFERENCES greenhouse_xray.cases(organization_id, case_id),
  CHECK (octet_length(intent_json::text) <= 2097152)
);
CREATE TABLE greenhouse_xray.editions (
  edition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  case_id uuid NOT NULL,
  draft_revision integer NOT NULL CHECK (draft_revision > 0),
  model_version text NOT NULL DEFAULT '1.0',
  manifest_json jsonb NOT NULL CHECK (jsonb_typeof(manifest_json) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  contract_version text NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  issued_by text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  withdrawn_by text,
  FOREIGN KEY (organization_id, case_id) REFERENCES greenhouse_xray.cases(organization_id, case_id),
  UNIQUE (organization_id, edition_id),
  UNIQUE (organization_id, case_id, idempotency_key),
  UNIQUE (organization_id, case_id, draft_revision),
  CHECK ((withdrawn_at IS NULL) = (withdrawn_by IS NULL)),
  CHECK (octet_length(manifest_json::text) <= 2097152)
);
CREATE TABLE greenhouse_xray.share_grants (
  grant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  edition_id uuid NOT NULL,
  token_digest text NOT NULL UNIQUE CHECK (token_digest ~ '^[a-f0-9]{64}$'),
  label text CHECK (length(label) BETWEEN 1 AND 120),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by text,
  FOREIGN KEY (organization_id, edition_id) REFERENCES greenhouse_xray.editions(organization_id, edition_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '90 days'),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);
CREATE INDEX xray_grants_edition_idx ON greenhouse_xray.share_grants(organization_id, edition_id);
CREATE TABLE greenhouse_xray.events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  case_id uuid NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('case_created','draft_updated','edition_issued','edition_withdrawn','share_created','share_revoked')),
  resource_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, case_id) REFERENCES greenhouse_xray.cases(organization_id, case_id)
);
CREATE TABLE greenhouse_xray.rate_buckets (
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY(subject_hash, window_start)
);

CREATE INDEX xray_rate_buckets_window_idx ON greenhouse_xray.rate_buckets(window_start);

CREATE FUNCTION greenhouse_xray.enforce_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'xray_history_immutable'; END IF;
  IF TG_TABLE_NAME = 'editions' THEN
    IF (to_jsonb(NEW) - 'withdrawn_at' - 'withdrawn_by') IS DISTINCT FROM
       (to_jsonb(OLD) - 'withdrawn_at' - 'withdrawn_by') OR OLD.withdrawn_at IS NOT NULL THEN
      RAISE EXCEPTION 'xray_edition_immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'share_grants' THEN
    IF (to_jsonb(NEW) - 'revoked_at' - 'revoked_by') IS DISTINCT FROM
       (to_jsonb(OLD) - 'revoked_at' - 'revoked_by') OR OLD.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'xray_grant_immutable';
    END IF;
  ELSE RAISE EXCEPTION 'xray_history_immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER xray_editions_immutable BEFORE UPDATE OR DELETE ON greenhouse_xray.editions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_xray.enforce_immutable();
CREATE TRIGGER xray_grants_immutable BEFORE UPDATE OR DELETE ON greenhouse_xray.share_grants
  FOR EACH ROW EXECUTE FUNCTION greenhouse_xray.enforce_immutable();
CREATE TRIGGER xray_events_immutable BEFORE UPDATE OR DELETE ON greenhouse_xray.events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_xray.enforce_immutable();
CREATE TRIGGER xray_cases_immutable BEFORE UPDATE OR DELETE ON greenhouse_xray.cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_xray.enforce_immutable();

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key,module,allowed_actions,allowed_scopes,description,introduced_at,deprecated_at)
VALUES
 ('growth.xray.case.read','growth',ARRAY['read'],ARRAY['tenant'],'Leer casos y borradores X-Ray internos',now(),NULL),
 ('growth.xray.draft.manage','growth',ARRAY['create','update'],ARRAY['tenant'],'Crear casos y editar borradores X-Ray',now(),NULL),
 ('growth.xray.edition.issue','growth',ARRAY['approve','update'],ARRAY['tenant'],'Emitir o retirar ediciones X-Ray',now(),NULL),
 ('growth.xray.share.manage','growth',ARRAY['create','read','update'],ARRAY['tenant'],'Compartir y revocar edición X-Ray exacta',now(),NULL)
ON CONFLICT(capability_key) DO UPDATE SET allowed_actions=EXCLUDED.allowed_actions,
 allowed_scopes=EXCLUDED.allowed_scopes, deprecated_at=NULL;

ALTER TABLE greenhouse_xray.cases OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_xray.drafts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_xray.editions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_xray.share_grants OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_xray.events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_xray.rate_buckets OWNER TO greenhouse_ops;
GRANT USAGE ON SCHEMA greenhouse_xray TO greenhouse_runtime, greenhouse_migrator_user;
GRANT SELECT, INSERT ON greenhouse_xray.cases, greenhouse_xray.events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_xray.drafts, greenhouse_xray.editions, greenhouse_xray.share_grants TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_xray.rate_buckets TO greenhouse_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA greenhouse_xray TO greenhouse_runtime, greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_xray TO greenhouse_migrator_user;
DO $$ BEGIN
 IF to_regclass('greenhouse_xray.share_grants') IS NULL OR to_regclass('greenhouse_xray.editions') IS NULL
 THEN RAISE EXCEPTION 'TASK-1950 missing migration objects'; END IF;
END $$;

-- Down Migration
-- No automatic destructive rollback of issued evidence. Disable surface and forward-fix.
DO $$ BEGIN RAISE EXCEPTION 'TASK-1950 forward-only: disable X-Ray and preserve editions/grants'; END $$;
