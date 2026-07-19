# TASK-1453 — Premium UI Delivery Flow Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1453 — Premium agentic UI platform`
- Related wireframe: `docs/ui/wireframes/TASK-1453-premium-agentic-ui-platform.md`
- Intended route / surface: repo workflow + `/design-system/surface-recipes`
- Flow type: `platform-primitive`
- Primary primitives: direction, recipe, composed primitives, dossier and scorecard
- Copy source: task/domain canonical; Lab local-only

## Flow Brief

- Primary user: implementation agent and human reviewer.
- Entry moment: task declares UI beyond `ui-lite`.
- Successful outcome: accepted desktop/mobile surface with traceable direction/evidence.
- Primary decision/action: lock direction; accept/reject first fold and scorecard.
- Non-goals: auto-approve aesthetics, skip judgement or force one recipe.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Direction contract | composition truth | compare/lock 2–3 directions | explicit mobile target | repo doc |
| First-fold runtime/Lab | checkpoint | full composition | compact composition | Shell + recipe |
| Review dossier | evidence/critique | side-by-side frames | mobile first-class | GVC review |
| Scorecard | acceptance | 12 dimensions | same dimensions | quality gate |

## Flow Map

1. Entry: classify rigor and direction mode.
2. Primary action: persist direction, action hierarchy, targets, recipe and mapping.
3. Transition: readiness enables JSX only when substantive.
4. User decision: review first fold before exhaustive state/backend wiring.
5. Completion: desktop/mobile GVC, dossier, scorecard; baseline after approval.
6. Recovery / exit: revise direction/mapping/implementation; never lower threshold silently.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Lock direction | contract | ready | document edit | rationale |
| Select row | workbench | detail morph | Enter/Space | focus preserved |
| Review | Lab | dossier | Tab/Enter | no pointer-only |
| Accept score | dossier | baseline eligible | review command | thresholds |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| direction-draft | alternatives exist | task starts | selection | source/targets |
| ready | JSX allowed | readiness pass | first fold | substantive fields |
| first-fold-review | composition exists | capture | accept/reject | desktop/mobile |
| implementation | states/behavior | fold accepted | full capture | preserve direction |
| visual-review | evidence complete | dossier | pass/revise | 12 dimensions |
| accepted | thresholds met | quality pass | later change | baseline/version |
| revise | finding | review fail | new evidence | exact action |

## Routing Contract

- Route changes: `none` workflow; Lab hash/scroll.
- Canonical URL: `/design-system/surface-recipes`.
- Deep-link behavior: stable section IDs/markers.
- Back button behavior: standard; no hidden workflow.
- Reload behavior: transient Lab state resets; docs/evidence persist.
- Shareability: versioned paths.

## Focus & Accessibility

- Initial focus: h1.
- Escape behavior: canonical temporary surfaces only.
- Click-away behavior: never discards review/dirty state.
- Focus restore: origin row/action.
- Modal vs non-modal semantics: in-flow unless confirmation needed.
- Screen reader announcement: selected/pending/pass/revise.
- Keyboard traversal: complete.
- Reduced motion: immediate state + announcement.

## Data & Command Boundaries

- Readers: repo files/manifests.
- Commands: lint/capture/review/quality scripts.
- API routes: none.
- Optimistic updates: none.
- Cache / invalidation: baseline freshness.
- Audit / signals: findings + versioned scorecard.
- Tenant / access boundary: existing Design System gate.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| missing source | readiness block | persist direction | no invention |
| missing mobile | readiness block | add target | first-class |
| no premium profile | visual block | set premium | diagnostic opt-out explicit |
| dimension <4 | quality block | revise cited area | floor |
| average <4.5 or surface economy/visual impact <4.5 | quality block | revise composition, chrome and weak areas | threshold |
| stale baseline | visual finding | recapture/promote | no silent parity |

## GVC Scenario Plan

- Scenario: `premium-ui-surface-recipes`.
- Scenario file: `scripts/frontend/scenarios/premium-ui-surface-recipes.scenario.ts`.
- Route: `/design-system/surface-recipes`.
- Viewports: `1440x1000` / `390x844`.
- Required steps: three archetypes, selection, pending, keyboard, reduced.
- Required captures: first fold/full + interaction deltas.
- Required markers: `recipe-workbench|recipe-report|recipe-settings` plus causal interaction states.
- Assertions: selection, one primary, headings, no raw errors.
- Scroll-width checks: both.
- Accessibility/focus checks: visible/restore/live.
- Reduced-motion evidence: separate replay.

## Design Decision Log

- Decision: first-fold review is a hard checkpoint before exhaustive wiring.
- Alternatives considered: final-only, post-completion screenshot, automatic-only.
- Why this pattern: composition errors are cheapest before feature coupling.
- Reuse / extend / new primitive: extend GVC with profile/scorecard.
- Open risks: fatigue; exempt only documented `ui-lite`.
- Follow-up: measure rejection causes.

## Acceptance Checklist

- [x] Owning task declares this Flow.
- [x] Desktop/compact behavior specified.
- [x] Opening/closing/focus explicit.
- [x] Routing explicit.
- [x] Data/commands named.
- [x] Failure paths safe.
- [x] GVC proves sequence.
- [x] Decision log explains flow.
