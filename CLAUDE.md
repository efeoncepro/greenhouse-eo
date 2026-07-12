# CLAUDE.md

## Project Overview

Greenhouse — plataforma operativa/subproducto de Efeonce Group dentro del modelo ASaaS. Next.js 16 App Router + MUI 7.x + Vuexy starter-kit + TypeScript 5.9. Deploy en Vercel. "EO" es solo abreviatura del repo, no nombre de producto ni copy visible.

## Router de dominios (TASK-1160)

> **`CLAUDE.md` es un ROUTER, no un spec-store.** Lo que se queda inline es cross-cutting (aplica a casi toda task). Los **invariantes operativos por dominio** (`NUNCA`/`SIEMPRE` específicos de un subsistema) viven **load-on-demand** en su spec/companion — esta tabla dice dónde. Al tocar un dominio: cargar su skill **y** su doc de invariantes. Cada dominio también tiene un pointer inline (con sus reglas más peligrosas) más abajo. **Auto-load nativo (Claude):** `.claude/rules/<dominio>.md` (frontmatter `paths:`) carga el pointer al companion automáticamente al tocar `src/lib/<dominio>/**` — no cuentan al budget (cargan solo al tocar el path). **Subagentes:** si un spawn falla por límite de contexto (el Explore built-in hereda ~170k de tool defs MCP), usar el subagente `explore-lite` (`.claude/agents/`, sin MCP). CLI de gobernanza: `pnpm claude-md {inventory\|budget\|audit\|check}` (`check` = budget `--strict` + rule-audit; gate de no-pérdida + anti-re-acreción @35k, workflow `claude-md-governance.yml`). Mapa completo del refactor: `docs/operations/CLAUDE_MD_REFACTOR_MAP_2026-06-16.md`.

| Dominio / disparador | Skill a invocar | Invariantes (cargar al tocar) |
|---|---|---|
| Contractor engagements/payables/honorarios | `greenhouse-finance-accounting-operator` (+payroll) | `architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` |
| Hiring/ATS: documentos de candidato + scan/quarantine de assets | `greenhouse-talent-people-operator` | `architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Candidate document capture) |
| Production release / promoción develop→main | `greenhouse-production-release` | `architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` |
| Finance ledger/bank/CLP/FX/economic-category | `greenhouse-finance-accounting-operator` | `architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` |
| ICO / delivery metrics / RpA / OTD / Notion-metrics | `greenhouse-ico` | `architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` |
| Knowledge platform + Nexa | `greenhouse-nexa-conversational` | `architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` |
| Payroll/Workforce participation/exit/leave/contract-type/approval | `greenhouse-payroll-auditor` | `architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` |
| Payroll receipts + Legal docs/Finiquito | `greenhouse-payroll-auditor` | `architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md` |
| Notion sync / integrations | `notion-platform` | `architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` |
| HubSpot bridge / services intake | `hubspot-greenhouse-bridge` | `architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` |
| Integraciones/infra (signature/observability/postgres-pooling) | — | `architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` |
| Identity/Workforce (legal profile/role-title/SCIM/session-access/bridge-cutover) | — | `architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` |
| Org workspace + Client portal | — | `architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` |
| Client lifecycle / onboarding | — | `architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` |
| UI/feature platforms (home-rollout/nexa-insights/shortcuts/table-density/sample-sprints/account-360) | `greenhouse-ux` + product-design | `architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` |
| UI Platform (Composition Shell/Adaptive Card/Floating Surface/Motion/Elevation/Figma) | `greenhouse-ux` `modern-ui` `state-design` | `architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `architecture/ui-platform/*` |
| Ops/Reliability/Platform (Teams Bot/ops-worker/Vercel cron/reliability/platform-health) | `greenhouse-cron-sync-ops` `teams-bot-platform` | `architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` |
| EPIC-027 / trabajo nuevo durante desacople build-runtime · cualquier decisión de arquitectura (dominio/schema/agentes/frontera) | `arch-architect` (skill canónica de arquitectura; overlay greenhouse-pinned) | `architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` |
| Entitlements governance + capability grants + ROLE_CODES | — | `architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` · `architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` |
| Typography + Efeonce brand | `typography-design` | `architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md` |
| AI image + LLM providers | `greenhouse-ai-image-generator` | `architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` |
| Growth AI Visibility Grader (`src/lib/growth/ai-visibility/**`) | `greenhouse-ai-image-generator` (providers LLM) | `architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (§Delta 2026-06-24) |
| Workforce Contracting Studio | — | `architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` |
| PostgreSQL (conexión/migraciones/SQL readers) | `greenhouse-postgres` | inline (PostgreSQL Access + Migration markers + SQL gate) |
| Backend (API routes/stores/outbox/reactive) | `greenhouse-backend` | inline (Full API Parity + canonical error contract + auth helpers) |
| Secret hygiene / rotación | `greenhouse-secret-hygiene` | inline (Secret Manager Hygiene) |
| Sitio público (landings/posicionamiento/roadmap del sitio) | `efeonce-public-site-wordpress` + `seo-aeo`/`commercial-expert` | `docs/public-site/` (README índice + PRODUCT_ROADMAP + `decisions/` PDR ≠ ADR) |
| Licitaciones / RFP-RFQ (bid/no-bid, ChileCompra) · Tender Deck Composer (`src/lib/commercial/tenders/**`) | `greenhouse-public-private-tenders` (+ `commercial-expert`) | `architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` |
| Content marketing: motor de contenidos (editorial/ops/atomización/distribución/medición, blog/newsletter/ebook/webinar) | `content-marketing-studio` (+ `digital-marketing`/`copywriting`/`seo-aeo`) | inline (studio de ejecución; `digital-marketing` módulo 02 le hace hand-off) |
| Legal: privacidad de datos (CL/CO/MX/PE/EEUU) · contratos (MSA/SOW/NDA) · IP y derechos de uso · publicidad/consumidor — **NO laboral** | `legal-privacy-ip-operator` (+ `payroll-auditor` para laboral) | inline (orientador, NO asesoría legal; privacidad web-verificada as-of 2026-07) |
| Research + Benchmark (market/competitive/VoC · benchmark/AI SoV · CI · para Efeonce y clientes) | `research-benchmark-operator` (+ `deep-research` harness, `seo-aeo`, `commercial-expert`) | inline (2 carriles; método+rigor, ejecución→deep-research; evidencia con as-of, NO memoria) |
| Go-to-Market (segmento/ICP · positioning/category · offer/pricing · motion PLG/sales/ecosystem · funnel/bow-tie · launch · GTM economics · para Efeonce y clientes) | `gtm-architect` (orquesta `commercial-expert`/demanda/`research-benchmark`/`gtm-ga4`) | inline (estrategia+orquestación; commercial-expert ejecuta la venta; doctrina ASaaS/bow-tie manda) |

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

### International Internal contract type — invariantes (TASK-894)

Los invariantes del `ContractType` canónico `international_internal` (`payRegime=international` + `payrollVia=internal`; Efeonce SpA = operational payer, NO EOR) viven en **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` → §`International Internal contract type`**. **NO** aplicar AFP/salud/cesantía/SIS/IUSC/retención SII a este perfil; writes requieren capability `payroll.contract.use_international_internal` + `legalReviewReference` ≥10 chars (NUNCA loggear el valor crudo); detectar por `contractType`, no por heurísticas compuestas.

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

Mientras `EPIC-027` esté activo, el desacople físico avanza solo por sus tasks; una feature aislada no crea deployables ni paquetes por anticipado. El producto no se pausa: trabajo nuevo declara `Modular Placement Contract`, nace extraction-ready y respeta `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` + `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.

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
El uso de `project_context.md`, `Handoff.md` y `Handoff.archive.md` se rige por `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.

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
- Declarar `UI ready: no|yes|n/a`; usar `no` por defecto para UI y `yes` solo cuando mapping, GVC scenario plan y design decision log estan completos y `pnpm task:lint --task TASK-###` queda sin findings.
- Si `UI impact != none`, agregar `## UI/UX Contract` desde `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- Si `UI impact != none`, declarar `Wireframe: docs/ui/wireframes/TASK-###-short-slug.md` apuntando a un archivo existente.
- Si `UI impact: flow` o la UI coordina sidecar/drawer/modal/popover/navegacion, declarar `Flow: docs/ui/flows/TASK-###-short-slug-flow.md` apuntando a un archivo existente.
- Si `UI impact: motion` o hay motion/microinteracciones no triviales, declarar `Motion: docs/ui/motion/TASK-###-short-slug-motion.md` apuntando a un archivo existente.
- Si `Backend impact != none`, agregar `## Backend/Data Contract` desde `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- Si una capacidad combina backend/data y UI visible, preferir dos tasks secuenciadas por `Execution profile`: primero `backend-data` para schema/API/reader/command/migration/sync/contrato de datos, despues `ui-ux` para ruta visible, layout, interaccion, copy y GVC. Mantener una task vertical hibrida solo si es pequena, reversible, sin migracion/schema riesgoso y declara `## Hybrid Execution Justification` + orden interno de ejecucion. Fuente canonica: `docs/tasks/TASK_PROCESS.md` (`Hybrid Execution Profile Discipline`).
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
- **UI Platform — contratos canónicos (load-on-demand):** los ~13 contratos de UI Platform (Primitive+Variants+Kinds, Figma Implementation Contract, Adaptive Sidecar, **Composition Shell**, **Adaptive Card density / The Seam**, contención de scroll horizontal, Floating Surface, Motion Primitive, Elevation/Shadow tokens, GVC V1.5) viven en **`docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`** + `docs/architecture/ui-platform/{PRIMITIVES,PATTERNS,STATE,MOTION,...}.md`. **Cargar ese doc + las skills de product-design al hacer CUALQUIER trabajo de UI.** Reglas cross-cutting que se quedan inline:
  - **Hook obligatorio de diseño UI (ANY UI work):** ANTES de escribir JSX nuevo, invocar las skills de product design que apliquen (`greenhouse-ux`, `modern-ui`, `state-design`, `forms-ux`, `greenhouse-ux-writing`, `typography-design`) y **crear o registrar el wireframe** en `docs/ui/wireframes/` cuando la UI sea nueva, visible, reutilizable, client/public/executive-facing, tenga estados/copy relevante, charts/reportes/PDF/email, o venga de un asset Product Design. Si la UI abre sidecar/drawer/modal/popover o conecta pantallas/rutas, crear `docs/ui/flows/` y declarar `Flow`; si introduce motion/microinteracciones no triviales, crear `docs/ui/motion/` y declarar `Motion`. La task debe quedar `UI ready: no` hasta tener implementation mapping, GVC scenario plan y design decision log en task/wireframe; `UI ready: yes` solo si `pnpm task:lint --task TASK-###` queda sin findings. `pnpm task:lint --changed`, `pnpm ui:wireframe-check --task TASK-###`, `pnpm ui:flow-check --task TASK-###`, `pnpm ui:motion-check --task TASK-###` y `pnpm ui:readiness-check --task TASK-###` validan los contratos. Usar `docs/ui/wireframes/WIREFRAME_TEMPLATE.md`, `docs/ui/flows/FLOW_TEMPLATE.md` y `docs/ui/motion/MOTION_TEMPLATE.md`. DESPUÉS **verificar con GVC en loop** (`pnpm fe:capture`, leer el frame, ajustar, re-capturar hasta enterprise). **NUNCA** pintar UI freehand ni declarar "listo" sin contratos requeridos + captura GVC mirada (desktop+mobile).
  - **Figma Implementation Contract:** Figma = intención, no valores. **NUNCA** transcribir HEX/px/fontFamily/ms crudos — mapear a `theme.palette.*`/`theme.axis.*` + variantes tipográficas + spacing scale `4n` + motion tokens. **SIEMPRE** lookup de primitive existente (Greenhouse primitive → wrapper Vuexy `Custom*` → MUI base) ANTES de construir; nacimiento de primitive nueva = protocolo Primitive+Variants+Kinds completo.
  - **Composition Shell = base por defecto de toda interfaz nueva** (declarar composición + regiones, NO inventar grids/morph ad-hoc). **Todo card/elemento nuevo nace adaptable a su ancho (`density=auto`) + rich-ready** (Adaptive Card / The Seam). **NUNCA** inventar un sistema de regiones/morph paralelo.
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
- **Type check:** `pnpm typecheck` (hornea `--max-old-space-size=8192`; **usar este, NO `npx tsc --noEmit` crudo** — el bare tsc hace OOM bajo el Node 20 al que Volta ata `pnpm`. ISSUE-104)
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

**La base es Full API Parity; Nexa total operability es su consecuencia y North Star (directiva CEO 2026-06-19).** El requisito duro es que **toda UI nueva y toda capability/entitlement nuevo nazca con su contrato programático gobernado** a nivel de capability (un primitive canónico, muchos consumers). De ahí se sigue automáticamente que **Nexa Agent pueda operar ABSOLUTAMENTE TODO el portal desde la Conversational Experience** — no se construye nada "Nexa-específico"; si el contrato existe (parity), Nexa y los demás consumers lo operan por construcción (reads directos; writes vía el loop de acción gobernada `propose → confirm → execute`, el LLM nunca escribe directo, muta sólo en el endpoint de confirmación humana). La pregunta de diseño obligatoria: **"¿esta capability tiene contrato gobernado a nivel capability?"** Si no, la feature **no está completa** (y por lo tanto Nexa tampoco podría operarla).

**Implicaciones duras:**

- **NUNCA** entregar una UI o una capability nueva sin su contrato programático gobernado equivalente: viola la base (Full API Parity) y, como consecuencia, rompe la operabilidad total de Nexa. UI y Nexa son dos clientes del MISMO primitive canónico, no dos implementaciones.
- **SIEMPRE** verificar parity a nivel capability (contrato gobernado reutilizable por todos los consumers); la operabilidad de Nexa se valida como consecuencia, no como integración aparte. Runtime de acción gobernada: **`docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`** + `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`.
- **NUNCA** implementar una accion de negocio solo dentro de un componente UI si puede afectar estado, permisos, datos, aprobaciones, exports, recoveries, reportes o configuracion. Extraer primero la primitive canonica en `src/lib/**`.
- **NUNCA** crear endpoints que sean simples "click handlers remotos" acoplados al componente visible. Modelar el aggregate/recurso/command y su contrato estable.
- **SIEMPRE** que una feature nueva agregue una accion visible, declarar el camino programatico esperado: Product API interna, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook, o task follow-up si se difiere.
- **SIEMPRE** que el write pueda reintentarse o venga de integracion/agente, aplicar command semantics explicita, authorization tenant-safe, audit/outbox cuando aplique, idempotencia, errores sanitizados y observabilidad.
- **SIEMPRE** que la UI consuma una operacion, preferir reuse de readers/commands canonicos antes de crear logica paralela para la pantalla.

**Fuente canonica:** `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` + decision "Full API parity" en `docs/architecture/DECISIONS_INDEX.md`.

### Session access derivation — lifecycle predicate (TASK-987 / ISSUE-083)

Toda derivación de acceso de sesión desde `user_role_assignments` (route_groups, role_codes, proyecciones) DEBE aplicar el mismo predicado de ciclo de vida `ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)` — un rol revocado/expirado NUNCA confiere acceso. Detalle en **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` → §`Session access lifecycle`**. **NUNCA** derivar un campo de acceso sin el predicado idéntico al de `role_codes` (los agregados se mueven juntos); **NUNCA** parchear un caso individual de over-exposure (corregir la derivación canónica + detector de drift).

### Approval Authority Delegation — invariantes (TASK-1020)

El `operational_responsibilities.responsibility_type=approval_delegate` genérico NO confiere autoridad de aprobación ni scope de supervisor. Detalle (flag per-stage `honorGenericApprovalDelegate`, recovery auditado) en **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` → §`Approval Authority Delegation`**. **NUNCA** un delegate genérico cambia el `effective_approver_member_id` de un stage con `honorGenericApprovalDelegate=false` (default); **NUNCA** resolver over-exposure de aprobación dando HR/admin broad; **NUNCA** crear una delegación genérica nueva vía API/UI (guardrail 422).

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

**Feature Flag State Ledger (anti deuda cognitiva):** los env-var flags (`*_ENABLED`) que quedan code-complete pero pendientes de prender, y el estado por environment de los ~60 flags activos, se registran en **`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`** (SSOT humano del estado; la verdad live es `vercel env ls`). **SIEMPRE** que declares un flag nuevo, agregá su fila al inventario; si lo dejás code-complete sin prender, agregá una fila a "§ Pendientes de acción"; al prenderlo/apagarlo, actualizá el snapshot. Es distinto de los flags PG declarativos (`home_rollout_flags`, `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md`). **Gate mecánico de cierre:** `pnpm docs:closure-check` corre `feature-flags-audit --strict` y **falla (exit 1) si hay un `*_ENABLED` en código sin fila en el ledger** — ningún cierre pasa con un flag sin registrar. Pasada manual: `pnpm flags:audit` (advisory) / `pnpm flags:audit --strict --no-vercel`.

**⚠️ Prender un flag es MULTI-RUNTIME, no "prenderlo en Vercel".** Hay **5 runtimes con env vars independientes** (Vercel + 4 Cloud Run). **NUNCA** prendas/apagues un flag sin mapear antes dónde se LEE (`grep -rn "<FLAG>" src/ services/`) y aplicarlo en **todos**; lo **async** (email, projection reactiva, consumer del outbox, cron) vive en el **`ops-worker`, NO en Vercel**. **En Cloud Run el SoT es `services/<worker>/deploy.sh`**: declarar el flag ahí (los `deploy.sh` usan `--set-env-vars` **destructivo**, que borra toda var agregada out-of-band) **y además** aplicarlo en vivo con `gcloud run services update … --update-env-vars` para efecto inmediato. Hacer sólo lo segundo = el flag desaparece en el próximo deploy, **en silencio**. **SIEMPRE** verificar en la **revisión activa** + ejercitar el flujo real, y declarar el runtime en la fila del ledger. Runbook: `FEATURE_FLAG_STATE_LEDGER.md`.

**Caso fuente 2026-07-09/10:** `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` se lee **sólo** en el `ops-worker`; prenderlo en Vercel habría dejado el email muerto. Y prenderlo sólo con `--update-env-vars` (revisión `00470`) duró hasta que la `00473` lo borró: el consumer reactivo registró `skip: flag OFF` y el email nunca salió, mientras la success card del form le prometía el email al usuario. El ledger decía ON; la realidad era OFF.

**Caso fuente 2026-06-01:** Workforce Activation/SCIM tenia codigo TASK-872/874/876, pero sin `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true`, `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`, redeploy de Vercel y backfill de usuarios ya creados, Entra seguia creando solo `client_users` y no `members`. La pantalla prometia activacion laboral, pero Maggie Borralles no aparecia hasta completar rollout + recovery.

### Documentation Closure Gate

Despues de cualquier implementacion, incidente, rollout, cambio de arquitectura/workflow o skill local, invocar `greenhouse-documentation-governor` antes de declarar el trabajo completo y usar `pnpm docs:closure-check` como primera pasada mecanica. La skill decide y ejecuta la sincronizacion documental proporcional: arquitectura/ADR, `DECISIONS_INDEX`, changelog, `Handoff.md`, task lifecycle, `AGENTS.md`, `CLAUDE.md`, `project_context.md`, docs funcionales, manuales, auditorias y relacionados. Paths canonicos: `.codex/skills/greenhouse-documentation-governor/SKILL.md` y `.claude/skills/greenhouse-documentation-governor/SKILL.md`.

Regla corta: si los docs, rollout, lifecycle y evidencia no quedaron sincronizados, el estado correcto es `code complete, rollout pendiente` u `operativamente bloqueado`, no `complete`.

### QA Release Auditor Gate

Antes de cerrar implementaciones no triviales, incidentes, rollouts, cambios UI/schema/integracion/tooling/skills o cualquier trabajo donde "tests verdes" no pruebe runtime real, invocar `greenhouse-qa-release-auditor` y usar `pnpm qa:gates --changed` como primera pasada mecanica. La skill clasifica riesgo, inyecta skills especializadas a demanda por namespace de agente (Codex y Claude pueden tener nombres/coberturas distintas: UI/GVC, finance, payroll, release, secrets, browser diagnostics, arquitectura, docs, etc.) y emite `PASS | CONDITIONAL PASS | BLOCK`. Si falta evidencia runtime, el cierre debe decir `code complete, rollout pendiente` u `operativamente bloqueado`.

Nota de convivencia: el script `.codex/hooks/qa-release-stop-hook.mjs` es un guardrail local de Codex y queda opt-in/desregistrado por defecto para evitar prompts out-of-band; no reemplaza esta regla manual ni aplica automaticamente a Claude.

### Task Closing Quality Gate — full test + production build local (TASK-827/943 follow-ups)

**ANTES de mover una task de `in-progress/` a `complete/`** y declarar "ship done", correr **ambos** como gate final: `pnpm test` (full suite, NO solo focal) + `pnpm build` (producción Turbopack). **El pre-push hook (lint + tsc) NO basta** — no corre `pnpm test` (atrapa contratos cross-module que tu módulo focal no toca) ni `pnpm build` (atrapa boundary violations runtime: `server-only` transitivo a client bundle, dynamic imports rotos). Detalle + bug classes (registries/catalogs compartidos, orphan uncommitted WT, Cloud Run worker workflows post-push) en **`docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`**.

**Reglas duras (resumen):** **NUNCA** declarar una task complete + mover a `complete/` sin `pnpm test` (full) + `pnpm build` (prod) en el último commit. **NUNCA** committear código que dependa de un símbolo exportado por archivo uncommitted/stashed (correr `git status --short` antes de cada commit; Vercel buildea el SHA, no tu WT). **NUNCA** mover una task a `complete/` sin verificar que los 4 workflows Cloud Run workers afectados estén en `conclusion=success`. **NUNCA** considerar un CI rojo evitable como "el sistema funcionando bien".

### Entitlements governance — invariantes (Admin Center TASK-839, deprecated capabilities TASK-840, view registry TASK-827)

Los invariantes de admin center entitlement governance, deprecated capabilities discipline y view registry governance pattern viven en **`docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` → §`Invariantes operativos para agentes — Entitlements governance`**.

**Reglas duras (resumen):** **NUNCA** escribir role defaults / user overrides / startup policy fuera de `src/lib/admin/entitlements-governance.ts` (tx única: governance table + audit + outbox). **NUNCA** persistir una capability que no exista en `capabilities_registry` o esté `deprecated_at`. **NUNCA** deprecar una capability que aún existe en el TS catalog (drift inverso). **NUNCA** agregar entry a `VIEW_REGISTRY` TS sin migration seed acompañante en el mismo PR (la telemetría `role_view_fallback_used` lo detecta); **NUNCA** borrar filas de `role_view_assignments` (append-only).

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

### AI image generation + LLM providers — invariantes

Los invariantes de generación de assets visuales con IA (CLI `pnpm ai:image`, `generateImage()`, OpenAI/Imagen/Higgsfield-Recraft vectores, secret `greenhouse-openai-api-key`) y de los providers de texto/LLM (Gemini/Vertex, Anthropic, OpenAI — `src/lib/ai/`) viven en **`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` → §`Invariantes operativos para agentes — AI image + LLM providers`**. **Skill `greenhouse-ai-image-generator` para dirección de arte.** **NUNCA** crear un cliente/SDK LLM paralelo dentro de un módulo de dominio (extender el cliente canónico de `src/lib/ai/`); **NUNCA** hardcodear `sk-*`/`sk-ant-*` (resolver server-side via `*_SECRET_REF`); **NUNCA** crear scripts de generación ad-hoc (usar `pnpm ai:image`).

### Workforce Contracting Studio — invariantes (TASK-1019)

Los invariantes del Workforce Contracting Studio (cartas oferta + contratos laborales bilingües, bajo HR/Workforce — NO Payroll) viven en **`docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` → §`Invariantes operativos para agentes`**. **NUNCA** escribir/mutar `payroll_entries`/`compensation_versions`/`final_settlements` desde este dominio; **NUNCA** dejar que Claude apruebe/genere PDF/envíe email/firme (adapter advisory-only detrás de `WORKFORCE_CONTRACTING_AI_ENABLED`); **NUNCA** aprobar un idioma suelto (par bilingüe es-CL + en-US completo).

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

### Typography system + Efeonce brand — invariantes (TASK-1036/1038)

Los invariantes del sistema de tipografía (SoT `typography-tokens.ts` + drift-guard + escala + variant bridge) y de los Efeonce brand assets (SSOT `src/config/efeonce-brand.ts`: arquitectura de marca Efeonce vs Greenhouse, eslogan, footer PDF) viven en **`docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`** (contrato en `GREENHOUSE_DESIGN_TOKENS_V1.md` §3, `DESIGN.md`). **Skill `typography-design` para cualquier decisión de tipografía.** **NUNCA** `fontSize` inline en texto (usar variante/token); **NUNCA** monospace (numéricos = Geist + `tabular-nums`); **NUNCA** hardcodear los brand assets (importar del SSOT).

### Architecture Docs (los más críticos)

- `DECISIONS_INDEX.md` — indice maestro de ADRs y decisiones aceptadas
- `GREENHOUSE_CANONICAL_PATTERNS_V1.md` — los 6 patrones de implementación transversales (VIEW+helper+signal+lint · state-machine+CHECK+audit trio · outbox+reactive+dead-letter · defense-in-depth · capability⇒grant+coverage · flag default-OFF+shadow+flip). Leer antes de inventar una forma propia para algo que ya tiene patrón.
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
- **Awareness de hook pre-ejecucion ISSUE-* para Codex**: cuando el operador menciona `ISSUE-###`, `[ISSUE-###]`, una ruta `docs/issues/**/ISSUE-###-*.md` o alias slash-style de Codex como `/fix-issue ISSUE-###`, `/fix-issue ###`, `/issue ISSUE-###` o `/issue ###`, Codex debe ejecutar `pnpm codex:issue-hook ISSUE-###` antes de implementar y aplicar el prompt que imprime. Este hook es solo de Codex; no obliga automaticamente a Claude, Cursor u otros agentes. El prompt fuerza triage `issue-only fix` vs `issue + TASK` vs `blocked`; remediaciones amplias deben pasar a task; el cierre requiere evidencia de no-regresion sobre consumidores/contratos vecinos o riesgo residual documentado. Drift guard Codex: `pnpm codex:issue-hook:check`.

## Task Lifecycle Protocol

Todo agente que trabaje sobre una task del sistema debe gestionar su estado en el pipeline de tareas. Las tareas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

- **Tasks nuevas** usan `TASK-###`, nacen desde `docs/tasks/TASK_TEMPLATE.md` (plantilla copiable) y siguen el protocolo de `docs/tasks/TASK_PROCESS.md`.
- **Tasks existentes** — tanto `CODEX_TASK_*` como `TASK-###` ya creadas en el backlog — siguen vigentes con su formato original hasta su cierre.
- **Awareness de hook pre-ejecucion TASK-* para Codex**: cuando el operador menciona `TASK-###`, `[TASK-###]`, una ruta `docs/tasks/**/TASK-###-*.md` o alias slash-style de Codex como `/implement-task TASK-###`, `/implement-task ###`, `/task TASK-###` o `/task ###`, Codex debe ejecutar `pnpm codex:task-hook TASK-###` antes de implementar y aplicar el prompt que imprime. El hook Codex acepta ids numericos (`pnpm codex:task-hook 1033`). Si el operador dice `mantente en develop`, Codex usa `pnpm codex:task-hook TASK-### --develop`. Este hook es solo de Codex; no obliga automaticamente a Claude, Cursor u otros agentes. La excepcion de rama debe quedar documentada en Audit/Plan/Handoff. Codex no debe crear worktrees/folders clon por defecto; solo con pedido o aprobacion explicita del operador. Drift guard Codex: `pnpm codex:task-hook:check` valida prompt/hook/aliases/entrypoints.
- **Delta Codex subagentes (2026-06-29):** si el operador pide subagentes/delegacion/trabajo paralelo, Codex usa `pnpm codex:task-hook TASK-### --subagents` (combinable con `--develop`) para registrar autorizacion explicita y activar el contrato `SUBAGENT TOOLING` del prompt.
- **Delta Codex goal preflight (2026-06-29):** si el operador pide a Codex ejecutar/implementar/continuar una `TASK-###` sin `/goal` explicito, Codex primero propone un `/goal` recomendado y espera confirmacion; con `/goal` ya entregado, sigue al hook.

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

### Ops / Reliability / Platform — invariantes (Teams Bot, ops-worker, Vercel cron TASK-775, reliability dashboard hygiene, async observer TASK-937, Platform Health TASK-672)

Los invariantes de Teams Bot outbound (Bot Framework Connector + helper `pnpm teams:announce`), Cloud Run ops-worker (crons reactivos + `@core` boundary + worker runtime deps), Vercel cron classification (async_critical/prod_only/tooling), reliability dashboard hygiene (orphan archive / channel readiness / smoke lane bus / domain incidents), async observer liveness (heartbeat ≠ output freshness) y Platform Health API Contract (`platform-health.v1`) viven en **`docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`** (contrato por sub-área en sus specs). **Skills: `greenhouse-cron-sync-ops` (ops-worker/crons), `teams-bot-platform`/`greenhouse-teams-message-operator` (Teams).**

**Reglas duras (resumen):** **NUNCA** importar `@core/theme/*` (ni `@menu`/`@layouts`) desde código `src/lib/**` worker-bundled (silent startup crash; data de tokens runtime-agnóstica vive en `src/lib/design-tokens/*`). **NUNCA** dejar en `devDependencies` un paquete importado por código worker-bundled (`pnpm worker:runtime-deps-gate`). **NUNCA** agregar a `vercel.json` un path async-critical sin Cloud Scheduler equivalente. **NUNCA** inferir la liveness de un observer async desde la frescura de su output (heartbeat en `source_sync_runs`). **NUNCA** exponer payload de Platform Health sin `redactSensitive` ni computar safe modes en cliente.

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
- Validar con: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm typecheck` (NO `npx tsc --noEmit` crudo — OOM bajo Node 20, ISSUE-104)

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

- **Azure CLI (`az`)**: autenticado contra el tenant Microsoft de Efeonce `a80bf6c1-7c45-4d70-b043-51389622a0e4`. Se usa para gestionar Azure AD App Registrations (redirect URIs, client secrets, tenant config), Bot Service, Logic Apps, Resource Groups, etc. Comandos canónicos: `az ad app show --id <client-id>`, `az ad app update`, `az ad app credential reset`, `az ad sp show`. Subscription ID: `e1cfff3e-8c21-4170-8b28-ad083b741266`.
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

**MCP creativos (solo sesiones Claude):** conectores `claude.ai` de edición/diseño de assets (Adobe, Figma, Higgsfield, Magnific…), session-scoped y solo-Claude, **out-of-band** (NUNCA a runtime; imágenes runtime = `src/lib/ai/image-generator.ts`). Inventario + reglas: **AGENTS.md → §0**.

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

### UI/feature platforms — invariantes (home rollout TASK-780, nexa insights detail TASK-947, quick access TASK-553, table density TASK-743, final settlement TASK-863, real-artifact loop TASK-863, semantic column TASK-863, sample sprints runtime TASK-835, account-360 facet readers TASK-1059)

Los invariantes de home rollout flag platform, nexa insights detail page (routing `/nexa/insights/[id]`), quick access shortcuts, operational data table density, final settlement document lifecycle, **Real-Artifact Iterative Verification Loop** (metodología canónica para features visuales — emitir artefacto real + audit 3-skills), semantic column invariants, sample sprints runtime projection, y account-360 facet readers (anti silent-catch) viven en **`docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`**.

**Reglas duras (resumen):** **NUNCA** crear flags binarias de UI/shell por env var (tabla `home_rollout_flags`). **NUNCA** crear detail page de Nexa Insights bajo route_group de dominio (canónico `/nexa/insights/[id]`; consumir `readNexaInsightDrill`). **NUNCA** hardcodear arrays de shortcuts en un layout (resolver canónico). **NUNCA** tabla MUI >8 cols o con inputs en `<TableBody>` sin `<DataTableShell>`. **NUNCA** `.catch(() => [])` en un reader canónico del 360 (usar `observeAndRethrow`/`observeAndDegrade`). **Para features visuales que emiten artefacto consumido por humanos: SIEMPRE** aplicar el Real-Artifact loop (emitir caso real + audit 3-skills) antes de cerrar.

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

### SQL embebido / date-math — invariantes (TASK-893)

Los invariantes del SQL Signal Reader Schema Validation Gate (4 capas: lint rule `greenhouse/no-extract-epoch-from-date-subtraction`, smoke pre-merge contra PG real, protocolo de verificación de schema, patrones canónicos de "días entre fechas") viven en **`docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`**. **Cargar ese doc al escribir cualquier query SQL embebida en TS.**

**Reglas duras (resumen):** **NUNCA** confiar en `db.d.ts` (Kysely codegen) como source of truth de tipos PG — infiere DATE como `Timestamp` TS. **NUNCA** `EXTRACT(EPOCH FROM (X - Y))` cuando X o Y es DATE (`date - date = integer`; revienta en runtime): usar `(X - Y)::int` para días, o castear ambos lados a `::timestamptz`. **NUNCA** mergear un reader/query nuevo sin ejercitarlo al menos una vez contra PG real vía proxy (los mocks Vitest ejercitan el TS, NO el SQL). **NUNCA** fixear un solo callsite cuando el bug class emerge por Sentry: audit global + fix sistemático + lint rule + doc.

### Payroll/Workforce — participation/exit/leave/reconciliation/offboarding invariants (TASK-890, 891, 892, 893, 895)

Los invariantes operativos de payroll participation/exit — workforce exit payroll eligibility (lanes), payroll participation window (prorrateo), leave accrual participation-aware (feriado CL Art 67), person 360 relationship reconciliation, offboarding closure completeness — viven en **`docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`** (verbatim; contrato por sub-área en sus specs `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` / `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` / `GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` / `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`). **Invocar la skill MANDATORIA `greenhouse-payroll-auditor` al tocar payroll/finiquito/KPI ICO.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** filtrar inclusión payroll inline en SQL embebido (usar `resolveExitEligibilityForMembers`/`isMemberInPayrollScope`). **NUNCA** rescale monetary fields post-`buildPayrollEntry` para mes parcial (escalar la compensación ANTES; el calculator recomputa deducciones + gratificación cap + retención SII). **NUNCA** computar accrual de feriado legal inline desde `hire_date` (resolver participation-aware behind flag). **NUNCA** ejecutar `DELETE` de `person_legal_entity_relationships` (supersede append-only) ni auto-mutar Person 360 desde un read path. **NUNCA** activar los flags de participation/exit en prod sin las dependencias de flag + staging shadow + sign-off HR.

### Contractor Engagements / Payables — invariantes (dominio EPIC-013, TASK-790…981)

Los invariantes operativos del dominio contractor — engagements, invoice assets, work submissions, payables→Finance bridge, honorarios CL (retención SII), international/provider boundary + FX policy, self-service hub, closure + transition controls, remittance advice, agreed-amount SoD + guardrail, bank settlement, due-date/SLA, monthly payment run, run report, paid lifecycle + email, double-rail exclusion + current work classification, employee→contractor connected command, compensation tuple drift — viven en **`docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` → §"Invariantes operativos para agentes (TASK-790…981)"** (contrato + state machines + boundaries + signals + capabilities por sub-dominio, verbatim). **Cargar esa spec al tocar `src/lib/contractor-engagements/**` o el settlement de contractor payables en `src/lib/finance/**`.**

**Boundary duro bidireccional (aplica también desde payroll/finiquito, NO solo desde contractor):** el dominio contractor **NUNCA** escribe/muta `payroll_entries`, `payroll_adjustments`, `compensation_versions`, `final_settlements`/`final_settlement_documents` ni recalcula payroll/compensación; el payout del contractor **NUNCA** entra como payroll dependiente ni dispara finiquito laboral (su cierre es `contractor_closure`, **NUNCA** finiquito); no aplica deducciones estatutarias Chile a honorarios (solo retención SII versionada). **SIEMPRE** correr como gate de cierre al tocar este dominio o su transición: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde — cualquier rojo en finiquito/offboarding es regresión, no "test ajeno".

### Navigation Reachability Governance — invariantes (TASK-982)

Los invariantes del contrato de alcanzabilidad de rutas (toda `(dashboard)/**/page.tsx` debe ser alcanzable por nav) viven en **`docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md` → §`Invariantes operativos para agentes`** (gate `pnpm route-reachability-gate`, manifest `src/lib/navigation/route-reachability-manifest.ts`). **NUNCA** crear un `page.tsx` bajo `(dashboard)` sin hacerlo alcanzable (href literal / child en el manifest / dinámica `[id]`); **NUNCA** declarar una ruta-hija sin `parent`+`via`+`reason`.

### Identity Bridge Cutover Protocol — invariantes (TASK-877 follow-up)

Los invariantes del cutover de un bridge identity (Notion↔member, HubSpot owner↔member, Azure OID↔member) — migration de backfill atómico en el mismo PR + reliability signal de coverage drift + nunca decidir "store activa" por `if (result.size > 0)` — viven en **`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` → §`Identity Bridge Cutover Protocol`**. **SIEMPRE** que un bug afecte UNIFORMEMENTE a todos los entities downstream, sospechar primero del bridge/resolver/config compartida antes del calculator per-entity.

### ICO / Delivery Metrics — invariantes (TASK-900, 901, 903, 908, 909, 910, 912, 913, 916, 921, 922, 923, 943)

Los invariantes operativos del dominio ICO / delivery-metrics — materializer hardening (MERGE + freshness gate + tracking), Nexa AI Signals append-only event log, status transition foundation, delivery metrics ownership boundary (Notion = OS / Greenhouse = motor), metrics progressive migration (8 stop-gates + demo), Notion demo teamspace sandbox, RpA V2 demo + productive pipeline, Notion status transition capture, FTR/OTD/Due-Date/Attributable-Lateness — viven en **`docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`** (verbatim, con la spec canónica por sub-área citada en cada bloque: `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`, `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md`, `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`, `metrics/ATTRIBUTABLE_LATENESS_V1.md`). **Invocar la skill `greenhouse-ico` al tocar `src/lib/ico-engine/**`, `src/lib/notion-metrics/**` o los materializers ICO.**

**Reglas duras load-bearing (resumen — detalle en la spec):** **NUNCA** `DELETE FROM ai_signals`/`ai_prediction_log` (append-only event log; leer la VIEW `*_current`). **NUNCA** un DELETE+INSERT sobre una tabla materializada de ICO sin pasar por `runIcoMaterializerCycle` (freshness gate + MERGE, NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`). **NUNCA** crear/editar una fórmula Notion para una métrica ICO (Notion = OS, Greenhouse = motor; writeback a `[GH] <métrica>` read-only). **NUNCA** computar bonus para demo members ni mezclar demo events con productivos (tablas/secrets/webhook físicamente separados). **NUNCA** flip de writeback productivo sin los 8 stop-gates del ADR Strangler.

### Client lifecycle / onboarding — invariantes (TASK-991, 992, 1001, 1009, 1017)

Los invariantes de canonical organization write SSOT (`deriveOrganizationType`), client lifecycle orchestrator (puerta única / wizard `provisionClientFromWizard`), client portal user invitation SSOT, notion onboarding preflight (configurado ≠ fluyendo) y onboarding checklist evidence layer viven en **`docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` → §`Invariantes operativos para agentes — Client lifecycle/onboarding`**.

**Reglas duras (resumen):** **NUNCA** escribir `greenhouse_core.organizations` (account-360 doors) fuera de `upsertCanonicalOrganization` ni hand-setear `organization_type` inconsistente con el lifecycle (usar `deriveOrganizationType`). **NUNCA** parir un cliente fuera de `provisionClientFromWizard` (o el cascade de `resolveLifecycleCase`). **NUNCA** crear `client_users`/`user_role_assignments` por SQL inline para portal users (pasar por `inviteClientPortalUser`; solo los 3 roles `client_*`). **NUNCA** marcar `verify_notion_flowing` verde estando rojo, ni auto-completar un ítem del checklist con evidencia `pending`/`unverifiable`.

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

### Botones de Nexa — Nexa Mark + Shiny Button (navy) (convención de marca, desde 2026-06-20)

Todo botón/CTA que **invoque o represente a Nexa** (ej. "Pregúntale a Nexa", "Seguir con Nexa") usa la marca de Nexa, no un botón genérico:

- **Nexa Mark obligatorio:** el ícono es el **Nexa Mark** (`GreenhouseNexaBrandMark` desde `@/components/greenhouse/primitives`), NUNCA un ícono Tabler genérico (`tabler-message-*`, `tabler-sparkles`, etc.) ni texto solo. Para botón sobre fondo oscuro usar `kind='inlineMarkOnDark'`.
- **Shiny Button para el navy de Nexa:** el color característico de Nexa (midnight navy) se expresa con el **Shiny Button** — `GreenhouseShinyBorder asButton variant='cta' palette='nexa'` (desde `@/components/greenhouse/primitives`), pasando el Mark + label como `children`. NO usar un MUI `<Button color='primary'>` plano para un CTA de Nexa.

Patrón canónico (copiar este shape):

```tsx
<GreenhouseShinyBorder asButton variant='cta' palette='nexa' ariaLabel={…} onClick={…}>
  <GreenhouseNexaBrandMark kind='inlineMarkOnDark' size='small' />
  {GH_NEXA.insight_ask_nexa_cta}
</GreenhouseShinyBorder>
```

**Referencias vivas:** el bridge CTA de `KnowledgeNexaCompositionLens` ("Seguir con Nexa") y el CTA "Pregúntale a Nexa" de `NexaInsightDetailView` (TASK-1182). El copy visible va en `src/lib/copy/nexa.ts` (`GH_NEXA`), validado con `greenhouse-ux-writing`. **NUNCA** pintar un botón de Nexa con `<Button>` MUI plano + ícono genérico; **NUNCA** hardcodear el navy (sale del `palette='nexa'` de la primitive).

### Otras convenciones

- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
