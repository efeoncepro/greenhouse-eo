# TASK-1307 / `/admin/growth/seo/performance` — Rank & URL Performance Over Time ★

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1307`
- Product Design asset: sin PNG aprobado todavía — dirección aterrizada en el arch doc §10.3 (pantalla ancla), §5 (rank tracking), §10.4 (dataviz), §10.5 (estados). `UI ready: no` hasta correr `product-design-loop` o aprobación explícita del operador. Este es el contrato de arquitectura de la feature ancla del módulo, no un stub.
- Intended consumers: operador Efeonce Growth/Marketing Ops. Es **la película** (evolución temporal) — el diferenciador comercial (§11: justifica la recurrencia; el gráfico de URLs 8→3 = la conversación de renovación de Berel).
- Copy source: `src/lib/copy/growth.ts` (nuevo bloque `GH_GROWTH_SEO_PERFORMANCE`); menú en `GH_INTERNAL_NAV.growthSeoPerformance`.
- Primitive decision: `reuse` — CompositionShell (`composition='single'`), `GreenhouseChartCard` (envuelve el chart temporal), `DataTableShell` (tabla TanStack densa), `GreenhouseChip` (chips del set + serie), `@core/components/mui/Autocomplete` (multi-select de URLs/keywords), `MetricTrendCard`/`GreenhouseKpiDelta` (mini-sparkline por fila), `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `EmptyState`. **Ninguna primitive nueva.** El motor de chart (ECharts vs Apex) es la única decisión de librería — ver Design Decision Log.
- UI ready target: `no`

## Brief

- Primary user: operador interno que responde al CMO cliente "¿cómo rinde este set de URLs/keywords y cómo evoluciona?".
- User moment: análisis de rendimiento de un conjunto elegido de URLs (o keywords) de un Space a lo largo del tiempo — sube tras un cambio de contenido, prepara un SOW, o arma la evidencia de renovación.
- Job to be done: ver la **evolución de posición** (o clics/impresiones/CTR) de 1..N URLs/keywords en una línea multi-serie temporal, con la tabla de detalle debajo, y poder **drillear** a una URL específica. La selección es **compartible** vía `?urls=`/`?keywords=`.
- Primary decision signal: la **pendiente de cada línea** (¿sube o baja de posición en el tiempo?) contra la **target line "meta top-3"**, más el Δ30d en la tabla.
- Non-goals: NO edita el set trackeado (config = commands backend + follow-up). NO recomputa métricas. NO mezcla más de un Space. NO es el keyword-research/scatter (esa es TASK-1308). NO backlinks/audit.

## Layout Skeleton

Composición: `CompositionShell composition='single'`. Layout vertical: toolbar → tabs Search Visibility → selector de set (control) → chart temporal (`GreenhouseChartCard`) → tabla `DataTableShell`. La fila de la tabla enlaza al drill `?url=X`.

```
┌ Header ─────────────────────────────────────────────────────────────────────┐
│ Growth › SEO › Rendimiento   [Space ▾ Grupo Berel] [Feb–Jul ▾] [Device: Móvil ▾] │
│ ●medido (GSC)  ◑estimado (DataForSEO)   · GSC: datos hasta hace 2 días         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview [ Rendimiento ] Keywords  Auditoría                                   │  ← CustomTabList, activa=Rendimiento
├──────────────────────────────────────────────────────────────────────────────┤
│ Set:  ◉ Por URL   ○ Por keyword      [+ Elegir URLs/keywords ▾]                 │  ← RadioGroup + Autocomplete multi
│       chips:  /latex ✕   /pinturas ✕   esmalte sintético ✕                      │  ← GreenhouseChip removibles (el set activo)
│ Métrica:  [ Posición ▾ ]  Clics · Impresiones · CTR                            │  ← select de métrica del eje Y
├──────────────────────────── Chart ─────────────────────────────────────────────┤
│ ┌ Evolución de {métrica} ─────────────────────────────────────── [Ver tabla] ┐ │
│ │  ▲ mejor                                                                     │ │
│ │  1 ─────────── target: meta top-3 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─          │ │  ← Y INVERTIDO (1 arriba)
│ │  3 ╭─/latex────╮                                     ● /latex #3            │ │  ← 1 línea/URL, marker+dash distintos
│ │  5 │           ╰──╮        ▓▓ band: update algoritmo ▓▓                     │ │     last-value label al final
│ │  9 ╰─/esmalte──────╰────────────────────╮  ● /esmalte #9                   │ │     colorblind-safe (línea+marker)
│ │  ▼ peor        [◀───── dataZoom temporal ─────▶]      crosshair+tooltip     │ │  ← dataZoom + crosshair multi-serie
│ └──────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────── Tabla ─────────────────────────────────────────────┤
│ URL/Keyword     │ Pos actual │ Δ30d │ Clics │ Impr │ CTR │ Tendencia          │  ← DataTableShell (TanStack)
│ /latex          │    3 ●     │ ↑ 5  │ 12.4K │ 210K │ 5.9%│ ▁▂▃▅▆ (sparkline)  │     aria-sort, fila→?url=/latex
│ /esmalte        │    9 ●     │ ↓ 5  │  3.1K │ 180K │ 1.7%│ ▆▅▃▂▁               │
│ …                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header + toolbar | Space + rango + **device** + leyenda medido/estimado + latencia | `GreenhouseBreadcrumbs` + `@core/.../Autocomplete` (Space) + date-range + device select + `GreenhouseChip` (leyenda) | `readRankEvolution` metadata |
| 1 | Search Visibility tabs | Navegación local (Rendimiento activa) | `CustomTabList` con `aria-current` | rutas hermanas |
| 2 | Selector de set | Toggle Por URL / Por keyword + multi-select + chips removibles del set activo | `RadioGroup` + `@core/.../Autocomplete` (multiple) + `GreenhouseChip` (`onDelete`) | catálogo de URLs/keywords trackeadas del target |
| 3 | Selector de métrica | Qué mide el eje Y (Posición default / Clics / Impresiones / CTR) | `Select` (o `ToggleButtonGroup`) | — |
| 4 | Chart temporal ★ | Line multi-serie, **Y de posición invertido**, 1 línea/serie, target line, band de eventos, dataZoom, crosshair, last-value labels | `GreenhouseChartCard` envolviendo el motor de chart (ECharts si se instala / Apex line si no — ver Decision Log) | `readRankEvolution(targetId,{keywords?/urls?,range,engine,device})` → `{ series:[{key,points:[{date,position,url}]}] }` |
| 5 | Tabla de detalle | Filas por URL/keyword con Pos actual, Δ30d, Clics, Impr, CTR, mini-sparkline; sortable; drill | `DataTableShell` (TanStack) + `GreenhouseKpiDelta` (Δ) + mini-sparkline (Recharts, patrón `MetricTrendCard`) | `readRankEvolution` + `readRankSnapshotLatest` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.performance.header.title` | 0 | `Rendimiento` | — | breadcrumb `Growth › SEO › Rendimiento` |
| `growth.seo.performance.header.device.label` | 0 | `Dispositivo` | device | Móvil/Escritorio/Todos; afecta la SERP consultada |
| `growth.seo.performance.legend.measured` | 0 | `Medido · GSC` | — | ● + texto |
| `growth.seo.performance.legend.estimated` | 0 | `Estimado · DataForSEO` | — | ◑ + texto |
| `growth.seo.performance.freshness` | 0 | `GSC: datos hasta {as_of}` | `as_of` | latencia explícita |
| `growth.seo.performance.set.mode.byUrl` | 2 | `Por URL` | — | radio |
| `growth.seo.performance.set.mode.byKeyword` | 2 | `Por keyword` | — | radio |
| `growth.seo.performance.set.picker` | 2 | `Elegir URLs/keywords` | — | Autocomplete multiple; placeholder `Buscar y agregar…` |
| `growth.seo.performance.set.chip.remove.aria` | 2 | `Quitar {item} del set` | item | aria del onDelete del chip |
| `growth.seo.performance.set.max` | 2 | `Puedes comparar hasta {n} series a la vez.` | n (ej. 8) | límite honesto para legibilidad (colorblind-safe ≤ 8 series) |
| `growth.seo.performance.metric.label` | 3 | `Métrica` | — | select |
| `growth.seo.performance.metric.position` | 3 | `Posición` | — | default; Y invertido |
| `growth.seo.performance.metric.clicks` | 3 | `Clics` | — | Y desde 0 |
| `growth.seo.performance.metric.impressions` | 3 | `Impresiones` | — | Y desde 0 |
| `growth.seo.performance.metric.ctr` | 3 | `CTR` | — | Y desde 0 |
| `growth.seo.performance.chart.title` | 4 | `Evolución de {métrica}` | métrica | subtítulo: si posición → `Posición 1 es lo mejor (arriba)` |
| `growth.seo.performance.chart.target` | 4 | `Meta top-3` | — | etiqueta inline de la target line |
| `growth.seo.performance.chart.band` | 4 | `Actualización de algoritmo` | fecha/rango | etiqueta del band highlight (si hay evento) |
| `growth.seo.performance.chart.viewTable` | 4 | `Ver tabla de datos` | — | toggle a11y que expone la serie como `<table>` |
| `growth.seo.performance.chart.aria` | 4 | `Evolución de posición en el tiempo; posición 1 es lo mejor y está arriba; {n} series.` | métrica, n | `aria-label` del `role="img"` con el insight + la inversión |
| `growth.seo.performance.table.col.item` | 5 | `URL` / `Keyword` | modo | header cambia según modo |
| `growth.seo.performance.table.col.position` | 5 | `Pos. actual` | — | — |
| `growth.seo.performance.table.col.delta30` | 5 | `Δ 30 días` | — | ↓pos = bueno → flecha abajo verde |
| `growth.seo.performance.table.col.clicks` | 5 | `Clics` | — | — |
| `growth.seo.performance.table.col.impressions` | 5 | `Impresiones` | — | — |
| `growth.seo.performance.table.col.ctr` | 5 | `CTR` | — | — |
| `growth.seo.performance.table.col.trend` | 5 | `Tendencia` | — | mini-sparkline |
| `growth.seo.performance.table.row.drill.aria` | 5 | `Ver detalle de {item}` | item | aria de la fila clickeable (→ `?url=`) |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | — | — | chart poblado + tabla; set activo en chips + URL |
| loading | — | — | — | **skeleton por región**: toolbar+tabs instantáneos → skeleton del chart (tamaño final) → skeleton de la tabla (Suspense boundaries; nunca spinner de página) |
| empty (sin GSC) | `Conecta Google Search Console` | `Necesitamos GSC para reconstruir la evolución real de tus URLs.` | `Conectar Search Console` | `EmptyState` accionable; nunca ceros fantasma |
| empty (sin set elegido) | `Elige URLs o keywords para comparar` | `Agrega hasta {n} para ver cómo evolucionan lado a lado.` | foco al selector de set | estado inicial legítimo, no error |
| empty (set sin datos en el rango) | `No hay datos para este set en {rango}` | `Prueba un período más amplio o cambia el dispositivo.` | `Ampliar período` | filtered-empty, no zero-state |
| partial / degraded | banner | `Faltan puntos de algunas series (proveedor lento). Mostramos lo medido; el resto queda como “Pendiente”.` | dismissible | `observeAndDegrade`: la serie incompleta se dibuja hasta donde hay dato + marca el gap; **NUNCA** interpolar un 0 falso |
| error | `No pudimos cargar la evolución` | `Hubo un problema al leer los snapshots de este set. Intenta de nuevo.` | `Reintentar` (actionable=true) | canonical error |
| denied | `No tienes acceso al módulo SEO` | `Pídele a un administrador que active SEO para este Space.` | — sin Reintentar | sin `growth.seo.observation.read` o sin `module_assignment` (actionable=false) |

## Accessibility Contract

- Heading order: `h1` "Rendimiento — Search Visibility · SEO" → `h2` "Evolución de {métrica}" → `h2` "Detalle por {URL/keyword}". Sin saltos.
- Chart/table alternatives: el chart es `role="img"` con `aria-label` que declara **el insight + la inversión de posición** ("posición 1 es lo mejor y está arriba"). Toggle **"Ver tabla de datos"** que revela la serie completa como `<table>` (fallback textual real, no decorativo). La tabla de detalle (region 5) YA es el fallback tabular canónico de la serie.
- Aria labels: multi-select con `aria-label="Elegir URLs o keywords"`; chips removibles con `aria-label` "Quitar {item} del set"; columnas ordenables con `aria-sort`; filas clickeables con `aria-label` "Ver detalle de {item}" + `role`/tab reachable.
- Focus notes: al agregar/quitar del set, foco permanece en el selector y `aria-live="polite"` anuncia "{n} series en comparación". Al drillear una fila, navegación estándar (la ruta destino restaura foco a su `h1`).
- Color-independent state labels: cada serie se distingue por **line-style + marker shape** (dash/dot/solid + círculo/triángulo/cuadrado), no solo color → colorblind-safe incluso monocromo. Δ30d = **flecha + signo + color** (nunca color solo). Leyenda del chart con swatch + shape + label. Posición: la semántica invertida (↓ = bueno = flecha abajo verde) está etiquetada en texto, no inferida por color.

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/performance/page.tsx` (server: `getTenantContext` + `hasAuthorizedViewCode('administracion.growth_seo')` + `can(tenant,'growth.seo.observation.read','read','tenant')` + `module_assignment`; redirect `/login`|`/401`; defensivo si `client`). Lee `?urls=`/`?keywords=`/`?device=`/`?metric=` de `searchParams` para hidratar el estado inicial (deep-link compartible). View: `src/views/greenhouse/admin/growth/seo/performance/SeoPerformanceView.tsx` (`'use client'`).
- Primitives: `CompositionShell`, `GreenhouseChartCard`, `DataTableShell`, `GreenhouseChip`, `@core/components/mui/Autocomplete`, `GreenhouseKpiDelta`, `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `EmptyState`, `GreenhouseButton`.
- Variants / kinds: chips del set = `variant='outlined'` con `onDelete`; leyenda = `variant='label'`; Δ en tabla = `GreenhouseKpiDelta` con semántica invertida para posición. DataTableShell obligatorio (>6 cols + sort + sparkline embebido).
- Component candidates: `SeoRankEvolutionChart` (el chart ★, envuelto en `GreenhouseChartCard`), `SeoSetSelector` (radio + multi-select + chips + persistencia URL), `SeoMetricSelector`, `SeoPerformanceTable` (DataTableShell + columnas + drill), `SeoSearchVisibilityTabs` (compartido con 1306).
- Copy source: `src/lib/copy/growth.ts::GH_GROWTH_SEO_PERFORMANCE` + `GH_INTERNAL_NAV.growthSeoPerformance`.
- Data reader / command: `readRankEvolution(targetId,{keywords?,urls?,range,engine,device})` (TASK-1303) — hot window PG, BQ fallback; `readRankSnapshotLatest` para Pos actual/Δ30d. **Read-only** — sin commands.
- API parity: cliente puro del reader `readRankEvolution` (`src/lib/growth/seo/**`); Nexa/MCP lo consumen igual. La selección de set → query params (estado en la URL, no lógica de negocio en el componente).
- Access / capability: viewCode `administracion.growth_seo` (compartido con Overview; child route en `route-reachability-manifest.ts` con `parent`+`via`+`reason` — TASK-982) + `growth.seo.observation.read` + `module_assignment`. Sin nuevo viewCode (es child de la surface SEO). Key nav `GH_INTERNAL_NAV.growthSeoPerformance`.
- Runtime consumers: operador interno.
- Print/email/PDF considerations: N/A on-screen; la versión imprimible del set vive en el report artifact TASK-1310. (El "Exportar" de Overview cubre CSV.)
- GVC markers: `seo-performance-toolbar`, `seo-performance-tabs`, `seo-performance-set`, `seo-performance-metric`, `seo-performance-chart`, `seo-performance-table`, `seo-performance-empty-noset`, `seo-performance-empty-nogsc`, `seo-performance-degraded`, `seo-performance-denied`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-performance.scenario.ts` (desktop 1440×900) + `growth-seo-performance-mobile.scenario.ts` (390×844).
- Route: `/admin/growth/seo/performance?urls=/latex,/esmalte&device=mobile&metric=position` (agent auth superadmin; Grupo Berel en staging).
- Viewports: desktop 1440×900 + mobile 390×844.
- Required steps: cargar con set en URL → esperar `[data-capture="seo-performance-chart"]` → capturar default (chart+tabla) → agregar una serie vía selector → capturar → (scenario aparte) sin set → capturar empty-noset → forzar degraded.
- Required captures: default (multi-serie + tabla), empty (sin set), empty (sin GSC), degraded (gap de serie), denied, mobile (chart + tabla apilados, tabla con scroll interno).
- Required `data-capture` markers: los 10 listados.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, el chart tiene `role="img"` + aria-label con "1 es lo mejor", chips del set = los de `?urls=`, tabla con `aria-sort`.
- Scroll-width checks: `scrollWidth==clientWidth` desktop **y** 390px. La tabla densa usa scroll interno del `DataTableShell` (contención horizontal), NUNCA empuja la página; el chart condensa el eje/legend en mobile.
- Accessibility/focus checks: orden toolbar→tabs→set→métrica→chart→tabla; toggle "Ver tabla de datos" alcanzable por teclado; drill de fila con Enter; `aria-live` al cambiar el set.
- Reduced-motion evidence: con `prefers-reduced-motion` la entrada del chart y las transiciones de dataZoom se resuelven sin animación (render directo del estado final); sparklines sin animación.

## Design Decision Log

- Decision: **line multi-serie temporal con eje Y de posición invertido (1 arriba = mejor)**, 1 línea por URL/keyword distinguida por line-style + marker (colorblind-safe), target line "meta top-3", band highlight de eventos de algoritmo, `dataZoom` temporal, crosshair + tooltip multi-serie, last-value labels — más tabla `DataTableShell` debajo con Δ30d + mini-sparkline por fila. Selección persistida en `?urls=`/`?keywords=` (compartible).
- Alternatives considered: (a) Y de posición normal (1 abajo) — rechazado: contra-intuitivo, "subir" en el chart debe significar "mejorar"; la inversión es el estándar de rank-tracking (Semrush/Ahrefs) y está documentada en el aria-label; (b) small multiples (un mini-chart por URL) — rechazado para el caso base: la comparación lado-a-lado en un solo eje es justo el valor ("/latex 8→3 mientras /esmalte 4→9"); small multiples es follow-up si N crece; (c) tooltip como única lectura — rechazado: la tabla es el fallback tabular obligatorio.
- Why this pattern: es la **feature ancla** (§10.3) — la película que justifica la recurrencia comercial. El encoding (posición por-serie en un eje común invertido) es el más preciso según Cleveland & McGill (posición en escala común) y responde exactamente "¿cómo evoluciona este set?".
- Reuse / extend / new primitive: **reuse total** de primitives Greenhouse. Ninguna primitive de Design System nueva. Componentes locales del módulo (`SeoRankEvolutionChart`, `SeoSetSelector`, etc.) son composición, no primitives.
- **Charts — decisión de librería (la única real de esta task):** el chart ancla (line multi-serie + Y invertido + `dataZoom` + crosshair multi-serie + band highlight + last-value labels) es un caso donde **ECharts brilla** y es lo que recomienda el arch doc §10.4 + la política de charts de CLAUDE.md (ECharts para vistas nuevas de alto impacto, lazy-load por ruta). **Pero ECharts NO está instalado hoy** (repo = ApexCharts + Recharts). Discovery de la task debe decidir explícitamente y reportar reuse/extend/new: **(A)** instalar `echarts` + `echarts-for-react` lazy-loaded solo en esta ruta (recomendado por el arch doc; `dataZoom` + Y invertido + band son de primera clase en ECharts) — costo: +librería (~250-400KB lazy) + primer consumer del stack; **(B)** construir sobre ApexCharts (`AppReactApexCharts` line con `yaxis.reversed=true` + `annotations` para target/band + brush para el zoom) — costo: sin librería nueva pero el crosshair multi-serie/last-value labels quedan más artesanales. **Recomendación del wireframe: opción A**, porque esta pantalla es el diferenciador y ECharts sube el tier visual sin castigar el bundle si es lazy por ruta; la decisión se toma acá (no en 1306, que hereda). Cualquiera de las dos DEBE cumplir el 11-row chart floor (Y invertido documentado en aria-label, colorblind-safe por shape, tabla fallback, keyboard, states).
- Open risks: (1) `readRankEvolution` puede devolver series ralas para keywords recién trackeadas (pocos snapshots) → el chart debe dibujar puntos escasos honestamente, no interpolar; (2) el límite de ≤8 series es de legibilidad/colorblind — si el operador agrega más, degradar con aviso, no romper; (3) device/engine deben propagarse al reader (la SERP de móvil ≠ escritorio) — parte del contrato de `readRankEvolution`.
- Follow-up: al aprobar el `product-design-loop`, referenciar PNG en Meta y subir `UI ready` a `yes` con task-lint limpio. Drill `?url=X` puede evolucionar a una vista dedicada de una URL (histórico + queries que la traen) — follow-up posterior.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit (gap de serie marcado, nunca 0 interpolado).
- [ ] No copy implies a guarantee when data is estimated (leyenda ●medido/◑estimado + latencia + honestidad de series ralas).
- [ ] Charts have table/text alternatives (`role="img"` + aria-label con inversión + toggle "Ver tabla" + la propia tabla de detalle).
- [ ] State and aria copy is ready for implementation (incluye la inversión de posición).
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file (incl. deep-link con `?urls=`).
- [ ] Design decision log explains reuse/extend/new before JSX starts (incl. la decisión ECharts-vs-Apex, tomada acá).
