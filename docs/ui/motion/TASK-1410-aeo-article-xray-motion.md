# TASK-1410 — Acoplamiento artículo ↔ capa de máquina (Radiografía AEO) Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1410 — Radiografía AEO: demo reutilizable artículo + capa AEO visible`
- Related wireframe: `docs/ui/wireframes/TASK-1410-aeo-article-xray.md`
- Related flow: `none` — la pieza es **una sola página**. No coordina sidecar, drawer, modal, popover ni navegación entre rutas. `Flow: none` es una decisión declarada, no un olvido.
- Motion type: `microinteraction`
- Primary primitive / library: **CSS** (transiciones) + una island React mínima (`XrayCoupling`) que solo maneja *qué está acoplado*. **NO GSAP**, aunque el repo lo tiene instalado — ver justificación abajo.
- Copy source: `payload.ui.*` (repo `efeonce-think`; no existe `src/lib/copy` ahí)

## Motion Brief

- Primary user: evaluador de un comité de licitación, escéptico, probablemente no técnico, leyendo un enlace.
- **Motion intent: probar una correspondencia.** El movimiento acá no decora ni deleita: **es el argumento**. La tesis de la pieza es *"cada dato que lee una máquina corresponde a algo que está en la página"*, y el acoplamiento es lo que convierte esa frase en algo que el evaluador **ve con sus ojos** en vez de tener que creernos.
- Uncertainty reduced: *"¿el JSON ese que muestran tiene algo que ver con el artículo, o lo pegaron al lado?"* El resaltado sincronizado responde eso sin una sola palabra.
- User decision supported: si Efeonce realmente opera la capa técnica o solo la nombra en la propuesta.
- Non-goals:
  - **Cero motion decorativo.** Nada de *scroll reveals*, parallax, entradas escalonadas, contadores animados ni partículas. Una pieza que argumenta rigor técnico y llega envuelta en animaciones de agencia se desmiente sola.
  - **Cero transición de página.** No hay `<ClientRouter />`.
  - **Ninguna animación puede ser el único portador de significado** (ver contrato de reduced motion).

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Bloque acoplable del artículo (H2, imagen, tabla, FAQ, cápsula de respuesta, enlaces internos) | `hover`, `focus-visible`, `click`/`Enter` | Se marca como activo: `outline` en color de acento + fondo tenue. Transición 120 ms. | CSS `transition` | **Sí** — es el argumento |
| Nodo contraparte en el panel de máquina | Consecuencia del anterior (estado en la island) | Se resalta igual (mismo tratamiento visual, para que la correspondencia sea obvia) + se expande si estaba colapsado + entra al viewport del panel. | CSS `transition` + `scrollIntoView` | **Sí** |
| Fila del panel de evidencia | Igual, cuando el bloque tiene evidencia asociada | Mismo resaltado. | CSS | No (solo si el bloque tiene evidencia) |
| Nodo de JSON-LD colapsado | Click en su encabezado, o acoplamiento entrante | Expande/colapsa. Usa `<details>`/`<summary>` nativo. | HTML nativo | Sí |
| **Momento héroe** (estado inicial) | Carga de página | El acoplamiento FAQ ya viene **activo y pintado en el HTML servido**. **No se anima al entrar.** | Ninguno (estado inicial en el markup) | **Sí — crítico** |

**El momento héroe no se anima, y esa es la decisión.** Es el frame que se captura para la lámina del deck. Si el estado destacado *entrara* con una animación, la captura podría tomarse a mitad de camino y salir con el resaltado a medio opacar. Además, animarlo al cargar significaría que el HTML servido llega "apagado" — y entonces un crawler, o un evaluador con JS bloqueado, vería la pieza sin su argumento. **El estado héroe se sirve pintado desde el HTML.** La island solo lo *toma* al hidratar; no lo crea.

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Bloque acoplable del artículo | Sin outline, fondo transparente. Cursor `default` salvo `pointer` en los acoplables. | Outline de acento + fondo tenue (120 ms) | **Idéntico a hover** + anillo `:focus-visible` del sistema. El teclado debe producir el mismo efecto que el mouse: si solo funciona con hover, la pieza es inaccesible y además no se puede demostrar en vivo sin mouse. | Sin estado propio (el click solo *fija* el acoplamiento) | Outline + fondo persistentes + `aria-current="true"` | n/a — no hay latencia (todo local) | n/a — no hay operación que falle |
| Nodo del panel de máquina | Colapsado, sin resaltado | Resaltado (si se entra desde el panel, acopla hacia el artículo — la relación es **bidireccional**) | Igual que hover | n/a | Expandido + resaltado + `aria-current="true"` | n/a | n/a |
| Fila de evidencia | Neutra | Resaltada | Igual | n/a | Resaltada | n/a | n/a |

**Regla dura:** `hover` y `focus-visible` producen **exactamente el mismo estado visual**. Cualquier divergencia aquí es un bug, no una decisión de diseño.

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Resaltado de acoplamiento | inactivo | activo | **120 ms**, `ease-out` | `opacity` de una capa `::after` + `outline-color`. Corto a propósito: debe leerse como *"están conectados"*, no como *"algo se está animando"*. | **Sin transición** (0 ms). El resaltado aparece instantáneo. El significado se conserva íntegro. |
| Resaltado de acoplamiento | activo | inactivo | 90 ms, `ease-in` | Igual, a la inversa. Salida más rápida que la entrada. | Sin transición |
| Traer el nodo al viewport del panel | fuera de vista | en vista | `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` | Scrollea **el panel**, nunca la página. | **`behavior: 'auto'`** (salto instantáneo). El nodo igual queda visible. |
| Expandir/colapsar nodo de JSON-LD | colapsado | expandido | 150 ms | `<details>` nativo. | Sin transición; abre instantáneo. |

**Ninguna transición supera los 150 ms.** Es deliberado: esta pieza se demuestra en vivo frente a un comité, y una animación de 400 ms hace que el presentador *espere* a que la interfaz termine. La interfaz debe seguirle el ritmo a la persona, no al revés.

## Primitive & Token Mapping

- Primitive: `XrayCoupling` (island React, `client:idle`). Su **única** responsabilidad es el estado `activeCoupleId`. No anima nada: pinta un `data-couple-active` en el DOM y el CSS hace el resto.
- Imports allowed: React (ya en el repo), CSS scoped de Astro, tokens AXIS como CSS custom properties.
- Imports forbidden:
  - **GSAP** — está en `package.json` de `efeonce-think`, y **no se usa acá**. GSAP existe para coreografías con línea de tiempo; esto es un cambio de estado binario con una transición de 120 ms. Meter GSAP sería cargar una librería de animación para hacer lo que hace `transition: opacity 120ms`. Si un agente futuro lo importa "porque está disponible", está resolviendo un problema que no existe.
  - **Framer/Motion, Lottie, Rive** — no están en el repo y no deben entrar por esta pieza.
  - Cualquier HEX de marca literal (regla dura del overlay de `efeonce-think`: los colores salen de las CSS vars de AXIS).
- Timing tokens: 120 ms (entrada), 90 ms (salida), 150 ms (expandir). Se declaran como CSS custom properties locales de la superficie, no como números mágicos repartidos por los componentes.
- Easing tokens: `ease-out` para entrar, `ease-in` para salir. Sin curvas custom: no hay nada que justifique una.
- Layout animation: **ninguna.** Nada cambia de tamaño ni de posición salvo el `<details>` al expandir. Cero *layout morph*.
- CSS properties: `opacity` (capa `::after`) y `outline-color`. **Nunca** animar `height`, `width`, `top`, `margin` ni `box-shadow` con spread — provocan *layout thrash* y en el panel de schema, que puede tener decenas de nodos, se nota.
- GSAP/Lottie justification: **no aplica — deliberadamente ausente.** Ver arriba.

## Reduced Motion Contract

- Detection: `@media (prefers-reduced-motion: reduce)` en CSS, y `window.matchMedia('(prefers-reduced-motion: reduce)')` en la island para decidir `behavior: 'auto'` en el `scrollIntoView`.
- Replacement behavior: **todas las transiciones a 0 ms; el scroll de acoplamiento pasa de `smooth` a `auto`.** Nada más cambia.
- **Meaning preserved: íntegro.** Y esto es lo importante — el significado de esta pieza **nunca estuvo en el movimiento**, estuvo en la **correspondencia**. Con `reduce`, el evaluador sigue viendo exactamente qué elemento del artículo produce qué dato de máquina; solo lo ve aparecer de golpe en vez de con un desvanecido de 120 ms. **No se pierde un solo bit del argumento.** Si alguna vez el contrato de reduced-motion degradara la comprensión de la pieza, sería señal de que el diseño puso significado en la animación, y habría que rediseñarlo, no ajustar el fallback.
- Animations removed: la transición del resaltado, la transición del `<details>`, el scroll suave.
- Animations retained: ninguna. No queda movimiento.

## Accessibility & Feedback

- Focus visibility: `:focus-visible` con anillo de alto contraste sobre **todos** los bloques acoplables. Los bloques acoplables son `<button>` reales, no `<div onClick>`.
- Keyboard activation: `Tab` recorre los bloques acoplables del artículo en orden de lectura. Recibir foco **acopla** (mismo efecto que hover). `Enter`/`Space` **fija** el acoplamiento (lo deja pegado aunque el foco se mueva), `Escape` lo suelta y vuelve al héroe. Toda la demo se puede conducir sin mouse.
- Live region / status behavior: el panel de máquina lleva `aria-live="polite"` en el contenedor del nodo activo, con un texto de estado corto ("Datos estructurados: FAQPage"). Sin él, un lector de pantalla vería resaltarse algo que nunca se anuncia.
- Color-independent state: el elemento acoplado **no se distingue solo por color**. Lleva `outline` (forma) + cambio de fondo (valor) + `aria-current="true"` (semántica). Un evaluador con daltonismo ve la correspondencia igual.
- Motion-independent meaning: cubierto arriba — el significado vive en la correspondencia, no en el movimiento.
- Error/destructive stability: no aplica. La pieza no tiene acciones destructivas ni operaciones que puedan fallar.

## Performance Guardrails

- Compositor-only properties: el resaltado se hace con `opacity` sobre una capa `::after` posicionada, que sí es compositable. `outline-color` repinta pero sobre un área mínima.
- Layout reads/writes: la island **no mide el DOM**. No hay `getBoundingClientRect` en un `mousemove`. El acoplamiento se resuelve por `data-couple-id`, que es una búsqueda de atributo, no un cálculo geométrico.
- Animation scope: como máximo **dos elementos animan a la vez** (el bloque del artículo y su contraparte). Nunca hay una cascada.
- Chart/counter constraints: **no hay charts ni contadores en esta pieza.** ECharts está en el repo; no se usa acá. Un contador animado en una página que argumenta honestidad de datos sería una contradicción.
- Mobile constraints: en mobile no hay hover. El acoplamiento es por `tap` y produce un scroll (`smooth`, o `auto` con `reduce`) hacia el dato, más un botón "volver al artículo". El resaltado se conserva. No se anima nada extra por ser mobile.

## GVC / Micro Evidence

**GVC no aplica: es la herramienta del portal Greenhouse** (rutas `(dashboard)` autenticadas con agent auth). Esta pieza vive en el repo `efeonce-think`, es pública y sin auth. El equivalente del repo es Playwright vía `scripts/verify-*.mjs` (ya existen dos: `verify-brand-visibility-landing.mjs` y `verify-surround-discovery-landing.mjs`).

- Scenario: acoplamiento artículo ↔ capa de máquina, con teclado y con `reduce`.
- Scenario file: `efeonce-think/scripts/verify-aeo-xray.mjs`
- Route: `/muestras/sky-<slug>` sobre `astro build && astro preview`
- Viewports: `1440×900` y `390×844`
- Required steps:
  1. Cargar y capturar el **estado héroe sin tocar nada** (es el frame de la lámina).
  2. `hover` sobre el bloque de imagen → verificar que su `ImageObject` + su `alt` se resaltan en el panel.
  3. Recorrer con **`Tab`** → verificar que el foco produce el mismo acoplamiento que el hover.
  4. `Escape` → vuelve al héroe.
  5. Repetir con `prefers-reduced-motion: reduce`.
  6. Repetir en 390 px (tap en vez de hover).
- Required captures: `hero-desktop.png`, `couple-image-desktop.png`, `couple-keyboard-focus.png`, `hero-mobile.png`, `reduced-motion.png`
- Required frame labels: el frame héroe se etiqueta explícito — es el que se lleva a la lámina y el que hay que **mirar**, no solo assertar.
- Required `data-capture` markers: no aplican (son del helper de Greenhouse). Se selecciona por `data-testid` y `data-couple-id`.
- **Assertions:**
  - Al enfocar con teclado, el nodo contraparte tiene `aria-current="true"`.
  - Con `reduce`, `getComputedStyle(el).transitionDuration` es `0s` en los elementos acoplables.
  - El acoplamiento activo se distingue por **más que color** (existe `outline-style` distinto de `none`).
  - El scroll del acoplamiento ocurre **dentro del panel**: `document.documentElement.scrollTop` no cambia al acoplar.
- Reduced-motion evidence: `reduced-motion.png` + el assert de `transitionDuration: 0s`.

## Design Decision Log

- **Decision:** el acoplamiento es un **cambio de estado con una transición de 120 ms**, servido con su estado héroe ya pintado en el HTML, manejado por una island mínima y expresado enteramente en CSS.
- **Alternatives considered:**
  1. **Coreografía con GSAP** (líneas que conectan el artículo con el schema, resaltados encadenados). Rechazada: es exactamente el reflejo de agencia que esta pieza tiene que **desmentir**. Una demo que argumenta rigor técnico y llega envuelta en animación se contradice sola, y frente a un comité el efecto es "me están vendiendo", no "me están mostrando".
  2. **Animar la entrada del estado héroe.** Rechazada por dos razones concretas: la captura para la lámina podría tomarse a mitad de la animación, y el HTML servido llegaría sin el argumento pintado (malo para el evaluador con JS bloqueado y para cualquier crawler).
  3. **Solo hover, sin teclado.** Rechazada: rompe accesibilidad y, muy concretamente, **impide demostrar la pieza en vivo sin mouse**.
  4. **Dibujar líneas SVG entre el artículo y su schema.** Tentador y muy demostrativo, pero exige medir geometría en cada scroll/resize (`getBoundingClientRect` en caliente), se rompe con el panel scrolleando por dentro, y en mobile —donde los paneles se apilan— no significa nada. El resaltado sincronizado transmite lo mismo con una fracción del costo y funciona en los dos layouts.
- **Why this pattern:** porque el movimiento acá **es el argumento, no el envoltorio**. Todo lo que no sirva a la correspondencia es ruido — y peor, ruido que le resta credibilidad a la tesis.
- **Reuse / extend / new primitive:** `new`, pero mínima. La island solo mantiene `activeCoupleId`. Deliberadamente **no** nace una "primitive de motion" reutilizable: es una microinteracción de una superficie, y promoverla a sistema sin un segundo consumidor sería abstracción prematura.
- **Open risks:**
  - Un agente futuro puede importar GSAP "porque está en el repo". Por eso queda declarado como **import prohibido**, con la razón.
  - En mobile, el salto por scroll puede desorientar. Mitigado con el botón "volver al artículo"; **hay que probarlo en un teléfono real**, no solo en el emulador de 390 px.
- **Follow-up:** si aparece un segundo consumidor del patrón de acoplamiento (por ejemplo, una versión genérica de la pieza como lead magnet en Think), **entonces** se evalúa promoverlo a primitive. No antes.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved Greenhouse wrappers/primitives.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.


## Delta 2026-07-13 — El acoplamiento pasó de simétrico a asimétrico

Este contrato describía un resaltado **simétrico**: fuente y destino con el mismo tratamiento. **Era el bug.** Si los dos lados gritan igual, el ojo no sabe cuál es la causa y cuál el efecto — el operador lo reportó como *"no sé si mirar a la izquierda o a la derecha"*.

**La regla vigente: la fuente susurra, el destino grita.**

| Elemento | Tratamiento |
|---|---|
| **Fuente** (bajo el cursor) | tinte + barra lateral. **Sin outline** — ya la estás tocando |
| **Destino** (el pago) | outline + **pulso 320ms** + **marca de origen `←`** |
| **Dirección** | **chip `→ N datos`** en el borde derecho de la fuente: apunta a través de la canaleta y dice *cuánto* hay |
| **En reposo** | punto discreto en el borde derecho de cada bloque acoplable. **Antes no había afordancia: nada avisaba que el artículo era interactivo** |
| **Apilado (móvil)** | el chip apunta `↓` y la marca de origen `↑`. Apilado, el dato viene de arriba, no de la izquierda — la flecha dice la verdad |

Sigue siendo **CSS puro + un script mínimo**. GSAP sigue prohibido. El contrato de reduced-motion no cambia: todo a 0ms, y **el significado se conserva íntegro** porque nunca estuvo en el movimiento, estuvo en la correspondencia.
