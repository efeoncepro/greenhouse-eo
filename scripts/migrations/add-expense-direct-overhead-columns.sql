-- Migration: Add direct overhead classification columns to greenhouse_finance.expenses
-- Part of TASK-057 — Direct Overhead Tool Cost Attribution per Person
--
-- These columns allow individual expenses to be classified as member-linked
-- direct overhead, enabling the loaded cost chain to include tool/license
-- costs assigned per person from the Finance module.

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS direct_overhead_scope TEXT DEFAULT 'none'
    CHECK (direct_overhead_scope IN ('none', 'member_direct', 'shared'));

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS direct_overhead_kind TEXT
    CHECK (direct_overhead_kind IN ('tool_license', 'tool_usage', 'equipment', 'reimbursement', 'other'));

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS direct_overhead_member_id TEXT
    REFERENCES greenhouse_core.members(member_id);

-- Index for the reader query that filters member_direct expenses per member + period
CREATE INDEX IF NOT EXISTS idx_expenses_direct_overhead_member
  ON greenhouse_finance.expenses (direct_overhead_member_id, direct_overhead_scope)
  WHERE direct_overhead_scope = 'member_direct';
