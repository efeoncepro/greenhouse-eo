# MiniMax H3 en Efeonce Globe — propuesta de integración V1

> Propuesta documental para `TASK-1616`. H3 está disponible en Fal, pero todavía no está integrado,
> promovido ni disponible en el Producer de Globe.

## Estado verificado

Este documento conserva el snapshot autenticado obtenido el 2026-07-31, pero los límites de un modelo
reciente de Fal son volátiles. Antes de diseñar contratos o escribir código se debe repetir, sin generar
contenido, `GET /v1/models` con `expand=openapi-3.0` para los tres endpoints y consultar `GET
/v1/models/pricing`. Si el OpenAPI live difiere de este snapshot, prevalece el OpenAPI live y se debe
actualizar esta propuesta y `TASK-1616` antes de implementar.

El Model Search API autenticado de Fal devolvió tres endpoints `active`, con licencia `commercial`,
actualizados el 2026-07-31:

| Endpoint | Capacidad | Descripción |
|---|---|---|
| `minimax/h3/text-to-video` | Text-to-video | Video 2K desde prompt |
| `minimax/h3/image-to-video` | Image-to-video | Imagen inicial y first-to-last opcional |
| `minimax/h3/reference-to-video` | Reference-to-video | Referencias de sujeto/estilo, movimiento y audio |

El precio live consultado fue `USD 0,26/segundo` para los tres endpoints. Es un snapshot de onboarding,
no un precio público: la rate version de Globe debe revalidarlo.

Un probe sin gasto con `{}` devolvió `422` por validación de `prompt` para `minimax/h3/...` y para el
alias interno `fal-ai/minimax_h3/...`; `fal-ai/minimax/h3/...` devolvió `404`. El binding debe fijar
la identidad exacta y nunca reconstruir queue URLs desde un slug.

## Capacidades y límites

### Text-to-video

- `prompt` obligatorio, 1–2.000 caracteres.
- `duration` de 5 a 15 segundos; default 5.
- `resolution` únicamente `2K`.
- `aspect_ratio`: `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`; default `16:9`.
- Output documentado: video `video/mp4`.

### Image-to-video

- `prompt` obligatorio, 1–2.000 caracteres.
- `image_url` obligatorio como primer frame.
- `end_image_url` opcional para transición first-to-last.
- `duration`: 5–15 segundos.
- `resolution`: únicamente `2K`.
- El aspect ratio sigue a la imagen inicial.

### Reference-to-video multimodal

- `prompt` obligatorio, 1–2.000 caracteres.
- `duration`: 5–15 segundos; `resolution`: únicamente `2K`.
- `aspect_ratio`: `adaptive`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
- Hasta 9 imágenes de sujeto/estilo.
- Hasta 3 videos de movimiento, de 2–15 s cada uno; máximo combinado 15 s.
- Hasta 3 audios de referencia, de 2–15 s cada uno; máximo combinado 15 s.
- Máximo combinado de 12 archivos.
- Audio no puede ser la única referencia: debe existir al menos una imagen o video.
- El prompt cita referencias por orden y modalidad: `Image 1`, `Video 1`, `Audio 1`, etc.

Fal documenta que la ruta conserva sujetos/estilo, sigue el movimiento de clips y usa audio de
referencia. El output documentado sigue siendo video: no debe prometerse audio separado ni audio
nativo en el MP4 hasta obtener evidencia del output real.

## Diseño de integración en Globe

### Rutas y catálogo

Registrar tres rutas independientes, por ejemplo:

- `ref/video/h3-text-v1` — `video-generate`, input `create`/prompt-only.
- `ref/video/h3-first-last-v1` — `video-frames`, `start` obligatorio y `end` opcional.
- `ref/video/h3-reference-v1` — `video-generate`, input `elements`/references multimodales.

No reutilizar una ruta de Seedance u Omni. Cada identidad H3 requiere `routeId`, `modelId`,
`modelVersion`, `endpointId`, readiness y binding propios. El catálogo público muestra nombre y
versión; slug, endpoint, precio vendor y margen viven solo en binding/adapter.

### Contratos y validación

Reutilizar `video-generate` y `video-frames` si alcanzan. Extender el union discriminado solo donde
sea necesario para soportar:

- prompt-only;
- `frames{start,end?}`;
- `references{images[],videos[],audio[]}`.

Cada referencia debe conservar `assetRef`, hash/lineage, modalidad, rol y ordinal. La validación
ocurre antes de `reserve` y debe imponer 9/3/3/12, duración combinada, ratio, 2K y audio-no-only.
No basta con transportar `inputHashes[]` sin tipo y orden.

### Fal adapter y Composite

El seam existente ya tiene routing por ruta, uploads privados hash→bytes→URL, separación por media,
queue/status/result, descarga y hash. No crear otro adapter. Añadir las tres entradas H3 a la tabla
gobernada y builders de payload, conservando `status_url`/`response_url` de Fal.

El Composite debe resolver H3 únicamente cuando la ruta lo pide. No cambiar el default ni hacer
fallback silencioso a otro modelo si una referencia no es compatible.

### Producer

El Producer debe consumir `globe.producer.fleet.list` y los mismos commands/readers que SDK/MCP/CLI.
Debe añadir o habilitar, según el contrato vigente:

- selección de ruta H3 e input mode;
- start frame y end frame con roles explícitos;
- picker de imágenes, videos y audio de referencia;
- orden visible y citación `Image 1`/`Video 1`/`Audio 1`;
- contadores por tipo y total, con límites 9/3/3/12;
- bloqueo de audio-only;
- controles 2K, duración 5–15 s y ratios derivados del catálogo;
- estimate reactivo, resumen pre-spend y razones de validación;
- limpieza/revalidación de referencias al cambiar de ruta;
- recovery sin re-ejecución;
- feed/viewer/playback/download mediante retrieval gobernado.

El browser nunca entrega URLs públicas, secretos, endpoint IDs ni URLs firmadas durables.

### Ingest, governance y output

Las referencias existentes o locales pasan por ownership/workspace, MIME, tamaño, duración, malware,
rights y provenance. El adapter resuelve URLs efímeras server-side. El output se descarga, verifica,
hashea, gobierna y deriva; una URL CDN de Fal nunca es autoridad.

### Rates, rights, evaluation y promotion

Cada ruta necesita disponibilidad live, evaluación objetiva, rights/commercial attestation específica,
rate version, binding, canary estimate→reserve→execute→settlement y promoción independiente. La
flota solo puede mostrar `available` después del reader `globe.producer.fleet.list`; registrar una
ruta en catálogo no la habilita.

La evaluación mínima cubre text-only, first frame, first-to-last, reference con imagen+video+audio,
límites, audio-only rechazado y recovery. Un probe `422` no es evidencia de producción.

## Riesgos y estado

| Riesgo | Mitigación |
|---|---|
| Referencias pierden modalidad/orden | Union typed, manifest reproducible y fixtures |
| Audio se confunde con output audio | Declarar solo input hasta evidencia del MP4 |
| H3 solo soporta 2K | Validación fail-closed y catálogo sin controles inexistentes |
| Costos variables por duración | Estimate por segundos y rate versionada |
| UI adelantada al runtime | Availability reader, no flags especiales de H3 |
| Gaps de video derivatives/playback | Coordinar `TASK-1569`/`TASK-1570`; no declarar completitud falsa |

Estado: Fal live disponible; cliente genérico compatible; Globe aún no integrado ni promovido; ledger
de flota no debe marcar H3 como disponible antes de `TASK-1616`.

## Gate de revalidación previo a implementación

La task no puede tomar como inmutables los valores de este snapshot. El primer slice debe guardar para
cada endpoint: endpoint ID devuelto por Fal, alias canónico, schema OpenAPI, campos requeridos, límites,
output schema, MIME, modelo de cobro y timestamp. Las páginas indexadas de Fal han mostrado aliases
`minimax/hailuo-03/...` y límites distintos en otros momentos; cualquier divergencia debe resolverse
contra la respuesta autenticada del API, no por memoria ni por una página cacheada.

## Fuentes

- [Fal Model Search API](https://fal.ai/docs/platform-apis/v1/models)
- [Fal Pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing)
- [MiniMax H3 text-to-video](https://fal.ai/models/minimax/h3/text-to-video)
- [MiniMax H3 image-to-video](https://fal.ai/models/minimax/h3/image-to-video)
- [MiniMax H3 reference-to-video](https://fal.ai/models/minimax/h3/reference-to-video)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
