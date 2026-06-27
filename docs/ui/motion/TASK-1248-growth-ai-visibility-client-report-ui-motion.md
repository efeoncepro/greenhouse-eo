# TASK-1248 — AI Visibility Client Report UI Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1248 — Growth AI Visibility: Client Report UI`
- Related wireframe: [TASK-1248-growth-ai-visibility-client-report-ui.md](../wireframes/TASK-1248-growth-ai-visibility-client-report-ui.md)
- Related flow: [TASK-1248-growth-ai-visibility-client-report-ui-flow.md](../flows/TASK-1248-growth-ai-visibility-client-report-ui-flow.md)
- Motion type: `microinteraction`
- Primary primitive / library: existing `CompositionShell`, `ContextualSidecar`, Adaptive Sidecar mobile drawer behavior, Framer layout only through existing Greenhouse primitives if needed.
- Copy source: planned extension of `src/lib/copy/growth.ts`.

## Motion Brief

- Primary user: authenticated client reviewing a report and moving between recommendations.
- Motion intent: clarify selection, panel replacement and loading without making the report feel promotional or theatrical.
- Uncertainty reduced: user can tell which recommendation is active, whether detail content changed, and whether a report/action is pending.
- User decision supported: inspect the priority recommendation and choose whether to start a governed next step.
- Non-goals: animated score hype, chart drama, confetti, scroll-jacking, custom drawer choreography, ranking-gamification.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Page/report load | Route entry | Skeleton resolves to static content; no delayed hero entrance required | MUI Skeleton / existing layout | yes |
| Recommendation card/list item | Hover/focus/select | Tokenized hover/focus affordance; selected state is text/icon/chip plus subtle surface change | Greenhouse card/list primitive | yes |
| Recommendation detail | Select recommendation | Content swaps in sidecar; desktop remains non-modal; mobile drawer uses primitive transition | `ContextualSidecar` | yes |
| Mobile drawer | Open/close recommendation detail | Existing Adaptive Sidecar temporary drawer behavior | Adaptive Sidecar primitive | yes |
| CTA button | Pending/disabled | Button-level pending/disabled feedback; no page-level spinner | `GreenhouseButton` | conditional |
| Charts/dimensions | First render | Prefer static render or minimal opacity; no animated counting that implies precision | chart primitive/table fallback | no |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Recommendation card | readable row/card | surface/elevation token only | visible focus ring | short pressed affordance | persistent selected marker + aria state | none | none |
| Sidecar close | icon button visible | subtle hover | visible focus ring | pressed affordance | n/a | none | none |
| Primary CTA | enabled if governed path exists | button hover token | visible focus ring | pressed affordance | n/a | inline spinner or disabled state | toast/inline only if command exists |
| Report state surfaces | stable | n/a | CTA focus visible | button pressed | n/a | skeleton/progress where scoped | error/empty copy stable |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Report skeleton | `loading` | `ready` | existing MUI/primitive default | skeleton is replaced by final layout without layout jump | immediate replacement |
| Recommendation selection | recommendation A | recommendation B | existing sidecar/content transition token if primitive provides it | detail title/body update; selected card state persists | instant content swap |
| Mobile detail open | report list | drawer open | Adaptive Sidecar primitive default | temporary drawer opens and traps focus | drawer appears without animated slide where supported |
| Mobile detail close | drawer open | report list | Adaptive Sidecar primitive default | focus restores to opener | instant close + focus restore |
| CTA pending | enabled | pending | button primitive default | local pending feedback only | static disabled/pending text |

## Primitive & Token Mapping

- Primitive: reuse `CompositionShell`, `ContextualSidecar`, Adaptive Sidecar mobile behavior, `GreenhouseButton`, `GreenhouseChip`.
- Imports allowed: existing Greenhouse primitives and their approved motion wrappers.
- Imports forbidden: direct `framer-motion`, direct `gsap`, direct `@gsap/react`, direct Lottie.
- Timing tokens: use primitive defaults; if local timing is unavoidable, map to existing motion tokens in `motion/core/tokens.ts`.
- Easing tokens: use primitive defaults.
- Layout animation: only through Composition Shell / sidecar primitives; do not hand-wire region morph names.
- CSS properties: opacity/transform/surface token changes only; avoid animating dimensions, top/left, chart geometry or numbers.
- GSAP/Lottie justification: none.

## Reduced Motion Contract

- Detection: use primitive built-in reduced-motion behavior or approved hook from the motion layer.
- Replacement behavior: instant content swaps, static selected states, no animated counters/charts.
- Meaning preserved: selected state remains visible through text/icon/chip, not motion.
- Animations removed: drawer slide, detail crossfade, skeleton shimmer if the primitive supports static fallback.
- Animations retained: focus ring and state changes that are not motion-dependent.

## Accessibility & Feedback

- Focus visibility: all recommendation controls, close buttons and CTAs keep visible focus rings.
- Keyboard activation: recommendation selection supports Enter/Space.
- Live region / status behavior: report loading/pending/error state uses existing accessible state semantics; do not announce every recommendation hover.
- Color-independent state: selected, pending, partial and severity states include label/icon/chip.
- Motion-independent meaning: sidecar title and selected recommendation text identify the active detail.
- Error/destructive stability: error/denied/empty states are static and do not use animated icons by default.

## Performance Guardrails

- Compositor-only properties: use opacity/transform where local motion is unavoidable.
- Layout reads/writes: none in view code; rely on primitives.
- Animation scope: only the detail surface or local controls, never the whole report.
- Chart/counter constraints: no animated score/count-up in V1; score is an estimate and must feel measured.
- Mobile constraints: drawer transition must not create horizontal page overflow; verify `scrollWidth == clientWidth` at 390px.

## GVC / Micro Evidence

- Scenario: `growth-ai-visibility-client-report` when implementation creates the runtime flow.
- Viewports: desktop and mobile 390px.
- Required steps: load report, select recommendation, open mobile drawer, close via Escape/close, exercise CTA pending/disabled if present.
- Required frame labels: `ready`, `recommendation-selected`, `drawer-open`, `drawer-closed`, `state-partial-or-empty`.
- Required `data-capture` markers: `client-ai-visibility-report`, `client-ai-visibility-recommendation-detail`, `client-ai-visibility-actions`.
- Assertions: selected state remains visible without motion, focus restore after drawer close, no console/page errors, no horizontal overflow.
- Reduced-motion evidence: either a reduced-motion GVC pass or a documented primitive-level reduced-motion contract.

## Design Decision Log

- Decision: keep motion functional and local to selection feedback, sidecar/drawer continuity and pending/disabled cues.
- Alternatives considered: animated score count-up, full report entrance choreography, bespoke drawer transitions.
- Why this pattern: the score is an estimate and the task is decision support; motion should orient and confirm, not dramatize.
- Reuse / extend / new primitive: reuse primitive motion defaults and tokenized CSS; no direct GSAP/Framer imports in the view.
- Open risks: if TASK-1252 introduces artifact-level motion, this view must inherit those primitives instead of duplicating.
- Follow-up: add reduced-motion capture once the runtime scenario exists.

## Acceptance Checklist

- [ ] `TASK-1248` declares this file in `Motion`.
- [ ] Recommendation selection feedback is persistent and accessible, not hover-only.
- [ ] Desktop sidecar and mobile drawer use existing primitive motion behavior.
- [ ] Reduced-motion behavior preserves selection/detail meaning.
- [ ] The score and chart values do not animate in a way that overstates precision.
- [ ] No direct animation library imports are introduced in the view.
- [ ] GVC/micro evidence proves selection, drawer close and focus restore.
- [ ] Design decision log explains why motion remains subordinate to decision support.
