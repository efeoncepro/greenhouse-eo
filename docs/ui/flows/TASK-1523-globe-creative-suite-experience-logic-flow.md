# TASK-1523 — Globe Creative Loop Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1523 — Globe Creative Suite Experience Logic and Information Architecture`
- Related wireframe: `docs/ui/wireframes/TASK-1523-globe-creative-suite-experience-logic.md`
- Intended route / surface: `/producer` + futuro Workbench.
- Flow type: `multi-surface`
- Primary primitives: Globe composer, stage, candidate band, inspector, floating and dialog patterns.
- Copy source: Globe Creative Suite namespace.

## Flow Brief

- Primary user: persona autorizada que crea, dirige, revisa o entrega media.
- Entry moment: quick create, brief, recipe, reference, asset or review deep link.
- Successful outcome: candidato revisado/entregado y memoria reusable conservada.
- Primary decision/action: avanzar la próxima decisión explícita.
- Non-goals: provider UI, chat-only flow, implicit spend or auto-approval.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Producer | quick create | stage+composer+candidates | sequential | existing |
| Workbench | directed work | brief/direction+stage+dock | stepwise | TASK-1474 |
| Inspector | candidate context | adjacent sidecar | full-height sheet | candidate |
| Floating context | options/evidence | anchored | anchored/sheet fallback | floating |
| Blocking dialog | spend/rights/release/dirty | modal | modal/full-height | dialog |
| Review/Delivery | human decision | contextual handoff | focused surface | owned |

## Flow Map

1. Entry: resolve workspace, project, responsibility, capabilities and starting context.
2. Primary action: declare or open an intention.
3. Transition: Globe restates direction and proposes route/shape with reasons.
4. User decision: adjust context or approve current estimate/spend.
5. Completion: run yields candidates; user selects, refines, reviews and delivers.
6. Recovery / exit: preserve dirty work, explain gates and restore last safe decision.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Open brief/recipe | entry | Intent/Direction | Enter | no execute |
| Request estimate | composer | Estimate current | Enter/button | read-only |
| Generate | estimate dock | approval/run | Enter/button | current estimate |
| Select candidate | candidate band | Inspector | Enter/Space | selection only |
| Refine | Inspector | child intent/run | Enter/button | parent retained |
| Send to review | Inspector | Review | Enter/button | gated |
| Deliver/share | Review | release/share | Enter/button | explicit authority |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| context_resolving | authority unknown | entry/switch | ready/denied | stable shell |
| intent_editing | direction mutable | create/open | estimate | dirty state |
| estimate_stale | tuple changed | edit | current | Generate gated |
| ready_to_run | gates pass | estimate | approve/edit | cost+cap visible |
| running | attempt active | approved command | candidate/fail/cancel | real state |
| candidate_ready | outputs available | completion | inspect/refine/review | candidate semantics |
| inspecting | candidate selected | selection | close/action | context preserved |
| review_pending | human decision | send | approve/changes | no auto-pass |
| delivered | scope released | release | revoke/new | evidence |
| gated | authority/readiness/rights/budget absent | check | resolved | cause+recovery |

## Routing Contract

- Route changes: `path|query`
- Canonical URL: `/producer`; Workbench owned by `TASK-1474`.
- Deep-link behavior: opaque scoped project/candidate/review IDs only.
- Back button behavior: closes inspector/returns to stable surface before leaving.
- Reload behavior: rehydrates server truth; clears invalid stale estimate/selection.
- Shareability: authenticated links scoped; public share uses dedicated contract.

## Focus & Accessibility

- Initial focus: H1 or primary intent control based on entry.
- Escape behavior: closes non-blocking layer; dirty/gating dialog requires decision.
- Click-away behavior: transient context only.
- Focus restore: trigger, selected candidate or region heading.
- Modal vs non-modal semantics: modal only when safe continuation requires decision.
- Screen reader announcement: `polite` for normal states; `assertive` for critical failure.
- Keyboard traversal: DOM equals visual; no CSS reorder.
- Reduced motion: immediate replacement with focus/announcement preserved.

## Data & Command Boundaries

- Readers: tenancy/responsibility, catalog/direction/estimate, run/status, assets/lineage, credits, review/delivery.
- Commands: existing prepare/execute/refine/review/delivery only.
- API routes: governed BFF/private API spine; none new.
- Optimistic updates: presentation selection only.
- Cache / invalidation: workspace/project switch clears scoped cache, selection and estimate.
- Audit / signals: underlying commands.
- Tenant / access boundary: workspace-scoped, fail-closed.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | safe state | switch/request access | no leak |
| empty | actionable empty | create/open context | not denied |
| partial | affected plane labeled | retry reader | honest |
| stale | estimate invalidated | refresh/re-estimate | no generate |
| timeout | run-safe status | read state first | no duplicate spend |
| dirty exit | confirmation | stay/save/discard | restore focus |

## GVC Scenario Plan

- Scenario: `globe-creative-suite-experience-logic`
- Scenario file: Producer scenario extended.
- Route: `/producer`.
- Viewports: `1440×1000`, `390×844`.
- Required steps: context→intent→estimate→run/gate→candidate→inspector→review.
- Required captures: transitions and failure paths.
- Required `data-capture` markers: wireframe registry.
- Assertions: current estimate, real status, safe retries and focus restore.
- Scroll-width checks: document and overlays/scroll-containers.
- Accessibility/focus checks: keyboard, live region, inertness and restore.
- Reduced-motion evidence: same progression without spatial motion.

## Design Decision Log

- Decision: one Creative Loop, two entry modes.
- Alternatives considered: modality apps, chat and node graph.
- Why this pattern: continuity and memory with ceremony appropriate to job.
- Reuse / extend / new primitive: extend; promotion via `TASK-1485`.
- Open risks: Workbench route and gated capabilities.
- Follow-up: consumer alignment.

## Acceptance Checklist

- [ ] Owning task declares this Flow.
- [ ] Desktop and compact behaviors exist.
- [ ] Escape/click-away/focus restore are specified.
- [ ] Routing/back/reload are explicit.
- [ ] Business logic stays in contracts.
- [ ] Failure paths are safe.
- [ ] GVC proves the flow.
- [ ] Decision log explains two entry modes.
