-- Up Migration

-- TASK-553 — Quick Access Shortcuts Platform: persistence for user-pinned shortcuts.
--
-- One row per (user, shortcut). `shortcut_key` is validated against the
-- canonical catalog (src/lib/shortcuts/catalog.ts) at write time AND filtered
-- against the user's current access at read time. Shortcuts that become
-- inaccessible (permissions change, catalog entry retired) are silently
-- omitted from API responses but kept in the table for audit / re-grant.
--
-- Scope decision (Open Question 1): pins are scoped by `user_id` only —
-- shortcuts are personal navigation, not tenant data. Cross-tenant validity
-- is enforced at READ time via session-driven access revalidation. CASCADE
-- on user delete keeps the table clean when a user is removed.

CREATE TABLE IF NOT EXISTS greenhouse_core.user_shortcut_pins (
  pin_id          BIGSERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  shortcut_key    TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_shortcut_pins_display_order_check CHECK (display_order >= 0),
  CONSTRAINT user_shortcut_pins_shortcut_key_nonempty CHECK (length(btrim(shortcut_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_shortcut_pins_user_shortcut_uniq
  ON greenhouse_core.user_shortcut_pins (user_id, shortcut_key);

CREATE INDEX IF NOT EXISTS user_shortcut_pins_user_order_idx
  ON greenhouse_core.user_shortcut_pins (user_id, display_order);

COMMENT ON TABLE  greenhouse_core.user_shortcut_pins IS 'TASK-553 — Per-user pinned shortcuts. Validated against src/lib/shortcuts/catalog.ts at write and against current session access at read.';
COMMENT ON COLUMN greenhouse_core.user_shortcut_pins.user_id        IS 'FK greenhouse_core.client_users(user_id). CASCADE on user delete.';
COMMENT ON COLUMN greenhouse_core.user_shortcut_pins.shortcut_key   IS 'Stable identifier from CanonicalShortcut.key. Unknown keys are tolerated at read time (filtered out) but rejected at write time.';
COMMENT ON COLUMN greenhouse_core.user_shortcut_pins.display_order  IS 'Operator-provided sort order, non-negative. Ties break by created_at ASC.';

-- Audit trigger: keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION greenhouse_core.user_shortcut_pins_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_shortcut_pins_set_updated_at_trigger
  ON greenhouse_core.user_shortcut_pins;

CREATE TRIGGER user_shortcut_pins_set_updated_at_trigger
  BEFORE UPDATE ON greenhouse_core.user_shortcut_pins
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.user_shortcut_pins_set_updated_at();

ALTER TABLE greenhouse_core.user_shortcut_pins OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_shortcut_pins TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.user_shortcut_pins_pin_id_seq TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS user_shortcut_pins_set_updated_at_trigger
  ON greenhouse_core.user_shortcut_pins;
DROP FUNCTION IF EXISTS greenhouse_core.user_shortcut_pins_set_updated_at();
DROP TABLE IF EXISTS greenhouse_core.user_shortcut_pins;
