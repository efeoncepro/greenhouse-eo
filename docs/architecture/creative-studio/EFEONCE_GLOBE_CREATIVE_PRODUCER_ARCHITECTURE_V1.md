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
| **TASK-1500** ✅ | Governed Route/Model Catalog | reader con constraints (res/dur/sampleRate/format/count) + specialty + **modelo público** (nombre+versión) + **casa interna** (`house`, operator-only vía `reveal_house`). La keystone. **Shipped 2026-07-20** (ver §Contratos reales del catálogo) | backend-data |
| **TASK-1501** ✅ | Modality-Discriminated Run Contract | `PreparePayload` como union por capability + output-shape validados pre-spend (**absorbe `1495`**). **Shipped 2026-07-20** (ver §Contratos reales del run contract) | backend-data |
| **TASK-1502** ✅ | Previewable Estimate reader | el `✨N` antes de gastar (extrae el estimate de dentro de `execute`; slice adelantado de `1469`). **Shipped 2026-07-20** (ver §Contratos reales del estimate) | backend-data |
| **TASK-1503** ✅ | Governed Output Retrieval + Asset Actions | hash→bytes servible + download/preview/favorite/copy sobre el store content-addressed de `1490`. **Shipped 2026-07-22** (ver §Contratos reales del retrieval) | backend-data |
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

### Contratos reales del run contract (TASK-1501, vigente)

- **Tipo (wire SSOT):** `efeonce-globe/packages/contracts/src/index.ts` — `OutputShapeV1 = ImageOutputShapeV1 |
  VideoOutputShapeV1 | AudioOutputShapeV1`, **union discriminado por `modality`**, agregado como
  `PrepareExperimentPayloadV1.output?` (**additive-optional**: un caller sin `output` conserva el comportamiento
  previo). Image `{ quality, aspectRatio, count }`; video `{ inputMode(elements|frames{hasEndFrame}|motion|edit),
  resolution, durationSeconds, aspectRatio, audioMode }`; audio `{ mode(voiceover|change-voice|translate{targetLang}),
  voicePreset?, sampleRate, format, speed, volume, pitch }`. `prompt` sigue **top-level** (instrucción creativa /
  script / instrucción de edit); los selectores **no transportan bytes** (refs por `authorizedInputs`, base de edit
  por `editFrom`).
- **Validación fail-closed pre-spend:** `validateOutputShape` corre dentro de `validatePreparePayload`
  (`packages/domain/src/model-lab.ts`), en `prepare` — **estrictamente antes de `fence.reserve`** en
  `executeExperiment`. Parseo estructural del payload no confiable + range-check contra los constraints de la ruta.
  Rechazos → `invalid_request`: ruta desconocida, `route.capability ≠ payload.capability`, `output.modality`
  incoherente con la ruta, param fuera de rango/enum, `inputMode`/`mode` no soportado por `route.inputModes`,
  output malformado, y **sin catálogo cableado** (no se puede validar ⇒ se rechaza). Nunca coerción silenciosa.
- **Frontera con TASK-1500 (reconciliación del port):** el diseño proponía
  `RouteCatalogPort.constraintsFor(capability, referenceRoute)`; la firma real es
  **`RouteCatalogPort.getRoute(referenceRoute): ProducerRouteDescriptorV1 | undefined`** (el descriptor ya trae
  `capability` + `constraints` + `inputModes`, todo lo que la validación necesita). Impl de producción = el helper
  in-process `getProducerRoute` de TASK-1500 (reuse SSOT, sin re-dispatch ni ciclo de módulos), cableado en
  `app.ts`; los tests inyectan doubles. `catalog?` es opcional en `ModelLabDependencies` (un experimento sin
  `output` no necesita catálogo; con `output` sin catálogo ⇒ fail-closed).
- **Threading al provider seam (image-first, AMBOS adapters de imagen):** `CreativeProviderRequestV1` gana
  `quality?`/`aspectRatio?`/`count?`; `toProviderRequest` los hilvana desde `experiment.request.output` cuando
  `modality==='image'`. Los **dos** adapters de imagen los leen, cada uno con el schema verificado de su proveedor
  (el aspect ratio del catálogo es vocabulario neutro, cada adapter lo traduce):
  - **Fal (Seedream v5/pro)** — verificado contra la doc publicada de Fal: `count → num_images`, y el aspect ratio
    neutral → **`image_size` (preset nombrado)** (Seedream v5/pro **no tiene** `aspect_ratio`: `16:9 →
    landscape_16_9`, `1:1 → square_hd`, …; sin preset omite `image_size`).
  - **Vertex (Nano Banana / gemini-2.5-flash-image)** — verificado contra la API de Gemini `generateContent`:
    aspect ratio → **`generationConfig.imageConfig.aspectRatio`** (toma el formato neutro `"16:9"` directo, sin
    presets); `count` no se cablea (Gemini image no tiene multi-image documentado; Seedream sí vía `num_images`).
  - Es el default del composite el que rutea image-generate a Vertex, así que cablear **ambos** evita que el shape
    se ignore en silencio según qué proveedor se elija.

  **Absorbe el aspect ratio de TASK-1495 para image.** El threading de video/audio a sus adapters es TASK-1504.
- **Coverage sin cambios:** misma capability (`globe.lab.experiment.run` / `globe.run.prepare`), `ui`/`mcp`
  `policy-blocked`. La UI (1505), MCP, SDK y CLI consumen el MISMO command con el nuevo shape.

### Contratos reales del estimate (TASK-1502, vigente)

- **Extracción del estimate a un quote prospectivo:** `LabRunnerPort.estimate` pasó de `{ experiment:
  StoredExperimentV1 }` a `{ quote: LabQuoteInputV1 }` (`{ capability, route, outputShape?, inputHashes,
  hardCapCredits? }` en `packages/contracts`). `execute` deriva el quote de su experimento persistido
  (`quoteInputFromStored`), así el **reader y `execute` comparten el MISMO cómputo de estimate** — nunca
  duplicado. `toProviderRequestFromQuote` arma un provider request no facturable (sin prompt/bytes/edit).
- **Reader gobernado** `globe.lab.experiment.estimate` (`GLOBE_LAB_READERS.estimate`), registrado en
  `registerModelLabCapabilities` con `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`) y `requiredCapability:
  GLOBE_LAB_EXPERIMENT_CAPABILITY`. **Read-only**: no crea experimento, no `fence.reserve`, no `transition`
  (verificado con spies que throwean en test).
- **Fail-closed pre-spend, reusando TASK-1501:** el handler valida el `outputShape` (opcional, additive) contra
  los constraints de la ruta del catálogo vía el **mismo `validateOutputShape`** — shape fuera de constraints /
  ruta / capability desconocida → `invalid_request`; kill switch OFF → `policy_blocked`. Un `hardCapCredits`
  excedido **no rechaza**: devuelve `withinHardCap:false` (señal de presupuesto, no error — un preview dice la
  verdad, no gasta).
- **Proyección curada `LabEstimatePreviewV1`:** expone `estimatedCredits` (`✨N`) + `referenceRoute` (contrato
  de fidelidad, = `estimate.route`) + `estimatedDurationSeconds?` + `withinHardCap?`; **omite** `provider`,
  `model`/slug, costo vendor y margen. `withinDayCap?` queda declarado pero **no poblado** cuando el fence corre
  in-memory per-process (el `LabSpendFence` no da una señal confiable entre réplicas). El fence durable que sí da
  esa señal compartida entre réplicas es `DurableSpendFence`, shipado por **TASK-1465** y wired en producción
  (Cloud SQL, keyless IAM, maxScale=3, ver [`EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](./EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md));
  el credit ledger comercial durable sigue siendo `TASK-1468`, aparte.
- **Unidad de crédito = `ruta × output-shape`, nunca el modelo.** El fake sigue keyeando por capability
  (limitación conocida documentada); los adapters reales varían por shape vía el threading de `TASK-1501`.
- **SDK:** `estimateExperiment(query)` en `packages/sdk`.

### Contratos reales del retrieval + asset actions (TASK-1503, vigente)

El **output side**: lo que hace *usable* una pieza ya generada. Se apoya en el store content-addressed que
dejó `TASK-1490` (write half) y agrega su **espejo servible** gobernado.

- **Capability propia, de gasto cero:** `globe.producer.assets.operate` (`GLOBE_PRODUCER_ASSETS_CAPABILITY`,
  la que llevó `GLOBE_CAPABILITIES` de 11 a 12 entradas). **Deliberadamente NO** reusa `globe.lab.experiment.run`: esa es autoridad de
  **gasto** y vive en el principal workload (api-mode), mientras que descargar o marcar lo que ya produjiste
  debe ser alcanzable por un humano sin conferir jamás la capacidad de facturar a un proveedor. Ids en su
  propio mapa (`GLOBE_PRODUCER_ASSET_READERS` / `..._COMMANDS`), separado de `GLOBE_PRODUCER_READERS` (el
  catálogo responde a otra capability; un vocabulario que cruza dos autoridades es como una se ensancha).
- **La pieza load-bearing — `authorizeOwnedOutput`** (`packages/domain/src/producer-assets.ts`). El store es
  **tenant-blind** (el nombre del objeto ES el hash, un bucket para todos los workspaces) y contiene **tanto
  outputs como bytes de referencias private-ingest**. La autoridad no puede venir de ahí: viene del dominio,
  gateando contra `store.get(workspaceId, experimentId)` (el **mismo** `ExperimentStorePort` del Lab, no un
  índice paralelo) y matcheando **sólo** `outputHashes` de un attempt `candidate_ready` con
  `outputsRetained === true`. **NUNCA** consulta `authorizedInputHashes`. Todo rechazo **de propiedad** colapsa a
  `capability_not_found → not_found` — cross-workspace, id desconocido, hash que sólo fue input y candidato no
  retenido son **indistinguibles desde afuera**; cualquier respuesta más fina es un oráculo para sondear un
  bucket compartido.
- **Reader `globe.producer.output.get` → `ProducerOutputHandleV1`:** descriptor (`experimentId`, `attemptId`,
  `sha256`, `mediaType`, `mimeType`, `disposition`) + **grant efímero**. **Cero bytes en el JSON**, cero URL
  firmada, cero bucket, cero identidad de proveedor. `mediaType` se deriva de la capability semántica del run
  (única evidencia del manifest); el `Content-Type` servido sale del objeto real, así un run multi-output no
  miente en el cable (tipado por-output = `TASK-1467`).
- **El grant** (`RetrievalGrantSignerPort`, impl HMAC-SHA256 en `apps/studio-web/src/retrieval-grant.ts`):
  opaco, server-minted, **firmado no cifrado** (sus claims son cosas que el caller ya sabe), bound a
  `(workspaceId, experimentId, sha256, disposition)` con TTL corto (default 300 s), verificación
  **stateless** en tiempo constante. **No es un bearer autosuficiente**: viaja en query porque la UI necesita
  un `src` directo, y eso es aceptable precisamente porque la ruta autentica **antes** y re-chequea propiedad
  **después**. Nunca se loggea ni entra a un audit event.
- **Ruta de transporte `GET /v1/outputs/:sha256?experiment=…&grant=…&disposition=…`** (`app.ts`): auth
  (`resolveDispatchPrincipal`, **en el router**, antes de entrar a `serveOutput`) → kill switch →
  **gate 1** grant (HMAC + expiry + claims) → **gate 2**
  `deriveTrustedContext(workspaceSelection = claims.workspaceId)` (un grant filtrado a otro usuario autenticado
  no resuelve) → **gate 3** `authorizeOwnedOutput` **re-ejecutado** (un candidato que dejó de ser recuperable
  deja de ser servible aunque el grant siga vivo) → stream con `Content-Type` + `Content-Disposition`
  (filename neutro `globe-<hash12>.<ext>`, sin vendor) + `Cache-Control: private, no-store`. Es un transporte
  **fino**: reusa el **mismo** helper del reader y el **mismo** `handlerErrorToApiCode` — un primitivo, dos
  transportes, sin política duplicada.
- **Degradación honesta:** cualquier `OutputRetrievalError` (`not_found` / `unreadable` / `integrity_mismatch`)
  ⇒ `dependency_unavailable` (retryable). **Nunca** `200` con cuerpo vacío, y **deliberadamente nunca**
  `not_found`: el dominio acaba de certificar que el candidato existe, así que contradecir el descriptor
  mandaría a un operador a cazar un fantasma.
- **Seam de lectura `OutputRetrievalPort` / `GcsOutputRetrieval`** (`apps/creative-runner/src/output-retrieval.ts`):
  mismo bucket, mismo token keyless (ADC/WIF) y mismo naming que `GcsOutputIngest`; re-verifica
  `sha256(bytes) === declarado` **antes** de devolver. Es el tercer lector del store, distinto de
  `GcsInputResolver` (ese alimenta a un provider dentro de un run pagado, detrás del fence).
- **Asset actions, idempotentes por construcción:** `globe.producer.asset.favorite` toma el **estado deseado
  explícito** (nunca toggle ciego) y conserva el timestamp original en un repeat;
  `globe.producer.asset.copyAsReference` certifica `ProducerReferenceHandleV1` con
  `rights: 'derived-internal'` (**inforjable**: un caller no puede declararlo) + `parentRights` heredado por
  `inheritedDerivedRights` — **la misma** función que usa el edit base del Lab, para que un ancestro `licensed`
  no deje de restringir en una de las dos derivaciones. Falla cerrado **antes de mintear** si el medio no es
  referenciable (`model-3d`). Cero bytes por la API, cero crédito: el run que después consuma la referencia lo
  tarifa `TASK-1502` por `ruta × shape`. Reader `globe.producer.asset.list` para el feed.
- **Persistencia durable** (delta al spec de la task, que la difería a `TASK-1465`): `TASK-1465` ya shipeó y no
  cubrió estas anotaciones, y `TASK-1508` dejó los servicios en **3 réplicas** — un store in-memory no queda
  "volátil" sino **no determinista** (una estrella escrita en una réplica es invisible en otra). Se implementó
  `AssetAnnotationStorePort` con doble in-memory + `DurableProducerAssetStore` (`packages/database`) sobre la
  migración `0003_producer_asset_annotations.sql`; la idempotencia vive en SQL (`ON CONFLICT … DO NOTHING` +
  re-lectura), porque entre réplicas un "chequeá y después insertá" es una carrera cuyo síntoma visible es un
  `referenceId` duplicado o una estrella re-fechada. `rights = 'derived-internal'` es un `CHECK`, no una
  convención.
- **Coverage `PRODUCER_ASSETS_COVERAGE`:** `ui`/`mcp` `policy-blocked` (gate de `TASK-1505`, que además hace
  que el broker grantee la capability a humanos web), `http`/`sdk`/`cli`/`worker`/`e2e` `available`,
  `sister-platform` `not-applicable`. Grant al service principal en el mismo PR.
- **Flags:** `GLOBE_PRODUCER_ASSETS_ENABLED` (default **OFF** ⇒ `policy_blocked` en reader, commands y ruta) y
  `GLOBE_PRODUCER_GRANT_SECRET` (Secret Manager; sin él el mint degrada a `dependency_unavailable` — es
  requisito de operación, no flag de rollout). TTL configurable con `GLOBE_PRODUCER_GRANT_TTL_SECONDS`
  (default 300, rango 30-900).
- **SDK:** `getProducerOutput` / `listProducerAssets` / `favoriteProducerAsset` /
  `copyProducerAssetAsReference`. El conformance harness ejercita el output side por HTTP **y** SDK y compara
  la proyección — parity demostrada, no declarada.

### Estado de runtime y camino comercial (TASK-1503, 2026-07-22)

**Vivo hoy:** la capability está **operativa** en `globe-api-internal` (rev `00016-8dr`,
`GLOBE_PRODUCER_ASSETS_ENABLED=true`, secreto v1 activo, migración `0003` aplicada), verificada con
retrieval real de bytes, los tres negativos y el negativo private-ingest en forma precisa (un hash que
sí está en el bucket, declarado como input de otra corrida ⇒ `not_found`, con control de que el output
propio de esa misma corrida sí se sirve).

Vive en el servicio **api** y no en el web por **autoridad**, no por despliegue: la capability viaja en
el service principal, y en modo `web` las capabilities salen del broker de Greenhouse, que no otorga
`globe.producer.assets.operate` a humanos. Eso es el gate de `TASK-1505`.

**`internal_smoke` es el estadio actual del runtime, no el techo del producto.** Los gates reales
hacia uso comercial, con dueño:

| Gate | Qué falta | Dueño |
|---|---|---|
| Humano interno (shell web) | broker grant + flip de `ui`/`mcp` | `TASK-1505` |
| Cliente externo / comercial | readiness gate completo | `TASK-1480` ← `TASK-1477` · `TASK-1478` · `TASK-1479` · `TASK-1482` (sobre `TASK-1468`) — **las 5 en `to-do`** |
| Runtime no-interno | `readStudioRuntimeConfig` lanza `globe_environment_not_internal_smoke`: no hay forma de bootear un runtime comercial | **SIN DUEÑO declarado** — `TASK-1480` no lo menciona |
| Contabilidad comercial | el spend fence es de seguridad, no ledger (retrieval es gasto cero y no lo necesita; el Producer completo sí) | `TASK-1468` → `TASK-1482` |

El ensanche del enum de entorno es un **bloqueo duro en código sin dueño**: las otras cuatro
dependencias de `TASK-1480` pueden avanzar en paralelo, pero ninguna lo resuelve. Es el candidato
natural a próximo paso ejecutable del programa comercial.

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

- **Safety:** kill switch heredado (default OFF); spend fence hard-cap pre-spend; el catálogo expone el
  modelo (nombre+versión) pero **nunca** slug/costo/margen y mantiene la casa operator-only, protegiendo la
  economía en superficie cliente; contrato discriminado fail-closed; retrieval tenant-safe; capabilities
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
- **NUNCA** autorizar un retrieval contra el store de objetos (es tenant-blind y guarda outputs **y** bytes de
  referencias de entrada): la puerta es `authorizeOwnedOutput` contra los `outputHashes` retenidos que el
  workspace posee, y **jamás** contra `authorizedInputHashes`. Todo rechazo **de propiedad** colapsa a
  `not_found` — el carve-out deliberado es el grant forjado/vencido, que es `access_denied`: no probar
  autorización no dice nada sobre si el asset existe.
- **NUNCA** duplicar la política de autorización dentro de la ruta de serving: reusa el mismo helper del
  reader (un primitivo, dos transportes) y re-chequéalo en la redención, además de verificar el grant.
- **NUNCA** devolver `200` con cuerpo vacío ni `not_found` cuando el store falla en retrieval: degrada a
  `dependency_unavailable` (retryable) e integridad re-verificada antes de servir.
- **NUNCA** dejar que un caller declare `derived-internal` ni blanquear un derivado a `internal-owned`: el
  handle lo certifica la plataforma y arrastra `parentRights` por `inheritedDerivedRights` (una sola regla,
  compartida con el edit base del Lab).
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
