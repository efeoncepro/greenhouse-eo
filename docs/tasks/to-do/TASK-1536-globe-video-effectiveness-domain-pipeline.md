# TASK-1536 — Globe Video Effectiveness Domain and Durable Analysis Pipeline

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1536-globe-video-effectiveness-domain-pipeline`
- Legacy ID: `none`

## Summary

Crea el aggregate, lifecycle durable y contratos transport-neutral del Video Effectiveness Agent. La capability
nace Full API Parity: schemas, commands/readers, trusted context, HTTP/SDK, coverage de las ocho surfaces,
conformance, persistencia tenant-scoped, queue/recovery, audit e idempotencia en un mismo programa.

## Why This Task Exists

ADR-011/SPEC-011 definen una capability comercial compartida, pero Globe aún no posee una autoridad durable para
solicitar, seguir, revisar y reabrir análisis de video. Implementarla desde una UI o un adapter produciría
contratos divergentes y haría imposible el consumo simétrico por Producer, Workbench, MCP y agentes.

## Goal

- Materializar un aggregate versionado para analysis run/report con estados y errores canónicos.
- Exponer request/cancel/human-review/get/list mediante el API Contract Spine desde el primer commit funcional.
- Persistir run, attempts, exact asset binding, brief/policy digests, evidence refs, review y audit con aislamiento.
- Entregar queue/recovery/idempotencia y una coverage matrix sin surfaces omitidas.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`

Reglas obligatorias:

- El domain conoce `assetRef`, evidencia y capabilities semánticas; nunca provider slugs, storage URIs o UI state.
- Toda autoridad se deriva de trusted context; workspace/actor/capabilities no se aceptan desde payload.
- Reportes son inmutables; human review y outcome observations se anexan sin reescribir evidencia original.
- Full API Parity es DoD de esta task, no deuda para TASK-1473.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` / SPEC-001 — API Contract Spine implementado.
- `TASK-1465` / SPEC-007 — Globe Postgres, stores y audit durables.
- `TASK-1466` / SPEC-008 — responsabilidad operativa efectiva.
- ADR-007/TASK-1467 — autoridad de assets; la integración cross-domain completa pertenece a TASK-1539.

### Blocks / Impacts

- Bloquea TASK-1537…1541.
- Extiende el capability registry y conformance de Globe sin crear otro runtime.
- TASK-1473 empaqueta/certifica globalmente; no sustituye la paridad que esta capability debe entregar.

### Files owned

- `../efeonce-globe/packages/contracts/src/` — schemas/capabilities video-effectiveness.
- `../efeonce-globe/packages/domain/src/` — aggregate, commands/readers, lifecycle y policies.
- `../efeonce-globe/packages/database/src/` y `../efeonce-globe/packages/database/migrations/` — stores/migración.
- `../efeonce-globe/apps/studio-web/src/app.ts` — registry/BFF wiring.
- `../efeonce-globe/packages/sdk/src/index.ts` — métodos tipados.
- Tests de los packages anteriores y manifest/conformance.

## Current Repo State

### Already exists

- Spine con `GLOBE_SURFACES`, capability registry, trusted context, HTTP privado, SDK y conformance.
- Persistencia Globe, audit append-only, queue/run primitives y responsabilidad operativa.
- ADR-011/SPEC-011 aceptadas.

### Gap

- No existen schemas, aggregate, stores, commands/readers ni coverage de Video Effectiveness.
- No existe run durable que preserve asset/brief/model/evidence/calibration identities.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/{contracts,domain,database}, apps/studio-web; Greenhouse owns TASK/ADR/spec`
- Future candidate home: `remain-shared`
- Boundary: `globe.video.effectiveness.* commands/readers and versioned DTOs consumed by all Globe surfaces`
- Server/browser split: `aggregate, stores, queue, audit and authorization server-only; browser receives redacted DTOs`
- Build impact: `Globe package/app builds; no new heavy dependency or Greenhouse runtime input`
- Extraction blocker: `trusted context, Globe Postgres transactions and API Contract Spine registry`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `new Globe video-effectiveness run/report stores and schemas`
- Consumidores afectados: `UI, HTTP, SDK, MCP, CLI, worker, sister-platform projection and E2E`
- Runtime target: `Globe Cloud Run API/worker plus Globe Postgres`

### Contract surface

- Contrato existente a respetar: `SPEC-001 Command/Reader envelopes, trusted context, errors and surface coverage`
- Contrato nuevo o modificado: `request, cancel, human-review commands; get/list readers; versioned run/report DTOs`
- Backward compatibility: `compatible and gated`
- Full API parity: `schemas + registry descriptor + HTTP + SDK + all eight coverage states + conformance ship together`

### Data model and invariants

- Entidades/tablas/views afectadas: `new tenant-scoped analysis runs, attempts, immutable reports and review records`
- Invariantes que no se pueden romper:
  - exact `assetRef` resolution and immutable media identity bind every report;
  - observed fact, inference, recommendation and human decision remain separate;
  - report/model/prompt/rubric/evidence/calibration versions are queryable.
- Tenant/space boundary: `workspaceId and actor derive from TrustedCommandContextV1; cross-workspace is safe not-found`
- Idempotency/concurrency: `request key binds workspace, actor, asset, brief/policy digest; leased/fenced attempts`
- Audit/outbox/history: `append-only command transitions, attempts, decisions and sanitized failures`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `capability descriptors registered; executable surfaces policy-blocked and feature flag OFF`
- Backfill plan: `none; no historical report is fabricated`
- Rollback path: `disable flag/coverage and workers; preserve immutable records for read/recovery`
- External coordination: `none in this foundation; provider and secrets belong to TASK-1537/1541`

### Security and access

- Auth/access gate: `separate run/read and human-review capabilities plus effective responsibility`
- Sensitive data posture: `private video metadata and client brief; no raw media or secrets in logs`
- Error contract: `canonical sanitized errors; no provider/DB raw error crosses the spine`
- Abuse/rate-limit posture: `request quotas, hard budgets, bounded concurrency, cancel/replay guard`

### Runtime evidence

- Local checks: `pnpm check && pnpm build in efeonce-globe; new tests explicitly listed in package scripts`
- DB/runtime checks: `migration apply/readback, RLS/tenant negative, idempotent replay and lease recovery`
- Integration checks: `deterministic fake runs through HTTP and SDK; no provider spend`
- Reliability signals/logs: `correlation, run state, attempt, latency, queue age, failure class and recovery`
- Production verification sequence: `migration → flag OFF deploy → fake/internal smoke → worker recovery → keep OFF`

### Acceptance criteria additions

- [ ] Source of truth, contracts, consumers, tenancy, idempotency, migration and rollback are implemented as above.
- [ ] Runtime/DB evidence includes cross-workspace denial, replay and abandoned-attempt recovery.
- [ ] Errors/audit/signals expose no private media, secret or raw provider error.

## Capability Definition of Done — Full API Parity gate

- [ ] Schemas and semantic capabilities live in `packages/contracts`.
- [ ] Business rules live in `packages/domain`, never UI or HTTP handlers.
- [ ] Request/cancel/human-review are governed commands with fine authorization, idempotency and audit.
- [ ] Get/list are canonical readers over the same source of truth.
- [ ] HTTP and typed SDK methods ship with the capability.
- [ ] All eight `GLOBE_SURFACES` declare `available|policy-blocked|not-applicable`; `missing` is impossible.
- [ ] Capability grants and at least one internal actor/service mapping ship with coverage tests.
- [ ] Manifest-driven conformance exercises positive and negative paths without bypassing dispatch.

## Scope

### Slice 1 — Contracts and parity manifest

- Add versioned request/run/report/review schemas, semantic identifiers, errors and eight-surface descriptors.
- Add HTTP/SDK/conformance fixtures using deterministic fake outcomes.

### Slice 2 — Aggregate and durable persistence

- Implement lifecycle, policies, additive migration, stores, tenant isolation, idempotency and append-only audit.
- Persist checkpoints before/after every external effect without provider-specific data in public DTOs.

### Slice 3 — Queue, recovery and human review

- Wire bounded queue/leases/retry/cancel/reconciliation and typed reliability signals.
- Implement review append path and immutable report readers.

## Out of Scope

- Provider/media evidence execution (TASK-1537).
- Channel calibration/forecasting (TASK-1538).
- Canonical uploader, domain adapters and Producer handoff (TASK-1539).
- UI (TASK-1540) and commercial rollout (TASK-1541).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. No worker/provider effect may run before durable checkpoints and idempotency exist.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| duplicate costly run | queue/spend | medium | idempotency + fenced lease + reconciliation | duplicate-effect signal |
| cross-tenant report | tenancy | low | trusted context + RLS + negative tests | access-denied audit |
| partial state looks final | report | medium | explicit lifecycle/degraded states | invalid-transition signal |

### Feature flags / cutover

Capability and worker flags default OFF; coverage remains `policy-blocked` until TASK-1541 canaries.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | revert descriptors/SDK while keeping reserved schemas compatible | <1 deploy | si |
| 2 | flag OFF and retain additive tables | <1 deploy | si |
| 3 | stop worker intake and reconcile durable jobs | <30 min | si |

### Production verification sequence

1. Apply migration and verify RLS/constraints.
2. Deploy with flags OFF.
3. Exercise fake internal command/read paths through HTTP/SDK.
4. Prove replay/cancel/recovery and keep external work disabled.

### Out-of-band coordination required

N/A — provider/IAM/secret enablement is owned by TASK-1537/1541.

## Acceptance Criteria

- [ ] Aggregate, stores, migration, commands/readers and lifecycle implement SPEC-011.
- [ ] Full API Parity checklist passes with all eight surfaces declared.
- [ ] Exact asset/report/version and audit evidence survive process restart.
- [ ] Cross-workspace, spoofed authority, replay and recovery tests fail/behave safely.
- [ ] No provider SDK or storage authority enters browser/domain contracts.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1536`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog are synchronized with runtime truth.
- [ ] TASK-1537…1541 dependencies are re-read after the final schema/command names settle.
- [ ] Code-complete is not reported as rollout-complete while flags/workers remain OFF.

## Follow-ups

- TASK-1537, TASK-1538, TASK-1539, TASK-1540 and TASK-1541.
