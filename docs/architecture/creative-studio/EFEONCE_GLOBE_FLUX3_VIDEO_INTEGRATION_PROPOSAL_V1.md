# Efeonce Globe — FLUX 3 Video vía Fal

## Estado

- Estado: propuesta documental para `TASK-1642`.
- Fecha del snapshot: 2026-08-04.
- Fuente de ejecución considerada: Fal Model Search/OpenAPI y API de inferencia; no se ejecutó una generación.
- Fuente de producto, API directa y términos de FLUX 3: Black Forest Labs.
- Naturaleza: Globe sigue siendo un producto comercial internal-only. Todas las rutas parten `gated`; este documento no constituye promoción, autorización comercial ni disponibilidad en Producer.
- ADR gate: la implementación debe conservar ADR-013 (resolución por ruta), ADR-021 (captura de completitud), ADR-022 (contrato creativo) y ADR-009/010 (promoción, derechos y rollout). Si keyframes temporizados o `draft_cache` requieren una semántica nueva, se debe aceptar una delta de ADR-022 antes de registrar la ruta como disponible.

## Decisión de integración

La primera integración de FLUX 3 se hará sobre el adapter Fal existente de Globe. No se crea un SDK ni un adapter paralelo para Black Forest Labs. BFL se usa como fuente primaria para el producto, el contrato directo, las limitaciones de Early Access y los términos; Fal es el proveedor de ejecución que Globe ya sabe gobernar.

La superficie inicial candidata comprende cinco rutas estándar de video:

| Route ID propuesto | Semántica | Endpoint Fal observado | Estado inicial |
|---|---|---|---|
| `ref/flux3/text-v1` | texto → video | `blackforestlabs/flux-3/text-to-video` | `gated` |
| `ref/flux3/image-v1` | imagen inicial → video | `blackforestlabs/flux-3/image-to-video` | `gated` |
| `ref/flux3/first-last-v1` | primer y último frame → video | `blackforestlabs/flux-3/first-last-frame-to-video` | `gated` |
| `ref/flux3/keyframes-v1` | keyframes posicionados → video | `blackforestlabs/flux-3/keyframes-to-video` | `gated` |
| `ref/flux3/extend-v1` | video → continuación | `blackforestlabs/flux-3/extend-video` | `gated` |

Los drafts no se deben modelar como otra calidad de un `video-generate` común sin resolver antes la continuidad entre preview y render. Las variantes publicadas son:

- `blackforestlabs/flux-3/text-to-video/draft`
- `blackforestlabs/flux-3/image-to-video/draft`
- `blackforestlabs/flux-3/first-last-frame-to-video/draft`
- `blackforestlabs/flux-3/keyframes-to-video/draft`
- `blackforestlabs/flux-3/extend-video/draft`
- `blackforestlabs/flux-3/draft-enhance`

Cada draft devuelve video y un `draft_cache` cifrado; `draft-enhance` recibe únicamente ese vínculo. La task debe decidir si esta operación entra en el primer corte o queda como una ruta/operación posterior con contrato propio. En ningún caso se debe enviar el cache como si fuera un video de usuario ni perderlo después de una URL temporal.

## Evidencia oficial actual

### Fal

El [catálogo vivo de Fal](https://api.fal.ai/v1/models?q=flux-3&limit=100) devuelve once endpoints activos y marca `license_type: commercial`. La [página de FLUX 3 en Fal](https://fal.ai/flux-3) presenta cinco endpoints principales, sus variantes draft y `draft-enhance`.

La identidad presenta una discrepancia que es load-bearing:

- catálogo: `blackforestlabs/flux-3/...` y `https://fal.run/blackforestlabs/...`;
- OpenAPI/documentación: `fal-ai/flux-3/...` y `https://queue.fal.run/fal-ai/...`;
- `fal-ai/flux-3-video` no es una identidad válida observada.

La implementación debe consultar el endpoint autenticado con `expand=openapi-3.0`, ejecutar una validación de submit controlada y conservar el `endpoint_id`/`response_url` que el runtime devuelva. No se debe escoger un namespace por analogía ni construir URLs de seguimiento desde el slug.

El [OpenAPI expandido del endpoint de texto](https://api.fal.ai/v1/models?endpoint_id=blackforestlabs%2Fflux-3%2Ftext-to-video&expand=openapi-3.0) y las páginas oficiales de [texto](https://fal.ai/models/fal-ai/flux-3/text-to-video/api), [imagen](https://fal.ai/models/fal-ai/flux-3/image-to-video/api), [first/last](https://fal.ai/models/fal-ai/flux-3/first-last-frame-to-video/api), [keyframes](https://fal.ai/models/fal-ai/flux-3/keyframes-to-video/api) y [extend](https://fal.ai/models/fal-ai/flux-3/extend-video/api) definen los siguientes límites que la task debe verificar de nuevo al ejecutarse:

| Familia | Entrada requerida | Límites publicados | Salida publicada |
|---|---|---|---|
| Text-to-video | `prompt` | `duration`: `auto` o 5–20 s; 720p/1080p; ratios `auto`, `21:9`, `2:1`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`; `generate_audio`; `safety_tolerance` 0–4 | `video.url`, `seed` |
| Image-to-video | `prompt`, una `image_url` | PNG/JPEG/WebP; el schema representa un único frame inicial; comparte duración, ratio, resolución, audio y safety | `video.url`, `seed` |
| First/last | `prompt`, `start_image_url`, `end_image_url` | duración explícita 5–20 s; dos imágenes; mismos controles compartidos | `video.url`, `seed` |
| Keyframes | `prompt`, array `keyframes` | 1–10 imágenes; `frame_index` único; índices sobre 24 fps y `frame_index <= duration * 24`; duración explícita 5–20 s | `video.url`, `seed` |
| Extend | `prompt`, `video_url` | MP4 menor de 50 MB y menor de 15 s; duración `auto` o 5–20 s; no confundir con edición general | `video.url`, `seed` |

Las variantes draft no publican `resolution` y devuelven `video.url` más `draft_cache.url`. `draft-enhance` requiere únicamente `draft_cache_url` y devuelve video. Los precios publicados en las páginas de endpoint son aproximadamente USD 0,17/s (720p) y USD 0,29/s (1080p) para las rutas estándar de texto/imagen/frames; extend publica USD 0,41/s y USD 0,53/s. El precio de drafts no debe inferirse de esa tabla: se debe consultar el [pricing API autenticado](https://fal.ai/docs/platform-apis/v1/models/pricing) para cada endpoint y registrar unidad, moneda, versión y timestamp.

Fal documenta autenticación server-side con `Authorization: Key`, queue, `request_id`, `status_url`, `response_url` y webhooks firmados. Globe debe conservar el patrón existente: webhook/poll de recuperación, verificación de firma y usuario, idempotencia por request, descarga inmediata, hash/ingest y ningún URL Fal como autoridad durable. Los endpoints nuevos requieren entries explícitos en `governed-production-composition.ts`, result schemas y seguimiento solo con evidencia de una respuesta real.

### Black Forest Labs

BFL presenta FLUX 3 Video como [Early Access](https://bfl.ai/blog/flux-3), aunque la [página de producto](https://bfl.ai/models/flux-3) también usa lenguaje de producción. Su API directa documenta `POST /v1/flux-3-video`, autenticación `x-key`, `version: latest`, modos `t2v`, `i2v`, `v2v` y `draft_enhance`, duración `auto`/5–20 s, resolución `hd`/`fhd`, audio nativo y estados `Pending`, `Reasoning`, `Generating`, `Ready`, moderación y error. BFL no publica en ese contrato un esquema estable de MIME, codec, FPS, dimensiones exactas ni forma final del `result`.

La guía de [image-to-video](https://docs.bfl.ai/guides/prompting_video_image_to_video) describe de 1 a 10 keyframes, incluso pares temporizados; la API de Fal expresa ese concepto como `keyframes[]` con `frame_index`. El modo directo `v2v` describe continuación desde un video, pero no se debe presentar como editor general. BFL también documenta `draft: true` y un bundle `draft_cache` cifrado que debe persistirse y entregarse sin parámetros nuevos a `draft_enhance`.

El [EAP Terms of Service](https://bfl.ai/legal/eap-terms-of-service) y los [API Service Terms](https://bfl.ai/legal/flux-api-service-terms) prevalecen sobre cualquier copy de disponibilidad: no se debe asumir autorización de producción, escala de usuarios finales, estabilidad de `latest`, uso de material confidencial, private weights ni licencia de self-hosting. La [Usage Policy](https://bfl.ai/legal/usage-policy) exige consentimiento para imagen/voz/likeness y prohíbe eliminar procedencia. Fal marca sus endpoints como comerciales, pero esa marca tampoco reemplaza la atestación de derechos de Globe.

## Estado de Globe y brecha

La revisión de `../efeonce-globe` confirma que la base existe, pero FLUX 3 no está integrado:

| Superficie | Estado actual | Adaptación requerida |
|---|---|---|
| `apps/creative-runner/src/fal-adapter.ts` | `FalModelRoute` y `FAL_ROUTING` por capability; no hay rutas Flux 3 | Añadir bindings route-aware y payloads discriminados; no crear SDK paralelo ni mapear por slug global |
| `apps/studio-web/src/governed-production-composition.ts` | allowlist Fal explícita para Seedream, Seedance, Recraft, ElevenLabs; sin Flux 3 | Añadir cada endpoint solo después de resolver namespace, body, follow-up y result schema |
| `packages/contracts/src/producer-catalog.ts` | slots para prompt, referencias, frames y motion; no hay posición de keyframe ni draft cache | Extender el contrato de forma versionada o aceptar delta de ADR-022 antes de usar keyframes/drafts |
| `packages/domain/src/producer-catalog.ts` | rutas de video actuales para Seedance, Omni y Veo; no hay Flux 3 | Registrar rutas y constraints por operación, sin exponer el slug Fal al cliente |
| `packages/domain/src/producer-fleet.ts` | `available` exige readiness `promoted` + binding production `enabled` | Mantener las cinco rutas `gated` hasta rate, rights, eval, canary y promoción independientes |
| `apps/creative-runner/src/production-result-drivers.ts` | descarga/hash/ingest y schemas por endpoint | Añadir video MP4, seed, audio evidence y cache privado; no confiar en URL remota |
| `apps/studio-client` / Composer | consume catálogo; `TASK-1552` es dueño del consumer | No agregar JSX en esta foundation; si keyframes/draft requieren un flujo nuevo, crear task UI dependiente |

## Contrato de rutas y proveedor

1. La identidad durable será `{routeId, capability, provider, model, version, endpointId, region, completionDriver}`. `model`/`endpointId` Fal permanecen server-only.
2. El adapter recibirá una solicitud provider-neutral. El compiler elegirá el body según la ruta exacta y rechazará campos que no existan en el OpenAPI capturado. No habrá un `if` de proveedor en el Composer.
3. `video-generate` puede cubrir texto e imagen solo si el contrato conserva la diferencia de slot inicial. First/last requiere dos slots ordenados. Keyframes requiere colección ordenada con `frameIndex` y duración explícitos. Extend requiere un `video_url` materializado desde un asset content-addressed y sus límites de 50 MB/15 s.
4. `draft` y `draft-enhance` no son una segunda resolución del mismo output: el cache es un artefacto intermedio opaco, cifrado, temporal y no reproducible desde el prompt. Debe tener lineage, retención server-only, fingerprint y una operación de continuación; si los contratos actuales no lo soportan, se debe crear la semántica antes del adapter.
5. `generate_audio` debe quedar como control declarado por ruta. La etiqueta `with-audio` solo se puede proyectar después de inspeccionar un MP4 real y registrar presencia de pista; el prompt no basta.
6. `duration: auto` no se debe inventar dentro de un `OutputShape` numérico. El primer corte puede restringir la ruta a duraciones explícitas mientras se define el contrato de estimate/actual, siempre con error canónico antes de reservar.

## Spend, rates y settlement

- Consultar pricing autenticado para los once endpoints, aunque la primera promoción solo incluya las cinco rutas estándar.
- Registrar rate version, moneda, unidad (por segundo o por video), resolución y tratamiento de drafts; no copiar precios desde un post o de otra ruta.
- Validar prompt, MIME, tamaño, duración, frame indices, ratio, resolución, audio y rights antes de reservar créditos. Fal documenta que errores de validación pueden tener comportamiento de cobro dependiente del trabajo consumido; el sistema debe fallar antes de submit cuando el dato ya es conocido.
- El estimate y el actual deben conservar endpoint/version/rate snapshot; settlement debe ser idempotente y reconciliarse contra el `request_id` de Fal.
- La cuota de Fal es externa y no se debe confundir con capacidad de Globe. Concurrencia, backpressure y circuit breaker deben ser observables antes de abrir un canary.

## Derechos, seguridad y procedencia

- `GLOBE_FAL_API_KEY` permanece solo en Globe, server-side, con mínimo alcance. Ningún browser, MCP externo ni log recibe la clave, el slug privado o la URL Fal sin protección.
- Verificar firma de webhook, `request_id`, `X-Fal-Webhook-User-Id`, timestamp y replay; mantener el recovery por poll cuando no exista webhook o se pierda el ack.
- Conservar provenance, consentimiento y policy del input para imágenes, video, voz y likeness. No eliminar C2PA ni sustituir la policy vigente de generated rights.
- Guardar digest y fecha de los términos de Fal, BFL y del modelo. La marca `commercial` de Fal y el estado Early Access de BFL son evidencia de disponibilidad, no una autorización de Globe para terceros.
- No anunciar private weights, self-hosting, estabilidad de `latest`, FPS/codec/dimensiones ni continuidad de voz si no existe evidencia contractual y runtime.

## Evaluación y promoción

La evaluación debe ser por ruta, no por familia:

- texto: movimiento, tipografía, escenas, audio y moderación;
- imagen: fidelidad del frame inicial y continuidad;
- first/last: cumplimiento de ambos extremos;
- keyframes: colocación exacta en 24 fps e interpolación;
- extend: continuidad desde un MP4 menor de 15 s;
- draft, si entra: identidad entre preview y enhance, retención del cache y diferencia de costo;
- todas: MIME/codec/duración/audio presence, descarga/ingest, lineage, credits, settlement y recovery de ack perdido.

Los resultados preliminares de BFL no son criterio automático de promoción. Cada ruta necesita golden briefs, revisión humana, rights attestation, rate version, binding exacto, canary con spend fence, readback terminal y promoción humana. `globe.producer.fleet.list` debe mostrar `gated`/`not_promoted` hasta que readiness y binding estén convergentes.

## Decisiones abiertas que debe cerrar `TASK-1642`

1. ¿El namespace operativo válido es el `endpoint_id` del catálogo (`blackforestlabs/...`) o el path aceptado por queue (`fal-ai/...`)? Resolverlo con discovery autenticado y submit controlado.
2. ¿Las cinco rutas estándar se promueven primero y drafts quedan en una operación posterior, o se acepta una semántica de draft de dos fases desde el primer corte?
3. ¿Keyframes posicionados caben en la versión vigente de `RouteCreativeContractV1`, o requieren delta de ADR-022 y versión de contrato?
4. ¿`duration: auto` se representa como elección explícita del usuario o se restringe inicialmente a 5–20 segundos?
5. ¿El audio nativo se proyecta como `embedded` solo después de evidencia por resolución/duración?
6. ¿El acuerdo aplicable permite el material y la escala de uso de Globe mientras BFL mantiene EAP, y qué evidencia de Fal/terceros debe firmar Legal?
7. ¿La salida de Fal es siempre MP4/24 fps en el runtime observado? Si no, qué normalización/derivado gobierna playback y lineage?

## Fuentes primarias

- [BFL FLUX 3 product page](https://bfl.ai/models/flux-3)
- [BFL FLUX 3 announcement](https://bfl.ai/blog/flux-3)
- [BFL FLUX 3 API reference](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3)
- [BFL FLUX 3 OpenAPI](https://docs.bfl.ai/openapi-flux3.json)
- [BFL EAP terms](https://bfl.ai/legal/eap-terms-of-service)
- [Fal FLUX 3 page](https://fal.ai/flux-3)
- [Fal model catalog](https://fal.ai/docs/platform-apis/v1/models)
- [Fal pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing)
- [Fal authentication](https://fal.ai/docs/documentation/setting-up/authentication)
- [Fal queue](https://fal.ai/docs/documentation/model-apis/inference/queue)
- [Fal webhooks](https://fal.ai/docs/documentation/model-apis/inference/webhooks)
- [Fal terms](https://fal.ai/legal/terms-of-service)
