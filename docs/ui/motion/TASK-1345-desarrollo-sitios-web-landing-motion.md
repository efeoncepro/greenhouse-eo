# TASK-1345 — Desarrollo de sitios web Motion Contract

## Meta

- Status: `live-in-progress`
- Owner task: `TASK-1345 — Landing publica: desarrollo de sitios web`
- Related wireframe: [docs/ui/wireframes/TASK-1345-desarrollo-sitios-web-landing.md](../wireframes/TASK-1345-desarrollo-sitios-web-landing.md)
- Related flow: [docs/ui/flows/TASK-1345-desarrollo-sitios-web-landing-flow.md](../flows/TASK-1345-desarrollo-sitios-web-landing-flow.md)
- Motion type: `hero micro-animation` + `microinteraction` + `scroll` (marketing lane, tier bajo)
- Primary primitive / library: Elementor HTML widget + page-scoped CSS in WordPress. Hero Factory uses GSAP from CDN inside `.ghf-slot` with static fallback; portal primitives (`useGreenhouseGSAP`, framer-motion, `@/components/greenhouse/motion`) are not part of this public WordPress runtime.
- Copy source: N/A

## Motion Brief

- Primary user: decisor que evalua una inversion web.
- Motion intent: guiar la lectura de una pagina larga, reforzar jerarquia y confirmar interacciones (CTA, cards, FAQ) sin convertir la pagina en demo decorativa.
- Uncertainty reduced: reveals suaves ayudan a entender progresion; feedback de cards/CTA confirma accionabilidad.
- User decision supported: avanzar hacia cotizacion sin perder foco.
- Non-goals: parallax pesado, scroll-jacking, hero video, counters falsos, animaciones que retrasen LCP. Small hero loop is allowed only inside `.ghf-slot`, reduced-motion aware, and non-semantic.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero Factory visual (`wdvis` / `.ghf-slot`) | Load + loop | Mini-site cards travel through factory belt; engine/spec pulse; delivery pulse and scale wall lights. Validation tags, diagonal sweep, scan pass and local animation background are removed for a calmer native-gradient read. | Elementor HTML widget + GSAP/CSS fallback | Si |
| Hero eyebrow/H1/subhead/CTAs | Load | Fade + rise 8-12px con stagger corto | CSS keyframes | Si |
| Header/nav anchors | Hover/focus | underline/opacity + focus ring | CSS transition | Si |
| Dos visitantes panels | Scroll into view | Reveal suave, sin ocultar contenido si falla | CSS / site utilities | Opcional |
| Method / IDD steps (`data-capture="method"`) | Scroll into view + hover | Cards de fase con profundidad sobria; hover lift compositor-only; callout estable | CSS page-scoped `task-1345-method-premium-v1` | Opcional |
| CTA strip (`data-capture="architecture-cta"`) | Scroll into view + hover/focus/press | CTA premium feedback: lift compositor-only, focus ring, press scale; no layout shift | CSS page-scoped `task-1345-levels-premium-v1` | Si |
| AI-ready ladder/cards (`data-capture="ai-ready"`) | Hover/focus + reduced-motion check | Border/elevation leve, rail estable, mobile gutter para switcher flotante; no layout shift | CSS page-scoped `task-1345-levels-premium-v1` | Si |
| Segment cards | Hover/focus/selected | Lift 1-2px, selected state si aplica | CSS | Si |
| FAQ | Toggle | Expand/collapse controlado | native details/CSS | Si |
| Form submit | Submit | Owned by form renderer | Renderer | Si, delegated |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA primario | base alto contraste | micro-lift + color/borde | ring >=2px | scale 0.98 | N/A | delegated | delegated |
| CTA secundario | outline/text | fondo tenue | ring visible | scale 0.98 | N/A | N/A | N/A |
| Segment card | card | lift + border | ring visible | none/scale 0.99 | selected job state if supported | N/A | N/A |
| FAQ item | collapsed | indicator highlight | ring on summary | — | open indicator | N/A | N/A |
| Form | ready | field affordance | native/renderer focus | — | — | spinner/status | renderer message |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero Factory entrance | natural visible/static | engine/delivered cards fade/rise into loop | ~400-600ms, GSAP `power*` easing inside widget | decorative assembly loop, no content hidden if JS fails | static final composition with cards/cells visible |
| Hero Factory conveyor | card assembled at motor | card travels to delivered site + delivery pulse | ~3.85s travel, repeated ~2.35s spawn | compositor transform/opacity; stops only when document hidden; validation tags hidden across viewports for legibility | no loop; static final composition |
| Hero enter | opacity 0, y+10 | opacity 1, y 0 | 400ms ease-out `cubic-bezier(0.2,0,0,1)` | once on load | visible immediately |
| Section reveal | opacity 0, y+8 | opacity 1, y 0 | 300ms ease-out | once on viewport | visible immediately |
| Card hover | base | hover | 150ms ease-out | transform y-1/2px + border | color/border only |
| CTA press | hover | pressed | 75ms | scale 0.98 | no scale |
| FAQ toggle | collapsed | open | 200ms ease-out | local height/content reveal | instant |
| Anchor scroll | current | target | browser smooth if allowed | smooth scroll | instant jump |

## Primitive & Token Mapping

- Primitive: CSS del sitio publico (transitions/keyframes/utilidades existentes).
- Imports allowed: CSS nativo, utilidades del tema publico, Elementor/Astro motion existente si cumple reduced-motion, GSAP CDN only inside `.ghf-slot` Hero Factory widget with static fallback.
- Imports forbidden: `@/components/greenhouse/motion`, `useGreenhouseGSAP`, direct GSAP del portal, framer-motion del portal.
- Timing tokens: 75 / 150 / 200 / 300 / 400 ms.
- Easing tokens: `cubic-bezier(0.2,0,0,1)` para entradas; ease-out simple para hover.
- Layout animation: ninguna; no FLIP/morph.
- CSS properties: preferir `opacity`, `transform`, `border-color`, `background-color`. Evitar animar layout.
- GSAP/Lottie justification: GSAP is used only for the Hero Factory visual requested from the local demo. It is not a portal primitive and does not control page layout/header; if GSAP fails, the widget renders a static final state.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)`.
- Replacement behavior: todos los elementos visibles sin reveal; anchor scroll instantaneo; hover sin lift/scale.
- Meaning preserved: si, motion no porta informacion.
- Animations removed: Hero Factory conveyor/gear loops, hero enter, section reveal, stagger, CTA lift/scale, smooth scroll. The former diagonal sweep light and scan pass are removed entirely, not only reduced.
- Animations retained: focus ring y cambios de estado no animados.

## Accessibility & Feedback

- Focus visibility: ring >=2px, offset visible, contraste >=3:1.
- Keyboard activation: CTAs, cards accionables y FAQ operables con teclado.
- Live region / status behavior: form renderer anuncia loading/success/error.
- Color-independent state: selected/open deben tener texto/icono/indicador, no solo color.
- Motion-independent meaning: ningun claim o dato depende de animacion.
- Error/destructive stability: N/A, sin acciones destructivas.

## Performance Guardrails

- Compositor-only properties para reveals/hover (`opacity`, `transform`).
- Sin JS de scroll que lea/escriba layout en cada frame.
- Sin video above-the-fold. The only allowed loop is the Hero Factory `.ghf-slot` decorative conveyor, compositor-only, bounded to the hero visual slot, with reduced-motion static fallback, no page-wide sweep/glare overlay and no local background plane/gradient inside the animation.
- No animar blobs/orbs/gradientes decorativos.
- No retrasar LCP; hero copy visible aunque la animacion falle.
- Mobile 390: reveals pueden omitirse; prioridad a legibilidad y no overflow.

## GVC / Micro Evidence

- Scenario: hero factory live/reduced-motion + hero enter + CTA focus + segment card selected/hover + FAQ open + form fallback.
- Scenario file: `scripts/frontend/scenarios/public-desarrollo-sitios-web.capture.txt`
- Route: preview/staging publico.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; focus CTA; scroll IDD/segments; abrir FAQ; reduced-motion capture.
- Required captures: `hero-factory-live`, `hero-factory-reduced`, `cta-focus`, `architecture-cta`, `ai-ready`, `segments-hover-or-selected`, `faq-open`, `reduced-motion`.
- Required `data-capture` markers: `hero`, `method`, `two-visitors`, `architecture-cta`, `ai-ready`, `segments`, `faq`, `conversion-form`.
- Assertions: focus ring visible; contenido visible bajo reduced motion; no jank perceptible; sin scroll horizontal.
- Reduced-motion evidence: `.captures/task-1345-hero-right-block-v14/desktop-reduced-static.png` confirms a static final Hero Factory state with the native hero gradient and no local animation background. Live desktop/mobile captures: `.captures/task-1345-hero-right-block-v14/desktop-entry.png`, `desktop-flow.png`, `desktop-settled.png`, `mobile390-flow.png`, and `probe.json`; mobile slot `310x347`, desktop slot `541x634`, `localBg=false`.
- CTA/AI-ready evidence: `.captures/task-1345-levels-premium-v1-final/desktop-architecture-cta-element.png`, `desktop-ai-ready-element.png`, `desktop-actionable-hover.png`, `mobile390-architecture-cta-element.png`, `mobile390-ai-ready-element.png`, and `probe.json`. Playwright verifies desktop/mobile 390 `overflow=0`, 5 cards, native Ohio header, no `with-spacer`, no `with-breadcrumbs`, and reduced-motion `transition:none` on the cards/CTA.

## Design Decision Log

- Decision: motion tier bajo porque la pagina vende claridad y confianza, no espectaculo.
- Decision: CSS nativo del sitio publico y widget HTML Elementor, sin wrappers del portal, para mantener runtime portable.
- Decision: adaptar el demo local `hero-factory-demo-v2.html` como visual hero-scoped; no copiar el documento completo ni controlar header/wrappers.
- Decision: GSAP aceptado solo dentro de `.ghf-slot` por ser parte del demo solicitado y tener fallback estatico si falla.
- Decision: se elimino la luz diagonal `ghf-sweep` porque leia como efecto externo y no como parte integrada del sistema.
- Decision: se retiro el fondo/degradado local de la animacion (`ghf-field`, `ghf-floor`, `ghf-glow`, `ghf-grain`) porque competia con el degradado global del hero; la version vigente `v14` deja las piezas directamente sobre el fondo nativo y convierte el bloque derecho en una linea de produccion legible, con motor humano+agente, rail `Spec / Build / QA`, nodos de proceso, estacion de armado y delivery card.
- Decision: las microinteracciones del bloque derecho deben ser funcionales: las senales y nodos se activan cuando las tarjetas atraviesan el proceso, el delivery pulse confirma salida lista y reduced-motion muestra el estado completo sin depender del loop.
- Decision: se ocultaron los tags `Humano/Agente` en todos los viewports porque competian visualmente con el delivery card en ciertos frames; el mensaje humano/agente ya vive en el motor y en la seccion siguiente.
- Decision: se elevo la seccion de metodo con CSS scoped `task-1345-method-premium-v1`; el hover de cards existe solo para reforzar affordance y se desactiva con reduced-motion.
- Decision: el CTA intermedio + niveles AI-ready se elevaron con CSS scoped `task-1345-levels-premium-v1`; el movimiento se limita a `translate`, `scale`, `border-color`, `box-shadow` y `background-color`, con `prefers-reduced-motion: reduce` eliminando lift/scale.
- Decision: en mobile se reserva gutter interno derecho en note/cards/footer de `levels-premium` para que el switcher flotante global Ohio no tape microcopy critico; se corrige dentro de la seccion, sin tocar widgets globales ni wrappers.
- Decision: el nivel `Be Intrinsic` se presenta como trayectoria/preferencia ganada, no como garantia inmediata, para mantener precision AEO.
- Alternatives considered: parallax/hero cinematic (descartado por performance/foco), sin motion absoluto (valido pero menos distintivo), portal motion primitives (no aplican al runtime WordPress/Kinsta).
- Reuse / extend / new primitive: reuse.
- Open risks: CDN GSAP puede fallar o bloquearse; widget tiene fallback estatico. Global fixed switcher Ohio puede superponerse visualmente en mobile en ciertos scroll positions, fuera del scope de este widget.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion`.
- [ ] Motion intent is tied to feedback, orientation or uncertainty reduction.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved public-site CSS/utilities, not portal wrappers.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/Playwright evidence proves the hero visual and reduced-motion state.
- [x] Design decision log explains why motion is needed and what was rejected.
