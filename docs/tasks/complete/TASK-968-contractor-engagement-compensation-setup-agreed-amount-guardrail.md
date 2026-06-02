# TASK-968 — Contractor Engagement Compensation Setup + Agreed-Amount Guardrail

## Delta 2026-05-31 — SHIPPED (4 slices)

Implementado en `develop` (no branch, per instrucción del operador). SoD dura: **HR fija ≠ contractor cobra ≠ Finance paga**.

- **Slice 1** (`25f7d2ec`) — Admin compensation editor: `ContractorEngagementCompensationDrawer` + `CompensationPanel` en el workbench; engagements sin rate alcanzables vía filtro `missingRate` + status "Falta compensación"; moneda read-only. `compensation-display.ts` + copy `GH_CONTRACTOR_COMPENSATION`.
- **Slice 2** (`8e3eb5f5`) — Contractor deriva el bruto: removido el campo libre "Monto bruto" del composer; bruto derivado read-only del rate (fixed → rate; timesheet → qty × rate); self-service muestra "Monto acordado" read-only; projection expone `agreedRate`.
- **Slice 3** (`21655075`) — Guardrail fail-closed: gate `payment_exceeds_agreed_amount` (flag `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` default OFF; solo `PERIOD_AGREED_RATE_TYPES`); migración additive `agreed_amount_override_reason` (`20260531160513123`); capability `finance.contractor_payable.override_agreed_amount` (admin-only, SoD); endpoint `POST /api/finance/contractor-payables/[id]/override-agreed-amount` + helper `overridePayableAgreedAmount`; UI `ContractorGuardrailPanel` (panel + dialog override); 6 tests focales.
- **Slice 4** (`380a2e7e`) — 2 reliability signals: `hr.contractor_engagement.rate_unset` (identity, data_quality) + `finance.contractor_payable.exceeds_agreed_amount` (finance, drift); smoke live verde (rate_unset = warning 1, Valentina `EO-CENG-0001`).

Gates de cierre: `pnpm test` full (5678 passed) + `pnpm build` + `pnpm vitest run src/lib/payroll` (no-regresión EPIC-013/TASK-957). Valentina queda con `rate_amount=null` a propósito (el operador fija los $600k vía la UI). Invariantes: `CLAUDE.md` → "Contractor Agreed-Amount SoD + Guardrail invariants (TASK-968)". Arch Delta: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`. Docs: `docs/documentation/hr/contratistas-compensacion.md` + manual `docs/manual-de-uso/hr/contratistas.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `hr|finance|ui`
- Blocked by: `none`
- Branch: `task/TASK-968-contractor-engagement-compensation-setup`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy **no existe superficie para setear el monto acordado de pago de un contractor** (`contractor_engagements.rate_amount`). El campo existe en el schema (TASK-790) y hay endpoints de escritura (`POST /api/hr/contractors`, `PATCH /api/hr/contractors/[id]`), pero **ningún formulario en la UI** lo expone — los engagements creados por la transición desde offboarding (TASK-956) nacen con `rate_amount = NULL` (caso real: Valentina Hoyos `EO-CENG-0001`, honorarios CL, acordado 600k mensual, hoy `rate_amount=null`). Sin tarifa acordada: el contractor **escribe a mano** el monto bruto en el composer de envíos (TASK-792) sin validación, no hay default, no hay control de "no pagar más de lo acordado", y el comprobante (TASK-960) termina mostrando un monto sin respaldo de un acuerdo registrado.

Esta task agrega: (1) un **editor de compensación del engagement** (form HR en el workbench) para setear/editar `rate_amount`/`rate_type`/`payment_cadence`/`currency`; (2) que el monto del pago se **derive** del monto acordado (admin-set) y se muestre **read-only al contractor** — el contractor declara el trabajo (período/evidencia/cantidad), **nunca el monto**; (3) un **guardrail fail-closed en el payable** que bloquea pagar por encima de lo acordado (override con razón + capability, maker-checker). **No toca el motor de payroll, no muta `contract_type`** (boundary TASK-957), y queda forward-compat con el futuro write-path unificado de TASK-965.

**Principio de control (segregación de funciones):** el monto acordado se **acuerda y setea exclusivamente desde las vistas admin (HR)**. El contractor **NUNCA** lo define ni lo edita — su input es la evidencia/cantidad del trabajo, no la plata. Esto cierra el anti-patrón actual (el composer deja al contractor escribir cualquier `grossAmount`) y alinea SoD: quien fija la tarifa (HR) ≠ quien la cobra (contractor) ≠ quien paga (Finance).

## Why This Task Exists

El programa contractor (TASK-790→796) modela engagement, evidencia, work submissions, payable, bridge a Finance y comprobante (TASK-960) — pero **dejó sin superficie el dato más básico del acuerdo: cuánto se le paga al contractor**. El `rate_amount` vive en el schema pero:

- **No hay form para setearlo** → los engagements quedan con `rate_amount=null` (Valentina). El operador "no sabe dónde poner el monto" (reporte directo 2026-05-31).
- **El monto del pago nace sin control**: el composer (`ContractorSubmissionComposer`) deja escribir cualquier `grossAmount` libre; solo el timesheet deriva `quantity × rate_amount_snapshot` — y eso requiere el rate seteado.
- **No existe "monto máximo acordado / tope"**: nada impide pagar de más respecto a lo pactado. Es un control de commitment/variance (finance) + segregación de funciones (quien fija la tarifa ≠ quien paga) que hoy no existe.

El comprobante (TASK-960) es read-only y muestra lo que el payable resolvió; si el payable nace de un monto a mano sin acuerdo, el comprobante hereda esa fragilidad. Esta task cierra el eslabón aguas arriba.

## Goal

- Que HR pueda **setear y editar el monto acordado** del engagement (`rate_amount` + `rate_type` + `payment_cadence` + `currency`) desde la UI del workbench, con audit append-only y capability, reusando el `updateContractorEngagement` existente (NO un store nuevo).
- Que el bruto del work submission se **derive del monto acordado** (admin-set) — fixed/monthly → `rate_amount`; timesheet → `quantity × rate` — y sea **read-only para el contractor** (el contractor declara trabajo/cantidad, nunca el monto). El monto acordado se acuerda y setea **solo desde las vistas admin (HR)**.
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

- **NUNCA** permitir que el contractor defina o edite el monto del pago. El monto acordado se **acuerda y setea exclusivamente desde las vistas admin (HR)** con capability `hr.contractor_engagement:manage`. El bruto del work submission se **deriva** del monto acordado (no lo escribe el contractor); el campo de monto libre del composer se **remueve/bloquea** para el contractor. SoD: HR fija ≠ contractor cobra ≠ Finance paga.
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

**⚠️ Reglas duras — MOCKUP APROBADO (cablear, NO rehacer)** (operador aprobó 2026-05-31):

El diseño visual de las 3 superficies ya está **resuelto, aprobado y es vinculante**. Vive en `src/views/greenhouse/contractors/mockup/` (`CompensationMockupView.tsx` + `ContractorCompensationDrawer.tsx` + `compensation-data.ts`) + ruta `/hr/contractors/compensation/mockup` + scenario GVC `contractor-compensation`. Verificado en loop GVC (3 iteraciones, 4 frames, 3 estados) con `greenhouse-ux` + `modern-ui` + `forms-ux` + `greenhouse-ux-writing` → sin hallazgos abiertos, nivel enterprise 2026. La implementación **promueve y cabla** ese mockup a datos reales, NO lo reconstruye.

- **NUNCA** rediseñar el editor, el bloque derivado del contractor ni el guardrail desde cero. El mockup es la dirección visual vinculante.
- **NUNCA** cambiar la dirección aprobada: **un acento semántico por superficie** (primary en el editor, info en el derivado del contractor, success/error en el guardrail) — semántico-de-estado, no decorativo. Restraint editorial: sin gradientes, sin elevation en cards internas (outlined), tokens (`customBorderRadius`, spacing scale, DM Sans, `fontVariantNumeric: 'tabular-nums'`, **prohibido monospace**). NO reintroducir colores compitiendo.
- **NUNCA** dejar que el contractor edite el monto. El **campo de monto libre del composer se remueve/bloquea**; el bruto se muestra **derivado read-only** con la leyenda "Según tu compensación acordada. No editable." (SoD expresado en el diseño — es load-bearing, no cosmético).
- **SIEMPRE** promover los componentes del mockup a su lugar canónico preservando el render: `mockup/ContractorCompensationDrawer.tsx` → `src/views/greenhouse/contractors/ContractorEngagementCompensationDrawer.tsx` (runtime), consumiendo el form real (react-hook-form + `PATCH /api/hr/contractors/[id]`). El JSX/estructura/tokens NO cambian; solo cambia la fuente de datos (mock → engagement real) y el submit (mock state-machine → server action + audit).
- **SIEMPRE** preservar las **microinteracciones aprobadas** (todas reduced-motion-aware): `AnimatedCounter` en montos, save state-machine (spinner→check), hover lift, fade entre estados, pulso de atención en el breach, stagger reveal al montar. Reusar los wrappers canónicos (`@/libs/FramerMotion`, `@/components/greenhouse/AnimatedCounter`, `useReducedMotion`).
- **SIEMPRE** mover el copy es-CL inline del mock (labels, helpers, CTAs, leyendas SoD) a `src/lib/copy/*` (TASK-265) — el contenido de los strings está aprobado; solo cambia dónde viven. Validar con `greenhouse-ux-writing`.
- **SIEMPRE** que la superficie real difiera del mockup aprobado (p. ej. un campo extra que el runtime exige), actualizar el mockup + re-aprobar visualmente vía GVC ANTES de mergear — el mockup es el contrato visual.

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
- **Mockup APROBADO (vinculante, 2026-05-31)** — el diseño visual de las 3 superficies ya está resuelto + aprobado + verificado GVC (enterprise 2026). La implementación lo cabla, NO lo rehace:
  - `src/views/greenhouse/contractors/mockup/CompensationMockupView.tsx` — showcase de las 3 superficies × 3 estados (Sin definir / Definido / Excede acuerdo) con la dirección visual vinculante.
  - `src/views/greenhouse/contractors/mockup/ContractorCompensationDrawer.tsx` — el editor (drawer) admin: form single-column + preview derivado + save state-machine.
  - `src/views/greenhouse/contractors/mockup/compensation-data.ts` — tipos (`CompensationFormValue`, `CompensationMock`) + opciones (rate_type/cadence/currency) + builder por estado. El shape ES el contrato.
  - `src/app/(dashboard)/hr/contractors/compensation/mockup/page.tsx` — ruta del mockup.
  - `scripts/frontend/scenarios/contractor-compensation.scenario.ts` — scenario GVC de regresión visual (4 frames, 3 estados + drawer).

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

### Slice 2 — Bruto derivado del monto acordado (contractor no lo define)

- **Remover/bloquear el campo de monto libre del composer** (`ContractorSubmissionComposer`, hoy `grossAmount` editable). El contractor declara solo **trabajo**: período, evidencia, y `quantity` cuando el `rate_type` es timesheet (hourly/daily). El monto **no es input del contractor**.
- El bruto se **deriva server-side del monto acordado** (admin-set): fixed/monthly/retainer → `rate_amount`; timesheet → `quantity × rate_amount`; milestone/project → `rate_amount` por hito declarado. El composer muestra el bruto **read-only** (calculado) + el monto acordado de referencia.
- Si `rate_amount` es null → el composer **no permite declarar monto** y muestra hint "Tu engagement aún no tiene monto acordado definido; contacta a HR" (degradación honesta, no crash). HR lo setea en Slice 1.
- Ajustes/excepciones al monto (bonus, descuento puntual) son **acción admin** (off-cycle payable o override Slice 3), nunca input del contractor.

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

**Mapping mockup aprobado → implementación (cablear, NO rehacer)**:

| Mockup aprobado (existe) | Implementación canónica (cablear) | Qué cambia |
|---|---|---|
| `mockup/compensation-data.ts` → `CompensationFormValue` type | `src/lib/contractor-engagements/types.ts` (ya existe en `ContractorEngagement`) | El shape del form mapea 1:1 a los campos del engagement; reusar, no duplicar. |
| `mockup/ContractorCompensationDrawer.tsx` (form + save state-machine simulada) | `src/views/greenhouse/contractors/ContractorEngagementCompensationDrawer.tsx` | Promover sin tocar JSX/tokens/microinteracciones; react-hook-form + `PATCH /api/hr/contractors/[id]` real + audit event. Save state-machine pasa de `setTimeout` a la respuesta del server action. |
| `mockup/CompensationMockupView.tsx` Surface A (panel "Compensación") | integración en `ContractorAdminWorkbenchView.tsx` (`AdminInspector`) | Replicar el panel + CTA "Editar compensación" en el Inspector real; el monto sale de la projection (read-only number). |
| `mockup/CompensationMockupView.tsx` Surface B (derivado read-only) | `ContractorSelfServiceView.tsx` + `ContractorSubmissionComposer.tsx` | Reemplazar el campo de monto libre por el bloque derivado read-only (Slice 2). El cálculo sale del rate acordado server-side. |
| `mockup/CompensationMockupView.tsx` Surface C (guardrail + override dialog) | `ContractorAdminWorkbenchView.tsx` + `payables/readiness.ts` | Wire del gate `payment_exceeds_agreed_amount` + dialog de override con razón ≥10 (Slice 3, espejo waiver TASK-793). |
| copy es-CL inline del mock (`COPY`, labels, leyendas SoD) | `src/lib/copy/*` (TASK-265, namespace nuevo) | Strings aprobados; solo cambia dónde viven. |
| `scenarios/contractor-compensation.scenario.ts` | reusar tal cual como regresión visual post-implementación | Apuntar a las superficies reales cuando dejen de ser mock. |

El agente que implemente: parte del mockup aprobado, NO de cero. La verificación visual final (real-artifact loop) compara las superficies reales contra el mockup aprobado (debe ser idéntico en dirección visual + microinteracciones).

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
- [ ] El monto acordado se setea SOLO desde las vistas admin (HR); el contractor NUNCA lo define ni edita. El bruto del work submission se deriva del monto acordado y es read-only para el contractor; si falta, degrada honesto (no crash).
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

## Delta 2026-05-31 — MOCKUP APROBADO

Mockup de las 3 superficies plasmado y **APROBADO por el operador**: ruta TSX real `src/views/greenhouse/contractors/mockup/` (`CompensationMockupView` + `ContractorCompensationDrawer` + `compensation-data`) + ruta `/hr/contractors/compensation/mockup` + scenario GVC `contractor-compensation`. **Planificado con las 4 skills de product design** (greenhouse-ux + modern-ui + forms-ux + greenhouse-ux-writing) y **verificado en loop GVC** (3 iteraciones, 4 frames, 3 estados Sin definir/Definido/Excede). 2 hallazgos cerrados en el loop: (1) el drawer no cargaba el monto actual al abrir → init-on-open; (2) timing de captura del guardrail → sleep steps. Polish "modern 2026": stagger reveal al montar + pulso en el breach. Dirección visual vinculante: **un acento semántico por superficie**, restraint editorial, tokens, SoD expresado en el diseño (editor admin / "No editable" contractor / guardrail Finance), microinteracciones reduced-motion-aware (AnimatedCounter, save state-machine, hover lift, fade, breach pulse, stagger). Calidad: tsc 0 · eslint 0 · local:check EXIT=0 · design:lint 0/0. Commit `f7f26fce`. **La implementación cabla estos mockups, NO los rehace** — ver mapping en Detailed Spec + reglas duras "MOCKUP APROBADO" en Architecture Alignment.
