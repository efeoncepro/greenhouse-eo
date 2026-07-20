# TASK-1499 — Globe Brief Direction / Interpretation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
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
- Blocked by: `none`
- Branch: `task/TASK-1499-globe-brief-direction-interpretation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introducir el paso "Dirección" del Globe Studio Workbench: un reader gobernado que **interpreta y parafrasea el brief antes de estimar** ("así entendimos tu brief") y declara las **decisiones de dirección** que tomaría (sujeto, estilo, luz, encuadre, mood, paleta, formato), separando lo que el operador dijo explícito de lo que la plataforma infirió, con supuestos, preguntas abiertas y confianza. Es **read-only**: nunca muta el brief ni el experimento. La interpretación pasa por un **seam gobernado de texto** (LLM detrás de un port/adapter, nunca un SDK de provider directo), y la capacidad nace con Full API Parity (reader transport-neutral, `ui`/`mcp` `policy-blocked` hasta promoción).

## Why This Task Exists

Hoy **nada interpreta el brief**. `prepareExperiment` (`packages/domain/src/model-lab.ts:222-264` en `efeonce-globe`) solo valida el payload y lo almacena; el único campo creativo es un `prompt?: string` plano (`packages/contracts/src/index.ts:321`). El experimento salta directo de `prepared` a `estimated`/`running` sin que el operador vea cómo la plataforma entendió su intención ni qué decisiones de dirección implicará el resultado. El diseño del workbench (fuente de verdad del intent, más adelantado que `TASK-1474`) modela una **agencia creativa completa** donde el paso "Dirección" es el momento en que la plataforma devuelve una lectura del brief y sus decisiones antes de gastar. Sin este reader, el operador estima a ciegas: no hay un "así entendimos tu brief" ni una superficie donde corregir la interpretación antes de reservar crédito. El gap está catalogado en la categoría ② del análisis de brecha (`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`, fila **Dirección**).

Además, `efeonce-globe` **no tiene todavía un cliente de texto/LLM canónico**: el seam de provider existente (`packages/provider-contract/src/index.ts`, `CreativeProviderAdapter`) es para media creativa (imagen/video/audio/3D), no para razonamiento de texto (`grep` de `anthropic|genai|generateText` = 0 en `packages/`). Interpretar el brief exige un **seam de interpretación de texto nuevo**, análogo al de media y sujeto a la misma regla: el seam es sagrado, nunca un SDK de provider directo dentro del dominio.

## Goal

- Un reader gobernado y transport-neutral `globe.lab.experiment.direction` `[verificar nombre wire]` que devuelva una **interpretación del brief** (`BriefDirectionV1`) para un experimento del workspace del caller, sin mutar estado.
- Un **seam de interpretación de texto** (port + adapter) que sea el ÚNICO lugar donde se invoca un LLM para interpretar, detrás del kill switch, con impl fake determinista para tests y adapter real por el cliente de texto gobernado de Globe (nunca un SDK de provider directo).
- La interpretación declara **decisiones de dirección** (dimensión + valor + `source: explicit|inferred`), supuestos, preguntas abiertas y confianza, de modo que el operador vea qué es del brief y qué infirió la plataforma antes de estimar.
- Capacidad con **Full API Parity**: reader canónico en el registry del spine, `ui`/`mcp` `policy-blocked` hasta promoción; http/sdk/cli/worker/e2e disponibles. Nexa y los demás consumers la operan por construcción una vez promovida — cero integración específica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (fuente del gap — fila "Dirección")
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (spine: trusted context, coverage, conformance; repatriación pendiente por TASK-1492)
- `../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (Model Lab: readers/commands, kill switch, spend fence; repatriación pendiente por TASK-1492)
- `.claude/skills/greenhouse-globe/SKILL.md` (contrato de arquitectura de Globe; boundary Globe↔Greenhouse, provider seam sagrado)

Reglas obligatorias:

- **Boundary DURO Globe↔Greenhouse:** el CÓDIGO vive en `efeonce-globe`; Greenhouse gobierna lifecycle/docs/evidencia. No mover runtime a Greenhouse ni tocar el registry de tasks desde Globe.
- **Provider seam sagrado:** la interpretación se invoca DETRÁS de un port/adapter gobernado, NUNCA con un SDK de provider (Anthropic/Gemini/OpenAI) importado directo en el dominio. El seam de texto sigue el mismo patrón que `CreativeProviderAdapter`/`LabRunnerPort` (impl fake determinista para tests + adapter real; kill switch fail-closed).
- **Read-only:** el reader NUNCA muta el experimento almacenado ni el brief. Solo lee `stored.request` (workspace-scoped) y devuelve una proyección. No escribe `pgmigrations`, no transiciona el estado del experimento, no reserva crédito creativo.
- **Tenant-safe:** derivar el workspace de `TrustedCommandContextV1`; reusar el patrón `loadOwnedExperiment`/`requireOwnedExperiment` — un experimento de otro workspace nunca es legible.
- **Full API Parity nativo:** la lógica vive en el primitive (`packages/domain`), no en un consumer; la UI (`TASK-1474`) es cliente del reader, no dueña de la interpretación.
- **Sin secretos ni bytes crudos al wire:** el brief y su interpretación son server-internal donde corresponda; los errores se sanitizan; ningún prompt crudo, PII ni identificador de provider cruza al caller ni al log.

## Normative Docs

- `docs/tasks/to-do/TASK-1474-globe-professional-studio-workbench.md` (superficie consumidora del reader — el panel "Dirección").
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` (patrón de seam gobernado + private-ingest ya establecido; referencia de estilo para el seam de texto).

## Dependencies & Impact

### Depends on

- **TASK-1481** — Globe API Contract Spine (`complete`): trusted context, `CapabilityRegistry`, coverage/conformance harness, surfaces http/sdk/cli/worker/e2e. Dependencia **satisfecha** (por eso `Blocked by: none`).
- **TASK-1490** — Cross-Model Edit/Refine (`complete`): establece el patrón de seam gobernado + private-ingest sobre el que se apoya el seam de texto.
- **Model Lab runtime** en `efeonce-globe`: `packages/domain/src/model-lab.ts` (readers/commands, `ModelLabDependencies`, kill switch, `loadOwnedExperiment`), `packages/contracts/src/index.ts` (`GLOBE_LAB_READERS`, `PrepareExperimentPayloadV1`, `StoredExperimentRequestV1`).
- **Compone con TASK-1493** (Structured Brief Composition) — NO es blocker: si `1493` aterriza primero, el interpreter lee ingredientes tipados; si no, interpreta el `prompt` plano. Declarar el punto de extensión.

### Blocks / Impacts

- **TASK-1474** — Globe Professional Studio Workbench: consume este reader para renderizar el paso "Dirección". Sin él, ese paso queda sin backend.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (tipo `BriefDirectionV1`, `GLOBE_LAB_READERS.direction`)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (registro del reader + handler + `BriefInterpreterPort` en `ModelLabDependencies`)
- `../efeonce-globe/packages/domain/src/brief-interpreter.ts` `[verificar — módulo nuevo]` (port + fake determinista + hashing/cache)
- `../efeonce-globe/apps/creative-runner/src/brief-interpreter-adapter.ts` `[verificar — módulo nuevo]` (adapter real por el cliente de texto gobernado)
- `../efeonce-globe/packages/sdk/src/index.ts` (surface del reader en el harness de conformance)
- `docs/tasks/to-do/TASK-1499-globe-brief-direction-interpretation.md` (esta task; Greenhouse gobierna lifecycle/docs)

## Current Repo State

### Already exists

- Registry + surfaces del spine (`TASK-1481`, `complete`): `CapabilityRegistry`, `TrustedCommandContextV1`, coverage manifest, conformance http/sdk/cli/worker/e2e.
- Model Lab con readers `get`/`status`/`evidence` (`GLOBE_LAB_READERS`, `packages/contracts/src/index.ts:224-229`) y su patrón de lectura tenant-safe (`loadOwnedExperiment`/`requireOwnedExperiment`, `model-lab.ts`).
- `StoredExperimentRequestV1` (`model-lab.ts:47`) conserva el brief autorizado del caller (`prompt`, `capability`, `referenceRoute`, `authorizedInputs`) — la entrada que el interpreter lee.
- Coverage manifest `LAB_COVERAGE` con `ui: policy-blocked` / `mcp: policy-blocked` y el resto `available` (`model-lab.ts:120-129`) — plantilla exacta para el nuevo reader.
- Kill switch (`LabKillSwitchPort`, `assertLabEnabled`) y spend fence (`SpendFencePort`) como referencia de gating.

### Gap

- **Nada interpreta el brief.** `prepareExperiment` solo valida + almacena (`model-lab.ts:222-264`). No hay campo ni reader `direction`, ni tipo `BriefDirectionV1`.
- **No hay cliente de texto/LLM en Globe.** El seam de provider (`provider-contract`) es solo media creativa; `grep anthropic|genai|generateText` = 0 en `packages/`. Falta el seam de interpretación de texto (port + adapter fake/real).
- **No hay separación explícito/inferido** de decisiones de dirección, ni supuestos/preguntas abiertas/confianza expuestos como contrato.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/domain`, `apps/creative-runner`, `packages/sdk`); Greenhouse gobierna lifecycle/docs.
- Future candidate home: `remain-shared`
- Boundary: reader canónico `globe.lab.experiment.direction` + `BriefInterpreterPort` (seam de texto gobernado); el reader vive en el spine de Globe, sin crear apps/packages nuevos. Consumers autorizados: UI del workbench (TASK-1474, `policy-blocked` hasta promoción), SDK/HTTP/CLI/worker/e2e y, tras promoción, MCP/Nexa por construcción.
- Server/browser split: 100% server. El brief, su hash, el prompt de interpretación y la llamada al LLM son server-internal; el browser solo recibe la proyección `BriefDirectionV1` saneada.
- Build impact: `none` — no se agrega dependencia pesada nueva al dominio; el adapter de texto reusa el cliente de texto gobernado de Globe (secreto propio de Globe, resuelto server-side). El home exacto de ese cliente se confirma en Discovery (ver Open Questions).
- Extraction blocker: `provider constraint` — la interpretación depende de un provider LLM detrás del seam; el reader no es deployable independiente del runtime del creative-runner que hospeda el adapter.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `StoredExperimentRequestV1` (brief autorizado del experimento, en el store del Model Lab de `efeonce-globe`); el reader es derivado, no fuente.
- Consumidores afectados: `UI (TASK-1474), SDK, HTTP, CLI, worker, e2e; MCP/Nexa tras promoción`
- Runtime target: `worker` (creative-runner en `efeonce-globe`) + `staging` para evidencia

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/index.ts` (`GLOBE_LAB_READERS`, `PrepareExperimentPayloadV1`, `TrustedCommandContextV1`); coverage/conformance del spine (`TASK-1481`).
- Contrato nuevo o modificado: reader `globe.lab.experiment.direction` `[verificar nombre]` + tipo `BriefDirectionV1` + `BriefInterpreterPort` en `ModelLabDependencies`.
- Backward compatibility: `compatible` (aditivo: reader nuevo + tipo nuevo + port nuevo inyectado; ningún contrato existente cambia de forma).
- Full API parity: la interpretación vive en el primitive (`packages/domain`), expuesta como reader canónico; UI/Nexa/MCP son clientes del mismo reader, sin lógica duplicada por consumer.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla mutada. Lee el `StoredExperimentV1.request` del store del Model Lab (in-memory hoy; `TASK-1465` lo reemplaza). Cache de interpretación por `briefHash` `[verificar store durable]`.
- Invariantes que no se pueden romper:
  - El reader **NUNCA** muta el experimento, el brief ni el estado (`state` intacto; sin `store.update`).
  - Un experimento de otro workspace **NUNCA** es legible (tenant boundary vía `TrustedCommandContextV1`).
  - El LLM se invoca **SOLO** detrás de `BriefInterpreterPort`; **NUNCA** un SDK de provider directo en el dominio.
  - `source: 'inferred'` marca toda decisión que la plataforma dedujo — nunca se presenta lo inferido como explícito del operador.
  - Con kill switch OFF, el reader fail-closes (no llama al LLM) y devuelve postura `not-available`, nunca un dato inventado.
- Tenant/space boundary: `workspaceId` derivado de `TrustedCommandContextV1`; mismo predicado que los readers `get`/`status`/`evidence` (`loadOwnedExperiment`).
- Idempotency/concurrency: read idempotente. La interpretación se **memoiza por `briefHash`** (sha256 del brief normalizado): el LLM se invoca a lo sumo una vez por brief distinto; lecturas repetidas devuelven la interpretación cacheada (estabilidad + costo acotado). Sin locks (read-only).
- Audit/outbox/history: `none` con rationale — read-only advisory; la evidencia relevante (qué brief, qué modelo interpretó, confianza) viaja en la proyección `BriefDirectionV1` (`briefHash`, `model`, `modelVersion`), no en un log mutante. Correlación vía `correlationId` del contexto.

### Migration, backfill and rollout

- Migration posture: `none` (aditivo; sin schema nuevo — store in-memory hoy).
- Default state: `flag OFF` — seam de interpretación detrás de un flag/kill switch de Globe (default `false`); reader registrado pero `ui`/`mcp` `policy-blocked`.
- Backfill plan: `N/A` — no hay datos que backfillear; la interpretación se computa on-read.
- Rollback path: `flag off + revert PR` (aditivo, reversible; sin migración que revertir).
- External coordination: secreto del provider de texto propio de Globe (resuelto server-side) + flag en el runtime del creative-runner. `[verificar]` nombre de flag y cliente de texto canónico de Globe.

### Security and access

- Auth/access gate: `capability` — `GLOBE_LAB_EXPERIMENT_CAPABILITY` (`globe.lab.experiment.run`), el mismo gate de los readers del Lab, sobre `TrustedCommandContextV1`.
- Sensitive data posture: el brief puede contener texto de cliente; se trata server-internal, no se loggea crudo, no cruza a terceros fuera del seam gobernado.
- Error contract: errores sanitizados; ningún prompt crudo, stack ni identificador de provider al caller. Capturar con el equivalente `captureWithDomain` de Globe `[verificar]`.
- Abuse/rate-limit posture: costo acotado por la **cache por `briefHash`** (una interpretación por brief) + kill switch. Sin reserva de crédito creativo (no es un run creativo); postura de billing del texto = follow-up/open question.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (lint + typecheck + tests del monorepo); tests unitarios del interpreter fake + del reader (read-only invariant, denegación cross-workspace, kill-switch fail-closed, estabilidad de cache).
- DB/runtime checks: `N/A` DB (read-only, sin migración); verificar que el reader **no** llama `store.update` (test de no-mutación).
- Integration checks: smoke del adapter real contra el provider de texto en `staging` (interpretación de un brief real) tras flip del flag; verificar postura `not-available` con flag OFF.
- Reliability signals/logs: correlación por `correlationId`; `[verificar]` si Globe expone una señal de disponibilidad del interpreter.
- Production verification sequence: (1) `pnpm check && pnpm build` verdes en Globe; (2) reader visible en el harness de conformance con `ui`/`mcp` `policy-blocked`; (3) staging flag ON + interpretar brief real + validar proyección + no-mutación; (4) monitor de costo/latencia con cache activa.

### Acceptance criteria additions

- [ ] Source of truth (`StoredExperimentRequestV1`), contract surface (reader `globe.lab.experiment.direction` + `BriefDirectionV1` + `BriefInterpreterPort`) y consumers están nombrados con paths reales.
- [ ] Invariantes de no-mutación, tenant boundary y idempotencia (cache por `briefHash`) explícitos.
- [ ] Postura de migración/rollback explícita y proporcional (aditivo, flag OFF, revert PR).
- [ ] Evidencia runtime listada (Globe `pnpm check`/`build`, tests de no-mutación y cross-workspace, smoke de staging).
- [ ] Datos sensibles: errores canónicos/sanitizados, seam gobernado, sin leaks de brief crudo ni de provider.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI:** la interpretación vive en `packages/domain` (reader + port), no en el panel de TASK-1474.
- [ ] **Modelada como reader/recurso canónico**, no como click-handler: `globe.lab.experiment.direction` registrado en el registry del spine.
- [ ] **Read** expuesto como reader canónico tenant-safe; no hay write (read-only advisory), por lo que no aplica command semantics de escritura.
- [ ] **Capability + grant:** reusa `GLOBE_LAB_EXPERIMENT_CAPABILITY` (el gate ya existe); no introduce capability nueva que gatee escritura. `[verificar]` si el modelo de grants de Globe requiere registrar el reader aparte.
- [ ] **Camino programático declarado:** reader disponible en http/sdk/cli/worker/e2e; `ui`/`mcp` `policy-blocked` hasta promoción (entonces Nexa/MCP por construcción).
- [ ] **Sin integración Nexa-específica:** un primitive, muchos consumers.
- [ ] **Parity check = SÍ:** la interpretación del brief tiene contrato gobernado a nivel capability → todos los consumers la operan por construcción tras promoción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Seam de interpretación de texto gobernado (port + fake + adapter)

- Definir `BriefInterpreterPort` en `ModelLabDependencies` (`packages/domain/src/model-lab.ts`): `interpret(input: { experiment: StoredExperimentV1; correlationId: string }) => Promise<BriefDirectionV1>`.
- Módulo `packages/domain/src/brief-interpreter.ts` `[verificar]` con: normalización del brief, cómputo de `briefHash` (sha256), cache por hash e impl **fake determinista** para tests (espejo del patrón `LabRunner` fake).
- Adapter real `apps/creative-runner/src/brief-interpreter-adapter.ts` `[verificar]` que invoca un **LLM de texto real (Claude / Anthropic o ChatGPT / OpenAI)** detrás del port, siguiendo el **mismo seam de provider** que los adapters de media de Globe (`VertexCreativeAdapter` keyless, `FalCreativeAdapter` con key propia; `apps/creative-runner/src/*-adapter.ts`), detrás del kill switch; nunca un SDK de provider importado en `packages/domain`. **Secreto propio de Globe** — `globe-anthropic-api-key` o `globe-openai-api-key`, siguiendo el patrón `globe-fal-api-key` / `globe-gemini-api-key`, resuelto server-side en el creative-runner; **NUNCA** la key de Greenhouse (boundary: Globe posee sus propios secretos de provider, nunca compartidos). Que Greenhouse ya tenga cuenta Anthropic/OpenAI solo hace trivial aprovisionar la key Globe-scoped en el Secret Manager de Globe (misma cuenta de vendor, secreto separado).
- Verificación: `pnpm check` verde; el fake produce una `BriefDirectionV1` estable para un brief dado.

### Slice 2 — Contrato `BriefDirectionV1` + reader read-only con cache

- Agregar `GLOBE_LAB_READERS.direction` `[verificar nombre]` y el tipo `BriefDirectionV1` en `packages/contracts/src/index.ts`.
- Registrar el reader en `registerModelLabCapabilities` con `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`); handler que: carga el experimento del workspace (`loadOwnedExperiment`), llama a `deps.interpreter.interpret(...)`, devuelve la proyección. **Sin `store.update`.**
- Memoización por `briefHash`: lecturas repetidas del mismo brief no re-invocan el LLM.
- Verificación: test de no-mutación (el `state` y el `request` del experimento quedan idénticos), test de denegación cross-workspace, test de kill-switch fail-closed (`not-available`).

### Slice 3 — Conformance, surfaces y evidencia

- Cablear el reader en el harness de conformance del spine (`packages/sdk`): visible en http/sdk/cli/worker/e2e; `ui`/`mcp` `policy-blocked` confirmado.
- Tests de estabilidad de cache (dos lecturas → una sola invocación del interpreter) y de saneo de errores (sin leak de brief/provider).
- Smoke en `staging` con el adapter real tras flip del flag: interpretar un brief real, validar `BriefDirectionV1` (paráfrasis + decisiones explícito/inferido + supuestos + preguntas + confianza), confirmar no-mutación.
- Verificación: `cd ../efeonce-globe && pnpm check && pnpm build` verdes.

## Out of Scope

- **Composición estructurada del brief / Prompt Studio / recetas** — TASK-1493. Aquí se interpreta el brief tal como exista (plano hoy, estructurado si 1493 aterriza), no se rediseña su forma.
- **Análisis de referencias / Style DNA** (extraer paleta/estilo de una imagen) — TASK-1494. La Dirección interpreta el brief textual, no inspecciona bytes de referencia.
- **Estimate previewable + gate de aprobación humana + lifecycle de run** — TASK-1469. La Dirección precede al estimate; no lo calcula ni aprueba.
- **El panel/UI "Dirección"** del workbench — TASK-1474 (consumer). Aquí solo el backend.
- **Auto-scoring / evaluación del candidato** — el harness nunca auto-puntúa; esta task no toca evaluación.
- **Mutar el brief o el experimento** — explícitamente prohibido; read-only.
- **Ledger comercial de créditos / billing de la llamada de texto** — TASK-1468; el costo de interpretación se acota por cache, su contabilidad es open question.

## Detailed Spec

**Forma propuesta de `BriefDirectionV1`** (`[verificar]` nombres de campo contra convención del spine):

```ts
export type BriefDirectionDimension =
  | 'subject' | 'style' | 'light' | 'framing' | 'mood' | 'palette' | 'format';

export type BriefDirectionDecisionV1 = Readonly<{
  dimension: BriefDirectionDimension;
  value: string;
  source: 'explicit' | 'inferred'; // separa lo que dijo el operador de lo que infirió la plataforma
}>;

export type BriefDirectionV1 = Readonly<{
  schemaVersion: '1';
  experimentId: string;
  briefHash: string;                 // sha256 del brief normalizado (provenance + cache key)
  interpretationSummary: string;     // "así entendimos tu brief"
  decisions: readonly BriefDirectionDecisionV1[];
  assumptions: readonly string[];    // supuestos donde el brief calló
  openQuestions: readonly string[];  // ambigüedades a resolver antes de gastar
  confidence: 'high' | 'medium' | 'low';
  model: string;                     // provenance del interpreter
  modelVersion: string;
  availability: 'available' | 'not-available'; // 'not-available' con kill switch OFF
}>;
```

**Flujo del reader:** `dispatch(reader, query)` → `loadOwnedExperiment(context, query, deps)` (tenant-safe) → si kill switch OFF ⇒ devolver `availability: 'not-available'` sin llamar LLM → `deps.interpreter.interpret({ experiment, correlationId })` (memoiza por `briefHash`) → devolver `BriefDirectionV1`. Cero `store.update`.

**Punto de extensión TASK-1493:** el interpreter lee `experiment.request`. Hoy solo hay `prompt?: string`. Si 1493 aterriza, `request` traerá ingredientes tipados; el interpreter debe preferirlos y degradar al `prompt` plano si no existen. Declarar esa rama sin bloquear.

**Seam de texto — provider concreto y frontera del secreto.** `efeonce-globe` **no tiene hoy** cliente de texto/LLM (el seam de provider actual, `packages/provider-contract`, es solo media creativa; `grep anthropic|genai|generateText` = 0 en `packages/`). Esta task **agrega** el primero: un adapter de texto real detrás de `BriefInterpreterPort`, usando **Claude (Anthropic)** o **ChatGPT (OpenAI)** — la elección concreta se decide en Discovery (Anthropic recomendado por consistencia con el ecosistema, salvo que costo/latencia inclinen a OpenAI). El adapter **replica el patrón de los adapters de media** de Globe (`VertexCreativeAdapter`, `FalCreativeAdapter`): `estimate` no toca red, la llamada facturable está aislada, el output al dominio es una proyección saneada. **La key es de Globe, no de Greenhouse** — se aprovisiona `globe-anthropic-api-key` / `globe-openai-api-key` en el Secret Manager de Globe (patrón `globe-fal-api-key` / `globe-gemini-api-key`), resuelta server-side en el creative-runner. El boundary es duro: aunque Greenhouse tenga cuentas Anthropic/OpenAI, la key que Globe usa es un secreto propio, nunca la de Greenhouse (misma cuenta de vendor si se quiere, secreto separado). El dominio (`packages/domain`) **nunca** importa el SDK del provider; solo conoce el port.

## Rollout Plan & Risk Matrix

Cambio **aditivo** en el runtime de `efeonce-globe`: reader nuevo + tipo + seam de texto, todo detrás de flag/kill switch y con `ui`/`mcp` `policy-blocked`. No toca payroll/finance/identity/SCIM ni migraciones destructivas; el rollback es revert de PR + flag OFF.

### Slice ordering hard rule

- Slice 1 (seam/port + fake + adapter) → Slice 2 (contrato + reader que consume el port) → Slice 3 (conformance + surfaces + evidencia).
- Slice 2 depende de que el port exista (Slice 1). Slice 3 depende de que el reader esté registrado (Slice 2). No ejecutar fuera de este orden.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo/latencia del LLM en lecturas repetidas | provider (texto) / worker | medium | Cache por `briefHash` (una interpretación por brief) + kill switch | costo/latencia por `correlationId` en logs |
| Fuga de brief crudo / PII / prompt a log o caller | identity / N/A | low | Server-internal, errores sanitizados, sin log de prompt crudo | revisión de logs; error contract |
| Bypass del seam (SDK de provider directo en dominio) | N/A (arquitectura) | low | Port obligatorio + review + `[verificar]` lint contra import de SDK | code review / grep de imports |
| No-determinismo confunde al operador | UI (consumer) | medium | Cache estable + `confidence` + `source: explicit/inferred` | feedback del operador |
| Reader muta estado por error | Model Lab store | low | Test de no-mutación (state + request idénticos) | test rojo en CI |

### Feature flags / cutover

- Flag de Globe `GLOBE_BRIEF_INTERPRETER_ENABLED` `[verificar nombre]` (default `false`) que gatea el seam de interpretación en el runtime del creative-runner. Con OFF, el reader devuelve `availability: 'not-available'`. Flip a `true` post-smoke verde en staging. Revert: flag a `false` + redeploy del worker.
- Coverage del reader: `ui`/`mcp` `policy-blocked` hasta promoción explícita de ruta (mismo patrón que el resto del Lab).
- Nota: los flags de Globe viven en el runtime de Globe, no en el `FEATURE_FLAG_STATE_LEDGER.md` de Greenhouse (ese ledger es para `*_ENABLED` de Greenhouse).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (port/adapter aditivos, sin consumers en prod) | <10 min | sí |
| Slice 2 | revert PR + flag OFF (reader aditivo, `policy-blocked`) | <10 min | sí |
| Slice 3 | flag OFF (deja el reader inerte) + revert si hace falta | <5 min | sí |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes.
2. Reader visible en conformance con `ui`/`mcp` `policy-blocked`; tests de no-mutación + cross-workspace + kill-switch verdes.
3. Staging: flag OFF → reader devuelve `not-available`. Flip ON → interpretar brief real → validar `BriefDirectionV1` completo + no-mutación del experimento.
4. Monitor de costo/latencia con cache activa (segunda lectura no invoca LLM).
5. Promoción de ruta `ui`/`mcp` es decisión aparte (habilita TASK-1474 / Nexa), fuera de esta task.

### Out-of-band coordination required

- Secreto del provider de texto propio de Globe (resuelto server-side) + declaración del flag en el runtime del creative-runner. `[verificar]` cliente de texto canónico de Globe y nombre exacto del flag antes de shipping. Sin coordinación con Azure/HubSpot/Notion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el reader `globe.lab.experiment.direction` `[verificar nombre]` registrado en el registry del spine con `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`, http/sdk/cli/worker/e2e `available`).
- [ ] El reader devuelve `BriefDirectionV1` con paráfrasis (`interpretationSummary`), decisiones con `source: explicit|inferred`, supuestos, preguntas abiertas, confianza y provenance (`briefHash`, `model`, `modelVersion`).
- [ ] La interpretación se invoca **solo** por `BriefInterpreterPort`; no hay import de SDK de provider en `packages/domain`.
- [ ] El reader **no muta** el experimento ni el brief (test verde: `state` y `request` idénticos antes/después).
- [ ] Un experimento de otro workspace no es legible (test de denegación cross-workspace verde).
- [ ] Con kill switch OFF el reader devuelve `availability: 'not-available'` sin llamar al LLM (test verde).
- [ ] Dos lecturas del mismo brief invocan el interpreter una sola vez (cache por `briefHash`; test verde).
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes en el commit de cierre.

## Verification

- `cd ../efeonce-globe && pnpm check`
- `cd ../efeonce-globe && pnpm build`
- Tests focales: no-mutación, denegación cross-workspace, kill-switch fail-closed, estabilidad de cache, saneo de errores.
- Smoke en `staging` con adapter real (flag ON) contra un brief real; validar `BriefDirectionV1` + no-mutación.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] chequeo de impacto cruzado sobre TASK-1474 (consumer) y TASK-1493 (punto de extensión del brief)
- [ ] la interpretación quedó verificada en runtime real (staging) o el cierre reporta `code complete, rollout pendiente`

## Follow-ups

- **Store durable de la cache de interpretación** por `briefHash` cuando `TASK-1465` reemplace el store in-memory (hoy la memoización es efímera por proceso).
- **Contabilidad/billing** de la llamada de texto de interpretación (¿consume algo del ledger comercial de TASK-1468?) — hoy fuera de scope, acotada por cache.
- **Seam de interpretación compartido** con TASK-1494 (Style DNA analiza referencias por un seam análogo): evaluar unificar el cliente de texto/visión gobernado de Globe en un solo primitive de "interpretación".
- **Promoción de ruta `ui`/`mcp`** del reader (habilita TASK-1474 y Nexa) — decisión de gobernanza aparte.

## Open Questions

- Nombre wire canónico del reader (`globe.lab.experiment.direction` vs. otro) y si el modelo de grants de Globe exige registrar un reader nuevo aparte del `GLOBE_LAB_EXPERIMENT_CAPABILITY`. `[verificar]`
- **Resuelto (dirección):** el interpreter usa un LLM de texto real — **Claude (Anthropic)** o **ChatGPT (OpenAI)** — detrás de `BriefInterpreterPort`, con la impl real en el creative-runner siguiendo el patrón de los adapters de media (`VertexCreativeAdapter`/`FalCreativeAdapter`), y **secreto propio de Globe** (`globe-anthropic-api-key` / `globe-openai-api-key`, patrón `globe-fal-api-key`/`globe-gemini-api-key`), nunca la key de Greenhouse (boundary). **Residual a decidir en Discovery:** cuál de los dos providers (Anthropic recomendado), el nombre exacto del secreto y si conviene extraer un `TextInterpreterAdapter` en `packages/provider-contract` para compartirlo con TASK-1494 (Style DNA) desde el inicio.
- ¿La interpretación debe cachearse por workspace o es global por `briefHash`? (Un brief idéntico en dos workspaces ¿comparte interpretación?) Preferencia inicial: cache por `briefHash` sin cruzar tenant en la lectura.
