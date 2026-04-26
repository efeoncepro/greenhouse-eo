# TASK-665 — Nubox Tax Graph & VAT Data Quality Enrichment

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
- Branch: `task/TASK-665-nubox-tax-graph-vat-data-quality`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Promover evidencia tributaria Nubox avanzada hacia el contrato canónico de
Finance sin reimplementar el VAT ledger. El foco es fidelity: fields Nubox,
line/reference evidence y data quality contra posición IVA.

## Why This Task Exists

TASK-531/532/533 ya dejaron snapshots, recoverability y VAT monthly position.
Nubox V2 necesita conectar mejor los campos tributarios del source y exponer
drift fiscal, no recalcular impuestos por fuera de Finance.

## Goal

- Mapear campos Nubox fiscales avanzados a snapshots/evidence.
- Enriquecer VAT data quality con comparación contra Nubox/SII evidence.
- Mantener `vat_ledger_entries` como contrato mensual.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Normative Docs

- `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/complete/TASK-532-purchase-vat-recoverability.md`
- `docs/tasks/complete/TASK-533-chile-vat-ledger-monthly-position.md`
- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/income-tax-snapshot.ts`
- `src/lib/finance/expense-tax-snapshot.ts`
- `src/lib/finance/vat-ledger.ts`
- `src/app/api/finance/data-quality/route.ts`
- Nubox purchase tax fields in conformed/PG.

### Blocks / Impacts

- Finance fiscal reporting.
- Nubox enterprise promotion.
- VAT monthly close quality.

### Files owned

- `src/lib/nubox/**`
- `src/lib/finance/*tax*`
- `src/lib/finance/vat-ledger.ts`
- `src/app/api/finance/data-quality/route.ts`
- `docs/documentation/finance/**`

## Current Repo State

### Already exists

- income tax snapshots.
- expense recoverability fields.
- VAT ledger monthly position.

### Gap

- no Nubox-specific tax graph/evidence.
- no data quality comparing VAT position to Nubox/SII source totals.
- no line/reference-level tax fidelity.

## Scope

### Slice 1 — Evidence mapping

- Define Nubox tax field mapping to Finance snapshots.

### Slice 2 — Data quality

- Add VAT/Nubox comparison checks.

### Slice 3 — Docs

- Update Finance docs with Nubox fiscal evidence semantics.

## Out of Scope

- Legal SII filing automation.
- Multi-country tax engine.

## Acceptance Criteria

- [ ] Nubox tax fields are mapped to canonical evidence.
- [ ] VAT data quality exposes source-vs-ledger drift.
- [ ] No UI/API recalculates VAT inline.

## Verification

- `pnpm lint`
- `pnpm test --run src/lib/finance`
- manual period comparison.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Finance architecture/documentation updated.
