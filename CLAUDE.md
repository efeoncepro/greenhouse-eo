# CLAUDE.md

## Project Overview

Greenhouse — plataforma operativa/subproducto de Efeonce Group dentro del modelo ASaaS. Next.js 16 App Router + MUI 7.x + Vuexy starter-kit + TypeScript 5.9. Deploy en Vercel. "EO" es solo abreviatura del repo, no nombre de producto ni copy visible.

### Business Context Pack

- `docs/context/` es el context pack de negocio, marca, GTM, producto y experiencia cliente de Efeonce/Greenhouse. Empezar por `docs/context/00_INDEX.md`.
- Usarlo antes de proponer o construir features que toquen producto, UX/copy, naming, metricas, HubSpot/Account 360, onboarding/cliente, GTM, marca o estrategia comercial.
- Carga selectiva: `05_voz-tono-estilo.md` para copy visible, `06_glosario-metricas.md` para metricas/naming, `07_ico.md` para ICO, `08_estrategia-comercial.md` para prioridad comercial, `09_marca-agencia.md` para marca Efeonce, `10_experiencia-cliente.md` para journey/onboarding y `11_hubspot-bowtie.md` para sync/lifecycle HubSpot.
- El context pack alinea el negocio; no reemplaza arquitectura vigente, runtime real, `DESIGN.md`, specs tecnicas ni contratos de datos. Si hay drift, prevalece el contrato tecnico verificado y se documenta.

### Operator Communication Style

- Hablarle al operador en español neutro latinoamericano, natural para una persona venezolana viviendo en Chile.
- Evitar modismos argentinos y voseo rioplatense (`che`, `boludo`, `vos`, `tenés`, `querés`, `laburo`, etc.).
- Mantener un tono claro, cercano y profesional; se permite chilenismo operativo solo cuando sea contexto del producto/país, no como muletilla.

### Data Architecture

- **PostgreSQL** (Cloud SQL `greenhouse-pg-dev`, Postgres 16, `us-east4`) — OLTP, workflows mutables, runtime-first
- **BigQuery** (`efeonce-group`) — raw snapshots, conformed analytics, marts, histórico
- Patrón de lectura: **Postgres first, BigQuery fallback**
- Schemas PostgreSQL activos: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_hr`, `greenhouse_crm`, `greenhouse_delivery`, `greenhouse_ai`

### BigQuery DML Struct Timestamp Hard Rules (ISSUE-082 / TASK-941)

- Nunca declarar un campo temporal como `TIMESTAMP`/`DATETIME`/`DATE` dentro de `types: { rows: [STRUCT] }` si el valor JS viene como ISO string. El cliente Node de BigQuery puede escribir NULL silenciosamente dentro de `ARRAY<STRUCT>`.
- Patrón canónico: serializar con `toBigQueryStructTimestamp()` y declarar el campo como `STRING`; convertir en SQL con `TIMESTAMP(s.<col>)` en el `SELECT FROM UNNEST(@rows)`.
- El lint rule `greenhouse/no-bq-struct-string-timestamp` queda en modo error. Si un writer necesita otro patrón, debe documentar el motivo y probar round-trip real.
- Un run que ve data cruda elegible pero materializa 0 records nunca es `succeeded`: debe degradar/fallar con evidencia observable.
- No ejecutar un DELETE destructivo de período antes de validar el payload reemplazo. Si no se puede validar, skip/degrade y preservar el último estado bueno.

### Payroll Operational Calendar

- Calendario operativo canónico: `src/lib/calendar/operational-calendar.ts`
- Hidratación pública de feriados: `src/lib/calendar/nager-date-holidays.ts`
- Timezone canónica de base: `America/Santiago` vía IANA del runtime
- Feriados nacionales: `Nager.Date` + overrides persistidos en Greenhouse
- No usar helpers locales de vista para decidir ventana de cierre o mes operativo vigente

### International Internal Contract Type Invariants (TASK-894)

- `international_internal` es un `ContractType` canónico: `payRegime='international'` + `payrollVia='internal'`. No es Deel, no es EOR y no se degrada automáticamente a `contractor`.
- Efeonce SpA actúa como operational payer, no como employer of record/local-country legal employer en V1. No aplicar AFP, salud, cesantía, SIS, mutual, APV, IUSC ni retención SII a este perfil.
- Writes reales requieren capability `payroll.contract.use_international_internal` y `legalReviewReference` >= 10 caracteres. No loggear ni publicar el valor crudo en outbox/Sentry; el evento usa solo `hasLegalReviewReference`.
- Toda mutación de `contract_type`/`pay_regime`/`payroll_via` debe pasar por los helpers canónicos y emitir `member.contract_type.changed v1` + audit row append-only en la misma transacción.
- La DB protege la matriz contractual: miembros validan la tupla completa `(contract_type, pay_regime, payroll_via)` y `compensation_versions` valida `(contract_type, pay_regime)` para nuevas/actualizadas rows. No bypass por SQL directo.
- Los consumers downstream deben detectar `international_internal` por `contractType`, no por heurísticas compuestas de régimen/vía.

### Canonical 360 Object Model

- `Cliente` → `greenhouse.clients.client_id`
- `Colaborador` → `greenhouse.team_members.member_id`
- `Persona` → `greenhouse_core.identity_profiles.identity_profile_id`
- `Proveedor` → `greenhouse_core.providers.provider_id`
- `Space` → `greenhouse_core.spaces.space_id`
- `Servicio` → `greenhouse.service_modules.module_id`

Regla: módulos de dominio extienden estos objetos, no crean identidades paralelas.

### Deploy Environments

- **Production** → `main` → `greenhouse.efeoncepro.com`
- **Staging** → `develop` (Custom Environment) → `dev-greenhouse.efeoncepro.com`
- **Preview** → ramas `feature/*`, `fix/*`, `hotfix/*`

### Local-First Development Workflow

**Spec canonica:** `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`.

Regla base: `local = taller`, `branch/PR = validacion remota acotada`, `develop = integracion compartida`, `main = produccion via release control plane`.

Para reducir costo GitHub Actions/Vercel/GCP sin perder calidad, Claude/agents deben iterar y validar en local por defecto. No hacer push remoto como cierre automatico de cada flujo salvo instruccion explicita del operador, hotfix documentado o release controlado.

Comandos canonicos:

```bash
pnpm local:check       # lint + tsc
pnpm local:check:ui    # local:check + design:lint + build
pnpm local:check:full  # local:check + test + build
```

Antes de reducir o redisenar GitHub Actions por costo:

```bash
pnpm actions:cost:audit --from YYYY-MM-DD --to YYYY-MM-DD
```

Ese reporte local usa GitHub Actions Runs/Jobs API via `gh` para estimar hotspots por workflow/job. La factura oficial sigue siendo `cloud.billing.github`; no mezclar `estimatedGrossUsd` con billing neto.

Si el cambio toca UI visible, levantar `pnpm dev` y entregar la URL `localhost` exacta antes de pedir push. No usar Vercel Preview como loop de exploracion si localhost puede validar el cambio.

### Greenhouse Operating Loop

**Spec canonica:** `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`.

Todo trabajo formal debe respetar el ciclo `intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff`.

Comandos canonicos:

```bash
pnpm task:lint          # TASK-###
pnpm epic:lint          # EPIC-###
pnpm mini:lint          # MINI-###
pnpm ops:lint --changed # agregador para cambios en tasks/epics/mini-tasks
pnpm docs:closure-check # cierre documental advisory
```

V1 valida estructura, lifecycle/carpeta, registry, next ID y checkboxes. No reemplaza verification real, GVC, flags/env vars, rollout, migraciones ni juicio humano de checkpoint.

### Task Authoring Contract (Claude)

Cuando Claude crea o edita una task formal `TASK-###`, debe recargar la skill vigente
`.claude/skills/greenhouse-task-planner/skill.md` completa y no usar memoria previa del
formato. La task solo se puede entregar como lista si `pnpm task:lint --task TASK-###`
reporta `template=1`, `errors=0`, `warnings=0`.

Reglas duras:

- Incluir todos los markers `ZONE 0` a `ZONE 4`; Zone 2 queda como marker/comentario, no se llena al crear la task.
- Usar solo enums vigentes: `Execution profile: standard|ui-ux|backend-data`, `UI impact: none|copy|layout|interaction|motion|primitive|flow`, `Backend impact: none|api|db|migration|command|reader|sync|cron|webhook|integration`.
- Si `UI impact != none`, agregar `## UI/UX Contract` desde `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- Si `Backend impact != none`, agregar `## Backend/Data Contract` desde `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- Si una capacidad combina backend/data y UI visible, preferir dos tasks secuenciadas por `Execution profile`: primero `backend-data` para schema/API/reader/command/migration/sync/contrato de datos, despues `ui-ux` para ruta visible, layout, interaccion, copy y GVC. Excepcion valida: `ui-ux` discovery/mockup/prototipo primero cuando el contrato de producto todavia esta borroso, por ejemplo si no sabemos que layout humano funciona mejor, hay que validar board/list/inspector, el problema es mas de flujo que de data, o conviene que el backend se disene alrededor de una experiencia aprobada; en ese caso usar datos mockeados y declarar la task `backend-data` que cableara el contrato real. Mantener una task vertical hibrida solo si es pequena, reversible, sin migracion/schema riesgoso y declara justificacion + orden interno de ejecucion. Fuente canonica: `docs/tasks/TASK_PROCESS.md`; formalizacion pendiente: `TASK-1154`.
- Sincronizar `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` al registrar o cambiar lifecycle.
- Correr `pnpm task:lint --task TASK-###` y `pnpm ops:lint --changed`; si la task sale como `legacy=1`, corregir el markdown antes de responder.

Prompt operativo recomendado:

```text
Implementa esto local-first. No hagas push.
Trabaja slice por slice, valida con pnpm local:check y tests focales.
Si toca UI, levanta pnpm dev y dame la URL localhost exacta.
Espera mi confirmacion antes de empujar a develop o crear preview remoto.
```

### Vercel Deployment Protection

- **SSO habilitada** (`deploymentType: "all_except_custom_domains"`) — protege TODO salvo custom domains de Production.
- El custom domain de staging (`dev-greenhouse.efeoncepro.com`) **SÍ tiene SSO** — no es excepción.
- Para acceso programático (agentes, Playwright, curl): usar la URL `.vercel.app` + header `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`.
- Hook operativo browser diagnostics: si el usuario pide abrir, revisar, diagnosticar, capturar o testear una ruta/URL del portal, usar automáticamente usuario agente dedicado + Playwright/Chromium. No pedir login ni navegar anónimo como primer intento. Enviar `x-vercel-protection-bypass` solo a origins Greenhouse/Vercel, no a terceros como Sentry.
- Diagnóstico local `Compiling...` / Turbopack: si `localhost` queda compilando o `next-server` sostiene CPU alto, no empezar por `pnpm clean`. Secuencia canónica: `ps`/CPU → `curl -I` vs browser real → Playwright console/network filtrando `_next/static/chunks`, HMR y 404 → comparar `.next/dev/**/react-loadable-manifest.json` con `.next/dev/static/chunks`. Si hay chunk huérfano, revisar fronteras `dynamic()`/imports nested en wrappers compartidos y corregir el owner canónico + guardrail. Caso fuente: `ISSUE-085`.
- **Hook obligatorio de diseño UI (skills + GVC en loop) — ANY UI work**: para CUALQUIER trabajo de UI (componente nuevo, cambio visual, layout, estados, microinteracciones, mockup, copy visible), ANTES de escribir JSX nuevo **invocar las skills de product design** que apliquen — `greenhouse-ux` (layout + componente Vuexy/MUI + tokens), `modern-ui` (jerarquía/tipografía/spacing/balance), `state-design` (loading/empty/error/degraded honestos), `forms-ux` (inputs/validación/combobox), `greenhouse-ux-writing` (microcopy es-CL → `src/lib/copy/*`) — y DESPUÉS **verificar con GVC en loop**: `pnpm fe:capture`, leer el frame PNG, ajustar, re-capturar hasta que se vea enterprise. NUNCA pintar UI freehand ni declarar "listo" en UI sin una captura GVC mirada. Para mockup↔runtime, paridad por copy-and-patch + `fe:capture:diff`. Enforcement humano de Julio (sesión TASK-997): el loop atrapó pills→filas enterprise, `Autocomplete` crudo→`CustomAutocomplete`, prefill verificado, copy "workspace"→"Teamspace".
- **Metodologia UI canonica — Primitive + Variants + Kinds:** cuando una UI reusable empiece a repetirse o sea platform-level, no crear componentes paralelos por surface. Diseñar primero una **primitive** estable (layout/a11y/responsive/motion/shell/state/GVC), luego sus **variants** funcionales oficiales (comportamiento, densidad, estados, footer/actions; no skins) y finalmente mapear **kinds** semanticos de dominio/workflow hacia esas variants. Shape canonico: `<Primitive variant='inspector' kind='contractReview' />`. ADR: `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`.
- **Figma Implementation Contract (canónico — al implementar CUALQUIER diseño, especialmente desde Figma):** Figma es **intención, no valores literales**. ANTES de escribir JSX, correr 2 gates:
  1. **Token mapping (siempre):** cada color → `theme.palette.*` / `theme.axis.*` / `var(--mui-palette-*)`; tipografía → variant/SoT (skill `typography-design`); spacing/radius → spacing scale `4n` / `theme.shape.customBorderRadius.*`; motion → tokens `motion/core/tokens.ts`. **NUNCA** transcribir HEX/px/fontFamily/ms crudos de Figma. El MCP Figma te da los valores → **mapealos, no los pegues** (`get_variable_defs` + `get_code_connect_map`). Enforcement mecánico: lint `greenhouse/no-hardcoded-hex-color` (warn) + `no-hardcoded-fontfamily` (error) + `no-fontsize-inline-typography` (warn).
  2. **Primitive lookup en capas (en orden, ANTES de construir):**
     - (a) ¿Existe **primitive Greenhouse**? Grep `src/components/greenhouse/primitives/index.ts` (~79 exports) + variants/kinds + `docs/architecture/ui-platform/PRIMITIVES.md`. Si sí → **usar o expandir** (agregar variant/kind, NUNCA fork paralelo).
     - (b) ¿Hay **wrapper Vuexy `Custom*`** o componente MUI base (Select/Autocomplete/List/TextField/Menu…)? → la primitive nueva **envuelve esa base** (hereda a11y/teclado/estados); NUNCA reinventar input/select/list/dropdown desde cero.
     - (c) Solo si no hay nada → construir desde cero.
  - **Breadcrumbs canónicos:** toda jerarquía de navegación visible debe usar `GreenhouseBreadcrumbs` desde `@/components/greenhouse/primitives` (o el wrapper legacy `Breadcrumb`, que ya delega en esa primitive). No crear breadcrumbs locales con MUI directo, links sueltos ni botones "volver" paralelos. Usar `kind='pageHierarchy'` en headers de página, `kind='workbenchHierarchy'` en superficies densas y declarar los ancestros como links reales; el último item debe ser current page.
  - **Nacimiento de una primitive nueva (dropdown/list/input/etc.)** = protocolo Primitive+Variants+Kinds COMPLETO: vive en `src/components/greenhouse/primitives/` + export en el barrel + resolver `kind→variant`; a11y/responsive/reduced-motion **horneados**; **cero hardcode** (solo tokens); **Lab interno** `/admin/design-system/<nombre>` (gate `administracion.design_system`, alcanzable por nav + route-reachability); **evidencia GVC** desktop+mobile mirada; referencia al nodo AXIS Figma; contrato en `ui-platform/PRIMITIVES.md` (+ ADR si es platform-level). Patrón fuente: `GreenhouseButton`/`GreenhouseChip`/`GreenhouseActivityTimeline`/chart cards (2026-06-07).
  - **Reportar la decisión** (reuse / extend / new-primitive + por qué) ANTES de codear. Un one-off genuinamente no-reusable puede vivir junto al consumer, pero **igual tokenizado** (no va al registry). Skills que aplican el contrato: `greenhouse-product-ui-architect`, `greenhouse-ui-orchestrator`, `greenhouse-mockup-builder`, `modern-ui`, `figma-implement-design` + (Codex) `greenhouse-portal-ui-implementer` / `greenhouse-vuexy-ui-expert`.
- **Patron canonico Adaptive Sidecar (TASK-1028):** para asistencia contextual, inspectores, review panels, previews y formularios contextuales de bajo riesgo donde el contexto principal debe seguir visible, usar primero `AdaptiveSidecarLayout`, `ContextualSidecar` y `adaptive-sidecar-controller` desde `@/components/greenhouse/primitives`. No crear drawers/modals desktop custom para imitar este patron. Desktop = lane in-flow full-height del canvas, `role='complementary'`/no `aria-modal`; mobile/tablet = Drawer temporal. Usar `reduceAdaptiveSidecarState()` cuando haya open/close/replace/dirty local, respetar reduced motion via imports canonicos y validar con GVC desktop+mobile.
- **Patron canonico Composition Shell — BASE POR DEFECTO de toda interfaz nueva (TASK-1114 + TASK-1117 + TASK-1119):** **DIRECTIVA DEL OPERADOR (2026-06-14): toda superficie/pantalla/vista NUEVA de Greenhouse debe PARTIR del Composition Shell** — declarar su composición y colocar el contenido en regiones, NO inventar grids/morph/reestructuración de layout ad-hoc. Es el **punto de partida arquitectónico, no una opción más**. **Única salvedad (no la regla):** one-offs genuinamente triviales sin composición de regiones (un form aislado, un `Dialog`, una página estática de texto) pueden quedar en `LayoutContent` plano — pero deben **considerar el substrato PRIMERO y justificar por qué no aplica**. NUNCA inventar un sistema de regiones/morph/coreografía de layout paralelo (es lo que el substrato existe para absorber). "Base por defecto" = primer recurso + dueño del modelo de regiones, no prohibición de los siblings legítimos (`NexaMomentComposition`) ni reescritura de `LayoutContent` por fiat. — Es un substrato de **coreografía de layout domain-neutral, aditivo y opt-in** — una surface DECLARA una composición y el substrato aporta el grid de regiones singleton (`primary/aside/lead/dock/overlay`) + el morph in-place (View Transitions) + el reflow por size class M3 + el gobierno del estado. Usar `CompositionShell` + `composition-shell-controller` (`resolveComposition`/`resolveCompositionLayout`/`reduceCompositionShellState`) desde `@/components/greenhouse/primitives`. **NO reemplaza `LayoutContent`** (la surface que no opta queda igual). Metodología P+V+K: regiones = estructura · composiciones (`single/leadPlusContext/split/focused`) = variants · kinds de dominio → composición EXISTENTE (NUNCA una nueva por dominio). `AdaptiveSidecarLayout`/`NexaMomentComposition`/`OrganizationWorkspaceShell` son consumers conceptuales — pero **veredicto SIBLINGS** (TASK-1114): `CompositionShell` y `NexaMomentComposition` COEXISTEN, NINGUNO se construye sobre el otro (forzar fusión = over-abstraction/domain-leak). **Fluidez (TASK-1117, opt-in `fluidity='rich'`):** stagger de entrada + morph interrumpible (`morphStrategy='interruptible'`, framer-motion `layout`) + promoción shared-element (card→lead) + drawer temporal real en compact `split`. **Frontera dura de motion:** View Transitions = morph ESTRUCTURAL de regiones; framer-motion `layout` = INTERRUMPIBLE; stagger = ENTRADA — **NUNCA** animar la misma propiedad sobre el mismo nodo con ambas capas. **Hardening (TASK-1119):** guard dev-time del singleton view-transition-name (`composition-shell-vt-guard` — el "morph silencioso") + telemetry opt-in (`onTelemetry`/`createCompositionShellEvent`) + baseline GVC durable. **El substrato es dueño del namespace reservado `gh-region-*` de view-transition-name** — los **views de producto NO hand-wirean `gh-region-*`** (lint rule `greenhouse/no-ad-hoc-layout-morph`, warn-first; exentos el substrato, el motion family y el Lab). La rule **NO** flagea las transiciones shared-element TASK-525 (`person-avatar-*`/`quote-identity-*`/`nexa-moment-*` — otro namespace, patrón sancionado: para continuidad de objeto usá TU namespace con `startViewTransition`, no `gh-region-*`). Default `fluidity='baseline'` byte-idéntico a V1; reduced-motion horneado (`useReducedMotion`, never-hidden, compositor-only); reusa `startViewTransition` (TASK-525) + motion tokens (no fork). NUNCA dominio/política en el shell; NUNCA región repetible (constraint VT singleton); NUNCA flipear `compactContentWidth` a `wide` por una composición; NUNCA modelar navbar/footer (chrome global) como región. Lab `/design-system/composition-shell`. ADR `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` + companion `_UI_PLATFORM_V1.md` (Deltas 2026-06-14); UI Platform `docs/architecture/ui-platform/{PRIMITIVES,HISTORIAL}.md`.
- **Patron canonico Adaptive Card density (TASK-1115; capacidad HERMANA del Composition Shell):** cuando un card vive en una región que puede condensar (o en cualquier contenedor de ancho variable), debe **adaptarse a SU PROPIO ancho** (container query `inline-size`) con el contrato compartido `card-density` (`useContainerDensity` + `resolveCardDensity`/`resolveCardDensityRequest` + `isCardDensityAtLeast` desde `@/components/greenhouse/primitives`), NO clipear/overflowear al achicarse. Modos `full`/`condensed`/`peek`; **condensación honesta** (state-design): cada modo es una versión REAL más chica, NUNCA clip/overflow/`$0`, el dato clave (value) NUNCA desaparece. **El card NO hereda del shell** — el seam es la container query (cuando la región condensa, el ancho del card cambia → su fit mode se reevalúa solo; componen sin cablearse). Generaliza el density contract de tablas (TASK-743) + reusa el patrón `size→behavior` de `resolveAdaptiveSidecarMode` (un solo motor de adaptación). Adopción **aditiva opt-in** (`density?: CardDensityRequest`, default `full` byte-idéntico; `'auto'` adapta al ancho): ya adoptado por `MetricSummaryCard` + `MetricTrendCard`; al volver adaptable un card NUEVO, extender el primitive existente con el contrato. **NUNCA** crear un componente `adaptive-card` paralelo ni construir sobre `AdaptiveSidecarLayout` (es panel/lane, no card). SSR-safe (modo inicial `full`, sin hydration mismatch). **Morph fluido del cambio de densidad (decisión del operador 2026-06-14):** un card adaptable anima su cambio de fit mode (resize + reflow) con framer-motion `layout` + `cardDensityLayoutTransition` (tokenizada, reduced-motion horneado) — el cambio full↔condensed↔peek es un morph suave, NO un salto. **DIRECTIVA DEL OPERADOR (2026-06-14): todo elemento/card NUEVO de Greenhouse debe NACER con esta capacidad** — adaptable a su ancho (`density='auto'`) + rich-ready (anima su cambio de densidad). No es opt-in para elementos nuevos: es el estándar de nacimiento (igual que el Composition Shell es la base por defecto de toda interfaz nueva). El `default full` legacy es solo para los componentes que existían antes. **El patrón conjunto Composition Shell × Adaptive Card se llama "The Seam" (La Costura)** — el shell mueve el contenedor, el card adapta el contenido, la costura es el ancho (container query); componen sin cablearse. Lab `/design-system/card-density` (sección The Seam). ADR `GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` §Delta Adaptive Card / The Seam + `GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` (precedente TASK-743).
- **Contención de scroll horizontal — el overflow de PÁGINA NUNCA por sr-only / Recharts / grid min-content (clase TASK-742 + ISSUE-015, recanonizado 2026-06-14):** un `document.documentElement.scrollWidth > clientWidth` casi siempre viene de un descendiente cuyo **ancho intrínseco se propaga hacia arriba sin que ningún ancestro lo clipe**. Las **3 fuentes canónicas** + su fix (verificados live en el Lab card-density):
  1. **sr-only / `visuallyHidden` de MUI** (ej. la tabla de datos a11y de un chart, `position: absolute`) — **el "aria label que ya pasó antes"**. Sin un ancestro `position: relative`, el elemento absoluto se posiciona contra el **viewport** y su contenido `whiteSpace: nowrap` empuja el `scrollWidth` de página. **Fix:** el contenedor directo del elemento absoluto lleva `position: relative` → lo contiene; su propio `width:1px`+`overflow:hidden` lo clipa (`tablas-operativas.md:109` "inspeccionar elementos absolute/sr-only con `width:1`").
  2. **Recharts `ResponsiveContainer`** en un contenedor que se estrecha: el SVG queda con un ancho **stale** mayor (mide tarde, no re-renderiza al achicarse) y lo propaga. **Fix:** el `<Box>` **padre directo** del `ResponsiveContainer` lleva `minWidth: 0` + `overflowX: 'clip'` (`clip` corta el desborde horizontal **sin clipar el tooltip** — deja `overflow-y: visible`, a diferencia de `hidden`).
  3. **CSS Grid `1fr` / `repeat(N, …)`** cuyo track crece al `min-content` del ítem (el default es `minmax(auto, 1fr)`). **Fix:** `minmax(0, 1fr)` (track min 0) + `'& > *': { minWidth: 0 }` en los ítems; y en xs **apilar** (`gridTemplateColumns: { xs: '1fr', sm: … }`) los layouts cuyo aside/columnas tengan piso de px (ej. el `split` del Composition Shell con `clamp(320px,…)` no cabe en un viewport de teléfono).
  - **Red de seguridad ISSUE-015** (flex/grid item con `min-width: auto` default deja que un hijo ancho empuje el parent): `minWidth: 0` + `overflow-x: hidden|clip` en el wrapper. Para una vista que NUNCA deba scrollear de página, `overflowX: 'clip'` en su **root** (no afecta scroll vertical ni los scroll-containers internos). Para contenido que SÍ debe scrollear horizontal (tabla/specimens anchos), **contenelo** en un `overflow-x: auto` accesible (`role='region'` + `aria-label` + `tabIndex={0}`), NUNCA scroll de página (`GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md:128`).
  - **⚠️ Verificación canónica obligatoria:** medir `document.documentElement.scrollWidth > clientWidth` con Playwright a **desktop Y mobile (390px)** — un GVC `fullPage` puede **enmascarar** el scroll de página; el `scrollWidth` es la verdad. NUNCA declarar resuelto un fix de overflow sin la medición a 390px. Estos fixes van en la **primitive** (MetricTrendCard, CompositionShell), no parcheando cada view.
- **Patron canonico Floating Surface (TASK-1033):** para UI contextual **anclada y transitoria** (popovers, action menus, rich tooltips, evidence peeks, inline editors, validation bubbles, command previews) usar `GreenhouseFloatingSurface` + `floating-surface-controller` desde `@/components/greenhouse/primitives`. 6 variants oficiales con contrato a11y por variant (`richTooltip`/`actionMenu`/`evidencePeek`/`inlineEditor`/`validationBubble`/`commandPreview`) + resolver idempotente `kind→variant`. Los **views de producto NO importan `@floating-ui/react` directo** — lint rule `greenhouse/no-direct-floating-ui-in-views` (modo `error`) lo bloquea; exentos solo las primitives (`src/components/greenhouse/primitives/**`) e infra Vuexy menu (`src/@menu/**`). Complementa Adaptive Sidecar; NO reemplaza lanes full-height ni `Dialog` de decisiones destructivas/legales/financieras. ADR: `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`; Delta en `docs/architecture/ui-platform/HISTORIAL.md` (2026-06-06).
- **Patron canonico Motion Primitive (TASK-1045):** para el tier **cinemático / orquestado / scroll** (hero intros, list mounts, section reveals, timelines coreografiadas, count-ups) usar `<Motion>` (declarativo) o `useGreenhouseGSAP` (escape hatch imperativo) desde `@/components/greenhouse/motion`. 4 variants oficiales (`entrance`/`stagger`/`scrollReveal`/`timeline`) + resolver `kind→variant`. Los **views de producto NO importan `gsap`/`@gsap/react` directo** — lint rule `greenhouse/no-direct-gsap-in-views` (modo `error`) lo bloquea; exento solo `src/components/greenhouse/motion/**`. `prefers-reduced-motion` está **horneado** en `useGreenhouseGSAP` (`gsap.matchMedia`) — no-bypassable; degradación honesta (`gsap.from()` deja el contenido visible si el JS falla); solo props de compositor. **GSAP NO reemplaza CSS Tier 1** (hover/tap/toggle/focus = el theme) **ni framer-motion** (microinteracciones existentes intactas) — es una tercera capa aditiva; la consolidación es follow-up. Tokens SoT (`instant 75 · short 150 · standard 200 · medium 300 · long 400 · extended 600` ms + 4 eases) en `motion/core/tokens.ts` (núcleo portable, cero deps Greenhouse; seg+CSS derivados, drift-guarded). NUNCA registrar plugins/cleanup en una surface; NUNCA animar `width/height/top/left/margin/padding`. Museo interno `/admin/design-system/motion`. ADR: `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`; tokens `GREENHOUSE_DESIGN_TOKENS_V1.md` §9 + `DESIGN.md` §Motion.
- **Patron canonico Elevation / Shadow tokens (TASK-1049):** la profundidad (sombra/elevación) es **semántica**, no un índice. Las primitives Greenhouse leen un **rol** servido por el theme — `theme.greenhouseElevation.<role>` (SoT `src/components/theme/elevation-tokens.ts`) — NUNCA `Paper elevation={n}` ni `theme.shadows[n]`. 6 roles: `none` (cards/table shells planas) · `raised` (lift local hover/selection, NO escape hatch para re-elevar cards) · `floating` (popovers/menus/tooltips/evidence peeks/inline editors/validation bubbles — default de `GreenhouseFloatingSurface`) · `overlay` (command previews, docks) · `modal` (Dialog/Drawer temporal/decisiones destructivas) · `overflow` (**reservado**, sin valor runtime hasta tener consumidor). SoT = **factory mode-aware** (`elevationTokens(mode)`) sobre el canal canónico `var(--mui-mainColorChannels-${mode}Shadow)` (AXIS-aware) — NO reusa `customShadows.md/lg` (quedan compat Vuexy), NO OKLCH. Receta 2026: **dos capas suaves + borde hairline 1px**; **techo anti-dated**: ningún rol supera `0 8px 24px rgba(0,0,0,0.1)`. El **`borderColor` es obligatorio en `floating`/`overlay`/`modal`** — carga la separación bajo `forced-colors` (el navegador elimina `box-shadow`) y compensa la sombra débil en dark (alpha más alto). `theme.shadows[n]` / `customShadows` siguen disponibles como **infra legacy/compat** (Vuexy + código viejo), NO son el contrato para primitives nuevas. Drift-guard `src/components/theme/elevation-drift.test.ts` rompe CI si divergen `runtime ≡ SoT ≡ DESIGN.md §Elevation ≡ V1 §6`. **Lint rule `greenhouse/no-direct-mui-elevation-in-primitives` (modo `error`, scope `src/components/greenhouse/primitives/**`, TASK-1051/1052)** bloquea en primitives: `elevation={n≥1}`, `theme.shadows[n]` y `customShadows` (`theme.customShadows.*` + string `var(--mui-customShadows-*)`) — usar el rol. (Sombras direccionales bespoke NO se flaggean: ej. lane shadow del `adaptive` sidecar. Fuera de primitives —views/Vuexy/`card-statistics`— `theme.shadows`/`customShadows` quedan compat, no se flaggean.) NUNCA agregar un rol al SoT sin actualizar DESIGN.md §Elevation + V1 §6 en el mismo PR (mismo principio 3-capas que typography/AXIS). Museo interno `/admin/design-system/elevation`. ADR: `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`; tokens `GREENHOUSE_DESIGN_TOKENS_V1.md` §6 + `DESIGN.md` §Elevation.
- Hook operativo de verificación visual UI: si el trabajo toca UI visible, screenshots, microinteractions, responsive, design QA, frame sequences o revisión visual, la evidencia primaria debe generarse con **Greenhouse Visual Capture** (`GVC`, `pnpm fe:capture`) / `pnpm fe:capture:review` y sus relacionados. Usar scenario existente cuando exista; usar `pnpm fe:capture --route=<path> --env=staging --hold=3000` para evidencia rápida; crear scenario en `scripts/frontend/scenarios/` si el flujo es repetible, tiene interacciones o requiere scroll/captura de secciones; usar `pnpm fe:capture:diff` para before/after y `pnpm fe:capture:health` para salud local del helper. Para pantallas largas, preferir `scroll selector`, `scrollTo`, `mark fullPage` y `mark clipSelector` antes de scripts ad-hoc. Para flows críticos, declarar `readiness`/`assertions`; para microinteractions, preferir `interaction` V2 con intención y frames relativos; para responsive, usar `viewports`; para mockup aprobado→runtime, usar `baseline`. Playwright ad-hoc solo como complemento cuando se necesiten console/network/API payloads o una interacción no soportada por el DSL; guardar artifacts bajo `.captures/` y documentar por qué no bastó `GVC`.
  - **GVC V1.5 — contract gates (TASK-1018) son ADITIVOS y opt-in, NO mockup-only.** GVC sigue capturando **cualquier ruta** (mockup, runtime, `--route` arbitrario, staging/prod) exactamente como antes — un scenario sin `baseline`/`quality.*` se comporta byte-for-byte igual. Los gates nuevos son independientes y se activan por opt-in en el scenario, sobre mockup **o runtime** indistintamente: `quality.layout` (overflow/target<24px/clip/scroll/nested-cards), `quality.runtime` (console.error/pageerror/hydration/4xx-5xx), `quality.keyboard` (foco+ring+reduced-motion), `quality.performance` (DOM/requests/transfer/FCP), `quality.enterpriseRubric` (data honesty) — todos warning-first, `error` solo si el scenario lo declara. El **baseline visual diff** (`baseline.surfaceId` + `maxDiffRatio` + `maskSelectors` + home durable committeable `scripts/frontend/baselines/<surfaceId>/` + promoción `pnpm fe:capture:diff --promote`) es el único gate específico del flujo mockup aprobado→runtime, y degrada honesto a `baseline_stale` si falta el baseline. El determinismo (anim off/caret oculto/reduced-motion/fonts settled) se aplica SOLO cuando hay `baseline.surfaceId`, para no alterar la evidencia de motion del resto. `trace.zip` se guarda en cada captura fallida; `index.html`/`review-dossier.md` traen un **resumen ejecutivo** (`Apto`/`Revisar`/`Requiere iteración`). Codes SSOT en `scripts/frontend/lib/failure-taxonomy.ts`; `manifest.schemaVersion` se mantiene en `1`. Detalle: `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` Delta V1.5 + `scripts/frontend/scenarios/_README.md`.
- **NUNCA crear manualmente** `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel — la variable es auto-gestionada por el sistema. Si se crea manualmente, sombrea el valor real y rompe el bypass.
- URLs de staging:
  - Custom domain (SSO, no para agentes): `dev-greenhouse.efeoncepro.com`
  - `.vercel.app` (usar con bypass): `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
- Proyecto canónico: `greenhouse-eo` (id: `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`, team: `efeonce-7670142f`). NUNCA crear un segundo proyecto vinculado al mismo repo.

### Vercel CLI Scope Discipline (ISSUE-076, desde 2026-05-13)

Bug class recurrente: agentes corriendo `vercel` CLI desde local crean proyectos duplicados auto-vinculados al repo en su scope personal por NO pasar `--scope efeonce-7670142f` explícito. Ocurrió 2 veces:

- **ISSUE-013** (2026-04-05): `prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8` creado en `julioreyes-4376's projects` scope. Borrado.
- **ISSUE-076** (2026-05-13): `prj_FKsbIbQfUHp8OlNgnWp5j7RHnYsL` creado por "Kortex Agent" durante sesión de bridge identity (commit `76255825`, 2026-04-14). 29 días generando email burst hasta detección y borrado.

**Defense in depth canónico** (3 capas):

1. **`.vercel/project.json` checked-in al repo** (desde 2026-05-13): pinea `projectId` + `orgId` al canonical. Vercel CLI lo lee automáticamente — operadores/agentes locales NO necesitan pasar `--scope` explícito porque el directory contiene el link.
2. **`.gitignore` ajustado** `.vercel/*` + `!.vercel/project.json`: permite trackear el pin pero preserva `.env*.local` files (secrets) ignorados.
3. **Regla operativa documentada** (esta sección): aún con `.vercel/project.json` checked-in, cualquier comando ad-hoc desde un directory que NO sea la raíz del repo (e.g. agente en un worktree, script standalone) DEBE pasar `--scope efeonce-7670142f` explícito.

**⚠️ Reglas duras**:

- **NUNCA** correr `vercel link`, `vercel deploy`, `vercel env`, `vercel project rm`, ni cualquier `vercel` command de mutation sin verificar primero que `cat .vercel/project.json` retorna `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`. Si no existe o difiere, pasar `--scope efeonce-7670142f` explícito.
- **NUNCA** modificar `.vercel/project.json` para apuntar a un scope distinto. Si emerge necesidad legítima (testing personal experimental), trabajar en un fork del repo o usar un dir separado.
- **NUNCA** committear archivos `.vercel/*.local` (contienen secretos). El `.gitignore` con `.vercel/*` los protege, pero verificar con `git status --short` antes de cualquier commit que toque `.vercel/`.
- **NUNCA** delete project sin verify-then-delete defensive pattern: resolve ID via `vercel project inspect` y compare con expected ID antes del `rm`. Pattern fuente: TASK-827 follow-up live 2026-05-13.
- **SIEMPRE** que un agente nuevo emerja necesitando Vercel CLI access, asegurar que primero corre `cat .vercel/project.json` para confirmar canonical link. Si está en un fork/worktree donde `.vercel/project.json` no está clonado, hacer `vercel link --scope efeonce-7670142f --project greenhouse-eo --yes`.

**Patrón canónico de delete defensive (ISSUE-076 verify-then-delete)**:

```bash
EXPECTED_ID="prj_<authorized_id>"
RESOLVED_ID=$(vercel project inspect <name> --scope <scope> 2>&1 | awk '/ID/{print $2; exit}')
if [ "$RESOLVED_ID" = "$EXPECTED_ID" ]; then
  echo "y" | vercel project rm <name> --scope <scope>
else
  echo "ABORT — ID mismatch (resolved=$RESOLVED_ID, expected=$EXPECTED_ID)"
  exit 1
fi
```

CLI Vercel targetea por `name+scope`, NO por ID directo. El pattern resuelve el ID via `inspect`, compara contra el ID authorized por humano, y aborta si mismatch. Único patrón seguro para destructive Vercel actions cuando el target fue autorizado by ID (no by name+scope).

**Spec canónica**: `docs/issues/resolved/ISSUE-076-vercel-cli-duplicate-project-recurrent-bug-class.md` (cierra recurrencia de ISSUE-013).

### Cross-repo action safety (desde 2026-05-18, post Kortex over-application)

Cuando una instrucción menciona "repos hermanos" o pide aplicar un cambio a múltiples repos del ecosystem (e.g. documentar transfer, agregar notas cross-link, broadcast cambios canonical), **antes de commitear a cualquier repo distinto de `efeoncepro/greenhouse-eo`**, el agente debe verificar 2 condiciones:

1. **Relevancia operacional**: ¿el repo target consume o referencia el cambio? `GREENHOUSE_REPO_ECOSYSTEM_V1.md` lista repos hermanos pero algunos son **productos separados** (e.g. `efeoncepro/kortex` es plataforma CRM/HubSpot, NO Greenhouse ecosystem operacional). Aplicar la instrucción literal a TODOS los repos del doc sin filtrar = over-application.

2. **CI/CD del target repo**: ¿el repo tiene auto-deploy en push a `main` (Vercel/GitHub Actions/etc.)? Si SÍ, un commit benigno (incluso solo al README) **dispara el pipeline completo** — puede revelar bugs pre-existing dormant y generar email burst al owner. Antes de commit directo, verificar el último deploy status. Si está en Error, NO commitear (re-disparás el fail).

**⚠️ Reglas duras**:

- **NUNCA** commit directo a `main` de un repo sibling sin (a) confirmar relevancia operacional del cambio, (b) check del último deploy status del repo target, (c) decisión explícita del user si el repo tiene auto-deploy productivo.
- **NUNCA** asumir "instrucción literal aplica a todos los repos listados en el ecosystem doc". Filtrar por relevancia operacional ANTES de actuar. Si emerge duda, preguntar al user.
- **PREFERIR** PR + review en lugar de commit directo cuando el repo target tiene auto-deploy productivo y el cambio no es critical hotfix.
- **SIEMPRE** que la instrucción del user incluya "todos los repos hermanos" o equivalente plural, enumerar primero los repos candidate + propuesta filter por relevancia + esperar confirmación antes de bulk apply.

**Caso fuente (2026-05-18, Kortex over-application)**: durante governance fix del transfer `notion-bigquery` → `efeoncepro` org, agregué ecosystem note cross-link al README de los 4 repos hermanos listados en `GREENHOUSE_REPO_ECOSYSTEM_V1.md`. Kortex es **producto separado** sin relación operacional al sync notion-bigquery, pero apliqué la instrucción literal. Mi commit benigno (solo README) disparó auto-deploy Vercel productivo que falló por bug pre-existing 33 días dormant. Email noise al owner + 5 min cleanup (revert vía git clone). Lesson: relevancia + CI/CD check ANTES de cross-repo actions.

## Quick Reference

- **Package manager:** `pnpm` (siempre usar `pnpm`, no `npm` ni `yarn`)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test` (Vitest)
- **Type check:** `npx tsc --noEmit`
- **PostgreSQL connect:** `pnpm pg:connect` (ADC + proxy + test), `pnpm pg:connect:migrate`, `pnpm pg:connect:status`, `pnpm pg:connect:shell`
- **PostgreSQL health:** `pnpm pg:doctor`
- **Migrations:** `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:create <nombre>`, `pnpm migrate:status`
- **DB types:** `pnpm db:generate-types` (regenerar después de cada migración)

### Solution Quality Contract

- Greenhouse espera soluciones seguras, robustas, resilientes y escalables por defecto; no parches locales salvo mitigacion temporal explicita.
- Antes de implementar, validar si el problema es sintoma local o causa compartida y preferir la primitive canonica del dominio.
- Todo workaround debe quedar documentado como temporal, reversible, con owner, condicion de retiro y task/issue asociada cuando aplique.
- Fuente canonica: `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

### Full API Parity Principle

**Regla base:** todo lo que se pueda hacer dentro de Greenhouse debe poder hacerse, o tener camino planificado para hacerse, a traves de un contrato programatico gobernado. La UI no es el source of truth de una capacidad: es un cliente de commands, readers, projections y API contracts server-side.

**Implicaciones duras:**

- **NUNCA** implementar una accion de negocio solo dentro de un componente UI si puede afectar estado, permisos, datos, aprobaciones, exports, recoveries, reportes o configuracion. Extraer primero la primitive canonica en `src/lib/**`.
- **NUNCA** crear endpoints que sean simples "click handlers remotos" acoplados al componente visible. Modelar el aggregate/recurso/command y su contrato estable.
- **SIEMPRE** que una feature nueva agregue una accion visible, declarar el camino programatico esperado: Product API interna, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook, o task follow-up si se difiere.
- **SIEMPRE** que el write pueda reintentarse o venga de integracion/agente, aplicar command semantics explicita, authorization tenant-safe, audit/outbox cuando aplique, idempotencia, errores sanitizados y observabilidad.
- **SIEMPRE** que la UI consuma una operacion, preferir reuse de readers/commands canonicos antes de crear logica paralela para la pantalla.

**Fuente canonica:** `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` + decision "Full API parity" en `docs/architecture/DECISIONS_INDEX.md`.

### Session access derivation must honor role-assignment lifecycle (TASK-987 / ISSUE-083, desde 2026-06-01)

Toda derivación de **acceso de sesión** desde `user_role_assignments` (route_groups, role_codes, y cualquier proyección derivada de roles) **debe** aplicar el **mismo predicado de ciclo de vida**: `ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)`. Un rol **revocado/expirado NUNCA confiere acceso** — ni route group, ni vista, ni capability, ni ítem de menú.

**Bug class fuente (over-exposure)**: el view `greenhouse_serving.session_360` agregaba `role_codes` CON el filtro de lifecycle pero `route_groups` SIN él (solo `FILTER (WHERE rg.rg IS NOT NULL)`). Resultado: roles revocados seguían aportando su `roles.route_group_scope`. Una `collaborator` con `efeonce_account` revocado seguía viendo Personas/Comercial; otra collaborator veía Finanzas+HR por 3 roles revocados. 5 usuarios afectados, silencioso por falta de detector. El fallback BQ (`getIdentityAccessRecord`) sí filtraba `ura.active=TRUE AND status='active'` al JOIN — solo el view PG divergía.

**⚠️ Reglas duras**:

- **NUNCA** agregar/derivar un campo de acceso (route_groups, role-derived flags) en un read model o helper sin el predicado de lifecycle idéntico al de `role_codes`. Los dos agregados deben moverse juntos; si uno filtra activo, el otro también.
- **NUNCA** parchear un caso individual de over-exposure ("filtrá a Valentina"). El fix es la corrección de la **derivación canónica** + detector de drift; el caso individual es síntoma.
- **NUNCA** restaurar acceso legítimo de un usuario vía hardcode ni dejándolo apoyado en la fuga de un rol revocado. Re-otorgar el **rol ACTIVO canónico** (que carga route_groups + `role_view_assignments` + `role_entitlement_defaults`). Caso fuente: Humberly ("Finance Manager") → re-grant `finance_admin`+`hr_manager` activos, NO hardcode finance/hr.
- **NUNCA** asumir que las superficies de supervisor (Mi equipo/Aprobaciones/Organigrama) dependen de route groups — se gatean por `supervisorAccess` (TASK-727, `canAccessSupervisorPeople = hasDirectReports || hasDelegatedAuthority`), independiente de route groups. El fix de route groups NO las toca.
- **SIEMPRE** que emerja una derivación de acceso desde roles, shippear el **detector de drift** correspondiente. Signal canónico: `identity.session.route_group_drift` (kind=drift, moduleKey=identity, severity=error si >0, steady=0) — cuenta usuarios cuyo `route_groups` ⊋ derivación desde roles activos. Reader: `src/lib/reliability/queries/identity-session-route-group-drift.ts`.
- **SIEMPRE** que cambie el shape de derivación de `session_360`, incluir un DO block de verificación en la migración (aborta si queda fuga) — patrón de la migración `20260601194051024`.

**Open question (gobernanza, no resuelta en TASK-987)**: el mapa TS `ROLE_ROUTE_GROUPS` (`src/lib/tenant/role-route-mapping.ts`) y el DB `greenhouse_core.roles.route_group_scope` difieren en `people` para `efeonce_operations`/`hr_payroll`. El runtime usa el DB (via el view); el TS es fallback. Reconciliar los VALORES del mapping es decisión de gobernanza del operador — NO cambiar unilateralmente.

**Spec canónica**: `docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md` + `docs/issues/resolved/ISSUE-083-session-route-groups-leak-from-revoked-roles.md`. Migración: `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql`.

### Approval Authority Delegation invariants (TASK-1020, desde 2026-06-07)

El `operational_responsibilities.responsibility_type='approval_delegate'` **genérico** NO confiere ni **autoridad de aprobación** ni **scope de supervisor** para las superficies de aprobación. Cierra el drift donde una responsabilidad genérica (Valentina delegada, `scope_id=daniela`) congeló a la delegada como `effective_approver_member_id` del permiso de Andrés, bloqueando a la supervisora formal Daniela. Causa raíz = drift de autorización (no "falta un botón"). Decisiones canónicas D1-D4 confirmadas por el operador/CEO el 2026-06-07.

**Dos planos** consumen hoy el mismo delegate genérico (decidir ambos, no asumir que arreglar uno arregla el otro):
1. **Autoridad** — `resolver.ts` → `getEffectiveSupervisor` (`readers.ts`) → snapshot → `leave-review-policy.ts`. Lo consumen los TRES stages `effective_supervisor` (`leave`, `expense_report`, `performance_evaluation`).
2. **Visibilidad/scope** — `access.ts` (`getSupervisorScopeForTenant`).

**Mecánica canónica**:
- Flag declarativo per-stage `ApprovalStageDefinition.honorGenericApprovalDelegate` (`src/lib/approval-authority/config.ts`, default tratado como `false`). El resolver pasa `delegationPolicy: honor ? 'generic' : 'ignore'` a `getEffectiveSupervisor(memberId, { delegationPolicy })`. Con `'ignore'` → `effectiveApproverMemberId === formalApproverMemberId` y `authoritySource='reporting_hierarchy'` (NUNCA `'delegation'`).
- `getEffectiveSupervisor` default `'generic'` (preserva el contrato del reader para callers explícitos); el cambio NO es global ciego — cada caller declara su política.
- `getSupervisorScopeForTenant` (D3) ya NO cuenta el `approval_delegate` genérico hacia `canAccessSupervisorLeave`/`visibleMemberIds`/`hasDelegatedAuthority`. El scope deriva de la línea formal (`hasDirectReports` + subárbol propio).
- Recovery auditado `src/lib/hr-core/leave-approval-authority-recovery.ts` (CLI `pnpm hr:leave-approval-authority:recover`): dry-run default; `--apply` requiere filtro explícito (allowlist anti revoke global); recompute SIEMPRE vía `resolveApprovalAuthorityForStage` (SSOT — runtime y recovery no divergen); revoke global D4 (append-only); outbox `leave_request.approval_authority_recovered` v1; idempotente; solo snapshots `pending_supervisor`.
- Guardrail fail-closed: `assignApprovalDelegation*` (`src/lib/reporting-hierarchy/admin.ts`) rechaza (422) — la delegación genérica ya no confiere nada → recrearla es un primitivo inerte/engañoso. `revoke`/`list` siguen disponibles para limpiar/auditar. La UI (`HrHierarchyView`) muestra el panel de delegaciones **solo lectura** con Alert honesto.

**⚠️ Reglas duras**:
- **NUNCA** un `approval_delegate` genérico cambia el `effective_approver_member_id` de un stage con `honorGenericApprovalDelegate=false`. El default es `false`; setear `true` requiere decisión documentada por stage.
- **NUNCA** resolver un caso de over-exposure de aprobación dando HR/admin broad al supervisor formal ni tocando `route_groups`/`views`/grants de `session_360`. El supervisor formal aprueba porque es supervisor formal (`reporting_lines`).
- **NUNCA** el delegate genérico confiere `canAccessSupervisorLeave`/`visibleMemberIds`/scope. Conferir visibilidad-sin-autoridad sobre un artefacto no validado es over-exposure (principio TASK-987/ISSUE-083: el predicado de validez se mueve junto para TODO lo derivado).
- **NUNCA** remediar snapshots/responsabilidades con SQL manual de mutación. Usar el recovery command auditado (read-only SQL solo para diagnóstico/verificación).
- **NUNCA** recomputar la autoridad dentro del recovery (ni en ningún consumer): pasar SIEMPRE por `resolveApprovalAuthorityForStage`. NUNCA borrar filas históricas de `operational_responsibilities` (revoke con lifecycle/audit).
- **NUNCA** crear una delegación genérica de aprobaciones nueva vía API/UI (guardrail 422). La delegación REAL de aprobación de permisos (cobertura por vacaciones) renace como contrato domain-scoped separado (ADR follow-up, opt-in por dimensión `confersApprovalAuthority`/`confersVisibilityScope`); el interín es el override HR/admin.
- **SIEMPRE** que emerja un stage `effective_supervisor` nuevo, declarar su `honorGenericApprovalDelegate` explícito (default `false`) — el contrato per-stage escala sin código nuevo.
- **SIEMPRE** que se cambie la política de un stage, mover juntos: config flag + signal parametrizado + tests. El signal `hr.leave.invalid_delegated_approval_snapshots` (moduleKey `identity`, kind `drift`, steady=0) lee la política de `config.ts` y cuenta snapshots PENDIENTES con autoridad delegada inválida en stages que no honran delegate.

**Spec canónica**: `docs/tasks/complete/TASK-1020-leave-approval-authority-delegation-drift-hardening.md` + `GREENHOUSE_IDENTITY_ACCESS_V2.md` Delta 2026-06-07 + `DECISIONS_INDEX.md`. Runbook: `docs/operations/runbooks/leave-approval-authority-recovery.md`. Patrones fuente: TASK-987/ISSUE-083 (over-exposure de acceso), TASK-571/766 (VIEW/helper + signal + lint), TASK-742 (defense-in-depth).

### Runtime Rollout Completion Gate

**Regla dura:** no declarar una task, incidente o flujo como terminado si solo esta implementado en codigo pero falta cualquier paso para que funcione en el runtime real. `code complete` no es `operationally complete`.

Antes de cerrar, verificar y documentar segun aplique:

- flags/env vars configuradas en todos los targets relevantes (`Production`, `staging`, `Preview (develop)`, workers, crons, Cloud Run);
- redeploy/restart aplicado cuando Vercel, Cloud Run o el worker no toman env vars nuevas en caliente;
- migraciones aplicadas, backfills/recoveries ejecutados y data shape confirmado en PostgreSQL/BigQuery/source of truth;
- integracion externa probada con evidencia real si el flujo depende de Entra/SCIM, Microsoft Graph, HubSpot, Notion, Teams, Vercel, GCP, Azure, webhooks o crons;
- API/UI runtime verificada contra el deployment activo, no solo contra tests unitarios o mocks;
- Handoff actualizado con lo aplicado, lo verificado y cualquier pendiente bloqueante.

Si falta algo, reportar el estado como `code complete, rollout pendiente` o `operativamente bloqueado`; no mover lifecycle a complete ni decir "listo" como si el usuario ya pudiera usarlo.

**Caso fuente 2026-06-01:** Workforce Activation/SCIM tenia codigo TASK-872/874/876, pero sin `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true`, `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`, redeploy de Vercel y backfill de usuarios ya creados, Entra seguia creando solo `client_users` y no `members`. La pantalla prometia activacion laboral, pero Maggie Borralles no aparecia hasta completar rollout + recovery.

### Documentation Closure Gate

Despues de cualquier implementacion, incidente, rollout, cambio de arquitectura/workflow o skill local, invocar `greenhouse-documentation-governor` antes de declarar el trabajo completo y usar `pnpm docs:closure-check` como primera pasada mecanica. La skill decide y ejecuta la sincronizacion documental proporcional: arquitectura/ADR, `DECISIONS_INDEX`, changelog, `Handoff.md`, task lifecycle, `AGENTS.md`, `CLAUDE.md`, `project_context.md`, docs funcionales, manuales, auditorias y relacionados. Paths canonicos: `.codex/skills/greenhouse-documentation-governor/SKILL.md` y `.claude/skills/greenhouse-documentation-governor/SKILL.md`.

Regla corta: si los docs, rollout, lifecycle y evidencia no quedaron sincronizados, el estado correcto es `code complete, rollout pendiente` u `operativamente bloqueado`, no `complete`.

### QA Release Auditor Gate

Antes de cerrar implementaciones no triviales, incidentes, rollouts, cambios UI/schema/integracion/tooling/skills o cualquier trabajo donde "tests verdes" no pruebe runtime real, invocar `greenhouse-qa-release-auditor` y usar `pnpm qa:gates --changed` como primera pasada mecanica. La skill clasifica riesgo, inyecta skills especializadas a demanda por namespace de agente (Codex y Claude pueden tener nombres/coberturas distintas: UI/GVC, finance, payroll, release, secrets, browser diagnostics, arquitectura, docs, etc.) y emite `PASS | CONDITIONAL PASS | BLOCK`. Si falta evidencia runtime, el cierre debe decir `code complete, rollout pendiente` u `operativamente bloqueado`.

Nota de convivencia: el script `.codex/hooks/qa-release-stop-hook.mjs` es un guardrail local de Codex y queda opt-in/desregistrado por defecto para evitar prompts out-of-band; no reemplaza esta regla manual ni aplica automaticamente a Claude.

### Task Closing Quality Gate — full test + production build local (desde 2026-05-13, TASK-827 follow-up)

**ANTES de mover una task de `in-progress/` a `complete/`** y declarar "ship done", correr **ambos** comandos local como gate final canonical:

```bash
pnpm test          # full suite (NO solo focal del modulo tocado)
pnpm build         # produccion Turbopack (next build) — NO el dev server
```

**Por que el pre-push hook NO basta** (canonizado live 2026-05-13 post 2 CI failures consecutivos en TASK-827):

El pre-push hook canonical del repo corre `pnpm lint` + `pnpm tsc --noEmit` (~90s). Es **first filter**, NO gate final. Especificamente NO corre:

- `pnpm test` (full suite ~12 min con coverage) — atrapa test contracts cross-module que tu modulo focal no toca pero tu cambio invalida (ej. test pin-eando `VIEW_REGISTRY` length; lint rule cubriendo recurso compartido; column-parity test SQL)
- `pnpm build` (Turbopack next build ~8 min) — atrapa boundary violations que tsc/lint NO enforcen: `import 'server-only'` transitivo a client bundle, dynamic imports rotos, hidden type errors solo en Turbopack pipeline, etc.

CI corre ambos. Si tu task no los corre local pre-close, CI los descubre post-push → rojo + email burst + perdes el deploy automatico hasta el siguiente push fix.

**Reglas duras**:

- **NUNCA** declarar una task complete + move a `complete/` + sync `README.md` sin haber corrido `pnpm test` (full suite) y `pnpm build` (production) local en el ultimo commit del slice final. Pre-push hook (lint + tsc) NO sustituye este gate — son layers diferentes.
- **NUNCA** asumir que los tests focales de tu modulo cubren el blast radius. Si tu task toca un **recurso compartido** (`VIEW_REGISTRY`, `RELIABILITY_REGISTRY`, `entitlements-catalog`, `EVENT_CATALOG`, public types exportados ampliamente, migrations seedeando registries), el blast radius incluye tests cross-module que tu modulo no ve. Solo full suite los atrapa.
- **NUNCA** asumir que `tsc --noEmit` cubre boundary contracts runtime. `server-only` / `client-only` son runtime contracts; TypeScript no los enforce. Solo `next build` con Turbopack lo detecta.
- **NUNCA** considerar un CI rojo como "el sistema funcionando bien". Si CI falla por algo que tu hubieras detectado con `pnpm test && pnpm build` local, es un escape de mi proceso de pre-close, NO de la "red de seguridad CI".
- **SIEMPRE** que un slice introduzca:
  - Component nuevo con `'use client'` que importe de un modulo `src/lib/` → `pnpm build` antes del push (Turbopack detecta server-only transitivo)
  - Modification a un registry / catalog / shared resource → `pnpm test` antes del push (full suite captura cross-module assertions)
  - Cambio a un public type exportado / firma de helper canonico → ambos
- **SIEMPRE** que cierres una task `in-progress/` → `complete/`, los ultimos comandos en tu shell antes del move deberian ser `pnpm test && pnpm build`. Si alguno falla, NO cierres — debug primero.

**Bug class canonizada (TASK-827, 2026-05-13)**: 2 CI failures consecutivos post "task complete":

1. `client-role-visibility.test.ts` pin-eaba 11 viewCodes en `VIEW_REGISTRY section='cliente'`; Slice 0 agrego 11 mas → 22 total → test rompe assertions de length + matrix coverage. Detectable con `pnpm test` full suite. NO detectable con `pnpm test src/lib/client-portal/` (focal).
2. `ClientPortalNavigationList.tsx` ('use client') importaba tipos + helper puro de `menu-builder.ts` que declara `import 'server-only'`. Turbopack en `next build` detecta server-only transitivo a client bundle y rompe. tsc/lint/vitest pasan (mock `server-only`); solo build produccion detecta. Detectable con `pnpm build` local.

Ambos fueron escapes de mi proceso pre-close. Esta regla canonical los previene.

**Trade-off explicito**: ~20 min extra pre-close vs 12+ min de CI failure + email burst de Vercel + push fix + nueva ronda CI. Net positive cuando count tests + build cost local < (CI roundtrip + dev context switch + reputational cost de "shipped roto").

**Bug class adicional canonizado live 2026-05-28 (TASK-943 follow-up)**: cuando tu working tree contiene **orphan uncommitted changes** de sesiones previas (e.g. stashed code, lifecycle moves pendientes, helpers half-committed), tu `pnpm build` local pasa porque ejercita el WT completo — pero Vercel construye contra el SHA exacto que recibió, sin el orphan state. Si tus commits dependen del orphan (e.g. `import { helper } from '@/lib/x'` donde `helper` solo existe uncommitted), **Vercel rompe en build aunque local esté verde**. Detectado live: Slice 2 + Slice 3 de TASK-943 importaban `toBigQueryStructTimestamp` desde `@/lib/bigquery` cuya exportación vivía solo en mi WT como orphan TASK-941 closure — 4 deploys staging consecutivos en Error hasta que un commit ajeno agregó el export al remoto.

**Reglas duras** (adicionales al gate canonical):

- **NUNCA** committear código que dependa de un símbolo exportado por archivo cuyas modificaciones estén uncommitted/stashed. **ANTES de cada commit**, correr `git status --short` y verificar que cualquier archivo modificado del cual dependo está incluido en el stage o ya está pusheado. Si emerge orphan state al stagear (sesión anterior dejó cosas a medio cerrar), o (a) committearlo formalmente PRIMERO como su propio commit cerrando la sesión anterior, o (b) stashearlo y volver después — NUNCA dejarlo "convivir" con commits que dependen de él.
- **SIEMPRE** que detectes orphan state en `git status --short` antes de empezar trabajo nuevo, decidir explícitamente: (1) commit + push para cerrar la sesión anterior, (2) stash con nombre claro para preservar, o (3) revert si era residual no deseado. NUNCA dejarlo flotante asumiendo que "no afecta mis commits nuevos" — los Vercel builds remotos no ven tu WT.
- **SIEMPRE** que tu commit toque `import X from '@/lib/foo'` para un símbolo nuevo, verificar con `git ls-tree -r origin/develop --name-only | grep foo` que el archivo está en remoto Y `git show origin/develop:src/lib/foo.ts | grep "export.*X"` que el símbolo está exportado. Si no, primer commit = agregar el export; segundo commit = usarlo.

**Pre-push defense-in-depth recomendado**: cuando un commit toca imports cross-module críticos, correr `git stash --keep-index && pnpm build && git stash pop` ANTES del push — eso ejercita el build solo con lo staged, replicando lo que Vercel verá. Es ~30s extra que detecta este bug class sin pasar por el CI roundtrip.

**Post-push verificación obligatoria de despliegues Cloud Run workers** (canonizado live 2026-05-28 TASK-943 follow-up): cualquier commit pushado a `develop` que toque archivos bajo `src/lib/**` que sean consumidos por los 4 workers Cloud Run (`ops-worker`, `ico-batch-worker`, `commercial-cost-worker`, `hubspot-greenhouse-integration`) — es decir, **casi cualquier cambio backend** — DEBE verificarse en GitHub Actions ANTES de declarar la task complete. Pre-push hook (lint + tsc) NO ejercita el bundle esbuild de los workers; Vercel build NO ejercita los workers tampoco. Los workers tienen su propia pipeline de deploy con esbuild bundler distinto al Turbopack de Next.js, y pueden fallar independientemente.

**⚠️ Reglas duras**:

- **NUNCA** mover una task a `complete/` sin verificar que los 4 workflows de Cloud Run workers afectados por los commits de la task estén en `conclusion=success`. Verificar con: `gh run list --workflow=ico-batch-deploy.yml --limit 5` + idem `ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `hubspot-greenhouse-integration-deploy.yml`. Si alguno está `failure`/`cancelled`, **re-disparar** con `gh workflow run <workflow> --ref develop -f environment=staging -f expected_sha=$(git rev-parse origin/develop)` y monitorear hasta success.
- **NUNCA** asumir que un workflow `cancelled` por commit subsequent es "OK porque el siguiente lo cubre" — workflows production-deploy son SEPARADOS por workflow, NO por commit; cada uno necesita su propio run success para garantizar que el último SHA de develop está deployado a las revisions Cloud Run productivas.
- **NUNCA** pushear múltiples commits al hilo a `develop` sin verificar entre pushes que el deploy del commit anterior completó (o aceptar que el siguiente cancelará al anterior — y entonces re-disparar el último al final).
- **SIEMPRE** que la task touch `src/lib/{bigquery,ico-engine,sync,reliability,observability,postgres}/**` (consumed by workers), el cierre canonical INCLUYE: `gh run list --workflow=<deploy>.yml --limit 1 --json conclusion` para los 4 workers + estado terminal `success` + revision Cloud Run actualizada con `GIT_SHA == expected_sha`.

**Patrón canonical de cierre post-Vercel-Ready** (TASK-943 follow-up canonizado):

```bash
# 1. Verifica que los 4 deploy workflows estén success en el último SHA
LATEST_SHA=$(git rev-parse origin/develop)
for WF in ico-batch-deploy.yml ops-worker-deploy.yml commercial-cost-worker-deploy.yml hubspot-greenhouse-integration-deploy.yml; do
  STATUS=$(gh run list --workflow=$WF --limit 1 --json status,conclusion,headSha -q '.[0] | "\(.status) \(.conclusion) \(.headSha)"')
  echo "$WF: $STATUS"
done

# 2. Si alguno NO matchea LATEST_SHA con conclusion=success, re-disparar:
gh workflow run <workflow>.yml --ref develop -f environment=staging -f expected_sha=$LATEST_SHA

# 3. Monitorear hasta success (Monitor canonical or gh run watch <run-id>)
```

**Excepcion legitima** (documentar): hotfix critico bajo incident response real (ej. ISSUE-### activo, production down) puede saltar este gate priorizando velocidad. En ese caso, post-push correr ambos comandos remoto via CI (`gh run watch`) y reportar verde como cierre.

### Admin Center Entitlement Governance (TASK-839, desde 2026-05-11)

- Surface canónica: `/admin/views`, Admin Users > `[usuario]` > Acceso y APIs `/api/admin/entitlements/**`. No crear rutas paralelas `/api/admin/governance/access/**`.
- Todo write de role defaults, user overrides o startup policy debe pasar por `src/lib/admin/entitlements-governance.ts` para mantener transacción única: governance table + audit append-only + outbox.
- Cada endpoint debe hacer doble gate: `requireAdminTenantContext()` para entrada broad y `can(tenant, 'access.governance.*', action, 'tenant')` para least privilege granular.
- Antes de persistir una capability, validar que exista en `greenhouse_core.capabilities_registry` y `deprecated_at IS NULL`. Nunca bypassar el registry ni escribir grants con strings ad hoc.
- Grants sensibles (`*_sensitive`, `.reveal_sensitive`, `.export_snapshot`) quedan `pending_approval` y requieren segunda firma con actor distinto. Pending grants no se aplican al acceso efectivo.
- Outbox governance debe incluir `schemaVersion: 1` y `affectedUserIds` cuando el cambio impacte usuarios; `organizationWorkspaceCacheInvalidationProjection` soporta fan-out vía `extractScopes`.
- Signals canónicos: `identity.governance.audit_log_write_failures` y `identity.governance.pending_approval_overdue`. Steady state esperado: 0.

### Deprecated Capabilities Discipline (TASK-840, desde 2026-05-11)

- Cuando una capability se remueve del TS catalog (`src/config/entitlements-catalog.ts`), acompañar el cambio con una migration que marque `greenhouse_core.capabilities_registry.deprecated_at`; nunca borrar rows del registry.
- No deprecar una capability que todavía existe en el TS catalog. Eso es drift inverso y se corrige seedeando/actualizando `capabilities_registry`.
- Usar `markCapabilityDeprecated()` o el endpoint canónico `/api/admin/entitlements/capabilities/[capabilityKey]/deprecate`; no escribir `deprecated_at` a mano desde rutas nuevas.
- Antes de deprecar, verificar grants activos en `role_entitlement_defaults` y `user_entitlement_overrides`. Si existen, migrar/documentar esos grants primero.
- El reporter one-shot `scripts/governance/find-deprecated-candidates.ts` lista candidates en CSV; no auto-depreca ni reemplaza revisión de operador.

### View Registry Governance Pattern (TASK-827, desde 2026-05-13)

Cualquier `viewCode` agregado a `VIEW_REGISTRY` en `src/lib/admin/view-access-catalog.ts` **debe acompañarse en el MISMO PR** de una migration que:

1. INSERT en `greenhouse_core.view_registry` (gobernanza persistida)
2. INSERT en `greenhouse_core.role_view_assignments` con `granted=TRUE` para CADA role que deba acceder ese viewCode

**Por qué**: el helper `roleCanAccessViewFallback()` en `src/lib/admin/view-access-store.ts:99-125` opera como signal de gobernanza pendiente. Cuando un viewCode NO tiene fila explícita en `role_view_assignments`, el fallback heurístico resuelve `granted=true` por route_group match Y emite WARNING `role_view_fallback_used` (Sentry domain=identity) — funciona correctamente operacionalmente, pero es ruido de gobernanza incompleta.

**Bug class detectado live (TASK-827 Slice 0, 2026-05-13)**: agregué 11 viewCodes nuevos al TS registry sin migration acompañante → Sentry emitió 10 warnings en sesión cliente real (alert JAVASCRIPT-NEXTJS-4X). Causa raíz: gap entre TS source-of-truth y DB seed. Solución canónica: migration de seed (44 filas: 11 viewCodes × 4 roles), NO patch del fallback ni desactivar telemetría.

**Pattern canónico** (mirror TASK-750/749/827):

```sql
-- Up Migration
INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('<section>.<view_code>', '<section>', '<Label>', '<Description>', '<route_group>', '/<path>', 'tabler-<icon>', <N>, TRUE, 'migration:TASK-XXX')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon, active = TRUE, updated_at = NOW(), updated_by = 'migration:TASK-XXX';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('<role_code>', '<section>.<view_code>', true, 'migration:TASK-XXX', NOW(), NOW(), 'migration:TASK-XXX')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted, updated_at = NOW(), updated_by = 'migration:TASK-XXX';

-- Anti pre-up-marker check (CLAUDE.md regla migration markers)
DO $$
DECLARE registered_count INTEGER; granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry WHERE view_code IN (...);
  IF registered_count < <N> THEN
    RAISE EXCEPTION 'TASK-XXX anti pre-up-marker: expected <N> view_registry rows, got %', registered_count;
  END IF;
  -- repeat para role_view_assignments
END $$;

-- Down Migration (idempotent, append-only audit)
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-XXX:revert'
WHERE updated_by = 'migration:TASK-XXX';
```

**⚠️ Reglas duras**:

- **NUNCA** agregar entry a `VIEW_REGISTRY` TS sin migration acompañante en el mismo PR. La telemetría `role_view_fallback_used` lo detectará en producción y genera ruido Sentry.
- **NUNCA** desactivar el helper `roleCanAccessViewFallback` ni la captureMessageWithDomain del path. ES la señal canonical de drift gobernanza — load-bearing.
- **NUNCA** parchear el fallback heurístico para "evitar" el warning. La solución canonical es seed migration; el warning ES el detector.
- **NUNCA** borrar filas de `role_view_assignments` (append-only governance). Down migration marca `granted=FALSE` preservando audit trail.
- **NUNCA** definir un viewCode sin `routePath` válido (incluso si la página es placeholder forward-looking — declara el path canonical, page se crea en TASK derivada).
- **SIEMPRE** que un viewCode se vuelva accesible para más roles (e.g. nuevo addon), migration nueva con INSERT ON CONFLICT DO UPDATE para los grants adicionales. NO modificar la migration original.
- **SIEMPRE** usar `migration:TASK-XXX` como `granted_by`/`updated_by` audit marker — preserva trazabilidad cross-migration.
- **SIEMPRE** incluir DO block anti pre-up-marker check (TASK-838 pattern) en migrations que seedean view_registry/role_view_assignments, validando COUNT esperado post-INSERT.

**Spec canónica**: `docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md` Slice 0 + incident hardening commit `2fd8a60c` (seed 44 filas, 11 viewCodes × 4 roles client_executive/client_manager/client_specialist/efeonce_admin).

### Secret Manager Hygiene

- Secretos consumidos por `*_SECRET_REF` deben publicarse como scalar crudo: sin comillas envolventes, sin `\n`/`\r` literal y sin whitespace residual.
- Patrón recomendado:
  ```bash
  printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
  ```
- Siempre verificar el consumer real después de una rotación:
  - auth: `/api/auth/providers` o `/api/auth/session`
  - webhooks: firma/HMAC del endpoint
  - PostgreSQL: `pnpm pg:doctor` o conexión real
- Rotar `NEXTAUTH_SECRET` puede invalidar sesiones activas y forzar re-login.

### AI Visual Asset Generator

- Skill canonica para pedir, promptear, generar y QA assets visuales con IA: `.claude/skills/greenhouse-ai-image-generator/SKILL.md` (Codex mirror: `.codex/skills/greenhouse-ai-image-generator/SKILL.md`). Usarla cuando el usuario pida iconos, UI elements, empty states, banners, assets transparentes, OpenAI/GPT Image/Imagen/Nano Banana o mejora de prompts para imagenes.
- La skill no solo opera el provider: debe actuar como direccion de arte, con brief visual, composicion, materiales/acabados, iluminacion, paleta, iteracion single-change y rubric de QA profesional. Guia compartida: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`.
- Entry point canonico para assets visuales generados por agentes: `src/lib/ai/image-generator.ts`.
- `generateImage()` soporta providers `google-imagen` y `openai-image`; no llamar APIs de imagen desde scripts paralelos si el helper cubre el caso.
- **CLI canonica de generacion `pnpm ai:image` (gpt-image-2, desde 2026-06-10):** wrapper operativo del fn canonico `generateOpenAIImage` (`src/lib/ai/openai-image.ts`) para generar imagenes desde la terminal — conceptos del `product-design-loop`, fixtures de mockup, batches de iconos/assets. **NO crear scripts de generacion ad-hoc** (`scripts/_gen-*.ts`): usar esta CLI. Self-contained (carga `.env.local` solo; resuelve `OPENAI_API_KEY_SECRET_REF` server-side, nunca imprime el secreto). Default `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated`. Timeout default **280s** (gpt-image-2 `high` supera los 125s del helper runtime `generateImage`, que NO pasa-through `timeoutMs` — por eso la CLI usa el fn de bajo nivel). Uso: `pnpm ai:image --prompt "<texto>" [--out <path>] [--size 1024x1024|1536x1024|1024x1536|2048x...] [--quality low|medium|high|auto] [--background opaque|transparent] [--model gpt-image-2] [--count N] [--timeout ms] [--open]`; `--prompt-file <path>` (prompts largos); `--batch <json>` (`[{ filename, prompt }, …]`, varios). `--background transparent` cae a `gpt-image-1.5` (gpt-image-2 no soporta alpha). **Sigue siendo raster** (PNG/WebP) — para vectores reales, Higgsfield + Recraft V4.1 (abajo). Para assets repo-bound que el runtime sirve, preferir el helper `generateImage()`; la CLI es para generacion operada por agente/operador. **Direccion de arte = invocar la skill `greenhouse-ai-image-generator`** (la CLI opera el modelo; la skill aporta brief/composicion/QA).
- `GREENHOUSE_IMAGE_PROVIDER` controla el default runtime, pero cada llamada puede pasar `provider`.
- OpenAI usa `src/lib/ai/openai-image.ts` y resuelve la key solo server-side con `OPENAI_API_KEY` / `OPENAI_API_KEY_SECRET_REF`; el secreto canonico es `greenhouse-openai-api-key` en GCP Secret Manager. Nunca hardcodear `sk-*` en repo, Vercel env directo, logs, tests ni docs.
- Para PNG transparente, pedir `format: 'png'` + `background: 'transparent'`; `gpt-image-2` no soporta transparencia y el helper aplica fallback seguro a `gpt-image-1.5`, dejando `requestedModel` y `modelFallbackReason`.
- Modos OpenAI disponibles: `generateOpenAIImage()` para text-to-image, `editOpenAIImage()` para imagenes de referencia/mascara, y `runOpenAIImageTool()` para Responses API multi-turn con `image_generation`.
- **`gpt-image-*` es RASTER** (PNG/WebP/JPEG) — **NO genera SVG**. Si se necesita vector, vectorizar el raster como paso aparte (no hay helper canonico de vectorizacion hoy) o aceptar un SVG real via upload (el uploader hoy acepta PNG/JPG/WebP, no SVG).
- **Vectores para implementacion de UI vía Higgsfield CLI + Recraft V4.1 (desde 2026-06-09):** la CLI `higgsfield` (binario en `~/.local/bin`, alias `hf`, cuenta `mkt@efeoncepro.com` plan Ultra, autenticada via `higgsfield auth login`) + el MCP Higgsfield exponen **Recraft V4.1** (`job_set_type: recraft_v4_1`) con `--model_type vector` → **salida vectorial real**, justo el hueco que `gpt-image` (raster-only) deja abierto. Es la herramienta para **producir assets vectoriales de UI/marca** (iconos, logos, ilustraciones de design-system, empty states) con **paleta controlada** (`--colors`, p.ej. pinear tonos AXIS) + `--background_color`, `--aspect_ratio`, `--resolution {1k,2k}`. Comando canonico: `higgsfield generate create recraft_v4_1 --prompt "…" --model_type vector --aspect_ratio 1:1 --resolution 2k --wait`. **Caveats duros:** (1) Higgsfield es **producción de assets out-of-band** (se generan acá y se SUBEN al portal vía el uploader canonico), **NO** el path runtime — el entrypoint runtime canonico sigue siendo `src/lib/ai/image-generator.ts` (OpenAI/Imagen); NUNCA cablear Higgsfield a un flujo runtime del producto. (2) Las skills (`higgsfield-generate`, `-product-photoshoot`, `-soul-id`, `-marketplace-cards`) aportan el craft (modelo correcto por tarea, modos, art direction); usarlas. (3) Verificar el **formato del archivo entregado (SVG)** en el primer uso real antes de asumirlo. (4) Aplica el contrato visual Greenhouse igual (tokens AXIS, no inventar hex) + revisar el asset producido con las skills de diseño antes de integrarlo.
- **OpenAI requiere `OPENAI_API_KEY_SECRET_REF=greenhouse-openai-api-key` en CADA entorno** (local `.env.local`, Vercel staging/prod, workers). Sin ese ref el resolver no sabe de que secret sacar la key y todo flujo OpenAI devuelve "not configured". Runtime Rollout Completion Gate: confirmar la env var en Vercel antes de declarar operativo un flujo OpenAI en deployado.
- **Generacion de logo de organizacion con IA (TASK-999, desde 2026-06-09):** command server-only `generateOrganizationLogoDraft` (`src/lib/account-360/organization-logo-generation.ts`) → `POST /api/organizations/[id]/brand-assets/logo/generate`. Usa `gpt-image-2` fondo opaco, persiste como `organization_logo_draft` y reusa `attachOrganizationLogoAsset` (gate `organization.brand_asset` + fail-fast `is_operating_entity` ANTES de la llamada paga). **Excepcion canonizada al default de la skill** `greenhouse-ai-image-generator` ("nunca reproducir un trademark"): por decision explicita del operador, el prompt **recrea el logo real** del cliente desde el conocimiento del modelo (es aproximacion; el logo exacto va por upload/URL). NUNCA generar logos de operating-entity (Efeonce/legal). Fuente: ADR `GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md` Delta 2026-06-09.
- Fuente canonica: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

### AI providers — texto/LLM (Gemini, Anthropic, OpenAI) — desde 2026-06-05

Los providers de IA conviven en `src/lib/ai/`. **NUNCA** crear un cliente/SDK paralelo dentro de un módulo de dominio: extender el cliente canónico de `src/lib/ai/`.

- **Gemini / Vertex** (path de texto canónico): `src/lib/ai/google-genai.ts` (`getGoogleGenAIClient`, `@google/genai` vía Vertex/ADC) + `src/lib/ai/greenhouse-agent.ts`. Modelos en `src/config/nexa-models.ts` (shape de id `provider/model@version`, ej. `google/gemini-2.5-flash@default`). Lo usa Nexa + el AI Observer (`src/lib/reliability/ai/runner.ts`).
- **OpenAI** (imágenes): `src/lib/ai/openai-image.ts`, secret `greenhouse-openai-api-key` (`OPENAI_API_KEY_SECRET_REF`).
- **Anthropic / Claude** (drafting de documentos HR/legal — Workforce Contracting Studio, TASK-1019): secret canónico **`greenhouse-anthropic-api-key`** en GCP Secret Manager (project `efeonce-group`, creado 2026-06-05), ref `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key`. El cliente canónico **debe vivir en `src/lib/ai/anthropic.ts`** (lo crea TASK-1019 Slice 3, consumido por `src/lib/workforce/contracting/` detrás del flag `WORKFORCE_CONTRACTING_AI_ENABLED=false`). Modelos Anthropic se agregan al shape `anthropic/claude-*@default`. **NUNCA** hardcodear `sk-ant-*` en repo, Vercel env directo, logs, tests ni docs; resolver server-side vía `resolveSecretByRef`. NO instanciar el SDK Anthropic dentro de un módulo de dominio.

**⚠️ Reglas duras (canonical secret resolution, arch-architect verdict 2026-05-10)**:

- **NUNCA** componer `projects/{id}/secrets/{name}/versions/{ver}` inline en TS/JS. Toda resolución pasa por `resolveSecret()` / `resolveSecretByRef()` / `getCachedResolvedSecret()` en `src/lib/secrets/secret-manager.ts`. Inline composition es la causa raíz del bug class detectado en run 25634673015 (path inválido `<name>:latest/versions/latest` por doble suffix).
- **NUNCA** duplicar `normalizeSecretRef` ni `normalizeSecretRefValue` en scripts. `scripts/` puede importar directo del canónico — el archivo canónico NO tiene `import 'server-only'`, sin shim. Mirror duplicado se desincroniza inevitablemente (caso real: `scripts/pg-doctor.ts` consolidado a canónico 2026-05-10 después de detectar bug por mirror divergente).
- **SIEMPRE** soportar tres formas de `*_SECRET_REF` en consumers (el normalizador canónico las acepta):
  - `<name>` (bare, default `latest`)
  - `<name>:<version>` (shorthand Vercel display + gcloud convention)
  - `projects/.../versions/<version>` (full path)
- **PREFERIR** la forma bare `<name>` en workflows YAML committeados. La shorthand `<name>:latest` es para humanos copiando del UI Vercel/gcloud — no para configuración estática (defense-in-depth: no normalizar garbage si no hace falta).

**⚠️ Reglas duras V2 (TASK-870 — normalizer hardening + active drift detection 2026-05-12)**:

- **NUNCA** registrar un env var `*_SECRET_REF` desde shell usando `echo "valor" | vercel env add` ni equivalentes que appendean newline. Usar siempre `printf %s "<valor>" | vercel env add <NAME> production --force` para escritura atómica sin newline trailing (`--force` overwrite es atomic; rm+add tiene gap-window).
- **NUNCA** duplicar la lógica `stripEnvVarContamination` ni `SECRET_REF_SHAPE` regex en scripts/consumers. Toda higiene de env var values pasa por `normalizeSecretValue` / `normalizeSecretRefValue` en `src/lib/secrets/secret-manager.ts`. Para auditores externos, usar el predicate `isCanonicalSecretRefShape(value)` exportado del mismo módulo.
- **NUNCA** loggear el VALOR sanitizado de un `*_SECRET_REF` rechazado por shape validation (puede contener PII, tokens, leak info). Solo length + first/last char class si se requiere observability local. El reliability signal `secrets.env_ref_format_drift` reporta NOMBRES de env vars afectadas, no valores.
- **NUNCA** swallow Sentry capture en code paths donde `resolveSecretByRef` retornó null. Diferenciar:
  - `resolveSecretByRef` → null = **ref env var corrupto o secret no existe**. Degradar silente a fallback (PAT / cache / unconfigured). NO capturar a Sentry — el reliability signal `secrets.env_ref_format_drift` ya cubre detección upstream.
  - Secret resuelto pero CONTENIDO inválido (e.g. PEM sin `-----BEGIN`) = **falla real de configuración del secret content**. Throw + `captureWithDomain('<domain>', ...)` legítimo, requiere intervención humana.
- **SIEMPRE** que emerja un consumer nuevo de `resolveSecretByRef`, aplicar el patrón canónico de TASK-870: validar return value, diferenciar "ref corruption" (silent degrade) de "content corruption" (Sentry alert). Patrón fuente: `src/lib/release/github-app-token-resolver.ts` (líneas 174-195).
- **Reliability signal canónico** `secrets.env_ref_format_drift` (kind=drift, severity=error si count>0, subsystem `cloud`, steady=0). Detecta env vars `*_SECRET_REF` cuyo valor falla `isCanonicalSecretRefShape` post-strip. Cuando alerta: re-set la env var ofensora con `printf %s "<clean-value>" | vercel env add <NAME> production --force` + redeploy.
- **Bug class canonizada (2026-05-12)**: `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` quedó persistida en Vercel production como `"greenhouse-github-app-private-key\n"` (bytes hex `... 6b 65 79 5c 6e 22`). El normalizer legacy NO stripaba quotes envolventes (solo `\n`/`\r` literales + `.trim()`) → resource name resultante con quotes embebidos → GCP NOT_FOUND silencioso → `resolveGithubAppInstallationToken` lanzaba "is not valid PEM" + `captureWithDomain` cada ~3min → preflight check `sentry_critical_issues` bloqueaba production release orchestrator. Fix V2: `stripEnvVarContamination` single-source-of-truth + `SECRET_REF_SHAPE` regex en boundary + signal `secrets.env_ref_format_drift` upstream + resolver `github-app-token` diferencia ref/content corruption.

### Workforce Contracting Studio invariants (TASK-1019, foundation desde 2026-06-05)

Dominio canónico de **cartas oferta + contratos laborales** (aggregate `greenhouse_hr.workforce_contracting_cases`, hermanos `offer_letter`/`employment_contract`), bajo **HR/Workforce — NO Payroll**. Módulo: `src/lib/workforce/contracting/` (barrel pure-only: types + state-machine + jurisdiction-packs; `store`/`commands`/`ai` son server-only, importados directo — TASK-827). Foundation: sin UI runtime, sin PDF/firma/email (esos consumen EPIC-001 + tasks de viewer). Spec: `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md`.

**Bilingüe obligatorio**: toda carta oferta y contrato tiene `es-CL` + `en-US` (CHECK DB `required_languages` ⊇ {es-CL,en-US}). Para Chile, `es-CL` es la versión legal prevalente. La aprobación es sobre el **par bilingüe completo** (nunca un idioma suelto); requiere paridad estructural (mismos `sectionCode`) + sin divergencia material.

**State machine + CHECK + audit trio** (patrón TASK-700/765): `status` único con CHECK condicional por `case_kind` (offer 11 estados / contract 19); transiciones enforced en TS (`assertCaseTransition`, 2 matrices) **y** en el trigger DB `workforce_contracting_case_transition_check` (espejo exacto — mover juntos). `workforce_contracting_case_events` append-only (triggers anti-UPDATE/DELETE). Commands dual-mode (`client?: PoolClient`), atómicos, outbox v1 + audit in-tx.

**⚠️ Reglas duras**:
- **NUNCA** escribir/mutar `payroll_entries`, `compensation_versions`, `final_settlements` ni recalcular payroll/compensation desde este dominio. Valida contra la tupla `(contract_type, pay_regime, payroll_via)`, no la recalcula. Gate de cierre: `pnpm vitest run src/lib/payroll` verde.
- **NUNCA** usar `members.contract_type` como verdad única de estado laboral vigente; usar snapshots del caso o `resolveCurrentWorkClassification` (TASK-957).
- **NUNCA** dejar que Claude apruebe, genere PDF, envíe email o firme. El adapter (`ai/`) es **advisory-only** detrás del flag `WORKFORCE_CONTRACTING_AI_ENABLED` (default OFF). El cliente Claude canónico vive en `src/lib/ai/anthropic.ts` (NO instanciar el SDK en el módulo de dominio). El input packet usa **allowlist** (`ALLOWED_FACT_CODES`): nunca secrets/tokens/bank/salary-history al prompt (arch §11).
- **NUNCA** crear un vault/firma/document-manager paralelo. PDF/render/firma consumen **EPIC-001** (`TASK-489/490/491/493`); ZapSign acepta PDF **y** DOCX por upload directo (`base64_*`, NO el template feature que prohíbe imágenes/tablas). El formato firmable es la dimensión `cases.signable_format` (`pdf`|`docx`, default `pdf` Chile V1). La firma legal del representante va pre-estampada vía `@/lib/legal-signatures` (TASK-863).
- **NUNCA** aprobar `international_internal` o extranjero-en-Chile sin `legalReviewReference` (>=10 chars, fail-closed en el validator; CHECK DB; invariante TASK-894). NUNCA loggear el valor crudo.
- **NUNCA** sembrar una capability `workforce.contracting.*` sin grant en `runtime.ts` (mismo PR; guard `capability-grant-coverage.test`). Aprobación V0 = `EFEONCE_ADMIN` unilateral (no existe rol `legal`).
- **NUNCA** `Sentry.captureException` directo — usar `captureWithDomain(err, 'workforce', ...)` (dominio + moduleKey `workforce` nuevos). 3 signals steady=0: `workforce.contracting.{ai_draft_failed, validation_blocked_overdue, approved_without_pdf}`.
- **SIEMPRE** que un consumer downstream necesite "el detalle/estado de un caso", consumir los readers product-shaped (`readers.ts` + `projection.ts`), no recomputar en JSX.

### GitHub Actions workflows — pnpm + Node setup ordering

**⚠️ Reglas duras (canonical workflow setup ordering, arch-architect verdict 2026-05-10)**:

- **SIEMPRE** invocar `pnpm/action-setup@v6` ANTES que `actions/setup-node@v5` en cualquier workflow `.github/workflows/*.yml` que use ambos. Order inverso (Node antes que pnpm) hace que `setup-node@v5` falle con `Unable to locate executable file: pnpm` cuando `cache: 'pnpm'` esta activo. Detectado live 2026-05-10 con 3 fallos consecutivos del watchdog scheduled (runs 25632589166, 25634395735, 25635607342) hasta que se consolido al patron canonico.
- **NUNCA** especificar `version:` en `pnpm/action-setup@v6`. Heredamos del campo `packageManager` en `package.json` (Corepack canonical, single source of truth desde 2026-05-10). Specificar `version:` aqui re-introduce drift del que ya nos quemamos.
- **SIEMPRE** usar `cache: 'pnpm'` en `actions/setup-node@v5` para reusar el pnpm store entre runs (acelera install ~30%). Requiere que pnpm este ya en PATH (regla anterior).
- **PREFERIR** `node-version: '24'` en workflows nuevos (production deploy + CI). Node 20 esta deprecated en GH Actions runners (deprecation warning visible desde 2026 Q2; removal 2026-09-16). Workflows legacy con Node 20 que sigan corriendo OK no son urgentes pero migrar oportunamente.
- Patron canonico verbatim (replicado en `production-release.yml` Job 1, `ci.yml`, `design-contract.yml`, `playwright.yml`, `reliability-verify.yml`, `production-release-watchdog.yml`):

  ```yaml
  - name: Setup pnpm
    uses: pnpm/action-setup@v6
  - name: Setup Node 24
    uses: actions/setup-node@v5
    with:
      node-version: '24'
      cache: 'pnpm'
  - name: Install dependencies
    run: pnpm install --frozen-lockfile
  ```

- **CI gate sistemico** (TASK-855 V1.1, pendiente): `scripts/ci/workflow-pnpm-node-ordering-gate.mjs` parseara YAML de todos los workflows y validara ordering. Replica patron de `vercel-cron-async-critical-gate.mjs`. Hasta que aplique, esta regla es enforcement humano + code review.

## Key Docs

- `AGENTS.md` — reglas operativas completas, branching, deploy, coordinación, PostgreSQL access
- `DESIGN.md` — contrato visual compacto agent-facing en formato `@google/design.md`; leerlo cuando el cambio toque UI, UX, tipografía, color, spacing o selección de componentes. **CI gate activo** (TASK-764): `.github/workflows/design-contract.yml` corre `pnpm design:lint --format json` strict (errors + warnings block) en cada PR que toca DESIGN.md / V1 spec / package.json. Agregar/modificar tokens requiere actualizar también el contrato de componente que los referencia (anti-bandaid: NO namespace `palette.*`). Validar local con `pnpm design:lint` antes de commitear.
- **Design System catalog canónico — `/admin/design-system` (INTERNA, los clientes NUNCA la ven)**: esta es la home navegable de AXIS/Design System. **Claude debe agregar aquí toda nueva incorporación del Design System** (token, primitive, patrón, lab o governance) en `DesignSystemCatalogView`, con ruta real, SoT/owner y link funcional; además debe declarar la child route en `route-reachability-manifest.ts`, crear/actualizar scenario GVC cuando la surface sea visual/repetible, y enlazar la documentación correspondiente (`ui-platform/*`, ADR/doc de tokens o `project_context.md` si cambia un contrato). La paleta AXIS vive como child route `/admin/design-system/colors` (TASK-1034): renderiza los ramps AXIS live (100→900 + opacity + neutrales light/dark) desde `theme.axis.*` / `src/@core/theme/axis-tokens.ts` (SoT 1:1 con AXIS Figma, fileKey `yyMksCoijfMaIoYplXKZaR` nodo `11205:5341`). Gateada por viewCode `administracion.design_system` (routeGroup `internal`, sembrado solo a roles internos — **NUNCA `client_*`**) + redirect defensivo si `tenantType==='client'`. `DESIGN.md` sigue siendo el contrato agent-facing; los HEX se resuelven desde `theme.palette.*` / `theme.axis.*`, NUNCA inline. El `AxisWordmark` es **solo del design system** (NUNCA en UI de producto, login, emails, PDFs ni portal cliente). NUNCA agregar un viewCode nuevo a `VIEW_REGISTRY` sin la migración seed acompañante en el mismo PR (gobernanza TASK-827) ni una ruta `(dashboard)` sin hacerla alcanzable por nav (TASK-982).

### Typography System — SoT + drift-guard + escala (TASK-1036 / TASK-1038)

Mapa canónico para cualquier agente que toque texto/tipografía (espejo del patrón AXIS de color):

- **Fuente de verdad (valores):** `src/components/theme/typography-tokens.ts` — primitivos (`fontFamilies`/`fontWeights`/`fontSizes`/`letterSpacings`/`fontFeatures`) → `typographyScale` (tokens compuestos por rol) → `TYPOGRAPHY_VARIANT_BRIDGE` (contrato semántico ↔ variante MUI, **1:1 como código**) + `SECONDARY_VARIANT_TOKENS` (h6→label-md, subtitle2→body-sm) + `controlText` ramp.
- **Runtime:** `src/components/theme/mergedTheme.ts` deriva cada variante del SoT (cero `fontSize`/`fontWeight`/familia hardcodeados). Overrides de componente (Button large, Tab, DialogTitle) consumen el SoT vía el bloque `components`.
- **Drift-guard (enforcement):** `src/components/theme/typography-drift.test.ts` falla CI si `runtime ≡ SoT ≡ DESIGN.md` divergen. Cobertura (TASK-1042): runtime ≡ SoT ≡ DESIGN.md **front-matter + prosa §Typography** ≡ **V1 §15.1** — todo `Npx`/`Nrem` literal en la prosa y en la tabla V1 debe ser un tamaño vigente del SoT (derivado de los tokens activos, no de los primitivos huérfanos 15/18). Si cambiás un valor del SoT, **DEBÉS** actualizar DESIGN.md front-matter + V1 §3.2/§15.1 en el mismo PR o el guard rompe (parity 3 capas).
- **Contrato agente:** `DESIGN.md` §Typography (compacto, el que leés primero) + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 (extendido: type scale, mapa de aplicación, políticas transversales, versioning).
- **Skill invocable de tipografía (creada 2026-06-07):** para CUALQUIER decisión o auditoría de tipografía (peso, variante, contraste, interlineado, medida, numerales, optical sizing, variable fonts, OpenType, fluid type, carga de fuentes, i18n/RTL, pairing) invocar `typography-design`. Patrón dual espejo de `modern-ui`/`a11y-architect`: skill global portable `~/.claude/skills/typography-design/` (el *craft* + 5 references: weights-variants, contrast-accessibility, font-technology, rhythm-measure, i18n-typography) + overlay Greenhouse `.claude/skills/typography-design/SKILL.md` que **gana** y pinea Poppins/Geist reales, pesos {400,600,700,800} (500 won't-do TASK-1039), la escala fija, SoT/drift-guard/lint, adapters charts/PDF/email y las reglas NUNCA. Mirror Codex: `.codex/skills/greenhouse-typography-accessibility/`. **Decide el valor; `design-system-governance` lo shippea** (3-layer parity). Compone con `modern-ui`/`a11y-architect`/`dataviz-design`/`forms-ux`/`greenhouse-ux-writing`.
- **Referencia visual viva (INTERNA):** `/admin/design-system/typography/mockup` — documento canónico que renderiza el SoT en vivo (primitivas → escala → aplicaciones → bridge → propuesta → transversales → gobernanza), drift-guarded. Es el "museo"; las reglas que un agente aplica viven en DESIGN.md/V1, NO en el mockup (un agente no renderiza React para aprender reglas).
- **Escala vigente (TASK-1038 redesign aprobado 2026-06-06):** display Poppins 32/24/20; **page-title 20** (h4 — arregló la inversión: page-title ≥ section-title); **section-title 16** (h5); subheader/subtitle1 14; **label-md/button 14**; body-lg 16 / body-md 14 / body-sm·caption 13; overline 12; numeric-id 14 / numeric-amount 13 / kpi-value 28. Control: Button sm/md 14, **lg 16** · Tab 14 · Dialog title = section-title 16.
- **⚠️ Reglas duras:** NUNCA `fontSize` inline en texto (usar variante/token); NUNCA monospace (numéricos = Geist + `tabular-nums`); NUNCA editar `src/@core/theme/*` (override en mergedTheme); NUNCA token sin consumidor; SIEMPRE mover juntos SoT + mergedTheme + DESIGN.md + V1 + drift-guard.
- **Políticas transversales canonizadas (TASK-1038, con product-design + arch skills):** i18n Latin-first (es-CL/en-US/pt) + RTL-ready vía CSS logical properties, CJK diferido; tipo **fijo en producto**, `clamp()` solo marketing; **no display tier** sin consumidor real; **PDF/email = un SSOT semántico + adapter por medio** (web→variant, PDF→react-pdf, email→inline+fallback — espeja el precedente de color axisSemanticHex); truncation (1-línea ellipsis en slots fijos + valor completo / 2-líneas clamp / wrap en body·labels·errores); charts derivan del SoT; body de lectura larga ~65ch.
- **Charts derivan del SoT (TASK-1041, ✓):** los 43 charts del portal (Apex 33 + Recharts 10; **ECharts no se usa hoy**) consumen familia+tamaño del SoT **desde un solo lugar** — los wrappers `AppReactApexCharts` + `AppRecharts` (`src/libs/styles/`) gobiernan el texto SVG con CSS `!important` leyendo `theme.typography.{fontFamily,caption}` (100% cobertura, 0 bypass). Cambiar el SoT propaga a los 43 sin tocar cada chart. **NUNCA** poner `fontSize`/`fontFamily` de texto de chart inline en un chart — el wrapper lo gobierna. Para **ECharts (canvas, política de dashboards nuevos de alto impacto)** el CSS NO llega: esos charts DEBEN consumir el helper `getChartTypographyFromTheme(theme)` (`src/components/theme/chart-typography.ts`) en `option.textStyle`/`axisLabel`.
- **ApexCharts runtime boundary (ISSUE-085):** `AppReactApexCharts` es además el único owner del `dynamic(..., { ssr:false })` hacia `react-apexcharts`; consumers importan el wrapper directo, sin otro `dynamic()`, y `@/libs/ApexCharts` quedó retirado. Guardrail: `greenhouse/no-dynamic-app-react-apexcharts`.
- **Follow-ups tipografía:** (1) [abierto] rol semántico para el peso **500** — **evaluado y descartado** (TASK-1039 won't-do): a 14px 400→500 es imperceptible + el 500 ya rinde vía Vuexy/MUI → un 4º tier mete ambigüedad (beneficio marginal < claridad); (2) [abierto] adapter **PDF** Geist 600/800: `register-fonts.ts` registra por **nombre de familia** (no por peso); TASK-1040 ya sumó las familias `Geist SemiBold`(600)+`Geist ExtraBold`(800) → falta solo migrar componentes PDF a usarlas (refinamiento, el web no tiene gap); (3) [✓ TASK-1041] charts gobernados centralmente (ver arriba); (4) [✓ TASK-1038] lint rule `greenhouse/no-fontsize-inline-typography` (scopeada a `<Typography>`, warn) + rule tests en CI (`pnpm test:lint-rules`). Spec: `docs/tasks/complete/TASK-1038-typography-scale-redesign.md`.

### Efeonce brand assets (SSOT `src/config/efeonce-brand.ts`)

Hechos de marca canónicos — NO hardcodear en otro lado, importar del SSOT. Documentados también en `DESIGN.md` (sección "Brand assets — Efeonce").

- **Arquitectura de marca — Efeonce (paraguas) vs Greenhouse (plataforma)**: **EFEONCE** es la marca paraguas/institucional; **Greenhouse** es la plataforma/app de Efeonce. Los dos logos **coexisten** (no intercambiables): logo **Greenhouse** en todo lo de la **app** (navegación, dashboards, surfaces in-app); logo + eslogan **Efeonce** en lo **institucional/externo** (recibos/comprobantes, reportes, finiquitos, contratos, emails transaccionales, PDFs institucionales). Un documento institucional lleva marca **Efeonce**, no Greenhouse.
- **URL pública**: `efeoncepro.com` (`EFEONCE_URL`). Ya usada en el footer del PDF de payroll + emails transaccionales.
- **Dirección legal (fallback)**: `Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile` (`EFEONCE_LEGAL_ADDRESS_FALLBACK`). Preferir el `legalAddress` de la operating entity runtime (`getOperatingEntityIdentity()`); el constante es fallback.
- **Entidad legal (fallback)**: `Efeonce Group SpA` (`EFEONCE_LEGAL_NAME_FALLBACK`).
- **Eslogan "Empower your Growth"** — elemento de **brand-zone** (header/masthead), **NUNCA** el footer legal. Tipografía Poppins: `Empower` = ExtraBold Italic (800 italic), `your` = ExtraBold (800), `Growth` = Black Italic (900 italic). **Color canónico gris `#848484`** (= token `text-disabled`; `EFEONCE_SLOGAN_COLOR` en el SSOT, es el default de ambos componentes — override solo sobre fondo oscuro). Fuentes en `src/assets/fonts/Poppins-{ExtraBold,ExtraBoldItalic,Black,BlackItalic}.ttf` (Google Fonts v24 Latin, SIL OFL 1.1), registradas en `src/lib/finance/pdf/register-fonts.ts`. Render canónico: web `src/components/greenhouse/brand/EfeonceSlogan.tsx`, PDF `src/lib/finance/pdf/efeonce-slogan-pdf.tsx` — NUNCA re-implementar inline.
  - **Logo y eslogan son elementos SEPARADOS** — se usan solos o compuestos, **nunca fusionados en un único asset**. En un lockup (logo + eslogan): el eslogan es **subordinado** (claramente más pequeño, NO compite ni iguala el ancho del logo) y va **centrado** debajo del logo con separación mínima. El **tamaño del eslogan es contextual** (depende del tamaño del logo en esa superficie) — elige un `fontSize` que lo mantenga visiblemente menor; NO hay un pt fijo (el reporte de contractors usa ~7.5pt contra logo ~116pt como ejemplo de la **proporción**, no como regla). Detalle en `DESIGN.md` → "Slogan".
- **Footer PDF reusable**: `src/lib/finance/pdf/efeonce-pdf-footer.tsx` (`EfeoncePdfFooter`) — footer institucional canónico de **todos** los PDFs Efeonce (entidad · RUT + dirección + `efeoncepro.com` + generado/página). Lleva **solo identidad legal/contacto**; el eslogan va en la brand-zone, no acá. PDFs nuevos reusan este footer, no rollean uno propio.
- `project_context.md` — estado vigente del repo, stack, decisiones y restricciones; leer primero su sección "Estado vigente para agentes"
- `Handoff.md` — cabina de mando activa: trabajo en curso, riesgos y próximos pasos
- `Handoff.archive.md` — caja negra histórica; usar para auditoría de resoluciones sin tratar entradas antiguas como contrato vigente
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` — regla canónica para navegar `project_context.md`, `Handoff.md` y `Handoff.archive.md` sin perder auditoría ni inflar el handoff activo
- `docs/tasks/README.md` — pipeline de tareas `TASK-###` y legacy `CODEX_TASK_*`
- `docs/issues/README.md` — pipeline de incidentes operativos `ISSUE-###`
- `docs/architecture/` — specs de arquitectura canónicas (30+ documentos)
- `docs/documentation/` — documentación funcional de la plataforma en lenguaje simple, organizada por dominio (identity, finance, hr, etc.). Cada documento enlaza a su spec técnica en `docs/architecture/`
- `docs/manual-de-uso/` — manuales prácticos por dominio para usar capacidades concretas del portal paso a paso, con permisos, cuidados y troubleshooting
- `docs/audits/` — auditorías técnicas y operativas reutilizables. Úsalas frecuentemente cuando trabajes una zona auditada, pero antes de confiar en ellas verifica si sus hallazgos siguen vigentes o si el sistema requiere una auditoría nueva/refresh.
- `docs/operations/` — modelos operativos (documentación, GitHub Project, data model, repo ecosystem)
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` — politica canonica de ADRs: cuando una decision requiere ADR, donde vive, lifecycle append-only y gate para tasks.
- `docs/architecture/DECISIONS_INDEX.md` — indice maestro de decisiones arquitectonicas aceptadas; buscar aqui antes de proponer o cambiar contratos compartidos.
- Fuente canónica para higiene y rotación segura de secretos:
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Fuente canónica para trabajo multi-agente (Claude + Codex en paralelo):
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — incluye higiene de worktrees, `rebase --onto`, `force-push-with-lease`, CI como gate compartido, squash merge policy, background watcher pattern para auto-merge sin branch protection
- Regla dura de convivencia: en un checkout compartido, el WIP `untracked`/unstaged de otro agente es estado vivo. No usar `git stash -u`, `git clean`, `git restore`, moves ni pathspecs amplios para apartarlo y pasar hooks. Si bloquea tu push, coordina con el owner, usa worktree propio o pide bypass explícito ya verificado.
- Fuente canonica para calidad de solucion:
  - `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — regla anti-parche: causa raiz, primitives canonicas, resiliencia, seguridad, escalabilidad y workaround solo temporal/documentado
- Convenciones de skills locales:
  - Claude: `.claude/skills/<skill-name>/SKILL.md` (convencion oficial vigente; existen skills legacy en `skill.md` minuscula)
  - Codex: `.codex/skills/<skill-name>/SKILL.md` (mayuscula)
- Mockups Greenhouse: invocar `greenhouse-mockup-builder` para cualquier mockup/prototipo visual. Por defecto deben ser rutas reales del portal con mock data tipada (`src/app/(dashboard)/.../mockup/page.tsx` + `src/views/greenhouse/.../mockup/*`), usando Vuexy/MUI wrappers y primitives del repo; no HTML/CSS aparte salvo pedido explicito de artefacto estatico.

## Skill obligatoria: greenhouse-finance-accounting-operator

**INVOCAR SIEMPRE** la skill `greenhouse-finance-accounting-operator` (ubicada en `.claude/skills/greenhouse-finance-accounting-operator/SKILL.md` + global `~/.claude/skills/`) ANTES de:

- Tocar cualquier módulo de **finanzas** (`/finance/*`, `src/lib/finance/`, `src/app/api/finance/*`, `greenhouse_finance.*` schema): bank, cash-out, cash-in, expenses, income, suppliers, payment_orders, reconciliation, account_balances, settlement_legs, OTB declaration.
- Tocar cualquier módulo de **costos / cost intelligence** (`src/lib/commercial-cost-attribution/`, `src/lib/finance/postgres-store-intelligence.ts`, member-period attribution, client_economics, labor allocation, CCA shareholder accounts, loaded cost models, ICO economics).
- Tocar cualquier flujo **fiscal/tributario** (Chile SII, DTE, IVA débito/crédito, F22/F29, retenciones honorarios 14.5%, gastos rechazados Art 21, Capital Propio Tributario, ProPyme/14A regime, gratificación legal, indemnización años servicio).
- Tocar cualquier flujo de **payments / treasury** (cashflow forecast, working capital, FX hedging, payment rails ACH/SEPA/SWIFT/PIX, factoring, invoice discounting, internal_transfers, fx_pnl_breakdown, account_balance materialization).
- Tocar **P&L / reporting / KPIs financieros** (revenue recognition ASC 606/IFRS 15, EBITDA quality, gross margin, contribution margin, unit economics CAC/LTV, variance analysis, budget vs actual, FP&A).
- Tocar **cierre mensual / period close / reconciliation** (trial balance, accruals, deferrals, bank rec, intercompany matching, audit trail).
- Tocar **internal controls / audit / compliance** (COSO, SOX, segregation of duties, materiality ISA 320, fraud detection, going concern, Ley 20.393 MPD, UAF reporting, gobierno corporativo).
- Tocar **economic_category** (TASK-768), **expense_payments_normalized** (TASK-766), **account_balances FX** (TASK-774), **OTB cascade** (TASK-703), **payment orders bank settlement** (TASK-765), **fx_pnl_breakdown** (TASK-699), **internal_account_number** (TASK-700).

**Triggers léxicos** que disparan la invocación: "audit", "audita", "P&L", "EBITDA", "cashflow", "balance", "cierre", "conciliación", "IVA", "DTE", "factura", "boleta", "honorarios", "gratificación", "indemnización", "SII", "F22", "F29", "PPM", "retención", "gasto rechazado", "leasing", "depreciación", "amortización", "provisión", "deferred", "accrual", "revenue recognition", "5 pasos", "ASC 606", "IFRS 15", "IFRS 16", "IAS 7", "COSO", "SOX", "segregation of duties", "materiality", "going concern", "fraud triangle", "Benford", "ABC costing", "throughput", "standard costing", "absorption", "direct costing", "variance", "DSO", "DPO", "DIO", "CCC", "working capital", "13-week forecast", "hedge", "forward", "natural hedging", "factoring", "supply chain finance", "letter of credit", "cost-plus", "value-based", "retainer", "fixed-fee", "T&M", "loaded cost", "utilization rate", "realization rate", "CAC", "LTV", "payback", "unit economics", "ROIC", "ROE", "FCF", "CFO", "EBIT", "NOPAT", "WACC", "due diligence", "transfer pricing", "TP", "MPD", "PEP", "lavado activos", "cohecho", "auditor externo", "CPA", "Big-4", "qualified opinion", "adverse opinion", "going concern", "restatement", "impairment", "fair value", "mark-to-market", "MTM", "hedge effectiveness", "OCI", "comprehensive income".

**Razón**: la skill combina IFRS / US GAAP / Chile NIIF / COSO / ISA / AICPA con runtime Greenhouse (helpers canónicos, VIEWs, reliability signals). Sin invocarla: alto riesgo de violar contratos canónicos (TASK-766/768/774/703), recomendar tratamientos contables incorrectos, perder material de framework, o no escalar a CPA/auditor cuando corresponde.

**Cuándo NO invocarla**: tareas de plumbing puramente técnico sin razonamiento contable (ej. "qué endpoint usa esta vista" → `greenhouse-backend`; "ajusta este chart de Apex" → `greenhouse-ux`). Si la pregunta combina técnico + contable, invocar AMBAS.

**Sinergia con otras skills**:

- Si toca **payroll** (cálculo nómina, AFP/Salud/SIS, indemnizaciones runtime): combinar con `greenhouse-payroll-auditor`.
- Si toca **HubSpot bridge** (CCA, products, deals): combinar con `hubspot-greenhouse-bridge`.
- Si toca **PostgreSQL** queries finance: combinar con `greenhouse-postgres`.
- Si toca **Cloud Run** ops-worker (reactive consumers finance, projection refresh): combinar con `greenhouse-cron-sync-ops`.

### Architecture Docs (los más críticos)

- `DECISIONS_INDEX.md` — indice maestro de ADRs y decisiones aceptadas
- `GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro de arquitectura
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360
- `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato completo de Payroll
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PostgreSQL + BigQuery
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso (runtime/migrator/admin)
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — desacople de Notion/HubSpot
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — identidad y acceso (12/12 implementado)
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — modelo canónico de autorización: `routeGroups` + `authorizedViews` + entitlements capability-based + startup policy
- `GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo de eventos outbox
- `GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separación auth principal vs canonical identity
- `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` 🆕 — **SPEC RAÍZ del modelo económico Greenhouse** (2026-04-28). Modelo dimensional Provider × Tool × Member × Client × Period × Expense, full absorption costing, snapshots inmutables, overhead policies. Subordina parcialmente `GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` (modelo dimensional + period governance) y recontextualiza `GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` como V0. Programa de tasks: `TASK-710` (Tool Consumption Bridge), `TASK-711` (Member↔Tool UI), `TASK-712` (Tool Catalog), `TASK-713` (Period Closing). Roadmap por fases en §11.
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance: P&L engine, dual-store, outbox, allocations
- `GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` 🆕 — **modelo dimensional analítico/operativo separado de la taxonomía fiscal** (TASK-768): `economic_category` ortogonal a `expense_type`/`income_type`, clasificador automático con 10 reglas, diccionario extensible (`known_regulators` + `known_payroll_vendors`), defensa-en-profundidad de 5 capas, herramientas operativas (reclassify endpoints + manual queue + backfill), contrato downstream con TASK-178/710-713/080+/705/706. Cierra ISSUE-065
- `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — matriz canónica de monedas por dominio, FX policy, readiness contract, currency registry
- `docs/architecture/ui-platform/` — **UI Platform** (reestructurada 2026-06-07): empezar por `ui-platform/README.md` (índice + mapa "dónde vive X"). Docs temáticos vigentes: STACK, PRIMITIVES, STATE, FORMS, TABLES, MOTION, I18N, PATTERNS, GOVERNANCE + `HISTORIAL.md` (changelog cronológico). El viejo `GREENHOUSE_UI_PLATFORM_V1.md` quedó como router stub. ADR: `GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md`. Regla anti-monolito: cambio vigente → doc temático; cronología → HISTORIAL; nunca un monolito que mezcle ambos.
- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — infraestructura de webhooks inbound/outbound
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook de proyecciones reactivas + recovery
- `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` — business lines canónicas, BU comercial vs operativa, ICO by BU
- `GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, conexión centralizada, ownership model
- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person↔org: poblaciones A/B/C, grafos operativo vs estructural, assignment sync, session org context
- `GREENHOUSE_STAGING_ACCESS_V1.md` — acceso programático a Staging: SSO bypass, agent auth, `staging-request.mjs`, troubleshooting
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — API Platform (lanes ecosystem/app/event-control), Platform Health V1 contract (TASK-672) para preflight programático de agentes/MCP/Teams bot
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — Reliability Control Plane (registry de módulos, signals, severity rollup, AI Observer)

## Issue Lifecycle Protocol

Los issues documentan incidentes operativos detectados en runtime. Viven en `docs/issues/{open,resolved}/`.

### Al detectar un incidente

1. Crear `docs/issues/open/ISSUE-###-descripcion-breve.md` con la plantilla de `docs/issues/README.md`
2. Registrar en `docs/issues/README.md` tabla Open
3. Documentar: ambiente, síntoma, causa raíz, impacto, solución propuesta

### Al resolver un incidente

1. Mover archivo de `open/` a `resolved/`
2. Actualizar `docs/issues/README.md` — mover de Open a Resolved
3. Agregar fecha de resolución y verificación realizada

### Diferencia con Tasks

- **Tasks** (`TASK-###`) son trabajo planificado (features, hardening, refactors)
- **Issues** (`ISSUE-###`) son problemas encontrados en runtime (errores, fallos, degradación)
- Un issue puede generar una task si la solución requiere trabajo significativo

## Task Lifecycle Protocol

Todo agente que trabaje sobre una task del sistema debe gestionar su estado en el pipeline de tareas. Las tareas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

- **Tasks nuevas** usan `TASK-###`, nacen desde `docs/tasks/TASK_TEMPLATE.md` (plantilla copiable) y siguen el protocolo de `docs/tasks/TASK_PROCESS.md`.
- **Tasks existentes** — tanto `CODEX_TASK_*` como `TASK-###` ya creadas en el backlog — siguen vigentes con su formato original hasta su cierre.
- **Awareness de hook pre-ejecucion TASK-* para Codex**: cuando el operador menciona `TASK-###`, `[TASK-###]`, una ruta `docs/tasks/**/TASK-###-*.md` o alias slash-style de Codex como `/implement-task TASK-###`, `/implement-task ###`, `/task TASK-###` o `/task ###`, Codex debe ejecutar `pnpm codex:task-hook TASK-###` antes de implementar y aplicar el prompt que imprime. El hook Codex acepta ids numericos (`pnpm codex:task-hook 1033`). Si el operador dice `mantente en develop`, Codex usa `pnpm codex:task-hook TASK-### --develop`. Este hook es solo de Codex; no obliga automaticamente a Claude, Cursor u otros agentes. La excepcion de rama debe quedar documentada en Audit/Plan/Handoff. Codex no debe crear worktrees/folders clon por defecto; solo con pedido o aprobacion explicita del operador. Drift guard Codex: `pnpm codex:task-hook:check` valida prompt/hook/aliases/entrypoints.

### Al iniciar trabajo en una task

1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Cambiar `Lifecycle` dentro del markdown a `in-progress`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
5. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task

1. Cambiar `Lifecycle` dentro del markdown a `complete`
2. Mover el archivo de `in-progress/` a `complete/`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
5. Documentar en `Handoff.md` y `changelog.md`
6. Ejecutar el chequeo de impacto cruzado (ver abajo)

Regla dura:

- una task no está cerrada si el trabajo terminó pero el archivo sigue en `in-progress/`
- un agente no debe reportar "task completada" al usuario mientras `Lifecycle` siga en `in-progress`

### Chequeo de impacto cruzado (obligatorio al cerrar)

Después de completar implementación, escanear `docs/tasks/to-do/` buscando tasks que:

- **Referencien archivos que se modificaron** → actualizar su sección "Ya existe"
- **Declaren gaps que el trabajo acaba de cerrar** → marcar el gap como resuelto con fecha
- **Tengan supuestos que los cambios invaliden** → agregar nota delta con fecha y nuevo estado
- **Estén ahora completamente implementadas** → marcar para cierre y notificar al usuario

Regla: si una task ajena cambió de estado real (un gap se cerró, un supuesto cambió), agregar al inicio del archivo:

```markdown
## Delta YYYY-MM-DD

- [descripción del cambio] — cerrado por trabajo en [task que lo causó]
```

### Dependencias entre tasks

Cada task activa debe tener un bloque `## Dependencies & Impact` que declare:

- **Depende de:** qué tablas, schemas, o tasks deben existir antes
- **Impacta a:** qué otras tasks se verían afectadas si esta se completa
- **Archivos owned:** qué archivos son propiedad de esta task (para detectar impacto cruzado)

Cuando un agente modifica archivos listados como "owned" por otra task, debe revisar esa task y actualizar su estado si corresponde.

### Reclasificación de documentos

Si un archivo en `docs/tasks/` no es una task sino una spec de arquitectura o referencia:

- Moverlo a `docs/architecture/`
- Actualizar `docs/tasks/README.md` con nota de reclasificación
- Si tiene gaps operativos pendientes, crear una task derivada en `to-do/`

## Platform Documentation Protocol

Toda capacidad Greenhouse debe cerrar con **triple documentación obligatoria**:

- **Documentación técnica**: `docs/architecture/`, `docs/api/`, ADRs o spec técnica del dominio.
- **Documentación funcional**: `docs/documentation/<dominio>/`, explica qué hace y cómo se comporta.
- **Manual de uso / runbook**: `docs/manual-de-uso/<dominio>/`, explica cómo operarlo, configurarlo, verificarlo o diagnosticarlo paso a paso.

La proporcionalidad cambia el tamaño del documento, no la obligación. Una feature pequeña puede ser un delta corto en docs existentes; una capacidad nueva debe crear las tres capas. Si una capa no aplica todavía, documentar razón, owner y condición de retiro en task/handoff. No declarar una task `complete` si falta una capa documental requerida.

La documentación funcional de la plataforma vive en `docs/documentation/` y explica cómo funciona cada módulo en lenguaje simple (no técnico). Su índice es `docs/documentation/README.md`.

### Estructura

```
docs/documentation/
  README.md                    # Índice general + links a docs técnicos
  identity/                    # Identidad, roles, acceso, seguridad
  admin-center/                # Admin Center, governance
  finance/                     # Módulo financiero
  hr/                          # HR, nómina, permisos
  people/                      # Personas, directorio, capacidad
  agency/                      # Agencia, operaciones, delivery
  delivery/                    # Entrega, ICO, proyectos
  ai-tooling/                  # Herramientas IA, licencias
  client-portal/               # Portal cliente
```

### Cuándo crear o actualizar

- **Al completar una task** que cambie comportamiento de un módulo, actualizar o crear documentación funcional en `docs/documentation/`.
- **Al completar una task** que una persona o agente deba operar/configurar/diagnosticar, actualizar o crear manual en `docs/manual-de-uso/`.
- **Al completar una task** que cambie contratos, runtime, datos, access, API, integración o arquitectura, actualizar o crear documentación técnica en `docs/architecture/`, `docs/api/` o ADR/spec correspondiente.
- **Al cerrar un bloque de tasks** (como un hardening o una feature completa), verificar que el dominio tenga las tres capas documentales.
- **Al modificar roles, permisos, menú o acceso**, actualizar `docs/documentation/identity/sistema-identidad-roles-acceso.md`.

### Convención de nombres

- **Archivos**: `dominio-del-tema.md` en kebab-case. Usar nombre sustantivo formal, no verbos ni preguntas.
  - Correcto: `sistema-identidad-roles-acceso.md`, `motor-ico-metricas-operativas.md`
  - Incorrecto: `como-funciona-identidad.md`, `que-es-el-ico-engine.md`
- **Títulos (h1)**: Nombre del sistema o módulo + alcance. Ej: `# Motor ICO — Metricas Operativas`
- **Subcarpetas**: por dominio (`identity/`, `delivery/`, `plataforma/`, etc.)

### Formato de cada documento

Cada documento debe incluir un encabezado con metadatos:

```markdown
> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** YYYY-MM-DD por [nombre o agente]
> **Ultima actualizacion:** YYYY-MM-DD por [nombre o agente]
> **Documentacion tecnica:** [link a spec de arquitectura]
```

Contenido:

- Lenguaje simple, sin jerga técnica
- Tablas y listas para información estructurada
- Al final de cada sección, un bloque `> Detalle técnico:` con links a la spec de arquitectura y al código fuente relevante
- No duplicar contenido de `docs/architecture/` — referenciar con links relativos

### Versionamiento

- Cada documento tiene un número de versión (`1.0`, `1.1`, `2.0`)
- Incrementar versión menor (1.0 → 1.1) al agregar o corregir secciones dentro del mismo alcance
- Incrementar versión mayor (1.x → 2.0) cuando cambie la estructura o el alcance del documento
- Registrar quién actualizó y la fecha en el encabezado
- No es necesario mantener historial de cambios dentro del documento — el git log es la fuente de verdad para el historial detallado

### Diferencia con docs de arquitectura

- `docs/architecture/` → contratos técnicos para agentes y desarrolladores (schemas, APIs, decisiones de diseño)
- `docs/documentation/` → explicaciones funcionales para entender cómo funciona la plataforma (roles, flujos, reglas de negocio)

## User Manual Protocol

Los manuales de uso viven en `docs/manual-de-uso/` y explican cómo operar una capacidad concreta del portal paso a paso. Su índice es `docs/manual-de-uso/README.md`.

### Cuándo crear o actualizar

- **Al completar una implementación visible** que agregue una feature, botón, panel, workflow o módulo que el usuario debe aprender a operar, revisar `docs/manual-de-uso/`.
- Si ya existe un manual para esa capacidad, actualizarlo.
- Si no existe y el flujo tiene pasos, permisos, estados, riesgos operativos o troubleshooting, crear uno.
- Si la feature solo cambia reglas internas sin cambio visible, normalmente basta con `docs/documentation/` o `docs/architecture/`.

### Estructura

```
docs/manual-de-uso/
  README.md
  finance/
  identity/
  admin-center/
  hr/
  agency/
  plataforma/
```

### Formato mínimo

Cada manual debe incluir:

- para qué sirve
- antes de empezar
- paso a paso
- qué significan los estados o señales
- qué no hacer
- problemas comunes
- referencias técnicas

Regla: escribir para el operador del portal, no para el implementador. El manual debe permitir usar la feature sin leer código.

### Heurística de acceso para agentes

Cuando una solución toque permisos, navegación, menú, Home, tabs, guards o surfaces por rol, pensar siempre en los planos de acceso de Greenhouse al mismo tiempo:

- `routeGroups` → acceso broad a workspaces o familias de rutas
- `views` / `authorizedViews` / `view_code` → surface visible, menú, tabs, page guards y proyección de UI
- `entitlements` / `capabilities` (`module + capability + action + scope`) → autorización fina y dirección canónica hacia adelante
- `startup policy` → contrato separado para entrypoint/Home; no mezclarlo con permisos

Regla: no diseñar una task o arquitectura nueva describiendo solo `views` si también hay autorización fina, y no describir solo `capabilities` si la feature además necesita una surface visible concreta.

## Conventions

### Estructura de código

- Componentes UI compartidos: `src/components/greenhouse/*`
- Vistas por módulo: `src/views/greenhouse/*`
- Lógica de dominio: `src/lib/*` (organizada por módulo: `payroll/`, `finance/`, `people/`, `agency/`, `sync/`, etc.)
- Tipos por dominio: `src/types/*`
- **Nomenclatura de producto + navegación**: `src/config/greenhouse-nomenclature.ts` (Pulse, Spaces, Ciclos, etc.)
- **Microcopy funcional shared (locale-aware)**: `src/lib/copy/` (TASK-265). API: `import { getMicrocopy } from '@/lib/copy'`. Namespaces: `actions` (CTAs), `states` (Activo/Pendiente), `loading` (Cargando…/Guardando…), `empty` (Sin datos/Sin resultados), `months`, `aria`, `errors`, `feedback`, `time`. NO duplicar texto que ya existe en `greenhouse-nomenclature.ts`.
- **Copy reutilizable por dominio**: `src/lib/copy/<domain>.ts` (por ejemplo `agency.ts`, `finance.ts`, `payroll.ts`). Si una pantalla de dominio necesita titulos, subtitulos, CTAs, estados, empty states, tooltips, labels, aria o mensajes reutilizables, extender este archivo antes de escribir literals en JSX.

### Microcopy / UI copy — regla canónica (TASK-265)

**ANTES de escribir cualquier string visible al usuario** (label, placeholder, helperText, title, alert, snackbar, empty state, error message, status label, loading text, aria-label, tooltip, KPI title), invocar la skill de UX writing/content vigente para validar tono (es-CL tuteo) y revisar si la string ya existe en alguna de estas capas:

1. `src/lib/copy/` — microcopy funcional shared (CTAs, estados, loading, empty, etc.)
2. `src/lib/copy/<domain>.ts` — copy reusable por dominio (`GH_AGENCY`, `GH_MRR_ARR_DASHBOARD`, `GH_PAYROLL_PROJECTED_ARIA`, etc.)
3. `src/config/greenhouse-nomenclature.ts` — product nomenclature + navegación + labels institucionales

**Enforcement mecánico**: ESLint rule `greenhouse/no-untokenized-copy` (modo `warn` durante TASK-265 + sweeps TASK-407/408; promueve a `error` al cierre TASK-408). Detecta aria-labels literales, status maps inline, loading strings, empty states, y secondary props (label/placeholder/etc) en JSX. Excluidos: theme files, global-error, public/**, emails/**, finance/pdf/**.

**Decision tree**:

- ¿Es product nomenclature (Pulse, Spaces, Ciclos, Mi Greenhouse) o navegación? → `greenhouse-nomenclature.ts`
- ¿Es microcopy funcional reusada en >3 surfaces (CTAs, estados, loading, empty, aria)? → `src/lib/copy/dictionaries/es-CL/<namespace>.ts`
- ¿Es copy reutilizable de una capability o pantalla de dominio? → `src/lib/copy/<domain>.ts`
- ¿Es copy único, efímero y no reutilizable? → puede vivir cerca del componente, pero no debe duplicar shared/domain copy ni cubrir CTAs, estados, empty states, errores, loading, aria o labels reutilizables.
- ¿La pantalla viene de `/mockup/` y pasa a runtime? → extraer shell runtime fuera de `/mockup/` y migrar el copy productivo a `src/lib/copy/*` antes de conectar datos reales.

### API Routes

- HR: `/api/hr/payroll/**`, `/api/hr/core/**`
- Finance: `/api/finance/**`
- People (read-only): `/api/people/**`
- Admin Team (writes): `/api/admin/team/**`
- Admin Tenants: `/api/admin/tenants/**`
- Capabilities: `/api/capabilities/**`
- Agency: `/api/agency/**`
- AI: `/api/ai-tools/**`, `/api/ai-credits/**`
- Cron: `/api/cron/**`, `/api/finance/economic-indicators/sync`
- Agent Auth: `/api/auth/agent-session` — sesión headless para agentes/Playwright (requiere `AGENT_AUTH_SECRET`)

### Canonical API error response contract (desde 2026-05-14)

Toda respuesta de error API que cruce al cliente **debe** usar el helper canónico `canonicalErrorResponse(code, options?)` desde `src/lib/api/canonical-error-response.ts`. Reemplaza el anti-patrón `NextResponse.json({ error: 'English prose' }, { status: N })` que generaba el bug class "string inglés crudo en UI es-CL" (caso real 2026-05-14: banner "Member identity not linked" surfacing literalmente al usuario via `payload?.error || 'fallback es-CL'` pattern en `/api/my/*` consumers). Complementario a TASK-878 (session-member-identity-self-heal): TASK-878 cierra la causa raíz (sesiones internas sin memberId), este contrato cierra la causa UX (string crudo) hasta que la self-heal converja.

**Shape canónico**:

```json
{
  "error": "Tu cuenta aún no está enlazada a un colaborador. Pídele a People Ops que active tu identidad.",
  "code": "member_identity_not_linked",
  "actionable": false
}
```

- `error`: prose es-CL canónico, safe para mostrar al usuario verbatim (backward compat con consumers legacy que leen `payload.error` directo).
- `code`: stable machine identifier (snake_case) del enum cerrado `CanonicalErrorCode`. Consumers nuevos lo usan para mapear a UX específico (CTA "Contactar HR" vs "Reintentar").
- `actionable`: hint binario. `true` cuando reintentar puede resolver (timeout, network blip); `false` cuando la causa es estructural (identity no enlazada, permiso revocado, configuración faltante). UI usa este flag para hide/show del botón "Reintentar".

**Consumer-side**: helper canónico `throwIfNotOk(res, fallbackMessage)` + clase `CanonicalApiError` en `src/lib/api/parse-error-response.ts`. Reemplaza el anti-patrón `throw new Error(payload?.error || 'fallback')`.

**⚠️ Reglas duras**:

- **NUNCA** retornar `NextResponse.json({ error: 'English prose' }, { status: N })` desde un route handler. Usar `canonicalErrorResponse(code, ...)`. Para nuevos error paths, extender el enum `CanonicalErrorCode` + agregar fila a `CANONICAL_ERRORS` (single source of truth).
- **NUNCA** poner prose en inglés en `error` (campo client-facing). Toda string debe ser es-CL canónico, ideal extraído de `src/lib/copy/*` (TASK-265).
- **NUNCA** poner detalle técnico (stack trace, SQL error, internal IDs, PII) en `error`. Eso va a `captureWithDomain` en Sentry, NO al cliente. Usar `redactErrorForResponse` cuando se necesite preservar parte del error original.
- **NUNCA** en el cliente: `throw new Error(payload?.error || 'fallback')`. El `payload?.error` puede venir en inglés desde un endpoint legacy. Usar `throwIfNotOk(res, fallbackEsCl)` que parsea canonical body y fallbackea al string es-CL local cuando el shape no es canónico.
- **NUNCA** mostrar botón "Reintentar" cuando `actionable=false`. Reintentar no resuelve causas estructurales (identity no enlazada, permiso revocado) — confunde al usuario y oculta la acción real (contactar HR/admin).
- **SIEMPRE** que un consumer UI maneje errores de un endpoint que pasa por canonical helper, propagar `actionable` + `code` al render para que la UI decida CTA correcto. Patrón: `error: { message, actionable, code }` state, render condicional según `actionable`.
- **SIEMPRE** que se introduzca un nuevo bloqueador estructural (e.g. `account_suspended`, `mfa_required`), extender `CanonicalErrorCode` enum + `CANONICAL_ERRORS` map. NO usar strings ad-hoc — rompe el contrato.

**Reliability signal canónico**: `identity.workforce.unlinked_internal_user` (kind=data_quality, severity warning si 1-3 / error si >3, steady=0). Detecta usuarios internos activos sin `member_id` enlazado — son los que verán el banner `member_identity_not_linked`. Cuando alerta, escalación es vía TASK-877 (workforce external identity reconciliation) o `workforce.member.complete_intake` endpoint (TASK-872 Slice 5).

**Spec canónica**: helper en `src/lib/api/canonical-error-response.ts`; cliente parser en `src/lib/api/parse-error-response.ts`; reader del signal en `src/lib/reliability/queries/workforce-unlinked-internal-users.ts`.

### Auth en server components / layouts / pages — patrón canónico

- **NUNCA** llamar `getServerAuthSession()` directo desde un layout o page con `try/catch + redirect` ad hoc. Usar siempre los helpers canónicos de `src/lib/auth/require-server-session.ts`:
  - `requireServerSession(redirectTo = '/login')` — para layouts/pages que **requieren** sesión activa. Si no hay session, redirige; si hay, devuelve `Session` non-null.
  - `getOptionalServerSession()` — para pages que opcionalmente quieren saber si hay sesión (login, landing pública). Devuelve `Session | null`. La decisión de redirect queda al caller.
- **Razón**: ambos helpers detectan el `DYNAMIC_SERVER_USAGE` que Next.js lanza durante prerender (cuando NextAuth lee cookies/headers via SSG) y lo re-lanzan correctamente para que Next marque la ruta como dynamic — en lugar de loggearlo como `[X] getServerAuthSession failed:` que ensucia los logs de build y enmascara errores reales.
- **Combinar con `export const dynamic = 'force-dynamic'`** en cada page/layout que consuma sesión — evita que Next intente prerender la ruta en build phase.
- Patrón canónico:
  ```ts
  import { requireServerSession } from '@/lib/auth/require-server-session'

  export const dynamic = 'force-dynamic'

  const Layout = async ({ children }) => {
    const session = await requireServerSession()
    // session.user es non-null acá
    return <Providers session={session}>{children}</Providers>
  }
  ```
- API routes (`route.ts`) siguen usando `getServerAuthSession()` directo — no necesitan los wrappers porque las routes son siempre dynamic por default y el manejo de error es distinto (return 401 JSON, no redirect).

### Agent Auth (acceso headless para agentes y E2E)

Permite que agentes AI y tests E2E obtengan una sesión NextAuth válida sin login interactivo.

**Personas agente operativas:**

Usar siempre la persona agente de menor privilegio que represente el caso. `agent@greenhouse.efeonce.org` queda reservado para diagnóstico transversal, admin, permisos y smoke amplio; no debe ser el default para validar experiencias collaborator/client si existe una persona dedicada más limitada.

| Persona       | Email                                             | `user_id`                       | `tenant_type`      | Roles                                                 | Uso canónico                                                                 |
| ------------- | ------------------------------------------------- | ------------------------------- | ------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Superadmin    | `agent@greenhouse.efeonce.org`                    | `user-agent-e2e-001`            | `efeonce_internal` | `efeonce_admin` + `collaborator`                      | Admin, permisos, diagnóstico transversal, smoke amplio                       |
| Collaborator  | `agent-collaborator@greenhouse.efeonce.org`       | `user-agent-collaborator-001`   | `efeonce_internal` | `collaborator`                                       | `/my`, self-service, experiencia personal y validación sin privilegios admin |
| Client        | `agent-client@greenhouse.efeonce.org`             | `user-agent-client-001`         | `client`           | `client_executive` + `client_manager` + `client_specialist` | Portal cliente general, rutas `client`, dashboards y reporting client-facing |

Todas usan password `Gh-Agent-2026!` en modo credentials y están provisionadas por migraciones PostgreSQL:

- `20260405151705425_provision-agent-e2e-user.sql` — superadmin.
- `20260531020000000_task-954-agent-role-personas.sql` — collaborator y client.

La persona `agent-client@...` es compuesta para cobertura cliente general. No sirve para probar límites finos entre `client_executive`, `client_manager` y `client_specialist`; si una task requiere esos límites, crear personas separadas por rol antes de cerrar la validación.

**Flujo rápido:**

```bash
# 1. Con dev server corriendo en localhost:3000
curl -s -X POST http://localhost:3000/api/auth/agent-session \
  -H 'Content-Type: application/json' \
  -d '{"secret": "<AGENT_AUTH_SECRET>", "email": "agent@greenhouse.efeonce.org"}'
# → { ok, cookieName, cookieValue, userId, portalHomePath }

# 2. Playwright (genera .auth/storageState.json)
AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs

# 3. Usar una persona limitada cuando el rol importe
AGENT_AUTH_EMAIL=agent-collaborator@greenhouse.efeonce.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
AGENT_AUTH_EMAIL=agent-client@greenhouse.efeonce.org AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
```

**Variables de entorno:**

| Variable                      | Propósito                                                   | Requerida        |
| ----------------------------- | ----------------------------------------------------------- | ---------------- |
| `AGENT_AUTH_SECRET`           | Shared secret (`openssl rand -hex 32`)                      | Sí               |
| `AGENT_AUTH_EMAIL`            | Email del usuario (default: `agent@greenhouse.efeonce.org`) | Sí               |
| `AGENT_AUTH_PASSWORD`         | Password (`Gh-Agent-2026!`) — solo modo credentials         | Solo credentials |
| `AGENT_AUTH_ALLOW_PRODUCTION` | `true` para habilitar en prod (no recomendado)              | No               |

**Seguridad:**

- Sin `AGENT_AUTH_SECRET` → endpoint devuelve 404 (invisible)
- En production → 403 por defecto
- Comparación timing-safe con `crypto.timingSafeEqual`
- No crea usuarios — solo autentica emails que ya existen en PG

**Archivos clave:**

- Endpoint: `src/app/api/auth/agent-session/route.ts`
- Lookup PG-first: `getTenantAccessRecordForAgent()` en `src/lib/tenant/access.ts`
- Setup Playwright: `scripts/playwright-auth-setup.mjs`
- Spec técnica: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (sección Agent Auth)

### Playwright smoke navigation contract

- En `tests/e2e/smoke/*.spec.ts`, **NUNCA** usar `page.goto(...)` directo.
- Usar `gotoWithTransientRetries()` desde `tests/e2e/fixtures/auth.ts` para rutas que solo deben probar "no 5xx" o render/redirect tolerante.
- Usar `gotoAuthenticated()` cuando la ruta debe preservar sesion valida y fallar si cae en `/login`, `/signin`, `/auth/signin` o `/auth/access-denied`.
- No reemplazar este contrato con timeouts locales por spec. Los retries solo cubren errores transitorios de navegacion; HTTP `4xx/5xx`, redirects de auth indebidos y asserts funcionales deben fallar loud.
- Mantener verde `pnpm test scripts/lib/e2e-smoke-navigation-contract.test.ts`. Esa prueba existe para que otro agente no reintroduzca `page.goto` crudo en smoke specs.
- ADR canonico: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md#delta-2026-05-09--issue-073-follow-up-smoke-navigation-contract`.

### Staging requests programáticas (agentes y CI)

- Staging tiene **Vercel SSO Protection** activa — todo request sin bypass es redirigido a la SSO wall.
- **Comando canónico**: `pnpm staging:request <path>` — maneja bypass + auth + request en un solo paso.
- Ejemplos:
  ```bash
  pnpm staging:request /api/agency/operations
  pnpm staging:request /api/agency/operations --grep reactive
  pnpm staging:request POST /api/some/endpoint '{"key":"value"}'
  pnpm staging:request /api/agency/operations --pretty
  ```
- El script `scripts/staging-request.mjs` auto-fetch del bypass secret desde la Vercel API si no existe en `.env.local`.
- **NUNCA** hacer `curl` directo a la URL `.vercel.app` de staging sin bypass header.
- **NUNCA** crear `VERCEL_AUTOMATION_BYPASS_SECRET` manualmente en Vercel — es auto-gestionada.

### Teams Bot outbound smoke y mensajes manuales

- Greenhouse/Nexa debe enviar mensajes proactivos a Teams vía **Bot Framework Connector**. Microsoft Graph sirve para discovery/lectura, no como contrato principal de envío del bot.
- Secreto runtime: `greenhouse-teams-bot-client-credentials` en GCP Secret Manager, JSON `{ clientId, clientSecret, tenantId }`. Nunca loggear tokens ni `clientSecret`.
- OAuth: token desde `https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token` con scope `https://api.botframework.com/.default`.
- Delivery:
  - Resolver primero el `chatId`/conversation id exacto (`teams_notification_channels.recipient_chat_id`, conversation reference cache o Teams connector `_resolve_chat`).
  - Enviar `POST {serviceUrl}/v3/conversations/{encodeURIComponent(chatId)}/activities`.
  - Usar failover de service URL: `https://smba.trafficmanager.net/teams`, `/amer`, `/emea`, `/apac`.
- Para group chats con `@todos`, usar `textFormat: "xml"`, `<at>todos</at>` y mention entity con `mentioned.id = chatId`, `mentioned.name = "todos"`. El transcript puede mostrar `todos` sin arroba; si importa la notificación real, verificar en Teams.
- Para chats individuales ya instalados por usuario, **no crear 1:1 a ciegas con AAD Object ID**. Resolver el `oneOnOne` existente y postear ahí. El intento `members: [{ id: "29:<aadObjectId>" }]` puede fallar con `403 Failed to decrypt pairwise id` aunque el usuario exista.
- En 1:1 no hace falta mencionar al destinatario; Teams notifica el chat. Para smoke scripts locales con imports server-side, usar `npx tsx --require ./scripts/lib/server-only-shim.cjs ...`.
- Producto/UI: cualquier canal manual debe converger con Notification Hub / `TASK-716` (intent/outbox, preview, aprobación, idempotencia, retries, audit, delivery status y permisos `views` + `entitlements`), no con un textbox que postea directo a Teams.
- **Helper canónico ya existe para anuncios manuales vía TeamBot**:
  - comando: `pnpm teams:announce`
  - runbook: `docs/operations/manual-teams-announcements.md`
  - runtime: `src/lib/communications/manual-teams-announcements.ts`
  - destinos registrados: `src/config/manual-teams-announcements.ts`
  - guardrails: `--dry-run` primero, `--yes` para enviar, `--body-file` con párrafos separados por línea en blanco, CTA `https` obligatorio
  - para futuras peticiones del tipo "envía este mensaje por Greenhouse/TeamBot", reutilizar este helper antes de crear scripts temporales o usar el conector personal de Teams
- Chats verificados:
  - `EO Team`: `19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2`.
  - `Sky - Efeonce | Shared`: `19:bf42622ef7b44d139cd4659e8aa22e81@thread.v2`.
  - Mention real de Valentina Hoyos: `text = "<at>Valentina Hoyos</at>"`, `mentioned.id = "29:f60d5730-1aab-45ec-a435-45ffe8be6f54"`.
- Referencia de tono: el 2026-04-28 Nexa se presentó en `Sky - Efeonce | Shared` como AI Agent de Efeonce y anunció a Valentina Hoyos como `Content Lead` del Piloto Sky de mayo. Activity id: `1777411344948`. Mantener copy cálido, claro, con emojis moderados y enfoque de coordinación útil.

### Cloud Run ops-worker (crons reactivos + materialización)

- Servicio Cloud Run dedicado (`ops-worker`) en `us-east4` para crons reactivos del outbox y materialización de cost attribution.
- 3 Cloud Scheduler jobs: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`.
- Endpoint adicional: `POST /cost-attribution/materialize` — materializa `commercial_cost_attribution` + recomputa `client_economics`. Acepta `{year, month}` o vacío para bulk. Las VIEWs complejas (3 CTEs + LATERAL JOIN + exchange rates) que timeout en Vercel serverless corren aquí.
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- Si el cambio toca `src/lib/sync/`, `src/lib/operations/`, `src/lib/commercial-cost-attribution/`, o `services/ops-worker/`, verificar build del worker.
- **ESM/CJS**: servicios Cloud Run que reutilicen `src/lib/` sin NextAuth shimean `next-auth`, providers y `bcryptjs` via esbuild `--alias`. Patrón en `services/ops-worker/Dockerfile`.
- **⚠️ Worker @core boundary (canonizado live 2026-06-08, incidente ICO batch TASK-1048/1053):** los Docker builds de los 4 workers Cloud Run **EXCLUYEN `src/@core`** (la capa de tema AXIS/Vuexy) vía `.dockerignore` — los workers NO copian ni bundlean `@core`. Por eso **NUNCA importes `@core/theme/*` (ni `@menu`/`@layouts`/`@assets`) desde código `src/lib/**` que un worker bundlee** (dominio: `ico-engine`, `sync`, `finance`, `payroll`, `commercial-cost-attribution`, projections, materializers, PDF/Excel generators consumidos por projections). Con `--packages=external` el esbuild del worker externaliza el import → **silent startup crash** (`ERR_MODULE_NOT_FOUND` → container no escucha en 8080 → deploy failed). Causa raíz del incidente: `metric-registry.ts` (dominio) importó `@core/theme/axis-chart` para un mapa de color de UI.
  - **DATA de design tokens runtime-agnóstica** (hexes puros que UI + worker + PDF necesitan, ej. `axisSemanticSubValues`) vive en **`src/lib/design-tokens/*`** (literales, cero deps); `@core/theme/*` la **re-exporta** para consumidores UI. Worker/PDF importan del módulo `src/lib/design-tokens`, NUNCA de `@core`.
  - **Color/concern de UI** (mapas de color de chart, tonos de chip) vive en la **capa UI** (`src/components/**`, excluida de workers), NO en código de dominio worker-bundled. Patrón fuente: `CSC_CHART_COLORS` movido de `metric-registry` (dominio) → `src/components/greenhouse/charts/csc-chart-colors.ts` (UI).
  - **Guard defensivo:** el esbuild de los 3 workers Node tiene `--alias:@core=./src/@core` — convierte un futuro import `@core` en worker-bundled de **silent-startup-crash** a **loud-build-fail** (`Could not resolve`), detectable en CI antes del runtime. NO removerlo.
  - **Verificación local (simula Docker sin `src/@core`):** `esbuild services/<worker>/server.ts --bundle --packages=external --alias:@=./src --alias:@core=/tmp/emptydir --tsconfig=tsconfig.json` → si lista algún `Could not resolve "@core/..."`, ese import rompe el worker. Debe dar cero.
- **⚠️ Worker runtime npm deps (hermano del @core boundary, canonizado live 2026-06-09, ISSUE-090):** el runtime stage del Dockerfile de los 3 workers Node hace `pnpm install --frozen-lockfile --prod` (**SOLO `dependencies`**) y el esbuild usa `--packages=external`. Por eso **TODO paquete npm que el bundle del worker importe (desde `src/lib/**` worker-bundled o desde `server.ts`) DEBE estar en `dependencies`, NUNCA solo en `devDependencies`**. Si un paquete runtime queda en devDeps, el runtime stage no lo instala → el import externalizado no resuelve → **silent startup crash** (`ERR_MODULE_NOT_FOUND` → container no escucha 8080 → deploy failed; la revisión sana vieja sigue sirviendo). Causa raíz del incidente: `organization-brand-assets-discovery.ts` (TASK-999, importado estático por `ops-worker/server.ts` para `POST /organization-brand-assets/discover`) usa `pngjs`, que estaba en devDeps. (En Vercel "funciona" por casualidad: Next.js bundlea el paquete sin importar deps/devDeps; el worker, con `--packages=external` + `install --prod`, exige `dependencies`.) **NUNCA** dejar en `devDependencies` un paquete importado por código worker-bundled — si dudás, corré el guard. `devDependencies` es solo para paquetes que NO entran al bundle de ningún worker (tests, GVC, build tooling: `pixelmatch`, `playwright`, etc.).
  - **Guard canónico:** `pnpm worker:runtime-deps-gate` (`scripts/ci/worker-runtime-deps-gate.mjs`, wired en `ci.yml`) replica el bundle esbuild de los 3 workers, enumera los paquetes externalizados del árbol estático y **falla loud** si alguno no está en `dependencies` — convierte el silent-startup-crash en CI-fail antes del deploy. Mantener el set `SHIMMED_PACKAGES` en sync con los `--alias:*=./*-shim.js` de los Dockerfiles (next/next-auth/server-only/bcryptjs/@vercel/oidc).
  - **Fix canónico cuando el guard falla:** mover el paquete a `dependencies` (+ `pnpm install --lockfile-only` para sincronizar `pnpm-lock.yaml`; `--frozen-lockfile` lo exige), **o** hacer el import lazy/dinámico si el código no debe correr en el worker. NUNCA `--packages=bundle` el paquete a ciegas ni bypasear el guard.
- **Deploy canónico via GitHub Actions** (`.github/workflows/ops-worker-deploy.yml`): trigger automático en `push` a `develop` o `main` que toque `services/ops-worker/**`. Trigger manual: `gh workflow run ops-worker-deploy.yml --ref <branch>` o desde la UI de Actions. El workflow autentica con WIF, corre `bash services/ops-worker/deploy.sh` (mismo script idempotente que upsertea Cloud Scheduler jobs), verifica `/health` y registra el commit. Confirmar deploy con `gh run list --workflow=ops-worker-deploy.yml --limit 1` o `gh run watch <run-id>`. **Manual local (`bash services/ops-worker/deploy.sh`) solo para hotfix puntual** con `gcloud` autenticado contra `efeonce-group`; el path canónico para que el deploy quede trazable es el workflow.
- Las rutas API Vercel (`/api/cron/outbox-react`, etc.) son fallback manual, no scheduladas.
- Run tracking: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.

### Vercel cron classification + migration platform (TASK-775)

Toda decisión "dónde vive un cron" pasa por las **3 categorías canónicas** de `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`:

- **`async_critical`** — alimenta o consume pipeline async (outbox, projection, sync downstream) que QA/staging necesita. **Hosting canónico: Cloud Scheduler + ops-worker. NO Vercel cron.**
- **`prod_only`** — side effects que solo importan en producción real (compliance, GDPR cleanup, FX rates externos). Hosting Vercel cron OK.
- **`tooling`** — utilitarios para developers/QA/monitoreo (synthetic monitors, data quality probes). Hosting Vercel cron OK.

**Patrón de migración canónico** (cuando crees un cron nuevo o migres uno existente):

1. Lógica pura en `src/lib/<dominio>/<orchestrator>.ts` o `src/lib/cron-orchestrators/index.ts` — reusable desde Vercel route + Cloud Run.
2. Endpoint Cloud Run en `services/ops-worker/server.ts` via helper canónico `wrapCronHandler({ name, domain, run })` — centraliza `runId`, `captureWithDomain`, `redactErrorForResponse`, audit log, 502 sanitizado.
3. Cloud Scheduler job en `services/ops-worker/deploy.sh` con `upsert_scheduler_job` (idempotente).
4. Si era cron Vercel scheduled, eliminar entry de `vercel.json` (la route queda como fallback manual via curl + `CRON_SECRET`).
5. Sincronizar snapshot `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en **dos** lugares:
   - `src/lib/reliability/queries/cron-staging-drift.ts` (reader runtime)
   - `scripts/ci/vercel-cron-async-critical-gate.mjs` (CI gate)

**Defensas anti-regresión**:

- **Reliability signal `platform.cron.staging_drift`** (subsystem `Event Bus & Sync Infrastructure`): kind=`drift`, severity=`error` si count>0, steady=0. Lee `vercel.json`, matchea contra `ASYNC_CRITICAL_PATH_PATTERNS` (`outbox*`, `sync-*`, `*-publish`, `webhook-*`, `hubspot-*`, `entra-*`, `nubox-*`, `*-monitor`, `email-delivery-retry`, `reconciliation-auto-match`), verifica equivalente Cloud Scheduler, honra `KNOWN_NON_ASYNC_CRITICAL_PATHS` (`sync-previred` = prod_only legítimo) y override `// platform-cron-allowed: <reason>` adyacente al path en vercel.json.
- **CI gate `pnpm vercel-cron-gate`** (`.github/workflows/ci.yml` después de Lint, modo `--warn` durante TASK-775; promueve a strict tras estabilización). Falla CI si detecta async-critical sin equivalent.

**⚠️ Reglas duras**:

- **NUNCA** agregar a `vercel.json` un path que matchea pattern async-critical sin Cloud Scheduler equivalent. CI gate bloquea, reliability signal alerta. Si emerge un caso legítimo prod_only/tooling cuyo path matchea pattern, agregarlo a `KNOWN_NON_ASYNC_CRITICAL_PATHS` (en AMBOS readers) o usar override comment.
- **NUNCA** crear handler Cloud Run sin pasar por `wrapCronHandler`. Sin él, perdés runId estable, audit log consistente, captureWithDomain canónico, sanitización de error y 502 contract uniforme.
- **NUNCA** duplicar lógica de cron entre route Vercel y server.ts del ops-worker. Toda lógica vive en `src/lib/<...>/orchestrator.ts` y ambos endpoints la importan. Single source of truth.
- **NUNCA** sincronizar `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en uno solo de los dos lugares (reader + gate). Drift entre ambos = falsos positivos en CI o falsos negativos en runtime dashboard.
- **NUNCA** modificar pattern array en uno solo. Si emerge un nuevo pattern async-critical, agregarlo en AMBOS lugares con comentario justificando la categoría.
- Cuando se cree un cron nuevo, **categorizarlo PRIMERO** según las 3 categorías canónicas, luego elegir hosting. NO al revés.

**Spec canónica**: `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (categorías + decision tree + inventario).
**Helper canónico**: `services/ops-worker/cron-handler-wrapper.ts` (`wrapCronHandler`).
**Reader runtime**: `src/lib/reliability/queries/cron-staging-drift.ts`.
**CI gate**: `scripts/ci/vercel-cron-async-critical-gate.mjs`.

### Reliability dashboard hygiene — orphan archive, channel readiness, smoke lane bus, domain incidents

Cuatro patrones que evitan que el dashboard muestre falsos positivos o señales `awaiting_data` perpetuas.

#### 1. Orphan auto-archive en `projection_refresh_queue`

- `markRefreshFailed` (`src/lib/sync/refresh-queue.ts`) corre los `ENTITY_EXISTENCE_GUARDS` antes de rutear a `dead`. Si el `entity_id` no existe en su tabla canónica (e.g. `team_members.member_id`), la fila se marca `archived=TRUE` en el mismo UPDATE.
- Dashboard query filtra `WHERE COALESCE(archived, FALSE) = FALSE`. Cero ruido por test residue, deletes, snapshot drift.
- **Agregar un guard nuevo** = añadir entry al array `ENTITY_EXISTENCE_GUARDS` con `(entityType, errorMessagePattern, checkExists)`. Cheap (single PG lookup), runs solo al moment dead-routing.
- **NO borrar rows archived** — quedan para audit. Query `WHERE archived = TRUE` para ver el cleanup history.

#### 2. Channel provisioning_status en `teams_notification_channels`

- Tabla tiene `provisioning_status IN ('ready', 'pending_setup', 'configured_but_failing')`. `pending_setup` significa "config existe en PG pero secret no está en GCP Secret Manager" — sends se skipean silenciosamente, NO cuentan en el subsystem failure metric.
- Dashboard query Teams Notifications (en `get-operations-overview.ts`) filtra `NOT EXISTS` por `secret_ref` matching channels en `pending_setup`.
- **Provisionar un channel nuevo**: crear row con `provisioning_status='pending_setup'`, después subir el secret a GCP Secret Manager, después flip a `'ready'`. El dashboard nunca pinta warning durante el periodo de setup.

#### 3. Smoke lane runs vía `greenhouse_sync.smoke_lane_runs` (PG-backed)

- CI publica resultados Playwright vía `pnpm sync:smoke-lane <lane-key>` después de cada run (auto-resuelve `GITHUB_SHA`, `GITHUB_REF_NAME`, `GITHUB_RUN_ID`).
- Reader (`getFinanceSmokeLaneStatus` y similares) lee la última row por `lane_key`. Funciona desde Vercel runtime, Cloud Run, MCP — no más dependencia de filesystem local.
- **Lane keys canónicos**: `finance.web`, `delivery.web`, `identity.api`, etc. Stable, lowercase, dot-separated. Coinciden con expectations del registry.
- **Agregar nueva lane**: solo upsertear desde CI con un nuevo `lane_key`. El reader genérico se adapta sin migration.

#### 4. Sentry incident signals via `domain` tag (per-module)

- Wrapper canónico: `captureWithDomain(err, 'finance', { extra })` en `src/lib/observability/capture.ts`. Reemplaza `Sentry.captureException(err)` directo donde haya un dominio claro.
- Reader: `getCloudSentryIncidents(env, { domain: 'finance' })` filtra issues por `tags[domain]`. UN proyecto Sentry, MUCHOS tags — sin overhead de proyectos por dominio.
- Registry: cada `ReliabilityModuleDefinition` declara `incidentDomainTag` (`'finance'`, `'integrations.notion'`, etc.). `getReliabilityOverview` itera y produce un `incident` signal per module. Cierra el `expectedSignalKinds: ['incident']` gap para finance/delivery/integrations.notion sin per-domain Sentry projects.
- **Agregar un módulo nuevo**: añadir `incidentDomainTag: '<key>'` al registry + usar `captureWithDomain(err, '<key>', ...)` en code paths del módulo. Cero config Sentry-side adicional.

**⚠️ Reglas duras**:

- **NO** borrar rows de `projection_refresh_queue` por DELETE manual. Usar el orphan guard si es residue, o `requeueRefreshItem(queueId)` si es real fallo a recuperar.
- **NO** contar failed de `source_sync_runs WHERE source_system='teams_notification'` sin excluir `pending_setup` channels — re-introduce el ruido que la migration `20260426162205347` resolvió.
- **NO** leer Playwright results desde filesystem en runtime (Vercel/Cloud Run no tienen el archivo). Usar `greenhouse_sync.smoke_lane_runs`. El fallback fs queda solo para dev local.
- **NO** usar `Sentry.captureException()` directo en code paths con dominio claro — el tag `domain` no se setea y el módulo correspondiente NUNCA ve el incidente. Usar `captureWithDomain()`.

### Async observer liveness — heartbeat, no output freshness (TASK-937, desde 2026-05-26)

Cuando un proceso async produce un artefacto que también se **deduplica** (el AI Observer del RCP persiste `overview`/módulos solo si el fingerprint del snapshot cambió), su **liveness NO puede inferirse de la frescura de su output**. Una postura estable hace que el artefacto no se re-persista por días — eso es sano, no "apagado". El bug class (TASK-637/638 → TASK-937, detectado live 2026-05-26): el banner `/admin` gateaba "AI Observer no activo" sobre una observación `overview` fresca en ventana de 24h; con el portal estable el overview no se re-persistía (4 días) → banner falso, aunque el cron horario corría y Vertex respondía.

**El patrón canónico desacopla tres preguntas distintas que NO deben colapsarse en un booleano**:

| Pregunta | Fuente de verdad | NUNCA |
|---|---|---|
| ¿El proceso **corre**? | heartbeat append-only en `greenhouse_sync.source_sync_runs` | inferir de la frescura/presencia del output |
| ¿Está **sano**? | reliability signal que lee el heartbeat | medir solo "hay output reciente" |
| ¿Hay **artefacto fresco**? | el último artefacto (sin filtro de edad, con label "hace X") | esconderlo tras una ventana que se confunde con "apagado" |

**⚠️ Reglas duras**:

- **NUNCA** inferir la liveness de un observer/cron/proyección async desde la frescura de su output cuando ese output se deduplica. Liveness = heartbeat propio.
- **NUNCA** crear tabla de run-tracking nueva para un heartbeat. Reusar `source_sync_runs` con un `source_system` nuevo (precedentes: `reactive_worker`, `reliability_synthetic`, `reliability_ai_observer`). El `status` debe respetar el CHECK enum (`running|succeeded|failed|partial|cancelled`) — `skipped` NO existe; mapear "deshabilitado" a `cancelled` y "falló" a `failed`.
- **NUNCA** dejar que el heartbeat rompa el proceso principal. Va en wrapper boundary con `try/catch + warn` (non-blocking).
- **NUNCA** togglear off el `thinkingConfig:{thinkingBudget:0}` del AI Observer (`src/lib/reliability/ai/runner.ts`). `gemini-2.5-flash` corre con *thinking* ON por default y quema el `maxOutputTokens` → trunca el JSON estructurado (`unbalanced_or_truncated_json`). Con `responseSchema` (constrained decoding) + thinking apagado + budget adecuado, el JSON sale válido. Loggear `candidates[0].finishReason` para distinguir `MAX_TOKENS` (truncado por budget) de JSON malformado.
- **SIEMPRE** que un async path nuevo necesite "¿está vivo/sano?", shippear (a) heartbeat en `source_sync_runs`, (b) reliability signal que lo lee, (c) el reader del artefacto distingue `loading|empty|degraded|healthy_stable` sin colapsar en un estado ambiguo.

**Spec canónica**: `docs/tasks/complete/TASK-937-ai-observer-reliability-hardening.md`. Helpers: `src/lib/reliability/ai/ai-observer-run-tracker.ts` (heartbeat), `src/lib/reliability/queries/ai-observer-unhealthy.ts` (signal `reliability.ai_observer.unhealthy`, moduleKey `cloud`).

### Platform Health API Contract — preflight programático para agentes (TASK-672)

Contrato versionado `platform-health.v1` que un agente, MCP, Teams bot, cron de CI o cualquier app puede consultar antes de actuar. Compone Reliability Control Plane + Operations Overview + runtime checks + integration readiness + synthetic monitoring + webhook delivery + posture en una sola respuesta read-only con timeouts por fuente y degradación honesta.

- **Rutas**:
  - `GET /api/admin/platform-health` — admin lane (`requireAdminTenantContext`). Devuelve payload completo con evidencia y referencias.
  - `GET /api/platform/ecosystem/health` — lane ecosystem-facing (`runEcosystemReadRoute`). Devuelve summary redactado, sin evidence detail hasta que TASK-658 cierre el bridge `platform.health.detail`.
- **Composer**: `src/lib/platform-health/composer.ts`. Llama 7 sources en paralelo via `Promise.all` con `withSourceTimeout` per-source. Una fuente caída produce `degradedSources[]` + baja `confidence` — NUNCA un 5xx.
- **Helpers reusables NUEVOS**:
  - `src/lib/observability/redact.ts` (`redactSensitive`, `redactObjectStrings`, `redactErrorForResponse`) — strip de JWT/Bearer/GCP secret URI/DSN/email/query secret. **USAR ESTE helper** antes de persistir o devolver cualquier `last_error` o response body que cruce un boundary externo. NUNCA loggear `error.stack` directo.
  - `src/lib/platform-health/with-source-timeout.ts` — wrapper canónico `(produce, { source, timeoutMs }) → SourceResult<T>`. Reutilizable por TASK-657 (degraded modes) y cualquier otro reader que necesite timeout + fallback estructurado.
  - `src/lib/platform-health/safe-modes.ts` — deriva booleans `readSafe/writeSafe/deploySafe/backfillSafe/notifySafe/agentAutomationSafe`. Conservador: en duda → `false`.
  - `src/lib/platform-health/recommended-checks.ts` — catálogo declarativo de runbooks accionables filtrados por trigger.
  - `src/lib/platform-health/cache.ts` — TTL 30s in-process per audience.
- **Cómo lo usa un agente**: consultar `safeModes` + respetar las banderas tal cual vienen. Si `agentAutomationSafe=false`, escalar a humano. NO interpretar `degraded` como `healthy`.

**⚠️ Reglas duras**:

- **NO** crear endpoints paralelos de health en otros módulos. Si un nuevo módulo necesita exponer su salud, registrarlo en `RELIABILITY_REGISTRY` (con `incidentDomainTag` si tiene incidents Sentry) y el composer lo recoge automáticamente.
- **NO** exponer payload sin pasar por `redactSensitive` cuando contiene strings de error o de fuente externa.
- **NO** computar safe modes ni rollup en el cliente. Consumir las banderas tal como vienen del contrato.
- **NO** cachear el payload más de 30s del lado del cliente. El composer ya cachea in-process.
- **NO** depender de campos no documentados. Solo `contractVersion: "platform-health.v1"` garantiza shape estable.
- Tests: `pnpm test src/lib/platform-health src/lib/observability/redact` (47 tests cubren composer, safe-modes, redaction, with-source-timeout, recommended-checks).
- Spec: `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health), doc funcional `docs/documentation/plataforma/platform-health-api.md`, OpenAPI `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` (schema `PlatformHealthV1`).

### Notion sync / integrations — invariantes (registry de tokens, teamspace linking, data_sources, sync canónico, task status vocab, delivery PG projection)

Los invariantes operativos de Notion sync — registry token↔servicio↔scope (4 integraciones + demo + per-cliente + knowledge), teamspace linking (token POR teamspace = scope), data_sources endpoint canónico (extractor notion-bq-sync, Notion-Version 2026-03-11), sync canónico Cloud Run + Cloud Scheduler (2 pasos), canonical task status vocabulary V1, delivery PG projection (intArg/arrayArg + per-row resilience) — viven en **`docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` → §`Invariantes operativos para agentes — Notion sync/integrations`**. **Invocar la skill `notion-platform` al tocar Notion API/webhooks/sync/writeback.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** conectar BigQuery Sync ni Greenhouse PRD al teamspace `Demo Greenhouse` (integración dedicada demo). **NUNCA** reusar un token Notion entre scopes (el token ES el scope; cada cliente = su integración scoped + secret `notion-integration-token-greenhouse-<slug>`). **NUNCA** reintroducir `/v1/databases/{id}/query` ni Notion-Version `2022-06-28` en el extractor (data_sources + 2026-03-11). **NUNCA** mover el step PG dentro del path no-skip del sync (el step PG es UNCONDICIONAL). **NUNCA** inyectar sentinels en `*_name` ni hardcodear un literal de status (usar `task-status-canonical`). **NUNCA** INSERT INTEGER/ARRAY-NOT-NULL sin `intArg`/`arrayArg`.

### HubSpot bridge / services intake — invariantes (TASK-574, 813, 836; companies TASK-706 + sample-sprint TASK-837 en el companion de integraciones)

Los invariantes operativos del bridge HubSpot — Cloud Run hubspot-greenhouse-integration (write bridge + webhooks), inbound webhook p_services (0-162) auto-sync, service pipeline lifecycle stage sync, webhook events dual-format — viven en **`docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` → §`Invariantes operativos para agentes — HubSpot bridge/intake`** (+ `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` para el Cloud Run). El inbound companies+contacts (TASK-706) y el sample sprint outbound (TASK-837) viven en el companion `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (ver el pointer "Integraciones/infra cross-runtime" abajo). **Invocar la skill `hubspot-greenhouse-bridge` al tocar rutas del bridge, webhooks HubSpot o secretos.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** sincronizar Greenhouse → HubSpot `0-162` (solo back-fill de `ef_*`). **NUNCA** matchear services por nombre ni borrar las filas legacy (solo archivar). **NUNCA** hardcodear `pipeline_stage=active`/`status=active` en UPSERT desde HubSpot (mapper canónico). **NUNCA** filtrar events con `subscriptionType.startsWith(...)` solo (usar `classifyHubSpotEvent` — dual-format legacy + 2025.2). **NUNCA** `Sentry.captureException` directo (usar `captureWithDomain(err,integrations.hubspot|commercial,...)`).

### Integraciones/infra cross-runtime — invariantes (signature TASK-490/491, sample-sprint TASK-837, observability TASK-844, postgres-pooling TASK-846, HubSpot companies TASK-706)

Los invariantes operativos de signature platform (provider-neutral + ZapSign), sample sprint outbound projection (deal-bound), cross-runtime observability (Sentry init en los 5 runtimes), PostgreSQL connection management (pooling per-runtime) y HubSpot inbound companies+contacts auto-sync viven en **`docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`** (verbatim; contrato por sub-área en `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` + las task-specs TASK-490/491/837/844).

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** llamar la API de ZapSign directo (usar el adapter/port) ni recrear una ruta webhook one-off (bus canónico). **NUNCA** ejecutar POST/PATCH a HubSpot inline en un route handler Vercel para Sample Sprints (outbox event + reactive consumer). **NUNCA** importar `@sentry/nextjs` en `src/lib/**` (usar `captureWithDomain`); todo Cloud Run Node service llama `initSentryForService(name)` (lint). **NUNCA** crear `Pool` de pg-node fuera de `src/lib/postgres/client.ts` (lint `no-direct-pg-pool`); Vercel max=3, Cloud Run max=15. **NUNCA** llamar `syncHubSpotCompanyById` desde el webhook handler (path async via outbox).

### PostgreSQL Access

- **Script automatizado `pg-connect.sh`** — resuelve ADC, levanta Cloud SQL Proxy, conecta con el usuario correcto y ejecuta la operación solicitada. **Usar esto primero antes de intentar conectar manualmente.**
  ```bash
  pnpm pg:connect              # Verificar ADC + levantar proxy + test conexión
  pnpm pg:connect:migrate      # Lo anterior + ejecutar migraciones pendientes
  pnpm pg:connect:status       # Lo anterior + mostrar estado de migraciones
  pnpm pg:connect:shell        # Lo anterior + abrir shell SQL interactivo
  ```
  El script selecciona automáticamente el usuario correcto: `ops` para connect/migrate/status, `admin` para shell.
- **Método preferido (runtime en todos los entornos)**: Cloud SQL Connector vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`. Conecta sin TCP directo — negocia túnel seguro por la Cloud SQL Admin API. Funciona en Vercel (WIF + OIDC), local, y agentes AI.
- **La IP pública de Cloud SQL NO es accesible por TCP directo** — no hay authorized networks configuradas. Intentar conectar a `34.86.135.144` da `ETIMEDOUT`.
- **Migraciones y binarios standalone** (`pnpm migrate:up`, `pg_dump`, `psql`): requieren Cloud SQL Auth Proxy como túnel local. Usar `pnpm pg:connect` para levantarlo automáticamente, o manualmente:
  ```bash
  cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
  # .env.local: GREENHOUSE_POSTGRES_HOST="127.0.0.1", PORT="15432", SSL="false"
  ```
- **Guardia fail-fast**: `scripts/migrate.ts` aborta inmediatamente si `GREENHOUSE_POSTGRES_HOST` apunta a una IP pública. No esperar timeout.
- **Regla de prioridad** (runtime): si `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida, el Connector toma prioridad sobre `GREENHOUSE_POSTGRES_HOST`. Ver `src/lib/postgres/client.ts:133`.
- **Perfiles**: `runtime` (DML), `migrator` (DDL), `admin` (bootstrap), `ops` (canonical owner)
- **Canonical owner**: `greenhouse_ops` es dueño de todos los objetos (122 tablas, 11 schemas)
- Health check: `pnpm pg:doctor`

### Database Connection

- **Archivo centralizado**: `src/lib/db.ts` — único punto de entrada para toda conexión PostgreSQL
- **Import `query`** para raw SQL, **`getDb()`** para Kysely tipado, **`withTransaction`** para transacciones
- **NUNCA** crear `new Pool()` fuera de `src/lib/postgres/client.ts`
- Módulos existentes usando `runGreenhousePostgresQuery` de `@/lib/postgres/client` están OK
- Módulos nuevos deben usar Kysely (`getDb()`) para type safety
- Tipos generados: `src/types/db.d.ts` (140 tablas, generado por `kysely-codegen`)

### Database Migrations

- **Framework**: `node-pg-migrate` — SQL-first, versionado en `migrations/`
- **Comandos**: `pnpm migrate:create <nombre>`, `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:status`
- **Flujo obligatorio**: `migrate:create` → editar SQL → `migrate:up` (auto-regenera tipos) → commit todo junto
- **Regla**: migración ANTES del deploy, siempre. Columnas nullable primero, constraints después.
- **Timestamps**: SIEMPRE usar `pnpm migrate:create` para generar archivos. NUNCA renombrar timestamps manualmente ni crear archivos a mano — `node-pg-migrate` rechaza migraciones con timestamp anterior a la última aplicada.
- **Spec completa**: `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

### Finance — invariantes reconciliación/CLP/FX/economic-category (TASK-571, 699, 766, 768, 771, 772, 774, 776, 871, 929, 934)

Los invariantes operativos de Finance reconciliación/ledger/FX — reconciliación `income.amount_paid` (factoring+withholdings), ledger drift detection (superseded exclusion + honest degradation), unanchored paid expense acknowledgment, FX P&L canónico tesorería, CLP currency reader, account balances FX consistency, rolling rematerialize anchor contract, account drawer temporal modes, economic category dimension, reactive projections (no sync inline a BQ), expense display contract — viven en **`docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` → §`Invariantes operativos para agentes — Finance reconciliación/CLP/FX/economic-category`**. **INVOCAR la skill MANDATORIA `greenhouse-finance-accounting-operator` ANTES de tocar `src/lib/finance/**` o flujos ledger/fiscal/tesorería.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** computar drift de settlement como `amount_paid - SUM(income_payments)` solo (ignora factoring+withholdings; usar la VIEW `income_settlement_reconciliation`/helper). **NUNCA** `SUM(ep.amount * exchange_rate_to_clp)` ni leer `expense_payments`/`income_payments` directo para KPIs CLP (lint `greenhouse/no-untokenized-fx-math`; usar las VIEWs `*_normalized`). **NUNCA** filtrar/agrupar por `expense_type`/`income_type` en consumers analíticos (usar `economic_category`; lint `no-untokenized-expense-type-for-analytics`). **NUNCA** MERGE/UPDATE/INSERT BigQuery dentro de un route handler (projection reactiva via outbox). **NUNCA** rematerializar `account_balances` con seed que tenga movements ese día ni `balance_date < genesis` del OTB.

### Outbox publisher canónico — Cloud Scheduler, no Vercel (TASK-773)

El **outbox publisher** mueve eventos de `greenhouse_sync.outbox_events` (Postgres) a `greenhouse_raw.postgres_outbox_events` (BigQuery) y los marca como `status='published'`. El **reactive consumer** (que materializa projections downstream — account_balance, provider_bq_sync, etc.) filtra `WHERE status='published'`. Si el publisher está caído o un batch persiste fallando, NINGUNA projection corre, NINGUN account_balance se rematerializa, NINGUN downstream side effect ocurre.

**El publisher canónico vive en Cloud Scheduler + ops-worker, NO en Vercel cron**:

- `Cloud Scheduler ops-outbox-publish` (cron `*/2 min`) → `POST /outbox/publish-batch` en ops-worker.
- Helper canónico: `publishPendingOutboxEvents` ([src/lib/sync/outbox-consumer.ts](../src/lib/sync/outbox-consumer.ts)) con state machine atómica.
- Endpoint: `services/ops-worker/server.ts:handleOutboxPublishBatch`.

**Por qué Cloud Scheduler y no Vercel cron**: Vercel solo ejecuta crons en deploys de **Production**. Staging custom environment **no los corre**. Eso significa que **cualquier flow async que dependa del outbox queda invisible en staging** (root cause del incidente Figma 2026-05-03 cuando el pago no rebajaba TC). Cloud Scheduler corre por proyecto GCP, igual en staging y prod, sin distinción.

**State machine canónica**:

```text
                 ┌──────────────┐
                 │   pending    │  (writer INSERT default)
                 └──────┬───────┘
                        │ SELECT FOR UPDATE SKIP LOCKED
                        ▼
                 ┌──────────────┐
                 │  publishing  │  (worker tomó el lock)
                 └──┬───────┬───┘
            BQ OK   │       │   BQ FAIL
                    ▼       ▼
            ┌───────────┐  ┌─────────┐
            │ published │  │ failed  │  (retries++)
            └───────────┘  └────┬────┘
                                │ retries >= OUTBOX_MAX_PUBLISH_ATTEMPTS (5)
                                ▼
                          ┌─────────────┐
                          │ dead_letter │  (humano interviene)
                          └─────────────┘
```

**Reliability signals canónicos** (visibles en `/admin/operations`):

- `sync.outbox.unpublished_lag` — events `pending`/`failed` con edad > 10 min. Steady=0. Si > 0, publisher caído o falla persistente.
- `sync.outbox.dead_letter` — events agotaron retries. Steady=0. Cualquier > 0 requiere humano: replay manual o investigación root cause.

**⚠️ Reglas duras**:

- **NUNCA** agregar nuevos crons de outbox/event-bus/projection-refresh a `vercel.json`. Solo se permiten crons Vercel para tareas que pueden correr únicamente en producción (e.g. backfill nocturno, scheduled report). Los crons del path async crítico van a `services/ops-worker/deploy.sh`.
- **NUNCA** modificar la state machine sin actualizar la CHECK constraint `outbox_events_status_check` + comentario en CLAUDE.md.
- **NUNCA** filtrar eventos por `WHERE status='pending'` en consumers downstream. El reactive consumer canónico filtra `'published'`. Si necesitas un consumer que toque pending (e.g. UI de troubleshooting), declara explícitamente el contract.
- **NUNCA** catch + swallow errores del helper `publishPendingOutboxEvents`. La state machine atómica se basa en que la tx PG complete o aborte limpio.

**Spec canónica**: `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md`. Patrón replicable: cuando emerja otro Vercel cron infrastructure-critical (TASK-258 sync-conformed pipeline, TASK-259 entra-profile-sync), seguir el mismo template (helper canónico → endpoint ops-worker → Cloud Scheduler job → reliability signal).

### Production Release Control Plane — invariantes (TASK-848…854, 871)

Los invariantes del control plane de promoción develop→main — release manifest + state machine append-only, preflight CLI (12 checks), orchestrator workflow + worker `workflow_call` contract, watchdog (3 síntomas + alerts), Azure infra gating, observability signals + dashboard `/admin/releases`, y el operational playbook (Vercel BUILDING timing, doble env gate, bypass-preflight) — viven en **`docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` → §"Invariantes operativos para agentes (TASK-848…871)"** + runbook `docs/operations/runbooks/production-release.md`. **Antes de CUALQUIER promoción, preflight, approval, rollback, watchdog/drift recovery o cambio del control plane, invocar la skill MANDATORIA `greenhouse-production-release`** (`.claude/skills/greenhouse-production-release/SKILL.md`), que carga estos invariantes.

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** revertir el `cancel-in-progress` dinámico de los 3 worker workflows production a `false` literal (reintroduce el deadlock determinista del incidente 2026-04-26→05-09). **NUNCA** disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race). **NUNCA** reintroducir `push:main` como production deploy automático de los workers Cloud Run. **NUNCA** transicionar `state` fuera de la matriz canónica ni hacer UPDATE/DELETE de `release_manifests`/`release_state_transitions` (append-only). **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` (`src/lib/release/workflow-allowlist.ts`) ANTES del primer deploy.

### Finance write-path E2E gate (TASK-773 Slice 6)

Cualquier task que toque handlers `POST/PUT/PATCH/DELETE` en `src/app/api/finance/**/route.ts` **debe verificar el flow end-to-end downstream**, no solo el contract API. Bug class detectada 2026-05-03: el endpoint Figma respondía 200 OK pero el TC Santander no rebajaba — porque el contract API funcionaba pero el side effect downstream (outbox → BQ → reactive → account_balance) calló silencioso.

**Gate**: `pnpm finance:e2e-gate` (warn) o `pnpm finance:e2e-gate --strict` (error).

**Evidencia válida** (cualquiera):

1. Algún commit del branch tiene `[downstream-verified: <flow-name>]` en el message body.
2. Algún archivo `tests/e2e/smoke/finance-*.spec.ts` fue creado o modificado en el branch.
3. El cambio NO modifica handlers POST/PUT/PATCH/DELETE (typo, comments, formatting). El gate detecta esto y skipea.

**Flujos críticos canónicos** (verificar end-to-end ANTES de cerrar):

| Flow | Action | Downstream verification |
|---|---|---|
| Crear supplier | POST `/api/finance/suppliers` | Aparece en `/admin/payment-instruments` directory + NO 500 |
| Crear expense | POST `/api/finance/expenses` | Aparece en `/finance/expenses` con sortDate correcto + supplierDisplayName |
| Registrar pago | POST `/api/finance/expenses/[id]/payments` | expense.status=paid + **account_balance refleja cargo** + cash-out drawer ya no muestra el doc |
| Anular payment | DELETE `/api/finance/expenses/[id]/payments/[paymentId]` | balance vuelve atrás |
| Conciliar período | POST `/api/finance/reconciliation/[periodId]/match` | Reconciliación completa + signals reliability OK |

**Verificación recomendada con Playwright + Chromium + agent auth**:

```bash
# Setup once (genera .auth/storageState.json)
AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs

# E2E del flow específico (browser real con sesión NextAuth válida)
pnpm playwright test tests/e2e/smoke/finance-cash-out.spec.ts --project=chromium
```

**⚠️ Regla**: cuando cierres una task que toque write paths finance, agregá `[downstream-verified: <flow>]` al último commit y describí qué verificaste. Patrón:

```text
feat(finance): TASK-XXX Slice 5 — registro pago atómico

[downstream-verified: cash-out-payment]
- POST /api/finance/expenses/[id]/payments → 201 OK
- account_balances rematerializa < 5 min via /admin/operations
- /finance/bank muestra cargo en TC Santander
- /finance/cash-out drawer ya no muestra el documento
```

**Spec canónica**: `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` (Slice 6).

### Database — Migration markers (anti pre-up-marker bug)

Toda migration `.sql` en `migrations/` DEBE comenzar con el marker `-- Up Migration` exacto. `node-pg-migrate` parsea el archivo buscando ese marker para identificar la sección Up; si falta, la sección queda vacía y la migración se registra como aplicada en `pgmigrations` SIN ejecutar el SQL real (silent failure detectado en TASK-768 Slice 1, repetido por TASK-404 → ISSUE-068 con 3 governance tables nunca creadas).

**Estructura canónica de toda migration**:

```sql
-- Up Migration

-- 1. DDL: CREATE TABLE / ALTER TABLE / CREATE INDEX / CREATE FUNCTION
CREATE TABLE IF NOT EXISTS schema.table (...);
CREATE UNIQUE INDEX IF NOT EXISTS table_unique_idx ON ...;

-- 2. Anti pre-up-marker bug guard: bloque DO con RAISE EXCEPTION que aborta
--    si la tabla/columna/constraint NO quedó realmente creada.
DO $$
DECLARE expected_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'schema' AND table_name = 'table'
  ) INTO expected_exists;

  IF NOT expected_exists THEN
    RAISE EXCEPTION 'TASK-XXX anti pre-up-marker check: schema.table was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- 3. GRANTs (read/write a runtime, ownership a ops)
GRANT SELECT, INSERT, UPDATE, DELETE ON schema.table TO greenhouse_runtime;

-- Down Migration

-- SOLO statements de undo (DROP / ALTER ... DROP). NUNCA CREATE TABLE aquí.
DROP TABLE IF EXISTS schema.table;
```

**Reglas duras**:

- **NUNCA** poner `CREATE TABLE` / `ALTER TABLE ADD COLUMN` / `CREATE INDEX` / `CREATE FUNCTION` debajo de `-- Down Migration`. Ese marker es **solo para undo** (DROP / ALTER ... DROP). Si te encuentras escribiendo CREATE en Down, tienes los markers invertidos — STOP y mover a Up. Es exactamente la clase de bug que parió ISSUE-068 (TASK-404 governance tables nunca creadas).
- **NUNCA** sobrescribir un archivo de migration sin preservar la línea `-- Up Migration` al inicio.
- **NUNCA** editar una migration ya aplicada (registrada en `pgmigrations`). Si la migration tiene bug, **forward fix con migration nueva idempotente** (`IF NOT EXISTS` + bloque DO de verificación). Editar la legacy rompe environments fresh.
- **NUNCA** asumir que `pnpm migrate:up` ejecutó SQL solo porque retornó "Migrations complete!" — verifica con `pnpm pg:connect:shell` o un script `node` con `pg` que los objetos esperados (tablas, columnas, constraints) existen, o agrega bloque DO con RAISE EXCEPTION en la propia migration.
- **SIEMPRE** usa `pnpm migrate:create <slug>` para generar el archivo (incluye los markers correctos).
- **SIEMPRE** después de `pnpm migrate:up`, valida con SELECT contra `information_schema.columns` / `pg_constraint` / `pg_indexes` que el DDL fue aplicado, O incluye un bloque DO con RAISE EXCEPTION en la propia migration que aborta si los objetos esperados no existen post-apply.
- **SIEMPRE** que migrations creen tablas críticas para runtime, escribir bloque DO de verificación post-DDL en la misma migration. Pattern fuente: `migrations/20260508104217939_task-611-capabilities-registry.sql` y `migrations/20260507183122498_task-810-engagement-anti-zombie-trigger.sql`.
- Si la down migration es destructiva, separar con marker `-- Down Migration` exacto. Sin él, el rollback no opera. Y sus statements son SOLO DROP / undo, NUNCA CREATE.

**Defense in depth (CI gate, en construcción — Fase 2 de ISSUE-068)**: `scripts/ci/migration-marker-gate.mjs` detectará automáticamente migrations con sección Up vacía + sección Down con DDL keywords. Modo blocking en PRs. Hasta que aplique, la regla anterior es enforcement humano + code review.

### SQL embebido — type alignment + live testing (ISSUE-071, 2026-05-08)

Cualquier query SQL embebido en TS que use **uniones de tipos** (COALESCE de subqueries, CASE WHEN, NULL coalescing entre tipos heterogéneos) debe **ejercitarse contra PG real ANTES de mergear**, no solo via mocks Vitest.

**Bug class** (ISSUE-071): el CTE `subject_admin` del relationship resolver de TASK-611 hacía `SELECT 1 AS is_admin` (integer) pero el `COALESCE((SELECT is_admin FROM subject_admin), FALSE)` combinaba con boolean. PG rechaza con `COALESCE types integer and boolean cannot be matched`. El catch silencioso convertía el throw a `degradedMode=true` y el banner "Workspace en modo degradado" se mostraba al usuario. Bug latente desde el merge de TASK-611, descubierto solo cuando un usuario real ejerció el path post TASK-613 V1.1.

**⚠️ Reglas duras**:

- **NUNCA** mergear queries con CTEs + COALESCE/CASE/NULL handling sin un live test contra PG (vía `pg:connect` proxy + `pnpm tsx`, o `*.live.test.ts`).
- **NUNCA** confiar SOLO en unit tests con mocks para validar type alignment SQL. Los mocks ejercitan la lógica TS, NO el SQL crudo.
- **SIEMPRE** que `COALESCE((SELECT ... FROM cte), default)`, verificar que el tipo del SELECT del CTE matchee el tipo del `default`. PG hace casting implícito entre tipos numéricos (INT → NUMERIC) pero NO entre INT y BOOL ni entre TEXT y NUMERIC.
- **SIEMPRE** que un read path tenga catch + degraded mode honesto (correcto desde safety perspective), confirmar que `captureWithDomain` está emitiendo a Sentry — sino el bug class queda completamente oculto al equipo y aparece solo cuando un usuario real reporta el síntoma.

**Defense-in-depth recomendado**: cuando una query nueva emerja, agregar un script temporal `scripts/<dominio>/_sanity-<query-name>.ts` (gitignored o committed según necesidad) que la ejecute contra el proxy local con datos reales. Después del primer ejercicio exitoso el script es opcional pero útil como debugging aid futuro.

**Spec canónica**: `docs/issues/resolved/ISSUE-071-workspace-relationship-resolver-coalesce-type-mismatch.md`.

### Finance — invariantes ledger/bank/payments (TASK-700, 701, 703b, 709, 720, 721, 722, 765)

Los invariantes operativos de Finance ledger/bank — internal account number allocator, payment order ↔ bank settlement (atómico), payment provider catalog + category rules, bank ↔ reconciliation synergy, evidence canonical uploader, bank KPI aggregation policy-driven, OTB cascade-supersede + sign convention, labor allocation consolidada (anti double-counting) — viven en **`docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` → §`Invariantes operativos para agentes — Finance ledger/bank/payments`** (+ las specs de cada TASK). **INVOCAR la skill MANDATORIA `greenhouse-finance-accounting-operator` ANTES de tocar `src/lib/finance/**`, `greenhouse_finance.*` o cualquier flujo ledger/costos/fiscal/tesorería/P&L.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** componer un internal account number a mano (usar `allocateAccountNumber`). **NUNCA** marcar `payment_orders.state=paid` con `source_account_id IS NULL` ni dejar el downstream incompleto (el path atómico `markPaymentOrderPaidAtomic` rebaja el banco o hace rollback completo). **NUNCA** `DELETE` manual para "limpiar" un chain ni computar drift/saldos sin aplicar el filtro de supersede (`superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL`). **NUNCA** sumar saldos de cuentas para KPIs inline (usar `aggregateBankKpis`). **NUNCA** subir evidencia de conciliación como text libre (uploader canónico de assets).

### Tests y validación

- Tests unitarios: Vitest + Testing Library + jsdom
- Helper de render para tests: `src/test/render.tsx`
- Validar con: `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit`

### Charts — política canónica (decisión 2026-04-26 — prioridad: impacto visual)

**Stack visual de Greenhouse prioriza wow factor y enganche** sobre bundle/a11y. Los dashboards (MRR/ARR, Finance Intelligence, Pulse, ICO, Portfolio Health) son la cara del portal a stakeholders y clientes Globe — la apuesta es visual primero.

- **Vistas nuevas con dashboards de alto impacto** (MRR/ARR, Finance, ICO, Pulse, Portfolio, Quality Signals, executive views): usar **Apache ECharts** vía `echarts-for-react`. Animaciones cinemáticas, tooltips multi-series ricos, gradientes premium, geo/sankey/sunburst/heatmap si se necesitan en el futuro. Lazy-load por ruta para mitigar bundle (~250-400 KB).
- **Vistas existentes con ApexCharts** (32 archivos al 2026-04-26): siguen activas sin deadline. ApexCharts se mantiene como segundo tier oficial — no es deuda técnica, es un stack válido vigente. Migración Apex → ECharts es oportunista, solo si la vista se toca y se busca subir el tier visual.
- **NO usar Recharts** como default para vistas nuevas. Recharts gana en bundle/ecosystem pero pierde en wow factor sin una capa custom de polish (que no existe). Reservar Recharts solo para sparklines compactos en KPI cards o cuando explícitamente no se necesita impacto visual.
- **Excepción única**: si necesitas un tipo de chart que ECharts no cubre o querés control absoluto Stripe-level, usar Visx (requiere construcción custom).
- **Por qué este orden** (ECharts > Apex > Recharts):
  - ECharts gana en visual atractivo (10/10), enganche (10/10), cobertura de tipos (heatmap, sankey, geo, calendar).
  - Apex ya cubre el portal con visual decente (8/10) y no urge migrar.
  - Recharts es 7/10 visual sin inversión adicional — solo gana si construimos `GhChart` premium encima, lo cual es trabajo no priorizado.
- Spec completa y trigger conditions: `docs/tasks/to-do/TASK-518-apexcharts-deprecation.md`.

### Tooling disponible (CLIs autenticadas)

Estos CLIs están autenticados localmente. Cuando una task toca su dominio, **úsalos directamente** en vez de pedirle al usuario que lo haga manualmente desde portal/web UI:

- **Azure CLI (`az`)**: autenticado contra el tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` de Efeonce. Se usa para gestionar Azure AD App Registrations (redirect URIs, client secrets, tenant config), Bot Service, Logic Apps, Resource Groups, etc. Comandos canónicos: `az ad app show --id <client-id>`, `az ad app update`, `az ad app credential reset`, `az ad sp show`. Tenant ID Microsoft de Efeonce: `a80bf6c1-7c45-4d70-b043-51389622a0e4`. Subscription ID: `e1cfff3e-8c21-4170-8b28-ad083b741266`.
- **Google Cloud CLI (`gcloud`)**: autenticado como `julio.reyes@efeonce.org` con ADC. Usar para Secret Manager, Cloud Run, Cloud SQL, Cloud Scheduler, BigQuery, Cloud Build, Workload Identity Federation. Project canónico: `efeonce-group`.
  - **Regla operativa obligatoria**: cuando un agente necesite acceso interactivo local a GCP, debe lanzar **siempre ambos** flujos y no asumir que uno reemplaza al otro:
    - `gcloud auth login`
    - `gcloud auth application-default login`
  - Motivo: `gcloud` CLI y ADC pueden quedar desalineados; si solo se autentica uno, pueden fallar `bq`, `psql` via Cloud SQL tooling, Secret Manager o scripts del repo de forma parcial y confusa.
- **GitHub CLI (`gh`)**: autenticado contra `efeoncepro/greenhouse-eo`. Usar para issues, PRs, workflow runs, releases.
- **Vercel CLI (`vercel`)**: autenticado contra el team `efeonce-7670142f`. Usar para env vars, deployments, project config. Token en `.env.local` o config global.
- **PostgreSQL CLI (`psql`)** vía `pnpm pg:connect`: levanta proxy Cloud SQL + conexión auto. No requiere credenciales manuales.
- **Timeout en macOS (`gtimeout`)**: este workspace corre en macOS, donde `timeout` GNU no existe por defecto. `coreutils` está instalado vía Homebrew y el comando canónico es `gtimeout <duración> <comando>` (ej. `gtimeout 30s pnpm test`). No usar `timeout` crudo en recetas para agentes; si un script debe ser portable, detectar `gtimeout || timeout` o implementar timeout en Node.
- **Greenhouse Visual Capture (`GVC`, `pnpm fe:capture`)**: herramienta canónica para grabar `.webm` + frames PNG marker-based + GIF opcional de cualquier ruta del portal via Playwright + agent auth. Reemplaza el patrón ad-hoc de `_cap.mjs`. Scenario DSL declarativo bajo `scripts/frontend/scenarios/`. Output `.captures/<ISO>_<scenario>/` (gitignored). Triple gate para production. Comandos: `pnpm fe:capture <scenario> --env=staging [--gif] [--headed]` o `pnpm fe:capture --route=/path --env=staging --hold=3000`. Relacionados: `pnpm fe:capture:review <scenario|capture-dir>` para dossier UI review, `pnpm fe:capture:diff <prev> <curr>` para before/after, `pnpm fe:capture:health` para salud local y `pnpm fe:capture:gc [--apply]` para purga >30d. Para pantallas largas usar scenario con `scroll selector`, `scrollTo`, `mark fullPage` o `mark clipSelector`; preferir `data-capture="<seccion>"` sobre offsets frágiles. Arquitectura: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`. Manual: `docs/manual-de-uso/plataforma/captura-visual-playwright.md`.

**Regla operativa**: cuando un agente diagnostica un incidente y la causa raíz vive en una de estas plataformas, debe **ejecutar el fix con el CLI** (con guardrails y verificación), no documentar pasos manuales. Si el fix es destructivo (eliminar app registration, drop database, force-push) sí confirma con el usuario primero.

### Auth resilience invariants (TASK-742)

7 capas defensivas que protegen el flujo de autenticación. Cualquier cambio que toque NextAuth, secrets de auth, o el flujo de sign-in debe respetar estos invariantes — son los que evitan que una rotación mal hecha o un cambio en Azure App registration vuelva a romper login silenciosamente como en el incidente 2026-04-30.

**⚠️ Reglas duras**:

- **NUNCA** cambiar `signInAudience` de la Azure AD App Registration a `AzureADMyOrg` (single-tenant). Greenhouse es multi-tenant por arquitectura — clientes Globe (Sky, etc.) entran desde sus propios tenants Azure. El valor canónico es **`AzureADMultipleOrgs`** (work/school accounts de cualquier tenant; rechaza personal Microsoft Accounts). El callback `signIn` en `auth.ts` rechaza tenants no provisionados via lookup en `client_users` por `microsoft_oid`/`microsoft_email`/alias — la autorización fina vive en Greenhouse, no en Azure. El 2026-04-30 alguien flipeó esto a `AzureADMyOrg` y rompió SSO para todos los users. `pnpm auth:audit-azure-app` detecta drift en segundos.
- **NUNCA** remover redirect URIs registradas en la Azure App. Las canónicas son `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (production) y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging). El auditor las verifica como dura.
- **NO** llamar `Sentry.captureException(err)` en code paths de auth. Usar siempre `captureWithDomain(err, 'identity', { extra: { provider, stage } })` desde `src/lib/observability/capture.ts`. El subsystem `Identity` rolls up por `domain=identity`.
- **NO** publicar secretos críticos sin pasar por `validateSecretFormat` (`src/lib/secrets/format-validators.ts`). Si agregas un secret crítico nuevo, agregá su rule al catálogo `FORMAT_RULES`. `resolveSecret` rechaza payloads que no pasan validation.
- **NO** rotar un secret en producción manualmente. Usar `pnpm secrets:rotate <gcp-secret-id> --validate-as <ENV_NAME> --vercel-redeploy <project> --health-url <url>`. El playbook hace verify-before-cutover y revert automático si health falla.
- **NUNCA** mutar el JWT/signIn callbacks de NextAuth sin envolverlos en try/catch + `recordAuthAttempt(...)`. NextAuth swallow-ea errores → opaque `?error=Callback`. El wrapping garantiza que la próxima falla emita stage + reason_code estable a `greenhouse_serving.auth_attempts` y a Sentry.
- **NUNCA** computar SSO health en el cliente. La UI de Login lee `/api/auth/health` (contract `auth-readiness.v1`) y oculta/deshabilita botones degradados. Single source of truth.
- **NUNCA** persistir el raw token de un magic-link. Solo `bcrypt(token)` con cost 10. TTL=15min, single-use enforced en consume time. Usar `src/lib/auth/magic-link.ts` — no inventar tokens nuevos.
- **NUNCA** crear un `client_users` row con `auth_mode='both'` sin `password_hash`, ni `auth_mode='microsoft_sso'` sin `microsoft_oid`. La CHECK constraint `client_users_auth_mode_invariant` lo bloquea. Si necesitas estado transicional, usar `auth_mode='sso_pending'` (sin password ni SSO link, ready para link en próximo signIn).
- **NO** depender de `process.env.NEXTAUTH_SECRET` plano en producción si existe `NEXTAUTH_SECRET_SECRET_REF`. El resolver prefiere Secret Manager. Tener ambos crea drift.

**Helpers canónicos**:

- `validateSecretFormat(envName, value)` — Capa 1
- `getCurrentAuthReadiness()` desde `src/lib/auth-secrets.ts` — Capa 2
- `recordAuthAttempt({ provider, stage, outcome, reasonCode, ... })` desde `src/lib/auth/attempt-tracker.ts` — Capa 3
- `requestMagicLink({ email, ip })` / `consumeMagicLink({ tokenId, rawToken, ip })` — Capa 5
- `pnpm secrets:audit` / `pnpm secrets:rotate` — Capa 7

**Observability surfaces**:

- `/api/auth/health` — public read-only readiness
- `greenhouse_serving.auth_attempts` — append-only ledger (90-day retention)
- `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'` — synthetic monitor cada 5min via Cloud Scheduler
- Sentry `domain=identity` — todos los errors de auth

**Spec completa**: `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`.

### Home Rollout Flag Platform (TASK-780)

Toda flag que controle variantes de shell o features rollouteables del módulo home debe vivir en `greenhouse_serving.home_rollout_flags` (tabla canónica con scope precedence `user > role > tenant > global`). Reemplaza la env var binaria `HOME_V2_ENABLED` que causó divergencia visible entre dev (`dev-greenhouse.efeoncepro.com`) y prod (`greenhouse.efeoncepro.com`) el 2026-05-04.

**Read API canónico**:

- Resolver: `src/lib/home/rollout-flags.ts` (`resolveHomeRolloutFlag`, `isHomeV2EnabledForSubject`). PG-first → env fallback → conservative default disabled. In-memory cache TTL 30s.
- Mutations: `src/lib/home/rollout-flags-store.ts` (`upsertHomeRolloutFlag`, `deleteHomeRolloutFlag`, `listHomeRolloutFlags`). Validation: scope_id constraints, reason ≥ 5 chars, idempotent UPSERT.
- Admin endpoint: `GET/POST/DELETE /api/admin/home/rollout-flags` (gated by `requireAdminTenantContext`).
- Reliability signal: `home.rollout.drift` (kind=`drift`, severity=`error` si count>0). Detecta missing global row, PG↔env divergence, opt-out rate > 5%.

**Defensa-en-profundidad**:

- CHECK constraint `home_rollout_flags_key_check` whitelist de `flag_key` (extender CHECK al agregar flag nueva).
- CHECK constraint `home_rollout_flags_scope_id_required` (scope_id NULL solo cuando scope_type='global').
- Audit trigger `set_updated_at` BEFORE UPDATE.
- Sentry tag `home_version: 'v2' | 'legacy'` en `captureHomeError` y `captureHomeShellError`.
- Defensive try/catch en `src/app/(dashboard)/home/page.tsx`: V2 throw → degrade graceful a legacy + Sentry tagged.

**⚠️ Reglas duras**:

- **NUNCA** crear env vars binarias para feature flags nuevas de UI/shell. Toda flag debe nacer como fila en `home_rollout_flags` (variantes de shell) o `home_block_flags` (kill-switches per-block dentro de V2).
- **NUNCA** leer `process.env.HOME_V2_ENABLED` directo en código nuevo. Solo el resolver canónico lo hace, y solo como fallback graceful cuando PG falla.
- **NUNCA** componer la decisión de variant en cliente. Server-only por construcción (`import 'server-only'`).
- **NUNCA** reportar 5xx desde el endpoint admin con stack traces. Errores sanitizados (sin env leakage).
- **NUNCA** hardcodear `homeVersion='v2'` cuando el flag resolution dice `legacy`. El tag tiene que reflejar la variante real renderizada para que el dashboard distinga correctamente.
- **NUNCA** invalidar el cache del resolver desde mutations sin invocar `__clearHomeRolloutFlagCache`. La store helpers ya lo hacen — los consumers nunca tocan el cache directo.
- Cuando emerja una flag nueva (e.g. `home_v3_shell`, `home_layout_experimental`), extender CHECK constraint `home_rollout_flags_key_check` + agregar al type union `HomeRolloutFlagKey` + agregar admin UI eventualmente.

**Spec canónica**: `docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md`.

### Nexa Insights detail page canonical invariants (TASK-947, desde 2026-05-28)

Toda surface que necesite "navegar al detail de un Nexa Insight" (Home bento, Agency ICO, Person 360 narrative, Space 360 overview, Finance dashboard, Weekly Digest email, Teams notifications, futuras superficies) **debe** apuntar al routing canonical `/nexa/insights/[id]` y consumir el helper `readNexaInsightDrill(id, subject)` para resolver el detail. Cierra el bug class 404 sistemático del CTA "Ver causa raíz" (drift TASK-696).

**Read API canónico**:

- Routing: `/nexa/insights/[id]` (top-level cross-domain, NO `/agency/insights/*` legacy). Mirror del precedente `/admin/...` (lane cross-domain, no dominio).
- Dispatch prefix canonical:
  - `EO-AIS-*` (12 hex) — signal-anchored (default cards "Ver causa raíz" del current). Estable cross-period TASK-943 append-only. Generado por `stableAiId('AIS', ...)` (ico-engine/ai/types.ts:80).
  - `EO-AIE-*` (8 hex) — enrichment-anchored (share permalinks TASK-449). Snapshot específico. Generado por `stableEnrichmentId(signalId, promptHash)` (llm-types.ts:343).
  - `EO-AIH-*` (8 hex) — enrichment-history forensic. Generado por `stableEnrichmentHistoryId(runId, enrichmentId)` (llm-types.ts:346).
- Helper canonical único: `readNexaInsightDrill(id, subject) → NexaInsightDrillResult` server-only en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`. Detecta prefix → dispatchea lookup → aplica subject-aware filter → retorna discriminated union.
- 5 states canonical: `current` | `superseded` (con `currentSignalDrillId` link al vigente) | `expired` (con `resolvedAt`) | `not_found` | `degraded` (con `reason: 'pg_read_failed' | 'history_unavailable' | 'pg_stale'`).
- Capability: `nexa.insights.read` (module `delivery`, action `read`, scope `tenant/all`). Seedeada en `greenhouse_core.capabilities_registry` (migration `20260529004012583`). Grant matriz canonical V1: `EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ HR_MANAGER` (role) + route_groups `internal/finance/hr` (broad operational).
- Helper URL: `buildNexaInsightDrillHref(id)` → `/nexa/insights/<id>`. Centraliza la shape para evitar drift cross-surface.

**3-tier lookup canonical** (enrichment-anchored `EO-AIE-*`):

1. PG serving `greenhouse_serving.ico_ai_signal_enrichments` (current `status='succeeded'`).
2. Fallback `greenhouse_serving.ico_ai_signal_enrichment_history` (TASK-914 history). Si hit → `superseded` state con link al `signalId` vigente.
3. Miss → `not_found`.

**Subject-aware filter canonical** (sin 403, anti-oracle TASK-872):

- `tenantType='client'` → SIEMPRE `not_found` (V1 internal-only).
- `EFEONCE_ADMIN` → SIEMPRE permitido.
- `route_groups` broad `internal/finance/hr` → permitido (acceso operacional).
- Collaborator sin route_group broad → solo si `subject.memberId === insight.memberId` (self-access).
- Cualquier fallback → `not_found`.

**⚠️ Reglas duras**:

- **NUNCA** crear detail page de Nexa Insights bajo route_group de dominio (`/agency/...`, `/finance/...`, `/people/...`). Canonical es `/nexa/insights/[id]` top-level. Mismo principio que `/admin/...` lane.
- **NUNCA** consumer downstream compone su propio drawer/modal/detail para Nexa Insights. Toda navegación pasa por `/nexa/insights/[id]` (deep-linkable, share-friendly, estable cross-time/tenant/domain).
- **NUNCA** crear URLs canonical ancladas al `enrichmentId` para cards "Ver causa raíz" del current. Cards usan `signalId` (estable cross-period). `enrichmentId` reservado para share/forensic explícito (TASK-449 V1.3).
- **NUNCA** retornar `403` desde el detail page cuando subject sin acceso. `notFound()` siempre (anti-oracle TASK-872). 403 leakea info de existencia al atacante; legítimos bloqueados se detectan via reliability signals upstream.
- **NUNCA** read directo de `ico_engine.ai_signals` raw BQ ni de `ico_ai_signal_enrichments`/`ico_ai_signal_enrichment_history` PG en consumers. Pasa por `readNexaInsightDrill`. VIEW canonical `ai_signals_current` TASK-943.
- **NUNCA** colapsar UI states `not_found` + `expired` + `superseded` + `degraded` en un único "Sin datos" ambiguo. Mapping explícito TASK-946 framework (`current → default` / `superseded → partial banner amber` / `expired → empty-positive` / `not_found → notFound()` / `degraded → error banner`).
- **NUNCA** mostrar narrativa superseded sin banner explícito "versión histórica" + link al `currentSignalDrillId` cuando exista.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'nexa_insight_detail', stage: 'pg_read' | 'page_loader' } })`.
- **NUNCA** seed `nexa.insights.read` en TS catalog sin grant en `runtime.ts` mismo PR (invariant TASK-873 + TASK-935). Guard mecánico `capability-grant-coverage.test.ts` rompe build si emerge drift.
- **NUNCA** emit URL `/agency/insights/*` desde loader/componente nuevo. Canonical `/nexa/insights/[id]`. Grep `rg "/agency/insights/" src --include='*.ts' --include='*.tsx'` debe estar vacío (excepto comentarios y tests).
- **NUNCA** romper el dispatch prefix `EO-AIS-*` / `EO-AIE-*` / `EO-AIH-*` en el resolver. Semántica anchor estable vs snapshot share-friendly vs forensic — los 3 tienen propósitos distintos.
- **NUNCA** modificar la `severity_color` / `severity_label` map en `GH_NEXA` para un caso específico del detail. Reusa los tokens canonical existentes (TASK-696 / TASK-945) — single source of truth.
- **SIEMPRE** que email/Teams notification incluya link a insight, usar `/nexa/insights/<signalId>` (estable cross-time + cross-tenant + cross-domain). Cards default = `signalId`; share buttons = `enrichmentId` explícito.
- **SIEMPRE** que emerja consumer cross-surface nuevo que necesite "detail de un Nexa Insight", navegar al canonical — cero composición ad-hoc.
- **SIEMPRE** que el LLM-enrichment-worker regenere un enrichment, el URL `/nexa/insights/EO-AIS-*` sigue válido apuntando al current (signal-anchored = estable cross-regeneration por design).
- **SIEMPRE** que se introduzca una nueva surface emisora de drillHref a Nexa Insights, agregar test focal anti-regresión que assert (a) la URL es `/nexa/insights/*` (NO `/agency/insights/*`) y (b) usa `signalId` (NO `enrichmentId`) para cards default.

**Spec canónica**: `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md`. Patrones fuente: TASK-611 (organization workspace projection — detail page server-side con projection + degraded honest), TASK-872 (anti-oracle `notFound()` pattern), TASK-873 (capability runtime grant invariant + guard mecánico), TASK-935 (capability grants reconciliation + DEVOPS_OPERATOR no-existe enforcement), TASK-946 (12 canonical UI states framework). Helpers canónicos: `readNexaInsightDrill`, `buildNexaInsightDrillHref`, `detectNexaIdKind`, `NEXA_ID_PREFIXES` (todos en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`).

### Quick Access Shortcuts Platform (TASK-553)

Toda surface que renderice atajos top-level de navegación (header `<ShortcutsDropdown />`, Home `recommendedShortcuts`, futuras command palettes, Mi Greenhouse, settings personales) **debe** consumir el resolver canónico desde `src/lib/shortcuts/resolver.ts`. Reemplaza los arrays hardcodeados de shortcuts que vivían en `NavbarContent.tsx` (vertical + horizontal) y los desacopla del catálogo Home.

**Read API canónico**:

- Catálogo: `src/lib/shortcuts/catalog.ts` (`SHORTCUT_CATALOG`, `AUDIENCE_SHORTCUT_ORDER`, `getShortcutByKey`, `isKnownShortcutKey`). Single source of truth de IDs, labels, subtitles, routes, iconos, módulo y dual-plane gates opcionales (`viewCode` + `requiredCapability`).
- Resolver: `resolveAvailableShortcuts(subject)`, `resolveRecommendedShortcuts(subject, limit?)`, `validateShortcutAccess(subject, key)` (write-path boolean), `projectShortcutForHome(shortcut)` (legacy projection bridge).
- Store: `src/lib/shortcuts/pins-store.ts` (`listUserShortcutPins`, `pinShortcut` idempotente, `unpinShortcut` idempotente, `reorderUserShortcutPins` atómica, `listDistinctPinnedShortcutKeys` para reliability).

**Persistencia**: `greenhouse_core.user_shortcut_pins` con FK CASCADE on user delete, audit trigger `updated_at`, ownership `greenhouse_ops` + grants `greenhouse_runtime`. Scope per-usuario (no por tenant): los pins son navegación personal, la revalidación de acceso ocurre en READ time contra session vigente.

**API canónica** (`/api/me/shortcuts`):

- `GET /api/me/shortcuts` → `{ recommended, available, pinned }` para usuario actual.
- `POST /api/me/shortcuts` → pin idempotente. Body: `{ shortcutKey }`.
- `DELETE /api/me/shortcuts/[shortcutKey]` → unpin idempotente.
- `PUT /api/me/shortcuts/order` → reorder atómico. Body: `{ orderedKeys: string[] }`.

Auth: `getServerAuthSession` + `can(subject, 'home.shortcuts', 'read')` + `validateShortcutAccess` server-side antes de cualquier write. Errores sanitizados con `redactErrorForResponse` + `captureWithDomain('home', ...)`.

**Reliability signal canónico**: `home.shortcuts.invalid_pins` (kind=`drift`, severity=`warning` si count>0, steady=0). Detecta llaves pineadas sin entry en el catálogo TS. UI no rompe (reader filtra), pero ops detecta drift.

**⚠️ Reglas duras**:

- **NUNCA** hardcodear arrays de shortcuts en un layout o `NavbarContent`. La fuente única es `src/lib/shortcuts/catalog.ts`. Drift detectado por code review.
- **NUNCA** decidir visibilidad de un shortcut desde el cliente. El cliente lee `/api/me/shortcuts` que devuelve solo lo autorizado.
- **NUNCA** persistir un pin sin pasar por `validateShortcutAccess` server-side. El POST handler lo enforce — no replicar la lógica del cliente.
- **NUNCA** mostrar un shortcut pineado sin re-validar acceso al render. El reader del API ya lo filtra; cualquier consumer alternativo debe pasar por el resolver.
- **NUNCA** mezclar el shape de header (`{key, label, subtitle, route, icon, module}`) con el legacy de Home (`{id, label, route, icon, module}`). Use `projectShortcutForHome` cuando se necesite el shape legacy.
- **NUNCA** introducir un nuevo gate (e.g. `requiredFeatureFlag`) sin extender `CanonicalShortcut` + `isShortcutAccessible` en el resolver. Cero branching inline en consumers.
- Cuando emerja una surface adaptativa nueva (Mi Greenhouse, command palette, settings personales con atajos), debe consumir el resolver — no copiar el catálogo ni reimplementar el gate.

**Spec canónica**: `docs/tasks/complete/TASK-553-quick-access-shortcuts-platform.md`. Doc funcional: `docs/documentation/plataforma/accesos-rapidos.md`. Manual: `docs/manual-de-uso/plataforma/accesos-rapidos.md`. Delta UI Platform: `docs/architecture/ui-platform/HISTORIAL.md` (2026-05-04).

### Operational Data Table Density Contract (TASK-743)

Toda tabla operativa con celdas editables inline o > 8 columnas debe vivir bajo el contrato de densidad. Resuelve el overflow horizontal contra `compactContentWidth: 1440` de manera robusta y escalable, sin parchear caso-por-caso.

- **3 densidades canonicas** (`compact` / `comfortable` / `expanded`) con tokens fijos: row height, padding, editor min-width, slider visibility, font size.
- **Resolucion**: prop > cookie `gh-table-density` > container query auto-degrade (< 1280px baja un nivel) > default `comfortable`.
- **Wrapper canonico**: `<DataTableShell>` con `container-type: inline-size`, `ResizeObserver`, sticky-first column, scroll fade en borde derecho cuando hay overflow.
- **Primitive editable canonica**: `<InlineNumericEditor>` (reemplaza `BonusInput`). En `compact` solo input, en `comfortable` input + slider en popover-on-focus, en `expanded` input + slider inline + min/max captions.
- **Ubicacion**: `src/components/greenhouse/data-table/{density,useTableDensity,DataTableShell}.tsx` y `src/components/greenhouse/primitives/InlineNumericEditor.tsx`.
- **Spec canonica**: `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`.
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.

**⚠️ Reglas duras**:

- **NUNCA** crear una `Table` MUI con > 8 columnas o con `<input>`/`<TextField>`/`<Slider>` dentro de `<TableBody>` sin envolverla en `<DataTableShell>`. Lint rule `greenhouse/no-raw-table-without-shell` bloquea el commit.
- **NUNCA** hardcodear `minWidth` en una primitiva editable inline. Debe leer la densidad via `useTableDensity()`.
- **NUNCA** mover `compactContentWidth: 1440` a `'wide'` global para "resolver" un overflow. Es cortoplacista y rompe consistencia con dashboards diseñados a 1440. La solucion canonica es el contrato.
- **NUNCA** duplicar `BonusInput`. Esta marcado como deprecated re-export que delega en `<InlineNumericEditor>`. Cualquier consumer nuevo debe usar la primitiva canonica directamente.
- **NUNCA** desactivar el visual regression test `payroll-table-density.spec.ts` para forzar un merge. Si falla por overflow, respetar el contrato; no bypass.
- Cuando emerja una tabla operativa nueva (ProjectedPayrollView, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed), migrarla al contrato de manera oportunista. La lint rule la fuerza al primer toque significativo.

### Final Settlement Document Lifecycle invariants (TASK-863 V1.5.2)

Toda transición del state machine de `greenhouse_payroll.final_settlement_documents` (renuncia voluntaria; extensible a futuras causales) **debe** regenerar el PDF persistido para mantener el invariante "`pdf_asset_id` apunta a un PDF rendereado con el `documentStatus` actual de DB". El bug class detectado live 2026-05-11 con el finiquito de Valentina Hoyos: el doc se aprobó en DB pero el operador descargaba el asset persistido con el render original del estado `rendered` (badge "Borrador HR" + watermark "PROYECTO"), porque solo `issued` y `signed_or_ratified` regeneraban — las 5 transitions restantes (`in_review`, `approved`, `voided`, `rejected`, `superseded`) dejaban el PDF stale.

**Read API canónico**:

- Helper canónico atómico: `regenerateDocumentPdfForStatus(client, document, newStatus, actorUserId, ratification?)` en [src/lib/payroll/final-settlement/document-store.ts](src/lib/payroll/final-settlement/document-store.ts). Acepta el set canónico cerrado `'in_review' | 'approved' | 'issued' | 'signed_or_ratified' | 'voided' | 'rejected' | 'superseded'`. Falla soft (transition de DB ya commiteó; estado legal es source of truth) con `captureWithDomain('payroll', err, ...)` para Sentry rollup.
- Asset metadata canónica: cada regen persiste `metadata_json.documentStatusAtRender = newStatus` en `greenhouse_core.assets`. NUNCA cambiar el nombre de esta key sin actualizar el reader del signal.
- Reliability signal: `payroll.final_settlement_document.pdf_status_drift` ([src/lib/reliability/queries/final-settlement-pdf-status-drift.ts](src/lib/reliability/queries/final-settlement-pdf-status-drift.ts)). Detecta `document_status` actual != `asset.metadata_json->>'documentStatusAtRender'`. Steady=0. Severity warning si count>0, error si drift > 24h.
- Test anti-regresión: `document-status-regen-invariant.test.ts` parsea el source y verifica que TODA `SET document_status = 'X'` (excepto `rendered`) tiene un call matchedo a `regenerateDocumentPdfForStatus(client, ..., 'X', ...)`. Rompe build si emerge un transition nueva sin regen.

**Matriz canónica de watermark + badge per status** (idempotente con la matriz V1.1 en spec finiquito):

| documentStatus | Watermark | Badge label |
| --- | --- | --- |
| `rendered` | PROYECTO (warning) | Borrador HR |
| `in_review` | PROYECTO (warning) | En revisión interna |
| `approved` | PROYECTO (warning) | Aprobado · pendiente de emisión |
| `issued` | CLEAN | Listo para firma |
| `signed_or_ratified` | CLEAN | Firmado / ratificado |
| `voided` | ANULADO (error) | Anulado |
| `rejected` | RECHAZADO (error) | Rechazado por trabajador |
| `superseded` | REEMPLAZADO (neutral) | Reemplazado |

**⚠️ Reglas duras**:

- **NUNCA** hacer `UPDATE greenhouse_payroll.final_settlement_documents SET document_status = 'X' ...` sin llamar a `regenerateDocumentPdfForStatus(client, document, 'X', actorUserId, ...)` dentro de la misma transacción inmediatamente después. El test anti-regresión rompe build si emerge un callsite que viole esto.
- **NUNCA** invocar `Sentry.captureException()` directo en el regen failure path. Usar `captureWithDomain(err, 'payroll', { tags: { source: 'final_settlement_pdf_regen', stage: newStatus }, extra: { ... } })`.
- **NUNCA** persistir un PDF de finiquito sin `metadata_json.documentStatusAtRender`. El reliability signal lo detecta como drift y operador puede ver el problema antes de que un cliente lo reporte.
- **NUNCA** asumir que el snapshot en memoria refleja el documentStatus actual post-update sin re-leer la fila o sin pasar por el helper. El helper hace el regen+UPDATE pdf_asset_id en una sola tx atomic.
- **NUNCA** bloquear la transition de estado si el render falla. La DB es source of truth del estado legal; el PDF es un artefacto derivado. Reportar via Sentry y dejar que el reliability signal alerte hasta que el operador haga reissue.
- **NUNCA** agregar una transition nueva al state machine (e.g. `archived`, `notified_to_dt`) sin: (a) extender el type union `DocumentStatusForRegen` en el helper, (b) llamar al helper en el código de la transition, (c) extender la matriz canónica de watermark/badge, (d) extender el test anti-regresión + el array `REGEN_REQUIRED_STATUSES`.
- **NUNCA** modificar la key `documentStatusAtRender` en el asset metadata sin actualizar paralelamente: (a) el reader del reliability signal, (b) el test anti-regresión que la valida.
- **SIEMPRE** que un caller del helper retorne `null` (regen failure), preservar el `pdf_asset_id` previo del documento + spread del row de DB original (ver pattern `regenerated ? { ...document, pdfAssetId, contentHash } : document`).

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta V1.5.2). Task evidence: `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` Delta V1.5.2.

### Real-Artifact Iterative Verification Loop — metodología canónica para features visuales (TASK-863 V1.1→V1.5.1)

Para cualquier feature que **emita o renderice un artefacto consumido por humanos fuera del agente** — PDFs operativos, documentos legales, emails transaccionales, layouts de detalle complejos, dashboards ejecutivos, exports Excel, recibos, certificados, contratos, addenda — el contrato técnico (`tsc --noEmit` + `pnpm lint` + tests unitarios + fixtures sintéticos) **NO es suficiente** para garantizar production-readiness. El bug class detectado live 2026-05-11 en el finiquito de Valentina Hoyos (5 rondas iterativas V1.1→V1.5 + hotfix V1.5.1) lo demostró: 12 hallazgos visuales + 5 bloqueantes legales **invisibles** al audit pre-emisión emergieron solo al **emitir un caso real**, capturarlo, y re-auditarlo con skills sobre el artefacto real.

**Metodología canónica de 7 pasos** (reusable cross-feature):

1. **Implementar V1** con audit pre-emisión normal (skills de dominio consultadas pre-implementation, `tsc --noEmit`, `pnpm lint`, tests unitarios, fixtures sintéticos, lint rules, type checks).
2. **Acuerdo explícito con el usuario** para entrar al loop de verificación visual con caso real. El usuario aporta datos productivos (cliente/colaborador/proveedor real con datos reales — nombre, RUT, dirección, cargo, monto). El agente NO inventa datos; opera sobre el caso que el usuario aprueba.
3. **Sesión Playwright + Chromium con agent auth** (NO mocks):
   - Setup: `AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` con sesión NextAuth válida del usuario `agent@greenhouse.efeonce.org`.
   - Navegar al portal real (dev local `http://localhost:3000`, staging `dev-greenhouse.efeoncepro.com` via bypass, o producción cuando aplica — coordinar con el usuario).
   - Trigger la acción que emite el artefacto (click "Emitir", "Calcular", "Enviar", "Generar PDF", etc.) usando la UI exacta del operador.
4. **Capturar el artefacto real**:
   - **PDFs**: descargar el asset emitido (`/api/assets/private/[id]` con sesión válida), abrir con macOS Preview / pdf viewer y screenshot de cada página.
   - **Emails**: invocar el preview endpoint canónico (`/api/emails/preview/[template]`), screenshot del render Chromium o exportar HTML.
   - **UI**: screenshot del browser Chromium con la página completa rendereada (Playwright `page.screenshot({ fullPage: true })` o equivalente manual).
   - **Excel**: descargar el archivo y abrirlo con Numbers/Excel para inspección visual + verificar agregaciones.
   - **Compartir captura con el agente** en el chat (drag & drop / paste image / file path) para que el agente la consuma visualmente.
5. **Re-audit comprehensive con 3 skills sobre el artefacto real** (no fixture sintético):
   - **Skill de dominio** del feature (e.g. `greenhouse-payroll-auditor` para nómina/finiquitos, `greenhouse-finance-accounting-operator` para finance, `greenhouse-hr` para HR, `commercial-expert` para GTM/sales, etc.).
   - **Skill UX writing del registro** correspondiente (`greenhouse-ux-writing` en modo `es-CL formal-legal` para textos jurídicos, `es-CL operativo` para docs operacionales, `es-CL técnico` para integraciones, `en-US` para audiencias internacionales).
   - **Skill visual** apropiada (`modern-ui` para jerarquía/tipografía/spacing/balance, `greenhouse-ux` para layout/component selection, `greenhouse-microinteractions-auditor` cuando hay motion/feedback).
   - Las 3 skills miran la **misma evidencia visual** (el screenshot/PDF/email real) y reportan independientemente; sus hallazgos se consolidan.
6. **Iterar fixes hasta limpieza total**:
   - Aplicar fixes al código.
   - Re-emitir el artefacto (paso 3 + 4 nuevamente).
   - Re-auditar (paso 5 nuevamente).
   - Cerrar bloqueantes uno a uno; cada round produce un commit V1.x.
   - El loop termina cuando las 3 skills reportan zero blockers Y el usuario aprueba visualmente el resultado.
7. **Canonizar el resultado** en:
   - Spec arquitectónica (`docs/architecture/<DOMAIN>_V1_SPEC.md` con Delta del round).
   - Doc funcional (`docs/documentation/<domain>/<feature>.md` con bump de versión).
   - Manual de uso (`docs/manual-de-uso/<domain>/<feature>.md`) si aplica al operador.
   - ADR en `DECISIONS_INDEX.md` si la decisión es contractual cross-domain.
   - CLAUDE.md + AGENTS.md con invariantes duros si emergen reglas reusables (caso real: Semantic Column Invariants).
   - Task delta con resumen de los rounds + aprendizaje canonizado.

**Aprendizaje meta canonizado** (TASK-863 evidencia):

Sin paso 3-5 (loop real con artefacto + 3-skill audit), bugs como:

- B-1 cláusula PRIMERO mezclando hitos legales distintos (vicio defendible en demanda)
- B-2 cláusula SEGUNDO con verbo performativo incorrecto (vicio de consentimiento)
- B-3 cláusula CUARTO citando solo modificatoria (jurídicamente débil)
- V1.5.1 cargo del trabajador en col empleador (mezcla semántica de partes)
- Ligature "fi" rota produciendo "frma" / "defnitivo" / "ratifcada" (typography drift)
- Footer overlap visual / page break partiendo cláusulas (layout drift)

**quedan latentes** hasta que un cliente, abogado, contralor o auditor externo los detecte — momento en que el costo de remediación (relación con cliente, retraso operativo, riesgo legal/financiero) es **órdenes de magnitud mayor** al costo del loop.

**Cuándo aplicar el loop (decision tree)**:

- ¿El feature emite un artefacto que un humano externo al equipo va a leer/firmar/auditar? → SÍ, aplicar loop completo (pasos 1-7).
- ¿El feature es solo backend (endpoint, sync, cron) sin render visual? → NO, audit técnico es suficiente.
- ¿El feature es UI interna del agente (admin tools, debug surfaces)? → Loop simplificado (pasos 1-3 + visual review, sin 3-skill audit).
- ¿El feature es UI de operador interno (HR, Finance, Agency)? → Loop completo si el resultado de la UI afecta decisiones operativas con blast radius (e.g. cálculo de finiquito, conciliación bancaria, cierre mensual). Audit simplificado si es read-only.

**Herramientas canónicas del loop**:

| Capa | Herramienta canónica | Comando / archivo |
| --- | --- | --- |
| Agent auth | NextAuth headless | `POST /api/auth/agent-session` con `AGENT_AUTH_SECRET` |
| Playwright setup | Storage state generation | `node scripts/playwright-auth-setup.mjs` |
| Staging request bypass SSO | `staging-request.mjs` | `pnpm staging:request <path>` |
| PDF capture | Asset download + macOS Preview screenshot | `/api/assets/private/[id]` + `cmd+shift+5` |
| Email preview | Template render endpoint | `/api/emails/preview/[template]` |
| UI screenshot | Playwright full-page | `await page.screenshot({ fullPage: true })` |
| Excel inspection | Numbers / Excel macOS | descarga + apertura manual |
| Skill re-audit | Agent invocation con artefacto | drag-drop screenshot al chat + invocar skills |

**Pattern fuente** (canonizado live 2026-05-11): TASK-863 V1.1→V1.5.1 cerró 5 rondas iterativas en `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` (sección Delta V1.1-V1.5.1). Es el caso reusable: cuando alguien implemente el próximo doc legal (contrato de trabajo, addenda, certificado de servicio, finiquito de otras causales), seguir esta receta verbatim.

### Semantic Column Invariants — frontend / PDFs / emails / documentos legales (TASK-863 V1.5.1)

Cuando una surface renderiza datos en N columnas donde cada columna **representa una entidad distinta** (empleador vs trabajador, deudor vs acreedor, sender vs receiver, parte A vs parte B), la asignación de cada dato a su columna **NO es detalle visual — es invariante semántico de integridad de datos**. Romperlo en un documento legal produce vicio defendible (caso real: PDF de finiquito con "Cargo" del trabajador en col empleador detectado primer emisión real Valentina Hoyos, hotfix V1.5.1 2026-05-11).

**Bug class**: grid 2-cols con `flexWrap` (`@react-pdf/renderer`, CSS flexbox/grid, MUI `Grid container`, HTML email tables) deja el flujo de wrap decidir dónde aterriza cada cell. Cuando una dimensión existe solo para una parte (e.g. `jobTitle` solo para personas naturales; `taxId` solo para entidades; `birthDate` solo para naturales), el cell aterriza en la columna equivocada y mezcla semánticamente datos de las dos partes.

**⚠️ Reglas duras**:

- **NUNCA** dejar que `flexWrap`, `grid-auto-flow` o `column-wrap` decida la columna semántica de un dato. Si una columna representa una entidad, TODOS los datos de esa entidad aterrizan explícitamente en su columna — NUNCA por accidente del wrap.
- **NUNCA** intercalar campos de entidades distintas en grid 2-cols cuando una tenga más dimensiones que la otra. Inserta **spacer canónico** (`<View style={styles.field} />` en react-pdf; `<td>&nbsp;</td>` en email; `<Grid item />` empty en MUI) en la columna que no aplica para preservar la invariante.
- **NUNCA** "rellenar" la columna vacía con contenido falso/derivado (`N/A`, `—`, `No aplica`, repetir un dato del otro lado) para "balancear" visualmente. Mezcla semántica y confunde al lector.
- **NUNCA** asumir que el audit pre-emisión cubrió este bug class. El layout-by-wrap se ve correcto cuando todas las dimensiones son simétricas; el bug emerge cuando aparece un campo asimétrico. **Validar con caso real** del dominio, NO con fixture sintético.
- **NUNCA** acoplar el `label` del campo a la entidad mediante posicionamiento (e.g. "Cargo" sin prefix asumiendo la posición lo deja claro). El label debe ser auto-explicativo (`Cargo del trabajador`, `Domicilio empleador`, `RUT empleador`) por si la columna se rompe.
- **SIEMPRE** que emerja un campo asimétrico en layout 2-cols, insertar spacer en la otra columna en el MISMO commit. Tests visuales/snapshot capturan la asimetría.
- **SIEMPRE** que un documento legal/regulatorio (finiquito, contrato, addenda, certificado, factura, boleta, recibo, carta formal) tenga partes comparecientes, las columnas DEBEN preservar la invariante: parte A en col 1, parte B en col 2, parte C (ministro de fe, testigo, garante) en col 3. Sin excepción.
- **SIEMPRE** que un email transaccional tenga sender + receiver visibles, preservar el contrato visual de columnas en `src/views/emails/`.

**Pattern fuente** (canonizado live 2026-05-11 vía TASK-863 V1.5.1):

```tsx
// src/lib/payroll/final-settlement/document-pdf.tsx — fix canónico V1.5.1
<View style={styles.partyGrid}>
  <Field label='Empleador' value={employer.legalName} />
  <Field label='Trabajador/a' value={collaborator.legalName} />
  <Field label='RUT empleador' value={employer.taxId} />
  <Field label='RUT trabajador/a' value={collaborator.taxId} />
  <Field label='Domicilio empleador' value={employer.address} />
  <Field label='Domicilio trabajador/a' value={worker.address} />
  <View style={styles.field} />                                {/* col 1 — spacer canónico: empleador no tiene cargo */}
  <Field label='Cargo' value={collaborator.jobTitle} />        {/* col 2 — trabajador */}
</View>
```

**Aplicabilidad cross-surface**:

| Surface | Stack | Ejemplos |
| --- | --- | --- |
| PDFs operativos | `@react-pdf/renderer` | Finiquitos, contratos, addenda, certificados, boletas, recibos, cartas formales |
| Emails transaccionales | React Email + HTML tables | Confirmación pago, notificaciones cambio contrato, recordatorios firma |
| Tablas operativas MUI | DataTableShell (TASK-743) | Conciliación bancaria (movimiento vs match), payment orders (origen vs destino), payroll (haberes vs descuentos) |
| Layouts de detalle | MUI Grid container | Drawers cliente vs proveedor, perfiles persona vs organización |
| Comparativos visuales | CSS Grid / Flexbox | Before/after, plan A vs plan B, propuesta vs contrato firmado |

**Pattern canónico post-emisión real** (aprendizaje del loop V1.1→V1.5):

Para cualquier documento legal/regulatorio nuevo o cambio mayor que vaya a ser firmado/notarizado/auditado externamente, el pre-emisión audit técnico (`tsc --noEmit` + `pnpm lint` + visual review) NO es suficiente:

1. Implementar V1 con fixtures + audit técnico.
2. **Emitir 1 caso real** del dominio (datos reales del cliente/colaborador/proveedor).
3. Invocar **comprehensive audit 3-skills** sobre el documento real emitido:
   - Skill de dominio (e.g. `greenhouse-payroll-auditor`, `greenhouse-finance-accounting-operator`).
   - Skill UX writing del registro (`greenhouse-ux-writing` con foco es-CL formal-legal para textos jurídicos; operativo para docs operacionales; técnico para integraciones).
   - Skill visual (`modern-ui` o `greenhouse-ux`) para jerarquía/tipografía/spacing/balance.
4. Iterar fixes hasta cerrar bloqueantes.
5. **Canonizar** aprendizajes: AGENTS.md + CLAUDE.md + spec arquitectónica + doc funcional + manual de uso + ADR si toca contratos compartidos.

Sin paso 3 (audit comprehensive post-real-emit), bugs como B-1/B-2/B-3 (cláusulas legales con vicio defendible) o V1.5.1 (cargo del trabajador en col empleador) quedan latentes y se manifiestan recién cuando un cliente, abogado, contralor o auditor externo lo detecta — costo mucho mayor.

**Spec asociada**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (Legal Signatures helper canónico V1.4); `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Finiquito Delta V1.5 + V1.5.1).

### Sample Sprints Runtime Projection invariants (TASK-835)

Toda surface que renderice `/agency/sample-sprints` (command center, wizards, futuras superficies organization-first) **debe** consumir el `runtime` field del payload del API. La projection vive en `src/lib/commercial/sample-sprints/runtime-projection.ts` y es la única capa que traduce datos de dominio (services + engagement_* + cost attribution + Commercial Health) al view model que la UI runtime consume.

**Read API canónico**:

- Resolver: `resolveSampleSprintRuntimeProjection({tenant, selectedServiceId?, prefetchedItems?, prefetchedDetail?}) → SampleSprintRuntimeProjection`. Server-only enforce, cache TTL 30s in-memory keyed por `(subjectId, tenantId)`.
- Helpers asociados (todos extendidos en TASK-835):
  - `readCommercialCostAttributionByServiceForPeriodV2({serviceIds, fromPeriod, toPeriod, attributionIntents?})` — sibling del reader byClient TASK-708, comparte VIEW canónica
  - `enrichProposedTeam(proposedTeam[]) → {team, hasUnresolvedMembers}` — LEFT JOIN `greenhouse_core.members WHERE active=TRUE`
  - `resolveCapacityRiskForSprint({team, startDate, targetEndDate}) → {capacityRisk, allLookupsFailed}` — usa `getMemberCapacityForPeriod` existente
  - 6 health helpers (`countCommercialEngagement{OverdueDecision,BudgetOverrun,Zombie,UnapprovedActive,StaleProgress}` + `getCommercialEngagementConversionRateSnapshot`) ahora aceptan `options?: {tenantContext?}` opcional. Backward compat 100%.
- API endpoints: `GET /api/agency/sample-sprints` y `GET /api/agency/sample-sprints/[serviceId]` adjuntan `runtime` field al payload existente (Checkpoint C). Backward compat 100%.

**Reactive cache invalidation**: el consumer `sampleSprintRuntimeCacheInvalidationProjection` (`src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts`) escucha 6 outbox events `service.engagement.{declared, approved, rejected, capacity_overridden, progress_snapshot_recorded, outcome_recorded}` y dropea el cache scoped al `service_id`. Idempotente.

**Reliability signal**: `commercial.sample_sprint.projection_degraded` (kind=`drift`, severity=`warning` si count>0, steady=0). Reader: `getSampleSprintProjectionDegradedSignal`. Subsystem rollup: `commercial`. Cuenta degradaciones `severity=error` observadas en los últimos 5 minutos (counter in-memory).

**Convención canónica de progress**: el `%` de avance vive en `engagement_progress_snapshots.metrics_json.deliveryProgressPct` como número ∈ [0,100]. El runtime acepta `metrics.progressPct` como fallback compat. Future tasks que persistan progreso DEBEN respetar la key — el wizard `RuntimeProgressWizard` ya escribe `metricsJson.deliveryProgressPct`.

**⚠️ Reglas duras**:

- **NUNCA** derivar `progressPct`, `actualClp`, `team`, `capacityRisk` ni signals en componentes React. Toda derivación pasa por `runtime-projection.ts` server-side.
- **NUNCA** importar la projection desde código cliente. Enforce con `import 'server-only'` al inicio del módulo.
- **NUNCA** consumir `commercial_cost_attribution_v2` directo en componentes. Siempre via `readCommercialCostAttributionByServiceForPeriodV2` o sibling reader del mismo módulo. NUNCA SQL inline en projection.
- **NUNCA** mostrar `0` literal cuando un valor no se pudo computar. Usar `null` + degraded honest. UI distingue `loading | ready | empty | degraded` (cuatro estados, no tres).
- **NUNCA** derivar severity de signals client-side por status enum. Severity viene del helper canónico server-side.
- **NUNCA** mostrar equipo desde `client.organizationName` o `space.spaceName`. El team es `proposedTeam` enriquecido con `members.display_name + role_title`.
- **NUNCA** invocar los 6 health helpers de `health.ts` con scope global desde la surface comercial. Usar siempre `tenantContext` resuelto del subject. Solo `/admin/ops-health` (path admin) consume global.
- **NUNCA** inventar `kind` de signal nuevos en la projection. Mapear 1:1 a los 6 kinds canónicos de Commercial Health: `overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`.
- **NUNCA** escribir literals de copy en JSX para degraded states. Extender `GH_AGENCY.sampleSprints.degraded.<code>` en `src/lib/copy/agency.ts` (TASK-265).
- **NUNCA** crear endpoint nuevo `/api/agency/sample-sprints/runtime` preventivo sin segundo consumer demostrado. La projection vive embebida en el payload existente (Checkpoint C).
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de la projection. Usar `captureWithDomain(err, 'commercial', { tags: { source: 'sample_sprints_runtime_projection', stage: '<stage>' } })`.
- **SIEMPRE** que un outbox event afecte un sprint (declared / approved / rejected / capacity_overridden / progress_snapshot_recorded / outcome_recorded), invalidar cache scoped al `service_id` via consumer reactivo registrado.
- **SIEMPRE** que emerja un nuevo `degraded.code`, agregarlo al enum cerrado `SampleSprintProjectionDegradedCode` en `runtime-projection-types.ts` antes de mergear; NUNCA string libre.
- **SIEMPRE** persistir `metricsJson.deliveryProgressPct: number ∈ [0,100]` en `engagement_progress_snapshots` cuando emerja UI nuevo de registro de progreso.
- **SIEMPRE** revisar la microcopy con `greenhouse-ux-writing` antes de mergear (TASK-265).

**Patrones fuente reusados**: TASK-611 (organization-workspace projection + cache + reactive consumer), TASK-742 (degraded enum cerrado), TASK-265/407/408 (microcopy hygiene), TASK-708 (commercial_cost_attribution_v2 sibling reader pattern).

**Spec canónica**: `docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md`.

### Account 360 facet readers — anti silent-catch contract (TASK-1059, desde 2026-06-09)

Los readers canónicos de facets del 360 (`src/lib/account-360/facets/*` consumidos por `getAccountComplete360` → org-detail runtime + compact-signals + person/space 360 + finance clients) **NUNCA** envuelven una sub-query de **dato primario** en `.catch(() => [])`. Ese patrón convierte un error real (columna/join renombrado, schema/scope drift) en un resultado **indistinguible de "no hay datos"** — la causa raíz de los tabs vacíos (Equipo=0, Delivery tasks=0, Economía null) que el legacy sí mostraba. Es el bug class del "SQL Signal Reader Schema Validation Gate".

**Helper canónico** `src/lib/account-360/facet-observability.ts`:
- `observeAndRethrow(domain, source)` — para **dato primario** que el facet no puede falsear: captura a Sentry (`captureWithDomain`) y **re-lanza** → el resolver lo registra en `_meta.errors` y **omite el facet** (un facet roto debe ser VISIBLE, ausente + error, nunca medio-renderizado con ceros silenciosos).
- `observeAndDegrade(domain, source, fallback)` — para **enriquecimiento opcional** con estado "sin valor" legítimo o fallback downstream (ej. ICO null es honesto + hay fuente BQ canónica siguiente): captura y devuelve el fallback.

**⚠️ Reglas duras**:
- **NUNCA** `.catch(() => [])` (silent empty) en un reader canónico del 360. Usar `observeAndRethrow` (primario) u `observeAndDegrade` (enriquecimiento). Un error de schema debe llegar a `_meta.errors` + Sentry, no esconderse.
- **NUNCA** contar tareas por `status='completed'`/`active` ni literales — `greenhouse_delivery.tasks.task_status` es el **vocabulario canónico V1 en español**; usar `task-status-canonical` (`taskStatusGroupSql` + `TASK_STATUS_GROUPS`).
- **NUNCA** filtrar membresías "as-of" con `start_date <= asOf` sin NULL-safe — `start_date IS NULL` = inicio no acotado = activo (los contactos HubSpot lo traen NULL; el predicado los borraba).
- **ICO org-level**: la fuente de verdad es **BigQuery `ico_engine.metrics_by_organization`** (materializer TASK-900), **keyed por `spaces.client_id`** (NO org_id). Las tablas serving PG (`organization_operational_metrics`/`ico_organization_metrics`) son un mirror frecuentemente vacío → el delivery facet hace PG-first → fallback BQ vía `readOrganizationIcoMetricsFromBigQuery`. El resolver de aliases (`organization-ico-metrics-source.ts`) usa SOLO columnas existentes (`organization_360.{organization_id,public_id,hubspot_company_id}` + `spaces.client_id`).
- **SIEMPRE** validar SQL nuevo de reader contra PG real (CLAUDE.md SQL gate) — `db.d.ts` no es source of truth de columnas. Guard de regresión: `account-complete-360.live.test.ts` (asserta 0 `_meta.errors` para el org más rico + team>0; skip sin PG).

Verificado live (Sky Airline): 9 facets, 0 errores, team=21, delivery tasks=4208 + ICO rpa/otd/ftr, economics presente; org sin data degrada honesto. Relacionado: TASK-1059 (org workspace enterprise detail runtime) + [Organization Workspace projection invariants (TASK-611)](#organization-workspace-projection-invariants-task-611).

### Organization Workspace + Client Portal — invariantes (TASK-611, 613, 822)

Los invariantes de organization workspace projection, organization-by-facets (receta de extensión) y client portal BFF / anti-corruption layer viven en **`docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`** (contrato en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` + `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`).

**Reglas duras (resumen):** **NUNCA** computar visibilidad de facet en cliente (projection server-only) ni branchear UI por `relationship.kind` inline. **NUNCA** importar `@/lib/client-portal/*` desde un producer domain (lint `no-cross-domain-import-from-client-portal`; es hoja del DAG). **NUNCA** crear una vista organization-centric que no use el shell. **NUNCA** persistir un grant fino sin pasar por `capabilities_registry`.

### Payroll receipts + Legal docs/Finiquito — invariantes (TASK-758, 782, 863)

Los invariantes de payroll receipt presentation contract (4 regímenes), period report + Excel disaggregation, legal signatures platform y finiquito V1.5 (cláusulas state-conditional + auto-regeneración PDF) viven en **`docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`** (contrato en `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md`, `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md`). **Skill MANDATORIA `greenhouse-payroll-auditor`.**

**Reglas duras (resumen):** **NUNCA** ramificar el render del recibo por `entry.payRegime === chile` solo (usar `resolveReceiptRegime`/`buildReceiptPresentation`). **NUNCA** sumar `chileTotalDeductions` cross-régimen como subtotal único (subtotales mutuamente excluyentes: previsional vs retención SII honorarios). **NUNCA** reimplementar el resolver de firma del representante legal (usar `@/lib/legal-signatures`). **NUNCA** mezclar datos de partes distintas en una columna semántica (Semantic Column Invariants).

### Identity/Workforce — invariantes (person legal profile TASK-784, role title TASK-785, SCIM provisioning TASK-872)

Los invariantes de person legal profile (identity documents + addresses + reveal sensitive), workforce role title source-of-truth + Entra drift governance, y SCIM internal collaborator provisioning viven en **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`** (contrato en `GREENHOUSE_IDENTITY_ACCESS_V2.md` + task-specs).

**Reglas duras (resumen):** **NUNCA** leer `value_full` directo en consumers (usar readers masked/snapshot/reveal con capability+reason+audit) ni loggear `value_full`/PII. **NUNCA** modificar `members.role_title` directo (usar `updateMemberRoleTitle`) ni dejar que Entra sobreescriba un HR override. **NUNCA** ejecutar los 6 writes del primitive SCIM fuera de `withTransaction` ni decidir merge automático en drift (throw + signal + humano). **NUNCA** poblar `members` SCIM sin `workforce_intake_status` + `azure_oid`.

### Capability ⇒ grant coverage + ROLE_CODES — invariantes (TASK-873/935)

**Regla cross-cutting (aplica a TODA task que agregue una capability):** al seedear una capability nueva en `capabilities_registry` (DB) + `entitlements-catalog.ts` (TS), **SIEMPRE** granteear-la a ≥1 rol real en `src/lib/entitlements/runtime.ts` **en el mismo PR**. El guard `src/lib/entitlements/capability-grant-coverage.test.ts` (CI) rompe el build si una capability `can()`-checked no tiene grant. **NUNCA** branchear `roleCodes.includes(...)` inline (usar `can(subject, cap, action, scope)`).

**Los 14 ROLE_CODES reales** (single source of truth `src/config/role-codes.ts`; el snapshot completo con descripciones + la tabla de roles fantasma viven en `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` → §`Capability grant coverage + ROLE_CODES`): internos — `efeonce_admin`, `finance_admin`, `finance_analyst`, `hr_payroll`, `hr_manager`, `efeonce_operations`, `efeonce_account`, `people_viewer`, `ai_tooling_admin`, `designer`, `collaborator`; cliente — `client_executive`, `client_manager`, `client_specialist`. **NUNCA** citar un rol fuera de esa lista** (roles fantasma `DEVOPS_OPERATOR`/`HR_ADMIN`/`commercial_admin`/`operations` NO existen → colapsan a `EFEONCE_ADMIN` / `HR_MANAGER`); verificar contra `role-codes.ts` antes de citar un rol en spec/grant/análisis.

### Design System Figma node linking (ver ≠ vincular) — invariantes (TASK-1072)

Los invariantes del linking superficie↔nodo AXIS del Design System (data-driven, ver ≠ vincular) viven en **`docs/tasks/complete/TASK-1072-designer-role-figma-node-linking.md` → §`Invariantes operativos para agentes`**. **NUNCA** resolver el mapeo ruta→nodo desde el TS hardcodeado en runtime (SSOT = `greenhouse_core.design_system_figma_nodes`); **NUNCA** persistir un vínculo cuyo `file_key` no sea AXIS; **NUNCA** mostrar el affordance de vincular a quien no tenga la capability `design_system.figma_node.link` (ver el DS ≠ poder vincular).

### Knowledge Platform + Nexa Intelligence — invariantes (TASK-1081, 1082, 1083, 1085, 1086, 1091, 1094, 1124, 1137)

Los invariantes operativos de Knowledge + Nexa — knowledge platform foundation (schema + source registry), ingestion (sanitize-before-chunk + quarantine), auto-ingest por webhook Notion, search API (golden questions), Nexa knowledge retrieval + citations, MCP/ecosystem lane, provider abstraction + router interno, doc-por-capas + doc gate, governed action runtime — viven en **`docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`** (verbatim; contrato por sub-área en `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `nexa-intelligence/`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`). **Invocar la skill `greenhouse-nexa-conversational` al tocar Nexa (chat/surfaces/prompt/tools/providers) o el corpus Knowledge.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** Nexa queryea `greenhouse_knowledge.knowledge_chunks` directo ni mete el corpus al prompt (lint `no-direct-knowledge-chunk-query`; consumir el contrato `knowledge-search.v1` / readers). **NUNCA** Nexa responde un dato de conocimiento sin citar ni inventa cuando `confidence=none`. **NUNCA** el LLM ejecuta un write — el loop es propose→confirm→execute (la acción gobernada muta sólo en el endpoint de confirmación humana). **NUNCA** retrieval agéntico retorna `agent_excluded`/`quarantined`/`restricted`. **NUNCA** instanciar un SDK LLM dentro de un dominio (Gemini/Anthropic via cliente canónico de `src/lib/ai/`); el secreto se resuelve server-side. **NUNCA** registrar un archivo Nexa nuevo sin agregarlo al `manifest.json` (doc gate).

### SQL Signal Reader Schema Validation Gate (TASK-893 hotfix #3, desde 2026-05-16)

Toda query SQL embebida en TS que aparezca en code paths productivos — especialmente signal readers, reliability queries, materializers, audit scripts — **debe validar sus assumptions de schema contra PG real antes de mergear**. `db.d.ts` (Kysely codegen) NO es source of truth — infiere DATE columns como `Timestamp` TS, lo cual lleva al bug class `EXTRACT(EPOCH FROM (date - date))` que produce `function pg_catalog.extract(unknown, integer) does not exist` en runtime.

**Bug class historico** (3 incidentes Sentry 2026-05-16 antes de las 12:00 UTC-4):

1. `column pe.superseded_by_entry_id does not exist` en GET /admin (commit 468505e5 hotfix).
2. `function pg_catalog.extract(unknown, integer) does not exist` en GET /admin (mismo commit).
3. `function pg_catalog.extract(unknown, integer) does not exist` en POST /reliability-ai-watch (commit bec374c8 hotfix).

Causa raíz comun: developers asumen tipos basados en `db.d.ts` (TS shapes inferred). En PG real:

- `date - date = integer` (días). `EXTRACT(EPOCH FROM integer)` NO existe.
- `timestamp - timestamp = interval`. `EXTRACT(EPOCH FROM interval)` OK.
- `date - integer = date`. `date + integer = date`.

**4 capas defense-in-depth canonical**:

#### 1. Lint rule `greenhouse/no-extract-epoch-from-date-subtraction` (mode error)

Detecta patterns SQL inseguros via 7 regex AST:

- `EXTRACT(EPOCH FROM (CURRENT_DATE - X))` — CURRENT_DATE es DATE.
- `EXTRACT(EPOCH FROM (X - CURRENT_DATE))` — mirror.
- `EXTRACT(EPOCH FROM (X::date - Y))` — cast explícito a DATE dispara bug.
- `EXTRACT(EPOCH FROM (X - Y::date))` — mirror.
- `EXTRACT(EPOCH FROM (MAX(*_date) - X))` — heurística: columnas con sufijo `_date` son típicamente DATE.
- `EXTRACT(EPOCH FROM (X.*_date - Y))` — column reference.
- `EXTRACT(EPOCH FROM (effective_from - start_date))` — caso TASK-890/TASK-872 canonical.

Modo `error` desde commit-1 (tolerancia cero — el bug class ya generó 2 Sentry alerts en producción).

#### 2. Smoke test pre-merge (canonical workflow)

Cuando un signal reader nuevo emerja o se modifique una query SQL existente, el dev DEBE ejecutar la query contra PG real via proxy ANTES de mergear:

```bash
# Levantar proxy
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432 &

# Smoke script canonical (one-shot, tira la query + valida no error)
cat > /tmp/_smoke-reader.ts <<'EOF'
import 'server-only'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  const r = await runGreenhousePostgresQuery(`<the new SQL query here>`)
  console.log('OK', r.length, 'rows')
}
main().catch(err => { console.error('FAIL:', err.message); process.exit(1) })
EOF

# Run con env
set -a && source .env.local && set +a
cp /tmp/_smoke-reader.ts scripts/_smoke-reader.ts
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/_smoke-reader.ts
rm -f scripts/_smoke-reader.ts
```

Si la query falla → fix antes de mergear. NO mergear assumiendo que `db.d.ts` es source of truth.

#### 3. Schema verification protocol canonical

Cuando se necesite saber el tipo real de una columna en PG:

```bash
pnpm pg:connect:shell
greenhouse_app=> SELECT data_type FROM information_schema.columns
                 WHERE table_schema='greenhouse_finance'
                   AND table_name='account_balances'
                   AND column_name='balance_date';
```

O via TS:

```ts
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
const r = await runGreenhousePostgresQuery(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema=$1 AND table_name=$2
`, ['greenhouse_finance', 'account_balances'])
```

**Reglas para columnas DATE vs TIMESTAMP**:

- Sufijo `_date` (`balance_date`, `effective_from`, `start_date`, `hire_date`) → **típicamente DATE** en PG real.
- Sufijo `_at` (`created_at`, `updated_at`, `attached_at`, `lifecycle_stage_since`) → **típicamente TIMESTAMPTZ**.
- `CURRENT_DATE` → DATE. `NOW()` / `CURRENT_TIMESTAMP` → TIMESTAMPTZ.
- En duda → verificar con `information_schema.columns`.

#### 4. Canonical fix patterns

Cuando emerja la necesidad de "días entre dos fechas":

```sql
-- ✓ Pattern canonical #1: días directos (date - date = integer)
SELECT (CURRENT_DATE - MAX(balance_date))::int AS days_stale
FROM greenhouse_finance.account_balances;

-- ✓ Pattern canonical #2: cast explícito a timestamptz si necesitas epoch
SELECT EXTRACT(EPOCH FROM ((finished_at)::timestamptz - (started_at)::timestamptz)) AS seconds
FROM greenhouse_sync.source_sync_runs;

-- ✓ Pattern canonical #3: días con decimales
SELECT EXTRACT(DAY FROM ((x)::timestamptz - (y)::timestamptz)) AS days
FROM some_table;

-- ✗ Pattern PROHIBIDO (bug class TASK-893 hotfix)
SELECT EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(balance_date)))::int / 86400 AS days
FROM greenhouse_finance.account_balances;
-- Runtime: ERROR — function pg_catalog.extract(unknown, integer) does not exist
```

**⚠️ Reglas duras**:

- **NUNCA** confiar en `db.d.ts` (Kysely codegen) como source of truth de tipos PG. Es estimate inferred — DATE columns aparecen como `Timestamp` TS sin distinción.
- **NUNCA** usar `EXTRACT(EPOCH FROM (X - Y))` cuando X o Y es DATE. Use `(X - Y)::int` para días directos o cast a `::timestamptz` ambos lados.
- **NUNCA** mergear un signal reader nuevo o reliability query sin haber ejecutado la query al menos una vez contra PG real via proxy. Lint rule mecánica catch los patterns conocidos; smoke test catch el rest.
- **NUNCA** fixear el bug class en un solo callsite cuando emerja por Sentry alert. Hacer audit global (`grep -rn 'EXTRACT(EPOCH FROM' src/ services/`) + fixear TODOS los broken callsites en un solo commit + agregar lint rule + smoke test pre-merge.
- **NUNCA** desactivar la lint rule `greenhouse/no-extract-epoch-from-date-subtraction` para callsites legítimos sin agregar override block explícito en `eslint.config.mjs`. Override block requiere razón documentada en comentario.
- **SIEMPRE** que un nuevo reader/query emerja, validar contra PG real via proxy ANTES de mergear. Schema verification protocol canonical es 1-line query a `information_schema.columns`.
- **SIEMPRE** que el bug class se manifieste vía Sentry alert, escalation es: (1) audit global, (2) fix sistemático, (3) lint rule update (si falta cobertura), (4) CLAUDE.md update. NO fixear un callsite y shippear.

**Spec canónica**: lint rule en `eslint-plugins/greenhouse/rules/no-extract-epoch-from-date-subtraction.mjs` + tests en `__tests__/`. Override block en `eslint.config.mjs`.

### Payroll/Workforce — participation/exit/leave/reconciliation/offboarding invariants (TASK-890, 891, 892, 893, 895)

Los invariantes operativos de payroll participation/exit — workforce exit payroll eligibility (lanes), payroll participation window (prorrateo), leave accrual participation-aware (feriado CL Art 67), person 360 relationship reconciliation, offboarding closure completeness — viven en **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`** (verbatim; contrato por sub-área en sus specs `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` / `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` / `GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` / `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`). **Invocar la skill MANDATORIA `greenhouse-payroll-auditor` al tocar payroll/finiquito/KPI ICO.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** filtrar inclusión payroll inline en SQL embebido (usar `resolveExitEligibilityForMembers`/`isMemberInPayrollScope`). **NUNCA** rescale monetary fields post-`buildPayrollEntry` para mes parcial (escalar la compensación ANTES; el calculator recomputa deducciones + gratificación cap + retención SII). **NUNCA** computar accrual de feriado legal inline desde `hire_date` (resolver participation-aware behind flag). **NUNCA** ejecutar `DELETE` de `person_legal_entity_relationships` (supersede append-only) ni auto-mutar Person 360 desde un read path. **NUNCA** activar los flags de participation/exit en prod sin las dependencias de flag + staging shadow + sign-off HR.

### Contractor Engagements / Payables — invariantes (dominio EPIC-013, TASK-790…981)

Los invariantes operativos del dominio contractor — engagements, invoice assets, work submissions, payables→Finance bridge, honorarios CL (retención SII), international/provider boundary + FX policy, self-service hub, closure + transition controls, remittance advice, agreed-amount SoD + guardrail, bank settlement, due-date/SLA, monthly payment run, run report, paid lifecycle + email, double-rail exclusion + current work classification, employee→contractor connected command, compensation tuple drift — viven en **`docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` → §"Invariantes operativos para agentes (TASK-790…981)"** (contrato + state machines + boundaries + signals + capabilities por sub-dominio, verbatim). **Cargar esa spec al tocar `src/lib/contractor-engagements/**` o el settlement de contractor payables en `src/lib/finance/**`.**

**Boundary duro bidireccional (aplica también desde payroll/finiquito, NO solo desde contractor):** el dominio contractor **NUNCA** escribe/muta `payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements`/`final_settlement_documents` ni recalcula payroll/compensación; el payout del contractor **NUNCA** entra como payroll dependiente ni dispara finiquito laboral (su cierre es `contractor_closure`, **NUNCA** finiquito); no aplica deducciones estatutarias Chile a honorarios (solo retención SII versionada). **SIEMPRE** correr como gate de cierre al tocar este dominio o su transición: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde — cualquier rojo en finiquito/offboarding es regresión, no "test ajeno".

### Navigation Reachability Governance (TASK-982, desde 2026-06-01)

Toda ruta real bajo `src/app/(dashboard)/**/page.tsx` **debe ser alcanzable** por navegación. Cierra el bug class **"superficie huérfana"** (disparador: `/hr/contractors/new` onboarding TASK-976 sin menú ni botón → solo por URL). Es el **espejo navegacional de TASK-827** (ahí la señal `role_view_fallback_used` detecta drift `viewCode↔DB`; acá el gate detecta drift `ruta↔nav`).

**Contrato de alcanzabilidad** — una ruta `(dashboard)` es alcanzable si cumple UNA de:
- (a) es target de un link de navegación interno en `src/` (`href` / `router.push|replace` / `redirect|permanentRedirect`, literal string),
- (b) está declarada como **child route** en `src/lib/navigation/route-reachability-manifest.ts` (sub-acción reached desde un parent surface — header CTA, row action, inline link, tab), o
- (c) es ruta dinámica (contiene `[segment]`, reached por click de fila).
Mockups (`**/mockup/**`) excluidos.

**Patrón canónico header primary-action**: todo workbench/lista con ruta `…/new` (crear) expone esa ruta como **1 botón primary contained** ("Nuevo X", `tabler-plus`) en su header, gated por la capability de crear. Regla greenhouse-ux: 1 primary contained + N tonal (las acciones contextuales bajan a tonal). Patrón fuente: `ContractorAdminWorkbenchView` "Nuevo contractor" → `/hr/contractors/new`.

**Doctrina IA de dominio multi-superficie** (4 sistemas de nav, Rosenfeld): un workbench por (dominio × audiencia) anclado en la casa de la audiencia (NO un grupo de menú nuevo por dominio); header con acción primaria; tabs locales cuando el workbench tenga >1 vista; drawers por fila para acciones por-entidad; ⌘K como red supplemental. Reusable por TASK-797/798.

**⚠️ Reglas duras**:
- **NUNCA** crear un `page.tsx` bajo `(dashboard)` sin hacerlo alcanzable por (a)/(b)/(c). El gate `pnpm route-reachability-gate` lo detecta.
- **NUNCA** declarar una ruta-hija en el manifest sin `parent` + `via` + `reason`. El manifest es el SSOT tipado; el gate lo parsea por `route: '...'` (mantener ese formato literal).
- **NUNCA** centralizar un dominio multi-superficie en un grupo de menú nuevo. Organizar por audiencia/mental-model (regla dura IA). NUNCA por backend schema.
- **NUNCA** poner 2 primary contained en un header. La acción de crear es la primary; las contextuales (selection-dependent) bajan a tonal.
- **NUNCA** mover un item de menú a otra sección sin preservar su `canSeeView(viewCode)` filter (la capability NO cambia con el anclaje — caso TASK-982 Slice 1b: "Pagos a contractors" reubicado a Nómina conservando `finanzas.contractor_payables`).
- **SIEMPRE** que emerja un dominio nuevo con ruta `…/new` o `…/create`, agregar el header CTA + (si no es link estático) declararla en el manifest. **El gate corre en `--strict` desde TASK-983** (el backlog legacy de 19 se triagió a 0): un `page.tsx` huérfano nuevo **bloquea el build**.
- El gate reconoce 5 formas de alcanzabilidad (todas determinísticas, NUNCA heurística fuzzy `path:`/`to:`): (1) `href:`/`href=`/`push`/`replace`/`redirect` con string literal, (2) los mismos con **template literal** (`` `/ruta?x=${id}` `` → prefijo estático), (3) **`routes: ['/a','/b']`** arrays (registry data-driven, ej. `AdminCenterView` DomainCard), (4) child declarada en el manifest, (5) dinámica `[id]`.

**Gate**: `scripts/ci/route-reachability-gate.mjs` (`pnpm route-reachability-gate [--strict]`), corre en `ci.yml` warn mode. Manifest SSOT: `src/lib/navigation/route-reachability-manifest.ts`. Spec: `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md`. Skills de diseño: `info-architecture` + `greenhouse-ux`.

### Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16)

Cuando se migra un bridge identity / lookup table de una store legacy (BQ direct, manual, `members.<columna>`) a una nueva store canónica (PG `identity_profile_source_links`, source_links, etc.), la PR que hace el cutover **debe** incluir 3 invariantes atómicos en el mismo PR. Sin esto, la cutover degrada silenciosamente y el bug class se manifiesta días después en consumers downstream (ICO, payroll, capacity, cost attribution).

**Bug class canónico (2026-05-16)**: TASK-877 cambió `loadNotionMemberMapPostgresFirst` para preferir PG sobre BQ. La condición `if (map.size > 0) return PG; else BQ fallback` aceptó un mapa parcial (2 entries de SCIM) como "PG está activa", silenciando BQ fallback que tenía 6 entries correctas. Resultado: cobertura del bridge cayó de 95%+ → 3.7% durante 2 días. Materializer ICO wipeaba metrics_by_member cada noche y reinsertaba vacío → bonificaciones OTD/RpA proyectadas colapsaron a $0 para todos los colaboradores.

**Invariantes obligatorios al hacer cutover**:

1. **Migration de backfill atómico en el MISMO PR**: una migration que copia los datos canónicos de la store legacy a la store nueva. Idempotente (UPDATE conditional sobre prev value), con anti pre-up-marker DO block que verifique post-INSERT count == expected. Pattern fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`.

2. **Reliability signal canónico de coverage drift**: detector que mide cobertura del bridge en tiempo real. Steady = baseline esperado (puede ser 60% si hay externos legítimos, o 100% si solo internal). Severity: ok / warning (caída significativa) / error (regresión sistémica). Pattern fuente: `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`.

3. **NUNCA gate `if (result.size > 0) return primary`**: el contador "primary tiene algo" NO es válido para decidir "primary está completa". Patrones canónicos para resolver multi-source:
   - **Always UNION** ambas fuentes + dedup + log diff (más resiliente, más cost). Recomendado por default.
   - **Parity check**: shadow-read secondary en paralelo + assert `|primary - secondary| < tolerance` antes de aceptar primary.
   - **Coverage threshold**: `if (primary.size >= expected_minimum)` donde `expected_minimum` viene de un cálculo upstream (e.g. COUNT(*) en `members` activos).

**⚠️ Reglas duras**:

- **NUNCA** mergear cutover de un bridge identity (Notion↔member, HubSpot owner↔member, Azure OID↔member, similares) sin migration de backfill atómico en el mismo PR.
- **NUNCA** decidir "store A está activa" basándose en `if (result.size > 0)` cuando la respuesta correcta es "A está completa". Una store puede retornar 2 entries de 10 esperadas y eso NO es completa.
- **NUNCA** introducir un nuevo bridge resolver canónico sin reliability signal de coverage drift en el mismo PR.
- **NUNCA** sobrescribir bulk `members.notion_user_id` (o equivalentes) desde un script sin transacción atómica + verificación pre-state (UPDATE conditional sobre valor previo conocido).
- **NUNCA** asumir que un cutover funcionó porque "el resolver retorna algo". Verificar coverage % concreto en producción dentro de las primeras 24h post-merge.
- **SIEMPRE** que un bug afecte UNIFORMEMENTE a todos los entities downstream, sospechar primero del bridge / resolver / config compartida ANTES que del calculator per-entity. El bug del 2026-05-16 ocupó 4 horas de diagnóstico que hubieran sido 30 min si se hubiera empezado por el bridge.

**Spec canónica**: `src/lib/identity/reconciliation/notion-member-map.ts` (resolver canónico, post-TASK-877). Signal canónico: `identity.notion_bridge.coverage_drift` en `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`. Migration fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`. Patrones fuente: TASK-742 (defense-in-depth 7-layer), TASK-720 (`instrumentCategoriesWithoutKpiRule` detector), TASK-571/766/774 (VIEW canónica + helper + signal).

### ICO / Delivery Metrics — invariantes (TASK-900, 901, 903, 908, 909, 910, 912, 913, 916, 921, 922, 923, 943)

Los invariantes operativos del dominio ICO / delivery-metrics — materializer hardening (MERGE + freshness gate + tracking), Nexa AI Signals append-only event log, status transition foundation, delivery metrics ownership boundary (Notion = OS / Greenhouse = motor), metrics progressive migration (8 stop-gates + demo), Notion demo teamspace sandbox, RpA V2 demo + productive pipeline, Notion status transition capture, FTR/OTD/Due-Date/Attributable-Lateness — viven en **`docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`** (verbatim, con la spec canónica por sub-área citada en cada bloque: `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`, `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md`, `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`, `metrics/ATTRIBUTABLE_LATENESS_V1.md`). **Invocar la skill `greenhouse-ico` al tocar `src/lib/ico-engine/**`, `src/lib/notion-metrics/**` o los materializers ICO.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** `DELETE FROM ai_signals`/`ai_prediction_log` (append-only event log; leer la VIEW `*_current`). **NUNCA** un DELETE+INSERT sobre una tabla materializada de ICO sin pasar por `runIcoMaterializerCycle` (freshness gate + MERGE, NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`). **NUNCA** crear/editar una fórmula Notion para una métrica ICO (Notion = OS, Greenhouse = motor; writeback a `[GH] <métrica>` read-only). **NUNCA** computar bonus para demo members ni mezclar demo events con productivos (tablas/secrets/webhook físicamente separados). **NUNCA** flip de writeback productivo sin los 8 stop-gates del ADR Strangler.

### Canonical Organization Write SSOT invariants (TASK-991, desde 2026-06-02)

TODA derivación de `organization_type` pasa por `deriveOrganizationType` (`src/lib/account-360/organization-type.ts`, SSOT) y TODA escritura de la fila `greenhouse_core.organizations` que toque `organization_type`/`lifecycle_stage` reconcilia ambos. Cierra el bug class fuente (Grupo Berel): las puertas se repartían las columnas de `organizations` sin SSOT — la puerta HubSpot (`createPartyFromHubSpotCompany`) escribía `lifecycle_stage`+`hubspot_company_id` pero NUNCA `organization_type`/`tax_id`/`country`/`legal_name`, dejando `active_client` con `organization_type='other'` (invisible en Finanzas) + `country='CL'` ciego (Berel es MX) + `public_id` NULL.

- `organization_type` y `lifecycle_stage` son ortogonales pero deben reconciliarse: `active_client ⇒ client/both`, `provider_only ⇒ supplier`, dual ⇒ `both`, prospect/opportunity ⇒ `other`. `deriveOrganizationType({lifecycleStage, hasClientRole, hasSupplierRole, currentType})` es la ÚNICA fuente (reemplaza `promoteToClientCapableType` inline). NUNCA degrada un rol ya adquirido. NO incluye `efeonce_internal` (la operating entity usa el flag `is_operating_entity`, no `organization_type`).
- **Los TRES writers de `organization_type`** lo derivan: (1) `upsertCanonicalOrganization` (`organization-identity.ts`, writer canónico de las puertas finance/supplier — siempre deriva, no gated), (2) `createPartyFromHubSpotCompany` (puerta HubSpot INSERT — gated), (3) `promoteParty` (`commands/promote-party.ts`, reconcilia el type en el MISMO UPDATE al promover a active_client/provider_only — gated). `promoteParty` es el ÚNICO writer de `lifecycle_stage` (sweeps/overrides funnelean por él).
- `deriveOrganizationType` NO es columna GENERATED (necesita inputs de rol que no viven solo en el lifecycle). Es columna gobernada por los writers + 4 signals (drift) + un CHECK DB `organizations_type_lifecycle_consistent` **diferido a post-release** (ver abajo). Defense-in-depth en producción inmediata: writers (app, default ON) + signals; el CHECK es la capa DB que se agrega cuando el código nuevo está en TODOS los runtimes.
- `upsertCanonicalOrganization` llena `public_id` + `origin` en cada INSERT. Modo `overrideIdentity` (remediación dirigida, ej. country CL→MX) sobreescribe identidad provista; default COALESCE preserva (no-regresión).
- `country`/`tax_id` se derivan del origin, NUNCA default ciego. La puerta HubSpot propaga `crm.companies.country_code` (NULL honesto si falta), no el default de columna `'CL'`. `tax_id` queda operator-supplied (HubSpot no trae RFC confiable).
- 4 reliability signals (subsystem `Commercial Health`, steady=0): `commercial.organization.type_lifecycle_drift` (error>0), `commercial.organization.incomplete_identity` (warning, acotado a client-grade — NO a prospects), `commercial.client.active_without_profile`, `commercial.client.active_without_space`.
- **Kill-switch `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` (default ON)**: gatea el comportamiento corrector de la puerta HubSpot (INSERT) + `promoteParty` (UPDATE). Default ON = la escritura correcta es el comportamiento por defecto en TODOS los runtimes sin setear env por runtime (evita el drift dual-env, que es la clase de bug que esta task combate). Solo `=false` lo apaga (emergencia). El helper finance/supplier NO está gated (siempre canónico).
- **CHECK `organizations_type_lifecycle_consistent` — DIFERIDO a post-release (hazard de deploy-ordering)**: `active_client ⇒ organization_type IN (client,both)`. NO está aplicado en la DB (el Cloud SQL `greenhouse-pg-dev` es compartido por TODOS los runtimes; aplicarlo mientras producción corre el código viejo —que aún escribe `active_client+other`— rompería el HubSpot sync de prod con un CHECK violation). Sin el CHECK, los writes legacy del código viejo siguen permitidos → la ventana de deploy es segura (código nuevo escribe canónico, código viejo escribe legacy-pero-permitido; el signal `type_lifecycle_drift` lo cubre). Se aplica como **paso manual post-develop→main** (cuando el código nuevo esté en prod), como su propia migración `pnpm migrate:create`. SQL canónico: `ALTER TABLE greenhouse_core.organizations ADD CONSTRAINT organizations_type_lifecycle_consistent CHECK (lifecycle_stage IS DISTINCT FROM 'active_client' OR COALESCE(organization_type,'other') IN ('client','both')) NOT VALID;` luego `VALIDATE CONSTRAINT` (idempotente, guarded). Owner del DROP/ADD = `greenhouse_ops`.
- Remediación de orgs a medias: SIEMPRE vía `scripts/commercial/remediate-half-baked-orgs.ts` (dry-run/apply/allowlist/actor/reason/expected-count abort), que pasa por `upsertCanonicalOrganization`. NUNCA SQL directo.

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` (account-360 doors) fuera de `upsertCanonicalOrganization`. Toda puerta es caller.
- **NUNCA** hand-setear `organization_type` inconsistente con el lifecycle. Usar `deriveOrganizationType`. Cualquier writer nuevo de `lifecycle_stage='active_client'` DEBE setear el type en el mismo statement (sino, cuando el CHECK post-release esté activo, lo rechaza).
- **NUNCA** dejar `lifecycle_stage='active_client'` con `organization_type='other'`. Los writers lo reconcilian; el signal lo detecta; el CHECK (DB, post-release) lo bloquea.
- **NUNCA** default ciego `'CL'` en escrituras de sync. Derivar del origin; NULL explícito si falta.
- **NUNCA** aplicar el CHECK `organizations_type_lifecycle_consistent` contra el Cloud SQL compartido mientras producción corra el código viejo (pre develop→main). Es el hazard de deploy-ordering que rompería el HubSpot sync de prod. Aplicarlo SOLO post-release, cuando el código nuevo esté en todos los runtimes. Una vez activo el CHECK: **NUNCA** apagar el kill-switch (`=false`) sin dropear primero el CHECK (la puerta legacy volvería a producir `active_client+other` → rechazo).
- **SIEMPRE** que emerja una puerta nueva de nacimiento de org, hacerla caller del helper SSOT + setear `origin`.

**Spec canónica**: `docs/tasks/in-progress/TASK-991-canonical-client-birth-lifecycle.md` + audit `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md`. Migración aplicada: `20260602144943699` (origin, additivo seguro). CHECK `organizations_type_lifecycle_consistent` = paso manual post-release (no migración auto-aplicable, por el deploy-ordering). Orquestador lifecycle + wizard = TASK-992.

### Client Lifecycle Orchestrator invariants (TASK-992, onboarding V1.0 desde 2026-06-03)

`greenhouse_core.client_lifecycle_cases` es el agregado canónico del ciclo de vida del cliente (`onboarding | offboarding | reactivation`) — espejo comercial de TASK-760 (offboarding de colaboradores). V1.0 implementa SOLO `onboarding` (+ scaffolding `reactivation`); `offboarding` queda diferido. Vive detrás del flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (default OFF — el código está live en `develop`, las tablas vacías no se consumen). Implementa `GREENHOUSE_CLIENT_LIFECYCLE_V1` §5-§13 verbatim. Módulo: `src/lib/client-lifecycle/` (barrel pure: `types.ts` + `state-machine.ts`; `store.ts` + `commands/**` + `api-helpers.ts` son server-only, importados directo — patrón TASK-822).

**4 tablas** (`greenhouse_core`): `client_lifecycle_cases` (aggregate + state machine), `client_lifecycle_case_events` (append-only, anti-UPDATE/DELETE triggers), `client_lifecycle_checklist_templates` (declarativo, versionado, append-only), `client_lifecycle_checklist_items` (snapshot materializado al abrir). Migración `20260603004341038`. Seed `standard_onboarding_v1` (10 items §5.5 verbatim). Defensa-en-profundidad DB: CHECK status/kind enums + UNIQUE partial (un caso activo por `(organization_id, case_kind)`) + trigger `client_lifecycle_case_transition_check` (matriz §6.3 + gate "no completar con required+blocking pendientes salvo override vía `SET LOCAL app.client_lifecycle_blocker_override='true'`").

**5 comandos canónicos** (`commands/**`, atómicos + idempotentes + outbox v1, dual-mode `client?: PoolClient`): `provisionClientLifecycle` (idempotente por `(org, kind)`), `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`. Cada mutación appendea `client_lifecycle_case_events` + emite el evento `client.lifecycle.*` v1 **dentro de la misma tx**. El cascade del `.completed` (onboarding) invoca `instantiateClientForParty` si no existe (swallow `OrganizationAlreadyHasClientError`).

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` desde el lifecycle. El org row es exclusivo de `upsertCanonicalOrganization` (TASK-991), invocado por el wizard composer (Slice 2) ANTES de `provisionClientLifecycle(organizationId)`. El lifecycle recibe un `organizationId` ya existente.
- **NUNCA** invocar `instantiateClientForParty` ni `archiveClientForParty` directo desde UI/route — siempre como cascade del case completion (o desde el wizard composer en su propia tx).
- **NUNCA** UPDATE/DELETE sobre `client_lifecycle_case_events` (triggers append-only). Para correcciones, INSERT nueva fila.
- **NUNCA** transicionar el case fuera de la matriz §6.3. La transición se valida en TS (`assertCaseTransition`) Y en el trigger DB (defensa-en-profundidad). `completed`/`cancelled` son terminales.
- **NUNCA** completar un caso con ítems required+blocking pendientes sin pasar por `overrideBlockers` (capability `client.lifecycle.case.override_blocker`, EFEONCE_ADMIN only, `overrideReason >= 20`). El trigger DB lo bloquea salvo el session var de override.
- **NUNCA** materializar checklist sin `template_code` activo. El comando lee `readActiveTemplateItems`; el signal `client.lifecycle.case_without_template` detecta drift. `template_code` es columna snapshot (no FK — templates usa PK compuesta).
- **NUNCA** modificar un template existente; crear versión nueva (`standard_onboarding_v2`) + deprecar la vieja vía `effective_to`. Los casos snapshot el template al abrirse.
- **NUNCA** loggear `reason`/`cancellation_reason`/`override_reason` raw — usar `redactSensitive` / `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`. NUNCA `Sentry.captureException` directo.
- **NUNCA** error API crudo: las rutas usan `authorizeLifecycle(capability)` + `mapLifecycleError` (es-CL, `redactErrorForResponse` en el path 502).
- **NUNCA** seedear una capability `client.lifecycle.case.*` sin grant en `runtime.ts` mismo PR. Grants colapsados a ROLE_CODES reales (anti-rol-fantasma TASK-935): open/resolve → EFEONCE_ADMIN + FINANCE_ADMIN; advance/read → route_groups `commercial`/`finance` + admins; override_blocker → EFEONCE_ADMIN only. La spec V1 §8 menciona `commercial_admin`/`operations` que NO existen.
- **SIEMPRE** que un comando nuevo mute el case, emitir el evento `client.lifecycle.*` v1 + appendear el case_event en la misma tx. 5 reliability signals (subsystem Commercial Health, steady=0; override anomaly steady<3/30d): `onboarding_stalled`, `checklist_orphan_items`, `cascade_dead_letter`, `case_without_template`, `blocker_override_anomaly_rate`.

**Capabilities**: `client.lifecycle.case.{open,advance,resolve,override_blocker,read}` (módulo `commercial`). API §9: `GET/POST /api/admin/clients/[organizationId]/lifecycle[/onboarding]`, `PATCH /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]`, `POST .../resolve`, `GET .../cases`, `GET .../health`. Eventos: 8 `client.lifecycle.*` v1 (EVENT_CATALOG Delta 2026-06-03).

**Slice 2 (puerta única / wizard) — desde 2026-06-03**: el composer canónico `provisionClientFromWizard` (`src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`) es la ÚNICA puerta de alta de cliente: en UNA tx atómica hace `upsertCanonicalOrganization` (SSOT TASK-991, identidad + client role) → `instantiateClientForParty` (Cliente + `client_profiles` con moneda de facturación, **incl. MXN**) → `promoteParty('active_client')` (**único writer canónico de `lifecycle_stage` + history**; su instantiate interno es no-op porque el cliente ya existe → preserva el perfil MXN) → `provisionClientLifecycle` (abre el caso). Endpoint: `POST /api/admin/clients/lifecycle/provision`. La moneda se valida contra `CURRENCY_DOMAIN_SUPPORT.finance_core ∪ {UF,UTM}` (derivada del registry, NO hardcode); `billingDefaults.paymentCurrency` widened a `CLP|USD|MXN|UF|UTM`. Pickers + gate "ya existe" buscan el backbone canónico vía `GET /api/admin/clients/lifecycle/org-search`. UI runtime: `/agency/clients/new` (`ClientOnboardingView`, gated por flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` + capability `client.lifecycle.case.open`), **cableada 1:1 del mockup APROBADO por copy-and-patch** (mismo JSX → paridad visual estructural; solo cambian data + commit).

**⚠️ Reglas duras Slice 2**:
- **NUNCA** parir un cliente fuera de `provisionClientFromWizard` (o del cascade de `resolveLifecycleCase`). El wizard es la puerta única; el drawer de Finanzas se redefine a "completar facet" (Slice 2c, pendiente), NO pare.
- **NUNCA** escribir `lifecycle_stage` desde el composer salvo vía `promoteParty` (history + reconcile type). `upsertCanonicalOrganization` NO recibe `lifecycleStage` en este path.
- **NUNCA** instanciar el cliente DESPUÉS de `promoteParty` (su instantiate usaría CLP default). Orden canónico: upsert → instantiate(moneda) → promote.
- **NUNCA** hardcodear la moneda de facturación; validar contra el registry. `client_profiles.payment_currency` no tiene CHECK en PG (MXN ya aceptado).
- **NUNCA** modificar/borrar los `*/mockup/*` ni implementar el runtime dentro de `/mockup/`. El runtime vive en `src/views/greenhouse/agency/clients/*` (fuera de `/mockup/`) e **iguala visualmente** el mockup. Cualquier estado/visual NUEVO (loading/degraded de pickers, código del SuccessScreen, entrada de nav) pasa por el loop product-design (`state-design`/`modern-ui`/`greenhouse-ux`) + GVC `fe:capture:diff` ANTES de pintarse — NO freehand.
- **SIEMPRE** verificar paridad con `pnpm fe:capture:diff <mockup-capture> <runtime-capture>` antes de cerrar Slice 2.

**Pendiente Slice 2c + 3**: redefinir `CreateClientDrawer` → "completar facet financiero"; triggers HubSpot deal/adopt → onboarding case `draft`; timeline lifecycle en Account 360 (TASK-611). Ítems para el loop GVC: estados loading/degraded de pickers (`state-design`), código legible del caso en SuccessScreen (`public_id` en `client_lifecycle_cases`?), entrada de nav discoverable (exponer flag al menú client).

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` + `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`. Patrón fuente: TASK-760 (offboarding de colaboradores). Migración: `20260603004341038`.

### Client Portal User Invitation SSOT (TASK-1001, desde 2026-06-03)

Toda creación de un usuario de portal cliente (`client_users` + `user_role_assignments` + email de invitación) pasa por el **helper canónico SSOT** `inviteClientPortalUser` (`src/lib/client-onboarding/invite-client-portal-user.ts`). Extraído de `/api/admin/invite` (que ahora lo consume con `onExisting:'error'`, preservando el 409). El onboarding lo consume con `onExisting:'ensure'` (idempotente: usuario existente → asegura rol additive, no duplica fila, no re-emaila). La invitación de personas del portal en el alta vive en el **ítem de checklist canónico existente `provision_client_users_access`** (NO se crea ítem paralelo) del timeline de onboarding (TASK-992), vía el `PortalUsersPanel` que siembra candidatos desde HubSpot (`listClientPortalPersonCandidates`) y sugiere rol por cargo (`suggestClientPortalRole`).

**⚠️ Reglas duras**:

- **NUNCA** crear `client_users` ni `user_role_assignments` por SQL inline para portal users. Pasar por `inviteClientPortalUser` (single source of truth, tx atómica, emite `role.assigned` v1 in-tx para los roles recién asignados).
- **NUNCA** asignar a un portal user un rol fuera de los 3 client_* (`client_executive`/`client_manager`/`client_specialist`). El helper valida `isRoleCode`; el endpoint valida `isClientPortalRole`. NUNCA un rol interno (collaborator/efeonce_*).
- **NUNCA** usar `updateUserRoles` para invitar (reemplaza el set completo → destructivo). La asignación es additive (`ON CONFLICT DO NOTHING` + RETURNING para detectar el alta real).
- **NUNCA** invitar en el wizard de nacimiento. Vive en el checklist de provisioning (separación de concerns — mismo principio Notion/Teams TASK-998).
- **NUNCA** gatear la invitación solo con `client.lifecycle.case.advance`. Capability dedicada **`client.lifecycle.portal_user.invite`** (least-privilege: invitar otorga ACCESO, distinto de avanzar bookkeeping). Listar candidatos usa `client.lifecycle.case.read`. Grant en `runtime.ts` al tier advance (commercial/finance route_group + admins) — `capability-grant-coverage.test.ts` lo enforce.
- **NUNCA** resolver el `client_id` del body en el endpoint de invite. Se resuelve server-side desde la org (`resolveAccountScope`, anti-tamper). Sin Cliente → degrada honesto `client_not_ready`.
- **SIEMPRE** sembrar candidatos desde los contactos HubSpot ya capturados; el operador confirma/ajusta rol. Idempotente (dedup por email).

**Spec canónica**: `docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`. Helpers: `inviteClientPortalUser`, `suggestClientPortalRole`, `listClientPortalPersonCandidates` (`src/lib/client-onboarding/`). Sin migración (capability mirror de la familia TASK-992 catalog+runtime), sin reliability signal nuevo (ítem `required=FALSE`), sin evento nuevo (reuso `role.assigned`).

### Notion onboarding preflight — "configurado ≠ fluyendo" (TASK-1009, desde 2026-06-04)

La verificación de que un cliente nuevo **fluye de verdad al portal** (raw → client_id → readiness → template L1 → conformed → PG) pasa por el composer canónico `getNotionOnboardingReadiness(spaceId)` ([src/lib/integrations/notion-onboarding-preflight.ts](src/lib/integrations/notion-onboarding-preflight.ts)). Es **reuse-first**: compone los helpers de readiness/freshness que ya existen (`getNotionRawFreshnessGate`, `space_notion_sources.last_synced_at` de TASK-1007, `resolveSecretByRef`) y solo agrega los eslabones que ninguno cubría (#6 Estado mapeable a V1, #8 tareas en `greenhouse_delivery.tasks`, #4 client_id como verificación de TASK-1004). El evaluador puro `evaluateNotionOnboardingReadiness` es la SSOT de `readyToOnboard`. El gate es el ítem **bloqueante** `verify_notion_flowing` de `standard_onboarding_v1`.

**⚠️ Reglas duras**:

- **NUNCA** duplicar la validación de onboarding que el wizard/checklist ya hacen (estructura via `resolveClientCompleteness`, token+DBs via `notion/validate`). El preflight SOLO cubre el tramo "fluyendo" — si necesitás un check nuevo, agregalo como eslabón del composer, no como validador paralelo.
- **NUNCA** agregar aliases de status/título por cliente para "pasar" el check L1 (#6). El fix es alinear el template L1 del cliente en Notion (consistente con "Canonical task status vocabulary V1"). El check usa `normalizeTaskStatus` sobre los estados distintos del space — un alias custom enmascara el drift.
- **NUNCA** marcar `verify_notion_flowing` verde estando rojo. La auto-completación vive SOLO en `POST .../cases/[caseId]/notion-preflight` (reusa capability `client.lifecycle.case.advance`), que corre el preflight server-side y avanza el ítem **solo si `readyToOnboard`**. El space se resuelve del caso server-side (anti-tamper).
- **NUNCA** correr el preflight pesado (9 checks, BQ) por caso dentro del reliability dashboard. El signal `integrations.notion.onboarding_incomplete` es un COUNT PG O(1) sobre casos abiertos con el ítem pendiente >7d; el preflight pesado es on-demand (CLI/endpoint).
- **NUNCA** colapsar advisory y crítico: token (#1) y freshness (#9) son advisory (no bloquean `readyToOnboard` — el raw landing ya prueba el token); el resto es crítico. Un crítico en `degraded` (fuente caída) ⇒ NO listo (conservador).
- **SIEMPRE** que un eslabón nuevo del pipeline emerja (otra capa, otra tabla), agregalo como check del composer + su rama en el evaluador puro + test, no inline en consumers.

**Spec canónica**: `docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md` + Delta en `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`. Migración aditiva `20260604224502258`. CLI `pnpm notion:onboarding-preflight <spaceId> [--json]`. Verificado live: Berel 9/9 verde.

### Onboarding checklist evidence layer — el estado se deriva de evidencia real, no se marca a ciegas (TASK-1017, desde 2026-06-05)

El estado de un ítem **auto-derivable** del checklist `standard_onboarding_v1` se deriva del estado REAL del runtime, no se marca a ciegas. La capa vive en `src/lib/client-lifecycle/evidence/` y extiende el patrón thin + reuse-first de TASK-1009 (`verify_notion_flowing`) a los 6 ítems auto-derivables: `verify_hubspot_company_synced`, `assign_team_members`, `provision_notion_workspace`, `provision_communication_channels`, `provision_client_users_access`, `confirm_billing_setup`. Cada resolver **reusa** el reader/tabla canónica existente (HubSpot `getClientLifecycleStage`, Notion `getNotionOnboardingReadiness`, equipo/Teams/portal/facturación por su tabla) y clasifica en **`detected | pending | unverifiable`** vía un clasificador **puro** (testeable) + gatherer IO `settle`-wrapped. El composer `resolveOnboardingEvidence(caseId)` resuelve el scope (org→client→space) **una vez** y corre los 6 en paralelo. El endpoint `POST .../cases/[caseId]/verify-evidence` (auth `client.lifecycle.case.advance`) expone la evidencia y, detrás de flag, auto-completa. Cero migración / capability / outbox / tabla.

**⚠️ Reglas duras**:

- **NUNCA** clasificar evidencia como `pending` cuando la fuente falló. Error de IO → `unverifiable` (degradación honesta; la fuente está caída, ≠ "todavía no está hecho"). El gatherer va envuelto en `settle`; el clasificador es puro y nunca lanza.
- **NUNCA** componer la evidencia de los ítems en el read del timeline/inbox (hot path de listas). Es **on-demand** (botón "Verificar evidencia" → un endpoint batched por caso). Componerla en el read = N+1 sobre BigQuery (el preflight Notion solo hace ~6 queries BQ). Mirror exacto de TASK-1009.
- **NUNCA** auto-completar un ítem sin pasar por `canAutoCompleteFromEvidence` (decisión pura SSOT): cierra SOLO si evidencia `detected` + `requires_evidence=false` + estado `pending`/`in_progress`. **Anti-fake-green** (jamás con `pending`/`unverifiable`); **respeta el override manual** (jamás sobre `completed`/`skipped`/`not_applicable`/`blocked`).
- **NUNCA** auto-completar un ítem `requires_evidence=true` (p.ej. `provision_notion_workspace`): la evidencia del sistema NO reemplaza el asset humano requerido → muestra la evidencia pero queda manual.
- **NUNCA** auto-derivar los ítems **declarativos** (`confirm_legal_documents`, `declare_engagement_kind`, `declare_commercial_terms`, `declare_engagement_phases`): no tienen fuente automática, siguen manuales, sin evidencia inventada. `isAutoDerivableItem` es la lista cerrada canónica.
- **NUNCA** activar el flag `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED=true` sin validar la evidencia contra la realidad en ≥1 caso real por resolver (production verification sequence). La exposición read va sin flag; el auto-complete (mutación) es lo gated.
- **NUNCA** crear un sync nuevo para un ítem auto-derivable: se **componen** los readers/tablas canónicas existentes. Si emerge un ítem nuevo, agregar su resolver al registry reusando su reader canónico.
- **SIEMPRE** que emerja un ítem auto-derivable nuevo, agregar (a) su `item_code` a `AUTO_DERIVABLE_ITEM_CODES`, (b) su resolver (clasificador puro + gatherer settle), (c) tests del clasificador, y (d) la rama PG-queryable al signal `client.lifecycle.evidence_detected_not_marked` si su evidencia vive en PG.

**Spec canónica**: `docs/tasks/complete/TASK-1017-onboarding-checklist-item-evidence-auto-verification.md`. Helpers: `resolveOnboardingEvidence`, `canAutoCompleteFromEvidence`, `isAutoDerivableItem` (`src/lib/client-lifecycle/evidence/`). Signal: `client.lifecycle.evidence_detected_not_marked` (commercial, drift, PG-only, steady=0). Patrón fuente: TASK-1009 (composer thin + evaluador puro + degradación honesta + auto-complete solo-si-verde).

### Git hooks canonicos (Husky + lint-staged) — auto-prevention de errores CI

Repo tiene 2 hooks instalados via Husky 9 (`pnpm prepare` los activa
automaticamente al `pnpm install`):

- **`.husky/pre-commit`**: corre `pnpm exec lint-staged` → `eslint --fix` sobre
  archivos staged. Errores auto-fixable se aplican; errores no-fixable bloquean
  el commit. Latencia tipica < 5s (cache eslint en `node_modules/.cache/eslint-staged`).
- **`.husky/pre-push`**: corre `pnpm local:check` (`pnpm lint` full repo + `pnpm exec tsc --noEmit`).
  Bloquea push si hay 1+ error. Latencia tipica < 90s. Defense in depth sobre
  pre-commit (cubre archivos NO staged que otro agente pudo dejar rotos).

**Reglas duras**:

- **NUNCA** ejecutar `git commit --no-verify` o `git push --no-verify` sin
  autorizacion explicita del usuario. Bypassear los hooks rompe el contrato
  con el CI gate y deja errores que otro agente tiene que limpiar despues
  (anti-pattern: el ciclo de revert+repush que vimos pre-2026-05-05).
- **NUNCA** desinstalar / deshabilitar / mover los hooks sin discutir antes.
  Estan disenados para autoenforcement — todos los agentes (Claude, Codex,
  Cursor) los heredan al clonar el repo.
- Si un hook falla por causa ajena a tu cambio (e.g. lint warning preexistente
  en archivo NO tocado), arreglalo solo si la regla esta en `error`. Warnings
  no bloquean. Si error preexistente bloquea, documenta en commit message
  y abrir issue/task para el cleanup separado.
- Si necesitas saltar el hook por emergencia documentada (e.g. hotfix de
  produccion bloqueante), pide autorizacion al usuario primero, documenta el
  bypass en el commit message con razon + fecha + task de cleanup posterior.

**Beneficio para multi-agente**: cualquier agente (presente o futuro) que
clone el repo y haga `pnpm install` recibe los hooks automaticamente. El CI
gate sigue activo como tercera linea de defensa.

### Avatares de usuario — helper canónico (fuente única, desde 2026-06-05)

Toda resolución de la foto/avatar de un usuario pasa por el helper canónico **`resolveAvatarUrl(avatarUrl, userId)`** en [src/lib/person-360/resolve-avatar.ts](src/lib/person-360/resolve-avatar.ts). Es la **fuente única** para que NO haya fotos distintas por todos lados: los avatares se guardan como `gs://` en la DB y se sirven SIEMPRE por el proxy canónico `/api/media/users/{userId}/avatar`; el helper hace exactamente esa traducción (`gs://` + userId → proxy URL; cualquier otra URL → tal cual; null → null).

**⚠️ Reglas duras**:

- **NUNCA** componer `/api/media/users/${userId}/avatar` inline en un consumer (es justo la duplicación que el helper evita — había copias en `get-person-profile`, `my/organization/members`, `my/assignments`, `UserDropdown`, todas reemplazadas/a reemplazar por el canónico). Toda foto de usuario sale de `resolveAvatarUrl`.
- **NUNCA** usar `session.user.avatarUrl` crudo en un `<Avatar src>` — puede ser un `gs://` no servible. Pasarlo siempre por `resolveAvatarUrl(avatarUrl, userId)` primero.
- **`resolveAvatarUrl` es `import 'server-only'`** → en un componente cliente (`'use client'`) NO se puede importar. Patrón canónico: resolverlo en el **server component / route / reader** y pasar el `avatarUrl` ya resuelto como prop/campo del VM (el cliente solo renderiza `<Avatar src={vm.avatarUrl ?? undefined}>` con fallback a iniciales). Caso fuente: `OnboardingCasesInboxView` (TASK-1015) recibe `operator.avatarUrl` resuelto en su page server.
- **SIEMPRE** que un reader/route/VM exponga un avatar de usuario, mapearlo con `resolveAvatarUrl(rawAvatarUrl, userId)` (mirror de los facets person-360 / account-360 / people / finance responsibles que ya lo consumen).

### Otras convenciones

- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
