# CLAUDE.md

## Project Overview

Greenhouse EO — portal operativo de Efeonce Group. Next.js 16 App Router + MUI 7.x + Vuexy starter-kit + TypeScript 5.9. Deploy en Vercel.

### Data Architecture

- **PostgreSQL** (Cloud SQL `greenhouse-pg-dev`, Postgres 16, `us-east4`) — OLTP, workflows mutables, runtime-first
- **BigQuery** (`efeonce-group`) — raw snapshots, conformed analytics, marts, histórico
- Patrón de lectura: **Postgres first, BigQuery fallback**
- Schemas PostgreSQL activos: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_hr`, `greenhouse_crm`, `greenhouse_delivery`, `greenhouse_ai`

### Payroll Operational Calendar

- Calendario operativo canónico: `src/lib/calendar/operational-calendar.ts`
- Hidratación pública de feriados: `src/lib/calendar/nager-date-holidays.ts`
- Timezone canónica de base: `America/Santiago` vía IANA del runtime
- Feriados nacionales: `Nager.Date` + overrides persistidos en Greenhouse
- No usar helpers locales de vista para decidir ventana de cierre o mes operativo vigente

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

### Vercel Deployment Protection

- **SSO habilitada** (`deploymentType: "all_except_custom_domains"`) — protege TODO salvo custom domains de Production.
- El custom domain de staging (`dev-greenhouse.efeoncepro.com`) **SÍ tiene SSO** — no es excepción.
- Para acceso programático (agentes, Playwright, curl): usar la URL `.vercel.app` + header `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`.
- **NUNCA crear manualmente** `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel — la variable es auto-gestionada por el sistema. Si se crea manualmente, sombrea el valor real y rompe el bypass.
- URLs de staging:
  - Custom domain (SSO, no para agentes): `dev-greenhouse.efeoncepro.com`
  - `.vercel.app` (usar con bypass): `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
- Proyecto canónico: `greenhouse-eo` (id: `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`, team: `efeonce-7670142f`). NUNCA crear un segundo proyecto vinculado al mismo repo.

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

## Key Docs

- `AGENTS.md` — reglas operativas completas, branching, deploy, coordinación, PostgreSQL access
- `project_context.md` — arquitectura, stack, decisiones, restricciones (documento vivo con deltas)
- `Handoff.md` — trabajo en curso, riesgos, próximos pasos
- `docs/tasks/README.md` — pipeline de tareas `TASK-###` y legacy `CODEX_TASK_*`
- `docs/issues/README.md` — pipeline de incidentes operativos `ISSUE-###`
- `docs/architecture/` — specs de arquitectura canónicas (30+ documentos)
- `docs/documentation/` — documentación funcional de la plataforma en lenguaje simple, organizada por dominio (identity, finance, hr, etc.). Cada documento enlaza a su spec técnica en `docs/architecture/`
- `docs/operations/` — modelos operativos (documentación, GitHub Project, data model, repo ecosystem)
- Fuente canónica para higiene y rotación segura de secretos:
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Fuente canónica para trabajo multi-agente (Claude + Codex en paralelo):
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — incluye higiene de worktrees, `rebase --onto`, `force-push-with-lease`, CI como gate compartido, squash merge policy, background watcher pattern para auto-merge sin branch protection
- Convenciones de skills locales:
  - Claude: `.claude/skills/<skill-name>/skill.md` (minuscula)
  - Codex: `.codex/skills/<skill-name>/SKILL.md` (mayuscula)

### Architecture Docs (los más críticos)

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
- `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — matriz canónica de monedas por dominio, FX policy, readiness contract, currency registry
- `GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías disponibles, patrones de componentes
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

- **Al completar una task** que cambie comportamiento visible de un módulo, verificar si existe documentación funcional del módulo afectado en `docs/documentation/`. Si existe, actualizarla. Si no existe y el cambio es significativo, considerar crearla.
- **Al cerrar un bloque de tasks** (como un hardening o una feature completa), crear el documento funcional del dominio si aún no existe.
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
- Nomenclatura centralizada: `src/config/greenhouse-nomenclature.ts`

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

**Usuario dedicado de agente:**

| Campo         | Valor                                            |
| ------------- | ------------------------------------------------ |
| `user_id`     | `user-agent-e2e-001`                             |
| `email`       | `agent@greenhouse.efeonce.org`                   |
| `password`    | `Gh-Agent-2026!`                                 |
| `tenant_type` | `efeonce_internal`                               |
| `roles`       | `efeonce_admin` + `collaborator`                 |
| `migración`   | `20260405151705425_provision-agent-e2e-user.sql` |

**Flujo rápido:**

```bash
# 1. Con dev server corriendo en localhost:3000
curl -s -X POST http://localhost:3000/api/auth/agent-session \
  -H 'Content-Type: application/json' \
  -d '{"secret": "<AGENT_AUTH_SECRET>", "email": "agent@greenhouse.efeonce.org"}'
# → { ok, cookieName, cookieValue, userId, portalHomePath }

# 2. Playwright (genera .auth/storageState.json)
AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs
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

### Cloud Run ops-worker (crons reactivos + materialización)

- Servicio Cloud Run dedicado (`ops-worker`) en `us-east4` para crons reactivos del outbox y materialización de cost attribution.
- 3 Cloud Scheduler jobs: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`.
- Endpoint adicional: `POST /cost-attribution/materialize` — materializa `commercial_cost_attribution` + recomputa `client_economics`. Acepta `{year, month}` o vacío para bulk. Las VIEWs complejas (3 CTEs + LATERAL JOIN + exchange rates) que timeout en Vercel serverless corren aquí.
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- Si el cambio toca `src/lib/sync/`, `src/lib/operations/`, `src/lib/commercial-cost-attribution/`, o `services/ops-worker/`, verificar build del worker.
- **ESM/CJS**: servicios Cloud Run que reutilicen `src/lib/` sin NextAuth shimean `next-auth`, providers y `bcryptjs` via esbuild `--alias`. Patrón en `services/ops-worker/Dockerfile`.
- **Deploy canónico via GitHub Actions** (`.github/workflows/ops-worker-deploy.yml`): trigger automático en `push` a `develop` o `main` que toque `services/ops-worker/**`. Trigger manual: `gh workflow run ops-worker-deploy.yml --ref <branch>` o desde la UI de Actions. El workflow autentica con WIF, corre `bash services/ops-worker/deploy.sh` (mismo script idempotente que upsertea Cloud Scheduler jobs), verifica `/health` y registra el commit. Confirmar deploy con `gh run list --workflow=ops-worker-deploy.yml --limit 1` o `gh run watch <run-id>`. **Manual local (`bash services/ops-worker/deploy.sh`) solo para hotfix puntual** con `gcloud` autenticado contra `efeonce-group`; el path canónico para que el deploy quede trazable es el workflow.
- Las rutas API Vercel (`/api/cron/outbox-react`, etc.) son fallback manual, no scheduladas.
- Run tracking: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.

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

**⚠️ Reglas duras**:
- **NO** crear endpoints paralelos para HubSpot. Si emerge necesidad de webhook para deals, products, etc., agregar nuevo handler bajo `src/lib/webhooks/handlers/` y nuevo `webhook_endpoints` row, NO endpoint custom.
- **NO** hacer sync sincrono blocking en el handler — `syncHubSpotCompanyById` puede tardar (3-10s por company). HubSpot tiene 5s timeout por POST. Si se vuelve crítico, mover el sync a outbox + worker reactive.
- **NO** sincronizar manualmente si el webhook está activo. El CLI `scripts/integrations/hubspot-sync-company.ts` queda solo para backfills históricos o casos de recuperación.
- **NUNCA** loggear el body crudo del webhook en logs (puede contener PII de contactos). El sistema generic ya lo persiste en `greenhouse_sync.webhook_inbox_events` con scrubbing apropiado.
- Cuando se cree un nuevo cliente Greenhouse manualmente (sin pasar por HubSpot), seguir el patrón `hubspot-company-{ID}` solo si tiene HubSpot ID; si NO tiene HubSpot, usar otro prefix (ej. `internal-`, `nubox-`, etc.) para evitar colisión.

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

### Finance — Internal Account Number Allocator (TASK-700)

Algoritmo canónico para asignar números de cuenta internos a CCAs hoy y wallets/loans/factoring mañana. **Toda cuenta interna que necesite identificador legible debe pasar por este allocator** — no se generan números en consumers.

Formato v1: `TT-XX-D-NNNN`
- `TT` = `greenhouse_core.spaces.numeric_code` (2-digit, NOT NULL UNIQUE)
- `XX` = `greenhouse_finance.internal_account_type_catalog.type_code` (`90` = shareholder hoy)
- `D` = Luhn mod-10 sobre payload `TT‖XX‖NNNN`
- `NNNN` = secuencial monotónico zero-padded por `(space, type)` — los últimos 4 chars del rendering son siempre dígitos puros, por lo que `slice(-4)` produce un mask `•••• 0001` distintivo

Allocator atómico:
- SQL: `greenhouse_finance.allocate_account_number(space_id, type_code, target_table, target_id)` — advisory lock per `(space, type)`, computa Luhn, persiste en `account_number_registry`
- TS: `allocateAccountNumber(...)` en `src/lib/finance/internal-account-number/` — wrapper Kysely de la SQL function. Acepta `client?: Kysely | Transaction` para compartir transacción con el INSERT del consumer.

Helpers TS exportados: `luhnCheckDigit`, `formatAccountNumber`, `parseAccountNumber`, `validateAccountNumber`, `maskAccountNumber`. Hay test de paridad TS↔SQL contra el número del backfill (`01-90-7-0001`).

Catálogo de type codes (extender insertando filas — no requiere migrar generador):
- `90` shareholder_account (CCA — implementado)
- Rangos reservados (no materializados): `10-19` wallets de usuario, `20-29` wallets de cliente, `30-39` wallets de proveedor, `70-79` intercompany loans, `80-89` factoring/structured.

**Reglas duras**:
- **NUNCA** componer un internal account number manualmente en un consumer. Siempre `allocateAccountNumber(...)` o la SQL function.
- **NUNCA** alterar el formato inline. Para evolucionar, bumpear `format_version` en BOTH la SQL function y el módulo TS — los emitidos coexisten.
- **NUNCA** bypass del registry escribiendo directo a `accounts.account_number` para una categoría que usa el registry. El registry es la fuente de verdad audit.
- **NUNCA** desincronizar TS y SQL del Luhn — el test `luhn-parity` rompe build si pasa.
- Cuando se cree el módulo de wallets, agregar fila al catalog y reusar el allocator. Cero código nuevo de generación.

### Finance — Payment Provider Catalog + category provider rules (TASK-701)

Toda cuenta operativa (banco, tarjeta, fintech, CCA, wallet futura) declara un proveedor que opera el ledger. El catálogo y las reglas son canónicos: el form admin y el readiness contract leen de aquí, no hay branching por categoría en consumers.

**Tablas**:
- `greenhouse_finance.payment_provider_catalog` — FK desde `accounts.provider_slug`. `provider_type` ∈ `bank`, `card_network`, `card_issuer`, `fintech`, `payment_platform`, `payroll_processor`, **`platform_operator`**. Cada fila declara `applicable_to TEXT[]` con las categorías que puede servir.
- `greenhouse_finance.instrument_category_provider_rules` — regla por `instrument_category` (`requires_provider`, `provider_label`, `provider_types_allowed`, `default_provider_slug`, `requires_counterparty`, `counterparty_kind`, `counterparty_label`).

**Greenhouse-as-platform_operator**: el provider con slug `greenhouse` es first-class. Representa que la plataforma misma opera ledger internos (CCA hoy, wallets/loans/factoring mañana). Para shareholder_account (y futuras categorías internas), `default_provider_slug='greenhouse'` → form lo pre-asigna read-only.

**Helper canónico**: `getCategoryProviderRule(category)` en `src/lib/finance/payment-instruments/category-rules.ts` mirror del seed SQL.

**Reglas duras**:
- **NUNCA** escribir un `provider_slug` inventado. Solo slugs presentes en el catálogo (FK lo bloquea).
- **NUNCA** branchear UI/readiness por `instrument_category` para decidir qué campos mostrar. Leer la rule.
- **NUNCA** mezclar dimensiones: el `provider_slug` es "quién opera el ledger". El counterparty (cuando aplica) es "quién es el otro lado del wallet" — vive en `metadata_json` para shareholder hoy, columna dedicada cuando se materialicen futuras wallets.
- Cuando ship una categoría nueva (`employee_wallet`, `client_wallet`, `intercompany_loan`, `escrow_account`):
  1. INSERT row en `internal_account_type_catalog` (TASK-700)
  2. UPDATE `payment_provider_catalog` para agregar la categoría al `applicable_to` de `greenhouse`
  3. INSERT row en `instrument_category_provider_rules` con la regla
  4. Agregar entrada en `getCategoryProviderRule` (mirror TS)
  El form admin se adapta solo. Cero refactor de UI.

### Finance — OTB cascade-supersede (TASK-703b)

Cuando una cuenta liability/asset necesita re-anclar su Opening Trial Balance (porque el anchor inicial fue mal interpretado, porque emerge bank statement authoritative más reciente, o porque hay phantom pre-OTB data en chain), el mecanismo canónico es **cascade-supersede**.

**Ecuación canónica del anchor**:

- `OTB.genesisDate` = SOD (start of day). `OTB.openingBalance` representa el balance al INICIO del día genesis (= EOD del día anterior).
- Movements ON `genesisDate` son **post-anchor**, se cuentan en el chain.
- Movements `< genesisDate` son **pre-anchor**, son cascade-superseded por el OTB.

**Convención de signo para liability** (credit_card, shareholder_account, futuros loans/wallets):

- `closing_balance > 0` = deuda activa con la contraparte = "Cupo utilizado" en bank UI.
- `closing_balance < 0` = sobrepago / crédito a favor del cliente.
- `closing = opening + outflows − inflows` (inverso a asset).
- En UI de credit_card: `consumed = max(0, closingBalance)` (se clampa a 0 porque banco no muestra "deuda negativa", muestra crédito por separado).

**Cómo re-anclar** (patrón reusable):

1. Identificar el bank statement authoritative más reciente (PDF cycle close, cartola con saldo running, OfficeBanking screenshot con timestamp).
2. Editar `scripts/finance/declare-opening-trial-balances.ts` con: nueva `genesisDate` (SOD), nueva `openingBalance` (= bank reality), `auditStatus='reconciled'`, `evidenceRefs` apuntando al PDF/cartola.
3. Ejecutar `pnpm finance:declare-otbs`. El helper `declareOpeningTrialBalance` automáticamente:
   - INSERT new OTB row.
   - UPDATE old active OTB → `superseded_by = new.obtb_id`.
   - SQL function `cascade_supersede_pre_otb_transactions` marca settlement_legs/income_payments/expense_payments con `transaction_date < genesisDate` como `superseded_by_otb_id = new.obtb_id` (audit-preserved, anti-DELETE).
   - DELETE account_balances rows con `balance_date < genesisDate` (proyecciones derivadas, no audit data).
   - Outbox event `finance.account.opening_trial_balance.declared` con `cascadeCounts`.
4. Ejecutar `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/rematerialize-account.ts <accountId>` para limpiar y reconstruir el chain desde el nuevo anchor.
5. Verificar que `account_balances` última row closing ≈ bank reality. Drift residual aceptable < 5-10% suele venir de: refunds pendientes de capturar como income_payment, FX rate diff entre nuestro mid-day y settlement banco, holds bancarios (authorizations no posteadas que reducen disponible pero no deuda).

**⚠️ Reglas duras**:

- **NUNCA** declarar OTB con `openingBalance` cuyo signo no haya sido validado contra la convención liability/asset. Para liability: positivo = deuda (cupo utilizado). Para asset: positivo = saldo a favor (caja). El PDF de tarjeta puede mostrar valores con signo invertido respecto a esta convención (banco usa "saldo adeudado" donde negativo = crédito a favor del cliente).
- **NUNCA** hardcodear el opening_balance en código. Vive en `account_opening_trial_balance` con `evidenceRefs` apuntando al artefacto bank source-of-truth.
- **NUNCA** DELETE manual de `account_balances` o `expense_payments` para "limpiar" un chain. Usar `cascade_supersede_pre_otb_transactions` o la declaración de nueva OTB que dispara el cascade automáticamente.
- **NUNCA** computar "Consumido" / "Cupo utilizado" en UI a partir de `periodOutflows` para cuentas revolving. Use `closingBalance` (running cumulative debt). El periodOutflows es solo "cargos del mes seleccionado" — semánticamente distinto.
- **NUNCA** filtrar transacciones a mano en queries de finance. Aplicar siempre `superseded_by_payment_id IS NULL AND superseded_by_otb_id IS NULL` (las dos columnas están coordinadas — una es payment-chain, la otra es anchor-chain).
- Cuando aparezca un nuevo tipo de transaction primitive (ej. `treasury_movement`, `loan_principal_repayment`), **debe nacer con `superseded_by_otb_id`** desde su migration y respetar el cascade pattern.

**Tests** (en TASK-703b followup): paridad TS↔SQL del cascade function (assert idempotency + correct counts), liability sign convention smoke test, OTB supersede chain integrity.

**Spec canónica**: `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md` (Delta 2026-04-28 sección).

### Finance — Labor allocation consolidada (TASK-709) — invariante anti double-counting

`greenhouse_serving.client_labor_cost_allocation` es una VIEW que emite **1 row por (payroll_entry × client_team_assignment)**. Si en un mismo mes hay múltiples payroll entries para un miembro (e.g. nómina mes anterior + mes corriente posteadas en el mismo mes calendario), la VIEW emite N rows por (member, year, month, client_id) — cada una con la misma `fte_contribution` pero distinto `allocated_labor_clp`.

**Eso es semánticamente válido** para consumers que necesitan granularidad por payroll_entry (e.g. P&L close-period detail, audit del materializer payroll). **Pero es un bug** para consumers comerciales que JOIN-ean con expenses prorrateados — el JOIN multiplica los expenses N veces por la cardinalidad de payroll entries del período.

**Solución canónica**: VIEW consolidada `greenhouse_serving.client_labor_cost_allocation_consolidated` que agrupa por `(period_year, period_month, member_id, client_id)` con `SUM(allocated_labor_clp)` y `MAX(fte_contribution)`. Una row por miembro × cliente × período. Expone `source_payroll_entry_count` para drift detection.

**⚠️ Reglas duras**:

- **NUNCA** JOIN-ar `client_labor_cost_allocation` (cla cruda) con `expenses` o cualquier tabla con `payment_date` para attribution comercial. Eso causa double-counting determinístico cuando hay > 1 payroll entry por (member, period). Usa siempre `client_labor_cost_allocation_consolidated`.
- **USAR** la cla cruda solo cuando el caso de uso requiere granularidad por payroll_entry (audit, debug, payroll engine internal).
- **NO** modificar la VIEW cla cruda — rompe consumers que dependen de la granularidad por entry. La consolidación vive en una VIEW separada.
- **Reliability signal**: VIEW `labor_allocation_saturation_drift` detecta `SUM(fte_contribution) > 1.0` por (member, period) — imposible en realidad. Si emite rows, hay bug en `client_team_assignments` upstream (overlapping assignments mal partitionados por date range). El subsystem `Finance Data Quality` rolls up esta métrica como `labor_allocation_saturation_drift`. Cuando > 0 → status warning + plataforma degradada.
- Helper TS canónico: `readConsolidatedLaborAllocationForPeriod` y `getLaborAllocationSaturationDrift` en `src/lib/commercial-cost-attribution/labor-allocation-reader.ts`.
- Tests: 6 tests en `labor-allocation-reader.test.ts` cubren consolidation parsing + drift detection.

**Spec canónica**: migration `20260428110246262_task-709-labor-allocation-uniqueness-and-quality.sql` + migration `20260428110726148_task-709b-v2-attribution-uses-consolidated.sql`. La VIEW `commercial_cost_attribution_v2` (TASK-708) y `member-period-attribution.ts` ambos consumers fueron refactorizados para usar consolidada.

**Caso de prueba real (Sky Airline marzo 2026)**:
- Pre-fix: `expense_direct_member_via_fte` = $5,122,256 (2x duplicado)
- Post-fix: `expense_direct_member_via_fte` = $2,561,128 ✓
- `source_payroll_entry_count` = 2 documenta que cada miembro consolidó 2 entries (nómina febrero + marzo posteadas en marzo)

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

### Otras convenciones

- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
