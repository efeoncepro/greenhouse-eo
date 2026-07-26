# TASK-1552 — Composer del Producer de Globe · Motion Contract

> **Migrado 2026-07-25** desde `TASK-1564`, retirada por duplicación. El dueño del composer es `TASK-1552`.


## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1552 — Globe Producer Composer Focused Creation`
- Related wireframe: `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`
- Related flow: `docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`
- Motion type: `microinteraction` + `transition-system`
- Primary primitive / library: **CSS**
- Copy source: `apps/studio-client/src/copy/index.ts` → `producerComposer`
- **Contrato de motion gobernante (SSOT):** [`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`](../../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md)

> Aplicación del contrato compartido a esta superficie. Los valores, las tres capas y el contrato de
> `prefers-reduced-motion` viven en el SSOT — **el isotipo generando se comparte con el feed** y definirlo dos
> veces es cómo dos definiciones del mismo momento de marca divergen.

## Motion Brief

- **Primary user:** operador interno a punto de gastar creditos.
- **Motion intent:** que el composer distinga tres cosas que se parecen y no son iguales: *estoy calculando el
  costo*, *estoy reservando*, *estoy generando*. Sin motion las tres se ven como "el botón no responde".
- **Uncertainty reduced:** «¿el número que veo corresponde a lo que voy a apretar?». El motion del estimado es
  lo que hace visible que un valor quedó viejo.
- **User decision supported:** apretar Generar, o corregir la recipe primero.
- **Non-goals:** no hay motion al cambiar el valor de un campo, ni al abrir la sección de un grupo, ni en el
  contador de créditos. Un número que cuenta hacia arriba en un riel de gasto es decorativo sobre plata.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| **Estimado** | cambio en la recipe | opacidad a atenuado en `--duration-short` + texto `estimateStale` | CSS | **sí** — es el motion más importante de la superficie |
| **Estimado** | llega el nuevo valor | fade a opacidad plena `--duration-short` | CSS | sí |
| **Isotipo generando** | corrida en vuelo | `gBreathe` + `gHalo` (3.2s en fase) + `gFlame` (.85s) + `gSpark` ×4 | `GlobeGeneratingMark` | **sí** — momento de marca, compartido con el feed |
| **Barra de progreso** | `coarseProgress` avanza | `width` `--duration-progress` `linear` | CSS | sí |
| Botón Generar | pendiente | sin spinner: el isotipo ya dice que trabaja; el botón sólo cambia a deshabilitado | CSS | sí |
| Popover de ruta/estilo/voz | abrir | `overlayIn` .2s | CSS | sí |
| Campo | focus | anillo de foco, `--duration-short` | CSS | sí |
| Sección de campos | cambio de capability | **ninguno** — ver Non-goals | — | no |
| Aurora del fondo | montaje | `auroraA`/`auroraB` — vive en el layout, no acá | CSS de página | heredado |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Botón Generar | relleno de acento | más claro | anillo | hundido 1px | — | **deshabilitado + isotipo animado al lado**, sin spinner propio | error como bloque con razón; el botón vuelve a habilitarse sólo si hay estimado vigente |
| Estimado | valor pleno | — | — | — | — | **atenuado + `estimateStale`** | `blockedNoEstimate` con `role=alert` |
| Selector de ruta | valor actual | borde más claro | anillo + `aria-expanded` | — | opción con check | — | opción no lista: deshabilitada con `routeNotReady` |
| Prompt | placeholder | — | anillo + borde de acento | — | — | conserva el texto ante cualquier error | — |
| Mejorar | secundario | más claro | anillo | — | — | deshabilitado mientras `enhance` viaja | resultado reemplaza el prompt; el original queda deshacible |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Estimado → no vigente | `opacity 1` | `opacity .45` | `--duration-short` / `--ease-enter` | **sincrónico con el cambio de campo**, sin esperar el debounce | `--duration-none`; el estado atenuado **se conserva** |
| Estimado → vigente | `opacity .45` | `opacity 1` | `--duration-short` / `--ease-enter` | — | `--duration-none` |
| Isotipo generando | ver SSOT §2 | — | `--duration-breathe` / `--duration-flame` | infinite, 4 animaciones en fase | **`animation: none`, elemento VISIBLE** |
| Barra de progreso | `width` anterior | nuevo | `--duration-progress` / `--ease-linear` | `linear` porque representa avance real | sin transición; el valor salta |
| Popover | `opacity 0` | `opacity 1` | `--duration-overlay` / `--ease-enter` | `both` | `--duration-none` |
| Anillo de foco | — | visible | `--duration-short` | nunca se omite | instantáneo |

⚠️ **La atenuación del estimado NO se apaga bajo reduced-motion.** La transición se acorta, pero el estado
atenuado se mantiene, porque **no es decoración: es información sobre plata**. Es el caso exacto de la regla
del SSOT «el motion no puede ser el único portador» — acá el portador redundante es el texto `estimateStale`,
y los dos se conservan.

## Primitive & Token Mapping

- **Primitive:** `GlobeGeneratingMark` — **ya existe y ya se consume** (verificado 2026-07-25:
  `apps/studio-client/src/primitives/GlobeGeneratingMark.tsx` + `globe-generating-mark.css` con sus 4
  `@keyframes`, importada por `ProducerComposer.tsx` y por `ProducerFeed.tsx`). No hay deuda de isotipo estático
  y **nunca se implementa una segunda versión**. Su contrato es de `TASK-1523` (dueña del SSOT de motion);
  `TASK-1565`, que este documento citaba como su origen, quedó **retirada** el 2026-07-25.
- **Imports allowed:** CSS del módulo, `tokens.ts`, primitives del payload cliente.
- **Imports forbidden:** cualquier cosa de Greenhouse (`@core`, MUI, AXIS), librerías de animación.
- **Timing tokens:** `--duration-none|short|overlay|breathe|flame|progress`.
- **Easing tokens:** `--ease-enter`, `--ease-linear`, `--ease-pulse`.
- **Layout animation:** ninguna. El cambio del set de campos por capability es un salto, a propósito: animar
  la altura de un formulario que cambia de contenido produce un salto de layout con costo y sin información.
- **CSS properties:** `opacity`, `transform`, `border-color`, `box-shadow`. `width` sólo en la barra de
  progreso, con `contain`.
- **GSAP/Lottie justification:** **no se usan.**

## Reduced Motion Contract

- **Detection:** `@media (prefers-reduced-motion: reduce)`. Sin detección en JS.
- **Replacement behavior:** ver SSOT §4.
- **Meaning preserved:** los tres estados que el motion distingue (calculando / reservando / generando) tienen
  **texto propio**: `estimateStale`, el pendiente del botón, y el progreso textual de la corrida.
- **Animations removed:** las 4 del isotipo (la animación, no el elemento), la transición de la barra de
  progreso, la entrada de popovers.
- **Animations retained:** ninguna como movimiento. **El estado atenuado del estimado sí se conserva.**
- ⚠️ El composer no tiene affordances revelados por hover, así que la regla de las acciones de card no aplica
  acá. Pero **sí aplica la inversa**: ninguna opción deshabilitada puede quedar sin su `title` de razón, porque
  con motion apagado el único canal que queda es el texto.

## Accessibility & Feedback

- **Focus visibility:** anillo en todo control; nunca se omite ni se acorta a cero.
- **Keyboard activation:** `Cmd/Ctrl+Enter` ejecuta; `Esc` cierra popovers y **no** cancela una corrida.
- **Live region / status behavior:** el estimado vive en una live region `polite` — cambia solo y el usuario
  tiene que enterarse sin perder el foco. El resultado de la ejecución también.
- **Color-independent state:** el estimado no vigente se marca por **opacidad + texto**, nunca por color solo.
- **Motion-independent meaning:** cubierto arriba.
- **Intermediate-frame contrast:** ⚠️ el punto a medir. El estimado atenuado a `opacity .45` sobre el riel
  **puede caer bajo 4.5:1**, y es texto informativo sobre gasto. Hay que medirlo con **muestreo de píxeles**;
  axe reporta `incomplete` sobre gradientes y no sirve acá. Si no llega, se sube la opacidad y se compensa la
  distinción con el texto — nunca al revés.
- **Error/destructive stability:** los bloques de error son estáticos con `role=alert`. Nada pulsa.

## Performance Guardrails

- **Compositor-only properties:** sí, con la excepción declarada.
- **Layout reads/writes:** ninguno en el path de animación.
- **Animation scope:** **un solo** isotipo animado en el composer (7 elementos), contra potencialmente varios
  en el feed. Acá el costo está acotado por construcción.
- **Chart/counter constraints:** no hay contadores animados. Deliberado: ver Non-goals.
- **Mobile constraints:** el isotipo se mantiene; la aurora es la primera en apagarse si el frame budget no da.

## GVC / Micro Evidence

- **Scenario:** `apps/studio-client/scripts/producer-composer-canary.mjs` — frames en `estimado-vigente`,
  `estimado-no-vigente`, `ejecutando`, más la pasada con `prefers-reduced-motion` emulado. Sigue el patrón de
  `producer-feed-canary.mjs` / `producer-motion-canary.mjs`, con `CANARY_URL` override.
- **Route:** `http://127.0.0.1:4326/producer` (el composer **no tiene ruta propia**: vive dentro de
  `ProducerWorkspace` — corregido 2026-07-25 contra `main.tsx`).
- **Asserts obligatorios:**
  1. al cambiar un campo, el estimado queda atenuado **antes** de que llegue el nuevo valor;
  2. con `reduce` activo, el estimado atenuado **sigue atenuado** y `estimateStale` está presente;
  3. con `reduce` activo, el isotipo sigue en el DOM con `animation-name: none`;
  4. el contraste del estimado atenuado se mide por muestreo de píxeles y se registra el valor, no un `pass`.
