# TASK-1559 — Feed + viewer del Producer de Globe · Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1559 — Globe Producer Feed + Viewer sobre el payload cliente`
- Related wireframe: `docs/ui/wireframes/TASK-1559-globe-feed-viewer-client-port.md`
- Related flow: `none`
- Motion type: `transition-system` + `microinteraction`
- Primary primitive / library: **CSS** (`@keyframes` + `transition`) — sin librería de animación
- Copy source: `apps/studio-client/src/copy/index.ts` (`producerFeed`, `producerViewer`)
- **Contrato de motion gobernante (SSOT):** [`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`](../../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md)

> **Este doc es la APLICACIÓN del contrato compartido a esta superficie, no una definición paralela.** Los
> valores, las tres capas y el contrato de `prefers-reduced-motion` viven en el SSOT porque el isotipo
> generando se comparte con el composer. Acá se declara **qué elementos del feed y del viewer** reciben qué,
> y qué queda explícitamente afuera.

## Delta que originó este documento

`TASK-1559` se autorizó y ejecutó con **`Motion: none`**. Fue un error de autoría: la UI aprobada tiene 11
`@keyframes` y 12 animaciones en uso. El feed shippeó con 4 de 11 y las 7 ausentes son las que dan
personalidad. Este contrato corrige el header de la task y define el trabajo pendiente.

**Implementado hoy (4):** `pf-enter` (lift/hover de card), `pf-thumb-in` (fade del thumbnail), `pv-enter`
(entrada del diálogo del viewer), `gl-stage-in` (entrada del stage). Los cuatro con su reduced-motion.

**Pendiente (7):** las cuatro del isotipo, las dos de aurora, y el shimmer del skeleton. Más `candIn` como
entrada real por pieza y `overlayIn`/`sheetIn` cuando existan overlays.

## Motion Brief

- **Primary user:** operador interno de Efeonce mirando generarse sus piezas.
- **Motion intent:** que el feed comunique **trabajo en curso** sin que el operador tenga que leer. El
  momento central es una pieza generándose; todo lo demás es acompañamiento.
- **Uncertainty reduced:** «¿esto está pasando ahora o está trabado?». Una corrida sin motion es
  indistinguible de una colgada.
- **User decision supported:** seguir esperando vs cancelar y recomponer.
- **Non-goals:** no hay motion en la lectura de metadata del inspector, ni en el cambio de densidad, ni en
  el filtrado. Reordenar la parrilla con una transición de layout se evaluó y **se descarta**: el feed
  reanuda cada 4s y un layout animado en cada reconciliación produce movimiento constante sin información.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Isotipo de Globe en una corrida activa | `kind === 'active-run'` | `gBreathe` + `gHalo` (3.2s, en fase) + `gFlame` (.85s) + `gSpark` ×4 (1.5/1.8/2+delay/1.6s) | `GlobeGeneratingMark` (**a crear**) | **sí** — es el momento de marca |
| Card del feed | primera aparición de un `stableKey` | `candIn` .42s `both` | CSS en `.pf__item` | **sí** |
| Card del feed | hover / `focus-within` | lift 2px + borde + sombra, `--duration-short` | ya implementado | sí |
| Acciones de la card | hover / `focus-within` | `opacity` + `translateY`, `--duration-short` | ya implementado | sí — **con la regla de reduced-motion del SSOT** |
| Thumbnail | bytes resueltos | fade `--duration-medium` | ya implementado | sí |
| Skeleton del feed | `state.kind === 'loading'` | `skel` shimmer 1.3s `linear` | CSS en `.pf__skeleton` | **sí** |
| Barra de progreso de una corrida | `coarseProgress` avanza | `width` `--duration-progress` `linear` | pendiente (no hay barra hoy) | no en este slice |
| Fondo de la superficie | montaje | `auroraA` ×2 (24s/32s) + `auroraB` (28s), `alternate` | CSS de página | **sí** |
| Diálogo del viewer | abrir | `pv-enter` (equivale a `sheetIn`) | ya implementado | sí |
| Overlay / menú | abrir | `overlayIn` .2s | pendiente — no hay overlays todavía | no en este slice |
| Coach mark | onboarding | `coachPulse` 2.2s | **fuera de scope** — la superficie no existe | no |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Card | reposo, acciones ocultas | lift 2px, acciones visibles | igual que hover vía `:focus-within` | — | borde de acento + `aria-pressed` en el botón de selección | isotipo animado + texto de progreso | texto `Falló · Se puede reintentar` con punto de color |
| Botón de selección | `+` translúcido | fondo más opaco | anillo de foco | — | `✓` + `aria-pressed=true` | — | — |
| Acción de card | oculta (opacity 0) | visible | **visible** — el foco la revela igual que el mouse | — | favorito relleno | deshabilitada con su razón en `title` | — |
| CTA del hero | visible siempre | fondo más claro | anillo de foco | — | — | deshabilitado con razón | — |
| Chip de filtro | tonal neutro | texto más claro | anillo de foco | — | fondo de acento + `aria-pressed` | — | — |
| Stage del viewer | pieza pintada | — | — | — | — | skeleton + `aria-busy` + label | bloque de estado con `role=alert` |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Entrada de card | `opacity 0, scale(.965) translateY(8px)` | `none` | `--duration-long` / `--ease-enter` | `both`, **una vez por `stableKey`** | `--duration-none` |
| Lift de card | reposo | `translateY(-2px)` + borde acento | `--duration-short` / `--ease-enter` | también en `:focus-within` | sin transición; el estado final aplica |
| Acciones de card | `opacity 0, translateY(.35rem)` | `opacity 1` | `--duration-short` | revela en hover/focus | **`opacity: 1` permanente + `pointer-events: auto`** |
| Thumbnail | `opacity 0` | `opacity 1` | `--duration-medium` / `--ease-enter` | el wash queda debajo | `--duration-none` |
| Diálogo del viewer | `opacity 0, scale(.985) translateY(.5rem)` | `none` | `--duration-sheet` / `--ease-enter` | `both` | `--duration-none` |
| Skeleton | `background-position 120%` | `-120%` | `--duration-skeleton` / `--ease-linear` | infinite | `animation: none` |
| Isotipo generando | ver SSOT §2 | — | `--duration-breathe` / `--duration-flame` | infinite, 4 animaciones en fase | **`animation: none`, elemento visible** |
| Aurora | `translate(0,0) scale(1)` | `translate(±6-7%) scale(1.12-1.16)` | 24s/28s/32s `alternate` / `--ease-enter` | infinite | `animation: none` |

## Primitive & Token Mapping

- **Primitive nueva:** `GlobeGeneratingMark` en `apps/studio-client/src/primitives/`. Compone isotipo + halo
  + llama + 4 chispas. Nace acá porque la consume el feed **y** el composer — no es una primitive con un
  solo consumidor.
- **Imports allowed:** CSS del propio módulo, `tokens.ts`, primitives del payload cliente.
- **Imports forbidden:** cualquier cosa de Greenhouse (`@core`, MUI, AXIS), librerías de animación, y
  `img-src` externo — el isotipo se resuelve inline o como asset del bundle (open question del SSOT).
- **Timing tokens:** `--duration-none|short|medium|long|overlay|sheet|breathe|flame|skeleton|progress`.
- **Easing tokens:** `--ease-enter`, `--ease-linear`, `--ease-pulse`.
- **Layout animation:** ninguna. Sin transición de layout en la parrilla (ver Non-goals).
- **CSS properties:** `transform`, `opacity`, `box-shadow`, `border-color`, `background-position`. La única
  excepción a compositor-only es `width` de la barra de progreso, acotada y con `contain`.
- **GSAP/Lottie justification:** **no se usan.** Todo el motion de esta superficie es declarativo y cíclico;
  una librería agregaría peso al payload cliente sin resolver nada que CSS no resuelva.

## Reduced Motion Contract

- **Detection:** `@media (prefers-reduced-motion: reduce)` en CSS. Sin detección en JS.
- **Replacement behavior:** ver la tabla del SSOT §4. Resumen: identidad se congela visible, estructura pasa
  a `--duration-none`, ambiente se apaga.
- **Meaning preserved:** el progreso lo dice el **texto** (`Generando`, `Enviando`, `Finalizando`) más el
  punto de color con su etiqueta. El isotipo acompaña; nunca es el único portador.
- **Animations removed:** aurora, shimmer del skeleton, las cuatro del isotipo (la animación, no el
  elemento), transición de la barra de progreso.
- **Animations retained:** ninguna como movimiento. Los estados finales de hover/focus sí se aplican.
- ⚠️ **La regla que no puede perderse:** las acciones de la card pasan a `opacity: 1` +
  `pointer-events: auto` **permanente**. Un affordance revelado por movimiento, sin movimiento, **deja de
  existir**: no se pierde una animación, se pierden cinco acciones por card.

## Accessibility & Feedback

- **Focus visibility:** anillo de foco en todo control; `:focus-within` en la card revela sus acciones.
- **Keyboard activation:** el viewer es `<dialog>` nativo con `showModal()` — trampa de foco, `Esc` e
  `inert` del fondo son del browser. El foco vuelve al origen al cerrar.
- **Live region / status behavior:** la llegada de piezas se **anuncia** con `role=status`/`aria-live=polite`
  y **nunca** mueve el foco. El stage cargando lleva `aria-busy` + label.
- **Color-independent state:** cada punto de color va con su etiqueta de texto.
- **Motion-independent meaning:** cubierto arriba — el estado de una corrida es texto.
- **Intermediate-frame contrast:** `AA preserved` — las animaciones sólo cruzan `opacity` y `transform`;
  ningún frame intermedio cambia el par de colores de un texto. La excepción a vigilar es el **isotipo sobre
  el scrim**, cuyo halo sube a `opacity .72`: hay que medirlo sobre el fondo real, no asumirlo.
- **Error/destructive stability:** los bloques de error son estáticos, con `role=alert`. Nada pulsa ni
  desaparece solo.

## Performance Guardrails

- **Compositor-only properties:** sí, con la excepción declarada de la barra de progreso.
- **Layout reads/writes:** ninguno en el path de animación.
- **Animation scope:** ⚠️ el punto de mayor riesgo del contrato. Un feed largo con muchas corridas activas
  tendría **7 elementos animados permanentemente por card** (isotipo + halo + llama + 4 chispas). La
  animación del isotipo corre **sólo en corridas activas**, que son pocas por definición — pero hay que
  medirlo y considerar pausar el isotipo fuera del viewport con `IntersectionObserver`.
- **Chart/counter constraints:** no hay charts ni contadores animados.
- **Mobile constraints:** aurora y chispas son las primeras candidatas a apagarse si el frame budget no da.

## GVC / Micro Evidence

- **Scenario:** canary de interacción del feed — frames relativos `reposo → hover → acciones visibles`, más
  una pasada con `prefers-reduced-motion` **emulado** (`page.emulateMedia`).
- **Scenario file:** `apps/studio-client/scripts/producer-motion-canary.mjs` (**a crear**).
- **Route:** `http://127.0.0.1:4323/producer/feed`.
- **Asserts obligatorios:** con `reduce` activo, (a) las acciones de la card tienen `opacity: 1` y
  `pointer-events: auto`, (b) el isotipo sigue en el DOM con `animation-name: none`, (c) el texto de progreso
  está presente en los dos modos.
- **Gate mecánico nuevo:** un test que recorra el CSS y exija que toda regla con `animation:` distinta de
  `--duration-none` tenga contraparte en un bloque `prefers-reduced-motion: reduce`. Sin él, la regla de las
  acciones se pierde en el próximo componente que alguien escriba.
