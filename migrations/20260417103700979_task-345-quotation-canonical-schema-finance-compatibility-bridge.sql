-- Up Migration

CREATE SCHEMA IF NOT EXISTS greenhouse_commercial;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_catalog (
  product_id text PRIMARY KEY DEFAULT ('prd-' || gen_random_uuid()::text),
  finance_product_id text UNIQUE,
  hubspot_product_id text,
  product_code text NOT NULL UNIQUE,
  product_name text NOT NULL,
  product_type text NOT NULL DEFAULT 'service'
    CHECK (product_type = ANY (ARRAY['service'::text, 'deliverable'::text, 'license'::text, 'infrastructure'::text])),
  pricing_model text
    CHECK (pricing_model = ANY (ARRAY['staff_aug'::text, 'retainer'::text, 'project'::text, 'fixed'::text])),
  business_line_code text,
  default_currency text NOT NULL DEFAULT 'CLP'
    CHECK (default_currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text])),
  default_unit_price numeric(14,2),
  default_unit text NOT NULL DEFAULT 'unit'
    CHECK (default_unit = ANY (ARRAY['hour'::text, 'month'::text, 'unit'::text, 'project'::text])),
  suggested_role_code text,
  suggested_hours numeric(8,2),
  description text,
  active boolean NOT NULL DEFAULT TRUE,
  sync_status text NOT NULL DEFAULT 'local_only'
    CHECK (sync_status = ANY (ARRAY['synced'::text, 'local_only'::text, 'pending_sync'::text])),
  sync_direction text NOT NULL DEFAULT 'bidirectional'
    CHECK (sync_direction = ANY (ARRAY['bidirectional'::text, 'greenhouse_only'::text, 'hubspot_only'::text])),
  source_system text NOT NULL DEFAULT 'manual',
  legacy_sku text,
  legacy_category text,
  created_by text NOT NULL DEFAULT 'task-345-bridge',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotations (
  quotation_id text PRIMARY KEY DEFAULT ('qt-' || gen_random_uuid()::text),
  finance_quote_id text UNIQUE,
  quotation_number text NOT NULL,
  legacy_status text,
  client_name_cache text,
  organization_id text,
  space_id text,
  client_id text,
  business_line_code text,
  pricing_model text NOT NULL DEFAULT 'project'
    CHECK (pricing_model = ANY (ARRAY['staff_aug'::text, 'retainer'::text, 'project'::text])),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'converted'::text])),
  current_version integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'CLP'
    CHECK (currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text])),
  exchange_rate_to_clp numeric(14,6),
  exchange_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  exchange_snapshot_date date,
  subtotal numeric(14,2),
  tax_rate numeric(8,4),
  tax_amount numeric(14,2),
  total_amount numeric(14,2),
  total_amount_clp numeric(14,2),
  target_margin_pct numeric(5,2),
  margin_floor_pct numeric(5,2),
  global_discount_type text
    CHECK (global_discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  global_discount_value numeric(14,2),
  total_cost numeric(14,2),
  total_price_before_discount numeric(14,2),
  total_discount numeric(14,2),
  total_price numeric(14,2),
  effective_margin_pct numeric(5,2),
  revenue_type text NOT NULL DEFAULT 'one_time'
    CHECK (revenue_type = ANY (ARRAY['recurring'::text, 'one_time'::text, 'hybrid'::text])),
  mrr numeric(14,2),
  arr numeric(14,2),
  tcv numeric(14,2),
  acv numeric(14,2),
  quote_date date,
  due_date date,
  valid_until date,
  expiry_date date,
  contract_duration_months integer,
  billing_frequency text NOT NULL DEFAULT 'one_time'
    CHECK (billing_frequency = ANY (ARRAY['monthly'::text, 'milestone'::text, 'one_time'::text])),
  payment_terms_days integer NOT NULL DEFAULT 30,
  description text,
  conditions_text text,
  internal_notes text,
  notes text,
  escalation_mode text NOT NULL DEFAULT 'none'
    CHECK (escalation_mode = ANY (ARRAY['none'::text, 'automatic_ipc'::text, 'negotiated'::text])),
  escalation_pct numeric(5,2),
  escalation_frequency_months integer,
  escalation_base_date date,
  converted_to_income_id text,
  source_system text NOT NULL DEFAULT 'manual',
  source_quote_id text,
  hubspot_quote_id text,
  hubspot_deal_id text,
  hubspot_last_synced_at timestamptz,
  nubox_document_id text,
  nubox_sii_track_id text,
  nubox_emission_status text,
  dte_type_code text,
  dte_folio text,
  nubox_emitted_at timestamptz,
  nubox_last_synced_at timestamptz,
  space_resolution_source text NOT NULL DEFAULT 'unresolved',
  created_by text NOT NULL DEFAULT 'task-345-bridge',
  approved_by text,
  sent_at timestamptz,
  approved_at timestamptz,
  expired_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quotations_exchange_rates_shape_check CHECK (jsonb_typeof(exchange_rates) = 'object')
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_versions (
  version_id text PRIMARY KEY DEFAULT ('qv-' || gen_random_uuid()::text),
  quotation_id text NOT NULL,
  finance_quote_id text,
  version_number integer NOT NULL,
  snapshot_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  diff_from_previous jsonb,
  total_cost numeric(14,2),
  total_price numeric(14,2),
  total_discount numeric(14,2),
  effective_margin_pct numeric(5,2),
  created_by text NOT NULL DEFAULT 'task-345-bridge',
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quotation_versions_snapshot_shape_check CHECK (jsonb_typeof(snapshot_json) = 'array'),
  CONSTRAINT quotation_versions_unique UNIQUE (quotation_id, version_number)
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_line_items (
  line_item_id text PRIMARY KEY DEFAULT ('qli-' || gen_random_uuid()::text),
  finance_line_item_id text UNIQUE,
  finance_quote_id text,
  quotation_id text NOT NULL,
  version_number integer NOT NULL,
  product_id text,
  finance_product_id text,
  hubspot_line_item_id text,
  hubspot_product_id text,
  source_system text NOT NULL DEFAULT 'manual',
  line_type text NOT NULL DEFAULT 'deliverable'
    CHECK (line_type = ANY (ARRAY['person'::text, 'role'::text, 'deliverable'::text, 'direct_cost'::text])),
  sort_order integer NOT NULL DEFAULT 0,
  line_number integer,
  label text NOT NULL,
  description text,
  member_id text,
  role_code text,
  fte_allocation numeric(4,2),
  hours_estimated numeric(8,2),
  unit text NOT NULL DEFAULT 'unit'
    CHECK (unit = ANY (ARRAY['hour'::text, 'month'::text, 'unit'::text, 'project'::text])),
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_cost numeric(14,2),
  cost_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal_cost numeric(14,2),
  unit_price numeric(14,2),
  subtotal_price numeric(14,2),
  discount_type text
    CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  discount_value numeric(14,2),
  discount_amount numeric(14,2),
  subtotal_after_discount numeric(14,2),
  margin_pct numeric(5,2),
  effective_margin_pct numeric(5,2),
  recurrence_type text NOT NULL DEFAULT 'inherit'
    CHECK (recurrence_type = ANY (ARRAY['recurring'::text, 'one_time'::text, 'inherit'::text])),
  currency text,
  legacy_tax_amount numeric(14,2),
  legacy_total_amount numeric(14,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quotation_line_items_cost_breakdown_shape_check CHECK (jsonb_typeof(cost_breakdown) = 'object')
);

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_space_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces (space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_organization_fkey
  FOREIGN KEY (organization_id)
  REFERENCES greenhouse_core.organizations (organization_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_client_fkey
  FOREIGN KEY (client_id)
  REFERENCES greenhouse_core.clients (client_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_commercial.quotation_versions
  ADD CONSTRAINT quotation_versions_quotation_fkey
  FOREIGN KEY (quotation_id)
  REFERENCES greenhouse_commercial.quotations (quotation_id)
  ON DELETE CASCADE;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_quotation_fkey
  FOREIGN KEY (quotation_id)
  REFERENCES greenhouse_commercial.quotations (quotation_id)
  ON DELETE CASCADE;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_product_fkey
  FOREIGN KEY (product_id)
  REFERENCES greenhouse_commercial.product_catalog (product_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_product_catalog_hubspot
  ON greenhouse_commercial.product_catalog (hubspot_product_id)
  WHERE hubspot_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_product_catalog_source
  ON greenhouse_commercial.product_catalog (source_system, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_space_status
  ON greenhouse_commercial.quotations (space_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_finance_quote
  ON greenhouse_commercial.quotations (finance_quote_id)
  WHERE finance_quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_hubspot
  ON greenhouse_commercial.quotations (hubspot_quote_id)
  WHERE hubspot_quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_nubox
  ON greenhouse_commercial.quotations (nubox_document_id)
  WHERE nubox_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_quotation_versions_quote
  ON greenhouse_commercial.quotation_versions (quotation_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_quotation_line_items_quote
  ON greenhouse_commercial.quotation_line_items (quotation_id, version_number, sort_order);

CREATE INDEX IF NOT EXISTS idx_commercial_quotation_line_items_finance_quote
  ON greenhouse_commercial.quotation_line_items (finance_quote_id, sort_order);

ALTER SCHEMA greenhouse_commercial OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.product_catalog OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.quotations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.quotation_versions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.quotation_line_items OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.product_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.quotations TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.quotation_versions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.quotation_line_items TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.product_catalog TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.quotations TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.quotation_versions TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.quotation_line_items TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.product_catalog TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.quotations TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.quotation_versions TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.quotation_line_items TO greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT ALL ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT ON TABLES TO greenhouse_app;

INSERT INTO greenhouse_commercial.product_catalog (
  finance_product_id,
  hubspot_product_id,
  product_code,
  product_name,
  product_type,
  pricing_model,
  default_currency,
  default_unit_price,
  default_unit,
  description,
  active,
  sync_status,
  sync_direction,
  source_system,
  legacy_sku,
  legacy_category,
  created_by,
  last_synced_at,
  created_at,
  updated_at
)
SELECT
  p.product_id,
  p.hubspot_product_id,
  'EO-PRD-' || upper(substr(md5(p.product_id), 1, 12)),
  p.name,
  CASE
    WHEN COALESCE(p.category, '') IN ('license', 'licenses', 'software') THEN 'license'
    WHEN COALESCE(p.category, '') IN ('infrastructure', 'hosting') THEN 'infrastructure'
    ELSE 'service'
  END,
  CASE
    WHEN p.is_recurring = TRUE THEN 'retainer'
    ELSE 'fixed'
  END,
  COALESCE(NULLIF(trim(p.currency), ''), 'CLP'),
  p.unit_price,
  CASE
    WHEN p.is_recurring = TRUE THEN 'month'
    ELSE 'unit'
  END,
  p.description,
  COALESCE(p.is_active, TRUE),
  CASE
    WHEN p.hubspot_product_id IS NOT NULL THEN 'synced'
    ELSE 'local_only'
  END,
  CASE
    WHEN p.hubspot_product_id IS NOT NULL THEN 'bidirectional'
    ELSE 'greenhouse_only'
  END,
  COALESCE(NULLIF(trim(p.source_system), ''), 'manual'),
  p.sku,
  p.category,
  COALESCE(NULLIF(trim(p.created_by), ''), 'task-345-bridge'),
  p.hubspot_last_synced_at,
  COALESCE(p.created_at, CURRENT_TIMESTAMP),
  COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM greenhouse_finance.products p
ON CONFLICT (finance_product_id) DO UPDATE SET
  hubspot_product_id = EXCLUDED.hubspot_product_id,
  product_name = EXCLUDED.product_name,
  default_currency = EXCLUDED.default_currency,
  default_unit_price = EXCLUDED.default_unit_price,
  default_unit = EXCLUDED.default_unit,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  sync_status = EXCLUDED.sync_status,
  sync_direction = EXCLUDED.sync_direction,
  source_system = EXCLUDED.source_system,
  legacy_sku = EXCLUDED.legacy_sku,
  legacy_category = EXCLUDED.legacy_category,
  last_synced_at = EXCLUDED.last_synced_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO greenhouse_commercial.quotations (
  finance_quote_id,
  quotation_number,
  legacy_status,
  client_name_cache,
  organization_id,
  space_id,
  client_id,
  pricing_model,
  status,
  current_version,
  currency,
  exchange_rate_to_clp,
  exchange_rates,
  exchange_snapshot_date,
  subtotal,
  tax_rate,
  tax_amount,
  total_amount,
  total_amount_clp,
  total_price_before_discount,
  total_discount,
  total_price,
  revenue_type,
  tcv,
  acv,
  quote_date,
  due_date,
  valid_until,
  expiry_date,
  billing_frequency,
  payment_terms_days,
  description,
  internal_notes,
  notes,
  converted_to_income_id,
  source_system,
  source_quote_id,
  hubspot_quote_id,
  hubspot_deal_id,
  hubspot_last_synced_at,
  nubox_document_id,
  nubox_sii_track_id,
  nubox_emission_status,
  dte_type_code,
  dte_folio,
  nubox_emitted_at,
  nubox_last_synced_at,
  space_resolution_source,
  created_by,
  created_at,
  updated_at
)
SELECT
  q.quote_id,
  COALESCE(NULLIF(trim(q.quote_number), ''), 'EO-QUO-' || upper(substr(md5(q.quote_id), 1, 12))),
  q.status,
  q.client_name,
  COALESCE(q.organization_id, scope.organization_id),
  scope.space_id,
  q.client_id,
  'project',
  CASE
    WHEN q.status = 'accepted' THEN 'approved'
    WHEN q.status = 'draft' THEN 'draft'
    WHEN q.status = 'sent' THEN 'sent'
    WHEN q.status = 'rejected' THEN 'rejected'
    WHEN q.status = 'expired' THEN 'expired'
    WHEN q.status = 'converted' THEN 'converted'
    ELSE 'draft'
  END,
  1,
  COALESCE(NULLIF(trim(q.currency), ''), 'CLP'),
  q.exchange_rate_to_clp,
  CASE
    WHEN q.exchange_rate_to_clp IS NOT NULL THEN jsonb_build_object('CLP', q.exchange_rate_to_clp)
    ELSE '{}'::jsonb
  END,
  q.quote_date,
  q.subtotal,
  q.tax_rate,
  q.tax_amount,
  q.total_amount,
  q.total_amount_clp,
  COALESCE(q.subtotal, q.total_amount),
  0,
  COALESCE(q.total_amount, q.total_amount_clp),
  'one_time',
  COALESCE(q.total_amount, q.total_amount_clp),
  COALESCE(q.total_amount, q.total_amount_clp),
  q.quote_date,
  q.due_date,
  COALESCE(q.due_date, q.expiry_date),
  q.expiry_date,
  'one_time',
  CASE
    WHEN q.quote_date IS NOT NULL AND q.due_date IS NOT NULL THEN GREATEST((q.due_date - q.quote_date), 0)
    ELSE 30
  END,
  q.description,
  q.notes,
  q.notes,
  q.converted_to_income_id,
  COALESCE(NULLIF(trim(q.source_system), ''), 'manual'),
  CASE
    WHEN COALESCE(NULLIF(trim(q.source_system), ''), 'manual') = 'hubspot' AND q.hubspot_quote_id IS NOT NULL THEN q.hubspot_quote_id
    WHEN COALESCE(NULLIF(trim(q.source_system), ''), 'manual') = 'nubox' AND q.nubox_document_id IS NOT NULL THEN q.nubox_document_id
    ELSE q.quote_id
  END,
  q.hubspot_quote_id,
  q.hubspot_deal_id,
  q.hubspot_last_synced_at,
  q.nubox_document_id,
  q.nubox_sii_track_id,
  q.nubox_emission_status,
  q.dte_type_code,
  q.dte_folio,
  q.nubox_emitted_at,
  q.nubox_last_synced_at,
  CASE
    WHEN scope.space_id IS NOT NULL AND q.organization_id IS NOT NULL THEN 'organization'
    WHEN scope.space_id IS NOT NULL AND q.client_id IS NOT NULL THEN 'client'
    ELSE 'unresolved'
  END,
  COALESCE(NULLIF(trim(q.created_by), ''), 'task-345-bridge'),
  COALESCE(q.created_at, CURRENT_TIMESTAMP),
  COALESCE(q.updated_at, CURRENT_TIMESTAMP)
FROM greenhouse_finance.quotes q
LEFT JOIN LATERAL (
  SELECT
    s.space_id,
    s.organization_id
  FROM greenhouse_core.spaces s
  WHERE s.active = TRUE
    AND (
      (q.organization_id IS NOT NULL AND s.organization_id = q.organization_id)
      OR (q.organization_id IS NULL AND q.client_id IS NOT NULL AND s.client_id = q.client_id)
    )
  ORDER BY
    CASE
      WHEN q.organization_id IS NOT NULL AND s.organization_id = q.organization_id THEN 0
      ELSE 1
    END,
    s.updated_at DESC NULLS LAST,
    s.created_at DESC NULLS LAST,
    s.space_id ASC
  LIMIT 1
) scope ON TRUE
ON CONFLICT (finance_quote_id) DO UPDATE SET
  quotation_number = EXCLUDED.quotation_number,
  legacy_status = EXCLUDED.legacy_status,
  client_name_cache = EXCLUDED.client_name_cache,
  organization_id = EXCLUDED.organization_id,
  space_id = EXCLUDED.space_id,
  client_id = EXCLUDED.client_id,
  status = EXCLUDED.status,
  currency = EXCLUDED.currency,
  exchange_rate_to_clp = EXCLUDED.exchange_rate_to_clp,
  exchange_rates = EXCLUDED.exchange_rates,
  exchange_snapshot_date = EXCLUDED.exchange_snapshot_date,
  subtotal = EXCLUDED.subtotal,
  tax_rate = EXCLUDED.tax_rate,
  tax_amount = EXCLUDED.tax_amount,
  total_amount = EXCLUDED.total_amount,
  total_amount_clp = EXCLUDED.total_amount_clp,
  total_price_before_discount = EXCLUDED.total_price_before_discount,
  total_discount = EXCLUDED.total_discount,
  total_price = EXCLUDED.total_price,
  revenue_type = EXCLUDED.revenue_type,
  tcv = EXCLUDED.tcv,
  acv = EXCLUDED.acv,
  quote_date = EXCLUDED.quote_date,
  due_date = EXCLUDED.due_date,
  valid_until = EXCLUDED.valid_until,
  expiry_date = EXCLUDED.expiry_date,
  payment_terms_days = EXCLUDED.payment_terms_days,
  description = EXCLUDED.description,
  internal_notes = EXCLUDED.internal_notes,
  notes = EXCLUDED.notes,
  converted_to_income_id = EXCLUDED.converted_to_income_id,
  source_system = EXCLUDED.source_system,
  source_quote_id = EXCLUDED.source_quote_id,
  hubspot_quote_id = EXCLUDED.hubspot_quote_id,
  hubspot_deal_id = EXCLUDED.hubspot_deal_id,
  hubspot_last_synced_at = EXCLUDED.hubspot_last_synced_at,
  nubox_document_id = EXCLUDED.nubox_document_id,
  nubox_sii_track_id = EXCLUDED.nubox_sii_track_id,
  nubox_emission_status = EXCLUDED.nubox_emission_status,
  dte_type_code = EXCLUDED.dte_type_code,
  dte_folio = EXCLUDED.dte_folio,
  nubox_emitted_at = EXCLUDED.nubox_emitted_at,
  nubox_last_synced_at = EXCLUDED.nubox_last_synced_at,
  space_resolution_source = EXCLUDED.space_resolution_source,
  updated_at = EXCLUDED.updated_at;

INSERT INTO greenhouse_commercial.quotation_line_items (
  finance_line_item_id,
  finance_quote_id,
  quotation_id,
  version_number,
  product_id,
  finance_product_id,
  hubspot_line_item_id,
  hubspot_product_id,
  source_system,
  line_type,
  sort_order,
  line_number,
  label,
  description,
  unit,
  quantity,
  unit_cost,
  cost_breakdown,
  subtotal_cost,
  unit_price,
  subtotal_price,
  discount_type,
  discount_value,
  discount_amount,
  subtotal_after_discount,
  effective_margin_pct,
  recurrence_type,
  currency,
  legacy_tax_amount,
  legacy_total_amount,
  created_at,
  updated_at
)
SELECT
  li.line_item_id,
  li.quote_id,
  q.quotation_id,
  1,
  cp.product_id,
  li.product_id,
  li.hubspot_line_item_id,
  li.hubspot_product_id,
  COALESCE(NULLIF(trim(li.source_system), ''), 'manual'),
  'deliverable',
  COALESCE(li.line_number, ROW_NUMBER() OVER (PARTITION BY li.quote_id ORDER BY li.line_item_id)),
  li.line_number,
  li.name,
  li.description,
  CASE
    WHEN p.is_recurring = TRUE THEN 'month'
    ELSE 'unit'
  END,
  COALESCE(li.quantity, 1),
  p.cost_of_goods_sold,
  CASE
    WHEN p.cost_of_goods_sold IS NOT NULL THEN jsonb_build_object('legacyCostOfGoodsSold', p.cost_of_goods_sold)
    ELSE '{}'::jsonb
  END,
  CASE
    WHEN p.cost_of_goods_sold IS NOT NULL THEN p.cost_of_goods_sold * COALESCE(li.quantity, 1)
    ELSE NULL
  END,
  li.unit_price,
  CASE
    WHEN li.unit_price IS NOT NULL THEN li.unit_price * COALESCE(li.quantity, 1)
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(li.discount_percent, 0) > 0 THEN 'percentage'
    WHEN COALESCE(li.discount_amount, 0) > 0 THEN 'fixed_amount'
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(li.discount_percent, 0) > 0 THEN li.discount_percent
    WHEN COALESCE(li.discount_amount, 0) > 0 THEN li.discount_amount
    ELSE NULL
  END,
  COALESCE(li.discount_amount, 0),
  (COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0),
  CASE
    WHEN (COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0) > 0
         AND p.cost_of_goods_sold IS NOT NULL
    THEN ROUND((((COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0) - (p.cost_of_goods_sold * COALESCE(li.quantity, 1)))
      / NULLIF((COALESCE(li.unit_price, 0) * COALESCE(li.quantity, 1)) - COALESCE(li.discount_amount, 0), 0)) * 100, 2)
    ELSE NULL
  END,
  CASE
    WHEN p.is_recurring = TRUE THEN 'recurring'
    ELSE 'inherit'
  END,
  COALESCE(NULLIF(trim(p.currency), ''), q.currency),
  li.tax_amount,
  li.total_amount,
  COALESCE(li.created_at, CURRENT_TIMESTAMP),
  COALESCE(li.updated_at, CURRENT_TIMESTAMP)
FROM greenhouse_finance.quote_line_items li
JOIN greenhouse_commercial.quotations q
  ON q.finance_quote_id = li.quote_id
LEFT JOIN greenhouse_finance.products p
  ON p.product_id = li.product_id
LEFT JOIN greenhouse_commercial.product_catalog cp
  ON cp.finance_product_id = li.product_id
ON CONFLICT (finance_line_item_id) DO UPDATE SET
  finance_quote_id = EXCLUDED.finance_quote_id,
  quotation_id = EXCLUDED.quotation_id,
  version_number = EXCLUDED.version_number,
  product_id = EXCLUDED.product_id,
  finance_product_id = EXCLUDED.finance_product_id,
  hubspot_line_item_id = EXCLUDED.hubspot_line_item_id,
  hubspot_product_id = EXCLUDED.hubspot_product_id,
  source_system = EXCLUDED.source_system,
  sort_order = EXCLUDED.sort_order,
  line_number = EXCLUDED.line_number,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  cost_breakdown = EXCLUDED.cost_breakdown,
  subtotal_cost = EXCLUDED.subtotal_cost,
  unit_price = EXCLUDED.unit_price,
  subtotal_price = EXCLUDED.subtotal_price,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  discount_amount = EXCLUDED.discount_amount,
  subtotal_after_discount = EXCLUDED.subtotal_after_discount,
  effective_margin_pct = EXCLUDED.effective_margin_pct,
  recurrence_type = EXCLUDED.recurrence_type,
  currency = EXCLUDED.currency,
  legacy_tax_amount = EXCLUDED.legacy_tax_amount,
  legacy_total_amount = EXCLUDED.legacy_total_amount,
  updated_at = EXCLUDED.updated_at;

UPDATE greenhouse_commercial.quotations q
SET
  total_cost = agg.total_cost,
  total_price_before_discount = COALESCE(agg.total_price_before_discount, q.total_price_before_discount),
  total_discount = COALESCE(agg.total_discount, q.total_discount),
  total_price = COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount),
  effective_margin_pct = CASE
    WHEN COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount) > 0
         AND agg.total_cost IS NOT NULL
    THEN ROUND(((COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount) - agg.total_cost)
      / NULLIF(COALESCE(agg.total_price_after_discount, q.total_price, q.total_amount), 0)) * 100, 2)
    ELSE q.effective_margin_pct
  END
FROM (
  SELECT
    quotation_id,
    SUM(subtotal_cost) AS total_cost,
    SUM(subtotal_price) AS total_price_before_discount,
    SUM(discount_amount) AS total_discount,
    SUM(subtotal_after_discount) AS total_price_after_discount
  FROM greenhouse_commercial.quotation_line_items
  GROUP BY quotation_id
) agg
WHERE q.quotation_id = agg.quotation_id;

INSERT INTO greenhouse_commercial.quotation_versions (
  quotation_id,
  finance_quote_id,
  version_number,
  snapshot_json,
  total_cost,
  total_price,
  total_discount,
  effective_margin_pct,
  created_by,
  notes,
  created_at
)
SELECT
  q.quotation_id,
  q.finance_quote_id,
  q.current_version,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'lineItemId', COALESCE(qli.finance_line_item_id, qli.line_item_id),
        'label', qli.label,
        'description', qli.description,
        'quantity', qli.quantity,
        'unit', qli.unit,
        'unitPrice', qli.unit_price,
        'subtotalPrice', qli.subtotal_price,
        'discountAmount', qli.discount_amount,
        'subtotalAfterDiscount', qli.subtotal_after_discount,
        'sourceSystem', qli.source_system,
        'financeProductId', qli.finance_product_id,
        'productId', qli.product_id
      )
      ORDER BY qli.sort_order ASC, qli.created_at ASC
    ) FILTER (WHERE qli.line_item_id IS NOT NULL),
    '[]'::jsonb
  ),
  q.total_cost,
  COALESCE(q.total_price, q.total_amount),
  q.total_discount,
  q.effective_margin_pct,
  q.created_by,
  'Initial TASK-345 compatibility snapshot',
  q.created_at
FROM greenhouse_commercial.quotations q
LEFT JOIN greenhouse_commercial.quotation_line_items qli
  ON qli.quotation_id = q.quotation_id
 AND qli.version_number = q.current_version
GROUP BY
  q.quotation_id,
  q.finance_quote_id,
  q.current_version,
  q.total_cost,
  q.total_price,
  q.total_amount,
  q.total_discount,
  q.effective_margin_pct,
  q.created_by,
  q.created_at
ON CONFLICT (quotation_id, version_number) DO UPDATE SET
  finance_quote_id = EXCLUDED.finance_quote_id,
  snapshot_json = EXCLUDED.snapshot_json,
  total_cost = EXCLUDED.total_cost,
  total_price = EXCLUDED.total_price,
  total_discount = EXCLUDED.total_discount,
  effective_margin_pct = EXCLUDED.effective_margin_pct,
  created_by = EXCLUDED.created_by,
  notes = EXCLUDED.notes;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.quotation_line_items;
DROP TABLE IF EXISTS greenhouse_commercial.quotation_versions;
DROP TABLE IF EXISTS greenhouse_commercial.quotations;
DROP TABLE IF EXISTS greenhouse_commercial.product_catalog;
DROP SCHEMA IF EXISTS greenhouse_commercial;
