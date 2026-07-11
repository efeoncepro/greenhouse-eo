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

## Vertex (efeonce-group) — Gemini Omni video-gen (VERIFICADO en vivo 2026-07-05)

Gemini Omni + Veo corren en **Vertex del proyecto `efeonce-group`**. Receta **probada generando video real**
(spot AEO Grader, toma de 10s 720p en ~40s):

- **Región: `global`** — NO `us-central1` (ahí el modelo da `NOT_FOUND`). El atajo de publisher-model falla;
  usar la **ruta calificada**.
- **Endpoint:** `POST https://aiplatform.googleapis.com/v1/projects/efeonce-group/locations/global/publishers/google/models/gemini-omni-flash-preview:generateContent`
- **Contrato obligatorio:** `generationConfig.responseModalities: ["TEXT","VIDEO"]` — **ambas**. Sólo `VIDEO`
  o sólo `TEXT` → `400 "This model requires both text and video response modalities."`
- **Auth:** ADC (`gcloud auth application-default`) + header **`x-goog-user-project: efeonce-group`** (sin él, `403`).
- **Payload:** Gemini-style (`contents:[{role:"user",parts:[{text: <prompt cinematográfico>}]}]`), NO `instances`.
- **Salida:** clip **10s · 1280×720 · 24fps · MP4**, base64 inline en `candidates[].content.parts[].inlineData`
  (`mimeType video/mp4`). Devuelve también un part de **texto "thinking"** (ignorar). `launchStage: PUBLIC_PREVIEW`.
- **Costo (as-of 2026-07 — reverificar):** **5.792 tokens de video/seg** de 720p, **$17,50/1M tokens de salida
  de video** ≈ **$0,10/seg** (~**$1,01 por clip de 10s**; verificado: 57.920 tokens = 5.792 × 10).
- **Limitación:** sólo **720p** → para acabado broadcast, **upscale** (Magnific / Higgsfield) en el finish.
- **NO es tool MCP:** es llamada REST a Vertex; usar el cliente canónico `src/lib/ai/*` (no instanciar SDK paralelo).
  Si ADC expiró: `gcloud auth login` + `application-default login`.

- **Referencias / image-to-video VERIFICADO (2026-07-05):** Omni **acepta imagen de referencia** en
  `contents[].parts[].inlineData` (`mimeType image/png` + el `text`). Probado pasando el frame de una toma
  previa → devolvió una toma **casi idéntica** (mismo mundo/luz/composición). **Esta es la cura de la
  "desconexión":** encadená las tomas → cada toma usa el **último frame de la anterior como referencia** +
  el prompt del beat siguiente. Sin eso, tomas text-to-video independientes se ven como escenas sueltas.

> **Fortaleza vs límite:** Omni entrega tomas cinematográficas de 10s; la **consistencia entre tomas** se
> logra con **reference-chaining** (frame anterior como `inlineData`), no sólo con prompt. El **logo/UI/texto
> NUNCA se generan con IA** (los deforma) → van en post como **overlay de asset real** (mograph). Diseñá el
> corte para no necesitar composite in-frame: beats de UI a **pantalla completa**, mundo/humano en **cortes
> separados**, hilados por transición (pull-back/match-cut).

## UI-heavy motion SIN After Effects (HTML + Playwright) — receta producible

Cuando el motion es **UI/producto** (prompt box, chat, citas, cursor, gauge, dashboards, tipografía legible),
NO uses video IA (deforma texto/logos). Producible por el agente, legible y on-brand:

1. **Construí un mockup HTML/CSS/JS animado** (timeline con `setTimeout`/CSS): typing, cursor que se mueve y
   "clickea", burbujas, citas, unfold de ventana, etc. Embebé el **logo real** (`<img src>` a `public/branding/*`).
2. **Capturá con Playwright** (`recordVideo`, viewport 1280×720): correr el `.mjs` **desde la raíz del repo**
   (el scratchpad NO resuelve `node_modules` → `ERR_MODULE_NOT_FOUND`; copiá el script a la raíz, corré, borralo).
3. **Empaquetado web** con `pnpm media:web-video` cuando el resultado vaya a
   un sitio/landing: genera WebM + MP4 fallback + poster. Runbook:
   `docs/operations/web-media-delivery-tooling.md`.

Caso fuente: spot AEO Grader Slice 1 (answer-engine que cita agencias → clic → boleto), 2026-07-05.
Ventaja: **texto/citas/logos nítidos**, cero costo de créditos IA, control frame-perfect.

### Omni "hazlo más pro" sobre una UI (probado 2026-07-05 — frame Y video de referencia)

Pasar el frame **o el video** de UI a Omni como referencia + "vuélvelo cinematográfico" **SÍ eleva el look**
(profundidad, glass, glow, cámara, entorno premium; el texto grande del héroe suele quedar legible). **PERO**
es no-determinista: **deforma el micro-texto y el logo** — en el test los motores salieron "ChatGPT→ChatOFT,
Perplexity→Pespically, Gemini→Cantnl", "Fechas→Faches", precio 890→850, logo Efeonce fantasmeado. **NUNCA
confiar la exactitud** (citas/nombres de motores/logo/precio) al output IA.

**Workflow canónico (lo mejor de ambos):** usá el output Omni como **plate cinematográfico de fondo**
(atmósfera/cámara/profundidad) y **componé encima la UI real crisp** (o los elementos que deben ser exactos:
pregunta, citas con logos reales, gauge, logo). O mezclá beats: **Omni-enhanced** donde solo importa el texto
grande (pregunta, thinking, ambiente) + **mograph crisp** donde el micro-texto es el mensaje (citas, gauge, end-card).

## Router de producción (elige la mano correcta)

- **Toma cinematográfica con cámara + personaje consistente** → Higgsfield (Cinema Studio + Soul ID).
- **Cine dirigido con beats/coreografía** → Runway Gen-4.5.
- **Set/producto/practical que debe conservar identidad espacial desde una referencia íntegra** → Seedance image/reference-to-video, con gate de actuación y sonido.
- **RRSS desde un paquete de stills ficticios, sin copy/practical exacto** → Gemini Omni image-to-video (ver `workflows/living-social-wall-clips.md`); no confundir el canal con la regla de motor.
- **Broadcast** → Veo 3.1. **Edición conversacional o microescena flexible** → Gemini Omni. Selección completa: `workflows/engine-selection-by-fidelity-contract.md`.
- **Tipo kinética / mograph de precisión / 3D** → craft humano (AE/Blender/Houdini), handoff con spec.
- **VFX / compositing** (keying, roto, tracking/matchmove, integración CGI, simulaciones, cleanup) → craft
  humano (Nuke/Fusion/AE + Mocha) + AI-VFX (Runway roto, Wonder/Flow mocap, Beeble relight); ver `../modules/11`.
- **Subir resolución del entregable final** → Magnific (Video Sequence Enhancement).
- **Keyframes** → `greenhouse-ai-image-generator` / `design-studio`. **Formato por red** → `social-media-studio`.

## Regla dura: gasto gobernado + confirmación humana

Producir/renderizar IA **cuesta créditos**. Antes de volumen: dimensiona el gasto, valida el ritmo en el
**animatic** (barato) antes de producir tomas, genera en **chunks 5–8s**, y sube calidad/upscale solo de lo
elegido. **Entregar/publicar pasa SIEMPRE por confirmación humana.** La IA acelera; el humano dirige y hace el finish.
