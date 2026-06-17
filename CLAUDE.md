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

### Notion Integrations Registry — token ↔ servicio ↔ scope canónico (desde 2026-05-22)

Existen **3 integraciones Notion productivas/no-productivas** + **1 dedicada al sandbox demo**. Cada una mapea a un secret GCP distinto, la usa un consumer distinto y tiene un scope de acceso (qué teamspaces puede ver) estrictamente delimitado. Conectar la integración equivocada a un teamspace es una violación de aislamiento (root cause investigado 2026-05-22: el sandbox demo quedó compartido con *BigQuery Sync*; no hubo fuga porque el demo nunca se registró en el mirror BQ del sync, pero fue mina latente).

| Integración Notion | Secret GCP / env var | Consumer | Scope permitido | Entorno |
|---|---|---|---|---|
| **BigQuery Sync** | `notion-token` (2026-03-08) | Cloud Run `notion-bq-sync` (sync legacy Notion → BigQuery, daily 03:00 Santiago) | SOLO teamspaces productivos registrados en `space_notion_sources WHERE sync_enabled=TRUE` (Efeonce + Sky) | Productivo |
| **Greenhouse** | env `NOTION_TOKEN` (staging/dev) | Runtime no-productivo (`dev-greenhouse`, preview, local) | Efeonce + Sky (staging/dev) | **Staging/Dev** |
| **Greenhouse PRD** | `notion-integration-token-greenhouse-prd` (2026-05-21) → env `NOTION_TOKEN` | Runtime Vercel prod + `ops-worker` (re-fetch status transitions TASK-912 + writeback `[GH]` properties TASK-916) | Efeonce + Sky (productivo) | Producción |
| **(dedicada demo)** | `notion-integration-token-greenhouse-metrics-demo` (2026-05-19) → `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` | `ops-worker` compute/writeback demo (TASK-913) | **SOLO** teamspace `Demo Greenhouse` (`36339c2f-…`) | Sandbox demo |
| **Por cliente (scoped, TASK-998)** | `notion-integration-token-greenhouse-<slug>` → `space_notion_sources.notion_token_secret_ref` (ej. `notion-integration-token-greenhouse-berel`, 2026-06-03) | sync per-space (pendiente en `notion-bigquery`) + checklist onboarding | **SOLO** el teamspace de ESE cliente (el token ES el scope) | Producción (clientes nuevos) |
| **Knowledge (TASK-1088)** | `notion-integration-token-greenhouse-knowledge` → env `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` | `NotionKnowledgeConnector` (ingesta operada por script/ops del corpus de conocimiento → `greenhouse_knowledge`; NO runtime del portal ni Notion live para una respuesta) | **SOLO** el teamspace Notion de conocimiento (compartido con esta integración) | Ops (ingesta de knowledge) |

**⚠️ Reglas duras**:

- **NUNCA** conectar **BigQuery Sync** ni **Greenhouse PRD** al teamspace `Demo Greenhouse`. El demo se conecta **SOLO** a la integración dedicada demo (`notion-integration-token-greenhouse-metrics-demo`), con permisos restringidos exclusivamente a ese teamspace. Esa es la integración canónica del demo (TASK-913) — ni BigQuery Sync, ni Greenhouse, ni Greenhouse PRD.
- **NUNCA** conectar **BigQuery Sync** a un teamspace que no deba llegar a BigQuery. Su endpoint `/discover` enumera **TODO lo que la integración puede ver** vía Notion search, bypassando `space_notion_sources` por completo — cualquier teamspace compartido con esta integración es contaminación potencial de BQ con un solo `/discover` o un flip de `sync_enabled`.
- **NUNCA** usar la integración **Greenhouse** (staging/dev) en producción ni **Greenhouse PRD** en staging/dev. El sufijo `PRD` separa los entornos; cruzarlos rompe el aislamiento prod/staging.
- **NUNCA** flipear `sync_enabled=TRUE` para el space demo en `space_notion_sources`. Está sembrado `FALSE` (migración `20260519120713456`) y ausente del mirror BQ — doble defensa que evita que el sync legacy lo procese aunque BigQuery Sync tuviera acceso.
- **NUNCA** "conectar todas las integraciones por las dudas" al crear un teamspace/database nuevo en Notion. Conectar **solo** la integración cuyo dominio corresponde al propósito del teamspace.
- **NUNCA** usar el secret `notion-token` (BigQuery Sync) ni `notion-integration-token-greenhouse-prd` (Greenhouse PRD) como fuente del token del pipeline demo. El demo resuelve su token exclusivamente vía `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` ([notion-demo-client.ts](src/lib/notion-metrics/notion-demo-client.ts)).
- **NUNCA** reusar el token de **Knowledge** (`notion-integration-token-greenhouse-knowledge`) para sync/discover/demo, ni reusar otro token para la ingesta de knowledge. El `NotionKnowledgeConnector` (TASK-1088) resuelve su token **solo** vía `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` ([notion-knowledge-client.ts](src/lib/knowledge/notion/notion-knowledge-client.ts)); el token está scoped al teamspace de conocimiento y NO debe compartirse con la integración de BigQuery Sync (su `/discover` enumera todo lo que ve → contaminación potencial del mirror BQ).
- **SIEMPRE** que emerja una integración Notion nueva (e.g. otro cliente, otro pipeline), agregarla a este registry con su secret + consumer + scope + entorno antes del primer uso, y enumerar a qué teamspaces se le concede acceso.

**Verificación operador-side** (no es código — son settings de Notion): la lista de integraciones conectadas a un teamspace se ve en Notion → teamspace → Settings → Connections. Para auditar fuga a BQ: `bq query 'SELECT source_database_id, space_id, COUNT(*) FROM efeonce-group.notion_ops.raw_pages_snapshot GROUP BY 1,2'` — todo `source_database_id` debe pertenecer a Efeonce (`spc-c0cf6478-…`) o Sky (`spc-ae463d9f-…`); cualquier `36339c2f…` (demo) es fuga.

### Notion teamspace linking — token POR teamspace + cómo enumerar DBs (TASK-998, desde 2026-06-03)

Para vincular el teamspace Notion de un **cliente nuevo** (Berel, ANAM, …) a Greenhouse, el modelo canónico es **una integración interna scoped SOLO al teamspace de ese cliente**, cuyo token **es el scope**. La integración compartida `notion-token` (BigQuery Sync) queda **solo para Efeonce/Sky legacy** — los clientes nuevos NO se agregan a ella (aislamiento duro; mismo principio que el token dedicado del demo, TASK-913).

**Hechos verificados live (2026-06-03, Grupo Berel) — qué NO funciona para enumerar teamspaces**:

- **La API REST de Notion NO enumera teamspaces.** `GET /v1/teams` → `400 invalid_request_url` (no existe). `POST /v1/search` devuelve data_sources cuyo `parent` es `database_id`, no teamspace → el nombre del teamspace **no está en REST**. Las DBs de un teamspace **NO comparten prefijo de id** (Berel: Tareas/Proyectos/Sprints=`35c39c2f`, "Wiki de Berel"=`98239c2f`, "Content Hub"=`35f39c2f`) → cualquier heurístico de prefijo es **inválido**.
- **El MCP claude.ai (`notion-get-teams`) SÍ enumera** teamspaces por nombre — pero usa el **OAuth personal interactivo** del operador (dueño del workspace, ve todo) y **NO es runtime-available** (absent en headless/cron, CLAUDE.md). Sirve para que un **agente** obtenga IDs durante el onboarding, NUNCA como dependencia del runtime.
- **El Cloud Run `notion-bq-sync` v3.0.0 `/discover` devuelve config snapshot, no discovery en vivo.** No se puede usar para enumerar el teamspace de un cliente nuevo.

**El gate real NO es discovery — es el ACCESO de la integración.** El token compartido `notion-token` da `404 object_not_found` en las DBs de Berel porque la integración no tiene acceso a ese teamspace. Ningún camino (REST, MCP, Cloud Run) puede leer un teamspace que no esté compartido con su credencial — por diseño de seguridad.

**Modelo canónico — token-por-teamspace (el token ES el scope)**:

1. El operador crea en Notion una **integración interna** (Settings → Developers → New connection) scoped al teamspace del cliente (capacidades: Leer/Actualizar/Insertar contenido) + copia el token `ntn_…`. Ej. live: conexión **"Greenhouse - Berel"** sobre el teamspace `Grupo Berel` (`35c39c2f-…`).
2. En el **checklist de onboarding** (item `provision_notion_workspace`, NO el wizard de nacimiento — separación de concerns), el operador pega el token. `discoverNotionDatabasesForToken(token)` ([src/lib/client-onboarding/notion-token-connect.ts](src/lib/client-onboarding/notion-token-connect.ts)) hace `POST /v1/search` (filter data_source, Notion-Version `2026-03-11`) → como el token está acotado, devuelve **SOLO las DBs de ese cliente** (cero cross-tenant) → auto-clasifica Tareas/Proyectos/Sprints por título (tolerante a espacio final/acentos/mayúsculas vía `classifyNotionDatabaseTitle`) → sugiere los 3 ids; el operador confirma/ajusta.
3. Al confirmar: el token se guarda en **GCP Secret Manager** (`notion-integration-token-greenhouse-<slug>`, ej. `notion-integration-token-greenhouse-berel`) con `printf %s` (sin newline) + se persiste el **`*_SECRET_REF`** en `greenhouse_core.space_notion_sources.notion_token_secret_ref` (columna TASK-998). **NUNCA el token crudo en PG/logs/Notion.** `notion_token_secret_ref` NULL = usar el `notion-token` compartido legacy (Efeonce/Sky).

**⚠️ Reglas duras**:

- **NUNCA** enumerar teamspaces Notion con `/v1/search` crudo + heurística de prefijo de id. La API no enumera teamspaces; las DBs de un teamspace no comparten prefijo. Usar el **token scoped por cliente** (el token = el scope) + clasificación por título.
- **NUNCA** cablear el MCP claude.ai (`notion-get-teams`) a un backend (Cloud Run, Vercel, ops-worker). Es OAuth interactivo, absent en headless. Solo un agente lo usa para obtener IDs durante onboarding.
- **NUNCA** agregar un teamspace de cliente nuevo a la integración compartida `notion-token` (BigQuery Sync) "para que el discover lo vea". Rompe el aislamiento duro. Cada cliente nuevo = su propia integración scoped + su propio token.
- **NUNCA** persistir el token Notion crudo en `space_notion_sources`, PG, logs ni el payload de un evento. Solo el `*_SECRET_REF`. El token va a Secret Manager con `printf %s` (Secret Manager Hygiene).
- **NUNCA** vincular el teamspace en el **wizard de nacimiento** del cliente. El vínculo vive en el **checklist de provisioning** (nacimiento ≠ provisioning de tooling — separación de concerns TASK-992/997).
- **SIEMPRE** que un token Notion se pegue en texto plano (chat, form sin enmascarar), tratarlo como expuesto: guardarlo en Secret Manager + recomendar rotación. El campo del form debe ser `type=password`, el POST server-side directo, sin echo.
- **SIEMPRE** que emerja una integración Notion nueva de cliente, agregarla al **Notion Integrations Registry** (arriba) con secret + consumer + scope + entorno antes del primer uso.

**Teams channel linking (lado Teams del mismo checklist)**: el bot Graph (`greenhouse-teams-bot-client-credentials`) **YA puede** listar teams + canales con los permisos actuales — verificado live: `GET /v1.0/teams` (vio "Berel - Efeonce") + `GET /v1.0/teams/{id}/channels` (vio "Squad Berel"). Sin permisos Azure nuevos. (Los chats 1:1 `/v1.0/chats` requieren `Chat.ReadBasic.All`, no concedido — fuera de scope; los canales son el target del registry `teams_notification_channels`.) El reader self-serve reusa `src/lib/integrations/teams/bot-framework/token-cache.ts`.

**Sync end-to-end por cliente nuevo — RESUELTO (TASK-1000 + TASK-1003, 2026-06-04)**: el Cloud Run `notion-bq-sync` ya **resuelve el token POR space** (`notion_token_secret_ref` → Secret Manager; TASK-1000) Y **queryea el endpoint canónico `/v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (TASK-1003, mata el deprecado `/v1/databases/{id}/query`). Un cliente nuevo registrado por el wizard (data_source ids + token scoped) con `sync_enabled=TRUE` drena nativo a diario. Verificado live con Grupo Berel (3/3 tables, token scoped). Ver §"Notion data_sources endpoint canónico (TASK-1003)" abajo.

### Notion data_sources endpoint canónico — extractor notion-bq-sync (TASK-1003, desde 2026-06-04)

El extractor `notion-bq-sync` (repo hermano `efeoncepro/notion-bigquery`, Cloud Run `us-central1`) queryea Notion **SIEMPRE por el endpoint canónico `POST /v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (revisión live `00021-wkl`, flag `NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true`). El endpoint legacy `/v1/databases/{id}/query` (deprecado por Notion 2025-09-03) queda muerto.

- **Resolver runtime canónico** `resolve_data_source_id(configured_id)` (`main.py`): acepta AMBOS tipos de id por construcción — `GET /v1/data_sources/{id}`→200 (ya es data_source: Berel/clientes nuevos del wizard) o fallback `GET /v1/databases/{id}`→`data_sources[0].id` (Efeonce/Sky con database ids legacy en el BQ mirror). Multi-data-source (>1) → fail-fast (nunca adivinar). Hereda el token per-space (TASK-1000) vía `_notion_headers`. Cache estable por mapping.
- **`database_id` configurado se conserva como identidad** para snapshot/binding (`source_database_id`, `_resolve_space_context`); SOLO la URL de query usa el id resuelto. NO mezclar.
- **`in_trash` (no `archived`)**: bajo 2026-03-11 el campo page-level de borrado es `in_trash`. El write usa `page.get("in_trash", page.get("archived", False))` (safe ambas versiones; la columna BQ sigue `archived`). NO volver a `page.get("archived", False)` solo.
- **404 NO transitorio**: `_is_transient_sync_error` clasifica 4xx (salvo 429) como NO transitorio (mata el reintento 3x inútil). NO revertir a "cualquier RequestException → transient".

**⚠️ Reglas duras**:

- **NUNCA** reintroducir `/v1/databases/{id}/query` ni Notion-Version `2022-06-28` en el extractor. El endpoint legacy está deprecado; toda query nueva usa data_sources + 2026-03-11.
- **NUNCA** guardar parent database ids de un cliente nuevo para meterlo por el endpoint viejo (anti-patrón rechazado en TASK-1003; viola Solution Quality Contract). El resolver runtime maneja ambos id-types.
- **NUNCA** desplegar `notion-bq-sync` con `bash deploy.sh` a secas: usa `--env-vars-file`/`--set-secrets` (REPLACE) y borraría las vars per-space + el secret `GREENHOUSE_POSTGRES_PASSWORD` que viven manuales en la revisión (no en `.env.yaml`, que es gitignored). Deploy canónico: `gcloud run deploy notion-bq-sync --source --function=notion_bq_sync --update-env-vars=... --update-secrets=...` (MERGE, preserva per-space+PG+secrets). Re-aseverar explícitamente `NOTION_PER_SPACE_TOKEN_ENABLED=true` + `GREENHOUSE_POSTGRES_{INSTANCE_CONNECTION_NAME,DB,USER}` + ambos secrets.
- **NUNCA** flipear `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` ni bumpear `NOTION_VERSION` sin correr el gate de paridad `parity_check_task1003.py` (read-only, no escribe BQ) sobre Efeonce/Sky → PARIDAD TOTAL. Rollback <5 min: flag OFF + `gcloud run services update --update-env-vars` o traffic a revisión previa.
- **SIEMPRE** que emerja un cliente nuevo: el wizard guarda data_source ids + token scoped → con `sync_enabled=TRUE` sincroniza nativo, cero casos especiales (proceso idempotente/escalable, NO repetir el cutover por cliente).

**Spec canónica**: `docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md`. Skill `notion-platform` §0 (estado canónico). Gate: `parity_check_task1003.py` (repo hermano).

### Notion sync canónico — Cloud Run + Cloud Scheduler (NO usar el script manual ni reintroducir un PG-projection separado)

**El daily Notion sync es un SOLO ciclo de DOS pasos en `ops-worker` Cloud Run**, schedulado por Cloud Scheduler. No hay otro path scheduled.

- **Trigger**: Cloud Scheduler `ops-notion-conformed-sync @ 20 7 * * * America/Santiago` → `POST /notion-conformed/sync` en ops-worker. Definido en `services/ops-worker/deploy.sh` (idempotente, re-run del deploy script lo upsertea).
- **Step 1 — `runNotionSyncOrchestration`**: notion_ops (BQ raw) → `greenhouse_conformed.delivery_*` (BQ). Si BQ conformed ya está fresh contra raw, hace skip ("Conformed sync already current; write skipped"). Esto NO es bug — es comportamiento intencional.
- **Step 2 — `syncBqConformedToPostgres` (UNCONDICIONAL)**: lee BQ `greenhouse_conformed.delivery_*` y escribe `greenhouse_delivery.{projects,tasks,sprints}` en PG vía `projectNotionDeliveryToPostgres`. **Este step DEBE correr siempre**, regardless del skip de Step 1, porque BQ puede estar fresh y PG stale (que es exactamente el bug que llevó 24 días sin detectar antes).

**⚠️ NO HACER**:

- NO mover el PG step adentro del path no-skip de Step 1. Antes vivía ahí (`runNotionConformedCycle` → bloque "Identity reconciliation — non-blocking tail step" precedente) y dejaba PG stale cuando BQ estaba current.
- NO crear un cron Vercel scheduled para `/api/cron/sync-conformed`. La ruta existe como fallback manual, pero el trigger automático canónico vive en Cloud Scheduler. Vercel cron es frágil para syncs largos (timeout 800s vs 60min Cloud Run, sin retry exponencial nativo, no co-located con Cloud SQL).
- NO depender del script manual `pnpm sync:source-runtime-projections` para escribir PG. Sirve para developer ad-hoc, NO para producción. Antes era el único path PG (24 días stale en abril 2026 = root cause del incidente que parió esta arquitectura).
- NO inyectar sentinels (`'sin nombre'`, `'⚠️ Sin título'`, etc.) en `*_name` columns. TASK-588 lo prohíbe vía CHECK constraints. NULL = unknown. Para mostrar fallback amigable usar el helper `displayTaskName/displayProjectName/displaySprintName` de `src/lib/delivery/task-display.ts` o el componente `<TaskNameLabel/ProjectNameLabel/SprintNameLabel>`.
- NO castear directo `Number(value)` para escribir BQ-formula columns a PG INTEGER (e.g. `days_late`). BQ formulas pueden devolver fraccionales (`0.117...`) y PG INT los rechaza. Usar `toInteger()` (con `Math.trunc`) que vive en `src/lib/sync/sync-bq-conformed-to-postgres.ts`.

**Helpers canónicos (orden de uso)**:

- `runNotionSyncOrchestration({ executionSource })` — wrapper completo BQ raw → conformed (solo lo invoca el endpoint Cloud Run y el endpoint admin manual).
- `syncBqConformedToPostgres({ syncRunId?, targetSpaceIds?, replaceMissingForSpaces? })` — drena BQ conformed → PG. Reusable desde cualquier admin endpoint o script de recovery. Default: todos los spaces activos, `replaceMissingForSpaces=true`.
- `projectNotionDeliveryToPostgres({ ... })` — primitiva más baja: UPSERT por `notion_*_id` directo a PG. Usado por `syncBqConformedToPostgres` y por la wiring inline dentro de `runNotionConformedCycle`. Idempotente, per-row, no table locks.

**Manual triggers / recovery**:

- Cloud Scheduler manual: `gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group`
- Admin endpoint Vercel (auth via agent session, sin cron secret): `POST /api/admin/integrations/notion/trigger-conformed-sync` — corre los 2 steps secuencialmente (`runNotionSyncOrchestration` + `syncBqConformedToPostgres`).
- Vercel cron `/api/cron/sync-conformed` (CRON_SECRET) — fallback histórico, queda activo pero no se debe usar como path principal.

**Kill-switch defensivo**: env var `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false` revierte el step PG dentro de `runNotionConformedCycle` sin requerir deploy. **NO** afecta el step PG del endpoint Cloud Run (que vive en `services/ops-worker/server.ts`), ese es UNCONDICIONAL.

**Defensas anti-tenant-cross-contamination** (Sky no rompe Efeonce ni viceversa):

- `replaceMissingForSpaces` filtra `WHERE space_id = ANY(targetSpaceIds)` — nunca toca rows fuera del cycle.
- UPSERT por `notion_*_id` (PK natural Notion) es idempotente y no depende del orden.
- Cascade de title `nombre_de_tarea` / `nombre_de_la_tarea` resuelve correctamente para ambos tenants (Efeonce usa la primera columna, Sky la segunda — verificado en vivo via Notion REST API + Notion MCP).

**Schema constraints relevantes**:

- BQ `delivery_*.{task_name,project_name,sprint_name}` están NULLABLE (alineado con TASK-588 PG decision). Helper `ensureDeliveryTitleColumnsNullable` en `sync-notion-conformed.ts` aplica `ALTER COLUMN ... DROP NOT NULL` idempotente al startup.
- PG `greenhouse_delivery.*` tiene CHECK constraints anti-sentinel desde TASK-588 (migration `20260424082917533_project-title-nullable-sentinel-cleanup.sql`). Cualquier sentinel string los va a rechazar.
- DB functions `greenhouse_delivery.{task,project,sprint}_display_name` (migration `20260426144105255`) producen el fallback display data-derived al READ time. Mirror exacto en TS via `src/lib/delivery/task-display.ts` (paridad regression-tested).

**Admin queue de hygiene**: `/admin/data-quality/notion-titles` lista las pages con `*_name IS NULL` agrupadas por space, con CTA "Editar en Notion" → page_url. Cuando el usuario edita el title en Notion, el next sync drena el cambio y la row sale del queue.

### Canonical task status vocabulary V1 — single source of truth cross-tenant (2026-05-18)

Toda comparación de `task_status` / `estado` en TS o SQL embebido **debe** pasar por el módulo canonical `src/lib/delivery/task-status-canonical.ts`. Single source of truth para los 11 estados V1 del lifecycle de tareas Greenhouse + alias map cubriendo Efeonce legacy + Sky legacy + English/accent variants.

**Módulo canonical**: `src/lib/delivery/task-status-canonical.ts` (NOT server-only — safe en client + server).

- `TASK_STATUS_CANONICAL` — 11 estados V1: `Sin empezar`, `Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Cancelado`, `Archivado`.
- `TASK_STATUS_ALIASES` — frozen map: 11 canonical self-maps + 7 Efeonce legacy (`Listo→Aprobado`, `Cancelada→Cancelado`, `Archivadas→Archivado`, `Detenido→En pausa`, `Listo para diseñar→Brief listo`, `Pendiente Dir. Arte→Pendiente aprobación interna`, `Cambios Solicitados→Cambios solicitados` con S→s) + 3 Sky legacy (`Tomado→Brief listo`, `Pendiente→Pendiente aprobación interna`, `En feedback→Cambios solicitados`) + 8 English/accent variants (Done/Finalizado/Completado→Aprobado, Cancelled/Canceled→Cancelado, sin tilde, capital case, Backlog→Sin empezar, Archivada singular).
- `TASK_STATUS_GROUPS` — semantic groups: `BRIEFING`, `ACTIVE`, `BLOCKED`, `COMPLETED`, `EXCLUDED`, `READY_FOR_REVIEW`, `CLIENT_CHANGES`.

**Helpers puros** (client + server):

- `normalizeTaskStatus(raw)` → canonical V1 string o null.
- `isCanonicalStatus(raw, canonical)` → boolean predicate.
- `isCanonicalStatusInGroup(raw, group)` → boolean predicate.
- `allVariantsForCanonical(canonical)` → string[] con TODAS las variantes (legacy + canonical).
- `allVariantsForGroup(group)` → string[] expandido.

**SQL builders** (server-side):

- `taskStatusSql(canonical)` → `'A','B','C'` SQL-safe IN list para un canonical.
- `taskStatusGroupSql(group)` → group expandido con todas las variantes.
- `buildTaskStatusToCscPhaseSql(column)` → CASE WHEN canonical mapeando a CSC phase (briefing / produccion / revision_interna / cambios_cliente / aprobado / bloqueado / excluido / unknown).

**Pattern canónico**:

```ts
// TS predicate (client + server)
if (isCanonicalStatusInGroup(row.task_status, TASK_STATUS_GROUPS.COMPLETED)) { ... }

// SQL embebido (server)
const sql = `
  COUNTIF(task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)})) AS done
`

// UNNEST(@param) pattern para BQ parameterized
const params = { completedStatuses: allVariantsForGroup(TASK_STATUS_GROUPS.COMPLETED) }
const sql = `COUNTIF(estado IN UNNEST(@completedStatuses)) AS done`
```

**⚠️ Reglas duras**:

- **NUNCA** hardcodear un literal de status en TS/SQL/BQ (`if (status === 'Cambios Solicitados')`, `WHERE estado = 'Listo'`, etc.). Toda comparación pasa por canonical helpers + constants.
- **NUNCA** comparar status con `===` contra un nombre canonical sin normalizar el lado raw antes. Pre-rename data tiene variantes case-mismatched (`'Cambios Solicitados'` capital S vs canonical `'Cambios solicitados'`) — la comparación directa falla silente. Usar `isCanonicalStatus(raw, canonical)` o `normalizeTaskStatus(raw)` primero.
- **NUNCA** modificar `TASK_STATUS_ALIASES` para REMOVER un legacy alias sin verificar que BQ/PG no tiene rows residuales con ese nombre. La eliminación es decisión coordinada cuando TASK-908 ship + 0% data en BQ con el nombre viejo.
- **NUNCA** agregar aliases para nombres custom de cliente nuevo. Si entra cliente con custom status names, **enforce canonical template L1** en Notion antes del onboarding (eso es lo escalable). Los aliases son SOLO para legacy transition window.
- **NUNCA** importar este módulo desde código que tenga `import 'server-only'` directive en un componente cliente — el módulo en sí NO es server-only (sin directive), pero los SQL builders solo tienen sentido server-side.
- **NUNCA** usar el output de `taskStatusGroupSql` / `taskStatusSql` en un endpoint que acepte user input para el group/canonical (potencial SQL injection). Los inputs DEBEN ser constants `TASK_STATUS_GROUPS.*` o `TASK_STATUS_CANONICAL.*`, no strings runtime.
- **SIEMPRE** que emerja un nuevo callsite que necesite comparar/filtrar status, usar canonical helpers. NO replicar inline arrays como `['Listo', 'Done', 'Finalizado', 'Completado']`.
- **SIEMPRE** que emerja un cliente nuevo con custom status names en Notion, NO agregar aliases. Migrar el template Notion del cliente al canonical V1 ANTES del onboarding. L1 universalización es la única solución escalable.

**Pattern fuente**: TASK-742 (single source of truth + frozen maps + helper canonical pattern). Migration path: Plan B (TASK-908) introduce `status_code` enum persistido en PG al boundary del sync — código matchea por código estable, no por nombre. Cuando shipee, los aliases legacy se eliminan en cleanup PR.

**Spec canónica**: commit `1525e51c` en `develop` 2026-05-18. Tests anti-regresión: 68 asserts en `src/lib/delivery/task-status-canonical.test.ts`.

### Notion delivery PG projection — robust integer cast + per-row resilience (2026-05-18)

`projectNotionDeliveryToPostgres` (`src/lib/sync/project-notion-delivery-to-postgres.ts`) es el writer canónico de `greenhouse_delivery.{projects,tasks,sprints}` PG desde BQ conformed. Toda INSERT de una columna INTEGER pasa por **SQL-boundary cast** + **per-row try/catch** + **Sentry diagnostic capture** + **result shape con skipped counters**. Defense in depth de 4 capas.

**Helpers canónicos** (`src/lib/sync/project-notion-delivery-to-postgres.ts`):

- `intArg(value)` → `sql\`(${value})::numeric::integer\``. Cast doble que acepta string (`"0.44"`), number (`0.44`), null, undefined → coerce a INTEGER truncando fraccional. Belt-and-suspenders con TS `toInteger` upstream.
- `arrayArg(value)` → `sql\`COALESCE(${value}::text[], ARRAY[]::text[])\``. Mirror del `intArg` pattern para ARRAY NOT NULL columns. BQ runtime puede devolver `null` para repeated-string properties sin valores (e.g. task sin Subtareas relation). PG ARRAY NOT NULL DEFAULT '{}' rechaza ese null. Helper coerce `null → []` en SQL boundary. Aplica a las 4 columnas ARRAY NOT NULL canónicas (`assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`) + cualquier columna ARRAY NOT NULL futura.
- `summarizePgError(err)` → extrae `{message, code, position, column, constraint}` de un PG error sin row-level data.

**Pattern canónico per upsert helper**:

```typescript
for (const row of rows) {
  if (!row.entity_source_id) continue
  try {
    await sql`INSERT INTO greenhouse_delivery.X (...)
              VALUES (...,
                ${intArg(row.integer_col)},
                ${arrayArg(row.array_col)},
                ...)
              ON CONFLICT (...) DO UPDATE SET ...`.execute(db)
    written += 1
  } catch (err) {
    skipped += 1
    const summary = summarizePgError(err)
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'delivery_projection', entity: '<project|sprint|task>' },
      extra: { syncRunId, entityId: row.entity_source_id, ...summary }
    })
    if (failures.length < 20) failures.push({ entityType, entityId, error: summary })
  }
}
```

**Result shape canónico** (extendido a `ProjectNotionDeliveryToPostgresResult`):

- `projectsSkipped` / `sprintsSkipped` / `tasksSkipped` — real counters per entity (no capped).
- `failureSamples[]` — capped a 20 samples para audit payload bounded.

**Bug class disparadores (2026-05-18)**:

- **INTEGER NOT NULL** (commit `ca465ac0`): BQ formula columns emiten valores fraccionales como string `"0.44"`. El TS contract `<col>: number | null` PASSED tsc, pero runtime podía leak strings. PG INTEGER rechazaba con `invalid input syntax for type integer: "0.44"`. Solución: `intArg`.
- **ARRAY NOT NULL** (commit `550c0e67`): BQ devuelve `null` para repeated-string properties sin valores (e.g. task sin Subtareas). PG `ARRAY NOT NULL DEFAULT '{}'` rechaza con `null value in column "tarea_principal_ids" of relation "tasks" violates not-null constraint`. Detected en vivo durante Efeonce canonical rename cascade (1322 rows skipped en Step 1, Sentry alert JAVASCRIPT-NEXTJS-64). Solución: `arrayArg`.

Sin per-row try/catch, una sola row mala fallaba el batch entero. Sin diagnostic capture, RCA requería deep grep post-facto. La per-row resilience + diagnostic capture hicieron que el bug class ARRAY fuera SURFACEABLE inmediatamente (Sentry alert clara con `column: "tarea_principal_ids"`) sin bloquear la cascada (Step 2 UNCONDITIONAL drain bypaseó el bug y dejó PG canonical).

**Columnas protegidas actualmente**:

- INTEGER (10): `days_late`, `rescheduled_days`, `client_change_round_final`, `frame_versions`, `frame_comments`, `open_frame_comments`, `blocker_count`, `workflow_change_round`, `completed_tasks_count`, `total_tasks_count`.
- ARRAY NOT NULL (4): `assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`.

Cualquier columna nueva (INTEGER o ARRAY NOT NULL) queda automáticamente protegida por la primitiva canonical cuando se envuelve con el helper apropiado.

**⚠️ Reglas duras**:

- **NUNCA** pasar una columna INTEGER a un INSERT sin envolver el valor en `intArg(...)`. Aunque el TS contract diga `number | null`, el runtime puede leak strings desde BQ formulas.
- **NUNCA** pasar una columna ARRAY NOT NULL a un INSERT sin envolver el valor en `arrayArg(...)`. Aunque el TS contract diga `string[] | null`, BQ runtime puede devolver `null` cuando la repeated property Notion no tiene valores.
- **NUNCA** envolver un upsert helper (`upsertProjects/Sprints/Tasks`) sin per-row try/catch. Resilience canónica: una row mala no debe bloquear el batch.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'delivery_projection', entity: '<project|sprint|task>' }, extra: { syncRunId, entityId, ...summary } })`.
- **NUNCA** loggear el row completo en el catch (puede contener PII). Solo `entityId` + `summarizePgError(err)` output (campos estructurales sin user data).
- **NUNCA** modificar el shape `ProjectNotionDeliveryToPostgresResult` removiendo campos. Adding-only es safe; removing rompe consumers.
- **SIEMPRE** que emerja una columna INTEGER nueva en el schema, agregarla al INSERT con `intArg(...)`. Lint rule no la enforce hoy — code review humano.
- **SIEMPRE** que emerja una columna ARRAY NOT NULL nueva en el schema, agregarla al INSERT con `arrayArg(...)`. Mismo enforcement humano.
- **SIEMPRE** que emerja un nuevo upsert helper (e.g. para `revisions` o cualquier delivery entity nueva), seguir el mismo pattern: try/catch + intArg + arrayArg + captureWithDomain + skipped/failures wiring.
- **SIEMPRE** caller del helper debe loggear `pgResult.{projectsSkipped, sprintsSkipped, tasksSkipped}` en cron summary line + first `failureSamples[0]` si totalSkipped > 0. Cron visibility canónica.

**Spec canónica**: commits `ca465ac0` (intArg + per-row resilience) + `550c0e67` (arrayArg) en `develop` 2026-05-18. Pattern fuente: TASK-742 7-layer auth resilience (per-row try/catch + diagnostic capture + Sentry domain), TASK-571/766/774 (VIEW canónica + helper + signal + lint).

### Cloud Run hubspot-greenhouse-integration (HubSpot write bridge + webhooks) — TASK-574

- Servicio Cloud Run Python/Flask en `us-central1` (NO `us-east4` — region bloqueada para preservar URL pública).
- Expone 23 rutas HTTP + webhook handler inbound. URL: `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app`.
- Ubicación canónica post TASK-574 (2026-04-24): `services/hubspot_greenhouse_integration/` en este monorepo. Antes vivía en el sibling `cesargrowth11/hubspot-bigquery`.
- Deploy: `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (WIF, pytest → Cloud Build → Cloud Run deploy → smoke `/health` + `/contract`).
- Manual: `ENV=staging|production bash services/hubspot_greenhouse_integration/deploy.sh`.
- 3 secretos: `hubspot-access-token`, `greenhouse-integration-api-token`, `hubspot-app-client-secret` (Secret Manager project `efeonce-group`).
- Si el cambio toca rutas del bridge, webhooks HubSpot inbound, o secretos → invocar skill `hubspot-greenhouse-bridge`.
- Consumer principal: `src/lib/integrations/hubspot-greenhouse-service.ts` (no cambia pre/post cutover — mismo contract HTTP).
- **Sibling `cesargrowth11/hubspot-bigquery` ya no es owner del bridge**: conserva solo el Cloud Function HubSpot→BigQuery (`main.py` + `greenhouse_bridge.py` batch bridge) + app HubSpot Developer Platform (`hsproject.json`).

### HubSpot inbound webhook — p_services (0-162) auto-sync (TASK-813)

Cuando alguien crea o actualiza un service en HubSpot custom object `p_services` (objectTypeId `0-162`), Greenhouse lo refleja automáticamente en `greenhouse_core.services` via webhook + handler canónico. Ningún sync manual ni cron requerido para el flow normal.

**Pipeline canónico (mismo patrón TASK-706 hubspot-companies)**:

1. **HubSpot Developer Portal** → suscripción a `p_services.creation`, `p_services.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services`. Signature method: v3.
2. **Endpoint genérico** `/api/webhooks/hubspot-services` recibe POST.
3. **Handler `hubspot-services`** (`src/lib/webhooks/handlers/hubspot-services.ts`) valida firma v3 (HMAC-SHA256, secret `HUBSPOT_APP_CLIENT_SECRET`, timestamp expiry < 5 min, timing-safe compare).
4. Extrae service IDs (subscriptionType `p_services.*`).
5. Batch read de service properties via `fetchServicesForCompany` helper (`src/lib/hubspot/list-services-for-company.ts`).
6. Per service: resuelve `hubspot_company_id` via association lookup, resuelve space en GH via `clients.hubspot_company_id`, UPSERT en `services`.
7. Outbox event `commercial.service_engagement.materialized` v1.
8. Failures individuales loggeadas en Sentry `domain='integrations.hubspot'`.

**Mapping unmapped pattern**: si `ef_linea_de_servicio` está NULL en HubSpot, la fila se materializa con `hubspot_sync_status='unmapped'`. Downstream consumers (P&L, ICO, attribution) **deben filtrar por** `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'` para excluir filas sin clasificación. Operador resuelve via Slice 7 UI (futuro).

**Backfill operacional** (one-shot post setup):

```bash
HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
  --secret=hubspot-access-token --project=efeonce-group) \
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --apply --create-missing-spaces
```

Idempotente: re-correr es safe, UPSERT por `hubspot_service_id` UNIQUE.

**Helper canónico para escapar el bridge bug**: `src/lib/hubspot/list-services-for-company.ts` (`fetchServicesForCompany`, `batchReadServices`, `listServiceIdsForCompany`) llama HubSpot API directo via `HUBSPOT_ACCESS_TOKEN` env o secret `gcp:hubspot-access-token`. Bypass del bridge Cloud Run que usa `p_services` en URLs en lugar de `0-162` (HubSpot rechaza con 400 "Unable to infer object type"). Bridge fix queda como follow-up task separada.

**Reliability signals (subsystem `commercial`)**:

- `commercial.service_engagement.sync_lag` — kind=lag, severity=warning si count > 0. Cuenta services con `hubspot_service_id` poblado pero `hubspot_last_synced_at NULL` o > 24h. Detecta webhook caído o sync stale. Steady state = 0.
- `commercial.service_engagement.organization_unresolved` — kind=drift, severity=error si > 7 días. Cuenta `webhook_inbox_events.status='failed'` con `error_message LIKE 'organization_unresolved:%'` y antiguedad > 7d. Operador comercial resuelve creando client en Greenhouse o archivando service en HubSpot.
- `commercial.service_engagement.legacy_residual_reads` — kind=drift, severity=error si > 0. Cuenta filas archived (`status='legacy_seed_archived'`) que tienen `service_attribution_facts` con `created_at > services.updated_at` (consumer no respeta filtro). Steady state = 0.

**Hard rules**:

- **NUNCA** crear fila en `core.services` con `hubspot_service_id IS NULL` y `engagement_kind != 'discovery'`. Solo discovery legítimo + legacy_seed pueden carecer del bridge.
- **NUNCA** sincronizar Greenhouse → HubSpot `0-162`. Solo back-fill de propiedades `ef_*` (TASK-813 follow-up V1.1, default OFF).
- **NUNCA** matchear services por nombre (colisión real demostrada en audit 2026-05-06: SSilva tiene 3 services HubSpot vs 4 GH con naming distinto).
- **NUNCA** borrar las 30 filas legacy. Solo archivar (script `scripts/services/archive-legacy-seed.ts` con `--apply`).
- **NUNCA** invocar `Sentry.captureException` directo en code path commercial. Usar `captureWithDomain(err, 'integrations.hubspot', ...)`.
- **SIEMPRE** que un consumer Finance/Delivery necesite "el servicio del cliente X período Y", filtrar `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'`.

### HubSpot Service Pipeline lifecycle invariants (TASK-836)

`upsertServiceFromHubSpot()` consume el mapper canónico `service-lifecycle-mapper.ts` y la cascade canónica `engagement-kind-cascade.ts` para resolver `pipeline_stage|status|active|engagement_kind` desde HubSpot. Reemplaza el hardcode que tratba a TODOS los services como `active`.

**HubSpot Service Pipeline (`0-162`) stage IDs canónicos** (verificados 2026-05-09 + stage validation creada):

| Greenhouse pipeline_stage | HubSpot label | HubSpot stage ID | Active | Status |
|---|---|---|---|---|
| `validation` | Validación / Sample Sprint | `1357763256` | TRUE | active |
| `onboarding` | Onboarding | `8e2b21d0-7a90-4968-8f8c-a8525cc49c70` | TRUE | active |
| `active` | Activo | `600b692d-a3fe-4052-9cd7-278b134d7941` | TRUE | active |
| `renewal_pending` | En renovación | `de53e7d9-6b57-4701-b576-92de01c9ed65` | TRUE | active |
| `renewed` | Renovado | `1324827222` | TRUE | active (transitorio) |
| `closed` | Closed | `1324827223` | FALSE | closed |
| `paused` | Pausado | `1324827224` | FALSE | paused |

**Property HubSpot canónica** (creada 2026-05-09 vía API):
- internal name: `ef_engagement_kind` (label visible: `Tipo de servicio`)
- type: `enumeration` / fieldType: `select`
- options: `regular|pilot|trial|poc|discovery` (labels: Contratado/Piloto/Trial/POC/Discovery)

**Outbox event canónico granular**:
- `commercial.service_engagement.lifecycle_changed v1` emitido SOLO cuando hay diff real en `pipeline_stage|active|status|engagement_kind`. Refresh idempotente sin diff NO emite.
- `commercial.service_engagement.materialized v1` (TASK-813) sigue emitiéndose en cada UPSERT — son complementarios.

**4 reliability signals nuevos bajo subsystem `commercial`**:
- `commercial.service_engagement.lifecycle_stage_unknown` (kind=drift, severity=error si > 0).
- `commercial.service_engagement.engagement_kind_unmapped` (kind=drift, severity=warning).
- `commercial.service_engagement.renewed_stuck` (kind=drift, severity=warning si > 60 días).
- `commercial.service_engagement.lineage_orphan` (kind=data_quality, severity=error).

**Schema delta** (migration `20260509125228920`):
- CHECK `pipeline_stage` extendido con `'validation'`.
- CHECK structural a `status` (`active|closed|paused|legacy_seed_archived`).
- CHECK structural a `hubspot_sync_status` (`pending|synced|unmapped`).
- Columna `unmapped_reason TEXT NULL` con CHECK enum cerrado (`unknown_pipeline_stage|missing_classification`).
- Columna `parent_service_id TEXT NULL` FK self con `ON DELETE RESTRICT`.
- Trigger `services_lineage_protection_trigger` (BEFORE INSERT OR UPDATE).

**⚠️ Reglas duras**:

- **NUNCA** hardcodear `pipeline_stage='active'`, `status='active'` ni `active=TRUE` en INSERT/UPDATE de `services` cuando la fuente es HubSpot. Toda mutación pasa por el mapper canónico.
- **NUNCA** depender del label visible HubSpot (`Tipo de servicio`, `Activo`, `Closed`, etc.) en código. Solo internal names + stage IDs. Labels son traducibles y mutables.
- **NUNCA** sobrescribir `engagement_kind` con NULL desde un UPSERT inbound. La cascade canónica preserva PG cuando HubSpot devuelve NULL (casos 3-4 de la cascade).
- **NUNCA** asumir un default de `engagement_kind` para services nuevos en stage `validation`. Sin clasificación explícita, queda `unmapped` y reliability signal alerta.
- **NUNCA** crear servicio con `engagement_kind='regular'` AND `parent_service_id IS NOT NULL` cuyo parent tenga `engagement_kind='regular'`. Trigger PG lo bloquea; signal `lineage_orphan` lo detecta defense-in-depth.
- **NUNCA** mutar `pipeline_stage`, `status` o `active` directo via SQL en producción. Toda mutación pasa por `upsertServiceFromHubSpot()` o revert canónico via outbox.
- **NUNCA** filtrar "servicios operativos del periodo" con `WHERE pipeline_stage = 'active'` solo. `renewed` y `renewal_pending` también son operativos. Usar `WHERE active=TRUE` o whitelist explícita.
- **NUNCA** promover unilateralmente desde Greenhouse `pipeline_stage='renewed'` a `'active'`. HubSpot es source of truth de stage; signal `renewed_stuck` escala drift.
- **NUNCA** agregar stage HubSpot nuevo sin extender el mapper + agregar tests + actualizar `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`. Default unknown stage al fail-safe `unmapped`, NUNCA a `active`.
- **NUNCA** ejecutar backfill sin pre/post snapshot documentado y plan de revert via outbox `lifecycle_changed`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'commercial', ...)`.
- **SIEMPRE** que ocurra una transición de `pipeline_stage`, `active`, `status` o `engagement_kind`, emitir `commercial.service_engagement.lifecycle_changed v1` en la misma transacción. Refresh idempotente sin diff NO emite.
- **SIEMPRE** validar `engagement_kind` contra el enum cerrado `regular|pilot|trial|poc|discovery`. Valores fuera del enum → `hubspot_sync_status='unmapped'` + `unmapped_reason='missing_classification'`, NUNCA cast silencioso.
- **SIEMPRE** que un Sample Sprint convierta a service regular, el child hereda `parent_service_id` apuntando al Sample Sprint padre. Trigger enforce; signal `lineage_orphan` defense-in-depth.

### HubSpot webhook events — dual-format invariant (TASK-836 follow-up)

HubSpot Developer Platform 2025.2 cambió el shape del payload de webhooks. **Ambos formatos coexisten** y el handler debe soportar ambos via clasificador canónico — NUNCA branch por prefix de `subscriptionType` solo.

| Format | `subscriptionType` | Discriminador |
|---|---|---|
| Legacy (apps OAuth tradicionales) | `company.creation`, `contact.propertyChange`, `service.creation`, `p_services.creation`, `0-162.creation` | Single field encapsula objeto + acción |
| Developer Platform 2025.2 (Build #24+, deploy 2026-05-06) | `object.creation`, `object.propertyChange` (genérico) | `objectTypeId` separate (`0-1` contact, `0-2` company, `0-162` service) o `objectType` (`contact`, `company`, `service`, `p_services`) |

**Helper canónico** — `classifyHubSpotEvent(event) → 'company' | 'contact' | 'service' | 'unknown'`:

- En `src/lib/webhooks/handlers/hubspot-companies.ts` (TASK-706 handler — companies + contacts intake)
- En `src/lib/webhooks/handlers/hubspot-services.ts` (TASK-813 handler — p_services intake) — equivalente `isHubSpotServiceEvent`

**⚠️ Reglas duras**:

- **NUNCA** filtrar events con `subscriptionType.startsWith('company.')` / `startsWith('p_services.')` / equivalentes solo. **DEBE** pasar por `classifyHubSpotEvent()` o `isHubSpotServiceEvent()`. Lint manual durante review — la regresión silente del 2026-05-06 es la prueba.
- **NUNCA** asumir que el formato del próximo Build HubSpot va a ser legacy. La app puede flippear silenciosamente al formato 2025.2 sin notice. Defense in depth: classifier soporta ambos siempre.
- **NUNCA** ignorar events con `objectTypeId` desconocido (e.g. `0-999`). Devolver `'unknown'` y log silente — NO crashear el handler completo (puede haber events legítimos de objects que no nos interesan en el mismo batch).
- **SIEMPRE** que emerja un nuevo handler de webhook HubSpot (deals `0-3`, tickets, custom objects), reusar el pattern dual-format desde el day-1. Single source of truth en TS, helper compartido.
- **SIEMPRE** validar tests anti-regresión que cubran legacy + 2025.2 + mixed formats antes de mergear cambios al handler.

**Tests anti-regresión**: `src/lib/webhooks/handlers/hubspot-companies.test.ts` describe block `classifyHubSpotEvent dual-format (TASK-836 follow-up)` — 4 tests cubren formato 2025.2 puro, mixed legacy+2025.2 dedup, contact event con `associatedObjectId`, y `objectTypeId` desconocido ignorado.

**Spec canónica**: `docs/tasks/in-progress/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`. Runbook config HubSpot: `docs/operations/runbooks/hubspot-service-pipeline-config.md`.

### Signature platform invariants — provider-neutral + ZapSign (TASK-490 + TASK-491, desde 2026-06-05)

La firma electrónica de Greenhouse (cartas oferta, contratos laborales, MSA, futuros documentos) es **provider-neutral** (EPIC-001, identidad `documents`). El aggregate `greenhouse_core.signature_requests` (+ `signature_request_signers` + `signature_request_events` append-only, trio state-machine+CHECK+audit TASK-765) modela la solicitud; el provider concreto vive detrás del **port hexagonal** `SignatureProviderAdapter` (`src/lib/signatures/provider-port.ts`). ZapSign es el primer (y único V1) adapter: `zapSignSignatureAdapter` (`src/lib/integrations/zapsign/signature-adapter.ts`).

**Pipeline canónico**:

```text
createSignatureRequest (draft) → sendSignatureRequest (adapter.createDocument → ZapSign)
  → ZapSign callback → /api/webhooks/zapsign (genérica [endpointKey] + processInboundWebhook + inbox dedupe)
    → handler 'zapsign' DISPATCH CASCADE:
       1. getSignatureRequestByProviderToken → applyZapSignStateToSignatureRequest (aggregate)
       2. getMasterAgreementBySignatureDocumentToken → syncMasterAgreementSignature (MSA legacy fallback)
       3. else → ignore
  → reconcile (safety-net): reconcileZapSignSignatureRequest(id) — endpoint admin + CLI
```

**State machine provider-driven (TASK-490)**: `applyProviderStatus` es **monotónico + tolerante a callbacks fuera de orden** (nunca regresa; terminal inmutable). El status event (`signature.request.{partially_signed,completed,failed,...}` v1) se emite SOLO en un cambio real de estado → reentrega del webhook idempotente.

**⚠️ Reglas duras**:

- **NUNCA** llamar la API de ZapSign (`createZapSignDocument`/`getZapSignDocument`) directo desde un dominio o route para el flujo del aggregate. Pasar por `zapSignSignatureAdapter` (port). El lane MSA legacy (`/api/finance/master-agreements/[id]/signature-requests`) es el único caller directo restante y coexiste — NO migrarlo aquí.
- **NUNCA** recrear una ruta webhook one-off para ZapSign (la dedicada `/api/webhooks/zapsign/route.ts` fue borrada en TASK-491). Todo callback entra por el bus canónico (`endpoint_key='zapsign'`, handler `src/lib/webhooks/handlers/zapsign.ts`). Mismo principio para un provider de firma nuevo: handler en el bus, NO ruta dedicada.
- **NUNCA** romper el **dispatch cascade** del handler: el aggregate `signature_requests` tiene prioridad; el lane MSA es el fallback (coexistencia, invariante TASK-490). Modificar el handler sin preservar el fallback MSA rompe la firma de MSA en producción (lane vivo). Los tests `src/lib/webhooks/handlers/zapsign.test.ts` cubren ambos paths.
- **NUNCA** marcar un `signature_request` como `completed` sin `signed_document_asset_id` (CHECK DB). El recovery DEBE bajar el PDF firmado al vault ANTES de aplicar `completed`. Por eso el webhook Y el reconcile comparten `applyZapSignStateToSignatureRequest` (`src/lib/integrations/zapsign/apply-state.ts`) — single source of truth del recovery. NO usar el `reconcileSignatureRequest` genérico de TASK-490 para ZapSign (no baja el archivo → violaría el CHECK).
- **NUNCA** persistir el PDF firmado del aggregate fuera del context `signature_signed_document` (vault privado, acceso own member/own client/HR/Finance/admin). El lane MSA usa `master_agreement` (no mezclar).
- **NUNCA** leer el documento a firmar con `downloadPrivateAsset` en el adapter (infla `download_count` + emite `asset.downloaded` por cada envío). Usar `downloadGreenhouseStorageObject` (read sin side-effects).
- **NUNCA** confiar el status del payload del webhook para el aggregate. El handler **re-consulta** el estado autoritativo vía `adapter.getDocumentState` (la API es la fuente de verdad; el payload puede ser parcial). El lane MSA sí usa el payload (comportamiento legacy preservado verbatim).
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'documents', { tags: { source: 'zapsign_webhook' | 'admin_signature_request_reconcile' } })`.
- **NUNCA** reconfigurar el webhook de ZapSign ni cambiar el secret `ZAPSIGN_WEBHOOK_SHARED_SECRET` al tocar este flujo. El `auth_mode='bearer'` + el fallback aditivo `x-zapsign-webhook-secret` en `verifyAuth` preservan el auth exacto del route viejo. La URL no cambia.
- **SIEMPRE** que emerja un provider de firma nuevo (DocuSign, etc.), implementar el port `SignatureProviderAdapter` + un handler en el bus + un `apply-state` análogo. Cero lógica de provider en el aggregate.
- **SIEMPRE** que el aggregate gane un producer real (TASK-1024 bridge contracting → `createSignatureRequest`/`sendSignatureRequest`), correr el smoke real ZapSign end-to-end + confirmar los signals `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` en steady=0.

**Spec canónica**: `docs/tasks/complete/TASK-490-signature-orchestration-foundation.md` + `docs/tasks/complete/TASK-491-zapsign-adapter-webhook-convergence.md`. EVENT_CATALOG: Deltas 2026-06-05 (`signature.request.*`). Migraciones: `20260605210419134` (aggregate) + `20260605215340232` (webhook endpoint).

**Bridge contracting → firma (primer producer real del aggregate, TASK-1024, desde 2026-06-05)**: el Workforce Contracting Studio es el primer dominio que produce + consume `signature_requests`. Producer `sendContractingCaseToSignature` (`src/lib/workforce/contracting/signature/`); consumer reactivo `contracting_signature_bridge` (`src/lib/sync/projections/`).

- **NUNCA** firmar un contrato/oferta con el representante legal como firmante ZapSign. El **único firmante electrónico es el TRABAJADOR**; la firma del representante de la entidad va **pre-estampada** en el PDF (TASK-863/1023, `@/lib/legal-signatures`). La e-firma del trabajador es válida para contratos (≠ finiquito, que exige ratificación notarial). El `resolveContractingWorkerSigner` resuelve worker name+email fail-closed (sin email → no se puede enviar).
- **NUNCA** disparar el envío a firma automáticamente al llegar a `ready_for_signature`. Es una **acción de operador explícita** (CTA, capability `workforce.contracting.send_signature`) — el operador revisa el PDF antes de comprometer la e-firma. El evento `ready_for_signature` es audit/notificación, no trigger de envío.
- **NUNCA** llamar la API de ZapSign dentro de una tx PG. El producer es 3-fases: (1 tx) crear el `signature_request` draft idempotente (`caseId:pdfAssetId`); (2 sin tx) `sendSignatureRequest` a ZapSign; (3 tx) avanzar el caso `ready_for_signature → sent_for_signature`. El caso avanza SOLO si ZapSign aceptó (retry idempotente).
- **NUNCA** marcar el caso `fully_signed` sin ligar `signed_pdf_asset_id`. El consumer reactivo re-lee el `signature_request` (que el webhook TASK-491 ya pobló con `signedDocumentAssetId`), liga el asset y avanza el caso. Idempotente + cubre el crash window (transiciona por `sent_for_signature` si el producer murió). El CHECK del aggregate ya garantiza `completed ⇒ signed_document_asset_id`.
- **NUNCA** duplicar los signals del aggregate per-dominio: el contracting reusa `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` (TASK-490). El único signal contracting-específico es `workforce.contracting.signature_desync` (el caso quedó atrás de su request → consumer falló; steady=0).
- **SIEMPRE** que un dominio nuevo necesite firma (quote, MSA migrado, addenda), reusar el mismo patrón: producer command (validación + createSignatureRequest + sendSignatureRequest fuera de tx + transición) + consumer reactivo filtrado por `sourceKind`. Cero acoplamiento a ZapSign.

### Sample Sprint outbound projection invariants (TASK-837)

Cuando alguien declara un **Sample Sprint** (`engagement_kind IN ('pilot','trial','poc','discovery')`) vía wizard `/agency/sample-sprints`, Greenhouse:

1. **Exige un HubSpot Deal abierto** — el wizard requiere selección de Deal; el server revalida server-side antes de mutar.
2. **Persiste el service localmente** con `hubspot_deal_id`, `idempotency_key = service_id`, `hubspot_sync_status='outbound_pending'` en una sola tx PG + outbox event `service.engagement.outbound_requested v1`.
3. **Async outbound projection** consume el event y proyecta a HubSpot `p_services` (custom object 0-162) en stage `Validación / Sample Sprint` (ID `1357763256`) con asociaciones Deal+Company+Contacts atómicas.
4. **Reliability**: 7 signals bajo subsystem `commercial` cubren todos los failure modes (overdue, dead_letter, partial_associations, deal_closed, drift, outcome_terminal, legacy).

**Pipeline canónico end-to-end**:

```text
Wizard submit (Vercel route handler /api/agency/sample-sprints)
  ├─> validateDealEligibility (getEligibleDealForRevalidation, NEVER trust client)
  ├─> declareSampleSprint() en tx PG:
  │   ├─ INSERT services (hubspot_deal_id, idempotency_key, hubspot_sync_status='outbound_pending')
  │   ├─ INSERT engagement_approvals + audit_log
  │   ├─ publishOutboxEvent('service.engagement.declared')      (TASK-808 path, cache invalidation TASK-835)
  │   └─ publishOutboxEvent('service.engagement.outbound_requested')  (TASK-837 trigger Slice 4)
  ├─> respond 201 con {serviceId, status:'outbound_pending', idempotencyKey}
  │
  ┊  (async, decoupled — Cloud Scheduler ops-reactive-finance */5 min)
  │
Reactive consumer 'sample_sprint_hubspot_outbound':
  ├─ re-read service desde PG (NO confiar payload)
  ├─ idempotency check: GET /services/by-idempotency-key/<idempotency_key>
  ├─ si match: skip POST + UPDATE local (hubspot_service_id, status='ready')
  ├─ si no match: POST /services con properties + associations (Deal+Company+Contacts)
  ├─ UPDATE atomic local: hubspot_service_id, hubspot_last_synced_at, status='ready'|'partial_associations'
  └─ on bridge fail: rollback in_progress → outbound_pending + retry exponencial (maxRetries=3) → outbound_dead_letter
```

**Webhook eco cascade** (anti-duplicate row): cuando HubSpot dispara webhook `service.creation` post-outbound, el handler `hubspotServicesIntakeProjection` aplica lookup cascade ANTES del UPSERT TASK-813b:

1. Si `properties.ef_greenhouse_service_id` matches `services.idempotency_key` local → UPDATE atomic linkando `hubspot_service_id` y skip UPSERT (evita segunda fila).
2. Fallback: UPSERT canónico TASK-813b (path inbound puro).

**Hard rules (18 invariantes anti-regresión)**:

- **NUNCA** ejecutar POST/PATCH/DELETE a HubSpot inline en un route handler Vercel para Sample Sprints. Toda mutación outbound pasa por outbox event + reactive consumer en `ops-worker` Cloud Run (anti-pattern TASK-771).
- **NUNCA** responder 5xx al cliente cuando PG commiteó y solo HubSpot falló. El cliente recibe 201 con `outbound_pending`; el reactive consumer reintenta async.
- **NUNCA** declarar Sample Sprint sin `hubspotDealId` validado server-side contra Deal abierto. La UI nunca decide elegibilidad final — la revalidación corre en `declareSampleSprint` vía `getEligibleDealForRevalidation` (cache bypass).
- **NUNCA** filtrar Deals elegibles por label visible HubSpot. Solo `is_closed`/`is_won`/stage IDs sincronizados desde `hubspot_deal_pipeline_config`.
- **NUNCA** crear `p_services` HubSpot sin idempotency key. `ef_greenhouse_service_id` (creada en TASK-837 Slice 0.5a) es la property writable canónica — `hs_unique_creation_key` es READ-ONLY en `0-162` (verificado en Checkpoint A 2026-05-09).
- **NUNCA** crear property HubSpot `ef_source_deal_id` ni `ef_engagement_origin`. Reusar `ef_deal_id` y `ef_engagement_kind` (las dimensiones ortogonales "tipo" vs "Deal" ya existen).
- **NUNCA** persistir `hubspot_service_id` sin `idempotency_key` previamente persistido. La idempotency key vive en `services.idempotency_key` desde el INSERT local, ANTES del POST HubSpot.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del outbound projection. Usar `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'sample_sprint_outbound', stage: '...' } })`.
- **NUNCA** loggear payload completo del bridge response (puede contener PII de contactos). Usar `redactErrorForResponse` y `redactSensitive` antes de persistir o loggear.
- **NUNCA** crear segunda fila `services` cuando webhook eco entra para un service ya creado por outbound. El handler inbound aplica lookup cascade por `idempotency_key` (TASK-837 Slice 4 patch a `hubspot-services-intake.ts`).
- **NUNCA** mover `p_services` HubSpot a Closed automáticamente cuando outcome Greenhouse es terminal (V1 manual). Reliability signal `outcome_terminal_pservices_open` lo escala operativamente. Automatizar es task derivada V1.1.
- **NUNCA** inventar Deal retroactivamente para Sample Sprint legacy sin Deal. Operador comercial decide via manual queue: vincular existente, declarar legacy o cerrar.
- **NUNCA** depender de `ef_pipeline_stage` como source of truth de HubSpot stage. Solo `hs_pipeline_stage`. La property `ef_pipeline_stage` quedó deprecated para Sample Sprints (Checkpoint D resuelto).
- **NUNCA** modificar el CHECK constraint `services_hubspot_sync_status_check` sin extender ambos sets de valores: inbound (`pending|synced|unmapped` TASK-813/836) + outbound (`outbound_pending|outbound_in_progress|ready|partial_associations|outbound_dead_letter` TASK-837).
- **SIEMPRE** que un Sample Sprint se declare via wizard, emitir outbox event `service.engagement.outbound_requested v1` en la misma tx PG. NO confundir con `service.engagement.declared v1` (TASK-808) que tiene cache invalidation consumer (TASK-835).
- **SIEMPRE** revalidar elegibilidad del Deal server-side al submit (stage abierto + company + ≥1 contacto). El cache del reader tiene TTL 60s; la revalidación es fresh (NEVER cache).
- **SIEMPRE** que outbound projection reciba 429 de HubSpot, respetar `Retry-After` header del bridge response. Backoff exponencial automatico via outbox state machine TASK-773.
- **SIEMPRE** que un service entre en `outbound_dead_letter`, requiere humano via dead-letter UX (`commercial.engagement.recover_outbound` capability, FINANCE_ADMIN o EFEONCE_ADMIN solo).

**Helpers canónicos**:

- `getEligibleDealForRevalidation(hubspotDealId)` — `src/lib/commercial/eligible-deals-reader.ts`, fresh PG read.
- `listEligibleDealsForSampleSprint({...})` — wizard reader con cache TTL 60s per subject.
- `declareSampleSprint(input)` — `src/lib/commercial/sample-sprints/store.ts`, atomic tx + 2 outbox events.
- `sampleSprintHubSpotOutboundProjection` — `src/lib/sync/projections/sample-sprint-hubspot-outbound.ts`, reactive consumer.
- `createHubSpotGreenhouseService` / `findHubSpotGreenhouseServiceByIdempotencyKey` / `updateHubSpotGreenhouseService` — `src/lib/integrations/hubspot-greenhouse-service.ts`, bridge clients.

**Reliability signals (subsystem `commercial`, steady=0)**:

- `commercial.sample_sprint.outbound_pending_overdue` (lag/warning)
- `commercial.sample_sprint.outbound_dead_letter` (dead_letter/error)
- `commercial.sample_sprint.partial_associations` (drift/warning)
- `commercial.sample_sprint.deal_closed_but_active` (drift/warning)
- `commercial.sample_sprint.deal_associations_drift` (drift/warning)
- `commercial.sample_sprint.outcome_terminal_pservices_open` (drift/warning)
- `commercial.sample_sprint.legacy_without_deal` (data_quality/warning)

**Spec canónica**: `docs/tasks/in-progress/TASK-837-deal-bound-sample-sprint-service-projection.md`. Runbook recovery: `docs/operations/runbooks/sample-sprint-outbound-recovery.md`. Bridge endpoints: `services/hubspot_greenhouse_integration/app.py` (POST `/services`, PATCH `/services/<id>`, GET `/services/by-idempotency-key/<key>`).

### Cross-runtime observability — Sentry init invariant (TASK-844)

`src/lib/**` corre en **5 runtimes distintos** y todos consumen el wrapper canónico `captureWithDomain` (207 callsites) para emitir incidents a Sentry con tag `domain` para roll-up por módulo en el reliability dashboard.

| Runtime | Sentry init path | Status |
|---|---|---|
| **Vercel** (Next.js 16 App Router) | Auto vía `src/instrumentation.ts` → `sentry.server.config.ts` → `next.config.ts withSentryConfig` | ✅ canónico desde día 1 |
| **ops-worker** Cloud Run (generic Node ESM) | `services/ops-worker/server.ts` línea de init invocando `initSentryForService('ops-worker')` desde `services/_shared/sentry-init.ts` | ✅ TASK-844 Slice 3 |
| **commercial-cost-worker** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **ico-batch** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **hubspot_greenhouse_integration** Cloud Run (Python) | Out of scope (Python services tienen su propio SDK Sentry si emerge necesidad) | N/A |

**Helper canónico**: `services/_shared/sentry-init.ts` (`initSentryForService(serviceName, options?)`).

- DSN missing → `console.warn` once + return (graceful degradation, captureWithDomain hace no-op via Sentry SDK builtin fallback).
- DSN present → `Sentry.init({ dsn, environment, serverName, release, tracesSampleRate })` + `Sentry.setTag('service', serviceName)`.
- Idempotente — singleton flag previene doble init + warn spam.
- Secret canónico GCP: `greenhouse-sentry-dsn` (Secret Manager). Si no existe, deploy.sh continúa con warn.

**Wrapper canónico**: `src/lib/observability/capture.ts` importa `@sentry/node` (NO `@sentry/nextjs`). `@sentry/node` es el SDK underlying que `@sentry/nextjs` envuelve — runtime-portable. Sentry hub es global singleton: ambos runtimes acceden al mismo hub.

**Contexto root cause** (ISSUE-074): TASK-813b (async intake p_services HubSpot via webhook → outbox → reactive consumer) nunca funcionó end-to-end en producción porque el wrapper importaba `@sentry/nextjs` cuyo shape variaba en runtime Cloud Run, causando `Sentry.captureException is not a function`. Detectado durante smoke test post-merge PR #113 (TASK-836 follow-up). Cerrado live 2026-05-09 19:30:04 con cycle PATCH→materialized verificado.

**⚠️ Reglas duras**:

- **NUNCA** importar `@sentry/nextjs` directamente en código bajo `src/lib/`. Usar `captureWithDomain(err, '<domain>', { extra })` desde `src/lib/observability/capture.ts` que abstrae `@sentry/node` runtime-portable.
- **NUNCA** crear nuevo Cloud Run Node service sin `initSentryForService(name)` como primera línea ejecutable de `server.ts`, después de imports y antes de `createServer`. Lint rule `greenhouse/cloud-run-services-must-init-sentry` (modo `error`) bloquea el commit.
- **NUNCA** invocar `Sentry.captureException()` directo en code path con dominio claro. Usar `captureWithDomain(err, '<domain>', { extra })`. Sin tag `domain`, el incident no aparece en signals per-module del reliability dashboard.
- **NUNCA** modificar `services/_shared/sentry-init.ts` para cambiar el contract de degradation. DSN missing DEBE no-op silenciosamente; observabilidad nunca bloquea path principal.
- **NUNCA** mover el call `initSentryForService(...)` después del primer createServer/listen en `server.ts`. Tiene que correr antes de cualquier handler HTTP que pueda invocar funciones de `@/lib/**`.
- **NUNCA** importar el helper desde `@/lib/...` o re-exportarlo desde `src/`. Vive intencionalmente en `services/_shared/` para preservar el boundary runtime (Vercel runtime usa init Next.js auto; Cloud Run runtime usa este helper explícito).
- **NUNCA** crashear el helper si DSN tiene formato inválido — Sentry SDK valida internamente y degrada graceful.
- **SIEMPRE** que emerja un Cloud Run Node service nuevo, agregar `initSentryForService('<nombre>')` + `COPY services/_shared/ ./services/_shared/` en Dockerfile + opcionalmente SENTRY_DSN secret mount en deploy.sh.
- **SIEMPRE** que un nuevo runtime aparezca (ej. Cloudflare Workers, AWS Lambda, generic Bun service), validar que `@sentry/node` corre allí o adaptar el wrapper sin cambiar la superficie de import.

**Defense-in-depth (3 capas)**:

1. **Lint rule** `greenhouse/cloud-run-services-must-init-sentry` (modo `error`, TASK-844 Slice 6): bloquea commits que crean `services/<svc>/server.ts` con import de `@/lib/**` sin `initSentryForService` import + call.
2. **Reliability signal** `observability.cloud_run.silent_failure_rate` (TASK-844 Slice 5): cuenta filas en `outbox_reactive_log` con `last_error LIKE '%captureException is not a function%'` últimas 24h. Steady=0; cualquier > 0 indica regresión runtime.
3. **Cloud Logging stderr fallback**: si Sentry no está configurado, errores siguen visibles en Cloud Logging via `console.error`/`console.warn`. Helper escribe warn al startup cuando DSN missing.

**Spec canónica**: `docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md`. ISSUE relacionado: `docs/issues/resolved/ISSUE-074-ops-worker-missing-sentry-bundle-blocks-projections.md` (post Slice 8).

### PostgreSQL connection management — runtime invariants (TASK-846)

Greenhouse comparte una única instancia Cloud SQL PostgreSQL 16 entre 5 runtimes (Vercel + 3 Cloud Run Node services + hubspot Python). Cada runtime tiene su propio pool de `pg-node` independiente. Sin coordinación cross-runtime explícita, cualquier runtime puede saturar el budget global de 100 conexiones (ISSUE detectado 2026-05-09: 103% saturation live + Sentry NEW issue 7 errors `remaining connection slots are reserved`).

**Architectural decision V1 deployed (TASK-846)**: defense-in-depth de 3 capas, deployment data-driven del multiplexer. NO se deploya PgBouncer en V1 — la evidencia post-Slice 1 ALTER ROLE (saturation 103% → 66%) indica que el problema fundamental era leak de idle connections, no demanda > capacidad.

**Topología V1 canónica**:

```text
Vercel functions × N    pool max=3, idleTimeoutMillis=10s    ──→ Cloud SQL
ops-worker              pool max=15, idleTimeoutMillis=30s        max_connections=100
commercial-cost-worker  (TASK-846 Slice 3)                        ALTER ROLE idle_session_timeout=5min
ico-batch                                                          (TASK-846 Slice 1)
                            ┌─ Reliability signal ─┐
                            │ runtime.postgres.    │
                            │ connection_saturation│   ← V2 trigger data-driven
                            │ ok < 60%             │
                            │ warning > 60%        │
                            │ error > 80%          │
                            └──────────────────────┘
```

**V2 contingente (TASK-846)**: si reliability signal alerta sustained > 60%, deploy PgBouncer en GKE Autopilot (~$75-85/mes). Cloud Run NO soporta TCP raw → PgBouncer NO va en Cloud Run.

**⚠️ Reglas duras**:

- **NUNCA** crear `Pool` de `pg-node` directo sin pasar por `getGreenhousePostgresConfig()` desde `src/lib/postgres/client.ts`. El helper aplica runtime detection (Vercel max=3, Cloud Run max=15) automáticamente. Lint rule `greenhouse/no-direct-pg-pool` (TASK-846 Slice 7) bloquea regresión.
- **NUNCA** configurar `max > 15` en Vercel function. La VLA ya satura PG con 5-10 functions concurrentes. Override solo con justificación documentada en task spec.
- **NUNCA** removeer `ALTER ROLE greenhouse_app SET idle_session_timeout = '5min'` ni `greenhouse_ops SET idle_session_timeout = '15min'`. Settings persistidos en `pg_roles.rolconfig` cross-restart. Verificación: `SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('greenhouse_app', 'greenhouse_ops')` debe devolver el timeout configurado.
- **NUNCA** usar `LISTEN/NOTIFY` desde aplicación. Greenhouse usa outbox pattern canónico (TASK-773). Garantiza compatibilidad con V2 PgBouncer transaction pooling cuando se deploye.
- **NUNCA** usar prepared statements server-side (`PREPARE ... EXECUTE`). `pg-node` por default usa simple Query — preserva compatibilidad transaction pooling.
- **NUNCA** ignorar el reliability signal `runtime.postgres.connection_saturation` en estado `unknown` por > 24h. Es la señal data-driven que dispara V2 deployment.
- **NUNCA** invocar `Sentry.captureException` directo en code path `src/lib/postgres/`. Usar `captureWithDomain(err, 'cloud', ...)`.
- **SIEMPRE** que emerja un nuevo runtime que necesite Postgres, usar `getGreenhousePostgresConfig()` que detecta runtime automáticamente. Override via env vars `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` / `GREENHOUSE_POSTGRES_IDLE_TIMEOUT_MS` solo con razón documentada.
- **SIEMPRE** monitorear `runtime.postgres.connection_saturation` en `/admin/operations`. Steady < 30% (V1 funcional). Sustained > 60% → escalar a TASK-847 V2 deployment.

**Defense-in-depth V1 (3 capas)**:

1. **PG-side `idle_session_timeout` por role** (ALTER ROLE): PG corta connections idle > 5min server-side. Persistente cross-restart.
2. **pg-node Pool tuning per-runtime**: max conservador, idleTimeoutMillis agresivo. Backpressure local.
3. **Reliability signal `runtime.postgres.connection_saturation`**: detecta regresión global. Trigger V2 deployment data-driven.

**Spec canónica**: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. Task implementación V1: `docs/tasks/in-progress/TASK-846-postgres-connection-pooling-v1-data-driven.md`. Task contingencia V2: `docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md`.

### HubSpot inbound webhook — companies + contacts auto-sync (TASK-706)

Cuando alguien crea o actualiza una company/contact en HubSpot, **NO requerir sync manual ni esperar al cron diario**. La app HubSpot Developer envía webhooks v3 a Greenhouse y el portal sincroniza automáticamente.

**Coexistencia con paths previos** (no se contraponen — los 3 convergen en el mismo motor `syncHubSpotCompanies`):

| Path | Trigger | Latencia | Rol |
|---|---|---|---|
| **Webhook** (TASK-706, default) | Event HubSpot | <10s | Path por defecto en producción. Captura el 99% de cambios en tiempo real. |
| **Adoption manual** (TASK-537) | Click en Quote Builder | <2s | Fallback rápido cuando el operador necesita avanzar antes que llegue el webhook (timeout, race UI), o adopt company antigua que predates webhook subscription. |
| **Cron diario** (TASK-536) | Schedule | ~24h | Safety net — sweep periódico que captura events perdidos (HubSpot retries exhausted, handler bug). NO desactivar aunque webhook esté en prod. |

Los 3 hacen UPSERT idempotente por `hubspot_company_id`. Si convergen al mismo company en el mismo segundo, no hay duplicados.

**Pipeline canónico**:
1. **HubSpot Developer Portal** → suscripción a `company.creation`, `company.propertyChange`, `contact.creation`, `contact.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies`. Signature method: v3.
2. **Endpoint Next.js** `/api/webhooks/hubspot-companies` (genérico `/api/webhooks/[endpointKey]/route.ts`) recibe POST.
3. **`processInboundWebhook`** lookup en `greenhouse_sync.webhook_endpoints` por `endpoint_key='hubspot-companies'`. Inbox row creado para idempotencia (dedupe by `event_id`).
4. **Handler `hubspot-companies`** (en `src/lib/webhooks/handlers/hubspot-companies.ts`) valida firma HubSpot v3 internamente (`auth_mode='provider_native'`):
   - HMAC-SHA256 sobre `POST + uri + body + timestamp` con `HUBSPOT_APP_CLIENT_SECRET`.
   - Rechaza requests con timestamp > 5 min de antigüedad.
   - Comparison timing-safe.
5. Extrae company IDs únicos del array de events (deduplica). Para `contact.*` usa `associatedObjectId` como company id.
6. Para cada company id, llama `syncHubSpotCompanyById(id, { promote: true, triggeredBy: 'hubspot-webhook' })`:
   - Fetch `/companies/{id}` y `/companies/{id}/contacts` desde Cloud Run bridge.
   - UPSERT en `greenhouse_crm.companies` + `greenhouse_crm.contacts`.
   - Llama `syncHubSpotCompanies({ fullResync: false })` para promover crm → `greenhouse_core.organizations` + `greenhouse_core.clients`.
7. Failures individuales se capturan en Sentry con `domain='integrations.hubspot'`. Si TODOS fallan → throw para que HubSpot reintente.

**⚠️ Reglas duras** (TASK-878 canonical async, desde 2026-05-14):
- **NO** crear endpoints paralelos para HubSpot. Si emerge necesidad de webhook para deals, products, etc., agregar nuevo handler bajo `src/lib/webhooks/handlers/` y nuevo `webhook_endpoints` row, NO endpoint custom.
- **NUNCA** llamar `syncHubSpotCompanyById` desde el webhook handler `hubspot-companies` (request path). El path canónico es emitir outbox event `commercial.hubspot_company.sync_requested v1` via `enqueueHubSpotCompanyEventsAsync`. La projection `hubspot_companies_intake` (TASK-878 Slice 2) consume el event en ops-reactive-finance cron fuera del request path.
- **NUNCA** hacer bridge fetch (Cloud Run hubspot-greenhouse-integration) sincrono dentro del webhook handler — HubSpot timeout 5s; el sync toma 3-10s y dispara retries concurrentes que generaron la race condition cerrada en Slice 1 (RETURNING canónico).
- **NUNCA** generar `company_record_id` / `contact_record_id` en TS antes del INSERT con la intención de hacer SELECT-verify posterior. Siempre `INSERT … ON CONFLICT DO UPDATE … RETURNING <pk>` (patrón canónico TASK-878 Slice 1, ya usado en `nubox/sync-nubox-balances.ts` y `sync/projections/hubspot-services-intake.ts`). El verify defensivo cazaba el síntoma, no la causa.
- **NUNCA** llamar `syncTenantCapabilitiesFromIntegration` inline en el webhook handler. La capability sync vive dentro del `refresh` de la projection (post-TASK-878 Slice 2).
- `syncHubSpotCompanyById` sigue invocable desde CLI scripts (`scripts/integrations/hubspot-sync-company.ts`), admin endpoint (`/api/admin/integrations/hubspot/sync-company`), Quote Builder adopt (TASK-537), y la projection `hubspot_companies_intake` — todos paths que corren fuera del 5s budget HubSpot.
- **NO** sincronizar manualmente si el webhook está activo. El CLI queda solo para backfills históricos o casos de recuperación.
- **NUNCA** loggear el body crudo del webhook en logs (puede contener PII de contactos). El sistema generic ya lo persiste en `greenhouse_sync.webhook_inbox_events` con scrubbing apropiado.
- Cuando se cree un nuevo cliente Greenhouse manualmente (sin pasar por HubSpot), seguir el patrón `hubspot-company-{ID}` solo si tiene HubSpot ID; si NO tiene HubSpot, usar otro prefix (ej. `internal-`, `nubox-`, etc.) para evitar colisión.
- **Reliability signal canónico** `commercial.hubspot_company.intake_dead_letter` (kind=dead_letter, severity=error si count>0, steady=0, subsystem rollup `commercial`). Cuando alerta: bridge Cloud Run caído, `HUBSPOT_ACCESS_TOKEN` corrupto/expirado, permisos OAuth revocados, o schema PG drift.

**Configuración HubSpot Developer Portal** (one-time):
1. App "Greenhouse Bridge" en `developers.hubspot.com/apps`.
2. Webhooks > Create subscription per evento.
3. Activar la app en el portal HubSpot del tenant (Account Settings > Integrations > Connected Apps).

**Tests**: `pnpm test src/lib/webhooks/handlers/hubspot-companies` (6 tests cubren signature validation, timestamp expiry, dedup, partial failures, retry semantics).

**Spec canónica**: `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (sección HubSpot inbound).

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

### Finance — reconciliación de income.amount_paid (factoring + withholdings)

Una factura (`greenhouse_finance.income`) puede saldarse por **3 mecanismos** distintos, y `amount_paid` es el total saldado independiente de cuál cerró cada porción:

1. **Pagos en efectivo** → `income_payments.amount`
2. **Fees de factoring** → `factoring_operations.fee_amount` cuando `status='active'`. La factura ESTÁ saldada por esa porción aunque la fee nunca llegue como cash — se vendió el riesgo AR al factoring provider. (Componente: `interest_amount` + `advisory_fee_amount`).
3. **Retenciones tributarias** → `income.withholding_amount`. El cliente retuvo parte y la paga al SII directo. La factura ESTÁ saldada por esa porción aunque nunca llegue a Greenhouse.

**Ecuación canónica**:

```text
amount_paid == SUM(income_payments.amount)
             + SUM(factoring_operations.fee_amount WHERE status='active')
             + COALESCE(withholding_amount, 0)
```

Cualquier diferencia es **`drift`** — un problema real de integridad de ledger que requiere humano.

**Reglas duras**:

- **NUNCA** computar drift como `amount_paid - SUM(income_payments)` solo. Eso ignora factoring + withholdings y produce drift falso para cada factura factorada.
- **Usar siempre** la VIEW canónica `greenhouse_finance.income_settlement_reconciliation` o el helper `src/lib/finance/income-settlement.ts` (`countIncomesWithSettlementDrift`, `getIncomeSettlementBreakdown`, `listIncomesWithSettlementDrift`).
- Cuando aparezca un nuevo mecanismo de settlement (notas de crédito, write-offs parciales, retenciones extranjeras, etc.), extender **ambos**: la VIEW (migración nueva con `CREATE OR REPLACE VIEW`) y el helper TypeScript. Nunca branchear la lógica en un consumer.
- El Reliability Control Plane (`Finance Data Quality > drift de ledger`) lee desde esta VIEW. Bypass = dashboards inconsistentes.

### Finance — Ledger drift detection: superseded exclusion + honest degradation (TASK-929, desde 2026-05-24)

Dos invariantes canónicos descubiertos/canonizados live al remediar `JAVASCRIPT-NEXTJS-4Q`:

**1. La VIEW `income_settlement_reconciliation` DEBE excluir pagos superseded en `payments_total`.** El subquery de pagos filtra `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL AND superseded_at IS NULL` — mirror EXACTO de `fn_recompute_income_amount_paid`. Antes de TASK-929 la VIEW sumaba TODOS los `income_payments` (incluyendo superseded) mientras el `fn` los excluía → **dos definiciones de la misma ecuación desalineadas** → falsos positivos de drift en facturas factorizadas (el pago NUBOX original superseded por el modelo factoring se contaba doble). Con el ledger churning (Nubox re-sync supersede/re-add constante), la VIEW vieja **flickeaba** drift.
- **NUNCA** modificar `income_settlement_reconciliation` (ni `fn_recompute_income_amount_paid`) sin actualizar el otro en paralelo. Son la MISMA ecuación canónica — settlement = `SUM(pagos activos) + factoring_fee (active) + withholding`. Drift entre ambos = falsos positivos/negativos de drift.
- **NUNCA** sumar `income_payments` sin filtrar las 3 cadenas de supersede (`superseded_by_payment_id`, `superseded_by_otb_id`, `superseded_at`) cuando el propósito es reconciliación de `amount_paid`.

**2. `getFinanceLedgerHealth` NO debe colapsar un error de query a "0 drift" (false-healthy).** Cada check va envuelto en `tracked(name, promise, fallback)` que registra el check en `degradedChecks: string[]` cuando su query falla. `healthy` exige `degradedChecks` sin ningún check `DECISION_CRITICAL` degradado — no se puede declarar el ledger sano estando ciego a un check. Bug class ISSUE-071 / Pillar 3: verificado live 2026-05-24 (un probe con blip de proxy devolvió `healthy=true` mientras la VIEW tenía 4 drift rows).
- **NUNCA** envolver un check de `getFinanceLedgerHealth` en `.catch(() => [])` plano. Usar `tracked(...)` para que el fallo sea visible en `degradedChecks`, no silencioso.
- **NUNCA** agregar un check decision-critical nuevo sin añadirlo al set `DECISION_CRITICAL_CHECKS`. Los checks `*_sample`/informacionales degradados se surfacing pero NO flipean `healthy`.
- El `driftSignature` del cron ops-worker (`buildFinanceLedgerDriftSignature`) incluye `degradedChecks` → un check degradado cambia la firma y dispara alerta Sentry distinta del drift normal.

**Signal canónico**: `finance.ledger.unresolved_drift_items` (`src/lib/reliability/queries/ledger-unresolved-drift-items.ts`, subsystem Finance Data Quality). Severidad tiered: settlement drift > 0 → `error` (integridad); solo unanchored > 0 → `warning` (data-completeness — los gastos sin FK-anchor que tienen `economic_category` no rompen P&L); ambos 0 → `ok`.

**Inventory read-only** (control surface, NO muta): `getLedgerDriftInventory()` + `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/ledger-drift-inventory.ts`. Clasifica drift por tipo + rutea unanchored por materialidad ($50k CLP default, `LEDGER_DRIFT_UNANCHORED_MATERIALITY_CLP` env). La materialidad gobierna **routing**, NUNCA detección (la VIEW detecta todo a tolerancia 0.01).

**Spec canónica**: `docs/tasks/in-progress/TASK-929-finance-ledger-drift-remediation-control.md`.

### Finance — Unanchored paid expense acknowledgment (TASK-934, desde 2026-05-25)

Un gasto pagado sin FK-anchor (todos `payroll_entry_id`/`tool_catalog_id`/`supplier_id`/`tax_type`/`loan_account_id`/`linked_income_id` NULL) pero CON `economic_category` es **data-completeness, no integridad**. Dos resoluciones canónicas:

- **Anclar** (vendor real, ej. Vercel/Beeconta): reuse del PUT existente `/api/finance/expenses/[id]` con `supplierId`. NO endpoint nuevo.
- **Aceptar como deuda conocida** (labor a personas — contratistas internacionales, staff interno — + regulatory/bank fees, donde un `supplier_id` sería category error): helper canónico `acknowledgeUnanchoredExpense` (`src/lib/finance/ledger-drift/acknowledge-unanchored.ts`) + `POST /api/admin/finance/expenses/[id]/acknowledge-unanchored` (capability `finance.expenses.acknowledge_unanchored`).

**⚠️ Reglas duras**:

- **NUNCA** modelar la "cola de revisión" de unanchored como tabla-cola paralela con state machine. El acknowledgment vive ON the expense (columnas `unanchored_acknowledged_at/by/reason`), single source of truth — espejo de `dismiss-phantom.ts` (que usa `superseded_at` en la fila). Una tabla-cola duplicaría el estado del expense → sync risk.
- **NUNCA** usar las columnas `unanchored_acknowledged_*` para VOID/supersede. El gasto se queda íntegro en P&L; acknowledgment solo registra "aceptado, clasificado por economic_category, sin supplier apropiado". NO confundir con `dismiss-phantom` (que sí anula un payment phantom).
- **NUNCA** acknowledgear un gasto que tenga cualquier FK-anchor o que no esté `paid`. El helper hace guards defensivos (throw 422 `ACKNOWLEDGE_ALREADY_ANCHORED` / `ACKNOWLEDGE_NOT_PAID`).
- **NUNCA** mutar `unanchored_acknowledged_*` por SQL directo. Toda aceptación pasa por `acknowledgeUnanchoredExpense` (idempotente, reason >= 10 chars, outbox `finance.expense.unanchored_acknowledged v1`).
- **SIEMPRE** que un consumer lea "unanchored pendiente" (health/inventory/signal), filtrar `AND unanchored_acknowledged_at IS NULL`. Los acknowledged se exponen separados (`acknowledgedDebt` en health, sección `acknowledged` en inventory) — SUM-of-unadjusted, visible pero fuera de pendientes; NO afectan `healthy`.

**Spec canónica**: `docs/tasks/in-progress/TASK-934-unanchored-paid-expense-anchoring-review-queue.md`. Capability: `finance.expenses.acknowledge_unanchored` (FINANCE_ADMIN + EFEONCE_ADMIN). Evento: `finance.expense.unanchored_acknowledged v1`.

### Finance — FX P&L canónico para tesorería (Banco "Resultado cambiario")

El "Resultado cambiario" del Banco se compone de **3 fuentes legítimas** y debe leerse SIEMPRE desde la VIEW canónica + helper, no re-derivar:

1. **Realized FX en settlement** — diferencia entre rate documento (issuance) y rate pago para invoices/expenses no-CLP. Persistido en `income_payments.fx_gain_loss_clp` + `expense_payments.fx_gain_loss_clp`, agregado por día en `account_balances.fx_gain_loss_realized_clp`.
2. **Translation FX** — revaluación mark-to-market diaria de saldos no-CLP cuando se mueve el tipo de cambio. Computado en `materializeAccountBalance` como `closing_balance_clp − previous_closing_balance_clp − (period_inflows − period_outflows) × rate_today`. Persistido en `account_balances.fx_gain_loss_translation_clp`.
3. **Realized FX en transferencias internas** — placeholder = 0 hoy. Se activa cuando una TASK derivada introduzca `greenhouse_finance.internal_transfers` con rate spread vs mercado.

**Read API canónico**: VIEW `greenhouse_finance.fx_pnl_breakdown` + helper `src/lib/finance/fx-pnl.ts` (`getBankFxPnlBreakdown`).

**UI honesta — NO mostrar `$0` silencioso**: la card debe distinguir tres estados:
- `hasExposure === false` → "Sin exposición FX" con stat `—` (caso Efeonce hoy: 100% CLP)
- `hasExposure && !isDegraded` → total + breakdown "Realizado X · Translación Y" + tooltip canónico
- `isDegraded === true` → "Pendiente" + warning rojo (rate ausente para alguna cuenta no-CLP)

**Reglas duras**:

- **NUNCA** sumar FX P&L desde `income_payments`/`expense_payments` directo en un nuevo query. Toda lectura cruza la VIEW o el helper.
- **NUNCA** dejar `$0` literal cuando `hasExposure === false`. Es un cero ambiguo que confunde "sin exposición" con "cálculo roto".
- **NUNCA** branchear la ecuación en un consumer. Cuando aparezca una fuente nueva (notas de crédito en moneda extranjera, forward contracts, etc.), extender **ambos**: la VIEW (migración con `CREATE OR REPLACE VIEW`) y el helper TS.
- **NUNCA** loggear silenciosamente cuando `resolveExchangeRateToClp` falla. Usar `captureWithDomain(err, 'finance', { tags: { source: 'fx_pnl_translation' } })` y degradar a `translation = 0` — degradación honesta, nunca bloquear la materialización del snapshot diario.
- Patrón canónico replicado de `income_settlement_reconciliation` (TASK-571 / TASK-699). Cuando se necesite "una columna compuesta de N mecanismos legítimos", aplicar este shape: VIEW + helper TS + comments anti re-derive + UI con estados honestos.

### Finance — CLP currency reader invariants (TASK-766)

Toda lectura de `expense_payments` o `income_payments` que necesite saldos en CLP **debe** ir por la VIEW canónica + helper TS. NUNCA recomputar `monto_clp = ep.amount × exchange_rate_to_clp` en SQL embebido.

**Por qué**: el campo `exchange_rate_to_clp` vive en el documento original (`expenses` / `income`). Cuando un expense en USD se paga en CLP (caso CCA shareholder reimbursable TASK-714c), multiplicar el monto CLP nativo del payment por el rate USD del documento infla los KPIs en mil millones por payment. Incidente real 2026-05-02: `/finance/cash-out` mostraba $1.017.803.262 vs real $11.546.493 (88× inflado), todo por **un** payment HubSpot CCA.

**Read API canónico**:
- VIEW: `greenhouse_finance.expense_payments_normalized` y `greenhouse_finance.income_payments_normalized`. Exponen `payment_amount_clp` (COALESCE chain: `amount_clp` first → CLP-trivial fallback `WHEN currency='CLP' THEN amount` → `NULL` + `has_clp_drift=TRUE`). Aplican filtro 3-axis supersede inline.
- Helpers TS: `src/lib/finance/expense-payments-reader.ts` y `src/lib/finance/income-payments-reader.ts`.
  - `sumExpensePaymentsClpForPeriod({fromDate, toDate, expenseType?, supplierId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, supplierClp, payrollClp, fiscalClp, driftCount}`
  - `sumIncomePaymentsClpForPeriod({fromDate, toDate, clientProfileId?, isReconciled?})` → `{totalClp, totalPayments, unreconciledCount, driftCount}`
  - `listExpensePaymentsNormalized({...})` y `listIncomePaymentsNormalized({...})` para detalle paginado
  - `getExpensePaymentsClpDriftCount()` y `getIncomePaymentsClpDriftCount()` para reliability signals

**Backfill + drift defense (Slice 2)**:
- `expense_payments` y `income_payments` tienen columna `requires_fx_repair BOOLEAN` que marca filas con `currency != 'CLP' AND amount_clp IS NULL`.
- CHECK constraint `payments_amount_clp_required_after_cutover` (NOT VALID + VALIDATE atomic, mirror del patrón TASK-708/728 con cutover 2026-05-03): rechaza INSERT/UPDATE post-cutover sin `amount_clp` para non-CLP, salvo supersede activo.
- Reliability signals canónicos: `finance.expense_payments.clp_drift` + `finance.income_payments.clp_drift` (kind=drift, severity=error si count>0, steady=0). Subsystem rollup: `Finance Data Quality`.

**Lint rule mecánica (Slice 3)**:
- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error`. Detecta SQL embedido con 4 patrones (expense + income, con/sin COALESCE) — `ep.amount * exchange_rate_to_clp`, `ep.amount * COALESCE(e.exchange_rate_to_clp, 1)`, idem `ip.amount`. Bloquea el commit.
- Override block en `eslint.config.mjs` exime los readers canónicos (`src/lib/finance/expense-payments-reader.ts`, `src/lib/finance/income-payments-reader.ts`) — son la única fuente legítima de la VIEW.

**Repair admin endpoint (Slice 5)**:
- `POST /api/admin/finance/payments-clp-repair` (capability `finance.payments.repair_clp`, FINANCE_ADMIN + EFEONCE_ADMIN). Body: `{kind: 'expense_payments'|'income_payments', paymentIds?, fromDate?, toDate?, batchSize?, dryRun?}`. Resuelve rate histórico al `payment_date` desde `greenhouse_finance.exchange_rates` (rate vigente al pago, NO el actual) y poblá `amount_clp + exchange_rate_at_payment + requires_fx_repair=FALSE` per-row atomic. Idempotente. Outbox audit `finance.payments.clp_repaired` v1.

**⚠️ Reglas duras**:
- **NUNCA** escribir `SUM(ep.amount * exchange_rate_to_clp)`, `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))` ni variantes con `ip.amount`. Lint rule `greenhouse/no-untokenized-fx-math` rompe build.
- **NUNCA** sumar `payment.amount` directo y luego multiplicar por rate del documento en código TS — el rate del documento puede ser de issuance USD pero el payment puede ser CLP nativo. La VIEW resuelve esto correctamente.
- **NUNCA** crear un nuevo callsite de KPIs CLP sin pasar por `sumExpensePaymentsClpForPeriod` / `sumIncomePaymentsClpForPeriod`. Si el caso de uso pide breakdown nuevo (e.g. por supplier_id), extender el helper, NO duplicar SQL.
- **NUNCA** ignorar `driftCount` en surfaces que ya lo exponen. UI debe banner anomalies cuando `driftCount > 0` para que el operador invoque `/api/admin/finance/payments-clp-repair`.
- **NUNCA** hacer DELETE manual de filas con `requires_fx_repair=TRUE` para "limpiar" el dashboard. Usar el endpoint de repair (idempotente, audit trail completo).
- **NUNCA** modificar la VIEW sin actualizar también: helpers TS, tests anti-regresión KPI, lint rule (si emerge un nuevo anti-patrón), reliability signals.
- Cuando emerja una nueva primitiva de payment (e.g. `treasury_movement`, `intercompany_transfer`), debe nacer con `amount_clp` desde el INSERT (la helper canónica `recordExpensePayment` / `recordIncomePayment` ya resuelven rate histórico al insert) y CHECK constraint anti-NULL desde el day-1.

**Spec canónica**: `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`. Replica los patrones de TASK-571 (settlement reconciliation), TASK-699 (FX P&L breakdown), TASK-721 (canonical helper enforcement), TASK-708/728 (CHECK NOT VALID + VALIDATE atomic).

### Finance — Account balances FX consistency (TASK-774, extiende TASK-766)

`materializeAccountBalance` (`src/lib/finance/account-balances.ts`) **debe** consumir las VIEWs canónicas TASK-766 (`expense_payments_normalized`, `income_payments_normalized`) + COALESCE(`settlement_legs.amount_clp`, ...) para computar `period_inflows`/`period_outflows`. NUNCA `SUM(payment.amount)` directo.

**Por qué**: bug Figma EXP-202604-008 (2026-05-03). Payment USD $92.9 desde TC Santander Corp (cuenta CLP) sumaba +$92.9 nativo en lugar de +$83,773.5 CLP equivalente. Mismo anti-patrón sistémico que TASK-766 cerró para cash-out KPIs, quedó vivo en path account_balances.

**Read API canónico** (extiende TASK-766):

- En `getDailyMovementSummary` (helper privado del materializer):
  - `income_payments`: lee `income_payments_normalized.payment_amount_clp` (VIEW canónica TASK-766).
  - `expense_payments`: lee `expense_payments_normalized.payment_amount_clp` (VIEW canónica TASK-766).
  - `settlement_legs`: COALESCE inline `COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)`. Settlement_legs no tiene VIEW propia (1 callsite, YAGNI; promover a VIEW si emerge segundo callsite).
- Toda agregación SUM se hace sobre el alias resultante del subselect (`SUM(amount)`), NO sobre `SUM(ep.amount)` / `SUM(ip.amount)` / `SUM(sl.amount)` directo.

**Reliability signal canónico**:

- `finance.account_balances.fx_drift` (kind=`drift`, severity=`error` si count>0, steady=0). Recompute expected delta desde VIEWs canónicas + COALESCE settlement_legs y compara contra persisted (`period_inflows - period_outflows`). Tolerancia $1 CLP (anti FP-noise). Ventana 90 días. Reader: `src/lib/reliability/queries/account-balances-fx-drift.ts`. Subsystem rollup: `Finance Data Quality`.

**Lint rule mecánica** (extiende TASK-766):

- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` modo `error`. Nuevos patrones TASK-774:
  - `SUM(ep.amount)` → usar `payment_amount_clp` via `expense_payments_normalized`
  - `SUM(ip.amount)` → usar `payment_amount_clp` via `income_payments_normalized`
  - `SUM(sl.amount)` → usar `COALESCE(sl.amount_clp, CASE WHEN currency='CLP' THEN amount END)`

**Backfill defensivo**:

- Cron diario `ops-finance-rematerialize-balances` rematerializa últimos 7 días automáticamente — el fix se propaga sin script para casos recientes (incluye Figma 2026-05-03).
- Para histórico > 7 días: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/backfill-account-balances-fx-fix.ts --account-id=<id> --from-date=<YYYY-MM-DD>` (idempotente, dry-run mode).

**⚠️ Reglas duras** (sumadas a las de TASK-766):

- **NUNCA** leer `expense_payments` / `income_payments` directo en `account-balances.ts` ni en cualquier materializer downstream. Use VIEWs canónicas TASK-766.
- **NUNCA** sumar `settlement_legs.amount` sin COALESCE con `amount_clp`. Settlement_legs tiene columna `amount_clp` opcional desde migration `20260408103211338`.
- **NUNCA** crear materializer nuevo (e.g. `account_balances_monthly`, `treasury_position`, `cashflow_summary`) sin pasar por estas VIEWs. Si emerge necesidad de nueva VIEW (ej. `treasury_movements_normalized` para una nueva primitiva), aplicar el mismo patrón TASK-766 (CTE COALESCE + filtro 3-axis supersede inline + `payment_amount_clp` column).
- Cuando emerja un nuevo callsite que necesite CLP-equivalent, agregar a la VIEW canónica un campo nuevo (e.g. `payment_amount_clp_excluding_fx_gain`) — NO recompute inline.

**Spec canónica**: `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md`. Patrón aplicado al path account_balances después de TASK-766 que cubrió cash-out.

### Finance — Rolling rematerialize anchor contract (TASK-871, supersedes ISSUE-069, 2026-05-13)

Todo callsite que invoque `rematerializeAccountBalanceRange` desde un cron rolling o el remediation control plane **debe** pasar por las dos primitives canónicas:

1. `computeRollingRematerializationWindow(today, lookbackDays)` → `{ targetStartDate, seedDate, materializeStartDate, materializeEndDate, lookbackDays, policy: 'rolling_window_repair' }` ([services/ops-worker/finance-rematerialize-seed.ts](services/ops-worker/finance-rematerialize-seed.ts)).
2. `resolveCleanSeedDate({ client, accountId, candidateSeedDate, maxExpandDays=30 })` → `{ ok: true, cleanSeed, ... }` o `{ ok: false, reason: 'exceeded_max_expand', ... }` ([src/lib/finance/account-balances-clean-seed-resolver.ts](src/lib/finance/account-balances-clean-seed-resolver.ts)).

**Por qué**: el contrato canónico de `rematerializeAccountBalanceRange` ([src/lib/finance/account-balances-rematerialize.ts:258](src/lib/finance/account-balances-rematerialize.ts#L258)) **NO materializa el día seed** — itera desde `seedDate + 1`. El día seed se inserta como ancla muda para preservar reconciliation snapshots TASK-721 y respetar el OTB anchor TASK-703.

**Bug class** (ISSUE-069 partial → TASK-871 complete): el fix de ISSUE-069 cambió `today − lookbackDays` → `today − (lookbackDays + 1)`, moviendo el día ciego un día atrás pero NO eliminando la clase estructural. Si en el `seedDate` resultante existen movements canonicos (`settlement_legs`, `income_payments_normalized`, `expense_payments_normalized`), esos movements quedan invisibles. La clase recurrió el 2026-05-13 con 3 cuentas afectadas en `2026-05-05`.

**Fix canónico** (TASK-871, defense-in-depth):

- El cron handler (services/ops-worker/server.ts) compone window + integrity check per-account:
  - Si protected snapshot en window → anchor on it (skip integrity check; operator-accepted closing IS truth).
  - Si no → `resolveCleanSeedDate(window.seedDate)`. Walks backward hasta clean anchor o devuelve `exceeded_max_expand` para escalar.
- El remediator (`src/lib/finance/account-balances-fx-drift-remediation.ts`) tiene 5to policy value `rolling_window_repair`:
  - classifier: matches seed-blind-spot signature + open period + no protected snapshot en día exacto → `auto_remediable, reason='rolling_window_repair_eligible'`.
  - executor: `seedMode='explicit'` (preserves OTB cache) + `evidenceGuard='block_on_reconciled_drift'` (canonical, no restate over reconciled).
- `computeRematerializeSeedDate` permanece como wrapper back-compat que devuelve `window.seedDate` — tests ISSUE-069 siguen verdes.

**⚠️ Reglas duras**:

- **NUNCA** pasar a `rematerializeAccountBalanceRange` un `seedDate` que tenga `settlement_legs` / `income_payments_normalized` / `expense_payments_normalized` con `transaction_date = seedDate`. La primitive seed = ancla muda; movements ahí desaparecen del materialized. El integrity check `resolveCleanSeedDate` es la única forma canónica de garantizarlo.
- **NUNCA** modificar el contrato de `rematerializeAccountBalanceRange` (seed no se materializa). Es load-bearing para reconciliation snapshots TASK-721 + OTB anchor TASK-703.
- **NUNCA** (TASK-938) materializar `account_balances` con `balance_date < genesis_date` del OTB activo de la cuenta. El `rematerializeAccountBalanceRange` aplica un **genesis floor** vía `applyGenesisFloor` (pura): si el seed resuelto cae antes del genesis, clampea al genesis + opening del OTB. Sin ese floor, un rematerialize en modo `explicit` seedeado < genesis re-crea filas pre-anchor que el cascade TASK-703b prunea (regresión real: global66-clp quedó con filas stale 03-06/04-04 re-creadas ~22h después del cascade). Cualquier callsite nuevo que invoque el rematerializer hereda el floor — NO lo bypasees. Espejo en el detector: `finance.account_balances.fx_drift` ignora fechas `< genesis` (son pre-anchor; el OTB las absorbe), evitando drift artificial. Si emerge necesidad de limpiar filas pre-genesis stale ya existentes, hacerlo vía `cascade_supersede_pre_otb_transactions` (gated, dry-run, ojo con transferencias internas que superseden un solo lado) — NUNCA con DELETE manual.
- **NUNCA** modificar `computeRollingRematerializationWindow` para devolver `seedDate = targetStartDate`. El contracto `seedDate = materializeStartDate − 1` es invariante canónico.
- **NUNCA** usar `seedMode='active_otb'` en un cron rolling. Mutaría `accounts.opening_balance` cache para drift transitorio. Reservado para audited backfills / full replays.
- **NUNCA** usar `evidenceGuard: 'warn_only'` en rolling repair. `warn_only` se reserva para `known_bug_class_restatement` con intent operador explícito.
- **NUNCA** silenciar el escalation cuando `resolveCleanSeedDate` devuelve `ok=false`. El caller DEBE emitir `captureWithDomain('finance', ...)` + skip + permitir escalación humana a `historical_restatement`.
- **NUNCA** crear nuevo callsite que invoque rematerialize sin pasar por las dos primitives. Si emerge un cron nuevo (e.g. `rematerialize-monthly-balances`), extender o componer las primitives; nunca duplicar date math inline.
- **NUNCA** modificar el SQL de `resolveCleanSeedDate` para reducir scope sin extender el reliability signal `finance.account_balances.fx_drift` en paralelo. Drift detection y prevention deben moverse juntos.
- **SIEMPRE** que emerja un nuevo movement primitive (e.g. `treasury_movement`, `intercompany_transfer`, `factoring_leg`), debe ser detectado por `resolveCleanSeedDate` — extender el SQL del helper, NO duplicar lógica inline.
- **SIEMPRE** que se modifique el state machine del rolling repair (window primitive, resolver, classifier, executor), correr el test suite anti-regresión `services/ops-worker/finance-rematerialize-invariants.test.ts` (4 invariantes pin-eados: shape, cleanSeed semantics, escalation, composition).

**Helpers canónicos**:

- Window: [services/ops-worker/finance-rematerialize-seed.ts](services/ops-worker/finance-rematerialize-seed.ts)
- Integrity check: [src/lib/finance/account-balances-clean-seed-resolver.ts](src/lib/finance/account-balances-clean-seed-resolver.ts)
- Remediation policy: [src/lib/finance/account-balances-fx-drift-remediation.ts](src/lib/finance/account-balances-fx-drift-remediation.ts) (`rolling_window_repair` value)
- Cron handler wire-up: [services/ops-worker/server.ts](services/ops-worker/server.ts) `handleFinanceRematerializeBalances`

**Tests anti-regresión**:

- [services/ops-worker/finance-rematerialize-seed.test.ts](services/ops-worker/finance-rematerialize-seed.test.ts) (20 tests: shape, invariants, edge cases, back-compat)
- [src/lib/finance/account-balances-clean-seed-resolver.test.ts](src/lib/finance/account-balances-clean-seed-resolver.test.ts) (11 tests: clean/dirty days, max expand, incident shape)
- [src/lib/finance/account-balances-fx-drift-remediation.test.ts](src/lib/finance/account-balances-fx-drift-remediation.test.ts) (6 new tests: classify, executor, telemetry, skip)
- [services/ops-worker/finance-rematerialize-invariants.test.ts](services/ops-worker/finance-rematerialize-invariants.test.ts) (7 tests: 4 structural invariants + 30-iter property check)

**Diagnostic operator tool**: [scripts/finance/diagnose-fx-drift.ts](scripts/finance/diagnose-fx-drift.ts) — lista detalle por (account, fecha) con drift activo. Útil para verificar qué cuentas necesitan recovery antes de invocar el remediator con policy=`rolling_window_repair`.

**Spec canónica**: `docs/tasks/complete/TASK-871-account-balance-rolling-anchor-contract.md`. Predecesor (parcial): `docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md` (actualizado 2026-05-13 con nota "fix parcial; TASK-871 cierra contrato completo").

### Finance — Account drawer temporal modes contract (TASK-776)

Todo drawer/dashboard de finance que muestre agregaciones temporales DEBE declarar `temporalMode: 'snapshot' | 'period' | 'audit'` (declarado en `instrument-presentation.ts` per categoría) y resolver su ventana via helper canónico `resolveTemporalWindow`. NUNCA calcular `fromDate`/`toDate` inline en consumers.

**Por qué**: el `AccountDetailDrawer` mezclaba 4 surfaces con 4 ventanas temporales independientes sin contract declarado (KPIs acumulados + chart 12m + lista filtrada por mes + banner OTB). Caso real 2026-05-03: balance Santander Corp $1.225.047 correcto post-fix TASK-774, pero lista "Movimientos" vacía porque filtraba Mayo 2026 mientras el cargo Figma fue 29/04. Operador veía "balance bajó pero no veo el cargo" → confusión + ticket.

**Contract canónico** (`src/lib/finance/instrument-presentation.ts` + `src/lib/finance/temporal-window.ts`):

- `TemporalMode = 'snapshot' | 'period' | 'audit'` enum cerrado.
- `TemporalDefaults = { mode: TemporalMode; windowDays?: number }` declarado per profile.
- Helper `resolveTemporalWindow({mode, year?, month?, anchorDate?, windowDays?, today?})` retorna `{fromDate, toDate, modeResolved, label, spanDays}`.
- Degradación honesta: input incompleto (e.g. `mode='period'` sin year/month) cae a snapshot, NO throw silente.

**Defaults declarativos por categoría**:

- `bank_account` / `credit_card` / `fintech` → `snapshot` (windowDays=30) — caso de uso "qué pasa hoy".
- `shareholder_account` (CCA) → `audit` — auditoría completa desde anchor.
- `processor_transit` (Deel/Stripe/etc.) → `period` — cierre mensual comisiones.

**Endpoint** `/api/finance/bank/[accountId]`:

- Query params: `?mode=snapshot|period|audit&windowDays=30&year=2026&month=5&anchorDate=2026-04-07`. Todos opcionales.
- Backward compat 100%: si solo viene `year+month` sin `mode`, comportamiento legacy intacto (`mode='period'` implícito).
- Response incluye `movementsWindow: {fromDate, toDate, mode, label}` para chip header del drawer.

**Drawer**:

- Selector inline `ToggleButtonGroup` con 3 modos (Reciente | Período | Histórico) + tooltips MUI.
- Chip header: "Mostrando: Últimos 30 días" / "Mostrando: Mayo 2026" / "Mostrando: Desde 07/04/2026".
- Banner OTB condicional: SOLO en `mode='audit'` o `'period'` pre-anchor. En `'snapshot'` sin movimientos, hint para cambiar a Histórico.
- `useEffect` resetea `temporalMode` cuando cambia `accountId` (nueva cuenta hereda su default declarativo via primera carga sin override).

**⚠️ Reglas duras**:

- **NUNCA** calcular `fromDate`/`toDate` inline en un drawer/dashboard de finance. Toda resolución pasa por `resolveTemporalWindow`.
- **NUNCA** mezclar modos en surfaces del mismo render (e.g. KPIs `period` + lista `snapshot` simultáneamente). Los 3 modos son atómicos por surface temporal.
- **NUNCA** crear un drawer/dashboard nuevo de finance que muestre agregaciones temporales sin declarar `temporalDefaults` en su `InstrumentDetailProfile`. Default fallback `period` (legacy) solo cubre back-compat — explicitar siempre.
- **NUNCA** hardcodear el `mode` en el componente UI. Default viene del profile (declarativo, extensible). Operator override via selector inline.
- Cuando emerja un nuevo modo (`quarter`, `ytd`, `last_n_months`), agregar al enum `TemporalMode` + extender helper. NO branchear en consumers.

**Spec canónica**: `docs/tasks/in-progress/TASK-776-account-detail-drawer-temporal-modes-contract.md`. Doc funcional: `docs/documentation/finance/drawer-vista-temporal.md`.

### Finance — Economic Category Dimension Invariants (TASK-768)

**`expense_type` y `income_type` son taxonomía FISCAL/SII** (legacy `accounting_type` alias). Para análisis económico (KPIs, ICO, P&L gerencial, Member Loaded Cost, Budget Engine, Cost Attribution) se usa la dimension separada **`economic_category`** persistida en `greenhouse_finance.expenses.economic_category` y `income.economic_category`.

**Por qué**: el bank reconciler defaultea `expense_type='supplier'` cuando crea expenses desde transacciones bancarias sin metadata rica. Eso sesga KPIs Nómina/Proveedores en mil-millones cuando un payment económicamente-payroll cae en bucket fiscal-supplier (caso real abril 2026: ~$3M en pagos a Daniela España, Andrés Colombia, Valentina, Humberly, Previred clasificados como Proveedor cuando económicamente son Nómina).

**Decision tree para nuevo código**:

- ¿Es lectura para SII / VAT / IVA / regulatory? → usa `expense_type` / `income_type`.
- ¿Es lectura para KPIs / dashboards / P&L gerencial / ICO / cost attribution? → usa `economic_category`.

**API canónico**:

- VIEW `expense_payments_normalized` y `income_payments_normalized` (TASK-766 + TASK-768 extendidas) exponen ambas dimensiones via JOIN.
- Helpers `sumExpensePaymentsClpForPeriod` / `sumIncomePaymentsClpForPeriod` retornan `byEconomicCategory` breakdown (11 keys expense, 8 keys income) + `economicCategoryUnresolvedCount` + campos legacy preservados (backwards-compat TASK-766).
- Resolver canónico `resolveExpenseEconomicCategory(...)` / `resolveIncomeEconomicCategory(...)` (`src/lib/finance/economic-category/resolver.ts`) — único helper que mapea inputs a categoría con rules engine declarativo.
- Reclassification endpoints: `PATCH /api/admin/finance/expenses/[id]/economic-category` + mirror income (capability granular `finance.expenses.reclassify_economic_category` / `finance.income.reclassify_economic_category`, FINANCE_ADMIN + EFEONCE_ADMIN, audit log + outbox `finance.expense.economic_category_changed` v1).
- Manual queue: `greenhouse_finance.economic_category_manual_queue` para filas con confidence low/manual_required pendientes de operador.
- Audit log append-only: `economic_category_resolution_log` (trigger anti-update/delete).

**Defensa-en-profundidad**:

- Trigger PG `populate_expense_economic_category_default_trigger` BEFORE INSERT — poblar default desde transparent map de `expense_type` (cero invasivo a 12 canonical writers existentes).
- Trigger mirror `populate_income_economic_category_default_trigger`.
- CHECK constraint `expenses_economic_category_required_after_cutover` (NOT VALID; VALIDATE post-resolución manual queue).
- CHECK constraint `expenses_economic_category_canonical_values` (VALIDATED — 11 valores enumerados; 8 income).
- Lint rule `greenhouse/no-untokenized-expense-type-for-analytics` modo `error` — bloquea `e.expense_type =`, `GROUP BY e.expense_type`, `FILTER (WHERE i.income_type ...)` en código nuevo. Override block exime SII/VAT/operacional/resolver.
- Reliability signals canónicos: `finance.expenses.economic_category_unresolved` + `finance.income.economic_category_unresolved` (kind=drift, severity=error si count>0, steady=0 post-cleanup, subsystem `finance_data_quality`).

**⚠️ Reglas duras**:

- **NUNCA** filtres/agrupes por `expense_type` / `income_type` en consumers analíticos. Lint rule rompe build.
- **NUNCA** modifiques `expense_type` legacy histórico — está reservado para SII/VAT y blast radius enorme.
- **NUNCA** poblar `economic_category` con string libre — solo valores del enum canónico (CHECK constraint `canonical_values` lo bloquea).
- **NUNCA** computes `economic_category` en read-time (lente derivada). Es columna persistida; consumers la leen directo.
- **NUNCA** bypass del resolver canónico. Si emerge un nuevo path de payments (ej. wallets, intercompany), debe llamar `resolveExpenseEconomicCategory` / `resolveIncomeEconomicCategory` o agregar regla nueva al rules engine.
- Cuando emerja un nuevo proveedor regulador chileno (otra Isapre, AFP nueva) o vendor de payroll internacional (Multiplier++, etc.), agregar fila a `greenhouse_finance.known_regulators` o `known_payroll_vendors` (seed declarativo) — NO código nuevo.

**Spec canónica**: `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`. Patrones reusados: TASK-571/699/721/708/728/766 (mismo shape: VIEW canónica + helper + reliability + lint + CHECK + trigger).

### Finance — Reactive projections en lugar de sync inline a BQ (TASK-771)

Post-cutover PG-first, **toda proyección a BigQuery debe correr async vía consumer reactivo del outbox**, NUNCA inline en el request handler. La regla canónica es:

```text
tx PG (write + emit outbox event)  →  outbox event        →  reactive consumer (ops-worker)
        ↓ commitea atómico                ↓ pending             ↓ cron 5 min Cloud Scheduler
        respond 201/200 al cliente        ↓ published           MERGE BQ idempotente
                                                                retry+dead-letter automático
                                                                reliability signal cubre drift
```

**Por qué**: el incidente 2026-05-03 ("Error al crear proveedor" silencioso) ocurrió porque `syncProviderFromFinanceSupplier` ([src/lib/providers/canonical.ts](../src/lib/providers/canonical.ts)) ejecutaba MERGE BQ + UPDATE BQ + DDL inline en el POST/PUT supplier handler. Cualquier falla BQ devolvía 500 al cliente aunque PG ya hubiese commiteado, dejando 3 suppliers persistidos silenciosamente sin que el operador lo supiera (figma-inc, microsoft-inc, notion-inc).

**Helpers canónicos**:

- **Projection registration**: `registerProjection(...)` en `src/lib/sync/projections/index.ts`. Cada projection es un `ProjectionDefinition` ([src/lib/sync/projection-registry.ts](../src/lib/sync/projection-registry.ts)) con `triggerEvents`, `extractScope`, `refresh`, `maxRetries`. El dispatcher V2 (`src/lib/sync/reactive-consumer.ts`) hace el fetch/grouping/dead-letter/circuit-breaker automáticamente.
- **Re-leer de PG en `refresh`**: NUNCA confiar en payload del outbox event como source of truth. Usar el `entityId` del scope para re-leer la fila desde su tabla canónica (e.g. `getFinanceSupplierFromPostgres(entityId)`). Esto garantiza consistencia ante updates posteriores al evento o backfills con payloads stale.
- **Idempotencia**: el `refresh` debe ser safe re-run. MERGE por PK natural + UPDATE filtrado con `COALESCE diff` son los patrones más comunes.
- **Reliability signal**: cada projection crítica debe tener su signal `dead_letter` en `src/lib/reliability/queries/<projection>-dead-letter.ts` (clonar de `provider-bq-sync-dead-letter.ts` o `payment-orders-dead-letter.ts`). Wire-up en `get-reliability-overview.ts`. Steady=0; >0 indica que la projection está en dead-letter y un consumer downstream verá datos stale.
- **Backfill script one-shot**: `scripts/finance/backfill-<projection>.ts` (clonar de `scripts/finance/backfill-provider-bq-sync.ts`) para recovery manual. Idempotente. NO se corre LIVE desde local; el ops-worker auto-drena post-deploy.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `bigQuery.query({MERGE INTO ...})`, `UPDATE`, o `INSERT` BigQuery dentro de un route handler `route.ts`. La proyección va a una projection registrada.
- **NUNCA** llamar `ensureFinanceInfrastructure()` / `ensureAiToolingInfrastructure()` desde un route handler en hot path. Bootstrap BQ vive en startup del worker o en migration explícita BigQuery.
- **NUNCA** propagar una falla BQ como 500 cuando la primary store (PG) commiteó. Si BQ falla y la operación es síncrona inevitable, envolver en try/catch + `captureWithDomain(err, 'finance', { tags: { source: '<sync_name>', stage: '<...>' } })` y devolver el response basado en datos PG.
- **NUNCA** usar `Sentry.captureException()` directo en code paths con dominio claro. Usar `captureWithDomain(err, '<domain>', ...)` desde `src/lib/observability/capture.ts` para que reliability dashboards roleen el incidente al subsystem correcto.
- Cuando emerja una nueva proyección downstream (Snowflake mart, search index, AI tooling cache, etc.), debe nacer como `ProjectionDefinition` consumiendo el outbox event relevante. NUNCA acoplada al request path.
- El BQ-fallback path en finance routes (cuando PG está caído) sí puede mantener sync inline porque ahí el outbox no es accesible — pero envuelto en try/catch para no bloquear el response degraded.

**Spec canónica**: `docs/tasks/complete/TASK-771-finance-supplier-write-decoupling-bq-projection.md`. Patrón reusable end-to-end: para futuras projections finance, clonar la estructura de `provider_bq_sync` (projection + reliability signal + backfill script).

### Finance — Expense display contract (TASK-772)

Toda lectura de `greenhouse_finance.expenses` que vaya a UI o exports **debe** consumir el contract canónico extendido de `FinanceExpenseRecord`. Resuelve identidad del proveedor, fecha de orden y monto pendiente sin que el consumer tenga que recomputar joins ni semántica financiera.

**Campos derivados canónicos** (resueltos server-side via LEFT JOIN suppliers + LEFT JOIN LATERAL aggregate desde VIEW canónica TASK-766 `expense_payments_normalized`):

- **`supplierDisplayName`** — `COALESCE(NULLIF(TRIM(expenses.supplier_name), ''), suppliers.trade_name, suppliers.legal_name)`. Display canónico que tolera datos legacy con `supplier_name=NULL`.
- **`sortDate`** — `COALESCE(document_date, payment_date, created_at::date)`. Una obligación se identifica primero por su emisión, luego por cuándo se va a pagar, finalmente por cuándo se creó.
- **`amountPaidClp`** — `SUM(payment_amount_clp)` desde la VIEW. CLP-safe sin importar mix de monedas en payments.
- **`amountPaid`** — moneda original del documento. Best-effort:
  - `currency='CLP'` → igual a amountPaidClp (1:1)
  - `currency != 'CLP'` + payments homogéneos → `SUM(payment_amount_native)`
  - mix de monedas (caso CCA TASK-714c) → **null + `amountPaidIsHomogeneous=false`**
- **`pendingAmountClp`** = `total_amount_clp - amountPaidClp` (clamp ≥0). Siempre confiable.
- **`pendingAmount`** = `total_amount - amountPaid` (null cuando heterogéneo).

**Defense-in-depth supplier snapshot**:

- **Reader fallback** (lectura): el LEFT JOIN suppliers resuelve `supplierDisplayName` para datos legacy. Inmediato sin migration.
- **Writer snapshot** (escritura): POST `/api/finance/expenses` resuelve `supplier_name` desde la tabla suppliers cuando viene `supplierId` sin name. FinanceValidationError 400 si supplierId no existe. Garantiza que registros nuevos no nazcan con FK válida pero `supplier_name=NULL`.

**CTE en INSERT/UPDATE para outbox payload completo**:

`createFinanceExpenseInPostgres` y `updateFinanceExpenseInPostgres` envuelven el `RETURNING *` en un `WITH inserted/updated AS (...)` + LEFT JOIN suppliers + LEFT JOIN LATERAL aggregate, garantizando que el outbox event payload (`finance.expense.created/updated`) tenga el contract completo desde la misma transacción. Sin esto, los consumers del outbox recibirían `supplierDisplayName=null` y `pendingAmountClp=0` aunque la fila tuviera datos correctos en lecturas posteriores.

**⚠️ Reglas duras**:

- **NUNCA** lee `expenses.supplier_name` directo en consumers UI. Usar siempre `supplierDisplayName` del contract.
- **NUNCA** recomputa `pendingAmount = totalAmountClp - amountPaid` en consumers (mezcla CLP con currency original — root cause del bug Cash-Out 2026-05-03 que mostraba `USD 83.773,50` en lugar de `USD 92,90`). Usar `pendingAmount` (moneda original) o `pendingAmountClp` (CLP) según el contexto.
- **NUNCA** invente conversiones FX cuando `amountPaid=null` (mix de monedas heterogéneo). Caer a `amountPaidClp` con disclaimer "(equiv. CLP)" — es honesto y respeta TASK-766 contract.
- **NUNCA** agrupe documentos en UI por `supplierName || 'Sin proveedor'`. Use `supplierKey = supplierId || supplierDisplayName || supplierName || '__unassigned__'` (estable e idempotente). El label visible es `supplierDisplayName ?? supplierName ?? 'Sin proveedor'`. "Sin proveedor" solo aplica cuando NO hay supplierId Y NO hay display name.
- **NUNCA** sortear obligaciones client-side por `paymentDate` solo. Usar `sortDate` (server-side) o respetar el orden natural del backend.
- **NUNCA** crear expense con `supplierId` que no existe en la tabla. El POST handler valida y devuelve 400 con error claro.
- Cuando emerja un nuevo entity con problema análogo (ej. `income.client_name` snapshot vs `clients` tabla), replicar el patrón: extender reader con LEFT JOIN canónico + writer snapshot hydration + tests regresión.

**Spec canónica**: `docs/tasks/complete/TASK-772-finance-expense-supplier-hydration-cash-out-selection.md`. Patrón replicable a `income`, `payment_orders` y futuros agregados que mezclen identidad referenciada + amounts en moneda mixta.

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

### Organization Workspace projection invariants (TASK-611)

Toda surface que renderice el detalle de una organización (`/agency/organizations/[id]`, `/finance/clients/[id]`, futuros entrypoints organization-first) **debe** consumir el helper canónico:

```ts
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'

const projection = await resolveOrganizationWorkspaceProjection({
  subject,           // TenantEntitlementSubject completo (userId + tenantType + roleCodes + ...)
  organizationId,
  entrypointContext  // 'agency' | 'finance' | 'admin' | 'client_portal'
})
```

El helper devuelve un contrato versionado con `visibleFacets`, `visibleTabs`, `defaultFacet`, `allowedActions`, `fieldRedactions`, `degradedMode`, `degradedReason`. Composición determinística per spec V1.1 §4.4 (5 categorías canónicas de relación × 9 facets × 4 entrypoints), cache TTL 30s in-memory.

**Single source of truth runtime**: `src/config/entitlements-catalog.ts` declara las 11 capabilities `organization.<facet>.<action>`. **Reflexión declarativa DB**: `greenhouse_core.capabilities_registry` (TASK-611 Slice 2). Parity test runtime (`src/lib/capabilities-registry/parity.ts` + `parity.live.test.ts`) rompe build si emerge drift TS↔DB.

**5 relaciones canónicas** (resueltas por `relationship-resolver.ts` con un solo CTE PG, cross-tenant isolation enforced en SQL):

- `internal_admin` — efeonce_admin role
- `assigned_member` — `client_team_assignments` matched para esta org via `spaces` bridge
- `client_portal_user` — `client_users.tenant_type='client'` + `client_id` resolves to org via `spaces`
- `unrelated_internal` — internal sin admin ni assignment
- `no_relation` — base case

**Bridge canónico user ↔ organization**: `client_team_assignments.client_id` ⇄ `greenhouse_core.spaces.client_id` ⇄ `spaces.organization_id`. La tabla `clients` NO tiene `organization_id` directo — el puente es `spaces`.

**Reactive cache invalidation**: el consumer `organizationWorkspaceCacheInvalidationProjection` (`src/lib/sync/projections/organization-workspace-cache-invalidation.ts`) responde a 5 events canónicos (`access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `role.assigned`, `role.revoked`, `user.deactivated`) y droppa el cache scoped al subject afectado. Idempotente.

**Reliability signals canónicos** (subsystem `Identity & Access`):

- `identity.workspace_projection.facet_view_drift` (drift, warning si > 0). Detecta drift estructural FACET_TO_VIEW_CODE × VIEW_REGISTRY (rename de viewCode sin update del mapping). Steady=0.
- `identity.workspace_projection.unresolved_relations` (data_quality, error si > 0). Cuenta `client_users` activos con `tenant_type='client'` que no resolverán a ninguna org via spaces. Steady=0.

**⚠️ Reglas duras**:

- **NUNCA** computar visibilidad de facet en cliente. La projection es server-only (`import 'server-only'` en `projection.ts`).
- **NUNCA** mencionar literalmente capabilities `organization.<facet>` ni importar `hasEntitlement`/`can` desde `@/lib/entitlements/runtime` en componentes UI bajo `src/components/`, `src/views/`, `src/app/`. La lint rule `greenhouse/no-inline-facet-visibility-check` (modo `error`) bloquea. Override block exime los archivos canónicos en `src/lib/organization-workspace/`, `src/lib/capabilities-registry/`, `src/lib/entitlements/`.
- **NUNCA** asumir relación subject↔org en código de presentación. Toda decisión pasa por `resolveSubjectOrganizationRelation`.
- **NUNCA** mezclar `entrypointContext` con `scope` de capability. Entrypoint es presentación (default tabs, copy en es-CL); scope es autorización (own/tenant/all).
- **NUNCA** branchear UI por `relationship.kind` inline. La projection ya filtró — el shell solo lee `visibleFacets` / `allowedActions`.
- **NUNCA** materializar la projection en BQ/PG. Es read-light + cacheable. Si en futuro emerge listado >100 orgs con projection per-row, agregar `accessLevel` summary endpoint (no projection completa).
- **NUNCA** llamar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'workspace_projection_*' }, extra })`.
- **NUNCA** persistir un grant fino sin pasar por `capabilities_registry`. Cuando emerja `entitlement_grants` (cleanup ISSUE-068 / TASK-404), agregar FK al registry.
- **NUNCA** crear capability nueva en TS sin migration que la seedee en `capabilities_registry`. La parity test rompe el build.
- **SIEMPRE** marcar `degradedMode=true` con `degradedReason` enumerado (`relationship_lookup_failed | entitlements_lookup_failed | no_facets_authorized`) cuando la projection no puede resolverse — nunca crashear, nunca devolver `visibleFacets: []` silenciosamente.
- **SIEMPRE** invalidar cache vía `clearProjectionCacheForSubject(subjectId)` cuando un grant/revoke se aplica al subject (consumer del outbox event ya maneja esto para los 5 events canónicos).
- **SIEMPRE** que emerja un nuevo entrypoint organization-first, reusar el helper + shell. Cero composición ad-hoc.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (V1.1 con Delta 2026-05-08). Doc funcional: `docs/documentation/identity/sistema-identidad-roles-acceso.md` sección "Facets de Organization Workspace". ISSUE asociado: `docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md`.

### Client Portal BFF / Anti-Corruption Layer invariants (TASK-822, desde 2026-05-12)

`src/lib/client-portal/` es un **Backend-for-Frontend / Anti-Corruption Layer** del route group `client`. NO es un dominio productor. Surfaces curated re-exports de readers que viven (y son owned por) producer domains (`account-360`, `agency`, `ico-engine`, `commercial`, `finance`, `delivery`, `identity`). El módulo es **hoja del DAG** de dominios: producer domains NUNCA importan de él.

**Module classification dual** (mutuamente excluyente, spec §3.1):

- `readers/curated/` — re-export puro de un reader que vive en un producer domain. `ownerDomain` non-null. La firma sigue exacta al upstream; si el upstream cambia, el re-export refleja el cambio automáticamente.
- `readers/native/` — nacido en `client_portal` porque no hay producer domain que lo posea. `ownerDomain: null`. V1.0 ships ZERO native readers; primer candidato emerge con TASK-825 (resolver de `modules`).

**Metadata canónica obligatoria** (`src/lib/client-portal/dto/reader-meta.ts`):

```ts
export interface ClientPortalReaderMeta {
  readonly key: string                                          // matchea el filename
  readonly classification: 'curated' | 'native'
  readonly ownerDomain: ClientPortalReaderOwnerDomain | null   // null SOLO en native
  readonly dataSources: readonly ClientPortalDataSource[]      // non-empty
  readonly clientFacing: boolean
  readonly routeGroup: 'client' | 'agency' | 'admin'
}
```

Cada archivo bajo `readers/{curated,native}/` exporta un `*Meta: ClientPortalReaderMeta`. `assertReaderMeta()` enforce invariantes en runtime (usado en tests anti-regresión).

**Sentry domain canónico** `client_portal` agregado al `CaptureDomain` union de `captureWithDomain` (TASK-822 Slice 2). Reliability rollup completo emerge con TASK-829 (subsystem `Client Portal Health`).

**Domain import direction enforced** (spec §3.2, hoja del DAG):

- Permitido: `src/lib/client-portal/**` → `src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity}/**`
- Permitido: `src/{app,views,components}/**` → `src/lib/client-portal/**`
- **Prohibido**: `src/lib/{producer-domain}/**` → `src/lib/client-portal/**`

**Defense in depth** (3 capas):

1. ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` modo `error` (TASK-822 Slice 3). Cubre 4 shapes: static ESM, dynamic `import()`, `require()`, relative `../client-portal/`. Override block en `eslint.config.mjs` exime `src/lib/client-portal/**` + el rule + sus tests fixtures.
2. Grep negativo en code review: `rg "from '@/lib/client-portal" src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/` debe estar vacío.
3. Doctrina canonizada acá (CLAUDE.md) — cuando emerja un patrón análogo (`partner_portal`, `vendor_portal`, `internal_admin_portal`) replicar verbatim.

**⚠️ Reglas duras**:

- **NUNCA** mover físicamente un reader de su producer domain a `src/lib/client-portal/readers/curated/`. La curated layer es un puntero, NO una mudanza. El reader sigue owned por el producer domain.
- **NUNCA** clasificar como `curated` un reader que aplica thin adaptation (e.g. agrega un parámetro `clientPortalContext`). Si adapta, es `native` con `ownerDomain` documentando la fuente original — pero antes de crear native, evaluar si la adaptation pertenece al producer domain (extender API upstream suele ser correcto).
- **NUNCA** importar `@/lib/client-portal/*` desde un producer domain. La rule lo bloquea; si emerge la tentación, el caller está en la capa equivocada (debería estar bajo `src/app/`, `src/views/`, `src/components/`) o el reader que se quiere reusar está en el lugar equivocado (sacarlo del client_portal al producer correspondiente).
- **NUNCA** mezclar dimensiones: `classification` (curated/native) y `ownerDomain` son ortogonales. Curated siempre tiene `ownerDomain` non-null; native siempre tiene `ownerDomain: null`. El runtime invariant en `assertReaderMeta()` rompe el test si emerge drift.
- **NUNCA** crear un reader curated sin `dataSources[]` non-empty. La whitelist `ClientPortalDataSource` enumera los producer surfaces; si emerge una nueva, agregarla al type union + coordinar con TASK-824 para mantener parity con `greenhouse_client_portal.modules.data_sources[]` en DB.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de `src/lib/client-portal/`. Usar `captureWithDomain(err, 'client_portal', { extra })`.
- **NUNCA** crear carpeta `commands/` ni helpers nuevos en `client_portal` sin consumer real demostrado. La regla "Don't add abstractions beyond what the task requires" aplica fuerte acá — placeholder files = drift.
- **NUNCA** desactivar la ESLint rule via `// eslint-disable-next-line`. Si emerge un caso legítimo, agregarlo al override block en `eslint.config.mjs` con comentario justificando.
- **SIEMPRE** que un dominio adicional con shape BFF emerja (partner portal, vendor portal, etc.), replicar el patrón: hoja del DAG + lint rule canónica + classification curated/native + metadata tipada. NO inventar primitiva nueva.

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.1 §3.1 + §3.2 + §10 patrón aplicable. Module README: `src/lib/client-portal/README.md`. Doctrine source pattern: TASK-611 (organization workspace projection — domain boundary lint rule canonical sibling).

### Organization-by-facets — receta canónica para extender (TASK-613)

Patrón canónico cuando emerja la necesidad de un **facet nuevo** (e.g. `marketing`, `legal`, `compliance`) o un **entrypoint nuevo** que renderee el Organization Workspace shell desde su propia ruta (e.g. `/legal/organizations/[id]`, `/marketing/accounts/[id]`):

#### Para agregar un facet nuevo (5 pasos canónicos)

1. **Catálogo**: extender `OrganizationFacet` enum en `src/lib/organization-workspace/facet-capability-mapping.ts` + agregar `viewCode` underlying en `src/lib/organization-workspace/facet-view-mapping.ts`.
2. **Capabilities**: seedear `organization.<facet>:read` (+ `:read_sensitive` si aplica) en `capabilities_registry` con migration. Documentar matriz `relationship × capability → access` en spec V1.
3. **Facet content** (`src/views/greenhouse/organizations/facets/<Name>Facet.tsx`): self-contained, queries propias, drawers propios. NUNCA renderiza chrome (header, KPIs, tabs) — el shell ya lo hace. Si necesita divergir per-entrypoint, inspeccionar `entrypointContext` adentro del facet (NO crear facets paralelos).
4. **Registry**: agregar entry al `FACET_REGISTRY` en `src/components/greenhouse/organization-workspace/FacetContentRouter.tsx` con `dynamic()` lazy load.
5. **Reliability signal** (recomendado para facets críticos): reader en `src/lib/reliability/queries/<facet>-*.ts` siguiendo el patrón TASK-613 `finance-client-profile-unlinked.ts` (5 tests: ok / warning / SQL anti-regresión / degraded / pluralización).

#### Para agregar un entrypoint nuevo (5 pasos canónicos)

1. **Type union**: extender `EntrypointContext` en `src/lib/organization-workspace/projection-types.ts`.
2. **Rollout flag**: migration que extienda CHECK constraint `home_rollout_flags_key_check` con `organization_workspace_shell_<scope>` + INSERT global `enabled=FALSE` por default. Extender también `WorkspaceShellScope` en `src/lib/workspace-rollout/index.ts` y `HomeRolloutFlagKey` en `src/lib/home/rollout-flags.ts` — drift entre los 3 = falsos positivos en runtime.
3. **Server page** (`src/app/(dashboard)/<scope>/.../[id]/page.tsx`): mirror exacto de `agency/organizations/[id]/page.tsx` o `finance/clients/[id]/page.tsx`:
   - `requireServerSession` (prerender-safe)
   - `isWorkspaceShellEnabledForSubject(subject, '<scope>')` con `try/catch → false` (resilient default a legacy)
   - Resolver canónico del módulo (Postgres-first + fallback) → devuelve `organizationId` o `null`
   - Si flag disabled OR sin organizationId → render legacy view (zero-risk fallback)
   - `resolveOrganizationWorkspaceProjection({ subject, organizationId, entrypointContext: '<scope>' })`
   - Errores en cualquier step → `captureWithDomain(err, '<domain>', ...)` y degradar a legacy.
4. **Client wrapper** (`<ScopeOrganizationWorkspaceClient>`): mirror del Agency/Finance wrapper. Mismos slots: `kpis`, `adminActions`, `drawerSlot`, `children` render-prop. Mismo deep-link `?facet=` con URL sync via `useSearchParams + router.replace`.
5. **Per-entrypoint dispatch** (si aplica): si un facet existente debe cambiar contenido para el nuevo entrypoint, agregar branch dentro del facet inspeccionando `entrypointContext` (patrón canónico `FinanceFacet` desde TASK-613).

#### ⚠️ Reglas duras canónicas (organization-by-facets)

- **NUNCA** crear una vista de detalle organization-centric que NO use el Organization Workspace shell. Toda nueva surface (clientes, prospects, partners, vendors, etc.) pasa por el shell.
- **NUNCA** componer la projection en el cliente. Server-side por construcción — el shell consume la projection prebuilt y la pasa down.
- **NUNCA** branchear `entrypointContext` afuera del facet. Si Finance vs Agency necesitan contenido distinto en la tab Finance, la decisión vive **adentro** del FinanceFacet, no en el page o el router.
- **NUNCA** modificar `OrganizationView` legacy (`src/views/greenhouse/organizations/OrganizationView.tsx`) sin migrar paralelamente al shell. Mantener legacy intacto durante el rollout.
- **NUNCA** seedear capabilities `organization.<facet>:*` sin agregar entry al spec table en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Apéndice A. La matriz `relationship × capability → access` es contractual.
- **NUNCA** crear una flag `organization_workspace_shell_*` sin extender los 3 lugares (CHECK constraint + `WorkspaceShellScope` + `HomeRolloutFlagKey`). Drift entre los 3 = falsos positivos en runtime.
- **NUNCA** mezclar dimensiones (e.g. "qué facet" + "qué entrypoint") en un solo enum. Son ortogonales: `OrganizationFacet × EntrypointContext`.
- **NUNCA** computar la decisión `legacy fallback vs shell` en runtime sin envolver en `try/catch + captureWithDomain(...)`. Resilient defaults: en duda, legacy.
- **NUNCA** modificar la flag `organization_workspace_shell_*` directamente vía SQL. Toda mutación pasa por el admin endpoint `POST /api/admin/home/rollout-flags` (TASK-780).
- **SIEMPRE** declarar `incidentDomainTag` en el module registry cuando un facet tiene dataset propio que puede generar incidents Sentry.
- **SIEMPRE** que un nuevo facet emerja con dataset que pueda quedar unlinked al canonical 360, agregar reliability signal análogo a `finance.client_profile.unlinked_organizations` (TASK-613).
- **SIEMPRE** seguir el rollout staged: V1 OFF default → V1.1 pilot users → V2 flip global con steady-state ≥30 días → V3 cleanup legacy ≥90 días sin reverts.

#### Patrón canónico per-entrypoint dispatch en facet (TASK-613 reference)

```tsx
// src/views/greenhouse/organizations/facets/FinanceFacet.tsx
const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}
```

El facet sigue siendo self-contained: queries propias, drawers propios. NO renderiza chrome — el shell ya lo hace. Es el patrón de referencia cuando un facet necesite divergir per-entrypoint sin fragmentar el FACET_REGISTRY.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 (receta detallada). Tasks de referencia: TASK-611 (foundation), TASK-612 (shell + Agency entrypoint), TASK-613 (Finance entrypoint + dual-dispatch pattern).

### Payroll — Receipt presentation contract (TASK-758, v4 desde 2026-05-04)

Toda surface que renderice recibos individuales de Payroll **debe** consumir el helper canónico `buildReceiptPresentation` desde `src/lib/payroll/receipt-presenter.ts`. Single source of truth para la clasificación de régimen + struct declarativo de presentación + tokens visuales (badges régimen). Cierra el bug raíz `isChile = entry.payRegime === 'chile'` que afectaba a 3 de los 4 regímenes.

**API canónica**:

- `resolveReceiptRegime(entry) → 'chile_dependent' | 'honorarios' | 'international_deel' | 'international_internal'` — detector con cascade `contractTypeSnapshot` → `payrollVia === 'deel'` → `siiRetentionAmount > 0` → `payRegime === 'international'` → default `chile_dependent`.
- `buildReceiptPresentation(entry, breakdown?) → ReceiptPresentation` — struct declarativo con `employeeFields[4]`, `haberesRows`, `attendanceRows`, `deductionSection`, `adjustmentsBanner`, `infoBlock`, `manualOverrideBlock`, `fixedDeductionsSection`, `hero`. Surfaces consumen verbatim — cero lógica de régimen en componentes.
- `groupEntriesByRegime(entries) → Record<Regime, T[]>` — exportado para reuso TASK-782 (PeriodReportDocument + Excel).
- `RECEIPT_REGIME_BADGES` + `RECEIPT_REGIME_DISPLAY_ORDER` — tokens compartidos cross-task (preview MUI, PDF, period report, Excel).

**Comportamiento canónico**:

| Régimen | Bloque deducción | InfoBlock | Hero |
| --- | --- | --- | --- |
| `chile_dependent` | `Descuentos legales` (AFP split + salud obl/vol + cesantía + IUSC + APV + gratificación legal) | — | `Líquido a pagar` |
| `honorarios` | `Retención honorarios` (Tasa SII + Retención) | `Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>` | `Líquido a pagar` |
| `international_deel` | (ninguno) | `Pago administrado por Deel` + `Contrato Deel: <id>` opcional | `Monto bruto registrado` + footnote |
| `international_internal` | (ninguno) | `Régimen internacional` | `Líquido a pagar` |
| **`excluded`** (terminal) | (omitido) | `Excluido de esta nómina — <reason>` (variant `error`) | `Sin pago este período · $0` (degraded) |

**⚠️ Reglas duras**:

- **NUNCA** ramificar render por `entry.payRegime === 'chile'` solo. Toda detección pasa por `resolveReceiptRegime`.
- **NUNCA** `font-family: monospace` en surfaces user-facing del recibo. IDs técnicos (deelContractId): `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
- **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
- **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
- **NUNCA** color como única señal de estado. InfoBlock siempre lleva título + body explicativo.
- **NUNCA** lime `#6ec207` para texto sobre blanco (falla 4.5:1). Variante contrast-safe `#2E7D32` cuando emerja necesidad.
- Cualquier nuevo `ContractType` agregado en `src/types/hr-contracts.ts` requiere extender el switch de `buildReceiptPresentation` antes de mergear (compile-time `never`-check defiende esto).
- Cualquier cambio visual del PDF requiere bump `RECEIPT_TEMPLATE_VERSION` en `generate-payroll-pdf.tsx`. Lazy regen automático al próximo acceso.
- Mockup canónico vinculante: `docs/mockups/task-758-receipt-render-4-regimes.html`. Cualquier desviación visual requiere update + re-aprobación del mockup ANTES de mergear.

**Cuándo usar `getEntryAdjustmentBreakdown` + `buildReceiptPresentation`**: siempre que se renderice un recibo individual del colaborador (preview MUI, PDF, futuras superficies). El breakdown es opcional pero canónicamente recomendado para reflejar adjustments (factor reducido, manual override, exclusión).

**Spec**: `src/lib/payroll/receipt-presenter.ts` + `src/lib/payroll/receipt-presenter.test.ts` (46 tests). Doc funcional: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.b.

### Payroll — Period report + Excel disaggregation (TASK-782, desde 2026-05-04)

`PeriodReportDocument` (PDF reporte mensual) y `generate-payroll-excel.ts` (export operador-facing) **deben** consumir `groupEntriesByRegime` exportado por TASK-758. Single source of truth de clasificación de régimen across receipts (recibo individual) y reporte/export operador-facing.

**⚠️ Reglas duras**:

- **NUNCA** sumar `chileTotalDeductions` cross-régimen como subtotal único. El motor asigna `chileTotalDeductions = siiRetentionAmount` para honorarios — sumar todo bajo "Total descuentos Chile" mezcla retención SII con cotizaciones previsionales reales y rompe reconciliación contra Previred + F29.
- **Subtotales mutuamente excluyentes** son obligatorios:
  - `Total descuentos previsionales` (solo `chile_dependent`) → reconcilia con Previred.
  - `Total retención SII honorarios` (solo `honorarios`) → reconcilia con F29 retenciones honorarios.
- **Régimen column con 4 valores** (`CL-DEP`/`HON`/`DEEL`/`INT`) reusando tokens `RECEIPT_REGIME_BADGES` exportados desde `receipt-presenter.ts`. NUNCA `CL`/`INT` solo.
- **Orden canónico** vía `RECEIPT_REGIME_DISPLAY_ORDER`: chile_dependent → honorarios → international_deel → international_internal. Stable, no depende de orden alfabético.
- **Grupos vacíos se omiten completos** (divider + filas + subtotal). Excel: omitir la sheet entera si ambas secciones internas están vacías.
- **Celdas N/A llenan con `—`** (clase `dim` text-faint), NUNCA `$0`. Distinción semántica: `$0` = aplica pero monto cero; `—` = no aplica al régimen.
- **Estado `excluded`** (entries con `grossTotal === 0 && netTotal === 0`) se renderiza visible en el PDF con chip `(excluido)` inline + Base/OTD/RpA dim `—`. No se omite.
- Cualquier nueva surface operador-facing que muestre agregaciones mensuales por régimen DEBE consumir `groupEntriesByRegime` + tokens canónicos en lugar de duplicar el filter.

**Layout canónico**:

- PDF: 10 columnas `Nombre / Régimen / Mon. / Base / OTD / RpA / Bruto / Desc. previs. / Retención SII / Neto`. Summary strip ampliado a 8 KPIs con counters per-régimen. Meta row `UF / Aprobado / Tabla tributaria`.
- Excel: sheets canónicas `Resumen` (subtotales separados) + `Chile` (2 secciones internas) + `Internacional` (2 secciones internas) + `Detalle` (audit raw, preservado) + `Asistencia & Bonos` (preservado).

**Spec canónica**: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.c. Mockup vinculante: `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html`. Tests: `src/lib/payroll/generate-payroll-pdf.test.ts` + `generate-payroll-excel.test.ts` (12 tests anti-regression).

### Legal Signatures Platform invariants (TASK-863 V1.4, desde 2026-05-11)

Toda surface que renderice un documento legal firmado por el **representante legal del empleador** (finiquitos hoy; contratos, addenda, cartas formales mañana) **debe** consumir el helper canónico `@/lib/legal-signatures` para resolver la firma digitalizada. NUNCA reimplementar el resolver inline en otro flow.

**Convención de filename**: `src/assets/signatures/{taxId_normalizado}.png`. `taxId_normalizado` = `taxId` con puntos + espacios removidos (guion preservado). Efeonce SpA RUT 77.357.182-1 → `77357182-1.png`.

**API canónica** (`src/lib/legal-signatures/index.ts`):

```typescript
import {
  buildSignatureFilenameForTaxId,
  resolveLegalRepresentativeSignaturePath,
  getLegalRepresentativeSignatureAbsolutePath,
  LEGAL_SIGNATURE_BASE_DIR
} from '@/lib/legal-signatures'
```

**Path-safe protection** (4 checks defensivos):

1. Empty/null → `null` (graceful fallback)
2. `..` (path traversal) → `null`
3. Path absoluto (`/`) → `null`
4. Extensión NO en `{png, jpg, jpeg}` → `null`
5. `existsSync` falla → `null`

Si cualquier check falla, el consumer renderea la **línea de firma vacía** para firma manual presencial.

**⚠️ Reglas duras**:

- **NUNCA** reimplementar el resolver inline. Consumir `@/lib/legal-signatures`.
- **NUNCA** componer paths absolutos hardcoded. Siempre via `buildSignatureFilenameForTaxId(taxId)` + `resolveLegalRepresentativeSignaturePath`.
- **NUNCA** confiar en path strings provenientes de usuario sin pasarlos por el resolver.
- **NUNCA** usar este helper para firmas de personas naturales (trabajadores). Las firmas de trabajadores son SIEMPRE físicas presenciales (art. 177 CT).
- **SIEMPRE** dejar graceful fallback en el render si el path resuelve a `null`.
- **SIEMPRE** preservar PNG transparente con aspect ratio ~2.2-2.4:1 (recomendado 1718×734).

**Forward-compat V2**: migrar storage a asset privado canónico (`greenhouse_core.assets` con `retention_class='legal_signature'` + FK desde `organizations.legal_representative_signature_asset_id`). Misma signature pública del helper → backwards-compatible.

**Spec canónica**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md`. Tests: `src/lib/legal-signatures/index.test.ts` (11 tests anti-regresión).

### Finiquito V1.5 — Cláusulas legales state-conditional + auto-regeneración PDF (TASK-863, desde 2026-05-11)

Comprehensive audit enterprise por skills `greenhouse-payroll-auditor` + UX writing es-CL formal-legal + `modern-ui` cerró 5 bloqueantes legales/UI del PDF de finiquito de renuncia voluntaria post primer caso real (Valentina Hoyos):

**B-1 Cláusula PRIMERO separa hitos legales distintos** — `FiniquitoClauseParams` expone `resignationNoticeSignedAt` (firma trabajador, obligatorio) + `resignationNoticeRatifiedAt` (ratificación notarial art. 177 CT, null hasta ratificación). Copy state-conditional pre/post ratificación. Antes mezclarlas era vicio defendible en demanda chilena.

**B-2 Cláusula SEGUNDO verbo performativo state-conditional** — `FiniquitoClauseSegundoParams` expone `isRatified: boolean`. Pre-ratificación → "declara que recibirá, al momento de la ratificación..." (futuro). Post-ratificación → "declara haber recibido en este acto..." (perfecto consumado). Antes "declara recibir en este acto" sobre doc no ratificado era vicio de consentimiento.

**B-3 Cláusula CUARTO cita artículo operativo Ley 14.908** — Texto canónico: "artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021". Antes citaba solo la modificatoria sin operativo → jurídicamente débil.

**B-4 Simetría visual 3 columnas firma** — `signatureColumn` con `paddingTop: 36` reserva espacio simétrico arriba de la línea en las 3 columnas (empleador + trabajador + ministro de fe). `signatureImageEmployer` absoluta en `top: 0`. Las 3 líneas caen al mismo Y absoluto → balance enterprise.

**B-5 Title legal DOMINA visualmente vs KPI monto** — Title 20pt Poppins Bold + KPI 14pt Poppins SemiBold (ratio 1.43x). Antes 18pt vs 16pt era marketing pattern, no legal pattern. Notarios/abogados leen primero el ACTO, después el monto.

**Auto-regeneración canónica del PDF al transicionar** (TASK-863 V1.1): el helper privado `regenerateDocumentPdfForStatus` reemplaza `pdf_asset_id` del MISMO documento cuando transita a `issued` o `signed_or_ratified` (sin bump versión, sin reissue). Wire en `issueFinalSettlementDocumentForCase` + `markFinalSettlementDocumentSignedOrRatifiedForCase`. Idempotente: si falla render, transition ya commiteo y operador puede usar reissue.

**Matriz canónica de watermark per `documentStatus`**:

| documentStatus | Watermark |
|---|---|
| rendered / in_review / approved | "PROYECTO" warning |
| **issued / signed_or_ratified** | **CLEAN** |
| blocked | "BLOQUEADO" error |
| rejected | "RECHAZADO" error |
| voided | "ANULADO" error |
| superseded | "REEMPLAZADO" neutral |

`renderFinalSettlementDocumentPdf(snapshot, options?: { documentStatus?: string | null })` acepta documentStatus explícito. Backward-compat: callsites sin documentStatus caen al patrón inferido por `ratification + readiness`.

**⚠️ Reglas duras**:

- **NUNCA** mezclar fecha de firma del trabajador con fecha de ratificación notarial en la cláusula PRIMERO. Son 2 hitos legales distintos.
- **NUNCA** renderizar el verbo "declara recibir en este acto" cuando `documentStatus != 'signed_or_ratified'`. Usa `isRatified` para state-condicional.
- **NUNCA** citar Ley 21.389 sin el artículo operativo Ley 14.908. Citar solo la modificatoria es jurídicamente débil.
- **NUNCA** renderear la firma del empleador rompiendo simetría con las otras 2 columnas (trabajador + ministro). `paddingTop: 36` en `signatureColumn` reserva espacio simétrico.
- **NUNCA** componer KPI monto con peso visual superior al title del acto jurídico. El acto legal domina.
- **NUNCA** dejar el `pdf_asset_id` apuntando a un asset con watermark cuando `documentStatus IN ('issued', 'signed_or_ratified')`. El auto-regen lo refresca; si falla, reissue recovery.

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta 2026-05-11 V1.1 + V1.4 + V1.5). Doc funcional + manual de uso: `docs/documentation/hr/finiquitos.md` + `docs/manual-de-uso/hr/finiquitos.md` (v1.3).

### Person Legal Profile invariants (TASK-784, desde 2026-05-05)

Toda surface que muestre o consuma identidad legal de una persona natural (RUT, documento de identidad, direccion legal/residencia) **debe** pasar por el modulo canonico `src/lib/person-legal-profile/`. Reemplaza el patron legacy donde `final_settlement_documents` hardcodea `taxId: null` y BigQuery `member_profiles.identity_document_*` era la unica fuente.

**Frontera canonica**:

- `organizations.tax_id` → identidad tributaria de organizaciones / personas juridicas / clientes / proveedores empresa / facturacion. NO se reemplaza por TASK-784.
- `greenhouse_core.person_identity_documents` → identidad legal de personas naturales. Anclado a `identity_profiles.profile_id`. Soporta CL_RUT + 23 tipos internacionales extensible.
- `greenhouse_core.person_addresses` → direcciones legal/residencia/correspondencia/emergencia.

**Read API canonico**:

- Default reader: `listIdentityDocumentsForProfileMasked(profileId)` / `listAddressesForProfileMasked(profileId)` → masked, NUNCA expone `value_full` ni `presentation_text`.
- Snapshot autorizado para document generators: `readFinalSettlementSnapshot(profileId)` / `readPersonLegalSnapshot({useCase})` → server-only, escribe audit `export_snapshot`, devuelve `valueFull` solo cuando `verification_status='verified'`.
- Reveal con capability + reason + audit: `revealPersonIdentityDocument({reason >= 5, ...})`. Caller DEBE haber validado `person.legal_profile.reveal_sensitive` ANTES; el helper escribe audit + outbox y devuelve `valueFull`.
- Readiness gates: `assessPersonLegalReadiness({profileId, useCase})` → `{ready, blockers[], warnings[]}` para 5 casos: `payroll_chile_dependent`, `final_settlement_chile`, `honorarios_closure`, `document_render_payroll_receipt`, `document_render_onboarding_contract`.

**Encryption strategy** (TASK-697 pattern, NO KMS envelope V1):

- Plaintext at rest en `value_full` con grants estrictos `greenhouse_runtime` (sin DELETE).
- `value_hash` = SHA-256(pepper || normalized) via secret `greenhouse-pii-normalization-pepper` (GCP Secret Manager). Sin pepper, hash de RUT 8-9 digitos es trivialmente reversible.
- `display_mask` precomputado al INSERT/UPDATE (`xx.xxx.NNN-K` para CL_RUT, last-4 generic).
- Sanitizers extendidos en `src/lib/observability/redact.ts` para `[redacted:rut]` + `[redacted:long-id]`.
- AI sanitizer (`sanitizePiiText`) ya cubre CL_RUT.
- Cloud SQL ya cifra at-rest a nivel disco. KMS envelope queda como follow-up si compliance Ley 21.719 lo escala.

**Capabilities granulares (6, least privilege)**:

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `person.legal_profile.read_masked` | people | read | own/tenant | route_group=my (own) o route_group=hr / EFEONCE_ADMIN (tenant) |
| `person.legal_profile.self_update` | my_workspace | create/update | own | route_group=my |
| `person.legal_profile.hr_update` | hr | create/update | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.verify` | hr | approve | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.reveal_sensitive` | hr | read | tenant | EFEONCE_ADMIN / FINANCE_ADMIN solo |
| `person.legal_profile.export_snapshot` | hr | export | tenant | route_group=hr (server-only para document generators) |

**Outbox events versionados v1 (12 nuevos)**:

- `person.identity_document.{declared, updated, verified, rejected, archived, revealed_sensitive}`
- `person.address.{declared, updated, verified, rejected, archived, revealed_sensitive}`

**Reliability signals (4) bajo modulo `identity`**:

- `identity.legal_profile.pending_review_overdue` — drift, warning si > 0
- `identity.legal_profile.payroll_chile_blocking_finiquito` — data_quality, error si > 0
- `identity.legal_profile.reveal_anomaly_rate` — drift, warning/error segun threshold (3 reveals/24h por actor)
- `identity.legal_profile.evidence_orphan` — data_quality, error si > 0

**⚠️ Reglas duras**:

- **NUNCA** leer `value_full` directo en consumers. Use readers canonicos (`*Masked`, `readPersonLegalSnapshot`, `revealPersonIdentityDocument`).
- **NUNCA** loggear `value_full` / `value_normalized` / `street_line_1` / `presentation_text` en errors / Sentry / outbox payloads / AI context. Los `diff_json` describen QUE campos cambiaron, no su valor pleno.
- **NUNCA** llamar `revealPersonIdentityDocument` ni `revealPersonAddress` sin validar capability + reason >= 5 chars en el route handler. El helper enforce internamente, pero defense in depth.
- **NUNCA** persistir `value_full` sin pasar por `normalizeDocument` + `computeValueHash` + `formatDisplayMask`. Los 3 helpers garantizan idempotencia + dedup + masking precomputado.
- **NUNCA** confiar automaticamente datos backfilled (`source='legacy_bigquery_member_profile'`). Quedan en `verification_status='pending_review'` y NO se cuentan como verified hasta que HR los apruebe via `verifyIdentityDocument`.
- **NUNCA** cambiar `organizations.tax_id` para guardar RUT personal. La columna es identidad tributaria de organizaciones / facturacion. Si emerge una persona natural facturable como organizacion, modelar como organizacion separada con `organization_type='natural_person'`.
- **NUNCA** branchear UI por pais hardcodeado. Use copy pais-aware: "RUT" cuando `documentType='CL_RUT'`, "Documento de identidad" como fallback.
- **NUNCA** exponer error.message raw en HTTP responses. Use `redactErrorForResponse(error)` + `captureWithDomain(error, 'identity', { extra })` desde `src/lib/observability/{redact,capture}.ts`.

**Spec canonica**: `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md`. Migracion: `migrations/20260505015628132_task-784-person-identity-documents-and-addresses.sql`. Pattern fuente: TASK-697 (`src/lib/finance/beneficiary-payment-profiles/reveal-sensitive.ts`).

### Workforce role title source-of-truth + Entra drift governance (TASK-785, desde 2026-05-05)

`members.role_title` es la **fuente de verdad laboral** del cargo en Greenhouse (contrato, finiquito, payroll, KPIs comerciales). `identity_profiles.job_title` es enriquecimiento operativo (Entra/Graph/SCIM) que sirve como dato bruto pero NUNCA sobreescribe el cargo formal HR.

**Invariantes duras**:

- **NUNCA** modificar `members.role_title` directamente vía SQL o helpers ad-hoc en consumers. Toda mutación pasa por `updateMemberRoleTitle()` (`src/lib/workforce/role-title/store.ts`) — atomic tx con audit + outbox event + resolución de drift pendiente.
- **NUNCA** dejar que el sync Entra sobrescriba `role_title` cuando `role_title_source='hr_manual' AND last_human_update_at IS NOT NULL`. El helper canónico `applyEntraRoleTitle()` (`sync-from-entra.ts`) enforce esta regla y registra drift_proposal cuando los valores divergen.
- **NUNCA** computar fallback de cargo per-context inline en consumers (e.g. `members.role_title || identity_profiles.job_title`). Usar el resolver canónico `resolveRoleTitle({ memberId, context })` con uno de los 6 contextos: `internal_profile`, `client_assignment`, `payroll_document`, `commercial_cost`, `staffing`, `identity_admin`.
- **NUNCA** modificar `member_role_title_audit_log` (append-only enforced por triggers PG `prevent_update_on_audit_log` y `prevent_delete_on_audit_log`). Para correcciones, insertar nueva fila con `action='reverted'`.
- **NUNCA** transicionar drift proposals fuera del state machine `pending → approved | rejected | dismissed`. Toda resolución pasa por `resolveRoleTitleDriftProposal()` (`drift-store.ts`) — atomic tx con audit + outbox event.
- **NUNCA** escribir capability checks de role-title manualmente. Usar `can(tenant, 'workforce.role_title.update', 'update', 'tenant')` o `can(tenant, 'workforce.role_title.review_drift', 'read|approve', 'tenant')`.

**Helpers canónicos** (`src/lib/workforce/role-title/`):

- `updateMemberRoleTitle({ memberId, newRoleTitle, reason, actorUserId, ... })` — single source of truth para HR mutation. Reason >=10 chars obligatorio, audit log + resolución de drift pendiente como rejected en misma tx.
- `applyEntraRoleTitle({ memberId, entraJobTitle, ... })` — sync path Entra→members. Skipea overwrite cuando hay HR override; registra drift proposal cuando diverge. Returns `{ applied, skipped, driftProposed }` non-blocking.
- `resolveRoleTitle({ memberId, context, assignmentId? })` — resolver canónico per-contexto. Devuelve `{ value, source, sourceLabel, hasDriftWithEntra, assignmentOverride? }`.
- `resolveRoleTitleDriftProposal({ proposalId, decision, resolutionNote, actorUserId, ... })` — HR review queue resolver. Decision `accept_entra` aplica valor Entra al member (source='entra', clear last_human_update_at). `keep_hr` mantiene HR override sin cambio. `dismissed` cierra sin cambio.
- `getRoleTitleGovernanceForMember(memberId)` — reader para UI HR. Single query: cargo actual + source + Entra job_title + drift status + pending proposal.

**API canónica**:

- `PATCH /api/admin/team/members/[memberId]/role-title` (capability `workforce.role_title.update:update`, FINANCE_ADMIN/HR/EFEONCE_ADMIN).
- `GET /api/hr/workforce/role-title-drift` (capability `workforce.role_title.review_drift:read`).
- `POST /api/hr/workforce/role-title-drift/[proposalId]/resolve` (capability `workforce.role_title.review_drift:approve`).
- `GET /api/hr/workforce/members/[memberId]/role-title` (capability `workforce.role_title.update | review_drift`).

**Outbox events**: `member.role_title.changed`, `member.role_title.drift_proposed`, `member.role_title.drift_resolved`.

**Reliability signals** (subsystem `Identity & Access`):

- `workforce.role_title.drift_with_entra` (drift, warning) — informativo: miembros con HR != Entra. Steady state variable.
- `workforce.role_title.unresolved_drift_overdue` (drift, error) — drift proposals pendientes >30 días. Steady state = 0.

**Spec canonica**: `docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md`. Migración: `migrations/20260505123242929_task-785-role-title-governance.sql`. Pattern fuente: `reporting_hierarchy_drift_proposals` (TASK-731).

### SCIM Internal Collaborator Provisioning invariants (TASK-872, desde 2026-05-13)

SCIM POST `/api/scim/v2/Users` con `tenant_type='efeonce_internal'` Y eligibility verdict `eligible=true` invoca primitive atomic `provisionInternalCollaboratorFromScim` que materializa `client_user + identity_profile + identity_profile_source_links × 2 + member + person_membership` + role assignment + 3 outbox events en una sola tx PG.

**Helpers canónicos**:

- `evaluateInternalCollaboratorEligibility(input)` en `src/lib/scim/eligibility.ts` — función pura 4-layer policy (L1 hard reject `#EXT#`/domain, L2 funcional regex, L3 name shape, L4 admin allowlist/blocklist override). Discriminated union return `EligibilityVerdict`.
- `provisionInternalCollaboratorFromScim(input)` en `src/lib/scim/provisioning-internal-collaborator.ts` — primitive atomic. Idempotency gate first-step + cascade D-2 (4 niveles: profile_id → azure_oid → email legacy → INSERT new) + drift detection 3 kinds + outbox consolidado `scim.internal_collaborator.provisioned v1`.
- `createScimEligibilityOverride / supersedeScimEligibilityOverride / listActiveOverridesForTenantMapping` en `src/lib/scim/eligibility-overrides-store.ts` — CRUD canónica con audit append-only via PG trigger.

**Feature flags (default false en producción — zero behavioral change post-merge)**:

| Flag | Default | Efecto cuando true |
| --- | --- | --- |
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | `false` | SCIM CREATE internal eligible invoca primitive; ineligibles van a legacy `createUser` |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | `false` | Payroll reader `pgGetApplicableCompensationVersionsForPeriod` filtra `m.workforce_intake_status = 'completed'` |
| `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED` | `false` (V1.0) | Reservado V1.1 — control de L2 regex |

**6 reliability signals canónicos (subsystem Identity & Access)**:

- `identity.scim.users_without_identity_profile` (data_quality, error >0, steady=0)
- `identity.scim.users_without_member` (drift, error >0, steady=0 post-backfill)
- `identity.scim.ineligible_accounts_in_scope` (drift, warning 1-5 / error >5, steady<5)
- `identity.scim.member_identity_drift` (data_quality, error >0, steady=0)
- `workforce.scim_members_pending_profile_completion` (drift, warning >7d / error >30d, steady=0)
- `identity.scim.allowlist_blocklist_conflict` (data_quality, error >0, steady=0)

**⚠️ Reglas duras**:

- **NUNCA** ejecutar los 6 writes del primitive fuera de `withTransaction`. Si se necesita refactor de un helper downstream, agregar `client?: PoolClient` opcional (dual-mode pattern TASK-765/TASK-872). Helpers refactored: `syncOperatingEntityMembershipForMember`, `createMembership`, `deactivateMembership`.
- **NUNCA** decidir merge automático en drift D-2. Throw `MemberIdentityDriftError` con `kind` discriminator (`profile_oid_mismatch | oid_profile_mismatch | email_profile_mismatch`) + signal alerta + humano resuelve via runbook escenario 3.
- **NUNCA** poblar `members` SCIM-provisioned sin `workforce_intake_status='pending_intake'` + `azure_oid` poblado. Backfill bypasa con default `'completed'` SOLO para legacy members existentes pre-TASK-872.
- **NUNCA** incluir members con `workforce_intake_status != 'completed'` en una corrida payroll cuando `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`. Gate canonical en `pgGetApplicableCompensationVersionsForPeriod` (postgres-store.ts) — único punto de verdad.
- **NUNCA** insertar `scim_sync_log` dentro del primitive. Logging vive en endpoint handler (post-call). Permite logging de fallos cuando primitive throws.
- **NUNCA** emitir outbox event fuera de la tx del primitive. `publishOutboxEvent(event, client?)` acepta client opcional desde TASK-771 — pass through dentro del withTransaction.
- **NUNCA** DELETE physical sobre `scim_eligibility_overrides`. Solo supersede via `effective_to` + audit row append-only en `scim_eligibility_override_changes` (trigger PG enforce).
- **NUNCA** invocar `Sentry.captureException` directo en code path SCIM. Usar `captureWithDomain(err, 'identity', { tags: { source: 'scim_provisioning', stage: '...' } })`.
- **NUNCA** flippear `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción sin: (1) verify 7 legacy members all `'completed'`; (2) HR signoff workflow complete_intake; (3) smoke staging con member pending_intake synthetic + corrida payroll mock excluye correctamente.
- **NUNCA** marcar Felipe Zurita / Maria Camila Hoyos backfill como complete sin: (1) flag SCIM enabled staging + smoke `provisionOnDemand` test user verde; (2) comunicación humana a Felipe/Maria sobre badge "Ficha pendiente"; (3) operador humano ejecuta apply con allowlist explícita; (4) signals post-apply en steady state esperado.
- **SIEMPRE** que primitive devuelva `idempotent: true`, NO emitir outbox events (re-emit duplicates downstream).
- **SIEMPRE** que un consumer nuevo emerja que enumere members para payroll/capacity/compensation/assignments, agregar el mismo gate `workforce_intake_status = 'completed'` detrás del flag canónico (defense in depth).
- **SIEMPRE** que cascade outcome sea `reactivated_via_oid_reuse`, signal `identity.scim.member_reactivated_via_oid_reuse` (info-only V1.0) alerta a operador para audit del caso raro.

**Outbox event consolidado canonical `scim.internal_collaborator.provisioned v1`** (aggregateType='client_user'): payload incluye `userId, scimId, identityProfileId, memberId, azureOid, microsoftTenantId, primaryEmail, displayName, roleCode, workforceIntakeStatus, eligibilityVerdict, cascadeOutcome, operatingEntityMembershipAction, provisionedAt`. Single source of truth audit forensic para "qué pasó cuando entró este colaborador".

**Capabilities granulares canónicas (4 nuevas)**:

- `scim.eligibility_override.create` (organization, create, tenant) — EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->
- `scim.eligibility_override.delete` (organization, delete, tenant) — EFEONCE_ADMIN only
- `scim.backfill.execute` (organization, execute, all) — EFEONCE_ADMIN only
- `workforce.member.complete_intake` (workforce, update, tenant) — FINANCE_ADMIN + EFEONCE_ADMIN

**Spec canónica**: `docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md`. Runbook: `docs/operations/runbooks/scim-internal-collaborator-recovery.md`. Migrations: `migrations/20260513234436189_task-872-scim-eligibility-overrides.sql` + `migrations/20260514000116899_task-872-members-workforce-intake-status.sql` + `migrations/20260514000207733_task-872-capabilities-registry-seed.sql`.

### Capability runtime grant invariant (TASK-873, desde 2026-05-14)

Cuando una task seed-ea una capability nueva en `greenhouse_core.capabilities_registry` (DB) Y en `src/config/entitlements-catalog.ts` (TS), **debe también granteear esa capability a algún subject en `src/lib/entitlements/runtime.ts`** en el mismo PR. Sin el grant en runtime, el endpoint protegido por `can(subject, '<capability>', ...)` retorna 403 incluso para EFEONCE_ADMIN — la capability existe en el registry pero ningún subject la posee.

**Bug class canonizada live 2026-05-14**: TASK-872 Slice 1.5 seedeó `workforce.member.complete_intake` en TS catalog + DB capabilities_registry pero olvidó el grant en runtime.ts. El endpoint `POST /api/admin/workforce/members/[memberId]/complete-intake` quedó shipped pero inaccesible para cualquier rol durante todo el periodo desde TASK-872 SHIPPED (2026-05-13) hasta TASK-873 Slice 1 fix (2026-05-14, commit `00730a82`).

**⚠️ Reglas duras**:

- **NUNCA** agregar entry al `ENTITLEMENT_CAPABILITY_CATALOG` en `src/config/entitlements-catalog.ts` que se chequee vía `can()` sin agregar grant correspondiente en `src/lib/entitlements/runtime.ts` en el mismo PR. **Enforcement mecánico desde TASK-935**: el guard `src/lib/entitlements/capability-grant-coverage.test.ts` (puro, no-DB, corre en CI) parsea todos los `can()` usages en `src/app`+`src/lib` y asserta que toda capability del catalog chequeada vía `can()` está granteada a ≥1 rol. Si agregás un `can()` sobre una capability sin grant, este test rompe el build. (La parity test live `parity.live.test.ts` es complementaria: valida TS↔DB shape/module parity, NO grant coverage.)
- **NUNCA** agregar grant en runtime.ts sin un comentario `// TASK-XXX — <descripción del fix>` que documente la decisión + el set canónico de roles. El comentario es lo que permite al próximo agente entender el alcance del gate.
- **NUNCA** asumir que "la capability ya está en DB" significa "los usuarios tienen acceso". DB registry es **gobernanza** (qué capabilities existen + auditoría); runtime.ts es **policy** (qué subjects las tienen). Son ortogonales.
- **NUNCA** branchear `roleCodes.includes(...)` inline en route handlers o views. Toda autorización pasa por `can(subject, capability, action, scope)`. Los grants en runtime son la única fuente.
- **SIEMPRE** que un endpoint nuevo proteja recursos sensibles vía `can(...)`, smoke-test localmente con un usuario real del role objetivo (e.g. agent auth + Playwright + un member con el rol intended) ANTES de mergear. Sin smoke, el bug class del 2026-05-13→05-14 se repite.
- **SIEMPRE** que emerja una task que cubra Slice "Capabilities Registry Seed" (canonical pattern TASK-839/840/848/849/850/872), el slice **debe** incluir tanto la migration DB como el grant runtime.ts. NO scope-creep al slice anterior ni posterior; mismo commit.

**Defense in depth**: cuando una capability es operacionalmente crítica (e.g. transición state machine, mutación HR/Finance, reveal sensitive), agregar smoke test E2E en `tests/e2e/smoke/` que verifique el flow con un usuario del rol esperado. Sin smoke, el endpoint queda en "shipped pero inaccesible" hasta que un usuario real lo reporta.

**Spec canónica**: `docs/tasks/complete/TASK-873-workforce-intake-ui.md` (Slice 1 fix). Pattern fuente: `src/lib/entitlements/runtime.ts` líneas con grant `workforce.member.complete_intake` (matriz `hr ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN`).

**TASK-935 (2026-05-25) — reconciliación sistémica + guard mecánico**: el bug class TASK-873 había recurrido 13 veces (capabilities can()-checked en endpoints `/api/admin/*` sin runtime grant → 403 para todos). Causa raíz: specs documentaron roles intended (`DEVOPS_OPERATOR`, `commercial_admin`, `operations`) que **nunca existieron como `ROLE_CODES`**, así que el grant nunca se escribió. TASK-935 agregó los 13 grants (colapsando a `EFEONCE_ADMIN` + `FINANCE_ADMIN`, el set real que pasa `requireAdminTenantContext`) + el guard `capability-grant-coverage.test.ts` que **previene la recurrencia mecánicamente**. **NUNCA** documentar un rol intended en una spec/capability sin verificar que existe en `src/config/role-codes.ts`; si no existe, el grant colapsa al rol real más cercano (típicamente `EFEONCE_ADMIN`). Spec: `docs/tasks/complete/TASK-935-capability-governance-reconciliation.md`.

**Reflejo canonical antes de citar cualquier rol** (TASK-947 follow-up 2026-05-29): cuando un agente o spec mencione un rol, DEBE verificarlo primero contra el snapshot canonical de abajo (single source of truth: `src/config/role-codes.ts`, `ROLE_CODES` const). El guard `capability-grant-coverage.test.ts` atrapa el bug en CI cuando hay capability sin grant, pero el daño documental (specs/CLAUDE.md/AGENTS.md confusos) NO lo atrapa el guard. Esta regla cubre el lado documental.

#### ROLE_CODES vigentes (snapshot 2026-06-10, V1.1 canonical)

**14 roles reales** — son los ÚNICOS valores legítimos para `roleCodes`/`primaryRoleCode` en `TenantContext` / `TenantEntitlementSubject`. Cualquier mención fuera de esta tabla es bug documental. Fuente: `src/config/role-codes.ts` + `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §"Role codes internos actuales" + `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`. (TASK-1072 agregó `designer` → 13→14.)

**Internos Efeonce (11)**:

| `role_code` | Nombre visible | Para qué sirve | Route groups típicos |
|---|---|---|---|
| `efeonce_admin` | Superadministrador | Control total de Greenhouse (usuarios, roles, settings, vistas). Override global. Pasa `requireAdminTenantContext`. Es el colapso canonical de roles fantasma (DEVOPS_OPERATOR, commercial_admin). | `internal`, `admin` + acceso transversal |
| `finance_admin` | Administrador de Finanzas | Configuración + operaciones financieras sensibles. Pasa `requireFinanceTenantContext`. Co-grant canonical para observabilidad financiera. | `internal`, `finance` |
| `finance_analyst` | Analista de Finanzas | Operación financiera del día a día (read-write acotado, no settings sensibles). | `internal`, `finance` |
| `hr_payroll` | Nómina | Gestión de payroll, compensaciones y períodos. | `internal`, `hr` |
| `hr_manager` | Gestión HR | Gestión HR de personas, estructura y approvals de dominio. **NO confundir con `HR_ADMIN` (fantasma).** | `internal`, `hr` |
| `efeonce_operations` | Operaciones | Visibilidad operativa cross-space y cross-tenant. **NO confundir con `operations` (fantasma — no es rol, es término genérico).** | `internal` |
| `efeonce_account` | Líder de Cuenta | Responsabilidad comercial y salud de cuentas. | `internal` |
| `people_viewer` | Lectura de Personas | Lectura de People, capacidad, assignments y memberships. | `internal`, `people` |
| `ai_tooling_admin` | Administrador de Herramientas AI | Gobierno de catálogo, licencias y wallets AI. | `internal`, `ai_tooling` |
| `designer` | Diseñador | Opera el Design System interno (AXIS): vincula nodos Figma a las superficies del DS (capability `design_system.figma_node.link`), a futuro gobierna tokens/specimens. Ver el DS es view abierto a todo interno; **vincular** es exclusivo de este rol ∪ admin (TASK-1072). | `internal`, `my` |
| `collaborator` | Colaborador | Experiencia personal del miembro en Greenhouse (Mi Ficha, Mi Nómina). Lo tiene todo colaborador interno además de su rol funcional. | `my` |

**Externos cliente (3)**:

| `role_code` | Nombre visible | Para qué sirve | Route groups |
|---|---|---|---|
| `client_executive` | Cliente Ejecutivo | CMO/VP-level. Dashboard ejecutivo, KPIs alto nivel, overview de equipo. | `client` |
| `client_manager` | Cliente Manager | Marketing manager. Contexto operativo profundo, drilldowns de proyecto, detalle de sprint. | `client` |
| `client_specialist` | Cliente Specialist | Coordinador externo. Restringido a proyectos o campañas específicas via scope filters. | `client` |

**Helpers TS canonical para citar roles** (no escribir strings literales):

```ts
import { ROLE_CODES, type RoleCode, isRoleCode, isSuperadmin } from '@/config/role-codes'

// CORRECTO
hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)
addEntitlement(entries, { source: 'role', ... }) // donde tenant.roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

// PROHIBIDO
subject.roleCodes.includes('devops_operator') // fantasma — no existe
subject.roleCodes.includes('hr_admin') // fantasma — el real es hr_manager
subject.roleCodes.includes('commercial_admin') // fantasma — colapsa a efeonce_admin
```

**Mapping route_groups (NO son roles, no confundir)**: `internal`, `admin`, `client`, `finance`, `hr`, `people`, `my`, `ai_tooling`. Son derivados del rol según `src/lib/tenant/access.ts`. Un rol puede pertenecer a múltiples route_groups.

#### Bug class — roles fantasma que han contaminado specs

Estos NO existen en `ROLE_CODES` pero se siguen citando incorrectamente. Cuando emerjan en draft de task / spec / análisis, colapsar inmediatamente al rol real más cercano:

| Rol fantasma | Origen del bug | Colapso canonical |
|---|---|---|
| `DEVOPS_OPERATOR` / `devops_operator` | TASK-848/849/850/854/872/908 specs (release/SCIM/delivery). | `EFEONCE_ADMIN` solo (release ops + SCIM admin), opcional `+ FINANCE_ADMIN` para observabilidad. |
| `HR_ADMIN` / `hr_admin` | TASK-908 spec (ICO status transitions). | `HR_MANAGER`. |
| `commercial_admin` / `COMMERCIAL_ADMIN` | Drafts comerciales pre-TASK-935. | `EFEONCE_ADMIN`. |
| `operations` (como rol) | Confusión con route_group `internal` / con `efeonce_operations`. | `EFEONCE_OPERATIONS` si el intent es el rol; `internal` como route_group si el intent era acceso broad. |

**Protocolo obligatorio cuando un agente vaya a citar un rol** (nuevo draft, capability matrix, grant analysis, doc nueva, edit a CLAUDE.md/AGENTS.md):

1. Leer `src/config/role-codes.ts` (`ROLE_CODES` const) — los 14 valores arriba.
2. Listar los roles que el draft/análisis menciona.
3. Flag cualquier rol que no esté en la tabla.
4. Proponer colapso canonical (típicamente `EFEONCE_ADMIN` para admin/release, `+ FINANCE_ADMIN` para finance observability, `HR_MANAGER` para HR governance).
5. Documentar el colapso con marcador inline si la spec original tiene valor histórico (patrón: `<!-- spec original menciona X — colapsado a Y por TASK-935 -->`).

### Design System Figma node linking — ver ≠ vincular (TASK-1072, desde 2026-06-10)

El mapeo superficie↔nodo AXIS del Design System es **data-driven** desde la DB, no hardcodeado. SSOT runtime: `greenhouse_core.design_system_figma_nodes` (+ `_events` append-only). El TS `src/views/greenhouse/admin/design-system/design-system-figma-nodes.ts` quedó **seed-only** (NO source of truth runtime). El shell (`DesignSystemBreadcrumbShell`) lee el map server-side vía `getDesignSystemFigmaNodeMap()` y lo recibe como prop; un diseñador lo llena desde la UI (affordance "+" → `POST /api/design-system/figma-nodes`).

**Separación de planos canónica**: **ver** el Design System = plano **views** (`plataforma.design_system`, abierto a todo interno incl. `collaborator`). **Vincular** un nodo = plano **entitlements** (`design_system.figma_node.link`, módulo `design_system`, solo `designer` ∪ `efeonce_admin`). Un colaborador no-diseñador ve el DS + el botón disabled, pero no ve el affordance de vincular.

**⚠️ Reglas duras**:

- **NUNCA** resolver el mapeo ruta→nodo desde el TS hardcodeado en runtime. El TS es seed; `greenhouse_core.design_system_figma_nodes` es SSOT. Toda lectura pasa por `getDesignSystemFigmaNodeMap()`.
- **NUNCA** persistir un vínculo cuyo `file_key` no sea AXIS (`yyMksCoijfMaIoYplXKZaR`) — allowlist CHECK fail-closed (DB) + validación en el command (TS). No dejar entrar un Figma externo arbitrario al DS.
- **NUNCA** `DELETE` de un vínculo ni de las filas de audit. Re-link = UPDATE in-place del current + evento append-only (`design_system.figma_node.{linked,relinked}`); soft-unlink = `superseded_at`.
- **NUNCA** mostrar el affordance de vincular a quien no tenga la capability `design_system.figma_node.link` (capability, NO viewCode). Ver el DS ≠ poder vincular.
- **NUNCA** mutar/escribir el vínculo desde un componente cliente — el command `linkDesignSystemFigmaNode` es server-only y pasa por la API gateada. El shell client solo importa el TYPE del store (`import type`, sin leak server-only — verificado build Turbopack).
- **SIEMPRE** la layout (server) inyecta el map + `canLink` (resuelto por `can()`) al shell; el cliente no decide acceso.
- El rol `designer` se asigna **aditivo** vía `user_role_assignments` (lifecycle-aware TASK-987), sin quitar roles existentes.
- **Render real del nodo (Slice 4, code-complete)**: cliente server-only `figma-render.ts` (Figma REST `/v1/images` + `/v1/files/nodes`) + API `GET /api/design-system/figma-nodes/preview` → el editor muestra el render real del nodo AXIS, con fallback de identidad AXIS honesto. Token vía `resolveSecret('FIGMA_API_TOKEN')` → secret `greenhouse-figma-api-token` (**provisionado y funcional**: PAT Figma read-only; el render real del nodo opera. El fallback de identidad AXIS sigue como degradación honesta si el token faltara). NUNCA exponer el token al cliente; el link NUNCA depende de Figma (enrichment degradable). El allowlist AXIS-only es para las **primitivas/tokens** del DS; el handoff de **páginas de producto** (archivos Figma de producto + lifecycle) vive en su propio aggregate — ver [[TASK-1120]] (`design_handoff_entries`, allowlist gobernado de producto), que NO toca este linking AXIS.

**Spec canónica**: `docs/tasks/complete/TASK-1072-designer-role-figma-node-linking.md`. Helpers: `src/lib/design-system/figma-nodes/{store,parse-figma-url}.ts`. Migraciones: `20260610131435833` (rol), `20260610131826746` (tabla+trio), `20260610132434509` (capability), `20260610133821108` (rollout 3 usuarios). Patrón fuente: TASK-790 (audit trio), TASK-721 (evidence SSOT), TASK-873/935 (capability grant coverage), TASK-987 (route-group parity TS↔DB + lifecycle).

### Knowledge Platform foundation invariants (TASK-1081, desde 2026-06-11)

`greenhouse_knowledge` es el corpus gobernado de documentos publicados (manuales/SOP/runbooks/glosarios) para la **capa humana** + **retrieval agéntico** de Nexa/MCP con citas. Notion = authoring; Greenhouse = runtime publicado/versionado (ADR `GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1` aceptado en dirección por TASK-1080). Foundation (TASK-1081): schema + helpers, **sin** Notion sync / search / UI / Nexa (esos son TASK-1082..1086). Módulo: `src/lib/knowledge/` (barrel **puro**; `store.ts` server-only importado directo — TASK-827).

- **`greenhouse_knowledge` NO es `greenhouse_context` (Structured Context Layer).** SCL = sidecar **JSONB de memoria** de agente/replay sobre aggregates (`document_jsonb`, context kinds tipo `agent.execution_plan`); Knowledge = **corpus de prosa + chunks** con gobernanza editorial. Boundary explícito en `STRUCTURED_CONTEXT_LAYER_V1` §900-906. NUNCA fusionarlos ni mover conocimiento prosa al SCL.
- **Dos dimensiones ORTOGONALES (no un enum mezclado):** `publication_status` (lifecycle: `draft→review→published→stale→deprecated`; `quarantined` = bloqueo que gana sobre todo) **y** `agentic_policy` (`agent_allowed`/`agent_excluded`, compuerta de retrieval). Un doc `published` puede ser `agent_excluded` (visible para humanos, fuera de Nexa). NUNCA meter `agent_excluded` en el enum de lifecycle. Transiciones enforced en trigger DB `knowledge_documents_validate_transition` **y** en `assertValidKnowledgePublicationTransition` (TS, mirror exacto — mover juntos).
- **MVP solo interno:** `sensitivity ∈ {internal, restricted}` (`client_safe` diferido a fase cliente); `audience='internal'`. NUNCA exponer corpus a `client_*` en este MVP.
- **Append-only / forensic:** `knowledge_publication_runs` (anti-DELETE) es el audit leg; `knowledge_feedback` (anti-UPDATE + anti-DELETE). NUNCA borrar — quarantine/deprecate son transiciones, no borrados. Las FK son `ON DELETE RESTRICT` (un run/versión bloquea borrar su documento).
- **Pre-LLM filtering:** los chunks denormalizan `audience`/`sensitivity`/`freshness`/`agentic_policy` para filtrar **antes** del LLM sin JOIN (TASK-1083). `quarantined` y `agent_excluded` NUNCA se retornan en retrieval agéntico.
- **Capabilities** (módulo `knowledge`, sembradas en la foundation con catalog + `capabilities_registry` + grants en `runtime.ts` **mismo PR** — invariant TASK-873/935): `knowledge.{document.read,document.publish,source.admin,agentic.retrieve,feedback.submit}`. Aún no `can()`-checked (consumidores TASK-1083/1084).
- **Diferidos a downstream (decisiones de ejecución):** viewCode `plataforma.knowledge` → TASK-1084 (nace con la página `/knowledge`, TASK-827); tsvector/GIN → TASK-1083 (search; no GIN day-one); outbox events → cuando haya consumidor (audit via publication_runs). NUNCA sembrar el viewCode sin su página + nav.
- **NUNCA** `Sentry.captureException` directo en este dominio — usar `captureWithDomain(err, 'knowledge', …)`. **NUNCA** leer Notion en vivo desde el módulo (la ingesta hace snapshot, TASK-1082). **NUNCA** guardar secretos/tokens en `normalized_markdown`/chunks (→ `quarantined`).

**Spec canónica**: `docs/tasks/complete/TASK-1081-knowledge-core-schema-source-registry.md` + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-11. Migraciones: `20260611200140700` (schema), `20260611201441449` (capabilities). Patrón fuente: TASK-790 (state machine + CHECK + audit trio + módulo puro/server-only), TASK-413 SCL (schema documents+versions+quarantine — boundary), TASK-873/935 (capability grant coverage), TASK-721 (append-only forensic).

### Knowledge ingestion invariants (TASK-1082, desde 2026-06-11)

La ingesta del corpus a `greenhouse_knowledge` es un **pipeline source-agnostic** (`src/lib/knowledge/ingestion/`): connector interface → `load` → normalize (`markdown.ts`: chunker heading-pathed + checksum sha256) → sanitize (`sanitization/detect.ts`) → `(quarantine | publish + chunks)`, con modos **dry-run/apply** e idempotencia por **checksum**. El connector es **dueño de su identidad de source** (`sourceDescriptor`, SSOT) — el pipeline NO hardcodea `repo_docs` (TASK-1088 Slice 1). Connectores: `repo_docs` (markdown del repo) y `notion` (`NotionKnowledgeConnector` — block fetcher `/v1/blocks/{id}/children` paginado+recursivo → `blocks→markdown` puro → mismo pipeline sin cambios; **gated en secret** `NOTION_KNOWLEDGE_TOKEN_SECRET_REF`, corpus `notion-corpus.ts` nace **vacío**, `list()` degrada honesto a `unavailable` si el token no está provisionado). CLI: `scripts/knowledge/ingest.ts [--apply] [--source=repo_docs|notion]`.

- **Notion es authoring, Greenhouse es runtime.** NUNCA Notion live ni Notion MCP como runtime primario de Nexa. La ingesta hace **snapshot** (no lectura live). NUNCA ingerir todo Notion — solo el source/corpus autorizado (manifest `pilot-corpus.ts`, MVP `audience='internal'`).
- **Sanitize-before-chunk (fail-closed):** tratar el contenido como input NO confiable. Un doc flagged (valores de secretos/PII/prompt-injection) se pone `quarantined` **antes** de chunkear → NUNCA se vuelve recuperable. El detector apunta a **SHAPES de valor** (JWT, `sk-`, private key, RUT, "ignore previous instructions"), NO a menciones de "secret" en prosa (el corpus describe higiene de secrets — 0 falsos positivos verificado). NUNCA escribir secretos/tokens reales en `normalized_markdown`/chunks.
- **quarantine es knowledge-native:** `publication_status='quarantined'` + `run_kind='quarantine'`. NUNCA escribir a la tabla SCL `context_document_quarantine` (otro dominio).
- **Idempotente por checksum:** re-correr `--apply` NO duplica; publica versión nueva solo si el contenido cambió. NUNCA habilitar `apply` sin dry-run revisado; producción se mantiene `sync_enabled=FALSE` hasta aprobación humana.
- **Gobernanza editorial declarativa:** la metadata (audience/sensitivity/agentic_policy/approver) la declara el manifest, NO se infiere del contenido. `#13 periodos-de-nomina` + `#14 politica-secretos` nacen `agent_excluded`.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'knowledge', …)`. Errores sanitizados con `redactErrorForResponse`. **2 reliability signals** (módulo `knowledge`): `knowledge.publication.quarantine_count` (data_quality, steady=0) + `knowledge.sync.failed_source` (freshness, steady=0).
- **Connector Notion (TASK-1088):** `blocks→markdown` es **puro** (`src/lib/knowledge/notion/blocks-to-markdown.ts`, sin IO, testeable con fixtures) — las headings limpias (`#`/`##`/`###`) son críticas porque el chunker arma el `headingPath` de ellas. El block fetcher (`notion-knowledge-client.ts`, server-only) resuelve el token **solo** vía `resolveSecretByRef(NOTION_KNOWLEDGE_TOKEN_SECRET_REF)` (Notion-Version `2026-03-11`, 429 retry con Retry-After, guard anti-runaway 5000 bloques/12 niveles, errores sanitizados que **nunca** incluyen el token). El corpus `notion-corpus.ts` nace **vacío** y NUNCA descubre Notion en vivo: el operador declara las entradas autorizadas + metadata editorial. La metadata de gobernanza NO se infiere del contenido (misma disciplina que `repo_docs`). El sanitize-before-chunk + quarantine aplican idéntico (drop-in: el connector solo cambia la **fuente** del markdown, no el pipeline).
- **Wikis Notion = `data_source` (TASK-1088 Slice 5):** el corpus es una unión `page | data_source`. Una **Wiki es una database** Notion cuyas filas son artículos; el connector la **expande** a N documentos vía `queryDataSourcePages` → `POST /v1/data_sources/{id}/query` (canónico, **NUNCA** `/databases/{id}/query`), paginación opaca + filtro `in_trash` + detección cap 10k. **NUNCA** derivar el slug de un artículo del título (inestable → doc huérfano): es estable desde el page id (`<slugPrefix>/<pageId>`); la gobernanza se declara a nivel Wiki y se hereda. **NUNCA** declarar databases operacionales (Sprints/Proyectos/Tareas/Calendarios/Revisiones) al corpus — son data del pipeline de delivery, no prosa. **NUNCA** emitir la URL S3 **presigned** de un archivo Notion-hosted (`file.url` con `X-Amz-Credential=ASIA…`) al markdown: es efímera + dispara el sanitizer → cuarentenaría todo artículo con imagen (solo URLs estables external/bookmark; lo hosteado queda como caption).

**Spec canónica**: `docs/tasks/complete/TASK-1082-notion-knowledge-ingestion-mvp.md` + `docs/tasks/complete/TASK-1088-notion-knowledge-connector.md` (connector Notion, 2026-06-12) + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-11/06-12. Patrón fuente: TASK-790/822 (módulo puro + server-only), TASK-771 (run audit), TASK-721 (sanitize/quarantine), TASK-1081 (store + boundary SCL), TASK-998/1003 (token Notion por scope + Notion-Version 2026-03-11).

### Knowledge auto-ingest por webhook Notion invariants (TASK-1094, desde 2026-06-12)

El corpus de knowledge se mantiene al día **automáticamente** vía **webhook** (decisión operador: NO cron) cuando se publica/edita/borra un artículo en una Wiki/página declarada. Reusa el bus de webhooks (TASK-912), outbox→consumer reactivo (TASK-771/773) y el conector/pipeline (TASK-1088/1082) **sin modificarlos** — esta task los **dispara**, no los cambia. Detrás del flag `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` (default OFF). Módulos: `src/lib/knowledge/notion/{webhook-flags,auto-ingest,reconcile}.ts` + `src/lib/webhooks/handlers/notion-knowledge.ts` + `src/lib/sync/projections/knowledge-notion-ingest.ts`.

- **Webhook = trigger ligero; el consumer RE-FETCHEA (NUNCA confía el payload).** El handler emite `knowledge.notion.page_change_signal` (page id + `isDeletion`); la projection `knowledge_notion_ingest` re-fetchea la página (source of truth). Coalescing-safe: el re-fetch ve `in_trash` aunque el evento fuera un edit. Mismo patrón que TASK-912 (`notion.task.page_change_signal`).
- **Gate de gobernanza fail-safe.** El consumer SOLO actúa si la página pertenece al corpus declarado: `parent.data_source_id` ∈ una Wiki declarada (`notionDataSourceId`) o el page id ∈ una página suelta declarada (`notionPageId`). `resolveCorpusEntryForNotionPage` (puro) lo resuelve; fuera del corpus → ignora. NUNCA ingerir una página fuera del corpus.
- **Borrado = deprecación** (cierra el gap de TASK-1088). `page.deleted` o re-fetch `in_trash` → `transitionKnowledgeDocumentStatus('deprecated')` (solo desde `published`/`stale`). El doc deja de ser recuperable por Nexa.
- **Re-ingest reusa `ingestOne`** (single source of truth del pipeline TASK-1082, idempotente por checksum). NUNCA duplicar la lógica de sanitize/quarantine/chunk para el path webhook.
- **El handler NUNCA ingiere inline** — emite outbox + responde 200 (Notion timeout corto). La ingesta (lenta, hitea Notion API + escribe DB) corre async en el ops-worker.
- **Red de seguridad del at-most-once SIN cron**: señal PG-only `knowledge.notion.ingest_dead_letter` (kind dead_letter, moduleKey knowledge, steady=0 — detecta re-ingests FALLIDOS, cheap, NO hitea Notion en cada overview) + `reconcile` on-demand (`scripts/knowledge/reconcile.ts`, re-ingest faltantes + deprecación de huérfanos vía `findOrphanDocs` puro — detecta eventos PERDIDOS, hitea Notion solo cuando el operador lo corre). El at-most-once queda VISIBLE + RECUPERABLE, no silencioso. **NUNCA** agregar un cron programado (decisión operador).
- **Aislamiento**: secret HMAC PROPIO del webhook (`NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF`), distinto del token de la integración y del secret de delivery (TASK-912)/demo. Verification handshake ACK siempre (pre-flag/pre-HMAC). Sin echo-loop (knowledge NO escribe a Notion). **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'knowledge', ...)`.
- **Rollout (operador, pendiente)**: code-complete + flag OFF (cero efecto al merge). Activación = crear secret HMAC + suscribir el webhook en la integración "Greenhouse KNOW" (URL `…/api/webhooks/notion-knowledge` + eventos `page.*`) + `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` en el ops-worker + flag ON. Runbook: `docs/operations/runbooks/notion-knowledge-webhook.md`.
- **SIEMPRE** que se agregue una Wiki/página al corpus (`NOTION_KNOWLEDGE_CORPUS`), compartirla con "Greenhouse KNOW" en Notion + correr la ingesta inicial (`ingest --source=notion --only=<wiki> --apply`); desde ahí el webhook la mantiene al día.

**Spec canónica**: `docs/tasks/complete/TASK-1094-notion-knowledge-webhook-auto-ingest.md` + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (auto-ingest) + EVENT_CATALOG Delta 2026-06-12. Patrón fuente: TASK-912 (webhook Notion re-fetch + handshake + flag), TASK-771/773 (outbox + reactive projection + dead-letter), TASK-1088 (conector + corpus), TASK-1082 (pipeline ingestOne).

### Knowledge Search API invariants (TASK-1083, desde 2026-06-12)

`knowledge_search` es el contrato **read-only** de retrieval del corpus, sobre API Platform, que consumen por igual UI humana (TASK-1084), Nexa (TASK-1085) y MCP (TASK-1086). **Full API Parity**: la UI/Nexa/MCP son clientes de un contrato gobernado, NO queryean las tablas. Reader SSOT `searchKnowledge` (`src/lib/knowledge/search/search-knowledge.ts`, server-only; barrel `search/index.ts` pure-only — TASK-827).

- **Reader SSOT, lane-agnóstico**: `searchKnowledge({query, subject, mode})` es el ÚNICO punto de retrieval. Recibe `subject` (no `request`) → TASK-1086 lo envuelve para `ecosystem`/MCP sin lógica nueva. Packet versionado `KnowledgeRetrievalPacket` con `contractVersion: 'knowledge-search.v1'` (bump a `v2` ante cambio breaking, nunca mutación silenciosa).
- **Dos modos, pre-LLM filtering en SQL** (las dos dimensiones ortogonales, Delta B): `human` (cap `knowledge.document.read`) ve `agent_excluded`; `agentic` (cap `knowledge.agentic.retrieve`) **NUNCA** retorna `agent_excluded`/`quarantined`/`restricted`. El binding modo→capability vive en `search/mode.ts` (SSOT). El filtrado lee el **documento vivo** (`kd`), no el chunk denormalizado (que puede lagear), y filtra `current_version_id` (ignora chunks de versiones superseded).
- **Substrato FTS**: columna `body_tsv tsvector GENERATED` vía función IMMUTABLE SSOT `greenhouse_knowledge.knowledge_chunk_tsv` (weighted heading `'A'`>body `'B'`, config `'spanish'`, **accent-insensitive** `unaccent`) + GIN. Retrieval = OR-ify + `ts_rank` + **piso de relevancia 0.10** (no-answer honesto). Vector/embeddings = escalación diferida (TASK-1080), aditiva.
- **Quality gate = eval harness offline**: 10 golden questions (fixtures TS, `golden-questions.ts`) — fuente correcta/equivocada/no-answer/escalación sensible. Structural test en CI + eval harness live. El signal `low_citation_rate` mide respuestas de Nexa → es de **TASK-1085**, no de aquí.

**⚠️ Reglas duras**:

- **NUNCA** queryear `greenhouse_knowledge.knowledge_chunks`/`knowledge_document_versions` (contenido) directo desde un consumer (UI, Nexa, MCP, otro dominio). Consumir el contrato: `searchKnowledge` (retrieval) o los readers del store (browse/detail) o los endpoints `app`. Lint rule `greenhouse/no-direct-knowledge-chunk-query` (warn→error tras 1084/1085) lo bloquea; exime el data layer `src/lib/knowledge/**`, migrations, plugin, `db.d.ts`. (Governance ops puede `COUNT` `knowledge_documents` — metadata — legítimamente.)
- **NUNCA** dejar que el contenido de un chunk denegado (`agent_excluded`/`restricted`/`quarantined`) entre al reader en modo agentic. El reader trae SOLO chunks permitidos; lo denegado se **cuenta** (`deniedOrFilteredCount`), nunca se trae el texto.
- **NUNCA** inventar un número de relevancia paralelo en la UI/Nexa (score por chunk, confianza por fuente). `KnowledgeRetrievalChunk.score` (el `ts_rank` redondeado) es el **SSOT del número del trace** (Answer Trace, TASK-1089/1085); la confianza por fuente/overall se **deriva** de él (agregando por documento o el máximo), NO se fabrica. Si la UI muestra "Score 0.96" o "Confianza 0.94", sale del packet — sino el trace es teatro. La **confianza de respuesta** (que genera Nexa al componer, TASK-1085) es DISTINTA de la **confianza/score de retrieval** (del packet) — no confundirlas. La tab "Evals" del trace es la salud del **eval harness offline** (golden questions, CI), NO un campo por-consulta del packet.
- **NUNCA** filtrar policy/status por el chunk denormalizado — leer `kd` (documento vivo). El chunk copia audience/sensitivity/agentic_policy/freshness al publicar y puede lagear tras una transición.
- **NUNCA** `to_tsvector('spanish', ...)` inline en una columna GENERATED (resuelve STABLE → rompe). Usar la función IMMUTABLE SSOT; si se tunea (weights/config/unaccent), recomputar la columna (drop+readd) en migración nueva — NUNCA editar una migración aplicada.
- **NUNCA** devolver `confidence='none'` disfrazando un error del índice. El reader NO swallowea: una falla propaga y la sanitiza el endpoint (`captureWithDomain`). `'none'` es exclusivamente 0 resultados (no-answer honesto).
- **NUNCA** romper el shape de `knowledge-search.v1` sin bumpear a `v2`. Nexa/MCP/partners dependen de la forma estable.
- **NUNCA** seedear/derivar un modo nuevo sin declarar su capability en `mode.ts` + grant en `runtime.ts` (guard `capability-grant-coverage.test`).
- **SIEMPRE** anti-oracle en read-detail: doc inexistente / draft / quarantined / audience ajena → `notFound` (404), nunca 403 (no filtra existencia).
- **SIEMPRE** que las golden questions muestren recall/precisión pobre, tunear el substrato (umbrales, `pg_trgm`, etc.) — es el mecanismo canónico (la columna `body_tsv` se ALTERa por migración). El eval harness es la regresión.

**Spec canónica**: `docs/tasks/complete/TASK-1083-knowledge-search-api-golden-questions.md` + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 + `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`. Migraciones `20260612072724451` (tsvector) + `20260612075236036` (unaccent). Patrón fuente: TASK-672 (contrato versionado + composer), TASK-571/766 (VIEW/helper SSOT + lint rule), TASK-822 (lint de boundary), TASK-873/935 (capability grant coverage), TASK-872 (anti-oracle notFound).

### Nexa Intelligence — documentación por capas + doc gate (TASK-1124, desde 2026-06-15)

La inteligencia conversacional de Nexa está documentada por **capas de producto** (carpetas que
crecen por dominio) en `docs/architecture/nexa-intelligence/` (índice `README.md`): `system-prompt/`
(versionado + vigente) · `behavior/` (comportamiento + routing) · `voice/` (voz/tono/estilo/
personalidad) · `knowledge/` (retrieval+calidad + evidencia/citas) · `experience/` (**Conversational
Experience + Nexa Moments + Nexa Answers**) · `governance/` (do's&don'ts) · `technical/` (modelos LLM,
pipeline RAG, técnicas, contratos de datos). Funcional (simple): `docs/documentation/plataforma/nexa-intelligence-capas.md`. Manual: `docs/manual-de-uso/plataforma/nexa-intelligence-mantener.md`.

- **SSOT machine-readable** del mapeo dominio↔código↔docs: `docs/architecture/nexa-intelligence/manifest.json`.
- **Gate canónico** `pnpm nexa:doc-gate` (`scripts/ci/nexa-intelligence-doc-gate.mjs`, en `ci.yml` modo `--changed`): si cambia código de un dominio Nexa pero **no** se actualizó ninguno de sus docs de capa → falla; un archivo Nexa nuevo fuera de `domains`/`codeAllowlist` → falla (dominio sin capa).
- **⚠️ Reglas duras:** **NUNCA** tocar un dominio Nexa (prompt, voz, behavior/routing, tool/knowledge, evidencia, flags, modelos LLM) sin actualizar su doc de capa en el mismo cambio (el gate lo bloquea). **NUNCA** agregar un archivo Nexa nuevo sin registrarlo en `manifest.json` (`domains` con su doc, o `codeAllowlist` si es plumbing). **SIEMPRE** que cambie el contrato canónico de una capa (prompt versioning, RAG, contratos, voz), mover juntos: el código + su doc de capa + (si aplica) `technical/`.

### Nexa Knowledge Retrieval invariants (TASK-1085, desde 2026-06-12)

Nexa responde dudas de proceso/política/definición **recuperando del corpus gobernado y citando** — vía un tool de function-calling que consume el contrato `knowledge-search.v1` (TASK-1083), detrás del flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (default OFF). Mitad backend = Claude (tool + reglas + señales); mitad UI/Answer-Trace = Codex (`NexaKnowledgeAnswerSurface` + wiring `@assistant-ui/react`). El tool es el **único punto de retrieval de Nexa**: `searchKnowledge({ mode: 'agentic' })`, NUNCA un LLM call sin retrieval ni un query directo a las tablas.

- **NUNCA** Nexa queryea `greenhouse_knowledge.knowledge_chunks`/`knowledge_document_versions` directo (lint `greenhouse/no-direct-knowledge-chunk-query`) ni mete el corpus completo al prompt. Solo el `KnowledgeRetrievalPacket` del turno (que viaja en `result.raw.packet`).
- **NUNCA** Nexa responde un dato de conocimiento sin citar (`citationLabel`), ni inventa cuando `confidence='none'` (gap honesto: "no encontré una guía publicada"), ni omite declarar fuentes `stale`/`deprecated`. Las Answer Rules viven en el system prompt y **solo se inyectan con el flag ON** (no mencionar un tool que no existe).
- **NUNCA** un número del Answer Trace se fabrica: los de retrieval (`chunks[].score`, `confidence`, `freshness`, `deniedOrFilteredCount`) salen del packet; la **confianza de respuesta** + el badge "verificada" + la prosa los **genera Nexa** al sintetizar (answer-level, distinto del retrieval). Si la UI muestra un número que no sale del packet ni de la generación gobernada, es teatro.
- **NUNCA** acoplar el tool ni las reglas al SDK de Gemini. El swap previsto **Gemini→Claude** (`src/lib/ai/anthropic.ts`) NO debe tocar `search_knowledge` ni las Answer Rules — solo el cliente del modelo. El packet ya es provider-agnóstico.
- **NUNCA** construir el `functionResponse` del follow-up con `createPartFromFunctionResponse` (@google/genai inyecta un `id` huérfano que Gemini 2.5 rechaza → rompe TODO el tool-calling). Usar `{ name, response }` sin id (match por nombre/orden), consistente con el `functionCall` (ISSUE-092).
- **NUNCA** feedback del chat por un handler local: usar el contrato compartido `POST /api/platform/app/knowledge/feedback` (Full API Parity #5).
- **NUNCA** gatear el tool solo por el flag: requiere flag ON **y** grant agéntico del tenant (interno ∪ {EFEONCE_ADMIN, FINANCE_ADMIN, HR_MANAGER, EFEONCE_OPERATIONS}; cliente NUNCA). `isAvailable` lo enforce.
- **NUNCA** persistir señales de retrieval con writes nuevos: se leen de `nexa_messages.tool_invocations` (jsonb, el packet ya está ahí). `knowledge.nexa.no_source_answer_rate` (cobertura) + `knowledge.nexa.stale_source_retrievals` (steady=0), moduleKey `knowledge`. La señal answer-level `knowledge.retrieval.low_citation_rate` requiere "respuesta" renderizada (vive con la mitad UI).
- **SIEMPRE** que emerja una surface nueva que use Nexa como ayuda contextual, consumir el mismo tool/contrato — cero retrieval ad-hoc.

**Spec canónica**: `docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md` + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (Retrieval de Nexa) + ISSUE-092. Reader señales: `src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts`. Tool: `src/lib/nexa/nexa-tools.ts`. Patrón fuente: TASK-1083 (contrato SSOT + Full API Parity), TASK-672 (tool surface), TASK-873/935 (capability grant coverage).

### Knowledge MCP / ecosystem lane invariants (TASK-1086, desde 2026-06-12)

El **tercer lane** del contrato de retrieval (junto a `app` de TASK-1083 y el tool de Nexa de TASK-1085): un agente **MCP** consume el corpus gobernado vía el lane **`ecosystem`** de API Platform (`machine-authed` por binding sister-platform), **read-only**. Cero lógica de dominio nueva — reusa el SSOT `searchKnowledge({ mode:'agentic' })` + los readers del store (`src/lib/knowledge/store`). La **única diferencia** con el lane `app` es la derivación del `subject`. Builders en `src/lib/api-platform/resources/ecosystem-knowledge.ts`; rutas `GET /api/platform/ecosystem/knowledge/{search,documents/[id]}` vía `runEcosystemReadRoute`; MCP server `src/mcp/greenhouse/**` expone 2 tools (`search_knowledge`, `get_knowledge_document`) + 1 resource (`greenhouse://knowledge/document/{id}`).

- **NUNCA** un consumer ecosystem/MCP queryea `greenhouse_knowledge.*` ni Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`). Toda lectura pasa por `getEcosystemKnowledgeSearchPayload` / `getEcosystemKnowledgeDocumentPayload`, que envuelven el SSOT — NUNCA SQL/Notion paralelo ni un mapping del packet (`knowledge-search.v1` es idéntico cross-lane).
- **NUNCA** derivar el `subject` del lane ecosystem desde `TenantContext`/`roleCodes` (no existe sesión). Se deriva del **binding** vía `buildEcosystemKnowledgeSubject(context)`. **Governance gate default-DENY**: el corpus es **interno-only** (MVP) → solo `context.binding.greenhouseScopeType==='internal'` recupera conocimiento agéntico; cualquier binding tenant-scoped (organization/client/space) → `403 scope_not_allowed`. Exponer corpus interno a una plataforma externa es un grant explícito, no implícito. Es un gate de **lane**; el anti-oracle per-doc aplica una vez pasado.
- **NUNCA** read-detail por id sin **anti-oracle 404**: doc inexistente / `draft` / `deprecated` / `agent_excluded` / `restricted` / audience no-interna → `404 not_found`, NUNCA `403` (no filtra existencia). El predicado `isDocumentAgenticallyVisible` es **local** (espeja el filtro agéntico del SQL; el intento de exportarlo desde `search-knowledge.ts` se revirtió 2× por el churn del WT compartido → local es robusto + sin colisión). Mantenerlo en sync con el `WHERE` agéntico del reader es el contrato; el test lo bloquea contra drift.
- **NUNCA** devolver la fila cruda del documento — solo el DTO `EcosystemKnowledgeDocumentSummary` (sin `secret_ref` ni internals de ingesta) + las secciones (`headingPath` + `citationAnchor` + `bodyText`).
- **NUNCA** writes V1 (read-only). El tool MCP instruye **no-invención**: cuando `confidence='none'` el agente reporta "no hay guía publicada", no fabrica. `get_knowledge_citations` se **descartó** (redundante con el packet + read-detail); los resources `source/{id}` / `runbook/{slug}` quedan **diferidos** (un `source/{id}` expone config de ingesta sin valor agéntico; V1 = `document/{id}`).
- **NUNCA** invocar `Sentry.captureException` directo en estos paths — el lane ecosystem ya sanitiza/loggea vía `runEcosystemReadRoute` (`ApiPlatformError` con `errorCode`).
- **SIEMPRE** que emerja un consumer downstream nuevo del corpus (otra sister-platform, otro transporte MCP, partner API), reusar el lane ecosystem + el SSOT — cero retrieval ad-hoc, cero segundo subject-builder.

**Pendiente operativo (post-deploy)**: smoke MCP **end-to-end** contra staging requiere un binding `sister_platform_consumers` con `greenhouse_scope_type='internal'` (artefacto operador-configurado) + la URL `.vercel.app`. El smoke a nivel builder (PG live) ya está verificado (binding interno → chunks reales con citas; binding client → `scope_not_allowed`; read-detail → doc + secciones). El path de transporte HTTP está cubierto por los 18 tests del `http-client`/`tools` MCP.

**Spec canónica**: `docs/tasks/complete/TASK-1086-greenhouse-mcp-knowledge-resources-v1.md` + `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (Lane ecosystem de Knowledge) + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (Consumo MCP). Builder: `src/lib/api-platform/resources/ecosystem-knowledge.ts`; MCP: `src/mcp/greenhouse/{http-client,tools,server}.ts`. Patrón fuente: TASK-1083 (SSOT + Full API Parity), TASK-872 (anti-oracle 404), TASK-617.x (lane ecosystem binding-aware).

### Nexa provider abstraction + router interno invariants (TASK-1091, desde 2026-06-12)

El "hablar con el modelo" de Nexa vive detrás de la interfaz **`NexaChatProvider`** (`src/lib/nexa/nexa-provider.ts`: `resolveTurn` 2-pass tool loop + `generateSuggestions`); `nexa-service.ts` es el **orquestador provider-agnóstico** (system prompt + Answer Rules de knowledge + delega el modelo al provider). Providers: `providers/gemini.ts` (default, `@google/genai`, fix ISSUE-092) y `providers/anthropic.ts` (`getAnthropicClient`, Messages API, `tool_use`/`tool_result` **con** `tool_use_id`). El router interno `nexa-model-router.ts` (PURO) elige el provider por **intención**; la selección es **100% interna, NUNCA expuesta al usuario**. Detrás de `NEXA_AUTO_ROUTER_ENABLED` (default OFF → siempre Gemini, byte-idéntico).

- **NUNCA** instanciar un SDK LLM dentro de un provider/dominio: Gemini vía `getGoogleGenAIClient` (`src/lib/ai/google-genai.ts`), Anthropic vía `getAnthropicClient` (`src/lib/ai/anthropic.ts`). El secret se resuelve server-side (`ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key`); NUNCA hardcodear `sk-ant-*`/`sk-*` ni imprimirlo.
- **NUNCA** tocar `nexa-tools.ts` (`search_knowledge` + `executeNexaTool` + declaraciones), las Answer Rules ni el contrato `knowledge-search.v1` desde un provider/router — son provider-agnósticos (invariante TASK-1085). El adapter solo cambia el transporte; el `NexaToolInvocation.result.raw.packet` (`knowledge-search.v1`) debe ser idéntico para que señales TASK-1085 + persistencia + Answer Trace funcionen sin cambios.
- **NUNCA** copiar el workaround ISSUE-092 (functionResponse sin `id`) al adapter Anthropic: el protocolo Anthropic **EXIGE** `tool_use_id` en cada `tool_result` (matchea call↔result por id — es correcto, no huérfano). El workaround es Gemini-específico.
- **NUNCA** exponer la selección de modelo al usuario. El picker (`NEXA_MODEL_OPTIONS`) sigue solo-Gemini; el modelo Anthropic (`anthropic/claude-sonnet-4-6@default`) es **router-internal** (no seleccionable). `requestedModel` es solo override de ops/testing y solo honra modelos del picker (`isSupportedNexaModel`).
- **NUNCA** romper la precedencia de `buildProviderPlan`: modelo pedido soportado > `NEXA_PROVIDER` (pin, sin failover) > auto-router (intención + failover) > **default Gemini** (single-provider, byte-idéntico al previo a TASK-1091). Con el router OFF nada de Anthropic corre.
- **NUNCA** derivar el provider/sdk model con strings ad-hoc: usar `resolveNexaProviderKey(id)` + `resolveNexaSdkModel(id)` (`src/config/nexa-models.ts`). Gemini recibe el NexaModelId **verbatim** (comportamiento Vertex actual); Anthropic el id limpio (`anthropic/claude-sonnet-4-6@default` → `claude-sonnet-4-6`).
- **NUNCA** activar `NEXA_AUTO_ROUTER_ENABLED=true` sin: `ANTHROPIC_API_KEY_SECRET_REF` resuelto en el runtime + eval de paridad (golden questions: ambos providers citan `[n]` + respetan no-invención en `confidence='none'`) + smoke live de ambos + sign-off del operador. La activación es config sin deploy (rollback = flag flip).
- **SIEMPRE** que emerja un provider nuevo (OpenAI chat/tools, etc.), implementar `NexaChatProvider` + agregar su id `provider/model@version` a `nexa-models.ts` + extender el router. El orquestador no cambia. La observabilidad es `NexaResponse.modelId` (persistido en `nexa_messages`, provider derivable vía `resolveNexaProviderKey`) — el modelId refleja el provider que **resolvió** el turno (post-failover).

**Spec canónica**: `docs/tasks/in-progress/TASK-1091-nexa-provider-abstraction-anthropic-adapter.md` + `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` Delta 2026-06-12. Patrón fuente: TASK-1085 (tool + Answer Rules provider-agnósticos), TASK-1019 (cliente Anthropic canónico), ISSUE-092 (fragilidad del tool-shape de Gemini → justifica failover).

### Nexa governed action runtime invariants (TASK-1137, desde 2026-06-15)

Nexa pasa de advisory a **acción gobernada** — el rung `execute_requires_confirmation` del Action Maturity Ladder (`GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`). El loop canónico es **propose → confirm → execute** y el LLM **NUNCA** ejecuta un write. Módulo: `src/lib/nexa/actions/` (registry + resolver + pilot + confirm + events-store; tipos client-safe). Detrás de `NEXA_ACTION_RUNTIME_ENABLED` (default OFF) → cero cambio de runtime al merge.

- **El LLM solo PROPONE una `actionKey` registrada** vía el tool `propose_action` (read-only) — NUNCA un endpoint, URL ni SQL. La seguridad vive en el **registry + resolver determinístico** (`resolveNexaActionProposal`), NO en el schema del tool. Key desconocida / deshabilitada / sin permiso → **gap honesto** (deep-link/CTA), NUNCA un endpoint inventado. El proposal viaja en `NexaResponse.actionProposals` (contrato `nexa-action-proposal.v1`, `src/lib/nexa/actions/types.ts`); el proposal **NO es un write**.
- **La ejecución es el ÚNICO punto que muta**: `POST /api/nexa/actions/[actionKey]/confirm` (user-session, capability `nexa.action.execute`) **re-valida** al ejecutar y corre el command bound vía `executeApiPlatformCommand` (foundation TASK-655, `principalKind='app_user'`, `idempotencyKeyOverride`). El LLM **NUNCA** llama este endpoint; solo el humano que confirma. La key de idempotencia es server-generada y bound al proposal (re-confirm = replay).

**⚠️ Reglas duras**:

- **NUNCA** dejar que el LLM ejecute un write directo ni que el `propose_action.execute` mute. Proponer es read-only; ejecutar requiere confirmación humana + el endpoint determinístico.
- **NUNCA** mapear un intent a un endpoint desde texto libre. El binding `actionKey → command` vive en el registry (`src/lib/nexa/actions/registry.ts`); agregar una acción = code change revisado por humano, NUNCA inferido. Si no hay command canónico → gap/deep-link.
- **NUNCA** pilotar la primera acción en finance/payroll/legal/security/HR/commercial/client-portal (constraint del ADR). Piloto V1: `mark_notifications_read` (self-scoped, idempotente, dominio neutral). El `userId` viene SIEMPRE de la sesión (anti-oracle).
- **NUNCA** seedear la capability `nexa.action.execute` sin grant en `runtime.ts` mismo PR (invariante TASK-873/935) + seed en `capabilities_registry` (migración). Grant: internal ∪ EFEONCE_ADMIN (audiencia del piloto; client excluido).
- **NUNCA** `Sentry.captureException` directo ni `error.message` crudo al cliente — `captureWithDomain('home', …)` + `canonicalErrorResponse` es-CL (`nexa_action_*`).
- **NUNCA** registrar un archivo nuevo bajo `src/lib/nexa/actions/**` sin agregarlo al dominio `governed-actions` del `manifest.json` (el `nexa:doc-gate` falla).
- **SIEMPRE** que emerja una acción nueva: definirla en el registry (isEnabled/isPermitted/buildPreview read-only/execute bound) + extender el ledger/señales si aplica + actualizar `behavior/behavior-and-routing.md` + `technical/data-contracts.md`.

**Observabilidad**: ledger append-only `greenhouse_ai.nexa_action_events` (proposed/proposal_denied/executed/failed/execution_denied/conflict/cancelled) + 2 reliability signals (módulo Home, steady=0): `nexa.action.failure_rate` + `nexa.action.unauthorized_proposal_rate` (**SECURITY** — detecta al LLM inducido a proponer acciones prohibidas/inexistentes).

**Spec canónica**: `docs/tasks/in-progress/TASK-1137-nexa-governed-action-runtime-command-bridge.md` + arch Delta 2026-06-15 en `GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md` + capas `nexa-intelligence/behavior/behavior-and-routing.md` + `technical/data-contracts.md`. Migración: `20260615193917012`. Patrón fuente: TASK-655 (command/idempotency foundation), TASK-1085 (tool surface provider-agnóstico), TASK-873/935 (capability grant coverage), TASK-1129 (ledger de observabilidad best-effort).

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

### Workforce Exit Payroll Eligibility invariants (TASK-890, desde 2026-05-15)

Toda decision "este miembro esta en scope payroll en este periodo" pasa por el **resolver canonico server-only** `src/lib/payroll/exit-eligibility/`. Reemplaza el patron actual donde el reader payroll embebia el gate inline (`NOT EXISTS offboarding_cases WHERE status='executed' AND last_working_day < periodStart`), ignorando casos `external_payroll` (Deel/EOR) que cierran via proveedor externo sin transicionar a `executed`.

Bug class disparador: caso `EO-OFF-2026-0609A520` Maria Camila Hoyos, lane `external_payroll`/Deel `last_working_day=2026-05-14` status `draft`. Nomina proyectada mostraba full-month USD 530 para mayo 2026 porque external_payroll cierra fuera del state machine interno.

**Read API canonico** (`src/lib/payroll/exit-eligibility/index.ts`):

- `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd) → Map<memberId, WorkforceExitPayrollEligibilityWindow>` — bulk-first. Devuelve `projectionPolicy` (`full_period | partial_until_cutoff | exclude_from_cutoff | exclude_entire_period`) + `eligibleFrom/eligibleTo` + `cutoffDate` + `warnings[]`.
- `isMemberInPayrollScope(memberId, asOf) → boolean` — thin predicate wrapper para capability gates, drawer state, checks single-member.

**Matriz canonica per lane** (§2 ADR):

| `rule_lane` (DB) | Threshold de exclusion | Policy con cutoff en periodo |
|---|---|---|
| `internal_payroll` / `relationship_transition` | `status = 'executed'` | `partial_until_cutoff` (prorratear hasta LWD) |
| `external_payroll` / `non_payroll` | `status IN ('approved','scheduled','executed')` | `exclude_from_cutoff` (Greenhouse no paga internal) |
| `identity_only` | N/A — siempre `full_period` | Identity ortogonal a payroll |
| `unknown` | conservador — `full_period` + warning `unclassified_lane` | — |

**Rationale asymmetric threshold**: internal_payroll requiere `executed` porque Greenhouse paga finiquito Chile que debe estar emitido + ratificado (TASK-862/863). External_payroll/Deel nunca paga Greenhouse; `approved` es momento canonico de decision firmada. Esperar `executed` para evento que vive afuera del runtime Greenhouse es deuda operativa permanente.

**Cutoff canonico**: `COALESCE(last_working_day, effective_date)`. Schema CHECK constraints (TASK-760) garantizan `effective_date NOT NULL` en `approved+` y `last_working_day NOT NULL` en `scheduled+`. NUNCA usar `last_working_day` solo — entre `approved` y `scheduled` puede ser NULL.

**Feature flag canonico** `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (default `false` V1.0):

- `false` (default): `pgGetApplicableCompensationVersionsForPeriod` mantiene gate legacy bit-for-bit (solo excluye `executed` AND `last_working_day < periodStart`). Zero-risk parity.
- `true` (post staging shadow compare ≥7d con Maria-fixture verde): post-filter via resolver + attach `exitEligibilityWindow?: WorkforceExitPayrollEligibilityWindow` opcional al row para que consumers downstream (`project-payroll.ts`) puedan prorratear.

Pattern fuente: `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872).

**Degraded mode honesto**: si `resolveExitEligibilityForMembers` falla (DB transient, schema drift), `captureWithDomain('payroll', err, { source: 'exit_eligibility.integration_degraded' })` + fallback a legacy SQL path. Payroll nunca rompe full. Reliability signal `payroll.exit_eligibility.bq_fallback_invoked` cubre detection en V1.1.

**Lint rule canonica** `greenhouse/no-inline-payroll-scope-gate` (modo `warn` V1.0, promueve a `error` post 30d steady): detecta SQL embebido con `NOT EXISTS ... work_relationship_offboarding_cases ... status='executed' AND last_working_day` o variantes EXISTS positive. Override block exime: `src/lib/payroll/exit-eligibility/**`, `src/lib/payroll/postgres-store.ts` (gate legacy behind flag — grandfathered), tests del rule.

**⚠️ Reglas duras**:

- **NUNCA** filtrar inclusion payroll inline en un SQL embebido en TS. Toda decision pasa por `resolveExitEligibilityForMembers` o `isMemberInPayrollScope`. Lint rule bloquea regresion.
- **NUNCA** distinguir entre `rule_lane` valores con strings literales en consumers. Usar enum `ExitLane` del resolver (DB-aligned 1:1) o consumer reads `projectionPolicy` directly.
- **NUNCA** mezclar el gate de intake (`workforce_intake_status` TASK-872) con el gate de exit (`exitLane × status`). Son ortogonales by design — features distintos.
- **NUNCA** modificar el threshold por lane sin actualizar AMBOS: matriz §2 ADR + tests anti-regresion + lint rule + reliability signal evidence.
- **NUNCA** ejecutar payroll real (no proyectada) sin que el mismo resolver filtre las compensation versions aplicables. Single source of truth across projected + actual.
- **NUNCA** auto-mutar Person 360 desde read path. Solo signal en V1 (Slice 6). Write reconciliation = command auditado V1.1+.
- **NUNCA** usar `last_working_day` solo como cutoff. Toda decision usa `COALESCE(last_working_day, effective_date)`. Schema CHECK invariants TASK-760 garantizan que `effective_date` esta poblado en `approved+`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'payroll' | 'hr' | 'identity', { tags: { source: 'exit_eligibility_*' } })`.
- **NUNCA** modificar el shape de `WorkforceExitPayrollEligibilityWindow` sin actualizar consumers en el mismo PR. Tipo es contractual cross-module.
- **NUNCA** activar `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en production sin: (a) staging shadow compare verde >=7d; (b) Maria-like fixture green; (c) signal `payroll.exit_window.full_month_projection_drift` count=0 sustained.
- **NUNCA** un consumer payroll que necesite saber "este miembro esta en scope" recomputa el gate inline. Opciones canonicas en orden de preferencia:
  1. Lee `exitEligibilityWindow` del row mapped que devuelve `pgGetApplicableCompensationVersionsForPeriod` (auto-attached cuando flag activo).
  2. Llama `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd)` directamente (bulk).
  3. Llama `isMemberInPayrollScope(memberId, asOf)` para single-member checks (capability gates, drawer state).
- **SIEMPRE** que emerja un `rule_lane` nuevo en schema (e.g. `eor_provider`, `intercompany_loan`), extender §2 tabla ADR + `ExitLane` type + matriz `derivePolicy` + tests + lint rule en el mismo PR.
- **SIEMPRE** que un consumer nuevo necesite "members en scope laboral interno" (capacity, staffing, cost attribution), llamar al resolver. Cero composicion ad-hoc.
- **SIEMPRE** que BQ fallback path se invoque (cuando emerja replicacion en BQ V1.1+), emitir `captureWithDomain('payroll', warn, { source: 'bq_fallback_no_exit_gate' })`.

**Spec canonica**: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`. Task: `docs/tasks/in-progress/TASK-890-workforce-exit-payroll-eligibility-window.md`. Patrones fuente: TASK-571/766/774 (VIEW canonica + helper + signal + lint), TASK-742 (defense-in-depth), TASK-872 (feature flag gate), TASK-720 (TS-only declarative reader), TASK-672 (rich struct + thin predicate).

### Payroll Participation Window invariants (TASK-893, desde 2026-05-16)

Toda decision "esta persona participa en este periodo y por cuanto" pasa por el **resolver canonico server-only** `src/lib/payroll/participation-window/`. Compone TASK-890 (exit eligibility) + compensation effective dating + observe-only onboarding source. Reemplaza el patron legacy donde `prorateEntry` rescala monetary fields post-hoc (rompe `chileGratificacionLegalAmount` cap, `chileTotalDeductions` aggregate, `siiRetentionAmount` traceability).

**Pattern canonico (BL-1)**: escalar la compensation **antes** de `buildPayrollEntry`, NUNCA rescale post-hoc del output. La canonical calculator recomputa deducciones, gratificacion legal cap, y retencion SII desde las bases prorrateadas.

**Read API canonico** (`src/lib/payroll/participation-window/`):

- `resolvePayrollParticipationWindowsForMembers(memberIds, periodStart, periodEnd) → Map<memberId, PayrollParticipationWindow>` — canonical bulk resolver.
- `isMemberParticipatingInPayroll(memberId, asOf) → boolean` — thin predicate para capability checks.
- `prorateCompensationForParticipationWindow<T>(compensation, factor) → T` — pure helper que escala los inputs canonicos pre-buildPayrollEntry. Generic over T. Idempotente.
- `derivePayrollParticipationPolicy(facts) → PayrollParticipationWindow` — pure function que computa policy + reason codes + prorationFactor weekday-basis.
- `isPayrollParticipationWindowEnabled() → boolean` — flag check (`PAYROLL_PARTICIPATION_WINDOW_ENABLED`, default `false`).

**Flag dependency canonical**: `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` REQUIERE `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. Sin esa pre-condicion, el resolver emite warning `exit_resolver_disabled` por miembro afectado (partial correctness es el peor failure mode). Enforce code-side en `resolver.ts` invocando `isPayrollExitEligibilityWindowEnabled()` explicito.

**4 reliability signals canonicos** bajo subsystem `Finance Data Quality` (moduleKey='finance', mirror TASK-765/766/768/774):

- `payroll.participation_window.full_month_entry_drift` — kind=drift, severity=warning >0, steady=0 post flag-ON. Detecta mid-period entries no prorrateados.
- `payroll.participation_window.source_date_disagreement` — kind=drift, severity=warning >0, steady=0 post-cleanup. Detecta drift compensation.effective_from vs onboarding.start_date > 7 dias.
- `payroll.participation_window.projection_delta_anomaly` — kind=drift, severity=unknown V1.0 (honest degradation; shadow compare wiring es V1.1 follow-up).
- Bonus: lint rule `greenhouse/no-inline-payroll-scope-gate` (TASK-890 herencia) sigue cubriendo el path roster.

**⚠️ Reglas duras**:

- **NUNCA** rescale monetary fields post-`buildPayrollEntry` para members con participation factor < 1. Pattern canonical: escalar compensation primero, dejar al calculator recomputar deducciones + gratificacion legal cap + retencion SII desde gross prorrateado. El helper `prorateCompensationForParticipationWindow` es la unica fuente de truth para ese scale.
- **NUNCA** prorratear `colacionAmount` ni `movilizacionAmount` automaticamente en el path de participation. Son asignaciones no imponibles fijas; la decision es contractual del operador HR (jurisprudencia chilena Art 50 CT no las auto-prorratea).
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'`.
- **NUNCA** activar `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` sin (a) `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en mismo env, (b) staging shadow compare >=7d verde, (c) HR/Finance written approval en `Handoff.md`, (d) allowlist explicita de members afectados.
- **NUNCA** activar el flag productivo sin haber shippeado la capability `payroll.period.force_recompute` (V1.1 reclassified to pre-flag-ON gate por finance auditor 2026-05-16). Sin esa capability, BL-5 deja al operador stuck cuando necesite recompute en periodo exportado pre-flag-flip.
- **NUNCA** recomputar single-member entry bajo flag ON via `recalculatePayrollEntry`. El path esta blocked con canonical error `recalc_blocked_by_participation_window` para evitar bypass del participation factor. Usar period-level `calculatePayroll` que respeta participation correctamente.
- **NUNCA** recomputar periodo `reopened` bajo flag ON sin capability `payroll.period.force_recompute`. Guard canonico `isReopenedRecomputeBlockedByParticipationWindow(status, flagEnabled)` enforce.
- **NUNCA** consumir `payroll_entries.gross_total` ni cualquier campo devengado para base imponible legal del finiquito (Art 159, 161, 50, 67 CT). Source canonical es `compensation_versions.base_salary` nominal full-month (cross-spec invariant lift en `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` Delta 2026-05-16).
- **NUNCA** modificar la cap mensual de gratificacion legal (4.75 × IMM ÷ 12 ≈ $213,354 en 2026) para mes parcial. El cap es MENSUAL, NO se prorratea (jurisprudencia chilena Opcion A canonical, Dictamen DT 2937/050 2002). Si HR decide entry month = $0 gratificacion, debe usar `gratificacionLegalMode='ninguna'` (override manual).
- **NUNCA** modelar los dias previos al ingreso contractual como ausencia. Participation NO es attendance. `days_absent`, `daysOnUnpaidLeave`, readiness de asistencia: ninguno debe inflarse para representar no-participacion.
- **SIEMPRE** que un consumer payroll necesite "el monto del mes para member X", leer `payroll_entries.gross_total` (que viene prorrateado correctamente cuando flag ON). NUNCA recomputar inline desde compensation × dias trabajados.
- **SIEMPRE** que emerja un nuevo path que muta o calcula payroll_entries, verificar que invoque `prorateCompensationForParticipationWindow` ANTES de `buildPayrollEntry` (mirror del pattern en `project-payroll.ts` + `calculate-payroll.ts`). Single-member paths bypass son anti-pattern bajo flag ON — blockear con canonical error.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16. Task: `docs/tasks/complete/TASK-893-payroll-participation-window.md`. Pre-flag-ON gates documentados en ADR seccion "Pre-flag-ON-producción gates". Patrones fuente: TASK-890 (exit eligibility composition), TASK-758 (4 regimenes canonicos), TASK-742 (defense-in-depth 7-layer), TASK-872 (flag gate), TASK-765/766/768/774 (reliability signals canonical pattern + builder).

### Leave Accrual Participation-Aware invariants (TASK-895, desde 2026-05-16)

Toda decision de **accrual de feriado legal CL Art 67 CT** para un colaborador en un year pasa por el **resolver canonico server-only** `src/lib/leave/participation-window/`. El resolver es un **year-scope aggregator** que compone TASK-893 (Payroll Participation Window, month-scope) mes a mes + filtra `rule_lane='internal_payroll'` para excluir periodos contractor/honorarios/external. Cierra bug class regulatorio CL: cuando un colaborador transita `contractor → dependent` mid-year, el helper legacy `calculateAccruedLeaveAllowanceDays` ancla accrual desde `members.hire_date` ignorando el periodo non-dependent — generando sobreacumulación + sobrepago al finiquito + precedente contractual riesgoso.

**Read API canonico** (`src/lib/leave/participation-window/`):

- `resolveLeaveAccrualWindowsForMembers(memberIds, year, options?: { asOfDate?: string }) → Map<memberId, LeaveAccrualEligibilityWindow>` — canonical bulk resolver.
- `resolveLeaveAccrualWindowForMember(memberId, year, options?)` — single-member helper.
- `deriveLeaveAccrualPolicy(facts) → LeaveAccrualEligibilityWindow` — pure function (33 tests verde).
- `fetchCompensationFactsForLeaveAccrual(memberIds, yearStart, yearEnd)` — bulk PG query.
- `isLeaveAccrualParticipationAwareEnabled() → boolean` — flag check con triple flag dependency enforcement.
- `buildDegradedLeaveAccrualWindow(...)` — helper canonical para construir degraded windows desde el resolver wrapper.

**Boundary semantic**:

| Domain | Scope | Owns |
|---|---|---|
| Leave (TASK-895) | Year | `LeaveAccrualEligibilityWindow.eligibleDays` + `firstServiceCycleDays` |
| Payroll Participation (TASK-893) | Month | `PayrollParticipationWindow.prorationFactor` + `exitEligibility` |
| Workforce Exit (TASK-890) | Period (case-driven) | `WorkforceExitPayrollEligibilityWindow.projectionPolicy` + `eligibleTo` |

**Flag dependency canonical (triple enforcement)**: `LEAVE_PARTICIPATION_AWARE_ENABLED=true` REQUIERE `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. El helper `isLeaveAccrualParticipationAwareEnabled()` enforce la dependencia al boundary: retorna `true` solo cuando las 3 flags están ON. Sin esa pre-condición, retorna `false` (legacy bit-for-bit fallback) — degraded honesto.

**Integration canonical en `postgres-leave-store.ts`**: el helper local `tryComputeParticipationAwareAllowanceDays` valida 4 pre-condiciones antes de aplicar la fórmula canonical `roundLeaveDays((annualDays * eligibleDays) / firstServiceCycleDays)`:

1. `isLeaveAccrualParticipationAwareEnabled()` returns true.
2. `policy.accrualType === 'monthly_accrual'`.
3. `member.pay_regime === 'chile'`.
4. Resolver returns `degradedMode === false`.

Si cualquier pre-condición falla → fallback a `calculateAccruedLeaveAllowanceDays` legacy bit-for-bit. Preserva CL legal floor en cada degraded path.

**Reliability signal canonical**: `hr.leave.accrual_overshoot_drift` (kind=`drift`, severity=`warning` si count>0, steady=0 post-flag-ON + re-seed). Subsystem rollup: `'Payroll Data Quality'` (moduleKey `'payroll'`) — unificado con TASK-893 signals. Reader pattern SHAPE detector (NO recompute exacto): identifica miembros con `hire_date` >30 días antes del `MIN(effective_from)` qualifying dependent CL.

**Auditoría canonical**: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/leave/audit-accrual-drift.ts --target-year=<year> [--output=<path>]`. Read-only dry-run que reporta drift exacto por miembro (legacy vs participation-aware). Documentado en `docs/operations/runbooks/leave-accrual-drift-audit.md`.

**⚠️ Reglas duras**:

- **NUNCA** reescribir el helper puro `calculateAccruedLeaveAllowanceDays` en `src/lib/hr-core/leave-domain.ts`. Integration ocurre en el call site (`postgres-leave-store.ts:1078,1102`) behind flag. Preserva 7 tests pure verdes legacy + SRP.
- **NUNCA** extender `PayrollParticipationWindow` con `contractType`/`payRegime` para servir a Leave. Leave hace su propia query independiente a `compensation_versions` + compose TASK-893/890 solo para exit cutoff. DAG-leaf rule.
- **NUNCA** importar `@/lib/leave/participation-window` desde un módulo de Payroll. DAG direction: Leave → Payroll, NUNCA reverse. Anti-corruption layer enforced en barrel.
- **NUNCA** computar accrual inline desde `hire_date` solo cuando `LEAVE_PARTICIPATION_AWARE_ENABLED=true` y `memberId` disponible. El call site debe consumir el resolver canónico via `tryComputeParticipationAwareAllowanceDays`.
- **NUNCA** mutar `leave_balances` automáticamente cuando se activa el flag. Backfill audit script V1.1a es read-only dry-run; mutation auditada queda V1.2 con capability `leave.balances.reconcile`.
- **NUNCA** activar `LEAVE_PARTICIPATION_AWARE_ENABLED=true` sin: (a) las dos flags parent ON en mismo env, (b) staging shadow audit ≥30d con signal count=0, (c) HR + Legal written approval en `Handoff.md` con specific members allowlist, (d) audit script S4 dry-run con review HR documentado.
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'` en cada archivo del modulo.
- **NUNCA** validar SQL queries de signal readers contra `db.d.ts` shapes inferred como ground truth. **Lección canonical** del hotfix Sentry 2026-05-16: schema real PG es source of truth, no TS types. Future readers DEBEN validar contra PG real via proxy (`pnpm pg:connect:shell` + smoke script) ANTES de mergear. Bug class concreto detectado: `compensation_versions.payroll_via` NO existe en PG real (Kysely codegen drift); `payroll_via` vive en `members`. Y `compensation_versions.effective_from` es `date` no `timestamp` (`date - date = integer`, no `interval`).
- **SIEMPRE** que un consumer downstream necesite "días efectivos de dependent CL en este year", llamar al resolver canonico. Cero composicion ad-hoc.
- **SIEMPRE** que emerja un nuevo path que compute accrual de feriado legal, verificar que pase por `tryComputeParticipationAwareAllowanceDays` (mirror del pattern aplicado a `computeBalanceSeedForYear`). Single source of truth canonical.

**Open questions (deliberadamente NO en V1.1a)**:

- Honorarios + feriado proporcional opcional: hoy NO. Solo `dependent` (`indefinido`/`plazo_fijo`).
- Saldos negativos por vacaciones tomadas pre-transición contractor→dependent: V1.2 write-path reconciliation con capability `leave.balances.reconcile`.
- Tracking historical de `members.payroll_via` (cambios mid-year): V1.2 si emerge necesidad concreta.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16 §"TASK-895 V1.1a S0". Task: `docs/tasks/complete/TASK-895-leave-accrual-participation-aware.md`. Runbook: `docs/operations/runbooks/leave-accrual-drift-audit.md`. Patrones fuente: TASK-893 (month-scope primitive composer), TASK-890 (exit lanes), TASK-742 (defense-in-depth flag dependency).

### Person 360 Relationship Reconciliation invariants (TASK-891, desde 2026-05-15)

Toda mutación de relaciones legales (`greenhouse_core.person_legal_entity_relationships`) que cierre una relación activa y abra una nueva en su lugar — el caso disparador es drift `member.contract_type='contractor' / payroll_via='deel'` con relación activa `'employee'` — **debe** pasar por el helper canónico `reconcileMemberContractDrift` (`src/lib/person-legal-entity-relationships/reconcile-drift.ts`). NUNCA SQL inline en consumers; NUNCA auto-mutar desde cron / read path.

**Read API canónico**:

- Helper canónico: `reconcileMemberContractDrift(input)` en `src/lib/person-legal-entity-relationships/reconcile-drift.ts`. Composes `endPersonLegalEntityRelationship` (TASK-337) + `createContractorLegalEntityRelationship` (TASK-337) envueltos en `withGreenhousePostgresTransaction` atomic. REUSE > CREATE.
- Error class: `PersonRelationshipReconciliationError` con 8 codes canónicos (`reason_too_short`, `member_not_found`, `member_inactive`, `member_missing_identity_profile`, `no_active_employee_relationship`, `multiple_active_employee_relationships`, `invalid_contractor_subtype`, `invalid_external_close_date`). Es-CL safe para exponer en API boundary.
- Route handler: `POST /api/admin/person/relationships/[memberId]/reconcile-drift`.
- UI form: `/admin/identity/drift-reconciliation?memberId=<id>`. Reachable vía deep link desde signal alert.

**Defense in depth dual-gate**:

- DB: capability seed en `greenhouse_core.capabilities_registry` (migration `20260515150631235_task-891-...`).
- App: `requireAdminTenantContext` (route_group=admin + role=EFEONCE_ADMIN) + `can(subject, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')`.
- TS catalog: `src/config/entitlements-catalog.ts` con `module='people'` (alineado con TASK-784 `person.legal_profile.*`).
- Runtime grant: `src/lib/entitlements/runtime.ts`. V1.0 grant **SOLO EFEONCE_ADMIN** (drift Person 360 cross-domain). Delegación a HR queda V1.1+.

**Auto-escalation severity** del signal `identity.relationship.member_contract_drift`:

- `count = 0` → `ok`
- `count > 0 AND oldestDriftAgeDays < 30` → `warning` (reciente)
- `count > 0 AND oldestDriftAgeDays >= 30` → `error` (sostenido, write path disponible)
- `query falla` → `unknown`

Threshold `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30` (mismo bar TASK-848/849 production release stale_approval).

**Outbox events**: NO crear `.reconciled` v1 nuevo. Reusar `.deactivated` + `.created` existentes con `metadata_json.reconciliationContext = { commandId: 'reconcile-member-contract-drift', supersededRelationshipId, supersededRelationshipType, reason, actorUserId, reconciledAt, externalCloseDate, contractorSubtype }` en la new row. Correlation forensic via `actor_user_id` idéntico + `created_at` mismo segundo + metadata.

**Notes marker append-only** (forensic readable):

- Legacy row (status='ended'): `[TASK-891 reconciled by actor=USER_ID on YYYY-MM-DD — superseded by new contractor relationship] <reason>`
- New row (status='active'): `Reconciled from employee via TASK-891 (actor=USER_ID, YYYY-MM-DD) — reason: <reason>`

**Reason length**: `>= 20 chars` (bar más alto que TASK-890 close_external_provider `>= 10` porque blast Person 360 es cross-domain — payroll readiness, payslips, reportes legales, ICO). Pattern fuente TASK-848 production release bypass.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `DELETE FROM person_legal_entity_relationships`. Solo supersede via `effective_to + status='ended'`. Append-only audit.
- **NUNCA** escribir SQL inline en consumers que muten `person_legal_entity_relationships`. Toda mutación pasa por helpers canónicos del módulo (`endPersonLegalEntityRelationship`, `createContractorLegalEntityRelationship`, `reconcileMemberContractDrift`).
- **NUNCA** auto-mutar Person 360 desde un read path / cron / cleanup automático. V1.0 es operator-initiated single-member. V2 (cron) requiere ADR nuevo + HR approval explícito.
- **NUNCA** fabricar `relationship_type` fuera del enum del schema (`shareholder`, `founder`, `legal_representative`, `board_member`, `executive`, `employee`, `contractor`, `shareholder_current_account_holder`, `lender_to_entity`, `borrower_from_entity`). TASK-891 V1.0 solo soporta target `contractor` con subtype en `metadata_json.relationshipSubtype`.
- **NUNCA** mutar a María Camila Hoyos como parte de TASK-891. Recovery espera staging synthetic fixture verde + HR approval explícito + ejecución vía dialog UI con reason ≥20 chars.
- **NUNCA** emitir el evento `.reconciled` (no existe en V1.0). Reusar `.deactivated` + `.created` + metadata correlation.
- **NUNCA** grant `person.legal_entity_relationships.reconcile_drift` a HR ni FINANCE_ADMIN en V1.0. Solo EFEONCE_ADMIN. Delegación = decisión V1.1.
- **NUNCA** exponer `error.message` raw desde el route handler. Sanitiza via canonical error response con `code + actionable + evidence` + `captureWithDomain('identity', err, ...)`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'person_relationship_reconcile_drift' } })`.
- **SIEMPRE** envolver UPDATE legacy + INSERT new + outbox publish en `withGreenhousePostgresTransaction`. Si cualquier paso falla, rollback completo.
- **SIEMPRE** validar `reason.trim().length >= 20` en client UI (button disabled) + server (canonical error). Defense in depth.
- **SIEMPRE** persistir `metadata_json.reconciliationContext` en la new row para correlation forensic.
- **SIEMPRE** append marker forensic a `notes` de ambas rows (legacy + new) con shape `[TASK-891 reconciled by actor=X on Y]`.
- **SIEMPRE** que un consumer downstream necesite reaccionar a reconciliación, correlar via `actor_user_id + created_at` o leer `metadata_json.reconciliationContext` de la new row. Si emerge necesidad real de meta-evento, V1.1 considera `.reconciled v1`.
- **SIEMPRE** auto-escalation severity respecta `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30`. Si emerge necesidad de ajustar el threshold, hacerlo en `identity-relationship-member-contract-drift.ts` con tests anti-regresion + delta en doc canonical.

**Spec canónica**: `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md`. Task: `docs/tasks/in-progress/TASK-891-person-relationship-drift-reconciliation-write-path.md`. Patrones fuente: TASK-337 (helpers reusados), TASK-877 (signal-then-command), TASK-890 (predecesor del signal), TASK-742 (defense-in-depth), TASK-839/TASK-873 (capability triple-layer canonical), TASK-848 (reason >=20 bar), TASK-672 (rich struct + thin predicate).

### Offboarding Closure Completeness Aggregate invariants (TASK-892, desde 2026-05-15)

Toda surface que renderice el detalle operativo de un offboarding case (work-queue inspector, drawer, future Pulse cards, future organization-workspace "Salida" facet) **debe** consumir el aggregate canonical `closureCompleteness` de `OffboardingWorkQueueItem`. El `primaryAction` se deriva de `pendingSteps[0]` actionable, NUNCA hardcoded por `closureLane` solo.

El bug class observado live 2026-05-15 con María Camila Hoyos: case `executed` con drift Person 360 sin reconciliar mostraba `primaryAction = 'Cerrar con proveedor'` (boton de Layer 1 ya terminal). Tres de las 4 capas alineadas, la cuarta (Person 360) reportaba drift detectado por signal `identity.relationship.member_contract_drift` desde TASK-890, pero la UI ignoraba esa capa y mostraba un CTA obsoleto que el state machine rechazaría con 4xx.

**Aggregate canonical** (`src/lib/workforce/offboarding/work-queue/closure-completeness.ts`):

- 4 layer alignment fields ortogonales: `caseLifecycle` / `memberRuntime` / `personRelationship` / `payrollScope`.
- `closureState`: enum cerrado `'pending' | 'partial' | 'complete' | 'blocked'`.
- `pendingSteps[]`: array ordenado por constant canonical `STEP_PRIORITY = ['case_lifecycle', 'reconcile_drift', 'verify_payroll_exclusion']`.
- Helper canonical `computeClosureCompleteness(facts)` pure function — 100% testable, NO IO.
- `derivePrimaryActionFromCompleteness(completeness, legacyAction)` decide el primaryAction desde primer step actionable.

**⚠️ Reglas duras**:

- **NUNCA** computar `primaryAction` inline en componentes de UI desde `closureLane` solo. Toda derivación pasa por `derivePrimaryActionFromCompleteness` server-side dentro de `buildOffboardingWorkQueueItem`.
- **NUNCA** modificar `STEP_PRIORITY` sin extender paralelamente: (a) `OffboardingClosureStepCode` type union, (b) un `build*Step` builder pure function en `closure-completeness.ts`, (c) test anti-regresión cubriendo el nuevo step en al menos 2 paths (actionable + skip). El orden es contractual — moverlo invalida el bug-class fix y rompe consumers que asumen "primer step actionable = CTA principal".
- **NUNCA** componer la decisión `closureState` en cliente. Server-only por construcción — `closure-completeness.ts` lleva `import 'server-only'` al inicio.
- **NUNCA** filtrar pendingSteps en UI por capability inline. Cada step declara `capability: string | null`; UI esconde steps sin capability via gate runtime (`can(subject, capability, action)`). NO duplicar la matriz `relationship × capability → access` en componentes.
- **NUNCA** crear paths paralelos para "ver el cierre real" (e.g. badge custom en algún card que no consume `closureCompleteness`). Single source of truth.
- **NUNCA** asumir que `personRelationshipDrift === null` significa "no drift". Es `unknown` (member sin profile o lookup downstream falló). `degradedReasons[]` en `OffboardingWorkQueue` reporta cuándo lookups fallan honestamente.
- **NUNCA** mostrar `Cierre parcial` sin explicar las capas pendientes. La seccion UI "Capas pendientes" es obligatoria — sino el operador no sabe qué hacer y reincide en el bug class previo.
- **NUNCA** mutar Maria Camila Hoyos operativamente como parte de TASK-892. Recovery espera ejecución manual via TASK-891 dialog post staging validation. El aggregate solo *visibiliza* el cierre parcial — no auto-resuelve drift Person 360.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del aggregate. Usar `captureWithDomain(err, 'identity', { tags: { source: 'offboarding_closure_completeness', stage: '<...>' } })`.
- **SIEMPRE** que emerja un step nuevo (e.g. `verify_assignment_closure`, `unblock_blocker`, `download_certificate`), agregar al enum + builder pure + STEP_PRIORITY posicion explícita + tests anti-regresión. El builder retorna `null` cuando el step no aplica al case (e.g. case non-terminal para verify_payroll_exclusion).
- **SIEMPRE** que un consumer downstream (Pulse, organization workspace facet "Salida", report PDFs) muestre el estado del cierre, leer `closureCompleteness.closureState` directo — NUNCA recomputar.
- **SIEMPRE** preservar el patrón "informational vs actionable" en pendingSteps. Steps `actionable: false` se renderean como hints/alerts sin CTA. Steps `actionable: true` se renderean como CTAs con href si lo declaran.

**Reusable cross-flow**: el patrón "`pendingSteps[]` decide el primaryAction" se replica para Onboarding work queue (TASK-875), hiring pipeline, workforce activation (TASK-874), contractor closure (TASK-797 futuro), final settlement document lifecycle (TASK-863). Cuando emerja una surface con `primaryAction` derivado de una sola dimensión pero realidad operativa multi-capa, replicar: pure function + STEP_PRIORITY + state machine cerrado + signal de cierre parcial.

**Spec canónica**: `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (Delta 2026-05-15). Task: `docs/tasks/in-progress/TASK-892-offboarding-closure-completeness-aggregate.md`. Reliability signal: `hr.offboarding.completeness_partial` (kind=drift, severity warning >0, steady=0, subsystem Identity & Access). Patrones fuente: TASK-742 (4-pillar checklist), TASK-672 (composer + degraded honest), TASK-880 (decision tree por capability + audience), TASK-873 (capability triple-layer canonical).

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
