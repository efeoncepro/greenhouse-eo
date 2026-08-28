-- Up Migration

-- TASK-1696 (forward fix de 20260828015655472) — la BASE DE COSTO también es identidad de la fila.
--
-- 🔴 DEFECTO ENCONTRADO EJERCITANDO EL SQL PRODUCTIVO CONTRA PG, NO REVISÁNDOLO:
-- con la clave `(organization_id, family, spend_date, consumer)`, un dólar ESTIMADO del mismo
-- día, familia y consumidor que uno FACTURADO colisiona con su fila y entra por el `DO UPDATE`.
-- El `DO UPDATE` suma el monto pero NO toca `cost_basis`, así que el dólar estimado queda
-- guardado bajo la etiqueta `invoiced` — reetiquetado, sin error y sin rastro.
--
-- Es EXACTAMENTE la mentira que las dos columnas de honestidad existen para impedir: el ledger
-- estaría mezclando dólares facturados con estimados sin declararlo, que es la regla dura que la
-- task escribió y que la clave de 4 columnas no alcanzaba a sostener. La declaración no sirve de
-- nada si la clave la deja colapsar.
--
-- `price_table_version` entra por la misma razón, un escalón más abajo: dos corridas estimadas
-- con TABLAS DE PRECIOS DISTINTAS el mismo día colapsarían en una fila que declara una sola
-- versión — la procedencia de parte de la suma sería falsa. `NULLS NOT DISTINCT` (PostgreSQL 15+)
-- es lo que permite incluirla sin romper nada: las filas facturadas tienen la columna en NULL, y
-- con el comportamiento por defecto (`NULLS DISTINCT`) NULL nunca iguala a NULL, así que el
-- `ON CONFLICT` no encontraría su fila y CADA llamada cobrada insertaría una fila nueva en vez de
-- acumular. El total seguiría siendo correcto, pero el ledger dejaría de ser diario.
--
-- ⚠️ La migración anterior NO se edita (ya está aplicada y registrada): CLAUDE.md §Migration
-- markers — una migración aplicada se corrige hacia adelante, idempotente, nunca en su archivo.

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_unique;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_unique
  UNIQUE NULLS NOT DISTINCT (organization_id, family, spend_date, consumer, cost_basis, price_table_version);

-- Anti pre-up-marker guard: verifica la forma REAL de la clave, incluido el tratamiento de NULL.
-- Sin `NULLS NOT DISTINCT` el UPSERT deja de acumular en silencio (una fila por llamada), y eso
-- no se nota mirando totales — sólo contando filas meses después.
DO $$
DECLARE
  unique_columns text;
  nulls_distinct boolean;
BEGIN
  SELECT string_agg(att.attname, ',' ORDER BY key.ord)
    INTO unique_columns
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS key(attnum, ord)
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = key.attnum
   WHERE con.conname = 'seo_provider_spend_daily_unique';

  IF unique_columns IS DISTINCT FROM 'organization_id,family,spend_date,consumer,cost_basis,price_table_version' THEN
    RAISE EXCEPTION 'TASK-1696 forward fix: seo_provider_spend_daily_unique debe cubrir (organization_id, family, spend_date, consumer, cost_basis, price_table_version); quedo en (%).', COALESCE(unique_columns, 'ausente');
  END IF;

  SELECT idx.indnullsnotdistinct
    INTO nulls_distinct
    FROM pg_constraint con
    JOIN pg_index idx ON idx.indexrelid = con.conindid
   WHERE con.conname = 'seo_provider_spend_daily_unique';

  IF NOT COALESCE(nulls_distinct, false) THEN
    RAISE EXCEPTION 'TASK-1696 forward fix: la UNIQUE debe ser NULLS NOT DISTINCT. Con NULLS DISTINCT el ON CONFLICT no encuentra la fila facturada del dia (price_table_version es NULL) y cada llamada cobrada inserta una fila nueva en vez de acumular.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_unique;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_unique
  UNIQUE (organization_id, family, spend_date, consumer);
