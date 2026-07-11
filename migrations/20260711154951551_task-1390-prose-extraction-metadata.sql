-- Up Migration

-- TASK-1390 (ISSUE-120 Gap C) — metadata del intento de extracción de prosa en el finding.
-- Aditivo/idempotente: columna JSONB nullable. Antes, el router de extracción producía
-- la causa de degradación (disabled/not_configured/schema_invalid/provider_error) pero
-- el dominio la descartaba → `sentiment unknown` era indistinguible de "no corrió".
-- Shape esperado: { "ran": boolean, "status": text, "provider": text|null }.

ALTER TABLE greenhouse_growth.normalized_findings
  ADD COLUMN IF NOT EXISTS prose_extraction JSONB;

COMMENT ON COLUMN greenhouse_growth.normalized_findings.prose_extraction IS
  'TASK-1390: resultado del intento de extracción de prosa ({ran,status,provider}); NULL = finding anterior al contrato v2.';

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'normalized_findings'
    AND column_name = 'prose_extraction';

  IF column_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1390 anti pre-up-marker: prose_extraction column was NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.normalized_findings
  DROP COLUMN IF EXISTS prose_extraction;
