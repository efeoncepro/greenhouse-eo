# TASK-1915 — Marketing Studio: despachador de corridas de agente con adaptadores Claude/OpenAI

## Actualización de proveedor — DevDay 2026-09-29

El [inventario de lanzamientos](../../audits/platform/OPENAI_DEVDAY_2026_09_29_LAUNCH_INVENTORY.md) confirma Agents API gestionada con computer use y GPT-6.1 Sol. Son candidatos para evaluación por rol, no un quinto adaptador ni una ruta de modelo aprobada. Antes de modificar el contrato de cuatro adaptadores de esta task, comparar Agents API con Agents SDK/Responses para datos, residencia, ZDR, sesiones, identidad delegada, MCP, costo y recuperación, y registrar el delta del ADR. La Agents API actualmente declara residencia solo en EE. UU. y no ofrece ZDR aun con sandbox propio. Las evals públicas de Sol no sustituyen las de Studio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

Decisiones de Julio Reyes (operador) del 2026-09-26 aplicadas en esta task:

- **Delegación por corrida con `act` (pregunta 1 del ADR):** se crea la unidad nueva **U22 de EPIC-044**, poseída por
  [`TASK-1917`](TASK-1917-efeonce-id-agent-run-delegation-act.md). Efeonce ID emite tokens cortos y revocables por
  corrida, con la persona como sujeto y el rol de agente versionado como actor (`act`), scopes ⊆ lista blanca del rol,
  atados al work item y a la corrida, y la autoridad efectiva sigue pasando por el canje RFC 8693 de Greenhouse que ya
  usa Studio. El Slice 5 queda bloqueado por TASK-1917 (y por la evaluación de TASK-1916), no por una unidad sin dueño.
- **Datos competitivos `internal` (pregunta 8 del ADR):** los agentes en segundo plano y los programados **nunca** leen
  datos competitivos `internal`; sólo el modo interactivo, con la persona presente, puede. Una excepción futura exige
  una decisión nueva y explícita por organización (opt-in); no existe un interruptor `T2` en `agent_org_policy`.
- **Asignación sobre el techo de costo:** la confirma una persona con `marketing_studio.campaign.approve` (TASK-1913).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de operación híbrida con agentes (§3.3 D, §4.4, §4.5, §4.6, §4.7, §12); ningún slice empezado. Plan de respaldo: modo interactivo primero (Slices 1–3), independiente de EPIC-044`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1913 (work items y evento de asignación) · TASK-1914 (tarjetas, compilador portable, lista blanca, kill switch, política por organización) · TASK-1899 (escritura MCP delegada). El modo delegado en segundo plano (Slice 5) está BLOQUEADO por TASK-1917 (EPIC-044 U22, decisión del operador 2026-09-26): Efeonce ID aún no emite delegación por corrida con claim act. El modo programado (Slice 6) necesita la identidad de servicio por rol. Habilitar segundo plano o programado exige además evaluación aprobada (TASK-1916)`
- Branch: `efeonce-marketing-studio main (ledger de corridas, despachador, adaptadores, infra) · Greenhouse develop (docs, manual servido) · efeonce-mcp rama + PR (verificación de tokens de corrida) · Efeonce ID vía EPIC-044; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el **despachador delgado de Studio** que ejecuta el trabajo asignado a roles de agente con tecnología de
Anthropic u OpenAI de forma intercambiable, sin guardar estado duradero en el proveedor. Un **contrato único de
corrida** `{rol@versión, work_item, insumos, runtime, modelo, identidad, techo}` sirve a los tres modos: **interactivo**
(la persona corre el rol en su cliente y registra la corrida con tools `T1`), **delegado en segundo plano** (asignar un
work item a un rol dispara la corrida con la identidad delegada de quien asignó) y **programado** (lecturas periódicas
con identidad de servicio por rol, sólo `T0`/`T1` y borradores nuevos). El despachador corre en Cloud Run junto al
worker de medios, abre cada corrida con **una sola clave de idempotencia por corrida lógica**, reserva costo contra
los techos antes de empezar, invoca un adaptador detrás de un puerto sin tipos de Studio, registra uso y costo
informados, y **lee antes de reintentar** ante cualquier resultado ambiguo. Cuatro adaptadores, cada uno con su flag
apagado por defecto: `claude-agent-sdk`, `claude-managed-agents`, `openai-agents-sdk`, `openai-responses`. Nada se
construye sobre OpenAI Agent Builder.

## Why This Task Exists

- Hoy un agente sólo trabaja mientras una persona lo mira; no puede tomar una tarea asignada, hacerla y dejar un
  borrador para revisión, ni correr una lectura semanal programada (ADR híbrido §1).
- El equipo usa Anthropic y OpenAI; acoplar el trabajo a un runtime pierde el trabajo al cambiar de modelo (ADR §2.2).
- El ADR descartó reusar el runtime de Globe (frontera de plataforma hermana; adaptadores de generación de medios) y el
  de Nexa (turno de chat en Greenhouse) y decidió un despachador propio que reusa sus **patrones** (§3.3, §4.6).
- Las métricas y la auditoría no pueden ser ciegas al trabajo interactivo: toda corrida, incluida la de una persona
  en Claude Code o ChatGPT, se registra con el mismo contrato (§4.5).

## Goal

- Ledger de corridas en Studio con máquina de estados, lease/fencing, idempotencia por corrida lógica y recuperación
  por lectura.
- Modo interactivo registrado por tools `T1` (disponible sin EPIC-044).
- Despachador en Cloud Run con reserva de costo, kill switch y cancelación.
- Cuatro adaptadores detrás de un puerto sin tipos de Studio, cada uno con flag propio apagado.
- Identidad por modo según ADR §4.4, incluida la regla «`T2` se confirma sólo desde un token sin `act`».
- Programas (modo programado) creados por una persona como `T2`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (**gobernante**: §3.3,
  §3.4, §4.2, §4.4, §4.5, §4.6, §4.7, §4.8, §7, §9, §11 preguntas 1, 2, 5 y 8, §12)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` y
  `docs/epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md` (dueño de la
  delegación)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (patrones: contexto confiable, un solo
  punto de invocación, lease y fencing, recuperación por lectura; sólo patrones, cero runtime compartido)
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (`propose → confirm → execute`, ledger de
  eventos, señal de propuestas no autorizadas)
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` (no crear deployables compartidos por
  anticipado; el puerto nace extraíble)

Reglas obligatorias:

- **Estado duradero sólo en Studio.** La sesión, el hilo o la memoria del proveedor son mecánica de una corrida; al
  cerrar, el entregable y la procedencia ya están en Studio y la sesión del proveedor se borra cuando el proveedor lo
  permite.
- **MCP de Efeonce es la única vía de acción** del agente; el despachador nunca entrega al agente el bearer `mst_`,
  credenciales de Cloud SQL ni URLs firmadas que no haya emitido una tool.
- **Una clave de idempotencia por corrida lógica** (derivada de `assignment_id` de TASK-1913, o de programa + ventana);
  ante timeout o fallo ambiguo se **lee** Studio y el proveedor antes de reintentar; nunca se relanza a ciegas.
- **Techo antes de gastar:** reserva contra techo por corrida, mensual del rol y mensual de la organización; corte al
  alcanzarlo; costo no informado = «sin dato», nunca 0.
- **Identidad (ADR §4.4):** delegada = persona que asignó ∩ lista del rol; la delegación para segundo plano la emite
  **sólo Efeonce ID**; programada = identidad de servicio por rol, sólo `T0`/`T1` y borradores nuevos; una
  confirmación `T2` sólo es válida desde un token **sin** claim `act`.
- **Secretos nunca en prompts, logs, trazas ni procedencia**; claves de API de modelos en Secret Manager, resueltas en
  el servidor; nunca la sesión personal de claude.ai o ChatGPT de nadie.
- **Contenido externo es dato, no instrucción**; herramientas web del runtime restringidas a los dominios de la
  tarjeta.
- **Datos competitivos `internal` sólo con la persona presente** (modo interactivo); segundo plano y programado
  nunca los leen (decisión del operador 2026-09-26).
- **Runtimes sin ZDR** (hoy Claude Managed Agents) sólo con datos de organizaciones que lo autorizaron (TASK-1914).
- **Nunca OpenAI Agent Builder** (retiro anunciado para el 2026-11-30, ADR §12).
- **Superficies en beta se reverifican al implementar cada adaptador** (ADR §12); un hecho de proveedor sin verificar
  en la documentación oficial ese día no entra al código.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` (worker, deploy, secretos, observabilidad de Studio).
- Skill `claude-api` (integrada en Claude Code, no vive en el repo) y la documentación oficial citada en
  ADR §12 (Agent SDK, Managed Agents, MCP connector, vaults, permission policies; Agents SDK de OpenAI, tool `mcp` de
  Responses API).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft` (verificación de tokens en el gateway).
- Skill de usuario `gcp-cloud-run` y `.claude/skills/greenhouse-secret-hygiene/SKILL.md`.
- `docs/tasks/to-do/TASK-1909-marketing-studio-agentic-ai-provenance.md` (procedencia que cierra cada corrida).

## Dependencies & Impact

### Depends on

- `TASK-1913`: `work_item`, evento `assigned` a rol con `assignmentId`, transiciones `startWorkItem`/`submitWorkItem`.
- `TASK-1914`: `PortableAgentSpec`, guarda de lista blanca, kill switch, techos, `agent_org_policy`.
- `TASK-1899`: canje por capability y `Efeonce-Delegated-Token`; forma del actor persona en Studio.
- `TASK-1909`: procedencia de los entregables (la corrida la completa con sus datos).
- `TASK-1916`: compuerta de evaluación para habilitar segundo plano y programado; normalización de costo (antes de
  1916, la reserva usa el techo por corrida completo como estimación conservadora).
- **EPIC-044 (bloqueante del Slice 5):** token de delegación por corrida emitido por Efeonce ID (sujeto = persona,
  actor = agente vía claim `act` RFC 8693, audiencia `mcp.efeonce.org`, scopes ⊆ lista del rol, atado a work item y
  corrida, corto, revocable, sin refresh de larga vida a terceros) y soporte del emisor nativo para las tools de
  Studio (hoy `unsupported`, `marketing_studio_native_policy_missing`). **Lo posee `TASK-1917` (EPIC-044 U22),
  creada por decisión del operador el 2026-09-26.**

### Blocks / Impacts

- `TASK-1916`: las evals corren por el despachador en modo evaluación; las métricas leen el ledger de corridas.
- `TASK-1899`: su camino de confirmación `T2` recibe la guarda «confirmación sólo desde token sin `act`» por hook del
  kernel (coordinar con su dueño; no se reescribe su lógica).
- `TASK-1913`: cancelar un work item con corrida abierta la cancela; el despachador transiciona el work item por sus
  commands.
- `TASK-1864` / `TASK-1904`: el modo interactivo usa los clientes que esas tasks habilitan (Claude, Codex, ChatGPT).
- Follow-up de TASK-1909 (IA dentro del producto): puede reutilizar el puerto de este despachador.

### Files owned

- Repo Studio: `packages/database/migrations/<ts>_agent-runs.sql` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/agent-runs.ts` [nuevo], `packages/contracts/src/operations.ts`, `packages/domain/src/agent-runtime/**` [nuevo: puerto sin tipos de Studio + test de frontera de imports], `packages/domain/src/agent-runs/**` [nuevo: ledger, reserva de costo, relay, identidad, programas], `packages/domain/src/agent-runtime/adapters/{claude-agent-sdk,claude-managed-agents,openai-agents-sdk,openai-responses}/**` [nuevo], `apps/agent-dispatcher/**` [nuevo: servicio Cloud Run, Dockerfile, deploy.sh, cloudbuild], `apps/web/src/app/api/v1/agent-runs/**` y `apps/web/src/app/api/v1/agent-programs/**` [nuevo], `infra/**` (SA, Cloud Tasks, Scheduler, secretos; hoy sólo existe `infra/restore-rehearsal`), `pnpm-workspace.yaml` (`catalog:` de los SDK de proveedor)
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md` (sección «Corridas de agente»), `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, docs funcionales y manual
- Gateway `efeonce-mcp`: verificación de tokens de corrida (issuer Efeonce ID, `act`, contexto de corrida) en la policy del provider `marketing-studio`, `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Worker de medios de Studio en Cloud Run (`apps/worker/src/server.ts`, `apps/worker/deploy.sh`): invocado sólo por
  Pub/Sub y Cloud Scheduler con OIDC, concurrencia 1, timeout 900 s, `studio.worker_run` como registro de corridas.
- `studio.ops_run`, `@studio/observability` (`captureWithDomain`, `logEvent`), resolución de secretos en servidor
  (`resolveSecretValue`).
- Gateway `mcp.efeonce.org` con canje RFC 8693 de Greenhouse por persona (TASK-1891) y el plan de escrituras
  delegadas (TASK-1899).
- ADR híbrido con hechos de proveedores verificados el 2026-09-26 (§12).

### Gap

- No hay ledger de corridas de agente, relay de asignaciones, puerto de runtime, adaptadores, reserva de costo,
  programas, ni identidad de servicio por rol.
- Efeonce ID no emite delegación por corrida con `act`; el gateway sólo acepta el token Entra de la persona para
  escrituras de Studio.
- Ni Studio ni el gateway distinguen un token con `act` para bloquear confirmaciones `T2`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `efeonce-marketing-studio` (`apps/agent-dispatcher` en Cloud Run junto al worker de medios; puerto en `packages/domain/src/agent-runtime/**`) + verificación de tokens en `efeonce-mcp`
- Future candidate home: `worker`
- Boundary: `packages/domain/src/agent-runtime/**` no importa tipos de Studio (test de frontera); los consumidores son el despachador de Studio hoy y, por disparador del ADR §8, un servicio de plataforma cuando exista un segundo producto con agentes en segundo plano
- Server/browser split: servicio Cloud Run sin acceso público (OIDC); ninguna parte corre en navegador
- Build impact: imagen propia del despachador con los SDK de proveedor y, para `claude-agent-sdk`, el binario que el SDK ejecuta; versiones en el `catalog:` del workspace
- Extraction blocker: `none` para el puerto; el ledger de corridas queda en Studio

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `studio.agent_run`, `studio.agent_run_event`, `studio.agent_cost_reservation`, `studio.agent_program` (nuevas)
- Consumidores afectados: work items (TASK-1913), evals y métricas (TASK-1916), gateway, proveedores Anthropic y OpenAI
- Runtime target: Studio staging/production; Cloud Run `marketing-studio-agent-dispatcher`; gateway; APIs de Anthropic y OpenAI

### Contract surface

- Contrato existente a respetar: kernel de commands y actor persona (TASK-1894/1899); `PortableAgentSpec` (TASK-1914); transiciones de work item (TASK-1913)
- Contrato nuevo o modificado: contrato de corrida `AgentRunContract` v1; puerto `AgentRuntimePort` (`start`, `read`, `cancel`, `deleteSession`); operaciones de Detailed Spec; claim de contexto de corrida en tokens delegados y de servicio
- Backward compatibility: `gated` (todo detrás de flags; nada existente cambia de comportamiento)
- Full API parity: registrar, leer, cancelar corridas y crear, pausar y borrar programas tienen command/reader, ruta y tool

### Data model and invariants

- Entidades/tablas/views afectadas: ver Detailed Spec §«Modelo»
- Invariantes que no se pueden romper:
  - una sola corrida lógica por `run_key` (índice único); reintentos reusan la misma fila y la misma clave
  - una corrida con resultado ambiguo pasa a `unknown` y se resuelve **leyendo** (Studio + proveedor), nunca relanzando
  - lease con fencing token: sólo el dueño vigente del lease escribe; una escritura con fencing viejo se rechaza
  - reserva de costo antes de `starting`; sin margen ⇒ la corrida no empieza (`agent_budget_exhausted`) y el work item vuelve a `assigned` con evento
  - `cost_reported_usd NULL` = «sin dato»; nunca se suma como 0
  - identidad de servicio: sólo operaciones `T0`/`T1` marcadas como creación de borrador nuevo; cualquier otra ⇒ `403 service_identity_not_allowed`
  - confirmación `T2` con token con `act` o identidad de servicio ⇒ `403 confirmation_requires_direct_person`
  - kill switch encendido ⇒ ninguna corrida nueva; las en curso se cancelan en su siguiente llamada
  - runtime sin ZDR sólo si `agent_org_policy` de la organización lo admite
  - corridas en segundo plano y programadas nunca leen datos competitivos `internal` (sin interruptor por organización; una excepción exige decisión nueva)
  - `agent_run_event` append-only; `provider_ref` nunca se usa como fuente del entregable
- Write-target allowlist: N/A (Studio; declarado)
- Tenant/space boundary: cada corrida hereda `organization_id` del work item; la identidad delegada no puede leer otra organización (lo aplica el canje en cada llamada)
- Idempotency/concurrency: `run_key` único; Cloud Tasks con nombre de tarea derivado de `run_key` (deduplicación); concurrencia por instancia acotada; lease + fencing
- Audit/outbox/history: `agent_run_event` por transición; `audit_event` de cada escritura con actor persona y `executed_by = agent:<rol>@<versión>`; el relay lee `work_item_event` (TASK-1913), sin outbox nuevo

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_AGENT_DISPATCHER_ENABLED=false` y los cuatro flags de adaptador en `false`; `STUDIO_AGENT_INTERACTIVE_RUNS_ENABLED=false`; kill switch global encendido (TASK-1914)
- Backfill plan: ninguno
- Rollback path: flags OFF (los work items asignados a agentes quedan en `assigned`, visibles para reasignar a una persona); kill switch global; revocación de delegaciones en Efeonce ID; revert PR; ADR §9
- External coordination: claves de API de Anthropic y OpenAI de Efeonce en Secret Manager; SA propia del despachador; cola Cloud Tasks; Scheduler de programas; release del gateway; TASK-1917 (EPIC-044 U22)

### Security and access

- Auth/access gate: servicio sin acceso público (OIDC de Cloud Tasks/Scheduler); tools de corridas con `marketing_studio.campaign.write` (registrar/cerrar/cancelar la propia corrida) y lectura con `.campaign.read`; programas `T2` con `marketing_studio.agent_role.manage`; tokens de corrida verificados en gateway y Studio
- Sensitive data posture: prompts, resultados de tools y sesiones del proveedor contienen datos de campaña de clientes: nunca se loggean completos; runtimes sin ZDR sólo con autorización de la organización; sesiones borradas al cerrar cuando el proveedor lo permite
- Error contract: `agent_budget_exhausted`, `agent_kill_switch_on`, `runtime_not_admitted`, `adapter_disabled`, `delegation_unavailable`, `service_identity_not_allowed`, `confirmation_requires_direct_person`, `agent_run_ambiguous`, `agent_run_conflict`, `agent_tool_not_allowed` (TASK-1914); causas de fallo nombradas en el ledger (`provider_error`, `timeout`, `budget_cut`, `turn_limit`, `tool_denied`, `delegation_revoked`, `cancelled`, `kill_switch`)
- Abuse/rate-limit posture: techos por corrida, rol y organización; límite de corridas concurrentes por organización (`STUDIO_AGENT_MAX_CONCURRENT_RUNS_PER_ORG`, default 2); límites de turnos, tokens y duración de la tarjeta; tope de denegaciones por corrida que corta la corrida

### Runtime evidence

- Local checks: tests de la máquina de estados de corrida, idempotencia por `run_key`, lease/fencing, recuperación por lectura (simulando timeout tras escritura), reserva y corte de costo, guardas de identidad, test de frontera de imports del puerto, adaptadores con fakes del proveedor
- DB/runtime checks: migración con bloque `DO`; `SELECT` de índices únicos y triggers en staging
- Integration checks: por adaptador, en staging y con credenciales reales de Efeonce, una corrida sobre `CMP-900` que lee Studio, escribe un borrador `T1` con procedencia, intenta una tool fuera de lista (rechazada) y cierra con costo registrado; hechos de proveedor reverificados ese día
- Reliability signals/logs: `agent.runs_unknown` (corridas en `unknown` > 30 min, estado estable 0), `agent.run_lease_expired`, `agent.cost_unreported` (proporción), frescura del relay; `logEvent` por transición
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Ledger, relay, reserva e identidad en `packages/domain`; el despachador es un cliente de esos primitives.
- [ ] Corrida y programa modelados como recursos con commands.
- [ ] Capabilities existentes (`.campaign.read`, `.campaign.write`) y `marketing_studio.agent_role.manage` de TASK-1914; ninguna nueva salvo que Discovery lo exija (entonces con grant y cliente de canje en el mismo PR).
- [ ] Camino programático: `/api/v1` + tools federadas; el modo interactivo usa exactamente esas tools.
- [ ] Toda operación declara `riskTier`; crear o reactivar un programa es `T2`.
- [ ] Un primitive, muchos consumers: persona interactiva, despachador, evals y UI futura sobre el mismo contrato de corrida.
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

### Slice 1 — Contrato de corrida y ledger

- Migración `<ts>_agent-runs.sql` con las tablas de Detailed Spec §«Modelo», índice único por `run_key`, trigger
  append-only en `agent_run_event`, bloque `DO`.
- `AgentRunContract` v1 y máquina de estados de corrida en `packages/domain/src/agent-runs/**`, con lease + fencing
  (patrón del despacho confiable de Globe) y resolución de `unknown` por lectura.

### Slice 2 — Modo interactivo registrado (plan de respaldo sin EPIC-044)

- Tools `T1` `studio.agent_run.claim` (la persona declara que corre el rol `<rol>@<versión>` sobre un work item desde
  su cliente: `claude_code`, `claude_ai`, `codex`, `chatgpt`, `other`; transiciona el work item a `in_progress`) y
  `studio.agent_run.close` (entregables con procedencia, uso reportado por el cliente etiquetado como reportado,
  causa si falló; transiciona a `submitted`).
- Identidad = la persona con su propio token; costo del cliente de la persona («sin dato» si no lo informa).
- Manual servido y skills de rol: cómo reclamar y cerrar una corrida interactiva.

### Slice 3 — Puerto, reserva de costo y despachador

- `AgentRuntimePort` sin tipos de Studio (test de frontera de imports): `start(spec, credentials, input)`,
  `read(handle)`, `cancel(handle)`, `deleteSession(handle)`, con uso y costo informados normalizados por TASK-1916.
- Reserva contra techo por corrida, mensual del rol y mensual de la organización (`agent_cost_reservation`); corte al
  alcanzarlo; liberación del sobrante al cerrar; puerto `evaluateAgentAssignmentBudget` que usa TASK-1913.
- Servicio `apps/agent-dispatcher` en Cloud Run (SA propia sin escritura al bucket de originales, OIDC, sin acceso
  público): relay que lee eventos `assigned` a rol de TASK-1913 y encola en Cloud Tasks con nombre = `run_key`;
  handler que valida rol, modo, kill switch, política por organización, compuerta de evaluación y techo; elige runtime
  por la tarjeta (primera preferencia admitida y evaluada); abre la corrida; invoca el adaptador; cierra.
- Deploy por `deploy.sh` con flags declarados (nunca `--update-env-vars` suelto), igual que el worker de medios.

### Slice 4 — Adaptadores (cada uno con su flag, reverificando ADR §12 ese día)

- `claude-agent-sdk`: bucle del Claude Agent SDK en el despachador; Efeonce MCP por HTTP con el token de la corrida en
  cabecera; `allowedTools` = lista compilada; sin OAuth interactivo; autenticación por clave de API de Efeonce.
- `claude-managed-agents`: agente alojado (cabecera beta vigente), MCP declarado en el agente y credencial por sesión
  en vault con token corto por corrida sin refresh entregado (pregunta abierta 2); política `always_ask` salvo tools
  `T0`/`T1` de la lista; sólo para organizaciones que admitieron runtimes sin ZDR; borrado de sesión al cerrar.
- `openai-agents-sdk`: bucle del Agents SDK en el despachador; MCP por Streamable HTTP con cabecera; filtrado de
  tools; `require_approval` para toda tool `T2` (que igual sólo corre con `dryRun`); tracing sin datos sensibles.
- `openai-responses`: tool `mcp` remota con `allowed_tools` y la autorización reenviada en cada request; aprobaciones
  requeridas por defecto se responden sólo para tools `T0`/`T1` de la lista.
- Test común de conformidad del puerto que los cuatro pasan con fakes, y corrida real por adaptador en staging.

### Slice 5 — Modo delegado en segundo plano (bloqueado por TASK-1917, EPIC-044 U22)

- Al asignar a un rol en modo `background`, el command de TASK-1913 obtiene el consentimiento de la persona; el
  despachador pide a Efeonce ID un token de corrida (persona como sujeto, agente como `act`, audiencia
  `mcp.efeonce.org`, scopes ⊆ lista del rol, atado a work item y corrida, corto y revocable).
- Gateway: acepta ese issuer para tools de Studio, verifica `act` y el contexto de corrida, aplica la guarda de
  TASK-1914 y sigue canjeando en Greenhouse por la capability exacta (la persona pierde una capability ⇒ la siguiente
  llamada falla cerrada).
- Studio: auditoría «persona X, ejecutado por agente `<rol>@<versión>` (corrida R, runtime, modelo)»; guarda
  `confirmation_requires_direct_person` en el kernel.
- No se habilita mientras TASK-1917 no entregue la delegación en producción.

### Slice 6 — Modo programado

- `agent_program` (rol, campaña u organización, calendario, ventana, responsable humano) creado y reactivado como
  `T2`; Cloud Scheduler dispara; `run_key` = programa + ventana.
- Identidad de servicio por rol (emisor y forma en Discovery con EPIC-044; nunca un bearer `mst_` entregado al agente),
  limitada a `T0`/`T1` de creación de borrador nuevo; auditoría «servicio `<rol>`, programa P de la persona X».
- El servicio programado **nunca** lee datos competitivos `internal` (decisión del operador 2026-09-26, pregunta 8
  del ADR); tampoco el modo delegado en segundo plano. Sólo el modo interactivo, con la persona presente, puede. No hay
  interruptor en `agent_org_policy`: una excepción futura exige una decisión nueva y explícita por organización.

## Out of Scope

- Diseñar e implementar la delegación con `act` dentro de Efeonce ID: la posee `TASK-1917` (EPIC-044 U22).
- Evals, normalización de precios, métricas y elección de runtime por defecto: TASK-1916.
- Roles, tarjetas y lista blanca: TASK-1914. Work items: TASK-1913.
- UI de corridas y programas: follow-up consumidor en TASK-1895/1912.
- Nexa como runtime del despachador (pregunta abierta 5): sólo cliente del gateway por ahora.
- Promover el despachador a servicio de plataforma (disparador ADR §8).
- Cualquier dependencia de OpenAI Agent Builder.

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `agent_run` | `run_id PK`, `run_key UNIQUE`, `mode interactive\|background\|scheduled\|evaluation`, `work_item_id NULL`, `assignment_id NULL`, `program_id NULL`, `organization_id`, `role_key`, `role_version`, `card_digest`, `provider`, `runtime`, `model`, `identity_kind person\|delegated\|service`, `subject NULL`, `actor_client NULL`, `state`, `lease_owner NULL`, `lease_expires_at NULL`, `fencing_token`, `attempt`, `cost_reserved_usd`, `cost_reported_usd NULL`, `cost_basis reported\|estimated\|null`, `usage jsonb`, `failure_cause NULL`, `provider_ref NULL`, `provider_session_deleted bool`, `started_at NULL`, `ended_at NULL` |
| `agent_run_event` | `event_id PK`, `run_id`, `kind`, `from_state`, `to_state`, `fencing_token`, `payload jsonb` (sin prompts ni argumentos sensibles), `at` |
| `agent_cost_reservation` | `reservation_id PK`, `run_id`, `scope run\|role_month\|org_month`, `scope_key`, `amount_usd`, `released_usd`, `at` |
| `agent_program` | `program_id PK`, `role_key`, `campaign_id NULL`, `organization_id`, `schedule`, `window_policy`, `owner_subject`, `status active\|paused\|deleted`, `revision`, `created_at` |

### Máquina de estados de corrida

`queued → reserved → starting → running → finishing → succeeded | failed | cancelled`, con `unknown` desde
`starting`/`running`/`finishing` ante resultado ambiguo (se resuelve leyendo a uno de los terminales). `budget_cut` y
`kill_switch` son causas de `cancelled`; `delegation_revoked` y `tool_denied` (sobre el tope) son causas de `failed`.

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `claimAgentRun` | `POST /api/v1/work-items/{workItemId}/agent-runs` | `studio.agent_run.claim` | T1 |
| `closeAgentRun` | `POST /api/v1/agent-runs/{runId}/close` | `studio.agent_run.close` | T1 |
| `getAgentRun` · `listAgentRuns` | `GET /api/v1/agent-runs/{runId}` · `GET /api/v1/agent-runs?workItemId=&roleKey=&state=` | `studio.agent_run.get` · `studio.agent_runs.list` | T0 |
| `cancelAgentRun` | `POST /api/v1/agent-runs/{runId}/cancel` | `studio.agent_run.cancel` | T1 (persona) |
| `listAgentPrograms` · `getAgentProgram` | `GET /api/v1/agent-programs[/{programId}]` | `studio.agent_programs.list` · `studio.agent_program.get` | T0 |
| `createAgentProgram` · `resumeAgentProgram` | `POST /api/v1/agent-programs` · `POST …/{programId}/resume` | `studio.agent_program.create` · `studio.agent_program.resume` | T2 |
| `pauseAgentProgram` | `POST /api/v1/agent-programs/{programId}/pause` | `studio.agent_program.pause` | T1 |
| `deleteAgentProgram` | `POST /api/v1/agent-programs/{programId}/delete` | `studio.agent_program.delete` | T2 (destructiva: `dryRun` → digest) |

El despachador en sí no expone tools: sus transiciones son commands internos del ledger invocados por el servicio.

### Reuso (ADR §4.6) — qué se copia como patrón y de dónde

| Patrón | Fuente | Aquí |
|---|---|---|
| Contexto confiable derivado del servidor | Globe API Contract Spine | el despachador arma el input desde Studio, nunca desde el payload del evento |
| Un solo punto de invocación del proveedor | Globe | `AgentRuntimePort.start` |
| Lease + fencing, recuperación por lectura | Globe despacho confiable | `agent_run` |
| `propose → confirm → execute`, ledger append-only, señal de propuestas no autorizadas | Nexa (TASK-1137) | `T2` sólo como propuesta; `agent_run_event`; denegaciones de TASK-1914 |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1913 y TASK-1914 en staging → Slice 1 → Slice 2 (interactivo; se puede habilitar en production sin EPIC-044) → Slice 3 → Slice 4 (un adaptador a la vez, empezando por uno auto-hospedado: `claude-agent-sdk` u `openai-agents-sdk`) → TASK-1916 con evaluación aprobada → Slice 5 sólo cuando TASK-1917 entregue la delegación → Slice 6.
- Ningún adaptador se prende en production sin su corrida real en staging, ni `claude-managed-agents` sin una organización que haya admitido runtimes sin ZDR.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Corrida duplicada por reintento que escribe dos veces | datos | medium | `run_key` único, Cloud Tasks deduplicado, lectura antes de reintentar, `Idempotency-Key` en cada escritura del agente | `agent.runs_unknown` > 0 |
| Gasto de modelo fuera de control | costo | medium | reserva previa, corte por techo, límites de turnos y tokens, concurrencia por organización | reservas agotadas por rol/org |
| Agente con más autoridad que la persona | seguridad | low | canje por capability en cada llamada, lista blanca en dos capas, `T2` imposible desde `act` | `agent_tool_denial` > 0; `confirmation_requires_direct_person` |
| Inyección de instrucciones desde contenido externo | seguridad | medium | dominios web por rol, tools filtradas, `T2` por construcción, tope de denegaciones que corta la corrida | denegaciones por corrida |
| Datos de cliente en proveedor sin ZDR | privacidad | low | runtime admitido por organización; borrado de sesión | corridas `claude-managed-agents` en orgs sin autorización = 0 |
| Cambio o retiro de superficie de proveedor (beta) | disponibilidad | high | adaptador detrás de flag, estado en Studio, reverificación al implementar, nada sobre Agent Builder | fallos `provider_error` por adaptador |
| Secretos en prompts o logs | seguridad | low | tokens en cabecera/vault, claves en Secret Manager, `logEvent` sin cuerpos | revisión de logs en canary |
| TASK-1917 (EPIC-044 U22) no entrega la delegación | cronograma | high | modo interactivo primero; Slice 5 no se habilita sin ella | TASK-1917 sin cerrar |

### Feature flags / cutover

- `STUDIO_AGENT_INTERACTIVE_RUNS_ENABLED` (Vercel de Studio), `STUDIO_AGENT_DISPATCHER_ENABLED`, `STUDIO_AGENT_ADAPTER_CLAUDE_AGENT_SDK_ENABLED`, `STUDIO_AGENT_ADAPTER_CLAUDE_MANAGED_AGENTS_ENABLED`, `STUDIO_AGENT_ADAPTER_OPENAI_AGENTS_SDK_ENABLED`, `STUDIO_AGENT_ADAPTER_OPENAI_RESPONSES_ENABLED` (Cloud Run del despachador, declarados en su `deploy.sh`), todos default `false`; filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime exacto donde se leen.
- `STUDIO_AGENT_MAX_CONCURRENT_RUNS_PER_ORG` (default 2).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–2 | flag OFF; revert PR; tablas quedan | < 15 min | sí |
| Slice 3 | `STUDIO_AGENT_DISPATCHER_ENABLED=false` + redeploy; kill switch global; work items vuelven a `assigned` | < 15 min | sí |
| Slice 4 | flag del adaptador OFF + redeploy | < 15 min | sí |
| Slice 5 | revocar delegaciones en Efeonce ID; retirar issuer en el gateway | < 30 min | sí |
| Slice 6 | pausar programas (`T1`); flag OFF | < 15 min | sí |

### Production verification sequence

1. Staging: migración, índice único y triggers verificados.
2. Staging: corrida interactiva real (Claude Code y Codex) sobre `CMP-900`: claim → borrador con procedencia → close; work item en `submitted`.
3. Staging: corrida en segundo plano con cada adaptador habilitado usando identidad de prueba acotada a `CMP-900` hasta EPIC-044; timeout forzado tras una escritura ⇒ `unknown` ⇒ resolución por lectura sin duplicar.
4. Staging: techo agotado ⇒ la corrida no empieza; kill switch ⇒ la corrida en curso se cancela en su siguiente llamada.
5. Production: sólo modo interactivo hasta EPIC-044 y TASK-1916; luego un adaptador y un rol evaluado, con permiso del operador.

### Out-of-band coordination required

- Coordinación con `TASK-1917` (EPIC-044 U22, creada 2026-09-26 por decisión del operador) para la delegación por corrida con `act`.
- Operador: claves de API de Anthropic y OpenAI de Efeonce y su presupuesto; autorización explícita por organización para runtimes sin ZDR.
- Dueño de TASK-1899: hook de la guarda `confirmation_requires_direct_person` en su camino de confirmación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `agent_run` rechaza una segunda corrida con el mismo `run_key`; un reintento reusa la fila.
- [ ] Un timeout forzado tras una escritura deja la corrida en `unknown` y se resuelve leyendo, sin escritura duplicada.
- [ ] Una corrida interactiva real (Claude y OpenAI) queda registrada con `claim` y `close` y su work item llega a `submitted`.
- [ ] Sin margen de costo la corrida no empieza (`agent_budget_exhausted`); un costo no informado queda `NULL` y se muestra «sin dato».
- [ ] Cada adaptador habilitado completa una corrida real en staging y está detrás de su propio flag, apagado por defecto.
- [ ] `packages/domain/src/agent-runtime/**` no importa tipos de Studio (test de frontera verde).
- [ ] Una confirmación `T2` desde un token con `act` o desde una identidad de servicio responde `403 confirmation_requires_direct_person`.
- [ ] Una identidad de servicio que intenta una operación que no crea borrador nuevo responde `403 service_identity_not_allowed`.
- [ ] Kill switch encendido impide corridas nuevas y cancela las en curso en su siguiente llamada.
- [ ] Ninguna dependencia, import o configuración usa OpenAI Agent Builder.
- [ ] El modo delegado en segundo plano queda deshabilitado en production hasta que TASK-1917 entregue la delegación, y así consta en el ledger de flags.
- [ ] Una corrida en segundo plano o programada nunca recibe datos competitivos `internal`: las tools competitivas quedan fuera de su lista efectiva (`403 agent_tool_not_allowed`) y el reader de TASK-1908 filtra `internal_competitive` para tokens con `act` e identidades de servicio (test).

## Verification

- Studio: `pnpm check` + `pnpm build`; deploy de staging del despachador por `deploy.sh`.
- Greenhouse: `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, `pnpm docs:closure-check`, `pnpm task:lint --task TASK-1915`.
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
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con los seis flags y su runtime.

## Follow-ups

- Soporte del emisor nativo para las tools de Studio en modo interactivo (autorización nueva D10; la delegación por corrida la posee `TASK-1917`).
- UI de corridas y programas (estado, costo, causa de fallo, cancelar): consumidora en TASK-1895/1912; no se crea wireframe aquí.
- Promoción del puerto y los adaptadores a servicio de plataforma cuando un segundo producto lo necesite (ADR §8).
- Nexa como runtime del despachador cuando hable MCP contra el gateway con la delegación de ADR §4.4 (pregunta abierta 5).

## Open Questions

- **Pregunta 2 del ADR.** Cómo inyectar la credencial en runtimes alojados sin dejar un refresh token en el proveedor. Propuesta: token corto por corrida en vault `static_bearer` de Managed Agents rotado por el despachador, sin `mcp_oauth` con refresh; si no alcanza, `claude-managed-agents` queda sólo para datos internos de Efeonce.
- **Pregunta 5 del ADR.** Nexa como runtime del despachador: fuera de alcance; Nexa sigue como cliente del gateway.
- ¿El despachador es un servicio Cloud Run propio (`apps/agent-dispatcher`, SA separada) o una ruta nueva del worker de medios? Propuesta: servicio propio (secretos distintos, timeouts y concurrencia distintos, mínimo privilegio); Discovery lo confirma.
