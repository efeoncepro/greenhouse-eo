# Efeonce Globe — Fal Challenger Models y Producer

## Estado

- Estado: propuesta documental para tasks de integración.
- Fecha de snapshot autenticado: 2026-07-31 para los challengers iniciales; FLUX 3 se añadió con discovery oficial del 2026-08-04.
- Fuente de disponibilidad: Fal Model Search API autenticada; cada schema y precio debe revalidarse al ejecutar.
- Naturaleza: Globe sigue siendo un producto comercial; las rutas nuevas permanecen `gated` hasta completar evaluación, derechos, rate, binding, canary y promoción.

## Decisión de partición

Se crean cuatro tasks, una por familia de modelo. No se crea una quinta task de infraestructura común: el catálogo por ruta, el adapter Fal, la evaluación durable, los rates, los bindings y el Producer ya tienen dueños (`TASK-1553`, `TASK-1578`, `TASK-1614`) y MiniMax H3 (`TASK-1616`) ya define la extensión reutilizable de referencias multimodales. Cada task debe consumir esa base y registrar sus constraints propios.

La separación es necesaria porque cada familia tiene contratos de salida, precios, derechos, límites y canarios distintos. Un umbrella único escondería diferencias load-bearing y permitiría promover una ruta con evidencia de otra.

## Inventario Fal autenticado

| Familia | Endpoints observados | Capacidades | Estado en Globe |
|---|---|---|---|
| Kling 3/O3 | `fal-ai/kling-video/v3/{pro,standard}/{text-to-video,image-to-video}`, `.../o3/{pro,standard}/{text-to-video,image-to-video,reference-to-video,video-to-video/edit}`, `.../v3/{pro,standard}/motion-control` | Texto/imagen a video, start/end frames, elementos agrupados, edición, motion control, audio nativo, multi-shot y voice control según schema | No integrado |
| Grok Imagine Video | `xai/grok-imagine-video/{text-to-video,image-to-video,reference-to-video,edit-video,extend-video}`, además `v1.5/image-to-video` | Texto/imagen/referencias, edición, extensión, audio nativo, diálogo/lip-sync según modalidad | No integrado |
| Wan 2.7 | `fal-ai/wan/v2.7/{text-to-video,image-to-video,reference-to-video,edit-video}`, además `edit` y rutas de imagen | Texto/imagen/referencias, first/end frame, continuación, audio conductor, multi-shot, edición y generación/edición de imagen | No integrado |
| FLUX.2 Max | `fal-ai/flux-2-max`, `fal-ai/flux-2-max/edit` | Generación y edición de imagen, referencias múltiples en Edit, seed, safety checker, JPEG/PNG y tamaños preset/custom según schema | No integrado |
| FLUX 3 Video | `blackforestlabs/flux-3/{text-to-video,image-to-video,first-last-frame-to-video,keyframes-to-video,extend-video}` + cinco drafts + `draft-enhance` | Video con audio nativo, first/last, keyframes posicionados, continuación y preview → enhance según OpenAPI live | No integrado; propuesta dedicada en [`EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md`](EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md) |

El snapshot del 2026-07-31 no tenía coincidencia exacta `Flux 3`; el catálogo oficial consultado el 2026-08-04 ya devuelve once endpoints activos. La identidad presenta una discrepancia load-bearing entre `blackforestlabs/...` (catálogo) y `fal-ai/...` (OpenAPI/queue), por lo que FLUX 3 no debe fijarse en producción hasta resolverla con discovery autenticado y un submit controlado. La propuesta específica define el contrato y los gates.

## Qué se reutiliza y qué se extiende

### Base común reutilizable

- `video-generate`, `video-frames`, `video-edit`, `image-generate` e `image-edit` cuando la semántica del endpoint encaja.
- `FalCreativeAdapter`, queue/status/result, upload privado hash→URL efímera, descarga, hash y retrieval gobernado.
- catálogo y resolución por `routeId`; el cliente nunca conoce el slug Fal.
- `globe.producer.fleet.list`, availability, readiness, binding, rate, settlement, rights y promoción por ruta.
- estimate/prepare/execute/reconcile idempotentes y sin fallback silencioso.
- referencias content-addressed y API parity entre UI, SDK, MCP y CLI.

### Extensiones compartidas

1. Manifest tipado de referencias con modalidad, rol, ordinal, MIME, duración, lineage y derechos.
2. Reglas de composición por ruta: límites por tipo, orden, start/end frame, audio-only y citación en prompt.
3. Semántica de audio nativo en la salida: no declarar `with-audio`, diálogo o lip-sync sin evidencia de MP4 con pista de audio.
4. Video edit/extend como comandos gobernados con temporal scope, preservation policy y lineage, no como click handler.
5. Controls data-driven: duración, resolución, ratio, audio, multi-shot y referencia provienen del catálogo.

### Capacidad nueva no cubierta hoy

No se requiere una capability nueva para FLUX.2: extiende `image-generate`/`image-edit`. Para Kling, Grok y Wan, las rutas de edición y extensión deben consumir `video-edit` de `TASK-1573`; si el contrato no alcanza, la task debe proponer una extensión discriminada antes de implementar. No se debe introducir una capability por alias de proveedor.

## Matriz Producer

| Modelo | Reutilizar | Extender | No reutilizar como equivalente |
|---|---|---|---|
| Kling 3/O3 | video-generate, video-frames, referencias, video-edit, motion cuando ya esté gobernado | audio nativo, multi-shot por shot, elementos agrupados, start/end/reference roles y voice-control si el schema lo confirma | no mapear `reference-to-video` a un único start frame |
| Grok Imagine Video | video-generate, video-frames, referencias, video-edit | edit-video/extend-video, audio/lip-sync, 1–10s, 480/720 y cargos por violación | no prometer audio ni extensión si la ruta no lo entrega |
| Wan 2.7 | video-generate, video-frames, referencias e image-generate | video-edit, continuidad y límites propios de edición/referencia; `pro` como ruta independiente | no presentar `edit-video` como image-to-video |
| FLUX.2 Max/Edit | image-generate, image-edit, referencia/lineage, aspect ratio y estimate | múltiples referencias, controls de edición, typography/consistencia según OpenAPI | no crear capability `flux-3` ni un adapter separado |
| FLUX 3 Video | video-generate, video-frames y continuation solo donde el contrato encaje | keyframes con posición, draft cache y audio nativo con evidencia; ver propuesta dedicada | no mapear drafts a una resolución común, no crear adapter BFL paralelo |

## Producer requerido

El selector debe seguir siendo data-driven. Las tasks deben añadir rutas, constraints y bindings; no condiciones `if model === ...` en React. El Composer debe mostrar solo controles declarados por la ruta y conservar estado válido al cambiar de modelo.

Para video: tray de imagen/video/audio con roles, orden estable y citación; start/end frame; referencias de sujeto/estilo/movimiento; edición con rango temporal y preservación; audio nativo como opción explícita; validación antes de estimate y nuevamente en `prepare`; preview/poster/playback/retrieval y recovery.

Para FLUX.2: prompt, image-to-image/edit, múltiples referencias, seed, safety y tamaños solo si el schema live los soporta, preview, compare y lineage. FLUX.2 Edit no debe sustituir el flujo regional Fill/Erase porque su schema no declara máscara ni regiones. No agregar controles especulativos.

Para FLUX 3: revisar [`EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md`](EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md) y `TASK-1642`. No presentar como GA el Early Access de BFL, no asumir codec/FPS/MIME desde el anuncio y no promover drafts hasta resolver la retención y el lineage de `draft_cache`.

## Gates antes de implementación

- Consultar `GET /v1/models` con `expand=openapi-3.0` y pricing por endpoint; guardar timestamp, schema, aliases, límites y unidad de cobro.
- Confirmar `provider/model/version/endpointId` exactos y separar cada ruta en readiness, rate, rights, binding, evaluación y canary.
- Verificar output MIME, audio presence, hosts allowlisted y forma de respuesta.
- Mantener disponibilidad `gated` hasta evidencia terminal durable y promoción humana.
- No truncar inputs, no exponer URLs Fal, no publicar precios vendor ni realizar generación durante la fase documental.

## Fuentes de referencia

- [Fal Model Search](https://fal.ai/docs/platform-apis/v1/models)
- [Fal Pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing)
- [Kling 3 Pro image-to-video](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video)
- [Grok Imagine Video](https://fal.ai/grok-imagine)
- [Grok Imagine Video API](https://fal.ai/docs/model-api-reference/video-generation-api/xai-grok-imagine-video)
- [Wan 2.7 image-to-video](https://fal.ai/models/fal-ai/wan/v2.7/image-to-video)
- [Fal FLUX 3](https://fal.ai/flux-3)
- [BFL FLUX 3](https://bfl.ai/models/flux-3)
- [Fal model API reference](https://fal.ai/docs/model-api-reference)
