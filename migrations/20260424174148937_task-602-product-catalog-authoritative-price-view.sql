-- Up Migration
--
-- TASK-602 Fase B (Slice 2) — VIEW auxiliar que expone la fila autoritativa
-- primary de cada producto, resolviendo desempate por orden de precedencia
-- canónico: CLP > USD > CLF > COP > MXN > PEN.
--
-- Consumers previstos:
--   - TASK-603 (outbound v2): al emitir a HubSpot necesita saber cuál es el
--     precio base cuando el producto tiene múltiples autoritativas.
--   - TASK-605 (admin UI): encabezado del detalle del producto.
--   - Legacy callers que hoy leen `product_catalog.default_unit_price`
--     pueden migrar a esta VIEW cuando TASK-549 haga el cleanup.

CREATE OR REPLACE VIEW greenhouse_commercial.product_catalog_authoritative_price AS
SELECT DISTINCT ON (product_id)
  product_id,
  currency_code,
  unit_price,
  source,
  created_at,
  updated_at
FROM greenhouse_commercial.product_catalog_prices
WHERE is_authoritative = TRUE
ORDER BY
  product_id,
  CASE currency_code
    WHEN 'CLP' THEN 1
    WHEN 'USD' THEN 2
    WHEN 'CLF' THEN 3
    WHEN 'COP' THEN 4
    WHEN 'MXN' THEN 5
    WHEN 'PEN' THEN 6
    ELSE 99
  END ASC;

COMMENT ON VIEW greenhouse_commercial.product_catalog_authoritative_price IS
  'TASK-602: primera fila autoritativa de cada producto por precedencia canonica (CLP > USD > CLF > COP > MXN > PEN). Si un producto no tiene ninguna autoritativa (raro), no aparece aqui.';

-- Down Migration

DROP VIEW IF EXISTS greenhouse_commercial.product_catalog_authoritative_price;
