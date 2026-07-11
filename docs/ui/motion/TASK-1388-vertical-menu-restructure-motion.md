# TASK-1388 — Menú vertical: acordeón + ⌘K Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1388 — Reestructuración del menú vertical (portal interno)`
- Related wireframe: [docs/ui/wireframes/TASK-1388-vertical-menu-restructure.md](../wireframes/TASK-1388-vertical-menu-restructure.md)
- Related flow: [docs/ui/flows/TASK-1388-vertical-menu-restructure-flow.md](../flows/TASK-1388-vertical-menu-restructure-flow.md)
- Motion type: `microinteraction` — expand/collapse coordinado (acordeón) + apertura del overlay ⌘K. No es un motion system nuevo.
- Primary primitive / library: `CSS` (colapso de submenú Vuexy ya existente) + `existing primitive` (`CommandPalette` Radix/cmdk trae su propia transición). NO se introduce Framer/GSAP nuevo para esto.
- Copy source: N/A (sin copy propio de motion).

## Motion Brief

- Primary user: usuario interno navegando el rail.
- Motion intent: dar continuidad espacial cuando un dominio se expande y otro se colapsa (acordeón), para que el usuario no pierda el punto de referencia; y señalar la aparición del ⌘K como capa modal.
- Uncertainty reduced: "¿qué se abrió y qué se cerró?" — la transición suave del acordeón evita el salto brusco que desorienta cuando el rail reflowa.
- User decision supported: elegir dominio/sección sin perder el hilo visual de dónde estaba.
- Non-goals: NO animaciones decorativas, NO stagger elaborado de items, NO parallax, NO motion nuevo en el chrome del rail. Reusar lo que ya anima Vuexy.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Submenú de dominio | Click en dominio | Expand/collapse de altura (reveal de children) | CSS collapse Vuexy actual | Sí |
| Acordeón (otros dominios) | Abrir un dominio | Colapso simultáneo del que estaba abierto | misma transición CSS | Sí |
| Chevron del dominio | Expand/collapse | Rotación del icono (estado abierto/cerrado) | CSS transform | Sí |
| Overlay ⌘K | `⌘K` | Fade/scale-in del Dialog | `CommandPalette` (Radix) actual | Sí (ya existe) |
| Item activo | Navegación | Cambio de fondo/peso (sin animación de movimiento) | CSS state | No (instantáneo) |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Dominio (disparador) | colapsado | fondo tenue | focus ring 2px | — | expandido + chevron rotado + `aria-expanded=true` | — | — |
| Hoja | texto normal | fondo tenue | focus ring 2px | — | activo: peso + fondo + `aria-current` | — | — |
| ⌘K trigger | icono búsqueda | fondo tenue | focus ring | — | — | — | — |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Expand dominio | collapsed | open | token de motion del design system (`motion/core/tokens.ts`); reusar la duración/ease del colapso Vuexy actual (no hardcodear ms) | altura anima; children revelan | sin animación: cambio de estado instantáneo |
| Collapse (acordeón) | open | collapsed | mismo token | altura colapsa en paralelo al expand del otro | instantáneo |
| Chevron rotate | 0deg | 90/180deg | mismo token de duración | transform rotate | sin transición: icono en estado final |
| ⌘K open | closed | open | transición propia de Radix/`CommandPalette` | fade/scale-in | Radix respeta `prefers-reduced-motion`: sin scale/fade |

## Primitive & Token Mapping

- Primitive: colapso de submenú Vuexy (ya usado por todos los submenús actuales) + `CommandPalette` existente.
- Imports allowed: tokens de `motion/core/tokens.ts` si hay que declarar duración/ease explícita; el wrapper de menú Vuexy.
- Imports forbidden: GSAP directo en views (lint `no-direct-gsap-in-views`); magic numbers de motion inline en `sx`/CSS (lint `greenhouse/no-untokenized-motion`, TASK-1346); Framer nuevo para el acordeón.
- Timing tokens: reusar la duración del colapso de submenú existente; si se declara, vía token, nunca ms crudos.
- Easing tokens: `MOTION_EASE` del sistema; no curvas ad-hoc.
- Layout animation: solo altura (collapse) — evitar animar propiedades que causen thrash; preferir la técnica de collapse ya usada por Vuexy.
- CSS properties: `height`/`grid-template-rows` para el collapse (patrón existente), `transform` para el chevron (compositor-only).
- GSAP/Lottie justification: N/A — no se usa.

## Reduced Motion Contract

- Detection: `prefers-reduced-motion` (media query + hook `useReducedMotion` donde aplique); Radix lo respeta nativamente en el ⌘K.
- Replacement behavior: expand/collapse y ⌘K aparecen/desaparecen sin transición (cambio de estado instantáneo).
- Meaning preserved: sí — el estado abierto/cerrado y el active state se comunican por layout + `aria-expanded`/`aria-current`, no por la animación.
- Animations removed: expand/collapse height, chevron rotate transition, ⌘K fade/scale.
- Animations retained: ninguna (todo instantáneo bajo reduced-motion).

## Accessibility & Feedback

- Focus visibility: focus ring 2px, 3:1 contraste, en cada disparador y hoja.
- Keyboard activation: Enter/Space expande dominio; Enter navega hoja; `⌘K` abre buscador; Esc cierra.
- Live region / status behavior: N/A (navegación, sin anuncios dinámicos).
- Color-independent state: expandido = chevron + `aria-expanded`; activo = peso + fondo + `aria-current` (no solo color).
- Motion-independent meaning: el estado no depende de la animación; se lee del layout y de ARIA.
- Error/destructive stability: N/A (el menú no ejecuta acciones destructivas).

## Performance Guardrails

- Compositor-only properties: chevron con `transform`; el collapse usa la técnica existente (evitar animar `width`/`top`).
- Layout reads/writes: evitar leer/escribir layout en loop; reusar el mecanismo de collapse ya optimizado.
- Animation scope: acotada al dominio que se abre/cierra; el acordeón toca a lo sumo 2 dominios (el que abre + el que cierra).
- Chart/counter constraints: N/A.
- Mobile constraints: en drawer, misma transición; sin animaciones adicionales por apertura del drawer más allá del patrón Vuexy actual.

## GVC / Micro Evidence

- Scenario: acordeón del rail + apertura ⌘K.
- Scenario file: `scripts/frontend/scenarios/task-1388-vertical-menu-restructure.ts`.
- Route: `/home` (o `portalHomePath`) con `agent@greenhouse.efeonce.org`.
- Viewports: desktop 1440 + mobile 390.
- Required steps: abrir dominio A (capturar), abrir dominio B (verificar que A colapsa), abrir ⌘K, repetir con `prefers-reduced-motion`.
- Required captures: dominio A abierto, transición acordeón A→B, overlay ⌘K, captura reduced-motion.
- Required frame labels: `domain-open`, `accordion-swap`, `cmdk-open`, `reduced-motion`.
- Required `data-capture` markers: `sidebar-internal`, `cmdk-open`.
- Assertions: solo un dominio con `aria-expanded=true` a la vez; ⌘K con focus trap; sin scroll horizontal.
- Reduced-motion evidence: expand/collapse y ⌘K sin animación bajo `prefers-reduced-motion`.

## Design Decision Log

- Decision: **reusar** la transición de collapse Vuexy existente para el acordeón y la transición nativa de Radix para el ⌘K; NO introducir motion nuevo.
- Alternatives considered: acordeón con Framer layout animation (rechazado: agrega dependencia/motion nuevo para algo que Vuexy ya anima); sin animación (rechazado: el reflow brusco del acordeón desorienta).
- Why this pattern: mínima superficie de motion nueva, coherente con el resto de submenús, y respeta los lints de motion gobernado.
- Reuse / extend / new primitive: `reuse`.
- Open risks: si el acordeón "uno abierto" molesta a power-users, la decisión es de flow/IA, no de motion; validar en card-sort/GVC.
- Follow-up: si más adelante se adopta un motion system para el shell, revisar que el acordeón siga tokenizado.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention. (continuidad espacial del acordeón)
- [ ] Reduced-motion behavior preserves the same meaning. (estado por layout + ARIA, no por animación)
- [ ] Focus, selected, pending and error states do not rely on motion alone. (chevron + aria-expanded + aria-current)
- [ ] Imports use approved Greenhouse wrappers/primitives. (collapse Vuexy + Radix; sin GSAP/Framer nuevo)
- [ ] Performance guardrails avoid layout thrash and excessive animation. (transform chevron; collapse existente; scope 2 dominios)
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot. (accordion-swap + reduced-motion)
- [ ] Design decision log explains why this motion is needed and what was rejected. (reuse vs Framer vs none)
