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

### Solution Quality Contract

- Greenhouse espera soluciones seguras, robustas, resilientes y escalables por defecto; no parches locales salvo mitigacion temporal explicita.
- Antes de implementar, validar si el problema es sintoma local o causa compartida y preferir la primitive canonica del dominio.
- Todo workaround debe quedar documentado como temporal, reversible, con owner, condicion de retiro y task/issue asociada cuando aplique.
- Fuente canonica: `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

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
- `DESIGN.md` — contrato visual compacto agent-facing en formato `@google/design.md`; leerlo cuando el cambio toque UI, UX, tipografía, color, spacing o selección de componentes. **CI gate activo** (TASK-764): `.github/workflows/design-contract.yml` corre `pnpm design:lint --format json` strict (errors + warnings block) en cada PR que toca DESIGN.md / V1 spec / package.json. Agregar/modificar tokens requiere actualizar también el contrato de componente que los referencia (anti-bandaid: NO namespace `palette.*`). Validar local con `pnpm design:lint` antes de commitear.
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

### Finance — Cron rematerialize-balances seed contract (ISSUE-069, 2026-05-08)

Todo cron que invoque `rematerializeAccountBalanceRange` (o cualquier primitiva canónica con seed-row contract) **debe** calcular `seedDate = today − (lookbackDays + 1)`, NO `today − lookbackDays`.

**Por qué**: el contrato canónico de `rematerializeAccountBalanceRange` ([src/lib/finance/account-balances-rematerialize.ts:258](src/lib/finance/account-balances-rematerialize.ts#L258)) **NO materializa el día seed** — itera desde `seedDate + 1`. El día seed se inserta como ancla muda (`period_inflows=0, period_outflows=0`) para preservar reconciliation snapshots TASK-721 y respetar el OTB anchor TASK-703.

**Bug class** (ISSUE-069): si el caller usa `seedDate = today − lookbackDays`, el día `today − lookbackDays` queda como ancla muda. Cualquier `settlement_leg` / `expense_payment` / `income_payment` con `transaction_date` exactamente en ese día (típicamente registros retroactivos creados horas/días después) NO se contabiliza. Como la ventana del cron rota cada día, el "día ciego" se mueve diariamente — bug determinístico que afecta TODAS las cuentas.

**Fix canónico** (1 línea): restar 1 día adicional para que los últimos `lookbackDays` días COMPLETOS se materialicen, incluyendo lo que antes era el "día ciego".

```ts
// services/ops-worker/finance-rematerialize-seed.ts
export const computeRematerializeSeedDate = (today: Date, lookbackDays: number): string => {
  const seedMs = today.getTime() - (lookbackDays + 1) * 86_400_000

  return new Date(seedMs).toISOString().slice(0, 10)
}
```

**⚠️ Reglas duras**:

- **NUNCA** llamar `rematerializeAccountBalanceRange` con `seedDate = today − lookbackDays` cuando el objetivo es materializar los últimos `lookbackDays` días completos. Usar siempre `today − (lookbackDays + 1)` o el helper canónico `computeRematerializeSeedDate`.
- **NUNCA** modificar el contrato de `rematerializeAccountBalanceRange` (seed no se materializa) — es intencional para preservar reconciliation snapshots y OTB. El contrato es load-bearing.
- **NUNCA** calcular el seed inline en un nuevo handler de cron sin pasar por el helper canónico. Si emerge un nuevo cron similar (e.g. `rematerialize-monthly-balances`), agregar un helper análogo en el mismo archivo y testearlo con el mismo shape de tests.
- **NUNCA** correr backfill manual con `--from-date` que coincida con el día que necesitas reparar. Usar `seedMode='active_otb'` (default del backfill script) que toma el OTB genesis como seed real, no `--from-date`. El `--from-date` es etiqueta documental.
- **SIEMPRE** que un nuevo cron emerja consumiendo la primitiva canónica con seed-row contract, agregar test de regresión (`*.test.ts`) que pin-ee `seed = today − (lookbackDays + 1)` con casos edge (lookback=1, 30, cross-month, cross-year).

**Helper canónico**: [services/ops-worker/finance-rematerialize-seed.ts](services/ops-worker/finance-rematerialize-seed.ts).
**Tests anti-regresión**: [services/ops-worker/finance-rematerialize-seed.test.ts](services/ops-worker/finance-rematerialize-seed.test.ts) (7 tests).
**Diagnostic operator tool**: [scripts/finance/diagnose-fx-drift.ts](scripts/finance/diagnose-fx-drift.ts) — lista detalle por (account, fecha) con drift activo, mismo SQL que el reader del signal `finance.account_balances.fx_drift` pero retorna detalle en lugar de COUNT. Útil ANTES de invocar el backfill para saber qué cuentas necesitan recovery.

**Spec canónica**: `docs/issues/open/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md` (en proceso de resolución).

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

### Finance — Payment order ↔ bank settlement invariants (TASK-765)

Toda transición de `payment_orders` a `state='paid'` debe rebajar el banco en la cuenta origen, atómicamente. El path canónico end-to-end es:

```text
payroll_period.exported
  → finance_expense_reactive_intake (materializa expenses)
    → payment_obligations.generated (TASK-748)
      → payment_orders.draft → pending_approval → approved → submitted (TASK-750)
        → markPaymentOrderPaidAtomic (TASK-765 Slice 5):
          1. SELECT FOR UPDATE
          2. assertSourceAccountForPaid (Slice 1 hard-gate)
          3. UPDATE state='paid' (anti-zombie trigger Slice 6 valida)
          4. recordPaymentOrderStateTransition (audit log Slice 6 append-only)
          5. Per line: recordExpensePayment(input, client) → expense_payment + settlement_leg
          6. publishOutboxEvent('finance.payment_order.paid')
          7. ROLLBACK completo si CUALQUIER step falla
        → account_balances rematerialization
        → BANCO REBAJADO
```

**Reglas duras:**

- **NUNCA** marcar `state='paid'` con `source_account_id IS NULL`. Hard-gate triple: CHECK constraint `payment_orders_source_account_required_when_paid` (DB) + `assertSourceAccountForPaid` (TS) + UI Tooltip + trigger `payment_orders_anti_zombie_trigger` (defense in depth).
- **NUNCA** dejar `state='paid'` sin downstream completo. El path atómico `markPaymentOrderPaidAtomic` (`src/lib/finance/payment-orders/mark-paid-atomic.ts`) corre TODO en una sola tx. Si rollback ocurre, la order vuelve a `submitted` — nunca queda zombie. El proyector reactivo `record_expense_payment_from_order` queda como **safety net read-only** (idempotencia preservada por partial unique index).
- **NUNCA** skipear silencioso desde el resolver. `recordPaymentForOrder` (`record-payment-from-order.ts`) ahora throw + outbox `finance.payment_order.settlement_blocked` cuando: (a) `expense_not_found` después de invocar materializer sincrono, (b) `out_of_scope_v1` (lines no-payroll), (c) `recordExpensePayment` falla.
- **NUNCA** modificar el INSERT de `expenses` / `income` / `income_payments` / `expense_payments` sin verificar paridad column-count vs expression-count. El test `expense-insert-column-parity.test.ts` valida 14 INSERT sites canónicos en CI; cualquier drift rompe build (mismo bug que dejó dead-letter el materializer 2026-05-01).
- **NUNCA** transicionar estados fuera del matrix canónico (`draft → pending_approval → approved → submitted → paid → settled → closed` + cancellation paths). El trigger PG `payment_orders_anti_zombie_trigger` enforce a nivel DB; el TS helper `assertValidPaymentOrderStateTransition` enforce en código.
- **NUNCA** modificar `payment_order_state_transitions` (audit log). Es append-only enforced por trigger PG `payment_order_state_transitions_no_update/no_delete_trigger`. Para correcciones, insertar nueva fila con `metadata_json.correction_of=<transition_id>`.
- **Reliability signals** (`/admin/operations`): `paid_orders_without_expense_payment` (drift), `payment_orders_dead_letter` (dead_letter), `payroll_expense_materialization_lag` (lag). Steady state = 0. Cualquier valor > 0 indica un breakage en el path canónico.
- **Capabilities granulares** (least privilege): `finance.payroll.rematerialize` (admin endpoint rerun materializer) y `finance.payment_orders.recover` (recovery endpoint para órdenes zombie). Reservadas FINANCE_ADMIN + EFEONCE_ADMIN.

**Helpers canónicos:**

- `markPaymentOrderPaidAtomic({orderId, paidBy, paidAt?, externalReference?})` — path atómico canónico.
- `assertSourceAccountForPaid(orderId, sourceAccountId, targetState)` — hard-gate Slice 1.
- `recordPaymentOrderStateTransition({...}, client)` — append-only audit log writer (slice 6).
- `recordExpensePayment(input, client?)` — extiende firma con `client?` opcional (post-Slice 5).
- `materializePayrollExpensesForExportedPeriod({periodId, year, month})` — idempotente, invocable sincrono dentro de tx atómica.
- `checkInsertParity(sql)` — anti-regresión universal para INSERTs SQL embebidos.
- `POST /api/admin/finance/payroll-expense-rematerialize` — admin endpoint rerun materializer (capability `finance.payroll.rematerialize`).
- `POST /api/admin/finance/payment-orders/[orderId]/recover` — recovery endpoint para zombies (capability `finance.payment_orders.recover`).

**Outbox events nuevos:** `finance.payment_order.settlement_blocked` (v1, 5 reasons) + `finance.payroll_expenses.rematerialized` (v1, audit-only). Documentados en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-05-02.

**Spec canónica:** `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`.

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

### Finance — Bank ↔ Reconciliation synergy (TASK-722)

`/finance/bank` y `/finance/reconciliation` son ahora un solo flujo operativo. Banco es el tablero (cuentas + saldos + snapshots + drift + evidencia); Conciliación es el workbench transaccional (importar extractos, matching, cierre de periodo).

**Bridge contract** (read-only): `getReconciliationFullContext({periodId | accountId+year+month})` en `src/lib/finance/reconciliation/full-context.ts` retorna `{ account, period?, latestSnapshot?, evidenceAsset?, statementRows, difference, nextAction }` con state machine `nextAction: declare_snapshot → create_period → import_statement → resolve_matches → mark_reconciled → close_period → closed → archived`.

**Period creation desde snapshot** (atomic): `createOrLinkPeriodFromSnapshot({snapshotId, actorUserId})` en `src/lib/finance/reconciliation/period-from-snapshot.ts`. Idempotente (re-llamar devuelve `alreadyLinked=true`), atomic (insert period + UPDATE snapshot.reconciliation_period_id en misma tx), race-safe (UNIQUE (account_id, year, month) constraint).

**API**:
- `POST /api/finance/reconciliation/from-snapshot` — gated por `finance.reconciliation.declare_snapshot`
- `GET /api/finance/reconciliation?year=&month=` retorna `orphanSnapshots[]` adicional cuando se piden
- `GET /api/finance/reconciliation/[id]` retorna campo `bridge` con full context

**Capabilities** (TASK-403 motor, no DB tabla):
- `finance.reconciliation.read` — finance route_group / FINANCE_ADMIN / EFEONCE_ADMIN
- `finance.reconciliation.match` — mismo set
- `finance.reconciliation.import` — mismo set
- `finance.reconciliation.declare_snapshot` — mismo set
- `finance.reconciliation.close` — solo FINANCE_ADMIN / EFEONCE_ADMIN (acción terminal)

Guards `can()` agregados a 11 endpoints de mutación. `requireFinanceTenantContext` se mantiene como guard transversal.

**Reglas duras**:

- **NUNCA** sumar reconciliation logic inline en views. Toda composición pasa por `getReconciliationFullContext`.
- **NUNCA** crear periodo concurrent sin pasar por `createOrLinkPeriodFromSnapshot` o `createReconciliationPeriodInPostgres`. Ambas usan idempotency: la UNIQUE (account_id, year, month) constraint detecta race conditions a nivel DB.
- **NUNCA** mostrar match status sin distinguir `matched_settlement_leg_id` (canal canónico TASK-708) vs `matched_payment_id` (legacy). UI usa chip diferenciado "Canónico" vs "Legacy".
- **NUNCA** disable "Marcar conciliado" sin explicación clara en tooltip + alert. Operador debe saber qué falta.
- Banco es read-only sobre el modelo de conciliación; toda mutación va por endpoints del workbench. El botón "Abrir workbench" en BankView no muta — solo navega.
- Cuando emerja una nueva surface (e.g. cierre de período Q4 dashboard), reusa el bridge. Cero composición ad-hoc.

### Finance — Evidence canonical uploader (TASK-721)

Toda evidencia que respalde un snapshot de conciliación (cartola, screenshot OfficeBanking, statement PDF) o futura declaración de OTB / loan / factoring **debe** subirse via el uploader canónico de assets, NO declararse como text-input libre.

**Flow canónico**:
1. UI usa `<GreenhouseFileUploader contextType='finance_reconciliation_evidence_draft'>`. PDF/JPG/PNG/WEBP, max 10MB.
2. POST `/api/assets/private` calcula SHA-256, dedup por `content_hash` (mismo hash + mismo context → reuse asset existente, sin duplicar bucket object).
3. `createPrivatePendingAsset` sube a bucket `greenhouse-private-assets-{env}` con prefijo `finance-reconciliation-evidence/{assetId}/...` y persiste fila en `greenhouse_core.assets` con `retention_class='finance_reconciliation_evidence'`.
4. UI envía `evidenceAssetId` al endpoint `/api/finance/reconciliation/snapshots`.
5. `declareReconciliationSnapshot` en una sola transacción: insert snapshot con `evidence_asset_id` FK + `attachAssetToAggregate` (status pending → attached, owner_aggregate_id = snapshotId, owner_aggregate_type = 'finance_reconciliation_evidence').

**Reglas duras**:

- **NUNCA** aceptar `source_evidence_ref` como text libre en flujos nuevos. La columna existe solo para audit histórico pre-TASK-721.
- **NUNCA** subir directo al bucket público `greenhouse-public-media` para finance evidence. Bucket privado por seguridad (IAM restringida).
- **NUNCA** persistir `evidence_asset_id` apuntando a un asset que no existe — el FK con `ON DELETE SET NULL` cubre el delete, pero el detector `task721.reconciliationSnapshotsWithBrokenEvidence` flag-ea cualquier inconsistencia.
- **Permisos**: solo route group `finance` o `efeonce_admin` puede subir `finance_reconciliation_evidence_draft`. NO se acepta member-only.
- **Dedup**: `findAssetByContentHash` reusa asset existente si SHA-256 + context coinciden y status='pending'. Idempotente — el operador puede re-subir el mismo PDF y NO se duplica.
- **Reusable**: cuando emerjan loans / factoring / OTB declarations / period closings, agregar nuevos contexts (`finance_loan_evidence_draft`, etc.) al type union + dictionaries en `greenhouse-assets.ts`. El uploader, dedup y detector son transversales.

### Finance — Bank KPI aggregation policy-driven (TASK-720)

Los KPIs del módulo Banco (`Saldo CLP`, `Saldo USD`, `Equivalente CLP`) se computan a partir de la tabla declarativa `greenhouse_finance.instrument_category_kpi_rules`. Cada `instrument_category` (bank_account, fintech, payment_platform, payroll_processor, credit_card, shareholder_account + reservadas employee_wallet, intercompany_loan, factoring_advance, escrow_account) declara cómo contribuye a cada KPI: `contributes_to_cash`, `contributes_to_consolidated_clp`, `contributes_to_net_worth`, `net_worth_sign` (+1 asset / -1 liability), `display_group` (cash / credit / platform_internal).

**Helper canónico**: `aggregateBankKpis(accounts, rules)` en `src/lib/finance/instrument-kpi-rules.ts`. Es la única fuente de los KPIs en `getBankOverview`. Si una cuenta tiene `instrument_category` sin rule → `MissingKpiRuleError` (fail-fast).

**Detector**: `task720.instrumentCategoriesWithoutKpiRule` en `getFinanceLedgerHealth`. Steady state = 0. Si > 0, agregar fila al catálogo antes de activar cuentas en esa categoría.

**FK enforcement**: `accounts.instrument_category` → `instrument_category_kpi_rules.instrument_category`. Cualquier INSERT con categoría unknown falla con FK violation.

**Reglas duras**:

- **NUNCA** sumar `closingBalance` de cuentas Banco inline para computar KPIs. Toda agregación pasa por `aggregateBankKpis`.
- **NUNCA** activar una cuenta con `instrument_category` que no tenga fila en `instrument_category_kpi_rules`. Agregar la rule primero (1 INSERT con `display_label`, `display_group`, `rationale`).
- **NUNCA** mezclar asset + liability sin signo en cálculos de Banco. La sign convention TASK-703 está embebida en `net_worth_sign`.
- Cuando emerja una categoría nueva (wallets, loans, factoring), seed la rule + el detector ledger-health pasa solo. Cero refactor de agregador.

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

**Spec canónica**: `docs/tasks/complete/TASK-553-quick-access-shortcuts-platform.md`. Doc funcional: `docs/documentation/plataforma/accesos-rapidos.md`. Manual: `docs/manual-de-uso/plataforma/accesos-rapidos.md`. Delta UI Platform: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (2026-05-04).

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

### Git hooks canonicos (Husky + lint-staged) — auto-prevention de errores CI

Repo tiene 2 hooks instalados via Husky 9 (`pnpm prepare` los activa
automaticamente al `pnpm install`):

- **`.husky/pre-commit`**: corre `pnpm exec lint-staged` → `eslint --fix` sobre
  archivos staged. Errores auto-fixable se aplican; errores no-fixable bloquean
  el commit. Latencia tipica < 5s (cache eslint en `node_modules/.cache/eslint-staged`).
- **`.husky/pre-push`**: corre `pnpm lint` (full repo) + `pnpm exec tsc --noEmit`.
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

### Otras convenciones

- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
