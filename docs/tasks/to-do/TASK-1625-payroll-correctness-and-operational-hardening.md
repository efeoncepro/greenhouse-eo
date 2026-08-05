# TASK-1625 — Payroll correctness and operational hardening

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Crítico`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Descubrimiento cerrado; issues abiertos`
- Rank: `1`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1625-payroll-correctness-and-operational-hardening`
- GitHub Issue: `umbrella; see GitHub #170..#175`

## Summary

Cerrar una clase de fallas de payroll detectadas en Dev y mediante auditoría de código/runtime: ajustes que no siempre llegan a la proyección oficial, cálculo no atómico, autorización incompleta, reglas legales que degradan silenciosamente, proyección estimada desalineada y acciones de UI ambiguas. La task coordina los issues downstream; no mezcla sus implementaciones en un parche monolítico.

## Why This Task Exists

La corrección reciente de exclusiones y porcentajes resolvió la materialización inmediata de los casos observados, pero la auditoría encontró riesgos sistémicos que pueden volver a producir discrepancias o publicar una nómina incorrecta bajo error, reintento o concurrencia. Payroll es un dominio financiero y legal: debe fallar cerrado, ser idempotente, auditable y consistente entre cálculo oficial, proyección y UI.

## Goal

- Garantizar que ninguna nómina calculada/exportada pueda contener proyecciones parciales, ajustes cruzados, reglas legales incompletas o estados imposibles.
- Hacer que todos los writes de payroll respeten capability, tenant, transición de estado, idempotencia y auditoría.
- Mantener paridad explícita entre cálculo oficial, cálculo proyectado y las acciones que la UI ofrece.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Payroll oficial debe fallar cerrado ante readiness, participation o reglas legales no verificables.
- Los writes deben vivir en commands server-side con autorización fina, tenant boundary y auditoría.
- Cálculo, materialización y transición de periodo deben tener una frontera transaccional y un contrato de concurrencia explícito.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/apply-to-entry.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/postgres-store.ts`
- Payroll adjustment, period, projection and export routes.

### Blocks / Impacts

- `ISSUE-129` through `ISSUE-134`.
- Payroll monthly calculation, adjustment history, projected payroll, export and `/my/payroll`.

### Files owned

- `src/lib/payroll/**`
- `src/app/api/hr/payroll/**`
- `src/app/api/my/payroll/**`
- `docs/architecture/decisions/**` and payroll tests as required by downstream slices.

## Current Repo State

### Already exists

- Adjustment materialization helper and route preflights from commit `59f451ad3`.
- Focused payroll test coverage and read-only Dev evidence for July 2026.
- Manual adjustment audit/history and period lifecycle primitives.

### Gap

- Cross-record adjustment authorization is not enforced.
- Calculation can persist partial entries before period finalization and races with approval/export.
- Readiness and legal inputs can degrade to empty/zero/default values.
- Projected payroll does not include active manual adjustments.
- Exported-period UI can advertise a backend-forbidden revert action; unlinked self-service payroll returns an operational error.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/payroll/**` plus Next route handlers under `src/app/api/**`
- Future candidate home: `domain-package`
- Boundary: payroll commands/readers own calculation, adjustment materialization, period transitions and projections; UI consumes those primitives.
- Server/browser split: stores, DB transactions, legal tables, capabilities and secrets remain server-side; browser receives sanitized projections and canonical errors.
- Build impact: `none` beyond existing portal/runtime entrypoints.
- Extraction blocker: payroll transaction/auth/data source-of-truth coupling requires the current server runtime until a dedicated domain package is authorized.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: payroll periods, payroll entries, adjustments, legal tables and projections.
- Consumidores afectados: UI, Product API, self-service payroll and export workers/routes.
- Runtime target: `staging` then `production`.

### Contract surface

- Contrato existente a respetar: payroll commands/readers under `src/lib/payroll/**` and `/api/hr/payroll/**`.
- Contrato nuevo o modificado: atomic calculate/materialize/transition command, governed adjustment command, readiness/legal validation and projection parity contract.
- Backward compatibility: `compatible`, with state-transition guards and a staged rollout.
- Full API parity: UI and future Nexa/MCP consumers call the same server-side commands/readers; no UI-only recalculation.

### Data model and invariants

- Entidades/tablas/views afectadas: payroll periods, payroll entries, payroll adjustments/history, participation and legal parameter tables, export projections.
- Invariantes que no se pueden romper:
  - A calculated or exported period has one coherent calculation version; no partial materialization is publishable.
  - An adjustment can mutate only its own entry, period and tenant; exported periods are immutable.
  - Missing legal/readiness evidence blocks official calculation; zero is valid only when explicitly represented as legal zero.
  - Official and projected views declare the same adjustment semantics or label a deliberate read-only difference.
- Tenant/space boundary: derive and verify `space_id`/tenant from the authenticated HR context and every payroll aggregate; never trust request identifiers alone.
- Idempotency/concurrency: transaction-scoped locks/CAS, idempotency key per command, retry-safe materialization and no calculate/approve/export overlap.
- Audit/outbox/history: append-only adjustment/period audit, canonical failure signal and no silent partial writes.

### Migration, backfill and rollout

- Migration posture: `additive` unless an issue proves a corrective backfill necessary.
- Default state: `read-only`/shadow checks before enforcement; enable official fail-closed and projection parity per environment.
- Backfill plan: dry-run and allowlisted affected periods only; no automatic mutation of exported payroll without operator approval and audit.
- Rollback path: feature flag off for new guards, preserve old read path only for diagnosis, and restore from period snapshot before any destructive repair.
- External coordination: staging smoke, production release gate and payroll operator sign-off before changing live calculation behavior.

### Security and access

- Auth/access gate: HR session + fine payroll capabilities + tenant membership; break-glass is out of scope.
- Sensitive data posture: payroll/PII/financial data; sanitize errors and never expose raw DB/legal rows.
- Error contract: canonical codes for readiness, authorization, state conflict, legal-data missing and materialization failure.
- Abuse/rate-limit posture: idempotency and state guards; rate limits remain the existing route policy unless a downstream issue finds a gap.

### Runtime evidence

- Local checks: focused payroll tests, lint, typecheck and `pnpm qa:gates --changed`.
- DB/runtime checks: read-only period/entry/adjustment reconciliation in Dev and staging.
- Integration checks: authenticated Chrome smoke with `jreyes@efeonce.cl` plus agent-auth smoke where applicable.
- Reliability signals/logs: calculation atomicity, readiness-blocked, adjustment-materialization-failed, projection-parity and period-transition-conflict signals.
- Production verification sequence: deploy to Dev → calculate a fixture period → verify official/projected/export guards → staging canary → operator sign-off → production release.

### Acceptance criteria additions

- [ ] Each downstream issue has tests for its failure mode and a runtime verification receipt.
- [ ] No payroll write can cross entry/adjustment/period/tenant boundaries or bypass fine capability checks.
- [ ] Official calculation fails closed for missing readiness/legal evidence and never publishes partial state.
- [ ] Projected payroll either includes active adjustments or explicitly reports the semantic difference.
- [ ] Documentation, ADR deltas, issue tracker and task lifecycle are synchronized at closure.

## Scope

This umbrella coordinates the following independently shippable slices:

- Slice 1 — `ISSUE-129`: adjustment command authorization, cross-record validation and tenant/capability guards.
- Slice 2 — `ISSUE-130`: atomic calculation/materialization and period lifecycle concurrency.
- Slice 3 — `ISSUE-131`: fail-closed readiness, tax, caps, SIS and Previred/legal evidence.
- Slice 4 — `ISSUE-132`: single-source derived payroll breakdown for percentage/exclusion adjustments.
- Slice 5 — `ISSUE-133`: official/projected payroll parity and explicit projection semantics.
- Slice 6 — `ISSUE-134`: UI action-state correctness and self-service no-payroll empty state.

## Out of Scope

- Making operator payroll changes on behalf of a user.
- Releasing to production before each critical slice has staging evidence and sign-off.
- Replacing the payroll ledger, changing legal policy without an ADR, or broad refactors unrelated to the listed failure modes.

## Rollout Plan & Risk Matrix

This is an umbrella task. Downstream ordering is mandatory: Slice 1 and Slice 2 first; Slice 3 may run in parallel but must gate official calculation; Slice 4 depends on the command/materialization contract; Slice 5 depends on the canonical calculation output; Slice 6 consumes the stabilized errors/readers. No production export change before Slices 1–5 are verified in staging.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Reparación de datos cambia una nómina exportada | Payroll DB/export | Media | dry-run, allowlist, immutable export guard, operator approval | mismatch period/entry totals |
| Nuevo lock produce contención o timeout | API/DB | Media | bounded lock timeout, metrics, canary period, rollback flag | transition conflict/latency |
| Fail-closed bloquea un caso legítimo por tabla legal incompleta | Legal tables | Media | explicit legal-zero model, fixture coverage, staged rollout | readiness-blocked spike |
| Projection parity rompe un consumer | UI/readers | Baja | contract tests and labelled semantic version | projection mismatch |

## Verification

Manual review of all child issues plus focused tests, `pnpm qa:gates --changed`, read-only reconciliation, Dev/staging smoke and production release evidence. This umbrella remains `to-do` until child issues are resolved and the runtime receipts are attached.

## Related

- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- Chrome evidence: `.captures/2026-08-01-payroll-audit/`
