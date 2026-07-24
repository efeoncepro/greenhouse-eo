# Efeonce Globe — Media Derivatives + Range Delivery V1

- Status: Aceptada e implementada — desplegada y verificada internal-only (TASK-1528)
- Validated: 2026-07-24
- Confidence: Alta para el schema, la state machine de intents, el provider seam de ffmpeg, el gateway de Range y los negativos de seguridad (ejercitados por tests + canary en vivo con las tres modalidades); el consumo de previews por la UI (TASK-1526) y el GC de huérfanos (TASK-1529) quedan fuera de scope
- Reversibility: `two-way-but-slow` — flags OFF + detener el Job dejan el original intacto y no destruyen nada; los schemas versionados (`MediaDerivativeRecordV1`, identidad exacta) y el contrato del gateway son costosos de reemplazar una vez que hay consumers; el bucket de derivados y la migración `0029` son aditivos
- Related: [`EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md`](EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md) (ADR-008, la decisión que esta spec implementa), [`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`](EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) (retrieval de outputs TASK-1503, del que reusa `authorizeOwnedOutput`), [`EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md) (SPEC-007, reglas del datastore), [`EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`](EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md) (ADR-007, patrón del segundo Job con binarios nativos)
- Task: TASK-1528 (build units 1-3 de ADR-008 + evidencia de canary), sobre el spine TASK-1481; desbloquea TASK-1529 (build unit 5: GC)

## Contexto y decisión

[ADR-008](EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md) decidió **original inmutable + derivados
versionados + streaming gateway autorizado + lifecycle mark-and-sweep** y descompuso la implementación en cinco
build units de ownership separado. Esta spec documenta cómo funcionan los **build units 1-3** ya desplegados
(schema+dominio, worker de transformación, gateway de Range); el build unit 4 (feed projection/visibility) lo
consume TASK-1526, y el build unit 5 (orphan GC) es TASK-1529.

El problema que resuelve: el Producer sirve hoy **originales completos** en cards y viewer, lo que degrada
rendimiento, hace frágil el video/audio y mezcla transformación con serving. Esta capa introduce **versiones
livianas versionadas** producidas por un worker separado y un **gateway que sirve un solo rango de bytes** por
request re-autorizando cada vez, sin bufferizar el archivo completo.

## Los tres build units implementados

### 1. Contrato + schema + dominio (`packages/{contracts,domain,database}`)

**Identidad exacta e inmutable del derivado** — cambiar cualquier componente crea otro record/objeto:

```
(workspaceId, sourceSha256, sourceObjectGeneration, profileId, profileVersion, transformerVersion, outputMime)
```

**Perfiles = DATA gobernada, no branches** (`GLOBE_MEDIA_DERIVATIVE_PROFILES` en `packages/contracts`). Catálogo
v1 con **6 perfiles**, cada parámetro explícito (nada depende de defaults de ffmpeg):

| Perfil | Modalidad | Output | Parámetros clave |
|---|---|---|---|
| `image.card-thumb` | image | WebP | maxEdge 512, quality 75, fit inside, strip metadata |
| `image.viewer-preview` | image | WebP | maxEdge 1600, quality 80 |
| `video.poster` | video | WebP | frame @1s, maxEdge 1280 |
| `video.preview-transcode` | video | MP4 | H.264/main/yuv420p, 720p, 2000kbps, ≤30fps, AAC 128k, faststart |
| `audio.waveform-peaks` | audio | JSON | 1000 bins min/max, normalización peak, mono-mix |
| `audio.preview-stream` | audio | AAC (audio/mp4) | 128k, 44100Hz, 2ch |

Bumpear un valor de perfil = **nueva `profileVersion`** (los records viejos quedan `superseded`, nunca se
reescriben). Bumpear el binario/args de ffmpeg = **nueva `MEDIA_TRANSFORMER_VERSION`**.

**Migración `0029`** (aditiva): `media_derivative_intents` (cola con estado mutable, leases + fencing), y las
tablas **append-only por trigger** `media_derivative_records` (la autoridad de outcome versionada) y
`media_derivative_attempts` (evidencia). Todas con **RLS por `app.workspace_id`** + un carril de scan del worker
(`app.media_derivative_scan`, mismo patrón que la policy `0028` de promotion). `UNIQUE` sobre la tupla de
identidad garantiza un intent/record por identidad.

**Store durable** (`DurableMediaDerivativeStore`): `createIntents` idempotente (`ON CONFLICT DO NOTHING`),
`claimDue` con `FOR UPDATE SKIP LOCKED` + incremento de fencing token, `completeReady`/`fail` bajo fence.

**Command + readers gobernados** (capabilities `globe.media.derivative.read` / `globe.media.derivative.operate`,
coverage de las 8 superficies):
- `globe.media.derivative.request` — encola intents para los perfiles del media type del source; gateado por
  `GLOBE_MEDIA_DERIVATIVES_ENABLED` (fail-closed a `policy_blocked` con el flag OFF); **ownership vía el primitive
  canónico `authorizeOwnedOutput` del retrieval TASK-1503** — cross-workspace, id desconocido, hash-solo-input y
  candidato no retenido colapsan a `not_found`, sin oráculo de storage. La generation del source se resuelve
  **server-side** (`GcsOutputRetrieval.describe`), nunca desde el payload.
- `globe.media.derivative.get` / `.list` — metadata de los records (readers, disponibles para shadow reads con
  el flag OFF).
- `globe.media.derivative.ticket` — minta un media ticket (ver build unit 3).

### 2. Worker de transformación (`apps/media-derivatives`, Cloud Run Job)

Job dedicado, keyless, aislado del web/BFF (ADR-008: el web nunca transforma). Runtime debian con **ffmpeg
pinneado por versión** (`7:7.1.5-0+deb13u1`), el mismo patrón de binario pinneado por SHA que el Job de
asset-governance (ADR-007). Una pasada acotada por ejecución: **enumera workspaces con intents due
(cross-workspace bajo la scan policy) → `claimDue` con lease+fencing → transforma → verifica → settle bajo el
fence**.

- **Source PINNED a la generation de la identidad**: `downloadPinned` exige `generation == identity.sourceObjectGeneration`;
  si el original cambió (drift), es **fallo permanente** (`source_generation_drift`), nunca un re-target silencioso.
- **Planes ffmpeg deterministas por perfil** (`transform.ts`): cada argumento derivado exhaustivamente de los
  params del perfil; los waveform peaks post-procesan el PCM decodificado (min/max por ventana, normalizado
  a [-1,1]). `-map_metadata -1` en todos (strip).
- **Upload content-addressed** al **bucket separado de derivados** (`efeonce-globe-media-derivatives`, nunca junto
  a los originales) con `ifGenerationMatch=0`. **Same-key `412` reconciliado por readback**: nombre = hash + size
  igual ⇒ éxito idempotente; mismatch ⇒ `derivative_integrity_conflict`. Nunca overwrite, nunca retry destructivo.
- **Un record terminal por identidad**: fallos retryables re-encolan con backoff hasta agotar `maxAttempts`;
  después terminalizan `failed`. Señal `globe_media_derivative_failed` (ERROR).

### 3. Range gateway autorizado (`apps/studio-web` `GET /v1/media/:sha256`)

Un **authority gateway, no un byte buffer**. Por cada request: autentica → verifica el **media ticket
principal-bound** → re-corre `authorizeOwnedOutput` **AHORA** → resuelve la representación READY (original o
`profileId@version` derivado) → hace **passthrough de UN Range válido a GCS** y pipea el stream con backpressure.

- **Range real** (`GcsOutputRetrieval.openByteStream`): reenvía el header `Range` a GCS y devuelve `200` (full),
  `206` con `Content-Range`/`Accept-Ranges` exactos (parcial/sufijo), o `416` (insatisfacible). **Sin
  `arrayBuffer`/`Blob`/base64** en ningún path — el tamaño del objeto no determina la memoria del request.
  **Multipart rechazado** (`400`) hasta justificación explícita (ADR-008).
- **Media ticket** (`apps/studio-web/src/media-ticket.ts`): HMAC firmado (no cifrado), TTL 120s, **atado a
  `workspace + experiment + sourceSha256 + representation + disposition + principalId`**. La `representation` pinea
  original vs un derivado exacto (un ticket de poster no puede traer los bytes del original). **NO es un bearer
  autosuficiente**: el gateway requiere que el principal **autenticado** matchee el binding y re-corre ownership.
  Secreto propio `globe-media-ticket-secret` (separado del retrieval grant); el valor nunca se loggea.
- **Headers de serving**: `Content-Type` del objeto real, `Content-Disposition` neutro (`globe-<hash12>.<ext>`,
  sin vendor), `Cache-Control: private, no-store`, `x-content-type-options: nosniff`.
- **Errores honestos** (ADR-008 §4): fallo de storage → `dependency_unavailable` (retryable); representación
  no-lista (`MediaDerivativeNotReadyError`) → `dependency_unavailable`; nunca `internal_error` ni un 200 vacío.
- El mint del ticket es un **reader gobernado** (`globe.media.derivative.ticket`), así que UI/SDK/CLI comparten el
  mismo primitive; el BFF reenvía `x-globe-media-ticket`.

## Boundaries (ADR-008, Owns / Must-not-own aplicado)

| Componente | Owns | Must NOT own |
|---|---|---|
| Producer/domain + Postgres | intents/records, feed policy state | bytes de media, provider URLs |
| Worker de derivados (`apps/media-derivatives`) | transformaciones deterministas + evidencia | eligibility, membership, delete (GC = 1529) |
| Gateway (`api` en `apps/studio-web`) | autorización ticket/sesión, selección de representación, streaming headers/backpressure | buffering full-object o transformación |
| GCS `efeonce-globe-media-derivatives` (privado, versionado) | derivados content-addressed | decisiones de ownership/tenancy |

El worker tiene storage **get/create sin delete** a propósito (el delete guarded es TASK-1529); el gateway
(`api_runtime`) tiene **read-only** sobre el bucket de derivados.

## Rollout / flags / observabilidad

- Flags (Terraform `infra/terraform/media_derivatives.tf`, defaults ON en git tras el canary):
  `GLOBE_MEDIA_DERIVATIVES_ENABLED` (request command + worker), `GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` (serving).
  Rollback: cada default a `false` + apply; el original nunca se toca.
- Señales: `globe_media_derivative_failures` (ERROR), `globe_media_derivative_queue_oldest_age_seconds`
  (WARNING >900s, medida post-batch sobre intents due).
- Job `globe-media-derivatives` + Scheduler `*/2`; migración `0029` aplicada; grants DB del worker DML-only
  (readback `ready:true`); secreto del ticket en Secret Manager con accessor solo a `api_runtime`.

## Evidencia de canary (internal-only, 2026-07-24)

Con assets reales del workspace `greenhouse-org:efeonce`:
- Request de las 3 modalidades → 6 intents; worker (2 ticks) → **6 ready / 0 failed** con dims correctas
  (thumb 512×288, preview 1600×900, poster 1280×720, transcode 1280×720/4033ms, audio 6269ms, waveform JSON).
- Gateway (video transcode): full `200` (920832 bytes streamed), partial `206` `bytes 0-1023/920832`, suffix
  `206` `bytes 920332-920831/920832`, unsatisfiable `416`, multipart `400`. image thumb y audio preview: `200`.
- Negativos: representación manipulada / experiment manipulado / ticket forjado → `403`; representación
  no-lista → `503 dependency_unavailable`.
- Idempotencia: re-run del worker `claimed=0`; **6 intents / 6 records / 6 attempts** (un record terminal por
  identidad, cero duplicados).

## Fuera de scope (declarado)

- Consumo de previews por el feed/viewer de la UI → TASK-1526.
- Orphan inventory + mark-and-sweep GC (con generation-precondition, derivados antes que originales) → TASK-1529
  (desbloqueada por esta spec: ya existen los records persistidos y el bucket separado).
- Edge caching / CDN / HLS-DASH / multi-región / signed URLs durables → requieren ADR posterior (ADR-008 §alt).
- Habilitación comercial / clientes externos → gate TASK-1480.

## Código fuente (en `efeonce-globe`)

- Contrato: `packages/contracts/src/media-derivatives.ts` · Dominio: `packages/domain/src/media-derivatives.ts`
- Store + migración: `packages/database/src/stores/media-derivative-store.ts`, `migrations/0029_media_derivatives.sql`
- Worker: `apps/media-derivatives/src/{config,gcs,transform,worker,main}.ts` · Dockerfile con ffmpeg pinneado
- Gateway + ticket: `apps/studio-web/src/app.ts` (`serveMedia`, ruta `/v1/media/`), `apps/studio-web/src/media-ticket.ts`
- IaC: `infra/terraform/media_derivatives.tf` · SDK: `packages/sdk/src/index.ts`
- Runbook operable: [`docs/manual-de-uso/creative-studio/operar-media-derivatives-globe.md`](../../manual-de-uso/creative-studio/operar-media-derivatives-globe.md)
- Funcional: [`docs/documentation/creative-studio/efeonce-globe-media-derivatives.md`](../../documentation/creative-studio/efeonce-globe-media-derivatives.md)
