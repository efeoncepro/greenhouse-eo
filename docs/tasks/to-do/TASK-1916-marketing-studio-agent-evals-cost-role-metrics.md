# TASK-1916 — Marketing Studio: evaluaciones, costo normalizado y métricas por rol de agente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

- **Grants de `marketing_studio.agent_eval.grade`:** `efeonce_admin`, `efeonce_operations` y `efeonce_account` (decisión
  de Julio Reyes, operador, 2026-09-26; roles verificados en `src/config/role-codes.ts`).
- **Calificadores nominales, uno por disciplina:** la capability es condición necesaria, no suficiente. Califica los
  criterios humanos sólo la persona designada por el operador para la disciplina del rol. **Disciplinas calificadoras
  (operador, 2026-09-26, «de momento»): Medios, SEO/AEO, CRO, Copywriter, Designer y Creativo.** Asignación de roles
  iniciales: planificador de medios → Medios; SEO/AEO → SEO/AEO; copywriter → Copywriter; QA creativo y de marca →
  Creativo (concepto y marca) y Designer (ejecución visual); analista de desempeño → CRO (con Medios para la pauta).
  Reemplaza la rotación que proponía esta task. **Insumo pendiente del operador:** el nombre de la persona de cada
  disciplina. **`efeonce_admin` puede calificar cualquier disciplina sin designación** (rol de máximo privilegio,
  decisión del operador 2026-09-26); la designación nominal restringe a `efeonce_operations` y `efeonce_account`.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de operación híbrida con agentes (§4.7, §4.8, §5.2, §10, §11 preguntas 3, 4 y 7); ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1914 (tarjetas versionadas y compuerta de modos) · TASK-1913 (work items y eventos para métricas) · TASK-1915 Slices 1–3 (ledger de corridas y puerto; las corridas de evaluación en segundo plano necesitan además al menos un adaptador de su Slice 4). Los validadores deterministas y la procedencia vienen de TASK-1909; los límites de canal, de TASK-1905`
- Branch: `efeonce-marketing-studio main (sets, corridas de evaluación, precios, métricas, señales) · Greenhouse develop (capability de calificador, manual servido, docs) · efeonce-mcp rama + PR (sync y versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Pone **evidencia antes de autonomía**. Cada rol de agente tiene un **set de evaluación versionado** de work items de
referencia con rúbrica que separa **chequeos objetivos automáticos** (formato, límites del catálogo de canales, citas
con fuente, «sin dato» en vez de cero, cero `T2` ejecutados, cero tools fuera de lista) de **criterios humanos** que
califica la persona designada para la disciplina del rol (Medios, SEO/AEO, CRO, Copywriter, Designer o Creativo) y **nunca se autocalifican**. Se evalúa por combinación **rol × runtime × modelo** (más
versión de tarjeta y digest de skills): cambiar cualquiera invalida la aprobación vigente. La aprobación de una
evaluación es `T2` y es la compuerta que TASK-1914 consulta para habilitar los modos en segundo plano y programado.
Suma un **catálogo versionado de precios por proveedor** que normaliza a USD el costo de tokens, sesiones alojadas y
horas de contenedor para comparar roles y runtimes; **métricas por rol** calculadas desde Studio (aceptación,
retrabajo, tiempo a aceptación, costo por entregable aceptado, propuestas `T2` confirmadas vs rechazadas, corridas
fallidas por causa, intentos fuera de lista) con señales de confiabilidad; y la **decisión de runtime por defecto por
rol**, que la propone la evidencia y la confirma una persona.

## Why This Task Exists

- El ADR exige que un rol no trabaje solo hasta demostrar con evaluaciones que su trabajo sirve (§2.5, §4.7), y la
  escalera interactivo → segundo plano con revisión → programado depende de esa evaluación (§4.7, §4.8).
- Las preguntas abiertas 3 (dónde vive el set; quién califica quedó decidido el 2026-09-26), 4 (runtime por defecto
  por rol) y 7 (unidades de costo por proveedor y su normalización) no están decididas y bloquean la autonomía.
- Sin métricas por rol no se puede saber qué agente vale su costo ni detectar que una evaluación aprobada no mide lo
  que importa (ADR §10).
- Anthropic y OpenAI cobran en unidades distintas (tokens, sesión alojada, horas de contenedor): sin normalizar, el
  costo por entregable no es comparable.

## Goal

- Sets de evaluación versionados por rol con rúbrica objetiva + humana; calificación humana por la persona designada
  para la disciplina del rol y sin autocalificación.
- Corridas de evaluación por combinación con estado vigente o invalidado por digest.
- Compuerta de evaluación consultable por TASK-1914 (modos) y TASK-1915 (elección de runtime).
- Catálogo de precios versionado y normalización de costo reportado vs estimado; ausencia = «sin dato».
- Métricas por rol por API y MCP, y señales de confiabilidad en el health profundo de Studio.
- Decisión de runtime por defecto por rol registrada como `T2`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (**gobernante**: §2.5,
  §2.8, §4.7, §4.8, §5.2, §10, §11 preguntas 3, 4 y 7)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (procedencia, ausencia
  ≠ cero)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (forma de señales; Studio las expone en su health
  profundo y en `platform.marketing_studio.health`)

Reglas obligatorias:

- **Criterios humanos nunca autocalificados:** ni por el agente evaluado ni por un modelo juez. Un juez LLM puede dar
  una señal auxiliar marcada como tal; nunca aprueba un criterio humano.
- **Quien calificó no aprueba sola:** la aprobación `T2` de una corrida de evaluación la da una persona distinta del
  autor de la versión de tarjeta evaluada.
- **La aprobación es por combinación y por digest:** `(role_key, role_version, card_digest, skills_digest, provider,
  runtime, model, eval_set_version)`. Cualquier cambio ⇒ «sin evaluar» para esa combinación.
- **Ausencia ≠ cero:** un rol sin evaluación es «sin evaluar»; una métrica sin datos es «sin dato»; un costo no
  informado nunca se suma como 0; una tasa con denominador cero no se muestra como 0 %.
- **Precios con fuente y fecha:** cada precio del catálogo cita la página oficial del proveedor y la fecha verificada;
  un precio sin fuente no se usa para normalizar.
- **Las evaluaciones corren en una organización de prueba** (`CMP-900` o equivalente) y nunca escriben en campañas
  reales.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` (health profundo, `ops_run`, observabilidad).
- Skills de rol (`efeonce-agent-*`) y su `references/deliverable-template.md`: base de los casos de referencia.
- `docs/tasks/to-do/TASK-1864-mcp-self-sufficient-agent-surface.md` (eval end-to-end de clientes Claude/Codex contra el
  gateway: se reusa su harness para evaluar el modo interactivo; no se duplica).
- `docs/tasks/to-do/TASK-1609-talent-assurance-evals-observability-promotion.md`
  (patrón de promoción de autonomía por evals en otro dominio; referencia de método, no dependencia).
- `docs/tasks/to-do/TASK-1909-marketing-studio-agentic-ai-provenance.md` (validadores deterministas y eventos de
  procedencia que alimentan retrabajo y edición posterior a la aceptación).

## Dependencies & Impact

### Depends on

- `TASK-1914`: tarjetas con `evalSetRef`, `cardDigest`, compuerta de modos que llama a `hasCurrentPassingEval`.
- `TASK-1913`: work items, eventos de revisión y aceptación (base de métricas).
- `TASK-1915`: ledger de corridas (costo, causa de fallo, runtime, modelo), modo `evaluation` y adaptadores.
- `TASK-1909`: validadores de copy y pieza, `provenance_event` (edición posterior a la aceptación).
- `TASK-1905`: límites del catálogo de canales usados por los chequeos objetivos.

### Blocks / Impacts

- `TASK-1914`: sin esta task, habilitar `background`/`scheduled` responde `eval_required` para siempre.
- `TASK-1915`: la reserva de costo usa la normalización de esta task (antes, reserva conservadora del techo completo);
  la elección de runtime usa la decisión por defecto registrada aquí.
- `TASK-1912` / `TASK-1895`: panel de métricas por rol (follow-up consumidor).

### Files owned

- Repo Studio: `packages/database/migrations/<ts>_agent-evals-cost-metrics.sql` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/agent-evals.ts` [nuevo], `packages/contracts/src/operations.ts`, `packages/domain/src/agent-evals/**` [nuevo: sets, rúbricas, chequeos objetivos, corridas, compuerta], `packages/domain/src/agent-cost/**` [nuevo: catálogo de precios y normalización], `packages/domain/src/readers/agent-role-metrics.ts` [nuevo], `packages/domain/src/health/**` (señales nuevas), `evals/sets/<roleKey>/<version>.json` [nuevo: fuente revisable de los sets, importada a la base], `scripts/evals-import.ts` [nuevo], `apps/web/src/app/api/v1/agent-evals/**`, `apps/web/src/app/api/v1/agent-cost-prices/**`, `apps/web/src/app/api/v1/agent-roles/[roleKey]/metrics/**` [nuevo]
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, migración de seed de `capabilities_registry` [nuevo], `src/lib/sister-platforms/mcp-token-exchange.ts` (cliente de canje del calificador), `docs/mcp/skills/marketing-studio/SKILL.md` (sección «Evaluar y medir roles»), docs funcionales y manual
- Gateway `efeonce-mcp`: sync del manifiesto, `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Health profundo y `studio.ops_run` de Studio (TASK-1896); señal `platform.marketing_studio.health` en Greenhouse.
- Precedentes de evaluación en el ecosistema: Globe Golden Briefs y Evaluation Harness (TASK-1458, complete), ciclo
  durable de evaluación de modelos de Globe (TASK-1614, complete), evals de Talent Assurance (TASK-1609, to-do) y eval
  end-to-end de agentes del gateway (TASK-1864, to-do). Se reusan como patrón; ningún runtime compartido.
- ADR híbrido con los hechos de proveedor verificados el 2026-09-26 (§12).

### Gap

- No hay sets de evaluación, rúbricas, calificación humana, corridas de evaluación ni compuerta.
- No hay catálogo de precios ni normalización de costo entre proveedores.
- No hay métricas por rol ni señales de agentes en el health de Studio.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/{agent-evals,agent-cost}/**`, readers de métricas, rutas `/api/v1`, `evals/sets/**`) + capability en Greenhouse + sync en `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: la normalización de costo y el motor de chequeos objetivos no importan tipos de Studio (viajan con el puerto del despachador si se promueve a plataforma); consumidores: compuerta de TASK-1914, reserva de TASK-1915, tools MCP, UI futura
- Server/browser split: cálculo de métricas y chequeos en el servidor; ninguna agregación en el cliente
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `studio.agent_eval_set`, `studio.agent_eval_case`, `studio.agent_eval_run`, `studio.agent_eval_result`, `studio.agent_eval_grade`, `studio.agent_cost_price`, `studio.agent_role_runtime_decision` (nuevas); lectura de `agent_run`, `work_item`, `work_item_event`, `provenance_event`, `agent_tool_denial`
- Consumidores afectados: TASK-1914 (compuerta), TASK-1915 (reserva y elección de runtime), agentes y personas vía MCP, UI futura
- Runtime target: Studio staging/production; despachador en modo `evaluation`; gateway

### Contract surface

- Contrato existente a respetar: `AgentRoleCard` y `cardDigest` (TASK-1914); `AgentRunContract` (TASK-1915); validadores (TASK-1909); registro con `riskTier`
- Contrato nuevo o modificado: `EvalSet` v1 (casos + rúbrica), `hasCurrentPassingEval(combination)`, `normalizeRunCost(usage, priceVersion)`, reader `getAgentRoleMetrics`, operaciones de Detailed Spec
- Backward compatibility: `compatible`
- Full API parity: crear sets, correr evaluaciones, calificar, aprobar, gestionar precios, decidir runtime y leer métricas tienen command/reader, ruta y tool

### Data model and invariants

- Entidades/tablas/views afectadas: ver Detailed Spec §«Modelo»
- Invariantes que no se pueden romper:
  - una versión publicada de set es inmutable; los casos apuntan a insumos congelados de la organización de prueba
  - un criterio humano sólo se califica por una persona con la capability de calificador; el agente evaluado o un juez LLM ⇒ `403 grader_not_allowed`
  - la aprobación `T2` exige todos los criterios calificados y la persona que aprueba ≠ autor de la versión de tarjeta
  - una aprobación queda invalidada automáticamente si cambia cualquier elemento de la combinación (digest distinto)
  - `normalizeRunCost` devuelve `null` (sin dato) si falta el uso o el precio vigente con fuente; nunca 0
  - las métricas con denominador cero devuelven `null`, no 0
  - `agent_eval_result`, `agent_eval_grade` y decisiones de runtime son append-only
- Write-target allowlist: N/A (Studio; declarado)
- Tenant/space boundary: sets y precios son globales de Efeonce; métricas filtrables por organización y siempre restringidas a las organizaciones del actor
- Idempotency/concurrency: `Idempotency-Key` en toda escritura; una corrida de evaluación por `(combinación, eval_set_version, intento)` con `run_key` del despachador; calificar con `If-Match`
- Audit/outbox/history: `audit_event` por command; resultados y calificaciones append-only

### Migration, backfill and rollout

- Migration posture: `additive` + `seed`
- Default state: `STUDIO_AGENT_EVALS_ENABLED=false`; con OFF la compuerta responde «sin evaluar» (los modos autónomos siguen bloqueados)
- Backfill plan: semilla de precios v1 con fuente y fecha (dry-run → revisión humana → `--apply`); sets v1 importados desde `evals/sets/**` (dry-run → `--apply`)
- Rollback path: flag OFF (la compuerta vuelve a bloquear); revert PR; tablas quedan
- External coordination: release de Greenhouse (capability de calificador y grants), sync y dispatch del gateway, una persona calificadora nominal por disciplina (Medios, SEO/AEO, CRO, Copywriter, Designer, Creativo) designada por el operador

### Security and access

- Auth/access gate: lecturas de métricas `marketing_studio.campaign.read`; gestionar sets, precios, correr evaluaciones y decidir runtime con `marketing_studio.agent_role.manage` (TASK-1914); calificar criterios humanos con capability nueva `marketing_studio.agent_eval.grade` (grants `efeonce_admin`, `efeonce_operations`, `efeonce_account`, decididos por el operador el 2026-09-26) **y** ser la persona designada para la disciplina del rol; sin designación ⇒ `403 grader_not_allowed`; aprobar evaluación y decidir runtime por defecto son `T2`
- Sensitive data posture: los casos usan la organización de prueba; nada de datos de clientes en sets; los resultados no guardan prompts completos
- Error contract: `eval_set_immutable`, `eval_incomplete`, `grader_not_allowed`, `self_approval_not_allowed`, `eval_stale`, `price_source_missing`, `confirmation_required`
- Abuse/rate-limit posture: presupuesto de evaluación por rol y mes (`STUDIO_AGENT_EVAL_MONTHLY_BUDGET_USD`, default 50) reservado por el despachador; superarlo es `T2`

### Runtime evidence

- Local checks: chequeos objetivos con fixtures (pasa/falla por cada regla), invalidación por digest, normalización con precios de prueba (reportado vs estimado vs sin dato), métricas con denominador cero, prohibición de autocalificación y autoaprobación
- DB/runtime checks: migración con bloque `DO`; inmutabilidad de sets publicados en staging
- Integration checks: evaluación real en staging de un rol (p. ej. `media_planner`) con dos combinaciones (un runtime Claude y uno OpenAI) sobre la organización de prueba, calificada por la persona designada para la disciplina del rol y aprobada por otra persona; la compuerta de TASK-1914 pasa a permitir `background` para la combinación aprobada
- Reliability signals/logs: `agent.tool_outside_allowlist` (estado estable 0), `agent.runs_failed_by_cause`, `agent.cost_unreported_ratio`, `agent.eval_stale` (roles con modo autónomo habilitado cuya aprobación quedó invalidada: estado estable 0; si > 0 el despachador deja de iniciar corridas autónomas de esa combinación)
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Sets, chequeos, compuerta, normalización y métricas en `packages/domain`.
- [ ] Evaluación modelada como recurso con commands (crear set, correr, calificar, aprobar).
- [ ] Capability `marketing_studio.agent_eval.grade` en registry + catálogo + grant a ≥1 rol real + cliente de canje en el mismo PR (coverage test verde).
- [ ] Camino programático: `/api/v1` + tools federadas.
- [ ] Toda operación declara `riskTier`; aprobar evaluación, decidir runtime por defecto y exceder el presupuesto de evaluación son `T2`.
- [ ] Un primitive, muchos consumers: compuerta, despachador, agentes, UI futura.
- [ ] Parity check = SÍ.

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

### Slice 1 — Modelo y sets de evaluación (pregunta abierta 3)

- Migración `<ts>_agent-evals-cost-metrics.sql` con las tablas de Detailed Spec §«Modelo», triggers de inmutabilidad y
  append-only, bloque `DO`.
- Fuente revisable de los sets en el repo de Studio (`evals/sets/<roleKey>/<version>.json`: casos con insumos
  congelados de la organización de prueba, entregable esperado por forma, rúbrica objetiva y humana) importada a la
  base por `scripts/evals-import.ts` (dry-run → `--apply`); la base es la fuente en runtime y guarda el digest del
  archivo importado.
- Sets v1 de los cinco roles iniciales (al menos cinco casos por rol, incluidos casos adversariales: instrucción
  inyectada en un copy o una página, dato faltante que debe quedar «sin dato», pedido de ejecutar un `T2`).

### Slice 2 — Chequeos objetivos automáticos

- Motor de chequeos deterministas sobre el entregable y el ledger de la corrida: formato del entregable del rol,
  límites del catálogo de canales y reglas de voz (validadores de TASK-1909), afirmaciones con fuente, «sin dato» en
  vez de cero, cero `T2` ejecutados, cero `agent_tool_denial`, costo y turnos dentro de la tarjeta.
- El juez LLM auxiliar, si se usa, queda marcado `auxiliary` y no cuenta para aprobar.

### Slice 3 — Corridas de evaluación, calificación humana y aprobación

- `startAgentEvalRun` crea corridas en modo `evaluation` por el despachador de TASK-1915 (segundo plano con identidad
  de prueba acotada a la organización de prueba) o registra una corrida interactiva usando el harness de TASK-1864;
  resultados por caso en `agent_eval_result`.
- `gradeAgentEvalCase` (persona con `.agent_eval.grade` **y** designada por el operador como calificadora de la
  disciplina del rol —Medios, SEO/AEO, CRO, Copywriter, Designer o Creativo—, o persona con `efeonce_admin`, que califica cualquier disciplina; nunca
  el autor de la tarjeta). La designación nominal por disciplina
  queda registrada en Studio como dato auditado (quién, disciplina, desde cuándo, quién designó); forma exacta en
  Discovery.
- `approveAgentEvalRun` (`T2`): exige chequeos objetivos en verde, criterios humanos calificados y umbral de la
  rúbrica; persona ≠ autor de la versión de tarjeta.
- `hasCurrentPassingEval(combination)` para la compuerta de TASK-1914; invalidación automática por digest.

### Slice 4 — Catálogo de precios y normalización (pregunta abierta 7)

- `agent_cost_price` versionado: `(provider, runtime, model, unit)` con unidades `input_token`, `output_token`,
  `cached_input_token`, `hosted_session_hour`, `container_hour`, `tool_call`, precio en USD, fuente oficial y fecha
  verificada; `upsertAgentCostPrice` (`T1` restringida).
- `normalizeRunCost(usage, priceVersion)`: preferir el costo reportado por el proveedor cuando exista
  (`cost_basis = reported`); si no, estimar con el catálogo (`estimated`); sin uso o sin precio con fuente ⇒ `null`.
- Estimador para la reserva de TASK-1915 (percentil del costo de corridas previas del rol × runtime × modelo; sin
  historia ⇒ techo por corrida completo).

### Slice 5 — Métricas por rol y señales

- Reader `getAgentRoleMetrics(roleKey, {period, organizationId?, runtime?, model?})`: tasa de aceptación de
  borradores, retrabajo (pedidos de cambio por entregable y edición posterior a la aceptación), tiempo a aceptación,
  costo por entregable aceptado, propuestas `T2` confirmadas vs rechazadas, corridas fallidas por causa, intentos
  fuera de lista; cada valor con denominador y `null` cuando no hay datos.
- Señales en el health profundo de Studio (y su reflejo en `platform.marketing_studio.health`): las cuatro de Runtime
  evidence.

### Slice 6 — Runtime por defecto por rol (pregunta abierta 4), exposición y manual

- `proposeAgentRoleRuntimeDecision` calcula, entre combinaciones con evaluación vigente, la recomendada por
  aceptación, costo por entregable aceptado y fallos; `decideAgentRoleRuntime` (`T2`) la registra y TASK-1915 la usa
  como primera preferencia. Nunca cambia sola.
- Rutas, registro con `riskTier`, manifiesto, sync del gateway con bump, manual servido §«Evaluar y medir roles».
- Capability `marketing_studio.agent_eval.grade` en Greenhouse con grants a `efeonce_admin`, `efeonce_operations` y
  `efeonce_account` y cliente de canje (receta TASK-1899).

## Out of Scope

- UI de evaluaciones y panel de métricas por rol: follow-up consumidor en TASK-1912/1895; no se crea wireframe aquí.
- Facturación o conciliación contra la factura real de los proveedores (Finance): las métricas son operativas, no contables.
- Evaluar Nexa o clientes del gateway como tales (TASK-1864 cubre la superficie agéntica del gateway).
- Roles nuevos y cambios de tarjeta (TASK-1914); ejecución de corridas (TASK-1915).

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `agent_eval_set` | `(set_key, version_no) PK`, `role_key`, `status draft\|published\|superseded`, `source_digest`, `rubric jsonb` (criterios objetivos y humanos con peso y umbral), `published_by`, `published_at` |
| `agent_eval_case` | `(set_key, version_no, case_key) PK`, `work_item_type`, `inputs jsonb` (referencias congeladas de la organización de prueba), `expected_shape jsonb`, `adversarial bool` |
| `agent_eval_run` | `eval_run_id PK`, `set_key`, `set_version`, `role_key`, `role_version`, `card_digest`, `skills_digest`, `provider`, `runtime`, `model`, `mode evaluation_background\|evaluation_interactive`, `status running\|awaiting_grades\|passed\|failed\|approved\|stale`, `approved_by NULL`, `approved_at NULL`, `cost_usd NULL` |
| `agent_eval_result` | `result_id PK`, `eval_run_id`, `case_key`, `agent_run_id`, `objective_checks jsonb`, `auxiliary_judge jsonb NULL`, `at` |
| `agent_eval_grade` | `grade_id PK`, `result_id`, `criterion_key`, `score`, `note`, `grader_subject`, `at` |
| `agent_cost_price` | `(provider, runtime, model, unit, version_no) PK`, `usd_per_unit`, `source_url`, `verified_at`, `status active\|superseded` |
| `agent_role_runtime_decision` | `decision_id PK`, `role_key`, `role_version`, `provider`, `runtime`, `model`, `evidence jsonb`, `decided_by`, `decided_at` |

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `listAgentEvalSets` · `getAgentEvalSet` | `GET /api/v1/agent-evals/sets[/{setKey}]` | `studio.agent_eval_sets.list` · `studio.agent_eval_set.get` | T0 |
| `startAgentEvalRun` | `POST /api/v1/agent-evals/runs` | `studio.agent_eval_run.start` | T1 dentro del presupuesto de evaluación · T2 sobre él |
| `getAgentEvalRun` · `listAgentEvalRuns` | `GET /api/v1/agent-evals/runs[/{evalRunId}]` | `studio.agent_eval_run.get` · `studio.agent_eval_runs.list` | T0 |
| `gradeAgentEvalCase` | `POST /api/v1/agent-evals/runs/{evalRunId}/grades` | `studio.agent_eval_case.grade` | T1 (persona calificadora) |
| `approveAgentEvalRun` | `POST /api/v1/agent-evals/runs/{evalRunId}/approve` | `studio.agent_eval_run.approve` | T2 |
| `getAgentRoleMetrics` | `GET /api/v1/agent-roles/{roleKey}/metrics` | `studio.agent_role.metrics.get` | T0 |
| `listAgentCostPrices` · `upsertAgentCostPrice` | `GET/PUT /api/v1/agent-cost-prices` | `studio.agent_cost_prices.list` · `studio.agent_cost_price.upsert` | T0 · T1 (restringida) |
| `proposeAgentRoleRuntimeDecision` · `decideAgentRoleRuntime` | `GET /api/v1/agent-roles/{roleKey}/runtime-decision/proposal` · `POST /api/v1/agent-roles/{roleKey}/runtime-decision` | `studio.agent_role.runtime.propose` · `studio.agent_role.runtime.decide` | T0 · T2 |

La importación de sets desde el repo es una operación de CLI con exclusión razonada en el registro (`operator_cli`),
igual que el import de catálogo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1914 y TASK-1915 Slices 1–3 en staging → Slice 1 → Slice 2 → Slice 4 (precios: la reserva de TASK-1915 los necesita) → Slice 3 (necesita al menos un adaptador de TASK-1915 o el harness interactivo) → Slice 5 → Slice 6.
- Ningún modo autónomo se habilita en production sin una evaluación aprobada en production con la combinación exacta.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La evaluación aprobada no mide lo que importa | calidad | medium | métricas de aceptación en producción contrastadas con la evaluación; revisar cuando divergen (ADR §10) | aceptación baja con evaluación aprobada |
| Autocalificación o autoaprobación | gobierno | low | guardas en commands (`grader_not_allowed`, `self_approval_not_allowed`) | `audit_event` |
| Precios desactualizados sesgan la comparación | costo | high | fuente + fecha obligatorias; costo reportado preferido; revisión mensual | `verified_at` > 45 días |
| Costo no informado tratado como cero | datos | medium | `null` en normalización y métricas | `agent.cost_unreported_ratio` |
| Evaluaciones caras | costo | medium | presupuesto mensual de evaluación con `T2` para excederlo | reservas de evaluación agotadas |
| Aprobación vieja sigue habilitando autonomía | seguridad | low | invalidación por digest + `agent.eval_stale` que detiene corridas autónomas | `agent.eval_stale` > 0 |

### Feature flags / cutover

- `STUDIO_AGENT_EVALS_ENABLED` (Vercel de Studio; default `false`) y `STUDIO_AGENT_EVAL_MONTHLY_BUDGET_USD` (default 50); filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–3 | flag OFF (compuerta bloquea autonomía); revert PR | < 15 min | sí |
| Slice 4 | volver a la versión de precios anterior; la reserva usa el techo completo | < 15 min | sí |
| Slices 5–6 | revert PR; señales se retiran del health | < 15 min | sí |

### Production verification sequence

1. Staging: importar sets v1 y precios v1 (dry-run → apply) con revisión del operador.
2. Staging: evaluación real de un rol en dos combinaciones; calificación por la persona designada de la disciplina; aprobación por otra persona; la compuerta habilita `background` sólo para la combinación aprobada.
3. Staging: cambiar la versión de la tarjeta ⇒ la aprobación queda `stale` y `agent.eval_stale` sube si el modo estaba habilitado.
4. Production con flag OFF → ON tras release; primera evaluación real con permiso del operador.

### Out-of-band coordination required

- Operador designa por nombre a la persona calificadora de cada disciplina (Medios, SEO/AEO, CRO, Copywriter, Designer, Creativo). Disciplinas y grants decididos el 2026-09-26; nombres pendientes.
- Operador revisa los sets v1 y el catálogo de precios v1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen sets v1 publicados para los cinco roles, con casos adversariales, importados desde `evals/sets/**` con su digest.
- [ ] Un criterio humano calificado por el agente evaluado o por un juez LLM responde `403 grader_not_allowed`.
- [ ] Una persona con `.agent_eval.grade` que no es la calificadora designada para la disciplina del rol recibe `403 grader_not_allowed`, salvo `efeonce_admin`, que califica cualquier disciplina (test de ambos casos).
- [ ] Aprobar una evaluación exige chequeos objetivos en verde y criterios humanos completos, y lo hace una persona distinta del autor de la tarjeta.
- [ ] Cambiar tarjeta, skills, runtime, modelo o versión del set deja la aprobación en `stale` y la compuerta vuelve a responder «sin evaluar».
- [ ] `normalizeRunCost` devuelve `null` sin uso o sin precio con fuente; nunca 0.
- [ ] `getAgentRoleMetrics` devuelve cada métrica con denominador y `null` cuando no hay datos, por API y por MCP.
- [ ] Las señales `agent.tool_outside_allowlist` y `agent.eval_stale` están en el health profundo con estado estable 0.
- [ ] La decisión de runtime por defecto de un rol queda registrada como `T2` y TASK-1915 la usa como primera preferencia.
- [ ] Capability `marketing_studio.agent_eval.grade` con grant a `efeonce_admin`, `efeonce_operations` y `efeonce_account` y cliente de canje en producción; coverage test verde.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Greenhouse: `pnpm local:check`, `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, `pnpm task:lint --task TASK-1916`.
- Gateway: tests + `pnpm surface:baseline`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-marketing-studio` actualizada (contrato de mantenimiento) y espejada.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Panel de métricas y evaluaciones por rol en la UI: consumidor en TASK-1912/1895.
- Conciliación mensual del costo normalizado contra la factura de Anthropic y OpenAI (Finance), si el volumen lo justifica.
- Evaluación continua en producción (muestreo de entregables reales calificados) cuando haya volumen.

## Open Questions

- **Pregunta 3 del ADR (sólo la ubicación del set; quién califica quedó decidido el 2026-09-26).** Propuesta: la fuente revisable del set vive en el repo de Studio (`evals/sets/**`, revisada por PR) y la base de Studio es la fuente en runtime.
- **Pregunta 4 del ADR.** Propuesta: la evidencia propone y una persona decide (`T2`); ninguna preferencia fija por proveedor. Confirmar el umbral mínimo de la rúbrica por rol.
- **Pregunta 7 del ADR.** Propuesta: normalizar a USD con el catálogo versionado y preferir el costo reportado por el proveedor. ¿Se incluye el costo de infraestructura propia (Cloud Run del despachador) en el costo por entregable, o sólo el del modelo?
- ¿Presupuesto de evaluación de USD 50 por rol y mes es el correcto? Ajustable por env.
