# TASK-1847 — Efeonce Insights: gráficos y catálogos premium para deck e informe vertical

## Delta 2026-09-25 — canary de render productivo y gate de cierre

- **deck_pdf en producción:** edición interna sandbox `insed-afdbff0a…` → run `irun-cc329478-d7c7-4a1d-be8b-eb7b359e2851`
  encolado por el lane ecosystem de producción con catálogo `insights-deck`; el dispatcher lo tomó a los ~2,6 min y
  compuso en 3,9 s al primer intento (3 láminas, 42 760 bytes, Geist/Poppins embebidas). El contenido dice «sin datos»:
  correcto para esa org.
- **report_pdf en producción: pendiente.** Los espacios de la org sandbox (`Greenhouse Demo`, `Agent Client Sandbox`)
  no tienen ninguna fila en `ico_engine.metric_snapshots_monthly`; una edición nueva falla en `validating` con
  `evidence_rejected` (edición `insed-4873a166…`, comportamiento correcto) y la única edición sandbox con A4 ya tiene
  su salida viva desde el 2026-09-22 (el render es idempotente por salida). Cerrar esto exige una edición interna de un
  cliente real con datos (Sky tiene 11 meses de ICO); espera autorización del operador.
- **Gate de cierre:** `pnpm test` completo verde (1821 archivos, 15 303 tests, 0 fallas) y `pnpm build` verde
  (compilado en 70 s, 23/23 páginas estáticas, exit real 0) sobre `35f208553`.

## Delta 2026-09-25 — rediseño premium traspasado a TASK-1888 y TASK-1889

- El operador aprobó un rediseño completo de los informes en el canvas «Gráficos de Efeonce Insights»
  (dirección durable en `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`).
- Esta task **cierra con su alcance v1** (catálogos en producción desde el 2026-09-24): le falta sólo el render real
  en el Job productivo y el gate de cierre. No absorbe el rediseño.
- El límite «13 de 15 familias sin productor» pasa a `TASK-1888` (contrato y productores); el rediseño de plantillas,
  portadas por módulo, contraportada, capítulos y prosa pasa a `TASK-1889`, que espera este cierre antes de tocar
  los archivos de esta task.

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

## Delta 2026-09-24 — en producción (release `ebb9212a32ce`)

El release salió acotado a esta task: la rama `release/task-1847-insights-catalogs` se armó sobre `main` con
`051ecada2` + `2c7c24b50` (entrada `@/lib/artifact-composer/pure`) + `146ed8197` (copy del índice), PR #239 →
`main` `ebb9212a3`. Orquestador `36071525772` success; manifest
`ebb9212a32ce-388b8af7-e133-4ea3-9441-2bbf00a157b7` en `released` a las 23:28:44Z. Codex lo preparó y lo despachó;
Claude tomó la coordinación a pedido del operador y sólo verificó y cerró, sin dispatch, cancelación ni aprobación de
gates.

Verificado en producción: los 6 runtimes Cloud Run en el SHA con `Ready=True` (`pnpm release:workers`), Vercel
`READY`, `/api/auth/health` 200 y watchdog `ok` (exit 0). **Canary de contrato** por el lane ecosystem de
producción: el catálogo de Insights respondió 200 con `renderableOutputs` = `["deck_pdf","report_pdf"]`, algo que el
contrato anterior no podía devolver. No hubo flags que prender: `INSIGHTS_RENDER_ENABLED` ya estaba ON en los 3
runtimes desde TASK-1846.

**Sin verificar en producción:** un render real de `report_pdf` (`insights-report`) o de `deck_pdf` (`insights-deck`)
en el Job productivo. La evidencia de render es la de staging (Berel/Sky v2) y la local. Cerrarlo exige un canary de
render en la org sandbox (escritura en producción; necesita autorización del operador).

El código del release estaba en el árbol de `develop` sin commitear; `e15d71648` lo trae, blob por blob igual a
`146ed8197` (typecheck, 470 tests de composer+insights y `composer:visual-gate --catalog=insights` 10/10 a 0 px).

## Delta 2026-09-24 — render extendido local

`report-mapper.test.ts` compone y carga un PDF real de 30 páginas con índice de 28 secciones, folios
convergentes y cabecera de capítulo/período en cada página posterior a la portada. `insights-deck-mapper.test.ts`
compone y carga un PDF real de 25 láminas, conservando los 23 hallazgos del cuerpo. Ambos tests usan los
catálogos productivos y eliminan sus directorios temporales; esto verifica el motor local, no el runtime desplegado.
Ese recorrido local ahora compone line, pie, donut y scatter desde `ChartSpec` en los catálogos A4 y deck;
los tests cargan los PDFs y verifican las cuatro familias. La inspección del PDF encontró que los campos de geometría
vacíos de scatter borraban el SVG; el resolver ahora los ignora. El scatter quedó visible y se agregó una regresión
para el resolver vacío. Verificación local actual: typecheck, 349 tests dirigidos y `composer:brand-pack --check`
verdes. La regresión visual global aún no está promovida y esto no acredita deploy ni release.
El CI del SHA remoto `d8afbf50` falló sólo en `Test`: 12 casos de referencias de vestuario en
`scripts/foto/build-prompt.test.ts`; la suite pasa en el checkout actual (510/510), pero el SHA local es distinto.
El preflight se repitió con los identificadores de workflow: migraciones 656/656, GCP WIF activo y cero
incidentes críticos de Sentry pasan; `postgres_health` falla con autenticación para `greenhouse_ops` usando la
referencia de secreto declarada por el workflow. Siguen faltando runs de Playwright smoke para el SHA remoto y
la política detecta `split_batch` (3.279 archivos). El `develop` local está 60 commits y 1.063 archivos por delante
de `origin/develop`, así que ese SHA no es un candidato acotado a TASK-1847. No se publicó ni despachó.
El gate visual normal identifica los diez frames Insights nuevos. El selftest de 71 frames dio cero píxeles de
diferencia en dos corridas. `--freeze` no escribió el baseline: rechazó otros veinte frames `deck-axis` no declarados;
el directorio de esas plantillas está limpio en Git y esos cambios no pertenecen a TASK-1847, por lo que no se
rebaselinaron. El informe usa ahora el token oscuro AXIS en sus acentos principales para mejorar la lectura en grises;
falta promover el baseline y validar el PDF multipágina completo.

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
2. **Promoción del baseline visual.** El 2026-09-24 se declaró `ReportIndexPage` (10 frames Insights en total);
   seis renders frescos mantuvieron estables los frames conocidos. Los diez siguen sin promover: `--freeze` exige
   incluir baseline y catálogo en el mismo commit. Los frames ajenos se conservan. ISSUE-122 mantiene el contexto
   histórico de drift de `deck-axis`.
3. ~~**`UI ready: yes`**~~ — resuelto como **`n/a`** el 2026-09-22: el contrato de `UI ready` mide una pantalla
   del portal y esta superficie es un documento exportado a PDF. Los gates que aplican están verdes
   (`design-contract:lint`, `ui:code-lint`, `ui:quality` 4,50/piso 4,0) con dossier y scorecard sobre el render
   real; `ui:visual-gate` no aplica por construcción.
4. ~~**Triple documentación**~~ — hecha: arquitectura §14.7, funcional v1.7, manual y skill viva.
5. **Runtime**: nada desplegado, sin canary, sin push. `report_pdf` es `code complete`, no operativo.
6. **13 de 15 familias sin productor**: el planner emite `bar` y `bar_grouped`. Ampliarlo es trabajo
   nuevo del dominio y los Follow-ups de esta task prohíben abrir tasks preventivas.

## Delta 2026-09-24 — QA visual scoped de Insights

El baseline congelado a cero píxeles es de agosto y el renderer local vuelve a producir diferencias en
plantillas comerciales y láminas SKY, aunque sus fuentes estén limpias. `ISSUE-122` ya documenta que
ese drift existía antes de tocar 1847 y que esta task debe exigir cero píxeles en sus propios frames.
Se añadió `--catalog=insights` al gate: el freeze agrega al manifest sólo los 10 frames de Insights,
preserva los otros PNG/hash y vuelve a sellar el digest. La verificación en snapshot del candidato
`ef1a5c8` pasó `--selftest` (10 frames, 0 px), freeze (10 frames declarados) y gate scoped (10/10, 0 px).
El gate global sigue fallando por diferencias previas de `deck-axis`/SKY; no se rebaselinaron.

Las diez capturas sintéticas se inspeccionaron. También se revisaron deck de evidencia, portada y
página analítica/tabular A4, y la exportación sintética de 30 páginas en gris. El párrafo de análisis
ocupa el ancho de página debajo de la figura y de la marginalia; no invade esa columna. La hoja de 30
páginas acredita paginación, cabeceras, pies y folios, no contenido de cliente.

Este baseline aún no está en `origin/develop`: el SHA remoto sigue en `ebee018`, el candidato
`ef1a5c8` aún no se publicó, `main` sigue en `bda1cf2` y no hay PR de release. La promoción y el
readback productivo permanecen pendientes.

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
- Status real: `En producción desde 2026-09-24 (release ebb9212a32ce, run 36071525772, PR #239, main ebb9212a3): report_pdf en insights-report y deck_pdf en insights-deck. Verificado: 6 runtimes en el SHA, Vercel READY, watchdog ok y canary de contrato productivo (renderableOutputs deck_pdf+report_pdf). Verificado 2026-09-25: render real de deck_pdf en producción (run irun-cc329478-d7c7-4a1d-be8b-eb7b359e2851, catálogo insights-deck, primer intento, 3 láminas, fuentes embebidas, org sandbox), pnpm test completo verde (1821 archivos, 15303 tests) y pnpm build verde (HEAD 35f208553). Sin verificar: render real de report_pdf en producción; la org sandbox no tiene snapshots ICO y requiere una edición interna de un cliente real (decisión del operador). Staging: Berel v2 deck 13 + A4 15; Sky v2 deck 5 + A4 7. QA local de 30 páginas A4 y 10 frames Insights a 0 px (el gate global conserva el drift de ISSUE-122). develop recibe el código del release en e15d71648.`
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
- Open risks: densidad de tablas largas y contraste en escala de grises; `UI ready: n/a` porque no hay pantalla ni viewport web que certificar.

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

- [x] Source of truth, contract surface y consumidores nombrados con rutas reales. — `ChartSpecV1`/`EditorialPlanV1` en `src/lib/efeonce-insights/contracts/`; readers, command, mappers, catálogos y worker documentados en arquitectura §14.7.
- [x] Invariantes, frontera de tenant y postura de idempotencia explícitas. — Arquitectura §14.7; readers/store de render consultan por `organizationId` y el encargo preserva idempotencia por organización.
- [x] `N/A` — esta task no crea tablas, no aplica allowlist de destinos de escritura. — No agrega migraciones ni writes externos; amplía el catálogo de outputs del command existente.
- [x] Postura de migración/rollback explícita y proporcional (no hay migración). — Sin migración/backfill; rollback revierte el PR y vuelve a rechazar `report_pdf`, conservando outputs emitidos.
- [x] Evidencia runtime listada para el cambio de contrato de salidas. — Canaries staging Berel/Sky, outputs y versiones quedan registrados en esta task y arquitectura §14.7.
- [x] Errores canónicos sin fuga de dato del cliente. — `insights-errors.ts` mapea `render_rejected` a error sanitizado y los errores desconocidos a mensaje genérico; `insights-lanes.test.ts`, `insights-read-boundary.test.ts`, `commands.test.ts`, `render/commands.test.ts`: 31/31 pasan.

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

- [x] Barras, líneas, circular/donut y dispersión se renderizan desde el mismo ChartSpec validado en HTML/SVG/PDF; valores y geometría coinciden con evidencia. — `report-mapper.test.ts` e `insights-deck-mapper.test.ts` construyen las cuatro familias desde ChartSpec y componen ambos PDFs; `chart-geometry*.test.ts` verifica escala/valores y `chart-figure.test.ts` protege paths SVG. Verificación local 2026-09-24: 83/83 pruebas dirigidas pasan. La regresión visual del Composer queda como gate separado abajo.
- [x] Pie/donut rechaza totales incompatibles; dispersión rechaza pares ausentes; nulos y negativos no se ocultan ni deforman. — `chart-geometry.ts` + 46 tests (`chart-geometry.test.ts`, `chart-geometry-extended.test.ts`): techo de 3 porciones, rechazo de porción negativa, pares incompletos, negativo bajo base cero y hueco que corta el trazo.
- [x] Deck 16:9 e informe A4 vertical tienen composiciones propias, brand pack real e ID/versión/período visibles. — catálogos `insights-deck` (4) e `insights-report` (5), ambos renderizando; evidencia en `docs/ui/reviews/TASK-1847-…/`. El logo de cliente queda como slot opcional deliberado: la edición no trae el dato y no se inventa un nombre.
- [x] A4 soporta 30 páginas, índice real, cabeceras repetidas y cortes legibles; deck soporta 25 slides sin truncado silencioso ni minificar cuerpo para encajar. — Los tests `report-mapper.test.ts` e `insights-deck-mapper.test.ts` componen y cargan PDFs reales con los catálogos: 30 páginas/índice/folios/cabeceras y 25 láminas con 23 afirmaciones íntegras. `composeArtifact` valida cada lámina contra el canvas y rechaza overflow; el mapper rechaza copy que excede el molde. Evidencia local; no sustituye el rollout.
- [x] Fuentes incrustadas (font pack local, render hermético sin red), folios y pie institucional en cada página del A4; se inspeccionaron todas las páginas exportadas, a tamaño físico y en escala de grises. — Exportación sintética local: [PDF A4 de 30 páginas](../../ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/informe-a4-30-paginas-sintetico-qa.pdf) (`pdfinfo`: A4, 30 páginas; `pdffonts`: 120/120 recursos embebidos; `pdftotext`: pie y folio 30/30). [Hoja de contacto en gris](../../ui/reviews/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs/informe-a4-30-paginas-gris.png) inspeccionada completa. El renderer carga el font pack local y aborta solicitudes HTTP(S) (`src/lib/artifact-composer/render.ts:769`). QA local sintético; el rollout sigue separado.
- [x] No se crea registry VisualProfile paralelo a TASK-1644 ni se altera el catálogo Proposal. — `deck-axis` recompila byte-idéntico (sha256 sin mover, `brand-pack-sync` verde); las primitives genéricas (`measureSlideFit`, `paginateFlow`, `chart-geometry`, `compile-catalog-tokens`) viven en el motor, no en el catálogo.
- [x] `UI ready: n/a`: la entrega es PDF sin ruta/viewport web. Wireframe y decision log describen esa frontera; `pnpm task:lint --task TASK-1847`, `pnpm design-contract:lint --task TASK-1847` y `pnpm ui:quality --task TASK-1847` pasan (scorecard 4,50/piso 4,0). La regresión visual se verifica con `pnpm composer:visual-gate --catalog=insights`; `ISSUE-122` conserva la deriva histórica del scope global.
- [x] Reuso/extend documentado, copy reusable canónico, estados partial/empty/error y reduced motion sin pérdida de información; no se introducen animaciones. — Arquitectura §2 documenta piezas reutilizadas y brechas; el mapper reutiliza `paginateFlow`, `ChartSpecV1`, `formatFactValue` y `GH_INSIGHTS`. Los tests cubren capítulo sin afirmaciones, ausencia narrada, texto excedido rechazado y salida de límites. El PDF es estático; no introduce animaciones.
- [x] Páginas PDF de dossier validadas a tamaño físico y en escala de grises (evidencia `*-gris.png`). — GVC desktop/390px **no aplica**: `scenario.route` exige ruta del portal y la superficie es un documento. El acento principal del A4 ahora usa el token oscuro AXIS; la captura del probe A4 y la exportación sintética de 30 páginas se revisaron en gris a escala A4. Ver artefactos del criterio anterior.
- [x] Regresión visual de los catálogos Insights y test cuantitativo funcional pasan; rollout de catálogo versionado con worker verificado en staging antes de declarar formatos disponibles. — `pnpm composer:visual-gate --catalog=insights --selftest` determinista en 10 frames; `--freeze` promovió los diez frames declarados y `pnpm composer:visual-gate --catalog=insights` pasó a 0 píxeles. El freeze scoped conserva intactos los otros frames del manifest. El gate global continúa rojo por deriva previa de `deck-axis`/SKY documentada en ISSUE-122; no se atribuye a 1847 ni se rebaselina aquí.

## Verification

- `pnpm composer:visual-gate`; antes de baseline/freeze leer `docs/operations/runbooks/composer-visual-gate.md`.
- `pnpm composer:brand-pack --check` y tests de Composer; baseline sólo serializado y con ownership claro.

- `pnpm task:lint --task TASK-1847`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm ui:wireframe-check --task TASK-1847`; GVC observado y export real según contrato.
- Verificar runtime por capa; no usar guardas textuales para certificar comportamiento.
- `pnpm docs:closure-check` y, después de toda edición de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [x] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia; se conserva `in-progress` hasta promover y verificar el release productivo.
- [x] TASK_ID_REGISTRY, README y EPIC-045 sincronizados; sin blockers obsoletos pendientes en dependientes — `task:lint` y `epic:lint` pasan (cero errores/avisos).
- [x] Arquitectura técnica, documentación funcional y manual/runbook actualizados proporcionalmente — arquitectura §14.7 y manual de operación 1.7 registran canary staging, QA local y disponibilidad productiva actual.
- [x] Handoff/changelog y contratos UI/API/MCP reflejan disponibilidad real — deck/A4 en staging y en producción desde el release `ebb9212a32ce` (2026-09-24), sin activar emisión.
- [ ] Regresiones, señales, rollback y gates documentales pasan; no commit/push/deploy automático.
- [x] Actualizar la skill viva `efeonce-insights` (`references/program-ledger.md`, `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md`) y espejar a `.codex/` con `pnpm skills:mirrors` verde — validado 2026-09-24.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
