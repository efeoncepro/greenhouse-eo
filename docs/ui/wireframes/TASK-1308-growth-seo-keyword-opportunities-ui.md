# TASK-1308 / `/admin/growth/seo/keywords` — Keyword Opportunities

> ## Rediseño 2026-08-07 (post-GVC) — "el veredicto primero"
>
> La primera implementación pasó los cuatro gates **y aun así se veía mal**. El diagnóstico
> salió de mirar el frame, no el código: la pantalla **dibujaba los datos sin decir lo que
> significan**, y gastaba seis bandas de chrome antes del primer dato.
>
> Dirección versionada:
> [`docs/ui/visual-directions/TASK-1308-…-direction.md`](../visual-directions/TASK-1308-growth-seo-keyword-opportunities-direction.md).
>
> **Cambios sobre el layout de este wireframe:**
>
> | Antes | Ahora | Por qué |
> |---|---|---|
> | Header con título + selectores en la misma fila | Título a todo el ancho + **una barra** con tabs y selectores | Space (220px) + Ventana (180px) no cabían en los ~390px sobrantes: envolvían y dejaban un vacío enorme al lado del título |
> | `Alert` full-width "mercado no disponible" sobre el fold | **Nota al pie del mapa** | La honestidad se mide por si el dato está dicho, no por el tamaño del recuadro |
> | Fila de chips ● Medido / ◑ Estimado | Integrada en esa misma nota | Una banda entera para un metadato |
> | Leyenda de formas dentro del chart + select "Acción" en filtros | **Banda de veredicto**: los tres segmentos son leyenda y filtro a la vez | Eran dos objetos para una sola idea |
> | (no existía) | **Titular del hallazgo** redactado desde el reparto real | 42 de 50 son de consolidación: eso cambia el trabajo de la semana y vivía como un número al final de una leyenda |
> | Scatter sin etiquetas, tamaño 10→42px | **5 keywords etiquetadas** en el lienzo, tamaño 9→22px | Un scatter de 50 puntos anónimos no es accionable (regla dura de dataviz: el tooltip nunca es la única forma de leer un valor). Y con ganancias de 0–10 clics, el rango grande fingía una precisión que el dato no tiene |
> | Eje log auto-escalado | **Cotas explícitas** derivadas de los datos ±30% | El auto-scale del eje log redondea a DÉCADAS: con 89–1377 elegía 10→10.000 y el 40% del alto quedaba vacío |
>
> De seis bandas de chrome antes del primer dato, a tres.


> ## ⚠️ Recalibración 2026-08-07 (implementación) — los ejes de este wireframe no son los correctos
>
> _Actualizado 2026-08-14: la premisa de ausencia expiró; la decisión no. Ver el bloque siguiente._
>
> Este documento especifica el scatter como **X = dificultad, Y = volumen, color = intención**
> y una tabla con columnas de volumen/dificultad. Al implementar (2026-08-07) se verificó contra el
> contrato de entonces: `readKeywordOpportunities` devolvía `searchVolume: null`, `difficulty: null`,
> `market: 'unavailable'` y no había campo de intención. **Eso dejó de ser cierto con TASK-1661**
> (ver el bloque de abajo); lo que se mantiene íntegro es la decisión de encoding, que no dependía
> de la ausencia.
>
> **Lo implementado** (consultada la skill `seo-aeo` §02, método verificado contra la API real
> de GSC, que lista priorizar por volumen estimado teniendo el GSC propio como un *error*):
>
> | Wireframe | Implementado | Por qué |
> |---|---|---|
> | X = dificultad | **X = posición ponderada** (8→20 fijo) | Medido. Izquierda = más cerca de la primera plana |
> | Y = volumen (mercado) | **Y = impresiones** (log) | Demanda MEDIDA de la SERP propia, mejor dato que un promedio de mercado |
> | size = clicks | **size = clics incrementales estimados** (área ∝ ganancia) | El score del reader ya está en clics, no en un índice |
> | color = intención | **color + FORMA = acción** (Empujar / A un paso / Consolidar) | Lo que decide el trabajo es la ACCIÓN, no la intención declarada |
> | facet intención | **facet acción** | ídem |
> | slider dificultad | **facet posición** (primera/segunda plana) | La posición es medida; la dificultad del proveedor no es un eje honesto |
> | col. Volumen / Dificultad | se conservan; en 2026-08-07 con estado **"Sin dato de mercado"** | Ni `0` ni guion ambiguo (Delta 2026-08-05 de la task) |
>
> 🎯 **Decisión de fondo (vigente, y confirmada por el runtime):** el dato de mercado **NO es un
> eje — es una columna y un filtro**. Los ejes medidos son correctos con o sin él, así que la
> llegada del enriquecimiento no obligó a reescribir esta pantalla.
>
> ⚠️ **Canibalización quedó como ACCIÓN con verbo propio ("Consolidar"), no como chip
> decorativo** — como ya pedía el Delta 2026-08-05 de la task.
>
> El resto del wireframe (layout, estados, contrato de a11y, copy ledger, plan GVC) se
> implementó como está escrito.


> ## ✅ Delta 2026-08-14 (TASK-1661) — el dato de mercado llegó; la decisión de encoding se sostuvo
>
> El bloque de arriba se escribió cuando no existía fuente de mercado. **Ya existe**:
> `greenhouse_growth.seo_keyword_market_data` persiste `search_volume`, `keyword_difficulty`,
> `search_intent`, `search_intent_probability` y el perfil de enlaces del top-10, cada fila con su
> fecha de captura, y `readKeywordOpportunities` devuelve `market: 'available' | 'unavailable'`.
>
> **Qué cambia en la pantalla:**
>
> - Las columnas **Volumen** y **Barrera de enlaces** se renderizan cuando `market === 'available'`.
>   No renderizarlas sigue siendo lo correcto **solo** cuando es `'unavailable'`.
> - La segunda columna se llama **"Barrera de enlaces", nunca "Dificultad"** (ISSUE-152), y se
>   muestra en niveles **Baja / Media / Alta**, jamás como número. El nivel lo deriva el server
>   (`deriveLinkBarrier`) del perfil de enlaces real del top-10 — diversidad de dominios referentes +
>   page rank —, no del `keyword_difficulty` crudo, que en LATAM colapsa a 0 y se leería "trivial".
>   **"Baja" = se compite con contenido y autoridad, no con enlaces**: oportunidad, no trivialidad.
> - `unknown` se pinta **"Sin dato"**, nunca "Baja" y nunca `0`.
>
> **Qué NO cambia — y por eso este delta no reescribe el wireframe:** el scatter sigue con encoding
> **medido** (X = posición ponderada, Y = impresiones log, tamaño = clics incrementales, color+forma =
> acción), el orden de la tabla sigue saliendo de la ganancia estimada **cuando la curva de CTR del sitio mide en la posición objetivo; si no, del criterio declarado en `orderedBy` (TASK-1792)**, y el mercado sigue siendo
> **columna + filtro, nunca eje**. La decisión de fondo de 2026-08-07 era correcta con o sin dato:
> lo único que expiró fue su premisa de ausencia.
>
> **Deuda declarada:** con `market === 'available'` la pantalla no muestra hoy leyenda de origen
> (la nota `● Medido · Search Console` sólo aparece en el caso `'unavailable'`) ni el `capturedAt` del
> dato estimado. El contrato ● / ◑ del master flow §8 pide ambas cosas para lo estimado — queda como
> follow-up de UI, no como algo que este wireframe dé por hecho.


## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1308 — Growth SEO: Keyword Opportunities UI`
- Product Design asset: sin PNG dedicado — dirección derivada del contrato de dataviz arch §10.4 (scatter oportunidad) + patrón cockpit operador del master flow EPIC-022 (S3). Charts nuevos ECharts (arch §10.4).
- Intended consumers: operador Efeonce (Growth/AM), cliente por reuse futuro; Nexa/MCP como consumer del mismo reader.
- Copy source: `src/lib/copy/growth.ts` (namespace nuevo `GH_GROWTH_SEO_KEYWORDS`, es-CL) + `getMicrocopy()` para estados/aria compartidos.
- Primitive decision: `reuse` — CompositionShell `single`, `DataTableShell`, `FilterTile`, `DebouncedInput`, `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseAsyncActionButton`; `new` acotado: adopción ECharts (`echarts-for-react`) para el scatter de oportunidad (lazy-loaded).
- UI ready target: `no`

## Brief

- Primary user: operador Growth que busca dónde expandir contenido / SOWs (arch §11: keyword research → gap accionable = motor de expansión, sube NRR).
- User moment: revisando un target SEO ya configurado, decide qué keywords perseguir y cuáles agregar al set monitoreado.
- Job to be done: leer el mapa dificultad×volumen, filtrar por intención/dificultad/posición, y **seguir** las keywords quick-win con una acción gobernada (`trackKeywords`).
- Primary decision signal: la **zona quick-win** (baja dificultad + alto volumen + alto potencial de clicks) sombreada + anotada en el scatter; y la posición actual (striking-distance 8–20 = fruta madura del `readKeywordOpportunities` join SEO↔GSC).
- Non-goals: correr keyword research nuevo on-demand (eso es costo DataForSEO, va por cron/command aparte), editar volumen/dificultad, escribir contenido, configurar el target.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Breadcrumb `Growth / Search Visibility / SEO / Keywords` + título "Oportunidades de keywords" + `Space ▾` (target picker) + `DebouncedInput` búsqueda de keyword + leyenda medido ●/estimado ◑ | `GreenhouseBreadcrumbs` + `DebouncedInput` + Space picker (existente en cockpit) | selección de `seo_target` |
| 1 | Opportunity scatter | Scatter ECharts: **X = dificultad** (0–100), **Y = volumen** (log, desde 0), **size = clicks potenciales**, **color = intención** (categórica ≤8, colorblind-safe), **zona quick-win** sombreada (rect baja-dif/alto-vol) + anotación inline "Fruta madura" | `echarts-for-react` (lazy) dentro de `GreenhouseChartCard`-like wrapper | `readKeywordOpportunities(targetId)` |
| 2 | Faceted filters | Filtros por **Intención** (chips faceted), **Dificultad** (slider 0–100), **Posición** (rangos: 1–3 / 4–7 / **8–20 striking** / 21–50 / >50) — sincronizados a query params y al scatter | `FilterTile` (faceted) + slider (forms-ux) | client filter sobre el reader |
| 3 | Opportunity table | `DataTableShell` (TanStack): Keyword \| Volumen \| Dificultad \| Posición \| Tendencia (sparkline) \| Fuente (◑ estimado + ● medido) \| **[Seguir]** | `DataTableShell` + fila con `GreenhouseAsyncActionButton` | `readKeywordOpportunities` rows |
| 4 | Feedback (transient) | Toast/inline al "Seguir" (éxito / ya seguida / error) + aria-live | `getMicrocopy().feedback` + `role=status` | `trackKeywords` command result |

**Interacción scatter↔tabla (dataviz-design):** hover en un punto del scatter → tooltip (keyword + vol + dif + pos + intención + clicks pot.) y highlight de la fila correspondiente; filtro faceted → filtra ambos a la vez. El scatter NO es la única forma de leer el valor (tabla = fallback + valores exactos).

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.seo.keywords.header.title` | 0 | Oportunidades de keywords | — | title, sentence case |
| `growth.seo.keywords.header.subtitle` | 0 | Dónde crecer en búsqueda: keywords por perseguir para {domain} | `{domain}` root_domain del target | |
| `growth.seo.keywords.search.placeholder` | 0 | Buscar keyword | — | placeholder = formato, no label |
| `growth.seo.keywords.legend.measured` | 0 | Medido (Search Console) | — | ● |
| `growth.seo.keywords.legend.estimated` | 0 | Estimado (mercado) | — | ◑ |
| `growth.seo.keywords.scatter.title` | 1 | Mapa de oportunidad | — | |
| `growth.seo.keywords.scatter.quickWin` | 1 | Fruta madura: alto volumen, baja dificultad | — | anotación de zona |
| `growth.seo.keywords.scatter.aria` | 1 | Dispersión de {count} keywords por dificultad y volumen; el tamaño indica clicks potenciales y el color la intención de búsqueda | `{count}` | aria-label del `role=img` |
| `growth.seo.keywords.filter.intent` | 2 | Intención | — | facet |
| `growth.seo.keywords.filter.difficulty` | 2 | Dificultad | — | slider |
| `growth.seo.keywords.filter.position` | 2 | Posición actual | — | facet |
| `growth.seo.keywords.filter.position.striking` | 2 | 8–20 (a un paso) | — | striking-distance |
| `growth.seo.keywords.table.col.keyword` | 3 | Keyword | — | col header |
| `growth.seo.keywords.table.col.volume` | 3 | Volumen | — | |
| `growth.seo.keywords.table.col.difficulty` | 3 | Dificultad | — | |
| `growth.seo.keywords.table.col.position` | 3 | Posición | — | |
| `growth.seo.keywords.table.col.trend` | 3 | Tendencia | — | sparkline |
| `growth.seo.keywords.table.col.source` | 3 | Fuente | — | ● / ◑ |
| `growth.seo.keywords.table.action.follow` | 3 | Seguir | — | CTA fila; verbo + implícito objeto keyword |
| `growth.seo.keywords.table.action.following` | 3 | Siguiendo | — | estado post-seguir (ya en el set) |
| `growth.seo.keywords.feedback.followed` | 4 | Ahora sigues "{keyword}". Aparecerá en tu rank tracking. | `{keyword}` | success toast |
| `growth.seo.keywords.feedback.alreadyFollowing` | 4 | Ya sigues "{keyword}". | `{keyword}` | idempotente |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | scatter + tabla poblados | — | default |
| loading | — | skeleton del scatter (rect sized) + `DataTableShell` skeleton rows | — | NO spinner de página |
| empty (sin oportunidades) | Aún no hay oportunidades | Cuando el análisis de keywords termine para {domain}, verás aquí las que puedes perseguir. | Ver configuración del target | target sin `readKeywordOpportunities` data |
| empty (filtrado) | Sin resultados para estos filtros | Ninguna keyword coincide con la intención, dificultad o posición seleccionadas. | Limpiar filtros | filtered-empty |
| partial / degraded | — | banner "Cuota de mercado agotada — mostrando solo datos medidos (Search Console)" | — | cuota DataForSEO; degrada a ● GSC |
| error | No pudimos cargar las oportunidades | Hubo un problema al leer los datos. Intenta de nuevo. | Reintentar | reader falla (actionable=true) |
| denied | Sin acceso | No tienes permiso para ver las oportunidades de este Space. | — | sin `growth.seo.observation.read`; NO botón reintentar |

## Accessibility Contract

- Heading order: `h1` título de página → `h2` "Mapa de oportunidad" (scatter) → `h2` tabla (visualmente el filtro va antes, pero el orden DOM del heading es coherente).
- Chart/table alternatives: el scatter tiene `role="img"` + `aria-label` con el insight (`growth.seo.keywords.scatter.aria`); la **tabla ES el data-table fallback completo** (mismos datos, valores exactos) — toggle "Ver tabla" innecesario porque la tabla siempre está presente debajo. Puntos del scatter no necesitan keyboard-nav individual dado el fallback de tabla, pero el color de intención SIEMPRE se pares con la columna "Intención" (label) en la tabla — nunca color solo.
- Aria labels: `DebouncedInput` con label "Buscar keyword"; slider de dificultad con `aria-valuetext`; botón "Seguir" con `aria-label="Seguir {keyword}"`.
- Focus notes: al filtrar, foco permanece en el control; al "Seguir", foco vuelve a la fila y aria-live anuncia el resultado.
- Color-independent state labels: intención = color + label en tabla; fuente = ● medido / ◑ estimado con texto en tooltip + leyenda; nunca color como único encoding (dataviz-design hard rule).

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` (server guard: viewCode SEO `internal` + capability `growth.seo.observation.read` acción `read` scope `tenant`; redirect `/login` sin tenant, `/401` sin acceso). [verificar viewCode canónico del SEO al implementar TASK-1306].
- Primitives: CompositionShell `composition='single'`, `DataTableShell`, `FilterTile`, `DebouncedInput`, `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseAsyncActionButton`.
- Variants / kinds: scatter = ECharts config (no variant de primitive); tabla `DataTableShell` densa.
- Component candidates: `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunitiesView.tsx` (client) + `KeywordOpportunityScatter.tsx` (lazy ECharts wrapper, `ssr:false`).
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS` (nuevo, es-CL, validado con `greenhouse-ux-writing`).
- Data reader / command: reader `readKeywordOpportunities(targetId)` (TASK-1302 `[verificar]` — dependencia backend, aún no existe en `src/lib/growth/seo/`); command `trackKeywords(keywordSetId, [keyword], actor)` (arch §7, TASK-1303) vía route handler admin.
- API parity: la UI es cliente del reader/command gobernado; "Seguir" NO muta estado en el componente — llama al command (propose→confirm→execute; para una acción de bajo riesgo/idempotente, execute directo tras click con confirm implícito). Nexa opera el mismo `trackKeywords` por construcción.
- Access / capability: `growth.seo.observation.read` (ver) + `growth.seo.target.configure` (Seguir); ocultar "Seguir" sin la capability de configure.
- Runtime consumers: view runtime; scatter lazy-loaded.
- Print/email/PDF considerations: N/A (surface operador interactiva).
- GVC markers: `seo-keywords-scatter`, `seo-keywords-filters`, `seo-keywords-table`, `seo-keywords-empty`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keywords.scenario.ts` (+ `.mobile`) [verificar extensión DSL vigente].
- Route: `/admin/growth/seo/keywords`.
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar ruta (agent auth operador) → esperar scatter render → aplicar un facet (intención) → mirar tabla filtrada → hover en punto (highlight).
- Required captures: default (scatter+tabla), filtrado (facet activo), empty (target sin data), degraded (banner cuota).
- Required `data-capture` markers: `seo-keywords-scatter`, `seo-keywords-filters`, `seo-keywords-table`, `seo-keywords-empty`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, scatter presente (`role=img`), tabla presente.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px (el scatter y la tabla densa NO deben desbordar horizontal — la tabla condensa columnas en mobile por `card-density`).
- Accessibility/focus checks: foco tras filtrar/seguir, aria-label del scatter, leyenda medido/estimado visible.
- Reduced-motion evidence: entrada del scatter ≤400ms; con `prefers-reduced-motion` el scatter aparece sin animación de entrada.

## Design Decision Log

- Decision: scatter ECharts (no Recharts) para el mapa de oportunidad. Alternatives considered: Recharts scatter (menor wow, pero sin zona sombreada/anotación rica). Why this pattern: arch §10.4 manda ECharts para charts de alto impacto; la zona quick-win sombreada + anotación + size/color multi-encoding es exactamente el caso de ECharts. Reuse/extend/new: **new** acotado (primer ECharts del repo, lazy-loaded; se documenta la adopción — política Charts CLAUDE.md permite ECharts para vistas nuevas de alto impacto).
- Decision: la tabla es fallback de accesibilidad permanente, no un toggle. Why: dataviz-design exige table fallback; tenerla siempre presente sirve doble propósito (valores exactos + a11y) y es el patrón cockpit denso.
- Decision: "Seguir" = command `trackKeywords`, no mutación local. Why: Full API Parity (arch §7); agregar keyword al set monitoreado afecta el rank tracking downstream (costo + estado), debe ser gobernado + auditado + operable por Nexa.
- Decision: posición 8–20 destacada como "striking distance". Why: es la fruta madura del `readKeywordOpportunities` (join SEO↔GSC, arch §7) — la mejora de mayor ROI.
- Alternatives considered (layout): scatter arriba de la tabla (elegido) vs side-by-side. Why arriba: en mobile el side-by-side desborda; el scroll vertical scatter→filtros→tabla es el patrón de lectura natural.
- Reuse / extend / new primitive: reuse total salvo ECharts (new). Open risks: `readKeywordOpportunities` (TASK-1302) debe existir antes de render con datos reales; hasta entonces el harness usa fixtures. Costo DataForSEO condiciona cuántas keywords trae el reader (arch §13).
- Follow-up: si la tabla necesita bulk "Seguir" (multi-select), evaluar en follow-up (fuera de scope V1).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{domain}`, `{keyword}`, `{count}`).
- [ ] Partial/degraded states are explicit (cuota agotada → degrada a medido).
- [ ] No copy implies a guarantee when data is estimated (◑ marcado, "Estimado (mercado)").
- [ ] Charts have table/text alternatives (tabla permanente + `role=img` aria-label).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts (ECharts = new, resto reuse).
