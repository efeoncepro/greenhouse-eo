# TASK-1502 — Previewable Estimate Reader

## Delta 2026-07-20

- La dimensión "ruta" para `costo = f(ruta, output-shape)` quedó **cerrada por TASK-1500** (complete):
  `PRODUCER_ROUTE_CATALOG` + `PRODUCER_CATALOG_VERSION` + helpers `getProducerRoute`/`resolveRouteConstraints`
  en `efeonce-globe/packages/domain/src/producer-catalog.ts`. El estimate consume el helper in-process
  (nunca re-dispatch); el catálogo NO lleva costo vendor ni margen — el pricing es de esta task.
- **⚠️ Invariante de naming INVERTIDO en TASK-1500 (supersede el body de este spec).** El cuerpo de abajo
  describe "naming dual (modelo-real interno / fidelidad-curada cliente)" y "vista modelo-real curado-only" —
  eso quedó **al revés**. Estado final: el **modelo real (nombre+versión) es PÚBLICO/client-facing**; lo
  operator-only es la **casa** (`house`, capability `globe.producer.route.reveal_house`). Lo que **sigue
  válido** de este spec (la mayoría): el estimate NO debe exponer **slug de proveedor, costo vendor ni margen**
  — eso nunca sale. Al construir, re-derivar el naming contra el contrato final de TASK-1500
  (`RouteModelIdentityV1` + `resolveRouteAudience`), no contra la terminología "curado/modelo-real" del body.


- **Delta 2026-07-20 — TASK-1501 complete:** el `output` shape tipado (`OutputShapeV1`, discriminado por
  modalidad) ya existe en `PrepareExperimentPayloadV1` y queda persistido en `StoredExperimentRequestV1`. El
  estimate `costo = f(ruta, output-shape)` ya tiene el shape como **dimensión de primera clase** para leer. El
  `RouteCatalogPort.getRoute(referenceRoute)` (impl `getProducerRoute`, in-process) es el mismo seam a reusar
  para el estimate; el catálogo NO lleva costo vendor ni margen (el pricing es de esta task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `TASK-1500, TASK-1501`
- Branch: `task/TASK-1502-globe-previewable-estimate-reader`

## Summary

Extrae el estimate de credito de **dentro** del command `execute` del Model Lab (`packages/domain/src/model-lab.ts:282`, `deps.runner.estimate(...)`) a un **reader gobernado, read-only e idempotente** que computa `costo = f(ruta × output-shape)` y lo devuelve **antes de gastar** — el `✨N` que el boton Generate del Producer (TASK-1505) muestra sobre una tupla `(ruta, output-shape)` prospectiva, sin crear experimento, sin reservar credito y sin transicionar estado. La unidad de credito es **ruta × output-shape, nunca el modelo**. Es un **slice adelantado de TASK-1469** (expone solo el estimate como preview, apoyado en el spend fence de seguridad interno; no duplica el run lifecycle completo ni el ledger comercial de TASK-1468, diferido).

## Why This Task Exists

Hoy el estimate solo es alcanzable **por dentro de un experimento persistido y a medio ejecutar**. `executeExperiment` (`model-lab.ts:266`) exige un `StoredExperimentV1` (`requireOwnedExperiment`), llama `deps.runner.estimate({ experiment: stored, correlationId })` en la linea 282 y **acto seguido** transiciona `prepared → estimated` y avanza hacia `reserve`/`run`. No existe forma de previsualizar el costo de una tupla `(ruta, output-shape)` prospectiva sin (a) preparar un experimento y (b) empezar a ejecutarlo — es decir, sin mutar estado y encaminar hacia el gasto.

El Producer (spec `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`, chassis primitivo #4 "Estimate inline `✨N` pre-spend") necesita ese numero **antes** de que el operador haga click en Generate. El bucle es `prompt (+refs) → ruta → shape → Generate (costo visible)`: el costo visible es un **preview de la tupla prospectiva**, no el subproducto de haber empezado a gastar.

Ademas, la unidad economica hoy esta mal dimensionada para el contrato del Producer: el fake keyea el costo por **capability** (`FAKE_CREDITS[request.capability]` en `apps/creative-runner/src/index.ts:59`), no por `ruta × output-shape`. La spec fuente lo declara invariante: *"La unidad de credito es `ruta × output-shape`, nunca el modelo; un fallback nunca convierte provider/modelo en unidad de credito"*. El estimate previewable es donde ese contrato se hace visible y verificable.

El seam del runner ya deja el trabajo hecho: `LabRunner.estimate` (`apps/creative-runner/src/index.ts:120`) documenta *"Estimate is a pure pricing lookup — it never needs the bytes, so inputs are not resolved here (only in run())"*. El estimate ya es puro; lo unico que falta es **desacoplarlo del experimento persistido** para exponerlo como lectura previa.

## Goal

- Un reader gobernado `globe.lab.experiment.estimate` que, dada una tupla prospectiva `(capability, referenceRoute, output-shape)` (mas hashes de referencias para forma/conteo, nunca bytes) devuelve el estimate de credito **sin** crear experimento, **sin** reservar credito y **sin** transicionar estado.
- El estimate se computa como `f(ruta × output-shape)`, validado contra los constraints del catalogo (TASK-1500) para la ruta seleccionada, **fail-closed pre-spend** (shape fuera de constraints → `invalid_request`), reutilizando el validador discriminado de TASK-1501.
- Un **unico camino de estimate** compartido: el reader y el command `execute` llaman la misma `LabRunnerPort.estimate`, ahora tomando un `LabQuoteInputV1` prospectivo (no un `StoredExperimentV1`). Extraer el estimate de dentro de `execute` sin duplicar logica ni el run lifecycle.
- Proyeccion de salida con **naming dual**: la vista curada (superficie cliente) expone `✨N` + la ruta de fidelidad, **nunca** slug de proveedor, costo vendor ni margen (la vista modelo-real vive en el catalogo de TASK-1500).
- Full API Parity por nacimiento: reader transport-neutral + coverage matrix (`ui`/`mcp` `policy-blocked` hasta gate; `http`/`sdk`/`cli`/`worker`/`e2e` `available`), metodo SDK tipado y conformance manifest-driven.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — la spec fuente. Esta task implementa la fila **N3 (TASK-1502, Previewable Estimate reader)** de la tabla "primitivos → tasks". Cargar §"El modelo del Producer" (chassis #4), §"Boundary / invariantes" y §"Hard rules".
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` — el Model Lab es el patron trabajado (capability con estado + provider seam + spend fence + kill switch).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (TASK-1481) — Full API Parity por nacimiento, coverage matrix, trusted context, dispatch transport-neutral, error codes canonicos.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el reader es el primitive; UI/Nexa/MCP son consumers.
- La skill `greenhouse-globe` (`.claude/skills/greenhouse-globe/SKILL.md`) — boundary, provider seam sagrado, patron de agregar una capability, convenciones del monorepo (`node --test`, extensiones `.js`/`.ts`, `exactOptionalPropertyTypes`).

Reglas obligatorias (repetidas de la spec fuente y la skill, load-bearing aqui):

- **Boundary duro.** El CODIGO vive en `efeonce-globe`; **Greenhouse gobierna lifecycle/docs/evidencia** de la task. No se crea un segundo registry/namespace de tasks en Globe.
- **Provider seam sagrado.** El estimate se computa **detras del `CreativeProviderAdapter`** via `LabRunnerPort.estimate` → `adapter.estimate(...)`. **NUNCA** un SDK de proveedor directo desde el reader/dominio/UI/MCP/CLI/tests.
- **Read-only, idempotente, pre-spend.** El reader **NO** crea experimento, **NO** llama `fence.reserve`, **NO** ejecuta `store.create`/`store.update` ni `transition(...)`. Misma query → mismo `estimatedCredits` (modulo el timestamp de expiracion). Es un quote puro.
- **Unidad de credito = `ruta × output-shape`, nunca el modelo.** El estimate se computa de esa dimension; un fallback nunca convierte provider/modelo en unidad de credito.
- **Contrato discriminado fail-closed.** Un output-shape fuera de los constraints de la ruta (30s en un modelo que topa en 10s; 4K en uno que topa en 720p) rechaza **antes** de devolver el estimate, con `invalid_request` (reutiliza el validador de TASK-1501).
- **Naming dual.** El slug del proveedor vive solo en el adapter. La proyeccion curada del preview **nunca** revela slug, costo vendor ni margen; expone `✨N` + la ruta de fidelidad.
- **Private-ingest / sin bytes.** El estimate **nunca** resuelve bytes de referencia (la doc del runner lo confirma: el estimate no necesita bytes). La query lleva referencias como `hash` (para forma/conteo), jamas bytes crudos. Un preview no puede filtrar la existencia de un asset cross-workspace porque nunca toca bytes.
- **Kill switch fail-closed.** Con `GLOBE_LAB_ENABLED=false` el reader hace `assertLabEnabled` y devuelve `policy_blocked` (apagado = negado, no roto).
- **Coverage.** `ui`/`mcp` nacen `policy-blocked`; `http`/`sdk`/`cli`/`worker`/`e2e` `available`; `sister-platform` `not-applicable` (patron `LAB_COVERAGE`).

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md` — patron "capability que consume otra" via helper de dominio (nunca re-dispatch por el registry). El reader y `execute` comparten `LabRunnerPort.estimate` por el mismo principio.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` — el programa que gobierna el cluster.

## Dependencies & Impact

### Depends on

- **TASK-1500 — Governed Route/Model Catalog** (`efeonce-globe`, sibling del cluster): provee, por ruta, los **constraints** (opciones/limites de resolucion, duracion, sampleRate, formato, count) que el reader usa para validar el output-shape, y el **naming dual** (fidelidad-curada vs modelo-real) que la proyeccion respeta. `[verificar contra TASK-1500]` el nombre exacto del reader/tipo del catalogo (p.ej. `GLOBE_ROUTE_CATALOG_READER` / `RouteConstraintsV1`).
- **TASK-1501 — Modality-Discriminated Run Contract** (`efeonce-globe`, sibling del cluster): provee el **output-shape discriminado por capability** (image `{quality, aspectRatio, count}` / video `{resolution, duration, aspectRatio, audioMode, inputMode}` / audio `{sampleRate, format, speed, volume, pitch, mode, voicePreset}`) y su **validador contra constraints, fail-closed pre-spend**. El reader **reutiliza** ese validador; no reimplementa la validacion de shape. `[verificar contra TASK-1501]` el nombre exacto del tipo output-shape (p.ej. `RunOutputShapeV1`) y de su validador.
- **Confirmado en runtime** (`efeonce-globe`, verificado 2026-07-20):
  - `packages/domain/src/model-lab.ts` — `executeExperiment` (linea 266), `deps.runner.estimate(...)` (linea 282), `LabRunnerPort` (linea 96), `LabRouteEstimateV1` (linea 82), `registerModelLabCapabilities` (linea 136), `GLOBE_LAB_READERS` wiring (lineas 173-217), `assertLabEnabled`/kill switch (linea 529), `InvalidExperimentRequestError → invalid_request` (linea 615).
  - `packages/contracts/src/index.ts` — `GLOBE_LAB_READERS` (linea 225), `PrepareExperimentPayloadV1` (linea 316), `LabExperimentV1` (linea 405), `GLOBE_LAB_EXPERIMENT_CAPABILITY` (linea 215), coverage/surfaces (`GLOBE_SURFACES`, `SurfaceCoverageState`).
  - `apps/creative-runner/src/index.ts` — `LabRunner.estimate` (linea 120, "pure pricing lookup, never needs bytes"), `FakeReferenceAdapter.estimate` (linea 53), `toProviderRequest` (linea 260), `FAKE_CREDITS` keyed por capability (linea 21) — el placeholder que esta task contractualiza como `ruta × shape`.
  - `packages/provider-contract/src/index.ts` — `CreativeProviderRequestV1`, `ProviderEstimate` (`{ provider, route, model, modelVersion, estimatedCredits, estimatedDurationSeconds, expiresAt }`), `CreativeProviderAdapter.estimate`.
  - `packages/domain/src/spend-fence.ts` — `LabSpendFence.dayCommittedCredits(workspaceId)` (linea 84, "Observability only") para el `withinDayCap` opcional (read-only).

### Blocks / Impacts

- **TASK-1505 — Producer Surface (UI):** consume el reader para el `✨N` inline del boton Generate y para el estado "sobre presupuesto".
- **TASK-1474 — Professional Studio Workbench:** consume el mismo estimate previewable en su paso de estimate/aprobacion.
- **TASK-1469 — Governed Run Lifecycle and Submission Fence:** esta task es un **slice adelantado** de 1469. Cuando 1469 aterrice, consume este mismo `LabRunnerPort.estimate` / reader como el paso de estimate de su lifecycle durable — no lo reimplementa.
- **TASK-1468 — Studio Credits Shadow Ledger:** diferido. El `✨N` sale del estimate + spend fence de seguridad, **no** del ledger comercial durable.

### Files owned

- `efeonce-globe/packages/contracts/src/index.ts` — `GLOBE_LAB_READERS.estimate`, `LabQuoteInputV1`, `EstimateExperimentQueryV1`, `LabEstimatePreviewV1`.
- `efeonce-globe/packages/domain/src/model-lab.ts` — registro del reader `estimate`, `LabRunnerPort.estimate` refactor (input `{ quote }`), derivacion `quoteInputFromStored` en `executeExperiment`, `LabRouteEstimateV1` (+`estimatedDurationSeconds?`), proyeccion curada.
- `efeonce-globe/packages/domain/src/model-lab.test.ts` — cobertura del reader.
- `efeonce-globe/apps/creative-runner/src/index.ts` — `LabRunner.estimate` toma `{ quote }`; `toProviderRequest` acepta el quote input.
- `efeonce-globe/apps/creative-runner/src/index.test.ts` — cobertura del quote.
- `efeonce-globe/packages/sdk/src/index.ts` — metodo SDK tipado del reader.
- `docs/tasks/**` (Greenhouse) — lifecycle/cierre documental.

## Current Repo State

### Already exists

- El estimate seam completo, pero **acoplado a un experimento persistido**: `LabRunnerPort.estimate({ experiment: StoredExperimentV1; correlationId })` → `adapter.estimate(toProviderRequest(experiment))` → `ProviderEstimate`. Devuelve `LabRouteEstimateV1 = { provider, route, model, modelVersion, estimatedCredits }`.
- El estimate ya es **puro** (no toca bytes, no reserva): documentado en `LabRunner.estimate` (`apps/creative-runner/src/index.ts:120`).
- La state machine `prepared → estimated → reserved → running → candidate_ready|failed|cancelled` y el kill switch `assertLabEnabled` (default OFF) ya montados.
- El patron de reader gobernado: `GLOBE_LAB_READERS.{get,status,evidence}` registrados en `registerModelLabCapabilities` con `LAB_COVERAGE` y `requiredCapability: GLOBE_LAB_EXPERIMENT_CAPABILITY`.
- El spend fence de seguridad con `dayCommittedCredits(workspaceId)` (observabilidad, read-only).

### Gap

- No hay forma de obtener el estimate **sin** un `StoredExperimentV1` y **sin** empezar `executeExperiment` (que transiciona estado hacia el gasto). El `✨N` pre-spend es inalcanzable.
- El `LabRunnerPort.estimate` toma `{ experiment }`, no una tupla prospectiva; el estimate no esta extraido de dentro de `execute`.
- El costo del fake se keyea por **capability**, no por `ruta × output-shape` — la unidad economica del Producer aun no esta contractualizada como `ruta × shape` (dependencia de TASK-1501 para plumbing del shape en `CreativeProviderRequestV1`; esta task lo consume en el estimate).
- No hay proyeccion curada del estimate con naming dual: `LabRouteEstimateV1` carga `provider` y `model` (slug/modelo-real), que la superficie cliente **no** debe ver.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/domain`, `packages/sdk`, `apps/creative-runner`) — TS nativo Node 24, monorepo pnpm, gobernado por Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: reader canonico `globe.lab.experiment.estimate` (transport-neutral, sobre el `CapabilityRegistry` del spine) + `LabRunnerPort.estimate` como unico punto de computo del estimate (compartido por el reader y `execute`). Consumers autorizados: UI (TASK-1505) + Workbench (TASK-1474) + Nexa/MCP (`policy-blocked` hasta gate) + el propio `execute` del Model Lab. Provider siempre detras del `CreativeProviderAdapter`.
- Server/browser split: server-only. El reader corre en el dominio de Globe; provider/adapter/fence nunca en el browser. La UI (1505) consume el reader por la surface `http` via SDK.
- Build impact: `none` — no agrega dependencias pesadas ni filesystem input; reutiliza el seam existente.
- Extraction blocker: `provider constraint` — el computo del estimate depende del `CreativeProviderAdapter`/runner (seam de proveedor) y del catalogo (TASK-1500); no es un reader deployable de forma independiente del runner de Globe. Sin crear `apps/*`/`packages/*` nuevos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: el camino de estimate del Model Lab — `LabRunnerPort.estimate` (`packages/domain/src/model-lab.ts`) + su impl `LabRunner.estimate` (`apps/creative-runner/src/index.ts`), ahora tambien expuesto como reader `globe.lab.experiment.estimate`.
- Consumidores afectados: `UI` (TASK-1505), `sister-platform`/Workbench (TASK-1474), `MCP`/Nexa (`policy-blocked`), el command `execute` del propio Lab.
- Runtime target: `worker` (creative-runner) + `staging` (studio-web internal). Fake por default (`GLOBE_LAB_PROVIDER=fake`), gasto cero.

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/index.ts` (`GLOBE_LAB_READERS`, `ReaderRequestEnvelopeV1`/`ReaderResultV1`, `SurfaceCoverageState`, `GLOBE_LAB_EXPERIMENT_CAPABILITY`); `LabRunnerPort` / `LabRouteEstimateV1` en `model-lab.ts`; `CreativeProviderAdapter.estimate` / `ProviderEstimate` en `provider-contract`.
- Contrato nuevo o modificado:
  - **Nuevo reader** `GLOBE_LAB_READERS.estimate = 'globe.lab.experiment.estimate'`, gobernado por `GLOBE_LAB_EXPERIMENT_CAPABILITY`, `LAB_COVERAGE`.
  - **Nuevo tipo query** `EstimateExperimentQueryV1 = { capability, referenceRoute, outputShape (discriminado de TASK-1501), referenceHashes?: readonly LabAuthorizedInputV1[], hardCapCredits? }`.
  - **Nuevo tipo transporte** `LabQuoteInputV1 = { capability, route, outputShape, inputHashes: readonly string[], hardCapCredits? }` — el input prospectivo (no persistido) de `LabRunnerPort.estimate`.
  - **Refactor** `LabRunnerPort.estimate(input: { quote: LabQuoteInputV1; correlationId: string })` (era `{ experiment: StoredExperimentV1; correlationId }`). `executeExperiment` deriva el quote de su `StoredExperimentV1` (`quoteInputFromStored`) y llama el mismo metodo.
  - **Nueva proyeccion** `LabEstimatePreviewV1 = { schemaVersion, capability, referenceRoute, estimatedCredits, estimatedDurationSeconds?, withinHardCap?, withinDayCap?, estimateExpiresAt? }` — curada, **sin** `provider`/`model`/costo vendor/margen.
  - **Aditivo** `LabRouteEstimateV1.estimatedDurationSeconds?` (surface del `ProviderEstimate`, hoy descartado).
- Backward compatibility: `gated` (nuevo reader + coverage `policy-blocked` en `ui`/`mcp`). El refactor de `LabRunnerPort.estimate` es interno al dominio+runner (mismo commit/PR, sin superficie publica de la firma del port): `compatible` para el contrato externo, cambio de firma interno cubierto por tests.
- Full API parity: el estimate es un **reader canonico server-side**; la UI (1505) y Nexa/MCP lo consumen por el mismo reader, cero logica de estimate duplicada por consumer. Ver §"Capability Definition of Done" abajo.

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna** — read-only, sin persistencia. El reader **no** crea/muta `StoredExperimentV1`, **no** escribe en el store, **no** toca el fence (salvo `dayCommittedCredits`, observabilidad read-only).
- Invariantes que no se pueden romper:
  - **Unidad de credito = `ruta × output-shape`, nunca el modelo.** Un fallback jamas convierte provider/modelo en la unidad de credito.
  - **Read-only / idempotente.** Sin `store.create`/`store.update`, sin `fence.reserve`/`settle`/`release`, sin `transition(...)`. Misma query → mismos `estimatedCredits`.
  - **Fail-closed pre-spend.** Output-shape fuera de constraints de la ruta → `invalid_request` antes de devolver estimate (reutiliza validador de TASK-1501). Kill switch OFF → `policy_blocked`.
  - **Naming dual.** La proyeccion curada nunca expone slug de proveedor, costo vendor ni margen (drop de `provider`/`model` de `LabRouteEstimateV1`).
  - **Sin bytes.** El estimate nunca resuelve bytes de referencia; referencias por hash solo.
- Tenant/space boundary: `context.workspaceId` derivado server-side por `deriveTrustedContext` (el reader recibe `TrustedCommandContextV1`, branded). El preview es prospectivo (no referencia un asset persistido), asi que no hay lookup cross-workspace; `dayCommittedCredits` se lee **solo** para el `workspaceId` del caller.
- Idempotency/concurrency: reader puro, sin idempotencyKey (los readers no lo llevan). Sin locks ni transacciones. Concurrencia trivial (no muta estado compartido).
- Audit/outbox/history: `none` — un read-only preview no emite evento; el `correlationId` atraviesa request → trusted context → result para trazabilidad. El gasto real (y su audit) sigue ocurriendo solo en `execute`.

### Migration, backfill and rollout

- Migration posture: `none` (Globe no comparte DB con Greenhouse; sin schema PG). Cambio puramente de contrato + dominio + runner.
- Default state: `flag OFF` — `GLOBE_LAB_ENABLED` default OFF (kill switch) y `GLOBE_LAB_PROVIDER=fake` (gasto cero); coverage `ui`/`mcp` `policy-blocked`.
- Backfill plan: `N/A` — sin datos.
- Rollback path: `revert PR` + coverage a `policy-blocked` / kill switch OFF. Reversible inmediato.
- External coordination: `N/A — repo-only change` (efeonce-globe). No requiere rotar secretos, subscripciones ni sign-off externo; el fake no gasta.

### Security and access

- Auth/access gate: `capability` — `GLOBE_LAB_EXPERIMENT_CAPABILITY` via `#authorize` del registry (coverage de surface → `trustedContextHasCapability` → fail-closed). En `web` mode el humano no lleva la capability del Lab (coherente con `ui: policy-blocked`); el Lab opera por `api` mode (service principal).
- Sensitive data posture: `no sensitive data` en la salida curada — **explicitamente** sin costo vendor ni margen (naming dual). Sin PII, sin bytes.
- Error contract: `canonical error codes` — `InvalidExperimentRequestError → invalid_request` (shape fuera de constraints / ruta/capability desconocida); `surface_policy_blocked → policy_blocked` (kill switch OFF); nunca prosa cruda ni detalle de proveedor al cliente.
- Abuse/rate-limit posture: `none with rationale` — reader read-only, hermetico con el fake (cero I/O de red, cero gasto). Con provider real, `estimate` sigue siendo el metodo **no facturable** del adapter (solo `submit` factura); el fence y la aprobacion humana gobiernan el gasto real en `execute`. Rate-limit fino se hereda del perimetro Cloud Run / gate de promocion.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (= `pnpm typecheck && pnpm test`, `node --test` en todos los packages/apps) + `pnpm build`. Tests nuevos en `packages/domain/src/model-lab.test.ts` y `apps/creative-runner/src/index.test.ts`.
- DB/runtime checks: `N/A` — sin DB.
- Integration checks: reader ejercitado por el harness conformance manifest-driven (coverage declarado). Smoke opcional por SDK contra `studio-web` internal en staging (`GLOBE_LAB_PROVIDER=fake`), verificando `✨N` sin creacion de experimento.
- Reliability signals/logs: `correlationId` en el `ReaderResultV1`. Sin signal nuevo (read-only, hermetico).
- Production verification sequence: `N/A con rationale` — cambio aditivo gated; el fake no gasta; la promocion de `ui`/`mcp` a `available` es un gate separado (fuera de scope de esta task).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths/objetos reales (`globe.lab.experiment.estimate`, `LabRunnerPort.estimate`, `LabEstimatePreviewV1`).
- [ ] Data invariants (read-only/idempotente, unidad = ruta×shape, naming dual, sin bytes), tenant boundary (`context.workspaceId`) y postura de idempotencia explicitas.
- [ ] Migration/backfill/rollback posture explicita y proporcional (none / revert PR + flag).
- [ ] Evidencia runtime listada (`pnpm check && pnpm build`, tests `node --test`, conformance).
- [ ] Salida curada sin leaks (sin slug/provider-cost/margen/bytes); errores canonicos (`invalid_request`, `policy_blocked`).

## Capability Definition of Done — Full API Parity gate

Aplica: introduce una **capability nueva** (reader gobernado de estimate).

- [ ] **Logica en el primitive, no en la UI.** El estimate vive en `packages/domain` + `apps/creative-runner` (dominio/runner), no en la UI (1505).
- [ ] **Modelada como reader/recurso, no como click-handler:** `globe.lab.experiment.estimate`, transport-neutral, sobre el `CapabilityRegistry`.
- [ ] **Read** expuesto como reader canonico con authorization fina (`GLOBE_LAB_EXPERIMENT_CAPABILITY`, no admin-coarse), errores canonicos sanitizados y `correlationId`. **Sin write** (es read-only por diseno).
- [ ] **Capability + coverage en el MISMO PR:** el reader nace con `LAB_COVERAGE` (declara las 8 surfaces; omitir una es error de compilacion) y la `requiredCapability` ya grantada al service principal del Lab.
- [ ] **Camino programatico declarado:** surface `http` (`available`) + metodo SDK tipado; `mcp` `policy-blocked` hasta gate.
- [ ] **Un primitive, muchos consumers:** UI (1505), Workbench (1474), Nexa/MCP, y el `execute` del Lab consumen el **mismo** `LabRunnerPort.estimate` — cero logica de estimate duplicada.
- [ ] **Parity check = SI:** el estimate tiene contrato gobernado a nivel capability; todos los consumers lo operan por construccion. (Los writes de gasto real siguen en `execute` con su fence + aprobacion; el reader no muta.)

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

### Slice 1 — Quote input + extraccion del estimate de dentro de `execute`

- En `packages/contracts`: agregar `LabQuoteInputV1 = { capability: CreativeCapability; route: string; outputShape: <output-shape discriminado de TASK-1501>; inputHashes: readonly string[]; hardCapCredits?: number }` (transport-neutral, prospectivo, no persistido). `[verificar contra TASK-1501]` el simbolo exacto del output-shape.
- En `packages/domain/src/model-lab.ts`: refactorizar `LabRunnerPort.estimate` para tomar `{ quote: LabQuoteInputV1; correlationId: string }` en vez de `{ experiment: StoredExperimentV1; correlationId }`. Agregar `LabRouteEstimateV1.estimatedDurationSeconds?` (aditivo).
- Agregar `quoteInputFromStored(stored: StoredExperimentV1): LabQuoteInputV1` y usarlo en `executeExperiment` (linea ~282): `const estimate = await deps.runner.estimate({ quote: quoteInputFromStored(stored), correlationId })`. El resto del lifecycle de `execute` (transicion `estimated`, `reserve`, `run`, `settle`) queda **intacto**.
- En `apps/creative-runner/src/index.ts`: `LabRunner.estimate({ quote })` construye el `CreativeProviderRequestV1` desde el quote (con el output-shape plumbeado por TASK-1501) y llama `adapter.estimate(...)`. `toProviderRequest` acepta el quote input (o un overload dedicado `toProviderRequestFromQuote`).
- Actualizar `model-lab.test.ts` + `index.test.ts` (dobles): `execute` produce el mismo estimate por el camino nuevo; sin regresion en la state machine.

### Slice 2 — Reader `globe.lab.experiment.estimate` + validacion fail-closed + proyeccion curada

- En `packages/contracts`: `GLOBE_LAB_READERS.estimate = 'globe.lab.experiment.estimate'`; `EstimateExperimentQueryV1` (capability + referenceRoute + outputShape + referenceHashes? + hardCapCredits?); `LabEstimatePreviewV1` (curada; ✨N + ruta de fidelidad + duracion/withinHardCap/withinDayCap/expiracion opcionales; **sin** provider/model/costo/margen).
- En `packages/domain/src/model-lab.ts`: registrar el reader en `registerModelLabCapabilities` con `descriptor { capability: GLOBE_LAB_READERS.estimate, kind: 'reader', summary, coverage: LAB_COVERAGE }`, `requiredCapability: GLOBE_LAB_EXPERIMENT_CAPABILITY`, handler:
  1. `assertLabEnabled(deps)` (kill switch → `policy_blocked`).
  2. Validar `capability` conocida + `referenceRoute` no vacia; **validar `outputShape` contra los constraints del catalogo (TASK-1500) para esa ruta**, reutilizando el validador discriminado de TASK-1501 → fail-closed `InvalidExperimentRequestError` (→ `invalid_request`). `[verificar contra TASK-1500/1501]` el simbolo del validador/constraints.
  3. `quote = toQuoteInput(query)` (referencias como hashes, nunca bytes).
  4. `estimate = deps.runner.estimate({ quote, correlationId: context.correlationId })` — **mismo** camino que `execute`. **Sin** `store.*`, **sin** `fence.reserve`, **sin** `transition`.
  5. Proyectar a `LabEstimatePreviewV1`: `estimatedCredits` (✨N), `referenceRoute` (= `estimate.route`, contrato de fidelidad), `estimatedDurationSeconds?`; `withinHardCap = query.hardCapCredits === undefined ? undefined : estimate.estimatedCredits <= query.hardCapCredits`; `withinDayCap?` desde `deps.fence.dayCommittedCredits(context.workspaceId)` (read-only, si el fence lo expone por el port). **Drop** `provider`/`model`.
- Errores canonicos + tests: valido → credits; over-cap (credits > hardCap) → devuelve estimate con `withinHardCap:false` (preview honesto, no rechaza); shape fuera de constraints → `invalid_request`; ruta/capability desconocida → `invalid_request`; lab OFF → `policy_blocked`; idempotencia (misma query 2x → mismos credits); **naming dual** (assert que la proyeccion NO trae `provider`/`model`/costo/margen).

### Slice 3 — Metodo SDK tipado + conformance + gate

- En `packages/sdk`: metodo tipado del reader (o reuso de `dispatchReader` del `GlobeClient`) que devuelve `ReaderResultV1<LabEstimatePreviewV1>`.
- Verificar que el harness conformance manifest-driven ejercita el reader (coverage declarado; sin backdoor que llame al provider/handler saltandose el spine).
- Gate de cierre: `cd ../efeonce-globe && pnpm check && pnpm build` verde.

## Out of Scope

- El **run lifecycle completo** (aprobacion humana, submission fence durable, settle comercial): eso es TASK-1469. Esta task expone **solo** el estimate como preview read-only.
- El **ledger comercial durable** (TASK-1468): diferido. El `✨N` sale del estimate + spend fence de seguridad interno.
- El **catalogo de rutas + constraints + naming dual** (TASK-1500) y el **contrato discriminado + validador de shape** (TASK-1501): dependencias, no scope; el reader los **consume**.
- La **UI del Producer** (TASK-1505): el reader no renderiza nada.
- **Promocion de `ui`/`mcp` a `available`:** gate separado, fuera de scope. Nacen `policy-blocked`.
- **Estimate shape-aware real** en el `FakeReferenceAdapter`: el fake puede seguir devolviendo un numero estable; el **contrato** (unidad = ruta×shape) es lo que esta task fija. La variacion real por shape la entregan los adapters reales (Vertex/Fal) que ya reciben el shape via TASK-1501 (documentar como limitacion conocida del fake).

## Detailed Spec

### El camino del estimate — antes vs despues

**Antes (acoplado a experimento persistido, encaminado al gasto):**

```
executeExperiment(context, { experimentId })
  stored   = requireOwnedExperiment(...)            // exige StoredExperimentV1
  estimate = runner.estimate({ experiment: stored, correlationId })   // model-lab.ts:282
  transition 'estimated' -> reserve -> run -> settle                  // ya encaminado a gastar
```
El estimate solo existe adentro de un experimento a medio ejecutar. No hay `✨N` pre-spend.

**Despues (estimate extraido a un quote prospectivo, alcanzable read-only):**

```
// Unico computo de estimate, compartido:
LabRunnerPort.estimate({ quote: LabQuoteInputV1, correlationId })
  -> adapter.estimate(toProviderRequestFromQuote(quote))   // pure pricing lookup, sin bytes, sin gasto

// Reader (read-only, ANTES de gastar):
globe.lab.experiment.estimate(context, query)
  -> assertLabEnabled                                        // kill switch
  -> validar outputShape vs constraints(ruta) [TASK-1500/1501]  // fail-closed invalid_request
  -> quote    = toQuoteInput(query)                          // referencias por hash, nunca bytes
  -> estimate = runner.estimate({ quote, correlationId })    // MISMO camino que execute
  -> LabEstimatePreviewV1 (curada: ✨N + ruta fidelidad + withinHardCap/withinDayCap)
  //  NO store.create · NO fence.reserve · NO transition

// execute deriva el MISMO quote de su experimento persistido:
executeExperiment(...)
  -> quote    = quoteInputFromStored(stored)
  -> estimate = runner.estimate({ quote, correlationId })    // logica identica, no duplicada
  -> reserve -> run -> settle                                // lifecycle intacto
```

La extraccion es la clave: el estimate deja de ser un subproducto de un experimento persistido y pasa a ser una **funcion pura de `(ruta, output-shape)`** alcanzable como lectura previa — sin dejar de ser el mismo estimate que `execute` usa.

### Naming dual — que se expone y que no

`LabRouteEstimateV1` (interno) carga `{ provider, route, model, modelVersion, estimatedCredits }`. La proyeccion **curada** `LabEstimatePreviewV1`:

| Campo | Curada (cliente) | Razon |
|---|---|---|
| `estimatedCredits` (`✨N`) | SI | la unidad de credito visible |
| `referenceRoute` (contrato de fidelidad, = `estimate.route`) | SI | ruta de fidelidad, no slug |
| `estimatedDurationSeconds?` | SI | forma del output, no vendor |
| `withinHardCap?` / `withinDayCap?` | SI | senal de presupuesto, read-only |
| `provider` | **NO** | slug/vendor confidencial |
| `model` / `modelVersion` (slug modelo-real) | **NO** | naming dual: el slug vive en el adapter; la vista modelo-real la resuelve el catalogo TASK-1500 |
| costo vendor / margen | **NO** | invariante de la spec fuente |

La vista **modelo-real** (para operadores internos) NO se agrega aqui: se resuelve por el **catalogo (TASK-1500)** keyeado por ruta, para mantener el naming dual en un solo lugar. El reader de estimate es curado-only por default seguro.

### Fail-closed vs senal de presupuesto (distincion load-bearing)

Dos cosas distintas, no confundir:

- **Output-shape fuera de los constraints de la ruta** (30s en un modelo que topa en 10s; 4K en 720p) → **`invalid_request`** (rechazo fail-closed, mismo contrato que TASK-1501). El shape es invalido para la ruta.
- **`estimatedCredits` vs el `hardCapCredits` declarado o el day-cap del workspace** → **no** es error: es una **senal de presupuesto**. El preview **devuelve** el estimate + `withinHardCap`/`withinDayCap` para que la UI muestre "esto excederia tu tope" **sin** reservar. Un preview dice la verdad; no gasta ni bloquea.

### Idempotencia y ausencia de efectos

El reader es read-only: no `store.create`/`update`, no `fence.reserve`/`settle`/`release`, no `transition(...)`. La unica lectura del fence es `dayCommittedCredits(workspaceId)` (observabilidad). Misma query → mismos `estimatedCredits` (el `estimateExpiresAt` puede variar con el reloj; los credits no). Esto habilita que la UI llame el reader en cada cambio de shape sin efectos colaterales.

## Rollout Plan & Risk Matrix

Cambio aditivo, gobernado por kill switch (`GLOBE_LAB_ENABLED` default OFF) + provider fake (gasto cero) + coverage `policy-blocked` en `ui`/`mcp`. Plantilla proporcional (no SCIM/payroll).

### Slice ordering hard rule

- Slice 1 (quote input + extraccion del estimate de `execute`) → Slice 2 (reader + validacion + proyeccion) → Slice 3 (SDK + conformance).
- Slice 2 **depende** de Slice 1: el reader llama `LabRunnerPort.estimate({ quote })`, que solo existe tras el refactor de Slice 1.
- Slice 2 **depende** de que TASK-1500 (constraints del catalogo) y TASK-1501 (output-shape discriminado + validador) esten mergeadas (declarado en `Blocked by`). Sin ellas, la validacion de shape no tiene contra que validar — no arrancar Slice 2 antes.
- Ningun slice reintroduce `store.*`/`fence.reserve`/`transition` en el reader (violaria read-only).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El refactor de `LabRunnerPort.estimate` rompe el estimate dentro de `execute` (regresion de state machine) | worker / domain | medium | `execute` deriva el quote de su stored y llama el mismo metodo; test que compara estimate viejo vs nuevo; `pnpm check` verde | fallo en `model-lab.test.ts` (state machine / estimate) |
| La proyeccion filtra slug/provider-cost/margen (leak de naming dual) | UI / cliente | medium | proyeccion curada dropea `provider`/`model`; test que asserta que la salida NO contiene esos campos | assert de naming-dual en `model-lab.test.ts` |
| El reader adquiere un efecto (reserva/transiciona) por copiar de `execute` | domain / fence | low | contrato read-only explicito; test que verifica que store y fence no reciben write (dobles con spies) | spy sobre `store`/`fence` en el test del reader |
| Estimate del fake no varia por shape → el `✨N` parece "constante" | UX / evidencia | low | documentar como limitacion conocida del fake; el contrato (unidad=ruta×shape) es lo que se fija; adapters reales (TASK-1486/1487) varian por shape via TASK-1501 | revision manual del preview con distintos shapes en el fake |
| Deriva del simbolo del output-shape/validador de TASK-1500/1501 | contracts | medium | marcado `[verificar]`; el agente confirma los simbolos reales al tomar la task antes de codificar | fallo de typecheck al importar el tipo/validador |

### Feature flags / cutover

- `GLOBE_LAB_ENABLED` (env, default **OFF**): kill switch heredado. Reader OFF ⇒ `policy_blocked`.
- `GLOBE_LAB_PROVIDER` (env, default **`fake`**): estimate hermetico / gasto cero por default. Prender un motor real (`vertex`/`fal`/`composite`) es decision explicita de env; el `estimate` sigue siendo el metodo **no facturable** del adapter.
- Coverage `ui`/`mcp` `policy-blocked` (declarado, apagado, gobernado). Promocion a `available` = gate separado, fuera de scope.
- Cutover: aditivo, inmediato tras merge (no muta estado ni datos existentes).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (refactor interno del port + quote input) | <10 min | si |
| Slice 2 | revert PR o coverage del reader a `policy-blocked` / kill switch OFF | <5 min | si |
| Slice 3 | revert PR (SDK method aditivo) | <5 min | si |

### Production verification sequence

`N/A con rationale` — cambio aditivo gated; el reader es read-only y hermetico con el fake (cero gasto). La verificacion es `pnpm check && pnpm build` verde + tests `node --test` + conformance. La promocion de `ui`/`mcp` (que expondria el reader a superficies externas) es un gate separado con su propia secuencia.

### Out-of-band coordination required

`N/A — repo-only change` en `efeonce-globe`. No requiere rotar secretos, subscripciones ni sign-off externo (el fake no gasta; el reader no factura).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el reader gobernado `globe.lab.experiment.estimate` (`GLOBE_LAB_READERS.estimate`), registrado en `registerModelLabCapabilities` con `requiredCapability: GLOBE_LAB_EXPERIMENT_CAPABILITY` y coverage `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`, `http`/`sdk`/`cli`/`worker`/`e2e` `available`, `sister-platform` `not-applicable`).
- [ ] El reader devuelve `LabEstimatePreviewV1` con `estimatedCredits` (`✨N`) computado como `f(ruta × output-shape)` para una tupla **prospectiva**, **sin** crear experimento, **sin** `fence.reserve` y **sin** `transition` (verificado con spies sobre `store`/`fence` en test).
- [ ] `LabRunnerPort.estimate` toma `LabQuoteInputV1` (quote prospectivo) y es el **unico** computo de estimate; `executeExperiment` deriva el quote de su `StoredExperimentV1` y llama el mismo metodo (estimate identico al camino previo, sin regresion de state machine).
- [ ] Un output-shape fuera de los constraints de la ruta (TASK-1500) rechaza con `invalid_request` **antes** de devolver estimate, reutilizando el validador de TASK-1501; un `hardCapCredits` excedido **no** rechaza — devuelve el estimate con `withinHardCap:false`.
- [ ] La proyeccion curada **no** contiene `provider`, `model`/slug, costo vendor ni margen (test de naming dual que lo asserta).
- [ ] El estimate **nunca** resuelve bytes de referencia (referencias por hash solo); con kill switch OFF el reader devuelve `policy_blocked`.
- [ ] Metodo SDK tipado del reader; conformance manifest-driven lo ejercita sin backdoor.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verde.

## Verification

- `cd ../efeonce-globe && pnpm check` (`pnpm typecheck && pnpm test` — `node --test` en todos los packages/apps)
- `cd ../efeonce-globe && pnpm build`
- Tests focales nuevos en `packages/domain/src/model-lab.test.ts` (reader: valido / over-cap / shape fuera de constraints / ruta desconocida / lab OFF / idempotencia / naming dual / read-only spies) y `apps/creative-runner/src/index.test.ts` (quote input → estimate; sin bytes).
- Revision manual: el estimate del reader coincide con el estimate que `execute` computa para la misma tupla (mismo camino).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con lo implementado, verificado y pendientes
- [ ] `changelog.md` actualizado (cambio de contrato: nuevo reader + refactor del estimate port)
- [ ] chequeo de impacto cruzado ejecutado sobre TASK-1500, 1501, 1505, 1474, 1469, 1468
- [ ] cierre documental proporcional en Greenhouse (arquitectura Producer + funcional/manual si aplica), via `greenhouse-documentation-governor`; el codigo/evidencia tecnica quedan en `efeonce-globe`
- [ ] verificado que la proyeccion curada no filtra slug/provider-cost/margen y que el reader no muta estado

## Follow-ups

- **Delta a TASK-1469:** el estimate previewable queda entregado como slice adelantado; 1469 consume `LabRunnerPort.estimate` / `globe.lab.experiment.estimate` como su paso de estimate del run lifecycle durable, sin reimplementarlo.
- **Estimate shape-aware en el fake:** hacer que `FakeReferenceAdapter.estimate` varie el costo por output-shape (hoy estable por capability) para que el `✨N` del fake sea demostrable sin motor real. Baja prioridad; los adapters reales ya varian por shape.
- **Vista modelo-real del estimate (operadores internos):** si el operador Efeonce necesita ver el modelo-real junto al `✨N`, resolverlo por el catalogo (TASK-1500) keyeado por ruta, no agregando `model`/`provider` a esta proyeccion curada.
- **`withinDayCap` durable:** el fence es in-memory/per-process; cuando aterrice el ledger comercial (TASK-1468) / el fence durable, el `withinDayCap` debe leerse de la fuente durable.

## Delta YYYY-MM-DD

[Vacio al crear.]

## Open Questions

- El simbolo exacto del output-shape discriminado y su validador (TASK-1501) y de los constraints del catalogo (TASK-1500) quedan marcados `[verificar]`; el agente que tome la task los confirma contra el codigo real de esos siblings antes de codificar Slice 1/2.
- Umbral de batch-of-N (image 1-4; video/audio TBD, spec fuente Open Questions): el `count`/N del output-shape multiplica el `✨N`. La cota vive en los constraints del catalogo (TASK-1500); el reader solo la consume.
