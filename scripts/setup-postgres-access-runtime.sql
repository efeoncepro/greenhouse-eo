DO $$
DECLARE
  schema_name TEXT;
  table_record RECORD;
  view_record RECORD;
BEGIN
  FOREACH schema_name IN ARRAY ARRAY[
    'greenhouse_hr',
    'greenhouse_payroll',
    'greenhouse_finance'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = schema_name) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO greenhouse_runtime', schema_name);
      EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO greenhouse_migrator', schema_name);

      FOR table_record IN
        SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = schema_name
          AND c.relkind IN ('r', 'p')
      LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %s TO greenhouse_runtime',
          table_record.qualified_name
        );
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE %s TO greenhouse_migrator',
          table_record.qualified_name
        );
      END LOOP;

      FOR view_record IN
        SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = schema_name
          AND c.relkind IN ('v', 'm')
      LOOP
        EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_runtime', view_record.qualified_name);
        EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_migrator', view_record.qualified_name);
      END LOOP;

      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime',
        schema_name
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator',
        schema_name
      );
    END IF;
  END LOOP;

  FOR view_record IN
    SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname) AS qualified_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'greenhouse_serving'
      AND c.relname IN ('provider_finance_360', 'member_payroll_360')
      AND c.relkind IN ('v', 'm')
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_runtime', view_record.qualified_name);
    EXECUTE format('GRANT SELECT ON TABLE %s TO greenhouse_migrator', view_record.qualified_name);
  END LOOP;
END $$;
