-- TASK-721 — Finance evidence canonical uploader.
--
-- Cambios:
-- 1. greenhouse_core.assets.content_hash TEXT — SHA-256 del contenido binario.
--    Permite dedup idempotente: mismo hash = reuse asset existente, no duplicar
--    upload al bucket. Nullable para backward-compat con assets legacy.
-- 2. greenhouse_finance.account_reconciliation_snapshots.evidence_asset_id TEXT
--    REFERENCES greenhouse_core.assets(asset_id). Reemplaza el text-input libre
--    `source_evidence_ref` para flujos nuevos. La columna text se mantiene para
--    backward-compat / fallback manual.

-- Up Migration

ALTER TABLE greenhouse_core.assets
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_assets_content_hash
  ON greenhouse_core.assets (content_hash)
  WHERE content_hash IS NOT NULL AND status <> 'deleted';

COMMENT ON COLUMN greenhouse_core.assets.content_hash IS
  'TASK-721 — SHA-256 hex del contenido binario. Usado para dedup idempotente: createPrivatePendingAsset busca existing asset con mismo hash antes de subir. Nullable para assets legacy pre-TASK-721.';

ALTER TABLE greenhouse_finance.account_reconciliation_snapshots
  ADD COLUMN IF NOT EXISTS evidence_asset_id TEXT
  REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recon_snapshots_evidence_asset
  ON greenhouse_finance.account_reconciliation_snapshots (evidence_asset_id)
  WHERE evidence_asset_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.account_reconciliation_snapshots.evidence_asset_id IS
  'TASK-721 — FK a greenhouse_core.assets. Reemplaza el text-input libre source_evidence_ref para flujos nuevos. ON DELETE SET NULL para que borrado del asset no rompa el snapshot, pero el detector task721.reconciliationSnapshotsWithBrokenEvidence flag-eará el caso.';

-- Down Migration

ALTER TABLE greenhouse_finance.account_reconciliation_snapshots
  DROP COLUMN IF EXISTS evidence_asset_id;

DROP INDEX IF EXISTS greenhouse_core.idx_assets_content_hash;
DROP INDEX IF EXISTS greenhouse_finance.idx_recon_snapshots_evidence_asset;

ALTER TABLE greenhouse_core.assets
  DROP COLUMN IF EXISTS content_hash;
