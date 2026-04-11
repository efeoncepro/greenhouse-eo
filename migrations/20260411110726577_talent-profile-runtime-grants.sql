-- Up Migration
-- Grant runtime access to all talent profile tables created by TASK-157, TASK-313, and TASK-315.
-- Also set default privileges so future tables in greenhouse_core automatically get runtime grants.

-- TASK-157: skill_catalog, member_skills, service_skill_requirements
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.skill_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_skills TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.service_skill_requirements TO greenhouse_runtime;

-- TASK-313: member_certifications
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_certifications TO greenhouse_runtime;

-- TASK-315: tool_catalog, member_tools, member_languages
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.tool_catalog TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_tools TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_languages TO greenhouse_runtime;

-- Default privileges: future tables created by greenhouse_ops in greenhouse_core
-- will automatically grant DML to greenhouse_runtime (prevents this class of bug)
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_core
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

-- Down Migration

-- Revoke runtime access (leave default privileges in place as they are safe)
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.skill_catalog FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_skills FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.service_skill_requirements FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_certifications FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.tool_catalog FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_tools FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.member_languages FROM greenhouse_runtime;
