# TASK-560 — Ops Registry Agent Surfaces (API + MCP + Process-Aware Flows)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-559`
- Branch: `task/TASK-560-ops-registry-human-agent-surfaces`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Exponer `Ops Registry` para agentes (Claude, Codex, otros LLMs) vía API HTTP interna y MCP server oficial, montados sobre los outputs derivados del sistema, con soporte completo para comandos de escritura segura y flows process-aware. La surface humana se mueve a `TASK-814` (V2 rollout) per spec.

## Why This Task Exists

Sin agent surface, el registry sigue siendo solo JSON estático. La capa MCP + API es la que destraba el flow real: agentes que crean tasks correctamente plantilladas, que no inventan IDs, que respetan TASK_PROCESS, y que dejan trazabilidad por outbox event. La surface humana queda fuera de V1 explícito por alineación con el rollout del spec (V1 sin UI).

## Goal

- crear API interna JSON-first para agentes y tooling
- crear MCP server oficial para Claude y otros LLMs
- exponer comandos de escritura segura para crear/actualizar artefactos
- exponer flows process-aware para tasks (`take`, `start-plan`, `attach-plan`, `close`)
- emitir outbox events versionados v1 por cada mutación (definidos en TASK-558 Slice 5)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` (Delta 2026-05-07)
- arch-architect overlay pinned decisions #5 (defense-in-depth), #7 (capabilities granular), #8 (reliability)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — patrón canónico de routing internal

Reglas obligatorias:

- la surface de agentes debe exponer IDs, relaciones y warnings de validación
- la escritura debe ser por comandos seguros/materializados, no por edición libre de markdown
- los comandos de task deben respetar `TASK_TEMPLATE` y `TASK_PROCESS`
- **cada endpoint y cada MCP tool de mutación enforce su `requiredCapability`** declarada en el Artifact Policy Layer (TASK-558 Slice 4); NUNCA reutilizar `platform.admin`
- **toda mutación emite outbox event v1** (los 16 schemas definidos en TASK-558 Slice 5) en la misma transacción que la materialización
- **idempotencia por `requestHash`**: dos POST con el mismo hash no queman dos IDs; devuelven el mismo resultado
- **atomicidad**: una mutación que toca N archivos es todo-o-nada (temp file + rename, o transactional commit)
- **errors sanitizados**: `redactErrorForResponse(err)` antes de devolver 4xx/5xx; `captureWithDomain(err, 'ops_registry', { extra })` para Sentry rollup

## Dependencies & Impact

### Depends on

- `TASK-559`

### Blocks / Impacts

- `TASK-561`

### Files owned

- `src/app/api/internal/ops-registry/**`
- `src/mcp/ops-registry/**`
- `src/lib/ops-registry/**` (read+write paths del core; el módulo en sí lo dueña TASK-558)

## Scope

### Slice 1 — Read API (agent surface)

- `GET /api/internal/ops-registry/artifacts/:id`
- `GET /api/internal/ops-registry/query`
- `GET /api/internal/ops-registry/domain/:domain`
- `GET /api/internal/ops-registry/impact`
- `GET /api/internal/ops-registry/graph/:id`
- `GET /api/internal/ops-registry/validation-report`
- `GET /api/internal/ops-registry/stale-report`

Cada endpoint expone IDs estables, relaciones, warnings y source-of-truth.

### Slice 2 — Write API (write-safe + idempotente + atómica)

- `POST /api/internal/ops-registry/tasks` (capability `ops.task.create:create`)
- `POST /api/internal/ops-registry/tasks/:id/take` (capability `ops.task.take:update`)
- `POST /api/internal/ops-registry/tasks/:id/start-plan` (capability `ops.task.start_plan:update`)
- `POST /api/internal/ops-registry/tasks/:id/attach-plan` (capability `ops.task.attach_plan:update`)
- `PATCH /api/internal/ops-registry/tasks/:id` (capability `ops.task.update:update`)
- `POST /api/internal/ops-registry/tasks/:id/close` (capability `ops.task.close:approve`)
- `POST /api/internal/ops-registry/epics` + `link_task` + `close` (capabilities `ops.epic.*`)
- `POST /api/internal/ops-registry/issues` + `resolve` + `promote_to_task` (capabilities `ops.issue.*`)
- `POST /api/internal/ops-registry/mini-tasks` (capability `ops.mini_task.*`)
- `POST /api/internal/ops-registry/architecture` (capability `ops.architecture.create:create`)
- `POST /api/internal/ops-registry/handoff/entries` (capability `ops.handoff.append:create`)
- `POST /api/internal/ops-registry/sync` + `reindex` (capability `ops.registry.sync:update`)

Reglas duras (defense-in-depth):

- enforcement de capability **server-side** vía `can(subject, ...)` antes de cualquier write
- `requestHash` opcional pero canónico para idempotencia
- `dry_run=true` por default cuando no se pasa; preview antes de materializar
- response shape canónico: `{ status, artifactId, changedFiles[], diffPreview, validationSummary, dryRun, policyKind, templateSource, processSource }`
- toda mutación escribe outbox event v1 en la misma tx que la materialización (los 16 schemas de TASK-558 Slice 5)
- post-mutation re-validate: ejecutar `ops:validate` sobre los archivos tocados antes de devolver `dry_run=false` exitoso
- errors sanitizados con `redactErrorForResponse` antes de cruzar el HTTP boundary

### Slice 3 — MCP server official

`src/mcp/ops-registry/**` expone:

Read tools: `ops_registry_get_artifact`, `ops_registry_query`, `ops_registry_get_related`, `ops_registry_get_impact`, `ops_registry_validation_report`, `ops_registry_stale_report`, `ops_registry_list_repos`, `ops_registry_cross_repo_query`.

Write tools: `ops_registry_create_task`, `ops_registry_take_task`, `ops_registry_start_plan_mode`, `ops_registry_attach_plan`, `ops_registry_update_task`, `ops_registry_close_task`, `ops_registry_create_epic`, `ops_registry_create_issue`, `ops_registry_create_mini_task`, `ops_registry_create_architecture_doc`, `ops_registry_append_handoff`, `ops_registry_resolve_issue`, `ops_registry_promote_issue_to_task`, `ops_registry_sync_indexes`, `ops_registry_validate_before_write`.

Reglas:

- los write tools delegan al mismo path que la API HTTP (no duplicar lógica)
- todos los write tools aceptan `dry_run` (default true)
- preview estructurado obligatorio antes de `dry_run=false`
- registro local de session-actor para audit log + outbox event

### Slice 4 — Task process-aware flows

Implementa los flows de `TASK_PROCESS.md` extremo-a-extremo (no solo "tocar archivos"):

- `take_task`: mueve archivo `to-do/`→`in-progress/`, sincroniza `Lifecycle`, sincroniza `docs/tasks/README.md`, crea entrada en `Handoff.md`
- `start_plan_mode`: crea borrador `docs/tasks/plans/TASK-###-plan.md` con secciones obligatorias del proceso
- `attach_plan`: valida `Discovery summary` + `Access model` + `Skills` + `Subagent strategy` cuando aplique
- `close_task`: valida acceptance criteria + verification, mueve a `complete/`, sincroniza Lifecycle + README + Handoff + changelog, re-valida consistencia final

Cada flow produce su outbox event v1 + audit log.

## Out of Scope

- surface humana (UI portal) — movida a `TASK-814` (V2 rollout per spec)
- workflow de comentarios
- approvals o asignaciones tipo PM tool
- agregador cross-repo (TASK-561 V3)
- mirror Notion (V3)

## Acceptance Criteria

- [ ] Existe API HTTP interna read + write con todas las rutas declaradas en Slice 1+2
- [ ] Existe MCP server oficial con read tools + write tools delegando a la misma capa
- [ ] La capa agente enforce capability granular (`ops.<artifact>.<action>`) server-side; rechaza con 403 + razón clara
- [ ] La capa agente soporta `requestHash` para idempotencia (mismo hash → mismo resultado, 0 IDs nuevos)
- [ ] Toda mutación es atómica (todo-o-nada; crash a mitad NO deja torn state)
- [ ] Toda mutación emite outbox event v1 en la misma transacción que la materialización
- [ ] La capa agente soporta flows process-aware de tasks alineados con `TASK_PROCESS.md` (`take`, `start-plan`, `attach-plan`, `close`) end-to-end
- [ ] Errors sanitizados con `redactErrorForResponse` antes de cualquier 4xx/5xx
- [ ] Sentry incidents con `captureWithDomain(err, 'ops_registry', ...)` para roll-up al subsystem `Ops Registry Health`
- [ ] Tests obligatorios: integration tests por endpoint (auth + capability + idempotency + atomic-write + outbox), MCP tools tests con dry_run snapshots

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/ops-registry src/app/api/internal/ops-registry src/mcp/ops-registry`
- smoke local: `curl` real contra cada endpoint write con dry_run primero, luego `dry_run=false`
- smoke MCP: invocar al menos `ops_registry_create_task` y `ops_registry_close_task` desde Claude con dry_run y verificar shape de respuesta
- inyectar fallo a mitad de un `close_task` (e.g. permisos en `Handoff.md`) y verificar rollback completo (no torn state)
- verificar outbox event en `greenhouse_sync.outbox_events` después de cada mutación exitosa

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-561` — Federation contract for sister repos
- `TASK-814` — Human surface (V2 rollout per spec)
