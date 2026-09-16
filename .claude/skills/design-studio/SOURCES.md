# SOURCES — design-studio

> **Núcleo verificado as-of 2026-07.** En diseño, los **fundamentos** (composición,
> gestalt, jerarquía, color, contraste) son **estables** y no se reverifican. Lo que se
> mueve rápido es el **landscape de modelos IA** (por mes) y las **tendencias visuales**
> (por año). Regla dura: nunca cites de memoria qué modelo/versión/feature/tendencia domina
> — corre `WebSearch`/`WebFetch` y actualiza el `as-of` inline.

## Tabla de volatilidad por tema

| Tema | Volatilidad | Reverificar antes de afirmar… | Módulo |
|---|---|---|---|
| Fundamentos (composición, gestalt, jerarquía, color, contraste) | **estable** | — | 01, 02, 03 |
| Qué es un Key Visual / rúbrica de auditoría | **estable** | — | 04, 05 |
| Tendencias visuales del año | **anual/semestral** | qué estética domina, qué se ve viejo | 07 |
| Qué modelo IA de imagen lidera | **volátil (mensual)** | "X es el mejor para Y", rankings | 08 |
| Qué modelo IA de video lidera | **volátil (mensual)** | Seedance/Veo/Kling/Omni, benchmarks | 08 |
| Versiones/features/pricing de modelos | **volátil (mensual)** | nº de versión, 4K, duración, $/s, deprecaciones | 08 |
| Capacidades de MCP (Higgsfield/Firefly/Magnific/Figma) | **trimestral** | qué tool/endpoint hace qué | 09, STUDIO_TOOLING |
| Specs de formato/entrega (tamaños sociales, DPI print) | **semestral** | tamaños exactos por red | 10 |

## Acceso programático — Fal.ai API (desde 2026-07-06)

Path de laboratorio adicional a los MCP: **Fal.ai** — agregador de más de 1.000 Model APIs con cliente Greenhouse
`src/lib/ai/fal.ts` (`runFalModel`). Es **out-of-band** y no es el runtime futuro del Studio.
Secrets server-side `FAL_API_KEY` / `FAL_API_KEY_B` vía `*_SECRET_REF` (dos cuentas con failover por saldo desde
2026-09-16; `pnpm ai:fal --balance` las lista gratis; detalle en el catálogo § "Cuentas, saldo y operación del CLI");
pricing público por modelo en `fal.ai/models`.
Catálogo histórico: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`. Portafolio vigente y
registry agentic: `docs/architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md` y
`EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json`.

**Provider policy:** cualquier modelo Google nativo se consume directo por Google Cloud/Vertex, nunca por Fal.
Fal queda para modelos no-Google allowlisted; OpenAI va directo. Para volumen BytePlus (Seedance/Seedream),
comparar el endpoint directo contra Fal: el directo suele ser más barato y Fal reduce fricción de integración.
No confundir créditos de partner con precio API ni comprometer tarifas sin revalidación.

## Comparación directo vs. Fal (as-of 2026-07-26)

Guía de arquitectura y compras, no tarifario. Verificar endpoint, región, cuota y calculadora antes de reservar consumo.

| Capability | Ruta preferida | Decisión |
|---|---|---|
| Seedance 2.0 / Seedream | BytePlus/ModelArk directo en producción; Fal en prototipo/gateway | Directo suele ser más barato; Fal aporta conveniencia. Validar soporte, derechos y portabilidad. |
| Minimax H3 | Fal (`pnpm ai:fal`, out-of-band) | Conectado y verificado 2026-09-16 (OpenAPI de fal por endpoint + API de pricing + 9 corridas reales): precios del registro = escalón más bajo (Max Turbo 0,0125 USD/s · Max 0,025/s · base 0,05/s · LoRA 0,0625/s); publicados por resolución: base 2K 0,13 (default), Max 1080P 0,08; 2K/4K de base reescalados desde 768P; LoRA mínimo 100 steps; LoRA y entrenadores sin verificar; `director` no operable por cola. |
| Seedance 2.5 | Fal T2V/I2V/R2V como superficie provider-supported; Globe permanece gated | El contrato Fal está vivo y documenta 480p/720p/1080p, 4–30 s, audio y R2V multimodal; la API directa BytePlus 2.5 no tiene contrato público verificable. En `pnpm ai:fal` los 15 endpoints Seedance (2.0 y 2.5, incluido r2v `editing`/`extension`) quedaron verificados en real 2026-09-16; costo estimable con la fórmula de tokens de fal (calzó con lo medido; la equivalencia de OpenArt subestima ~2×) y el filtro de ByteDance rechaza marcas y personas reales **tras encolar y cobra**. |
| FLUX.2 | BFL directo o Fal | Paridad pública en los endpoints comparados; decidir por SLA, auth y observabilidad. |
| Recraft v4 | Recraft directo o Fal | Paridad pública en los endpoints comparados; directo si pesa el control contractual. |
| GPT Image 2 / 2.5 (Sunburst, Flare) | OpenAI directo (`pnpm ai:image`) | Ruta canónica; Fal sólo para pruebas o gateway explícitamente justificado. 2.5 sin Batch; costo estimable por fórmula oficial y rate limits publicados (iguales a GPT Image 2). |
| Nano Banana / Gemini | Google AI Studio o Vertex directo | Google nativo nunca por Fal; separar API, Batch, región y cuotas. Estado 2026-09-16: **Nano Banana 2** (`gemini-3.1-flash-image`) es el default del provider `google-gemini-image` del producto; **Nano Banana Pro** (`gemini-3-pro-image`) está disponible en nuestro Vertex (`models.get`, location `global`) pero **ninguna superficie lo usa**; no hay CLI de Gemini Image. Gemini Omni Flash también va directo aunque fal lo ofrezca. |
| Wan 3.0 / Prime | Fal (`pnpm ai:fal`, out-of-band) | Conectado 2026-09-16: 6 endpoints de video `alibaba/wan-3.0{,-prime}/*` (t2v/i2v/r2v); USD/s por resolución base 0,05 · 0,10 · **0,20 a 1080p (default)**, Prime 0,068 · 0,14 · 0,28; 30 fps. Los 6 verificados en real 2026-09-16. Sin edición ni imagen en 3.0. #2 video y #1 Video Editing en OpenArt Arena 2026-09-16 (ranking externo). |
| Kling 3 · Grok Imagine | Fal (evaluado, **no conectado**) | Revisión de catálogo/OpenAPI 2026-09-16, sin corridas: Kling O3 0,14 USD/s (4k 0,42/s; multi-shot, elements con voz, motion-control, 4K); Grok Imagine video v1.5 0,01/s (#10 OpenArt), imagen v2.0 (#4 OpenArt). Conectarlos es decisión del operador. |
| Flux 3 | Fal (`pnpm ai:fal`, out-of-band) | Anunciado por BFL el 2026-07-23. En Fal es un modelo de **video** (no de imagen): 12 endpoints `blackforestlabs/flux-3/*` conectados y verificados en real 2026-09-16 (catálogo y OpenAPI de fal + API de pricing + corridas reales): registro finales 0,085 USD/s · drafts 0,03/s · edit 0,03/s · extend 0,205/s; **publicado por BFL/fal: final 0,17 (720p) / 0,29 (1080p), draft 0,06, extend 0,41** → confirmar con `pnpm ai:fal --balance`. Ruta directa BFL sin evaluar. |

**Regla:** `prototype` → Fal si reduce tiempo; `production-scale` → directo cuando hay ahorro, SLA o control de
datos; `fallback` → Fal sólo con slug/schema verificados y salida normalizada. Registrar fecha, resolución,
duración, reintentos y costo efectivo por output.

## Matriz de disponibilidad real en Greenhouse (as-of 2026-09-16)

Guía canónica de qué modelo elegir, cuándo y cómo: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`. Esta matriz separa lo que **se puede
producir hoy** de lo que sólo está evaluado; la tabla de "Fuentes base" de abajo es un mapa de fortalezas, no de
disponibilidad.

| Estado | Imagen | Video |
|---|---|---|
| **Disponible en CLI** (out-of-band, gasta) | `pnpm ai:image`: GPT Image 2 (default del CLI), GPT Image 2.5 Sunburst y Flare (`xhigh`/`max` sólo en 2.5). `pnpm ai:fal`: Seedream 5 Pro, Pro edit, Pro layerize, Lite, Lite edit | `pnpm ai:fal`: Seedance 2.5 y 2.0 (base/fast/mini/us), Minimax H3 (base/Max/Max Turbo/camera; LoRA y entrenadores sin verificar; Director no operable), Flux 3 (12), Wan 3.0 y Prime |
| **Directo, sin CLI** | Nano Banana 2 (default del runtime `google-gemini-image`); Nano Banana Pro disponible en Vertex **sin superficie**; Recraft V4.1 SVG vía Higgsfield CLI (**sin sesión** 2026-09-16) | Gemini Omni Flash (directo por Google, nunca fal [decisión]); Veo 3.1 (Vertex) |
| **Evaluado, no conectado** | Grok Imagine imagen v2.0, Qwen Image 3, Flux.2 Pro, Kling imagen O3, Recraft por fal (23 endpoints) | Kling 3 (O3/V3), Grok Imagine video, Wan 2.7 (edición), HappyHorse 1.1, PixVerse V6 |
| **Workbench watch** | Midjourney, Ideogram, Adobe Firefly, Magnific (upscale) | Higgsfield (Seedance 2.5 `omni_reference`, Kling, Soul ID), Runway |

**Rankings de imagen: con fecha y fuente, sin elegir uno como verdad [tercero].**

| Leaderboard (fecha) | Seedream 5 Pro | GPT Image 2.5 Sunburst / Flare | GPT Image 2 | Nano Banana Pro |
|---|---|---|---|---|
| OpenArt Arena imagen v1.0 (2026-09-16) | **#1** | no listados | #2 | #3 |
| Arena texto a imagen / edición (act. 2026-09-07) | #10 / #8 | **#1 / #2** en ambas (Sunburst gana edición) | #3 / #3 | — |
| Artificial Analysis texto a imagen / edición (leído 2026-09-16) | #15 / #9 | #2 y #1 / #1 y #2 | #3 / #5 | — |

Los rankings **se contradicen**: el #1 de Seedream en OpenArt no se replica en Arena ni AA, y 2.5 tiene pocos votos.
Video: OpenArt pone Seedance 2.5 #1 y H3 última de las conectadas; Artificial Analysis pone Wan 3.0 #1 en texto a
video con audio y H3 Max (post-entrenado por fal) #1 en imagen a video con audio. Manda la prueba contra el brief.

**Correcciones que cambian la elección (2026-09-16):** Seedream 5 Pro en fal **no es 4K** (área máx. 2048²; Lite sí
admite área mayor); el costo de GPT Image 2.5 **sí se estima antes de gastar** (fórmula en
`greenhouse-ai-image-generator` §Elegir modelo); fal cobra video **por escalón de resolución** (Wan 1080p 0,20 USD/s,
Prime 0,28, H3 base 2K 0,13; Flux 3 publicado = el doble del registrado); Seedance se presupuesta con la fórmula de
tokens de fal (lo que subestimaba ~2× era la equivalencia de OpenArt).

## Fuentes base (as-of 2026-07)

**Tendencias visuales / branding 2026**
- Adobe — Design trends 2026 — https://www.adobe.com/express/learn/blog/design-trends-2026
- Canva — 'Imperfect by Design' visual trends 2026 — https://www.canva.com/newsroom/news/design-trends-2026/
- The Branding Journal — Top Branding & Design Trends 2026 — https://www.thebrandingjournal.com/2026/01/top-branding-design-trends-2026/
- It's Nice That — Graphic trends 2026 — https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126
- Digital Synopsis — Top 20 Graphic Design Trends 2026 — https://digitalsynopsis.com/design/graphic-design-trends-2026/

**Modelos IA de imagen**
- OpenAI — GPT Image 2 model contract — https://developers.openai.com/api/docs/models/gpt-image-2
- OpenAI — GPT Image 2.5 Flare (2026-09-08) — https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- OpenAI — GPT Image 2.5 Sunburst (2026-09-08) — https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- OpenAI — Introducing ChatGPT Images 2.5 — https://openai.com/index/introducing-chatgpt-images-2-5/
- OpenAI — ChatGPT Images 2.5 System Card — https://deploymentsafety.openai.com/chatgpt-images-2-5
- OpenAI — GPT Image prompting guide (2026-04-21, escrita para `gpt-image-2`; NO hay guía de 2.5) — https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- OpenAI — Image generation/editing guide — https://developers.openai.com/api/docs/guides/image-generation
- OpenAI — API pricing — https://openai.com/api/pricing/
- fal.ai — Seedream 5 Lite text-to-image API — https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image/api
- fal.ai — Seedream 5 Lite edit API — https://fal.ai/models/bytedance/seedream/v5/lite/edit/api
- fal.ai — Seedream 5 Pro text-to-image API — https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image/api
- fal.ai — Seedream 5 Pro edit API — https://fal.ai/models/bytedance/seedream/v5/pro/edit/api
- Gradually — 9 Best AI Image Generation Models 2026 — https://www.gradually.ai/en/ai-image-models/
- Melies — Best AI Image Models 2026 (FLUX/GPT Image 2/Seedream/Ideogram/Imagen 4/Recraft) — https://melies.co/compare/ai-image-models
- Google — Nano Banana Pro (Gemini 3 Pro Image) — https://blog.google/technology/ai/nano-banana-pro/
- Google Cloud — image generation/editing overview — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/overview
- Google Cloud — Vertex release notes/lifecycle — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes
- Storytool — Best AI Image Generators 2026 — https://storytool.io/blogs/best-ai-image-generators-2026

**Modelos IA de video**
- Google Cloud — Gemini Omni Flash Preview — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-flash-preview
- Google AI — Gemini video generation / Omni — https://ai.google.dev/gemini-api/docs/video
- Google DeepMind — Gemini Omni — https://deepmind.google/models/gemini-omni/
- Google Cloud — Veo 3.1 — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
- Black Forest Labs — FLUX 3 announcement — https://bfl.ai/blog/flux-3
- Black Forest Labs — FLUX pricing — https://bfl.ai/pricing
- Recraft — API pricing — https://www.recraft.ai/docs/api-reference/pricing
- BytePlus — Seedance 2.0 API — https://docs.byteplus.com/en/docs/ModelArk/2300461
- fal.ai — Seedance 2.0 reference-to-video — https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api
- fal.ai — Seedance 2.5 text-to-video — https://fal.ai/models/bytedance/seedance-2.5/text-to-video
- fal.ai — Seedance 2.5 image-to-video — https://fal.ai/models/bytedance/seedance-2.5/image-to-video
- fal.ai — Seedance 2.5 reference-to-video — https://fal.ai/models/bytedance/seedance-2.5/reference-to-video
- fal.ai — Seedance 2.5 OpenAPI expansion/model search — https://fal.ai/docs/platform-apis/v1/models
- fal.ai — Queue inference — https://fal.ai/docs/documentation/model-apis/inference/queue
- fal.ai — Media expiration — https://fal.ai/docs/documentation/model-apis/media-expiration
- BytePlus — Seedance 2.5 product promotion — https://ark.volcengine.com/promotion?modelName=seedance-2-5
- fal.ai — FLUX.2 Pro — https://fal.ai/models/fal-ai/flux-2-pro
- fal.ai — Recraft v4 — https://fal.ai/models/fal-ai/recraft/v4/text-to-image
- fal.ai — PixVerse V6 — https://fal.ai/pixverse-v6
- fal.ai — Kling 3 Pro — https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video
- WaveSpeed — Seedance 2.0 vs Kling 3.0 vs Sora 2 vs Veo 3.1 — https://wavespeed.ai/blog/posts/seedance-2-0-vs-kling-3-0-sora-2-veo-3-1-video-generation-comparison-2026/
- DigitalApplied — Seedance 2.5 (30s AI video) — https://www.digitalapplied.com/blog/seedance-2-5-bytedance-ai-video-model-2026
- Atlas Cloud — Seedance vs Kling vs Sora vs Veo — https://www.atlascloud.ai/blog/guides/seedance-vs-kling-vs-sora-vs-veo

## Matriz de modelos IA (as-of 2026-07 — SoT; reverificar mensual)

> Regla 2026: **no te cases con un modelo — ten acceso a varios y elige por tarea.** El
> valor del diseñador es la **selección correcta**, no la lealtad a una herramienta.

### Imagen

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Gemini 2.5 Flash Image** (Vertex) | contexto, multirreferencia, generación/edición conversacional | texto final exacto sigue fuera del raster | ruta Google core; directo por GCP |
| **Gemini 3.1 Flash Image** (Vertex) | contexto/multirreferencia, core estratégico | base GA; 4K/video-input pueden ser preview | directo GCP; eval antes de production approval |
| **Gemini 3 Pro Image** (Vertex) | acabado premium/edición razonada | mayor costo/latencia | specialist directo GCP |
| **Gemini 3.1 Flash Lite Image** (Vertex) | escala y baja latencia | lifecycle corto | scale directo GCP + refresh gate |
| **GPT Image 2** (OpenAI) | realismo, fidelidad al prompt, edición, texto, publishing diario | estilo cinematográfico < MJ | default del CLI; único con Batch; el repo ya lo usa (personaje Nexa) |
| **GPT Image 2.5 Sunburst / Flare** (OpenAI, 2026-09-08) | Sunburst: edición precisa y pieza final (`xhigh`/`max`); Flare: generación cotidiana, ~1,5–1,75× más rápido, mismo costo | texto en imagen, consistencia de personaje y layout fijo siguen declarados como limitación | #1/#2 en Arena y AA (2026-09-07/16); recomendado por OpenAI para integraciones nuevas; `pnpm ai:image --model` |
| **Seedream 5 Lite** (ByteDance/fal.ai) | divergencia de medios/materiales a USD 0,035 por output publicado | continuidad/anatomía antes del anchor | abrir territorios en paralelo y curar antes de Pro |
| **Seedream 5 Pro** (ByteDance/fal.ai) | material/color/atmósfera, multirreferencia, edición regional semántica | **no es 4K en fal** (máx. 2048²); Edit devuelve raster plano sin máscara (las capas separables salen del endpoint aparte `pro/layerize`, vía `pnpm ai:fal`); layout extremo puede requerir otra pasada | desarrollar el mundo visual; relevar a GPT para system extension cuando aplique |
| **Midjourney v7** | **estética/dirección de arte**, cinematográfico, surreal/pictórico, concept art | texto en imagen, control preciso | mood boards, editorial, hero de alto concepto |
| **FLUX.2 Pro / 1.1 Pro** | calidad técnica, realismo, velocidad (~4.5s), **params de cámara** (focal/DoF/ángulo) | — | pre-viz de film/VFX, storyboard, realismo comercial; open-weight |
| **Ideogram 4** | lettering/poster y texto-en-imagen conceptual | texto legal/final | exploración tipográfica; release determinístico |
| **Recraft v4.1** | SVG editable real | fotorrealismo | iconografía/ilustración/sistemas vectoriales; identidad final con review humano |
| **Adobe Firefly** | workbench Adobe de generación/edición | externo `watch`; términos/indemnidad por endpoint/cliente | retoque asistido tras rights review |
| ~~**Imagen 4**~~ (Vertex) | legacy | deprecado; migrar a Gemini 2.5 Flash Image | no usar en trabajo nuevo |

### Video (design-studio dirige; producción se apoya en `social-media-studio` + Higgsfield)

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Seedance 2.0** (ByteDance/Fal) | 9 imágenes + 3 videos + 3 audios, native audio, 4–15 s | QA físico/anatomía/continuidad | reference-to-video; identidad independiente de 2.5 |
| **Seedance 2.5** (ByteDance vía Fal) | Tres endpoints activos: T2V, I2V y R2V; audio nativo, 4–30 s, 480p/720p/1080p; R2V admite hasta 50 archivos: 30 imágenes, 10 videos y 10 audios, con referencias `@ImageN`/`@VideoN`/`@AudioN` | Fal no expone 4K, máscaras, storyboard JSON, shots estructurados, keyframes intermedios ni stems; precio y output deben revalidarse | Provider-supported; Globe gated hasta contrato, adapter, rights, billing, eval y canary exactos |
| **Minimax H3** (Fal, `pnpm ai:fal`) | Turbo barato y rápido; Max `camera-controls` mueve la cámara sobre imagen congelada; base única H3 con 2K/4K; LoRA/entrenadores para marca/personaje | 5–15 s; sin toggle de audio (entrega audio); I2V sin aspect; LoRA/entrenadores sin verificar | exploración de movimiento, cámara sobre KV aprobado; elección fina en `motion-design-studio` |
| **Veo 3.1 / Fast** (Google Vertex) | premium/broadcast + ruta de escala | costo/cupo por endpoint | directo GCP; sustituye Veo 2/3.0 |
| **Wan 3.0 / Prime** (Alibaba, Fal, `pnpm ai:fal`) | T2V/I2V/R2V con audio apagable; 2–30 s o duración inteligente (`auto`); hasta 1080p; R2V 10 imágenes / 5 videos / 5 audios; video basado en web o documento (`--web-url`/`--file` + `--thinking`); USD 0,05/s | sin 4K ni edición en Fal; los 6 endpoints verificados 2026-09-16 | toma larga decidida por el modelo o explicativo desde una fuente; detalle en `motion-design-studio` |
| **Kling 3 Pro/4K** (Fal) — **evaluado, no conectado a `pnpm ai:fal`** (2026-09-16) | start/end, elements con voz, multi-shot, motion-control y 4K | límites de audio/idioma y concurrencia; O3 0,14 USD/s, 4k 0,42/s | especialista premium/4K si el operador lo conecta; Kling vía Higgsfield es otro carril |
| **Grok Imagine video v1.5** (xAI, Fal) — **evaluado, no conectado** (2026-09-16) | exploración masiva a USD 0,01/s; 1–15 s hasta 1080p | #10 en OpenArt Arena; sin control de audio | candidato de exploración barata |
| **PixVerse V6** (Fal) | 1080p, audio, cámara y costo de volumen | límites por resolución/duración | scale social/motion |
| **Gemini Omni Flash** (Google Vertex) | reference/video edit + audio | preview, 720p, máx. 10 s | canary con fallback; nunca Fal |
| **Flux 3** (Black Forest Labs, Fal) | video con audio: T2V/I2V, primer-último cuadro, keyframes, edit que conserva movimiento, extend, draft barato → enhance; 5–20 s, 720p/1080p | en Fal no genera imágenes; más lento que H3; `extend` exige audio en el origen y entrega sólo la continuación | explorar movimiento en draft, fijar trayectoria con cuadros, video a video verificado; detalle en `motion-design-studio` |
| ~~**Sora 2** (OpenAI)~~ | físico/consistencia | **DEPRECADO**: API deprecada 2026-03-24, shutdown 2026-09-24 | **NO** usar para proyectos nuevos |

> **Herramientas conectadas por MCP/skill:** `greenhouse-ai-image-generator` (assets UI Greenhouse, helper canónico), `higgsfield-*` (video/imagen/audio/avatares), Adobe Firefly (MCP Adobe), Magnific (upscale/enhance), Figma (design system/handoff). Detalle en `efeonce/STUDIO_TOOLING.md`.

## Doctrina estampada (as-of 2026-07 — reverificar según tabla)

- Tendencias 2026: identidad kinética · sistemas flexibles/adaptativos · imperfección/autenticidad
  (grano, xerox, analógico) · layering/mixed-media · color audaz + surrealismo · texturas táctiles.
- Selección de modelo por tarea: **texto en imagen → Nano Banana Pro / Ideogram** (ambos sin superficie operativa hoy: Nano Banana Pro sin CLI, Ideogram watch; texto final siempre determinístico); **estética/concepto
  → Midjourney**; **vector/logo escalable → Recraft**; **realismo/cámara → FLUX.2**; **realista diario →
  GPT Image 2.5 Flare; edición precisa/pieza final → 2.5 Sunburst; Batch → GPT Image 2**; **divergencia de campaña → Seedream 5 Lite**; **material/color/región semántica →
  Seedream 5 Pro**; **secuencia híbrida → módulo 12 + anchor/handoff**; **Photoshop/Firefly → workbench watch tras rights review**; **video con control por referencias → Seedance**;
  **broadcast/cine → Veo**; **económico simple → Kling**; **edición conversacional → Gemini Omni**;
  **draft barato de video → enhance, trayectoria por cuadros o video a video → Flux 3 (Fal; en Fal es video, no imagen)**;
  **toma de hasta 30 s con duración inteligente o video desde una web/documento → Wan 3.0 (Fal)**.
- Sora 2 deprecado (shutdown 2026-09-24) — no basar nada nuevo en él.
