# CODEX TASK — Business Units: Dimension Table Canónica y Sinergias Cross-System

## Delta 2026-03-31
- Fase 1 implementada en TASK-016. Ver `docs/tasks/in-progress/TASK-016-business-units-canonical.md`.
- Arquitectura v2 usa `business_line_metadata` (1:1 sobre service_modules.module_code), NO `business_units(slug)` propuesta aquí.
- PG service_modules ahora tiene `module_kind` y `parent_module_code` (paridad con BQ).
- P0 de este brief está parcialmente cubierto por Fase 1 de TASK-016; P1-P4 siguen pendientes.

## Estado 2026-03-19

Este brief se conserva como framing del problema de negocio y de la necesidad de normalizar Business Units en Greenhouse.

Para implementación nueva y decisiones técnicas, usar como baseline:
- `docs/tasks/in-progress/TASK-016-business-units-canonical.md` (v2 — Fase 1 implementada)

En particular, no implementar literalmente desde esta versión:
- una segunda identidad canónica de catálogo que compita con `service_modules`
- `lead_person_id UUID` apuntando a `persons(id)` legacy
- enum PostgreSQL duplicado del mismo catálogo si la fuente de verdad ya es tabular
- una sola semántica de BU mezclando sin distinguir BU comercial y BU operativa

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/CODEX_TASK_Business_Units_Canonical_v2.md`

## Resumen

Crear el objeto **Business Unit** como tabla de referencia canónica en Greenhouse y conectarlo con HubSpot (origen comercial), Notion (operación creativa) y BigQuery (analytics conformed). El objetivo es eliminar los strings mágicos dispersos en 5+ tablas y establecer una fuente de verdad única con FKs validadas que habilite P&L por BU, métricas ICO por BU, y cost allocation por BU.

**El problema hoy:** El concepto de Business Unit (Globe, Efeonce Digital, Reach, Wave, CRM Solutions) está repetido como string libre en `departments.business_unit`, `fin_cost_allocations.target_id`, `fin_income.service_line`, `fin_expenses.service_line`, `service_modules` (donde `module_kind = 'business_line'`), y en HubSpot como `linea_de_servicio` / `ef_linea_de_servicio`. No hay tabla de referencia que los unifique. Si alguien escribe `'efeonce-digital'` en vez de `'efeonce_digital'`, nada lo atrapa. Las views de P&L y cost allocations operan contra strings libres sin validación.

En Notion, el gap es peor: las bases de Tareas, Proyectos y Sprints **no tienen propiedad de Business Unit**. Esto impide que el ICO Engine agregue métricas por BU directamente desde `notion_ops` — hoy el cruce requiere pasar por HubSpot Services (que aún no está implementado en producción).

**La solución en 5 capas:**

1. **PostgreSQL** — Tabla canónica `greenhouse_core.business_units` con metadata rica (label, claim, Loop phase, lead, color)
2. **BigQuery** — Dimension table `greenhouse_conformed.dim_business_units` espejada vía ETL nocturno. Todas las views analíticas hacen JOIN contra esta dimensión
3. **HubSpot** — Validación downstream: el sync `hubspot-bigquery` verifica que `ef_linea_de_servicio` exista en la tabla canónica; valores desconocidos se logean como anomalía
4. **Notion** — Nueva propiedad `Business Unit` (Select) en la base de Proyectos. Tareas heredan BU de su Proyecto. El pipeline `notion-bq-sync` la extrae a BigQuery
5. **Greenhouse portal** — `getTenantContext()` consume `businessLines` desde `client_service_modules` con FK validada. Admin UI para gestionar BUs en `/agency/settings`

**Lo que NO es este objeto:**
- No tiene EO-ID (`EO-BU-XXXX`). No es un objeto 360 con ciclo de vida transaccional
- No tiene pipeline ni estado. Las BUs son estáticas — son 5 y no cambian frecuentemente
- No reemplaza el Capability Registry ni `service_modules`. Es la dimension table que esos sistemas referencian

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/business-units`
- **Framework:** Next.js 16.1.1, React 19.2.3, MUI 7.x, TypeScript 5.9.3, Vuexy Admin Template
- **Deploy:** Vercel (Pro)
- **PostgreSQL:** Instance `greenhouse-pg-dev`, database `greenhouse_app`, schema `greenhouse_core`
- **BigQuery:** Datasets `greenhouse` (legacy), `greenhouse_conformed`, `ico_engine`
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Modelo de roles, route groups, enforcement. Admin BU usa route group `agency` |
| `Greenhouse_Account_360_Object_Model_v1.md` | Patrón canónico de objetos. BU NO sigue este patrón (no es objeto 360) pero debe ser consistente |
| `Greenhouse_Services_Architecture_v1.md` | Modelo de servicios. `ef_linea_de_servicio` migra a FK contra `business_units.slug` |
| `Greenhouse_ICO_Engine_v1.md` | Motor de métricas. BU habilita nueva granularidad de agregación |
| `CODEX_TASK_Financial_Intelligence_Layer.md` | `fin_cost_allocations.target_id` y views de P&L migran a FK |
| `CODEX_TASK_HR_Core_Module.md` | `departments.business_unit` migra a FK |
| `GREENHOUSE_SERVICE_MODULES_V1.md` | `service_modules` con `module_kind = 'business_line'` — coexiste, no se reemplaza |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Design tokens, colores, tipografía |
| `ecosistema_efeonce_group_v5_2.docx` | Definición oficial de las 4 unidades + CRM Solutions |

---

## Dependencias previas

### DEBE existir

- [ ] Schema `greenhouse_core` creado en PostgreSQL (`greenhouse-pg-dev`)
- [ ] Auth con NextAuth.js funcionando
- [ ] Dataset `greenhouse_conformed` creado en BigQuery
- [ ] Pipeline `notion-bq-sync` operativo sincronizando `notion_ops.tareas` y `notion_ops.proyectos`
- [ ] Pipeline `hubspot-bigquery` operativo sincronizando `hubspot_crm.companies`

### Deseable pero no bloqueante

- [ ] Services Architecture implementada en PostgreSQL (sin ella, la FK en `services` es P2)
- [ ] Financial Module implementado (sin él, la migración de `fin_*` es P2)
- [ ] HR Core implementado (sin él, la migración de `departments` es P2)
- [ ] ICO Engine materializado (sin él, la nueva granularidad BU es P2)

---

## Fases de implementación

```
P0 — Tabla canónica + BigQuery dimension + seed data
P1 — Notion: agregar propiedad BU en Proyectos + sync pipeline
P2 — Migraciones FK en tablas existentes (departments, fin_*, services)
P3 — ICO Engine: nueva granularidad BU
P4 — Admin UI en Greenhouse portal
```

---

## PARTE A: Tabla canónica en PostgreSQL (P0)

### A1. Tabla `greenhouse_core.business_units`

```sql
CREATE TABLE greenhouse_core.business_units (
  -- Identidad
  slug              TEXT PRIMARY KEY,           -- 'globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'
  label             TEXT NOT NULL,              -- 'Globe'
  label_full        TEXT,                       -- 'Globe — Creative & Content'
  claim             TEXT,                       -- 'Empower your Brand'
  
  -- Posición en el ecosistema
  loop_phase        TEXT NOT NULL,              -- 'express', 'tailor_evolve', 'amplify', 'transversal'
  loop_phase_label  TEXT NOT NULL,              -- 'EXPRESS', 'TAILOR + EVOLVE', 'AMPLIFY', 'TRANSVERSAL'
  
  -- Liderazgo
  lead_person_id    UUID,                       -- FK → greenhouse_core.persons(id) cuando Account 360 esté implementado
  lead_name         TEXT,                       -- Snapshot del nombre del lead (para queries sin JOIN)
  
  -- Presentación
  color_hex         TEXT NOT NULL,              -- Color primario para charts/UI. Del brand de cada unidad
  color_bg          TEXT,                       -- Color de fondo (8% opacity variant)
  icon_name         TEXT,                       -- Nombre de ícono Tabler para sidebar/cards
  
  -- Metadata
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INT NOT NULL DEFAULT 0,
  description       TEXT,                       -- Descripción breve de la unidad
  
  -- HubSpot mapping
  hubspot_enum_value TEXT NOT NULL UNIQUE,      -- Valor exacto en el enum de HubSpot: 'globe', 'efeonce_digital', etc.
  
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para lookup por HubSpot enum
CREATE INDEX idx_bu_hubspot_enum ON greenhouse_core.business_units(hubspot_enum_value);
```

### A2. Seed data

```sql
INSERT INTO greenhouse_core.business_units
  (slug, label, label_full, claim, loop_phase, loop_phase_label, color_hex, color_bg, icon_name, hubspot_enum_value, sort_order, description)
VALUES
  ('globe',
   'Globe',
   'Globe — Creative & Content',
   'Empower your Brand',
   'express',
   'EXPRESS',
   '#E8593C',     -- Sunset Orange / Coral
   'rgba(232,89,60,0.08)',
   'palette',
   'globe',
   1,
   'Identidad de marca, creatividad, contenido full-funnel, producción audiovisual, campañas ATL/BTL, copywriting'),

  ('efeonce_digital',
   'Efeonce Digital',
   'Efeonce Digital — Strategy & Growth',
   'Empower your Growth',
   'tailor_evolve',
   'TAILOR + EVOLVE',
   '#0375DB',     -- Core Blue
   'rgba(3,117,219,0.08)',
   'chart-dots-3',
   'efeonce_digital',
   2,
   'Estrategia GTM, Revenue Ops, CRM, SEO/AEO, redes sociales, pauta digital, analytics, Martech, AI agents'),

  ('reach',
   'Reach',
   'Reach — Media & Distribution',
   'Empower your Voice',
   'amplify',
   'AMPLIFY',
   '#7F77DD',     -- Orchid Purple
   'rgba(127,119,221,0.08)',
   'speakerphone',
   'reach',
   3,
   'Planificación y compra de medios ATL/digital, PR, influencers, negociación GRP/TRP'),

  ('wave',
   'Wave',
   'Wave — Technology & Infrastructure',
   'Empower your Engine',
   'transversal',
   'TRANSVERSAL',
   '#1D9E75',     -- Teal/Green
   'rgba(29,158,117,0.08)',
   'code',
   'wave',
   4,
   'Infraestructura digital, web performance, tracking, DSP/DMP/CDP, integraciones, automatización'),

  ('crm_solutions',
   'CRM Solutions',
   'CRM Solutions — HubSpot & Salesforce',
   'Empower your CRM',
   'tailor_evolve',
   'TAILOR + EVOLVE',
   '#BA7517',     -- Amber
   'rgba(186,117,23,0.08)',
   'database',
   'crm_solutions',
   5,
   'Licenciamiento HubSpot, implementación y onboarding, consultoría CRM');
```

### A3. Constraint de validación

Agregar un tipo enum en PostgreSQL para que cualquier columna que referencie BU tenga validación a nivel de DB:

```sql
-- Tipo enum alternativo (para columnas que no pueden hacer FK directa)
CREATE TYPE greenhouse_core.business_unit_slug AS ENUM (
  'globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'
);
```

**Nota:** Este enum es un safety net adicional. La fuente de verdad es la tabla `business_units`. Si en el futuro se agrega una BU, hay que alterar el enum también. La recomendación es usar FK a la tabla en vez del enum donde sea posible.

---

## PARTE B: BigQuery dimension table (P0)

### B1. Tabla `greenhouse_conformed.dim_business_units`

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.dim_business_units` (
  slug              STRING NOT NULL,
  label             STRING NOT NULL,
  label_full        STRING,
  claim             STRING,
  loop_phase        STRING NOT NULL,
  loop_phase_label  STRING NOT NULL,
  lead_name         STRING,
  color_hex         STRING NOT NULL,
  hubspot_enum_value STRING NOT NULL,
  is_active         BOOL NOT NULL,
  sort_order        INT64 NOT NULL,
  description       STRING,
  _synced_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B2. ETL nocturno: PostgreSQL → BigQuery

Agregar al scheduled ETL existente (o crear uno nuevo si no hay ETL PostgreSQL → BigQuery todavía):

```sql
-- Scheduled query: 03:10 AM (antes del ICO Engine a las 03:15)
-- Destination: greenhouse_conformed.dim_business_units (WRITE_TRUNCATE)

-- Si el ETL es via Cloud Function / query federada:
SELECT
  slug,
  label,
  label_full,
  claim,
  loop_phase,
  loop_phase_label,
  lead_name,
  color_hex,
  hubspot_enum_value,
  is_active,
  sort_order,
  description,
  CURRENT_TIMESTAMP() AS _synced_at
FROM EXTERNAL_QUERY(
  'projects/efeonce-group/locations/us-east4/connections/greenhouse-pg-dev',
  'SELECT * FROM greenhouse_core.business_units WHERE is_active = true'
);
```

**Alternativa si no hay conexión federada:** Un script de sync en la Cloud Function existente, o seed manual de la tabla BQ con los mismos 5 registros hasta que el ETL esté operativo.

### B3. Seed manual de BigQuery (fallback inmediato)

Para desbloquear P1-P3 sin esperar el ETL:

```sql
INSERT INTO `efeonce-group.greenhouse_conformed.dim_business_units`
  (slug, label, label_full, claim, loop_phase, loop_phase_label, lead_name, color_hex, hubspot_enum_value, is_active, sort_order, description)
VALUES
  ('globe', 'Globe', 'Globe — Creative & Content', 'Empower your Brand', 'express', 'EXPRESS', NULL, '#E8593C', 'globe', true, 1, 'Identidad de marca, creatividad, contenido full-funnel'),
  ('efeonce_digital', 'Efeonce Digital', 'Efeonce Digital — Strategy & Growth', 'Empower your Growth', 'tailor_evolve', 'TAILOR + EVOLVE', NULL, '#0375DB', 'efeonce_digital', true, 2, 'Estrategia GTM, Revenue Ops, CRM, SEO/AEO'),
  ('reach', 'Reach', 'Reach — Media & Distribution', 'Empower your Voice', 'amplify', 'AMPLIFY', NULL, '#7F77DD', 'reach', true, 3, 'Planificación y compra de medios ATL/digital, PR, influencers'),
  ('wave', 'Wave', 'Wave — Technology & Infrastructure', 'Empower your Engine', 'transversal', 'TRANSVERSAL', NULL, '#1D9E75', 'wave', true, 4, 'Infraestructura digital, web performance, tracking'),
  ('crm_solutions', 'CRM Solutions', 'CRM Solutions — HubSpot & Salesforce', 'Empower your CRM', 'tailor_evolve', 'TAILOR + EVOLVE', NULL, '#BA7517', 'crm_solutions', true, 5, 'Licenciamiento HubSpot, implementación y onboarding');
```

---

## PARTE C: Notion — Propiedad Business Unit en Proyectos (P1)

### C1. Nueva propiedad en la base de Proyectos

**Base:** Proyectos (`15288d9b145940529acc75439bbd5470`)

| Propiedad | Tipo | Opciones |
|-----------|------|----------|
| `Business Unit` | Select | `Globe`, `Efeonce Digital`, `Reach`, `Wave`, `CRM Solutions` |

**Colores de las opciones en Notion:** Usar los colores más cercanos disponibles en Notion Select:
- Globe → Red/Orange
- Efeonce Digital → Blue
- Reach → Purple
- Wave → Green
- CRM Solutions → Yellow/Brown

**Regla operativa:** Todo proyecto nuevo DEBE tener Business Unit asignada. Esto es responsabilidad del equipo de operaciones al crear el proyecto. La propiedad no tiene fórmula — es input manual porque un proyecto puede ser operado por una BU diferente a la línea principal del cliente (ej: un proyecto de desarrollo web para un cliente Globe es `Wave`, no `Globe`).

### C2. Herencia en Tareas

Las Tareas tienen una relación existente con Proyectos. Para que la BU fluya a Tareas:

**Opción A (recomendada): Rollup en Tareas**
Crear un Rollup en la base de Tareas que lea `Business Unit` del Proyecto relacionado. Esto fluye automáticamente a BigQuery con el sync diario sin cambios en el pipeline.

**Opción B: Fórmula en Tareas**
Si el rollup no funciona bien con el pipeline (los rollups de select pueden serializar diferente), crear una Fórmula que extraiga el valor del rollup como texto.

### C3. Backfill de proyectos existentes

**Acción manual requerida:** Asignar Business Unit a todos los proyectos existentes en Notion. Esto es un one-time effort del equipo de operaciones.

Para facilitar: generar un reporte de proyectos sin BU asignada después del primer sync:

```sql
SELECT
  titulo,
  notion_page_id,
  business_unit
FROM `efeonce-group.notion_ops.proyectos`
WHERE business_unit IS NULL
ORDER BY titulo;
```

### C4. Cambios en el pipeline `notion-bq-sync`

El pipeline usa schema inference dinámico — las nuevas propiedades aparecen automáticamente en BigQuery al primer sync después de que se agreguen en Notion. **No se necesitan cambios en el código del pipeline.**

Verificar después del primer sync que la columna aparece:

```sql
SELECT column_name, data_type
FROM `efeonce-group.notion_ops.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'proyectos'
  AND column_name = 'business_unit';
```

Si el nombre de la propiedad en Notion es diferente (ej: "Business Unit" con espacio), el pipeline lo normalizará como `business_unit` (lowercase, underscores).

---

## PARTE D: HubSpot — Validación downstream (P1)

### D1. Validación en el sync `hubspot-bigquery`

Agregar validación post-sync en la Cloud Function `cesargrowth11/hubspot-bigquery`:

```sql
-- Query de anomalías: valores de linea_de_servicio que no existen en dim_business_units
SELECT
  c.hs_object_id,
  c.name,
  c.linea_de_servicio,
  'UNKNOWN_BUSINESS_UNIT' AS anomaly_type
FROM `efeonce-group.hubspot_crm.companies` c
LEFT JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
  ON c.linea_de_servicio = bu.hubspot_enum_value
WHERE c.linea_de_servicio IS NOT NULL
  AND c.linea_de_servicio != ''
  AND bu.slug IS NULL;
```

**Acción:** Logear anomalías en `greenhouse_conformed.sync_anomalies` (tabla nueva si no existe). No bloquear el sync — solo registrar.

### D2. Tabla de anomalías (opcional, recomendada)

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.sync_anomalies` (
  anomaly_id STRING NOT NULL,
  source_system STRING NOT NULL,           -- 'hubspot', 'notion'
  source_table STRING NOT NULL,            -- 'companies', 'proyectos'
  source_record_id STRING NOT NULL,
  anomaly_type STRING NOT NULL,            -- 'UNKNOWN_BUSINESS_UNIT', 'MISSING_BUSINESS_UNIT'
  anomaly_detail STRING,                   -- El valor problemático
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  resolved_at TIMESTAMP,
  resolved_by STRING
);
```

---

## PARTE E: Migraciones FK en tablas existentes (P2)

### E1. `greenhouse_core.departments` — PostgreSQL

```sql
-- Agregar FK
ALTER TABLE greenhouse_core.departments
  ADD CONSTRAINT fk_dept_business_unit
  FOREIGN KEY (business_unit) REFERENCES greenhouse_core.business_units(slug);
```

**Prerequisito:** Verificar que los valores actuales de `departments.business_unit` coinciden con los slugs en `business_units`. El valor `'shared'` que aparece en el seed data de HR Core NO existe como BU. Decisión:
- **Opción A:** Crear una BU `'shared_services'` para funciones transversales (administración, finanzas, HR)
- **Opción B:** Hacer `business_unit` nullable en departments y usar NULL para departamentos transversales
- **Recomendación:** Opción B. Los shared services no son una BU comercial — son overhead

```sql
-- Si se elige Opción B:
ALTER TABLE greenhouse_core.departments
  ALTER COLUMN business_unit DROP NOT NULL;

-- Actualizar seed: 'shared' → NULL
UPDATE greenhouse_core.departments
SET business_unit = NULL
WHERE business_unit = 'shared';
```

### E2. `greenhouse.fin_cost_allocations` — BigQuery

Hoy `target_type = 'service_line'` usa `target_id` como string libre (`'globe'`, `'efeonce_digital'`, etc.). No hay FK real en BigQuery, pero podemos validar en la view:

```sql
-- View validada de cost allocations por BU
CREATE OR REPLACE VIEW `efeonce-group.greenhouse.v_cost_allocations_by_bu` AS
SELECT
  ca.*,
  bu.label AS bu_label,
  bu.color_hex AS bu_color,
  bu.loop_phase
FROM `efeonce-group.greenhouse.fin_cost_allocations` ca
JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
  ON ca.target_id = bu.slug
WHERE ca.target_type = 'service_line';
```

### E3. `greenhouse.fin_income` y `greenhouse.fin_expenses` — BigQuery

Agregar JOIN en las views analíticas existentes:

```sql
-- Reemplazar v_revenue_by_service_line con versión validada
CREATE OR REPLACE VIEW `efeonce-group.greenhouse.v_revenue_by_service_line` AS
SELECT
  FORMAT_DATE('%Y-%m', fi.invoice_date) AS period,
  bu.slug AS business_unit_slug,
  bu.label AS business_unit_label,
  bu.color_hex,
  bu.sort_order,
  fi.income_type,
  COUNT(*) AS invoice_count,
  SUM(fi.total_amount_clp) AS revenue_clp,
  SUM(CASE WHEN fi.payment_status = 'paid' THEN fi.total_amount_clp ELSE 0 END) AS collected_clp,
  SUM(CASE WHEN fi.payment_status IN ('pending', 'overdue', 'partial') THEN fi.amount_pending ELSE 0 END) AS pending_clp
FROM `efeonce-group.greenhouse.fin_income` fi
LEFT JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
  ON fi.service_line = bu.slug
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY 1 DESC, revenue_clp DESC;
```

### E4. `greenhouse_core.services` — PostgreSQL (cuando Services Architecture se implemente)

```sql
-- Agregar FK en services
ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT fk_svc_business_unit
  FOREIGN KEY (linea_de_servicio) REFERENCES greenhouse_core.business_units(slug);
```

### E5. `greenhouse.service_modules` — BigQuery

La tabla `service_modules` ya tiene registros con `module_kind = 'business_line'`. Estos registros **coexisten** con la tabla `business_units` — no se reemplazan. El flujo es:

- `business_units` = dimension table canónica (metadata + validación)
- `service_modules` donde `module_kind = 'business_line'` = catálogo de product composition (qué módulos habilita cada BU)
- `client_service_modules` = assignment registry (qué BU tiene activa cada cliente)

Agregar validación cruzada:

```sql
-- Verificar consistencia entre service_modules y dim_business_units
SELECT
  sm.module_code,
  sm.module_label,
  bu.slug AS bu_match
FROM `efeonce-group.greenhouse.service_modules` sm
LEFT JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
  ON sm.module_code = bu.slug
WHERE sm.module_kind = 'business_line'
  AND bu.slug IS NULL;
-- Resultado esperado: 0 filas (todos los business_line modules tienen BU match)
```

---

## PARTE F: ICO Engine — Granularidad Business Unit (P3)

### F1. Nueva view: `ico_engine.v_tareas_by_bu`

Cuando Notion tenga la propiedad Business Unit en Proyectos y el sync la extraiga:

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_tareas_by_bu` AS
SELECT
  tp.*,
  p.business_unit,
  bu.label AS business_unit_label,
  bu.loop_phase,
  bu.color_hex AS bu_color
FROM `efeonce-group.ico_engine.v_tareas_by_project` tp
LEFT JOIN `efeonce-group.notion_ops.proyectos` p
  ON tp.project_id = p.notion_page_id
LEFT JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
  ON p.business_unit = bu.label   -- Notion Select almacena el label, no el slug
```

**IMPORTANTE:** Notion Select almacena el label visible (`'Globe'`, `'Efeonce Digital'`), no el slug (`'globe'`, `'efeonce_digital'`). El JOIN necesita un mapeo. Dos opciones:

**Opción A (recomendada):** Agregar columna `notion_label` a `dim_business_units` que contenga el valor exacto como aparece en el Select de Notion. JOIN por `notion_label`.

**Opción B:** Normalizar en la view con `LOWER(REPLACE(...))`. Menos limpio pero funcional.

Si se elige Opción A, agregar al schema:

```sql
-- En PostgreSQL
ALTER TABLE greenhouse_core.business_units
  ADD COLUMN notion_label TEXT;

UPDATE greenhouse_core.business_units SET notion_label = 'Globe' WHERE slug = 'globe';
UPDATE greenhouse_core.business_units SET notion_label = 'Efeonce Digital' WHERE slug = 'efeonce_digital';
UPDATE greenhouse_core.business_units SET notion_label = 'Reach' WHERE slug = 'reach';
UPDATE greenhouse_core.business_units SET notion_label = 'Wave' WHERE slug = 'wave';
UPDATE greenhouse_core.business_units SET notion_label = 'CRM Solutions' WHERE slug = 'crm_solutions';

-- En BigQuery dim_business_units: agregar columna notion_label al schema
```

### F2. Nueva tabla materializada: `ico_engine.metrics_by_bu`

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.metrics_by_bu` (
  -- Dimensiones
  business_unit_slug STRING NOT NULL,
  business_unit_label STRING,
  period STRING NOT NULL,
  period_type STRING NOT NULL,
  
  -- Métricas (misma estructura que metrics_by_project/service/space)
  rpa_avg FLOAT64,
  rpa_median FLOAT64,
  ftr_pct FLOAT64,
  total_tasks INT64,
  completed_tasks INT64,
  cycle_time_avg FLOAT64,
  cycle_time_p50 FLOAT64,
  cycle_time_p90 FLOAT64,
  cycle_time_variance FLOAT64,
  otd_pct FLOAT64,
  throughput_weekly FLOAT64,
  pipeline_planning INT64,
  pipeline_briefing INT64,
  pipeline_production INT64,
  pipeline_approval INT64,
  pipeline_asset_mgmt INT64,
  pipeline_activation INT64,
  pipeline_completed INT64,
  stuck_count_48h INT64,
  stuck_count_96h INT64,
  
  -- Metadata
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### F3. Scheduled query para materializar métricas por BU

Agregar al scheduled query existente del ICO Engine (03:15 AM), después de la materialización por project:

```sql
-- TRUNCATE + INSERT: metrics_by_bu
MERGE `efeonce-group.ico_engine.metrics_by_bu` T
USING (
  SELECT
    bu.slug AS business_unit_slug,
    bu.label AS business_unit_label,
    'all_time' AS period,
    'all_time' AS period_type,
    AVG(te.rpa_calculated) AS rpa_avg,
    APPROX_QUANTILES(te.rpa_calculated, 2)[OFFSET(1)] AS rpa_median,
    SAFE_DIVIDE(
      COUNTIF(te.first_time_right = true),
      COUNTIF(te.estado IN ('Listo', 'Completado', 'Aprobado', 'Publicado', 'Activado'))
    ) * 100 AS ftr_pct,
    COUNT(*) AS total_tasks,
    COUNTIF(te.estado IN ('Listo', 'Completado')) AS completed_tasks,
    AVG(te.cycle_time_days) AS cycle_time_avg,
    APPROX_QUANTILES(te.cycle_time_days, 2)[OFFSET(1)] AS cycle_time_p50,
    APPROX_QUANTILES(te.cycle_time_days, 100)[OFFSET(90)] AS cycle_time_p90,
    SAFE_DIVIDE(STDDEV(te.cycle_time_days), AVG(te.cycle_time_days)) * 100 AS cycle_time_variance,
    -- OTD%: placeholder hasta que target dates estén disponibles
    NULL AS otd_pct,
    SAFE_DIVIDE(
      COUNTIF(te.fase_csc = 'Completado'
        AND te.last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)),
      4.0
    ) AS throughput_weekly,
    COUNTIF(te.fase_csc = 'Planning') AS pipeline_planning,
    COUNTIF(te.fase_csc = 'Briefing') AS pipeline_briefing,
    COUNTIF(te.fase_csc = 'Producción') AS pipeline_production,
    COUNTIF(te.fase_csc = 'Aprobación') AS pipeline_approval,
    COUNTIF(te.fase_csc = 'Asset Mgmt') AS pipeline_asset_mgmt,
    COUNTIF(te.fase_csc = 'Activación') AS pipeline_activation,
    COUNTIF(te.fase_csc = 'Completado') AS pipeline_completed,
    COUNTIF(te.hours_since_update > 48 AND te.fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_48h,
    COUNTIF(te.hours_since_update > 96 AND te.fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_96h
  FROM `efeonce-group.ico_engine.v_tareas_enriched` te
  LEFT JOIN `efeonce-group.notion_ops.proyectos` p
    ON te.proyecto LIKE CONCAT('%', p.notion_page_id, '%')
  LEFT JOIN `efeonce-group.greenhouse_conformed.dim_business_units` bu
    ON p.business_unit = bu.notion_label
  WHERE bu.slug IS NOT NULL
  GROUP BY 1, 2
) S
ON FALSE
WHEN NOT MATCHED THEN INSERT VALUES (
  S.business_unit_slug, S.business_unit_label, S.period, S.period_type,
  S.rpa_avg, S.rpa_median, S.ftr_pct, S.total_tasks, S.completed_tasks,
  S.cycle_time_avg, S.cycle_time_p50, S.cycle_time_p90, S.cycle_time_variance,
  S.otd_pct, S.throughput_weekly,
  S.pipeline_planning, S.pipeline_briefing, S.pipeline_production,
  S.pipeline_approval, S.pipeline_asset_mgmt, S.pipeline_activation, S.pipeline_completed,
  S.stuck_count_48h, S.stuck_count_96h,
  CURRENT_TIMESTAMP()
);
```

**Nota:** Este query usa MERGE con `ON FALSE` como patrón de TRUNCATE+INSERT. Alternativa: usar el scheduling con `WRITE_TRUNCATE` como las otras tablas del ICO Engine.

### F4. Actualizar Metric Registry

Agregar `'business_unit'` como nueva granularidad en el Metric Registry:

```typescript
// En /src/config/ico-metric-registry.ts

export type Granularity = 'task' | 'project' | 'service' | 'package' | 'space' | 'business_unit'

// Actualizar cada métrica que tenga granularidades ['project', 'service', 'space']
// para incluir 'business_unit':
// granularities: ['project', 'service', 'business_unit', 'space']
```

---

## PARTE G: Greenhouse portal — TypeScript types + Admin UI (P4)

### G1. Tipos TypeScript

```typescript
// /src/types/business-unit.ts

export interface BusinessUnit {
  slug: string
  label: string
  labelFull: string | null
  claim: string | null
  loopPhase: 'express' | 'tailor_evolve' | 'amplify' | 'transversal'
  loopPhaseLabel: string
  leadPersonId: string | null
  leadName: string | null
  colorHex: string
  colorBg: string | null
  iconName: string | null
  isActive: boolean
  sortOrder: number
  description: string | null
  hubspotEnumValue: string
  notionLabel: string | null
}

export type BusinessUnitSlug = 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'
```

### G2. API Route: GET /api/business-units

```
GET /api/business-units
→ Auth: cualquier usuario autenticado
→ Cache: revalidate 3600s (BUs no cambian frecuentemente)
→ Response: BusinessUnit[]
```

```typescript
// /src/app/api/business-units/route.ts
// Query: SELECT * FROM greenhouse_core.business_units WHERE is_active = true ORDER BY sort_order
```

### G3. Actualizar `getTenantContext()`

En el runtime del portal, `getTenantContext()` ya expone `businessLines: string[]`. Actualizar para que:

1. Lea de `client_service_modules` (ya existente) donde `module_kind = 'business_line'`
2. Valide cada `module_code` contra la API de business units (o contra una constante cacheada)
3. Exponga metadata adicional: `businessUnits: BusinessUnit[]` además del array de strings

```typescript
// En getTenantContext():
export interface TenantContext {
  // ... existente
  businessLines: string[]           // Mantener para backward compatibility
  businessUnits: BusinessUnit[]     // NUEVO: objetos completos con metadata
}
```

### G4. Admin UI: `/agency/settings/business-units`

**Vista minimalista.** Las BUs no se crean/eliminan frecuentemente. Es más una vista de consulta con edición ligera.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Business Units                                          [+ Nueva]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┐  │
│  │ ● Globe                    EXPRESS          #E8593C    Activa │  │
│  │   Identidad de marca, creatividad, contenido...      [Editar]│  │
│  ├──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┤  │
│  │ ● Efeonce Digital          TAILOR + EVOLVE  #0375DB    Activa │  │
│  │   Estrategia GTM, Revenue Ops, CRM...                [Editar]│  │
│  ├──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┤  │
│  │ ● Reach                    AMPLIFY          #7F77DD    Activa │  │
│  │   Planificación y compra de medios...                [Editar]│  │
│  ├──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┤  │
│  │ ● Wave                     TRANSVERSAL      #1D9E75    Activa │  │
│  │   Infraestructura digital, web performance...        [Editar]│  │
│  ├──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┤  │
│  │ ● CRM Solutions            TAILOR + EVOLVE  #BA7517    Activa │  │
│  │   Licenciamiento HubSpot, implementación...          [Editar]│  │
│  └──── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Acceso:** Route group `agency`. Rol `efeonce_admin` requerido.

**Drawer de edición:** Campos editables: label, label_full, claim, description, lead (select de personas), color_hex, icon, is_active. El slug y hubspot_enum_value NO son editables (son identidad).

**Acciones destructivas:** No hay delete. Solo desactivar (`is_active = false`). Si una BU se desactiva, las FKs existentes siguen siendo válidas pero la BU no aparece en selects ni en la UI del portal.

---

## PARTE H: Flujo de datos consolidado

### H1. Diagrama de flujo

```
HubSpot                           Notion                          Greenhouse
─────────                         ──────                          ──────────
                                                                  
Company                           Proyectos DB                    PostgreSQL
 linea_de_servicio ─────┐          Business Unit (Select) ─────┐   greenhouse_core.business_units
                        │                                      │   (FUENTE DE VERDAD)
Service (0-162)         │         Tareas DB                    │        │
 ef_linea_de_servicio ──┤          (hereda BU del Proyecto) ───┤        │
                        │                                      │        ▼
                        ▼                                      ▼   BigQuery
                   hubspot-bq-sync                        notion-bq-sync
                   (03:30 AM)                             (03:00 AM)
                        │                                      │
                        ▼                                      ▼
                   hubspot_crm.companies               notion_ops.proyectos
                   hubspot_crm.services_0162           notion_ops.tareas
                        │                                      │
                        │    ┌─────────────────────────────┐   │
                        └───►│ greenhouse_conformed         │◄──┘
                             │ .dim_business_units          │
                             │ (ETL 03:10 AM desde PG)      │
                             └──────────┬──────────────────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   ico_engine      greenhouse     greenhouse
                   .metrics_by_bu  .v_revenue_    .v_cost_
                                   by_service_    allocations_
                                   line           by_bu
```

### H2. Horarios de sync (cadena de dependencias)

| Hora | Pipeline | Qué produce |
|------|----------|-------------|
| 03:00 AM | `notion-bq-sync` | `notion_ops.tareas`, `notion_ops.proyectos` (con Business Unit) |
| 03:10 AM | ETL PostgreSQL → BigQuery | `greenhouse_conformed.dim_business_units` |
| 03:15 AM | ICO Engine scheduled queries | `ico_engine.metrics_by_project`, `metrics_by_bu` (NUEVO) |
| 03:30 AM | `hubspot-bq-sync` | `hubspot_crm.companies`, `hubspot_crm.services_0162` |
| 03:35 AM | Anomaly detection (NUEVO) | `greenhouse_conformed.sync_anomalies` |

---

## Estructura de archivos (cambios al repo)

```
src/
├── types/
│   └── business-unit.ts                    # NUEVO: tipos BusinessUnit
├── config/
│   └── ico-metric-registry.ts              # MODIFICAR: agregar granularidad 'business_unit'
├── lib/
│   └── queries/
│       └── business-units.ts               # NUEVO: queries PostgreSQL para BUs
├── app/
│   ├── api/
│   │   └── business-units/
│   │       └── route.ts                    # NUEVO: GET /api/business-units
│   └── (dashboard)/
│       └── agency/
│           └── settings/
│               └── business-units/
│                   └── page.tsx            # NUEVO: Admin UI de BUs

scripts/
└── sql/
    ├── create-business-units.sql           # NUEVO: DDL PostgreSQL
    ├── seed-business-units.sql             # NUEVO: Seed data
    ├── create-dim-business-units-bq.sql    # NUEVO: DDL BigQuery
    └── create-metrics-by-bu.sql            # NUEVO: DDL ICO Engine
```

---

## Criterios de aceptación

### P0 — Tabla canónica

- [ ] Tabla `greenhouse_core.business_units` existe en PostgreSQL con 5 registros seed
- [ ] Tabla `greenhouse_conformed.dim_business_units` existe en BigQuery con datos
- [ ] Query `SELECT * FROM greenhouse_core.business_units` retorna 5 filas con todos los campos populados

### P1 — Notion + HubSpot validation

- [ ] La base de Proyectos en Notion tiene propiedad `Business Unit` de tipo Select con 5 opciones
- [ ] Al menos 1 proyecto tiene Business Unit asignada y el valor aparece en `notion_ops.proyectos.business_unit` después del sync
- [ ] El rollup/fórmula en Tareas hereda BU del Proyecto
- [ ] Query de anomalías de HubSpot ejecuta sin errores (puede retornar 0 filas)

### P2 — Migraciones FK

- [ ] `departments.business_unit` tiene FK a `business_units.slug` (o es nullable para shared)
- [ ] `v_revenue_by_service_line` incluye JOIN contra `dim_business_units`
- [ ] `v_cost_allocations_by_bu` funciona correctamente

### P3 — ICO Engine

- [ ] Tabla `ico_engine.metrics_by_bu` existe y se materializa en el scheduled query
- [ ] La view `ico_engine.v_tareas_by_bu` retorna tareas con BU enriquecida
- [ ] Metric Registry tiene `'business_unit'` como granularidad válida

### P4 — Admin UI

- [ ] Ruta `/agency/settings/business-units` renderiza lista de BUs
- [ ] Drawer de edición permite modificar label, description, lead, color
- [ ] `getTenantContext()` expone `businessUnits: BusinessUnit[]`

---

## Notas para el agente

1. **P0 es self-contained.** Crear tabla PostgreSQL + BigQuery seed sin depender de nada más. Esto desbloquea P1-P4 en paralelo
2. **P1 requiere acción manual en Notion.** El agente NO puede crear propiedades en Notion via API en el plan actual. Documentar instrucciones para el equipo de operaciones
3. **El JOIN Notion → BU dimension usa `notion_label`, no `slug`.** Notion Select almacena el label visible. La columna `notion_label` en `dim_business_units` resuelve esto sin normalización en cada query
4. **No crear EO-ID para BUs.** Esto fue una decisión explícita. El slug es el identificador. Si en el futuro se necesita EO-ID, se agrega como campo — no como cambio de PK
5. **`service_modules` con `module_kind = 'business_line'` coexiste.** No eliminar ni migrar esos registros. Son el catálogo de product composition. `business_units` es la dimension table con metadata rica. Ambos conviven
6. **Respetar Nomenclatura Portal v3** para toda la UI: colores de `GH_COLORS`, tipografía Poppins/DM Sans, componentes Vuexy
7. **El scheduled query del ICO Engine (03:15 AM) debe correr DESPUÉS del ETL de BU (03:10 AM).** Verificar que la cadena de dependencias temporales se respeta
8. **Leer `AGENTS.md` en el repo** antes de escribir cualquier código
