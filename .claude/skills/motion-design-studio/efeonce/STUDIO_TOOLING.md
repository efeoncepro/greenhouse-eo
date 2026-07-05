# STUDIO_TOOLING — el pipeline real de ejecución

> Lo que vuelve a `motion-design-studio` un **estudio** y no un PDF: cablea las herramientas
> conectadas en el loop **idear → storyboard → animatic → producir → editar → finalizar → entregar**.
> Reverifica capacidades de cada modelo/MCP (cambian por mes — ver `SOURCES.md`).

## El loop y qué corre cada paso

| Paso | Herramienta / skill | Qué hace |
|---|---|---|
| **Idear / dirigir** | esta skill (`../modules/`) + `templates/` | concepto, storyboard, animatic, shotlist |
| **Keyframes / stills** | `greenhouse-ai-image-generator` / `design-studio` | frames de inicio/fin para image-to-video |
| **Producir video IA** | **Higgsfield** (MCP) + `higgsfield-*` skills; Runway/Seedance/Veo/Kling/Omni | generar/animar tomas con control de cámara + personaje |
| **Producir craft humano** | After Effects (mograph), Blender/C4D (3D), Houdini (FX) | tipo kinética, 3D, VFX de precisión — handoff con spec |
| **VFX / compositing** | Nuke / Fusion (Resolve) / After Effects; **Mocha** (tracking); **Wonder/Flow Studio** (mocap); **Runway** / **Beeble** (AI-VFX) | keying, roto, matchmove, integración CGI, cleanup (`../modules/11`) |
| **Editar / montar** | DaVinci Resolve / Premiere | corte, montaje, ritmo (`../modules/06`) |
| **Sonido** | DAW + LipSync (ElevenLabs vía Higgsfield) | sound design, música, VO, mezcla (`../modules/07`) |
| **Color / finish** | DaVinci Resolve + **Magnific** (upscale) | grade, LUT, upscale frame-consistent (`../modules/08`) |
| **Formato por red** | `social-media-studio` | adapta el master a cada red (duración/safe-zone) |

## Higgsfield (MCP conectado) — la mano IA principal

- **30+ modelos bajo una suscripción** (Veo 3.1, Kling 3.0, Seedance 2.0, Wan 2.6, Hailuo, etc.) +
  **el MCP deja generar video desde el chat de Claude** + CLI.
- **Cinema Studio**: presets de cámara nombrados y repetibles (dolly, crash zoom, orbit, crane, pan,
  tilt, tracking) + elegir **focal length** + física óptica. Dirige la toma, no "esperes" que el prompt acierte.
- **Soul ID**: sube 3–5 fotos de un rostro, entrena 5–10 min, reusa el personaje consistente en todas las tools.
- **LipSync Studio** (+ voz ElevenLabs vía Higgsfield Speak).
- Tools MCP: `generate_video` / `generate_image` / `generate_audio`, `models_explore(recommend)`,
  `upscale_video` / `upscale_image`, `reframe`, `motion_control`, `virality_predictor`, `higgsfield-soul-id` (skill).

## Magnific (MCP + API) — upscale / enhance / finish

- **Generative upscaling 2x–16x** ("generative hallucination": sueña detalle, no interpola).
- **Video Sequence Enhancement**: upscaling **frame-consistent** (analiza movimiento/textura/sujeto entre
  frames, no cada frame aislado) — clave para no romper la continuidad del video.
- **Video Upscaler Precision API**: diffusion, recupera detalle **sin agregar** contenido IA (fiel).
- Reference Image (composición + textura), sliders Creativity/Resemblance, 8K, API Python/Node, plugin Photoshop.
- **Rol:** paso de **finish** — subir resolución/detalle de frames e imagen y de **secuencias de video**.
  Tenemos **MCP y API**.

## Vertex (efeonce-group) — modelos Google

Gemini Omni + Veo corren en **Vertex del proyecto `efeonce-group`** (ver memoria
`reference_vertex_gemini_omni_nanobanana_lite`). Gotcha: algunos solo en `us-central1`/`global`. Clientes
LLM canónicos en `src/lib/ai/*` (no instanciar SDK paralelo en un dominio).

## Router de producción (elige la mano correcta)

- **Toma cinematográfica con cámara + personaje consistente** → Higgsfield (Cinema Studio + Soul ID).
- **Cine dirigido con beats/coreografía** → Runway Gen-4.5.
- **Control por referencias / social / económico** → Seedance / Kling.
- **Broadcast** → Veo 3.1. **Edición conversacional** → Gemini Omni.
- **Tipo kinética / mograph de precisión / 3D** → craft humano (AE/Blender/Houdini), handoff con spec.
- **VFX / compositing** (keying, roto, tracking/matchmove, integración CGI, simulaciones, cleanup) → craft
  humano (Nuke/Fusion/AE + Mocha) + AI-VFX (Runway roto, Wonder/Flow mocap, Beeble relight); ver `../modules/11`.
- **Subir resolución del entregable final** → Magnific (Video Sequence Enhancement).
- **Keyframes** → `greenhouse-ai-image-generator` / `design-studio`. **Formato por red** → `social-media-studio`.

## Regla dura: gasto gobernado + confirmación humana

Producir/renderizar IA **cuesta créditos**. Antes de volumen: dimensiona el gasto, valida el ritmo en el
**animatic** (barato) antes de producir tomas, genera en **chunks 5–8s**, y sube calidad/upscale solo de lo
elegido. **Entregar/publicar pasa SIEMPRE por confirmación humana.** La IA acelera; el humano dirige y hace el finish.
