# <TASK-#### / Surface> — <Wireframe Name>

## Meta

- Status: `draft | ready-for-implementation | implemented`
- Owner task:
- Product Design asset: `docs/ui/visual-directions/TASK-####-short-slug-direction.md|durable source path`
- Visual direction mode: `source-led|repo-native-benchmark`
- Intended consumers:
- Copy source:
- Primitive decision:
- UI ready target: `no|yes`

## Brief

- Primary user:
- User moment:
- Job to be done:
- Primary decision signal:
- Non-goals:

## Desktop Target — 1440×1000

[First-fold reading order, dominant region, contextual relationship, action
placement, density and intended fold.]

## Mobile Target — 390×844

[How the composition transforms—not merely shrinks—including context, command
placement, density, touch/focus and overflow.]

## Action Hierarchy

- Primary:
- Secondary:
- Destructive:
- Selection vs action:
- Pending / disabled:

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
|  |  |  |  |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header |  |  |  |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `<domain>.<capability>.<surface>.<section>.<slot>` |  |  |  |  |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready |  |  |  |  |
| loading |  |  |  |  |
| empty |  |  |  |  |
| partial |  |  |  |  |
| error |  |  |  |  |
| denied |  |  |  |  |

## Accessibility Contract

- Heading order:
- Chart/table alternatives:
- Aria labels:
- Focus notes:
- Color-independent state labels:

## Implementation Mapping

- Route / surface:
- Primitives:
- Variants / kinds:
- Component candidates:
- Copy source:
- Data reader / command:
- API parity:
- Access / capability:
- Runtime consumers:
- Print/email/PDF considerations:
- GVC markers:

## GVC Scenario Plan

- Scenario file:
- Route:
- Viewports:
- Quality profile: `premium`
- Required steps:
- Required captures:
- Required `data-capture` markers:
- Assertions:
- Scroll-width checks:
- Accessibility/focus checks:
- Reduced-motion evidence:
- Review dossier: `required`
- Baseline: `surfaceId|required after direction approval|not required — documented ui-lite reason`

## Design Decision Log

- Decision:
- Alternatives considered:
- Why this pattern:
- Reuse / extend / new primitive:
- Open risks:
- Follow-up:

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
