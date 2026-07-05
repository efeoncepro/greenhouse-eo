# TASK-1343 — Landing SEO `/servicios/posicionamiento-seo` Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1343 — Landing pública de servicio SEO`
- Related wireframe: [docs/ui/wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md](../wireframes/TASK-1343-servicios-posicionamiento-seo-landing.md)
- Related flow: [docs/ui/flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md](../flows/TASK-1343-servicios-posicionamiento-seo-landing-flow.md)
- Motion type: `microinteraction` + `scroll` (marketing lane, tier bajo)
- Primary primitive / library: `CSS` (transitions + `@keyframes` + `animation-timeline: view()` donde el sitio lo soporte). **NO** `useGreenhouseGSAP` ni framer — esos son wrappers del PORTAL Greenhouse, no del sitio público. Motion en el runtime del sitio (WordPress/Elementor o Astro).
- Copy source: N/A (motion no lleva copy)

> **Marca:** este es el **sitio público** (marketing lane de `modern-ui`), no el
> portal. Motion = acento sutil, nunca el gancho. Restraint: sin hero-video, sin
> parallax pesado, sin gradient-on-gradient. Tier más bajo que cumpla el trabajo.

## Motion Brief

- Primary user: decisor de marketing evaluando el servicio.
- Motion intent: dar jerarquía y foco (entrada del hero, reveal progresivo de secciones), reforzar affordance de los CTAs — sin distraer del contenido ni del mensaje.
- Uncertainty reduced: el reveal progresivo guía la lectura top→bottom; el feedback de hover/focus confirma que los CTAs son accionables.
- User decision supported: llegar al CTA del grader con el mensaje absorbido.
- Non-goals: nada de motion decorativo, loops infinitos, autoplay, mascota animada, ni animaciones que retrasen el primer paint (LCP).

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero (eyebrow+H1+subhead+CTAs) | Load (above the fold) | Fade + rise 8–12px, stagger corto | CSS `@keyframes` | Sí (acento) |
| Secciones (stakes, método, prueba, bridge, grader, FAQ) | Scroll into view | Fade + rise sutil, una vez | CSS `animation-timeline: view()` con fallback | Opcional |
| Cards de pilares (método) | Scroll into view | Stagger suave | CSS | Opcional |
| CTAs (primario/secundario) | Hover / focus / active | Cambio de fondo/borde + micro-lift; focus ring visible | CSS transition | Sí (feedback) |
| FAQ `<summary>` | Toggle | Expand/colapso del panel | CSS (`details` nativo / grid-rows transition) | Sí |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA primario | base | fondo/borde + lift 1–2px | focus ring ≥2px, ≥3:1 | scale 0.98 | N/A | (form renderer) | (form renderer) |
| CTA secundario | outline | borde/fondo tenue | focus ring | scale 0.98 | N/A | N/A | N/A |
| FAQ item | colapsado | subrayado/indicador | focus ring en `<summary>` | — | abierto (indicador) | N/A | N/A |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero enter | opacity 0, y+10 | opacity 1, y 0 | 400ms, ease-out (`cubic-bezier(0.2,0,0,1)`) | una vez, al cargar | sin transform, opacity 1 inmediata |
| Section reveal | opacity 0, y+8 | opacity 1, y 0 | 300ms, ease-out | una vez, al entrar en viewport | contenido visible sin reveal |
| CTA hover | base | hover | 150ms, ease-out | color + lift | color sin lift |
| CTA press | hover | pressed | 75ms | scale 0.98 | sin scale |
| FAQ toggle | colapsado | abierto | 200ms, ease-out | alto del panel | cambio instantáneo de estado |

## Primitive & Token Mapping

- Primitive: CSS del sitio público (transitions + keyframes + scroll-driven donde haya soporte).
- Imports allowed: CSS nativo; utilidades de motion del propio sitio (Elementor/Astro).
- Imports forbidden: `useGreenhouseGSAP`, `@/components/greenhouse/motion`, framer-motion — son del portal, NO del sitio público.
- Timing tokens: 75 / 150 / 200 / 300 / 400 ms (escala `modern-ui`: superficie chica rápida, grande lenta).
- Easing tokens: `ease-out` emphasized `cubic-bezier(0.2,0,0,1)` para entradas.
- Layout animation: ninguna (sin FLIP/layout morph).
- CSS properties: solo compositor-friendly (`opacity`, `transform`); nunca animar `top/left/height` salvo el panel FAQ (aceptable, local).
- GSAP/Lottie justification: N/A — no se usan.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)`.
- Replacement behavior: todo el contenido visible sin animación; los reveals no ocultan contenido (fail-open: si el JS/scroll-timeline no corre, el contenido igual se ve).
- Meaning preserved: sí — el motion es acento, no porta información.
- Animations removed: hero enter, section reveal, stagger, CTA lift, press scale.
- Animations retained: focus ring (esencial); cambio de color de estado (no depende de motion).

## Accessibility & Feedback

- Focus visibility: ring ≥2px, offset, ≥3:1 en ambos temas; nunca solo `box-shadow` (sobrevive `forced-colors`).
- Keyboard activation: CTAs y FAQ operables por teclado; motion no bloquea interacción.
- Live region / status behavior: los estados del form embebido usan su `role=status` (renderer), no la landing.
- Color-independent state: estados (hover/abierto) también con indicador no-color (subrayado/ícono).
- Motion-independent meaning: ninguna info depende solo de animación.
- Error/destructive stability: N/A (sin acciones destructivas).

## Performance Guardrails

- Compositor-only properties: `opacity`, `transform` para todos los reveals/hover.
- Layout reads/writes: evitados; sin JS que lea layout en scroll (preferir CSS scroll-driven).
- Animation scope: acotado a entrada/hover; sin loops.
- Chart/counter constraints: N/A (sin counters/charts). Si se agregara un count-up, respetar reduced-motion y no bloquear LCP.
- Mobile constraints: reveals más cortos/omitibles en 390px; nunca degradar CWV (INP<200ms, LCP<2.5s).

## GVC / Micro Evidence

- Scenario: hero enter + section reveal + hover CTA + FAQ toggle.
- Scenario file: `scripts/frontend/scenarios/public-servicios-posicionamiento-seo.capture.txt` (crear).
- Route: URL pública del preview.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar (capturar hero pre/post entrada); scroll (capturar reveals); hover/focus CTA; toggle FAQ.
- Required captures: hero entrada, sección revelada, CTA en focus, FAQ abierto.
- Required frame labels: `hero-enter`, `section-reveal`, `cta-focus`, `faq-open`.
- Required `data-capture` markers: `hero`, `metodo`, `grader`, `faq`.
- Assertions: focus ring visible; sin jank perceptible; contenido visible bajo reduced-motion.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` (reveals off, contenido intacto).

## Design Decision Log

- Decision: motion de acento tier bajo (CSS), sutil, respetando restraint del marketing lane `modern-ui`.
- Alternatives considered: (a) motion rico tipo portal (GSAP) — descartado (es sitio público, otro runtime + restraint); (b) sin motion — válido, pero un acento sutil mejora jerarquía sin costo de a11y/perf.
- Why this pattern: `modern-ui` — la diferenciación 2026 es craft dentro de la restricción; motion como acento, nunca el gancho.
- Reuse / extend / new primitive: reuse (CSS + convenciones del sitio); sin primitive nueva.
- Open risks: soporte de `animation-timeline: view()` según navegadores objetivo → fallback CSS/IntersectionObserver o simplemente contenido visible.
- Follow-up: alinear con la guía pillar en Think y el sibling `/servicios/aeo` para consistencia de motion.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved wrappers (aquí: CSS del sitio público; wrappers del portal explícitamente prohibidos).
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
