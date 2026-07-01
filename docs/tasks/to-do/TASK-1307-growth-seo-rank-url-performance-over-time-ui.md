# TASK-1307 — Growth SEO: Rank & URL Performance Over Time UI ★

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1307-growth-seo-rank-url-performance-over-time-ui.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|seo|ui|dataviz`
- Blocked by: `TASK-1306`
- Branch: `task/TASK-1307-growth-seo-rank-url-performance-over-time-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye `/admin/growth/seo/performance` — la **feature ancla** del módulo SEO: la película de evolución temporal de un set elegido de URLs/keywords de un Space. Responde "¿cómo rinde este set de URLs/keywords y cómo evoluciona?" con un **line chart multi-serie de eje Y de posición invertido** (1 arriba = mejor), 1 línea por URL/keyword (colorblind-safe por line-style + marker), target line "meta top-3", band highlight de eventos de algoritmo, `dataZoom` temporal, crosshair + tooltip multi-serie y last-value labels — más una **tabla TanStack (`DataTableShell`)** debajo con Pos actual, Δ30d, clics/impresiones/CTR y mini-sparkline por fila, con drill `?url=X`. La selección de set es **compartible** vía `?urls=`/`?keywords=`. Cliente puro de `readRankEvolution` (Full API Parity).

## Why This Task Exists

El arch doc §10.3 declara esta pantalla como la **feature ancla** del módulo SEO, y §11/§10.4 la ponen al centro del pull comercial: "el gráfico de URLs 8→3 mientras estuvo con Efeonce = la conversación de renovación" (caso Berel). El AEO grader mide si las IA te citan (episódico); esto mide **cómo evoluciona tu rank en el tiempo** (la película continua) — la mitad que hoy falta. Es el diferenciador de recurrencia del EPIC-022. Sin esta surface, `readRankEvolution` existe pero el operador no puede ver la evolución comparada de un set ni compartir la vista.

## Goal

- Crear `/admin/growth/seo/performance` como child de la surface SEO (viewCode compartido `administracion.growth_seo`), alcanzable desde la tab **Rendimiento** de "Search Visibility".
- Renderizar el chart temporal multi-serie con eje Y de posición **invertido** (documentado en aria-label), target line, band de eventos, `dataZoom`, crosshair multi-serie, last-value labels — colorblind-safe por line-style + marker.
- Selector de set (toggle Por URL / Por keyword + multi-select + chips removibles) con selección **persistida y compartible** en `?urls=`/`?keywords=` (+ `?device=`/`?metric=`).
- Tabla `DataTableShell` con Pos actual / Δ30d / clics / impresiones / CTR / mini-sparkline; sortable (`aria-sort`); fila → drill `?url=`.
- **Decidir y reportar la librería de charts** (ECharts lazy vs ApexCharts) — decisión de esta task; 1306 la hereda.
- Estados honestos loading (skeleton por región) / empty (sin GSC / sin set / set sin datos) / degraded (gap de serie, nunca 0 interpolado) / error / denied.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §10.3 (pantalla ancla), §5 (rank tracking, dos fuentes/contrato de honestidad), §10.4 (dataviz — line multi-serie Y invertido), §10.5 (estados), §7 (`readRankEvolution`).
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `CLAUDE.md` §"Charts — política canónica" (ECharts para vistas nuevas de alto impacto, lazy-load; nunca 2 librerías innecesarias).
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`

Reglas obligatorias:

- **Eje Y de posición INVERTIDO (§10.3/§10.4):** 1 arriba = mejor; "bajar de posición" = mejorar. La inversión DEBE estar documentada en el `aria-label` del chart ("posición 1 es lo mejor y está arriba") y el Δ pinta flecha abajo verde. NUNCA un Y normal (contra-intuitivo).
- **Colorblind-safe por forma, no por color:** cada serie se distingue por **line-style + marker** (dash/dot/solid + círculo/triángulo/cuadrado), no solo color. Leyenda con swatch + shape + label.
- **Honestidad de series ralas / gaps (§10.5):** una keyword recién trackeada tiene pocos snapshots → dibujar puntos escasos honestamente, **NUNCA interpolar un 0/valor falso**. Serie con gap (proveedor lento) se dibuja hasta donde hay dato + marca el hueco (`observeAndDegrade`).
- **Medido (GSC) vs estimado (DataForSEO):** leyenda ●/◑ + latencia explícita; device/engine afectan la SERP consultada (móvil ≠ escritorio) y se propagan al reader.
- **Read-only:** sin commands; la selección de set = query params, no lógica de negocio local.
- **Tabla densa (>6 cols + sort + sparkline) → `DataTableShell` obligatorio**, NO MUI `<Table>` crudo (regla dura UI Platform).
- Ruta admin interna → viewCode routeGroup `internal`, redirect defensivo si `client`. Copy en `src/lib/copy/growth.ts`; nav en `GH_INTERNAL_NAV`.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-1306` — Overview SEO: introduce la ruta base `/admin/growth/seo`, el viewCode `administracion.growth_seo`, `GH_INTERNAL_NAV.growthSeo` y la `CustomTabList` "Search Visibility" (esta task es la tab **Rendimiento**). **Bloqueador.**
- `TASK-1303` — `readRankEvolution(targetId,{keywords?,urls?,range,engine,device})` + `readRankSnapshotLatest` (fuente del chart y la tabla). **Bloqueador de datos reales.**
- `TASK-1301` — capabilities `growth.seo.*` + `module_assignments` (gate).

### Blocks / Impacts

- Introduce `SeoRankEvolutionChart` (el chart ★) + `SeoSetSelector` (persistencia URL) — reutilizables por TASK-1310 (cliente + report artifact) y el quadrant 360.
- La **decisión de librería de charts** (ECharts vs Apex) tomada acá fija el stack de dataviz de alto impacto del módulo SEO (1306/1308/1310 la heredan).

### Files owned

- `src/app/(dashboard)/admin/growth/seo/performance/page.tsx` [verificar route group `(dashboard)`]
- `src/views/greenhouse/admin/growth/seo/performance/SeoPerformanceView.tsx`
- `src/views/greenhouse/admin/growth/seo/performance/**` (`SeoRankEvolutionChart`, `SeoSetSelector`, `SeoMetricSelector`, `SeoPerformanceTable`)
- `src/lib/copy/growth.ts` — `GH_GROWTH_SEO_PERFORMANCE`
- `src/config/greenhouse-nomenclature.ts` — `GH_INTERNAL_NAV.growthSeoPerformance`
- `route-reachability-manifest.ts` (bajo `src/lib/`) — child route (`parent`+`via`+`reason`) (registro de alcanzabilidad, TASK-982)
- `package.json` — **solo si** Discovery decide instalar `echarts` + `echarts-for-react` (opción A)
- `scripts/frontend/scenarios/growth-seo-performance.scenario.ts` + `growth-seo-performance-mobile.scenario.ts` [verificar extensión DSL]

## Current Repo State

### Already exists

- `readRankEvolution` / `readRankSnapshotLatest` (TASK-1303) — contrato `{ series:[{key,points:[{date,position,url}]}] }`.
- Primitives: `CompositionShell`, `GreenhouseChartCard`, `DataTableShell` (TanStack), `GreenhouseChip` (con `onDelete`), `@core/components/mui/Autocomplete`, `GreenhouseKpiDelta`, `MetricTrendCard` (patrón mini-sparkline Recharts), `GreenhouseBreadcrumbs`, `GreenhouseLoadingSurface`, `EmptyState`.
- `AppReactApexCharts` (`src/libs/styles/AppReactApexCharts.tsx`) — wrapper Apex vigente.
- Ruta base `/admin/growth/seo` + tabs "Search Visibility" (TASK-1306).

### Gap

- No existe `/admin/growth/seo/performance` ni el chart temporal multi-serie.
- **ECharts NO está instalado** (repo = ApexCharts 3.49 + Recharts 3.6); la decisión de librería para el chart ancla es de esta task.
- `readRankEvolution` puede no exponer `urls` como filtro (hoy el contrato del §7 lista `keywords?`) — Discovery debe confirmar el eje URL vs keyword del reader; si falta el filtro por URL, es un delta de coordinación con TASK-1303 (no re-implementar el reader acá).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Efeonce Growth/Marketing Ops.
- Momento del flujo: análisis de rendimiento de un set de URLs/keywords en el tiempo — post cambio de contenido, armado de SOW, evidencia de renovación.
- Resultado perceptible esperado: el operador ve la evolución comparada del set (la película), lee la pendiente contra la meta top-3, y comparte la vista por URL.
- Friccion que debe reducir: reconstruir a mano la evolución de rank desde exports de GSC/DataForSEO.
- No-goals UX: editar el set trackeado, recomputar métricas, mezclar Spaces, keyword-research scatter (TASK-1308), backlinks/audit.

### Surface & system decision

- Surface: `/admin/growth/seo/performance` — tab **Rendimiento** de "Search Visibility"; child del viewCode `administracion.growth_seo`. Ruta admin interna, redirect defensivo si `client`.
- Composition Shell: `aplica` — `composition='single'`; layout vertical toolbar → tabs → selector de set → chart → tabla.
- Primitive decision: `reuse` — CompositionShell, GreenhouseChartCard, DataTableShell, GreenhouseChip, `@core/.../Autocomplete`, GreenhouseKpiDelta, GreenhouseBreadcrumbs, GreenhouseLoadingSurface, EmptyState. **Ninguna primitive de Design System nueva.** El motor del chart (ECharts vs Apex) es la única decisión de librería.
- Adaptive density / The Seam: `aplica` — en mobile el chart condensa eje/legend y la tabla usa scroll interno del `DataTableShell` (contención horizontal), nunca empuja la página.
- Floating/Sidecar/Dialog decision: N/A — sin sidecar/drawer/modal (por eso `Flow: none`). El drill de fila navega a `?url=X` (misma superficie con serie filtrada / follow-up vista dedicada), no un overlay.
- Copy source: `src/lib/copy/growth.ts::GH_GROWTH_SEO_PERFORMANCE` + `GH_INTERNAL_NAV.growthSeoPerformance` (invocar `greenhouse-ux-writing`, es-CL).
- Access impact: `views|entitlements` — child route del viewCode `administracion.growth_seo` (sin viewCode nuevo) + capability `growth.seo.observation.read` + `module_assignment`. Child route en `route-reachability-manifest.ts` con `parent`+`via`+`reason` (TASK-982).

### State inventory

- Default: chart multi-serie + tabla; set activo en chips + reflejado en la URL.
- Loading: **skeleton por región** (toolbar+tabs instantáneos → skeleton chart tamaño-final → skeleton tabla; Suspense boundaries, nunca spinner de página).
- Empty (sin GSC): `EmptyState` accionable + CTA `Conectar Search Console` — nunca ceros fantasma.
- Empty (sin set elegido): "Elige URLs o keywords para comparar" + foco al selector (estado inicial legítimo).
- Empty (set sin datos en el rango): filtered-empty "No hay datos para este set en {rango}" + `Ampliar período`.
- Error: reader falla → "No pudimos cargar la evolución" + Reintentar (actionable=true).
- Degraded / partial: gap de serie (proveedor lento) → banner + serie dibujada hasta donde hay dato + hueco marcado; **NUNCA interpolar 0** (`observeAndDegrade`).
- Permission denied: sin `growth.seo.observation.read` / sin `module_assignment` → sin Reintentar (actionable=false).
- Long content: tabla con scroll interno; chart condensa; sin scroll horizontal de página.
- Mobile / compact: chart + tabla apilados; selector de set colapsa; chips wrap.
- Keyboard / focus: orden toolbar→tabs→set→métrica→chart→tabla; agregar/quitar del set mantiene foco en el selector + `aria-live` "{n} series en comparación"; drill de fila con Enter.
- Reduced motion: entrada del chart y transiciones de dataZoom sin animación (render directo); sparklines sin animación.

### Interaction contract

- Primary interaction: elegir modo (URL/keyword) → agregar series al set → leer la evolución → drillear una fila.
- Hover / focus / active: crosshair + tooltip multi-serie en hover **y focus** (a11y); filas de tabla con hover; chips con `onDelete` focuseable.
- Pending / disabled: al cambiar set/rango/device, skeleton del chart mientras re-fetch; límite de ≤8 series (deshabilita agregar más + aviso).
- Escape / click-away: cerrar el dropdown del multi-select con Escape; N/A overlay.
- Focus restore: al quitar un chip, foco al siguiente chip o al selector.
- Latency feedback: freshness chip ("GSC: datos hasta {as_of}"); skeleton del chart en re-fetch.
- Toast / alert behavior: degradación como banner persistente (no toast); sin toasts de éxito (read-only).

### Motion & microinteractions

- Motion primitive: `CSS` + entrada del chart nativa de la librería (deshabilitable) + sparklines Recharts.
- Enter / exit: entrada ligera del chart/tabla; sin morph (composición singleton) → `Motion: none`.
- Layout morph: card-density condensa en mobile (no motion no-trivial).
- Stagger: N/A.
- Timing / easing token: tokens del design system; animación del chart ≤ 400 ms (no retrasar comprensión).
- Reduced-motion fallback: chart/dataZoom/sparklines sin animación; render del estado final directo.
- Non-goal motion: animación decorativa que retrase la lectura de la serie.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/performance/page.tsx` (server: guard doble puerta + `module_assignment` + redirect defensivo si `client`; lee `?urls=`/`?keywords=`/`?device=`/`?metric=` de `searchParams` para hidratar estado inicial compartible). View: `src/views/greenhouse/admin/growth/seo/performance/SeoPerformanceView.tsx` (`'use client'`).
- Primitive / variant / kind: CompositionShell `single`; GreenhouseChip set `variant='outlined'`+`onDelete`, leyenda `variant='label'`; GreenhouseKpiDelta con semántica invertida para posición; DataTableShell (sort + sparkline embebido).
- Component candidates: `SeoRankEvolutionChart` (★, en `GreenhouseChartCard`), `SeoSetSelector`, `SeoMetricSelector`, `SeoPerformanceTable`, reuso de `SeoSearchVisibilityTabs` (de 1306).
- Copy source: `GH_GROWTH_SEO_PERFORMANCE` + `GH_INTERNAL_NAV.growthSeoPerformance`.
- Data reader / command: `readRankEvolution(targetId,{keywords?,urls?,range,engine,device})` + `readRankSnapshotLatest` (TASK-1303). Read-only.
- API parity: cliente puro del reader `src/lib/growth/seo/**`; Nexa/MCP lo consumen igual; la selección = query params.
- Access / capability: viewCode `administracion.growth_seo` (compartido) + `growth.seo.observation.read` + `module_assignment`; child route en reachability.
- States to implement: default, loading (por región), empty (sin GSC / sin set / set sin datos), error, degraded (gap serie), denied, mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-performance.scenario.ts` + `growth-seo-performance-mobile.scenario.ts`.
- Route: `/admin/growth/seo/performance?urls=/latex,/esmalte&device=mobile&metric=position` (agent auth superadmin; Grupo Berel staging).
- Viewports: desktop 1440×900 + mobile 390×844.
- Required steps: cargar con set en URL → esperar `[data-capture="seo-performance-chart"]` → capturar default → agregar serie vía selector → capturar → scenario aparte sin set → empty-noset → forzar degraded.
- Required captures: default (multi-serie + tabla), empty (sin set), empty (sin GSC), degraded (gap serie), denied, mobile.
- Required `data-capture` markers: `seo-performance-toolbar`, `seo-performance-tabs`, `seo-performance-set`, `seo-performance-metric`, `seo-performance-chart`, `seo-performance-table`, `seo-performance-empty-noset`, `seo-performance-empty-nogsc`, `seo-performance-degraded`, `seo-performance-denied`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, chart con `role="img"` + aria-label "1 es lo mejor", chips = los de `?urls=`, tabla con `aria-sort`.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px (tabla con scroll interno, chart condensa).
- Reduced-motion / focus evidence: chart/dataZoom/sparklines sin animación con `prefers-reduced-motion`; orden de foco + drill con Enter + `aria-live` al cambiar set.

### Design decision log

- Decision: line multi-serie temporal con **Y de posición invertido**, 1 línea/serie (colorblind-safe por line-style+marker), target line "meta top-3", band de eventos, `dataZoom`, crosshair multi-serie, last-value labels + tabla `DataTableShell` con Δ30d + sparkline; set compartible en `?urls=`/`?keywords=`.
- Alternatives considered: Y normal (contra-intuitivo, rechazado); small multiples (rechazado para el caso base — la comparación lado-a-lado en un eje común ES el valor; follow-up si N crece); tooltip como única lectura (rechazado — la tabla es el fallback tabular obligatorio).
- Why this pattern: es la feature ancla (§10.3), la película que justifica la recurrencia comercial; el encoding (posición por-serie en escala común invertida) es el más preciso (Cleveland & McGill) y responde exactamente "¿cómo evoluciona este set?".
- Reuse / extend / new primitive: reuse total de primitives Greenhouse; componentes locales son composición.
- **Charts — decisión de librería (LA decisión de esta task):** el chart ancla (Y invertido + `dataZoom` + crosshair multi-serie + band + last-value labels) es un caso donde **ECharts brilla** y lo recomienda el arch doc §10.4 + política CLAUDE.md (ECharts para alto impacto, lazy por ruta). **ECharts NO está instalado hoy.** Discovery decide y reporta reuse/extend/new: **(A) recomendada** — instalar `echarts` + `echarts-for-react` lazy-loaded solo en esta ruta (`dataZoom`/Y-invertido/band de primera clase; +~250-400KB lazy, primer consumer del stack); **(B)** construir sobre ApexCharts (`yaxis.reversed=true` + annotations target/band + brush zoom; sin librería nueva pero crosshair multi-serie/last-value más artesanales). Ambas DEBEN cumplir el 11-row chart floor. La decisión se toma acá; 1306/1308/1310 la heredan.
- Open risks: (1) series ralas de keywords nuevas → dibujar honestamente sin interpolar; (2) límite ≤8 series (legibilidad/colorblind) → degradar con aviso, no romper; (3) device/engine deben propagarse al reader (SERP móvil ≠ escritorio); (4) el reader `readRankEvolution` debe soportar filtro por URL además de keyword (coordinar con TASK-1303 si falta).
- Follow-up: al aprobar `product-design-loop`, referenciar PNG + subir `UI ready` a `yes`. Drill `?url=X` puede evolucionar a vista dedicada de una URL (histórico + queries que la traen).

### Visual verification

- GVC scenario: `growth-seo-performance`
- Viewports: desktop + 390px.
- Required captures: default (multi-serie + tabla), empty (sin set), empty (sin GSC), degraded (gap serie), denied, mobile.
- Required `data-capture` markers: los 10 del GVC scenario plan.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: chart `role="img"` + aria-label invertido, toggle "Ver tabla de datos", `aria-sort` en columnas, drill con Enter, `aria-live` al cambiar set.
- Before/after evidence: N/A página nueva.
- Known visual debt: decisión de librería de charts (A/B) + hereda el route shell admin.

## Backend/Data Contract

> `Backend impact: none` real — esta task NO crea contrato backend; es cliente puro de `readRankEvolution`/`readRankSnapshotLatest` (TASK-1303). No hay migración propia (la ruta es child del viewCode ya sembrado por TASK-1306). Se documenta por completitud del gate.

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader` (consumo)
- Source of truth afectado: ninguno; consume `readRankEvolution`/`readRankSnapshotLatest`.
- Consumidores afectados: UI Performance SEO.
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: `readRankEvolution(targetId,{keywords?,urls?,range,engine,device})` → `{ series:[{key,points:[{date,position,url}]}] }` + shape `{ ok, ... } | { ok:false, errorCode, status }`.
- Contrato nuevo o modificado: ninguno. **Nota de coordinación:** si el reader no soporta filtro por URL (solo keyword), es un delta de TASK-1303, NO se implementa acá.
- Backward compatibility: `not applicable`
- Full API parity: la UI es cliente del reader; Nexa/MCP consumen el mismo; selección = query params.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (read-only; sin migración propia).
- Invariantes que no se pueden romper: Y de posición invertido documentado; **nunca interpolar valores en gaps**; colorblind-safe por forma; medido vs estimado honesto; read-only.
- Tenant/space boundary: interno/admin + `module_assignment`; NUNCA `client_*`.
- Idempotency/concurrency: N/A (read-only).
- Audit/outbox/history: N/A.

### Migration, backfill and rollout

- Migration posture: `none` (child del viewCode de TASK-1306).
- Default state: ruta oculta/denied hasta grant + `module_assignment`; flag `GROWTH_SEO_ENABLED` default OFF.
- Backfill plan: none.
- Rollback path: revert route/nav (child) + revocar assignment.
- External coordination: TASK-1303 (`readRankEvolution` con filtro por URL) + TASK-1306 (ruta base + tabs).

### Security and access

- Auth/access gate: session interna + viewCode `administracion.growth_seo` + `growth.seo.observation.read` + `module_assignment`.
- Sensitive data posture: datos SEO del Space (no PII); interno.
- Error contract: canonical error → estados UI sanitizados (retriable vs estructural con `actionable`).
- Abuse/rate-limit posture: interno autenticado; el chart relee snapshots (no dispara DataForSEO por-view — §1.1), sin superficie de abuso.

### Runtime evidence

- Local checks: UI/focal tests + `pnpm local:check:ui`.
- DB/runtime checks: `readRankEvolution` responde series reales de Berel (staging); series ralas dibujadas sin interpolar.
- Integration checks: `?urls=`/`?keywords=`/`?device=`/`?metric=` hidratan el estado; drill `?url=` navega.
- Reliability signals/logs: revisar `seo.rank.capture_lag` (frescura de snapshots).
- Production verification sequence: staging Berel primero; prod vía rollout EPIC-022.

### Acceptance criteria additions

- [ ] Source of truth (`readRankEvolution`/`readRankSnapshotLatest`), contract surface y consumers nombrados con paths reales.
- [ ] Invariantes (Y invertido, no interpolar gaps, colorblind-safe, read-only), tenant boundary y posture read-only explícitos.
- [ ] Migration/rollback posture explícito (none propia; child del viewCode 1306; flag OFF).
- [ ] Runtime/DB evidence listada (series reales de Berel + gaps honestos en staging).
- [ ] No raw data leaks; interno; canonical errors mapeados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Decisión de librería de charts + spike del chart ancla

- Discovery: decidir ECharts (opción A, recomendada) vs ApexCharts (opción B) para el line multi-serie Y-invertido + dataZoom + band. Reportar reuse/extend/new + costo de bundle (lazy).
- Spike mínimo del `SeoRankEvolutionChart` con datos mock: Y invertido, target line, band, dataZoom, crosshair multi-serie, last-value labels, colorblind-safe por line-style+marker. Confirmar 11-row chart floor + `role="img"` + toggle "Ver tabla".

### Slice 1 — Ruta + selector de set + estados base

- Crear `/admin/growth/seo/performance` (child del viewCode `administracion.growth_seo`; guard + redirect defensivo; lee `?urls=/?keywords=/?device=/?metric=`).
- `SeoSetSelector` (toggle Por URL/keyword + `@core/.../Autocomplete` multiple + chips `onDelete`) con persistencia en query params (compartible) + límite ≤8 series.
- `SeoMetricSelector` (Posición default / Clics / Impresiones / CTR).
- `GH_INTERNAL_NAV.growthSeoPerformance` + child en `route-reachability-manifest.ts` + tab **Rendimiento** activa.
- Estados loading (por región) / empty (sin GSC + CTA / sin set / set sin datos) / error / denied.

### Slice 2 — Chart temporal multi-serie

- `SeoRankEvolutionChart` en `GreenhouseChartCard`: Y invertido para posición (Y desde 0 para clics/impr/CTR), 1 línea/serie colorblind-safe, target line "meta top-3", band de eventos, `dataZoom`, crosshair + tooltip multi-serie, last-value labels.
- Toggle "Ver tabla de datos" (fallback `<table>`); `role="img"` + aria-label con el insight + la inversión.

### Slice 3 — Tabla de detalle + drill

- `SeoPerformanceTable` (`DataTableShell`/TanStack): URL/Keyword | Pos actual | Δ30d | Clics | Impr | CTR | mini-sparkline; sortable (`aria-sort`); fila → drill `?url=X`.
- Δ30d con `GreenhouseKpiDelta` + semántica invertida para posición.

### Slice 4 — Degradación honesta + GVC + a11y

- Series ralas / gaps dibujados sin interpolar + banner honesto (`observeAndDegrade`).
- Scenario GVC desktop/mobile con estados clave; scroll-width, focus, movimiento reducido (WCAG 2.3.3), axe, enlace compartible `?urls=`.

## Out of Scope

- Readers/commands backend (TASK-1299…1305); en particular NO re-implementar `readRankEvolution` — si falta el filtro por URL, coordinar con TASK-1303.
- Editar el set trackeado / config de keywords/targets (commands backend + follow-up).
- Keyword-research scatter (TASK-1308), auditoría (TASK-1309), cliente/report artifact + quadrant 360 (TASK-1310).
- Vista dedicada por-URL (el drill `?url=` es filtro; la vista dedicada es follow-up).
- Mezclar más de un Space; instalar 2 librerías de charts (solo la elegida en Slice 0).

## Detailed Spec

La surface es un **consumer read-only** de `readRankEvolution`/`readRankSnapshotLatest`. El corazón es el **chart temporal multi-serie con eje Y de posición invertido** (§10.3/§10.4): 1 arriba = mejor, para que "subir en el gráfico" signifique "mejorar". Cada serie (URL o keyword) se distingue por line-style + marker (colorblind-safe incluso monocromo), no solo color. Una target line "meta top-3", un band highlight de eventos de algoritmo, `dataZoom` temporal, crosshair + tooltip multi-serie y last-value labels completan la lectura. Debajo, la tabla `DataTableShell` es a la vez el detalle accionable y el **fallback tabular** de la serie.

Puntos load-bearing:

- **Inversión documentada:** el aria-label del chart declara "posición 1 es lo mejor y está arriba"; el Δ pinta flecha abajo verde para mejora de posición. Es el estándar de rank-tracking (Semrush/Ahrefs); un Y normal confunde.
- **Honestidad de gaps (§10.5):** keywords nuevas con pocos snapshots se dibujan con puntos escasos; series con hueco (proveedor lento) se dibujan hasta donde hay dato + marcan el gap. **NUNCA interpolar un 0/valor falso** — es una mentira de dato.
- **Compartibilidad:** la selección de set vive en `?urls=`/`?keywords=` (+ `?device=`/`?metric=`) → enlace compartible, back/forward del browser funciona, estado en la URL (IA info-architecture: query params para estado).
- **Decisión de librería:** ECharts (recomendada, lazy por ruta) vs Apex; tomada en Slice 0 y heredada por el resto del módulo. Ambas cumplen el 11-row chart floor.
- **Read-only + boundary §1.1:** sin commands; el chart relee snapshots materializados, NO dispara DataForSEO per-view.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (decisión librería) → Slice 1 (ruta + selector + estados) → Slice 2 (chart) → Slice 3 (tabla) → Slice 4 (degradación + GVC). No pintar el chart antes de decidir la librería y tener estados empty/error/denied.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Interpolar valores en gaps (mentira de dato) | correctness/trust | medium | dibujar puntos escasos honestamente; marcar el hueco; nunca 0 | GVC degraded + focal test |
| Y de posición no invertido (contra-intuitivo) | UX | medium | `yaxis.reversed`/inverted + aria-label + flecha abajo verde | GVC + a11y |
| Chart ilegible en colorblind (solo color) | a11y | medium | line-style + marker por serie; leyenda con shape | axe + revisión colorblind |
| Segunda librería de charts (bundle) | perf | medium | ECharts lazy por ruta O reuse Apex; solo la elegida | bundle analyzer |
| Overflow mobile (chart/tabla densa) | UI | medium | card-density + scroll interno DataTableShell + scroll-width check | GVC 390px |
| `readRankEvolution` sin filtro por URL | resiliencia/coord | medium | coordinar con TASK-1303; no re-implementar reader | Discovery |
| Set >8 series rompe legibilidad | UX | low | límite ≤8 + aviso, no romper | GVC |

### Feature flags / cutover

- Gated por `GROWTH_SEO_ENABLED` (EPIC-022, default OFF, `FEATURE_FLAG_STATE_LEDGER.md`) + viewCode `administracion.growth_seo` + capability + `module_assignment`.
- Tab **Rendimiento** oculta hasta que TASK-1306/1303 estén desplegadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | descartar spike / revert dependencia echarts en package.json | <10 min | sí |
| Slice 1 | revert route/nav (child) + selector | <5 min | sí |
| Slice 2 | revert chart | <5 min | sí |
| Slice 3 | revert tabla | <5 min | sí |
| Slice 4 | revert degradación/polish | <5 min | sí |

### Production verification sequence

1. Staging con Grupo Berel (GSC + snapshots de rank) + `module_assignment`.
2. Operador con capability abre `?urls=/latex,/esmalte` → chart multi-serie Y-invertido + tabla.
3. Agregar/quitar series → URL cambia (compartible); drill de fila → `?url=`.
4. Simular gap de serie → dibujo honesto sin interpolar + banner.
5. GVC desktop/mobile mirado (default/empty/degraded/denied) + deep-link.

### Out-of-band coordination required

- TASK-1303: `readRankEvolution` con filtro por URL + engine/device.
- TASK-1306: ruta base + tabs "Search Visibility".
- Flag `GROWTH_SEO_ENABLED` en los targets del rollout.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: interaction`.
- [ ] Ruta `/admin/growth/seo/performance` alcanzable desde la tab **Rendimiento**; child del viewCode `administracion.growth_seo` + capability `growth.seo.observation.read` + `module_assignment`; redirect defensivo si `client`.
- [ ] Chart temporal multi-serie con **eje Y de posición invertido** (1 arriba = mejor), documentado en `aria-label` ("posición 1 es lo mejor, arriba"); Δ de posición con flecha abajo verde.
- [ ] 1 línea por URL/keyword **colorblind-safe por line-style + marker** (no solo color); leyenda con swatch + shape + label.
- [ ] Target line "meta top-3", band highlight de eventos, `dataZoom` temporal, crosshair + tooltip multi-serie, last-value labels.
- [ ] Selección de set persistida y **compartible** en `?urls=`/`?keywords=` (+ `?device=`/`?metric=`); back/forward del browser funciona.
- [ ] Tabla `DataTableShell` (>6 cols + sort `aria-sort` + mini-sparkline) — NO MUI `<Table>` crudo; fila → drill `?url=X`.
- [ ] Toggle "Ver tabla de datos" (fallback `<table>`) + la tabla de detalle como fallback tabular; `role="img"` en el chart.
- [ ] Estados sin-GSC (EmptyState + CTA, sin ceros fantasma) / sin-set / set-sin-datos / degraded (gap **sin interpolar**) / error / denied / mobile — cubiertos.
- [ ] **Decisión de librería de charts reportada** (ECharts lazy vs Apex) con reuse/extend/new + costo de bundle; solo la elegida instalada.
- [ ] La UI es **read-only** consumer de `readRankEvolution`; cero lógica de negocio local; no dispara DataForSEO per-view.
- [ ] Leyenda ●medido (GSC) / ◑estimado (DataForSEO) + latencia; device/engine propagados al reader.
- [ ] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_PERFORMANCE`); nav en `GH_INTERNAL_NAV`.
- [ ] GVC desktop+mobile capturado y mirado **en loop** (incl. enlace compartible `?urls=`); `scrollWidth==clientWidth` desktop + 390px; axe verde.
- [ ] Focus/keyboard validados; bajo movimiento reducido (WCAG 2.3.3) chart/dataZoom/sparklines renderizan el estado final directo, sin efecto cinemático; drill con Enter; `aria-live` al cambiar set.
- [ ] Child route en `route-reachability-manifest.ts` (`parent`+`via`+`reason`); cumple 11-row chart floor.
- [ ] `UI ready` permanece `no` hasta que wireframe + `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log (ya presentes); `yes` solo con task-lint sin findings + dirección visual aprobada.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-performance --env=staging`
- `pnpm task:lint --task TASK-1307`
- `pnpm ui:wireframe-check --task TASK-1307`
- `pnpm ui:readiness-check --task TASK-1307`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si se toca
- [ ] decisión de librería de charts documentada (ADR corto o nota en el módulo si se instala ECharts)

## Follow-ups

- Vista dedicada por-URL (histórico + queries que traen la URL + evolución de esa URL específica).
- Small multiples cuando el set crece más allá de ~8 series.
- Documentación funcional + manual del módulo (exit criteria EPIC-022 — triple doc).
- Reuso de `SeoRankEvolutionChart` en el report artifact cliente (TASK-1310).

## Open Questions

1. ¿`readRankEvolution` soporta filtro por **URL** además de keyword? Si no, coordinar con TASK-1303 (delta backend, no re-implementar acá).
2. ¿La librería de charts es ECharts (opción A, recomendada) o ApexCharts (opción B)? Se decide en Slice 0; fija el stack de dataviz de alto impacto del módulo.
3. ¿El drill `?url=X` filtra la serie en la misma vista o abre una vista dedicada? Propuesta: filtra en la misma vista ahora; vista dedicada = follow-up.
