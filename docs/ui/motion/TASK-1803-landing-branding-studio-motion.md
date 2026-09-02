# TASK-1803 — Landing Branding Studio — Motion Contract

## Meta

- Status: `draft; choreography contracted, runtime tokens/binding pending discovery`
- Owner task: `TASK-1803 — Landing Branding Studio: la marca como sistema de decisión`
- Related wireframe: `docs/ui/wireframes/TASK-1803-landing-branding-studio.md`
- Related flow: `docs/ui/flows/TASK-1803-landing-branding-studio-flow.md`
- Motion type: `orchestrated + scroll-localized + microinteraction`
- Primary primitive / library: public-site scoped CSS/IntersectionObserver first; existing governed GSAP wrapper/tier only if runtime audit proves it is already available and justified.
- Copy source: Efeonce institutional; motion never authors or mutates claims.

## Motion Brief

- Primary user: buyer de marca que necesita comprender relaciones y elegir una intervención, no ver un showreel.
- Motion intent: mostrar cómo fragmentos se convierten en relaciones, decisiones, reglas y activaciones.
- Uncertainty reduced: diferencia entre estrategia/identidad/governance y entre Branding/Agencia/Producción.
- User decision supported: `Define · Activa · Escala` y selección del siguiente paso.
- Non-goals: ambientación permanente, scroll hijacking, parallax ornamental, partículas, cursor custom, logo animation, video autoplay obligatorio, números que cuentan sin evidencia.

## Motion Language

La motion de Branding Studio **ordena y conecta**. Nunca “multiplica outputs” —esa firma pertenece a Producción— ni
dramatiza una idea de campaña —esa firma pertenece a Agencia. Cada coreografía debe responder una pregunta:

1. ¿Qué estaba fragmentado?
2. ¿Qué relación se hizo visible?
3. ¿Qué decisión cambió?
4. ¿Qué regla o activación se habilitó?

Si una animación no responde ninguna, se elimina.

## Motion Inventory

| ID / element | Trigger | Motion / feedback | Meaning | Required? |
|---|---|---|---|---|
| M0 Hero system | first paint/enhancement | fragmentos toman relación y se estabilizan | empresa cambiada → sistema comprensible | yes, static fallback complete |
| M1 Hero copy | initial | eyebrow/H1/subhead/CTA reveal corto por jerarquía | reading order | optional; never blocks |
| M2 Symptom selection | click/tap/key | indicator + panel crossfade/short translate | orientación local | yes feedback |
| M3 Three-system field | localized scroll/selection | foco pasa decisión→expresión→operación; relaciones se dibujan una vez | causalidad del sistema | signature |
| M4 Maturity progression | enter/select | estados se revelan en orden; selección no reordena | progreso, no score | optional |
| M5 Buying moment | hover/focus/select | relación trigger→intervention se resalta | fit | yes feedback, subtle |
| M6 Offer ladder | enter | secuencia corta de continuidad; no todos los cards fly-in | escalera de producto | optional |
| M7 Artifact specimen | open/select | anotación aparece desde su ancla; contenido crossfade | artefacto habilita decisión | yes if interactive |
| M8 Creative Services navigator | select/hover/focus | línea recorre Define→Activa→Escala y se detiene | continuidad entre servicios | signature once |
| M9 Case chapters | scroll or explicit next | before→decision→system→activation crossfade; progress persistent | historia/proof | yes if case module exists |
| M10 Semantic identity | enter/select | una verdad visible conecta name/category/claims/proof/URLs | legibilidad humana/máquina | optional |
| M11 Governance trace | enter/select | request→owner→decision→exception/expiry→review | gobierno acelera decisiones | signature once |
| M12 Route selection | click/tap/key | selected treatment + destination summary | decision feedback | required |
| M13 FAQ | toggle | native disclosure or tokenized height/fade | reveal answer | required feedback |
| M14 CTA | hover/focus/press | feedback táctil mínimo | affordance | required |
| M15 Form/scheduler | host states | host canonical pending/error/success | trust and recovery | required; not overridden |

## Hero Choreography — M0/M1

1. Natural HTML paints visible: copy, CTA and semantic labels exist at rest.
2. Enhancement may place visual fragments in a slightly dispersed state using transform/opacity only.
3. A relation line appears after the H1 is readable, not before.
4. Fragments settle into a stable map; there is no infinite float, orbit or pulse.
5. CTA is available throughout; it never waits for the end of the timeline.
6. On interruption/resize/navigation, clear inline styles and resolve directly to the final map.
7. On mobile, use a smaller static/one-pass composition; no dispersed elements near viewport edges.

## Three-system Choreography — M3

- Desktop may test one localized sticky stage: narrative labels advance while the relational field remains anchored.
- It is accepted only if normal wheel/touchpad control remains intact, content clears the Ohio header, resize recalculates safely and the total scroll distance is proportional.
- Each state preserves previous relations as quiet context but never drops text below contrast requirements.
- User can select a layer directly; programmatic scroll synchronization is suspended during explicit selection to avoid flicker.
- Rapid input cancels/overwrites the previous transition and lands on the latest selected semantic state.
- Mobile and reduced motion use three vertical chapters; no sticky/pinning.

## Creative Services Choreography — M8/M12

- `Define` is current and marked textually, not only by position/color.
- On first entry, a single connector may travel `Define → Activa → Escala` to explain continuity, then stop.
- Hover/focus never launches the full timeline; it highlights only the destination and summary.
- Selection to sibling page uses normal link navigation. No shared-element morph implies that the three are the same service.
- Returning with Back restores focus/scroll without replaying an entrance that obscures context.

## Case Choreography — M9

- Prefer explicit chapters or localized scroll progression; no autoplay carousel.
- Chapter labels remain visible and accessible. Images/assets reserve dimensions before load.
- Metrics appear as text immediately; no count-up unless the value is verified, stable and animation adds comprehension.
- If only one case is authorized, render one deep narrative rather than cloning cards to fill a grid.
- Missing media degrades to text/artifact evidence without blank panels.

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Primary CTA | stable | small lift/contrast | visible ring, no travel | tactile scale | n/a | host spinner/label | host state |
| Secondary anchor | underline/arrow | underline progress | ring/underline | no large scale | target section focus context | n/a | n/a |
| Symptom option | readable | border/background cue | strong focus | immediate ack | text + shape + aria selected | n/a | stable |
| Maturity level | full label | subtle emphasis | focus visible | immediate | persistent detail | n/a | n/a |
| Artifact | summary visible | affordance cue | focus visible | immediate | expanded/annotated | media skeleton if real | inline recovery |
| Service route | destination visible | path emphasis | focus visible | immediate | `Estás aquí`/summary | n/a | broken link blocks cutover |
| FAQ | question visible | subtle cue | focus visible | immediate | expanded state | n/a | n/a |
| Form submit | enabled by validity | no theatrical lift | host focus | ack | n/a | disabled duplicate + status | receipt/alert |

## Transition Specs

Exact values are resolved against the public runtime and centralized as page-scoped semantic tokens. No handler may
contain an ungoverned duration/ease.

| Transition | From | To | Token tier | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| feedback | idle | hover/press/select | `feedback` | immediate/subordinate | snap or near-instant |
| local state | option A | option B | `transition` | short crossfade + small transform | immediate content swap |
| section reveal | natural visible | emphasized final | `reveal` | enhancement-only, one pass | no animation |
| relational narrative | system state A | state B | `narrative` | localized timeline, interruptible | vertical static chapters |
| route | page A | sibling page | native navigation/VT only if governed | no misleading morph | immediate/crossfade |
| host open | closed | form/scheduler | host token | focus-safe dialog/inline | immediate open |

## Primitive & Token Mapping

- Primitive: CSS transitions for hover/focus/pressed; IntersectionObserver for one-pass reveals; scoped timeline for M0/M3/M8/M11 only when required.
- Imports allowed: runtime wrappers already present in the governed public-site plugin after Discovery.
- Imports forbidden: direct new GSAP/Lottie/animation library imports in an Elementor view; parallel engine; CDN script injected from page settings.
- Timing tokens: `feedback`, `transition`, `reveal`, `narrative`; exact mapping audited/frozen once.
- Easing tokens: emphasized deceleration for enter/state; accelerated exit where needed; linear only for genuine progress.
- Layout animation: no width/height/top/left/margin/padding animation; FAQ may use native disclosure or grid-row technique.
- CSS properties: transform, opacity, carefully bounded clip-path/filter; clear `will-change` after use.
- GSAP justification: only if M3 localized narrative or SVG relation drawing cannot be implemented robustly with existing CSS/runtime; must be page-scoped, cleaned up and already available without unjustified bundle growth.

## Reduced Motion Contract

- Detection: `prefers-reduced-motion: reduce` in CSS and the runtime's scoped JS media-query mechanism.
- Replacement behavior: all relationships shown in final state; narratives become vertical/static chapters; selections update immediately.
- Meaning preserved: labels, sequence numbers, arrows/lines, current route, before/after and host status remain visible.
- Animations removed: parallax, pinning, travel, stagger, smooth scroll, autoplay, repeated line drawing, decorative reveal.
- Animations retained: focus ring, native progress/status and minimal state feedback that prevents uncertainty.
- Runtime toggle: resizing or changing media preference reverts timelines/listeners without duplicated observers or stale inline styles.

## Accessibility & Feedback

- Focus visibility: never delayed or animated from invisible; contrast remains AA on every surface/intermediate frame.
- Keyboard activation: same state/result as pointer; no global arrow handlers.
- Live region / status behavior: only selection summary and real async host states; scroll reveals are not announced.
- Color-independent state: text label, structure and aria state accompany every selected/current status.
- Motion-independent meaning: diagrams have DOM list/table equivalents; line drawing is supplementary.
- Intermediate-frame contrast: AA preserved by animating containers/lines, not text opacity below threshold.
- Error/destructive stability: errors do not shake, bounce, glow or disappear automatically.

## Performance Guardrails

- Compositor-only properties: transform/opacity; SVG stroke only with bounded path complexity.
- Layout reads/writes: measure outside critical frame; batch; no read/write loops on scroll.
- Animation scope: page root; observers/timelines killed on unmount/editor mode/navigation/resize mode change.
- Chart/counter constraints: no charts by default; no decorative counters; verified values remain readable before JS.
- Mobile constraints: no pinning/parallax; smaller node count; no autoplay video; touch scroll always owns vertical gesture.
- First paint: hero content and CTA are never `opacity:0` in CSS; enhancement uses fromTo and clears properties.
- Core Web Vitals: LCP media dimensioned/preloaded proportionally; motion cannot create CLS or material INP/long-task regression.

## GVC / Micro Evidence

- Scenario: `TASK-1803-public-branding-motion`.
- Scenario file: confirm at implementation.
- Route: work copy `noindex`, then approved canonical.
- Viewports: 1440, 1280, 390; reduced motion at 1440 and 390.
- Required steps: initial paint; M0 end; R2 rapid selections; M3 states 1/2/3 + direct selection; R8 route focus; case chapters; R11; FAQ; CTA/host states; resize desktop→mobile→desktop; JS-off.
- Required captures: before/after stills plus short trace/video for M3; static frames remain mandatory.
- Required frame labels: `hero-natural`, `hero-settled`, `system-decision`, `system-expression`, `system-operation`, `routing-focus`, `governance-final`, `reduced-static`.
- Required `data-capture` markers: `hero`, `symptoms`, `brand-system`, `ecosystem`, `governance`, `routing`, `conversion`.
- Assertions: content never orphaned hidden; latest input wins; focus/aria/text synchronized; timelines/listeners cleaned; no overflow; console clean.
- Intermediate-frame axe/contrast evidence: hero/system/route focus on dark/light transitions.
- Reduced-motion evidence: all final meaning visible; no pinning/travel/stagger/autoplay; host status intact.

## Stop Conditions

- Essential text waits for JS or starts hidden in CSS.
- Motion makes the landing feel like Producción Creativa rather than Branding Studio.
- Viewport or wheel is hijacked; sticky stage cannot be exited naturally.
- Mobile inherits desktop pinning/horizontal travel.
- Rapid selection leaves visual, text and aria state out of sync.
- Reduced motion removes relationships or content.
- New animation dependency materially increases bundle/performance for a decorative effect.
- Text contrast fails in an intermediate frame.
- Form/scheduler success is animated before a server-confirmed receipt.
- Motion compensates for weak copy, missing proof or a repetitive card layout.

## Design Decision Log

- Decision: motion language `order and connect`, with M3 as the only candidate for localized scroll orchestration.
- Alternatives considered: cinematic hero video; continuous parallax; kinetic-type-first; no motion.
- Why this pattern: makes the operating-system thesis perceivable while keeping content, proof and navigation primary.
- Reuse / extend / new primitive: reuse public CSS/host behavior; extend a scoped relation timeline only if runtime audit justifies it; no new global primitive from a single landing.
- Open risks: public runtime motion tokens differ from Greenhouse portal overlay; existing plugin/library inventory must be measured before mapping exact values.
- Follow-up: after first-fold approval, freeze tokens and selectors in this document and the landing-specific runtime reference.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion`.
- [ ] Every motion has an orientation, feedback, uncertainty or error-prevention job.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved public runtime wrappers; no direct parallel engine.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves meaningful interactions and intermediate contrast.
- [ ] Design decision log explains why motion is needed and what was rejected.
