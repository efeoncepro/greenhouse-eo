# TASK-1913 — Marketing Studio: work items y asignaciones (personas y roles de agente)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

- **Asignar a un agente sobre el techo de costo se confirma con `marketing_studio.campaign.approve`** (decisión de Julio
  Reyes, operador, 2026-09-26). No nace una capability nueva: el `T2` de asignación reutiliza la capability y el cliente
  de canje de aprobación que siembra TASK-1899. Se revisa sólo si otra persona distinta debe ser dueña del gasto en IA.

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
- Status real: `Diseno — creada 2026-09-26 desde el ADR de operación híbrida con agentes (§4.1, §4.4, §4.5); ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1894 (kernel de commands, Idempotency-Key, If-Match, requiresPerson, dryRun → digest) · TASK-1899 (escritura MCP con la persona como actor, un cliente de canje por capability). La asignación a un rol de agente (Slice 4) además necesita TASK-1914 (registro de roles y techos); el entregable con procedencia, TASK-1909`
- Branch: `efeonce-marketing-studio main (entidades, commands, rutas, registro) · Greenhouse develop (capability, manual servido, docs) · efeonce-mcp rama + PR (sync y versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en Studio la **unidad de trabajo híbrido**: el work item, siempre dentro de una campaña, con tipo (de un catálogo
versionado), responsable (una persona **o** un rol de agente en una versión dada), quién lo pidió (siempre una persona
o un programa creado por una persona), insumos por referencia versionada, entregable como referencia a borradores con
procedencia, revisión y traspaso. La máquina de estados
`draft → ready → assigned → in_progress → submitted → in_review → accepted | changes_requested` (más `blocked`,
`cancelled` y `handed_off`) vive en el command, no en la UI. Todo nace con paridad total: command, ruta `/api/v1`,
entrada en `operations.ts` con nivel de riesgo y tool `studio.*` federada. Asignar a una persona es `T1`; asignar a un
rol de agente es `T1` dentro del techo de costo del rol y de la organización, y `T2` (propuesta → confirmación de una
persona) cuando lo excedería. El traspaso entre roles crea un **work item nuevo**, nunca un handoff del proveedor.

## Why This Task Exists

- Studio registra campañas, piezas, copys, plan de medios y atención, pero no **quién tiene que hacer qué, con qué
  insumos, qué entregó y quién lo revisa** (ADR híbrido §1). Ese trabajo vive en conversaciones sueltas.
- Sin una entidad de trabajo en Studio, el trabajo de un agente queda atado al proveedor que lo ejecutó (hilos,
  sesiones, memoria): cambiar de Claude a OpenAI lo pierde (ADR §3.2, opción A rechazada).
- El despachador (TASK-1915), el registro de roles (TASK-1914) y las métricas por rol (TASK-1916) necesitan un objeto
  común sobre el cual asignar, correr, medir y auditar. Esta task es ese objeto.

## Goal

- Work items con catálogo de tipos, máquina de estados aplicada en el command y eventos append-only.
- Asignación a personas y a roles de agente con la regla de techo `T1`/`T2` del ADR §4.1.
- Traspaso entre roles como work item nuevo encadenado.
- Toda acción disponible por `/api/v1` y por tool MCP con nivel de riesgo; la UI (TASK-1895/1912) sólo consume.
- Contrato de asignación estable (`assignmentId`) que TASK-1915 usa como clave de idempotencia de la corrida lógica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (**gobernante**: §4.1,
  §4.4, §4.5, §4.7, §7, §11 pregunta 6)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (niveles `T0`/`T1`/`T2`,
  paridad total, procedencia, actor = persona)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes, §4.2)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- **Estado duradero sólo en Studio.** El work item, sus insumos, su entregable y su historia viven en `studio.*`;
  ningún campo guarda ids de hilo, sesión o memoria de un proveedor como fuente.
- **Insumos por referencia versionada, nunca copias** (`{kind, id, version}`): brief, plan, modelo de cliente,
  snapshot SEO/AEO, pieza, aprendizaje.
- **Quien pide es siempre una persona** (o un programa creado por una persona, TASK-1915). Una identidad de servicio
  nunca aparece como `requested_by` sin programa y responsable humano.
- **El actor auditado es la persona.** Cuando la acción la ejecuta un agente con identidad delegada, el evento registra
  además `executed_by = agent:<rol>@<versión>` y la corrida (ADR §4.4); nunca al agente como actor.
- **Aceptar un entregable es `T1` con `requiresPerson`**; aprobar lo que ese entregable alimenta (plan, presupuesto,
  versión) sigue siendo `T2` de su task dueña.
- **Traspaso = work item nuevo.** Nunca reutilizar el mismo work item para otro rol.
- **Ausencia ≠ cero:** un work item sin costo reportado muestra «sin dato», nunca 0.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` (reglas del registro de operaciones, paridad, errores).
- `.claude/skills/efeonce-agent-media-planner/SKILL.md` y `.claude/skills/efeonce-agent-seo-aeo/SKILL.md` (sección
  «Cuando existan work items y escrituras»: lo que el rol hará con estas tools).
- `.claude/skills/mcp-craft/SKILL.md` (descripciones de tools: cuándo usar, qué NO significa, qué hacer después).
- `docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md` (kernel, errores, digest).
- `docs/tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md` (canje por capability, `Efeonce-Delegated-Token`).

## Contrato editorial SEO reconciliado — 2026-10-04

Esta task es la única foundation de work items para el flujo editorial SEO. TASK-1667
especializa tipos/inputs/entregables/evidencias, reutilizando estas entidades y sus commands;
QA y publication evidence no sustituyen la state machine genérica. TASK-1669 entrega el plan
advisory en el mismo modelo, no un aggregate Greenhouse paralelo. Las especializaciones son
consumers y no bloquean la foundation; tras aceptar, una iteración/traspaso es trabajo nuevo.

Canon: ADR de estrategia Studio §14. Esta precisión documental no implementa ni cierra esta task.

## Dependencies & Impact

### Depends on

- `TASK-1894`: kernel de commands (`Idempotency-Key`, `If-Match`/`expectedRevision`, `requiresPerson`, `dryRun` →
  `proposalDigest`), capability `marketing_studio.campaign.write`, scope `studio:write`.
- `TASK-1899`: federación de escrituras MCP con la persona como actor y un cliente de canje por capability.
- `TASK-1914` (sólo Slice 4): tarjeta de rol publicada, techos por corrida/rol, política por organización.
- `TASK-1909` (sólo el enganche del entregable): `provenance_id` y aceptación de borradores de IA.
- `TASK-1907` (pregunta abierta 6): relación entre tipos de work item e ítems del plan de contenidos.

### Blocks / Impacts

- TASK-1667 y TASK-1669 como especializaciones posteriores; no blockers de foundation.

- `TASK-1914`: los roles declaran qué tipos de work item aceptan (catálogo de esta task).
- `TASK-1915`: consume el evento de asignación a un rol de agente y `assignmentId` como clave de idempotencia.
- `TASK-1916`: las métricas por rol se calculan desde work items y sus eventos.
- `TASK-1895` / `TASK-1912`: vista de work items en la UI (follow-up, consumidora de estos readers y commands).
- Skills de rol interactivas: pasan de «modo actual» a «con work items» cuando esta task esté en producción.

### Files owned

- Repo Studio: `packages/database/migrations/<ts>_work-items.sql` [nuevo], `packages/database/seeds/work-item-types-v1.json` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/work-items.ts` [nuevo], `packages/contracts/src/operations.ts`, `packages/contracts/src/semantics.ts`, `packages/domain/src/work-items/**` [nuevo], `packages/domain/src/readers/work-items.ts` [nuevo], `apps/web/src/app/api/v1/work-items/**` [nuevo], `apps/web/src/app/api/v1/campaigns/[campaignId]/work-items/**` [nuevo], `apps/web/src/app/api/v1/work-item-types/**` [nuevo], `packages/contracts/generated/tool-manifest.json` (regenerado, nunca a mano)
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md` (sección «Trabajo asignado»), `.claude/skills/efeonce-marketing-studio/references/{contracts,program-ledger}.md`, docs funcionales y manual de Studio
- Gateway `efeonce-mcp`: `src/providers/marketing-studio-tool-manifest.generated.ts` (sync), `package.json` (versión), `surface-baseline.json`

## Current Repo State

### Already exists

- Registro de operaciones Studio en `packages/contracts/src/operations.ts` y test de paridad
  `apps/web/src/server/operations-parity.test.ts`; el inventario actual se deriva del registro, no del conteo histórico.
- Kernel de commands de escritura existente en `packages/domain/src/commands/kernel.ts` (verificado en el
  checkout Studio el 2026-10-04). Sus gates se reutilizan; esta task no reconstruye la foundation TASK-1894.
- Tabla `studio.audit_event` (`packages/database/migrations/1758800000000_studio-foundation.sql`) y el actor `user`
  con `subject` en `packages/domain/src/actor.ts`.
- ADR híbrido aceptado (2026-09-26) y skills de rol interactivas `efeonce-agent-media-planner` y
  `efeonce-agent-seo-aeo`, que ya describen cómo operarán cuando existan work items.

### Gap

- No existe entidad de trabajo, catálogo de tipos, máquina de estados, asignación, revisión ni traspaso.
- No hay forma de listar «qué tengo asignado» para una persona ni para un rol de agente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/work-items/**`, rutas `/api/v1`) + manual servido en Greenhouse + sync en `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: commands y readers de work items en `packages/domain` (sin tipos de framework); consumidores autorizados: rutas `/api/v1`, tools MCP federadas, despachador de TASK-1915, UI de TASK-1895/1912
- Server/browser split: commands y readers corren en el servidor; la UI sólo llama la API
- Build impact: `none`
- Extraction blocker: `none` (el work item es de Studio; si el despachador se promueve a plataforma, se lleva el puerto de corrida, no esta entidad)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `studio.work_item_type`, `studio.work_item`, `studio.work_item_input`, `studio.work_item_deliverable`, `studio.work_item_event` (nuevas)
- Consumidores afectados: agentes y personas vía MCP, API `/api/v1`, despachador (TASK-1915), métricas (TASK-1916), UI (TASK-1895/1912)
- Runtime target: Studio staging/production; gateway `efeonce-mcp`

### Contract surface

- Contrato existente a respetar: forma común de command de TASK-1894; `riskTier` del registro (TASK-1905); errores del `ERROR_CATALOG`; digest de `T2` de TASK-1899
- Contrato nuevo o modificado: operaciones y tools de Detailed Spec §«Operaciones y tools»; evento `work_item_event` con `kind` cerrado
- Backward compatibility: `compatible` (entidades nuevas; nada existente cambia)
- Full API parity: crear, editar, asignar, reasignar, iniciar, entregar, revisar, aceptar, pedir cambios, bloquear, desbloquear, cancelar y leer tienen command/reader, ruta y tool; la UI no tiene acciones propias

### Data model and invariants

- Entidades/tablas/views afectadas: ver Detailed Spec §«Modelo»
- Invariantes que no se pueden romper:
  - toda transición de estado pasa por el command y respeta la matriz; una transición fuera de la matriz ⇒ `409 work_item_invalid_transition`
  - `work_item_event` es append-only (trigger que rechaza `UPDATE`/`DELETE`)
  - `requested_by_subject` siempre es una persona, o `program_id` con `program_owner_subject` persona
  - exactamente uno de `assignee_subject` o (`assignee_role_key`, `assignee_role_version`) cuando el estado es `assigned` o posterior; ninguno en `draft`/`ready`
  - un work item asignado a un rol sólo acepta un rol **publicado** que declare ese tipo; versión fijada al asignar
  - un entregable siempre apunta a entidades de Studio (`{entityType, entityId, revision}`); un entregable de agente sin `provenance_id` ⇒ `422 provenance_required` (cuando TASK-1909 esté activa)
  - aceptar y pedir cambios exigen actor persona; un `api_client` o una identidad de servicio ⇒ `403 approval_requires_person`
  - el traspaso crea un work item nuevo con `parent_work_item_id`; el original pasa a `handed_off` y nunca se reasigna a otro rol
  - asignar a un rol sin margen en el techo sin confirmación ⇒ `409 confirmation_required` con `proposalDigest`
  - cancelar nunca borra: el work item queda `cancelled` con su historia
- Write-target allowlist: N/A (Studio no tiene boundary test de destinos; declarado)
- Tenant/space boundary: por `campaign.organization_id`; un actor sin la organización recibe `404` (anti-oráculo, igual que los readers existentes)
- Idempotency/concurrency: `Idempotency-Key` en toda escritura (misma llave ⇒ mismo resultado guardado); `If-Match`/`expectedRevision` en toda transición; cada asignación genera un `assignment_id` estable que TASK-1915 usa como clave de la corrida lógica; ante resultado ambiguo el cliente **lee** el work item antes de reintentar
- Audit/outbox/history: `audit_event` por command (actor persona + `executed_by` cuando corresponde) y `work_item_event` por transición; el despachador lee los eventos `assigned` a rol (sin outbox nuevo en esta task)

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_WORK_ITEMS_ENABLED=false`; con OFF las tools responden `disabled` y las rutas `503 feature_disabled`; la asignación a roles de agente además exige `STUDIO_AGENT_ASSIGNMENT_ENABLED=true`
- Backfill plan: ninguno; semilla del catálogo de tipos v1 (dry-run → revisión humana → `--apply`)
- Rollback path: flags OFF; revert PR; las tablas quedan sin uso (no hay contract)
- External coordination: release de Greenhouse (capability + manual servido), sync y dispatch del gateway

### Security and access

- Auth/access gate: lecturas `marketing_studio.campaign.read` / `studio:read`; escrituras `marketing_studio.campaign.write` / `studio:write`; aceptar y pedir cambios con `requiresPerson`; confirmar una asignación sobre el techo con `marketing_studio.campaign.approve` (decisión del operador 2026-09-26; sin capability nueva)
- Sensitive data posture: sin PII más allá del `subject` de personas; las notas de revisión son texto de trabajo, no se loggean
- Error contract: `work_item_invalid_transition`, `work_item_role_not_eligible`, `work_item_role_disabled`, `approval_requires_person`, `confirmation_required`, `confirmation_mismatch`, `revision_conflict`, `provenance_required`, `feature_disabled` (todos en `ERROR_CATALOG`, prosa es-CL)
- Abuse/rate-limit posture: tope de 200 work items abiertos por campaña y de 20 asignaciones a agentes por persona y día (`STUDIO_AGENT_ASSIGNMENTS_DAILY_LIMIT_PER_PERSON`), ajustables por env

### Runtime evidence

- Local checks: tests de la matriz de estados (todas las transiciones válidas e inválidas), invariantes de asignación, append-only, idempotencia con la misma llave, `412` por revisión, paridad y leak test del manifiesto
- DB/runtime checks: migración con bloque `DO` de verificación; `SELECT` sobre `information_schema` y triggers en staging
- Integration checks: sesión MCP real en staging sobre `CMP-900`: crear → asignar a persona → iniciar → entregar → revisar → pedir cambios → entregar → aceptar con traspaso → nuevo work item encadenado
- Reliability signals/logs: frescura `work_items_stuck` (work items en `assigned`/`in_progress` > 7 días sin evento) en el health profundo; `logEvent` en transiciones rechazadas
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de work items en `packages/domain`, no en la UI.
- [ ] Work item modelado como recurso con commands, no como click-handler.
- [ ] Reads como readers; writes como commands con idempotencia, `If-Match`, autorización fina y errores canónicos.
- [ ] Sin capability nueva salvo lo declarado en Open Questions; si se decide una, entra con su grant en el mismo PR y su cliente de canje (receta TASK-1899).
- [ ] Camino programático: `/api/v1` + tools federadas en Efeonce MCP.
- [ ] Toda operación declara `riskTier` y ninguna se puede degradar desde el cliente.
- [ ] Un primitive, muchos consumers: persona por MCP, agente delegado, despachador y UI sobre los mismos commands.
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

### Slice 1 — Modelo y catálogo de tipos

- Migración `<ts>_work-items.sql` con las tablas de Detailed Spec §«Modelo», trigger append-only en
  `work_item_event`, índices por `(campaign_id, state)`, `(assignee_subject, state)` y
  `(assignee_role_key, state)`, bloque `DO` de verificación.
- Catálogo `work_item_type` versionado (dato, no código) y semilla v1: `media_plan`, `seo_aeo_brief`,
  `channel_copy_set`, `creative_brand_qa`, `performance_readout`, cada uno con entidades de entregable aceptadas,
  criterio de revisión por defecto y tipo sugerido para el traspaso. Resuelve la pregunta abierta 6 del ADR (ver
  Detailed Spec §«Catálogo de tipos»).

### Slice 2 — Máquina de estados y commands con personas

- Commands `createWorkItem`, `updateWorkItem` (sólo en `draft`/`ready`), `markWorkItemReady`, `assignWorkItem` a
  persona, `startWorkItem`, `submitWorkItem` (exige al menos un entregable), `startWorkItemReview`,
  `acceptWorkItem` (con traspaso opcional), `requestWorkItemChanges` (la observación entra como insumo nuevo y el
  estado vuelve a `assigned`), `blockWorkItem`/`unblockWorkItem`, `cancelWorkItem`.
- Cada command valida la matriz, escribe `work_item_event` y `audit_event` en la misma transacción.

### Slice 3 — Readers, rutas, registro y tools

- Readers `listWorkItems` (por campaña, responsable, rol, estado; cursor), `getWorkItem` (con insumos, entregables e
  historia), `listWorkItemTypes`.
- Rutas `/api/v1`, entradas en `operations.ts` con `riskTier` y descripciones escritas con `mcp-craft`; manifiesto
  regenerado; test de paridad y leak test verdes.

### Slice 4 — Asignación a roles de agente y regla de techo

- `assignWorkItem` con `assignee = {kind: 'agent_role', roleKey}`: resuelve la versión publicada de TASK-1914,
  verifica que el rol acepta el tipo, que el rol y el modo pedido están habilitados, que el kill switch está apagado y
  que la organización admite al menos un runtime del rol.
- Regla de techo (ADR §4.1): el command pide al puerto de presupuesto de TASK-1914/1915
  (`evaluateAgentAssignmentBudget`) el margen del rol y de la organización para el costo estimado de la corrida; con
  margen ⇒ `T1`; sin margen ⇒ `409 confirmation_required` con `proposalDigest`, y la confirmación la da una persona
  con `marketing_studio.campaign.approve` y token sin `act` (regla de TASK-1915; capability decidida por el operador
  el 2026-09-26). Mientras TASK-1915 no registre corridas, el margen es el techo completo y
  el modo sólo puede ser interactivo (el costo lo absorbe el cliente de la persona).
- Genera `assignment_id` estable; reasignar o pedir cambios crea uno nuevo; el evento `assigned` a rol lleva
  `{assignmentId, roleKey, roleVersion, mode}` para el despachador.

### Slice 5 — Entregables y traspaso

- `submitWorkItem` acepta referencias a borradores de Studio (plan, copy, brief de contenido, informe de QA, informe
  semanal, versión de pieza) con su `revision`; con TASK-1909 activa, un entregable producido por agente exige
  `provenance_id`.
- `acceptWorkItem` con `handoff: {typeKey, assignee?}` crea el work item siguiente (`parent_work_item_id`,
  insumos = entregables aceptados del anterior) y deja el original en `handed_off`.

### Slice 6 — Manual servido, skills de rol y rollout

- Sección «Trabajo asignado» en `docs/mcp/skills/marketing-studio/SKILL.md` (cómo tomar, entregar y pedir revisión;
  qué NO hacer: aceptar el propio trabajo, reasignar para evitar la revisión).
- Sync del gateway con bump de versión, dispatch y canary; skills de rol actualizadas en su sección «Cuando existan
  work items» (coordinar con su autor, espejo `.codex`).

## Out of Scope

- La UI de work items (tablero, bandeja «mis asignaciones», revisión): follow-up consumidor en TASK-1895/1912.
- Ejecutar corridas de agentes, la delegación en segundo plano y los programas: TASK-1915.
- Definir roles, tarjetas y techos: TASK-1914. Evals y métricas: TASK-1916.
- Notificaciones (correo, Teams) al asignar o entregar: follow-up.
- Dependencias entre work items más allá del traspaso encadenado (grafos, bloqueos cruzados): follow-up si el uso lo pide.

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `work_item_type` | `(type_key, version_no) PK`, `status draft\|published\|superseded`, `label_es`, `deliverable_entity_types text[]`, `default_review_criteria jsonb`, `suggested_next_type_key NULL`, `content_plan_item_kind NULL`, `published_by`, `published_at` |
| `work_item` | `work_item_id PK`, `public_id` (`WI-#####`, función con un solo `nextval` y `lpad(n, GREATEST(5, length(n)))`), `campaign_id FK`, `organization_id` (derivado de la campaña), `type_key`, `type_version`, `title`, `instructions`, `state`, `requested_by_subject NULL`, `program_id NULL`, `program_owner_subject NULL`, `assignee_subject NULL`, `assignee_role_key NULL`, `assignee_role_version NULL`, `assignment_id NULL`, `assignment_mode interactive\|background\|scheduled NULL`, `reviewer_subject NULL`, `review_criteria jsonb`, `due_at NULL`, `parent_work_item_id NULL`, `revision`, `created_at`, `updated_at` |
| `work_item_input` | `input_id PK`, `work_item_id`, `kind` (`brief`, `strategy_plan`, `customer_model`, `seo_snapshot`, `asset_version`, `copy_variant`, `learning`, `review_note`, `work_item_deliverable`), `ref_id`, `ref_version NULL`, `note NULL`, `added_by_subject`, `added_at` |
| `work_item_deliverable` | `deliverable_id PK`, `work_item_id`, `assignment_id`, `entity_type`, `entity_id`, `entity_revision`, `provenance_id NULL`, `submitted_at` |
| `work_item_event` | `event_id PK`, `work_item_id`, `kind` (`created`, `updated`, `ready`, `assigned`, `started`, `submitted`, `review_started`, `accepted`, `changes_requested`, `blocked`, `unblocked`, `cancelled`, `handed_off`), `from_state`, `to_state`, `actor_subject NULL`, `executed_by NULL` (`agent:<rol>@<versión>` o `service:<rol>`), `run_id NULL`, `assignment_id NULL`, `payload jsonb`, `at` |

### Matriz de estados

| Desde | Hacia | Command | Quién |
|---|---|---|---|
| `draft` | `ready` | `markWorkItemReady` | persona con `.campaign.write` |
| `ready`, `changes_requested` | `assigned` | `assignWorkItem` | persona (o agente delegado para asignar a persona) |
| `assigned` | `assigned` | `assignWorkItem` (reasignar) | persona |
| `assigned` | `in_progress` | `startWorkItem` | el responsable (persona o corrida del rol) |
| `in_progress` | `submitted` | `submitWorkItem` | el responsable |
| `submitted` | `in_review` | `startWorkItemReview` | revisor o persona con `.campaign.write` |
| `in_review` | `accepted` / `handed_off` | `acceptWorkItem` | persona (`requiresPerson`), distinta del responsable persona |
| `in_review` | `changes_requested` → `assigned` | `requestWorkItemChanges` | persona (`requiresPerson`) |
| no terminal | `blocked` / estado previo | `blockWorkItem` / `unblockWorkItem` | persona o responsable |
| no terminal | `cancelled` | `cancelWorkItem` | persona; si hay corrida abierta, TASK-1915 la cancela al leer el evento |

Terminales: `accepted`, `handed_off`, `cancelled`. Una persona no acepta su propio trabajo (`409 work_item_self_review`).

### Catálogo de tipos (pregunta abierta 6)

Los tipos son dato versionado. Relación con el plan de contenidos de TASK-1907: un tipo puede declarar
`content_plan_item_kind`; si el work item nace desde un ítem del plan, ese ítem entra como insumo y el entregable
aceptado lo cubre (el hueco de contenidos de TASK-1907 lee esa cobertura). Un work item nunca crea ni modifica ítems
del plan por sí mismo. Publicar una versión nueva del catálogo es `T1` con `.catalog.manage` (TASK-1905).

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `listWorkItemTypes` | `GET /api/v1/work-item-types` | `studio.work_item_types.list` | T0 |
| `listWorkItems` | `GET /api/v1/work-items?campaignId=&assignee=&roleKey=&state=&cursor=` | `studio.work_items.list` | T0 |
| `getWorkItem` | `GET /api/v1/work-items/{workItemId}` | `studio.work_item.get` | T0 |
| `createWorkItem` | `POST /api/v1/campaigns/{campaignId}/work-items` | `studio.work_item.create` | T1 |
| `updateWorkItem` | `PATCH /api/v1/work-items/{workItemId}` | `studio.work_item.update` | T1 |
| `markWorkItemReady` | `POST /api/v1/work-items/{workItemId}/ready` | `studio.work_item.ready` | T1 |
| `assignWorkItem` | `POST /api/v1/work-items/{workItemId}/assign` | `studio.work_item.assign` | T1 (persona o rol dentro del techo) · T2 (rol sobre el techo: `dryRun` → digest → confirmación) |
| `startWorkItem` | `POST /api/v1/work-items/{workItemId}/start` | `studio.work_item.start` | T1 |
| `submitWorkItem` | `POST /api/v1/work-items/{workItemId}/submit` | `studio.work_item.submit` | T1 |
| `startWorkItemReview` | `POST /api/v1/work-items/{workItemId}/review` | `studio.work_item.review.start` | T1 |
| `acceptWorkItem` | `POST /api/v1/work-items/{workItemId}/accept` | `studio.work_item.accept` | T1 (persona) |
| `requestWorkItemChanges` | `POST /api/v1/work-items/{workItemId}/request-changes` | `studio.work_item.changes.request` | T1 (persona) |
| `blockWorkItem` · `unblockWorkItem` | `POST …/block` · `POST …/unblock` | `studio.work_item.block` · `studio.work_item.unblock` | T1 |
| `cancelWorkItem` | `POST /api/v1/work-items/{workItemId}/cancel` | `studio.work_item.cancel` | T1 (persona) |

Descripciones de tool (guía): `studio.work_item.accept` dice que aceptar **no** aprueba el plan ni el presupuesto que
el entregable alimenta, y que el siguiente paso es la tool `T2` dueña con `dryRun`. `studio.work_item.assign` dice que
asignar a un rol puede devolver `confirmation_required` y que el agente debe mostrar el digest a la persona.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1894 y TASK-1899 en producción → Slice 1 → Slice 2 → Slice 3 → (TASK-1914 Slices 1–3 en staging) → Slice 4 → Slice 5 → Slice 6.
- `STUDIO_WORK_ITEMS_ENABLED` se prende en staging tras la sesión MCP de punta a punta con personas; en production tras un release del gateway.
- `STUDIO_AGENT_ASSIGNMENT_ENABLED` se prende sólo después de TASK-1914 en el mismo ambiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente acepta su propio entregable | gobernanza | medium | `acceptWorkItem` exige persona y distinta del responsable persona; un token con `act` nunca acepta (regla de TASK-1915) | `audit_event` de aceptaciones con `executed_by` no nulo = 0 |
| Asignaciones que disparan gasto sin autorización | costo | medium | regla de techo con `T2`; tope diario de asignaciones por persona | asignaciones `T2` confirmadas vs rechazadas (TASK-1916) |
| Work items abandonados | operación | medium | frescura `work_items_stuck`; cancelar conserva historia | `work_items_stuck` > 0 |
| Transición concurrente pisa otra | datos | low | `If-Match` obligatorio; `412` ⇒ releer | tasa de `412` en `logEvent` |
| El catálogo de tipos diverge del plan de contenidos | producto | low | tipos como dato versionado; relación declarada, no inferida | revisión de catálogo |

### Feature flags / cutover

- `STUDIO_WORK_ITEMS_ENABLED` (Vercel de Studio; default `false`) y `STUDIO_AGENT_ASSIGNMENT_ENABLED` (default `false`); filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime = Vercel de Studio.
- `STUDIO_AGENT_ASSIGNMENTS_DAILY_LIMIT_PER_PERSON` (default 20) en el runbook de Studio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; tablas vacías quedan (sin contract) | < 15 min | sí |
| Slices 2–5 | flag OFF (rutas `503`, tools `disabled`); revert PR | < 15 min | sí |
| Slice 6 | revert del sync del gateway + dispatch | < 30 min | sí |

### Production verification sequence

1. Migración y trigger append-only verificados en staging (`UPDATE` sobre `work_item_event` falla).
2. Sesión MCP real en staging sobre `CMP-900`: ciclo completo con personas y traspaso; transición inválida ⇒ `409`.
3. Con TASK-1914 en staging: asignar a un rol publicado dentro del techo (`T1`) y sobre el techo (`confirmation_required` → confirmación de persona).
4. Production con flags OFF → ON tras release; repetir 2 con una campaña real con permiso del operador.

### Out-of-band coordination required

- Operador revisa la semilla del catálogo de tipos v1 antes del `--apply`.
- Autor de las skills de rol incorpora las tools reales en su sección «Cuando existan work items».

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El modelo permite la especialización editorial SEO TASK-1667 por inputs/entregables/evidencias y la entrega advisory TASK-1669 sin duplicar entidades/lifecycle.
- [ ] Trabajo/deliverable aprobado no implica publish/indexación/outcome; refs de versión/publicación y QA permanecen distinguibles.
- [ ] Iteración/traspaso conserva parent/reason/evidence y assignment estable para el dispatcher1915, sin depender del runtime de 1669.

- [ ] Las cinco tablas existen en staging y production; `work_item_event` rechaza `UPDATE` y `DELETE`.
- [ ] Toda transición fuera de la matriz responde `409 work_item_invalid_transition`; toda transición válida escribe `work_item_event` y `audit_event` en la misma transacción.
- [ ] Aceptar y pedir cambios con un `api_client` responden `403 approval_requires_person`; una persona aceptando su propio trabajo recibe `409 work_item_self_review`.
- [ ] Asignar a un rol publicado dentro del techo es `T1`; sobre el techo responde `confirmation_required` y sólo ejecuta con la confirmación de una persona con `marketing_studio.campaign.approve` (sin ella, `forbidden`).
- [ ] Aceptar con traspaso crea un work item nuevo con `parent_work_item_id` y deja el original en `handed_off`.
- [ ] Cada asignación genera un `assignment_id` estable presente en el evento `assigned`.
- [ ] Las 15 operaciones están en `operations.ts` con `riskTier`, ruta y tool; test de paridad y leak test verdes.
- [ ] Sesión MCP real de punta a punta verde en staging y production.
- [ ] Manual servido con la sección «Trabajo asignado» publicado en producción de Greenhouse.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Greenhouse: `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, `pnpm skills:mirrors`, `pnpm task:lint --task TASK-1913`.
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

- Vista de work items en la UI (tablero por campaña, bandeja «mis asignaciones», revisión con diff del entregable): TASK-1895 o TASK-1912 como consumidora; no se crea wireframe aquí.
- Notificaciones al asignar, entregar y pedir cambios (correo y Teams).
- Directorio de personas asignables por el lane de Greenhouse (hoy la asignación recibe el `subject`).

## Open Questions

- ¿Cómo se eligen personas asignables sin directorio en Studio? Propuesta: reader del lane ecosystem de Greenhouse filtrado por capability `marketing_studio.campaign.write` (follow-up); mientras tanto, `subject` explícito.
- ¿Tope de 200 work items abiertos por campaña y 20 asignaciones a agentes por persona y día son los correctos? Ajustables por env.
