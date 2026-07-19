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

## Fuentes base (as-of 2026-07)

**Tendencias motion / animación 2026**
- Envato Elements — 11 Motion Design Trends 2026 — https://elements.envato.com/learn/motion-design-trends
- Hatch Studios — Top Video & Animation Trends 2026 — https://hatchstudios.com/top-video-and-animation-trends-to-know-in-2026/
- SonduckFilm — 10 Motion Graphic Design Trends 2026 — https://www.sonduckfilm.com/tutorials/motion-trends/
- Renderforest — Logo Animation Trends 2026 — https://www.renderforest.com/blog/logo-animation-trends

**Modelos de video IA + workflow cinematográfico**
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
| **Seedance 2.0 / 2.5** (ByteDance) | briefs detallados, camera moves, **hasta 12–50 refs + audio ref** (fija personaje/producto), 30s/4K (2.5), barato (~$0.06/s) | vivid/alto contraste (menos editorial), físico complejo, texto fino, manos | control por referencias, social punchy, presupuesto ajustado |
| **Kling 3.0** | **storyboarding multi-shot + Voice Binding** (voz consistente 6 cortes/5 idiomas), económico | control fino | narrativas multi-corte con voz consistente; económico |
| **Veo 3.1** (Google) | broadcast-ready, frame rate de cine, **sync audio-visual integrado** | precio (~$0.10/s) | entregable de calidad broadcast/cine |
| **Gemini Omni** (Google, Vertex) | multimodal; **VERIFICADO** en `efeonce-group` (video real 10s 720p 24fps, ~$0.10/s) + **referencias/image-to-video OK** (frame previo como `inlineData` → continuidad casi idéntica) | **solo 720p**, región `global`, no MCP (REST), **deforma texto/logos/UI** | text/i2v en Vertex; **reference-chaining** para consistencia; UI/logo NO con IA. Receta en `efeonce/STUDIO_TOOLING.md` |
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
