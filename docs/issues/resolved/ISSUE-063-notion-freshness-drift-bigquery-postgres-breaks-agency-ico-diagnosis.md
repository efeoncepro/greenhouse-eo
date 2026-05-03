# ISSUE-063 — Notion freshness drift BigQuery ↔ PostgreSQL rompe el diagnóstico operativo de Agency / ICO

## Ambiente

staging (`/agency`, Admin Spaces, tenant Notion status, operations overview)

## Detectado

2026-05-02 — investigación iniciada porque `/agency` mostraba `RpA Global = 3` y el usuario sospechó que "en mayo no hay nada de Notion".

## Síntoma

- `/agency` mostraba `RpA Global = 3`
- surfaces internas de admin podían mostrar `lastSyncedAt = null` o parecer desactualizadas
- el diagnóstico humano se iba hacia "Notion no corrió en mayo"

## Causa raíz

Había **dos verdades distintas** para freshness de Notion:

1. **BigQuery** `greenhouse.space_notion_sources.last_synced_at`
   - sí se actualizaba todos los días por el servicio upstream `notion-bq-sync`
2. **PostgreSQL** `greenhouse_core.space_notion_sources.last_synced_at`
   - seguía `NULL` para los mismos spaces activos

El portal tenía varios readers operativos leyendo PostgreSQL como si fuera la única fuente de verdad de freshness.

Al mismo tiempo, el `RpA Global = 3` no venía de falta de datos, sino de una muestra mínima en mayo 2026:

- Efeonce: `39` tareas del período
- `39` completadas
- solo `1` con `rpa_value > 0`
- `avg_positive_rpa = 3.0`

Es decir:

- **el pipeline de Notion estaba sano**
- **el dato de RpA era metodológicamente válido pero sensible a muestra**
- **el metadata drift hacía que la superficie operativa indujera un diagnóstico falso**

## Evidencia

- BigQuery raw `notion_ops.{tareas,proyectos,sprints}` fresco el `2026-05-02`
- BigQuery `greenhouse.space_notion_sources.last_synced_at` poblado
- PostgreSQL `greenhouse_core.space_notion_sources.last_synced_at = NULL`
- `INFORMATION_SCHEMA.JOBS_BY_PROJECT` confirmó el writer diario:

```sql
UPDATE `efeonce-group.greenhouse.space_notion_sources`
SET last_synced_at = CURRENT_TIMESTAMP()
WHERE space_id = @space_id
```

## Solución

### 1. Reconciliación canónica dentro del portal

Nuevo helper:

- `src/lib/integrations/notion-sync-freshness.ts`

Responsabilidades:

- leer freshness desde BigQuery
- entregar freshness efectiva por `space_id`
- reconciliar `last_synced_at` de BigQuery hacia PostgreSQL

### 2. Curación automática en el drain diario

`src/lib/sync/sync-bq-conformed-to-postgres.ts` ahora, además de drenar:

- `greenhouse_conformed.delivery_* -> greenhouse_delivery.*`

también ejecuta:

- `reconcileNotionFreshnessToPostgres()`

Así el binding canónico de PostgreSQL se autocorrige en la siguiente corrida normal del `BQ -> PG drain`.

### 3. Readers endurecidos

Se actualizaron readers para no mentir cuando PostgreSQL aún no haya sido reconciliado:

- `GET /api/admin/spaces`
- `GET /api/admin/tenants/[id]/notion-status`
- `src/lib/operations/get-operations-overview.ts`

Todos pueden usar BigQuery como fallback efectivo de freshness.

## Por qué esto se considera resuelto

Porque el bug real no era la fórmula de RpA ni la existencia de datos de mayo. Era el **drift del metadata operacional**:

- antes: BigQuery decía "sí sincronizado", PostgreSQL decía "nunca sincronizado"
- ahora: el portal reconcilia ese drift y deja de mostrar `NULL` como si fuera verdad final

Esto no altera artificialmente el `RpA = 3`; simplemente evita diagnosticarlo mal.

## Límite conocido

El writer primario sigue viviendo en el servicio upstream `notion-bq-sync`, fuera de este repo.  
La solución ideal de largo plazo sigue siendo dual-write del upstream a BigQuery + PostgreSQL en la misma corrida.

Mientras eso no exista, la reconciliación `BQ -> PG` del portal es el mecanismo oficial y suficiente para que las surfaces internas se mantengan correctas.

## Estado

resolved

## Relacionado

- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `src/lib/integrations/notion-sync-freshness.ts`
- `src/lib/sync/sync-bq-conformed-to-postgres.ts`
