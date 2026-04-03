# Greenhouse Portal — Modelo Account 360

> Versión: 2.1
> Fecha: 2026-04-02

---

## Visión general

Account 360 redefine cómo Greenhouse estructura las relaciones B2B. Introduce un modelo jerárquico de tres niveles — Organizations, Spaces, Person Memberships — que reemplaza la relación plana `clients` con un modelo canónico compatible con la identidad unificada Person 360 y la gobernanza financiera dual-store.

El modelo soporta tres poblaciones demográficas distintas:
- **Población A**: Colaboradores internos Efeonce (asignaciones internas)
- **Población B**: Personas de clientes (contactos externos)
- **Población C**: Contactos proveedores (relaciones vendor)

Cada población tiene su propio grafo: operativo (team_assignments) y estructural (person_memberships).

**Lib**: `src/lib/account-360/`
**API**: `/api/organizations/*`
**UI**: `src/views/greenhouse/organizations/`
**Almacenamiento**: PostgreSQL (`greenhouse_core`)

---

## Modelo de objetos

```
Organization (EO-ORG-*)
│  Entidad jurídica: cliente, proveedor, o ambos
│  Identidad VK: HubSpot Company (hubspot_company_id)
│  Datos: legal_name, tax_id (RUT/RFC/EIN/VAT), industry, country
│
├── Space (EO-SPC-*) — 1:N por Organization
│   │  Espacio operativo (tenant, contrato)
│   │  Bridge legacy: client_id → clients table
│   │  Identidad: notion DB IDs (proyectos, tareas, sprints)
│   │
│   ├── space_notion_sources[]
│   │   ├── notion_projects_db_id
│   │   ├── notion_tasks_db_id
│   │   ├── notion_sprints_db_id
│   │   ├── notion_reviews_db_id (opcional)
│   │   ├── sync_enabled (BOOLEAN)
│   │   └── sync_frequency (ENUM: hourly, daily, weekly)
│   │
│   ├── services[] (EO-SVC-*)
│   │   ├── service_id, public_id
│   │   ├── name, description
│   │   ├── pipeline_stage (prospecting/negotiation/active/completed)
│   │   ├── linea_de_servicio (categoría de negocio)
│   │   ├── servicio_especifico (subtipo)
│   │   ├── modalidad (full-time, project, retainer)
│   │   ├── billing_frequency (monthly, quarterly, annual)
│   │   ├── country, total_cost, currency
│   │   ├── hubspot_deal_id (VK)
│   │   ├── notion_project_id (opcional)
│   │   └── service_history (change tracking campo por campo)
│   │
│   └── (client_users, capabilities vía client_id bridge)
│
└── Person Memberships (EO-MBR-*) — N:M Organization ↔ Identity Profile
    │  Vínculo semántico entre persona canónica y organización
    │  Scoped opcionalmente a un Space (multi-space per org)
    │
    ├── identity_profile (EO-ID*) → Person 360
    ├── membership_type (employee, contractor, advisor, vendor_contact, customer_contact)
    ├── role_label (CTO, Account Manager, etc)
    ├── department (Engineering, Sales, Finance, etc)
    ├── is_primary (BOOLEAN: membresía principal de la persona)
    └── Bridge legacy: client_id (nullable)
```

---

## Módulos de Lib

### `organization-store.ts`
CRUD para organizaciones:

**Tipos principales**:
```typescript
interface OrganizationListItem {
  organization_id: UUID;
  public_id: string; // EO-ORG-NNNN
  organization_name: string;
  organization_type: 'client' | 'supplier' | 'both';
  country: string;
  space_count: number;
  person_count: number;
}

interface OrganizationDetail {
  organization_id: UUID;
  public_id: string;
  organization_name: string;
  legal_name: string;
  tax_id: string;
  tax_id_type: string;
  industry: string;
  country: string;
  hubspot_company_id: string;
  spaces: SpaceDetail[];
  people: PersonMembershipDetail[];
  status: 'active' | 'inactive';
  created_at: TimestampTZ;
  updated_at: TimestampTZ;
}

interface CreateMembershipInput {
  organization_id: UUID;
  profile_id: UUID; // identity_profiles
  space_id?: UUID; // opcional
  membership_type: string;
  role_label?: string;
  department?: string;
  is_primary: boolean;
}
```

**Funciones**:
- `listOrganizations(filters, pagination)` → `OrganizationListItem[]`
- `getOrganization(orgId)` → `OrganizationDetail`
- `createOrganization(data)` → `organization_id`
- `updateOrganization(orgId, patch)` → `OrganizationDetail`
- `deleteOrganization(orgId)` — Marca como inactive (soft-delete)

### `organization-identity.ts`
Resolución de identidad operativa de la entidad y lookup de tax ID:

**Funciones**:
- `findOrganizationByTaxId(taxId)` → `{ organization_id, organization_type, country }` — Busca por tax ID normalizado. Soporta RUT (Chile), RFC (México), EIN (USA), VAT (EU).
- `ensureOrganizationForSupplier(supplierData)` → `organization_id` — Patrón find-or-create:
  1. Busca por tax_id normalizado
  2. Si existe como `client`, upgradea a `both`
  3. Si no existe, crea nueva organización tipo `supplier`
  4. Retorna `organization_id`
- `resolveOrganizationForClient(clientId)` → `organization_id` — Resuelve org para income records:
  1. Busca space por `client_id` legacy
  2. Si space tiene `organization_id`, lo retorna
  3. Si no, crea organización y vincula con space
- `normalizeTaxId(rawTaxId, country)` → string — Normaliza formato según país

### `organization-economics.ts`
Métricas económicas y snapshots financieros para organizaciones:

**Funciones**:
- `getOrganizationEconomics(organizationId, year, month)` → `EconomicsSnapshot` — Agregado financiero (ingresos, gastos, margen) por org
- `getOrganizationRun(organizationId)` → `RunSummary` — KPIs de margen operativo y velocity
- `getOrganizationProjectEconomics(organizationId)` → `ProjectEconomics[]` — Desglose por proyecto/service dentro de org

**Integración con Finance**:
- Lee de `fin_income`, `fin_expenses` (ambos pivotean hacia `organization_id` vía space)
- Combina con ICO Engine para cost-per-task

### `operating-entity-membership.ts`
Definiciones de tipo de membresía y relaciones de entidad:

**Enumeración `membership_type`**:
- `employee` — Persona Población A (interna Efeonce)
- `contractor` — Persona Población A (consultor)
- `advisor` — Persona Población A (advisory role)
- `customer_contact` — Persona Población B (cliente)
- `vendor_contact` — Persona Población C (proveedor)

Cada tipo mapea a políticas de acceso, visibilidad y gobernanza diferente.

### `organization-executive.ts`
Roles ejecutivos y responsabilidades:

**Funciones**:
- `getOrganizationExecutive(organizationId)` → `ExecutiveProfile` — CxO/leadership roles con contact info
- `setOrganizationExecutive(organizationId, personId, role)` — Asigna persona a rol ejecutivo
- `listOrganizationLeadership(organizationId)` → `ExecutiveProfile[]` — Equipo directivo

### `organization-projects.ts`
Asociaciones de proyectos con organizaciones:

**Funciones**:
- `getOrganizationProjects(organizationId)` → `ProjectAssociation[]` — Proyectos activos bajo org
- `getOrganizationServices(organizationId)` → `Service[]` — Servicios (EO-SVC-*) contratados
- Integración con ICO Engine para métricas de delivery por org

### `id-generation.ts`
Generadores de IDs canónicos:

```typescript
function generateOrganizationId(): string {
  // org-{uuid}
}

function generateSpaceId(): string {
  // spc-{uuid}
}

function generateMembershipId(): string {
  // mbr-{uuid}
}

function generateServiceId(): string {
  // svc-{uuid}
}

function nextPublicId(prefix: string): string {
  // EO-prefixed sequential IDs
  // Ejemplo: nextPublicId('EO-ORG') → 'EO-ORG-0001'
  // nextPublicId('EO-SPC') → 'EO-SPC-0045'
  // Usa secuencias PostgreSQL (SERIAL, BIGSERIAL)
}
```

### `membership-types.ts`
Enumeraciones y mapeos de tipo de membresía:

```typescript
enum MembershipType {
  EMPLOYEE = 'employee',
  CONTRACTOR = 'contractor',
  ADVISOR = 'advisor',
  CUSTOMER_CONTACT = 'customer_contact',
  VENDOR_CONTACT = 'vendor_contact',
}

const MEMBERSHIP_TYPE_LABELS = {
  employee: 'Empleado',
  contractor: 'Contratista',
  advisor: 'Asesor',
  customer_contact: 'Contacto Cliente',
  vendor_contact: 'Contacto Proveedor',
};

const POPULATION_BY_MEMBERSHIP_TYPE = {
  employee: 'A',
  contractor: 'A',
  advisor: 'A',
  customer_contact: 'B',
  vendor_contact: 'C',
};
```

### `get-organization-operational-serving.ts`
Contexto operativo per organización:

**Funciones**:
- `getOrganizationOperationalContext(organizationId)` → `OperationalContext` — Espacio operativo activo, modo de entrada de datos (Notion / manual), status de sync
- `getOrganizationServingGaps(organizationId)` → `ServingGap[]` — Huecos en cobertura de datos (ej: space sin Notion DB IDs configuradas)

---

## Tablas PostgreSQL (`greenhouse_core`)

### `organizations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `organization_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-ORG-NNNN` (secuencia inmutable) |
| `organization_name` | VARCHAR | Nombre comercial |
| `legal_name` | VARCHAR | Razón social |
| `organization_type` | VARCHAR | `client`, `supplier`, `both` |
| `tax_id` | VARCHAR | RUT, RFC, EIN, VAT |
| `tax_id_type` | VARCHAR | Tipo de ID fiscal (ej: 'RUT', 'RFC') |
| `industry` | VARCHAR | Industria (NAICS / SIC) |
| `country` | VARCHAR | ISO 3166-1 (ej: 'CL', 'MX', 'US') |
| `hubspot_company_id` | VARCHAR | FK HubSpot (VK para bidirectional sync) |
| `notes` | TEXT | Notas internas |
| `status` | VARCHAR | `active`, `inactive` |
| `active` | BOOLEAN | Flag de actividad |
| `created_at` | TIMESTAMPTZ | Timestamp creación |
| `updated_at` | TIMESTAMPTZ | Timestamp última modificación |

**Índices**:
- `UNIQUE (tax_id, tax_id_type, country)` — Búsqueda por tax ID
- `UNIQUE (hubspot_company_id)` — VK HubSpot
- `INDEX (country, organization_type)` — Filtrado común

### `spaces`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `space_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-SPC-NNNN` |
| `organization_id` | UUID | FK → organizations |
| `client_id` | VARCHAR | Bridge legacy → clients table (nullable) |
| `space_name` | VARCHAR | Nombre del espacio |
| `status` | VARCHAR | `active`, `inactive` |
| `active` | BOOLEAN | Flag |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Índices**:
- `UNIQUE (client_id)` — Bridge legacy
- `INDEX (organization_id)` — Relación 1:N

### `person_memberships`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `membership_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-MBR-NNNN` |
| `organization_id` | UUID | FK → organizations |
| `profile_id` | UUID | FK → identity_profiles (Person 360) |
| `space_id` | UUID | FK → spaces (nullable, multi-space) |
| `client_id` | VARCHAR | Bridge legacy (nullable) |
| `membership_type` | VARCHAR | `employee`, `contractor`, `advisor`, `customer_contact`, `vendor_contact` |
| `role_label` | VARCHAR | Rol en la org (ej: 'CTO', 'Account Manager') |
| `department` | VARCHAR | Departamento (ej: 'Engineering', 'Sales') |
| `is_primary` | BOOLEAN | Flag: membresía principal de persona |
| `active` | BOOLEAN | Flag |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Índices**:
- `UNIQUE (organization_id, profile_id, space_id)` — Una membresía por org+profile+(space opcional)
- `INDEX (profile_id, is_primary)` — Lookup person → org primaria
- `INDEX (organization_id, membership_type)` — Filtrado por tipo

### `services`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `service_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-SVC-NNNN` |
| `space_id` | UUID | FK → spaces |
| `organization_id` | UUID | FK → organizations (desnormalizado para query) |
| `name` | VARCHAR | Nombre del servicio |
| `description` | TEXT | Descripción |
| `pipeline_stage` | VARCHAR | `prospecting`, `negotiation`, `active`, `completed` |
| `linea_de_servicio` | VARCHAR | Categoría (ej: 'Design', 'Development') |
| `servicio_especifico` | VARCHAR | Subcategoría (ej: 'Brand Strategy', 'Mobile App') |
| `modalidad` | VARCHAR | `full-time`, `project`, `retainer`, `managed-service` |
| `billing_frequency` | VARCHAR | `monthly`, `quarterly`, `annual`, `one-time` |
| `country` | VARCHAR | País de facturación |
| `total_cost` | NUMERIC | Costo total en moneda |
| `currency` | VARCHAR | ISO 4217 (ej: 'CLP', 'MXN', 'USD') |
| `hubspot_deal_id` | VARCHAR | FK HubSpot (VK) |
| `notion_project_id` | VARCHAR | Link a proyecto Notion (opcional) |
| `start_date` | DATE | Fecha inicio |
| `end_date` | DATE | Fecha fin (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Índices**:
- `UNIQUE (hubspot_deal_id)` — VK HubSpot
- `INDEX (space_id, pipeline_stage)` — Servicios activos por espacio
- `INDEX (organization_id)` — Rollup económico

### `service_history`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `history_id` | UUID | PK |
| `service_id` | UUID | FK → services |
| `field_name` | VARCHAR | Campo que cambió |
| `old_value` | TEXT | Valor anterior (JSON serialized) |
| `new_value` | TEXT | Valor nuevo |
| `changed_at` | TIMESTAMPTZ | Timestamp |
| `changed_by` | UUID | FK → identity_profiles (quién cambió) |

**Índice**:
- `INDEX (service_id, changed_at DESC)` — Audit trail por servicio

### `space_notion_sources`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `source_id` | UUID | PK |
| `space_id` | UUID | FK → spaces |
| `notion_projects_db_id` | VARCHAR | Database ID de Projects |
| `notion_tasks_db_id` | VARCHAR | Database ID de Tasks |
| `notion_sprints_db_id` | VARCHAR | Database ID de Sprints |
| `notion_reviews_db_id` | VARCHAR | Database ID de Reviews (opcional) |
| `sync_enabled` | BOOLEAN | Flag: está sincronización activa |
| `sync_frequency` | VARCHAR | `hourly`, `daily`, `weekly` |
| `last_sync_at` | TIMESTAMPTZ | Último sync exitoso |
| `last_sync_error` | TEXT | Error si el último sync falló |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Índice**:
- `UNIQUE (space_id)` — Una fuente Notion por espacio

---

## API Routes

### CRUD principal

| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/organizations` | GET | Internal Tenant | Lista paginada con filtros (search, type, country) |
| `/api/organizations/[id]` | GET | Internal Tenant | Detalle con spaces[], people[], services[] |
| `/api/organizations/[id]` | PATCH | Internal Tenant | Actualizar datos (nombre, tax_id, etc) |
| `/api/organizations/org-search` | GET | Internal Tenant | Búsqueda semantic o por tax ID |
| `/api/organizations/people-search` | GET | Internal Tenant | Búsqueda de personas cross-org |

Query params comunes:
- `search` — Búsqueda en nombre, legal_name, tax_id
- `type` — Filtro por org_type (client/supplier/both)
- `country` — Filtro por país
- `limit`, `offset` — Paginación

### Memberships

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/organizations/[id]/memberships` | GET | Listar membresías (con profile details) |
| `/api/organizations/[id]/memberships` | POST | Crear membresía (agregar persona a org) |
| `/api/organizations/[id]/memberships/[memberId]` | PATCH | Actualizar rol, department, is_primary |
| `/api/organizations/[id]/memberships/[memberId]` | DELETE | Deshactivar membresía |

### Contexto

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/organizations/[id]/ico` | GET | Métricas ICO Engine (spaces agrupadas) |
| `/api/organizations/[id]/finance` | GET | Resumen financiero (ingresos, gastos, margen) |
| `/api/organizations/[id]/executive` | GET | Roles ejecutivos |
| `/api/organizations/[id]/projects` | GET | Proyectos asociados (vía spaces + services) |
| `/api/organizations/[id]/services` | GET | Servicios (EO-SVC-*) contratados |
| `/api/organizations/[id]/hubspot-sync` | POST | Trigger manual de sync HubSpot |

Todos requieren `requireInternalTenantContext()`.

---

## UI

### Vista de lista (`OrganizationListView`)

- Lista paginada de organizaciones
- Columnas: público_id, nombre, tipo, país, industria, conteo espacios, conteo personas
- Filtros: tipo (client/supplier/both), país, búsqueda
- Acciones: crear org, editar, ver detalles
- Export a CSV

### Vista de detalle (`OrganizationView`)

**Sidebar izquierdo**:
- Metadata de org (nombre, legal_name, tax_id, industry, país)
- Status badge
- Links a HubSpot, Notion

**Área principal - Tabs dinámicos**:

| Tab | Componente | Contenido |
|-----|-----------|-----------|
| **Overview** | `OverviewTab` | Datos generales, lista de spaces, servicios activos |
| **People** | `PeopleTab` | Membresías (person name, role, department, membership_type) |
| **Finance** | `FinanceTab` | Resumen: ingresos (YTD), gastos (YTD), margen, cost per task (vía ICO) |
| **ICO** | `IcoTab` | Métricas de delivery (spaces agrupadas): RPA, OTD%, FTR%, cycle time, velocity |
| **Integrations** | `IntegrationsTab` | HubSpot sync (last_sync_at, status), Notion DB IDs por space |

### Drawers

- **`EditOrganizationDrawer`** — Editar: nombre, legal_name, tax_id, industry, país, hubspot_company_id
- **`AddMembershipDrawer`** — Agregar persona:
  1. Búsqueda de identity_profile existente
  2. Selección de space (opcional)
  3. Selección de membership_type (radio buttons)
  4. Ingreso de role_label, department
  5. Flag is_primary

---

## Dos grafos complementarios

### Grafo Operativo (team_assignments)
- Relaciona **member** → **client** o **project** (asignación operativa)
- Contiene: allocation_pct (0-100), billable flag
- Vive en `greenhouse_serving.team_assignments`
- Usado para: facturación, reportes de allocación, capacidad

### Grafo Estructural (person_memberships)
- Relaciona **identity_profile** → **organization** (relación contractual/estructural)
- Contiene: membership_type, role_label, department, is_primary
- Vive en `greenhouse_core.person_memberships`
- Usado para: gobernanza, acceso, org chart, leadership

**Reconciliación**:
- Un miembro con team_assignment a client X debe tener person_membership compatible
- Scripts de reconciliación validan ambos grafos semestralmente

---

## Poblaciones demográficas

### Población A: Colaboradores Efeonce
- **membership_type**: employee, contractor, advisor
- **Acceso**: Full (todos los módulos)
- **Fiscal**: Sujeto a payroll Efeonce
- **Asignación operativa**: team_assignments a múltiples clientes/proyectos
- Número típico: ~100-150 personas

### Población B: Contactos Clientes
- **membership_type**: customer_contact
- **Acceso**: Limitado (solo su org + spaces asignados, sin financiero)
- **Fiscal**: Externo
- **Asignación operativa**: Ninguna (no operan internamente)
- Número típico: ~500-2000 personas
- Fuente: HubSpot Contacts (sync bidireccional)

### Población C: Contactos Proveedores
- **membership_type**: vendor_contact
- **Acceso**: Limitado (solo integración con módulo de servicios)
- **Fiscal**: Externo
- **Asignación operativa**: Ninguna
- Número típico: ~200-500 personas
- Fuente: Nubox (RUT/tax_id), manual, integraciones ERP

---

## Impacto transversal

Account 360 impacta a múltiples módulos de la plataforma:

| Módulo | Impacto | Estado |
|--------|---------|--------|
| **Finance** | `fin_income`, `fin_expenses` eventualmente FK a `organization_id` vía space | En progreso (v2.2 planificado) |
| **Capabilities** | `client_service_modules` → mount de Services sobre Spaces | Diseño completado |
| **People** | `person_memberships` extienden context de persona | ✓ Implementado |
| **ICO Engine** | Métricas agrupables por `organization_id` vía spaces | ✓ Implementado |
| **HubSpot** | Sync bidireccional Company ↔ Organization | ✓ Implementado |
| **Nubox** | Identity resolution supplier → Organization vía tax_id | ✓ Implementado |
| **Payroll** | Contexto org para allocation tracking | Planned |
| **Agency Pulse** | Rollup de KPIs por org | En progreso |

---

## Compatibilidad con legacy

El modelo es **totalmente upward-compatible** con el sistema existente:

- **`spaces.client_id`** actúa como bridge hacia tabla `clients` legacy — todas las queries existentes funcionan
- **`person_memberships.client_id`** mantiene FK legacy donde sea necesario (transición gradual)
- Las queries existentes que usan `client_id` siguen funcionando; Account 360 agrega capas superiores sin romper las inferiores
- **Migración progresiva**: cada módulo puede adoptar `organization_id` a su propio ritmo
- No hay cambios disruptivos: todos los datos legacy se preservan

---

## Convención de IDs

Todos los objetos del modelo Account 360 usan IDs secuenciales inmutables:

| Entidad | Internal ID | Public ID | Generación | Ejemplo |
|---------|------------|-----------|------------|---------|
| Organization | `{uuid}` | `EO-ORG-{NNNN}` | `nextPublicId('EO-ORG')` | `EO-ORG-0001` |
| Space | `{uuid}` | `EO-SPC-{NNNN}` | `nextPublicId('EO-SPC')` | `EO-SPC-0042` |
| Person Membership | `{uuid}` | `EO-MBR-{NNNN}` | `nextPublicId('EO-MBR')` | `EO-MBR-0567` |
| Service | `{uuid}` | `EO-SVC-{NNNN}` | `nextPublicId('EO-SVC')` | `EO-SVC-0123` |

Los IDs públicos son:
- **Inmutables**: nunca cambian después de asignados
- **Human-readable**: usados en URLs, exports, referencias externas
- **Secuenciales**: generados por secuencias PostgreSQL (SERIAL)
- **Globales por tipo**: EO-ORG-NNNN es único globalmente para todas las orgs

---

## Notas de implementación

- **Timezone**: Todos los timestamps en TIMESTAMPTZ con UTC como default
- **Normalización tax_id**: Siempre normalizar antes de guardar (remover guiones, espacios, mayúsculas)
- **Búsqueda**: Índices full-text en nombre, legal_name para búsqueda rápida
- **Sync HubSpot**: Bidireccional con `hubspot_company_id` como VK. Script `sync-hubspot-companies.ts` ejecuta cada hora.
- **Audit**: Todos los cambios a `services` registrados en `service_history` para trazabilidad
- **Soft-delete**: `organizations` usa flag `active` en lugar de borrado físico; `person_memberships` similar
