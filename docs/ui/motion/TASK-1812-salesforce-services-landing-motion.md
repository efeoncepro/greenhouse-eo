# TASK-1812 — Connected Salesforce Universe Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1812 — Landing pública de servicios Salesforce: universo conectado`
- Related wireframe: `docs/ui/wireframes/TASK-1812-salesforce-services-landing.md`
- Related flow: `docs/ui/flows/TASK-1812-salesforce-services-landing-flow.md`
- Motion type: `orchestrated + scroll-localized + microinteraction`
- Primary primitive / library: CSS/IntersectionObserver page-scoped; GSAP sólo mediante wrapper existente y justificación runtime.
- Copy source: ledger TASK-1812; motion no crea claims.

## Motion Brief

- Primary user: buyer enterprise que necesita entender relaciones entre clouds, datos, procesos y agentes.
- Motion intent: hacer visible el recorrido señal→decisión→acción→aprendizaje.
- Uncertainty reduced: Salesforce no se presenta como catálogo; Efeonce conecta y opera el sistema.
- User decision supported: elegir base instalada/evaluación y avanzar al diagnóstico.
- Non-goals: espectáculo, imitación de animaciones Salesforce, robots en loop, parallax ornamental, scroll hijack o counters.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero copy | first paint | reveal corto por jerarquía desde HTML visible | CSS | optional |
| Cloud Navigator | enhancement/entry | ruta se dibuja una vez entre hitos | SVG + scoped timeline | signature |
| Route selector | click/key | estado y resumen cambian con crossfade corto | CSS | required |
| Signal journey | localized scroll/select | se ilumina un tramo y su outcome | scoped timeline | signature |
| Solution lanes | hover/focus/select | resalta relación, no mueve layout | CSS | required |
| Agent missions | select | misión→dato→guardrail→outcome | CSS/SVG | optional |
| Lifecycle | entry | cuatro fases aparecen como continuidad | IntersectionObserver | optional |
| FAQ | toggle | disclosure nativo/transition tokenizada | CSS/native | required |
| CTA/host | hover/focus/pending | feedback táctil + estados host | existing host | required |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Route | label visible | emphasis | ring fuerte | ack | label + aria state | n/a | n/a |
| Lane | summary visible | path emphasis | ring | ack | detail stable | n/a | n/a |
| CTA | stable | lift mínimo | ring sin travel | tactile | n/a | host only | host receipt/error |
| FAQ | question | cue | ring | ack | expanded | n/a | n/a |
| Form | valid states | host | host | ack | n/a | duplicate disabled | server-confirmed |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| feedback | idle | hover/press | `feedback` | inmediato, subordinado | snap |
| context | installed | evaluate | `transition` | crossfade + cambio de label | cambio inmediato |
| reveal | natural | emphasized | `reveal` | one-pass | sin animación |
| journey | signal A | signal B | `narrative` | path localizado e interruptible | capítulos estáticos |
| receipt | pending | complete/error | host token | sólo tras respuesta real | estado inmediato |

## Primitive & Token Mapping

- Primitive: CSS para feedback/reveal; IntersectionObserver para one-pass; timeline scoped sólo para Navigator/Journey.
- Imports allowed: wrappers ya presentes en el runtime público después de Discovery.
- Imports forbidden: CDN, Lottie/GSAP directo o motor paralelo inyectado en Elementor.
- Timing tokens: `feedback|transition|reveal|narrative` centralizados page-scoped.
- Easing tokens: deceleración para enter; exit breve; linear sólo para progreso auténtico.
- Layout animation: no width/height/top/left; transform/opacity y SVG stroke bounded.
- CSS properties: transform, opacity, stroke-dashoffset; limpiar `will-change`.
- GSAP/Lottie justification: GSAP sólo si el wrapper existe y SVG/scroll no queda robusto con CSS; Lottie no se justifica.

## Reduced Motion Contract

- Detection: `prefers-reduced-motion: reduce` CSS + media query del JS scoped.
- Replacement behavior: mapa completo estático, capítulos verticales y selección instantánea.
- Meaning preserved: labels, secuencia, conectores, ruta actual y outcomes.
- Animations removed: drawing, travel, stagger, pinning, parallax, smooth scroll y autoplay.
- Animations retained: focus ring y feedback/status mínimo que evita incertidumbre.

## Accessibility & Feedback

- Focus visibility: nunca parte invisible ni se desplaza con la escena.
- Keyboard activation: mismo estado que pointer; latest input wins.
- Live region / status behavior: sólo contexto seleccionado y estados async reales.
- Color-independent state: label, iconografía y aria state acompañan el color.
- Motion-independent meaning: lista DOM equivalente a cada mapa/SVG.
- Intermediate-frame contrast: `AA preserved` — animar conectores/surfaces, no bajar texto bajo contraste.
- Error/destructive stability: error no tiembla, rebota ni desaparece.

## Performance Guardrails

- Compositor-only properties: transform/opacity; paths SVG de complejidad acotada.
- Layout reads/writes: medir fuera del frame, batch y sin loops de scroll.
- Animation scope: root de página; observers/timelines se destruyen en resize/editor/navigation.
- Chart/counter constraints: no charts ni counters decorativos.
- Mobile constraints: cero pinning/parallax, menor número de nodos y scroll táctil siempre soberano.
- First paint: H1, argumento y CTA visibles sin JS; media con dimensiones reservadas; cero CLS inducido.

## GVC / Micro Evidence

- Scenario: `TASK-1812-public-salesforce-services-motion`
- Scenario file: crear durante implementación.
- Route: work page `noindex`.
- Viewports: 1440, 390; reduced motion en ambos.
- Required steps: hero natural/settled; cambio rápido de rutas; journey por estados; lane focus; host pending/error/success; resize.
- Required captures: stills de inicio/final + trace corta de Navigator/Journey.
- Required frame labels: `hero-natural|hero-connected|route-installed|route-evaluate|journey-outcome|reduced-static`.
- Required `data-capture` markers: `hero|routes|journey|lanes|agents|conversion`.
- Assertions: latest input wins, cleanup completo, contenido nunca oculto, focus/aria/text sincronizados, cero overflow/console errors.
- Intermediate-frame axe/contrast evidence: hero, route focus y journey sobre transiciones de surface.
- Reduced-motion evidence: todo significado visible, sin travel/pinning/stagger/autoplay.

## Design Decision Log

- Decision: motion `connect and clarify`; Navigator y Journey son las únicas firmas narrativas.
- Alternatives considered: mundo flotante continuo, video hero, horizontal scroll y UI totalmente estática.
- Why this pattern: expresa integración sin convertir la experiencia en entretenimiento o una copia de Salesforce.
- Reuse / extend / new primitive: reusar CSS/host; extender timeline scoped sólo si Discovery lo justifica; no primitive global.
- Open risks: inventario del runtime, coste LCP/INP, complejidad SVG y rights de cualquier asset.
- Follow-up: congelar tokens/selectores después del first-fold checkpoint.

## Acceptance Checklist

- [x] The owning task declares this file in `Motion`.
- [x] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [x] Reduced-motion behavior preserves the same meaning.
- [x] Focus, selected, pending and error states do not rely on motion alone.
- [x] Imports use approved wrappers/primitives.
- [x] Performance guardrails avoid layout thrash and excessive animation.
- [x] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [x] Design decision log explains why this motion is needed and what was rejected.
