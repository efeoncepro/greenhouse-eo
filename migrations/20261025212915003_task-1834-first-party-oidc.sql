-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
-- TASK-1834: Rooms is the first consumer; no delegated grants, gv or MCP consents are fabricated.
CREATE TABLE greenhouse_auth.first_party_clients (
  client_id TEXT PRIMARY KEY CHECK (client_id ~ '^efeonce-rp-[a-z0-9][a-z0-9._-]{1,100}$'),
  product TEXT NOT NULL CHECK (product IN ('rooms','synthetic-rp')),
  redirect_uris TEXT[] NOT NULL CHECK (cardinality(redirect_uris) BETWEEN 1 AND 10 AND array_to_string(redirect_uris,' ') NOT LIKE '%*%'),
  token_endpoint_auth_method TEXT NOT NULL CHECK (token_endpoint_auth_method IN ('client_secret_basic','client_secret_post')),
  client_secret_hash TEXT NOT NULL CHECK (client_secret_hash ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','retired')),
  allow_local_development BOOLEAN NOT NULL DEFAULT FALSE,
  session_max_age_seconds INTEGER NOT NULL CHECK (session_max_age_seconds BETWEEN 60 AND 86400),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE greenhouse_auth.first_party_login_transactions (
  transaction_hash TEXT PRIMARY KEY CHECK (transaction_hash ~ '^[0-9a-f]{64}$'),
  client_id TEXT NOT NULL REFERENCES greenhouse_auth.first_party_clients(client_id) ON DELETE RESTRICT,
  authorization_url TEXT NOT NULL,
  fresh_after TIMESTAMPTZ,
  previous_session_hash TEXT CHECK (previous_session_hash IS NULL OR previous_session_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
CREATE TABLE greenhouse_auth.first_party_codes (
  code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  client_id TEXT NOT NULL REFERENCES greenhouse_auth.first_party_clients(client_id) ON DELETE RESTRICT,
  session_hash TEXT NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  subject TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL CHECK (length(code_challenge)=43),
  nonce TEXT NOT NULL CHECK (length(nonce) BETWEEN 1 AND 2048),
  auth_time TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  UNIQUE(code_hash,client_id),
  CHECK (expires_at>created_at AND expires_at<=created_at+INTERVAL '5 minutes')
);
CREATE TABLE greenhouse_auth.first_party_access_handles (
  token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash TEXT NOT NULL,
  client_id TEXT NOT NULL,
  FOREIGN KEY(code_hash,client_id) REFERENCES greenhouse_auth.first_party_codes(code_hash,client_id) ON DELETE RESTRICT,
  session_hash TEXT NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  subject TEXT NOT NULL,
  auth_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at>created_at AND expires_at<=created_at+INTERVAL '5 minutes')
);
CREATE INDEX first_party_login_transactions_expiry_idx ON greenhouse_auth.first_party_login_transactions(expires_at);
CREATE INDEX first_party_codes_expiry_idx ON greenhouse_auth.first_party_codes(expires_at);
CREATE INDEX first_party_access_handles_code_idx ON greenhouse_auth.first_party_access_handles(code_hash);
CREATE INDEX first_party_access_handles_expiry_idx ON greenhouse_auth.first_party_access_handles(expires_at);
CREATE INDEX first_party_access_handles_session_idx ON greenhouse_auth.first_party_access_handles(session_hash) WHERE revoked_at IS NULL;
ALTER TABLE greenhouse_auth.first_party_clients OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.first_party_login_transactions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.first_party_codes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.first_party_access_handles OWNER TO greenhouse_ops;
GRANT SELECT,INSERT,UPDATE ON greenhouse_auth.first_party_clients, greenhouse_auth.first_party_login_transactions,
 greenhouse_auth.first_party_codes, greenhouse_auth.first_party_access_handles TO greenhouse_runtime,greenhouse_app;

-- Explicit, bounded retention primitive. Scheduling remains the existing auth GC operator's responsibility.
CREATE FUNCTION greenhouse_auth.gc_first_party_ephemeral(batch_size INTEGER DEFAULT 500, dry_run BOOLEAN DEFAULT TRUE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,greenhouse_auth AS $$
DECLARE handles_count INTEGER; codes_count INTEGER; transactions_count INTEGER; cutoff TIMESTAMPTZ := now()-INTERVAL '30 days';
BEGIN
 IF batch_size IS NULL OR dry_run IS NULL OR batch_size<1 OR batch_size>500 THEN RAISE EXCEPTION 'first_party_gc_invalid_batch'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('greenhouse_auth.gc_first_party_ephemeral'));
 SELECT count(*) INTO handles_count FROM (SELECT token_hash FROM greenhouse_auth.first_party_access_handles WHERE expires_at<cutoff LIMIT batch_size) t;
 IF NOT dry_run THEN DELETE FROM greenhouse_auth.first_party_access_handles WHERE token_hash IN
   (SELECT token_hash FROM greenhouse_auth.first_party_access_handles WHERE expires_at<cutoff ORDER BY expires_at LIMIT batch_size); END IF;
 SELECT count(*) INTO codes_count FROM (SELECT code_hash FROM greenhouse_auth.first_party_codes c WHERE expires_at<cutoff
   AND NOT EXISTS (SELECT 1 FROM greenhouse_auth.first_party_access_handles h WHERE h.code_hash=c.code_hash) LIMIT batch_size) t;
 IF NOT dry_run THEN DELETE FROM greenhouse_auth.first_party_codes WHERE code_hash IN
   (SELECT code_hash FROM greenhouse_auth.first_party_codes c WHERE expires_at<cutoff
    AND NOT EXISTS (SELECT 1 FROM greenhouse_auth.first_party_access_handles h WHERE h.code_hash=c.code_hash) ORDER BY expires_at LIMIT batch_size); END IF;
 SELECT count(*) INTO transactions_count FROM (SELECT transaction_hash FROM greenhouse_auth.first_party_login_transactions WHERE expires_at<cutoff LIMIT batch_size) t;
 IF NOT dry_run THEN DELETE FROM greenhouse_auth.first_party_login_transactions WHERE transaction_hash IN
   (SELECT transaction_hash FROM greenhouse_auth.first_party_login_transactions WHERE expires_at<cutoff ORDER BY expires_at LIMIT batch_size); END IF;
 RETURN jsonb_build_object('dryRun',dry_run,'handles',handles_count,'codes',codes_count,'transactions',transactions_count);
END $$;
ALTER FUNCTION greenhouse_auth.gc_first_party_ephemeral(INTEGER,BOOLEAN) OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_auth.gc_first_party_ephemeral(INTEGER,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION greenhouse_auth.gc_first_party_ephemeral(INTEGER,BOOLEAN) TO greenhouse_runtime,greenhouse_app;

DO $$
DECLARE table_count INTEGER; index_count INTEGER; constraint_count INTEGER;
BEGIN
 SELECT count(*) INTO table_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='greenhouse_auth' AND c.relkind='r' AND c.relname IN
 ('first_party_clients','first_party_login_transactions','first_party_codes','first_party_access_handles');
 SELECT count(*) INTO index_count FROM pg_indexes WHERE schemaname='greenhouse_auth' AND indexname IN
 ('first_party_login_transactions_expiry_idx','first_party_codes_expiry_idx','first_party_access_handles_code_idx','first_party_access_handles_expiry_idx','first_party_access_handles_session_idx');
 SELECT count(*) INTO constraint_count FROM pg_constraint WHERE conrelid IN
 ('greenhouse_auth.first_party_clients'::regclass,'greenhouse_auth.first_party_login_transactions'::regclass,
 'greenhouse_auth.first_party_codes'::regclass,'greenhouse_auth.first_party_access_handles'::regclass) AND contype IN ('p','f','c');
 IF table_count<>4 OR index_count<>5 OR constraint_count<20 OR to_regprocedure('greenhouse_auth.gc_first_party_ephemeral(integer,boolean)') IS NULL THEN
  RAISE EXCEPTION 'TASK-1834 migration incomplete: tables=%, indexes=%, constraints=%', table_count,index_count,constraint_count;
 END IF;
END $$;

-- Down Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
DROP FUNCTION greenhouse_auth.gc_first_party_ephemeral(INTEGER,BOOLEAN);
DROP TABLE greenhouse_auth.first_party_access_handles;
DROP TABLE greenhouse_auth.first_party_codes;
DROP TABLE greenhouse_auth.first_party_login_transactions;
DROP TABLE greenhouse_auth.first_party_clients;

DO $$ BEGIN
 IF to_regclass('greenhouse_auth.first_party_clients') IS NOT NULL OR
    to_regclass('greenhouse_auth.first_party_login_transactions') IS NOT NULL OR
    to_regclass('greenhouse_auth.first_party_codes') IS NOT NULL OR
    to_regclass('greenhouse_auth.first_party_access_handles') IS NOT NULL OR
    to_regprocedure('greenhouse_auth.gc_first_party_ephemeral(integer,boolean)') IS NOT NULL THEN
  RAISE EXCEPTION 'TASK-1834 down migration incomplete';
 END IF;
END $$;
