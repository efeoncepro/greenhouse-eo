# Greenhouse Portal — Arquitectura de Alto Nivel

> Versión: 1.0
> Fecha: 2026-03-15

---

## Diagrama de capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  React 19 + MUI 7 + Vuexy Shell + ApexCharts + Recharts        │
│  Redux Toolkit (state) · React Hook Form (forms)                │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (fetch, no-store)
┌────────────────────────────▼────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Pages (SSR)  │  │ Layouts      │  │ API Routes (/api/*)   │  │
│  │ /(dashboard) │  │ (dashboard)  │  │ force-dynamic         │  │
│  │ /(blank)     │  │ (blank)      │  │ JWT session check     │  │
│  └──────┬───────┘  └──────────────┘  └──────────┬────────────┘  │
│         │                                        │               │
│  ┌──────▼────────────────────────────────────────▼────────────┐  │
│  │                    LIB LAYER (src/lib/*)                    │  │
│  │                                                             │  │
│  │  tenant/     dashboard/   projects/   people/   person-360/ │  │
│  │  admin/      agency/      capabilities/ finance/ payroll/   │  │
│  │  hr-core/    ai/          ai-tools/   integrations/         │  │
│  │  team-capacity/ team-admin/ storage/  sync/  ids/  postgres/│  │
│  └────────┬──────────────────────────┬─────────────────────────┘  │
│           │                          │                            │
│  ┌────────▼─────────┐  ┌────────────▼──────────────┐            │
│  │   BigQuery SDK   │  │   PostgreSQL (pg Pool)     │            │
│  │   @google-cloud  │  │   Cloud SQL Connector      │            │
│  └────────┬─────────┘  └────────────┬──────────────┘            │
└───────────┼──────────────────────────┼──────────────────────────┘
            │                          │
   ┌────────▼─────────┐  ┌────────────▼──────────────┐
   │  Google BigQuery  │  │  Cloud SQL (PostgreSQL)    │
   │  Dataset:         │  │  Instance:                 │
   │  greenhouse       │  │  greenhouse-pg-dev         │
   │  notion_ops       │  │                            │
   │  greenhouse_raw   │  │  Schemas:                  │
   │  greenhouse_      │  │  greenhouse_core           │
   │  conformed        │  │  greenhouse_hr             │
   │                   │  │  greenhouse_payroll        │
   │                   │  │  greenhouse_finance        │
   │                   │  │  greenhouse_serving        │
   │                   │  │  greenhouse_sync           │
   └───────────────────┘  └───────────────────────────┘
```

## App Router — Estructura de rutas

Next.js App Router organiza las rutas en dos layout groups principales:

### `(dashboard)` — Layout con navegación

Todas las superficies autenticadas con sidebar, header y branding del tenant:

```
(dashboard)/
├── dashboard/              # Dashboard ejecutivo cliente
├── proyectos/              # Lista de proyectos
│   └── [id]/               # Detalle de proyecto
├── sprints/                # Vista de sprints
│   └── [id]/               # Detalle de sprint
├── settings/               # Configuración del tenant
├── updates/                # Actualizaciones
├── capabilities/[moduleId] # Módulo de capability
├── people/                 # Directorio de equipo
│   └── [memberId]/         # Perfil 360 de persona
├── hr/
│   ├── attendance/         # Registro de asistencia
│   ├── departments/        # Gestión de departamentos
│   ├── leave/              # Gestión de permisos
│   └── payroll/            # Nómina
│       └── member/[memberId]/ # Detalle payroll por persona
├── finance/
│   ├── clients/[id]/       # Clientes financieros
│   ├── income/[id]/        # Ingresos
│   ├── expenses/[id]/      # Egresos
│   ├── suppliers/[id]/     # Proveedores
│   └── reconciliation/[id]/ # Reconciliación
├── agency/
│   ├── spaces/             # Espacios/cuentas
│   └── capacity/           # Capacidad agencia
├── admin/
│   ├── users/[id]/         # Gestión de usuarios
│   ├── roles/              # Gestión de roles
│   ├── tenants/[id]/       # Gestión de tenants
│   │   ├── view-as/dashboard/              # Vista como cliente
│   │   └── capability-preview/[moduleId]/  # Preview de capability
│   ├── team/               # Gestión de equipo admin
│   └── ai-tools/           # Gestión de AI tools
├── internal/
│   └── dashboard/          # Dashboard interno Efeonce
├── about/                  # Info del portal
└── home/                   # Home page
```

### `(blank-layout-pages)` — Layout sin navegación

Páginas de autenticación y acceso público:

```
(blank-layout-pages)/
├── login/                  # Login con credentials/SSO
├── auth/access-denied/     # Página de acceso denegado
└── developers/api/         # Documentación de API (dev)
```

### Otras rutas raíz

```
auth/landing/               # Landing post-auth
[...not-found]/             # Catch-all 404
```

## API Routes — Organización

Todas las API routes viven bajo `src/app/api/` y siguen estos patrones:

1. **Todas son `force-dynamic`** — No se cachean. Cada request evalúa la sesión fresca.
2. **Todas verifican sesión** — Usan `getServerSession(authOptions)` + helpers de autorización.
3. **Respuestas JSON estándar** — `NextResponse.json()` con códigos HTTP apropiados.

```
api/
├── auth/[...nextauth]/     # Handler NextAuth (OAuth + credentials)
├── dashboard/              # KPIs, summary, charts, risks
├── projects/               # CRUD proyectos + tasks
├── team/                   # Members, capacity, by-project, by-sprint
├── people/                 # Directorio, detalle, HR context, delivery, finance
├── hr/
│   ├── core/               # Members, departments, attendance, leave
│   └── payroll/            # Periods, entries, compensation, export
├── finance/                # Accounts, income, expenses, suppliers, reconciliation, dashboard, exchange-rates
├── capabilities/           # Resolve, module data
├── agency/                 # Pulse, spaces, capacity
├── ai-credits/             # Wallets, ledger, consume, reload, summary
├── ai-tools/               # Catalog, licenses (user-facing)
├── admin/
│   ├── tenants/            # Capabilities, contacts, logo
│   ├── users/              # Roles, avatar
│   ├── ai-tools/           # Catalog, licenses, wallets, meta (admin)
│   └── team/               # Members, assignments, meta
├── integrations/v1/        # Tenants, capabilities catalog, sync
├── internal/               # Greenhouse AI agent
├── media/                  # Logo/avatar serving
└── cron/                   # Outbox publisher
```

## Lib Layer — Módulos de negocio

La capa `src/lib/` contiene toda la lógica de negocio, queries, y transformaciones. Cada módulo es un directorio con funciones exportadas que las API routes y pages consumen:

| Módulo | Archivos | Fuente de datos | Responsabilidad |
|--------|----------|-----------------|-----------------|
| `tenant/` | 6 | PostgreSQL, Session | Contexto de tenant, autorización, resolución de acceso |
| `dashboard/` | 2 | BigQuery | Agregación de KPIs, tendencias, calidad, riesgos |
| `projects/` | 2 | BigQuery | Lista de proyectos, detalle, tareas, sprint context |
| `people/` | 8 | BigQuery + PostgreSQL | Directorio, perfil 360, métricas, permisos |
| `person-360/` | 5 | PostgreSQL | Identidad canónica, resolución de persona, contextos |
| `hr-core/` | 4 | PostgreSQL | Leave, attendance, departments, HR metadata |
| `payroll/` | 18 | PostgreSQL | Períodos, compensación, cálculo, deductions Chile, export |
| `finance/` | 11 | PostgreSQL | Cuentas, ingresos, egresos, proveedores, reconciliación |
| `capabilities/` | 5 | In-memory registry | Resolución de módulos, verificación de acceso |
| `agency/` | 1 | BigQuery | Queries de agencia |
| `admin/` | 11 | PostgreSQL + BigQuery | Capabilities admin, provisioning, roles, tenant detail |
| `ai/` | 2 | Vertex AI | Cliente GenAI, orquestación del agente Greenhouse |
| `ai-tools/` | 4 | PostgreSQL | Catálogo, créditos, licencias, wallets |
| `integrations/` | 4 | HTTP (HubSpot service) | Contratos, perfiles de empresa, contactos |
| `team-capacity/` | 1 | In-memory | Cálculos de capacidad y utilización |
| `team-admin/` | 1 | PostgreSQL | Operaciones de mutación de equipo |
| `storage/` | 1 | Cloud Storage | Media assets (logos, avatares) |
| `sync/` | 1 | PostgreSQL → BigQuery | Consumidor de outbox events |
| `ids/` | 1 | In-memory | Generación de public IDs (EO-*) |
| `contacts/` | 1 | In-memory | Resolución de display names |
| `postgres/` | 1 | — | Pool de conexión, transacciones, query runner |
| `providers/` | 2 | PostgreSQL | Registro de proveedores, sync con finance |

## Patrón de datos dual: BigQuery + PostgreSQL

### Cuándo se usa BigQuery

- Dashboards cliente (KPIs, tendencias, charts)
- Proyectos y tareas (datos de Notion via `notion_ops`)
- Agency pulse y spaces (datos consolidados)
- Team members y assignments (para superficies de lectura)
- Capabilities resolution (datos de tenant)
- Bootstrap e identidad (tablas `greenhouse.*`)

### Cuándo se usa PostgreSQL

- Payroll (compensaciones, períodos, entries, deductions)
- Finance (cuentas, ingresos, egresos, proveedores, reconciliación)
- HR Core (leave requests, balances, attendance, departments)
- Person 360 (identidad canónica, facets)
- AI Tools (catálogo, licencias, wallets, ledger)
- Team Admin (mutaciones de equipo)
- Identity store (linkeo de SSO, last login)

### Patrón Postgres-first con fallback

```typescript
// Patrón típico en un módulo lib
async function getData(params) {
  try {
    // Intenta PostgreSQL primero
    const pgResult = await runGreenhousePostgresQuery(sql, values);
    if (pgResult.rows.length > 0) return pgResult.rows;
  } catch (err) {
    // Si Postgres falla o no está configurado, cae a BigQuery
    console.warn('Postgres fallback to BigQuery', err);
  }
  // Fallback a BigQuery
  const [bqRows] = await bigquery.query({ query: bqSql, params });
  return bqRows;
}
```

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

src/components/         ← Componentes de dominio Greenhouse
  ├── greenhouse/       ← Cards, team, metrics, branding
  ├── agency/           ← SpaceCard, CapacityOverview, Pulse
  ├── capabilities/     ← CapabilityCard, ModuleLayout
  ├── auth/             ← AuthSessionProvider
  └── layout/           ← Header, Footer, Navigation wrappers

src/views/greenhouse/   ← Vistas compuestas por ruta
  ├── dashboard/
  ├── admin/
  ├── finance/
  ├── payroll/
  ├── people/
  ├── hr-core/
  ├── internal/
  └── ai-tools/
```

### Patrón de composición de vistas

Cada vista de Greenhouse sigue un patrón consistente:

1. **Hero Section** — `ExecutiveHeroCard` o `CapabilityOverviewHero` con título, descripción y badges
2. **KPI Grid** — Fila de `MetricStatCard` con métricas clave
3. **Chart Grid** — Grid 2x2 con gráficos de distribución, tendencia y comparación
4. **Data Sections** — `ExecutiveCardShell` wrapping tablas, listas o contenido de dominio
5. **Error Boundaries** — `SectionErrorBoundary` alrededor de cada sección mayor
6. **Empty States** — `EmptyState` para escenarios sin datos

## Estado de aplicación

### Server-side

- Las pages reciben datos via Server Components o fetches en layout
- Las API routes leen sesión con `getServerSession(authOptions)`
- El contexto de tenant se resuelve en cada request

### Client-side

- **Redux Toolkit** para estado global (settings, theme, chat)
- **React Hook Form** para formularios con validación Valibot
- **TanStack React Table** para tablas con sorting, filtering, paginación
- **useEffect + AbortController** para data fetching client-side
- **Skeletons** para estados de carga

## Decisiones arquitectónicas clave

1. **App Router sobre Pages Router**: Aprovecha Server Components, layouts anidados y streaming.

2. **Vuexy como base, no como fork**: Los componentes de Greenhouse se componen sobre Vuexy (`@core`, `@layouts`, `@menu`) sin modificar la base. El directorio `full-version` es referencia local, no código productivo.

3. **JWT sobre database sessions**: NextAuth usa strategy JWT para evitar round-trips de sesión. El token contiene todo el contexto de autorización.

4. **BigQuery para lectura, PostgreSQL para escritura**: Separación clara de responsabilidades. BigQuery es el warehouse analítico; PostgreSQL es el store transaccional.

5. **Outbox pattern para consistencia eventual**: Las escrituras en PostgreSQL publican eventos que un consumer periódico sincroniza hacia BigQuery.

6. **force-dynamic en todas las API routes**: Previene caching de datos sensibles a sesión.

7. **Path aliases con @**: `@/lib/*`, `@/components/*`, `@/views/*` para imports limpios.

8. **Capability registry in-memory**: Los módulos de capability se resuelven desde un registro estático en código, no desde base de datos. La base de datos solo almacena qué capabilities tiene cada tenant.
