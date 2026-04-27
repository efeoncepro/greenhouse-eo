-- Up Migration
--
-- Payment Provider Catalog + Greenhouse as platform_operator (TASK-701)
-- =====================================================================
--
-- Promotes `accounts.provider_slug` from a free-text string into a FK against
-- a canonical catalog of providers. This eliminates the "category-aware
-- empty input" problem in the admin UI: the provider dropdown is filtered by
-- `applicable_to` per instrument category, and the rule for shareholder
-- accounts (and future internal wallets) pre-assigns provider_slug =
-- 'greenhouse' — the platform itself operates the internal ledger.
--
-- New tables:
--   1. greenhouse_finance.payment_provider_catalog
--      Single source of truth for "who operates this instrument".
--      Categories: bank, card_network, fintech, platform_operator (Greenhouse).
--
--   2. greenhouse_finance.instrument_category_provider_rules
--      Declarative rule per instrument category: does this category require
--      a provider, an issuer, a counterparty? What's the default provider?
--      What types are allowed? Drives both the form UI and the readiness
--      contract — so adding a new category (employee_wallet, intercompany_loan)
--      only requires inserting one rule row, not branching code.
--
-- ⚠️ FOR AGENTS / FUTURE DEVS:
--   - DO NOT compose provider lists in client code. Read from the catalog.
--   - DO NOT branch UI logic by category in the form. Read the rule and
--     render conditionally.
--   - When wallets ship (TASK-N), append the new category to the
--     `applicable_to` array of the 'greenhouse' provider, and INSERT a
--     rule row for the new category. The form auto-adapts.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- =========================================================================
-- 1. payment_provider_catalog
-- =========================================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_provider_catalog (
  provider_slug    TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  provider_type    TEXT NOT NULL,
  country_code     TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  applicable_to    TEXT[] NOT NULL,
  metadata_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_provider_catalog_type_known CHECK (
    provider_type IN ('bank', 'card_network', 'card_issuer', 'fintech', 'payment_platform', 'payroll_processor', 'platform_operator')
  )
);

COMMENT ON TABLE greenhouse_finance.payment_provider_catalog IS
'Canonical catalog of payment instrument providers. Each provider declares its `provider_type` (bank, card_network, fintech, platform_operator) and which `instrument_category` values it can serve via `applicable_to`. The single row with provider_slug=greenhouse and provider_type=platform_operator represents Greenhouse itself as the operator of internal ledgers (CCA today, future wallets/loans). Read API: src/lib/finance/payment-instruments/catalog.ts.';

COMMENT ON COLUMN greenhouse_finance.payment_provider_catalog.applicable_to IS
'Subset of greenhouse_finance instrument categories this provider can serve. Used by admin UI to filter the provider dropdown by current category. Extend (don''t branch) when a new wallet category ships.';

-- Seed providers that the static config (src/config/payment-instruments.ts)
-- already exposes today, plus the canonical 'greenhouse' entry. Slugs match
-- the keys used in PROVIDER_CATALOG to avoid runtime drift.
INSERT INTO greenhouse_finance.payment_provider_catalog (provider_slug, display_name, provider_type, country_code, applicable_to)
VALUES
  ('bci',           'BCI',                 'bank',              'CL', ARRAY['bank_account']),
  ('banco-chile',   'Banco de Chile',      'bank',              'CL', ARRAY['bank_account']),
  ('banco-estado',  'BancoEstado',         'bank',              'CL', ARRAY['bank_account']),
  ('santander',     'Santander',           'bank',              'CL', ARRAY['bank_account', 'credit_card']),
  ('scotiabank',    'Scotiabank',          'bank',              'CL', ARRAY['bank_account']),
  ('itau',          'Itaú',                'bank',              'CL', ARRAY['bank_account']),
  ('bice',          'BICE',                'bank',              'CL', ARRAY['bank_account']),
  ('security',      'Banco Security',      'bank',              'CL', ARRAY['bank_account']),
  ('falabella',     'Banco Falabella',     'bank',              'CL', ARRAY['bank_account']),
  ('ripley',        'Banco Ripley',        'bank',              'CL', ARRAY['bank_account']),
  ('visa',          'Visa',                'card_network',      NULL, ARRAY['credit_card']),
  ('mastercard',    'Mastercard',          'card_network',      NULL, ARRAY['credit_card']),
  ('amex',          'American Express',    'card_network',      NULL, ARRAY['credit_card']),
  ('mercadopago',   'Mercado Pago',        'fintech',           NULL, ARRAY['fintech']),
  ('wise',          'Wise',                'fintech',           NULL, ARRAY['fintech']),
  ('stripe',        'Stripe',              'fintech',           NULL, ARRAY['fintech']),
  ('paypal',        'PayPal',              'fintech',           NULL, ARRAY['fintech']),
  ('deel',          'Deel',                'payment_platform',  NULL, ARRAY['payment_platform']),
  ('previred',      'Previred',            'payroll_processor', 'CL', ARRAY['payroll_processor']),
  ('greenhouse',    'Greenhouse',          'platform_operator', NULL, ARRAY['shareholder_account'])
ON CONFLICT (provider_slug) DO NOTHING;

-- =========================================================================
-- 2. accounts.provider_slug → FK to catalog (with backfill of CCAs)
-- =========================================================================

UPDATE greenhouse_finance.accounts
   SET provider_slug = 'greenhouse',
       updated_at = CURRENT_TIMESTAMP
 WHERE instrument_category = 'shareholder_account'
   AND provider_slug IS NULL;

UPDATE greenhouse_finance.accounts a
   SET provider_slug = NULL,
       updated_at = CURRENT_TIMESTAMP
 WHERE provider_slug IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM greenhouse_finance.payment_provider_catalog p
      WHERE p.provider_slug = a.provider_slug
   );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_provider_slug_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.accounts
      ADD CONSTRAINT accounts_provider_slug_fk
      FOREIGN KEY (provider_slug)
      REFERENCES greenhouse_finance.payment_provider_catalog (provider_slug)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- =========================================================================
-- 3. instrument_category_provider_rules
-- =========================================================================

CREATE TABLE IF NOT EXISTS greenhouse_finance.instrument_category_provider_rules (
  instrument_category      TEXT PRIMARY KEY,
  requires_provider        BOOLEAN NOT NULL,
  provider_label           TEXT,
  provider_types_allowed   TEXT[],
  default_provider_slug    TEXT REFERENCES greenhouse_finance.payment_provider_catalog (provider_slug) ON DELETE RESTRICT,
  requires_counterparty    BOOLEAN NOT NULL DEFAULT FALSE,
  counterparty_kind        TEXT,
  counterparty_label       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT instrument_category_rule_kind_known CHECK (
    counterparty_kind IS NULL
    OR counterparty_kind IN ('identity_profile', 'organization', 'team_member')
  )
);

COMMENT ON TABLE greenhouse_finance.instrument_category_provider_rules IS
'Declarative rules per instrument category: does this category require a provider? An issuer? A counterparty? Drives both the admin form UI and the readiness contract. To add a new category (e.g. employee_wallet), insert one row — no code branches needed.';

INSERT INTO greenhouse_finance.instrument_category_provider_rules
  (instrument_category, requires_provider, provider_label, provider_types_allowed, default_provider_slug, requires_counterparty, counterparty_kind, counterparty_label)
VALUES
  ('bank_account',         TRUE,  'Banco emisor',     ARRAY['bank'],              NULL,         FALSE, NULL,                NULL),
  ('credit_card',          TRUE,  'Red de tarjeta',   ARRAY['card_network','bank'], NULL,       FALSE, NULL,                NULL),
  ('fintech',              TRUE,  'Operador fintech', ARRAY['fintech'],           NULL,         FALSE, NULL,                NULL),
  ('payment_platform',     TRUE,  'Plataforma',       ARRAY['payment_platform'],  NULL,         FALSE, NULL,                NULL),
  ('payroll_processor',    TRUE,  'Procesador',       ARRAY['payroll_processor'], NULL,         FALSE, NULL,                NULL),
  ('cash',                 FALSE, NULL,               NULL,                       NULL,         FALSE, NULL,                NULL),
  ('shareholder_account',  TRUE,  'Plataforma',       ARRAY['platform_operator'], 'greenhouse', TRUE,  'identity_profile',  'Accionista')
ON CONFLICT (instrument_category) DO NOTHING;

-- =========================================================================
-- 4. Grants
-- =========================================================================

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_provider_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_provider_catalog TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_provider_catalog TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.instrument_category_provider_rules TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.instrument_category_provider_rules TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.instrument_category_provider_rules TO greenhouse_app;

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

DROP TABLE IF EXISTS greenhouse_finance.instrument_category_provider_rules;

ALTER TABLE greenhouse_finance.accounts DROP CONSTRAINT IF EXISTS accounts_provider_slug_fk;

UPDATE greenhouse_finance.accounts
   SET provider_slug = NULL,
       updated_at = CURRENT_TIMESTAMP
 WHERE instrument_category = 'shareholder_account'
   AND provider_slug = 'greenhouse';

DROP TABLE IF EXISTS greenhouse_finance.payment_provider_catalog;
