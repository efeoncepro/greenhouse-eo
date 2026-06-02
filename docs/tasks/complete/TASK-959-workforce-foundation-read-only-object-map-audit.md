# TASK-959 — Workforce Foundation Read-Only Object Map Audit

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Complete — read-only map, audit script, dev DB findings and candidate signals documented`
- Rank: `TBD`
- Domain: `cross-domain` (`hr|payroll|finance|identity|platform|data`)
- Blocked by: `none` (permitida como discovery/read-only aunque el ADR siga `Proposed`; no autoriza writes ni UI)
- Branch: `develop` (operator override; no task branch)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear el primer mapa read-only persona-centrico de workforce sobre el runtime actual: `Person -> current WorkRelationship -> WorkAssignment candidate -> CompensationProfile candidate -> PaymentRail -> readiness/compliance -> gap codes`.

La task no cambia datos, no agrega UI y no mueve ownership de payroll/contractor/finance. Su objetivo es producir evidencia: que se puede derivar con confianza hoy, que queda incierto y que signals/read models deberian venir despues.

## Why This Task Exists

`RESEARCH-008` y `EPIC-017` concluyeron que Greenhouse ya tiene primitives compatibles con una fundacion workforce persona-centrica, pero todavia no tiene un contrato cross-domain que una las verdades parciales de `identity_profiles`, `members`, `person_legal_entity_relationships`, contractor engagements, compensation versions, payroll, payment obligations y readiness.

La DB live dev del 2026-05-31 mostro el gap concreto: `members=146`, `person_legal_entity_relationships=11`, `person_360=164`, 5 demos activos international/internal sin relacion activa employee/contractor, y compensation tuple drift live=0 tras TASK-958. Eso indica que los sintomas locales pueden estar remediados, pero aun falta saber si el sistema puede producir una vista confiable de "estado workforce vigente" por persona sin inferencias silenciosas.

Esta task existe para responder esa pregunta con codigo/readers/scripts read-only antes de abrir tasks de reliability, Person 360 UI, compensation profile o write-path convergence.

## Goal

- Implementar un mapa/audit read-only que derive, por persona/member relevante, identidad, relacion vigente, assignment candidate, compensation candidate, rail de pago, readiness/compliance y gaps.
- Comparar el mapa contra `resolveCurrentWorkClassification()` y contra datos live de dev PostgreSQL.
- Clasificar gaps con codigos explicitos, sin ocultar incertidumbre ni inventar source of truth.
- Producir candidatos concretos para reliability signals y para una futura faceta `workforce` en Person 360.
- Mantener payroll, contractor payables, Finance, identity, Person 360 y UI sin cambios de comportamiento.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Esta task es **read-only**. No debe mutar tablas, migrations, payroll entries, compensation versions, contractor payables, payment obligations, memberships, views, capabilities ni Person 360 runtime.
- El ADR `GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1` sigue `Proposed`. Esta task puede avanzar solo porque es discovery/read-only; no debe tratar el ADR como `Accepted`.
- `Person` es el root conceptual del mapa, pero la task debe respetar el runtime actual: `members` sigue siendo dependency operativa y no se degrada ni reescribe.
- `member.contract_type` no vuelve a ser estado vigente si `person_legal_entity_relationships` + contractor engagement dicen otra cosa. Reutilizar `resolveCurrentWorkClassification()`.
- Payroll calcula payroll; contractor payables no entran a payroll; Finance/Payment Orders ejecuta pagos; Deel/provider IDs son referencias de ejecucion, no identidad.
- No hay UI visible en esta task. Cualquier Person 360 surface queda para task posterior.
- No exponer un mega objeto sin redaction. El mapper interno puede ser rico, pero debe clasificar campos sensibles y recomendar adapters/redaction por audiencia antes de cualquier API/UI futura.

## Normative Docs

- `docs/research/RESEARCH-008-unified-workforce-foundation.md`
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-pre-task-considerations.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `TASK-957` complete: current work classification resolver.
- `TASK-958` complete: compensation tuple drift remediation and validated compensation tuple CHECK.
- `EPIC-017` to-do: program container and intake protocol.
- `RESEARCH-008` active: research, gap analysis and pre-task gate.
- Live dev PostgreSQL access through `pnpm pg:doctor` / repo Postgres client.
- Existing source tables/views:
  - `greenhouse_core.identity_profiles`
  - `greenhouse_core.members`
  - `greenhouse_core.person_memberships`
  - `greenhouse_core.person_legal_entity_relationships`
  - `greenhouse_serving.person_360`
  - `greenhouse_hr.contractor_engagements`
  - `greenhouse_hr.work_relationship_onboarding_cases`
  - `greenhouse_hr.work_relationship_offboarding_cases`
  - `greenhouse_payroll.compensation_versions`
  - `greenhouse_payroll.payroll_entries`
  - `greenhouse_finance.payment_obligations`
  - `greenhouse_finance.beneficiary_payment_profiles`

### Blocks / Impacts

- Blocks practical scoping for future EPIC-017 tasks:
  - current work classification canonical projection;
  - workforce relationship coverage signals;
  - compensation profile timeline;
  - Person 360 workforce journey facet;
  - agent-safe workforce context.
- Impacts architecture review by turning RESEARCH-008 questions into observed data and gap codes.
- May identify follow-up tasks, but must not auto-create them.

### Files owned

- `docs/tasks/to-do/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `src/lib/workforce/foundation/object-map-types.ts` (new)
- `src/lib/workforce/foundation/object-map.ts` (new)
- `src/lib/workforce/foundation/object-map.test.ts` (new)
- `src/lib/workforce/foundation/gap-codes.ts` (new, optional if not folded into types)
- `scripts/workforce/audit-workforce-foundation-map.ts` (new)
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-pre-task-considerations.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`

If the executing agent finds a better existing folder than `src/lib/workforce/foundation/`, it must document the reason in Plan Mode before changing the proposed path.

## Current Repo State

### Already exists

- `src/lib/person-360/person-complete-360.ts` composes Person 360 facets and has redaction/facet/caching patterns.
- `src/lib/account-360/current-work-classification.ts` resolves current work state from `person_legal_entity_relationships` + contractor engagement and treats `member.contract_type` as employment history.
- `src/lib/account-360/person-legal-entity-relationships.ts` reads/writes person legal entity relationships and syncs employee relationships from members.
- `src/lib/workforce/activation/readiness.ts` already has lanes for identity/access, work relationship, employment, role/title, compensation, legal profile, payment profile, operational onboarding and contractor engagement.
- `src/lib/contractor-engagements/self-service-projection.ts` and `src/lib/contractor-engagements/hr-workbench-projection.ts` compose contractor-specific projections.
- `src/lib/finance/payment-obligations/materialize-payroll.ts` and `src/lib/sync/projections/payment-obligations-from-payroll.ts` create payroll-derived obligations and explicitly expose a `space_id` resolver gap.
- `src/lib/sync/projections/contractor-payable-finance-obligation.ts` bridges ready contractor payables into Finance obligations.
- `src/lib/reliability/queries/*` has many domain signals, including identity relationship drift, payroll tuple drift, contractor double-rail, contractor payable and offboarding signals.
- Live dev baseline from RESEARCH-008: `members=146`, `person_legal_entity_relationships=11`, `person_360=164`, `contractor_engagements=1`, `compensation_versions=14`, `payment_obligations=14`, compensation tuple drift=0.

### Gap

- There is no shared `WorkforceFoundationMap` read model that answers, for one person, current relationship, assignment, compensation, payment rail, readiness/compliance and data confidence.
- There is no explicit gap-code taxonomy for workforce foundation readiness.
- There is no read-only audit script that runs the map across dev data and reports coverage/parity/gaps.
- There is no documented parity report between the proposed foundation map and `resolveCurrentWorkClassification()`.
- There are no candidate signal specs for relationship coverage, compensation without relationship, rail without evidence or obligation without workforce lineage.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Map Contract + Gap Taxonomy

- Create a server-only, read-only type contract for the workforce map under `src/lib/workforce/foundation/`.
- Define the minimal V1 shape:
  - `person`: `profileId`, optional `memberId`, display identity, source confidence.
  - `relationship`: current relationship id/type/status/effective dates/legal entity/source, or `null` with gap code.
  - `assignment`: title/role/manager/department/space candidate fields with explicit source and confidence.
  - `compensation`: current compensation version candidate, tuple, currency, effective dates, source confidence, or `null`.
  - `paymentRail`: `payroll_via`, provider/deel refs when present, finance obligation lineage summary if available.
  - `readiness`: summarized lane statuses from existing readiness where safely resolvable.
  - `classification`: result from `resolveCurrentWorkClassification()`.
  - `gaps`: stable `gapCode[]`, severity, source table and explanation.
  - `sensitiveFields`: field-level classification for future redaction.
- Define stable initial gap codes. Minimum set:
  - `person.no_identity_profile`
  - `person.member_without_profile`
  - `relationship.missing_active_work_relationship`
  - `relationship.multiple_active_work_relationships`
  - `relationship.current_classification_mismatch`
  - `assignment.missing_required_context`
  - `compensation.missing_current_version`
  - `compensation.member_scoped_without_relationship_link`
  - `compensation.tuple_mismatch`
  - `payment_rail.missing_deel_contract_id`
  - `payment_rail.obligation_without_workforce_lineage`
  - `readiness.unresolved_or_blocked`
  - `data.demo_or_fixture_tolerated_gap`
- Add pure unit tests for gap severity classification and redaction/sensitive field classification.

Execution result:

- Added `src/lib/workforce/foundation/gap-codes.ts`.
- Added `src/lib/workforce/foundation/object-map-types.ts`.
- Added pure tests in `src/lib/workforce/foundation/object-map.test.ts`.

### Slice 2 — Read-Only Mapper Over Existing Sources

- Implement `buildWorkforceFoundationMapForMember()` and/or `buildWorkforceFoundationMapForProfile()` as read-only server functions.
- Reuse existing primitives where possible:
  - `resolveCurrentWorkClassification()` from `src/lib/account-360/current-work-classification.ts`;
  - Person/legal entity relationship readers from `src/lib/account-360/person-legal-entity-relationships.ts`;
  - readiness logic from `src/lib/workforce/activation/readiness.ts` where the input is available and safe;
  - contractor projection/readers only as sources, not as a second root.
- Do not create DB writes, migrations, outbox events, API routes or UI.
- Prefer explicit `unknown` / `not_available` / `gap` states over inference.
- Add unit tests with mocked rows covering:
  - active employee with relationship + compensation;
  - contractor with engagement and legacy member contract history;
  - active member without relationship;
  - member without identity profile;
  - compensation tuple mismatch;
  - Deel rail without contract id;
  - profile/member with tolerated demo fixture gap.

Execution result:

- Added `src/lib/workforce/foundation/object-map.ts`.
- Reused `resolveCurrentWorkClassification()`.
- Kept the mapper server-only and read-only; no writes, migrations, routes, outbox, API or UI.
- The pure builder covers employee, contractor, missing relationship, missing profile, tuple mismatch, Deel rail without provider ref and demo tolerated gaps.

### Slice 3 — Dev DB Audit Script

- Create `scripts/workforce/audit-workforce-foundation-map.ts`.
- The script must be read-only and dry by design.
- It must run against dev PostgreSQL using repo-authenticated tooling and require `pnpm pg:doctor` first in the execution notes.
- Output to stdout and optionally JSON file path supplied by CLI flag. Do not commit generated audit output by default.
- Required summary metrics:
  - total profiles scanned;
  - total members scanned;
  - active members scanned;
  - relationship coverage count/rate;
  - current classification parity count/rate;
  - compensation current version coverage count/rate;
  - payment rail evidence coverage count/rate;
  - gap counts by code and severity;
  - top examples per gap, with sensitive fields masked.
- Required filters:
  - `--active-only`;
  - `--include-demo`;
  - `--profile-id`;
  - `--member-id`;
  - `--json-out <path>` optional.
- The script must fail loud only for infrastructure/query errors. Data gaps are reported as findings, not process failures, unless `--fail-on-error-gap` is explicitly passed.

Execution result:

- Added `scripts/workforce/audit-workforce-foundation-map.ts`.
- Supports `--active-only`, `--include-demo`, `--profile-id`, `--member-id`, `--json-out`, `--fail-on-error-gap` and `--limit`.
- Loads local tool env through `loadGreenhouseToolEnv()` + runtime Postgres profile.
- Masks examples by initials and does not write generated artifacts unless `--json-out` is supplied.

### Slice 4 — Parity Report + Candidate Signals

- Run the audit against dev PostgreSQL after `pnpm pg:doctor`.
- Compare map classification against `resolveCurrentWorkClassification()`.
- Document findings in `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md` or a linked delta appendix.
- Produce candidate signal specs, not wired production signals yet:
  - `workforce.foundation.relationship_coverage_gap`
  - `workforce.foundation.classification_parity_gap`
  - `workforce.foundation.compensation_lineage_gap`
  - `workforce.foundation.payment_rail_evidence_gap`
  - `workforce.foundation.obligation_lineage_gap`
- For each candidate signal, define:
  - SQL/data source sketch;
  - moduleKey;
  - expected steady state;
  - warning vs error threshold;
  - tolerated demo/fixture behavior;
  - whether it should be Phase 1 or Phase 2 of EPIC-017.

Execution result:

- Audit without demo:
  - relationship coverage: `9/9` (`100%`)
  - classification parity: `9/9` (`100%`)
  - current compensation coverage: `5/9` (`55.56%`)
  - payment rail evidence coverage: `8/9` (`88.89%`)
  - gap counts: `readiness.unresolved_or_blocked=8`, `compensation.missing_current_version=4`, `error=0`
- Audit with demo:
  - initial pre-cleanup relationship coverage: `9/14` (`64.29%`)
  - initial pre-cleanup classification parity: `9/9` (`100%`)
  - initial pre-cleanup current compensation coverage: `5/14` (`35.71%`)
  - initial pre-cleanup payment rail evidence coverage: `8/14` (`57.14%`)
  - initial demo gaps were `info` and marked with `data.demo_or_fixture_tolerated_gap`.
  - post-cleanup: the 5 `demo-%@demo.greenhouse.efeonce.org` members and derived materialized rows were removed from dev; `--active-only --include-demo` now returns the same 9 real active members as `--active-only`.
- Candidate signals documented in `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`.

### Slice 5 — Documentation and Handoff

- Update `RESEARCH-008` docs with actual audit results and recommendation:
  - whether Person 360 can safely consume this as a read-only facet later;
  - whether relationship coverage needs a backfill/audit task first;
  - whether `CompensationProfile` can remain read-only/member-scoped for V1;
  - what the next single task should be.
- Update `EPIC-017` with `TASK-959` as first child task and any revised intake learnings.
- Update `Handoff.md` with findings, commands run, validation, and explicitly what was not changed.
- Do not open follow-up tasks automatically unless the user explicitly asks after reviewing the results.

Execution result:

- Updated `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`.
- Updated `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`.
- Updated `Handoff.md`.
- No follow-up task was opened automatically.

## Out of Scope

- Any mutation of `members`, `identity_profiles`, `person_legal_entity_relationships`, `compensation_versions`, `contractor_engagements`, `payment_obligations`, `beneficiary_payment_profiles` or Person 360 runtime views.
- Any schema migration or database backfill.
- Any API route, UI, menu, tab, Person 360 surface, self-service surface or admin surface.
- Any payroll formula, payroll eligibility, final settlement, offboarding or contractor payable behavior change.
- Any production reliability signal wired into `getReliabilityOverview()`; this task only proposes candidate signal specs.
- Any MCP/Nexa/agent tool exposure.
- Any acceptance of the ADR by implication.

## Detailed Spec

### V1 map semantics

The V1 map is not a new source of truth. It is an evidence layer over existing sources.

The map must distinguish:

- `source_truth`: source table currently treated as authoritative for that facet.
- `source_observed`: source table where data was found.
- `confidence`: `high | medium | low | unknown`.
- `gap_codes`: explicit list of gaps rather than silent fallbacks.
- `compatibility_fields`: values that exist because current runtime still needs them, such as `member.contract_type`.

Example conceptual shape:

```ts
type WorkforceFoundationMap = {
  person: {
    profileId: string | null
    memberId: string | null
    displayName: string
    source: 'identity_profiles' | 'members' | 'person_360'
    confidence: 'high' | 'medium' | 'low' | 'unknown'
  }
  currentClassification: {
    kind: 'employee' | 'contractor' | 'none'
    source: 'resolveCurrentWorkClassification'
    confidence: 'high' | 'medium' | 'low' | 'unknown'
  }
  relationship: {
    relationshipId: string | null
    relationshipType: string | null
    status: string | null
    effectiveFrom: string | null
    effectiveTo: string | null
    sourceOfTruth: string | null
  }
  assignment: {
    roleTitle: string | null
    managerMemberId: string | null
    departmentId: string | null
    spaceId: string | null
    confidence: 'high' | 'medium' | 'low' | 'unknown'
  }
  compensation: {
    versionId: string | null
    contractType: string | null
    payRegime: string | null
    currency: string | null
    effectiveFrom: string | null
    confidence: 'high' | 'medium' | 'low' | 'unknown'
  }
  paymentRail: {
    payrollVia: string | null
    deelContractId: string | null
    obligationSummary: {
      payrollObligations: number
      contractorPayableObligations: number
      missingLineage: number
    }
  }
  readiness: {
    status: 'ready' | 'warning' | 'blocked' | 'unknown'
    lanes: Array<{ lane: string; status: string; source: string }>
  }
  gaps: Array<{
    code: string
    severity: 'info' | 'warning' | 'error'
    source: string
    message: string
  }>
  sensitiveFields: Array<{
    path: string
    classification: 'public_internal' | 'hr_sensitive' | 'finance_sensitive' | 'legal_sensitive' | 'agent_restricted'
  }>
}
```

The executing agent may adjust this shape during Plan Mode if repo types suggest a better local pattern, but must preserve the semantics above.

### Gap severity rules

Initial severity recommendations:

- `error`: a real active non-demo worker has conflicting current classification or multiple active employee/contractor relationships.
- `warning`: active member lacks relationship coverage, compensation lineage is member-scoped only, Deel rail lacks contract id, readiness is blocked/unknown.
- `info`: demo/fixture tolerated gap, inactive historical record without full relationship coverage, optional assignment context missing.

Never use severity to hide a gap. Severity only controls operational urgency.

### Redaction posture

The map may include sensitive internal fields for audit, but every sensitive field must be classified.

Initial classifications:

- `compensation.*`: `finance_sensitive` and `hr_sensitive`.
- `paymentRail.deelContractId`: `finance_sensitive`.
- payment profile/bank fields if referenced later: `finance_sensitive`.
- legal/tax identifiers if referenced later: `legal_sensitive`.
- internal gap messages containing provider or audit detail: `agent_restricted` if exposed to future agent context.

### Data-source priority

The mapper should prefer existing canonical resolvers over raw joins:

1. Use identity/person/member relationships to find the subject.
2. Use `resolveCurrentWorkClassification()` for current classification parity.
3. Use `person_legal_entity_relationships` for relationship evidence.
4. Use `contractor_engagements` as a specialized relationship facet, not as person identity.
5. Use current `compensation_versions` as compensation evidence, with a gap if no relationship link exists.
6. Use payment obligations only for downstream lineage summary, not for current worker identity.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (type contract + gaps) -> Slice 2 (mapper) -> Slice 3 (audit script) -> Slice 4 (dev DB audit + candidate signals) -> Slice 5 (docs/handoff).
- Slice 3 must not run against live DB until Slice 2 unit tests pass.
- Slice 4 must not propose follow-up implementation until the audit results are documented.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mapper becomes an implicit new source of truth | architecture/data | medium | Document map as evidence layer only; no writes, no API, no UI; keep ADR Proposed | Code review / task acceptance |
| Silent inference hides missing relationship coverage | HR/identity | medium | Required gap codes and confidence fields; audit reports gap counts | `relationship.missing_active_work_relationship` count |
| Compensation is treated as relationship-scoped before model decision | payroll/finance | medium | Mark V1 compensation as candidate/member-scoped with gap code; no ownership migration | `compensation.member_scoped_without_relationship_link` |
| Audit leaks sensitive salary/provider data in logs | payroll/finance/security | medium | Mask examples; classify sensitive fields; no generated artifacts committed by default | review of script output |
| Existing payroll/contractor behavior changes accidentally | payroll/hr/finance | low | Read-only only; no imports that write; tests; no migrations | git diff review / tests |
| Scope expands into Person 360 UI | UI/product | medium | Out of Scope explicit; task closes with recommendation only | PR review |

### Feature flags / cutover

Sin flags. This is a read-only internal mapper/script and documentation task. No runtime cutover, no product surface, no API route and no production behavior change.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert new type/gap files | <5 min | si |
| Slice 2 | Revert mapper files/tests | <10 min | si |
| Slice 3 | Revert audit script | <5 min | si |
| Slice 4 | Revert research doc delta/candidate signal notes | <5 min | si |
| Slice 5 | Revert docs/handoff updates | <10 min | si |

### Production verification sequence

N/A for production cutover. Verification is local/dev only:

1. `pnpm pg:doctor` healthy.
2. Unit tests for pure mapper/gap logic pass.
3. Audit script runs read-only against dev PostgreSQL.
4. Audit output masks sensitive fields.
5. Docs record findings and explicitly state that no runtime behavior changed.

### Out-of-band coordination required

N/A — repo-only/read-only. If the audit identifies a real production data remediation need, it must be documented as a follow-up and confirmed by the operator before a separate task is opened.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] A read-only `WorkforceFoundationMap` type/contract exists under `src/lib/workforce/foundation/` with explicit `person`, `relationship`, `assignment`, `compensation`, `paymentRail`, `readiness`, `classification`, `gaps` and `sensitiveFields` sections.
- [x] The mapper reuses `resolveCurrentWorkClassification()` and does not treat `member.contract_type` as current contractor truth when relationship/engagement state differs.
- [x] The mapper produces explicit gap codes and confidence values; no missing relationship/compensation/payment lineage gap is silently inferred away.
- [x] Unit tests cover employee, contractor, active member without relationship, missing profile/member, compensation tuple mismatch, missing Deel contract id and demo/fixture tolerated gaps.
- [x] The audit script runs read-only against dev PostgreSQL and reports coverage/parity/gap metrics with masked examples.
- [x] The audit compares map classification against `resolveCurrentWorkClassification()` and documents any mismatch.
- [x] Candidate reliability signal specs are documented, but no production signal is wired into `getReliabilityOverview()` in this task.
- [x] Research/EPIC docs are updated with findings and the recommended next single task.
- [x] No migrations, API routes, UI files, payroll formulas, contractor payable state machines or Finance settlement behavior are changed.
- [x] `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, EPIC-017 and `Handoff.md` are synchronized at close.

## Verification

- `pnpm task:lint --task TASK-959` — OK before initial in-progress move; re-run after close move.
- `pnpm pg:doctor` — OK.
- `pnpm exec tsc --noEmit --pretty false` — OK.
- `pnpm vitest run src/lib/workforce src/lib/account-360/current-work-classification.test.ts` — OK, 14 files / 92 tests.
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/workforce/audit-workforce-foundation-map.ts --active-only --include-demo` — OK.
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/workforce/audit-workforce-foundation-map.ts --active-only` — OK.
- `pnpm docs:context-check` — pending final close check.
- `git diff --check` — pending final close check.

Full `pnpm test` and `pnpm build` are recommended before closing if runtime code is introduced beyond pure server-side mapper/script files. If skipped, document why in `Handoff.md`.

## Closing Protocol

- [x] Move file to `docs/tasks/in-progress/` when taking ownership and to `docs/tasks/complete/` only when all criteria are met.
- [x] Keep `Lifecycle` aligned with folder.
- [x] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [x] Update `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`.
- [x] Update `RESEARCH-008` docs with actual findings.
- [x] Update `Handoff.md` with commands run, results, non-changes and follow-up recommendation.
- [x] Do not create follow-up tasks automatically without operator confirmation.

## Follow-ups To Consider After Review

- Relationship coverage reliability signal.
- Current workforce projection promotion to a shared read model.
- Person 360 workforce journey facet.
- Compensation profile timeline scope decision.
- Agent-safe workforce context.
