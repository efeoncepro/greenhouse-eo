# TASK-1665 — Growth SEO: workbench diario de keyword discovery

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-14 — TASK-1666 complete: desbloqueada por completo

- El puente grounded existe y está verificado live: la acción `Preparar grounded queries` del
  drawer invoca `createGroundedQueryDraft` (route `POST /api/admin/growth/seo/grounded-queries`)
  y distingue `draft_created` (`grounded_llm`) de `baseline_fallback` (con `fallbackNotice`
  OBLIGATORIO en la UI) y errores tipados — cero lógica de prompts en JSX, tal como exige el
  contrato de esta task. El reader del draft es `GET` del mismo route.

## Delta 2026-08-14 — TASK-1664 complete: dependencia desbloqueada

- El primitive de discovery existe y está verificado live: `queueKeywordDiscovery` /
  `readKeywordDiscovery` / `recordKeywordDiscoveryAction` (`src/lib/growth/seo/keyword-discovery/`),
  runner async en ops-worker, lanes app/ecosystem y MCP tools (`get_seo_keyword_discovery`,
  `discover_seo_keywords`). Candidatos guardan SOLO procedencia; la métrica vive en el store de
  TASK-1661 (writer compartido `persistKeywordMarketData`). Rollout runtime pendiente (flag OFF,
  scheduler pausado) — no bloquea el trabajo de código de esta task.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md`
- Flow: `docs/ui/flows/TASK-1665-growth-seo-keyword-discovery-workbench-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende `/admin/growth/seo/keywords` con una tercera lente, **Descubrir**, para el trabajo diario de
keyword mining: escribir o reutilizar seeds, seleccionar el método de expansión, revisar el costo
antes de gastar, seguir la corrida asíncrona y decidir por candidato si se declara un objetivo, se
sigue como oportunidad o se prepara una propuesta de grounded queries. Es una superficie del mismo
objeto SEO, no una ruta nueva ni un dashboard paralelo.

## Why This Task Exists

La pantalla de Keywords ya responde qué empujar de la demanda medida que existe (`Oportunidades`) y
la lente de objetivos responde dónde quiere estar el cliente (`TASK-1660`). Ninguna hace visible el
trabajo intermedio que un operador repite cada día: tomar una seed, expandirla, entender su mercado y
elegir qué acción merece presupuesto.

La UI no puede resolver ese gap haciendo un `fetch` a DataForSEO desde el browser. La corrida tiene
latencia, costo, estados parciales y una frontera async en `ops-worker`. Tampoco puede resolverlo con
un botón "Agregar" que confunda una sugerencia con un compromiso: seguir una keyword activa el gasto
recurrente del rank capture.

El workbench debe hacer visible la cadena completa:

```text
seed → preview de costo → confirmación → corrida async → candidato con procedencia/as-of →
decisión explícita (objetivo | oportunidad | grounded query | descartar)
```

Si una parte de esa cadena desaparece, la pantalla vuelve a ser un listado bonito que oculta el riesgo
operativo. Esta task fija la jerarquía, los estados, el lenguaje y la responsive transformation para
que el implementador no invente una interpretación al llegar a JSX.

## Goal

- El operador puede iniciar una corrida sin abandonar `/admin/growth/seo/keywords` y sabe exactamente
  qué seeds, mercado, métodos, límite y costo se enviarán.
- La pantalla distingue datos medidos de GSC (`●`) y estimados de Labs (`◑`), muestra la antigüedad y
  nunca rellena valores faltantes con cero, guion ambiguo o un score inventado.
- Cada candidato ofrece acciones gobernadas con la consecuencia correcta: declarar objetivo, seguir
  oportunidad, preparar grounded queries o descartar; ninguna acción se ejecuta sin confirmación.
- La experiencia funciona a 1440px y 390px, con teclado, foco, reduced motion, aria-live y
  `scrollWidth === clientWidth`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1, §7, §9, §10.1, §10.4, §10.5)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `DESIGN.md`
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Reusar el shell de S1–S3:** `SeoSearchVisibilityTabs`, breadcrumb, Space/target context y
  `SurfaceRecipe kind='analyticsReport'` con `WorkbenchHeader kind='report'` en la región `header`.
  No construir navegación, viewCode, menú ni header paralelo.
- **No route nueva:** la lente vive en `/admin/growth/seo/keywords` y se selecciona con el patrón de
  links/tabs existente. La URL compartible conserva `space` y agrega sólo query params de discovery.
- **No provider en UI:** la UI llama `queueKeywordDiscovery`/`readKeywordDiscovery`; no importa
  `postDataForSeoTask`, no conoce secrets y no lee tablas.
- **No lógica de dominio en JSX:** normalización, cost preview, ranking, estados de run y autorización
  vienen del reader/command; el componente sólo proyecta el ViewModel.
- **Tokens y primitives:** cero HEX, `px`, `fontFamily` o timing literal; usar theme/AXIS, spacing 4n,
  variantes canónicas y `motion/core/tokens.ts` si existe motion.
- **Copy:** todos los textos visibles, estados, CTA, aria y errores viven en `src/lib/copy/growth.ts`
  (`GH_GROWTH_SEO_KEYWORDS` o subnamespace de discovery); no strings repetidas en JSX.
- **Responsive por CSS:** no usar `useMediaQuery` ni cambiar el árbol React por ancho; la tabla desktop
  y la lista compacta deben derivarse con CSS/primitive adaptable para no repetir el bug de `useId`.
- **Surface economy:** no envolver cada región en una card. El builder es la superficie de comando, el
  resultado es el lienzo dominante, el drawer es la única superficie flotante.
- **A11y:** la tabla es fallback completo de cualquier dato visual; colores de `◑/●`, intención y
  estado siempre llevan texto/ícono/aria equivalente.

## Normative Docs

- `docs/tasks/to-do/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md`
- `docs/tasks/complete/TASK-1308-growth-seo-keyword-opportunities-ui.md`
- `docs/tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md`
- `docs/ui/wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md`
- `docs/ui/flows/TASK-1665-growth-seo-keyword-discovery-workbench-flow.md`
- `docs/ui/visual-directions/TASK-1665-growth-seo-keyword-discovery-workbench-direction.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1664` — commands, reader, DTO, limits, status and cost preview.
- `TASK-1306` — shell SEO, guard de tres puertas, Space picker, viewCode
  `administracion.growth_seo` y route reachability base.
- `TASK-1308` — ruta `/admin/growth/seo/keywords`, `DataTableShell`, mapa/tabla y command de tracking
  ya operativo.
- `TASK-1659`/`TASK-1660` — intención de membresía y lente de objetivos para separar `objetivo` de
  `oportunidad`.
- `TASK-1666` — command de propuesta grounded; el workbench sólo lo invoca con candidatos elegidos y
  confirmación.

### Blocks / Impacts

- `TASK-1310` — puede reutilizar candidatos sólo después de una decisión/acción explícita.
- Manual operativo de Growth SEO — debe documentar la corrida diaria y sus estados una vez implementada.
- `src/lib/copy/growth.ts` — incorpora el copy de la nueva lente y sus estados.

### Files owned

- `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` — composición/activación de la lente, sin
  provider logic.
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryWorkbench.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryBuilder.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryRunStatus.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryResults.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryCandidateDrawer.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-query.ts`
- `src/components/greenhouse/primitives/` sólo si el primitive lookup demuestra una extensión reusable;
  no crear una primitive local paralela.
- `src/lib/copy/growth.ts`
- `src/lib/navigation/route-reachability-manifest.ts` sólo para confirmar/actualizar la child route
  existente; no se agrega una ruta nueva.
- `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`
- `docs/manual-de-uso/growth/descubrir-keywords-seo.md`

## Current Repo State

### Already exists

- `/admin/growth/seo/keywords` y sus componentes de oportunidades: mapa, veredicto, tabla y action
  de tracking.
- `SeoSearchVisibilityTabs` en `src/views/greenhouse/admin/growth/seo/overview/` como dueño del
  conmutador de sección.
- `SurfaceRecipe`, `WorkbenchHeader`, `GreenhouseBreadcrumbs`, `DataTableShell`, `EmptyState`,
  `GreenhouseAsyncActionButton`, `GreenhouseChip` y `AppECharts`/primitives aprobadas.
- `readKeywordDiscovery` y el DTO de `TASK-1664` una vez que la dependencia esté complete.
- `trackKeywords` y `untrackKeywords`, cuyo efecto recurrente y resultado por keyword ya están
  documentados.

### Gap

- No hay lente visual para iniciar una corrida ni leer su estado.
- No hay explicación visible del costo antes de confirmar.
- No hay tabla de candidatos con procedencia, as-of y acciones separadas.
- No hay drawer de detalle que muestre por qué llegó una keyword ni qué significa `◑`.
- No hay estados compactos/keyboard definidos para una corrida async y un lote mixto.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/admin/growth/seo/keywords/` +
  `src/views/greenhouse/admin/growth/seo/keywords/`.
- Future candidate home: `portal`
- Boundary: la UI consume `readKeywordDiscovery`, `queueKeywordDiscovery` y commands de acción; no
  cruza la frontera de `src/lib/growth/seo` ni toca PostgreSQL/provider.
- Server/browser split: page/server resuelve guard, Space, target, capability y ViewModel inicial;
  client components gestionan filtros/foco/confirmación y llaman route handlers. El DTO no incluye
  raw payload, secrets ni información de otra org.
- Build impact: `none`; se reutilizan primitives y carga chart existente, sin librería nueva.
- Extraction blocker: el shell y los viewCodes viven en Greenhouse; la surface queda extraction-ready
  porque no contiene lógica de DataForSEO ni SQL.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Growth con `growth.seo.observation.read` y, para ejecutar,
  `growth.seo.target.configure`.
- Momento del flujo: kickoff, planificación semanal y trabajo diario de investigación antes de abrir
  un brief de contenido o comprometer una keyword al tracking.
- Pregunta primaria: **"¿Qué nuevas búsquedas puedo investigar ahora y qué decisión merece cada una?"**
- Resultado perceptible: el operador termina con una lista pequeña de candidatos entendibles, cada uno
  con procedencia, volumen/dificultad estimados, posición medida si existe y una acción explícita.
- Fricción a reducir: copiar seeds entre herramientas, perder el costo, confundir suggestion con
  target y no saber si el resultado es actual.
- No-goals UX: no editar el sitio, no publicar contenido, no crear un prompt activo automáticamente,
  no comparar competidores (`TASK-1662`), no mostrar una métrica SEO+AEO fusionada y no ejecutar un
  cron invisible.

### Surface & system decision

- Surface: tercera lente **Descubrir** dentro de `/admin/growth/seo/keywords`.
- Composition Shell: `aplica`; hereda el `analyticsReport` header de las tres hermanas.
- Recipe: `analytics/report` con un **command builder** en la primera región y un **decision canvas**
  de candidates como momento visual dominante.
- Primitive decision: `reuse` para shell, tabs, table, drawer, chips, async action, empty/error; `extend`
  sólo si `DataTableShell` necesita un modo de candidate actions reusable. No crear `DiscoveryTable`
  como primitive de plataforma.
- Floating/Sidecar/Dialog: drawer de detalle/acción para no perder el contexto de la fila; confirmación
  de costo o efecto recurrente usa el command confirmation surface existente, no un modal local nuevo.
- Copy source: `src/lib/copy/growth.ts` con estados `disabled`, `permission`, `empty`, `queued`,
  `running`, `succeeded`, `partial`, `no_results`, `budget_blocked`, `provider_error`, `stale`.
- Access impact: `entitlements`; si el operador puede leer pero no ejecutar, la lente y resultados se
  ven y el botón primario no se renderiza.

### Information architecture

Desktop:

```text
SEO / Keywords
  ├─ Oportunidades
  ├─ Objetivos
  └─ Descubrir

Header: Space · mercado heredado · frescura · última corrida
R1: Builder de seeds + métodos + límites + preview de costo + [Descubrir]
R2: Estado de corrida / timeline / outcome por endpoint
R3: Decision canvas: filtros + tabla de candidatos
Sidecar: detalle, provenance, as-of y acciones gobernadas
```

Mobile 390px:

```text
Header compacto
Lente Descubrir
Builder en una columna, scope controls full row
Cost preview y CTA full width
Estado de corrida como banda persistente
Filtros en sidecar/drawer
Candidatos como cards de la misma tabla; no scroll horizontal
Detalle/acciones en drawer con foco restaurado
```

El orden móvil no es una serialización ciega del desktop: el costo y el CTA permanecen junto al
builder; el resultado empieza antes de filtros secundarios; las columnas auxiliares pasan a disclosure
de card sin eliminar fuente, as-of ni acción.

### Builder contract

El builder tiene exactamente estos controles:

| Control | Forma | Regla de producto |
|---|---|---|
| Seeds | textarea/token input, una por línea | 1–10 después de normalizar; mostrar `N/10`; duplicados se eliminan antes del preview |
| Fuente medida | select/toggle `Consultas GSC` y `Keywords seguidas` | costo provider `$0`; no se muestra si no hay datos; explica ventana 28d |
| Fuente manual | parte del input de seeds | no inferir marca/categoría; la seed es texto del operador |
| Dominio propio | switch `Buscar keywords del dominio` | OFF por default; advierte que usa Labs y costo estimado |
| Métodos | multi-select cerrado: `Sugerencias`, `Relacionadas`, `Ideas` | 1–3; `Ideas` acepta el lote; no permite endpoint libre |
| Mercado | select heredado de target | Google Labs; `location_code` + `language_code`; no texto libre |
| Alcance | segmented control `Rápido 25` / `Completo 50` | el número es el `limit` por endpoint; `100` sólo en modo explícito posterior |
| Preview | banda de costo/llamadas/filas/saldo | debe resolverse antes de habilitar confirmación |
| CTA | `Descubrir keywords` | disabled sin seed/método, permiso, flag o presupuesto |

La preview siempre responde estas cuatro preguntas sin abrir otra pantalla: qué se enviará, cuántas
llamadas, costo máximo estimado y qué pasa después. Si el costo real final es menor, no se presenta como
crédito reutilizable; el ledger es la autoridad.

### Result canvas contract

La tabla muestra, en `md+`, estas columnas y en `xs` las mismas propiedades como card:

1. Keyword — texto completo, búsqueda o copy de la fila.
2. Procedencia — `Seed manual`, `GSC medido`, `Keyword seguida`, `Sugerencias`, `Relacionadas`,
   `Ideas` o `Dominio propio`.
3. Cluster — `core_keyword` si existe; `Sin agrupador` si Labs no lo entrega.
4. Intención — valor textual y probabilidad si existe; `Sin dato de intención` si no.
5. Volumen — `searchVolume` con `◑` y `as-of`; `Sin dato de mercado` si null.
6. Dificultad — `keywordDifficulty` con `◑`; no mostrar `competition` como dificultad.
7. Presencia propia — posición/URL `●` desde GSC o `No aparece en la serie`; nunca inferir desde Labs.
8. Estado — `Nuevo`, `Ya seguido`, `Objetivo`, `Descartado`, `Preparando AEO`.
9. Acción — menú con las acciones permitidas por capability y estado.

Orden por defecto: candidates nuevos, luego volumen desc si existe, dificultad asc si existe y empate
estable. Filtros en URL: `discoveryRun`, `q`, `source`, `intent`, `state`, `minVolume`, `maxDifficulty`.
El filtro no cambia la selección de otra página ni permite actuar sobre una fila fuera de la vista sin
mostrarla.

### Candidate actions contract

| Acción | Confirmación | Command | Efecto permitido |
|---|---|---|---|
| `Declarar objetivo` | sí; mostrar compromiso recurrente y cupo | `trackKeywords(... intent='target')` | agrega membresía gobernada; outcome por keyword |
| `Seguir oportunidad` | sí; mostrar costo recurrente | `trackKeywords(... intent='opportunity')` | agrega membresía gobernada; no actualiza candidate histórico |
| `Preparar grounded queries` | sí; mostrar que crea draft AEO, no activa | `TASK-1666` | crea propuesta/draft gobernado, nunca run ni active set |
| `Descartar` | no si es reversible; announce | `recordKeywordDiscoveryAction('dismissed')` | sólo action log; candidate queda auditable |
| `Ver trayectoria` | no | link a `/admin/growth/seo/performance?keywords=…` | read-only, sin gasto nuevo |

Si una acción retorna outcome mixto, cada candidate conserva su resultado visible y `aria-live` anuncia
"resultado mixto". Nunca un snackbar genérico `Listo` para un lote parcial.

### State inventory

| Estado | Entrada | Render obligatorio | Acción permitida |
|---|---|---|---|
| `disabled` | flag OFF | explanation + sin CTA provider | links de documentación, no retry |
| `permission` | read sin configure | resultados/empty + sin botón de ejecución | lectura y navegación |
| `no_target` | sin Space/target elegible | EmptyState con camino de configuración | no seed persistente |
| `empty` | sin corrida | explicación + builder listo | ejecutar si permiso |
| `builder_invalid` | seed/method inválido | error de campo específico, no resetear texto válido | corregir input |
| `preview_blocked` | budget/allowance | costo, cupo restante y motivo | reducir alcance o esperar; no retry ciego |
| `queued` | run `pending` | número de corrida, timestamp y aviso async | salir/volver; no duplicar |
| `running` | worker claim | progreso por etapa/endpoints, no porcentaje inventado | volver a consultar; cancelación sólo si command existe |
| `succeeded` | candidates completos | tabla + frescura + costo real | acciones por candidate |
| `partial` | una etapa falló/budget fence | candidates materializados + razón por fuente | revisar o nueva corrida explícita |
| `no_results` | respuesta válida vacía | "No encontramos candidatos" + revisar seeds/método | nueva corrida con inputs diferentes |
| `provider_error` | status/timeout | error canónico sin raw body + retry explícito | nueva corrida, no auto-retry en UI |
| `stale` | run existente excede freshness copy | as-of y CTA de nueva corrida | no pintar como actual |
| `candidate_already_tracked` | candidate ya en set | estado y acción trayectoria/detalle | no duplicar tracking |
| `candidate_target` | intent target vigente | outcome y link a Objetivos | no segunda membresía |
| `mobile` | viewport compacto | cards + drawers + no overflow | mismo contrato de acción |

### Accessibility contract

- Heading order: `h1` Keywords → `h2` Descubrir keywords → `h2` Resultado de la corrida`; el detalle
  del candidate usa heading propio sólo cuando el drawer está abierto.
- El builder usa labels visibles, `aria-describedby` para límites/costo y `aria-invalid` en seed/method.
- El costo preview se anuncia por `aria-live='polite'` sólo cuando cambia por una acción del usuario,
  no en cada keystroke.
- La corrida tiene `aria-live='polite'` para transiciones `queued/running/succeeded/partial/error`.
- El drawer atrapa foco, `Escape` cierra, click-away respeta unsaved seed/action confirmation y el foco
  vuelve a la fila/CTA que lo abrió.
- La tabla tiene header semantics, orden/filtros anunciables, card equivalente en compact y actions
  navegables por teclado.
- El marcador `◑` siempre dice `Estimado de mercado · DataForSEO Labs`; `●` siempre dice `Medido · GSC`.
- Las flechas de difficulty/position no dependen de color; icono, texto y número se mantienen.
- `prefers-reduced-motion`: resultado final y status persisten; se elimina entrance/stagger del canvas
  y el drawer usa transición instantánea tokenizada.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`
- Route: `/admin/growth/seo/keywords`
- Persona: operador Efeonce con Space/target SEO y datos fixture controlados; no llamar provider real
  durante captura.
- Viewports: desktop 1440×900 y mobile 390×844.
- `qualityProfile: 'premium'`.
- Required steps:
  1. Entrar en Keywords y seleccionar `Descubrir`.
  2. Verificar header canónico, Space y mercado heredado.
  3. Escribir dos seeds y activar `Sugerencias` + `Relacionadas`.
  4. Verificar preview de llamadas/costo y que el CTA sigue disabled si fixture budget-blocked.
  5. Capturar builder listo; confirmar y capturar `queued`/`running`.
  6. Capturar resultado partial y succeeded con tabla/card.
  7. Abrir drawer de candidate y verificar provenance, as-of, `◑`, `●` y acción recurrente.
  8. Ejecutar una acción mixta simulada y verificar outcome por keyword/foco/aria-live.
  9. Repetir en 390px; comprobar `scrollWidth === clientWidth` y reduced motion.
- Required markers: `seo-keyword-discovery-builder`, `seo-keyword-discovery-cost`,
  `seo-keyword-discovery-status`, `seo-keyword-discovery-results`,
  `seo-keyword-discovery-candidate-drawer`.
- Evidence: default, builder with cost, queued/running, partial, succeeded, drawer, 390px, reduced
  motion, keyboard focus restore. No `fullPage` como única prueba de overflow.

### Copy contract

Crear en `GH_GROWTH_SEO_KEYWORDS.discovery`:

- tab label: `Descubrir`;
- title/subtitle: descubrimiento y decisión, nunca promesa de ranking;
- field labels/help: seed, source, methods, market, limit, estimated cost;
- states: disabled, no target, no results, queued, running, partial, budget blocked, provider error,
  stale;
- source labels: `GSC medido`, `Keyword seguida`, `Seed manual`, `Sugerencias`, `Relacionadas`,
  `Ideas`, `Dominio propio`;
- data labels: `◑ Estimado de mercado`, `● Medido por GSC`, `Sin dato de mercado`, `Sin medición propia`;
- action confirmation: distinguir `seguir` (gasto recurrente) de `preparar` (draft AEO sin activar);
- aria/keyboard/snackbar copy para outcome por keyword y partial.

El copy es es-CL, tuteo neutro, sin "target", "goal", voseo ni verbos que prometan tráfico, ranking,
clientes o revenue.

### Design decision log

- **Decision:** tercera lente dentro de la ruta existente. Alternativa rechazada: `/admin/growth/seo/
  discovery` separado. Razón: el objeto es el mismo target/keyword set y separar la ruta duplicaría
  Space, guard, frescura y context links.
- **Decision:** builder arriba, decision canvas después. Alternativa rechazada: tabla primero con
  drawer de filtros. Razón: el costo/inputs son la decisión primaria y deben verse antes del resultado.
- **Decision:** `SurfaceRecipe analyticsReport` + `WorkbenchHeader` canónico. Alternativa rechazada:
  header libre dentro de `primary`. Razón: el delta de S1–S3 fijó que chrome fuera de `header` rompe fold,
  mobile y surface economy.
- **Decision:** resultado como tabla/cards permanente, no sólo chart. Alternativa rechazada: scatter de
  volumen/dificultad. Razón: los candidatos requieren provenance, as-of y actions; la tabla es el
  fallback a11y y evita convertir estimaciones en una señal visual dominante.
- **Decision:** drawer para detail/action, no modal por candidate. Razón: el operador debe conservar
  el contexto y comparar candidates; el único modal permitido es confirmación gobernada del action.
- **Decision:** no nueva primitive hasta que lookup pruebe que las existentes no soportan el caso. Si
  aparece repetición cross-domain, se abre una task de primitive con contrato propio, no se oculta en
  esta implementación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- El wireframe, flow y dirección visual deben existir y ser revisados antes de JSX.
- Primero se implementa shell + builder + representative fixture y se captura first fold.
- Luego se integra status/reader y states; después candidate actions/drawer; GVC y mobile cierran.
- Ninguna UI se habilita mientras `TASK-1664` tenga flag OFF o no exista DTO real.
- La ruta/tab sólo se activa cuando route reachability, guard y reader tienen evidencia.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---:|---|---|
| El operador confirma gasto sin entenderlo | UI/costo | high | preview bloqueante, fórmula, budget/calls visibles, confirmación | GVC + action audit |
| Suggestion se confunde con tracking | producto | high | actions separadas y copy recurrente; no auto-track | test action boundary |
| Partial se muestra como success | UI/state | high | status por endpoint y outcome por candidate; fixture partial | scenario assertion |
| Tabla desborda 390px | UI/platform | medium | DataTableShell/card density, CSS-only, scroll-width gate | GVC 390 |
| Chrome duplica S1–S3 | UI/platform | medium | reusar `WorkbenchHeader`/recipe y compare sibling screenshots | premium scorecard |
| Raw provider error llega al usuario | security | low | canonical error mapping en backend; UI sólo codes/copy | redaction test |
| Action click dispara dos commands | UI/network | medium | disable pending, idempotency desde backend, outcome por keyword | duplicate action test |

### Feature flags / cutover

La UI respeta `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` desde el server ViewModel. Con OFF muestra estado
disabled y no monta controles que puedan encolar. No se crea un flag visual independiente. Revert =
flag OFF y no ruta provider.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Direction/wire/flow | revert docs, sin runtime | inmediato | sí |
| Shell/builder | no activar tab; revert JSX | <10 min | sí |
| Reader/status | flag OFF; render estado disabled | <5 min | sí |
| Candidate actions | ocultar actions configure/AEO; dejar lectura | <5 min | sí |
| GVC/docs | conservar evidencia y corregir antes de marcar complete | N/A | sí |

### Production verification sequence

1. `pnpm ui:readiness-check --task TASK-1665` y validar wireframe/flow/direction sin placeholders.
2. Capturar first fold fixture en 1440px; registrar `ACCEPT FIRST FOLD` o `REVISE` con hallazgos.
3. Capturar estados desktop/mobile con flag OFF: route guard, header y disabled honestos.
4. Activar fixture backend staging para una org autorizada; verificar queued/running/succeeded/partial.
5. Verificar actions sin provider real usando outcomes controlados y foco/aria-live.
6. Ejecutar GVC premium 1440+390, axe, keyboard, reduced motion y scroll-width.
7. Revisar scorecard; no cerrar con promedio ≥4.5 si hierarchy, surface economy, visual impact,
   fidelity o generic-template resistance quedan bajo 4.5.
8. Promover tab/ruta sólo con evidencia de reader/command/lane de `TASK-1664` y sin deploy automático.

### Out-of-band coordination required

N/A para código local. La activación productiva de la capability provider y cualquier action real de
tracking/AEO requieren autorización del operador; la UI no la infiere.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La lente `Descubrir` se alcanza desde `/admin/growth/seo/keywords` y hereda el viewCode, guard,
  Space y header canónicos; no crea ruta ni menú paralelo.
- [ ] Wireframe, flow y dirección visual existen, están linkeados desde la task y contienen mapping,
  estados, GVC premium, decision log y responsive transformation.
- [ ] El builder implementa exactamente los controles de seeds, fuente, métodos, mercado, alcance y
  preview definidos; no permite endpoint libre ni inputs fuera de los caps.
- [ ] El CTA queda disabled con razón si flag, permiso, target, seed, método o budget lo impiden.
- [ ] El preview muestra llamadas, filas, costo estimado, presupuesto/cupo y la consecuencia async antes
  de confirmar.
- [ ] La UI nunca importa DataForSEO ni accede tablas; sólo consume el command/reader de 1664 y 1666.
- [ ] Los estados `disabled`, `permission`, `empty`, `queued`, `running`, `succeeded`, `partial`,
  `no_results`, `provider_error`, `budget_blocked`, `stale` y `candidate_already_tracked` tienen copy,
  layout y recovery explícitos.
- [ ] La tabla/card muestra keyword, procedencia, cluster, intent, volume/difficulty, as-of, presencia
  GSC, estado y action; `◑` y `●` tienen texto/aria y nunca se mezclan.
- [ ] `Declarar objetivo`, `Seguir oportunidad`, `Preparar grounded queries`, `Descartar` y `Ver
  trayectoria` llaman exactamente al command indicado; ninguna acción se ejecuta sin confirmación.
- [ ] Outcome mixto muestra resultado por keyword, no snackbar genérico ni éxito agregado falso.
- [ ] Drawer focus trap/Escape/focus restore, keyboard navigation, aria-live y reduced-motion funcionan.
- [ ] 390px no tiene overflow horizontal y la card compacta conserva todos los datos decisorios.
- [ ] Copy visible vive en `src/lib/copy/growth.ts`, es es-CL/tuteo neutro y pasa el lint de copy.
- [ ] Scenario GVC premium captura builder, costo, status, result, drawer, desktop/mobile y reduced
  motion con los markers declarados.
- [ ] Scorecard premium cumple promedio ≥4.5 y floors del standard; cada finding queda corregido o
  documentado antes de cerrar.
- [ ] `pnpm task:lint --task TASK-1665`, `pnpm ui:code-lint --changed`, `pnpm ui:readiness-check
  --task TASK-1665` y `pnpm docs:closure-check` pasan.

## Verification

- `pnpm task:lint --task TASK-1665`
- `pnpm ui:readiness-check --task TASK-1665`
- `pnpm ui:code-lint --changed`
- tests focales de `src/views/greenhouse/admin/growth/seo/keywords/`
- `pnpm fe:capture growth-seo-keyword-discovery --env=staging`
- GVC desktop 1440 + 390, keyboard, axe, reduced-motion y scroll-width
- revisión humana del frame y scorecard premium
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados.
- [ ] `Handoff.md` quedó actualizado si hubo evidencia visual, bloqueo o rollout pendiente.
- [ ] `changelog.md`/client changelog se revisaron según visibilidad del cambio.
- [ ] Se ejecutó chequeo de impacto sobre `TASK-1664`, `TASK-1666`, `TASK-1660`, `TASK-1308` y
  `TASK-1310`.
- [ ] El cierre distingue `complete`, `code complete, rollout pendiente` u `operativamente bloqueado`.

## Follow-ups

- El portal cliente no declara objetivos ni inicia discovery en V1.
- Un cron diario automático requiere consentimiento de presupuesto y task propia.
- Un primitive de discovery reusable sólo se crea si aparece un segundo consumer real y tras el lookup
  de plataforma.

## Open Questions

- Ninguna de producto o layout. La ejecución sólo puede decidir detalles de implementación que no
  cambien el contrato anterior; cualquier cambio de semántica vuelve a esta task antes de JSX.

## Delta 2026-08-08 — enlace al master flow de EPIC-022

El master flow [EPIC-022 Search Visibility 360](../../ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md)
queda como contrato cross-surface de esta task. La lente `Descubrir` es una sub-lente de S3 dentro de
`/admin/growth/seo/keywords`, con selección canónica `view=discovery`; no agrega ruta, viewCode, menú
ni tab hermana de Search Visibility.

El master flow fija la conectividad que esta task debe respetar:

- S3 comparte shell, Space/target, permisos y wayfinding con `Oportunidades` (`TASK-1308`) y
  `Objetivos` (`TASK-1660`).
- El journey completo es `seed → preview → confirmación → queue → async status → candidates →
  decisión`; no existe candidate optimista ni provider call desde el browser.
- Las acciones son `trackKeywords(intent=target|opportunity)`, `recordKeywordDiscoveryAction`,
  `createGroundedQueryDraft` y navegación read-only a S2; cada una requiere confirmación y outcome
  por candidate.
- GSC medido (`●`) y Labs estimado (`◑`) permanecen separados; el mercado no se convierte en eje del
  mapa. `TASK-1666` crea sólo un draft AEO; `approve`, `active`, grader run y citation attribution
  quedan fuera de esta interacción.

Este delta no cambia el estado `UI ready: no`: la implementación aún necesita first-fold checkpoint,
GVC premium 1440/390, scorecard y gates de calidad definidos arriba.

## Delta 2026-08-08 — extensión del workbench hacia editorial, outcomes y plan agéntico

El núcleo de `Descubrir` conserva el contrato anterior y sigue dependiendo sólo de `TASK-1664` y
`TASK-1666`. Las costuras posteriores se registran como consumers condicionados, no como lógica que la
UI deba inventar:

- `Crear trabajo editorial` sólo aparece cuando existe `TASK-1667`, el candidate tiene decisión
  explícita y el actor puede crear un `SEO Editorial Work Item`. La UI llama el command canónico; no
  construye `ContentFactoryBrief`, no llama WordPress y no convierte `consolidate` en `refresh`.
- El drawer/timeline puede mostrar `brief_ready`, `draft_requested`, `draft_private`, `qa_pending`,
  `published_unverified`, `published_verified`, `insufficient_data` e `iteration_open` cuando los
  readers de `TASK-1667`/`TASK-1668` estén disponibles. Si la dependencia está OFF o ausente, la
  acción queda disabled con razón explícita; no se simula una integración completa.
- `Plan diario`/`Recomendación` es un consumer read-only de `TASK-1669`. Muestra modo `ai`,
  `baseline_fallback`, `partial` o `unavailable`, source refs, freshness, costo potencial y
  `requiresHumanApproval`; nunca ejecuta la recomendación desde JSX.
- El orden visible del flujo queda: `candidate → decisión → work item → brief → draft privado → QA
  humano → publicación observada → outcome → siguiente iteración`. La UI puede enlazar al siguiente
  paso, pero cada estado lo gobierna su command/reader propio.

Esta extensión no cambia `UI ready: no`. Requiere actualizar wireframe/flow/direction, mapping de
primitives, copy, GVC y scorecard cuando se implemente cualquiera de estas superficies; este delta es
contrato de integración, no evidencia de runtime.
