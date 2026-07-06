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

Path de producción adicional a los MCP (Higgsfield/Firefly/Magnific): **Fal.ai** — agregador que frontea muchos modelos de imagen (flux, krea) y video (Seedance, Kling, Veo, PixVerse…) con una sola API. Al dirigir y elegir modelo, considerá fal como opción de producción vía el cliente canónico `src/lib/ai/fal.ts` (`runFalModel`). **Out-of-band** (generar + subir por uploader, NO runtime); secreto server-side `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF`, nunca hardcodear. Pricing público por modelo en `fal.ai/models`. Contrato: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

## Fuentes base (as-of 2026-07)

**Tendencias visuales / branding 2026**
- Adobe — Design trends 2026 — https://www.adobe.com/express/learn/blog/design-trends-2026
- Canva — 'Imperfect by Design' visual trends 2026 — https://www.canva.com/newsroom/news/design-trends-2026/
- The Branding Journal — Top Branding & Design Trends 2026 — https://www.thebrandingjournal.com/2026/01/top-branding-design-trends-2026/
- It's Nice That — Graphic trends 2026 — https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126
- Digital Synopsis — Top 20 Graphic Design Trends 2026 — https://digitalsynopsis.com/design/graphic-design-trends-2026/

**Modelos IA de imagen**
- Gradually — 9 Best AI Image Generation Models 2026 — https://www.gradually.ai/en/ai-image-models/
- Melies — Best AI Image Models 2026 (FLUX/GPT Image 2/Seedream/Ideogram/Imagen 4/Recraft) — https://melies.co/compare/ai-image-models
- Google — Nano Banana Pro (Gemini 3 Pro Image) — https://blog.google/technology/ai/nano-banana-pro/
- Google Cloud — Nano Banana Pro for enterprise (Vertex) — https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-pro-available-for-enterprise
- Storytool — Best AI Image Generators 2026 — https://storytool.io/blogs/best-ai-image-generators-2026

**Modelos IA de video**
- Google DeepMind — Gemini Omni — https://deepmind.google/models/gemini-omni/
- WaveSpeed — Seedance 2.0 vs Kling 3.0 vs Sora 2 vs Veo 3.1 — https://wavespeed.ai/blog/posts/seedance-2-0-vs-kling-3-0-sora-2-veo-3-1-video-generation-comparison-2026/
- DigitalApplied — Seedance 2.5 (30s AI video) — https://www.digitalapplied.com/blog/seedance-2-5-bytedance-ai-video-model-2026
- Atlas Cloud — Seedance vs Kling vs Sora vs Veo — https://www.atlascloud.ai/blog/guides/seedance-vs-kling-vs-sora-vs-veo

## Matriz de modelos IA (as-of 2026-07 — SoT; reverificar mensual)

> Regla 2026: **no te cases con un modelo — ten acceso a varios y elige por tarea.** El
> valor del diseñador es la **selección correcta**, no la lealtad a una herramienta.

### Imagen

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Nano Banana Pro** (Gemini 3 Pro Image, Vertex) | **texto legible en imagen**, 4K, razonamiento/conocimiento real, físico, enterprise-safe | estilo "de autor" menos que MJ | default marketing con copy en la imagen; disponible en `efeonce-group` (Vertex) |
| **GPT Image 2** (OpenAI) | realismo, fidelidad al prompt, edición, texto, publishing diario (top general) | estilo cinematográfico < MJ | default realista y de uso diario; el repo ya lo usa (personaje Nexa) |
| **Midjourney v7** | **estética/dirección de arte**, cinematográfico, surreal/pictórico, concept art | texto en imagen, control preciso | mood boards, editorial, hero de alto concepto |
| **FLUX.2 Pro / 1.1 Pro** | calidad técnica, realismo, velocidad (~4.5s), **params de cámara** (focal/DoF/ángulo) | — | pre-viz de film/VFX, storyboard, realismo comercial; open-weight |
| **Ideogram 3** | **texto-en-imagen** (posters, thumbnails, headlines) | — | piezas donde el titular dentro de la imagen manda |
| **Recraft v4** | **vectores editables reales** (logos, iconos, mascotas, packaging) que escalan en Illustrator | fotorrealismo | cuando el entregable ES un asset de diseño escalable/editable |
| **Adobe Firefly** | commercially-safe, edición de fotos reales en Photoshop | estética < MJ | trabajo de cliente que exige licencia limpia + retoque |
| **Imagen 4** (Vertex) | texto, calidad Google, enterprise | — | alternativa Vertex enterprise en `efeonce-group` |

### Video (design-studio dirige; producción se apoya en `social-media-studio` + Higgsfield)

| Modelo | Fuerte en | Débil en | Cuándo usarlo |
|---|---|---|---|
| **Seedance 2.0 / 2.5** (ByteDance) | **#1 arena** (sobre Veo/Kling), movimiento fluido, animación de personaje, **50 refs + audio ref**, edición por región, 4K, 30s nativo (2.5), barato (~$0.06/s, fast ~$0.022/s) | vivid/alto contraste (menos editorial), físico complejo, texto fino, manos, multitud | control compositivo máximo con referencias; social punchy; presupuesto ajustado |
| **Veo 3.1** (Google) | broadcast-ready, frame rate cine | precio (~$0.10/s) | entregable de calidad broadcast/cine |
| **Kling 3.0** | mejor **relación precio/valor** en generación directa | control fino | generación simple y económica |
| **Gemini Omni / Omni Flash** (Google) | multimodal (texto/imagen/audio/video in → video out), **edición conversacional multi-turn** con consistencia de personaje/físico; fusiona render Veo + edición Nano Banana | ecosistema nuevo | edición iterativa conversacional preservando contexto entre pasos |
| ~~**Sora 2** (OpenAI)~~ | físico/consistencia | **DEPRECADO**: API deprecada 2026-03-24, shutdown 2026-09-24 | **NO** usar para proyectos nuevos |

> **Herramientas conectadas por MCP/skill:** `greenhouse-ai-image-generator` (assets UI Greenhouse, helper canónico), `higgsfield-*` (video/imagen/audio/avatares), Adobe Firefly (MCP Adobe), Magnific (upscale/enhance), Figma (design system/handoff). Detalle en `efeonce/STUDIO_TOOLING.md`.

## Doctrina estampada (as-of 2026-07 — reverificar según tabla)

- Tendencias 2026: identidad kinética · sistemas flexibles/adaptativos · imperfección/autenticidad
  (grano, xerox, analógico) · layering/mixed-media · color audaz + surrealismo · texturas táctiles.
- Selección de modelo por tarea: **texto en imagen → Nano Banana Pro / Ideogram**; **estética/concepto
  → Midjourney**; **vector/logo escalable → Recraft**; **realismo/cámara → FLUX.2**; **realista diario →
  GPT Image 2**; **licencia limpia + Photoshop → Firefly**; **video con control por referencias → Seedance**;
  **broadcast/cine → Veo**; **económico simple → Kling**; **edición conversacional → Gemini Omni**.
- Sora 2 deprecado (shutdown 2026-09-24) — no basar nada nuevo en él.
