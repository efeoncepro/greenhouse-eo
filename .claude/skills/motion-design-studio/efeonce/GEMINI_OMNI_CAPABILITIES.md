# Gemini Omni Flash — catálogo de capacidades + mapa de sinergia con el estudio

> **Tipo de documento:** Catálogo de capacidades + mapa de sinergia (agent-facing).
> **Hermano de:** `GEMINI_OMNI_VERTEX.md` (contrato operativo: endpoint, auth, pricing, gotchas). **Este doc NO repite el contrato** — si necesitas invocarlo, lee ese. Acá está TODO lo que Omni *puede hacer* y **cómo combinarlo** con las skills de la familia "studio" para exprimirlo.
> **Verificado as-of:** migración a **Interactions API** live-verificada **2026-07-20** (`efeonce-globe`: generación t2v keyless por Vertex + edición stateful por Gemini-key, ambas `200 completed`); runtime histórico `generateContent` 2026-07-05 + edición persistida Glitch 2026-07-11 (`efeonce-group`, Vertex `global`), **ya no vigente como método de invocación**; docs oficiales Google reverificadas 2026-07-20.
> **Idioma:** es-CL neutro (tuteo).
> **⚠️ Cambio de método (2026-07-20):** Omni **ya no se invoca por `generateContent`** — ese método devuelve `400 "…is only supported in the Interactions API and cannot be called directly via generateContent."` Ahora corre sobre la **Interactions API** (`POST …/interactions`, body snake_case), y hay **dos superficies distintas y NO intercambiables**: (1) **Vertex KEYLESS** (ADC Bearer, sin API key) sirve **solo GENERACIÓN** (`text_to_video`/`image_to_video`/`reference_to_video`); (2) **Gemini API con API KEY** (`generativelanguage.googleapis.com`) sirve la Interactions API **completa, incluida la EDICIÓN stateful** (`previous_interaction_id` + `store:true`). Contrato completo, endpoints y auth: `GEMINI_OMNI_VERTEX.md §0/§4`.
> **Regla de volatilidad:** el modelo está en `PUBLIC_PREVIEW` (lanzado 2026-06-30). Todo lo marcado `⚠️ volátil` cambia semana a semana; reverifica antes de comprometer costo o pipeline. Google promete "longer durations / higher res coming soon", así que los techos (720p / 3–10 s) son lo primero que se moverá.
> **Regla de honestidad:** distingo entre lo que **verificamos en vivo (✅)**, lo que está **documentado por Google (📄)**, lo que es **marketing/visión de terceros no confirmado (📣)** y lo que **no probamos (⬜)**. Varios sitios de terceros venden "4K nativo con audio y lip-sync en un solo pase" — eso es la **visión del modelo full**, NO el preview Flash que corre hoy (720p, sin lip-sync verificado). No confundas la valla publicitaria con el runtime. Ojo: las verificaciones ✅ de 2026-07-05 se hicieron sobre `generateContent` (ya retirado); la **capacidad** persiste, pero el **método** migró a Interactions — reverifica el shape antes de cablear.

---

## PARTE A — Catálogo exhaustivo de capacidades

### A.0 Qué es, en una línea

Omni Flash es el modelo "any-to-any" de Google donde **el razonamiento multimodal de Gemini se une a la generación y edición de video**: entra cualquier combinación de texto + imagen + video, sale video con audio nativo, y lo puedes **iterar hablándole** (edición conversacional multi-turno stateful). Analogía oficial: *"como Nano Banana, pero para video"*. Se invoca por la **Interactions API** (loop generar → editar), no por `generateContent`. Detalle conceptual de arquitectura (fusión Veo + Genie + Nano Banana) en `GEMINI_OMNI_VERTEX.md §1`; contrato de invocación en `§0/§4`.

**Su diferenciador vs. un generador one-shot como Veo Fast** (`veo-3.0-fast-generate-001`, `predictLongRunning`, un solo pase sin conversación): Omni suma **edición conversacional stateful** (refinas el clip hablándole, encadenando por `previous_interaction_id`) + **razonamiento multimodal nativo** del mundo. Ambos están live-verificados para Globe; se eligen por trabajo, no por marca (router al final de PARTE A).

### A.1 Modalidades (entrada → salida) y combinaciones válidas

| Entrada | Estado | Salida | Combinación → tarea que dispara |
|---|---|---|---|
| **Texto** | ✅ verificado | Video+audio+texto | Solo texto → `text_to_video` |
| **Imagen** (`image/png`/`jpeg`, base64 inline) | ✅ verificado | Video+audio+texto | Texto + 1 imagen → `image_to_video` |
| **Imagen ×2** (dos referencias) | ✅ **verificado** (mezcló estadio vacío + estadio con multitud en una toma) | Video+audio+texto | Texto + N imágenes → `reference_to_video` |
| **Imagen 2–6** (`{type:"image"}` en el `input`; docs usan tags `<IMAGE_REF_0>`…`<IMAGE_REF_5>`) | 📄 documentado (verificamos 2) | Video+audio+texto | `reference_to_video` |
| **Video como referencia combinada** (`{type:"video", …}` en el `input`, junto a imágenes) | ✅ **verificado en vivo 2026-07-20 en AMBAS superficies** (TASK-1490); el set **no puede ser sólo vídeo** | Video+audio+texto | `reference_to_video` (imagen+video **cruzados** en el mismo `input`) |
| **Video** (clip previo que Omni ya generó y persistió con `store:true`) | ✅ **verificado 2026-07-20** (edición stateful real por Gemini-key) | Video+audio+texto | `edit` vía `previous_interaction_id` (superficie **Gemini-key**; Vertex keyless → `400`) |
| **Audio de referencia** | 📄 **NO soportado** en preview (*"uploading audio references is unsupported"*) | — | — |
| **Múltiples videos de referencia** | 📄 NO soportado (solo **1** video ref) — pero 1 video + N imágenes **combinadas** SÍ (fila anterior) | — | — |
| **URL de YouTube como fuente** | 📄 NO soportado | — | — |

- **Salida siempre:** MP4 720p con **pista de audio AAC embebida** + un `step` de tipo `thought` (se ignora). El video sale en `steps[type='model_output'].content[type='video']` → `data` (base64, ≤4MB) o `uri` (>4MB). En la Interactions API el formato de salida se pide con `response_format:{type:"video", aspect_ratio:"16:9"|"9:16"}` (ver contrato §4). El viejo `responseModalities:["TEXT","VIDEO"]` era de `generateContent` — **ya no aplica**.
- **La entrada de audio se compensa por texto:** no puedes pasar una pista, pero describes el audio deseado en el prompt y el modelo lo sintetiza.
- **Cómo se edita un video ahora (la CADENA):** el flujo canónico es **stateful** — generas con `store:true`, guardas el `interaction_id`, y editas encadenando `previous_interaction_id` en la superficie **Gemini-key**. **Cada edit devuelve un `id` NUEVO, también encadenable** (edit del edit): pasas ese id al turno siguiente e iteras ~3 veces "hablándole". **Corrección clave:** Vertex keyless **no** edita (`previous_interaction_id` → `400`, `GET /interactions/{id}` → `500`), y un id emitido por keyless **no es encadenable en NINGUNA superficie** (namespaces distintos). Por eso, **si quieres la cadena stateful, genera también en Gemini-key**. **Pero (TASK-1490, 2026-07-20) "no encadenable" ya no significa "no editable":** el edit dejó de ser exclusivo de Omni — hay una semántica única (`editFrom`) con **dos paradigmas**, y el **reference-based** (re-inyectar el output del padre como referencia) refina cualquier candidato sin depender de sesión del proveedor, **incluso cross-model** (un candidato de Omni refinado por otro motor, o uno de Seedream refinado con Nano Banana). Vertex keyless queda para generación que no vas a encadenar statefully, no para "descartable". Detalle: `GEMINI_OMNI_VERTEX.md §4.6`. El viejo patrón de "pasar un `video/mp4` como `inlineData` a `generateContent`" **quedó retirado** junto con ese método. Editar videos **subidos** por el usuario sí existe pero está **bloqueado en EEA, Suiza y Reino Unido**. Contrato completo: `GEMINI_OMNI_VERTEX.md §4.6`.

### A.2 Tareas soportadas

| Tarea | `video_config.task` | Qué hace | Estado |
|---|---|---|---|
| **Texto → video** | `text_to_video` | Genera clip desde prompt puro | ✅ (clip 3–10 s 720p 24 fps mp4; t2v keyless re-verificado 2026-07-20) |
| **Imagen → video** | `image_to_video` | Anima una still / usa keyframe de inicio | ✅ (continuidad casi idéntica al still) |
| **Referencia → video** | `reference_to_video` | Compone desde 2–6 imágenes (sujeto, entorno, estilo) **+ referencia de video combinada** (imagen+video cruzados en el `input`). **Exige ≥1 imagen o audio en el set** — sólo-vídeo se rechaza | ✅ 2 refs img; ✅ **set combinado img+vídeo live 2026-07-20 en ambas superficies**; 📄 hasta 6 img |
| **Editar video** | `edit` | Modifica un clip existente (stateful) por lenguaje natural; **encadenable** (cada edit → `id` nuevo) | ✅ (stateful `previous_interaction_id` re-verificado 2026-07-20; **solo superficie Gemini-key**) |
| **Extensión / interpolación de video** | — | Alargar o rellenar entre frames | 📄 **NO soportado** en preview |

> En la **Interactions API la tarea se DECLARA explícita** con `generation_config.video_config.task` (`text_to_video` / `image_to_video` / `reference_to_video` / `edit`) — ya no se infiere de las partes como en el retirado `generateContent`. **Reparto por superficie:** la **generación** (`text_to_video`/`image_to_video`/`reference_to_video`) corre en **Vertex keyless** (o Gemini-key); la **edición** (`edit`) corre **solo en Gemini-key** con `previous_interaction_id` + `store:true`. Ver `GEMINI_OMNI_VERTEX.md §2.3 / §4`.

### A.3 Control creativo

| Dimensión | Cómo se controla | Estado / nota |
|---|---|---|
| **Cámara** (dolly, paneo, tilt, órbita, crash-zoom) | Solo por **lenguaje natural** en el prompt. NO hay presets nombrados ni parámetro de cámara | 📄 el modelo full promete "cinematic camera motion"; en Flash lo diriges por texto. Para cámara **repetible y nombrada** → Higgsfield Cinema Studio |
| **Consistencia de personaje** | Referencia de imagen del rostro/sujeto + escenas estables + clips cortos | 📄 **limitación conocida:** se degrada ante cambios de escena y paneos largos. Google: *"we are working to make this better"* |
| **World simulation / física (linaje Genie)** | Automática: entiende gravedad, energía cinética, fluidos, lógica narrativa (historia, biología) | 📄 *"intuitive understanding of physics"*. No es un parámetro; es comportamiento emergente. Es su ventaja sobre modelos que "no razonan el mundo" |
| **Estilo / style transfer** | Prompt ("make this anime") o imagen de referencia de estilo | 📄 *"quickly style-shifting into multiple visual styles"* — fuerte en edición conversacional |
| **Iluminación** | Prompt en edición ("change the lighting to be more dramatic") | ✅ (agregamos luz de amanecer a un clip) |
| **Aspecto** | `response_format.aspect_ratio`: `16:9` (default) / `9:16` | ✅ 16:9 (1280×720); 📄 9:16 |
| **Resolución** | Sin selector | ✅ **720p único** verificado. Para 1080p/4k → Veo 3.1 |
| **Duración** | Sin control | ✅ **3–10 s** por request (10 s verificado). "longer coming soon" ⚠️ volátil |
| **FPS** | Sin control | ✅ **24 fps** |
| **Negative prompt** | Sin parámetro → **embébelo en el prompt** ("no text, no logos") | 📄 |
| **Seed** | ❌ no existe → **no-determinismo**: misma prompt, clips distintos | 📄 para consistencia usa referencia fuerte, no seed |
| **Temperature / top_p / system prompt / stop** | ❌ no soportados | 📄 |

### A.4 Audio nativo

Omni **genera imagen y sonido juntos en un solo pase de difusión** — el audio no se pega después, nace con el video (por eso calza con la acción en pantalla).

| Elemento de audio | Estado | Detalle |
|---|---|---|
| **Ambiente / atmósfera contextual** | ✅ **verificado** | Estadio repleto = **−15.4 dB** de multitud vs. estadio vacío = **−16.8 dB** de ambiente. El audio **entiende el contenido de la escena**, no es genérico |
| **SFX / foley** | 📄 documentado | Pasos, viento, sonido ambiente que calza con el movimiento y timing ("footsteps land on the beat") |
| **Música / score** | 📄 documentado | Score renderizado junto a la imagen |
| **Diálogo** | 📄 documentado (⬜ no lo probamos) | Diálogo sincronizado |
| **Lip-sync** | 📣 marketing / ⬜ **no verificado en Flash** | Sitios de terceros lo venden como "lip-synced dialogue"; corresponde a la **visión del modelo full**. En el preview Flash **no lo confirmamos** — no lo prometas a cliente sin probar |
| **Audio espacial** | 📣 marketing | "synchronized spatial audio" — no verificado |
| **Control del audio** | Solo por prompt (describes qué suena). **NO** puedes pasar pista de referencia; **NO** hay "voice editing" (📄 *"voice editing is not supported"*) | El audio nativo es un **scratch de gran calidad**, no el master. Mezcla final → `audio-studio` |

**Lectura práctica:** el audio nativo de Omni es la mayor sorpresa positiva verificada — **contextual, sincronizado, gratis** (viene en el clip). Úsalo como **guía/scratch** que ya te dice el ritmo y la textura, y reemplázalo/mézclalo en `audio-studio` cuando el entregable es final.

**Caveat runtime Glitch (2026-07-11, V2):** un edit pedido literalmente como `audio-only` fue rechazado antes de generar. Una formulación audiovisual localizada sí devolvió AAC, pero sus píxeles alteraron el practical y añadió un tercer acento; más tarde, la escucha creativa también rechazó ese foley por no sonar a un golpe real de micrófono. El take entero F/I se descartó: no convertir un practical diegético en overlay ni una presión en golpe mediante retime. Audio nativo = guía candidata; el foley final necesita su propio gate de material, acción, transientes y escucha.

### A.5 Edición (video-to-video) y multi-turno conversacional

| Qué puedes editar de un clip existente | Estado | Ejemplo de instrucción |
|---|---|---|
| **Iluminación** | ✅ verificado | "change the lighting to be more dramatic" / luz de amanecer |
| **Cámara / encuadre** | ✅ verificado | cambio de ángulo manteniendo el mismo mundo |
| **Objetos** (quitar / agregar) | 📄 | "make the phone invisible" |
| **Apariencia / wardrobe** | 📄 | "put a fashionable hat on this person" |
| **Estilo visual** | 📄 | "make this video anime" |
| **Acción / posición del personaje** | 📄 | reencuadrar la acción |
| **Voz / audio del clip** | ❌ | *"voice editing is not supported"* |
| **Extender / interpolar** | ❌ | no soportado en preview |

- **Multi-turno stateful (la cadena):** encadenas ediciones con `previous_interaction_id` en la **superficie Gemini-key** (`generativelanguage.googleapis.com`) — **recuerda el video** y aplica el cambio **preservando lo que no tocas**. Es el diferenciador central: iteras "hablándole" en vez de regenerar desde cero. **Cada edit devuelve un `id` NUEVO, encadenable** (edit del edit): pasas ese id al turno siguiente. **Requisitos duros:** el clip base tuvo que generarse con `store:true` (si `store:false`, no se puede editar/recuperar después); el preview aguanta **~3 ediciones secuenciales** encadenadas; la **retención del store** es **55 días en tier pago / 1 día en free**. La **superficie Vertex keyless NO edita** (`previous_interaction_id` → `400`, `GET /interactions/{id}` → `500`) y **un clip generado por Vertex keyless tampoco es editable** — su `id` vive en la superficie equivocada; por eso, **si vas a editar, genera el clip base también en Gemini-key con `store:true`** (no en Vertex keyless). Contrato: `GEMINI_OMNI_VERTEX.md §4.6`.
- **Inpaint temporal:** implícito en "make X invisible / put Y on" — edición localizada que respeta el resto de los frames.
- **⚠️ Restricción regional:** editar videos **subidos por el usuario** NO está disponible en EEA, Suiza y Reino Unido.
- **⚠️ Generación de personas RAI-gated:** la generación/edición con personas está detrás de un allowlist RAI (Responsible AI) — no asumas acceso; verifica el gate del proyecto antes de comprometer un flujo con personajes humanos.
- **Gate que no negocia:** `completed` prueba que el provider terminó, no que el plano conserva continuidad. Revisa el video entero a 1× y 0.5×, más contact sheet. Si sólo necesitas retime/orden, termina el mismo master; pero si el ajuste cambia una actuación física hero o un practical que debe vivir dentro del set, crea una toma integral nueva: no lo reconstruyas con overlay ni retime. Para foley nativo pedido expresamente, úsalo sólo como guía y conserva eventos que pasen su propio gate de escucha.

### A.6 Límites del nivel preview (Flash, 2026-07-05)

| Límite | Valor | ⚠️ |
|---|---|---|
| Resolución máx | **720p (1280×720)** — sin selector | volátil (1080p/4k prometido) |
| Duración | **3–10 s** por request (sin selector) | volátil ("longer soon") |
| FPS | 24, fijo | — |
| Nº imágenes de referencia (en el `input`) | 2 ✅ / hasta 6 📄; **combinables con 1 video** en la misma toma (`reference_to_video`) | volátil; el adapter de Globe lleva hasta **4 refs** y **falla cerrado** al excederlo (`too_many_references`), nunca trunca |
| Nº videos de referencia (en el `input`) | **1** video, combinable con las imágenes (distinto del edit-chain) | Verificar límite vigente antes de producción |
| Ediciones stateful encadenadas | **~3 secuenciales** en preview; requiere `store:true`; cada edit → `id` nuevo encadenable | volátil |
| Retención del store (para editar/recuperar) | **55 días pago / 1 día free** | volátil (política de preview) |
| Edición | **solo superficie Gemini-key**; Vertex keyless no edita (`400`/`500`) | fijo mientras dure el split de superficies |
| Generación de personas | **RAI-gated (allowlist)** — no asumas acceso | verificar gate del proyecto |
| Audio de entrada | no soportado | volátil ("not yet") |
| Extensión/interpolación | no soportado | volátil |
| Idioma | **inglés pleno**; otros no evaluados | prueba es antes de confiar |
| Watermark | **SynthID invisible + C2PA**, siempre, no desactivable | fijo (política) |
| Seed / determinismo | sin seed → no determinista | — |
| Deformación | **deforma texto, logos, UI fina** | fijo (limitación de clase) — nunca confíes la exactitud de micro-texto/logo al modelo |

### A.7 Comparativa capacidad-a-capacidad vs. la competencia

| Capacidad | **Omni Flash** | Veo 3.1 | Runway Gen-4.5 | Seedance 2.0 | Kling 3.0 |
|---|---|---|---|---|---|
| **Edición conversacional multi-turno** | ✅ **su superpoder** (stateful, preserva lo no tocado) | Limitada (regen) | Editing pro downstream | Generación-first | Editing creator-facing |
| **Razonamiento del mundo / física (Genie)** | ✅ **fuerte** (heredado de Gemini) | Débil | Medio | Bueno | Bueno |
| **Audio nativo contextual** | ✅ verificado (ambiente escala con la escena) | Sí (con Veo audio) | No nativo | ✅ **arquitectura audio-video unificada** (reverb por espacio, proximidad) | Sí (3.0 Omni) |
| **Composición multi-input** (texto+imagen×N+video en una toma) | ✅ **su otra ventaja** | Parcial | Parcial | image-to-video | image-to-video + consistencia |
| **Cámara nombrada / presets repetibles** | ❌ solo texto | Parcial | ✅ **fuerte** (control por brief) | Menos énfasis | ✅ **fuerte** (multi-shot storyboarding) |
| **Resolución** | 720p (preview) | ✅ **hasta 4K** | Alta | Alta | ✅ **4K nativo** |
| **Calidad "one-shot" pura** (sin editar) | Media (bajo Seedance/Veo) | Alta | Alta | ✅ **#1 Video Arena** (Elo t2v 1269 / i2v 1351) | Alta |
| **Multi-shot / storyboard largo** | ❌ (10 s) | Parcial | ✅ | Single-shot | ✅ **fuerte** |
| **Costo 720p** | $0.10/s | $0.10/s (Fast) | Créditos | Créditos | Créditos |

**Qué hace Omni que otros no (tan bien):**
1. **Editar el video hablándole, multi-turno stateful, preservando el resto** (`previous_interaction_id`, superficie Gemini-key) — el resto regenera. Contra un one-shot como Veo Fast (`veo-3.0-fast-generate-001`, `predictLongRunning`, un solo pase sin conversación), este es el diferenciador de raíz.
2. **Componer una toma desde texto + varias imágenes simultáneas** con **razonamiento multimodal del mundo** (linaje Genie/Gemini).
3. **Audio nativo que entiende el contenido de la escena** (multitud vs. vacío) sin post.

**Qué hacen otros que Omni no (todavía):**
- **Veo/Kling:** 4K nativo, clips más largos, calidad one-shot superior, multi-shot.
- **Runway/Kling:** control de cámara nombrado, storyboarding, workflow de equipo.
- **Seedance:** calidad de generación pura #1 y coherencia audio-video por espacio.

> **Regla de router:** si el valor está en **iterar/editar el video hablándole (stateful)** o en **razonar el mundo desde inputs mixtos** → Omni (edit = superficie Gemini-key). Si está en **calidad final, resolución alta, clip largo, cámara dirigida o un render one-shot sin conversación** → Veo (`veo-3.0-fast-generate-001`, `predictLongRunning`) / Kling / Runway. Ver también `../STUDIO_TOOLING.md §Router de producción`.

### A.8 Tabla maestra "verificado ✅ / documentado 📄 / marketing 📣 / no probado ⬜"

| Capacidad | Estado | Evidencia |
|---|---|---|
| text_to_video | ✅ | clip 3–10 s 720p 24 fps mp4; keyless por Vertex re-verificado 2026-07-20 |
| image_to_video (1 ref) | ✅ | continuidad casi idéntica al still |
| **reference_to_video (2 imágenes)** | ✅ | mezcló estadio vacío + estadio con multitud en una toma |
| reference_to_video (3–6 imágenes) | 📄 | tags `<IMAGE_REF_n>` en docs |
| **reference_to_video combinada (imagen + video en el `input`)** | ✅ | live 2026-07-20 en **ambas** superficies (TASK-1490). El set **exige ≥1 imagen o audio**: sólo-vídeo → `400 "At least one image or audio must be provided for reference_to_video"` |
| **generación keyless por Vertex (Interactions)** | ✅ | 2026-07-20: t2v ADC Bearer, sin API key → `200 completed`, MP4 inline ~3.5MB |
| video como referencia / continuación | ✅ (histórico) | probado sobre `generateContent` (2026-07-05, método ya retirado); hoy la edición es stateful por `previous_interaction_id` |
| **edición stateful (`edit` + `previous_interaction_id`)** | ✅ | 2026-07-20: por Gemini-key → `200 completed`; luz de amanecer + cambio de cámara, mismo mundo |
| **edit encadenable (el resultado del edit trae `id` nuevo)** | ✅ | 2026-07-20: el edit devuelve un `id` nuevo, encadenable en el turno siguiente (edit del edit) |
| **audio nativo sincronizado y contextual** | ✅ | multitud −15.4 dB vs. vacío −16.8 dB; mp4 con pista AAC |
| tarea declarada explícita (`video_config.task`, Interactions) | ✅ | `text_to_video`/`image_to_video`/`reference_to_video`/`edit` en el body snake_case |
| iluminación editable | ✅ | verificado en edición |
| cámara editable | ✅ | verificado en edición |
| objetos / wardrobe / estilo editables | 📄 | ejemplos oficiales |
| multi-turno stateful (`previous_interaction_id`) | ✅ | Interactions API, superficie Gemini-key; re-verificado 2026-07-20 |
| generación de personas | 📄 | **RAI-gated (allowlist)** — no probado por nosotros |
| física / world simulation (Genie) | 📄 | *"intuitive understanding of physics"* |
| SFX / foley / ambiente / música | 📄 | single-pass audio+video |
| diálogo generado | 📄 / ⬜ | documentado, no probado |
| **lip-sync** | 📣 / ⬜ | claim de terceros para el modelo full; **no verificado en Flash** |
| 4K nativo / audio espacial | 📣 | valla de terceros; **preview = 720p** |
| 720p único | ✅ | limitación runtime verificada |
| deforma texto / logos / UI | ✅ | "ChatGPT→ChatOFT", logo fantasmeado, precio 890→850 |
| 9:16 | 📄 | `aspect_ratio` en docs |
| SynthID + C2PA siempre | 📄 | política |

---

## PARTE B — Mapa de sinergia con las skills "studio" (lo más importante)

La tesis: **Omni casi nunca trabaja solo.** Deforma texto/logos, tapa a 720p, dura ≤10 s y su audio es scratch. Cada una de esas debilidades la **cubre una skill hermana**, y cada fortaleza de Omni **alimenta a las demás**. Acá está el cruce capacidad-por-capacidad.

### B.1 Tabla de sinergia — Capacidad Omni → skill que aporta/refina → cómo → resultado

| Capacidad Omni | Skill que aporta el INPUT o refina el OUTPUT | Cómo se combinan | Resultado |
|---|---|---|---|
| **image_to_video / reference_to_video** | `design-studio` + `greenhouse-ai-image-generator` | Generas el **keyframe** exacto (KV, still on-brand) con la matriz de modelos de imagen (Nano Banana 2 Lite, GPT Image, Recraft, Flux, Ideogram) → lo pasas como `{type:"image", data, mime_type}` en el `input` de la Interactions API (superficie **Vertex keyless** para generar) | Video que **arranca del arte que tú controlas**, no de la lotería del prompt |
| **reference_to_video multi-imagen (2–6) + video combinado** | `design-studio` | Generas N stills coherentes (sujeto + entorno + paleta) — y opcionalmente sumas **un clip de estilo/movimiento** como `{type:"video"}` — y los mandas juntos en el `input` → Omni compone del paquete mixto. Cada ref lleva su rol + precedencia en el texto | **Composición dirigida** cross-modal (verificado 2 img: estadio vacío + con multitud; y set combinado img+vídeo live 2026-07-20). **TASK-1490 cerrada:** los adapters ya consumen el **set completo** (antes tomaban solo la 1ª ref) — orden **edit base primero**, tope 4, falla cerrado. El set **exige ≥1 imagen o audio** |
| **Reference-chaining (frame previo → i2v)** | `design-studio` (retoca el frame) + este estudio (`../workflows/reference-chaining.md`) | Extraes el **último frame** de la toma anterior, lo limpias/ajustas, y lo usas como referencia del beat siguiente | **Continuidad entre tomas** — cura la "desconexión" de clips text-to-video sueltos |
| **edición conversacional multi-turno (stateful, encadenable)** | este estudio (dirección) + `../modules/06_EDITING_MONTAGE_PACING.md` + workflow E | Generas **en Gemini-key** con `store:true` (sólo si quieres la cadena stateful; por referencia editas igual), iteras una intención acotada por `previous_interaction_id` (superficie **Gemini-key**); **cada edit devuelve un `id` nuevo** que encadenas al turno siguiente. Persistes el interaction ID y haces gate temporal; si el cambio es editorial, retimas el mismo master de forma determinista | Cobertura de una misma escena sin re-shoot, o finish controlado sin gastar un render nuevo |
| **audio nativo contextual** | `audio-studio` (voz ElevenLabs/Seed Audio, música, SFX, mezcla, mastering, loudness) + `../modules/07_SOUND_MUSIC_DESIGN.md` | Usas el audio de Omni como **scratch** que ya trae ritmo/textura; si se necesita rescatar un foley, segmentas sus eventos y los montas sobre la placa aprobada → en `audio-studio` reemplazas VO, subes música con licencia, y **mezclas a loudness de entrega** (−14 LUFS web / −16 social) | Audio **final de calidad broadcast**, no el scratch generativo |
| **techo 720p** | Magnific (MCP+API) + Higgsfield `upscale_video` + `../modules/08_COLOR_GRADE_FINISH.md` | **Video Sequence Enhancement** de Magnific (upscale frame-consistent, no frame-a-frame) sube el clip a 1080p/4K sin romper continuidad; grade en Resolve | Master en **1080p+**, color final, listo para entrega |
| **deforma texto / logos / UI** | Playwright (UI crisp) + `../workflows/ui-without-after-effects.md` + `../workflows/hybrid-world-plus-ui.md` | Omni pinta el **plate cinematográfico de fondo** (atmósfera/cámara/profundidad); el **texto/logo/UI exacto** se compone encima como asset real (HTML+Playwright a 1280×720, o mograph AE) | Fondo cine + **micro-texto y logo nítidos y exactos** — nunca confías la exactitud al modelo |
| **cámara solo por texto (sin presets)** | Higgsfield Cinema Studio (`../STUDIO_TOOLING.md`) | Si necesitas **cámara nombrada y repetible** (dolly, crash-zoom, orbit, focal length) → produces esa toma en Higgsfield; Omni queda para edición/mundo | Movimiento de cámara **dirigido y consistente** entre tomas |
| **consistencia de personaje limitada** | Higgsfield **Soul ID** + `design-studio` | Entrenas el rostro en Soul ID (3–5 fotos) o generas un still canónico del personaje → lo pasas a Omni como referencia en cada toma | Personaje **reconocible** aun con el límite de Omni |
| **duración ≤10 s** | este estudio (`../workflows/reference-chaining.md`) + `../modules/06` | Encadenas clips de 3–10 s (cada uno partiendo del frame anterior) y los montas | Piezas **más largas** hiladas por continuidad + corte |
| **formato/entrega** | `social-media-studio` | Tomas el master y adaptas duración, **safe-zones y aspecto por red** (9:16 vertical, 1:1, 16:9); Omni ya puede salir 9:16 de fábrica para acortar el paso | Corte **por red**, listo para publicar |
| **VFX / composite** | `../modules/11_VFX_COMPOSITING.md` (Nuke/Fusion/AE, Mocha, Runway roto, Beeble relight) | Omni da el plate; el composite integra CGI, keying, cleanup, relight | Integración de precisión que Omni no hace |
| **dirección / storyboard** | `../modules/04_STORYBOARD_ANIMATIC.md` + `templates/` | Validas ritmo en **animatic barato** ANTES de gastar créditos en tomas Omni | Menos quema de créditos; ritmo aprobado antes de producir |
| **gobernanza de marca / disclosure** | `EFEONCE_OVERLAY.md` + `CLIENT_DELIVERY.md` + `MOTION_BOUNDARY.md` | Toda pieza IA a cliente Globe/sitio público declara "generado por IA" (SynthID respalda); logo Efeonce nunca lo pinta el modelo | Entregable **on-brand y declarado** |

### B.2 Matriz de modelos de imagen que alimentan Omni (vía `design-studio`)

El input más potente de Omni es una **imagen de referencia buena**. `design-studio` decide cuál modelo de imagen genera ese keyframe:

| Modelo de imagen | Fortaleza para keyframe Omni | Cuándo elegirlo |
|---|---|---|
| **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`) | Rápido (~4 s), **misma familia que Omni** → encadena natural imagen→i2v | Iteración veloz, coherencia de familia |
| **GPT Image** | Control de composición y prompt-following | Escena compleja, instrucción precisa |
| **Recraft** | Vector/brand, estilo consistente | KV con estilo de marca |
| **Flux** | Fotorrealismo/detalle | Still realista de alto detalle |
| **Ideogram** | **Texto legible en imagen** | Cuando el keyframe necesita tipografía correcta (que Omni luego NO debe deformar → mantén ese texto como overlay) |

### B.3 PLAYBOOK — máximo aprovechamiento (pipeline ideal punta a punta)

El pipeline que exprime cada fortaleza y tapa cada debilidad. **Dirige el humano; la IA acelera. Gasto gobernado: valida barato antes de producir caro.**

```
0. DIRECCIÓN (barato, primero)
   this studio (../modules/03,04) + templates/  →  concepto + storyboard + animatic
   → aprueba ritmo ANTES de gastar créditos

1. KEYFRAMES  (design-studio / greenhouse-ai-image-generator)
   Genera stills on-brand con la matriz de imagen (Nano Banana 2 Lite para
   velocidad + coherencia de familia). 1–2 keyframes por beat: inicio (+ fin).
   → controlas el arte, no la lotería del prompt

2. PRODUCE TOMAS  (Omni t2v / i2v / reference_to_video — Interactions API)
   Genera con la Interactions API: keyframe como {type:"image", data, mime_type}
   en el `input` → Omni anima. Superficie de GENERACIÓN = Vertex keyless (one-shot).
   ⚠️ Si vas a ENCADENAR STATEFUL despues, genera en Gemini-key con store:true
      (un id keyless no es encadenable en NINGUNA superficie). Pero keyless ya no
      significa "no editable": por REFERENCIA ese candidato sigue refinable, y
      hasta desde otro motor (cross-model). Elige la cadena stateful solo si la
      quieres; cuesta sacar todo el generate de Omni del path keyless.
   Multi-ref (2–6 imágenes) + hasta 1 video combinado ({type:"video"}) cuando
      compones elementos cross-modal en una toma (cada ref con su rol/precedencia).
      Verificado en vivo en ambas superficies; el adapter consume el set completo
      (tope 4, falla cerrado). El set exige >=1 imagen o audio: solo-video se rechaza.
   Personaje → refuerza con Soul ID / still canónico (y ojo: personas RAI-gated).
   Cámara nombrada repetible → esa toma en Higgsfield Cinema Studio.

3. CONTINUIDAD  (Omni reference-chaining — ../workflows/reference-chaining.md)
   Último frame de la toma N → referencia de la toma N+1 + prompt del beat.
   → cura la desconexión entre clips de 3–10 s.

4. VARIACIONES / COBERTURA  (Omni edit stateful, encadenable — superficie Gemini-key)
   Sobre un clip elegido (generado EN Gemini-key con store:true), itera hablándole
   por previous_interaction_id: luz, cámara, wardrobe, estilo. Cada edit devuelve un
   id NUEVO, encadenable → lo pasas al turno siguiente (edit del edit). ~3 ediciones
   secuenciales en preview; el store retiene 55d pago / 1d free.
   Vertex keyless NO edita (y no encadena un clip que generó) → todo el ciclo
   create-store→edit corre en Gemini-key.
   → cobertura de la escena para editar con ritmo.

4b. GATE TEMPORAL → RUTA CORRECTA  (`workflows/omni-in-place-edit-and-deterministic-finish.md`)
   `completed` = candidato técnico. Revisión 1× + 0.5× + contact sheet de actuación,
   anatomía, cámara y fondo. Si faltan píxeles/acción, una nueva interacción acotada;
   si el cambio es timing, orden, texto exacto o foley, finish determinista sobre el mismo master.

5. AUDIO SCRATCH → MEZCLA FINAL  (Omni nativo → audio-studio)
   El audio nativo de Omni (contextual, sincronizado) = scratch/guía de ritmo.
   audio-studio: VO ElevenLabs/Seed Audio + música con licencia + SFX
   + mezcla + mastering a loudness de entrega (−14 LUFS web / −16 social).
   → audio final, no el generativo.

6. OVERLAY UI / LOGOS CRISP  (Playwright / mograph — ../workflows/hybrid-world-plus-ui.md)
   Omni = plate de fondo (atmósfera/cámara/profundidad).
   Texto exacto, citas, gauge, wordmark Efeonce → asset real compuesto encima
   (HTML+Playwright 1280×720, o AE). NUNCA confíes exactitud al modelo.

7. EDITA / MONTA  (Resolve/Premiere — ../modules/06)
   Corte, ritmo, transiciones (pull-back / match-cut para hilar beats).

8. COLOR / FINISH + UPSCALE  (Resolve + Magnific — ../modules/08)
   Grade + LUT. Magnific Video Sequence Enhancement (frame-consistent)
   → sube 720p a 1080p/4K sin romper continuidad.

9. FORMATO POR RED  (social-media-studio)
   Adapta duración, safe-zones y aspecto (9:16 / 1:1 / 16:9).
   Omni puede salir 9:16 de fábrica → acorta este paso.

10. GOBERNANZA + ENTREGA  (EFEONCE_OVERLAY / CLIENT_DELIVERY / MOTION_BOUNDARY)
    Disclosure "generado por IA" (SynthID respalda).
    Publicar/entregar SIEMPRE pasa por confirmación humana.
```

**Reglas de oro del playbook:**
- **Omni al centro, no solo.** Su valor es **animar arte que tú controlas** (paso 1→2) y **editar hablándole** (paso 4). Todo lo demás lo hacen mejor las hermanas.
- **El output del provider no decide dirección.** Ningún estado `completed` salta el gate temporal; preserva interaction ID, input, output y motivo de aceptar/rechazar.
- **Nunca el micro-texto/logo/precio/citas al modelo.** Van crisp en post (paso 6). Verificado que Omni los deforma ("ChatGPT→ChatOFT", precio 890→850).
- **Audio nativo = scratch, no master.** Te regala el ritmo; el master es `audio-studio` (paso 5).
- **720p sube en el finish, no antes** (paso 8) — y solo de lo elegido, para no quemar créditos de upscale.
- **Valida barato (animatic) antes de producir caro** (paso 0). Genera tomas en lo que sirva; sube calidad solo de lo aprobado.

### B.4 Anti-patrones de combinación (qué NO hacer)

| Anti-patrón | Por qué falla | Qué hacer en cambio |
|---|---|---|
| Pedir a Omni el logo/UI/precio dentro del frame | Los deforma (verificado) | Plate Omni + overlay crisp (Playwright/mograph) |
| Usar el audio nativo como master de entrega | Es scratch generativo, no mezclado a loudness | `audio-studio` para VO/música/mezcla/mastering |
| Entregar el clip a 720p directo | Bajo el estándar broadcast | Magnific/Higgsfield upscale en el finish |
| Encadenar tomas solo con prompt (sin frame de referencia) | Se ven como escenas sueltas | Reference-chaining (frame previo → i2v) |
| Confiar en `seed` para consistencia | No existe seed en Omni | Referencia de imagen/video fuerte + Soul ID |
| Cámara "cinematográfica" esperando que el prompt acierte y sea repetible | Omni no tiene presets nombrados | Higgsfield Cinema Studio para cámara dirigida/repetible |
| Prometer lip-sync/4K a cliente citando terceros | Es la visión del modelo full, NO el preview Flash | Verifica en runtime antes de comprometer |

---

## Fuentes

- Gemini API — *Generate and edit videos with Gemini Omni Flash*: https://ai.google.dev/gemini-api/docs/omni
- DeepMind — *Gemini Omni*: https://deepmind.google/models/gemini-omni/
- Google Blog — *Start building with Nano Banana 2 Lite and Gemini Omni Flash*: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/
- Gemini Enterprise Agent Platform — *Gemini Omni Flash Preview*: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-flash-preview
- WaveSpeed — *Omni Flash vs Seedance 2.0 vs Kling 3.0*: https://wavespeed.ai/blog/posts/gemini-omni-flash-vs-seedance-2-kling-3/
- Artificial Analysis Video Arena (Elo Seedance/Kling/Veo/Sora), vía Medium *"does it beat Seedance 2?"*: https://medium.com/ai-analytics-diaries/googles-omni-video-model-impressive-but-does-it-beat-seedance-2-1d2cd3d23dc2
- Morphic / MindStudio / Artlist (audio nativo, lip-sync — **claims de terceros, marcados 📣**): https://morphic.com/resources/models/gemini-omni · https://www.mindstudio.ai/blog/what-is-gemini-omni-flash · https://artlist.io/blog/gemini-omni-flash/
- Gemini API — *Interactions API* (superficie oficial de Omni; reemplazó `generateContent`): https://ai.google.dev/gemini-api/docs/omni
- **Verificación runtime propia** — migración a Interactions API `efeonce-globe` **2026-07-20** (t2v keyless Vertex + edit stateful Gemini-key); base histórica `efeonce-group`, Vertex `global`, 2026-07-05 sobre `generateContent` (método retirado). Detalle en `GEMINI_OMNI_VERTEX.md §0/§9`.
- **Contrato operativo hermano** (endpoints, dos superficies, auth, pricing, gotchas): `./GEMINI_OMNI_VERTEX.md` — **fuente de verdad del contrato de invocación**.
- **Pipeline del estudio**: `../STUDIO_TOOLING.md` · `../workflows/` · `../modules/06,07,08,09,10,11`.

> Nota de método: los datos ✅ son verificación directa nuestra y **prevalecen** sobre docs/prensa si hay drift. Los 📣 son marketing de terceros describiendo el modelo full — no el preview Flash — y NO se prometen a cliente sin verificar. Reverifica lo ⚠️ volátil antes de cablear producción.
