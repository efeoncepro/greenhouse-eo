# Greenhouse — Fal.ai Model & Capability Catalog V1

> **Tipo:** Referencia técnica agent-facing · **Version:** 1.0 · **Creado:** 2026-07-06 por Claude
> **Ultima verificacion parcial:** 2026-07-18 — Seedream 5.0 Lite/Pro y GPT Image 2
> **Contrato/acceso:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) → §Fal.ai
> **Cliente canónico:** [`src/lib/ai/fal.ts`](../../src/lib/ai/fal.ts) (`runFalModel`)

## Propósito

Catálogo de **capacidades y modelos** disponibles en Greenhouse a través de **Fal.ai** — un agregador que frontea, bajo una sola API, cientos de modelos de generación de **imagen, video, audio, 3D, LLM y training**. Este doc es exhaustivo **a nivel de capacidad** (cubre todas las familias/categorías que Fal.ai expone) y **representativo-verificado a nivel de modelo** (slugs concretos verificados el 2026-07-06).

> ⚠️ **El catálogo de Fal.ai es GRANDE (600+ modelos) y VOLÁTIL** (versiones nuevas/deprecaciones cada semana). Fal.ai **no tiene endpoint de "listar modelos"**. La **verdad live** es la web `https://fal.ai/models` (filtrable por categoría / búsqueda) y la página de cada modelo (`https://fal.ai/models/<slug>`), que trae el **input schema exacto + pricing**. **SIEMPRE verificar el slug + schema + precio en la página del modelo antes de llamar** — este doc lista los slugs que existían el 2026-07-06, no una verdad congelada.

### Cómo llamar cualquier modelo (patrón único)

Todo modelo se invoca igual — pasás su **slug** + su **input** al cliente canónico:

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
- **Out-of-band, NO runtime del producto:** generar acá + subir el asset por el uploader canónico. El runtime de imagen del producto sigue siendo `src/lib/ai/image-generator.ts` (OpenAI/Imagen).
- **Gotcha queue URLs:** para slugs con sub-path (`fal-ai/flux/schnell`), Fal.ai devuelve `status_url`/`response_url` en el **app padre** (`fal-ai/flux/requests/...`). `runFalModel` ya usa esas URLs; nunca reconstruirlas a mano (da HTTP 405).
- **Dirección de arte:** video → skill `motion-design-studio`; audio → `audio-studio`; elección de modelo/estética → `design-studio`; still images de UI/marca → `greenhouse-ai-image-generator`.

### Modelo de pricing (resumen)

Fal.ai cobra **por uso**, con la unidad según la modalidad (siempre confirmar en la página del modelo):

| Modalidad | Unidad típica | Ejemplo verificado |
|---|---|---|
| Imagen | por imagen / por megapíxel | FLUX schnell ~US$0.003/img |
| Video | por segundo | Seedance 2.0 Std ~US$0.3024/s · Veo 3 ~US$0.20–0.40/s · Veo 3 Fast ~US$0.10–0.15/s |
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
| Seedream (ByteDance) | Seedream 4.5 | `fal-ai/bytedance/seedream/v4.5/text-to-image` ✅ | |
| Seedream | Seedream 4.0 | `fal-ai/bytedance/seedream/v4/text-to-image` ✅ | |
| Seedream | Seedream 5.0 Lite | `fal-ai/bytedance/seedream/v5/lite/text-to-image` ✅ | divergencia y lotes rápidos |
| Seedream | Seedream 5.0 Pro | `fal-ai/bytedance/seedream/v5/pro/text-to-image` ✅ | materialidad, atmósfera y desarrollo de look |
| Krea | Krea 2 Turbo | `fal-ai/krea-2/turbo` ✅ | |
| Krea | Krea 2 Turbo LoRA | `fal-ai/krea-2/turbo/lora` ✅ | |
| Ideogram | Ideogram V4 Instant / Fast | `ideogram/v4/instant` · `ideogram/v4/fast` ✅ | fuerte en **texto en imagen** |
| Ideogram | Ideogram V3 | `fal-ai/ideogram/v3` ✅ | |
| Z-Image | Z-Image Turbo | `fal-ai/z-image/turbo` ✅ | |
| Recraft | Recraft V3 / V4.1 | `fal-ai/recraft/*` 🔎 | **vectores reales** (SVG) + control de paleta |
| Google | Imagen 4 | `fal-ai/imagen4/*` 🔎 | (también lo corremos directo vía Vertex) |
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
| Seedream 4.5 Edit | `fal-ai/bytedance/seedream/v4.5/edit` ✅ | |
| Seedream 5.0 Lite Edit | `fal-ai/bytedance/seedream/v5/lite/edit` ✅ | |
| Seedream 5.0 Pro Edit | `fal-ai/bytedance/seedream/v5/pro/edit` ✅ | edición de alta fidelidad para desarrollo de look |
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
| Seedance 2.0 (ByteDance) | `bytedance/seedance-2.0/text-to-video` · `/fast/...` · `/mini/...` ✅ | audio nativo, camera control, ~$0.30/s (std) |
| Seedance 1.0 Pro | `fal-ai/bytedance/seedance/v1/pro/...` 🔎 | generación previa |
| Google Veo 3 | `fal-ai/veo3` · `fal-ai/veo3/fast` 🔎 | ~$0.20–0.40/s (std), ~$0.10–0.15/s (fast); 1080p |
| Google Veo 2 | `fal-ai/veo2` 🔎 | |
| Kling 3.0 / 2.5 | `fal-ai/kling-video/v3/*` · `v2.5-turbo/*` 🔎 | storyboarding multi-shot, Voice Binding |
| Wan (Alibaba) 2.6 / 2.2 | `fal-ai/wan/*` 🔎 | T2V/I2V/R2V; soporta LoRAs |
| Hunyuan Video (Tencent) | `fal-ai/hunyuan-video` 🔎 | modelo abierto |
| LTX Video 2.3 | `fal-ai/ltx-2.3-*` 🔎 | rápido/económico |
| PixVerse V6 | `fal-ai/pixverse/v6/*` ✅ | |
| Grok Imagine | `xai/grok-imagine-video/text-to-video` ✅ | |
| Google Gemini Omni Flash | `google/gemini-omni-flash` ✅ | |
| Luma Dream Machine / Ray 2 | `fal-ai/luma-dream-machine/*` 🔎 | |
| Minimax Hailuo (Video 01) | `fal-ai/minimax/video-01*` 🔎 | |
| Mochi 1 | `fal-ai/mochi-v1` 🔎 | abierto |
| Pika | `fal-ai/pika/*` 🔎 | |

## 6. Image-to-Video / Reference-to-Video

| Familia | Slug | Nota |
|---|---|---|
| Seedance 2.0 | `bytedance/seedance-2.0/image-to-video` · `/mini/...` · `/fast/...` · `/reference-to-video` ✅ | reference-to-video fija personaje/producto |
| Kling v3 Pro / Standard | `fal-ai/kling-video/v3/pro/image-to-video` · `/standard/...` ✅ | audio nativo |
| Kling 2.5 Turbo Pro | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` ✅ | |
| PixVerse V6 | `fal-ai/pixverse/v6/image-to-video` ✅ | |
| Happy Horse 1.1 (Alibaba) | `alibaba/happy-horse/v1.1/image-to-video` ✅ | |
| Grok Imagine | `xai/grok-imagine-video/image-to-video` · `/reference-to-video` · `/v1.5/image-to-video` ✅ | |
| Gemini Omni Flash | `google/gemini-omni-flash/image-to-video` · `/reference-to-video` ✅ | |
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
| Música generativa | Stable Audio 🔎 · CassetteAI 🔎 · Lyria (Google) 🔎 · MiniMax Music 🔎 · Seed Audio (ByteDance) 🔎 | verificar slug + licencia |
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
| Wan / Hunyuan video LoRA trainer | `fal-ai/wan-trainer` · `fal-ai/hunyuan-video-lora-trainer` 🔎 | LoRA de video |

---

## Reglas duras (recap)

- **NUNCA** hardcodear la key (`<id>:<secret>`); resolver server-side vía `FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key`.
- **NUNCA** instanciar un fetch/SDK paralelo a Fal en un módulo de dominio — extender `runFalModel`.
- **NUNCA** cablear Fal a un flujo runtime del producto (out-of-band: generar + subir por uploader; runtime de imagen = `src/lib/ai/image-generator.ts`).
- **NUNCA** reconstruir las polling URLs desde el slug (usar `status_url`/`response_url` del submit — da 405 si no).
- **SIEMPRE** verificar slug + input schema + pricing en `https://fal.ai/models/<slug>` antes de un modelo nuevo (catálogo volátil).
- **SIEMPRE** aplicar la dirección de arte de la skill del dominio (video/audio/design/image) + el contrato visual Greenhouse (tokens AXIS) al asset producido.
- **SIEMPRE** confirmar la **licencia comercial** del modelo de audio/voz/música (Fal no la modifica).

## Fuentes

Catálogo live `https://fal.ai/models` (por categoría) + páginas de modelo (2026-07-06). Verificación de generación real: `runFalModel('fal-ai/flux/schnell')` → `ok:true` HTTP 200. Familias establecidas confirmadas vía `fal.ai/video`, `fal.ai/3d-models`, `fal.ai/elevenlabs`, `blog.fal.ai`.
