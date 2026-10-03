# TASK-1996 — Wireframe: tarjetas de cifra con isotipo de canal y glifos Trazo en PDF, deck y Think

Creado 2026-10-03. Describe cómo dibujan los catálogos `insights-report` (A4) e `insights-deck` (16:9) y la vista web
de Think (`efeonce-think`) la tarjeta de cifra cuando el plan trae canal, contexto o glifo (contrato de TASK-1990,
espejo de `efeonce.insights-stat-card` 0.2.0 de AXIS). La anatomía base de la tarjeta (nombre, valor, unidad,
variación, «vs {valor} en {período}», estimado, «menor es mejor», sin dato) **no cambia**: es la aprobada en
TASK-1975. Este wireframe sólo agrega el isotipo del canal, la línea de contexto, el canal del título del tablero y el
cambio de iconografía de Tabler a Trazo de La órbita.

- Visual direction mode: source-led
- **Dirección aprobada:** el operador aprobó el 2026-10-03 las tarjetas con isotipo de canal y su inventario en el
  canvas <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>, tableros `Premium-Cifras-Canal` (A4 794×1123),
  `Deck-Cifras-Canal` (1280×720), `Cifras-Canal-Norma` (reglas y estados) y `Cifras-Canal-Inventario` (qué cifra lleva
  qué ícono). Las hojas todavía **no** están exportadas al repo: exportarlas a
  `docs/ui/visual-directions/TASK-1996-efeonce-insights-channel-stat-card/paginas/` es el Slice 1 de la task. Hasta
  entonces `UI ready` queda en `no`.
- **Contrato de diseño en AXIS** (repo hermano, commits locales sin publicar): `beb7f25` (contrato 0.2.0, tokens
  `efeonceInsights.statCard.channel`, Lab con tableros en papel y navy y el inventario,
  `examples/insights-stat-card/a4-channels-intent.json` y `a4-channels-manifest.json`), `4f6f2db`
  (`@efeoncepro/axis-brand-assets` 0.4.15, `AXIS_PLATFORM_ASSETS`, 20 isotipos con sello sha256) y `a7d874a` (glifos
  Trazo `competencia`, `keyword`, `enlace`, `velocidad`, `pausa`).
- **Base aprobada de la tarjeta:** [`TASK-1975-efeonce-insights-stat-card-direction.md`](../visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md)
  y la sección «A4 — Tarjeta de cifra» de [`TASK-1975-efeonce-insights-new-figure-pages.md`](TASK-1975-efeonce-insights-new-figure-pages.md).
- **Criterio que gobierna qué figura sale:** [`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`](../../architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md)
  §5.1, §5.2 y §11 (vigente tras TASK-1990).
- **Master flow del programa:** [`EPIC-045-efeonce-insights-UI-FLOW.md`](../flows/EPIC-045-efeonce-insights-UI-FLOW.md).
  No agrega nodos ni rutas: cambia bloques dentro de `report_pdf`, `deck_pdf` (S3) y de la vista web compartida S6
  (`think.efeoncepro.com/insights/r/<token>`).

## Desktop Target

El «desktop» de los PDF es el documento a tamaño físico (A4 794×1123 px, lámina 1280×720 px a 96 dpi). En Think, la
vista web a 1440 px.

### A4 — tablero con canales mezclados (`report-figure-stat`, tablero `Premium-Cifras-Canal`)

Ejemplo del canvas: capítulo «02 · Visibilidad en motores de respuesta», conclusión «La marca aparece en el 33,3 % de
las respuestas de cada motor», retícula 2×2 de ChatGPT, Gemini, AI Overview y Perplexity.

| Región | Contenido | Regla |
|---|---|---|
| Cabecera corrida, pestaña, antetítulo | como la tarjeta aprobada («Cifras del período») | sin cambio |
| Conclusión + lead | ancho completo | sin cambio |
| Título del tablero | «Mención de la marca por motor» + conteo «4 CIFRAS» a la derecha | sin isotipo: el tablero mezcla canales |
| Celda: nombre | disco blanco de 30 px con el isotipo al 60 % (18 px) y filete fino `rule`, seguido del **nombre del canal** («ChatGPT») | `label = channel.name`; nunca el glifo Trazo en la misma celda |
| Celda: valor | cifra grande Poppins 700 (~52 px) en tinta del tema + unidad | sin cambio |
| Celda: contexto | «de las respuestas menciona la marca» (12 px, tinta suave) | sólo con canal |
| Celda: variación | píldora y «vs {valor} en {período}», o «Primer período medido» | sin cambio |
| Procedencia | Unidad · Fuente («Efeonce AI Visibility Grader») | sin cambio |

### A4 — tablero de una plataforma (Search Console, Greenhouse)

| Región | Contenido | Regla |
|---|---|---|
| Título del tablero | isotipo del canal **una vez** antes del título («Search Console y posiciones · septiembre contra agosto»); con dos fuentes, Search Console y Google Analytics en ese orden | `channel` del tablero; ninguna celda repite isotipo |
| Celda: nombre | glifo Trazo de la métrica (14–15 px, trazo `labelMuted`) + nombre de la métrica | `metricIcon`; sin `context` |
| Resto | anatomía aprobada | sin cambio |

Ejemplos del inventario: clics, impresiones, CTR y posición con Search Console en el título; entregas a tiempo,
primera correcta, rondas, piezas, ciclo, throughput, velocidad, piezas trabadas, atrasos y SLO con Greenhouse en el
título; visitas orgánicas y con interacción con Search Console y Google Analytics.

### A4 — cifras sin plataforma

Keywords nuevas/suben/bajan/se pierden (`keyword`), competidores (`competencia`, sólo si TASK-1992 lo habilita),
enlaces y autoridad (`enlace`), salud técnica y visibilidad por URL (`web` o el que fije TASK-1990): glifo Trazo por
celda, sin canal en el título.

### Deck 16:9 (`insights-figure-stat`, tablero `Deck-Cifras-Canal`)

Columna izquierda de 372 px sin cifra principal (antetítulo, conclusión 34 px, filete teal, lead) y panel translúcido
de 428 px con título del tablero, «FUENTE» a la derecha y retícula hasta 3×2. Diferencias con el A4:

| Pieza | Deck |
|---|---|
| Disco | blanco de 28 px, isotipo de 16 px, **sin filete** sobre navy |
| Nombre del canal | blanco, Poppins 600 14 px |
| Valor | teal sobre navy, ~38 px |
| Contexto | «menciona la marca · primer período medido» en una línea, tinta suave |

### Think — vista web (S6)

`StatCard.astro` (efeonce-think) dibuja lo mismo desde el modelo web 1.5: disco de 30 px con el isotipo y el nombre
del canal en la celda, o el glifo Trazo; el canal del tablero junto al título. El isotipo se sirve como archivo
estático de Think copiado de `@efeoncepro/axis-brand-assets`, nunca un SVG dibujado a mano. La animación de la cifra
(TASK-1975 motion) no cambia y el disco no anima.

### Visitas desde asistentes (GA4) como tarjetas

Alternativa a la dona cuando el plan la elige (regla de TASK-1990): una celda por asistente con su isotipo (ChatGPT,
Gemini, Claude, Perplexity) y la cifra de visitas; «Otros asistentes» sin isotipo (sólo nombre). Google Analytics no
va en el título en este tablero porque las celdas ya llevan canal (`channel-in-title-and-cell`).

## Mobile Target

Los PDF son de tamaño fijo; la lámina 16:9 es su versión compacta. El mobile real es Think a **390 px**:

- Retícula de una columna; disco de 30 px a la izquierda del nombre del canal; el nombre no se trunca (máximo 3
  palabras por contrato).
- Contexto debajo del valor, en hasta dos líneas.
- Canal del título: isotipo antes del título; con dos fuentes, los dos discos en fila antes del texto.
- Sin scroll horizontal de página a 390 px.

## Action Hierarchy

Documento de lectura, sin acciones. Orden en una celda con canal: isotipo → nombre del canal → valor → contexto →
variación. En un tablero de una plataforma: isotipo del título → título → celdas (glifo → nombre → valor → variación).

## Visual Fidelity Mapping

| Elemento | Token / recurso | Nota |
|---|---|---|
| Disco del isotipo | `efeonceInsights.statCard.channel.disc.px` (a4 30, deck 28, web 30), `isotypeRatio` 0.6, `fill` | valores de AXIS `@efeoncepro/axis-tokens` 0.3.42; nunca px literales en la plantilla |
| Filete del disco | `hairlineOnPaper: rule`, `hairlineOnNavy: false` | rol `rule` del catálogo |
| Isotipos | `AXIS_PLATFORM_ASSETS` de `@efeoncepro/axis-brand-assets` 0.4.15 (`platformIsotypeFor(channelId)`), con sello sha256 | copiados al catálogo por script con verificación del sello; AI Overview usa la variante `color` (la lupa con el degradado), no la G de Google |
| Glifos Trazo | `STROKE_GLYPHS` de `@efeoncepro/axis-graphic-line` (versión que publique los glifos D30) | reemplazan las rutas Tabler inline del `icon-set` (`FIGURE_ICON_KEYS`) |
| Nombre del canal | rol de nombre de la tarjeta aprobada | igual que el nombre de métrica |
| Contexto | rol de texto secundario de la tarjeta aprobada | 12 px en A4, 12 px en deck |
| Variación, valor, unidad | sin cambio (TASK-1975) | |

## Copy Ledger

Copy en `src/lib/copy/insights.ts` (`GH_INSIGHTS`), validado con `greenhouse-ux-writing`. El contexto viene del plan
(TASK-1990/1991/1992/1994); el catálogo no escribe texto de contenido.

| Uso | Texto (ejemplos aprobados en el canvas) |
|---|---|
| Contexto de mención | «de las respuestas menciona la marca» |
| Contexto de citas | «citas con enlace al sitio» |
| Contexto de tono | «de las respuestas en buen tono» |
| Contexto de Share of Voice | «de las menciones de la categoría» |
| Asistente sin isotipo | «Otros asistentes» |
| Primer período | «Primer período medido» (sin cambio) |

## State Copy

| Estado | Qué se ve | Recuperación |
|---|---|---|
| ready | celda con isotipo o glifo según el contrato | — |
| loading | no aplica (documento compuesto; Think renderiza en el servidor) | — |
| empty | sin cifras, el tablero no se emite (como hoy) | el planner no lo elige |
| partial | canal sin isotipo conocido: sólo el nombre, sin disco | se suma el isotipo en AXIS y luego en TASK-1990 |
| error | plan que viola una regla de 0.2.0 (canal y glifo juntos, canal en título y celda, nombre distinto del canal): el mapper rechaza con causa | se corrige el plan; nunca se dibuja a medias |
| denied | permisos de la edición y del enlace, sin cambio | — |
| sin dato | «—» y «Sin dato en {período}» con el isotipo igual | sin cambio |

## Accessibility Contract

- El isotipo es decorativo (`alt=""`): el nombre del canal está en el texto de la celda.
- La celda conserva la lista de definiciones de Think (`<dl>`): `<dt>` = nombre del canal, `<dd>` = valor, contexto y
  variación leída en palabras.
- Contraste: texto ≥ 4,5:1 y marca gráfica ≥ 3:1 sobre su fondo (reglas `text-4.5-on-ground` y
  `graphic-mark-3-on-ground` del contrato); el disco blanco garantiza el contraste del isotipo en navy.
- Prueba en gris de cada página nueva en el dossier.

## Implementation Mapping

- Isotipos: script de sincronización desde `@efeoncepro/axis-brand-assets` hacia
  `src/lib/artifact-composer/catalogs/insights-report/assets/channels/` y `insights-deck/assets/channels/` con
  verificación de `PLATFORM_ASSET_SEALS`; `CHANNEL_ISOTYPES` en
  `src/lib/artifact-composer/catalogs/insights-shared/channels.ts` pasa a las 19 plataformas y
  `google_ai_overview` apunta a la lupa en color.
- Plantillas: `report-figure-stat.html` e `insights-figure-stat.html` con la pieza `channel-isotype-disc`,
  `channel-name`, `channel-context-line` y `title-channel-isotype`; el `icon-set` deja las rutas Tabler y recibe el glifo
  Trazo resuelto por hook.
- Hooks y mapper: `src/lib/efeonce-insights/render/figure-slots.ts` (`buildStatSlides`) lee `channel`, `context`,
  `metricIcon` y el canal del tablero desde `statItemView`; se retira `METRIC_ICON`. `FIGURE_ICON_KEYS` en
  `insights-shared/editorial-resolvers.ts` pasa a claves Trazo.
- Paquetes: `@efeoncepro/axis-brand-assets` 0.4.10 → 0.4.15, `@efeoncepro/axis-graphic-line` 0.11.0 → versión con
  D30, `@efeoncepro/axis-tokens` 0.3.41 → 0.3.42 y `@efeoncepro/axis-ui-contracts` 0.3.40 → 0.3.42 en `package.json`.
- Think (`efeonce-think`): `src/components/insights/StatCard.astro`, tipos del modelo 1.5 en `src/lib/insights.ts`,
  isotipos copiados del paquete, estilos en `src/styles/insights.css`, fixtures y `tests/insights.test.ts`.
- Fidelidad: fixtures nuevos en `scripts/insights/canvas-fixtures/{report,deck}/` con los datos de
  `Premium-Cifras-Canal` y `Deck-Cifras-Canal`.

## GVC Scenario Plan

- Quality profile: premium
- PDF (sin ruta de portal):
  - `pnpm insights:canvas-fidelity --only=Cifras-Canal` contra las hojas exportadas en el Slice 1, ≤ 1 %, también en
    gris.
  - `pnpm composer:visual-gate --catalog=insights`: los frames de la tarjeta cambian por el cambio de iconografía
    (Tabler → Trazo); el rebaseline se declara en `BASELINE_DELTAS.md` en el mismo commit.
  - `assertSlideFitsCanvas` en cada página y lámina.
  - Vista previa real con `scripts/insights/preview-edition.ts --editorial-v2` de Berel (motores, búsqueda) y Sky
    (producción).
- Think: `scripts/capture-insights-report.mjs` a 1440 y 390 sobre fixtures 1.5 y sobre el modelo real servido por
  staging; `scrollWidth <= innerWidth` a 390; `pnpm audit:insights-a11y`.
- Review dossier: `docs/ui/reviews/TASK-1996-efeonce-insights-channel-stat-card-render/README.md` con hojas lado a lado
  (color y gris), capturas de Think y el antes/después de la iconografía.
- Baseline decision / surface ID: frames `templates-insights-report/ReportFigureStatPage` e
  `templates-insights-deck/InsightsFigureStatSlide` rebaselined; frames nuevos con canal mezclado y con canal en el
  título.

## Design Decision Log

- Decision: el isotipo oficial en disco blanco reemplaza al glifo cuando la cifra es de una plataforma; va por celda
  si el tablero mezcla canales y una vez en el título si es de una plataforma (aprobado 2026-10-03, AXIS 0.2.0).
- Decision: AI Overview usa la lupa en color de AXIS, no la G de Google que hoy usa `channels.ts`.
- Decision: la iconografía de las cifras pasa de rutas Tabler inline a glifos Trazo de La órbita; cambia píxeles de
  frames existentes y se rebaselina con declaración.
- Decision: las visitas por asistente pueden ir como tarjetas con canal en vez de dona; lo decide el plan.
- Alternatives considered: isotipo en cada celda siempre (rechazado: repetir Search Console 4 veces no dice nada);
  isotipo y glifo juntos (rechazado por el contrato); logos de competidores (rechazado: no existen como asset oficial).
- Why this pattern: el canal se lee antes que el nombre cuando el tablero mezcla fuentes; con una fuente, el título lo
  dice una vez.
- Reuse / extend / new primitive: `extend` de la plantilla de tarjeta de TASK-1975.
- Open risks: publicar AXIS es requisito; un isotipo que no pase el sello rompe el script de sincronización (falla
  cerrada, deseada).
