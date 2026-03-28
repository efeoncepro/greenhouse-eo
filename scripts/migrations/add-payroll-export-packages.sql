-- ============================================================
-- Greenhouse Payroll — Export package persistence
-- ============================================================
-- Persist PDF/CSV artifacts for exported payroll periods so they can
-- be downloaded later and reused for resend flows without re-closing.
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_export_packages (
  period_id TEXT PRIMARY KEY REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  storage_bucket TEXT,
  pdf_storage_path TEXT,
  csv_storage_path TEXT,
  pdf_file_size_bytes INTEGER,
  csv_file_size_bytes INTEGER,
  pdf_template_version TEXT,
  csv_template_version TEXT,
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_sent_by TEXT,
  last_email_delivery_id TEXT,
  last_send_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payroll_export_packages_delivery_status_idx
  ON greenhouse_payroll.payroll_export_packages (delivery_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS payroll_export_packages_last_sent_idx
  ON greenhouse_payroll.payroll_export_packages (last_sent_at DESC, updated_at DESC);
