# TASK-1523 — Globe Creative Loop Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1523 — Globe Creative Suite Experience Logic and Information Architecture`
- Related wireframe: `docs/ui/wireframes/TASK-1523-globe-creative-suite-experience-logic.md`
- Related flow: `docs/ui/flows/TASK-1523-globe-creative-suite-experience-logic-flow.md`
- Motion type: `transition-system`
- Primary primitive / library: registered Globe motion patterns via `TASK-1485`.
- Copy source: Globe Creative Suite namespace.

## Motion Brief

- Primary user: persona que necesita orientación durante trabajo creativo costoso.
- Motion intent: mostrar causalidad entre intención, run, candidato, selección e inspector.
- Uncertainty reduced: qué cambió, qué está activo y a qué candidato pertenece una acción.
- User decision supported: aprobar gasto, comparar/seleccionar y refinar.
- Non-goals: loops, cinematic delay, parallax, confetti, shake or temporal progress.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Direction | intent changes | localized replacement | Globe token | yes |
| Estimate | current/stale | state emphasis, no count-up | CSS/token | yes |
| Run | receipt/status | status + live region | CSS/token | yes |
| Candidates | durable arrival | limited first-batch entrance | Globe list | yes |
| Selection | select | ownership to inspector | layout/selection | yes |
| Inspector | open/close | adjacent reveal/sheet | overlay pattern | yes |
| Review | receipt | stable replacement | CSS/token | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Candidate | neutral | preview | visible outline | tactile | label+outline | n/a | text+icon |
| Generate CTA | cost | emphasis | visible ring | tactile | n/a | locked+status | persistent |
| Gated control | muted | reason cue | reason reachable | none | n/a | n/a | recovery |
| Inspector action | neutral | affordance | ring | tactile | n/a | pending | server result |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Intent→Direction | editing | interpreted | Globe standard | local replace | direct |
| Estimate | stale | current | Globe short | emphasis | text/icon |
| Run→Candidate | active | ready | Globe medium | stage+limited reveal | direct |
| Candidate→Inspector | selected | inspecting | Globe standard | ownership reveal | immediate |
| Inspector→Refine | parent | child intent | Globe standard | lineage cue | label |
| Review→Delivered | pending | delivered | Globe short | confirmation | direct |

## Primitive & Token Mapping

- Primitive: Globe registry via `TASK-1485`.
- Imports allowed: Globe-owned wrappers/tokens.
- Imports forbidden: Greenhouse motion primitives and unregistered libraries.
- Timing tokens: Globe `short|standard|medium`.
- Easing tokens: Globe emphasized/standard.
- Layout animation: candidate selection/inspector only.
- CSS properties: transform/opacity/clip where safe.
- GSAP/Lottie justification: none by default.

## Reduced Motion Contract

- Detection: `prefers-reduced-motion` through Globe wrapper/CSS.
- Replacement behavior: immediate state with persistent focus/status.
- Meaning preserved: lineage, selected candidate and command result labels.
- Animations removed: slide, stagger, morph and loops.
- Animations retained: none essential.

## Accessibility & Feedback

- Focus visibility: stable and contrast-safe during transitions.
- Keyboard activation: same result as pointer.
- Live region / status behavior: polite normal; assertive critical.
- Color-independent state: label/icon/outline.
- Motion-independent meaning: every end state has explicit text.
- Intermediate-frame contrast: `AA preserved` — text/status base never fades below threshold.
- Error/destructive stability: static, no shake/bounce.

## Performance Guardrails

- Compositor-only properties: transform/opacity/clip.
- Layout reads/writes: batch/localize.
- Animation scope: current decision/candidate only.
- Chart/counter constraints: no count-up for credits/estimate.
- Mobile constraints: fewer concurrent transitions; no stage/filmstrip thrash.

## GVC / Micro Evidence

- Scenario: `globe-creative-suite-experience-logic`
- Scenario file: Producer scenario extended.
- Route: `/producer`.
- Viewports: `1440×1000`, `390×844`.
- Required steps: estimate, run/gate, select, inspector, refine/review.
- Required captures: before/mid/after meaningful ownership transitions.
- Required frame labels: `estimate-current`, `candidate-arrival`, `candidate-selected`, `inspector-open`.
- Required `data-capture` markers: `creative-estimate`, `creative-candidates`, `creative-inspector`.
- Assertions: no fictitious progress, visible focus, stable final meaning.
- Intermediate-frame axe/contrast evidence: required for live copy/status.
- Reduced-motion evidence: matching final states.

## Design Decision Log

- Decision: causal localized motion.
- Alternatives considered: orbital loops, cinematic page transitions and full-feed stagger.
- Why this pattern: trust/orientation without slowing production.
- Reuse / extend / new primitive: extend Globe patterns via `TASK-1485`.
- Open risks: Globe motion registry pending.
- Follow-up: consumer tuning.

## Acceptance Checklist

- [ ] Owning task declares Motion.
- [ ] Motion supports feedback/orientation.
- [ ] Reduced motion preserves meaning.
- [ ] State does not rely on motion.
- [ ] Imports stay within Globe.
- [ ] No layout thrash.
- [ ] GVC proves interaction.
- [ ] Decision log explains rejections.
