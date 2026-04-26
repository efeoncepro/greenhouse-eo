# TASK-663 — Nubox Durable PDF/XML Artifact Persistence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`, `data`
- Blocked by: `TASK-662 recommended`
- Branch: `task/TASK-663-nubox-durable-pdf-xml-artifacts`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Persistir PDF/XML Nubox en GCS usando `greenhouse_core.assets`, vinculándolos a
income, expenses, quotes o document graph. Nubox live URLs quedan como metadata,
no como única fuente durable.

## Why This Task Exists

Hoy Finance descarga PDF/XML desde Nubox en vivo. Eso rompe trazabilidad y deja
HubSpot artifacts, auditoría y replay dependientes de disponibilidad externa.

## Goal

- Crear flujo durable para PDF/XML Nubox.
- Reusar shared private assets registry.
- Preparar attachment downstream hacia HubSpot invoice/deal/company.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

## Normative Docs

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.assets`
- `src/lib/storage/greenhouse-assets.ts`
- `src/lib/finance/quote-share/quote-pdf-asset.ts`
- `src/lib/nubox/client.ts`
- `src/lib/finance/income-hubspot/**`

### Blocks / Impacts

- HubSpot invoice artifact attach.
- Finance audit trails.
- Nubox replay/backfill.

### Files owned

- `src/lib/nubox/**`
- `src/lib/storage/**`
- `src/lib/finance/income-hubspot/**`
- `src/app/api/finance/**/dte-*`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `getNuboxSalePdf`, `getNuboxSaleXml`, purchase PDF helper.
- Shared asset registry and private asset helpers.
- Quote PDF asset cache pattern.
- Reserved HubSpot artifact events/columns.

### Gap

- No durable Nubox PDF/XML asset rows.
- No artifact association table for Nubox documents.
- Purchase XML support is not confirmed.

## Scope

### Slice 1 — Artifact model

- Decide aggregate ownership and association shape.
- Preserve source URL and Nubox document IDs as metadata.

### Slice 2 — Persistence helper

- Store PDF/XML in private assets bucket.
- Upsert asset metadata idempotently.

### Slice 3 — API/read compatibility

- Existing DTE routes prefer durable assets and fallback to Nubox live.

## Out of Scope

- Full historical backfill unless explicitly scoped.
- New visible UI beyond existing download routes.

## Acceptance Criteria

- [ ] PDF/XML can be served from durable assets.
- [ ] Live Nubox downloads remain fallback, not canonical dependency.
- [ ] HubSpot artifact attach has a stable asset source.

## Verification

- `pnpm lint`
- `pnpm test`
- focused route smoke for DTE PDF/XML.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Docs and Handoff updated.

## Follow-ups

- Historical backfill policy if needed.
