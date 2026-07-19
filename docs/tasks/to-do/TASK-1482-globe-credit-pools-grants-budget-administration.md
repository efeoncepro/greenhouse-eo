# TASK-1482 — Globe Credit Pools, Grants and Budget Administration

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `finance|creative|data|reliability`
- Blocked by: `TASK-1481, TASK-1465, TASK-1466, TASK-1468`
- Branch: `task/TASK-1482-globe-credit-pools-grants-budget-administration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el control plane administrativo de Studio Credits para pools, grants, project budgets, policies,
forecast y alertas, consumiendo el kernel append-only de `TASK-1468` sin crear un segundo saldo.

## Why This Task Exists

El shadow ledger puede medir consumo, pero operar Managed Squad, co-operated y client-operated exige asignar
capacidad, delegar límites y pausar gasto con autoridad explícita. Mezclar esa administración con settlement o
billing ocultaría responsabilidades y abriría bypasses transaccionales.

## Goal

Permitir que actores autorizados gobiernen cuánto puede usar cada workspace/proyecto, con policy versionada,
maker-checker, trazabilidad y enforcement atómico dentro de `reserveCredits`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1481`: trusted context, schemas, private API/SDK, coverage y conformance.
- `TASK-1465`: tenancy, persistence y audit.
- `TASK-1466`: responsibility y effective budget authority.
- `TASK-1468`: allocations, authoritative balance, reservations y ledger.

### Blocks / Impacts

- `TASK-1483` consume estos commands/readers; `TASK-1480` exige este control plane para readiness externo.
- `TASK-1469` liga approval a pool, funding breakdown y budget policy version cuando aplique.

### Files owned

- `../efeonce-globe/packages/domain/src/credits/administration/`
- `../efeonce-globe/packages/contracts/src/credits/administration/`
- Migraciones/repositories Globe exclusivamente de pools, grants, policies y project budgets.
- `../efeonce-globe/packages/sdk/src/credits/administration/` y evidence/coverage correspondiente.

No posee apps UI, provider adapters, runner ni tablas kernel de ledger salvo el seam acordado con `TASK-1468`.

## Current Repo State

### Already exists

- Modelo canónico de credits, kernel task y contrato Full API Parity aprobados documentalmente.

### Gap

- No existe primitive formal para crear pools/grants, delegar project budgets ni hacer enforcement
  transaccional de esas policies.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe; Greenhouse gobierna task/evidencia`
- Future candidate home: `remain-shared`
- Boundary: `credits administration, no ledger ni billing`
- Server/browser split: `writes, policy y authority server-only; DTOs serializables y redactados`
- Build impact: `Globe runtime + Greenhouse task/docs gates`
- Extraction blocker: `ninguno`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `Globe credit administration; TASK-1468 conserva source of truth económico`
- Consumidores afectados: `run lifecycle, UI, SDK/MCP/CLI y commercial readiness`
- Runtime target: `sibling-service`

### Contract surface

- Commands de pool: `createCreditPool`, `activateCreditPool`, `pauseCreditPool`, `resumeCreditPool`,
  `closeCreditPool`.
- Commands de grant: `issueCreditGrant`, `cancelPendingCreditGrant`, `postCreditGrantCorrection`.
- Commands de policy/budget: `publishCreditBudgetPolicy`, `supersedeCreditBudgetPolicy`,
  `assignProjectBudget`, `reviseProjectBudget`, `pauseProjectBudget`, `acknowledgeCreditBudgetAlert`.
- Readers: `getCreditPool`, `listCreditPools`, `getCreditGrant`, `listCreditGrants`,
  `getEffectiveCreditBudgetPolicy`, `listProjectBudgets`, `evaluateCreditBudget`,
  `getCreditBudgetAvailability`, `getCreditExhaustionForecast`, `listCreditBudgetAlerts`.
- Full API parity: `schemas/result/error versionados, private HTTP/SDK, events, coverage matrix y conformance;
  UI/MCP pueden estar policy-blocked, nunca missing`.

### Data model and invariants

- Entidades: `credit_pool`, `credit_grant`, `credit_budget_policy_version`, `project_budget_assignment` y
  alert/forecast projections; nombres físicos se cierran en Plan Mode.
- Pool/sub-budget es límite o earmark, nunca saldo alternativo.
- Un grant confirmado produce exactamente una allocation ledger entry mediante `TASK-1468`; source ref único.
- Cancel sólo aplica antes del posting. Toda corrección posterior es compensatoria, nunca update/delete.
- Funding priority es determinística/versionada; breakdown y policy version quedan pinneados en reservation.
- Pool pausado bloquea nuevas reservations, pero no settlement/release de holds existentes.
- Project budget no crea credits; cierre/pause no borra historia ni transfiere saldo entre tenants.
- Purchased grants, expiry comercial, rollover y top-up fallan cerrado mientras Finance/Legal sigan TBD.
- `evaluateCreditBudget` es informativo; el check autoritativo ocurre atómicamente dentro de `reserveCredits`.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only, sin grants purchased ni clients externos`
- Backfill plan: `ninguno; seed sólo por commands idempotentes y evidencia`
- Rollback path: `pausar writes/pools; conservar historia; reconstruir projections desde admin records + ledger`
- External coordination: `Finance/Legal sólo para policies comerciales futuras`

### Security and access

- Capabilities: `globe.credits.pool.read|manage`, `globe.credits.grant.read|issue|correct`,
  `globe.credits.policy.read|manage`, `globe.credits.budget.read|manage`, `globe.credits.forecast.read`.
- Actor/workspace/budget authority se derivan server-side; operating mode no concede permisos.
- Writes de alto riesgo usan `propose -> confirm -> execute` con digest, preconditions, TTL y maker-checker.
- Vendor cost, margin y source confidencial se redactan por audience.

### Runtime evidence

- Concurrent grant/replay no duplica allocation; mismo fingerprint replaya, payload distinto da conflict.
- Cross-workspace, spoofing, redaction y capability denies fallan cerrado.
- Paused/exhausted/project-capped rechaza reserve; hold preexistente puede settle tras pause.
- Policy update no reescribe holds/history; rebuild concilia pool/grant con ledger.
- API/SDK/worker/E2E llegan al mismo primitive/audit; worker/CLI no escriben DB.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contracts and administration records

- Definir schemas, entities, capabilities y commands/readers de pool/grant/policy/budget.
- Implementar private API/SDK desde `TASK-1481` y migraciones tenant-scoped.

### Slice 2 — Transactional kernel seam

- Postear cada grant una sola vez mediante `allocateCredits` internal con source ref durable.
- Implementar BudgetPolicyPort fail-closed dentro de la transacción de `reserveCredits`.
- Pinnear funding breakdown/policy version y preservar settlement/release de holds existentes.

### Slice 3 — Forecast, alerts and conformance

- Producir availability/forecast server-side con freshness/coverage y estado `insufficient-data`.
- Emitir low/exhausted/expiry-policy-disabled/anomaly/projection-drift signals y recovery seguro.
- Completar reconciliation, negative tests y cross-surface coverage.

## Out of Scope

- Rate catalog, settlement, refund o balance kernel de `TASK-1468`.
- UI de administración (`TASK-1483`).
- Billing, tax, pricing, checkout, purchased top-ups, commercial expiry/rollover (`TASK-1484`).
- Transferencias cross-tenant o grants negociables.

## Detailed Spec

La ejecución comienza con `pnpm codex:task-hook TASK-1482 --develop` tras goal aprobado. Plan Mode fija
schema/locking sin debilitar el posting único ni el enforcement transaccional.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| TOCTOU entre evaluate y reserve | check dentro de transacción kernel | reservation viola cap |
| grant duplica allocation | source ref UNIQUE + idempotency fingerprint | grant/ledger mismatch |
| pool se vuelve billing encubierto | purchased/expiry/top-up fail-closed | source no aprobada |
| policy nueva altera historia | version pinning | hold histórico cambia |

- Feature flags: internal allowlist, purchased grants OFF, client admin OFF.
- Rollback: pausar commands nuevos, preservar rows/ledger y reconstruir projections.
- Verification: local -> DB concurrency -> private API/SDK -> internal canary -> QA/documentation gates.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Una emisión confirmada crea exactamente un grant y una allocation; replay/concurrencia no duplican.
- [ ] Pools/budgets nunca mantienen un saldo divergente del ledger.
- [ ] Paused/exhausted/project-capped rechaza reserve; hold existente puede settle/release.
- [ ] Policy/funding quedan pinneados y versiones posteriores no reescriben historia.
- [ ] Correcciones son compensatorias con reason/evidence/maker-checker.
- [ ] Trusted context, tenant isolation, redaction y capability denies tienen evidencia.
- [ ] API/SDK/MCP/CLI/worker/E2E están implemented, policy-blocked o not-applicable; nunca missing.
- [ ] No se habilitan purchased grants, expiry, rollover, top-up ni clientes externos.

## Verification

- `pnpm task:lint --task TASK-1482`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista runtime.

## Closing Protocol

- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Estado runtime y rollout declarados honestamente.

## Follow-ups

- `TASK-1483` implementa el workbench; `TASK-1484` implementa monetización sólo tras `TASK-1480`.
