-- Up Migration
--
-- Payment Provider Catalog — Canonical Resync (closes HTTP 500 class via FK drift)
-- ================================================================================
--
-- Context
-- -------
-- Migration `20260427143400960_task-701-payment-provider-catalog-greenhouse-as-platform`
-- introduced `greenhouse_finance.payment_provider_catalog` and a FK from
-- `accounts.provider_slug`. Its seed listed 20 providers but omitted `global66`,
-- which is present in the static TS catalog (`src/config/payment-instruments.ts`).
-- Because the form lets users pick `global66`, the INSERT into `accounts`
-- triggered foreign_key_violation (PG 23503) and surfaced as HTTP 500.
--
-- Robust fix
-- ----------
-- Instead of patching `global66` alone, this migration reconciles the entire
-- catalog from a single canonical list. Every row uses ON CONFLICT (provider_slug)
-- DO UPDATE so:
--
--   1. Re-running this migration heals any future drift idempotently.
--   2. Renaming display_name or extending applicable_to in the canonical TS list
--      and re-issuing a resync produces a deterministic update without manual SQL.
--
-- The list mirrors CANONICAL_PROVIDERS in
-- `src/lib/finance/payment-instruments/canonical-providers.ts`.
-- A vitest drift guard
-- (`src/lib/finance/payment-instruments/__tests__/canonical-catalog-drift.test.ts`)
-- fails the build if any of:
--
--   - PROVIDER_CATALOG (TS) has a slug missing from CANONICAL_PROVIDERS,
--   - CANONICAL_PROVIDERS has a slug missing from this migration's seed,
--
-- so the next time someone adds a fintech to TS without seeding it here, CI
-- catches it before merge instead of users hitting a 500.
--
-- Defense in depth
-- ----------------
-- `createPaymentInstrumentAdmin` and `updatePaymentInstrumentAdmin` now call
-- `assertProviderInCanonicalCatalog(client, providerSlug)` before INSERT/UPDATE
-- on `accounts`. If the slug somehow escapes the drift guard and reaches the
-- DB, the user gets a clean 422 with an actionable message instead of a raw
-- foreign_key_violation 500.

SET search_path = greenhouse_finance, greenhouse_core, public;

INSERT INTO greenhouse_finance.payment_provider_catalog
  (provider_slug, display_name, provider_type, country_code, applicable_to, updated_at)
VALUES
  ('bci',          'BCI',              'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('banco-chile',  'Banco de Chile',   'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('banco-estado', 'BancoEstado',      'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('santander',    'Santander',        'bank',              'CL', ARRAY['bank_account', 'credit_card'], CURRENT_TIMESTAMP),
  ('scotiabank',   'Scotiabank',       'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('itau',         'Itaú',             'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('bice',         'BICE',             'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('security',     'Banco Security',   'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('falabella',    'Banco Falabella',  'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('ripley',       'Banco Ripley',     'bank',              'CL', ARRAY['bank_account'],                CURRENT_TIMESTAMP),
  ('visa',         'Visa',             'card_network',      NULL, ARRAY['credit_card'],                 CURRENT_TIMESTAMP),
  ('mastercard',   'Mastercard',       'card_network',      NULL, ARRAY['credit_card'],                 CURRENT_TIMESTAMP),
  ('amex',         'American Express', 'card_network',      NULL, ARRAY['credit_card'],                 CURRENT_TIMESTAMP),
  ('mercadopago',  'Mercado Pago',     'fintech',           NULL, ARRAY['fintech'],                     CURRENT_TIMESTAMP),
  ('wise',         'Wise',             'fintech',           NULL, ARRAY['fintech'],                     CURRENT_TIMESTAMP),
  ('stripe',       'Stripe',           'fintech',           NULL, ARRAY['fintech'],                     CURRENT_TIMESTAMP),
  ('paypal',       'PayPal',           'fintech',           NULL, ARRAY['fintech'],                     CURRENT_TIMESTAMP),
  ('global66',     'Global66',         'fintech',           NULL, ARRAY['fintech'],                     CURRENT_TIMESTAMP),
  ('deel',         'Deel',             'payment_platform',  NULL, ARRAY['payment_platform'],            CURRENT_TIMESTAMP),
  ('previred',     'Previred',         'payroll_processor', 'CL', ARRAY['payroll_processor'],           CURRENT_TIMESTAMP),
  ('greenhouse',   'Greenhouse',       'platform_operator', NULL, ARRAY['shareholder_account'],         CURRENT_TIMESTAMP)
ON CONFLICT (provider_slug) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  country_code  = EXCLUDED.country_code,
  applicable_to = EXCLUDED.applicable_to,
  updated_at    = CURRENT_TIMESTAMP;

-- Down Migration
--
-- Resync is forward-only by design: rolling back would either restore an empty
-- catalog (breaking accounts via FK RESTRICT) or partially undo per-row state
-- that another migration may have legitimately changed. We therefore make the
-- down a no-op: to remove a provider, write a targeted DELETE migration that
-- first re-points or drops dependent accounts.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- intentional no-op
SELECT 1;
