# TASK-1496 — Globe Generation Recipe + Reproducible Relaunch + Variation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; contrato de receta, comandos variate/relaunch y captura de receta efectiva pendientes de implementar en efeonce-globe`
- Rank: `TBD`
- Domain: `creative|ai`
- Blocked by: `TASK-1481 (spine, complete) + TASK-1490 (edit seam, complete)`
- Branch: `task/TASK-1496-globe-generation-recipe-relaunch-variation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy un experimento del Model Lab no captura la receta de generación (seed, guidance, steps, sampler):
`PrepareExperimentPayloadV1` y `ExperimentAttemptManifestV1` no tienen esos campos
(`packages/contracts/src/index.ts:316-333` y `:354-398`), así que un candidato no se puede reproducir y
"relanzar" hoy significa hacer otro `prepare` que acuña un experimento nuevo sin determinismo. Esta task
agrega tres cosas gobernadas y transport-neutral en `efeonce-globe`: (1) capturar la receta de generación
en el payload y registrar la receta EFECTIVA en el manifiesto por intento; (2) un comando `relaunch` que
re-ejecuta un experimento con su receta resuelta (reproducible); (3) un comando `variate` que hace fan-out
de N variantes con un delta controlado de receta. Todo respeta el spend fence y el private-ingest, y nace
con Full API Parity (command/reader neutral + coverage, `ui`/`mcp` `policy-blocked` hasta el gate).

## Why This Task Exists

El Globe Studio Workbench (TASK-1474) está diseñado como una agencia creativa: el paso "Candidatos"
promete seed reproducible, "Variar" (explorar N variantes de un candidato) y "Relanzar" un experimento
tal cual. El análisis de brecha
(`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`, categoría ②)
verificó con evidencia `file:line` que el backend hoy no lo soporta:

- **Cero campos de receta.** Un `grep` de `seed|sampler|guidance|steps` en `packages/` y `apps/` no
  devuelve nada. La única palanca creativa del contrato es `prompt?: string`. Sin registrar la seed
  efectiva que el proveedor usó, ningún candidato es reproducible: aunque el usuario reenvíe el mismo
  brief, el resultado deriva.
- **"Relanzar" no existe como concepto reproducible.** `prepareExperiment` (`model-lab.ts:222-264`)
  llama `deps.newId()` y crea un experimento fresco cada vez; `executeExperiment`
  (`model-lab.ts:266-337`) estima, reserva y corre sin traer atrás la receta del original. Re-preparar es
  acuñar un experimento nuevo, no reproducir uno.
- **"Variar" no existe.** No hay comando que haga fan-out de N variantes desde un candidato base. Un
  experimento = un output; explorar variaciones hoy es prepare+execute manual, una por una, sin un delta
  de receta gobernado ni un tope agregado de gasto.

La consecuencia es que el workbench muestra affordances (seed, variar, relanzar) que el spine no puede
despachar. Esta task cierra la brecha en el nivel correcto — el contrato y el domain de `efeonce-globe` —
sin tocar el provider seam directo ni el ledger comercial (TASK-1468) ni el gate humano de aprobación
(TASK-1469), que son piezas separadas.

## Goal

- Definir un descriptor de receta de generación transport-neutral (`seed`/`guidance`/`steps`/`sampler`),
  declarable por el caller en `prepare` y registrado como receta EFECTIVA en el manifiesto por intento.
- Hacer que el provider seam (`LabRunnerPort` → adapter) aplique las palancas que soporta y devuelva la
  receta efectiva con evidencia explícita de qué palancas NO honró, sin switch silencioso.
- Agregar el comando `relaunch`: re-mintea un experimento desde la receta resuelta + ruta + inputs
  autorizados + edit source del original, con linaje encadenado y re-fenced; reproducible cuando hay seed
  efectiva, degradación honesta cuando el original es legacy sin receta.
- Agregar el comando `variate`: fan-out de N variantes desde un experimento base con un delta de receta
  controlado (barrido de seed / jitter acotado), cada variante fenced por-run y contra el day cap del
  workspace, con un tope agregado, y linaje de hermanos para la exploración (TASK-1498).
- Registrar ambos comandos en el spine con coverage `policy-blocked` en `ui`/`mcp` (Full API Parity),
  sin nuevas apps/packages, respetando spend fence y private-ingest.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (categoría ②, fila
  TASK-1496)
- `docs/epics/in-progress/EPIC-028-efeonce-globe-creative-studio.md` `[verificar path exacto del EPIC-028]`
- (repo hermano) `../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- (repo hermano) `../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/tasks/complete/TASK-1481-globe-api-contract-spine-cross-surface-harness.md`
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md`

Reglas obligatorias:

- **Boundary DURO Globe ↔ Greenhouse.** El CÓDIGO vive en `efeonce-globe` (contracts + domain +
  creative-runner). Greenhouse solo gobierna lifecycle, docs y esta task. NUNCA implementar el runtime de
  esta capacidad dentro de `greenhouse-eo`.
- **El provider seam es sagrado.** Las palancas de receta (seed/guidance/steps/sampler) se aplican DENTRO
  del adapter, atravesando `LabRunnerPort.run`. NUNCA llamar el SDK de un proveedor directo desde el
  domain ni desde el contrato. El domain nunca conoce palancas de un proveedor específico; solo pasa la
  receta neutral y recibe la receta efectiva de vuelta.
- **Full API Parity desde el nacimiento.** `variate` y `relaunch` son commands gobernados
  transport-neutral registrados en el spine con su descriptor de coverage. `ui` y `mcp` pueden nacer
  `policy-blocked`; los carriles internos (`http`/`sdk`/`cli`/`worker`/`e2e`) `available`, como el resto
  del Model Lab (`LAB_COVERAGE`, `packages/domain/src/model-lab.ts:120-129`).
- **Spend fence intacto.** Ni `variate` ni `relaunch` pueden puentear el `SpendFencePort`
  (`model-lab.ts:71-80`, `spend-fence.ts`): cada variante y cada relaunch pasa por `reserve → run →
  settle/release` igual que un execute normal, respetando su propio `hardCapCredits` y el day cap del
  workspace. `variate` además declara un tope agregado para que un fan-out no dispare el day cap por
  sorpresa. El fence es seguridad, NO el ledger comercial (TASK-1468).
- **Private-ingest intacto.** Solo cruzan el contrato `sha256` + rights de los inputs autorizados
  (`LabAuthorizedInputV1`, `contracts:249-258`). Una variante o un relaunch reusa los inputs del base por
  hash/rights; NUNCA se re-suben bytes crudos por la API.
- **Herencia de derechos por la cadena.** Un relaunch/variante encadena su linaje sobre el original y
  hereda la postura de derechos más restrictiva (`parentRights`, `LabEditSourceV1`, `contracts:303-314`),
  igual que un edit. Un input `licensed` restringe a sus reproducciones y variantes.
- **Evidencia, no switch silencioso.** Si el adapter no honra una palanca de receta (proveedor sin seed
  expuesta, sampler no soportado), eso queda registrado como evidencia en el manifiesto (mismo espíritu de
  `editMode`/`providerRunChainable`), nunca se descarta en silencio.
- **No auto-score.** Esta task no puntúa candidatos ni marca "94"; la evaluación es del harness
  (TASK-1458), verdict humano.

## Normative Docs

- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — fuente del gap
  con evidencia `file:line`.

## Dependencies & Impact

### Depends on

- **TASK-1481** (API Contract Spine, `complete`) — registry de capabilities, coverage manifest, contexto
  de comando trusted (`TrustedCommandContextV1`), tenant-safety por `workspaceId`. `variate` y `relaunch`
  se registran sobre ese spine.
- **TASK-1490** (Cross-model edit seam, `complete`) — provee `editFrom`/`LabEditSourceV1`, linaje
  encadenado, `resolveEditSource`, `editMode`, `outputsRetained`, `providerRunChainable`
  (`contracts:283-398`, `model-lab.ts:230-238`). Un relaunch/variante de un candidato editado debe
  arrastrar receta Y linaje; la reproducción se construye sobre el mismo substrato de linaje que el edit.
- Provider seam vivo (`LabRunnerPort`, `model-lab.ts:96-104`) y su adapter en
  `apps/creative-runner/src/` `[verificar: el adapter live puede seguir detrás del fake determinista de
  TASK-1457/1464]`.

### Blocks / Impacts

- **TASK-1474** (Globe Professional Studio Workbench) — consume esta capacidad para los affordances
  "seed reproducible", "Variar" y "Relanzar" del paso Candidatos/Exploración.
- **TASK-1498** (Candidate Exploration Readers + Lineage Graph) — el linaje de hermanos que produce
  `variate` es lo que su grafo padre→hijo enumera; coordinar el shape del encadenamiento.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (receta + payloads + nombres de comando)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (handlers `variate`/`relaunch` + threading de receta
  + registración)
- `../efeonce-globe/packages/domain/src/model-lab.test.ts`
- `../efeonce-globe/apps/creative-runner/src/*adapter*.ts` (aplicar palancas + devolver receta efectiva)
- `docs/tasks/to-do/TASK-1496-globe-generation-recipe-relaunch-variation.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (delta al cerrar)

## Current Repo State

### Already exists

- `PrepareExperimentPayloadV1` con `capability`, `referenceRoute`, `authorizedInputs`, `hardCapCredits`,
  `prompt?`, `editFrom?` (`contracts:316-333`).
- `ExperimentAttemptManifestV1` con ruta propuesta/actual, créditos, hashes, `lineage`, `editMode`,
  `providerRunRef`, `providerRunChainable`, `outputsRetained` (`contracts:354-398`).
- `GLOBE_LAB_COMMANDS` = `{ prepare, execute, cancel }` y `GLOBE_LAB_READERS` = `{ get, status, evidence }`
  (`contracts:218-229`); capability `globe.lab.experiment.run` (`contracts:215`).
- `prepareExperiment` / `executeExperiment` / `cancelExperiment` + state machine
  (`prepared → estimated → reserved → running → candidate_ready|failed|cancelled`) (`model-lab.ts:222-357`).
- Provider seam `LabRunnerPort.estimate/run` + `LabRouteEstimateV1` (`model-lab.ts:82-104`).
- Spend fence `SpendFencePort` + `LabSpendFence` (per-run hard cap + workspace day cap;
  `model-lab.ts:71-80`, `spend-fence.ts`).
- Coverage `LAB_COVERAGE` con `ui`/`mcp` `policy-blocked` (`model-lab.ts:120-129`).
- Edit seam de TASK-1490: `LabEditFromV1`, `LabEditSourceV1`, `LabEditMode`, `resolveEditSource`
  (`contracts:283-314`, `model-lab.ts:230-238`).

### Gap

- No hay tipo de receta de generación; `seed`/`guidance`/`steps`/`sampler` no existen en el contrato ni en
  el manifiesto (`grep` = 0 en `packages/`/`apps/`). Un candidato no es reproducible.
- No hay comando `relaunch`; reproducir es re-`prepare` no determinista (`model-lab.ts:222-264`).
- No hay comando `variate`; no existe fan-out de N variantes con delta de receta ni tope agregado.
- El adapter no reporta la receta efectiva usada (seed real que asignó el proveedor), sin lo cual el
  relaunch no puede ser fiel.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (repo hermano; `packages/contracts` + `packages/domain` + `apps/creative-runner`)
- Future candidate home: `remain-shared`
- Boundary: commands `globe.lab.experiment.variate` + `globe.lab.experiment.relaunch` y el tipo
  `LabGenerationRecipeV1`, registrados en el spine (TASK-1481) bajo la capability
  `globe.lab.experiment.run`; consumers autorizados = carriles del spine (`http`/`sdk`/`cli`/`worker`/`e2e`
  `available`; `ui`/`mcp` `policy-blocked`). Greenhouse solo consume vía el boundary Globe↔Greenhouse ya
  definido, nunca importa el domain.
- Server/browser split: el domain, el store, el fence, el resolver de receta y el provider seam quedan
  server-side; la receta neutral cruza el contrato, la receta efectiva se registra en el manifiesto; los
  bytes crudos nunca cruzan (private-ingest).
- Build impact: `none` — sin dependencias pesadas nuevas; reusa el runner/adapter existente.
- Extraction blocker: `provider constraint` — el seam de proveedor (`LabRunnerPort` + adapter) y el spend
  fence deben permanecer server-internal; esta task no habilita ejecución externa ni gasto autónomo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `PrepareExperimentPayloadV1` + `ExperimentAttemptManifestV1` + `StoredExperimentRequestV1` + spine registry (efeonce-globe)
- Consumidores afectados: `TASK-1474 workbench (UI, policy-blocked por ahora), SDK/CLI internos, e2e harness`
- Runtime target: `worker (creative-runner) + carriles internos del spine`

### Contract surface

- Contrato existente a respetar: `../efeonce-globe/packages/contracts/src/index.ts` (payloads, manifiesto,
  `GLOBE_LAB_COMMANDS`, coverage); `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- Contrato nuevo o modificado:
  - `LabGenerationRecipeV1 = Readonly<{ seed?: number; guidanceScale?: number; inferenceSteps?: number; sampler?: string }>` (transport-neutral; todas las palancas opcionales)
  - `recipe?: LabGenerationRecipeV1` agregado a `PrepareExperimentPayloadV1` (declarable por caller)
  - `recipe?: LabGenerationRecipeV1` (EFECTIVA) + `recipeUnsupportedKnobs?: readonly string[]` agregados a `ExperimentAttemptManifestV1`
  - `RelaunchExperimentPayloadV1 = Readonly<{ experimentId: string; hardCapCredits: number }>`
  - `VariateExperimentPayloadV1 = Readonly<{ experimentId: string; count: number; strategy: LabVariationStrategy; hardCapCreditsPerVariant: number; aggregateHardCapCredits: number }>` con `LabVariationStrategy = 'seed-sweep' | 'guidance-jitter'` `[verificar naming final del enum de estrategias]`
  - `GLOBE_LAB_COMMANDS` extendido con `variate` + `relaunch` (wire ids `globe.lab.experiment.variate` / `globe.lab.experiment.relaunch`)
- Backward compatibility: `compatible` — todos los campos nuevos son opcionales; `prepare`/`execute`/`cancel` no cambian de firma; los manifiestos legacy sin `recipe` siguen válidos.
- Full API parity: `variate` y `relaunch` son commands registrados en el spine con coverage; el workbench y Nexa/MCP los operan por construcción cuando se levante el gate, sin lógica duplicada por consumer.

### Data model and invariants

- Entidades/tablas/views afectadas: registro de experimentos (`ExperimentStorePort`,
  `model-lab.ts:59-64`) — persistencia in-memory hoy, durable con TASK-1465 `[verificar]`; manifiesto por
  intento (`ExperimentAttemptManifestV1`).
- Invariantes que no se pueden romper:
  - La receta efectiva del manifiesto es evidencia inmutable append-only por intento; nunca se reescribe
    (mismo contrato que el resto del manifiesto).
  - Una palanca de receta no soportada por el adapter se registra en `recipeUnsupportedKnobs`, nunca se
    aplica silenciosamente ni se finge honrada.
  - `variate` y `relaunch` NUNCA puentean el spend fence: cada experimento hijo pasa por su propio
    `reserve/run/settle` con su `hardCapCredits`; `variate` respeta además `aggregateHardCapCredits` y el
    day cap del workspace.
  - `relaunch` de un original sin `recipe`/`seed` efectiva se marca reproducción best-effort (no
    determinista), nunca se presenta como fiel.
  - Linaje: un relaunch/variante encadena sobre el linaje del original (`lineage`), hereda `parentRights`
    como la más restrictiva; los inputs se reusan por hash, nunca re-subidos.
- Tenant/space boundary: todo se deriva de `context.workspaceId` (`TrustedCommandContextV1`); un caller
  solo puede variar/relanzar experimentos de SU workspace (`requireOwnedExperiment`, `model-lab.ts:274`).
- Idempotency/concurrency: `relaunch` acuña un experimento nuevo con `newId()` (no idempotente por
  diseño: cada relaunch es un intento nuevo); `variate` acuña N ids nuevos de una; ambos son
  transaccionales por-experimento vía el store + fence, igual que execute. Un replay de `execute` sobre un
  experimento ya corrido sigue devolviendo su view (`model-lab.ts:276-279`).
- Audit/outbox/history: el manifiesto por intento ES el log append-only; la receta efectiva y el linaje
  quedan como evidencia. Sin outbox nuevo.

### Migration, backfill and rollout

- Migration posture: `additive` — solo campos opcionales nuevos en contratos y dos comandos nuevos.
- Default state: `flag OFF / policy-blocked` — los comandos nacen con `ui`/`mcp` `policy-blocked`; el
  kill switch del Lab (`LabKillSwitchPort`, `model-lab.ts:107`) fail-closes todo si está apagado.
- Backfill plan: `none` — manifiestos legacy sin `recipe` siguen válidos; no se re-escribe historia.
- Rollback path: `revert PR + flag OFF` — revertir el PR en efeonce-globe y/o dejar los comandos nuevos
  fuera del registro (no registrarlos) apaga la capacidad; los campos opcionales no afectan callers
  existentes.
- External coordination: `none nuevo` — reusa credenciales de proveedor ya provisionadas del Model Lab;
  esta task no rota secretos ni cambia config de proveedor.

### Security and access

- Auth/access gate: `capability` — `globe.lab.experiment.run` (`requiredCapability`) vía el spine; contexto
  trusted; ownership por `workspaceId`.
- Sensitive data posture: `no sensitive data en el contrato` — solo hashes + rights + receta neutral cruzan;
  bytes crudos, credenciales, endpoints privilegiados, costo vendor-confidencial y margen Efeonce nunca
  cruzan (mismo contrato de proyección del Lab, `contracts:400-423`).
- Error contract: fallas del proveedor degradan a `failed` con `failureReason` sanitizado + release del
  fence (`model-lab.ts:317-320`); un fan-out que supera el tope agregado aborta ANTES de gastar.
- Abuse/rate-limit posture: `spend fence` (per-run + day cap) + `aggregateHardCapCredits` en `variate` +
  `count` con máximo acotado `[verificar máximo, p.ej. 8]` son el circuit breaker contra fan-out abusivo.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build`; suite del domain
  (`packages/domain/src/model-lab.test.ts`) con casos de receta/relaunch/variate.
- DB/runtime checks: `[verificar]` con el store durable (TASK-1465) cuando aplique; con store in-memory,
  test del round-trip receta declarada → receta efectiva en manifiesto.
- Integration checks: ejercitar el adapter (fake determinista) confirmando que la receta efectiva vuelve y
  que las palancas no soportadas aparecen en `recipeUnsupportedKnobs`.
- Reliability signals/logs: `[verificar]` — reusar la observabilidad del runner/correlationId; sin signal
  nuevo obligatorio para additive.
- Production verification sequence: `N/A hasta el gate` — capacidad `policy-blocked`; la verificación de
  producción llega cuando TASK-1474 levante el gate de UI.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales de efeonce-globe.
- [ ] Invariantes de receta (efectiva append-only, palancas no honradas explícitas), tenant boundary por
      workspace e idempotencia por-experimento explícitos.
- [ ] Rollout additive + rollback por revert/flag OFF explícitos y proporcionales.
- [ ] Evidencia runtime listada (`pnpm check && pnpm build` en efeonce-globe + tests de domain).
- [ ] Sin fuga de bytes crudos/costo vendor/margen; spend fence y private-ingest respetados.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** La receta, el fan-out y el relaunch viven en el domain de
      efeonce-globe (`model-lab.ts`), no en el workbench.
- [ ] **Modelada como command, no click-handler.** `variate` y `relaunch` son commands gobernados del
      spine, no handlers acoplados a una pantalla.
- [ ] **Read/write gobernados.** Los writes (`variate`/`relaunch`) pasan por el registry con capability,
      spend fence, linaje append-only y errores sanitizados; los reads del resultado usan los readers
      existentes (`get`/`status`/`evidence`) + los de TASK-1498.
- [ ] **Capability + grant en el mismo PR.** Reusa `globe.lab.experiment.run`; si se decide una
      sub-capability propia para `variate` (gasto multiplicado), registrarla con su coverage en el mismo PR.
      `[verificar decisión: reusar vs sub-capability]`
- [ ] **Camino programático declarado.** Carriles `http`/`sdk`/`cli`/`worker`/`e2e` `available`;
      `ui`/`mcp` `policy-blocked` con deuda documentada (se abre al gate de TASK-1474).
- [ ] **Apto para propose → confirm → execute.** `variate`/`relaunch` son commands puros server-side; un
      agente propone, el humano confirma en el endpoint gobernado, el LLM nunca gasta directo.
- [ ] **Un primitive, muchos consumers.** Cero lógica de receta/fan-out/relaunch duplicada por consumer.
- [ ] **Parity check = SÍ.** La capability tiene contrato gobernado a nivel spine; todos los consumers la
      operan por construcción al levantar el gate.

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

### Slice 1 — Generation Recipe: contrato + captura de receta efectiva

- En `packages/contracts/src/index.ts`: definir `LabGenerationRecipeV1` (transport-neutral;
  `seed`/`guidanceScale`/`inferenceSteps`/`sampler`, todas opcionales) con doc explicando que son palancas
  neutrales, no vocabulario de un proveedor.
- Agregar `recipe?: LabGenerationRecipeV1` a `PrepareExperimentPayloadV1` (caller-declarable) y persistirla
  en `StoredExperimentRequestV1` para que el runner la reciba.
- Agregar a `ExperimentAttemptManifestV1`: `recipe?: LabGenerationRecipeV1` (la EFECTIVA aplicada) +
  `recipeUnsupportedKnobs?: readonly string[]` (palancas pedidas que el adapter no honró).
- En `apps/creative-runner/src/*adapter*.ts`: aplicar las palancas soportadas al invocar el proveedor
  (siempre por el seam, nunca SDK directo desde domain), capturar la seed/valores EFECTIVOS (incluida la
  seed que el proveedor auto-asigna cuando el caller no la fijó) y devolverlos en el manifiesto; listar en
  `recipeUnsupportedKnobs` lo no soportado.
- Tests: round-trip receta declarada → receta efectiva en manifiesto; palanca no soportada aparece como
  evidencia; ausencia de receta = comportamiento legacy intacto.

### Slice 2 — Reproducible Relaunch command

- `RelaunchExperimentPayloadV1` + wire id `globe.lab.experiment.relaunch` en `GLOBE_LAB_COMMANDS`.
- Handler `relaunchExperiment` en `model-lab.ts`: cargar el experimento original owned por workspace;
  re-mintear un experimento nuevo (`newId()`) cuya `StoredExperimentRequestV1` clona ruta + inputs
  autorizados (por hash) + `editSource` + la receta RESUELTA del original (la efectiva del último intento
  `candidate_ready`); encadenar linaje sobre el original; declarar su propio `hardCapCredits`; correr por
  la máquina de estados y el fence normales.
- Degradación honesta: si el original no tiene receta/seed efectiva (legacy), relanzar igual pero marcar la
  reproducción como best-effort/no-determinista (campo o `failureReason` informativo, `[verificar shape]`),
  nunca presentarla como fiel.
- Tests: relaunch de un candidato con seed → mismo route/inputs/receta, linaje encadenado; relaunch legacy
  → marcado best-effort; ownership cross-workspace rechazado.

### Slice 3 — Variation fan-out command

- `VariateExperimentPayloadV1` (`experimentId`, `count`, `strategy`, `hardCapCreditsPerVariant`,
  `aggregateHardCapCredits`) + wire id `globe.lab.experiment.variate`; `LabVariationStrategy`
  (`seed-sweep` | `guidance-jitter`, `[verificar set final]`).
- Handler `variateExperiment`: desde el base owned, generar N recetas hijas con el delta de la estrategia
  (seed-sweep = misma receta, N seeds distintas; guidance-jitter = jitter acotado de `guidanceScale`);
  acuñar N experimentos hijos, cada uno encadenando linaje sobre el base (set de hermanos).
- Fence: validar `aggregateHardCapCredits` y `count ≤ máximo` ANTES de gastar; cada variante corre por su
  propio `reserve/run/settle` respetando `hardCapCreditsPerVariant` y el day cap; si el agregado o el day
  cap se agotan a media ejecución, degradar honesto (variantes restantes `failed` con razón, sin
  gasto silencioso).
- Private-ingest: las variantes reusan los inputs autorizados del base por hash/rights; herencia de
  `parentRights`.
- Tests: fan-out de N produce N hijos con seeds distintas y linaje de hermanos; tope agregado corta el
  fan-out; day cap agotado degrada; ownership cross-workspace rechazado.

### Slice 4 — Registro en el spine + coverage + parity closeout

- Registrar `variate` y `relaunch` en `registerModelLabCapabilities` con `LAB_COVERAGE`
  (`ui`/`mcp` `policy-blocked`; internos `available`) y `requiredCapability`.
- Confirmar que el coverage manifest refleja los comandos nuevos; correr el harness cross-surface del spine
  (TASK-1481) para que parity quede verde.
- Delta de cierre al gap analysis (`GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`) marcando la fila
  TASK-1496 cubierta; doc gate.

## Out of Scope

- Ledger comercial de Studio Credits (saldo/consumo/refund durables) — TASK-1468.
- Gate humano de aprobación + run lifecycle recuperable — TASK-1469.
- Brief estructurado / Prompt Studio / recetas de brief reusables — TASK-1493 (distinto de la receta de
  GENERACIÓN de esta task).
- Style DNA / análisis de referencia — TASK-1494.
- Formatos objetivo + set multi-formato — TASK-1495.
- Inpaint / edición por máscara — TASK-1497.
- Readers de exploración por workspace + grafo de linaje navegable — TASK-1498 (esta task solo emite el
  encadenamiento de hermanos que aquel enumera).
- Cualquier UI del workbench — TASK-1474.
- Auto-score / puntaje de candidatos — harness de evaluación (TASK-1458).

## Detailed Spec

Determinismo: la reproducibilidad depende de que el proveedor honre la seed. Por eso la pieza load-bearing
es registrar la seed EFECTIVA en el manifiesto (no solo la declarada): con seed fija y ruta/inputs
idénticos, un relaunch reproduce en la medida en que el modelo sea determinista bajo esa seed. Para
proveedores que no exponen seed, el relaunch es best-effort y así se declara. La misma seed efectiva es la
base del barrido de `variate` (seed-sweep parte de la seed base y la varía de forma controlada).

Encadenamiento de linaje: `relaunch` y `variate` usan el mismo mecanismo de linaje que el edit de
TASK-1490 (`lineage`, `parentRights`), de modo que TASK-1498 pueda leer el árbol padre→hijo (relaunch =
reproducción, variantes = hermanos) sin un modelo paralelo.

Delta de estrategias: mantener el enum de estrategias conservador y ampliable; empezar con `seed-sweep`
(el más útil para reproducibilidad/exploración) y `guidance-jitter`. No introducir estrategias que
requieran vocabulario de un proveedor específico en el contrato.

## Rollout Plan & Risk Matrix

Cambio additive y gated. Todos los campos nuevos son opcionales; los comandos nacen `policy-blocked` en
`ui`/`mcp` y el kill switch del Lab fail-closes. No toca payroll/finance/identity/release. Rollback =
revert del PR en efeonce-globe y/o no registrar los comandos + flag OFF.

### Slice ordering hard rule

- Slice 1 (receta + captura efectiva) es foundation y DEBE ir primero: Slice 2 y Slice 3 dependen de la
  receta efectiva registrada para poder reproducir/variar.
- Slice 2 (relaunch) y Slice 3 (variate) pueden ir en paralelo una vez cerrado Slice 1, pero cada uno
  registra su comando al cerrar su slice.
- Slice 4 (coverage/parity closeout + doc gate) va último, después de que ambos comandos estén registrados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fan-out de `variate` multiplica el gasto y agota el day cap del workspace | spend fence | medium | `aggregateHardCapCredits` + `count` máximo acotado + fence per-variant valida ANTES de gastar; degradación honesta al agotarse | reserva rechazada `day_cap_exceeded` en el fence |
| El adapter finge honrar una palanca no soportada (seed inexistente) → falsa reproducibilidad | provider seam | medium | `recipeUnsupportedKnobs` explícito en el manifiesto + relaunch legacy marcado best-effort | diff entre receta declarada y efectiva en el manifiesto |
| Bytes crudos re-suben por la API en un relaunch/variante | private-ingest | low | inputs reusados por `sha256`/rights, nunca por bytes; contrato solo acepta hash | rechazo de payload con bytes |
| Un caller varía/relanza un experimento de otro workspace | tenant boundary | low | `requireOwnedExperiment` por `workspaceId` en ambos handlers | acceso denegado / not-found por workspace |
| Los campos nuevos rompen callers existentes | contract | low | todos opcionales; `prepare`/`execute`/`cancel` sin cambio de firma; manifiestos legacy válidos | fallo de `pnpm check`/`pnpm build` en efeonce-globe |

### Feature flags / cutover

- Coverage `policy-blocked` en `ui`/`mcp` (metadata del spine) es el gate de exposición: los comandos son
  operables solo por carriles internos hasta que TASK-1474 levante el gate de UI.
- Kill switch del Lab (`LabKillSwitchPort`, `model-lab.ts:107`) fail-closes toda operación del Lab,
  incluidos `variate`/`relaunch`. Revert: no registrar los comandos + PR revert. Tiempo de revert: <10 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; campos opcionales, sin migración | <10 min | sí |
| Slice 2 | No registrar `relaunch` / revert PR | <10 min | sí |
| Slice 3 | No registrar `variate` / revert PR | <10 min | sí |
| Slice 4 | Revert del registro/coverage/doc delta | <10 min | sí |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verde.
2. Suite de domain verde con casos nuevos (receta round-trip, relaunch fiel y legacy best-effort, variate
   con tope agregado y day cap).
3. Harness cross-surface del spine (TASK-1481) verde: `variate`/`relaunch` aparecen con coverage esperado.
4. Ejercitar el adapter (fake determinista) confirmando receta efectiva + `recipeUnsupportedKnobs`.
5. Producción real queda detrás del gate de TASK-1474 (capacidad `policy-blocked`); no hay smoke prod
   propio en esta task.

### Out-of-band coordination required

`N/A — repo-only change` (efeonce-globe); reusa credenciales/config de proveedor ya provisionadas del
Model Lab. Coordinar el shape del encadenamiento de linaje con TASK-1498 antes de cerrar Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `LabGenerationRecipeV1` existe en contracts, es transport-neutral (sin vocabulario de proveedor) y
      `recipe?` es declarable en `PrepareExperimentPayloadV1`.
- [ ] `ExperimentAttemptManifestV1` registra la receta EFECTIVA + `recipeUnsupportedKnobs`; el adapter
      captura la seed efectiva (incluida la auto-asignada) por el provider seam, nunca por SDK directo.
- [ ] `globe.lab.experiment.relaunch` re-mintea un experimento desde la receta resuelta + ruta + inputs +
      edit source del original, con linaje encadenado y re-fenced; original legacy sin receta = reproducción
      marcada best-effort.
- [ ] `globe.lab.experiment.variate` hace fan-out de N variantes con delta de receta controlado, cada una
      fenced per-run y contra el day cap, con `aggregateHardCapCredits` que corta el fan-out antes de gastar;
      linaje de hermanos emitido.
- [ ] Ambos comandos registrados en el spine con coverage `ui`/`mcp` `policy-blocked`; parity cross-surface
      verde.
- [ ] Spend fence y private-ingest intactos; ningún caller varía/relanza fuera de su workspace; sin fuga de
      bytes/costo vendor/margen.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verde + suite de domain verde.

## Verification

- `cd ../efeonce-globe && pnpm check`
- `cd ../efeonce-globe && pnpm build`
- `cd ../efeonce-globe && pnpm test` (o el runner de tests del domain) con casos de receta/relaunch/variate
- Ejercicio del adapter (fake determinista) para receta efectiva + `recipeUnsupportedKnobs`
- Harness cross-surface del spine (TASK-1481) para parity de los comandos nuevos

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete`
      al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1474, TASK-1498)

- [ ] Delta de cierre agregado a `GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (fila TASK-1496)

## Follow-ups

- Coordinar con TASK-1498 el shape del encadenamiento de linaje (relaunch = reproducción, variantes =
  hermanos) para el grafo de exploración.
- Al levantar el gate de UI (TASK-1474), abrir `ui`/`mcp` en el coverage de `variate`/`relaunch` con su
  verificación de producción.
- Evaluar sub-capability propia para `variate` si el gasto multiplicado justifica un grant fino separado
  de `globe.lab.experiment.run`.

## Open Questions

- ¿Reusar `globe.lab.experiment.run` para `variate`/`relaunch` o crear una sub-capability para el fan-out
  (gasto multiplicado)? `[verificar con el modelo de capabilities del spine]`
- Set final y naming de `LabVariationStrategy` (¿solo `seed-sweep` + `guidance-jitter` en V1?).
- Máximo de `count` para `variate` (propuesta: 8) y shape exacto del marcador best-effort en un relaunch
  legacy.
- Estado del store durable (TASK-1465) al momento de tomarla: si sigue in-memory, confirmar que la receta
  efectiva persiste en el manifiesto igual.
