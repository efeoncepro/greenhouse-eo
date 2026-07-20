# Gemini Omni Flash — referencia operativa (Interactions API)

> **Tipo de documento:** Referencia técnica agent-facing (para operar Gemini Omni sin volver a investigar).
> **Verificado as-of:** migración a Interactions API **2026-07-20** (`efeonce-globe`, Vertex keyless `global` + Gemini API con key); runtime histórico `generateContent` 2026-07-05 + edición persistida Glitch 2026-07-11 (`efeonce-group`, `global`), **ya no vigente**.
> **Idioma:** es-CL neutro (tuteo).
> **Regla de uso:** el modelo está en **PUBLIC_PREVIEW**. Todo dato marcado `(as-of 2026-07 — reverificar)` es volátil: confírmalo contra la fuente antes de comprometer costo o pipeline. Google lanzó el modelo el **2026-06-30**; el contrato cambia semana a semana.

> **Actualización 2026-07-20 — Omni migró a la Interactions API.** `gemini-omni-flash-preview` **ya no es invocable por `generateContent`**: ese método devuelve `400 "gemini-omni-flash-preview is only supported in the Interactions API and cannot be called directly via generateContent."` Todo el contrato `:generateContent` + `responseModalities:["TEXT","VIDEO"]` que describía la versión anterior de este doc quedó **STALE**. El modelo ahora corre sobre `/interactions` en **dos superficies distintas y NO intercambiables**:
> 1. **Vertex AI KEYLESS (GEAP)** — `POST …/v1beta1/projects/{project}/locations/{global|us-central1}/interactions`, auth **ADC/WIF Bearer** (sin API key, sin `x-goog-user-project`; el proyecto va en el path). Sirve **solo GENERACIÓN** (`text_to_video`, `image_to_video`). **No** sirve edición stateful: `previous_interaction_id` → `400 "…do not support previous_interaction_id"` y `GET /interactions/{id}` → `500`.
> 2. **Gemini API (generativelanguage) con API KEY** — `POST https://generativelanguage.googleapis.com/v1beta/interactions?key=API_KEY`. **Rechaza OAuth** (`403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`): exige API key. Sirve la **Interactions API completa**, incluida la **EDICIÓN stateful** (`previous_interaction_id` + `store:true`).
> Las specs que siguen vigentes (720p · 24fps · audio nativo · SynthID/C2PA · ~$0.10/s) no cambiaron. Verificado en vivo 2026-07-20: generación t2v keyless por Vertex → `200 completed` (MP4 inline ~3.5MB) **y** edición stateful por Gemini-key → `200 completed`. Reverifica antes de cablear producción: sigue en preview.

---

## 0. TL;DR operativo (lo que necesitas para invocarlo hoy)

- **Modelo:** `gemini-omni-flash-preview`.
- **Método (NUEVO):** **Interactions API** (`POST …/interactions`), NO `generateContent` (bloqueado con `400`). El `input` es polimórfico y todo el contrato es **snake_case**.
- **Dos superficies, elige por tarea:**
  - **Generar** (`text_to_video`, `image_to_video`) → **Vertex KEYLESS**: `POST https://aiplatform.googleapis.com/v1beta1/projects/<project>/locations/global/interactions`, auth **ADC/WIF Bearer** (sin API key, sin `x-goog-user-project`). También responde `us-central1` (host `us-central1-aiplatform.googleapis.com`).
  - **Editar** (stateful, `previous_interaction_id` + `store:true`) → **Gemini API con KEY**: `POST https://generativelanguage.googleapis.com/v1beta/interactions?key=API_KEY`. Vertex keyless **no** edita.
- **Body de generación:** `{ model, input, response_format:{type:"video", aspect_ratio:"16:9"|"9:16"}, generation_config:{video_config:{task:"text_to_video"|"image_to_video"|"reference_to_video"}}, background:false, store:<bool>, stream:false }`. `input` = un STRING (t2v) o un `Content[]` de `{type:"image", data, mime_type} + {type:"text", text}` (i2v / reference_to_video).
- **Body de edición:** `{ model, previous_interaction_id, input:"<instrucción>", response_format, store:true }` (SIN `video_config.task`).
- **Salida:** respuesta **síncrona unaria** (~35–60 s de bloqueo). `{ id, status:"completed"|..., steps:[{type:"thought"}, {type:"model_output", content:[{type:"video", mime_type:"video/mp4", data:<base64> | uri:<url>}]}], usage:{output_tokens_by_modality:[{modality:"video", tokens}]} }`. Extrae el video en `steps[].type==="model_output"` → `content[].type==="video"` → `data` (base64, **≤4MB inline**) o `uri` (>4MB; al uri de Gemini se le anexa la key para descargar). Clip **3–10 s · 720p lado corto · 24 fps · MP4 con audio**, `16:9` o `9:16`.
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
| Edición conversacional de video | No | Limitada (regen) | **Sí — multi-turno stateful (solo superficie Gemini-key, no Vertex keyless)** |
| Entrada video como referencia | Análisis/comprensión | Image-to-video | **Text/image/video-to-video con continuidad fuerte** |
| Razonamiento del mundo | Sí (fuerte) | Débil | **Sí (heredado de Gemini)** |
| Costo video 720p | n/a | $0.10/s | **$0.10/s** (paridad con Veo 3.1 Fast) |

Lectura práctica: **si necesitas video con una microescena que puede reinterpretar un paquete de referencias o editar por conversación, Omni Flash es fuerte; si necesitas texto/análisis, Gemini 3.x Flash; si necesitas render cinemático "one-shot" sin conversación, Veo sigue siendo válido.** No seleccionar Omni sólo por el canal: para un set/producto/practical que debe conservarse fielmente desde un key visual, evaluar primero Seedance image/reference-to-video y aplicar el mismo gate de actuación/sonido. Evidencia comparada: `workflows/engine-selection-by-fidelity-contract.md`.

---

## 2. Modalidades (entrada / salida)

### 2.1 Entrada

| Modalidad | Interactions API — cómo va en el `input` | Estado |
|---|---|---|
| **Texto** | STRING pelado (t2v) o `{type:"text", text}` dentro de `Content[]` | Verificado (Vertex keyless + Gemini-key) |
| **Imagen** | `{type:"image", data:BASE64, mime_type:"image/png"}` (o `image/jpeg`) dentro de `Content[]` | Verificado (i2v / reference_to_video) |
| **Video** | Referencia de video para editar: se encadena por `previous_interaction_id` (Gemini-key), no como parte del `input` | Verificado en la superficie Gemini-key |
| **Audio** | — | **No soportado** en el preview: *"Uploading audio references is unsupported in the current version"* |

`(as-of 2026-07 — reverificar)` El audio **de entrada** (referencia de audio) no está soportado en el preview de la Gemini API. El audio **de salida** sí se genera automáticamente. Fuente: [ai.google.dev/gemini-api/docs/omni](https://ai.google.dev/gemini-api/docs/omni).

### 2.2 Salida

- **Video** (MP4 con audio integrado) — modalidad principal. En la respuesta vive en `steps[].type==="model_output"` → `content[].type==="video"`.
- **Texto** — el modelo emite un `step` de razonamiento (`type:"thought"`) antes del `model_output`; no es un video, se ignora al extraer.
- **Audio** — no es una salida separada: viene embebido en el MP4, guiable por prompt.

### 2.3 Combinaciones soportadas (tareas)

En la Interactions API la tarea se declara **explícitamente** en `generation_config.video_config.task`: `text_to_video` · `image_to_video` · `reference_to_video` (todas de **generación**, disponibles en Vertex keyless y Gemini-key) · `edit` (**stateful**, solo Gemini-key, y **sin** `video_config.task`: se identifica por `previous_interaction_id`). Ya NO se infiere de las partes como hacía la ruta `generateContent`; hay que setear el `task` correcto según el shape del `input`.

### 2.4 Excepción operativa: practical legible bloqueado (Glitch, 2026-07-11)

En una corrida real de Glitch (ruta `generateContent` histórica), el PNG íntegro con un practical `ON AIR` legible, su derivado 720p y un video que ya contenía ese practical se bloquearon antes de producir salida. No se aisló que la palabra sea el motivo único: un request **sólo de texto** sí generó un letrero `ON AIR` físico y correctamente integrado en el set. Trata esto como un bloqueo opaco de combinación de input, no como una regla de seguridad sobre todo texto. En la **Interactions API** el mismo bloqueo se manifiesta como `status:"failed"` sin `model_output` (RAI block, típicamente `PROHIBITED_CONTENT`); la generación de personas puede caer ahí hasta que el proyecto quede en allowlist.

Cuando un elemento es diegético y narrativamente crítico, quedan prohibidos blur de entrada y recomposición posterior para eludir este bloqueo. Haz un probe mínimo una sola vez; si el mismo input vuelve a bloquearse, conserva el asset como dirección y genera el **plano completo** text-to-video, describiendo el elemento como practical físico desde el primer frame. Valida su perspectiva, oclusión, profundidad y lectura en el resultado. No uses ese fallback para logos, copy de UI o texto que deba ser exacto: éstos permanecen fuera de Omni.

---

## 3. Generación de video — especificaciones

| Parámetro | Valor | Fuente / estado |
|---|---|---|
| **Resolución** | **1280×720 (720p)** lado corto | Verificado runtime + pricing 720p. No hay selector de resolución expuesto. |
| **Duración** | **3–10 s** por request | 720p. Anuncio: *"longer durations coming soon"*. Sin parámetro de control fino. |
| **FPS** | **24 fps** | Verificado runtime. No user-configurable. |
| **Audio junto al video** | **Sí**, embebido en el MP4, guiable por prompt | Docs + verificado |
| **Aspect ratio** | `16:9` (default) y `9:16` | `response_format.aspect_ratio`. En `edit` **no** se setea (lo hereda del input). |
| **Cámara / consistencia** | Coherencia de escena y física; **limitación conocida** en consistencia de personaje ante cambios de escena/paneo | Anuncio + DeepMind |
| **Image-to-video** | Sí — `task:"image_to_video"` con imagen base64 en el `input` | Verificado (Vertex keyless + Gemini-key) |
| **Reference-to-video** | Sí, con **fuerte continuidad** desde la(s) imagen(es) de referencia | `task:"reference_to_video"` |
| **Edición conversacional multi-turno** | Sí — stateful; recuerda el contexto del video y aplica cambios preservando lo no tocado | **Solo Gemini-key** (`previous_interaction_id` + `store:true`); Vertex keyless NO edita. ~3 ediciones secuenciales en preview |

> `(as-of 2026-07 — reverificar)` Ni resolución, ni fps, ni duración son configurables por parámetro fino en el preview. Si el pipeline necesita 1080p/4k o >10 s, **usa Veo 3.1** (que sí expone 720p/1080p/4k) y reserva Omni para el loop conversacional. Fuentes: [docs/omni](https://ai.google.dev/gemini-api/docs/omni), [blog Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/).

---

## 4. API / contrato — Interactions API

`gemini-omni-flash-preview` corre **solo por la Interactions API** (`POST …/interactions`). `generateContent` está bloqueado: devuelve `400 "gemini-omni-flash-preview is only supported in the Interactions API and cannot be called directly via generateContent."` — NO lo uses. Hay **dos superficies** de la Interactions API, distintas y NO intercambiables; elige por tarea (ver §4.0). Todo el contrato es **snake_case** y la llamada es **síncrona unaria** (~35–60 s de bloqueo por request).

### 4.0 Elección de superficie (regla de decisión)

| Necesitas | Superficie | Auth | Sirve `edit` |
|---|---|---|---|
| **Generar** (`text_to_video`, `image_to_video`, `reference_to_video`) | **Vertex AI KEYLESS (GEAP)** | ADC/WIF Bearer (scope `cloud-platform`); **sin** API key, **sin** `x-goog-user-project` | ❌ No — `previous_interaction_id` → `400 "…do not support previous_interaction_id"`; `GET /interactions/{id}` → `500` |
| **Editar** (stateful) o generar y luego editar | **Gemini API (generativelanguage) con KEY** | `?key=API_KEY`; **rechaza OAuth** → `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT` | ✅ Sí — Interactions API completa, incl. `previous_interaction_id` + `store:true` |

Regla operativa Globe: **generar por Vertex keyless, editar por Gemini-key**. Es exactamente lo que hace el `VertexOmniAdapter` de `efeonce-globe` (ver §9.3).

### 4.1 Vertex AI KEYLESS — generación (GEAP)

```
POST https://aiplatform.googleapis.com/v1beta1/projects/<project>/locations/global/interactions
# us-central1 también responde:
POST https://us-central1-aiplatform.googleapis.com/v1beta1/projects/<project>/locations/us-central1/interactions
```

Headers:
```
Authorization: Bearer $(gcloud auth print-access-token)   # ADC/WIF, scope cloud-platform
Content-Type: application/json
```

**Reglas duras de la ruta keyless:**
- **Sin API key** y **sin** `x-goog-user-project`: el proyecto va en el path (`projects/<project>`). Auth = Bearer OAuth/WIF.
- Path con `v1beta1` (con el `1`), a diferencia de la ruta Gemini (`v1beta`).
- Solo **generación** (`text_to_video`, `image_to_video`, `reference_to_video`). Cualquier `previous_interaction_id` → `400`; `GET /interactions/{id}` → `500`. Para editar, pasa a §4.2.
- La API `aiplatform.googleapis.com` ya está habilitada en el proyecto.

### 4.2 Gemini API con KEY — generación + edición stateful

```
POST https://generativelanguage.googleapis.com/v1beta/interactions?key=API_KEY
# SDK google-genai: client.interactions.create(...)
```

**Reglas duras de la ruta Gemini-key:**
- **Exige API key** en `?key=`. Un Bearer OAuth → `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
- Es la **única superficie que edita hoy**: `previous_interaction_id` + `store:true`.
- `store` gobierna la recuperación/edición posterior. Retención del store: **55 días** (paid) / **1 día** (free). ~3 ediciones secuenciales en preview. `store:false` → no podrás editar/recuperar ese video después.
- `background:true` + polling por ID para ediciones largas recuperables (opcional; la llamada base es síncrona).

### 4.3 Cuerpos de request (ejemplos)

**`text_to_video`** — `input` es un STRING pelado:
```json
{
  "model": "gemini-omni-flash-preview",
  "input": "<prompt de texto describiendo la escena>",
  "response_format": { "type": "video", "aspect_ratio": "16:9" },
  "generation_config": { "video_config": { "task": "text_to_video" } },
  "background": false,
  "store": false,
  "stream": false
}
```

**`image_to_video`** (y `reference_to_video`) — `input` es un `Content[]`; la imagen va base64 en `data`:
```json
{
  "model": "gemini-omni-flash-preview",
  "input": [
    { "type": "image", "data": "<base64 del PNG/JPEG>", "mime_type": "image/png" },
    { "type": "text", "text": "<prompt de animación / continuidad>" }
  ],
  "response_format": { "type": "video", "aspect_ratio": "9:16" },
  "generation_config": { "video_config": { "task": "image_to_video" } },
  "store": false
}
```

**`edit`** (STATEFUL — solo Gemini-key) — encadena con `previous_interaction_id`, **sin** `video_config.task` y **sin** `aspect_ratio` (lo hereda del input; setearlo → `400 "Aspect ratio cannot be set in response format for edit task"`):
```json
{
  "model": "gemini-omni-flash-preview",
  "previous_interaction_id": "<id de la interacción a editar>",
  "input": "<instrucción de edición en lenguaje natural>",
  "response_format": { "type": "video" },
  "store": true
}
```

Opcional en cualquier `response_format`: `"delivery": "uri"` para forzar entrega por URL en vez de base64 inline.

### 4.4 Forma de la respuesta (ambas superficies)

```jsonc
{
  "id": "<interaction id>",
  "status": "completed",           // también: "failed" | "in_progress" | …
  "steps": [
    { "type": "thought" },         // razonamiento; NO es video, ignóralo
    { "type": "model_output", "content": [
      { "type": "video", "mime_type": "video/mp4", "data": "<base64 ≤4MB inline>" }
      // >4MB: en vez de "data" viene "uri":"<url>" (al uri de Gemini hay que anexarle la key para descargar)
    ] }
  ],
  "usage": {
    "output_tokens_by_modality": [ { "modality": "video", "tokens": 57920 } ]  // = 5792 × 10 s
  }
}
```

**Extracción del video (contrato):** busca `steps[].type === "model_output"` → dentro, `content[].type === "video"` → toma `data` (base64) o `uri`. NO recorras recursivamente toda la interacción: podrías extraer la `image` del `input` como falso output. `status:"failed"` o `model_output` sin `video` = RAI block / falla de provider (no hay clip que rescatar).

**Parámetros NO soportados** (ambas superficies, preview): `system instructions`, `temperature`, `top_p`, `stop sequences`, `negativePrompt` (embébelo en lenguaje natural), `seed`, `fps`, `duration`, `resolution`, provisioned throughput.

> Divergencia clave a recordar (2026-07-20): **ambas superficies usan la Interactions API**; lo que cambia es (a) el host + versión de path (`aiplatform…/v1beta1/projects/…/interactions` keyless vs `generativelanguage…/v1beta/interactions?key=` con key), (b) la auth (Bearer vs API key) y (c) que **solo la ruta Gemini-key edita**. `generateContent` ya no aplica en ninguna. Si portas código viejo de este repo o un ejemplo de AI Studio, **no asumas** el shape `contents`/`responseModalities`.

### 4.5 Facturación y superficies — evita comprar el producto equivocado

- **GEAP = Gemini Enterprise Agent Platform** es el **rebrand de Vertex AI**. Es la superficie **keyless pay-as-you-go** (ADC/WIF, sin key). Hoy sirve **solo generación** de Omni; su facturación es la de Vertex/GEAP inference. Es la que usa Globe para generar.
- **Gemini Developer API (generativelanguage)** = superficie con **API key**, facturación **Prepay/Postpay** de la Gemini API. Es la **única superficie que edita** Omni hoy. El video de Omni es **paid-only** (no hay free tier para video).
- **"Gemini Enterprise" (per-seat)** es el producto **sucesor de Agentspace** (licencias por asiento), **NO tiene relación con la API de video** de Omni. **No lo compres** para operar Omni: la edición sale por Gemini Developer API con key, no por asientos.

---

## 5. Disponibilidad

| Superficie | Estado `(as-of 2026-07 — reverificar)` |
|---|---|
| **Gemini API (generativelanguage, con key)** | **GA del preview** desde 2026-06-30. Solo **paid tier** (no free tier para video). Interactions API completa, incl. **edición** stateful. |
| **Vertex AI keyless (GEAP)** | **Responde** por Interactions API en `global` y `us-central1` (verificado 2026-07-20 en `efeonce-globe`; `aiplatform.googleapis.com` habilitada). **Solo generación** — no edita. Trátalo como **preview** en Vertex. |
| **Gemini app / Google Flow / YouTube Shorts** | Sí (superficies de producto, no API). |

- **Launch stage:** `PUBLIC_PREVIEW`.
- **Regiones Vertex (Interactions):** `global` y `us-central1` responden; `us-east4` no. Reverifica antes de fijar región en un pipeline.
- **Generación de personas:** puede caer en RAI block (`PROHIBITED_CONTENT`) hasta que el proyecto quede en allowlist.
- **Idioma:** inglés (EN) plenamente soportado; otros idiomas **no evaluados**.
- **Restricción regional de edición:** editar videos **subidos** por el usuario NO está disponible en EEA, Suiza y Reino Unido; editar videos **generados por el modelo** sí funciona ahí.
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

> Regla de costo: **Omni Flash sale igual que Veo Fast a 720p**, así que el diferencial no es sólo plata sino ajuste del motor al contrato de fidelidad. No decidir sólo por “3+ iteraciones”: Glitch acumuló iteraciones Omni sin conservar su set, mientras que Redes Sociales validó Omni porque animó un paquete de stills ficticios sin copy/practical exacto. Antes de gastar, clasificar si la referencia es flexible o identidad de set (`workflows/engine-selection-by-fidelity-contract.md`).

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
| **`generateContent` bloqueado** | `400 "…only supported in the Interactions API and cannot be called directly via generateContent."` | Usa `/interactions` (§4). No portes código viejo con `contents`/`responseModalities` |
| **Vertex keyless NO edita** | `previous_interaction_id` → `400`; `GET /interactions/{id}` → `500` | Genera por Vertex keyless, edita por Gemini-key (§4.0) |
| **Techo 720p** | No hay selector de resolución; máx 1280×720 lado corto | Para HD/4k → Veo 3.1; o upscale posterior (Magnific / Topaz) |
| **3–10 s máx** | Sin control de duración fino; "longer coming soon" | Encadena clips vía edición multi-turno (Gemini-key); o stitch en post |
| **Deforma texto/logos/UI** | Como todo modelo generativo de video, distorsiona tipografía, logotipos y UI fina | No pongas el wordmark Efeonce ni UI de producto renderizada por el modelo; compón el logo en post (AE) |
| **No-determinismo** | Sin `seed` → misma prompt da clips distintos | Guarda el mejor take; para consistencia de marca usa referencia imagen/video fuerte |
| **Filtros IP (`ip_detected`)** | Rechaza prompts/renders con propiedad intelectual protegida (personajes, marcas de terceros) | Prompts originales; nada de IP ajena |
| **Consistencia de personaje** | Se degrada ante cambios de escena / paneos largos | Clips cortos, escenas estables; refuerza con imagen de referencia del personaje |
| **Audio de entrada no soportado** | No puedes pasar una pista de audio como referencia (preview) | Guía el audio por texto; edita audio en post (DaVinci) |
| **Edit `audio-only` literal** | En el piloto Glitch fue rechazado pre-generación; el preview no ofrece una operación de mezcla/audio aislada | Si el operador pide textura Omni, formular una edición audiovisual localizada, revisar sus píxeles/transientes por separado y rescatar sólo ventanas de audio aprobadas sobre la placa visual determinista |
| **Sin `negativePrompt`/`temperature`/`top_p`/system prompt** | Control fino ausente | Todo se dirige por lenguaje natural en el prompt |
| **`store=false` rompe edición futura** (Gemini-key) | Si generas sin persistir, no puedes editar ese clip después. Retención: 55 días paid / 1 día free | Deja `store=true` si vas a iterar (solo aplica en la ruta Gemini-key) |
| **Edit `aspect_ratio` prohibido** | En `task:edit` setear `response_format.aspect_ratio` → `400 "Aspect ratio cannot be set…for edit task"` | Omítelo: el edit hereda el aspect del input |
| **`403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`** | Mandaste Bearer OAuth a la ruta Gemini (`generativelanguage`) | Esa ruta exige API key (`?key=`), no OAuth |
| **`completed` no prueba continuidad** | Un edit puede devolver MP4 válido y aun así introducir bandas, drift o anatomía fuera de la zona pedida | Revisar el clip completo a 1×/0.5× + contact sheet antes de aceptarlo; registrar `provider completed` separado de `creative accepted` |
| **Cambio sólo editorial** | Retime, repetición o freeze que no cambian la verdad física no requieren píxeles nuevos | Editar el mismo master de forma determinista; nunca usarlo para fingir actuación hero, practical diegético o texto integrado. Foley nativo sólo por petición explícita y siempre se recupera por eventos, no aceptando el video completo |
| **Región Vertex Interactions** | `global` y `us-central1` responden; `us-east4` no. Host = `{region}-aiplatform.googleapis.com` (o `aiplatform.googleapis.com` para `global`) | Fija `locations/global` (o `us-central1`) en el path |
| **RAI block en personas** | Generar personas puede caer en `status:"failed"` (`PROHIBITED_CONTENT`) hasta allowlist del proyecto | Solicita allowlist; sin `model_output` no hay clip que rescatar |
| **EEA/CH/UK** | No se puede editar video **subido** por el usuario en esas regiones (editar video generado por el modelo sí) | Considera si el flujo cliente cae ahí |

---

## 9. Verificado en runtime

> **Transporte superado (2026-07-20):** las corridas 9.0/9.1/9.2 se hicieron por `generateContent` (`efeonce-group`, `global`) **antes** de que Google moviera Omni a la Interactions API. Ese endpoint + contrato (`contents`/`responseModalities`/`x-goog-user-project`) **ya no funciona** (400). Lo que sigue siendo verdad es el **comportamiento del modelo** que observamos (audio nativo, 9:16 desde referencia portrait, multi-referencia, deformación de texto, gate temporal del edit); reléelo como capacidad del modelo, no como shape de request. El transporte vigente y la evidencia fresca están en **§9.3 (2026-07-20)**.

### 9.0 Corrida histórica `generateContent` (`efeonce-group`, 2026-07-05 — transporte muerto)

Hechos comprobados por nosotros vía `generateContent` (endpoint hoy bloqueado):

- **Modelo:** `gemini-omni-flash-preview`.
- **Salida:** clip **10 s · 1280×720 · 24 fps · MP4** + un `part` de texto "thinking".
- **Referencias:** aceptaba imagen (`image/png`) y video (`video/mp4`) como `inlineData` → image/video-to-video con **fuerte continuidad**.
- **usageMetadata:** modalidad `VIDEO` = **57.920 tokens** (5.792 × 10 s) — la métrica de costo **persiste** en la Interactions API como `usage.output_tokens_by_modality`.
- **launchStage:** `PUBLIC_PREVIEW`.

### 9.1 Capacidades del modelo probadas EN VIVO (no inferidas) — 2026-07-05

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

_Nota de transporte:_ la columna "Cómo se probó" describe el probe `generateContent` (`inlineData`/`parts`) hoy muerto. En la Interactions API la misma capacidad se pide con el `input` polimórfico + `video_config.task` (§4.3); la **capacidad** del modelo no cambió, sí la sintaxis.

> **Implicaciones de máximo aprovechamiento:** (a) el **audio nativo** sirve como scratch/ambiente sin
> pedirlo — `audio-studio` lo reemplaza/mejora para el master; (b) **9:16 nativo** con referencia portrait
> → versiones sociales sin reframe; (c) **edición y multi-referencia** habilitan variaciones e inserción de
> elementos manteniendo el mundo (continuidad). Mapa completo en `efeonce/GEMINI_OMNI_CAPABILITIES.md`.

### 9.2 Edit in-place recuperable + gate temporal — validado con caveat, 2026-07-11 (Glitch)

> **Drift de transporte (2026-07-20):** esta corrida hizo el edit **sobre Vertex** (`vertexai:true`). Al reverificar el 2026-07-20, **Vertex keyless ya NO edita**: `previous_interaction_id` → `400 "…do not support previous_interaction_id"` y `GET /interactions/{id}` → `500`. **La edición stateful vive hoy solo en la ruta Gemini-key** (§4.0/§4.2). Los aprendizajes operativos de abajo (1–4) son transporte-agnósticos y siguen vigentes; el "cómo" del edit cambió de superficie.

Una edición real del master de Glitch usó `@google/genai` con `vertexai:true`, proyecto `efeonce-group`,
región `global`, `generation_config.video_config.task:'edit'`, `background:true` y `store:true`. La
interacción `video-b1998a20-6009-44b9-b975-c039eb047f75` procesó 10 s de video como input y devolvió
10 s de MP4 desde `model_output`; se pudo recuperar después por ID sin otra llamada de pago.

La evidencia **no** valida aceptación automática: el clip fue rechazado tras revisar contacto, continuidad
y fondos porque introdujo artefactos después del primer segundo. El aprendizaje operativo es estable:

1. Si hace falta una acción/objeto/píxel que no existe, usar una interacción persistida y una sola
   instrucción acotada.
2. Si el cambio es timing, repetición, hold, orden de beats o texto exacto, no regenerar: editar
   el master existente de forma determinista. Si el operador pide foley nativo, usar una edición
   audiovisual localizada como guía, revisar sus píxeles y rescatar sólo eventos de audio aprobados.
3. Todo edit termina con revisión 1×, 0.5× y contact sheet; `completed` es estado de provider, no verdict
   de dirección.
4. Logos, copy de UI y texto no diegético exactos se componen desde el asset canónico, no se piden al modelo. Un practical diegético crítico no se compone post: o nace físicamente dentro de la toma íntegra o se rechaza.

Receta y evidencia: `workflows/omni-in-place-edit-and-deterministic-finish.md` y
`ai-generations/2026-07-11_glitch-microphone-intro/`.

### 9.3 Verificado por Interactions API — 2026-07-20 (`efeonce-globe`, transporte VIGENTE)

Evidencia fresca sobre el transporte actual, comprobada en vivo (no inferida):

- **`generateContent` bloqueado:** confirmado el `400 "gemini-omni-flash-preview is only supported in the Interactions API and cannot be called directly via generateContent."`
- **Generación keyless por Vertex:** `text_to_video` por `POST …aiplatform.googleapis.com/v1beta1/projects/<project>/locations/global/interactions` con Bearer ADC (sin key, sin `x-goog-user-project`) → **`200 completed`**, MP4 inline **~3.5 MB** en `steps[].model_output.content[].video.data` (~36 s de bloqueo).
- **Vertex keyless NO edita:** `previous_interaction_id` → `400 "…do not support previous_interaction_id"`; `GET /interactions/{id}` → `500`.
- **Edición stateful por Gemini-key:** crear con `store:true` → editar con `previous_interaction_id` por `POST generativelanguage.googleapis.com/v1beta/interactions?key=API_KEY` → **`200 completed`** con video. OAuth en esta ruta → `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
- **Retención store:** 55 días (paid) / 1 día (free); ~3 ediciones secuenciales en preview.

Snippets canónicos (curl):

```bash
# ── Generar (Vertex KEYLESS) ─────────────────────────────────────────────
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -sS -X POST \
  "https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/global/interactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-omni-flash-preview",
    "input": "<prompt>",
    "response_format": { "type": "video", "aspect_ratio": "16:9" },
    "generation_config": { "video_config": { "task": "text_to_video" } },
    "background": false, "store": false, "stream": false
  }'
# → { id, status:"completed", steps:[{type:"thought"},{type:"model_output",content:[{type:"video",mime_type:"video/mp4",data:"<base64>"}]}], usage:{output_tokens_by_modality:[{modality:"video",tokens:57920}]} }

# ── Editar (Gemini API con KEY) ──────────────────────────────────────────
curl -sS -X POST \
  "https://generativelanguage.googleapis.com/v1beta/interactions?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-omni-flash-preview",
    "previous_interaction_id": "<id del create con store:true>",
    "input": "<instrucción de edición>",
    "response_format": { "type": "video" },
    "store": true
  }'
```

### 9.4 Integración Globe (`efeonce-globe`)

El `VertexOmniAdapter` (`apps/creative-runner/src/vertex-omni-adapter.ts`) implementa exactamente esta separación: **genera keyless por Vertex** y **edita por Gemini-key**. La generación keyless quedó verificada a través del seam del Model Lab (brief golden de motion → `objective_pass_pending_human`, 40 créditos). Para trabajar ese adapter, cargar la skill `greenhouse-globe`.

---

## 10. Tabla de volatilidad por dato

Cuánto confiar en cada dato y con qué frecuencia reverificar (preview = todo se mueve).

| Dato | Estabilidad | Reverificar |
|---|---|---|
| Model ID `gemini-omni-flash-preview` | Alta mientras dure el preview | Al pasar a GA (cambia el sufijo) |
| **Método = Interactions API** (`generateContent` bloqueado) | **Baja** — cambió el 2026-07-20 | Cada release del preview; la API está moviéndose |
| Split de superficies (Vertex keyless genera / Gemini-key edita) | **Baja** | Cada vez que uses edit: Google podría habilitar edit en Vertex |
| Regiones Vertex Interactions (`global` + `us-central1`) | **Media** | Antes de cada pipeline nuevo (agregan regiones seguido) |
| Shape del body (`input` polimórfico, `response_format`, `video_config.task`) | Media | Docs cambian semana a semana en preview |
| 720p · 3–10 s · 24 fps | **Baja** (Google promete "longer/soon") | Cada release; duración y resolución son lo primero que cambiará |
| Pricing $1.50 in / $17.50 out video / $0.10/s | Media | Antes de comprometer costo a cliente |
| 5.792 tokens/seg 720p | Alta (verificado en `usage.output_tokens_by_modality`) | Si cambian resolución base |
| Audio input no soportado | Media | Cada release (es un "not yet") |
| SynthID + C2PA siempre | **Alta** | No cambia (política) |
| launchStage PUBLIC_PREVIEW | Media | Al anuncio de GA |

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
- **Verificación runtime propia (VIGENTE)** — Interactions API, `efeonce-globe`, Vertex keyless `global`/`us-central1` + Gemini API con key, **2026-07-20**.
- **Verificación runtime propia (histórica, transporte muerto)** — `generateContent`, `efeonce-group`, Vertex `global`, 2026-07-05 / edición Glitch 2026-07-11.

> Nota de método: los datos de la sección 9 son verificación directa nuestra y **prevalecen** sobre docs/prensa si hay drift. Entre nuestras propias corridas, la **§9.3 (2026-07-20, Interactions API)** manda sobre las históricas §9.0–9.2 (`generateContent`, ya bloqueado). El resto está marcado por volatilidad en la sección 10. Reverifica antes de cablear producción.
