# Gemini Omni Flash en Vertex AI — referencia operativa

> **Tipo de documento:** Referencia técnica agent-facing (para operar Gemini Omni sin volver a investigar).
> **Verificado as-of:** 2026-07-05 (runtime `efeonce-group`) + docs oficiales Google al 2026-07-05.
> **Idioma:** es-CL neutro (tuteo).
> **Regla de uso:** el modelo está en **PUBLIC_PREVIEW**. Todo dato marcado `(as-of 2026-07 — reverificar)` es volátil: confírmalo contra la fuente antes de comprometer costo o pipeline. Google lanzó el modelo el **2026-06-30**; el contrato cambia semana a semana.

---

## 0. TL;DR operativo (lo que necesitas para invocarlo hoy)

- **Modelo:** `gemini-omni-flash-preview`.
- **Dónde corre para nosotros:** Vertex AI, región **`global`** (NO `us-central1`, NO `us-east4` → ahí da `NOT_FOUND`). Verificado en `efeonce-group`.
- **Método en Vertex:** clásico `generateContent`, con `generationConfig.responseModalities: ["TEXT","VIDEO"]` (ambas obligatorias).
- **Salida verificada:** clip **10 s · 1280×720 · 24 fps · MP4**, base64 inline en `candidates[].content.parts[].inlineData` (`mimeType: video/mp4`) + un part de texto "thinking" que se ignora.
- **Entradas:** texto + imagen (`image/png`) + video (`video/mp4`) como `inlineData` → text/image/video-to-video con fuerte continuidad.
- **Costo:** ~**$0.10 por segundo** de video 720p ($17.50/1M tokens de salida × 5.792 tokens/seg). Un clip de 10 s ≈ **$1.00**.
- **Watermark:** SynthID invisible + C2PA Content Credentials, siempre, no desactivable.

---

## 1. Qué es Gemini Omni / Omni Flash

Gemini Omni es la familia "any-to-any" de Google DeepMind donde **el razonamiento multimodal de Gemini se une a la generación y edición de video**. La frase de posicionamiento oficial: *"where Gemini's ability to reason meets the ability to create"* — o dicho en su propia analogía, **"como Nano Banana, pero para video"** ([DeepMind](https://deepmind.google/models/gemini-omni/)).

**`gemini-omni-flash-preview`** es la variante Flash: la punta rápida y cost-efficient de esa familia, orientada a generación de video de alta calidad + **edición conversacional multi-turno** desde combinaciones de texto, imagen y video.

### 1.1 Arquitectura (posición conceptual)

Google no publica el detalle interno del modelo (tamaño, training data, mezcla de expertos). Lo que sí comunica es **convergencia nativa**: Omni integra el entendimiento multimodal de forma nativa en vez de encadenar componentes separados. Conceptualmente fusiona cuatro linajes de capacidad que antes vivían en modelos distintos:

| Linaje | Qué aporta a Omni | Modelo "padre" |
|---|---|---|
| **Gemini** (razonamiento) | Conocimiento del mundo real (historia, biología, física, lógica narrativa), seguimiento de instrucciones, coherencia semántica | Gemini 3.x |
| **Veo** (render) | Síntesis cinemática de video con audio | Veo 3.1 / Fast |
| **Genie** (world sim) | Simulación de física y mundo (gravedad, energía cinética, fluidos) — coherencia de escena | Genie |
| **Nano Banana** (edición) | Edición conversacional iterativa, reemplazo de sujeto/objeto por lenguaje natural, referencia por imagen | Nano Banana (Gemini Image) |

> `(as-of 2026-07 — reverificar)` La descripción "fusiona Veo + Genie + Nano Banana" es lectura de arquitectura conceptual a partir de la comunicación de Google y cobertura de prensa; Google **no confirma** un merge literal de esos modelos. Trátalo como mapa mental, no como contrato técnico. Fuente: [DeepMind Gemini Omni](https://deepmind.google/models/gemini-omni/).

### 1.2 Omni Flash vs Gemini 3.x Flash/Pro vs Veo

| Eje | Gemini 3.x Flash/Pro | Veo 3.1 (Fast) | **Gemini Omni Flash** |
|---|---|---|---|
| Salida primaria | Texto (+ imagen en variantes `*-image`) | Video con audio | **Video con audio + texto** |
| Edición conversacional de video | No | Limitada (regen) | **Sí — multi-turno stateful** |
| Entrada video como referencia | Análisis/comprensión | Image-to-video | **Text/image/video-to-video con continuidad fuerte** |
| Razonamiento del mundo | Sí (fuerte) | Débil | **Sí (heredado de Gemini)** |
| Costo video 720p | n/a | $0.10/s | **$0.10/s** (paridad con Veo 3.1 Fast) |

Lectura práctica: **si necesitas video, Omni Flash; si necesitas texto/análisis, Gemini 3.x Flash; si necesitas render cinemático "one-shot" sin conversación, Veo sigue siendo válido.** Omni Flash gana cuando el valor está en **iterar el video hablándole** (editar, reemplazar, extender la idea manteniendo continuidad).

---

## 2. Modalidades (entrada / salida)

### 2.1 Entrada

| Modalidad | Vertex (`generateContent`) — **verificado** | Gemini API (Interactions) — docs oficiales |
|---|---|---|
| **Texto** | Sí (`parts[].text`) | Sí |
| **Imagen** | Sí — `inlineData` `image/png` (verificado) / JPEG | Sí (base64 o Files API) |
| **Video** | Sí — `inlineData` `video/mp4` (verificado) | Sí (Files API por URI) |
| **Audio** | No documentado / no verificado | **No soportado** en el preview: *"Uploading audio references is unsupported in the current version"* |

`(as-of 2026-07 — reverificar)` El audio **de entrada** (referencia de audio) no está soportado en el preview de la Gemini API. El audio **de salida** sí se genera automáticamente. Fuente: [ai.google.dev/gemini-api/docs/omni](https://ai.google.dev/gemini-api/docs/omni).

### 2.2 Salida

- **Video** (MP4 con audio integrado) — modalidad principal.
- **Texto** — un part de "thinking"/razonamiento que acompaña la generación. En Vertex es **obligatorio pedir ambas** (`["TEXT","VIDEO"]`); el texto normalmente se descarta.
- **Audio** — no es una salida separada: viene embebido en el MP4, guiable por prompt.

### 2.3 Combinaciones soportadas (tareas)

En la Gemini API la tarea se declara con `generation_config.video_config.task`: `text_to_video` · `image_to_video` · `reference_to_video` · `edit`. En Vertex/`generateContent` la tarea se **infiere de las partes** que mandas (solo texto → t2v; texto+imagen → i2v; texto+video → edición/continuación).

---

## 3. Generación de video — especificaciones

| Parámetro | Valor | Fuente / estado |
|---|---|---|
| **Resolución** | **1280×720 (720p)** | Verificado runtime + pricing 720p. No hay selector de resolución expuesto. |
| **Duración** | **10 s** por request | Verificado (10 s). Anuncio: *"longer durations coming soon"*. Sin parámetro de control. |
| **FPS** | **24 fps** | Verificado runtime. No user-configurable. |
| **Audio junto al video** | **Sí**, embebido en el MP4, guiable por prompt | Docs + verificado |
| **Aspect ratio** | `16:9` (default) y `9:16` | Docs Gemini API (`response_format.aspect_ratio`). En Vertex el clip verificado salió 1280×720 = 16:9. |
| **Cámara / consistencia** | Coherencia de escena y física; **limitación conocida** en consistencia de personaje ante cambios de escena/paneo | Anuncio + DeepMind |
| **Image-to-video** | Sí (imagen de referencia → video) | Docs + verificado (`image/png` inline) |
| **Video-to-video / reference-to-video** | Sí, con **fuerte continuidad** desde el clip de entrada | Verificado (`video/mp4` inline) |
| **Edición conversacional multi-turno** | Sí — stateful; recuerda el contexto del video y aplica cambios preservando lo no tocado | Docs (Interactions API `previous_interaction_id`) |

> `(as-of 2026-07 — reverificar)` Ni resolución, ni fps, ni duración son configurables por parámetro en el preview. Si el pipeline necesita 1080p/4k o >10 s, **usa Veo 3.1** (que sí expone 720p/1080p/4k) y reserva Omni para el loop conversacional. Fuentes: [docs/omni](https://ai.google.dev/gemini-api/docs/omni), [blog Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/).

---

## 4. API / contrato

Hay **dos superficies distintas** y NO son intercambiables. Documenta cuál usas.

### 4.1 Vertex AI — `generateContent` (RUTA VERIFICADA, la nuestra)

```
POST https://aiplatform.googleapis.com/v1/projects/efeonce-group/locations/global/publishers/google/models/gemini-omni-flash-preview:generateContent
```

Headers:
```
Authorization: Bearer $(gcloud auth print-access-token)   # ADC
x-goog-user-project: efeonce-group
Content-Type: application/json
```

Body mínimo (text-to-video):
```json
{
  "contents": [
    { "role": "user", "parts": [ { "text": "<prompt>" } ] }
  ],
  "generationConfig": {
    "responseModalities": ["TEXT", "VIDEO"]
  }
}
```

Body con referencia (image/video-to-video) — la referencia va como `inlineData` base64:
```json
{
  "contents": [
    { "role": "user", "parts": [
      { "inlineData": { "mimeType": "image/png", "data": "<base64>" } },
      { "text": "<instrucción de edición/continuación>" }
    ] }
  ],
  "generationConfig": { "responseModalities": ["TEXT", "VIDEO"] }
}
```
(Reemplaza `image/png` por `video/mp4` para video-to-video — ambos verificados.)

**Reglas duras de la ruta Vertex:**
- `responseModalities` **debe** traer `["TEXT","VIDEO"]`. Con solo una → **400**: *"requires both text and video response modalities"*.
- Región **`global`**. Con `us-central1`/`us-east4` → **NOT_FOUND**.
- Auth por ADC + `x-goog-user-project: efeonce-group` (sin el header, el billing/quota puede resolverse mal).
- Respuesta **síncrona** (no long-running) en los clips de 10 s verificados.

Forma de la respuesta verificada:
```jsonc
{
  "candidates": [
    { "content": { "parts": [
        { "text": "…thinking… (ignorar)" },
        { "inlineData": { "mimeType": "video/mp4", "data": "<base64 del MP4 10s·720p·24fps>" } }
    ] } }
  ],
  "usageMetadata": {
    "candidatesTokensDetails": [
      { "modality": "VIDEO", "tokenCount": 57920 }   // = 5792 × 10 s
    ]
  }
}
```

`launchStage: PUBLIC_PREVIEW`.

### 4.2 Gemini API / AI Studio — Interactions API (ruta oficial de developers)

La Gemini API pública **reemplazó** `generateContent` por la **Interactions API** para Omni:
```
POST https://generativelanguage.googleapis.com/v1beta/interactions
# SDK google-genai: client.interactions.create(...)
```
- `response_format`: `{ "type": "video", "aspect_ratio": "16:9"|"9:16" }`, entrega `base64` (<4 MB) o `uri` (>4 MB, recomendado).
- `generation_config.video_config.task`: `text_to_video|image_to_video|reference_to_video|edit`.
- Multi-turno stateful: encadena con `previous_interaction_id`.
- Flags de performance: `background=false`, `store=false`, `stream=false` para generación síncrona rápida (ojo: `store=false` **desactiva** editar ese video después).
- Salida: `steps[].content[]` con `type:"video"`, `mime_type:"video/mp4"`, y `data` (base64) o `uri`.

**Parámetros NO soportados** (ambas rutas, preview): `system instructions`, `temperature`, `top_p`, `stop sequences`, `negativePrompt` (embébelo en lenguaje natural), `seed`, `fps`, `duration`, `resolution`, provisioned throughput.

> Divergencia clave a recordar: **Vertex expone `generateContent`; la Gemini API expone Interactions**. Nuestro runtime usa Vertex/`generateContent`. Si portas código desde un ejemplo de AI Studio, **no asumas** que el shape (`response_format`, `interactions.create`) aplica en Vertex.

---

## 5. Disponibilidad

| Superficie | Estado `(as-of 2026-07 — reverificar)` |
|---|---|
| **Gemini API (AI Studio)** | **GA del preview** desde 2026-06-30. Solo **paid tier** (no free tier). |
| **Vertex AI** | El anuncio dijo "rolling out to Vertex AI in the coming weeks". **Ya responde en `efeonce-group` región `global`** (verificado 2026-07-05), aunque cobertura de prensa aún lo listaba como pendiente. Trátalo como **preview temprano en Vertex**. |
| **Gemini Enterprise Agent Platform** | Sí (listado en el anuncio). |
| Gemini app / Google Flow / YouTube Shorts | Sí (superficies de producto, no API). |

- **Launch stage:** `PUBLIC_PREVIEW` (verificado en Vertex).
- **Regiones Vertex:** solo **`global`** confirmada; `us-central1` y `us-east4` → NOT_FOUND.
- **Idioma:** inglés (EN) plenamente soportado; otros idiomas **no evaluados**.
- **Restricción regional de edición:** editar videos **subidos** por el usuario NO está disponible para EEA, Suiza y Reino Unido.
- **Quotas / provisioned throughput:** provisioned throughput **no** disponible en preview. Quotas específicas no publicadas — asume límites de preview y maneja 429.

---

## 6. Pricing (exacto)

Fuente: [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) `(as-of 2026-07 — reverificar)`.

### 6.1 `gemini-omni-flash-preview`

| Concepto | Precio por 1M tokens |
|---|---|
| **Input** (texto / imagen / video / audio) | **$1.50** |
| **Output texto** | **$9.00** |
| **Output video** | **$17.50** |

**Conversión a $/segundo de video 720p:**
- **5.792 tokens/seg** de 720p (con audio).
- $17.50/1M × 5.792 = **$0.101 por segundo ≈ $0.10/s**.
- Clip 10 s = 57.920 tokens de salida video ≈ **$1.01**.
- Paridad de precio con **Veo 3.1 Fast** (720p $0.10/s).

### 6.2 Modelos relacionados (para decidir make-vs-buy)

| Modelo | Input /1M | Output | Notas |
|---|---|---|---|
| **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`) | $0.25 (texto/imagen/video) | $1.50 texto/thinking · **$30.00** imagen | Encadena bien con Omni (imagen → i2v) |
| **Veo 3.1 Fast** | — | **$0.10/s (720p)** · $0.12/s (1080p) · $0.30/s (4k) | Usar cuando necesitas >720p o one-shot |

> Regla de costo: **Omni Flash sale igual que Veo Fast a 720p**, así que el diferencial no es plata sino **capacidad conversacional**. Si el clip se va a iterar 3+ veces hablándole, Omni; si es render final único y quizás en 1080p/4k, Veo.

---

## 7. Safety / gobernanza

- **SynthID:** todos los videos generados llevan **watermark SynthID invisible** (detectable programáticamente), **no desactivable**.
- **C2PA Content Credentials:** además del SynthID, se adjuntan credenciales de contenido para verificación de procedencia.
- **Políticas de contenido:** alineadas a los AI Principles de Google; combinan evals automáticas, red-teaming humano, revisión ética y compliance de políticas.
- **Disclosure (nuestra obligación):** para entregables a clientes Globe o al sitio público, **declara que el video es generado por IA** — el SynthID lo respalda pero la disclosure editorial es nuestra. Ver `MOTION_BOUNDARY.md` / `CLIENT_DELIVERY.md`.

---

## 8. Límites conocidos / gotchas

| Gotcha | Detalle | Mitigación |
|---|---|---|
| **Techo 720p** | No hay selector de resolución; máx 1280×720 | Para HD/4k → Veo 3.1; o upscale posterior (Magnific / Topaz) |
| **10 s máx** | Sin control de duración; "longer coming soon" | Encadena clips vía edición multi-turno; o stitch en post |
| **Deforma texto/logos/UI** | Como todo modelo generativo de video, distorsiona tipografía, logotipos y UI fina | No pongas el wordmark Efeonce ni UI de producto renderizada por el modelo; compón el logo en post (AE) |
| **No-determinismo** | Sin `seed` → misma prompt da clips distintos | Guarda el mejor take; para consistencia de marca usa referencia imagen/video fuerte |
| **Filtros IP (`ip_detected`)** | Rechaza prompts/renders con propiedad intelectual protegida (personajes, marcas de terceros) | Prompts originales; nada de IP ajena |
| **Consistencia de personaje** | Se degrada ante cambios de escena / paneos largos | Clips cortos, escenas estables; refuerza con imagen de referencia del personaje |
| **Audio de entrada no soportado** | No puedes pasar una pista de audio como referencia (preview) | Guía el audio por texto; edita audio en post (DaVinci) |
| **Sin `negativePrompt`/`temperature`/`top_p`/system prompt** | Control fino ausente | Todo se dirige por lenguaje natural en el prompt |
| **`store=false` rompe edición futura** (Gemini API) | Si generas sin persistir, no puedes editar ese clip después | Deja `store=true` si vas a iterar |
| **Región Vertex** | Solo `global`; `us-central1`/`us-east4` → NOT_FOUND | Fija `locations/global` en el endpoint |
| **EEA/CH/UK** | No se puede editar video subido por el usuario en esas regiones | Considera si el flujo cliente cae ahí |

---

## 9. Verificado en runtime (`efeonce-group`, 2026-07-05)

Hechos comprobados por nosotros, no inferidos de docs:

- **Modelo:** `gemini-omni-flash-preview`.
- **Región:** **`global`** (única que responde; `us-central1` → NOT_FOUND).
- **Endpoint:**
  `POST https://aiplatform.googleapis.com/v1/projects/efeonce-group/locations/global/publishers/google/models/gemini-omni-flash-preview:generateContent`
- **Contrato:** `generationConfig.responseModalities: ["TEXT","VIDEO"]` — **ambas obligatorias**; una sola → **400** *"requires both text and video response modalities"*.
- **Auth:** ADC (`gcloud auth print-access-token`) + header `x-goog-user-project: efeonce-group`.
- **Salida:** clip **10 s · 1280×720 · 24 fps · MP4**, base64 inline en `candidates[].content.parts[].inlineData` (`mimeType: video/mp4`) + un `part` de texto "thinking" (se ignora).
- **Referencias:** acepta **imagen (`image/png`)** Y **video (`video/mp4`)** como `inlineData` → image/video-to-video con **fuerte continuidad** desde la fuente.
- **usageMetadata:** `candidatesTokensDetails` modalidad `VIDEO` = **57.920 tokens** (5.792 × 10 s).
- **launchStage:** `PUBLIC_PREVIEW`.
- **Prioridad de disponibilidad:** ya operable en Vertex pese a que la comunicación pública lo daba como "coming weeks" — reverifica antes de cablear un cron/pipeline productivo.

### 9.1 Capacidades probadas EN VIVO (no inferidas) — 2026-07-05

| Capacidad | Estado | Cómo se probó |
|---|---|---|
| `text_to_video` | ✅ | solo `text` en parts |
| `image_to_video` (1 referencia) | ✅ | `text` + 1 `inlineData image/png` → continuidad casi idéntica |
| **Múltiples referencias de imagen (2)** | ✅ | `text` + 2 `inlineData image/png` → mezcló los dos mundos (estadio vacío + lleno) en una toma |
| Video como referencia / continuación | ✅ | `text` + `inlineData video/mp4` |
| **Edición de video (video-to-video)** | ✅ | `text`("edita: cámara en órbita + luz de amanecer") + `inlineData video/mp4` → editó el clip existente manteniendo el mundo |
| **Audio nativo sincronizado + contextual** | ✅ | los MP4 traen pista `aac` **no silente y contextual**: estadio lleno **-15,4 dB** (multitud) vs vacío **-16,8 dB** (ambiente) |
| **Salida 9:16 vertical** | ✅ | referencia **portrait 720×1280** → salida **720×1280** (el aspect se **infiere de las dimensiones de la referencia**) |
| Resolución | ⚠️ | siempre lado corto **720p** (720×1280 vertical o 1280×720 horizontal) |
| Texto/logos/UI legibles | ❌ | los **deforma** (no confiar la exactitud a la IA → overlay real) |

> **Implicaciones de máximo aprovechamiento:** (a) el **audio nativo** sirve como scratch/ambiente sin
> pedirlo — `audio-studio` lo reemplaza/mejora para el master; (b) **9:16 nativo** con referencia portrait
> → versiones sociales sin reframe; (c) **edición y multi-referencia** habilitan variaciones e inserción de
> elementos manteniendo el mundo (continuidad). Mapa completo en `efeonce/GEMINI_OMNI_CAPABILITIES.md`.

Snippet canónico de invocación (curl):
```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -sS -X POST \
  "https://aiplatform.googleapis.com/v1/projects/efeonce-group/locations/global/publishers/google/models/gemini-omni-flash-preview:generateContent" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-user-project: efeonce-group" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role":"user","parts":[{"text":"<prompt>"}]}],
    "generationConfig": {"responseModalities":["TEXT","VIDEO"]}
  }'
# → candidates[].content.parts[] : {text:"thinking"} + {inlineData:{mimeType:"video/mp4",data:"<base64>"}}
```

---

## 10. Tabla de volatilidad por dato

Cuánto confiar en cada dato y con qué frecuencia reverificar (preview = todo se mueve).

| Dato | Estabilidad | Reverificar |
|---|---|---|
| Model ID `gemini-omni-flash-preview` | Alta mientras dure el preview | Al pasar a GA (cambia el sufijo) |
| Región Vertex `global` única | **Media** | Antes de cada pipeline nuevo (agregan regiones seguido) |
| Contrato `responseModalities:["TEXT","VIDEO"]` (Vertex) | Media | Si migra a Interactions API en Vertex |
| Interactions API (Gemini API pública) | Media | Docs cambian semana a semana en preview |
| 720p · 10 s · 24 fps | **Baja** (Google promete "longer/soon") | Cada release; duración y resolución son lo primero que cambiará |
| Pricing $1.50 in / $17.50 out video / $0.10/s | Media | Antes de comprometer costo a cliente |
| 5.792 tokens/seg 720p | Alta (verificado en usageMetadata) | Si cambian resolución base |
| Audio input no soportado | Media | Cada release (es un "not yet") |
| SynthID + C2PA siempre | **Alta** | No cambia (política) |
| launchStage PUBLIC_PREVIEW | Media | Al anuncio de GA |
| Disponibilidad Vertex vs "coming weeks" | **Baja** | Cada vez que lo uses hasta que Google confirme GA en Vertex |

---

## 11. Fuentes

- DeepMind — Gemini Omni: https://deepmind.google/models/gemini-omni/
- Google Blog — "Start building with Nano Banana 2 Lite and Gemini Omni Flash": https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/
- Gemini API — Generate and edit videos with Gemini Omni Flash: https://ai.google.dev/gemini-api/docs/omni
- Gemini API — Video generation: https://ai.google.dev/gemini-api/docs/video
- Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API — Models: https://ai.google.dev/gemini-api/docs/models
- Vertex AI / Gemini Enterprise Agent Platform — inference & pricing: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
- VentureBeat — "Google unveils Gemini Omni any-to-any model" / "Gemini Omni Flash hits the API" (contexto enterprise): https://venturebeat.com/technology/google-unveils-gemini-omni-any-to-any-ai-model-what-enterprises-should-know
- **Verificación runtime propia** — `efeonce-group`, Vertex `global`, 2026-07-05.

> Nota de método: los datos de la sección 9 son verificación directa nuestra y **prevalecen** sobre docs/prensa si hay drift. El resto está marcado por volatilidad en la sección 10. Reverifica antes de cablear producción.
