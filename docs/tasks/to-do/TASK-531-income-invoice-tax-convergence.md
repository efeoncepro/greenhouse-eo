# TASK-531 — Income / Invoice Tax Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-529`
- Branch: `task/TASK-531-income-invoice-tax-convergence`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Converger `income` e invoice materialization al mismo contrato tributario canonico. La factura/ingreso debe heredar tax snapshot desde la quote o desde su origen real, sin defaults silenciosos y lista para Nubox/HubSpot.

## Why This Task Exists

`POST /api/finance/income` hoy aplica `taxRate = body.taxRate ?? 0.19`, lo que deja un IVA implicito dificil de auditar. Ademas, `income_line_items` solo distingue `is_exempt`, y quote-to-cash todavia no se apoya en un snapshot tributario unificado. Para un sistema robusto, la factura no puede depender de un magic number.

## Goal

- Reemplazar defaults tributarios implicitos por tax snapshots canonicos.
- Hacer que `income` y quote-to-cash hereden el impuesto correcto desde su documento origen.
- Preparar `income` para integraciones downstream como Nubox y HubSpot Invoice Bridge.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- `income` sigue siendo la source of truth financiera; tax snapshot se persiste en el agregado y no se recalcula por integracion downstream.
- Quote-to-cash debe heredar el snapshot tributario de la quote emitida cuando exista ese upstream.
- No se usa `0.19` hardcodeado como comportamiento silencioso.
- La asociacion HubSpot/Nubox consume el snapshot ya resuelto; no reinterpreta impuestos por fuera de Finance.

## Normative Docs

- `docs/tasks/to-do/TASK-524-income-hubspot-invoice-bridge.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/to-do/TASK-530-quote-tax-explicitness-chile-iva.md`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/income/[id]/lines/route.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts`

### Blocks / Impacts

- `TASK-524`
- Nubox sync
- auditoria fiscal de invoices

### Files owned

- `src/app/api/finance/income/*`
- `src/lib/finance/quote-to-cash/*`
- `src/lib/finance/postgres-store-slice2.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/app/api/finance/income/route.ts` calcula `taxRate`, `taxAmount` y `totalAmount`.
- `src/app/api/finance/income/[id]/lines/route.ts` ya expone `is_exempt` en line items.
- quote-to-cash ya materializa `income` desde quotes emitidas.

### Gap

- `income` nace con IVA implicito si el caller no manda `taxRate`.
- `income_line_items` no expresa todavia un `tax_code` canonico.
- quote-to-cash no tiene un contrato tributario compartido con quotations.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Income schema and API convergence

- Persistir `tax_code` y snapshot tributario en `greenhouse_finance.income` y/o sus line items.
- Endurecer create/update para exigir snapshot explicito o resolverlo desde foundation, nunca por default invisible.

### Slice 2 — Quote-to-cash inheritance

- Hacer que `materializeInvoiceFromApprovedQuotation` y la rama HES hereden el mismo snapshot tributario del upstream.
- Congelar ese snapshot al crear `income`.

### Slice 3 — Downstream readiness

- Alinear el agregado con `TASK-524` y Nubox para que el invoice mirror/artifacts usen el mismo snapshot.
- Trazar degradaciones si faltan line items tributarios detallados.

### Slice 4 — Tests and docs

- Agregar pruebas sobre API, materializers y line items.
- Actualizar docs de Finance con el contrato invoice tax.

## Out of Scope

- Ledger mensual completo.
- UI tributaria grande de ingresos si no es necesaria para cerrar el contrato.
- Sync de pagos/cobranzas.

## Detailed Spec

Reglas de negocio:

1. Si el `income` nace de una quote emitida, hereda el snapshot tributario de la quote.
2. Si nace manualmente, el create/update debe resolver `tax_code` desde foundation o exigirlo explicitamente.
3. `is_exempt` deja de ser el unico carrier tributario de line items; debe convivir o migrar hacia `tax_code`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `income` ya no depende de `0.19` como default silencioso.
- [ ] Quote-to-cash hereda el snapshot tributario correcto desde la quote/HES.
- [ ] El agregado `income` queda listo para Nubox/HubSpot con trazabilidad tributaria consistente.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- prueba manual de create income + quote-to-cash

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verifico compatibilidad con `TASK-524`

## Follow-ups

- `TASK-533`

