# Backfill histórico de Search Console (SEO · Search Visibility 360)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-07 por Claude (TASK-1655)
> **Ultima actualizacion:** 2026-08-07 por Claude (TASK-1655)
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §4

## Para qué sirve

Trae el **pasado** de Search Console (hasta 16 meses, lo que Google retiene) a la tabla
histórica `greenhouse_growth_analytics.seo_gsc_history` en BigQuery, para que las
pantallas del módulo SEO muestren "la película" completa y no solo los días capturados
desde que el cron diario existe. El costo de API es $0; el almacenamiento BQ, centavos.

**Dónde vive cada cosa:**

- **PostgreSQL `seo_gsc_daily`** = ventana caliente operativa (el cron diario la llena y
  ahora también espeja cada día a BQ).
- **BigQuery `seo_gsc_history`** = source of truth del histórico. El backfill escribe
  AQUÍ, nunca a PG — 16 meses de una org serían ~1 GB en la instancia OLTP compartida.

## Antes de empezar

1. Proxy PG arriba: `pnpm pg:connect` (en otra terminal).
2. ADC de gcloud vigente (`gcloud auth application-default print-access-token`).
3. Credenciales OAuth de Search Console en el entorno del proceso (las mismas del
   ops-worker; localmente NO están en `.env.local`):
   - `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` (valor en Vercel staging)
   - `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF=greenhouse-search-console-oauth-client-secret`
4. La org debe tener **conexión GSC activa** en Greenhouse (OAuth de TASK-1282 con
   propiedad seleccionada). Sin conexión el día degrada a `not_connected` — el script lo
   reporta, no lo esconde.

## Paso a paso

```bash
# 1. Plan (no llama a la API ni escribe): rango + días ya presentes en BQ
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-gsc-history.ts --dry-run

# 2. Backfill completo (todas las orgs con conexión activa, 16 meses)
GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID=<client-id> \
GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF=greenhouse-search-console-oauth-client-secret \
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-gsc-history.ts

# 3. Una sola org / menos meses
... backfill-gsc-history.ts --org=org-XXXX --months=6
```

El script es **resumible**: los días ya presentes en BQ se saltan. Si se corta (red,
cuota), re-córrelo y retoma donde quedó. Re-correr un día ya escrito no duplica (MERGE
idempotente por org+fecha+query+page).

## Qué significan los estados

| Estado | Significado | Acción |
|---|---|---|
| `materialized` | Día escrito en BQ con N filas | — |
| `skipped_existing` | El día ya estaba en BQ | — |
| `empty` | GSC respondió sin filas (día sin tráfico o fuera de retención) | — (hecho, no error) |
| `degraded` | El fetch degradó (`disabled`/`not_connected`/`token_unhealthy`) | revisar credenciales/conexión y re-correr |
| `failed` | Excepción inesperada (capturada en Sentry) | re-correr; si persiste, revisar Sentry |

## Verificación

```bash
bq query --use_legacy_sql=false 'SELECT organization_id, MIN(capture_date) AS min_date,
  MAX(capture_date) AS max_date, COUNT(DISTINCT capture_date) AS days, COUNT(*) AS row_count
  FROM `efeonce-group.greenhouse_growth_analytics.seo_gsc_history` GROUP BY organization_id'
```

`min_date` debe llegar ~16 meses atrás (o hasta donde la propiedad tenga historia). En
`/admin/growth/seo/performance`, un rango de 90/180 días debe mostrar la serie completa
(el reader cae solo a BQ cuando PG no cubre la ventana pedida).

## Qué no hacer

- **No** apuntar el backfill a PG ni "aprovechar" de llenar `seo_gsc_daily` — el split
  OLTP/OLAP existe para que Cloud SQL no cargue el histórico.
- **No** interpretar `empty` como error ni rellenarlo a mano.
- **No** correr en paralelo dos backfills de la misma org (la cuota QPS de GSC es por
  propiedad; el MERGE lo resiste, pero la API va a devolver 429).

## Futuro continuo (sin backfill)

- El **cron diario** ya espeja cada día materializado a BQ (`bqMirror` en el outcome del
  batch — `mirror_failed` se reporta y el día se re-espeja al siguiente run).
- El **export nativo GSC→BigQuery** por propiedad (Search Console → Configuración →
  Exportación masiva de datos) es el destino de largo plazo para el continuo: gratis, sin
  muestreo. Ya corre para `efeoncepro.com` (`efeonce-group.searchconsole.*`); activarlo
  para Berel requiere permiso **Owner** en su propiedad (coordinación out-of-band,
  TASK-1655 Slice 5).

## Problemas comunes

- Todos los días degradan `disabled` → faltan las env vars OAuth del paso 3 (el flag
  `GROWTH_SEARCH_CONSOLE_ENABLED` solo no basta: el reader también resuelve el client
  OAuth).
- `not_connected` → la org no tiene conexión GSC activa con propiedad seleccionada.
- Días recientes `empty` → GSC no publica D-1/D-2; el cron diario los rellenará.

## Referencias técnicas

- Command: `src/lib/growth/seo/gsc-backfill.ts`
- Mirror/MERGE: `src/lib/growth/seo/gsc-history-bq-mirror.ts`
- Runner: `scripts/growth/backfill-gsc-history.ts`
- Split de lectura: `src/lib/growth/seo/performance/read-performance.ts` (`readGscDaily`)
