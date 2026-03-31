-- TASK-163: Migrate existing quotes (DTE 52) from income to quotes table
-- and fix credit note (DTE 61) sign inversion
--
-- Run this AFTER setup-postgres-quotes.sql has created the quotes table.
-- This script is idempotent — safe to run multiple times.

-- Step 0: Pre-migration counts (for validation)
-- Run these SELECT statements before and after to verify:
--
-- SELECT dte_type_code, income_type, COUNT(*), SUM(total_amount_clp)
-- FROM greenhouse_finance.income
-- GROUP BY dte_type_code, income_type
-- ORDER BY dte_type_code;

-- Step 1: Copy DTE 52 (cotizaciones) from income to quotes
INSERT INTO greenhouse_finance.quotes (
  quote_id, client_id, organization_id, client_name,
  quote_number, quote_date, due_date,
  currency, subtotal, tax_rate, tax_amount, total_amount,
  exchange_rate_to_clp, total_amount_clp,
  status, nubox_document_id, nubox_sii_track_id, nubox_emission_status,
  dte_type_code, dte_folio, nubox_emitted_at, nubox_last_synced_at,
  created_at, updated_at
)
SELECT
  'QUO-MIG-' || income_id,
  client_id, organization_id, client_name,
  invoice_number, invoice_date, due_date,
  currency, subtotal, tax_rate, tax_amount, total_amount,
  exchange_rate_to_clp, total_amount_clp,
  'sent', nubox_document_id::text, nubox_sii_track_id::text, nubox_emission_status,
  '52', dte_folio, nubox_emitted_at, nubox_last_synced_at,
  created_at, updated_at
FROM greenhouse_finance.income
WHERE (dte_type_code = '52' OR income_type = 'quote')
  AND income_id NOT IN (
    SELECT REPLACE(quote_id, 'QUO-MIG-', '')
    FROM greenhouse_finance.quotes
    WHERE quote_id LIKE 'QUO-MIG-%'
  )
ON CONFLICT (quote_id) DO NOTHING;

-- Step 2: Delete quotes from income table
DELETE FROM greenhouse_finance.income
WHERE dte_type_code = '52' OR income_type = 'quote';

-- Step 3: Fix credit notes (DTE 61) — make amounts negative
UPDATE greenhouse_finance.income
SET
  total_amount = -ABS(total_amount),
  total_amount_clp = -ABS(total_amount_clp),
  subtotal = -ABS(subtotal),
  tax_amount = -ABS(tax_amount),
  payment_status = 'paid'
WHERE dte_type_code = '61'
  AND total_amount > 0;

-- Step 4: Post-migration validation
-- Run these to verify:
--
-- Quotes migrated:
-- SELECT COUNT(*) FROM greenhouse_finance.quotes;
--
-- No quotes left in income:
-- SELECT COUNT(*) FROM greenhouse_finance.income WHERE dte_type_code = '52' OR income_type = 'quote';
-- Expected: 0
--
-- All credit notes have negative amounts:
-- SELECT COUNT(*) FROM greenhouse_finance.income WHERE dte_type_code = '61' AND total_amount > 0;
-- Expected: 0
--
-- Revenue should now be lower (correct):
-- SELECT SUM(total_amount_clp) FROM greenhouse_finance.income;
