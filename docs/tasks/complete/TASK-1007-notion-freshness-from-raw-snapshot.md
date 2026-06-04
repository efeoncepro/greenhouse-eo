# TASK-1007 — notion freshness: derivar `last_synced_at` de `notion_ops.raw_pages_snapshot` (matar el último lector del mirror BQ legacy)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (observabilidad: `space_notion_sources.last_synced_at` NULL para clientes nuevos)
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Domain: `integrations.notion|infra`
- Blocked by: `none`
- Blocks: `none`
- Branch: `develop` (greenhouse-eo, sin deploy productivo de por medio)
- Validado por: skill `arch-architect` (4 pilares ✅)

## Summary

`greenhouse_core.space_notion_sources.last_synced_at` quedaba **NULL para siempre** en clientes nuevos (Berel). Causa raíz: `getNotionFreshnessFromBigQuery` ([notion-sync-freshness.ts](../../../src/lib/integrations/notion-sync-freshness.ts)) leía el `last_synced_at` del **mirror BQ legacy** `efeonce-group.greenhouse.space_notion_sources`, que solo contiene Efeonce/Sky y greenhouse-eo ya no escribe para clientes nuevos (misma raíz que cerró TASK-1004 en el lado del binding). Berel no estaba en el mirror → nunca entraba a `reconcileNotionFreshnessToPostgres` → PG NULL. Fix: derivar la freshness de `notion_ops.raw_pages_snapshot.synced_at` (evidencia real del sync, contiene **todos** los spaces). El UPDATE PG no cambia.

## Why This Task Exists

Era el **último consumer divergente** que leía el mirror BQ legacy. El readiness gate (`notion-readiness.ts`) y `getNotionSyncOperationalOverview` ya tratan `notion_ops.*` `synced_at` como fuente canónica de "cuándo sincronizó un space". Este fix alinea el helper de freshness con esa SSOT → cualquier cliente nuevo queda atribuido **sin código** (escribe en raw por construcción + el wizard ya crea la fila PG). Fix-once, zero-per-client.

## Decision (arch-architect, 4 pilares ✅)

- **Fuente:** `notion_ops.raw_pages_snapshot` `MAX(synced_at) GROUP BY space_id`. Quitado el filtro `sync_enabled` (no es columna en raw; lo enforce el guard `WHERE sns.sync_enabled=TRUE` del UPDATE PG). Mantenido `synced_at IS NOT NULL` + `space_id IS NOT NULL`.
- **Alternativas rechazadas:** (a) backfillear el mirror BQ por cliente → parche, no escala. (b) escribir PG desde el Cloud Run → requiere deploy del sibling + no cubre Efeonce/Sky legacy. (c) leer las staging tables (tareas/proyectos/sprints) → 3 tablas vs 1; raw es superset.
- **Mirror NO se borra:** solo se deja de leer aquí. El sibling repo aún lo usa como fallback legacy (TASK-1004). Deprecación física = task aparte.

### 4 pilares

- **Safety:** read-only freshness; demo (`sync_enabled=FALSE`) protegido doble (no escribe en raw + guard del UPDATE PG); UPDATE monotónico no corrompe.
- **Robustness:** UPDATE idempotente con guard `last_synced_at IS NULL OR < incoming`; NULL para space sin data = correcto.
- **Resilience:** corre en el drain conformed (manejo de error existente), best-effort; degrada honesto si el query BQ falla.
- **Scalability:** scan ~30 MB (columnar, solo `space_id`+`synced_at`), con filtro `targetSpaceIds` aún menos. Follow-up no bloqueante: clusterizar `raw_pages_snapshot` por `space_id`.

## Consumers (blast radius mapeado)

- `getEffectiveLatestNotionSyncAt()` → dashboard ops health (`get-operations-overview.ts:910`). `MAX(pgLastSync, bqLastSync)` global, tolerante. Efeonce/Sky: valor casi idéntico.
- `reconcileNotionFreshnessToPostgres(targetSpaceIds)` → drain conformed (`sync-bq-conformed-to-postgres.ts:421`). UPDATE PG sin cambios.
- Reliability signal `integrations.notion.freshness.upstream` → **ya lee raw, no el mirror** → no se toca.

## Verificación (live, 2026-06-04)

- Test focal 4 verde + blast-radius (`sync-bq-conformed-to-postgres.test`) verde. tsc 0, lint 0.
- Reconcile one-shot Berel: `getNotionFreshnessFromBigQuery` desde raw → `2026-06-04T10:51:29Z`; `reconcileNotionFreshnessToPostgres` → `updatedSpaces: 1`.
- PG confirmado: `Grupo Berel last_synced_at = 2026-06-04 10:51:29` (antes NULL); Efeonce/Sky intactos.

## Hard rules

- **NUNCA** volver a leer el mirror BQ `greenhouse.space_notion_sources` para derivar freshness. Fuente canónica = `notion_ops` `synced_at`.
- **NUNCA** quitar el guard `sync_enabled=TRUE` del UPDATE PG (protege demo + spaces deshabilitados).
- **SIEMPRE** mantener el UPDATE monotónico (`last_synced_at IS NULL OR < incoming`).

## Out of Scope

- Deprecación física del mirror BQ `greenhouse.space_notion_sources` (su propio blast radius; sibling repo aún lo usa).
- Clustering de `raw_pages_snapshot` por `space_id` (follow-up de costo, no urgente).
- `clients.billing_currency` vacío de Berel: **no es bug** — la moneda canónica es `client_profiles.payment_currency=MXN` (correcta). La columna legacy la cubre TASK-1006.
