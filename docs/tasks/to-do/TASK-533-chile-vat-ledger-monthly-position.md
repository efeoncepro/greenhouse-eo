# TASK-533 — Chile VAT Ledger & Monthly Position

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-529, TASK-531, TASK-532`
- Branch: `task/TASK-533-chile-vat-ledger-monthly-position`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Materializar el ledger de IVA Chile y la posicion mensual de debito/credito fiscal dentro de Greenhouse. Finance necesita una lectura confiable y recomputable del IVA ventas, IVA compras recuperable y saldo mensual, sin depender de hojas manuales ni calculos inline.

## Why This Task Exists

Aunque quotes, income y expenses ya manejan datos tributarios parciales, Greenhouse no puede responder de forma canonica cuanto IVA debito genero, cuanto credito fiscal acumulo, ni cual es la posicion del mes. Esa ausencia impacta cierre financiero, conciliacion con Nubox y lectura ejecutiva de Finance.

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
- El runtime inicial debe correr fuera del commercial worker; el camino preferido es `ops-worker` con posibilidad de escalar a worker tributario dedicado.
- Debe existir recomputo por periodo y backfill historico.
- Las lecturas de posicion mensual deben distinguir ventas, compras recuperables, compras no recuperables y saldo resultante.

## Normative Docs

- `docs/documentation/operations/ops-worker-reactive-crons.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/to-do/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/to-do/TASK-532-purchase-vat-recoverability.md`
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
- `finance.income.*` y writes de expenses ya existen como hechos operativos reutilizables.
- Finance tiene surfaces donde se puede injertar una lectura minima de posicion mensual.

### Gap

- No hay ledger tributario mensual canonico.
- No existe recomputo/backfill de IVA por periodo.
- No existe una surface minima para ver debito, credito y saldo.

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

- [ ] Existe ledger mensual de IVA recomputable por periodo.
- [ ] Finance puede ver debito fiscal, credito fiscal y saldo mensual de forma canonica.
- [ ] El runtime de materializacion queda fuera del commercial worker y con trazabilidad operativa.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- verificacion manual o automatizada del worker/materialization

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedaron documentados replay y backfill por periodo

## Follow-ups

- dashboard fiscal mas amplio
- reconciliacion avanzada contra libros externos
