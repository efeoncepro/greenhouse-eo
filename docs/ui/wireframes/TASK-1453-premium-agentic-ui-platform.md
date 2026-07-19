# TASK-1453 — Premium Agentic UI Platform Wireframe

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1453`
- Product Design asset: `docs/ui/visual-directions/TASK-1453-premium-ui-platform-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: agents, implementers, reviewers and Design System maintainers
- Copy source: `local Lab copy; domain consumers use canonical copy`
- Primitive decision: `new composed primitives over shell/density/motion foundations`
- UI ready target: `yes`

## Brief

- Primary user: UI implementation agent and human reviewer.
- User moment: select direction, implement first fold, critique and accept a new surface.
- Job to be done: start from coherent premium composition instead of assembling atoms freehand.
- Primary decision signal: direction/recipe are explicit and scorecard meets threshold.
- Non-goals: universal skin, retroactive migration, decorative motion.

## Desktop Target — 1440×1000

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Page header | Visual thesis, hierarchy, primary action | WorkbenchHeader | fixture |
| 1 | Integrated signal rail | Prioritize 3 signals inside the hero plane, without a sibling KPI card | SignalStrip `integrated` | fixture |
| 2 | Primary | Open inventory rail, editorial report story or asymmetric settings flow | CompositionShell primary | fixture |
| 3 | Context | Open decision canvas, one impact surface or evidence stage | OperationalSection / PreviewStage | fixture |
| 4 | Commands | Contextual action hierarchy | ContextCommandBar | fixture |
| 5 | Sections | Narrative/operational groups | OperationalSection | fixture |

## Mobile Target — 390×844

- Header stacks title/status and one primary; secondary actions use canonical overflow.
- Integrated signal rail becomes a compact three-column summary, not three stacked cards.
- Context moves inline or to canonical temporary surface; primary content stays first.
- Command bar remains reachable and never covers focus.
- Condensed/peek cards preserve primary datum and recovery.

## Action Hierarchy

- One contained primary per decision context.
- Secondary actions use outlined/text and group by consequence.
- Destructive actions never match forward-path visual weight.
- Row selection is not styled as a global CTA.
- Disabled/pending actions explain why and keep geometry stable.

## Visual Fidelity Mapping

| Direction cue | Greenhouse implementation | Forbidden |
|---|---|---|
| Quiet luminous depth | AXIS surface/elevation/gradient tokens | raw hex/blur/shadow |
| Editorial hierarchy | Geist variants + bounded lines | raw font-size/family |
| Dense but breathable | recipe slots + 4n spacing + density | local card pile |
| Chrome economy | `open`/`rail`/`band` plus role-specific contained layers | card-on-card / rounded wrapper for spacing |
| Visual impact | one dominant task-native canvas/stage/panel | uniform polish across identical cards |
| Selected context | selection primitive + layout motion | blue border everywhere |
| Causal motion | motion tokens/wrappers | ad-hoc ms/easing/imports |
| Domain identity | recipe/kind/direction variables | universal template skin |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `lab.surfaceRecipes.title` | Header | Surface recipes | none | Lab-only |
| `lab.surfaceRecipes.workbench` | Section | Operational workbench | none | Lab-only |
| `lab.surfaceRecipes.report` | Section | Analytics & report | none | Lab-only |
| `lab.surfaceRecipes.settings` | Section | Settings & flow | none | Lab-only |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Direction locked | Recipe and evidence contract are active. | Inspect mapping | Lab |
| loading | Composing surface | Preserving layout while signals arrive. | none | skeleton |
| empty | No items match | Adjust view or create the first item. | Review filters | contextual |
| partial | Some evidence is delayed | Available data shows freshness. | Retry evidence | no fake zero |
| error | Section could not load | Other regions remain usable. | Retry section | localized |
| denied | View unavailable | Access is insufficient for this context. | Return | anti-oracle |

## Accessibility Contract

- Heading order: one h1; h2 sections; h3 operational groups.
- Chart/table alternatives: report recipe includes text/table equivalent.
- Aria labels: selection, freshness, pending and preview explicit.
- Focus notes: selection and commands retain/restore focus; sticky regions do not hide it.
- Color-independent state labels: icon + label + accessible text.

## Implementation Mapping

- Route / surface: `/design-system/surface-recipes`.
- Primitives: CompositionShell plus eight composed `surface-system` primitives.
- Variants / kinds: recipe variants; domain kinds resolve to them.
- Component candidates: `src/components/greenhouse/primitives/surface-system/**`.
- Copy source: local Lab only.
- Data reader / command: none, fixtures.
- API parity: n/a.
- Access / capability: Design System gate.
- Runtime consumers: future workbench/report/settings surfaces.
- Print/email/PDF considerations: report recipe has print-safe hierarchy; Lab screen-only.
- GVC markers: `recipe-workbench`, `recipe-report`, `recipe-settings` and causal interaction markers.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/premium-ui-surface-recipes.scenario.ts`.
- Route: `/design-system/surface-recipes`.
- Viewports: desktop `1440x1000` and mobile `390x844`.
- Quality profile: `premium`.
- Required steps: three archetypes, select row, pending, keyboard, reduced-motion.
- Required captures: first fold/full page + pre/post interaction + compact.
- Required `data-capture` markers: recipe roots, first folds, full pages and causal interaction states.
- Assertions: one primary, headings, no raw error, selected semantics, no overflow.
- Scroll-width checks: desktop and 390px.
- Accessibility/focus checks: focus-visible, keyboard selection/action, live pending.
- Reduced-motion evidence: same final meaning without morph/stagger.
- Review dossier: required before acceptance.
- Baseline: required after direction/scorecard approval.

## Design Decision Log

- Decision: three visibly distinct archetypes sharing grammar/primitives.
- Alternatives considered: atom-only Lab, one dashboard template, screenshots only.
- Why this pattern: proves reuse without sameness and gives agents a concrete first fold.
- Reuse / extend / new primitive: extend shell/density/motion; new composed primitives.
- Open risks: over-abstraction, card wallpaper and decorative density; the scorecard and `data-ui-surface` probe test all three.
- Follow-up: adopt in new tasks, then audit legacy separately.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready.
- [x] Mapping names primitives, source, data contract and surface.
- [x] GVC plan includes premium, desktop/mobile, dossier and baseline.
- [x] Decision log explains reuse/extend/new.
