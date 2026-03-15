# Greenhouse Portal — Referencia de API Routes

> Versión: 1.0
> Fecha: 2026-03-15

---

## Convenciones generales

- Todas las rutas usan `export const dynamic = 'force-dynamic'` para evitar caching
- Autenticación vía `getServerSession(authOptions)` en cada request
- Respuestas en JSON con `NextResponse.json()`
- Errores estándar: 400 (bad request), 401 (no auth), 403 (forbidden), 404 (not found), 500 (server error)
- Formato de error: `{ "error": "mensaje descriptivo" }`
- Paginación: `{ items: [], total: number, page: number, pageSize: number }`

---

## 1. Autenticación

### `POST/GET /api/auth/[...nextauth]`

Handler de NextAuth.js. Gestiona OAuth flows, callbacks, sesión y tokens.

- **Auth**: No (es el propio endpoint de auth)
- **Proveedores**: Credentials, Azure AD, Google OAuth

---

## 2. Dashboard

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

## 3. Proyectos

### `GET /api/projects`

Lista de proyectos del tenant.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ items: GreenhouseProjectListItem[], scope }`

### `GET /api/projects/[id]`

Detalle de un proyecto.

- **Auth**: `requireClientTenantContext()` + `canAccessProject(tenant, id)`
- **Params**: `id` (string) — ID del proyecto
- **Response**: `{ project, sprintContext, reviewPressure, performance }`

### `GET /api/projects/[id]/tasks`

Tareas de un proyecto.

- **Auth**: `requireClientTenantContext()` + `canAccessProject(tenant, id)`
- **Params**: `id` (string) — ID del proyecto
- **Response**: `{ tasks: GreenhouseProjectTaskItem[], projectId, projectName }`

---

## 4. Team

### `GET /api/team/members`

Miembros del equipo asignado al tenant.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ members: TeamMemberResponse[], totalFte, serviceLines[] }`

### `GET /api/team/capacity`

Capacidad y utilización del equipo.

- **Auth**: `requireClientTenantContext()`
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

---

## 5. People

### `GET /api/people`

Directorio de personas del equipo.

- **Auth**: `requirePeopleTenantContext()`
- **Response**: `{ items: PersonListItem[], meta }`

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

---

## 6. HR Core

### `GET /api/hr/core/meta`

Metadata del módulo HR (leave types, department list, etc.).

- **Auth**: `requireHrTenantContext()`
- **Response**: `HrCoreMetadata`

### `GET /api/hr/core/members/[memberId]`

Perfil HR de un miembro.

- **Auth**: `requireHrTenantContext()`
- **Params**: `memberId` (string)

### `GET/PUT /api/hr/core/members/[memberId]/profile`

Leer o actualizar perfil HR extendido.

- **Auth**: `requireHrTenantContext()`
- **PUT Body**: Campos de perfil (skills, tools, job_level, etc.)

### `GET /api/hr/core/departments`

Lista de departamentos.

- **Auth**: `requireHrTenantContext()`
- **Response**: `HrDepartment[]`

### `GET/PUT/DELETE /api/hr/core/departments/[departmentId]`

CRUD de departamento.

- **Auth**: `requireHrTenantContext()`

### `GET/POST /api/hr/core/attendance`

Listar o registrar asistencia.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `dateFrom?`, `dateTo?`, `status?`
- **POST Body**: `{ memberId, attendanceDate, status, sourceSystem?, minutesPresent? }`

### `POST /api/hr/core/attendance/webhook/teams`

Webhook para integración con Microsoft Teams (attendance automática).

- **Auth**: Verificación via `HR_CORE_TEAMS_WEBHOOK_SECRET`

### `GET /api/hr/core/leave/balances`

Saldos de permisos.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `year?`
- **Response**: `HrLeaveBalance[]`

### `GET/POST /api/hr/core/leave/requests`

Listar o crear solicitudes de permiso.

- **Auth**: `requireHrTenantContext()`
- **Query**: `memberId?`, `status?`, `dateFrom?`, `dateTo?`
- **POST Body**: `{ memberId, leaveTypeCode, startDate, endDate, notes? }`

### `GET/PUT/DELETE /api/hr/core/leave/requests/[requestId]`

CRUD de solicitud de permiso.

- **Auth**: `requireHrTenantContext()`

### `POST /api/hr/core/leave/requests/[requestId]/review`

Aprobar o rechazar una solicitud.

- **Auth**: `requireHrTenantContext()`
- **Body**: `{ action: 'approve' | 'reject', notes? }`

---

## 7. HR Payroll

### `GET/POST /api/hr/payroll/periods`

Listar o crear períodos de nómina.

- **Auth**: `requireHrTenantContext()`
- **POST Body**: `{ year, month }`
- **Response**: `PayrollPeriod[]`

### `GET/PUT /api/hr/payroll/periods/[periodId]`

Detalle o actualización de período.

- **Auth**: `requireHrTenantContext()`

### `POST /api/hr/payroll/periods/[periodId]/calculate`

Calcular nómina del período.

- **Auth**: `requireHrTenantContext()`
- **Response**: `PayrollCalculationResult` con entries, diagnostics, missing members

### `POST /api/hr/payroll/periods/[periodId]/approve`

Aprobar período de nómina.

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

### `GET/POST /api/hr/payroll/entries`

Listar entries o crear entry manual.

- **Auth**: `requireHrTenantContext()`

### `GET/PUT /api/hr/payroll/entries/[entryId]`

Detalle o actualización de entry.

- **Auth**: `requireHrTenantContext()`

### `GET /api/hr/payroll/entries/[entryId]/receipt`

Generar recibo de pago individual.

- **Auth**: `requireHrTenantContext()`

### `GET/POST /api/hr/payroll/compensation`

Listar o crear versiones de compensación.

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

## 8. Finance

### `GET/POST /api/finance/accounts`

Listar o crear cuentas financieras.

- **Auth**: `requireFinanceTenantContext()`

### `GET/PUT /api/finance/accounts/[id]`

Detalle o actualización de cuenta.

- **Auth**: `requireFinanceTenantContext()`

### `GET/POST /api/finance/income`

Listar o crear registros de ingreso.

- **Auth**: `requireFinanceTenantContext()`
- **Query**: `clientId?`, `status?`, `serviceLine?`, `fromDate?`, `toDate?`, `page?`, `pageSize?`
- **Response**: `{ items: IncomeRecord[], total, page, pageSize }`

### `GET/PUT /api/finance/income/[id]`

Detalle o actualización de ingreso.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/income/[id]/payment`

Registrar pago de un ingreso.

- **Auth**: `requireFinanceTenantContext()`
- **Body**: `{ paidDate, amount?, notes? }`

### `GET /api/finance/income/summary`

Resumen de ingresos.

- **Auth**: `requireFinanceTenantContext()`

### `GET/POST /api/finance/expenses`

Listar o crear gastos.

- **Auth**: `requireFinanceTenantContext()`
- **Query**: `expenseType?`, `status?`, `clientId?`, `memberId?`, `supplierId?`, `serviceLine?`, `fromDate?`, `toDate?`, `page?`, `pageSize?`

### `GET/PUT /api/finance/expenses/[id]`

Detalle o actualización de gasto.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/expenses/bulk`

Carga masiva de gastos.

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/expenses/summary`

Resumen de gastos.

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/expenses/meta`

Metadata de gastos (categorías, tipos).

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/expenses/payroll-candidates`

Gastos candidatos para asociar a payroll.

- **Auth**: `requireFinanceTenantContext()`

### `GET/POST /api/finance/suppliers`

Listar o crear proveedores.

- **Auth**: `requireFinanceTenantContext()`

### `GET/PUT/DELETE /api/finance/suppliers/[id]`

CRUD de proveedor.

- **Auth**: `requireFinanceTenantContext()`

### `GET/POST /api/finance/clients`

Clientes financieros.

- **Auth**: `requireFinanceTenantContext()`

### `GET/PUT /api/finance/clients/[id]`

Detalle de cliente financiero.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/clients/sync`

Sincronizar clientes desde HubSpot.

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/exchange-rates`

Tipos de cambio.

- **Auth**: `requireFinanceTenantContext()`
- **Query**: `fromDate?`, `toDate?`

### `GET /api/finance/exchange-rates/latest`

Último tipo de cambio.

- **Auth**: `requireFinanceTenantContext()`
- **Query**: `fromCurrency`, `toCurrency`

### `POST /api/finance/exchange-rates/sync`

Sincronizar tipos de cambio (cron).

- **Auth**: Cron secret verification

### `GET/POST /api/finance/reconciliation`

Sesiones de reconciliación.

- **Auth**: `requireFinanceTenantContext()`

### `GET/PUT/DELETE /api/finance/reconciliation/[id]`

Gestión de sesión de reconciliación.

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/reconciliation/[id]/statements`

Statements de una reconciliación.

- **Auth**: `requireFinanceTenantContext()`

### `GET /api/finance/reconciliation/[id]/candidates`

Candidatos para matching.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/reconciliation/[id]/match`

Matchear items.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/reconciliation/[id]/unmatch`

Remover match.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/reconciliation/[id]/auto-match`

Auto-matching automático.

- **Auth**: `requireFinanceTenantContext()`

### `POST /api/finance/reconciliation/[id]/exclude`

Excluir item de reconciliación.

- **Auth**: `requireFinanceTenantContext()`

### Finance Dashboard

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/finance/dashboard/summary` | GET | Resumen financiero |
| `/api/finance/dashboard/cashflow` | GET | Flujo de caja |
| `/api/finance/dashboard/aging` | GET | Aging de cuentas por cobrar |
| `/api/finance/dashboard/by-service-line` | GET | Breakdown por línea de servicio |

---

## 9. Capabilities

### `GET /api/capabilities/resolve`

Resolver módulos de capability disponibles para el tenant.

- **Auth**: `requireClientTenantContext()`
- **Response**: `{ clientId, businessLines[], serviceModules[], modules: ResolvedCapabilityModule[] }`

### `GET /api/capabilities/[moduleId]/data`

Datos de un módulo de capability específico.

- **Auth**: `requireClientTenantContext()` + verificación de acceso al módulo
- **Params**: `moduleId` (string)
- **Response**: `CapabilityModuleData`

---

## 10. Agency

### `GET /api/agency/pulse`

Health pulse de la agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Response**: Global KPIs, metrics, trends

### `GET /api/agency/spaces`

Lista de espacios/cuentas con indicadores de salud.

- **Auth**: `requireAgencyTenantContext()`
- **Response**: `AgencySpaceHealth[]`

### `GET /api/agency/capacity`

Capacidad de la agencia.

- **Auth**: `requireAgencyTenantContext()`
- **Response**: `AgencyCapacityOverview`

---

## 11. AI Credits

### `GET /api/ai-credits/wallets`

Wallets de créditos AI.

- **Auth**: `requireAiToolingTenantContext()` (read)
- **Query**: `clientId?`, `toolId?`

### `GET /api/ai-credits/summary`

Resumen de wallets.

- **Auth**: `requireAiToolingTenantContext()` (read)

### `GET /api/ai-credits/ledger`

Movimientos del ledger.

- **Auth**: `requireAiToolingTenantContext()` (read)
- **Query**: `walletId` (required), `entryType?`, `dateFrom?`, `dateTo?`, `memberId?`, `limit?`, `offset?`

### `POST /api/ai-credits/consume`

Consumir créditos.

- **Auth**: `requireAiToolingTenantContext()` (operator)

### `POST /api/ai-credits/reload`

Recargar créditos.

- **Auth**: `requireAiToolingTenantContext()` (operator)

---

## 12. AI Tools (user-facing)

### `GET /api/ai-tools/catalog`

Catálogo de herramientas AI.

- **Auth**: `requireAiToolingTenantContext()`

### `GET /api/ai-tools/licenses`

Licencias de herramientas AI.

- **Auth**: `requireAiToolingTenantContext()`

---

## 13. Admin

### Admin — Tenants

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/tenants/[id]/capabilities` | GET | Capabilities del tenant |
| `/api/admin/tenants/[id]/capabilities` | PUT | Actualizar capabilities |
| `/api/admin/tenants/[id]/capabilities/sync` | POST | Sincronizar desde fuente |
| `/api/admin/tenants/[id]/contacts/provision` | POST | Provisionar contactos |
| `/api/admin/tenants/[id]/logo` | POST | Subir logo |

- **Auth**: `requireAdminTenantContext()`

### Admin — Users

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/users/[id]/roles` | GET | Roles del usuario |
| `/api/admin/users/[id]/roles` | PUT | Actualizar roles |
| `/api/admin/users/[id]/avatar` | POST | Subir avatar |

- **Auth**: `requireAdminTenantContext()`

### Admin — AI Tools

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/ai-tools/catalog` | GET | Catálogo admin |
| `/api/admin/ai-tools/catalog/[toolId]` | GET, PUT, DELETE | CRUD tool |
| `/api/admin/ai-tools/licenses` | GET, POST | Listar/crear licencias |
| `/api/admin/ai-tools/licenses/[licenseId]` | GET, PUT, DELETE | CRUD licencia |
| `/api/admin/ai-tools/wallets` | GET, POST | Listar/crear wallets |
| `/api/admin/ai-tools/wallets/[walletId]` | GET, PUT, DELETE | CRUD wallet |
| `/api/admin/ai-tools/meta` | GET | Metadata |

- **Auth**: `requireAdminTenantContext()`

### Admin — Team

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/admin/team/members` | GET, POST | Listar/crear miembros |
| `/api/admin/team/members/[memberId]` | GET, PUT, DELETE | CRUD miembro |
| `/api/admin/team/members/[memberId]/deactivate` | POST | Desactivar miembro |
| `/api/admin/team/assignments` | GET, POST | Listar/crear asignaciones |
| `/api/admin/team/assignments/[assignmentId]` | GET, PUT, DELETE | CRUD asignación |
| `/api/admin/team/meta` | GET | Metadata |

- **Auth**: `requireAdminTenantContext()`

---

## 14. Integrations

### `GET /api/integrations/v1/tenants`

Lista de tenants para integración externa.

- **Auth**: `requireIntegrationRequest()`
- **Query**: `clientId?`, `publicId?`, `sourceSystem?`, `sourceObjectType?`, `sourceObjectId?`, `updatedSince?`, `limit?`
- **Response**: `{ exportedAt, count, items[] }`

### `GET /api/integrations/v1/catalog/capabilities`

Catálogo de capabilities disponibles.

- **Auth**: `requireIntegrationRequest()`

### `POST /api/integrations/v1/tenants/capabilities/sync`

Sincronizar capabilities de un tenant desde integración.

- **Auth**: `requireIntegrationRequest()`

---

## 15. Internal

### `GET/POST /api/internal/greenhouse-agent`

Agente AI de Greenhouse (Vertex AI).

- **Auth**: `requireInternalTenantContext()` o `requireAdminTenantContext()`
- **GET Response**: `{ mode, model, location, projectId }` (runtime config)
- **POST Body**: `{ prompt: string, mode?: 'plan' | 'execute', surface?, routePath?, existingFiles?, notes? }`
- **POST Response**: `{ mode, model, reply }`

---

## 16. Media

### `GET /api/media/tenants/[id]/logo`

Servir logo del tenant.

- **Auth**: Session requerida
- **Response**: Image buffer

### `GET /api/media/users/[id]/avatar`

Servir avatar del usuario.

- **Auth**: Session requerida
- **Response**: Image buffer

---

## 17. Cron

### `POST /api/cron/outbox-publish`

Publicar eventos del outbox PostgreSQL hacia BigQuery.

- **Auth**: Cron secret verification (`CRON_SECRET`)
- **Frecuencia**: Cada 5 minutos (Vercel cron)
- **Response**: `{ eventsRead, eventsPublished, eventsFailed, durationMs }`
