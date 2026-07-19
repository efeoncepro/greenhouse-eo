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
Secret server-side `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF`; pricing público por modelo en `fal.ai/models`.
Catálogo histórico: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`. Portafolio vigente y
registry agentic: `docs/architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md` y
`EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json`.

**Provider policy:** cualquier modelo Google nativo se consume directo por Google Cloud/Vertex, nunca por Fal.
Fal queda para modelos no-Google allowlisted; OpenAI va directo.

## Fuentes base (as-of 2026-07)

**Tendencias visuales / branding 2026**
- Adobe — Design trends 2026 — https://www.adobe.com/express/learn/blog/design-trends-2026
- Canva — 'Imperfect by Design' visual trends 2026 — https://www.canva.com/newsroom/news/design-trends-2026/
- The Branding Journal — Top Branding & Design Trends 2026 — https://www.thebrandingjournal.com/2026/01/top-branding-design-trends-2026/
- It's Nice That — Graphic trends 2026 — https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126
- Digital Synopsis — Top 20 Graphic Design Trends 2026 — https://digitalsynopsis.com/design/graphic-design-trends-2026/

**Modelos IA de imagen**
- OpenAI — GPT Image 2 model contract — https://developers.openai.com/api/docs/models/gpt-image-2
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
- Google Cloud — Veo 3.1 — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
- fal.ai — Seedance 2.0 reference-to-video — https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api
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
| **GPT Image 2** (OpenAI) | realismo, fidelidad al prompt, edición, texto, publishing diario (top general) | estilo cinematográfico < MJ | default realista y de uso diario; el repo ya lo usa (personaje Nexa) |
| **Seedream 5 Lite** (ByteDance/fal.ai) | divergencia de medios/materiales a USD 0,035 por output publicado | continuidad/anatomía antes del anchor | abrir territorios en paralelo y curar antes de Pro |
| **Seedream 5 Pro** (ByteDance/fal.ai) | material/color/atmósfera, multirreferencia, edición regional semántica | salida raster plana; sin máscara/layers públicos; layout extremo puede requerir otra pasada | desarrollar el mundo visual; relevar a GPT para system extension cuando aplique |
| **Midjourney v7** | **estética/dirección de arte**, cinematográfico, surreal/pictórico, concept art | texto en imagen, control preciso | mood boards, editorial, hero de alto concepto |
| **FLUX.2 Pro / 1.1 Pro** | calidad técnica, realismo, velocidad (~4.5s), **params de cámara** (focal/DoF/ángulo) | — | pre-viz de film/VFX, storyboard, realismo comercial; open-weight |
| **Ideogram 4** | lettering/poster y texto-en-imagen conceptual | texto legal/final | exploración tipográfica; release determinístico |
| **Recraft v4.1** | SVG editable real | fotorrealismo | iconografía/ilustración/sistemas vectoriales; identidad final con review humano |
| **Adobe Firefly** | workbench Adobe de generación/edición | externo `watch`; términos/indemnidad por endpoint/cliente | retoque asistido tras rights review |
| ~~**Imagen 4**~~ (Vertex) | legacy | deprecado; migrar a Gemini 2.5 Flash Image | no usar en trabajo nuevo |

### Video (design-studio dirige; producción se apoya en `social-media-studio` + Higgsfield)

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Seedance 2.0** (ByteDance/Fal) | 9 imágenes + 3 videos + 3 audios, native audio, 4–15 s | QA físico/anatomía/continuidad | reference-to-video; 2.5 no verificado/bloqueado |
| **Veo 3.1 / Fast** (Google Vertex) | premium/broadcast + ruta de escala | costo/cupo por endpoint | directo GCP; sustituye Veo 2/3.0 |
| **Kling 3 Pro/4K** (Fal) | start/end, elements, multi-shot y 4K | límites de audio/idioma y concurrencia | especialista premium/4K |
| **PixVerse V6** (Fal) | 1080p, audio, cámara y costo de volumen | límites por resolución/duración | scale social/motion |
| **Gemini Omni Flash** (Google Vertex) | reference/video edit + audio | preview, 720p, máx. 10 s | canary con fallback; nunca Fal |
| ~~**Sora 2** (OpenAI)~~ | físico/consistencia | **DEPRECADO**: API deprecada 2026-03-24, shutdown 2026-09-24 | **NO** usar para proyectos nuevos |

> **Herramientas conectadas por MCP/skill:** `greenhouse-ai-image-generator` (assets UI Greenhouse, helper canónico), `higgsfield-*` (video/imagen/audio/avatares), Adobe Firefly (MCP Adobe), Magnific (upscale/enhance), Figma (design system/handoff). Detalle en `efeonce/STUDIO_TOOLING.md`.

## Doctrina estampada (as-of 2026-07 — reverificar según tabla)

- Tendencias 2026: identidad kinética · sistemas flexibles/adaptativos · imperfección/autenticidad
  (grano, xerox, analógico) · layering/mixed-media · color audaz + surrealismo · texturas táctiles.
- Selección de modelo por tarea: **texto en imagen → Nano Banana Pro / Ideogram**; **estética/concepto
  → Midjourney**; **vector/logo escalable → Recraft**; **realismo/cámara → FLUX.2**; **realista diario →
  GPT Image 2**; **divergencia de campaña → Seedream 5 Lite**; **material/color/región semántica →
  Seedream 5 Pro**; **secuencia híbrida → módulo 12 + anchor/handoff**; **Photoshop/Firefly → workbench watch tras rights review**; **video con control por referencias → Seedance**;
  **broadcast/cine → Veo**; **económico simple → Kling**; **edición conversacional → Gemini Omni**.
- Sora 2 deprecado (shutdown 2026-09-24) — no basar nada nuevo en él.
