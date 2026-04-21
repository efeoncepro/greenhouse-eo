# TASK-532 — Purchase VAT Recoverability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-532-purchase-vat-recoverability`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Modelar IVA de compras como semantica contable explicita: credito fiscal recuperable vs IVA no recuperable que debe incorporarse a costo o gasto. Esta task cierra el hueco entre expenses, cost basis y finanzas Chile.

## Why This Task Exists

Greenhouse ya guarda `tax_rate`, `tax_amount`, `tax_type` y metadata de compras/gastos, pero no expresa si ese IVA se recupera o se capitaliza en costo. Sin esa distincion, el sistema puede sobrecargar costos comerciales o subestimar el activo tributario de compras.

## Goal

- Introducir recuperabilidad tributaria first-class en expenses/purchases.
- Hacer que IVA recuperable no contamine costo operativo.
- Hacer que IVA no recuperable si impacte costo/gasto cuando corresponda.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- El costo operativo y los economics no deben incluir IVA recuperable.
- IVA no recuperable si debe poder incorporarse a costo/gasto de manera explicita y trazable.
- La logica tributaria de compras debe vivir en Finance, no en heuristicas dentro de commercial cost basis.
- Importaciones futuras desde Nubox/DTE deben poder mapear al mismo contrato.

## Normative Docs

- `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/to-do/TASK-533-chile-vat-ledger-monthly-position.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/route.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/finance/expense-taxonomy.ts`
- `src/lib/tax/chile/*`
- `src/lib/nubox/sync-nubox-to-postgres.ts`

### Blocks / Impacts

- cost basis y economics
- compras/proveedores
- ledger mensual de IVA
- service attribution y P&L operacional

### Files owned

- `src/app/api/finance/expenses/*`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/finance/expense-taxonomy.ts`
- `src/lib/tax/chile/*`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/commercial-cost-attribution/*`
- `src/lib/cost-intelligence/*`
- `src/lib/service-attribution/*`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/app/api/finance/expenses/route.ts` y `src/app/api/finance/expenses/[id]/route.ts` ya persisten campos tributarios.
- `src/lib/finance/postgres-store-slice2.ts` concentra parte importante del write path financiero.
- `src/lib/finance/expense-taxonomy.ts` ya define vocabulario financiero de gastos.
- `TASK-529` ya creo la foundation canonica de `tax_code`, `recoverability` y `ChileTaxSnapshot`.
- `TASK-531` ya convergio `income` al patron canonico `tax_code + tax_snapshot_json + tax_snapshot_frozen_at`.
- Nubox ya expone `vat_unrecoverable_amount`, `vat_fixed_assets_amount` y `vat_common_use_amount` en compras.

### Gap

- No existe `recoverability` tributaria explicita.
- No existe separacion formal entre neto gasto, IVA credito fiscal e IVA no recuperable.
- Cost basis/commercial no tienen una fuente confiable para distinguir ambos casos.
- Los consumers downstream siguen leyendo `total_amount_clp` bruto y hoy pueden inflar costo operativo con IVA recuperable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Expense tax contract

- Persistir `tax_code` y snapshot tributario canonico en expenses.
- Exponer `recoverability` desde el snapshot persistido y mantener compatibilidad degradada con `tax_rate` / `tax_amount`.
- Mapear `tax_type` legacy hacia el nuevo contrato donde aplique.

### Slice 2 — Cost treatment

- Asegurar que IVA recuperable vaya a cuenta/ledger tributario y no a costo.
- Asegurar que IVA no recuperable pueda consolidarse en costo/gasto y economics.

### Slice 3 — Downstream compatibility

- Preparar ingestion futura desde DTE/Nubox/proveedores sobre el mismo contrato.
- Exponer payloads claros para attribution/materialization downstream.
- Alinear `expenses` con el mismo patron documental ya usado por quotations e income.

### Slice 4 — Tests and docs

- Cobertura sobre create/update de expenses y calculo de costo efectivo.
- Actualizar docs financieras y de cost basis si cambia la semantica visible.

## Out of Scope

- Posicion mensual de IVA completa.
- Reconciliacion bancaria.
- Soporte tributario fuera de Chile IVA v1.

## Detailed Spec

Casos minimos:

1. Compra con IVA recuperable: el costo efectivo operativo permanece neto.
2. Compra con IVA no recuperable: el costo efectivo incorpora ese impuesto.
3. Compra exenta: no genera credito fiscal ni impuesto sobre el documento.
4. El ledger mensual de IVA puede distinguir compras con credito fiscal vs IVA capitalizado a costo sin heuristicas downstream.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Expenses/purchases expresan recuperabilidad tributaria canonica.
- [ ] IVA recuperable ya no infla costos operativos ni marginosidad.
- [ ] IVA no recuperable puede llevarse a costo/gasto y queda trazable.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- smoke manual de expense create/edit y downstream cost snapshot

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verifico el efecto sobre cost basis/economics

## Follow-ups

- `TASK-533`
