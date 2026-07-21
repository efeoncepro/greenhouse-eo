# TASK-1453 — Premium Surface Motion System Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1453 — Premium agentic UI platform`
- Related wireframe: `docs/ui/wireframes/TASK-1453-premium-agentic-ui-platform.md`
- Related flow: `docs/ui/flows/TASK-1453-premium-agentic-ui-platform-flow.md`
- Motion type: `transition-system`
- Primary primitive / library: `framer layout + canonical motion tokens`
- Copy source: `n/a`

## Motion Brief

- Primary user: operator moving between inventory/detail/report/settings.
- Motion intent: preserve orientation and make causality/selection/pending legible.
- Uncertainty reduced: what changed, which item owns detail, whether command runs.
- User decision supported: compare/select/act without re-reading.
- Non-goals: decoration, loops, delayed first paint, scroll hijacking.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Regions | first render | short stagger | CompositionShell rich | yes |
| Row → detail | select | shared layout emphasis | framer layout | yes |
| Density | resize | interruptible morph | card-density | yes |
| Command | submit | localized pending/result | Button/status | yes |
| Signal | refresh | restrained emphasis | CSS/token | optional |
| Preview | context | crossfade/settle | PreviewStage | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Row | quiet | depth cue | ring | compress | rail/tint/icon | stable | inline |
| Primary | contained | elevation | ring | tactile | n/a | spinner+label | confirmation/error |
| Signal | neutral | detail cue | ring | n/a | tint | skeleton | icon+text |
| Preview | stable | n/a | controls | n/a | current label | skeleton | recovery |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| enter | unmounted | visible | canonical short | region reveal | immediate |
| selection | A | B | fast/emphasized | interruptible | immediate state |
| density | full | condensed | cardDensity transition | reflow/no clip | immediate |
| pending | ready | pending | fast | stable label | same status |
| preview | old | new | standard | crossfade | swap+announce |

## Primitive & Token Mapping

- Primitive: Shell, card-density, Button, surface-system primitives.
- Imports allowed: repo Framer wrapper and canonical motion tokens.
- Imports forbidden: direct `framer-motion`, raw GSAP/Lottie, local ms/easing.
- Timing tokens: existing `motion/core/tokens.ts` exports.
- Easing tokens: canonical productive/emphasized.
- Layout animation: transform or interruptible layout for live state-copy; opacity only where intermediate AA contrast remains proven.
- CSS properties: transform, opacity, theme color/border/shadow transitions.
- GSAP/Lottie justification: none.

## Reduced Motion Contract

- Detection: canonical hook/media query.
- Replacement behavior: immediate swap; selected/pending labels persist.
- Meaning preserved: text, ARIA, focus and live status.
- Animations removed: stagger, translate, scale, delayed fade.
- Animations retained: minimal progress indication.

## Accessibility & Feedback

- Focus visibility: never animated away/covered.
- Keyboard activation: Enter/Space.
- Live region / status behavior: announce completion/failure once.
- Color-independent state: icon + label + semantics.
- Motion-independent meaning: persistent DOM/ARIA/text.
- Intermediate-frame contrast: AA preserved; GVC interaction frames run axe at acknowledgement and settled states.
- Error/destructive stability: no shake/bounce/moving control.

## Performance Guardrails

- Compositor-only properties: transform/opacity.
- Layout reads/writes: Framer owns measurement.
- Animation scope: contextual region, not whole page per update.
- Chart/counter constraints: no fictional count-up.
- Mobile constraints: shorter/no stagger; no horizontal movement.

## GVC / Micro Evidence

- Scenario: `premium-ui-surface-recipes`.
- Scenario file: `scripts/frontend/scenarios/premium-ui-surface-recipes.scenario.ts`.
- Route: `/design-system/surface-recipes`.
- Viewports: `1440x1000` / `390x844`.
- Required steps: selection, detail replace, pending→success, density, reduced replay.
- Required captures: before/active/after.
- Required frame labels: `selection-before|selection-active|selection-after|pending|reduced-motion`.
- Required markers: `premium-motion-state` + archetype.
- Assertions: focus, selected semantics, live status, no overflow.
- Intermediate-frame axe/contrast evidence: required at immediate feedback and settled frames.
- Reduced-motion evidence: separate capture, identical final state.

## Design Decision Log

- Decision: rich-by-default motion lives in composed primitives, bounded by meaning.
- Alternatives considered: no motion, local CSS, cinematic transitions.
- Why this pattern: causal feedback reusable; local animation drifts.
- Reuse / extend / new primitive: reuse tokens/wrappers; extend defaults.
- Open risks: excess in dense workbenches; scope/score mitigate.
- Follow-up: calibrate performance budget from evidence.

## Acceptance Checklist

- [x] Owning task declares Motion.
- [x] Motion tied to meaning.
- [x] Reduced motion preserves meaning.
- [x] Focus/selected/pending/error independent of motion.
- [x] Approved imports.
- [x] Performance guardrails.
- [x] GVC proves interaction.
- [x] Decision log explains motion.
