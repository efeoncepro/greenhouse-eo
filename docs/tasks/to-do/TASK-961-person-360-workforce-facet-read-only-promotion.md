# TASK-961 — Person 360 Workforce Facet Read-Only Promotion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno listo para discovery`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|identity|ui|data|platform`)
- Blocked by: `none` (solo autorizada como read-only/aditiva; el ADR de fundacion workforce sigue `Proposed` y no habilita writes)
- Branch: `task/TASK-961-person-360-workforce-facet-read-only-promotion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Promover el hub existente de People/Person 360 con una faceta/seccion `workforce` read-only que consuma el `WorkforceFoundationMap` de `TASK-959`.

La task no crea un hub nuevo ni convierte Payroll en la vista raiz. Person 360 queda como primer viewport de estado laboral vigente; Payroll sigue siendo una vista especializada para calculos, periodos, recibos y salidas estatutarias.

## Why This Task Exists

El articulo de Deel y la captura revisada muestran un patron de mercado claro: la experiencia principal no parte en payroll, sino en el perfil de la persona/worker. Desde ahi se ven role details, relacion laboral, compensacion resumida, informacion personal/general, org chart, documentos, compliance, apps, time off y acciones rapidas. Payroll aparece como rail secundaria.

Greenhouse ya tiene una base parecida: `/people/[memberId]`, `PersonView`, `PersonTabs`, tabs de perfil/economia/pago/actividad, y `Person Complete 360` con facets (`identity`, `assignments`, `organization`, `leave`, `payroll`, `delivery`, `costs`, `staffAug`). Tambien existe `TASK-959`, que creo el primer mapa read-only persona-centrico con relacion vigente, assignment candidate, compensation candidate, payment rail, readiness/compliance y gap codes.

Lo que falta es hacer que ese mapa se vuelva util en el hub de People sin romper limites de dominio. Hoy Person 360 ya es un hub parcial; esta task lo lleva al siguiente nivel con una faceta Workforce honesta, redacted y read-only, sin mezclar Payroll como source of truth de la persona.

## Goal

- Agregar una faceta/seccion `workforce` en Person 360 que muestre estado laboral vigente, relacion, assignment, compensacion resumida, payment rail evidence y readiness/gaps.
- Consumir el `WorkforceFoundationMap` de `TASK-959` como evidence/read model, no como source of truth nuevo.
- Mantener People/Person 360 como hub principal y Payroll como vista especializada separada.
- Aplicar autorizacion, redaction y copy canonico para que datos sensibles no se filtren a roles/audiencias incorrectas.
- Producir evidencia visual con Greenhouse Visual Capture antes del cierre.

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `DESIGN.md`

Reglas obligatorias:

- **People/Person 360 es el hub. Payroll no es el root.** La UI debe mostrar Payroll como rail/facet especializada, no como pagina maestra de la persona.
- Esta task es **read-only/aditiva**. No debe mutar `members`, `identity_profiles`, `person_legal_entity_relationships`, `compensation_versions`, `contractor_engagements`, `payment_obligations`, `contractor_payables`, payroll entries, payment profiles ni source tables.
- El ADR `GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1` sigue `Proposed`. Esta task puede avanzar solo porque es read-only y consume evidencia ya implementada por `TASK-959`; no debe tratar el ADR como `Accepted`.
- Reusar `WorkforceFoundationMap` y `resolveCurrentWorkClassification()`. No reintroducir heuristicas locales basadas solo en `member.contract_type`.
- No crear roles nuevos ni citar roles fantasma. Usar solo `ROLE_CODES` reales desde `src/config/role-codes.ts`.
- Si la task toca access visible, documentar ambos planos: `views`/`authorizedViews`/`view_code` para superficie visible y `entitlements`/`capabilities` para autorizacion fina.
- Si la task agrega copy visible, usar `src/lib/copy/*` o la capa canonica que aplique; no hardcodear copy reusable en JSX.
- UI debe seguir Vuexy/MUI/Greenhouse primitives. No landing page, no hero, no cards anidadas, no texto instructivo visible que explique la feature.
- La captura de Deel es referencia de producto, no especificacion visual exacta. Greenhouse debe resolver esto con su lenguaje operacional propio.

## Normative Docs

- `docs/research/RESEARCH-008-unified-workforce-foundation.md`
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-pre-task-considerations.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`
- `docs/tasks/complete/TASK-958-compensation-version-tuple-drift-remediation.md`
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

- `TASK-959` complete: `WorkforceFoundationMap`, gap codes, audit script and dev PG findings.
- `TASK-957` complete: current work classification resolver and Person 360 current state correction.
- `TASK-958` complete: compensation tuple drift remediation baseline.
- Existing Person 360/People runtime:
  - `src/app/(dashboard)/people/[memberId]/page.tsx`
  - `src/views/greenhouse/people/PersonView.tsx`
  - `src/views/greenhouse/people/PersonTabs.tsx`
  - `src/views/greenhouse/people/tabs/PersonProfileTab.tsx`
  - `src/views/greenhouse/people/tabs/PersonEconomyTab.tsx`
  - `src/views/greenhouse/people/tabs/PersonPaymentTab.tsx`
  - `src/views/greenhouse/people/helpers.ts`
- Existing Person Complete 360 facet runtime:
  - `src/types/person-complete-360.ts`
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/person-360/facet-authorization.ts`
  - `src/lib/person-360/facet-cache.ts`
  - `src/lib/person-360/facets/*`
- Existing workforce foundation runtime:
  - `src/lib/workforce/foundation/object-map.ts`
  - `src/lib/workforce/foundation/object-map-types.ts`
  - `src/lib/workforce/foundation/gap-codes.ts`

### Blocks / Impacts

- Blocks practical UX validation for later EPIC-017 write paths.
- Impacts future tasks around workforce reliability signals, compensation profile timeline and agent-safe workforce context.
- May impact People tab configuration and Person Complete 360 facet registry.
- Must not impact payroll calculation, payroll close, contractor payable state machines, finance payment execution or offboarding/finiquito behavior.

### Files owned

- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `src/types/person-complete-360.ts`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/person-360/facet-authorization.ts`
- `src/lib/person-360/facets/workforce.ts` (new, if Plan Mode confirms facet registry path)
- `src/lib/workforce/foundation/*` (reuse only; no breaking shape changes without updating `TASK-959` tests)
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/views/greenhouse/people/tabs/PersonProfileTab.tsx`
- `src/views/greenhouse/people/tabs/PersonWorkforceTab.tsx` (new, if a dedicated tab is chosen)
- `src/lib/copy/workforce.ts` and/or `src/lib/copy/people.ts` (create only if copy cannot live in existing `workforce.ts`)
- `scripts/frontend/scenarios/*person-360*workforce*` (new or updated GVC scenario)
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`

If discovery proves the existing People detail page does not consume `PersonComplete360` directly, the executing agent must document whether the right V1 path is:

- a true `PersonComplete360` facet consumed by a refreshed People view; or
- a People detail adapter over `WorkforceFoundationMap` that keeps a migration path into `PersonComplete360`.

Do not implement both paths in the same slice unless the plan explains why the extra scope is unavoidable.

## Current Repo State

### Already exists

- `/people/[memberId]` renders `PersonView`.
- `PersonTabs` exposes tabs `profile`, `activity`, `memberships`, `economy`, `payment`, `ai-tools`.
- `TAB_PERMISSIONS` already gates tabs by real `ROLE_CODES`.
- `Person Complete 360` has a facet registry and authorization/redaction/cache pattern.
- Existing facets include identity, assignments, organization, leave, payroll, delivery, costs and staff augmentation.
- `src/lib/workforce/foundation/object-map.ts` can build a read-only map with person, relationship, assignment, compensation, payment rail, readiness, classification, gaps and sensitive fields.
- `TASK-959` dev audit found real active coverage:
  - relationship coverage: `9/9`
  - classification parity: `9/9`
  - current compensation coverage: `5/9`
  - payment rail evidence coverage: `8/9`
  - unresolved/blocked readiness: `8/9`
- Demo fixture pollution was cleaned from dev after `TASK-959` audit; the active audit cohort is now 9 real active members.

### Gap

- Person 360 does not yet expose `WorkforceFoundationMap` as a first-class People/Worker profile facet.
- The current People tabs split profile, economy and payment, but do not present a single concise "estado workforce vigente" narrative.
- Payroll-adjacent data can be seen in places, but it is not framed as a secondary rail under a People hub.
- Redaction/audience policy for workforce foundation fields has not been wired into Person 360.
- There is no GVC scenario proving the People/Person 360 worker profile renders the new workforce section across desktop/mobile.
- There is no documented UX decision on whether V1 should be an inline section in `profile` or a dedicated `workforce` tab.

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

### Slice 0 — Discovery, Placement Decision and Access Boundary

- Inspect current People/Person 360 data flow:
  - how `PersonView` loads `PersonDetail`;
  - whether `PersonComplete360` is already used by People detail or only by other consumers;
  - how tabs are authorized and how `detail.access.visibleTabs` is derived;
  - whether `PersonProfileTab`, `PersonEconomyTab` or `PersonPaymentTab` already include overlapping workforce state.
- Decide V1 placement:
  - Option A: inline `Workforce` section inside `PersonProfileTab` as the first People-first promotion; or
  - Option B: dedicated `workforce` tab if the section would overload `profile`.
- Document why the chosen path avoids making Payroll the root.
- Verify whether a new `view_code`, route group, capability or facet authorization rule is needed. Prefer no new visible view if the existing People detail access is sufficient.
- Produce `docs/tasks/plans/TASK-961-plan.md` before implementation if the task process requires it for this blast radius.

### Slice 1 — Workforce Facet Contract

- Add `workforce` to `PersonFacetName` only if Plan Mode confirms `PersonComplete360` is the correct V1 integration point.
- Create `src/lib/person-360/facets/workforce.ts` that:
  - consumes `buildWorkforceFoundationMapForMember()` and/or `buildWorkforceFoundationMapForProfile()`;
  - returns a Person 360-safe view model, not raw audit output;
  - preserves gap codes, severity and confidence;
  - classifies or omits sensitive fields before UI consumption;
  - does not write to DB, enqueue outbox events or materialize projections.
- If a direct People adapter is chosen instead, create a clearly named adapter under the existing People/Person 360 layer and document the later migration path into the facet registry.
- Add unit tests for the facet/adapter:
  - employee ready state;
  - contractor/provider rail state;
  - missing compensation current version;
  - blocked/unresolved readiness;
  - denied/redacted sensitive compensation/payment fields.

### Slice 2 — Authorization and Redaction

- Update `facet-authorization` and/or People detail authorization only as needed.
- Reuse real `ROLE_CODES` only:
  - `EFEONCE_ADMIN`
  - `HR_MANAGER`
  - `HR_PAYROLL`
  - `FINANCE_ADMIN`
  - `FINANCE_ANALYST`
  - `PEOPLE_VIEWER`
- Define field-level redaction:
  - People/HR can see relationship, assignment, readiness and high-level compensation state.
  - Finance can see payment rail evidence and finance-sensitive payment lineage where already authorized.
  - General people viewers should see non-sensitive current status and gaps but not salary amounts, provider internals or legal/tax identifiers.
  - Self-service exposure is out of scope unless existing People detail already exposes self profile with equivalent access.
- Do not grant broad access by adding roles to an existing tab without documenting why the role needs the new fields.

### Slice 3 — People/Person 360 UI Promotion

- Implement the selected UI placement in People detail.
- V1 expected content:
  - current status: employee/contractor/none/unknown with source confidence;
  - relationship card/row: type, status, effective dates, legal entity/source, no raw internal IDs by default;
  - role/assignment summary: title, manager, department/space if available;
  - compensation summary: current compensation presence, currency/regime and effective date; redact amounts where not authorized;
  - payment rail evidence: internal payroll, Deel/provider, contractor payable or unknown, shown as evidence state not action;
  - readiness/gaps: ready/warning/blocked/unknown with stable gap labels;
  - quick action placeholders only if they already have real routes and permissions.
- UI constraints:
  - use existing Vuexy/MUI/Greenhouse primitives;
  - compact operational layout, not marketing/hero;
  - no cards inside cards;
  - no decorative orbs/gradients;
  - stable responsive dimensions for badges/rows;
  - no visible explanatory text about how the feature works;
  - no hardcoded reusable copy in JSX.
- The UI must make the domain boundary visible through structure:
  - People shows the worker state;
  - Payroll link/rail points to specialized Payroll tab/view when authorized;
  - Payment rail evidence is not a payment execution UI.

### Slice 4 — Copy, States and Tests

- Add or update canonical copy in `src/lib/copy/workforce.ts` and/or a new `src/lib/copy/people.ts`.
- Cover states:
  - ready;
  - warning;
  - blocked;
  - unknown;
  - denied/redacted;
  - missing compensation;
  - missing rail evidence.
- Add component tests for rendering and redaction if existing People tab test patterns support it.
- Add type tests or unit tests around view model formatting where useful.

### Slice 5 — GVC Evidence and Documentation

- Add or update a GVC scenario for the People/Person 360 worker profile with the new workforce facet/section.
- Capture at least:
  - desktop viewport;
  - mobile or narrow viewport;
  - a subject with contractor/provider rail if available;
  - a subject with gaps if available and safe.
- Use `pnpm fe:capture` as primary evidence. If local/staging auth or env blocks capture, document the exact blocker and run the closest supported local route fallback.
- Update:
  - `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`;
  - `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`;
  - `docs/tasks/README.md`;
  - `docs/tasks/TASK_ID_REGISTRY.md`;
  - `Handoff.md`.

## Out of Scope

- Any write path for workforce relationships, assignments, compensation, payroll or payment rails.
- Any schema migration unless discovery proves a tiny non-mutating registry/capability migration is mandatory and it is explicitly approved in the plan.
- Any payroll calculation, payroll period close, payroll receipt, Previred, F29, SII, contractor payable or remittance advice behavior.
- Any mutation of `members.contract_type`, compensation tuples, relationship rows, payment profiles or obligations.
- Any replacement of existing Payroll, Economy or Payment tabs.
- Any self-service contractor surface.
- Any agent/MCP/Nexa tool exposure.
- Any acceptance of the Unified Workforce Foundation ADR by implication.
- Any broad redesign of `/people` list, org chart, Home, navigation or global layout.

## Detailed Spec

### Product interpretation

The target experience is "People hub first":

- Header answers: who is this worker and what is their current work state?
- Workforce section answers: what relationship do we currently believe they have with Efeonce, where do they work, how are they compensated/paid, and what gaps block operational confidence?
- Payroll answers later: what was calculated for a period and what statutory/receipt outputs exist?
- Finance answers later: what obligation/payment execution state exists?
- Contractor answers later: what engagement/payable lifecycle exists?

The UI must make these distinctions obvious without adding instructional prose.

### Suggested V1 view model

The executing agent may adjust names after discovery, but V1 should preserve this semantic shape:

```ts
type PersonWorkforceFacet = {
  currentStatus: {
    kind: 'employee' | 'contractor' | 'none' | 'unknown'
    label: string
    confidence: 'high' | 'medium' | 'low' | 'unknown'
    source: 'workforce_foundation_map'
  }
  relationship: {
    label: string
    status: string
    effectiveFrom: string | null
    effectiveTo: string | null
    legalEntityLabel: string | null
    sourceLabel: string
  } | null
  assignment: {
    title: string | null
    managerLabel: string | null
    departmentLabel: string | null
    spaceLabel: string | null
    confidence: 'high' | 'medium' | 'low' | 'unknown'
  }
  compensationSummary: {
    available: boolean
    redacted: boolean
    currency: string | null
    amountLabel: string | null
    payRegimeLabel: string | null
    effectiveFrom: string | null
    gaps: string[]
  }
  paymentRail: {
    railLabel: string
    evidenceState: 'ready' | 'warning' | 'blocked' | 'unknown'
    providerLabel: string | null
    redacted: boolean
    gaps: string[]
  }
  readiness: {
    status: 'ready' | 'warning' | 'blocked' | 'unknown'
    items: Array<{
      code: string
      label: string
      severity: 'info' | 'warning' | 'error'
    }>
  }
  links: {
    payrollHref: string | null
    paymentHref: string | null
    contractorHref: string | null
  }
}
```

### Sensitive field posture

Minimum redaction rules:

- Never show raw bank/tax identifiers.
- Never show provider contract IDs to generic People viewers.
- Show compensation amount only to existing authorized HR/Payroll/Finance roles if equivalent data is already available in current People/Economy surfaces.
- If a user lacks permission, show an honest redacted state instead of omitting the entire section when the non-sensitive status is still useful.
- Do not leak denied field names in aria labels or tooltips.

### Gap labels

The UI should map `TASK-959` gap codes to operational labels. Examples:

- `relationship.missing_active_work_relationship` -> relationship evidence missing.
- `compensation.missing_current_version` -> current compensation missing.
- `payment_rail.missing_deel_contract_id` -> provider rail evidence incomplete.
- `readiness.unresolved_or_blocked` -> readiness has blockers.
- `data.demo_or_fixture_tolerated_gap` -> fixture/demo gap; do not show for production users unless in admin/audit context.

Exact copy must live in canonical copy files.

### No duplicate source-of-truth rule

The implementation must not create a parallel "workforce status" resolver inside the UI. The UI consumes:

1. `PersonComplete360` `workforce` facet, or
2. a documented adapter over `WorkforceFoundationMap` if discovery shows the facet path is not yet feasible.

It must not join raw payroll/contractor/finance tables directly from a client component.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (discovery/access/placement decision) -> Slice 1 (facet/adapter contract) -> Slice 2 (authorization/redaction) -> Slice 3 (UI promotion) -> Slice 4 (copy/tests) -> Slice 5 (GVC/docs/close).
- Slice 3 must not start until Slice 1 has tests for gap/redaction behavior.
- Slice 5 must not close unless GVC evidence exists or the exact capture blocker is documented.
- Any discovered need for DB migration, new capability grant or route-group change pauses implementation until the plan is updated and approved.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Person 360 UI starts acting as Payroll source of truth | payroll/ui/architecture | medium | Structure copy and links so Payroll remains specialized; consume read-only map only | Review catches payroll calculation/state mutation in diff |
| Sensitive compensation/payment data leaks to broad People viewers | identity/finance/payroll/security | medium | Field-level redaction tests; reuse facet authorization; no raw IDs | Component/unit tests and manual GVC review |
| New tab permission broadens access accidentally | identity/access/ui | medium | Prefer existing People detail access; document any `TAB_PERMISSIONS` change; use only real `ROLE_CODES` | `capability-grant-coverage`/review |
| UI hides data gaps and looks falsely healthy | people/hr/reliability | medium | Gap codes rendered as warning/blocked/unknown states; no generic "Sin datos" collapse | GVC evidence and tests for missing compensation/readiness |
| Facet adds slow queries to People detail | performance/platform | medium | Use existing mapper patterns, cache where appropriate, measure local render/API timing | Local timing/logs, slow request Sentry after deploy |
| Scope expands into write path convergence | hr/payroll/finance | medium | Out of scope explicit; no migrations/writes/outbox/API mutation | git diff review |
| Existing People tabs become confusing or duplicated | ui/product | medium | Discovery decides inline vs tab; do not duplicate Economy/Payment entire contents | GVC review and manual scan |

### Feature flags / cutover

Default: sin feature flag if the final plan proves the change is purely additive, permission-gated and read-only inside existing People detail.

If discovery shows material access uncertainty or a large UI placement change, add a code-level or runtime feature flag before Slice 3. The flag must default OFF in production-like environments until GVC/manual verification passes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert plan/doc updates | <5 min | si |
| Slice 1 | Revert facet/adapter/types/tests | <10 min | si |
| Slice 2 | Revert authorization/redaction/copy changes | <10 min | si |
| Slice 3 | Disable flag if introduced; otherwise revert UI commit | <10 min | si |
| Slice 4 | Revert copy/tests with Slice 3 if needed | <10 min | si |
| Slice 5 | Revert scenario/doc deltas | <10 min | si |

### Production verification sequence

1. Local unit/type checks pass.
2. Local or staging GVC capture confirms People detail renders the workforce section and does not overlap/overflow at desktop and narrow viewport.
3. Verify at least one authorized HR/Finance/admin subject sees allowed fields.
4. Verify at least one less-privileged subject sees redacted or denied states.
5. Only after verification, allow normal Vercel deploy through existing pipeline.

### Out-of-band coordination required

- Human/product review of the first GVC capture is recommended because this task changes the mental model of the People profile.
- HR/Finance review is recommended if any compensation or payment rail amount becomes visible in a new place.
- No external provider coordination required.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Discovery documents whether V1 uses a true `PersonComplete360` `workforce` facet or a People adapter over `WorkforceFoundationMap`.
- [ ] The implementation consumes `WorkforceFoundationMap` and does not create a new raw-table workforce resolver in UI code.
- [ ] Person 360/People detail exposes current workforce state in a People-first layout.
- [ ] Payroll remains a secondary/specialized rail; no payroll calculation, period close or receipt behavior changes.
- [ ] Compensation/payment fields are redacted by audience and covered by tests or explicit manual verification.
- [ ] Missing compensation, missing rail evidence and readiness blockers render as honest warning/blocked/unknown states.
- [ ] No writes, migrations, outbox events, payroll entries, contractor payable mutations or payment obligation mutations are introduced.
- [ ] Copy for reusable labels/states lives in the canonical copy layer.
- [ ] GVC evidence captures the new People/Person 360 surface across desktop and narrow/mobile viewport, or the exact blocker is documented.
- [ ] EPIC-017, RESEARCH-008, task registry/index and `Handoff.md` are synchronized at close.

## Verification

Minimum expected checks:

- `pnpm task:lint --task TASK-961`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/person-360 src/lib/workforce src/views/greenhouse/people`
- `pnpm lint` or a narrower eslint command justified in `Handoff.md`
- `pnpm fe:capture <person-360-workforce-scenario> --env=local` or staging equivalent
- `pnpm docs:context-check`
- `git diff --check`

If the task touches access/capabilities, also run the focused capability/entitlement tests already used in the repo.

If the task touches visible UI and `pnpm fe:capture` fails due to missing auth/env, document the exact missing env or auth blocker and run the closest local fallback; do not silently replace GVC with ad-hoc screenshots.

## Closing Protocol

- [ ] Move file to `docs/tasks/in-progress/` when taking ownership and to `docs/tasks/complete/` only when all criteria are met.
- [ ] Keep `Lifecycle` aligned with folder.
- [ ] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`.
- [ ] Update `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`.
- [ ] Update `Handoff.md` with commands run, results, non-changes and follow-up recommendation.
- [ ] Preserve unrelated `TASK-960`/remittance work if present in the worktree; do not stage it unless the operator explicitly asks.

## Follow-ups To Consider After Review

- Relationship/compensation/readiness remediation plan for the four active members missing current compensation and eight readiness blockers.
- Dedicated reliability signals from `TASK-959` candidate list.
- Compensation profile timeline scoping decision.
- Agent-safe workforce context read model.
- Later write-path convergence only after ADR acceptance and parity evidence.
