# Greenhouse Portal — Catálogo de Scripts

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: 165+ scripts, Nubox setup/sync, Space-Notion, Identity v2 + reconciliation, Finance Intelligence, Email infrastructure, SCIM provisioning

---

## Visión general

El directorio `scripts/` contiene 165+ scripts TypeScript para:
- Setup de schemas PostgreSQL (90+ scripts)
- Backfill de datos (25+ scripts)
- Sync/ETL bidireccional
- Materializaciones y reconciliación
- Smoke tests y auditorías
- Utilidades de operación

Se ejecutan con `tsx` vía comandos `pnpm` definidos en `package.json`.

Los scripts usan una librería compartida (`scripts/lib/`) para carga de variables de entorno y ejecución de queries PostgreSQL.

---

## Utilidades compartidas

### `scripts/lib/load-greenhouse-tool-env.ts`

Carga variables de entorno necesarias para scripts de infraestructura. Inicializa la conexión a PostgreSQL con el perfil adecuado (migrator o admin).

### `scripts/lib/postgres-script-runner.ts`

Helper para ejecutar scripts SQL contra PostgreSQL con manejo de errores, logging y transacciones.

### `scripts/lib/nubox-client.ts` *(nuevo)*

Cliente HTTP para API de Nubox con:
- Dual header authentication (token + API key)
- Retry automático (429, 5xx)
- Paginación cursor-based
- Streaming de datos grandes

---

## Scripts de Setup (Creación de schemas)

Estos scripts crean las tablas, indexes y constraints necesarios. Usan el perfil **migrator** de PostgreSQL.

### Schema Foundational

#### `setup-postgres-canonical-360.ts`

- **Comando**: `pnpm setup:postgres:canonical-360`
- **Schema**: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`
- **Crea**:
  - Core identity: `team_members`, `clients`, `client_users`, `departments`, `providers`
  - Serving views: person_360, client_360, member_360
  - Outbox infrastructure: `outbox_events`, `outbox_event_failures`
  - Sync tracking: `source_sync_runs`, `source_sync_failures`
- **Dependencias**: Ninguna (es el schema fundacional)
- **DDL**: `setup-postgres-canonical-360.sql`

### Person 360 Serving Layer

#### `setup-postgres-person-360.ts`

- **Comando**: `pnpm setup:postgres:person-360`
- **Schema**: `greenhouse_serving`
- **Crea**: Vista materializada `person_360` con identidad consolidada
- **Campos**: member_id, email, full_name, role_category, department_id, active, created_at, updated_at
- **Dependencias**: `canonical-360` debe existir
- **DDL**: `setup-postgres-person-360.sql`

#### `setup-postgres-person-360-v2.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: V2 de person_360 con campos adicionales (capabilities, organization_id, delivery_context)
- **Dependencias**: `person-360` base
- **DDL**: `setup-postgres-person-360-v2.sql`

#### `setup-postgres-person-360-serving.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: Serving layer optimizado para lectura de Person 360 (indexes, materialized views)
- **DDL**: `setup-postgres-person-360-serving.sql`

#### `setup-postgres-person-360-contextual.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: Datos contextuales de person 360 (delivery, HR, finance contexts)
- **DDL**: `setup-postgres-person-360-contextual.sql`

### Domain Schemas

#### `setup-postgres-hr-leave.ts`

- **Comando**: `pnpm setup:postgres:hr-leave`
- **Schema**: `greenhouse_hr`
- **Crea**: `leave_types`, `leave_balances`, `leave_requests`, `leave_approvals`, `attendance_records`, `attendance_summaries`
- **Dependencias**: `canonical-360` (FK a `team_members`)
- **DDL**: `setup-postgres-hr-leave.sql`

#### `setup-postgres-payroll.ts`

- **Comando**: `pnpm setup:postgres:payroll`
- **Schema**: `greenhouse_payroll`
- **Crea**: `compensation_versions`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config`, `payroll_deductions`
- **Dependencias**: `canonical-360` (FK a `team_members`)
- **DDL**: `setup-postgres-payroll.sql`

#### `setup-postgres-finance.ts`

- **Comando**: `pnpm setup:postgres:finance`
- **Schema**: `greenhouse_finance`
- **Crea**: `accounts`, `income`, `expenses`, `suppliers`, `exchange_rates`, `cost_categories`, `allocations`
- **Dependencias**: `canonical-360` (FK a `team_members`, `clients`)
- **DDL**: `setup-postgres-finance.sql`

#### `setup-postgres-finance-slice2.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Extensiones de finance: `reconciliation_sessions`, `bank_statements`, `statement_matches`, `reconciliation_rules`
- **Dependencias**: `finance` base
- **DDL**: `setup-postgres-finance-slice2.sql`

#### `setup-postgres-ai-tooling.ts`

- **Comando**: `pnpm setup:postgres:ai-tooling`
- **Schema**: AI tooling
- **Crea**: `tool_catalog`, `tool_licenses`, `ai_wallets`, `ai_ledger`, `ai_credits_transactions`
- **Dependencias**: `canonical-360`
- **DDL**: `setup-postgres-ai-tooling.sql`

#### `setup-postgres-access.ts`

- **Comando**: `pnpm setup:postgres:access`
- **Crea**: `roles`, `user_role_assignments`, `role_permissions`, `access_policies`
- **Dependencias**: `canonical-360`
- **DDL**: `setup-postgres-access.sql`

#### `setup-postgres-client-assignments.ts`

- **Comando**: `pnpm setup:postgres:client-assignments`
- **Crea**: `team_member_client_assignments`, `assignment_periods`, `assignment_history`
- **Dependencias**: `canonical-360`
- **DDL**: `setup-postgres-client-assignments.sql`

#### `setup-postgres-source-sync.ts`

- **Comando**: `pnpm setup:postgres:source-sync`
- **Crea**: Infraestructura de source sync: `integration_registry`, `source_sync_state`, `sync_watermarks`
- **Dependencias**: `canonical-360`
- **DDL**: `setup-postgres-source-sync.sql`

### Account 360 Setup *(nuevo)*

#### `setup-postgres-account-360-m0.ts`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `organizations` (con secuencia `EO-ORG-*`)
  - `spaces` (con secuencia `EO-SPC-*`)
  - `person_memberships` (con secuencia `EO-MBR-*`)
  - Relaciones: org → space (1:many), space → members (many:many)
- **DDL**: `setup-postgres-account-360-m0.sql`
- **Dependencias**: `canonical-360` debe existir

#### `setup-postgres-organization-360.ts`

- **Schema**: `greenhouse_core`, `greenhouse_serving`
- **Crea**: Serving views para Organization 360 (consolidación de organizations + spaces + memberships)
- **Vistas**:
  - `organization_360_full` — Org con spaces y conteos
  - `space_360_full` — Space con memberships y metadata
  - `org_space_member_view` — Flattened view para queries rápidas
- **DDL**: `setup-postgres-organization-360.sql`
- **Dependencias**: `account-360-m0`

#### `setup-postgres-services.sql`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `services` (servicios ofrecidos por spaces, con secuencia `EO-SVC-*`)
  - `service_history` (auditoría de cambios)
- **Dependencias**: `account-360-m0` (FK a organizations y spaces)

#### `setup-postgres-space-notion-sources.sql`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `space_notion_sources` (mapeo Notion DB IDs por espacio)
  - Campos: notion_workspace_id, notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones
  - `governance_snapshots` (JSON array de validaciones)
  - `publication_metadata` (tracking de publicaciones de reportes)
- **Dependencias**: `account-360-m0` (FK a spaces)

#### `setup-postgres-unified-org.ts`

- **Schema**: `greenhouse_core`
- **Crea**: Vista unificada de organizaciones para queries cross-module
- **DDL**: `setup-postgres-unified-org.sql`

### Identity & Reconciliation Setup *(nuevo)*

#### `setup-postgres-identity-v2.ts`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `identity_profiles` v2 con campos extendidos
  - `identity_profile_source_links` (multi-source identity linking)
  - `identity_attributes` (atributos por identidad: email, phone, microsoft_oid, google_sub, etc.)
  - `identity_confidence_scores` (confianza por source y método de match)
- **DDL**: `setup-postgres-identity-v2.sql`
- **Dependencias**: `canonical-360`

#### `setup-identity-reconciliation.ts`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `reconciliation_proposals` (propuestas de match de identidades)
  - `reconciliation_runs` (tracking de ejecuciones)
  - `reconciliation_decisions` (auditoría de decisiones tomadas)
- **DDL**: `setup-identity-reconciliation.sql`
- **Dependencias**: `identity-v2`

### Finance Extensions Setup *(nuevo)*

#### `setup-postgres-finance-intelligence-p1.ts` / `p2.ts`

- **Schema**: `greenhouse_finance`
- **Crea**:
  - P1: `client_economics`, `client_ico_scores`, `delivery_cost_analysis`
  - P2: `profitability_snapshots`, `cost_allocation_rules`, `cost_allocation_runs`
- **DDL**: `setup-postgres-finance-intelligence-p1.sql`, `p2.sql`
- **Dependencias**: `finance` base

#### `setup-postgres-finance-bridge-m33.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Bridge tables para vincular finance con Account 360 (organization_id en income/expenses)
- **Cambios**:
  - ADD `organization_id` NULLABLE a `income` y `expenses`
  - Crear INDEX en organization_id
  - ADD `space_id` a `suppliers` para resolución de proveedor → organization
- **DDL**: `setup-postgres-finance-bridge-m33.sql`
- **Dependencias**: `finance` + `account-360-m0`

#### `setup-postgres-nubox-extensions.ts`

- **Schema**: `greenhouse_finance`
- **Crea**:
  - Extensiones de tablas para datos sincronizados desde Nubox
  - ADD `nubox_folio`, `nubox_dte_type`, `nubox_emission_date` a `income` / `expenses`
  - ADD `nubox_status`, `nubox_sync_date` para tracking de sync
  - Tabla `nubox_sync_state` para watermarks de sincronización
- **DDL**: `setup-postgres-nubox-extensions.sql`
- **Dependencias**: `finance` base

### Nubox BigQuery Setup *(nuevo)*

#### `setup-bigquery-nubox-raw.ts`

- **Crea**: Dataset `nubox_raw_snapshots` con tablas
  - `sales_raw` (DTEs emitidos, formato JSON crudo)
  - `purchases_raw` (DTEs recibidos)
  - `expenses_raw` (Egresos bancarios)
  - `income_raw` (Ingresos bancarios)
  - `sync_runs` (Tracking de cada sync)
- **DDL**: `setup-bigquery-nubox-raw.sql`
- **Propósito**: Destino para Fase A del pipeline Nubox
- **Partición**: Por `sync_date`

#### `setup-bigquery-nubox-conformed.ts`

- **Crea**: Dataset `nubox_conformed` con tablas conformadas
  - `sales_conformed` (ventas con identity resolution)
  - `purchases_conformed` (compras con identity resolution)
  - `suppliers_resolution` (mapping de tax_id → organization_id)
  - `clients_resolution` (mapping de client_rut → organization_id)
- **DDL**: `setup-bigquery-nubox-conformed.sql`
- **Propósito**: Destino para Fase B del pipeline Nubox

### Email & Transactional Infrastructure Setup *(nuevo)*

#### `setup-postgres-transactional-email.ts`

- **Schema**: Email transactional
- **Crea**:
  - `email_messages` (registro de emails enviados)
  - `email_templates` (templates transaccionales)
  - `email_delivery_logs` (tracking de entrega)
- **DDL**: `setup-postgres-transactional-email.sql`

#### `setup-bigquery-email-logs.ts`

- **Crea**: Tabla de logs de email en BigQuery
- **Destino**: `greenhouse_raw.email_delivery_logs`

### SCIM Provisioning Setup *(nuevo)*

#### `setup-postgres-scim.ts`

- **Schema**: `greenhouse_core`
- **Crea**:
  - `scim_tenant_mappings` (Azure AD tenant → Greenhouse workspace)
  - `scim_audit_log` (auditoría de operaciones SCIM)
  - Campos: azure_tenant_id, azure_app_id, workspace_id, last_sync_at, error_log
- **DDL**: `setup-postgres-scim.sql`

### BigQuery Infrastructure Setup

#### `setup-bigquery-outbox.ts`

- **Crea**: Tabla `greenhouse_raw.postgres_outbox_events` en BigQuery
- **Schema**: event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at, published_at
- **Propósito**: Destino para los eventos del outbox consumer

#### `setup-bigquery-outbox-marts.ts`

- **Crea**: Marts analíticos derivados de outbox events en BigQuery
- **Vistas**:
  - `outbox_events_by_type` (agregación por tipo)
  - `outbox_events_timeline` (serie temporal)
  - `outbox_failures` (análisis de fallos)

#### `setup-bigquery-source-sync.ts`

- **Crea**: Tablas de tracking de source sync en BigQuery
- **Propósito**: Monitoreo de sincronización

---

## Scripts de Backfill (Carga de datos)

Estos scripts populan las tablas con datos existentes. Usan perfil **admin** o **migrator**.

### Core Backfill

#### `backfill-postgres-canonical-360.ts`

- **Comando**: `pnpm backfill:postgres:canonical-360`
- **Fuente**: BigQuery (`greenhouse.team_members`, `greenhouse.clients`, etc.)
- **Destino**: `greenhouse_core.*`
- **Acción**: Poblar members, clients, client_users, departments desde BigQuery
- **Validación**: Verificar integridad de FKs post-backfill

#### `backfill-postgres-person-360-coverage.ts`

- **Comando**: `pnpm backfill:postgres:person-360-coverage`
- **Fuente**: BigQuery + PostgreSQL
- **Destino**: `greenhouse_serving.person_360`
- **Acción**: Completar perfiles de persona con datos de todas las fuentes (delivery, HR, finance)

### Domain Backfill

#### `backfill-postgres-hr-leave.ts`

- **Comando**: `pnpm backfill:postgres:hr-leave`
- **Fuente**: Datos existentes
- **Destino**: `greenhouse_hr.*`
- **Acción**: Poblar leave types (vacation, sick, personal), balances iniciales

#### `backfill-postgres-payroll.ts`

- **Comando**: `pnpm backfill:postgres:payroll`
- **Fuente**: BigQuery (`greenhouse.compensation_versions`, períodos históricos)
- **Destino**: `greenhouse_payroll.*`
- **Acción**: Migrar compensaciones y períodos históricos, bonificaciones

#### `backfill-postgres-finance.ts`

- **Comando**: `pnpm backfill:postgres:finance`
- **Fuente**: Datos existentes
- **Destino**: `greenhouse_finance.*`
- **Acción**: Poblar cuentas, proveedores, transacciones históricas

#### `backfill-postgres-finance-slice2.ts`

- **Fuente**: Datos existentes
- **Destino**: `greenhouse_finance.*` (extensiones)
- **Acción**: Poblar reconciliation data, reglas de matching

#### `backfill-postgres-client-assignments.ts`

- **Fuente**: BigQuery
- **Destino**: PostgreSQL
- **Acción**: Migrar asignaciones cliente-equipo

#### `backfill-postgres-ai-tooling.ts`

- **Comando**: `pnpm backfill:postgres:ai-tooling`
- **Fuente**: Seed data
- **Destino**: AI tooling tables
- **Acción**: Poblar catálogo de tools, proveedores, wallets iniciales

### External Source Backfill

#### `backfill-hubspot-contact-names.ts`

- **Fuente**: HubSpot API (vía microservicio)
- **Destino**: BigQuery / PostgreSQL
- **Acción**: Sincronizar nombres de contactos desde HubSpot

#### `backfill-efeonce-microsoft-aliases.ts`

- **Fuente**: Microsoft Entra ID
- **Destino**: BigQuery / PostgreSQL
- **Acción**: Alinear aliases de email Microsoft con identidades internas

#### `backfill-internal-identity-profiles.ts`

- **Fuente**: Datos internos
- **Destino**: `greenhouse.identity_profiles`, `identity_profile_source_links`
- **Acción**: Crear perfiles de identidad canónica para equipo interno

### Account 360 & Identity Backfill *(nuevo)*

#### `backfill-account-360-m1.ts`

- **Comando**: `pnpm backfill:account-360-m1`
- **Fuente**: `greenhouse.clients`, `greenhouse.team_members`
- **Destino**: `greenhouse_core.organizations`, `spaces`
- **Acción**: Crear organizaciones desde clients, spaces desde client_users

#### `backfill-identity-v2.ts`

- **Comando**: `pnpm backfill:identity-v2`
- **Fuente**: `greenhouse_core.identity_profiles` (legacy)
- **Destino**: `greenhouse_core.identity_profiles` v2
- **Acción**: Migrar con campos extendidos, crear source_links

---

## Scripts operacionales

### Diagnóstico y Auditoría

#### `pg-doctor.ts`

- **Comando**: `pnpm pg:doctor`
- **Propósito**: Health check de PostgreSQL
- **Verifica**:
  - Conectividad a DB
  - Permisos de cada perfil (runtime, migrator, admin)
  - Existencia de schemas/tablas
  - Conteos básicos por tabla
  - Foreign key integrity
- **Output**: Reporte de estado con colores (rojo/amarillo/verde)

#### `audit-person-360-coverage.ts`

- **Comando**: `pnpm audit:person-360`
- **Propósito**: Auditar completitud de perfiles Person 360
- **Verifica**:
  - Qué miembros tienen perfil completo
  - Qué facets faltan (delivery, HR, finance contexts)
  - Confidence levels por source
- **Output**: Reporte de cobertura y gaps

#### `admin-team-runtime-smoke.ts`

- **Propósito**: Smoke test del módulo team admin
- **Acción**: Verifica que las operaciones CRUD funcionan correctamente

### Sincronización y Materialización

#### `sync-source-runtime-projections.ts`

- **Propósito**: Sincronizar vistas materializadas de runtime
- **Acción**: Refresh de projections que la app consulta en hot path

#### `run-outbox-consumer.ts`

- **Comando**: `pnpm sync:outbox`
- **Propósito**: Ejecutar outbox consumer manualmente (alternativa al cron)
- **Acción**: Lee eventos pending de PostgreSQL y los publica en BigQuery

#### `sync-nubox-raw.ts` *(nuevo)*

- **Comando**: `pnpm sync:nubox-raw`
- **Propósito**: Ejecutar Fase A del pipeline Nubox manualmente
- **Acción**: Fetch de datos desde Nubox API → BigQuery raw

#### `sync-nubox-conformed.ts` *(nuevo)*

- **Comando**: `pnpm sync:nubox-conformed`
- **Propósito**: Ejecutar Fase B del pipeline Nubox
- **Acción**: Transform raw → conformed con identity resolution

#### `sync-nubox-to-postgres.ts` *(nuevo)*

- **Comando**: `pnpm sync:nubox-to-postgres`
- **Propósito**: Ejecutar Fase C del pipeline Nubox
- **Acción**: Project conformed data → PostgreSQL operativo

#### `sync-previred.ts` *(nuevo)*

- **Comando**: `pnpm sync:previred`
- **Propósito**: Sincronizar datos con Previred (Chile)
- **Acción**: Submit afiliaciones, cambios de estado

#### `sync-conformed.ts` *(nuevo)*

- **Comando**: `pnpm sync:conformed`
- **Propósito**: Sincronizar datos conformados
- **Acción**: Refresh de vistas conformadas en BigQuery

### Reconciliación y Validación

#### `run-identity-reconciliation.ts` *(nuevo)*

- **Comando**: `pnpm run:identity-reconciliation`
- **Propósito**: Ejecutar reconciliación de identidades
- **Acción**:
  - Detectar identidades duplicadas por email/phone/oid
  - Proponer merges con confidence scores
  - Registrar en `reconciliation_proposals`

#### `verify-account-360.ts` *(nuevo)*

- **Comando**: `pnpm verify:account-360`
- **Propósito**: Verificar integridad del modelo Account 360
- **Verifica**:
  - FKs org → space → members
  - Orphaned records
  - Duplicated public IDs
  - Sync consistency

#### `reconcile-delivery-performance-history.ts` *(nuevo)*

- **Propósito**: Reconciliar delivery performance con data histórica
- **Acción**: Validar que snapshots de delivery ICO coinciden con datos en Notion

#### `refresh-member-capacity-economics.ts` *(nuevo)*

- **Propósito**: Refrescar económica y capacidad por miembro
- **Acción**: Recalcular allocations, utilization rates

#### `remediate-ico-assignee-attribution.ts` *(nuevo)*

- **Propósito**: Remediar atribuciones incorrectas en ICO
- **Acción**: Corregir assignment_id de proyectos

### Materialización

#### `materialize-member-metrics.ts` *(nuevo)*

- **Propósito**: Materializar métricas agregadas por miembro
- **Acción**: Poblar `greenhouse_serving.member_metrics` (delivery OTD%, RPA, throughput)

#### `ico-materialize.ts` *(nuevo)*

- **Comando**: Ejecutado vía cron `/api/cron/ico-materialize`
- **Propósito**: Materializar métricas de delivery del ICO Engine
- **Acción**:
  - Snapshots de health por space/project
  - Stuck assets detection
  - Trends calculation (7d, 30d, 90d)
- **Destino**: `greenhouse_finance.ico_snapshots`, `greenhouse_finance.ico_metrics`

#### `freeze-delivery-performance-period.ts` *(nuevo)*

- **Propósito**: Congelar performance del período para reporting
- **Acción**: Crear snapshot final e iniciar período siguiente

---

## BigQuery SQL Scripts (`bigquery/`)

Scripts SQL para bootstrap de datos en BigQuery.

### Master Data

#### `greenhouse_clients.sql`

- **Propósito**: DDL y seed de la tabla `greenhouse.clients`
- **Campos**: client_id, hubspot_id, name, status, allowed_domains, created_at

#### `greenhouse_efeonce_space_v1.sql`

- **Propósito**: Configuración del espacio interno Efeonce
- **Destino**: `greenhouse.clients` (registro interno)

#### `greenhouse_hubspot_customer_bootstrap_v1.sql`

- **Propósito**: Bootstrap de clientes desde HubSpot closedwon deals
- **Fuente**: `hubspot.companies`, `hubspot.deals`
- **Destino**: `greenhouse.clients`, `greenhouse.client_users`
- **Lógica**: MERGE idempotente, filtro por deals cerrados, exclusión de emails @efeonce.com

### Service Modules

#### `greenhouse_service_module_bootstrap_v1.sql` / `greenhouse_service_modules_v1.sql`

- **Propósito**: Bootstrap del catálogo de service modules y asignaciones
- **Fuente**: `hubspot.deals` (closedwon), campos `linea_de_servicio` y `servicios_especificos`
- **Destino**: `greenhouse.service_modules`, `greenhouse.client_service_modules`
- **Lógica**: CTE complejo con CROSS JOIN UNNEST para parsing de campos comma-separated

### Identity & Access

#### `greenhouse_identity_access_v1.sql`

- **Propósito**: Bootstrap de roles y access control
- **Destino**: `greenhouse.roles`, `greenhouse.user_role_assignments`
- **Roles**: efeonce_admin, people_viewer, delivery_manager, finance_analyst, client_user

#### `greenhouse_microsoft_sso_v1.sql`

- **Propósito**: Vinculación de identidades Microsoft SSO
- **Lógica**: Matcheo por email y OID, actualización de authMode

#### `greenhouse_internal_identity_v1.sql`

- **Propósito**: Bootstrap de identidades internas Efeonce
- **Fuente**: Datos internos
- **Destino**: `greenhouse.identity_profiles`, `identity_profile_source_links`

### Project Scope

#### `greenhouse_project_scope_bootstrap_v1.sql`

- **Propósito**: Bootstrap de project scopes para usuarios
- **Fuente**: `notion_ops.proyectos` + `greenhouse.clients`
- **Destino**: `greenhouse.user_project_scopes`

### Public IDs

#### `greenhouse_public_ids_v1.sql`

- **Propósito**: Generación de IDs públicos EO-*
- **Lógica**: Genera publicId para clients, users, service modules, capabilities, roles, flags
- **Patrones**: EO-{id}, EO-USR-{id}, EO-BL-{code}, EO-SVC-{code}, EO-CAP-{id}

### HR & Payroll

#### `greenhouse_hr_payroll_v1.sql`

- **Propósito**: Bootstrap de datos HR y payroll
- **Destino**: `greenhouse.compensation_versions` y relacionados

---

## Orden de ejecución recomendado

### Setup inicial (schemas)

```bash
# 1. Schema fundacional (REQUIRED)
pnpm setup:postgres:canonical-360

# 2. Schemas de dominio (pueden ejecutarse en paralelo)
pnpm setup:postgres:hr-leave
pnpm setup:postgres:payroll
pnpm setup:postgres:finance

# 3. Extensiones de dominio (después de sus bases)
pnpm setup:postgres:finance-slice2        # después de finance
pnpm setup:postgres:ai-tooling
pnpm setup:postgres:access
pnpm setup:postgres:client-assignments
pnpm setup:postgres:source-sync

# 4. Account 360 (REQUIRED, después de canonical-360)
pnpm setup:postgres:account-360-m0        # organizations, spaces, person_memberships
pnpm setup:postgres:services              # services + service_history
pnpm setup:postgres:space-notion-sources  # space-notion source mapping
pnpm setup:postgres:unified-org           # unified org view

# 5. Identity v2 (después de canonical-360 y account-360)
pnpm setup:postgres:identity-v2           # identity_profiles v2 + reconciliation
pnpm setup:identity-reconciliation        # reconciliation infrastructure

# 6. Finance extensions (después de finance y account-360)
pnpm setup:postgres:nubox-extensions      # nubox extensions en greenhouse_finance
pnpm setup:postgres:finance-intelligence-p1  # finance intelligence tables
pnpm setup:postgres:finance-intelligence-p2  # finance intelligence advanced
pnpm setup:postgres:finance-bridge-m33    # bridge con account-360

# 7. Email & SCIM (después de canonical-360)
pnpm setup:postgres:transactional-email
pnpm setup:postgres:scim

# 8. Serving layer (REQUIRED, después de todos los schemas)
pnpm setup:postgres:person-360
pnpm setup:postgres:person-360-v2
pnpm setup:postgres:person-360-serving
pnpm setup:postgres:person-360-contextual
pnpm setup:postgres:organization-360      # organization serving views

# 9. BigQuery (después de PostgreSQL setup)
pnpm setup:bigquery:nubox-raw
pnpm setup:bigquery:nubox-conformed
pnpm setup:bigquery:outbox
pnpm setup:bigquery:outbox-marts
pnpm setup:bigquery:source-sync
pnpm setup:bigquery:email-logs
```

### Backfill (carga de datos)

```bash
# 1. Datos core (REQUIRED, después de canonical-360 setup)
pnpm backfill:postgres:canonical-360

# 2. Datos de dominio (después de core)
pnpm backfill:postgres:hr-leave
pnpm backfill:postgres:payroll
pnpm backfill:postgres:finance
pnpm backfill:postgres:finance-slice2
pnpm backfill:postgres:client-assignments
pnpm backfill:postgres:ai-tooling

# 3. Account 360 y identity (después de core)
pnpm backfill:account-360-m1              # organizations y spaces
pnpm backfill:identity-v2                 # identity profiles v2

# 4. Identidad y serving (al final)
pnpm backfill:postgres:person-360-coverage

# 5. Verificación
pnpm pg:doctor
pnpm audit:person-360
pnpm verify:account-360
pnpm run:identity-reconciliation
```

### BigQuery — Setup programático

```bash
# Nubox datasets (ejecutar antes de activar sync)
pnpm setup:bigquery:nubox-raw             # nubox_raw_snapshots dataset
pnpm setup:bigquery:nubox-conformed       # nubox_conformed dataset

# Email logs (si se usa transactional email)
pnpm setup:bigquery:email-logs
```

### BigQuery — Scripts SQL legacy (una vez, o para re-bootstrap)

Los scripts SQL de `bigquery/` se ejecutan directamente en la consola de BigQuery o vía `bq query`. El orden recomendado:

1. `greenhouse_clients.sql`
2. `greenhouse_efeonce_space_v1.sql`
3. `greenhouse_hubspot_customer_bootstrap_v1.sql`
4. `greenhouse_service_modules_v1.sql`
5. `greenhouse_service_module_bootstrap_v1.sql`
6. `greenhouse_identity_access_v1.sql`
7. `greenhouse_internal_identity_v1.sql`
8. `greenhouse_microsoft_sso_v1.sql`
9. `greenhouse_project_scope_bootstrap_v1.sql`
10. `greenhouse_public_ids_v1.sql`
11. `greenhouse_hr_payroll_v1.sql`

### Cron Jobs (después de setup)

Los siguientes se ejecutan automáticamente vía Vercel cron, pero pueden ejecutarse manualmente:

```bash
# Outbox sync (cada 5 min)
pnpm sync:outbox

# ICO materialize (cada 6 horas)
# Endpoint: POST /api/cron/ico-materialize

# Sync conformed (cada hora)
# Endpoint: POST /api/cron/sync-conformed

# Exchange rates (diario 23:05 UTC)
# Endpoint: POST /api/finance/exchange-rates/sync

# Nubox sync (diario 02:00 UTC)
pnpm sync:nubox-raw
pnpm sync:nubox-conformed
pnpm sync:nubox-to-postgres

# Previred sync (configurado en cron)
pnpm sync:previred

# Attendance materialize (diario 03:00 UTC)
# Endpoint: POST /api/cron/attendance-materialize

# Payroll auto-calculate (lunes 04:00 UTC)
# Endpoint: POST /api/cron/payroll-auto-calculate
```

---

## Utilidades

### `pg-doctor.ts`

Ejecutar regularmente para validar salud de la DB:

```bash
pnpm pg:doctor
```

Reporta:
- Conectividad
- Permisos por perfil
- Foreign key integrity
- Conteos de tablas
- Compresión de logs

### `generate-db-types.ts`

Regenerar tipos de DB después de cada migración:

```bash
pnpm db:generate-types
```

Genera: `src/types/db.d.ts` con 119+ tablas tipadas para Kysely.

### `notion-schema-discovery.ts` *(nuevo)*

Descubrir estructura de Notion workspaces configurados:

```bash
pnpm notion:schema-discovery --space-id <id>
```

Genera reporte de databases y propiedades.
