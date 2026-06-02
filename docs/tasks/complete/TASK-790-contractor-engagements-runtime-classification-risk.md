# TASK-790 — Contractor Engagements Runtime + Classification Risk

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Complete (2026-05-29, develop)`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` (TASK-789 ✅ complete — substrate listo)
- Branch: `develop` (operator instruction 2026-05-29: trabajar in-place en develop, no crear rama)
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-05-27

Revisión arquitectura + payroll antes de tomar. El substrate canónico shippeó después de redactar esta task; el header estaba desactualizado.

- **Desbloqueada.** `TASK-789` ✅ complete: `transitionEmployeeToContractor()` + helpers en `src/lib/person-legal-entity-relationships/**` ya existen. `TASK-890` ✅ (exit eligibility, lane `relationship_transition`) y `TASK-891` ✅ (`reconcileMemberContractDrift`) también shippearon. Los tres son el substrate que 790 integra.
- **Conexión con TASK-890 (exit eligibility).** 890 es la compuerta de SALIDA (excluye al colaborador transicionado del payroll dependiente mensual vía lane `relationship_transition`); 790 es el modelo de ENTRADA (cómo se le paga como contractor). Llave compartida: el mismo `person_legal_entity_relationship_id`. Cero solapamiento — 890 nunca paga, 790 nunca toca `payroll_entries`.
- **Decisión D1 (anchor).** El engagement hace FK a la relación contractor **activa** vía el reader canónico de `src/lib/person-legal-entity-relationships/store.ts`. NO crea relaciones (eso es 789/891). Slice 2 consume helpers existentes, no los recrea.
- **Decisión D2 (subtype SSOT).** Alinear vocabulario: 789/store persiste `metadata.relationshipSubtype` (ej. `honorarios`); 790 propone columna `relationship_subtype` (ej. `honorarios_cl`). El engagement **deriva** el subtype de la relación o lo declara como SSOT propio — decidir UNO; no pueden divergir. Reconciliar `honorarios` vs `honorarios_cl`.
- **Decisión D3 (payroll_via ortogonal).** `contractor_engagements.payroll_via` es el canal del engagement; es dimensión **distinta** de `members.payroll_via` (que el motor payroll usa para clasificar régimen y la lane `external_payroll` de 890 consume). 790 **NUNCA** sobrescribe `members.payroll_via`.
- **Decisión D4 (flag posture).** La exclusión dependiente de 890 vive detrás de `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (default OFF). La readiness/classification de 790 no debe asumir que la exclusión está siempre activa.
- **Scope real.** 790 sola no paga a nadie — es la fundación. El canal de pago requiere `TASK-791` (assets) → `TASK-792` (work submissions) → `TASK-793` (bridge a Finance).

## Summary

Implementar `ContractorEngagement` como agregado canonico para contratos contractor/honorarios: payment model, cadence, scope, tax/compliance owner, provider refs, classification risk y lifecycle.

## Why This Task Exists

Sin engagement canonico, contractor queda entre payroll legacy, payment profiles, expenses y notas manuales. Esto impide readiness, auditoria, approvals y separacion correcta entre Chile honorarios, contractor internacional directo, provider contractor y EOR.

## Goal

- Crear schema/runtime para `greenhouse_hr.contractor_engagements`.
- Modelar fixed, PAYG, milestone, weekly/on-invoice and provider-owned lanes.
- Hacer first-class el riesgo de reclasificacion laboral.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Contractor engagement lives under Workforce/HR, not Payroll.
- Payroll can consume compatibility snapshots, but does not own contractor payables.
- Classification risk can block approval/payment readiness.

## Dependencies & Impact

### Depends on

- `TASK-789` ✅ complete — relationship transition + `person-legal-entity-relationships` helpers (substrate del anchor D1).
- `TASK-784` ✅ for person legal identity.
- `TASK-787` for declared/tax country reconciliation when available.

### Integrates with (shipped substrate)

- `TASK-890` ✅ exit eligibility — compuerta de salida del payroll dependiente (lane `relationship_transition`). Comparte `person_legal_entity_relationship_id` con el engagement. Ver Delta D-conexión.
- `TASK-891` ✅ relationship drift reconciliation (`reconcileMemberContractDrift`) — segundo path que abre relación contractor; el engagement debe anclar a la relación activa sin importar cuál la creó.

### Blocks / Impacts

- Blocks `TASK-791` to `TASK-798`.
- Impacts HR profile, People 360, entitlements and payroll exclusion logic.

### Files owned

- `migrations/**`
- `src/lib/contractor-engagements/**`
- `src/app/api/hr/contractors/**`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`

## Current Repo State

### Already exists

- `src/types/hr-contracts.ts` models `honorarios`, `contractor`, `eor`.
- Payroll skill and architecture define classification boundaries.
- Payment profiles/orders foundation exists downstream.

### Gap

- No source aggregate for contractor contracts, payment cadence, tax owner or risk review.

## Scope

### Slice 1 — Schema and types

- Add `contractor_engagements` with lifecycle, relationship refs, payment model, currency, tax owner, provider refs and risk status.
- Add audit/event table if local pattern requires it.

### Slice 2 — Runtime helpers/readers

- Create canonical readers and mutations using repo DB primitives.
- Add idempotent create/update/pause/end commands.
- **D1 anchor**: resolver la relación contractor activa vía el reader canónico de `src/lib/person-legal-entity-relationships/store.ts`. El engagement hace FK a esa relación; NO crea relaciones (eso es 789/891).
- **D3 payroll_via**: `contractor_engagements.payroll_via` es el canal del engagement, ortogonal a `members.payroll_via`. NUNCA sobrescribir `members.payroll_via`.

### Slice 3 — Classification risk gates

- Implement deterministic risk flags for red flags from architecture.
- Add legal review required status and readiness blocker.

### Slice 4 — Access model

- Add capabilities for read/manage/review classification.
- Keep routeGroups/views separate from entitlements.
- **Grant coverage (TASK-873/935 invariant)**: toda capability seedeada en catalog + `capabilities_registry` DEBE recibir su grant en `src/lib/entitlements/runtime.ts` en el MISMO PR, o `capability-grant-coverage.test.ts` rompe el build. Verificar que el rol documentado exista en `src/config/role-codes.ts` (si no, colapsar a `EFEONCE_ADMIN`/`FINANCE_ADMIN`).

## Payroll Non-Regression Guardrails (hard rules)

TASK-790 vive bajo Workforce/HR y **no debe romper Payroll**. El motor de nómina dependiente clasifica régimen por `members.{contract_type, pay_regime, payroll_via}` y materializa `payroll_entries`; cualquier mutación cruzada desde el engagement corrompe clasificación, deducciones, retención, finiquito o roster. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** escribir, mutar ni leer-para-escribir `greenhouse_payroll.payroll_entries` desde el engagement. Contractor payables jamás entran como `payroll_entries` (nacen en 791-793 hacia Finance, no en payroll).
- **NUNCA** usar `payroll_adjustments` para pagar semanas, hitos, proyectos o boletas de contractor.
- **NUNCA** crear `compensation_versions` desde `contractor_engagements`.
- **NUNCA** habilitar `final_settlements` / `final_settlement_documents` ni el flujo "Calcular finiquito" para contractor/honorarios. Su cierre futuro es `contractor_closure` (TASK-797), no finiquito laboral dependiente.
- **NUNCA** aplicar deducciones Chile dependientes (AFP, Fonasa/Isapre, AFC, SIS, mutual, IUSC) a honorarios. Solo retención SII versionada (`tax_withholding_policy_code`), tasa 2026 = 15.25% — verificar contra `src/types/hr-contracts.ts` (`SII_RETENTION_RATES`).
- **NUNCA** sobrescribir `members.payroll_via`, `members.contract_type` ni `members.pay_regime` (D3). El engagement declara su propio canal; el motor payroll sigue clasificando por las columnas del member.
- **NUNCA** reactivar la relación dependiente cerrada ni asumir que la exclusión de payroll de TASK-890 está siempre activa (vive tras `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`, default OFF) (D4).
- **NUNCA** tocar fórmulas Chile (`calculate-chile-deductions`, `compute-chile-tax`, `chile-previsional-helpers`) ni el cálculo mensual. A lo sumo tests focales que prueben no-regresión.
- **SIEMPRE** correr la suite payroll completa como gate de cierre (`pnpm vitest run src/lib/payroll`) para probar que el engagement no rompió clasificación, roster ni cálculo. Cero deltas inesperados.

## Out of Scope

- Invoice upload/assets (TASK-791).
- Payables bridge (TASK-793).
- Full UI self-service (TASK-796).
- Legal advice or global tax engine.
- **Honorarios legacy migration**: 790 modela engagements nuevos. NO migra payroll honorarios existente hacia Contractor Payables (convergencia futura, fuera de V1).

## Acceptance Criteria

- [x] `ContractorEngagement` can be created for an active contractor relationship. — `createContractorEngagement` resuelve y valida el anchor activo (`loadActiveContractorAnchor`) vía FK a `relationship_id`.
- [x] Payment model and cadence are explicit and validated. — CHECK enums DB + `requireEnum` en API + types `CONTRACTOR_PAYMENT_MODELS`/`CONTRACTOR_PAYMENT_CADENCES`.
- [x] Tax/compliance owner is mandatory. — `tax_compliance_owner` NOT NULL + default `resolveDefaultTaxComplianceOwner`.
- [x] Classification risk status is computed/stored and can block readiness. — `computeClassificationRisk` + CHECK `active_requires_clear_risk` + app guard (auto-pause on escalation).
- [x] Events/audit capture material lifecycle changes. — append-only `contractor_engagement_events` (anti-UPDATE/DELETE) + outbox v1 events.
- [x] Payroll non-regression probado: suite `src/lib/payroll` verde (522 passed, 0 failed), sin escritura a `payroll_entries`/`payroll_adjustments`/`compensation_versions`/`final_settlements`, sin mutar `members.{payroll_via,contract_type,pay_regime}`.

## Closing Note (2026-05-29)

Implementado en `develop` (sin rama, instrucción del operador). 4 slices + close.

- **Slice 1** migration `20260529221452562` (commit Slice 1) — schema + state machine trigger + risk-gate CHECK + audit triggers + GRANTs + anti pre-up-marker guard.
- **Slice 2** `src/lib/contractor-engagements/` — types + pure helpers (state-machine, subtype-consistency D2, classification-risk, tax-policy) + store (anchor/idempotent commands + outbox v1) + 27 unit tests.
- **Slice 3** reliability signal `hr.contractor_engagement.classification_risk_open` (moduleKey identity, steady=0) wired into `getReliabilityOverview`.
- **Slice 4** capabilities `hr.contractor_engagement` + `hr.contractor_classification` (catalog + runtime grants, grant-coverage guard verde) + API `/api/hr/contractors` (+ `[id]`).

**Gates verdes**: tsc 0 · full lint 0 · `pnpm build` (ambas rutas compiladas) · `pnpm test` 5531 passed / 0 failed · `pnpm vitest run src/lib/payroll` 522 passed / 0 failed · grant-coverage guard passed · DB defense-in-depth verificado live en transacción rolled-back (transition trigger 23514, risk-gate CHECK 23514, anti-UPDATE/DELETE 23001) · signal live steady=0.

**Skills**: greenhouse-payroll-auditor (PASS), arch-architect (4-pillar: blast radius LOW, reversibilidad HIGH), greenhouse-backend.

**Pendiente (out of scope V1, desbloqueado)**: TASK-791 (invoice assets), TASK-792 (work submissions), TASK-793 (payables → Finance bridge), TASK-797 (contractor closure).

## Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit --pretty false`
- Focused unit tests for readers, mutations and risk gates.
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate (obligatorio al cierre).

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] `changelog.md` updated if behavior visible.
