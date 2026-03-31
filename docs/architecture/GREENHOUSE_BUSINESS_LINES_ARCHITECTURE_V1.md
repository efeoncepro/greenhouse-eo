# GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md

## Objetivo

Definir `business lines` como la dimension canonica de linea de negocio en Greenhouse, con separacion explicita entre BU comercial (quien vende) y BU operativa (quien ejecuta).

Este documento describe la arquitectura implementada por TASK-016 (Business Units Canonical v2) y reemplaza cualquier propuesta previa de catalogo paralelo a `service_modules`.

Usar junto con:
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Principio arquitectonico

Las business lines NO son un objeto canonico independiente.

Son metadata rica sobre `service_modules` existentes donde `module_kind = 'business_line'`.

La identidad base sigue siendo `service_modules.module_code`. No existe `business_unit_id`, no existe tabla `business_units` con PK propia, no existe enum PostgreSQL duplicado del catalogo.

## Dos ejes de Business Unit

### 1. BU Comercial (`commercial_business_unit`)

Responde a: quien vende, bajo que unidad se contrata el servicio, a que linea se atribuye revenue y margen.

Fuentes naturales:
- `service_modules.module_code` donde `module_kind = 'business_line'`
- `services.linea_de_servicio`
- HubSpot `ef_linea_de_servicio`
- `client_service_modules` assignments

Consumidores primarios:
- Finance (P&L por BU, revenue, gross margin)
- Services (mix de servicios activos por BU)
- Dashboard (capabilities, navigation)

### 2. BU Operativa (`operating_business_unit`)

Responde a: quien ejecuta realmente el trabajo, que unidad opera el delivery.

Fuente natural:
- Propiedad `Business Unit` (Select) en Notion Proyectos
- Normalizada a `module_code` via `sync-notion-conformed.ts`

Consumidores primarios:
- ICO Engine (RpA, OTD, throughput, cycle time por BU)
- Delivery analytics
- Capacity planning

### Regla de convivencia

Las dos pueden coincidir, pero no es obligatorio.

```
commercial_business_unit = globe
operating_business_unit  = wave
```

Esto no es error. Es cross-unit delivery.

Finance siempre usa BU comercial por defecto. ICO siempre usa BU operativa por defecto. Vistas cruzadas (`commercial_vs_operating`) son una capa futura explicita.

## Modelo de datos

### PostgreSQL

#### `greenhouse_core.service_modules` (extendido)

Columnas agregadas por TASK-016:
- `module_kind TEXT` — `'business_line'` o `'service_module'`
- `parent_module_code TEXT` — link a la BL padre cuando `module_kind = 'service_module'`

Seed: 5 business lines (`globe`, `efeonce_digital`, `reach`, `wave`, `crm_solutions`) + 1 fallback (`unknown`) + 14 service modules.

#### `greenhouse_core.business_line_metadata`

```sql
CREATE TABLE greenhouse_core.business_line_metadata (
  module_code TEXT PRIMARY KEY
    REFERENCES greenhouse_core.service_modules(module_code),
  label TEXT NOT NULL,
  label_full TEXT,
  claim TEXT,
  loop_phase TEXT,
  loop_phase_label TEXT,
  lead_identity_profile_id TEXT,
  lead_name TEXT,
  color_hex TEXT NOT NULL,        -- Alineado con GH_COLORS.service
  color_bg TEXT,
  icon_name TEXT,
  hubspot_enum_value TEXT NOT NULL UNIQUE,
  notion_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RBAC: SELECT para `greenhouse_runtime`, full CRUD para `greenhouse_migrator`.

Reglas:
- `module_code` es la identidad de referencia — no hay PK nueva
- No hay UUID
- No hay `lead_person_id` legacy
- Colores provienen de `GH_COLORS.service` en `greenhouse-nomenclature.ts`

### BigQuery

#### `greenhouse_conformed.dim_business_lines`

Espejo de `business_line_metadata`. Poblado por ETL `scripts/etl-business-lines-to-bigquery.ts` (full replace, DELETE + INSERT).

Columnas: `module_code`, `label`, `label_full`, `claim`, `loop_phase`, `loop_phase_label`, `lead_name`, `color_hex`, `color_bg`, `icon_name`, `hubspot_enum_value`, `notion_label`, `is_active`, `sort_order`, `description`, `synced_at`.

No tiene partitioning ni clustering (tabla de 5 rows).

#### `greenhouse_conformed.delivery_projects.operating_business_unit`

Columna STRING que contiene el `module_code` normalizado de la BU operativa. Poblada por `sync-notion-conformed.ts` desde la propiedad `Business Unit` de Notion Proyectos.

Normalizacion: label Notion (`"Globe"`) → module_code (`"globe"`) via mapa explicito en `BUSINESS_UNIT_LABEL_MAP`.

#### `ico_engine.metrics_by_business_unit`

Tabla materializada con metricas ICO agregadas por BU operativa. Misma estructura que `metrics_by_organization` pero keyed por `business_unit` en vez de `organization_id`.

Columnas: `business_unit`, `period_year`, `period_month`, 14 metricas (rpa_avg, otd_pct, ftr_pct, cycle_time, throughput, stuck assets, etc.), `materialized_at`.

#### `ico_engine.v_tasks_enriched`

View extendida con JOIN a `delivery_projects` para exponer `operating_business_unit` en cada tarea. Este campo alimenta la dimension `business_unit` del ICO Engine.

## Flujos de datos

### BU Comercial (HubSpot → Services → Finance)

```
HubSpot ef_linea_de_servicio
  → hubspot-bigquery sync → hubspot_crm.companies
  → service bootstrap → greenhouse_core.services.linea_de_servicio
  → v_client_active_modules → TenantContext.businessLines
  → Finance dashboard → /api/finance/dashboard/by-service-line
    enriched con business_line_metadata (label, colorHex, loopPhase)
```

### BU Operativa (Notion → Conformed → ICO)

```
Notion Proyectos.Business Unit (Select: Globe, Efeonce Digital, ...)
  → notion-bq-sync Cloud Run → notion_ops.proyectos.business_unit
  → sync-notion-conformed.ts → normalizeBusinessUnit() → module_code
  → greenhouse_conformed.delivery_projects.operating_business_unit
  → ico_engine.v_tasks_enriched (JOIN delivery_projects)
  → materializeBusinessUnitMetrics() → metrics_by_business_unit
  → /api/ico-engine/context?dimension=business_unit&value=wave
```

### Metadata enrichment (PG → API / TenantContext)

```
greenhouse_core.business_line_metadata (PG)
  → loadBusinessLineMetadata() / getCachedBusinessLineSummaries() (5min TTL)
  → TenantContext.businessLineMetadata (server-side, not JWT)
  → /api/admin/business-lines (CRUD)
  → /admin/business-lines (Admin UI)
```

### Dimension analitica (PG → BQ)

```
greenhouse_core.business_line_metadata (PG)
  → scripts/etl-business-lines-to-bigquery.ts (full replace)
  → greenhouse_conformed.dim_business_lines (BQ)
  → JOIN en views de Finance, ICO, analytics
```

## API

### `GET /api/admin/business-lines`

Retorna todas las BLs activas con metadata completa. Requiere `admin` route group + `EFEONCE_ADMIN` role.

### `GET /api/admin/business-lines/[moduleCode]`

Retorna metadata de una BL especifica.

### `PUT /api/admin/business-lines/[moduleCode]`

Edita campos: `label`, `labelFull`, `claim`, `leadName`, `description`, `iconName`, `colorHex`, `colorBg`, `isActive`, `sortOrder`.

### `GET /api/ico-engine/context?dimension=business_unit&value={moduleCode}`

Retorna metricas ICO para una BU operativa especifica (materializado o live compute).

### `GET /api/finance/dashboard/by-service-line`

Retorna totales financieros por service line, enriched con `label`, `colorHex`, `loopPhase` desde metadata.

## Portal UI

### Admin Business Lines (`/admin/business-lines`)

- Card por cada BL con: color swatch, wordmark, loop phase badge, claim, lead, descripcion
- Click en card abre dialog de edicion (label, claim, lead, descripcion)
- Panel informativo de semantica comercial vs operativa
- Accesible desde sidebar (Gobierno) y Admin Center (domain card)

### TenantContext enrichment

`businessLineMetadata?: BusinessLineMetadataSummary[]` disponible en sesion server-side.

No se almacena en JWT (es data global, no per-tenant). Se resuelve via cache de 5 minutos en `getCachedBusinessLineSummaries()`.

Shape:
```typescript
type BusinessLineMetadataSummary = {
  moduleCode: string
  label: string
  colorHex: string
  loopPhase: string | null
}
```

### Capability palette

`getCapabilityPaletteFromMetadata()` resuelve colores desde metadata en vez de heuristicas hardcodeadas. Coexiste con `getCapabilityPalette()` legacy por backward compatibility.

## ICO Engine integration

### Dimension `business_unit`

Agregada al allowlist `ICO_DIMENSIONS` en `src/lib/ico-engine/shared.ts`. Mapea a la columna `operating_business_unit` de `v_tasks_enriched`.

### Materialization

Step 10 de `materializeMonthlySnapshots()`: agrupa tareas por `operating_business_unit` y escribe a `metrics_by_business_unit`. Solo incluye tareas donde `operating_business_unit IS NOT NULL`.

### Live compute

`computeMetricsByContext('business_unit', 'wave', 2026, 3)` funciona sin materialization previa — calcula en vivo desde `v_tasks_enriched`.

## Notion integration

### Propiedad en base de Proyectos

`Business Unit` — tipo Select con 5 opciones:
- Globe (red)
- Efeonce Digital (blue)
- Reach (orange)
- Wave (green)
- CRM Solutions (purple)

Semantica: esta propiedad representa la BU **operativa** (quien ejecuta el proyecto), no la comercial.

### Normalizacion

`sync-notion-conformed.ts` normaliza el label de Notion al `module_code` canonico:
```
Globe           → globe
Efeonce Digital → efeonce_digital
Reach           → reach
Wave            → wave
CRM Solutions   → crm_solutions
```

Labels no reconocidos se normalizan a snake_case por defecto.

## Colores canonicos

Fuente de verdad: `GH_COLORS.service` en `src/config/greenhouse-nomenclature.ts`.

| module_code      | color_hex | color_bg              |
|------------------|-----------|-----------------------|
| globe            | #bb1954   | rgba(187,25,84,0.08)  |
| efeonce_digital  | #023c70   | rgba(2,60,112,0.08)   |
| reach            | #ff6500   | rgba(255,101,0,0.08)  |
| wave             | #0375db   | rgba(3,117,219,0.08)  |
| crm_solutions    | #633f93   | rgba(99,63,147,0.08)  |

Estos colores estan persistidos en `business_line_metadata.color_hex` y en `dim_business_lines.color_hex`. Si se editan desde admin UI, la edicion se propaga al proximo ETL hacia BigQuery.

## Archivos clave

| Proposito | Path |
|-----------|------|
| Metadata PG helper | `src/lib/business-line/metadata.ts` |
| Types | `src/types/business-line.ts` |
| API list | `src/app/api/admin/business-lines/route.ts` |
| API CRUD | `src/app/api/admin/business-lines/[moduleCode]/route.ts` |
| Admin page | `src/app/(dashboard)/admin/business-lines/page.tsx` |
| Admin view | `src/views/greenhouse/admin/business-lines/AdminBusinessLinesView.tsx` |
| Edit dialog | `src/views/greenhouse/admin/business-lines/BusinessLineEditDialog.tsx` |
| Card component | `src/components/greenhouse/BusinessLineMetadataCard.tsx` |
| TenantContext | `src/lib/tenant/get-tenant-context.ts` |
| Palette helper | `src/views/greenhouse/admin/tenants/helpers.ts` |
| Brand assets | `src/components/greenhouse/brand-assets.ts` |
| Nomenclature | `src/config/greenhouse-nomenclature.ts` (GH_COLORS.service, GH_INTERNAL_NAV) |
| Sidebar menu | `src/components/layout/vertical/VerticalMenu.tsx` |
| Admin center card | `src/views/greenhouse/admin/AdminCenterView.tsx` |
| ICO dimensions | `src/lib/ico-engine/shared.ts` |
| ICO schema | `src/lib/ico-engine/schema.ts` |
| ICO materialization | `src/lib/ico-engine/materialize.ts` |
| Notion sync | `src/lib/sync/sync-notion-conformed.ts` |
| BQ dimension DDL | `bigquery/greenhouse_dim_business_lines_v1.sql` |
| BQ ETL | `scripts/etl-business-lines-to-bigquery.ts` |
| PG migration (kind) | `scripts/migrations/add-service-modules-kind.sql` |
| PG migration (metadata) | `scripts/migrations/create-business-line-metadata.sql` |
| BQ source sync DDL | `scripts/setup-bigquery-source-sync.sql` |
| Task spec (closed) | `docs/tasks/complete/TASK-016-business-units-canonical.md` |

## Lo que NO es este modelo

- No es un objeto 360 con ciclo de vida transaccional
- No tiene EO-ID (`EO-BU-XXXX`)
- No tiene pipeline ni estados — las BLs son estables
- No reemplaza `service_modules` — lo enriquece
- No tiene enum PostgreSQL duplicado
- No crea FK constraints sobre `departments.business_unit` ni `fin_income.service_line` (eso es trabajo futuro de FK hardening)

## Decisiones futuras documentadas

### FK hardening (fuera de scope actual)

Cuando el negocio lo requiera:
- `departments.business_unit` → CHECK o FK contra `service_modules(module_code)`
- `fin_income.service_line` / `fin_expenses.service_line` → validacion contra catalogo
- Esto es trabajo de TASK-034 P2, no de TASK-016

### HubSpot validation

El sync `hubspot-bigquery` deberia verificar que `ef_linea_de_servicio` exista en la tabla canonica y logear anomalias. No implementado todavia.

### Vistas cruzadas

Si se necesita analisis cruzado comercial vs operativo:
- `commercial_vs_operating_bu` — comparacion por proyecto
- `cross_unit_delivery` — proyectos donde BU comercial != BU operativa
- `margin_vs_operational_health_by_bu` — P&L vs ICO cruzado

Estas son vistas analiticas futuras, no parte del modelo base.
