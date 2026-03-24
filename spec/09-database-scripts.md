# Greenhouse Portal — Catálogo de Scripts

> Versión: 2.0
> Fecha: 2026-03-22
> Actualizado: Account 360 scripts, Nubox setup/sync, Identity Reconciliation, Services, Space-Notion, Finance Intelligence

---

## Visión general

El directorio `scripts/` contiene scripts TypeScript para setup de schemas PostgreSQL, backfill de datos, diagnóstico y operaciones. Se ejecutan con `tsx` vía comandos `pnpm` definidos en `package.json`.

Los scripts usan una librería compartida (`scripts/lib/`) para carga de variables de entorno y ejecución de queries PostgreSQL.

---

## Utilidades compartidas

### `scripts/lib/load-greenhouse-tool-env.ts`

Carga variables de entorno necesarias para scripts de infraestructura. Inicializa la conexión a PostgreSQL con el perfil adecuado (migrator o admin).

### `scripts/lib/postgres-script-runner.ts`

Helper para ejecutar scripts SQL contra PostgreSQL con manejo de errores, logging y transacciones.

---

## Scripts de Setup (Creación de schemas)

Estos scripts crean las tablas, indexes y constraints necesarios. Usan el perfil **migrator** de PostgreSQL.

### `setup-postgres-canonical-360.ts`

- **Comando**: `pnpm setup:postgres:canonical-360`
- **Schema**: `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`
- **Crea**: Tablas core de identidad (`members`, `clients`, `client_users`, `departments`, `providers`), vistas de serving, tablas de outbox y sync tracking
- **Dependencias**: Ninguna (es el schema fundacional)

### `setup-postgres-person-360.ts`

- **Comando**: `pnpm setup:postgres:person-360`
- **Schema**: `greenhouse_serving`
- **Crea**: Vista materializada `person_360` con identidad consolidada
- **Dependencias**: `canonical-360` debe existir

### `setup-postgres-person-360-v2.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: V2 de person_360 con campos adicionales
- **Dependencias**: `person-360` base

### `setup-postgres-person-360-serving.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: Serving layer optimizado para lectura de Person 360

### `setup-postgres-person-360-contextual.ts`

- **Schema**: `greenhouse_serving`
- **Crea**: Datos contextuales de person 360 (delivery, HR, finance contexts)

### `setup-postgres-hr-leave.ts`

- **Comando**: `pnpm setup:postgres:hr-leave`
- **Schema**: `greenhouse_hr`
- **Crea**: `leave_types`, `leave_balances`, `leave_requests`, `attendance_records`
- **Dependencias**: `canonical-360` (FK a `members`)

### `setup-postgres-payroll.ts`

- **Comando**: `pnpm setup:postgres:payroll`
- **Schema**: `greenhouse_payroll`
- **Crea**: `compensation_versions`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config`
- **Dependencias**: `canonical-360` (FK a `members`)

### `setup-postgres-finance.ts`

- **Comando**: `pnpm setup:postgres:finance`
- **Schema**: `greenhouse_finance`
- **Crea**: `accounts`, `income`, `expenses`, `suppliers`, `exchange_rates`
- **Dependencias**: `canonical-360` (FK a `members`, `clients`)

### `setup-postgres-finance-slice2.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Extensiones de finance: reconciliation sessions, statements, matches
- **Dependencias**: `finance` base

### `setup-postgres-ai-tooling.ts`

- **Comando**: `pnpm setup:postgres:ai-tooling`
- **Schema**: AI tooling
- **Crea**: Tablas para catálogo de tools, licencias, wallets, ledger
- **Dependencias**: `canonical-360`

### `setup-postgres-access.ts`

- **Comando**: `pnpm setup:postgres:access`
- **Crea**: Tablas de access control en PostgreSQL
- **Dependencias**: `canonical-360`

### `setup-postgres-client-assignments.ts`

- **Comando**: `pnpm setup:postgres:client-assignments`
- **Crea**: Tablas de asignaciones cliente-equipo
- **Dependencias**: `canonical-360`

### `setup-postgres-source-sync.ts`

- **Comando**: `pnpm setup:postgres:source-sync`
- **Crea**: Infraestructura de source sync (tablas de tracking de sincronización)
- **Dependencias**: `canonical-360`

### Account 360 Setup *(nuevo)*

### `setup-postgres-account-360-m0.ts`

- **Schema**: `greenhouse_core`
- **Crea**: `organizations`, `spaces`, `person_memberships` con secuencias para IDs públicos (`EO-ORG-*`, `EO-SPC-*`, `EO-MBR-*`)
- **DDL**: `setup-postgres-account-360-m0.sql`
- **Dependencias**: `canonical-360` debe existir

### `setup-postgres-organization-360.ts`

- **Schema**: `greenhouse_core`, `greenhouse_serving`
- **Crea**: Serving views para Organization 360 (consolidación de organizations + spaces + memberships)
- **DDL**: `setup-postgres-organization-360.sql`
- **Dependencias**: `account-360-m0`

### `setup-postgres-services.sql`

- **Schema**: `greenhouse_core`
- **Crea**: `services`, `service_history` con secuencia `EO-SVC-*`
- **Dependencias**: `account-360-m0` (FK a organizations y spaces)

### `setup-postgres-space-notion-sources.sql`

- **Schema**: `greenhouse_core`
- **Crea**: `space_notion_sources` (mapeo Notion DB IDs por espacio)
- **Dependencias**: `account-360-m0` (FK a spaces)

### `setup-postgres-unified-org.ts`

- **Schema**: `greenhouse_core`
- **Crea**: Vista unificada de organizaciones para queries cross-module
- **DDL**: `setup-postgres-unified-org.sql`

### Identity & Reconciliation Setup *(nuevo)*

### `setup-postgres-identity-v2.ts`

- **Schema**: `greenhouse_core`
- **Crea**: Identity profiles v2 con campos extendidos
- **DDL**: `setup-postgres-identity-v2.sql`
- **Dependencias**: `canonical-360`

### `setup-identity-reconciliation.ts`

- **Schema**: `greenhouse_core`
- **Crea**: `reconciliation_proposals`, `reconciliation_runs` para tracking de identity matching
- **DDL**: `setup-identity-reconciliation.sql`
- **Dependencias**: `identity-v2`

### Finance Extensions Setup *(nuevo)*

### `setup-postgres-finance-intelligence-p1.ts` / `p2.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Tablas y vistas para finance intelligence (client economics, allocations)
- **DDL**: `setup-postgres-finance-intelligence-p1.sql`, `p2.sql`
- **Dependencias**: `finance` base

### `setup-postgres-finance-bridge-m33.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Bridge tables para vincular finance con Account 360 (organization_id en income/expenses)
- **DDL**: `setup-postgres-finance-bridge-m33.sql`
- **Dependencias**: `finance` + `account-360-m0`

### `setup-postgres-nubox-extensions.ts`

- **Schema**: `greenhouse_finance`
- **Crea**: Extensiones de tablas para datos sincronizados desde Nubox
- **DDL**: `setup-postgres-nubox-extensions.sql`
- **Dependencias**: `finance` base

### Nubox BigQuery Setup *(nuevo)*

### `setup-bigquery-nubox-raw.ts`

- **Crea**: Dataset `nubox_raw_snapshots` con tablas de archivo JSON crudo
- **DDL**: `setup-bigquery-nubox-raw.sql`
- **Propósito**: Destino para Fase A del pipeline Nubox

### `setup-bigquery-nubox-conformed.ts`

- **Crea**: Dataset `nubox_conformed` con tablas conformadas (ventas, compras con identity resolution)
- **DDL**: `setup-bigquery-nubox-conformed.sql`
- **Propósito**: Destino para Fase B del pipeline Nubox

### Other Infrastructure Setup *(nuevo)*

### `setup-postgres-transactional-email.ts`

- **Schema**: Email transaccional
- **Crea**: Tablas para tracking de emails enviados
- **DDL**: `setup-postgres-transactional-email.sql`

### `setup-bigquery-email-logs.ts`

- **Crea**: Tabla de logs de email en BigQuery

### BigQuery Setup Scripts

### `setup-bigquery-outbox.ts`

- **Crea**: Tabla `greenhouse_raw.postgres_outbox_events` en BigQuery
- **Propósito**: Destino para los eventos del outbox consumer

### `setup-bigquery-outbox-marts.ts`

- **Crea**: Marts analíticos derivados de outbox events en BigQuery
- **Propósito**: Vistas agregadas para análisis

### `setup-bigquery-source-sync.ts`

- **Crea**: Tablas de tracking de source sync en BigQuery
- **Propósito**: Monitoreo de sincronización

---

## Scripts de Backfill (Carga de datos)

Estos scripts populan las tablas con datos existentes. Usan perfil **admin** o **migrator**.

### `backfill-postgres-canonical-360.ts`

- **Comando**: `pnpm backfill:postgres:canonical-360`
- **Fuente**: BigQuery (`greenhouse.team_members`, `greenhouse.clients`, etc.)
- **Destino**: `greenhouse_core.*`
- **Acción**: Poblar members, clients, client_users, departments desde BigQuery

### `backfill-postgres-person-360-coverage.ts`

- **Comando**: `pnpm backfill:postgres:person-360-coverage`
- **Fuente**: BigQuery + PostgreSQL
- **Destino**: `greenhouse_serving.person_360`
- **Acción**: Completar perfiles de persona con datos de todas las fuentes

### `backfill-postgres-hr-leave.ts`

- **Comando**: `pnpm backfill:postgres:hr-leave`
- **Fuente**: Datos existentes
- **Destino**: `greenhouse_hr.*`
- **Acción**: Poblar leave types, balances iniciales

### `backfill-postgres-payroll.ts`

- **Comando**: `pnpm backfill:postgres:payroll`
- **Fuente**: BigQuery (`greenhouse.compensation_versions`, períodos históricos)
- **Destino**: `greenhouse_payroll.*`
- **Acción**: Migrar compensaciones y períodos históricos

### `backfill-postgres-finance.ts`

- **Comando**: `pnpm backfill:postgres:finance`
- **Fuente**: Datos existentes
- **Destino**: `greenhouse_finance.*`
- **Acción**: Poblar cuentas, proveedores, transacciones

### `backfill-postgres-finance-slice2.ts`

- **Fuente**: Datos existentes
- **Destino**: `greenhouse_finance.*` (extensiones)
- **Acción**: Poblar reconciliation data

### `backfill-postgres-client-assignments.ts`

- **Fuente**: BigQuery
- **Destino**: PostgreSQL
- **Acción**: Migrar asignaciones cliente-equipo

### `backfill-postgres-ai-tooling.ts`

- **Comando**: `pnpm backfill:postgres:ai-tooling`
- **Fuente**: Seed data
- **Destino**: AI tooling tables
- **Acción**: Poblar catálogo de tools, proveedores, wallets iniciales

### `backfill-hubspot-contact-names.ts`

- **Fuente**: HubSpot API (vía microservicio)
- **Destino**: BigQuery / PostgreSQL
- **Acción**: Sincronizar nombres de contactos desde HubSpot

### `backfill-efeonce-microsoft-aliases.ts`

- **Fuente**: Microsoft Entra ID
- **Destino**: BigQuery / PostgreSQL
- **Acción**: Alinear aliases de email Microsoft con identidades internas

### `backfill-internal-identity-profiles.ts`

- **Fuente**: Datos internos
- **Destino**: `greenhouse.identity_profiles`, `identity_profile_source_links`
- **Acción**: Crear perfiles de identidad canónica para equipo interno

---

## Scripts operacionales

### `pg-doctor.ts`

- **Comando**: `pnpm pg:doctor`
- **Propósito**: Health check de PostgreSQL
- **Verifica**: Conectividad, permisos de cada perfil, existencia de schemas/tablas, conteos básicos
- **Output**: Reporte de estado

### `audit-person-360-coverage.ts`

- **Comando**: `pnpm audit:person-360`
- **Propósito**: Auditar completitud de perfiles Person 360
- **Verifica**: Qué miembros tienen perfil completo, qué facets faltan, confidence levels
- **Output**: Reporte de cobertura

### `sync-source-runtime-projections.ts`

- **Propósito**: Sincronizar vistas materializadas de runtime
- **Acción**: Refresh de projections que la app consulta en hot path

### `run-outbox-consumer.ts`

- **Comando**: `pnpm sync:outbox`
- **Propósito**: Ejecutar outbox consumer manualmente (alternativa al cron)
- **Acción**: Lee eventos pending de PostgreSQL y los publica en BigQuery

### `admin-team-runtime-smoke.ts`

- **Propósito**: Smoke test del módulo team admin
- **Acción**: Verifica que las operaciones CRUD funcionan correctamente

---

## BigQuery SQL Scripts (`bigquery/`)

Scripts SQL para bootstrap de datos en BigQuery.

### `greenhouse_clients.sql`

- **Propósito**: DDL y seed de la tabla `greenhouse.clients`

### `greenhouse_hubspot_customer_bootstrap_v1.sql`

- **Propósito**: Bootstrap de clientes desde HubSpot closedwon deals
- **Fuente**: `hubspot.companies`, `hubspot.deals`
- **Destino**: `greenhouse.clients`, `greenhouse.client_users`
- **Lógica**: MERGE idempotente, filtro por deals cerrados, exclusión de emails @efeonce.com

### `greenhouse_efeonce_space_v1.sql`

- **Propósito**: Configuración del espacio interno Efeonce
- **Destino**: `greenhouse.clients` (registro interno)

### `greenhouse_internal_identity_v1.sql`

- **Propósito**: Bootstrap de identidades internas Efeonce
- **Fuente**: Datos internos
- **Destino**: `greenhouse.identity_profiles`, `identity_profile_source_links`

### `greenhouse_microsoft_sso_v1.sql`

- **Propósito**: Vinculación de identidades Microsoft SSO
- **Lógica**: Matcheo por email y OID, actualización de authMode

### `greenhouse_project_scope_bootstrap_v1.sql`

- **Propósito**: Bootstrap de project scopes para usuarios
- **Fuente**: `notion_ops.proyectos` + `greenhouse.clients`
- **Destino**: `greenhouse.user_project_scopes`

### `greenhouse_public_ids_v1.sql`

- **Propósito**: Generación de IDs públicos EO-*
- **Lógica**: Genera publicId para clients, users, service modules, capabilities, roles, flags
- **Patrones**: EO-{id}, EO-USR-{id}, EO-BL-{code}, EO-SVC-{code}, etc.

### `greenhouse_service_module_bootstrap_v1.sql` / `greenhouse_service_modules_v1.sql`

- **Propósito**: Bootstrap del catálogo de service modules y asignaciones
- **Fuente**: `hubspot.deals` (closedwon), campos `linea_de_servicio` y `servicios_especificos`
- **Destino**: `greenhouse.service_modules`, `greenhouse.client_service_modules`
- **Lógica**: CTE complejo con CROSS JOIN UNNEST para parsing de campos comma-separated

### `greenhouse_identity_access_v1.sql`

- **Propósito**: Bootstrap de roles y access control
- **Destino**: `greenhouse.roles`, `greenhouse.user_role_assignments`

### `greenhouse_hr_payroll_v1.sql`

- **Propósito**: Bootstrap de datos HR y payroll
- **Destino**: `greenhouse.compensation_versions` y relacionados

---

## Orden de ejecución recomendado

### Setup inicial (schemas)

```bash
# 1. Schema fundacional
pnpm setup:postgres:canonical-360

# 2. Schemas de dominio (pueden ejecutarse en paralelo)
pnpm setup:postgres:hr-leave
pnpm setup:postgres:payroll
pnpm setup:postgres:finance

# 3. Extensiones de dominio
pnpm setup:postgres:finance-slice2        # después de finance
pnpm setup:postgres:ai-tooling
pnpm setup:postgres:access
pnpm setup:postgres:client-assignments
pnpm setup:postgres:source-sync

# 4. Account 360 (después de canonical-360)
pnpm setup:postgres:account-360-m0        # organizations, spaces, person_memberships
pnpm setup:postgres:services              # services + service_history
pnpm setup:postgres:space-notion-sources  # space-notion source mapping

# 5. Identity v2 (después de canonical-360 y account-360)
pnpm setup:postgres:identity-v2           # identity_profiles v2 + reconciliation

# 6. Finance extensions (después de finance y account-360)
pnpm setup:postgres:nubox-extensions      # nubox extensions en greenhouse_finance
pnpm setup:postgres:finance-intelligence-p1  # finance intelligence tables
pnpm setup:postgres:finance-intelligence-p2  # finance intelligence advanced

# 7. Serving layer (después de todos los schemas)
pnpm setup:postgres:person-360
pnpm setup:postgres:organization-360      # organization serving views
```

### Backfill (carga de datos)

```bash
# 1. Datos core
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
# Ejecutar setup-bigquery-email-logs.ts
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
