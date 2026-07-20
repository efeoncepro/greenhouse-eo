# TASK-1495 — Globe Target Formats + Multi-format Set Generation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `none`
- Branch: `task/TASK-1495-globe-target-formats-multiformat-set`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el formato objetivo (aspect ratio) en un campo gobernado del contrato del run
—hoy el aspect ratio esta hardcodeado por ruta y solo para video (`apps/creative-runner/src/vertex-video-adapter.ts:90`),
y `1:1`/`4:5` no existen— y agrega la generacion de un **Set** coordinado de formatos como
unidad gobernada (hoy un experimento produce exactamente un output). El contrato transporta la
intencion de formato; el mecanismo de aspect ratio vive DENTRO de cada adapter, detras del provider
seam. Desbloquea "Formatos objetivo" y "Set de key visuales / Set de formatos" del Globe Studio
Workbench (TASK-1474).

## Why This Task Exists

El workbench esta disenado para que quien dirige elija el formato de salida (`1:1`, `4:5`, `16:9`,
`9:16`) y para pedir un **set** coordinado de un mismo brief en varios formatos a la vez. El backend
real no lo permite:

- **Aspect ratio no es contrato.** `PrepareExperimentPayloadV1`
  (`packages/contracts/src/index.ts`, ~312-337) lleva `capability`, `referenceRoute`,
  `authorizedInputs`, `hardCapCredits`, `prompt?`, `editFrom?`, `previousInteractionId?` — **ningun
  campo de formato**. El aspect ratio existe solo dentro de las tablas de ruteo de los adapters de
  video, hardcodeado: `vertex-video-adapter.ts:90` y `:100` fijan `aspectRatio: '16:9'`;
  `vertex-omni-adapter.ts:81` lo tipa como `'16:9' | '9:16'` y lo fija en `:96`/`:106`. Los adapters
  de imagen (`fal-adapter.ts`, `vertex-adapter.ts`) no exponen aspect ratio por el contrato.
  Consecuencia: `1:1` y `4:5` no existen en ningun lado, y el caller no puede elegir formato.
- **Un experimento = un output.** `executeExperiment` (`packages/domain/src/model-lab.ts:266-337`)
  corre una sola attempt via `deps.runner.run(...)` y produce un solo manifest. No hay primitiva que
  agrupe varios outputs de un mismo brief como una unidad gobernada (estado agregado, gasto agregado,
  fence agregado). Un "Set" hoy solo se podria simular disparando N experimentos sueltos sin relacion
  ni tope comun — justo lo que el spend fence per-run no protege a nivel de conjunto.

Fuente del gap con evidencia `file:line`:
`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (categoria ②,
fila "Formatos objetivo … Set de key visuales").

## Goal

- El formato objetivo es un campo transport-neutral del contrato del run, validado y almacenado
  server-side; `1:1`, `4:5`, `16:9` y `9:16` pasan a ser vocabulario del contrato, no literales de una
  tabla de ruteo.
- El mapeo formato → vocabulario del provider vive DENTRO de cada `CreativeProviderAdapter` (Veo,
  Omni, imagen); un formato que una capability no puede producir se rechaza ANTES del gasto
  (readiness), nunca se coerciona en silencio.
- Un Set de formatos es una unidad gobernada: un command hace fan-out de un mismo brief a N formatos,
  con id propio, estado agregado por miembro, gasto agregado y un tope duro que respeta spend fence +
  kill switch + private-ingest como conjunto; readers gobernados leen el set y sus miembros.
- La capacidad nace con Full API Parity (command + reader transport-neutral + coverage), con `ui`
  naciendo `policy-blocked` hasta promocion de ruta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-*.md`
- (repo hermano) `efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias (boundary DURO — repetir de TASK-1481/1490):

- **El codigo vive en `efeonce-globe`.** Greenhouse gobierna lifecycle/docs/evidencia; el runtime lo
  posee Globe. Esta task no escribe runtime en `greenhouse-eo`.
- **El provider seam es sagrado.** Nunca instanciar un SDK de provider directo desde el dominio ni
  desde el contrato. El aspect ratio se mapea al vocabulario del provider SOLO dentro de un
  `CreativeProviderAdapter`. El contrato transporta la intencion de formato, no el mecanismo.
- **La capacidad nace con Full API Parity.** command/reader transport-neutral + coverage; `ui` puede
  nacer `policy-blocked`. No construir nada "UI-especifico".
- **Private-ingest intacto.** Solo hash + rights posture cruzan el contrato; los bytes se ingieren
  server-side. El Set no cambia eso: los inputs siguen entrando por el track privado.
- **Invocar la skill `greenhouse-globe`** (+ `arch-architect` para la forma del Set aggregate) al
  tomar la task.

## Normative Docs

- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — analisis de
  brecha con evidencia `file:line` (categoria ②).
- (repo hermano) `efeonce-globe/Handoff.md` — estado real de rollout del runtime.

## Dependencies & Impact

### Depends on

- `TASK-1481` — Globe API Contract Spine and Cross-Surface Harness (`complete`). Aporta el
  contrato/schemas, la trusted context, la private API/SDK y el coverage/conformance harness sobre los
  que se agrega el campo de formato y el Set. [verificar que el harness de coverage siga en la forma
  citada al tomar la task]
- (repo hermano) `efeonce-globe/packages/contracts/src/index.ts` — `PrepareExperimentPayloadV1`,
  `CreativeCapability`, `CREATIVE_CAPABILITIES`.
- (repo hermano) `efeonce-globe/packages/domain/src/model-lab.ts` — `prepareExperiment`,
  `executeExperiment`, `validatePreparePayload`, `LAB_COVERAGE`, `StoredExperimentRequestV1`,
  `SpendFencePort`, `LabKillSwitchPort`.
- (repo hermano) adapters en `efeonce-globe/apps/creative-runner/src/` — `vertex-video-adapter.ts`,
  `vertex-omni-adapter.ts`, `vertex-adapter.ts`, `fal-adapter.ts`, `composite-adapter.ts`.

### Blocks / Impacts

- `TASK-1474` — Globe Professional Studio Workbench (consume "Formatos objetivo" y "Set de formatos").
- Complementa sin solapar: `TASK-1496` (seed/variar/relanzar — variacion es N variantes de un mismo
  formato; el Set es un mismo brief en N formatos distintos), `TASK-1493` (brief estructurado),
  `TASK-1494` (Style DNA).

### Files owned

- (repo hermano) `efeonce-globe/packages/contracts/src/index.ts`
- (repo hermano) `efeonce-globe/packages/domain/src/model-lab.ts`
- (repo hermano) `efeonce-globe/packages/domain/src/format-set.ts` [nuevo, nombre propuesto — verificar
  convencion del paquete al tomar la task]
- (repo hermano) `efeonce-globe/apps/creative-runner/src/vertex-video-adapter.ts`
- (repo hermano) `efeonce-globe/apps/creative-runner/src/vertex-omni-adapter.ts`
- (repo hermano) `efeonce-globe/apps/creative-runner/src/vertex-adapter.ts`
- (repo hermano) `efeonce-globe/apps/creative-runner/src/fal-adapter.ts`
- (repo hermano) `efeonce-globe/apps/creative-runner/src/composite-adapter.ts`
- (repo hermano) tests `*.test.ts` de los archivos anteriores + conformance/coverage del spine
- `docs/tasks/to-do/TASK-1495-globe-target-formats-multiformat-set.md`

## Current Repo State

### Already exists

- `PrepareExperimentPayloadV1` con `capability`/`referenceRoute`/`authorizedInputs`/`hardCapCredits`/
  `prompt?`/`editFrom?`/`previousInteractionId?` (`packages/contracts/src/index.ts` ~312-337).
- `CREATIVE_CAPABILITIES` (image-generate, image-edit, image-vectorize, image-upscale, video-generate,
  video-extend, video-upscale, audio-generate, speech-synthesize, model-3d-generate) y
  `CreativeCapability` (`contracts/src/index.ts:23-36`).
- Tablas de ruteo con aspect ratio hardcodeado: `VEO_ROUTING` en `vertex-video-adapter.ts:83-107`
  (`aspectRatio: '16:9'`), rutas Omni en `vertex-omni-adapter.ts:81-107` (`'16:9' | '9:16'`); el valor
  se pasa al provider en `vertex-video-adapter.ts:326` y `vertex-omni-adapter.ts:396`/`:420`.
- `executeExperiment` sincrono in-process que produce un manifest por attempt
  (`model-lab.ts:266-337`); `runModelLabExperiment` (`model-lab.ts:365-372`) como harness que reusa
  prepare→execute.
- `SpendFencePort` (fence de seguridad per-run, `packages/domain/src/spend-fence.ts` — NO es el ledger
  comercial) y `LabKillSwitchPort` (`model-lab.ts:107`).
- `LAB_COVERAGE` con `ui: 'policy-blocked'`, `http`/`sdk`/`cli`/`worker`/`e2e` `available`
  (`model-lab.ts:120-129`).

### Gap

- Ningun campo de formato en el contrato del run; el caller no puede elegir aspect ratio.
- `1:1` y `4:5` no existen en ningun adapter; el aspect ratio de imagen no viaja por el contrato.
- No hay declaracion por-capability/por-adapter de que formatos soporta; nada rechaza un formato no
  soportado antes del gasto.
- No hay primitiva de Set: no existe agrupacion de varios outputs de un mismo brief con id propio,
  estado agregado, gasto agregado ni tope duro de conjunto.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: repo hermano `efeonce-globe` (`packages/contracts`, `packages/domain`,
  `apps/creative-runner`); gobernanza en `greenhouse-eo` (EPIC-028)
- Future candidate home: `remain-shared`
  <!-- Dentro del monorepo de Globe; formato + Set son parte del Model Lab / provider seam, no un servicio nuevo. -->
- Boundary: la intencion de formato y el Set son transport-neutral en `packages/contracts` +
  `packages/domain`; el mecanismo de aspect ratio vive DENTRO de cada `CreativeProviderAdapter`;
  consumers = command/reader del spine, nunca UI directa.
- Server/browser split: server-only (adapters + secretos + spend fence); la API publica solo lleva la
  intencion de formato (enum) y referencias por id/hash, nunca bytes ni secretos.
- Build impact: `none` (Node 24 nativo; sin dependencia pesada nueva)
- Extraction blocker: `none` (respeta el seam existente; no crea `apps/*`/`packages/*` nuevos —
  `format-set.ts` es un modulo dentro de `packages/domain`)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `packages/contracts/src/index.ts` (schema del run) +
  `packages/domain/src/model-lab.ts` (validacion/almacenamiento del experimento) + nuevo modulo Set en
  `packages/domain`; tablas de ruteo de los adapters como mecanismo
- Consumidores afectados: `command/reader del spine` (http/sdk/cli/worker/e2e); `UI` (TASK-1474) y
  `MCP` nacen `policy-blocked`
- Runtime target: `worker` (creative-runner / Cloud Run Job) + `external` (provider seam)

### Contract surface

- Contrato existente a respetar: `PrepareExperimentPayloadV1`, `CreativeCapability` y el harness de
  coverage/conformance del spine (`efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`).
- Contrato nuevo o modificado:
  - Campo `targetFormat?` (o `aspectRatio?`) en `PrepareExperimentPayloadV1`, enum transport-neutral
    `1:1 | 4:5 | 16:9 | 9:16` [nombre exacto del campo y de los literales — proponer y verificar
    contra la convencion del spine].
  - Declaracion de formatos soportados por capability/adapter (readiness), consultable antes del
    gasto.
  - Command de Set: `globe.set.prepare` (fan-out de un brief a N formatos como unidad) + reader
    `globe.set.get` [nombres propuestos — verificar el namespacing de capabilities del spine].
- Backward compatibility: `compatible` — `targetFormat` es opcional; sin el, cada capability usa su
  formato por defecto actual (el hardcodeado de hoy pasa a ser el default declarado del adapter).
- Full API parity: la regla vive en el command/reader server-side (`packages/domain`); UI/Nexa/MCP la
  operan como consumers del mismo primitive, no como logica de pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: experimento (store del Lab, `StoredExperimentRequestV1`) + nuevo
  agregado `FormatSet` (id propio + referencias a experimentos miembro). [verificar si el store del
  Lab persiste en memoria/DB al tomar la task; el Set sigue el mismo backend de persistencia]
- Invariantes que no se pueden romper:
  - Un formato solicitado que la capability no puede producir se **rechaza antes del gasto**; nunca se
    coerciona a otro formato en silencio.
  - El mecanismo de aspect ratio vive SOLO dentro del adapter; el contrato jamas nombra parametros de
    provider.
  - El gasto agregado del Set nunca excede su tope duro de conjunto, aunque el estimate de un miembro
    derive; cada miembro ademas pasa su propio spend fence per-run.
  - El Set es una unidad: private-ingest, kill switch y fence aplican al conjunto; ningun miembro se
    dispara si el kill switch esta activo.
  - Cada miembro del Set produce su propio manifest inmutable; el Set no colapsa manifests.
- Tenant/space boundary: se deriva de la trusted context del spine (workspace/principal), igual que
  prepare/execute; un Set y sus miembros pertenecen al workspace del caller y solo son legibles ahi.
- Idempotency/concurrency: el fan-out del Set es un command con semantica explicita; reintentar no
  duplica miembros (idempotency key por Set). [verificar patron de ids del spine — `deps.newId`]
- Audit/outbox/history: manifests append-only por miembro; estado del Set derivado de sus miembros.
  Reusar la postura de evidencia del Lab; declarar si el Set emite un evento propio o se deriva.

### Migration, backfill and rollout

- Migration posture: `additive` (campo opcional nuevo + agregado nuevo; sin migracion destructiva). Si
  el store del Lab es DB-backed, la tabla/columna del Set es additive con default. [verificar]
- Default state: `flag OFF` — el fan-out de Set nace detras de flag/kill switch y `ui: policy-blocked`
  en coverage; `targetFormat` es additive y compatible (default = comportamiento actual).
- Backfill plan: N/A — no hay datos historicos que backfillear (formato por defecto retro-declarado).
- Rollback path: `revert PR` + flag OFF + coverage `ui/mcp: policy-blocked`.
- External coordination: verificar contra los providers reales que soporten los formatos declarados
  (`1:1`/`4:5` no existen hoy en las rutas): Veo/Omni/imagen — un formato que el provider no soporta se
  declara no soportado (readiness), no se fuerza. `REVERIFY before spend` como en las tablas de ruteo.

### Security and access

- Auth/access gate: trusted context del spine (principal + capabilities); el command de Set requiere la
  misma capability creative que su brief base + la capability del Set.
- Sensitive data posture: `no sensitive data` en el contrato (solo enum de formato + ids/hash); los
  bytes siguen por private-ingest server-side.
- Error contract: errores canonicos del dominio (estilo `InvalidExperimentRequestError`); formato no
  soportado y tope de Set excedido devuelven error tipado, sin filtrar detalle del provider.
- Abuse/rate-limit posture: el tope duro de conjunto del Set + el spend fence per-run + el kill switch
  acotan el fan-out; declarar limite maximo de miembros por Set.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build`; unit tests de adapters por formato +
  test del fan-out del Set (tope agregado + rechazo de formato no soportado).
- DB/runtime checks: si el store es DB-backed, verificar el agregado Set + miembros; si es in-memory,
  verificar via el harness del spine. [verificar]
- Integration checks: una corrida privada por el seam de un Set de 2 formatos dentro del tope,
  confirmando 2 manifests con aspect ratios distintos y gasto agregado ≤ tope.
- Reliability signals/logs: reusar la observabilidad del Lab; declarar si el Set agrega una senal de
  "miembro fallido / set parcial".
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths/objetos reales.
- [ ] Data invariants, tenant/access boundary e idempotency/concurrency explicitos.
- [ ] Migration/backfill/rollback posture explicito y proporcional (additive + flag OFF).
- [ ] Evidencia runtime listada (check+build del repo hermano + seam privado de un Set).
- [ ] Errores canonicos, sin fuga de detalle del provider.

## Capability Definition of Done — Full API Parity gate

- [ ] **Logica en el primitive, no en la UI.** Formato + Set viven en `packages/contracts` +
      `packages/domain`; el adapter solo mapea el mecanismo.
- [ ] **Modelado como command/aggregate**, no como click-handler: `globe.set.prepare` (command) +
      `globe.set.get` (reader) + agregado `FormatSet`.
- [ ] **Read** como reader canonico del spine; **write** como command con semantica explicita, auth
      fina por capability, idempotencia (idempotency key por Set), evidencia (manifests append-only) y
      errores canonicos.
- [ ] **Capability + coverage en el MISMO PR**: registrar las capabilities de formato/Set en el
      coverage manifest (`LAB_COVERAGE`-style), `ui`/`mcp` `policy-blocked`, ejecutar el coverage test.
- [ ] **Camino programatico declarado**: http/sdk/cli/worker/e2e `available`; `ui` (TASK-1474) y `mcp`
      difieren con deuda documentada (promocion de ruta).
- [ ] **Write apto para `propose → confirm → execute`**: el fan-out del Set es un command gobernado, no
      integracion Nexa-especifica.
- [ ] **Un primitive, muchos consumers**: cero logica de formato/Set duplicada por consumer.
- [ ] **Parity check = SI**: la capability tiene contrato gobernado a nivel capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Formato objetivo como campo del contrato del run

- Agregar `targetFormat?` (enum transport-neutral `1:1 | 4:5 | 16:9 | 9:16`) a
  `PrepareExperimentPayloadV1` en `packages/contracts/src/index.ts`, con su tipo exportado y doc de por
  que el contrato nombra intencion y no parametros de provider. [proponer nombre exacto del campo y de
  los literales; verificar convencion del spine]
- Validarlo y almacenarlo en `validatePreparePayload` / `StoredExperimentRequestV1`
  (`packages/domain/src/model-lab.ts`); opcional y compatible (sin el, default del adapter).
- Tests de contrato/dominio: campo aceptado, valor invalido rechazado con error canonico, ausencia =
  default.

### Slice 2 — Mapeo formato → provider dentro del seam + readiness

- En cada `CreativeProviderAdapter` (Veo `vertex-video-adapter.ts`, Omni `vertex-omni-adapter.ts`,
  imagen `vertex-adapter.ts` / `fal-adapter.ts`), reemplazar el aspect ratio hardcodeado por un mapeo
  del `targetFormat` solicitado al vocabulario del provider; incorporar `1:1` y `4:5` donde el provider
  lo soporte.
- Declarar por capability/adapter que formatos soporta (readiness); un formato no soportado se
  **rechaza antes del gasto**, con error tipado, nunca se coerciona.
- Tests por adapter: cada formato soportado mapea al parametro esperado del provider; un formato no
  soportado falla en readiness sin llamar al provider.

### Slice 3 — Agregado FormatSet + command de fan-out

- Nuevo modulo `packages/domain/src/format-set.ts` [nombre propuesto]: agregado `FormatSet` con id
  propio, brief base compartido, lista de formatos objetivo, tope duro de conjunto y referencias a
  experimentos miembro; estado del Set derivado de sus miembros.
- Command `globe.set.prepare` [nombre propuesto]: dado un brief base + lista de formatos, hace fan-out
  de un experimento por formato como una unidad; respeta spend fence per-run por miembro + tope
  agregado del conjunto + kill switch + private-ingest; idempotente por Set.
- Tests: fan-out de N formatos crea N miembros; el gasto agregado nunca excede el tope; kill switch
  activo no dispara ningun miembro; formato no soportado en un miembro no aborta el conjunto en
  silencio (postura de set parcial declarada).

### Slice 4 — Readers del Set + coverage/parity

- Reader `globe.set.get` [nombre propuesto]: devuelve el Set + sus miembros + estado y aspect ratio por
  miembro, tenant-safe.
- Registrar las capabilities de formato/Set en el coverage manifest del spine (`ui`/`mcp`
  `policy-blocked`; `http`/`sdk`/`cli`/`worker`/`e2e` `available`) y correr el coverage/conformance
  test.
- Evidencia de una corrida privada por el seam de un Set de 2 formatos dentro del tope.

## Out of Scope

- **UI del workbench** (TASK-1474): esta task no construye pantalla; `ui` nace `policy-blocked`.
- **Variacion / seed / relanzar** (TASK-1496): variacion = N variantes de un MISMO formato; el Set =
  un MISMO brief en N formatos DISTINTOS. No mezclar el fan-out de Set con el fan-out de variantes.
- **Brief estructurado** (TASK-1493), **Style DNA** (TASK-1494), **inpaint** (TASK-1497): el Set opera
  sobre el brief que reciba, no compone ni analiza referencias.
- **Studio Credits comercial** (TASK-1468): el tope del Set usa el spend fence de seguridad, no el
  ledger comercial del workspace.
- **Aprobacion humana / delivery / master** (TASK-1469 / TASK-1472).
- Nuevos providers o nuevas capabilities creativas: solo se mapea aspect ratio sobre las capabilities y
  adapters existentes.

## Detailed Spec

- **Por que el contrato solo lleva intencion.** Igual que `LabEditFromV1` no nombra el paradigma de
  edit (stateful vs reference), `targetFormat` no nombra el parametro del provider. Cada provider tiene
  su vocabulario (`aspectRatio` en Veo, `aspect_ratio` en el `response_format` de Omni, size/aspect en
  imagen). El contrato dice "quiero `4:5`" y el adapter decide como; esto mantiene el seam sagrado y
  permite que un formato exista en el contrato aunque un provider dado no lo soporte (readiness lo
  rechaza para esa capability).
- **Default retro-declarado.** El aspect ratio hardcodeado de hoy (`16:9` en Veo/Omni) pasa a ser el
  formato por defecto declarado del adapter cuando `targetFormat` viene ausente — asi el cambio es
  compatible y no rompe callers en vuelo.
- **El Set como unidad economica.** El fence per-run protege cada miembro; el tope del conjunto protege
  el total. Un miembro que estima mas alto no puede consumir el presupuesto de otro por encima del tope
  agregado. Declarar limite maximo de miembros por Set para acotar el fan-out.
- **Set parcial honesto.** Si un miembro falla (provider o formato no soportado detectado tarde), el
  Set no miente: reporta el estado por miembro (algunos `candidate_ready`, otros `failed`), nunca
  colapsa a un unico "ok/no ok" ni fabrica un output faltante.
- Confirmar contra el codigo real de `efeonce-globe` los nombres exactos de campos/capabilities y la
  forma del store antes de implementar; marcar `[verificar]` cualquier supuesto que no se confirme en
  Discovery.

## Rollout Plan & Risk Matrix

Cambio additive sobre el runtime de Globe, gateado por flag/kill switch y coverage `policy-blocked`
hasta la promocion de ruta. Sin migracion destructiva ni backfill mutante. Rollback = revert PR + flag
OFF.

### Slice ordering hard rule

- Slice 1 (campo de contrato) → Slice 2 (mapeo en el seam) → Slice 3 (Set fan-out) → Slice 4 (readers +
  coverage).
- Slice 2 DEBE cerrar antes de Slice 3: el Set fan-out depende de que cada capability sepa que formatos
  soporta (readiness), o el conjunto podria gastar en un miembro que el provider rechaza.
- Slice 4 (coverage/parity) cierra la task: ninguna capability nueva se considera hecha sin su fila en
  el coverage manifest + coverage test verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El adapter mapea mal el formato y el provider genera otro aspect ratio | provider seam | medium | tests por adapter por formato; `REVERIFY before spend` de las rutas; readiness declara solo formatos confirmados | fallo en test de adapter / manifest con aspect ratio inesperado |
| Formato no soportado se coerciona en silencio y se gasta | provider seam / fence | medium | rechazo en readiness ANTES del gasto; error tipado; nunca coercion | error canonico `unsupported_format` |
| El fan-out del Set excede el tope agregado | spend fence | medium | tope duro de conjunto en el dominio + fence per-run por miembro; limite maximo de miembros | gasto agregado > tope en test / runtime |
| Un miembro fallido colapsa el Set o fabrica output | dominio | low | postura de set parcial explicita; estado por miembro; manifests append-only | estado de Set inconsistente con miembros |
| El Set dispara miembros con kill switch activo | kill switch | low | chequeo de kill switch al abrir el Set y por miembro | miembro corrido con kill switch ON |

### Feature flags / cutover

- Flag/kill switch reusa `LabKillSwitchPort` o una env var dedicada `GLOBE_FORMAT_SET_ENABLED` (default
  `false`) [nombre propuesto — verificar convencion de flags de Globe]. El fan-out de Set solo corre
  con el flag ON.
- Coverage del spine: capabilities de formato/Set con `ui`/`mcp` `policy-blocked`; el resto de las
  surfaces `available`. Promocion de ruta = trabajo aparte (TASK-1474).
- `targetFormat` es additive/compatible: no requiere flag (default = comportamiento actual). Revert:
  quitar el campo del contrato en el PR revertido.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (campo opcional) | <5 min | si |
| Slice 2 | revert PR; los adapters vuelven al aspect ratio por defecto declarado | <5 min | si |
| Slice 3 | flag `GLOBE_FORMAT_SET_ENABLED` OFF + revert PR | <5 min | si |
| Slice 4 | coverage `ui/mcp: policy-blocked` (ya es el default) + revert PR | <5 min | si |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes.
2. Coverage/conformance del spine verde con las capabilities nuevas registradas.
3. Corrida privada por el seam: un experimento con `targetFormat: 4:5` produce un candidato en `4:5`
   (formato que hoy no existe) — verificar aspect ratio del manifest.
4. Corrida privada de un Set de 2 formatos (`1:1` + `9:16`) dentro del tope: 2 miembros, 2 manifests
   con aspect ratios distintos, gasto agregado ≤ tope.
5. Verificar rechazo de un formato no soportado por una capability (error tipado, sin llamada al
   provider).
6. Monitor de senales del Lab/Set durante el periodo de validacion antes de promocionar ruta.

### Out-of-band coordination required

- Verificacion contra los providers reales (Veo/Omni/imagen) de que soportan `1:1`/`4:5` por
  capability antes de declararlos soportados. Ningun formato se declara soportado sin confirmarlo en el
  provider — `REVERIFY before spend`. Fuera de eso, `repo-only change` en `efeonce-globe`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `PrepareExperimentPayloadV1` acepta un campo de formato transport-neutral (`1:1`/`4:5`/`16:9`/
      `9:16`), validado y almacenado server-side; ausente = default del adapter (compatible).
- [ ] El aspect ratio hardcodeado de los adapters de video se reemplaza por un mapeo del formato
      solicitado; `1:1` y `4:5` existen al menos en las capabilities de imagen que el provider soporta.
- [ ] Un formato no soportado por una capability se rechaza ANTES del gasto, con error canonico, sin
      llamar al provider.
- [ ] El mecanismo de aspect ratio vive solo dentro de los adapters; el contrato/dominio no nombra
      parametros de provider.
- [ ] Existe un command de Set que hace fan-out de un brief a N formatos como unidad gobernada con id
      propio, estado por miembro y tope duro de conjunto.
- [ ] El gasto agregado del Set nunca excede su tope; cada miembro pasa su fence per-run; kill switch
      activo no dispara ningun miembro.
- [ ] Un reader gobernado y tenant-safe devuelve el Set + sus miembros + aspect ratio por miembro.
- [ ] Las capabilities de formato/Set estan en el coverage manifest (`ui`/`mcp` `policy-blocked`; resto
      `available`) y el coverage/conformance test pasa.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes en el ultimo commit.

## Verification

- (repo hermano) `cd ../efeonce-globe && pnpm check`
- (repo hermano) `cd ../efeonce-globe && pnpm build`
- (repo hermano) tests de adapters por formato + test del fan-out del Set (tope agregado + rechazo de
  formato no soportado + set parcial)
- (repo hermano) coverage/conformance del spine con las capabilities nuevas
- corrida privada por el seam de un experimento `4:5` y de un Set de 2 formatos (evidencia manual)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla,
      `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1474, TASK-1496)

- [ ] `efeonce-globe/Handoff.md` refleja el estado de rollout del runtime (code complete vs desplegado)

## Follow-ups

- Promocion de ruta de `ui`/`mcp` de las capabilities de formato/Set (queda en TASK-1474 y en el trabajo
  de SDK/MCP TASK-1473).
- Si el store del Lab es in-memory, evaluar persistencia durable del agregado Set (posible task
  derivada).
- Coordinar con TASK-1496 el punto donde "variar" (N variantes de un formato) y "Set" (N formatos)
  puedan componerse (un Set de variantes) sin duplicar fan-out.

## Open Questions

- Nombre exacto del campo de formato (`targetFormat` vs `aspectRatio`) y de los literales del enum
  segun la convencion del spine.
- Namespacing de las capabilities del Set (`globe.set.prepare` / `globe.set.get` vs otra convencion) y
  si el Set reusa `deps.newId`/idempotency del Lab.
- Backend de persistencia del store del Lab (in-memory vs DB) y como se materializa el agregado Set.
- Que formatos soporta realmente cada provider por capability (confirmar `1:1`/`4:5` en Veo/Omni/imagen
  antes de declararlos).
- Postura definitiva de "set parcial": ¿el Set queda `partial` con miembros mixtos o exige todos-o-nada?
