# CODEX TASK -- Business Units Canonical v2: metadata canonica sobre business_line y separacion comercial vs operativa

## Delta 2026-03-31

Fase 1 implementada:
- Migration `add-service-modules-kind.sql`: module_kind + parent_module_code en PG service_modules
- Migration `create-business-line-metadata.sql`: tabla + seed con colores de GH_COLORS.service
- Type `BusinessLineMetadata` + `BusinessLineMetadataSummary` en `src/types/business-line.ts`
- Helper `loadBusinessLineMetadata()` + cache server-side en `src/lib/business-line/metadata.ts`
- API `GET/PUT /api/admin/business-lines[/moduleCode]`
- `TenantContext.businessLineMetadata` enrichment via cached query
- `BusinessLineMetadataCard` component + barrel export
- Admin page `/admin/business-lines` con edit dialog
- `brand-assets.ts` — added crm_solutions
- `getCapabilityPaletteFromMetadata()` — metadata-driven palette resolver

Fase 2 implementada:
- BQ DDL `bigquery/greenhouse_dim_business_lines_v1.sql`
- ETL script `scripts/etl-business-lines-to-bigquery.ts` (PG → BQ full replace)
- `greenhouse_conformed.dim_business_lines` live con 5 BLs
- Finance `/api/finance/dashboard/by-service-line` enriched con label, colorHex, loopPhase desde metadata
- Missing BLs (efeonce_digital, reach) insertadas en PG service_modules de producción

Fase 3 implementada:
- Propiedad `Business Unit` (Select) creada en Notion Proyectos via API
  Opciones: Globe, Efeonce Digital, Reach, Wave, CRM Solutions
- `sync-notion-conformed.ts` extendido: lee `business_unit` de `notion_ops.proyectos`,
  normaliza label→module_code, escribe `operating_business_unit` a `delivery_projects`
- BQ `greenhouse_conformed.delivery_projects` — columna `operating_business_unit` agregada
- DDL en `setup-bigquery-source-sync.sql` actualizado

Fase 4 implementada:
- `ICO_DIMENSIONS` allowlist: agregado `business_unit` → `operating_business_unit`
- `v_tasks_enriched` view: JOIN a `delivery_projects` para exponer `operating_business_unit`
- BQ tabla `ico_engine.metrics_by_business_unit` (DDL + infra provisioning)
- `materializeBusinessUnitMetrics()` en `materialize.ts` (Step 10)
- API live compute via `/api/ico-engine/context?dimension=business_unit&value=wave`

## Estado

**Complete** — Fases 1-4 implementadas 2026-03-31.

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la necesidad real detectada por `CODEX_TASK_Business_Units_Canonical.md`, pero reescribe su base tecnica para alinearla con el modelo vivo del proyecto:
- `service_modules` sigue siendo el catalogo canonico existente
- `business_line` no debe duplicarse con una segunda identidad paralela
- la metadata rica de BU puede vivir en PostgreSQL sin competir con el catalogo actual
- se separa explicitamente BU comercial vs BU operativa cuando haga falta

## Resumen

Greenhouse necesita dejar de tratar `globe`, `efeonce_digital`, `reach`, `wave` y `crm_solutions` como strings sueltos repartidos por todo el sistema.

La necesidad es valida:
- metadata rica para UI y analytics
- validacion de valores
- consistencia entre HubSpot, Services, Finance, HR y portal
- futura agregacion por BU

La v2 cambia la estrategia:
- no crear una identidad paralela que compita con `service_modules`
- usar `business_line` existente como anchor canonico del catalogo
- agregar una capa de metadata canonica por BU
- separar el concepto de BU comercial del concepto de BU operativa cuando el proyecto del delivery pertenezca a otra unidad distinta

## Objetivo analitico explicito

Esta `v2` existe justamente para habilitar analitica seria por linea de negocio sin mezclar semanticas.

Objetivos:
- `Finance` por linea de negocio
- `P&L` por linea de negocio
- `Services` y revenue mix por linea de negocio
- `ICO` por linea de negocio
- `Capacity` y staffing por linea de negocio

Pero no todo debe usar la misma BU.

## Dos ejes de Business Unit

### 1. `commercial_business_unit`

Responde a:
- quien vende
- bajo que unidad se contrata el servicio
- a que linea comercial atribuimos revenue, margen y pipeline

Fuentes naturales:
- `HubSpot`
- `services.linea_de_servicio`
- `service_modules.module_code` con `module_kind = 'business_line'`

Analitica tipica:
- revenue por BU
- gross margin por BU
- active services por BU
- renewals por BU
- tenant mix comercial por BU

### 2. `operating_business_unit`

Responde a:
- quien ejecuta realmente el trabajo
- que unidad opera el proyecto o el delivery
- donde atribuimos performance operativa

Fuentes naturales:
- `Notion` / delivery project metadata
- assignment / staffing context cuando aplique

Analitica tipica:
- RpA por BU operativa
- OTD por BU operativa
- throughput por BU operativa
- workload/capacity por BU operativa

## Regla de convivencia

Las dos pueden coincidir, pero no es obligatorio.

Ejemplo:
- `commercial_business_unit = globe`
- `operating_business_unit = wave`

Eso no es error.
Es un caso legitimo de cross-unit delivery.

## Decision de arquitectura

### Principios

- `greenhouse_core.service_modules` sigue siendo el catalogo canonico de productos/capabilities
- los registros con `module_kind = 'business_line'` ya representan la identidad base de las BUs en el sistema
- no introducir una segunda identidad primaria para el mismo concepto
- la metadata de BU puede enriquecerse en PostgreSQL, pero subordinada al `module_code`
- `HubSpot` y `Services` expresan la BU comercial
- `Notion` puede expresar una BU operativa de proyecto si el negocio realmente la necesita

## Problema bien formulado

Hoy existen dos necesidades distintas:

1. **BU comercial**
- la unidad de negocio que vende/contrata el servicio
- vive naturalmente cerca de `linea_de_servicio`, `service_modules`, `services`, HubSpot y tenant capabilities

2. **BU operativa**
- la unidad que realmente ejecuta un proyecto o parte del trabajo
- puede diferir de la BU comercial
- vive mas cerca de delivery/Notion y analitica operativa

La task original detecta ambas, pero las mezcla como si fueran una sola.

## Regla canonica

La `Business Unit` comercial no se modela como nuevo objeto canonico independiente.

Se modela como:
- `service_modules.module_code` con `module_kind = 'business_line'` como identidad base
- metadata adicional de BU en una capa 1:1 complementaria

La `Business Unit` operativa, si se necesita, se modela como atributo operacional de proyecto/delivery, no como sustituto de la BU comercial.

## Modelo recomendado

### A1. Mantener `service_modules` como anchor

No reemplazar:
- `greenhouse_core.service_modules`
- `greenhouse_core.client_service_modules`
- `businessLines` en `TenantContext`

La identidad vigente sigue siendo:
- `module_code = 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'`

## A2. Nueva tabla de metadata: `greenhouse_core.business_line_metadata`

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

  color_hex TEXT NOT NULL,
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

Reglas:
- `module_code` es la identidad de referencia
- no hay PK nueva tipo `business_unit_id`
- no hay `UUID`
- no hay `persons(id)` legacy; si se usa lead humano, debe referenciar `identity_profile_id`

### A3. Seed inicial

Se espera metadata para:
- `globe`
- `efeonce_digital`
- `reach`
- `wave`
- `crm_solutions`

Pero solo si esos `module_code` ya existen en `service_modules`.

## Lo que cambia frente al brief original

### Ya no recomendado

- una tabla `business_units` con identidad paralela competiendo con `service_modules`
- `lead_person_id UUID`
- enum PostgreSQL duplicado del mismo catalogo
- hacer que `getTenantContext()` valide contra una API HTTP interna

### Sí recomendado

- metadata rica por `module_code`
- joins o cache local server-side para enriquecer `businessLines`
- una dimension analitica derivada en BigQuery si hace falta

## BigQuery

### B1. Dimension derivada

Si se necesita una tabla analitica rica, crear:
- `greenhouse_conformed.dim_business_lines`

No como catalogo competidor, sino como espejo de:
- `service_modules` business_line
- `business_line_metadata`

## B2. ETL

El ETL deberia derivar la dimension desde PostgreSQL, no crear otra verdad separada.

## TenantContext

### Regla

`businessLines: string[]` se mantiene como contrato principal por backward compatibility.

Si se requiere metadata rica, agregar:

```ts
businessLineMetadata?: Array<{
  moduleCode: string
  label: string
  colorHex: string
  loopPhase?: string | null
}>
```

No resolver esto mediante fetch a `/api/business-units` dentro del propio runtime.
Resolverlo via query/cache server-side.

## Services

La BU comercial de `services` sigue siendo:
- `linea_de_servicio`

La mejora v2 es:
- alinear `linea_de_servicio` con `module_code` de `service_modules`
- enriquecer desde `business_line_metadata`

No forzar una FK a una tabla paralela si la identidad base ya es el mismo `module_code`.

## Finance y HR

### Finance

En vez de migrar todo inmediatamente a una nueva FK paralela:
- validar que `service_line` / `target_id` coincidan con `module_code`
- enriquecer en views por join a la dimension derivada

### Finance: semantica recomendada

Para analitica financiera, la BU correcta por defecto es:
- `commercial_business_unit`

No usar `operating_business_unit` para revenue o P&L salvo que el negocio quiera un analisis secundario de delivery economics cross-unit.

### HR

`departments.business_unit` no necesariamente representa una BU comercial.

Se recomienda:
- permitir nullable para shared services
- no forzar que todo departamento pertenezca a una BU comercial

## Notion / Delivery

### Decision clave

La propiedad `Business Unit` en Notion, si se crea, debe interpretarse como:
- `operating_business_unit`

No como sustituto automático de la BU comercial de HubSpot/Services.

### Regla

Proyecto en Notion puede tener:
- `operating_business_unit = wave`

Aunque el cliente/servicio comercial tenga:
- `commercial_business_unit = globe`

### Delivery / ICO: semantica recomendada

Para analitica de delivery e `ICO`, la BU correcta por defecto es:
- `operating_business_unit`

No mezclarla automaticamente con la BU comercial de Services.

Eso no es inconsistencia; es un caso de cross-unit delivery.

## ICO Engine

La granularidad BU solo es limpia si definimos antes qué BU queremos medir:

1. **BU comercial**
- deriva desde Services / tenant catalog / commercial mapping

2. **BU operativa**
- deriva desde proyecto/tarea en delivery

La v2 recomienda no mezclar ambas en una sola tabla `metrics_by_bu` sin prefijo semántico.

### Recomendacion

Si se implementa:
- `metrics_by_operating_bu`
o
- `metrics_by_commercial_bu`

Pero no una sola `metrics_by_bu` ambigua.

### Recomendacion operativa concreta

Orden sugerido:
1. `Finance` y `Services` consumen primero `commercial_business_unit`
2. `ICO` y delivery consumen primero `operating_business_unit`
3. si luego se quiere analisis cruzado, construir vistas comparativas explicitamente:
   - `commercial_vs_operating_bu`
   - `cross_unit_delivery`
   - `margin_vs_operational_health_by_bu`

## Admin UI

Una UI de consulta/edicion ligera si tiene sentido puede existir, pero no deberia vivir como “nuevo master catalog” independiente.

La UI correcta seria:
- leer business lines existentes
- mostrar metadata enriquecida
- permitir editar color, label, claim, lead, description

No crear/duplicar business lines por fuera de `service_modules`.

## Scope MVP

Incluye:
- metadata table por `module_code`
- seed inicial
- query/helper de enrichment
- dimension BQ derivada si hace falta para analytics
- documentar BU comercial vs operativa

No incluye:
- reescribir de una vez Finance, HR, Services, Notion e ICO
- crear una segunda identidad canonica de catalogo
- enum duplicado
- UI compleja de admin si todavia no existe el caso de edicion frecuente

## Fases recomendadas

### Fase 1

- metadata PostgreSQL por `business_line`
- helper de lectura server-side
- semantica clara `commercial` vs `operational`

### Fase 2

- dimension analitica derivada en BigQuery
- joins validados en views de Finance / services analytics
- primeras lecturas por `commercial_business_unit`

### Fase 3

- propiedad opcional `operating_business_unit` en Notion proyectos
- solo si el negocio realmente necesita medir ejecucion cross-unit
- primeras lecturas `ICO` / delivery por `operating_business_unit`

### Fase 4

- metricas ICO por BU con semantica explicita
- polish de UI/admin

## Regla operativa final

La task original acierta en el dolor:
- hay demasiados strings sueltos

Pero la v2 corrige la forma:
- no crear otro catalogo canonico compitiendo con `service_modules`
- enriquecer el que ya existe
- y separar BU comercial de BU operativa antes de llevar eso al engine o al portal

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/Greenhouse_Account_360_Object_Model_v1.md`

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.service_modules` (catálogo canónico — ya implementado)
  - `greenhouse_core.client_service_modules` (asignaciones — ya implementado)
  - Services Architecture spec (`docs/architecture/Greenhouse_Services_Architecture_v1.md`)
- **Impacta a:**
  - `CODEX_TASK_Financial_Intelligence_Layer_v2` — analytics por BU comercial consume metadata
  - `CODEX_TASK_Campaign_360_v2` — campaigns pueden asociarse a BU derivada
  - `CODEX_TASK_Services_Runtime_Closure_v1` — `linea_de_servicio` se alinea con `module_code`
  - `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2` — ICO metrics por BU operativa
- **Archivos owned:**
  - DDL de `greenhouse_core.business_line_metadata`
  - Helper/query de enrichment de BU metadata
  - `greenhouse_conformed.dim_business_lines` (BigQuery derivada)
