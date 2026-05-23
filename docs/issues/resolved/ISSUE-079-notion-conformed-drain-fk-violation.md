# ISSUE-079 — Notion conformed → PG drain viola FK sync_run_id

## Ambiente

production

## Detectado

2026-05-22, Sentry (JAVASCRIPT-NEXTJS-6C, "3 new alerts"), proyecto `javascript-nextjs`. 3 errores simultáneos en `POST /notion-conformed/sync` (ops-worker Cloud Run): `insert or update on table "tasks"/"projects"/"sprints" violates foreign key constraint "{tasks,projects,sprints}_sync_run_id_fkey"`.

## Síntoma

El cron diario `ops-notion-conformed-sync` (7:20 AM Santiago) fallaba al drenar BigQuery conformed → Postgres. Tres errores por corrida (uno por tabla). `greenhouse_delivery.{tasks,projects,sprints}` quedaba desactualizado en las corridas afectadas.

## Causa raíz

Las tablas `greenhouse_delivery.{tasks,projects,sprints}` tienen `sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id)`. `syncBqConformedToPostgres` estampaba `sync_run_id` en las filas pero **nunca creaba el row parent** en `source_sync_runs`.

El handler pasaba `syncRunId: orchestrationResult.syncRunId ?? \`pg-drain-${Date.now()}\``. `runNotionSyncOrchestration` devuelve `syncRunId: null` en sus ramas de skip / retry-gate / not-ready (BQ ya current). En esos casos el fallback sintético `pg-drain-…` no existía en `source_sync_runs` → violación de FK en cada INSERT/UPDATE de filas hijas. El paso PG drain (Step 2) corre **incondicionalmente** (es load-bearing — cierra el gap histórico de PG stale), justo cuando el id de Step 1 es null. El `?? pg-drain-…` era un parche que generaba el FK colgante.

## Impacto

- Path: cron `ops-notion-conformed-sync` (ops-worker, producción).
- Las corridas afectadas no actualizaban `greenhouse_delivery.*`; staleness intermitente según si Step 1 corría (cuando corría, el path inline usaba un run id válido).
- Ruido de alertas Sentry (3 errores por corrida).
- Sin pérdida de datos (la FK previno escribir filas con run id colgante).

## Solución

Fix de fondo (no parche): el drain BQ→PG es una operación de primera clase y ahora **posee su propio `source_sync_runs` run**.

- `openBqPgDrainRun(syncRunId, parentOrchestrationRunId)` — INSERT `status='running'` (source_system='notion', source_object_type='bq_pg_drain') **antes** de estampar filas hijas → FK siempre satisfecho, independiente de lo que hizo Step 1. Load-bearing: rethrows si falla (sin parent no tiene sentido continuar).
- `finalizeBqPgDrainRun(...)` — UPDATE `succeeded`/`failed` + counts + `finished_at` al cerrar → visibilidad en Ops Health. Non-critical: swallow.
- El id de orquestación se pasa como `parentOrchestrationRunId` (lineage en notes), **nunca** como el id estampado (evita clobber del run conformed vía ON CONFLICT).
- Ambos callers (ops-worker `server.ts` + admin route `trigger-conformed-sync`) dejan de fabricar ids colgantes.

Commit: `0521c236` (develop). Backstop de escalación añadido en `e50c4811`: reliability signal `sync.notion_conformed_drain.freshness` (`/admin/operations`) que alerta si el drain deja de completar.

Tests: 5 anti-regresión en `src/lib/sync/sync-bq-conformed-to-postgres.test.ts` (ownership, ordering open-before-stamp, lineage, finalize succeeded/failed, abort-loud si el open falla).

## Verificación

- Deploy ops-worker run `26289028121` (success).
- Corrida manual del cron post-deploy: `PG drain from BQ: read=152p/33s/5291t, written=152p/33s/5291t, deleted=0p/0s/0t` — written = read en las 3 entidades, 0 errores FK, 0 filas saltadas. PG quedó al día.
- Gate: tsc + lint + full suite (5211) + next build + esbuild ops-worker bundle.

## Estado

resolved

## Relacionado

- Helper canónico: `src/lib/sync/sync-bq-conformed-to-postgres.ts`
- Tabla run-tracking: `greenhouse_sync.source_sync_runs`
- Reliability signal backstop: `src/lib/reliability/queries/notion-conformed-drain-freshness.ts`
- Pendiente: el fix del admin route (`trigger-conformed-sync`) corre en Vercel producción desde `main` — queda con el código viejo hasta el próximo release `develop → main` (el cron programado, que era el incidente, está en ops-worker y ya está resuelto).
