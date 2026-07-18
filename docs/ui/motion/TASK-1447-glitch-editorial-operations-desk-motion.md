# TASK-1447 — Glitch Editorial Operations Desk Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1447 — Glitch Editorial Operations Desk`
- Related wireframe: `docs/ui/wireframes/TASK-1447-glitch-editorial-operations-desk.md`
- Related flow: `docs/ui/flows/TASK-1447-glitch-editorial-operations-desk-flow.md`
- Motion type: `primitive-default`
- Primary primitive / library: `CompositionShell rich + existing ContextualSidecar/framer layout`
- Copy source: `src/lib/copy/glitch.ts`

## Motion Brief

- Primary user: editor/a operando una cola densa.
- Motion intent: preservar orientación cuando cambia selección/región y dar feedback de commands.
- Uncertainty reduced: qué candidata está seleccionada, qué panel cambió y si la acción terminó.
- User decision supported: revisión de evidencia, promoción y recovery.
- Non-goals: espectáculo editorial, counters animados, scroll effects o motion propio de cada card.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Composition regions | route/first load | stagger estándar sin retrasar first paint | `CompositionShell fluidity='rich'` | yes/default |
| Inspector | selection/open/replace | layout morph/temporary Drawer existente | `ContextualSidecar` | yes |
| Selected row | selection | tonal state + short transition | CSS token | yes |
| Command action | propose/confirm/retry | pending -> status feedback; no celebratory motion | existing Button/status | yes |
| Run dock | state update | layout-preserving content update | framer layout existing | optional |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Candidate row | neutral | raised/tonal subtle | visible ring | compressed feedback | text+icon+tonal | unchanged | status label |
| Promotion action | enabled | canonical hover | visible ring | canonical press | n/a | disabled + progress | live status, stable color+text |
| Inspector close | icon button | canonical hover | visible ring | canonical press | n/a | disabled only during blocking confirm | focus restored |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| open inspector | closed | open | `standard` / emphasized | region morph existing primitive | instant show + focus |
| replace candidate | open A | open B | `short` / standard | content cross-state without spatial exit | instant content swap |
| mobile Drawer | closed | open | primitive default | temporary surface transition | instant visibility |
| command feedback | pending | success/error | `short` / standard | opacity/status only | immediate status |

## Primitive & Token Mapping

- Primitive: `CompositionShell`, `ContextualSidecar`, existing Button/status primitives.
- Imports allowed: canonical primitives and motion tokens.
- Imports forbidden: direct `gsap`, ad-hoc animation libraries, raw milliseconds/easings.
- Timing tokens: `short`, `standard`.
- Easing tokens: `standard`, `emphasized`.
- Layout animation: existing framer layout inside shell/sidecar only.
- CSS properties: opacity/transform/background-color where existing tokenized primitives permit.
- GSAP/Lottie justification: none.

## Reduced Motion Contract

- Detection: baked into CompositionShell/sidecar and CSS media query.
- Replacement behavior: regions/inspector appear instantly; focus/status behavior unchanged.
- Meaning preserved: selection, pending and outcome remain text/icon/state-driven.
- Animations removed: stagger, layout morph and Drawer slide.
- Animations retained: none required for meaning.

## Accessibility & Feedback

- Focus visibility: canonical focus rings never suppressed during layout change.
- Keyboard activation: Enter/Space mirrors pointer.
- Live region / status behavior: command terminal state announced once.
- Color-independent state: label+icon accompany semantics.
- Motion-independent meaning: all state visible without animation.
- Error/destructive stability: error/confirm surfaces do not auto-dismiss.

## Performance Guardrails

- Compositor-only properties: transform/opacity for custom wrappers; primitive owns its internals.
- Layout reads/writes: no view-level manual measurement loops.
- Animation scope: selected regions only; no whole-table per-row stagger after updates.
- Chart/counter constraints: no charts/counters V1.
- Mobile constraints: no simultaneous shell+Drawer custom animations beyond primitive defaults.

## GVC / Micro Evidence

- Scenario: `glitch-editorial-operations-desk`
- Scenario file: `scripts/frontend/scenarios/glitch-editorial-operations-desk.scenario.ts`
- Route: `/growth/glitch`
- Viewports: 1440x900 and 390x844; desktop first-fold also 2048x1280.
- Required steps: open/replace/close inspector; propose/confirm; pending/error recovery.
- Required captures: inspector open, command pending, terminal status, mobile Drawer, reduced-motion equivalents.
- Required frame labels: `ready`, `inspector-open`, `promotion-confirm`, `command-result`, `mobile-drawer`, `reduced-motion`.
- Required `data-capture` markers: `glitch-evidence-inspector`, `glitch-promotion-confirm`, `glitch-run-dock`.
- Assertions: no focus loss, no duplicate live announcement, no animation blocks interaction.
- Reduced-motion evidence: dedicated viewport/context with `prefers-reduced-motion` and same terminal state.

## Design Decision Log

- Decision: consume primitive defaults only; no domain animation layer.
- Alternatives considered: GSAP editorial flourish, animated scores, per-row stagger on every refresh.
- Why this pattern: motion supports orientation and trust, while editorial data remains primary.
- Reuse / extend / new primitive: reuse.
- Open risks: dense list update could still move selection; verify stable keys and scroll anchoring.
- Follow-up: none until GVC shows a real comprehension gap.

## Acceptance Checklist

- [x] The owning task declares this file in `Motion`.
- [x] Motion intent is tied to feedback and orientation.
- [x] Reduced-motion behavior preserves the same meaning.
- [x] Focus, selected, pending and error states do not rely on motion alone.
- [x] Imports use approved Greenhouse wrappers/primitives.
- [x] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/micro evidence proves the meaningful interaction.
- [x] Design decision log explains why primitive-default motion is sufficient.

