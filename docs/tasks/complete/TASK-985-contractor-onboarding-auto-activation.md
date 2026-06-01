# TASK-985 — Contractor Onboarding Auto-Activation (no más draft huérfano)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Complete (2026-06-01) — develop, no pusheado`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790, TASK-956, TASK-976 (todas complete)`
- Branch: `develop` (trabajo directo por instrucción del operador 2026-06-01)
- Legacy ID: `none`

## Summary

Al onboardear un contractor (Camino A nuevo + Camino B empleado→contractor), el engagement nace en `draft` y **nadie lo avanza** → queda huérfano ("creé el contractor pero no está activo"). Este fix: el onboarding **auto-activa** el engagement (`draft → active`) cuando la clasificación **no es bloqueante** (`clear`/`needs_review`); solo queda retenido cuando es **bloqueante** (`legal_review_required`/`blocked`). Salvedad: nueva señal de `needs_review` pendiente para que la revisión igual ocurra. UI del wizard refleja el estado real (activo / retenido), no "Borrador" fijo.

## Why This Task Exists

Diagnóstico (caso Valentina `EO-CENG-0001`, draft): el `draft` **NO es una compuerta de compliance** — el CHECK `contractor_engagements_active_requires_clear_risk` solo bloquea `active` para `legal_review_required`/`blocked`, **NO** para `needs_review`. El `draft` es simplemente el estado inicial que el onboarding nunca avanza. Auto-activar cuando no es bloqueante es consistente con el contrato real del state machine + resuelve el sinsentido operativo, manteniendo la compuerta dura donde importa (riesgo bloqueante de reclasificación). Decisión validada con `arch-architect` + `greenhouse-ux` + aprobación del operador 2026-06-01 (Opción A).

## Goal

- Onboarding (A + B) deja el engagement `active` cuando la clasificación no es bloqueante.
- Riesgo bloqueante (`legal_review_required`/`blocked`) → queda retenido (`draft`) con motivo, sin cambio.
- `needs_review` en engagements no terminales queda **visible** (señal) para no olvidar la revisión.
- El wizard muestra el resultado real (activo / retenido), no "Borrador" fijo.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `CLAUDE.md` → "Contractor Engagements invariants (TASK-790)" + "Employee→Contractor connected command (TASK-956)"

Reglas obligatorias:

- NUNCA activar con riesgo bloqueante — el guard `isClassificationRiskBlocking` + CHECK DB son la única compuerta dura; se respetan.
- NUNCA mutar `member.contract_type` / finiquito / offboarding (hard rule TASK-890/957). La activación toca solo `contractor_engagements.status`.
- La auto-activación es **opt-in explícito** (`activateWhenClassificationNotBlocking`) — los callers existentes (seeds/tests) no cambian de comportamiento.

## Dependencies & Impact

### Depends on

- `createContractorEngagement` + `transitionContractorEngagement` (TASK-790), `transitionEmployeeToContractorEngagement` (TASK-956), onboarding wizard (TASK-976). Todas complete.

### Files owned

- `src/lib/contractor-engagements/store.ts` (helper + opt-in flag)
- `src/lib/contractor-engagements/types.ts` (input flag)
- `src/lib/contractor-engagements/transition-from-employee.ts` (pass flag + heal already_complete)
- `src/app/api/hr/contractors/route.ts` (Camino A opt-in)
- `src/lib/reliability/queries/contractor-engagement-classification-review-pending.ts` (nuevo signal)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up)
- `src/views/greenhouse/contractors/ContractorOnboardingWizard.tsx` + `src/lib/copy/contractor-compensation.ts` (copy del resultado real)

## Scope

### Slice 1 — Backend auto-activation

- Helper canónico `activateEngagementIfNotBlocking(client, engagement, actorUserId)` (draft→active si `!isClassificationRiskBlocking`; event `status_changed` + outbox `contractorEngagementActivated`; no-op si ya active o bloqueante).
- `CreateContractorEngagementInput.activateWhenClassificationNotBlocking?: boolean` (default false). `runCreateContractorEngagement` lo aplica tras el INSERT.
- Transition: `createEngagementOnRelationship` pasa el flag; branch `already_complete` cura el draft existente (heal) vía el helper.
- Camino A route: pasa el flag true.
- Predicado puro `shouldAutoActivateOnOnboard(status)` + tests.

### Slice 2 — Observabilidad (salvedad)

- Signal `hr.contractor_engagement.classification_review_pending` (kind=data_quality, moduleKey=identity, warning si >0): engagements no terminales con `classification_risk_status='needs_review'` (worklist de revisión pendiente; los activos-sin-revisar son los relevantes). Reader + wire-up + test.

### Slice 3 — UI del wizard (resultado real)

- Copy: `confirmStepCreateEngagement` / `confirmStepDraftReview` → reflejan auto-activación condicional; `outcomeDraftNote` → condicional al status real.
- `OutcomePanel` muestra el `engagement.status` real (Activo / Retenido para revisión legal / Borrador) en vez de "Borrador" fijo.
- GVC del outcome del wizard (estados activo + retenido).

## Out of Scope

- Rediseño del wizard (el flujo se mantiene; solo se hace truthful el resultado).
- Capturar el monto dentro del wizard (TASK-968 lo cubre por UI aparte).
- Mutar la data real de Valentina (se hará con confirmación del operador, aparte).

## Rollout Plan & Risk Matrix

Aditivo + opt-in. Reversible por revert.

| Riesgo | Sistema | Prob | Mitigación |
|---|---|---|---|
| Activar con riesgo bloqueante | classification gate | Baja | `isClassificationRiskBlocking` + CHECK DB; helper no-op si bloqueante |
| Cambiar comportamiento de callers existentes de createContractorEngagement | seeds/tests | Baja | Flag opt-in default false |
| Activar engagement sin rate (rate_amount null) | payables | Baja | rate_unset es señal (warning), no lock; el guardrail de pago es en el payable (TASK-968) |

Rollback: revert del PR. Sin migración, sin flag de runtime, sin cutover.

## Acceptance Criteria

- [x] Onboarding A + B con clasificación no bloqueante → engagement `active` (opt-in `activateWhenClassificationNotBlocking` + `activateEngagementIfNotBlocking`).
- [x] Clasificación bloqueante (`legal_review_required`/`blocked`) → engagement retenido (`draft`); el helper es no-op (guard + CHECK DB).
- [x] Re-onboardear (`already_complete`) un draft no bloqueante lo cura a `active` (heal en el branch).
- [x] Señal `hr.contractor_engagement.classification_review_pending` (data_quality, identity) cuenta `needs_review` no terminales + activos.
- [x] Wizard `OutcomePanel` muestra el estado real (Activo / Retenido), no "Borrador" fijo; confirmación + GuidancePanel truthful.
- [x] Boundary intacto: contractor+payroll+offboarding **728** verde; member/finiquito/offboarding sin tocar.
- [ ] **Live en staging (pendiente push + operador)**: re-onboardear Valentina `EO-CENG-0001` → heal a `active`. Requiere push a `develop` (auto-deploy staging) + confirmación de fecha real (01-05 vs 01-06) + monto.

## Verification

- `pnpm exec tsc --noEmit` / `pnpm lint` / `pnpm build`
- `pnpm vitest run src/lib/contractor-engagements src/lib/payroll src/lib/workforce/offboarding`
- Live PG smoke + GVC del outcome del wizard.

## Closing Protocol

- [ ] Lifecycle + folder + README + registry sincronizados.
- [ ] Handoff + changelog.
- [ ] CLAUDE.md invariant + arch Delta.
