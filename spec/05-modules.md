# Greenhouse Portal — Módulos Funcionales

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: 55 módulos funcionales, SCIM, Identity reconciliation, Google Secret Manager, Vercel OIDC, View access governance, Integration auth, Cron auth

---

## Visión general

Greenhouse organiza su funcionalidad en 55 módulos de dominio en `src/lib/`, cada uno con su propia capa de datos, lógica de negocio, API routes y vistas.

---

## 1. Dashboard & Home

### `dashboard`

**Ubicación**: `src/lib/dashboard/`

Resumen ejecutivo del cliente: KPIs (RpA, Completed, OTD, Feedback), charts (status distribution, delivery cadence, RpA by project, OTD trend), team capacity, ecosystem tooling, AI credits, portfolio health, attention projects.

**Fuente**: BigQuery (`notion_ops`)

**API**: `/api/dashboard/*` (summary, kpis, charts, risks)

---

### `home`

**Ubicación**: `src/lib/home/`

Página de bienvenida post-login. Redirección a `portalHomePath` según tenant.

---

### `internal`

**Ubicación**: `src/lib/internal/`

Dashboard interno para equipo Efeonce. Métricas transversales, operaciones globales, Greenhouse Agent.

**API**: `/api/internal/greenhouse-agent`

---

## 2. Proyectos y Sprints

### `projects`

**Ubicación**: `src/lib/projects/`

Lista y detalle de proyectos. Metadata, sprint context, review pressure, performance indicators, tasks.

**Fuente**: BigQuery (`greenhouse_conformed`, `notion_ops`)

**API**: `/api/projects/*`

**Vistas**: `src/views/greenhouse/projects/`

---

### `sprints`

**Ubicación**: `src/lib/sprints/`

Contexto de sprint. ID, name, status, dates, task counts, progress.

**Fuente**: BigQuery

**API**: Via `/api/projects/[id]/sprints`

---

## 3. Team & Capacity

### `team-admin`

**Ubicación**: `src/lib/team-admin/`

CRUD de miembros y asignaciones del equipo. Admin only.

**Fuente**: PostgreSQL (`greenhouse_core`)

**API**: `/api/admin/team/*`

---

### `team-capacity`

**Ubicación**: `src/lib/team-capacity/`

Cálculos de capacidad y utilización. FTE allocation, assigned hours, utilization %, health buckets (idle, balanced, high, overloaded).

**Métricas**:
- idle: < 30% utilización
- balanced: 30-85%
- high: 85-100%
- overloaded: > 100%

**Dimensiones**: por rol, proyecto, sprint, agencia.

---

### `member-capacity-economics`

**Ubicación**: `src/lib/member-capacity-economics/`

Datos financieros por persona: ingresos, costos, margen. Attribution por asignación y período.

**Fuente**: PostgreSQL + BigQuery

---

## 4. People & Identity

### `people`

**Ubicación**: `src/lib/people/`

Directorio de personas. Lista con búsqueda, filtros (rol, ubicación, estado).

**Fuente**: BigQuery + PostgreSQL

**API**: `/api/people` (list, meta)

**Vistas**: `src/views/greenhouse/people/`

---

### `person-360`

**Ubicación**: `src/lib/person-360/`

Vista 360 de una persona: member, access, summary, integrations, capacity, finance, assignments, compensation, payroll, hrContext, deliveryContext.

**Materialización**: `greenhouse_serving.person_360`

**API**: `/api/people/[memberId]`, `/api/people/[memberId]/{hr,delivery,finance}`

---

### `person-intelligence`

**Ubicación**: `src/lib/person-intelligence/`

Inteligencia agregada sobre una persona: tendencias, habilidades, performance, proyecciones.

---

### `identity`

**Ubicación**: `src/lib/identity/`

Motor de identidad canónica. Consolidación de `client_users`, `team_members`, `identity_profiles`. Resolución de acceso.

**Subfolder**: `reconciliation/` — Motor de reconciliación de identidades (Notion + HubSpot + Azure AD + SCIM).

**Subfolder**: `state-machine/` — Estados canónicos (active, missing_principal, degraded_link, inactive).

**API**: Indirect vía auth routes

---

## 5. HR Core

### `hr-core`

**Ubicación**: `src/lib/hr-core/`

Operaciones de RRHH: departments, leave management, attendance.

**Subfolder**: `departments/` — CRUD jerárquico

**Subfolder**: `leave/` — Workflow de permisos, balances, requests

**Subfolder**: `attendance/` — Registro diario, fuentes (manual, Teams webhook)

**Fuente**: PostgreSQL (`greenhouse_core`, `greenhouse_hr`)

**API**: `/api/hr/core/*`

**Vistas**: `src/views/greenhouse/hr/`

---

## 6. Payroll

### `payroll`

**Ubicación**: `src/lib/payroll/`

Gestión completa de nómina Chile. Períodos, cálculo de bonos (OTD, RPA), deducciones (AFP, FONASA, ISAPRE, impuesto), exports (Excel, PDF).

**Subfolder**: `auto-calculate/` — Motor de auto-cálculo con reglas Chile-specific

**Subfolder**: `compensation/` — Versionado temporal, vigencia

**API**: `/api/hr/payroll/*` (periods, entries, compensation, members)

**Vistas**: `src/views/greenhouse/payroll/`

---

## 7. Finance

### `finance`

**Ubicación**: `src/lib/finance/`

Gestión financiera integral: accounts, income, expenses, suppliers, reconciliation, exchange rates.

**Subfolder**: `accounts/` — Cuentas bancarias multi-currency

**Subfolder**: `income/` — Ingresos, pagos, status workflow

**Subfolder**: `expenses/` — Gastos, bulk upload, candidates para payroll

**Subfolder**: `suppliers/` — Proveedor CRUD

**Subfolder**: `reconciliation/` — Sesiones, matching, auto-match

**Subfolder**: `exchange-rates/` — Tipos de cambio, sync diario

**Fuente**: PostgreSQL (`greenhouse_finance`)

**API**: `/api/finance/*`

**Vistas**: `src/views/greenhouse/finance/`

---

## 8. Cost Intelligence

### `cost-intelligence`

**Ubicación**: `src/lib/cost-intelligence/`

P&L operacional, cierre de período, cost attribution. Análisis de rentabilidad.

**Subfolder**: `operational-pl/` — P&L por espacio, proyecto, miembro

**Subfolder**: `period-closure/` — Workflow de cierre

**Subfolder**: `cost-attribution/` — Member-period attribution con classification rules

---

## 9. Commercial Cost Attribution

### `member-period-attribution`

**Ubicación**: `src/lib/member-period-attribution/`

Atribución de costos de miembro por período y asignación. Classification de horas (billable, internal, overhead).

---

## 10. Agency

### `agency`

**Ubicación**: `src/lib/agency/`

Vista transversal de agencia: pulse, spaces, capacity, performance.

**Subfolder**: `finance/` — Métricas financieras agregadas

**Subfolder**: `queries/` — Queries complejas de agencia

**Subfolder**: `space-360/` — Detalle de espacio con salud integral

**Fuente**: BigQuery

**API**: `/api/agency/*`

**Vistas**: `src/views/greenhouse/agency/`

---

## 11. Account 360 / Organizations

### `account-360`

**Ubicación**: `src/lib/account-360/`

Vista B2B unificada: organizations (entidades jurídicas), spaces (operativos), person memberships, relationships.

**Subfolder**: `org-store/` — CRUD de organizaciones

**Subfolder**: `identity/` — Resolution por tax ID, creación automática para suppliers

**Subfolder**: `economics/` — Análisis económico por org

**Subfolder**: `executive/` — Datos ejecutivos

**Subfolder**: `projects/` — Proyectos asociados

**Fuente**: PostgreSQL (`greenhouse_core`)

**API**: `/api/organizations/*`

**Vistas**: `src/views/greenhouse/organizations/`

---

## 12. Services

### `services`

**Ubicación**: `src/lib/services/`

CRUD de servicios de Efeonce. Vinculación a espacios, organizaciones, HubSpot deals, Notion projects. History tracking field-level.

**Subfolder**: `crud/` — Create, read, update, delete

**Subfolder**: `history/` — Audit trail

**Fuente**: PostgreSQL (`greenhouse_core`)

**API**: `/api/agency/services/*`

---

## 13. Campaigns

### `campaigns`

**Ubicación**: `src/lib/campaigns/`

CRUD de campañas. Metrics, extended data, backfill heuristics.

**Subfolder**: `store/` — CRUD

**Subfolder**: `metrics/` — Cálculos de métricas

**Subfolder**: `extended/` — Datos enriquecidos

**Subfolder**: `backfill-heuristics/` — Inferencia de datos históricos

**Fuente**: BigQuery

---

## 14. Staff Augmentation

### `staff-augmentation`

**Ubicación**: `src/lib/staff-augmentation/`

Gestión de placements y SLA. Snapshots de capacidad, tracking de servicios.

**Subfolder**: `placements/` — CRUD

**Subfolder**: `snapshots/` — Histórico de estado

**Subfolder**: `sla-tracking/` — Cumplimiento de SLA

---

## 15. ICO Engine (Delivery Intelligence)

### `ico-engine`

**Ubicación**: `src/lib/ico-engine/`

Motor de inteligencia de delivery. Materialización de métricas (RPA, OTD, FTR, cycle time, stuck assets) desde datos Notion.

**Subfolder**: `materialization/` — Cálculo y persistencia de snapshots

**Subfolder**: `metrics/` — Registry de 10 métricas con umbrales (optimal, attention, critical)

**Subfolder**: `performance-reports/` — Reportes históricos

**Subfolder**: `historical-reconciliation/` — Validación de datos históricos

**Subfolder**: `stuck-assets/` — Tareas estancadas 72h+

**Fuente**: BigQuery (`greenhouse_ico`, `greenhouse_conformed`)

**API**: `/api/ico-engine/*`

**Cron**: `/api/cron/ico-materialize`

---

## 16. Nubox Integration

### `nubox`

**Ubicación**: `src/lib/nubox/`

Integración con Nubox (contabilidad chilena). Sincronización de DTEs: ventas, compras, egresos, ingresos bancarios.

**Pipeline de 3 fases**:
1. **Raw** — Fetch API Nubox → BigQuery `nubox_raw_snapshots`
2. **Conformed** — Transform + identity resolution → BigQuery `nubox_conformed`
3. **Postgres** — Project → PostgreSQL `greenhouse_finance`

**Subfolder**: `client/` — Cliente HTTP con retry, paginación

**Subfolder**: `mappers/` — Transformaciones Sale/Purchase/Expense/Income

**Subfolder**: `emission/` — Lógica de emisión de DTEs

**API**: `/api/finance/nubox/*`, `/api/cron` (sync job)

---

## 17. AI & GenAI

### `ai`

**Ubicación**: `src/lib/ai/`

Cliente GenAI para integración con Vertex AI. Modos: plan, pair, review, implement.

**Subfolder**: `vertex-ai-client/` — SDK Vertex AI

**Subfolder**: `agent/` — Agente Greenhouse con context

---

### `ai-tools`

**Ubicación**: `src/lib/ai-tools/`

Catálogo de herramientas AI. Vendors, categorías, modelos de costo.

**API**: `/api/ai-tools/*`, `/api/admin/ai-tools/*`

---

### `nexa`

**Ubicación**: `src/lib/nexa/`

Integración con Nexa (proveedor externo AI). Service, tools, contracts.

---

## 18. Notifications

### `notifications`

**Ubicación**: `src/lib/notifications/`

Sistema de notificaciones. Service, recipient resolver, schema.

**Subfolder**: `service/` — Dispatcher de notificaciones

**Subfolder**: `recipient-resolver/` — Resolución de destinatarios

**Subfolder**: `schema/` — Definiciones de eventos notificables

**API**: `/api/admin/notifications/*`, `/api/cron/notifications/send`

---

### `alerts`

**Ubicación**: `src/lib/alerts/`

Alertas y escalaciones. Integración Slack, webhooks.

**Subfolder**: `slack/` — Formatter y dispatcher Slack

---

## 19. Email

### `email`

**Ubicación**: `src/lib/email/`

Entrega de emails, templates, subscriptions.

**Subfolder**: `delivery/` — Envío via SES/SendGrid

**Subfolder**: `templates/` — Template engine

**Subfolder**: `subscriptions/` — Gestión de suscripciones

**API**: `/api/admin/email/*`

---

## 20. Webhooks

### `webhooks`

**Ubicación**: `src/lib/webhooks/`

Infraestructura de webhooks inbound/outbound, signing, retry policy.

**Subfolder**: `dispatcher/` — Orquestación de dispatch

**Subfolder**: `inbound/` — Handlers: HubSpot, Nubox, Notion, custom

**Subfolder**: `outbound/` — Suscriptores, suscripciones

**Subfolder**: `signing/` — HMAC para validación

**Subfolder**: `retry-policy/` — Reintentos exponenciales

**Subfolder**: `consumers/` — Consumidores registrados

**Subfolder**: `handlers/` — Handlers por sistema

**API**: `/api/webhooks/inbound/*`, `/api/webhooks/dispatch`, `/api/cron/webhook-dispatch`

---

## 21. Sync & Events

### `sync`

**Ubicación**: `src/lib/sync/`

Event catalog (50+ tipos agregados), outbox consumer, publish, projection registry.

**Subfolder**: `event-catalog/` — Definiciones: `identity.*`, `organization.*`, `member.*`, `payroll.*`, `finance.*`, `campaign.*`, `service.*`, etc.

**Subfolder**: `outbox/` — Tabla PostgreSQL de eventos sin procesar

**Subfolder**: `publish/` — Publisher hacia BigQuery + webhooks

**Subfolder**: `projection-registry/` — Registro de proyecciones reactivas

**API**: `/api/cron/outbox-publish`

---

## 22. Space-Notion

### `space-notion`

**Ubicación**: `src/lib/space-notion/`

Sincronización con Notion. Governance, contract reconciliation, performance report publication.

**Subfolder**: `governance/` — Reglas y contratos

**Subfolder**: `contract/` — Validación de estructura

**Subfolder**: `performance-report-publication/` — Publicación de reportes en Notion

**Subfolder**: `notion-client/` — SDK Notion

---

## 23. Capabilities

### `capabilities`

**Ubicación**: `src/lib/capabilities/`

Sistema modular de capabilities. Resolución, verificación, contenido del módulo.

**Subfolder**: `resolve/` — Resolver módulos por tenant

**Subfolder**: `verify/` — Verificación de acceso

**Subfolder**: `module-content/` — Datos específicos del módulo

**API**: `/api/capabilities/*`

---

## 24. SCIM

### `scim`

**Ubicación**: `src/lib/scim/`

Provisioning SCIM 2.0. Auth, users, groups, formatters.

**Subfolder**: `auth/` — Validación de bearer tokens

**Subfolder**: `provisioning/` — Lógica de provisioning (create, update, delete)

**Subfolder**: `groups/` — Gestión de grupos

**Subfolder**: `formatters/` — Conversión SCIM ↔ Greenhouse

**API**: `/api/scim/v2/*`

---

## 25. Calendar

### `calendar`

**Ubicación**: `src/lib/calendar/`

Calendario operativo, feriados, días de negocio. Timezone canónica: `America/Santiago`.

**Subfolder**: `operational-calendar/` — Calendario canónico (fechas, feriados)

**Subfolder**: `nager-date-holidays/` — Integración con Nager.Date API

**Subfolder**: `business-days/` — Cálculo de días de negocio

---

## 26. Tenant & Authorization

### `tenant`

**Ubicación**: `src/lib/tenant/`

Contexto de tenant, autorización, acceso.

**Subfolder**: `context/` — Resolución de contexto

**Subfolder**: `authorization/` — Predicados de autorización

**Subfolder**: `access/` — Helpers de acceso (requireClientTenantContext, etc.)

---

### `my`

**Ubicación**: `src/lib/my/`

Recursos personales. Membresía, perfil, preferencias.

---

## 27. Storage

### `storage`

**Ubicación**: `src/lib/storage/`

Assets y media. Upload, serving, cleanup.

**Subfolder**: `assets/` — Gestión de assets

**Subfolder**: `media/` — Serving de imágenes (logos, avatars)

**API**: `/api/media/*`

---

## 28. Cloud & Infrastructure

### `cloud`

**Ubicación**: `src/lib/cloud/`

Integración con Google Cloud. BigQuery, cron contracts.

**Subfolder**: `bigquery/` — Cliente BigQuery, queries, materialization

**Subfolder**: `cron/` — Contratos y helpers de cron

---

### `postgres`

**Ubicación**: `src/lib/postgres/`

Cliente PostgreSQL centralizado. Cloud SQL Connector, pooling, perfiles.

**Subfolder**: `client/` — Inicialización y management de pool

**Subfolder**: `access-control/` — Perfiles (runtime, migrator, admin, ops)

---

### `db`

**Ubicación**: `src/lib/db/`

Kysely ORM tipado. Query builder, migrations.

**Subfolder**: `types/` — Tipos generados (`db.d.ts`, 140 tablas)

---

### `secrets`

**Ubicación**: `src/lib/secrets/`

Google Secret Manager. Resolución centralizada de credenciales.

**Subfolder**: `client/` — SecretClient API

**Subfolder**: `caching/` — In-memory cache con TTL

---

### `cron`

**Ubicación**: `src/lib/cron/`

Autenticación y helpers de Vercel Cron.

**Subfolder**: `auth/` — Validación de CRON_SECRET

---

## Dependencias entre módulos

**Orden de inicialización**:

1. **Infrastructure**: `postgres`, `cloud`, `secrets`, `cron`
2. **Core Identity**: `identity`, `tenant`, `access`
3. **Data**: `sync`, `finance`, `hr-core`, `payroll`
4. **Business Logic**: `projects`, `team-capacity`, `ico-engine`, `agencies`, `services`
5. **Integration**: `webhooks`, `nubox`, `space-notion`, `scim`
6. **UI/Presentation**: `dashboard`, `capabilities`, `people`, `organizations`
7. **Support**: `notifications`, `email`, `alerts`, `storage`

---

## Resumen estadístico

| Categoría | Módulos |
|-----------|---------|
| Gestión de Personas | 4 |
| HR & Payroll | 2 |
| Finance | 2 |
| Delivery & ICO | 2 |
| Inteligencia de Negocio | 3 |
| Integraciones | 7 |
| Notificaciones & Comunicación | 3 |
| Autenticación & Seguridad | 4 |
| Almacenamiento & Media | 1 |
| Cloud & Infraestructura | 5 |
| Operaciones & Admin | 3 |
| Calendarios & Utilidades | 1 |
| **TOTAL** | **55** |
