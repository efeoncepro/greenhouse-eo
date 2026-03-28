-- Add payroll receipts registry for exported-period PDF storage and email delivery.

CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_receipts (
  receipt_id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  pay_regime TEXT NOT NULL CHECK (pay_regime IN ('chile', 'international')),
  revision INTEGER NOT NULL DEFAULT 1,
  source_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'generation_failed', 'email_sent', 'email_failed')),
  storage_bucket TEXT,
  storage_path TEXT,
  file_size_bytes INTEGER,
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  generation_error TEXT,
  email_recipient TEXT,
  email_sent_at TIMESTAMPTZ,
  email_delivery_id TEXT,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_receipts_entry_revision_unique UNIQUE (entry_id, revision),
  CONSTRAINT payroll_receipts_source_event_entry_unique UNIQUE (source_event_id, entry_id)
);

CREATE INDEX IF NOT EXISTS payroll_receipts_period_idx
  ON greenhouse_payroll.payroll_receipts (period_id, revision DESC);

CREATE INDEX IF NOT EXISTS payroll_receipts_source_event_idx
  ON greenhouse_payroll.payroll_receipts (source_event_id, created_at DESC);
