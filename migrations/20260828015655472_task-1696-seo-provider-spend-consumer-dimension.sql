-- Up Migration

-- TASK-1696 — El ledger de gasto DataForSEO gana la dimensión que le faltaba: QUIÉN consumió
-- cada dólar, y de QUÉ TIPO es ese dólar.
--
-- ⚠️ UNA FACTURA, UNA TABLA. No se abre un `aeo_provider_spend_daily`. Dos tablas del mismo
-- hecho son dos verdades y una reconciliación manual que nadie va a hacer. Lo que se separa es
-- el RESOLVER de presupuesto (`resolveSeoEntitlement` para SEO, `resolveAeoBudget` para AEO),
-- que lee la MISMA tabla con distinto filtro.
--
-- Tres columnas, dos propósitos:
--
--   1. `consumer` — dimensión del hecho, y por eso entra en la CLAVE ÚNICA. Dos consumidores el
--      mismo día sobre la misma familia son DOS FILAS, jamás un total mezclado del que después
--      no se pueda restar el gasto del grader para responder "¿cuánto lleva gastado el cliente
--      en SEO?". Backfill implícito: la columna nace con DEFAULT 'seo' porque todo lo escrito
--      hasta hoy lo escribieron los caminos SEO (el grader compraba FUERA del ledger — ese es
--      justamente el hueco que esta migración habilita cerrar).
--
--   2. `cost_basis` + `price_table_version` — HONESTIDAD DE LA CIFRA, acopladas por CHECK. Hoy
--      todas las filas son dólares FACTURADOS: los escribe el transporte leyendo `json.cost` de
--      la respuesta del proveedor. El día que entre un dólar ESTIMADO (gasto de tokens LLM con
--      presupuesto per-org, ya en el roadmap), un total que sume ambos y se presente como un
--      número solo no es un dato degradado: es un dato FALSO, y defendible ante un cliente sólo
--      hasta que pregunte. El CHECK acoplado impide la degradación por acreción: un writer
--      futuro no puede declarar "estimado" y omitir con qué tabla estimó, ni declarar
--      "facturado" e inventar una versión. Mismo acoplamiento que
--      `intent_declared_by`/`intent_declared_at` en `seo_keyword_set_members` (TASK-1659).
--
-- ⚠️ LA UNIQUE Y EL `ON CONFLICT` DEL CÓDIGO VIAJAN JUNTOS. Si esta constraint pasa a 4 columnas
-- y `SEO_PROVIDER_SPEND_UPSERT_SQL` se queda en 3 (o al revés), el UPSERT deja de acumular e
-- INSERTA FILAS DUPLICADAS sin error: el gasto del mes se subcuenta y el gate de presupuesto
-- lee de menos, en silencio. El drift lo rompe en build
-- `src/lib/growth/seo/__tests__/provider-spend-upsert-parity.test.ts`.

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD COLUMN IF NOT EXISTS consumer            TEXT NOT NULL DEFAULT 'seo',
  ADD COLUMN IF NOT EXISTS cost_basis          TEXT NOT NULL DEFAULT 'invoiced',
  ADD COLUMN IF NOT EXISTS price_table_version TEXT;

-- CHECKs en dos tiempos (NOT VALID → VALIDATE): toma un lock más débil que el ADD directo y no
-- bloquea al cron diario de rank capture, que escribe sobre esta misma tabla.
-- El `IF NOT EXISTS` de las columnas no existe para constraints: se guarda por pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_provider_spend_daily_consumer_check') THEN
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      ADD CONSTRAINT seo_provider_spend_daily_consumer_check
      CHECK (consumer IN ('seo', 'aeo')) NOT VALID;
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      VALIDATE CONSTRAINT seo_provider_spend_daily_consumer_check;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_provider_spend_daily_cost_basis_check') THEN
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      ADD CONSTRAINT seo_provider_spend_daily_cost_basis_check
      CHECK (cost_basis IN ('invoiced', 'estimated')) NOT VALID;
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      VALIDATE CONSTRAINT seo_provider_spend_daily_cost_basis_check;
  END IF;

  -- Acoplamiento duro: 'estimated' ⇔ hay versión de tabla de precios. La equivalencia booleana
  -- cubre las DOS direcciones con una sola expresión — un CHECK que sólo exigiera la versión
  -- cuando es estimado dejaría pasar una fila 'invoiced' con versión inventada.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_provider_spend_daily_price_table_version_check') THEN
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      ADD CONSTRAINT seo_provider_spend_daily_price_table_version_check
      CHECK ((cost_basis = 'estimated') = (price_table_version IS NOT NULL)) NOT VALID;
    ALTER TABLE greenhouse_growth.seo_provider_spend_daily
      VALIDATE CONSTRAINT seo_provider_spend_daily_price_table_version_check;
  END IF;
END
$$;

-- Reemplazo de la clave única: `consumer` entra en la identidad de la fila.
-- Se conserva el NOMBRE de la constraint a propósito — es el que cita el guard de TASK-1300 y
-- el que resuelve el test de paridad; cambiarlo dejaría dos nombres para el mismo contrato.
ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_unique;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_unique
  UNIQUE (organization_id, family, spend_date, consumer);

-- Lectura del gate por consumidor: `resolveAeoBudget` filtra (organización, consumer='aeo') sobre
-- el mes en curso, y el resolver SEO hace lo propio con 'seo'. El índice de TASK-1300
-- (organization_id, spend_date DESC) no sirve el corte por consumidor sin filtrar de más.
CREATE INDEX IF NOT EXISTS seo_provider_spend_daily_org_consumer_date_idx
  ON greenhouse_growth.seo_provider_spend_daily (organization_id, consumer, spend_date DESC);

-- Anti pre-up-marker guard (CLAUDE.md §Database — Migration markers). Verifica el resultado
-- REAL, no la intención: si los markers estuvieran invertidos, node-pg-migrate registraría la
-- migración como aplicada sin ejecutar una línea de DDL y el ledger seguiría en 3 columnas
-- mientras el código nuevo escribe 4 — cada llamada del cron fallaría al contabilizar y el
-- transporte, por diseño, NO invalida un resultado ya cobrado: gasto real, contador en cero.
DO $$
DECLARE
  missing_columns  text;
  coupled_check    boolean;
  unique_columns   text;
  consumer_index   boolean;
  null_rows        bigint;
BEGIN
  SELECT string_agg(expected.column_name, ', ' ORDER BY expected.column_name)
    INTO missing_columns
    FROM (VALUES ('consumer'), ('cost_basis'), ('price_table_version')) AS expected(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'greenhouse_growth'
        AND table_name = 'seo_provider_spend_daily'
        AND column_name = expected.column_name
   );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-1696 anti pre-up-marker check: faltan columnas en seo_provider_spend_daily (%). Los markers pueden estar invertidos.', missing_columns;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'seo_provider_spend_daily_price_table_version_check'
       AND convalidated
  ) INTO coupled_check;

  IF NOT coupled_check THEN
    RAISE EXCEPTION 'TASK-1696: falta (o quedó NOT VALID) el CHECK acoplado cost_basis <-> price_table_version. Sin el, un dolar estimado podria entrar sin decir con que tabla se estimo.';
  END IF;

  -- La UNIQUE debe ser EXACTAMENTE la de 4 columnas. Una de 3 haría que el ON CONFLICT nuevo
  -- del writer no encuentre arbitro y el UPSERT falle en cada llamada cobrada.
  SELECT string_agg(att.attname, ',' ORDER BY key.ord)
    INTO unique_columns
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS key(attnum, ord)
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = key.attnum
   WHERE con.conname = 'seo_provider_spend_daily_unique';

  IF unique_columns IS DISTINCT FROM 'organization_id,family,spend_date,consumer' THEN
    RAISE EXCEPTION 'TASK-1696: seo_provider_spend_daily_unique debe cubrir (organization_id, family, spend_date, consumer); quedo en (%).', COALESCE(unique_columns, 'ausente');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND indexname = 'seo_provider_spend_daily_org_consumer_date_idx'
  ) INTO consumer_index;

  IF NOT consumer_index THEN
    RAISE EXCEPTION 'TASK-1696: falta el indice de lectura por consumidor.';
  END IF;

  -- Backfill VERIFICADO, no aplicado: PostgreSQL 16 materializa el DEFAULT sobre las filas
  -- existentes sin reescribir la tabla, así que un UPDATE explícito sería ruido. Lo que sí hace
  -- falta es COMPROBAR que ninguna fila quedó sin valor antes de confiar en el NOT NULL.
  SELECT COUNT(*) INTO null_rows
    FROM greenhouse_growth.seo_provider_spend_daily
   WHERE consumer IS NULL OR cost_basis IS NULL;

  IF null_rows > 0 THEN
    RAISE EXCEPTION 'TASK-1696: % fila(s) del ledger quedaron con consumer/cost_basis NULL.', null_rows;
  END IF;
END
$$;

-- GRANTs re-declarados. NUNCA DELETE: borrar gasto ya incurrido falsearía el presupuesto, y el
-- ledger es acumulativo por contrato (TASK-1300).
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_provider_spend_daily TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.seo_provider_spend_daily TO greenhouse_app;

-- Down Migration

-- ⚠️ Reversible SÓLO mientras no exista ninguna fila `consumer='aeo'`. Después del primer gasto
-- AEO atribuido, revertir PIERDE la dimensión (dos filas del mismo día colapsan a una y el
-- gasto del grader se vuelve indistinguible del SEO): el rollback correcto pasa a ser conservar
-- el schema y revertir el CÓDIGO. Por eso el down aborta si encuentra filas 'aeo'.
DO $$
DECLARE
  aeo_rows bigint;
BEGIN
  SELECT COUNT(*) INTO aeo_rows
    FROM greenhouse_growth.seo_provider_spend_daily
   WHERE consumer = 'aeo';

  IF aeo_rows > 0 THEN
    RAISE EXCEPTION 'TASK-1696 down: hay % fila(s) con consumer=aeo. Revertir el schema fusionaria gasto AEO con gasto SEO. Revierte el codigo y deja el schema.', aeo_rows;
  END IF;
END
$$;

DROP INDEX IF EXISTS greenhouse_growth.seo_provider_spend_daily_org_consumer_date_idx;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_unique;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_unique
  UNIQUE (organization_id, family, spend_date);

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_price_table_version_check,
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_cost_basis_check,
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_consumer_check;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP COLUMN IF EXISTS price_table_version,
  DROP COLUMN IF EXISTS cost_basis,
  DROP COLUMN IF EXISTS consumer;
