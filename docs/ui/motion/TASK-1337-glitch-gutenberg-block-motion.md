# TASK-1337 — Glitch Gutenberg Block Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1337 — Public Site Gutenberg Glitch Block`
- Related wireframe: `docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md`
- Related flow: `none`
- Motion type: `none`
- Primary primitive / library: `none`
- Copy source: `docs/documentation/public-site/glitch-drop-gutenberg-block.md`

## Motion Brief

- Primary user: Efeonce editor/author and blog reader.
- Motion intent: no authored motion in V1; the block should read as stable editorial content.
- Uncertainty reduced: avoids making the POV look like a promotional widget or attention-grabbing ad unit.
- User decision supported: reader distinguishes Efeonce commentary from quoted source material through structure and label, not effects.
- Non-goals: no reveal behavior, pulsing accents, counters, scroll effects, GSAP, Framer, Lottie or custom timing system.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| `aside.gh-glitch-drop` | page load | none | none | yes |
| `.gh-glitch-drop__content` | editor focus | native Gutenberg focus only | WordPress editor | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Front-end block | static aside | no authored hover | no focus target | N/A | N/A | N/A | N/A |
| Editor content field | native editor state | native editor behavior | native keyboard focus | N/A | native selection | N/A | editor-native warnings |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | no authored transition | same static output |

## Primitive & Token Mapping

- Primitive: none.
- Imports allowed: none for motion.
- Imports forbidden: `gsap`, `@gsap/react`, Framer Motion, Lottie or custom animation helpers.
- Timing tokens: none.
- Easing tokens: none.
- Layout animation: none.
- CSS properties: static layout/color/spacing only.
- GSAP/Lottie justification: not justified for V1.

## Reduced Motion Contract

- Detection: no custom detection required because V1 has no authored effects.
- Replacement behavior: same static output.
- Meaning preserved: label `Glitch`, `aside` semantics and copy carry all meaning.
- Animations removed: all authored effects are out of scope.
- Animations retained: none.

## Accessibility & Feedback

- Focus visibility: editor uses native Gutenberg focus behavior.
- Keyboard activation: editor content field remains keyboard editable.
- Live region / status behavior: none.
- Color-independent state: tone/style cannot be the only semantic signal.
- Motion-independent meaning: all meaning is in text, semantic wrapper and accessible label.
- Error/destructive stability: WordPress invalid-block warnings must be resolved before rollout.

## Performance Guardrails

- Compositor-only properties: N/A.
- Layout reads/writes: none.
- Animation scope: none.
- Chart/counter constraints: N/A.
- Mobile constraints: static block must not create horizontal overflow at 390px.

## GVC / Micro Evidence

- Scenario: draft/private Glitch post verification.
- Scenario file: to be created during implementation if automated capture is used.
- Route: local/staging private or draft Glitch post preview.
- Viewports: `1440x1000`, `1280x900`, `390x844`.
- Required steps: insert block, save, reload editor, preview front-end.
- Required captures: editor canvas, front-end desktop block, front-end mobile block.
- Required frame labels: static state only.
- Required `data-capture` markers: `glitch-block` if implemented, otherwise `.gh-glitch-drop`.
- Assertions: no authored effects are needed for meaning; no page horizontal overflow; keyboard editing works.
- Reduced-motion evidence: static output is identical.

## Design Decision Log

- Decision: V1 has no authored motion.
- Alternatives considered: decorative reveal, pulsing border, shiny/accent treatment.
- Why this pattern: the block is editorial commentary; stability and semantic clarity matter more than attention capture.
- Reuse / extend / new primitive: no motion primitive.
- Open risks: future visual polish may try to add effects without an updated motion contract.
- Follow-up: only add authored effects in a future task if they solve a real comprehension or feedback problem.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved Greenhouse wrappers/primitives or none.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
