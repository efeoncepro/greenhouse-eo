# Efeonce Marketing Studio — Runtime handoff

> **Tipo:** runbook operativo
> **Versión:** 1.2
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Última actualización:** 2026-09-26 por Claude (TASK-1896: observabilidad y restauración)
> **Arquitectura:** [EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Gateway MCP:** [EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md](../EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Marketing Studio
> **Repo de código:** `efeoncepro/efeonce-marketing-studio` (privado, rama `main`, local en `~/Documents/efeonce-marketing-studio`)

Este documento dice **cómo operar** Studio. El porqué y los contratos viven en la arquitectura; no se repiten acá.

## Estado vivo (2026-09-25)

| Pieza | Estado |
|---|---|
| Web + API `/api/v1` | Producción `READY` en Vercel, último deploy verificado `d3ab68e` (preview de pieza por defecto en 640 px) |
| `studio.efeonce.org` | En vivo: CNAME en HostGator + certificado de Vercel (renovación automática) |
| Base `marketing_studio` (prod) | 3 migraciones aplicadas; import: 5 campañas, 21 conceptos, 54 piezas, 48 copys, 72 anuncios, 4 audiencias, 1 flight, 7 líneas de presupuesto, 6 posts, todas con organización `org-2df565fb-98aa-42f7-b324-ea9a2209017f` (Efeonce) |
| Base `marketing_studio_staging` | Igual que producción |
| Renditions | 108 por bucket (miniatura + preview de 54 piezas) |
| Acceso | `STUDIO_ACCESS_MODE=open` (lectura sin login, noindex). `efeonce_id` falla cerrado hasta TASK-1898 |
| Bearer de servicio | Cliente del gateway en producción (secreto `marketing-studio-mcp-gateway-token`, organización Efeonce) |
| Provider MCP | Encendido en producción desde 2026-09-26: gateway `958c9de30` (`00061-sbc`), `MARKETING_STUDIO_PROVIDER_ENABLED=true`, canary MCP real verde (TASK-1891) |
| Greenhouse | Capability `marketing_studio.campaign.read` y cliente de canje `efeonce-mcp-marketing-studio` migrados; el manual y el canje llegan a producción con el próximo release de Greenhouse |

## Recursos

| Recurso | Valor |
|---|---|
| Proyecto Vercel | `efeonce-marketing-studio` · `prj_dztLezZkYxAJikDuPSdT9QROEJRS` · team `efeonce-7670142f` · root `apps/web` · pin en `.vercel/project.json` del repo |
| Instancia Cloud SQL | `efeonce-group:us-east4:greenhouse-pg-dev` (compartida con Greenhouse) |
| Bases | `marketing_studio` (prod) · `marketing_studio_staging` (preview y development); schema `studio` |
| Roles PG | `marketing_studio_migrator` (dueño, DDL, límite 5) · `marketing_studio_runtime` (NOLOGIN, DML) · `marketing_studio_app` (prod, límite **20**) · `marketing_studio_staging_app` (límite 10) |
| Service accounts | `marketing-studio-runtime@efeonce-group.iam.gserviceaccount.com` (prod: `cloudsql.client`, secreto prod, lectura del bucket prod) · `marketing-studio-runtime-stg@…` (equivalentes de staging) |
| WIF | Pool `vercel`, provider `greenhouse-eo`; subjects `owner:efeonce-7670142f:project:efeonce-marketing-studio:environment:<env>` |
| Buckets | `efeonce-marketing-studio-media` · `efeonce-marketing-studio-media-staging` (us-east4, privados, acceso uniforme) |
| Dominio | CNAME `studio` → `e33b47bdb5fb489f.vercel-dns-016.com.` en HostGator |

## Secretos (Secret Manager, proyecto `efeonce-group`)

| Secreto | Uso | Quién lo lee |
|---|---|---|
| `marketing-studio-pg-app-password` | contraseña de `marketing_studio_app` | `marketing-studio-runtime@` |
| `marketing-studio-pg-staging-app-password` | contraseña de `marketing_studio_staging_app` | `marketing-studio-runtime-stg@` |
| `marketing-studio-pg-migrator-password` | contraseña del migrador (CLI del operador) | operador |
| `marketing-studio-mcp-gateway-token` | token `mst_…` del `api_client` del gateway en producción (v1, scalar crudo, organización Efeonce) | `efeonce-mcp-gateway@efeonce-group.iam.gserviceaccount.com` (`roles/secretmanager.secretAccessor`); se monta en el gateway sólo con el flag ON |
| `axis-packages-read-token` | `.npmrc` completo con token de lectura del registro AXIS | operador; a Vercel va sólo el `_authToken` |
| `marketing-studio-sentry-dsn` | DSN del proyecto Sentry `efeonce-marketing-studio` (TASK-1896, **pendiente de crear**) | Vercel (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) y `marketing-studio-restore@` |
| `marketing-studio-sentry-auth-token` | token de org para subir source maps (TASK-1896, pendiente) | Vercel (`SENTRY_AUTH_TOKEN`, encrypted) |
| `marketing-studio-pg-restore-password` | contraseña del rol `marketing_studio_restore` (TASK-1896, pendiente; generada, nunca impresa) | `marketing-studio-restore@` |
| `greenhouse-marketing-studio-health-token` | token `mst_…` con scope `studio:health` para la señal de Greenhouse (TASK-1896, pendiente) | `greenhouse-portal@` (Vercel de Greenhouse y ops-worker) |

Publicar siempre como scalar crudo: `printf %s "$VALOR" | gcloud secrets versions add <secreto> --data-file=-`.

## Variables en Vercel

| Variable | production | preview + development |
|---|---|---|
| `STUDIO_PG_INSTANCE_CONNECTION_NAME` | `efeonce-group:us-east4:greenhouse-pg-dev` | igual |
| `STUDIO_PG_DATABASE` | `marketing_studio` | `marketing_studio_staging` |
| `STUDIO_PG_USER` | `marketing_studio_app` | `marketing_studio_staging_app` |
| `STUDIO_PG_PASSWORD_SECRET_REF` | `projects/efeonce-group/secrets/marketing-studio-pg-app-password/versions/latest` | `…/marketing-studio-pg-staging-app-password/versions/latest` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/183008134038/locations/global/workloadIdentityPools/vercel/providers/greenhouse-eo` | igual |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `marketing-studio-runtime@efeonce-group.iam.gserviceaccount.com` | `marketing-studio-runtime-stg@…` |
| `STUDIO_ACCESS_MODE` | sin definir (= `open`) | `open` |
| `STUDIO_PUBLIC_URL` | `https://studio.efeonce.org` | — |
| `STUDIO_MEDIA_URL_SECRET` | secreto HMAC de los enlaces de imagen (sensitive, ≥ 32 caracteres) | **uno distinto** por ambiente |
| `NODE_AUTH_TOKEN` | `_authToken` del registro AXIS (encrypted) | igual |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN del proyecto Sentry (TASK-1896, pendiente) | igual (environment `preview` se deriva de `VERCEL_ENV`) |
| `SENTRY_AUTH_TOKEN` | token de source maps (encrypted; sin él el build no sube nada) | igual |
| `STUDIO_MEDIA_BUCKET` | `efeonce-marketing-studio-media` (sonda del health profundo; si falta se deduce de las renditions) | `efeonce-marketing-studio-media-staging` |

Opcional: `STUDIO_PG_MAX_CONNECTIONS` (pool por instancia; por defecto 3 en Vercel, 5 fuera). Cambiar una variable
exige redeploy.

## Comandos (desde `~/Documents/efeonce-marketing-studio`)

```bash
# Instalar (el registro AXIS exige token)
NODE_AUTH_TOKEN="$(gh auth token)" pnpm install

# Verificación completa: gates + mcp:manifest:check + typecheck (incl. theme:check) + tests
pnpm check
pnpm build                                  # build de producción (TypeScript 7 en el chequeo de tipos)

# Desarrollo local: http://localhost:3100, contra staging por el proxy
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15433   # puerto propio: no choca con Greenhouse (15432)
pnpm dev                                    # apps/web/.env.local: STUDIO_PG_HOST=127.0.0.1, STUDIO_PG_PORT=15433, base staging
# Si /api/v1/health responde database: unreachable, la ADC venció. Desde greenhouse-eo:
pnpm gcloud:auth:playwright -- --force

# Migraciones (credencial de migrador; tabla public.studio_pgmigrations)
DATABASE_URL="postgres://marketing_studio_migrator:<secreto>@127.0.0.1:15433/<base>" pnpm migrate up

# Import del catálogo (dry-run por defecto; --apply escribe). Idempotente: reimportar inserta 0 filas.
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_DATABASE=<base> STUDIO_PG_USER=<usuario app> \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=<secreto app>)" \
pnpm import:catalog --catalog "<…>/Campaign Manager/CATALOGO-DATOS.json" \
  --readback "CMP-003=<greenhouse-eo>/ai-generations/2026-09-24_cmp003-sky-reel-cover/scheduling/metricool-readback.json" [--apply]

# Renditions (thumb 640 px + preview 1600 px WebP; ffmpeg para videos). Idempotente; --force regenera.
pnpm media:renditions --root "<…>/Alineación/5. Contenidos" --bucket <bucket> [--apply]

# Clientes de API: el token sale una sola vez y va directo a Secret Manager, nunca a pantalla
STUDIO_PG_…(base destino) pnpm api-client:create --label "<quién>" --org org-… [--org org-…] --scope studio:read --token-only \
  | gcloud secrets versions add <secreto> --data-file=-
STUDIO_PG_…(base destino) pnpm api-client:revoke --id <api_client_id> --reason "<por qué>"   # deja audit_event

# Manifiesto de tools (tras tocar packages/contracts/src/operations.ts o semantics.ts)
pnpm mcp:manifest:generate   # commitear packages/contracts/generated/tool-manifest.json; pnpm check corre el check
# Luego, en efeonce-mcp: pnpm studio:manifest:sync (ver runbook del gateway)

# Tema: regenerar tras subir la versión de @efeoncepro/axis-tokens
pnpm --filter @studio/web theme:generate
```

**Agregar una operación:** declararla en `operations.ts` con `tool` o `exclusion` (con razón) → route handler en
`apps/web/src/app/api/v1/**` → `pnpm mcp:manifest:generate` → `pnpm check` (el test de paridad falla si falta el
handler o la entrada) → deploy → `pnpm studio:manifest:sync` en el gateway.

## Deploy

- **Studio:** push a `main` = deploy de producción automático en Vercel. El autor del commit debe ser
  `jreyes@efeonce.cl` (ver trampas). Verificar con la batería de abajo.
- Probar un deployment protegido por SSO sin crear bypass manual: `vercel curl /api/v1/health --deployment <url> --scope efeonce-7670142f`.
- **Gateway:** nunca se despliega al hacer merge; es dispatch manual de `deploy.yml` en `efeoncepro/efeonce-mcp`
  (exposure `public-oauth`). Prender el provider: release de Greenhouse (canje + manual) → `MARKETING_STUDIO_PROVIDER_ENABLED=true`
  → dispatch → `pnpm studio:canary` con token Entra humano → sesión MCP. Detalle en el runbook del gateway.

## Verificación en producción

Desde el checkout de Studio (la comparación del hash lee el artefacto local):

```bash
BASE=https://studio.efeonce.org
TOKEN="$(gcloud secrets versions access latest --secret=marketing-studio-mcp-gateway-token)"
code() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }

curl -s "$BASE/api/v1/health"                                                     # 200 · status ok · database reachable · accessMode open
code -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/campaigns"                   # 200
code -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/campaigns?organizationId=org-ajena-de-prueba"   # 404 (anti-oráculo)
code -H "Authorization: Bearer mst_invalido" "$BASE/api/v1/campaigns"             # 401 aunque el modo sea open
code "$BASE/api/v1/campaigns"                                                     # 200 (modo open, sin bearer)

# El hash servido debe ser el del artefacto commiteado
curl -s "$BASE/api/v1/tool-manifest" | jq -r .manifestHash
jq -r .manifestHash packages/contracts/generated/tool-manifest.json

# Ráfaga de imágenes: todas 200 (regresión del incidente de conexiones)
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/campaigns/CMP-004/assets" \
  | jq -r '.. | .thumbUrl? // empty' | sort -u \
  | xargs -P 40 -I{} curl -s -o /dev/null -w '%{http_code}\n' "$BASE{}" | sort | uniq -c
```

No imprimir `$TOKEN`. Si la ráfaga devuelve 500, revisar si los readers cayeron a `/api/v1/renditions/{id}`
(falta `STUDIO_MEDIA_URL_SECRET`) y los logs por `too many connections for role`.

## Originales y worker de medios (TASK-1893)

Estado: **code complete, rollout pendiente**. Contrato: arquitectura §7.2. Todo lo de abajo está escrito como scripts
idempotentes con dry-run por defecto; nada se aplicó todavía. Staging tiene la migración `1790409193629_media-originals`
aplicada; producción no.

### Recursos (por ambiente; staging con sufijo `-staging` / `-stg`)

| Recurso | Producción | Staging |
|---|---|---|
| Bucket de originales | `efeonce-marketing-studio-originals` | `efeonce-marketing-studio-originals-staging` |
| SA de ingesta (el operador la impersona) | `marketing-studio-ingest@` | `marketing-studio-ingest-stg@` |
| SA del worker | `marketing-studio-worker@` | `marketing-studio-worker-stg@` |
| SA invocadora (Pub/Sub push + Scheduler, OIDC) | `marketing-studio-invoker@` (compartida) | idem |
| Rol custom (sólo `customTime`) | `projects/efeonce-group/roles/marketingStudioOriginalsMetadataWriter` | idem |
| Cloud Run | `marketing-studio-media-worker` | `marketing-studio-media-worker-staging` |
| Tópico / suscripción push / DLQ | `marketing-studio-originals-finalized` / `…-worker` / `…-dlq` (+ `…-dlq-sub`) | con `-staging` |
| Scheduler | `marketing-studio-reconcile-derivatives` (`7 * * * *`), `marketing-studio-metricool-readback` (`*/30 * * * *`) | sólo el barrido |
| Rol PG del worker | `marketing_studio_worker` (límite 6) | `marketing_studio_staging_worker` (límite 6) |
| Secreto PG del worker | `marketing-studio-pg-worker-password` | `marketing-studio-pg-staging-worker-password` |
| Token de Metricool | `marketing-studio-metricool-api-token` (el `userToken`, scalar crudo; lo crea el operador) | — |

Matriz IAM (siempre a nivel de bucket/servicio; ninguna SA con `storage.admin` ni `objectAdmin`): runtime de Vercel →
`objectViewer` en originales + `serviceAccountTokenCreator` sobre sí misma (signBlob); ingesta → `objectCreator` +
`objectViewer` en originales, `cloudsql.client`, secreto PG de la app de su ambiente; worker → `objectViewer` + rol
custom en originales, `objectCreator` + `objectViewer` en media, `cloudsql.client`, su secreto PG, Sentry DSN y (sólo
prod) Metricool; invocadora → `run.invoker` en los dos servicios; agente de Cloud Storage → `pubsub.publisher` en el
tópico; agente de Pub/Sub → `pubsub.publisher` en la DLQ, `pubsub.subscriber` en la suscripción y
`serviceAccountTokenCreator` sobre la invocadora.

### Variables

| Dónde | Variable | Valor |
|---|---|---|
| Vercel de Studio (production) | `STUDIO_ORIGINALS_BUCKET` | `efeonce-marketing-studio-originals` |
| Vercel de Studio (preview + development) | `STUDIO_ORIGINALS_BUCKET` | `efeonce-marketing-studio-originals-staging` |
| Vercel de Studio (todos) | `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` | `false` hasta el canary; luego `true` (primero preview) |
| Vercel de Studio (opcional) | `STUDIO_DOWNLOAD_SIGNER_EMAIL` | por defecto `GCP_SERVICE_ACCOUNT_EMAIL` |
| Cloud Run (SoT `apps/worker/deploy.sh`) | `MEDIA_WORKER_DERIVATIVES_ENABLED`, `MEDIA_WORKER_METRICOOL_READBACK_ENABLED`, `MEDIA_WORKER_ARCHIVE_TIERING_ENABLED` | `false` |
| Cloud Run prod | `METRICOOL_API_TOKEN_SECRET_REF`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_IDS` | ref del secreto · `userId` de la pestaña API (falta) · `3961547,5105024` |

Estos flags viven en el repo de Studio y no se leen en Greenhouse: no entran al ledger de flags de Greenhouse.

### Secuencia de rollout (en orden)

```bash
# 0. Precondición: sentry.sh de TASK-1896 aplicado (el worker monta marketing-studio-sentry-dsn).
cd ~/Documents/efeonce-marketing-studio
# 1. Migración de producción ANTES de empujar main (los readers ya leen media_object y los derechos)
DATABASE_URL="postgres://marketing_studio_migrator@127.0.0.1:15433/marketing_studio" \
  PGPASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-migrator-password)" pnpm migrate up
# 2. Infra base por ambiente (staging primero)
OPERATOR_PRINCIPAL=user:jreyes@efeonce.cl bash scripts/ops/infra/media-originals.sh --env staging --apply
# 3. Roles PG del worker (admin de la instancia; contraseñas por tubería) — ver cabecera del SQL
psql … -f scripts/ops/sql/media-worker-roles.sql
# 4. Worker (flags apagados) y cableado (push, notificación, Scheduler en pausa)
bash apps/worker/deploy.sh --env staging --apply
bash scripts/ops/infra/media-originals.sh --env staging --wiring --apply
# 5. Ingesta: dry-run → CMP-004 → completo (ADC impersonando la SA de ingesta del ambiente)
gcloud auth application-default login --impersonate-service-account marketing-studio-ingest-stg@efeonce-group.iam.gserviceaccount.com
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_DATABASE=marketing_studio_staging STUDIO_PG_USER=marketing_studio_staging_app \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-staging-app-password)" \
  pnpm media:ingest --root "<…>/Alineación/5. Contenidos" --bucket efeonce-marketing-studio-originals-staging [--campaign CMP-004] [--apply]
# 6. Prender derivados en staging: DERIVATIVES_ENABLED="true" en apps/worker/deploy.sh → commit → deploy → resume del barrido
gcloud scheduler jobs resume marketing-studio-reconcile-derivatives-staging --location us-east4
# 7. Descarga en preview: STUDIO_ORIGINALS_BUCKET + STUDIO_ORIGINAL_DOWNLOADS_ENABLED=true en preview → redeploy → canary
# 8. Repetir 2–7 con --env production / bases y buckets de producción, por campaña.
```

Canary de descarga (con un `api_client` que tenga `studio:read` y `studio:assets:download`):

```bash
B=https://studio.efeonce.org; A=CMP001-01-imagen-4x5
code() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
code "$B/api/v1/assets/$A/versions/1/download"                                      # 403 download_disabled (anónimo)
code -H "Authorization: Bearer $TOKEN" "$B/api/v1/assets/$A/versions/1/download"     # 200 { url, expiresAt ≤ 10 min, rights }
code -H "Authorization: Bearer $TOKEN" "$B/api/v1/assets/$A/versions/1/download?organizationId=org-ajena-de-prueba"  # 404
code -H "Authorization: Bearer $TOKEN" "$B/api/v1/assets/<pieza sin ingestar>/versions/1/download"                 # 404 original_not_stored
```

El `api_client` del gateway tiene sólo `studio:read`; los scopes de un cliente no se editan: crear uno nuevo con
`--scope studio:read --scope studio:assets:download`, publicarlo como nueva versión del secreto del gateway y revocar el
anterior después del redeploy del gateway.

Verificación de datos: `SELECT storage_provider, count(*) FROM studio.asset_version GROUP BY 1;` ·
`SELECT count(*) FROM studio.media_object;` vs `SELECT count(DISTINCT sha256) FROM studio.asset_version WHERE storage_provider='gcs';` ·
`SELECT kind, count(*) FROM studio.asset_rendition GROUP BY 1;` ·
`SELECT kind, status, error_code, started_at FROM studio.worker_run ORDER BY started_at DESC LIMIT 20;`

### Dry-run de la ingesta (2026-09-26, staging)

54 versiones: `to_upload` 30, `unverifiable` 24 (las 24 imágenes de CMP-002 no traen sha256 en el catálogo), `drift` 0,
`rejected` 0, `missing_local` 0, `dedup` 0. Para ingestarlas: regenerar el catálogo del Campaign Manager con la huella
de esas piezas y reimportar (el import la adopta en la misma versión), luego volver a correr la ingesta.

### Rollback

| Qué | Cómo |
|---|---|
| Descarga | `STUDIO_ORIGINAL_DOWNLOADS_ENABLED=false` + redeploy de Vercel; las URLs emitidas vencen solas en ≤ 10 min |
| Worker | pausar jobs; borrar la notificación (`gcloud storage buckets notifications list/delete gs://<bucket>`); flags a `false` en `deploy.sh` y redeploy |
| Ingesta | `pnpm media:ingest --revert-provider [--campaign …] --apply` (vuelve a `onedrive_provenance` desde `provenance.onedrive_path`; los objetos quedan) |
| Migración | `pnpm migrate down` sólo si ninguna versión quedó en `gcs` (el Down aborta si hay) |
| Clase de almacenamiento de una campaña reabierta | `gcloud storage objects update gs://<bucket>/<objeto> --storage-class=STANDARD` (GCS no permite retroceder `customTime`) |

### Costo esperado

< USD 10/mes (originales ~50 GB Standard, Cloud Run a escala cero, Pub/Sub y Scheduler mínimos, salida por descargas
~20 GB/mes). Disparador de revisión: > USD 25/mes en el billing export (en CLP, ÷ ~898). Costo real del primer mes:
pendiente (se contrasta al mes de la ingesta).

## DNS (aplicado 2026-09-25)

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| `CNAME` | `studio` | `e33b47bdb5fb489f.vercel-dns-016.com.` | 3600 (o el mínimo del panel) |

Verificación: `dig +short CNAME studio.efeonce.org` y `curl -I https://studio.efeonce.org/api/v1/health` (200). Si
Vercel no emite el certificado tras la propagación: `vercel certs issue studio.efeonce.org --scope efeonce-7670142f`.
El CNAME en `studio` no afecta el correo (MX, `autodiscover` y SPF de Outlook viven en la raíz y en `autodiscover`).

## Rollback

| Qué | Cómo |
|---|---|
| Deploy de Studio | `vercel rollback` al deployment anterior (Instant Rollback) o revert + push a `main` |
| Datos | Reimportar la fuente (idempotente). Deshacer completo: `DROP DATABASE marketing_studio` (no toca Greenhouse) |
| Migración | `pnpm migrate down` con credencial de migrador (cada migración trae su `Down`) |
| Enlaces de imagen | Quitar `STUDIO_MEDIA_URL_SECRET` + redeploy: los readers vuelven a `/api/v1/renditions/{id}` (con base; ojo con el tope de conexiones) |
| Acceso del gateway a Studio | `pnpm api-client:revoke --id <id> --reason …` en la base de producción |
| Provider MCP | `MARKETING_STUDIO_PROVIDER_ENABLED=false` + dispatch del deploy del gateway |
| Dominio | Quitar el CNAME o el dominio del proyecto |

## Observabilidad y restauración (TASK-1896)

Estado: **code complete, rollout pendiente**. Contrato en la arquitectura §9; restauración en
[`MARKETING_STUDIO_RESTORE_RUNBOOK.md`](MARKETING_STUDIO_RESTORE_RUNBOOK.md). Toda la infraestructura vive como scripts
idempotentes del repo Studio, **dry-run por defecto** (`--apply` ejecuta):

```bash
SENTRY_ADMIN_TOKEN=… SENTRY_TEAM=… SENTRY_ALERT_MEMBER_ID=… bash scripts/ops/infra/sentry.sh [--apply]
bash scripts/ops/infra/vercel-env.sh [--apply]                     # luego redeploy de production y preview
ALERT_EMAIL=<correo laboral> bash scripts/ops/infra/monitoring.sh [--apply]
bash scripts/ops/infra/restore-rehearsal-job.sh [--apply] [--activate]
bash scripts/ops/infra/greenhouse-health-client.sh [--apply]
```

En Greenhouse (Vercel production y el ops-worker) la señal lee el secreto por nombre:
`MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF=greenhouse-marketing-studio-health-token` (el ops-worker ya lo declara en
`services/ops-worker/deploy.sh`; en Vercel hay que agregarlo). Sin él la señal queda `unknown` y no alerta.

Verificación en producción:

```bash
B=https://studio.efeonce.org
curl -s -D - -o /dev/null $B/api/v1/campaigns | grep -i x-correlation-id        # id de request en la respuesta
# El mismo id aparece en la línea JSON "studio_request" de los logs de Vercel (vercel logs --scope efeonce-7670142f).
T="$(gcloud secrets versions access latest --secret=greenhouse-marketing-studio-health-token)"
curl -s -H "Authorization: Bearer $T" "$B/api/v1/health?deep=1" | jq '.status, [.components[] | {name, state}], [.freshness[] | {name, state, code}]'
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $T" $B/api/v1/campaigns   # 403 (studio:health no lee campañas)
unset T
curl -s "$B/api/v1/health?deep=1"      # sin bearer: health superficial
```

Error de prueba en Sentry (preview primero): pedir una ruta con un bearer bien formado pero revocado no genera evento
(es 401 controlado); para forzar un 500 usar un deployment de preview con `STUDIO_PG_PASSWORD_SECRET_REF` inválido y
confirmar en Sentry `domain=api`, `request_id`, environment y release, sin `Authorization` ni cookies.

Rollback: DSN vacío en Vercel + redeploy (Sentry); `pnpm migrate down` de `ops_run`; pausar
`marketing-studio-restore-rehearsal` y `ops-marketing-studio-health-watch`; desactivar la política de uptime.

## Trampas conocidas

- **Autor de commit.** Vercel bloquea deployments por Git (`COMMIT_AUTHOR_REQUIRED`) si el email del autor no se asocia a una cuenta del team. El repo usa `user.email = jreyes@efeonce.cl`; con `jreye@MacBook-Air.local` o `jreyes@efeoncepro.com` los deployments quedaron `BLOCKED`.
- **`axis-packages-read-token`.** Guarda un `.npmrc` completo. A `NODE_AUTH_TOKEN` va sólo el valor `_authToken`; copiado entero, pnpm falla con `ERR_INVALID_CHAR`.
- **`vercel api` para variables.** El POST de env acepta un objeto por request con `--input`. Para todas las ramas de preview: `vercel env add NAME preview ""`.
- **Usuarios en Cloud SQL.** Crearlos por SQL (`SET ROLE cloudsqlsuperuser`), nunca con `gcloud sql users create`: quedarían en `cloudsqlsuperuser` y podrían leer Greenhouse.
- **IAM DB auth no está disponible** en la instancia; activarla modificaría la instancia compartida con Greenhouse. Por eso usuario + contraseña en Secret Manager.
- **Tope de conexiones.** `marketing_studio_app` admite 20. Cualquier patrón «una consulta por elemento» en una grilla lo agota; las imágenes van por enlace firmado sin base.
- **`CONNECT` de PUBLIC en `greenhouse_app`.** Los roles de Studio pueden abrir sesión allí (0 tablas legibles, ninguna función `SECURITY DEFINER` alcanzable). Se cierra en TASK-1897.
- **ADC vencida ⇒ `database: unreachable` en local.** `.env.local` resuelve la contraseña con ADC; renovar con `pnpm gcloud:auth:playwright -- --force` desde greenhouse-eo.
- **Fechas de Postgres.** El parser de `DATE` (OID 1082) devuelve string; formatear fechas sin hora en UTC y horas con `hourCycle: 'h23'`.
- **Constantes compartidas.** Un Server Component no puede importar constantes desde un módulo `'use client'`. La cookie del tema vive en `components/theme.ts`.
- **`next dev` reescribe archivos.** Genera `apps/web/AGENTS.md`/`CLAUDE.md` (commiteados) y reescribe `next-env.d.ts`: no commitear la variante de dev.
- **Gate de versión del gateway.** Mide la superficie construida con todos los providers habilitados: un provider nuevo debe declararse en `src/surface.ts` y en el test de cobertura de políticas, o sus tools quedan fuera de la cuenta.
