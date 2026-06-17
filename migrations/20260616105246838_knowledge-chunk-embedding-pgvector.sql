-- Up Migration
-- TASK-1151 — Knowledge hybrid retrieval (FTS + pgvector) gated implementation.
-- Additive: agrega el substrato vector a knowledge_chunks. Inerte hasta que el flag
-- KNOWLEDGE_SEARCH_HYBRID_ENABLED esté ON (default OFF → byte-equivalente al FTS+rerank).
-- pgvector vive en el Cloud SQL existente (decision packet TASK-1136 §5: ruta barata,
-- sin infra managed). Embeddings = paso de ingesta idempotente por checksum (NO request path).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_checksum TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- HNSW + cosine: el brazo vector rankea por distancia coseno (decision packet usa cosine).
-- NULLs (chunks aún sin embedding) se ignoran en el índice → poblado parcial es seguro.
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON greenhouse_knowledge.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Anti pre-up-marker guard: aborta si el DDL no quedó realmente aplicado.
DO $$
DECLARE
  has_extension BOOLEAN;
  has_column BOOLEAN;
  has_index BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') INTO has_extension;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_knowledge'
      AND table_name = 'knowledge_chunks'
      AND column_name = 'embedding'
  ) INTO has_column;
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_knowledge'
      AND indexname = 'knowledge_chunks_embedding_hnsw'
  ) INTO has_index;

  IF NOT has_extension THEN
    RAISE EXCEPTION 'TASK-1151: pgvector extension was NOT created.';
  END IF;
  IF NOT has_column THEN
    RAISE EXCEPTION 'TASK-1151: knowledge_chunks.embedding column was NOT created. Markers may be inverted.';
  END IF;
  IF NOT has_index THEN
    RAISE EXCEPTION 'TASK-1151: HNSW index was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_knowledge.knowledge_chunks_embedding_hnsw;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  DROP COLUMN IF EXISTS embedding,
  DROP COLUMN IF EXISTS embedding_model,
  DROP COLUMN IF EXISTS embedding_checksum,
  DROP COLUMN IF EXISTS embedding_updated_at;

-- La extensión `vector` NO se elimina en el down: puede ser usada por otros objetos y
-- DROP EXTENSION es destructivo a nivel instancia. Es idempotente dejarla.
