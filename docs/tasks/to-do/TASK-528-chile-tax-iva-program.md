# TASK-528 — Chile Tax / IVA Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-528-chile-tax-iva-program`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar una capa tributaria canonica para Chile dentro de Greenhouse, empezando por IVA ventas y compras. Hoy existen columnas y defaults dispersos, pero no un contrato tributario coherente que conecte cotizaciones, ingresos, compras, costos y posicion mensual.

## Why This Task Exists

Greenhouse ya persiste `tax_rate`, `tax_amount`, `tax_type` e incluso algunas banderas de exencion en distintas superficies, pero esa informacion vive como campos sueltos. La quote sigue modelando precio y margen sin una capa tributaria explicita, `income` usa un default implicito de `0.19`, y compras/gastos no distinguen con claridad IVA recuperable vs IVA que debe ir a costo. Eso vuelve fragil la contabilidad operativa, dificulta Nubox/SII y deja a Finance sin una posicion mensual de IVA confiable.

## Goal

- Crear el programa oficial para una capa tributaria Chile-first dentro de `greenhouse_finance`.
- Desacoplar pricing/commercial de la logica tributaria sin romper quote-to-cash.
- Entregar un backlog ejecutable y ordenado para foundation, quotes, income, compras y ledger mensual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- La capa tributaria vive en `greenhouse_finance`; Commercial consume snapshots, pero no define la verdad tributaria.
- Toda resolucion tributaria downstream debe recibir contexto tenant (`space_id` o contexto organizacional efectivo) antes de aplicar defaults.
- Las metricas de margen y rentabilidad permanecen netas de impuestos; IVA no se mezcla como ingreso operativo ni como costo salvo cuando sea no recuperable.
- La posicion mensual de IVA no se calcula inline desde UI o handlers; debe materializarse por proyecciones/worker financiero.
- La ejecucion inicial de proyecciones tributarias no debe montarse sobre el commercial worker; el carril correcto es `ops-worker` o un worker financiero dedicado si el volumen lo exige.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`
- `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/to-do/TASK-524-income-hubspot-invoice-bridge.md`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/quotation-canonical-store.ts`

### Blocks / Impacts

- quote output y PDFs con neto + IVA + total
- quote-to-cash e income sync hacia Nubox/HubSpot
- cost basis y economics cuando el IVA compra no es recuperable
- reporting financiero y cierre mensual Chile

### Files owned

- `docs/tasks/to-do/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/to-do/TASK-530-quote-tax-explicitness-chile-iva.md`
- `docs/tasks/to-do/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/to-do/TASK-532-purchase-vat-recoverability.md`
- `docs/tasks/complete/TASK-533-chile-vat-ledger-monthly-position.md`

## Current Repo State

### Already exists

- `src/app/api/finance/income/route.ts` ya calcula `taxRate` y `taxAmount`, pero con default implicito `0.19`.
- `src/app/api/finance/expenses/route.ts` y `src/app/api/finance/expenses/[id]/route.ts` ya persisten `tax_rate`, `tax_amount`, `tax_type`, `tax_period` y afines.
- `src/lib/finance/quotation-canonical-store.ts` y `src/app/api/finance/quotes/[id]/lines/route.ts` ya exponen campos tributarios legacy/canonicos.
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` ya contempla `ivaAmount`, aunque no existe una foundation tributaria canonica.

### Gap

- No existe catalogo de codigos tributarios Chile ni snapshots canonicos de tax code/rate/recoverability.
- Quote pricing persiste `subtotal` y `total_amount`, pero no gobierna de forma consistente `tax_rate`/`tax_amount`.
- `income` usa IVA implicito; compras no separan bien IVA credito fiscal vs IVA no recuperable.
- No existe ledger mensual ni posicion de IVA materializada para Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation tributaria

- Crear `TASK-529` para tax codes, snapshots y helpers Chile-first.
- Definir contrato base `tax_code + rate_snapshot + recoverability + taxable_amount + tax_amount`.

### Slice 2 — Revenue surfaces

- Crear `TASK-530` para cotizaciones y `TASK-531` para income/invoice.
- Alinear quote output, quote-to-cash e invoice sync sobre el mismo snapshot tributario.

### Slice 3 — Purchase VAT

- Crear `TASK-532` para distinguir IVA compra recuperable vs no recuperable.
- Conectar ese contrato con costos y economics sin inflar marginosidad comercial.

### Slice 4 — Ledger y posicion mensual

- Crear `TASK-533` para materializacion mensual, serving financiero y backfill.
- Definir runtime de proyeccion fuera del commercial worker.

## Out of Scope

- Soporte tributario multi-pais en la primera iteracion.
- Reemplazar Nubox/SII o rehacer toda la contabilidad legal en esta task umbrella.
- Lanzar UI tributaria enterprise completa fuera del minimo necesario para Finance.

## Detailed Spec

Programa oficial:

1. `TASK-529` establece la tax layer canonica.
2. `TASK-530` vuelve explicito el IVA en quotations.
3. `TASK-531` hace converger income/invoice con esa layer.
4. `TASK-532` modela IVA compra y recuperabilidad.
5. `TASK-533` materializa ledger y posicion mensual de IVA.

Decision de arquitectura cerrada por esta umbrella:

- IVA operacional y posicion mensual viven en proyecciones financieras.
- El runtime inicial debe reutilizar `ops-worker` y solo escalar a un worker tributario dedicado cuando el throughput o los tiempos de recomputo lo exijan.
- Commercial sigue resolviendo precio/costo/margen netos; la capa tributaria se injerta como snapshot downstream y surface de salida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen tasks hijas claras para foundation, quotes, income, compras y ledger mensual.
- [ ] El programa deja explicita la decision de runtime y boundary tributario.
- [ ] Queda claro que Chile/IVA es la primera jurisdiccion soportada y que el modelo es extensible.

## Verification

- revision manual del programa y sus dependencias
- confirmacion de IDs en `docs/tasks/TASK_ID_REGISTRY.md`
- confirmacion de index en `docs/tasks/README.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-529`
- `TASK-530`
- `TASK-531`
- `TASK-532`
- `TASK-533`
