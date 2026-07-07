# TASK-1351 — Landing "Redes Sociales" — Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1351 — Landing pública de servicio Redes Sociales (/servicios/redes-sociales)`
- Related wireframe: [docs/ui/wireframes/TASK-1351-landing-redes-sociales.md](../wireframes/TASK-1351-landing-redes-sociales.md)
- Related flow: [docs/ui/flows/TASK-1351-landing-redes-sociales-flow.md](../flows/TASK-1351-landing-redes-sociales-flow.md)
- Motion type: `microinteraction` + `scroll` (reveals por intersección) + una pieza `orchestrated` acotada (el muro social vivo).
- Primary primitive / library: `CSS` (sitio público — animaciones/transiciones CSS + IntersectionObserver). NO wrappers de motion del portal (`src/components/greenhouse/motion/**` es del portal, no del sitio público).
- Copy source: N/A (motion no lleva copy).

## Motion Brief

- Primary user: decisor de marketing evaluando craft social.
- Motion intent: **el medio es el mensaje** — el muro social vivo *demuestra* que Efeonce produce contenido social moderno (reels, formatos, ritmo), en vez de describirlo. Los reveals dan ritmo editorial sin distraer.
- Uncertainty reduced: "¿estos realmente saben de social moderno?" → el muro en movimiento lo prueba a primera vista.
- User decision supported: sube la confianza antes del CTA (reunión/auditoría).
- Non-goals: hero-video autoplay pesado, parallax fuerte, loops infinitos que compitan con el contenido, mascota animada, "AI slop" en los assets.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero | Load | Fade + rise 400ms ease-out, stagger corto (H1 → sub → CTAs) | CSS | Sí |
| Badge flotante hero | Load | Fade-in + micro-float sutil | CSS | Opcional |
| Trust logo strip | Scroll reveal | Fade-in al intersectar | CSS + IO | Sí |
| Cards "Qué incluye" (5) | Scroll reveal | Fade+rise con stagger corto al intersectar | CSS + IO | Sí |
| **Muro social vivo** | Scroll reveal + en viewport | Mosaico de piezas que entran escalonadas; movimiento acotado (drift/marquee lento o autoplay silencioso de reels cortos) mientras está en viewport | CSS + IO (islands ligeras solo si necesario) | Sí (pieza firma) |
| Proof ledger | Scroll reveal | Fade-in de filas | CSS + IO | Sí |
| CTA buttons | Hover/focus | Color + micro-lift + focus ring | CSS | Sí |
| FAQ `<summary>` | Click | Expand/collapse nativo | CSS/native | Sí |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA primario ("Agenda una reunión") | Fondo marca | Micro-lift + oscurece | Focus ring AA | Escala 0.98 | — | N/A (link externo) | N/A |
| CTA secundario ("Pide una auditoría") | Ghost/outline | Fondo suave | Focus ring AA | Escala 0.98 | — | N/A (scroll ancla) | N/A |
| Card capability | Reposo | Elevación sutil | Focus ring si es link | — | — | — | — |
| Muro (pieza reel) | En reposo/entrando | Pausa el drift si hover (respeto) | — | — | — | — | — |
| FAQ item | Colapsado | Subraya `<summary>` | Focus ring | — | Expandido | — | — |
| Form submit | — | — | Focus ring | — | — | Spinner (renderer) | Success/Error Card (renderer) |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero entrance | opacity 0, y+16 | opacity 1, y 0 | 400ms `cubic-bezier(0.2,0,0,1)` | Fade+rise, stagger 60–80ms | Contenido visible sin animación |
| Reveal por sección | opacity 0, y+24 | opacity 1, y 0 | 300ms ease-out, threshold ~0.2 | IntersectionObserver, una vez | Todo visible al cargar |
| Muro social — entrada | opacity 0 | opacity 1 (stagger piezas) | 200–300ms, stagger 40–60ms | Piezas entran escalonadas al intersectar | Piezas visibles estáticas (frames) |
| Muro social — vida | posición A | posición B (drift lento) o reels autoplay silencioso | loop lento (≥8s) o video muted loop | Movimiento acotado solo en viewport; pausa fuera de viewport | **Sin movimiento** — muestra frames estáticos |
| CTA hover | reposo | lift 1–2px | 150ms ease-out | Micro-lift + color | Sin lift (solo color/focus) |
| Scroll ancla a `#auditoria` | posición actual | form | smooth scroll | Suave | Salto instantáneo |

## Primitive & Token Mapping

- Primitive: CSS puro + IntersectionObserver (sitio público). Islands ligeras solo si el muro requiere autoplay controlado de video (evaluar en build; preferir CSS/`<video muted loop playsinline>` sobre JS).
- Imports allowed: CSS page-scoped del landing (`gh-redes-*`), `<video>` nativo, IntersectionObserver.
- Imports forbidden: `@/components/greenhouse/motion/**`, `useGreenhouseGSAP`, Framer Motion, wrappers del portal (son del runtime Greenhouse, no del sitio público). NO GSAP salvo justificación explícita.
- Timing tokens: escala 75/150/200/300/400ms (consistente con TASK-1343).
- Easing tokens: ease-out `cubic-bezier(0.2,0,0,1)`.
- Layout animation: ninguna (sin morph). El muro anima `transform`/`opacity`, no layout.
- CSS properties: solo compositor-friendly (`transform`, `opacity`). Evitar animar `width`/`height`/`top`/`left`.
- GSAP/Lottie justification: N/A — no se usan. Si en build se justifica orquestación del muro, documentar y preferir CSS/WAAPI antes que GSAP.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)` + guard JS (no iniciar IO/animación del muro si reduce).
- Replacement behavior: todo el contenido visible sin animación; el muro social muestra frames estáticos (grid de piezas), sin drift ni autoplay.
- Meaning preserved: sí — el muro sigue mostrando el contenido/craft; solo se retira el movimiento.
- Animations removed: hero rise, reveals, drift/autoplay del muro, hover lift, smooth scroll.
- Animations retained: cambios de color/focus ring (no dependen de movimiento).

## Accessibility & Feedback

- Focus visibility: focus ring visible AA en todos los CTAs, `<summary>` y campos.
- Keyboard activation: CTAs y FAQ operables por teclado; el muro no requiere interacción de teclado (decorativo).
- Live region / status behavior: Success/Error Card del form con `role="status"`/`role="alert"` (owned por el renderer).
- Color-independent state: estados no dependen solo de color (texto+ícono en el form; focus ring).
- Motion-independent meaning: ningún significado depende del movimiento; el muro comunica igual estático.
- Error/destructive stability: N/A (sin acciones destructivas en la superficie).

## Performance Guardrails

- Compositor-only properties: `transform` + `opacity` únicamente.
- Layout reads/writes: evitar thrash; IO en vez de listeners de scroll; animar fuera del main thread.
- Animation scope: el muro anima solo mientras está en viewport (pausar con IO al salir); reveals corren una sola vez.
- Chart/counter constraints: no hay counters/charts animados en esta superficie.
- Mobile constraints: en 390px, reducir densidad del muro y peso de video (o degradar a mosaico estático de imágenes); respetar CWV (LCP<2.5s, INP<200ms); `<video>` con `preload=metadata`, `playsinline`, sin audio.

## GVC / Micro Evidence

- Scenario: `public-servicios-redes-sociales`
- Scenario file: `scripts/frontend/scenarios/public-servicios-redes-sociales.capture.txt` `[verificar/crear]`
- Route: URL pública del preview.
- Viewports: 1440 + 390.
- Required steps: cargar; scroll hasta el muro; hold para capturar movimiento; abrir FAQ; capturar reduced-motion.
- Required captures: hero entrada; muro social en 2+ frames (probar movimiento); reveals; CTA hover/focus; reduced-motion estático.
- Required frame labels: `hero-in`, `muro-t0`, `muro-t1`, `faq-open`, `reduced-motion`.
- Required `data-capture` markers: `hero`, `muro-social`, `faq`, `cta-final`, `auditoria`.
- Assertions: el muro se mueve en default (frames `muro-t0` ≠ `muro-t1`); estático bajo reduced-motion; focus ring visible; sin scroll horizontal.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` — muro estático, sin loops.

## Design Decision Log

- Decision: motion tier bajo/acento con **una** pieza firma (muro social vivo) que hace show-don't-tell; el resto son reveals sutiles y microinteracciones de CTA. CSS + IO, sin librerías pesadas. Ver PDR-005.
- Alternatives considered: hero-video autoplay full-bleed (peso/CWV + distrae), motion pesado con GSAP/parallax (contradice restraint + performance-as-craft), sin motion (desperdicia el argumento medium-is-message de un servicio social) — descartados.
- Why this pattern: la doctrina social 2026 premia autenticidad y el ritmo real del contenido; una pieza firma en movimiento prueba craft sin sacrificar CWV ni accesibilidad; el resto queda en restraint editorial.
- Reuse / extend / new primitive: reuse de patrones CSS del sitio público (precedente TASK-1343 marquee/reveal); el muro es page-scoped nuevo, no primitive del portal.
- Open risks: peso del muro en mobile (mitigado con degradación a mosaico estático); riesgo "AI slop" en los assets (mitigado con art direction primero); asegurar pausa fuera de viewport.
- Follow-up: definir en build si el muro usa `<video muted loop>` o mosaico CSS de imágenes según el peso real y CWV medido.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention (el muro reduce la incertidumbre "¿saben de social?").
- [ ] Reduced-motion behavior preserves the same meaning (muro estático muestra el mismo contenido).
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved public-site CSS/IO, NOT portal motion wrappers.
- [ ] Performance guardrails avoid layout thrash and excessive animation (compositor-only; pausa fuera de viewport; CWV).
- [ ] GVC/micro evidence proves the meaningful interaction (muro en movimiento en 2 frames), not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
