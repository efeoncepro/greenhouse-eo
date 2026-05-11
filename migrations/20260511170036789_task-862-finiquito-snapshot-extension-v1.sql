-- Up Migration

-- TASK-862 Slice C — Final settlement document snapshot extension.
-- Agrega 3 columnas nullable para destrabar el render legal del finiquito:
--   1. greenhouse_core.organizations.logo_asset_id — logo del empleador (Slice D
--      renderiza el logo de la legal entity en lugar del logo Greenhouse).
--   2. greenhouse_hr.work_relationship_offboarding_cases.resignation_letter_asset_id —
--      pre-requisito de calculo del finiquito (carta de renuncia ratificada subida
--      al sistema antes de calcular; readiness check resignation_letter_uploaded).
--   3. greenhouse_hr.work_relationship_offboarding_cases.maintenance_obligation_json —
--      declaracion Ley 21.389 pension de alimentos (Alt A no afecto / Alt B afecto
--      con monto + beneficiario + evidencia opcional). Readiness check
--      maintenance_obligation_declared.
--
-- FK ON DELETE SET NULL (no cascade): si el asset se borra accidentalmente, las
-- filas referenciadoras pierden el link pero no se borran (decision conservadora;
-- el snapshot del documento ya tiene el assetId capturado y la readiness check
-- alertara la inconsistencia).
--
-- JSONB para maintenance_obligation: shape variable (Alt A vs Alt B con campos
-- distintos) + audit fields (declaredAt, declaredByUserId). Validacion runtime en
-- el endpoint POST /maintenance-obligation. No CHECK constraint declarativo en V1
-- porque el shape puede evolucionar (segundo declarante, revocacion). V2 podria
-- promover a tablas dedicadas si la auditoria lo exige.

-- ─── 1. organizations.logo_asset_id ─────────────────────────────────────────
ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS logo_asset_id TEXT NULL;

ALTER TABLE greenhouse_core.organizations
  ADD CONSTRAINT organizations_logo_asset_id_fkey
  FOREIGN KEY (logo_asset_id)
  REFERENCES greenhouse_core.assets(asset_id)
  ON DELETE SET NULL;

COMMENT ON COLUMN greenhouse_core.organizations.logo_asset_id IS
  'TASK-862 — Logo del empleador (legal entity) renderizado en el header de documentos legales (finiquito, contrato, anexo). Resuelto desde greenhouse_core.assets via /api/assets/private/<id>. Fallback a logo Greenhouse hardcoded cuando null.';

-- ─── 2. work_relationship_offboarding_cases.resignation_letter_asset_id ────
ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  ADD COLUMN IF NOT EXISTS resignation_letter_asset_id TEXT NULL;

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  ADD CONSTRAINT work_relationship_offboarding_cases_resignation_letter_asset_id_fkey
  FOREIGN KEY (resignation_letter_asset_id)
  REFERENCES greenhouse_core.assets(asset_id)
  ON DELETE SET NULL;

COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.resignation_letter_asset_id IS
  'TASK-862 — Carta de renuncia ratificada del trabajador (asset_type=resignation_letter_ratified). Pre-requisito de buildDocumentReadiness check resignation_letter_uploaded. Aplica SOLO cuando separation_type=resignation.';

-- ─── 3. work_relationship_offboarding_cases.maintenance_obligation_json ────
ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  ADD COLUMN IF NOT EXISTS maintenance_obligation_json JSONB NULL;

COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.maintenance_obligation_json IS
  'TASK-862 — Declaracion Ley 21.389 (Ley 14.908 mod. 2021) pension de alimentos. Shape: { variant: "not_subject" | "subject", amount?: number, beneficiary?: string, evidenceAssetId?: string, declaredAt: ISO-8601, declaredByUserId: string }. Validacion en endpoint POST /maintenance-obligation.';

-- ─── Defense-in-depth check (TASK-862 pre-up-marker guard) ─────────────────
DO $$
DECLARE org_col_exists boolean;
DECLARE case_letter_col_exists boolean;
DECLARE case_obligation_col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core' AND table_name = 'organizations' AND column_name = 'logo_asset_id'
  ) INTO org_col_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'work_relationship_offboarding_cases' AND column_name = 'resignation_letter_asset_id'
  ) INTO case_letter_col_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'work_relationship_offboarding_cases' AND column_name = 'maintenance_obligation_json'
  ) INTO case_obligation_col_exists;

  IF NOT org_col_exists THEN
    RAISE EXCEPTION 'TASK-862 anti pre-up-marker check: greenhouse_core.organizations.logo_asset_id was NOT created.';
  END IF;
  IF NOT case_letter_col_exists THEN
    RAISE EXCEPTION 'TASK-862 anti pre-up-marker check: work_relationship_offboarding_cases.resignation_letter_asset_id was NOT created.';
  END IF;
  IF NOT case_obligation_col_exists THEN
    RAISE EXCEPTION 'TASK-862 anti pre-up-marker check: work_relationship_offboarding_cases.maintenance_obligation_json was NOT created.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  DROP CONSTRAINT IF EXISTS work_relationship_offboarding_cases_resignation_letter_asset_id_fkey;

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  DROP COLUMN IF EXISTS resignation_letter_asset_id;

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases
  DROP COLUMN IF EXISTS maintenance_obligation_json;

ALTER TABLE greenhouse_core.organizations
  DROP CONSTRAINT IF EXISTS organizations_logo_asset_id_fkey;

ALTER TABLE greenhouse_core.organizations
  DROP COLUMN IF EXISTS logo_asset_id;
