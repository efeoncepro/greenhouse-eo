DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_runtime') THEN
    CREATE ROLE greenhouse_runtime NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_migrator') THEN
    CREATE ROLE greenhouse_migrator NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS greenhouse_sync;

CREATE TABLE IF NOT EXISTS greenhouse_sync.schema_migrations (
  migration_id TEXT PRIMARY KEY,
  migration_group TEXT NOT NULL,
  applied_by TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_app') THEN
    GRANT greenhouse_runtime TO greenhouse_app;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greenhouse_migrator_user') THEN
    GRANT greenhouse_migrator TO greenhouse_migrator_user;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT greenhouse_migrator TO postgres;
  END IF;
END $$;

GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_sync TO greenhouse_runtime;

GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_runtime;

GRANT USAGE, CREATE ON SCHEMA greenhouse_core TO greenhouse_migrator;
GRANT USAGE, CREATE ON SCHEMA greenhouse_serving TO greenhouse_migrator;
GRANT USAGE, CREATE ON SCHEMA greenhouse_sync TO greenhouse_migrator;

GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_sync TO greenhouse_migrator;

DO $$
DECLARE
  schema_name TEXT;
  schema_object RECORD;
BEGIN
  FOREACH schema_name IN ARRAY ARRAY[
    'greenhouse_core',
    'greenhouse_serving',
    'greenhouse_sync'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      BEGIN
        EXECUTE format('ALTER SCHEMA %I OWNER TO greenhouse_migrator', schema_name);
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Skipping ownership transfer for schema % due to insufficient privilege', schema_name;
      END;

      FOR schema_object IN
        SELECT c.relkind, quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = schema_name
          AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
      LOOP
        BEGIN
          IF schema_object.relkind = 'S' THEN
            EXECUTE format('ALTER SEQUENCE %s OWNER TO greenhouse_migrator', schema_object.qualified_name);
          ELSIF schema_object.relkind IN ('r', 'p') THEN
            EXECUTE format('ALTER TABLE %s OWNER TO greenhouse_migrator', schema_object.qualified_name);
          ELSIF schema_object.relkind = 'm' THEN
            EXECUTE format('ALTER MATERIALIZED VIEW %s OWNER TO greenhouse_migrator', schema_object.qualified_name);
          ELSE
            EXECUTE format('ALTER VIEW %s OWNER TO greenhouse_migrator', schema_object.qualified_name);
          END IF;
        EXCEPTION
          WHEN insufficient_privilege THEN
            RAISE NOTICE 'Skipping ownership transfer for object % due to insufficient privilege', schema_object.qualified_name;
        END;
      END LOOP;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  serving_record RECORD;
BEGIN
  FOR serving_record IN
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = 'greenhouse_serving'
      AND c.relkind IN ('r', 'v', 'm')
      AND r.rolname = 'postgres'
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_runtime', serving_record.qualified_name);
    EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_migrator', serving_record.qualified_name);
  END LOOP;
END $$;

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'postgres-access-model-v1',
  'platform',
  CURRENT_USER,
  'Initial runtime and migrator role model for Greenhouse PostgreSQL.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
