-- Up Migration

-- TASK-1330 — Short links gobernados para informes públicos del AI Visibility Grader.
--
-- Alias corto, de alta entropía, no enumerable y revocable → resuelve a un `grader_reports`
-- publicado (TASK-1239) sin exponer el token largo en el copy compartido. ADITIVO: NUNCA muta
-- `grader_reports` (append-only). Replica el patrón canónico de
-- `greenhouse_commercial.quote_short_links` (TASK-631) per-dominio; el Deep Link Platform
-- (`GREENHOUSE_DEEP_LINK_PLATFORM_V1`) es un resolver semántico, NO un store de códigos.

CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_report_short_links (
  short_code text PRIMARY KEY,
  report_id text NOT NULL REFERENCES greenhouse_growth.grader_reports(report_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_source text NOT NULL DEFAULT 'system',
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  CONSTRAINT grader_report_short_code_format CHECK (short_code ~ '^[a-zA-Z0-9]{10,14}$'),
  CONSTRAINT grader_report_short_use_count_non_negative CHECK (use_count >= 0)
);

-- Invariante "un solo link activo por reporte" enforced en DB (defense-in-depth), no solo en
-- app-logic. Un INSERT concurrente de un 2.º activo choca acá (23505 sobre este índice), NO sobre
-- la PK: el helper `ensure` lo distingue por `constraint` y re-selecciona el activo existente.
CREATE UNIQUE INDEX IF NOT EXISTS grader_report_short_links_active_idx
  ON greenhouse_growth.grader_report_short_links (report_id)
  WHERE revoked_at IS NULL;

-- Lookup de expiración para housekeeping/observabilidad (links activos con expiración).
CREATE INDEX IF NOT EXISTS grader_report_short_links_expires_idx
  ON greenhouse_growth.grader_report_short_links (expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si la tabla NO quedó realmente creada.
DO $$
DECLARE table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_report_short_links'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1330 anti pre-up-marker check: greenhouse_growth.grader_report_short_links was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Ownership + GRANTs. DML al runtime (ensure/resolve/track/revoke). NUNCA DELETE (soft revoke).
ALTER TABLE greenhouse_growth.grader_report_short_links OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_short_links TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.grader_report_short_links TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.grader_report_short_links TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.grader_report_short_links;
