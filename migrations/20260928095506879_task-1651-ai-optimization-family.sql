-- Up Migration

-- TASK-1651-A — habilita AI Optimization sin aflojar el allowlist del ledger.
ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_family_check;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_family_check
  CHECK (family IN ('serp', 'labs', 'backlinks', 'onpage', 'domain', 'ai_optimization')) NOT VALID;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  VALIDATE CONSTRAINT seo_provider_spend_daily_family_check;

DO $$
DECLARE
  family_check text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO family_check
    FROM pg_constraint
   WHERE conname = 'seo_provider_spend_daily_family_check'
     AND conrelid = 'greenhouse_growth.seo_provider_spend_daily'::regclass;

  IF family_check IS NULL OR family_check NOT LIKE '%ai_optimization%' THEN
    RAISE EXCEPTION 'TASK-1651: el CHECK de family no contiene ai_optimization.';
  END IF;
END
$$;

-- Down Migration

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM greenhouse_growth.seo_provider_spend_daily
     WHERE family = 'ai_optimization'
  ) THEN
    RAISE EXCEPTION 'TASK-1651 down: existen filas ai_optimization; revertir el CHECK perderia una identidad de gasto real.';
  END IF;
END
$$;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  DROP CONSTRAINT IF EXISTS seo_provider_spend_daily_family_check;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  ADD CONSTRAINT seo_provider_spend_daily_family_check
  CHECK (family IN ('serp', 'labs', 'backlinks', 'onpage', 'domain')) NOT VALID;

ALTER TABLE greenhouse_growth.seo_provider_spend_daily
  VALIDATE CONSTRAINT seo_provider_spend_daily_family_check;
