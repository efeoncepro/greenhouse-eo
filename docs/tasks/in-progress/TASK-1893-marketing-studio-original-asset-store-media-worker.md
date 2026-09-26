# TASK-1893 — Marketing Studio: almacén de originales en GCS y worker de medios

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-25

- Las renditions ya no se sirven por `/api/v1/renditions/{id}` en la web: los readers devuelven enlaces firmados HMAC `/api/v1/media/{token}` (`STUDIO_MEDIA_URL_SECRET`, vida de una a dos semanas) que se sirven desde el bucket **sin consultar Postgres** (incidente `too many connections for role` del 2026-09-25, `packages/domain/src/media-url.ts`). `/renditions/{id}` queda como compatibilidad y exclusión del manifiesto. Esos enlaces NO son el modelo de la descarga de originales de esta task (URL firmada V4 de GCS, vida ≤ 15 min, emitida y auditada por el dominio): no reutilizar `media-url.ts` para originales. Si el worker cambia el nombre de objeto de las renditions, debe conservar el prefijo `renditions/`, que el endpoint exige.
- TASK-1890 ya está en `in-progress` (code complete): el bearer existe y hoy `API_SCOPES = ['studio:read']`. `studio.asset.download` se declara en `packages/contracts/src/operations.ts` (tool o exclusión con razón) + `pnpm mcp:manifest:generate`; el test de paridad handlers ↔ registro falla si falta. El scope nuevo se agrega a `API_SCOPES` en `packages/domain/src/auth/api-client.ts`.

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-marketing-studio main (código, migraciones, worker) · Greenhouse develop (capability, docs); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Studio pasa a guardar una copia gobernada de los **finales aprobados** de cada campaña (imagen, video, audio y PDF
final) en un bucket GCS privado con versionado, direccionado por sha256 y deduplicado, en paralelo a OneDrive. Agrega
la ingesta idempotente `pnpm media:ingest` desde OneDrive, la descarga autorizada por URL firmada V4 de vida corta,
metadatos de derechos de uso por versión y un worker de Cloud Run que genera renditions, portadas de video y recortes
por formato al llegar una versión nueva, y lee de Metricool la evidencia de publicación de los posts programados.

## Why This Task Exists

Hoy Studio sólo conoce **dónde está** cada original: `asset_version.storage_provider = 'onedrive_provenance'` con una
ruta relativa a `Alineación/5. Contenidos` y su sha256. Los bytes viven únicamente en el OneDrive montado en el equipo
del operador. Eso deja cuatro huecos reales:

- **Ningún proceso de servidor puede leer un original.** Las renditions se generaron a mano desde el equipo del
  operador (`scripts/media-renditions.ts`, TASK-1887); un worker en Cloud Run, un agente por MCP o una persona sin el
  mount no tienen acceso a la pieza final.
- **No hay descarga gobernada.** Compartir un final hoy significa un enlace de OneDrive fuera de Studio, sin
  auditoría, sin vencimiento y sin relación con la versión aprobada.
- **Los derechos de uso no existen como dato.** Un agente o una persona puede reutilizar una pieza con talento, stock
  o música cuya licencia ya venció, porque nada lo registra ni lo expone.
- **"Programado" no es "publicado".** `studio.scheduled_post` guarda lo que se agendó en Metricool y un readback
  importado a mano desde un JSON; no existe lectura periódica de la evidencia de publicación.

El operador decidió (2026-09-25) un bucket GCS **en paralelo** a OneDrive: OneDrive sigue siendo el espacio de trabajo
del equipo hasta el corte de autoridad (`TASK-1894`), y a GCS sólo van finales y versiones aprobadas, nunca archivos
de trabajo (PSD, AEP, AI, INDD, proyectos de edición). El ADR API-first exige que el trabajo asíncrono (derivados de
media, readback de Metricool) corra en Cloud Run con Cloud Scheduler, nunca en Vercel.

## Goal

- Cada versión aprobada registrada en el catálogo tiene su original en GCS, verificado por sha256 y crc32c, sin duplicar bytes idénticos.
- Un cliente autorizado obtiene una URL firmada de vida corta para descargar una versión concreta, con su estado de derechos, y la emisión queda auditada.
- Cada versión nueva en GCS recibe sus derivados (thumb, preview, portada de video, recortes por formato) sin intervención manual, y un barrido programado repara los faltantes.
- Los posts programados reciben evidencia de publicación observada en Metricool, sin inferirla por la hora.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§2 topología con `apps/worker` futuro, §3 modelo, §6 persistencia y SA por ambiente, §7 import y corte de autoridad, §7.1 renditions)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (§trabajo asíncrono en Cloud Run + Scheduler; adapters de proveedor en Studio)
- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (SA `marketing-studio-runtime@` / `-stg@`, WIF, buckets de media)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability nueva con grant)
- `docs/tasks/complete/TASK-1890-marketing-studio-agent-ready-contract.md` (manifiesto de tools y bearer de servicio)

Reglas obligatorias:

- **Almacenar ≠ ser la autoridad.** Hasta `TASK-1894`, OneDrive es la fuente y GCS es una copia verificada de finales aprobados. Esta task nunca crea una versión que no exista en el catálogo importado ni escribe hacia OneDrive.
- **Sólo finales aprobados.** La ingesta lee exclusivamente las versiones registradas en `studio.asset_version`; nunca recorre carpetas. Allowlist de tipos y deny-list de formatos de trabajo como defensa en profundidad.
- **Nunca un objeto público.** Public access prevention `enforced`, acceso uniforme, cero bindings a `allUsers`/`allAuthenticatedUsers`. Las URLs firmadas se emiten server-side con vida ≤ 15 min y la web jamás expone el nombre del bucket ni la ruta del objeto.
- **Inmutabilidad por contenido.** El nombre del objeto se deriva del sha256; toda subida usa `ifGenerationMatch=0`. Un objeto existente nunca se sobrescribe.
- **Trabajo asíncrono sólo en Cloud Run.** Nada del worker ni del readback corre en funciones de Vercel ni en Vercel cron.
- **Programado ≠ publicado.** La evidencia de publicación sólo sale de una observación del proveedor; nunca de `scheduled_at <= now()`.
- **Toda capacidad nueva nace en el manifiesto de tools** (`TASK-1890`) con su tool o una exclusión con razón.
- Migraciones SQL-first en el repo de Studio (node-pg-migrate) con `-- Up Migration` / `-- Down Migration` y bloque `DO … RAISE EXCEPTION` post-DDL; sólo expand.

## Normative Docs

- `AGENTS.md` y `CLAUDE.md` del repo `efeonce-marketing-studio` (capas, gates `absolute-path-gate` y `domain-boundary-gate`).
- Skills `gcp-cloud-run`, `gcp-scheduler-tasks`, `google-cloud-waf-security` y `google-cloud-waf-cost-optimization` para el diseño de worker, IAM y costo; `greenhouse-secret-hygiene` para el token de Metricool.
- Lecciones de Cloud Run de Greenhouse: `deploy.sh` es la fuente de verdad de las env vars (un `--set-env-vars` borra lo agregado fuera de banda).

## Dependencies & Impact

### Depends on

- `TASK-1887` (complete): Studio en producción, `studio.asset_version` con `sha256`, `studio.asset_rendition`, buckets de media, SA por ambiente y WIF.
- `TASK-1890` (to-do, **dependencia blanda**): manifiesto de tools y bearer de `api_client`. Puede correr en paralelo; la que llegue segunda agrega la entrada `studio.asset.download` al manifiesto y el scope `studio:assets:download` al bearer en el mismo PR. Si esta task llega primero, el endpoint se construye y se prueba pero `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` no se prende en ningún ambiente hasta que exista el bearer de 1890 (sin él no hay actor autorizado), y el test de paridad de 1890 exigirá la tool al aterrizar.
- Acceso de API de Metricool (token de usuario, `userId`, `blogId`) `[verificar]` plan vigente y credencial de servidor: hoy el readback se importa a mano desde un JSON.

### Blocks / Impacts

- `TASK-1894` (corte de autoridad): hereda el almacén, el `media_object` y la descarga; allí nacen la URL firmada de subida y la versión creada desde Studio.
- `TASK-1895` (UI): consume descarga, estado de derechos, portadas, recortes y evidencia de publicación.
- `TASK-1891` (federación MCP): publica `studio.asset.download` si la entrada ya existe en el manifiesto.
- `TASK-1896` (observabilidad): consume `studio.worker_run` y las señales del worker.
- `TASK-1898` (login): habilita la descarga desde la web para personas; hasta entonces sólo `api_client`.

### Files owned

- Repo Studio: `packages/database/migrations/*media-originals*`, `packages/database/src/storage.ts`, `packages/database/src/schema.ts`, `packages/domain/src/media/**`, `packages/domain/src/rights/**`, `packages/contracts/src/**` (DTO de versión, derechos, descarga, evidencia de publicación, entrada del manifiesto), `apps/web/src/app/api/v1/assets/**/download/**`, `apps/worker/**`, `scripts/media-ingest.ts`, `scripts/media-rights.ts`, `scripts/media-renditions.ts`, `scripts/import-catalog.ts` (guarda contra degradar versiones GCS), `infra/marketing-studio-media/**` `[verificar ubicación de infraestructura como código en el repo]`
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/*marketing-studio-asset-download-capability*`, `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`, `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`

## Current Repo State

### Already exists

- `studio.asset_version` (`packages/database/migrations/1758800000000_studio-foundation.sql`): `storage_provider IN ('onedrive_provenance','gcs')`, `storage_path`, `byte_size`, `sha256`, `width_px`, `height_px`, `provenance jsonb`; índice único `(asset_id, sha256)`.
- `studio.asset` con `kind IN ('image','video')` y `aspect_ratio` real por pieza.
- `studio.asset_rendition` (`1758830000000_asset-renditions.sql`): `kind IN ('thumb','preview')`, bucket, objeto, mime, tamaño, dimensiones, `source_sha256`.
- `packages/database/src/storage.ts`: `readObject` y `uploadObjectIfAbsent` sobre GCS.
- `scripts/media-renditions.ts` (`pnpm media:renditions`): thumb 640 px y preview 1600 px WebP con `sharp`, cuadro del segundo 1 con ffmpeg para video, subida `ifGenerationMatch=0`, idempotente; se corre desde el equipo del operador.
- `GET /api/v1/renditions/{id}` sirve derivados sin exponer GCS.
- `studio.scheduled_post` (proveedor `metricool`, `provider_status`, `observed_at`, `observation_source`) y readback importado desde JSON por `import:catalog --readback`.
- Buckets `efeonce-marketing-studio-media` / `-staging` (us-east4, privados, acceso uniforme); SA `marketing-studio-runtime@` / `-stg@` impersonadas por WIF desde Vercel.
- `studio.import_run` y `studio.audit_event` (el rol runtime no tiene `UPDATE/DELETE` sobre la auditoría).

### Gap

- No existe bucket de originales ni tabla de objetos por contenido; ninguna versión tiene `storage_provider = 'gcs'`.
- No hay ingesta de originales ni verificación de integridad contra el sha256 del catálogo.
- No hay descarga de originales ni auditoría de su emisión.
- `asset.kind` no admite audio ni PDF final; no hay mime, duración ni número de páginas por versión.
- No hay metadatos de derechos (licencia, ventana de uso, vencimiento).
- No existe `apps/worker`, ni notificación GCS → Pub/Sub, ni Cloud Scheduler, ni registro de corridas del worker.
- No hay portadas de video a resolución completa ni recortes por formato.
- No hay readback programado de Metricool ni historial de observaciones de publicación.
- `import:catalog` no sabe que una versión puede estar ya en GCS: un reimport podría devolverla a `onedrive_provenance`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio: packages/domain/src/media y rights (primitives), packages/database (storage y migraciones), apps/web (ruta de descarga), apps/worker nuevo (Cloud Run), scripts (CLI de ingesta y derechos); Greenhouse sólo capability y docs`
- Future candidate home: `worker`
- Boundary: `packages/domain/src/media expone ingestOriginal, issueOriginalDownload, generateDerivatives y recordPostObservation; la ruta /api/v1, la CLI y el worker son adapters que los llaman; el SDK de GCS y el cliente de Metricool viven detrás de adapters en packages/database y packages/domain/src/providers`
- Server/browser split: `el trabajo es sólo server-side; el navegador sólo recibe el DTO de descarga (URL firmada, vencimiento, tamaño, mime, estado de derechos) y nunca el bucket ni la ruta del objeto`
- Build impact: `apps/worker agrega imagen de contenedor con ffmpeg y sharp; apps/web no suma dependencias pesadas (la firma V4 usa el SDK de GCS ya presente vía IAM signBlob)`
- Extraction blocker: `none — el worker comparte base y dominio por paquete, sin transacciones cruzadas con la web`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `studio.asset_version (ubicación del original), studio.media_object nueva (bytes por sha256), studio.asset_rendition (derivados), studio.post_observation nueva (evidencia de publicación), buckets efeonce-marketing-studio-originals / -staging`
- Consumidores afectados: `web de Studio, API /api/v1, CLI, worker Cloud Run, gateway Efeonce MCP (TASK-1891), futura UI (TASK-1895)`
- Runtime target: `staging y producción de Studio (Vercel) + Cloud Run us-east4 + Cloud Scheduler + Pub/Sub`

### Contract surface

- Contrato existente a respetar: `OpenAPI v1 de Studio; DTO de pieza y versiones; GET /api/v1/renditions/{id}; contrato de error { error, code, actionable }; manifiesto de tools de TASK-1890`
- Contrato nuevo o modificado: `GET /api/v1/assets/{assetId}/versions/{versionNo}/download; campos nuevos en el DTO de versión (mimeType, byteSize, durationMs, pageCount, storage.available, rights); campos de evidencia de publicación en el DTO de post; tool studio.asset.download; endpoints internos del worker (/events/original-finalized, /jobs/reconcile-derivatives, /jobs/metricool-readback) fuera de /api/v1`
- Backward compatibility: `compatible — campos y rutas nuevas; valores nuevos en enums de asset.kind y rendition.kind se documentan como extensibles en el contrato`
- Full API parity: `ingesta y derechos son commands del dominio con CLI; descarga es reader con API y tool; el worker invoca los mismos primitives; la escritura de derechos por API nace con los commands de TASK-1894`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.media_object (nueva), studio.asset_version (columnas nuevas), studio.asset (kind), studio.asset_rendition (kind), studio.post_observation (nueva), studio.worker_run (nueva), studio.scheduled_post (estado observado), studio.audit_event`
- Invariantes que no se pueden romper:
  - Un original en GCS vive en `originals/sha256/<2 primeros hex>/<sha256>` y nunca se sobrescribe (`ifGenerationMatch=0`); bytes idénticos = un solo objeto, aunque los usen varias versiones o campañas.
  - La ingesta sólo acepta un archivo cuyo sha256 calculado coincide con `asset_version.sha256`; un desajuste aborta esa versión y la reporta como deriva, sin tocar la fila.
  - `asset_version.storage_provider = 'gcs'` si y sólo si `media_object_sha256` apunta a una fila de `studio.media_object` del bucket del ambiente; la ruta de OneDrive se conserva en `provenance.onedrive_path`.
  - `import:catalog` nunca degrada una versión `gcs` a `onedrive_provenance` ni cambia sus campos de almacenamiento.
  - Allowlist de mime de originales: `image/png`, `image/jpeg`, `image/webp`, `video/mp4`, `video/quicktime`, `audio/mpeg`, `audio/wav`, `audio/aac`, `application/pdf`; los formatos de trabajo (PSD, AEP, AI, INDD, PRPROJ, ZIP) se rechazan por extensión y por firma de bytes.
  - La URL firmada vence en ≤ 15 min, lleva `Content-Disposition: attachment` con un nombre legible y cada emisión escribe `audit_event`.
  - El actor anónimo del modo `open` nunca obtiene una URL de descarga de un original.
  - El estado de derechos se calcula al leer (zona `America/Santiago`): `unknown` sin licencia registrada, `not_yet_valid`, `active` o `expired`; ninguna respuesta omite el estado.
  - Los recortes por formato son derivados marcados como automáticos: nunca se convierten en `asset_version` ni cuentan como pieza aprobada.
  - `studio.post_observation` es append-only; un post sólo pasa a publicado con una observación del proveedor que lo diga.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura; el domain-boundary-gate del repo se extiende para impedir que apps/web importe el cliente de Metricool o el adapter de escritura de GCS`
- Tenant/space boundary: `visibilidad por organización de la campaña de la pieza; api_client ∩ organizationId (TASK-1890); fuera de la visibilidad del actor, 404 anti-oráculo`
- Idempotency/concurrency: `ingesta idempotente por sha256 + ifGenerationMatch=0 (412 = objeto ya presente, se verifica tamaño y crc32c y se trata como dedup); actualización de asset_version en transacción con guarda de estado previo; derivados únicos por (asset_version_id, kind); Pub/Sub con entrega al menos una vez y handler idempotente; observaciones únicas por (post_id, payload_digest)`
- Audit/outbox/history: `audit_event por ingesta aplicada, emisión de descarga y cambio de derechos; studio.worker_run por corrida (evento, barrido, readback) con conteos y error sanitizado; post_observation como historial de publicación`

### Migration, backfill and rollout

- Migration posture: `additive (tablas y columnas nuevas; valores nuevos en CHECK de asset.kind y asset_rendition.kind; CHECK de coherencia gcs ↔ media_object en NOT VALID + VALIDATE)`
- Default state: `descarga apagada (STUDIO_ORIGINAL_DOWNLOADS_ENABLED=false); worker desplegado con MEDIA_WORKER_DERIVATIVES_ENABLED=false y MEDIA_WORKER_METRICOOL_READBACK_ENABLED=false; notificación GCS y jobs de Scheduler creados en pausa`
- Backfill plan: `pnpm media:ingest en dry-run por defecto; apply en staging con --campaign CMP-004 como allowlist, luego staging completo, luego producción por campaña; lotes acotados y reanudables porque cada versión es independiente`
- Rollback path: `flags a false; pausar jobs y borrar la notificación del bucket; pnpm media:ingest --revert-provider devuelve las versiones a onedrive_provenance desde provenance.onedrive_path; los objetos quedan en el bucket (no se borran); migración down sólo si ninguna versión quedó en gcs`
- External coordination: `crear buckets, tópicos, suscripciones, Cloud Run y Scheduler en efeonce-group con aprobación del operador; secreto marketing-studio-metricool-api-token como scalar crudo; release de Greenhouse para la capability`

### Security and access

- Auth/access gate: `descarga: api_client con scope studio:assets:download + visibilidad por organización; capability Greenhouse marketing_studio.asset.download para la persona detrás del gateway (TASK-1891); worker: Cloud Run sin acceso público, run.invoker sólo para las SA de Pub/Sub y Scheduler con token OIDC`
- Sensitive data posture: `creatividades finales con talento, marcas de clientes y copys (sensibilidad comercial); sin PII personal salvo rostros en piezas; token de Metricool como secreto`
- Error contract: `{ error (es), code, actionable }`: original_not_stored (404, no actionable), download_disabled (403), rights_unknown no bloquea pero viaja en el DTO; errores del worker sanitizados en worker_run sin cuerpos de proveedor
- Abuse/rate-limit posture: `URL de vida corta; auditoría por emisión; max instances del worker acotado; readback con backoff ante 429 de Metricool; DLQ para eventos que fallan 5 veces`

### Runtime evidence

- Local checks: `pnpm check en Studio (tests de dominio de ingesta, derechos, descarga, derivados, readback y guarda del importador; paridad del manifiesto cuando TASK-1890 exista)`
- DB/runtime checks: `SELECT storage_provider, count(*) FROM studio.asset_version GROUP BY 1 en ambas bases; conteo de media_object vs sha256 distintos; asset_rendition por kind; worker_run recientes`
- Integration checks: `gcloud storage buckets describe (PAP enforced, UBLA, versionado, soft delete, lifecycle); gsutil/gcloud objects describe con metadata sha256 y crc32c; curl de descarga 200/403/404; subida de prueba en staging que dispara derivados; readback contra un post real`
- Reliability signals/logs: `logs estructurados del worker con correlationId; worker_run con estado; mensajes en la DLQ (debe ser 0)`
- Production verification sequence: `ver Rollout Plan`

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain/src/media` y `rights`, no en handlers, scripts ni en el worker.
- [ ] Ingesta y derechos modelados como commands con auditoría e idempotencia; descarga como reader con autorización por scope, organización y capability.
- [ ] Capability `marketing_studio.asset.download` + grant a ≥1 rol real en el mismo commit de Greenhouse.
- [ ] Camino programático declarado: `/api/v1` + tool `studio.asset.download`; CLI para ingesta y derechos; API de escritura de derechos en TASK-1894.
- [ ] Un primitive, muchos consumers: web, CLI, worker y MCP usan los mismos primitives.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Infraestructura de almacenamiento e IAM

- Buckets `efeonce-marketing-studio-originals` y `efeonce-marketing-studio-originals-staging` en `us-east4`, clase Standard, acceso uniforme, public access prevention `enforced`, versionado de objetos, soft delete de 30 días, labels `app=marketing-studio,env=<env>`, sin política de retención bloqueada.
- Lifecycle: objetos no vigentes se borran 30 días después de dejar de serlo; transición a Nearline con `daysSinceCustomTime > 30` y a Coldline con `daysSinceCustomTime > 365` (el `customTime` sólo se fija cuando todas las campañas que usan ese sha256 están cerradas; ver Detailed Spec).
- Service accounts nuevas y bindings mínimos según la matriz IAM del Detailed Spec; la SA de Vercel gana sólo lectura de originales y `signBlob` sobre sí misma.
- Infraestructura declarada en un script versionado e idempotente del repo de Studio (fuente de verdad), no con clicks.

### Slice 2 — Modelo de datos (expand)

- Migración Studio: `studio.media_object`, columnas nuevas de `asset_version`, valores nuevos en `asset.kind` y `asset_rendition.kind`, `studio.post_observation`, `studio.worker_run`, grants al rol runtime (sin `UPDATE/DELETE` sobre `post_observation`), bloque `DO … RAISE EXCEPTION`.
- Aplicada en `marketing_studio_staging` y `marketing_studio`; tipos Kysely regenerados en `schema.ts`.
- Contratos zod: DTO de versión con `mimeType`, `byteSize`, `durationMs`, `pageCount`, `storage.available`, `rights { status, licenseKind, usageStartsOn, usageEndsOn, territories, channels }`; DTO de post con evidencia de publicación.

### Slice 3 — Ingesta de originales

- Primitive `ingestOriginal` en `packages/domain/src/media` y CLI `pnpm media:ingest --root <5. Contenidos> [--campaign CMP-###] [--apply] [--revert-provider]`: dry-run por defecto con conteos `to_upload`, `dedup`, `already_gcs`, `drift`, `rejected`, `missing_local`.
- Por versión: sha256 y crc32c locales → comparar con el catálogo → validar tipo → subir con `ifGenerationMatch=0` y metadata `sha256` → verificar crc32c devuelto → transacción que hace upsert de `media_object`, actualiza `asset_version` y escribe `audit_event`.
- Extracción de metadatos: dimensiones (imagen/video), duración (video/audio), páginas (PDF) con ffprobe/sharp/lector de PDF.
- `import:catalog` respeta las versiones en `gcs` (test que lo prueba).

### Slice 4 — Descarga autorizada y derechos

- Reader `issueOriginalDownload` + `GET /api/v1/assets/{assetId}/versions/{versionNo}/download` → JSON `{ url, expiresAt, filename, mimeType, byteSize, sha256, rights }`; URL V4 firmada por IAM signBlob (sin claves JSON), vida 10 min, `response-content-disposition` con nombre `<assetId>-v<n>.<ext>`.
- Gate: flag `STUDIO_ORIGINAL_DOWNLOADS_ENABLED`, actor `api_client` con scope `studio:assets:download` (el actor anónimo recibe 403 `download_disabled`), visibilidad por organización (404 anti-oráculo), versión en `gcs` (si no, 404 `original_not_stored`).
- Command `setAssetVersionRights` + CLI `pnpm media:rights --asset <id> --version <n> --license <kind> [--reference] [--from] [--until] [--territory] [--channel]` con `audit_event`; cálculo de `rights.status` en el reader.
- Entrada `studio.asset.download` en el manifiesto de tools (si TASK-1890 ya aterrizó; si no, queda anotada para su test de paridad) y scope nuevo del `api_client`.
- Greenhouse: capability `marketing_studio.asset.download` en `entitlements-catalog.ts` + seed en `capabilities_registry` + grant a roles internos reales verificados contra `src/config/role-codes.ts`.

### Slice 5 — Worker de medios en Cloud Run

- `apps/worker` (Node 24, Hono o `node:http` `[decidir en Discovery]`) con imagen que incluye ffmpeg/ffprobe y sharp; reutiliza `@studio/domain` y `@studio/database`; pool PG `max = 2`; `Dockerfile` y `deploy.sh` como fuente de verdad de env vars.
- Servicios `marketing-studio-media-worker` y `marketing-studio-media-worker-staging` en `us-east4`: sin acceso público, `--min-instances 0`, `--max-instances 3`, concurrencia 1, 2 vCPU / 2 GiB, timeout 900 s.
- Endpoint `/events/original-finalized` (push de Pub/Sub con OIDC): resuelve el sha256 del objeto → `media_object` → versiones que lo usan → `generateDerivatives`. Si la fila aún no existe (ingesta en curso), responde error para reintento con backoff.
- `generateDerivatives`: `thumb` 640 px y `preview` 1600 px (se porta la lógica de `media-renditions.ts` al dominio y el script pasa a ser un adapter), `poster` de video a resolución completa en el cuadro configurado (por defecto 1 s), y recortes `crop_1x1`, `crop_4x5`, `crop_9x16`, `crop_16x9` sólo para formatos que el concepto no tiene como pieza real, al bucket de media existente con `ifGenerationMatch=0`.
- Notificación GCS `OBJECT_FINALIZE` del bucket de originales → tópico `marketing-studio-originals-finalized` → suscripción push con ack deadline 600 s, reintento exponencial y DLQ `marketing-studio-originals-finalized-dlq` tras 5 intentos.
- Job de Scheduler `marketing-studio-reconcile-derivatives` (cada hora) → `/jobs/reconcile-derivatives`: repara versiones `gcs` sin derivados y fija `customTime` de objetos cuyas campañas cerraron.
- Cada corrida escribe `studio.worker_run`.

### Slice 6 — Readback de Metricool

- Adapter `packages/domain/src/providers/metricool` (sólo server-side, token desde Secret Manager) y primitive `recordPostObservation`.
- Job de Scheduler `marketing-studio-metricool-readback` (cada 30 min) → `/jobs/metricool-readback`: posts con `scheduled_at` en las últimas 72 h o sin estado terminal; consulta el estado real, agrega `post_observation` (estado, `published_at`, permalink, error) y actualiza `provider_status`, `observed_at` y `observation_source = 'metricool_api'` de `scheduled_post`.
- **Condición de división:** si en Discovery no existe acceso de API de Metricool para la cuenta, este slice sale a una task hija con la evidencia, y la task cierra con los slices 1–5 y 7.

### Slice 7 — Rollout y documentación

- Staging → producción según la secuencia del Rollout Plan; flags prendidos por ambiente con evidencia.
- Arquitectura de Studio (§3 modelo, §6 SA y buckets, §7 corte, §7.1 renditions, nueva §7.2 originales y worker), runbook con recursos, comandos, flags y rollback; Handoff y changelog; EPIC-049.

## Out of Scope

- URL firmada de **subida**, creación de versiones desde Studio y cualquier escritura que haga de Studio la fuente: pertenece a `TASK-1894` (corte de autoridad). Decisión explícita: subir un original sin su contraparte en OneDrive antes del corte crearía una versión con dos verdades.
- Botón de descarga o subida en la web y avisos visuales de derechos (`TASK-1895`); la web no expone descarga hasta el login (`TASK-1898`).
- API de escritura de derechos (nace con los commands de `TASK-1894`; aquí sólo CLI).
- Métricas de desempeño de posts (alcance, engagement) desde Metricool; aquí sólo evidencia de publicación.
- Publicación programada desde Studio hacia Metricool.
- Derivados de audio (forma de onda) y de PDF (miniatura de página): follow-up.
- Borrado de originales por API, CDN o caché pública.
- Sentry, alertas y señales de frescura del worker (`TASK-1896`).

## Detailed Spec

### Esquema (propuesto; el agente confirma nombres en Discovery)

```sql
-- Up Migration
CREATE TABLE studio.media_object (
  sha256          text PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket  text NOT NULL,
  object_name     text NOT NULL,
  generation      bigint NOT NULL,
  crc32c          text NOT NULL,
  byte_size       bigint NOT NULL CHECK (byte_size > 0),
  mime_type       text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp','video/mp4',
                    'video/quicktime','audio/mpeg','audio/wav','audio/aac','application/pdf')),
  width_px        integer, height_px integer, duration_ms integer, page_count integer,
  custom_time     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, object_name)
);
ALTER TABLE studio.asset_version
  ADD COLUMN media_object_sha256   text REFERENCES studio.media_object (sha256),
  ADD COLUMN rights_license_kind   text CHECK (rights_license_kind IN
             ('owned','client_supplied','stock','talent','music','ai_generated','mixed')),
  ADD COLUMN rights_reference      text,
  ADD COLUMN rights_usage_starts_on date,
  ADD COLUMN rights_usage_ends_on   date,
  ADD COLUMN rights_territories    text[],
  ADD COLUMN rights_channels       text[],
  ADD COLUMN rights_recorded_at    timestamptz;
-- coherencia gcs ↔ media_object (NOT VALID + VALIDATE), ventana de derechos válida,
-- asset.kind += 'audio','document'; asset_rendition.kind += 'poster','crop_1x1','crop_4x5','crop_9x16','crop_16x9'
CREATE TABLE studio.post_observation (...);  -- append-only, UNIQUE (post_id, payload_digest)
CREATE TABLE studio.worker_run (...);        -- job, trigger, started_at, finished_at, status, counts jsonb, error_code
```

### Matriz IAM (mínimo privilegio)

| Service account | Uso | Permisos |
|---|---|---|
| `marketing-studio-runtime@` / `-stg@` (Vercel, existentes) | firmar descargas | `storage.objectViewer` en el bucket de originales de su ambiente; `iam.serviceAccountTokenCreator` sobre sí misma (signBlob) |
| `marketing-studio-ingest@` / `-ingest-stg@` (nuevas; el operador las impersona para la CLI) | ingesta | `storage.objectCreator` (sin delete) + `objectViewer` en originales de su ambiente; `cloudsql.client`; secreto PG de su ambiente |
| `marketing-studio-worker@` / `-worker-stg@` (nuevas) | derivados y readback | `objectViewer` en originales, `objectCreator` + `objectViewer` en media; `cloudsql.client`; secreto PG de su ambiente; secreto de Metricool sólo en producción `[verificar si staging lee Metricool]` |
| `marketing-studio-invoker@` (nueva) | Pub/Sub push y Scheduler | `run.invoker` sobre los dos servicios del worker |
| Agente de servicio de Cloud Storage | notificación | `pubsub.publisher` sobre el tópico |

Ninguna SA tiene `storage.objectAdmin`, `storage.admin` ni permisos a nivel de proyecto sobre Storage; las SA de staging no alcanzan recursos de producción.

### `customTime` y clases de almacenamiento

Como un sha256 puede estar en varias campañas, el barrido fija `media_object.custom_time` (y el `customTime` del objeto) sólo cuando **todas** las versiones que lo usan pertenecen a campañas cerradas, con la fecha de cierre más reciente. Si una campaña se reabre o un final cerrado se reutiliza, el objeto se reescribe a Standard (`rewrite` de clase) y se limpia `custom_time`. Coldline cobra recuperación: la respuesta de descarga no cambia, pero el runbook lo documenta.

### Estimación de costo (orden de magnitud; validar con la calculadora de GCP y el billing export)

| Concepto | Supuesto | Costo mensual aprox. |
|---|---|---|
| Originales Standard | 50 GB activos (54 piezas hoy, video dominante) | ~USD 1,2 |
| Nearline / Coldline | 100 GB de campañas cerradas | ~USD 0,7–1,3 |
| Soft delete y versiones no vigentes | < 5 % del volumen | < USD 0,2 |
| Cloud Run (escala a cero) | ~200 eventos/mes × 30 s + 720 barridos cortos | < USD 3 |
| Pub/Sub + Scheduler | 3 jobs, volumen mínimo | ~USD 0,3 |
| Salida por descargas | 20 GB/mes a internet | ~USD 2,4 |

Total esperado < USD 10/mes; el disparador de revisión es > USD 25/mes en el billing export (en CLP).

### Tool del manifiesto

| Operación | Tool | Clase | Notas para el agente |
|---|---|---|---|
| `GET /api/v1/assets/{assetId}/versions/{versionNo}/download` | `studio.asset.download` | read | Devuelve una URL que vence en 10 min, no el archivo. Siempre informa `rights.status`: con `expired` o `unknown` el agente no propone reutilizar la pieza. `404 original_not_stored` significa que la versión aún vive sólo en OneDrive. |

Los endpoints del worker no forman parte de `/api/v1` ni del OpenAPI; se documentan como exclusión razonada (operacionales, invocados sólo por Pub/Sub y Scheduler).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (la ingesta necesita bucket, IAM y esquema).
- Slice 4 después de Slice 3 (no hay qué descargar sin originales en GCS).
- Slice 5 después de Slice 3; puede correr en paralelo a Slice 4.
- Slice 6 después de Slice 5 (reutiliza worker, `worker_run` y Scheduler). El operador confirmó el 2026-09-25 que hay API de Metricool en el plan; se mantiene en esta task.
- Slice 7 al final. La notificación GCS se activa **después** de desplegar el worker, nunca antes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un archivo de trabajo (PSD, AEP) o una versión no aprobada llega al bucket | data | low | la ingesta sólo lee versiones del catálogo; allowlist de mime + firma de bytes; dry-run obligatorio con reporte `rejected` | conteo `rejected` > 0 en el reporte |
| Un original queda accesible públicamente | cloud | low | PAP `enforced`, UBLA, sin `allUsers`; URL de 10 min; anónimo sin descarga | verificación de `gcloud storage buckets describe` en el runbook; auditoría de emisiones |
| El archivo local no coincide con el sha256 del catálogo | data | medium | la versión se aborta como `drift`; nunca se reescribe la fila | conteo `drift` en el reporte y en `worker_run` |
| Un reimport del catálogo devuelve versiones a OneDrive | data | medium | guarda en `import:catalog` + test | test de dominio rojo |
| Tormenta de reintentos o costo del worker | cloud | low | max instances 3, concurrencia 1, DLQ tras 5 intentos, handler idempotente | mensajes en la DLQ; `worker_run` fallidos |
| Costo por Coldline o por salida de descargas | cloud | low | `customTime` sólo con campañas cerradas; vida corta de URL; umbral de revisión en billing | billing export > USD 25/mes |
| Un recorte automático se presenta como pieza aprobada | data | medium | kind `crop_*` marcado como derivado; nunca crea `asset_version`; DTO lo rotula | test de contrato |
| La conexión del worker agota conexiones en la instancia compartida con Greenhouse | data | low | pool `max = 2` × 3 instancias; usuario propio de Studio | `pg:doctor` de Greenhouse; errores de conexión en logs |
| Token de Metricool filtrado o rate limit | integration | low | Secret Manager, sólo SA del worker de prod; backoff ante 429 | `worker_run` con `error_code=rate_limited` |
| SA con más permisos de los necesarios | cloud | low | matriz IAM revisada con `gcloud projects get-iam-policy` y por bucket | diferencias contra la matriz en el runbook |

### Feature flags / cutover

- `STUDIO_ORIGINAL_DOWNLOADS_ENABLED` (Vercel de Studio, default `false`): controla la ruta de descarga. Se prende primero en preview/staging y luego en producción tras el canary.
- `MEDIA_WORKER_DERIVATIVES_ENABLED` y `MEDIA_WORKER_METRICOOL_READBACK_ENABLED` (Cloud Run, declaradas en `apps/worker/deploy.sh`, default `false`): con `false` el worker responde 2xx y registra `skipped` en `worker_run`.
- Los jobs de Scheduler nacen en pausa y la notificación GCS se crea al final del Slice 5.
- Estas flags viven en el repo de Studio y se registran en su runbook; no se leen en código de Greenhouse, así que no entran al ledger de flags de Greenhouse.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | buckets vacíos se eliminan; bindings se revocan con el mismo script | minutos | sí |
| Slice 2 | migración down (sólo si ninguna versión quedó en `gcs`) o forward fix | minutos | sí |
| Slice 3 | `pnpm media:ingest --revert-provider --apply` devuelve versiones a `onedrive_provenance` desde `provenance.onedrive_path`; los objetos quedan en el bucket | minutos | sí |
| Slice 4 | `STUDIO_ORIGINAL_DOWNLOADS_ENABLED=false` + redeploy de Vercel; revocar scope del `api_client`; las URLs ya emitidas vencen solas en ≤ 10 min | < 5 min | sí |
| Slice 5 | pausar jobs, borrar la notificación del bucket, flag a `false` en `deploy.sh` y redeploy; derivados ya creados se conservan | minutos | sí |
| Slice 6 | pausar el job de readback; las observaciones append-only quedan como historial | minutos | parcial (las observaciones no se borran) |
| Slice 7 | revert de docs | minutos | sí |

### Production verification sequence

1. Slice 1 en staging y producción; `gcloud storage buckets describe` confirma PAP, UBLA, versionado, soft delete y lifecycle; la matriz IAM coincide.
2. Migración en `marketing_studio_staging`; verificar tablas y columnas con `information_schema`; luego en `marketing_studio`.
3. `media:ingest` dry-run en staging → apply con `--campaign CMP-004` → verificar `media_object`, `asset_version` en `gcs`, metadata `sha256` y crc32c del objeto → staging completo.
4. Worker en staging con flag `false`; prender derivados; notificación GCS; subir un objeto de prueba y verificar `poster` y recortes; DLQ en 0.
5. Descarga en preview con flag `true`: 200 con `api_client` y scope, 403 anónimo, 404 fuera de la organización, 404 `original_not_stored` para una versión sin ingestar; URL vencida a los 10 min.
6. Producción: ingesta dry-run → apply por campaña → worker → descarga, con el mismo set de pruebas.
7. Readback de Metricool en producción contra un post real ya publicado; observación registrada; 7 días de `worker_run` sin fallos.

### Out-of-band coordination required

- Aprobación del operador para crear buckets, SA, tópicos, Cloud Run y Scheduler en `efeonce-group` (mutaciones de infraestructura).
- Credencial de API de Metricool y confirmación del plan que la habilita `[verificar]`.
- Release de Greenhouse por el control plane para la capability `marketing_studio.asset.download`.
- Aviso al equipo de contenidos: OneDrive sigue siendo su espacio de trabajo; nada cambia en su flujo hasta `TASK-1894`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los buckets `efeonce-marketing-studio-originals` y `-staging` existen en `us-east4` con PAP `enforced`, acceso uniforme, versionado, soft delete de 30 días y las reglas de lifecycle descritas, verificados con `gcloud storage buckets describe`.
- [ ] Ningún binding de los buckets de originales incluye `allUsers` ni `allAuthenticatedUsers`, y los permisos por SA coinciden con la matriz IAM.
- [ ] La migración aplica en ambas bases con `-- Up Migration`, bloque `DO … RAISE EXCEPTION` y `-- Down Migration` de sólo undo.
- [ ] `pnpm media:ingest` sin `--apply` no escribe nada y reporta `to_upload`, `dedup`, `already_gcs`, `drift`, `rejected` y `missing_local`.
- [ ] Re-ejecutar `media:ingest --apply` sobre el mismo set produce cero subidas y cero cambios de filas.
- [ ] Las 54 piezas vigentes (o las que existan al cerrar) tienen su versión aprobada en `gcs` en producción, o figuran en el reporte con su causa (`drift` / `missing_local`).
- [ ] Dos versiones con el mismo sha256 comparten un único objeto y una única fila de `media_object`.
- [ ] Un archivo PSD o AEP presentado a la ingesta queda en `rejected` y no llega al bucket.
- [ ] Un reimport con `import:catalog --apply` deja intactas las versiones en `gcs` (test y verificación en staging).
- [ ] La descarga responde 200 con URL que vence en ≤ 15 min para un `api_client` con scope; 403 `download_disabled` para el actor anónimo; 404 fuera de su organización; 404 `original_not_stored` para una versión sólo en OneDrive.
- [ ] Cada emisión de descarga deja un `audit_event`.
- [ ] Toda respuesta de versión y de descarga trae `rights.status`, y una versión con `rights_usage_ends_on` pasado devuelve `expired`.
- [ ] Una versión nueva en el bucket de staging recibe `thumb`, `preview`, `poster` (video) y los recortes aplicables sin intervención manual, y la DLQ queda en 0.
- [ ] El barrido horario repara una versión `gcs` a la que se le borraron los derivados.
- [ ] El readback registra en `post_observation` la publicación real de al menos un post de producción, o el Slice 6 salió a una task hija con evidencia de la falta de acceso a la API.
- [ ] `studio.asset.download` figura en el manifiesto de tools (o, si TASK-1890 no aterrizó, la task deja la entrada lista y enlazada en TASK-1890).
- [ ] `marketing_studio.asset.download` existe en el catálogo TS y en `capabilities_registry`, con grant a ≥1 rol real y coverage test verde.
- [ ] Arquitectura de Studio, runbook, Handoff, changelog y EPIC-049 actualizados, incluidos los recursos, flags y el costo observado.

## Verification

- `pnpm check` en Studio (gates, typecheck y tests de dominio).
- `pnpm local:check` y `pnpm test src/lib/entitlements` en Greenhouse.
- `pnpm media:ingest --root <…> --campaign CMP-004` (dry-run) y apply en staging.
- `gcloud storage buckets describe`, `gcloud storage objects describe`, `gcloud run services describe`, `gcloud pubsub subscriptions describe`, `gcloud scheduler jobs describe`.
- `curl` de descarga contra preview y producción con y sin bearer.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado; `TASK-1894`, `TASK-1895` y `TASK-1896` reciben un `## Delta` con lo que heredan (almacén, descarga, derechos, `worker_run`)
- [ ] Costo real del primer mes contrastado con la estimación en el runbook

## Follow-ups

- URL firmada de subida y versión creada desde Studio (`TASK-1894`).
- Derivados de audio y PDF.
- Deploy del worker desde GitHub Actions con WIF (hoy `deploy.sh` manual).
- Readback de Metricool en task hija si el Slice 6 se divide.

## Open Questions

- ~~¿Metricool expone API?~~ Resuelto 2026-09-25: sí, el plan tiene API; el Slice 6 queda en esta task. Falta obtener el token de servidor y guardarlo en `marketing-studio-metricool-api-token`.
- ¿La infraestructura del bucket y del worker se declara con `gcloud` en un script idempotente o con Terraform? Se decide en Discovery según lo que ya use el repo de Studio.
- ¿Los recortes automáticos aportan valor frente a las piezas reales por formato que ya existen? Si Discovery muestra que casi todos los conceptos tienen todos sus formatos, el recorte queda sólo como vista previa de colocación.
