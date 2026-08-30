# TASK-1352 — Motion contract: Sistema vivo de crecimiento

## Meta

- Status: `draft; prototype and evidence required`.
- Owner task: `TASK-1352 — Landing HubSpot: sistema vivo de crecimiento`.
- Related wireframe: [`TASK-1352-landing-hubspot-agentic-platform.md`](../wireframes/TASK-1352-landing-hubspot-agentic-platform.md).
- Related flow: [`TASK-1352-landing-hubspot-agentic-platform-flow.md`](../flows/TASK-1352-landing-hubspot-agentic-platform-flow.md).
- Motion type: `orchestrated + microinteraction + one-shot scroll reveal`.
- Runtime: public WordPress/Ohio; CSS + minimal page-scoped vanilla JS by default.
- Primary library: existing public runtime only. Do not import Greenhouse portal primitives into WordPress or add a
  motion dependency merely for fades/lines.
- Copy source: approved copy deck; no critical text inside SVG/canvas.

## Motion Brief

- Primary user: decision-maker evaluating fit, breadth and implementation risk.
- Motion intent: demonstrate that six outcome families belong to one connected system and clarify what changed after
  selection.
- Uncertainty reduced: “¿esto son módulos aislados o un operating system conectado?” y “¿qué seleccioné?”.
- User decision supported: identify family/sector, understand continuity and reach assessment without distraction.
- Non-goals: spectacle, ambient animation, simulated AI autonomy, cinematic brand film, retention loops or scroll
  control.

Every motion must answer at least one question:

1. What belongs together?
2. What changed because of user input?
3. Where does the reading continue?
4. Did the operation start, succeed or fail?

If it answers none, remove it.

## Motion posture

- Tier: `immersive-causal`, not decorative.
- Base state is complete and visible before JS.
- Orchestration is one-shot and interruptible; no ambient loops after composition.
- Input wins over animation; a new selection cancels/replaces the previous transition.
- Quiet zones—fit/no-fit, free/paid threshold, proof, FAQ and form—minimize motion.
- The system thread never tracks the pointer or exact scroll progress.
- Reduced motion and no-JS are first-class compositions, not degraded leftovers.

Las seis trayectorias de motion preservan el orden y los nombres canónicos: `Marketing, Content & AEO`; `Sales & AI Pipeline`;
`Revenue Lifecycle`; `Service, Customer Success & Delivery`; `Data, Integration & CRM Intelligence`; y
`Agent Hub & Agentic Operations`. Motion never renames, merges or promotes one family into a separate hierarchy.

## Narrative choreography

| Beat | Region | Natural state | Enhanced motion | Meaning | Reduced/no-JS |
|---|---|---|---|---|---|
| 01 | R1 hero copy | visible | short staged clarification | thesis before mechanism | static final |
| 02 | R1 system stage | six paths visible | paths resolve once toward shared system | connection | static paths |
| 03 | R2 tension | visible editorial contrast | local state transition only | isolated→connected | static comparison |
| 04 | R3 atlas | all families present | selected path/panel emphasized | outcome choice | instant/all expanded |
| 05 | R4 sectors | all controls/content available | adjacent emphasis cross-fade | lens changed | instant replace |
| 06 | R5 fit | static | no ornamental entrance | pause/criterion | identical |
| 07 | R6 threshold | static comparison | divider/relationship resolves once | free vs paid | final state |
| 08 | R7 delivery | numbered steps visible | system thread advances one time | sequence/accountability | numbered list |
| 09 | R8 eligibility | visible list | state emphasis only | constraint/governance | static list |
| 10 | R9/R10 proof/FAQ | visible | native disclosure feedback | evidence/answer | native behavior |
| 11 | R11 form | visible | field/status feedback only | completion/recovery | equivalent status |

## First-fold sequence

Natural paint order is the final semantic order. Enhancement may apply a from-state only after capability detection;
CSS never ships key content hidden.

1. Eyebrow/H1 are immediately readable.
2. Subhead resolves with a small compositor-only offset.
3. Primary CTA becomes visually settled before system-stage completion.
4. Secondary action and proof appear as a unit, without carousel/counter.
5. System stage resolves its connections once.
6. Motion stops. Hover/focus/selection remain causal only.

Constraints:

- Main perceptual sequence completes within the `extended` token (600 ms) after activation; elements may overlap.
- CTA never waits for art and remains clickable throughout.
- Any scroll, pointer, keyboard or touch input cancels nonessential hero choreography.
- No loop, autoplay media, counter, pulse, shimmer or moving background after completion.
- LCP element cannot depend on JS, SVG animation or an additional font.

## Motion Inventory

| Element | Trigger | Feedback | Implementation | Required? |
|---|---|---|---|---|
| hero copy | first eligible paint | subtle staged settle | CSS classes + token vars | optional enhancement |
| system paths | first eligible paint | one-shot connection | inline SVG/CSS, decorative | signature |
| primary CTA | hover/press/focus | lift/ack/ring | CSS tokens | required feedback |
| outcome control | hover/focus | partial signal/ring | CSS tokens | required feedback |
| outcome selection | activation | path + panel emphasis | CSS + minimal JS | required |
| sector control | activation | pressed marker + content replace | CSS + minimal JS | required |
| threshold divider | viewport one-shot | relation resolves | CSS/observer | optional |
| delivery thread | viewport one-shot | step continuity | CSS/observer | optional signature |
| FAQ | native activation | icon/state | native details + CSS | required feedback |
| form | input/submit/result | focus, pending, success/error | renderer contract | required |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success/error |
|---|---|---|---|---|---|---|---|
| primary CTA | stable solid | ≤2 px lift | immediate ring | 0.98 ack | n/a | label + progress | destination/form state |
| Meetings | text/secondary | underline/arrow | ring | native ack | n/a | n/a | external result unknown |
| family control | label/path | partial signal | ring + full label | short ack | number/label/path/ARIA | n/a | n/a |
| sector control | neutral | surface emphasis | ring | short ack | marker + `aria-pressed` | n/a | n/a |
| cluster link | descriptive | underline/arrow | ring | native | visited optional | n/a | route handles |
| FAQ summary | closed/open | subtle | ring | native | expanded semantics | n/a | n/a |
| form field | neutral | border only | ring/label | native | valid state textual | n/a | local error/success |
| submit | enabled | emphasis | ring | ack | n/a | stable button + status | success/error surface |

No magnet buttons, 3D tilt, cursor effects, vibration, sound, confetti, bouncing arrows or animated shadows.

## Transition Specs

Use the exact page-scoped scale below, aligned with the repo motion scale. No per-component literals.

| Transition | From | To | Token | Behavior | Reduced fallback |
|---|---|---|---|---|---|
| tap acknowledgement | rest | pressed | `instant` 75 ms | small scale only | immediate |
| hover/focus companion | rest | hover | `short` 150 ms | transform/color; focus ring instant | immediate |
| selection exit | prior | neutral | `standard` 200 ms + accelerate | fade/signal release | immediate |
| panel selection enter | neutral | emphasized | `medium` 300 ms + emphasized | cross-fade/small translate | immediate |
| system path resolution | unresolved | connected | `long` 400 ms + emphasized | stroke/clip/opacity | static final |
| hero composition ceiling | natural | settled | `extended` 600 ms max | overlapping sequence | static final |
| form status swap | pending | result | `standard` 200 ms | cross-fade without layout shift | immediate |

### Token mapping

```text
--hsx-motion-instant: 75ms
--hsx-motion-short: 150ms
--hsx-motion-standard: 200ms
--hsx-motion-medium: 300ms
--hsx-motion-long: 400ms
--hsx-motion-extended: 600ms
--hsx-ease-emphasized: cubic-bezier(0.2, 0, 0, 1)
--hsx-ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
--hsx-ease-exit: cubic-bezier(0.3, 0, 0.8, 0.15)
--hsx-ease-linear: linear
```

These variables are declared once in the page scope after confirming the public runtime has no canonical equivalent.
Components consume variables, never raw values. `transition: all` is prohibited.

## Atlas behavior

### Default

- Six paths/names/outcomes are visible.
- Visual emphasis may start on family 01, without implying recommendation.
- Paths are decorative; labels and all critical meaning are HTML.

### Hover/focus

- Hover reveals only an affordance, never changes selected content.
- Focus ring appears immediately and is independent of HubSpot signal color.
- Touch does not inherit hover lift or sticky state.

### Selection

```text
input → cancel current transition → update semantic state
      → release prior path/panel → emphasize new path/panel
      → preserve focus/scroll → announce only necessary state
```

- Panels remain in DOM or have a complete no-JS counterpart.
- No animated height. For disclosures use native `details` or grid-row technique with bounded content.
- Selection animation uses transform/opacity/stroke only and cannot delay text availability.
- Rapid 01→03→06 input must end at 06 with no orphan hidden panel.

## Sector-lens behavior

- Selected indicator combines label, marker/shape and `aria-pressed`; color is reinforcement.
- Adjacent content replaces emphasis with a cross-fade/small translate on desktop.
- Mobile/reduced mode switches immediately to prevent disorientation.
- Reset to `Todos los sectores` uses the same path and restores general content.
- No animated reordering of the entire page or price/calculation morph.

## Scroll behavior

- Browser-native scroll only; no snap, hijacking, wheel interception or scrub timeline.
- `IntersectionObserver` may trigger one-shot region choreography without making content initially invisible.
- Thresholds are tolerant of short/large viewports; missing observer produces complete static UI.
- Sticky atlas rail is allowed only after prototype proves reading/focus and is removed on compact/mobile.
- No parallax on text, CTA, proof, form or background.
- No sticky CTA bar consuming mobile viewport.

## Color in motion

- `--hsx-signal-primary` moves only along the active causal path and stops.
- Warm/cool transitions may distinguish demand/action from data/governance only if defined in the asset/token ledger.
- Text color never animates through a non-AA intermediate frame.
- Focus token is independent and remains visible over all active colors.
- Partner badge/logo never glows, morphs, pulses, rotates or changes color.
- Semantic error/success colors never identify outcome families.

## Primitive & Token Mapping

- Primitive: CSS transitions/keyframes + page-scoped vanilla controller; native `details` and form renderer.
- Imports allowed: existing public-site utilities already loaded and documented.
- Imports forbidden: direct Greenhouse portal motion imports, new GSAP/framer/Lottie dependency without approved
  exception, arbitrary animation library from CDN.
- Timing tokens: exact six-step scale above.
- Easing tokens: emphasized, standard, exit, linear.
- Layout animation: none; no width/height/top/left/margin/padding animation.
- Properties: transform, opacity, stroke-dashoffset, limited clip-path/filter after trace.
- GSAP/Lottie justification: none by default. A prototype must show clear complexity/performance/accessibility benefit
  and page-scoped loading before approval.

## Reduced Motion Contract

- Detection: CSS `prefers-reduced-motion: reduce`; JS controller listens through `matchMedia` and responds live.
- Replacement behavior: render final connected stage; selections switch instantly; anchors jump with correct focus.
- Meaning preserved: labels, path relationships, selected state, process order and form status.
- Removed: hero stagger, path drawing, translations, scroll reveals, parallax, decorative fades.
- Retained: focus ring, pressed/expanded/selected semantics, progress/status necessary for operation.
- Spinner: use renderer’s accessible reduced variant; do not replace pending with a fake zero or hidden state.
- GVC must capture actual reduced mode at 1440 and 390; source code media query alone is not evidence.

## No-JS and partial failure

- CSS base is final/visible. JS enhancement adds and removes from-states after capability detection.
- No element remains `opacity:0`, `visibility:hidden` or offscreen if script fails/interruption occurs.
- If inline SVG fails, HTML labels and sequence preserve relationships.
- If observer fails, regions remain visible and no loader appears.
- If form fails, fallback is already in flow and does not depend on animation.
- Controllers are idempotent and dispose listeners/observers across Elementor lifecycle events.
- `Save-Data`, coarse pointer or constrained hardware may receive the static path automatically.

## Accessibility & Feedback

- Focus visibility: immediate, stable, high contrast; never animated into view.
- Keyboard activation: Enter/Space according to native element; tabs only with full keyboard contract.
- Live region: form pending/result once; family selection announced only when needed.
- Color-independent state: number, label, shape/marker and ARIA.
- Motion-independent meaning: all relationships readable statically.
- Intermediate-frame contrast: AA preserved; test active/hover/focus and cross-fades.
- Error stability: error text/surfaces remain quiet; no shake, pulse or repeated animation.
- Vestibular safety: no large zoom/rotation, background tracking, flashes >3 Hz or full-screen motion.

## Performance Guardrails

| Signal | Budget | Stop condition |
|---|---|---|
| LCP p75 mobile | ≤2.5 s | hero waits on animation/video/font |
| INP p75 | ≤200 ms | selection cannot interrupt immediately |
| CLS | ≤0.1 | panel/status movement shifts layout |
| long tasks | 0 >50 ms attributable to motion in key flow | controller/animation blocks main thread |
| added motion library | 0 by default | dependency added without approved prototype |
| autoplay media | 0 | any autoplay video/audio/canvas loop |
| simultaneous ambient loops | 0 | any persistent decorative loop |

- Reserve panel/form result space or use natural document flow.
- Avoid layout reads inside animation frames; batch measurement before mutation if unavoidable.
- Pause/dispose observers outside need; no per-scroll handler.
- Responsive images and system fonts cannot be delayed by ornament.
- First fold is performance-tested before full page implementation.

## GVC / Micro Evidence

- Scenario: `public-servicios-hubspot-motion`.
- Route: stable preview and live canonical.
- Viewports: 1440×1100, 1024×900, 390×844.
- Steps: cold first fold; interrupt hero; keyboard atlas 01→03→06; rapid input; sector select/reset; threshold;
  delivery; FAQ; form pending/success/error; no-JS; reduced motion; Save-Data/static if testable.
- Captures/frame labels:
  - `01-first-fold-natural`
  - `02-first-fold-settled`
  - `03-first-fold-interrupted`
  - `04-atlas-family-01`
  - `05-atlas-family-03-transition`
  - `06-atlas-family-06-settled`
  - `07-sector-selected`
  - `08-fit-quiet`
  - `09-threshold-final`
  - `10-form-pending`
  - `11-form-success`
  - `12-form-error`
  - `13-reduced-desktop`
  - `14-reduced-mobile`
  - `15-no-js`
- Markers: wireframe markers plus `data-motion-state` limited to non-PII enum values.
- Assertions: content visible before/after; CTA actionable; no loops; interruption correctness; ARIA/focus sync;
  reduced equivalence; no overflow; performance budgets; zero forbidden effects/imports.
- Intermediate-frame evidence: contrast review during path/panel transition and form state swap.

## Design Decision Log

- Decision: motion expresses connection and state change; static editorial moments carry trust.
- Alternatives: background video, scroll-scrub story, particle graph, spring-based UI, persistent animated gradient.
- Why: the selected system needs causality and continuity, while SEO/AEO, CRO, accessibility and CWV require visible,
  stable, extractable content.
- Reuse/extend/new: extend public page scope; do not import portal motion runtime.
- Open risks: Elementor lifecycle duplication, SVG complexity, intermediate contrast, compact atlas density and form
  renderer behavior.
- Follow-up: prototype only first fold/atlas; promote exact implementation only after GVC evidence.

## Acceptance Checklist

- [ ] Natural/no-JS state is complete and visible.
- [ ] Motion maps to belonging, change, continuation or operation state.
- [ ] Hero and CTA never wait for animation.
- [ ] Atlas ends correctly after rapid/interrupted input.
- [ ] Six families remain readable without SVG/color/motion.
- [ ] Quiet zones remain quiet; error surfaces never shake/pulse.
- [ ] Exact tokens are reused; no raw component timing or `transition: all`.
- [ ] Reduced motion preserves meaning and is captured, not inferred.
- [ ] LCP/INP/CLS/long-task budgets pass on first fold and full page.
- [ ] No autoplay, loops, particles, parallax, custom cursor, scroll hijacking or new unapproved library.
- [ ] GVC/micro evidence includes intermediate frames, mobile, no-JS and reduced motion.
