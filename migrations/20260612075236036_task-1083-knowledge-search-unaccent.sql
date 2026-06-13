-- Up Migration
--
-- TASK-1083 — Knowledge Search accent-insensitive (recall fix revelado por las
-- golden questions). El stemmer 'spanish' trata 'nómina' y 'nomina' como lexemas
-- distintos: una query acentuada no matchea corpus sin acentos (y viceversa). Los
-- usuarios tipean de ambas formas. Fix robusto: foldear acentos vía `unaccent` en
-- el tsvector indexado Y en la tsquery (reader). El substrato vector queda diferido.
--
-- `unaccent(text)` 1-arg es STABLE; encapsulado en la función IMMUTABLE existente
-- (PG confía en el marcado — patrón canónico de FTS accent-insensitive con columna
-- GENERATED). Hay que recomputar la columna almacenada: se dropea + re-agrega (la
-- columna GENERATED solo recomputa en UPDATE/re-creación).

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Quitar el índice + la columna libera la dependencia sobre la función.
DROP INDEX IF EXISTS greenhouse_knowledge.knowledge_chunks_body_tsv_gin;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  DROP COLUMN IF EXISTS body_tsv;

CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_chunk_tsv(heading text[], body text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT setweight(to_tsvector('spanish', unaccent(coalesce(array_to_string(heading, ' '), ''))), 'A')
      || setweight(to_tsvector('spanish', unaccent(coalesce(body, ''))), 'B')
$$;

-- Re-agregar recomputa los 263 chunks con la definición accent-insensitive.
ALTER TABLE greenhouse_knowledge.knowledge_chunks
  ADD COLUMN body_tsv tsvector
  GENERATED ALWAYS AS (greenhouse_knowledge.knowledge_chunk_tsv(heading_path, body_text)) STORED;

CREATE INDEX knowledge_chunks_body_tsv_gin
  ON greenhouse_knowledge.knowledge_chunks USING GIN (body_tsv);

-- Anti pre-up-marker guard: aborta si la columna no quedó re-creada.
DO $$
DECLARE
  col_exists boolean;
  idx_exists boolean;
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

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1083 unaccent: body_tsv column was NOT re-created.';
  END IF;

  IF NOT idx_exists THEN
    RAISE EXCEPTION 'TASK-1083 unaccent: knowledge_chunks_body_tsv_gin index was NOT re-created.';
  END IF;
END
$$;

-- Down Migration
--
-- Revierte a la definición accent-sensitive (sin unaccent), recomputando.

DROP INDEX IF EXISTS greenhouse_knowledge.knowledge_chunks_body_tsv_gin;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  DROP COLUMN IF EXISTS body_tsv;

CREATE OR REPLACE FUNCTION greenhouse_knowledge.knowledge_chunk_tsv(heading text[], body text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT setweight(to_tsvector('spanish', coalesce(array_to_string(heading, ' '), '')), 'A')
      || setweight(to_tsvector('spanish', coalesce(body, '')), 'B')
$$;

ALTER TABLE greenhouse_knowledge.knowledge_chunks
  ADD COLUMN body_tsv tsvector
  GENERATED ALWAYS AS (greenhouse_knowledge.knowledge_chunk_tsv(heading_path, body_text)) STORED;

CREATE INDEX knowledge_chunks_body_tsv_gin
  ON greenhouse_knowledge.knowledge_chunks USING GIN (body_tsv);
