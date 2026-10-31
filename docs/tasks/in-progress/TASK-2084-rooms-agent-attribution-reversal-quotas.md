# TASK-2084 — Rooms: atribución de agentes, aviso, reversa y cuotas

## Delta 2026-10-31 — lo que necesita TASK-2085 (pantalla «Actividad de agentes»)

- El reader de actividad debe entregar, ya resueltos por el servidor:
  - un resumen legible de cada acción, generado desde la entrada validada y nunca desde un texto del agente;
  - los nombres visibles del agente y de la persona;
  - el estado de la reversa (`available | done | failed` con motivo);
  - las acciones `author`, además de `release` y `access`.
- El descriptor de reversa debe nombrar un comando ejecutable. Si `editions.publish` no puede republicar la edición
  anterior, el comando nuevo de republicación es parte de esta task (slice 4), no de la UI. La UI no encadena
  `editions.reopen` + `editions.publish` en el navegador.
- Si los contadores de cuota se muestran en la UI, se exponen por el mismo reader.

## Delta 2026-10-31 — implementación local (slices 1–5) y decisiones de Discovery

- **Atribución sin tocar cada escritor.** El contexto del actor vive junto al `Principal` (`AsyncLocalStorage`,
  `src/server/agents/actor-context.ts`) y `transaction()` lo copia a settings locales de la transacción
  (`rooms.actor_kind`, `rooms.agent_client_id`, `rooms.channel`). Las columnas toman su default de ahí. Cubre los
  once escritores y los futuros. Lo fijan la API (comandos), el login, las invitaciones, el bootstrap del dueño (`cli`)
  y los workers de medios.
- **Canal `system`** para workers y limpieza, además de `browser | cli | gateway`.
- **Encabezados locales:** `X-Rooms-Channel: cli` (la CLI y el MCP los mandan siempre) y `X-Rooms-Agent: <id>` (CLI
  con `--agent` o `ROOMS_AGENT_CLIENT`; MCP con el nombre del handshake). Un invitado puede declarar `cli`, pero nunca
  un agente; `gateway` solo lo fija TASK-2087.
- **Avisos y cuotas en la base**, con triggers sobre `audit`/`access_events` y funciones SQL espejo de
  `AGENT_NOTICE_OPERATIONS` / `AGENT_QUOTAS`, más tests de paridad. Tablas: `rooms.agent_action_notices` y
  `rooms.agent_lane_counters`. Topes: publicar 10, invitar 30, dar acceso 10 por persona y hora; revocaciones sin tope.
- **Comando nuevo `editions.republish`** (clase `release`): vuelve a publicar una edición anterior como edición
  nueva; rechaza si hay un borrador abierto y autoriza antes de cualquier conflicto. Reversa de publicar: republicar la
  anterior, archivar si era la primera, `unavailable` si ya hay una más reciente.
- **Reader** `agents.activity` (`GET /api/v1/agents/activity`, SDK `agentActivity`, CLI `agents-activity`, MCP) y
  comando `agents.acknowledgeNotice` (solo la persona). `access.grant` devuelve `resourceId` en su recibo.
- Migraciones expand: `1793262000000_rooms-agent-attribution`, `1793263000000_rooms-agent-notices`,
  `1793264000000_rooms-agent-republish`, `1793265000000_rooms-agent-quotas`.

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
- Backend impact: `migration`
- Epic: `EPIC-052`
- Status real: `Code complete en local (efeonce-rooms rama claude/rooms-agent-attribution, slices 1–5: f0499bf, 31b9a27, c64665a, 872f17e, aced4e5; verify 406/406 sin skips). Rollout pendiente: ensayo + migraciones 1793262–1793265 en rooms_production, merge, deploy y alias; slice 6 (contract) después del release. Sin push.`
- Rank: `primera task del carril de agentes; antes de TASK-2085, TASK-2087, TASK-2090 y TASK-2091`
- Domain: `platform|identity`
- Blocked by: `ninguno para el corte local; producción espera autorización (migración + merge + deploy)`
- Branch: `efeonce-rooms: rama derivada de main, sin push a main hasta autorización; Greenhouse: docs en develop`

## Summary

Los agentes ya operan Rooms por la CLI y el MCP stdio local, pero entran con la cookie de una persona y quedan
registrados como esa persona: nadie sabe qué hizo un agente. Esta task agrega el registro de actor
(`actor_kind`, `agent_client_id`, `channel`) a cada escritura, avisa a la persona por cada acción de publicación o de
acceso hecha por su agente, expone un reader de actividad con la reversa de cada acción, pone cuotas por persona y
hora, y genera la clasificación de scopes del ADR desde el catálogo de operaciones con un guard de paridad.

## Why This Task Exists

El ADR del carril de agentes decidió que los agentes son ciudadanos de primera clase: publican, invitan y dan acceso
directo, sin aprobación previa. Esa decisión es segura sólo si existen atribución, aviso, reversa rápida y cuotas.
Hoy `rooms.command_receipts` y `rooms.audit` guardan `principal_id` sin tipo de actor, `rooms.access_events` guarda
`actor` como `principal:<id>` y la CLI se autentica con `--session-file` (cookie humana copiada). Un agente en bucle
podría mandar cien invitaciones y quedaría registrado como la persona. Además, sin la clasificación de D2 no se puede
construir el verificador del token delegado (TASK-2087) ni el provider del gateway (TASK-2088).

## Goal

- Cada escritura de Rooms registra quién actuó: persona o agente, qué cliente de agente y por qué canal.
- La persona recibe un aviso en la actividad de Rooms por cada acción `release` o `access` hecha por su agente, con
  la forma de revertirla.
- Toda acción que llega al cliente tiene su reversa como comando, con la misma paridad.
- Un agente en bucle choca con un tope por persona y hora, y la señal lo hace visible.
- Toda operación del catálogo tiene clase de scope o exclusión con motivo; una operación nueva sin clasificar rompe
  el build.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D2, D3, D4 y D7 en la parte de Rooms)
- `docs/architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` (`rooms.access_events`, `members.*`)
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md` (canal `cli`; sin cambio de herramientas)
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NUNCA** un principal ni grants propios para un agente: `principal_id` sigue siendo la persona; la atribución vive
  en columnas aparte y no en el `Principal`.
- **SIEMPRE** registrar `actor_kind`, `agent_client_id` y `channel` en cada escritura nueva.
- **SIEMPRE** avisar a la persona de cada acción `release` o `access` de su agente, con la forma de revertirla.
- **SIEMPRE** clasificar cada operación nueva del catálogo o excluirla con un motivo escrito.
- La atribución por la CLI y el MCP local es declarativa (la cookie es de la persona): sirve para registro, aviso y
  cuotas, **nunca** como frontera de autorización. La frontera real llega con el gateway (TASK-2087).
- Tablas con `reject_mutation` (append-only) no se reescriben: sin backfill por `UPDATE`.
- Expand antes del deploy, contract después del release (CLAUDE.md §Database Migrations; hay una sola base de
  producción de Rooms, `rooms_production`).

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `references/program-ledger.md`
- `docs/audits/rooms/2026-10-31-durable-access-production.md` (patrón de ensayo, respaldo y migración en producción)
- `docs/audits/rooms/2026-10-31-production-migration-rehearsal.md`
- `docs/documentation/rooms/backend-api-for-claude-design.md`

## Dependencies & Impact

### Depends on

- TASK-2082 (complete en producción el 2026-10-31): `rooms.access_events`, `members.*`, executor de acceso.
- Tablas existentes: `rooms.command_receipts`, `rooms.audit`, `rooms.outbox`, `rooms.collaboration_events`,
  `rooms.crm_handoffs`, `rooms.source_imports`, `rooms.access_events`.
- Catálogo `canonicalMcpOperations` en `src/server/mcp/manifest.ts` (repo `efeonce-rooms`).

### Blocks / Impacts

- TASK-2085 (pantalla «Actividad de agentes» con reversa): consume el reader y las reversas de esta task.
- TASK-2087 (verificador del token delegado): escribe `channel='gateway'` y `agent_client_id` en estas columnas y usa
  la clasificación D2 para comparar scopes.
- TASK-2088 (provider `rooms` en `efeonce-mcp`): publica las clases de scope generadas aquí.
- TASK-2090 (importación gobernada de medios): nace con atribución y clasificación.
- TASK-2091 (skill de oficio + eval): mide sobre la actividad atribuida.

### Files owned

- `../efeonce-rooms/migrations/<timestamp>_rooms-agent-attribution.sql` (nuevo, expand)
- `../efeonce-rooms/migrations/<timestamp>_rooms-agent-attribution-enforce.sql` (nuevo, contract, después del release)
- `../efeonce-rooms/src/domain/agent-lane-contracts.ts` (nuevo: clases, exclusiones, reversas, cuotas, DTO de actividad)
- `../efeonce-rooms/src/server/agents/**` (nuevo: contexto de actor, avisos, cuotas, reader `agents.activity`, señales)
- `../efeonce-rooms/src/server/session.ts` (resolver el contexto de actor junto al principal)
- `../efeonce-rooms/src/server/commands/execute.ts`, `src/server/commands/feature-receipts.ts`
- `../efeonce-rooms/src/server/access/service.ts`, `src/server/invitations/service.ts`,
  `src/server/collaboration/service.ts`, `src/server/integrations/service.ts`,
  `src/server/presentation/lifecycle.ts`, `src/server/media/service.ts`, `src/server/media/multimedia/service.ts`,
  `src/server/media/worker.ts`, `src/server/media/cleanup.ts` (escritores de `audit`/`command_receipts`)
- `../efeonce-rooms/src/server/mcp/manifest.ts`, `src/server/mcp/http-client.ts`, `src/server/mcp/server.ts`
- `../efeonce-rooms/scripts/rooms.ts`, `scripts/lib/rooms-cli-session.ts`, `scripts/access.ts`
- `../efeonce-rooms/tests/agent-*.test.ts` (nuevos)
- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (delta al cerrar)

## Current Repo State

### Already exists

- Executor canónico con idempotencia por `rooms.command_receipts` (PK `organization_id, principal_id, operation,
  idempotency_key`) y lock de organización: `src/server/commands/execute.ts`.
- `rooms.audit` append-only (`reject_mutation`, exige `room_id`) y `rooms.outbox` con FK `id → rooms.audit(id)`:
  `migrations/1792962301842_rooms-foundation.sql`.
- `rooms.collaboration_events` (`1793250000000_rooms-collaboration.sql`), `rooms.source_imports` y
  `rooms.crm_handoffs` (`1793252000000_rooms-integrations.sql`), todas con `reject_mutation`.
- `rooms.access_events` append-only con `actor` `principal:|system:` (`1793260000000_rooms-internal-access.sql`).
- Once escritores de `audit`/`command_receipts`/`access_events`/eventos de dominio: `src/server/access/service.ts`,
  `collaboration/service.ts`, `commands/execute.ts`, `commands/feature-receipts.ts`, `integrations/service.ts`,
  `invitations/service.ts`, `media/cleanup.ts`, `media/multimedia/service.ts`, `media/service.ts`, `media/worker.ts`,
  `presentation/lifecycle.ts`.
- Catálogo `canonicalMcpOperations`, `MCP_OPERATION_EXCLUSIONS` y el guard `assertMcpOperationCoverage`
  (`src/server/mcp/manifest.ts`): patrón a replicar para la clasificación D2.
- Reversas existentes: `rooms.archive` y `access.revoke` (`src/domain/persistence-contracts.ts`),
  `invitations.revoke` (`src/domain/invitation-contracts.ts`), `members.revokeInternal`
  (`src/domain/access-contracts.ts`).
- Señales de acceso `rooms.access.no_owner` / `owner_expiring` (`src/server/access/bootstrap.ts`) servidas por
  `pnpm access:health` (`scripts/access.ts`): patrón para las señales del carril.
- CLI `scripts/rooms.ts` y MCP stdio `scripts/rooms-mcp.ts` autenticados con `--session-file`
  (`scripts/lib/rooms-cli-session.ts`, `src/server/mcp/http-client.ts`).
- Ensayo de migración en clon de producción: `pnpm db:rehearse-production`
  (`scripts/production-migration-rehearsal.sh`); aplicación: `pnpm db:migrate-production`
  (`scripts/production-migrate.sh`).

### Gap

- Ninguna tabla distingue persona de agente ni el canal de la escritura.
- El servidor no puede saber si una petición con cookie viene del navegador, de la CLI o del MCP local.
- No existe aviso a la persona ni superficie de «Actividad de agentes».
- `editions.publish` publica el borrador; no hay forma confirmada de republicar la edición anterior
  `[verificar en Discovery]`.
- No hay cuotas por persona y hora ni señales del carril.
- No hay clasificación de scopes por operación; TASK-2087 y TASK-2088 no tienen contra qué comparar.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms` (`src/server/agents/**`, `src/domain/agent-lane-contracts.ts`, rutas API v1, CLI y MCP stdio)
- Future candidate home: `remain-shared`
- Boundary: atribución de actor y reglas del carril de agentes de Rooms; consumidores autorizados: executor canónico y servicios de dominio de Rooms, API v1, SDK, CLI, MCP stdio, y más adelante el verificador de TASK-2087 y el provider de TASK-2088 (este último sólo lee la clasificación publicada)
- Server/browser split: `src/domain/agent-lane-contracts.ts` es browser-safe (clases, DTO de actividad, descriptores de reversa, sin DB); contexto de actor, cuotas, avisos y reader viven en `src/server/agents/**` con `server-only`
- Build impact: none fuera del repo `efeonce-rooms`; sin dependencias nuevas
- Extraction blocker: comparte la transacción y el lock de organización del executor; el aviso y la cuota se escriben en la misma transacción del comando

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (migración sobre tablas append-only de producción, atribución de acciones que
  llegan al cliente y cuotas que pueden bloquear trabajo real)
- Impacto principal: `migration`
- Source of truth afectado: `rooms.command_receipts`, `rooms.audit` (y `rooms.outbox` por FK),
  `rooms.collaboration_events`, `rooms.crm_handoffs`, `rooms.source_imports`, `rooms.access_events`; tablas nuevas de
  avisos y de contadores del carril
- Consumidores afectados: todos los comandos de Rooms, API v1, SDK, CLI `pnpm rooms`, MCP stdio `pnpm rooms:mcp`,
  `pnpm access:health`, TASK-2085, TASK-2087, TASK-2088
- Runtime target: local en esta task; producción con autorización aparte

### Contract surface

- Contrato existente a respetar: executor canónico, `RoomsError`, `canonicalMcpOperations` y
  `assertMcpOperationCoverage`, `members.*`, `access.*`, `invitations.*`, `editions.publish`, `rooms.archive`.
- Contrato nuevo:
  - `ActorContext` `{ actorKind: 'person' | 'agent', agentClientId: string | null, channel: 'browser' | 'cli' | 'gateway' }`
    resuelto junto al principal; nunca dentro de `Principal`.
  - Clasificación D2 `agentScopeClassification`: cada operación de `canonicalMcpOperations` en exactamente una clase
    (`efeonce.mcp.rooms.read`, `read.client`, `author`, `release`, `access`) o en `AGENT_SCOPE_EXCLUSIONS` con motivo.
  - Reader `agents.activity` (nombre final en Discovery): acciones hechas por agentes en nombre de la persona, con
    sala, operación, momento, `agent_client_id`, canal y descriptor de reversa.
  - Descriptores de reversa (D4): publicar → republicar la edición anterior o `rooms.archive`; invitar →
    `invitations.revoke`; dar acceso → `access.revoke` / `members.revokeInternal`; responder o resolver → nueva
    respuesta o reapertura.
  - Errores nuevos `agent_quota_exceeded` (y lo que Discovery decida para republicar) como `RoomsError` canónicos.
  - Señales `rooms.agent.release_actions` y `rooms.agent.quota_hit`.
- Backward compatibility: `compatible` (columnas aditivas con defaults; la autorización no cambia).
- Full API parity: el reader, las reversas y el aviso salen del mismo módulo `src/server/agents/**`; API v1, SDK,
  CLI y MCP stdio lo consumen. La UI de TASK-2085 es cliente del mismo contrato.

### Data model and invariants

- Entidades/tablas/views afectadas:
  - Expand: `actor_kind text NOT NULL DEFAULT 'person' CHECK (actor_kind IN ('person','agent'))`,
    `agent_client_id text NULL` y `channel text NULL CHECK (channel IN ('browser','cli','gateway'))` en
    `rooms.command_receipts`, `rooms.audit`, `rooms.collaboration_events`, `rooms.crm_handoffs`,
    `rooms.source_imports` y `rooms.access_events`. `rooms.outbox` hereda por FK a `rooms.audit(id)`.
  - Expand: tabla de avisos `rooms.agent_action_notices` (nombre final en Discovery): organización, persona, referencia
    a la fila de `audit` o `access_events`, operación, sala, reversa sugerida, `created_at` y `acknowledged_at`.
  - Expand: tabla de contadores por hora `rooms.agent_lane_counters` (nombre final en Discovery) con `kind`
    (`quota_hit`; reserva `bearer_rejected` para TASK-2087), organización nullable, persona nullable, motivo y conteo;
    sin payload ni token.
  - Índice para contar acciones de agente por persona y hora en `audit` y `access_events`.
  - Contract (después del release): `CHECK (channel IS NOT NULL) NOT VALID` y
    `CHECK ((actor_kind = 'agent') = (agent_client_id IS NOT NULL)) NOT VALID` en las seis tablas: obliga a las
    escrituras nuevas sin reescribir las históricas.
- Invariantes que no se pueden romper:
  - `principal_id` es siempre la persona; un agente nunca tiene principal ni grants propios.
  - Toda escritura nueva lleva `channel`; `actor_kind = 'agent'` si y sólo si hay `agent_client_id`.
  - Las filas históricas no se reescriben: `channel IS NULL` significa «anterior a la atribución».
  - Toda acción `release` o `access` con `actor_kind = 'agent'` produce un aviso en la misma transacción; si el aviso
    no se escribe, el comando no se confirma.
  - La cuota se evalúa bajo el lock de organización, antes de escribir, y sólo para `actor_kind = 'agent'`.
  - Toda operación de `canonicalMcpOperations` tiene exactamente una clase o una exclusión; sin entradas huérfanas.
  - El encabezado de atribución de la CLI/MCP no cambia permisos: con o sin él, `can()` evalúa a la persona.
- Write-target allowlist: N/A en Greenhouse (no hay boundary test de destinos para Rooms); en `efeonce-rooms` sólo
  `src/server/agents/**` escribe avisos y contadores; los demás servicios sólo agregan las tres columnas a sus
  inserciones existentes.
- Tenant/space boundary: todo por `organization_id`; el reader filtra por la persona de la sesión, y la vista de
  toda la organización exige `members.manage` `[decisión a confirmar en Discovery]`.
- Idempotency/concurrency: el recibo existente cubre el comando; el aviso cuelga del mismo `commandId`; la cuota usa el
  lock `pg_advisory_xact_lock` de organización del executor; el contador de `quota_hit` se escribe en una transacción
  propia después del rechazo, con upsert por hora.
- Audit/outbox/history: las columnas nuevas viajan en `audit` y `access_events` (append-only); avisos y contadores
  son tablas operativas (sólo `acknowledged_at` y el conteo cambian).

### Migration, backfill and rollout

- Migration posture: `additive` en dos tiempos. Expand (columnas con default o nullable, dos tablas, índices) antes
  del deploy; contract (`NOT VALID` checks) después de verificar el release. Ambas con marcador `-- Up Migration` y
  bloque `DO` que aborta si los objetos esperados no existen.
- Default state: atribución siempre activa (sin flag); cuotas activas sólo para acciones de agente.
- Backfill plan: ninguno. Las tablas son append-only con `reject_mutation`; un `UPDATE` de backfill fallaría y además
  reescribiría historia. `ADD COLUMN ... DEFAULT` no dispara triggers de fila.
- Rollback path: código revertido + redeploy (las columnas con default no rompen el código anterior); la migración
  expand se deja en su lugar; si hiciera falta deshacerla, restaurar desde el respaldo lógico previo. **Nunca**
  `down` en la base viva. La contract se puede retirar con una migración forward que borre los checks.
- External coordination: autorización del operador para la migración y el deploy de producción; alias manual
  `vercel alias set <deploy> efeonce-rooms.vercel.app --scope efeonce-7670142f` después de cada deploy.

### Security and access

- Auth/access gate: sin cambio; cada comando sigue en `can(persona, capacidad, recurso)`. El reader de actividad
  propia sólo exige sesión interna de la persona; la vista de organización exige `members.manage`.
- Sensitive data posture: los avisos no guardan payload del comando, correos de invitados ni textos del cliente: sólo
  ids, operación y sala. `agent_client_id` se normaliza a un id corto (sin versión ni datos de máquina).
- Error contract: `agent_quota_exceeded` como `RoomsError` canónico, con mensaje saneado y sin detalle interno.
- Abuse/rate-limit posture: tope por persona y hora para acciones `release` y `access` de agentes (publicaciones,
  invitaciones y cambios de acceso por separado); valores iniciales propuestos en el contrato y ajustables por el
  operador (ver Open Questions).

### Runtime evidence

- Local checks: `LC_ALL=en_US.UTF-8 pnpm verify` en `efeonce-rooms`; tests nuevos de atribución por canal, aviso,
  cuota, reversa y guard D2.
- DB/runtime checks: migración en PG local; `pnpm db:rehearse-production` PASS para expand y para contract;
  lectura de `information_schema.columns` y `pg_constraint` en las seis tablas.
- Integration checks: corrida local del MCP stdio publicando una edición como agente → fila con
  `actor_kind='agent'`, `channel='cli'`, aviso creado, reversa ejecutada y registrada también como agente.
- Reliability signals/logs: `rooms.agent.release_actions` (volumen contra línea base) y `rooms.agent.quota_hit`,
  servidas por `pnpm access:health` o un subcomando hermano `[decisión de Discovery]`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Clasificación D2 con guard de paridad

- `src/domain/agent-lane-contracts.ts` con la clasificación tipada por id de operación (un `Record` sobre los ids de
  `canonicalMcpOperations`, para que una operación nueva sin clase no compile) y `AGENT_SCOPE_EXCLUSIONS` con motivo
  (bytes, URLs firmadas, OTP del invitado, `progress.mark`, `live.*`, `profile.update`, `presentation.control/ack`).
- `assertAgentScopeClassification()` al estilo de `assertMcpOperationCoverage`: una clase o una exclusión por
  operación, sin duplicados ni entradas huérfanas; test que rompe el build.

### Slice 2 — Migración expand y contexto de actor

- Migración expand (columnas, tablas de avisos y contadores, índices, bloque `DO` de verificación, GRANTs a
  `rooms_runtime`).
- `ActorContext` resuelto junto a `resolvePrincipal` en `src/server/session.ts`: navegador → `person`/`browser`;
  CLI y MCP stdio declaran canal `cli` y, cuando actúa un agente, su `agent_client_id` (el MCP stdio lo toma del
  `clientInfo` del handshake; la CLI de un argumento o variable de entorno). Nombre del encabezado en Discovery.
- Las once rutas de escritura pasan el contexto a sus `INSERT`.

### Slice 3 — Aviso y reader de actividad

- Escritura del aviso en la misma transacción de cada comando `release`/`access` con `actor_kind='agent'`.
- Reader `agents.activity` con descriptor de reversa por acción; expuesto por API v1, SDK, CLI y MCP stdio
  (clasificado `read`).
- Marcar un aviso como visto: comando de la persona, excluido de las clases de agente con motivo.

### Slice 4 — Reversas

- Tabla de reversas D4 en el contrato; cada descriptor apunta a un comando existente con su payload.
- Si Discovery confirma que `editions.publish` no puede republicar la edición anterior, agregar el comando que lo haga
  en el executor canónico, clasificado `release` y con paridad completa.

### Slice 5 — Cuotas y señales

- Topes por persona y hora para publicaciones, invitaciones y cambios de acceso de agentes, evaluados bajo el lock de
  organización; rechazo `agent_quota_exceeded` y contador `quota_hit` fuera de la transacción rechazada.
- Señales `rooms.agent.release_actions` y `rooms.agent.quota_hit` en el health del carril.

### Slice 6 — Migración contract

- Después del release verificado: checks `NOT VALID` de presencia de `channel` y coherencia
  `actor_kind`/`agent_client_id`, con ensayo previo.

## Out of Scope

- Verificador del token delegado y canal `gateway` real (TASK-2087).
- Pantalla «Actividad de agentes» (TASK-2085).
- Provider `rooms` en el gateway y cuotas por clase en el gateway (TASK-2088).
- Aviso por correo o Teams (Open Questions; follow-up).
- `media.importFromSource` (TASK-2090), skill de oficio y eval (TASK-2091).
- Atribución en `rooms.guest_command_receipts`: los invitados externos nunca operan por el carril de agentes.
- Cualquier cambio en Efeonce ID.

## Detailed Spec

Contrato completo en el ADR del carril de agentes (D2, D3, D4, D7). Este archivo fija sólo lo que el ADR deja a la
implementación:

- **Atribución local declarativa.** La CLI y el MCP stdio envían la cookie de la persona más un encabezado de
  atribución (canal y cliente). El servidor sólo lo acepta junto a una sesión interna válida; nunca cambia permisos.
  Un agente que omite el encabezado queda como `person`/`cli` o `person`/`browser`: residual aceptado hasta el
  gateway, donde `act` lo fija Efeonce ID.
- **Sin backfill.** `channel IS NULL` marca lo anterior a esta task.
- **Bootstrap.** Los eventos `bootstrap.*` de `access_events` se registran `person`/`cli`; ninguna clase nueva de actor
  sin delta del ADR.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → (Slice 3 ∥ Slice 4) → Slice 5 → deploy → Slice 6.
- La migración expand se aplica en producción **antes** del deploy del código que escribe las columnas: si el código
  llega primero, todo `INSERT` falla y Rooms deja de aceptar comandos.
- La migración contract (Slice 6) sólo después de verificar que el código desplegado escribe `channel` en las seis
  tablas: si llega antes, rompe las escrituras del código anterior.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El código que escribe las columnas llega antes que la migración y todo comando falla | migration / production | medium | Orden expand → deploy; ensayo en clon; verificación de columnas antes del deploy | Errores `unavailable` en logs de Vercel de `/api/v1/commands` |
| La contract llega antes del código y rompe escrituras | migration | low | Slice 6 sólo tras leer filas nuevas con `channel` en las seis tablas | Errores `23514` en logs |
| Un `UPDATE` de backfill choca con `reject_mutation` o reescribe historia | migration | low | Sin backfill; `ADD COLUMN DEFAULT` sin triggers de fila | Falla del ensayo `pnpm db:rehearse-production` |
| La cuota bloquea trabajo legítimo de un agente | identity / production | medium | Topes sólo para `agent`; valores revisados por el operador; error claro con la reversa | `rooms.agent.quota_hit` |
| El aviso falla y tumba el comando | production | low | Mismo `INSERT` simple en la transacción; tests de cada operación `release`/`access` | Errores del executor en logs |
| Un agente se presenta como persona (omite el encabezado local) | identity | medium | Declarado como residual; el gateway lo cierra en TASK-2087 | Volumen de `person`/`cli` en `rooms.agent.release_actions` |
| La clasificación D2 deja una operación sin clase | identity | low | `Record` tipado + guard que rompe el build | `pnpm verify` rojo |
| Fuga de datos del cliente en avisos | identity | low | Avisos sólo con ids, operación y sala; test de contenido | Test de forma del aviso |

### Feature flags / cutover

- Sin flag nuevo: la atribución es aditiva y siempre activa; las cuotas sólo aplican a `actor_kind='agent'`, que hoy
  sólo produce la CLI/MCP local. El interruptor `ROOMS_AGENT_LANE_ENABLED` pertenece a TASK-2087.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit | minutos | sí |
| Slice 2 | Revertir código + redeploy + alias manual; la migración expand queda (defaults compatibles); deshacerla sólo restaurando el respaldo lógico, nunca `down` | minutos (código), 30 minutos (respaldo) | sí, con respaldo |
| Slice 3 | Revertir commit; los avisos ya escritos quedan como historia | minutos | sí |
| Slice 4 | Revertir commit; un comando nuevo de republicación queda sin consumidores | minutos | sí |
| Slice 5 | Revertir commit + redeploy (quita los topes) | minutos | sí |
| Slice 6 | Migración forward que borra los checks `NOT VALID` | minutos | sí |

### Production verification sequence

1. `pnpm db:rehearse-production` PASS con la migración expand (en clon de `rooms_production`).
2. Respaldo lógico privado y `pnpm db:migrate-production` con autorización; leer columnas y tablas en
   `information_schema` y `pg_constraint`.
3. Merge a `main` de `efeonce-rooms` con autorización; deploy; `vercel alias set <deploy> efeonce-rooms.vercel.app
   --scope efeonce-7670142f`; `/rooms` 200 y `/api/auth/session` 401 sin sesión.
4. Comando real de la persona por navegador → fila `person`/`browser` en `audit` y `command_receipts`.
5. Comando por MCP stdio en producción con la sesión de la persona, sobre una sala sintética → fila `agent`/`cli`,
   aviso creado, reversa ejecutada y registrada.
6. `pnpm access:health` (o el subcomando del carril) muestra las dos señales sin error.
7. Ensayo y aplicación de la migración contract; repetir 4 y 5.

### Out-of-band coordination required

- Autorización del operador para migrar `rooms_production`, mergear a `main` y desplegar.
- Decisión del operador sobre los topes iniciales por persona y hora.
- Ninguna coordinación con Efeonce ID ni con el gateway en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las seis tablas tienen `actor_kind`, `agent_client_id` y `channel` en local y en el ensayo de producción
      (lectura de `information_schema.columns`). — Local sí (bloque `DO` de la migración exige 18 columnas); ensayo de producción pendiente.
- [ ] Ninguna fila histórica fue reescrita: el conteo de filas con `channel IS NULL` antes y después del ensayo es
      igual al conteo previo de cada tabla. — Pendiente del ensayo de producción (fast default, sin `UPDATE`).
- [x] Un comando por navegador queda `person`/`browser`; uno por CLI queda `cli`; uno por MCP stdio de un agente queda
      `agent`/`cli` con `agent_client_id` (tests). — `tests/agent-attribution.test.ts` (resolución de encabezados y filas en `audit`/`command_receipts`); el MCP envía `X-Rooms-Agent` con el nombre del handshake (`mcpAgentClientId`).
- [x] `principal_id` de una acción de agente es la persona y `Principal` no tiene campos de atribución (test). — `tests/agent-attribution.test.ts`.
- [x] Cada operación `release` y `access` hecha por un agente crea exactamente un aviso; una hecha por la persona no
      crea ninguno (test por operación). — Trigger sobre las filas append-only + paridad SQL↔TS de la lista completa (`tests/agent-notices.test.ts`); casos reales: publicar, republicar, dar acceso a sala y `members.grantInternal`.
- [x] El aviso no contiene payload, correos ni textos del cliente (test de forma). — `tests/agent-notices.test.ts`.
- [x] `agents.activity` devuelve las acciones del agente con su descriptor de reversa y no devuelve acciones de otra
      persona sin `members.manage` (tests). — `tests/agent-notices.test.ts` (scope, keyset) y `tests/agent-reversals.test.ts`.
- [ ] Publicar, invitar y dar acceso tienen reversa ejecutable por API, SDK, CLI y MCP stdio (test por reversa). — Publicar (`editions.republish` nuevo), dar acceso a sala y a miembros: ejecutadas en test. Invitar: descriptor `invitations.revoke` derivado del recibo, sin test end-to-end (requiere el arnés de invitaciones).
- [x] Al superar el tope por hora, el comando de agente falla con `agent_quota_exceeded`, no escribe nada y suma un
      `quota_hit` (test). — `tests/agent-quotas.test.ts`.
- [x] Una operación nueva sin clase ni exclusión hace fallar `pnpm verify` (test negativo del guard D2). — `Record` exhaustivo por tipo + `tests/agent-lane.test.ts`.
- [x] `rooms.agent.release_actions` y `rooms.agent.quota_hit` aparecen en el health del carril (test). — `accessHealth().agentLane`, `tests/agent-quotas.test.ts`.
- [ ] La migración contract rechaza un `INSERT` sin `channel` y acepta los históricos (test en PG local). — Slice 6, después del release.
- [x] `LC_ALL=en_US.UTF-8 pnpm verify` pasa en `efeonce-rooms`. — lint, lint negativo, tipos y build OK; tests 406/406 sin skips con `ROOMS_DATABASE_URL`.
- [ ] `pnpm db:rehearse-production` PASS para expand y para contract. — Pendiente: lee producción, se corre con la autorización del rollout.

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify`, `pnpm db:rehearse-production`, corrida local del MCP stdio como
  agente.
- `pnpm task:lint --task TASK-2084`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta en el ADR del carril de agentes con nombres finales (encabezado de atribución, tablas, reader, topes).
- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado y espejo `.codex` sincronizado.
- [ ] Recibo en `docs/audits/rooms/` con el ensayo, la migración y la verificación de producción.

## Follow-ups

- Aviso por correo o Teams, y agrupación por hora.
- Línea base de `rooms.agent.release_actions` tras dos semanas de uso real.

## Open Questions

- Canal del aviso fuera de la actividad de Rooms (correo, Teams o ninguno) y si se agrupa por hora.
- Topes exactos por persona y hora para publicaciones, invitaciones y cambios de acceso.
- Si la vista de actividad de toda la organización exige `members.manage` u otra capacidad.
- Si republicar la edición anterior necesita un comando nuevo o basta con `editions.reopen` + `editions.publish`.
