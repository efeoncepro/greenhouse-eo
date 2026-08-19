-- Up Migration

-- TASK-1745 — provider lifecycle is distinct from the outbound dispatch state.
-- `email_deliveries.status = sent` remains "accepted by Resend" so this
-- additive migration cannot interfere with the retry/sender state machine.

-- `email_deliveries` es la tabla del correo global: cualquier lock largo acá detiene TODO envío
-- transaccional del portal, no sólo el de hiring. Los CHECK entran NOT VALID para no escanear la
-- tabla entera; el VALIDATE va en `scripts/operations/task-1745-create-provider-status-index.sql`
-- porque dentro de esta transacción NO compraría nada: el ACCESS EXCLUSIVE del ADD CONSTRAINT se
-- retiene hasta el COMMIT, así que el scan correría bajo el lock fuerte igual. El índice, por lo
-- mismo, se crea CONCURRENTLY desde ese script.
SET lock_timeout = '3s';

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_source TEXT,
  ADD COLUMN IF NOT EXISTS provider_observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_delayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_provider_status_check CHECK (
    provider_status IS NULL OR provider_status IN (
      'sent',
      'delivered',
      'delivery_delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed'
    )
  ) NOT VALID;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_source_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  ADD CONSTRAINT email_deliveries_provider_status_source_check CHECK (
    provider_status_source IS NULL OR provider_status_source IN ('webhook', 'reconciliation')
  ) NOT VALID;

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.provider_status IS
  'Latest observed Resend lifecycle fact; signed webhook evidence supersedes provisional reconciliation observations.';

COMMENT ON COLUMN greenhouse_notifications.email_deliveries.provider_event_created_at IS
  'Provider timestamp used to prevent an older, out-of-order event from replacing a newer lifecycle fact.';

-- `idx_email_deliveries_provider_status` NO se crea acá: un CREATE INDEX no concurrente toma
-- SHARE lock y bloquea todo INSERT/UPDATE de correo mientras construye. Se crea CONCURRENTLY
-- desde `scripts/operations/task-1745-create-provider-status-index.sql`, fuera de la transacción.

CREATE TABLE IF NOT EXISTS greenhouse_notifications.email_provider_events (
  provider_event_id TEXT PRIMARY KEY,
  resend_id TEXT,
  delivery_id UUID REFERENCES greenhouse_notifications.email_deliveries(delivery_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL DEFAULT 'webhook',
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  provider_created_at TIMESTAMPTZ,
  bounce_type TEXT,
  click_origin TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  reason_code TEXT,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempted_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,

  CONSTRAINT email_provider_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processed', 'ignored', 'dead_letter')
  ),
  CONSTRAINT email_provider_events_source_check CHECK (
    event_source IN ('webhook', 'reconciliation')
  ),
  CONSTRAINT email_provider_events_evidence_check CHECK (
    (event_source = 'webhook' AND signature_verified = TRUE AND provider_created_at IS NOT NULL)
    OR
    (event_source = 'reconciliation' AND signature_verified = FALSE AND provider_created_at IS NULL)
  )
);

COMMENT ON TABLE greenhouse_notifications.email_provider_events IS
  'Normalized, token-free Resend evidence inbox. Signed webhooks use svix-id; reconciliation observations use a namespaced internal key.';

CREATE INDEX IF NOT EXISTS idx_email_provider_events_pending
  ON greenhouse_notifications.email_provider_events (next_attempt_at, first_received_at)
  WHERE processing_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_provider_events_resend_id
  ON greenhouse_notifications.email_provider_events (resend_id, provider_created_at DESC)
  WHERE resend_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON greenhouse_notifications.email_provider_events TO greenhouse_runtime;

-- Guard anti pre-up-marker (CLAUDE.md §Database — Migration markers). Toda esta migración está
-- escrita con `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, que son no-ops SILENCIOSOS: si los
-- markers estuvieran invertidos o el DDL no se ejecutara, nada fallaría y la migración quedaría
-- registrada como aplicada. El guard cubre lo que el Down deshace MÁS lo que el runtime necesita
-- y el Down no lista (el GRANT y los CHECK, que cascadean o se preservan).
DO $$
DECLARE provider_column_count integer; events_table_count integer;
  check_constraint_count integer; events_index_count integer; runtime_grant_count integer;
BEGIN
  SELECT COUNT(*) INTO provider_column_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_notifications' AND table_name = 'email_deliveries'
    AND column_name IN ('provider_status', 'provider_status_source', 'provider_observed_at',
      'provider_event_id', 'provider_event_created_at', 'delivery_delayed_at', 'failed_at',
      'suppressed_at');

  SELECT COUNT(*) INTO events_table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_notifications' AND table_name = 'email_provider_events';

  -- Sin `convalidated`: el VALIDATE corre después, en el script operacional. Acá sólo se exige
  -- que los CHECK EXISTAN; que estén validados lo verifica el readback de ese script.
  SELECT COUNT(*) INTO check_constraint_count FROM pg_constraint
  WHERE conname IN ('email_deliveries_provider_status_check',
      'email_deliveries_provider_status_source_check')
    AND conrelid = 'greenhouse_notifications.email_deliveries'::regclass
    AND contype = 'c';

  SELECT COUNT(*) INTO events_index_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_notifications'
    AND indexname IN ('idx_email_provider_events_pending', 'idx_email_provider_events_resend_id');

  SELECT COUNT(*) INTO runtime_grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'greenhouse_notifications' AND table_name = 'email_provider_events'
    AND grantee = 'greenhouse_runtime' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE');

  IF provider_column_count <> 8 OR events_table_count <> 1 OR check_constraint_count <> 2
     OR events_index_count <> 2 OR runtime_grant_count <> 3 THEN
    RAISE EXCEPTION 'TASK-1745 anti pre-up-marker check failed: provider_columns=%, events_table=%, validated_checks=%, events_indexes=%, runtime_grants=%',
      provider_column_count, events_table_count, check_constraint_count, events_index_count, runtime_grant_count;
  END IF;
END
$$;

-- `SET` (no `SET LOCAL`) sobrevive a esta migración dentro de la transacción compartida del
-- runner: sin este RESET, las migraciones siguientes heredarían el lock_timeout sin declararlo.
RESET lock_timeout;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_notifications.email_provider_events;

DROP INDEX IF EXISTS greenhouse_notifications.idx_email_deliveries_provider_status;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_provider_status_source_check;

ALTER TABLE greenhouse_notifications.email_deliveries
  DROP COLUMN IF EXISTS suppressed_at,
  DROP COLUMN IF EXISTS failed_at,
  DROP COLUMN IF EXISTS delivery_delayed_at,
  DROP COLUMN IF EXISTS provider_event_created_at,
  DROP COLUMN IF EXISTS provider_event_id,
  DROP COLUMN IF EXISTS provider_observed_at,
  DROP COLUMN IF EXISTS provider_status_source,
  DROP COLUMN IF EXISTS provider_status;
