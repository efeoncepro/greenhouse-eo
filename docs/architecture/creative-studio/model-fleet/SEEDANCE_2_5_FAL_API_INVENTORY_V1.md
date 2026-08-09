# Seedance 2.5 — inventario exhaustivo de la superficie Fal

> Corte de investigación: 2026-08-07. Este documento separa producto anunciado, API oficial de BytePlus/ModelArk,
> API de Fal y disponibilidad en Efeonce Globe. No es un catálogo runtime, una autorización de gasto, una tarifa
> comercial ni una garantía de calidad. La autoridad de disponibilidad de Globe sigue siendo
> `globe.producer.fleet.list`.

## Dictamen

Seedance 2.5 existe como producto promocionado por ByteDance/Volcengine/BytePlus y Fal expone tres endpoints
activos y documentados:

1. `bytedance/seedance-2.5/text-to-video`
2. `bytedance/seedance-2.5/image-to-video`
3. `bytedance/seedance-2.5/reference-to-video`

La API directa pública de BytePlus/ModelArk no tiene un `model_id`, request schema, pricing, límites ni SDK 2.5
verificados en este corte; sus documentos callable siguen describiendo principalmente Seedance 2.0. Por tanto,
Globe debe implementar, si se aprueba, una integración Fal adapter-first y mantener la ruta directa como surface
deferred.

La investigación no encontró una cuarta variante pública confirmada. Sí encontró un alias `fal-ai/seedance-2.5`
marcado como Early Access/stub y un helper `/health` no incluido en el OpenAPI de inferencia; ninguno es una ruta
ejecutable confirmada.

## Fuentes y jerarquía

### Primarias Fal

- [Model Search API](https://api.fal.ai/v1/models?q=seedance%202.5&status=active&limit=50): autoridad de existencia,
  estado y endpoint ID publicado; el corte devuelve tres modelos activos.
- [Documentación Model Search](https://fal.ai/docs/platform-apis/v1/models): permite `endpoint_id`, `q`, `status` y
  `expand=openapi-3.0`; la expansión devuelve el contrato por endpoint.
- [T2V](https://fal.ai/models/bytedance/seedance-2.5/text-to-video), [I2V](https://fal.ai/models/bytedance/seedance-2.5/image-to-video)
  y [R2V](https://fal.ai/models/bytedance/seedance-2.5/reference-to-video): páginas, `llms.txt`, examples y OpenAPI.
- [Pricing](https://fal.ai/pricing) y [model pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing): precio
  y estimate son volátiles y específicos de cuenta/endpoint.
- [Queue](https://fal.ai/docs/documentation/model-apis/inference/queue), [webhooks](https://fal.ai/docs/documentation/model-apis/inference/webhooks),
  [streaming](https://fal.ai/docs/documentation/model-apis/inference/streaming), [realtime](https://fal.ai/docs/documentation/model-apis/inference/real-time),
  [media expiration](https://fal.ai/docs/documentation/model-apis/media-expiration), [CDN](https://fal.ai/docs/documentation/model-apis/fal-cdn),
  [ACL](https://fal.ai/docs/documentation/model-apis/file-access-controls) y [storage](https://fal.ai/docs/api-reference/platform-apis/for-storage).

### Primarias de producto/API directo

- [Promoción Seedance 2.5 en Ark](https://ark.volcengine.com/promotion?modelName=seedance-2-5): producto, demos y claims.
- [API de video ModelArk](https://docs.byteplus.com/en/docs/modelark/1520757): endpoint callable y contratos públicos de la
  generación de video documentada; no confirma un `model_id` público 2.5.
- [Tutorial ModelArk](https://docs.byteplus.com/en/docs/ModelArk/2298881) y [pricing ModelArk](https://docs.byteplus.com/en/docs/ModelArk/1099320):
  baseline de 2.0, no contrato 2.5.

## Producto anunciado versus contrato Fal

La superficie de producto anuncia entrada multimodal (texto, imagen, video, audio), generación, edición, extensión,
multi-shot, control temporal, continuidad de personaje/set/paleta, cámara, diálogo, música, efectos, ambiente,
sincronización audiovisual y presentación multilingüe. Los ejemplos muestran prompts con intervalos temporales,
transiciones, dolly, tracking, orbit, crane, handheld, rack focus y whip pan.

Esos ejemplos prueban capacidades de producto/prompting, no campos API estructurados. En Fal no hay campos
confirmados para `operation=edit|extend`, `mask`, `edit_region`, `start_time`, `end_time`, storyboard JSON, shot list,
keyframes intermedios, cámara estructurada, stems, pistas separadas, canales, `style_urls` o idiomas como enum.
R2V puede orientar edición/extensión mediante video de referencia y prompt; no debe llamarse edición stateful ni
edición localizada hasta que exista contrato específico.

También hay claims contradictorios en las superficies promocionales: un hero menciona 1080P mientras la ficha técnica
de Ark y los tres OpenAPI de Fal exponen 480P/720P; una pieza editorial menciona una beta de hasta tres minutos,
mientras el contrato Fal expone 4–30 segundos. Globe debe usar el contrato de endpoint, no esos claims.

## Endpoints Fal y contratos exactos

### 1. Text-to-video

Endpoint ejecutable: `https://fal.run/bytedance/seedance-2.5/text-to-video`.

Input OpenAPI:

| Campo | Requerido | Tipo/valores | Default y reglas |
|---|---:|---|---|
| `prompt` | sí | `string` | Dirección textual; único campo requerido. |
| `resolution` | no | `480p \| 720p` | `720p`; 480p se documenta como más rápido. |
| `duration` | no | `auto \| "4"` … `"30"` | `auto`; son strings, no números. |
| `aspect_ratio` | no | `auto \| 21:9 \| 16:9 \| 4:3 \| 1:1 \| 3:4 \| 9:16` | `auto`. |
| `generate_audio` | no | `boolean` | `true`; incluye SFX, ambiente y lip-sync; el precio publicado no cambia por este booleano. |
| `end_user_id` | no | `string \| null` | Identificador del usuario final; Globe debe resolverlo server-side y no aceptar uno arbitrario del navegador. |

La página visual muestra `seed` en algunos contextos, pero el OpenAPI y `llms.txt` no lo declaran como input. El
contrato de Globe no debe enviarlo ni prometer reproducibilidad hasta una prueba controlada que confirme su aceptación.

### 2. Image-to-video

Endpoint ejecutable: `https://fal.run/bytedance/seedance-2.5/image-to-video`.

Input OpenAPI:

| Campo | Requerido | Tipo/valores | Default y reglas |
|---|---:|---|---|
| `prompt` | sí | `string` | Movimiento/acción deseados. |
| `image_url` | sí | `string` | Frame inicial; JPEG/PNG/WebP; máximo 30 MB. |
| `end_image_url` | no | `string \| null` | Frame final; JPEG/PNG/WebP; máximo 30 MB; transiciona desde el inicial. |
| `resolution` | no | `480p \| 720p` | `720p`. |
| `duration` | no | `auto \| "4"` … `"30"` | `auto`; 4–30 s. |
| `aspect_ratio` | no | `const("auto")` | Siempre `auto`; no aceptar el enum de T2V aquí. |
| `generate_audio` | no | `boolean` | `true`; audio sincronizado, SFX, ambiente y lip-sync. |
| `end_user_id` | no | `string \| null` | Identidad server-side del end user. |

No hay máscara, región, keyframes intermedios, storyboard, cámara estructurada ni operación explícita de edición.
El contrato semanticamente correcto es first-frame + last-frame opcional; no inferir `end_image_url` por conteo de
imágenes.

### 3. Reference-to-video

Endpoint ejecutable: `https://fal.run/bytedance/seedance-2.5/reference-to-video`.

Input OpenAPI:

| Campo | Requerido | Tipo/valores | Límites y reglas |
|---|---:|---|---|
| `prompt` | sí | `string` | Puede citar referencias por posición; la descripción OpenAPI usa `@Image1`, `@Video1`, `@Audio1`. |
| `image_urls` | no | `string[]` | Hasta 30; máximo 30 MB por imagen; JPG, PNG, WebP, BMP, TIFF, GIF, HEIC, HEIF. |
| `video_urls` | no | `string[]` | Hasta 10; MP4/MOV; 1.8–30.2 s cada uno; combinado ≤30.2 s; ≤200 MB cada uno; 300–6000 px por lado; ratio 0.4–2.5; 24–60 FPS. |
| `audio_urls` | no | `string[]` | Hasta 10; MP3/WAV; 1.8–30.2 s cada uno; combinado ≤30.2 s; ≤15 MB cada uno; exige al menos una imagen o video. |
| `resolution` | no | `480p \| 720p` | `720p`. |
| `duration` | no | `auto \| "4"` … `"30"` | `auto`; 4–30 s. |
| `aspect_ratio` | no | `auto \| 21:9 \| 16:9 \| 4:3 \| 1:1 \| 3:4 \| 9:16` | `auto`. |
| `generate_audio` | no | `boolean` | `true`; audio generado y audio de referencia son conceptos distintos. |
| `end_user_id` | no | `string \| null` | Identidad server-side del end user. |

El total de archivos de todas las modalidades no puede superar 50. Fal menciona “style inputs” en la descripción,
pero no existe un campo `style_urls`; tratar style como semántica del prompt/referencias, no como slot dedicado.
La vista visual de Fal usa ocasionalmente `[Image1]`/`[Video1]`/`[Audio1]`, mientras el OpenAPI/`llms.txt` usa `@...`.
El route contract debe declarar `@...` como propuesta y bloquear promoción hasta probar la sintaxis real.

## Dimensiones, salida y claims de audio

Dimensiones publicadas para los ratios explícitos:

| Resolución | 21:9 | 16:9 | 4:3 | 1:1 | 3:4 | 9:16 |
|---|---:|---:|---:|---:|---:|---:|
| 480p | 992×432 | 864×496 | 752×560 | 640×640 | 560×752 | 496×864 |
| 720p | 1470×630 | 1280×720 | 1112×834 | 960×960 | 834×1112 | 720×1280 |

Output OpenAPI de los tres endpoints:

```json
{
  "video": {
    "url": "https://...",
    "content_type": "video/mp4",
    "file_name": "video.mp4",
    "file_size": 0
  },
  "seed": 123
}
```

`video` y `seed` son requeridos en la respuesta. `video.url` es requerido; `content_type`, `file_name` y `file_size`
pueden ser `null`. El seed documentado es output; no es input confirmado. La salida es un archivo de video, no audio
separado, stems o metadata de shots. Globe debe descargar bytes, verificar MIME/duración/dimensiones/audio, ingerir
privadamente y exponer hash/asset propio, nunca la URL CDN de Fal como autoridad durable.

## Pricing y superficies de medición Fal

La documentación de los tres modelos publica aproximadamente `$0.0214/1000 tokens`. Fórmula T2V/I2V:

```text
tokens = output_height × output_width × output_duration_seconds × 24 / 1024
```

Para 16:9, el snapshot de Fal publica aproximadamente `$0.4730/s` a 720p y `$0.2205/s` a 480p. R2V añade la
duración de video de entrada:

```text
tokens = output_height × output_width ×
         (input_video_duration_seconds + output_duration_seconds) × 24 / 1024
```

La documentación publica factor 0.6 cuando existen videos de referencia y aclara que se factura input-video más
output-video. La generación de audio cuesta lo mismo con `generate_audio=true|false`. Estos importes son del
provider, no créditos comerciales de Globe; deben refrescarse antes de estimate/reserve/settle.

Fal expone además APIs de plataforma relevantes para una integración operable:

| Superficie | Función | Aplicación en Globe |
|---|---|---|
| `GET /v1/models` | Buscar/listar modelos; `endpoint_id`, `q`, `category`, `status`, `expand=openapi-3.0`, `expand=enterprise_status`. | Discovery/revalidación; no es disponibilidad Globe. |
| `GET /v1/models/pricing` | Unit price por endpoint; requiere permisos/API key. | Evidencia de rate, no autoridad final de settlement. |
| `POST /v1/models/pricing/estimate` | Estimación histórica por request o por unidades. | Comparar con la fórmula; guardar snapshot si la cuenta lo permite. |
| `GET /v1/models/usage` | Uso, unidades, precio, costo, timeframe y endpoint. | Reconciliación privada. |
| `GET /v1/models/billing-events` | Eventos facturables filtrables; ventana publicada de hasta 90 días. | Settlement/auditoría, nunca exponer al cliente sin policy. |
| `GET /v1/models/analytics` | Requests, éxito/error/timeout, ptiles, cold boots y duración facturable. | Observabilidad provider. |
| `GET /v1/models/requests/by-endpoint` | Historial de requests por endpoint y expansión de payloads. | Diagnóstico, sujeto a retención y privacidad. |
| `DELETE /v1/models/requests/payloads` | Borrado de payloads del provider. | Derechos/retención; requiere policy y evidencia. |

## Transporte, queue, webhooks y cancelación

### Inferencia directa y SDK

- `POST https://fal.run/<endpoint>` / `run()`: llamada directa/síncrona; no asumir reintentos automáticos.
- `subscribe()`: SDK Python/JS que combina submit, espera, polling, logs y retorno del resultado.
- `@fal-ai/client` es el cliente actual; `@fal-ai/serverless-client` está deprecado en las páginas de Fal.
- Fal key server-side; nunca navegador, Globe client, Greenhouse ni logs.

### Queue específico de los tres endpoints

El OpenAPI de cada endpoint publica estas cuatro operaciones en `queue.fal.run`:

```text
POST /<endpoint>
GET  /<endpoint>/requests/{request_id}/status
GET  /<endpoint>/requests/{request_id}
PUT  /<endpoint>/requests/{request_id}/cancel
```

El submit devuelve `request_id`, `response_url`, `status_url`, `cancel_url` y potencialmente `queue_position`, logs
y metrics. Los estados publicados son `IN_QUEUE`, `IN_PROGRESS` y `COMPLETED`; los errors/terminal states deben
tratarse desde la respuesta real, no desde un enum inventado. Globe debe seguir las URLs retornadas y nunca
reconstruirlas desde el slug.

### Webhook

Fal documenta webhook configurado por SDK o `fal_webhook`; entrega `request_id`, `gateway_request_id`, `status` y
payload/error. Publica firma ED25519/JWKS y estos headers:

```text
X-Fal-Webhook-Request-Id
X-Fal-Webhook-User-Id
X-Fal-Webhook-Timestamp
X-Fal-Webhook-Signature
```

El timestamp debe estar dentro de ±300 s. Fal recomienda verificar, persistir y responder 200 rápidamente; entrega
retry durante aproximadamente dos horas. Globe ya tiene seam de firma, replay window y dedupe, pero necesita una
prueba real 2.5 del payload y `expectedUserId`.

### Streaming/realtime

- `GET .../status/stream?logs=1`: SSE genérico de estado de queue; no aparece en el OpenAPI específico de Seedance.
- `POST https://fal.run/<endpoint>/stream`: genérico; no hay stream específico 2.5 confirmado.
- `realtime()`/WebSocket: no hay endpoint realtime 2.5 confirmado.
- `wss://ws.fal.run/{model_id}`: transporte genérico, no evidencia de capacidad realtime del modelo.

Estado Globe: no ofrecer streaming ni realtime de Seedance 2.5.

## Storage, ACL, lifecycle y retención

Fal expone superficies genéricas de storage:

- `POST https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3`: `{file_name, content_type}` → upload/file URL.
- `POST https://rest.fal.ai/storage/auth/token?storage_type=fal-cdn-v3`: token temporal para leer assets restringidos.
- `GET|PUT /v1/storage/files/acl?url=...`: ACL `allow|forbid|hide` y reglas por usuario.
- `POST /v1/storage/files/sign`: firma con expiración documentada de 1–604800 s.
- `GET|PUT /v1/storage/settings`: expiración y ACL inicial.

Defaults que requieren policy explícita: payload JSON temporal alrededor de 30 días, media disponible al menos siete
días según documentación, archivos CDN potencialmente públicos/indefinidos según settings. `X-Fal-Store-IO: 0` evita
guardar JSON pero no elimina automáticamente media CDN. Globe debe usar ingest privado propio, ACL/lifecycle explícitos
y derechos; no depender de defaults de Fal.

## Headers, fallback, reintentos y errores

Headers documentados en la plataforma incluyen:

```text
Authorization: Key $FAL_KEY
X-Fal-Request-Timeout
X-Fal-Runner-Hint
X-Fal-Queue-Priority
X-Fal-Object-Lifecycle-Preference
X-Fal-Store-IO
X-Fal-No-Retry
x-app-fal-disable-fallback
fal_max_queue_length
```

El header oficial para impedir fallback es singular: `x-app-fal-disable-fallback`. Globe todavía tiene una aserción
legacy del plural `x-app-fal-disable-fallbacks`; es un gap de integración que debe corregirse antes del canary.

Fal documenta reintentos de queue para errores server/conexión y posibles fallbacks equivalentes; `X-Fal-No-Retry` y
el header de disable-fallback sirven para control explícito. Globe debe desactivar fallback y registrar route/model/
endpoint exactos; un cambio silencioso a 2.0 es inaceptable.

Errores generales que deben mapearse sin filtrar raw body: timeout de request/startup, scheduling failure, runner
disconnect/refused/server error, cancelación, `bad_request`, `content_policy_violation`, file-too-large, image-too-
small/large/load-error, file-download-error y errores de duración, formato, cardinalidad y validación. El formato de
validación puede incluir `detail[]` con `loc`, `msg` y `type`; Globe debe normalizarlo a errores canónicos privados.

## Anomalías de identidad

1. Los endpoint IDs publicados y ejecutables son `bytedance/...` sin `fal-ai/`.
2. La expansión `GET /v1/models?...&expand=openapi-3.0` puede producir metadata/títulos y paths internos bajo
   `fal-ai/seedance-2.5/...`; el OpenAPI directo de la página usa `bytedance/...`.
3. El alias `fal-ai/seedance-2.5/text-to-video` aparece como Early Access/stub/noindex/enterprise pending y no tiene
   acceso público confirmado; no es una cuarta ruta.
4. `/health` aparece en metadata interna de algunas páginas, pero no en el OpenAPI de queue ni tiene response contract.
5. No derivar routing desde `x-fal-metadata.endpointId`, títulos de schema ni URLs de documentación. Usar únicamente
   el endpoint ID publicado por Model Search y validar con submit controlado antes de cablear.

## Mapa de integración para Globe

### Reutilizar

- `FalCreativeAdapter` y su transporte inyectado.
- upload privado de `resolvedInputs` a URLs temporales.
- `status_url`/`response_url`/`cancel_url` retornadas.
- webhook firmado, dedupe, polling de respaldo, idempotency y no-fallback.
- `ProducerCatalogViewV1`, `RouteCreativeContractV1`, intent, input resolver, rights/provenance, output ingest,
  evaluation, readiness, promotion y `globe.producer.fleet.list`.
- Cliente genérico Producer de catalog/fleet/estimate/prepare/execute/cancel; no crear cliente Fal en browser.

### Crear/extender en la task de Globe

- Route-first bindings para tres identidades; no fallback por capability a Seedance 2.0.
- Política de inputs por slot/media: cardinalidad, total combinado, bytes, duración, FPS, dimensiones, ratio, MIME y
  reglas `requiresAny`/`requiresIf`.
- Plan `creativeIntent → roles/ordinals → provider fields → prompt citations`.
- `end_image_url`, arrays separados `image_urls`/`video_urls`/`audio_urls`, y validación no-truncating.
- Metadata multimedia de `ResolvedInputV1` o un inspector pre-spend; los hashes por sí solos no contienen duración/FPS.
- Usage drivers/rate policy con duración de output, resolución, duración de videos input y snapshot Fal.
- Output/attempt evidence para conservar seed de respuesta, uso, MIME, dimensiones, duración y audio embebido.
- Rights attestation exacta por provider/model/version/plan, retención, delivery, audio/voice/likeness y términos.
- Tests de webhook/cancel tolerantes a las formas de respuesta documentadas, más `fal-follow-up-base-coverage`.
- Canary route-specific y promotion/readback; nada queda `available` por aparecer en Fal.
- Consumer delta en `TASK-1552` y contrato base en `TASK-1633`; la UI no debe codificar caps ni slugs.

### No habilitar con la evidencia actual

`4K`, `1080p`, tres minutos, seed de entrada, reproducibilidad garantizada, máscara, edición localizada, storyboard,
shot list, cámara estructurada, keyframes intermedios, stems, audio separado, idiomas como enum, streaming, realtime,
`style_urls`, alias `fal-ai/...`, `/health`, acceso directo BytePlus 2.5 y cualquier afirmación cuantificada de
consistencia/adherencia.

## Estado de Globe

El route card asociado es [`SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json`](routes/SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json).
El estado correcto es `provider-supported / Globe gated`: no hay código, binding, rate, rights attestation, evaluación,
canary, promoción ni disponibilidad live de Globe para 2.5.

La task nueva debe ser backend-data, con UI como delta de la task dueña del Producer Composer. Antes de registrar el ID
se debe volver a barrer el registry modificado y presentar colisiones/ownership; no se debe reservar una task UI
independiente sin wireframe/flow/GVC.
