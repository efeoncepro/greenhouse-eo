# CODEX_TASK: Space → Notion Database Mapping

## Meta

| Campo | Valor |
|-------|-------|
| **Task ID** | `CODEX_TASK_Tenant_Notion_Mapping` |
| **Repo** | `greenhouse-eo` (schema/types) + `notion-bigquery` (pipeline changes) + `notion-frame-io` (futuro: space_id awareness) |
| **Prioridad** | P0 — prerequisito para multi-tenant real en Greenhouse |
| **Dependencias** | `Greenhouse_Account_360_Object_Model_v1.md`, `Greenhouse_ICO_Engine_v1.md`, `GREENHOUSE_IDENTITY_ACCESS_V2.md` |
| **Supersedes** | Campo `notion_project_ids: ARRAY<STRING>` en `greenhouse.clients` (BigQuery, Spec v1 §3.1) y el patrón de UNNEST para filtrado de tareas |

---

## Estado 2026-03-18

Esta task sigue viva, pero ya no describe un greenfield puro.

Fuente operativa vigente para el estado actual:
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/complete/CODEX_TASK_ETL_ICO_Pipeline_Hardening.md`

Estado ya absorbido por la documentacion viva:
- el pipeline operativo ya se documenta como multi-step y automatizado con `/api/cron/sync-conformed`
- `space_id` y la normalizacion config-driven ya forman parte de la narrativa canonica del sync

Lo que esta task sigue cubriendo de verdad:
- cerrar la convergencia final entre los bindings historicos (`notion_workspaces`, `notion_workspace_source_bindings`) y la configuracion canonica por `Space`
- completar el corte definitivo de `notion_project_ids`
- dejar una sola historia documental coherente para el mapping `Space -> Notion`

Lectura correcta:
- tratar las partes que describen `notion-bigquery` como single-tenant hardcodeado como contexto historico o gap a validar
- contrastar siempre con la arquitectura viva antes de implementar
- si el runtime actual y este brief discrepan, prevalece la arquitectura actualizada del 2026-03-18

## 1. Contexto

### Problema

Hoy el mapping tenant → datos de Notion tiene estos problemas:

1. **`greenhouse.clients.notion_project_ids`** (BigQuery, Spec v1) — array manual de `notion_page_id` de proyectos individuales del cliente. Es la única fuente operativa actual.
2. **`greenhouse_core.notion_workspace_source_bindings`** (PostgreSQL, Account 360 canonical) — tabla normalizada que mapea `notion_workspaces` a source IDs de Notion, pero FK a la tabla legacy `notion_workspaces` (no al nuevo `spaces` de Account 360).

**Nota importante:** La tabla `greenhouse_core.spaces` (Account 360) **NO** tiene un campo `notion_project_ids`. Ese campo solo existe en BigQuery `greenhouse.clients`. La migración M0 de Account 360 renombró la tabla original `spaces` a `notion_workspaces` y creó una NUEVA tabla `spaces` como hijo de Organization. Son entidades diferentes.

El ICO Engine (§2.3) documenta que el JOIN actual es:

```sql
SELECT t.*
FROM `notion_ops.tareas` t
JOIN UNNEST(@notion_project_ids) AS pid
  ON t.proyecto LIKE CONCAT('%', pid, '%')
```

Este diseño tiene tres problemas:

1. **Mantenimiento manual**: cada vez que se crea o archiva un proyecto en Notion, alguien tiene que actualizar el array en PostgreSQL/BigQuery.
2. **No escala a N tenants en el pipeline**: el `notion-bigquery` hoy está hardcodeado con UN set de database IDs vía env vars (`NOTION_DB_TAREAS`, `NOTION_DB_PROYECTOS`, `NOTION_DB_SPRINTS`). Solo sincroniza las bases de un tenant.
3. **No captura la jerarquía real**: en Notion, cada cliente tiene su propio teamspace con instancias separadas de las bases Tareas, Proyectos, Sprints y Revisiones. El identificador raíz del tenant es el **database ID de Proyectos** del cliente, no un array de page IDs individuales. Si mapeas los database IDs, los proyectos se descubren automáticamente en cada sync — zero mantenimiento.

### Hallazgo técnico: Notion API no expone teamspace IDs

La API de Notion no ofrece endpoints para obtener información de teamspaces. Las páginas y databases solo reportan `workspace` como parent type. Por lo tanto, el teamspace no sirve como identificador técnico para el mapping. El identificador correcto es el **database ID** de la base de Proyectos de cada cliente, que es consultable vía API y del cual se derivan todas las tareas, sprints y revisiones.

### Decisión de diseño

Cada **Space** (tenant operativo, definido en Account 360) se mapea contra Notion a través de un **set de database IDs** (uno por cada base operativa del cliente en su teamspace). El `notion_db_proyectos` funciona como la raíz conceptual — de ahí cuelgan tareas, sprints y revisiones. Pero operacionalmente se necesitan los 3-4 database IDs completos para que el pipeline los sincronice.

### Alineación con Account 360

Account 360 (`Greenhouse_Account_360_Object_Model_v1.md`) establece la jerarquía:

```
Organization (empresa cliente — EO-ORG-XXXX)
  └── Space (tenant operativo — EO-SPC-XXXX)  ← boundary de tenant
        └── Services[] (futuro)
```

**Regla #3 de Account 360:** "Space es el boundary de tenant. Todo query client-facing filtra por `space_id`, no por `organization_id`."

Una Organization puede tener N Spaces (ej: Sky Chile y Sky Perú), cada uno con su propio teamspace en Notion y sus propias bases de datos. El mapping de Notion se hace **por Space**, no por Organization ni por client legacy.

El ICO Engine trabaja con `clients.notion_project_ids` (BigQuery) como scope chain, cargado en `TenantContext.projectIds` durante la resolución de sesión. Este task reemplaza ese array manual con un mapping de database IDs por Space que se descubren automáticamente.

---

## 2. Diagnóstico del estado actual

### Jerarquía de objetos (Account 360 post-M0, vigente)

```
greenhouse_core.organizations      — empresa cliente (EO-ORG)
  └── greenhouse_core.spaces       — tenant operativo (EO-SPC), tabla creada por Account 360 M0
        └── greenhouse_core.services[]  — servicios contratados (Services Architecture v1)

greenhouse_core.notion_workspaces  — tabla legacy (renombrada de spaces original en M0)
  └── greenhouse_core.notion_workspace_source_bindings  — bindings normalizados a Notion sources
```

**Dualidad post-M0:** La migración M0 renombró `spaces` → `notion_workspaces` y creó una NUEVA `spaces` como hijo de Organization. El binding normalizado (`notion_workspace_source_bindings`) FK a `notion_workspaces`, no al nuevo `spaces`. Este task crea un puente directo entre el Account 360 `spaces` y Notion.

### Fuentes actuales de notion_project_ids

| Ubicación | Tipo | Estado |
|-----------|------|--------|
| `greenhouse.clients.notion_project_ids` (BigQuery) | `ARRAY<STRING>` de page IDs | Operativo — alimenta `TenantContext.projectIds` |
| `greenhouse_core.notion_workspace_source_bindings` (PostgreSQL) | Rows normalizadas con `source_object_id` | Existe pero FK a `notion_workspaces` legacy |
| `greenhouse_core.spaces` (PostgreSQL) | N/A | **NO tiene `notion_project_ids`** |

### Pipeline `notion-bigquery` actual (repo: cesargrowth11/notion-bigquery)

- Python 3.12, Cloud Functions Gen2, HTTP trigger
- Cloud Scheduler: cron diario 03:00 AM Santiago (`0 3 * * *`)
- Config: `SYNC_TABLES` dict en `main.py` con 4 database IDs hardcodeados vía env vars
- Dataset: `efeonce-group.notion_ops`
- Tablas: `tareas` (1117 rows), `proyectos` (57), `sprints` (13), `revisiones` (3)
- Staging: `stg_tareas`, `stg_proyectos`, `stg_sprints`, `stg_revisiones` (tipadas)
- Audit: `raw_pages_snapshot` (append-only con JSON completo), `sync_log`
- Write strategy: `WRITE_TRUNCATE` por tabla completa (single-tenant)
- No estampa `space_id` en las filas sincronizadas
- Database IDs actuales: tareas=`3a54f090...`, proyectos=`15288d9b...`, sprints=`0c40f928...`, revisiones=`f791ecc4...`

### Pipeline `notion-frame-io` (repo: cesargrowth11/notion-frame-io)

- Python 3.12, Cloud Functions Gen2, bidireccional Notion↔Frame.io
- Comparte database ID de tareas (`3a54f090...`) con `notion-bigquery`
- Single-tenant, sin concepto de space_id
- Eventualmente necesita space_id awareness para multi-tenant

### Deprecar en BigQuery

```
greenhouse.clients.notion_project_ids ARRAY<STRING>  — ← A DEPRECAR por este task
```

La carga de `projectScopes` en `src/lib/tenant/access.ts` (línea ~244) que lee de `clients` deberá migrar a filtrar por `space_id` directamente.

---

## 3. Implementación

### 3.1 Nueva tabla: `greenhouse_core.space_notion_sources`

Tabla de configuración que mapea cada Space (Account 360) a sus database IDs de Notion. Es la tabla que el pipeline `notion-bigquery` consulta para saber qué bases sincronizar y con qué `space_id` estampar cada fila.

Nombre `space_notion_sources` (no `tenant_notion_sources`) para alinearse con la convención de Account 360 donde el objeto se llama Space.

**Relación con infraestructura existente:** Ya existe `notion_workspace_source_bindings` (FK a `notion_workspaces` legacy), que mapea workspaces a sources de forma normalizada. `space_notion_sources` es complementaria — denormalizada y optimizada para el pipeline, con FK al nuevo `spaces` de Account 360. Cuando la migración a Account 360 esté completa y `notion_workspaces` se deprece, `space_notion_sources` será la única tabla de binding.

**PostgreSQL (canónico):**

```sql
CREATE TABLE greenhouse_core.space_notion_sources (
  source_id             TEXT PRIMARY KEY,  -- formato: sns-{uuid}
  space_id              TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  
  -- Notion database IDs (32-char hex, sin guiones)
  -- notion_db_proyectos es la raíz conceptual: de esta base se derivan
  -- todos los proyectos del Space, y de los proyectos cuelgan tareas y sprints.
  notion_db_proyectos   VARCHAR(32) NOT NULL,
  notion_db_tareas      VARCHAR(32) NOT NULL,
  notion_db_sprints     VARCHAR(32),            -- nullable: no todos los clientes usan sprints
  notion_db_revisiones  VARCHAR(32),            -- nullable: no todos tienen base de revisiones separada
  
  -- Metadata
  notion_workspace_id   VARCHAR(36),            -- UUID del workspace de Notion (informativo, no usado como filtro)
  sync_enabled          BOOLEAN DEFAULT true,   -- toggle para pausar sync sin borrar config
  sync_frequency        VARCHAR(20) DEFAULT 'daily',  -- 'daily' | 'hourly' | 'manual' (futuro)
  last_synced_at        TIMESTAMPTZ,            -- última sincronización exitosa
  
  -- Audit
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by            VARCHAR(100),           -- user_id del admin que configuró
  
  UNIQUE(space_id)      -- un Space = un set de bases de Notion
);

-- Índice para el pipeline
CREATE INDEX idx_space_notion_active ON greenhouse_core.space_notion_sources(sync_enabled) 
  WHERE sync_enabled = true;

COMMENT ON TABLE greenhouse_core.space_notion_sources IS
  'Mapeo Space (tenant Account 360) → Notion database IDs. El pipeline notion-bigquery itera sobre esta tabla para sincronizar las bases de cada Space. Complementa notion_workspace_source_bindings (legacy, FK a notion_workspaces).';

COMMENT ON COLUMN greenhouse_core.space_notion_sources.notion_db_proyectos IS 
  'Database ID de la base de Proyectos del cliente en Notion. Es la raíz conceptual del Space — de aquí se derivan tareas, sprints y revisiones via relations de Notion.';
```

**BigQuery (réplica para queries analíticos):**

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.space_notion_sources` (
  source_id             STRING,
  space_id              STRING NOT NULL,
  notion_db_proyectos   STRING NOT NULL,
  notion_db_tareas      STRING NOT NULL,
  notion_db_sprints     STRING,
  notion_db_revisiones  STRING,
  notion_workspace_id   STRING,
  sync_enabled          BOOLEAN,
  sync_frequency        STRING,
  last_synced_at        TIMESTAMP,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP,
  created_by            STRING
);
```

### 3.2 Deprecar `notion_project_ids` en BigQuery `clients`

```sql
-- BigQuery: marcar como deprecated en greenhouse.clients
-- NO eliminar hasta que pipeline multi-tenant esté en producción
-- y todos los consumers hayan migrado a filtrar por space_id
ALTER TABLE `efeonce-group.greenhouse.clients`
SET OPTIONS (description = 'DEPRECATED column: notion_project_ids — reemplazado por space_notion_sources + space_id en notion_ops.*');
```

**NO eliminar `notion_project_ids` todavía** — el ICO Engine y `TenantContext.projectIds` (cargado en `src/lib/tenant/access.ts`) lo usan activamente. La migración es:

1. Pipeline estampa `space_id` en cada fila de `notion_ops.*`
2. Queries del portal migran de `UNNEST(@notion_project_ids)` a `WHERE space_id = @space_id`
3. `TenantContext` pasa a resolver `space_id` directamente (ya disponible en sesión)
4. Cuando todos los consumers hayan migrado, se elimina `notion_project_ids` de `clients`

### 3.3 Agregar `space_id` a tablas `notion_ops`

Todas las tablas sincronizadas desde Notion deben incluir `space_id` para filtrado multi-tenant:

```sql
-- Nuevo campo en notion_ops.tareas, notion_ops.proyectos, notion_ops.sprints, notion_ops.revisiones
-- El pipeline lo estampa en cada fila basándose en space_notion_sources
space_id    STRING    -- FK lógico a greenhouse_core.spaces.space_id
```

El pipeline inserta `space_id` durante la extracción, no como un paso posterior. Cada fila sabe a qué Space pertenece desde el momento en que se carga.

**Nombre `space_id`** (no `tenant_id`) para consistencia con Account 360, ICO Engine, Services Architecture, y el resto del ecosistema.

### 3.4 Impacto en `notion-bigquery` (Cloud Function — repo cesargrowth11/notion-bigquery)

**Arquitectura actual del pipeline:**

```python
# main.py líneas 72-89 — SYNC_TABLES registry (hardcodeado)
SYNC_TABLES = {
    "tareas": {
        "database_id": os.environ.get("NOTION_DB_TAREAS", "3a54f090..."),
        "description": "Tareas operativas con métricas de delivery"
    },
    "proyectos": { "database_id": os.environ.get("NOTION_DB_PROYECTOS", "15288d9b..."), ... },
    "sprints":    { "database_id": os.environ.get("NOTION_DB_SPRINTS", "0c40f928..."), ... },
    "revisiones": { "database_id": os.environ.get("NOTION_DB_REVISIONES", "f791ecc4..."), ... },
}
```

**Cambio de arquitectura:**

ANTES (actual):
```
SYNC_TABLES dict hardcodeado → query 1 set de DBs → WRITE_TRUNCATE sin space_id
```

DESPUÉS (target):
```
query BigQuery greenhouse.space_notion_sources WHERE sync_enabled = true
  → para cada Space:
      → construir SYNC_TABLES dinámicamente con los database IDs del Space
      → query Notion DB Tareas del Space
      → query Notion DB Proyectos del Space
      → query Notion DB Sprints del Space (si existe)
      → query Notion DB Revisiones del Space (si existe)
      → estampar space_id en cada fila (agregar a extract_page_properties)
      → load a notion_ops.* (delete + insert por Space)
```

**Write strategy: DELETE + INSERT por Space** (reemplaza WRITE_TRUNCATE global):
```sql
DELETE FROM `notion_ops.tareas` WHERE space_id = @current_space_id;
-- luego INSERT las filas nuevas del Space con space_id estampado
```

Ventajas:
- Si el sync de un Space falla, los datos de los otros Spaces permanecen intactos
- Permite sync incremental por Space (solo re-sync los que cambiaron)
- Compatible con el `raw_pages_snapshot` existente (append-only, sin cambios)

**Fuente de configuración:** La Cloud Function consulta BigQuery `greenhouse.space_notion_sources` (réplica de la tabla PostgreSQL). Evita configurar conexión PG adicional en la Cloud Function — ya tiene acceso a BigQuery.

**Impacto en staging tables (`stg_*`):** Agregar `space_id` como columna en las `build_staging_rows()` transformaciones (líneas 846-997 de `main.py`).

### 3.5 Impacto en queries de Greenhouse Portal e ICO Engine

**ANTES (ICO Engine §2.3, queries actuales):**
```sql
-- Tareas de un Space (via array manual)
SELECT t.*
FROM `notion_ops.tareas` t
JOIN UNNEST(@notion_project_ids) AS pid
  ON t.proyecto LIKE CONCAT('%', pid, '%')
```

**DESPUÉS:**
```sql
-- Tareas de un Space (via space_id estampado por pipeline)
SELECT t.*
FROM `notion_ops.tareas` t
WHERE t.space_id = @space_id
```

Más limpio, más eficiente (una comparación de string vs UNNEST + LIKE), y zero mantenimiento de arrays.

**Con Services operativo (sin cambios respecto a Services Architecture):**
```sql
-- Tareas de un Service dentro de un Space
SELECT t.*
FROM `notion_ops.tareas` t
JOIN `greenhouse_olap.services` s
  ON t.proyecto LIKE CONCAT('%', s.notion_project_id, '%')
WHERE s.space_id = @space_id
  AND s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

El `space_id` en `notion_ops.tareas` también permite validar que el JOIN por `notion_project_id` no cruza boundaries de Space — defensa en profundidad.

### 3.6 Seed data inicial

```sql
-- Obtener el space_id real de Efeonce:
-- SELECT space_id FROM greenhouse_core.spaces WHERE client_id = 'space-efeonce';

-- Efeonce se atiende como un cliente más — es el primer Space configurado.
INSERT INTO greenhouse_core.space_notion_sources (
  source_id, space_id,
  notion_db_proyectos, notion_db_tareas, notion_db_sprints, notion_db_revisiones,
  sync_enabled, created_by
) VALUES (
  'sns-' || gen_random_uuid(),
  (SELECT space_id FROM greenhouse_core.spaces WHERE client_id = 'space-efeonce'),
  '15288d9b145940529acc75439bbd5470',             -- Proyectos (notion-bigquery: NOTION_DB_PROYECTOS)
  '3a54f0904be14158833533ba96557a73',             -- Tareas    (notion-bigquery: NOTION_DB_TAREAS)
  '0c40f928047a4879ae702bfd0183520d',             -- Sprints   (notion-bigquery: NOTION_DB_SPRINTS)
  'f791ecc4f84c4cfc9d19fe0d42ec9a7f',             -- Revisiones(notion-bigquery: NOTION_DB_REVISIONES)
  true,
  'julio-admin'
);
```

**Nota:** Los database IDs corresponden a los actualmente configurados en `notion-bigquery/.env.yaml` y al seed de `notion-frame-io` (comparten la misma database de Tareas).

---

## 4. TypeScript types (Greenhouse Portal)

```typescript
// src/types/space-notion.ts

/** Mapping de un Space (tenant) a sus database IDs de Notion */
export interface SpaceNotionSource {
  sourceId: string
  spaceId: string
  
  /** Database ID de Proyectos — raíz conceptual del Space en Notion */
  notionDbProyectos: string
  notionDbTareas: string
  notionDbSprints: string | null
  notionDbRevisiones: string | null
  
  notionWorkspaceId: string | null
  syncEnabled: boolean
  syncFrequency: 'daily' | 'hourly' | 'manual'
  lastSyncedAt: string | null
  
  createdAt: string
  updatedAt: string
  createdBy: string | null
}
```

---

## 5. Impacto en documentos existentes

| Documento | Cambio requerido |
|---|---|
| `Greenhouse_ICO_Engine_v1.md` §2.3 | Actualizar cadena de scope: reemplazar `space.notion_project_ids` + UNNEST por `space_id` directo en `notion_ops.*`. Actualizar queries MVP y con-Services. |
| `Greenhouse_Portal_Spec_v1.md` §3.1, §3.3 | Deprecar `notion_project_ids` de schema de clients. Actualizar query de filtrado §3.3. |
| `Greenhouse_Account_360_Object_Model_v1.md` | Agregar referencia a `space_notion_sources` como tabla hija de `spaces`. Documentar deprecación de `notion_project_ids` en BigQuery `greenhouse.clients` (no en `spaces` — nunca existió ahí). |
| `Greenhouse_Account_360_Object_Model_v1.md` | Documentar relación entre `space_notion_sources` (nueva, FK a `spaces`) y `notion_workspace_source_bindings` (legacy, FK a `notion_workspaces`). Ambas coexisten durante la transición. |
| `Greenhouse_Services_Architecture_v1.md` | Sin cambio directo — Services ya hace FK a `spaces.space_id`. El `space_id` en `notion_ops.*` enriquece el JOIN. |
| `Greenhouse_Data_Node_Architecture_v1.md` | Los exports deben filtrar por `space_id` en vez de UNNEST. |

---

## 6. Admin UI (futuro — no en este task)

La tabla `space_notion_sources` se administra desde `/admin/spaces/[id]/notion` donde un `efeonce_admin` puede:
- Ver el mapping actual de Notion para un Space
- Configurar/actualizar los database IDs
- Activar/desactivar sync
- Ver la última sincronización y su estado
- Trigger manual de sync (futuro)

Esto NO está en scope de este task. Se documenta para el Codex task de Admin UI.

---

## 7. Acceptance Criteria

1. **Tabla `space_notion_sources` creada** en PostgreSQL (`greenhouse_core`) y replicada en BigQuery (`greenhouse`).
2. **Seed data de Efeonce** insertado con los 4 database IDs conocidos, vinculado al Space de Efeonce.
3. **Campo `space_id` presente** en `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints`, `notion_ops.revisiones` en BigQuery.
4. **Queries del portal e ICO Engine actualizados** para filtrar por `WHERE space_id = @space_id` en vez de `UNNEST(@notion_project_ids)`.
5. **TypeScript types** exportados desde `src/types/space-notion.ts`.
6. **`notion_project_ids` marcado como deprecated** en BigQuery `greenhouse.clients` (no eliminado — mantener como fallback hasta que todos los consumers migren a `space_id`).
7. **Pipeline `notion-bigquery`** actualizado para iterar sobre `space_notion_sources` y estampar `space_id` en cada fila (este cambio puede ser un Codex task separado para el repo `notion-bigquery`).

---

## 8. Notas para el agente

- **Este task toca tres repos**: `greenhouse-eo` (schema, types, queries), `notion-bigquery` (pipeline multi-tenant) y eventualmente `notion-frame-io` (space_id awareness). Si el agente solo tiene acceso a `greenhouse-eo`, implementar los ítems 1-6 y crear un placeholder/README para el ítem 7.
- **PostgreSQL es el target canónico** — las tablas se crean primero en `greenhouse_core`, BigQuery es réplica analítica.
- **Account 360 es el modelo de referencia.** Space es el tenant boundary. La FK es a `spaces(space_id)`, NO a `clients.client_id` (que está en proceso de deprecación).
- **El campo en `notion_ops.*` se llama `space_id`**, no `tenant_id` ni `client_id`. Esto es para consistencia con Account 360, ICO Engine, Services Architecture, y el resto del ecosistema.
- **No modificar tasks ya completados** — este task es aditivo.
- **Branching**: crear branch `feature/space-notion-mapping` desde `main`. No mergear a `main` directamente.
- **Efeonce es el primer Space y el caso de prueba** — el seed data usa los database IDs ya conocidos y documentados en `.env.yaml` y el README del pipeline `notion-bigquery`.
- **La constraint `UNIQUE(space_id)` es intencional**: un Space = un set de bases de Notion. Si un cliente tiene operaciones en Chile y Perú con bases separadas, esas son dos Spaces distintos (consistente con Account 360 §2.1), cada uno con su propio `space_notion_sources`.
- **PKs usan TEXT con prefijo `sns-`** — consistente con la convención del codebase donde todas las tablas core usan TEXT PKs con prefijos (org-, svc-, etc.). El `source_id` de `space_notion_sources` usa formato `sns-{uuid}`.
- **`notion-frame-io`** (repo: cesargrowth11/notion-frame-io) comparte el database ID de Tareas con `notion-bigquery`. Eventualmente necesita space_id awareness para multi-tenant, pero es un task separado.
- **`notion_workspace_source_bindings` coexiste** con `space_notion_sources` durante la transición. La primera FK a `notion_workspaces` (legacy), la segunda FK a `spaces` (Account 360). Cuando `notion_workspaces` se deprece completamente, `space_notion_sources` será la única tabla de binding.
