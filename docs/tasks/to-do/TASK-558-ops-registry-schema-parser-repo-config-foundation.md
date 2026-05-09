# TASK-558 — Ops Registry Schema, Parser & Repo Config Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-558-ops-registry-schema-parser-repo-config-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la foundation técnica de `Ops Registry`: schema común de artefactos, parser markdown y contrato de configuración por repo para que el sistema no quede hardcodeado a Greenhouse EO.

## Why This Task Exists

Sin schema común y sin `repo config`, el registry quedaría como un script local del repo actual. La base tiene que nacer federable desde el día 1.

## Goal

- definir el schema común de artefactos y relaciones
- implementar parser markdown inicial
- definir `ops-registry.config.*` como contrato local por repo
- definir schema tipado para comandos write-safe
- definir `artifact policies` por tipo respetando templates y operating models del repo

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` (incluye Delta 2026-05-07: capabilities granular + outbox + reliability + defense-in-depth + atomicity + packaging strategy)
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- arch-architect overlay (`/Users/jreye/Documents/greenhouse-eo/.claude/skills/arch-architect/SKILL.md`) — pinned decisions #5 (defense-in-depth 7-layer), #7 (capabilities granular), #8 (reliability signals)

Reglas obligatorias:

- source of truth sigue en markdown versionado
- el core no debe hardcodear paths Greenhouse-only sin pasar por config de repo
- el diseño debe incorporar `TASK_TEMPLATE`, `TASK_PROCESS`, `EPIC_TEMPLATE`, `MINI_TASK_TEMPLATE` y el modelo de issues como policy inputs formales
- **extractability gate** (V1 in-repo, paquete progresivo): el core en `src/lib/ops-registry/**` NO importa nada Greenhouse-specific (ni `@/lib/...` ni paths hardcoded). Toda especificidad Greenhouse vive detrás de `ops-registry.config.ts`. Esto deja la extracción a `@efeonce/ops-registry` workspace package mecánica cuando un segundo repo lo necesite (TASK-561).
- **capabilities granular** (overlay #7): cada comando del write plane declara `requiredCapability` propia (`ops.<artifact>.<action>`); NUNCA reutilizar `platform.admin` como catch-all
- **outbox integration**: cada mutación del write plane emite un evento versionado v1 a `greenhouse_sync.outbox_events` en la misma transacción que la materialización
- **idempotencia** del write plane: `create_*` debe aceptar `requestHash` opcional para deduplicar reintentos; sin él, dos retries queman dos IDs
- **atomicidad** del write plane: una mutación que toca N archivos debe ser todo-o-nada (temp file + rename, o transactional commit). Crash a mitad nunca debe dejar torn state

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

### Blocks / Impacts

- `TASK-559`
- `TASK-560`
- `TASK-561`

### Files owned

- `src/lib/ops-registry/**`
- `ops-registry.config.ts`
- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`

## Scope

### Slice 1 — Shared schema

- definir `artifactType`, `artifactId`, `repoId`, `relationships` y shape mínima común
- validar con `zod` o equivalente canónico del repo
- definir `commandType`, payload mínimo y contratos `dry_run` para create/update
- definir `policyKind`, `templateSource`, `processSource` y `writeCapabilities`

### Slice 2 — Markdown parser

- parsear `architecture`, `task`, `epic`, `mini-task`, `issue`, `context` y `changelog`
- extraer metadata y referencias principales

### Slice 3 — Repo config

- definir contrato de configuración por repo para paths, taxonomías y reglas locales

### Slice 4 — Artifact policy layer + capability binding

- modelar políticas para `task`, `epic`, `mini-task`, `issue` y `architecture`
- mapear template + registry + index + lifecycle + process hooks por tipo
- **cada comando declara `requiredCapability`** con scope `tenant` (granular, no `platform.admin`):
  - `ops.task.create:create`, `ops.task.take:update`, `ops.task.start_plan:update`, `ops.task.attach_plan:update`, `ops.task.update:update`, `ops.task.close:approve`
  - `ops.epic.create:create`, `ops.epic.update:update`, `ops.epic.link_task:update`, `ops.epic.close:approve`
  - `ops.mini_task.create:create`, `ops.mini_task.update:update`, `ops.mini_task.close:approve`
  - `ops.issue.create:create`, `ops.issue.update:update`, `ops.issue.resolve:approve`, `ops.issue.promote_to_task:approve`
  - `ops.architecture.create:create`, `ops.architecture.update:update`
  - `ops.handoff.append:create`
  - `ops.registry.sync:update`, `ops.registry.reindex:update`
- helper `defineArtifactPolicy()` con type narrowing — agregar un 7º artifact type debe ser mecánico (1 fila), no refactor
- `templateSource` / `processSource` / `requiredFields` se **parsean** desde las plantillas canónicas (TASK_TEMPLATE.md, EPIC_TEMPLATE.md, etc.) — NUNCA hardcodear; eso evita el drift que el registry quiere prevenir

### Slice 5 — Outbox event contracts (v1 schemas)

Toda mutación del write plane emite un evento versionado a `greenhouse_sync.outbox_events` en la misma transacción que la materialización. Define los 16 schemas v1:

- `ops_registry.task.created` v1
- `ops_registry.task.taken` v1
- `ops_registry.task.plan_started` v1
- `ops_registry.task.plan_attached` v1
- `ops_registry.task.updated` v1
- `ops_registry.task.closed` v1
- `ops_registry.epic.created` v1
- `ops_registry.epic.task_linked` v1
- `ops_registry.epic.closed` v1
- `ops_registry.mini_task.created` v1
- `ops_registry.mini_task.closed` v1
- `ops_registry.issue.created` v1
- `ops_registry.issue.resolved` v1
- `ops_registry.issue.promoted_to_task` v1
- `ops_registry.architecture.created` v1
- `ops_registry.handoff.appended` v1

Reglas:

- payload zod-validado al INSERT del outbox (no string-blob)
- incluir `repoId`, `artifactId`, `actorUserId`, `requestHash`, `changedFiles[]`, `materializedAt`
- registrar contratos en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta 2026-05-07 al implementar)
- cero side effects síncronos cross-system: notificaciones, mirror Notion (V3), agregador (V3) consumen el outbox de forma reactiva

## Out of Scope

- CLI final completa
- UI humana
- endpoints internos
- agregador cross-repo

## Acceptance Criteria

- [ ] Existe un schema común de artefactos para `Ops Registry` (zod-validado, golden fixtures committed bajo `__fixtures__/`)
- [ ] El parser soporta `architecture`, `task`, `epic`, `mini_task`, `issue`, `context` y `changelog` con golden fixtures por tipo (1+ por tipo, frontmatter + sections + relationships)
- [ ] El repo define `ops-registry.config.ts` con `repoId`, paths canónicos, taxonomías, policies y overrides
- [ ] Existe schema común para comandos de escritura segura con `requestHash` (idempotencia) y `dry_run` por defecto
- [ ] Existe `Artifact Policy Layer` con `requiredCapability` declarada por comando, granular (`ops.<artifact>.<action>`), NUNCA `platform.admin`
- [ ] `templateSource` / `processSource` / `requiredFields` se parsean desde las plantillas canónicas (no hardcoded)
- [ ] Existen 16 schemas zod v1 para los outbox events (`ops_registry.*`) listos para emitirse en TASK-559/560
- [ ] **Extractability gate**: `grep -rE "@/lib/|@/components/|@/types/" src/lib/ops-registry/` debe retornar 0 resultados (CI gate en TASK-559)
- [ ] Tests unitarios del parser y del schema son **obligatorios** (no opcionales): golden fixtures por tipo + edge cases (frontmatter inválido, lifecycle drift, relationships rotas)
- [ ] El módulo expone helper `defineArtifactPolicy()` con type narrowing — agregar un 7º artifact type es mecánico

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/ops-registry` — tests del parser y del schema **deben** estar verdes (mandatory)
- `grep -rE "@/lib/|@/components/|@/types/" src/lib/ops-registry/` retorna 0 (extractability gate)
- snapshot test sobre `ops-registry.config.ts` shape para evitar drift cross-repo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-559`
- `TASK-560`
- `TASK-561`
