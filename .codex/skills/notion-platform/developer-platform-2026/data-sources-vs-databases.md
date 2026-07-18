# Data Sources vs Databases — terminology shift canonical

> **Cambio canonical**: API version `2025-09-03`
> **Source**: https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03
> **Last verified**: 2026-05-17

## 1. Qué cambió

Antes de `2025-09-03`, todo era **"database"**. Después de `2025-09-03`, Notion split en:

```
Database (container conceptual, wrapper UI)
  └── Data Source[] (1+ por database — la entidad que se queryea)
        └── Page[] (rows)
```

En la práctica, **la mayoría de databases tienen 1 sola data source**. Pero conceptualmente, una database puede ser un "linked view" que apunta a otra data source compartida.

## 2. Endpoints — legacy vs canonical

### Query — endpoint cambió
| Operation | Legacy (pre 2025-09-03) | Canonical (post 2025-09-03) |
|---|---|---|
| Query | `POST /v1/databases/{id}/query` (deprecated) | `POST /v1/data_sources/{id}/query` |
| Get schema | `GET /v1/databases/{id}` (wrapper info) | `GET /v1/data_sources/{id}` (schema) |
| Update schema | `PATCH /v1/databases/{id}` | `PATCH /v1/data_sources/{id}` |
| Create | `POST /v1/databases` | `POST /v1/data_sources` (con `parent: { type: "database_id", database_id: "..." }`) |

### Parent type también cambió

Antes:
```jsonc
"parent": { "type": "database_id", "database_id": "..." }
```

Ahora (canonical):
```jsonc
"parent": { "type": "data_source_id", "data_source_id": "..." }
```

## 3. Webhooks — nuevos event types

Desde `2025-09-03` hay eventos canonical:
- `data_source.created`
- `data_source.content_updated`
- `data_source.moved`
- `data_source.deleted`
- `data_source.undeleted`
- `data_source.schema_updated`

Los legacy `database.schema_updated` y `database.content_updated` **siguen funcionando** pero están deprecated para new development.

## 4. Migration path canonical

### Si tienes consumer legacy
1. Identificar todas las invocaciones `/v1/databases/{id}/query`
2. Reemplazar por `/v1/data_sources/{id}/query`
3. Resolver `data_source_id` para cada legacy `database_id`:
   - `GET /v1/databases/{id}` retorna info incluyendo `data_sources: [{ id, name }]`
   - Para databases con 1 sola data source, usar el primer item
4. Update `parent` references en code/config
5. Bump `Notion-Version` header a `2025-09-03` (o newer)

### Si emergen consumers nuevos
- **SIEMPRE** usa endpoint canonical desde día 1
- **NUNCA** uses endpoint legacy "porque hay code anterior" — la legacy va a desaparecer eventualmente

## 5. Implicación para Greenhouse

### Estado actual al 2026-05-17 (asumido — verificar)
- `notion-bq-sync` legacy probablemente usa `/v1/databases/{id}/query` (pre 2025-09-03)
- Sync conformed pipeline puede usar legacy también
- Necesita **audit** durante TASK-879 follow-ups o TASK-901 implementación

### Para TASK-901 (NEW consumer)
- Webhook handler escucha `page.properties_updated` (no afectado por database/data_source split)
- Re-fetch usa `GET /v1/pages/{id}` (no afectado)
- Discovery del schema usa `GET /v1/data_sources/{id}` (canonical desde día 1)
- Backfill (S8) query usa `POST /v1/data_sources/{id}/query` (canonical)

### Para TASK-910 (NEW demo teamspace)
- IDs canonical son **data source IDs** (`36339c2f-efe7-81a6-980c-000b0056bba8` = Tareas data source)
- No usar `database_id` legacy — usar `data_source_id` directo

## 6. Hard rules canonical

- **NUNCA** mezclar legacy `database_id` y canonical `data_source_id` en mismo handler — confusion garantizada
- **SIEMPRE** usa `/v1/data_sources/.../query` en code nuevo
- **NUNCA** migres consumer crítico legacy → canonical sin run tests anti-regresión + shadow mode
- **SIEMPRE** documenta en code comment cuando un ID es `database_id` vs `data_source_id` (typing puede no ayudar — ambos son UUIDs)

## 7. Casos edge

### Linked databases
Cuando un user crea un "linked view" de una database, el linked view es una nueva **database** pero comparte la **data source** original. Implicación:
- Cambios en data source visible en TODOS los linked databases
- Schema cambia 1 vez (en data source) propaga a todos
- Queries dan mismo result regardless de qué linked database queryeas (si usas el mismo data_source_id)

### Multi-data-source database (raro)
Una database PUEDE tener múltiples data sources (cross-source views, formulas que mergean, etc.). En este caso, query a uno solo retorna ese subset. No común en flow operativo Greenhouse.

## 8. Cross-refs

- `api-reference/endpoints-canonical.md` — endpoint matrix completa
- `api-reference/data-model.md` — object hierarchy
- `api-reference/webhooks-canonical.md` — event types canonical
- `greenhouse-runtime/tenant-config.md` — data source IDs Efeonce/Sky/Demo
- Notion upgrade guide: https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03
