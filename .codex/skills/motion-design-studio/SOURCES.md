# SOURCES — motion-design-studio

> **Núcleo verificado as-of 2026-07.** El **craft** (12 principios, timing, lenguaje de cámara,
> edición, sonido, grade) es **estable** y no se reverifica. El **landscape de video IA** es
> **muy volátil** (por mes: qué modelo lidera, features de cámara/consistencia, pricing,
> deprecaciones). Regla dura: nunca cites de memoria un modelo/feature/pipeline de video IA —
> corre `WebSearch`/`WebFetch` y actualiza el `as-of` inline.

## Tabla de volatilidad por tema

| Tema | Volatilidad | Reverificar antes de afirmar… | Módulo |
|---|---|---|---|
| 12 principios / peso / anticipación / arcos | **estable** | — | 01 |
| Timing / easing / ritmo / frame rate | **estable** | — | 02 |
| Lenguaje cinematográfico (cámara, lente, luz, composición) | **estable** | — | 03 |
| Storyboard / animatic / montaje / sonido / grade | **estable** | — | 04, 06, 07, 08 |
| Tendencias visuales de motion del año | **anual/semestral** | qué estética domina | 05, 07 |
| Qué modelo de video IA lidera / features | **volátil (mensual)** | Higgsfield/Runway/Seedance/Veo/Kling/Omni, camera control, consistencia | 09 |
| Versiones / pricing / deprecaciones de modelos | **volátil (mensual)** | nº versión, $/s, 4K/8K, duración, shutdowns | 09 |
| Capacidades de Magnific / Higgsfield MCP | **trimestral** | qué tool/endpoint/feature hace qué | 09, 10, STUDIO_TOOLING |
| Herramientas de craft (AE/Blender/DaVinci) | **anual** | features nuevas de la app | 05, 06, 08, 10 |
| VFX craft (compositing/keying/roto/tracking/CGI/sim) | **estable** | — | 11 |
| Herramientas AI-VFX (roto/track/relight/mocap) | **volátil (mensual)** | qué tool automatiza qué, cuál lidera | 11 |
| Specs de entrega (loudness, codecs, tamaños) | **semestral** | targets exactos por destino | 08, 10 |

## Acceso programático — Fal.ai API (desde 2026-07-06)

Además del MCP Higgsfield, Greenhouse tiene un path API out-of-band a Fal.ai mediante el cliente canónico
`src/lib/ai/fal.ts` → `runFalModel({ model, input })`. Nunca hardcodear `FAL_API_KEY`; resolverla server-side
con `FAL_API_KEY_SECRET_REF`. Verificar slug, schema y pricing en `fal.ai/models` antes de cada producción.
Catálogo: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`; contrato:
`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

**Slug verificado en vivo (2026-07-19).** Seedance 2.0 (ByteDance) va **SIN** el prefijo `fal-ai/` —
`bytedance/seedance-2.0/text-to-video`. Con `fal-ai/bytedance/...` el submit responde 200 pero el *result*
da **404** (`Path /... not found`, `inference_time` ≈ 0.02s) y no genera nada. **Content-policy del audio
nativo:** Seedance 2.0 genera audio nativo que a veces cae en la policy del proveedor (un **422 en el
*result*** = rechazo del proveedor, no error de input); con un prompt neutro completa limpio. **Método barato
para chequear un slug sin gastar:** `POST {}` (body vacío) a `https://fal.run/<slug>` → **404** = la app no
existe · **422** = la app existe (falló la validación de input por falta de campos).

**Economía de provider (as-of 2026-07-26):** BytePlus/ModelArk directo es la ruta de volumen para Seedance 2.0;
Fal sirve como gateway de prototipo/fallback, pero puede agregar markup. Para FLUX.2 y Recraft hay paridad pública
en los endpoints comparados; decidir por SLA, auth, observabilidad y derechos. FLUX 3 fue anunciado por BFL el
2026-07-23 en early access; **desde 2026-09-16 está disponible en Fal y conectado a `pnpm ai:fal`** (ver abajo).
Sigue sin evaluarse la ruta directa BFL.

**Minimax H3 conectado a `pnpm ai:fal` (verificado 2026-09-16).** Fuentes: OpenAPI de fal **por endpoint** (17
endpoints `minimax/h3/*`, `minimax/h3-max/*`, `minimax/h3-max-turbo/*`, sin prefijo `fal-ai/`), la **API de pricing
de fal** (USD: base 0,05/s · `/lora` 0,0625/s · Max y camera-controls 0,025/s · Max Turbo 0,0125/s · trainer t2v
0,005/step · ref2va 0,015/step; i2v/flf2v no consultados) y **9 corridas reales** (832×480, 5,18 s, con audio,
2,7–8 s de latencia; ≈ USD 1,4). LoRA y entrenadores sin verificar. `minimax/h3-max/director` no es operable por cola
(stream realtime; el OpenAPI de cola da 404). **Trampa de cola:** fal direcciona la cola por **APP** (dos primeros
segmentos del slug): `minimax/h3/text-to-video` → `queue.fal.run/minimax/h3/requests/<id>`. Uso y límites:
`workflows/engine-selection-by-fidelity-contract.md`.

**Flux 3 conectado a `pnpm ai:fal` (verificado 2026-09-16).** Fuentes: catálogo de modelos de fal y OpenAPI **por
endpoint** (12 endpoints `blackforestlabs/flux-3/*`, sin prefijo `fal-ai/`; en fal es un modelo de **video**), la
**API de pricing de fal** (USD por segundo: finales 0,085 · drafts 0,03 · `edit-video` 0,03 · `extend-video` 0,205 ·
su draft 0,06 · `draft-enhance` 0,085) y **corridas reales de los 12** (1280×704, 24 fps, 5,04 s; `draft-enhance`
entregó 1920×1088; latencias 40 s–4 min; ≈ USD 5 estimado por precio unitario). Hallazgos aislados en real:
`extend-video` exige pista de audio en el origen (sin audio, 422 genérico tras encolar) y entrega sólo la
continuación. Límite del origen de `edit`/`extend` (MP4 < 50 MB, < 15 s): leído del OpenAPI, no probado en el borde.

**Wan 3.0 conectado a `pnpm ai:fal` (2026-09-16; 1 de 6 verificado).** Fuentes: catálogo y OpenAPI de fal **por
endpoint** (6 endpoints `alibaba/wan-3.0/*` y `alibaba/wan-3.0-prime/*`, sin prefijo `fal-ai/`; son todos los de Wan
3.0: no hay edición ni imagen en 3.0, la edición de Wan es la 2.7 y no está conectada), la **API de pricing de fal**
(USD 0,05/s en base y Prime) y **1 corrida real** de `wan3-t2v` (480p, `auto` → 5,04 s, `--seed` respetado,
854×480 con audio). Los otros 5 fallaron con 403 `Exhausted balance` antes de encolar (sin costo): siguen sin
verificar hasta recargar el saldo de fal. Uso y límites: `workflows/engine-selection-by-fidelity-contract.md`.

**Ranking externo OpenArt Arena v1.0** (`https://openart.ai/arena/leaderboard`, leído 2026-09-16; preferencia de
usuarios, **no evidencia interna**, volátil): video → 1 Seedance 2.5 (1125) · 2 Wan 3.0 (1047) · 3 Seedance 2.0 ·
4 Seedance 2.0 Mini · 5 Google Omni Flash · 6 Flux 3 Video · 7 MiniMax H3 · 8 Kling 3.0 Omni · 9 HappyHorse 1.1 ·
10 Grok Imagine 1.5 · 11 PixVerse V6; Wan 3.0 es #1 en la subcategoría Video Editing. Reverificar antes de citarlo.

**Evaluados en fal, no conectados (catálogo + OpenAPI 2026-09-16, sin corridas):** **Kling 3** (31 endpoints
`fal-ai/kling-video/{o3,v3}/…` + `fal-ai/kling-image/…`; O3 standard/pro USD 0,14/s, 4k 0,42/s; multi-shot,
`elements` con voz, motion-control, 4K) y **Grok Imagine** (14 endpoints `xai/…`; video v1.5 USD 0,01/s). Detalle
en el workflow § "Candidatos evaluados, no conectados". **Gemini Omni Flash** también está en fal
(`google/gemini-omni-flash/*`), pero se opera **directo por Google**, nunca por fal (decisión del operador).

**Seedance video a video (lectura del catálogo y OpenAPI de fal, 2026-09-16; sin corridas).** fal no expone un
endpoint video-to-video de Seedance: vive en `reference-to-video`. Sólo 2.5 tiene `task` (`reference` · `editing` ·
`extension`); 2.0 usa el video sólo como guía. Duración mínima 4 s en todos; referencia visual obligatoria; topes de
referencias por versión. `editing`/`extension` **siguen sin verificar en real**. Uso y comparación con Flux 3:
`workflows/engine-selection-by-fidelity-contract.md` § "Video a video: qué motor".

## Fuentes base (as-of 2026-07)

**Tendencias motion / animación 2026**
- Envato Elements — 11 Motion Design Trends 2026 — https://elements.envato.com/learn/motion-design-trends
- Hatch Studios — Top Video & Animation Trends 2026 — https://hatchstudios.com/top-video-and-animation-trends-to-know-in-2026/
- SonduckFilm — 10 Motion Graphic Design Trends 2026 — https://www.sonduckfilm.com/tutorials/motion-trends/
- Renderforest — Logo Animation Trends 2026 — https://www.renderforest.com/blog/logo-animation-trends

**Modelos de video IA + workflow cinematográfico**
- Black Forest Labs — FLUX 3 announcement — https://bfl.ai/blog/flux-3
- Google AI — Gemini video generation / Omni — https://ai.google.dev/gemini-api/docs/video
- Google DeepMind — Gemini Omni — https://deepmind.google/models/gemini-omni/
- BytePlus — Seedance 2.0 API — https://docs.byteplus.com/en/docs/ModelArk/2300461
- BytePlus — Seedance 2.5 product promotion — https://ark.volcengine.com/promotion?modelName=seedance-2-5
- fal.ai — Seedance 2.5 text-to-video — https://fal.ai/models/bytedance/seedance-2.5/text-to-video
- fal.ai — Seedance 2.5 image-to-video — https://fal.ai/models/bytedance/seedance-2.5/image-to-video
- fal.ai — Seedance 2.5 reference-to-video — https://fal.ai/models/bytedance/seedance-2.5/reference-to-video
- fal.ai — Seedance 2.5 OpenAPI expansion/model search — https://fal.ai/docs/platform-apis/v1/models
- fal.ai — Queue inference — https://fal.ai/docs/documentation/model-apis/inference/queue
- fal.ai — Media expiration — https://fal.ai/docs/documentation/model-apis/media-expiration
- Higgsfield — 5 Best AI Video Models 2026 — https://higgsfield.ai/blog/5-Best-AI-Video-Models-2026-Tested-Compared
- FrankX — Ultimate Higgsfield Workflow 2026 (Soul ID + Cinema Studio + Claude MCP) — https://www.frankx.ai/blog/ultimate-higgsfield-workflow-2026
- Higgsfield — LipSync Studio — https://higgsfield.ai/lipsync-studio
- SelectHub — Runway AI vs Higgsfield AI 2026 — https://www.selecthub.com/ai-video-generator-software/runway-ai-vs-higgsfield-ai/
- WaveSpeed — Seedance vs Kling vs Sora vs Veo — https://wavespeed.ai/blog/posts/seedance-2-0-vs-kling-3-0-sora-2-veo-3-1-video-generation-comparison-2026/

**Prompt cinematográfico + control de cámara**
- Kling — AI Camera Control & Movement Prompts — https://kling.ai/blog/ai-camera-control-movement-prompts-guide
- TrueFan — Cinematic AI Video Prompts 2026 Playbook — https://www.truefan.ai/blogs/cinematic-ai-video-prompts-2026
- LetsEnhance — 12 Camera Movements for AI Video — https://letsenhance.io/blog/all/ai-video-camera-movements/

**Magnific (upscale/enhance) — tenemos MCP + API**
- Magnific — Video Upscaler Precision API — https://docs.magnific.com/api-reference/video/video-upscaler-precision/overview
- Magnific — plataforma creativa (formerly Freepik) — https://www.magnific.com/
- AI Tools DevPro — Magnific AI Complete Guide 2026 (API, Enterprise) — https://aitoolsdevpro.com/ai-tools/magnific-ai-guide/

**Craft tools (motion graphics)**
- Imagine.art — Best Tools for Motion Design 2026 (Traditional & AI) — https://www.imagine.art/blogs/best-tools-for-motion-design
- ChatCut — 5 Best Motion Graphics Software 2026 — https://chatcut.io/blog/best-motion-graphics-software

**VFX / AI-VFX (compositing, roto, tracking, mocap)**
- ActionVFX — Top 10 AI Tools Transforming VFX Workflows 2026 — https://www.actionvfx.com/blog/top-10-ai-tools-for-vfx-workflows
- Autodesk — AI in Visual Effects + Flow Studio (ex Wonder Dynamics) — https://www.autodesk.com/solutions/media-entertainment/ai-visual-effects
- Boris FX — Mocha Pro (planar tracking) — https://borisfx.com/products/mocha-pro/
- FXbuddy — AI Rotoscoping 2026 — https://fxbuddy.app/guides/ai-rotoscoping
- Beeble — Video to VFX (relighting) — https://beeble.ai/

## Matriz de modelos de VIDEO IA (as-of 2026-07 — SoT; reverificar mensual)

> Regla 2026: **no hay un "mejor" modelo — cada uno gana en un trabajo distinto.** El valor es
> elegir por toma y dirigir. Muchos se acceden bajo una sola suscripción vía **Higgsfield** (MCP).

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Higgsfield** (agregador, MCP) | 30+ modelos bajo 1 sub + **Cinema Studio** (presets de cámara: dolly/crash-zoom/orbit/crane/pan/tilt/tracking + focal length + física óptica) + **Soul ID** (consistencia de personaje: 3-5 fotos, entrena 5-10min) + **LipSync** (+voz ElevenLabs) + upscaling; **MCP genera video desde Claude** + CLI | dependes de su plataforma/créditos | **default de producción cinematográfica IA** con control de cámara y personaje consistente; es la mano conectada |
| **Runway Gen-4.5** | cine dirigido, tomas controladas, entiende **beats + coreografía de cámara** (pan/truck/handheld) | atado a su plataforma | tomas cinematográficas dirigidas con control fino |
| **Seedance 2.0** (ByteDance) | briefs detallados, camera moves, hasta **9 imágenes + 3 videos + 3 audios**, native audio, multi-shot, 4–15 s | QA físico/anatomía/continuidad; audio nativo sujeto a policy | anuncios, social punchy y tomas dirigidas por referencias; directo BytePlus para volumen, Fal para gateway |
| **Seedance 2.5** (ByteDance vía Fal) | T2V, I2V y R2V; 4–30 s; 480p/720p/1080p; audio nativo; R2V con hasta 30 imágenes, 10 videos, 10 audios y 50 archivos totales, citables por posición | No hay 4K, máscaras, storyboard JSON, shots estructurados, stems ni seed de entrada en el OpenAPI actual; los claims de producto/API directa deben separarse | Fal provider-supported, Globe gated; usarlo solo con route card y evidencia exacta |
| **Minimax H3** (vía Fal, `pnpm ai:fal`) | tres tiers: **Max Turbo** (0,0125 USD/s, divergencia rápida), **Max** (0,025/s; `camera-controls` mueve la cámara sobre una imagen congelada, hasta 12 keyframes), **base** (0,05/s, única H3 con 2K/4K); LoRA + entrenadores para marca/personaje; T2V/I2V/R2V (9 imágenes + 3 videos + 3 audios) | 5–15 s enteros; sin toggle de audio pero entrega audio; I2V sin aspect; LoRA/entrenadores sin verificar; `director` no operable por cola | exploración barata (Turbo 480P), cámara sobre KV aprobado (`h3max-camera`), 4K de hasta 15 s como alternativa a Seedance 2.0 base; verificado 2026-09-16 |
| **Kling 3.0** (vía Higgsfield; vía fal = evaluado, no conectado) | **storyboarding multi-shot + Voice Binding** (voz consistente 6 cortes/5 idiomas), económico | control fino | narrativas multi-corte con voz consistente; económico |
| **Veo 3.1 / 3.0 Fast** (`veo-3.0-fast-generate-001`, Google) | broadcast-ready, frame rate de cine, **sync audio-visual integrado**, hasta 4K; render **one-shot** vía `predictLongRunning` (async) | **one-shot: sin edición conversacional** (regeneras); precio (~$0.10/s 720p) | entregable broadcast/cine, resolución alta o clip largo. Es el contraste de Omni: Omni edita hablándole (stateful), Veo no. Live-verificado para Globe |
| **Gemini Omni** (`gemini-omni-flash-preview`, Google) | multimodal any-to-any; **edición conversacional stateful** (`previous_interaction_id`) = su superpoder vs. one-shot; audio nativo contextual; **live-verificado 2026-07-20** (t2v keyless Vertex + edit stateful Gemini-key, ambos `200 completed`) | **solo 720p · 3–10s**, no MCP (REST), **deforma texto/logos/UI**, personas RAI-gated, editar uploaded video bloqueado EEA/CH/UK | **Interactions API (NO `generateContent`, que da `400`)**, **dos superficies**: (1) **Vertex KEYLESS** (ADC, sin key) = solo generación; (2) **Gemini-key** (`generativelanguage`) = Interactions completa + edit stateful. text/i2v + **reference-chaining**; UI/logo NO con IA. **Refinar no es exclusivo de Omni (2026-07-20):** el stateful es **uno de dos paradigmas** — el **reference-based** re-inyecta el output del padre y permite **cross-model** (refinar un candidato de Omni con otro motor y viceversa); `reference_to_video` acepta sets **combinados imagen+vídeo** (verificado en ambas superficies) pero **exige ≥1 imagen o audio**. Contrato: `efeonce/GEMINI_OMNI_VERTEX.md §0/§4.6/§4.7` · capacidades: `GEMINI_OMNI_CAPABILITIES.md` |
| **Flux 3** (Black Forest Labs, vía Fal, `pnpm ai:fal`) | video con audio: T2V/I2V, primer-último cuadro, keyframes (hasta 10), `edit` que conserva movimiento/timing/encuadre, `extend`, drafts baratos (0,03 USD/s) + `enhance` a final; 5–20 s; 720p/1080p | más lento que H3 (40 s–4 min); `extend` exige audio en el origen y entrega sólo la continuación; sin 4K | explorar en draft y subir sólo el take aprobado; fijar trayectoria con cuadros; video a video verificado (edit/extend); 12 endpoints verificados 2026-09-16 |
| **Wan 3.0 / Prime** (Alibaba, vía Fal, `pnpm ai:fal`) | video con audio (apagable): T2V/I2V/R2V; 2–30 s o `auto` (duración inteligente); 480p/720p/1080p; R2V con 10 imágenes, 5 videos, 5 audios; video basado en web o documento (`--web-url`/`--file` + `--thinking`); USD 0,05/s | sin 4K; **sin endpoint de edición** en fal (la edición de Wan es 2.7, no conectada); sólo `wan3-t2v` verificado (resto bloqueado por saldo) | tomas largas con duración decidida por el modelo; explicativo desde una web/documento; #2 video y #1 Video Editing en OpenArt Arena 2026-09-16 (ranking externo) |
| **Grok Imagine video v1.5** (xAI, vía Fal) | **evaluado, no conectado** — 1–15 s hasta 1080p; USD 0,01/s | #10 en OpenArt Arena 2026-09-16; sin control de audio | candidato para exploración masiva barata si el operador lo conecta |
| ~~**Sora 2** (OpenAI)~~ | líder en consistencia temporal/física | **API deprecada 2026-03-24, shutdown 2026-09-24** | **NO** basar nada nuevo; sigue accesible vía agregadores (Higgsfield) pero con fecha de muerte |

### Upscale / enhance / finish

| Herramienta | Qué hace | Cuándo | Notas |
|---|---|---|---|
| **Magnific** (MCP + API) | upscale generativo 2x–16x ("generative hallucination" — sueña detalle, no interpola) + **Video Sequence Enhancement** (upscaling **frame-consistent**: analiza movimiento/textura/sujeto entre frames) + **Video Upscaler Precision API** (diffusion, recupera detalle **sin agregar** contenido IA) + Reference Image (composición + textura) + sliders Creativity/Resemblance | paso de **finish**: subir resolución/detalle de frames y **secuencias de video** a 8K | API Python/Node + plugin Photoshop; tenemos **MCP y API** |
| **Higgsfield upscaling** | upscaling integrado (hasta 8K) | dentro del mismo pipeline Higgsfield | — |

## Framework de prompt cinematográfico (estable — el "cómo dirigir la IA")

**Estructura:** `[dirección de cámara] + [ritmo de escena] + [acción/movimiento] + [detalles atmosféricos]`.
Ej: *"Close-up, slow dolly forward while tilting up, revealing subject's face, cinematic shallow DoF, 4s, smooth movement."*

- Usa **terminología técnica** ("slow push-in", "tracking shot", "aerial"), no "que se vea cool".
- Verbos de **movimiento** (glides, drifts, swirls, rushes). Dirige como director: describe *una escena
  filmándose*, no *una imagen*.
- **Keyframes primero** (stills precisos de inicio/fin) → image-to-video para máxima controlabilidad.
- **Consistencia de personaje** = el diferenciador: Soul ID / Voice Binding / refs bloquean rostro y voz.

**Modos de fallo 2026 (y workaround):**
- **Handheld/shaky** → agrega grano o filma estático y aplica shake en post.
- **Tomas >10s** → genera en chunks de **5–8s** y monta.
- **Movimientos a través de objetos** → plates estáticos + moves en post.

## Doctrina estampada (as-of 2026-07 — reverificar según tabla)

- El craft manda sobre el modelo · el cine vuelve a la publicidad · title sequences = identidad ·
  tipografía kinética · estética hecha a mano/imperfecta · consistencia de personaje = diferenciador IA ·
  keyframes → image-to-video · híbrido IA + craft (IA velocidad/volumen, humano composición/timing/polish).
- Herramientas de craft: **After Effects** (mograph/tipo kinética), **Cinema 4D/Blender** (3D),
  **DaVinci Resolve** (edición/color/finish, gratis), **Houdini** (FX), **Magnific** (upscale).
- Sora 2 deprecado (shutdown 2026-09-24) — no basar nada nuevo en él.
