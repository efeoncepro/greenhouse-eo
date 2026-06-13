-- Up Migration
--
-- TASK-1081 — Knowledge Platform core schema (foundation).
--
-- Materializa `greenhouse_knowledge`: registry de fuentes, documentos, versiones
-- publicadas, chunks de recuperación, runs de publicación (audit) y feedback.
-- Additive-only, sin consumidores runtime hasta tasks downstream (TASK-1082+).
--
-- Decisiones canónicas (TASK-1080 aceptación + arquitectura V1):
--   * Estado editorial = DOS columnas ortogonales:
--       - publication_status (lifecycle): draft|review|published|stale|deprecated; +quarantined (bloqueo).
--       - agentic_policy (compuerta retrieval): agent_allowed|agent_excluded.
--     `quarantined` gana sobre todo (invisible humanos + agentes).
--   * MVP solo interno: sensitivity ∈ {internal, restricted} (client_safe diferido a fase cliente).
--   * NO es greenhouse_context (SCL = sidecar JSONB de memoria; esto = corpus de prosa + chunks).
--   * Full-text/tsvector + GIN diferidos a TASK-1083 (search API). Aquí se indexa owner/kind/metadata.
--   * Outbox events diferidos (sin consumidor); audit leg = knowledge_publication_runs (append-only).

CREATE SCHEMA IF NOT EXISTS greenhouse_knowledge;

CREATE SEQUENCE IF NOT EXISTS greenhouse_knowledge.seq_knowledge_source_public_id;
CREATE SEQUENCE IF NOT EXISTS greenhouse_knowledge.seq_knowledge_document_public_id;

-- 1. knowledge_sources — origen autorizado de conocimiento.
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_sources (
  source_id           TEXT PRIMARY KEY DEFAULT ('ksrc-' || gen_random_uuid()::text),
  public_id           TEXT NOT NULL UNIQUE
    DEFAULT ('EO-KSRC-' || lpad(nextval('greenhouse_knowledge.seq_knowledge_source_public_id')::text, 4, '0')),
  source_system       TEXT NOT NULL
    CHECK (source_system IN ('notion', 'repo_docs')),
  source_kind         TEXT NOT NULL
    CHECK (source_kind IN ('notion_page_tree', 'notion_data_source', 'markdown_collection')),
  name                TEXT NOT NULL,
  tenant_scope_type   TEXT NOT NULL DEFAULT 'global'
    CHECK (tenant_scope_type IN ('global', 'tenant')),
  tenant_scope_id     TEXT,
  audience            TEXT NOT NULL DEFAULT 'internal'
    CHECK (audience IN ('internal', 'client', 'mixed')),
  owner_domain        TEXT NOT NULL,
  secret_ref          TEXT,
  sync_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  publication_policy  TEXT NOT NULL DEFAULT 'manual_review'
    CHECK (publication_policy IN ('manual_review', 'auto_publish')),
  last_synced_at      TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_by_user_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_sources_tenant_scope_consistent
    CHECK (tenant_scope_type = 'global' OR tenant_scope_id IS NOT NULL)
);

-- 2. knowledge_documents — documento lógico (artículo editorial).
--    publication_status (lifecycle) y agentic_policy (compuerta retrieval) son ORTOGONALES.
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_documents (
  document_id         TEXT PRIMARY KEY DEFAULT ('kdoc-' || gen_random_uuid()::text),
  public_id           TEXT NOT NULL UNIQUE
    DEFAULT ('EO-KDOC-' || lpad(nextval('greenhouse_knowledge.seq_knowledge_document_public_id')::text, 4, '0')),
  source_id           TEXT NOT NULL
    REFERENCES greenhouse_knowledge.knowledge_sources(source_id) ON DELETE RESTRICT,
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  document_type       TEXT NOT NULL
    CHECK (document_type IN (
      'manual', 'how_to', 'sop', 'runbook', 'faq',
      'glossary', 'troubleshooting', 'policy', 'onboarding_path'
    )),
  owner_domain        TEXT NOT NULL,
  approver_role       TEXT,
  audience            TEXT NOT NULL DEFAULT 'internal'
    CHECK (audience IN ('internal', 'client', 'mixed')),
  sensitivity         TEXT NOT NULL DEFAULT 'internal'
    CHECK (sensitivity IN ('internal', 'restricted')),
  publication_status  TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'review', 'published', 'stale', 'deprecated', 'quarantined')),
  agentic_policy      TEXT NOT NULL DEFAULT 'agent_allowed'
    CHECK (agentic_policy IN ('agent_allowed', 'agent_excluded')),
  current_version_id  TEXT,
  human_url           TEXT,
  review_cadence_days INTEGER
    CHECK (review_cadence_days IS NULL OR review_cadence_days > 0),
  last_reviewed_at    TIMESTAMPTZ,
  doc_layer           TEXT
    CHECK (doc_layer IS NULL OR doc_layer IN ('technical', 'functional', 'manual')),
  created_by_user_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. knowledge_document_versions — snapshot inmutable publicado (lineage por checksum).
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_document_versions (
  version_id          TEXT PRIMARY KEY DEFAULT ('kver-' || gen_random_uuid()::text),
  document_id         TEXT NOT NULL
    REFERENCES greenhouse_knowledge.knowledge_documents(document_id) ON DELETE RESTRICT,
  version_number      INTEGER NOT NULL CHECK (version_number > 0),
  source_url          TEXT,
  source_page_id      TEXT,
  checksum            TEXT NOT NULL,
  normalized_markdown TEXT NOT NULL,
  sensitivity         TEXT NOT NULL
    CHECK (sensitivity IN ('internal', 'restricted')),
  version_status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (version_status IN ('draft', 'published', 'superseded')),
  published_by_user_id TEXT,
  published_at        TIMESTAMPTZ,
  source_created_at   TIMESTAMPTZ,
  source_edited_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_document_versions_unique_number UNIQUE (document_id, version_number)
);

-- Circular FK: documents.current_version_id -> versions (additive tras crear versions).
ALTER TABLE greenhouse_knowledge.knowledge_documents
  ADD CONSTRAINT knowledge_documents_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES greenhouse_knowledge.knowledge_document_versions(version_id) ON DELETE SET NULL;

-- 4. knowledge_chunks — unidad de recuperación agéntica.
--    Denormaliza audience/sensitivity/freshness/agentic_policy para filtrado pre-LLM sin JOIN.
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_chunks (
  chunk_id            TEXT PRIMARY KEY DEFAULT ('kchk-' || gen_random_uuid()::text),
  document_version_id TEXT NOT NULL
    REFERENCES greenhouse_knowledge.knowledge_document_versions(version_id) ON DELETE RESTRICT,
  document_id         TEXT NOT NULL
    REFERENCES greenhouse_knowledge.knowledge_documents(document_id) ON DELETE RESTRICT,
  chunk_index         INTEGER NOT NULL CHECK (chunk_index >= 0),
  heading_path        TEXT[] NOT NULL DEFAULT '{}',
  body_text           TEXT NOT NULL,
  citation_anchor     TEXT NOT NULL,
  token_estimate      INTEGER NOT NULL DEFAULT 0 CHECK (token_estimate >= 0),
  allowed_scopes      TEXT[] NOT NULL DEFAULT '{}',
  audience            TEXT NOT NULL
    CHECK (audience IN ('internal', 'client', 'mixed')),
  sensitivity         TEXT NOT NULL
    CHECK (sensitivity IN ('internal', 'restricted')),
  freshness           TEXT NOT NULL DEFAULT 'current'
    CHECK (freshness IN ('current', 'stale', 'deprecated', 'unknown')),
  agentic_policy      TEXT NOT NULL DEFAULT 'agent_allowed'
    CHECK (agentic_policy IN ('agent_allowed', 'agent_excluded')),
  source_position     INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_chunks_unique_index UNIQUE (document_version_id, chunk_index)
);

-- 5. knowledge_publication_runs — audit de sync/publicación (semántica source_sync_runs: anti-DELETE).
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_publication_runs (
  run_id              TEXT PRIMARY KEY DEFAULT ('krun-' || gen_random_uuid()::text),
  source_id           TEXT
    REFERENCES greenhouse_knowledge.knowledge_sources(source_id) ON DELETE RESTRICT,
  document_id         TEXT
    REFERENCES greenhouse_knowledge.knowledge_documents(document_id) ON DELETE RESTRICT,
  run_kind            TEXT NOT NULL
    CHECK (run_kind IN ('sync', 'publish', 'quarantine', 'deprecate', 'stale_mark', 'feedback')),
  status              TEXT NOT NULL
    CHECK (status IN ('running', 'succeeded', 'failed', 'skipped')),
  actor               TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at         TIMESTAMPTZ,
  details_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_summary       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. knowledge_feedback — feedback humano/agente (append-only: anti-UPDATE + anti-DELETE).
CREATE TABLE IF NOT EXISTS greenhouse_knowledge.knowledge_feedback (
  feedback_id         TEXT PRIMARY KEY DEFAULT ('kfb-' || gen_random_uuid()::text),
  document_id         TEXT
    REFERENCES greenhouse_knowledge.knowledge_documents(document_id) ON DELETE RESTRICT,
  chunk_id            TEXT
    REFERENCES greenhouse_knowledge.knowledge_chunks(chunk_id) ON DELETE RESTRICT,
  feedback_kind       TEXT NOT NULL
    CHECK (feedback_kind IN ('useful', 'not_useful', 'wrong_source', 'stale', 'missing_doc')),
  submitted_by_user_id TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  comment             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes (owner/kind/metadata first; full-text/GIN deferred to TASK-1083).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS knowledge_sources_system_status_idx
  ON greenhouse_knowledge.knowledge_sources (source_system, status);
CREATE INDEX IF NOT EXISTS knowledge_sources_sync_enabled_idx
  ON greenhouse_knowledge.knowledge_sources (sync_enabled);

CREATE INDEX IF NOT EXISTS knowledge_documents_source_idx
  ON greenhouse_knowledge.knowledge_documents (source_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_status_idx
  ON greenhouse_knowledge.knowledge_documents (publication_status);
CREATE INDEX IF NOT EXISTS knowledge_documents_agentic_idx
  ON greenhouse_knowledge.knowledge_documents (agentic_policy);
CREATE INDEX IF NOT EXISTS knowledge_documents_type_idx
  ON greenhouse_knowledge.knowledge_documents (document_type);

CREATE INDEX IF NOT EXISTS knowledge_document_versions_document_idx
  ON greenhouse_knowledge.knowledge_document_versions (document_id);
CREATE INDEX IF NOT EXISTS knowledge_document_versions_status_idx
  ON greenhouse_knowledge.knowledge_document_versions (version_status);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
  ON greenhouse_knowledge.knowledge_chunks (document_id);
-- Pre-LLM access filtering (TASK-1083 retrieval) hits these denormalized columns.
CREATE INDEX IF NOT EXISTS knowledge_chunks_access_filter_idx
  ON greenhouse_knowledge.knowledge_chunks (agentic_policy, audience, sensitivity);
CREATE INDEX IF NOT EXISTS knowledge_chunks_freshness_idx
  ON greenhouse_knowledge.knowledge_chunks (freshness);

CREATE INDEX IF NOT EXISTS knowledge_publication_runs_source_started_idx
  ON greenhouse_knowledge.knowledge_publication_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_publication_runs_document_idx
  ON greenhouse_knowledge.knowledge_publication_runs (document_id);
CREATE INDEX IF NOT EXISTS knowledge_publication_runs_status_idx
  ON greenhouse_knowledge.knowledge_publication_runs (status);

CREATE INDEX IF NOT EXISTS knowledge_feedback_document_idx
  ON greenhouse_knowledge.knowledge_feedback (document_id);
CREATE INDEX IF NOT EXISTS knowledge_feedback_kind_idx
  ON greenhouse_knowledge.knowledge_feedback (feedback_kind);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- touch updated_at (sources + documents).
CREATE OR REPLACE FUNCTION greenhouse_knowledge.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_knowledge_sources_touch_updated_at
BEFORE UPDATE ON greenhouse_knowledge.knowledge_sources
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.touch_updated_at();

CREATE TRIGGER trg_knowledge_documents_touch_updated_at
BEFORE UPDATE ON greenhouse_knowledge.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.touch_updated_at();

-- publication_status transition validation (mirror del matrix TS state-machine.ts).
CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_documents_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.publication_status = OLD.publication_status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.publication_status = 'draft'       AND NEW.publication_status IN ('review', 'published', 'quarantined')) OR
    (OLD.publication_status = 'review'      AND NEW.publication_status IN ('published', 'draft', 'quarantined')) OR
    (OLD.publication_status = 'published'   AND NEW.publication_status IN ('stale', 'deprecated', 'quarantined')) OR
    (OLD.publication_status = 'stale'       AND NEW.publication_status IN ('published', 'deprecated', 'quarantined')) OR
    (OLD.publication_status = 'deprecated'  AND NEW.publication_status IN ('published', 'quarantined')) OR
    (OLD.publication_status = 'quarantined' AND NEW.publication_status IN ('draft', 'review', 'published'))
  ) THEN
    RAISE EXCEPTION 'knowledge_documents: invalid publication_status transition % -> %',
      OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_knowledge_documents_validate_transition
BEFORE UPDATE ON greenhouse_knowledge.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.knowledge_documents_validate_transition();

-- knowledge_publication_runs: anti-DELETE (forensic). UPDATE permitido (running -> terminal).
CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_publication_runs_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'knowledge_publication_runs is forensic; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_knowledge_publication_runs_no_delete
BEFORE DELETE ON greenhouse_knowledge.knowledge_publication_runs
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.knowledge_publication_runs_prevent_delete();

-- knowledge_feedback: append-only (anti-UPDATE + anti-DELETE).
CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'knowledge_feedback is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'knowledge_feedback is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_knowledge_feedback_no_update
BEFORE UPDATE ON greenhouse_knowledge.knowledge_feedback
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_update();

CREATE TRIGGER trg_knowledge_feedback_no_delete
BEFORE DELETE ON greenhouse_knowledge.knowledge_feedback
FOR EACH ROW
EXECUTE FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_delete();

-- ---------------------------------------------------------------------------
-- Anti pre-up-marker bug guard (CLAUDE.md): aborta si objetos no quedaron creados.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  table_count    INTEGER;
  has_transition BOOLEAN;
  has_current_fk BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_knowledge'
    AND table_name IN (
      'knowledge_sources', 'knowledge_documents', 'knowledge_document_versions',
      'knowledge_chunks', 'knowledge_publication_runs', 'knowledge_feedback'
    );

  IF table_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1081 anti pre-up-marker: expected 6 greenhouse_knowledge tables, got %', table_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_knowledge'
      AND p.proname = 'knowledge_documents_validate_transition'
  ) INTO has_transition;

  IF NOT has_transition THEN
    RAISE EXCEPTION 'TASK-1081 anti pre-up-marker: publication_status transition trigger function was NOT created.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_documents_current_version_fk'
  ) INTO has_current_fk;

  IF NOT has_current_fk THEN
    RAISE EXCEPTION 'TASK-1081 anti pre-up-marker: current_version_id FK was NOT created.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Ownership + GRANTs
-- ---------------------------------------------------------------------------
ALTER SCHEMA greenhouse_knowledge OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_knowledge TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_knowledge TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_knowledge TO greenhouse_migrator_user;

ALTER TABLE greenhouse_knowledge.knowledge_sources OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_knowledge.knowledge_documents OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_knowledge.knowledge_document_versions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_knowledge.knowledge_chunks OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_knowledge.knowledge_publication_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_knowledge.knowledge_feedback OWNER TO greenhouse_ops;

ALTER SEQUENCE greenhouse_knowledge.seq_knowledge_source_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_knowledge.seq_knowledge_document_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_sources TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_sources TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_sources TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_documents TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_documents TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_documents TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_document_versions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_document_versions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_document_versions TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_chunks TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_chunks TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_chunks TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_publication_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_publication_runs TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_publication_runs TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_feedback TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_feedback TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_knowledge.knowledge_feedback TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_source_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_source_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_source_public_id TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_document_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_document_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_knowledge.seq_knowledge_document_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_knowledge.touch_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_knowledge.knowledge_documents_validate_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_knowledge.knowledge_publication_runs_prevent_delete() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_knowledge.knowledge_feedback_prevent_delete() TO greenhouse_runtime;

-- Down Migration

DROP SCHEMA IF EXISTS greenhouse_knowledge CASCADE;
