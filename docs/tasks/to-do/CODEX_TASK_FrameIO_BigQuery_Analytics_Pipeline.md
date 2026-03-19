# CODEX_TASK: Frame.io → BigQuery Analytics Pipeline

## Meta

| Campo | Valor |
|-------|-------|
| **Task ID** | `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline` |
| **Repo** | `cesargrowth11/notion-frame-io` (extensión del sync existente) |
| **Prioridad** | P1 — enriquece ICO Engine con data analítica de Frame.io |
| **Dependencias** | `Greenhouse_ICO_Engine_v1.md`, `CODEX_TASK_Tenant_Notion_Mapping.md`, `CODEX_TASK_Creative_Hub_Module.md` |
| **Relacionado** | `Documentacion_Proyecto_Notion_FrameIO.docx` (sync actual v2.3.2) |

---

## 1. Resumen

### Problema

El sync `notion-frameio-sync` v2.3.2 solo escribe **6 data points** de Frame.io en Notion: conteo de versiones, conteo de comentarios, comentarios abiertos, status bidireccional, ronda de cambio del cliente y último comentario. Son conteos agregados que luego fluyen a BigQuery vía `notion-bq-sync`.

La API V4 de Frame.io expone **~33 campos de metadata built-in** por asset, **comentarios con detalle granular** (texto, timecode, created_at, completed_at, anotaciones, owner), **historial de versiones con timestamps individuales**, **analytics de Shares** (views, downloads), y **audit logs** completos. Ninguno de estos datos se captura hoy.

### Impacto en Greenhouse

Sin estos datos, el ICO Engine no puede calcular:

- **Cycle Time real entre rondas** (hoy solo tiene count de versiones, no timestamps)
- **Feedback response time** (delta entre comment del cliente y siguiente versión)
- **Throughput en minutos de contenido** (no tiene duration de los assets)
- **Distribución por tipo de asset** (no tiene file type / resolution)
- **Comment resolution time** (no tiene completed_at por comment)

El Creative Hub Module tiene 4 mejoras futuras bloqueadas por falta de data: galería de assets recientes (thumbnails), distribución por tipo, cycle time por fase con timestamps reales, y comparación entre proyectos.

### Solución

Extender el repositorio `notion-frame-io` con un **segundo entry point** (`bq_sync`) que ejecuta un pull daily de la API V4 de Frame.io y carga los datos analíticos en un dataset nuevo `frameio_ops` en BigQuery. El flujo actual de webhooks (Notion ↔ Frame.io) no se toca.

```
Frame.io V4 API
    │
    ├── Webhooks (real-time, existente) ──→ sync_status() entry point
    │     └── Notion ← → Frame.io (conteos, status)
    │           └── notion-bq-sync → BigQuery notion_ops (daily 03:00)
    │
    └── Daily pull (NUEVO) ──→ bq_sync() entry point
          └── BigQuery frameio_ops (daily 04:00)
                ├── frameio_ops.files
                ├── frameio_ops.versions
                ├── frameio_ops.comments
                ├── frameio_ops.share_activity
                ├── frameio_ops.audit_logs
                └── frameio_ops.sync_log
```

---

## 2. Contexto del proyecto

### Infraestructura existente

| Componente | Valor |
|---|---|
| Repo sync actual | `cesargrowth11/notion-frame-io` (Cloud Function `notion-frameio-sync`) |
| Versión actual | v2.3.2 |
| Runtime | Python 3.12, Google Cloud Functions 2ª Gen |
| Región | `us-central1` |
| GCP Project | `efeonce-group` |
| Auth Frame.io | OAuth 2.0 via Adobe IMS, auto-refresh, tokens en GCP Secret Manager |
| Entry point actual | `sync_status()` — HTTP handler para webhooks |
| Env vars Frame.io | `FRAMEIO_ACCESS_TOKEN`, `FRAMEIO_ACCOUNT_ID`, `FRAMEIO_PROJECT_ID` |

### Documentos normativos

| Documento | Qué aporta |
|---|---|
| `Greenhouse_ICO_Engine_v1.md` | Métricas que consume, scheduled queries, BigQuery-first |
| `CODEX_TASK_Tenant_Notion_Mapping.md` | Patrón `space_notion_sources`, multi-tenant por Space |
| `CODEX_TASK_Creative_Hub_Module.md` | Mejoras futuras que dependen de esta data |
| `Greenhouse_Account_360_Object_Model_v1.md` | Space como tenant boundary |
| `Documentacion_Proyecto_Notion_FrameIO.docx` | Arquitectura del sync actual |

---

## 3. Decisiones de arquitectura (confirmadas)

| # | Decisión | Opción elegida | Razón |
|---|---|---|---|
| D1 | Repo | Extender `notion-frame-io` existente | Reusar auth, token refresh, URL parser, infra GCP |
| D2 | Dataset BQ | `frameio_ops` separado | Convención: un dataset por source system |
| D3 | Tablas | 5 tablas + sync_log | files, versions, comments, share_activity, audit_logs |
| D4 | Scope files | Solo files con match en Notion | Reduce API calls, evita noise. Se expande en v2 |
| D5 | Join key | Pipeline escribe `notion_page_id` como FK | Tighter coupling, evita REGEXP en queries downstream |
| D6 | Campos files | 16 campos Tier 1 | Duration, resolution, thumbnail, creator, timestamps |
| D7 | Schedule | Cloud Scheduler daily 04:00 AM Santiago | Post notion-bq-sync (03:00), sin acoplamiento |
| D8 | Multi-tenant | Desde día 1 | Tabla `space_frameio_sources` en PostgreSQL |
| D9 | Conformed layer | Vista intermedia `greenhouse_conformed.tasks_enriched` | ICO Engine consume la vista, no hace JOINs directos |

---

## 4. Multi-tenant: `space_frameio_sources`

### 4.1 Nueva tabla PostgreSQL

Siguiendo el patrón de `space_notion_sources` (CODEX_TASK_Tenant_Notion_Mapping §3.1):

```sql
CREATE TABLE greenhouse_core.space_frameio_sources (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id              TEXT NOT NULL REFERENCES greenhouse_core.spaces(id),

  -- Frame.io V4 identifiers
  frameio_account_id    VARCHAR(36) NOT NULL,
  frameio_workspace_id  VARCHAR(36),           -- opcional, para scope futuro
  frameio_project_id    VARCHAR(36) NOT NULL,

  -- Display
  label                 VARCHAR(100),          -- ej: "Globe Studio - Bresler"

  -- Lifecycle
  active                BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(space_id, frameio_project_id)
);

COMMENT ON TABLE greenhouse_core.space_frameio_sources IS
  'Mapea cada Space (tenant) a su(s) proyecto(s) de Frame.io V4. '
  'El pipeline frameio-bigquery consulta esta tabla para saber qué sincronizar '
  'y con qué space_id estampar cada fila en BigQuery.';
```

### 4.2 Réplica en BigQuery

Misma tabla replicada en `greenhouse.space_frameio_sources` para que el pipeline la consulte sin depender de PostgreSQL en runtime:

```sql
CREATE TABLE `efeonce-group.greenhouse.space_frameio_sources` (
  id                    STRING NOT NULL,
  space_id              STRING NOT NULL,
  frameio_account_id    STRING NOT NULL,
  frameio_workspace_id  STRING,
  frameio_project_id    STRING NOT NULL,
  label                 STRING,
  active                BOOL DEFAULT TRUE,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
);
```

**Sync PostgreSQL → BigQuery:** Se puede resolver manualmente en MVP (INSERT directo en BQ Console) o via el mismo mecanismo que sincroniza `space_notion_sources`. El pipeline lee de BigQuery, no de PostgreSQL.

### 4.3 Flujo del pipeline

```
1. bq_sync() arranca
2. Lee greenhouse.space_frameio_sources WHERE active = true
3. Para cada row:
   a. Usa frameio_account_id + frameio_project_id para queries a Frame.io API
   b. Estampa space_id en cada fila que escribe en BigQuery
   c. Busca match en notion_ops.tareas para escribir notion_page_id como FK
4. Full refresh por space (WRITE_TRUNCATE con filtro WHERE space_id = X)
```

---

## 5. Schema BigQuery: Dataset `frameio_ops`

### 5.1 `frameio_ops.files`

Una fila por file (asset) en Frame.io. Fuente: `GET /v4/accounts/:id/files` + `GET /v4/accounts/:id/files/:id/metadata`.

```sql
CREATE TABLE `efeonce-group.frameio_ops.files` (
  -- Keys
  file_id               STRING NOT NULL,       -- Frame.io file UUID (PK)
  space_id              STRING NOT NULL,        -- FK a greenhouse_core.spaces
  notion_page_id        STRING,                 -- FK a notion_ops.tareas (null si no hay match)

  -- Identity
  name                  STRING,                 -- Nombre del file en Frame.io
  source_filename       STRING,                 -- Nombre original del archivo subido

  -- Media metadata (de /metadata endpoint)
  file_type             STRING,                 -- ej: "video", "image", "audio", "document"
  format                STRING,                 -- ej: "mp4", "mov", "png", "pdf"
  file_size_bytes       INT64,
  duration_seconds      FLOAT64,               -- null para imágenes/docs
  resolution_width      INT64,
  resolution_height     INT64,
  frame_rate             FLOAT64,
  video_codec           STRING,
  audio_codec           STRING,
  bit_rate              INT64,
  color_space           STRING,

  -- Custom fields
  status                STRING,                 -- Custom field Status de Frame.io
  rating                INT64,                  -- Rating 1-5 (null si no set)
  keywords              STRING,                 -- Comma-separated keywords

  -- Media links
  thumbnail_url         STRING,                 -- URL firmada del thumbnail (expira)

  -- Creator
  creator_id            STRING,                 -- Frame.io user ID que subió el file
  creator_name          STRING,                 -- Display name del creator

  -- Timestamps
  inserted_at           TIMESTAMP,              -- Fecha de creación en Frame.io
  updated_at            TIMESTAMP,              -- Última modificación

  -- Sync metadata
  synced_at             TIMESTAMP NOT NULL       -- Timestamp del sync run
);
```

### 5.2 `frameio_ops.versions`

Una fila por versión individual dentro de un version stack. Fuente: `GET /v4/accounts/:id/version_stacks/:id/children`.

```sql
CREATE TABLE `efeonce-group.frameio_ops.versions` (
  -- Keys
  version_id            STRING NOT NULL,        -- Frame.io file UUID de esta versión
  file_id               STRING NOT NULL,        -- FK al file "head" (latest) en frameio_ops.files
  version_stack_id      STRING NOT NULL,        -- Frame.io version stack UUID
  space_id              STRING NOT NULL,
  notion_page_id        STRING,

  -- Version info
  version_number        INT64,                  -- Posición en el stack (1 = primera)
  name                  STRING,

  -- Creator
  creator_id            STRING,
  creator_name          STRING,

  -- Timestamps — LA DATA CLAVE
  inserted_at           TIMESTAMP NOT NULL,     -- Cuándo se subió esta versión
  updated_at            TIMESTAMP,

  -- Derived (calculado en el pipeline)
  time_since_prev_version_hours FLOAT64,        -- Delta vs versión anterior (null para V1)

  -- Sync metadata
  synced_at             TIMESTAMP NOT NULL
);
```

**Valor analítico:** Con `inserted_at` por versión, el ICO Engine puede calcular:
- `AVG(time_since_prev_version_hours)` = Cycle Time real entre rondas
- `MAX(inserted_at) - MIN(inserted_at)` por tarea = Cycle Time total del asset
- Varianza de cycle time entre versiones

### 5.3 `frameio_ops.comments`

Una fila por comentario. Fuente: `GET /v4/accounts/:id/files/:id/comments` con `include=owner,replies`.

```sql
CREATE TABLE `efeonce-group.frameio_ops.comments` (
  -- Keys
  comment_id            STRING NOT NULL,        -- Frame.io comment UUID
  file_id               STRING NOT NULL,        -- FK al file
  space_id              STRING NOT NULL,
  notion_page_id        STRING,

  -- Content
  text                  STRING,                 -- Texto del comentario
  timestamp_frame       INT64,                  -- Timecode (frame number, starting from 1)
  has_annotation        BOOL DEFAULT FALSE,     -- Tiene anotación visual?

  -- Owner
  owner_id              STRING,
  owner_name            STRING,

  -- Lifecycle
  created_at            TIMESTAMP NOT NULL,
  updated_at            TIMESTAMP,
  completed_at          TIMESTAMP,              -- Cuándo se marcó como completado (null si abierto)

  -- Hierarchy
  parent_comment_id     STRING,                 -- null si es top-level, FK si es reply

  -- Sync metadata
  synced_at             TIMESTAMP NOT NULL
);
```

**Valor analítico:**
- `completed_at - created_at` = Comment resolution time
- Delta entre `created_at` del último comment y `inserted_at` de la siguiente versión = Feedback response time
- `COUNT(has_annotation = true) / COUNT(*)` = Annotation density (proxy de complejidad)

### 5.4 `frameio_ops.share_activity`

Una fila por Share link. Fuente: `GET /v4/accounts/:id/shares` + `GET /v4/accounts/:id/shares/:id/reviewers`.

```sql
CREATE TABLE `efeonce-group.frameio_ops.share_activity` (
  -- Keys
  share_id              STRING NOT NULL,
  space_id              STRING NOT NULL,

  -- Share info
  name                  STRING,
  access                STRING,                 -- "public", "private", "password"
  is_active             BOOL,

  -- Analytics
  view_count            INT64,
  last_viewed_at        TIMESTAMP,

  -- Reviewers (JSON array — denormalizado para simplicidad en MVP)
  reviewers_json        STRING,                 -- JSON array de {name, email, last_active}

  -- Timestamps
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP,

  -- Sync metadata
  synced_at             TIMESTAMP NOT NULL
);
```

### 5.5 `frameio_ops.audit_logs`

Una fila por acción registrada. Fuente: `GET /v4/accounts/:id/audit_logs` con filtro de fecha (incremental, últimos 2 días).

```sql
CREATE TABLE `efeonce-group.frameio_ops.audit_logs` (
  -- Keys
  audit_id              STRING NOT NULL,
  space_id              STRING NOT NULL,

  -- Action
  action                STRING NOT NULL,        -- ej: "file.created", "comment.created", "status.updated"
  item_type             STRING,                 -- ej: "file", "comment", "share"
  item_id               STRING,                 -- UUID del recurso afectado

  -- Actor
  actor_id              STRING,
  actor_name            STRING,

  -- Timestamps
  inserted_at           TIMESTAMP NOT NULL,

  -- Sync metadata
  synced_at             TIMESTAMP NOT NULL
);
```

**Nota:** A diferencia de las otras tablas, audit_logs usa **append incremental** (no full refresh). Cada run trae los últimos 2 días y hace MERGE para evitar duplicados.

### 5.6 `frameio_ops.sync_log`

```sql
CREATE TABLE `efeonce-group.frameio_ops.sync_log` (
  sync_id               STRING NOT NULL,
  space_id              STRING,                 -- null si es error global
  table_name            STRING NOT NULL,
  rows_synced           INT64,
  status                STRING NOT NULL,        -- "success" | "error" | "skipped"
  error_message         STRING,
  synced_at             TIMESTAMP NOT NULL
);
```

---

## 6. Implementación en el repo

### 6.1 Estructura de archivos (nuevo)

```
notion-frame-io/
├── main.py                          # Entry point existente: sync_status()
├── bq_sync.py                       # NUEVO: Entry point bq_sync() para BigQuery pipeline
├── frameio_bq/                      # NUEVO: módulo del pipeline
│   ├── __init__.py
│   ├── config.py                    # Lectura de env vars + space_frameio_sources de BQ
│   ├── api.py                       # Wrappers Frame.io V4 con paginación + retry
│   ├── extractors.py                # Extractores: files, versions, comments, shares, audit
│   ├── loaders.py                   # BigQuery loaders (schema, coercion, load)
│   ├── notion_matcher.py            # Lookup notion_page_id desde notion_ops.tareas
│   └── transforms.py                # Cálculos derivados (time_since_prev_version, etc.)
├── requirements.txt                 # Agregar google-cloud-bigquery si no está
├── deploy.sh                        # Actualizar para incluir bq_sync
├── deploy_bq_sync.sh               # NUEVO: deploy script separado para el segundo entry point
├── .env.yaml                        # Agregar BQ_DATASET_FRAMEIO
└── README.md                        # Actualizar documentación
```

### 6.2 Entry point: `bq_sync.py`

```python
"""
Frame.io V4 → BigQuery Analytics Pipeline
Google Cloud Function (2nd Gen)

Extrae datos analíticos de Frame.io y los carga en BigQuery
para enriquecer el ICO Engine y el Creative Hub de Greenhouse.

Efeonce Group — Multi-tenant (lee de space_frameio_sources)

Dataset: frameio_ops
Schedule: Cloud Scheduler diario 04:00 AM (Santiago)
"""

import functions_framework
from flask import jsonify
from frameio_bq.config import load_tenant_configs
from frameio_bq.extractors import (
    extract_files, extract_versions, extract_comments,
    extract_shares, extract_audit_logs
)
from frameio_bq.notion_matcher import build_notion_lookup
from frameio_bq.loaders import load_to_bigquery, log_sync_run

@functions_framework.http
def bq_sync(request):
    """Entry point para el pipeline Frame.io → BigQuery."""

    if request.method == "GET":
        return jsonify({
            "service": "frameio-bq-sync",
            "version": "1.0.0",
            "status": "ok",
            "dataset": "frameio_ops",
        }), 200

    # Soportar POST (Cloud Scheduler) y GET con ?run=true (manual)
    if request.method == "POST" or request.args.get("run") == "true":
        results = run_pipeline()
        return jsonify(results), 200

    return jsonify({"error": "Method not allowed"}), 405


def run_pipeline():
    """Ejecuta el pipeline completo para todos los tenants activos."""
    tenants = load_tenant_configs()
    all_results = []

    for tenant in tenants:
        space_id = tenant["space_id"]
        account_id = tenant["frameio_account_id"]
        project_id = tenant["frameio_project_id"]

        # Build Notion lookup para este space
        notion_lookup = build_notion_lookup(space_id)

        # Extract & Load por tabla
        for table_name, extractor in [
            ("files", extract_files),
            ("versions", extract_versions),
            ("comments", extract_comments),
            ("share_activity", extract_shares),
            ("audit_logs", extract_audit_logs),
        ]:
            try:
                rows = extractor(
                    account_id=account_id,
                    project_id=project_id,
                    space_id=space_id,
                    notion_lookup=notion_lookup,
                )
                count = load_to_bigquery(table_name, rows, space_id)
                log_sync_run(table_name, count, "success", space_id=space_id)
                all_results.append({
                    "space_id": space_id,
                    "table": table_name,
                    "rows": count,
                    "status": "success"
                })
            except Exception as e:
                log_sync_run(table_name, 0, "error",
                             space_id=space_id, error=str(e))
                all_results.append({
                    "space_id": space_id,
                    "table": table_name,
                    "rows": 0,
                    "status": "error",
                    "error": str(e)
                })

    return {"results": all_results}
```

### 6.3 Reutilización del código existente

El pipeline reutiliza del `main.py` existente:

| Componente existente | Uso en pipeline |
|---|---|
| `_fio_request()` | Wrapper HTTP con auto-refresh de token OAuth |
| `_load_tokens_from_secrets()` | Carga tokens de Secret Manager |
| `_refresh_access_token()` | Refresh automático via Adobe IMS |
| `parse_asset_id()` | Extracción de UUID desde URLs de Frame.io |

Estos se deben **extraer a un módulo compartido** (`frameio_bq/api.py`) o importar desde `main.py`. Se recomienda el refactor a módulo compartido para clean separation.

### 6.4 Notion matcher: cómo escribe `notion_page_id`

```python
# frameio_bq/notion_matcher.py

from google.cloud import bigquery

def build_notion_lookup(space_id: str) -> dict[str, str]:
    """
    Construye un dict {frame_asset_id: notion_page_id} para un space.

    Lee notion_ops.tareas y extrae el UUID del campo url_frame_io
    para cada tarea que tiene un URL de Frame.io.
    """
    client = bigquery.Client()
    query = """
        SELECT
            notion_page_id,
            REGEXP_EXTRACT(url_frame_io, r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})')
                AS frame_asset_id
        FROM `efeonce-group.notion_ops.tareas`
        WHERE url_frame_io IS NOT NULL
          AND url_frame_io != ''
          AND space_id = @space_id
    """
    job = client.query(query, job_config=bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("space_id", "STRING", space_id)
        ]
    ))
    return {
        row["frame_asset_id"]: row["notion_page_id"]
        for row in job.result()
        if row["frame_asset_id"]
    }
```

**Nota:** El REGEXP_EXTRACT se usa internamente en el pipeline para construir el lookup. Las tablas downstream (`frameio_ops.*`) reciben `notion_page_id` ya resuelto — los consumers nunca hacen REGEXP.

### 6.5 Deploy: segundo entry point

```bash
# deploy_bq_sync.sh
#!/bin/bash
set -e

PROJECT_ID="efeonce-group"
REGION="us-central1"
FUNCTION_NAME="frameio-bq-sync"
ENTRY_POINT="bq_sync"
RUNTIME="python312"

gcloud functions deploy ${FUNCTION_NAME} \
  --gen2 \
  --region=${REGION} \
  --runtime=${RUNTIME} \
  --source=. \
  --entry-point=${ENTRY_POINT} \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file=.env.yaml \
  --memory=512MB \
  --timeout=540s \
  --min-instances=0 \
  --max-instances=1

# Cloud Scheduler — 04:00 AM Santiago (UTC-3 → 07:00 UTC)
gcloud scheduler jobs create http frameio-bq-daily-sync \
  --location=${REGION} \
  --schedule="0 7 * * *" \
  --uri="$(gcloud functions describe ${FUNCTION_NAME} --gen2 --region=${REGION} --format='value(serviceConfig.uri)')" \
  --http-method=POST \
  --attempt-deadline=600s
```

**Diferencias con el deploy del sync:**
- Memoria: 512MB (más que 256MB del sync, porque procesa lotes grandes)
- Timeout: 540s (9 min, vs 60s del sync webhook)
- Max instances: 1 (no necesita concurrencia, es batch)

---

## 7. Conformed layer: `greenhouse_conformed.tasks_enriched`

Vista materializada que JOINea la data de Notion con la data analítica de Frame.io. El ICO Engine y el Creative Hub consumen de aquí.

```sql
CREATE OR REPLACE VIEW `efeonce-group.greenhouse_conformed.tasks_enriched` AS
WITH version_stats AS (
  SELECT
    notion_page_id,
    COUNT(*) AS total_versions,
    MIN(inserted_at) AS first_version_at,
    MAX(inserted_at) AS last_version_at,
    AVG(time_since_prev_version_hours) AS avg_hours_between_versions,
    TIMESTAMP_DIFF(MAX(inserted_at), MIN(inserted_at), HOUR) AS total_cycle_hours
  FROM `efeonce-group.frameio_ops.versions`
  WHERE notion_page_id IS NOT NULL
  GROUP BY notion_page_id
),
comment_stats AS (
  SELECT
    notion_page_id,
    COUNT(*) AS total_comments,
    COUNTIF(completed_at IS NOT NULL) AS resolved_comments,
    COUNTIF(completed_at IS NULL) AS open_comments,
    COUNTIF(has_annotation) AS annotated_comments,
    AVG(TIMESTAMP_DIFF(completed_at, created_at, MINUTE)) AS avg_comment_resolution_minutes,
    MIN(created_at) AS first_comment_at,
    MAX(created_at) AS last_comment_at
  FROM `efeonce-group.frameio_ops.comments`
  WHERE notion_page_id IS NOT NULL
    AND parent_comment_id IS NULL  -- Solo top-level, no replies
  GROUP BY notion_page_id
),
file_meta AS (
  SELECT
    notion_page_id,
    file_type,
    format,
    duration_seconds,
    resolution_width,
    resolution_height,
    file_size_bytes,
    thumbnail_url,
    creator_name AS file_creator,
    inserted_at AS file_created_at
  FROM `efeonce-group.frameio_ops.files`
  WHERE notion_page_id IS NOT NULL
)
SELECT
  t.*,

  -- File metadata
  f.file_type,
  f.format AS file_format,
  f.duration_seconds,
  f.resolution_width,
  f.resolution_height,
  f.file_size_bytes,
  f.thumbnail_url,
  f.file_creator,
  f.file_created_at,

  -- Asset classification (derived)
  CASE
    WHEN f.resolution_height >= 2160 THEN '4K'
    WHEN f.resolution_height >= 1080 THEN 'HD'
    WHEN f.resolution_height >= 720 THEN '720p'
    WHEN f.resolution_width > f.resolution_height THEN 'Landscape'
    WHEN f.resolution_width < f.resolution_height THEN 'Vertical'
    ELSE 'Other'
  END AS resolution_class,

  -- Version analytics
  vs.total_versions AS fio_total_versions,
  vs.first_version_at,
  vs.last_version_at,
  vs.avg_hours_between_versions,
  vs.total_cycle_hours,

  -- Comment analytics
  cs.total_comments AS fio_total_comments,
  cs.resolved_comments,
  cs.open_comments AS fio_open_comments,
  cs.annotated_comments,
  cs.avg_comment_resolution_minutes,
  SAFE_DIVIDE(cs.annotated_comments, cs.total_comments) AS annotation_density,

FROM `efeonce-group.notion_ops.tareas` t
LEFT JOIN file_meta f ON t.notion_page_id = f.notion_page_id
LEFT JOIN version_stats vs ON t.notion_page_id = vs.notion_page_id
LEFT JOIN comment_stats cs ON t.notion_page_id = cs.notion_page_id
```

**Materialización:** Scheduled query a las 05:00 AM (después de que frameio_ops esté fresco a las ~04:30).

---

## 8. ICO Engine: métricas enriquecidas

Con `tasks_enriched` disponible, el ICO Engine puede añadir o mejorar estas métricas:

| Métrica | Hoy | Con este pipeline |
|---|---|---|
| **RpA** | `frame_versions` de Notion (count) | `fio_total_versions` validado con timestamps reales |
| **Cycle Time** | Estimación por `last_edited_time - created_time` de Notion | `total_cycle_hours` real desde Frame.io (V1 → Vn) |
| **Cycle Time Variance** | No disponible | `STDDEV(time_since_prev_version_hours)` por tarea |
| **FTR%** | `client_change_round = 0` en Notion | Se mantiene igual, pero se valida con `total_versions = 1` de Frame.io |
| **Throughput** | Count de tareas completadas | Count + `SUM(duration_seconds)` = minutos de contenido |
| **Feedback Response Time** (NUEVO) | No disponible | Delta entre último comment y siguiente versión |
| **Comment Resolution Time** (NUEVO) | No disponible | `avg_comment_resolution_minutes` |
| **Annotation Density** (NUEVO) | No disponible | `annotation_density` como proxy de complejidad |

---

## 9. Environment variables (nuevas)

Agregar a `.env.yaml`:

```yaml
# ── BIGQUERY (pipeline analytics) ──
BQ_PROJECT: "efeonce-group"
BQ_DATASET_FRAMEIO: "frameio_ops"

# ── Multi-tenant ──
# El pipeline lee space_frameio_sources de BigQuery.
# No necesita env vars por tenant — la config está en la tabla.
```

---

## 10. API calls estimados por run

Para un Space típico de Globe (~200 tareas activas, ~150 con Frame.io URL):

| Endpoint | Calls por run | Rate limit concern? |
|---|---|---|
| List files (project) | ~2 (paginado a 100) | No |
| Show metadata (per file) | ~150 | Moderado — throttle a 5 req/s |
| List version stack children | ~100 (solo los que tienen >1 version) | Moderado |
| List comments (per file) | ~150 | Moderado — throttle a 5 req/s |
| List shares | ~1-2 | No |
| List audit logs | ~3-5 (paginado, últimos 2 días) | No |
| **Total** | ~410-510 calls | ~2 min a 5 req/s |

Con timeout de 540s y throttle, cabe cómodamente.

---

## 11. Roadmap de implementación

| Fase | Entregable | Dependencia | Estimado |
|---|---|---|---|
| **P0** | `space_frameio_sources` (PostgreSQL + BigQuery) + seed data Globe | Account 360 spaces table | 0.5 día |
| **P0** | Dataset `frameio_ops` en BigQuery (crear vacío con schemas) | GCP access | 0.5 día |
| **P1** | `frameio_bq/api.py` — refactor de `_fio_request()` y token management como módulo compartido | Acceso al repo | 1 día |
| **P1** | `frameio_bq/extractors.py` — extract files + metadata | api.py | 1.5 días |
| **P1** | `frameio_bq/extractors.py` — extract versions | api.py | 1 día |
| **P1** | `frameio_bq/extractors.py` — extract comments | api.py | 1 día |
| **P1** | `frameio_bq/notion_matcher.py` + `loaders.py` | notion_ops.tareas con space_id | 1 día |
| **P2** | `frameio_bq/extractors.py` — extract shares + audit_logs | api.py | 1 día |
| **P2** | `bq_sync.py` entry point + orchestration | Todo P1 | 0.5 día |
| **P2** | `deploy_bq_sync.sh` + Cloud Scheduler | Cloud Function deployed | 0.5 día |
| **P3** | `greenhouse_conformed.tasks_enriched` view + scheduled query | frameio_ops poblado | 1 día |
| **P3** | Test end-to-end con data real de Globe | Todo lo anterior | 1 día |

**Tiempo estimado total: ~10 días de desarrollo**

**Dependencia crítica:** `notion_ops.tareas` debe tener `space_id` estampado (de CODEX_TASK_Tenant_Notion_Mapping) para que el Notion matcher funcione.

---

## 12. Acceptance criteria

1. `frameio_ops.files` contiene al menos los files que tienen match en `notion_ops.tareas` vía URL Frame.io, con `duration_seconds`, `resolution_width`, `resolution_height`, `file_type`, y `thumbnail_url` poblados para assets de video.
2. `frameio_ops.versions` contiene el historial de versiones con `inserted_at` por versión. `time_since_prev_version_hours` está calculado.
3. `frameio_ops.comments` contiene todos los comentarios con `text`, `created_at`, `completed_at` (cuando aplique), `has_annotation`, y `owner_name`.
4. `frameio_ops.audit_logs` contiene acciones de los últimos 2 días en modo append.
5. `frameio_ops.share_activity` contiene los shares activos con `view_count`.
6. Cada fila en todas las tablas tiene `space_id` y `synced_at`.
7. Los files con match en Notion tienen `notion_page_id` poblado.
8. `greenhouse_conformed.tasks_enriched` existe como view y JOINea correctamente `notion_ops.tareas` con `frameio_ops.*`.
9. El pipeline corre sin error para al menos 1 Space configurado en `space_frameio_sources`.
10. `frameio_ops.sync_log` registra cada ejecución con status y row count.
11. Cloud Scheduler dispara el pipeline daily a las 04:00 AM Santiago.

---

## 13. Notas para agentes de desarrollo

- **No tocar `main.py` excepto para refactorizar funciones compartidas** (token management, `_fio_request()`). El flujo de webhooks no se modifica.
- **Los tokens OAuth de Frame.io ya están en Secret Manager** (`frameio-access-token`, `frameio-refresh-token`). El pipeline los reutiliza.
- **La API V4 usa cursor-based pagination**, no offset. Seguir el patrón: si `links.next` existe en la respuesta, fetch la URL completa.
- **`include=metadata` en Show file** retorna los 33 built-in fields. Para custom fields, usar el endpoint separado `/metadata`.
- **Los thumbnail URLs son firmados y expiran.** No cachear — se regeneran en cada sync. El portal debe re-fetchear cuando el usuario necesite ver uno.
- **Audit logs usan MERGE, no TRUNCATE.** La query de dedup es: `MERGE ON audit_id`.
- **El campo `timestamp` en comments es el frame number** (empieza en 1), no un timestamp ISO. No confundir con `created_at`.
- **Throttle a 5 req/s** para los endpoints de metadata y comments que hacen N calls por file. Usar `time.sleep(0.2)` entre requests.
- **Si un file no tiene version stack** (ej: es un file suelto, no versionado), no aparece en `versions`. Solo los files que son parte de un version stack generan filas en esa tabla.
- **Leer `CODEX_TASK_Tenant_Notion_Mapping.md`** antes de implementar — el patrón de multi-tenant con `space_*_sources` está documentado ahí.
