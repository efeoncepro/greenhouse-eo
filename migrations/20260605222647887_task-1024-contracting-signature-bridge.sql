-- Up Migration
--
-- TASK-1024 — Workforce Contracting signature bridge (consume EPIC-001 TASK-490/491).
--   (1) capability `workforce.contracting.send_signature` seeded into capabilities_registry.
--       Grant matrix in src/lib/entitlements/runtime.ts: EFEONCE_ADMIN (V0, mirrors approve).
--   (2) `signature_request_id` column on the case → the CURRENT signature_request (a case can
--       have N over time: send / fail / re-send). FK to the canonical aggregate (TASK-490).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'workforce.contracting.send_signature',
    'workforce',
    ARRAY['create'],
    ARRAY['tenant'],
    'TASK-1024 — Enviar un contrato/oferta aprobado a firma electrónica (ZapSign vía EPIC-001).',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO NOTHING;

ALTER TABLE greenhouse_hr.workforce_contracting_cases
  ADD COLUMN IF NOT EXISTS signature_request_id TEXT
    REFERENCES greenhouse_core.signature_requests(signature_request_id) ON DELETE SET NULL;

COMMENT ON COLUMN greenhouse_hr.workforce_contracting_cases.signature_request_id IS
  'TASK-1024 — the current EPIC-001 signature_request for this case (latest send). NULL until sent to signature.';

CREATE INDEX IF NOT EXISTS workforce_contracting_cases_signature_request_idx
  ON greenhouse_hr.workforce_contracting_cases (signature_request_id)
  WHERE signature_request_id IS NOT NULL;

-- Anti pre-up-marker guard: abort if the capability or column did not land.
DO $$
DECLARE cap_exists BOOLEAN; col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'workforce.contracting.send_signature'
  ) INTO cap_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr'
      AND table_name = 'workforce_contracting_cases'
      AND column_name = 'signature_request_id'
  ) INTO col_exists;

  IF NOT cap_exists THEN
    RAISE EXCEPTION 'TASK-1024 anti pre-up-marker: capability send_signature was NOT seeded.';
  END IF;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1024 anti pre-up-marker: signature_request_id column was NOT added.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hr.workforce_contracting_cases_signature_request_idx;
ALTER TABLE greenhouse_hr.workforce_contracting_cases DROP COLUMN IF EXISTS signature_request_id;
DELETE FROM greenhouse_core.capabilities_registry WHERE capability_key = 'workforce.contracting.send_signature';
