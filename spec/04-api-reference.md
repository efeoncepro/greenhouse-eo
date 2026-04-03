# Greenhouse Portal — Referencia de API Routes

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: 324 routes en 16 categorías, SCIM 2.0, Integration auth, Cron auth, Finance Intelligence, Nubox Sync, Organizations CRUD, ICO Engine metrics

---

## Convenciones generales

- Todas las rutas usan `export const dynamic = 'force-dynamic'` para evitar caching
- Autenticación vía `getServerSession(authOptions)` en cada request (excepto SCIM y Integration que usan bearer tokens)
- Respuestas en JSON con `NextResponse.json()`
- Errores estándar: 400 (bad request), 401 (no auth), 403 (forbidden), 404 (not found), 500 (server error)
- Formato de error: `{ "error": "mensaje descriptivo" }`
- Paginación: `{ items: [], total: number, page: number, pageSize: number }`

---

## 1. Autenticación y Cuentas (5 routes)

### `POST/GET /api/auth/[...nextauth]`

Handler de NextAuth.js. Gestiona OAuth flows, callbacks, sesión y tokens.

- **Auth**: No (es el propio endpoint de auth)
- **Proveedores**: Credentials, Azure AD, Google OAuth

### `POST /api/auth/logout`

Cerrar sesión.

- **Auth**: Sesión válida requerida

### `GET /api/auth/session`

Obtener sesión actual.

- **Auth**: Sesión válida requerida
- **Response**: `{ user: { email, name, roleCodes, [...] } }`

### `PUT /api/auth/profile`

Actualizar perfil de usuario (name, avatar).

- **Auth**: Sesión válida requerida

### `POST /api/auth/change-password`

Cambiar contraseña (solo credentials).

- **Auth**: Sesión válida requerida
- **Body**: `{ currentPassword, newPassword }`

---

## 2. Dashboard (4 routes)

### `GET /api/dashboard/summary`

Resumen ejecutivo del dashboard del cliente.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ scope, summary, relationship, accountTeam, tooling, qualitySignals, kpis }`

### `GET /api/dashboard/kpis`

KPIs del dashboard.

- **Auth**: `requireClientTenantContext()`
- **Response**: `GreenhouseDashboardKpi[]`

### `GET /api/dashboard/charts`

Datos para charts del dashboard (throughput, delivery, mix, quality).

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ throughput[], delivery[], statusMix[], projectRpaMix[], qualitySignals[] }`

### `GET /api/dashboard/risks`

Proyectos en riesgo con attention score.

- **Auth**: `requireClientTenantContext()`
- **Response**: `GreenhouseDashboardProjectRisk[]`

---

## 3. Proyectos y Sprints (8 routes)

### `GET /api/projects`

Lista de proyectos del tenant.

- **Auth**: `requireClientTenantContext()`
- **Query**: `page?`, `pageSize?`, `search?`, `status?`
- **Response**: `{ items: GreenhouseProjectListItem[], total, page, pageSize, scope }`

### `GET /api/projects/[id]`

Detalle de un proyecto.

- **Auth**: `requireClientTenantContext()` + `canAccessProject(tenant, id)`
- **Params**: `id` (string) — ID del proyecto
- **Response**: `{ project, sprintContext, reviewPressure, performance }`

### `GET /api/projects/[id]/tasks`

Tareas de un proyecto.

- **Auth**: `requireClientTenantContext()` + `canAccessProject(tenant, id)`
- **Params**: `id` (string) — ID del proyecto
- **Query**: `status?`, `assignee?`, `page?`, `pageSize?`
- **Response**: `{ tasks: GreenhouseProjectTaskItem[], projectId, projectName }`

### `GET /api/sprints`

Lista de sprints.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ items: SprintListItem[], total }`

### `GET /api/sprints/[id]`

Detalle de sprint.

- **Auth**: `requireClientTenantContext()`
- **Response**: `SprintDetail`

### `POST /api/projects`

Crear proyecto (admin only).

- **Auth**: `requireAdminTenantContext()`
- **Body**: `{ name, clientId, startDate, endDate }`

### `PUT /api/projects/[id]`

Actualizar proyecto.

- **Auth**: `requireAdminTenantContext()`

### `DELETE /api/projects/[id]`

Archivar proyecto.

- **Auth**: `requireAdminTenantContext()`

---

## 4. Team & Capacity (8 routes)

### `GET /api/team/members`

Miembros del equipo asignado al tenant.

- **Auth**: `requireClientTenantContext()`
- **Query**: `role?`, `capacity?`, `page?`, `pageSize?`
- **Response**: `{ members: TeamMemberResponse[], totalFte, serviceLines[], totalMembers }`

### `GET /api/team/capacity`

Capacidad y utilización del equipo.

- **Auth**: `requireClientTenantContext()`
- **Query**: `year?`, `month?`
- **Response**: `TeamCapacityPayload` con summary, members, roleBreakdown, healthBuckets

### `GET /api/team/by-project/[projectId]`

Equipo asignado a un proyecto específico.

- **Auth**: `requireClientTenantContext()`
- **Params**: `projectId` (string)
- **Response**: `TeamByProjectPayload`

### `GET /api/team/by-sprint/[sprintId]`

Equipo activo en un sprint.

- **Auth**: `requireClientTenantContext()`
- **Params**: `sprintId` (string)
- **Response**: `TeamBySprintPayload`

### `POST /api/admin/team/members`

Crear miembro del equipo.

- **Auth**: `requireAdminTenantContext()`
- **Body**: `{ firstName, lastName, email, roleTitle, roleCategory, location }`

### `PUT /api/admin/team/members/[memberId]`

Actualizar miembro.

- **Auth**: `requireAdminTenantContext()`

### `POST /api/admin/team/members/[memberId]/deactivate`

Desactivar miembro.

- **Auth**: `requireAdminTenantContext()`

### `POST /api/admin/team/assignments`

Crear asignación de miembro a proyecto.

- **Auth**: `requireAdminTenantContext()`
- **Body**: `{ memberId, projectId, role, startDate, endDate }`

---

## 5. People & Organizations (34 routes)

### `GET /api/people`

Directorio de personas del equipo.

- **Auth**: `requirePeopleTenantContext()`
- **Query**: `search?`, `role?`, `location?`, `page?`, `pageSize?`
- **Response**: `{ items: PersonListItem[], total, page, pageSize, meta }`

### `GET /api/people/meta`

Metadata del módulo People (filtros disponibles, conteos).

- **Auth**: `requirePeopleTenantContext()`
- **Response**: `PeopleMetaPayload`

### `GET /api/people/[memberId]`

Detalle 360 de una persona.

- **Auth**: `requirePeopleTenantContext()`
- **Params**: `memberId` (string)
- **Response**: `PersonDetail` con member, access, summary, integrations, capacity, finance, assignments, compensation, payroll, hrContext, deliveryContext

### `GET /api/people/[memberId]/hr`

Contexto HR de una persona.

- **Auth**: `requireHrTenantContext()`
- **Params**: `memberId` (string)
- **Response**: HR context data

### `GET /api/people/[memberId]/delivery`

Métricas de delivery de una persona.

- **Auth**: `requirePeopleTenantContext()`
- **Params**: `memberId` (string)
- **Response**: Delivery metrics

### `GET /api/people/[memberId]/finance`

Resumen financiero de una persona.

- **Auth**: `requireFinanceTenantContext()`
- **Params**: `memberId` (string)
- **Response**: `PersonFinanceOverview`

### `GET /api/organizations`

Lista de organizaciones con paginación y filtros.

- **Auth**: `requireInternalTenantContext()`
- **Query**: `search?`, `type?`, `country?`, `status?`, `page?`, `pageSize?`
- **Response**: `{ items: OrganizationListItem[], total, page, pageSize }`

### `POST /api/organizations`

Crear organización.

- **Auth**: `requireInternalTenantContext()`
- **Body**: `{ name, taxId, type, country, industry? }`

### `GET /api/organizations/[id]`

Detalle de organización con spaces y people.

- **Auth**: `requireInternalTenantContext()`
- **Response**: `OrganizationDetail` (incluye spaces[], people[], finance, ico)

### `PATCH /api/organizations/[id]`

Actualizar datos de organización.

- **Auth**: `requireInternalTenantContext()`
- **Body**: Campos parciales de organización

### `DELETE /api/organizations/[id]`

Archivar organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/memberships`

Listar membresías de personas en la organización.

- **Auth**: `requireInternalTenantContext()`
- **Response**: `PersonMembership[]`

### `POST /api/organizations/[id]/memberships`

Crear membresía de persona en la organización.

- **Auth**: `requireInternalTenantContext()`
- **Body**: `{ profileId, membershipType, roleLabel?, department?, spaceId?, isPrimary? }`

### `PUT /api/organizations/[id]/memberships/[membershipId]`

Actualizar membresía.

- **Auth**: `requireInternalTenantContext()`

### `DELETE /api/organizations/[id]/memberships/[membershipId]`

Remover membresía.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/ico`

Métricas ICO de la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/finance`

Datos financieros de la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/economics`

Análisis económico de la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/executive`

Datos ejecutivos de la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/projects`

Proyectos de la organización.

- **Auth**: `requireInternalTenantContext()`

### `POST /api/organizations/[id]/hubspot-sync`

Trigger de sincronización HubSpot para la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/org-search`

Búsqueda de organizaciones con autocomplete.

- **Auth**: `requireInternalTenantContext()`
- **Query**: `q` (string, min 2 chars)

### `GET /api/organizations/people-search`

Búsqueda de personas a través de organizaciones.

- **Auth**: `requireInternalTenantContext()`
- **Query**: `q` (string)

### `GET /api/organizations/[id]/spaces`

Espacios operativos de la organización.

- **Auth**: `requireInternalTenantContext()`

### `POST /api/organizations/[id]/spaces`

Crear espacio operativo.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/organizations/[id]/contacts`

Contactos de la organización.

- **Auth**: `requireInternalTenantContext()`

### `GET /api/person-360/identity`

Perfil de identidad de una persona (360).

- **Auth**: `requireInternalTenantContext()`
- **Query**: `profileId` (required)

### `GET /api/person-360/intelligence`

Inteligencia agregada sobre una persona.

- **Auth**: `requireInternalTenantContext()`
- **Query**: `profileId` (required)

---

## 6. HR Core (15 routes)

### `GET /api/hr/core/meta`

Metadata del módulo HR (leave types, department list, etc.).

- **Auth**: `requireHrTenantContext()`
- **Response**: `HrCoreMetadata`

### `GET /api/hr/core/members/[memberId]`

Perfil HR de un miembro.

- **Auth**: `requireHrTenantContext()`
- **Params**: `memberId` (string)

### `GET /api/hr/core/members/[memberId]/profile`

Perfil HR extendido de un miembro.

- **Auth**: `requireHrTenantContext()`

### `PUT /api/hr/core/members/[memberId]/profile`

Actualizar perfil HR extendido.

- **Auth**: `requireHrTenantContext()`
- **Body**: Campos de perfil (skills, tools, job_level, etc.)

### `GET /api/hr/core/departments`

Lista de departamentos.

- **Auth**: `requireHrTenantContext()`
- **Response**: `HrDepartment[]`

### `POST /api/hr/core/departments`

Crear departamento.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/core/departments/[departmentId]`

Detalle de departamento.

- **Auth**: `requireHrTenantContext()`

### `PUT /api/hr/core/departments/[departmentId]`

Actualizar departamento.

- **Auth**: `requireHrTenantContext()`

### `DELETE /api/hr/core/departments/[departmentId]`

Eliminar departamento.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/core/attendance`

Listar asistencia.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `dateFrom?`, `dateTo?`, `status?`, `page?`, `pageSize?`

### `POST /api/hr/core/attendance`

Registrar asistencia.

- **Auth**: `requireHrTenantContext()`
- **Body**: `{ memberId, attendanceDate, status, sourceSystem?, minutesPresent? }`

### `POST /api/hr/core/attendance/webhook/teams`

Webhook para integración con Microsoft Teams (attendance automática).

- **Auth**: Verificación via `HR_CORE_TEAMS_WEBHOOK_SECRET`

### `GET /api/hr/core/leave/balances`

Saldos de permisos.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `year?`, `page?`, `pageSize?`

### `GET /api/hr/core/leave/requests`

Listar solicitudes de permiso.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `status?`, `dateFrom?`, `dateTo?`, `page?`, `pageSize?`

### `POST /api/hr/core/leave/requests`

Crear solicitud de permiso.

- **Auth**: `requireHrTenantContext()`
- **Body**: `{ memberId, leaveTypeCode, startDate, endDate, notes? }`

---

## 7. HR Payroll (22 routes)

### `GET /api/hr/payroll/periods`

Listar períodos de nómina.

- **Auth**: `requireHrTenantContext()`
- **Query**: `year?`, `month?`, `status?`, `page?`, `pageSize?`
- **Response**: `PayrollPeriod[]`

### `POST /api/hr/payroll/periods`

Crear período de nómina.

- **Auth**: `requireHrTenantContext()`
- **Body**: `{ year, month }`

### `GET /api/hr/payroll/periods/[periodId]`

Detalle de período.

- **Auth**: `requireHrTenantContext()`

### `PUT /api/hr/payroll/periods/[periodId]`

Actualización de período.

- **Auth**: `requireHrTenantContext()`

### `POST /api/hr/payroll/periods/[periodId]/calculate`

Calcular nómina del período.

- **Auth**: `requireHrTenantContext()`
- **Response**: `PayrollCalculationResult` con entries, diagnostics, missing members

### `POST /api/hr/payroll/periods/[periodId]/approve`

Aprobar período de nómina.

- **Auth**: `requireHrTenantContext()`

### `POST /api/hr/payroll/periods/[periodId]/reject`

Rechazar período.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/periods/[periodId]/entries`

Entries de un período.

- **Auth**: `requireHrTenantContext()`
- **Response**: `PayrollEntry[]`

### `GET /api/hr/payroll/periods/[periodId]/excel`

Exportar período en Excel.

- **Auth**: `requireHrTenantContext()`
- **Response**: Buffer (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

### `GET /api/hr/payroll/periods/[periodId]/pdf`

Exportar período en PDF.

- **Auth**: `requireHrTenantContext()`
- **Response**: Buffer (application/pdf)

### `GET /api/hr/payroll/periods/[periodId]/export`

Exportar período (formato genérico).

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/entries`

Listar entries.

- **Auth**: `requireHrTenantContext()`
- **Query**: `periodId?`, `memberId?`, `page?`, `pageSize?`

### `POST /api/hr/payroll/entries`

Crear entry manual.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/entries/[entryId]`

Detalle de entry.

- **Auth**: `requireHrTenantContext()`

### `PUT /api/hr/payroll/entries/[entryId]`

Actualización de entry.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/entries/[entryId]/receipt`

Generar recibo de pago individual.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/compensation`

Listar versiones de compensación.

- **Auth**: `requireHrTenantContext()`

### `POST /api/hr/payroll/compensation`

Crear versión de compensación.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/compensation/eligible-members`

Miembros elegibles para compensación.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/members`

Roster de miembros para payroll.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/members/[memberId]`

Detalle payroll de un miembro.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/members/[memberId]/history`

Historial de payroll de un miembro.

- **Auth**: `requireHrTenantContext()`

---

## 8. Finance (52 routes)

### Accounts

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/accounts` | GET, POST | Listar/crear cuentas |
| `/api/finance/accounts/[id]` | GET, PUT, DELETE | CRUD |

- **Auth**: `requireFinanceTenantContext()`

### Income

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/income` | GET, POST | Listar/crear ingresos |
| `/api/finance/income/[id]` | GET, PUT, DELETE | CRUD |
| `/api/finance/income/[id]/payment` | POST | Registrar pago |
| `/api/finance/income/summary` | GET | Resumen |
| `/api/finance/income/meta` | GET | Metadata |

**Queries** (GET /income): `clientId?`, `status?`, `serviceLine?`, `fromDate?`, `toDate?`, `page?`, `pageSize?`

- **Auth**: `requireFinanceTenantContext()`

### Expenses

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/expenses` | GET, POST | Listar/crear gastos |
| `/api/finance/expenses/[id]` | GET, PUT, DELETE | CRUD |
| `/api/finance/expenses/bulk` | POST | Carga masiva |
| `/api/finance/expenses/summary` | GET | Resumen |
| `/api/finance/expenses/meta` | GET | Metadata |
| `/api/finance/expenses/payroll-candidates` | GET | Candidatos para payroll |

**Queries**: `expenseType?`, `status?`, `clientId?`, `memberId?`, `supplierId?`, `serviceLine?`, `fromDate?`, `toDate?`, `page?`, `pageSize?`

- **Auth**: `requireFinanceTenantContext()`

### Suppliers

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/suppliers` | GET, POST | Listar/crear |
| `/api/finance/suppliers/[id]` | GET, PUT, DELETE | CRUD |

- **Auth**: `requireFinanceTenantContext()`

### Exchange Rates

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/exchange-rates` | GET | Listar |
| `/api/finance/exchange-rates/latest` | GET | Último |
| `/api/finance/exchange-rates/sync` | POST | Sincronizar (cron) |

**Queries**: `fromDate?`, `toDate?`, `fromCurrency?`, `toCurrency?`

- **Auth**: `requireFinanceTenantContext()` o `requireCronAuth()`

### Reconciliation

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/reconciliation` | GET, POST | Sesiones |
| `/api/finance/reconciliation/[id]` | GET, PUT, DELETE | CRUD |
| `/api/finance/reconciliation/[id]/statements` | GET | Statements |
| `/api/finance/reconciliation/[id]/candidates` | GET | Candidatos |
| `/api/finance/reconciliation/[id]/match` | POST | Match manual |
| `/api/finance/reconciliation/[id]/unmatch` | POST | Remover match |
| `/api/finance/reconciliation/[id]/auto-match` | POST | Auto-matching |
| `/api/finance/reconciliation/[id]/exclude` | POST | Excluir |

- **Auth**: `requireFinanceTenantContext()`

### Finance Dashboard

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/dashboard/summary` | GET | Resumen financiero |
| `/api/finance/dashboard/cashflow` | GET | Flujo de caja |
| `/api/finance/dashboard/aging` | GET | Aging de CxC |
| `/api/finance/dashboard/by-service-line` | GET | Breakdown por línea |

- **Auth**: `requireFinanceTenantContext()`

### Finance Intelligence

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/intelligence/client-economics` | GET | Rentabilidad por cliente |
| `/api/finance/intelligence/client-economics/trend` | GET | Tendencia en el tiempo |
| `/api/finance/intelligence/allocations` | GET | Allocaciones de costos |

- **Auth**: `requireFinanceTenantContext()`

### Nubox Sync

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/nubox/sync` | POST | Orquestar sincronización |
| `/api/finance/nubox/sync-status` | GET | Status del último sync |

- **Auth**: `requireFinanceTenantContext()` o `requireCronAuth()`

---

## 9. ICO Engine (8 routes)

### `GET /api/ico-engine/metrics`

Métricas de un espacio (live o materializadas).

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId` (required), `year?`, `month?`, `live?`
- **Response**: `SpaceMetricSnapshot`

### `GET /api/ico-engine/metrics/agency`

Rollup de métricas a nivel agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `year?`, `month?`
- **Response**: `SpaceMetricSnapshot[]`

### `GET /api/ico-engine/metrics/project`

Métricas a nivel proyecto.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId` (required), `year?`, `month?`
- **Response**: `ProjectMetricSnapshot[]`

### `GET /api/ico-engine/health`

Health check del ICO Engine.

- **Auth**: `requireAgencyTenantContext()`

### `GET /api/ico-engine/registry`

Registro de métricas disponibles con umbrales.

- **Auth**: `requireAgencyTenantContext()`

### `GET /api/ico-engine/context`

Contexto de espacio/proyecto.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId?`, `projectId?`

### `GET /api/ico-engine/stuck-assets`

Lista de tareas estancadas (72h+ sin movimiento).

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId` (required), `severity?`, `page?`, `pageSize?`
- **Response**: `StuckAssetDetail[]`

### `GET /api/ico-engine/trends/rpa`

Tendencia de RPA últimos 12 meses.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId` (required)

---

## 10. Services (4 routes)

### `GET /api/agency/services`

Lista de servicios con filtros.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `search?`, `spaceId?`, `organizationId?`, `lineaDeServicio?`, `pipelineStage?`, `page?`, `pageSize?`
- **Response**: `{ items: ServiceListItem[], total, page, pageSize }`

### `GET /api/agency/services/[id]`

Detalle de servicio con historial.

- **Auth**: `requireAgencyTenantContext()`

### `POST /api/agency/services`

Crear servicio.

- **Auth**: `requireAgencyTenantContext()`
- **Body**: `{ spaceId, organizationId, name, serviceLine, ... }`
- **Response**: `{ serviceId, publicId, created }`

### `PUT /api/agency/services/[id]`

Actualizar servicio (field-level history tracking).

- **Auth**: `requireAgencyTenantContext()`
- **Body**: Campos parciales de servicio

---

## 11. Capabilities (3 routes)

### `GET /api/capabilities/resolve`

Resolver módulos de capability disponibles para el tenant.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ clientId, businessLines[], serviceModules[], modules: ResolvedCapabilityModule[] }`

### `GET /api/capabilities/[moduleId]/data`

Datos de un módulo de capability específico.

- **Auth**: `requireClientTenantContext()` + verificación de acceso al módulo
- **Params**: `moduleId` (string)
- **Response**: `CapabilityModuleData`

### `GET /api/capabilities/meta`

Metadata de capabilities (módulos disponibles).

- **Auth**: `requireClientTenantContext()`

---

## 12. Agency (7 routes)

### `GET /api/agency/pulse`

Health pulse de la agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Response**: Global KPIs, metrics, trends

### `GET /api/agency/spaces`

Lista de espacios/cuentas con indicadores de salud.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `search?`, `status?`, `page?`, `pageSize?`
- **Response**: `AgencySpaceHealth[]`

### `GET /api/agency/capacity`

Capacidad de la agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Response**: `AgencyCapacityOverview`

### `GET /api/agency/performance`

Métricas de desempeño agregadas.

- **Auth**: `requireAgencyTenantContext()`

### `GET /api/agency/projects`

Proyectos de la agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Query**: `spaceId?`, `status?`, `page?`, `pageSize?`

### `GET /api/agency/teams`

Equipos de la agencia.

- **Auth**: `requireAgencyTenantContext()`

### `GET /api/agency/operations`

Datos operativos agregados.

- **Auth**: `requireAgencyTenantContext()`

---

## 13. AI Credits & Tools (13 routes)

### Credits

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/ai-credits/wallets` | GET | Listar wallets |
| `/api/ai-credits/summary` | GET | Resumen |
| `/api/ai-credits/ledger` | GET | Movimientos |
| `/api/ai-credits/consume` | POST | Consumir |
| `/api/ai-credits/reload` | POST | Recargar |

**Queries** (GET /ledger): `walletId` (required), `entryType?`, `dateFrom?`, `dateTo?`, `memberId?`, `limit?`, `offset?`

- **Auth**: `requireAiToolingTenantContext()`

### Tools Catalog

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/ai-tools/catalog` | GET | Catálogo |
| `/api/ai-tools/licenses` | GET | Licencias |
| `/api/ai-tools/meta` | GET | Metadata |

- **Auth**: `requireAiToolingTenantContext()`

### Admin AI Tools

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/ai-tools/catalog` | GET, POST | Listar/crear |
| `/api/admin/ai-tools/catalog/[toolId]` | GET, PUT, DELETE | CRUD |
| `/api/admin/ai-tools/licenses` | GET, POST | Listar/crear |
| `/api/admin/ai-tools/licenses/[licenseId]` | GET, PUT, DELETE | CRUD |
| `/api/admin/ai-tools/wallets` | GET, POST | Listar/crear |
| `/api/admin/ai-tools/wallets/[walletId]` | GET, PUT, DELETE | CRUD |

- **Auth**: `requireAdminTenantContext()`

---

## 14. Admin (79 routes)

### Tenants Management

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/tenants` | GET, POST | Listar/crear |
| `/api/admin/tenants/[id]` | GET, PUT, DELETE | CRUD |
| `/api/admin/tenants/[id]/capabilities` | GET, PUT | CRUD capabilities |
| `/api/admin/tenants/[id]/capabilities/sync` | POST | Sync desde HubSpot |
| `/api/admin/tenants/[id]/contacts/provision` | POST | Provisionar contactos |
| `/api/admin/tenants/[id]/logo` | POST | Subir logo |
| `/api/admin/tenants/[id]/business-lines` | GET | Líneas de negocio |
| `/api/admin/tenants/[id]/operational-calendar` | GET, PUT | Calendario operativo |

### Users Management

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/users` | GET | Listar usuarios |
| `/api/admin/users/[id]` | GET, PUT | Leer/actualizar |
| `/api/admin/users/[id]/roles` | GET, PUT | Gestión de roles |
| `/api/admin/users/[id]/avatar` | POST | Subir avatar |
| `/api/admin/users/[id]/deactivate` | POST | Desactivar |

### Roles Management

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/roles` | GET | Catálogo de roles |
| `/api/admin/roles/[roleId]` | GET | Detalle de rol |

### Team Admin

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/team/members` | GET, POST | Listar/crear |
| `/api/admin/team/members/[memberId]` | GET, PUT, DELETE | CRUD |
| `/api/admin/team/members/[memberId]/deactivate` | POST | Desactivar |
| `/api/admin/team/assignments` | GET, POST | Listar/crear |
| `/api/admin/team/assignments/[assignmentId]` | GET, PUT, DELETE | CRUD |
| `/api/admin/team/meta` | GET | Metadata |

### Cloud Integrations

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/cloud-integrations` | GET | Estado de integraciones |
| `/api/admin/cloud-integrations/[id]/sync` | POST | Trigger sync |

### Email Delivery & Notifications

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/email/templates` | GET, POST | Listar/crear |
| `/api/admin/email/templates/[id]` | GET, PUT, DELETE | CRUD |
| `/api/admin/email/subscriptions` | GET, PUT | Gestión |
| `/api/admin/notifications/channels` | GET, POST | Canales |

### Operational Calendar

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/operational-calendar/holidays` | GET, POST | Gestión feriados |
| `/api/admin/operational-calendar/business-days` | GET | Días de negocio |

### SCIM Tenant Mappings

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/scim-tenant-mappings` | GET, POST | Listar/crear |
| `/api/admin/scim-tenant-mappings/[id]` | GET, PUT, DELETE | CRUD |

### Ops Health & Monitoring

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/ops-health/status` | GET | Status general |
| `/api/admin/ops-health/alerts` | GET | Alertas activas |
| `/api/admin/ops-health/logs` | GET | Logs operativos |

### Views Registry

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/views` | GET | Registro de vistas |
| `/api/admin/views/[viewPath]/access` | GET | Control de acceso |

- **Auth**: `requireAdminTenantContext()`

---

## 15. SCIM 2.0 (6 routes)

### `/api/scim/v2/Users`

- **GET** — Listar usuarios (con paginación y filtros)
- **POST** — Crear usuario
- **Auth**: `requireScimTenantAuth()` (Bearer token)

### `/api/scim/v2/Users/[id]`

- **GET** — Obtener usuario
- **PUT** — Actualizar usuario (reemplazo)
- **PATCH** — Actualizar parcial
- **DELETE** — Eliminar usuario
- **Auth**: `requireScimTenantAuth()`

### `/api/scim/v2/Groups`

- **GET** — Listar grupos
- **POST** — Crear grupo
- **Auth**: `requireScimTenantAuth()`

### `/api/scim/v2/Groups/[id]`

- **GET** — Obtener grupo
- **PUT** — Actualizar grupo
- **PATCH** — Actualizar parcial
- **DELETE** — Eliminar grupo
- **Auth**: `requireScimTenantAuth()`

### `/api/scim/v2/Schemas`

- **GET** — Definiciones de schemas SCIM
- **Auth**: `requireScimTenantAuth()`

### `/api/scim/v2/ServiceProviderConfig`

- **GET** — Configuración del proveedor SCIM
- **Auth**: `requireScimTenantAuth()`

---

## 16. Integrations & Webhooks (17 routes)

### Integration API (External)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/integrations/v1/tenants` | GET | Listar tenants |
| `/api/integrations/v1/catalog/capabilities` | GET | Catálogo |
| `/api/integrations/v1/tenants/capabilities/sync` | POST | Sync capabilities |
| `/api/integrations/v1/health` | GET | Health check |

- **Auth**: `requireIntegrationRequest()` (API key)

### Webhooks Inbound (Handlers)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/webhooks/inbound/hubspot` | POST | Inbound HubSpot |
| `/api/webhooks/inbound/nubox` | POST | Inbound Nubox |
| `/api/webhooks/inbound/notion` | POST | Inbound Notion |
| `/api/webhooks/inbound/custom` | POST | Custom webhook |

- **Auth**: Verificación de firma (HMAC)

### Webhooks Internal (Dispatch)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/webhooks/dispatch` | POST | Dispatch a suscriptores |

- **Auth**: `requireInternalTenantContext()`

### Notion Governance

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/integrations/notion/sync-governance` | POST | Sync governance |
| `/api/integrations/notion/contract` | GET | Contrato |

- **Auth**: `requireInternalTenantContext()`

### HubSpot Sync

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/integrations/hubspot/sync` | POST | Trigger sync |
| `/api/integrations/hubspot/status` | GET | Status |

- **Auth**: `requireInternalTenantContext()`

---

## 17. Cron (25 routes)

### Outbox & Events

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/cron/outbox-publish` | POST | Publicar eventos |
| `/api/cron/outbox-status` | GET | Status |

### Materialization

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/cron/ico-materialize` | POST | Materializar ICO |
| `/api/cron/sync-conformed` | POST | Sync conformed |

### Finance & Sync

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/economic-indicators/sync` | POST | Sync indicadores |
| `/api/finance/nubox/sync` | POST | Sync Nubox |
| `/api/cron/exchange-rates/sync` | POST | Sync tipos cambio |

### Webhook & Notification

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/cron/webhook-dispatch` | POST | Dispatch webhooks |
| `/api/cron/notifications/send` | POST | Enviar notificaciones |

### Jobs & Health

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/cron/jobs/status` | GET | Status de jobs |
| `/api/cron/health` | GET | Health check cron |

- **Auth**: `requireCronAuth()` (CRON_SECRET)

---

## 18. Internal & Misc (14 routes)

### Internal Agent

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/internal/greenhouse-agent` | GET, POST | Agente AI |

- **Auth**: `requireInternalTenantContext()` o `requireAdminTenantContext()`

### Media Serving

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/media/tenants/[id]/logo` | GET | Servir logo |
| `/api/media/users/[id]/avatar` | GET | Servir avatar |

- **Auth**: Session requerida

### Health & Analytics

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/health` | GET | Health check general |
| `/api/health/postgres` | GET | Health PostgreSQL |
| `/api/health/bigquery` | GET | Health BigQuery |
| `/api/analytics/usage` | GET | Estadísticas de uso |
| `/api/analytics/performance` | GET | Métricas de performance |

- **Auth**: `requireInternalTenantContext()` (algunos sin auth)

### Version & Config

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/version` | GET | Versión del portal |
| `/api/config/features` | GET | Feature flags |

- **Auth**: No requerida (public)

---

## Resumen de categorías

| Categoría | Routes | Auth |
|-----------|--------|------|
| Autenticación | 5 | NextAuth / Public |
| Dashboard | 4 | Client tenant |
| Proyectos | 8 | Client tenant |
| Team & Capacity | 8 | Client/Internal/Admin |
| People & Orgs | 34 | Internal/People viewer |
| HR Core | 15 | HR tenant |
| HR Payroll | 22 | HR tenant |
| Finance | 52 | Finance tenant |
| ICO Engine | 8 | Agency tenant |
| Services | 4 | Agency tenant |
| Capabilities | 3 | Client tenant |
| Agency | 7 | Agency tenant |
| AI Tools | 13 | AI tooling/Admin |
| Admin | 79 | Admin tenant |
| SCIM | 6 | SCIM bearer token |
| Integrations | 17 | Integration API key / Internal |
| Cron | 25 | CRON_SECRET |
| Misc | 14 | Varies |
| **TOTAL** | **324** | — |
