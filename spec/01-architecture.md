# Greenhouse Portal — Arquitectura de Alto Nivel

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: 55 lib modules, 324 API routes, 11 schemas, event architecture completa, Email + Resend, SCIM 2.0, webhooks, 165+ scripts, Vitest + Testing Library, Secret Manager

---

## Diagrama de capas

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                              │
│  React 19 + MUI 7 + Vuexy Shell + ApexCharts + Recharts              │
│  Redux Toolkit (state) · React Hook Form (forms) · TanStack Table     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTP (fetch, no-store, no-cache)
┌────────────────────────────▼─────────────────────────────────────────┐
│                    NEXT.JS 16 APP ROUTER                              │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │ Pages (SSR)  │  │ Layouts      │  │ API Routes (/api/*)        │  │
│  │ 55+ routes   │  │ (dashboard)  │  │ 324 routes, force-dynamic  │  │
│  │ (blank)      │  │ (blank)      │  │ JWT session, Sentry        │  │
│  └──────┬───────┘  └──────────────┘  └──────────┬────────────────┘  │
│         │                                        │                   │
│  ┌──────▼────────────────────────────────────────▼────────────────┐  │
│  │                 LIB LAYER (src/lib/* — 55 modules)             │  │
│  │                                                                │  │
│  │  tenant/  dashboard/  projects/  people/  person-360/         │  │
│  │  my/  hr-core/  payroll/  finance/  capabilities/             │  │
│  │  agency/  admin/  ai-tools/  ai/  integrations/               │  │
│  │  team-capacity/  team-admin/  storage/  sync/  ids/           │  │
│  │  postgres/  account-360/  ico-engine/  nubox/                 │  │
│  │  services/  identity/  space-notion/  providers/              │  │
│  │  nexa/  scim/  commercial-cost-attribution/                   │  │
│  │  person-intelligence/  member-capacity-economics/             │  │
│  │  notifications/  alerts/  secrets/  email/  webhooks/         │  │
│  │  calendar/  contacts/  config/  types/                        │  │
│  └────────┬──────────────────────────┬─────────────────────────┬─┘  │
│           │                          │                         │    │
│  ┌────────▼────────┐  ┌─────────────▼──────────┐  ┌──────────▼──┐ │
│  │ BigQuery SDK    │  │ PostgreSQL (Kysely)    │  │ External    │ │
│  │ @google-cloud   │  │ pg Pool + Cloud SQL    │  │ Integrations│ │
│  └────────┬────────┘  │ Connector              │  │ (HubSpot)   │ │
│           │           │ + Secret Manager       │  │ (Resend)    │ │
│           │           └──────────┬─────────────┘  │ (Vertex AI) │ │
│           │                      │                └─────────────┘ │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
   ┌────────▼──────────────────┐  │
   │  Google BigQuery           │  │
   │  7 datasets, 150+ tables   │  │
   │  - greenhouse              │  │
   │  - notion_ops              │  │
   │  - greenhouse_raw          │  │
   │  - greenhouse_conformed    │  │
   │  - greenhouse_ico          │  │
   │  - nubox_raw_snapshots     │  │
   │  - nubox_conformed         │  │
   └────────────────────────────┘  │
                                   │
                        ┌──────────▼─────────────────┐
                        │ Cloud SQL (PostgreSQL 16)  │
                        │ Instance: greenhouse-pg-dev│
                        │ 11 schemas, 119+ tables    │
                        │                            │
                        │ greenhouse_core            │
                        │ greenhouse_ai              │
                        │ greenhouse_crm             │
                        │ greenhouse_delivery        │
                        │ greenhouse_notifications   │
                        │ greenhouse_cost_intel      │
                        │ greenhouse_hr              │
                        │ greenhouse_payroll         │
                        │ greenhouse_finance         │
                        │ greenhouse_serving         │
                        │ greenhouse_sync            │
                        └────────────────────────────┘
```

## App Router — Estructura de rutas (55+ páginas)

### `(dashboard)` — Layout con navegación

Todas las superficies autenticadas con sidebar, header y branding del tenant:

```
(dashboard)/
├── my/                         # Portal personal (nuevo)
│   ├── assignments/            # Mis asignaciones activas
│   ├── delivery/               # Mis entregas, milestones
│   ├── leave/                  # Mis permisos, balance
│   ├── payroll/                # Mi nómina, recibos
│   ├── performance/            # Mi evaluación, feedback
│   └── profile/                # Mi perfil, preferencias
├── dashboard/                  # Dashboard ejecutivo cliente
├── proyectos/                  # Lista de proyectos
│   └── [id]/                   # Detalle de proyecto
├── sprints/                    # Vista de sprints
│   └── [id]/                   # Detalle de sprint
├── settings/                   # Configuración del tenant
├── updates/                    # Actualizaciones
├── capabilities/[moduleId]     # Módulo de capability
├── people/                     # Directorio de equipo
│   └── [memberId]/             # Perfil 360 de persona
├── hr/
│   ├── leave/                  # Gestión de permisos (nuevo)
│   │   ├── requests/           # Mi solicitud de permiso
│   │   ├── approval-queue/     # Cola de aprobación (HR)
│   │   ├── balances/           # Saldos por persona
│   │   └── policies/           # Políticas de permiso
│   ├── attendance/             # Registro de asistencia
│   ├── departments/            # Gestión de departamentos
│   └── payroll/                # Nómina
│       ├── periods/            # Períodos de nómina
│       ├── compensation/       # Compensaciones
│       └── member/[memberId]/  # Detalle payroll por persona
├── finance/
│   ├── clients/[id]/           # Clientes financieros
│   ├── income/[id]/            # Ingresos
│   ├── expenses/[id]/          # Egresos
│   ├── suppliers/[id]/         # Proveedores
│   ├── reconciliation/[id]/    # Reconciliación
│   ├── dashboard/              # Dashboard financiero
│   └── intelligence/           # Intelligence + cost analysis
├── agency/
│   ├── spaces/                 # Espacios/cuentas
│   ├── capacity/               # Capacidad agencia
│   ├── organizations/          # Account 360 (nuevo)
│   │   └── [id]/               # Detalle org + tabs
│   └── pulse/                  # Health indicators
├── campaigns/                  # Gestión de campañas (nuevo)
│   ├── list/                   # Lista de campañas
│   ├── [id]/                   # Detalle de campaña
│   ├── templates/              # Templates de outreach
│   └── analytics/              # Performance de campaña
├── staff-augmentation/         # Bolsa de disponibilidad (nuevo)
│   ├── availability/           # Búsqueda de skills
│   ├── marketplace/            # Marketplace de perfiles
│   └── assignments/            # Asignaciones temporales
├── cost-intelligence/          # Dashboards de costo (nuevo)
│   ├── by-client/              # Costo por cliente
│   ├── by-project/             # Costo por proyecto
│   ├── by-bu/                  # Costo por línea de negocio
│   └── margin-analysis/        # Análisis de margen
├── admin/
│   ├── users/[id]/             # Gestión de usuarios
│   ├── roles/                  # Gestión de roles
│   ├── tenants/[id]/           # Gestión de tenants
│   │   ├── view-as/dashboard/  # Vista como cliente
│   │   └── capability-preview/ # Preview de capability
│   ├── team/                   # Gestión de equipo admin
│   ├── ai-tools/               # Gestión de AI tools
│   ├── notifications/          # Notifications admin (nuevo)
│   │   ├── templates/          # Templates de notificación
│   │   ├── alerts/             # Reglas de alertas
│   │   └── delivery-log/       # Log de entregas
│   └── integrations/           # Configuración de integraciones
├── internal/
│   └── dashboard/              # Dashboard interno Efeonce
├── about/                      # Info del portal
└── home/                       # Home page
```

### `(blank-layout-pages)` — Layout sin navegación

```
(blank-layout-pages)/
├── login/                      # Login con credentials/SSO
├── auth/access-denied/         # Página de acceso denegado
└── developers/api/             # Documentación de API (nuevo)
```

### Otras rutas raíz

```
auth/landing/                   # Landing post-auth
[...not-found]/                 # Catch-all 404
```

## API Routes — Organización (324 rutas totales)

Todas las API routes viven bajo `src/app/api/` y siguen estos patrones:

1. **Todas son `force-dynamic`** — No se cachean. Cada request evalúa la sesión fresca.
2. **Todas verifican sesión** — Usan `getServerSession(authOptions)` + helpers de autorización.
3. **Todas son observadas** — Sentry captures errors automáticamente.
4. **Respuestas JSON estándar** — `NextResponse.json()` con códigos HTTP apropiados.

```
api/
├── auth/[...nextauth]/         # Handler NextAuth (OAuth + credentials)
├── dashboard/                  # KPIs, summary, charts, risks
│   ├── kpis/
│   ├── trends/
│   └── risks/
├── projects/                   # CRUD proyectos + tasks
│   ├── list/
│   ├── create/
│   └── [id]/
├── team/                       # Members, capacity, by-project, by-sprint
│   ├── list/
│   ├── [id]/
│   ├── capacity/
│   └── assignments/
├── people/                     # Directorio, detalle, HR context, delivery, finance
│   ├── list/
│   ├── [id]/
│   ├── [id]/hr-context/
│   ├── [id]/delivery/
│   └── [id]/finance/
├── my/                         # Portal personal (nuevo — 18 rutas)
│   ├── profile/
│   ├── assignments/
│   ├── delivery/
│   ├── leave/
│   ├── payroll/
│   ├── performance/
│   └── preferences/
├── hr/
│   ├── core/                   # Nuevo bloque (nuevo — 12 rutas)
│   │   ├── members/
│   │   ├── departments/
│   │   ├── attendance/
│   │   ├── leave/              # Leave requests, balances, policies
│   │   └── attendance-bulk/
│   └── payroll/                # Períodos, entries, compensation, export
│       ├── periods/
│       ├── entries/
│       ├── compensation/
│       ├── deductions/
│       └── export/
├── finance/                    # Accounts, income, expenses, suppliers, reconciliation, dashboard
│   ├── clients/
│   ├── income/
│   ├── expenses/
│   ├── suppliers/
│   ├── reconciliation/
│   ├── dashboard/
│   ├── intelligence/           # Client economics, allocations (nuevo — 8 rutas)
│   │   ├── cost-by-client/
│   │   ├── cost-by-project/
│   │   ├── margin-analysis/
│   │   └── benchmarks/
│   └── nubox/                  # Nubox 3-phase sync (nuevo — 6 rutas)
│       ├── sync/
│       ├── status/
│       └── reconcile/
├── capabilities/               # Resolve, module data
│   ├── resolve/
│   └── [moduleId]/
├── agency/                     # Pulse, spaces, capacity
│   ├── pulse/
│   ├── spaces/
│   ├── capacity/
│   └── services/               # Service CRUD (nuevo — 6 rutas)
│       ├── list/
│       ├── create/
│       └── [id]/
├── organizations/              # Account 360 CRUD, memberships (nuevo — 12 rutas)
│   ├── list/
│   ├── create/
│   ├── [id]/
│   ├── [id]/memberships/
│   ├── [id]/services/
│   └── [id]/metrics/
├── ico-engine/                 # Delivery metrics, stuck assets, trends (nuevo — 9 rutas)
│   ├── metrics/
│   ├── stuck-assets/
│   ├── trends/
│   ├── materialization/
│   └── recovery/
├── campaigns/                  # Campaign management (nuevo — 15 rutas)
│   ├── list/
│   ├── create/
│   ├── [id]/
│   ├── [id]/leads/
│   ├── [id]/outreach/
│   └── [id]/analytics/
├── staff-augmentation/         # Bolsa de disponibilidad (nuevo — 8 rutas)
│   ├── availability/
│   ├── marketplace/search/
│   └── assignments/
├── cost-intelligence/          # Costo e inteligencia (nuevo — 12 rutas)
│   ├── by-client/
│   ├── by-project/
│   ├── by-bu/
│   └── benchmarks/
├── ai-credits/                 # Wallets, ledger, consume, reload, summary
│   ├── wallets/
│   ├── ledger/
│   ├── consume/
│   └── reload/
├── ai-tools/                   # Catalog, licenses (user-facing)
│   ├── catalog/
│   ├── my-licenses/
│   └── usage/
├── admin/
│   ├── tenants/                # Capabilities, contacts, logo
│   │   ├── [id]/
│   │   ├── [id]/capabilities/
│   │   └── [id]/logo/
│   ├── users/                  # Roles, avatar
│   │   ├── list/
│   │   ├── [id]/
│   │   └── [id]/avatar/
│   ├── ai-tools/               # Catalog, licenses, wallets, meta (admin)
│   │   ├── catalog/
│   │   ├── wallets/
│   │   └── [id]/meta/
│   ├── team/                   # Members, assignments, meta
│   │   ├── members/
│   │   ├── assignments/
│   │   └── meta/
│   └── notifications/          # Notifications templates, alerts (nuevo — 9 rutas)
│       ├── templates/
│       ├── alerts/
│       ├── delivery-log/
│       └── preferences/
├── scim/v2/                    # SCIM 2.0 provisioning (nuevo — 8 rutas)
│   ├── ServiceProviderConfig
│   ├── ResourceTypes
│   ├── Schemas
│   ├── Users
│   │   ├── list/
│   │   ├── create/
│   │   ├── [id]/
│   │   └── [id]/patch/
│   └── Groups
│       ├── list/
│       ├── create/
│       └── [id]/
├── integrations/v1/            # Tenants, capabilities catalog, sync
│   ├── tenants/
│   ├── capabilities/
│   └── sync/
├── internal/                   # Greenhouse AI agent
│   ├── agent/
│   └── chat/
├── media/                      # Logo/avatar serving
│   ├── logo/
│   └── avatar/
├── webhooks/                   # Inbound webhooks (nuevo — 12 rutas)
│   ├── hubspot/
│   ├── notion/
│   ├── nubox/
│   └── test/
└── cron/                       # Outbox publisher, ICO materialization, sync conformed
    ├── sync-outbox/
    ├── sync-conformed/
    ├── ico-materialization/
    ├── webhook-retry/
    ├── cost-anomaly-detection/
    └── report-generation/
```

## Lib Layer — Catálogo completo de módulos (55 módulos)

La capa `src/lib/` contiene toda la lógica de negocio, queries, y transformaciones:

### Módulos de tenencia y contexto (4)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| `tenant/` | 6 | Contexto de tenant, autorización, resolución de acceso, multi-tenancy |
| `contacts/` | 1 | Resolución de display names, formateo de identidades |
| `ids/` | 1 | Generación de public IDs (EO-*), slug generation |
| `config/` | 3 | Nomenclatura canónica, constantes de aplicación |

### Módulos de lectura (dashboards, reportes) (8)

| Módulo | Archivos | Fuente | Responsabilidad |
|--------|----------|--------|-----------------|
| `dashboard/` | 2 | BigQuery | Agregación de KPIs, tendencias, calidad, riesgos |
| `projects/` | 2 | BigQuery | Lista de proyectos, detalle, tareas, sprint context |
| `agency/` | 1 | BigQuery | Queries de agencia, pulse, spaces |
| `team-capacity/` | 1 | In-memory | Cálculos de capacidad y utilización |
| `ico-engine/` | 5 | BigQuery | Schema, metric registry, materialización, read metrics |
| `person-intelligence/` | 2 | PostgreSQL + BigQuery | Análisis de performance, engagement |
| `member-capacity-economics/` | 2 | PostgreSQL | Análisis de económica de capacidad |
| `analytics/` | 2 | BigQuery | Queries de análisis custom |

### Módulos de identidad y acceso (7)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| `person-360/` | 5 | Identidad canónica, resolución de persona, contextos |
| `account-360/` | 4 | Organizations, identity, ID generation, store |
| `identity/` | 6 | Reconciliation engine, matching, normalization |
| `space-notion/` | 1 | Space-Notion source mapping |
| `scim/` | 8 | SCIM 2.0 provisioning, user sync, group sync |
| `secrets/` | 2 | Google Secret Manager, credenciales de integración |
| `postgres/` | 1 | Pool de conexión, transacciones, query runner |

### Módulos transaccionales — Dominio HR (9)

| Módulo | Archivos | Fuente | Responsabilidad |
|--------|----------|--------|-----------------|
| `people/` | 8 | BigQuery + PostgreSQL | Directorio, perfil 360, métricas |
| `hr-core/` | 4 | PostgreSQL | Leave, attendance, departments, HR metadata |
| `payroll/` | 18 | PostgreSQL | Períodos, compensación, cálculo, deductions Chile, export |
| `team-admin/` | 1 | PostgreSQL | Operaciones de mutación de equipo |
| `alerts/` | 2 | PostgreSQL | Slack alerts, alerting rules engine |
| `notifications/` | 4 | PostgreSQL | Notificaciones, templates, delivery |
| `email/` | 3 | Resend | React Email templates, transactional email |
| `calendar/` | 2 | In-memory/BigQuery | Calendario operativo, feriados |
| `nubox/` | 8 | Nubox API + BigQuery + PostgreSQL | Client HTTP, 3-phase sync, mappers |

### Módulos transaccionales — Dominio Finance (8)

| Módulo | Archivos | Fuente | Responsabilidad |
|--------|----------|--------|-----------------|
| `finance/` | 11 | PostgreSQL | Cuentas, ingresos, egresos, proveedores, reconciliación |
| `providers/` | 2 | PostgreSQL | Registro de proveedores, sync con finance |
| `commercial-cost-attribution/` | 4 | PostgreSQL + BigQuery | Asignación de costo por cliente, proyecto, BU |
| `cost-intelligence/` | 5 | PostgreSQL + BigQuery | Dashboard de costo, análisis de margen |
| `currency/` | 2 | BigQuery | Tasas de cambio, conversiones de moneda |
| `storage/` | 1 | Cloud Storage | Media assets (logos, avatares) |
| `nubox/` | 8 | [descrito arriba] | Sync de documentos tributarios chilenos |
| `accounting/` | 2 | PostgreSQL | Contabilidad, journal entries, reconciliación |

### Módulos transaccionales — Dominio CRM (4)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| `integrations/` | 4 | HTTP (HubSpot service) | Contratos, perfiles de empresa, contactos |
| `webhooks/` | 4 | PostgreSQL | Dispatcher inbound/outbound, retry logic |
| `campaigns/` | 5 | PostgreSQL | Campaign CRUD, lead scoring, outreach tracking |
| `agencies/` | 2 | PostgreSQL | Agency data, staff augmentation marketplace |

### Módulos transaccionales — AI & Extensiones (6)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| `ai/` | 2 | Vertex AI | Cliente GenAI, orquestación del agente Greenhouse |
| `ai-tools/` | 4 | PostgreSQL | Catálogo, créditos, licencias, wallets |
| `nexa/` | 6 | PostgreSQL + Vertex AI | AI agent framework, skill registry, execution |
| `services/` | 1 | PostgreSQL | Service CRUD con history tracking |
| `capabilities/` | 5 | In-memory registry | Resolución de módulos, verificación de acceso |
| `admin/` | 11 | PostgreSQL + BigQuery | Capabilities admin, provisioning, roles, tenant detail |

### Módulos de infraestructura (8)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| `db/` | 1 | Conexión centralizada Kysely |
| `postgres/client` | 1 | Cloud SQL Connector + Secret Manager |
| `sync/` | 1 | PostgreSQL → BigQuery, outbox consumer |
| `storage/` | 1 | Cloud Storage API wrapper |
| `logger/` | 2 | Structured logging con Sentry |
| `errors/` | 2 | Error codes, error response formatting |
| `auth/` | 3 | Session handling, JWT verification |
| `types/` | — | TypeScript type exports (140+ tables via Kysely codegen) |

**Total: 55 módulos, 165+ archivos, 4500+ líneas de lógica de negocio**

## Base de datos — Layer transaccional (PostgreSQL)

### Archivo centralizado de conexión

**`src/lib/db.ts`** — Único punto de entrada para toda conexión PostgreSQL:

```typescript
// Import para raw SQL
import { query } from '@/lib/db';

// Import para Kysely tipado
import { getDb } from '@/lib/db';

// Import para transacciones
import { withTransaction } from '@/lib/db';
```

### Connection pool (`src/lib/postgres/client.ts`)

- **Cloud SQL Connector** vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` (prioridad)
- **Fallback** a `GREENHOUSE_POSTGRES_HOST:PORT` para local + migrations
- **Secret Manager** para credenciales (username, password, database)
- **Fail-fast**: Aborta si `GREENHOUSE_POSTGRES_HOST` apunta a IP pública (no TCP directo)

### Migrations (`node-pg-migrate`)

**Comandos**:
```bash
pnpm migrate:create <nombre>      # Crear migración
pnpm migrate:up                    # Aplicar up a latest
pnpm migrate:down                  # Deshacer última
pnpm migrate:status                # Ver estado
```

**Flujo obligatorio**:
1. `pnpm migrate:create` → genera archivo timestamped
2. Editar SQL en archivo
3. `pnpm migrate:up` → auto-regenera tipos (`src/types/db.d.ts`)
4. Commit todo junto

**Tipos generados**: `src/types/db.d.ts` — 140+ tablas, tipos tipados vía `kysely-codegen`

## Base de datos — Layer analítica (BigQuery)

### Datasets (7 totales)

| Dataset | Propósito | Tablas |
|---------|-----------|--------|
| `greenhouse` | Tablas bootstrap tenant, identidades estáticas | 25+ |
| `notion_ops` | Proyectos, tareas, sprints (vía Notion ETL) | 10+ |
| `greenhouse_raw` | Raw events desde outbox PostgreSQL | 8+ |
| `greenhouse_conformed` | Conformed tables (clean, typed) | 35+ |
| `greenhouse_ico` | ICO Engine métricas materializadas | 12+ |
| `nubox_raw_snapshots` | Snapshots crudos de Nubox (facturas, impuestos) | 8+ |
| `nubox_conformed` | Datos Nubox limpios, reconciliados | 6+ |

**Total: 150+ tablas, 200+ GB de datos históricos**

## Patrón de datos dual: BigQuery + PostgreSQL

### Cuándo se usa BigQuery

- Dashboards cliente (KPIs, tendencias, charts)
- Proyectos y tareas (datos de Notion via `notion_ops`)
- Agency pulse y spaces (datos consolidados)
- Team members y assignments (para superficies de lectura)
- Capabilities resolution (datos de tenant)
- Bootstrap e identidad (tablas `greenhouse.*`)
- ICO Engine — métricas materializadas de delivery
- Nubox — raw snapshots y datos conformados
- Identity reconciliation — discovery de identidades no vinculadas

### Cuándo se usa PostgreSQL

- Payroll (compensaciones, períodos, entries, deductions)
- Finance (cuentas, ingresos, egresos, proveedores, reconciliación)
- HR Core (leave requests, balances, attendance, departments)
- Person 360 (identidad canónica, facets)
- AI Tools (catálogo, licencias, wallets, ledger)
- Team Admin (mutaciones de equipo)
- Identity store (linkeo de SSO, last login)
- Account 360 — organizations, spaces, person memberships
- Services — CRUD con history tracking
- Space-Notion sources — mapping de Notion DBs por espacio
- Notificaciones y alertas
- Campanias y outreach tracking
- Webhooks dispatcher y retry log

### Patrón Postgres-first con fallback

```typescript
// Patrón típico en un módulo lib
async function getData(params) {
  try {
    // Intenta PostgreSQL primero (con Kysely)
    const db = getDb();
    const result = await db
      .selectFrom('greenhouse_core.members')
      .selectAll()
      .where('client_id', '=', params.clientId)
      .execute();
    if (result.length > 0) return result;
  } catch (err) {
    // Si Postgres falla o no está configurado, cae a BigQuery
    console.warn('Postgres fallback to BigQuery', err);
  }
  // Fallback a BigQuery
  const [bqRows] = await bigquery.query({ query: bqSql });
  return bqRows;
}
```

## Arquitectura de eventos y webhooks

### Patrón Outbox

1. **Publicador**: Toda escritura en PostgreSQL publica evento a `greenhouse_sync.outbox_events`
2. **Consumer**: Cron `POST /api/cron/sync-outbox` (cada 5 minutos) consume eventos
3. **Dispatcher**: Envía eventos hacia BigQuery (sync), webhooks, notificaciones, alertas

### Tipos de eventos (50+ agregados)

```
PayrollPeriodClosed
PaymentProcessed
MemberHired
MemberDeactivated
CostAnomalyDetected
ProjectCompleted
CapabilityAssigned
CapabilityRevoked
LeaveRequestApproved
LeaveRequestRejected
FinanceReconciled
InvoiceGenerated
ContractSigned
NuboxSyncCompleted
CampaignLaunched
LeadConverted
```

### Webhooks dispatcher

**Outbound**:
- HubSpot: Sync de contracts, capabilities, deals
- Notion: Sync de projects, tasks, sprints
- Nubox: Trigger de 3-phase sync
- Custom integrations: Webhooks de cliente

**Retry logic**:
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 intentos, luego alertar en Slack
- Log en `greenhouse_sync.webhook_retry_log`

## Email system — React Email + Resend

### Templates tipadas (6 templates)

```
src/lib/email/templates/
├── PayrollReceipt.tsx           # Recibo de nómina
├── LeaveApprovalNotification.tsx # Notificación de permiso aprobado
├── ContractSignedNotification.tsx # Contrato firmado
├── InvoiceNotification.tsx      # Factura generada
├── CostAnomalyAlert.tsx         # Alerta de anomalía de costo
└── WelcomeEmail.tsx             # Bienvenida
```

### Envío

```typescript
import { Resend } from 'resend';
import { PayrollReceipt } from '@/lib/email/templates';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@greenhouse.efeoncepro.com',
  to: member.email,
  subject: 'Recibo de Nómina Período 2026-04',
  react: <PayrollReceipt period={period} />,
});
```

## Provisioning SCIM 2.0

### Rutas

```
POST /api/scim/v2/Users              # Create user
GET /api/scim/v2/Users               # List users
GET /api/scim/v2/Users/{id}          # Get user
PATCH /api/scim/v2/Users/{id}        # Update user
DELETE /api/scim/v2/Users/{id}       # Delete user

POST /api/scim/v2/Groups             # Create group
GET /api/scim/v2/Groups              # List groups
GET /api/scim/v2/Groups/{id}         # Get group
PATCH /api/scim/v2/Groups/{id}       # Update group
DELETE /api/scim/v2/Groups/{id}      # Delete group
```

### Sincronización

- **Azure AD ↔ Greenhouse**: Users, groups, active/inactive status
- **Google Workspace ↔ Greenhouse**: Users, groups, organizational units
- **Mapeo**: oid (SCIM) ← → identity_profile_id (Postgres)

## Composición de UI

### Jerarquía de componentes

```
@core/components/       ← Componentes MUI extendidos (Vuexy base)
  ├── custom-inputs/
  ├── customizer/
  ├── mui/
  └── option-menu/

@layouts/               ← Shell de la aplicación
  ├── components/horizontal/
  ├── components/vertical/
  └── styles/

@menu/                  ← Sistema de navegación
  ├── horizontal-menu/
  ├── vertical-menu/
  └── contexts/

src/components/         ← 40+ componentes de dominio Greenhouse
  ├── greenhouse/       ← Cards, team, metrics, branding
  ├── agency/           ← SpaceCard, CapacityOverview, Pulse
  ├── capabilities/     ← CapabilityCard, ModuleLayout
  ├── auth/             ← AuthSessionProvider
  ├── layout/           ← Header, Footer, Navigation wrappers
  ├── my/               ← Personal portal components (nuevo)
  ├── campaigns/        ← Campaign dashboard components (nuevo)
  └── cost-intel/       ← Cost intelligence visualizations (nuevo)

src/views/greenhouse/   ← 25+ vistas compuestas por ruta
  ├── dashboard/
  ├── admin/
  ├── finance/
  ├── payroll/
  ├── people/
  ├── hr-core/
  ├── internal/
  ├── ai-tools/
  ├── organizations/
  ├── campaigns/        ← (nuevo)
  ├── staff-augmentation/ ← (nuevo)
  └── cost-intelligence/ ← (nuevo)
```

### Patrón de composición de vistas

Cada vista de Greenhouse sigue un patrón consistente:

1. **Hero Section** — `ExecutiveHeroCard` o `CapabilityOverviewHero` con título, descripción y badges
2. **KPI Grid** — Fila de `MetricStatCard` con métricas clave
3. **Chart Grid** — Grid 2x2+ con gráficos de distribución, tendencia y comparación
4. **Data Sections** — `ExecutiveCardShell` wrapping tablas, listas o contenido de dominio
5. **Error Boundaries** — `SectionErrorBoundary` alrededor de cada sección mayor
6. **Empty States** — `EmptyState` para escenarios sin datos
7. **Acciones CTA** — Botones para crear, editar, exportar, compartir

## Estado de aplicación

### Server-side

- Las pages reciben datos via Server Components o fetches en layout
- Las API routes leen sesión con `getServerSession(authOptions)`
- El contexto de tenant se resuelve en cada request via middleware

### Client-side

- **Redux Toolkit** para estado global (settings, theme, chat, notifications)
- **React Hook Form** para formularios con validación Valibot
- **TanStack React Table** para tablas con sorting, filtering, paginación
- **useEffect + AbortController** para data fetching client-side
- **Skeletons** para estados de carga
- **SWR** para caching de datos fetched client-side

## Testing — Vitest + Testing Library

### Setup

```
src/test/
├── render.tsx                 # renderWithTheme helper con Redux, MUI theme
├── setup.ts                   # jsdom config, mocks globales
└── fixtures/                  # Test data factories
```

### Patrón de test

```typescript
// src/components/MyComponent.test.tsx
import { renderWithTheme } from '@/test/render';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithTheme(<MyComponent />);
    expect(getByText('Expected text')).toBeInTheDocument();
  });
});
```

### Ejecución

```bash
pnpm test                       # Run all tests
pnpm test:watch                 # Watch mode
pnpm test:coverage              # Coverage report
```

## Scripts — Catálogo de 165+ scripts

Located in `scripts/` directorio:

### Setup & Bootstrap (8 scripts)

- `init-db.ts` — Inicializar base de datos, schemas, users
- `seed-greenhouse.ts` — Seed de datos de prueba
- `seed-tenants.ts` — Seed de tenants
- `create-admin-user.ts` — Crear usuario admin
- `setup-gcp-resources.ts` — Crear datasets BigQuery, Cloud SQL
- `setup-webhooks.ts` — Configurar webhooks en integraciones
- `verify-connections.ts` — Verificar conexiones a todas las fuentes
- `migrate-from-v1.ts` — Migración desde v1

### Sync & Backfill (24 scripts)

- `sync-hubspot-contracts.ts` — Sincronizar contratos desde HubSpot
- `sync-hubspot-deals.ts` — Sincronizar deals
- `sync-notion-projects.ts` — Sincronizar proyectos desde Notion
- `sync-identity-profiles.ts` — Reconciliar identidades
- `backfill-payroll-entries.ts` — Llenar períodos de nómina históricos
- `backfill-finance-accounts.ts` — Llenar cuentas financieras
- `sync-bigquery-conformed.ts` — Actualizar tablas conformed
- `sync-nubox-invoices.ts` — Sincronizar facturas desde Nubox
- `backfill-ico-metrics.ts` — Llenar métricas de ICO
- [16 más...]

### Data Quality & Validation (18 scripts)

- `validate-payroll-entries.ts` — Validar entries de nómina
- `validate-finance-reconciliation.ts` — Validar reconciliación
- `validate-identity-duplicates.ts` — Detectar duplicados de identidad
- `audit-access-control.ts` — Auditar roles y permisos
- `check-data-completeness.ts` — Verificar completitud de datos
- [13 más...]

### Smoke Tests (12 scripts)

- `smoke-test-api-routes.ts` — Probar todas las rutas
- `smoke-test-webhooks.ts` — Probar webhooks inbound/outbound
- `smoke-test-email-delivery.ts` — Probar envío de emails
- [9 más...]

### ETL & Materialization (18 scripts)

- `materialize-ico-metrics.ts` — Materializar métricas de ICO
- `materialize-person-360.ts` — Materializar vistas de persona
- `materialize-financial-dashboards.ts` — Materializar financiero
- `refresh-cost-intelligence.ts` — Refrescar inteligencia de costos
- [14 más...]

### Maintenance & Operations (28 scripts)

- `cleanup-old-events.ts` — Limpiar eventos viejos del outbox
- `archive-old-deployments.ts` — Archivar despliegues antiguos
- `refresh-bigquery-stats.ts` — Actualizar estadísticas
- `vacuum-database.ts` — Maintenance de PostgreSQL
- `backup-database.ts` — Backup de PostgreSQL
- [23 más...]

### Reporting & Analytics (20 scripts)

- `generate-monthly-payroll-report.ts` — Reporte mensual de nómina
- `generate-financial-summary.ts` — Resumen financiero
- `generate-capacity-utilization-report.ts` — Utilización de capacidad
- `generate-cost-analysis-report.ts` — Análisis de costo
- [16 más...]

### Debugging & Diagnostics (15 scripts)

- `pg-doctor.ts` — Diagnóstico de salud PostgreSQL
- `bigquery-doctor.ts` — Diagnóstico de salud BigQuery
- `trace-webhook-delivery.ts` — Trazar entrega de webhooks
- `debug-identity-sync.ts` — Debuggear sync de identidades
- [11 más...]

### Development Utilities (22 scripts)

- `generate-types.ts` — Regenerar tipos Kysely
- `generate-migration.ts` — Generar migración
- `seed-test-data.ts` — Seed datos para test
- `export-test-fixtures.ts` — Exportar fixtures
- [18 más...]

## Decisiones arquitectónicas clave

1. **App Router sobre Pages Router**: Aprovecha Server Components, layouts anidados y streaming.

2. **Vuexy como base, no como fork**: Los componentes de Greenhouse se componen sobre Vuexy (`@core`, `@layouts`, `@menu`) sin modificar la base.

3. **JWT sobre database sessions**: NextAuth usa strategy JWT para evitar round-trips de sesión.

4. **BigQuery para lectura, PostgreSQL para escritura**: Separación clara de responsabilidades.

5. **Outbox pattern para consistencia eventual**: Las escrituras en PostgreSQL publican eventos que un consumer periódico sincroniza hacia BigQuery.

6. **force-dynamic en todas las API routes**: Previene caching de datos sensibles a sesión.

7. **Cloud SQL Connector**: Sin TCP directo, negociación de túnel seguro vía Cloud SQL Admin API.

8. **Kysely para type-safety**: Query builder tipado, auto-completion, migraciones versionadas.

9. **SCIM 2.0 para provisioning**: Sincronización bidireccional con Azure AD, Google Workspace.

10. **Event-driven notifications**: Outbox → webhooks + email + Slack alerts.

11. **Sentry para observabilidad**: Error tracking, performance monitoring, session replay.

12. **React Email + Resend**: Templates tipadas, no hardcoded, inbox preview.

## Observabilidad

### Sentry (@sentry/nextjs)

- Error tracking con source maps
- Performance monitoring (API routes, page loads)
- Session replay para debugging
- Release tracking con GitHub

### Cloud Logging (GCP)

- Structured logs indexados por trace_id
- JSON payloads con contexto de tenant, user, request
- Alertas automáticas para errores críticos

### Métricas custom (BigQuery)

- Query latency por módulo
- Webhook delivery success rate
- Cost anomaly detection
- Payroll processing duration
