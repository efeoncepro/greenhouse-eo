# TASK-1558 — Globe Share Board Visual Direction

> **Superficie:** `GET /shares/:shareId` de Efeonce Globe — la **única** cara de Globe que ve un cliente
> externo. Repo de implementación: `efeonce-globe` (`apps/studio-client`). Doc gobernante: Greenhouse.
> **ADR:** ADR-014 Slice 1. **Wireframe:** [`../wireframes/TASK-1558-globe-share-board.md`](../wireframes/TASK-1558-globe-share-board.md).
> **Hereda:** el lenguaje visual de Globe ya existente (`producer-ui.ts` + el SSOT de tokens de `TASK-1556`).
> **NO hereda** el `approved-prototype.dc.html` de `TASK-1505`: ése es el target del **Producer**, otra superficie.

## Mode and source

- **Mode:** `repo-native-benchmark`.
- **Durable source:** este documento + los renders de las tres direcciones, producidos con los **valores
  reales** de `apps/studio-client/src/tokens/tokens.ts` y las **fuentes reales** de Globe
  (`Poppins-Bold.ttf`, `Geist-Regular.ttf`, `Geist-SemiBold.ttf`). Ninguna dirección se juzgó en prosa:
  las tres se renderizaron y se miraron a `1440×1000` y `390×844`.
- **Provenance / approval:** producida 2026-07-25 en el loop `greenhouse-ai-design-studio`
  (lanes: `design-studio`, `state-design`, `modern-ui`, `a11y-architect`, `typography-design`,
  `greenhouse-ux-writing`, `motion-design`, `product-design-loop`). El operador delegó la selección
  explícitamente ("define el diseño").
  **Lanes excluidas por frontera, no salteadas:** `greenhouse-product-ui-architect` y
  `greenhouse-vuexy-ui-expert` deciden Composition Shell / primitives / MUI / AXIS de **Greenhouse**, y
  ADR-014 §8 + `TASK-1540` prohíben importar eso dentro de Globe. Fallback registrado según §"Specialist
  lanes" del orquestador.
- **Selected frame/state:** Default (activo resuelto + hechos + 3 comentarios), desktop y mobile.

## Alternatives

Las tres son composiciones **materialmente distintas**, no skins.

### A — "Cine": activo a sangre, hechos sobreimpresos

El activo ocupa todo el viewport con `object-fit: cover`; los hechos y los comentarios viven en un panel
translúcido flotando encima, con viñeta radial para separar el panel del fondo.

- **Rechazada, y por un motivo descalificante, no de gusto: corrompe el artefacto bajo revisión.**
  `cover` **recorta la pieza** y la viñeta **le oscurece el color**. El cliente entra a juzgar encuadre y
  color; una superficie de revisión que altera ambos no es una opción estética peor, es una superficie
  que miente sobre su contenido.
- Agravantes: el panel es una card **sobre la obra** (compite con la composición que viene a mostrar), y
  con 3+ comentarios crece hasta ser media pantalla, o sea termina siendo el layout de B pero tapando la
  pieza.
- Riesgo de template genérico: bajo. No es el problema.

### B — "Lámina montada" (passepartout + riel de lectura) ✅ **ELEGIDA**

El activo se presenta **montado**: completo, sin recortar, centrado sobre el canvas oscuro con un margen
generoso y una sombra que lo despega del fondo. A la derecha un **riel de lectura** —no una card— con
eyebrow, título, los hechos como pares clave/valor separados por **líneas**, y los comentarios como notas
con barra lateral.

- **First-fold reading order:** pieza → título → hechos → comentarios.
- **Jerarquía/acción:** la pieza es el héroe indiscutido; **no hay ninguna acción** salvo Reintentar, que
  sólo existe en el estado degradado. La identidad de Globe/Efeonce es marco, no protagonista.
- **Densidad/profundidad:** media-baja. Profundidad por **una sola** sombra (la de la lámina); el riel no
  tiene superficie propia.
- **Responsive:** transformación explícita a una columna — pieza a sangre arriba con techo `62svh`, riel
  debajo. **No** es el desktop comprimido.
- **Firma:** el **margen** alrededor de la pieza. Es lo que comunica "esto es una obra presentada" y no
  "esto es un archivo adjunto".
- **Riesgo de template genérico:** bajo — el riel de líneas sin cajas es lo contrario del dashboard de
  cards que sale por defecto.

### C — "Ficha de revisión" (documento)

Layout de documento: encabezado con los hechos como chips, la pieza embebida en el flujo como `<figure>`
con caption, y los comentarios como hilo debajo.

- **Rechazada.** Verificado en el render: a `1440×1000` el primer fold son **chips de metadata + el borde
  superior de la imagen**. La pieza deja de ser el héroe y pasa a ilustrar un documento, que contradice de
  frente la jerarquía que el wireframe fija ("el activo es el héroe").
- La fila de chips además **se lee como una barra de filtros**, o sea promete interacción que no existe en
  una superficie read-only.
- Riesgo de template genérico: **alto** — es la anatomía de un post de blog.
- Lo único que hacía mejor (escalar a muchos comentarios) B ya lo resuelve con el riel scrolleable.

## Decision

**Se elige B.** Es la única que sostiene la jerarquía del wireframe sin degradar el artefacto: la pieza se
ve completa y con su color intacto, y la lectura secundaria no le pelea el espacio.

Y hay que decir la parte honesta: **B es la continuidad del layout que ya existe** (stage + panel a dos
columnas), no una invención. Eso es deliberado — `modern-ui` §1: la diferenciación en 2026 sale del craft
dentro de la restricción, no de cambiar de composición. Lo que cambia respecto de hoy son **cuatro
defectos concretos y verificados en la línea base**, no la idea:

| Defecto de hoy (verificado) | Qué hace B |
|---|---|
| La imagen llena el stage borde a borde, sin margen | Passepartout: la pieza se **monta**, con aire y una sombra propia |
| Los tres hechos son **cajas con borde dentro del panel, dentro de la card del main** → card-on-card, `BLOCK` del estándar | Pares clave/valor separados por **líneas**. Cero cajas anidadas |
| Los hechos muestran valores crudos: `changes_requested`, `2026-08-01T18:00:00.000Z` | Copy formateado desde la capa de copy: "Con cambios pedidos", "1 de agosto" |
| **No hay footer**: ni atribución, ni privacidad, ni referencia de soporte | Footer con atribución Efeonce + alcance del enlace + el link de privacidad que **sí existe** |

**Rechazadas:** A — corrompe el artefacto bajo revisión (recorte + viñeta); C — degrada la pieza a
ilustración de documento y su fila de chips promete interacción inexistente.

## ⚠️ Corrección de fidelidad (2026-07-25, al implementar)

Los tres renders de comparación mostraban **datos que el contrato no transporta**, y conviene decirlo
en vez de dejar que la dirección prometa algo que la implementación no puede cumplir:

| Lo que mostraba el render | Lo que existe de verdad |
|---|---|
| Título de pieza: "Campaña primavera · toma 03" | `CreativeShareBoardV1` **no tiene campo de título**. La superficie usa el fallback "Resultado creativo" |
| Autor por comentario: "Camila Ortiz", "Rodrigo Peña" | `comments` es `{ body, createdAt }`. **No hay autor.** Se renderiza fecha + texto |

Ninguno de los dos se implementó inventándolo: poner un nombre que el contrato nunca envió, en la
superficie donde un cliente juzga trabajo, sería fabricar evidencia. Ambos quedan como follow-up
(requieren campo nuevo en la proyección, o sea cambio de contrato, fuera del alcance de esta task).

La decisión de composición **no cambia** por esto: el título sigue siendo el ancla tipográfica del riel
y los comentarios siguen siendo notas con barra lateral. Sólo cambia de qué se llenan.

## Visual thesis

- **First-fold reading order:** pieza montada → título de la pieza → hechos → comentarios.
- **Dominant decision:** el **margen** alrededor de la pieza. Es la única decisión que hay que defender:
  ceder ancho a la nada es lo que convierte un preview en una presentación.
- **Density:** media-baja en el riel; el stage es casi todo aire y obra.
- **Depth model:** **una sola** sombra en toda la página, la de la lámina. El riel se separa con una línea
  de 1px, no con una superficie. Presupuesto de chrome: **una** superficie `contained` en el fold.
- **Typography role:** Poppins Bold sólo para el título de la pieza (un único uso de display por página);
  Geist Regular/SemiBold para todo lo demás; eyebrow en Geist SemiBold con tracking `.14em` y caps —
  **caps sólo en eyebrows**, nunca en texto corrido.
- **Color role:** el canvas navy es marco. **El único color saturado de la página lo aporta la pieza.**
  `--action` queda para el foco y el punto del chip "Sólo lectura"; `--warning`/`--success` sólo como
  punto de 4,5px junto al estado de revisión, **siempre acompañado del label** (color nunca es el único
  portador).
- **Signature details:** (1) el passepartout; (2) el riel de líneas sin cajas; (3) el punto de estado de
  revisión como marca mínima; (4) los hechos con `tabular-nums` para que fechas y versiones no bailen.

## Desktop target

`1440×1000`. Dos columnas: stage `minmax(0,1fr)` + riel `minmax(20rem,24rem)`.

- Topbar sticky de `~3.6rem`: isotipo Globe + wordmark + eyebrow "Revisión compartida" a la izquierda;
  chip "Sólo lectura" a la derecha. Borde inferior 1px + `backdrop-filter`.
- Stage con `padding: clamp(1.25rem, 2.6vw, 2.5rem)`, `place-items: center`, halo radial suave de
  `--action` al 9%. La pieza: `max-height: calc(100svh - 8.5rem)`, `object-fit: contain`
  (**nunca `cover`** — ver dirección A), `--radius-sm`, sombra + hairline.
- Riel: título Poppins `1.55rem/1.2`, lede `.85rem/1.6` con `max-width: 34ch` (medida dentro de 45-75ch
  efectivo), hechos con separadores `--line`, comentarios con barra `--line-strong` de 2px.
- Footer de `~3.4rem` con borde superior.

## Mobile target

`390×844`. Una columna, **transformación real** vía `@media (max-width: 60rem)`:

- Pieza **primero**, a sangre (`width: 100%`, `border-radius: 0`), con **techo `62svh`** y `contain`. El
  techo es la decisión: sin él la pieza se come el viewport y el riel queda invisible detrás de un scroll
  que nadie sabe que existe.
- Riel debajo, `border-top` en vez de `border-left`, padding `1.5rem clamp(1.1rem,4vw,1.5rem) 1.75rem`.
- Título baja a `1.4rem`. `scrollWidth <= clientWidth` verificado.

> **Corregido en el loop.** La primera versión de B **no** declaraba este media query: el grid colapsó,
> el riel se comió el ancho y **la pieza no se veía en mobile**. Se detectó mirando la captura, no
> leyendo el CSS, y es la razón por la que el checkpoint de first fold existe.

## Token mapping

Intención → token. **Cero HEX, cero px de color, cero duración literal** en la implementación.

| Cue | Token | Deviation |
|---|---|---|
| Fondo de página | `--canvas` + los dos radiales de `producer-ui.ts` | — |
| Halo del stage | `--action` al 9% vía `color-mix`/rgba del SSOT | — |
| Superficie del riel | **ninguna** — el riel no tiene fondo | Deliberado: evita card-on-card |
| Separador riel/stage y filas de hechos | `--line` | Adopta el canónico `.12`; **hoy el share board tiene `.18`** → resuelve `LEGACY_TOKEN_DRIFT.line` |
| Barra de comentario, borde del chip | `--line-strong` | — |
| Texto primario / secundario / terciario | `--text` / `--muted` / `--faint` | — |
| Acento (foco, punto del chip) | `--action` | Adopta `--action`; **hoy el share board lo llama `--blue`** → resuelve `LEGACY_TOKEN_DRIFT.action` |
| Punto de "Sólo lectura" | `--action` | — |
| Punto de estado de revisión | `--warning` (cambios pedidos) / `--success` (aprobado) | Siempre con label; nunca color solo |
| Anillo de foco | `--focus` | Ya es el canónico en esta superficie |
| Radio de la lámina / del chip | `--radius-sm` / `999px` | — |
| Sombra de la lámina | `--shadow` como base, reforzada | Única sombra de la página |
| Fade del stage | `--duration-short` + `--ease-enter` | — |
| Tipografía display / body | **`--font-display` / `--font-body` 🆕** | **No existen en el SSOT.** Hoy Poppins/Geist están literales en `producer-ui.ts`. Esta task los sube al SSOT; el gate de color/motion no cubre tipografía y ése es el hueco que cierran |

Superficie que **adopta** el canónico y por lo tanto retira su entrada del ledger de drift:
`LEGACY_TOKEN_DRIFT.surface['public-share-ui.ts']` (`.62` → `.5`) — pero **en B el riel no tiene
superficie**, así que el token deja de usarse en esta pantalla en vez de cambiar de valor. Se declara
igual, porque el ledger mide port, no uso.

## Anti-patterns (BLOCK)

- **`object-fit: cover` sobre el activo.** Recortar la obra que el cliente vino a revisar. Siempre `contain`.
- **Viñeta, filtro, overlay o tinte sobre la pieza.** Altera el color bajo revisión.
- **Card-on-card**: los hechos dentro de una caja dentro del panel dentro de la card. Es el defecto de hoy.
- **Más de una superficie `contained` en el fold** o más de una sombra en la página.
- **Chips de metadata en fila** como encabezado (dirección C): prometen filtros en una superficie read-only.
- **Valores crudos visibles**: `changes_requested`, ISO 8601, slug del proveedor, `house`, costo, margen.
- **El rótulo `Producer`** o cualquier nomenclatura interna.
- **Mobile como desktop comprimido**, o pieza sin techo de altura que esconde el riel.
- **Un link que devuelva JSON** a un browser.
- **Caps en texto corrido**; caps sólo en eyebrows y con tracking.
- **Color como único portador** del estado de revisión.
- **Spinner de página** en vez de skeleton dimensionado.
- **Botón Reintentar en un estado no retryable** — sólo `dependency_unavailable` lo tiene.

## Acceptance signature

- Promedio ≥4,5/5; jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template
  genérico cada uno ≥4,5/5; ninguna dimensión <4/5.
- Evidencia desktop `1440×1000` + mobile `390×844` + `prefers-reduced-motion: reduce` **mirada**.
- `scrollWidth <= clientWidth` en ambos viewports.
- Assertion de no-fuga sobre el DOM: sin slug de proveedor, sin `house`, sin costo, sin margen, sin
  `Producer`, sin ISO 8601 crudo, sin enum crudo.
- Contraste ≥4,5:1 en texto y ≥3:1 en el anillo de foco, verificado sobre el fondo renderizado.
- Scorecard: `docs/ui/reviews/TASK-1558-globe-share-board.scorecard.json`.
