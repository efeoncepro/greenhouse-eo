# TASK-1546 — Globe Storyboard Mixed-Origin Realization and Cross-Domain Handoffs

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
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1543`, `TASK-1544`, `TASK-1545`, `TASK-1539`
- Branch: `task/TASK-1546-globe-storyboard-mixed-origin-handoffs`
- Legacy ID: `none`

## Summary

Materializa `ShotRealizationPlan` y los handoffs bidireccionales Storyboard↔Producer y
Storyboard↔Video Effectiveness, con assets gobernados, lineage, estimate-first, idempotencia y recursion guard.

## Why This Task Exists

Las sinergias no pueden depender de copiar prompts o abrir pantallas. Se necesita un contrato que represente
captura, grabación, generación, licencia, archivo y procesos determinísticos, y que preserve quién puede estimar,
ejecutar, incorporar o aprobar.

## Goal

- Versionar planes de realización de origen mixto y sus invariantes/rights blockers.
- Implementar handoffs exactos a Producer y Video Effectiveness sobre primitives existentes.
- Reconciliar retornos/candidatos/findings sin loops, mutaciones silenciosas ni duplicate spend.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`

Reglas obligatorias:

- No binary human/AI type; contributions use the canonical mixed-origin vocabulary.
- Storyboard never executes providers or media transforms.
- Agents may create draft/estimate only; humans approve/execute/incorporate.
- Every handoff carries exact revision/shot/asset lineage, trusted context and bounded recursion.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1543–1545, Producer SPEC-004/005/006, asset governance and TASK-1539 Video Effectiveness integration.

### Blocks / Impacts

- TASK-1547, TASK-1548 and TASK-1549.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/packages/sdk/src/`

## Current Repo State

### Already exists

- Producer catalog/run/estimate, governed assets, Video Effectiveness integration ports and Narrative revisions.

### Gap

- No Storyboard realization-plan schema or durable cross-domain handoff aggregate/adapters.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Narrative Preproduction domain with adapters to existing Globe Producer/Video Effectiveness`
- Future candidate home: `domain-package`
- Boundary: `ShotRealizationPlan plus StoryboardHandoff ports; consumers remain domain-owned`
- Server/browser split: `rights/authority/estimates/commands server-only; browser reviews redacted handoff status`
- Build impact: `additive contracts/store/adapters; no new service or provider SDK`
- Extraction blocker: `shared Globe trusted context, Postgres, asset authority and Producer credit lifecycle`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Storyboard realization revisions and durable handoff state`
- Consumidores afectados: `Storyboard, Producer, Video Effectiveness, SDK/MCP and operators`
- Runtime target: `Globe internal then commercial`

### Contract surface

- Contrato existente a respetar: `SPEC-004/005/006 Producer, SPEC-011 Video Effectiveness, ADR-007 assets`
- Contrato nuevo o modificado: `realization plan and handoff create/read/reconcile/incorporation proposal`
- Backward compatibility: `additive and gated`
- Full API parity: `domain ports/adapters; no database or UI-to-UI coupling`

### Data model and invariants

- Entidades/tablas/views afectadas: `realization plan revisions and handoff records [verificar]`
- Invariantes que no se pueden romper:
  - contribution origin never implies rights/consent;
  - returned candidate/finding cannot mutate an approved revision;
  - unknown execute outcome is reconciled before retry;
  - recursion depth and originating handoff prevent automatic loops.
- Tenant/space boundary: `all refs reauthorized in trusted workspace at create/read/reconcile`
- Idempotency/concurrency: `handoff key + downstream idempotency + revision CAS`
- Audit/outbox/history: `handoff stages, downstream IDs, human incorporation/rejection and sanitized errors`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `handoff capabilities OFF/policy-blocked`
- Backfill plan: `none`
- Rollback path: `disable adapters; preserve handoff/readability; reconcile in-flight downstream work`
- External coordination: `Producer, Video Effectiveness, rights and credit owners`

### Security and access

- Auth/access gate: `project author/handoff plus intersected downstream capabilities`
- Sensitive data posture: `scripts, masks, likeness/voice/rights and private assets`
- Error contract: `safe not_found, invalid_request, conflict, policy_blocked, dependency_unavailable`
- Abuse/rate-limit posture: `recursion depth, handoff/day, downstream estimate/execution policies and circuit`

### Runtime evidence

- Local checks: `plan invariants, adapters, recursion/idempotency and contract conformance`
- DB/runtime checks: `migration, restart and exact handoff history`
- Integration checks: `Producer draft/estimate/candidate and Video Effectiveness finding round trips`
- Reliability signals/logs: `handoff age/failure/reconcile, duplicate prevention and rights blocker`
- Production verification sequence: `read-only estimate → internal draft → human execute → return/incorporate → analysis loop`

### Acceptance criteria additions

- [ ] Authority, rights blockers, idempotency, recursion and rollback have exact evidence.
- [ ] No adapter bypasses Producer, asset or Video Effectiveness canonical primitives.

## Capability Definition of Done — Full API Parity gate

- [ ] Handoffs are governed commands/readers with all eight coverage states.
- [ ] UI/agents/SDK use one primitive; agent authority ends at draft/estimate.
- [ ] Fine capabilities, internal grants and negative tenant/recursion/replay tests ship together.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Realization plan

- Version contribution vocabulary, invariants, capture/gen needs, rights blockers and acceptance criteria.

### Slice 2 — Durable handoff aggregate

- Add state, lineage, idempotency, recursion and reconcile behavior.

### Slice 3 — Producer adapter

- Exact draft/estimate/candidate return; masked edit intent remains input, not execution.

### Slice 4 — Video Effectiveness adapter and proof

- Animatic/video context out; exact shot/time findings/proposals back.

## Out of Scope

- Scheduling, call sheets, budgeting, provider execution, automatic incorporation or final delivery.

## Detailed Spec

SPEC-012 §§8–10 govern contribution vocabulary and dynamic flows. Handoff adapters call existing domain ports and
store only opaque downstream identities/status/lineage; no cross-domain table access is permitted.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Plan vocabulary → durable handoff → Producer read-only/draft → human execute round trip → Video Effectiveness.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| duplicate spend | Producer | low | reconcile/idempotency | duplicate command |
| inferred consent | rights | medium | explicit blocker/policy | ineligible handoff |
| autonomous loop | integrations | medium | origin + depth + human action | recursion denied |

### Feature flags / cutover

Producer and Video Effectiveness adapters have independent OFF-by-default flags.

### Rollback plan per slice

Disable adapter/capability, reconcile in-flight downstream state and retain immutable history.

### Production verification sequence

Deploy OFF, negative tenant/rights/recursion tests, internal estimate/draft smoke, human-approved candidate round
trip, explicit incorporation, then one Video Effectiveness finding round trip.

### Out-of-band coordination required

Producer/Video Effectiveness/rights/credit owners and human canary approver.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Mixed-origin realization represents all six contribution types without reusing commercial `Hybrid`.
- [ ] Rights/consents are explicit blockers and never inferred by AI.
- [ ] Producer and Video Effectiveness round trips preserve exact lineage and human authority.
- [ ] Timeout/replay/recursion/tenant negative tests pass without duplicate effects.
- [ ] Returned artifacts require an explicit new Storyboard revision to become authoritative.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1546`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog/runtime handoff synchronized.
- [ ] Exact downstream commands, flags, grants and canary evidence recorded.

## Follow-ups

- TASK-1547 through TASK-1549.
