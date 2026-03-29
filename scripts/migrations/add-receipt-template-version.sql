-- Add template_version to payroll_receipts for lazy PDF cache invalidation.
-- Existing rows get NULL → treated as stale (pre-versioning), regenerated on next access.
ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD COLUMN IF NOT EXISTS template_version TEXT DEFAULT NULL;

COMMENT ON COLUMN greenhouse_payroll.payroll_receipts.template_version IS
  'PDF template version that generated this receipt. NULL = pre-versioning (stale). Compared against RECEIPT_TEMPLATE_VERSION at serve time; mismatch triggers lazy regeneration.';
