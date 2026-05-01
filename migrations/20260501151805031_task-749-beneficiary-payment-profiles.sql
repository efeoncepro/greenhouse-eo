-- Up Migration

-- TASK-749 — Beneficiary Payment Profiles V1
--
-- Perfiles versionados de pago por beneficiario. Resuelve "por que rail
-- pagar a este colaborador/accionista" sin hardcodear reglas. Cambios
-- sensibles requieren maker-checker (created_by != approved_by).
--
-- V1 enfoca beneficiary_type IN ('member', 'shareholder'). Otros types
-- (supplier, tax_authority, processor) se agregan en V2 cuando emerja
-- la necesidad — el CHECK constraint ya los acepta para forward compat.
--
-- Reglas duras:
--   - Datos sensibles (account_number_full, provider_identifier, vault_ref)
--     se devuelven enmascarados por defecto. Reveal requiere capability
--     'finance.payment_profiles.reveal_sensitive' + audit log.
--   - Una sola row "active" por (space, beneficiary_type, beneficiary_id,
--     currency). Crear nueva → la anterior queda 'superseded' via
--     superseded_by chain.
--   - Maker-checker: trigger DB bloquea status='active' si created_by
--     == approved_by (cuando require_approval=TRUE).

CREATE TABLE IF NOT EXISTS greenhouse_finance.beneficiary_payment_profiles (
  profile_id               TEXT PRIMARY KEY,
  space_id                 TEXT,
  beneficiary_type         TEXT NOT NULL CHECK (beneficiary_type IN (
                             'member',
                             'shareholder',
                             'supplier',
                             'tax_authority',
                             'processor',
                             'other'
                           )),
  beneficiary_id           TEXT NOT NULL,
  beneficiary_name         TEXT,
  -- Catalog: country/currency en los que aplica este profile.
  country_code             TEXT,
  currency                 TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  -- Routing canonico: rail (provider_slug del catalog) + metodo + instrumento.
  -- provider_slug es FK soft (no enforced para permitir providers nuevos
  -- antes del seed). Si payment_instrument_id se entrega, debe coincidir
  -- con provider_slug — validado en helper TS.
  provider_slug            TEXT,
  payment_method           TEXT CHECK (payment_method IN (
                             'bank_transfer',
                             'wire',
                             'paypal',
                             'wise',
                             'deel',
                             'global66',
                             'manual_cash',
                             'check',
                             'sii_pec',
                             'other'
                           )),
  payment_instrument_id    TEXT REFERENCES greenhouse_finance.accounts(account_id) ON DELETE SET NULL,
  -- Datos cuenta beneficiario (mask por defecto, reveal con capability).
  -- account_number_masked: lo que se muestra (•••• 1234).
  -- account_number_full: lo sensible (oculto a menos que capability + reveal).
  account_holder_name      TEXT,
  account_number_masked    TEXT,
  account_number_full      TEXT,
  bank_name                TEXT,
  routing_reference        TEXT,
  -- vault_ref: contrato futuro para tokenizar via vault externo.
  -- Si esta presente, account_number_full puede ser NULL (la fuente
  -- canonica es el vault).
  vault_ref                TEXT,
  -- Lifecycle
  status                   TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
                             'draft',
                             'pending_approval',
                             'active',
                             'superseded',
                             'cancelled'
                           )),
  active_from              DATE,
  active_to                DATE,
  superseded_by            TEXT REFERENCES greenhouse_finance.beneficiary_payment_profiles(profile_id) DEFERRABLE INITIALLY DEFERRED,
  -- Maker-checker
  require_approval         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by               TEXT NOT NULL,
  approved_by              TEXT,
  approved_at              TIMESTAMPTZ,
  cancelled_by             TEXT,
  cancelled_reason         TEXT,
  cancelled_at             TIMESTAMPTZ,
  -- Audit / metadata
  notes                    TEXT,
  metadata_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency canonica: solo 1 profile vivo por (space, beneficiary, currency).
-- Crear uno nuevo cuando ya existe activo → caller debe supersede el viejo.
CREATE UNIQUE INDEX IF NOT EXISTS beneficiary_payment_profiles_active_uniq
  ON greenhouse_finance.beneficiary_payment_profiles (
    COALESCE(space_id, '__no_space__'),
    beneficiary_type,
    beneficiary_id,
    currency
  )
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS beneficiary_payment_profiles_status_idx
  ON greenhouse_finance.beneficiary_payment_profiles (status);

CREATE INDEX IF NOT EXISTS beneficiary_payment_profiles_beneficiary_idx
  ON greenhouse_finance.beneficiary_payment_profiles (beneficiary_type, beneficiary_id, status);

CREATE INDEX IF NOT EXISTS beneficiary_payment_profiles_provider_idx
  ON greenhouse_finance.beneficiary_payment_profiles (provider_slug)
  WHERE provider_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS beneficiary_payment_profiles_space_idx
  ON greenhouse_finance.beneficiary_payment_profiles (space_id)
  WHERE space_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- Audit log dedicado para el modulo (mismo patron que
-- payment_instrument_admin_audit_log de TASK-697).
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.beneficiary_payment_profile_audit_log (
  audit_id                 TEXT PRIMARY KEY,
  profile_id               TEXT NOT NULL REFERENCES greenhouse_finance.beneficiary_payment_profiles(profile_id) ON DELETE CASCADE,
  action                   TEXT NOT NULL CHECK (action IN (
                             'created',
                             'updated',
                             'approved',
                             'superseded',
                             'cancelled',
                             'revealed_sensitive'
                           )),
  actor_user_id            TEXT NOT NULL,
  actor_email              TEXT,
  reason                   TEXT,
  diff_json                JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address               TEXT,
  user_agent               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beneficiary_payment_profile_audit_profile_idx
  ON greenhouse_finance.beneficiary_payment_profile_audit_log (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS beneficiary_payment_profile_audit_action_idx
  ON greenhouse_finance.beneficiary_payment_profile_audit_log (action, created_at DESC);

CREATE INDEX IF NOT EXISTS beneficiary_payment_profile_audit_actor_idx
  ON greenhouse_finance.beneficiary_payment_profile_audit_log (actor_user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- Trigger updated_at + maker-checker (defense in depth)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION greenhouse_finance.beneficiary_payment_profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beneficiary_payment_profiles_updated_at_trigger
  ON greenhouse_finance.beneficiary_payment_profiles;

CREATE TRIGGER beneficiary_payment_profiles_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.beneficiary_payment_profiles
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.beneficiary_payment_profiles_set_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_finance.assert_payment_profile_maker_checker()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo enforced cuando se transiciona a 'active' con require_approval=TRUE.
  -- Estados de borrador (draft, pending_approval) pueden ser editados por
  -- el maker. Cancelled/superseded no requieren maker-checker.
  IF NEW.require_approval = TRUE
     AND NEW.status = 'active'
     AND NEW.approved_by IS NOT NULL
     AND NEW.approved_by = NEW.created_by THEN
    RAISE EXCEPTION
      'TASK-749 maker-checker: approver (%) cannot equal creator (%) when require_approval=TRUE',
      NEW.approved_by, NEW.created_by
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS beneficiary_payment_profiles_maker_checker_trigger
  ON greenhouse_finance.beneficiary_payment_profiles;

CREATE TRIGGER beneficiary_payment_profiles_maker_checker_trigger
  BEFORE INSERT OR UPDATE ON greenhouse_finance.beneficiary_payment_profiles
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.assert_payment_profile_maker_checker();

-- ────────────────────────────────────────────────────────────────────
-- Comments canonicos
-- ────────────────────────────────────────────────────────────────────

COMMENT ON TABLE greenhouse_finance.beneficiary_payment_profiles IS
  'TASK-749 - Versioned payment profiles per beneficiary. Resolves payment route (provider_slug + payment_method + payment_instrument_id) for an obligation. Maker-checker enforced via trigger. Sensitive data (account_number_full, vault_ref) requires capability finance.payment_profiles.reveal_sensitive + audit log. See docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.';

COMMENT ON TABLE greenhouse_finance.beneficiary_payment_profile_audit_log IS
  'TASK-749 - Audit trail para cambios y reveal de datos sensibles. Replica patron payment_instrument_admin_audit_log (TASK-697).';

COMMENT ON COLUMN greenhouse_finance.beneficiary_payment_profiles.status IS
  'draft = borrador editable; pending_approval = esperando maker-checker; active = vigente (1 sola por space/beneficiary/currency); superseded = reemplazada via superseded_by; cancelled = anulada con motivo.';

COMMENT ON COLUMN greenhouse_finance.beneficiary_payment_profiles.account_number_full IS
  'Numero de cuenta completo. SOLO se devuelve si caller tiene capability finance.payment_profiles.reveal_sensitive. Default queries devuelven solo account_number_masked.';

COMMENT ON COLUMN greenhouse_finance.beneficiary_payment_profiles.vault_ref IS
  'Referencia opaca a vault externo (TASK-749 V1 placeholder). Cuando este presente, la fuente canonica es el vault y account_number_full puede ser NULL.';


-- Down Migration

DROP TRIGGER IF EXISTS beneficiary_payment_profiles_maker_checker_trigger ON greenhouse_finance.beneficiary_payment_profiles;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_payment_profile_maker_checker();
DROP TRIGGER IF EXISTS beneficiary_payment_profiles_updated_at_trigger ON greenhouse_finance.beneficiary_payment_profiles;
DROP FUNCTION IF EXISTS greenhouse_finance.beneficiary_payment_profiles_set_updated_at();
DROP TABLE IF EXISTS greenhouse_finance.beneficiary_payment_profile_audit_log;
DROP TABLE IF EXISTS greenhouse_finance.beneficiary_payment_profiles;
