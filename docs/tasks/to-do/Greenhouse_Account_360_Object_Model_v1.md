# Greenhouse Account 360 — Unified Object Model

## Especificación de Arquitectura v1.1 (corregida)

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

> **Nota v1.1**: Esta versión corrige la v1.0 para alinearla con la arquitectura real del codebase. Los cambios principales son: (1) `identity_profiles` ya existe y reemplaza la propuesta de `persons`, (2) `greenhouse_core.spaces` ya existe con semántica de Notion workspace, (3) el módulo financiero ya está implementado (5 phases), (4) `client_users` ya tiene `identity_profile_id`, (5) `greenhouse_crm.contacts` ya resuelve el vínculo HubSpot → Identity Profile.

---

## 1. Resumen ejecutivo

Este documento define el modelo canónico de objetos para el lado **cliente** de Greenhouse, extendiendo el patrón 360 que ya existe para personas internas (Identity Profile / EO-ID) a organizaciones clientes y sus colaboradores.

El modelo introduce tres capas:

1. **Organization** (`EO-ORG-XXXX`) — La empresa cliente como entidad jurídica/comercial. Ancla única B2B. Vinculada a HubSpot Company. **Tabla nueva.**
2. **Space** (`EO-SPC-XXXX`) — El tenant operativo. Hijo de Organization. Donde vivirán servicios, equipos, configuración, capabilities. Una Organization puede tener N Spaces. **Tabla nueva** (requiere renombrar `greenhouse_core.spaces` existente — ver §4.2).
3. **Person** (Identity Profile existente, `EO-ID{NNNN}`) — Cualquier ser humano en el sistema, interno o externo. **Ya implementado** en `greenhouse_core.identity_profiles`. Se extiende con memberships múltiples que determinan las vistas contextuales.

### Convención EO-ID

Todos los objetos canónicos de Greenhouse usan el prefijo `EO-` seguido de un discriminador de tipo y un correlativo numérico secuencial. Este es el identificador humano-legible que viaja en la UI, reportes, logs y comunicaciones. Internamente, cada registro tiene también un ID técnico (TEXT, no UUID — ver §nota sobre PKs). Ambos coexisten: el ID técnico es para queries y FKs; el EO-ID es para humanos.

| Objeto | Prefijo | Ejemplo | Estado |
|---|---|---|---|
| Organization | `EO-ORG-` | `EO-ORG-0001` | **Nuevo** — secuencial, auto-increment |
| Space (tenant) | `EO-SPC-` | `EO-SPC-0001` | **Nuevo** — secuencial, auto-increment |
| Identity Profile (persona) | `EO-ID` | `EO-ID0001` | **Ya existe** — formato actual en `identity_profiles.eo_id` |
| Member (collaborator) | `EO-MBR-` | `EO-MBR-0001` | **Nuevo** — secuencial, auto-increment |
| Service (futuro) | `EO-SRV-` | `EO-SRV-0001` | Futuro |

**Regla:** El EO-ID es inmutable una vez asignado. Si un registro se desactiva, su EO-ID no se reutiliza.

**Principio de diseño:** Un objeto canónico, vistas contextuales por módulo. Nunca duplicar la entidad — siempre proyectar la vista que el módulo necesita sobre el mismo registro.

**Nota sobre PKs:** El codebase actual usa TEXT (no UUID) como tipo de PK en todas las tablas core: `identity_profiles.identity_profile_id` (TEXT, ej: `ip-{uuid}`), `members.member_id` (TEXT, ej: `mbr-{timestamp}`), `client_users.user_id` (TEXT). Las nuevas tablas (`organizations`, `spaces` tenant, `person_memberships`) deben usar TEXT PKs para consistencia. El EO-ID puede ser un campo separado o la PK directa.

### Orden de implementación

**Este documento se implementa ANTES que Services Architecture.** Account 360 crea la base de objetos (`organizations`, `spaces` como tenant, `person_memberships`) sobre la cual Services se montará en el futuro. Cuando Services se implemente, los `services` harán FK a `spaces.id` que ya existirán.

Orden:
1. **Account 360** (este documento) → crea organizations, spaces (tenant), person_memberships. Reutiliza identity_profiles existente.
2. **Services Architecture** (futuro) → crea services con FK a spaces
3. **Capabilities v2** (futuro) → resuelve capabilities desde services activos por space

**Relación con documentos existentes:**

| Documento | Relación |
|---|---|
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Este documento extiende el modelo de identidad. Identity Access V2 define roles, route groups y session. Account 360 define los objetos sobre los cuales esos roles operan. |
| `Greenhouse_Services_Architecture_v1.md` | **Diseñado pero no implementado.** Define `services` y referencia `spaces`. Account 360 crea la tabla `organizations` y redefine `spaces` como tenant que Services necesitará como prerequisito. |
| `CODEX_TASK_Financial_Module.md` / `CODEX_TASK_Financial_Intelligence_Layer.md` | **YA IMPLEMENTADO (Phases 1-5).** El módulo financiero usa `greenhouse_finance` schema en PostgreSQL con income, expenses, accounts, suppliers, exchange_rates, cost_allocations, client_economics. Payroll integrado con P&L y conversión USD→CLP. La migración a Account 360 debe considerar las FKs existentes en `fin_client_profiles`, `fin_income`, y `fin_expenses` que hoy usan `client_profile_id`. |
| `CODEX_TASK_HR_Payroll_Module_v2.md` / `CODEX_TASK_HR_Core_Module.md` | **YA IMPLEMENTADO.** El módulo de payroll usa `greenhouse_payroll` schema con payroll_periods, payroll_entries, compensation_versions, bonus_config. El modelo de `members` para personas internas ya está integrado al Identity Profile vía `identity_profile_id` en `client_users` y `members`. |
| `Greenhouse_Capabilities_Architecture_v1.md` | Capabilities se resuelven a nivel Space (no Organization). Hoy la resolución usa `greenhouse_core.clients` (PostgreSQL) + datos de HubSpot. Con Account 360, migrará a `spaces` (tenant) como tenant context. |

### Schemas existentes a considerar

| Schema | Estado | Impacto Account 360 |
|---|---|---|
| `greenhouse_core` | Activo | Tablas base: `clients`, `client_users`, `members`, `identity_profiles`, `identity_profile_source_links`, `roles`, `user_role_assignments`, `spaces` (Notion), `assignments` |
| `greenhouse_finance` | Activo (5 phases) | income, expenses, accounts, suppliers, client_profiles, exchange_rates, cost_allocations, client_economics |
| `greenhouse_payroll` | Activo | payroll_periods, payroll_entries, compensation_versions, bonus_config |
| `greenhouse_crm` | Activo | contacts (con `linked_identity_profile_id` → identity_profiles), pipelines |
| `greenhouse_delivery` | Activo | Delivery/operations data |
| `greenhouse_serving` | Activo | Views materializadas: `person_360`, `client_labor_cost_allocation` |

---

## 2. Jerarquía de objetos

```
Organization (empresa cliente)
  │  EO-ORG-0001 (EO-ID canónico B2B)
  │  hubspot_company_id — vínculo a HubSpot
  │  Datos de la entidad: nombre legal, industria, país, logo, dominio
  │
  ├── Space 1 (tenant operativo — ej: "Sky Airline Chile")
  │     EO-SPC-0001
  │     Equipo asignado, configuración, herramientas
  │     └── Services[] (futuro — se montarán aquí cuando se implemente Services Architecture)
  │
  ├── Space 2 (tenant operativo — ej: "Sky Airline Perú")
  │     EO-SPC-0002
  │     Equipo diferente, configuración independiente
  │     └── Services[] (futuro)
  │
  └── Contact Persons[] (personas vinculadas a esta Organization)
        Cada una es un Identity Profile (EO-ID{NNNN}) en greenhouse_core.identity_profiles
        Con membership(s) en person_memberships que definen su relación con la org
```

### 2.1 ¿Cuándo una Organization tiene múltiples Spaces?

El caso por defecto es 1 Organization = 1 Space. La separación en múltiples Spaces aplica cuando:

- El cliente opera en países distintos con equipos y servicios independientes (Sky Chile vs Sky Perú)
- El cliente tiene unidades de negocio que requieren portales separados con datos aislados
- El cliente contrata líneas de servicio completamente distintas para divisiones internas (ej: Globe para marketing + Wave para el sitio web de otra división)

Si no hay razón de negocio para separar, un solo Space es correcto. La arquitectura soporta N pero no lo fuerza.

---

## 3. Capa 1: Organization

### 3.1 Definición

La Organization es la entidad jurídica/comercial del cliente. Es el objeto raíz B2B — el "Account" en terminología CRM. Toda relación comercial de Efeonce es con una Organization.

### 3.2 Tabla PostgreSQL: `greenhouse_core.organizations`

```sql
CREATE TABLE greenhouse_core.organizations (
  -- Identidad canónica
  id TEXT PRIMARY KEY,                                 -- TEXT PK (consistente con codebase: ej 'org-{uuid}')
  eo_id VARCHAR(20) UNIQUE NOT NULL,                   -- EO-ORG-XXXX (humano-legible, inmutable)
  slug VARCHAR(100) UNIQUE NOT NULL,                   -- URL-safe identifier (ej: 'sky-airline')

  -- Datos de la entidad
  legal_name VARCHAR(255) NOT NULL,                    -- Razón social
  display_name VARCHAR(255) NOT NULL,                  -- Nombre visible en Greenhouse
  tax_id VARCHAR(50),                                  -- RUT / NIT / RFC según país
  country VARCHAR(2) NOT NULL DEFAULT 'CL',            -- ISO 3166-1 alpha-2 (país principal)
  industry VARCHAR(100),                               -- Industria
  website VARCHAR(500),                                -- Sitio web
  logo_url VARCHAR(500),                               -- URL del logo (HS enrichment o manual)

  -- Dominios de email (para SSO auto-provisioning)
  email_domains TEXT[] DEFAULT '{}',                   -- ['skyairline.com', 'sky.cl']

  -- Vínculos externos
  hubspot_company_id VARCHAR(50) UNIQUE,               -- hs_object_id de HubSpot Company

  -- Clasificación comercial Efeonce
  linea_de_servicio VARCHAR(50),                       -- globe | efeonce_digital | reach | wave | crm_solutions
  lifecycle_stage VARCHAR(50) DEFAULT 'customer',      -- HubSpot lifecycle: subscriber → lead → ... → customer → evangelist
  account_tier VARCHAR(20) DEFAULT 'standard',         -- standard | premium | strategic

  -- Ownership Efeonce
  account_owner_user_id TEXT,                          -- FK a client_users.user_id (Account Lead de Efeonce)

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active',        -- active | suspended | churned | prospect

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  notes TEXT                                           -- Notas internas sobre la cuenta
);

-- Secuencia para EO-ID
CREATE SEQUENCE greenhouse_core.org_eo_id_seq START WITH 1;

-- Índices
CREATE INDEX idx_orgs_eo_id ON greenhouse_core.organizations(eo_id);
CREATE INDEX idx_orgs_hubspot ON greenhouse_core.organizations(hubspot_company_id);
CREATE INDEX idx_orgs_status ON greenhouse_core.organizations(status);
CREATE INDEX idx_orgs_linea ON greenhouse_core.organizations(linea_de_servicio);
CREATE INDEX idx_orgs_slug ON greenhouse_core.organizations(slug);
CREATE INDEX idx_orgs_account_owner ON greenhouse_core.organizations(account_owner_user_id);

-- Trigger updated_at
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON greenhouse_core.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Generación del EO-ID:** El `eo_id` se genera al insertar usando la secuencia:

```sql
-- Función helper para generar EO-IDs
CREATE OR REPLACE FUNCTION greenhouse_core.generate_eo_id(prefix TEXT, seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', 'greenhouse_core.' || seq_name) INTO next_val;
  RETURN prefix || LPAD(next_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Uso en INSERT:
INSERT INTO greenhouse_core.organizations (id, eo_id, slug, legal_name, display_name)
VALUES (
  'org-' || gen_random_uuid()::text,
  greenhouse_core.generate_eo_id('EO-ORG-', 'org_eo_id_seq'),
  'sky-airline',
  'Sky Airline SpA',
  'Sky Airline'
);
-- Resultado: eo_id = 'EO-ORG-0001'
```

**Nota sobre padding:** El LPAD con 4 dígitos soporta hasta 9999 registros. Si se necesita más, extender a 5 o 6 dígitos. La función es centralizada, así que el cambio es en un solo lugar.

### 3.3 Vistas contextuales de Organization

El mismo registro de Organization se proyecta diferente según el módulo que lo consulta:

| Módulo | Vista contextual | Datos que proyecta |
|---|---|---|
| **Admin** (`/admin/tenants`) | Configuración del account | Datos de la entidad, Spaces asociados, estado, ownership, email_domains, SSO config |
| **Comercial / CRM** (`/internal/clientes`) | Health del account | lifecycle_stage, account_tier, total revenue, services activos, deal pipeline, health score derivado |
| **Finanzas** (`/finance/clients`) | Perfil financiero | `greenhouse_finance.client_profiles` existente, condiciones de facturación, facturas asociadas (income), aging, revenue por período — **ya implementado** |
| **Operación** (`/internal/dashboard`) | Account operativo | Spaces con métricas ICO agregadas (RpA, OTD%), equipo asignado, capacidad utilizada, proyectos activos |
| **People** (`/people`) | Account como empleador externo | Contact persons vinculados (via `greenhouse_crm.contacts` + `person_memberships`), roles en el portal, actividad |

Cada vista es una **query diferente** que hace JOIN del mismo `organizations.id` con las tablas relevantes del módulo. No son tablas separadas — son proyecciones.

### 3.4 Relación con HubSpot Company

```
HubSpot Company (origen comercial)
  │ hs_object_id
  │ Propiedades: name, domain, industry, lifecycle, linea_de_servicio, etc.
  ↓
Inbound sync (polling diario 03:30 AM vía hubspot-bigquery — repo: github.com/cesargrowth11/hubspot-bigquery)
  ↓
BigQuery: hubspot_crm.companies (capa OLAP, analytics)
  ↓
PostgreSQL: greenhouse_core.organizations (capa OLTP, operativa)
  │ hubspot_company_id = hs_object_id
  │ Datos enriquecidos: tax_id, email_domains, account_tier, notes
  │ Datos derivados: account_owner (asignado en Greenhouse, no en HubSpot)
```

**Regla de sincronización:** HubSpot es origen para datos comerciales (`lifecycle_stage`, `linea_de_servicio`, `industry`). PostgreSQL es origen para datos operativos (`account_tier`, `email_domains`, `account_owner_user_id`, `notes`). Campos compartidos: HubSpot gana en caso de conflicto, con excepción de campos que solo existen en PostgreSQL.

---

## 4. Capa 2: Space (reformalización)

### 4.1 Definición

El Space es el **tenant operativo** — la unidad de aislamiento de datos en Greenhouse. Está referenciado en `Greenhouse_Services_Architecture_v1.md` como `spaces(id)`.

Un Space es donde:
- Vivirán los services contratados (cuando se implemente Services Architecture)
- Se asigna el equipo de Efeonce
- Se resuelven las capabilities y el sidebar
- Se filtran todos los queries client-facing (multi-tenant enforcement)
- Se configuran herramientas (Frame.io, Notion, etc.)

Hoy, el concepto de "Space" se cumple con `greenhouse_core.clients` en **PostgreSQL** (usado por todo el backend para session resolution, queries operativos, y tenant isolation) y `greenhouse.clients` en **BigQuery** (usado para analytics). Con Account 360, la nueva tabla `spaces` (tenant) en PostgreSQL reemplaza a ambos como la tabla canónica de tenant.

### 4.2 Conflicto con `greenhouse_core.spaces` existente

> **ATENCIÓN**: La tabla `greenhouse_core.spaces` **ya existe** en PostgreSQL con semántica de **Notion workspace**, no de tenant:
>
> ```sql
> -- Tabla EXISTENTE (Notion workspaces)
> greenhouse_core.spaces (
>   space_id TEXT PRIMARY KEY,     -- PK
>   client_id TEXT,                -- FK a clients
>   space_name TEXT,
>   space_type TEXT,               -- 'notion_workspace' etc.
>   notion_workspace_id TEXT,
>   ...
> )
> ```
>
> **Plan de resolución**: Renombrar la tabla existente a `greenhouse_core.notion_workspaces` antes de crear la nueva tabla `spaces` con semántica de tenant. La tabla existente tiene pocos registros y su semántica real es "Notion workspace", no "tenant operativo".
>
> **Migración del rename**:
> 1. `ALTER TABLE greenhouse_core.spaces RENAME TO greenhouse_core.notion_workspaces;`
> 2. Actualizar todas las references en el código (imports, queries) de `spaces` → `notion_workspaces`
> 3. Crear la nueva `greenhouse_core.spaces` con la definición de tenant de este documento
>
> **Alternativa segura**: Si el rename es riesgoso, nombrar la nueva tabla `greenhouse_core.tenant_spaces` y actualizar este documento en consecuencia.

### 4.3 Tabla PostgreSQL: `greenhouse_core.spaces` (tenant)

```sql
CREATE TABLE greenhouse_core.spaces (
  -- Identidad
  id TEXT PRIMARY KEY,                                 -- TEXT PK (ej: 'spc-{uuid}')
  eo_id VARCHAR(20) UNIQUE NOT NULL,                   -- EO-SPC-XXXX (humano-legible, inmutable)
  slug VARCHAR(100) UNIQUE NOT NULL,                   -- URL-safe (ej: 'sky-airline-cl')

  -- Jerarquía
  organization_id TEXT NOT NULL REFERENCES greenhouse_core.organizations(id),

  -- Datos del Space
  display_name VARCHAR(255) NOT NULL,                  -- Nombre visible (ej: "Sky Airline Chile")
  country VARCHAR(2),                                  -- País de operación del space (puede diferir de la org)
  timezone VARCHAR(50) DEFAULT 'America/Santiago',

  -- Capacidad contratada
  contracted_fte DECIMAL(5,2),                         -- FTE contratados (1 FTE = 160 hrs/mes)
  contracted_hours_monthly INT,                        -- Horas mensuales comprometidas (alternativa a FTE)

  -- Configuración de herramientas
  notion_workspace_url VARCHAR(500),
  frameio_space_url VARCHAR(500),
  figma_project_url VARCHAR(500),

  -- Vínculos legacy (migración desde greenhouse_core.clients)
  legacy_client_id VARCHAR(100),                       -- El viejo client_id de greenhouse_core.clients
  hubspot_company_id VARCHAR(50),                      -- Redundante con org, pero útil para queries directos

  -- Notion project IDs (qué proyectos de Notion pertenecen a este Space)
  notion_project_ids TEXT[] DEFAULT '{}',

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active',        -- active | suspended | archived

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Secuencia para EO-ID
CREATE SEQUENCE greenhouse_core.spc_eo_id_seq START WITH 1;

-- Índices
CREATE INDEX idx_spaces_eo_id ON greenhouse_core.spaces(eo_id);
CREATE INDEX idx_spaces_org ON greenhouse_core.spaces(organization_id);
CREATE INDEX idx_spaces_status ON greenhouse_core.spaces(status);
CREATE INDEX idx_spaces_slug ON greenhouse_core.spaces(slug);
CREATE INDEX idx_spaces_legacy ON greenhouse_core.spaces(legacy_client_id);
CREATE INDEX idx_spaces_hubspot ON greenhouse_core.spaces(hubspot_company_id);

-- Trigger updated_at
CREATE TRIGGER spaces_updated_at
  BEFORE UPDATE ON greenhouse_core.spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.4 Relación Organization → Space

```sql
-- Caso default: 1 org = 1 space
SELECT s.* FROM greenhouse_core.spaces s
WHERE s.organization_id = @org_id AND s.status = 'active';

-- Multi-space: misma org, múltiples spaces
-- Sky Airline (org) → Sky Chile (space) + Sky Perú (space)
```

### 4.5 Impacto en Services Architecture (futuro)

Cuando se implemente `Greenhouse_Services_Architecture_v1.md`, la tabla `services` hará:

- `services.space_id` → `greenhouse_core.spaces.id` (FK directa — la tabla ya existirá)
- Las capabilities se resolverán por services activos dentro de un Space
- El Space hereda `organization_id`, lo que permite agregar datos financieros a nivel Organization

**No hay trabajo de services en este documento.** Solo se asegura que `spaces` (tenant) exista como tabla canónica para que services pueda montarse encima.

### 4.6 Migración desde `greenhouse_core.clients` (PostgreSQL) y `greenhouse.clients` (BigQuery)

> **Importante**: `clients` existe en AMBOS stores:
> - **PostgreSQL**: `greenhouse_core.clients` — usado activamente por session resolution, tenant context, y todo el backend operativo
> - **BigQuery**: `efeonce-group.greenhouse.clients` — usado para analytics, dashboards OLAP
>
> La migración debe considerar ambos.

Cada registro actual en `greenhouse_core.clients` (PostgreSQL) se convierte en:

1. **Una Organization** (si no existe ya para ese `hubspot_company_id`)
2. **Un Space** (hijo de esa Organization, con `legacy_client_id` = el viejo `client_id`)

```sql
-- Script de migración conceptual (desde PostgreSQL, fuente primaria)
INSERT INTO greenhouse_core.organizations (id, eo_id, slug, legal_name, display_name, hubspot_company_id, status)
SELECT
  'org-' || gen_random_uuid()::text,
  greenhouse_core.generate_eo_id('EO-ORG-', 'org_eo_id_seq'),
  client_id AS slug,
  client_name AS legal_name,
  client_name AS display_name,
  hubspot_company_id,
  CASE WHEN active THEN 'active' ELSE 'suspended' END AS status
FROM greenhouse_core.clients
WHERE role = 'client';  -- Solo clientes, no admins

INSERT INTO greenhouse_core.spaces (id, eo_id, slug, organization_id, display_name, legacy_client_id, hubspot_company_id, notion_project_ids)
SELECT
  'spc-' || gen_random_uuid()::text,
  greenhouse_core.generate_eo_id('EO-SPC-', 'spc_eo_id_seq'),
  c.client_id AS slug,
  o.id AS organization_id,
  c.client_name AS display_name,
  c.client_id AS legacy_client_id,
  c.hubspot_company_id,
  c.notion_project_ids
FROM greenhouse_core.clients c
JOIN greenhouse_core.organizations o ON o.hubspot_company_id = c.hubspot_company_id
WHERE c.role = 'client';
```

---

## 5. Capa 3: Identity Profile unificado (personas)

### 5.1 Decisión de diseño: un solo Identity Profile para todos

No hay dos tipos de persona. Hay **un** Identity Profile (`identity_profile_id`) que puede tener múltiples **memberships**:

- Membership interna → collaborator de Efeonce (accede a `/my/*`, tiene nómina, permisos, etc.)
- Membership externa → contact person de una Organization cliente (accede a `/dashboard`, ve proyectos)
- Ambas simultáneamente → un freelancer que trabaja para Efeonce Y es contacto de un cliente

El discriminador no está en la persona, sino en la **membership**.

### 5.2 Tabla existente: `greenhouse_core.identity_profiles` (objeto canónico de persona)

> **Ya implementado.** La tabla `greenhouse_core.identity_profiles` **ya existe** y cumple el rol de Identity Profile universal. NO se crea una tabla nueva `persons`.

**Estado actual de `identity_profiles`:**

```sql
-- TABLA EXISTENTE — NO CREAR
greenhouse_core.identity_profiles (
  identity_profile_id TEXT PRIMARY KEY,    -- PK técnico (ej: 'ip-{uuid}')
  eo_id TEXT UNIQUE NOT NULL,              -- EO-ID{NNNN} (formato actual, ej: 'EO-ID0001')
  full_name TEXT NOT NULL,
  primary_email TEXT UNIQUE NOT NULL,
  secondary_emails TEXT[],
  phone TEXT,
  avatar_url TEXT,
  microsoft_oid TEXT,                      -- Azure AD Object ID
  google_sub TEXT,                         -- Google Subject ID
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabla hija existente:** `greenhouse_core.identity_profile_source_links` — tracking de fuentes (qué sistema originó o enriqueció el perfil).

**Campos a agregar** (si no existen):

```sql
-- Solo si no existen ya:
ALTER TABLE greenhouse_core.identity_profiles
  ADD COLUMN IF NOT EXISTS hubspot_contact_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_ip_hubspot ON greenhouse_core.identity_profiles(hubspot_contact_id);
```

**Nota sobre formato EO-ID**: El formato actual es `EO-ID{NNNN}` (sin guión entre ID y número, con llaves implícitas en la generación). Se mantiene este formato para personas. Los nuevos objetos (Organization, Space) usan el formato `EO-ORG-XXXX` / `EO-SPC-XXXX` con guión.

### 5.3 Tabla nueva: `greenhouse_core.person_memberships` (relaciones contextuales)

Las memberships conectan a una persona (identity profile) con una Organization y/o con Efeonce como empleador, definiendo el tipo de relación.

```sql
CREATE TABLE greenhouse_core.person_memberships (
  id TEXT PRIMARY KEY,                                 -- TEXT PK (ej: 'pm-{uuid}')

  -- La persona (FK a identity_profiles existente)
  identity_profile_id TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(identity_profile_id),

  -- El contexto
  membership_type VARCHAR(30) NOT NULL,                -- 'efeonce_collaborator' | 'client_contact'
  organization_id TEXT REFERENCES greenhouse_core.organizations(id), -- NULL si es efeonce_collaborator (la org es Efeonce implícita)

  -- Datos contextuales de la membership
  job_title VARCHAR(255),                              -- Cargo en la organización de contexto
  department VARCHAR(100),                             -- Departamento

  -- Para client_contact: scopes de acceso
  space_ids TEXT[] DEFAULT '{}',                       -- A qué Spaces de la org tiene acceso (vacío = todos)

  -- Para efeonce_collaborator: vínculo al member record
  member_id TEXT,                                      -- FK a greenhouse_core.members.member_id (datos HR: nómina, permisos, etc.)

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active',        -- active | suspended | ended
  start_date DATE,                                     -- Cuándo empezó la relación
  end_date DATE,                                       -- Cuándo terminó (NULL = vigente)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE (identity_profile_id, membership_type, organization_id)
);

-- Índices
CREATE INDEX idx_memberships_person ON greenhouse_core.person_memberships(identity_profile_id);
CREATE INDEX idx_memberships_org ON greenhouse_core.person_memberships(organization_id);
CREATE INDEX idx_memberships_type ON greenhouse_core.person_memberships(membership_type);
CREATE INDEX idx_memberships_status ON greenhouse_core.person_memberships(status);
```

### 5.4 Relación con tablas existentes

```
greenhouse_core.identity_profiles (Identity Profile canónico — YA EXISTE)
  │ identity_profile_id (TEXT PK)
  │ eo_id: EO-ID{NNNN}
  │
  ├── person_memberships (membership_type = 'efeonce_collaborator') — NUEVA
  │     └── member_id → greenhouse_core.members (YA EXISTE)
  │           Datos HR: compensation, leave_balances, attendance, reports_to
  │           Vista /my/* (self-service)
  │           Vista /hr/* (admin HR)
  │           Vista /people/* (directorio)
  │
  ├── person_memberships (membership_type = 'client_contact') — NUEVA
  │     └── organization_id → greenhouse_core.organizations (NUEVA)
  │           └── space_ids[] → acceso a Spaces específicos
  │           Vista /dashboard, /proyectos, /sprints (portal cliente)
  │           Vista /finance/clients (contacto de procurement)
  │
  ├── greenhouse_core.client_users (auth principal — login) — YA EXISTE
  │     user_id, identity_profile_id (FK ya existente), auth_mode, status
  │     La persona puede tener 0 o 1 client_users (no todo contact tiene login)
  │
  ├── greenhouse_crm.contacts — YA EXISTE
  │     linked_identity_profile_id → identity_profiles
  │     hubspot_contact_id → HubSpot Contact
  │     email, full_name, job_title
  │     (Puente HubSpot Contact ↔ Identity Profile ya resuelto)
  │
  └── greenhouse_core.identity_profile_source_links — YA EXISTE
        Tracking de fuentes que originaron/enriquecieron el perfil
```

### 5.5 Vistas contextuales de Person

| Módulo | Vista contextual | Datos que proyecta |
|---|---|---|
| **Portal cliente** (`/equipo`) | Team member card | full_name, avatar, job_title (de la membership), rol en el portal |
| **HR** (`/hr/*`) | Collaborator profile | Membership interna → member → compensation, leave, attendance, KPIs |
| **Finanzas** (`/finance/clients`) | Contacto de facturación | full_name, job_title, email — filtrado por membership de tipo client_contact con el tag `procurement` o `billing` |
| **People** (`/people`) | Perfil 360 interno | Todas las memberships visibles, assignments actuales, capacidad, herramientas. **Base existente: `greenhouse_serving.person_360`** |
| **Admin** (`/admin/users`) | User management | Auth principal, roles asignados, último login, SSO identities |
| **Operación** (`/internal/clientes/[id]`) | Account contacts | Contact persons de una Organization con sus roles y último acceso |

### 5.6 Personas que NO tienen login

No todo contact person necesita login en Greenhouse. Ejemplos:

- El CEO de una empresa cliente que aparece como firmante de contrato pero nunca entra al portal
- Un contacto de procurement que solo aparece en el perfil financiero
- Un stakeholder que recibe reportes pero no interactúa con el portal

Estas personas existen en `greenhouse_core.identity_profiles` con una `person_membership` activa, pero **no** tienen un registro en `greenhouse_core.client_users`. El login es opcional.

### 5.7 Vínculo con HubSpot Contacts

> **Ya resuelto parcialmente.** La tabla `greenhouse_crm.contacts` ya existe y vincula HubSpot Contacts a Identity Profiles via `linked_identity_profile_id`. La tabla `person_memberships` se alimenta de esta relación existente.

```
HubSpot Contact
  │ hs_object_id, email, firstname, lastname, jobtitle
  │ Asociado a una o más Companies
  ↓
Sync diario → BigQuery hubspot_crm.contacts (analytics)
  ↓
PostgreSQL greenhouse_crm.contacts (YA EXISTE)
  │ linked_identity_profile_id → identity_profiles (YA RESUELTO)
  │ hubspot_contact_id → HubSpot hs_object_id
  ↓
person_memberships (NUEVA — se crea a partir de la relación existente)
  │ Si el contact tiene Company asociada → crear membership 'client_contact'
  │ con organization_id correspondiente
```

Para enriquecer `identity_profiles` con el link directo a HubSpot:

```sql
ALTER TABLE greenhouse_core.identity_profiles ADD COLUMN IF NOT EXISTS hubspot_contact_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_ip_hubspot ON greenhouse_core.identity_profiles(hubspot_contact_id);
```

---

## 6. Refactoring de `client_users` (auth principal)

### 6.1 Estado actual

`greenhouse_core.client_users` hoy es la tabla de auth. Tiene `user_id`, `client_id`, `email`, **`identity_profile_id`** (FK a `identity_profiles` — **ya existe**), **`member_id`** (FK a `members` — **ya existe**), y los campos de SSO.

### 6.2 Evolución

Con el Account 360, `client_users` se simplifica a ser **solo** el auth principal — la entidad que puede hacer login. Los datos de la persona ya viven en `identity_profiles` (vinculados via `identity_profile_id` existente), y el contexto organizacional se mueve a `person_memberships`.

```sql
-- NO se necesita agregar person_id — identity_profile_id ya cumple este rol.
-- La resolución de tenant en el login ya no es por client_id directo,
-- sino: identity_profile_id → person_memberships → organization → spaces
```

### 6.3 Session resolution actualizada

El flujo de login (Identity Access V2, sección "Session resolution at login") se extiende:

1. Authenticate via NextAuth.js (Microsoft SSO, Google SSO, credentials)
2. Resolve `client_users` record por email o SSO identifier
3. Resolve `identity_profile_id` desde `client_users.identity_profile_id` (**campo ya existente**)
4. Load `person_memberships` activas para ese `identity_profile_id`
5. Derive contexto:
   - Si tiene membership `efeonce_collaborator` → resolver `member_id`, cargar roles internos
   - Si tiene membership `client_contact` → resolver `organization_id` + `space_ids`
   - Si tiene ambas → session lleva ambos contextos
6. Load `user_role_assignments` (sin cambio)
7. Derive `routeGroups` (sin cambio)
8. Determine `portalHomePath` (sin cambio)

### 6.4 Session payload extendida

```typescript
interface GreenhouseSession {
  // Auth (sin cambio)
  userId: string              // client_users.user_id

  // Identity 360 (usa campo existente)
  identityProfileId: string   // identity_profiles.identity_profile_id (ya existe en client_users)

  // Memberships (nuevo)
  memberships: {
    type: 'efeonce_collaborator' | 'client_contact'
    organizationId?: string   // para client_contact
    spaceIds?: string[]       // para client_contact con scope
    memberId?: string         // para efeonce_collaborator
  }[]

  // Tenant context (evolución de clientId)
  activeOrganizationId?: string  // org actual (para operadores que navegan entre orgs)
  activeSpaceId?: string         // space actual (reemplaza a activeClientId)

  // Roles y acceso (sin cambio)
  roleCodes: string[]
  routeGroups: string[]

  // Scopes (sin cambio)
  projectScopes?: string[]
  campaignScopes?: string[]
  clientScopes?: string[]

  // Derivados
  portalHomePath: string
  timezone: string
  featureFlags?: string[]
}
```

---

## 7. Vistas 360 completas

### 7.1 Organization 360 — Todas las vistas de un Account

Cuando un operador de Efeonce navega a `/internal/clientes/[orgSlug]`, ve la vista 360 del Account:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ORGANIZATION 360: Sky Airline                     EO-ORG-0003      │
│  Status: Active │ Tier: Strategic │ Since: Jan 2024                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ── Resumen ──                                                       │
│  Logo │ Nombre │ Industria │ País │ Account Owner │ Health Score     │
│                                                                       │
│  ── Spaces ──                                                        │
│  [EO-SPC-0005 Sky Chile] Active │ 2.5 FTE │ RpA 1.4 │ OTD 94%     │
│  [EO-SPC-0006 Sky Perú]  Onboarding │ 1.0 FTE                       │
│                                                                       │
│  ── Comercial ──  (datos de HubSpot)                                 │
│  Lifecycle: Customer │ 2 deals activos │ Pipeline value: $X          │
│  Línea: Globe                                                        │
│  ── Services ──  (futuro, cuando se implemente Services Architecture)│
│                                                                       │
│  ── Financiero ──  (datos de greenhouse_finance — YA IMPLEMENTADO)   │
│  Revenue YTD: $X │ Aging: 0-30d $X, 31-60d $X │ Condiciones: OC+HES│
│  P&L: Margen bruto X% │ Costo laboral: $X │ Client economics        │
│  Contactos de facturación: [EO-ID0012] [EO-ID0015]                  │
│                                                                       │
│  ── Personas ──  (contact persons via person_memberships)            │
│  [EO-ID0010 CMO] María López │ client_executive │ Last login: 2d    │
│  [EO-ID0011 Brand Mgr] Pedro Ruiz │ client_manager │ Last: today    │
│  [EO-ID0012 Coord] Ana Torres │ client_specialist │ Scope: 2 proy   │
│  [EO-ID0015 CFO] Juan Soto │ No login │ Contacto de procurement     │
│                                                                       │
│  ── Operación ──  (métricas ICO agregadas desde Notion)              │
│  RpA promedio: 1.4 │ OTD%: 94% │ Cycle Time: 5.2d                   │
│  Proyectos activos: 4 │ Tareas en curso: 23 │ Open comments: 7      │
│                                                                       │
│  ── Timeline ──  (actividad reciente cross-módulo)                   │
│  Hoy: Pedro Ruiz revisó 3 assets en Frame.io                        │
│  Ayer: Nuevo proyecto creado en Notion                               │
│  Hace 3d: María López accedió al portal por primera vez              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

Cada sección es un componente que hace su propio query — no es una mega-query que trae todo.

### 7.2 Person 360 — Todas las vistas de una persona

> **Base existente:** `greenhouse_serving.person_360` ya es una view materializada que resuelve identity_profiles + members + client_users + crm.contacts con datos HR, assignments y herramientas. Con Account 360 se **extiende** (no se crea desde cero) para incluir `person_memberships`.

Cuando un operador navega a `/people/[identityProfileId]`, ve la vista 360:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PERSON 360: María López                           EO-ID0010        │
│  Status: Active                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ── Identidad ──  (desde identity_profiles)                          │
│  Email: maria@skyairline.com │ SSO: Microsoft (linked)               │
│  Avatar │ Phone │ Secondary emails                                   │
│                                                                       │
│  ── Memberships ──  (desde person_memberships — NUEVO)               │
│  [client_contact] Sky Airline (EO-ORG-0003) → Space: Sky Chile       │
│    Cargo: CMO │ Rol portal: client_executive                         │
│    Acceso: todos los proyectos │ Último login: 2d ago                │
│                                                                       │
│  ── CRM ──  (desde greenhouse_crm.contacts — YA EXISTE)             │
│  HubSpot Contact ID: 12345 │ Last activity: 5d ago                   │
│                                                                       │
│  ── Portal activity ──  (si tiene login)                             │
│  Sesiones este mes: 12 │ Páginas más visitadas: Dashboard, Proyectos│
│  Última acción: Revisó asset "KV Campaña Q2" en Frame.io             │
│                                                                       │
│  ── Financiero ──  (si es contacto de facturación)                   │
│  Tagged como: Aprobador de OC │ Facturas aprobadas: 5 este quarter   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

Para una persona interna de Efeonce, la vista 360 agrega las secciones de HR (ya existentes en `greenhouse_serving.person_360`):

```
│  ── Membership: Efeonce Collaborator ──                              │
│  EO-MBR-0007 │ Cargo: Senior Designer                               │
│                                                                       │
│  ── HR ──  (desde members + payroll — YA IMPLEMENTADO)               │
│  Compensación: ... │ Tipo contrato: ... │ País: CL                   │
│  Permisos disponibles: 12d │ Asistencia este mes: 95%                │
│                                                                       │
│  ── Finanzas persona ──  (PersonFinanceTab — YA IMPLEMENTADO)        │
│  Spaces asignados: 2 │ Costo laboral: $X │ Nóminas procesadas: 6    │
│  Distribución: Sky Chile (60%), BeFUN (40%)                          │
│                                                                       │
│  ── Performance ──                                                   │
│  KPIs: OTD 96% │ RpA 1.2 │ Tareas completadas: 45 este mes         │
│  Assignments: Sky Chile (EO-SPC-0005, 60%), BeFUN (EO-SPC-0008, 40%)│
│                                                                       │
│  ── Herramientas ──                                                  │
│  Figma (license active) │ Adobe CC (license active) │ ChatGPT (Pro) │
```

---

## 8. Queries de ejemplo

### 8.1 Organization 360 — Vista comercial

```sql
-- Datos del account + spaces activos
SELECT
  o.id AS org_id,
  o.eo_id AS org_eo_id,
  o.display_name,
  o.linea_de_servicio,
  o.lifecycle_stage,
  o.account_tier,
  s.id AS space_id,
  s.eo_id AS space_eo_id,
  s.display_name AS space_name,
  s.country AS space_country,
  s.contracted_fte,
  s.contracted_hours_monthly
FROM greenhouse_core.organizations o
JOIN greenhouse_core.spaces s ON s.organization_id = o.id AND s.status = 'active'
WHERE o.slug = @org_slug;

-- Cuando Services se implemente, se agrega:
-- LEFT JOIN greenhouse_core.services srv ON srv.space_id = s.id
--   AND srv.pipeline_stage IN ('onboarding','active','renewal_pending','paused')
```

### 8.2 Contact persons de una Organization

```sql
-- Todas las personas vinculadas a una org, con su auth status
SELECT
  ip.identity_profile_id,
  ip.eo_id AS person_eo_id,
  ip.full_name,
  ip.primary_email,
  ip.avatar_url,
  pm.job_title,
  pm.space_ids,
  pm.status AS membership_status,
  cu.user_id IS NOT NULL AS has_login,
  cu.status AS auth_status,
  ura.role_codes
FROM greenhouse_core.identity_profiles ip
JOIN greenhouse_core.person_memberships pm ON pm.identity_profile_id = ip.identity_profile_id
  AND pm.membership_type = 'client_contact'
  AND pm.organization_id = @org_id
  AND pm.status = 'active'
LEFT JOIN greenhouse_core.client_users cu ON cu.identity_profile_id = ip.identity_profile_id AND cu.status = 'active'
LEFT JOIN LATERAL (
  SELECT ARRAY_AGG(r.role_code) AS role_codes
  FROM greenhouse_core.user_role_assignments ura2
  JOIN greenhouse_core.roles r ON r.id = ura2.role_id
  WHERE ura2.user_id = cu.user_id AND ura2.active = true
) ura ON true
ORDER BY ip.full_name;
```

### 8.3 Person 360 — Todas las memberships

```sql
-- Todas las memberships de una persona (internas y externas)
SELECT
  pm.membership_type,
  pm.job_title,
  pm.status,
  pm.start_date,
  o.display_name AS organization_name,
  o.slug AS organization_slug,
  m.member_id,
  m.reports_to_member_id
FROM greenhouse_core.person_memberships pm
LEFT JOIN greenhouse_core.organizations o ON o.id = pm.organization_id
LEFT JOIN greenhouse_core.members m ON m.member_id = pm.member_id
WHERE pm.identity_profile_id = @identity_profile_id;
```

### 8.4 Resolver persona multi-membership (caso borde)

```sql
-- Persona que es collaborator de Efeonce Y contacto de Sky Airline
SELECT
  ip.full_name,
  pm.membership_type,
  CASE pm.membership_type
    WHEN 'efeonce_collaborator' THEN 'Efeonce Group'
    WHEN 'client_contact' THEN o.display_name
  END AS context_org,
  pm.job_title
FROM greenhouse_core.identity_profiles ip
JOIN greenhouse_core.person_memberships pm ON pm.identity_profile_id = ip.identity_profile_id AND pm.status = 'active'
LEFT JOIN greenhouse_core.organizations o ON o.id = pm.organization_id
WHERE ip.primary_email = 'freelancer@example.com';

-- Resultado:
-- | María García | efeonce_collaborator | Efeonce Group    | Motion Designer     |
-- | María García | client_contact       | Sky Airline       | Creative Consultant |
```

### 8.5 Organization 360 — Vista financiera (datos existentes)

```sql
-- Revenue y economics de una org (usando greenhouse_finance ya implementado)
SELECT
  cp.client_profile_id,
  cp.display_name,
  COALESCE(SUM(i.total_amount_clp), 0) AS total_revenue_clp,
  COUNT(DISTINCT i.income_id) AS invoice_count,
  ce.gross_margin_percent,
  ce.net_margin_percent,
  ce.headcount_fte
FROM greenhouse_finance.client_profiles cp
LEFT JOIN greenhouse_finance.income i ON i.client_profile_id = cp.client_profile_id
LEFT JOIN greenhouse_finance.client_economics ce ON ce.client_id = cp.client_profile_id
  AND ce.period_year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND ce.period_month = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE cp.client_profile_id IN (
  SELECT legacy_client_id FROM greenhouse_core.spaces
  WHERE organization_id = @org_id
)
GROUP BY cp.client_profile_id, cp.display_name, ce.gross_margin_percent, ce.net_margin_percent, ce.headcount_fte;
```

---

## 9. Migración

### 9.1 Orden de migración

La migración es incremental y no rompe nada en cada fase:

**Fase M0: Preparación y creación de tablas (sin romper nada)**

1. Renombrar `greenhouse_core.spaces` → `greenhouse_core.notion_workspaces` (Notion workspace data)
2. Actualizar código que referencia `greenhouse_core.spaces` existente → `notion_workspaces`
3. Crear `greenhouse_core.organizations` (nueva)
4. Crear `greenhouse_core.spaces` (nueva — tenant operativo, con la definición de §4.3)
5. Crear `greenhouse_core.person_memberships` (nueva)
6. **NO crear `persons`** — `identity_profiles` ya existe

**Fase M1: Poblar con data existente**

7. Poblar `organizations` desde `greenhouse_core.clients` (PostgreSQL, fuente primaria) + enriquecer con `hubspot_crm.companies` (BigQuery)
8. Poblar `spaces` (tenant) desde `greenhouse_core.clients` (1 space por client)
9. Poblar `person_memberships`:
   - Para cada `client_users` con `tenant_type = 'efeonce_internal'` que tiene `identity_profile_id` → membership `efeonce_collaborator` con `member_id` del client_users
   - Para cada `client_users` con `tenant_type = 'client'` que tiene `identity_profile_id` → membership `client_contact` con `organization_id` resuelto via `client_id` → `spaces.legacy_client_id` → `spaces.organization_id`
   - Para `greenhouse_crm.contacts` con `linked_identity_profile_id` que no tienen `client_users` → membership `client_contact` (personas sin login)
10. Agregar `hubspot_contact_id` a `identity_profiles` (ALTER TABLE)

**Fase M2: Actualizar session resolution**

11. Session resolution lee `identity_profiles` + `person_memberships` además de `client_users`
12. Session payload incluye `identityProfileId` y `memberships[]`
13. `activeSpaceId` coexiste con `activeClientId` en la session (backwards compatible)

**Fase M3: Extender vistas 360**

14. Implementar Organization 360 view en `/internal/clientes/[orgSlug]`
15. Extender `greenhouse_serving.person_360` (**ya existe**) para incluir person_memberships externas
16. Conectar Financial Module existente a `organization_id` via `spaces.legacy_client_id` → `fin_client_profiles.client_profile_id`

**Fase M4: Deprecar legacy**

17. Queries que hoy leen `greenhouse_core.clients` (PostgreSQL) migran a `organizations` + `spaces`
18. Queries que leen `greenhouse.clients` (BigQuery) migran gradualmente
19. Campo `role` en `greenhouse.clients` (BigQuery) se depreca → roles en `user_role_assignments` (PostgreSQL)
20. `greenhouse.clients` (BigQuery) se mantiene como tabla read-only para compatibilidad analítica
21. ETL nocturno sincroniza PostgreSQL `organizations` + `spaces` → BigQuery

### 9.2 Compatibilidad durante transición

| Componente actual | Comportamiento durante migración |
|---|---|
| `greenhouse_core.clients` (PostgreSQL) | Se mantiene funcional. Nuevas escrituras van a `organizations` + `spaces`. Migration period: ambas tablas coexisten. |
| `greenhouse.clients` (BigQuery) | Se mantiene read-only. ETL nocturno sincroniza desde PostgreSQL. |
| `session.user.clientId` | Se mantiene como alias de `activeSpaceId` hasta que todos los consumers migren. |
| `client_users.client_id` | Se mantiene funcional. `client_id` ahora apunta al Space (que fue el tenant desde el principio). |
| `client_users.identity_profile_id` | **Ya existe.** Se usa como puente a `person_memberships`. No se agrega `person_id`. |
| `greenhouse_crm.contacts.linked_identity_profile_id` | **Ya existe.** Se usa para poblar `person_memberships` iniciales. |
| `greenhouse_serving.person_360` | **Ya existe.** Se extiende con JOIN a `person_memberships`. |
| `greenhouse_finance.*` | **Ya implementado.** Se vincula a `organizations` via `spaces.legacy_client_id`. |
| Capabilities resolution | Funciona igual — `services.space_id` no cambia de semántica. |
| Multi-tenant query filters | `WHERE space_id = @activeSpaceId` (renaming conceptual, misma lógica). |

---

## 10. Diagrama de relaciones completo

```
                    ┌──────────────────┐
                    │  HubSpot Company │
                    │  (origen comercial) │
                    └────────┬─────────┘
                             │ hubspot_company_id
                             ▼
                    ┌──────────────────┐
                    │  ORGANIZATION    │  ← NUEVA
                    │  (greenhouse_core) │
                    │  EO-ORG-XXXX     │
                    │  id (TEXT) ← PK  │
                    │  slug, legal_name │
                    │  display_name    │
                    │  linea_de_servicio│
                    │  account_tier    │
                    └──┬───────────┬───┘
                       │           │
          ┌────────────┘           └────────────┐
          │ 1:N                                  │ via person_memberships
          ▼                                      │
┌──────────────────┐                            │
│   SPACE (tenant) │  ← NUEVA                   │
│  EO-SPC-XXXX     │  (reemplaza a              │
│  (tenant operativo) │ greenhouse_core.clients) │
│  id (TEXT)       │                            │
│  organization_id │                            │
│  display_name    │                            │
│  contracted_fte  │                            │
│  legacy_client_id│                            │
└──┬───────┬───┬───┘                            │
   │       │   │                                │
   │ 1:N   │   │ via legacy_client_id           │
   │(futuro)│  │                                │
   ▼       │  ▼                                 │
┌────────┐ │ ┌─────────────────────┐            │
│SERVICES│ │ │ greenhouse_finance  │            │
│(futuro)│ │ │ (YA IMPLEMENTADO)   │            │
│space_id│ │ │ client_profiles     │            │
└────────┘ │ │ income, expenses    │            │
           │ │ client_economics    │            │
           │ │ payroll (via schema)│            │
           │ └─────────────────────┘            │
           │                                    │
           ▼                                    │
   ┌───────────────┐                            │
   │ client_users  │  ← YA EXISTE              │
   │ (auth login)  │                            │
   │ identity_profile_id ──┐  (FK ya existente) │
   └───────────────┘       │                    │
                           ▼                    │
              ┌──────────────────────┐          │
              │ IDENTITY_PROFILES    │  ← YA EXISTE
              │  EO-ID{NNNN}        │          │
              │  (Identity Profile)  │          │
              │  identity_profile_id │          │
              │  full_name, email    │          │
              │  SSO identities      │          │
              └──┬──────────┬───────┘          │
                 │          │                   │
                 │ 1:N      │ linked via        │
                 │          │ linked_identity_  │
                 │          │ profile_id        │
                 ▼          ▼                   │
   ┌─────────────────┐  ┌──────────────┐       │
   │PERSON_MEMBERSHIPS│  │greenhouse_crm│       │
   │  ← NUEVA        │  │.contacts     │       │
   │identity_profile_id│ │(YA EXISTE)   │       │
   │membership_type   │  │hubspot_      │       │
   │organization_id ──────────────────────────┘
   │member_id (si int)│  │contact_id    │
   │space_ids[] (scope)│ └──────────────┘
   └──────┬───────────┘
          │
  ┌───────┴───────┐
  │               │
efeonce_       client_
collaborator   contact
  │               │
  ▼               ▼
┌──────────┐   Acceso al portal
│ MEMBERS  │   del cliente
│(YA EXISTE)│  (proyectos, KPIs)
│ (HR data)│
│ payroll  │
│ leave    │
│ KPIs     │
└──────────┘
```

---

## 11. Reglas no negociables

1. **Un humano = un `identity_profiles.identity_profile_id`.** Nunca crear registros duplicados para la misma persona. Resolver por email primero, luego por SSO identifiers. Reutilizar la tabla `identity_profiles` existente.

2. **Organization es inmutable en su identidad.** El `slug` y `hubspot_company_id` no cambian una vez asignados. Los datos de la entidad (nombre, industria) pueden actualizarse.

3. **Space es el boundary de tenant.** Todo query client-facing filtra por `space_id`, no por `organization_id`. La Organization es contexto comercial; el Space es contexto operativo.

4. **Memberships son el vínculo, no campos en la persona.** Una persona no "es" interna o externa — tiene memberships que pueden cambiar. Un freelancer puede tener ambas memberships activas simultáneamente.

5. **Login es opcional.** No toda persona necesita `client_users`. Las personas sin login existen en el sistema como contact persons visibles en las vistas 360.

6. **HubSpot es origen comercial, PostgreSQL es origen operativo.** Para datos que existen en ambos, HubSpot gana en datos comerciales (lifecycle, industry). PostgreSQL gana en datos operativos (account_tier, email_domains, assignments).

7. **BigQuery es capa OLAP, nunca OLTP.** Las tablas `greenhouse.clients` y `hubspot_crm.*` son para analytics. Las tablas canónicas viven en PostgreSQL y se replican a BigQuery vía ETL nocturno.

8. **Las vistas 360 son composiciones de queries, no tablas.** No hay una tabla `organization_360` — hay queries que componen la vista. `greenhouse_serving.person_360` ya existe como view materializada y se extiende, no se recrea.

9. **La migración es aditiva.** Primero crear las tablas nuevas y poblarlas. Luego redirigir los consumers. Nunca borrar las tablas legacy hasta que todos los consumers hayan migrado.

10. **El patrón 360 es simétrico.** Todo lo que se puede hacer con Organization 360 (vistas contextuales por módulo) se puede hacer con Person 360 y con Space 360. El patrón es: objeto canónico + queries contextuales por módulo.

11. **Reutilizar antes de crear.** Antes de proponer una tabla nueva, verificar que no exista una estructura equivalente. `identity_profiles` ya existe para personas. `greenhouse_crm.contacts` ya resuelve el vínculo HubSpot. `greenhouse_serving.person_360` ya compone la vista 360 de personas.

---

## 12. Impacto en documentos existentes

| Documento | Cambio requerido |
|---|---|
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Agregar `identityProfileId` (ya existe en session como campo) y `memberships[]` al session payload. Actualizar session resolution con paso de identity_profiles/memberships. Renaming `activeClientId` → `activeSpaceId`. |
| `Greenhouse_Services_Architecture_v1.md` | **No implementado aún.** Cuando se implemente, `services.space_id` hará FK a `greenhouse_core.spaces.id` (tabla tenant creada por Account 360). Agregar `organization_id` en el contexto de queries agregados. |
| `CODEX_TASK_Financial_Module.md` | **YA IMPLEMENTADO.** El módulo financiero usa `greenhouse_finance` schema con `client_profile_id` como FK en income/expenses. La migración vincula `client_profile_id` a `organization_id` via `spaces.legacy_client_id`. No requiere cambio de schema financiero — solo agregar queries de bridge. |
| `CODEX_TASK_Financial_Intelligence_Layer.md` | **YA IMPLEMENTADO (Phases 1-5).** Client economics ya calcula margen por cliente. Con Account 360, "margen por cliente" se agrega a nivel Organization via `spaces.organization_id`. El dashboard P&L con payroll integration + USD→CLP ya funciona. |
| `CODEX_TASK_Client_Dashboard_Redesign.md` | Sección "Tu equipo" se alimentará de `person_memberships` de tipo `client_contact` + equipo Efeonce asignado al Space. |
| `Greenhouse_Capabilities_Architecture_v1.md` | Capabilities se resuelven a nivel Space (sin cambio semántico). El `client_id` actual en las queries se reemplaza por `space_id` del tenant. |
| `CODEX_TASK_Admin_Team_Module_v2.md` | Admin de usuarios ahora crea/gestiona `identity_profiles` + `person_memberships`, no solo `client_users`. |
| `CODEX_TASK_HR_Payroll_Module_v2.md` | **YA IMPLEMENTADO.** Payroll entries vinculados a members via `member_id`. La relación member → identity_profile ya existe. Person memberships agrega contexto organizacional. |

---

## 13. Roadmap de implementación

| Fase | Entregable | Estimado | Dependencias |
|---|---|---|---|
| **M0** | Renombrar `spaces` existente → `notion_workspaces` + actualizar código | 1 día | Inventario de references a `spaces` en código |
| **M0** | DDL: `organizations`, `spaces` (tenant), `person_memberships` | 0.5 día | Rename completado |
| **M0** | Índices, triggers, función `generate_eo_id` | 0.5 día | DDL completo |
| **M1** | Script de migración: `greenhouse_core.clients` → `organizations` + `spaces` | 1 día | M0 |
| **M1** | Script de migración: `client_users` + `crm.contacts` → `person_memberships` | 1.5 días | M0 + identity_profiles existente |
| **M1** | ALTER `identity_profiles` con `hubspot_contact_id` | 0.5 día | M1 memberships poblado |
| **M2** | Session resolution extendida (identity_profiles + memberships) | 1.5 días | M1 completo |
| **M2** | Session payload con `identityProfileId`, `memberships[]`, `activeSpaceId` | 1 día | M2 session |
| **M3** | Organization 360 view (`/internal/clientes/[orgSlug]`) | 2 días | M2 completo |
| **M3** | Extender `greenhouse_serving.person_360` con memberships externas | 1 día | M2 completo |
| **M3** | Bridge queries: Financial Module → `organization_id` via `legacy_client_id` | 1 día | M1 orgs/spaces pobladas |
| **M4** | Deprecar `greenhouse_core.clients` como fuente OLTP | 1 día | M3 todas las vistas migradas |
| **M4** | ETL: PostgreSQL `organizations` + `spaces` → BigQuery | 1 día | M4 deprecación |

**Infraestructura (M0):** ~2 días (incluye rename de spaces existente)
**Migración de datos (M1):** ~3 días
**Session y auth (M2):** ~2.5 días
**Vistas 360 (M3):** ~4 días (reducido porque person_360 y finance ya existen)
**Cleanup y ETL (M4):** ~2 días
**Total estimado:** ~13.5 días

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
