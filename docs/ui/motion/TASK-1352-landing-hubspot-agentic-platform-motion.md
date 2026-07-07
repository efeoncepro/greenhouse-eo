# TASK-1352 — Landing "HubSpot" — Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1352 — Reposicionar la landing HubSpot (/servicios-contratar-hubspot/) al mundo Agentic Customer Platform`
- Related wireframe: [docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md](../wireframes/TASK-1352-landing-hubspot-agentic-platform.md)
- Related flow: [docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md](../flows/TASK-1352-landing-hubspot-agentic-platform-flow.md)
- Motion type: `microinteraction` + `scroll` (reveals por intersección) + una pieza `orchestrated` acotada (el "stack agéntico").
- Primary primitive / library: `CSS` (sitio público — animaciones/transiciones CSS + IntersectionObserver). NO wrappers de motion del portal (`src/components/greenhouse/motion/**` es del portal, no del sitio público).
- Copy source: N/A (motion no lleva copy).

## Motion Brief

- Primary user: líder comercial / RevOps evaluando partner de HubSpot.
- Motion intent: **el medio es el mensaje** — el "stack agéntico" *demuestra* el deployment programático y la operación gobernada (Smart CRM → agentes → operación continua) en vez de describirlo, encarnando el diferenciador Kortex. Los reveals dan ritmo editorial sin distraer.
- Uncertainty reduced: "¿estos realmente saben operar HubSpot en la era agéntica, o solo lo configuran?" → el "stack agéntico" en movimiento lo prueba a primera vista.
- User decision supported: sube la confianza antes del CTA (reunión/diagnóstico); reduce el miedo a elegir mal (JOLT).
- Non-goals: hero-video autoplay pesado, parallax fuerte, loops infinitos que compitan con el contenido, mascota animada, "AI slop" en los assets.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero | Load | Fade + rise 400ms ease-out, stagger corto (H1 → sub → CTAs → proof row) | CSS | Sí |
| Badge flotante hero (Solutions Partner / Marketplace) | Load | Fade-in + micro-float sutil | CSS | Opcional |
| Trust logo strip | Scroll reveal | Fade-in al intersectar | CSS + IO | Sí |
| Cards "4 capas" (4) | Scroll reveal | Fade+rise con stagger corto al intersectar | CSS + IO | Sí |
| **Stack agéntico** | Scroll reveal + en viewport | Diagrama que se traza escalonado; flujo acotado (pulsos/dashes lentos por las conexiones Smart CRM → agentes → ops) mientras está en viewport | CSS + IO (SVG animado o island ligera solo si necesario) | Sí (pieza firma) |
| Tabla de diferenciación | Scroll reveal | Fade-in de filas | CSS + IO | Sí |
| Proof ledger + badge Marketplace | Scroll reveal | Fade-in de filas / badge | CSS + IO | Sí |
| CTA buttons | Hover/focus | Color + micro-lift + focus ring | CSS | Sí |
| FAQ `<summary>` | Click | Expand/collapse nativo | CSS/native | Sí |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| CTA primario ("Agenda una reunión") | Fondo marca | Micro-lift + oscurece | Focus ring AA | Escala 0.98 | — | N/A (link externo) | N/A |
| CTA secundario ("Solicita un diagnóstico") | Ghost/outline | Fondo suave | Focus ring AA | Escala 0.98 | — | N/A (scroll ancla) | N/A |
| Card capa | Reposo | Elevación sutil | Focus ring si es link | — | — | — | — |
| Stack agéntico (nodo/conexión) | En reposo/trazándose | Pausa el flujo si hover (respeto) | — | — | — | — | — |
| Link Marketplace | Reposo | Subraya + ícono externo | Focus ring | — | — | — | — |
| FAQ item | Colapsado | Subraya `<summary>` | Focus ring | — | Expandido | — | — |
| Form submit | — | — | Focus ring | — | — | Spinner (renderer) | Success/Error Card (renderer) |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero entrance | opacity 0, y+16 | opacity 1, y 0 | 400ms `cubic-bezier(0.2,0,0,1)` | Fade+rise, stagger 60–80ms | Contenido visible sin animación |
| Reveal por sección | opacity 0, y+24 | opacity 1, y 0 | 300ms ease-out, threshold ~0.2 | IntersectionObserver, una vez | Todo visible al cargar |
| Stack agéntico — entrada | opacity 0 / paths sin trazar | opacity 1 / paths trazados (stagger) | 200–300ms, stagger 40–60ms | Nodos y conexiones se trazan escalonados al intersectar | Diagrama completo estático (sin trazado) |
| Stack agéntico — vida | conexión en reposo | pulso/dash lento por las conexiones | loop lento (≥8s), compositor-only | Flujo acotado solo en viewport; pausa fuera de viewport | **Sin movimiento** — diagrama estático |
| CTA hover | reposo | lift 1–2px | 150ms ease-out | Micro-lift + color | Sin lift (solo color/focus) |
| Scroll ancla a `#diagnostico` | posición actual | form | smooth scroll | Suave | Salto instantáneo |

## Primitive & Token Mapping

- Primitive: CSS puro + IntersectionObserver (sitio público). SVG animado (stroke-dashoffset / opacity) preferido para el "stack agéntico"; island ligera solo si requiere orquestación que CSS/WAAPI no cubra (evaluar en build).
- Imports allowed: CSS page-scoped del landing (`gh-hubspot-*`), SVG inline, `<video muted loop playsinline>` (solo si se justifica), IntersectionObserver.
- Imports forbidden: `@/components/greenhouse/motion/**`, `useGreenhouseGSAP`, Framer Motion, wrappers del portal (son del runtime Greenhouse, no del sitio público). NO GSAP salvo justificación explícita.
- Timing tokens: escala 75/150/200/300/400ms (consistente con TASK-1343/1351).
- Easing tokens: ease-out `cubic-bezier(0.2,0,0,1)`.
- Layout animation: ninguna (sin morph). El "stack agéntico" anima `transform`/`opacity`/`stroke-dashoffset`, no layout.
- CSS properties: solo compositor-friendly (`transform`, `opacity`; `stroke-dashoffset` para el trazado del SVG). Evitar animar `width`/`height`/`top`/`left`.
- GSAP/Lottie justification: N/A — no se usan. Si en build se justifica orquestación del "stack agéntico", documentar y preferir CSS/WAAPI antes que GSAP.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)` + guard JS (no iniciar IO/animación del "stack agéntico" si reduce).
- Replacement behavior: todo el contenido visible sin animación; el "stack agéntico" muestra el diagrama completo estático (nodos + conexiones trazados), sin trazado progresivo ni pulsos.
- Meaning preserved: sí — el diagrama sigue comunicando el flujo Smart CRM → agentes → operación; solo se retira el movimiento.
- Animations removed: hero rise, reveals, trazado/pulsos del "stack agéntico", hover lift, smooth scroll.
- Animations retained: cambios de color/focus ring (no dependen de movimiento).

## Accessibility & Feedback

- Focus visibility: focus ring visible AA en todos los CTAs, `<summary>`, link del Marketplace y campos.
- Keyboard activation: CTAs, FAQ y link del Marketplace operables por teclado; el "stack agéntico" no requiere interacción de teclado (decorativo con descripción textual paralela).
- Live region / status behavior: Success/Error Card del form con `role="status"`/`role="alert"` (owned por el renderer).
- Color-independent state: estados no dependen solo de color (texto+ícono en el form; focus ring).
- Motion-independent meaning: ningún significado depende del movimiento; el "stack agéntico" comunica igual estático + su descripción textual.
- Error/destructive stability: N/A (sin acciones destructivas en la superficie).

## Performance Guardrails

- Compositor-only properties: `transform` + `opacity` (+ `stroke-dashoffset` para el trazado SVG) únicamente.
- Layout reads/writes: evitar thrash; IO en vez de listeners de scroll; animar fuera del main thread.
- Animation scope: el "stack agéntico" anima solo mientras está en viewport (pausar con IO al salir); reveals corren una sola vez.
- Chart/counter constraints: no hay counters/charts animados en esta superficie.
- Mobile constraints: en 390px, reducir densidad del "stack agéntico" (o degradar a diagrama estático); respetar CWV (LCP<2.5s, INP<200ms); si se usa `<video>`, `preload=metadata`, `playsinline`, sin audio.

## GVC / Micro Evidence

- Scenario: `public-servicios-contratar-hubspot`
- Scenario file: `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt` `[verificar/crear]`
- Route: URL pública del preview.
- Viewports: 1440 + 390.
- Required steps: cargar; scroll hasta el "stack agéntico"; hold para capturar movimiento; abrir FAQ; capturar reduced-motion.
- Required captures: hero entrada; "stack agéntico" en 2+ frames (probar movimiento); reveals; CTA hover/focus; reduced-motion estático.
- Required frame labels: `hero-in`, `stack-t0`, `stack-t1`, `faq-open`, `reduced-motion`.
- Required `data-capture` markers: `hero`, `stack-agentico`, `faq`, `cta-final`, `diagnostico`.
- Assertions: el "stack agéntico" se mueve en default (frames `stack-t0` ≠ `stack-t1`); estático bajo reduced-motion; focus ring visible; sin scroll horizontal.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` — diagrama estático, sin loops.

## Design Decision Log

- Decision: motion tier bajo/acento con **una** pieza firma (el "stack agéntico") que hace show-don't-tell del deployment programático; el resto son reveals sutiles y microinteracciones de CTA. CSS + IO/SVG, sin librerías pesadas. Ver PDR-006.
- Alternatives considered: hero-video autoplay full-bleed (peso/CWV + distrae), motion pesado con GSAP/parallax (contradice restraint + performance-as-craft), sin motion (desperdicia el argumento medium-is-message del diferenciador técnico) — descartados.
- Why this pattern: el diferenciador de Efeonce es técnico (deployment programático, operación gobernada); una pieza firma que *muestra* el stack en movimiento prueba capacidad sin sacrificar CWV ni accesibilidad; el resto queda en restraint editorial.
- Reuse / extend / new primitive: reuse de patrones CSS del sitio público (precedente TASK-1343 reveal/marquee; TASK-1351 sección firma); el "stack agéntico" es page-scoped nuevo, no primitive del portal.
- Open risks: peso del "stack agéntico" en mobile (mitigado con degradación a diagrama estático); riesgo "AI slop" en los assets (mitigado con art direction primero + preferir SVG vectorial limpio); asegurar pausa fuera de viewport.
- Follow-up: definir en build si el "stack agéntico" es SVG animado (preferido), CSS puro o island ligera, según el peso real y CWV medido.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention (el "stack agéntico" reduce la incertidumbre "¿saben operar HubSpot agéntico?").
- [ ] Reduced-motion behavior preserves the same meaning (diagrama estático muestra el mismo flujo).
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved public-site CSS/IO/SVG, NOT portal motion wrappers.
- [ ] Performance guardrails avoid layout thrash and excessive animation (compositor-only; pausa fuera de viewport; CWV).
- [ ] GVC/micro evidence proves the meaningful interaction ("stack agéntico" en movimiento en 2 frames), not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
