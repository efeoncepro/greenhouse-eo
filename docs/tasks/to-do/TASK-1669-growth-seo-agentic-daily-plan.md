# TASK-1669 — Marketing Studio: plan diario SEO/AEO sobre cola y agentes canónicos

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
- Epic: `EPIC-049`
- Status real: `Diseno` — especialización Studio reconciliada 2026-10-04; sin runtime nuevo.
- Rank: `TBD`
- Domain: `growth|seo|ai|data`
- Blocked by: `TASK-1908`, `TASK-1913`, `TASK-1914`, `TASK-1915` (contrato SEO y foundation de agentes Studio)
- Branch: `Greenhouse develop; Studio main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Marketing Studio compone un plan diario SEO/AEO explicable desde la cola canónica de Greenhouse,
las referencias de planificación y el estado editorial/outcomes. Especializa el rol SEO/AEO de
TASK-1914 y sus work items/dispatcher (TASK-1913/TASK-1915), sin otro orquestador Greenhouse/Nexa,
otra cola, un segundo ledger de recomendaciones o una prioridad calculada por IA.

## Why This Task Exists

El operador necesita próximos pasos defendibles para producir, revisar o esperar medición, no una
lista genérica de ideas. La spec original diseñaba tablas de agentes y tools Nexa en `growth.seo`;
el ownership ratificado coloca la planificación editorial y agentes en Studio. Se conservan los
contratos de evidencia, límites, fallback, costo y autoridad humana; la implementación genérica
pertenece al programa híbrido ya abierto. El diseño anterior queda archivado como historia superseded.

## Goal

- Convertir evidencia autorizada en recomendaciones advisory con refs/reason/freshness/missingData.
- Mantener el orden/version de TASK-1700 y mostrar fuente degradada sin inventar score o datos.
- Usar role cards, assignment/run/provenance/costo de Studio; mutations ejecutadas por cada dueño autorizado.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` §14.
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md`.
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §18.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Greenhouse mide y prioriza; Studio interpreta/planifica. Nexa, Claude, Codex, API, UI y MCP consumen
la misma operación Studio con autoridad delegada; no implementan prompts o reglas de negocio propios.

## Normative Docs

- `docs/tasks/to-do/TASK-1908-marketing-studio-seo-aeo-plan-search-visibility-360.md`.
- `docs/tasks/to-do/TASK-1913-marketing-studio-work-items-assignments.md`.
- `docs/tasks/to-do/TASK-1914-marketing-studio-agent-role-registry-role-cards.md`.
- `docs/tasks/to-do/TASK-1915-marketing-studio-agent-dispatcher-claude-openai-adapters.md`.
- `docs/tasks/to-do/TASK-1909-marketing-studio-agentic-ai-provenance.md`.
- `docs/tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md`.
- `docs/tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md`.
- `.codex/skills/efeonce-agent-seo-aeo/SKILL.md`, `seo-aeo/SKILL.md` and served SEO reading/spend manuals.
- `docs/audits/seo/editorial-history/2026-10-04/README.md` — not an executable specification.

## Dependencies & Impact

### Depends on

- TASK-1908: scoped SV360 context/snapshots; TASK-1913: work/assignment/deliverable; TASK-1914: published role cards;
  TASK-1915: dispatcher/ports/runs/programs. No runtime foundation is reimplemented by 1669.
- TASK-1909: model provenance and human acceptance; TASK-1894/TASK-1899: shared command kernel/delegation.
- TASK-1700: canonical `readSeoWorkQueue` and decision command, complete foundation rather than outstanding blocker.
- TASK-1659/TASK-1660: declared membership intent when available; not available remains explicit rather than inferred.
- TASK-1664/TASK-1667/TASK-1668: discovery/editorial/outcome context when available; absent branch degrades with reason.
  A read-only base plan can exist before all branches; full research→editorial→measurement acceptance needs them.

### Blocks / Impacts

- TASK-1912 exposes plan/review, TASK-1911 records accepted learnings and next work in its calendar.
- Greenhouse SEO surfaces may open/read the Studio plan by authorized reference, never own another lifecycle.
- Agent role skills get the exact operation mapping at implementation; interactive skill does not imply production dispatcher.

### Files owned

- Repo Studio: SEO/AEO role extension/type in contracts; adapter/domain plan specialization;
  `packages/contracts/src/operations.ts`, existing work-item and agent interfaces from TASK-1913/1914/1915.
- Greenhouse: role skills/manuals/architecture plus necessary scoped existing serving lanes, no `growth/seo/agents`
  runtime, `seo_agent_plan_runs` or `seo_agent_recommendations` tables or dedicated Nexa executor.
- Gateway: generated Studio manifest synced through existing parity pipeline, not hand-maintained per-client tools.

## Current Repo State

### Already exists

TASK-1700 reader gives immutable snapshots, version, health, staleness and canonical ordering; interactive
SEO/AEO role skill already consumes this queue. Studio foundation registers domain/API operations.

### Gap

No plan generation/runtime is delivered by this task. 1908/1913/1914/1915 remain to-do; existing
interactive role output does not equal durable scheduled execution. No new live verification was performed.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Studio domain/role/dispatcher specialization; Greenhouse SEO authorized readers.
- Future candidate home: `remain-shared`
- Boundary: Studio owns advisory plan/deliverable; Greenhouse owns priority/source facts/decision ledger.
- Server/browser split: context, redaction and policy server-side; consumers receive typed display-safe DTOs.
- Build impact: `none` — reuse dispatcher provider ports; no provider SDK or domain logic in UI/Nexa.
- Extraction blocker: delegated actor scope and immutable references to canonical queue/evidence.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Studio work-item deliverable/role version/run/provenance; queue authority unchanged.
- Consumidores afectados: Studio UI/API/MCP, authorized agent clients, Greenhouse link consumers.
- Runtime target: Studio staging/production; shared dispatcher providers only when enabled by TASK-1915.

### Contract surface

- Contrato existente a respetar: readSeoWorkQueue+feedback; Studio operation registry, role cards and dispatcher contracts.
- Contrato nuevo o modificado: advisory SEO/AEO plan deliverable and context adapter, not a second generic runtime.
- Backward compatibility: `gated` — additive role capability/plan operation, preserves SEO reader contract.
- Full API parity: same Studio command/reader and schema across consumers; no Nexa-only tool logic.

### Data model and invariants

- Persist a versioned Studio deliverable/reference tied to work/assignment/run and provenance, not duplicate plan-run
  or recommendations tables in Greenhouse. Exact operation/type names fixed against foundation at implementation.
- Context wraps the authorized queue. Sequence of subject refs is an ordered subsequence of `readSeoWorkQueue`;
  no own score/weight/threshold/reason ladder and no sorting by AI confidence.
- `priorityScoreVersion`, `inputSnapshotHash`, computed/expiry and `alsoSurfacedBy` retained. Origin health is
  per-source; one fallen origin never lowers another origin's score. Missing demand score is NULL, never zero.
- durable subject `(seoTargetId, origin, normalizedKeyword)` and snapshot/item refs distinct; planned expiry cannot
  outlive its source snapshot. `fresh|stale|absent` from source, absent means no capture, not no work.
- Declared membership intent (target/opportunity/NULL with actor/version) and estimated search intent separate.
- Recommendation fields: perspective/action/subjectRef/reasonCode/evidenceRefs/confidence/missingData,
  source freshness/expiry, estimated cost/disclosure, allowlisted owner command and `requiresHumanApproval=true`
  for mutation/spend recommendations. Narrative is untrusted commentary, never executable command text.
- IDs/refs must resolve within context and tenant; arbitrary commands/URLs/SQL, unknown schema fields and authority
  escalation are rejected. Competitive source classification propagates to every consumer/agent mode.
- Tenant/space boundary: campaign and delegated actor derive org server-side; referenced SEO target must match.
- Idempotency/concurrency: shared assignment/run identity; same inputs/scope/version produce bounded replay, no extra dispatch.
- Audit/outbox/history: shared Studio run/provenance/work history; usage/cost/latency/model/version/fallback metadata,
  no prompt/completion raw, provider bodies, secrets, full HTML or signed links in deliverable/logs.
- Write-target allowlist: shared Studio boundary allowlist if present, updated in implementation PR.

### Migration, backfill and rollout

- Migration posture: `additive` specialization to Studio types/role seeds only if foundation needs it.
- Default state: `disabled`/shadow role program according to TASK-1915; no new Greenhouse agent flag.
- Backfill plan: none; don't import interactive output as verified executed work.
- Rollback path: disable role/program and keep historical deliverables/provenance, no source writes undone.
- External coordination: reuse approved dispatcher providers/limits; no provider account or credential introduced here.

### Security and access

- Auth/access gate: Studio capability/grant/parity and delegated person; scheduled mode bounded by TASK-1915 program.
- Sensitive data posture: context allowlist+redaction, same audience/competitive rules as source lanes.
- Error contract: typed unavailable/partial/fallback/stale/validation errors, never optimistically invent source data.
- Abuse/rate-limit posture: one bounded plan, role/org cost cap, finite context and calls; no recursion/autonomous loop.

### Runtime evidence

- Local checks: queue order parity, schema/subject/authority validation, fallback, injection and cost limit tests.
- DB/runtime checks: shared work/deliverable/run refs/provenance and absence of duplicate Greenhouse state.
- Integration checks: Studio API/MCP readback same plan; source failures/stale/absent negatives; no domain write.
- Reliability signals/logs: model/usage/cost/latency/validation/fallback/degraded-context metadata without contents.
- Production verification sequence: interactive fixtures → shadow program → allowlisted read-only plan → authorization gates.

## ADR Gate

Studio strategy ADR §14 ratifies this relocation 2026-10-04. TASK-1915 remains sole dispatcher and
TASK-1914 sole role registry. Planning does not authorize an autonomous operator or provider spending.

<!-- ZONE 2 — PLANNING -->

## Scope

Context and SEO plan specialization, three analytical perspectives, output validator/policy merger,
deterministic fallback, same-primitive serving, and role evaluation fixtures over canonical foundation.

## Out of Scope

A new Nexa or Greenhouse orchestrator, model provider/router, priority calculator, feedback ledger,
editorial work lifecycle, automatic content/publish/tracking/grader/provider captures or grants.

<!-- ZONE 3 — IMPLEMENTATION -->

## Detailed Spec

Three V1 analytical perspectives specialize published cards or steps in the existing SEO/AEO Studio role:
`seo_researcher`, `editorial_planner`, `qa_measurement`. They are not three independent runtime engines;
role ownership/version/catalogue is TASK-1914, any execution/assignment/ports/program are TASK-1915.

Research uses canonical opportunities/discovery/market+declared intent with date and source; proposes select,
measure/discover/track only as bounded human-confirmed owner command proposals, or wait/no_action. It never
calls Labs or invents volume/difficulty or interprets absent volume as low demand. Competitor gap remains its owner.
Editorial planning uses selected subjects/URL/owner/audience/offer/CTA/locale, Studio brief/draft and question refs;
proposes create/refresh/fix/consolidate/review only when minimum fields exist. It doesn't generate final copy,
Gutenberg/Elementor, claims or canonical/robots edits, activate prompts or turn consolidation into refresh.
QA/measurement reads Studio validation/publication evidence and Greenhouse baseline/outcomes; proposes review,
wait or iteration with coverage/confidence. It never marks QA passed, approved, published, observed or causally supported.

The shared dispatcher receives one bounded context snapshot, preserving queue order. At most 3 model calls
(one per analytical perspective), 50 candidates, 20 work/outcome refs and 10 final recommendations per plan;
timeout/token/cost ceiling may be stricter than these bounds. No recursion or agent-to-agent tool execution.
Deterministic fallback uses available readers and preserves queue order; no model call required in fallback.
Output schema is versioned. Policy forces human approval for mutating/cost actions, removes unknown refs,
retains evidence/provenance, sets expiry from the oldest required source and never promotes missing data into fact.

`baseline_fallback` proposes select when candidate evidence exists, refresh only with measured demand+owner URL,
create only with declared target+complete brief, fix on QA block, verify on unverified publication, wait on absent
baseline/consolidation, and no_action when no justified action exists. Every rule remains advisory; none invokes
owner commands. Modes `ai|baseline_fallback|mixed|unavailable`, plus partial source states, are visible.
IA cost stays distinct from DataForSEO ledger and unknown usage stays null. No SEO budget reservation/spend.

Feedback maps to `recordSeoWorkQueueDecision`; accepted is a decision, never execute. Stale recommendation cannot
be used as authorization: the owner command rereads actor/state/cost/idempotency and applies its existing gates.
Forbidden recommendations: direct publish, prompt activation, grader run, raw WordPress write, delete evidence,
change entitlement. Allowed mutation proposal still requires explicit request/confirmation at the owner boundary.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1908 context +1913 work +1914 role +1915 dispatcher → plan contract/order adapter → validator/fallback → staged parity.
1667/1668 needed for full editorial/measurement branches, not for qualitative planning with honest missing-data states.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| AI changes priority or fabricates metrics | measurement | high | ordered-subsequence test and refs/schema validation | order_parity/validation_failure |
| Injection executes an unsafe action | authority | high | advisory output, command allowlist, owner guards | unsafe_action_rejected |
| Cost/recursion unbounded | agents | medium | shared role/program caps, 3-call limit, fallback | cost_limit/fallback |
| Second dispatcher or decision ledger | architecture | medium | reuse 1913/1914/1915 and queue feedback | boundary tests |

### Feature flags / cutover

Use Studio role/program enablement and shared dispatcher controls from TASK-1915; default disabled/shadow for
this specialization. No `GROWTH_SEO_AGENT_RECOMMENDATIONS_ENABLED` deployment is prescribed in Greenhouse.
No runtime flag changed by the 2026-10-04 documentary adjustment.

### Rollback plan per slice

Disable the role specialization/program, preserve delivered plans/provenance and source snapshots;
no source business command is executed by the plan, so no source mutation rollback is assumed.

### Production verification sequence

1. Order/refs/schema/fallback/injection/limits fixtures with no writes.
2. Foundation staged role/assignment run and readback via API/MCP, same immutable plan.
3. Shadow authorized context including source partial/stale/absent cases; no data invention or spending.
4. Read-only plan in one scoped organization with explicit operator authorization before promotion.

### Out-of-band coordination required

Dispatcher/role and SEO owner approve contract mapping; no credentials, model account or new Nexa runtime.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Plan belongs to Studio and reuses 1913/1914/1915; no Greenhouse agent tables/runtime or second dispatcher.
- [ ] Context adapter reads only authorized canonical sources and reports health/freshness/missing data.
- [ ] Order parity test proves plan subject sequence is an ordered subsequence of the same queue snapshot.
- [ ] Adapter has no score/weight/threshold/priority ladder; queue version/hash/expiry and alsoSurfacedBy preserved.
- [ ] Origin failure is disclosed without affecting other origin scores; NULL scores and absent capture are not zero.
- [ ] Three analytical perspectives have versioned inputs/outputs/prohibitions within Studio role registry.
- [ ] Bounded shared execution: ≤3 model calls, ≤50 candidates, ≤20 work/outcomes, ≤10 recommendations; no recursion.
- [ ] Versioned output rejects unknown fields/refs/commands and false approval requirement for mutable actions.
- [ ] Recommendations retain subject/action/reason/evidence/confidence/cost/missingData/freshness/expiry/authority.
- [ ] Models cannot directly call providers or domain commands; forbidden publish/activation/grader/delete/grants rejected.
- [ ] Deterministic fallback and partial/mixed/unavailable states are tested and visible, never invented data.
- [ ] IA usage/cost separated from DataForSEO and no SEO budget reservation/spend; telemetry has model/version/latency/fallback.
- [ ] Shared deliverable/run/provenance stores no raw prompt/completion/secrets/HTML/signed URLs.
- [ ] Declared and estimated intent remain separate; NULL doesn't become opportunity, and two lenses are not averaged.
- [ ] Same plan primitive exposed via Studio API/operations/MCP and authorized consumers including Nexa, no client-specific prompts.
- [ ] Stale recommendation rejected as authority; owner command checks state/permission/cost/idempotency before mutation.
- [ ] Feedback uses canonical queue command, never executes on accepted; no duplicate feedback store.
- [ ] Foundation gate/program is disabled or shadow with staged allowlist/rollback documented.
- [ ] End-to-end fixture research→planning→QA/measurement→policy uses shared execution without business writes.
- [ ] Prompt injection/unsafe action and cross-tenant/audience cases reject with sanitized signal.
- [ ] Technical/functional/manual docs and mirrored role skills explain advisory versus confirmed owner execution.

## Verification

`pnpm task:lint --task TASK-1669`, `git diff --check`, documentation closure/context checks.
At implementation: meaningful order/schema/authority/fallback/cost/injection tests and staged shared-run parity readbacks.

## Closing Protocol

Remain to-do; this ownership adjustment does not mark acceptance or runtime complete. Register evidence
for each criterion before moving. Update EPIC-049/dependencies, role skills, docs/manual and runtime handoff
at actual implementation closure; consume Greenhouse facts without duplicating their authority.

## Follow-ups

TASK-1912 consumer UI and TASK-1911 learnings/calendar; TASK-1667/1668 feed specialized branches.

## Open Questions

Exact Studio operation names and whether the three perspectives are role-card variants or bounded steps
are foundation discovery choices constrained by one registry/dispatcher and the same advisory deliverable contract.
