# TASK-1308 — Growth SEO: Keyword Opportunities UI

## Delta 2026-08-07 (cierre) — lo que la task terminó siendo

Nació como "superficie UI cliente pura" y terminó con **backend, contrato programático,
federación MCP y tres rondas de rediseño**. El resumen honesto de por qué:

| Declarado al crear | Realidad | Cierre |
|---|---|---|
| `Backend impact: none` | `trackKeywords` no existía; nadie lo había construido | `Backend impact: command` + `## Hybrid Execution Justification` |
| Scatter X=dificultad, Y=volumen, color=intención | Las tres fuentes son `null` (`market: 'unavailable'`) | Ejes medidos: posición × impresiones, tamaño = clics, forma = acción |
| "Seguir" como única acción | El techo del set era un callejón sin salida | `untrackKeywords` + su lane + su tool federada |

**El command es un compromiso de gasto diferido, no un INSERT.** El rank capture diario paga
al proveedor por cada keyword vigente, en cada ciclo. De ahí el techo gobernado, el
entitlement per-org, el outcome por keyword y —sobre todo— el reverso: sin `untrackKeywords`
el compromiso era permanente.

**Tres rondas de análisis de producto con los cuatro gates en verde desde la primera
versión.** Todo lo que se corrigió salió de mirar el frame: la pantalla no servía en móvil
(la tabla mostraba sólo nombres), la selección múltiple sobrevivía al filtro y podía gastar
sobre keywords fuera de la vista, la zona sombreada del mapa se contradecía con su propia
leyenda, y la frescura del dato había desaparecido en un rediseño intermedio. Los gates
miden contraste, overflow, tokens y tamaño de target; no miden si una etiqueta dice la
verdad ni si la pantalla sirve en un teléfono.

**Dos defectos de plataforma quedaron con parche local y su causa raíz abierta en
`TASK-1657`**: el mismatch de hidratación por `useId` dentro de surfaces adaptativas (cerrado
acá con ids declarados en los cinco controles) y los findings inevitables de `ui:code-lint`
en charts a canvas.

**Un bug que sólo apareció contra PG real** (gate TASK-893): cerrar una membresía con `NOW()`
produce `effective_to = effective_from` y revienta el CHECK `effective_to > effective_from`,
porque `NOW()` es el timestamp de inicio de transacción. Corregido con `clock_timestamp()`.
Los mocks lo daban por bueno.

### Pendiente de rollout (no de código)

- Scope `efeonce.mcp.seo.keywords.track` en la app de Entra `Efeonce MCP Resource`
  (`c5363215-b9a6-4bf1-bb1c-e61963b37dac`). Las DOS tools federadas lo comparten, así que
  hasta provisionarlo ambas responden `insufficient_scope` — fail-closed por diseño.
  ⚠️ `az ad app update` **reemplaza** el arreglo completo de scopes: va con round-trip
  verificado o borra los tres vivos de Globe.
- Push del gateway (`efeonce-mcp`, commits `cb316cc` + `41dca07`).


## Delta 2026-08-07 — ejecución: dos supuestos de la spec no resistieron el runtime

### 1. `trackKeywords` NO EXISTÍA (→ `Backend impact: none` pasa a `command`)

La spec y el wireframe lo daban por construido por TASK-1303 ("[verificar]"). No lo había
construido nadie: `seo_keyword_sets`/`_members` sólo las escribían dos scripts de seed. Se
construyó acá como Slice 0, con la forma que exige el hallazgo de arquitectura:

🔴 **Seguir una keyword es un COMPROMISO DE GASTO DIFERIDO, no un INSERT.** El write no
cuesta nada; el rank capture diario (TASK-1303) paga DataForSEO por cada keyword vigente
del set, todos los días, hasta que alguien la deje de seguir. De ahí las tres defensas que
un INSERT normal no tendría: **techo gobernado por target** (`capacity_exceeded` explícito,
nunca silencio ni excepción), **entitlement per-org** (`seo_v1` vigente; no consume
allowance de site-audit — seguir no gasta hoy, gasta mañana) y **outcome POR keyword**, que
es lo único que distingue "agregué 3" de "rebotaron 40 contra el techo".

Migración aditiva `created_by`/`source` (nullable, sin backfill): un write gobernado con
tres consumers necesita rastro de quién comprometió el gasto, y la tabla no lo tenía.

### 2. Los tres ejes del scatter no tienen fuente (→ encoding recalibrado)

El wireframe pedía X = dificultad, Y = volumen, color = intención. `readKeywordOpportunities`
devuelve `searchVolume: null`, `difficulty: null`, `market: 'unavailable'` (TASK-1300 no
aterrizó) y el contrato **no tiene campo de intención**. Pintarlos daba un lienzo vacío o
datos inventados.

Consultada la skill `seo-aeo` (§02, método verificado contra la API real de GSC): *"priorizar
por volumen estimado de un tercero teniendo el GSC propio, donde la demanda ya está medida"*
está listado como un **error**. Las impresiones de Search Console son demanda medida de la
propia SERP del cliente — mejor dato que un volumen promedio de mercado.

**Encoding vigente:** X = posición ponderada (8→20), Y = impresiones (log), tamaño = clics
incrementales estimados, color+**forma** = acción recomendada. Zona sombreada = primera plana.

🎯 **La decisión que hace esto a prueba de TASK-1300:** el dato de mercado NUNCA será un eje
— será una **columna y un filtro**. Los ejes medidos son correctos con o sin él, así que
cuando el enriquecimiento aterrice no se reescribe nada: `searchVolume`/`difficulty` ya son
`number | null` en el contrato y la tabla los pinta honestos hoy ("Sin dato de mercado",
nunca `0` ni un guion ambiguo) y reales mañana.

⚠️ **Canibalización quedó como ACCIÓN, no como variante visual** (lo que ya pedía el Delta
2026-08-05): serie propia, forma propia y verbo propio ("Consolidar" vs "Empujar"), con el
clasificador en un módulo aparte para que mapa, filtros y tabla no deriven entre sí.

### 3. Tool MCP + federación (criterio de cierre del operador)

`track_seo_keywords` creada en el MCP interno y **federada** al gateway `mcp.efeonce.org`
(repo `efeonce-mcp`, commit local `cb316cc`) con **scope propio**
`efeonce.mcp.seo.keywords.track` — no el de lectura, porque escribir cuesta. El lane
ecosystem sólo la acepta desde bindings de scope `internal`: un binding cliente lee sus
oportunidades pero no hace crecer su propia factura.

🔴 El guard de paridad del gateway **no habría visto esta tool**: su regex se ató a
`get_seo_*` cuando todas las tools eran lecturas. Se amplió al dominio.

### Pendiente de rollout

- **Scope en Entra**: `efeonce.mcp.seo.keywords.track` todavía no existe en la app
  `Efeonce MCP Resource` (`c5363215-b9a6-4bf1-bb1c-e61963b37dac`). Hasta provisionarlo la
  tool federada responde `insufficient_scope` — fail-closed por diseño.
- **Push del gateway**: commit local sin push (el repo tiene deploy productivo en push).
- **GVC**: el scenario `growth-seo-keywords` está escrito pero no se pudo correr — el dev
  server no levanta en esta máquina (el harness reporta éxito y no spawnea `next`).


## Delta 2026-08-07 — TASK-1306 cerró: la Open Question #1 queda resuelta

**Tu Open Question #1 ("¿el Space picker / viewCode de sección SEO lo establece TASK-1306 o
lo crea esta task?") está resuelta: lo estableció 1306.** Reusas, no creas.

**Servido — no lo vuelvas a construir:**

1. **Shell y conmutador ya existen.** `SeoSearchVisibilityTabs`
   (`src/views/greenhouse/admin/growth/seo/overview/`) declara las 4 tabs y propaga el
   `?space=` entre ellas. **Activar la tab "Keywords" es quitar `available: false` de su
   entrada en `TABS`** — una línea. No construyas navegación local propia.
2. **viewCode `administracion.growth_seo` sembrado** (migración `20260806223132770`) + en
   `view-access-catalog.ts` + grants a `efeonce_admin`/`ai_tooling_admin` + ítem de menú
   único (`/admin/growth/seo`). Donde tu spec dice "`[verificar]` el viewCode canónico del
   SEO al implementar" (línea de `Dependencies & Impact`) y "registrar key nav **si
   TASK-1306 no la dejó**" (Slice 1): **ya está, y la key nav ya está** — esta ruta es
   **child del MISMO viewCode**, NO siembra uno nuevo y NO agrega ítem de menú. Lo único que
   sí debes hacer es declararte en `route-reachability-manifest.ts` con
   `parent: '/admin/growth/seo'`, `via: 'tab'` y `reason`.
3. **Space picker resuelto server-side.** `listSeoEligibleSpaces()`
   (`src/lib/growth/seo/overview/list-seo-spaces.ts`) es el reader canónico de los Spaces
   elegibles: aplica el predicado de vigencia completo del assignment `seo_v1`
   (`effective_to IS NULL AND status IN ('active','pilot')`) y NO exige `seo_target` creado.
   Reusa ese reader; no escribas otra query de Spaces.
4. **Guard de 3 puertas con forma canónica** en
   `src/app/(dashboard)/admin/growth/seo/page.tsx` (viewCode + capability +
   `module_assignment`, más `notFound()` con flag apagado y redirect si `client`, más el
   criterio de que `?space=` es compartible pero **no** autoridad). Cópiala.

**Lo que NO cambia — sigue siendo decisión de TASK-1307:**

⚠️ **`TASK-1306` NO instaló ECharts.** Usó ApexCharts + Recharts, ya presentes. Tu spec
asume ECharts para el scatter en varios puntos (`Primitive decision`, Slice 2, Design
Decision Log, matriz de riesgo) declarándose "primer ECharts del repo": **eso sigue siendo
cierto y sigue sin decidirse acá**. La decisión de librería del módulo es el **Slice 0 de
TASK-1307**; si 1307 elige ApexCharts, tu scatter debe revalidar la elección antes de meter
una segunda librería sólo para esta pantalla.

**Si terminas en Apex, dos hallazgos de runtime de 1306:**

- 🔴 **`resolveApexColor` (`src/libs/styles/`) es obligatorio** para cualquier chart Apex que
  tome color del theme: con `cssVariables: true`, `theme.palette.*` devuelve
  `var(--mui-palette-*)` y Apex lanza `Cannot read properties of null (reading '1')` — sin
  pintar nada y **sin error visible** en pantalla.
- **En el GVC, no uses `fullPage`** para esta ruta: Playwright redimensiona el viewport al
  capturarlo y los charts que miden su contenedor quedan en 0, produciendo evidencia con
  cards vacías que parecen un bug inexistente. Usa `clipSelector` sobre `data-capture`.

## Delta 2026-08-05

- **Desbloqueada por TASK-1302 (complete):** `readKeywordOpportunities(seoTargetId, options?)` ya existe en `src/lib/growth/seo/keyword-opportunities-reader.ts` y retorna el contrato `{ ok } | { ok: false, errorCode, status }`. El wireframe la marcaba como "aún no existe en `src/lib/growth/seo/`" — ese supuesto quedó cerrado.
- **La UI sólo renderiza.** El join, el score y los umbrales viven en el primitive. No recomputar nada en el componente.
- Campos disponibles por oportunidad: `keyword`, `page`, `position` (ponderada por impresiones), `impressions`, `clicks`, `ctr`, `estimatedClickGain`, `quickWin`, `cannibalized`, `competingPages`, `searchVolume`/`difficulty` (hoy `null`).
- ⚠️ **`cannibalized` NO es una variante visual de "oportunidad": es otra acción.** Una query con >1 página se resuelve consolidando (301/merge/canonical/diferenciar intención), no optimizando. Necesita su propio tratamiento en la UI, no un chip decorativo.
- El score se expresa en **clics incrementales estimados**, no en un índice abstracto: la UI puede rotularlo como tal ("+N clics/mes est.").
- `market: 'unavailable'` mientras TASK-1300 no aterrice → las columnas de volumen/dificultad deben mostrar estado honesto, no `0` ni `—` ambiguo.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1308-growth-seo-keyword-opportunities-ui.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|data`
- Blocked by: `TASK-1306, TASK-1302`
- Branch: `task/TASK-1308-growth-seo-keyword-opportunities-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la ruta operador `/admin/growth/seo/keywords`: un **scatter de oportunidad** (dificultad × volumen, con zona quick-win sombreada) + **faceted filters** (intención / dificultad / posición) + una **tabla** con acción gobernada **"Seguir"** que agrega una keyword al set monitoreado. Es el motor de expansión/SOWs del módulo SEO (arch §11): keyword research → gap accionable → sube NRR. Cliente puro de `readKeywordOpportunities` (join SEO↔GSC) + el command `trackKeywords`.

## Why This Task Exists

El módulo SEO (EPIC-022) tiene el reader `readKeywordOpportunities` (TASK-1302) pero sin superficie, el operador no puede leer el mapa dificultad×volumen ni decidir qué keywords perseguir. Es una de las **top-3 features de pull comercial** (arch §11): sin una UI que exponga la fruta madura (striking-distance 8–20 + alto volumen + baja dificultad) y permita "seguirla", el research queda como dato muerto en PG.

## Goal

- Crear `/admin/growth/seo/keywords` alcanzable desde **Growth → Search Visibility → SEO**, con scatter de oportunidad + faceted filters + tabla densa.
- Exponer la señal decisoria: la **zona quick-win** sombreada + anotada, y la posición actual (striking-distance destacada).
- Ejecutar **"Seguir"** vía el command gobernado `trackKeywords` (Full API Parity), con estados loading/empty/degraded/error/permission y honest degradation medido ●/estimado ◑.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Hybrid Execution Justification

La task nació declarada `Backend impact: none` — superficie UI pura sobre readers/commands ya
existentes. En Discovery se verificó que **el command `trackKeywords` que la spec daba por construido
(TASK-1303, marcado `[verificar]`) no existía**: `seo_keyword_sets`/`_members` sólo las escribían dos
scripts de seed, y ninguna task del registry lo reclamaba.

**Por qué se resolvió acá y no partiendo la task en dos.** El escape hatch del `## Backend/Data Contract`
prescribe partir el trabajo, y el invariante que ese hatch protege es *"NO agregar lógica de negocio al
componente"* — que se respeta por completo: toda la regla (techo de gasto, entitlement, idempotencia,
normalización, outbox) vive en `src/lib/growth/seo/track-keywords.ts`, y la UI es un cliente más del
mismo primitive que operan Nexa y el lane MCP. Partirlo habría dejado esta superficie **sin su acción
central** (uno de sus tres criterios de aceptación) esperando a una task nueva, para un command de un
archivo. El operador autorizó explícitamente construir lo faltante (2026-08-07).

**Orden interno de ejecución (respetado):** Slice 0 backend (migración + command + route app-lane +
tests + sanity live) → Slice 0b contrato programático (lane ecosystem + tool MCP + federación) → Slices
1–4 UI (ruta + mapa + tabla/acción + GVC). Ningún slice de UI se escribió antes de que el command
estuviera verde contra PG real.

**Riesgo asumido:** la migración es aditiva y nullable (dos columnas de procedencia, sin backfill), y el
command es append-only sobre una tabla que ya tenía trigger anti-DELETE. Rollback = revert + flag OFF.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §3 (capacidades / fuentes GSC vs DataForSEO), §7 (`readKeywordOpportunities`, command `trackKeywords`), §10.4 (dataviz: scatter oportunidad), §10.5 (estados / medido ●-estimado ◑), §11 (comercial: keyword gap = motor de expansión).
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` — nodo **S3** del master flow (cockpit operador).
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities `growth.seo.*` per-org.

Reglas obligatorias:

- **NUNCA** reads live-per-view contra DataForSEO en el render (arch §1.1); pegar al reader `readKeywordOpportunities` (snapshots PG).
- **NUNCA** promediar medido (GSC) con estimado (DataForSEO); marcarlos ● / ◑ con leyenda persistente.
- **"Seguir"** es un command gobernado (`trackKeywords`, arch §7), NO mutación local en el componente — la UI es cliente del primitive, igual que Nexa/MCP (Full API Parity).
- Cola densa >8 columnas → `DataTableShell` obligatorio (NO MUI `<Table>` crudo).
- Scatter = ECharts (arch §10.4, política Charts CLAUDE.md para vistas nuevas de alto impacto), lazy-loaded; color de intención SIEMPRE pareado con label (nunca color solo).
- Toda `page.tsx` nueva → `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV` (`greenhouse-nomenclature.ts`, SoT que consume `VerticalMenu` — lección TASK-1247).
- Copy visible reusable en `src/lib/copy/growth.ts` (namespace `GH_GROWTH_SEO_KEYWORDS`, es-CL, validar con `greenhouse-ux-writing`).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/ui/wireframes/TASK-1308-growth-seo-keyword-opportunities-ui.md`

## Dependencies & Impact

### Depends on

- `TASK-1306` — SEO Overview operador (establece el shell de sección SEO, nav, viewCode `internal` y el Space picker que este surface reusa). **[verificar]** el viewCode canónico del SEO al implementar.
- `TASK-1302` — reader `readKeywordOpportunities(targetId)` + GSC daily materializer. **[verificar]** existencia en `src/lib/growth/seo/` (aún no creado — es dependencia backend).
- `TASK-1303` — command `trackKeywords` (rank capture task incluye el set monitoreado). **[verificar]**.
- `TASK-1301` — capabilities `growth.seo.*` + `enforceSeoRunEntitlement`.

### Blocks / Impacts

- Desbloquea el pull comercial de "keyword research → gap accionable" (arch §11).
- Alimenta el rank tracking (TASK-1307): las keywords "seguidas" entran al set que ★ Rank performance grafica.

### Files owned

- `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` [verificar route group vigente]
- `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunitiesView.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunityScatter.tsx` (lazy ECharts wrapper)
- `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_KEYWORDS`)
- `route-reachability-manifest.ts` (registro de alcanzabilidad de rutas, TASK-982)
- `src/config/greenhouse-nomenclature.ts` (`GH_INTERNAL_NAV`) si TASK-1306 no dejó la key de sección
- `scripts/frontend/scenarios/growth-seo-keywords.*` [verificar extensión DSL]

## Current Repo State

### Already exists

- Primitives: `DataTableShell` (`src/components/greenhouse/data-table/DataTableShell.tsx`), `DebouncedInput` (`src/components/DebouncedInput.tsx`), `FilterTile` (`src/components/greenhouse/primitives/FilterTile.tsx`), `EmptyState`, `GreenhouseBreadcrumbs`, `GreenhouseAsyncActionButton`, CompositionShell.
- `/aeo` cliente + `/admin/growth/ai-visibility` (motor hermano, patrón de referencia).

### Gap

- No existe `src/lib/growth/seo/**` (readers/commands del SEO — dependencia TASK-1299…1303).
- No existe uso de ECharts en el repo (este surface introduce el primero — arch §10.4, lazy-loaded; política Charts CLAUDE.md lo permite para vistas nuevas de alto impacto).
- No existe la ruta `/admin/growth/seo/keywords` ni la sección SEO en nav (TASK-1306 la establece; esta task la consume).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Growth/AM con acceso per-org al target SEO.
- Momento del flujo: revisando un target ya configurado, decide qué keywords perseguir.
- Resultado perceptible esperado: el operador lee el mapa dificultad×volumen, filtra, y "sigue" las quick-win con feedback auditable.
- Friccion que debe reducir: leer research en SQL/exports; decidir sin ver la zona quick-win ni la posición actual.
- No-goals UX: correr research on-demand, editar volumen/dificultad, escribir contenido, configurar el target.

### Surface & system decision

- Surface: `/admin/growth/seo/keywords` — **ruta interna** → viewCode routeGroup `internal`, NUNCA `client_*`.
- Composition Shell: `aplica` — composición `single` (scatter + filtros + tabla en una región vertical); sin grid/morph ad-hoc.
- Primitive decision: `reuse` (DataTableShell, FilterTile, DebouncedInput, EmptyState, GreenhouseBreadcrumbs, GreenhouseAsyncActionButton) + `new` acotado (adopción ECharts `echarts-for-react` para el scatter, lazy-loaded — primer ECharts del repo).
- Adaptive density / The Seam: `aplica` — la tabla condensa columnas en mobile por `card-density` (la keyword y la acción "Seguir" nunca desaparecen).
- Floating/Sidecar/Dialog decision: N/A (sin sidecar/modal; "Seguir" es acción inline con feedback + aria-live).
- Copy source: `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_KEYWORDS`) + `getMicrocopy()` para estados/aria compartidos.
- Access impact: `views|entitlements` — viewCode SEO `internal` (TASK-1306) + capability `growth.seo.observation.read` (ver) / `growth.seo.target.configure` ("Seguir").

### State inventory

- Default: scatter + tabla poblados.
- Loading: skeleton del scatter (rect sized) + `DataTableShell` skeleton rows; NO spinner de página.
- Empty: sin oportunidades ("Aún no hay oportunidades" + CTA a config) / filtrado ("Sin resultados para estos filtros" + Limpiar filtros).
- Error: reader falla → "No pudimos cargar las oportunidades" + Reintentar (actionable).
- Degraded / partial: cuota DataForSEO agotada → banner "mostrando solo datos medidos (Search Console)"; nunca ceros fantasma.
- Permission denied: sin `growth.seo.observation.read` → "Sin acceso" (NO botón reintentar — estructural).
- Long content: scatter + tabla scroll interno; sin scroll horizontal de página.
- Mobile / compact: scatter full-width apilado; tabla condensa columnas.
- Keyboard / focus: filtrar mantiene foco en el control; "Seguir" devuelve foco a la fila + aria-live.
- Reduced motion: entrada del scatter ≤400ms; con `prefers-reduced-motion` sin animación de entrada.

### Interaction contract

- Primary interaction: leer scatter → filtrar (faceted) → "Seguir" una keyword.
- Hover / focus / active: hover en punto del scatter → tooltip + highlight de la fila; hover/focus visible en filas y botones.
- Pending / disabled: "Seguir" disabled mientras el command ejecuta (anti doble submit); vuelve a "Siguiendo" si ya está en el set.
- Escape / click-away: N/A (sin overlay).
- Focus restore: foco vuelve a la fila tras "Seguir".
- Latency feedback: pending en el botón + toast/inline al resolver.
- Toast / alert behavior: feedback de "Seguir" (éxito/ya seguida/error) con `role=status` aria-live.

### Motion & microinteractions

- Motion primitive: `CSS` + entrada nativa de ECharts (≤400ms)
- Enter / exit: entrada ligera del scatter; filas sin stagger obligatorio.
- Layout morph: N/A.
- Stagger: opcional (filas), no requerido.
- Timing / easing token: tokens del design system; entrada de chart ≤400ms (dataviz-design).
- Reduced-motion fallback: scatter sin animación de entrada.
- Non-goal motion: animación decorativa que retrase la comprensión del chart.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` (server guard: viewCode SEO `internal` + `can(tenant, 'growth.seo.observation.read', 'read', 'tenant')`).
- Primitive / variant / kind: CompositionShell `single`; `DataTableShell` densa; scatter = ECharts config (lazy `ssr:false`).
- Component candidates: `KeywordOpportunitiesView.tsx` + `KeywordOpportunityScatter.tsx`.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS`.
- Data reader / command: `readKeywordOpportunities(targetId)` (TASK-1302 [verificar]); `trackKeywords(keywordSetId, [keyword], actor)` (TASK-1303 [verificar]) vía route handler admin.
- API parity: UI cliente del reader/command gobernado; Nexa opera `trackKeywords` por construcción.
- Access / capability: `growth.seo.observation.read` (ver) + `growth.seo.target.configure` ("Seguir").
- States to implement: default, loading, empty (zero/filtered), error, degraded, permission.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keywords.scenario.ts` (+ `.mobile`) [verificar DSL].
- Route: `/admin/growth/seo/keywords`.
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar (agent auth operador) → esperar scatter → aplicar facet intención → mirar tabla filtrada → hover en punto.
- Required captures: default (scatter+tabla), filtrado, empty, degraded (banner cuota).
- Required `data-capture` markers: `seo-keywords-scatter`, `seo-keywords-filters`, `seo-keywords-table`, `seo-keywords-empty`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, scatter `role=img`, tabla presente.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px.
- Reduced-motion / focus evidence: scatter sin animación con reduced-motion; foco tras filtrar/seguir.

### Design decision log

- Decision: scatter ECharts (no Recharts). Alternatives considered: Recharts scatter (menor wow, sin zona sombreada rica). Why this pattern: arch §10.4 + política Charts. Reuse/extend/new: **new** acotado (primer ECharts del repo, lazy).
- Decision: tabla como fallback a11y permanente (no toggle). Why: dataviz-design table fallback + valores exactos.
- Decision: "Seguir" = command `trackKeywords`, no mutación local. Why: Full API Parity (arch §7) — afecta rank tracking downstream.
- Decision: striking-distance 8–20 destacada. Why: fruta madura del join SEO↔GSC (mayor ROI).
- Reuse / extend / new primitive: reuse salvo ECharts (new). Open risks: `readKeywordOpportunities` (TASK-1302) debe existir antes de datos reales; costo DataForSEO condiciona cuántas keywords trae el reader.

### Visual verification

- GVC scenario: `growth-seo-keywords`
- Viewports: desktop + 390px.
- Required captures: default, filtrado, empty, degraded.
- Required `data-capture` markers: `seo-keywords-scatter`, `seo-keywords-filters`, `seo-keywords-table`, `seo-keywords-empty`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: scatter `role=img` + aria; color de intención pareado con label; foco tras filtrar/seguir.
- Before/after evidence: N/A página nueva.
- Known visual debt: primer ECharts del repo (verificar bundle lazy).

## Backend/Data Contract

`Backend impact: none` — rationale. Esta task es una **superficie UI cliente pura**: consume readers/commands gobernados que ya define el backend SEO (EPIC-022: `readKeywordOpportunities` en TASK-1302, `trackKeywords` en TASK-1303). NO crea ni modifica ningún contrato server-side, schema, migración, reader, command, ruta API, sync, cron ni webhook. El `Domain` incluye `data` solo porque la superficie **presenta** datos de búsqueda (dataviz), no porque produzca un contrato de datos.

- Source of truth: ninguno nuevo. `seo_keyword_set_members` + snapshots (SoT del backend, TASK-1299) — esta task solo lee su proyección vía `readKeywordOpportunities` y muta vía `trackKeywords`.
- Contract surface: consume el reader/command existentes; sin contrato nuevo.
- Invariante: la UI es cliente del primitive (Full API Parity), NUNCA muta el set monitoreado en el componente — pasa por `trackKeywords` gobernado.
- Migration/backfill/rollback: `none` (revert route/nav + flag OFF).
- Runtime evidence: focal/UI tests + GVC; el write real (`trackKeywords`) se verifica end-to-end contra el reader (la keyword "seguida" aparece en el set).

Si durante Discovery se descubre que la UI necesita un reader/command que aún no existe con la shape correcta, **cambiar a `Backend impact: reader` y partir el trabajo** (backend-data foundation + ui-ux consumer), NO agregar lógica de negocio al componente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ruta + shell + estados

- Crear `/admin/growth/seo/keywords` con page-guard (viewCode SEO `internal` + capability `observation.read`).
- CompositionShell `single`, header (breadcrumb + Space picker + `DebouncedInput` + leyenda ●/◑).
- Estados loading/empty (zero/filtered)/error/degraded/permission honestos, consumiendo `readKeywordOpportunities`.
- Registrar en `route-reachability-manifest.ts` + key nav (si TASK-1306 no la dejó).

### Slice 2 — Scatter de oportunidad (ECharts)

- `KeywordOpportunityScatter.tsx` lazy (`ssr:false`): X dificultad, Y volumen (log desde 0), size clicks potenciales, color intención (categórica ≤8, colorblind-safe), zona quick-win sombreada + anotación.
- `role=img` + aria-label con el insight; hover tooltip; sincronía con filtros.

### Slice 3 — Faceted filters + tabla + "Seguir"

- `FilterTile` faceted (intención) + slider dificultad + facet posición (striking 8–20 destacado), sincronizados a query params + scatter.
- `DataTableShell`: Keyword \| Vol \| Dif \| Pos \| Tendencia (sparkline) \| Fuente (●/◑) \| [Seguir].
- "Seguir" = `GreenhouseAsyncActionButton` → `trackKeywords` command; feedback + aria-live; anti doble submit.

### Slice 4 — GVC + a11y

- Scenario GVC desktop/mobile con estados clave; scroll-width; foco; respeto a movimiento reducido (WCAG 2.3.3); color-independent labels.

## Out of Scope

- Backend del SEO (readers/commands: TASK-1299…1303).
- Rank & URL performance (TASK-1307), site audit (TASK-1309), cliente/report (TASK-1310).
- Correr keyword research on-demand; editar volumen/dificultad; bulk "Seguir" (follow-up).

## Detailed Spec

La UI es cliente del contrato SEO (arch §7): lee `readKeywordOpportunities`, ejecuta `trackKeywords`. El scatter responde la pregunta "¿qué keyword persigo?" (dataviz-design: scatter para correlación dificultad×volumen, size/color como overview, tabla para precisión). La **zona quick-win** (baja dificultad + alto volumen) es la señal decisoria, sombreada + anotada. La posición 8–20 (striking-distance del join SEO↔GSC) es la fruta madura destacada. "Seguir" agrega la keyword al set monitoreado que alimenta el rank tracking (TASK-1307) — es un command gobernado, no mutación local.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (ruta+shell+estados) → Slice 2 (scatter) → Slice 3 (filtros+tabla+"Seguir") → Slice 4 (GVC). No conectar "Seguir" antes de tener estados de error/pending (Slice 1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reads live-per-view a DataForSEO (costo/latencia) | cost/UI | medium | pegar solo al reader `readKeywordOpportunities` (snapshots PG); nunca fetch provider en render | `seo.provider.cost_over_budget` |
| Promediar medido/estimado (dato engañoso) | data quality | medium | ● GSC / ◑ DataForSEO con leyenda; nunca promediar | code review/GVC |
| "Seguir" como mutación local (rompe API parity) | architecture | medium | command `trackKeywords` gobernado; UI solo cliente | code review |
| ECharts infla bundle | UI/perf | medium | lazy `ssr:false`, primer ECharts del repo, verificar bundle | build/bundle-analyzer |
| Overflow mobile (scatter + tabla densa) | UI | medium | CompositionShell + card-density + scroll-width check | GVC |
| Color-only de intención (a11y) | a11y | low | color + label en tabla; leyenda | GVC/axe |

### Feature flags / cutover

- Gated por `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) + capability `growth.seo.observation.read` per-org. Oculto de nav hasta que el backend SEO esté desplegado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav + flag OFF | <5 min | si |
| Slice 2 | revert scatter | <5 min | si |
| Slice 3 | revert filtros/tabla/acción | <5 min | si |
| Slice 4 | revert visual polish | <5 min | si |

### Production verification sequence

1. Staging con `GROWTH_SEO_ENABLED=true` + un target con `readKeywordOpportunities` data (o fixture).
2. Operador con capability ve scatter + tabla; filtros funcionan; leyenda ●/◑ visible.
3. "Seguir" → keyword aparece en el set monitoreado (verificar en TASK-1307 / reader).
4. GVC desktop/mobile mirado.

### Out-of-band coordination required

- N/A — repo-only change (depende del rollout del backend SEO, coordinado en EPIC-022).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: interaction`.
- [ ] Ruta `/admin/growth/seo/keywords` alcanzable desde **Growth → Search Visibility → SEO** (routeGroup `internal`), en `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`.
- [ ] UI consume `readKeywordOpportunities` (read) + `trackKeywords` (command gobernado), sin mutación local ni lógica de negocio en el componente.
- [ ] Scatter ECharts: X dificultad, Y volumen, size clicks, color intención (≤8 colorblind-safe), zona quick-win sombreada + anotada; `role=img` + aria-label; hover tooltip.
- [ ] Faceted filters (intención/dificultad/posición, striking 8–20 destacado) sincronizados a query params + scatter.
- [ ] Cola densa (>8 cols) con `DataTableShell` (NO MUI `<Table>` crudo); "Seguir" con `GreenhouseAsyncActionButton` + anti doble submit.
- [ ] Estados loading/empty(zero+filtered)/error/degraded/permission cubiertos; medido ● / estimado ◑ con leyenda; cuota agotada degrada a medido (nunca ceros).
- [ ] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_KEYWORDS`, es-CL, `greenhouse-ux-writing`).
- [ ] Color de intención pareado con label (nunca color solo); tabla = fallback a11y del scatter.
- [ ] GVC desktop+mobile capturado y mirado **en loop**; `scrollWidth==clientWidth`; gate axe verde.
- [ ] Focus/keyboard y respeto a movimiento reducido (WCAG 2.3.3) validados.
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1308` queda sin findings.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-keywords --env=staging`
- `pnpm task:lint --task TASK-1308`
- `pnpm ui:wireframe-check --task TASK-1308`
- `pnpm ui:readiness-check --task TASK-1308`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si la task lo toca

## Follow-ups

- Bulk "Seguir" (multi-select) si el volumen lo justifica.
- Reuse del scatter en el dashboard cliente (curado) si aplica.

## Delta 2026-07-01 — conectada al Master UI Flow del programa Search Visibility 360

- Esta task es el nodo **S3** (Keyword opportunities) del flujo cross-surface del módulo SEO. Su UI se conecta con Overview (S1), Rank performance (S2), Site audit (S4) y Cliente/Report (S5–S7) en el doc maestro **`docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui + dataviz-design). Toda acción visible mapea a un command gobernado (Full API Parity → Nexa por construcción); las keywords "seguidas" alimentan el rank tracking de S2 (TASK-1307).

## Open Questions

1. ¿El Space picker / viewCode de sección SEO lo establece TASK-1306 (Overview) y esta task lo reusa, o esta task lo crea si se toma antes? Propuesta: reusar de TASK-1306 (blocker declarado).
