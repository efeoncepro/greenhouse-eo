-- Up Migration
SET search_path = greenhouse_notifications, greenhouse_serving, greenhouse_core, public;

DO $$
DECLARE
  readonly_runtime_schemas CONSTANT TEXT[] := ARRAY[
    'greenhouse_core',
    'greenhouse_serving'
  ];
  dml_runtime_schemas CONSTANT TEXT[] := ARRAY[
    'greenhouse_sync',
    'greenhouse_hr',
    'greenhouse_payroll',
    'greenhouse_finance',
    'greenhouse_delivery',
    'greenhouse_crm',
    'greenhouse_ai',
    'greenhouse_notifications',
    'greenhouse_cost_intelligence'
  ];
  schema_name TEXT;
BEGIN
  FOREACH schema_name IN ARRAY readonly_runtime_schemas || dml_runtime_schemas
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO greenhouse_runtime', schema_name);
      EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO greenhouse_migrator', schema_name);
      EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO greenhouse_migrator', schema_name);
      EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO greenhouse_migrator', schema_name);
    END IF;
  END LOOP;

  FOREACH schema_name IN ARRAY readonly_runtime_schemas
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      IF schema_name = 'greenhouse_core' THEN
        EXECUTE format('GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA %I TO greenhouse_runtime', schema_name);
      ELSE
        EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO greenhouse_runtime', schema_name);
      END IF;
    END IF;
  END LOOP;

  FOREACH schema_name IN ARRAY dml_runtime_schemas
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO greenhouse_runtime',
        schema_name
      );
      EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO greenhouse_runtime', schema_name);
    END IF;
  END LOOP;
END $$;

-- Down Migration
-- Privilege reconciliation is intentionally irreversible.
