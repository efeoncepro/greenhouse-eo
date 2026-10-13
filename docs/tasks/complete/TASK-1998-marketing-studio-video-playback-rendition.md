# TASK-1998 — Marketing Studio: derivado de reproducción de video y su transporte

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-049`
- Status real: `Complete 2026-10-04 — en producción: worker marketing-studio-media-worker-00003-hrw con MEDIA_WORKER_PLAYBACK_ENABLED (6/6 videos con playback), Studio c52eb4a (API 1.5.0), 302 → 206 verificado; gateway sincronizado (efeonce-mcp 454d80eb6)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (TASK-1893 dejó el worker de derivados y los originales en GCS; TASK-1894 Entregable A dejó la puerta de ingreso)
- Branch: `efeonce-marketing-studio main (migración, worker, contratos, ruta, readers) · Greenhouse develop (docs, ledger de flags, skill) · efeonce-mcp rama + PR sólo para el sync del manifiesto (follow-up con autorización); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Studio guarda los MP4 originales en el bucket privado, pero para un video sólo genera `thumb`, `preview` y `poster`
(imágenes): no existe ningún derivado reproducible ni un transporte capaz de servir video. Esta task agrega el
derivado `playback` (MP4 H.264 liviano para web, *faststart*) al mismo worker, con backfill idempotente de los
videos ya ingestados, lo sirve sin pasar los bytes por una función de Vercel (302 a una URL firmada V4 de GCS de vida
corta) y lo expone en el contrato de lectura que consumen la web y el MCP. La UI del reproductor es TASK-1999.

## Why This Task Exists

- El panel de la pieza (`/campaigns/CMP-001?piece=CMP001-08-video-16x9`) muestra el cuadro del segundo 1 como imagen
  fija; en `apps/web/src` no hay ningún `<video>`.
- Aunque la UI tuviera un `<video>`, no hay qué reproducir: el original (hasta 38,6 MB hoy, hasta 1 GiB por contrato
  de subida) es pesado para web y vive en el bucket de originales, que la web nunca sirve.
- El transporte vigente `GET /api/v1/media/{token}` lee el objeto entero en memoria y lo devuelve desde la función:
  no atiende `Range` (el navegador no puede adelantar ni empezar a reproducir antes del final) y una respuesta de
  10–20 MB supera el límite de cuerpo de respuesta de una función de Vercel (4,5 MB).
- `studio.asset_rendition` sólo admite `mime_type` de imagen (`CHECK`): hoy no se puede registrar un derivado de video.

## Goal

- Cada versión de video con original en GCS tiene un derivado `playback` (MP4 H.264 + AAC, lado corto ≤ 720 px, sin
  agrandar, bitrate acotado, `+faststart`), generado por el mismo worker de forma idempotente y sin sobrescribir.
- Los 6 videos de producción (y los de staging) quedan con `playback` por el barrido del worker, sin intervención
  manual sobre datos.
- El navegador reproduce y adelanta el video con peticiones `Range` servidas directo por GCS: `/api/v1/media/{token}`
  responde `302` a una URL firmada V4 de vida corta, sin consultar Postgres y sin pasar bytes de video por Vercel.
- Los readers exponen `playback { url, posterUrl, mimeType, widthPx, heightPx, byteSize }` (o `null`) en la pieza y en
  cada versión; el registro, el OpenAPI y el manifiesto quedan en paridad (manifiesto regenerado, nunca a mano).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§ originales, derivados y medios)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (Studio + GCS fuente única)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (registro de operaciones, tool o exclusión)
- Skill `efeonce-marketing-studio` (`references/contracts.md`, `operations.md`, `lessons.md`)

Reglas obligatorias:

- `packages/domain` libre de framework (`domain-boundary-gate`); el transcode vive detrás del puerto `MediaToolkit`
  y su adapter Node (`toolkit-node.ts`), que la web nunca importa.
- La autorización ocurre una vez en el reader; el transporte de medios nunca abre una conexión a Postgres (lección
  2026-09-25, incidente de las 20 conexiones).
- `null` = ausente: un video sin derivado `playback` expone `playback: null`, nunca una URL rota ni el original.
- Errores con el contrato canónico `{ error (es-CL), code, actionable }` del `ERROR_CATALOG` cerrado.
- Toda ruta `/api/v1` en el registro con tool o exclusión razonada; el manifiesto se regenera con
  `pnpm mcp:manifest:generate`.
- Versiones de dependencias sólo en el `catalog:` de `pnpm-workspace.yaml`.
- Comandos Vercel sólo con `.vercel/project.json` verificado (`prj_dztLezZkYxAJikDuPSdT9QROEJRS`).
- Flags del worker con SoT en `apps/worker/deploy.sh` (nunca `--update-env-vars` solo).

## Normative Docs

- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (§ Originales y worker)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1893 (complete): bucket de originales, `studio.media_object`, worker `marketing-studio-media-worker[-staging]`,
  `generateDerivatives`/`reconcileDerivatives`, `nodeMediaToolkit`, firma V4 `signReadUrlV4` + `iamBlobSigner`.
- TASK-1894 Entregable A (en producción): las versiones subidas por la puerta de ingreso pasan por el mismo worker.

### Blocks / Impacts

- **TASK-1999** (reproductor en el panel de la pieza) consume `playback` de esta task.
- TASK-1895 (edición, revisión, versiones en el inspector): el historial de versiones puede reusar `playback` por
  versión; no se duplica.
- TASK-1899 / gateway: el sync del manifiesto cambia descripciones y esquemas de `studio.asset.get` y
  `studio.campaign.assets.list` (follow-up de despliegue del gateway, con autorización).

### Files owned

- `efeonce-marketing-studio/packages/database/migrations/<ts>_video-playback-rendition.sql`
- `efeonce-marketing-studio/packages/database/src/schema.ts` (`RenditionKind`, `mime_type` de rendition)
- `efeonce-marketing-studio/packages/domain/src/media/{derivatives,ports,toolkit-node}.ts` (+ tests)
- `efeonce-marketing-studio/packages/domain/src/media-url.ts`
- `efeonce-marketing-studio/packages/domain/src/readers/campaigns.ts` (bloques de rendition)
- `efeonce-marketing-studio/packages/contracts/src/{dto,semantics,errors,operations,openapi}.ts`, `generated/tool-manifest.json`
- `efeonce-marketing-studio/apps/web/src/app/api/v1/media/[token]/route.ts` + `apps/web/src/server/media-signing.ts` (nuevo)
- `efeonce-marketing-studio/apps/worker/{deploy.sh,src/config.ts,src/handlers.ts}`
- Greenhouse: esta task, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag), skill `efeonce-marketing-studio`

## Current Repo State

### Already exists

- `packages/domain/src/media/derivatives.ts`: `expectedDerivatives` (video → `thumb`, `preview`, `poster` + recortes),
  `generateFor` (lee el original entero, extrae cuadro del segundo 1), `generateDerivativesForObject` (evento
  `OBJECT_FINALIZE`), `reconcileDerivatives` (barrido horario `/jobs/reconcile-derivatives`, lote
  `MEDIA_WORKER_RECONCILE_BATCH`). Objeto nombrado `renditions/<versionId>/<kind>-<sha12>.<ext>`, subida sin
  sobrescribir, fila única por `(asset_version_id, kind)` con `source_sha256`.
- `packages/domain/src/media/toolkit-node.ts`: sharp + ffmpeg/ffprobe; worker Cloud Run con `ffmpeg` de Debian
  bookworm (incluye `libx264`), `--cpu 2 --memory 2Gi --timeout 900 --concurrency 1`, push de Pub/Sub con ack 600 s.
- `packages/domain/src/media-url.ts`: enlaces HMAC con vencimiento semanal; `verifyMediaToken` ya acepta
  `video/*` y exige el prefijo `renditions/`.
- `apps/web/src/app/api/v1/media/[token]/route.ts`: sirve el objeto entero desde la función (`readObject`).
- `packages/database/src/storage.ts`: `signReadUrlV4` + `iamBlobSigner` (los usa la descarga de originales,
  `apps/web/src/server/downloads.ts`, en producción desde 2026-09-26).
- Readers: `listCampaignAssets` expone `thumbUrl`/`previewUrl`; `getAsset` expone por versión `thumbUrl`,
  `previewUrl`, `posterUrl` (JPEG a resolución completa) y `placementPreviews`.
- Producción (2026-10-04, por la API): 6 videos `gcs` — `CMP001-01-video-{1x1,4x5,9x16}` (15,1 s; 4,6–17,7 MB),
  `CMP001-08-video-16x9` (49,6 s; 36,4 MB), `CMP001-08-video-16x9-instagram` (52,6 s; 34,8 MB),
  `CMP003-01-video-9x16` (29,5 s; 38,6 MB).

### Gap

- No existe el kind `playback` ni un `mime_type` de video admitido en `studio.asset_rendition`.
- El transporte no soporta `Range` ni respuestas grandes; no hay firma de lectura sobre el bucket de medios.
- El contrato de lectura no tiene campo de reproducción; agentes y web no pueden saber si una pieza es reproducible.
- El worker carga el original completo en memoria (`readOriginal` → `Buffer`) y lo escribe a `/tmp` (memoria en
  Cloud Run): con el contrato de 1 GiB, un video muy grande agotaría los 2 GiB (riesgo declarado, ver Follow-ups).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` — `packages/domain/src/media/**` (dominio), `apps/worker` (Cloud Run), ruta `GET /api/v1/media/{token}` de `apps/web` (Vercel)
- Future candidate home: `remain-shared`
- Boundary: derivado `playback` generado por `generateDerivatives`/`reconcileDerivatives` (puerto `MediaToolkit.transcodePlayback`); contrato de lectura `AssetDto.playback` / `AssetVersionDetail.playback`; transporte `getMedia` (exclusión). Consumidores: web de Studio (TASK-1999), tools MCP federadas, TASK-1895.
- Server/browser split: transcode sólo en el worker; firma V4 sólo en la ruta del servidor; el navegador recibe una URL relativa firmada por HMAC y sigue el `302`.
- Build impact: `none` (ffmpeg ya está en la imagen del worker; sin dependencias nuevas)
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (+ migración aditiva de un `CHECK`, worker y ruta de transporte)
- Source of truth afectado: `studio.asset_rendition` (fila `kind='playback'`) + objeto `renditions/<versionId>/playback-<sha12>.mp4` en `efeonce-marketing-studio-media[-staging]`
- Consumidores afectados: web de Studio (TASK-1999), `GET /api/v1/campaigns/{id}/assets`, `GET /api/v1/assets/{id}`, tools `studio.campaign.assets.list` y `studio.asset.get` (gateway), health profundo (`pending_renditions`)
- Runtime target: `staging` → `production` (Cloud SQL compartida, worker Cloud Run, Vercel)

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/{dto,operations,errors,semantics}.ts`; OpenAPI 1.4.0; `studio-tool-manifest.v1`; `media-url.ts` (HMAC semanal, prefijo `renditions/`).
- Contrato nuevo o modificado:
  - `RenditionKind` + `'playback'`; `asset_rendition.mime_type` + `'video/mp4'`.
  - `MediaToolkit.transcodePlayback(video) → { data, width, height, mime: 'video/mp4' }`; `DerivativeStorage.putDerivative` acepta `video/mp4`.
  - DTO `PlaybackRendition { url, posterUrl, mimeType: 'video/mp4', widthPx, heightPx, byteSize }`; `AssetDto.playback: PlaybackRendition | null` (versión vigente) y `AssetVersionDetail.playback: PlaybackRendition | null`; `posterUrl` del objeto = el `preview` (cuadro del segundo 1, WebP 1600) o `null`.
  - Glosario `semantics.ts`: clave `playback`.
  - `getMedia`: para `video/*` responde `302` a URL firmada V4 (vida 1 h, `response-content-type`); para imagen, igual que hoy. Exclusión con razón actualizada.
  - Error nuevo `playback_unavailable` (503, `actionable: false`): firmante no configurado en el ambiente.
  - `API_VERSION` 1.4.0 → 1.5.0; manifiesto regenerado (hash nuevo).
- Backward compatibility: `compatible` — campos nuevos opcionales en lectura; el gateway no valida esquemas de salida (verificado en `efeonce-mcp/src/providers/marketing-studio.ts`), así que sigue funcionando antes del sync.
- Full API parity: un reader (`listCampaignAssets`/`getAsset`) sirve a la web y al MCP; la UI no arma URLs ni firma nada.

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.asset_rendition` (CHECK de `kind` y `mime_type`).
- Invariantes que no se pueden romper:
  - El derivado es una vista de la versión: nunca una `asset_version`, nunca reemplaza al original ni cambia `review_state`.
  - Idempotencia: objeto nombrado por versión + sha; subida con `ifGenerationMatch=0`; fila única `(asset_version_id, kind)`; re-correr el barrido no genera nada nuevo (`up_to_date`).
  - Nunca se sobrescribe un objeto ni se toca el bucket de originales (sólo lectura).
  - Sin agrandar: un original con lado corto < 720 conserva su resolución.
  - `playback: null` si no hay derivado; nunca se expone el original como reproducción.
  - El transporte no consulta Postgres; la URL firmada sólo abre `renditions/**` del bucket de medios del ambiente.
- Write-target allowlist: `N/A` (Studio no tiene boundary test de destinos de escritura; la única tabla tocada ya existe).
- Tenant/space boundary: la organización se verifica en el reader (`scopeCampaigns`); el token HMAC es la autorización del transporte (vence a la semana; la URL V4 a la hora).
- Idempotency/concurrency: el worker corre con `--concurrency 1`; dos corridas sobre la misma versión producen el mismo nombre de objeto y el `ON CONFLICT` de la fila; el barrido limita a `MEDIA_WORKER_RECONCILE_BATCH` por corrida.
- Audit/outbox/history: `studio.worker_run` registra cada corrida (`generated`, `repaired`, `failed`); sin evento nuevo.

### Migration, backfill and rollout

- Migration posture: `additive` — reemplaza los `CHECK` de `kind` (`+ 'playback'`) y `mime_type` (`+ 'video/mp4'`) con bloque `DO … RAISE EXCEPTION` de verificación; el `Down` aborta si existe alguna fila `playback`.
- Default state: flag `MEDIA_WORKER_PLAYBACK_ENABLED` OFF en el código; `deploy.sh` lo enciende primero en staging.
- Backfill plan: el barrido horario `/jobs/reconcile-derivatives` detecta el derivado faltante y lo genera (lote acotado); disparo manual inmediato con `gcloud scheduler jobs run marketing-studio-reconcile-derivatives[-staging]`. Staging primero, luego producción. Verificación por `worker_run` + filas `playback` + lectura por API.
- Rollback path: flag OFF + redeploy del worker (deja de generar; las filas existentes siguen sirviéndose); revert del deploy web (vuelve a no exponer `playback`); `migrate down` sólo tras borrar las filas `playback`.
- External coordination: migración con el migrator en ambas bases; deploy del worker (`apps/worker/deploy.sh --apply`); push de Studio `main` = deploy de producción (con autorización explícita del operador); sync del gateway como follow-up autorizado.

### Security and access

- Auth/access gate: reader con `Actor` (modo `open` / `api_client` con `studio:read`); transporte por token HMAC; firma V4 por IAM `signBlob` de la SA del runtime (`iam.serviceAccountTokenCreator` sobre sí misma, ya vigente por la descarga) con lectura del bucket de medios (ya vigente: la web lee renditions).
- Sensitive data posture: sin PII; la URL firmada es temporal (1 h) y de un solo objeto.
- Error contract: `not_found` (token inválido/vencido o prefijo ajeno), `playback_unavailable` (sin firmante), `internal_error` con `captureWithDomain(…, 'media')`.
- Abuse/rate-limit posture: el token HMAC ya limita qué objeto se abre; la redirección lleva `Cache-Control: private, max-age=300` para no firmar en cada petición de rango.

### Runtime evidence

- Local checks: `pnpm check` (gates + manifiesto + typecheck + tests) y `pnpm build` en Studio; tests de dominio del derivado `playback` (expectativas por tipo, nombre del objeto, idempotencia, cuadro perezoso) y del adapter (transcode real de un fixture con ffmpeg/ffprobe: códec `h264`, `faststart` (átomo `moov` antes de `mdat`), lado corto ≤ 720).
- DB/runtime checks: migración aplicada y verificada (`pg_constraint`) en `marketing_studio_staging` y `marketing_studio`; `SELECT kind, mime_type, count(*) FROM studio.asset_rendition GROUP BY 1,2`.
- Integration checks: worker staging/prod `worker_run` con `repaired` = videos; `curl -I` del enlace → `302` a `storage.googleapis.com`; `curl -r 0-1023` a la URL firmada → `206`.
- Reliability signals/logs: health profundo `pending_renditions` vuelve a `ok`; log `studio_request` de `media.get`; DLQ vacía.
- Production verification sequence: ver § Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A` (sin tabla nueva).
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive: transcode en el dominio (puerto) + adapter Node; exposición en el reader; la UI sólo pinta.
- [ ] Read como reader canónico (`listCampaignAssets`, `getAsset`); sin write nuevo (el derivado lo produce el worker, no una acción de negocio).
- [ ] Capability: sin capability nueva — lectura bajo `marketing_studio.campaign.read` / `studio:read` vigentes.
- [ ] Camino programático: `/api/v1` + tools MCP existentes (`studio.asset.get`, `studio.campaign.assets.list`); transporte como exclusión razonada.
- [ ] Un primitive, muchos consumers: web y MCP leen el mismo campo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Esquema y derivado `playback` en el dominio

- Migración `video-playback-rendition` (aditiva, con verificación); `RenditionKind` y `mime_type` en `schema.ts`.
- Puerto `MediaToolkit.transcodePlayback` + adapter ffmpeg (`libx264`, `-preset faster`, `-crf 23`, `-maxrate 2.5M -bufsize 5M`, `-profile:v high`, `-pix_fmt yuv420p`, lado corto ≤ 720 sin agrandar, AAC 128 kbps si hay audio, `-movflags +faststart`, `-map_metadata -1`).
- `expectedDerivatives` agrega `playback` a video sólo con `playbackEnabled`; el cuadro del segundo 1 se extrae sólo si falta un derivado de imagen; `putDerivative` acepta `video/mp4`; objeto `playback-<sha12>.mp4`.
- Tests unitarios + test del adapter con fixture real.

### Slice 2 — Worker y backfill

- Config `MEDIA_WORKER_PLAYBACK_ENABLED` (`config.ts`, handlers, `deploy.sh` como SoT; staging `true` primero).
- Backfill por el barrido idempotente; verificación en `worker_run` y filas.

### Slice 3 — Transporte sin bytes por Vercel

- `media-signing.ts`: firmante del bucket de medios (`STUDIO_MEDIA_SIGNER_EMAIL` → `STUDIO_DOWNLOAD_SIGNER_EMAIL` → `GCP_SERVICE_ACCOUNT_EMAIL`).
- `getMedia`: `video/*` → `302` a V4 (1 h) con `Cache-Control: private, max-age=300`; sin firmante → `503 playback_unavailable`; imagen sin cambios.

### Slice 4 — Contrato de lectura y paridad

- DTO `PlaybackRendition`, `AssetDto.playback`, `AssetVersionDetail.playback`; glosario; error nuevo; exclusión de `getMedia` actualizada; `API_VERSION` 1.5.0.
- Readers con la rendition `playback` + `preview` como `posterUrl`; `pnpm mcp:manifest:generate`; tests de paridad, fuga y determinismo verdes.

## Out of Scope

- El reproductor en la UI (TASK-1999).
- Cloud CDN delante del bucket de medios (alternativa evaluada; ver Design notes y Follow-ups).
- HLS/DASH, bitrate adaptativo, subtítulos y miniaturas de línea de tiempo.
- Transcode en streaming (sin cargar el original en memoria) para originales cercanos a 1 GiB (Follow-up).
- Federación de `studio.asset.download` y escrituras en el gateway (TASK-1899).
- Sync y despliegue del gateway (follow-up con autorización).

## Detailed Spec

**Transporte — decisión.** Se evaluaron tres caminos:

1. *Streaming por la función con `Range`*: descartado — cada adelanto abre una invocación, el cuerpo máximo de una
   función de Vercel es 4,5 MB y el tráfico de video se factura dos veces.
2. *URL V4 firmada en el reader*: descartado — el reader tendría que llamar a IAM por cada video de cada página y
   dejaría de ser puro; además la URL quedaría fija por la vida de la página.
3. **Elegido:** el reader entrega el enlace HMAC de siempre (`/api/v1/media/{token}`, sin base) y la ruta, para
   `video/*`, responde `302` a una URL V4 de 1 h sobre el objeto del bucket de medios. GCS atiende `Range` (`206`) y
   el navegador sigue usando la URL final para adelantar. Para imagen nada cambia.

**Cloud CDN (pregunta del operador, 2026-10-04).** Un bucket puede ser origen de Cloud CDN como *backend bucket*
detrás de un balanceador HTTPS global, con URLs firmadas de Cloud CDN (clave HMAC, sin IAM por petición) y caché por
rangos. Cuesta un balanceador con cargo fijo mensual, un subdominio (`media.studio.efeonce.org`) con certificado y su
DNS en HostGator, y lectura del bucket para la SA de relleno de Cloud CDN. Con 6 videos y uso interno no se justifica;
el firmante vive en `media-signing.ts`, así que pasar a Cloud CDN cambia ese adaptador, no el contrato. Condición de
entrada: piezas compartidas fuera del equipo o volumen de reproducción que haga visible el egreso.

**Nombre y forma del objeto.** `renditions/<asset_version_id>/playback-<sha256[0:12]>.mp4`, `Content-Type:
video/mp4`, subida con `ifGenerationMatch=0`. Fila: `kind='playback'`, `mime_type='video/mp4'`, `width_px`,
`height_px`, `byte_size`, `source_sha256`.

**Póster.** `playback.posterUrl` es el `preview` (WebP 1600 del segundo 1), más liviano que el `poster` JPEG a
resolución completa, que se conserva para descarga/colocación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. La migración (Slice 1) se aplica en la base ANTES de desplegar el worker
  (si no, el `INSERT` de `playback` viola el `CHECK`). El worker (Slice 2) ANTES que la web (Slices 3–4): la web
  sólo expone `playback` cuando hay filas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Transcode excede memoria con un original grande | worker | low (hoy ≤ 38,6 MB) | `--memory 2Gi`; follow-up de streaming; el barrido marca `failed` sin bloquear | `worker_run.counts.failed`, DLQ |
| Transcode tarda más que el ack de Pub/Sub (600 s) | worker | low | `-preset faster`; un fallo se reintenta por el barrido, no por bucle | `worker_run` `last_run_partial` |
| Firma V4 sin permiso sobre el bucket de medios | web | low | la SA del runtime ya lee el bucket y firma descargas; verificación en staging | `403` en `curl` a la URL firmada |
| `CHECK` impide el `INSERT` si el worker sale antes que la migración | DB/worker | medium | orden duro de slices | `worker_run` con error de constraint |
| Costo de egreso de video | GCP | low | 720p acotado (~16 MB por 50 s); caché de la redirección | facturación mensual |

### Feature flags / cutover

- `MEDIA_WORKER_PLAYBACK_ENABLED` (worker, SoT `apps/worker/deploy.sh`, default `false` en código): con `false` no se
  genera `playback`. Revert: `false` + `deploy.sh --apply` (< 10 min). Registrar en `FEATURE_FLAG_STATE_LEDGER.md`.
- La web no tiene flag: expone `playback` sólo si existe la fila (null-safe).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate down` tras `DELETE FROM studio.asset_rendition WHERE kind='playback'` (y objetos opcionales) | 5 min | sí |
| Slice 2 | flag `false` + redeploy del worker | 10 min | sí |
| Slice 3 | revert del commit + push `main` (o `vercel rollback`) | 5 min | sí |
| Slice 4 | igual que Slice 3; el gateway no depende del campo | 5 min | sí |

### Production verification sequence

1. Migración en `marketing_studio_staging` + verificación `pg_constraint`.
2. Worker staging con flag `true` → `gcloud scheduler jobs run marketing-studio-reconcile-derivatives-staging` → filas `playback` + `worker_run`.
3. Local (`pnpm dev` contra staging): `curl -I` del enlace → `302`; `curl -r` → `206`; reproductor de TASK-1999.
4. Migración en `marketing_studio` + worker producción con flag `true` → barrido → 6 filas `playback`.
5. Push de Studio `main` **sólo con autorización del operador** → `GET /api/v1/health` 1.5.0 → `302`/`206` en producción.
6. Gateway: sync del manifiesto como follow-up autorizado.

### Out-of-band coordination required

- Autorización explícita del operador para: migración en producción, deploy del worker de producción, push de Studio `main` y sync/deploy del gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `studio.asset_rendition` admite `kind='playback'` y `mime_type='video/mp4'` en staging y producción (verificado en `pg_constraint`). — staging (up → down → up) y producción, 2026-10-04.
- [x] Para cada video `gcs` existe exactamente una fila `playback` con `source_sha256` = sha de la versión; re-correr el barrido no crea filas ni objetos nuevos.
- [x] El MP4 generado es H.264 + AAC (o sin audio si el original no tiene), lado corto ≤ 720 px sin agrandar, con `moov` antes de `mdat` (verificado por test con ffprobe sobre un fixture).
- [x] `GET /api/v1/media/{token}` de un video responde `302` a `storage.googleapis.com` sin consultar Postgres, y la URL final atiende `Range` con `206`.
- [x] `AssetDto.playback` y `AssetVersionDetail.playback` son `null` para imágenes y para videos sin derivado.
- [x] Manifiesto regenerado con `pnpm mcp:manifest:generate`, `API_VERSION` 1.5.0, tests de paridad/fuga/determinismo verdes.
- [x] `pnpm check` y `pnpm build` verdes en Studio; tests del worker verdes.
- [x] Flag registrado en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.

## Verification

- `pnpm check` (Studio)
- `pnpm build` (Studio)
- `pnpm --filter @studio/domain exec vitest run src/media` y `pnpm --filter @studio/worker test`
- `curl -I` / `curl -r 0-1023` contra local, staging y producción
- `SELECT kind, mime_type, count(*) FROM studio.asset_rendition GROUP BY 1,2;`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Skill `efeonce-marketing-studio` actualizada (ledger, architecture-map, contracts, operations, lessons) y espejada a `.codex/`
- [ ] Arquitectura de Marketing Studio, manual de uso y documentación funcional actualizados

## Delta 2026-10-04 — en producción (complete)

- **Rollout autorizado por el operador:** worker staging `00004-6v7` (barrido `repaired 1`, `failed 0`, transcode real en
  Cloud Run); migración en `marketing_studio`; worker producción `00003-hrw` (imagen `aa35e0202de5`, flag ON, Studio
  `aa35e02`); barrido manual `succeeded`, `repaired 6`, `failed 0`: CMP001-01 ×3, CMP001-08 ×2 (7,3 MB, 1280×720) y
  CMP003-01; push de Studio `main` (`aa35e02`, luego `c52eb4a`) → health `1.5.0`.
- **Verificación en producción:** `playback` en los 2 videos de CMP001-08 y `null` en sus imágenes; enlace → `302`
  `Location storage.googleapis.com/efeonce-marketing-studio-media/renditions/…/playback-….mp4` con `X-Goog-Expires=3600`
  y `response-content-type=video/mp4`, `Cache-Control: private, max-age=300`; destino `206 video/mp4`
  (`bytes 0-1023/7643530` y rango a mitad); Playwright con Chrome: pausado al cargar, duración 49,6 s, adelanta a 30 s,
  `error null`, medios `302 studio.efeonce.org` + `206 storage.googleapis.com`.
- **Gateway:** `studio:manifest:sync` (44 tools, hash `60dfac7524ee`), `pnpm check` 237 tests verdes, superficie sin cambios
  (digest `193e182cd743`, versión 1.10.0), PR efeoncepro/efeonce-mcp#24 con CI verde, mergeado (`454d80eb6`) por instrucción explícita del operador
  en el chat (antes el clasificador lo había bloqueado como «Merge Without Review»). No requiere deploy: el provider no valida
  esquemas de salida y `playback` ya llega a los agentes.
- **Nota de proceso:** el deploy del worker de producción lo bloqueó el clasificador hasta que el operador lo autorizó
  explícitamente en el chat («te autorizo a correrlo tu todo»).

## Delta 2026-10-04 — code complete

- **Hecho (Studio `f5ae10a`, `995bb73`, `main` local sin push):** migración `1791129772182_video-playback-rendition`
  (+ CHECK de pareja `asset_rendition_playback_mime_chk`), `transcodePlayback` + `playbackArgs`, flag
  `MEDIA_WORKER_PLAYBACK_ENABLED` (`deploy.sh`: staging `true`, producción `false`), `302` a V4 de 1 h, error
  `playback_unavailable`, `PlaybackRendition` en `Asset` y `AssetVersionDetail`, API 1.5.0, manifiesto 44 tools hash
  `60dfac7524ee`. Desvío declarado: `next dev` sin firmante hace de proxy con `Range` (la cuenta personal recibe 403 al
  firmar como `marketing-studio-runtime-stg@`); en Vercel nunca.
- **Evidencia:** `pnpm check` exit 0 y `pnpm build` OK; tests con ffmpeg real (h264/aac, `moov` antes de `mdat`,
  1920×1080→1280×720, 1080×1920→720×1280, 640×360 se conserva); «Los Sparks» real 36,4 MB → 7,7 MB en ~20 s de CPU;
  staging: migración up → down → up, 4 `playback` generados desde local con `generateDerivatives` (segunda corrida
  `up_to_date`; borrar uno y volver a correr lo repone con `uploaded 0`); localhost: `206` por `Range`, token alterado
  `not_found`, imagen `playback: null`; firma V4 con `response-content-type` → GCS `206 video/mp4` (sobre un original
  que la SA firmante puede leer).
- **Hallazgo de la sesión:** el `cloud-sql-proxy` de 15433 llevaba dos días aceptando y cortando conexiones; se
  reinició en el mismo puerto. Un `next dev` de Studio colgado al 98 % de CPU se reinició con la vista previa.

## Follow-ups

- Release de Greenhouse que sirva el manual MCP `marketing-studio` actualizado (línea `playback`).
- Transcode en streaming (original a disco por partes, sin `Buffer`) antes de admitir videos cercanos a 1 GiB en producción.
- Cloud CDN con backend bucket si las piezas se comparten fuera del equipo o el egreso crece.
