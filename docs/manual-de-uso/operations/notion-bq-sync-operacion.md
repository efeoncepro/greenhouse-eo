# Manual de uso — Operar el sync Notion → BigQuery (notion-bq-sync)

> **Tipo:** Manual de uso (operador)
> **Versión:** 1.0
> **Creado:** 2026-06-04 por Claude (TASK-1003)
> **Documentación funcional:** `docs/documentation/operations/notion-bigquery-sync.md`
> **Arquitectura:** `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`

## Para qué sirve

Operar, verificar y recuperar el robot que copia las bases de Notion a BigQuery (alimenta métricas ICO → bonos de nómina). **Flujo crítico:** cualquier cambio se hace con verificación y con vuelta atrás lista.

## Antes de empezar

- `gcloud` autenticado contra `efeonce-group` (cuenta `julio.reyes@efeonce.org`).
- Código del extractor: repo hermano `efeoncepro/notion-bigquery` (rama canónica de trabajo: `task/TASK-1003-notion-data-sources-endpoint`).
- Servicio Cloud Run: `notion-bq-sync` en `us-central1`. URL: `https://notion-bq-sync-183008134038.us-central1.run.app` (alias viejo `…y6egnifl6a-uc.a.run.app` también responde).
- Datos canónicos:
  - Efeonce space `spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`
  - Sky space `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`
  - Berel space `space-cli-0863869c-eaac-4630-9bd0-af283c56f7fb`
- Flags relevantes (env vars del servicio): `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` (endpoint canónico), `NOTION_PER_SPACE_TOKEN_ENABLED` (token por cliente), `NOTION_VERSION` (opcional, default `2026-03-11`).

## Estado canónico esperado (steady state)

- Endpoint: `POST /v1/data_sources/{id}/query` + `Notion-Version: 2026-03-11`.
- Flags `NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true` y `NOTION_PER_SPACE_TOKEN_ENABLED=true`.
- Sync diario 03:00 America/Santiago, 0 errores, conteos estables.

---

## Salud / verificación rápida

```bash
# Health (lista spaces activos, confirma que arranca + PG conecta)
curl -s 'https://notion-bq-sync-183008134038.us-central1.run.app' | python3 -m json.tool

# Revisión activa + flags
gcloud run services describe notion-bq-sync --region=us-central1 --project=efeonce-group \
  --format='value(status.latestReadyRevisionName)'

# Logs recientes (errores + resumen)
gcloud run services logs read notion-bq-sync --region=us-central1 --project=efeonce-group --limit=80 \
  | grep -iE "Sync complete|ERROR|per-client space config|❌"
```

## Disparar un sync manual

```bash
URL="https://notion-bq-sync-183008134038.us-central1.run.app"
# Todos los clientes (= lo que hace el cron diario)
curl -s -X POST "$URL" -H 'Content-Type: application/json' -d '{}'
# Un solo cliente (más liviano)
curl -s -X POST "$URL?space_id=spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad" -H 'Content-Type: application/json' -d '{}'
# Disparar el cron desde Scheduler
gcloud scheduler jobs run notion-bq-daily-sync --location=us-central1 --project=efeonce-group
```

## Verificar la data en BigQuery

```bash
bq query --project_id=efeonce-group --use_legacy_sql=false --format=pretty \
"SELECT space_id, source_database AS tabla, COUNT(*) n, FORMAT_TIMESTAMP('%H:%M', MAX(synced_at)) ultima
 FROM \`efeonce-group.notion_ops.raw_pages_snapshot\`
 WHERE synced_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
 GROUP BY 1,2 ORDER BY 1,2"
```

---

## Gate de paridad (OBLIGATORIO antes de prender/cambiar el endpoint o la versión)

Compara el endpoint viejo vs el canónico sobre Efeonce/Sky **sin escribir a BigQuery**. Debe dar **PARIDAD TOTAL**.

```bash
cd /Users/jreye/Documents/notion-bigquery   # rama task/TASK-1003-notion-data-sources-endpoint
export TOK_GLOBAL="$(gcloud secrets versions access latest --secret=notion-token --project=efeonce-group)"
python3 parity_check_task1003.py            # exit 0 = PARIDAD TOTAL; exit 1 = NO prender
```

## Desplegar el extractor (comando CANÓNICO — NO usar `deploy.sh` a secas)

`deploy.sh` usa `--env-vars-file`/`--set-secrets` (REEMPLAZAN todo) y **borraría** las vars per-space + el secret de Postgres (que viven manuales en la revisión, no en `.env.yaml`). Usar siempre **MERGE**:

```bash
cd /Users/jreye/Documents/notion-bigquery   # rama con el código a desplegar
gcloud run deploy notion-bq-sync \
  --region=us-central1 --project=efeonce-group \
  --source=. --function=notion_bq_sync --allow-unauthenticated \
  --update-env-vars=NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true,NOTION_PER_SPACE_TOKEN_ENABLED=true,GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev,GREENHOUSE_POSTGRES_DB=greenhouse_app,GREENHOUSE_POSTGRES_USER=greenhouse_app \
  --update-secrets=NOTION_TOKEN=notion-token:latest,GREENHOUSE_POSTGRES_PASSWORD=greenhouse-pg-dev-app-password:latest \
  --memory=2Gi --timeout=600 --min=0 --max=3 --concurrency=1
```

## Prender / apagar el endpoint canónico (sin rebuild)

```bash
# Prender (solo tras paridad verde)
gcloud run services update notion-bq-sync --region=us-central1 --project=efeonce-group \
  --update-env-vars=NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true
# Apagar (rollback inmediato)
gcloud run services update notion-bq-sync --region=us-central1 --project=efeonce-group \
  --update-env-vars=NOTION_DATA_SOURCES_ENDPOINT_ENABLED=false
```

## Rollback (< 5 min)

```bash
# Opción A: apagar el flag (ver arriba)
# Opción B: mandar el tráfico a una revisión previa sana
gcloud run services update-traffic notion-bq-sync --region=us-central1 \
  --to-revisions=notion-bq-sync-00020-6vw=100   # o 00019-fgp (pre-TASK-1003)
```

---

## Onboardear un cliente nuevo (proceso idempotente — NO se repite el cutover)

1. **Provisioning Notion del cliente** (parte del onboarding, ver el checklist): crear su integración Notion + token, subirlo a Secret Manager (`notion-integration-token-greenhouse-<slug>`), dar `secretAccessor` al SA `183008134038-compute@`, y registrar el space en `greenhouse_core.space_notion_sources` con sus **data_source ids** + `notion_token_secret_ref`.
2. **Prender la sincronización:**
   ```sql
   UPDATE greenhouse_core.space_notion_sources SET sync_enabled = TRUE WHERE space_id = '<space del cliente>';
   ```
3. **Smoke:** `curl -s -X POST "$URL?space_id=<space>" -d '{}'` → debe extraer sus bases (3/3 o las que tenga), 0 errores.
4. Listo. El cron diario lo toma desde la próxima corrida. **No hay deploy ni cambios de código.**

> Importante: si el cliente tiene nombres/estados de propiedades distintos al template, el conformed los mapea a NULL (no rompe, deja data incompleta). Estandarizar el template en Notion (L1) **antes** de confiar sus métricas.

## Qué NO hacer

- ❌ No volver al endpoint viejo (`/v1/databases/{id}/query`) ni a `Notion-Version 2022-06-28`.
- ❌ No correr `bash deploy.sh` a secas (borra env per-space + secret PG). Usar el comando MERGE de arriba.
- ❌ No prender el flag ni cambiar `NOTION_VERSION` sin paridad verde.
- ❌ No guardar parent database ids de un cliente para meterlo por el endpoint viejo (parche prohibido).

## Problemas comunes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Cliente nuevo da 404 | token sin acceso al teamspace o ids mal | revisar token + que el teamspace esté compartido con su integración; verificar `space_notion_sources` |
| Tras un deploy, un cliente deja de sincronizar | `deploy.sh` borró env per-space/secret | re-desplegar con el comando MERGE (re-asevera per-space + secrets) |
| Paridad da diferencias | posible breaking change de versión Notion | NO prender; investigar; mantener flag OFF |
| Warning "database id legacy" en logs | un space quedó con database id viejo | correr el backfill `scripts/notion/backfill-task1003-data-source-ids.ts` (greenhouse-eo) o actualizar su id a data_source |

## Referencias técnicas

- Arquitectura: `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`
- Funcional: `docs/documentation/operations/notion-bigquery-sync.md`
- Task: `docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md`
- Backfill ids: `scripts/notion/backfill-task1003-data-source-ids.ts`
- Gate paridad: `parity_check_task1003.py` (repo hermano `efeoncepro/notion-bigquery`)
- CLAUDE.md / AGENTS.md: "Notion data_sources endpoint canónico (TASK-1003)"
