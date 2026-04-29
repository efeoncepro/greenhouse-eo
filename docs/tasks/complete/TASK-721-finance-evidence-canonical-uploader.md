# TASK-721 — Finance evidence canonical uploader (reconciliation + OTB)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Cerrada 2026-04-29`
- Domain: `finance`
- Branch: `task/TASK-721-finance-evidence-canonical-uploader`

## Summary

El drawer "Declarar conciliación banco ↔ Greenhouse" pide la evidencia (cartola/screenshot) como un text input libre con path/URL. Eso permite declarar referencias a archivos que no existen en ningún storage compartido — la columna `source_evidence_ref` apunta al vacío, la auditoría futura no puede reproducir el snapshot, y TASK-719 (verificación OTB Global66) no puede ejecutarse con disciplina.

Solución estructural: reusar la infraestructura canónica de `greenhouse_core.assets` (bucket privado, schema, audit log, outbox) agregando contexts `finance_reconciliation_evidence_draft` / `finance_reconciliation_evidence` y wireando `attachAssetToAggregate` al snapshot de conciliación. UI usa `GreenhouseFileUploader` que ya existe.

## Why This Task Exists

- `evidence_refs` text libre = mentira potencial. Operador escribe `data/bank/foo.png` y nadie verifica que exista.
- Inconsistencia con TASK-719: el detector `openingTrialBalancesWithoutEvidence` no puede certificar nada si la columna admite strings inventados.
- Cualquier auditor (SII, contador externo, banco) requiere PDF real con timestamp + hash.
- Patrón asset canónico ya existe (HR leave, purchase orders, certifications) — sólo finance estaba sin uploader real.

## Goal

- Nuevos contexts `finance_reconciliation_evidence_draft` + `finance_reconciliation_evidence`
- Bucket privado dedicado: `greenhouse-private-assets-{env}` (ya existe — reuse)
- Columna `content_hash` en `assets` para dedup idempotente
- Columna `evidence_asset_id` FK en `account_reconciliation_snapshots`
- API endpoint `/api/assets/private` acepta el nuevo context con permisos finance
- Helper `findAssetByContentHash` para dedup
- UI drawer reemplaza text input por `GreenhouseFileUploader`
- Detector `task721.reconciliationSnapshotsWithBrokenEvidence`
- Tests cubriendo upload + dedup + attach + detector

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- TASK-704 (account_reconciliation_snapshots schema)
- TASK-703 (OTB cascade-supersede — beneficiario futuro de mismo pattern)
- TASK-719 (OTB Global66 verification — depende estructuralmente de esta task)

Reglas obligatorias:

- Cero text-input libre para evidence en flujos nuevos
- Cada upload genera fila en `assets` + entrada en `asset_access_log` + outbox `asset.uploaded`
- Dedup por content_hash: same SHA256 = reuse asset, no upload duplicado
- Backward-compat: `source_evidence_ref` text se mantiene para audit histórico, pero todo flujo nuevo popula `evidence_asset_id`
- Detector flag rows con `evidence_asset_id` apuntando a asset deleted/missing

## Dependencies & Impact

### Depends on

- `greenhouse_core.assets` schema (existe)
- `GreenhouseFileUploader` component (existe)
- `createPrivatePendingAsset` + `attachAssetToAggregate` helpers (existen)
- Bucket `greenhouse-private-assets-{env}` (existe via `getGreenhousePrivateAssetsBucket`)

### Blocks / Impacts

- TASK-719 (OTB Global66 verification) — desbloquea evidence pattern
- Cualquier flujo futuro de evidence finance (loan declarations, factoring contracts, period closings)

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-721-finance-evidence-asset-link.sql`
- `src/types/assets.ts` (extend contexts)
- `src/lib/storage/greenhouse-assets.ts` (extend dictionaries + content_hash)
- `src/lib/finance/reconciliation/snapshots.ts` (accept evidenceAssetId)
- `src/app/api/assets/private/route.ts` (permissions)
- `src/app/api/finance/reconciliation/snapshots/route.ts` (accept new field)
- `src/views/greenhouse/finance/drawers/DeclareReconciliationDrawer.tsx` (UI)
- `src/lib/finance/ledger-health.ts` (detector)
- `src/lib/finance/__tests__/reconciliation-evidence.test.ts` (new)
- `src/lib/finance/__tests__/ledger-health-task721.test.ts` (new)

## Scope

### Slice 1 — Schema + types

- Migration: `assets.content_hash TEXT` + index. `account_reconciliation_snapshots.evidence_asset_id TEXT REFERENCES assets(asset_id)`.
- Extend `GreenhouseAssetContext` with `finance_reconciliation_evidence_draft` + `finance_reconciliation_evidence`
- Extend `CONTEXT_RETENTION_CLASS`, `CONTEXT_PREFIX`, `MAX_PRIVATE_UPLOAD_BYTES_BY_CONTEXT`, `DraftUploadContext`
- New retention class `finance_reconciliation_evidence`

### Slice 2 — Upload helper + dedup

- `findAssetByContentHash(hash)` reader
- `createPrivatePendingAsset` extendido para computar SHA-256 y reusar asset existente si match
- Update `attachAssetToAggregate` para aceptar nuevos contexts

### Slice 3 — API permissions + reconciliation wiring

- `/api/assets/private/route.ts`: permitir `finance_reconciliation_evidence_draft` con route group `finance` o `efeonce_admin`
- `declareReconciliationSnapshot` acepta `evidenceAssetId?` opcional; en transacción atómica: insert snapshot + `attachAssetToAggregate(assetId, 'finance_reconciliation_evidence', snapshotId)`
- Outbox event `finance.reconciliation_snapshot.declared` lleva `evidenceAssetId` si existe

### Slice 4 — UI uploader

- Reemplazar text input en `DeclareReconciliationDrawer` por `<GreenhouseFileUploader contextType='finance_reconciliation_evidence_draft'>`
- Acepta PDF, PNG, JPG, WEBP. Max 10MB.
- En submit, envía `evidenceAssetId: uploadedFile?.assetId` al endpoint
- Si el operador cierra sin submit, opcional: limpiar el asset draft (o dejarlo para garbage-collect via TTL job)

### Slice 5 — Detector + tests

- `task721.reconciliationSnapshotsWithBrokenEvidence`: count rows con `evidence_asset_id IS NOT NULL` y asset row con `status='deleted'` o no existe
- Healthy = false si > 0
- 6+ tests cubriendo upload + dedup + attach + detector + permissions

## Out of Scope

- Migration retroactiva de `source_evidence_ref` text legacy → `evidence_asset_id`. Histórico queda como text audit.
- OCR del PDF para auto-fill saldo. Idea válida pero out-of-scope v1.
- E-signature / firma criptográfica del PDF.
- Versionado de evidence (cada upload es inmutable; nuevo upload = nuevo asset).
- TASK-719 OTB Global66 (task aparte, reusará este pattern).

## Acceptance Criteria

- [ ] Migration aplicada (assets.content_hash + reconciliation_snapshots.evidence_asset_id)
- [ ] Nuevos contexts en types + storage helpers
- [ ] `findAssetByContentHash` con paridad SHA-256 TS
- [ ] API endpoint `/api/assets/private` acepta finance context con permisos correctos
- [ ] `declareReconciliationSnapshot` atómicamente crea snapshot + attach asset
- [ ] UI drawer usa GreenhouseFileUploader
- [ ] Detector `task721.reconciliationSnapshotsWithBrokenEvidence` en ledger-health
- [ ] Tests pass (10+ tests)
- [ ] Lint + tsc clean
- [ ] Manual smoke: subir cartola en /finance/bank, ver gs:// path en DB

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/reconciliation-evidence.test.ts`
- `pnpm test src/lib/finance/__tests__/ledger-health-task721.test.ts`
- Manual: subir cartola Santander, declarar conciliación, verificar `evidence_asset_id` en PG + asset accessible via download URL

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] CLAUDE.md sección actualizada con regla canónica de finance evidence
- [ ] Detector `task721.reconciliationSnapshotsWithBrokenEvidence = 0` confirmado

## Follow-ups

- TASK-719 OTB Global66 — reusa este pattern para evidencia de OTBs
- Garbage collect job para `evidence_draft` orphans > 24h sin attach (cleanup)
- Extender pattern a loan declarations / factoring / period closings cuando emerjan
