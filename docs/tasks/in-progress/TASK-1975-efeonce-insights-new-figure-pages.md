# TASK-1975 — Figuras nuevas del informe en PDF, deck y Think

## Delta 2026-10-03 — tono de la variación y animación de la tarjeta (aprobados)

- **Tono por fondo:** tras el análisis de saturación en el canvas, el operador eligió la variante A sobre papel (píldora
  teñida) y la C sobre navy (sin píldora rellena; tono sólo en el triángulo, cifra en tinta suave). En el deck, además, el
  rojo de «empeoró» era idéntico al coral de «oportunidad». **Triángulo de puntas redondeadas en todas las superficies.**
  Implementado en ambos catálogos (`0b0233de3`) y en AXIS local.
- **Animación aprobada:** en el informe Live la cifra recorre del valor anterior al actual y después la variación toma
  su tono. Esto deja de ser `Motion: none`: contrato en
  [`TASK-1975-efeonce-insights-stat-card-motion.md`](../../ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md).
  El modelo web 1.4 suma `parts` y `count` por cifra para que Think anime sin partir ni deducir texto.
- **AXIS (decisión del operador):** tokens `efeonceInsights`, contrato `efeonce.insights-stat-card` y sección del Lab
  viven en AXIS; se quitó la regla «AXIS no publica UI ni contratos de Insights». Commits locales sin push hasta cerrar.

## Delta 2026-10-03 — Slice 1 aprobado

- **Tarjeta de cifra aprobada por el operador** en el canvas
  <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>. La dirección es la retícula de cifras, sin cifra principal en
  el héroe. Hojas a tamaño nativo: `paginas/Premium-Cifras.png` y `paginas/Deck-Cifras.png`. Registro:
  [`TASK-1975-efeonce-insights-stat-card-direction.md`](../../ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md).
- Cambios frente al wireframe: el deck admite 6 cifras (3×2), no 4; el copy de la variación pasa a «vs {valor} en
  {período}»; si la métrica tiene tarjeta, el centro de la dona muestra la participación de la parte principal; y se
  aprobó la norma de tarjetas y gráficos en un capítulo.
- **Tokens aprobados:** el rol nuevo `dataStepOnPaper` / `dataStepOnNavy` (`--axis-ppt-blue-500` /
  `--axis-deck-cyan-700`) colorea el paso «Sumó» y la cuarta parte de waffle y apiladas. El coral de oportunidad en
  papel (2,94:1) queda aceptado con nota.
- **Tonos semánticos en la variación:** mejor en verde, peor en rojo, neutro en gris.
  - ⚠️ **Toca frames existentes del gate visual.** La píldora de TASK-1889 pinta «peor» en gris, igual que «neutro», y
    la regla aprobada lo cambia en todas las figuras. Por eso las plantillas existentes con píldora cambian de píxeles,
    y la frase «ningún frame existente cambia» del GVC scenario plan deja de ser cierta.
  - El rebaseline de esos frames va declarado en `BASELINE_DELTAS.md`, en el mismo commit que el cambio de la píldora.
  - Los tonos nacen como roles en `editorial-roles.json` con valores de AXIS (`status/success-text`,
    `status/error-text`); nunca como literales.
- Lo que el contrato de TASK-1974 debe traer (dirección declarada, nombres cortos, excepción de la cascada, cifras
  agrupadas) quedó como Delta en esa task.
- `UI ready` sigue en `no`: faltan el mapping implementado, el dossier y el scorecard.

## Delta 2026-10-03 — decisiones del operador

- **Tarjeta de cifra:** se diseña y aprueba en un canvas antes de implementarla (Slice 1). Las tres direcciones del
  wireframe son el punto de partida; ninguna está aprobada todavía.
- **Waffle de un cuadro por unidad:** aprobado (8 respuestas = 8 cuadros, no 100 repartidos por porcentaje), en el PDF,
  el deck y Think. Exige **definir los tokens de color de estas figuras** (tono, tipo de fuente y partes de un todo) en
  AXIS antes de dibujarlas: ningún valor escrito a mano; el color del paso «Sumó» de la cascada entra en el mismo trabajo.
- **Mismo release:** TASK-1974 y TASK-1975 salen juntas, con `efeonce-think` desplegado antes o junto con ese release.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1975-efeonce-insights-new-figure-pages.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseño aprobado (Slice 1); implementación pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1974` (tarjeta de cifra en el contrato del plan y del modelo web; evidencia de dona y barras apiladas)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Es el consumidor visible del criterio de selección de gráficos aprobado el 2026-10-03: agrega al informe A4 y al deck
las páginas de **cascada, waffle, dona, barras apiladas y tarjeta de cifra**, las suma a `PDF_FIGURE_FAMILIES` y
dibuja la tarjeta de cifra en Think. Las cuatro familias siguen las hojas aprobadas del canvas de TASK-1889; la
tarjeta de cifra no tiene hoja y se diseña y aprueba en el primer slice, antes de implementarse.

## Why This Task Exists

El criterio ([`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`](../../architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md))
cambia qué figura recibe cada dato: un valor solo pasa a tarjeta de cifra, «qué explica el cambio» a cascada, una
composición de 2–3 partes a dona, un subconjunto del total a barras apiladas y un conteo de pocas categorías a waffle.
TASK-1974 lo implementa en el planificador, pero los catálogos PDF sólo tienen página para barras, barras agrupadas,
línea y bullet (`PDF_FIGURE_FAMILIES` en `render/figure-slots.ts`): los mappers **omiten** las demás familias. Sin
esta task, el informe de Berel perdería en el PDF justamente las figuras que el criterio eligió (cascada, dona,
apiladas, waffle y las cifras), y Think no sabría dibujar la tarjeta de cifra, que no es una de las 15 familias.

Además, el criterio dice que en un waffle **cada cuadro es una unidad**; hoy el PDF (`waffleGeometry`) y Think
(`waffleCells`) reparten siempre 100 celdas por participación, así que las 8 respuestas del tono de Berel se dibujarían
como 100 cuadros.

La cascada en el PDF figuraba como pendiente de TASK-1958/TASK-1902 en la arquitectura (§15, «Pendiente de render»).
**El operador decidió el 2026-10-03 moverla a esta task**: TASK-1975 es su dueña.

## Goal

- Plantillas de cascada, waffle, dona y barras apiladas en ambos catálogos, a ≤ 1 % de sus ocho hojas aprobadas.
- Tarjeta de cifra diseñada en el canvas, aprobada por el operador e implementada en A4, deck y Think.
- `PDF_FIGURE_FAMILIES` y `hasFigurePage` reconocen las cinco figuras; el waffle dibuja un cuadro por unidad en el PDF y
  en Think.
- La vista previa real de septiembre 2026 compone Berel con seis familias distintas más tarjetas, y Sky con una figura
  de bullets de tres metas más la tarjeta de piezas entregadas, sin figuras omitidas del PDF.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (criterio, anatomía de la tarjeta §5.1, reglas
  heredadas §6, caso Berel/Sky §7)
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§14.9 catálogos premium; §15 familias de gráfico y regla
  «una familia nueva en el PDF exige su plantilla y sumarla a `PDF_FIGURE_FAMILIES`»)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (motor del Artifact Composer)
- `docs/operations/runbooks/composer-visual-gate.md`
- `.claude/rules/tenders.md` y `.claude/rules/efeonce-insights.md` (auto-load)

Reglas obligatorias:

- Ningún HEX, px de color ni familia tipográfica literal en las plantillas: roles del pack `axis` (extensión
  `editorial`). Un rol que falte (el paso «Sumó» de la cascada) nace en `brand-packs/axis/editorial-roles.json` con
  valor del SSOT de AXIS, nunca como literal.
- La geometría sale de las cifras impresas con la geometría pura del motor (`waterfallGeometry`, `sliceGeometry`,
  `barGeometry` y una función nueva de waffle por unidad); nada se dibuja a mano.
- Nunca truncar una cifra ni un nombre: si no cabe, el mapper rechaza con causa (`InsightsRenderRejectedError`).
- Barras siempre desde 0; nunca torta ni dona con más de 3 porciones; nunca el color como única codificación (reglas
  heredadas de `dataviz-design`).
- Cifras derivadas sólo las declaradas: % de la meta (existe), participación de una parte, total de una pila y
  participación del segmento base. Nunca una resta para producir una parte.
- El gate visual scoped (`--catalog=insights`) se congela junto a su delta en `BASELINE_DELTAS.md`, en el mismo commit.
- Think no deduce contenido: toma nombres, notas, períodos y variaciones del modelo web (modelo 1.3); sólo dibuja.

## Normative Docs

- `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md` y sus hojas en
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/`
- `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md` (proceso de fidelidad y excepciones)
- `docs/ui/wireframes/TASK-1902-efeonce-insights-gauge-heatmap-pages.md` (modelo de anatomía para familias nuevas)
- `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md` (esta task no agrega nodos)
- TASK-1974 (`Criterio de figuras en el planificador de Insights`), contrato del que depende

## Dependencies & Impact

### Depends on

- `TASK-1974`: la tarjeta de cifra como tipo de figura en el contrato del plan (`contracts/plan.ts` / `chart-spec.ts`)
  y del modelo web (`contracts/web-model.ts`); evidencia y productores de dona y barras apiladas; matriz familia ×
  evidencia ampliada; los segmentos de una pila llegan como hechos no superpuestos (incluido el complemento). El
  nombre definitivo del tipo de figura y de sus campos (estimado, dirección, rol de cada parte) se toma de esa task.
- `TASK-1889`: anatomía de figura, hooks (`makeColumnsHook`, `withDeckFigureSize`), resolvers, `delta-pill` con
  `trendOf`, gate `pnpm insights:canvas-fidelity`.
- `TASK-1962`: cascada «qué consultas explican el cambio» ya producida por el planner (hoy sólo web).

### Blocks / Impacts

- El rollout de EPIC-045 para Berel y Sky: el informe deja de omitir figuras en el PDF.
- `TASK-1902` (medidor y mapa de calor): comparte `figure-slots.ts`, `figure-svg.ts`, `registry.json` y los fixtures;
  si corre en paralelo, se coordinan los frames del gate y el `FigureKind`.
- `TASK-1958`: deja de ser dueña de la cascada en el PDF.
- `efeonce-think` (vista S6 y muestra pública): componente de tarjeta y waffle por unidad.

### Files owned

- `src/lib/artifact-composer/catalogs/insights-report/report-figure-{waterfall,waffle,donut,stacked,stat}.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-report/registry.json`, `index.ts`, `report-editorial.css`
- `src/lib/artifact-composer/catalogs/insights-deck/insights-figure-{waterfall,waffle,donut,stacked,stat}.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-deck/registry.json`, `index.ts`, `deck-editorial.css`
- `src/lib/artifact-composer/catalogs/insights-shared/figure-svg.ts`, `figure-hooks.ts`
- `src/lib/artifact-composer/chart-geometry.ts` (sólo la función nueva de waffle por unidad)
- `src/lib/artifact-composer/brand-packs/axis/editorial-roles.json` (rol del paso de cascada)
- `src/lib/efeonce-insights/render/figure-slots.ts` (+ `figure-slots.test.ts`), `report-mapper.test.ts`,
  `insights-deck-mapper.test.ts`
- `src/lib/copy/insights.ts`
- `scripts/insights/canvas-fixtures/{report,deck}/44-figura-cascada.json` … `48-figura-cifras.json`
- `scripts/frontend/baselines/artifact-composer/**` y `BASELINE_DELTAS.md` (frames nuevos)
- `docs/ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md` (nace en el Slice 1)
- `docs/ui/reviews/TASK-1975-efeonce-insights-new-figure-pages/` y su scorecard
- `efeonce-think`: `src/components/insights/ChartFigure.astro`, componente nuevo de tarjeta en
  `src/components/insights/`, `src/lib/insights.ts`, `src/lib/insights-chart-geometry.ts`,
  `src/styles/insights.css`, `src/lib/insights-fixtures.ts`, `tests/insights.test.ts`

## Current Repo State

### Already exists

- Hojas aprobadas a tamaño nativo: `Premium-Cascada.png`, `Premium-Waffle.png`, `Premium-Donut.png`,
  `Premium-Apiladas.png`, `Deck-Cascada.png`, `Deck-Waffle.png`, `Deck-Donut.png`, `Deck-Apiladas.png`, con su fuente
  editable en `fuente-canvas-2026-09-25.tar.gz`.
- Geometría pura del motor: `waterfallGeometry`, `sliceGeometry` (`MAX_SLICES = 3`), `barGeometry` (sirve a apiladas)
  y `waffleGeometry` (100 celdas por participación) en `src/lib/artifact-composer/chart-geometry.ts`.
- Contrato: `waterfall` y `waffle` como familias de datos propios (`ChartWaterfallDataV1`, `ChartWaffleDataV1`);
  `donut` y `bar_stacked` como familias de series (`contracts/chart-spec.ts`).
- Plantillas A4 y deck de figura para `comparison`, `columns`, `targets` y `trend`; `FigureKind`,
  `FIGURE_CONTENT_TYPE`, `FIGURE_CAPACITY`, `PDF_FIGURE_FAMILIES`, `hasPdfFigurePage` y `hasFigurePage` en
  `src/lib/efeonce-insights/render/figure-slots.ts`; los dos mappers filtran con `hasPdfFigurePage`.
- Roles de dato del pack: `dataCurrent*`, `dataPrior*`, `dataOpportunity*`, `dataAbsence*` (incluido el relleno
  rayado en papel) en `brand-packs/axis/editorial-roles.json`.
- Think dibuja las 15 familias en `src/components/insights/ChartFigure.astro` (incluidas cascada, dona, apiladas y
  waffle), con geometría en `src/lib/insights-chart-geometry.ts` y pruebas `pnpm test:insights`, `pnpm verify:insights`,
  `pnpm audit:insights-a11y` y captura `scripts/capture-insights-report.mjs`.

### Gap

- Ninguna plantilla de cascada, waffle, dona, apiladas ni cifras en los catálogos PDF; `kindOf` rechaza esas familias.
- La tarjeta de cifra no tiene hoja aprobada, ni plantilla, ni componente en Think.
- El waffle reparte 100 celdas por participación en el PDF y en Think, contra el criterio («cada cuadro es una unidad»).
- El paso «Sumó» de la cascada no tiene rol de color en el pack.
- La cascada en el PDF figura como pendiente de TASK-1958/TASK-1902 en la arquitectura §15.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: catálogos `src/lib/artifact-composer/catalogs/insights-*` y mapper `src/lib/efeonce-insights/render/` (Job `artifact-worker`); componente web en el repo hermano `efeonce-think`
- Future candidate home: `worker`
- Boundary: los catálogos son dato del composer; `figure-slots.ts` es el único que traduce el plan congelado a slots; Think consume sólo `InsightWebModelV1` y no comparte código con Greenhouse
- Server/browser split: los catálogos componen en el Job `artifact-worker` y el mapper es server-side; Think renderiza en el servidor (Astro SSR) y la tarjeta no necesita JavaScript de cliente
- Build impact: none — sin dependencias nuevas; fuentes del font pack del pack `axis`; Think sin paquetes nuevos
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente que lee el informe mensual (director de marketing o de marca) en PDF, en presentación o en el
  enlace web; equipo de Efeonce que lo emite y lo revisa antes de compartir.
- Momento del flujo: lectura del capítulo de una edición (`report_pdf`, `deck_pdf`, vista web S6).
- Resultado perceptible esperado: cada dato con la figura que responde su pregunta; el PDF ya no omite la cascada, la
  dona, las apiladas ni el waffle; los valores sueltos se leen como cifras con su variación y período, no como barras.
- Fricción que debe reducir: informes dominados por barras, métricas repetidas en dos figuras y figuras que existen en
  la web pero desaparecen del PDF.
- No-goals UX: interacción, edición libre, cambiar qué figura elige el planner (eso es TASK-1974).

### Surface & system decision

- Surface: páginas A4 `report-figure-{waterfall,waffle,donut,stacked,stat}`, láminas `insights-figure-{waterfall,waffle,donut,stacked,stat}` y bloque de tarjeta en la vista web de Think.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — documento de lienzo fijo del Artifact Composer y vista pública de Think, no superficie del portal.
- Primitive decision: `extend` — cinco plantillas por catálogo sobre la anatomía de figura de TASK-1889 y un componente de Think; la tarjeta de cifra es una plantilla de catálogo, no una primitive del portal (por eso `UI impact: layout` y no `primitive`).
- Adaptive density / The Seam: `no aplica` en PDF (lienzo fijo, la densidad se resuelve paginando); en Think la retícula de tarjetas se adapta al ancho (varias columnas en desktop, una a 390 px).
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/insights.ts` (`GH_INSIGHTS.catalog`); en Think, contenido desde el modelo web y rótulos de interfaz en `src/lib/insights-copy.ts`.
- Access impact: `none`.

### State inventory

- Default: figura completa con sus hechos medidos, como en la hoja aprobada.
- Loading: no aplica (documento compuesto; la vista web llega renderizada en el servidor).
- Empty: sin hechos suficientes la figura no se emite y el capítulo la narra (`hasFigurePage = false`).
- Error: cascada que no cuadra, cifra o nombre que no caben, más partes que la capacidad ⇒ el mapper rechaza con causa.
- Degraded / partial: tarjeta sin dato con «—» y «Sin dato en {período}»; tarjeta sin período anterior sin píldora; parte de ausencia rayada.
- Permission denied: no aplica (permisos de la edición y del enlace, sin cambio).
- Long content: rótulos de cascada en hasta dos líneas; más de 6 cifras se reparten en páginas equilibradas; cascada de más de 8 pasos (A4) o 6 (deck) no se emite.
- Mobile / compact: la lámina 16:9 es la versión compacta del PDF; en Think, una columna a 390 px.
- Keyboard / focus: no aplica (sin controles nuevos).
- Reduced motion: no aplica (sin movimiento).

### Interaction contract

- Primary interaction: lectura.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: ninguno.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica; la tarjeta de Think no anima sus cifras (sin conteo progresivo).
- Non-goal motion: cualquier movimiento en PDF o web; por eso `Motion: none`. `Flow: none` porque la task no coordina superficies ni rutas: produce páginas dentro de salidas existentes.

### Implementation mapping

- Route / surface: salidas `report_pdf` y `deck_pdf` de una edición; vista web `think.efeoncepro.com/insights/r/<token>` y muestra `/insights/muestra`.
- Primitive / variant / kind: plantilla de figura A4 y lámina de figura 16:9 de TASK-1889; `FigureKind` nuevos `waterfall`, `waffle`, `donut`, `stacked`, `stat`.
- Component candidates: `waterfallSvg`, `waffleSvg`, `donutSvg`, `stackedColumnsSvg` en `figure-svg.ts` con sus hooks; componente de tarjeta en Think.
- Copy source: `src/lib/copy/insights.ts` (claves del Copy Ledger del wireframe).
- Data reader / command: plan congelado de la edición (`chapter.charts`, `readings`, figura de cifra de TASK-1974) vía `buildFigureSlides`; Think lee `InsightWebModelV1` del enlace compartido.
- API parity: sin acción de negocio; ediciones, salidas y enlaces ya tienen API/MCP (TASK-1845/1846/1848).
- Access / capability: la de la edición y la del enlace compartido.
- States to implement: los del State inventory.

### GVC scenario plan

- Scenario file: PDF sin ruta de portal ⇒ harness `pnpm insights:canvas-fidelity` + `pnpm composer:visual-gate --catalog=insights`; Think ⇒ `scripts/capture-insights-report.mjs` de `efeonce-think`.
- Route: vista web `/insights/r/<token>` (staging) y `/insights/muestra` con fixtures.
- Viewports: A4 794×1123 y 16:9 1280×720 a tamaño físico; Think 1440 y 390.
- Quality profile: `premium`
- Required steps: fixtures con los datos del canvas; vista previa real de Berel y Sky con `--editorial-v2`; captura de Think con fixtures y con el modelo real de Berel.
- Required captures: las ocho hojas lado a lado en color y en gris; las hojas de cifras aprobadas en el Slice 1; Think desktop y 390.
- Required `data-capture` markers: `data-slot` de cada región del wireframe en los catálogos; marcador de bloque por figura en Think.
- Assertions: cifras iguales al plan, cascada que cuadra, waffle con tantos cuadros como unidades, sin datos de ejemplo ni identificadores internos.
- Scroll-width checks: `assertSlideFitsCanvas` en PDF; `scrollWidth <= innerWidth` en Think a 390.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1975-efeonce-insights-new-figure-pages/`
- Baseline decision / surface ID: diez frames nuevos (`ReportFigure{Waterfall,Waffle,Donut,Stacked,Stat}Page`, `InsightsFigure{Waterfall,Waffle,Donut,Stacked,Stat}Slide`); ningún frame existente cambia.

### Design decision log

- Decision: las cinco figuras del criterio en ambos catálogos y la tarjeta en Think; la cascada se mueve aquí desde TASK-1958/TASK-1902 por decisión del operador (2026-10-03).
- Decision: la tarjeta de cifra se diseña en el canvas y se aprueba antes de implementarse; propuesta recomendada en el wireframe (retícula de cifras sin borde de tarjeta ni cifra principal en el héroe, para no mostrar el mismo dato dos veces).
- Decision: el waffle dibuja un cuadro por unidad (≤ 100) en el PDF y en Think a la vez.
- Alternatives considered: tarjeta como fila del resumen ejecutivo (rechazada: el criterio la hace figura de capítulo); tarjetas con borde sobre fondo gris (rechazada por la dirección, «card soup»); waffle de 100 celdas por participación (rechazado por el criterio); paginar una cascada larga (rechazado: partida no explica el cambio).
- Why this pattern: reutiliza retícula, hooks, píldora, gate de fidelidad y gate visual de TASK-1889.
- Reuse / extend / new primitive: `extend`.
- Open risks: rol de parte, «estimado» y dirección dependen del contrato de TASK-1974; rol de color nuevo para «Sumó»; soporte `tnum` de Poppins; la tarjeta puede requerir más de una ronda de canvas.

### Visual verification

- GVC scenario: harness del Composer para PDF; `capture-insights-report.mjs` para Think.
- Viewports: A4 y 16:9 a tamaño físico; Think 1440 y 390.
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: `data-slot` por región; marcador por figura en Think.
- Scroll-width check: desborde de lienzo en el harness; `scrollWidth` en Think a 390.
- Accessibility/focus checks: `aria-label` con resumen de cifras en cada SVG; contraste AA de cifras dentro de segmentos y de la tarjeta sobre navy; lectura en gris; `pnpm audit:insights-a11y`.
- Before/after evidence: vista previa de Berel y Sky de septiembre 2026 antes (figuras omitidas del PDF) y después.
- Known visual debt: ninguna declarada al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1975-efeonce-insights-new-figure-pages.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Diseño de la tarjeta de cifra (canvas + aprobación)

- Tableros nuevos `Premium-Cifras` y `Deck-Cifras` en el canvas «Gráficos de Efeonce Insights» con las tres direcciones
  del wireframe (ledger, retícula recomendada, cifra destacada) y datos reales de Berel septiembre 2026 (clics,
  impresiones, keywords, CTR, tráfico estimado) y de Sky (piezas entregadas), incluidos los casos sin dato, estimado y
  «menor es mejor».
- Aprobación explícita del operador; hojas aprobadas exportadas a tamaño nativo en `paginas/` (junto a las de
  TASK-1889, porque es el mismo canvas) y registro en `docs/ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md`
  (fuente, alternativas, decisión, tokens).
- Wireframe actualizado: la sección de la tarjeta deja de ser propuesta.

### Slice 2 — Geometría y mapper compartidos

- `figure-slots.ts`: `FigureKind` + `FIGURE_CONTENT_TYPE` + `FIGURE_CAPACITY` (pasos, partes, períodos, cifras) para las
  cinco figuras; `PDF_FIGURE_FAMILIES` suma `waterfall`, `waffle`, `donut` y `bar_stacked`, y el tipo de figura de
  cifra según el contrato de TASK-1974; `hasFigurePage` responde por ellas.
- Reglas del mapper: cascada que cuadra o rechazo con causa; waffle ≤ 4 partes y ≤ 100 unidades; dona de 2 o 3
  partes; apiladas ≤ 4 segmentos con total que coincide; cifras derivadas declaradas; nombre de tarjeta ≤ 3 palabras.
- Función nueva de waffle por unidad en `chart-geometry.ts` (sin cambiar `waffleGeometry`) y funciones SVG en
  `figure-svg.ts`. Tests de cada regla.

### Slice 3 — Páginas A4 (`insights-report`)

- Plantillas `report-figure-{waterfall,waffle,donut,stacked}` con hooks, alta en `registry.json` e `index.ts`, roles en
  `report-editorial.css` y rol nuevo del paso de cascada en `editorial-roles.json`.
- Fixtures `44`–`47` con los datos del canvas a ≤ 1 % de `Premium-Cascada`, `Premium-Waffle`, `Premium-Donut` y
  `Premium-Apiladas`, también en gris.
- `report-figure-stat` contra `Premium-Cifras` aprobada en el Slice 1 (fixture `48`).

### Slice 4 — Láminas del deck (`insights-deck`)

- Plantillas `insights-figure-{waterfall,waffle,donut,stacked,stat}` con `withDeckFigureSize`, alta en `registry.json`
  e `index.ts`, roles en `deck-editorial.css`.
- Fixtures a ≤ 1 % de `Deck-Cascada`, `Deck-Waffle`, `Deck-Donut`, `Deck-Apiladas` y `Deck-Cifras`.

### Slice 5 — Think (`efeonce-think`)

- Componente de tarjeta de cifra con la anatomía aprobada, alimentado por el tipo de figura del modelo web de TASK-1974;
  semántica `<dl>`; una columna a 390 px.
- Waffle por unidad en `insights-chart-geometry.ts` y `ChartFigure.astro`, con la misma regla de columnas que el PDF.
- Fixtures y pruebas (`pnpm test:insights`, `pnpm verify:insights`, `pnpm audit:insights-a11y`); captura desktop y 390.
- Despliegue de Think coordinado con el release de Greenhouse (ver Rollout).

### Slice 6 — Verificación con datos reales, gate y dossier

- Vista previa `--editorial-v2` de Berel y Sky, septiembre 2026, en `report_pdf` y `deck_pdf`; revisión del operador.
- `pnpm composer:visual-gate --catalog=insights` a cero píxeles con los diez frames nuevos declarados en
  `BASELINE_DELTAS.md` y congelados en el mismo commit.
- Dossier con hojas lado a lado en color y gris, capturas de Think y antes/después; scorecard.
- Arquitectura §15, skill `efeonce-insights` y documentación funcional/manual actualizadas (cascada y figuras nuevas
  con página PDF; waffle por unidad).

## Out of Scope

- Qué figura elige el planner, la deduplicación y el desempate por variedad, la evidencia y la matriz familia ×
  evidencia (TASK-1974).
- Medidor y mapa de calor (TASK-1902) y las demás familias del canvas sin productor (embudo, dispersión, Venn, UpSet).
- Página de plan de acción en los PDF (sigue en TASK-1958).
- Reescribir ediciones ya emitidas: son snapshots congelados.
- Release a producción como acto propio: va con el rollout de EPIC-045 y el control plane.

## Detailed Spec

El wireframe describe región por región las cinco figuras en A4, deck y Think, el mapeo a tokens, el copy y los
estados. Puntos que el agente debe resolver contra el código y el contrato final de TASK-1974:

- **Cómo llega la tarjeta de cifra al mapper.** No es una de las 15 familias (`CHART_FAMILIES`): TASK-1974 la agrega
  como tipo de figura del plan. `buildFigureSlides` y `hasFigurePage` la aceptan con la forma que ese contrato fije
  (nombre, valor, unidad, hecho anterior, dirección, estimado). La página no lleva cifra principal en el héroe.
- **Agrupación de cifras.** Propuesta del wireframe: figuras de cifra consecutivas de un mismo capítulo comparten
  página en el orden del plan (Berel: una página de cinco cifras). Si TASK-1974 ya las entrega agrupadas en una sola
  figura, el mapper no reagrupa.
- **Cascada.** `data.steps` con `isTotal` en el primero y el último; el mapper verifica `inicial + Σ pasos = final`
  sobre los valores de los hechos antes de componer; capacidad 8 pasos intermedios (A4) y 6 (deck); sin paginación.
- **Waffle por unidad.** Total de unidades = suma de las partes (o `totalFactId` si viene, que debe coincidir); ≤ 30
  unidades en 5 columnas, de 31 a 100 en 10 columnas; más de 100, no se emite. Think aplica la misma regla.
- **Dona.** Serie única con 2 o 3 hechos; participación por restos mayores para que sume 100; centro según el Design
  Decision Log del wireframe.
- **Apiladas.** Series = segmentos (base = `series[0]`), dimensiones = períodos; total = suma de segmentos, verificado
  contra el hecho de total si existe; participación base y anotación de variación opcionales.
- **Rol de parte y marcas.** «Oportunidad», rayado de ausencia y «Estimado» sólo si el contrato los declara; sin rol,
  colores por orden (actual → oportunidad → anterior) y sin rayado.
- **Copy.** Claves del Copy Ledger del wireframe en `GH_INSIGHTS.catalog`, validadas con `greenhouse-ux-writing`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (aprobación de la tarjeta) → toda implementación de la tarjeta en los Slices 3, 4 y 5. Las cuatro familias
  con hoja pueden avanzar en paralelo al Slice 1.
- Slice 2 → Slices 3 y 4 (independientes entre sí) → Slice 6.
- Slice 5 (Think) se despliega **antes o junto con** el release de Greenhouse que sirve la tarjeta en el modelo web;
  nunca después.
- TASK-1974 y TASK-1975 salen a producción **en el mismo release** de Greenhouse: si el planner de TASK-1974 llega solo,
  el PDF omite las cifras, la dona y las apiladas que el planner eligió.
- Ninguna plantilla se congela en el gate sin su fixture del canvas dentro del 1 % (o excepción aprobada por el
  operador, con techo).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El planner de TASK-1974 llega a producción sin estas páginas y el PDF pierde figuras | worker / PDF al cliente | medium | mismo release; `hasFigurePage` como predicado único entre planner y render | revisión interna de la edición antes de compartir |
| Think recibe la tarjeta antes de saber dibujarla | Think / vista S6 | medium | Think se despliega primero; un tipo de figura desconocido cae al equivalente tabular, nunca rompe la página | `pnpm verify:insights` contra el modelo de staging |
| Frames ajenos arrastrados al rebaseline | gate visual | low | `--catalog=insights` scoped; frames existentes intactos | gate global |
| Cascada que no cuadra por redondeo o un paso faltante | PDF al cliente | medium | el mapper rechaza con causa; test con el caso real de Berel | emisión fallida con causa en la salida |
| Waffle por unidad cambia la web de ediciones ya compartidas al re-renderizar | Think | low | mismo dato, otra granularidad; se avisa al operador antes del deploy | revisión del operador sobre la muestra |
| Re-render de una edición sellada suma páginas que su PDF original no tenía | worker | low | sólo en recuperación; mismas cifras congeladas; se documenta | revisión del operador |
| Cifra de la tarjeta no cabe o Poppins sin `tnum` | PDF / Think | low | rechazo con causa; Geist 700 como alternativa declarada | fidelidad y dossier |
| Contraste insuficiente de cifras dentro de segmentos | PDF al cliente | low | medición AA por color de segmento | dossier |

### Feature flags / cutover

- Sin flag propio: las páginas nacen con la promoción. Las figuras nuevas sólo aparecen en ediciones cuyo plan las
  trae (editorial v2 con `INSIGHTS_EDITORIAL_V2_ENABLED`, ON en staging y Production desde 2026-09-26, y el planner de
  TASK-1974). La revisión interna antes de compartir sigue siendo el gate humano.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | sin runtime (canvas y documentos) | inmediato | si |
| Slice 2 | revert del commit; `PDF_FIGURE_FAMILIES` vuelve a cuatro familias y los mappers omiten las nuevas como hoy | < 15 min + release | si |
| Slices 3–4 | revert del commit y del baseline congelado | < 15 min + release | si |
| Slice 5 | revert en `main` de `efeonce-think` (auto-deploy de Vercel) o rollback instantáneo al deployment anterior | < 5 min | si |
| Slice 6 | sin runtime | inmediato | si |

### Production verification sequence

1. Local: fidelidad ≤ 1 % en las ocho hojas y en las de cifras aprobadas, gate a 0 px, vista previa real de Berel y Sky.
2. Think: pruebas locales, captura desktop y 390, revisión del operador; push a `main` de `efeonce-think` sólo con su
   autorización y tras verificar que el último deploy está sano.
3. Staging de Greenhouse: ediciones internas de Berel y Sky con TASK-1974 y TASK-1975; PDF y enlace web revisados por el
   operador.
4. Producción por el control plane (el Job `artifact-worker` es compartido), en el mismo release que TASK-1974.
5. Primera edición real de cada cliente revisada internamente antes de compartir.

### Out-of-band coordination required

- Aprobación del operador de la tarjeta de cifra en el canvas (Slice 1) y de los PDF reales (Slice 6).
- Autorización del operador para el push a `main` de `efeonce-think`, que despliega producción al instante.
- Coordinación con quien lleve TASK-1974 para el nombre del tipo de figura de cifra, la agrupación y los roles de parte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`; el wireframe existe; `UI ready` permanece `no` hasta que la tarjeta esté aprobada y el mapping, el dossier y el scorecard estén completos.
- [x] El operador aprobó la tarjeta de cifra en el canvas; sus hojas `Premium-Cifras.png` y `Deck-Cifras.png` existen en `paginas/` y la dirección quedó registrada en `docs/ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md`.
- [ ] `PDF_FIGURE_FAMILIES` incluye `waterfall`, `waffle`, `donut` y `bar_stacked`, y la tarjeta de cifra tiene página; `hasFigurePage` devuelve `true` para cada una con hechos suficientes (test).
- [ ] `report-figure-{waterfall,waffle,donut,stacked}` e `insights-figure-{waterfall,waffle,donut,stacked}` quedan a ≤ 1 % de sus ocho hojas aprobadas (o excepción aprobada por el operador, con techo), en color y en gris.
- [ ] `report-figure-stat` e `insights-figure-stat` quedan a ≤ 1 % de las hojas de cifras aprobadas.
- [ ] Ninguna plantilla nueva contiene HEX, px de color ni familias tipográficas literales; el rol del paso de cascada vive en `editorial-roles.json`.
- [ ] Una cascada que no cuadra se rechaza con causa (test con el caso de Berel alterado).
- [ ] Un waffle de 8 unidades dibuja 8 cuadros en el PDF y en Think (tests en ambos repos).
- [ ] Una dona con 1 parte o con más de 3 no se emite (test).
- [ ] Una tarjeta sin dato muestra «—», nunca 0; una estimada lleva «Estimado»; con «menor es mejor», el tono se invierte (tests).
- [ ] Ninguna cifra ni nombre se trunca: el exceso produce rechazo con causa (test).
- [ ] El copy visible reusable vive en `src/lib/copy/insights.ts`.
- [ ] `pnpm composer:visual-gate --catalog=insights` pasa a cero píxeles con los diez frames nuevos declarados en `BASELINE_DELTAS.md`.
- [ ] La vista previa real de septiembre 2026 compone Berel con seis familias distintas más tarjetas y Sky con una figura de bullets de tres metas más la tarjeta de piezas entregadas, sin figuras omitidas del PDF; el operador la revisó.
- [ ] Think dibuja la tarjeta de cifra y el waffle por unidad; captura desktop y 390 sin scroll horizontal de página; `pnpm audit:insights-a11y` sin hallazgos nuevos.
- [ ] Dossier con hojas lado a lado en color y en gris, capturas de Think y antes/después; scorecard con promedio ≥ 4,5 y piso ≥ 4.
- [ ] La arquitectura §15 deja de listar la cascada como pendiente de TASK-1958/TASK-1902 y declara las figuras con página PDF.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/artifact-composer src/lib/efeonce-insights`
- `pnpm insights:canvas-fidelity --only=Cascada`, `--only=Waffle`, `--only=Donut`, `--only=Apiladas`, `--only=Cifras`, cada uno también con `--gray`
- `pnpm composer:visual-gate --catalog=insights`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts --edition=insed-… --org=org-32333527-02a8-487b-819e-6f76a761777d --editorial-v2 --start=2026-09-01 --end-exclusive=2026-10-01 --output=both` (Berel, con una edición existente suya) y lo mismo con `--org=org-b9977f96-f7ef-4afb-bb26-7355d78c981f` (Sky)
- En `efeonce-think`: `pnpm test:insights`, `pnpm verify:insights`, `pnpm audit:insights-a11y`, `pnpm build`, `node scripts/capture-insights-report.mjs` (1440 y 390)
- `pnpm task:lint --task TASK-1975`, `pnpm ui:quality --task TASK-1975`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta en TASK-1902 y TASK-1958: la cascada en el PDF es de TASK-1975; TASK-1902 coordina `FigureKind`, registry y frames del gate.
- [ ] Skill `efeonce-insights` (`references/contracts.md`, `references/lessons.md`), documentación funcional `docs/documentation/insights/efeonce-insights-dominio-ediciones.md` y manual `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md` actualizados.

## Follow-ups

- Las demás familias del canvas cuando su evidencia exista (embudo, dispersión, Venn, UpSet), con la misma regla.
- Si el operador lo pide, mostrar la tarjeta de cifra en la muestra pública de Think (`/insights/muestra`): hoy los
  fixtures sólo se usan en pruebas.

## Open Questions

- ¿TASK-1974 entrega las cifras de un capítulo agrupadas en una figura o una por métrica? Define si el mapper agrupa.
- ¿El contrato de TASK-1974 trae el rol de cada parte (ausencia, oportunidad) y la marca de estimado? Sin ellos, no se
  dibujan rayado, «Oportunidad» ni «Estimado».
- Centro de la dona: ¿se acepta la regla propuesta (cifra principal si la lectura cita hechos de la dona; si no, total
  de las partes)?
