# Greenhouse Portal Views v1

Catálogo de todas las vistas del portal organizadas por audiencia.

## Client-Facing (Clientes como Sky Airlines)

| Vista | Ruta | Estado | Descripción |
|-------|------|--------|-------------|
| Pulse | `/dashboard` | Implementada | Dashboard con KPIs, charts, portfolio health, team, AI credits |
| Proyectos | `/proyectos` | Implementada | Lista de proyectos con tasks, RPA, review items |
| Detalle Proyecto | `/proyectos/[id]` | Implementada | Tasks con assignee, ICO metrics, CSC phase |
| Campañas | `/campanas` | Implementada | Lista + detalle de campañas con KPIs y equipo |
| Revisiones | `/reviews` | Implementada | Review queue con urgencia, filtros, historial |
| Ciclos | `/sprints` | Implementada | Sprint list + detalle con ICO metrics |
| Mi Equipo | `/equipo` | Implementada | Team cards con FTE, rol, proyectos |
| Analytics | `/analytics` | Implementada | Trends RPA/OTD/throughput + comparativa |
| Novedades | `/notifications` | Implementada | Historial de notificaciones + preferencias |
| Settings | `/settings` | Implementada | SSO linking, notificaciones |

## Collaborator-Facing (Equipo Efeonce — Daniela, Carlos, María)

| Vista | Ruta | Estado | Descripción |
|-------|------|--------|-------------|
| Mi Greenhouse | `/my` | API lista, UI pendiente | Dashboard personal: KPIs, tasks, nómina, permisos |
| Mi Perfil | `/my/profile` | API lista, UI pendiente | Identidad, datos profesionales, sistemas vinculados |
| Mis Asignaciones | `/my/assignments` | API lista, UI pendiente | Clientes, FTE, capacidad contratada vs usada |
| Mi Desempeño | `/my/performance` | API lista, UI pendiente | ICO metrics, trend 6 meses, health |
| Mi Nómina | `/my/payroll` | API lista, UI pendiente | Liquidaciones, compensación, historial |
| Mis Permisos | `/my/leave` | API lista, UI pendiente | Balance vacaciones, solicitudes |
| Mi Delivery | `/my/delivery` | API lista, UI pendiente | Proyectos propios, tasks, CRM |
| Configuración | `/my/settings` | Pendiente | Notificaciones, timezone |

## Internal/Agency (Operadores Efeonce)

| Vista | Ruta | Estado | Descripción |
|-------|------|--------|-------------|
| Torre de Control | `/internal/dashboard` | Implementada | Overview de clientes + equipo interno |
| Agencia | `/agency` | Implementada | Pulse Global, métricas cross-space |
| Organizaciones | `/agency/organizations` | Implementada | Lista + detalle con economics, projects, equipo |
| Servicios | `/agency/services` | Implementada | Servicios por space con sync HubSpot |
| Personas | `/people` | Implementada | Directorio + ficha 360 de cada colaborador |
| Nómina | `/hr/payroll` | Implementada | Períodos, cálculo, entries, readiness |
| Departamentos | `/hr/departments` | Implementada | Estructura organizacional |
| Permisos | `/hr/leave` | Implementada | Solicitudes y saldos del equipo |
| Asistencia | `/hr/attendance` | Implementada | Registros de asistencia |
| Finanzas | `/finance/*` | Implementada | Income, expenses, suppliers, reconciliation, analytics |
| Administración | `/admin/*` | Implementada | Spaces, equipo, usuarios, roles, AI tools |

## APIs Self-Service (`/api/my/*`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/my/dashboard` | GET | Runtime snapshot + HR context del miembro |
| `/api/my/profile` | GET | Person 360 profile |
| `/api/my/assignments` | GET | Client assignments + capacity |
| `/api/my/performance` | GET | ICO metrics + operational serving |
| `/api/my/payroll` | GET | Payroll history + compensation |
| `/api/my/leave` | GET | Leave balances |
| `/api/my/delivery` | GET | Projects, tasks, CRM |

Todas las APIs `/api/my/*` resuelven `memberId` desde el JWT — sin parámetro URL. Esto previene estructuralmente que un colaborador vea datos de otro.

## Session Bridge

El JWT ahora incluye `memberId` e `identityProfileId` para colaboradores Efeonce. El guard `requireMyTenantContext()` valida:
1. Usuario autenticado
2. `tenantType === 'efeonce_internal'`
3. `memberId` resuelto desde session

## Navegación por Audiencia

| Audiencia | Sidebar | Home path |
|-----------|---------|-----------|
| Cliente | Pulse, Proyectos, Campañas, Revisiones, Ciclos, Equipo, Analytics, Novedades, Settings | `/dashboard` |
| Colaborador | Mi Greenhouse, Mis Asignaciones, Mi Desempeño, Mi Delivery, Mi Perfil, Mi Nómina, Mis Permisos | `/my` |
| Operador interno | Torre de Control, Agencia, Personas, Nómina, Departamentos, Permisos, Asistencia, Finanzas, Admin | `/internal/dashboard` |
