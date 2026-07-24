# TASK-1545 — Globe Storyboard Narrative Proposal and Agentic Iteration

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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1530`, `TASK-1543`
- Branch: `task/TASK-1545-globe-storyboard-agentic-proposals`
- Legacy ID: `none`

## Summary

Implementa propuestas narrativas estructuradas para Brief, Script, Storyboard, realización y respuestas de review.
Reutiliza el runtime/evals de TASK-1530 y limita la IA a proponer diffs revisables; aplicar crea una nueva revisión.

## Why This Task Exists

Llamar un modelo desde el canvas produciría texto libre, mutaciones silenciosas y otro agente genérico. Storyboard
necesita propuestas de dominio versionadas, evaluables, idempotentes y separadas de cualquier efecto o gasto.

## Goal

- Definir proposal run, structured diff, validators and lifecycle.
- Reusar Prompt Engineer profiles/runtime/evals without duplicating an agent.
- Probar stale base, malicious context, cost/step limits, human apply/reject and provenance.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/tasks/to-do/TASK-1530-globe-creative-prompt-engineer-foundation.md`
- `docs/architecture/creative-studio/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Agent produces proposals only; human apply creates authoritative revision.
- Deterministic guardrails enforce access, schema, budgets and forbidden effects.
- Exact base revision/model/prompt/profile/tools/references and limitations are recorded.
- No hidden reasoning, rights inference, approval, reservation, execution or publish.

## Normative Docs

- `.codex/skills/software-architect-2026/references/16-agentic-systems-assurance.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1530 and TASK-1543.

### Blocks / Impacts

- TASK-1546 and TASK-1547.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/packages/sdk/src/`

## Current Repo State

### Already exists

- Agent/prompt foundation task and durable Narrative revision target.

### Gap

- No Narrative Preproduction proposal policy, structured operations, validators, eval set or application command.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `Globe agent runtime plus Narrative Preproduction domain`
- Future candidate home: `domain-package`
- Boundary: `storyboard proposal policy/adapters over TASK-1530 runtime and TASK-1543 revision commands`
- Server/browser split: `model/tools/policies/stores server-only; browser reviews redacted proposal DTO/diff`
- Build impact: `additive policies/evals/store; provider SDK remains behind existing adapter/runner`
- Extraction blocker: `shared agent runtime, trusted context, credits and revision transaction`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `proposal run/history and authoritative revisions only through TASK-1543 apply`
- Consumidores afectados: `Storyboard UI, SDK/MCP and cross-domain proposal callers`
- Runtime target: `internal agent workflow then commercial`

### Contract surface

- Contrato existente a respetar: `TASK-1530 runtime/evals and TASK-1543 revision commands`
- Contrato nuevo o modificado: `proposal request/read/apply/reject and structured narrative diff`
- Backward compatibility: `additive and gated`
- Full API parity: `one proposal family across UI/HTTP/SDK/MCP/CLI/worker/sister-platform/E2E`

### Data model and invariants

- Entidades/tablas/views afectadas: `new proposal run/revision provenance records [verificar]`
- Invariantes que no se pueden romper:
  - proposal cannot mutate authoritative state;
  - apply binds exact base revision and human actor;
  - retries do not duplicate model run or applied revision;
  - access/rights/approval are deterministic policy, never model output.
- Tenant/space boundary: `trusted project/revision authorization before retrieval and apply`
- Idempotency/concurrency: `request/apply keys + base CAS + reconcile unknown provider outcome`
- Audit/outbox/history: `proposal requested/ready/rejected/applied/expired with versions and sanitized outcomes`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `agent proposals OFF; deterministic authoring unaffected`
- Backfill plan: `none`
- Rollback path: `flag/circuit OFF; proposals stay readable/rejectable; no authoritative rollback`
- External coordination: `model readiness, credit policy, privacy and creative eval reviewers`

### Security and access

- Auth/access gate: `project read + proposal capability; separate human author capability for apply`
- Sensitive data posture: `scripts, client briefs, likeness/voice and confidential references`
- Error contract: `invalid_request, conflict, access_denied/not_found, policy_blocked, dependency_unavailable`
- Abuse/rate-limit posture: `per-run/workspace budget, steps/tokens/time/retry limits and provider circuit`

### Runtime evidence

- Local checks: `schema/validator/state-machine/eval/negative policy tests`
- DB/runtime checks: `proposal persistence, restart, stale apply and idempotent replay`
- Integration checks: `exact model route canary only after readiness; fake remains hermetic baseline`
- Reliability signals/logs: `proposal latency/cost, invalid op, stale base, rejection/edit/accept and policy denial`
- Production verification sequence: `fake eval → promoted route internal canary → expert sample → allowlisted UI`

### Acceptance criteria additions

- [ ] Deterministic guardrails, provenance, concurrency, costs and human apply are evidence-backed.
- [ ] Agent outage leaves manual authoring/review fully usable.

## Capability Definition of Done — Full API Parity gate

- [ ] Proposal logic is domain/runtime-owned and transport-neutral.
- [ ] Fine request/read/apply/reject capabilities, coverage and conformance ship together.
- [ ] Apply is a human-bound exact diff over TASK-1543, not an agent backdoor.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Proposal contracts and policies

- Define scopes, structured operations, lifecycle, limits and forbidden effects.

### Slice 2 — Durable workflow and validators

- Persist checkpoints/provenance and enforce freshness/access/schema before apply.

### Slice 3 — Runtime adapter and evals

- Reuse TASK-1530 route/profile/evals; add Storyboard golden cases and adversarial slices.

### Slice 4 — Parity and canary

- HTTP/SDK/coverage/conformance, fake evidence and one promoted-route expert review.

## Out of Scope

- Autonomous revision application, Producer execution, model promotion, UI and client rollout.

## Detailed Spec

SPEC-012 §7 defines the proposal lifecycle, required provenance and deterministic guards. The exact structured
operations are frozen with golden examples before provider wiring and remain domain-specific DTOs over TASK-1530.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contracts/policy → durable workflow/validators → adapter/evals → internal canary. Apply never enables before stale,
tenant, forbidden-effect and idempotency tests pass.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| bad diff mutates canon | agent/domain | medium | proposal-only + deterministic apply | invalid-op/rollback |
| prompt injection | retrieval/agent | medium | governed context + adversarial evals | policy/eval failure |
| runaway cost | provider/credits | medium | hard budgets/circuit | cost per accepted proposal |

### Feature flags / cutover

Separate proposal request and apply; both OFF by default, apply additionally requires human author capability.

### Rollback plan per slice

Circuit/flags OFF; preserve proposal evidence and leave manual workflow available.

### Production verification sequence

Hermetic fake tests, internal provider canary with fixed brief/revision, expert blind review, adversarial cases,
cost/latency check, then one allowlisted workspace.

### Out-of-band coordination required

Creative expert labels, privacy/provider egress and credit/model readiness owners.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Proposals are structured, revision-bound, attributable and non-authoritative until human apply.
- [ ] Apply/reject/request replay and stale-base behavior are deterministic.
- [ ] TASK-1530 runtime is reused; no separate generic Storyboard agent exists.
- [ ] Evals cover quality, critical invariants, prompt injection and minority failure slices.
- [ ] Cost per accepted proposal and accept/edit/reject evidence are observable without content leakage.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1545`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog/runtime handoff synchronized.
- [ ] Exact route/profile/prompt/eval versions and rollout state recorded.

## Follow-ups

- TASK-1546, TASK-1547 and TASK-1549.
