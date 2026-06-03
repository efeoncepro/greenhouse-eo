-- Up Migration

-- TASK-992 — El wizard de alta de cliente ("puerta única de onboarding") es el
-- primer path de ESCRITURA desde el RUNTIME (greenhouse_runtime) para el nacimiento
-- de un cliente. Históricamente el backbone 360 (organizations/clients/spaces) lo
-- escribían sync/ops (greenhouse_app/greenhouse_ops), por eso greenhouse_runtime
-- tenía solo SELECT/REFERENCES. Sin INSERT/UPDATE, provisionClientFromWizard fallaba
-- con permission denied → error genérico "No se pudo procesar la solicitud de ciclo
-- de vida" (no mapeado). Estos GRANTs son DML acotado (NO DELETE — el wizard no borra
-- estas filas) sobre las 3 tablas que el flujo de nacimiento escribe. Las demás
-- (client_profiles, organization_lifecycle_history, space_notion_sources,
-- client_lifecycle_*, outbox_events) ya tenían los grants.

GRANT INSERT, UPDATE ON greenhouse_core.organizations TO greenhouse_runtime;
GRANT INSERT, UPDATE ON greenhouse_core.clients TO greenhouse_runtime;
GRANT INSERT, UPDATE ON greenhouse_core.spaces TO greenhouse_runtime;

-- Anti pre-up-marker bug guard (CLAUDE.md): aborta si los grants no quedaron.
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(t.tbl, ', ') INTO missing
  FROM (VALUES
    ('organizations'), ('clients'), ('spaces')
  ) AS t(tbl)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'greenhouse_core'
      AND g.table_name = t.tbl
      AND g.grantee = 'greenhouse_runtime'
      AND g.privilege_type = 'INSERT'
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-992 grant check: greenhouse_runtime sin INSERT en greenhouse_core.%', missing;
  END IF;
END
$$;

-- Down Migration

REVOKE INSERT, UPDATE ON greenhouse_core.organizations FROM greenhouse_runtime;
REVOKE INSERT, UPDATE ON greenhouse_core.clients FROM greenhouse_runtime;
REVOKE INSERT, UPDATE ON greenhouse_core.spaces FROM greenhouse_runtime;
