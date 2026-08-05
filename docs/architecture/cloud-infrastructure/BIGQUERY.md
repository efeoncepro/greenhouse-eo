# Cloud Infrastructure — BigQuery

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **SoT live:** `bq ls` (proyecto `efeonce-group`) · Inventario auditado por última vez el
> **2026-04-23**; re-baseline pendiente (`TASK-127`). Estrategia dual-store:
> [`GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`](../GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md).

## Datasets (as-of 2026-04-23: 13 activos)

| Dataset | Estado / rol |
| --- | --- |
| `analytics_486264460` | export externo GA4 |
| `greenhouse` | dataset base del warehouse |
| `greenhouse_conformed` | capa normalizada |
| `greenhouse_marts` | vistas / marts |
| `greenhouse_raw` | snapshots fuente |
| `hubspot_crm` | espejo CRM legacy |
| `hubspot_notion_sync` | sync HubSpot -> Notion |
| `hubspot_notion_sync_staging` | variante staging |
| `ico_engine` | engine de métricas ICO |
| `notion_hubspot_reverse_sync` | sync Notion -> HubSpot |
| `notion_hubspot_sync_staging` | variante staging |
| `notion_ops` | capa legacy Notion |
| `searchconsole` | export Search Console |

## Concentración de storage (as-of 2026-04-23)

- `notion_ops` ~ `2.74 GiB`
- `hubspot_crm` ~ `0.58 GiB`
- `greenhouse_raw` ~ `0.06 GiB`

Tablas más pesadas al momento de la auditoría:

- `notion_ops.raw_pages_snapshot` ~ `2799 MiB`
- `hubspot_crm.emails_history` ~ `491 MiB`
- `hubspot_crm.emails` ~ `70 MiB`
- `greenhouse_raw.notion_tasks_snapshots` ~ `52 MiB`

## Lectura operativa

- BigQuery no muestra un problema de escala inmediata.
- El mayor foco de gobierno/costo está concentrado en `notion_ops` y `hubspot_crm`, no
  repartido homogéneamente.
