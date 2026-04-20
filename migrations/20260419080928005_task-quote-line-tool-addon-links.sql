-- Up Migration

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN tool_id TEXT,
  ADD COLUMN addon_id TEXT;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_tool_addon_exclusive_check
  CHECK (NOT (tool_id IS NOT NULL AND addon_id IS NOT NULL));

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_tool_fkey
  FOREIGN KEY (tool_id)
  REFERENCES greenhouse_ai.tool_catalog(tool_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_addon_fkey
  FOREIGN KEY (addon_id)
  REFERENCES greenhouse_commercial.overhead_addons(addon_id)
  ON DELETE SET NULL;

CREATE INDEX idx_commercial_quotation_line_items_tool
  ON greenhouse_commercial.quotation_line_items (tool_id)
  WHERE tool_id IS NOT NULL;

CREATE INDEX idx_commercial_quotation_line_items_addon
  ON greenhouse_commercial.quotation_line_items (addon_id)
  WHERE addon_id IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_commercial_quotation_line_items_addon;
DROP INDEX IF EXISTS idx_commercial_quotation_line_items_tool;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_addon_fkey;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_tool_fkey;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_tool_addon_exclusive_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP COLUMN IF EXISTS addon_id,
  DROP COLUMN IF EXISTS tool_id;
