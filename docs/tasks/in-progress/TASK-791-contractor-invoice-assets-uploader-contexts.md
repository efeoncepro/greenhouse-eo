# TASK-791 — Contractor Invoice Assets + Greenhouse Uploader Contexts

## Delta 2026-05-29

- Desbloqueado por **TASK-790 ✅ complete**: el aggregate `greenhouse_hr.contractor_engagements` ya existe (módulo `src/lib/contractor-engagements/`). Las invoices/assets de esta task deben FK-ancla al `contractor_engagement_id` canónico. El `document_asset_id` se adjunta vía el uploader canónico (TASK-721) — no inventar bucket nuevo.

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Implementacion`
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

- [ ] Contractor invoice PDF/image can be uploaded as pending asset.
- [ ] Asset can be attached to contractor invoice aggregate and audited.
- [ ] Contractor can access own asset; HR/Finance access follows policy.
- [ ] Provider statement is not visible to contractor by default.
- [ ] XML/JSON acceptance is restricted to tax structured artifacts.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Focused tests for context validation and asset access.
- Manual upload smoke in a local/staging surface when UI exists.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
