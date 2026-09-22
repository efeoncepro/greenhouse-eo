# TASK-1847 — Efeonce Insights: gráficos y catálogos premium para deck e informe vertical

## Delta 2026-09-15

- `ChartSpecV1` (familias bar/bar_grouped/bar_stacked/line/pie/donut/scatter, `validateChartSpec`) y `EditorialPlanV1` ya existen en `src/lib/efeonce-insights/contracts/`; el planner determinista emite barras con origen cero y equivalente tabular. Esta task construye la librería/catálogos sobre ese contrato, no otro. — por TASK-1845
- **Rollout 2026-09-15 (TASK-1845):** el puerto de outputs y el pipeline por fases ya corren **en producción** con `INSIGHTS_GENERATION_ENABLED=true` en staging y producción (emisión e IA OFF); ediciones sintéticas (org sandbox «Greenhouse Demo»; «producción» nombra el runtime, no el dato) `EO-INS-000012/13` (staging) y `EO-INS-000014` (producción) quedaron `ready_for_review`. El gateway `efeonce-mcp` 1.5.0 federa las 4 tools (47 tools, 8 clases de scope) y el scope `efeonce.mcp.insights.write` existe en Entra (sin cliente que lo porte ⇒ `insufficient_scope` al crear). Detalle: arquitectura §14. Hay planes congelados de ediciones sintéticas para probar catálogos (con 0 hechos: la org sintética no tiene datos en la ventana), así que el primer fixture con cifras debe construirse aparte.
- Desbloqueada de TASK-1845 (2026-09-15): la foundation de Efeonce Insights está en producción (release `9c094688309d`, generación ON en Vercel, gateway v1.5.0 federado, scope en Entra); TASK-1845 sigue `in-progress` sólo por dos evidencias de cierre (ensayo `migrate:down` y sesión MCP con token humano) que no condicionan este trabajo. — cerrado por rollout de TASK-1845

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-22 — canary con datos reales en staging y cutover del deck

**Desplegado a staging** (`develop` hasta `21c991999`; worker `artifact-worker` por su workflow). **Sin release a
producción.** Módulo `insights_v1` asignado a Grupo Berel y Sky Airlines (autorizado por el operador). Ediciones del
canary, audiencia interna y sin emitir: Demo `EO-INS-000018`, Berel SEO+AEO `EO-INS-000019` (1–20 sep), Sky ICO
`EO-INS-000020` (agosto).

**Lo que el canary encontró y quedó cerrado** (los fixtures no veían ninguno):

1. Validador de cifras: la fecha `2026-08` se partía en `-08`, y las cifras de la etiqueta del hecho (`(≤10)`, el mes)
   contaban como inventadas. Una fecha es un token; la etiqueta literal de un hecho referenciado se enmascara. La
   guarda anti-fabricación no se relajó (commit `465e9f487`).
2. Límites y metodología imprimían ids internos y el nombre de la función lectora (`908384706`).
3. OTD nunca llegó a un informe: `otd` vs `otd_pct` en el registro ICO, omitido en silencio. AEO con ids de
   proveedor y dimensiones en inglés; conteos sin su total (`5639547ca`).
4. Figuras del A4: formato propio en vez del canónico, barras sin nombre de métrica, recorte `slice(0, 6)`, barra
   destacada invisible (colisión con `.lead` del molde), guarda que rechazaba todo redondeo, resumen recortado a 7
   (`5639547ca`).
5. El deck productivo sobre `deck-axis` recortaba con «…», duplicaba filas y callaba métricas: **cutover de
   `deck_pdf` a `insights-deck`** con mapper nuevo; período rotulado desde la ventana medida (`21c991999`).

6. Un rechazo del período de comparación se leía como falta de la ventana actual: `EvidenceRejectionV1.scope` opcional
   y aditivo; el planner dice «en el período anterior, …» (`b6e32a09e`).

**Verificado en el runtime de staging** (revisiones v2 generadas y renderizadas por Vercel + dispatcher + Job
`artifact-worker`, sin intervención manual): Berel `EO-INS-000019 v2` — deck `insights-deck` 13 láminas + A4 15
páginas; Sky `EO-INS-000020 v2` — deck 5 láminas + A4 7 páginas con OTD 81,9 % (el arreglo de `otd_pct`, visible en el
runtime real). Las cuatro salidas completaron al primer intento y se revisaron página por página; coinciden con la
vista previa local (`scripts/insights/preview-edition.ts`, nuevo). Ese render mostró una última frase falsa —el resumen
decía «Sin hallazgos adicionales» con OTD en el capítulo—, corregida después y cubierta por test.

## Delta 2026-09-21 — construido en local, sin rollout

**Hecho y probado:** ADR de paginación vertical (`Accepted`, indexado) · `measureSlideFit` +
`paginateFlow` (puro, agnóstico de unidad) · 15 familias de geometría, incluido un Venn de dos
conjuntos con áreas proporcionales reales · la marca se compila una vez para N catálogos ·
catálogo `insights-report` (A4 794×1123) con molde compartido y 5 plantillas que renderizan ·
`src/lib/copy/insights.ts` · `report-mapper` con figuras, tablas paginadas y límites ·
`report_pdf` admitido en los 4 puntos (contrato, command, mapper, worker).

**Pendiente declarado, no silenciado:**

1. **Cutover del `deck_pdf` al catálogo propio.** El catálogo `insights-deck` ya existe, renderiza y está
   registrado en el worker, pero `deck_pdf` sigue componiendo con `deck-axis`. Cambiarlo altera un
   comportamiento productivo y necesita su canary; no es el final de una sesión.
2. **Promoción del baseline visual.** El gate ya fotografía los tres catálogos y los 9 frames nuevos están
   declarados en `BASELINE_DELTAS.md`, pero **sin promover**: `--freeze` exige declarar todos los frames
   cambiados, y los de `deck-axis` difieren entre corridas (19 y 20 en dos corridas de la misma máquina).
   Congelar los propios obligaría a rebaselinear los ajenos — el rebaseline silencioso que el gate impide.
   Bloqueado por ISSUE-122, que ahora tiene esa evidencia.
3. ~~**`UI ready: yes`**~~ — resuelto como **`n/a`** el 2026-09-22: el contrato de `UI ready` mide una pantalla
   del portal y esta superficie es un documento exportado a PDF. Los gates que aplican están verdes
   (`design-contract:lint`, `ui:code-lint`, `ui:quality` 4,50/piso 4,0) con dossier y scorecard sobre el render
   real; `ui:visual-gate` no aplica por construcción.
4. ~~**Triple documentación**~~ — hecha: arquitectura §14.7, funcional v1.7, manual y skill viva.
5. **Runtime**: nada desplegado, sin canary, sin push. `report_pdf` es `code complete`, no operativo.
6. **13 de 15 familias sin productor**: el planner emite `bar` y `bar_grouped`. Ampliarlo es trabajo
   nuevo del dominio y los Follow-ups de esta task prohíben abrir tasks preventivas.

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `n/a`
- Wireframe: `docs/ui/wireframes/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs-motion.md`
- Backend impact: `command`
- Epic: `EPIC-045`
- Status real: `Code complete, rollout pendiente (2026-09-22). Desplegado en staging (develop hasta 21c991999), NO en producción. Canary con datos reales (Berel SEO+AEO, Sky ICO) encontró y cerró: falsos positivos del validador, ids internos en límites/metodología, OTD nunca leído (otd vs otd_pct), figuras del A4 (formato, nombres, recortes, barra destacada invisible, guarda sin tolerancia de redondeo) y el deck sobre deck-axis; deck_pdf pasó a insights-deck. Vista previa local con datos reales: Berel 15 págs/13 láminas, Sky 7/5, 0 violaciones. Verificado en el runtime de staging (Berel v2 deck 13 + A4 15; Sky v2 deck 5 + A4 7 con OTD; las 4 salidas al primer intento). Falta: release a producción cuando haya consumidor, baseline visual (ISSUE-122) e índice paginado A4.`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega la biblioteca visual analítica y dos catálogos del Composer: deck horizontal e informe A4 vertical. Barras, líneas, circular/donut y dispersión derivan de ChartSpec y evidencia; marca Efeonce y cliente opcional, composición editorial y QA de cada página.

## Why This Task Exists

ChartSplit admite 2–4 barras porcentuales (único tipo de gráfico del catálogo, dibujado como anchos CSS recalculados por resolver) y el catálogo actual no resuelve un informe vertical multipágina. **Verificado 2026-09-21:** el mapper de render nunca lee `chapter.charts`, así que hoy **ningún gráfico llega al PDF**; y el planner determinista sólo emite 2 de las 7 familias de `ChartSpecV1`. La dedupe de `plan.limits` que esta task tenía pendiente **ya la entregó TASK-1846** (`render/plan-limits.ts`) y sale del alcance. Hace falta un sistema editorial y cuantitativo que no deforme datos ni copie slides a una hoja A4.

## Goal

- Entregar el alcance de esta unidad con evidencia funcional y aislamiento por cliente.
- Conservar fuentes canónicas y paridad UI/API/MCP donde hay capacidades.
- Cerrar con runtime/rollout honesto, sin confundir documento, código y disponibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§5–6, 10 (source of truth del contrato de esta unidad).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

Reglas: métricas en su dueño; un snapshot por edición; acceso por org; ninguna mutación de una edición emitida.
El ADR acepta planificación, no acredita implementación. Rutas/tablas nuevas son propuestas hasta materializarse.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`.

## Dependencies & Impact

### Depends on

- TASK-1845.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.
- TASK-1846 es dependencia de integración final PDF, no del diseño de catálogos/fixtures.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `src/lib/artifact-composer/catalogs/{insights-deck,insights-report}/** (nuevos propuestos)`
- `src/components/insights/charts/** (presentación pura browser-safe propuesta, sin queries)`
- `src/lib/copy/insights.ts (claves visuales; coordinar TASK-1849)`
- `docs/ui/wireframes/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md`

## Current Repo State

### Already exists

- `src/lib/artifact-composer/catalogs/deck-axis/chart-split.slots.json`.
- `src/lib/artifact-composer/brand-packs/axis`.
- ~~`src/components/growth/seo/report-artifact/print/SeoReportPrint.tsx`~~ — **verificado 2026-09-21: NO es precedente de A4 paginado.** Es un artículo web MUI cuyo print variant *trunca* contenido (8 cuadrantes), sin `@page`, sin índice, sin folio, sin cabecera repetida y sin pipeline PDF: su único consumidor es `window.print()`. El precedente real de documento vertical largo es el informe Berel Agosto 2026 (55 páginas), un script one-off fuera de `src/`.

### Gap

ChartSplit admite 2–4 barras porcentuales y el catálogo actual no resuelve un informe vertical multipágina. Hace falta un sistema editorial y cuantitativo que no deforme datos ni copie slides a una hoja A4. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/artifact-composer/catalogs/{insights-deck,insights-report}/** (nuevos propuestos)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Efeonce y lector cliente autorizado.
- Momento del flujo: lectura de documentos exportados.
- Resultado perceptible esperado: evidencia clara y consistente entre formatos, con marca premium y estado honesto.
- Friccion que debe reducir: reconstruir manualmente cifras, versiones y explicaciones.
- No-goals UX: editor libre, métricas inventadas ni pantallas de otros módulos.

### Surface & system decision

- Surface: catálogos deck/A4 y harness visual local.
- Nav placement: `none` — documentos, sin destino nuevo de navegación.
- Composition Shell: no aplica al canvas físico PDF; harness existente para inspección.
- Primitive decision: `extend` — catálogos/ChartSpec y primitives canónicas; lookup obligatorio antes de JSX.
- Adaptive density / The Seam: ancho disponible en web; paginación física explícita en PDF.
- Floating/Sidecar/Dialog decision: no aplica en documento estático.
- Copy source: `src/lib/copy/insights.ts` propuesto y nomenclatura canónica; números sólo del snapshot.
- Access impact: none; recibe proyección previamente autorizada.

### State inventory

- Default: edición identificada y contenido consistente.
- Loading: progreso real del reader, nunca cifras temporales inventadas.
- Empty: sin evidencia, indicar siguiente acción.
- Error: causa sanitizada y recuperación soportada.
- Degraded / partial: límites y outputs incompletos explícitos.
- Permission denied: sin datos del cliente.
- Long content: contenido continuado/paginado, nunca cortado.
- Mobile / compact: 390px sin scroll horizontal de página; gráfico con tabla equivalente.
- Keyboard / focus: orden semántico y controles accesibles; PDF conserva lectura lógica verificable.
- Reduced motion: información siempre visible; ninguna animación necesaria para comprender.

### Interaction contract

- Primary interaction: lectura y enlaces del documento.
- Hover / focus / active: estados canónicos, sin depender sólo del color.
- Pending / disabled: impedir doble acción durante request; idempotencia real vive en backend.
- Escape / click-away: no aplica al PDF.
- Focus restore: orden de lectura; sin overlays.
- Latency feedback: texto de estado, sin bloquear contenido ya disponible.
- Toast / alert behavior: alert persistente ante fallo material; éxito sólo con readback.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin animación; PDF y harness estáticos.
- Layout morph: no nuevo sistema; baseline del shell si aplica.
- Stagger: ninguno añadido.
- Timing / easing token: no aplica a render estático.
- Reduced-motion fallback: inmediato, contenido/foco conservados.
- Non-goal motion: contadores y gráficos animados, autoplay y parallax.

### Implementation mapping

- Route / surface: paths propuestos en Files owned, sujetos a reachability y lookup antes de implementación.
- Primitive / variant / kind: extend existentes; decisión concreta se sella en wireframe antes de UI ready yes.
- Component candidates: CompositionShell, GreenhouseBreadcrumbs y wrappers de inputs; catálogos Composer para PDF.
- Copy source: src/lib/copy/insights.ts.
- Data reader / command: contratos de TASK-1845/1846/1848; no escribir backend en esta task.
- API parity: consume lo ya expuesto por esas tasks; cualquier gap vuelve a su dueña.
- Access / capability: Insights reader y grants de target; token sólo para edición compartida.
- States to implement: todos los declarados arriba, con fixtures.

### GVC scenario plan

- Scenario file: **no aplica.** `scenario.route` de GVC exige una ruta del portal que empiece con `/`
  (`scripts/frontend/lib/scenario.ts:474`), y esta superficie es un documento exportado a PDF: no tiene ruta,
  ni viewport, ni interacción. Crear una ruta sólo para satisfacer el gate sería una pantalla que nadie usa.
  El harness de inspección canónico del Composer es su **gate visual**, que compone cada plantilla con payload
  sintético y captura su frame; TASK-1847 lo generalizó para fotografiar los tres catálogos.
- Route: harness o rutas propuestas del wireframe.
- Viewports: desktop 1440 y mobile 390px; PDF a tamaño físico.
- Quality profile: premium.
- Required steps: estados default/empty/partial/error/denied, contenido largo y navegación soportada.
- Required captures: cada composición y estado crítico; PDF todas las páginas.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Assertions: identidad, valores y estados correctos; sin datos internos.
- Scroll-width checks: scrollWidth === clientWidth en desktop y 390px.
- Reduced-motion / focus evidence: recorrido con teclado y prefers-reduced-motion.
- Review dossier: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/ propuesto, con capturas observadas.
- Baseline decision / surface ID: nueva baseline Insights sólo después de review, sin congelar WIP ajeno.

### Design decision log

- Decision: composición editorial analítica con tokens institucionales.
- Alternatives considered: dashboard de tarjetas; documento editorial; reutilización literal de deck comercial.
- Why this pattern: lectura autónoma y evidencia comparable requieren densidad y narrativa propias.
- Reuse / extend / new primitive: reuse/extend; una primitive nueva requiere prueba de brecha y contrato canónico.
- Open risks: PDF denso y legibilidad móvil; UI ready sigue no hasta primer fold y revisión.

### Visual verification

- GVC scenario: insights-catalogs, nuevo propuesto.
- Viewports: 1440, 390px y PDF tamaño físico.
- Required captures: first fold, gráfico, tabla densa, partial/denied y cierre.
- Required data-capture markers: insights-root, insights-evidence, insights-output-state.
- Scroll-width check: obligatorio en página web y harness.
- Accessibility/focus checks: teclado, contraste, tablas equivalentes y reduced motion.
- Before/after evidence: baseline nueva, comparada con fuentes institucionales reales.
- Known visual debt: sin implementación ni evidencia visual aún.
- Visual scorecard: docs/ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.scorecard.json (a producir durante ejecución).
- Quality threshold: average >= 4.2; floor >= 3; fidelity/template resistance >= 4, evaluado con evidencia.

## Hybrid Execution Justification

La task pasó a híbrida el 2026-09-21 al declarar honestamente su `Backend impact`: sin tocar
`render/contracts.ts`, `render/commands.ts` y el consumer del worker, `report_pdf` nunca se puede encargar
y el informe A4 no existe como salida. Ocultarlo bajo `Backend impact: none` habría dejado el Slice 3 sin
contrato declarado.

**Por qué no se parte en dos tasks.** El criterio de CLAUDE.md pide partir cuando el backend es una
fundación con riesgo propio. Acá es lo contrario: son tres puntos localizados —una constante, resolver el
catálogo por output en vez de por constante única, y registrar el catálogo en el consumer— **sin tabla,
sin migración, sin schema, sin capability nueva y sin cambio de contrato para `deck_pdf`**. Una task
backend-data para eso sería una task de tres líneas que no puede verificarse sola: su única evidencia
posible es exportar el A4, que es el entregable de esta unidad.

**Orden interno de ejecución, no negociable:** Slice 1 (dirección, contrato, ADR) → Slice 2 (motor,
reparto y catálogos, con su gate visual) → **Slice 3, y sólo entonces el backend**: admitir `report_pdf`
es el último paso, cuando ya existe un catálogo A4 que pasó su gate. Activar el consumer antes de su
contrato es precisamente lo que la regla de ordenamiento de slices prohíbe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `command`
- Source of truth afectado: `INSIGHT_RENDERABLE_OUTPUTS` (`src/lib/efeonce-insights/render/contracts.ts:29`) y el registro de catálogos del worker
- Consumidores afectados: `UI/API/MCP` (el encargo de salidas), `worker` (artifact-worker)
- Runtime target: `worker` + `production` (el gate por entorno es el enqueue en Vercel)

### Contract surface

- Contrato existente a respetar: `render/commands.ts`, `render/contracts.ts`, `services/artifact-worker/consumers/insights.ts`, ADR `GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md`
- Contrato nuevo o modificado: admitir `report_pdf` como salida renderizable y **resolver el catálogo por output** (hoy `INSIGHT_RENDER_CATALOG_NAME` es constante única para todas)
- Backward compatibility: `compatible` — `deck_pdf` conserva catálogo, manifest y hash; `web` sigue rechazándose (es de TASK-1848)
- Full API parity: no nace capability nueva. El encargo de salidas ya es command gobernado de TASK-1845/1846; esta task amplía el conjunto de valores que ese command acepta, y los consumers (UI, MCP, Nexa) lo heredan por construcción

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna** — sin tablas nuevas, sin migración
- Invariantes que no se pueden romper:
  - Un target no renderizable es `render_rejected` con causa, **nunca** «para más adelante»
  - El mapper no trunca una figura ni una afirmación para que entre en un slot
  - El manifest sella el catálogo y el plan de páginas; el worker detecta drift por hash
  - `deck_pdf` no cambia de manifest ni de hash por este trabajo
- Write-target allowlist: `N/A` — esta task no escribe tablas
- Tenant/space boundary: sin cambio; el render recibe una edición ya autorizada por org
- Idempotency/concurrency: sin cambio — claim atómico + fencing de TASK-1846
- Audit/outbox/history: sin cambio; los eventos de run ya existen

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `report_pdf` sólo se ofrece cuando el catálogo A4 pasa su gate visual; hasta entonces sigue rechazándose
- Backfill plan: `N/A`
- Rollback path: revertir el PR devuelve `report_pdf` a `render_rejected`; las ediciones ya emitidas conservan sus salidas
- External coordination: ninguna — sin secretos, sin env vars nuevas, sin redeploy fuera del release normal

### Security and access

- Auth/access gate: sin cambio (el del encargo de salidas)
- Sensitive data posture: el documento contiene datos de cliente; el catálogo no los consulta, los recibe proyectados
- Error contract: `render_rejected` canónico (HTTP 422) con causa; sin error crudo al cliente
- Abuse/rate-limit posture: sin cambio; el throughput lo gobierna el tick del dispatcher

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/artifact-composer src/lib/efeonce-insights`, `pnpm composer:visual-gate`, `pnpm composer:brand-pack --check`
- DB/runtime checks: `N/A` (sin schema)
- Integration checks: canary del render por el camino real (encargo → tick del dispatcher → Job), **nunca** ejecutando el Job a mano — lección de TASK-1846
- Reliability signals/logs: los existentes `insights.editions.failed_recent` / `insights.editions.stuck_generation`; los dos signals que esta task proponía (`insights_output_visual_rejected`, `insights_access_denied`) **no existen** y quedan como propuesta, no como hecho
- Production verification sequence: release autorizado → verificar `report_pdf` aceptado en el encargo → PDF real inspeccionado página por página

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con rutas reales.
- [ ] Invariantes, frontera de tenant y postura de idempotencia explícitas.
- [ ] `N/A` — esta task no crea tablas, no aplica allowlist de destinos de escritura.
- [ ] Postura de migración/rollback explícita y proporcional (no hay migración).
- [ ] Evidencia runtime listada para el cambio de contrato de salidas.
- [ ] Errores canónicos sin fuga de dato del cliente.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability nueva.` Esta task amplía el conjunto de valores aceptados por un command ya gobernado
(el encargo de salidas de TASK-1845/1846). Regla touch-it/fix-it: el punto que sí se corrige es que el
catálogo dejó de resolverse por constante única y pasa a resolverse **por output**, que era el acoplamiento
que impedía una segunda salida.

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

### Slice 1 — Dirección y contrato visual

- Comparar deck-axis extendido vs catálogo editorial analítico; fijar fuente durable, tokens, primitive lookup y ChartSpec de TASK-1845. Preparar portada, lámina analítica y página densa antes del resto; UI ready no hasta completar los gates.

### Slice 2 — Gráficos y catálogos

- Barras agrupadas/apiladas, líneas, circular/donut y dispersión con escala, fuente y tabla equivalente. Crear layouts deck y A4 con paginación por contenido, captions, índice, tablas repetidas y footer institucional; co-branding opcional sin VisualProfile paralelo.

### Slice 3 — Prueba de exportación

- Integrar con TASK-1846 para PDF final; fijar catálogo/brand/font. Pruebas cero/null/negativos/textos largos, tipografía, geometría, legibilidad e índice/enlaces; inspeccionar todas las páginas y publicar dossier visual con fixtures.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§5–6, 10. Esta task materializa sólo su ownership.
Sin tablas nuevas. Consume EvidenceSnapshot/EditorialPlan/ChartSpec y brand packs; no cambia business commands.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. No activar el consumer antes de su contrato y pruebas.
El render final integrado depende de TASK-1846; diseño y fixtures no requieren un worker activo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un gráfico correcto en pantalla pierde etiquetas o paginación al exportar | Insights | medium | Fixtures densos + PDF real + revisión de todas las páginas | insights_output_visual_rejected (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

Catálogos versionados consumidos sólo por el gate Insights; promoción de versión tras QA visual, sin cambiar Proposal. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 2 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 3 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |

### Production verification sequence

1. Local: contratos, fixtures y gates focales antes de gastar CI/cloud.
2. Staging: schema/flags/worker readback cuando aplica; canary sintético dos orgs y fallo parcial.
3. Verificar recovery y rollback; documentar evidencia y activar sólo por release autorizado.
4. Producción: comprobar SHA/config/commands/readers/outputs del lane; no inferir desde documentos.
5. Cohorte cliente consentida sólo después de certificación técnica; actualizar acceptance/status con evidencia real.

### Out-of-band coordination required

Release, activación externa y correo real tienen autorización propia; esta creación documental no los ejecuta.
No solicitar otra cuenta, secreto ni acción del cliente para pruebas técnicas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Barras, líneas, circular/donut y dispersión se renderizan desde el mismo ChartSpec validado en HTML/SVG/PDF; valores y geometría coinciden con evidencia.
- [x] Pie/donut rechaza totales incompatibles; dispersión rechaza pares ausentes; nulos y negativos no se ocultan ni deforman. — `chart-geometry.ts` + 46 tests (`chart-geometry.test.ts`, `chart-geometry-extended.test.ts`): techo de 3 porciones, rechazo de porción negativa, pares incompletos, negativo bajo base cero y hueco que corta el trazo.
- [x] Deck 16:9 e informe A4 vertical tienen composiciones propias, brand pack real e ID/versión/período visibles. — catálogos `insights-deck` (4) e `insights-report` (5), ambos renderizando; evidencia en `docs/ui/reviews/TASK-1847-…/`. El logo de cliente queda como slot opcional deliberado: la edición no trae el dato y no se inventa un nombre.
- [ ] A4 soporta 30 páginas, índice real, cabeceras repetidas y cortes legibles; deck soporta 25 slides sin truncado silencioso ni minificar cuerpo para encajar. — Avance 2026-09-22: el deck ya no trunca (cutover a `insights-deck`, rechazo con causa) y el A4 pagina figuras y resumen en vez de recortarlos; cabeceras repetidas y folios verificados. Sin marcar: el índice paginado no se construyó y no se probó una edición de 30 páginas.
- [x] Fuentes incrustadas (font pack local, render hermético sin red), folios y pie institucional en cada página del A4; se inspeccionaron todas las páginas exportadas, a tamaño físico y en escala de grises. — Falta verificar enlaces clicables e índice paginado: la plantilla de índice no se construyó en este tramo.
- [x] No se crea registry VisualProfile paralelo a TASK-1644 ni se altera el catálogo Proposal. — `deck-axis` recompila byte-idéntico (sha256 sin mover, `brand-pack-sync` verde); las primitives genéricas (`measureSlideFit`, `paginateFlow`, `chart-geometry`, `compile-catalog-tokens`) viven en el motor, no en el catálogo.
- [x] UI ready permanece `no`; wireframe existe con dirección sellada, inventario de 15 composiciones y decision log. `pnpm task:lint --task TASK-1847` sin findings. — Falta GVC/scorecard, por eso sigue en `no`.
- [ ] Reuso/extend documentado, copy reusable canónico, estados partial/empty/error y reduced motion sin pérdida de información; no se introducen animaciones. — Avance 2026-09-22: copy canónico en `GH_INSIGHTS` (métricas, fuentes, unidades, documento); capítulo sin datos narrado, métrica ausente como límite, texto excedido rechaza con causa; sin animaciones. Sin marcar hasta cerrar la documentación de reuso en arquitectura.
- [x] Páginas PDF validadas a tamaño físico y en escala de grises (evidencia `*-gris.png` en el dossier). — GVC desktop/390px **no aplica**: `scenario.route` exige ruta del portal y la superficie es un documento. El harness es el gate visual del Composer, generalizado a los 3 catálogos. Hallazgo del gris registrado como deuda: el acento teal pierde contraste.
- [ ] Regresión visual del Composer y test cuantitativo funcional pasan; rollout de catálogo versionado con worker se verifica antes de declarar formatos disponibles. — Avance 2026-09-22: tests cuantitativos verdes (465 de Insights, composer y worker); los catálogos viajan con el worker (despliegue verde). El re-render en staging se verificó (Berel v2 y Sky v2, las cuatro salidas al primer intento). Sin marcar: la regresión visual sigue bloqueada por ISSUE-122 (frames nuevos declarados, sin promover).

## Verification

- `pnpm composer:visual-gate`; antes de baseline/freeze leer `docs/operations/runbooks/composer-visual-gate.md`.
- `pnpm composer:brand-pack --check` y tests de Composer; baseline sólo serializado y con ownership claro.

- `pnpm task:lint --task TASK-1847`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm ui:wireframe-check --task TASK-1847`; GVC observado y export real según contrato.
- Verificar runtime por capa; no usar guardas textuales para certificar comportamiento.
- `pnpm docs:closure-check` y, después de toda edición de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia; sin rollout no se declara complete.
- [ ] TASK_ID_REGISTRY, README y EPIC-045 sincronizados; remover blockers obsoletos en dependientes.
- [ ] Arquitectura técnica, documentación funcional y manual/runbook actualizados proporcionalmente.
- [ ] Handoff/changelog y contratos UI/API/MCP reflejan disponibilidad real.
- [ ] Regresiones, señales, rollback y gates documentales pasan; no commit/push/deploy automático.
- [ ] Actualizar la skill viva `efeonce-insights` (`references/program-ledger.md`, `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md`) y espejar a `.codex/` con `pnpm skills:mirrors` verde — contrato de EPIC-045; sin esto la task no pasa a complete.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
