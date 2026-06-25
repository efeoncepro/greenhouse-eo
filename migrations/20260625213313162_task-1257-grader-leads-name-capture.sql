-- Up Migration

-- TASK-1257 — Growth AI Visibility · captura de Nombre + Apellido del lead (EPIC-020 B).
-- ADDITIVE-only + idempotente + reversible. Agrega first_name/last_name (PII, nullable) a
-- grader_leads para que el HubSpot handoff (TASK-1242) mande firstname/lastname nativos con
-- valor real. Nullable: los leads históricos (a-medida + previos a esta task) no tienen nombre
-- y siguen válidos. PII tratada como el email (Ley 21.719): vive en el lead con consent, NUNCA
-- viaja a los providers IA. Los grants table-level existentes de grader_leads cubren las
-- columnas nuevas automáticamente (PG extiende los grants de tabla a columnas añadidas).

ALTER TABLE greenhouse_growth.grader_leads
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- Anti pre-up-marker: aborta si las columnas no quedaron creadas realmente.
DO $$
DECLARE first_ok boolean; last_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_leads' AND column_name = 'first_name'
  ) INTO first_ok;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'grader_leads' AND column_name = 'last_name'
  ) INTO last_ok;

  IF NOT (first_ok AND last_ok) THEN
    RAISE EXCEPTION 'TASK-1257 anti pre-up-marker: grader_leads.first_name/last_name NO creadas (first=% last=%). Markers invertidos.',
      first_ok, last_ok;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_growth.grader_leads DROP COLUMN IF EXISTS first_name;
ALTER TABLE greenhouse_growth.grader_leads DROP COLUMN IF EXISTS last_name;
