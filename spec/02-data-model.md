# Greenhouse Portal — Modelo de Datos

> Versión: 1.0
> Fecha: 2026-03-15

---

## Arquitectura de datos dual

Greenhouse opera con dos capas de datos complementarias que coexisten y se sincronizan:

- **BigQuery** — Data warehouse analítico. Fuente principal para dashboards, reportes y consultas de lectura masiva. Contiene datos consolidados de Notion, HubSpot y snapshots de PostgreSQL.
- **PostgreSQL (Cloud SQL)** — Store transaccional. Modelo canónico con identidades estables y schemas de dominio para módulos que requieren escritura (payroll, finance, HR, AI tools).

---

## BigQuery — Datasets y tablas

### Dataset: `greenhouse`

Tablas core del modelo de acceso y tenant management.

#### `clients`

Tabla maestra de tenants/clientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `clientId` | STRING | PK. Identificador único del tenant |
| `clientName` | STRING | Nombre comercial |
| `status` | STRING | Estado (active, archived) |
| `active` | BOOLEAN | Flag de actividad |
| `primaryContactEmail` | STRING | Email de contacto principal |
| `notionProjectIds` | STRING | IDs de proyectos Notion (comma-separated) |
| `hubspotCompanyId` | STRING | ID de empresa en HubSpot |
| `allowedEmailDomains` | STRING | Dominios permitidos para SSO auto-provision |
| `featureFlags` | STRING | Flags habilitados (JSON) |
| `timezone` | STRING | Zona horaria del tenant |
| `portalHomePath` | STRING | Ruta home personalizada |

#### `client_users`

Usuarios del portal, vinculados a un tenant.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `userId` | STRING | PK. ID único del usuario |
| `clientId` | STRING | FK → clients. Tenant al que pertenece |
| `tenantType` | STRING | `client` o `efeonce_internal` |
| `email` | STRING | Email principal |
| `fullName` | STRING | Nombre completo |
| `jobTitle` | STRING | Título/cargo |
| `status` | STRING | `invited`, `active`, `disabled`, `archived` |
| `active` | BOOLEAN | Flag de actividad |
| `authMode` | STRING | `credentials`, `sso`, `both`, `password_reset_pending` |
| `passwordHash` | STRING | Hash bcrypt (solo para credentials) |
| `microsoftOid` | STRING | Object ID de Microsoft Entra |
| `microsoftEmail` | STRING | Email de Microsoft SSO |
| `googleSub` | STRING | Subject ID de Google |
| `googleEmail` | STRING | Email de Google SSO |
| `lastLoginAt` | TIMESTAMP | Último login |
| `lastLoginProvider` | STRING | Último proveedor usado |

#### `roles`

Catálogo de roles del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `roleCode` | STRING | PK. Código del rol |
| `roleName` | STRING | Nombre legible |
| `roleFamily` | STRING | Familia (client, internal, admin) |
| `description` | STRING | Descripción |
| `tenantType` | STRING | Tipo de tenant aplicable |
| `isAdmin` | BOOLEAN | Es rol admin |
| `isInternal` | BOOLEAN | Es rol interno |
| `routeGroupScope` | STRING | Route groups que habilita (comma-separated) |

**Roles definidos:**

| roleCode | Family | Route Groups |
|----------|--------|-------------|
| `efeonce_admin` | admin | admin, internal |
| `efeonce_operations` | internal | internal |
| `efeonce_account` | internal | internal |
| `hr_payroll` | internal | internal, hr |
| `hr_manager` | internal | hr |
| `employee` | internal | internal, employee |
| `finance_manager` | internal | internal, finance |
| `finance_admin` | internal | internal, finance |
| `finance_analyst` | internal | internal, finance |
| `people_viewer` | internal | people |
| `ai_tooling_admin` | internal | ai_tooling |
| `collaborator` | internal | my |
| `client_executive` | client | client |
| `client_manager` | client | client |
| `client_specialist` | client | client |

#### `user_role_assignments`

Asignación de roles a usuarios, con temporalidad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `assignmentId` | STRING | PK |
| `userId` | STRING | FK → client_users |
| `clientId` | STRING | FK → clients |
| `roleCode` | STRING | FK → roles |
| `status` | STRING | Estado de la asignación |
| `active` | BOOLEAN | Flag de actividad |
| `effectiveFrom` | DATE | Fecha de inicio |
| `effectiveTo` | DATE | Fecha de fin (null = indefinido) |

#### `user_project_scopes`

Scoping de acceso a proyectos por usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `scopeId` | STRING | PK |
| `userId` | STRING | FK → client_users |
| `clientId` | STRING | FK → clients |
| `projectId` | STRING | ID del proyecto Notion |
| `accessLevel` | STRING | `viewer`, `manager`, `executive_context` |
| `active` | BOOLEAN | Flag de actividad |

#### `user_campaign_scopes`

Scoping de acceso a campañas por usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `scopeId` | STRING | PK |
| `userId` | STRING | FK → client_users |
| `clientId` | STRING | FK → clients |
| `campaignId` | STRING | ID de la campaña |
| `accessLevel` | STRING | Nivel de acceso |
| `active` | BOOLEAN | Flag de actividad |

#### `service_modules`

Catálogo jerárquico de líneas de servicio y módulos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `moduleId` | STRING | PK |
| `moduleCode` | STRING | Código único del módulo |
| `moduleLabel` | STRING | Nombre legible |
| `moduleKind` | STRING | `business_line` o `service_module` |
| `parentModuleCode` | STRING | FK padre (para jerarquía) |
| `sourceSystem` | STRING | Sistema fuente |
| `sourceValue` | STRING | Valor en sistema fuente |
| `active` | BOOLEAN | Flag de actividad |
| `sortOrder` | INT | Orden de presentación |
| `description` | STRING | Descripción |

**Módulos definidos:**

| Código | Kind | Descripción |
|--------|------|-------------|
| `crm_solutions` | business_line | Soluciones CRM |
| `globe` | business_line | Digital Marketing |
| `wave` | business_line | Creative |
| `agencia_creativa` | service_module | Agencia Creativa (child of wave) |
| `licenciamiento_hubspot` | service_module | Licenciamiento HubSpot |
| `implementacion_onboarding` | service_module | Implementación/Onboarding |
| `consultoria_crm` | service_module | Consultoría CRM |
| `desarrollo_web` | service_module | Desarrollo Web |

#### `client_service_modules`

Asignación de módulos de servicio a tenants, derivada de deals cerrados en HubSpot.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `assignmentId` | STRING | PK |
| `clientId` | STRING | FK → clients |
| `hubspotCompanyId` | STRING | Referencia a HubSpot |
| `moduleCode` | STRING | FK → service_modules |
| `sourceSystem` | STRING | Sistema fuente (hubspot_crm) |
| `sourceObjectType` | STRING | Tipo de objeto fuente (deal) |
| `sourceObjectId` | STRING | ID del deal fuente |
| `sourceClosedwonDealId` | STRING | Deal cerrado que origina la asignación |
| `confidence` | STRING | `controlled`, `derived`, `inferred` |
| `active` | BOOLEAN | Flag de actividad |
| `derivedFromLatestClosedwon` | BOOLEAN | Derivado del último deal cerrado |
| `validFrom` | DATE | Inicio de vigencia |
| `validTo` | DATE | Fin de vigencia |

#### `client_feature_flags`

Feature flags por tenant.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `flagId` | STRING | PK |
| `clientId` | STRING | FK → clients |
| `featureCode` | STRING | Código del feature |
| `status` | STRING | `enabled`, `staged`, `disabled` |
| `active` | BOOLEAN | Flag de actividad |
| `rolloutNotes` | STRING | Notas de rollout |

#### `identity_profiles`

Perfiles de identidad canónica (Person 360).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `profileId` | STRING | PK |
| `publicId` | STRING | ID público (EO-ID*) |
| `profileType` | STRING | Tipo de perfil |
| `canonicalEmail` | STRING | Email canónico |
| `fullName` | STRING | Nombre completo |
| `jobTitle` | STRING | Título/cargo |
| `status` | STRING | Estado |
| `active` | BOOLEAN | Flag de actividad |
| `defaultAuthMode` | STRING | Modo de auth por defecto |
| `primarySourceSystem` | STRING | Sistema fuente principal |
| `primarySourceObjectType` | STRING | Tipo de objeto fuente |
| `primarySourceObjectId` | STRING | ID en sistema fuente |

#### `identity_profile_source_links`

Vinculaciones de identidad entre sistemas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `linkId` | STRING | PK |
| `profileId` | STRING | FK → identity_profiles |
| `sourceSystem` | STRING | Sistema fuente |
| `sourceObjectType` | STRING | Tipo de objeto |
| `sourceObjectId` | STRING | ID en fuente |
| `sourceUserId` | STRING | User ID en fuente |
| `sourceEmail` | STRING | Email en fuente |
| `sourceDisplayName` | STRING | Nombre en fuente |
| `isPrimary` | BOOLEAN | Es la fuente principal |
| `isLoginIdentity` | BOOLEAN | Es identidad de login |
| `active` | BOOLEAN | Flag de actividad |

#### `audit_events`

Registro de auditoría.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | STRING | PK |
| `eventType` | STRING | Tipo de evento |
| `actorUserId` | STRING | Usuario que ejecutó |
| `clientId` | STRING | Tenant afectado |
| `targetEntityType` | STRING | Tipo de entidad afectada |
| `targetEntityId` | STRING | ID de entidad afectada |
| `eventPayload` | JSON | Payload del evento |
| `occurredAt` | TIMESTAMP | Timestamp del evento |

### Dataset: `notion_ops`

Datos sincronizados desde Notion (operación de proyectos).

#### Tablas principales

- `tareas` — Tareas de proyectos con estado, RPA, compliance, sprints
- `proyectos` — Proyectos con metadata, fechas, asociaciones

### Dataset: `greenhouse_raw`

Datos crudos de sincronización.

- `postgres_outbox_events` — Eventos del outbox PostgreSQL publicados hacia BigQuery

### Dataset: `greenhouse_conformed`

Datos conformados/transformados.

- `delivery_projects` — Vista conformada de proyectos de entrega

---

## PostgreSQL — Schemas y tablas

### Schema: `greenhouse_core`

Identidades canónicas y master data.

#### `members`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `member_id` | UUID | PK |
| `display_name` | VARCHAR | Nombre para mostrar |
| `email` | VARCHAR | Email principal |
| `role_title` | VARCHAR | Título del rol |
| `role_category` | VARCHAR | Categoría (account, operations, strategy, design, development, media) |
| `location_country` | VARCHAR | País de ubicación |
| `active` | BOOLEAN | Flag de actividad |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

#### `clients`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `client_id` | UUID | PK |
| `client_name` | VARCHAR | Nombre del cliente |
| `hubspot_company_id` | VARCHAR | Referencia HubSpot |
| `status` | VARCHAR | Estado |
| `active` | BOOLEAN | Flag de actividad |

#### `client_users`

Mirror transaccional de la tabla BigQuery homónima, con campos adicionales para SSO linking.

#### `departments`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `department_id` | UUID | PK |
| `name` | VARCHAR | Nombre del departamento |
| `parent_department_id` | UUID | FK padre (jerarquía) |
| `head_member_id` | UUID | FK → members. Jefe del depto |
| `business_unit` | VARCHAR | Unidad de negocio |
| `active` | BOOLEAN | Flag de actividad |

#### `providers`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `provider_id` | UUID | PK |
| `provider_name` | VARCHAR | Nombre del proveedor |
| `category` | VARCHAR | `ai_vendor`, `software_suite`, `identity_provider`, `delivery_platform`, `financial_vendor` |
| `kind` | VARCHAR | `organization`, `platform`, `marketplace` |

### Schema: `greenhouse_hr`

#### `leave_types`

Catálogo de tipos de permiso.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `leave_type_code` | VARCHAR | PK |
| `leave_type_name` | VARCHAR | Nombre del tipo |
| `default_annual_allowance_days` | INT | Días anuales por defecto |
| `is_paid` | BOOLEAN | Es remunerado |
| `active` | BOOLEAN | Flag de actividad |

#### `leave_balances`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `balance_id` | UUID | PK |
| `member_id` | UUID | FK → members |
| `leave_type_code` | VARCHAR | FK → leave_types |
| `allowance_days` | DECIMAL | Días asignados |
| `carried_over_days` | DECIMAL | Días transferidos del período anterior |
| `used_days` | DECIMAL | Días usados |
| `reserved_days` | DECIMAL | Días reservados (solicitudes pendientes) |
| `available_days` | DECIMAL | Computed: allowance + carried - used - reserved |

#### `leave_requests`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `request_id` | UUID | PK |
| `member_id` | UUID | FK → members |
| `leave_type_code` | VARCHAR | FK → leave_types |
| `start_date` | DATE | Fecha inicio |
| `end_date` | DATE | Fecha fin |
| `status` | VARCHAR | `pending_supervisor`, `pending_hr`, `approved`, `rejected`, `cancelled` |
| `reviewer_member_id` | UUID | Quién revisó |
| `review_notes` | TEXT | Notas de revisión |

#### `attendance_records`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `attendance_id` | UUID | PK |
| `member_id` | UUID | FK → members |
| `attendance_date` | DATE | Fecha |
| `status` | VARCHAR | `present`, `late`, `absent`, `excused`, `holiday` |
| `source_system` | VARCHAR | Sistema fuente (teams_webhook, manual) |
| `minutes_present` | INT | Minutos de presencia |

### Schema: `greenhouse_payroll`

#### `compensation_versions`

Versiones de compensación por miembro, con vigencia temporal.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `version_id` | UUID | PK |
| `member_id` | UUID | FK → members |
| `version` | INT | Número de versión |
| `pay_regime` | VARCHAR | `chile` o `international` |
| `currency` | VARCHAR | `CLP` o `USD` |
| `base_salary` | DECIMAL | Salario base |
| `remote_allowance` | DECIMAL | Asignación remota |
| `bonus_otd_min` / `bonus_otd_max` | DECIMAL | Rango de bono OTD |
| `bonus_rpa_min` / `bonus_rpa_max` | DECIMAL | Rango de bono RPA |
| `afp_name` | VARCHAR | Nombre de AFP (Chile) |
| `afp_rate` | DECIMAL | Tasa de AFP |
| `health_system` | VARCHAR | FONASA o ISAPRE |
| `contract_type` | VARCHAR | `indefinido` o `plazo_fijo` |
| `has_apv` | BOOLEAN | Tiene APV |
| `apv_amount` | DECIMAL | Monto APV |
| `effective_from` | DATE | Inicio de vigencia |
| `effective_to` | DATE | Fin de vigencia (null = vigente) |
| `is_current` | BOOLEAN | Es la versión actual |

#### `payroll_periods`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `period_id` | UUID | PK |
| `year` | INT | Año |
| `month` | INT | Mes |
| `status` | VARCHAR | `draft`, `calculated`, `approved`, `exported` |
| `calculated_at` | TIMESTAMPTZ | Fecha de cálculo |
| `approved_at` | TIMESTAMPTZ | Fecha de aprobación |
| `exported_at` | TIMESTAMPTZ | Fecha de exportación |
| `uf_value` | DECIMAL | Valor UF del período (Chile) |
| `tax_table_version` | VARCHAR | Versión de tabla impositiva |

#### `payroll_entries`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `entry_id` | UUID | PK |
| `period_id` | UUID | FK → payroll_periods |
| `member_id` | UUID | FK → members |
| `compensation_version_id` | UUID | FK → compensation_versions |
| `pay_regime` | VARCHAR | Régimen de pago |
| `currency` | VARCHAR | Moneda |
| `base_salary` | DECIMAL | Salario base del período |
| `kpi_otd_percent` | DECIMAL | KPI OTD snapshot |
| `kpi_rpa_avg` | DECIMAL | KPI RPA snapshot |
| `bonus_otd_amount` | DECIMAL | Bono OTD calculado |
| `bonus_rpa_amount` | DECIMAL | Bono RPA calculado |
| `chile_afp_amount` | DECIMAL | Deducción AFP |
| `chile_health_amount` | DECIMAL | Deducción salud |
| `chile_unemployment_amount` | DECIMAL | Seguro de cesantía |
| `chile_tax_amount` | DECIMAL | Impuesto |
| `chile_apv_amount` | DECIMAL | APV |
| `net_total` | DECIMAL | Total neto |
| `manual_override` | BOOLEAN | Override manual |

#### `payroll_bonus_config`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `config_id` | UUID | PK |
| `otd_threshold` | DECIMAL | Umbral OTD (default: 89.0) |
| `rpa_threshold` | DECIMAL | Umbral RPA (default: 2.0) |
| `effective_from` | DATE | Inicio de vigencia |

### Schema: `greenhouse_finance`

#### `accounts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `account_id` | UUID | PK |
| `account_name` | VARCHAR | Nombre de la cuenta |
| `account_type` | VARCHAR | `checking`, `savings`, `credit_card`, `investment` |
| `currency` | VARCHAR | Moneda |
| `institution` | VARCHAR | Institución bancaria |
| `active` | BOOLEAN | Flag de actividad |
| `opening_balance` | DECIMAL | Saldo de apertura |
| `opening_balance_date` | DATE | Fecha de apertura |

#### `income`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `income_id` | UUID | PK |
| `client_id` | UUID | FK → clients |
| `account_id` | UUID | FK → accounts |
| `amount` | DECIMAL | Monto |
| `currency` | VARCHAR | Moneda |
| `description` | VARCHAR | Descripción |
| `invoice_number` | VARCHAR | Número de factura |
| `service_line` | VARCHAR | Línea de servicio |
| `status` | VARCHAR | Estado (pending, paid, overdue, cancelled) |
| `due_date` | DATE | Fecha de vencimiento |
| `paid_date` | DATE | Fecha de pago |

#### `expenses`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `expense_id` | UUID | PK |
| `supplier_id` | UUID | FK → suppliers |
| `account_id` | UUID | FK → accounts |
| `member_id` | UUID | FK → members (nullable) |
| `expense_type` | VARCHAR | Tipo de gasto |
| `amount` | DECIMAL | Monto |
| `currency` | VARCHAR | Moneda |
| `service_line` | VARCHAR | Línea de servicio |
| `status` | VARCHAR | Estado |
| `expense_date` | DATE | Fecha del gasto |

#### `suppliers`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `supplier_id` | UUID | PK |
| `supplier_name` | VARCHAR | Nombre |
| `tax_id` | VARCHAR | RUT/Tax ID |
| `country` | VARCHAR | País |
| `category` | VARCHAR | Categoría |
| `payment_method` | VARCHAR | Método de pago (transfer, cash, card) |
| `payment_terms` | VARCHAR | Términos (Net 30, etc.) |
| `requires_po` | BOOLEAN | Requiere orden de compra |
| `active` | BOOLEAN | Flag de actividad |

#### `exchange_rates`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rate_id` | UUID | PK |
| `from_currency` | VARCHAR | Moneda origen |
| `to_currency` | VARCHAR | Moneda destino |
| `rate` | DECIMAL | Tipo de cambio |
| `source` | VARCHAR | Fuente del dato |
| `rate_date` | DATE | Fecha del tipo de cambio |

#### `reconciliation_sessions` / `reconciliation_matches`

Tablas para el flujo de reconciliación bancaria con sesiones, statements y matcheos.

### Schema: `greenhouse_serving`

Vistas materializadas de lectura optimizada.

- `member_leave_360` — Vista consolidada de leave por miembro
- `member_payroll_360` — Vista consolidada de payroll por miembro
- `person_360` — Vista consolidada de identidad canónica

### Schema: `greenhouse_sync`

#### `outbox_events`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `event_id` | UUID | PK |
| `aggregate_type` | VARCHAR | Tipo de agregado (expense, income, etc.) |
| `aggregate_id` | VARCHAR | ID del agregado |
| `event_type` | VARCHAR | Tipo de evento (created, updated, etc.) |
| `payload_json` | JSONB | Payload del evento |
| `status` | VARCHAR | `pending` o `published` |
| `occurred_at` | TIMESTAMPTZ | Timestamp del evento |
| `published_at` | TIMESTAMPTZ | Timestamp de publicación |

#### `source_sync_runs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sync_run_id` | UUID | PK |
| `source_system` | VARCHAR | Sistema fuente |
| `sync_mode` | VARCHAR | `poll` |
| `status` | VARCHAR | `running`, `succeeded`, `failed` |
| `records_read` | INT | Registros leídos |
| `records_written_raw` | INT | Registros escritos |
| `triggered_by` | VARCHAR | Quién disparó el sync |
| `started_at` | TIMESTAMPTZ | Inicio |
| `finished_at` | TIMESTAMPTZ | Fin |

#### `source_sync_failures`

Registro de fallos de sincronización con error_message y payload.

---

## Modelo de identidad canónica (Person 360)

### Estructura

```
Person360 (identity_profiles)
├── member_facet (greenhouse_core.members)
│   ├── employment_type, department, job_level
│   ├── hire_date, contract_end_date
│   └── skills[], tools[], ai_suites[]
├── user_facet (greenhouse.client_users)
│   ├── email, tenantType, authMode
│   ├── microsoftOid, googleSub
│   └── lastLoginAt, avatarUrl
├── crm_facet (HubSpot contact)
│   ├── contactRecordId, hubspotContactId
│   ├── lifecycleStage, leadStatus
│   └── jobTitle
└── resolved_data (best-available cross-facet)
    ├── displayName, canonicalEmail
    ├── linkedSystems[]
    └── activeRoleCodes[]
```

### Reglas de resolución

1. Una identidad canónica por objeto de negocio (`member_id`, `client_id`, `user_id`)
2. Los módulos de dominio extienden identidades vía FK, nunca las redefinen
3. Snapshots de campos desnormalizados permitidos solo en registros históricos
4. El `resolved_data` se construye al query time, priorizando el facet más actualizado

### Confianza de identidad

- **strong** — Tres o más source links activos con email coincidente
- **partial** — Dos source links activos
- **basic** — Un solo source link

---

## Convención de IDs públicos

Greenhouse genera IDs públicos legibles con prefijo `EO-`:

| Entidad | Formato | Ejemplo |
|---------|---------|---------|
| Cliente | `EO-{hubspotId}` o `EO-SPACE-{name}` o `EO-TEN-{id}` | EO-12345 |
| Usuario | `EO-USR-{hubspotContactId}` o `EO-USR-{suffix}` | EO-USR-67890 |
| Identidad | `EO-ID{sequence}` | EO-ID0042 |
| Service Module | `EO-BL-{code}` o `EO-SVC-{code}` | EO-BL-globe |
| Capability | `EO-CAP-{tenantId}-{moduleCode}` | EO-CAP-123-crm |
| Role Assignment | `EO-ROLE-{tenantId}-{userId}-{roleCode}` | EO-ROLE-1-5-admin |
| Feature Flag | `EO-FLG-{tenantId}-{featureCode}` | EO-FLG-1-dashboard |

---

## Relaciones entre entidades

### Tenant → Usuarios y scoping

```
Client (tenant)
├── client_users[] (usuarios del portal)
│   ├── user_role_assignments[] (roles asignados)
│   ├── user_project_scopes[] (proyectos visibles)
│   └── user_campaign_scopes[] (campañas visibles)
├── client_service_modules[] (capabilities contratadas)
├── client_feature_flags[] (features habilitados)
└── notionProjectIds[] (proyectos asociados)
```

### Compensación → Payroll

```
Member
├── compensation_versions[] (historial de compensación)
│   └── payroll_entries[] (liquidaciones mensuales)
│       ├── kpi_snapshot (OTD%, RPA)
│       ├── bonus_calculation (OTD amount, RPA amount)
│       └── chile_deductions (AFP, health, unemployment, tax, APV)
└── leave_balances[] (saldos de permisos)
    └── leave_requests[] (solicitudes)
```

### Finance → Reconciliación

```
Account
├── income[] (ingresos)
│   └── client (FK)
├── expenses[] (egresos)
│   ├── supplier (FK)
│   └── member (FK, nullable)
└── reconciliation_sessions[]
    ├── statements[]
    └── matches[]
```

---

## Sincronización de datos

### Flujo outbox (PostgreSQL → BigQuery)

1. Escritura en PostgreSQL genera un evento en `greenhouse_sync.outbox_events` con status `pending`
2. Cron job cada 5 minutos invoca `/api/cron/outbox-publish`
3. El consumer lee eventos pending en lotes de 100
4. Inserta en `greenhouse_raw.postgres_outbox_events` de BigQuery
5. Marca eventos como `published` con timestamp
6. Registra el run en `source_sync_runs`
7. Fallos parciales se registran en `source_sync_failures`

### Flujo exchange rates

Cron diario a las 23:05 UTC invoca `/api/finance/exchange-rates/sync` para actualizar tipos de cambio.
