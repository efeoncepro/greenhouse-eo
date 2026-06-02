-- Up Migration

-- TASK-990 Slice 4 — Cross-country fiscal identity matching.
--
-- When a Nubox export invoice (DTE 110/111/112) carries a counterparty tax id
-- (Mexican RFC, e.g. Pinturas Berel `PBE970101718`) that the canonical resolver
-- (`buildNuboxOrgByRutMap` — keyed by `organizations.tax_id`, normalized RUT or
-- RFC) cannot match to an organization, the export sale is an ORPHAN. Rather
-- than silently projecting income with no organization (overlay arch #1 — never
-- a parallel identity), the orphan is captured here for operator review.
--
-- The operator resolves an orphan by linking it to the canonical organization
-- (gated by capability `finance.nubox_export.review_disposition`) or dismissing
-- it. Name similarity is candidate evidence only (client_trade_name) — NEVER
-- write authority. The audit of the disposition action is the append-only
-- outbox event `finance.nubox_export.rfc_disposition_resolved v1`.

CREATE TABLE IF NOT EXISTS greenhouse_finance.nubox_export_rfc_dispositions (
  disposition_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nubox_sale_id            TEXT NOT NULL,
  dte_type_code            TEXT,
  rfc_raw                  TEXT NOT NULL,
  rfc_normalized           TEXT NOT NULL,
  client_trade_name        TEXT,
  foreign_total_amount     NUMERIC(18, 2),
  foreign_currency_code    TEXT,
  functional_total_amount_clp NUMERIC(18, 0),
  status                   TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'resolved', 'dismissed')),
  resolved_organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  resolution_reason        TEXT,
  resolved_by_user_id      TEXT,
  resolved_at              TIMESTAMPTZ,
  first_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A resolved disposition MUST carry an organization; a terminal disposition
  -- (resolved or dismissed) MUST carry a reason >= 10 chars. Pending carries none.
  CONSTRAINT nubox_export_rfc_disposition_resolved_requires_org
    CHECK (status <> 'resolved' OR resolved_organization_id IS NOT NULL),
  CONSTRAINT nubox_export_rfc_disposition_terminal_requires_reason
    CHECK (status = 'pending_review' OR (resolution_reason IS NOT NULL AND char_length(resolution_reason) >= 10))
);

-- One disposition row per export sale (idempotent capture re-touches last_seen_at).
CREATE UNIQUE INDEX IF NOT EXISTS nubox_export_rfc_dispositions_sale_uniq
  ON greenhouse_finance.nubox_export_rfc_dispositions (nubox_sale_id);

-- Hot path for the reliability signal (count pending) + operator queue.
CREATE INDEX IF NOT EXISTS nubox_export_rfc_dispositions_pending_idx
  ON greenhouse_finance.nubox_export_rfc_dispositions (status, last_seen_at DESC)
  WHERE status = 'pending_review';

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.nubox_export_rfc_dispositions TO greenhouse_runtime;

-- Capability seed (TASK-873 + TASK-935 invariant: registry seed MUST ship with
-- the runtime.ts grant in the same PR, enforced by capability-grant-coverage).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES (
  'finance.nubox_export.review_disposition',
  'finance',
  ARRAY['update'],
  ARRAY['tenant'],
  'TASK-990 — Resolver/descartar la disposición de una factura de exportación Nubox (DTE 110/111/112) cuyo RFC no matcheó automáticamente a una organización. Link a org canónica o dismiss con razón >=10 chars. FINANCE_ADMIN + EFEONCE_ADMIN.'
)
ON CONFLICT (capability_key) DO NOTHING;

-- Anti pre-up-marker bug guard (TASK-838 pattern) — abort if DDL/seed did not land.
DO $$
DECLARE table_exists BOOLEAN; capability_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'nubox_export_rfc_dispositions'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-990 Slice 4 anti pre-up-marker: greenhouse_finance.nubox_export_rfc_dispositions was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT COUNT(*) INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'finance.nubox_export.review_disposition';

  IF capability_count < 1 THEN
    RAISE EXCEPTION 'TASK-990 Slice 4 anti pre-up-marker: capability finance.nubox_export.review_disposition NOT registered.';
  END IF;
END
$$;

-- Down Migration

-- Capability rows are append-only governance (TASK-840): mark deprecated, do not DELETE.
UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW(), updated_at = NOW()
WHERE capability_key = 'finance.nubox_export.review_disposition';

DROP TABLE IF EXISTS greenhouse_finance.nubox_export_rfc_dispositions;
