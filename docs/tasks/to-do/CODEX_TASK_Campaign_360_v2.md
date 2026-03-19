# CODEX TASK -- Campaign 360 v2: Objeto Canonico de Campana para Greenhouse

## Estado

Baseline canonica de implementacion al 2026-03-18.

Este brief reemplaza la base tecnica de `CODEX_TASK_Campaign_360.md` para efectos de modelado, runtime y arquitectura.
La task original se conserva como framing de producto e intencion funcional, pero no debe implementarse literalmente cuando contradiga la arquitectura viva.

## Resumen

Implementar `Campaign` (`EO-CMP-XXXX`) como objeto canonico full de Greenhouse.

`Campaign` representa la unidad de iniciativa que el cliente reconoce como campana, lanzamiento, seasonal push o sprint agrupado. Vive entre `Project` y `Space`: no reemplaza la unidad operativa de delivery ni la unidad comercial de servicio, pero agrega una nueva capa de lectura, control y metricas para negocio.

La implementacion v2 mantiene la intencion de la task original:
- agrupar proyectos bajo una iniciativa compartida
- exponer metricas ICO por campana
- habilitar lectura client-facing via `/campanas`
- respetar `campaign_subset` y el boundary de `space_id`

La implementacion v2 cambia la mecanica:
- `Campaign` vive primero en PostgreSQL como objeto de `greenhouse_core`
- la relacion campana-proyecto se modela explicitamente
- `Campaign` entra al `ICO Engine` como dimension nueva del patron context-agnostic
- BigQuery queda como capa analitica derivada, no como source of truth

## Decision de arquitectura

`Campaign` se formaliza como objeto canonico full de Greenhouse.

Implica:
- identidad estable propia
- tabla propia en `greenhouse_core`
- relaciones explicitas con otros objetos
- scopes y rutas propias
- consumo por runtime, serving y analytics

No implica:
- reemplazar `Service`
- reemplazar `Project`
- resolver de inmediato finanzas por campana
- crear un roster propio de equipo

## Alineacion con Greenhouse

`Campaign` debe alinearse con estas reglas activas del proyecto:
- `Space` es el boundary operativo y de tenant.
- los objetos canonicos viven primero en PostgreSQL.
- las metricas ICO deben poder consultarse por cualquier dimension sin duplicar formulas.
- la arquitectura evita depender de arrays de source IDs como backbone semantico del modelo.

## Posicion en la jerarquia de objetos

```text
Organization
  -> Space
     -> Campaign
        -> CampaignProjectLink
           -> Source Project
              -> Tasks / Assets
```

Lectura de negocio:
- `Space` responde a "de que cliente/tenant estamos hablando"
- `Service` responde a "que se vende"
- `Project` responde a "donde se ejecuta operativamente"
- `Campaign` responde a "para que iniciativa o momento de negocio se esta produciendo"

## Lo que Campaign es y no es

`Campaign` si es:
- unidad de iniciativa
- agrupador canonico de proyectos
- nueva dimension de agregacion para el `ICO Engine`
- superficie reusable para scopes, vistas client-facing, comparativas y exports futuros

`Campaign` no es:
- sustituto de `Service`
- sustituto de `Project`
- contenedor de presupuesto obligatorio en MVP
- roster de personas
- pipeline stage system independiente

## Scope MVP

Incluye:
- objeto canonico `campaigns`
- relacion explicita `campaign_project_links`
- CRUD interno
- lectura client-facing filtrada por `space_id`
- enforcement de `campaign_subset`
- integracion de `campaign` como nueva dimension en el `ICO Engine`
- metricas base por campana

No incluye:
- financial attribution fuerte
- `campaign_services` como tabla canonica
- budget/margin por campana
- Data Node y exports enterprise completos
- una UI ambiciosa fuera de las rutas y lecturas minimas necesarias

## Modelo de datos canonico

### A1. Tabla `greenhouse_core.campaigns`

```sql
CREATE TABLE greenhouse_core.campaigns (
  campaign_id TEXT PRIMARY KEY,
  eo_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,

  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),

  display_name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'campaign',
  status TEXT NOT NULL DEFAULT 'draft',

  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  planned_launch_date DATE,
  actual_launch_date DATE,

  owner_user_id TEXT,
  created_by_user_id TEXT,

  tags TEXT[] NOT NULL DEFAULT '{}',
  channels TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_space_id ON greenhouse_core.campaigns(space_id);
CREATE INDEX idx_campaigns_status ON greenhouse_core.campaigns(status);
CREATE INDEX idx_campaigns_owner_user_id ON greenhouse_core.campaigns(owner_user_id);
CREATE INDEX idx_campaigns_type ON greenhouse_core.campaigns(campaign_type);
```

Notas:
- usar PK/FK `TEXT` para mantener consistencia con el backbone vivo
- `eo_id` usa prefijo `EO-CMP-`
- `space_id` es obligatorio como boundary principal

### A2. Tabla `greenhouse_core.campaign_project_links`

```sql
CREATE TABLE greenhouse_core.campaign_project_links (
  campaign_project_link_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES greenhouse_core.campaigns(campaign_id),
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),

  project_source_system TEXT NOT NULL DEFAULT 'notion',
  project_source_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_project_links_campaign_id
  ON greenhouse_core.campaign_project_links(campaign_id);

CREATE INDEX idx_campaign_project_links_space_project
  ON greenhouse_core.campaign_project_links(space_id, project_source_id);
```

### A3. Invariantes de negocio

- un proyecto puede pertenecer a 0 o 1 campaign activa dentro del mismo `space_id`
- una campaign puede agrupar N proyectos
- una campaign sin proyectos puede existir en estado `draft`
- `archived` saca la campana de vistas activas, pero no rompe historicidad

La restriccion de unicidad debe resolverse sobre `campaign_project_links`, no sobre arrays embebidos.

## Relacion con Service

En MVP, la relacion `Campaign -> Service` es derivada y no canonica.

Regla:
- si un proyecto asociado a una campaign se reconcilia con un `Service`, entonces ese `Service` participa en la campaign
- esto habilita enrichment y metricas futuras, pero no bloquea la salida del MVP

No crear `campaign_services` como tabla canonica en la primera fase.

## Integracion con ICO Engine

`Campaign` entra como nueva dimension soportada por el patron context-agnostic del `ICO Engine`.

Principios:
- no duplicar formulas por campana
- no crear una rama especial del engine solo para `Campaign`
- resolver el set de tareas fuente a partir de `campaign_project_links`

### Metricas MVP por campana

- `rpa_avg`
- `ftr_pct`
- `otd_pct`
- `cycle_time_avg`
- `throughput_weekly`
- `total_tasks`
- `completed_tasks`
- `project_count`
- `completion_pct`
- `stuck_count_48h`
- `stuck_count_96h`

### Metricas posteriores

- `services_count`
- `planned_vs_actual_launch`
- `budget_vs_actual_cost`
- `margin_pct`

## Serving y analitica

Orden recomendado:
1. objeto canonico en PostgreSQL
2. lectura runtime desde el core o serving derivado
3. proyeccion/tabla analitica por campana en BigQuery si hace falta cache o reporting agregado

Si se materializa un `metrics_by_campaign`, debe seguir el patron actual del engine y no depender de `UNNEST(c.notion_project_ids)`.

## API surface MVP

### Interno / operador

- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:campaignId`
- `PATCH /api/campaigns/:campaignId`
- `POST /api/campaigns/:campaignId/projects`
- `DELETE /api/campaigns/:campaignId/projects/:campaignProjectLinkId`

### Client-facing

- `GET /api/client/campaigns`
- `GET /api/client/campaigns/:campaignId`
- `GET /api/client/campaigns/:campaignId/metrics`

### Reglas de acceso

- siempre filtrar por `space_id`
- respetar scopes por tenant
- si existe `campaign_subset`, recortar la superficie a esas campanas

## Fases sugeridas

### Fase 1

- DDL de `campaigns`
- DDL de `campaign_project_links`
- CRUD interno
- lecturas client-facing
- dimension `campaign` en el `ICO Engine`
- metricas base

### Fase 2

- vista `campaign_360`
- comparativas entre campanas
- exports basicos
- enrichment derivado con `Service`

### Fase 3

- financial attribution por campana
- Data Node
- export enterprise y capacidades externas

## Criterios de aceptacion

- existe `greenhouse_core.campaigns` con identidad canonica y `space_id`
- existe `greenhouse_core.campaign_project_links` como relacion explicita
- no se usa `notion_project_ids[]` como backbone estructural de Campaign
- el runtime puede listar y detallar campanas filtradas por `space_id`
- el `ICO Engine` puede resolver metricas por `campaign`
- `campaign_subset` se puede aplicar sin hacks especiales

## Documentos a actualizar cuando se implemente

- `GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `Greenhouse_Account_360_Object_Model_v1.md`
- `Greenhouse_Services_Architecture_v1.md`

## Nota final

La task original de `Campaign 360` sigue siendo util como brief de producto.

La `v2` es la referencia operativa para implementacion porque:
- alinea Campaign con `Postgres-first`
- respeta `Space` como boundary
- evita arrays como semantica estructural
- encaja con el `ICO Engine` context-agnostic actual
