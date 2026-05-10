-- Up Migration

-- TASK-812 corrective slice — auditable worker-level Previred legal codes.
--
-- Previred requires fields that are not present in payroll_entries and must
-- not be inferred by the export generator (sex, nationality and exact health
-- institution code). This table is the explicit payroll compliance profile
-- anchored to the canonical Person 360 identity profile.

CREATE TABLE IF NOT EXISTS greenhouse_payroll.chile_previred_worker_profiles (
  profile_id TEXT PRIMARY KEY REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  sex_code TEXT NOT NULL CHECK (sex_code IN ('M', 'F')),
  nationality_code TEXT NOT NULL CHECK (nationality_code IN ('0', '1')),
  health_institution_code TEXT NOT NULL DEFAULT '00' CHECK (
    health_institution_code IN ('00', '01', '02', '03', '04', '05', '07', '10', '11', '12', '25')
  ),
  source_kind TEXT NOT NULL DEFAULT 'hr_declared' CHECK (
    source_kind IN ('hr_declared', 'operator_declared', 'provider_verified', 'migration')
  ),
  source_ref TEXT,
  notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE greenhouse_payroll.chile_previred_worker_profiles IS
  'TASK-812 — explicit, auditable worker codes required by Previred exports. No sex/nationality inference is allowed in the generator.';

COMMENT ON COLUMN greenhouse_payroll.chile_previred_worker_profiles.sex_code IS
  'Previred Tabla N°1: M/F. Required; never inferred from names.';

COMMENT ON COLUMN greenhouse_payroll.chile_previred_worker_profiles.nationality_code IS
  'Previred Tabla N°2: 0 Chileno, 1 Extranjero. Required; CL_RUT alone is not treated as proof of nationality.';

COMMENT ON COLUMN greenhouse_payroll.chile_previred_worker_profiles.health_institution_code IS
  'Previred Tabla N°16. 00 Sin Isapre, 07 Fonasa, otherwise exact Isapre code.';

GRANT SELECT ON greenhouse_payroll.chile_previred_worker_profiles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_payroll.chile_previred_worker_profiles TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_payroll.chile_previred_worker_profiles;
