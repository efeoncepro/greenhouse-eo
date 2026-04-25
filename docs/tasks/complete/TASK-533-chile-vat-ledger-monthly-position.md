# TASK-533 — Chile VAT Ledger & Monthly Position

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
- Status real: `Completo`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none — TASK-529, TASK-531 y TASK-532 ya completadas`
- Branch: `task/TASK-533-chile-vat-ledger-monthly-position`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Materializar el ledger de IVA Chile y la posicion mensual de debito/credito fiscal dentro de Greenhouse. Finance necesita una lectura confiable y recomputable del IVA ventas, IVA compras recuperable y saldo mensual, sin depender de hojas manuales ni calculos inline.

## Why This Task Exists

 Aunque quotations, income y expenses ya persisten snapshots tributarios canónicos, Greenhouse todavía no puede responder de forma canonica cuanto IVA debito genero, cuanto credito fiscal recuperable acumulo, cuanto IVA no recuperable capitalizo y cual es la posicion consolidada del mes. Esa ausencia impacta cierre financiero, conciliacion con Nubox y lectura ejecutiva de Finance.

## Goal

- Crear ledger/proyecciones mensuales de IVA Chile.
- Exponer serving y una surface minima para Finance sobre la posicion mensual.
- Permitir recomputo/backfill auditable por periodo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- La posicion mensual se materializa por eventos/proyecciones, no por calculo inline en UI.
- El runtime inicial debe correr fuera del commercial worker; el carril obligatorio para la primera iteracion es `ops-worker`, con posibilidad de escalar despues a un worker tributario dedicado sin cambiar el contrato.
- Debe existir recomputo por periodo y backfill historico.
- Las lecturas de posicion mensual deben distinguir ventas, compras recuperables, compras no recuperables y saldo resultante.

## Normative Docs

- `docs/documentation/operations/ops-worker-reactive-crons.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/complete/TASK-532-purchase-vat-recoverability.md`
- `services/ops-worker/`
- `src/lib/sync/`

### Blocks / Impacts

- cierre financiero mensual
- conciliacion con Nubox
- reporting fiscal para Finance

### Files owned

- `src/lib/sync/projections/*`
- `src/lib/finance/*`
- `services/ops-worker/*`
- `src/app/api/finance/*`
- `src/views/greenhouse/finance/*`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `ops-worker` ya procesa carriles reactivos/materializaciones financieras.
- `greenhouse_finance.tax_codes` ya existe como catalogo canonico Chile-first.
- `finance.income.*` ya persiste `tax_code`, `tax_snapshot_json` e `is_tax_exempt` como source canonica de debito fiscal.
- `greenhouse_finance.expenses` ya persiste `tax_code`, `tax_recoverability`, `tax_snapshot_json`, `recoverable_tax_amount`, `non_recoverable_tax_amount` y `effective_cost_amount`.
- Finance tiene surfaces donde se puede injertar una lectura minima de posicion mensual.

### Gap

- No hay ledger tributario mensual canonico.
- No existe recomputo/backfill de IVA por periodo.
- No existe una surface minima para ver debito, credito y saldo.
- `vat_common_use_amount` ya queda marcado como recoverability parcial en expenses, pero aun no existe una politica mensual materializada que lo consolide en la posicion fiscal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ledger schema and events

- Crear tablas/proyecciones de ledger IVA y posicion mensual.
- Consumir eventos/aggregates financieros canonicos de income y expenses.

### Slice 2 — Materialization runtime

- Implementar materializacion/reactividad en `ops-worker` o carril financiero equivalente.
- Soportar recomputo por periodo (`year`, `month`) y backfill bulk.

### Slice 3 — Serving and finance surface

- Exponer API/read models para debito fiscal, credito fiscal recuperable, IVA no recuperable y saldo mensual.
- Entregar una surface minima en Finance para lectura operativa y exportable.

### Slice 4 — Observability and docs

- Instrumentar trazabilidad de runs, errores y replay por periodo.
- Actualizar docs de arquitectura y operacion del worker.

## Out of Scope

- Declaracion legal automatica ante SII.
- Soporte multi-pais.
- Rehacer el motor de contabilidad general completo.

## Detailed Spec

Contrato minimo:

1. Ventas con IVA generan debito fiscal.
2. Compras con IVA recuperable generan credito fiscal.
3. Compras con IVA no recuperable no incrementan credito y deben quedar separadas.
4. El sistema puede responder la posicion mensual por tenant/periodo y recomputarla.

Decision de runtime resuelta:

- No usar commercial worker.
- Reutilizar `ops-worker` para la primera iteracion porque ya existe como boundary de proyecciones financieras, cron reactivo y materializacion pesada.
- Si el throughput o la criticidad tributaria lo requieren, evolucionar luego a `finance-tax-worker` sin cambiar el contrato de eventos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe ledger mensual de IVA recomputable por periodo.
- [x] Finance puede ver debito fiscal, credito fiscal y saldo mensual de forma canonica.
- [x] El runtime de materializacion queda fuera del commercial worker y con trazabilidad operativa.

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- verificacion manual del contrato `ops-worker` / `vat-ledger-materialize`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [x] `changelog.md` quedo actualizado si cambio comportamiento visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] quedaron documentados replay y backfill por periodo

## Follow-ups

- dashboard fiscal mas amplio
- reconciliacion avanzada contra libros externos
