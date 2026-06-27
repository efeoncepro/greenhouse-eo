# TASK-1252 — AI Visibility Report Artifact Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1252 — Growth AI Visibility: Report Artifact Design System`
- Related wireframe: [TASK-1252-growth-ai-visibility-report-artifact-design-system.md](../wireframes/TASK-1252-growth-ai-visibility-report-artifact-design-system.md)
- Related flow: `none`
- Motion type: `primitive-default`
- Primary primitive / library: report artifact web adapter may reuse `Motion` / Framer layout only through approved Greenhouse primitives; print/PDF/email adapters are static.
- Copy source: planned extension of `src/lib/copy/growth.ts`.

## Motion Brief

- Primary user: public prospect, authenticated client, or internal reviewer reading an AI Visibility report artifact.
- Motion intent: support orientation in the web adapter without changing the meaning of report data.
- Uncertainty reduced: user can distinguish loading, selected/expanded sections and pending render states.
- User decision supported: understand top-line result, dimension breakdown and recommendation priority without motion implying guaranteed improvement.
- Non-goals: animated report theater, chart/count-up drama, print/PDF animation, email animation, scroll-jacking, custom GSAP timelines.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Report artifact web mount | First render | Optional primitive/default entrance only if it does not delay first paint | report web adapter / `Motion` wrapper | no |
| Score and dimension values | Data render | Static values; no count-up by default | report section primitives | yes |
| Expandable/details sections | User expand/collapse if implemented | Primitive default disclosure transition; content remains readable if instant | MUI/Greenhouse disclosure primitive | conditional |
| Chart/table swap | Adapter or a11y fallback | Static swap; no animated chart geometry required | chart/table adapter | yes |
| Print/PDF/email output | Render artifact | No motion | print/PDF/email adapter | yes |
| Loading artifact | Data/render pending | Skeleton/static loading blocks matching final layout | MUI Skeleton / report adapter | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Section action | visible affordance | tokenized hover | visible focus ring | pressed affordance | expanded state label | local pending if async | stable error text |
| Recommendation card | static report row/card | subtle hover only in interactive web variants | visible focus ring | pressed affordance | persistent selected/expanded marker | none | none |
| Print/PDF controls | visible buttons outside artifact | button hover | visible focus ring | pressed | n/a | button-level pending | stable toast/inline state |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Web report entrance | not mounted | mounted | primitive default if used | subtle opacity/translate only; content first | instant render |
| Section expand | collapsed | expanded | MUI/primitive default | height/content transition only if primitive handles a11y | instant disclosure |
| Loading | skeleton | ready | primitive/default | skeleton replaced by content without layout jump | instant replacement |
| Adapter switch | chart | table fallback | none | static swap | static swap |

## Primitive & Token Mapping

- Primitive: report artifact sections, Greenhouse/MUI disclosure controls, chart/table adapters.
- Imports allowed: approved Greenhouse motion wrappers and existing primitives only.
- Imports forbidden: direct `framer-motion`, direct `gsap`, direct `@gsap/react`, direct Lottie in report consumers.
- Timing tokens: primitive defaults; local custom timing requires `motion/core/tokens.ts`.
- Easing tokens: primitive defaults.
- Layout animation: only if inherited from Composition Shell/report primitive.
- CSS properties: opacity/transform only when local motion is unavoidable.
- GSAP/Lottie justification: none.

## Reduced Motion Contract

- Detection: primitive built-in behavior or approved reduced-motion hook.
- Replacement behavior: static report render, instant expand/collapse, static skeleton replacement.
- Meaning preserved: expanded/selected/pending states use labels/icons, not motion alone.
- Animations removed: entrance, expand/collapse easing, skeleton shimmer if supported.
- Animations retained: focus ring and static state changes.

## Accessibility & Feedback

- Focus visibility: all interactive report controls have visible focus rings.
- Keyboard activation: any expandable/interactive section supports keyboard activation.
- Live region / status behavior: report render status uses appropriate loading/status semantics when async.
- Color-independent state: severity, impact, selected and pending states include text/icon/chip.
- Motion-independent meaning: score, dimensions and recommendations are understandable in static print/PDF/email.
- Error/destructive stability: render errors and denied states are static.

## Performance Guardrails

- Compositor-only properties: opacity/transform for optional web entrance.
- Layout reads/writes: no custom measurement loops in report consumers.
- Animation scope: section-level only; never animate the full document in print/PDF/email.
- Chart/counter constraints: no count-up or animated chart geometry by default.
- Mobile constraints: transitions cannot create horizontal page overflow.

## GVC / Micro Evidence

- Scenario: report artifact scenario owned by `TASK-1252` implementation.
- Viewports: desktop and mobile 390px for web adapter; print/PDF/email use static artifact review.
- Required steps: render ready report, expand optional detail if implemented, switch/show table fallback if available.
- Required frame labels: `report-ready`, `report-detail-open`, `report-table-fallback`, `report-print-static`.
- Required `data-capture` markers: artifact root, executive verdict, score, dimensions, recommendations, disclosure/footer.
- Assertions: no animated values overstate precision, no raw provider evidence, reduced-motion/static equivalent exists.
- Reduced-motion evidence: documented primitive-level fallback or GVC reduced-motion pass.

## Acceptance Checklist

- [ ] `TASK-1252` declares this file in `Motion`.
- [ ] Web motion is optional/subordinate and does not delay first paint.
- [ ] Score, dimensions and chart values are static by default.
- [ ] Print/PDF/email adapters do not depend on motion.
- [ ] Reduced-motion behavior preserves report meaning.
- [ ] No direct animation library imports are introduced in report consumers.
- [ ] GVC/static evidence proves the artifact is readable without animation.
