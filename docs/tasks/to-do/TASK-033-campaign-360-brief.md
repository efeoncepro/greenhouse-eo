# CODEX TASK — Campaign 360: Entidad de Campaña para Greenhouse

## Estado 2026-03-18

Este brief se conserva como framing original de producto y alcance funcional.

Para implementacion nueva, modelado de datos e integracion con el runtime actual, usar como baseline:
- `docs/tasks/to-do/CODEX_TASK_Campaign_360_v2.md`

En particular, la implementacion no debe asumir literalmente:
- `UUID` como patron obligatorio de PK/FK
- `notion_project_ids[]` como backbone estructural del objeto
- `greenhouse_olap` como source of truth de Campaign

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/to-do/CODEX_TASK_Campaign_360_v2.md`

## Resumen

Implementar el objeto **Campaign** (`EO-CMP-XXXX`) como entidad canónica de Greenhouse que agrupa proyectos de Notion bajo una intención de negocio compartida. Campaign es la unidad de iniciativa — lo que el cliente reconoce como "la campaña de Vacaciones de Invierno" o "el lanzamiento de Q3" — y habilita métricas ICO agregadas a un nivel que hoy no existe: entre Service/Project y Space.

**El problema hoy:** El ICO Engine materializa métricas a nivel task → project → service → space. Pero el CMO piensa en campañas, no en proyectos de Notion. Una campaña como "Vacaciones de Invierno 2026" involucra 3 proyectos (Key Visuals, Social Content, Material POP), cada uno de un servicio distinto (Agencia Creativa, Social Media Content, Performance). No hay forma de responder "¿cuál fue el OTD% de esa campaña?" o "¿cuántos assets produjo?" sin agregar manualmente.

**La solución:** Una entidad Campaign que:

1. **Agrupa proyectos** — Array de `notion_project_ids` que pertenecen a la campaña
2. **Es cross-service** — Una campaña puede contener proyectos de servicios distintos (Globe + Efeonce Digital + Reach)
3. **Habilita métricas ICO por campaña** — Nueva tabla materializada `ico_engine.metrics_by_campaign`
4. **Es visible para el cliente** — Ruta `/campanas` (ya anticipada en Identity Access V2)
5. **Se administra por operadores** — CRUD en `/agency/campaigns` o `/internal/campaigns`
6. **Nace en Greenhouse** — No depende de HubSpot Campaign ni de Notion; se enriquece automáticamente vía ICO Engine

**Lo que Campaign NO es:**

- **No reemplaza Service.** Service es la unidad comercial (lo que se vende y cobra). Campaign es la unidad de iniciativa (lo que se produce para un fin de negocio). Relación: una Campaign puede involucrar múltiples Services; un Service puede participar en múltiples Campaigns.
- **No reemplaza Project.** Projects siguen siendo la unidad operativa en Notion. Campaign agrupa Projects.
- **No tiene presupuesto propio en el MVP.** La conexión financiera (presupuesto asignado, costo real, margen por campaña) es una extensión futura vía addendum al Financial Intelligence Layer.
- **No gestiona equipo.** El equipo está en `client_team_assignments` (por Space). Campaign no tiene su propio roster.
- **No tiene pipeline de stages complejo.** Usa un status simple: `draft | active | completed | archived`.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/campaign-360`
- **Framework:** Next.js 16.1.1, React 19.2.3, MUI 7.x, TypeScript, Vuexy Admin Template
- **Deploy:** Vercel (Pro)
- **GCP Project:** `efeonce-group`
- **PostgreSQL:** Instance `greenhouse-pg-dev`, database `greenhouse_app`, schema `greenhouse_core`
- **BigQuery:** Datasets `ico_engine` (métricas), `greenhouse_olap` (OLAP mirror)

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_Account_360_Object_Model_v1.md` | **Patrón canónico.** Define Organization, Space, Person, EO-ID convention, PostgreSQL `greenhouse_core` patterns, secuencias, triggers, vistas contextuales |
| `Greenhouse_ICO_Engine_v1.md` | **Motor de métricas.** Define Metric Registry, Granularity types, tablas materializadas, scheduled queries, views de consumo. Campaign se monta encima |
| `Greenhouse_Services_Architecture_v1.md` | **Modelo de servicios.** Define cómo Service se vincula a Space y a Notion Projects vía `ef_notion_project_id`. Campaign es transversal a Services |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | **RBAC.** Define route groups (`/campanas` ya existe en `client`), roles, scopes (`campaign_subset` ya definido). Campaign respeta este modelo |
| `Greenhouse_Data_Node_Architecture_v1.md` | **Exports.** Define los 4 niveles de export. Campaign agrega una nueva vista exportable |
| `Greenhouse_Nomenclatura_Portal_v3.md` | **UX Writing.** Nomenclatura, design tokens, tratamiento de "tú", español neutro |
| `CODEX_TASK_Creative_Hub_Module.md` | **CSC Pipeline.** El Creative Hub gana agrupación por campaña. Campaign habilita pipeline view consolidada |
| `CODEX_TASK_Financial_Intelligence_Layer.md` | **Financiero (futuro).** Revenue Enabled y margen por campaña son extensiones futuras. El schema anticipa los campos nullable |
| `AGENTS.md` (en el repo) | Reglas operativas del repo |

---

## Dependencias previas

### DEBE existir

- [ ] Schema `greenhouse_core` creado en PostgreSQL (`greenhouse-pg-dev`)
- [ ] Función `greenhouse_core.generate_eo_id(prefix, seq_name)` existente (creada por Account 360)
- [ ] Función `update_updated_at()` existente (trigger helper de Account 360)
- [ ] Tabla `greenhouse_core.spaces` existente con `notion_project_ids` poblado
- [ ] Dataset `ico_engine` creado en BigQuery con views base operativas (`v_tareas_enriched`, `v_tareas_by_project`)
- [ ] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [ ] Pipeline `notion-bq-sync` operativo sincronizando `notion_ops.tareas` y `notion_ops.proyectos`

### Deseable pero no bloqueante

- [ ] Services Architecture implementada (sin ella, Campaign funciona — las relaciones campaign↔service se derivan transitivamente vía projects)
- [ ] Account 360 Object Model completo (`organizations`, `spaces`, `persons`, `person_memberships`)
- [ ] Creative Hub Module implementado (el pipeline tracker se beneficia de Campaign pero funciona sin él)
- [ ] Financial Intelligence Layer (la conexión financiera es Phase 2)

---

## Posición en la jerarquía de objetos

```
Organization (EO-ORG-XXXX)
  └── Space (EO-SPC-XXXX) — tenant operativo
        │
        ├── Services[] (EO-SRV-XXXX) — unidad comercial
        │     └── notion_project_id — 1:1 con proyecto Notion
        │
        └── Campaigns[] (EO-CMP-XXXX) — unidad de iniciativa (NUEVO)
              └── notion_project_ids[] — N proyectos Notion
                    └── Tasks/Assets (notion_ops.tareas)
```

**Relación Campaign ↔ Service:** Derivada transitivamente. Si un proyecto Notion pertenece a un Service (via `service.notion_project_id`) Y también pertenece a una Campaign (via `campaign.notion_project_ids`), entonces esa Campaign involucra ese Service. No hay tabla de join explícita — la relación se resuelve en views de BigQuery.

```
Campaign.notion_project_ids ──┐
                               ├── JOIN por project_id → servicios involucrados
Service.notion_project_id ────┘
```

**Relación Campaign ↔ Project:** Un proyecto puede pertenecer a 0 o 1 Campaign. (Un proyecto sin campaña es producción recurrente, no atada a una iniciativa específica. Un proyecto no puede pertenecer a 2 campañas simultáneamente — si ocurre, debe dividirse en 2 proyectos.)

---

## PARTE A: Infraestructura PostgreSQL

### A1. Tabla `greenhouse_core.campaigns`

Objeto canónico de Campaign. Sigue el patrón exacto de `organizations` y `spaces` (EO-ID, UUID PK, triggers, índices).

```sql
CREATE TABLE greenhouse_core.campaigns (
  -- Identidad canónica
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eo_id VARCHAR(20) UNIQUE NOT NULL,              -- EO-CMP-XXXX (humano-legible, inmutable)
  slug VARCHAR(150) UNIQUE NOT NULL,              -- URL-safe: 'sky-vacaciones-invierno-2026'

  -- Jerarquía
  space_id UUID NOT NULL REFERENCES greenhouse_core.spaces(id),

  -- Datos de la campaña
  display_name VARCHAR(255) NOT NULL,             -- "Vacaciones de Invierno 2026"
  description TEXT,                                -- Descripción corta para contexto
  campaign_type VARCHAR(50) NOT NULL DEFAULT 'campaign',
  -- Valores: 'campaign' (campaña estándar)
  --          'launch' (lanzamiento de producto/marca)
  --          'seasonal' (estacional recurrente)
  --          'always_on' (producción continua agrupada)
  --          'sprint' (sprint de producción acotado)

  -- Temporalidad
  planned_start_date DATE,                         -- Fecha planificada de inicio
  planned_end_date DATE,                           -- Fecha planificada de fin
  actual_start_date DATE,                          -- Fecha real de inicio (primera tarea en producción)
  actual_end_date DATE,                            -- Fecha real de fin (última tarea completada)

  -- Vínculos a Notion Projects
  notion_project_ids TEXT[] NOT NULL DEFAULT '{}', -- IDs de proyectos Notion que componen esta campaña

  -- Vínculos externos (opcionales, para enriquecimiento futuro)
  hubspot_campaign_id VARCHAR(50),                 -- HubSpot Campaign ID (si aplica, no obligatorio)
  hubspot_deal_ids TEXT[] DEFAULT '{}',            -- Deal(s) asociados (pueden ser varios)

  -- Campos financieros (anticipados, nullable — Phase 2)
  planned_budget DECIMAL(14,2),                    -- Presupuesto planificado
  planned_budget_currency VARCHAR(3),              -- CLP | USD
  -- El costo real se calcula vía ICO Engine + Financial Intelligence (no se almacena aquí)

  -- Revenue Enabled (anticipados, nullable — Phase 2)
  planned_launch_date DATE,                        -- Fecha de go-live planificada (para Early Launch Advantage)
  actual_launch_date DATE,                         -- Fecha real de go-live
  -- early_launch_advantage_days se calcula como: planned_launch_date - actual_launch_date (view, no campo)

  -- Tags y metadata de clasificación
  tags TEXT[] DEFAULT '{}',                        -- Tags libres: ['branding', 'Q2', 'digital']
  channels TEXT[] DEFAULT '{}',                    -- Canales de activación: ['atl', 'digital', 'btl', 'social', 'pos']
  lineas_de_servicio TEXT[] DEFAULT '{}',          -- Líneas involucradas (derivable, pero cacheable): ['globe', 'efeonce_digital']

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'draft',     -- draft | active | completed | archived
  -- draft:     creada pero aún sin proyectos en producción
  -- active:    al menos un proyecto tiene tareas en producción
  -- completed: todos los proyectos completados
  -- archived:  histórica, no aparece en vistas activas

  -- Ownership
  created_by_user_id UUID,                         -- FK a client_users (operador que la creó)
  owner_user_id UUID,                              -- FK a client_users (Account Lead responsable)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT                                       -- Notas internas sobre la campaña
);

-- Secuencia para EO-ID
CREATE SEQUENCE greenhouse_core.cmp_eo_id_seq START WITH 1;

-- Índices
CREATE INDEX idx_campaigns_eo_id ON greenhouse_core.campaigns(eo_id);
CREATE INDEX idx_campaigns_space ON greenhouse_core.campaigns(space_id);
CREATE INDEX idx_campaigns_status ON greenhouse_core.campaigns(status);
CREATE INDEX idx_campaigns_slug ON greenhouse_core.campaigns(slug);
CREATE INDEX idx_campaigns_type ON greenhouse_core.campaigns(campaign_type);
CREATE INDEX idx_campaigns_planned_start ON greenhouse_core.campaigns(planned_start_date);
CREATE INDEX idx_campaigns_planned_end ON greenhouse_core.campaigns(planned_end_date);
CREATE INDEX idx_campaigns_owner ON greenhouse_core.campaigns(owner_user_id);
CREATE INDEX idx_campaigns_notion_pids ON greenhouse_core.campaigns USING GIN(notion_project_ids);

-- Trigger updated_at
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON greenhouse_core.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Generación del EO-ID:**

```sql
-- Uso en INSERT (misma función que Account 360):
INSERT INTO greenhouse_core.campaigns (eo_id, slug, space_id, display_name, notion_project_ids)
VALUES (
  greenhouse_core.generate_eo_id('EO-CMP-', 'cmp_eo_id_seq'),
  'sky-vacaciones-invierno-2026',
  @space_uuid,
  'Vacaciones de Invierno 2026',
  ARRAY['notion_project_id_1', 'notion_project_id_2', 'notion_project_id_3']
);
-- Resultado: eo_id = 'EO-CMP-0001'
```

### A2. Constraint de unicidad: un proyecto en máximo una campaña activa

```sql
-- Función que valida que ningún notion_project_id ya esté en otra campaña activa del mismo space
CREATE OR REPLACE FUNCTION greenhouse_core.validate_campaign_project_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_pid TEXT;
  conflicting_campaign VARCHAR(20);
BEGIN
  -- Solo validar si hay project IDs y la campaña no está archived
  IF NEW.status != 'archived' AND array_length(NEW.notion_project_ids, 1) > 0 THEN
    SELECT pid, c.eo_id INTO duplicate_pid, conflicting_campaign
    FROM greenhouse_core.campaigns c,
         UNNEST(c.notion_project_ids) AS pid
    WHERE c.space_id = NEW.space_id
      AND c.id != NEW.id
      AND c.status != 'archived'
      AND pid = ANY(NEW.notion_project_ids)
    LIMIT 1;

    IF duplicate_pid IS NOT NULL THEN
      RAISE EXCEPTION 'Project % already belongs to active campaign %', duplicate_pid, conflicting_campaign;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_project_uniqueness
  BEFORE INSERT OR UPDATE ON greenhouse_core.campaigns
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.validate_campaign_project_uniqueness();
```

### A3. Actualización de la convención EO-ID

Agregar a la tabla de convención de Account 360:

| Objeto | Prefijo | Ejemplo | Generación |
|---|---|---|---|
| Campaign | `EO-CMP-` | `EO-CMP-0001` | Secuencial, auto-increment |

---

## PARTE B: Infraestructura BigQuery

### B1. ETL nocturno: PostgreSQL → BigQuery

La tabla `greenhouse_core.campaigns` se replica a BigQuery vía ETL nocturno, consistente con el patrón de Account 360.

**Dataset destino:** `greenhouse_olap`
**Tabla destino:** `greenhouse_olap.campaigns`
**Schedule:** Junto con el ETL existente de `organizations` y `spaces` (post 03:00 AM sync)

```sql
-- DDL de la tabla mirror en BigQuery
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_olap.campaigns` (
  id STRING NOT NULL,
  eo_id STRING NOT NULL,
  slug STRING NOT NULL,
  space_id STRING NOT NULL,
  display_name STRING NOT NULL,
  description STRING,
  campaign_type STRING NOT NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  notion_project_ids ARRAY<STRING>,
  hubspot_campaign_id STRING,
  hubspot_deal_ids ARRAY<STRING>,
  planned_budget FLOAT64,
  planned_budget_currency STRING,
  planned_launch_date DATE,
  actual_launch_date DATE,
  tags ARRAY<STRING>,
  channels ARRAY<STRING>,
  lineas_de_servicio ARRAY<STRING>,
  status STRING NOT NULL,
  created_by_user_id STRING,
  owner_user_id STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes STRING,
  _synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B2. View base: `ico_engine.v_tareas_by_campaign`

Se construye sobre `v_tareas_by_project` (ya existente) haciendo JOIN con campaigns. Esto mantiene la cadena de views del ICO Engine sin romper nada.

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_tareas_by_campaign` AS
SELECT
  tp.*,
  c.id AS campaign_id,
  c.eo_id AS campaign_eo_id,
  c.display_name AS campaign_name,
  c.slug AS campaign_slug,
  c.campaign_type,
  c.planned_start_date AS campaign_planned_start,
  c.planned_end_date AS campaign_planned_end,
  c.actual_start_date AS campaign_actual_start,
  c.actual_end_date AS campaign_actual_end,
  c.planned_launch_date AS campaign_planned_launch,
  c.actual_launch_date AS campaign_actual_launch,
  c.status AS campaign_status,
  c.space_id AS campaign_space_id,
  c.channels AS campaign_channels,
  c.tags AS campaign_tags
FROM `efeonce-group.ico_engine.v_tareas_by_project` tp
JOIN `efeonce-group.greenhouse_olap.campaigns` c
  ON tp.project_id IN UNNEST(c.notion_project_ids)
WHERE c.status IN ('active', 'completed')
```

**Nota:** Tareas que pertenecen a proyectos sin campaña asignada NO aparecen en esta view. Eso es correcto — esta view es exclusiva para el contexto de campaña. Las métricas por proyecto y por space siguen existiendo independientemente.

### B3. View derivada: `ico_engine.v_campaign_services`

Resuelve la relación campaign ↔ services transitivamente, sin tabla de join.

```sql
-- Solo disponible cuando Services Architecture esté operativo
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_campaign_services` AS
SELECT DISTINCT
  c.id AS campaign_id,
  c.eo_id AS campaign_eo_id,
  c.display_name AS campaign_name,
  s.id AS service_id,
  s.name AS service_name,
  s.servicio_especifico,
  s.linea_de_servicio,
  s.pipeline_stage AS service_stage,
  s.space_id
FROM `efeonce-group.greenhouse_olap.campaigns` c,
     UNNEST(c.notion_project_ids) AS pid
JOIN `efeonce-group.greenhouse_olap.services` s
  ON s.notion_project_id = pid
WHERE c.status IN ('active', 'completed')
  AND s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

### B4. Tabla materializada: `ico_engine.metrics_by_campaign`

Misma estructura que `metrics_by_project` y `metrics_by_service`, con campaign como dimensión de agregación.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.metrics_by_campaign` (
  -- Dimensiones
  campaign_id STRING NOT NULL,
  campaign_eo_id STRING,
  campaign_name STRING,
  campaign_type STRING,
  campaign_status STRING,
  space_id STRING NOT NULL,
  period STRING NOT NULL,                -- 'all_time' | '2026-03' | '2026-Q1'
  period_type STRING NOT NULL,           -- 'all_time' | 'monthly' | 'quarterly'

  -- Métricas de calidad
  rpa_avg FLOAT64,
  rpa_median FLOAT64,
  ftr_pct FLOAT64,
  total_tasks INT64,
  completed_tasks INT64,

  -- Métricas de velocidad
  cycle_time_avg FLOAT64,
  cycle_time_p50 FLOAT64,
  cycle_time_p90 FLOAT64,
  cycle_time_variance FLOAT64,
  otd_pct FLOAT64,

  -- Métricas de eficiencia
  throughput_weekly FLOAT64,

  -- Métricas de pipeline (snapshot)
  pipeline_planning INT64,
  pipeline_briefing INT64,
  pipeline_production INT64,
  pipeline_approval INT64,
  pipeline_asset_mgmt INT64,
  pipeline_activation INT64,
  pipeline_completed INT64,
  stuck_count_48h INT64,
  stuck_count_96h INT64,

  -- Métricas propias de Campaign (no existen en otros niveles)
  project_count INT64,                   -- Cantidad de proyectos en la campaña
  services_count INT64,                  -- Cantidad de services involucrados (cuando Services esté operativo)
  completion_pct FLOAT64,                -- % de tareas completadas vs total
  early_launch_advantage_days INT64,     -- planned_launch_date - actual_launch_date (NULL si no aplica)

  -- Metadata
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### B5. Scheduled query: materialización de `metrics_by_campaign`

Se agrega al scheduled query existente `ico-engine-materialize` (03:15 AM). Corre DESPUÉS de la materialización de `metrics_by_project` ya que depende de `v_tareas_by_campaign` que a su vez depende de `v_tareas_by_project`.

```sql
-- Scheduled query: ico_engine.metrics_by_campaign
-- Schedule: diario 03:20 AM (5 minutos después de metrics_by_project)
-- Write disposition: WRITE_TRUNCATE

-- Materializar métricas por campaña, all_time
INSERT INTO `efeonce-group.ico_engine.metrics_by_campaign`
SELECT
  campaign_id,
  campaign_eo_id,
  campaign_name,
  campaign_type,
  campaign_status,
  campaign_space_id AS space_id,
  'all_time' AS period,
  'all_time' AS period_type,

  -- Calidad
  AVG(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END) AS rpa_avg,
  APPROX_QUANTILES(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END, 2)[SAFE_OFFSET(1)] AS rpa_median,
  SAFE_DIVIDE(
    COUNTIF(first_time_right = true AND fase_csc = 'Completado'),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS ftr_pct,
  COUNT(*) AS total_tasks,
  COUNTIF(fase_csc = 'Completado') AS completed_tasks,

  -- Velocidad
  AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END) AS cycle_time_avg,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 2)[SAFE_OFFSET(1)] AS cycle_time_p50,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 10)[SAFE_OFFSET(9)] AS cycle_time_p90,
  SAFE_DIVIDE(
    STDDEV(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END),
    AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END)
  ) * 100 AS cycle_time_variance,
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado' AND cycle_time_days <= 14.2),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS otd_pct,

  -- Eficiencia
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado'
      AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)),
    4.0
  ) AS throughput_weekly,

  -- Pipeline
  COUNTIF(fase_csc = 'Planning') AS pipeline_planning,
  COUNTIF(fase_csc = 'Briefing') AS pipeline_briefing,
  COUNTIF(fase_csc = 'Producción') AS pipeline_production,
  COUNTIF(fase_csc = 'Aprobación') AS pipeline_approval,
  COUNTIF(fase_csc = 'Asset Mgmt') AS pipeline_asset_mgmt,
  COUNTIF(fase_csc = 'Activación') AS pipeline_activation,
  COUNTIF(fase_csc = 'Completado') AS pipeline_completed,
  COUNTIF(hours_since_update > 48 AND fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_48h,
  COUNTIF(hours_since_update > 96 AND fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_96h,

  -- Métricas propias de Campaign
  COUNT(DISTINCT project_id) AS project_count,
  NULL AS services_count,  -- Se habilita cuando Services Architecture esté operativo
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado'),
    COUNT(*)
  ) * 100 AS completion_pct,
  CASE
    WHEN campaign_planned_launch IS NOT NULL AND campaign_actual_launch IS NOT NULL
    THEN DATE_DIFF(campaign_planned_launch, campaign_actual_launch, DAY)
    ELSE NULL
  END AS early_launch_advantage_days,

  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_campaign`
GROUP BY campaign_id, campaign_eo_id, campaign_name, campaign_type, campaign_status,
         campaign_space_id, campaign_planned_launch, campaign_actual_launch

UNION ALL

-- Materializar métricas por campaña, por mes (últimos 12 meses)
SELECT
  campaign_id,
  campaign_eo_id,
  campaign_name,
  campaign_type,
  campaign_status,
  campaign_space_id AS space_id,
  FORMAT_TIMESTAMP('%Y-%m', last_edited_time) AS period,
  'monthly' AS period_type,

  AVG(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END) AS rpa_avg,
  APPROX_QUANTILES(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END, 2)[SAFE_OFFSET(1)] AS rpa_median,
  SAFE_DIVIDE(
    COUNTIF(first_time_right = true AND fase_csc = 'Completado'),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS ftr_pct,
  COUNT(*) AS total_tasks,
  COUNTIF(fase_csc = 'Completado') AS completed_tasks,
  AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END) AS cycle_time_avg,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 2)[SAFE_OFFSET(1)] AS cycle_time_p50,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 10)[SAFE_OFFSET(9)] AS cycle_time_p90,
  SAFE_DIVIDE(
    STDDEV(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END),
    AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END)
  ) * 100 AS cycle_time_variance,
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado' AND cycle_time_days <= 14.2),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS otd_pct,
  NULL AS throughput_weekly,
  NULL AS pipeline_planning,
  NULL AS pipeline_briefing,
  NULL AS pipeline_production,
  NULL AS pipeline_approval,
  NULL AS pipeline_asset_mgmt,
  NULL AS pipeline_activation,
  NULL AS pipeline_completed,
  NULL AS stuck_count_48h,
  NULL AS stuck_count_96h,
  COUNT(DISTINCT project_id) AS project_count,
  NULL AS services_count,
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado'),
    COUNT(*)
  ) * 100 AS completion_pct,
  NULL AS early_launch_advantage_days,  -- No aplica a período mensual

  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_campaign`
WHERE last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
GROUP BY campaign_id, campaign_eo_id, campaign_name, campaign_type, campaign_status,
         campaign_space_id, FORMAT_TIMESTAMP('%Y-%m', last_edited_time)
```

### B6. View de consumo: `ico_engine.v_client_campaign_metrics`

Para módulos client-facing. Filtra por space_id en tiempo de query.

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_client_campaign_metrics` AS
SELECT
  campaign_id,
  campaign_eo_id,
  campaign_name,
  campaign_type,
  campaign_status,
  space_id,
  period,
  period_type,
  rpa_avg,
  ftr_pct,
  cycle_time_avg,
  cycle_time_p50,
  cycle_time_variance,
  otd_pct,
  throughput_weekly,
  total_tasks,
  completed_tasks,
  completion_pct,
  project_count,
  pipeline_planning,
  pipeline_briefing,
  pipeline_production,
  pipeline_approval,
  pipeline_asset_mgmt,
  pipeline_activation,
  pipeline_completed,
  stuck_count_48h,
  stuck_count_96h,
  early_launch_advantage_days,
  _materialized_at
FROM `efeonce-group.ico_engine.metrics_by_campaign`
-- Filtro por Space se aplica en el query builder:
-- WHERE space_id = @space_id
```

### B7. View de consumo: `ico_engine.v_campaign_comparison`

Para comparación entre campañas (mismo Space). Permite responder "¿cómo se compara Vacaciones de Invierno vs Día de la Madre?"

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_campaign_comparison` AS
SELECT
  campaign_id,
  campaign_eo_id,
  campaign_name,
  campaign_type,
  space_id,
  rpa_avg,
  ftr_pct,
  cycle_time_avg,
  otd_pct,
  total_tasks,
  completed_tasks,
  completion_pct,
  project_count,
  early_launch_advantage_days,
  -- Benchmarks: promedio del Space para comparación
  AVG(rpa_avg) OVER (PARTITION BY space_id) AS space_avg_rpa,
  AVG(cycle_time_avg) OVER (PARTITION BY space_id) AS space_avg_cycle_time,
  AVG(otd_pct) OVER (PARTITION BY space_id) AS space_avg_otd,
  AVG(ftr_pct) OVER (PARTITION BY space_id) AS space_avg_ftr
FROM `efeonce-group.ico_engine.metrics_by_campaign`
WHERE period_type = 'all_time'
  AND campaign_status IN ('active', 'completed')
```

---

## PARTE C: Extensión del ICO Engine Metric Registry

### C1. Actualizar tipo `Granularity`

En `/src/config/ico-metric-registry.ts`:

```typescript
// ANTES:
export type Granularity = 'task' | 'project' | 'service' | 'package' | 'space'

// DESPUÉS:
export type Granularity = 'task' | 'project' | 'campaign' | 'service' | 'package' | 'space'
```

### C2. Actualizar métricas existentes

Todas las métricas que aplican a `'project'` también aplican a `'campaign'`. Agregar `'campaign'` al array `granularities` de cada métrica:

```typescript
// Para cada métrica en ICO_METRIC_REGISTRY que tenga 'project' en granularities:
// Agregar 'campaign' al array granularities

// Ejemplo (rpa):
{
  id: 'rpa',
  // ... rest unchanged ...
  granularities: ['task', 'project', 'campaign', 'service', 'package', 'space'],
  // ... rest unchanged ...
}
```

**Métricas que obtienen `'campaign'`:** `rpa`, `ftr_pct`, `cycle_time`, `cycle_time_variance`, `otd_pct`, `throughput`, `brief_clarity_score` (futuro), `brand_consistency_score` (futuro).

### C3. Nuevas métricas exclusivas de Campaign

Agregar al registry:

```typescript
// ═══════════════════════════════════════
// CAMPAIGN-SPECIFIC
// ═══════════════════════════════════════

{
  id: 'campaign_completion_pct',
  name: 'Campaign Completion',
  description: 'Porcentaje de assets completados del total planificado en la campaña.',
  category: 'pipeline',
  formulaType: 'ratio',
  formulaConfig: {
    numerator: "COUNTIF(fase_csc = 'Completado')",
    denominator: "COUNT(*)",
    multiplyBy: 100
  },
  granularities: ['campaign'],
  aggregationPeriods: ['all_time'],
  applicableServices: '*',
  format: 'percentage',
  decimals: 0,
  suffix: '%',
  thresholds: {
    green: 90,
    yellow: 70,
    red: 70,
    direction: 'higher_is_better'
  },
  benchmarks: null,
  active: true,
  comingSoon: false,
  dependsOn: [],
  primaryTable: 'ico_engine.v_tareas_by_campaign',
  requiredColumns: ['fase_csc', 'campaign_id']
},

{
  id: 'early_launch_advantage',
  name: 'Early Launch Advantage',
  description: 'Días de ventaja (o retraso) entre la fecha de go-live planificada y la real. Positivo = se lanzó antes. Negativo = se retrasó.',
  category: 'speed',
  formulaType: 'days_diff',
  formulaConfig: {
    startField: 'actual_launch_date',
    endField: 'planned_launch_date',
    aggregation: 'value'  // No se agrega, es un valor por campaña
  },
  granularities: ['campaign'],
  aggregationPeriods: ['all_time'],
  applicableServices: '*',
  format: 'days',
  decimals: 0,
  suffix: 'días',
  thresholds: {
    green: 0,     // 0 o positivo = a tiempo o antes
    yellow: -3,   // hasta 3 días de retraso
    red: -3,      // más de 3 días de retraso
    direction: 'higher_is_better'
  },
  benchmarks: null,
  active: true,
  comingSoon: false,
  dependsOn: [],
  primaryTable: 'greenhouse_olap.campaigns',
  requiredColumns: ['planned_launch_date', 'actual_launch_date']
}
```

---

## PARTE D: API Routes

### D1. CRUD de Campaigns (internal/operator)

```
POST   /api/campaigns                  → Crear campaña
GET    /api/campaigns                  → Listar campañas (filtrable por space_id, status)
GET    /api/campaigns/[id]             → Detalle de una campaña
PATCH  /api/campaigns/[id]             → Actualizar campaña
DELETE /api/campaigns/[id]             → Soft-delete (cambiar status a 'archived')
```

**Guard:** `requireApiAccess('internal')` — solo `efeonce_account`, `efeonce_operations`, `efeonce_admin`.

**Source de datos:** PostgreSQL `greenhouse_core.campaigns` (CRUD en tiempo real).

### D2. Lectura de Campaigns (client-facing)

```
GET    /api/client/campaigns                    → Listar campañas del Space activo
GET    /api/client/campaigns/[id]               → Detalle + métricas ICO de una campaña
GET    /api/client/campaigns/[id]/metrics       → Métricas ICO detalladas (período configurable)
GET    /api/client/campaigns/[id]/projects      → Proyectos que componen la campaña
GET    /api/client/campaigns/[id]/pipeline      → Pipeline CSC consolidado de la campaña
GET    /api/client/campaigns/compare            → Comparación entre 2+ campañas
```

**Guard:** `requireApiAccess('client')` — roles `client_executive`, `client_manager`, `client_specialist` + scope enforcement por `space_id` y opcionalmente `campaign_subset`.

**Source de datos:**
- Listado y detalle base: PostgreSQL (real-time, OLTP)
- Métricas ICO: BigQuery `ico_engine.metrics_by_campaign` (materializado, OLAP)
- Pipeline: BigQuery `ico_engine.v_tareas_by_campaign` (live query sobre view)

### D3. Export de Campaigns (Data Node)

```
GET    /api/export/campaigns?format=csv|xlsx|json&space_id=&status=
GET    /api/export/campaigns/[id]?format=csv|xlsx|json
```

**Guard:** Misma lógica que Data Node existente (capability + tenant scoping).

Nomenclatura de archivo: `greenhouse_campaign_{campaign_slug}_{YYYY-MM-DD}.{ext}`

---

## PARTE E: Páginas y vistas

### E1. Vista client-facing: `/campanas`

Ruta ya definida en Identity Access V2 dentro del route group `client`. Accesible para `client_executive`, `client_manager`, `client_specialist`.

**Nota para agente:** La página NO se implementa en esta tarea. Se limita a definir la estructura de datos y API routes. La implementación de UI es un CODEX TASK separado (`CODEX_TASK_Campaign_UI`).

```
/campanas
  ├── page.tsx                         # Lista de campañas del Space
  └── [campaignSlug]/
      └── page.tsx                     # Detalle de campaña + métricas + pipeline

Sidebar label: "Campañas"
Sidebar sublabel: "Iniciativas de marca"
Sidebar icon: tabler-rocket
Sidebar position: después de "Ciclos", antes de "Equipo"
```

**Layout ASCII de `/campanas` (lista):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  Campañas                                                            │
│  Tus iniciativas de marca y producción creativa                      │
│                                                                      │
│  [Filtros: status ▼  tipo ▼  fecha ▼]                   [📥 Export]  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  🚀 Vacaciones de Invierno 2026          EO-CMP-0001         │  │
│  │  Seasonal · 3 proyectos · 142 assets                          │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  72% completado                │  │
│  │  RpA 1.8 ● | OTD 92% ● | Cycle Time 8.2d ●                  │  │
│  │  Jun 15 → Jul 30, 2026                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  🚀 Lanzamiento Marca 2026               EO-CMP-0002         │  │
│  │  Launch · 5 proyectos · 89 assets                             │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100% completado              │  │
│  │  RpA 2.1 ◐ | OTD 87% ◐ | Cycle Time 11.5d ◐                 │  │
│  │  Mar 1 → May 15, 2026                              Completed  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  empty state:                                                        │
│  "Aún no hay campañas activas. Cuando tu equipo de cuenta cree      │
│   una campaña, aparecerá aquí con métricas en tiempo real."          │
└──────────────────────────────────────────────────────────────────────┘
```

**Layout ASCII de `/campanas/[slug]` (detalle):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Campañas                                                         │
│  Vacaciones de Invierno 2026                          EO-CMP-0001   │
│  Seasonal · Jun 15 → Jul 30, 2026 · 3 proyectos       [📥 Export]  │
│                                                                      │
│  ┌─── Key Metrics ───────────────────────────────────────────────┐  │
│  │  RpA       │  OTD%      │  Cycle Time  │  FTR%     │ Assets  │  │
│  │  1.8 ●     │  92% ●     │  8.2d ●      │  68% ●    │ 142     │  │
│  │  ▼ vs prev │  ▲ vs prev │  ▼ vs prev   │  ▲ vs prev│ 102 ✓   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── CSC Pipeline (consolidado) ────────────────────────────────┐  │
│  │  Planning │ Briefing │ Producción │ Aprobación │ Asset │ Act. │  │
│  │     5     │    8     │    22      │    12      │   3   │  90  │  │
│  │           │          │    ⚠ 3     │            │       │      │  │
│  │           │          │   stuck    │            │       │      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Proyectos ─────────────────────────────────────────────────┐  │
│  │  Key Visuals        │ 48 assets │ RpA 1.5 │ OTD 95%│ 85% ✓  │  │
│  │  Social Content     │ 62 assets │ RpA 2.0 │ OTD 90%│ 68% ✓  │  │
│  │  Material POP       │ 32 assets │ RpA 1.9 │ OTD 88%│ 56% ✓  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─── Trend (últimos 3 meses) ───────────────────────────────────┐  │
│  │  [Line chart: RpA + OTD% por mes, campaign vs space average]  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### E2. Vista operator-facing: `/agency/campaigns` (o `/internal/campaigns`)

CRUD para operadores de Efeonce. Aquí se crean, editan y archivan campañas.

```
/agency/campaigns (o /internal/campaigns — definir en implementación)
  ├── page.tsx                         # Lista cross-tenant de campañas
  └── [campaignId]/
      ├── page.tsx                     # Edición de campaña
      └── metrics/
          └── page.tsx                 # Métricas ops-level de la campaña
```

**Nota:** La vista operator puede ver campañas de todos los Spaces (cross-tenant), a diferencia de la vista client que solo ve su Space.

---

## PARTE F: Impacto en documentos existentes

| Documento | Cambio requerido | Urgencia |
|---|---|---|
| `Greenhouse_ICO_Engine_v1.md` | Agregar `'campaign'` a tipo `Granularity`. Documentar `metrics_by_campaign`, `v_tareas_by_campaign`, scheduled query adicional. | Al implementar |
| `Greenhouse_Account_360_Object_Model_v1.md` | Agregar `EO-CMP-` a la tabla de convención EO-ID. Agregar Campaign al diagrama de jerarquía. | Al implementar |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | `/campanas` ya definido. `campaign_subset` scope ya definido. Sin cambios necesarios. | Ninguno |
| `Greenhouse_Services_Architecture_v1.md` | Documentar la relación transitiva campaign ↔ services (no es FK directa). Agregar `v_campaign_services` como view derivada. | Cuando Services se implemente |
| `CODEX_TASK_Creative_Hub_Module.md` | El CSC Pipeline Tracker gana filtro por campaign. El pipeline consolidado de campaña es una vista adicional del mismo componente. | UI Task separada |
| `Greenhouse_Data_Node_Architecture_v1.md` | Agregar Campaign como vista exportable. Nuevo endpoint `/api/export/campaigns`. MCP tool `getCampaignMetrics`. | Cuando Data Node se implemente |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Agregar nomenclatura de "Campañas" al sidebar. Definir textos de empty states, tooltips, labels. | UI Task separada |
| `CODEX_TASK_Financial_Intelligence_Layer.md` | Phase 2: agregar `campaign_id` como dimensión de atribución en `fin_expenses` y `fin_income`. View de margen por campaña. | Addendum futuro |

---

## PARTE G: Estructura de archivos

```
src/
├── config/
│   └── ico-metric-registry.ts         # ACTUALIZAR: agregar 'campaign' a Granularity + 2 métricas nuevas
├── lib/
│   ├── ico-engine/
│   │   ├── read-metrics.ts            # ACTUALIZAR: agregar funciones de lectura por campaign
│   │   └── metric-types.ts            # ACTUALIZAR: Granularity type
│   ├── campaigns/
│   │   ├── campaign-queries.ts        # NUEVO: queries PostgreSQL para CRUD
│   │   ├── campaign-metrics.ts        # NUEVO: queries BigQuery para métricas
│   │   └── campaign-types.ts          # NUEVO: tipos TypeScript
│   └── ...
├── app/
│   ├── api/
│   │   ├── campaigns/
│   │   │   ├── route.ts               # NUEVO: POST (crear) + GET (listar)
│   │   │   └── [id]/
│   │   │       └── route.ts           # NUEVO: GET + PATCH + DELETE
│   │   ├── client/
│   │   │   └── campaigns/
│   │   │       ├── route.ts           # NUEVO: GET (listar client-facing)
│   │   │       └── [id]/
│   │   │           ├── route.ts       # NUEVO: GET detalle
│   │   │           ├── metrics/
│   │   │           │   └── route.ts   # NUEVO: GET métricas ICO
│   │   │           └── pipeline/
│   │   │               └── route.ts   # NUEVO: GET pipeline CSC
│   │   └── export/
│   │       └── campaigns/
│   │           └── route.ts           # NUEVO: GET export
│   └── (dashboard)/
│       ├── campanas/
│       │   ├── page.tsx               # FUTURO (UI Task): lista de campañas
│       │   └── [campaignSlug]/
│       │       └── page.tsx           # FUTURO (UI Task): detalle
│       └── ...
└── sql/
    └── ico-engine/
        ├── 10-view-tareas-by-campaign.sql    # NUEVO
        ├── 11-view-campaign-services.sql     # NUEVO (activar con Services)
        ├── 12-table-metrics-by-campaign.sql  # NUEVO
        ├── 13-scheduled-campaign-metrics.sql # NUEVO
        ├── 14-view-client-campaign.sql       # NUEVO
        └── 15-view-campaign-comparison.sql   # NUEVO
```

---

## PARTE H: Acceptance criteria

### Infrastructure (P0)

- [ ] Tabla `greenhouse_core.campaigns` creada en PostgreSQL con todos los campos, índices y triggers
- [ ] Secuencia `cmp_eo_id_seq` creada y funcional con `generate_eo_id('EO-CMP-', 'cmp_eo_id_seq')`
- [ ] Trigger de unicidad de proyectos por campaña funcional: insertar un proyecto que ya pertenece a otra campaña activa del mismo Space retorna error
- [ ] Tabla `greenhouse_olap.campaigns` creada en BigQuery (mirror OLAP)
- [ ] ETL nocturno configurado para replicar PostgreSQL → BigQuery

### ICO Engine (P0)

- [ ] View `ico_engine.v_tareas_by_campaign` creada y retorna datos correctos al hacer JOIN con campaigns
- [ ] Tabla `ico_engine.metrics_by_campaign` creada con DDL correcto
- [ ] Scheduled query de materialización configurado y ejecuta correctamente
- [ ] Tipo `Granularity` en TypeScript actualizado con `'campaign'`
- [ ] Métricas existentes (rpa, otd_pct, cycle_time, ftr_pct, throughput) tienen `'campaign'` en `granularities`
- [ ] Métricas `campaign_completion_pct` y `early_launch_advantage` agregadas al registry

### API (P1)

- [ ] `POST /api/campaigns` crea campaña con EO-ID auto-generado
- [ ] `GET /api/campaigns` lista campañas con filtros por space_id, status, campaign_type
- [ ] `PATCH /api/campaigns/[id]` actualiza campos permitidos
- [ ] `DELETE /api/campaigns/[id]` cambia status a 'archived'
- [ ] `GET /api/client/campaigns` retorna campañas del Space activo del session
- [ ] `GET /api/client/campaigns/[id]/metrics` retorna métricas ICO de BigQuery
- [ ] Guards de RBAC aplicados: internal routes requieren `efeonce_account` | `efeonce_operations` | `efeonce_admin`; client routes requieren roles de familia `client`
- [ ] Scope enforcement: client routes filtran por `space_id` del session

### Views (P1)

- [ ] `ico_engine.v_client_campaign_metrics` creada y filtra correctamente por space_id
- [ ] `ico_engine.v_campaign_comparison` creada con window functions de benchmark
- [ ] `ico_engine.v_campaign_services` creada (puede estar vacía si Services no está operativo)

### Export (P2)

- [ ] `GET /api/export/campaigns` genera CSV, XLSX, JSON con datos de campañas del Space
- [ ] Nomenclatura de archivo: `greenhouse_campaign_{slug}_{date}.{ext}`

---

## PARTE I: Notas para el agente

### Patrones a seguir

1. **PostgreSQL table pattern:** Seguir exactamente el patrón de `greenhouse_core.organizations` y `greenhouse_core.spaces` de Account 360. Misma convención de: UUID PK + EO-ID + slug + trigger `updated_at` + índices.

2. **BigQuery materialization pattern:** Seguir exactamente el patrón de `ico_engine.metrics_by_project`. Misma estructura de columnas, mismos aggregation patterns, mismo `WRITE_TRUNCATE`.

3. **View chain:** `v_tareas_enriched` → `v_tareas_by_project` → `v_tareas_by_campaign`. NO crear un path alternativo desde `v_tareas_enriched` directo a campaign — mantener la cadena para que las transformaciones de `v_tareas_by_project` (project_name, project_id) estén disponibles.

4. **API guard pattern:** Seguir el patrón de `requireApiAccess(routeGroup)` definido en Identity Access V2.

5. **Slug generation:** Usar `slugify(display_name)` con kebab-case. Incluir el year si es relevante: `sky-vacaciones-invierno-2026`.

### Lo que NO hacer

- **NO crear tabla de join `campaign_services`.** La relación se deriva transitivamente vía project IDs. Si se necesita performance, la view materializada lo resuelve.
- **NO modificar tablas existentes** (`metrics_by_project`, `metrics_by_space`, `v_tareas_enriched`). Todo es aditivo.
- **NO implementar UI en esta tarea.** Solo infraestructura + API + ICO Engine. La UI es un CODEX TASK separado.
- **NO implementar la conexión financiera** (presupuesto, margen por campaña). Eso es un addendum al Financial Intelligence Layer.
- **NO crear nuevos theme files ni overrides de Vuexy.** (Regla general de Greenhouse).
- **NO traducir términos ICO.** RpA, OTD%, Cycle Time, FTR% se mantienen en inglés en código y en UI.

### Orden de ejecución recomendado

1. **PostgreSQL:** Crear tabla `campaigns` + secuencia + trigger de unicidad
2. **BigQuery DDL:** Crear tabla mirror `greenhouse_olap.campaigns` + tabla `ico_engine.metrics_by_campaign`
3. **BigQuery Views:** Crear `v_tareas_by_campaign` → `v_client_campaign_metrics` → `v_campaign_comparison` → `v_campaign_services`
4. **TypeScript types:** Actualizar `Granularity`, agregar tipos de Campaign
5. **Metric Registry:** Agregar `'campaign'` a métricas existentes + 2 métricas nuevas
6. **API CRUD (internal):** POST + GET + PATCH + DELETE sobre PostgreSQL
7. **API Read (client):** GET endpoints que leen de PostgreSQL (listado) + BigQuery (métricas)
8. **Scheduled query:** Configurar materialización de `metrics_by_campaign`
9. **Export:** Endpoint de export
10. **ETL:** Configurar replicación PostgreSQL → BigQuery para campaigns

---

## Changelog

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-03-17 | Documento inicial |

---

*Efeonce Greenhouse™ • Campaign 360 Spec v1.0*
*Efeonce Group — Marzo 2026 — CONFIDENCIAL*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
