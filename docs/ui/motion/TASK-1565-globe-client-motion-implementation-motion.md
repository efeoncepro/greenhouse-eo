# TASK-1565 — Motion del payload cliente de Globe · Motion Contract (implementación)

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1565 — Motion del payload cliente de Globe (feed + composer)`
- Related wireframe: `docs/ui/wireframes/TASK-1565-globe-client-motion-implementation.md`
- Related flow: `none`
- Motion type: `primitive-default` + `transition-system`
- Primary primitive / library: **CSS** — sin librería de animación
- Copy source: `apps/studio-client/src/copy/index.ts` (el motion no agrega copy, **depende** del existente)
- **Contrato gobernante (SSOT):** [`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`](../../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md)

> Este documento es el **plan de implementación** del SSOT, no una segunda definición. Los valores medidos, las
> tres capas y el contrato de `prefers-reduced-motion` están allá. Acá está: qué se construye, en qué orden, y
> cómo se prueba que no se pueda perder.

## Motion Brief

- **Primary user:** operador interno de Efeonce esperando que su pieza se genere.
- **Motion intent:** cerrar la brecha entre el diseño aprobado (11 animaciones) y lo shippeado (4), y dejar el
  contrato de accesibilidad **verificado por un gate** en vez de por disciplina.
- **Uncertainty reduced:** «¿está pasando o está trabado?» — y, para quien usa `prefers-reduced-motion`,
  «¿dónde están las acciones de esta card?».
- **User decision supported:** seguir esperando vs cancelar.
- **Non-goals:** contadores animados, transición de layout en la parrilla, motion en estados vacíos o de error,
  `coachPulse` (no existe la superficie).

## Motion Inventory

Los 8 anclajes del wireframe, con su estado actual:

| # | Element | Trigger | Motion | Primitive | Estado |
|---|---|---|---|---|---|
| ① | card / hero | primera aparición de `stableKey` | `candIn` .42s `both` | CSS | **falta** |
| ② | isotipo | `kind === 'active-run'` | `gBreathe`+`gHalo`+`gFlame`+`gSpark`×4 | `GlobeGeneratingMark` | **falta** (primitive nueva) |
| ③ | barra de progreso | `coarseProgress` avanza | `width` `--duration-progress` `linear` | CSS | **falta** (no hay barra) |
| ④ | acciones de card | hover / `focus-within` | `opacity`+`transform` `--duration-short` | CSS | existe; **falta su reduce** |
| ⑤ | lift de card | hover / `focus-within` | `transform`+`border`+`shadow` | CSS | existe |
| ⑥ | skeleton | `loading` | `skel` 1.3s `linear` | CSS | **falta** (caja estática) |
| ⑦ | popovers | abrir | `overlayIn` .2s | CSS | **falta** (Slice 7) |
| ⑧ | estimado | cambio de recipe | `opacity` `--duration-short` | CSS | **falta** (Slice 7) |
| — | aurora | montaje | `auroraA`×2 + `auroraB` | `AuroraLayer` | **falta** |
| — | thumbnail | bytes resueltos | fade `--duration-medium` | CSS | existe |
| — | diálogo del viewer | abrir | `pv-enter` (= `sheetIn`) | CSS | existe |
| — | stage | resolver | `gl-stage-in` | CSS | existe |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Card | reposo; acciones ocultas | lift 2px + acciones visibles | **igual que hover** vía `:focus-within` | — | borde de acento | isotipo animado + progreso textual | texto de fallo con punto de color |
| Acción de card | `opacity 0` | `opacity 1` | `opacity 1` | — | favorito relleno | deshabilitada con razón en `title` | — |
| Isotipo | no existe | — | — | — | — | 4 animaciones en fase | desaparece al terminar la corrida |
| Skeleton | shimmer | — | — | — | — | — | — |

## Transition Specs

Ver SSOT §2 y §3 para los valores. Lo específico de la implementación:

| Transition | Detalle de implementación | Reduced-motion |
|---|---|---|
| `candIn` | requiere **estado**, no sólo CSS: un `Set` de `stableKey` ya vistos. Con CSS solo, cada reconciliación (4s) re-dispara la entrada y la pantalla late | `--duration-none` |
| isotipo | 4 animaciones sobre elementos anidados del mismo componente; `gBreathe`/`gHalo` con el **mismo token** | `animation: none`, **elemento visible** |
| `gSpark` | 4 instancias con `--sx` distinto por chispa, vía custom property inline | `animation: none` |
| acciones de card | ⚠️ contraparte **obligatoria**: `opacity: 1` + `pointer-events: auto` | **no se apaga: se fija visible** |
| estimado atenuado | invalidación **sincrónica** con el cambio de campo, antes del debounce | transición corta, **estado atenuado se conserva** |
| aurora | 3 capas `position: fixed`, z-index bajo todo, `pointer-events: none` | `animation: none` |
| `skel` | `background: linear-gradient` + `background-position` animado | `animation: none` |

## Primitive & Token Mapping

- **Primitive nueva 1:** `GlobeGeneratingMark` — kinds `inline` (card, ~1.6rem) y `stage` (hero/composer,
  ~3.5rem). Dos consumidores reales desde el día uno; no es una primitive hipotética.
- **Primitive nueva 2:** `AuroraLayer` — 3 capas, montada una sola vez por documento (Open question: layout vs
  superficie).
- **Imports allowed:** CSS del módulo, `tokens.ts`, primitives del payload cliente.
- **Imports forbidden:** `@core`, MUI, AXIS, cualquier librería de animación, `img-src` externo.
- **Timing tokens (9 nuevos):** `--duration-long|overlay|sheet|breathe|flame|skeleton|progress`,
  `--ease-linear`, `--ease-pulse`.
- **Layout animation:** ninguna.
- **CSS properties:** `transform`, `opacity`, `background-position`, `border-color`, `box-shadow`. `width` sólo
  en la barra de progreso, con `contain`.
- **GSAP/Lottie justification:** **no se usan.** Todo es declarativo y cíclico; una librería agregaría peso al
  payload cliente sin resolver nada. El isotipo es 7 elementos con `transform`/`opacity`, no un rig complejo.

## Reduced Motion Contract

- **Detection:** `@media (prefers-reduced-motion: reduce)` en CSS. **Sin detección en JS** — un `matchMedia` en
  JS agrega una fuente de verdad que puede desincronizarse del CSS.
- **Replacement behavior:** SSOT §4, tabla completa.
- **Meaning preserved:** el progreso de una corrida se dice con **texto** (`Generando`, `Enviando`,
  `Finalizando`) más el punto de color con su etiqueta. El isotipo acompaña; **nunca** es el único portador.
- **Animations removed:** aurora, `skel`, las 4 del isotipo (la animación, no el elemento), `candIn`,
  `overlayIn`, transición de la barra de progreso.
- **Animations retained:** ninguna como movimiento.
- **Estados que se CONSERVAN (no son animación):** acciones de card visibles con `pointer-events: auto`;
  estimado atenuado con su texto.

### El gate — el entregable más durable de esta task

Un test que recorre los `.css` del payload y exige:

> toda regla con `animation:` cuya duración no sea `--duration-none` tiene que tener contraparte dentro de un
> bloque `prefers-reduced-motion: reduce`.

**Tiene que morder de verdad.** El Slice 1 incluye:

1. agregar una animación sin contraparte → el test **falla**;
2. verificar que **no** hay falsos positivos sobre las 4 animaciones existentes (que ya tienen su contraparte);
3. verificar que una animación con `--duration-none` **no** exige contraparte (es el propio fallback).

Sin (2) el gate se descarta como sobre-amplio la primera vez que molesta. Es la misma lección del gate de
tipografía de `TASK-1561`: seis mordidas con **cero colaterales**.

## Accessibility & Feedback

- **Focus visibility:** anillo en todo control; `:focus-within` revela lo mismo que `:hover`, sin excepción.
- **Keyboard activation:** esta task no agrega controles.
- **Live region / status behavior:** el progreso textual ya vive en el DOM; esta task **depende** de que siga
  ahí y lo verifica en modo `reduce`.
- **Color-independent state:** cada punto de color va con su etiqueta.
- **Motion-independent meaning:** el assert #3 del canary lo verifica explícitamente.
- **Intermediate-frame contrast:** ⚠️ dos puntos a medir con **muestreo de píxeles** (axe reporta `incomplete`
  sobre gradientes): (a) el halo del isotipo sube a `opacity .72` sobre el scrim; (b) el estimado atenuado a
  `.45` sobre el riel, que es texto informativo sobre gasto. Se registra el valor medido, no un `pass`.
- **Error/destructive stability:** los bloques de error son estáticos con `role=alert`. Nada pulsa ni desaparece.

## Performance Guardrails

- **Compositor-only properties:** sí, con la excepción declarada de la barra de progreso.
- **Layout reads/writes:** ninguno en el path de animación.
- **Animation scope:** ⚠️ **el riesgo principal.** Cada corrida activa monta 7 elementos animados
  permanentemente (isotipo + halo + llama + 4 chispas), más 3 de aurora por documento. Hay que **medir con N
  corridas en vuelo** y considerar `IntersectionObserver` para pausar el isotipo fuera del viewport.
- **Chart/counter constraints:** no hay contadores animados, deliberadamente.
- **Mobile constraints:** orden de sacrificio documentado en el wireframe — la aurora primero, el isotipo último.

## GVC / Micro Evidence

- **Scenario:** `apps/studio-client/scripts/producer-motion-canary.mjs`
- **Scenario file:** ídem
- **Route:** `http://127.0.0.1:4323/producer/feed`
- **Viewports:** 1440 · 390
- **Required captures:** `reposo`, `hover-acciones`, `generando`, `reduce-acciones`, `reduce-generando`
- **Required `data-capture` markers:** `producer-runtime-feed`, `producer-generating-mark`
- **Assertions (los cuatro obligatorios):**
  1. con `reduce`, las acciones de la card tienen `opacity: 1` y `pointer-events: auto`;
  2. con `reduce`, el isotipo sigue en el DOM con `animation-name: none`;
  3. con `reduce`, el **progreso textual está presente** — el motion nunca fue el único portador;
  4. `candIn` corre **una vez** por `stableKey`: tras dos ciclos de reanudación, las cards existentes no
     re-animan.
- **Scroll-width checks:** por panel y documento, en los dos anchos.
- **Reduced-motion / focus evidence:** obligatoria, con `page.emulateMedia({ reducedMotion: 'reduce' })`.
- **Review dossier:** `docs/ui/reviews/TASK-1565-globe-client-motion-implementation.scorecard.json`
- **Baseline decision / surface ID:** reusa `globe-producer-feed`; el diff contra la baseline sin motion es la
  evidencia de before/after.
