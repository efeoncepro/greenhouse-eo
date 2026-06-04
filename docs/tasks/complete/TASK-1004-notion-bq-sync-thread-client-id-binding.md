# TASK-1004 — notion-bq-sync: threadear el binding `client_id` del SSOT per-space (matar el lookup divergente al mirror BQ)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (data-completeness BQ; afecta downstream que filtra/joina por `client_id`)
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Domain: `integrations.notion|cross-repo|infra`
- Blocked by: `none`
- Blocks: `none`
- Branch: `task/TASK-1004-thread-client-id-binding` (repo hermano `efeoncepro/notion-bigquery`)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Post-cutover de TASK-1000/1003, Berel sincroniza nativo **pero sus filas en `notion_ops` quedan con `client_id` NULL** (verificado live: 80 filas Berel NULL vs Efeonce/Sky 100% seteado), y cada corrida emite `WARNING: No space_id binding found for Notion database 35c39c2f-…`. Causa raíz: `sync_table` re-derivaba el binding `{space_id, client_id}` contra el **mirror BQ legacy** (`_resolve_space_context`, tabla `efeonce-group.greenhouse.space_notion_sources`) que greenhouse-eo ya no escribe para clientes nuevos → Berel no tiene fila ahí. El loop per-space **ya cargó** ese binding del SSOT PG (`greenhouse_core.space_notion_sources` + `LEFT JOIN greenhouse_core.spaces`) pero solo threadeaba `space_id`, no `client_id`. Fix robusto: threadear `client_id`, preferir el valor del SSOT, dejar el mirror BQ solo como fallback del path legacy estático.

## Why This Task Exists

Es una **segunda fuente de verdad divergente**: `load_all_space_configs()` (qué sincronizar) ya merge BQ legacy + PG SSOT, pero `_resolve_space_context()` (el binding dentro de `sync_table`) quedó como laggard leyendo solo el mirror BQ. Resultado: la atribución de `client_id` de cualquier cliente nuevo (Berel y los que vengan por el wizard) queda en blanco en BigQuery, rompiendo en silencio cualquier downstream que filtre/joine `notion_ops` por cliente. El parche (backfillear el mirror BQ por cada cliente) perpetúa la divergencia y no escala. La solución de fondo es que la config que el loop ya cargó sea la única fuente de verdad del binding.

## Root Cause (evidencia)

```text
notion_ops.tareas (2026-06-04):
  Sky      spc-ae463d9f   4118 filas  client_id NULL=0     SET=4118  ✅ (en mirror BQ)
  Efeonce  spc-c0cf6478   1374 filas  client_id NULL=0     SET=1374  ✅ (en mirror BQ)
  Berel    space-cli-0863869c  80 filas  client_id NULL=80  SET=0    ❌ (NO en mirror BQ)
```

- `_resolve_space_context(database_id)` → `_load_database_space_contexts()` lee `BQ_SPACE_NOTION_TABLE = efeonce-group.greenhouse.space_notion_sources` (mirror BQ legacy).
- Berel nació por el wizard (TASK-992/998) → vive en PG SSOT, **no** en el mirror BQ.
- Loop per-space ([main.py:1929](../../../notion-bigquery/main.py)): tiene `space_config["client_id"]` (del `LEFT JOIN greenhouse_core.spaces`) pero llamaba `sync_table(..., space_id=sid)` sin `client_id`.
- `effective_client_id = space_context.get("client_id")` (sin fallback al threadeado) → NULL para Berel.

## Fix (robusto, no parche)

Repo hermano `efeoncepro/notion-bigquery`, `main.py`:

1. `sync_table(table_name, config, space_id=None, client_id=None)` — nuevo parámetro.
2. `effective_client_id = client_id or space_context.get("client_id")` — preferir el binding threadeado del SSOT; mirror BQ solo fallback.
3. Loop per-space pasa `client_id=space_config.get("client_id")`.
4. Warning re-gateado: solo si `effective_space_id` queda realmente sin atribuir (+ warning distinto/observabilidad si `client_id` queda sin resolver pese a tener space).
5. Path legacy estático (`SYNC_TABLES`, single-table) sin cambios → cae al fallback BQ → **Efeonce/Sky bit-for-bit**.

Commit: `87a4391` en `task/TASK-1004-thread-client-id-binding`.

## Tests

`tests/test_client_id_binding_threading.py` — 5 source-contract asserts (idiom del repo):
firma con `client_id`, preferencia threaded>mirror, threading en el caller per-space, warning gateado en `effective_space_id`, anti-parche (no requiere backfill BQ). Suite total **12 verde** (5 nuevos + 7 de TASK-1003 intactos).

## Deploy (cross-repo, payroll-crítico)

- Repo `efeoncepro/notion-bigquery`, Cloud Run `notion-bq-sync` (`us-central1`, proyecto `efeonce-group`).
- **NO** `bash deploy.sh` a secas (usa `--env-vars-file` → REPLACE → borraría las vars per-space + el secret PG que viven manuales en la revisión, no en `.env.yaml` gitignored). Deploy canónico **merge** (preserva env+secrets), igual que el cutover de TASK-1003:

  ```bash
  gcloud run deploy notion-bq-sync --source --function=notion_bq_sync \
    --region=us-central1 --project=efeonce-group \
    --service-account=183008134038-compute@developer.gserviceaccount.com \
    --update-env-vars=NOTION_PER_SPACE_TOKEN_ENABLED=true,NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true,GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev,GREENHOUSE_POSTGRES_DB=greenhouse_app,GREENHOUSE_POSTGRES_USER=greenhouse_app \
    --update-secrets=NOTION_TOKEN=notion-token:latest,GREENHOUSE_POSTGRES_PASSWORD=greenhouse-pg-dev-app-password:latest
  ```

- Aditivo + sin flag nuevo (el path per-space ya está ON). Reversible: traffic a la revisión previa (`00021-wkl`).

## Definition of Done

- [x] Fix implementado en `main.py` (repo hermano) + commit en rama TASK-1004 (`87a4391`).
- [x] Tests verde (12).
- [x] Deploy merge a Cloud Run `notion-bq-sync` (autorizado por el operador, revisión `00022-vk8`, env+secrets preservados).
- [x] Verificación post-deploy: corrida manual (10 ok, 0 errors) → **Berel `client_id` NULL=0** (tareas 80/80, proyectos 4/4) + **cero warnings de binding**. Efeonce/Sky no-regresión (NULL=0).
- [x] Rama pusheada a `origin`.
- [x] Lifecycle → `complete`, registros sincronizados, Handoff.

## Cierre (2026-06-04, live)

- Deploy: revisión `notion-bq-sync-00022-vk8` (100% tráfico). Merge preservó per-space + PG + ambos secrets + flags.
- Sync manual (`gcloud scheduler jobs run notion-bq-daily-sync`): `10 ok, 0 skipped, 0 errors — 5851 rows`, servido por `00022-vk8`.
- Berel `notion_ops`: `client_id` NULL 80→**0** (autocorregido por DELETE+INSERT, sin backfill). `sample_cid=cli-0863869c-…`.
- Efeonce (1374) / Sky (4118): `client_id` NULL=0 (bit-for-bit, sin regresión).
- Warnings de binding (`35c39c2f`): **0** en la corrida post-deploy.
- Rollback disponible <5 min: `gcloud run services update-traffic notion-bq-sync --to-revisions=notion-bq-sync-00021-wkl=100 --region=us-central1 --project=efeonce-group`.

## Out of Scope

- Backfill manual de las 80 filas Berel NULL: se autocorrigen en la corrida siguiente (DELETE+INSERT por space).
- Limpieza del mirror BQ legacy `greenhouse.space_notion_sources` (deprecación futura, fuera de este fix).
