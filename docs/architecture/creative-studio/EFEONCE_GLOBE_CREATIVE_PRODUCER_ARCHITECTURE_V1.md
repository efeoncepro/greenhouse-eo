# Efeonce Globe — Creative Producer (Arquitectura + Decisión V1)

> **Tipo:** arquitectura + ADR · **Creado:** 2026-07-20 · **Dominio:** Efeonce Globe / EPIC-028 ·
> **Método:** análisis riguroso de la referencia Higgsfield (Image/Video/Audio) contra el runtime real de
> `efeonce-globe`, más el gap analysis del Studio Workbench (`GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`).
> **Skill:** cargar `greenhouse-globe` + `arch-architect` al tocar este dominio.

## Decisión

Efeonce Globe expone **dos superficies sobre el mismo backend**:

- **Creative Producer** (esta spec): producción **atómica** de piezas sueltas — una imagen, un video, un
  audio — **low-ceremony, prompt-first, model-first**. El bucle es `prompt (+refs) → ruta → shape → Generate
  (costo visible) → feed de candidatos → Recreate/descargar`. Es el MVP de valor rápido y el que un operador
  de Efeonce usa el día 1.
- **Professional Studio Workbench** (`TASK-1474`): la capa de **agencia**, brief-first (brief → dirección →
  estimate → aprobación → candidatos → delivery). Va **encima** del Producer.

**El Producer se construye ANTES del Workbench**, por dos razones estructurales:

1. **Salta el critical path de plataforma.** No necesita aprobación humana (`1469`), delivery (`1472`),
   parity cert (`1473`) ni el ledger comercial (`1468/1482`). Solo necesita spine (`1481` ✅) + Model Lab
   (`1457` ✅) + spend fence (✅, seguridad interna) + ~5 primitivos nuevos. Entrega valor en una fracción del
   tiempo del Workbench.
2. **Construye los primitivos compartidos** que el Workbench también consume (catálogo de rutas, contrato
   discriminado, estimate previewable, retrieval, feed). Cuando `1474` llegue, esos primitivos ya existen.

Contexto que fuerza la urgencia: Efeonce **hoy produce contenido propio en Higgsfield** (voiceovers NEXA / AI
Visibility Grader, campaña SKY). El Producer trae ese trabajo in-house sobre Globe.

### Alternativas rechazadas

- **Contrato plano solo-image** (`{prompt, quality, ratio, count}`) — rechazado: Video es el segundo consumidor
  y ya lo rompe (duración, frames, elements, motion, audio); Audio lo rompe más (sample-rate, speed, pitch,
  voice-preset, 3 modos). Un contrato plano fuerza reescritura. **El contrato nace discriminado por modalidad.**
- **Producer dentro del Workbench** — rechazado: acopla el MVP rápido al critical path profundo; pierde la
  ventaja de tiempo.
- **EPIC nuevo** — rechazado: el Producer es parte de Globe. Vive como **cluster bajo EPIC-028**.
- **Exponer el slug de wire del proveedor** (`bytedance/seedream/v5/pro/text-to-image`, endpoints de queue) —
  rechazado en toda superficie: es plomería de ruteo y filtra el proveedor exacto. Vive solo en el adapter.
  **Ojo (corrección 2026-07-20):** el *nombre* del modelo ("Seedream 5 Pro") **NO** es el slug — es una señal
  de calidad legible, y mostrarlo **añade valor** (ancla de posicionamiento de la suite, patrón Higgsfield).
  La V1 los agrupó por error; se separaron: nombre+versión del modelo = público; slug/costo/margen =
  prohibidos; casa interna = operator-only (ver §Boundary).

## El modelo del Producer

### Chassis compartido (los 11 primitivos comunes a image/video/audio)

| # | Primitivo | Image | Video | Audio |
|---|---|---|---|---|
| 1 | Prompt bar (`+`/`@` refs) | ✓ | ✓ | ✓ |
| 2 | **Catálogo de rutas** (constraints + specialty + naming) | modelos | +res/dur/audio | +specialty/idiomas |
| 3 | **Output-shape params** (discriminados) | quality, ratio, count | resolution, duration, ratio | sampleRate, format, speed, volume, pitch |
| 4 | **Estimate inline** (`✨N` pre-spend) | ✨3 | ✨24 | ✨N |
| 5 | **Feed unificado cross-modal** (My Generations) | ✓ | ✓ | ✓ (mezcla las 3) |
| 6 | **Recipe + Recreate** (reproducible) | ✓ | ✓ | ✓ (recipe completa) |
| 7 | **Retrieval gobernado** (download/preview) | ✓ | ✓ | ✓ |
| 8 | **Projects / asset org** (carpetas) | ✓ | ✓ | ✓ |
| 9 | **Modos por modalidad** | generate | Create(Elements/Frames)/Edit/Motion | Voiceover/ChangeVoice/Translate |
| 10 | **Presets/treatments** | — | style "GENERAL" | voice "NEXA" |
| 11 | **Reference assets** (private-ingest) | +ref | elements/frames | @-mention |

### El contrato del run: discriminated union por modalidad (el core)

`PrepareExperimentPayloadV1` deja de ser `prompt?: string` plano y pasa a un **union discriminado por
capability**, con params de output-shape **validados contra los constraints de la ruta seleccionada,
fail-closed antes de reservar crédito**:

- **image**: `{ prompt, references[]?, quality, aspectRatio, count }`
- **video**: `{ prompt, inputMode: elements[] | frames{start,end?} | motion{source} | edit{targetId}, resolution, duration, aspectRatio, audioMode }`
- **audio**: `{ mode: voiceover{script} | changeVoice{sourceId} | translate{sourceId, targetLang}, voicePreset?, sampleRate, format, speed, volume, pitch }`

**Diseñado para las 3 desde el día 1; implementado incremental Image → Video → Audio** (decisión del operador
2026-07-20). Ninguna superficie renderiza un control cuyo param no exista y esté validado en el contrato.

### Matriz de capabilities

- **Ya existen** (Model Lab, `1457/1486/1487/1488`): `image-generate`, `image-edit`, `image-upscale`,
  `video-generate`, `video-upscale`, `audio-generate` (TTS), `vectorize`, `model-3d-generate`.
- **Nuevas que el Producer necesita**: video-**frames** (keyframe start/end), video-**motion-control**
  (transfer), audio-**change-voice** (speech-to-speech), audio-**translate** (dub/localización),
  **multi-output omni** (un run → `{video, audio}`), **voice-preset registry** (voces reutilizables/clonadas).

### Los primitivos → tasks del cluster (N1–N6 = TASK-1500…1505)

| ID | Task | Qué es | Profile |
|---|---|---|---|
| **TASK-1500** ✅ | Governed Route/Model Catalog | reader con constraints (res/dur/sampleRate/format/count) + specialty + **naming dual** interno/fidelidad. La keystone. **Shipped 2026-07-20** (ver §Contratos reales del catálogo) | backend-data |
| **TASK-1501** | Modality-Discriminated Run Contract | `PreparePayload` como union por capability + output-shape validados pre-spend (**absorbe `1495`**) | backend-data |
| **TASK-1502** | Previewable Estimate reader | el `✨N` antes de gastar (extrae el estimate de dentro de `execute`; slice adelantado de `1469`) | backend-data |
| **TASK-1503** | Governed Output Retrieval + Asset Actions | hash→bytes servible + download/preview/favorite/copy sobre el store content-addressed de `1490` | backend-data |
| **TASK-1504** | Producer Capability Expansion | video frames + motion-control; audio change-voice + translate; multi-output omni; voice-preset registry — tras el provider seam | backend-data |
| **TASK-1505** | Producer Surface (UI) | Image/Video/Audio: chassis + paneles por modalidad + feed unificado. El "antes de `1474`". | ui-ux |

**Reusa** `1493` (recipe/preset), `1494` (reference intelligence), `1496` (recreate/variación/batch),
`1497` (inpaint = una capability de edición), `1498` (exploración → feed unificado). **Absorbe** `1495`
(formatos → output-shape de `1501`). **Único workbench-exclusivo:** `1499` (Dirección — el Producer es
prompt-first, no interpreta brief). **Sincroniza** projects durables con `1465` (tenancy).

### Contratos reales del catálogo (TASK-1500, vigente)

- **Tipos (wire SSOT):** `efeonce-globe/packages/contracts/src/producer-catalog.ts` —
  `ProducerRouteDescriptorV1` (routeId · capability · `model: RouteModelIdentityV1 { name; version? }` **público**
  · `house: string` **operator-only** · `RouteConstraintsV1` union discriminada por `modality` image/video/audio ·
  `RouteSpecialtyV1` · `audioCapable` · `RouteInputMode[]` · `fidelityContract?`), proyecciones
  `ProducerCatalogViewV1` (`model` siempre, `house?` solo operador) / `ProducerCatalogListDataV1` /
  `ProducerCatalogGetDataV1` (con `catalogVersion`), queries `ProducerCatalogListQueryV1` /
  `ProducerCatalogGetQueryV1`.
- **Dato + motor:** `packages/domain/src/producer-catalog.ts` — `PRODUCER_ROUTE_CATALOG` (frozen, seed 4 rutas
  ancladas a las fidelity routes vivas: `ref/still/rrss-v1` = Seedream · 5 Pro, `ref/motion/loop-v1` = Seedance ·
  2.0, `ref/audio/foley-v1` = Seed Audio, `ref/voice/tts-v1` = ElevenLabs · Multilingual v2) +
  `PRODUCER_CATALOG_VERSION`; drift guards con `throw` en carga (routeId único · capability ∈
  `CREATIVE_CAPABILITIES` · modality-match · `audioCapable` coherente · no-slug-leak sobre routeId, `model.name`,
  `model.version` y `house`). Agregar una ruta = editar el array + versión; el motor no tiene `switch` por ruta.
- **Helpers in-process (SSOT de reuse):** `listProducerRoutes` / `getProducerRoute` /
  `resolveRouteConstraints` — lo que `TASK-1501` (validación de shape fail-closed pre-spend) y `TASK-1502`
  (`costo = f(ruta, shape)`) consumen directo, **sin re-dispatch** por el registry.
- **Readers gobernados:** `globe.producer.catalog.list` / `.get`, gateados por
  `globe.producer.catalog.read`; coverage `ui`/`mcp` `policy-blocked` (gate de `1505`), internas
  `available`, `sister-platform` `not-applicable`. Query malformada → `invalid_request`; routeId
  desconocido → `not_found` sin revelar existencia.
- **Audiencia fail-closed (decisión invertida 2026-07-20):** el **modelo (`model`) es público** en cualquier
  audiencia — mostrar "Seedance · 2.0" al cliente es ancla de posicionamiento de la suite. Lo gateado es la
  **casa** (`house`, taxonomía interna): `resolveRouteAudience` retorna `operator` solo con la capability
  **dedicada** `globe.producer.route.reveal_house` (no se reusa la autoridad del Lab); default `client`, que
  **omite** `house`. La capability y el grant al service principal (path operador) viven en `app.ts`. Nunca
  salen el slug, el costo vendor ni el margen.
- **SDK:** `listProducerRoutes(query?)` / `getProducerRoute(routeId)` en `packages/sdk`.

## Boundary / invariantes (heredados + nuevos)

Hereda todos los invariantes de Globe (`greenhouse-globe` skill + `EFEONCE_GLOBE_MODEL_LAB_V1.md`), y agrega:

- **Provider seam sagrado.** Toda capability nueva (frames, motion-control, change-voice, translate) se invoca
  **detrás del `CreativeProviderAdapter`**, nunca un SDK de proveedor directo en dominio/UI/MCP/CLI/tests.
- **Catálogo con naming triple + modelo público (decisión 2026-07-20).** El slug del proveedor vive **solo
  dentro del adapter**. El catálogo separa tres identidades: (1) `routeId` (wire), (2) `model` = **nombre +
  versión** del modelo real ("Seedance" · "2.0") **client-facing** — mostrar el modelo real **añade valor**:
  es ancla de posicionamiento de la suite (el cliente enterprise sabe qué modelo da mejor calidad, patrón
  Higgsfield), y no filtra economía porque (3) el **costo vendor y el margen nunca entran al catálogo**. La
  **casa** (`house`, taxonomía interna de Efeonce) es **operator-only**, gateada por
  `globe.producer.route.reveal_house`. `actualRoute` = contrato de fidelidad, no slug. La `version` es etiqueta
  libre opcional (aguanta "2.0", "5 Pro", "Multilingual v2" o ausencia).
- **La unidad de crédito es `ruta × output-shape`, nunca el modelo.** El estimate se computa de esa dimensión;
  un fallback nunca convierte provider/modelo en unidad de crédito.
- **Multi-output explícito.** Un run omni emite `{video, audio}`; el manifest declara cada output con su
  `sha256`. Ningún output se descarta silenciosamente (regla heredada de `1490`: `outputsRetained`).
- **Private-ingest para toda referencia.** Elements, frames, @-mentions, source de change-voice/translate:
  cruzan como `hash + rights`, nunca bytes crudos por la API; herencia de derechos `derived-internal` de `1490`.
- **Spend fence, no ledger comercial.** El Producer interno usa el fence de seguridad (`1457`). El costo
  visible (`✨N`) sale del estimate + fence; el ledger comercial durable (`1468`) es para clientes, diferido.
- **Retrieval tenant-safe.** El download/preview resuelve `hash → bytes` solo dentro del workspace del caller;
  un asset de otro workspace es `not_found` (nunca revela existencia).
- **Contrato discriminado fail-closed.** Un param fuera de los constraints de la ruta (30s en un modelo que
  topa en 10s; 4K en uno que topa en 720p) rechaza **antes** de gastar, no en runtime.

## Por qué antes del Workbench (el reframe, explícito)

El Producer **no compite** con la lane de plataforma ni con el Workbench; **corre en paralelo** y **adelanta
los primitivos compartidos**:

- **No depende del critical path de 6 niveles** (`1465→1466→1468→1482→1469→1470→1472→…`). Solo del spine +
  Model Lab (ambos ✅) + los 5 primitivos nuevos.
- **6 de las 7 tasks del Workbench (`1493–1498`) son en realidad primitivos compartidos**; construir el
  Producer las materializa. Solo `1499` (Dirección) es exclusiva del Workbench.
- **`1474` (Workbench) pasa a depender de los primitivos del Producer** (`1500–1503`): también consume el
  catálogo, el contrato, el estimate y el retrieval. Se declara en su `Blocked by`.

## Pilares (4-pillar)

- **Safety:** kill switch heredado (default OFF); spend fence hard-cap pre-spend; naming dual protege
  costo/margen en superficie cliente; contrato discriminado fail-closed; retrieval tenant-safe; capabilities
  nuevas nacen `policy-blocked` en surfaces ejecutables hasta gate.
- **Robustness:** validación de shape contra constraints del catálogo antes de gastar; multi-output atómico
  (o todos los outputs o degradación honesta, nunca un candidato pagado a medias); private-ingest rechaza
  input malformado; estimate idempotente (read-only).
- **Resilience:** un fallo de storage en retrieval degrada honestamente (el candidato sigue existiendo por su
  hash); reintentos del runner heredados; el feed se re-lee de la fuente, no cachea estado mutable.
- **Scalability:** el catálogo es dato versionado (agregar una ruta = editar dato, no código); el contrato
  discriminado absorbe modalidades nuevas sin reescritura; batch-of-N acotado por el fence; retrieval por
  hash escala con el store content-addressed.

## Secuencia (roadmap por slices)

1. **TASK-1500 + TASK-1501** (catálogo + contrato) — la keystone; desbloquea todo. Listas ya (spine + lab ✅).
2. **TASK-1502 + TASK-1503 + TASK-1504** — estimate, retrieval, capabilities; en paralelo tras la keystone.
3. **TASK-1505 (UI)** — el Producer Surface, consume 1500–1504; entregable de valor rápido. Impl **Image →
   Video → Audio**.
4. **Sync**: projects durables cuando aterrice `1465`; el ledger comercial cuando lo exija un cliente (`1468`).
5. **Feeds `1474`**: los primitivos 1500–1503 quedan listos para el Workbench.

## Hard rules (anti-regresión)

- **NUNCA** un contrato de run plano por modalidad: el `PreparePayload` es discriminado por capability, con
  shape validado contra los constraints de la ruta, fail-closed pre-spend.
- **NUNCA** exponer el **slug del proveedor**, el **costo vendor** ni el **margen** en ninguna superficie; el
  slug vive solo en el adapter. El **nombre + versión del modelo SÍ es público** (ancla de posicionamiento);
  lo operator-only es la **casa** (`house`), gateada por `globe.producer.route.reveal_house`. No confundir
  "nombre del modelo" (público) con "slug de wire" (prohibido).
- **NUNCA** una capability nueva (frames/motion/change-voice/translate/omni) fuera del provider seam.
- **NUNCA** computar la unidad de crédito por modelo; siempre `ruta × output-shape`.
- **NUNCA** retornar bytes crudos de referencia por la API ni servir un asset cross-workspace en retrieval.
- **NUNCA** descartar un output de un run multi-output sin declararlo en el manifest.
- **SIEMPRE** una capability del Producer nace con Full API Parity (command/reader transport-neutral +
  coverage matrix), `ui`/`mcp` `policy-blocked` hasta gate.

## Open questions

- Naming exacto de la superficie ("Producer" vs "Studio" vs "Create") y su ruta.
- ¿El voice-preset registry (`1504`) es un asset propio o extiende el treatment registry de `1493`?
- Umbral de batch-of-N por modalidad (image permite 1–4; video/audio ¿cuánto, dado el costo?).
- ¿El feed unificado cross-modal (`1498` extendido) necesita su propio reader o compone los readers por
  modalidad? Resolver en `1498`/`1505`.
- Contabilidad del costo del Producer interno vs el ledger comercial `1468` (hoy: fence de seguridad; clientes: diferido).
