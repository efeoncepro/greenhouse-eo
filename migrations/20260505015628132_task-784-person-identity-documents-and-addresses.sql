-- Up Migration

-- TASK-784 — Person Legal Profile + Identity Documents Foundation.
--
-- Crea las tablas canonicas Postgres para:
--   1. greenhouse_core.person_identity_documents — documentos de identidad
--      legal de personas naturales (RUT Chile + extensible internacional).
--   2. greenhouse_core.person_addresses — direcciones legales/contacto.
--   3. greenhouse_core.person_identity_document_audit_log — append-only.
--   4. greenhouse_core.person_address_audit_log — append-only.
--
-- Decisiones canonicas (ver Plan Mode en docs/tasks/in-progress/TASK-784):
--   - Anchor a `identity_profiles.profile_id` (raiz Person 360), no a `members`.
--     `members` puede tener >=1 profile en multi-tenant futuro.
--   - `organizations.tax_id` queda intacto como identidad tributaria de
--     organizaciones/facturacion. Esta capa NO lo reemplaza.
--   - Encryption strategy: replicar TASK-697 pattern (plaintext + grants
--     estrictos `greenhouse_runtime` + reveal capability + audit + outbox +
--     sanitizers extendidos). NO KMS envelope en V1; Cloud SQL ya cifra
--     at-rest a nivel disco.
--   - Hash con pepper para deduplicacion (no exponer hash plain).
--   - `display_mask` precomputado al INSERT/UPDATE para evitar recompute en read.
--   - Partial UNIQUE: solo un documento activo por (profile, type, country).
--     Historial archivado/expirado coexiste sin bloqueo.
--   - Audit logs append-only con triggers BEFORE UPDATE/DELETE.

-- ============================================================================
-- 1. person_identity_documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.person_identity_documents (
  document_id           TEXT PRIMARY KEY,
  profile_id            TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  country_code          TEXT NOT NULL,
  document_type         TEXT NOT NULL,
  issuing_country       TEXT,
  value_full            TEXT NOT NULL,
  value_normalized      TEXT NOT NULL,
  value_hash            TEXT NOT NULL,
  display_mask          TEXT NOT NULL,
  verification_status   TEXT NOT NULL DEFAULT 'pending_review',
  source                TEXT NOT NULL,
  valid_from            DATE,
  valid_until           DATE,
  evidence_asset_id     TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  declared_by_user_id   TEXT,
  declared_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by_user_id   TEXT,
  verified_at           TIMESTAMPTZ,
  rejected_reason       TEXT,
  rejected_at           TIMESTAMPTZ,
  rejected_by_user_id   TEXT,
  archived_at           TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT person_identity_documents_country_code_check
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT person_identity_documents_issuing_country_check
    CHECK (issuing_country IS NULL OR issuing_country ~ '^[A-Z]{2}$'),
  CONSTRAINT person_identity_documents_document_type_check
    CHECK (document_type IN (
      'CL_RUT', 'CL_PASSPORT', 'CL_DNE',
      'AR_DNI', 'AR_CUIL', 'AR_CUIT',
      'BR_CPF', 'BR_RG',
      'CO_CC', 'CO_CE', 'CO_NIT',
      'MX_CURP', 'MX_RFC',
      'PE_DNI', 'PE_CE',
      'UY_CI',
      'US_SSN', 'US_PASSPORT', 'US_EIN',
      'EU_PASSPORT', 'EU_NATIONAL_ID',
      'GENERIC_PASSPORT', 'GENERIC_NATIONAL_ID', 'GENERIC_TAX_ID'
    )),
  CONSTRAINT person_identity_documents_verification_status_check
    CHECK (verification_status IN ('pending_review', 'verified', 'rejected', 'archived', 'expired')),
  CONSTRAINT person_identity_documents_source_check
    CHECK (source IN ('self_declared', 'hr_declared', 'legacy_bigquery_member_profile', 'migration', 'automated_provider')),
  CONSTRAINT person_identity_documents_value_full_nonempty
    CHECK (length(btrim(value_full)) > 0),
  CONSTRAINT person_identity_documents_value_normalized_nonempty
    CHECK (length(btrim(value_normalized)) > 0),
  CONSTRAINT person_identity_documents_value_hash_format
    CHECK (value_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT person_identity_documents_display_mask_nonempty
    CHECK (length(btrim(display_mask)) > 0),
  CONSTRAINT person_identity_documents_valid_from_until_check
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until),
  CONSTRAINT person_identity_documents_rejected_invariant
    CHECK ((verification_status = 'rejected' AND rejected_reason IS NOT NULL) OR (verification_status <> 'rejected')),
  CONSTRAINT person_identity_documents_verified_invariant
    CHECK ((verification_status = 'verified' AND verified_by_user_id IS NOT NULL AND verified_at IS NOT NULL) OR (verification_status <> 'verified'))
);

-- Solo un documento activo por (profile, type, country). Permite historial
-- archived/rejected/expired sin bloquear nuevo registro.
CREATE UNIQUE INDEX IF NOT EXISTS person_identity_documents_active_unique
  ON greenhouse_core.person_identity_documents (profile_id, document_type, country_code)
  WHERE verification_status IN ('pending_review', 'verified');

CREATE INDEX IF NOT EXISTS person_identity_documents_profile_idx
  ON greenhouse_core.person_identity_documents (profile_id);

CREATE INDEX IF NOT EXISTS person_identity_documents_status_declared_idx
  ON greenhouse_core.person_identity_documents (verification_status, declared_at DESC);

-- Index para detector de hash duplicado entre personas (drift signal).
CREATE INDEX IF NOT EXISTS person_identity_documents_value_hash_idx
  ON greenhouse_core.person_identity_documents (value_hash, document_type, country_code)
  WHERE verification_status IN ('pending_review', 'verified');

COMMENT ON TABLE greenhouse_core.person_identity_documents IS
  'TASK-784 — Documentos de identidad legal de personas naturales. Anclado a identity_profiles.profile_id. NO reemplaza organizations.tax_id (facturacion).';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.profile_id IS
  'FK identity_profiles.profile_id (Person 360 root). RESTRICT on delete — un profile con documentos no se borra; archivar via verification_status.';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.value_full IS
  'Valor completo del documento. Plaintext at rest. Solo lectura via reveal capability + audit. Cloud SQL cifra a nivel disco; grants estrictos limitan acceso a `greenhouse_runtime`.';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.value_normalized IS
  'Valor normalizado (sin puntos/guiones, uppercase para letras). Usado para hash + dedup interno.';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.value_hash IS
  'SHA-256 de pepper||value_normalized. Pepper desde GCP Secret Manager `greenhouse-pii-normalization-pepper`. Sin pepper, hash es trivialmente reversible para RUTs cortos.';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.display_mask IS
  'Mascara legible (e.g. "xx.xxx.678-K"). Precomputada al write. Default reader expone esta — NUNCA value_full.';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.verification_status IS
  'pending_review (default self/hr declared) -> verified (HR verifico) | rejected (HR rechazo, requiere reason) | archived (operador retira) | expired (post valid_until).';
COMMENT ON COLUMN greenhouse_core.person_identity_documents.source IS
  'self_declared (colaborador via /my/profile) | hr_declared (HR cargo) | legacy_bigquery_member_profile (backfill TASK-784 Slice 6) | migration (data migration) | automated_provider (futuro: Registro Civil, etc.).';

-- updated_at trigger
CREATE OR REPLACE FUNCTION greenhouse_core.person_identity_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_identity_documents_set_updated_at_trigger
  ON greenhouse_core.person_identity_documents;

CREATE TRIGGER person_identity_documents_set_updated_at_trigger
  BEFORE UPDATE ON greenhouse_core.person_identity_documents
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.person_identity_documents_set_updated_at();

ALTER TABLE greenhouse_core.person_identity_documents OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.person_identity_documents TO greenhouse_runtime;
-- Sin DELETE: archivar via verification_status='archived'. Audit log preservado.

-- ============================================================================
-- 2. person_addresses
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.person_addresses (
  address_id            TEXT PRIMARY KEY,
  profile_id            TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  address_type          TEXT NOT NULL,
  country_code          TEXT NOT NULL,
  street_line_1         TEXT NOT NULL,
  street_line_2         TEXT,
  city                  TEXT NOT NULL,
  region                TEXT,
  postal_code           TEXT,
  presentation_text     TEXT NOT NULL,
  presentation_mask     TEXT NOT NULL,
  verification_status   TEXT NOT NULL DEFAULT 'pending_review',
  source                TEXT NOT NULL,
  valid_from            DATE,
  valid_until           DATE,
  evidence_asset_id     TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  declared_by_user_id   TEXT,
  declared_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by_user_id   TEXT,
  verified_at           TIMESTAMPTZ,
  rejected_reason       TEXT,
  rejected_at           TIMESTAMPTZ,
  rejected_by_user_id   TEXT,
  archived_at           TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT person_addresses_country_code_check
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT person_addresses_address_type_check
    CHECK (address_type IN ('legal', 'residence', 'mailing', 'emergency')),
  CONSTRAINT person_addresses_verification_status_check
    CHECK (verification_status IN ('pending_review', 'verified', 'rejected', 'archived', 'expired')),
  CONSTRAINT person_addresses_source_check
    CHECK (source IN ('self_declared', 'hr_declared', 'legacy_bigquery_member_profile', 'migration', 'automated_provider')),
  CONSTRAINT person_addresses_street_nonempty
    CHECK (length(btrim(street_line_1)) > 0),
  CONSTRAINT person_addresses_city_nonempty
    CHECK (length(btrim(city)) > 0),
  CONSTRAINT person_addresses_presentation_nonempty
    CHECK (length(btrim(presentation_text)) > 0 AND length(btrim(presentation_mask)) > 0),
  CONSTRAINT person_addresses_valid_from_until_check
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until),
  CONSTRAINT person_addresses_rejected_invariant
    CHECK ((verification_status = 'rejected' AND rejected_reason IS NOT NULL) OR (verification_status <> 'rejected')),
  CONSTRAINT person_addresses_verified_invariant
    CHECK ((verification_status = 'verified' AND verified_by_user_id IS NOT NULL AND verified_at IS NOT NULL) OR (verification_status <> 'verified'))
);

-- Solo una direccion activa por (profile, type). Permite historial.
CREATE UNIQUE INDEX IF NOT EXISTS person_addresses_active_unique
  ON greenhouse_core.person_addresses (profile_id, address_type)
  WHERE verification_status IN ('pending_review', 'verified');

CREATE INDEX IF NOT EXISTS person_addresses_profile_idx
  ON greenhouse_core.person_addresses (profile_id);

CREATE INDEX IF NOT EXISTS person_addresses_status_declared_idx
  ON greenhouse_core.person_addresses (verification_status, declared_at DESC);

COMMENT ON TABLE greenhouse_core.person_addresses IS
  'TASK-784 — Direcciones legales/contacto de personas naturales. Anclado a identity_profiles.profile_id. Permite hasta 1 direccion activa por (profile, type) — legal, residence, mailing, emergency.';
COMMENT ON COLUMN greenhouse_core.person_addresses.presentation_mask IS
  'Version enmascarada para display default (ej. "Las Condes, RM, CL"). NUNCA expone street_line_1 al render default.';
COMMENT ON COLUMN greenhouse_core.person_addresses.presentation_text IS
  'Version completa formateada para snapshots autorizados (final_settlement, payroll_receipt). Reveal con capability + audit.';

CREATE OR REPLACE FUNCTION greenhouse_core.person_addresses_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_addresses_set_updated_at_trigger
  ON greenhouse_core.person_addresses;

CREATE TRIGGER person_addresses_set_updated_at_trigger
  BEFORE UPDATE ON greenhouse_core.person_addresses
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_core.person_addresses_set_updated_at();

ALTER TABLE greenhouse_core.person_addresses OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.person_addresses TO greenhouse_runtime;

-- ============================================================================
-- 3. person_identity_document_audit_log (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.person_identity_document_audit_log (
  audit_id        TEXT PRIMARY KEY,
  document_id     TEXT NOT NULL REFERENCES greenhouse_core.person_identity_documents(document_id) ON DELETE RESTRICT,
  profile_id      TEXT NOT NULL,
  action          TEXT NOT NULL,
  actor_user_id   TEXT,
  actor_email     TEXT,
  reason          TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  diff_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT person_identity_document_audit_log_action_check
    CHECK (action IN ('declared', 'updated', 'verified', 'rejected', 'archived', 'revealed_sensitive', 'export_snapshot')),
  CONSTRAINT person_identity_document_audit_log_diff_object
    CHECK (jsonb_typeof(diff_json) = 'object'),
  CONSTRAINT person_identity_document_audit_log_reveal_requires_reason
    CHECK ((action = 'revealed_sensitive' AND reason IS NOT NULL AND length(btrim(reason)) >= 5) OR (action <> 'revealed_sensitive'))
);

CREATE INDEX IF NOT EXISTS person_identity_document_audit_log_doc_idx
  ON greenhouse_core.person_identity_document_audit_log (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_identity_document_audit_log_profile_idx
  ON greenhouse_core.person_identity_document_audit_log (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_identity_document_audit_log_actor_idx
  ON greenhouse_core.person_identity_document_audit_log (actor_user_id, action, created_at DESC)
  WHERE action IN ('revealed_sensitive', 'export_snapshot');

COMMENT ON TABLE greenhouse_core.person_identity_document_audit_log IS
  'TASK-784 — Append-only audit log de eventos sobre person_identity_documents. NUNCA almacena value_full en diff_json. Usado por reliability signal `identity.legal_profile.reveal_anomaly_rate`.';

-- Append-only enforcement
CREATE OR REPLACE FUNCTION greenhouse_core.assert_person_legal_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'person_legal_profile audit log es append-only. Para correcciones, insertar nueva fila con diff_json.correction_of=<audit_id> referenciando la fila original.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_identity_document_audit_log_no_update_trigger
  ON greenhouse_core.person_identity_document_audit_log;
DROP TRIGGER IF EXISTS person_identity_document_audit_log_no_delete_trigger
  ON greenhouse_core.person_identity_document_audit_log;

CREATE TRIGGER person_identity_document_audit_log_no_update_trigger
  BEFORE UPDATE ON greenhouse_core.person_identity_document_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_person_legal_audit_append_only();

CREATE TRIGGER person_identity_document_audit_log_no_delete_trigger
  BEFORE DELETE ON greenhouse_core.person_identity_document_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_person_legal_audit_append_only();

ALTER TABLE greenhouse_core.person_identity_document_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_core.person_identity_document_audit_log TO greenhouse_runtime;

-- ============================================================================
-- 4. person_address_audit_log (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.person_address_audit_log (
  audit_id        TEXT PRIMARY KEY,
  address_id      TEXT NOT NULL REFERENCES greenhouse_core.person_addresses(address_id) ON DELETE RESTRICT,
  profile_id      TEXT NOT NULL,
  action          TEXT NOT NULL,
  actor_user_id   TEXT,
  actor_email     TEXT,
  reason          TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  diff_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT person_address_audit_log_action_check
    CHECK (action IN ('declared', 'updated', 'verified', 'rejected', 'archived', 'revealed_sensitive', 'export_snapshot')),
  CONSTRAINT person_address_audit_log_diff_object
    CHECK (jsonb_typeof(diff_json) = 'object'),
  CONSTRAINT person_address_audit_log_reveal_requires_reason
    CHECK ((action = 'revealed_sensitive' AND reason IS NOT NULL AND length(btrim(reason)) >= 5) OR (action <> 'revealed_sensitive'))
);

CREATE INDEX IF NOT EXISTS person_address_audit_log_address_idx
  ON greenhouse_core.person_address_audit_log (address_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_address_audit_log_profile_idx
  ON greenhouse_core.person_address_audit_log (profile_id, created_at DESC);

DROP TRIGGER IF EXISTS person_address_audit_log_no_update_trigger
  ON greenhouse_core.person_address_audit_log;
DROP TRIGGER IF EXISTS person_address_audit_log_no_delete_trigger
  ON greenhouse_core.person_address_audit_log;

CREATE TRIGGER person_address_audit_log_no_update_trigger
  BEFORE UPDATE ON greenhouse_core.person_address_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_person_legal_audit_append_only();

CREATE TRIGGER person_address_audit_log_no_delete_trigger
  BEFORE DELETE ON greenhouse_core.person_address_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_person_legal_audit_append_only();

ALTER TABLE greenhouse_core.person_address_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_core.person_address_audit_log TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS person_address_audit_log_no_delete_trigger
  ON greenhouse_core.person_address_audit_log;
DROP TRIGGER IF EXISTS person_address_audit_log_no_update_trigger
  ON greenhouse_core.person_address_audit_log;
DROP TABLE IF EXISTS greenhouse_core.person_address_audit_log;

DROP TRIGGER IF EXISTS person_identity_document_audit_log_no_delete_trigger
  ON greenhouse_core.person_identity_document_audit_log;
DROP TRIGGER IF EXISTS person_identity_document_audit_log_no_update_trigger
  ON greenhouse_core.person_identity_document_audit_log;
DROP TABLE IF EXISTS greenhouse_core.person_identity_document_audit_log;

DROP FUNCTION IF EXISTS greenhouse_core.assert_person_legal_audit_append_only();

DROP TRIGGER IF EXISTS person_addresses_set_updated_at_trigger
  ON greenhouse_core.person_addresses;
DROP FUNCTION IF EXISTS greenhouse_core.person_addresses_set_updated_at();
DROP TABLE IF EXISTS greenhouse_core.person_addresses;

DROP TRIGGER IF EXISTS person_identity_documents_set_updated_at_trigger
  ON greenhouse_core.person_identity_documents;
DROP FUNCTION IF EXISTS greenhouse_core.person_identity_documents_set_updated_at();
DROP TABLE IF EXISTS greenhouse_core.person_identity_documents;
