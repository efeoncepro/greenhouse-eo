# TASK-791 — Contractor Invoice Assets + Greenhouse Uploader Contexts

## Delta 2026-05-29

- Desbloqueado por **TASK-790 ✅ complete**: el aggregate `greenhouse_hr.contractor_engagements` ya existe (módulo `src/lib/contractor-engagements/`). Las invoices/assets de esta task deben FK-ancla al `contractor_engagement_id` canónico. El `document_asset_id` se adjunta vía el uploader canónico (TASK-721) — no inventar bucket nuevo.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Complete (2026-05-30, develop)`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790` ✅ complete
- Branch: `develop` (operator instruction 2026-05-30: trabajar in-place en develop, no crear rama)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el uploader privado canonico de Greenhouse para contractor invoices, boletas, work evidence, provider invoices y payout statements, reutilizando `GreenhouseFileUploader`, `/api/assets/private`, `greenhouse_core.assets` y el bucket privado GCS existente.

## Why This Task Exists

Contractors generan invoices/boletas en distintos paises. Si Greenhouse acepta URLs libres o buckets paralelos, rompe audit, retention, tenant access, dedup y trazabilidad hacia Finance. El patron correcto ya existe desde `TASK-721`; falta agregar contextos y policy de acceso para contractor.

## Goal

- Agregar contextos de asset contractor/provider.
- Crear `contractor_invoice_assets` para soportes multiples.
- Hacer upload/download auditado por contractor, HR y Finance.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta `TASK-721`

Reglas obligatorias:

- No crear bucket/uploader/storage helper paralelo.
- No guardar `gs://`, signed URLs o URLs externas como contrato primario.
- Todo access debe pasar por `/api/assets/private/[assetId]`.

## Dependencies & Impact

### Depends on

- `TASK-790`.
- `TASK-721` completed pattern.

### Blocks / Impacts

- Blocks `TASK-792`, `TASK-793`, `TASK-796`.
- Impacts asset access policy and uploader context validation.

### Files owned

- `src/types/assets.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/app/api/assets/private/route.ts`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `migrations/**`

## Current Repo State

### Already exists

- Shared private asset uploader and GCS storage runtime.
- `provider_supporting_doc` retention class exists.

### Gap

- Contractor/provider invoice contexts are not in the type union, maps or upload allowlist.
- Asset access policy does not know contractor invoice aggregates.

## Scope

### Slice 1 — Asset contexts and retention

- Add `contractor_invoice_draft`, `contractor_invoice`, `contractor_work_evidence_draft`, `contractor_work_evidence`, `provider_invoice_draft`, `provider_invoice`, `provider_payout_statement`.
- Add retention classes needed by architecture.

### Slice 2 — Invoice asset association table

- Add `greenhouse_hr.contractor_invoice_assets` with asset role, artifact kind, source, country and uploader.

### Slice 3 — Upload/download access policy

- Allow contractor owner upload/download, HR review, Finance read/manage support docs and admin access.
- Keep provider statements hidden from contractor by default.

### Slice 4 — MIME policy

- Allow PDF/images by default.
- Allow XML/JSON only for structured tax artifacts and explicit contractor invoice contexts.
- Keep ZIP/executables out of V1.

## Payroll Non-Regression Guardrails (hard rules)

791 maneja assets de contractor/provider; no toca cálculo de nómina. Único riesgo: colisión de contextos/retention con artefactos payroll.

- **NUNCA** reusar los contextos `contractor_invoice*` / `provider_*` para recibos de nómina ni documentos de finiquito. Son retention classes y aggregates distintos (los recibos de payroll y finiquito viven en su propio dominio).
- **NUNCA** modificar contextos ni retention classes de assets payroll existentes al agregar los de contractor. Solo agregar; no mutar.
- **NUNCA** adjuntar un `contractor_invoice_asset` a un `payroll_entry`, `final_settlement_document` ni a un aggregate de nómina.

## Out of Scope

- Work submission approval.
- Payables creation.
- Provider API imports.

## Acceptance Criteria

- [x] Contractor invoice PDF/image can be uploaded as pending asset. — contexts `contractor_invoice_draft`/`contractor_work_evidence_draft` en `DRAFT_CONTEXT_VALUES` + `canUploadForContext` (self/HR/admin) + maps reuse `createPrivatePendingAsset`.
- [x] Asset can be attached to contractor invoice aggregate and audited. — `attachContractorInvoiceAsset` (tx: INSERT `contractor_invoice_assets` + `attachAssetToAggregate` → asset.uploaded/attached outbox + asset_access_log).
- [x] Contractor can access own asset; HR/Finance access follows policy. — `canAccessContractorInvoiceAsset` (self via ownerMemberId + HR/Finance/admin).
- [x] Provider statement is not visible to contractor by default. — `canAccessProviderSupportingAsset` (HR/Finance/admin only; NO self).
- [x] XML/JSON acceptance is restricted to tax structured artifacts. — `CONTEXT_EXTRA_MIME_TYPES` solo para `contractor_invoice_draft` + `provider_invoice_draft`.

## Closing Note (2026-05-30)

Implementado en `develop` (sin rama, instrucción del operador). 3 slices + close.

- **Slice 1** — `src/types/assets.ts` (+7 contexts, +3 drafts, +2 retention classes) + `greenhouse-assets.ts` maps (size/retention/prefix) + per-context MIME (`CONTEXT_EXTRA_MIME_TYPES`) + access policy (`canTenantAccessAsset` cases + 2 helpers) + upload policy (`route.ts`). NUNCA mutó contextos/retention payroll existentes (guardrail).
- **Slice 2** — migración `20260530203116605` `greenhouse_hr.contractor_invoice_assets` (append-only ledger, CHECK enums, UNIQUE(engagement,asset), anti-UPDATE/DELETE triggers, FK a `contractor_engagements` D-791-1 + `contractor_invoice_id` NULL forward-compat) + helper canónico `attachContractorInvoiceAsset` (patrón TASK-721 tx) + módulo puro `invoice-asset-contracts.ts` + 7 unit tests.
- **Slice 3** — signal `hr.contractor_invoice_assets.broken_evidence` (data_quality, moduleKey identity, steady=0) wired en `getReliabilityOverview`.

**Decisiones (Open Questions resueltas pre-execution):** D-791-1 anchor a `contractor_engagement_id` (NOT NULL) + `contractor_invoice_id` NULL forward-compat (TASK-792 agrega FK); D-791-2 access vía `hasRouteGroup`/`hasRoleCode` (patrón canónico de assets, NO nuevas capabilities `can()`); D-791-3 retention `contractor_invoice`+`contractor_work_evidence` nuevas, provider reusa `provider_supporting_doc`; D-791-4 XML/JSON solo invoice drafts; D-791-5 `provider_payout_statement` finance-only sin draft.

**Gates verdes:** tsc 0 · full lint 0 · `pnpm build` ✓ · `pnpm test` 5538 passed / 0 failed · `pnpm vitest run src/lib/payroll` 522 passed / 0 failed · DB defense-in-depth verificado live en tx rolled-back (UNIQUE 23505, CHECK 23514, anti-UPDATE/DELETE 23001) · signal live steady=0.

**Skills:** greenhouse-backend. (Reuso total de la infra TASK-721; sin bucket/uploader nuevo.)

**Pendiente (out of scope V1, desbloqueado):** TASK-792 (work submissions + `contractor_invoices` aggregate + FK desde `contractor_invoice_assets.contractor_invoice_id`), TASK-793 (payables → Finance), TASK-796 (self-service UI con `GreenhouseFileUploader contextType='contractor_invoice_draft'`).

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Focused tests for context validation and asset access.
- Manual upload smoke in a local/staging surface when UI exists.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
