-- Up Migration
SET search_path = greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_serving.service_attribution_facts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.service_attribution_unresolved OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_serving TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.service_attribution_facts
  TO greenhouse_runtime, greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_serving.service_attribution_unresolved
  TO greenhouse_runtime, greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.service_attribution_facts
  TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_serving.service_attribution_unresolved
  TO greenhouse_migrator;

-- Down Migration
REVOKE ALL ON greenhouse_serving.service_attribution_unresolved FROM greenhouse_migrator;
REVOKE ALL ON greenhouse_serving.service_attribution_facts FROM greenhouse_migrator;

REVOKE ALL ON greenhouse_serving.service_attribution_unresolved FROM greenhouse_app;
REVOKE ALL ON greenhouse_serving.service_attribution_facts FROM greenhouse_app;

REVOKE INSERT, UPDATE, DELETE ON greenhouse_serving.service_attribution_unresolved FROM greenhouse_runtime;
REVOKE INSERT, UPDATE, DELETE ON greenhouse_serving.service_attribution_facts FROM greenhouse_runtime;
