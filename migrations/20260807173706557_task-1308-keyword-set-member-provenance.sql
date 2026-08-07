-- Up Migration

-- TASK-1308 — Procedencia del seguimiento de una keyword.
--
-- `seo_keyword_set_members` nació (TASK-1299) como una tabla que sólo escribían scripts de
-- seed, así que no registraba QUIÉN agregó cada keyword. El command `trackKeywords` la
-- convierte en un write gobernado con tres consumers (UI operador, Nexa, MCP) y un efecto
-- diferido caro: el rank capture diario (TASK-1303) paga DataForSEO por cada keyword
-- vigente del set. Sin procedencia, "¿por qué estamos pagando por esta keyword?" no tiene
-- respuesta auditables — y ésa es exactamente la pregunta que llega cuando el gasto sube.
--
-- Ambas columnas son NULLABLE y sin backfill: las filas de seed preexistentes conservan
-- `NULL` honesto (no se sabe quién, porque nadie lo registró) en vez de un valor inventado.
--
-- `source` y `tags` son dimensiones ORTOGONALES y por eso son dos columnas: `tags` es
-- clasificación de dominio (tema, cluster) que elige el operador; `source` es procedencia
-- técnica del write. Meter la procedencia dentro de `tags` las mezclaría y rompería
-- cualquier filtro de dominio que hoy lee ese arreglo.

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS source     TEXT;

-- Vocabulario ENUMERADO, no texto libre: si el motor sólo entiende N valores, que el schema
-- los enumere. Un `source` nuevo debe romper el INSERT, no colarse y quedar invisible en
-- cualquier lectura que agrupe por procedencia.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_source_check'
  ) THEN
    ALTER TABLE greenhouse_growth.seo_keyword_set_members
      ADD CONSTRAINT seo_keyword_set_members_source_check
      CHECK (source IS NULL OR source IN ('operator_ui', 'nexa', 'mcp', 'seed', 'backfill'));
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_growth.seo_keyword_set_members.created_by IS
  'TASK-1308 — actor que agregó la keyword al set (identificador de sesión/agente). NULL en las filas de seed previas al command gobernado.';
COMMENT ON COLUMN greenhouse_growth.seo_keyword_set_members.source IS
  'TASK-1308 — procedencia del write: operator_ui | nexa | mcp | seed | backfill. Ortogonal a `tags` (clasificación de dominio).';

-- Guard anti pre-up-marker: si los markers quedaran invertidos, la migración se registraría
-- como aplicada sin ejecutar nada y `trackKeywords` escribiría contra columnas inexistentes.
DO $$
DECLARE missing_columns int;
BEGIN
  SELECT COUNT(*) INTO missing_columns
    FROM (VALUES ('created_by'), ('source')) AS expected(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'greenhouse_growth'
        AND table_name = 'seo_keyword_set_members'
        AND columns.column_name = expected.column_name
   );

  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'TASK-1308 anti pre-up-marker check: faltan % columnas de procedencia en greenhouse_growth.seo_keyword_set_members. Los markers de la migración pueden estar invertidos.', missing_columns;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seo_keyword_set_members_source_check'
  ) THEN
    RAISE EXCEPTION 'TASK-1308 anti pre-up-marker check: falta el CHECK del vocabulario de `source`.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  DROP CONSTRAINT IF EXISTS seo_keyword_set_members_source_check;

ALTER TABLE greenhouse_growth.seo_keyword_set_members
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS created_by;
