# Manual — Operar versiones livianas de media y entrega por Range en Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-24 por Claude (TASK-1528)
> **Ultima actualizacion:** 2026-07-24 (TASK-1528)
> **Doc funcional:** [efeonce-globe-media-derivatives.md](../../documentation/creative-studio/efeonce-globe-media-derivatives.md)
> **Doc tecnica:** [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md)

## Estado actual

**Activa en el runtime interno** (2026-07-24). Revisiones/digests exactos son dato mutable: consultarlos en
[`GLOBE_RUNTIME_HANDOFF.md` § Media Derivatives](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md). Los
flags `GLOBE_MEDIA_DERIVATIVES_ENABLED` y `GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` están ON (defaults en git); apagar
cualquiera deja el original intacto.

## Antes de empezar

- El código, la infra y los workflows viven en el repo hermano `efeonce-globe`. La documentación (esto) vive en
  Greenhouse.
- Todo se opera **keyless** (WIF/ADC). No hay llaves que rotar.
- El worker corre como Cloud Run Job `globe-media-derivatives` en `southamerica-west1`, con Scheduler cada 2 min.

## Componentes

| Componente | Qué es | Dónde |
|---|---|---|
| Command `globe.media.derivative.request` | Encola las versiones de una pieza | api service (`globe-api-internal`) |
| Job `globe-media-derivatives` | Produce las versiones con ffmpeg | Cloud Run Job |
| Gateway `GET /v1/media/:sha256` | Sirve bytes por Range | api service |
| Bucket `efeonce-globe-media-derivatives` | Almacén separado de derivados | GCS privado |

## Paso a paso — pedir y producir versiones

1. **Encolar** (por SDK/CLI o el reader gobernado): `globe.media.derivative.request` con `experimentId` +
   `sourceSha256`. Devuelve los `derivativeIds` (uno por perfil del media type). Requiere la capability
   `globe.media.derivative.operate` y ser dueño del output (se verifica server-side).
2. **Producir**: el Scheduler dispara el Job cada 2 min, o se ejecuta a mano:
   ```bash
   gcloud run jobs execute globe-media-derivatives --region southamerica-west1 --project efeonce-globe --wait
   ```
   Cada tick toma un lote acotado (batch 4). Rerun hasta que `claimed=0`.
3. **Verificar** el resultado del tick en los logs:
   ```bash
   gcloud logging read 'resource.type="cloud_run_job" resource.labels.job_name="globe-media-derivatives" jsonPayload.event="globe_media_worker_completed"' \
     --project efeonce-globe --limit 1 --format='value(jsonPayload)' --freshness=10m
   ```
   Campos: `ready`, `failed`, `retried`, `claimed`, `queueOldestAgeSeconds`.

## Paso a paso — servir por Range

1. **Mint del ticket** (reader `globe.media.derivative.ticket`): `experimentId` + `sourceSha256` +
   `representation` (`original` o `profileId@version`, ej. `video.preview-transcode@1`). Devuelve un `path`
   same-origin `/v1/media/<sha>?...&ticket=...` y el `outputMime`.
2. **Consumir**: la UI usa ese `path` como `src` de `<video>`/`<audio>`/`<img>`, o hace `fetch` con el header
   `x-globe-media-ticket`. El navegador manda `Range` automáticamente para video/audio.
3. **Respuestas esperadas**: `200` (completo), `206` con `Content-Range` (parcial), `416` (rango imposible),
   `400` (multipart, no soportado), `403` (ticket manipulado/vencido o principal distinto), `503` (versión no
   lista todavía, o storage temporalmente no disponible — reintentar).

## Qué significan los estados

| Estado del intent | Significado |
|---|---|
| `requested` | Encolado, esperando al worker |
| `processing` | El worker lo tomó (leased) |
| `ready` | Versión producida; hay un record con el hash de salida |
| `failed` | Agotó reintentos o falló permanente (ej. el original cambió de generación) |
| `superseded` | Reemplazado por una versión de perfil más nueva |

## Qué NO hacer

- **No** borrar objetos del bucket de derivados a mano: el delete gobernado (con precondición de generación,
  derivados antes que originales) es TASK-1529. El worker de derivados **no** tiene permiso de delete a propósito.
- **No** tocar el original para "arreglar" un derivado: el original es inmutable; se corrige regenerando el
  derivado (nuevo perfil o transformer version).
- **No** mover flags/imagen del Job con `gcloud` fuera de un incidente documentado: Terraform gobierna la config
  (el workflow de deploy es image-only). Rollback = flag a `false` + `tofu apply`.
- **No** rotar el secreto del ticket sin necesidad: rotarlo invalida los tickets vivos por hasta el TTL (120s).

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| Gateway responde `500 internal_error` al servir bytes | `api_runtime` sin read en el bucket de derivados | Verificar el rol `globeMediaDerivativesRead` (Terraform) |
| El Job termina `succeeded` pero no produce nada | `GLOBE_MEDIA_DERIVATIVES_ENABLED=false` | Encender el flag por Terraform |
| Intent queda `failed` con `source_generation_drift` | El original cambió/desapareció | Es correcto: la identidad es inmutable; re-pedir contra el nuevo original |
| `503 dependency_unavailable` al mint/serve | La versión aún no está `ready` | Correr el worker y reintentar |
| Build del worker falla en `apt-get install ffmpeg` | El pin de versión ya no existe en trixie | Actualizar `FFMPEG_DEB_VERSION` **y** `MEDIA_TRANSFORMER_VERSION` juntos |

## Referencias técnicas

- Arquitectura: [EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md)
- Decisión: [EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md) (ADR-008)
- Runtime vivo: [GLOBE_RUNTIME_HANDOFF.md](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
