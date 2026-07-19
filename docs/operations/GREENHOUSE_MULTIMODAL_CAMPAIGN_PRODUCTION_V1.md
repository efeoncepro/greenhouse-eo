# Greenhouse Multimodal Campaign Production V1

> Estado: operativo para producción out-of-band. Validado el 2026-07-18 con Seedream 5 Lite/Pro,
> GPT Image 2, Gemini Omni Flash y post determinístico. Seedance 2.0 queda como fallback condicionado;
> no fue necesario para el release validado. No modifica el runtime del portal.

## Propósito

Convertir una idea en un sistema de campaña profesional para canales digitales, motion, print y OOH,
sin depender de un único modelo ni confundir una imagen atractiva con un release listo. La unidad de
trabajo es un **linaje aprobable de assets**: brief, territorios, anchor, plates, motion, composición,
prepress, QA, paquete y aprendizaje.

## Dos ejes que no deben confundirse

### Canal

| `channelMode` | Salidas típicas | Gate específico |
|---|---|---|
| `digital-static` | 4:5, 1:1, 9:16, 16:9, display | safe zones, peso, thumbnail, landing |
| `digital-motion` | 9:16/16:9; shots generativos 3–10 s; masters editados 6/10/15/30 s | identidad temporal, flicker, audio, captions, poster frame |
| `print` | A-series, afiche, folleto | tamaño físico, bleed, trim, 300 ppi, ICC de imprenta |
| `ooh` | billboard, mobiliario, gran formato | lectura a distancia, 3 s, pocas palabras, vendor spec |

### Presencia de marca

| `brandMode` | Significado | Regla |
|---|---|---|
| `branded` | marca, tipo, URL y paleta visibles | activos oficiales y composición determinista |
| `brand-light` | la campaña se reconoce sin dominar con el logo | firma/end card discreto; nunca logo generado |
| `editorial-neutral` | plate útil sin firma visual de Efeonce | no hereda AXIS ni una skin Efeonce; conserva provenance |
| `client-brand` | pertenece a un cliente | sólo brand book/activos del cliente; Efeonce no contamina |

`off-branding` no significa “fuera de control”. Significa que la capa visual generativa queda limpia
para contenido editorial, performance, motion o cliente, y que la firma correcta se decide en post. Tampoco
es sinónimo de `offline`: una pieza puede ser digital y editorial-neutral, o un OOH completamente branded.

## Arquitectura de manos

```text
strategy / rights / channelMode / brandMode
                    │
                    ▼
Seedream 5 Lite ── diverge 3–16 territorios
                    │ curaduría humana
                    ▼
Seedream 5 Pro ─── develop material, luz, color, atmósfera
                    │ anchor gate
                    ▼
GPT Image 2 ────── organize, repair, extend ratios, copy fields
                    │
              ┌─────┴─────────────┐
              ▼                   ▼
       clean still plates    Gemini Omni Flash
       branded composition   animate / reference / edit
              │                   │
              └─────┬─────────────┘
                    ▼
deterministic post: type / logo / CTA / legal / captions / audio mix
                    ▼
digital release + print/OOH production proofs + manifests + QA
```

No es un ranking de modelos. Cada mano recibe un delta y conserva locks. Todos los formatos vuelven al
anchor aprobado; no se encadenan derivados como `v1 → v2 → v3`.

## Gobernanza arquitectónica

- **Arquetipo:** pipeline creativo multimodelo, out-of-band y human-in-the-loop; no es una feature autónoma
  del portal ni un servicio de producción desatendido.
- **Autonomía:** `recommend-with-approval`. Los modelos proponen/generan; una persona aprueba territorio,
  anchor, claims, derechos, release creativo, preprensa y activación en medios.
- **Reversibilidad:** el router de modelos es una two-way door. Los handoffs se expresan como contratos de
  input/delta/locks/output y permiten sustituir un proveedor sin cambiar el resto del linaje.
- **ADR:** no se abre uno para V1 porque no cambia source of truth, schema, auth, API, deploy ni runtime
  compartido. Este documento operativo es el owner. Un servicio runtime, automatización autónoma,
  presupuesto persistente o contrato API sí deberá proponer ADR antes de implementarse.
- **Observabilidad mínima:** manifest por llamada con provider/model/endpoint/request ID, parent, latencia,
  costo, hashes y outcome; jamás prompts con datos restringidos ni valores de secrets.
- **Límites de costo:** presupuesto declarado en intake, selección humana antes de pasos premium y scripts
  generativos separados de composición/QA determinísticos para no gastar por accidente.

## Router validado

| Operación | Mano | Por qué |
|---|---|---|
| Divergencia visual económica | Seedream 5 Lite | abre familias de medio/material sin gastar cierre premium |
| Desarrollo expresivo | Seedream 5 Pro | material, color, luz, atmósfera y edición regional semántica |
| Disciplina compositiva | GPT Image 2 | reencuadre, identidad, safe zones, reparación y ratios |
| Toma motion base desde anchor limpio | Gemini Omni Flash | una toma continua por ratio, con audio nativo y plate sin marca |
| Familia 15/10/6 desde toma aprobada | edición determinista | trim, montaje, format wall, end card, mezcla y exports sin regenerar |
| Nueva toma, ángulo o continuidad física ausente | Seedance 2.0, fallback | sólo cuando los píxeles/actuación necesarios no existen en el master aprobado |
| Copy/logo/legal exactos | composición determinista | precisión, localización, compliance y reemplazo sin regenerar |
| Aprobación | director/a de arte + brand/legal/media | el modelo no es autoridad de marca ni de lanzamiento |

Gemini Omni Flash es **video**, no un tercer generador de stills. Al 2026-07-18 está en preview como
`gemini-omni-flash-preview`: genera 720p, 3–10 s, 16:9 o 9:16, admite texto/imagen y edición conversacional.
En Fal existen `google/gemini-omni-flash`, `/image-to-video`, `/reference-to-video` y `/edit`.

### Patrón motion validado: single-shot → familia profesional

El generador no tiene que producir una pieza por duración. La corrida aprobada creó **un clean master Omni de
8 s por ratio** (`9:16` y `16:9`), cada uno como toma continua sin cortes, copy ni logo. Desde esos dos masters,
el post determinístico produjo la familia profesional completa:

| Pieza | Construcción | Generaciones incrementales |
|---|---|---:|
| Hero 15 s | toma aprobada + montaje de piezas reales de la campaña + end card de 2,5 s | 0 |
| Master 10 s | 8 s de toma aprobada + end card de 2 s | 0 |
| Bumper 6 s | 4 s seleccionados de la toma aprobada + end card de 2 s | 0 |

En dos ratios, la matriz es **2 × 3 = 6 videos**. El `format wall` del hero no se vuelve a generar ni simula
interfaces: se compone con los stills finales reales del mismo release, identificados por path/hash. Esto hace
visible la capacidad de producción a escala y mantiene copy, marca y formatos bajo control.

Seedance 2.0 no es una etapa ritual ni un “mejorador” del single-shot. Se abre sólo si el master aprobado no
contiene la toma, el ángulo, el blocking o la continuidad física que el relato exige. Si sólo cambian duración,
orden, hold, grade, format wall, end card, copy, captions o audio/loudness, la mano correcta es determinista.

## Flujo end-to-end

### 0. Intake y autoridad

Definir objetivo, audiencia, etapa de funnel, oferta, claim/evidencia, mercados, `channelMode`, `brandMode`,
rights owner, presupuesto, responsable del anchor y aprobadores de arte, marca, legal, media y prepress.

### 1. Contrato de campaña

Fijar mensajes, ratios, safe zones, activos oficiales, localización, riesgos de anatomía/producto, presencia
de marca y qué contenido debe ser exacto. Separar desde el inicio:

- `clean plate`: sujeto, ambiente, material y luz; sin texto/logo;
- `brand layer`: logo, tipo, CTA, URL, legal, captions y end card;
- `channel layer`: crop, duración, audio, peso, bleed, ICC y specs del proveedor.

### 2. Divergencia Seedream Lite

Generar 3–16 territorios realmente distintos variando un eje por ruta: metáfora, medio, energía, escala o
composición. Curar con miniaturas; no llevar todo a alta resolución.

### 3. Desarrollo Seedream Pro

Desarrollar sólo 1–3 rutas. Usar referencias con roles y precedencia (`IDENTITY`, `STRUCTURE`, `MATERIAL`,
`IMPACT`, `ANATOMY`, `PALETTE`, `OFFICIAL_ASSET`, `ANTI-REFERENCE`). Pro aporta el mundo visual, no el copy.

### 4. Anchor gate humano

Aprobar tesis, hook, silueta, identidad, anatomía/producto, paleta, luz, copy field, lectura a 320 px, peor
crop y riesgo semántico. Un anchor es una decisión con owner; todavía no es una pieza final.

### 5. GPT Image 2 organiza y extiende

Desde el mismo anchor, producir plates directos por ratio. Un pase cambia un delta: escala, crop, espacio de
copy, reparación o extensión. Bloquear sujeto, hook, paleta y dirección de luz. Texto de modelo es concept-only.

### 6. Bifurcación still/motion

- **Still:** el clean plate pasa a composición determinista branded, brand-light, neutral o client-brand.
- **Motion:** un plate 9:16/16:9 sin logo ni copy se entrega a Gemini Omni como `<FIRST_FRAME>` o referencia.
  Fijar una toma continua, duración, cámara, acción, audio, continuidad, anatomía temporal, prohibiciones y
  poster frame. Primero se genera y aprueba el single-shot; las duraciones de release se editan después.

### 7. Iteración conversacional Gemini Omni

Si el single-shot necesita un cambio generativo localizado, cada edición usa un delta simple y termina con
`Keep everything else the same`. Conservar el interaction/video parent y no reabrir simultáneamente cámara,
sujeto, ambiente y audio. El output generativo sigue siendo un master de motion: captions, logos, CTA, legal,
familia 15/10/6, format wall, mezcla y loudness se terminan fuera del modelo. Si lo solicitado es una nueva
toma/ángulo o continuidad física ausente, no forzar la edición conversacional: abrir el fallback Seedance 2.0.

### 8. Composición digital y offline

- Digital: safe zones de UI, sRGB, peso y legibilidad thumbnail/tamaño real.
- Motion: H.264/MP4 master, WebM/MP4 derivados, poster, captions, audio mix y loudness por destino. Para el
  piloto web/social se usó `−16 LUFS` integrado como target y `≤ −1 dBTP` como ceiling; los heroes midieron
  `−16,3/−16,4 LUFS` y `−2,0/−2,2 dBFS`. Estas cifras prueban conformidad técnica, no reemplazan escucha humana.
- Print: proof de alta resolución; press file sólo después de recibir tamaño, bleed, trim, sustrato e ICC.
- OOH: una idea, una imagen dominante, headline corto, firma y URL; retirar support copy si no sobrevive a
  una lectura de tres segundos. No miniaturizar un feed ad.

### 9. QA y release

Revisar 100% de dimensiones, naming, color, peso, hashes, lineage y exact content. Inspeccionar contact sheet,
thumbnail, full-size y distancia OOH. Para video: primer/medio/último frame, frame-by-frame en momentos de
acción, anatomía, flicker, texto accidental, audio, safe zones y poster. Medir loudness/true peak y escuchar con
audífonos y parlante de teléfono; un valor conforme no demuestra que un loop, crossfade o foley sea creíble.
Un error bloqueante reabre el stage dueño; no se tapa en un modelo posterior.

### 10. Activación y aprendizaje

Creative release no es launch approval. El manifest mantiene dos estados independientes:

- `status: creative_release_complete`: assets, familia 15/10/6, manifests y QA creativo/técnico están cerrados;
- `activationStatus: not_activated|ready|active|paused|complete`: media y medición siguen su propio gate.

Antes de cambiar `activationStatus`: audiencia, landing, UTMs, pixel/CAPI, conversión, presupuesto, trafficking,
legal, escucha final por dispositivo y matriz experimental. Recuperar resultados por `asset_id` y registrar
hook, CTR, CVR, CPA, retención de video y fatiga. El ganador informa el siguiente anchor; no se convierte en una
regla de marca universal por una sola campaña.

## Contrato de relevo still → motion

```yaml
anchor_id: campaign-kv-v1
parent_asset: path/to/clean-plate.png
parent_sha256: "..."
source_stage: gpt-organized-plate
target_model: gemini-omni-flash-preview
target_endpoint: google/gemini-omni-flash/image-to-video
brand_mode: editorial-neutral
channel_mode: digital-motion
role: FIRST_FRAME
locks:
  - exactly one subject
  - approved silhouette, palette and material
  - no logo, copy, letters or watermark
delta: animate flight and modular wake
camera: one continuous shot; no cuts
audio: restrained wing pulse; no dialogue
output: 9:16; 8s; 720p; clean single-shot master
acceptance:
  - identity survives first/middle/last frame
  - no extra anatomy or subject clones
  - copy-safe area survives motion
  - audio and motion have no abrupt cut
```

## Limitaciones vigentes de Gemini Omni

- Preview: model/version/rate limits pueden cambiar; pinnear ID y validar antes de cada producción.
- 720p, 3–10 s; sólo 16:9/9:16 en el contrato revisado.
- No soporta actualmente extensión ni interpolación first/last frame.
- Referencias de video, múltiples videos y audio subido tienen limitaciones documentadas; no diseñar el flujo
  suponiendo que funcionan hasta probar el endpoint exacto.
- Sin system instructions, temperature, `top_p` ni negative prompt dedicado; prohibiciones viven en prompt.
- Inglés está plenamente evaluado; otras lenguas pueden variar. Copy final continúa fuera del modelo.
- Todo video generado incluye SynthID invisible; registrar además provenance propio.

Fuentes oficiales: [Google Gemini Omni](https://ai.google.dev/gemini-api/docs/omni),
[release notes](https://ai.google.dev/gemini-api/docs/changelog),
[pricing](https://ai.google.dev/gemini-api/docs/pricing) y
[Fal image-to-video](https://fal.ai/models/google/gemini-omni-flash/image-to-video/api).

## Worked example

`ai-generations/2026-07-18_high-frequency-campaign-e2e/`

- Seedream Lite: 3 territorios.
- Seedream Pro: 1 anchor.
- GPT Image 2: plates directos 4:5, 9:16 y 3:1.
- Composición: 18 piezas still, incluyendo 16:9, A2 y OOH de alta resolución.
- Gemini Omni: dos clean masters single-shot de 8 s, 9:16 y 16:9. Post determinístico entrega la familia
  profesional de seis videos: dos heroes de 15 s, dos masters de 10 s y dos bumpers de 6 s. Los heroes combinan
  el shot aprobado con claims exactos y un format wall compuesto desde piezas still reales del release; costo
  generativo incremental: USD 0. El clip inicial de 3,008 s se conserva sólo como technical probe, nunca como
  asset profesional. Costo Fal estimado del release motion: USD 2,08. Seedance 2.0 no se invocó porque no faltaba
  una toma/ángulo/continuidad física nueva.
- Audio: target `−16 LUFS`, ceiling `≤ −1 dBTP`; mediciones conformes. La escucha final por audífonos/teléfono
  sigue siendo un gate de activación aunque el creative release esté empaquetado.
- QA: primera composición digital corregida por copy/safe zones; OOH corrigió densidad informativa retirando
  support copy; print/OOH quedan honestamente como production proofs pendientes de ICC/vendor spec.

## Package profesional mínimo

```text
campaign-id/
  brief/          strategy, claims, channel/brand modes, rights, matrix
  prompts/        exact prompts and model/version
  work/           territories, anchors, clean plates, motion masters
  manifests/      lineage, hashes, request IDs, cost, approvals
  review/         contact sheets, frame strips, scorecards, decision log
  delivery/
    digital/
    motion/
    print-proofs/
    ooh-proofs/
    asset-matrix.csv
  qa/             technical, visual, temporal, prepress, release verdict
```

## Gate de cierre

- [ ] `channelMode` y `brandMode` declarados por asset.
- [ ] Cada salida deriva de un anchor aprobado, no de otro derivado.
- [ ] Clean plates no contienen marca accidental ni texto generado.
- [ ] Copy/logo/CTA/legal/captions son determinísticos.
- [ ] Motion pasa identidad temporal, anatomía, flicker, audio y poster frame.
- [ ] La familia 15/10/6 deriva del single-shot aprobado; cualquier nueva generación justifica qué píxel/toma faltaba.
- [ ] El format wall usa piezas reales del release con lineage, no formatos o interfaces inventados.
- [ ] Loudness/true peak están medidos y la escucha humana por dispositivo está registrada.
- [ ] OOH pasa lectura a distancia; print/OOH tienen vendor spec o se etiquetan proof-only.
- [ ] Derechos, disclosure, claims y approvals quedan registrados.
- [ ] Coste, latencia, modelo, endpoint, parent y hashes están en manifest.
- [ ] Creative release y media launch mantienen estados distintos.
