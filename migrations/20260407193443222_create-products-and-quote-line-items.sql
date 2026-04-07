-- Up Migration

-- Product catalog (master data synced from HubSpot or created manually)
CREATE TABLE IF NOT EXISTS greenhouse_finance.products (
  product_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL DEFAULT 'manual',
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  unit_price NUMERIC,
  cost_of_goods_sold NUMERIC,
  currency TEXT DEFAULT 'CLP',
  tax_rate NUMERIC DEFAULT 0.19,
  is_recurring BOOLEAN DEFAULT FALSE,
  billing_frequency TEXT,
  billing_period_count INT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  -- HubSpot metadata
  hubspot_product_id TEXT,
  hubspot_last_synced_at TIMESTAMPTZ,
  -- Context
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_hubspot ON greenhouse_finance.products (hubspot_product_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON greenhouse_finance.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_source ON greenhouse_finance.products (source_system);

-- Quote line items (transactional instances in quotes)
CREATE TABLE IF NOT EXISTS greenhouse_finance.quote_line_items (
  line_item_id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES greenhouse_finance.quotes(quote_id),
  product_id TEXT REFERENCES greenhouse_finance.products(product_id),
  source_system TEXT NOT NULL DEFAULT 'manual',
  line_number INT,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC,
  is_exempt BOOLEAN DEFAULT FALSE,
  -- HubSpot metadata
  hubspot_line_item_id TEXT,
  hubspot_product_id TEXT,
  hubspot_last_synced_at TIMESTAMPTZ,
  -- Context
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON greenhouse_finance.quote_line_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_product ON greenhouse_finance.quote_line_items (product_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_hubspot ON greenhouse_finance.quote_line_items (hubspot_line_item_id);

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.quote_line_items;
DROP TABLE IF EXISTS greenhouse_finance.products;
