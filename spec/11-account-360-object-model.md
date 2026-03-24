# Greenhouse Portal — Account 360 Object Model

> Versión: 1.0
> Fecha: 2026-03-22

---

## Visión general

Account 360 redefine cómo Greenhouse estructura las relaciones B2B. Introduce un modelo jerárquico de tres niveles — Organizations, Spaces, Person Memberships — que reemplaza la relación plana `clients` con un modelo canónico compatible con la identidad unificada Person 360.

**Lib**: `src/lib/account-360/`
**API**: `/api/organizations/*`
**Vista**: `src/views/greenhouse/organizations/`
**Fuente de datos**: PostgreSQL (`greenhouse_core`)

---

## Modelo de objetos

```
Organization (EO-ORG-*)
│  Entidad jurídica: cliente, proveedor, o ambos
│  VK: HubSpot Company (hubspot_company_id)
│  Datos: legal_name, tax_id, industry, country
│
├── Space (EO-SPC-*) — 1:N por Organization
│   │  Espacio operativo (tenant)
│   │  Bridge: client_id → clients legacy
│   │
│   ├── space_notion_sources[] — Notion DB mappings
│   ├── services[] (EO-SVC-*) — Servicios contratados
│   └── (client_users, capabilities, etc. via client_id bridge)
│
└── Person Memberships (EO-MBR-*) — N:M Organization ↔ Identity Profile
    │  Vínculo entre persona canónica y organización
    │  Scoped opcionalmente a un Space
    │
    └── identity_profile (EO-ID*) → Person 360
```

---

## Convención de IDs

Todos los objetos del modelo Account 360 usan IDs secuenciales generados por secuencias PostgreSQL:

| Entidad | Internal ID | Public ID | Generación |
|---------|------------|-----------|------------|
| Organization | `org-{uuid}` | `EO-ORG-{NNNN}` | `nextPublicId('EO-ORG')` |
| Space | `spc-{uuid}` | `EO-SPC-{NNNN}` | `nextPublicId('EO-SPC')` |
| Person Membership | `mbr-{uuid}` | `EO-MBR-{NNNN}` | `nextPublicId('EO-MBR')` |
| Service | `svc-{uuid}` | `EO-SVC-{NNNN}` | `nextPublicId('EO-SVC')` |

Los IDs públicos son inmutables, human-readable, y se usan en URLs, exports y references externas.

---

## Tablas PostgreSQL

### `greenhouse_core.organizations`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `organization_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-ORG-*` |
| `organization_name` | VARCHAR | Nombre comercial |
| `legal_name` | VARCHAR | Razón social |
| `organization_type` | VARCHAR | `client`, `supplier`, `both` |
| `tax_id` | VARCHAR | RUT, RFC, EIN, VAT |
| `tax_id_type` | VARCHAR | Tipo de tax ID |
| `industry` | VARCHAR | Industria |
| `country` | VARCHAR | País |
| `hubspot_company_id` | VARCHAR | FK HubSpot |
| `notes` | TEXT | Notas |
| `status` | VARCHAR | Estado |
| `active` | BOOLEAN | Flag |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

### `greenhouse_core.spaces`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `space_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-SPC-*` |
| `organization_id` | UUID | FK → organizations |
| `client_id` | VARCHAR | Bridge legacy → clients |
| `space_name` | VARCHAR | Nombre |
| `status` / `active` | VARCHAR / BOOLEAN | Estado |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

### `greenhouse_core.person_memberships`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `membership_id` | UUID | PK |
| `public_id` | VARCHAR | `EO-MBR-*` |
| `organization_id` | UUID | FK → organizations |
| `profile_id` | UUID | FK → identity_profiles |
| `space_id` | UUID | FK → spaces (nullable) |
| `client_id` | VARCHAR | Bridge legacy (nullable) |
| `membership_type` | VARCHAR | Tipo |
| `role_label` | VARCHAR | Rol en la org |
| `department` | VARCHAR | Departamento |
| `is_primary` | BOOLEAN | Membresía principal |
| `active` | BOOLEAN | Flag |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

---

## Identity Resolution

### Por Tax ID

`findOrganizationByTaxId(taxId)` — Busca organizaciones por tax ID normalizado. Soporta RUT (Chile), RFC (México), EIN (USA), VAT (EU). Retorna `organization_id` y `organization_type`.

### Supplier find-or-create

`ensureOrganizationForSupplier(supplierData)` — Patrón find-or-create:
1. Busca por tax_id
2. Si existe como `client`, upgradea a `both`
3. Si no existe, crea nueva organización tipo `supplier`
4. Retorna `organization_id`

### Client resolution

`resolveOrganizationForClient(clientId)` — Resuelve `organization_id` para income records:
1. Busca space por `client_id`
2. Si space tiene `organization_id`, lo retorna
3. Si no, crea organización y vincula

---

## API Routes

### CRUD principal

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/organizations` | GET | Lista paginada con filtros (search, type, country) |
| `/api/organizations/[id]` | GET | Detalle con spaces[] y people[] |
| `/api/organizations/[id]` | PATCH | Actualizar datos |
| `/api/organizations/org-search` | GET | Búsqueda |
| `/api/organizations/people-search` | GET | Búsqueda de personas cross-org |

### Memberships

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/organizations/[id]/memberships` | GET | Listar membresías |
| `/api/organizations/[id]/memberships` | POST | Crear membresía |

### Contexto

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/organizations/[id]/ico` | GET | Métricas ICO Engine |
| `/api/organizations/[id]/finance` | GET | Resumen financiero |
| `/api/organizations/[id]/hubspot-sync` | POST | Trigger sync HubSpot |

Todos requieren `requireInternalTenantContext()`.

---

## UI

### Vista de lista (`OrganizationListView`)

Lista paginada de organizaciones con: nombre, tipo, país, industria, conteo de spaces, conteo de personas.

### Vista de detalle (`OrganizationView`)

Sidebar izquierdo con metadata + área principal con tabs dinámicos:

| Tab | Componente | Contenido |
|-----|-----------|-----------|
| Overview | `OverviewTab` | Datos generales, lista de spaces |
| People | `PeopleTab` | Membresías con perfil, rol, departamento |
| Finance | `FinanceTab` | Resumen financiero de la organización |
| ICO | `IcoTab` | Métricas de delivery del ICO Engine |
| Integrations | `IntegrationsTab` | Estado de sync HubSpot |

### Drawers

- **`EditOrganizationDrawer`** — Editar datos de la organización
- **`AddMembershipDrawer`** — Agregar persona (busca identity profiles existentes)

---

## Impacto transversal

El modelo Account 360 impacta a múltiples módulos:

| Módulo | Impacto |
|--------|---------|
| Finance | `fin_income`, `fin_expenses` eventualmente FK a Organization en lugar de client_id |
| Capabilities | `client_service_modules` → futuro mount de Services sobre Spaces |
| People | `person_memberships` extienden el contexto de persona con relaciones organizacionales |
| ICO Engine | Métricas agrupables por `organization_id` vía spaces |
| HubSpot | Sync bidireccional Company ↔ Organization |
| Nubox | Identity resolution supplier → Organization vía tax_id |

---

## Compatibilidad con legacy

El modelo es **upward-compatible** con el sistema existente:
- `spaces.client_id` actúa como bridge hacia `clients` legacy
- `person_memberships.client_id` mantiene FK legacy donde sea necesario
- Las queries existentes que usan `client_id` siguen funcionando; el modelo Account 360 agrega una capa superior sin romper la inferior
- La migración es progresiva: los módulos pueden adoptar `organization_id` a su propio ritmo
