# TASK-1857 / `/creative-hub` — Wireframe: Creative Hub del portal cliente

## Meta

- Status: `draft`
- Owner task: `TASK-1857`
- Product Design asset: `src/views/greenhouse/GreenhouseCapabilityModule.tsx` + `src/config/capability-registry.ts` (`creative-hub`), superficie viva en `/capabilities/creative-hub` para tenants con líneas legacy; no existe dirección Figma nueva y no se inventa una.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: personas cliente de organizaciones con `creative_hub_globe_v1` asignado (hoy Sky Airlines: tres usuarias activas); administración interna en modo soporte (bypass D1 del guard, sin impersonar).
- Copy source: `src/lib/copy/client-portal.ts` (`GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels['creative-hub']`, `emptyState`, `degraded`, `error`) + `src/config/capability-registry.ts` (títulos/descr. de cards) + `src/lib/copy/` (`loading`, `empty`, `errors`).
- Primitive decision: `reuse` — `CapabilityOverviewHero` + `ModuleLayout` (`src/components/capabilities/`) dentro del shell cliente existente; sin primitive nueva.
- UI ready target: `no`

## Brief

- Primary user: persona cliente de Sky con acceso al módulo Creative Hub (rol `client_*`; la visibilidad la decide el módulo asignado, no el rol).
- User moment: entra desde el ítem «Creative Hub» del menú cliente (grupo Módulos, icono `tabler-palette`, href `/creative-hub` del `view_registry`) o desde un deep link; hoy ese ítem devuelve 404.
- Job to be done: leer en una sola pantalla el estado del flujo creativo contratado (cadencia, revisión abierta, calidad, CVR, supply chain) con fuente y corte visibles, y saltar a los proyectos en foco.
- Primary decision signal: «¿qué está en revisión o trabado y qué necesita mi respuesta?» — Review pipeline y Stuck steps deben ser legibles en el primer fold o a un scroll.
- Non-goals: editor o visor de assets; producción Globe; solicitudes/briefs (TASK-1855/1856); nuevo Hub ni nuevo módulo comercial; cambiar el catálogo `creative_hub_globe_v1`.

## Desktop Target — 1440×1000

```text
SHELL CLIENTE EXISTENTE: sidebar dinámico (Módulos › Creative Hub activo) · contexto de organización
┌ CapabilityOverviewHero ────────────────────────────────────────────────────────────────┐
│ eyebrow: Creative Hub                                                                    │
│ H1: «<clientName>: <hero.title>»          summary: <summaryLabel> <summaryValue>         │
│ description (dos frases máx.)             summaryDetail (fuente + corte)                 │
│ highlights ×3 (label · value)             badges (líneas/servicios matcheados)           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌ ModuleLayout (grid 12 col, gutter 4n) ──────────────────────────────────────────────────┐
│ [creative-metrics · metric · full]  Creative delivery                                    │
│ [creative-review-pipeline · md]  Review pipeline   │ [creative-review-hotspots · lg] Review hotspots │
│ [creative-projects · lg] Projects in focus (→ href por proyecto) │ [creative-quality · md] Quality signal │
│ ── section-header: Revenue Enabled ──                                                     │
│ [creative-revenue-kpis · metrics-row · full]                                             │
│ ── section-header: Creative Velocity Review ──                                            │
│ [cvr-structure · lg] │ [methodology-accelerators · md] │ [tier-visibility · full] │ [narrative-guardrails · md] │
│ ── section-header: Brand Intelligence ──                                                  │
│ [brand-kpis · metrics-row · full] · [rpa-trend · chart-bar · full]                       │
│ ── section-header: Creative Supply Chain ──                                               │
│ [csc-pipeline · pipeline · full] · [csc-metrics · metrics-row · full] · [stuck-assets · alert-list · full] │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Orden de lectura: hero (momento visual dominante: título con nombre de la cuenta, un solo número resumen y
tres highlights) → Creative delivery → Review pipeline/hotspots → Projects in focus. Las cuatro
`section-header` separan bloques; no se agregan tarjetas contenedoras alrededor del grid (card-on-card es
BLOCK). El primer fold debe cerrar con Review pipeline visible: si el hero crece por copy largo, se recorta
la descripción, no se baja el pipeline. Densidad: la del módulo existente; no se rediseñan las cards en
esta task.

## Mobile Target — 390×844

```text
┌ Hero compacto ───────────────────────────┐
│ Creative Hub                             │
│ <clientName>: <hero.title>               │
│ <summaryValue>  <summaryLabel>           │
│ highlights apilados (3 filas)            │
│ badges en wrap                           │
└──────────────────────────────────────────┘
│ Creative delivery (metric, ancho 100 %)  │
│ Review pipeline (lista)                  │
│ Review hotspots (barras horizontales,    │
│   scroll interno si >6 categorías)       │
│ Projects in focus (lista; href tap ≥44px)│
│ … secciones en el mismo orden            │
```

Una sola columna; `size` de cada card colapsa a `full`. Gráficas de barras conservan alternativa textual
(`metric-list` equivalente en la misma card). Nada desborda: contenedores de chart/tabla con
`overflow-x: auto` propio, `scrollWidth === clientWidth` a nivel página. Los enlaces de proyectos son la
única acción táctil; no hay FAB ni acciones flotantes.

## Action Hierarchy

- Primary: ninguna acción de negocio; la superficie es lectura. La navegación primaria es «abrir proyecto» desde Projects in focus (`CapabilityProjectItem.href`).
- Secondary: volver al inicio del portal (shell); enlaces de `CapabilityToolItem.href` cuando existan.
- Destructive: ninguna.
- Selection vs action: no hay selección; cada fila de proyecto es un enlace, no un toggle.
- Pending / disabled: sin botones; el pending es de carga de datos (ver State Copy).

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Hero con título de cuenta, resumen y highlights | `CapabilityOverviewHero` (theme `creative` del registry) | Momento dominante único al abrir el módulo | Gradientes/colores ad hoc por cuenta |
| Grid de cards por `size` sm/md/lg/full | `ModuleLayout` + spacing `4n` del theme | Jerarquía por tamaño declarado en el registry | Anchos en px por card |
| Tonos de KPI (`GreenhouseKpiTone`) en chips | `theme.palette.*` vía tone canónico | Semáforo semántico | HEX por estado |
| Encabezados de sección | card `section-header` existente | Ritmo de lectura entre bloques | Cards contenedoras anidadas |
| Icono del módulo `tabler-palette` | descriptor `VIEW_CODE_NAV_DESCRIPTOR['cliente.creative_hub']` | Continuidad menú → página | Ícono distinto en la página |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nombre de cuenta + resumen + fuente/corte | `CapabilityOverviewHero` | `CapabilityModuleData.hero` (`buildCapabilityModuleContent`) |
| 1 | Delivery | Cadencia, revisión abierta, calidad | cards `creative-metrics`, `creative-review-pipeline`, `creative-review-hotspots` | `getCapabilityModuleSnapshot` + `getCreativeHubTasks` (notion_ops.tareas/proyectos) |
| 2 | Focus | Proyectos y calidad | `creative-projects`, `creative-quality` | `buildProjectItemsForLens(snapshot,'creative')`, `buildQualityItems` |
| 3 | Revenue | KPIs de revenue | `creative-revenue-kpis` | `readMetricsSummaryByClientId(clientId)` (ICO; puede ser null) |
| 4 | CVR | Estructura, aceleradores, tiers, guardrails | cards `creative-cvr-*`, `creative-tier-visibility`, `creative-narrative-guardrails` | `buildCreativeVelocityReviewContract` + `readPortfolioBrandVoiceAiEvidence` |
| 5 | Brand | KPIs de marca y RpA | `creative-brand-kpis`, `creative-rpa-trend` | snapshot + ICO |
| 6 | Supply chain | Pipeline, métricas, trabas | `csc-pipeline`, `csc-metrics`, `stuck-assets` | snapshot (`fase_csc`, `bloqueado_por_ids`) |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `client_portal.creative_hub.page.title` | metadata | Creative Hub \| Greenhouse | — | `metadata.title` del page, patrón `/equipo` |
| `client_portal.creative_hub.hero.eyebrow` | 0 | Creative Hub | — | `modulePublicLabels['creative-hub'].name` |
| `client_portal.creative_hub.hero.title` | 0 | `${clientName}: ${hero.title}` | `clientName` del tenant | Ya lo compone `GreenhouseCapabilityModule` |
| `capabilities.creative_hub.card.<id>.title` | 1–6 | Títulos actuales del registry (`Creative delivery`, `Review pipeline`, …) | — | **Deuda de copy**: títulos legacy en inglés; retitular a es-CL exige un sweep del registry compartido con `/capabilities/*` (follow-up, no en Slice 1) |
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
- Primitives: `CapabilityOverviewHero`, `ModuleLayout` vía `GreenhouseCapabilityModule` (`src/views/greenhouse/GreenhouseCapabilityModule.tsx`).
- Variants / kinds: theme `creative` del registry; tipos de card ya soportados por `ModuleLayout`.
- Component candidates: reutilizar la vista completa; sin componente nuevo en Slice 1.
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

- Decision: materializar `/creative-hub` reutilizando íntegro el módulo `creative-hub` del registry, con la puerta cambiada al primitive de visibilidad del portal cliente.
- Alternatives considered: (a) supersede del bundle retirando el viewCode (TASK-1685 §D3, descartada por el operador el 2026-09-10: el módulo es el producto contratado); (b) rewrite `/creative-hub` → `/capabilities/creative-hub` (descartada: esa ruta exige `cliente.modulos` + líneas legacy que Sky no tiene y devolvería 404 igual); (c) página nueva con cards nuevas (descartada: duplica 16 cards existentes sin dato nuevo).
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
