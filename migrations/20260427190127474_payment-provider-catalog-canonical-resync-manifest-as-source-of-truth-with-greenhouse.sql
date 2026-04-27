-- Up Migration
--
-- Payment Provider Catalog — Canonical Resync (auto-generated)
-- =============================================================
--
-- Reason: manifest-as-source-of-truth-with-greenhouse
-- Generated: 2026-04-27T19:01:27.500Z
-- Source: public/images/logos/payment/manifest.json (single source of truth)
-- Generator: scripts/catalog/resync-from-manifest.ts
--
-- DO NOT EDIT BY HAND. To change the catalog:
--   1. Edit public/images/logos/payment/manifest.json (or run the
--      brand-asset-designer skill).
--   2. `pnpm catalog:resync --reason "<short-reason>"` to regenerate
--      a new migration like this one.
--   3. `pnpm migrate:up` to apply.
--
-- The drift-guard test and the prebuild gate (`pnpm catalog:check`)
-- ensure manifest and the latest migration of this kind stay aligned.

SET search_path = greenhouse_finance, greenhouse_core, public;

INSERT INTO greenhouse_finance.payment_provider_catalog
  (provider_slug, display_name, provider_type, country_code, applicable_to, updated_at)
VALUES
  ('amex', 'American Express', 'card_network', NULL, ARRAY['credit_card'], CURRENT_TIMESTAMP),
  ('banco-chile', 'Banco de Chile', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('banco-estado', 'BancoEstado', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('bci', 'BCI', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('bice', 'BICE', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('deel', 'Deel', 'payment_platform', NULL, ARRAY['payment_platform'], CURRENT_TIMESTAMP),
  ('falabella', 'Banco Falabella', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('global66', 'Global66', 'fintech', NULL, ARRAY['fintech'], CURRENT_TIMESTAMP),
  ('greenhouse', 'Greenhouse', 'platform_operator', NULL, ARRAY['shareholder_account'], CURRENT_TIMESTAMP),
  ('itau', 'Itaú', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('mastercard', 'Mastercard', 'card_network', NULL, ARRAY['credit_card'], CURRENT_TIMESTAMP),
  ('mercadopago', 'MercadoPago', 'fintech', NULL, ARRAY['fintech'], CURRENT_TIMESTAMP),
  ('paypal', 'PayPal', 'fintech', NULL, ARRAY['fintech'], CURRENT_TIMESTAMP),
  ('previred', 'Previred', 'payroll_processor', 'CL', ARRAY['payroll_processor'], CURRENT_TIMESTAMP),
  ('ripley', 'Banco Ripley', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('santander', 'Santander', 'bank', 'CL', ARRAY['bank_account', 'credit_card'], CURRENT_TIMESTAMP),
  ('scotiabank', 'Scotiabank', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('security', 'Banco Security', 'bank', 'CL', ARRAY['bank_account'], CURRENT_TIMESTAMP),
  ('stripe', 'Stripe', 'fintech', NULL, ARRAY['fintech'], CURRENT_TIMESTAMP),
  ('visa', 'Visa', 'card_network', NULL, ARRAY['credit_card'], CURRENT_TIMESTAMP),
  ('wise', 'Wise', 'fintech', NULL, ARRAY['fintech'], CURRENT_TIMESTAMP)
ON CONFLICT (provider_slug) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  country_code  = EXCLUDED.country_code,
  applicable_to = EXCLUDED.applicable_to,
  updated_at    = CURRENT_TIMESTAMP;

-- Down Migration
--
-- Resync is forward-only by design. Rolling back would either restore an
-- empty catalog (breaking accounts via FK RESTRICT) or partially undo
-- per-row state another migration may legitimately have changed.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- intentional no-op
SELECT 1;
