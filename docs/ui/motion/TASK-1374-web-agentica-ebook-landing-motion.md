# TASK-1374 — Web Agéntica Ebook Landing Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1374 — Landing pública del ebook "El fin de la web" (/web-agentica)`
- Related wireframe: [docs/ui/wireframes/TASK-1374-web-agentica-ebook-landing.md](../wireframes/TASK-1374-web-agentica-ebook-landing.md)
- Related flow: [docs/ui/flows/TASK-1374-web-agentica-ebook-landing-flow.md](../flows/TASK-1374-web-agentica-ebook-landing-flow.md)
- Motion type: `ambient + reveal` (marketing), no orchestrated pipeline
- Primary primitive / library: CSS en la ruta Astro de Think (grid drift, beams, spotlight, count-up); GSAP solo si un reveal lo justifica, scoped a la ruta. No primitive MUI Greenhouse (vive en Astro).
- Copy source: copy local de Think alineado al state copy del wireframe.

## Motion Brief

- Primary user: decisor de marketing/growth entrando a un lead magnet público premium.
- Motion intent: dar sensación enterprise-moderna de marca Efeonce (hero vivo, datos que "cuentan") sin robar protagonismo al CTA ni al form.
- Uncertainty reduced: carga del contrato del form, submit pendiente, confirmación de envío del ebook.
- User decision supported: entender la tesis y llegar al form sin fricción.
- Non-goals: espectáculo decorativo, scroll-jacking, progreso falso, "reporte" simulado, motion que tape la usabilidad del form, la fuente DM Sans / los efectos del `_ds/` foráneo (se re-tokenizan a AXIS).

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Hero grid | Load + idle | Deriva sutil del grid con máscara radial (portado del PR, re-tokenizado a `axis.*`). | CSS `@keyframes` + mask | yes |
| Hero beams | Load + idle | Haces de luz que "caen" (naranja/azul de acento), ambientales. | CSS `@keyframes` | yes |
| Hero entrance | Initial load | Reveal escalonado de eyebrow → H1 → lead → CTA. | CSS transition / IntersectionObserver | yes |
| Stat cards | Scroll into view | Count-up de −27% / 3× / 7× con la fuente citada visible. | CSS/JS count-up con fallback | yes |
| Spotlight cards | Hover / pointer | Halo naranja que sigue el cursor en cards de contenido. | CSS custom props (`--spot-x/y`) | opt |
| Section reveals | Scroll into view | Opacity + translateY < 16px al entrar cada sección. | CSS / IntersectionObserver | yes |
| Form contract loader | Renderer no listo | Skeleton estable de "cargando formulario"; sin spinner-only. | CSS skeleton | yes |
| Form host ready | Contrato resuelto | Reemplazo del skeleton con transición corta opacity/translate. | CSS transition | yes |
| Submit pending | Renderer enviando | Estado pendiente controlado por el renderer; el host puede añadir contexto no bloqueante. | Renderer + CSS | yes |
| Success | Submit aceptado | Reemplazo calmo por la confirmación de descarga y recuperación gated; sin confetti ni progreso. | CSS + live region | yes |
| Error/degraded | Fallo de carga/submit/autorización | Estado estático calmo con un solo camino de retry/recuperación. | CSS + live region | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Pending | Success / error |
|---|---|---|---|---|---|---|
| CTA "Descargar el ebook gratis" | Botón naranja de acento | Elevación/borde | Ring visible | Compresión leve | Deshabilitado si salta al form loading | n/a |
| Stat cards | Número final estático (o post count-up) | Lift de borde/ink | Ring si es interactivo | n/a | n/a | n/a |
| Spotlight content cards | Card sobria | Halo naranja siguiendo cursor | Ring visible si interactiva | n/a | n/a | n/a |
| Form submit (del renderer) | Botón "Enviarme el ebook" | Señal de borde/elevación | Ring visible | Compresión | Estado pendiente del renderer | Copy de error estable |
| FAQ `<summary>` | `+` colapsado | Lift de ink | Ring visible | n/a | n/a | Abre/cierra con altura animada corta |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Hero entrance | blank hero | hero content | 240–420ms ease-out | opacity + translateY < 16px, stagger < 80ms | contenido inmediato, sin stagger |
| Section reveal | oculto | visible | 240–360ms ease-out | opacity + translateY al entrar viewport | contenido inmediato |
| Stat count-up | 0 | valor final | 600–900ms ease-out | conteo numérico con fuente visible | número final directo |
| Form contract | `form.loading` | `form.ready` | 180–240ms ease-out | crossfade skeleton → renderer host | swap instantáneo con texto de estado |
| Submit | `form.ready` | `form.submitting` | renderer-owned | pending + doble-submit deshabilitado | texto de pending estático |
| Success | `form.submitting` | `form.success` | 0–240ms ease-out | reemplazo calmo del form por la confirmación de descarga; dos columnas sólo en desktop | swap instantáneo |
| FAQ toggle | colapsado | expandido | 160–240ms ease-out | altura + opacity del panel | display inmediato |
| Error | cualquier loading/pending | error/degraded | 0–160ms | detener motion ambiental; recovery estable | error estático |

## Primitive & Token Mapping

- Primitive: sin primitive runtime Greenhouse; componentes CSS route-local de Think + `<greenhouse-form>` gobernado.
- Imports allowed: Astro/CSS nativo; `gsap` route-local solo si un reveal lo justifica; script mínimo para eventos del renderer/count-up.
- Imports forbidden: Lottie, librerías de animación pesadas, `support.js`/`image-slot.js`/`_ds_bundle.js` del export, polling ad hoc, state machines locales que dupliquen Greenhouse.
- Timing tokens: mapear a CSS vars de Think/AXIS si existen; si no, duraciones locales acotadas y documentadas.
- Easing tokens: ease-out para entradas; linear/soft para lanes ambientales; sin bounce/spring espectáculo.
- Layout animation: el form no hace morph; al terminar, la tarjeta puede adoptar inmediatamente su ancho de conclusión desktop. En movimiento reducido el swap es inmediato.
- CSS properties: transform, opacity, background-position, mask-position; evitar animar width/height/top/left.
- Color: el naranja de acento y los azules de las beams/grid salen de `axis.*` / la var de acento — NUNCA HEX crudo (el PR los trae hardcodeados; se re-tokenizan).
- GSAP justification: por defecto NO se necesita GSAP (todo es CSS ambient + reveal). Si un reveal de hero lo justifica, queda scoped a la ruta y no gobierna validación ni lógica.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)` (el PR ya lo declara para grid/beams; se conserva y se extiende).
- Replacement behavior: mostrar todo el contenido de inmediato; reemplazar grid drift, beams y count-ups por estado estático con el mismo significado (el número final visible, no el conteo).
- Meaning preserved: cada dato conserva su valor + fuente en texto; el estado del form es texto.
- Animations removed: grid drift, beams, entrance stagger, section reveals, count-up, spotlight, transiciones translate.
- Animations retained: focus ring y cambios de estado instantáneos.

## Accessibility & Feedback

- Focus visibility: todos los controles con foco visible; sin afordances hover-only.
- Keyboard activation: CTA/FAQ/retry usan links/botones nativos; el FAQ usa `<details>/<summary>`.
- Live region: loading/submit/success/error usan live region polite cuando el host controla el estado.
- Color-independent: el estado y los datos no se expresan solo por color (etiqueta + valor en texto).
- Motion-independent meaning: los labels del loader explican si el form carga, el submit está pendiente o el ebook ya fue enviado.
- Error stability: los estados de error detienen la motion ambiental y mantienen el copy de recuperación estático.

## Performance Guardrails

- Compositor-only: transform/opacity/background-position/mask-position.
- Layout reads/writes: sin loops de medición; sin scroll-jacking.
- Animation scope: hero (grid/beams/entrance), stat count-up, section reveals, spotlight, form loader, success/error.
- Counter constraints: los count-ups son datos citados con fuente, no métricas propias inventadas; con fallback estático.
- Mobile constraints: sin canvas full-screen; beams/grid livianos; el fold no debe empujar el CTA fuera de vista ni dañar LCP/INP (el PR mete `support.js` render-blocking en `<head>` — se elimina).

## GVC / Micro Evidence

- Scenario: Think Web Agéntica landing rich states
- Scenario file: `scripts/capture.mjs /web-agentica web-agentica-landing` o Playwright local de Think.
- Route: `/web-agentica`
- Viewports: 1440, 1280, 390
- Required steps: capturar hero settled, stat count-up settled, form loader, form ready, submit pending/success en modo controlado seguro, reduced-motion.
- Required captures: hero, stats, form loader, form ready, success, error/degraded, hero mobile, form mobile.
- Required frame labels: `hero-settled`, `stats-settled`, `form-loading`, `form-ready`, `form-success`, `reduced-motion`.
- Required `data-capture` markers: `web-agentica-landing`, `web-agentica-hero`, `web-agentica-stats`, `web-agentica-thesis`, `web-agentica-inside`, `web-agentica-audience`, `web-agentica-form`, `web-agentica-form-loader`, `web-agentica-faq`, `web-agentica-footer`.
- Assertions: sin layout shift que mueva el form, sin progreso falso, sin overflow, reduced-motion desactiva la motion ambiental, sin `_ds/` ni DM Sans.
- Reduced-motion evidence: captura o assert dedicado con `prefers-reduced-motion: reduce`.

## Design Decision Log

- Decision: motion marketing ambient + reveal (grid/beams/count-up/spotlight portados del PR, re-tokenizados a AXIS), sin pipeline orquestado; el post-submit es una confirmación de descarga inmediata, calma y recuperable.
- Alternatives considered: página estática sin motion (pierde el wow del PR); GSAP orquestado como en brand-visibility (innecesario: no hay wait async ni report handoff); confetti/progreso en success (deshonesto para una descarga ya entregada).
- Why this pattern: el usuario necesita una entrada premium de marca y datos con peso, no una consola de análisis; la entrega es gated en el mismo momento, por lo que el éxito confirma el archivo y conserva la tesis de web agéntica.
- Reuse / extend / new primitive: reuse del shell de Think + CSS route-local + renderer Growth Forms; sin primitive nueva.
- Open risks: portar los efectos sin regresión de contraste/perf; el fold no debe dañar LCP en mobile.
- Follow-up: si algún reveal necesita GSAP, mantenerlo scoped y documentar el token de timing.

## Acceptance Checklist

- [x] La task declara este archivo en `Motion` cuando aplica.
- [x] La motion está atada a feedback, orientación o reducción de incertidumbre, no a espectáculo.
- [x] El reduced-motion preserva el mismo significado (dato + fuente en texto).
- [x] Focus, pending y error no dependen solo de motion.
- [x] Los imports evitan el runtime foráneo del export (`support.js`/`_ds/`).
- [x] Los guardrails de performance evitan layout thrash y JS render-blocking.
- [x] La evidencia GVC prueba la interacción, no solo un screenshot.
- [x] El decision log explica por qué esta motion y qué se rechazó.
