# TASK-1669 — Growth SEO: agentes e IA para el plan diario gobernado

## Delta 2026-08-29 — el bloqueo de secuencia quedó levantado: la cola priorizada está en producción

`TASK-1700` cerró `complete` con el release `b7f74c95a2afcf66f2c2d82dbd4a5ad4f7617471`: flag ON en los
dos runtimes (revisión activa del ops-worker `ops-worker-00613-qrh`) y scheduler
`ops-seo-work-queue-materialize` `ENABLED` (`0 10 * * *` America/Santiago), con corrida real
verificada fila por fila. Sale del `Blocked by`; quedan `TASK-1667` y `TASK-1668`.

🔴 **El bloqueo se levanta, la obligación no.** La razón por la que esta task lo declaraba sigue en
pie palabra por palabra: si el plan diario reintroduce su propio ordenamiento, nacen **dos
ordenamientos que se contradicen** y el operador ve dos "#1" distintos. El `context-reader` de esta
task consume `readSeoWorkQueue` como envoltorio; no ordena, no puntúa y no reimplementa el score
versionado. Ahora eso es verificable contra un runtime vivo, no contra una promesa de contrato.

## Delta 2026-08-28 — la cola existe en código: el `context-reader` nace como envoltorio y el ordenamiento ya no es una promesa

`TASK-1700` entregó sus siete slices a `develop` (`962d22118` … `9020d6421`) con la migración
`migrations/20260828224403660_task-1700-seo-work-queue.sql` (más `…_task-1700-work-queue-keyset-collation.sql`
y `…_task-1700-work-queue-decide-capability.sql`). Lo que el Delta 2026-08-15 anticipó como contrato a
firmar ya es código al que se puede apuntar, así que esta task deja de tener margen para engendrar un
segundo ordenamiento — y gana objetos concretos contra los cuales escribirse.

**Lo que el `context-reader.ts` envuelve, literalmente:**

- `readSeoWorkQueue` (`src/lib/growth/seo/work-queue/reader.ts`). Trae orden canónico
  `score_band ASC, priority_score DESC NULLS LAST, normalized_keyword COLLATE "C" ASC`, paginación por
  keyset sobre un snapshot inmutable, y **binding de tenant server-side**: no acepta un `organizationId`
  del request, el `seoTargetId` define la org. El adapter no vuelve a resolver tenant.
- `staleness` es del CONTRATO, no de la UI: `fresh` | `stale` (pasó `expires_at`) | `absent` (nunca se
  materializó). 🔴 `absent` **no es un error**: es un target elegible cuya cola todavía no corrió. El
  plan diario tiene que rendir ese estado explícitamente y no colapsarlo en "no hay trabajo".

**El "Priority ordering V1" retirado ya no es un hueco: es `PRIORITY_SCORE_CONFIGS`.** Vive en
`src/lib/growth/seo/work-queue/score-versions.ts`, versión publicada `incremental-clicks-v1`
(`windowDays 28`, `targetPosition 5`, ventana 8–20, percentil 0,75, piso 10 impresiones, pisos de curva
1000/5). Es **append-only** y hay un test que congela su huella: mover un umbral obliga a una versión
nueva y a mover `ACTIVE_PRIORITY_SCORE_VERSION`, jamás a editar la vigente. Esta task no puede cambiar el
orden sin cambiar esa versión — y ahora eso lo impone un test, no una convención.

**El contrato de reproducibilidad que esta task pedía ya está implementado, y se hereda en vez de
inventarse:**

- `input_snapshot_hash` — con `UNIQUE (organization_id, seo_target_id, priority_score_version,
  input_snapshot_hash)`, o sea idempotencia de materialización.
- `expires_at` — TTL de 26 h en `WORK_QUEUE_RUNTIME_CONFIG` (`snapshotTtlHours`), fuera del objeto
  versionado a propósito porque no mueve el orden.
- `staleness` derivado en el reader.

Consecuencia dura para el `Plan freshness and stale handling` de esta task: el `expiresAt` y el
`inputSnapshotHash` de cada recommendation **salen del snapshot que el plan leyó**, no de un cálculo
propio. 🔴 **Un plan no puede declararse más fresco que el snapshot del que salió.**

**Cuatro cosas que esta task debe hacer distinto:**

1. `queue-order-parity.test.ts` ya tiene contra qué correr: se compara contra `readSeoWorkQueue`, no
   contra una reimplementación del orden.
2. **No escribir un ledger de feedback propio.** `recordSeoWorkQueueDecision`
   (`src/lib/growth/seo/work-queue/record-decision.ts`) existe, es append-only y **no ejecuta nada**. El
   feedback `accepted`/`dismissed` de esta task mapea ahí. Ojo con la semántica ya definida:
   `dismissed` y `done` son **terminales** y retiran el sujeto de los snapshots siguientes
   (`isRetiredSubject`); `deferred` y `accepted` siguen apareciendo. Un segundo libro de las mismas
   decisiones es exactamente lo que la cola existe para evitar.
3. **La deduplicación ya ocurrió, y el merger no la repite.** `dedupeBySubject` colapsa por keyword
   normalizada con `ORIGIN_ACTION_PRECEDENCE` (`consolidation` → `gsc_striking_distance` →
   `declared_target` → `aeo_gap` → `competitor_gap` → `discovery_candidate`), y los orígenes suprimidos
   viajan en `score_breakdown_json.alsoSurfacedBy`. El policy merger deduplica por `action` dentro de lo
   que la cola ya entregó; **no** re-deduplica por criterio propio ni descarta `alsoSurfacedBy`.
4. **Bandas 2 y 3 llegan con `priorityScore = null` a propósito** (`measured_without_curve` y
   `no_measured_demand`). El plan **NUNCA** las rinde como `0`: eso fabricaría una medición.

**`Depends on` — verificado hoy, no hay que agregar nada.** `TASK-1700` ya está declarada tanto en
`### Depends on` como en el campo `Blocked by` desde el Delta 2026-08-15. Lo que cambia es su naturaleza:
deja de ser una dependencia de secuencia sobre una task no escrita y pasa a ser una dependencia de
contrato sobre código en `develop`.

**Realidad de rollout, para que el Discovery de esta task no se sorprenda:**
`GROWTH_SEO_WORK_QUEUE_ENABLED` está **OFF en los dos runtimes** (Vercel y ops-worker) y el scheduler
`ops-seo-work-queue-materialize` está **PAUSADO** — tres frenos independientes, ver
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. **Hay contrato y no hay snapshot todavía**: una consulta
a `greenhouse_growth.seo_work_queue_items` devuelve cero filas y eso no es un defecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-14 — TASK-1659 complete: la intención declarada existe (y `intent` es homónimo)

`TASK-1659` está **complete**. El input `target/intent declarado de 1659/1660` del `seo_researcher`
ya tiene mitad de respaldo real: la intención vive en la membresía (`target` | `opportunity` | `NULL`)
con autor y fecha, y cambiarla cierra una ventana y abre otra. Cuatro ajustes concretos:

- 🔴 **`intent` significa dos cosas distintas dentro del mismo snapshot de evidencia.** El researcher
  recibe, en bullets contiguos, el `intent` **estimado** de los candidates de discovery (search intent
  del proveedor) y el `intent` **declarado** de una membresía (compromiso con el cliente). La lista de
  prohibiciones impide inventar métricas, pero no impide **confundir estos dos**, y un agente los va a
  fundir. Hay que nombrarlos distinto en el bundle en vez de confiar en el contexto.
- **`NULL` es un tercer estado, y hoy es la población entera.** Toda keyword seguida antes del
  2026-08-14 tiene intención `NULL` = "nadie la clasificó". La regla de no inferir del
  `editorial_planner` tiene que decirlo explícito: `NULL` **no** se lee como `opportunity`; un plan
  que cuente "oportunidades" incluyéndolas infla el número con keywords que nadie clasificó.
- **`declared_target_without_owner` todavía no tiene reader donde pararse.** `TASK-1659` entregó un
  **command**, no un reader: ningún reader de `src/lib/growth/seo/**` expone hoy la intención de una
  membresía, y el de `TASK-1660` sigue en `to-do`. Bajo `Readers primero, LLM después`, esa regla de
  fallback y el nivel 2 de prioridad dependen de ese reader — y **`TASK-1659`/`TASK-1660` no figuran
  hoy en `### Depends on`**.
- Invariante de reporte que hereda el plan: objetivos y oportunidades **nunca se promedian**. Un
  objetivo en la posición 60 es la distancia que falta, no un fracaso, y no debe escalar como
  urgencia sólo por su posición cruda.

## Delta 2026-08-14 — TASK-1664 complete: dependencia desbloqueada

- El primitive de discovery existe y está verificado live: `queueKeywordDiscovery` /
  `readKeywordDiscovery` / `recordKeywordDiscoveryAction` (`src/lib/growth/seo/keyword-discovery/`),
  runner async en ops-worker, lanes app/ecosystem y MCP tools (`get_seo_keyword_discovery`,
  `discover_seo_keywords`). Candidatos guardan SOLO procedencia; la métrica vive en el store de
  TASK-1661 (writer compartido `persistKeywordMarketData`). Rollout runtime pendiente (flag OFF,
  scheduler pausado) — no bloquea el trabajo de código de esta task.

## Delta 2026-08-15 — la cola priorizada manda: esta task deja de tener ordenamiento propio

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §3.1 (brecha
S1), §5.2 (la cola como aggregate persistido) y §5.5 (red-team).

🔴 **El modo de falla más probable de este carril no es técnico: es que la cola priorizada se
construya y esta task la ignore.** Hoy 1669 declara su propio `context-reader.ts` y su propia
sección `Priority ordering V1` entre sus archivos owned. Si ambas avanzan en paralelo sin contrato
firmado quedan **dos ordenamientos que discrepan** —uno por score versionado, otro por
`reason_code`— y el operador ve un #1 en la pantalla y otro en el plan del día. No hay mitigación
técnica para eso: **la única mitigación real es de secuencia**.

Verificado en disco el 2026-08-15: **`src/lib/growth/seo/agents/` existe y está vacío** — cero
archivos. Ni el `context-reader` ni el ordenamiento están escritos todavía. **El momento de corregir
esto es ahora, y cuesta cero**: no hay código que reescribir, sólo una task que ajustar.

Cambios aplicados al cuerpo:

- `### Depends on` suma `TASK-1700` —la cola priorizada: aggregate persistido
  `greenhouse_growth.seo_work_queue_{snapshots,items}`, append-only, materializado por job en
  ops-worker, con `priority_score_version` en columna— más `TASK-1659` y `TASK-1660`, que el Delta
  2026-08-14 ya había señalado como ausentes pese a que la regla `declared_target_without_owner` y
  el nivel 2 de prioridad dependen del reader de intención declarada.
- 🔴 **`Priority ordering V1` se retira de los archivos owned de esta task.** Deja de ser código
  propio y pasa a ser **la config versionada de la cola**. Cambiar un peso obliga a
  `priority_score_version` nueva; esta task no puede mover el orden sin mover esa versión.
- `context-reader.ts` **sigue owned, pero como adapter**: envoltorio delgado de `readSeoWorkQueue`
  que agrega lo que el LLM necesita —health/freshness por fuente, redacción, límites— y **no
  reordena nada**.
- Criterio de aceptación nuevo: **test de paridad de orden** contra la cola.
- Se agregan los marcadores `ZONE 2`/`ZONE 3`/`ZONE 4` que faltaban: sin ellos `pnpm task:lint`
  clasificaba esta task como `legacy=1` y se saltaba las reglas de template (modular placement,
  acceptance checkboxes, rollout, backend/data contract). Ahora corren.

Invariantes de la cola que esta task hereda y no puede violar: **nunca se promedian orígenes** —un
objetivo declarado en la posición 60 es distancia por recorrer, no urgencia—; un origen caído se
declara en `origin_health_json` y **no baja el score de los demás**; recomputar es fila nueva, jamás
`UPDATE`.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|ai|nexa|data`
- Blocked by: `TASK-1667`, `TASK-1668` (la cola priorizada quedó `complete` el 2026-08-29 y corre en producción, así que su bloqueo de secuencia está levantado; ver Delta 2026-08-29)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega una capa de agentes e IA que convierta el estado real del módulo SEO en un **plan diario
explicable y accionable**, sin convertir a la IA en un operador autónomo. El plan combina tres roles
especializados —`seo_researcher`, `editorial_planner` y `qa_measurement`— sobre readers canónicos,
devuelve recomendaciones estructuradas con evidencia y expone la misma capacidad a app, Nexa y MCP.
Toda acción que cambie estado queda en `propose → confirm → execute`; la IA nunca llama DataForSEO,
WordPress, GSC, AEO, tracking ni commands de negocio directamente.

## Why This Task Exists

Con 1664–1668 el producto podrá descubrir candidates, decidir un trabajo editorial, entregar un draft
privado, verificarlo y observar outcomes. Sin una capa de coordinación, el operador debe leer cinco
superficies para saber qué hacer hoy y Nexa sólo puede responder con contexto general. La oportunidad
de IA no es producir una lista genérica de ideas: es **priorizar el siguiente paso permitido con la
evidencia disponible**, declarar lo que falta y respetar costo, permisos, lifecycle y revisión humana.

La IA debe tener tres límites explícitos:

1. No sustituye el oficio SEO ni convierte una estimación en una verdad.
2. No puede escribir en ninguna fuente de negocio sólo porque el prompt lo solicite.
3. No puede ocultar un fallo de reader, una falta de baseline, un block de QA o la ausencia de datos.

Por eso el primer producto de esta task es un plan advisory versionado, no un “agente que hace todo”.
El plan puede sugerir una corrida, un work item, un refresh, una revisión de QA o esperar más datos;
la ejecución sigue perteneciendo a commands existentes y a un humano confirmado.

## Goal

- Un operador puede pedir el plan SEO del día para una organización/target y recibir un máximo
  bounded de recomendaciones ordenadas por prioridad, cada una con evidencia, confianza, costo
  potencial, owner, expiración y command permitido.
- El plan distingue entre `measured`, `estimated`, `declared`, `derived` y `unavailable`, y explica
  qué reader falló o qué dato falta antes de recomendar.
- Tres roles realizan tareas separadas: research de candidates/seeds, planificación editorial y
  QA/measurement/iteration. Cada rol tiene contrato de entrada/salida, vocabulario cerrado y fallback
  determinista.
- La IA usa los providers/model router canónicos del repositorio, con schema validation, presupuesto,
  telemetry y redacción; no introduce SDK, endpoint, prompt store o proveedor paralelo.
- Nexa expone un tool read-only `get_seo_daily_plan` y el mismo reader se puede consumir por app,
  ecosystem y MCP; los writes siguen el governed action runtime.
- Si el modelo está deshabilitado, falla, excede presupuesto o devuelve schema inválido, el producto
  entrega `baseline_fallback` honesto o `unavailable`, nunca una recomendación inventada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1, §4, §7, §8, §9, §10, §13, §17)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- **Readers primero, LLM después.** El snapshot del plan se construye desde commands/readers de SEO,
  editorial, QA/outcome, AEO y measurement. El agente no consulta tablas, endpoints internos ni
  providers de forma ad hoc.
- 🔴 **La cola es la autoridad de orden.** El plan diario consume `readSeoWorkQueue` (`TASK-1700`) y
  **preserva su orden**. Esta task no tiene score de prioridad propio, no reordena y no "mejora" el
  ranking de la cola: cambiar el orden se hace cambiando la config versionada de la cola y subiendo
  su `priority_score_version`.
- **Una capacidad, muchos consumers.** `generateSeoDailyPlan`/`readSeoDailyPlan` es el primitive;
  Nexa, app, ecosystem y MCP no tienen prompts ni ranking propio.
- **La IA no es fuente de verdad.** La respuesta del modelo es un dato no confiable que se valida
  contra schema, vocabulario, refs y permisos. No puede crear un ID, capability, URL o métrica que no
  esté en el snapshot.
- **No hay acción implícita.** La recomendación contiene `commandKey`, pero `requiresHumanApproval=true`
  siempre para writes/costo/efecto recurrente. La ejecución usa el command existente y su confirmación.
- **No duplicar AEO.** El agente puede ver estado de grounded query/citation vía reader autorizado,
  pero no crea prompt sets, no corre grader y no une tablas SEO/AEO.
- **No duplicar Content Factory.** El planner recomienda crear/revisar work item o brief; no genera
  blocks, copy final ni publica.
- **Presupuesto separado.** El costo de inferencia IA se controla por el presupuesto/telemetry AI
  canónico; el costo DataForSEO conserva `enforceSeoRunEntitlement` y el ledger SEO. El plan sólo
  informa costos potenciales, no reserva ni gasta provider budget.
- **Fallback etiquetado.** `ai`, `baseline_fallback`, `partial` y `unavailable` son modos distintos
  visibles en el DTO y en telemetry.
- **No almacenar prompts/completions crudos.** Se persisten hash/version de prompt y recomendaciones
  estructuradas; cualquier evidencia sensible se referencia, no se copia.

## Normative Docs

- `docs/tasks/to-do/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md`
- `docs/tasks/to-do/TASK-1665-growth-seo-keyword-discovery-workbench.md`
- `docs/tasks/to-do/TASK-1666-growth-seo-grounded-query-bridge.md`
- `docs/tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md`
- `docs/tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-model-router.ts`
- `src/lib/nexa/nexa-system-prompt.ts`
- `src/lib/nexa/actions/registry.ts`
- `src/lib/ai/`
- `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- 🔴 **`TASK-1700`** — **la cola priorizada única** (`readSeoWorkQueue` /
  `materializeSeoWorkQueue` / `recordSeoWorkQueueDecision` sobre
  `greenhouse_growth.seo_work_queue_{snapshots,items}`, append-only, con `priority_score_version` y
  `score_breakdown_json` en el primer slice). **Dependencia de secuencia, no sólo de datos**: la
  cola tiene que llegar antes para que esta task no engendre un segundo ordenamiento. El plan diario
  **consume** el orden de la cola; no lo produce ni lo corrige.
- `TASK-1659` (complete) — modelo de intención declarada (`target` | `opportunity` | `NULL`) en la
  membresía del set. Entregó un **command**, no un reader.
- `TASK-1660` — superficie de keywords objetivo y su reader: es donde se para
  `declared_target_without_owner` y el nivel de prioridad correspondiente. Sin ese reader, la regla
  de fallback no tiene dónde apoyarse.
- `TASK-1664` — discovery runs/candidates/market and reader.
- `TASK-1667` — work items, brief/private lifecycle, editorial refs.
- `TASK-1668` — QA evidence, outcomes, coverage, next actions y no-inference status.
- `TASK-1666` — optional grounded-query state/citations; no direct prompt store access.
- `src/lib/nexa/nexa-model-router.ts` y providers/model governance existentes — se reutilizan; no se
  agrega un proveedor nuevo por esta task.
- `src/lib/nexa/actions/registry.ts` y governed action runtime — ejecutar recomendaciones debe usar el
  flujo ya existente.

### Blocks / Impacts

- `TASK-1665` — puede mostrar un panel/sidecar de plan diario y acciones sugeridas, siempre con estados
  disabled si una dependency o flag está OFF.
- Nexa conversation — agrega `get_seo_daily_plan` como tool contextual, con scope y disclosure.
- MCP Greenhouse/gateway — entrada en `src/mcp/greenhouse/tool-manifest.ts` + `registerTool` en `server.ts`
  en el MISMO PR (sin entrada el servidor no construye, `TASK-1780`); después parity/allowlist del gateway,
  que conserva su revisión humana. No se auto-federan writes.
- EPIC-022 — convierte el camino diario en un sistema asistido y auditable, no en una UI de listados.
- Futura task de agent action execution — sólo si el operador decide autorizarla; esta task deja el
  boundary listo pero no la implementa.

### Files owned

> Verificado 2026-08-15: `src/lib/growth/seo/agents/` existe en disco y está **vacío**. Nada de lo
> que sigue está escrito todavía, así que retirar el ordenamiento propio no cuesta una línea de
> refactor.

- `src/lib/growth/seo/agents/contracts.ts`
- `src/lib/growth/seo/agents/context-reader.ts` — **adapter, no reader propio**: envuelve
  `readSeoWorkQueue` (TASK-1700) y le agrega health/freshness, redacción y límites para el LLM.
  **No reordena, no filtra por criterio propio y no recalcula prioridad.**
- `src/lib/growth/seo/agents/orchestrator.ts`
- `src/lib/growth/seo/agents/researcher.ts`
- `src/lib/growth/seo/agents/editorial-planner.ts`
- `src/lib/growth/seo/agents/qa-measurement.ts`
- `src/lib/growth/seo/agents/baseline-fallback.ts`
- `src/lib/growth/seo/agents/safety.ts`
- `src/lib/growth/seo/agents/telemetry.ts`
- `src/lib/growth/seo/agents/__tests__/contracts.test.ts`
- `src/lib/growth/seo/agents/__tests__/orchestrator.test.ts`
- `src/lib/growth/seo/agents/__tests__/fallback.test.ts`
- `src/lib/growth/seo/agents/__tests__/safety.test.ts`
- `src/lib/growth/seo/agents/__tests__/parity.test.ts`
- `src/lib/growth/seo/agents/__tests__/queue-order-parity.test.ts` `[nuevo]` — paridad de orden
  contra `readSeoWorkQueue`

**No owned (y deliberadamente):** el ordenamiento de prioridad. Vive en la config versionada de la
cola (`TASK-1700`), no en esta task.
- `migrations/[timestamp]_task-1669-seo-agent-plan.sql`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-system-prompt.ts`
- `src/lib/nexa/__tests__/seo-daily-plan-tool.test.ts`
- `src/app/api/admin/growth/seo/agents/daily-plan/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/daily-plan/route.ts`
- `src/mcp/greenhouse/seo/daily-plan.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/seo-daily-agent-plan.md`

## Current Repo State

### Already exists

- Nexa tiene contract de tools, runtime contextual, model router, telemetry y governed action runtime.
- Greenhouse ya tiene readers SEO y patrones de capability/entitlement; 1664–1668 fijan los contracts
  que el plan debe consumir.
- `src/lib/ai/` tiene providers y transporte canónicos que deben gobernar cualquier llamada de modelo.
- Content Factory y AEO ya tienen estados, validators y evidencias que pueden exponerse como DTOs.

### Gap

- No existe un snapshot unificado y bounded del día SEO que agregue señales sin mezclar sus fuentes.
- No existen roles de agente con output cerrado para research, planificación editorial y QA/measurement.
- Nexa no tiene un tool SEO diario ni un resultado con evidence refs/cost disclosure.
- No hay persistencia versionada de plan runs/recomendaciones ni fallback verificable.
- No hay policy que impida que el LLM invente IDs, cambie el tenant, ejecute commands o trate texto de
  una página como instrucciones del sistema.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/agents/` para contracts/orchestration; `src/lib/nexa/` sólo como
  adapter de tool/system prompt; model routing permanece en los providers canónicos.
- Future candidate home: `domain-package`
- Boundary: `readSeoDailyPlan`, `generateSeoDailyPlan`, `get_seo_daily_plan` y el structured
  recommendation contract son la API canónica. Los roles no escriben tablas de dominio ni llaman
  providers de negocio.
- Server/browser split: snapshot de org, prompts, model keys, raw model response, telemetry privada y
  policies son server-only. El browser/Nexa recibe recomendaciones redactadas y evidence refs.
- Build impact: `none`; se reutiliza el model router/AI stack, sin SDK nuevo ni credenciales en browser.
- Extraction blocker: tenant/capability context, AI budget/telemetry, governed actions y readers
  cross-domain; una futura extracción debe conservar estas fronteras.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_agent_plan_runs` y
  `seo_agent_recommendations` como snapshot/audit de la recomendación; no reemplazan los SoT de SEO,
  Content Factory, AEO o measurement.
- Consumidores afectados: `Nexa`, `UI`, `MCP`, `ecosystem`, `ops-worker` si se usa evaluación bounded,
  telemetry/AI budget.
- Runtime target: `Vercel` para request/read, provider runtime canónico para inferencia, `staging` y
  `production` con flags OFF; nunca provider desde browser.

## ADR Gate

Antes de habilitar inferencia o agregar el tool Nexa, registrar o vincular en
`docs/architecture/DECISIONS_INDEX.md` una decisión que resuelva:

- autonomía máxima V1 (`advisory`, `requiresHumanApproval=true`, sin writes autónomos);
- provider/model router canónico, presupuesto, retención y redacción de telemetry;
- persistencia de `plan_runs`/recommendations sin prompts/completions crudos;
- contract único para app/Nexa/ecosystem/MCP y condición de federación externa;
- fallback determinista, vocabulario cerrado, prompt injection y stale handling;
- límites de costo/llamadas por organización y separación frente al ledger DataForSEO.

La task no inventa un número ADR. Si no existe una decisión vigente, el implementador debe proponerla
antes de activar cualquier provider o ampliar el action registry.

### Contract surface

- Contrato existente a respetar:
  - readers de 1664, 1667 y 1668;
  - `NexaToolName`, `NexaToolResult`, `NexaToolInvocation`, `NexaRuntimeContext`;
  - `getNexaToolDeclarations`/`executeNexaTool` y `propose_action`;
  - model router/providers/telemetry existentes.
- Contrato nuevo:
  - `buildSeoAgentContext(input)` → snapshot normalizado, bounded y con source refs;
  - `generateSeoDailyPlan(input)` → `planRunId`, mode, recommendations, evidence refs, usage y
    `requiresHumanApproval`;
  - `readSeoDailyPlan(input)` → último plan autorizado o plan por ID, cursor y freshness;
  - `get_seo_daily_plan` → tool Nexa read-only con mismo DTO redactado;
  - `get_seo_daily_plan` MCP read-only, si el allowlist/parity gate lo aprueba;
  - `recordSeoAgentRecommendationFeedback` opcional para marcar accepted/dismissed/stale, sin ejecutar
    el command recomendado.
- Backward compatibility: `gated`; agrega un tool/reader y tablas nuevas, no cambia readers SEO ni el
  contract de Nexa existente para otros dominios.
- Full API parity: el plan se genera una vez por primitive y cada consumer sólo cambia presentación;
  no se permiten prompts distintos por UI/Nexa/MCP que alteren el veredicto.

### Data model and invariants

#### `greenhouse_growth.seo_agent_plan_runs`

| Campo | Tipo | Regla |
|---|---|---|
| `plan_run_id` | `uuid` | PK; no se recicla |
| `organization_id` | `uuid` | tenant server-side |
| `seo_target_id` | `uuid` nullable | target scope explícito; si hay varios, el request debe elegir |
| `as_of` | `timestamptz` | instante del snapshot, no del prompt solamente |
| `input_snapshot_hash` | `text` | hash de IDs/versiones/as-of, sin prompt raw |
| `status` | `text` | `queued|running|succeeded|partial|fallback|unavailable|failed` |
| `mode` | `text` | `ai|baseline_fallback|mixed|unavailable` |
| `model_provider`/`model_id` | `text nullable` | metadata redacted; null en fallback |
| `prompt_version` | `text` | versión registrable; no prompt completo |
| `tokens_in/out` | `integer nullable` | usage; nunca texto |
| `cost_usd` | `numeric nullable` | costo IA separado del ledger DataForSEO |
| `latency_ms` | `integer nullable` | runtime observable |
| `reader_health_json` | `jsonb` | cobertura/freshness por fuente |
| `error_code` | `text nullable` | cerrado y saneado |
| `idempotency_key` | `text` | unique por org + scope + input hash + day/actor |
| `created_at/completed_at` | `timestamptz` | server-side |

#### `greenhouse_growth.seo_agent_recommendations`

Una fila es una recomendación estructurada, no el completion completo:

| Campo | Tipo | Regla |
|---|---|---|
| `recommendation_id` | `uuid` | PK |
| `plan_run_id` | `uuid` | pertenece al mismo tenant |
| `agent_role` | `text` | `seo_researcher|editorial_planner|qa_measurement` |
| `action` | `text` | vocabulario cerrado y registrado |
| `subject_ref` | `text` | ref opaca a candidate/work item/outcome/target |
| `reason_code` | `text` | enum explicable; no sólo texto libre |
| `evidence_refs_json` | `jsonb` | refs + as-of + signal kind |
| `confidence` | `text` | `high|medium|low|not_calculable` |
| `estimated_cost_json` | `jsonb nullable` | sólo estimación; `requiresCostConfirmation` cuando aplique |
| `requires_human_approval` | `boolean` | V1 siempre `true` para cualquier acción mutante/coste |
| `command_key` | `text nullable` | command allowlisted, nunca función o URL libre |
| `status` | `text` | `proposed|accepted|dismissed|stale|executed_elsewhere` |
| `expires_at` | `timestamptz` | evita ejecutar una recomendación con snapshot stale |
| `model_trace_json` | `jsonb` | role/mode/prompt version/fallback, no completion |

Invariantes:

- Una recommendation no puede contener un `subject_ref` que no esté en el input snapshot o que otro
  reader no pueda resolver con el mismo tenant.
- `command_key` sólo puede pertenecer a un registry cerrado: `queueKeywordDiscovery`,
  `recordKeywordDiscoveryAction`, `createSeoEditorialWorkItem`, `requestSeoEditorialDraft`,
  `recordSeoEditorialEvidence`, `openSeoEditorialIteration`, `trackKeywords` y `wait_for_data` como
  acción no mutante. Cada command conserva su propio capability/cost gate.
- Nunca se recomienda `publish`, `activate_prompt_set`, `run_grader`, `write_wordpress_directly`,
  `delete_evidence` o `alter_entitlement`.
- `requires_human_approval` no puede ser `false` en V1 para commands; el validator lo fuerza aunque el
  modelo devuelva false.
- La recomendación no es un hecho: se puede marcar stale/dismissed sin modificar el plan original.
- La respuesta no puede elevar permisos ni cambiar `organizationId`, `seoTargetId`, locale o actor.

### Agent roles and exact contracts

#### `seo_researcher`

Input permitido:

- oportunidades GSC medidas y freshness;
- candidates de 1664 con source endpoint, volume/difficulty/intent estimados y costo/as-of;
- target/intent declarado de 1659/1660;
- histórico de acciones `dismissed|selected|tracked` y capacidad restante;
- configuración de mercado y límites, sin secretos.

Output permitido:

- `select_candidate`, `queue_discovery`, `track_keyword_after_confirmation`, `dismiss_candidate`,
  `wait_for_market_data`, `no_action`;
- hasta 5 recommendations con subject refs existentes, evidencia, reason code y costo potencial.

Prohibiciones:

- no llamar Labs ni crear runs;
- no afirmar volumen/dificultad si falta el dato;
- no convertir `search_volume=0` o `null` en baja demanda;
- no usar competencia como dificultad orgánica;
- no hacer keyword gap si la fuente pertenece a 1662.

#### `editorial_planner`

Input permitido:

- candidates/keyword opportunities seleccionados;
- target, intent y audiencia declarados;
- URLs/owners/canibalización disponibles;
- work items, drafts privados, brief validation, grounded-query refs;
- oferta/servicio/CTA/locale/tone de la organización sólo si el reader los autoriza.

Output permitido:

- `create_editorial_work_item`, `request_grounded_query_draft`, `review_draft`,
  `refresh_title_or_ctr`, `expand_answer`, `fix_technical_issue`, `wait_for_human_brief`;
- elegir `create|refresh|fix` sólo si la evidencia y los campos mínimos están completos;
- indicar missing fields y no crear una recomendación ejecutable cuando falta canonical owner, CTA,
  audience, intent o evidence.

Prohibiciones:

- no generar copy final, Gutenberg blocks, Elementor manifests ni claims;
- no afirmar que una grounded query es keyword exacta;
- no aprobar/activar prompt, no publicar y no cambiar canonical/robots/schema;
- no convertir `consolidate` en refresh automáticamente.

#### `qa_measurement`

Input permitido:

- lifecycle/evidence/outcomes de 1668;
- Content Factory validation/readback/QA findings;
- rank/GSC/AEO/GA4/HubSpot por source/as-of/coverage;
- ventanas y baselines ya definidos.

Output permitido:

- `run_qa`, `review_citations`, `fix_technical_issue`, `update_cta`, `wait_for_more_data`,
  `open_iteration`, `close_no_action`;
- reason code, evidence refs, coverage y confidence;
- `insufficient_data` cuando una fuente crítica no existe.

Prohibiciones:

- no marcar `qa_passed`, `published_verified`, `observed` ni `evidence_supported`;
- no reclamar causalidad por correlación temporal;
- no llenar una métrica ausente con cero ni cruzar AEO/SEO por SQL;
- no disparar capture, publish, rollback o iteration command automáticamente.

### Orchestration order

El orchestrator ejecuta siempre esta secuencia bounded:

1. **Scope resolver:** deriva org, target, capabilities, timezone y actor. Si falta scope, detiene.
2. **Context reader:** obtiene readers canónicos en paralelo con límites, registra health/as-of y
   redacción. Una fuente que falla no permite al LLM inventar su contenido.
3. **Researcher:** analiza discovery/oportunidades y devuelve candidatos/seed recommendations.
4. **Editorial planner:** consume research + editorial lifecycle; no recibe acceso de escritura.
5. **QA/measurement:** consume QA/outcomes y recomienda verificación, espera o iteración.
6. **Policy merger:** deduplica por subject/action, **conserva el orden de la cola** (no aplica
   prioridad propia), cierra vocabulario, fuerza `requiresHumanApproval`, filtra refs inexistentes y
   establece expiry.
7. **Telemetry/audit:** persiste plan run y recommendations estructuradas; no raw prompt/completion.

Límites V1:

- máximo 1 context snapshot y 1 plan run por request;
- máximo 3 llamadas de modelo, una por rol, o una llamada determinista de fallback;
- máximo 50 candidates, 20 work items/outcomes y 10 recomendaciones finales;
- timeout y token/cost budget del model router; si se excede, `partial`/fallback;
- no recursion entre agentes, no agent-to-agent tool calls y no loop autónomo.

### Structured output V1

El modelo debe devolver JSON validable contra schema versionado:

```ts
type SeoAgentRecommendationV1 = {
  role: 'seo_researcher' | 'editorial_planner' | 'qa_measurement'
  action: string
  subjectRef: string
  reasonCode: string
  evidenceRefs: string[]
  confidence: 'high' | 'medium' | 'low' | 'not_calculable'
  missingData?: string[]
  estimatedCost?: { kind: 'dataforseo' | 'ai' | 'none'; usd?: number; disclosure: string }
  commandKey?: string
  requiresHumanApproval: true
  rationaleCode: string
}
```

La explicación visible se puede renderizar desde `reasonCode`, evidence refs y copy canónico. El texto
libre del modelo se trata como comentario no confiable: no se usa como comando, SQL, URL o capability.

### Baseline fallback V1

Cuando IA está OFF, falla o entrega schema inválido, producir reglas deterministas sólo con readers:

| Condición | Recommendation | Razón |
|---|---|---|
| candidate nuevo con mercado disponible y sin decisión | `select_candidate` | `candidate_has_market_evidence` |
| keyword GSC en striking distance con URL dueña | `refresh_title_or_ctr` | `gsc_striking_distance` |
| keyword objetivo sin URL dueña y brief mínimo completo | `create_editorial_work_item` | `declared_target_without_owner` |
| draft private con block | `fix_technical_issue` | `qa_block_present` |
| published unverified | `run_qa` | `publication_not_verified` |
| outcome sin baseline/cobertura | `wait_for_more_data` | `outcome_insufficient_data` |
| outcome observado con deterioro y evidencia suficiente | `open_iteration` | `observed_decline_requires_review` |
| ningún dato confiable | `no_action` | `no_reliable_signal` |

El fallback debe marcar `mode=baseline_fallback`, no simular que una IA hizo la recomendación.

### Nexa/MCP contract

`get_seo_daily_plan` recibe sólo:

```ts
{
  seoTargetId?: string
  asOf?: string
  refresh?: boolean
  limit?: number
}
```

El target se valida server-side; `refresh=true` puede generar un plan si la flag/capability/budget lo
permite, pero no ejecuta recomendaciones. El resultado incluye:

- `available`, `summary`, `source: 'mixed'|'postgres'|'none'`, `scopeLabel`, `generatedAt`;
- `planRunId`, `mode`, `freshness`, `readerHealth`;
- recomendaciones con `action`, `subjectRef` redactado, reason, evidence refs y disclosure;
- `suggestedNextStep` como texto seguro y `requiresHumanApproval=true`;
- nota explícita de “la recomendación no ejecuta cambios”.

No se debe crear un `seo-chat` separado. Nexa es otro consumer del mismo primitive y usa
`propose_action` si el operador pide avanzar a una acción gobernada.

### Safety, privacy and prompt injection

- Delimitar todo texto de candidate, title, HTML, page content, provider result y user note como
  `untrusted_data`; nunca incluirlo en un mensaje de sistema sin etiqueta.
- El prompt no puede recibir secrets, cookies, raw HTML completo ni datos PII no necesarios.
- Validar URLs/refs contra snapshot; no seguir instrucciones contenidas en una página o keyword.
- Rechazar JSON con campos desconocidos, arrays fuera de límite, command keys no allowlisted,
  `requiresHumanApproval=false`, IDs nuevos o cross-tenant refs.
- Sanitizar rationale y error antes de persistir/mostrar; no guardar completion raw.
- Si safety validation falla, conservar sólo `schema_invalid`/`unavailable` y usar fallback.

### Observability and AI telemetry

Persistir/emitir únicamente:

- plan run, role, provider/model ID, prompt version, mode, input hash, token counts, cost, latency,
  reader health, schema validation, fallback reason y recommendation IDs;
- `seo.agent.plan.started`, `.succeeded`, `.partial`, `.fallback`, `.schema_invalid`,
  `.budget_blocked`, `.recommendation.presented`;
- nunca prompts, completions, claims, raw page content, access tokens ni URLs firmadas.

Correlacionar con `organization_id` redacted/hash, actor/session, `planRunId` y `correlationId`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — context/contract/policy

- Definir snapshot, roles, action vocabulary, reason codes, schemas y límites.
- Implementar el context reader **como adapter de `readSeoWorkQueue`** (health/freshness, redacción,
  límites y tenant boundary encima; cero reordenamiento) sobre los demás readers canónicos.
- Test de paridad de orden contra la cola desde este slice: es la evidencia de que no nacieron dos
  ordenamientos.
- Implementar safety validator, command allowlist y `requiresHumanApproval` hard gate.
- Tests de prompt injection, IDs falsos, refs cross-tenant, budgets y output inválido.

### Slice 2 — orchestrator IA y fallback

- Integrar roles con model router/provider canónico y máximo de tres llamadas bounded.
- Crear researcher/editorial planner/QA-measurement sin acceso directo a comandos de negocio.
- Implementar baseline fallback y merge determinista de recomendaciones.
- Persistir plan runs/recommendations estructuradas, telemetry y feedback stale/dismissed.

### Slice 3 — Nexa, MCP y parity

- Agregar `get_seo_daily_plan` al contract/runtime Nexa, con capability/context y respuesta display-safe.
- Crear route app/ecosystem y read tool MCP sobre el mismo reader.
- Añadir tests de parity que comparen action/evidence/mode/freshness entre consumers.
- Dejar writes sólo como `commandKey` + confirmation; no agregar un endpoint “execute recommendation”.

### Slice 4 — rollout y manual operativo

- Registrar `GROWTH_SEO_AGENT_RECOMMENDATIONS_ENABLED=false` en Feature Flag State Ledger.
- Ejecutar shadow/fallback en staging con fixtures de datos completos, parciales y vacíos.
- Documentar cuándo usar IA, cuándo confiar en fallback, cómo confirmar una acción y cómo revisar
  telemetry/costo.
- Preparar contrato de integración para `TASK-1665` sin implementar UI en esta task.

## Out of Scope

- Un agente autónomo que ejecute commands, publique, trackee, cree grounded queries, corra grader,
  capture providers, haga rollback o cambie permisos sin confirmación.
- Crear un nuevo prompt store, vector DB, framework de agentes, MCP gateway paralelo o SDK provider.
- Generar contenido final, imágenes, audio, Gutenberg blocks, Elementor manifests o claims editoriales.
- Cambiar reglas de ranking, inventar score SEO/AEO combinado o reemplazar readers canónicos.
- 🔴 **Definir, calcular o corregir el orden de prioridad.** Es de `TASK-1700` y de su config
  versionada. Esta task consume el orden de la cola y lo preserva; si el orden está mal, se arregla
  en la cola con `priority_score_version` nueva, nunca acá.
- Llamar DataForSEO/GSC/WordPress/AEO/GA4/HubSpot directamente desde una role implementation.
- Construir el panel visual del workbench; el consumer está en 1665.
- Federar writes de agente al gateway externo sin task/ADR, scope y canaries propios.
- Usar feedback de una recomendación para autoentrenar o cambiar prompt en producción.

## Detailed Spec

### Priority ordering — lo produce la cola, no esta task

🔴 **Esta task NO define un ordenamiento propio** (delta 2026-08-15). El orden lo produce
`readSeoWorkQueue` (`TASK-1700`) con su `priority_score_version` y su `score_breakdown_json`, que es
la **config versionada** de la cola. Lo que la versión anterior de este documento llamaba
`Priority ordering V1` —una escalera de `reason_code` escrita acá— se retira: dos ordenamientos que
discrepan es el modo de falla #1 de la auditoría (§5.5), y el operador no puede ver un #1 en la
pantalla y otro en el plan del día.

Lo que el **policy merger** de esta task sí hace, y sólo eso:

- deduplica por `subject`/`action` (dos roles pueden proponer sobre el mismo objeto);
- cierra el vocabulario de `action`/`reasonCode` y descarta lo que no esté en él;
- fuerza `requiresHumanApproval=true` y filtra refs inexistentes o cross-tenant;
- fija `expiresAt` e `inputSnapshotHash`;
- **preserva el orden que trajo la cola.** Si la cola entrega A, B, C, el plan entrega A, B, C — con
  las que el merger haya descartado ausentes, nunca reordenadas.

Reglas heredadas de la cola que el merger no puede violar: **nunca promediar orígenes** (un objetivo
declarado en la posición 60 es distancia por recorrer, no urgencia); un origen caído se declara en
`origin_health_json` y **no baja el score de los demás**; nada se ordena por volumen, difficulty,
lenguaje del modelo ni por un "impact score" inventado por el LLM.

Ítems que no vengan de la cola —si Discovery encuentra alguna señal que la cola aún no modela— se
adjuntan **después** de los que sí, en un bloque etiquetado y con su razón declarada, jamás
interpolados en el orden de la cola. Esa situación es una brecha de la cola y se reporta como tal,
no se parcha acá.

### Cost and confirmation contract

Cada recommendation que pueda:

- gastar Labs;
- agregar tracking recurrente;
- crear un work item/draft;
- abrir una grounded query;
- solicitar QA/outcome con costo;

debe mostrar `estimatedCost`, `costSource`, `requiresCostConfirmation` y `requiresHumanApproval`. La
IA no reserva ni consume ese costo. El confirmation command vuelve a calcular permisos, cuota,
idempotencia y estado; no confía en los valores del plan, que pueden estar stale.

### Plan freshness and stale handling

- Toda recommendation tiene `expiresAt` y `inputSnapshotHash`.
- Si candidate/work item/outcome cambió después del plan, se marca `stale` y el consumer pide refresh.
- Un plan no se puede ejecutar por ID como si fuera una orden; sólo se puede usar como contexto para
  reabrir el command gobernado.
- Un `subjectRef` que desaparece/no está disponible se muestra como `unavailable`, no se sustituye por
  otro objeto parecido.

### Feedback

El operador puede marcar `accepted`, `dismissed` o `stale` con razón opcional. Esto sólo alimenta
telemetry/reader de experiencia; no cambia la evidencia, no reentrena el modelo y no ejecuta el
command. Si se desea convertir feedback en evaluación offline, debe existir task/eval set separado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **`TASK-1700` (la cola) se mergea ANTES del Slice 1.** No es preferencia de orden: es la única
  mitigación del modo de falla #1 (§5.5 del audit). Si esta task arranca sin la cola, escribe un
  ordenamiento propio y después nadie lo borra.
- Slice 1 (contract/policy) → Slice 2 (orchestrator/fallback) → Slice 3 (Nexa/MCP/parity) → Slice 4
  (shadow/cutover).
- El fallback determinista MUST funcionar antes de habilitar cualquier llamada de modelo.
- Las rutas/Tool pueden estar disponibles para read cuando flag está OFF, pero deben devolver
  `agent_disabled` sin costo ni writes.
- No se agrega una capability de write de agente en esta task; sólo read/plan access y commands
  existentes con sus propias capabilities.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Prompt injection desde title/page/provider | AI/security | high | untrusted delimiters, no raw HTML, schema/policy validator | `seo.agent.schema_invalid` |
| Modelo inventa ID/URL/command | AI/data | high | refs contra snapshot, allowlist cerrada, drop recommendation | `seo.agent.invalid_reference` |
| Agente ejecuta costo o tracking sin confirmación | SEO/finance-like spend | medium | `requiresHumanApproval` forzado + command recheck | `seo.agent.unsafe_action_blocked` |
| Se mezclan fuentes medidas/estimadas | analytics | medium | signal kind/as-of obligatorio y no score único | `seo.agent.mixed_source_warning` |
| Falla un reader y el LLM rellena el vacío | reliability | high | reader health + fallback/unavailable, prompt no invent | `seo.agent.partial` |
| Presupuesto IA se consume en loops | AI/cost | medium | máximo 3 calls, timeout, idempotency, budget gate | `seo.agent.budget_blocked` |
| Se filtra contenido sensible en telemetry | privacy | medium | no raw prompt/completion, redaction test y cardinality guard | `seo.agent.redaction_failed` |
| Nexa/MCP tienen prompt/ranking distinto | parity | medium | primitive único + parity tests/allowlist | `seo.agent.parity_failed` |
| **El plan y la cola muestran un #1 distinto** | producto/confianza | **high si 1700 no llega antes** | la cola es la autoridad de orden; el merger sólo deduplica y filtra; test de paridad de orden en CI desde el Slice 1 | `queue-order-parity.test.ts` en rojo |
| Recommendation stale crea acción incorrecta | workflow | medium | expiry, hash, command re-read y `stale` | `seo.agent.recommendation_stale` |

### Feature flags / cutover

- `GROWTH_SEO_AGENT_RECOMMENDATIONS_ENABLED=false` por defecto.
- Flag OFF: no hay llamada de modelo, no hay plan AI persistido como éxito, no hay recommendation
  ejecutable; el reader puede devolver `agent_disabled` o fallback explícitamente solicitado en test.
- Staging: ejecutar fallback con fixtures; luego shadow AI que persiste telemetry/recommendations no
  ejecutables; después allowlist de una organización para mostrar plan.
- Producción: permitir primero `get_seo_daily_plan` read-only; no habilitar un execute path nuevo.
- Revert: flag OFF, detener requests IA, conservar hashes/telemetry y marcar recommendations stale;
  commands de dominio siguen siendo operables por sus propias rutas gobernadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | deshabilitar parser/orchestrator y conservar sólo schema/migration aditiva | <5 min | sí |
| Slice 2 | flag OFF y no llamar provider; fallback/reader devuelve disabled si no se solicita explícitamente | <5 min | sí |
| Slice 3 | ocultar/deshabilitar tool/route y retirar allowlist MCP si se había añadido; no tocar commands SEO | <5 min | sí |
| Slice 4 | retirar organización allowlisted, dejar flag OFF y marcar planes stale; no borrar evidence | <5 min | sí |

### Production verification sequence

1. Tests de schema, role contracts, bounded limits, command allowlist, tenant isolation y redaction.
2. Validar fallback con snapshots: oportunidad GSC, candidate Labs, draft block, outcome incompleto y
   no data.
3. Deploy staging flag OFF; confirmar cero llamadas de modelo, cero writes y error `agent_disabled`.
4. Ejecutar shadow AI con fixture de prompt injection, ID falso, command publish y respuesta inválida;
   verificar que todas se descartan/fallback.
5. Verificar plan AI válido: tres roles, recomendaciones bounded, evidence refs reales, cost disclosure,
   expiry, `requiresHumanApproval=true` y telemetry sin contenido.
6. Repetir idempotency key y confirmar un plan run único.
7. Comparar DTO app/Nexa/ecosystem/MCP y confirmar mismo plan/mode/freshness.
8. Confirmar que seleccionar una recommendation sólo abre/proporciona el command gobernado y vuelve a
   calcular permisos/costo; no cambia estado durante la lectura.
9. Habilitar una org allowlisted en producción y monitorizar signals/costos antes de ampliar.

### Out-of-band coordination required

- AI platform owner debe confirmar provider/model router, presupuesto, retention y telemetry permitidos.
- Nexa owner debe confirmar naming/availability de `get_seo_daily_plan` y su capability.
- MCP owner debe revisar allowlist/parity antes de federar el read tool; no se habilita write por esta task.
- SEO owner debe aprobar vocabulario de actions/reason codes y las reglas baseline fallback.
- Legal/privacy/creative governance debe validar que el plan no conserve prompts/completions ni contenido
  sensible innecesario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un context reader que compone sólo readers canónicos y reporta health/freshness por fuente.
- [ ] 🔴 **Test de paridad de orden contra la cola**: para un mismo `seoTargetId` y un mismo
  `inputSnapshotHash`, la secuencia de `subjectRef` del plan es **subsecuencia en orden** de la que
  devuelve `readSeoWorkQueue`. El test falla si el plan reordena, aunque el conjunto coincida.
- [ ] El `context-reader` es adapter de `readSeoWorkQueue`: no contiene score, peso, umbral ni
  escalera de `reason_code` propios (verificable por lectura del archivo).
- [ ] El plan expone el `priorityScoreVersion` de la cola que usó; si cambia entre dos planes, se ve.
- [ ] Un origen caído llega como `origin_health_json` degradado y **no** altera el score de los
  demás orígenes ni promedia entre ellos.
- [ ] Existen exactamente tres roles V1: `seo_researcher`, `editorial_planner` y `qa_measurement`,
  con inputs/outputs/prohibiciones documentados.
- [ ] El orchestrator tiene máximo tres llamadas de modelo, límites de candidatos/recomendaciones,
  timeout, budget y no recursion.
- [ ] La output schema es versionada; campos desconocidos, IDs inexistentes, commands no allowlisted
  y `requiresHumanApproval=false` son rechazados.
- [ ] Cada recommendation conserva action, subject ref, reason code, evidence refs, confidence,
  freshness/expiry, estimated cost y `requiresHumanApproval=true`.
- [ ] El modelo no puede llamar DataForSEO, WordPress, GSC, AEO, GA4, HubSpot ni commands de dominio.
- [ ] El plan no puede recomendar publish directo, activate prompt, run grader, delete evidence o
  change entitlement.
- [ ] Existe `baseline_fallback` determinista con reglas verificables y disclosure de modo.
- [ ] Reader failure/partial data produce `partial`, `fallback` o `unavailable`, nunca datos inventados.
- [ ] El costo IA se separa de DataForSEO; el plan no reserva ni gasta presupuesto SEO provider.
- [ ] `seo_agent_plan_runs` y `seo_agent_recommendations` no almacenan prompt/completion raw, secrets,
  HTML completo ni signed URLs.
- [ ] Telemetry incluye provider/model/prompt version, tokens, costo, latencia, mode, validation y
  fallback reason sin contenido sensible.
- [ ] `get_seo_daily_plan` está disponible en Nexa con scope org/target y respuesta display-safe.
- [ ] App, Nexa, ecosystem y MCP usan el mismo plan/readers; cualquier MCP federation requiere parity
  allowlist y permanece read-only.
- [ ] Un recommendation stale no puede ejecutarse; el command vuelve a leer estado, permiso, costo e
  idempotencia antes de mutar.
- [ ] `GROWTH_SEO_AGENT_RECOMMENDATIONS_ENABLED` está en el Feature Flag State Ledger con OFF, shadow,
  allowlist y rollback.
- [ ] Fixture end-to-end prueba researcher → planner → QA/measurement → policy merger sin ejecutar writes.
- [ ] Fixture de prompt injection y acción insegura queda bloqueado y produce señal.
- [ ] El manual explica en lenguaje simple qué hace cada agente, qué no hace y cómo confirma el humano.

## Verification

- `pnpm task:lint --task TASK-1669`
- Tests focales de context reader, role contracts, orchestrator, fallback, safety/redaction, budget,
  stale handling, Nexa tool y parity.
- `pnpm vitest run src/lib/growth/seo/agents/__tests__/queue-order-parity.test.ts` — paridad de orden
  contra `readSeoWorkQueue`.
- Smoke del model router en staging con presupuesto acotado y fixtures no productivos.
- Verificación de migration/read-only queries y tenant isolation.
- Comparación de DTO app/Nexa/ecosystem/MCP.
- `pnpm docs:closure-check`
- `git diff --check -- docs/tasks/to-do/TASK-1669-growth-seo-agentic-daily-plan.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo cruzado con 1664–1668, Nexa, MCP, AI governance y Full API Parity.
- [ ] La evidencia demuestra que el plan es advisory y que no existe write autónomo.

## Delta 2026-08-26 — la parity plana de SEO hacia Nexa no es esta task, y conviene decirlo

Verificado: `src/lib/nexa/nexa-tools.ts` tiene 13 function declarations y **cero del dominio SEO/AEO**;
el registry de acciones gobernadas tampoco tiene ninguna. Esta task posee los cuatro archivos de Nexa
y agrega **una** tool, `get_seo_daily_plan` — que es un **agente compuesto con ordenamiento gobernado**,
no la familia de readers.

Son dos cosas distintas y conviene no mezclarlas:

- **Esta task**: un plan diario compuesto, que además ya cedió su ordenamiento a la cola de `TASK-1700`
  y arrastra sus dependencias.
- **Parity plana**: exponer a Nexa los readers SEO que ya existen y ya viajan por MCP, sin LLM en el
  medio. Por el criterio literal del ADR de Full API Parity, hoy el módulo SEO **no es
  parity-complete**: tiene UI y MCP, no tiene el consumer que declaramos North Star.

Meterlas juntas haría que la parity plana herede los bloqueos de esta task sobre `TASK-1700`,
`TASK-1659` y `TASK-1660` — tres dependencias que no necesita. La recomendación es una task hermana
con `Blocked by: TASK-1669` sólo por propiedad de archivos, no por lógica.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.5.

## Follow-ups

- `TASK-1665` puede incorporar un panel/sidecar visual de plan diario cuando existan wireframe, flow,
  mapping de primitives y GVC evidence; esta task no crea esa UI.
- Una task futura puede implementar ejecución de recommendations confirmadas, pero deberá reutilizar
  commands existentes, approval runtime, capability fina, cost preview y ADR si amplía workflows de agentes.
- Evals offline/benchmark de calidad del plan pueden vivir en una task separada; feedback de usuario no
  reentrena producción por defecto.

## Open Questions

- Confirmar el límite de costo/tokens por organización y si se comparte con Nexa general o tendrá
  allowance SEO separado.
- Confirmar si el primer `get_seo_daily_plan` se expone en MCP interno únicamente o también al gateway
  externo; la exposición externa requiere entitlement B2B verificable.
- Confirmar el vocabulario final de `reasonCode` con SEO practice y el copy de disclosure para clientes.
