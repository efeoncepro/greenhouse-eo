-- Up Migration
--
-- TASK-791 — Contractor Invoice Assets (Slice 2).
--
-- Tabla de asociación append-only entre el agregado ContractorEngagement
-- (TASK-790) y los assets privados canónicos (greenhouse_core.assets, TASK-721).
-- Soporta múltiples soportes por engagement: invoice/boleta PDF, XML tributario,
-- evidencia de trabajo, statements/payout de proveedor, FX receipt.
--
-- Decisiones canónicas (CLAUDE.md TASK-791):
--   - D-791-1 anchor: FK NOT NULL a contractor_engagements(contractor_engagement_id)
--     ON DELETE RESTRICT. `contractor_invoice_id` queda TEXT NULL sin FK
--     (forward-compat: TASK-792 crea `contractor_invoices` y agrega la FK).
--   - Append-only ledger de attachments (triggers anti-UPDATE/anti-DELETE).
--     Reemplazar un soporte = nuevo asset + nueva fila; no se sobreescribe el
--     documento histórico (arch doc "Contractor Invoice Upload / Asset Contract").
--   - El asset se adjunta vía `attachAssetToAggregate` (status pending→attached)
--     en la MISMA transacción que el INSERT de esta fila (patrón TASK-721).
--   - NUNCA reusar para recibos de nómina ni finiquito (retention/aggregate
--     distintos — guardrail payroll TASK-791).

CREATE SEQUENCE IF NOT EXISTS greenhouse_hr.seq_contractor_invoice_asset_public_id;

CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_invoice_assets (
  invoice_asset_id          TEXT PRIMARY KEY,
  public_id                 TEXT NOT NULL UNIQUE,
  contractor_engagement_id  TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_engagements(contractor_engagement_id) ON DELETE RESTRICT,
  -- Forward-compat: TASK-792 crea greenhouse_hr.contractor_invoices y agrega la FK.
  contractor_invoice_id     TEXT,
  asset_id                  TEXT NOT NULL
    REFERENCES greenhouse_core.assets(asset_id) ON DELETE RESTRICT,
  asset_role                TEXT NOT NULL
    CHECK (asset_role IN (
      'invoice_pdf',
      'tax_xml',
      'tax_certificate',
      'work_evidence',
      'provider_statement',
      'payout_receipt',
      'fx_receipt',
      'other_supporting_doc'
    )),
  artifact_kind             TEXT NOT NULL
    CHECK (artifact_kind IN (
      'human_readable',
      'tax_structured',
      'provider_report',
      'payment_proof',
      'evidence'
    )),
  source                    TEXT NOT NULL
    CHECK (source IN (
      'contractor_upload',
      'hr_upload_on_behalf',
      'finance_upload_on_behalf',
      'provider_import',
      'system_generated'
    )),
  country_code              TEXT,
  uploaded_by_user_id       TEXT,
  metadata_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un asset se adjunta una sola vez por engagement (idempotencia / anti-dup).
  CONSTRAINT contractor_invoice_assets_engagement_asset_unique
    UNIQUE (contractor_engagement_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_invoice_assets_engagement
  ON greenhouse_hr.contractor_invoice_assets (contractor_engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_invoice_assets_invoice
  ON greenhouse_hr.contractor_invoice_assets (contractor_invoice_id)
  WHERE contractor_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_invoice_assets_asset
  ON greenhouse_hr.contractor_invoice_assets (asset_id);

-- Append-only enforcement (ledger de attachments).
CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_invoice_assets is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_invoice_assets is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_contractor_invoice_assets_no_update
BEFORE UPDATE ON greenhouse_hr.contractor_invoice_assets
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_update();

CREATE TRIGGER trg_contractor_invoice_assets_no_delete
BEFORE DELETE ON greenhouse_hr.contractor_invoice_assets
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_delete();

-- Grants (ownership queda en greenhouse_ops, dueño canónico).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_invoice_assets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_invoice_assets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_invoice_assets TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_invoice_asset_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_invoice_asset_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_invoice_asset_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_invoice_assets_prevent_delete() TO greenhouse_runtime;

-- Anti pre-up-marker bug guard (CLAUDE.md migration markers).
DO $$
DECLARE
  has_table   boolean;
  has_unique  boolean;
  has_no_del  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_invoice_assets'
  ) INTO has_table;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_invoice_assets_engagement_asset_unique'
  ) INTO has_unique;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_hr'
      AND p.proname = 'contractor_invoice_assets_prevent_delete'
  ) INTO has_no_del;

  IF NOT has_table THEN
    RAISE EXCEPTION 'TASK-791 anti pre-up-marker: greenhouse_hr.contractor_invoice_assets was NOT created.';
  END IF;
  IF NOT has_unique THEN
    RAISE EXCEPTION 'TASK-791 anti pre-up-marker: engagement_asset unique constraint was NOT created.';
  END IF;
  IF NOT has_no_del THEN
    RAISE EXCEPTION 'TASK-791 anti pre-up-marker: append-only delete trigger fn was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TRIGGER IF EXISTS trg_contractor_invoice_assets_no_delete ON greenhouse_hr.contractor_invoice_assets;
DROP TRIGGER IF EXISTS trg_contractor_invoice_assets_no_update ON greenhouse_hr.contractor_invoice_assets;

DROP FUNCTION IF EXISTS greenhouse_hr.contractor_invoice_assets_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_invoice_assets_prevent_update();

DROP TABLE IF EXISTS greenhouse_hr.contractor_invoice_assets;

DROP SEQUENCE IF EXISTS greenhouse_hr.seq_contractor_invoice_asset_public_id;
