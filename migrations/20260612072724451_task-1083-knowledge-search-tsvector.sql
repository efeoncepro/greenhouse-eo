-- Up Migration
--
-- TASK-1083 — Knowledge Search full-text substrate.
-- Weighted tsvector (heading 'A' > body 'B') + GIN sobre knowledge_chunks.
-- Config 'spanish' (corpus es-CL dominante; stemming da recall real
-- periodos<->periodo, nominas<->nomina; términos técnicos en inglés matchean
-- como tokens casi-exactos). Vector/embeddings es escalación diferida (TASK-1080).
--
-- La definición del tsvector vive en una función IMMUTABLE (SSOT): la usa la
-- columna GENERATED del índice y la puede reusar el ranking del reader, así
-- nunca divergen. Una columna GENERATED exige una expresión IMMUTABLE; el inline
-- `to_tsvector('spanish', ...)` resuelve 'spanish'->regconfig como STABLE, por eso
-- se encapsula en una función marcada IMMUTABLE (patrón canónico de FTS PG).

CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_chunk_tsv(heading text[], body text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT setweight(to_tsvector('spanish', coalesce(array_to_string(heading, ' '), '')), 'A')
      || setweight(to_tsvector('spanish', coalesce(body, '')), 'B')
$$;

ALTER FUNCTION greenhouse_knowledge.knowledge_chunk_tsv(text[], text) OWNER TO greenhouse_ops;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  ADD COLUMN IF NOT EXISTS body_tsv tsvector
  GENERATED ALWAYS AS (greenhouse_knowledge.knowledge_chunk_tsv(heading_path, body_text)) STORED;

CREATE INDEX IF NOT EXISTS knowledge_chunks_body_tsv_gin
  ON greenhouse_knowledge.knowledge_chunks USING GIN (body_tsv);

-- Anti pre-up-marker bug guard (CLAUDE.md migration markers): aborta si el DDL
-- no quedó realmente aplicado.
DO $$
DECLARE
  col_exists boolean;
  idx_exists boolean;
  fn_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_knowledge'
      AND table_name = 'knowledge_chunks'
      AND column_name = 'body_tsv'
  ) INTO col_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_knowledge'
      AND indexname = 'knowledge_chunks_body_tsv_gin'
  ) INTO idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_knowledge'
      AND p.proname = 'knowledge_chunk_tsv'
  ) INTO fn_exists;

  IF NOT fn_exists THEN
    RAISE EXCEPTION 'TASK-1083 anti pre-up-marker: knowledge_chunk_tsv function was NOT created.';
  END IF;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1083 anti pre-up-marker: body_tsv column was NOT created.';
  END IF;

  IF NOT idx_exists THEN
    RAISE EXCEPTION 'TASK-1083 anti pre-up-marker: knowledge_chunks_body_tsv_gin index was NOT created.';
  END IF;
END
$$;

-- La columna generada hereda los GRANTs de la tabla (SELECT a greenhouse_runtime/app
-- ya concedido en la migración 20260611200140700); no requiere GRANT propio.

-- Down Migration

DROP INDEX IF EXISTS greenhouse_knowledge.knowledge_chunks_body_tsv_gin;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  DROP COLUMN IF EXISTS body_tsv;

DROP FUNCTION IF EXISTS greenhouse_knowledge.knowledge_chunk_tsv(text[], text);
