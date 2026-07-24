# TASK-1543 — Globe Narrative Preproduction Domain and Durable Revision Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1542`
- Branch: `task/TASK-1543-globe-narrative-preproduction-revisions`
- Legacy ID: `none`

## Summary

Construye el source of truth durable de Narrative Preproduction: Narrative Project, Script y Storyboard
versionados, escenas/shots/panels, aprobación exacta, optimistic concurrency, history/readers y API parity.

## Why This Task Exists

Colaboración, propuestas, canvas y handoffs necesitan una identidad/revisión común. Implementarlos antes del
aggregate produciría estado browser-only, comentarios huérfanos y mutaciones imposibles de auditar.

## Goal

- Materializar aggregates y revisiones inmutables workspace-scoped.
- Crear commands/readers, capabilities, stores Postgres y conformance.
- Probar idempotencia, conflictos, tenant isolation y aprobación exacta.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`

Reglas obligatorias:

- Revisions immutable; aggregate head mutable only through expected revision + transaction.
- Script changes never rewrite Storyboard silently.
- Approval binds exact revision digest and human authority.
- UI/SDK/MCP consume the same primitives; no direct stores.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1542, SPEC-001, SPEC-007 and SPEC-008.

### Blocks / Impacts

- TASK-1544, TASK-1545, TASK-1546, TASK-1547 and TASK-1548.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/packages/sdk/src/`

## Current Repo State

### Already exists

- API Contract Spine, trusted context, durable Postgres/store patterns, migrations and append-only audit.

### Gap

- No Narrative Project, Script/Storyboard revision store, commands/readers or approval policy.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `../efeonce-globe packages/contracts, packages/domain, packages/database and studio-web transport`
- Future candidate home: `domain-package`
- Boundary: `Narrative Preproduction capability family finalized in Slice 1 before any handler or migration`
- Server/browser split: `domain/store/DB/authority server-only; browser consumes redacted DTOs through BFF/API`
- Build impact: `additive TypeScript modules and Postgres migration; no new deployable`
- Extraction blocker: `trusted context, shared Globe Postgres transaction/audit and API Contract Spine`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `Globe Postgres Narrative Preproduction aggregate/revision records`
- Consumidores afectados: `UI, HTTP, SDK, MCP, CLI, workers, sister-platform and E2E`
- Runtime target: `Globe internal then commercial`

### Contract surface

- Contrato existente a respetar: `SPEC-001 trusted context/coverage/conformance and SPEC-007 persistence`
- Contrato nuevo o modificado: `versioned Narrative Project, Script, Storyboard, approval commands/readers`
- Backward compatibility: `additive and gated`
- Full API parity: `schemas + domain registry + HTTP/SDK + all eight coverage states + manifest conformance`

### Data model and invariants

- Entidades/tablas/views afectadas: `new narrative preproduction tables [names/migration number verificar]`
- Invariantes que no se pueden romper:
  - revisions are immutable and tenant scoped;
  - Storyboard references an exact Script revision;
  - expected revision/idempotency prevents duplicate or lost updates;
  - only an authorized human approves an exact digest.
- Tenant/space boundary: `workspace derived server-side from trusted context; RLS/store filters fail closed`
- Idempotency/concurrency: `unique workspace+command idempotency and compare-and-swap head in one transaction`
- Audit/outbox/history: `append-only revision/approval audit; domain events only if an existing consumer requires them`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `capabilities policy-blocked and feature flag OFF`
- Backfill plan: `none — new domain`
- Rollback path: `flag/coverage OFF; preserve additive tables and immutable history`
- External coordination: `migration apply, grants and runtime flag owned by TASK-1549`

### Security and access

- Auth/access gate: `fine project read/author/review/approve capabilities`
- Sensitive data posture: `client scripts, creative strategy, likeness/voice/product/location references`
- Error contract: `invalid_request, conflict, not_found, access_denied, policy_blocked, dependency_unavailable`
- Abuse/rate-limit posture: `payload/sequence limits and command replay guard; no inference in this task`

### Runtime evidence

- Local checks: `focal domain/store/contract/conformance tests plus pnpm check/build`
- DB/runtime checks: `migration, RLS/tenant negatives, restart durability and exact history readback`
- Integration checks: `authenticated HTTP/SDK create→revise→approve smoke`
- Reliability signals/logs: `conflict, denial, duplicate replay and store dependency signals`
- Production verification sequence: `migration → flags OFF smoke → internal grant → canary → TASK-1549 rollout`

### Acceptance criteria additions

- [ ] Source of truth, contracts, invariants, access, concurrency, errors and runtime signals have real tests.
- [ ] Additive migration and rollback posture are proven without destructive cleanup.

## Capability Definition of Done — Full API Parity gate

- [ ] Business logic lives in domain commands/readers, not UI or transport.
- [ ] Schemas, fine capabilities, trusted context, HTTP/SDK and eight-surface coverage ship together.
- [ ] At least one internal grant and negative grant/tenant/replay tests exist before `available`.
- [ ] Commands are compatible with propose→confirm→execute and audit exact human effects.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contracts and aggregates

- Version schemas, lifecycle, invariants, digests and capability descriptors.

### Slice 2 — Durable stores and migration

- Add tenant-scoped tables, transactional revision heads/history/approval and audit.

### Slice 3 — Commands, readers and parity

- Register create/revise/read/history/approve, HTTP/SDK paths and conformance.

### Slice 4 — Runtime proof

- Run restart, concurrency, replay, isolation and authenticated canaries with flags OFF→internal.

## Out of Scope

- Comments/annotations, AI proposals, Producer/Video Effectiveness handoffs, UI and external rollout.

## Detailed Spec

SPEC-012 §§3–5 and §9 govern aggregate shape, revision invariants, lifecycle and capability coverage. Slice 1 must
freeze exact wire names and migration ownership before Slice 2 writes schema.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contracts → additive migration/store → commands/readers → grants/canary. No coverage `available` before migration
and negative isolation tests pass.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| lost update | revisions | medium | CAS expected revision | conflict/revision mismatch |
| tenant leak | Postgres/API | low | trusted context + RLS/store negatives | access-denial anomaly |
| false approval | review | low | exact digest + fine capability | approval mismatch |

### Feature flags / cutover

New family defaults OFF/policy-blocked; TASK-1549 owns staged enablement.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| contracts | coverage stays policy-blocked/revert code | immediate | si |
| migration | retain unused additive tables | immediate | si |
| commands | flag OFF | immediate | si |
| canary | revoke internal grant | immediate | si |

### Production verification sequence

Apply migration/readback, deploy OFF, run anonymous/cross-workspace negatives, grant one internal workspace, run
create/revise/conflict/approve/restart smoke, then hand evidence to TASK-1549.

### Out-of-band coordination required

Migration and grant operators; no provider or external-client coordination.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Narrative Project, Script and Storyboard revisions persist durably and immutably.
- [ ] Exact Script revision link, expected revision and approval digest invariants are enforced.
- [ ] Commands/readers expose Full API Parity with real internal grants and negative tests.
- [ ] Migration/restart/concurrency/idempotency/tenant evidence passes.
- [ ] No collaboration, agent or UI logic is smuggled into the foundation.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1543`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog and runtime handoff reflect deployed truth.
- [ ] Migration, flags, grants and canary evidence are recorded without secrets.

## Follow-ups

- TASK-1544 through TASK-1549.
