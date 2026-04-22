-- Up Migration

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_catalog_hubspot_product_id
  ON greenhouse_commercial.product_catalog (hubspot_product_id)
  WHERE hubspot_product_id IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.uq_product_catalog_hubspot_product_id;
