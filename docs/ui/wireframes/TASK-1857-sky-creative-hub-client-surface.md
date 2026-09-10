# TASK-1857 / `/creative-hub` — Wireframe: Creative Hub del portal cliente

## Meta

- Status: `draft` (v2 2026-09-10: cinco bloques cliente; v1 replicaba el módulo interno)
- Owner task: `TASK-1857`
- Product Design asset: `docs/ui/visual-directions/TASK-1857-sky-creative-hub-client-surface.md` (dirección C «hoja de trabajo creativa», 2026-09-10; incluye el component mapping por bloque). Fuente durable del benchmark: `src/config/capability-registry.ts` (`creative-hub`) + surface system canónico.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: personas cliente de organizaciones con `creative_hub_globe_v1` asignado (hoy Sky Airlines: tres usuarias activas); administración interna en modo soporte (bypass D1 del guard, sin impersonar).
- Copy source: `src/lib/copy/client-portal.ts` (`GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels['creative-hub']`, `emptyState`, `degraded`, `error`) + `src/config/capability-registry.ts` (títulos/descr. de cards) + `src/lib/copy/` (`loading`, `empty`, `errors`).
- Primitive decision: `reuse` — `SurfaceRecipe analyticsReport plane='none'` + `WorkbenchHeader kind='report'` + `OperationalSection open/band` + `OperationalSignalList` + `SignalStrip integrated` + `MetricSummaryCard` + `GreenhouseActivityTimeline` + `CapabilityCard type='pipeline'`; builders de datos del módulo `creative-hub` sin cambios; sin primitive nueva (mapping completo en la dirección visual).
- UI ready target: `no`

## Brief

- Primary user: persona cliente de Sky con acceso al módulo Creative Hub (rol `client_*`; la visibilidad la decide el módulo asignado, no el rol).
- User moment: entra desde el ítem «Creative Hub» del menú cliente (grupo Módulos, icono `tabler-palette`, href `/creative-hub` del `view_registry`) o desde un deep link; hoy ese ítem devuelve 404.
- Job to be done: leer en una sola pantalla el estado del flujo creativo contratado (cadencia, revisión abierta, calidad, CVR, supply chain) con fuente y corte visibles, y saltar a los proyectos en foco.
- Primary decision signal: «¿qué está en revisión o trabado y qué necesita mi respuesta?» — Review pipeline y Stuck steps deben ser legibles en el primer fold o a un scroll.
- Non-goals: editor o visor de assets; producción Globe; solicitudes/briefs (TASK-1855/1856); nuevo Hub ni nuevo módulo comercial; cambiar el catálogo `creative_hub_globe_v1`.

## Desktop Target — 1440×1000

Versión 2 (2026-09-10): la página NO replica las 16 cards del módulo interno. Muestra cinco bloques para la persona cliente,
en este orden, reutilizando seis cards del registry `creative-hub` y ocultando las de gestión interna.

```text
SHELL CLIENTE EXISTENTE: sidebar dinámico (Módulos › Creative Hub activo) · contexto de organización
┌ Header editorial (CapabilityOverviewHero, sin cifras de revenue) ─────────────────────────────┐
│ eyebrow: Creative Hub          H1: «<clientName>: tu flujo creativo»     [fuente · corte: dd-mm] │
│ description: qué está en revisión, qué se está produciendo y qué se entregó este período          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌ B1 · NECESITA TU RESPUESTA (card `creative-review-pipeline`, retitulada) ─────────────────────────┐
│ [pieza] · [ronda n] · comentarios abiertos: k · solicitado el dd-mm por [nombre Efeonce]  → Abrir  │
│ … (máx. 8 filas; vacío: «No tienes piezas esperando tu respuesta.»)                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌ B2 · EN PRODUCCIÓN AHORA (cards `csc-pipeline` + `stuck-assets`) ───────────────────────────────┐
│ Brief → Concepto → Producción → Revisión → Entrega   (conteo por fase; piezas con fecha comprometida)│
│ Trabadas: [pieza] · fase · desde dd-mm · motivo declarado                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌ B3 · ENTREGADO ESTE PERÍODO (card `creative-projects`, lente `creative`) ─────────────────────────┐
│ [pieza/proyecto] · versión final · entregado dd-mm · → Ver pieza (href del proyecto)              │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌ B4 · CADENCIA Y CALIDAD, BIDIRECCIONAL (card `creative-metrics` + `creative-quality`) ───────────┐
│ entregadas/comprometidas · a tiempo % · rondas de cambio promedio · tiempo de respuesta Efeonce / Sky│
│ cada cifra con fuente y corte; sin dato → «Sin datos en este corte», nunca 0                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
┌ B5 · PEDIR ALGO (sólo si existe el destino) ──────────────────────────────────────────────────────┐
│ → Nueva solicitud / brief (TASK-1856)     → Informes Insights (TASK-1848)                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Orden de lectura: header → B1 (única región con acciones) → B2 → B3 → B4. B5 no se renderiza mientras no existan
sus destinos: ningún botón muerto. El primer fold cierra con B1 completo y el encabezado de B2. Cards excluidas a
propósito (lectura de gestión interna, no del cliente): `creative-revenue-kpis`, `creative-tier-visibility`,
`creative-methodology-accelerators`, `creative-narrative-guardrails`, `creative-brand-kpis`, `creative-rpa-trend`,
`creative-cvr-structure`, `creative-review-hotspots` (se funde en B1) y los cuatro `section-header`.

## Mobile Target — 390×844

```text
┌ Header compacto: Creative Hub · <clientName> · fuente/corte ┐
│ B1 Necesita tu respuesta (lista, tap ≥44px, máx. 5 + «ver todas») │
│ B2 En producción (fases apiladas con conteo; trabadas debajo)    │
│ B3 Entregado (lista)                                              │
│ B4 Cadencia y calidad (2×2 → 1 columna; texto, sin gráfico)       │
│ B5 Pedir algo (sólo si existe)                                    │
```

Una columna; B1 nunca baja del primer fold. Los números de B4 se muestran como texto con etiqueta; no hay chart en
móvil. `scrollWidth === clientWidth` a nivel página.

## Action Hierarchy

- Primary: ninguna acción de negocio; la superficie es lectura. La navegación primaria es «abrir proyecto» desde Projects in focus (`CapabilityProjectItem.href`).
- Secondary: volver al inicio del portal (shell); enlaces de `CapabilityToolItem.href` cuando existan.
- Destructive: ninguna.
- Selection vs action: no hay selección; cada fila de proyecto es un enlace, no un toggle.
- Pending / disabled: sin botones; el pending es de carga de datos (ver State Copy).

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Página de lectura analítica del cliente | `SurfaceRecipe kind='analyticsReport' plane='none'` | Body como lienzo; secciones abiertas; ≤3 planos contenidos en el fold | Grilla de cards del módulo interno |
| Chrome de página (cuenta, propósito, fuente/corte) | `WorkbenchHeader kind='report'` (`meta` = fuente/corte) | Un plano editorial contenido con radius `xl` y elevación `raised` del theme | Hero con cifra de revenue |
| Lista de piezas que esperan respuesta | `OperationalSignalList` en `OperationalSection variant='open'` | Fila = pieza · ronda · comentarios · quién espera · Abrir | Tabla MUI ancha; card por fila |
| Fases de producción | `CapabilityCard type='pipeline'` (renderer existente) | Conteo por fase con el dato actual | Rediseño del pipeline |
| Entregas del período | `GreenhouseActivityTimeline` | Fecha, versión y enlace; miniatura sólo con `attachment` | Carrusel de imágenes |
| Cifras de cadencia y calidad | `SignalStrip variant='integrated'` + `MetricSummaryCard` (`kpiValue`, `overline` para fuente/corte) | Señales integradas, bidireccionales, con corte | Cuatro KPI cards separadas; HEX por estado |
| Tonos de estado | `statusTone`/`tone` de las primitives → `theme.palette.*` | Semáforo con etiqueta textual | Fondos de sección verdes/rojos |
| Icono del módulo `tabler-palette` | descriptor `VIEW_CODE_NAV_DESCRIPTOR['cliente.creative_hub']` | Continuidad menú → header | Ícono distinto en la página |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nombre de cuenta, propósito, fuente/corte | `CapabilityOverviewHero` (sin `summaryValue` de revenue) | `CapabilityModuleData.hero` (recortado) |
| B1 | Necesita tu respuesta | Piezas en revisión del cliente, comentarios abiertos, quién espera | card `creative-review-pipeline` (metric-list, retitulada) | `getCreativeHubTasks` (`client_review_open`, `open_frame_comments`, `client_change_round_final`) |
| B2 | En producción ahora | Fases del ciclo + piezas trabadas | `csc-pipeline` (pipeline) + `stuck-assets` (alert-list) | snapshot (`fase_csc`, `bloqueado_por_ids`, `fecha_entrega`) |
| B3 | Entregado este período | Piezas entregadas con enlace | `creative-projects` (project-list, lente creative) | `buildProjectItemsForLens(snapshot,'creative')`, `fecha_de_completado` |
| B4 | Cadencia y calidad | 4 cifras bidireccionales con fuente/corte | `creative-metrics` (metric) + `creative-quality` (quality-list) | `buildCreativeHubCardData`, `buildQualityItems`; `pct_on_time` |
| B5 | Pedir algo | Entradas a solicitud/brief e Insights | enlaces del shell (sin card nueva) | sólo cuando TASK-1856/1848 publiquen destino |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `client_portal.creative_hub.page.title` | metadata | Creative Hub \| Greenhouse | — | `metadata.title` del page, patrón `/equipo` |
| `client_portal.creative_hub.hero.eyebrow` | 0 | Creative Hub | — | `modulePublicLabels['creative-hub'].name` |
| `client_portal.creative_hub.hero.title` | 0 | `${clientName}: ${hero.title}` | `clientName` del tenant | Ya lo compone `GreenhouseCapabilityModule` |
| `client_portal.creative_hub.block.review.title` | B1 | Necesita tu respuesta | — | Reemplaza «Review pipeline» sólo en esta página (override de título por bloque; el registry no cambia) |
| `client_portal.creative_hub.block.review.empty` | B1 | No tienes piezas esperando tu respuesta. | — | Vacío honesto |
| `client_portal.creative_hub.block.production.title` | B2 | En producción ahora | — | Fases: Brief · Concepto · Producción · Revisión · Entrega |
| `client_portal.creative_hub.block.production.stuck` | B2 | Trabadas | — | Motivo declarado, nunca inferido |
| `client_portal.creative_hub.block.delivered.title` | B3 | Entregado este período | `periodo` | Fecha de entrega por pieza |
| `client_portal.creative_hub.block.quality.title` | B4 | Cadencia y calidad | — | Cuatro cifras: entregadas/comprometidas · a tiempo · rondas promedio · tiempo de respuesta Efeonce / Sky |
| `client_portal.creative_hub.block.quality.nodata` | B4 | Sin datos en este corte | — | Nunca 0 sustituto |
| `client_portal.creative_hub.block.request.title` | B5 | Pedir algo | — | Sólo si existe destino (TASK-1856 / TASK-1848) |
| `client_portal.creative_hub.source_cut` | 0–B4 | Fuente: Notion · corte: {fecha} | `fecha` | Obligatorio en cada bloque con cifras |
| `client_portal.creative_hub.denied.title` | denied | `${name} aún no está activo en tu cuenta` | `name` = Creative Hub | `emptyState.notAssigned.title` |
| `client_portal.creative_hub.denied.body` | denied | `Creative Hub se incluye en planes Globe. Si te interesa conocerlo, escríbele a tu account manager.` | — | `emptyState.notAssigned.body(name, bundleHint)` |
| `client_portal.creative_hub.degraded.banner` | 0 | Portal en modo degradado / Algunos módulos no están disponibles temporalmente… | — | `degraded.bannerTitle/bannerBody` |
| `client_portal.creative_hub.error.fallback` | página | Algo salió mal de nuestro lado / Te llevamos al inicio mientras lo resolvemos… | — | `error.fallbackTitle/fallbackBody/fallbackCta` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | hero.title | hero.description + summaryDetail (fuente + corte) | enlaces de proyectos | Datos del período vigente |
| loading | — | skeleton del hero + 3 cards con estructura estable (`aria-label` «Cargando tu portal») | — | Server component; el skeleton es `loading.tsx` de la ruta |
| empty | Sin actividad creativa en este período | La fuente está conectada pero no hay tareas del flujo creativo en el corte actual. | Cambiar de período no aplica (sin selector); enlace a Inicio | Distinguir de «sin fuente»: `snapshot` vacío con `dataSources` presentes |
| partial | Vista parcial | Mostramos las secciones con datos; ICO/CVR no informó este corte. | — | `readMetricsSummaryByClientId` o CVR `null` → ocultar la sección con nota, nunca ceros |
| error | Algo salió mal de nuestro lado | Te llevamos al inicio mientras lo resolvemos. | Ir al inicio | `error.tsx` de la ruta; sin detalle técnico |
| denied | Creative Hub aún no está activo en tu cuenta | Creative Hub se incluye en planes Globe… | Solicitar acceso · Volver al inicio | `requireViewCodeAccess` redirige a `/home?denied=creative-hub`; renderiza `<ModuleNotAssignedEmpty>` existente |

## Accessibility Contract

- Heading order: `h1` único en el hero; `section-header` como `h2`; títulos de card como `h3`.
- Chart/table alternatives: `chart-bar` (`review-hotspots`, `rpa-trend`) acompañado de lista textual con los mismos valores; `pipeline` con resumen por fase en texto.
- Aria labels: región principal `aria-labelledby` del `h1`; skeleton con `GH_CLIENT_PORTAL_COMPOSITION.loading.ariaLabel`; enlaces de proyecto con nombre + estado, nunca «ver más».
- Focus notes: foco inicial en el `h1` al llegar por navegación del shell; orden DOM = orden visual; sin focus traps.
- Color-independent state labels: los tonos de KPI llevan `chipLabel` textual; los estados de proyecto se leen en texto.

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/creative-hub/page.tsx` (+ `loading.tsx`, `error.tsx`), `dynamic = 'force-dynamic'`, patrón de `src/app/(dashboard)/equipo/page.tsx`.
- Primitives: ver tabla «Component mapping (contrato por bloque)» en la dirección visual: `SurfaceRecipe`, `WorkbenchHeader`, `OperationalSection`, `OperationalSignalList`, `SignalStrip`, `MetricSummaryCard`, `GreenhouseActivityTimeline`, `CapabilityCard type='pipeline'`, `EmptyState`, `GreenhouseLoadingSurface`.
- Variants / kinds: `analyticsReport`/`plane='none'`; header `report`; secciones `open` (B1–B3), `band` (B4), `quiet` (B5); `SignalStrip integrated`; `density='auto'` donde exista.
- Component candidates: vista nueva `src/views/greenhouse/client-portal/CreativeHubClientView.tsx` [propuesta] que compone las primitives sobre el `CapabilityModuleData` filtrado; sin componente primitivo nuevo.
- Copy source: `src/lib/copy/client-portal.ts`; títulos de cards desde `capability-registry.ts`.
- Data reader / command: `getCapabilityModuleData({ moduleId: 'creative-hub', tenant, allowRegistryFallback: true })` ejecutado **después** de `requireViewCodeAccess('cliente.creative_hub')`. La autorización la da el módulo asignado (primitive único de visibilidad); la resolución por `businessLines/serviceModules` legacy NO puede ser la puerta porque Sky no las tiene.
- API parity: superficie de lectura; el módulo ya se expone al cliente por `/api/capabilities/**` [verificar]. Sin command nuevo.
- Access / capability: `views` (`cliente.creative_hub`, seed TASK-827, asignado a Sky vía `creative_hub_globe_v1`); sin entitlement nuevo; bypass D1 interno.
- Runtime consumers: portal cliente Vercel; sin worker.
- Print/email/PDF considerations: ninguna en esta task.
- GVC markers: `data-capture="creative-hub-hero"`, `data-capture="creative-hub-delivery"`, `data-capture="creative-hub-review"`, `data-capture="creative-hub-supply-chain"`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1857-creative-hub.scenario.ts` (propuesto)
- Route: `/creative-hub`
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: login persona técnica cliente con `creative_hub_globe_v1` asignado en staging (fixture técnico, nunca usuarias de Sky) → abrir menú Módulos → Creative Hub → primer fold → scroll a cada sección → persona sin módulo → `/home?denied=creative-hub`.
- Required captures: first fold, review pipeline, supply chain, denied, 390px first fold + una sección larga.
- Required `data-capture` markers: los cuatro de Implementation Mapping.
- Assertions: 200 con módulo asignado; `h1` contiene el nombre de la cuenta; redirect exacto sin módulo; cero ítems de menú muertos para la persona; sin `module_key` técnico en el DOM.
- Scroll-width checks: `scrollWidth === clientWidth` en ambos viewports.
- Accessibility/focus checks: orden de encabezados, foco visible en enlaces de proyecto, alternativa textual de charts.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce`; ningún dato depende de animación.
- Review dossier: `required` — `docs/ui/reviews/TASK-1857-sky-creative-hub-client-surface.md`
- Baseline: `required after direction approval` — baseline de `/capabilities/creative-hub` con tenant legacy como referencia; candidate = `/creative-hub` con la persona técnica.

## Design Decision Log

- Decision (v2, 2026-09-10): materializar `/creative-hub` como lectura del cliente en cinco bloques (necesita tu respuesta · en producción · entregado · cadencia y calidad bidireccional · pedir algo), reutilizando seis cards del registry `creative-hub` y excluyendo las de gestión interna; puerta por el primitive de visibilidad del portal cliente.
- Alternatives considered: (a) supersede del bundle retirando el viewCode (TASK-1685 §D3, descartada por el operador el 2026-09-10: el módulo es el producto contratado); (b) rewrite `/creative-hub` → `/capabilities/creative-hub` (descartada: esa ruta exige `cliente.modulos` + líneas legacy que Sky no tiene y devolvería 404 igual); (c) página nueva con cards nuevas (descartada: duplica cards existentes sin dato nuevo); (d) replicar las 16 cards internas tal cual (v1 de este wireframe, descartada 2026-09-10: revenue, tiers, aceleradores y RpA son lectura de gestión de Efeonce, no del cliente).
- Why this pattern: cierra el enlace muerto con el menor blast radius, mantiene una sola implementación de las cards y deja la migración del carril legacy (`capability-modules-resolver-migration`, TASK-827 §Follow-ups) como decisión separada.
- Reuse / extend / new primitive: reuse; extend sólo si GVC premium bloquea (p. ej., hero sin momento dominante en 390px).
- Open risks: datos de Sky pueden venir vacíos si su flujo creativo no está en `notion_ops` (estado `empty` honesto, no ceros); títulos de cards en inglés (deuda declarada); `route-reachability-gate` y `nav:budget` deben pasar con el href del `view_registry`.
- Follow-up: sweep es-CL de títulos del registry; migración del carril legacy de capability modules al primitive.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
