# TASK-1498 — Globe Candidate Exploration Readers + Lineage Graph

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
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
- Status real: `Desplegada internal-only; feed hidrata outputs reales, pero visibilidad governance y escala siguen abiertas`
- Rank: `TBD`
- Domain: `creative|ai`
- Blocked by: `none`
- Branch: `task/TASK-1498-globe-candidate-exploration-lineage-graph`
- Legacy ID: `none`
- GitHub Issue: `none`

## Checkpoint 2026-07-23 — feed real y frontera pendiente

- Migraciones `0001…0023` están aplicadas. El feed hidrató nueve outputs usando identidad exacta
  `(experimentId, sha256)` y `attempts[].outputs`.
- No existe aún una política canónica que decida si el feed muestra assets `candidate_ready` mientras governance
  está pendiente/rejected. La proyección paginada debe incorporar esa decisión y evitar N+1.
- Previews siguen usando originales; derivados y streaming se resolverán por ADR/delta, no dentro de este reader.

## Summary

Los readers del Model Lab hoy son por un solo `experimentId` (`get`/`status`/`evidence`, `@efeonce-globe/contracts/src/index.ts:225-229`) y el linaje persistido sólo da **ancestros** (cadena oldest-first en el manifest de cada intento). Esta task agrega readers gobernados que (1) enumeran experimentos por workspace (el "dock de Candidatos"), (2) resuelven los **hijos/descendientes** de un experimento (índice inverso del linaje) y (3) proyectan el **grafo de exploración navegable** (ancestros + descendientes) que alimenta el "Mapa de exploración" del workbench. Todo read-only, tenant-safe y transport-neutral (Full API Parity), sin escrituras ni SDK de provider.

## Why This Task Exists

El workbench de TASK-1474 diseña dos superficies que el backend no puede alimentar: el **dock de candidatos** (ver todos los experimentos vivos de un workspace) y el **Mapa de exploración** (navegar el árbol padre→hijo de refinamientos). Ninguna existe:

- El `ExperimentStorePort` (`../efeonce-globe/packages/domain/src/model-lab.ts:60-63`) sólo expone `create`, `get(workspaceId, experimentId)` y `update`. No hay "list by workspace" ni consulta por padre.
- El único linaje persistido es `ExperimentAttemptManifestV1.lineage` (`../efeonce-globe/packages/contracts/src/index.ts:373-375`): la cadena de ancestros oldest-first que termina en el propio experimento. Da provenance hacia atrás, nunca hacia adelante (no hay forma de listar los hijos de un candidato).
- El parentesco directo vive en `PrepareExperimentPayloadV1.editFrom.experimentId` (`../efeonce-globe/packages/contracts/src/index.ts:322-324`) y en `LabEditSourceV1.parentExperimentId` (`../efeonce-globe/packages/domain/src/model-lab.ts:47`), pero nadie mantiene el índice inverso padre→hijos.

Sin estos readers el operador puede abrir un candidato conocido pero no puede descubrir qué otros existen ni cómo se ramificaron. La tesis "thin client sobre commands/readers existentes" de TASK-1474 no se sostiene para Candidatos ni para el Mapa hasta que estos readers existan.

## Goal

- Un reader `list` que enumere experimentos del workspace del caller, paginado y filtrable por estado/capability, sin filtrarse jamás a otro workspace.
- Un reader `children` (índice inverso del linaje) que devuelva los descendientes directos de un `experimentId`, y un reader de grafo que proyecte ancestros + descendientes como nodos/aristas navegables con profundidad acotada.
- Readers gobernados con Full API Parity: mismo contrato para HTTP/SDK/CLI/worker/e2e; `ui` consume por el bridge humano seguro de TASK-1519 y `mcp` permanece `policy-blocked`; kill switch fail-closed; cero lógica de negocio en el consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — fuente del gap (categoría ②).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — spine de contratos (TASK-1481).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` — dominio Model Lab + linaje.

Reglas obligatorias:

- **Boundary DURO:** el CÓDIGO vive en `efeonce-globe`; Greenhouse gobierna lifecycle, docs y evidencia. No se crea código de este dominio en `greenhouse-eo`.
- **El provider seam es sagrado:** estos readers no invocan ningún provider ni SDK; sólo proyectan registros ya almacenados. No tocar `apps/creative-runner/**` salvo lectura.
- **Read-only:** ningún reader muta estado, ni acuña experimentos, ni reordena linaje. La cadena `lineage` del manifest es append-only y no se reescribe.
- **Tenant-safe absoluto:** todo read se deriva del `workspaceId` del principal autenticado (`AuthenticatedPrincipalV1.workspaceBindings`), nunca de un campo del request. Un id de otro workspace o inexistente responde `not_found`, nunca revela existencia cross-workspace (mismo patrón que `requireOwnedExperiment`, `../efeonce-globe/packages/domain/src/model-lab.ts:479-483`).
- **Full API Parity de nacimiento:** contrato transport-neutral en `@efeonce-globe/contracts` + registro con `coverage` sobre todas las `GLOBE_SURFACES`; `ui` está disponible sólo detrás de TASK-1519 y `mcp` permanece `policy-blocked` (`LAB_COVERAGE`).

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` (complete) — API Contract Spine: `CapabilityRegistry`, `ReaderRequestEnvelopeV1`/`ReaderResultV1`, coverage manifest sobre `GLOBE_SURFACES` (`../efeonce-globe/packages/contracts/src/index.ts`).
- `TASK-1490` (complete) — Cross-model edit/refine: introdujo `editFrom`, `LabEditSourceV1.parentExperimentId` y la cadena `lineage` por intento que este índice inverso recorre (`../efeonce-globe/packages/domain/src/model-lab.ts:47`, `contracts/src/index.ts:373-375`).
- `ExperimentStorePort` y su implementación persistente (owner del store, referenciado como TASK-1465 en `model-lab.ts:59`) — esta task extiende el port; si el store persistente aún es in-memory, el índice inverso se materializa igual sobre la impl vigente. `[verificar]` el estado real del store en `../efeonce-globe/Handoff.md`.

### Blocks / Impacts

- `TASK-1474` (Globe Professional Studio Workbench) — consume estos readers para el dock de Candidatos y el Mapa de exploración.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (adiciones: reader names, query/result projections)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (adiciones: store port, reverse-lineage resolver, readers)
- `../efeonce-globe/packages/domain/src/model-lab.test.ts`
- `docs/tasks/to-do/TASK-1498-globe-candidate-exploration-lineage-graph.md`

## Current Repo State

### Already exists

- Readers por id único: `GLOBE_LAB_READERS = { get, status, evidence }` (`../efeonce-globe/packages/contracts/src/index.ts:225-229`), registrados vía `loadOwnedExperiment`/`requireOwnedExperiment` con scope de workspace (`model-lab.ts:173-218`, `479-483`).
- Linaje ancestral persistido: `ExperimentAttemptManifestV1.lineage` (oldest-first) y `LabExperimentV1` como projection de lectura (`contracts/src/index.ts:352-424`).
- Parentesco directo declarado: `editFrom.experimentId` (payload) y `LabEditSourceV1.parentExperimentId` (derivado server-side), con profundidad acotada por `MAX_REFINE_DEPTH` (`model-lab.ts:377`).
- Envelopes de reader y resultado canónicos (`ReaderRequestEnvelopeV1`, `ReaderResultV1`) y coverage sobre `GLOBE_SURFACES` (`contracts/src/index.ts:135-206`).

### Gap

- No hay reader que **liste experimentos por workspace**: el `ExperimentStorePort` sólo tiene `get(workspaceId, experimentId)` (`model-lab.ts:60-63`).
- No hay reader de **hijos/descendientes**: `lineage` da ancestros, no descendientes; nadie mantiene el índice inverso padre→hijos.
- No hay proyección de **grafo/árbol de exploración** navegable (nodos + aristas), sólo la cadena lineal de ancestros dentro de un manifest.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe` (packages `@efeonce-globe/contracts` + `@efeonce-globe/domain`; runtime `apps/studio-web`)
- Future candidate home: `remain-shared`
- Boundary: readers canónicos `globe.lab.experiment.list` / `.children` / `.tree` sobre `CapabilityRegistry`; consumers autorizados = HTTP/SDK/CLI/worker/e2e y UI mediante TASK-1519 (`mcp` `policy-blocked`). Ningún consumer accede al `ExperimentStorePort` directo.
- Server/browser split: readers, store y resolución de linaje son 100% server-side; el browser sólo recibe el `ReaderResultV1` filtrado por política. Ningún secreto ni byte crudo cruza.
- Build impact: `none` — sin dependencias pesadas ni filesystem inputs; sólo tipos y lógica de proyección en paquetes existentes.
- Extraction blocker: `none` — la task no crea `apps/*` ni `packages/*` nuevos; vive en los paquetes existentes de `efeonce-globe`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `ExperimentStorePort` + registros `StoredExperimentV1` (workspace-scoped) en `@efeonce-globe/domain`
- Consumidores afectados: `UI (TASK-1474), API/HTTP, SDK, CLI, worker, e2e`
- Runtime target: `worker` (dominio `efeonce-globe`; ejercido local + staging del Globe)

### Contract surface

- Contrato existente a respetar: `../efeonce-globe/packages/contracts/src/index.ts` (`GLOBE_LAB_READERS`, `ReaderRequestEnvelopeV1`, `ReaderResultV1`, `CapabilityDescriptorV1.coverage` sobre `GLOBE_SURFACES`).
- Contrato nuevo o modificado:
  - Readers (wire identifiers `[propuesto]`): `globe.lab.experiment.list`, `globe.lab.experiment.children`, `globe.lab.experiment.tree` — agregados a `GLOBE_LAB_READERS`.
  - Query types: `ListExperimentsQueryV1` (cursor + limit + filtros opcionales `state`/`capability`), `ExperimentChildrenQueryV1` (`experimentId`), `ExperimentTreeQueryV1` (`experimentId` + `maxDepth?`).
  - Result projections: `LabExperimentPageV1` (items = projección resumida de `LabExperimentV1` + `nextCursor`), `LabExperimentChildRefV1[]`, `LabExplorationGraphV1` (`nodes: { experimentId, state, capability, provider, createdAt }[]`, `edges: { parent, child, editMode? }[]`, `root`, `truncated`).
  - Store port: `listByWorkspace(workspaceId, page)` + `listChildren(workspaceId, parentExperimentId)` (o índice `parentExperimentId`), agregados a `ExperimentStorePort`.
- Backward compatibility: `compatible` — adiciones puras; readers y store existentes intactos.
- Full API parity: la UI (dock/Mapa), el SDK/MCP y el CLI consumen los MISMOS readers vía envelope; cero lógica de enumeración/linaje en el cliente; el grafo se arma server-side.

### Data model and invariants

- Entidades/tablas/views afectadas: registros de experimento del `ExperimentStorePort` (`StoredExperimentV1`: `view: LabExperimentV1` + `request: StoredExperimentRequestV1`), sin nuevas tablas de dominio propias de esta task.
- Invariantes que no se pueden romper:
  - La enumeración jamás cruza workspace: todo query se resuelve contra `context.workspaceId`; un padre/hijo de otro workspace se comporta como inexistente (`not_found`), nunca se lista ni se enlaza en el grafo.
  - El índice inverso deriva del linaje ya persistido (`attempt.lineage` / `request.editFrom.experimentId` / `LabEditSourceV1.parentExperimentId`); no inventa aristas ni reescribe la cadena append-only.
  - Profundidad y tamaño acotados: el grafo respeta un `maxDepth` (alineado con `MAX_REFINE_DEPTH`) y la lista respeta un `limit`/cursor; un grafo truncado se declara con `truncated: true`, nunca se silencia.
  - Read-only: ningún reader muta estado ni dispara efectos.
- Tenant/space boundary: `workspaceId` se deriva server-side del principal (`AuthenticatedPrincipalV1.workspaceBindings`), validando `workspaceSelection` contra los bindings; nunca se acepta como campo autoritativo del query.
- Idempotency/concurrency: N/A escritura; reads consistentes con snapshot del store; paginación por cursor estable (orden determinista por `createdAt`+`experimentId`).
- Audit/outbox/history: `none` — reads no auditan mutación. Correlación vía `correlationId` del envelope para trazas.

### Migration, backfill and rollout

- Migration posture: `additive` (si el store persistente necesita índice `parent_experiment_id`, es columna/índice additivo; `[verificar]` contra el store real).
- Default state: `read-only`; UI disponible sólo con bridge+BFF habilitado y `mcp` `policy-blocked`.
- Backfill plan: si el store persistente ya guarda `editFrom`/`parentExperimentId`, el índice inverso se deriva sin backfill; si falta el campo, backfill idempotente que lo puebla desde `request.editFrom` de cada registro (dry-run → apply por workspace). `[verificar]` necesidad real.
- Rollback path: `revert PR` + kill switch del Lab (`LabKillSwitchPort`) fail-closes los readers nuevos junto al resto.
- External coordination: `none` — repo-only del dominio `efeonce-globe`; sin secrets, env vars nuevas obligatorias ni provider config.

### Security and access

- Auth/access gate: `capability` — `requiredCapability: GLOBE_LAB_EXPERIMENT_CAPABILITY` (mismo grant que los readers existentes); principal confiable emitido por el middleware de Globe, nunca del body.
- Sensitive data posture: `no sensitive data` — las projections excluyen credenciales, endpoints privilegiados, costo vendor-confidencial, margen Efeonce, bytes crudos y URLs públicas (igual que `LabExperimentV1`).
- Error contract: `GlobeApiErrorV1` con códigos canónicos (`not_found`, `access_denied`, `policy_blocked`, `invalid_request`); nunca error crudo ni disclosure cross-workspace.
- Abuse/rate-limit posture: `limit`/cursor obligatorio en `list` y `maxDepth` acotado en `tree` evitan enumeración/expansión ilimitada; hereda el rate-limit del spine.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build` + tests focales de `model-lab.test.ts` (list paginado, children, grafo con truncado, aislamiento cross-workspace).
- DB/runtime checks: ejercer los tres readers contra el store vigente con un árbol de refinamiento sembrado (padre + N hijos + nietos) y verificar que un id de otro workspace responde `not_found`.
- Integration checks: dispatch por envelope HTTP/SDK/CLI devolviendo el mismo `ReaderResultV1`; conformance harness del spine acepta la coverage nueva.
- Reliability signals/logs: correlación por `correlationId`; sin signal nuevo (read additive).
- Production verification sequence: `N/A` en producción de Greenhouse — el runtime es de `efeonce-globe`; la verificación vive en su staging/local. `[verificar]` el pipeline vigente en `../efeonce-globe/Handoff.md`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (`GLOBE_LAB_READERS`, `ExperimentStorePort`, `LabExperimentV1`).
- [ ] Data invariants, tenant/access boundary e idempotencia/concurrencia explícitos (derivación server-side de `workspaceId`, `not_found` cross-workspace, cursor estable).
- [ ] Migration/backfill/rollback posture explícito y proporcional (additive + kill switch + `[verificar]` índice del store).
- [ ] Evidencia runtime listada (`pnpm check && pnpm build` + tests focales + ejercicio del árbol sembrado).
- [ ] Projections sin datos sensibles, errores canónicos y sin disclosure cross-workspace.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** La enumeración, el índice inverso y el armado del grafo viven en `@efeonce-globe/domain`, no en el componente del dock/Mapa.
- [ ] **Modelada como reader/recurso, no como fetch acoplado a la pantalla:** tres readers canónicos sobre `CapabilityRegistry`.
- [ ] **Read expuesto como reader canónico** con envelope, workspace scope y projection policy-filtered. No hay write en esta task (readers puros).
- [ ] **Capability + grant:** reusa `GLOBE_LAB_EXPERIMENT_CAPABILITY` (mismo grant que `get`/`status`/`evidence`); no introduce grant nuevo. Si el owner del grant model exige uno separado para list/tree, registrarlo en el mismo PR. `[verificar]`.
- [x] **Camino programático declarado:** HTTP + SDK + CLI + worker + e2e `available`; `ui` disponible por TASK-1519 y `mcp` `policy-blocked`.
- [ ] **Write apto para `propose → confirm → execute`:** `N/A — readers puros`, sin mutación.
- [ ] **Un primitive, muchos consumers:** dock, Mapa, SDK, CLI y e2e consumen el mismo contrato; cero lógica duplicada.
- [ ] **Parity check = SÍ:** los readers tienen contrato gobernado a nivel capability; todo consumer los opera por construcción.

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

### Approved Producer target addendum — unified feed and query projection

Extend the read model into the canonical unified Producer feed over assets and runs. It remains read-only and
tenant-scoped: mutations for favorites/collections/bulk operations belong to `TASK-1503`/`TASK-1520` and are only
reflected here after their authoritative writes.

- Return a stable, cursor-paginated summary with modality, lifecycle/status, route/model public label, recipe,
  timestamps, favorite/collection projection, approval state and immediate lineage identifiers.
- Support bounded search plus allowlisted filters/sorts for modality, status, collection and favorite. Unknown or
  unsupported predicates fail explicitly; they never trigger unbounded scans or client-side cross-workspace
  enumeration.
- Feed/run/asset identifiers and cursors are opaque. Query scope derives from trusted context, and stable ordering
  includes a deterministic tie-breaker.
- Series/hero/grouping can be rendered by the client only from deterministic projection fields. Durable series and
  membership ownership belongs to `TASK-1520`; this task does not create a competing write model.
- Lineage readers continue to expose bounded graph depth and honest missing/archived nodes without rewriting the
  append-only provenance chain.

Additional acceptance evidence:

- [ ] Feed pagination has no duplicates/gaps under stable data and preserves tenant isolation under every filter.
- [ ] Search/filter/sort are allowlisted and bounded with query-plan/performance evidence at the target fixture size.
- [ ] Collection/favorite/approval/lineage changes converge into the projection without owning their writes.

### Slice 1 — Contract surface (readers + projections)

- Agregar a `GLOBE_LAB_READERS` los wire identifiers `list`, `children`, `tree` (`@efeonce-globe/contracts/src/index.ts`).
- Definir los query types: `ListExperimentsQueryV1` (`cursor?`, `limit?`, `state?: LabExperimentState`, `capability?: CreativeCapability`), `ExperimentChildrenQueryV1` (`experimentId`), `ExperimentTreeQueryV1` (`experimentId`, `maxDepth?`).
- Definir las projections: `LabExperimentSummaryV1` (subset de `LabExperimentV1`: `experimentId`, `state`, `capability`, `provider`, `model`, `spentCredits`, `createdAt`, `updatedAt`), `LabExperimentPageV1` (`items`, `nextCursor?`), `LabExperimentChildRefV1` (`experimentId`, `state`, `editMode?`), `LabExplorationGraphV1` (`root`, `nodes`, `edges`, `truncated`).
- Sin comportamiento: sólo tipos + constantes.

### Slice 2 — Store port + reverse-lineage resolver

- Extender `ExperimentStorePort` con `listByWorkspace(workspaceId, page)` y `listChildren(workspaceId, parentExperimentId)` (o un query por `parentExperimentId`), manteniendo `create`/`get`/`update` intactos.
- Actualizar la implementación vigente del store (in-memory y/o persistente) para soportar orden determinista (`createdAt`+`experimentId`) y el índice inverso derivado de `request.editFrom.experimentId` / `LabEditSourceV1.parentExperimentId`.
- Función pura `buildExplorationGraph(workspaceId, rootId, maxDepth, store)` que compone ancestros (desde `attempt.lineage`) + descendientes (desde `listChildren`) en `nodes`/`edges`, con corte por profundidad y flag `truncated`.

### Slice 3 — Reader handlers + registro

- Registrar los tres readers en `registerModelLabCapabilities` con `requiredCapability: GLOBE_LAB_EXPERIMENT_CAPABILITY` y `coverage` = `LAB_COVERAGE` (UI disponible por TASK-1519; MCP bloqueado).
- Handlers workspace-scoped: derivan `context.workspaceId`; validan `limit`/`maxDepth` contra topes; un id ajeno/inexistente → `not_found` sin disclosure.
- `assertLabEnabled(deps)` (kill switch) fail-closes los tres readers.

### Slice 4 — Parity coverage, conformance y docs

- Coverage manifest + conformance harness del spine aceptan las tres capabilities nuevas.
- Tests focales en `model-lab.test.ts`: paginación estable, children directos, grafo con ancestros+descendientes, `truncated` por `maxDepth`, aislamiento cross-workspace, fail-close por kill switch.
- Actualizar la doc funcional del Model Lab en `efeonce-globe` (`docs/documentation/efeonce-globe-model-lab.md`) con los tres readers.

## Out of Scope

- Comparar/anotar candidatos, review y delivery → `TASK-1472`.
- Scoring/verdict de candidatos (el harness nunca auto-puntúa) → evaluation harness existente.
- Cualquier command o write (variar/relanzar/inpaint) → `TASK-1496`/`TASK-1497`.
- La UI del dock y del Mapa (consumidora) → `TASK-1474`.
- Promoción MCP (permanece fuera de scope); UI ya usa la ruta gobernada de TASK-1519.

## Detailed Spec

**Reverse-lineage derivation.** El parentesco directo de un experimento es `request.editFrom.experimentId` (equivalentemente el penúltimo elemento de `attempt.lineage`, que es oldest-first y termina en el propio id). `listChildren(workspaceId, parent)` devuelve los experimentos del workspace cuyo `editFrom.experimentId === parent`. El grafo se arma en dos direcciones desde el `root`: hacia arriba recorriendo `attempt.lineage` (ancestros ya persistidos, O(1) por lookup) y hacia abajo con BFS sobre `listChildren` acotado por `maxDepth`. Ambas direcciones se resuelven SIEMPRE dentro del workspace del caller; un ancestro/descendiente que no pertenezca al workspace se omite (no puede ocurrir con datos sanos, pero el filtro es defensivo).

**Aislamiento.** Todo lookup pasa por `store.get(context.workspaceId, id)` o `store.listChildren(context.workspaceId, id)`; nunca por un lookup global. Un `rootId` de otro workspace responde `not_found` antes de armar el grafo, replicando `requireOwnedExperiment`.

**Paginación.** `list` ordena por `(createdAt DESC, experimentId)` y pagina por cursor opaco codificando el último `(createdAt, experimentId)` emitido; `limit` con default y tope duro. Orden determinista para que el cursor sea estable ante inserciones.

## Rollout Plan & Risk Matrix

Cambio aditivo del dominio `efeonce-globe`, gateado por el kill switch del Lab y el bridge UI de TASK-1519; MCP permanece bloqueado. Sin migración destructiva ni write de negocio. Rollback = revert + flag OFF.

### Slice ordering hard rule

- Slice 1 (contract) → Slice 2 (store + resolver) → Slice 3 (readers) → Slice 4 (parity/conformance/docs).
- Slice 3 no puede registrar readers sin el store extendido de Slice 2. Slice 4 (conformance) corre al final porque valida la coverage de Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Enumeración cruza workspace (disclosure) | identity/tenant | low | Derivación server-side de `workspaceId` + `not_found` defensivo + test de aislamiento | test rojo de aislamiento; `access_denied`/`not_found` en logs |
| Grafo/lista sin cota (DoS de expansión) | worker | low | `maxDepth` acotado (`MAX_REFINE_DEPTH`) + `limit`/cursor obligatorio + `truncated` explícito | latencia del reader; correlationId en trazas |
| Índice inverso derivado mal (aristas fantasma) | data quality | medium | Derivar sólo de `editFrom`/`lineage` persistido; nunca inferir; tests con árbol sembrado | test de grafo rojo |
| Store persistente sin índice por padre | worker | medium | `[verificar]` store real; índice additivo o scan acotado; coordinar con owner del store | build/test del Globe |

### Feature flags / cutover

- Sin flag nuevo obligatorio: los readers heredan el `LabKillSwitchPort` existente. UI requiere además el rollout independiente del bridge TASK-1519; MCP continúa `policy-blocked`. Revert: revert + flag OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (sólo tipos) | <5 min | sí |
| Slice 2 | revert PR; store vuelve a `get`/`create`/`update` | <10 min | sí |
| Slice 3 | revert PR o kill switch OFF | <5 min | sí |
| Slice 4 | revert PR (coverage/docs) | <5 min | sí |

### Production verification sequence

`N/A — el runtime productivo es de efeonce-globe, no de greenhouse-eo`. La verificación canónica es `cd ../efeonce-globe && pnpm check && pnpm build` + tests focales + ejercicio del árbol sembrado en local/staging del Globe. `[verificar]` el pipeline de deploy vigente en `../efeonce-globe/Handoff.md` antes de cerrar.

### Out-of-band coordination required

- Coordinar con el owner del `ExperimentStorePort` (store persistente, ref. TASK-1465) si se requiere índice `parent_experiment_id`. Fuera de eso: `N/A — repo-only change` del dominio `efeonce-globe`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `globe.lab.experiment.list` enumera experimentos del workspace del caller, paginado por cursor estable y filtrable por estado, capability, modalidad, favorito, colección y búsqueda allowlisted, sin filtrarse a otro workspace.
- [x] `globe.lab.experiment.children` devuelve los descendientes directos de un `experimentId` derivados del índice inverso de `editFrom`/`lineage`.
- [x] `globe.lab.experiment.tree` proyecta ancestros + descendientes como `nodes`/`edges` con `maxDepth`/nodos acotados y `truncated` explícito.
- [x] Un `experimentId` de otro workspace o inexistente responde `not_found`, sin revelar existencia.
- [x] Las projections excluyen credenciales, costo vendor-confidencial, margen, bytes crudos, provider slugs y URLs públicas.
- [x] Los tres readers declaran coverage completa: `ui` disponible por el bridge humano de TASK-1519; `mcp` sigue `policy-blocked`; el conformance harness pasa.
- [x] El kill switch del Lab fail-closes los tres readers.
- [x] `cd ../efeonce-globe && pnpm check && pnpm build` verde con los tests focales nuevos.

## Verification

- `cd ../efeonce-globe && pnpm check`
- `cd ../efeonce-globe && pnpm build`
- `cd ../efeonce-globe && pnpm test` (focal: `packages/domain/src/model-lab.test.ts`)
- Ejercicio manual: sembrar padre + hijos + nietos, verificar `list` paginado, `children` directos, `tree` con truncado, y aislamiento cross-workspace.

Evidencia local 2026-07-22: Globe commit `6756c3b`; `pnpm check` y `pnpm build` verdes. La migración aditiva `packages/database/migrations/0004_candidate_feed_lineage.sql` está versionada pero no aplicada; el lifecycle permanece `in-progress` hasta migrate + smoke.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas (en particular `TASK-1474`, cuya sección "Depends on"/"Already exists" se actualiza cuando estos readers existan)

- [ ] Los tres readers quedaron documentados en `docs/documentation/creative-studio/efeonce-globe-model-lab.md`.

## Follow-ups

- Promoción de ruta `ui`/`mcp` de estos readers a `available` cuando el workbench (`TASK-1474`) los cablee.
- Comparación lado a lado y anotación de candidatos → `TASK-1472`.
- Si el store persistente requiere índice `parent_experiment_id`, coordinar con el owner del store (ref. TASK-1465).

## Open Questions

- `[verificar]` estado del `ExperimentStorePort` persistente: ¿ya guarda `editFrom`/`parentExperimentId` recuperable para el índice inverso, o requiere backfill?
- ¿El grant se mantiene único (`GLOBE_LAB_EXPERIMENT_CAPABILITY`) para list/children/tree, o el modelo de grants del Globe pide un grant de lectura de workspace separado? `[verificar]` con el owner del capability model.
