-- Up Migration
--
-- TASK-602 Fase B (Slice 3) — Backfill no destructivo desde las columnas
-- legacy `default_unit_price` + `default_currency` de `product_catalog`.
--
-- Por cada producto con `default_unit_price NOT NULL` + `default_currency` en
-- la matriz canónica de 6 monedas, inserta una fila autoritativa en la tabla
-- normalizada con `source='backfill_legacy'`.
--
-- Idempotente: `ON CONFLICT (product_id, currency_code) DO NOTHING` garantiza
-- que re-correr no genera duplicados ni pisa filas ya cargadas (incluyendo
-- filas `source='gh_admin'` o `source='hs_seed'` que puedan haber entrado
-- después del backfill).

INSERT INTO greenhouse_commercial.product_catalog_prices (
  product_id,
  currency_code,
  unit_price,
  is_authoritative,
  derived_from_currency,
  derived_from_fx_at,
  derived_fx_rate,
  source,
  created_at,
  updated_at
)
SELECT
  pc.product_id,
  UPPER(pc.default_currency) AS currency_code,
  pc.default_unit_price,
  TRUE AS is_authoritative,
  NULL::TEXT AS derived_from_currency,
  NULL::TIMESTAMPTZ AS derived_from_fx_at,
  NULL::NUMERIC AS derived_fx_rate,
  'backfill_legacy' AS source,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM greenhouse_commercial.product_catalog pc
WHERE pc.default_unit_price IS NOT NULL
  AND pc.default_unit_price >= 0
  AND UPPER(pc.default_currency) IN ('CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN')
ON CONFLICT (product_id, currency_code) DO NOTHING;

-- Down Migration
--
-- Solo revierte las filas que este backfill sembró. Las filas con
-- `source='gh_admin'` o `source='hs_seed'` quedan intactas.

DELETE FROM greenhouse_commercial.product_catalog_prices
WHERE source = 'backfill_legacy';
