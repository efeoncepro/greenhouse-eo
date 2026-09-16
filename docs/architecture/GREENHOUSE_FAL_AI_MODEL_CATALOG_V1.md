# Greenhouse — Fal.ai Model & Capability Catalog V1

> **Tipo:** Referencia técnica agent-facing · **Version:** 1.2 · **Creado:** 2026-07-06 por Claude
> **Última actualización:** 2026-09-16 por Claude — Minimax H3 conectado a `pnpm ai:fal` (17 endpoints, 9
> verificados), kind `training`, retome por `request_id`, direccionamiento de cola por app y cierre de la brecha
> de `--task`. Antes (1.1): CLI `pnpm ai:fal`, Seedream 5 layerize, Seedance 2.5 y corrección del prefijo `fal-ai/`.
> **Estado:** inventario histórico de discovery Greenhouse; no es allowlist productivo de Creative Studio.
> **Última verificación parcial:** 2026-07-19.
> **Fuente vigente de incorporación:** [Efeonce Creative Studio Enterprise Model Portfolio V1](EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md)
> y su [Capability Registry](EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json).
> **Contrato/acceso:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) → §Fal.ai
> **Cliente canónico:** [`src/lib/ai/fal.ts`](../../src/lib/ai/fal.ts) (`runFalModel`, `uploadFalFile`)
> **Carril operativo Greenhouse:** `pnpm ai:fal` ([`scripts/ai/fal-image.ts`](../../scripts/ai/fal-image.ts)) sobre el
> registro [`src/lib/ai/fal-capabilities.ts`](../../src/lib/ai/fal-capabilities.ts) — ver §Carril operativo.

## Propósito

Fal publica más de 1.000 Model APIs, pero amplitud de catálogo no equivale a capacidad aprobada. Este documento
sirve para discovery y para encontrar familias; el portafolio del Studio decide qué endpoints se evalúan y
promueven.

**Política 2026-07-19:** todos los modelos nativos Google se manejan directo por Google Cloud/Vertex AI. Las
filas Google que permanezcan aquí prueban que Fal las lista, no autorizan su uso. Fal se reserva para modelos
no-Google y utilidades allowlisted.

Catálogo de **capacidades y modelos** disponibles en Greenhouse a través de **Fal.ai** — un agregador que frontea, bajo una sola API, cientos de modelos de generación de **imagen, video, audio, 3D, LLM y training**. Este doc es exhaustivo **a nivel de capacidad** (cubre todas las familias/categorías que Fal.ai expone) y **representativo-verificado a nivel de modelo** (slugs concretos verificados el 2026-07-06).

> ⚠️ **El catálogo de Fal es GRANDE (1.000+ Model APIs) y VOLÁTIL.** Discovery programático usa
> `GET https://api.fal.ai/v1/models`, que expone búsqueda, estado, OpenAPI y `enterprise_status`; pricing se
> consulta por la API oficial. La ficha del modelo sigue siendo evidencia complementaria. Verificar slug,
> operación, schema, enterprise status, licencia y precio antes de incorporar; este inventario no es allowlist.

### Cómo llamar cualquier modelo (patrón único)

Todo modelo se invoca igual — pasas su **slug** + su **input** al cliente canónico:

```ts
import { runFalModel } from '@/lib/ai/fal'

const res = await runFalModel<{ images?: Array<{ url: string }> }>({
  model: 'fal-ai/flux/schnell',                // el slug del catálogo
  input: { prompt: '…', image_size: 'square', num_images: 1 }  // el input schema de ESE modelo
})
// res.ok, res.output, res.errorDetail, res.httpStatus, res.latencyMs
```

- **Model-agnostic:** cambiar de capacidad = cambiar el `slug` + el `input`. El cliente hace submit → poll → result (queue API).
- **Secreto** server-side vía `FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key` (GCP Secret Manager). NUNCA hardcodear la key.
- **Out-of-band, NO runtime del producto:** el cliente Greenhouse es un puente de laboratorio. El runtime
  productivo futuro pertenece al repositorio separado de Creative Studio.
- **Gotcha queue URLs:** para slugs con sub-path (`fal-ai/flux/schnell`), Fal.ai devuelve `status_url`/`response_url` en el **app padre** (`fal-ai/flux/requests/...`). `runFalModel` ya usa esas URLs; nunca reconstruirlas a mano (da HTTP 405). La cola se direcciona por **app** (los dos primeros segmentos del slug), no por el slug completo: `minimax/h3/text-to-video` → `queue.fal.run/minimax/h3/requests/<id>`. El único punto que reconstruye el handle es el retome por `--request-id` de `pnpm ai:fal`, que usa esa regla y **avisa** si no coincide con el `status_url` que devolvió fal.
- **⚠️ Gotcha del prefijo `fal-ai/` (corregido 2026-09-16 contra el API de modelos):** el prefijo **depende del endpoint y su versión, no del proveedor**. Dentro de ByteDance conviven ambos: **Seedream 5** va **SIN** prefijo (`bytedance/seedream/v5/pro/text-to-image`), pero **Seedream 4 y 4.5** van **CON** prefijo (`fal-ai/bytedance/seedream/v4.5/text-to-image`, `fal-ai/bytedance/seedream/v4/...`). Lo mismo en Seedance: **2.0 y 2.5 SIN** prefijo (`bytedance/seedance-2.5/text-to-video`), **v1 y v1.5 CON** prefijo (`fal-ai/bytedance/seedance/v1.5/pro/...`); y **Seed Audio** vive en `fal-ai/seed-audio` (`bytedance/seed-audio` da 404). La regla anterior («todo ByteDance va sin prefijo») era falsa. Lo que sí se mantiene: **el prefijo equivocado falla en silencio** — el submit responde 200, el result da 404 (`Path ... not found`) e `inference_time` ≈ 0.02s (no generó nada). Por eso el slug se declara **entero** y nunca se compone concatenando proveedor + versión. Fuente de verdad de slugs: el registro `src/lib/ai/fal-capabilities.ts` (con `verifiedAt`) para las capacidades registradas; para el resto, el método barato de abajo, no este catálogo.
- **🔬 Método barato para verificar un slug (verificado en vivo 2026-07-19, sin generar ni gastar):** `POST {}` (body vacío) a `https://fal.run/<slug>` → **404** = la app no existe · **422** = la app existe (falló la validación de input por falta de campos). Confirma cualquier slug así antes de incorporarlo, sin correr una generación real.
- **Dirección de arte:** video → skill `motion-design-studio`; audio → `audio-studio`; elección de modelo/estética → `design-studio`; still images de UI/marca → `greenhouse-ai-image-generator`.

### Carril operativo: `pnpm ai:fal` (desde 2026-09-16)

CLI de terminal para operar fal sin escribir código. Es **hermano** de `pnpm ai:image`, no su reemplazo:
`ai:image` habla el contrato OpenAI (model/quality/size) y fal tiene un esquema de input **por endpoint**. Es
out-of-band: el runtime de imagen del producto sigue siendo `src/lib/ai/image-generator.ts`.

- **Registro model-agnostic** (`src/lib/ai/fal-capabilities.ts`): cada capacidad declara `id`, `slug` literal,
  `kind` (`image|video|training`), `operation`, `inputMediaField` (`image_url|image_urls|null`), `inputMedia`
  (`none|one|many`), `requiresPrompt`, `outputKey` (`images|layers|video`), `verifiedAt` (fecha o `null`) y, en
  video, un contrato `video` (`maxDurationSeconds`, `resolutions`, `aspectRatios`, `supportsAudioToggle`,
  `supportsBitrateMode`) y, en entrenadores, un contrato `training`. Una capacidad que no se puede operar por cola
  declara `unsupportedReason` y el CLI se niega a correrla explicando por qué. `--model <slug>` acepta cualquier slug de fal aunque no esté registrado, con
  `--input '<json>'` como escape hatch para campos no cubiertos.
- **Estado real:** `pnpm ai:fal --list` (gratis) agrupa las capacidades en IMAGE / VIDEO / TRAINING, imprime su
  slug y `verificada <fecha>` o `SIN VERIFICAR`, y marca `[NO OPERABLE POR COLA]`. Ante una capacidad sin verificar
  el CLI **advierte antes de gastar**.
- **Entradas locales:** los endpoints de edit/layerize/i2v/r2v piden URLs, no bytes. `uploadFalFile` hace
  `POST https://rest.alpha.fal.ai/storage/upload/initiate` con `{content_type, file_name}` → `{file_url, upload_url}`,
  `PUT` de los bytes a `upload_url`, y el modelo consume `file_url`. El CLI lo hace solo con cada `--image`,
  `--end-image`, `--audio` y `--video` local; las URLs `https://` pasan tal cual. No usar data URI grandes (ya
  fallaron en el puente).
- **Validación antes de encolar:** cada flag se valida en local contra el contrato del endpoint y falla nombrando
  lo aceptado: duración, resolución, aspecto, `--bitrate`, `--prompt-expansion`, LoRAs, trayectoria de cámara e
  hiperparámetros de entrenamiento. Los flags de video en una capacidad de imagen fallan, y los de entrenamiento
  fuera de un entrenador también. Llegar al proveedor con un valor inválido costaría la cola.
- **`--task` (brecha cerrada 2026-09-16):** sólo Seedance 2.5 reference-to-video lo acepta. Antes el CLI lo dejaba
  pasar en todo reference-to-video y el r2v de Seedance 2.0 lo rechazaba **después** de encolar; ahora se rechaza en
  local en cualquier otra capacidad.
- **`request_id` y retome:** el CLI imprime el `request_id` apenas fal encola. Si el polling local vence (HTTP 408),
  el trabajo **sigue corriendo y cobrando en fal**; el CLI imprime el comando de retome
  `pnpm ai:fal --capability <id> --request-id <id>`. Retomar no reenvía ni vuelve a cobrar (verificado: el archivo
  descargado es idéntico byte a byte). Aplica a todas las capacidades, no sólo a H3.
- **Timeouts por defecto:** imagen 3 min, video 15 min, entrenamiento 3 h (`--timeout <ms>` los sobrescribe).
- **Costo:** fal **no devuelve `usage`** en estas respuestas, así que el CLI no reporta costo por corrida (a
  diferencia de `ai:image`). Consultar el pricing vigente del proveedor, con fecha, antes de correr.
- **Qué NO va por aquí:** Gemini Omni se conecta directo por las plataformas de Google, no por fal (fue retirado
  del registro). Flux 3 no está conectado. Minimax H3 **sí** está conectado desde 2026-09-16 (ver §Minimax H3),
  salvo `h3max-director`, que no es operable por cola.

Capacidades registradas al 2026-09-16:

| id | Slug | Operación | Verificada |
|---|---|---|---|
| `seedream5-pro` | `bytedance/seedream/v5/pro/text-to-image` | texto a imagen | ✅ 2026-09-16 (56,8 s) |
| `seedream5-pro-edit` | `bytedance/seedream/v5/pro/edit` | edición por referencia (hasta 10) | ✅ 2026-09-16 (116,2 s) |
| `seedream5-pro-layerize` | `bytedance/seedream/v5/pro/layerize` | separación por capas | ✅ 2026-09-16 (83,2 s) |
| `seedream5-lite` | `bytedance/seedream/v5/lite/text-to-image` | texto a imagen | ✅ 2026-09-16 (43,8 s) |
| `seedream5-lite-edit` | `bytedance/seedream/v5/lite/edit` | edición por referencia | ✅ 2026-09-16 (53,5 s) |
| `seedance25-t2v` · `-i2v` · `-r2v` | `bytedance/seedance-2.5/{text,image,reference}-to-video` | video | t2v ✅ · i2v ✅ · r2v sin verificar |
| `seedance20-t2v` · `-i2v` · `-r2v` | `bytedance/seedance-2.0/{text,image,reference}-to-video` | video | t2v ✅ (4K real) · i2v, r2v sin verificar |
| `seedance20-fast-*` · `-mini-*` · `-us-*` | `bytedance/seedance-2.0/{fast,mini,us}/{text,image,reference}-to-video` | video | sin verificar (9) |
| `h3-*` · `h3max-*` · `h3turbo-*` · `h3-train-*` | `minimax/h3*/…` (17 endpoints) | video + entrenamiento | 9 ✅ · 7 sin verificar · 1 no operable (ver §Minimax H3) |

**Conteo global al 2026-09-16:** 37 capacidades registradas (5 Seedream 5, 15 Seedance, 17 Minimax H3); **17
verificadas** contra el API real (5 Seedream 5, 3 Seedance, 9 H3). Pendiente de conectar: Flux 3.

No existe Seedream 5.1 en fal al 2026-09-16.

**Layerize** (`seedream5-pro-layerize`) recibe **una** imagen en `image_url` y **no requiere prompt** (acepta uno
opcional y `enhance_prompt_mode` `standard|fast`). Devuelve `layers`: primero la imagen base y luego hasta 16
capas ordenadas por `z_index`, cada una con `name`, `description`, `z_index`, `bounding_box` (normalizado y
absoluto) e `image`. Verificado sobre un key visual: 8 capas, la base 2048x1152 sin alfa y cada elemento recortado
a su bounding box **con canal alfa real** (por ejemplo 54% transparente en el isotipo), incluso en huecos internos.
El CLI descarga cada capa como `NN-<nombre>.png` y escribe `layers.json` con la metadata, que se perdería si sólo
se guardaran los PNG.

**Contratos Seedance por endpoint** (verificados en el OpenAPI de cada uno, 2026-09-16):

| Familia | Duración máx. | Resoluciones | `bitrate_mode` |
|---|---|---|---|
| Seedance 2.5 (`seedance25-*`) | 30 s | 480p · 720p · 1080p (sin 4K) | sí |
| Seedance 2.0 base (`seedance20-t2v/i2v/r2v`) | 15 s | 480p · 720p · 1080p · 4k (la única con 4K) | sí |
| Seedance 2.0 fast / us | 15 s | 480p · 720p | sí |
| Seedance 2.0 mini | 15 s | 480p · 720p | **no** |

Aspectos en todos: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`. Image-to-video acepta `end_image_url`
(último cuadro). Reference-to-video acepta `audio_urls` y `video_urls`; **sólo el r2v de 2.5** acepta `task`
`reference|editing|extension`. Output: `video` + `seed`. Corridas reales: `seedance25-t2v` (147 s → h264 854x480,
4,04 s, 97 cuadros), `seedance25-i2v` (194 s → h264 854x480, 4,04 s, con upload de imagen) y `seedance20-t2v`
(4K real: 3840x2160, 4,04 s).

### Minimax H3 (conectado 2026-09-16)

Slugs **SIN** prefijo `fal-ai/`. La cola se direcciona por la app (`minimax/h3`, `minimax/h3-max`,
`minimax/h3-max-turbo`), no por el slug completo.

| id CLI | Slug | Estado | Contrato | Precio fal (USD) |
|---|---|---|---|---|
| `h3-t2v` | `minimax/h3/text-to-video` | ✅ 2026-09-16 | 480P·768P·2K·4K (default 2K) · aspect t2v | 0,05 / s |
| `h3-i2v` | `minimax/h3/image-to-video` | ✅ 2026-09-16 | `image_url` + `end_image_url` opcional · sin aspect | 0,05 / s |
| `h3-r2v` | `minimax/h3/reference-to-video` | ✅ 2026-09-16 (sólo imagen de referencia; video/audio sin ejercitar) | referencias imagen/video/audio · aspect + `adaptive` | 0,05 / s |
| `h3-t2v-lora` | `minimax/h3/text-to-video/lora` | sin verificar (exige una LoRA) | como `h3-t2v` + `loras` | 0,0625 / s |
| `h3-i2v-lora` | `minimax/h3/image-to-video/lora` | sin verificar | como `h3-i2v` + `loras` | 0,0625 / s |
| `h3-r2v-lora` | `minimax/h3/reference-to-video/lora` | sin verificar | como `h3-r2v` + `loras` | 0,0625 / s |
| `h3max-t2v` | `minimax/h3-max/text-to-video` | ✅ 2026-09-16 | 480P·768P·1080P (default 768P) | 0,025 / s |
| `h3max-i2v` | `minimax/h3-max/image-to-video` | ✅ 2026-09-16 | como Max + `end_image_url` · sin aspect | 0,025 / s |
| `h3max-r2v` | `minimax/h3-max/reference-to-video` | ✅ 2026-09-16 (sólo imagen de referencia) | como Max + referencias | 0,025 / s |
| `h3max-camera` | `minimax/h3-max/camera-controls` | ✅ 2026-09-16 | imagen obligatoria · trayectoria de cámara · default 480P | 0,025 / s |
| `h3turbo-t2v` | `minimax/h3-max-turbo/text-to-video` | ✅ 2026-09-16 | 480P·768P·1080P (default 768P) | 0,0125 / s (la más barata) |
| `h3turbo-i2v` | `minimax/h3-max-turbo/image-to-video` | ✅ 2026-09-16 | como Turbo + `end_image_url` · sin aspect | 0,0125 / s |
| `h3max-director` | `minimax/h3-max/director` | **NO OPERABLE POR COLA** | stream realtime con prompts en vivo | — |
| `h3-train-t2v` | `minimax/h3/t2v/trainer` | sin verificar (se cobra por step) | entrenamiento LoRA | 0,005 / step (2000 steps ≈ 10) |
| `h3-train-i2v` | `minimax/h3/i2v/trainer` | sin verificar | entrenamiento LoRA | no consultado |
| `h3-train-flf2v` | `minimax/h3/flf2v/trainer` | sin verificar | entrenamiento LoRA | no consultado |
| `h3-train-ref2va` | `minimax/h3/ref2va/trainer` | sin verificar | entrenamiento LoRA | 0,015 / step (≈ 30) |

Precios consultados en la API de pricing de fal el 2026-09-16; son volátiles.

**Contrato (difiere de Seedance en la forma de los campos):**

- **Duración:** entero de 5 a 15 s, default 5, sin `auto` (en Seedance es texto y admite `auto`).
- **Resolución en mayúsculas.** H3 base: `480P|768P|2K|4K` (default `2K`). Max y Max Turbo: `480P|768P|1080P`
  (default `768P`; camera-controls, `480P`). El CLI compara sin distinguir mayúsculas y envía el valor canónico.
- **Aspect ratio:** t2v `21:9, 16:9, 4:3, 1:1, 3:4, 9:16` (default `16:9`); r2v agrega `adaptive` (default).
  Image-to-video **no** acepta aspect: el CLI lo rechaza porque el encuadre sale de la imagen.
- **Image-to-video:** `image_url` + `end_image_url` opcional (`--end-image`).
- **Reference-to-video:** `reference_image_urls` (máx. 9, `--image`), `reference_video_urls` (máx. 3, `--video`),
  `reference_audio_urls` (máx. 3, `--audio`). Pide al menos una referencia de cualquier tipo.
- **Audio:** no hay `bitrate_mode` ni `generate_audio`, pero el video **sale con pista de audio** (H3 genera
  ambiente/música y lo describe en `expanded_prompt`).
- **`prompt_expansion_mode` (`--prompt-expansion`):** base `disabled|fast|balanced|quality`, opcional. Max y Turbo
  `disabled|balanced|quality` y **obligatorio**: si no se pasa, el CLI envía `balanced` explícito. La salida trae
  `expanded_prompt` (el CLI muestra un extracto; `--json` lo trae entero).
- **LoRA (`/lora`):** `loras` obligatorio, hasta 3, `--lora <path[@scale]>` repetible; `path` es URL o repo de
  Hugging Face; `scale` de 0 a 4.
- **Camera-controls:** `--image` obligatoria, prompt opcional (sin prompt: escena congelada, sólo se mueve la
  cámara), `--camera-trajectory '<json>'` con un arreglo de hasta 12 keyframes `{distance, elevation (-90..90),
  azimuth, time (0..1)}`.
- **Entrenadores (`kind: 'training'`):** `--training-data <zip|url>` (el zip local se sube como `application/zip`)
  → `training_data_url`; `--steps` 1–15000 (default 2000), `--rank` `8|16|32|64|128` (default 32),
  `--learning-rate` 1e-6..1 (default 2e-4), `--trigger <frase>`. El resto de hiperparámetros va por `--input`:
  `number_of_frames` 22–124, `frame_rate` 8–60, `resolution` `low|medium|high`, `aspect_ratio`,
  `split_input_into_scenes`, `auto_scale_input`, `strict_dataset`, `debug_dataset`; condicionamiento: i2v
  `first_frame_conditioning_p` 0.5; flf2v first 0.2 / last 0.2 / first_last 0.4; ref2va
  `reference_conditioning_p` 0.9 + `resume_from_lora_url`. Salida: `lora_file`, `config_file`, `debug_dataset`
  (el CLI descarga `lora.*`, `config.*`, `debug-dataset.*`). Timeout por defecto 3 h.
- **Director (`h3max-director`):** fal lo lista activo, pero es un stream continuo con prompts en vivo, no un
  trabajo de cola: su OpenAPI de cola da 404 y el POST responde `Application h3-max not found` (medido
  2026-09-16). El CLI se niega y lo explica; operarlo necesitaría un cliente realtime.

**Evidencia de verificación:** 9 corridas reales, todas 832x480, 5,18 s y con audio; latencias de 2,7 a 8 s. Se
revisaron cuadros: cada salida corresponde a su pedido y camera-controls mueve la cámara sobre la escena
congelada. Costo estimado por precio unitario: ≈ USD 1,4. La evidencia quedó fuera del repo y no se versiona.

### Modelo de pricing (resumen)

Fal.ai cobra **por uso**, con la unidad según la modalidad (siempre confirmar en la página del modelo):

| Modalidad | Unidad típica | Ejemplo verificado |
|---|---|---|
| Imagen | por imagen / por megapíxel | FLUX schnell ~US$0.003/img |
| Video | por segundo | Seedance 2.0 observado 2026-07-19: ~US$0.3034/s 720p con audio; Fast ~US$0.2419/s. Precio volátil: consultar API |
| Audio (TTS) | por carácter / por segundo | según proveedor |
| 3D | por generación | Hunyuan3D ~US$0.16 · TripoSR ~US$0.07 |
| Training (LoRA) | por run de entrenamiento | según modelo base |

**Leyenda de verificación:** ✅ = slug visto live en el catálogo 2026-07-06 · 🔎 = familia confirmada vía búsqueda (verificar slug exacto en la página del modelo).

---

## Matriz de capacidades

| Capacidad | ¿Disponible? | Sección |
|---|---|---|
| Text-to-Image | ✅ | [1](#1-text-to-image) |
| Image editing / Image-to-Image (inpaint, kontext, controlnet) | ✅ | [2](#2-image-editing--image-to-image) |
| Upscaling / enhancement de imagen | ✅ | [3](#3-upscaling--enhancement-imagen) |
| Background removal / segmentación | ✅ | [4](#4-background-removal--segmentación) |
| Text-to-Video | ✅ | [5](#5-text-to-video) |
| Image-to-Video / Reference-to-Video | ✅ | [6](#6-image-to-video--reference-to-video) |
| Video-to-Video (edit, restyle, restore, lipsync, upscale, reframe) | ✅ | [7](#7-video-to-video) |
| Text-to-Speech (TTS) / voces | ✅ | [8](#8-text-to-speech--voces) |
| Música / Sound effects / Audio generativo | ✅ | [9](#9-música--sound-effects) |
| Speech-to-Text / audio-to-audio (voice changer, isolation) | ✅ | [10](#10-speech-to-text--audio-to-audio) |
| Image-to-3D / Text-to-3D | ✅ | [11](#11-3d) |
| LLM / Vision-Language | ✅ | [12](#12-llm--vision-language) |
| Training / Fine-tuning (LoRA) | ✅ | [13](#13-training--fine-tuning) |

---

## 1. Text-to-Image

| Familia | Modelo | Slug | Nota |
|---|---|---|---|
| FLUX | FLUX.1 [schnell] | `fal-ai/flux/schnell` ✅ | ultra-rápido/barato (~$0.003) |
| FLUX | FLUX.1 [dev] | `fal-ai/flux/dev` ✅ | dev, calidad alta |
| FLUX | FLUX.2 [pro] | `fal-ai/flux-2-pro` ✅ | frontier propietario |
| FLUX | FLUX.2 [dev] | `fal-ai/flux-2` ✅ | |
| FLUX | FLUX.2 [klein] 9B | `fal-ai/flux-2/klein/9b` ✅ | modelo abierto 9B |
| FLUX | FLUX1.1 [pro] | `fal-ai/flux-pro/v1.1` ✅ | |
| FLUX | FLUX1.1 [pro] ultra | `fal-ai/flux-pro/v1.1-ultra` ✅ | alta resolución |
| FLUX | FLUX LoRA | `fal-ai/flux-lora` ✅ | inferencia con LoRA custom |
| Nano Banana (Google) | Nano Banana 2 | `fal-ai/nano-banana-2` ✅ | |
| Nano Banana | Nano Banana Pro | `fal-ai/nano-banana-pro` ✅ | |
| Nano Banana | Nano Banana | `fal-ai/nano-banana` ✅ | |
| Nano Banana | Nano Banana Lite | `google/nano-banana-lite` · `google/nano-banana-2-lite` ✅ | |
| OpenAI | GPT Image 2 | `openai/gpt-image-2` ✅ | (misma familia que nuestro runtime OpenAI) |
| xAI | Grok Imagine Image | `xai/grok-imagine-image` ✅ | |
| xAI | Grok Imagine Pro | `xai/grok-imagine-image/quality/text-to-image` ✅ | |
| Seedream (ByteDance) | Seedream 4.5 | `fal-ai/bytedance/seedream/v4.5/text-to-image` ✅ | **CON** prefijo (sin él da 404; corregido 2026-09-16) |
| Seedream | Seedream 4.0 | `fal-ai/bytedance/seedream/v4/text-to-image` ✅ | **CON** prefijo |
| Seedream | Seedream 5.0 Lite | `bytedance/seedream/v5/lite/text-to-image` ✅ | divergencia y lotes rápidos |
| Seedream | Seedream 5.0 Pro | `bytedance/seedream/v5/pro/text-to-image` ✅ | materialidad, atmósfera y desarrollo de look; `pnpm ai:fal --capability seedream5-pro` |
| Krea | Krea 2 Turbo | `fal-ai/krea-2/turbo` ✅ | |
| Krea | Krea 2 Turbo LoRA | `fal-ai/krea-2/turbo/lora` ✅ | |
| Ideogram | Ideogram V4 Instant / Fast | `ideogram/v4/instant` · `ideogram/v4/fast` ✅ | fuerte en **texto en imagen** |
| Ideogram | Ideogram V3 | `fal-ai/ideogram/v3` ✅ | |
| Z-Image | Z-Image Turbo | `fal-ai/z-image/turbo` ✅ | |
| Recraft | Recraft V3 / V4.1 | `fal-ai/recraft/*` 🔎 | **vectores reales** (SVG) + control de paleta |
| Google | Imagen 4 | `fal-ai/imagen4/*` 🔎 | **Ya no lo corremos directo vía Vertex:** `imagen-4.0-generate-001` fue retirado por Google y responde 404 (TASK-1851). El carril Google del helper es `google-gemini-image` sobre `gemini-3.1-flash-image` |
| Otros | Qwen Image, HiDream, Stable Diffusion 3.5, Luma Photon | 🔎 | verificar slug en catálogo |

## 2. Image editing / Image-to-Image

Edición dirigida por prompt, inpainting, reference/kontext, controlnet.

| Modelo | Slug | Nota |
|---|---|---|
| Nano Banana 2 Edit | `fal-ai/nano-banana-2/edit` ✅ | |
| Nano Banana Pro Edit | `fal-ai/nano-banana-pro/edit` ✅ | |
| Nano Banana Edit | `fal-ai/nano-banana/edit` ✅ | |
| Nano Banana Lite Edit | `google/nano-banana-lite/edit` ✅ | |
| GPT Image 2 Edit | `openai/gpt-image-2/edit` ✅ | edición image-to-image |
| FLUX.2 [pro] Edit | `fal-ai/flux-2-pro/edit` ✅ | |
| FLUX.1 Kontext [pro] | `fal-ai/flux-pro/kontext` ✅ | edición contextual / reference |
| Seedream 4.5 Edit | `fal-ai/bytedance/seedream/v4.5/edit` ✅ | **CON** prefijo (corregido 2026-09-16) |
| Seedream 5.0 Lite Edit | `bytedance/seedream/v5/lite/edit` ✅ | |
| Seedream 5.0 Pro Edit | `bytedance/seedream/v5/pro/edit` ✅ | edición de alta fidelidad para desarrollo de look; hasta 10 referencias |
| Seedream 5.0 Pro Layerize | `bytedance/seedream/v5/pro/layerize` ✅ | descompone una imagen en base + hasta 16 capas con alfa y bounding box; sin prompt (ver §Carril operativo) |
| Grok Imagine Image Edit | `xai/grok-imagine-image/edit` · `xai/grok-imagine-image/quality/edit` ✅ | |
| ControlNet / IP-Adapter (FLUX/SD) | `fal-ai/flux-controlnet-*` 🔎 | control estructural (pose, depth, canny) |

## 3. Upscaling / enhancement (imagen)

| Modelo | Slug | Nota |
|---|---|---|
| Clarity Upscaler | `fal-ai/clarity-upscaler` 🔎 | upscale de alta fidelidad + creative |
| AuraSR V2 | `fal-ai/aura-sr` 🔎 | GAN super-resolution, uso comercial |
| Recraft Crisp/Clarity Upscale | `fal-ai/recraft-clarity-upscale` 🔎 | |
| Crystal Upscaler (Clarity AI) | `clarityai/crystal-upscaler` 🔎 | retrato/rostro |
| SeedVR2 (imagen) | `fal-ai/seedvr/upscale/image` ✅ | |
| CCSR / ESRGAN / Creative Upscaler | 🔎 | familias clásicas de SR disponibles |

## 4. Background removal / segmentación

| Modelo | Slug | Nota |
|---|---|---|
| BiRefNet | `fal-ai/birefnet` · `fal-ai/birefnet/v2` ✅ | matting fino (pelo, transparencias) |
| Bria RMBG 2.0 | `fal-ai/bria/background/remove` 🔎 | |
| Bria Extract Object | `fal-ai/bria/extract-object` ✅ | recorte de objeto |
| rembg / Pixelcut | 🔎 | alternativas de bg-removal |
| Video background removal | 🔎 | remoción de fondo en video |

> Nota Greenhouse: para recorte de personajes con matting local **gratuito** ya usamos `pnpm ai:image:rmbg` (`@imgly/background-removal-node`). Fal es alternativa para casos donde queramos SR/matting server-side de más calidad.

## 5. Text-to-Video

| Familia | Slug | Nota |
|---|---|---|
| Seedance 2.5 (ByteDance) | `bytedance/seedance-2.5/text-to-video` ✅ | hasta 30 s, techo 1080p; `pnpm ai:fal --capability seedance25-t2v` |
| Seedance 2.0 (ByteDance) | `bytedance/seedance-2.0/text-to-video` · `/fast/...` · `/mini/...` · `/us/...` ✅ | audio nativo, camera control; base hasta 15 s y única con 4K, fast/mini/us techo 720p |
| Seedance 1.0 / 1.5 Pro | `fal-ai/bytedance/seedance/v1/pro/...` · `fal-ai/bytedance/seedance/v1.5/pro/...` 🔎 | generación previa; **CON** prefijo |
| Google Veo 3 | `fal-ai/veo3` · `fal-ai/veo3/fast` 🔎 | ~$0.20–0.40/s (std), ~$0.10–0.15/s (fast); 1080p |
| Google Veo 2 | `fal-ai/veo2` 🔎 | |
| Kling 3.0 / 2.5 | `fal-ai/kling-video/v3/*` · `v2.5-turbo/*` 🔎 | storyboarding multi-shot, Voice Binding |
| Wan (Alibaba) 2.6 / 2.2 | `fal-ai/wan/*` 🔎 | T2V/I2V/R2V; soporta LoRAs |
| Hunyuan Video (Tencent) | `fal-ai/hunyuan-video` 🔎 | modelo abierto |
| LTX Video 2.3 | `fal-ai/ltx-2.3-*` 🔎 | rápido/económico |
| PixVerse V6 | `fal-ai/pixverse/v6/*` ✅ | |
| Grok Imagine | `xai/grok-imagine-video/text-to-video` ✅ | |
| Google Gemini Omni Flash | `google/gemini-omni-flash` ✅ | listado por fal, **no se opera por fal**: se conecta directo por Google |
| Luma Dream Machine / Ray 2 | `fal-ai/luma-dream-machine/*` 🔎 | |
| Minimax H3 / H3 Max / H3 Max Turbo | `minimax/h3/text-to-video` · `minimax/h3-max/...` · `minimax/h3-max-turbo/...` ✅ | **SIN** prefijo; `pnpm ai:fal --capability h3turbo-t2v` (la más barata); ver §Minimax H3 |
| Minimax Hailuo (Video 01) | `fal-ai/minimax/video-01*` 🔎 | generación previa |
| Mochi 1 | `fal-ai/mochi-v1` 🔎 | abierto |
| Pika | `fal-ai/pika/*` 🔎 | |

## 6. Image-to-Video / Reference-to-Video

| Familia | Slug | Nota |
|---|---|---|
| Seedance 2.5 | `bytedance/seedance-2.5/image-to-video` · `/reference-to-video` ✅ | i2v admite `end_image_url`; r2v admite audio/video de referencia y `task` |
| Seedance 2.0 | `bytedance/seedance-2.0/image-to-video` · `/mini/...` · `/fast/...` · `/us/...` · `/reference-to-video` ✅ | reference-to-video fija personaje/producto |
| Minimax H3 / Max / Max Turbo | `minimax/h3*/image-to-video` · `/reference-to-video` · `minimax/h3-max/camera-controls` ✅ | i2v con `end_image_url` y sin aspect; r2v hasta 9 imágenes, 3 videos, 3 audios; camera-controls con trayectoria |
| Kling v3 Pro / Standard | `fal-ai/kling-video/v3/pro/image-to-video` · `/standard/...` ✅ | audio nativo |
| Kling 2.5 Turbo Pro | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` ✅ | |
| PixVerse V6 | `fal-ai/pixverse/v6/image-to-video` ✅ | |
| Happy Horse 1.1 (Alibaba) | `alibaba/happy-horse/v1.1/image-to-video` ✅ | |
| Grok Imagine | `xai/grok-imagine-video/image-to-video` · `/reference-to-video` · `/v1.5/image-to-video` ✅ | |
| Gemini Omni Flash | `google/gemini-omni-flash/image-to-video` · `/reference-to-video` ✅ | listado por fal, **no se opera por fal**: se conecta directo por Google |
| Wan 2.x | `fal-ai/wan/v2.2-a14b/image-to-video/lora` 🔎 | i2v con LoRAs |
| Veo 2 (i2v) | `fal-ai/veo2/image-to-video` 🔎 | |
| Luma Ray (i2v) | `fal-ai/luma-dream-machine/image-to-video` 🔎 | |

## 7. Video-to-Video

Edición, restyle, restauración, lipsync, upscale, reframe sobre video existente.

| Tarea | Modelo / Slug | Nota |
|---|---|---|
| Editar / extender | Grok Imagine `xai/grok-imagine-video/edit-video` · `/extend-video` ✅ | |
| Render→real / restore | LTX 2.3 Quality: `render-to-real`, `deblur`, `colorization`, `day-to-night`, `decompression`, `water-simulation`, `instant-shave`, `cross-eyed` ✅ | familia de transforms LTX |
| Upscale de video | `fal-ai/seedvr/upscale/video` 🔎 · Topaz-style upscalers 🔎 | |
| Lipsync | `fal-ai/sync-lipsync` · `fal-ai/latentsync` · `fal-ai/musetalk` 🔎 | sincronía labial voz↔video |
| Reframe / aspect | `fal-ai/*/reframe` 🔎 | cambio de aspect ratio |
| Face swap / motion transfer | 🔎 | disponible según catálogo |

## 8. Text-to-Speech / voces

| Proveedor | Modelo | Slug |
|---|---|---|
| ElevenLabs | TTS Multilingual v2 | `fal-ai/elevenlabs/tts/multilingual-v2` 🔎 |
| ElevenLabs | TTS Turbo v2.5 | `fal-ai/elevenlabs/tts/turbo-v2.5` 🔎 |
| ElevenLabs | TTS Eleven v3 | `fal-ai/elevenlabs/tts/eleven-v3` 🔎 |
| ElevenLabs | Text-to-Dialogue (v3) | `fal-ai/elevenlabs/text-to-dialogue/eleven-v3` 🔎 |
| MiniMax | Speech-02 HD | `fal-ai/minimax/speech-02-hd` 🔎 |
| xAI | TTS v1 | `xai/tts/v1` ✅ |
| Open source | Kokoro / Dia / F5 TTS / Chatterbox | `fal-ai/kokoro` · `fal-ai/f5-tts` … 🔎 |
| PlayAI (PlayHT) | TTS | `fal-ai/playai/tts/*` 🔎 |

> ⚠️ **Licenciamiento (regla de `audio-studio`):** el modelo hosteado en Fal conserva su propia licencia comercial de voz/música — verificarla igual que si lo corrieras directo. Fal no la cambia.

## 9. Música / Sound effects

| Tarea | Modelo / Slug | Nota |
|---|---|---|
| Sound effects | ElevenLabs Sound Effects `fal-ai/elevenlabs/sound-effects` 🔎 | SFX desde texto |
| Música generativa | Stable Audio 🔎 · CassetteAI 🔎 · Lyria (Google) 🔎 · MiniMax Music 🔎 · Seed Audio (ByteDance) `fal-ai/seed-audio` ✅ (usa `prompt`; **CON** prefijo `fal-ai/`, verificado en vivo 2026-07-19) | verificar slug + licencia |
| Audio para video | MMAudio `fal-ai/mmaudio-v2` 🔎 | genera audio sincronizado a un video |

## 10. Speech-to-Text / audio-to-audio

| Tarea | Modelo / Slug |
|---|---|
| Speech-to-Text (transcripción) | Whisper / Wizper `fal-ai/wizper` 🔎 · ElevenLabs STT `fal-ai/elevenlabs/speech-to-text` 🔎 |
| Voice changer (speech-to-speech) | ElevenLabs Voice Changer `fal-ai/elevenlabs/voice-changer` 🔎 |
| Audio isolation (limpiar voz) | ElevenLabs Audio Isolation `fal-ai/elevenlabs/audio-isolation` 🔎 |

## 11. 3D

| Modelo | Slug | Nota |
|---|---|---|
| Hunyuan3D v2 (Tencent) | `fal-ai/hunyuan3d/v2` 🔎 | image→3D GLB, ~$0.16/gen, octree hasta 1024 |
| Hunyuan3D v3 | `fal-ai/hunyuan3d-v3/image-to-3d` 🔎 | |
| TripoSR | `fal-ai/triposr` 🔎 | rápido, ~$0.07/gen |
| Trellis / Trellis 2 | `fal-ai/trellis` · `fal-ai/trellis-2-lora` ✅ | 3D generativo nativo + LoRA |
| Hyper3D Rodin | `fal-ai/hyper3d/rodin` 🔎 | production-ready, text o image→3D |

## 12. LLM / Vision-Language

| Modelo | Slug | Nota |
|---|---|---|
| Any LLM (OpenRouter) | `openrouter/router/enterprise` ✅ | corre cualquier LLM vía OpenRouter |
| Vision-language / captioning | moondream · Florence-2 · LLaVA 🔎 | image-to-text |

> Para texto/LLM en Greenhouse el path canónico es `src/lib/ai/` (Gemini/Vertex, Anthropic, OpenAI). Fal-LLM es para casos out-of-band puntuales, no para reemplazar los clientes canónicos.

## 13. Training / Fine-tuning

| Modelo | Slug | Nota |
|---|---|---|
| FLUX LoRA trainer | `fal-ai/flux-lora-fast-training` · `fal-ai/flux-lora-general-training` 🔎 | entrenar sujeto/estilo/personaje |
| Krea 2 trainer | `fal-ai/krea-2-trainer` ✅ | LoRA sobre Krea 2 |
| Trellis 2 LoRA trainer | `fal-ai/trellis-2-lora-trainer` ✅ | LoRA 3D |
| Minimax H3 LoRA trainers | `minimax/h3/{t2v,i2v,flf2v,ref2va}/trainer` ✅ (sin verificar en corrida) | `pnpm ai:fal --capability h3-train-*`; cobro por step |
| Wan / Hunyuan video LoRA trainer | `fal-ai/wan-trainer` · `fal-ai/hunyuan-video-lora-trainer` 🔎 | LoRA de video |

---

## Reglas duras (recap)

- **NUNCA** hardcodear la key (`<id>:<secret>`); resolver server-side vía `FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key`.
- **NUNCA** instanciar un fetch/SDK paralelo a Fal en un módulo de dominio — extender `runFalModel`.
- **NUNCA** cablear Fal a un flujo runtime del producto (out-of-band: generar + subir por uploader; runtime de imagen = `src/lib/ai/image-generator.ts`).
- **NUNCA** reconstruir las polling URLs desde el slug (usar `status_url`/`response_url` del submit — da 405 si no). Única excepción: el retome por `--request-id`, que reconstruye por **app** (dos primeros segmentos) y avisa si no coincide.
- **NUNCA** tratar un timeout local (HTTP 408) como trabajo cancelado: sigue corriendo y cobrando en fal; retomar con `--request-id`.
- **NUNCA** componer un slug concatenando proveedor + versión ni asumir el prefijo `fal-ai/` por proveedor: depende del endpoint, y el error es silencioso (submit 200, result 404).
- **NUNCA** marcar `verifiedAt` en `fal-capabilities.ts` sin haber corrido la capacidad contra el API real.
- **SIEMPRE** subir archivos locales con `uploadFalFile` (lo hace `pnpm ai:fal`), no como data URI.
- **SIEMPRE** verificar slug + input schema + pricing en `https://fal.ai/models/<slug>` antes de un modelo nuevo (catálogo volátil).
- **SIEMPRE** aplicar la dirección de arte de la skill del dominio (video/audio/design/image) + el contrato visual Greenhouse (tokens AXIS) al asset producido.
- **SIEMPRE** confirmar la **licencia comercial** del modelo de audio/voz/música (Fal no la modifica).

## Fuentes

Catálogo live `https://fal.ai/models` (por categoría) + páginas de modelo (2026-07-06). Verificación de generación real: `runFalModel('fal-ai/flux/schnell')` → `ok:true` HTTP 200. Familias establecidas confirmadas vía `fal.ai/video`, `fal.ai/3d-models`, `fal.ai/elevenlabs`, `blog.fal.ai`.
