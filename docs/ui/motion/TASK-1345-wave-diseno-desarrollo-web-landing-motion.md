# TASK-1345 — Wave diseno y desarrollo web Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1345 — Landing publica Wave: diseno y desarrollo web`
- Related wireframe: [docs/ui/wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md](../wireframes/TASK-1345-wave-diseno-desarrollo-web-landing.md)
- Related flow: [docs/ui/flows/TASK-1345-wave-diseno-desarrollo-web-landing-flow.md](../flows/TASK-1345-wave-diseno-desarrollo-web-landing-flow.md)
- Motion type: `microinteraction` + `scroll` (marketing lane, tier bajo)
- Primary primitive / library: `CSS` del sitio publico. NO `useGreenhouseGSAP`, framer-motion ni primitives del portal.
- Copy source: N/A

## Motion Brief

- Primary user: decisor que evalua una inversion web.
- Motion intent: guiar la lectura de una pagina larga, reforzar jerarquia y confirmar interacciones (CTA, cards, FAQ) sin convertir la pagina en demo decorativa.
- Uncertainty reduced: reveals suaves ayudan a entender progresion; feedback de cards/CTA confirma accionabilidad.
- User decision supported: avanzar hacia cotizacion sin perder foco.
- Non-goals: loops, parallax pesado, scroll-jacking, hero video, counters falsos, animaciones que retrasen LCP.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero eyebrow/H1/subhead/CTAs | Load | Fade + rise 8-12px con stagger corto | CSS keyframes | Si |
| Header/nav anchors | Hover/focus | underline/opacity + focus ring | CSS transition | Si |
| Dos visitantes panels | Scroll into view | Reveal suave, sin ocultar contenido si falla | CSS / site utilities | Opcional |
| IDD steps | Scroll into view | Stagger sutil | CSS | Opcional |
| CTA strip | Scroll into view | Fade simple, CTA feedback | CSS | Si |
| AI-ready ladder/cards | Hover/focus | Border/elevation leve; no layout shift | CSS | Si |
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
| Hero enter | opacity 0, y+10 | opacity 1, y 0 | 400ms ease-out `cubic-bezier(0.2,0,0,1)` | once on load | visible immediately |
| Section reveal | opacity 0, y+8 | opacity 1, y 0 | 300ms ease-out | once on viewport | visible immediately |
| Card hover | base | hover | 150ms ease-out | transform y-1/2px + border | color/border only |
| CTA press | hover | pressed | 75ms | scale 0.98 | no scale |
| FAQ toggle | collapsed | open | 200ms ease-out | local height/content reveal | instant |
| Anchor scroll | current | target | browser smooth if allowed | smooth scroll | instant jump |

## Primitive & Token Mapping

- Primitive: CSS del sitio publico (transitions/keyframes/utilidades existentes).
- Imports allowed: CSS nativo, utilidades del tema publico, Elementor/Astro motion existente si cumple reduced-motion.
- Imports forbidden: `@/components/greenhouse/motion`, `useGreenhouseGSAP`, direct GSAP del portal, framer-motion del portal.
- Timing tokens: 75 / 150 / 200 / 300 / 400 ms.
- Easing tokens: `cubic-bezier(0.2,0,0,1)` para entradas; ease-out simple para hover.
- Layout animation: ninguna; no FLIP/morph.
- CSS properties: preferir `opacity`, `transform`, `border-color`, `background-color`. Evitar animar layout.
- GSAP/Lottie justification: N/A.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)`.
- Replacement behavior: todos los elementos visibles sin reveal; anchor scroll instantaneo; hover sin lift/scale.
- Meaning preserved: si, motion no porta informacion.
- Animations removed: hero enter, section reveal, stagger, CTA lift/scale, smooth scroll.
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
- Sin loops infinitos ni video above-the-fold.
- No animar blobs/orbs/gradientes decorativos.
- No retrasar LCP; hero copy visible aunque la animacion falle.
- Mobile 390: reveals pueden omitirse; prioridad a legibilidad y no overflow.

## GVC / Micro Evidence

- Scenario: hero enter + CTA focus + segment card selected/hover + FAQ open + form fallback.
- Scenario file: `scripts/frontend/scenarios/public-wave-diseno-desarrollo-web.capture.txt`
- Route: preview/staging publico.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; focus CTA; scroll IDD/segments; abrir FAQ; reduced-motion capture.
- Required captures: `hero-enter`, `cta-focus`, `segments-hover-or-selected`, `faq-open`, `reduced-motion`.
- Required `data-capture` markers: `hero`, `idd`, `segments`, `faq`, `conversion-form`.
- Assertions: focus ring visible; contenido visible bajo reduced motion; no jank perceptible; sin scroll horizontal.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: motion tier bajo porque la pagina vende claridad y confianza, no espectaculo.
- Decision: CSS nativo del sitio publico, sin wrappers del portal, para mantener runtime simple y portable.
- Decision: no usar el motion del HTML v11 como contrato literal; adaptar timing/feedback a la experiencia final.
- Alternatives considered: parallax/hero cinematic (descartado por performance/foco), sin motion absoluto (valido pero menos claro en pagina larga), GSAP (innecesario).
- Reuse / extend / new primitive: reuse.
- Open risks: soporte de scroll-driven CSS segun runtime; usar fallback visible.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion`.
- [ ] Motion intent is tied to feedback, orientation or uncertainty reduction.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved public-site CSS/utilities, not portal wrappers.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves meaningful interactions.
- [ ] Design decision log explains why motion is needed and what was rejected.
