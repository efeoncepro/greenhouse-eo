# CLAUDE.md

## Project Overview

Greenhouse EO — portal operativo de Efeonce Group. Next.js 16 App Router + MUI 7.x + Vuexy starter-kit + TypeScript 5.9. Deploy en Vercel.

### Data Architecture

- **PostgreSQL** (Cloud SQL `greenhouse-pg-dev`, Postgres 16, `us-east4`) — OLTP, workflows mutables, runtime-first
- **BigQuery** (`efeonce-group`) — raw snapshots, conformed analytics, marts, histórico
- Patrón de lectura: **Postgres first, BigQuery fallback**
- Schemas PostgreSQL activos: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_hr`, `greenhouse_crm`, `greenhouse_delivery`, `greenhouse_ai`

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

## Quick Reference

- **Package manager:** `pnpm` (siempre usar `pnpm`, no `npm` ni `yarn`)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test` (Vitest)
- **Type check:** `npx tsc --noEmit`
- **PostgreSQL health:** `pnpm pg:doctor`

## Key Docs

- `AGENTS.md` — reglas operativas completas, branching, deploy, coordinación, PostgreSQL access
- `project_context.md` — arquitectura, stack, decisiones, restricciones (documento vivo con deltas)
- `Handoff.md` — trabajo en curso, riesgos, próximos pasos
- `docs/tasks/README.md` — pipeline de tareas `TASK-###` y legacy `CODEX_TASK_*`
- `docs/architecture/` — specs de arquitectura canónicas (30+ documentos)
- `docs/operations/` — modelos operativos (documentación, GitHub Project, data model, repo ecosystem)

### Architecture Docs (los más críticos)

- `GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro de arquitectura
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360
- `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato completo de Payroll
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PostgreSQL + BigQuery
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso (runtime/migrator/admin)
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — desacople de Notion/HubSpot
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — identidad y acceso (12/12 implementado)
- `GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo de eventos outbox
- `GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separación auth principal vs canonical identity

## Task Lifecycle Protocol

Todo agente que trabaje sobre una `CODEX_TASK_*` debe gestionar su estado en el pipeline de tareas. Las tareas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

### Al iniciar trabajo en una task
1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
3. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task
1. Mover el archivo de `in-progress/` a `complete/`
2. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
3. Documentar en `Handoff.md` y `changelog.md`
4. Ejecutar el chequeo de impacto cruzado (ver abajo)

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

### PostgreSQL Access
- **Runtime** del portal: solo credenciales `runtime` (`GREENHOUSE_POSTGRES_USER`)
- **Migraciones**: `migrator` (`GREENHOUSE_POSTGRES_MIGRATOR_USER`)
- **Bootstrap**: `admin` (`GREENHOUSE_POSTGRES_ADMIN_USER`)
- Health check: `pnpm pg:doctor`

### Tests y validación
- Tests unitarios: Vitest + Testing Library + jsdom
- Helper de render para tests: `src/test/render.tsx`
- Validar con: `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit`

### Otras convenciones
- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Tasks nuevas: usar `TASK-###` (registrar en `docs/tasks/TASK_ID_REGISTRY.md`)
