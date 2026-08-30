# TASK-1693 — Growth SEO: paginación real y fuentes de seed cableadas en la lente Descubrir

## Delta 2026-08-29 — recalibración pre-ejecución: la serialización `1691 → 1693` ya no aplica, y el `UI ready` sube a `yes`

Verificado contra el código antes de empezar, no contra la prosa:

🔴 **La serialización obligatoria `1694 → 1691 → 1693` se retira para el par `1691 → 1693`.** El motivo
escrito el 2026-08-15 era evitar *"tres encodings distintos de la misma columna"* sobre el mismo camino
de lectura y el mismo bloque de copy. Esa colisión **ya está resuelta, y en la dirección que el Delta
pedía**: `KeywordDiscoveryResults.tsx` ya pinta `◑` con `volumeUnit`, ya deriva la fecha con
`formatCapturedAt(candidate.providerLastUpdatedAt ?? candidate.capturedAt)` y ya usa `linkBarrier` con
la columna nombrada «Barrera de enlaces» (ISSUE-152). O sea: **la lente `Descubrir` ya tiene el encoding
que `TASK-1691` viene a llevarle a la tabla de OPORTUNIDADES**, que es la que quedó atrás. Además los
`Files owned` son disjuntos —1691 posee `KeywordOpportunityTable.tsx` + `keyword-opportunities-reader.ts`
+ `contracts.ts`; ésta posee `KeywordDiscovery*` + `keyword-discovery-query.ts`— y el único archivo común,
`src/lib/copy/growth.ts`, se toca en **bloques distintos** (`GH_GROWTH_SEO_PERFORMANCE.source` allá,
`GH_GROWTH_SEO_KEYWORDS.discovery` acá). Esta task hereda el encoding vigente; no inventa uno paralelo.
`TASK-1691` sigue siendo necesaria y sigue cerrando `ISSUE-154` — sólo deja de ser precondición.

**`TASK-1694` ya no es bloqueo**: el `### Depends on` todavía la declaraba `to-do` con «bloqueo duro».
Cerró el 2026-08-28 y su contrato está en el reader — `maxLinkBarrier`, `includeUnknownBarrier` e
`ignoredFilters` verificados en `keyword-discovery/reader.ts`. El Slice 3 arranca con su vocabulario
disponible, tal como el Delta anterior anticipaba.

**`UI ready: no` → `yes`**: `Implementation mapping`, `GVC scenario plan` y `Design decision log` están
completos, `pnpm task:lint --task TASK-1693` sale `errors=0 warnings=0`, y los tres docs de diseño de
`TASK-1665` existen y no son stubs (342 / 316 / 189 líneas). Cubren el **selector de fuente**
(wireframe §B. Fuentes, con tabla de costo y copy obligatorio) y los **filtros del canvas**
(§Filtros, con los query params exactos que `keyword-discovery-query.ts` ya parsea). La única
afordancia nueva sin wireframe es la **paginación**, y su patrón está resuelto en el
`### Design decision log` de esta task con las tres alternativas descartadas y su razón; se agrega al
wireframe de `TASK-1665` en el Slice 4, que es donde vive el contrato vivo de esa superficie.

## Delta 2026-08-28 — desbloqueada: la cardinalidad ya es definitiva

`TASK-1694` cerró (`code complete, rollout pendiente`), así que el `Blocked by` pasa a `none`. El
motivo del bloqueo queda resuelto en el origen: `readKeywordDiscovery` cuenta y pagina sobre
**keywords normalizadas**, no sobre filas de procedencia, y el colapso es determinista (representante
= menor `sourceRank`, desempate `candidateId` asc). El paginador se construye contra esa cardinalidad
—la definitiva— y el riesgo declarado en la matriz ("paginar sobre un universo que va a cambiar")
deja de aplicar.

Sigue vigente el otro riesgo de esa fila: paginar sobre una corrida VIVA. El colapso no lo resuelve.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — `Blocked by: TASK-1694`, y la ambigüedad de `keyword-discovery-query.ts` queda cerrada: se CABLEA

Origen: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1 brecha S1
y §5.2) + el propio `### Blocks / Impacts` de esta task, que ya pedía "verificar el estado de
`TASK-1694` antes de decidir".

Qué cambia:

- **`Blocked by: none` → `TASK-1694`.** Esta task ya lo insinuaba: la decisión del Slice 3 dependía
  del estado de esa task. Se hace explícito y duro. `TASK-1694` cambia la **cardinalidad** de
  `candidates`/`totalCandidates` (una fila por keyword, no por procedencia) y agrega
  `maxLinkBarrier` / `includeUnknownBarrier` / `ignoredFilters` al contrato de lectura. Paginar y
  filtrar sobre un universo cuya cardinalidad está por cambiar produce un paginador que hay que
  reescribir el mes siguiente.
- **La ambigüedad del Slice 3 se resuelve por adelantado: `keyword-discovery-query.ts` se CABLEA, no
  se retira.** Con `TASK-1694` aterrizando primero, el módulo gana el consumer legítimo que le
  faltaba: los filtros del canvas —incluido el de barrera de enlaces, que es el filtro canónico del
  dominio— viajan por URL y se aplican **server-side**. Retirarlo sería borrar el parse/serialize
  justo antes de necesitarlo. El Slice 3 deja de ser una decisión abierta y pasa a ser
  implementación; su rama "si se retira" queda muerta y su riesgo asociado, cerrado.
- **Serialización obligatoria del trío: `1694 → 1691 → 1693`.** Las tres tocan el mismo camino de
  lectura de candidatos/oportunidades y el mismo bloque de `src/lib/copy/growth.ts`. En paralelo
  producirían **tres encodings distintos de la misma columna** —una declarando la lente `◑`
  estimada, otra filtrando por barrera, otra paginando sobre el conteo— y el operador vería tres
  vocabularios para el mismo dato. En serie, cada una hereda el encoding de la anterior en vez de
  inventar el suyo.

Sin cambio de alcance: los cuatro slices siguen siendo los mismos. Lo que cambia es cuándo se puede
empezar y que el Slice 3 llega con la decisión ya tomada.

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1693-growth-seo-discovery-pagination-seed-sources.md`
- Flow: `docs/ui/flows/TASK-1693-growth-seo-discovery-pagination-seed-sources-flow.md`
- Motion: `docs/ui/motion/TASK-1665-growth-seo-keyword-discovery-workbench-motion.md`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Code complete; ui:quality BLOCK declarado`
- Rank: `TBD`
- Domain: `growth|seo|ui`
- Blocked by: `none` (desbloqueada el 2026-08-28; ver el Delta de esta task)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La lente `Descubrir` (TASK-1665) sirve UNA página de 50 candidatos de una corrida que materializa
hasta 500, y encola SIEMPRE con `seedSource: 'manual'` aunque el primitive de TASK-1664 soporta
cinco fuentes de seed. Esta task consume el `nextCursor` que el reader y la ruta ya devuelven, y
cablea el selector de fuente — con GSC a la cabeza, que es el modo de mejor oficio SEO: seeds con
demanda MEDIDA del propio Space y resolución sin costo de proveedor. De paso resuelve el código y el
copy que quedaron declarados sin consumidor.

## Why This Task Exists

Tres capacidades ya construidas y pagadas no llegan al operador, y las tres se leen como si no
existieran:

1. **Paginación declarada y no consumida.** `readKeywordDiscovery` pagina (default 50, techo 200) y
   devuelve `nextCursor`; la page no pasa `limit` ni `cursor` y descarta `nextCursor`. Una corrida
   completa materializa hasta `MAX_DISCOVERY_CANDIDATES_PER_RUN = 500`. El cierre de TASK-1665
   mitigó la MENTIRA (la tabla decía «Candidatos (312)» sobre 50 filas; hoy dice «50 de 312» + aviso
   de truncado), pero el operador sigue sin poder llegar a los otros 262 candidatos que ya pagó.
   El aviso vigente lo admite con todas sus letras: «se podrá recorrer cuando la lente tenga
   paginación». Esa frase es esta task.
2. **Cuatro de cinco fuentes de seed inalcanzables.** `SeoDiscoverySourceKind` tiene cinco valores
   (`manual`, `gsc_queries`, `tracked_keywords`, `target_domain`, `mixed`) y `resolveSeeds` los
   resuelve los cinco. El workbench hardcodea `seedSource: 'manual'` y el builder no renderiza
   selector. Consecuencia de oficio: el operador sólo puede **adivinar** seeds a mano, justo cuando
   la plataforma ya sabe cuáles tienen demanda real. `gsc_queries` resuelve por impresiones sobre
   `MAX_GSC_SEED_WINDOW_DAYS = 28` desde `seo_gsc_daily` — es el único modo que parte de demanda
   medida (`●`) en vez de intuición, y no le paga nada al proveedor por resolver las seeds.
3. **Código y copy declarados sin consumidor.** `keyword-discovery-query.ts` (parse/serialize del
   contrato de filtros de URL) no lo importa nadie: los filtros del canvas quedaron fuera de V1 por
   decisión explícita de TASK-1665. Y en `src/lib/copy/growth.ts` hay claves de la lente que ningún
   componente lee. Un contrato sin consumer no es una feature pendiente: es una afirmación falsa
   sobre lo que la pantalla hace, y el próximo agente la lee como verdad.

## Goal

- El operador recorre TODOS los candidatos de una corrida sin salir de la lente, contra el cursor
  del reader, sin volver a gastar con el proveedor.
- El operador elige la fuente de seed y puede lanzar una corrida desde sus consultas medidas de
  Search Console sin escribir una sola seed a mano.
- No queda en la lente ni un módulo ni una clave de copy sin consumidor: cada uno se cablea o se
  retira, con la razón escrita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §7, §9, §17)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **La lente es cliente, jamás segunda implementación.** Toda lectura pasa por
  `readKeywordDiscovery` y todo encolado por `queueKeywordDiscovery` a través de la ruta existente.
  NUNCA SQL en la vista, NUNCA una llamada al proveedor desde el browser.
- **Todo write provider-facing pasa por `enforceSeoRunEntitlement`.** Cambiar la fuente de seed NO
  autoriza a saltarse el chokepoint ni a recalcular el cupo en cliente: la banda de costo informa,
  el command autoriza.
- **`◑` estimado de mercado / `●` medido nunca se mezclan ni se promedian.** El modo `gsc_queries`
  produce seeds `●` medidas, pero los candidatos que devuelve el proveedor siguen siendo `◑`. La UI
  no puede sugerir que una seed medida vuelve medido a su resultado.
- **La ausencia de dato se nombra, no se rellena.** Una fuente sin insumo (`no_gsc_queries`,
  `no_tracked_keywords`) se dice con esas palabras; nunca se ofrece como disponible ni se degrada a
  `manual` en silencio.
- **Paginar no puede volver a gastar.** Pedir la página siguiente es una lectura sobre candidatos ya
  materializados: si un cambio hace que paginar dispare una corrida o una llamada al proveedor, el
  cambio está mal, sin excepción.
- **Copy visible reusable en `src/lib/copy/growth.ts`** (`GH_GROWTH_SEO_KEYWORDS.discovery`),
  validado con `greenhouse-ux-writing`. Cero literales nuevos en JSX.

## Normative Docs

- `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md` — Delta 2026-08-15,
  puntos 9 y «Derivado a tasks»: esta task es el follow-up nominado ahí.
- `docs/tasks/complete/TASK-1664-*.md` — contrato del primitive de discovery (fuentes, métodos,
  idempotencia, techos). `[verificar]` el slug exacto durante Discovery.
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` — master flow del programa; esta
  superficie es el nodo `Descubrir` de la ruta `/admin/growth/seo/keywords`.
- `.claude/rules/growth-seo.md` — invariantes del dominio que se cargan solos al tocar
  `src/lib/growth/seo/**`.
- `docs/manual-de-uso/` — sección de Growth/SEO correspondiente a la lente; el manual debe reflejar
  la paginación y el selector de fuente al cierre. `[verificar]` el archivo vigente.

## Dependencies & Impact

### Depends on

- `TASK-1694` (**cerrada 2026-08-28; ya no bloquea**) — corrigió la cardinalidad del candidato (una
  fila por keyword normalizada, no por procedencia) y agregó `maxLinkBarrier`, `includeUnknownBarrier`
  e `ignoredFilters` al contrato de lectura, los tres verificados en `keyword-discovery/reader.ts`. La
  paginación cuenta sobre ese universo y los filtros del canvas se cablean contra ese vocabulario.
- `TASK-1664` (complete) — primitive `queueKeywordDiscovery` + `resolveSeeds` con los cinco
  `SeoDiscoverySourceKind`; nada de lo que esta task cablea requiere tocarlo.
- `TASK-1665` (complete) — lente base: workbench, builder, run status, canvas, drawer, conmutador de
  lentes y los tres docs UI que esta task reusa.
- `GET /api/admin/growth/seo/keyword-discovery` — ya acepta `limit` y `cursor`
  (`src/app/api/admin/growth/seo/keyword-discovery/route.ts`). No se crea ruta nueva.
- `greenhouse_growth.seo_gsc_daily` — insumo de `resolveGscSeeds`; sin filas en la ventana de 28
  días el modo GSC no tiene qué ofrecer.

### Blocks / Impacts

- `TASK-1660` (`Objetivos`) — reusa el conmutador de lentes de esta superficie; cualquier cambio al
  helper de navegación entre lentes se coordina con esa task.
- `TASK-1691` — declara la lente `◑` estimada y su fecha de captura sobre la tabla de
  **oportunidades**. **Ya NO va antes que ésta** (ver el Delta 2026-08-29): la lente `Descubrir` ya
  pinta `◑` + `capturedAt` + «Barrera de enlaces», así que el encoding que 1691 propaga es el que esta
  superficie ya tiene. Archivos owned disjuntos y bloques de copy distintos; las dos pueden avanzar
  sin pisarse.
- `TASK-1692` — writers de los action kinds faltantes; comparte el drawer y el canvas de candidatos.
- `TASK-1694` — **cerrada**; aterrizó primero, así que el módulo `keyword-discovery-query.ts` tiene
  su consumer legítimo y la decisión del Slice 3 quedó cerrada en «cablear».

### Files owned

- `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryWorkbench.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryBuilder.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryResults.tsx`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-query.ts`
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/__tests__/`
- `src/lib/copy/growth.ts` (sólo el bloque `GH_GROWTH_SEO_KEYWORDS.discovery`)
- `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`
- `docs/ui/reviews/TASK-1693-growth-seo-discovery-pagination-seed-sources.scorecard.json`

## Current Repo State

### Already exists

- `src/lib/growth/seo/keyword-discovery/reader.ts` — pagina con `limit` (default 50,
  `MAX_DISCOVERY_READ_LIMIT = 200`) y `cursor` (offset serializado), devuelve `nextCursor` y
  `totalCandidates`. El orden gobernado de 8 llaves ya prioriza `●` medido y no seguido.
- `src/app/api/admin/growth/seo/keyword-discovery/route.ts` — el `GET` lee `limit` y `cursor` de
  `searchParams` y los pasa al reader tal cual. El transporte para paginar ya está entero.
- `src/lib/growth/seo/keyword-discovery/queue.ts` — `resolveSeeds` resuelve los cinco
  `SeoDiscoverySourceKind`: `manual`, `gsc_queries` (por impresiones, ventana
  `MAX_GSC_SEED_WINDOW_DAYS = 28`), `tracked_keywords`, `target_domain` (sin seeds; obliga a
  `keywords_for_site`) y `mixed` (manual + una fuente medida vía `mixedMeasuredSource`), con
  rechazos tipados `invalid_seed` / `no_gsc_queries` / `no_tracked_keywords`.
- `src/lib/copy/growth.ts` — `GH_GROWTH_SEO_KEYWORDS.discovery.builder` ya tiene el copy es-CL de
  las fuentes: `sourcesLabel`, `sourceGsc` + `sourceGscHelper` + `sourceGscUnavailable`,
  `sourceTracked` + `sourceTrackedHelper` + `sourceTrackedUnavailable`, `sourceManual` +
  `sourceManualHelper`, `sourceDomain` + `sourceDomainHelper`.
- `KeywordDiscoveryResults.tsx` — conteo honesto ya implementado por TASK-1665: `countTruncated`
  («{shown} de {count} candidatos») + `truncatedNotice`. Es la mitigación, no la solución.
- `KeywordDiscoveryWorkbench.tsx` — polling de 20 s acotado a `pending`/`running` con
  `router.refresh()`, ya implementado por TASK-1665. **NO está pendiente.**
- Los tres docs UI de TASK-1665 (wireframe 342 líneas, flow 316, motion) y el scenario GVC
  `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`.

### Gap

- La page llama `readKeywordDiscovery` sin `limit` ni `cursor`, descarta `nextCursor` y no lo pasa
  al workbench; no existe afordancia de «cargar más» ni paginador en el canvas.
- `KeywordDiscoveryWorkbench.tsx` envía `seedSource: 'manual'` fijo en el body del `POST`; el
  builder no tiene control de fuente, no expone `mixedMeasuredSource` y su `estimate` devuelve
  `null` cuando no hay seeds escritas — con lo que los modos sin seeds manuales (`gsc_queries`,
  `tracked_keywords`, `target_domain`) no podrían ni mostrar costo tal como está hoy.
- `keyword-discovery-query.ts` no tiene ningún importador en `src/` (verificado por grep): parse y
  serialize del contrato de filtros de URL sin un solo consumer.
- Claves de copy de la lente sin consumidor (verificado por grep contra `src/`, fuera del propio
  archivo de copy): en `builder` — `sourcesLabel`, `sourceGsc`, `sourceGscHelper`,
  `sourceGscUnavailable`, `sourceTracked`, `sourceTrackedHelper`, `sourceTrackedUnavailable`,
  `sourceManual`, `sourceManualHelper`, `sourceDomain`, `sourceDomainHelper`, `ariaLabel`,
  `seedsErrorEmpty`; en `run` — `retry`, `refresh`, `viewResults`, `lastRun`, `methodDone`,
  `methodFailed`, `methodSkipped`, `runningDetailStage`, `ariaLabel`; en `results` —
  `emptyFiltered`; en `actions` — `capacityNotice`. Reconfirmar la lista completa al tomar la task:
  algunas se cablean en este mismo trabajo y otras se retiran.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` +
  `src/views/greenhouse/admin/growth/seo/keywords/discovery/`
- Future candidate home: `portal`
- Boundary: la UI consume `readKeywordDiscovery` y la ruta `POST/GET` de keyword-discovery; no cruza
  la frontera de `src/lib/growth/seo/**`, no toca PostgreSQL ni el proveedor.
- Server/browser split: la page server resuelve guard, Space, target, capabilities, cupo y la
  primera página de candidatos; el cliente pide páginas siguientes por `fetch` a la ruta existente y
  gestiona foco, selección de fuente y confirmación. Ningún secreto ni payload crudo del proveedor
  cruza al browser.
- Build impact: `none`; se reusan primitives existentes, sin librería nueva.
- Extraction blocker: `none`; la surface no contiene lógica de DataForSEO ni SQL, y sus contratos ya
  viven del lado del dominio.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Growth con `growth.seo.observation.read` para mirar y
  `growth.seo.target.configure` para encolar una corrida; ver y gastar siguen siendo dos permisos.
- Momento del flujo: nodo `Descubrir` del master flow de EPIC-022, dentro de la sesión de
  investigación de keywords — antes de decidir qué seguir y, por lo tanto, antes de comprometer el
  gasto recurrente del rank capture.
- Resultado perceptible esperado: el operador recorre la corrida completa y puede lanzar una corrida
  nueva partiendo de sus consultas medidas, sin escribir seeds a mano.
- Friccion que debe reducir: dos callejones sin salida — «hay 312 candidatos y sólo veo 50» y «tengo
  que inventar las seeds aunque Search Console ya me dice cuáles importan».
- No-goals UX: no se rediseña el canvas ni el drawer; no se agrega scoring ni ranking nuevo; no se
  cambia el orden gobernado del reader.

### Surface & system decision

- Surface: `/admin/growth/seo/keywords?view=discovery` (misma ruta y mismo `viewCode`
  `administracion.growth_seo`; no nace surface nueva).
- Nav placement: `none` — no agrega destino de navegación visible; es la misma lente ya alcanzable
  por el conmutador de TASK-1665.
- Composition Shell: `aplica` — se conserva `SurfaceRecipe kind='analyticsReport'` con `plane='none'`
  y `AdaptiveSidecarLayout`; no se introduce un shell paralelo.
- Primitive decision: `reuse` — `DataTableShell`, `GreenhouseAsyncActionButton`,
  `ToggleButtonGroup`/`CustomTextField` ya usados por el builder, `EmptyState`. Si la afordancia de
  paginación no puede resolverse con primitives existentes, se declara y se justifica antes de
  crear una nueva.
- Adaptive density / The Seam: `aplica` — el canvas ya alterna tabla densa (md+) y cards (xs) por
  CSS; la afordancia de paginación debe existir en ambas presentaciones.
- Floating/Sidecar/Dialog decision: sin cambios; el drawer de candidato sigue siendo
  `AdaptiveSidecarLayout preferredMode='temporary'` con restauración de foco.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS.discovery`.
- Access impact: `none` — mismas capabilities que TASK-1665; ninguna capability ni entitlement nuevo.

### State inventory

- Default: primera página servida, conteo honesto y afordancia de página siguiente cuando
  `nextCursor` existe.
- Loading: página siguiente en vuelo — la afordancia queda en `loading` y las filas ya cargadas NO
  se desmontan ni se reordenan.
- Empty: sin corrida, `EmptyState` vigente; con corrida sin candidatos, el estado del run manda.
- Error: la página siguiente falla — se conserva lo cargado, se anuncia el error es-CL canónico en
  la live region existente y se ofrece reintento sólo si `actionable`.
- Degraded / partial: corrida `partial` — se pagina sobre lo que sí se materializó, sin sugerir que
  es el universo completo.
- Permission denied: sin `growth.seo.target.configure` el selector de fuente y el CTA no se
  renderizan (no se deshabilitan); paginar sigue disponible porque leer no gasta.
- Long content: 500 candidatos recorridos en páginas; sin scroll horizontal de página en desktop ni
  en 390px.
- Mobile / compact: la afordancia de paginación vive dentro de la card list, alcanzable con el
  pulgar y sin superponerse al contenido.
- Keyboard / focus: tras cargar una página, el foco NO salta al inicio de la tabla; el orden de
  tabulación sigue el orden visual y la afordancia conserva foco visible.
- Reduced motion: sin animación de entrada para las filas nuevas cuando
  `prefers-reduced-motion: reduce`; el estado final es idéntico.

### Interaction contract

- Primary interaction: pedir la página siguiente y elegir la fuente de seed.
- Hover / focus / active: se reusa el anillo de foco explícito ya definido en `selectionGroupSx` del
  builder; el selector de fuente hereda ese contrato, no lo reinventa.
- Pending / disabled: una sola petición de página en vuelo a la vez; el selector de fuente queda
  bloqueado mientras el encolado está en vuelo.
- Escape / click-away: sin cambios respecto del drawer vigente.
- Focus restore: sin cambios respecto del drawer vigente; la paginación no abre ninguna superficie
  flotante.
- Latency feedback: estado `loading` en la propia afordancia, sin spinner de página completa y sin
  desplazar el contenido ya leído.
- Toast / alert behavior: se reusa la live region `role='status' aria-live='polite'` del workbench;
  no se agrega una segunda.

### Motion & microinteracciones

- Motion primitive: `CSS` — se respeta el contrato de motion de TASK-1665; esta task no introduce
  motion nuevo más allá de la aparición de filas.
- Enter / exit: las filas nuevas se agregan al final sin desplazar ni re-animar las anteriores.
- Layout morph: ninguno.
- Stagger: ninguno para las filas paginadas; un stagger sobre una lista que crece produce ruido en
  la superficie donde se compara.
- Timing / easing token: tokens vigentes del tema; cero milisegundos literales.
- Reduced-motion fallback: `prefers-reduced-motion: reduce` elimina la transición conservando el
  estado final.
- Non-goal motion: sin scroll automático a la página nueva, sin skeleton animado que reemplace la
  tabla ya cargada.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`, rama
  `activeLens === 'discovery'`.
- Primitive / variant / kind: `SurfaceRecipe kind='analyticsReport'` + `DataTableShell` +
  `GreenhouseAsyncActionButton` + `ToggleButtonGroup`.
- Component candidates: `KeywordDiscoveryWorkbench.tsx` (estado de páginas acumuladas y fuente),
  `KeywordDiscoveryResults.tsx` (afordancia de página siguiente), `KeywordDiscoveryBuilder.tsx`
  (selector de fuente + costo por fuente), `keyword-discovery-query.ts` (cablear o retirar).
- Copy source: `GH_GROWTH_SEO_KEYWORDS.discovery` en `src/lib/copy/growth.ts`.
- Data reader / command: `readKeywordDiscovery` (server, primera página) y
  `GET /api/admin/growth/seo/keyword-discovery?runId=…&cursor=…` (cliente, páginas siguientes);
  `POST` con `intent: 'queue'` para el encolado con la fuente elegida.
- API parity: cero contrato nuevo — el reader, la ruta y el primitive ya sirven a app, Nexa, lane
  ecosystem y MCP. Esta task consume; si apareciera la necesidad de un contrato nuevo, se corta en
  una task `backend-data` aparte.
- Access / capability: `growth.seo.observation.read` para leer y paginar;
  `growth.seo.target.configure` para elegir fuente y encolar.
- States to implement: default, loading de página siguiente, error de página siguiente, fuente sin
  insumo, permiso parcial, mobile 390px, teclado/foco, reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts` (se extiende
  el existente; no se crea uno paralelo).
- Route: `/admin/growth/seo/keywords?view=discovery`
- Viewports: desktop 1440 + mobile 390.
- Quality profile: premium
- Required steps: abrir la lente con una corrida de más de una página; capturar el canvas; activar
  la afordancia de página siguiente; capturar con las filas acumuladas; abrir el selector de fuente
  y capturar la banda de costo con una fuente medida seleccionada.
- Required captures: canvas primera página, canvas tras cargar la siguiente, builder con selector de
  fuente, banda de costo con fuente medida, canvas en 390px.
- Required `data-capture` markers: `seo-keyword-discovery-results`,
  `seo-keyword-discovery-builder`, `seo-keyword-discovery-cost`,
  `seo-keyword-discovery-candidate`.
- Assertions: el conteo servido crece al paginar y coincide con las filas visibles; el total no
  cambia; ninguna acción de paginación dispara un `POST`; sin scroll horizontal de página.
- Scroll-width checks: desktop 1440 y mobile 390, `documentElement.scrollWidth <= clientWidth`.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` y evidencia de foco
  visible sobre la afordancia de paginación y sobre el selector de fuente.
- Review dossier: `pnpm fe:capture:review growth-seo-keyword-discovery`.
- Baseline decision / surface ID: se compara contra la baseline de TASK-1665 para la misma surface;
  todo delta de píxeles se declara en `BASELINE_DELTAS.md` con su razón.

### Design decision log

- Decision: paginación incremental acumulativa («cargar más») sobre el cursor del reader, en vez de
  un paginador numerado.
- Alternatives considered: (a) paginador numerado con salto a página arbitraria; (b) scroll infinito
  automático; (c) subir el `limit` a 200 y seguir sin paginar.
- Why this pattern: el cursor del reader es un offset sobre un orden gobernado y estable, no un
  índice de páginas navegable hacia atrás; un paginador numerado prometería un salto que el contrato
  no sostiene. El scroll infinito rompe la comparación entre filas, que es exactamente lo que el
  operador hace en este canvas, y deja sin ancla al teclado. Subir el techo a 200 no cierra el gap
  (el universo llega a 500) y multiplica el trabajo de la primera pintada.
- Reuse / extend / new primitive: `reuse` — la afordancia se arma con primitives existentes; si se
  demostrara que no alcanza, se declara antes de crear una nueva.
- Open risks: TASK-1694 **ya aterrizó**, así que la afordancia nace contando sobre el universo
  filtrado y sobre keywords distintas — no sobre el total crudo ni sobre procedencias. Es la línea
  base verificada, no una coordinación pendiente.

### Visual verification

- GVC scenario: `growth-seo-keyword-discovery`
- Viewports: desktop 1440 + mobile 390
- Required captures: las cinco listadas en el plan GVC.
- Required `data-capture` markers: los cuatro listados en el plan GVC.
- Scroll-width check: desktop y 390px.
- Accessibility/focus checks: foco visible en la afordancia y en el selector de fuente; anuncio del
  resultado de la carga por la live region existente; sin trampas de foco nuevas.
- Before/after evidence: canvas antes (50 de 312, sin salida) y después (recorrido completo).
- Known visual debt: los filtros del canvas siguen fuera de la superficie si el Slice 3 concluye en
  retirar el módulo de query.
- Visual scorecard: `docs/ui/reviews/TASK-1693-growth-seo-discovery-pagination-seed-sources.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Paginación por cursor consumida de punta a punta

- La page pasa `limit` explícito a `readKeywordDiscovery` y propaga `nextCursor` al workbench junto
  con `candidates` y `totalCandidates`.
- El workbench acumula páginas en estado local y pide las siguientes con `fetch` al `GET` existente
  (`runId` + `cursor`), sin duplicar filas ni reordenar lo ya pintado.
- `KeywordDiscoveryResults` recibe la afordancia de página siguiente y su estado (`idle` / `loading`
  / `error`), presente tanto en la tabla densa como en la card list.
- El conteo pasa de «{shown} de {count}» a la cifra real acumulada y el aviso de truncado se retira
  cuando ya no queda cursor.
- El copy del aviso vigente (`truncatedNotice`) se reescribe: hoy promete paginación futura y esa
  promesa deja de ser cierta.
- Tests: acumulación sin duplicados, corte cuando `nextCursor` es `null`, y que la paginación no
  emite ningún `POST`.

### Slice 2 — Selector de fuente de seed cableado

- El builder renderiza el selector de fuentes con el copy ya existente (`sourcesLabel`,
  `sourceManual`, `sourceGsc`, `sourceTracked`, `sourceDomain`), y expone `mixedMeasuredSource`
  cuando la fuente elegida es `mixed`.
- El workbench deja de hardcodear `seedSource: 'manual'` y envía la fuente elegida (más
  `manualSeeds` sólo cuando la fuente los usa).
- La disponibilidad de cada fuente se resuelve **server-side reusando lecturas que la page ya hace
  para la lente hermana** (conexión de Search Console y set de keywords vigentes del target); una
  fuente sin insumo se muestra no disponible con su copy (`sourceGscUnavailable`,
  `sourceTrackedUnavailable`), nunca se degrada a `manual` en silencio.
- La banda de costo estima por fuente: con `target_domain` no hay seeds y el único método válido es
  `keywords_for_site`; con `gsc_queries` / `tracked_keywords` el conteo de seeds proviene de la
  fuente, no del textarea. Hoy `estimate` devuelve `null` sin seeds escritas — hay que corregirlo o
  la banda queda muda justo en los modos nuevos.
- Los métodos de expansión se restringen coherentemente con la fuente (`target_domain` fuerza
  `keywords_for_site`; el resto conserva el techo de `MAX_DISCOVERY_EXPANSION_METHODS`).
- Los rechazos tipados del primitive (`no_gsc_queries`, `no_tracked_keywords`,
  `target_domain_requires_keywords_for_site`) se muestran con prosa es-CL, sin string crudo.
- Tests: cada fuente arma el body correcto; una fuente sin insumo no se puede enviar; el estimador
  responde en los modos sin seeds manuales.

### Slice 3 — Cero código y cero copy sin consumidor

- 🔴 **Decisión ya tomada (Delta 2026-08-15): `keyword-discovery-query.ts` se CABLEA, no se retira.**
  Con `TASK-1694` cerrada antes que esta task, el módulo tiene consumer legítimo: los filtros del
  canvas contra lo que el reader sostiene (`query`, `sourceEndpoint`, `intent`, `minSearchVolume`,
  `excludeTracked`, `status`) **más el filtro canónico de barrera de enlaces**
  (`maxLinkBarrier` / `includeUnknownBarrier`) que `TASK-1694` agrega al contrato. El Slice ya no
  evalúa alternativas: implementa, y registra la decisión heredada en el Design decision log.
- Los filtros viajan por URL con la allowlist existente y el filtrado ocurre **server-side**, porque
  filtrar en cliente sobre un cursor paginado mentiría sobre el universo filtrado — y con eso
  `results.emptyFiltered` gana consumidor.
- 🔴 **`maxDifficulty` no se cablea a la URL.** `TASK-1694` lo declara no-op y lo reporta en
  `ignoredFilters`; ofrecerlo como control visible sería devolverle al operador exactamente la
  decisión errada que ISSUE-152 documenta. Si un filtro llega por URL y el contrato lo ignoró, la
  superficie lo dice con el copy de la lente, nunca lo pinta como aplicado.
- La paginación recuenta sobre el **universo filtrado**, no sobre el total crudo: `totalCandidates`
  ya cuenta keywords distintas tras `TASK-1694`, y el conteo visible debe seguir a los filtros
  activos.
- Barrido final de claves de copy sin consumidor en `GH_GROWTH_SEO_KEYWORDS.discovery`: cada una se
  cablea o se borra, con la razón en el commit.
- Se agrega un test o gate que falle si el bloque de copy de la lente vuelve a acumular claves sin
  consumidor.

### Slice 4 — Evidencia visual y cierre documental

- Se extiende el scenario GVC existente con los pasos de paginación y selección de fuente.
- Captura y revisión desktop 1440 + mobile 390, scorecard registrado con el umbral declarado.
- Documentación funcional y manual de uso actualizados: cómo recorrer una corrida completa y cuándo
  conviene cada fuente de seed (con GSC como recomendación por defecto cuando hay demanda medida).
- `## Delta` en TASK-1660 si el conmutador de lentes cambió de forma.

## Out of Scope

- Cambiar el orden gobernado del reader, sus 8 llaves de desempate o el techo
  `MAX_DISCOVERY_CANDIDATES_PER_RUN`.
- Crear rutas, readers, commands, columnas o migraciones nuevas. Si un slice lo necesita, se corta
  una task `backend-data` aparte y esta se bloquea contra ella.
- Los writers de los action kinds faltantes (`selected_for_grounded_query`, `selected_for_target`,
  `promoted_to_tracking`) — son de TASK-1692.
- Filtro por barrera de enlaces en la API, deprecación de `maxDifficulty`, dedup cross-método y
  conciencia de canibalización — son de TASK-1694.
- El techo de candidatos del bridge grounded y el voseo de su prompt — son de TASK-1695.
- Polling de corrida viva: ya implementado en TASK-1665, no se toca.
- El aviso de truncado como tal: se retira porque la paginación lo vuelve innecesario, no se
  «mejora».
- Rediseño visual del canvas, del drawer o del conmutador de lentes.

## Detailed Spec

### Contrato de paginación

El cursor del reader es un **offset serializado** sobre el orden compuesto en memoria, no un
identificador opaco:

```ts
const offset = input.cursor ? Math.max(0, Number.parseInt(input.cursor, 10) || 0) : 0
const page = candidates.slice(offset, offset + limit)
const nextCursor = offset + limit < totalCandidates ? String(offset + limit) : null
```

Consecuencias que la UI debe respetar:

- El orden es estable dentro de una corrida terminada, así que acumular páginas es correcto. Sobre
  una corrida `pending`/`running` el universo crece bajo los pies: el polling de 20 s ya reproyecta
  la primera página, y la afordancia de paginación **no debe ofrecerse hasta que la corrida termine**
  — paginar sobre un universo en movimiento produce filas duplicadas o saltadas sin aviso.
- `limit` tiene techo server-side de 200. Pedir más no rompe, se recorta.
- El `GET` exige `organizationId` y `runId`; el `cursor` viaja como string tal cual lo devolvió el
  reader. La UI **no compone el cursor a mano**: reusa el que vino.

### Contrato de fuentes de seed

`SeoDiscoverySourceKind` tiene cinco valores y `resolveSeeds` los cubre todos:

| Fuente | Insumo | Costo de resolver | Métodos válidos | Rechazo tipado |
|---|---|---|---|---|
| `manual` | textarea del operador | cero | expansión (techo `MAX_DISCOVERY_EXPANSION_METHODS`) | `invalid_seed` por seed |
| `gsc_queries` | `seo_gsc_daily` del propio Space, ventana 28 días, por impresiones | cero | expansión | `no_gsc_queries` |
| `tracked_keywords` | membresías vigentes del target | cero | expansión | `no_tracked_keywords` |
| `target_domain` | dominio canónico del target, sin seeds | el del método | sólo `keywords_for_site` | `target_domain_requires_keywords_for_site` |
| `mixed` | manual + una fuente medida (`mixedMeasuredSource`) | cero | expansión | el de la fuente medida |

Reglas de presentación:

- `gsc_queries` es el modo de mejor calidad SEO y debe presentarse como tal: parte de demanda
  **medida** (`●`) del propio Space y no le paga nada al proveedor por resolver las seeds. Eso no lo
  convierte en gratis: la expansión sigue costando y la banda de costo lo dice igual.
- La lente `●` de la seed **no se propaga** al candidato: los resultados del proveedor siguen siendo
  `◑` estimados. Ninguna etiqueta puede sugerir lo contrario.
- Una fuente sin insumo se muestra explícitamente no disponible, con su razón. Degradar a `manual` en
  silencio es la falla que este dominio prohíbe: el operador creería que corrió lo que pidió.

### Copy

Todo el copy visible sale de `GH_GROWTH_SEO_KEYWORDS.discovery`. Reglas de tono heredadas del bloque
(están escritas en el propio archivo y siguen vigentes): nunca prometer tráfico ni ranking;
«descubrir» ≠ «seguir»; la ausencia de dato se nombra, no se rellena. La afordancia de paginación
usa el verbo de recorrer, no el de buscar: no dispara una corrida nueva y el copy no puede sugerirlo.
Validar con `greenhouse-ux-writing` antes de escribir JSX.

## Rollout Plan & Risk Matrix

Cambio aditivo de portal, detrás de flags ya existentes (`isSeoModuleEnabled` +
`isSeoKeywordDiscoveryEnabled`), sin migración, sin contrato nuevo y sin gasto nuevo por sí mismo:
paginar es lectura pura. El riesgo real no es de infraestructura sino de **oficio** — habilitar
fuentes de seed que resuelven sin costo pero cuya expansión sí cuesta.

### Slice ordering hard rule

- Slice 1 (paginación) es independiente y puede shippear solo. No toca el camino de gasto.
- Slice 2 (fuentes) **debe ir después de Slice 1**: sin paginación, habilitar fuentes que producen
  más candidatos empeora el callejón sin salida que esta task viene a cerrar.
- Slice 3 (código y copy sin consumidor) depende de Slice 1 y Slice 2, porque parte de ese copy se
  cablea en ellos y sólo entonces se sabe qué sobra.
- Slice 4 (evidencia + docs) cierra al final, sobre el estado ya integrado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Paginar sobre una corrida en curso duplica o saltea filas (el universo crece bajo el cursor) | UI | medium | la afordancia sólo se ofrece con la corrida terminada; el polling vigente cubre el resto | filas repetidas en el canvas; reporte del operador |
| Habilitar fuentes medidas multiplica el volumen de corridas y con él el gasto de expansión | finance / provider budget | medium | la banda de costo estima por fuente antes de confirmar y `enforceSeoRunEntitlement` sigue siendo el único autorizador | cupo del período consumido antes de tiempo; rebote `seo_budget_exhausted` |
| Una fuente sin insumo degrada a `manual` en silencio y el operador cree que corrió lo que pidió | UI / SEO | low | preflight server-side de disponibilidad + rechazo tipado mostrado con prosa es-CL | corrida con `sourceKind` distinto al elegido |
| `target_domain` enviado con métodos de expansión rebota el enqueue | UI | medium | los métodos se restringen en la propia UI según la fuente | `invalid_seed` con reason `target_domain_requires_keywords_for_site` |
| Empezar antes de que TASK-1694 cierre y paginar sobre una cardinalidad que va a cambiar (procedencias hoy, keywords después) | UI | medium | `Blocked by: TASK-1694` es bloqueo duro; el conteo y el paginador se construyen contra el universo colapsado, no contra el actual | `totalCandidates` que no coincide con las filas visibles tras el merge de 1694 |
| Tres encodings distintos de la misma columna de mercado si 1691 y 1693 avanzan en paralelo | UI / copy | medium | serialización declarada `1694 → 1691 → 1693`; esta lente hereda el encoding de frescura de TASK-1691 en vez de definir el suyo | dos claves de copy distintas para la misma afirmación en `GH_GROWTH_SEO_KEYWORDS` |

### Feature flags / cutover

Sin flag nuevo. La lente entera ya vive detrás de `GROWTH_SEO_MODULE_ENABLED` +
`GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` (`src/lib/growth/seo/flags.ts`, `[verificar]` los nombres
exactos y su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` durante Discovery). Cutover
inmediato al merge para los Spaces que ya tienen la lente encendida; no se introduce ninguna
variable de entorno nueva, así que no hay fila que agregar al ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR + redeploy; la lente vuelve al conteo honesto con aviso de truncado | <10 min | si |
| Slice 2 | revert del PR; el workbench vuelve a `seedSource: 'manual'` fijo. Las corridas ya encoladas con otra fuente NO se revierten (son append-only y ya se pagaron) | <10 min | parcial |
| Slice 3 | revert del PR; si el módulo de query se retiró, el revert lo restituye desde git | <10 min | si |
| Slice 4 | doc-only + scenario; revert directo | <5 min | si |

### Production verification sequence

1. Local con `pnpm dev`: corrida con más de 50 candidatos, recorrerla completa, verificar que ningún
   `POST` sale del navegador al paginar (pestaña Network).
2. Local: lanzar una corrida con `gsc_queries` en un Space con Search Console conectado y verificar
   que el `sourceKind` persistido coincide con el elegido.
3. Local: Space sin consultas medidas — la fuente se muestra no disponible y no se puede enviar.
4. GVC desktop + mobile con el scenario extendido; revisar el dossier y registrar el scorecard.
5. Staging: repetir 1–3 contra un Space real y verificar el cupo del período antes y después.
6. Producción: verificar la primera corrida real por fuente medida y el gasto registrado en el
   ledger del período.

### Out-of-band coordination required

Avisar al operador de Growth antes de habilitar las fuentes medidas: cambian el volumen esperado de
corridas y, con él, el consumo del cupo del período. No requiere cambios en Azure, GCP, HubSpot ni
en el proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La page pasa `limit` explícito al reader y propaga `nextCursor` al workbench.
      — `DEFAULT_DISCOVERY_READ_LIMIT` exportado como SSOT: server y cliente piden el mismo tamaño
- [x] Con una corrida de más de una página, el operador llega al último candidato sin recargar la
      página y sin que salga ningún `POST` del navegador.
      — verificado contra el dev server con datos reales: `limit=10` → `nextCursor 10` → segunda página con candidatos distintos → `nextCursor 20`; el test afirma `GET` y **cero `POST`**
- [x] Las filas acumuladas no se duplican ni se reordenan al cargar una página nueva.
      — dedup por `candidateId` contra lo ya visible, con test del caso «el cursor devolvió el mismo dos veces»
- [x] La afordancia de página siguiente desaparece cuando `nextCursor` es `null`.
- [x] La afordancia de página siguiente no se ofrece mientras la corrida está `pending` o `running`.
      — ausente, no deshabilitada
- [x] El aviso `truncatedNotice` ya no promete una paginación futura (se retiró o se reescribió).
      — reescrito: ahora explica el orden y que recorrer no vuelve a gastar
- [x] El builder renderiza el selector de fuente con el copy existente y el workbench envía la fuente
      elegida en vez de `'manual'` fijo.
      — y cada fuente declara cuántas seeds aportaría
- [ ] Una corrida encolada con `gsc_queries` persiste `sourceKind = 'gsc_queries'` y sus seeds salen
      de `seo_gsc_daily`, verificado contra la corrida real.
      🔴 **NO EJERCITADO** — encolar una corrida GASTA con el proveedor y no se autorizó gasto para esta task. El camino está cubierto por test (`seedSource` correcto en el body) y el primitive ya persistía `sourceKind` desde TASK-1664. Queda como verificación de rollout
- [x] Una fuente sin insumo se muestra no disponible con su copy y no se puede enviar; ninguna
      fuente degrada a `manual` en silencio.
      — con test del invariante «bloquea, no degrada»
- [x] Con `target_domain` la UI restringe los métodos a `keywords_for_site` antes de enviar.
- [x] La banda de costo muestra una estimación en los modos que no usan seeds manuales.
      — el estimador devolvía `null` sin seeds escritas y habría quedado mudo justo en los modos nuevos
- [x] Los rechazos tipados del primitive se muestran con prosa es-CL canónica, sin string crudo en
      inglés.
      — y las fuentes sin insumo se bloquean ANTES del envío, así que el rechazo no llega
- [x] `keyword-discovery-query.ts` quedó **cableado** (la decisión heredada del Delta 2026-08-15; no
      se retira) y sus filtros se aplican server-side, incluido `maxLinkBarrier`.
      — verificado en vivo: `query=zzznoexiste` → 0, `lamina` → 2, `maxLinkBarrier=low` → 19 de 50
- [x] `maxDifficulty` no se ofrece como filtro visible; si llega por URL, la superficie declara que
      el contrato lo ignoró en vez de pintarlo como aplicado.
      — no se traduce al reader ni aunque llegue por URL; `ignoredFilters` vacío en la corrida verificada
- [x] El conteo visible y la afordancia de paginación cuentan sobre el universo **filtrado** y sobre
      keywords distintas (cardinalidad de `TASK-1694`), no sobre procedencias ni sobre el total crudo.
      — verificado: con `?q=lamina` el encabezado titula «2 candidatos», no 50
- [x] `TASK-1694` está `complete` antes de tomar esta task, y la declaración de la lente `◑` de
      `TASK-1691` ya está en la superficie: esta lente la reusa, no la redefine.
      — 1694 cerrada y su contrato verificado en el reader; la lente `◑` ya estaba en la superficie (por eso se retiró la serialización con 1691)
- [x] Ninguna clave de `GH_GROWTH_SEO_KEYWORDS.discovery` quedó sin consumidor, y existe un test o
      gate que lo sostiene.
      — 10 retiradas con su razón + gate `keyword-discovery-copy-consumers.test.ts` que descubre las claves recorriendo el objeto real
- [x] Ninguna capability, entitlement, ruta, reader, command ni migración nueva fue creada.
- [x] Se declaró `Execution profile: ui-ux` y `UI impact: interaction` según el alcance real.
- [x] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation
      mapping, GVC scenario plan y design decision log de esta superficie; si pasa a `yes`, pasa
      `pnpm task:lint --task TASK-1693`.
      — pasó a `yes` con wireframe y flow PROPIOS de esta task; `ui:readiness-check` 0/0 y `design-contract:lint` PASS
- [x] Se declaró `Wireframe`, `Flow` y `Motion` apuntando a archivos existentes.
- [x] El copy visible reusable vive en `src/lib/copy/growth.ts`; cero literales nuevos en JSX.
- [x] Los estados loading, error, empty, degradado, permiso parcial y mobile quedan cubiertos.
      — incluido el empty FILTRADO, que antes diría «no hay candidatos» siendo falso
- [x] Motion y microinteracciones tienen fallback de `prefers-reduced-motion`.
      — el capture corre con `reducedMotionCheck`; esta task no introduce motion propio
- [ ] GVC desktop 1440 + mobile 390 capturado, mirado y con scorecard registrado sobre el umbral
      declarado.
      🔴 capturado y **mirado** (dos loops de corrección salieron de mirarlo), scorecard registrado — pero `pnpm ui:quality` **BLOQUEA**: average 4.41 y `visualImpact` 4.2 contra el 4.5 del gate. Las notas NO se inflaron; el techo de impacto lo fija el canvas de TASK-1665, fuera de alcance
- [x] Sin scroll horizontal de página en desktop ni en 390px.

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/views/greenhouse/admin/growth/seo/keywords src/lib/growth/seo/keyword-discovery`
- `pnpm test` (full suite, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
  **Corrido con autorización el 2026-08-30: VERDE.** Compiló en 28,6 s, 23/23 páginas estáticas
  generadas, cero errores de tipo o de boundary. `/admin/growth/seo/keywords` y
  `/api/admin/growth/seo/keyword-discovery` figuran en la tabla de rutas como dinámicas (`ƒ`),
  que es lo esperado: la lente consume sesión y la ruta es un handler.
- `pnpm fe:capture growth-seo-keyword-discovery` + `pnpm fe:capture:review growth-seo-keyword-discovery`
- `pnpm ui:code-lint`, `pnpm design:lint`, `pnpm ui:quality`
- `pnpm task:lint --task TASK-1693` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Verificación manual con `pnpm dev` sobre un Space real con corrida de más de 50 candidatos y con
  Search Console conectado.

## Closing Protocol

      — verde en los dos viewports del capture
- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] Se actualizó el `## Delta` de TASK-1665 marcando cerrados los puntos 9 (conteo/paginación) y la
      derivación de las fuentes de seed.
- [x] Se revisó TASK-1660, TASK-1691 y TASK-1694 por impacto cruzado sobre la misma superficie —
      1660 reusa el conmutador de lentes y **no se tocó**; 1691 dejó de ser precondición (Delta
      2026-08-29) y sigue vigente para la tabla de oportunidades; 1694 aportó el vocabulario del
      filtro de barrera que esta task consume.
- [x] La documentación funcional y el manual de uso de la lente describen la paginación y las fuentes
      de seed, con GSC recomendado cuando hay demanda medida — manual v1.3.

## Follow-ups

- 🔴 **`pnpm ui:quality` queda en `BLOCK`** (average 4.41, `visualImpact` 4.2 contra el 4.5 del gate).
  No se cierra inflando notas: el techo de impacto lo fija el canvas de `TASK-1665`, que esta task
  declara fuera de alcance en sus No-goals UX. Subirlo pide una task de superficie con dirección
  visual propia — la tabla de nueve columnas podría codificar visualmente volumen y barrera en vez de
  texto. **Esa task no existe todavía.**
- **Verificación de rollout pendiente:** encolar una corrida real con `seedSource='gsc_queries'` y
  confirmar que persiste `sourceKind='gsc_queries'` con seeds de `seo_gsc_daily`. **Gasta con el
  proveedor**, así que necesita autorización del operador; el camino está cubierto por test y el
  primitive persiste `sourceKind` desde `TASK-1664`.
- La afordancia de paginación no se pudo ver en un frame porque la corrida mayor del Space tiene
  exactamente 50 candidatos = el tamaño de página. Se verá sola cuando exista una corrida mayor; su
  transporte ya quedó verificado contra datos reales.
- Si el Slice 3 concluye en cablear los filtros, evaluar si `state` merece un filtro server-side
  propio en el reader (hoy no existe) — sería una task `backend-data` aparte.
- Coordinar con TASK-1694: cuando el filtro por barrera de enlaces exista en la API, la afordancia de
  paginación debe contar sobre el universo filtrado.
- Evaluar exponer la elección de fuente de seed también en el lane ecosystem/MCP, si el contrato del
  `POST` no la expone ya de forma completa.

## Open Questions

- ¿La afordancia es «Cargar más» acumulativa o un paginador de página anterior/siguiente? El decision
  log propone acumulativa por el contrato del cursor; confirmar con el operador antes del JSX.
- ¿`mixed` se ofrece en V1 o se deja para cuando las fuentes simples estén rodadas? Ofrecer cinco
  opciones de golpe puede volver el builder más difícil de leer que el problema que resuelve.
- ~~¿El Slice 3 cablea los filtros o retira el módulo?~~ **Resuelta en el Delta 2026-08-15: se
  cablea.** `TASK-1694` aterriza primero y le da el consumer que le faltaba.
