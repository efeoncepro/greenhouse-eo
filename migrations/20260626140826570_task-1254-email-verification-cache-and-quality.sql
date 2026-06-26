-- Up Migration

-- TASK-1254 — Email verification: cache de veredictos (Tier 1 + Tier 2) + columnas de
-- calidad del lead en form_submission. Additive, prod-safe (todo nullable / IF NOT EXISTS).
-- El gate corporativo + el provider Tier 2 nacen apagados por flag; estas tablas/columnas
-- quedan inertes hasta GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED.

-- 1. email_verification_cache — un veredicto cacheado por hash de email (NUNCA email crudo).
--    El hash es sha256 salteado del email normalizado/dedup (mismo salt-pattern que el
--    abuse-guard). TTL vía expires_at: evita re-facturar el provider pago. Upsert ON CONFLICT.
CREATE TABLE IF NOT EXISTS greenhouse_growth.email_verification_cache (
  email_hash       TEXT PRIMARY KEY,
  domain           TEXT,
  is_corporate     BOOLEAN NOT NULL DEFAULT FALSE,
  is_disposable    BOOLEAN NOT NULL DEFAULT FALSE,
  is_role_based    BOOLEAN NOT NULL DEFAULT FALSE,
  is_free_provider BOOLEAN NOT NULL DEFAULT FALSE,
  -- Veredicto de deliverability del Tier 2 (provider pago). 'unknown' cuando solo corrió
  -- Tier 1, el provider está OFF, o el circuit breaker degradó.
  deliverable      TEXT NOT NULL DEFAULT 'unknown'
                     CHECK (deliverable IN ('deliverable', 'undeliverable', 'risky', 'unknown')),
  -- Hasta qué tier se resolvió el veredicto cacheado.
  verified_tier    TEXT NOT NULL DEFAULT 'tier1' CHECK (verified_tier IN ('tier1', 'tier2')),
  -- Identificador del provider que produjo el veredicto Tier 2 ('noop' mientras no haya
  -- provider real; nombre del provider cuando se enchufe). NUNCA payload crudo del provider.
  provider         TEXT NOT NULL DEFAULT 'tier1_only',
  verified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verification_cache_expires_idx
  ON greenhouse_growth.email_verification_cache (expires_at);

-- 2. form_submission — columnas de calidad del lead (nullable, set por el dispatcher/submit).
--    email_quality = veredicto resumido para downstream (HubSpot handoff, scoring).
--    email_domain_class = clasificación de dominio Tier 1 para segmentar sin re-parsear.
ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS email_quality TEXT
    CHECK (email_quality IN ('verified', 'suspect', 'unknown'));

ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS email_domain_class TEXT
    CHECK (email_domain_class IN ('corporate', 'personal', 'disposable'));

-- 3. Anti pre-up-marker bug guard (ISSUE-068): aborta si los objetos no quedaron creados.
DO $$
DECLARE
  cache_exists boolean;
  quality_col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_growth' AND table_name = 'email_verification_cache'
  ) INTO cache_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_growth'
      AND table_name = 'form_submission'
      AND column_name = 'email_quality'
  ) INTO quality_col_exists;

  IF NOT cache_exists THEN
    RAISE EXCEPTION 'TASK-1254 anti pre-up-marker: email_verification_cache NOT created. Markers may be inverted.';
  END IF;

  IF NOT quality_col_exists THEN
    RAISE EXCEPTION 'TASK-1254 anti pre-up-marker: form_submission.email_quality NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- 4. Ownership + GRANTs (espeja TASK-1229 form_submission).
ALTER TABLE greenhouse_growth.email_verification_cache OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.email_verification_cache TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.email_verification_cache TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.email_verification_cache TO greenhouse_migrator_user;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.email_verification_cache_expires_idx;
DROP TABLE IF EXISTS greenhouse_growth.email_verification_cache;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS email_domain_class;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS email_quality;