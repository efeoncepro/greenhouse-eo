# Efeonce Marketing Studio — Runtime handoff

## TASK-1899 retirada (2026-10-04)

Por decisión del operador se revirtió su implementación local en Greenhouse y Studio. No hubo commit, push,
deploy ni migraciones de TASK-1899 en staging/producción; el gateway quedó sin cambios. El PostgreSQL temporal de
pruebas quedó detenido. No hay un candidato de TASK-1899 pendiente de desplegar. Las escrituras MCP continúan
fuera de la federación; TASK-1899 ya no es requisito para desarrollar API/CLI/UI. TASK-2003 es el carril paralelo vigente de escrituras T1 delegadas; no reactiva las aprobaciones/digest retirados.


> **Tipo:** runbook operativo
> **Versión:** 1.7
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Última actualización:** 2026-10-04 — rollout de activaciones TASK-2001, backfill CL y canary Metricool/CLI/scheduler.
> **Arquitectura:** [EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Gateway MCP:** [EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md](../EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) §Provider Marketing Studio
> **Repo de código:** `efeoncepro/efeonce-marketing-studio` (privado, rama `main`, local en `~/Documents/efeonce-marketing-studio`)

Este documento dice **cómo operar** Studio. El porqué y los contratos viven en la arquitectura; no se repiten acá.

## Estado vivo verificado (2026-10-04, después del release)

Fuente: [release autorizado de Studio](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md) y
[readback estructurado](../../audits/marketing-studio/TASK-2001-release-2026-10-04-checks.json).

| Pieza | Estado verificado |
| --- | --- |
| Web/API | Studio `main aa6fa0771ff0`, Vercel Production Ready `dpl_Atr8ThFhy4UNG8HGtAXYkL529pmA`; health 200, API 1.7.0, database reachable, acceso open. |
| Contrato | 75 tools de negocio, 80 operaciones HTTP; manifiesto `d9f5db8f7729255d59921dd591c2f9963f0abe8a637bf288c235fceb6fd1ccc2`. Servido no significa federado. |
| Catálogo/schema | Catálogo previo y cinco migraciones TASK-2001 (`1791149145299`…`1791151780000`) aplicadas staging y producción; catálogo v1 published, 52 canales. UPDATE de especificación publicada rechazado en ambas bases (23514). |
| Datos productivos | 5 campañas y 103 assets conservados. Backfill activaciones: 6 evidencias legacy vinculadas a 6 planes CL; 63 evidencias totales/57 sin vincular. Aliases TASK-1905 (134 unmapped) siguen pendientes. |
| Flags | Web/worker `STUDIO_CHANNEL_VALIDATION_MODE=warn`, `STUDIO_CUSTOMER_MODEL_ENABLED=false`. No promoción a enforce. Activaciones ON web/workers; discovery sólo producción ON, owned OFF. |
| Worker | Staging `00007-kt9`, producción `00005-wc5`, Ready/100%, `/health` 200; misma imagen `aa6fa0771ff0`, digest `sha256:3001726da1f901843c3c4b19e8b52e00ce3be0cf0c7e172d956bc0376df1f5d2`. |
| Canaries | Producción: org ajena404, bearer inválido401, escritura de activación con bearer read-only403 sin write; 44/44 thumbs 200. Plan/reschedule/cancel/replay HTTP staging PASS; descubrimiento real 62/replay 0 cambios, scheduler OIDC PASS. Tres overdue CMP-001 sin fecha publicada; CMP-003 scheduled. |
| Greenhouse/gateway/ICP | Sin release Greenhouse ni gateway en esta entrega. Capability pendiente de activar; nueva federación MCP pendiente. ICP real depende1906/1892 y sigue disabled; T1 delegado corresponde2003 en paralelo. |
| CLI HTTP Greenhouse | `pnpm studio` local, API-only: 18 tests/lint PASS; discovery, lectura autenticada y upload dry-run reales. No carga aplicada productiva ni release Greenhouse. [Auditoría](../../audits/marketing-studio/2026-10-04-studio-api-cli.md). |

## Snapshot histórico (2026-09-26, ampliado 2026-10-02)

La tabla siguiente conserva las verificaciones anteriores; versiones, conteos y revisiones aquí no sustituyen el estado vivo de arriba.

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
| Greenhouse | Capabilities `marketing_studio.campaign.read` y `marketing_studio.asset.download`, cliente de canje y manual en producción; señal `platform.marketing_studio.health` + aviso Teams «EO - Admin» desde el release `92002873ced9` (2026-09-26) |
| Originales y worker (TASK-1893) | En producción desde 2026-09-26: buckets de originales, worker `marketing-studio-media-worker` (`00001-sgb`) y `-staging` (`00002-svt`), 30 versiones en `gcs` por ambiente (24 de CMP-002 siguen en OneDrive, sin sha256), descarga ON sólo en production, readback de Metricool activo |
| Puerta de ingreso (TASK-1894 Entregable A) | En producción desde 2026-10-02: API 1.3.0 (15 tools), migración `1790956839977` en ambas bases, `STUDIO_UPLOADS_ENABLED` y `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` ON, 33 piezas de CMP-004 subidas por `studio:upload` y pendientes de revisión (§Subidas) |
| Commands del catálogo (TASK-1894 Entregable B) | Verificado en staging el 2026-10-02 (preview de la rama `task-1894-entregable-b`, API 1.4.0, 44 tools); **en producción** desde 2026-10-02 (`a8c7886`, health 1.4.0, smoke de sólo lectura); ningún `api_client` de producción tiene `studio:write`. Migración `1790967435017` aplicada en ambas bases (aditiva; las 5 campañas reales en `onedrive`). Sandbox `CMP-900` en staging (§Commands del catálogo) |
| Observabilidad y restauración (TASK-1896) | En producción desde 2026-09-26: Sentry, uptime con email, health profundo, `studio.ops_run`, ensayo verde contra `marketing_studio` y scheduler mensual activo |

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
| `marketing-studio-sentry-dsn` | DSN del proyecto Sentry `efeonce-marketing-studio` (v1, 2026-09-26) | Vercel (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) y `marketing-studio-restore@` |
| `marketing-studio-sentry-auth-token` | token de org para subir source maps (**sin crear**, opcional; Follow-up de TASK-1896) | Vercel (`SENTRY_AUTH_TOKEN`, encrypted) |
| `marketing-studio-pg-restore-password` | contraseña del rol `marketing_studio_restore` (TASK-1896; generada, nunca impresa) | `marketing-studio-restore@` |
| `greenhouse-marketing-studio-health-token` | token `mst_…` con scope `studio:health` para la señal de Greenhouse (TASK-1896, en uso desde 2026-09-26) | `greenhouse-portal@` (Vercel de Greenhouse y ops-worker) |
| `marketing-studio-write-tests-token-staging` | token `mst_…` del `api_client` de pruebas de escritura en staging (scopes `studio:read`, `studio:write`, `studio:assets:write`; organización Efeonce; TASK-1894 Entregable B, 2026-10-02) | operador (canary contra previews) |

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
| `STUDIO_CHANNEL_VALIDATION_MODE` | `warn` (release 2026-10-04) | staging observado en `warn`; verificar cada preview |
| `STUDIO_CUSTOMER_MODEL_ENABLED` | `false` (release 2026-10-04) | staging `false`; consumer real pendiente |
| `STUDIO_PUBLIC_URL` | `https://studio.efeonce.org` | — |
| `STUDIO_MEDIA_URL_SECRET` | secreto HMAC de los enlaces de imagen (sensitive, ≥ 32 caracteres) | **uno distinto** por ambiente |
| `NODE_AUTH_TOKEN` | `_authToken` del registro AXIS (encrypted) | igual |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN del proyecto Sentry (configurado 2026-09-26) | igual (environment `preview` se deriva de `VERCEL_ENV`) |
| `SENTRY_AUTH_TOKEN` | token de source maps (encrypted; **sin configurar**: el build no sube source maps) | igual |
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

Estado: **en producción desde 2026-09-26** (TASK-1893 complete). Contrato: arquitectura §7.2. Todo lo de abajo está
escrito como scripts idempotentes con dry-run por defecto y ya se aplicó en staging y producción: migración
`1790409193629` en ambas bases, buckets e IAM verificados (sin bindings públicos), worker `00001-sgb` (prod) y
`00002-svt` (staging), notificación `OBJECT_FINALIZE` del prefijo `originals/`, schedulers ENABLED. Pendiente: 24
imágenes de CMP-002 sin sha256 (siguen en OneDrive), federación de `studio.asset.download` en el gateway y costo real
del primer mes.

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
| Vercel de Studio | `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` | production `true` desde 2026-09-26 (canary verde); preview `false` |
| Vercel de Studio (opcional) | `STUDIO_DOWNLOAD_SIGNER_EMAIL` | por defecto `GCP_SERVICE_ACCOUNT_EMAIL` |
| Vercel de Studio (TASK-1894) | `STUDIO_UPLOADS_ENABLED` | production `true` desde 2026-10-02; preview sólo rama `task-1894-upload-door` (§Subidas) |
| Vercel de Studio (opcional, TASK-1894) | `STUDIO_UPLOAD_SIGNER_EMAIL` | por defecto `STUDIO_DOWNLOAD_SIGNER_EMAIL`, luego `GCP_SERVICE_ACCOUNT_EMAIL` |
| Cloud Run (SoT `apps/worker/deploy.sh`, TASK-1894) | `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` | `true` en staging (`00003-2h9`) y prod (`00002-hzn`) desde 2026-10-02; se prende antes que `STUDIO_UPLOADS_ENABLED` |
| Cloud Run (SoT `apps/worker/deploy.sh`) | `MEDIA_WORKER_DERIVATIVES_ENABLED` · `MEDIA_WORKER_METRICOOL_READBACK_ENABLED` · `MEDIA_WORKER_ARCHIVE_TIERING_ENABLED` | `true` en staging y prod · `true` en prod, `false` en staging · `false` |
| Cloud Run prod | `METRICOOL_API_TOKEN_SECRET_REF`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_IDS` | ref de `marketing-studio-metricool-api-token` (v1) · `3116862` · `3961547,5105024` (verificados) |

Estos flags viven en el repo de Studio y no se leen en Greenhouse; su estado se refleja en `FEATURE_FLAG_STATE_LEDGER.md` para que sea visible, pero la fuente de verdad sigue siendo Vercel de Studio y `apps/worker/deploy.sh`.

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

### Ingesta (2026-09-26, staging y producción)

Dry-run en ambos ambientes, 54 versiones: `to_upload` 30, `unverifiable` 24 (las 24 imágenes de CMP-002 no traen
sha256 en el catálogo), `drift` 0, `rejected` 0, `missing_local` 0, `dedup` 0. Apply en ambos: 30 subidas, 30
enlazadas, 0 fallidas; re-run en staging: 0 subidas, `already_gcs` 30. El worker procesó 30 `original_finalized` por
ambiente (más reintentos esperados `media_object_pending`: 25 staging, 27 prod), DLQ 0; renditions `thumb` 54,
`preview` 54, `poster` 4, `crop_1x1` 11, `crop_16x9` 5, `crop_4x5` 2. Barrido probado en staging (`repaired 1`).
Canary de descarga en producción verde (200 con URL de 10,0 min, 403 anónimo, 404 ajena, 404 `original_not_stored`,
`audit_event` registrado). Readback de Metricool: 6 candidatos, 5 observados, 2 publicados, 1 `not_found`. Para ingestarlas: regenerar el catálogo del Campaign Manager con la huella
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

## Subidas (puerta de ingreso, TASK-1894 Entregable A)

Estado: **en producción desde 2026-10-02** (Studio `a450a3c`, `3fe85a2`, `aa91ce3`; API 1.3.0). Contrato, kernel e
invariantes: arquitectura §7.3. Una versión nueva nace sólo por esta puerta: pedir subida → `PUT` firmado a GCS →
confirmar (202 mientras verifica, 201 al crearse) → el worker recalcula sha256, tamaño, firma de bytes y proporción y
crea la versión `pending_review` → una persona la aprueba.

### Recursos y flags

| Recurso | Valor |
|---|---|
| Migración | `1790956839977_asset-ingest-door.sql` (staging y producción, 2026-10-02, rol migrador) |
| Token de la CLI | Secret Manager `marketing-studio-upload-cli-token` (producción) y `marketing-studio-upload-cli-token-staging`: cliente de API con scope `studio:assets:write` |
| IAM | runtime → `storage.objectCreator` condicionado a `originals/sha256/` · worker → rol custom `marketingStudioOriginalsDeleter` (`storage.objects.delete`) con la misma condición |
| CORS del bucket de originales | `PUT`/`POST`; producción `https://studio.efeonce.org`; staging `https://*.vercel.app` y `http://localhost:3100` |
| Worker | staging `marketing-studio-media-worker-staging-00003-2h9`; producción `marketing-studio-media-worker-00002-hzn` (imagen `3fe85a228e0d`) |

Flags (viven en Studio y no se leen en Greenhouse; la fuente de verdad es Vercel de Studio y `apps/worker/deploy.sh`):

| Dónde | Flag | Estado |
|---|---|---|
| Cloud Run (SoT `apps/worker/deploy.sh`) | `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` | `true` en staging y producción desde 2026-10-02. Apagado, el worker no verifica ni barre subidas |
| Vercel de Studio | `STUDIO_UPLOADS_ENABLED` | Production `true` desde 2026-10-02; Preview sólo la rama `task-1894-upload-door`. Apagado (o sin bucket o firmante), 403 `upload_disabled` |
| Vercel de Studio (opcional) | `STUDIO_UPLOAD_SIGNER_EMAIL` | firmante de las URLs de subida; si falta, `STUDIO_DOWNLOAD_SIGNER_EMAIL`, y si no, `GCP_SERVICE_ACCOUNT_EMAIL` |

**Orden de encendido: el worker antes que la web.** Con el flag del worker apagado no hay verificación ni barrido: si la
web firmara subidas antes, las confirmaciones se quedarían en 202 (deducido del código, no observado).

### Rollout (en orden; staging primero)

```bash
cd ~/Documents/efeonce-marketing-studio
# 1. Migración en la base del ambiente (credencial de migrador), antes de empujar main
DATABASE_URL="postgres://marketing_studio_migrator@127.0.0.1:15433/<base>" \
  PGPASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-migrator-password)" pnpm migrate up
# 2. Infra de la puerta (dry-run sin --apply; imprime cómo verificar y cómo revertir)
bash scripts/ops/infra/media-originals.sh --env staging --upload-door            # revisar
bash scripts/ops/infra/media-originals.sh --env staging --upload-door --apply
# 3. Worker con MEDIA_WORKER_UPLOAD_VERIFY_ENABLED: cambiar UPLOAD_VERIFY_ENABLED en apps/worker/deploy.sh → commit → deploy
bash apps/worker/deploy.sh --env staging --apply
# 4. Web: STUDIO_UPLOADS_ENABLED=true en Vercel de Studio (ver trampas sobre Preview) → redeploy
# 5. Canary (abajo) → repetir 1–4 con --env production / base marketing_studio / Production
```

Verificar la infra:

```bash
gcloud storage buckets get-iam-policy gs://efeonce-marketing-studio-originals --format=json \
  | jq -r '.bindings[] | "\(.role) \(.members|join(",")) \(.condition.title // "")"'
gcloud storage buckets describe gs://efeonce-marketing-studio-originals --format='yaml(cors_config)'
```

### Subir finales (`pnpm studio:upload`)

Usa la API (la misma puerta que la UI y los agentes); nunca escribe directo en la base ni en el bucket.

```bash
export STUDIO_API_TOKEN="$(gcloud secrets versions access latest --secret=marketing-studio-upload-cli-token)"
# Pieza deducida del nombre canónico (CMP###-<seq> - <título> - <WxH>.<ext>)
pnpm studio:upload "<…>/CMP004-S01 - <título> - 4x5.png" --campaign CMP-004 --license ai_generated --dry-run
pnpm studio:upload "<…>/CMP004-S01 - <título> - 4x5.png" --campaign CMP-004 --license ai_generated
# Pieza existente explícita (manda If-Match con su revision) o pieza nueva (un archivo por llamada)
pnpm studio:upload <archivo> --campaign CMP-### --license <kind> --asset <assetId>
pnpm studio:upload <archivo> --campaign CMP-### --license <kind> --new-asset --concept CMP###-<seq> --title "…" --ratio 4x5
# Retomar una confirmación que quedó en verificación
pnpm studio:upload --campaign CMP-### --resume <uploadId>
unset STUDIO_API_TOKEN
```

Opciones de derechos: `--license owned|client_supplied|stock|talent|music|ai_generated|mixed` (obligatoria),
`--reference`, `--from`/`--until` (`AAAA-MM-DD`), `--territory` y `--channel` (repetibles); `--note`; `--base-url`
(por defecto `https://studio.efeonce.org` o `STUDIO_API_URL`). Salida: una línea por archivo (`creado <assetId> vN ·
pendiente de revisión`, `duplicado de <assetId> vN`, `rechazado: <code>[: reason]`, `pendiente de verificación (retoma
con --resume <uploadId>)`); código 2 si faltan argumentos, 1 si algún archivo falló. La llave de idempotencia es
determinista por archivo y destino: repetir el mismo comando no duplica la subida.

### Revisar (`pnpm studio:review`)

Sólo operador (`operator_cli`), con las variables `STUDIO_PG_*` de la base destino (como `import:catalog`):

```bash
pnpm studio:review pending --campaign CMP-004
pnpm studio:review approve <assetId> <versionNo> --reviewer "Nombre Apellido" [--note "…"]
pnpm studio:review request-changes <assetId> <versionNo> --reviewer "Nombre Apellido" --note "qué cambiar"
```

Aprobar convierte la versión en vigente (`currentVersion`, `pendingVersionNo` null). No aprueba la campaña ni
autoriza pauta (`media_authorization` no cambia). Un cliente de API recibe `approval_requires_person`.

### Canary (como se hizo el 2026-10-02)

Staging, contra un deployment de preview con el flag: las previews de Studio **no tienen secreto de bypass**, así que
se usa `vercel curl … --deployment <url-preview> --scope efeonce-7670142f`. Resultados esperados:

1. Anónimo → 403 `write_not_allowed`.
2. Pedir subida con `dryRun` → inferencia sin escribir.
3. `PUT` a la URL firmada → 200.
4. Confirmar → 202, 202, 201 (versión `pending_review`); `studio.worker_run` con `versions_created 1` y derivados
   generados (5 en el canary de `CMP004-S01-imagen-4x5`).
5. `pnpm studio:review approve …` → el reader muestra la versión aprobada como `currentVersion` y `pendingVersionNo` null.

Producción (2026-10-02): 33 piezas de CMP-004 con `--new-asset`, licencia `ai_generated` y nota «Aprobada por el
operador el 2026-10-02 (CDR-012)» → 33 versiones `origin = studio`, 33 sha256 únicos (iguales a
`CONTROL-DE-PIEZAS.csv` de OneDrive), 33 `pending_review`, 132 derivados, 33 subidas `completed`. Quedan pendientes de
aprobación del operador.

Consultas útiles:

```sql
SELECT origin, review_state, count(*) FROM studio.asset_version GROUP BY 1, 2;
SELECT status, reject_code, count(*) FROM studio.asset_upload GROUP BY 1, 2;
SELECT kind, status, counts, started_at FROM studio.worker_run ORDER BY started_at DESC LIMIT 10;
```

### Rollback

| Qué | Cómo |
|---|---|
| Web | `STUDIO_UPLOADS_ENABLED=false` en Vercel de Studio + redeploy (las escrituras responden 403 `upload_disabled`) |
| Worker | `UPLOAD_VERIFY_ENABLED="false"` en `apps/worker/deploy.sh` → commit → redeploy (nunca `--update-env-vars` suelto) |
| IAM | `gcloud storage buckets remove-iam-policy-binding gs://<originales> --member … --role … --condition "<la misma>"` para los dos bindings condicionados |
| CORS | `gcloud storage buckets update gs://<originales> --clear-cors` |
| Migración | `pnpm migrate down` sólo si no existe ninguna versión con `origin = 'studio'` |

### Trampas

- **El rol custom tarda ~1 min en propagarse.** Recién creado `marketingStudioOriginalsDeleter`, el binding falla con
  «does not exist in the resource's hierarchy»; esperar y reintentar el `--upload-door --apply` (es idempotente).
- **`vercel env add … preview` en modo no interactivo exige una rama existente.** No deja crear la variable para todas
  las ramas de preview; por eso `STUDIO_UPLOADS_ENABLED` quedó sólo en la rama `task-1894-upload-door`. Para todas las
  ramas, crearla de forma interactiva o desde el dashboard.
- **Las previews de Studio no tienen secreto de bypass.** El canary de staging va por `vercel curl`; `pnpm
  studio:upload --base-url <preview>` no atraviesa la protección.
- **CORS sin comodines parciales.** GCS no acepta `https://*.vercel.app`: la subida desde el navegador en previews
  queda por validar en TASK-1895. La CLI no depende de CORS.
- **Pendientes fuera de Studio:** capability `marketing_studio.asset.write` en Greenhouse (en `develop` desde
  2026-10-02, release a producción sin autorizar; hoy no bloquea) y `pnpm studio:manifest:sync` en el gateway (las tools de escritura quedarían fuera por
  `write_tool_without_scope_class`; T1 delegado corresponde a TASK-2003 y TASK-1899 está retirada).

## Commands del catálogo (TASK-1894 Entregable B)

Estado: **code complete y verificado en staging; no está en producción.** Studio `a8c7886` vive en `main` local sin
empujar (el clasificador de permisos de la sesión bloqueó el push, que es el deploy de producción); la rama
`task-1894-entregable-b` (mismo commit) está en origin y su preview (`efeonce-marketing-studio-62vtv3yrm…`, base
staging) quedó verificada. API 1.4.0, 44 tools. Contrato, autoridad por campaña, máquinas de estado y errores:
arquitectura §7.4.

### Recursos

| Recurso | Valor |
|---|---|
| Migración | `packages/database/migrations/1790967435017_catalog-write-commands.sql` (aditiva), aplicada el 2026-10-02 en `marketing_studio_staging` **y** `marketing_studio` (producción). Las 5 campañas reales quedan `source_of_truth = 'onedrive'` |
| Sandbox | `CMP-900` en staging (organización Efeonce, datos sintéticos), creada por `createCampaign`; ids 900+ reservados a sandbox y pruebas |
| `api_client` de pruebas (staging) | «Pruebas de escritura TASK-1894 B (staging)», scopes `studio:read` + `studio:write` + `studio:assets:write`, organización Efeonce; token en Secret Manager `marketing-studio-write-tests-token-staging` (nunca impreso) |
| Capabilities en Greenhouse | `marketing_studio.asset.write` y `marketing_studio.campaign.write` en `develop` (`9d0d698d4`; seed aplicado en la instancia compartida); release a producción pendiente |

### Escribir desde la terminal (`pnpm studio:write`)

Corre como operador (`operator_cli`) con las variables `STUDIO_PG_*` del ambiente destino (como `import:catalog` y
`studio:review`), por los mismos primitives que la API. **Dry-run por defecto**; `--apply` escribe y una operación T2
(aprobación o destructiva) exige además `--confirm` después de ver su dry-run. Mientras Studio no esté empujado a
`main`, el Entregable B sólo está verificado en staging.

```bash
cd ~/Documents/efeonce-marketing-studio
pnpm studio:write --list                                   # operaciones, nivel de riesgo y ruta
# Transición T1: nota obligatoria e If-Match con la revisión vigente (la lectura la trae en revision/ETag)
pnpm studio:write transitionMediaAuthorization --param campaignId=CMP-900 --file to-pending.json --if-match 3        # dry-run
pnpm studio:write transitionMediaAuthorization --param campaignId=CMP-900 --file to-pending.json --if-match 3 --apply
# Aprobación T2: primero el dry-run, después --apply --confirm (la hace una persona)
pnpm studio:write authorizeMedia --param campaignId=CMP-900 --file autorizacion.json --if-match 4
pnpm studio:write authorizeMedia --param campaignId=CMP-900 --file autorizacion.json --if-match 4 --apply --confirm
```

`--key <llave>` permite reintentar sin duplicar; si no se indica, la CLI genera una y la imprime. Las subidas siguen por
`pnpm studio:upload` (§Subidas).

Respuestas a esperar (observadas en staging el 2026-10-02):

| Respuesta | Qué significa |
|---|---|
| `campaign_not_studio_owned` (409) | La campaña sigue gobernada por OneDrive (p. ej. CMP-004): el próximo import pisaría la escritura |
| `approval_requires_dedicated_command` (422) | Se pidió un destino aprobatorio por la transición genérica; usar `approveCreative` o `authorizeMedia` |
| `invalid_state_transition` (409) | La transición no está en la máquina de estados |
| `precondition_required` (428) / `revision_conflict` (412) | Falta `--if-match` o la revisión cambió; releer y repetir |
| T2 sin `--confirm` | La CLI no escribe |
| `confirmation_required` (403) | T2 por API no habilitada: sigue `operator_cli`; TASK-1899 retirada |
| `approval_requires_person` (403) | Un `api_client` intentó aprobar |

Canary HTTP (como se hizo el 2026-10-02, contra la preview con `vercel curl … --deployment <preview> --scope
efeonce-7670142f` y el token de `marketing-studio-write-tests-token-staging`): permisos proyectados + `ETag` en
`CMP-900`; anónimo 403 `write_not_allowed`; concepto 201 y replay con `Idempotent-Replayed: true`; aprobación por
bearer → `approval_requires_person`; CMP-004 → 409; brief literal (comillas tipográficas, `\n\n`, espacio final) con
`ETag`; copy byte a byte; flight + plan con `flightId`/`revision`.

### Rollback

| Qué | Cómo |
|---|---|
| Escritura por API | Revocar a los clientes con `studio:write`: `STUDIO_PG_…(base destino) pnpm api-client:revoke --id <api_client_id> --reason "…"` (hoy sólo el de pruebas de staging) |
| Deploy de Studio | Revertir el deploy (§Rollback: `vercel rollback` o revert + push a `main`) |
| Migración `1790967435017` | `pnpm migrate down` **sólo si ninguna campaña está en `source_of_truth = 'studio'`** (en staging, `CMP-900` lo está) |

### Pendiente (operador)

1. **Push de Studio a `main`** (= deploy de producción): `git push origin main` en `~/Documents/efeonce-marketing-studio`.
2. **Sync del gateway** `efeonce-mcp` — **hecho 2026-10-02** ([efeoncepro/efeonce-mcp#23](https://github.com/efeoncepro/efeonce-mcp/pull/23), `1ddc7db`, v1.10.0; desplegado por el operador con `deploy.yml`, revisión `efeonce-mcp-gateway-00064-q6w`). Contexto: el gateway federaba todas las tools del manifiesto y su proveedor llama siempre
   con GET, así que sincronizar el manifiesto con escrituras las federaría rotas. Cambio preparado sin commit (rama
   `task-1894-studio-write-manifest` desde `origin/main` `8ff029d`): `MARKETING_STUDIO_FEDERATED_TOOLS` = sólo
   lecturas; `call()` rechaza escrituras y métodos no-GET; `write_tool_without_scope_class` sólo si una escritura se
   registra; test nuevo. Pasos: aplicar el cambio → `pnpm studio:manifest:sync` → test → PR → merge → deploy. La única
   lectura federada nueva es `studio.campaign.brief.get`.
3. **Release de Greenhouse a producción** con las dos capabilities (no autorizado aún).
4. Entregable C (corte de las campañas existentes) diferido por el operador; TASK-1898 para persona por sesión y TASK-2003 para delegación MCP,
   confirmación T2 por API y federación de escrituras.

## Reproducción de video (TASK-1998/1999)

Estado: **en producción desde el 2026-10-04** (rollout autorizado por el operador).

| Paso | Estado |
|---|---|
| 1. Worker staging | ✅ `marketing-studio-media-worker-staging-00004-6v7` (imagen `35093c39f748`); barrido `repaired 1, failed 0` |
| 2. Migración `marketing_studio` | ✅ `1791129772182`; tres constraints en `pg_constraint` |
| 3. Worker producción | ✅ `marketing-studio-media-worker-00003-hrw` (imagen `aa35e0202de5`); barrido `repaired 6, failed 0` |
| 4. Push Studio `main` | ✅ `aa35e02` y `c52eb4a`; health `1.5.0`; `302` → `206 video/mp4` verificado con «Los Sparks» |
| 5. Gateway | ✅ manifiesto 1.5.0 sincronizado (efeoncepro/efeonce-mcp#24, mergeado `454d80eb6`); sin deploy necesario (superficie sin cambios) |

Orden de rollout:

1. Worker staging: `bash apps/worker/deploy.sh --env staging --apply` (flag `true` en `deploy.sh`).
2. Migración en `marketing_studio` (migrator, proxy local) y verificación en `pg_constraint`.
3. `PLAYBACK_ENABLED="true"` de producción en `deploy.sh` → commit → `deploy.sh --env production --apply` →
   `gcloud scheduler jobs run marketing-studio-reconcile-derivatives --project efeonce-group --location us-east4` →
   6 filas `kind='playback'` (CMP001-01 ×3, CMP001-08 ×2, CMP003-01) y `worker_run` sin `failed`.
4. `git push origin main` en Studio → `/api/v1/health` `1.5.0` → `curl -m 10 -I` del `playback.url` de
   `CMP001-08-video-16x9` → `302` → `curl -m 10 -r 0-1023` a la `Location` → `206 video/mp4`; abrir
   `studio.efeonce.org/campaigns/CMP-001?piece=CMP001-08-video-16x9` y reproducir.
5. Gateway: `pnpm studio:manifest:sync` + versión + PR + dispatch (sólo descripciones; el campo ya viaja).

Rollback: flag `false` + redeploy del worker (las filas existentes siguen sirviendo); revert del deploy web;
`migrate down` sólo después de borrar las filas `playback`.

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

Estado: **en producción desde 2026-09-26** (TASK-1896 complete): proyecto Sentry `efeonce-marketing-studio` (id
`4512153019809792`, creado por la UI porque la API de la org no permite crear proyectos), uptime check
`studio-api-v1-health-A2vbXH5AjzI` con política `17467591732187545239` y email a `jreyes@efeoncepro.com`, ensayo verde
contra `marketing_studio` y scheduler `marketing-studio-restore-rehearsal` ENABLED, señal de Greenhouse con scheduler
`ops-marketing-studio-health-watch` ENABLED. El paso 4 de `sentry.sh` (reglas de alerta) no aplica: Sentry movió las
alertas de issues a Workflows y `/projects/.../rules/` responde 404; queda el workflow por defecto de alta prioridad
(portarlo es Follow-up de TASK-1896). Contrato en la arquitectura §9; restauración en
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
- **`vercel api` para variables.** El POST de env acepta un objeto por request con `--input`. Para todas las ramas de preview: `vercel env add NAME preview ""`. Ojo (2026-10-02): en modo no interactivo el CLI pidió una rama existente para `preview` y no dejó crearla para todas; ver §Subidas › Trampas.
- **Usuarios en Cloud SQL.** Crearlos por SQL (`SET ROLE cloudsqlsuperuser`), nunca con `gcloud sql users create`: quedarían en `cloudsqlsuperuser` y podrían leer Greenhouse.
- **IAM DB auth no está disponible** en la instancia; activarla modificaría la instancia compartida con Greenhouse. Por eso usuario + contraseña en Secret Manager.
- **Tope de conexiones.** `marketing_studio_app` admite 20. Cualquier patrón «una consulta por elemento» en una grilla lo agota; las imágenes van por enlace firmado sin base.
- **`CONNECT` de PUBLIC en `greenhouse_app`.** Los roles de Studio pueden abrir sesión allí (0 tablas legibles, ninguna función `SECURITY DEFINER` alcanzable). Se cierra en TASK-1897.
- **ADC vencida ⇒ `database: unreachable` en local.** `.env.local` resuelve la contraseña con ADC; renovar con `pnpm gcloud:auth:playwright -- --force` desde greenhouse-eo.
- **Fechas de Postgres.** El parser de `DATE` (OID 1082) devuelve string; formatear fechas sin hora en UTC y horas con `hourCycle: 'h23'`.
- **Constantes compartidas.** Un Server Component no puede importar constantes desde un módulo `'use client'`. La cookie del tema vive en `components/theme.ts`.
- **`next dev` reescribe archivos.** Genera `apps/web/AGENTS.md`/`CLAUDE.md` (commiteados) y reescribe `next-env.d.ts`: no commitear la variante de dev.
- **`GRANT CONNECT` lo da el dueño de la base.** Para los roles `marketing_studio_restore` y `marketing_studio_worker` el `GRANT CONNECT` debe correrlo `marketing_studio_migrator` (dueño de las bases), no el admin de la instancia; los scripts de Studio ya lo hacen así (`f9e6cbb`, `82aeab6`).
- **Gate de versión del gateway.** Mide la superficie construida con todos los providers habilitados: un provider nuevo debe declararse en `src/surface.ts` y en el test de cobertura de políticas, o sus tools quedan fuera de la cuenta.

## TASK-1905 — Studio en producción 2026-10-04; integración y backfill pendientes

Catálogo versionado de 52 canales y taxonomía/UTM; validación en writers e importador, snapshots, hallazgos,
audiencias y referencia ICP opcional. API 1.6.0 / 59 tools (15 operaciones nuevas), publicada en el release descrito abajo. `pnpm check` y build
local pasan; DB aislada y atención desktop/mobile verificadas. [Dossier](../../audits/marketing-studio/TASK-1905-local-verification.md),
[contrato](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md) y
[manual](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md).

Studio fue publicado posteriormente con autorización expresa: main `74073de`, Vercel Ready
`dpl_61kJPNWNXabGYetKC6dxwch2s2uW`, API pública 1.6.0 y catálogo v1 de 52 canales. Worker producción
`00004-j4h` / staging `00006-p8q`, misma imagen y health 200. Migraciones Studio aplicadas en ambas bases.
[Evidencia de release y rollback](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md).
Flag explícito web/worker `STUDIO_CHANNEL_VALIDATION_MODE=warn`;
`off` desactiva validación y `enforce` exige publicación/backfill revisado y un release observado en warn.
`STUDIO_CUSTOMER_MODEL_ENABLED=false` explícito en web/worker. Activarlo no provisiona un consumer real; depende de TASK-1906/1892.
Federación de writes T1 depende de TASK-2003. Gateway quedó intacto en rama ajena `feat/task-1921-brand-render`.
SQL de capability Greenhouse parqueado en `docs/tasks/pending-migrations/TASK-1905-marketing-studio-catalog-capability.sql.pending`;
owner operador release: recrear timestamp, aplicar staging y readback. Dry-run productivo: 134 registros unmapped; cinco aliases
pendientes de revisión por efeonce_operations (detalle y conteos en el dossier). No se aplicó backfill ni se
activó enforce. El canary API pasó. Federación/canary de las nuevas lecturas MCP pendientes; las escrituras T1 requieren TASK-2003. No se bloquea desarrollo ni operación API/CLI/UI por TASK-1899. Greenhouse y gateway no se publicaron.



### Capability Greenhouse y autoridad pendiente

`marketing_studio.catalog.manage` existe en código (`src/config/entitlements-catalog.ts`) y grants efectivos
calculados (`src/lib/entitlements/runtime.ts`): acciones `create`/`update`, sólo `efeonce_admin` y
`efeonce_operations`. Coverage de 33 tests PASS; account/designer, acciones delete/all y roles no efectivos no
conceden acceso. Esto acredita implementación local en Greenhouse, no registro/grant efectivo en producción.
El SQL está en `docs/tasks/pending-migrations/TASK-1905-marketing-studio-catalog-capability.sql.pending`;
el operador de release debe recrearlo con `pnpm migrate:create`, aplicar y verificar el registry y canje.
No hubo release Greenhouse en el release Studio ni al entregar la CLI HTTP. Un bearer de servicio no gobierna
el catálogo: el canary productivo devuelve 403. TASK-2003 resuelve el carril delegado T1 en paralelo; no es
prerrequisito de toda TASK-1905. ICP real sigue desactivado y depende de TASK-1906/TASK-1892.

## CLI HTTP desde Greenhouse (2026-10-04, entrega local)

`pnpm studio` descubre OpenAPI/manifiesto vivos; no necesita checkout Studio ni acceso SQL. `list`, `describe`,
`call`, `upload`, `download` y `doctor` consumen la API; escritura en dry-run por defecto, `--apply` explícito,
idempotencia y revisión. `--confirm` de T2 expresa intención local, nunca concede autoridad ni sustituye una persona.

[Manual API-only](../../manual-de-uso/marketing-studio/operar-por-cli-api.md) y
[auditoría de 18 tests + HTTP real](../../audits/marketing-studio/2026-10-04-studio-api-cli.md). Operación verificada:
discovery59/64, catálogo de 52 canales, lectura autenticada de asset y carga dry-run sin ticket ni bytes. Transferencias/applies
se probaron con servidor local controlado; no se afirma carga aplicada en producción.

La CLI HTTP y las CLIs de mantenimiento del repo Studio son carriles distintos: el bearer existente de cargas no
concede `studio:write` general, y el catálogo global responde403 con bearer de servicio. Seed/backfill siguen siendo
mantenimiento autorizado por operador en Studio. Las cinco campañas OneDrive conservan su frontera de escritura.

## Candidato local TASK-2001 — 2026-10-04 (histórico pre-rollout)

**Sin push, deploy ni cambios de datos remotos.** Studio main incorpora slices hasta 4094da0, incluyendo el corte final de
backfill/contrato documentado en [QA local](../../audits/marketing-studio/TASK-2001-local-verification.md). API 1.7.0,
75 tools/80 operaciones; el runtime productivo verificado arriba conserva su versión anterior. La UI TASK-2002 no fue implementada.

Orden de rollout, sólo con autorización: cinco migraciones aditivas (`1791149145299`, `1791149983810`, `1791150800150`,
`1791151430000`, `1791151780000`) → configurar bindings/dominios → worker/readback → revisar slugs antiguos y backfill
→ web con flag → canary de lectura/escritura → sync/federación y canary con TASK-2003. Conservar scheduled_post;
[retiro diferido](../../tasks/pending-migrations/README.md) no se ejecuta con este release.

| Config | Default / dueño / verificación pendiente |
| --- | --- |
| STUDIO_ACTIVATIONS_ENABLED | false, runtime web y CLIs/domain; activar sólo después de migrar. OFF vuelve al calendario legacy. |
| MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED | false en deploy.sh; bindings intersectan METRICOOL_BLOG_IDS. Job /jobs/metricool-discovery. |
| MEDIA_WORKER_OWNED_READBACK_ENABLED | false en deploy.sh; job /jobs/owned-readback. |
| STUDIO_EXECUTION_BINDINGS | [] en deploy.sh; owner registra organizationId/provider/providerAccountRef. Para WordPress/other el ref es el origen HTTPS del sitio del cliente. Registro de cuenta no amplía esta autorización. |
| STUDIO_TRACKING_DOMAINS | {} por defecto, objeto org→lista de hostnames exactos (sin wildcard). Owner confirma dominios propios; nunca los toma del body del cliente. |
| HubSpot readback | Puerto de Greenhouse con identidad de consumer, org/portal y complete=true; endpoint/credencial del owner siguen pendientes. Config ausente falla cerrado. No existe canary HubSpot en esta entrega. |

Los jobs registran worker_run y cada cuenta su frescura. El health profundo añade activations_overdue y frescura de
descubrimiento/owned. Incluir permisos, canary tenant deny y fallos de proveedor antes de encender. Rollback: flags OFF;
migrate down sólo sin datos protegidos. Las bases de prueba fueron Postgres local descartable, nunca staging/prod.

### Nuevo alcance email — implementación pendiente (2026-10-04)

El operador requiere Resend (mayor volumen), HubSpot, Marketing Cloud Engagement y Marketing Cloud Next. La
implementación 4094da0 y su QA no cubren la ampliación: el lector actual está acoplado a HubSpot. Debe generalizarse
por provider/cuenta/envío, añadir catálogo versionado y adapters independientes, empezando por la evidencia Resend
ya gobernada en Greenhouse. No existe todavía soporte runtime de los nuevos proveedores. Ver delta email y plan
TASK-2001; flags OFF, sin push ni envíos. CLI/API/MCP deben conservar las mismas operaciones de activación.

## Rollout TASK-2001 — estado vigente 2026-10-04

[Release completo y límites](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md). Studio aa6fa07 pushed/desplegado; cinco migraciones en staging/prod. Seis posts preservados y vinculados a ACT-000001…000006 con CL confirmado, hora America/Santiago y versiones verificadas por hash. No hubo envíos ni publicaciones nuevas.

Activaciones ON en web preview/producción y ambos workers; library default false. Discovery ON sólo producción, bindings Efeonce × 3961547/5105024. Scheduler marketing-studio-metricool-discovery ENABLED (`7,37 * * * *`, Santiago), OIDC probado. Lectura 62 ejecuciones, replay 0 cambios/0 errores; 63 evidencias almacenadas (una legacy no retornada por la ventana), 57 sin vincular. Owned OFF: faltan bindings y adapters/owner Greenhouse. Tracking permite efeoncepro.com por organización, web preview/prod.

CLI HTTP producción verificada: doctor, calendario, activación y unlinked; no concede identidad personal por usar --confirm. Backfill real por command CLI autorizado. Tres CMP-001 overdue: sin fecha publicada aunque dos provider_status sean PUBLISHED; conciliación pendiente sin inventar timestamps. Email multiproveedor, owned, MCP delegado TASK-2003 y UI TASK-2002 conservan sus pendientes. Rollback: pausar discovery, flags OFF/redeploy, mantener schema/datos; ninguna migración down con evidencia.
