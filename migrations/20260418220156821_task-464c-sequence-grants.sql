-- Up Migration

GRANT USAGE, SELECT, UPDATE ON SEQUENCE greenhouse_ai.tool_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE greenhouse_ai.tool_sku_seq TO greenhouse_migrator;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq TO greenhouse_migrator;

-- Down Migration

REVOKE UPDATE ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq FROM greenhouse_migrator;
REVOKE UPDATE ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq FROM greenhouse_runtime;

REVOKE UPDATE ON SEQUENCE greenhouse_ai.tool_sku_seq FROM greenhouse_migrator;
REVOKE UPDATE ON SEQUENCE greenhouse_ai.tool_sku_seq FROM greenhouse_runtime;
