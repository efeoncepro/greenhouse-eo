# Greenhouse Portal — Módulos Funcionales

> Versión: 1.0
> Fecha: 2026-03-15

---

## Visión general

Greenhouse organiza su funcionalidad en módulos de dominio, cada uno con su propia capa de datos, lógica de negocio, API routes y vistas. Este documento describe cada módulo en detalle.

---

## 1. Dashboard Cliente

**Superficie**: `/dashboard`
**Lib**: `src/lib/dashboard/`
**API**: `/api/dashboard/*`
**Vista**: `src/views/greenhouse/dashboard/`
**Fuente de datos**: BigQuery (notion_ops)

### Propósito

Vista ejecutiva para clientes mostrando el estado de salud de sus proyectos, entregas, equipo y herramientas.

### Componentes del dashboard

1. **Hero Card** — Banner principal con nombre del cliente, período de actividad y highlights
2. **KPI Grid** — 4 métricas clave:
   - RpA (Rounds per Approval) — Calidad de entregas
   - Completed — Tareas completadas
   - OTD (On-Time Delivery) — Cumplimiento de plazos
   - Feedback — Items pendientes de revisión
3. **Charts** (grid 2x2):
   - Status Distribution (donut) — Distribución de estados de tareas
   - Weekly Delivery Cadence (bar) — Cadencia semanal de entregas
   - Project RpA (bar) — RpA por proyecto
   - OTD Trend (line) — Tendencia de on-time delivery
4. **Team Capacity** — Utilización del equipo con health indicators
5. **Client Ecosystem** — Herramientas y plataformas del ecosistema
6. **AI Credits** — Estado de créditos AI del tenant
7. **Portfolio Health** — Acordeón con salud por proyecto
8. **Attention Projects** — Proyectos que requieren atención

### Lógica de negocio clave

**Mapeo de estados de tarea:**
- `active` — En progreso
- `review` — En revisión
- `changes` — Con cambios de cliente
- `blocked` — Bloqueada
- `queued` — En cola
- `completed` — Completada
- `closed` — Cerrada
- `other` — Otro

**Cálculo de risk score por proyecto:**
```
risk_score = (100 - on_time_pct) + (active_items × 1.5) + (review_items × 4) + (blocked × 8)
```

**Semáforo de RPA:**
- Verde: ≤ 1.5
- Amarillo: ≤ 2.5
- Rojo: > 2.5

---

## 2. Proyectos y Sprints

**Superficie**: `/proyectos`, `/proyectos/[id]`, `/sprints`, `/sprints/[id]`
**Lib**: `src/lib/projects/`
**API**: `/api/projects/*`
**Fuente de datos**: BigQuery (greenhouse_conformed, notion_ops)

### Propósito

Visibilidad sobre proyectos activos, su progreso, tareas y contexto de sprint.

### Lista de proyectos

Para cada proyecto muestra: nombre, rango de fechas, status con tone, total/active/completed tasks, avgRpa, open review items, review load, progress bar.

**Review load classification:**
- High: ≥ 5 items en revisión
- Medium: ≥ 1 item
- Low: 0 items

### Detalle de proyecto

- Metadata del proyecto (status, fechas, resumen)
- Sprint context (prioriza: Actual > Siguiente > Último)
- Review pressure (tasks con reviews abiertos, ready for review, en cambios, bloqueadas)
- Lista de tareas con: nombre, status, RPA, compliance, rounds de cambio, días late
- Performance indicators: on-time, late-drop, overdue, carry-over

### Sprint context

Cada sprint incluye: id, name, status, dates, totalTasks, completedTasks, progress (clamped 0-100).

---

## 3. People (Directorio y Person 360)

**Superficie**: `/people`, `/people/[memberId]`
**Lib**: `src/lib/people/`, `src/lib/person-360/`
**API**: `/api/people/*`
**Fuente de datos**: BigQuery + PostgreSQL

### Propósito

Directorio unificado de miembros del equipo con vista 360 que consolida información de HR, delivery, finance e identidad.

### Directorio (lista)

Para cada persona: memberId, displayName, emails (public/internal), roleTitle, roleCategory, location, active, totalAssignments, totalFte, payRegime.

**Categorías de rol (por orden):**
1. account
2. operations
3. strategy
4. design
5. development
6. media
7. unknown

### Person 360 (detalle)

Vista completa con secciones:
- **Member** — Perfil base, rol, ubicación
- **Access** — Permisos del visor (canViewAssignments, canViewCompensation, canViewPayroll, canEditProfile, canViewIntegrations, canViewDelivery)
- **Summary** — Resumen ejecutivo
- **Integrations** — Proveedores de identidad vinculados
- **Capacity** — Horas asignadas, assets activos, utilización
- **Finance** — Resumen financiero (si autorizado)
- **Assignments** — Asignaciones a proyectos/clientes
- **Compensation** — Versión actual de compensación
- **Payroll** — Historial de payroll reciente
- **HR Context** — Leave balances, attendance
- **Delivery Context** — Métricas de entrega

### Identity Confidence

- **strong** — 3+ source links activos con email coincidente
- **partial** — 2 source links
- **basic** — 1 source link

---

## 4. HR Core

**Superficie**: `/hr/attendance`, `/hr/departments`, `/hr/leave`
**Lib**: `src/lib/hr-core/`
**API**: `/api/hr/core/*`
**Fuente de datos**: PostgreSQL (greenhouse_core, greenhouse_hr)

### Sub-módulos

#### Departments

Gestión jerárquica de departamentos con head member y business unit.

#### Leave Management

- **Tipos de permiso** — Catálogo configurable (vacaciones, enfermedad, personal, etc.)
- **Balances** — Cálculo de días disponibles: allowance + carried_over - used - reserved
- **Solicitudes** — Workflow: `pending_supervisor → pending_hr → approved/rejected/cancelled`
- **Review** — Supervisores y HR pueden aprobar/rechazar con notas

#### Attendance

- **Registro** — Por día con status: present, late, absent, excused, holiday
- **Fuentes** — Manual o Microsoft Teams webhook
- **Minutos** — Tracking de minutos de presencia

---

## 5. HR Payroll

**Superficie**: `/hr/payroll`, `/hr/payroll/member/[memberId]`
**Lib**: `src/lib/payroll/`
**API**: `/api/hr/payroll/*`
**Fuente de datos**: PostgreSQL (greenhouse_payroll)

### Propósito

Gestión completa de nómina con soporte para régimen Chile e internacional.

### Workflow de período

```
draft → calculated → approved → exported
```

### Compensación

Versiones de compensación con vigencia temporal. Una persona puede tener múltiples versiones históricas pero solo una `is_current`.

Campos principales: base_salary, remote_allowance, bonus ranges (OTD/RPA), AFP, health system, contract type, APV.

### Cálculo de nómina (Chile)

1. **Base** — Salario base + remote allowance
2. **Bonos** — Basados en KPIs del período:
   - Bono OTD: Si `kpi_otd >= otd_threshold` (89%), se calcula dentro del rango min-max
   - Bono RPA: Si `kpi_rpa <= rpa_threshold` (2.0), se calcula dentro del rango min-max
3. **Deducciones Chile:**
   - AFP: ~10% sobre base (varía por administradora)
   - Salud: FONASA (7%) o ISAPRE (plan variable)
   - Seguro de Cesantía: % según contrato
   - Impuesto: Según tabla de tramos impositivos
   - APV: Monto fijo voluntario
4. **Net Total** = Base + Bonos - Deducciones

### Exportación

- **Excel** — Spreadsheet con todas las entries del período
- **PDF** — Documento formal del período
- **Receipt** — Recibo individual por miembro

---

## 6. Finance

**Superficie**: `/finance`, `/finance/clients/[id]`, `/finance/income/[id]`, `/finance/expenses/[id]`, `/finance/suppliers/[id]`, `/finance/reconciliation/[id]`
**Lib**: `src/lib/finance/`
**API**: `/api/finance/*`
**Fuente de datos**: PostgreSQL (greenhouse_finance)

### Sub-módulos

#### Accounts

Cuentas bancarias y financieras: checking, savings, credit_card, investment. Multi-currency.

#### Income

Registros de ingreso vinculados a clientes y líneas de servicio. Status workflow: pending → paid/overdue/cancelled. Soporte para registro de pagos.

#### Expenses

Gastos vinculados a proveedores, miembros, cuentas y líneas de servicio. Soporte para carga bulk y candidatos de payroll.

#### Suppliers

Proveedores con tax ID, categoría, método de pago, términos y flag de PO.

#### Exchange Rates

Tipos de cambio con tracking de fuente y fecha. Sincronización diaria automática (cron 23:05 UTC).

#### Reconciliation

Flujo completo de reconciliación bancaria:
1. Crear sesión de reconciliación para una cuenta
2. Cargar statements bancarios
3. Buscar candidatos de matching (income/expense vs statement)
4. Match manual o auto-match
5. Unmatch si es necesario
6. Excluir items irrelevantes

#### Finance Dashboard

- **Summary** — Totales de ingreso/egreso, balance, cuentas activas
- **Cashflow** — Flujo de caja por período
- **Aging** — Aging de cuentas por cobrar
- **By Service Line** — Breakdown financiero por línea de servicio

---

## 7. Capabilities

**Superficie**: `/capabilities/[moduleId]`
**Lib**: `src/lib/capabilities/`
**API**: `/api/capabilities/*`

### Propósito

Sistema de módulos de capacidad que muestra a cada tenant las capabilities que ha contratado, con datos específicos de cada módulo.

### Resolución de capabilities

1. Se obtienen las `businessLines` y `serviceModules` del tenant
2. Se comparan contra el `CAPABILITY_REGISTRY` (in-memory)
3. Se resuelven los módulos que matchean con `requiredBusinessLines` o `requiredServiceModules`
4. Se ordenan por prioridad

### Estructura de módulo

Cada capability tiene:
- **Definition** — id, label, description, icon, route, priority, theme
- **Theme** — creative, crm, onboarding, web
- **Cards** — Layout flexible con 10 tipos de card
- **Data Sources** — Fuentes de datos requeridas para el módulo

### Card types

| Tipo | Descripción |
|------|-------------|
| `metric` | Métrica individual |
| `project-list` | Lista de proyectos |
| `tooling-list` | Lista de herramientas |
| `quality-list` | Lista de métricas de calidad |
| `metric-list` | Lista de métricas |
| `chart-bar` | Gráfico de barras |
| `section-header` | Encabezado de sección |
| `pipeline` | Vista de pipeline |
| `metrics-row` | Fila de métricas |
| `alert-list` | Lista de alertas |

---

## 8. Agency

**Superficie**: `/agency`, `/agency/spaces`, `/agency/capacity`
**Lib**: `src/lib/agency/`
**API**: `/api/agency/*`
**Fuente de datos**: BigQuery

### Propósito

Vista transversal de la agencia para leadership y operations. Muestra salud de todas las cuentas, capacidad global y métricas de rendimiento.

### Pulse

Métricas globales de la agencia: RpA promedio, total assets, OTD global, feedback pending. Usa lógica de semáforo con umbrales configurables.

### Spaces

Lista de espacios/cuentas con health indicators: RpA, OTD, proyectos activos, miembros, FTE, usuarios, assets, feedback pending.

### Capacity

Vista de capacidad de la agencia: total FTE, utilización, horas mensuales, distribución per-person.

---

## 9. Admin

**Superficie**: `/admin`, `/admin/users/[id]`, `/admin/roles`, `/admin/tenants/[id]`, `/admin/team`, `/admin/ai-tools`
**Lib**: `src/lib/admin/`
**API**: `/api/admin/*`

### Sub-módulos

#### Tenant Management

- Lista de tenants con overview
- Detalle de tenant con capabilities, contactos, configuración
- Capability assignment (manual o sync desde HubSpot)
- Logo upload
- View-as mode (ver dashboard como si fuera el cliente)

#### User Management

- Detalle de usuario con roles asignados
- Asignación/revocación de roles
- Avatar upload

#### Role Management

- Catálogo de roles del sistema
- Vista de asignaciones

#### Team Admin

- CRUD de miembros del equipo
- CRUD de asignaciones
- Desactivación de miembros

#### AI Tools Admin

- Catálogo de herramientas AI (CRUD)
- Gestión de licencias (CRUD)
- Gestión de wallets de créditos (CRUD)
- Metadata para dropdowns y filtros

---

## 10. AI Tools & Credits

**Superficie**: Integrado en admin y dashboard
**Lib**: `src/lib/ai-tools/`, `src/lib/ai/`
**API**: `/api/ai-credits/*`, `/api/ai-tools/*`, `/api/admin/ai-tools/*`

### AI Tools Catalog

Catálogo de herramientas AI con:
- Proveedor (ai_vendor, software_suite, identity_provider, delivery_platform, financial_vendor)
- Categoría (gen_visual, gen_video, gen_text, gen_audio, ai_suite, creative_production, etc.)
- Modelo de costo (subscription, per_credit, hybrid, free_tier, included)

### AI Credits

- **Wallets** — Por scope (client o pool), con limits mensuales
- **Balance health** — healthy, warning, critical, depleted
- **Ledger** — Registro de consumos, recargas, reservas, liberaciones, ajustes
- **Summary** — Vista agregada admin y por cliente

### Greenhouse Agent

Agente GenAI interno usando Vertex AI:
- Modos: `plan` (arquitectura), `pair` (next steps), `review` (análisis crítico), `implement` (código)
- Modelo configurable via `GREENHOUSE_AGENT_MODEL`

---

## 11. Integrations

**Lib**: `src/lib/integrations/`
**API**: `/api/integrations/v1/*`

### HubSpot Integration

Microservicio de integración que expone:
- **Service Contract** — Contratos de servicio activos
- **Company Profile** — Perfil de empresa con lifecycle stage, owner, business lines
- **Company Contacts** — Contactos asociados a la empresa
- **Live Context** — Contexto en tiempo real para el portal
- **Company Owner** — Owner de la cuenta en HubSpot

Timeout: 4000ms. Endpoint configurable via `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`.

### Integration API

APIs externas para que sistemas como HubSpot sincronicen datos:
- Listar tenants con filtros
- Catálogo de capabilities
- Sincronizar capabilities de un tenant

---

## 12. Internal Dashboard

**Superficie**: `/internal/dashboard`
**Vista**: `src/views/greenhouse/internal/dashboard/`

### Propósito

Dashboard interno para equipo Efeonce con métricas operativas transversales a todas las cuentas.

---

## 13. Team Capacity

**Lib**: `src/lib/team-capacity/`
**API**: Via `/api/team/*`

### Propósito

Cálculos de capacidad y utilización del equipo.

### Métricas clave

- **FTE Allocation** — Porcentaje de dedicación (1.0 = full time = 160 hrs/mes)
- **Assigned Hours** — Horas asignadas en el mes
- **Utilization Percent** — Horas asignadas / horas disponibles
- **Capacity Health**:
  - `idle`: < 30% utilización
  - `balanced`: 30-85%
  - `high`: 85-100%
  - `overloaded`: > 100%

### Breakdown

- Por rol (account, operations, strategy, design, development, media)
- Por proyecto
- Por sprint
- Health buckets (idle, balanced, high, overloaded)
