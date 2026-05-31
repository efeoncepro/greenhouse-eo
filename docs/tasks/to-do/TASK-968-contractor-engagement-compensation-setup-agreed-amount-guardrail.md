# TASK-968 — Contractor Engagement Compensation Setup + Agreed-Amount Guardrail

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|finance|ui`
- Blocked by: `none`
- Branch: `task/TASK-968-contractor-engagement-compensation-setup`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy **no existe superficie para setear el monto acordado de pago de un contractor** (`contractor_engagements.rate_amount`). El campo existe en el schema (TASK-790) y hay endpoints de escritura (`POST /api/hr/contractors`, `PATCH /api/hr/contractors/[id]`), pero **ningún formulario en la UI** lo expone — los engagements creados por la transición desde offboarding (TASK-956) nacen con `rate_amount = NULL` (caso real: Valentina Hoyos `EO-CENG-0001`, honorarios CL, acordado 600k mensual, hoy `rate_amount=null`). Sin tarifa acordada: el contractor **escribe a mano** el monto bruto en el composer de envíos (TASK-792) sin validación, no hay default, no hay control de "no pagar más de lo acordado", y el comprobante (TASK-960) termina mostrando un monto sin respaldo de un acuerdo registrado.

Esta task agrega: (1) un **editor de compensación del engagement** (form HR en el workbench) para setear/editar `rate_amount`/`rate_type`/`payment_cadence`/`currency`; (2) que el monto acordado **pre-llene** el bruto del work submission y se muestre read-only al contractor; (3) un **guardrail fail-closed en el payable** que bloquea pagar por encima de lo acordado (override con razón + capability, maker-checker). **No toca el motor de payroll, no muta `contract_type`** (boundary TASK-957), y queda forward-compat con el futuro write-path unificado de TASK-965.

## Why This Task Exists

El programa contractor (TASK-790→796) modela engagement, evidencia, work submissions, payable, bridge a Finance y comprobante (TASK-960) — pero **dejó sin superficie el dato más básico del acuerdo: cuánto se le paga al contractor**. El `rate_amount` vive en el schema pero:

- **No hay form para setearlo** → los engagements quedan con `rate_amount=null` (Valentina). El operador "no sabe dónde poner el monto" (reporte directo 2026-05-31).
- **El monto del pago nace sin control**: el composer (`ContractorSubmissionComposer`) deja escribir cualquier `grossAmount` libre; solo el timesheet deriva `quantity × rate_amount_snapshot` — y eso requiere el rate seteado.
- **No existe "monto máximo acordado / tope"**: nada impide pagar de más respecto a lo pactado. Es un control de commitment/variance (finance) + segregación de funciones (quien fija la tarifa ≠ quien paga) que hoy no existe.

El comprobante (TASK-960) es read-only y muestra lo que el payable resolvió; si el payable nace de un monto a mano sin acuerdo, el comprobante hereda esa fragilidad. Esta task cierra el eslabón aguas arriba.

## Goal

- Que HR pueda **setear y editar el monto acordado** del engagement (`rate_amount` + `rate_type` + `payment_cadence` + `currency`) desde la UI del workbench, con audit append-only y capability, reusando el `updateContractorEngagement` existente (NO un store nuevo).
- Que el monto acordado **pre-llene el bruto** del work submission (fixed/monthly → `rate_amount`; timesheet → `quantity × rate`) y se muestre **read-only al contractor** en su hub (transparencia).
- Que exista un **guardrail fail-closed en el payable** (`payment_exceeds_agreed_amount`) que bloquee pagar por encima de lo acordado para el período, **overridable con razón ≥ N chars + capability** (maker-checker, espejo del payment-profile waiver TASK-793).
- Que el monto acordado fluya correctamente hacia el comprobante (TASK-960) y el read-model workforce (TASK-959/961) **sin recomputar nada inline** (SSOT = engagement).
- **NUNCA** tocar el motor de payroll ni mutar `contract_type` (boundary TASK-957). El pago sigue el riel engagement → payable → Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (spec raíz del programa contractor)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (boundary payroll — solo lectura/no-regresión)
- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` (si la edición usa tabla/inline)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` + `GREENHOUSE_DESIGN_TOKENS_V1.md` (form/UX)

Reglas obligatorias (síntesis de skills payroll + finance + arch + product design):

- **NUNCA** crear una entidad de compensación paralela. El monto acordado vive en `contractor_engagements` (`rate_amount`/`rate_type`/`payment_cadence`/`currency`) — extender el store existente (`updateContractorEngagement`, `store.ts:639`), no paralelizar (arch: extend-don't-parallel; SSOT).
- **NUNCA** mezclar dimensiones ortogonales en un enum: `rate_type` (cómo se factura) ≠ `payment_cadence` (cada cuánto) ≠ un eventual `cap_period` (ventana del tope). Ya son columnas separadas — mantenerlo así.
- **NUNCA** tocar el motor de payroll (`src/lib/payroll/calculate-*`), ni `payroll_entries`, ni mutar `members.contract_type`/`pay_regime`/`payroll_via` (boundary TASK-957: `'honorarios'` rutearía al riel SII legacy → doble declaración F29). El monto acordado feed el work submission → payable → Finance, jamás el payroll dependiente.
- **NUNCA** aplicar deducciones Chile dependientes al monto acordado. La retención SII (15.25% 2026) la resuelve el payable (TASK-794) sobre el bruto; el rate es el bruto acordado.
- **NUNCA** persistir el guardrail como bloqueo silencioso. El gate del payable es **fail-closed con override auditado** (razón + capability + maker-checker), espejo del `payment_profile_waiver` (TASK-793).
- **NUNCA** recomputar el monto acordado inline en consumers (composer, comprobante, read-model). SSOT = engagement; consumers leen `rate_amount`.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'identity'|'finance', ...)`.
- **SIEMPRE** registrar cada cambio de tarifa en el audit append-only `contractor_engagement_events` (state machine + CHECK + audit trio, patrón TASK-790).
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` como gate de no-regresión (EPIC-013).
- Invocar skills `greenhouse-payroll-auditor` (boundary honorarios), `greenhouse-finance-accounting-operator` (commitment/variance control), `greenhouse-ux` + `greenhouse-ux-writing` (form + copy), `greenhouse-backend`/`greenhouse-dev` (implementación) antes de implementar.

## Normative Docs

- `docs/tasks/complete/TASK-790-contractor-engagements-runtime-classification-risk.md` (engagement + rate fields + store + audit)
- `docs/tasks/complete/TASK-792-contractor-work-submissions-approval-dispute-flow.md` (work submission + gross derivation)
- `docs/tasks/complete/TASK-793-contractor-payables-finance-obligations-bridge.md` (payable readiness gates + waiver pattern)
- `docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md` (retención SII sobre el bruto)
- `docs/tasks/complete/TASK-796-contractor-self-service-hub.md` (workbench + self-service + projection)
- `docs/tasks/complete/TASK-960-contractor-remittance-advice.md` (comprobante — consumer read-only del monto)
- `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md` (boundary: no payroll engine, no contract_type mutation)

## Dependencies & Impact

### Depends on

- `ContractorEngagement` store + tipos — `src/lib/contractor-engagements/store.ts` (`updateContractorEngagement` ya acepta `rateAmount`/`rateType`/`paymentCadence`/`paymentCurrency`, línea ~639) + `types.ts` (`rateAmount`, `rateType`, `paymentCadence`, `currency`).
- Endpoints HR — `POST /api/hr/contractors` (`createContractorEngagement`) + `PATCH /api/hr/contractors/[id]` (`updateContractorEngagement`); capability `hr.contractor_engagement` (create/manage).
- Audit append-only `contractor_engagement_events` (TASK-790).
- Work submission store + composer — `src/lib/contractor-engagements/work-submissions/store.ts` (`rateAmountSnapshot`, `grossAmount` derivation) + `src/views/greenhouse/contractors/ContractorSubmissionComposer.tsx`.
- Payable readiness — `src/lib/contractor-engagements/payables/readiness.ts` (`evaluatePayableReadiness`) + store (waiver pattern TASK-793).
- Workbench + self-service — `ContractorAdminWorkbenchView.tsx` (`AdminInspector`) + `ContractorSelfServiceView.tsx` + projecciones (`hr-workbench-projection.ts`, `self-service-scenario.ts`, `projection-types.ts`).

### Blocks / Impacts

- **TASK-960** (comprobante): se beneficia — el monto pasa a tener respaldo de un acuerdo registrado. No requiere cambios (read-only).
- **TASK-959/961** (workforce read model + Person 360 facet): el `rate_amount` pasa a ser parte del resumen de compensación del contractor. Coordinar que el read-model lo lea del engagement (SSOT), no recompute.
- **TASK-965** (Unified Worker Create/Edit Workflow, EPIC-017 Phase 4): **esta task es el precursor contractor-scoped**. Cuando TASK-965 aterrice, debe **componer/absorber** este editor (no duplicarlo). Declarar la sinergia en ambos specs.
- **TASK-338/340** (CompensationProfile read-model / payroll bridge): el monto acordado del contractor NO entra al payroll bridge; queda en el riel contractor. Documentar el boundary.

### Files owned

- `src/views/greenhouse/contractors/ContractorEngagementCompensationDrawer.tsx` (nuevo — form editor)
- `src/views/greenhouse/contractors/ContractorAdminWorkbenchView.tsx` (extender — acción "Editar compensación" en el Inspector + exponer rate en projection)
- `src/views/greenhouse/contractors/ContractorSelfServiceView.tsx` + `ContractorSubmissionComposer.tsx` (extender — rate read-only + pre-fill + soft-warn)
- `src/lib/contractor-engagements/projection-types.ts` + `hr-workbench-projection.ts` + `self-service-scenario.ts` (exponer `agreedRate` aditivo)
- `src/lib/contractor-engagements/payables/readiness.ts` + `store.ts` (gate `payment_exceeds_agreed_amount` + override auditado)
- `migrations/<ts>_task-968-*.sql` (si se agrega columna de override/cap; ver Open Questions)
- `src/lib/reliability/queries/contractor-engagement-rate-unset.ts` (+ wire-up) (signal)
- `src/lib/copy/*` (copy del form + guardrail)
- docs (spec Delta + doc funcional + manual)

## Current Repo State

### Already exists

- `contractor_engagements.rate_amount` (numeric, nullable) + `rate_type` (`fixed|hourly|daily|milestone|project|retainer`) + `payment_cadence` (`weekly|biweekly|semi_monthly|monthly|milestone|on_invoice|off_cycle`) + `currency` — schema TASK-790.
- `updateContractorEngagement(input)` que ya acepta `rateAmount`/`rateType`/`paymentCadence`/`paymentCurrency` (`store.ts:639`) + audit `contractor_engagement_events`.
- Work submission gross derivation `quantity × rate_amount_snapshot` para timesheet (`work-submissions/store.ts:337`); composer con campo "Monto bruto" libre.
- Payable readiness fail-closed con waiver auditado (`payment_profile_waiver_reason`, TASK-793) — patrón a espejar para el guardrail.
- Workbench Inspector (`AdminInspector`) que ya muestra detalle del engagement seleccionado.

### Gap

- **No hay form/UI** para setear/editar `rate_amount`/`rate_type`/`payment_cadence`. Los engagements nacen con `rate_amount=null` (Valentina `EO-CENG-0001`).
- El composer deja escribir cualquier `grossAmount` sin default ni validación contra lo acordado.
- No hay guardrail "no pagar más de lo acordado" (ni soft ni hard).
- El contractor no ve su monto acordado en el self-service.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Editor de compensación del engagement (UI + reuse PATCH)

- Drawer form (`ContractorEngagementCompensationDrawer`) accionado desde el `AdminInspector` del workbench ("Editar compensación"). Campos: `rate_type` (Autocomplete), `rate_amount` (TextField numérico, validación > 0), `payment_cadence` (Autocomplete), `currency` (Autocomplete; default el del engagement). react-hook-form (forms-ux, single column).
- Persiste vía el `PATCH /api/hr/contractors/[id]` existente (`updateContractorEngagement`), capability `hr.contractor_engagement:manage`, audit event en `contractor_engagement_events`. **Cero store nuevo.**
- Self-service: exponer el monto acordado **read-only** en el hub del contractor (transparencia). Projection extendida aditivamente (`agreedRate: { amount, currency, rateType, cadence } | null`).
- Copy es-CL via `src/lib/copy/*` (validar con `greenhouse-ux-writing`).

### Slice 2 — Default + soft-warn en el work submission

- El composer pre-llena `grossAmount` desde el monto acordado: fixed/monthly → `rate_amount`; timesheet → `quantity × rate_amount`. Editable, pero con **soft-warn** (no bloquea) cuando el monto declarado se desvía del esperado (mostrar el acordado + el delta).
- Si `rate_amount` es null → no pre-llena + hint "Falta definir el monto acordado" (degradación honesta, no crash).

### Slice 3 — Guardrail fail-closed en el payable (override auditado)

- Gate de readiness `payment_exceeds_agreed_amount` en `evaluatePayableReadiness`: bloquea cuando el bruto/neto del payable excede el monto acordado para el período (regla por `rate_type`/`cadence`). **Fail-closed**, overridable con `agreed_amount_override_reason` (≥ 10 chars) + capability `finance.contractor_payable.override_agreed_amount` (maker-checker, espejo del payment-profile waiver TASK-793). Migración aditiva para la columna de override + audit.
- Reliability signal `finance.contractor_payable.exceeds_agreed_amount` (drift, moduleKey finance, steady=0; cuenta overrides activos).

### Slice 4 — Reliability data-quality + cierre

- Signal `hr.contractor_engagement.rate_unset` (data_quality, moduleKey identity, warning si > 0): engagements no-terminales engaged con `rate_amount IS NULL` (detecta el gap que parió esta task). Steady=0 cuando todos los engagements activos tengan tarifa.
- Doc funcional + manual + arch Delta + CLAUDE.md invariants si emergen reglas duras.

## Out of Scope

- **Tope acumulado real** (ceiling total/anual con enforcement sobre la suma de pagos) — control financiero más pesado; **follow-up declarado** (ver Open Questions). V1 hace guardrail **por período**, no cumulative.
- **Versionado efectivo-datado de la tarifa** (estilo `compensation_versions` con proration mid-período) — **follow-up** si los cambios de tarifa con historia/proration se vuelven necesidad real. V1 = valor vigente + audit event.
- **Write-path unificado People-first** (TASK-965) — esta task es el precursor contractor-scoped; no se construye el unified workflow acá.
- Cualquier cambio al motor de payroll, a `payroll_entries`, o a `members.contract_type` (boundary TASK-957).
- Setear el monto de Valentina (600k): lo hace **el operador** vía la nueva UI, no esta task (instrucción explícita del operador 2026-05-31).

## Detailed Spec

**SSOT del monto acordado** = `contractor_engagements.rate_amount` (+ `rate_type` + `payment_cadence` + `currency`). Todo consumer (composer, payable, comprobante TASK-960, read-model TASK-959/961) lee de ahí; nadie recomputa.

**Semántica por `rate_type`** (define el "esperado por pago"):
| `rate_type` | "monto esperado por pago" |
|---|---|
| `fixed` (+ cadence monthly/biweekly/…) | `rate_amount` por período de la cadencia |
| `hourly`/`daily` (timesheet) | `quantity × rate_amount` |
| `milestone`/`project` | `rate_amount` por hito/proyecto declarado |
| `retainer` | `rate_amount` por período de la cadencia |

**Guardrail (Slice 3)** — `payment_exceeds_agreed_amount`: el payable cuyo bruto excede el "esperado por pago" (con tolerancia configurable) entra `blocked` salvo override auditado. Espejo exacto del patrón waiver de TASK-793 (`payment_profile_waiver_reason` + capability + maker-checker). NO es un cap acumulado (eso es follow-up).

**Boundary payroll (TASK-957/794)**: el monto acordado es el **bruto del contractor**; la retención SII (15.25% 2026) la aplica el payable (TASK-794) — esta task NO calcula retención ni toca payroll. NUNCA mutar `contract_type` a `'honorarios'`.

**Sinergia TASK-965**: cuando el Unified Worker Create/Edit Workflow aterrice, debe **componer** este editor (mismo store + endpoint + audit), no duplicarlo. El form de esta task nace como pieza reusable.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (editor — cierra el gap inmediato, desbloquea setear la tarifa) → Slice 2 (default/soft-warn — consume el rate) → Slice 3 (guardrail fail-closed — necesita el rate seteado) → Slice 4 (signals + cierre). Orden estricto: nada del guardrail tiene sentido sin la tarifa seteable primero.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Tocar el motor de payroll por error | payroll | low | boundary TASK-957 + gate `pnpm vitest run src/lib/payroll` | rojo de tests |
| Guardrail bloquea pagos legítimos | finance | medium | fail-closed con override auditado (razón + capability), tolerancia configurable | signal exceeds_agreed_amount |
| Tarifa seteada inconsistente con la cadencia | finance | medium | validación en el form + CHECK (rate_amount > 0) | signal rate_unset |
| Recompute inline del monto en consumers | arch | low | SSOT engagement + lectura directa; review | — |
| Duplicar el editor en TASK-965 | arch | medium | declarar sinergia/absorción en ambos specs | revisión humana |

### Feature flags / cutover

- Slice 3 (guardrail) detrás de flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (default OFF) hasta validar que no bloquea pagos legítimos en staging. Slices 1-2 son aditivos sin flag (UI nueva + read-only).

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| Slice 1 (editor) | revert PR (UI + reuse endpoint, sin migración) | sí |
| Slice 2 (default/warn) | revert PR | sí |
| Slice 3 (guardrail) | flag OFF + revert PR (migración aditiva → migrate:down) | sí |
| Slice 4 (signals) | revert PR | sí |

## Acceptance Criteria

- [ ] HR puede setear/editar `rate_amount`/`rate_type`/`payment_cadence`/`currency` de un engagement desde el workbench, con audit append-only y capability — reusando `updateContractorEngagement` (sin store nuevo).
- [ ] El monto acordado pre-llena el bruto del work submission y se muestra read-only al contractor; si falta, degrada honesto (no crash).
- [ ] Existe un guardrail fail-closed en el payable que bloquea pagar por encima de lo acordado, overridable con razón + capability (maker-checker), detrás de flag.
- [ ] Reliability signal detecta engagements engaged sin tarifa (`rate_unset`) y overrides del guardrail.
- [ ] El comprobante (TASK-960) y el read-model (TASK-959/961) leen el monto del engagement (SSOT) sin recomputar.
- [ ] Cero cambios al motor de payroll, a `payroll_entries` o a `contract_type` (gate `pnpm vitest run src/lib/payroll` verde).

## Verification

- `pnpm lint` · `pnpm exec tsc --noEmit`
- `pnpm vitest run src/lib/contractor-engagements`
- `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013)
- Verificación visual del form + soft-warn + guardrail (Playwright + agent auth) — patrón real-artifact.

## Closing Protocol

- [ ] `Lifecycle` sincronizado · archivo en carpeta correcta · `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md`
- [ ] arch Delta `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1`
- [ ] CLAUDE.md invariants si emergen reglas duras
- [ ] doc funcional + manual del editor de compensación
- [ ] chequeo de impacto cruzado (TASK-960, TASK-959/961, TASK-965, TASK-338/340)

## Follow-ups

- **Tope acumulado (ceiling total/anual)** con enforcement sobre la suma de pagos — control financiero (encumbrance/commitment accounting). Task derivada.
- **Versionado efectivo-datado de la tarifa** (estilo `compensation_versions` con proration) — task derivada si emerge necesidad real de historia/proration.
- **Absorción en TASK-965** (Unified Worker Create/Edit Workflow) — el editor se compone en el write-path unificado People-first.

## Open Questions

- **¿La tarifa es valor-vigente o efectivo-datada?** RESUELTO V1: valor vigente en el engagement + audit event en `contractor_engagement_events`. Rationale (arch reversibility + YAGNI): additivo, se promueve a tabla versionada solo si proration mid-período se vuelve necesidad real. Versionado = follow-up.
- **¿El guardrail es por período o acumulado?** RESUELTO V1: **por período** (fail-closed + override auditado). El **tope acumulado** (total/anual) es follow-up declarado — es un control financiero más pesado (variance + encumbrance) que requiere su propio modelado.
- **¿Tolerancia del guardrail?** Decisión en Plan Mode: tolerancia configurable (e.g. 0% estricto vs 5% por redondeos/bonos) — nace con un default conservador (estricto) + override.
