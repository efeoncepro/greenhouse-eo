-- Up Migration
--
-- TASK-602 Fase B (Slice 1) — Multi-currency prices normalizados.
--
-- Tabla producto × moneda. Soporta 6 monedas canónicas alineadas con HubSpot
-- (CLP/USD/CLF/COP/MXN/PEN). Una fila por (product_id, currency_code).
-- `is_authoritative=true` = precio fijado por operador o semilla HS.
-- `is_authoritative=false` = derivado via FX platform.
-- CASCADE en FK para que borrar un producto limpie sus prices.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_catalog_prices (
  product_id              TEXT NOT NULL,
  currency_code           TEXT NOT NULL,
  unit_price              NUMERIC(18,4) NOT NULL,
  is_authoritative        BOOLEAN NOT NULL DEFAULT FALSE,
  derived_from_currency   TEXT NULL,
  derived_from_fx_at      TIMESTAMPTZ NULL,
  derived_fx_rate         NUMERIC(18,8) NULL,
  source                  TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, currency_code)
);

-- FK al catálogo canónico (post TASK-601)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_prices_product_id_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog_prices
      ADD CONSTRAINT product_catalog_prices_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES greenhouse_commercial.product_catalog(product_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- CHECKs canónicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_prices_currency_code_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog_prices
      ADD CONSTRAINT product_catalog_prices_currency_code_check
      CHECK (currency_code IN ('CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_prices_source_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog_prices
      ADD CONSTRAINT product_catalog_prices_source_check
      CHECK (source IN ('gh_admin', 'hs_seed', 'fx_derived', 'backfill_legacy'));
  END IF;

  -- Si is_authoritative=true, las columnas derived_* deben ser NULL.
  -- Si is_authoritative=false, derived_from_currency + derived_from_fx_at
  -- deben estar presentes (fx_derived es el único caso no-autoritativo hoy).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_prices_derived_consistency_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog_prices
      ADD CONSTRAINT product_catalog_prices_derived_consistency_check
      CHECK (
        (is_authoritative = TRUE  AND derived_from_currency IS NULL
                                  AND derived_from_fx_at    IS NULL
                                  AND derived_fx_rate       IS NULL)
     OR (is_authoritative = FALSE AND derived_from_currency IS NOT NULL
                                  AND derived_from_fx_at    IS NOT NULL
                                  AND derived_fx_rate       IS NOT NULL)
      );
  END IF;
END $$;

-- Índice partial para "give me the authoritative price of X" (query caliente
-- del outbound y del admin UI en TASK-603 / TASK-605).
CREATE INDEX IF NOT EXISTS idx_product_catalog_prices_authoritative
  ON greenhouse_commercial.product_catalog_prices (product_id, currency_code)
  WHERE is_authoritative = TRUE;

-- Índice para recompute masivo por rate update (TASK-602 projection reactiva:
-- "dame todas las derived donde derived_from_currency='CLP' o currency_code='USD'").
CREATE INDEX IF NOT EXISTS idx_product_catalog_prices_derived_from_currency
  ON greenhouse_commercial.product_catalog_prices (derived_from_currency, currency_code)
  WHERE is_authoritative = FALSE;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_prices_derived_from_currency;
DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_prices_authoritative;
DROP TABLE IF EXISTS greenhouse_commercial.product_catalog_prices;
