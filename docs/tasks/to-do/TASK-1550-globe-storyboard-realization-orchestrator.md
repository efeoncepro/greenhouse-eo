# TASK-1550 — Globe Storyboard Realization Orchestrator and Multi-Shot Production Plan

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
- Blocked by: `TASK-1543`, `TASK-1546`
- Branch: `task/TASK-1550-globe-storyboard-realization-orchestrator`
- Legacy ID: `none`

## Summary

Construye el Realization Orchestrator que compila una Storyboard revision aprobada en un plan de produccion
multi-shot, con dependencias, paralelismo seguro, unidades de origen mixto y tareas de produccion humana.
Coordina estimate/draft/execute/reconcile con Producer, pero no convierte Storyboard en un motor de modelos ni
en el owner de credits, assets, scheduling o media.

## Why This Task Exists

Un handoff por shot no alcanza para producir una pieza completa: faltan la vista de conjunto, el orden de
dependencias, los faltantes de assets, las tareas capturadas/recordadas, el control de partial completion y la
reconciliacion de resultados desconocidos. Sin un orquestador, un operador tendria que copiar prompts y refs a
Producer, podria duplicar gasto o ejecutar contra una revision que ya cambio, y no quedaria un plan auditable
que conecte narrativa, produccion generativa y produccion humana.

## Goal

- Compilar una revision de Storyboard aprobada y sus `ShotRealizationPlan` en un plan de produccion durable,
  versionado contra un digest exacto y con un DAG de unidades de realizacion.
- Preparar y coordinar estimates/drafts con Producer mediante sus primitives canonicas, incluyendo unidades
  `captured`, `recorded`, `generative`, `licensed`, `archival` y `deterministic` sin imponer una falsa dicotomia
  humano/IA.
- Exponer estados, bloqueos, candidatos y evidencia para que una persona apruebe el plan de produccion, ejecute
  o asigne tareas humanas y luego incorpore resultados en una nueva Storyboard revision.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`

Reglas obligatorias:

- Una aprobacion narrativa y una aprobacion de plan/gasto de produccion son decisiones distintas. Ningun agente
  puede aprobar, reservar credits, ejecutar providers o incorporar automaticamente una revision.
- Storyboard es source of truth de intent, shot lineage, revision y acceptance criteria; Producer es owner de
  estimate, credit reserve, provider routing, generation y candidate output.
- El orquestador llama commands/readers canonicos, nunca SDKs de providers, URLs de bucket ni tablas desde un
  consumer. Los objetos y grants se reautorizan en el workspace trusted antes de crear cada unidad.
- Un timeout o resultado desconocido se reconcilia antes de reintentar. Un candidato siempre vuelve como
  candidate/partial y requiere seleccion e incorporacion humana en una nueva revision.
- La paralelizacion es un atributo del DAG y esta acotada por dependencias, fan-out, presupuesto, tiempo y pasos;
  no es permiso para lanzar gasto ilimitado.

## Normative Docs

- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1543` para Narrative Project, Script/Storyboard revisions, approval y persistencia durable.
- `TASK-1546` para `ShotRealizationPlan`, lineage y handoff contracts Storyboard↔Producer.
- `TASK-1500…1505` y `SPEC-004/005/006` para Producer catalog, estimate, draft, approval, execute y candidate
  lifecycle; el orquestador no reemplaza esos primitives.
- `ADR-007`/`TASK-1467` para asset governance, rights, provenance y retrieval gobernado.
- `TASK-1539` solamente como lane opcional de Video Effectiveness posterior a un candidate/animatic; no bloquea
  el plan de produccion principal.

### Blocks / Impacts

- `TASK-1547` puede consumir estado resumido del plan y sus bloqueos desde el canvas, sin duplicar logica de
  orquestacion.
- `TASK-1548` puede exportar un plan/handoff package versionado cuando su slice de export lo habilite.
- `TASK-1549` recibe evidencia de estimate, approval, recovery, policy-blocked y partial completion para rollout.
- Producer, Asset Governance, Video Effectiveness y owners humanos de captura/rodaje/voz/licencias deben acordar
  contratos de handoff y señales de recovery.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/apps/creative-runner/` (solo si la ejecución durable requiere wiring de worker ya existente)
- `../efeonce-globe/packages/sdk/src/`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/tasks/to-do/TASK-1550-globe-storyboard-realization-orchestrator.md`

## Current Repo State

### Already exists

- Storyboard define revisions aprobables, `ShotRealizationPlan`, origen mixto, acceptance criteria y handoffs
  explicitos a Producer.
- Globe tiene API Contract Spine, trusted context, commands/readers, Postgres durable, Producer catalog/estimate/
  output lifecycle y asset governance.
- Producer retorna candidates y evidencia de lineage; Video Effectiveness tiene un contrato separado para
  analizar un asset/animatic y devolver findings.

### Gap

- No existe un aggregate durable que compile varios shots en un `ProductionPlan` versionado, ni un grafo de
  dependencias que se pueda estimar, aprobar, ejecutar, pausar, reconciliar y cerrar como una unidad.
- No existe una frontera uniforme para representar tareas humanas y unidades no-generativas junto a requests de
  Producer, ni una politica de partial/blocked completion que preserve reanudacion sin duplicar gasto.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Narrative Preproduction domain with adapters to existing Producer, asset and worker primitives`
- Future candidate home: `domain-package`
- Boundary: `ProductionPlan/RealizationOrchestrator commands and readers over an exact approved Storyboard revision;
  Producer remains the downstream execution authority`
- Server/browser split: `plan compilation, rights, estimates, approval, idempotency, queues and provider calls are
  server/worker-only; browser, SDK and agents receive governed projections and statuses`
- Build impact: `additive versioned contracts, durable store and worker orchestration; no new provider SDK or
  alternate HTTP server`
- Extraction blocker: `shared Globe trusted context, Postgres transactions, Producer credit lifecycle, asset
  eligibility and human approval boundary`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `durable ProductionPlan revisions, realization-unit state, dependency graph and
  downstream lineage`
- Consumidores afectados: `Storyboard, Producer, Asset Governance, optional Video Effectiveness, SDK/MCP/CLI,
  worker and operators`
- Runtime target: `Globe internal first, then approved commercial workspace`

### Contract surface

- Contrato existente a respetar: `TASK-1543/TASK-1546 Storyboard revision and ShotRealizationPlan contracts;
  SPEC-004/005/006 Producer; API Contract Spine`
- Contrato nuevo o modificado: `compile/read/estimate/approve/start/reconcile/cancel ProductionPlan commands and
  readers, plus per-unit status/projection and downstream handoff receipts`
- Backward compatibility: `additive and policy-gated; existing Storyboard and Producer commands remain valid`
- Full API parity: `one domain primitive exposed through HTTP/SDK/MCP/CLI/worker/sister-platform/E2E/UI coverage;
  no UI-only fan-out or direct table/provider access`

### Data model and invariants

- Entidades/tablas/views afectadas: `logical ProductionPlan, plan revision, realization unit, dependency edge,
  approval, downstream receipt and reconciliation history; exact migration/table names resolved in Slice 1 [verificar]`
- Invariantes que no se pueden romper:
  - plan revision binds one exact approved Storyboard revision digest, its Script revision and the referenced
    `ShotRealizationPlan` versions;
  - a unit cannot estimate/execute when rights, consent, governed asset eligibility or dependency blockers are
    unresolved;
  - narrative approval never implies production approval, credit reserve or provider execution;
  - each downstream command has stable idempotency/fencing; unknown outcomes reconcile before retry;
  - parallel units cannot bypass DAG dependencies, plan budget/time/step/fan-out limits or tenant boundaries;
  - human production units remain actionable/manual and never claim an automated provider result;
  - returned candidates/findings cannot mutate the approved revision or auto-incorporate into Storyboard;
  - partial, blocked and failed units preserve lineage, receipts, safe errors and a resumable plan state.
- Tenant/space boundary: `workspace/project and exact Storyboard revision are derived from trusted context; every
  referenced person, asset, project, workspace, Producer handoff and returned candidate is reauthorized server-side`
- Idempotency/concurrency: `plan creation key + unit execution key + downstream Producer idempotency; optimistic
  revision CAS, durable lease/fencing for workers, dependency claim transaction and reconcile-before-retry`
- Audit/outbox/history: `append-only plan lifecycle, approval, estimate, downstream receipt, retry/reconcile,
  rights blocker, candidate return, human assignment/incorporation/rejection and sanitized error signals`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `new commands/readers policy-blocked and orchestration flag OFF; compile/dry-run may be enabled only
  for an internal allowlist after conformance`
- Backfill plan: `none; plans are created explicitly from approved revisions, with no synthetic historical runs`
- Rollback path: `disable orchestration and new claims, reconcile or cancel in-flight downstream work through
  Producer, preserve readable plan receipts/candidates, and never reverse a paid provider run`
- External coordination: `Producer/credits owner, Asset Governance/rights owner, human production owner, optional
  Video Effectiveness owner, IAM/secrets and commercial rollout owner`

### Security and access

- Auth/access gate: `fine project read/plan-author/plan-approve/plan-execute/handoff capabilities intersected with
  downstream Producer and asset capabilities; agent authority ends at proposal/draft/estimate`
- Sensitive data posture: `scripts, client references, faces/voices/likeness, rights/consent, private asset refs and
  production notes; no raw prompts, media bytes or hidden reasoning in telemetry`
- Error contract: `canonical policy_blocked, not_found, invalid_request, conflict, forbidden,
  dependency_unavailable and timeout/reconciliation outcomes; no provider/raw SQL/secret leakage`
- Abuse/rate-limit posture: `per-workspace plan/shot/fan-out/step/budget/time quotas, bounded concurrency, replay
  guard, downstream circuit breaker and kill switch`

### Runtime evidence

- Local checks: `contract schemas, DAG determinism/cycle/limit tests, lifecycle/state-machine tests, tenant/rights
  negatives, idempotency/concurrency/reconcile tests, conformance manifest and package test registration`
- DB/runtime checks: `additive migration, restart durability, lease/fencing, CAS, partial resume and audit/outbox
  readback against Postgres`
- Integration checks: `Producer dry-run estimate, draft, separate approval, one multi-unit execution, timeout then
  status reconciliation, candidate/partial return and human production-unit completion; optional Video Effectiveness
  observer round trip`
- Reliability signals/logs: `plan age, blocked-unit age, DAG deadlock, queue/claim age, duplicate-prevented,
  reconcile-after-timeout, downstream failure, budget/fan-out denial, candidate incorporation latency`
- Production verification sequence: `flags OFF → internal compile/read-only plan → dry-run estimate → human
  production approval → one bounded Producer unit → reconcile/return → manual unit → partial/resume → optional
  Video Effectiveness → expand allowlist`

### Acceptance criteria additions

- [ ] Source of truth, contract surfaces, downstream owners and all consumers are named with real paths or governed
  specs.
- [ ] Exact-revision, rights/consent, tenant, DAG, approval, idempotency and partial-completion invariants have
  executable evidence.
- [ ] Additive migration, default-off rollout, reconcile-before-retry and rollback posture are explicit and tested.
- [ ] No provider SDK, asset bytes, credit ledger or Storyboard mutation bypasses its owning primitive.
- [ ] Runtime evidence covers Postgres durability, worker fencing and at least one Producer integration without
  duplicate spend.

## Capability Definition of Done — Full API Parity gate

- [ ] `compileProductionPlan`, `getProductionPlan`, `estimateProductionPlan`, `approveProductionPlan`,
  `startProductionPlan`, `reconcileProductionPlan` and `cancelProductionPlan` are governed commands/readers or an
  explicitly documented smaller canonical family, not UI click handlers.
- [ ] Every capability declares `ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform` and `e2e` coverage;
  unavailable surfaces are `policy-blocked`, never omitted or called `missing`.
- [ ] Writes support `propose → confirm → execute`; agents can propose/read and prepare estimate, while a human
  confirms production approval and Producer executes downstream spend.
- [ ] Fine-grained grants, audit, canonical errors, negative tenant/replay/rights tests and one path for each
  consumer use the same domain primitive.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Production Plan contract and deterministic compilation

- Define versioned contracts for plan, unit, dependency edge, blocker, lineage, acceptance criteria, origin and
  plan digest; resolve exact migration/table names and ownership during discovery.
- Compile only an approved Storyboard revision plus exact `ShotRealizationPlan` versions. Detect missing governed
  assets, rights/consent blockers, script/board drift, unsupported media and human-production requirements before
  any downstream estimate or spend.
- Produce a deterministic DAG with explicit parallelizable units, dependency reasons, bounded fan-out and a
  stable plan hash. Recompiling a changed revision creates a new plan version; it never mutates a prior plan.

### Slice 2 — Durable lifecycle, approval boundary and recovery

- Persist plan and per-unit state with a state machine equivalent to
  `draft → compiled → estimated → awaiting_approval → queued → running → candidate_ready|partial|blocked|failed|
  cancelled → awaiting_review → incorporated|rejected|closed`, including typed terminal/blocker reasons.
- Separate narrative approval from production-plan approval, estimate validity, credit authorization and execute
  authority. Add CAS, leases/fencing, dependency claims, idempotency and reconcile-before-retry.
- Support pause/cancel/retry/reconcile and resume after restart. Preserve partial results and manual units without
  claiming completion of the whole plan.

### Slice 3 — Producer coordination and human production units

- Submit canonical Producer draft/estimate requests per eligible unit, carrying exact shot/panel lineage, opaque
  governed references, masks/constraints, acceptance criteria, plan revision, idempotency and correlation context.
- Fan out only after estimate and human production approval; respect Producer's route, credit, provider and
  candidate policies. The orchestrator never calls a provider or reserves credits itself.
- Represent capture, recording, voice, camera, location, license, archival and deterministic work as first-class
  manual or downstream units with owner, evidence requirement, dependency and completion status.

### Slice 4 — Candidate return, review incorporation and optional analysis observer

- Reconcile Producer candidates, partial outputs, failures and unknown outcomes into plan/unit projections with
  complete lineage and safe errors.
- Offer a human review/incorporation proposal that creates a new Storyboard revision; no candidate, finding or
  generated asset silently replaces a panel or approved revision.
- Optionally notify Video Effectiveness after an animatic/candidate is available and attach shot/time findings as
  comments or proposals. This observer lane never blocks the core production plan and never becomes approval.

### Slice 5 — Parity, conformance and controlled rollout

- Register all commands/readers, grants, coverage states, audit/outbox events and SDK/MCP/CLI/worker adapters in the
  API Contract Spine.
- Add conformance fixtures for exact revision, cycle/dependency, rights/consent, duplicate spend, timeout,
  restart, partial completion, manual unit and cross-workspace denial.
- Ship with flags OFF/policy-blocked, internal allowlist evidence, bounded pilot and an explicit handoff to
  `TASK-1549`; no commercial enablement is implied by this task.

## Out of Scope

- Editing Brief, Script, Storyboard, comments, annotations or masks; those remain in Narrative Preproduction tasks.
- Provider/model routing, prompt compilation, media generation, asset bytes, retrieval, C2PA/rights adjudication,
  credit ledger, pricebook or Producer's estimate/approval/execute authority.
- Scheduling, call sheets, crew management, budget management outside Producer's estimate/credit contract, final
  edit, post-production, delivery, publishing or client rollout.
- Autonomous booking, hiring, contacting or completing human production tasks.
- Automatic incorporation of candidates/findings into an approved Storyboard revision.
- A second task registry, database, HTTP server, worker fleet or UI-specific orchestration path in Greenhouse.

## Detailed Spec

### Compilation input and plan identity

The compiler accepts a trusted workspace/project context plus an approved Storyboard revision reference. It reads
the exact Storyboard revision digest, its Script revision, each shot/panel and the associated `ShotRealizationPlan`
revision. The resulting plan identity includes the source revision digest, plan contract version, policy/context
version, Producer catalog/version, eligibility decisions and compilation timestamp. It stores opaque asset/person/
project/workspace references and never stores provider URLs, bucket paths or vendor model slugs as public plan data.

For each shot, compilation creates one or more realization units. A unit may be generated through Producer, fulfilled
by an existing governed asset, or assigned to a human/downstream system. Units declare required inputs, acceptance
criteria, rights/consent blockers, dependencies, estimated cost class, execution owner, retry posture and expected
evidence. Origin is descriptive (`captured|recorded|generative|licensed|archival|deterministic`); it does not grant
eligibility or rights.

### Plan and unit lifecycle

The aggregate exposes plan-level and unit-level state. A plan may be `partial` or `blocked` while completed units
remain usable and pending units remain resumable. `awaiting_approval` is production approval, not narrative approval.
Every transition records actor, trusted workspace, source revision digest, policy version, correlation/idempotency,
reason and downstream receipt where applicable. Terminal states are monotonic except for an explicit resume/retry
command that creates a new attempt record; the original attempt remains evidence.

### DAG and parallel execution

The compiler rejects cycles, dangling references, duplicate unit identities and dependencies that cross workspace or
revision boundaries. A worker claims only ready units whose predecessors are terminal-success/manual-complete and whose
plan is approved. Concurrency is bounded per workspace and plan; the plan also enforces maximum units, depth, total
steps, estimate ceiling and execution window. A failed or blocked predecessor prevents dependent units from running
and exposes the exact reason to the operator.

### Producer handoff

For an eligible generative or Producer-owned unit, the orchestrator calls the existing command family with an exact
handoff payload: `originatingPlanId`, plan revision/digest, shot/panel IDs, prompt/intent references, governed asset
handles, masks/constraints, acceptance criteria, policy and idempotency/correlation. Producer returns draft/estimate,
approval requirements, downstream run receipt and candidate lineage through its existing contract. The orchestrator
stores references and statuses, not media bytes or provider credentials. A client timeout causes a reader/reconcile
before any retry.

### Human and mixed-origin work

Capture/recording/voice/camera/location/license/archive/deterministic units carry an owner, instruction, due/status
metadata, required evidence and dependency edges. They can unblock or block generated units, and generated units can
provide references for human work, but no automated command claims a human action occurred. A human completion command
must attach the governed evidence/reference required by the plan and remain separately auditable.

### Review and downstream analysis

Candidate output, manual evidence and Video Effectiveness findings are returned as non-authoritative evidence. The
review command may propose incorporation into a new Storyboard revision or reject/ask for changes. It must verify the
source revision is still current or surface a typed conflict; it must never patch the approved revision in place.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contracts/compilation) MUST precede Slice 2 (durable lifecycle).
- Slice 2 MUST precede Slice 3 (Producer fan-out); no downstream estimate/execute before state, approval and recovery
  gates exist.
- Slice 4 may develop in parallel with Slice 3 after candidate/receipt contracts are fixed, but cannot enable
  incorporation without exact-revision conflict checks.
- Slice 5 conformance and policy-blocked coverage MUST pass before any internal allowlist flip. `TASK-1549` remains
  the rollout owner; commercial enablement is a separate gate.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicate downstream execution or credit spend after retry | integration / credits | high | stable unit idempotency, fencing, status reader before retry, Producer-owned spend fence | `realization_duplicate_prevented`, reconcile-after-timeout count |
| Plan executes against a newer or revoked Storyboard/asset revision | data / access | medium | immutable plan digest, CAS, reauthorization at compile/read/execute, typed conflict | `realization_revision_conflict`, rights-blocker rate |
| DAG deadlock or runaway fan-out | worker / reliability | medium | cycle validation, bounded depth/concurrency/steps/time/budget and circuit breaker | `realization_dag_deadlock`, queue/claim age |
| Rights, consent or likeness inferred by an agent | access / legal | medium | explicit blocker inputs, no inference, safe not-found, human sign-off | `realization_rights_blocked`, denied-attempt audit |
| Human unit falsely marked complete | production / audit | medium | evidence requirement, actor-bound completion, append-only receipt, no provider substitution | manual-unit evidence mismatch |
| Partial failure hides usable work or blocks recovery | worker / UX | medium | per-unit state, resumable plan, candidate retention and reconciliation | partial-plan age, stale unit age |

### Feature flags / cutover

- Introduce a new Storyboard realization-orchestration capability flag selected and named during Slice 1
  (`default OFF` in every deployed environment until the internal evidence gate). Do not store its live value only
  in an untracked tfvars file; govern it through the existing Globe runtime/IaC configuration path.
- Keep coverage `policy-blocked` for unapproved surfaces and expose compile/read-only projections first. Enable one
  internal workspace, then one bounded multi-shot plan with Producer dry-run, then one human-approved execution.
- Revert by disabling the capability/claims and stopping new unit claims; preserve read-only plan history and
  reconcile already submitted Producer work. Never cancel or reverse a paid provider run by deleting rows.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | Disable compile commands/coverage; retain additive contracts and no historical backfill. | <5 min | si |
| Slice 2 | Disable new claims and transition commands; leave durable plans readable, reconcile leases and in-flight receipts. | <10 min | si, con trabajo en vuelo |
| Slice 3 | Stop fan-out/Producer submissions through capability gate; use Producer status to settle unknown work before any retry. | <5 min | parcial |
| Slice 4 | Disable observer/incorporation proposals; retain candidates/findings and require manual review. | <5 min | si |
| Slice 5 | Revert allowlist/coverage to `policy-blocked`, redeploy if needed, and hand evidence/remaining work to `TASK-1549`. | <15 min | si |

### Production verification sequence

1. Validate contracts, capability manifest and additive migration locally; confirm every new test is listed in the
   owning Globe package `test` script.
2. Apply migration in staging, restart each relevant service/worker and verify plan/unit/receipt/audit readback;
   prove no existing Producer/Storyboard rows changed.
3. Deploy with orchestration OFF/policy-blocked and run compile/read-only fixtures for approved, stale, cross-workspace,
   rights-blocked, cycle and unsupported-unit cases.
4. Enable one internal workspace; compile a multi-shot plan, verify deterministic hash/DAG and run a Producer dry-run
   estimate without reservation.
5. Obtain explicit production-plan approval, execute one bounded unit, force a client timeout, read/reconcile status,
   and prove no duplicate downstream command or credit reservation.
6. Complete one human-production unit with evidence, return a candidate/partial plan, restart the worker, resume and
   verify per-unit/plan/audit state.
7. Optionally send the candidate to Video Effectiveness, verify findings return as non-authoritative proposal/comment,
   and verify no automatic Storyboard mutation.
8. Expand only after signals, recovery evidence and `TASK-1549` rollout ownership are accepted.

### Out-of-band coordination required

Producer/credits owner must confirm estimate/approval/execute boundaries and receipt semantics. Asset Governance and
Legal/Privacy/IP owners must confirm rights, likeness, voice, consent and retention blockers. Creative production
owners must define evidence/ownership for capture, recording, camera, location and licensing units. Video
Effectiveness owner may approve the optional observer lane. IAM/secrets and commercial rollout owners coordinate
capability grants, flags, staging and internal allowlist; no external client rollout is part of this task.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] A versioned `ProductionPlan` can be compiled only from an approved exact Storyboard revision and its exact
  `ShotRealizationPlan` versions; stale/revoked/cross-workspace inputs fail closed with canonical errors.
- [ ] Compilation produces a deterministic, cycle-free, bounded DAG with explicit parallelism, blockers, mixed-origin
  units and human-production tasks; recompile never mutates a prior plan.
- [ ] Durable plan and per-unit state survive restart and support estimate, separate production approval, queue,
  running, candidate/partial/blocked/failed/cancelled, reconcile, resume and close semantics.
- [ ] Producer integration uses canonical commands/readers and returns opaque receipts/candidates; no provider SDK,
  provider URL, asset bytes or credit-ledger write is owned by the orchestrator.
- [ ] Idempotency, worker fencing and reconcile-before-retry prevent duplicate downstream execution after retry,
  timeout, restart or multi-replica claim.
- [ ] Rights/consent/eligibility, tenant/access, fan-out, budget/time/step and dependency limits are enforced before
  estimate/execute, with audit and reliability signals.
- [ ] Human production units require actor-bound evidence and never claim automated completion; partial plans preserve
  usable results and resumability.
- [ ] Candidates, manual evidence and Video Effectiveness findings remain non-authoritative until a human creates or
  rejects a new Storyboard revision; no automatic incorporation exists.
- [ ] Full API Parity coverage, grants, conformance negatives and `policy-blocked` default are registered across all
  eight Globe surfaces, with one shared primitive for UI, SDK, MCP, CLI, worker, sister-platform and E2E consumers.
- [ ] Staging/runtime evidence proves migration durability, one bounded Producer execution, timeout reconciliation,
  no duplicate spend, manual unit completion, partial resume and rollback/disable behavior.

## Verification

- `pnpm task:lint --task TASK-1550`
- `pnpm ops:lint --changed`
- In `../efeonce-globe`: `pnpm check` and `pnpm build`
- In `../efeonce-globe`: focused contract/domain/database/worker/conformance tests plus package test-script audit
- Staging migration/readback, restart/fencing, Producer dry-run/estimate, timeout reconciliation and bounded
  multi-shot smoke as described above
- `pnpm docs:context-check:strict`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown queda sincronizado con el estado real (`in-progress` al tomarla, `complete` al
  cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedan sincronizados con el cierre.
- [ ] `Handoff.md` queda actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` queda actualizado si cambia comportamiento, estructura o protocolo visible.
- [ ] Se ejecuta chequeo de impacto cruzado sobre Storyboard, Producer, Asset Governance, Video Effectiveness,
  credits y rollout.
- [ ] No se declara producción lista mientras flags, grants, migraciones, worker/deploy, evidencia runtime o
  coordinación externa sigan pendientes.
- [ ] La evidencia de incorporación/rechazo humano y de no mutación automática de Storyboard queda enlazada al
  handoff de cierre.

## Follow-ups

- `TASK-1549` — consumir la evidencia de rollout/parity y decidir la habilitación por workspace.
- Nueva task de incorporación/revisión de `ProductionPlan` si el primer piloto requiere una surface visual dedicada;
  el orquestador no crea UI en esta task.
- Nueva task de persistencia rica de workspace/grants si el runtime de Globe todavía no cubre el nivel de colaboración
  requerido para el piloto.
- Nueva ADR o enmienda de ADR-012 solo si la implementación propone cambiar la frontera de autoridad aceptada.

## Open Questions

- `[verificar]` wire names finales y migration number en `efeonce-globe` durante Slice 1.
- `[verificar]` si el plan vive como aggregate propio o como projection durable de Narrative Preproduction con un
  worker de claims separado; no decidir por conveniencia de la UI.
- `[verificar]` semántica exacta de `estimate` agregado en Producer cuando hay unidades manuales/licenciadas y
  candidates parcialmente disponibles.
