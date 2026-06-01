# TASK-979 — Monthly Contractor Payment Run (batch de pago mensual)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `In progress (2026-05-31, develop sin branch por instrucción)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-977`
- Branch: `task/TASK-979-monthly-contractor-payment-run`
- Legacy ID: `none`

## Summary

Orquesta una **corrida mensual de pago a contractors**: al cierre del período, junta todos los contractor payables `ready_for_finance` (con sus obligaciones ya creadas) y los agrupa en **órdenes de pago del período** para que Finanzas los pague en un solo flujo, honrando el compromiso de los 5 días. Hoy las órdenes se arman a mano desde obligaciones sueltas; no existe ninguna "corrida" que barra el período.

## Why This Task Exists

Revisión exhaustiva 2026-05-31 (sin inferencias): no existe ningún concepto de "corrida mensual" ni batching de contractors. Verificado: las payment orders se crean ad-hoc seleccionando obligaciones manualmente (`createPaymentOrderFromObligations`). Para pagar a N contractors cada mes dentro de la ventana de 5 días, hacerlo de a uno es frágil y lento. Esta task da el barrido del período (preparación de las órdenes), dejando la aprobación + el pago en manos de Finanzas (control humano).

## Goal

- Un comando/orquestación que, dado un período, barre los contractor payables `ready_for_finance` del período y prepara las órdenes de pago agrupadas (por moneda / cuenta / processor según las reglas existentes).
- El operador Finanzas revisa, aprueba (doble firma) y paga la corrida desde el workbench existente — la corrida prepara, no paga sola.
- Idempotente: re-correr no duplica órdenes ni obligaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

1. **`greenhouse-finance-accounting-operator`** — payment orders, obligaciones, agrupación por moneda/cuenta, reconciliación, maker-checker.
2. **`arch-architect`** (4-pillar) — diseño de la orquestación idempotente (reversibilidad, blast radius, atomicidad), reuso del bridge reactivo TASK-771.
3. **`greenhouse-cron-sync-ops`** — si la corrida se dispara por schedule (Cloud Scheduler + ops-worker, no Vercel cron para async-critical, TASK-775).

Si emerge superficie visible (botón "iniciar corrida mensual" / vista de la corrida), coordinar con TASK-974 e invocar las **skills de product design**.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` (`createPaymentOrderFromObligations`)
- `CLAUDE.md` → "Vercel cron classification (TASK-775)" + "Outbox publisher canónico (TASK-773)" + "Cloud Run ops-worker"

Reglas obligatorias:

- **NUNCA** la corrida paga sola. Prepara las órdenes en `draft`/`pending_approval`; la aprobación + el mark-paid son acciones humanas de Finanzas (maker-checker preservado).
- **NUNCA** mezclar monedas en una orden (limitación V1 de payment orders ya existente). Agrupar por moneda/cuenta/processor según las reglas vigentes.
- **NUNCA** duplicar obligaciones/órdenes: idempotencia por período + payable; reusar el partial unique index de obligaciones.
- Si se dispara por schedule, vive en **Cloud Scheduler + ops-worker** (no Vercel cron — es async-critical, TASK-775).
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain(err, 'finance', ...)`.

## Dependencies & Impact

### Depends on

- **TASK-977** (settlement contractor → banco) — sin el settlement, la corrida prepararía órdenes que no se pueden pagar. **Blocker duro.**
- `createPaymentOrderFromObligations` (TASK-750) + el bridge payable→obligación (TASK-793).
- TASK-978 (due_date) — la corrida usa el due_date/SLA para priorizar y para definir la ventana del período.

### Blocks / Impacts

- Cierra operativamente el compromiso de los 5 días (preparación masiva en lugar de uno a uno).

### Files owned

- `src/lib/contractor-engagements/payables/monthly-run.ts` (orquestador) o `src/lib/cron-orchestrators/`
- `services/ops-worker/server.ts` + `deploy.sh` (si schedule)
- `src/app/api/finance/contractor-payables/monthly-run/route.ts` (trigger manual)
- `src/lib/reliability/queries/contractor-monthly-run-*.ts` (signal si aplica)

## Current Repo State

### Already exists

- `createPaymentOrderFromObligations` (agrupa obligaciones en una orden).
- Bridge reactivo payable→obligación (TASK-793).
- ops-worker + Cloud Scheduler infra (TASK-775).

### Gap

- Ningún barrido del período; las órdenes se arman a mano de a una.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Orquestador de la corrida (lógica pura + idempotente)

- `prepareMonthlyContractorPaymentRun({ periodYear, periodMonth })`: barre contractor payables `ready_for_finance` del período con obligación creada, los agrupa (moneda/cuenta/processor), y crea las órdenes de pago en `draft`/`pending_approval`. Idempotente (no duplica).

### Slice 2 — Trigger (endpoint manual + opcional schedule)

- Endpoint `POST /api/finance/contractor-payables/monthly-run` (capability finance) para disparar manual.
- Opcional: Cloud Scheduler job en ops-worker que lo dispare post-cierre (NO Vercel cron).

### Slice 3 — Botón "Iniciar corrida mensual" en el workbench Finanzas (REQUERIDO — pedido operador 2026-05-31)

- Botón en `/finance/contractor-payments` (TASK-974) que invoca el endpoint del orquestador: selector de período (default = mes operativo vigente), preview de cuántos payables `ready_for_finance` entran + total neto por moneda, confirmación → POST.
- Surface honesto del resultado (órdenes creadas / payables incluidos / idempotente "ya estaba preparada"). El botón **prepara**, no paga (las órdenes quedan `draft`/`pending_approval`).
- **Skills de product design** (greenhouse-ux + forms-ux para el dialog de confirmación + greenhouse-ux-writing) — es un add chico al workbench existente, no un wizard nuevo; mockup ligero + GVC.

### Slice 4 — Reliability + cierre

- Signal de cobertura de la corrida (payables ready del período no incluidos en ninguna orden, pasada la ventana SLA TASK-978). Steady=0.
- Docs + arch Delta.

## Out of Scope

- Settlement al banco → TASK-977 (blocker, ya completa).
- Reporte PDF/Excel "nómina de contractors" de la corrida → **TASK-980** (espejo del reporte de payroll TASK-782).
- Email al contractor con comprobante al pagar → **TASK-981**.
- Aprobación/pago automáticos (siempre humano).

## Detailed Spec

La corrida **prepara**, no paga. Reusa `createPaymentOrderFromObligations` agrupando las obligaciones `provider_payroll` del período. La aprobación (doble firma) + el mark-paid (que rebaja el banco, vía TASK-977) son acciones humanas. El valor es el barrido masivo + idempotente en lugar de armar órdenes de a una.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

**TASK-977 debe estar shippeado (settlement contractor) antes de activar la corrida en producción** — sin él, la corrida prepara órdenes impagables. Slice 1 (orquestador) → 2 (trigger) → 3 (signal). El schedule no se activa hasta que TASK-977 esté ON.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Corrida duplica órdenes/obligaciones | finance | medium | Idempotencia por período+payable; partial unique index; re-run safe | signal de cobertura |
| Prepara órdenes impagables (sin TASK-977) | finance | high si se activa antes | Blocked-by TASK-977; no activar schedule hasta settlement ON | n/a |
| Mezcla de monedas en una orden | finance | low | Agrupar por moneda (regla V1 existente) | n/a |

### Feature flags / cutover

`CONTRACTOR_MONTHLY_RUN_ENABLED` (default OFF) si se agrega schedule. Trigger manual disponible antes. No activar hasta TASK-977 ON.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (orquestador additive) | <10 min | sí |
| 2 | flag OFF / quitar scheduler job | <10 min | sí |
| 3 | revert signal | <10 min | sí |

### Production verification sequence

1. (Pre-req) TASK-977 settlement ON en staging.
2. Deploy staging + correr el batch manual de un período de prueba → verify órdenes creadas agrupadas, idempotente al re-correr.
3. Aprobar + pagar una orden de la corrida → verify settlement (TASK-977) rebaja banco.
4. Repetir en prod.

### Out-of-band coordination required

Confirmar con Finanzas el flujo operativo de la corrida mensual (quién la dispara, cuándo respecto al cierre).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La corrida barre los contractor payables ready del período y prepara órdenes agrupadas (draft/pending_approval).
- [ ] Idempotente (re-correr no duplica).
- [ ] No paga sola; aprobación + mark-paid son humanos.
- [ ] Signal de cobertura (payables ready no incluidos); steady=0.
- [ ] No se activa en prod hasta TASK-977 (settlement) ON.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/contractor-engagements src/lib/finance`
- Staging end-to-end de una corrida.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-977, TASK-978, TASK-974)
- [ ] CLAUDE.md invariant + arch Delta

## Follow-ups

- Unificar la corrida de contractors con la corrida de nómina si emerge necesidad de un único "payment run" del período.

## Open Questions

- ~~¿La corrida se dispara manual (Finanzas) o por schedule post-cierre?~~ **RESUELTA → manual primero, schedule opcional detrás de flag** (ver Análisis pre-ejecución).
- ~~¿Una orden por moneda/cuenta, o una por contractor?~~ **RESUELTA → por (moneda, cuenta origen, processor); NUNCA por contractor** (ver Análisis pre-ejecución).

## Análisis pre-ejecución 2026-05-31 (3-skill: finance + payroll + arch 4-pillar) — ajustes verificados contra el código

Verificado contra `src/lib/finance/payment-orders/`, `src/lib/finance/payment-obligations/create-obligation.ts`, `src/lib/sync/projections/contractor-payable-finance-obligation.ts`, `src/lib/ico-engine/materialize-tracking.ts` (patrón TASK-900):

1. **OQ "manual o schedule" RESUELTA → manual primero (Finanzas), schedule opcional detrás de flag `CONTRACTOR_MONTHLY_RUN_ENABLED` (default OFF).** maker-checker + cron-lens favorecen human-initiated en V1; el schedule (Cloud Scheduler + ops-worker, NO Vercel cron, TASK-775) solo se activa post TASK-977 ON + staging validado. La corrida **prepara** órdenes en `draft`/`pending_approval` — la aprobación doble-firma + el mark-paid siguen humanos (SoD intacto).

2. **OQ "agrupación" RESUELTA → una orden por (moneda, cuenta origen, processor); NUNCA por contractor.** El batching es el objetivo; agrupar por contractor lo anula. Respeta la regla V1 "no mezclar monedas en una orden" + reusa `createPaymentOrderFromObligations` (TASK-750).

3. **AJUSTE de idempotencia (arch 4-pillar Robustness) — "reusar el index de obligaciones" NO alcanza.** El orquestador crea **órdenes**, no obligaciones; el partial unique index de obligaciones (TASK-793) no previene crear una 2da orden sobre las mismas obligaciones. **Idempotencia canónica: el barrido solo toma obligaciones `provider_payroll` del período NO ya ligadas a una orden no-cancelada** (filtro un-ordered). Esto hace el re-run safe sin tabla nueva.

4. **INCORPORAR (arch — observabilidad + auditoría): tabla append-only `contractor_payment_run`** (período, status, triggered_by, prepared_order_ids[], counts, created_at) espejo de `ico_materialization_runs` (TASK-900). Da: (a) idempotencia explícita por período (no dos corridas del mismo mes pisándose), (b) auditoría ("¿quién corrió la de mayo y qué preparó?"), (c) observabilidad para el signal de cobertura. **Recomendado** (no estrictamente bloqueante si el filtro un-ordered es robusto, pero es el patrón canónico para un batch del que Finanzas depende mensualmente). Triggers anti-UPDATE/DELETE (append-only).

5. **INCORPORAR (finance) — priorización por SLA (TASK-978).** La corrida debe ordenar/priorizar por el `due_date`/SLA de TASK-978 (pagar primero lo más vencido contra el compromiso de 5 días hábiles). Dependencia explícita: TASK-978 ship primero (es P1 + independiente).

6. **AJUSTE del signal de cobertura** — payables `ready_for_finance` con obligación creada pero **NO** incluidos en ninguna orden no-cancelada, **pasada la ventana SLA** (cierre + 5 hábiles). Steady=0. Distinto del `ready_without_obligation` (TASK-793) que cubre el tramo anterior del pipeline.

7. **Boundary confirmado (payroll skill)** — la corrida toca SOLO contractor payables (`labor_cost_external`); cero nómina/`contract_type`/finiquito. Gate de cierre: `pnpm vitest run src/lib/payroll` + `src/lib/finance/payment-orders` + `src/lib/contractor-engagements`. La **remesa de retención SII al SII (F29)** NO es parte de la corrida — es una obligación distinta (ver TASK-978 análisis); la corrida paga el NETO al contractor.

**Files owned actualizado**: + `src/lib/contractor-engagements/payables/payment-run-store.ts` (tracking append-only) + migración de la tabla `contractor_payment_run` (si se incorpora el punto 4).
