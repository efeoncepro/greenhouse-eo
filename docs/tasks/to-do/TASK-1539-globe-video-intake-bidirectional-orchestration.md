# TASK-1539 — Globe Governed Video Intake and Bidirectional Cross-Product Orchestration

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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1536`, `TASK-1537`, `TASK-1467`
- Branch: `task/TASK-1539-globe-video-intake-bidirectional-orchestration`
- Legacy ID: `none`

## Summary

Conecta la capability Full API Parity de Video Effectiveness con el `assetRef` canónico, uploader/Asset
Governance, Producer, Workbench, otros dominios y Evaluation Harness. Implementa Producer→analysis y
agent→Producer draft/estimate con authority intersectada, lineage, idempotencia y recursion guard.

## Why This Task Exists

Una surface standalone sin integración obligaría a mover videos manualmente; una integración ad hoc en Producer
duplicaría uploader, permisos y lógica. Globe necesita una única orquestación cross-product que conserve autoridad
y permita colaboración bidireccional sin convertir al agente en aprobador o spender.

## Goal

- Resolver generated output, private upload y domain-owned video al mismo governed `assetRef`.
- Entregar entry points parity-complete para standalone, Producer, Workbench, otros dominios, SDK/MCP y Harness.
- Implementar `ProducerRefinementPort` sobre los contratos canónicos de draft/routes/estimate.
- Evitar duplicados, authority expansion y loops Producer→analysis→Producer.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`

Reglas obligatorias:

- No nace uploader, bucket, library, rights workflow ni analyzer por consumer.
- Browser/caller entrega referencia opaca; servidor resuelve asset/media/rights/eligibility.
- Agent→Producer puede crear draft y pedir estimate, nunca aprobar/reservar/ejecutar.
- La autoridad efectiva es intersección de initiating actor, agent principal, workspace y purpose.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1536 — base commands/readers/report.
- TASK-1537 — evidence/report execution.
- TASK-1467/ADR-007 — canonical private ingest and asset eligibility.
- TASK-1490/TASK-1502/TASK-1503 — refine, estimate and Producer asset contracts.
- TASK-1481/TASK-1473 — spine and cross-surface packaging conventions.

### Blocks / Impacts

- Bloquea TASK-1540 y TASK-1541.
- Impacts Producer TASK-1505, Workbench TASK-1474 and IA TASK-1523 without taking their layouts.

### Files owned

- `../efeonce-globe/packages/contracts/src/` — governed asset/source and handoff DTOs.
- `../efeonce-globe/packages/domain/src/` — asset resolver adapters and `ProducerRefinementPort`.
- `../efeonce-globe/apps/studio-web/src/app.ts` — registry/BFF cross-capability wiring.
- `../efeonce-globe/packages/sdk/src/index.ts` — entry/handoff methods.
- Producer integration seams in `producer-client.ts`, `producer-controller.ts` and related tests; no layout work.

## Current Repo State

### Already exists

- Private binary ingest, Asset Governance, Producer assets/retrieval, estimate/refine and Full API Parity spine.
- Producer viewer/review paths and Evaluation Harness.

### Gap

- Video Effectiveness cannot consume a generic governed asset or invoke/receive Producer handoffs.
- No common run reuse, origin/return or recursion contract exists.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/domain/contracts/sdk and apps/studio-web BFF`
- Future candidate home: `remain-shared`
- Boundary: `governed asset resolver plus Video Effectiveness and Producer command/reader adapters`
- Server/browser split: `asset resolution, authority intersection, route selection and draft creation server-only`
- Build impact: `none beyond existing Globe packages/apps`
- Extraction blocker: `trusted context, shared Postgres identities, Producer contracts and same-origin BFF`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `existing asset, analysis and Producer stores; no new parallel source`
- Consumidores afectados: `standalone UI, Producer, Workbench, other Globe domains, SDK/MCP and Harness`
- Runtime target: `Globe API/BFF`

### Contract surface

- Contrato existente a respetar: `TASK-1467 request/complete ingest; TASK-1536 analysis; Producer draft/estimate`
- Contrato nuevo o modificado: `governed assetRef resolver, origin/deep-link metadata and ProducerRefinementPort`
- Backward compatibility: `compatible and gated`
- Full API parity: `every consumer dispatches the same commands/readers; coverage/conformance includes all entry points`

### Data model and invariants

- Entidades/tablas/views afectadas: `existing aggregates plus optional additive handoff lineage record`
- Invariantes que no se pueden romper:
  - one `assetRef` resolves to exact immutable media identity at run creation;
  - run/deep link reuse never creates a duplicate analysis;
  - proposal lineage cites report/findings/time/frames and cannot mutate source;
  - handoff depth is bounded and no resulting candidate auto-triggers analysis.
- Tenant/space boundary: `all references reauthorized against trusted workspace; cross-workspace safe not-found`
- Idempotency/concurrency: `analysis reuse tuple; proposal key report+findings+policy; originatingRunId recursion fence`
- Audit/outbox/history: `origin surface/domain, initiating actor, agent principal, purpose, handoff and denial`

### Migration, backfill and rollout

- Migration posture: `none unless durable handoff lineage is not representable; then additive only`
- Default state: `entry/handoff coverage policy-blocked and flags OFF`
- Backfill plan: `none`
- Rollback path: `disable individual entry/handoff flags; reports/assets/drafts remain readable`
- External coordination: `none beyond TASK-1467 and Producer capability readiness`

### Security and access

- Auth/access gate: `asset read + analysis run/read + optional Producer draft/estimate capabilities`
- Sensitive data posture: `private client media/context; no raw URI/bytes/domain persistence crosses contract`
- Error contract: `not_found/access_denied/policy_blocked/invalid_request; no existence oracle`
- Abuse/rate-limit posture: `handoff depth, idempotency, per-actor quotas and command rate limits`

### Runtime evidence

- Local checks: `all origins, duplicate reuse, authority intersection, recursion and negative tests`
- DB/runtime checks: `lineage/readback when additive persistence is used`
- Integration checks: `Producer→analysis→same report and agent→Producer draft/estimate without execute`
- Reliability signals/logs: `origin, reuse/duplicate, handoff blocked, depth exceeded and return success`
- Production verification sequence: `Harness → Producer internal → Workbench/other-domain canary → keep external gated`

### Acceptance criteria additions

- [ ] No parallel uploader/store/rights path exists.
- [ ] Authority, tenancy, idempotency, lineage and recursion invariants pass positive/negative tests.

## Capability Definition of Done — Full API Parity gate

- [ ] Standalone, Producer, Workbench, other-domain and Harness use TASK-1536 command/readers.
- [ ] HTTP/SDK/MCP methods preserve one semantic request/read/handoff contract.
- [ ] Every surface has explicit coverage; unavailable consumers are `policy-blocked`, never missing.
- [ ] Producer draft/estimate remain canonical Producer primitives behind `ProducerRefinementPort`.
- [ ] Conformance proves same-run reuse, same-proposal replay, denied authority and recursion limit.
- [ ] No UI/BFF endpoint contains business logic or direct provider/storage access.

## Scope

### Slice 1 — Canonical asset intake

- Add generic asset resolution, exact identity snapshot and ingest/governance eligibility checks.
- Map Producer outputs and domain-owned assets without requiring `experimentId`.

### Slice 2 — Cross-product entry and report reuse

- Wire Producer, Workbench, other-domain, Harness and programmatic consumers.
- Preserve origin/return context and reuse existing matching run/report.

### Slice 3 — Bidirectional Producer orchestration

- Implement `ProducerRefinementPort`, route/options query, draft/estimate handoff, lineage and authority intersection.
- Add idempotency, bounded depth, `originatingRunId` and no-auto-execute/no-auto-reanalysis rules.

## Out of Scope

- Standalone/embedded UI (TASK-1540), provider evaluation (TASK-1537) and commercial flags/IAM (TASK-1541).
- New uploader/library, direct byte copy or autonomous Producer execution.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Asset resolver → entry/reuse → Producer reverse handoff. No UI surface can enable before its contract coverage is
available and negative conformance passes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| authority expansion | access | low | intersection + trusted context | denied-handoff audit |
| duplicate spend/report | analysis | medium | reuse/idempotency | duplicate-prevented |
| infinite agent loop | orchestration | low | bounded depth + explicit human re-entry | recursion-blocked |

### Feature flags / cutover

Separate standalone/Producer/Workbench/other-domain/agent-handoff flags, default OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | disable resolver consumer; retain assets | inmediato | si |
| 2 | surface flags OFF | inmediato | si |
| 3 | handoff flag OFF; drafts retained | inmediato | si |

### Production verification sequence

1. Contract/fake and cross-workspace negatives.
2. Producer internal same-run reuse.
3. Agent-created draft/estimate with zero reservation/execution.
4. One non-Producer domain canary; external remains gated.

### Out-of-band coordination required

Capability grants and rollout owner coordination in TASK-1541.

## Acceptance Criteria

- [ ] Generated, uploaded and other-domain videos resolve through one governed `assetRef`.
- [ ] Producer opens/reuses the same analysis and can show a redacted summary.
- [ ] Agent→Producer creates an idempotent draft/estimate with complete lineage and no spend.
- [ ] Authority intersection and recursion guard fail closed.
- [ ] Full API Parity coverage/conformance passes for every entry point.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1539`
- Authenticated internal E2E Producer→analysis→Producer without billable execution.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog are synchronized.
- [ ] TASK-1540 consumes only the final governed DTOs/commands.

## Follow-ups

- TASK-1540 and TASK-1541.
