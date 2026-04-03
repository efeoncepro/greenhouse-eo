# Greenhouse Portal — Modelo de Datos

> Versión: 2.1
> Fecha: 2026-04-02
> Actualización: Dual-store completo (PostgreSQL + BigQuery), 11 schemas, 119+ tablas, eventos canonicalizados, sincronización integral, Person ↔ Organization completo

---

## Arquitectura de datos dual

Greenhouse opera con dos capas de datos complementarias que coexisten en sincronía:

- **PostgreSQL (Cloud SQL `greenhouse-pg-dev`)** — Store transaccional canónico. 11 schemas (core, ai, cost_intelligence, crm, delivery, finance, hr, notifications, payroll, serving, sync). Fuente de verdad para escrituras, transacciones, y cambios en tiempo real. Emite eventos al outbox; base de operaciones de payroll, finance, AI tooling, HR.
- **BigQuery (`efeonce-group`)** — Data warehouse analítico. Snapshots, conformed tables, marts, histórico. Lectura masiva, dashboards, reportes, análisis de costo. Sincronizado desde PostgreSQL vía outbox + CDC (Change Data Capture).

**Patrón de lectura:**
- Postgres primero para transacciones mutables (payroll updates, finance accruals, AI credits)
- BigQuery fallback para análisis histórico y reportes de lectura masiva
- Serving layer (vistas 360) en PostgreSQL para lectura de datos enriquecidos en portal

---

## PostgreSQL — 11 Schemas y 119+ Tablas

### 1. greenhouse_core (31 tablas)

Identidades canónicas, acceso, organizaciones, espacios, personas, servicios, integraciones.

#### Identidades y Personas

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `identity_profiles` | Humano canónico (independiente de sistema fuente) | `identity_profile_id` (EO-ID{seq}) |
| `identity_profile_source_links` | Trazabilidad: identity_profile ↔ HubSpot/Notion/manual | (identity_profile_id, source_system, source_id) |
| `members` | Faceta operativa: colaborador Efeonce con payroll, HR, capacidad, costo | `member_id` (EO-MBR-{uuid}) |
| `person_memberships` | Vínculo persona → organización (team_member, contact, client_user, billing) | `membership_id` (mbr-{uuid}) |
| `departments` | Estructura organizacional interna | `department_id` |
| `team_assignments` (legacy ≈ `client_team_assignments`) | Member → client assignment: FTE, capacidad, economics | `assignment_id` |

#### Organizaciones y Espacios

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `organizations` | Entidades B2B: client, supplier, efeonce operating entity | `organization_id` (org-{uuid}) |
| `spaces` | Tenant operativo bajo org; puente a legacy `client_id` | `space_id` (spc-{uuid}) |
| `clients` (legacy) | Compatibilidad con sistema anterior; ↔ spaces | `client_id` |
| `client_users` | Portal users vinculados a un tenant/client | `client_user_id` |

#### Servicios y Productos

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `services` | Servicios ofrecidos (v1 simple, v2 en `service_modules`) | `service_id` (svc-{uuid}) |
| `service_modules` | Catálogo de productos/servicios (v2) | `module_id` (svc-{uuid}) |
| `service_history` | Histórico de servicios activados/desactivados por cliente | (service_id, client_id, version) |
| `client_service_modules` | Cliente → módulo service: habilitación, configuración | (client_id, module_id) |
| `client_feature_flags` | Feature flags por tenant | (client_id, feature_code) |

#### Acceso y RBAC

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `roles` | Catálogo de roles (efeonce_admin, hr_manager, client_specialist, etc.) | `role_code` |
| `user_role_assignments` | Usuario → rol (múltiples posibles) | (client_user_id, role_code) |
| `user_project_scopes` | Usuario puede ver solo proyectos {X, Y, Z} | (client_user_id, project_id) |
| `user_campaign_scopes` | Usuario puede ver solo campañas {A, B, C} | (client_user_id, campaign_id) |
| `user_client_scopes` | Usuario scope a un client específico | (client_user_id, client_id) |
| `role_view_assignments` | Rol → vistas permitidas (operativo, financiero, etc.) | (role_code, view_type) |
| `user_view_overrides` | Override de acceso a vista específica | (client_user_id, view_code) |
| `view_access_registry` | Catálogo de vistas del portal con metadatos de acceso | `view_code` |

#### Campañas y Proyectos

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `campaigns` | Campañas/iniciativas del cliente | `campaign_id` |
| `campaign_project_links` | Campaña ↔ Proyecto (m2m) | (campaign_id, project_id) |

#### Integraciones Externas

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `space_notion_sources` | Space ↔ Notion workspace mapping | (space_id, notion_workspace_id) |
| `space_notion_publication_targets` | Space ↔ Notion database para publication | (space_id, database_id) |
| `notion_workspaces` | Catálogo de workspaces Notion conectados | `notion_workspace_id` |
| `notion_workspace_source_bindings` | Notion workspace ↔ source sync config | (workspace_id, binding_id) |
| `providers` | Catálogo de proveedores externos | `provider_id` (prv-{uuid}) |
| `entity_source_links` | Entidad Greenhouse ↔ source system | (entity_type, entity_id, source, source_id) |
| `integration_registry` | Registro de sistemas integrados (HubSpot, Notion, etc.) | `integration_id` |

#### Assets y Auditoria

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `assets` | Archivos compartidos del portal | `asset_id` (ast-{uuid}) |
| `asset_access_log` | Quién descargó/accedió qué asset | (asset_id, accessed_by, timestamp) |
| `audit_events` | Log de cambios para compliance | `audit_event_id` |
| `auth_tokens` | Tokens de sesión y API | (user_id, token_hash) |

#### SCIM y Provisionamiento

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `scim_groups` | Grupos SCIM para SSO provisioning | `scim_group_id` |
| `scim_group_memberships` | Miembro ↔ SCIM group | (scim_group_id, client_user_id) |
| `scim_tenant_mappings` | Tenant ↔ SCIM provisioning config | (client_id, scim_config_id) |
| `scim_sync_log` | Log de provisionamiento SCIM | `scim_sync_log_id` |

#### Business Intelligence

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `business_line_metadata` | Líneas de negocio (BU) | `business_line_id` |

---

### 2. greenhouse_ai (7 tablas)

AI tooling: credenciales, créditos, conversaciones, agentes NEXA.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `ai_tool_catalog` | Catálogo de herramientas IA (Claude, ChatGPT, etc.) | `tool_id` |
| `ai_member_tool_licenses` | Member → tool license | `license_id` |
| `ai_credit_wallets` | Cartera de créditos por client/tool | `wallet_id` |
| `ai_credit_ledger` | Transacciones de consumo/recarga de créditos | `ledger_id` |
| `ai_nexa_feedback` | Retroalimentación de sesiones NEXA | `feedback_id` |
| `ai_nexa_threads` | Hilos de conversación de NEXA | `thread_id` |
| `ai_nexa_messages` | Mensajes individuales en threads | `message_id` |

---

### 3. greenhouse_cost_intelligence (2 tablas)

Cierre de períodos contables y readiness.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `period_closure_config` | Configuración de cierre de período (tipo, requerimientos) | `config_id` |
| `period_closure_tracking` | Estado de readiness del cierre (%, validaciones, stamps) | `closure_id` |

---

### 4. greenhouse_crm (3 tablas)

Datos sincronizados desde HubSpot.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `hubspot_companies` | Snapshot de companies HubSpot | (hubspot_id) |
| `hubspot_contacts` | Snapshot de contacts HubSpot | (hubspot_id) |
| `hubspot_deals` | Snapshot de deals HubSpot | (hubspot_id) |

---

### 5. greenhouse_delivery (7 tablas)

Delivery, staff augmentation, proyectos Notion sincronizados.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `delivery_projects` | Proyectos Notion importados | `project_id` |
| `delivery_sprints` | Sprints dentro de proyectos | `sprint_id` |
| `delivery_tasks` | Tareas/user stories sincronizadas | `task_id` |
| `staff_aug_placements` | Colocación de staff augmentation: member → customer, con rates y SLA | `placement_id` |
| `staff_aug_onboarding_items` | Items de onboarding para placements | `onboarding_item_id` |
| `staff_aug_events` | Eventos (start, end, status change) de placements | `event_id` |
| `space_property_mappings` | Notion property ↔ Greenhouse field transformations | `mapping_id` |

---

### 6. greenhouse_finance (19 tablas)

Módulo completo: ingresos, gastos, proveedores, impuestos chilenos, reconciliación, asignación de costos, factoring.

#### Core

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `accounts` | Plan de cuentas | `account_id` |
| `income` | Ingresos por cliente/proyecto | `income_id` (INC-YYYY-MM-NNN) |
| `income_payments` | Pagos recibidos | `payment_id` |
| `income_line_items` | Ítems de línea normalizados desde JSON | `line_item_id` |
| `expenses` | Gastos incurridos | `expense_id` |
| `suppliers` | Catálogo de proveedores | `supplier_id` |
| `supplier_payment_schedules` | Calendario de pagos a proveedores | `schedule_id` |

#### Chile-Specific

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `dte_emitted` | DTEs (Documentos Tributarios Electrónicos) emitidos | `dte_id` |
| `dte_received` | DTEs recibidos de proveedores | `dte_id` |
| `exchange_rates` | Tasas de cambio USD/CLP | (currency_pair, date) |
| `economic_indicators` | Indicadores económicos (UF, IPC) | (indicator_code, period) |
| `chile_afp_rates` | Tasas AFP (fondos de pensión) | (afp_id, month, rate) |
| `chile_previred_indicators` | Indicadores PREVIRED | (indicator_id, month) |
| `chile_tax_brackets` | Tramos impositivos de RUT | (year, from_amount, to_amount, tax_rate) |

#### Reconciliation & Allocations

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `reconciliation_periods` | Períodos de reconciliación bancaria/contable | `period_id` |
| `bank_statement_rows` | Filas de extracto bancario importado | `row_id` |
| `cost_allocations` | Asignación de costos indirectos a clientes/proyectos | `allocation_id` |
| `auto_allocation_rules` | Reglas automáticas de asignación | `rule_id` |

#### Advanced

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `quotes` | Cotizaciones a clientes | `quote_id` |
| `purchase_orders` | Órdenes de compra | `po_id` |
| `service_entry_sheets` (HES) | Hojas de entrada de servicio (para factoring) | `hes_id` |
| `factoring_operations` | Operaciones de factoring/descuento de cuentas | `factoring_id` |
| `client_profiles` | Perfil financiero del cliente (cliente financiero + org) | `client_profile_id` |
| `client_economics` | Economics dashboard del cliente | `economics_id` |
| `nubox_emission_log` | Log de emisiones a NuBox | `emission_id` |

---

### 7. greenhouse_hr (5 tablas)

HR operativo: solicitudes de permiso, saldos, políticas.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `leave_types` | Tipos de permiso (vacaciones, enfermedad, etc.) | `leave_type_id` |
| `leave_policies` | Políticas por client/member | `policy_id` |
| `leave_balances` | Saldo acumulado de permiso | (member_id, leave_type_id, year) |
| `leave_requests` | Solicitudes de permiso | `request_id` |
| `leave_request_actions` | Historial: approval, rejection, cancellation | (request_id, action_timestamp) |

---

### 8. greenhouse_notifications (5 tablas)

Notificaciones: eventos, deliveries, preferencias, suscripciones.

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `notifications` | Evento de notificación | `notification_id` |
| `notification_deliveries` | Intento de envío (email, push, in-app) | `delivery_id` |
| `notification_subscriptions` | Usuario suscrito a evento | (user_id, event_type) |
| `notification_preferences` | Preferencias (frecuencia, canales) | (user_id, preference_type) |
| `email_delivery_log` | Log detallado de envíos email | `email_id` |

---

### 9. greenhouse_payroll (13 tablas)

Nómina: períodos, entradas, recibos, compensación, indicadores chilenos, proyecciones.

#### Core Payroll

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `payroll_periods` | Período de nómina (mes, quincena) | `period_id` |
| `payroll_entries` | Entrada de nómina (member x period) | (member_id, period_id) |
| `payroll_receipts` | Recibo de nómina emitido | `receipt_id` |
| `payroll_export_packages` | Paquetes de exportación (NuBox, SII, etc.) | `package_id` |

#### Compensation

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `compensation_versions` | Versiones de compensación de member | `version_id` |
| `payroll_bonus_config` | Configuración de bonos | `bonus_config_id` |

#### Chile-Specific Indicators

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `chile_afp_rates` (shared con finance) | Tasas AFP mensuales | (afp_id, month) |
| `chile_previred_indicators` (shared con finance) | Indicadores PREVIRED | (indicator_id, month) |
| `chile_tax_brackets` (shared con finance) | Tramos RUT | (year, range) |
| `previred_afp_rates` | Snapshot PREVIRED de tasas AFP | (period_id, afp_id) |
| `previred_period_indicators` | Snapshot PREVIRED de indicadores | (period_id, indicator_id) |

#### Projections & Analysis

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `attendance_monthly_snapshot` | Asistencia consolidada por mes | (member_id, month) |
| `projected_payroll_promotions` | Promociones de nómina proyectada → oficial | (period_id, promotion_id) |

---

### 10. greenhouse_serving (26 tablas)

Vistas materializadas 360: clientes, miembros, personas, usuarios, proveedores, economía de capacidad, P&L operacional.

#### Person & Team 360

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `person_360` | Persona enriquecida: identidad + memberships + contexto | `person_id` |
| `person_delivery_360` | Persona + delivery (proyectos, sprints, tasks) | (person_id, period) |
| `person_finance_360` | Persona + finance (ingresos facturados, gastos) | (person_id, period) |
| `person_hr_360` | Persona + HR (permisos, contrato, departamento) | (person_id, period) |
| `person_operational_360` | Persona + operativo (org, assignments, memberships) | (person_id, period) |
| `member_360` | Member enriquecido: payroll, capacidad, costo, ICO | `member_id` |
| `member_capacity_economics` | Member: FTE, utilización, costo laboral | (member_id, period) |
| `member_leave_360` | Member: permisos, saldos, impacto nómina | (member_id, period) |
| `member_payroll_360` | Member: nómina, compensación, bonos proyectados | (member_id, period) |

#### Organization & User 360

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `organization_360` | Organización enriquecida: económica, operativa, de entrega | `organization_id` |
| `organization_operational_metrics` | Org: KPIs operativos (FTE, capacidad, utilización) | (organization_id, period) |
| `session_360` | Contexto de sesión usuario: tenant, org, scope, permisos | `session_id` |
| `user_360` | User enriquecido: acceso, roles, scopes, tenant context | `user_id` |

#### Client & Delivery 360

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `client_360` | Cliente enriquecido: económica, delivery, FTE, costo | `client_id` |
| `client_capability_360` | Cliente: servicios activos, uso, economics | (client_id, capability_id) |
| `client_labor_cost_allocation` | Cliente: costos de labor assigned | (client_id, period) |
| `delivery_project_360` | Proyecto: tareas, sprints, staff asignado, P&L | `project_id` |

#### Finance & Economics 360

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `client_profitability_metrics` | Cliente: ingresos, COGS, margen operativo | (client_id, period) |
| `income_360` | Ingreso enriquecido: cliente, proyecto, lineas, payments | `income_id` |
| `provider_360` | Proveedor enriquecido: gastos, POs, facturación | `provider_id` |
| `provider_finance_360` | Proveedor: gastos, pagos, términos | (provider_id, period) |
| `provider_tooling_snapshots` | Proveedor: herramientas, costos, snapshots | (provider_id, period) |

#### Cost Intelligence & P&L

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `commercial_cost_attribution` | Asignación de costos a clientes (supply) | (attribution_id, client_id, period) |
| `operational_pl_snapshots` | P&L operacional por entidad (org, client, project) | (entity_type, entity_id, period) |
| `staff_aug_placement_snapshots` | Staff augmentation: snapshots de economic state | (placement_id, period) |

#### AI & ICO Intelligence

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `ico_member_metrics` | Member: ICO scores, engagement, projections | (member_id, period) |
| `ico_organization_metrics` | Org: ICO health, member distribution, P&L impact | (organization_id, period) |

#### Space Health & Closing

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `notion_workspace_360` | Workspace Notion: readiness, schema, sync state | `workspace_id` |
| `period_closure_status` | Estado detallado del cierre de período | (period_id, entity_type) |
| `metric_threshold_overrides` | Override de umbrales para alertas/KPIs | (metric_code, entity_id, threshold) |

---

### 11. greenhouse_sync (15 tablas)

Sincronización: outbox, webhooks, proyecciones reactivas, reconciliación identity, dead letter queue.

#### Outbox Pattern (Event Sourcing)

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `outbox_events` | Eventos emitidos por cambios en Postgres (CDC) | `event_id` |
| `outbox_reactive_log` | Log de proyecciones disparadas por outbox | (event_id, projection_type) |

#### Source Sync (Notion, HubSpot)

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `source_sync_runs` | Ejecución de sync desde source system | `run_id` |
| `source_sync_failures` | Fallos en sync con contexto | `failure_id` |
| `source_sync_watermarks` | Marca de agua: último sync timestamp por source | (source_system, entity_type) |
| `integration_sync_state` | Estado de sincronización por integration | `integration_id` |
| `source_runtime_projections` | Proyecciones de fuente en runtime | (source_id, entity_type) |

#### Webhooks (Inbound & Outbound)

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `webhook_endpoints` | Endpoints registrados para webhooks | `endpoint_id` |
| `webhook_subscriptions` | Suscripción a eventos webhook | `subscription_id` |
| `webhook_deliveries` | Intento de envío de webhook | `delivery_id` |
| `webhook_delivery_attempts` | Reintentos de delivery con backoff | (delivery_id, attempt_num) |
| `webhook_inbox_events` | Webhooks recibidos (para validación/replay) | `inbox_id` |

#### Reactive Projections & Recovery

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `projection_refresh_queue` | Cola de vistas que necesitan refresh | `queue_id` |

#### Data Quality & Reconciliation

| Tabla | Descripción | PK |
|-------|-------------|-----|
| `identity_reconciliation_proposals` | Propuestas de reconciliación de identidad | `proposal_id` |
| `integration_schema_snapshots` | Snapshots de schema de source systems | `snapshot_id` |
| `integration_schema_drifts` | Detección de schema drift | `drift_id` |
| `integration_space_readiness` | Readiness de espacios para integration | (space_id, integration_id) |
| `event_replay_log` | Log de replay de eventos | `replay_id` |
| `dead_letter_queue` | Eventos que fallaron procesamiento | `dlq_id` |
| `notion_space_schema_snapshots` | Snapshots de schema Notion | (workspace_id, timestamp) |
| `notion_space_schema_drift_events` | Eventos de schema drift Notion | `event_id` |
| `notion_space_kpi_readiness` | Readiness KPIs de spaces Notion | (space_id, metric) |
| `notion_publication_runs` | Ejecuciones de publicación Notion → Postgres | `run_id` |
| `service_sync_queue` | Cola de sincronización de servicios | `queue_id` |

---

## BigQuery — Datasets y Tablas

### Dataset: greenhouse

Tablas core de identidad y acceso (replicadas desde PostgreSQL).

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `clients` | Table | Clientes/tenants |
| `client_users` | Table | Portal users |
| `roles` | Table | Catálogo de roles |
| `user_role_assignments` | Table | Usuario → rol |
| `user_project_scopes` | Table | Usuario → proyectos visibles |
| `user_campaign_scopes` | Table | Usuario → campañas visibles |
| `user_client_scopes` | Table | Usuario → client scope |
| `service_modules` | Table | Catálogo servicios/productos |
| `client_service_modules` | Table | Cliente → módulo |
| `client_feature_flags` | Table | Feature flags por tenant |
| `identity_profiles` | Table | Personas canónicas |
| `identity_profile_source_links` | Table | Trazabilidad: identity ↔ source |
| `audit_events` | Table | Cambios auditables |
| `team_members` | View | Legacy view de members |

---

### Dataset: notion_ops

Datos operativos sincronizados desde Notion.

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `tareas` | Table | Tasks sincronizadas: estado, RPA, compliance, sprints |
| `proyectos` | Table | Projects con metadata |

---

### Dataset: greenhouse_raw

CDC crudo desde PostgreSQL.

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `postgres_outbox_events` | Table | Stream de eventos outbox (replicado) |

---

### Dataset: greenhouse_conformed

Tablas conformed: transformadas y enriquecidas desde raw.

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `delivery_projects` | Table | Proyectos enriquecidos (Notion + context) |
| `delivery_tasks` | Table | Tasks enriquecidas |
| `nubox_sales` | Table | Sales conformed (desde raw snapshot) |
| `nubox_purchases` | Table | Purchases conformed |

---

### Dataset: greenhouse_ico

ICO Intelligence: métricas, snapshots, vistas.

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `metric_snapshots_monthly` | Table | Snapshots mensuales de métricas ICO |
| `stuck_assets_detail` | Table | Assets bloqueados por analizar |
| `rpa_trend` | Table | Trend de RPA en el tiempo |
| `metrics_by_project` | Table | Métricas ICO agregadas por proyecto |
| `metrics_by_member` | Table | Métricas ICO agregadas por miembro |
| `ai_metric_scores` | Table | Scores de AI tooling |
| `status_phase_config` | Table | Configuración de fases de status |
| `v_tasks_enriched` | View | Tasks enriched con contexto |
| `v_metric_latest` | View | Latest metric snapshot |

---

### Dataset: nubox_raw_snapshots

Snapshots crudos desde NuBox (ERP externo).

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `sales_raw` | Table | Sales raw de NuBox |
| `purchases_raw` | Table | Purchases raw |
| `expenses_raw` | Table | Expenses raw |
| `incomes_raw` | Table | Incomes raw |

---

### Dataset: nubox_conformed

Conformed layer desde NuBox raw.

| Tabla | Tipo | Descripción |
|-------|------|-------------|
| `conformed_sales` | Table | Sales conformed |
| `conformed_purchases` | Table | Purchases conformed |

---

## Modelo de Identidad Canónica — Person 360

### Identidad Core

```
identity_profile (PK: identity_profile_id = EO-ID{seq})
    ├─ full_name, email (primario)
    ├─ identity_profile_source_links
    │    ├─ HubSpot contact_id
    │    ├─ Notion user ID
    │    └─ Manual (creado en Greenhouse)
    └─ status (active, archived)
```

**Propósito:** Una sola verdad para cada humano, independiente de dónde se descubrió (HubSpot, Notion, o creado manualmente en Greenhouse).

### Contexto Operativo

```
identity_profile
    ├─ Población A (Colaboradores Efeonce)
    │    ├─ member (FK: identity_profile_id)
    │    │    ├─ payroll, HR, capacidad, costo laboral
    │    │    └─ client_team_assignments → múltiples clientes (FTE allocation)
    │    └─ person_memberships (type='team_member')
    │         └─ Proyectadas automáticamente desde assignments
    │
    ├─ Población B (Personas del cliente)
    │    ├─ NO tienen faceta `member`
    │    └─ person_memberships (type='contact'|'client_user'|'billing')
    │         └─ Relaciones laborales reales con org cliente
    │
    └─ Población C (Contactos de proveedor)
         ├─ identity_profile mínimo (nombre + email)
         └─ person_memberships (type='contact')
              └─ Vínculo a supplier organization
```

### Person 360 (vista materializada)

```sql
SELECT
  person_id,
  full_name, email,
  primary_organization_id, primary_organization_name,
  primary_membership_type,
  organization_membership_count,
  -- Aliases canónicos
  eo_id, member_id, user_id,
  is_efeonce_collaborator,
  -- Delivery context
  active_projects,
  -- Finance context
  total_income_facturado, total_cost_laboral,
  -- HR context
  leave_balance, pending_requests
FROM greenhouse_serving.person_360
```

---

## Modelo Account 360 — Organizations → Spaces → People

### Organización Canónica

```
organizations (PK: organization_id = org-{uuid})
    ├─ legal_name, tax_id (RUT)
    ├─ organization_type (client | supplier | both | other)
    ├─ is_operating_entity = TRUE ↔ Efeonce Group SpA (empleador, DTE issuer)
    ├─ 0..* spaces (FK: organization_id)
    └─ 0..* person_memberships
         ├─ Población B: empleados/contactos cliente
         └─ Población A (proyectadas): team_members desde assignments
```

**Regla de promoción:** si una org tipo `client` se usa como proveedor, su tipo se promueve a `both`.

### Space (Tenant operativo)

```
spaces (PK: space_id = spc-{uuid})
    ├─ organization_id (FK)
    ├─ client_id (legacy compat, denorm)
    ├─ space_name, description
    ├─ 0..* service_modules activos
    ├─ 0..* feature_flags
    ├─ 0..* notion_sources (mapeos a workspaces Notion)
    └─ settings (timezone, locale, etc.)
```

### Memberships (dos grafos)

#### Grafo Operativo (Assignments)

```
client_team_assignments (member → client)
    ├─ member_id (FK: members)
    ├─ client_id
    ├─ fte_allocation (0.1–2.0)
    ├─ assignment_type (internal | staff_augmentation)
    ├─ start_date, end_date
    └─ Alimenta: payroll cost allocation, commercial economics

    ↓ Proyecta automáticamente ↓

person_memberships (member_id → organization vía client)
    ├─ membership_type = 'team_member'
    ├─ is_primary
    └─ role_label, department
```

**Consumidor:** Payroll cost allocation, commercial cost attribution, member capacity economics, operational P&L snapshots.

#### Grafo Estructural (Memberships)

```
person_memberships (identity_profile → organization)
    ├─ membership_id (PK: mbr-{uuid})
    ├─ person_id (FK: identity_profiles)
    ├─ organization_id (FK: organizations)
    ├─ membership_type
    │    ├─ team_member (Población A, desde assignments)
    │    ├─ contact (Población B, relación laboral real)
    │    ├─ client_user (Población B, acceso portal)
    │    └─ billing (Población B, contacto facturación)
    ├─ is_primary (TRUE para primary membership)
    ├─ role_label, department
    ├─ start_date, end_date
    └─ Alimenta: org detail, person detail, HubSpot sync, navegación
```

**Consumidor:** Vista org, persona detail, sync HubSpot, contexto de sesión.

### Account 360 (vista materializada)

```sql
SELECT
  organization_id, legal_name, tax_id,
  organization_type,
  is_operating_entity,
  -- Memberships
  member_count (team_member),
  contact_count (contact),
  active_assignments,
  -- Delivery
  active_projects, task_count,
  -- Finance
  total_income_ytd, total_cost_ytd, gross_margin,
  -- Economic health
  fte_utilization, capacity_available,
  -- Serving
  last_update_timestamp
FROM greenhouse_serving.organization_360
```

---

## Convención de IDs Públicos

### Formatos Canónicos

| Entidad | Formato | Ejemplo | Almacenado en | Patrón |
|---------|---------|---------|---------------|--------|
| **Person** | `EO-ID{seq}` | `EO-ID42` | `identity_profiles.identity_profile_id` | Secuencia de 1 a N |
| **Member** | `EO-MBR-{uuid}` | `EO-MBR-a1b2-3c4d` | `members.member_id` | UUID v4 con prefijo |
| **Organization** | `org-{uuid}` | `org-a1b2-3c4d` | `organizations.organization_id` | UUID v4 con prefijo (interno) |
| **Space** | `spc-{uuid}` | `spc-a1b2-3c4d` | `spaces.space_id` | UUID v4 con prefijo (interno) |
| **Service** | `svc-{uuid}` | `svc-a1b2-3c4d` | `service_modules.module_id` | UUID v4 con prefijo (interno) |
| **Client** (legacy) | `EO-ORG-{seq}` | `EO-ORG-0001` | `clients.client_id` | Secuencia de 4 dígitos |
| **Income** | `INC-YYYY-MM-{seq}` | `INC-2026-04-001` | `finance.income.income_id` | Año-Mes-Secuencia |
| **Provider** | `prv-{uuid}` | `prv-a1b2-3c4d` | `providers.provider_id` | UUID v4 con prefijo (interno) |
| **Asset** | `ast-{uuid}` | `ast-a1b2-3c4d` | `assets.asset_id` | UUID v4 con prefijo (interno) |

### Reglas

1. IDs públicos (expuestos en URLs/APIs): `EO-ID`, `EO-MBR-`, `EO-ORG-`, `INC-`, etc.
2. IDs internos (no en URLs, base datos): `org-`, `spc-`, `svc-`, `prv-`, `ast-`, `mbr-`
3. Secuencias: Mantenidas en tablas separadas (sequence PostgreSQL)
4. UUIDs: v4, sin dashes en almacenamiento, con dashes en presentación pública

---

## Relaciones Clave Entre Entidades

### Diagrama de Contexto

```
┌──────────────────────────────────────────────────────────────┐
│                    IDENTIDAD CANÓNICA                        │
│                  identity_profiles (Person)                  │
│              Ancla de todo humano en el sistema              │
└──────────────────────────────────────────────────────────────┘
                      ↑              ↑              ↑
           (link)     |     (link)   |     (link)   |
        HubSpot       |   Notion     |    Manual    |
        contact       |   user       |   Greenhouse |
                      ↓              ↓              ↓
┌──────────────┬────────────────────┬──────────────┬──────────────┐
│              │                    │              │              │
│   members    │  person_memberships│  client_users│   providers  │
│  (Población  │   (Población A→B→C)│ (Población A │  (Contactos  │
│      A)      │                    │      +B)     │ Proveedores) │
└──────┬───────┴────────┬───────────┴──────────────┴──────────────┘
       │                │
       │ (FK)           │ (FK)
       │                │
   ┌───▼────────────────▼─────────────────────┐
   │     ORGANIZACIONES & SPACES               │
   │  organizations (org-{uuid})               │
   │     ├─ spaces (spc-{uuid})                │
   │     ├─ 0..* service_modules               │
   │     └─ 0..* feature_flags                 │
   └─────────────────────────────────────────┘
       │
       │ (FK: organization_id)
       │
   ┌───▼────────────────────────────────────┐
   │  ASSIGNMENTS (Grafo Operativo)         │
   │  client_team_assignments                │
   │     ├─ member_id                        │
   │     ├─ client_id                        │
   │     ├─ fte_allocation                   │
   │     └─ assignment_type                  │
   │         └─ Proyecta membership_type     │
   │            = 'team_member'              │
   └────────────────────────────────────────┘
       │
       ↓
   ┌────────────────────────────────────────┐
   │  SERVING VIEWS (Vistas Materializadas) │
   │  ├─ person_360                         │
   │  ├─ organization_360                   │
   │  ├─ member_360                         │
   │  ├─ client_360                         │
   │  └─ operational_pl_snapshots            │
   └────────────────────────────────────────┘
```

### Relaciones clave

| Relación | Desde | Hacia | Tipo | Patrón |
|----------|-------|-------|------|--------|
| Person → Member | `identity_profiles` | `members` | 1:0..1 | Población A solo |
| Person → Memberships | `identity_profiles` | `person_memberships` | 1:0..* | Múltiples orgs |
| Person → User | `identity_profiles` | `client_users` | 1:0..1 | Auth principal |
| Member → Assignments | `members` | `client_team_assignments` | 1:0..* | Múltiples clientes |
| Org → Spaces | `organizations` | `spaces` | 1:0..* | 1+ space por org |
| Org → Memberships | `organizations` | `person_memberships` | 1:0..* | Múltiples personas |
| Space → Services | `spaces` | `client_service_modules` | 1:0..* | Servicios activos |
| Notion → Delivery | `space_notion_sources` | `delivery_projects` | 1:0..* | Sync bidireccional |

---

## Catálogo de Eventos (Outbox)

Sistema de eventos síncronos y reactivos. Emitidos al momento de cambios en PostgreSQL; consumidos por proyecciones reactivas, webhooks, BigQuery.

### Dominios y Agregados (55+ tipos)

#### Identidad & Personas (6)

- `identity.profile.created`
- `identity.profile.linked` (↔ source: HubSpot, Notion)
- `identity.reconciliation.proposed` (propuesta de merge)
- `identity.reconciliation.approved`
- `identity.reconciliation.rejected`
- `identity.email_verification.{requested,completed}`

#### Account 360 (3)

- `organization.created` | `.updated`
- `membership.created` | `.updated` | `.deactivated`

#### People & HR Core (6)

- `member.created` | `.updated` | `.deactivated`
- `assignment.created` | `.updated` | `.removed`
- `department.{created,updated}`

#### Finance (20+)

**Core:**
- `finance.income.{created,updated}`
- `finance.expense.{created,updated}`
- `finance.supplier.{created,updated}`
- `finance.income_payment.{created,recorded}`
- `finance.cost_allocation.{created,deleted}`

**Indicators & Economics:**
- `finance.economic_indicator.upserted`
- `finance.exchange_rate.upserted`
- `provider.upserted`
- `provider.tooling_snapshot.materialized`

**DTE Reconciliation (Chile):**
- `finance.dte.auto_matched`
- `finance.dte.matched`
- `finance.dte.discrepancy_found`

**Advanced Instruments:**
- `finance.quote.created`
- `finance.quote.converted`
- `finance.credit_note.created`
- `finance.purchase_order.{created,consumed,expiring,expired}`
- `finance.hes.{submitted,approved,rejected}`

**Data Quality:**
- `finance.balance_divergence.detected`
- `finance.sii_claim.detected`

#### Payroll (9)

- `payroll_period.{created,updated,calculated,approved,exported}`
- `payroll_entry.upserted`
- `leave_request.{created,escalated_to_hr,approved,rejected,cancelled,payroll_impact_detected}`
- `compensation_version.{created,updated}`
- `payroll.previsional_snapshot.upserted`

#### AI Tooling (8)

- `ai_tool.{created,updated}`
- `ai_license.{created,reactivated,updated}`
- `ai_wallet.{created,updated}`
- `ai_wallet.credits_consumed`

#### Delivery & Staff Augmentation (5)

- `staff_aug.placement.{created,updated,status_changed}`
- `staff_aug.onboarding_item.updated`
- `staff_aug.placement_snapshot.materialized`

#### Services (1)

- `service.{created,updated,deactivated}`

#### Cost Intelligence (5)

- `accounting.period_closed`
- `accounting.period_reopened`
- `accounting.commercial_cost_attribution.materialized`
- `accounting.pl_snapshot.materialized`
- `accounting.margin_alert.triggered`

#### Access & Governance (2)

- `access.view_override_changed`
- `asset.{uploaded,attached,deleted,downloaded}`

#### Person Intelligence (2)

- `compensation.updated`
- `ico.materialization.completed`

---

## Sistema de Migraciones

Framework: **node-pg-migrate** (SQL-first, versionado).

### Ciclo de vida

```
pnpm migrate:create <nombre>
    → Genera: migrations/TIMESTAMP_nombre.sql

Editar migration/TIMESTAMP_nombre.sql
    → SQL puro (CREATE TABLE, ALTER, INSERT, etc.)

pnpm migrate:up
    → Aplica y registra en schema_migrations
    → Auto-regenera src/types/db.d.ts (Kysely codegen)

Commit migration + tipos regenerados
    → Deploy

pnpm migrate:down
    → Rollback (desarrollo local)
    → NUNCA en prod sin ceremony
```

### Migraciones actuales (20)

| Timestamp | Descripción |
|-----------|-------------|
| `20260401120000000` | Initial baseline |
| `20260402000000000` | Consolidate ownership to greenhouse_ops |
| `20260402001000000` | HR departments + head_member FK |
| `20260402001100000` | HRIS contract types |
| `20260402001200000` | Postgres runtime grant reconciliation |
| `20260402001300000` | Add ICO member carry-over count |
| `20260402001400000` | Integration registry |
| `20260402001657811` | Agency performance report serving cache |
| `20260402002007694` | Integration registry platform |
| `20260402020611201` | Finance clients → organization canonical backfill |
| `20260402022518358` | Finance org-first backfill follow-up |
| `20260402085449701` | Finance org materialized serving keys |
| `20260402094316652` | Operating entity + session canonical person |
| `20260402120531440` | Notion space governance |
| `20260402120604104` | Notion space governance registry |
| `20260402220356569` | Delivery source sync assignee/project parity |
| `20260402222438783` | Delivery runtime space FK canonicalization |
| `20260403002621463` | SCIM provisioning tables |
| `20260403022246213` | Notion delivery performance publication cutover |
| `20260403023326254` | SCIM groups |

### Reglas obligatorias

1. **SQL-first:** Editar archivos `.sql`, no Prisma
2. **Secuencia:** Timestamps auto-generados; NUNCA renombrar manualmente
3. **Nullable primero:** Columnas nuevas → nullable → constraints después
4. **Regenerar tipos:** `pnpm migrate:up` auto-corre `db:generate-types`
5. **Commit juntos:** Migration + generated types + code changes en mismo commit
6. **Ownership:** `greenhouse_ops` es dueño de todos los objetos (122 tablas, 11 schemas)

---

## Sincronización de Datos

### Patrón Dual-Store

```
┌─────────────────────────────────────────────────────┐
│          POSTGRES (Canonical Write Store)           │
│     Transaccional: payroll, finance, HR, AI        │
│                                                     │
│  ├─ Tabla base (e.g., income)                      │
│  ├─ Outbox events (change capture)                 │
│  └─ Serving views (enriched 360)                   │
└─────────────────────────────────────────────────────┘
                      ↓ CDC
                Outbox events
                      ↓
        ┌───────────────────────────┐
        │  Async Event Processors   │
        │  (Cron, Cloud Tasks)      │
        └───────────────────────────┘
                      ↓
        ┌──────────────────────────────────┐
        │  BigQuery (Read Warehouse)       │
        │  ├─ greenhouse_raw (CDC stream)   │
        │  ├─ greenhouse_conformed (xform) │
        │  ├─ greenhouse_ico (marts)       │
        │  └─ nubox_raw/conformed          │
        │                                  │
        │  Consumers: dashboards, BI,     │
        │  audit, historical analysis     │
        └──────────────────────────────────┘
```

### Flujos de Sincronización

#### 1. Postgres ↔ BigQuery (CDC)

**Fuente:** `greenhouse_sync.outbox_events`

**Destino:** BigQuery datasets (`greenhouse_raw`, `greenhouse_conformed`, `greenhouse_ico`)

**Patrón:**
- Evento emitido en Postgres → insertado en outbox
- Cron job (`/api/cron/...`) lee outbox batch
- Publica a BigQuery
- Marca como consumido en outbox

**Tablas CDC:**
- Core identity: `clients`, `client_users`, `roles`, `user_role_assignments`, `service_modules`, `identity_profiles`
- Eventos raw: `postgres_outbox_events`

---

#### 2. Notion ↔ Postgres (Bidireccional)

**Fuente:** Notion workspace → delivery database

**Destino:** `greenhouse_delivery.{projects,sprints,tasks,}`

**Patrón:**
- Notion workspace registrado en `space_notion_sources`
- Sync cron (`pnpm sync:notion` / `/api/cron/notion-sync`) importa cambios
- Parsed y guardado en delivery tables
- `source_sync_runs` registra cada ejecución
- `source_sync_watermarks` marca último sync timestamp

**Tablas:**
- `notion_workspaces`, `space_notion_sources`, `space_notion_publication_targets`
- `delivery_projects`, `delivery_tasks`, `delivery_sprints`
- `source_sync_runs`, `source_sync_failures`, `source_sync_watermarks`

**Readiness signals:**
- `notion_space_schema_snapshots` (schema Notion)
- `notion_space_kpi_readiness` (completitud de data)

---

#### 3. HubSpot ↔ Postgres (One-way inbound)

**Fuente:** HubSpot (companies, contacts, deals)

**Destino:** `greenhouse_crm.{companies,contacts,deals}`

**Patrón:**
- Sync job lee HubSpot API
- Upserts snapshots en CRM tables
- Emite events (`provider.upserted`, etc.) si cambios detectados
- Reconciliación identity automática: `identity_profile_source_links` vinculan contacts HubSpot → identity_profiles Greenhouse

---

#### 4. Nubox (ERP) → BigQuery (Snapshots)

**Fuente:** NuBox ERP (sales, purchases, expenses, incomes)

**Destino:** BigQuery (`nubox_raw_snapshots`, `nubox_conformed`)

**Patrón:**
- Snapshot diario/semanal desde NuBox API
- Guardado en raw layer
- Conformed layer transforma y enriquece
- Consume: Finance dashboards, cost analysis, P&L reporting

---

#### 5. Finance Indicators (Regulares)

**Fuentes:**
- BCCh (exchange rates)
- PREVIRED (AFP rates, UF, IPC)
- SII (tax brackets)

**Destino:** Postgres (`finance.exchange_rates`, `finance.economic_indicators`, `chile_afp_rates`, etc.)

**Patrón:**
- Cron job (`/api/finance/economic-indicators/sync`)
- Calls APIs
- Upserts latest rates
- Triggers `finance.economic_indicator.upserted` event
- BigQuery materializes en conformed layer

---

#### 6. Reactive Projections (Event-driven)

**Fuente:** Outbox events

**Destino:** Serving views (person_360, member_360, organization_360, operational_pl_snapshots, etc.)

**Patrón:**
1. Evento emitido (e.g., `member.updated`)
2. Registro en `outbox_reactive_log` con tipo de proyección afectada
3. Async handler (`/api/sync/react-...`) ejecuta refresh
4. Serving view actualizada
5. Cascade: cambios en serving pueden invalidar dependentes

**Proyecciones reactivas principales:**
- `person_360` ← (member.*, assignment.*, membership.*)
- `member_360` ← (payroll_entry.*, compensation.*)
- `organization_360` ← (income.*, expense.*, assignment.*)
- `operational_pl_snapshots` ← (income.*, cost_allocation.*, assignment.*)
- `ico_member_metrics` ← (ico_materialization.*, compensation.*)

---

#### 7. Webhooks (Inbound)

**Fuente:** Integraciones externas (Slack, Teams, Zapier, etc.)

**Destino:** `greenhouse_sync.webhook_inbox_events`

**Patrón:**
- Webhook recibido en endpoint registrado
- Validación de signature
- Guardado en inbox para audit/replay
- Parser extrae evento y lo enruta
- Puede disparar acciones (notificación, actualización, etc.)

---

#### 8. SCIM Provisioning (Outbound)

**Fuente:** `client_users`, `scim_groups`

**Destino:** SSO provider (Microsoft Entra, Google Workspace, etc.)

**Patrón:**
- Usuario creado/actualizado en Greenhouse
- `scim_sync_log` registra provisioning attempt
- Envia SCIM request a IdP
- Mantiene `scim_group_memberships` en sync

---

## Resumen Estructural

### Objeto Canonical 360 (Person)

```
identity_profile (EO-ID{seq})
    ├─ Basic: full_name, email
    ├─ Source links: HubSpot, Notion, manual
    ├─ Member facet (Población A)
    │    ├─ payroll, HR, capacity, cost
    │    └─ assignments → múltiples clientes
    ├─ Memberships (A+B+C)
    │    ├─ team_member (from assignments, Población A)
    │    ├─ contact, client_user, billing (Población B)
    │    └─ contact (Población C)
    ├─ User principal (auth)
    └─ 360 serving view
         ├─ person_360 (base)
         ├─ person_hr_360, person_finance_360, etc. (domain-specific)
         └─ organization context, delivery context
```

### Objeto Canonical 360 (Organization)

```
organization (org-{uuid}, public: EO-ORG-{seq})
    ├─ Legal identity: legal_name, tax_id
    ├─ Type: client, supplier, both, other
    ├─ is_operating_entity (Efeonce operating entity flag)
    ├─ Spaces (0..*)
    │    ├─ service_modules active
    │    ├─ feature_flags
    │    └─ notion sources
    ├─ Memberships (0..*)
    │    ├─ team_member (from assignments, Población A)
    │    └─ contact/client_user (Población B)
    ├─ Economics (Finance domain)
    │    ├─ income, expenses, suppliers
    │    └─ commercial cost attribution
    ├─ Delivery
    │    ├─ projects, sprints, tasks
    │    └─ staff aug placements
    └─ 360 serving view
         ├─ organization_360 (base)
         ├─ organization_operational_metrics
         └─ client_360, provider_360 (domain variants)
```

---

## Acceso a Datos

### Runtime (Transaccional)

- **Query builders:** Kysely (type-safe) + raw SQL
- **Connection:** Cloud SQL Connector vía WIF (Workload Identity Federation)
- **Timezone:** `America/Santiago` (IANA canonical)
- **Profiles:** `runtime` (DML), `migrator` (DDL), `ops` (owner)

### Batch & Analytics

- **BigQuery:** BigQuery Studio, Looker, Data Studio
- **Exporters:** Cron jobs, Cloud Functions, scheduled queries

---

## Gobernanza

- **Ownership:** `greenhouse_ops` es propietario de todo (DDL)
- **RBAC:** `roles` + `user_role_assignments` + `view_registry`
- **Audit:** `audit_events`, `asset_access_log`, `scim_sync_log`
- **Identity governance:** `identity_reconciliation_proposals`, `integration_schema_drifts`
- **Period closure:** `period_closure_config`, `period_closure_tracking`

---

## Validación

**Health check:** `pnpm pg:doctor`

**Type safety:** `npx tsc --noEmit`

**Test:** `pnpm test` (Vitest)

---

> **Nota:** Este documento es vivo. Cambios estructurales requieren delta con fecha. Véase `docs/tasks/README.md` y `Handoff.md` para work in progress y gaps operativos.
