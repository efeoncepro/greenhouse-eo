# Greenhouse EO — Ops Registry Architecture V1

## Status

- Owner: `Platform / Operations`
- Status: `Proposed`
- Scope: `Greenhouse EO + sister repos adopting the same operational framework`
- Last updated: `2026-05-07`

## Summary

Greenhouse necesita una capa operativa repo-native que permita navegar, validar, relacionar y actualizar la documentacion viva del framework de desarrollo sin mover la source of truth fuera de Git. `Ops Registry` es esa capa.

No reemplaza markdown, Git, PRs, tasks ni arquitectura. Lee esos artefactos, extrae metadata y relaciones, valida inconsistencias, expone surfaces amigables para humanos y agentes, y materializa escrituras seguras sobre los artefactos canónicos del repo.

## Why This Exists

El repo ya tiene un framework operativo rico:

- `docs/architecture/`
- `docs/tasks/`
- `docs/epics/`
- `docs/mini-tasks/`
- `docs/issues/`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

El problema ya no es falta de taxonomia. El problema es operarla bien a escala:

- descubrir rapido que documento es canónico para una zona
- detectar drift entre task, arquitectura, handoff e indices
- entender dependencias y blockers entre artefactos
- responder igual de bien a humanos y a agentes
- escalar el mismo framework a repos hermanos sin reescribirlo por repo

## Decision

Greenhouse debe construir un sistema interno llamado `Ops Registry` con estas reglas:

1. La source of truth sigue siendo local a cada repo y vive en markdown versionado en Git.
2. `Ops Registry` es una capa derivada de indexación, validación, consulta, authoring seguro y surfacing.
3. La primera versión debe montarse sobre `TypeScript + Node.js`, no sobre una base externa ni sobre Notion.
4. La arquitectura debe ser federable para repos hermanos mediante un schema común y configuración por repo.
5. El sistema debe ser dual:
   - amigable para humanos por UI/lectura/descubrimiento
   - amigable para agentes por JSON, CLI, API y MCP
6. La escritura no debe editar markdown libremente por defecto; debe operar mediante comandos de dominio que luego materializan cambios válidos en el repo.
7. El sistema debe ser consciente de los contratos documentales existentes del repo: plantillas, operating models, registries, índices y reglas de lifecycle por tipo de artefacto.

## Principles

### Repo-native

El sistema vive encima del repo y entiende archivos reales, paths reales, lifecycle real y diffs reales.

### Read-first foundation, write-safe authoring

La base del sistema sigue siendo leer e indexar markdown. La escritura existe, pero se expresa como comandos de dominio seguros y validables, no como edición libre de texto sin contrato.

### Human + agent duality

Cada capacidad importante debe tener una salida legible por personas y una salida estructurada por máquinas.

### Federation-ready

Cada repo conserva su truth local, pero todos pueden hablar un contrato derivado común.

### Validation over bureaucracy

El valor principal no es meter más workflow, sino detectar y hacer visible el drift operativo que hoy se corrige manualmente.

### Materialize, do not fork truth

Las mutaciones deben terminar materializadas en markdown y archivos versionados del repo. `Ops Registry` no crea una segunda verdad persistente fuera de Git.

### Template-aware and process-aware

`Ops Registry` no debe tratar `task`, `epic`, `mini-task` e `issue` como blobs equivalentes. Cada familia de artefactos tiene plantilla, semántica, lifecycle y protocolo propios, y el sistema debe respetarlos.

## Canonical Inputs

`Ops Registry` debe indexar, como mínimo:

- `docs/architecture/**`
- `docs/tasks/**`
- `docs/epics/**`
- `docs/mini-tasks/**`
- `docs/issues/**`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Canonical Policy Inputs

Además de los artefactos indexados, `Ops Registry` debe leer y respetar las fuentes canónicas que gobiernan cómo se crean y evolucionan esos artefactos:

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/epics/EPIC_TEMPLATE.md`
- `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
- `docs/issues/README.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Non-goals

- reemplazar Git como source of truth
- convertir Notion en base canónica del sistema técnico
- crear un clon interno de Jira / Linear / Notion
- introducir una base de datos central como dependencia obligatoria de V1
- abrir edición rica desde UI en la primera versión

## System Planes

`Ops Registry` debe operar sobre cuatro planos explícitos:

### Read plane

Lee artefactos canónicos del repo, los indexa, valida y los expone para consulta humana y de agentes.

### Write plane

Recibe comandos seguros para crear o actualizar artefactos del framework operativo, por ejemplo:

- `create_task`
- `update_task_status`
- `create_epic`
- `link_task_to_epic`
- `append_handoff_entry`
- `create_architecture_doc`
- `sync_registries`

El write plane debe resolver primero la policy correcta del artefacto antes de permitir una mutación.

### Materialization plane

Convierte comandos del write plane en cambios reales sobre:

- markdown de artefactos
- registries de IDs
- índices operativos
- `project_context.md`
- `Handoff.md`
- `changelog.md`

La materialización debe saber qué archivos colaterales se actualizan según el tipo de artefacto y según el protocolo vigente del repo.

### Exposure plane

Expone el sistema por:

- CLI
- UI humana
- API HTTP
- MCP server

## Mounting

La implementación V1 debe montarse dentro del repo sobre estas piezas:

### Runtime y librerías

- `TypeScript`
- `Node.js`
- `unified`
- `remark-parse`
- helpers `mdast` para navegar headings, listas y párrafos
- `zod` para schema validation

### Estructura de carpetas

- `src/lib/ops-registry/**`
  - core del parser, schema, graph builder, validators, command handlers y query layer
- `scripts/ops-registry-*.mjs`
  - entrypoints de CLI, generación local/CI y materialización
- `.generated/ops-registry/**`
  - artefactos derivados y consumibles por humanos/agentes
- `src/app/api/internal/ops-registry/**`
  - endpoints internos JSON-first para lectura y escritura segura
- `src/mcp/ops-registry/**`
  - MCP server y tool handlers del dominio
- `src/app/(dashboard)/admin/ops-registry/**`
  - surface humana futura del portal

### Storage

V1 no necesita base de datos dedicada. Debe funcionar con:

- lectura de archivos desde el repo
- generación de JSON derivados en `.generated/ops-registry/`

Si el volumen futuro lo exige, V2 puede agregar cache local tipo `SQLite` o `libSQL`, pero nunca como source of truth primaria.

## Shared Schema

Cada artefacto indexado debe normalizarse a una forma común:

- `repoId`
- `artifactType`
  - `architecture`
  - `task`
  - `epic`
  - `mini_task`
  - `issue`
  - `context`
  - `changelog`
- `artifactId`
- `title`
- `lifecycle`
- `domain`
- `priority`
- `impact`
- `effort`
- `statusReal`
- `path`
- `references`
- `relationships`
- `updatedAt`
- `sourceOfTruth`
- `writeCapabilities`
- `policyKind`
- `templateSource`
- `processSource`

Regla de identidad:

- el identificador estable cross-repo es `repoId:artifactId`
- ejemplos:
  - `greenhouse-eo:TASK-558`
  - `greenhouse-eo:EPIC-003`
  - `kortex:TASK-014`

## Relationships

`Ops Registry` debe soportar al menos estas relaciones:

- `references`
- `blocked_by`
- `blocks`
- `belongs_to_epic`
- `related_to`
- `owns_paths`
- `impacts_domains`
- `source_of_truth_for`
- `stale_against`

## Artifact Policy Layer

Sobre el schema común debe existir una capa explícita de políticas por tipo de artefacto.

### Objetivo

Traducir “qué es este artefacto” en:

- qué template usa
- qué campos son obligatorios
- qué lifecycle permite
- qué archivos auxiliares debe sincronizar
- qué comandos soporta
- qué operating model lo gobierna

### Políticas mínimas

- `task.policy`
- `epic.policy`
- `mini_task.policy`
- `issue.policy`
- `architecture.policy`

### Qué resuelve una policy

Cada policy debe declarar como mínimo:

- `artifactType`
- `templatePath`
- `operatingModelPaths`
- `registryPaths`
- `indexPaths`
- `allowedLifecycleTransitions`
- `requiredFields`
- `defaultFolderByLifecycle`
- `createCommand`
- `updateCommands`
- `closeCommand`
- `syncHandlers`
- `legacyCompatibilityRules`

## Artifact Families

### Tasks

Fuente canónica:

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`

Reglas que `Ops Registry` debe respetar:

- la creación debe instanciar la plantilla actual de task
- `Zone 0` y `Zone 1` se llenan al crear
- `Zone 2` no se llena al crear
- `Lifecycle` y carpeta deben quedar coherentes
- la branch debe seguir `task/TASK-###-short-slug`
- el cierre exige sincronizar markdown + carpeta + índice

Comandos mínimos:

- `create_task`
- `take_task`
- `start_plan_mode`
- `attach_plan`
- `update_task`
- `close_task`

### Epics

Fuente canónica:

- `docs/epics/EPIC_TEMPLATE.md`
- `docs/epics/EPIC_ID_REGISTRY.md`
- `docs/epics/README.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`

Comandos mínimos:

- `create_epic`
- `update_epic`
- `link_task_to_epic`
- `close_epic`

### Mini-tasks

Fuente canónica:

- `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
- `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
- `docs/mini-tasks/README.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`

Regla clave:

- `Ops Registry` debe validar si un pedido realmente califica como mini-task y no debe escalar a `TASK` o `ISSUE`

Comandos mínimos:

- `create_mini_task`
- `update_mini_task`
- `close_mini_task`

### Issues

Fuente canónica:

- `docs/issues/README.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`

Reglas que `Ops Registry` debe respetar:

- un issue nace en `docs/issues/open/`
- un issue se mueve a `resolved/` solo al verificar solución
- un issue representa un problema reactivo de runtime, no trabajo planificado

Comandos mínimos:

- `create_issue`
- `update_issue`
- `resolve_issue`
- `promote_issue_to_task`

## Repo Config Contract

Cada repo hermano debe exponer una configuración local, por ejemplo `ops-registry.config.ts`, con:

- `repoId`
- `repoName`
- paths canónicos a indexar
- taxonomías habilitadas
- reglas obligatorias por repo
- aliases de dominio
- validaciones locales adicionales
- mapping de `artifact policies`
- overrides de templates/procesos cuando el repo use una variante válida del framework

Esto evita hardcodear el layout Greenhouse EO dentro del core y permite federación real.

## Validation Model

V1 debe incluir validaciones automáticas como mínimo para:

- `Lifecycle` vs carpeta real
- registry vs archivo real
- consistency epic ↔ child tasks
- links rotos
- paths inexistentes
- artefactos obligatorios faltantes
- tasks que tocan acceso pero no distinguen `views` vs `entitlements`
- drift entre arquitectura y tareas relacionadas
- validez estructural antes de materializar comandos write-safe
- coherencia template/policy para cada familia de artefactos
- validez del tipo elegido (`issue` vs `task` vs `mini-task` vs `epic`)
- cumplimiento del `TASK_PROCESS` cuando la mutación toca el lifecycle de una task

## Write Model

La escritura sobre `Ops Registry` debe ser command-based.

### Command rules

- cada comando debe tener schema tipado
- cada comando debe soportar `dry_run`
- el sistema debe devolver preview del cambio antes de persistir cuando el caller lo pida
- toda mutación debe dejar audit trail
- la materialización debe revalidar el estado final después de escribir

### First-class commands

Como mínimo, el sistema debe soportar:

- crear `TASK`
- actualizar `TASK`
- crear `EPIC`
- crear `ISSUE`
- crear `MINI`
- anexar entrada a `Handoff.md`
- crear doc de arquitectura
- sincronizar índices y registries
- promover `ISSUE -> TASK`

### Process-aware commands

Además, para artefactos con protocolo propio, el sistema debe exponer comandos del proceso y no solo del archivo:

- `take_task`
- `start_plan_mode`
- `attach_plan`
- `mark_task_in_progress`
- `close_task`
- `resolve_issue`

Estas operaciones existen porque el repo no solo define templates: también define procesos formales de operación y cierre.

### Materialization targets

Las mutaciones deben poder tocar de forma segura:

- `docs/tasks/**`
- `docs/epics/**`
- `docs/issues/**`
- `docs/mini-tasks/**`
- `docs/architecture/**`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/epics/EPIC_ID_REGISTRY.md`
- `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `docs/epics/README.md`
- `docs/mini-tasks/README.md`
- `docs/issues/README.md`
- `docs/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Task Lifecycle Orchestration

Las tasks requieren orquestación especial porque el repo ya define un protocolo formal en `TASK_PROCESS.md`.

### Crear una task

`create_task` debe:

1. validar que el pedido realmente califica como `task`
2. reservar el siguiente `TASK-###`
3. instanciar `TASK_TEMPLATE.md`
4. llenar `Zone 0` y `Zone 1`
5. dejar `Zone 2` vacía
6. escribir el archivo en `docs/tasks/to-do/`
7. actualizar `docs/tasks/TASK_ID_REGISTRY.md`
8. actualizar `docs/tasks/README.md`
9. devolver preview y validación

### Tomar una task

`take_task` debe:

1. mover el archivo a `docs/tasks/in-progress/`
2. cambiar `Lifecycle` a `in-progress`
3. sincronizar `docs/tasks/README.md`
4. registrar que la task fue tomada en `Handoff.md`
5. mantener la coherencia branch/lifecycle

### Iniciar plan mode

`start_plan_mode` debe:

1. verificar que la task sea de tipo `implementation`
2. crear el borrador de `docs/tasks/plans/TASK-###-plan.md`
3. registrar los apartados exigidos por `TASK_PROCESS.md`
4. permitir derivar `Checkpoint` y `Mode`

### Adjuntar plan

`attach_plan` debe:

1. validar que el plan contiene `Discovery summary`
2. validar que incluye `Access model` cuando aplique
3. validar `Skills` y `Subagent strategy` si la task lo requiere
4. actualizar o crear `plan.md`

### Cerrar una task

`close_task` debe:

1. validar acceptance criteria y verification declaradas
2. mover el archivo a `docs/tasks/complete/`
3. cambiar `Lifecycle` a `complete`
4. sincronizar `docs/tasks/README.md`
5. actualizar `Handoff.md` si aplica
6. actualizar `changelog.md` si aplica
7. revalidar consistencia final

## Query Layer

La primera capa operativa debe exponer consultas como:

- `pnpm ops:index`
- `pnpm ops:validate`
- `pnpm ops:query TASK-558`
- `pnpm ops:impact src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm ops:domain finance`
- `pnpm ops:stale`

## API Contract

`Ops Registry` debe exponer una API HTTP estable para lectura y escritura segura.

### Read endpoints

- `GET /api/internal/ops-registry/artifacts/:id`
- `GET /api/internal/ops-registry/query`
- `GET /api/internal/ops-registry/domain/:domain`
- `GET /api/internal/ops-registry/impact`
- `GET /api/internal/ops-registry/graph/:id`
- `GET /api/internal/ops-registry/validation-report`
- `GET /api/internal/ops-registry/stale-report`

### Write endpoints

- `POST /api/internal/ops-registry/tasks`
- `POST /api/internal/ops-registry/tasks/:id/take`
- `POST /api/internal/ops-registry/tasks/:id/start-plan`
- `POST /api/internal/ops-registry/tasks/:id/attach-plan`
- `PATCH /api/internal/ops-registry/tasks/:id`
- `POST /api/internal/ops-registry/tasks/:id/close`
- `POST /api/internal/ops-registry/epics`
- `POST /api/internal/ops-registry/issues`
- `POST /api/internal/ops-registry/issues/:id/promote-to-task`
- `POST /api/internal/ops-registry/issues/:id/resolve`
- `POST /api/internal/ops-registry/mini-tasks`
- `POST /api/internal/ops-registry/architecture`
- `POST /api/internal/ops-registry/handoff/entries`
- `POST /api/internal/ops-registry/sync`
- `POST /api/internal/ops-registry/reindex`
- `POST /api/internal/ops-registry/validate`

### Write response contract

Toda mutación debe poder responder con:

- `status`
- `artifactId`
- `changedFiles`
- `diffPreview`
- `validationSummary`
- `dryRun`
- `policyKind`
- `templateSource`
- `processSource`

## Generated Outputs

`Ops Registry` debe producir al menos:

- `.generated/ops-registry/registry.json`
- `.generated/ops-registry/graph.json`
- `.generated/ops-registry/validation-report.json`
- `.generated/ops-registry/stale-report.json`

Estos outputs deben ser estables, legibles y aptos para:

- consumo por CLI
- consumo por UI interna
- consumo por agentes
- futuro mirror hacia Notion

## MCP Contract

`Ops Registry` debe exponer un MCP server oficial para Claude, Codex y otros LLMs compatibles.

### Read tools

- `ops_registry_get_artifact`
- `ops_registry_query`
- `ops_registry_get_related`
- `ops_registry_get_impact`
- `ops_registry_validation_report`
- `ops_registry_stale_report`
- `ops_registry_list_repos`
- `ops_registry_cross_repo_query`

### Write tools

- `ops_registry_create_task`
- `ops_registry_take_task`
- `ops_registry_start_plan_mode`
- `ops_registry_attach_plan`
- `ops_registry_update_task`
- `ops_registry_close_task`
- `ops_registry_create_epic`
- `ops_registry_create_issue`
- `ops_registry_create_mini_task`
- `ops_registry_create_architecture_doc`
- `ops_registry_append_handoff`
- `ops_registry_resolve_issue`
- `ops_registry_promote_issue_to_task`
- `ops_registry_sync_indexes`
- `ops_registry_validate_before_write`

### MCP write safety

Los tools de mutación deben:

- aceptar `dry_run`
- devolver preview estructurado
- validar antes de escribir
- devolver archivos cambiados y estado final

## Agent Flows

### Flow — crear una task vía MCP/API

1. `ops_registry_query` para buscar artefactos relacionados y evitar duplicados
2. `ops_registry_validate_before_write` para confirmar que el caso califica como `task`
3. `ops_registry_create_task(dry_run=true)` para obtener:
   - próximo `TASK-###`
   - path propuesto
   - template aplicado
   - archivos colaterales
   - warnings
4. revisión humana o automática del preview
5. `ops_registry_create_task(dry_run=false)`
6. `ops_registry_sync_indexes`

### Flow — tomar una task existente

1. `ops_registry_get_artifact`
2. `ops_registry_take_task(dry_run=true)`
3. `ops_registry_take_task(dry_run=false)`

### Flow — iniciar plan mode

1. `ops_registry_start_plan_mode`
2. agente llena discovery/plan
3. `ops_registry_attach_plan`
4. `ops_registry_validate_before_write`

### Flow — cerrar una task

1. `ops_registry_get_artifact`
2. `ops_registry_close_task(dry_run=true)`
3. revisar `changedFiles` + `validationSummary`
4. `ops_registry_close_task(dry_run=false)`
5. `ops_registry_sync_indexes`

## Human Surface

La surface humana objetivo debe vivir en el portal interno, por ejemplo `/admin/ops-registry`, con:

- búsqueda por texto, ID y path
- filtros por tipo, lifecycle, dominio y prioridad
- detalle del artefacto
- backlinks y dependencias
- warnings de validación
- panel de source of truth
- acciones de creación/actualización guiadas por formulario o wizard, no editor libre por defecto

El objetivo no es reemplazar la lectura del markdown, sino llegar más rápido al markdown correcto y exponer el contexto relevante alrededor.

## Agent Surface

La surface para agentes debe ser JSON-first y command-first:

- outputs generados en `.generated/ops-registry/`
- endpoints internos HTTP
- MCP tools de lectura y escritura segura

Un agente no debería tener que “adivinar” qué leer ni cómo escribir. Debe poder consultar el registry, recuperar relaciones, proponer una mutación estructurada y dejar el repo sincronizado sin editar a mano todos los artefactos colaterales.

## Notion Position

Notion puede participar después, pero solo como capa derivada:

- mirror operacional
- dashboards
- priorización
- intake

Notion no debe convertirse en la source of truth primaria para arquitectura, tasks, epics o issues.

## Federation Model

La escalabilidad buscada es por federación, no por centralización:

1. Cada repo genera localmente su `registry.json`, `graph.json` y reportes.
2. Cada repo puede exponer además su API y MCP local con el mismo contrato.
3. Un agregador futuro puede leer outputs o consultar APIs/MCPs de varios repos.
4. La vista cross-repo nace después, sin quitar soberanía documental a cada repo.

## Rollout

### V1

- schema común
- parser markdown
- config por repo
- artifact policy layer
- indexador
- validator
- query layer CLI
- JSON outputs derivados
- command schemas
- materialización write-safe local
- API local
- MCP local

### V2

- UI humana mínima en Admin
- búsqueda más rica
- paneles de drift y source-of-truth
- wizards de creación/actualización de artefactos

### V3

- federación con repos hermanos
- agregador cross-repo
- mirror opcional a Notion

## Consequences

### Positive

- reduce fricción para humanos y agentes
- vuelve visible el drift documental
- deja el framework operativo más escalable
- evita duplicar la verdad entre repo y herramientas externas

### Trade-offs

- agrega una capa nueva de mantenimiento
- exige disciplina de schema y validaciones
- no reemplaza el trabajo de documentación; lo hace más operable

## Related Docs

- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Delta 2026-04-21

Se formaliza `Ops Registry` como framework operativo repo-native, humano + agente, con source of truth en Git y diseño federable para repos hermanos. La implementación se declara como programa multi-task y no como una sola task aislada.

## Delta 2026-04-21 — API, MCP y write plane seguro

Se amplía la arquitectura para declarar explícitamente que `Ops Registry` no solo lee el framework operativo: también debe poder crear y actualizar artefactos mediante comandos seguros materializados en markdown, exponer una API HTTP estable y un MCP server oficial para integrarse con Claude y otros LLMs, y permitir operación consistente entre repos hermanos.

## Delta 2026-04-21 — Artifact Policy Layer y flows process-aware

Se agrega explícitamente una `Artifact Policy Layer` para que `Ops Registry` respete `TASK_TEMPLATE`, `TASK_PROCESS`, `EPIC_TEMPLATE`, `MINI_TASK_TEMPLATE` y el modelo de issues. El sistema queda definido como template-aware y process-aware, con comandos específicos como `take_task`, `start_plan_mode`, `attach_plan` y `close_task`, en vez de limitarse a crear archivos markdown genéricos.

## Delta 2026-05-07 — Defense-in-depth, capabilities, outbox, reliability, packaging

Se incorpora al V1 la totalidad del **arch-architect overlay contract** (Greenhouse pinned decisions): capabilities granulares, outbox + reactive consumer, reliability signals, defense-in-depth de N capas, atomicidad/idempotencia del write plane, automation gates (pre-commit + CI) y estrategia de packaging progresivo. Estos puntos no son nuevos requisitos sino la formalización del cómo respeta `Ops Registry` los invariantes que ya gobiernan el resto del repo (TASK-571/699/700/703/708/720/721/728/742/758/765/766/768/771/773/774).

### Capabilities granular per command (overlay #7)

`platform.admin` está **prohibido** como catch-all del write plane. Cada comando declara su propia capability con scope `tenant`, formato canónico `ops.<artifact>.<action>`. Lista mínima:

- `ops.task.create:create`, `ops.task.take:update`, `ops.task.start_plan:update`, `ops.task.attach_plan:update`, `ops.task.update:update`, `ops.task.close:approve`
- `ops.epic.create:create`, `ops.epic.update:update`, `ops.epic.link_task:update`, `ops.epic.close:approve`
- `ops.mini_task.create:create`, `ops.mini_task.update:update`, `ops.mini_task.close:approve`
- `ops.issue.create:create`, `ops.issue.update:update`, `ops.issue.resolve:approve`, `ops.issue.promote_to_task:approve`
- `ops.architecture.create:create`, `ops.architecture.update:update`
- `ops.handoff.append:create`
- `ops.registry.read:read`, `ops.registry.sync:update`, `ops.registry.reindex:update`

Enforcement server-side via `can(subject, ...)` antes de cualquier write. La capability viene declarada en el `Artifact Policy Layer` (TASK-558 Slice 4), NO hardcodeada en route handlers.

### Outbox integration (16 schemas v1)

Toda mutación del write plane emite un evento versionado a `greenhouse_sync.outbox_events` en la **misma transacción** que la materialización del archivo. Eventos:

- `ops_registry.task.{created, taken, plan_started, plan_attached, updated, closed}` v1
- `ops_registry.epic.{created, task_linked, closed}` v1
- `ops_registry.mini_task.{created, closed}` v1
- `ops_registry.issue.{created, resolved, promoted_to_task}` v1
- `ops_registry.architecture.created` v1
- `ops_registry.handoff.appended` v1

Payload zod-validado al INSERT (no string-blob). Incluye `repoId`, `artifactId`, `actorUserId`, `requestHash`, `changedFiles[]`, `materializedAt`. Schemas registrados en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` al implementarse TASK-558.

**Consumers V3** (mirror Notion, agregador cross-repo) consumen el outbox de forma reactiva — NUNCA polling sobre los JSON derivados ni side effects síncronos cross-system desde el write plane.

### Reliability signals (overlay #8)

Subsystem nuevo `Ops Registry Health` rolla 6 signals canónicos en `getReliabilityOverview` (visibles en `/admin/operations`):

- `ops.registry.invalid_lifecycle` (drift, error si > 0, steady=0)
- `ops.registry.broken_links` (drift, error si > 0, steady=0)
- `ops.registry.stale_artifacts` (drift, warning si > 0)
- `ops.registry.epic_child_drift` (drift, error si > 0, steady=0)
- `ops.registry.registry_vs_file_mismatch` (drift, error si > 0, steady=0)
- `ops.registry.policy_violation` (drift, error si > 0, steady=0)

Cada signal vive en `src/lib/reliability/queries/ops-registry-*.ts` con la firma canónica del control plane. JSON solo (`.generated/ops-registry/validation-report.json`) **no es signal** — debe pasar por `getReliabilityOverview` o se pudre invisible.

### Defense-in-depth (overlay #5, ≥ 5 capas independientes)

Para cada mutación crítica del write plane:

1. **Schema validation** zod al input
2. **Capability check** server-side (`can(...)`)
3. **Pre-mutation validate** sobre el estado actual del repo
4. **Atomic materialization** (temp file + rename, o transactional commit)
5. **Post-mutation re-validate** sobre el estado final antes de devolver `dry_run=false` exitoso
6. **Audit log + outbox event** versionado v1 en la misma tx
7. **Reliability signal** detecta drift residual asincrónicamente

Sin DB tradicional, las "constraints" viven en zod + parser + post-validate, NO en una sola capa. Cualquier mutación que toque N archivos es **todo-o-nada**.

### Atomicidad + idempotencia

- `create_*` y `take_*` aceptan `requestHash` opcional para deduplicar reintentos. Sin él, dos retries queman dos IDs (rule canónica TASK-571 portada al write plane).
- Una mutación que toca N archivos es atómica: temp file + rename, o staging directory + bulk rename, o transactional commit. Crash a mitad NUNCA debe dejar torn state.
- `close_task` (toca 5 archivos) es el caso prueba: si falla en archivo 4, los 3 anteriores se rollbackean.

### Automation gates (V1 obligatorias, no opcionales)

- **Pre-commit hook** (husky + lint-staged): cuando un commit toca `docs/architecture/`, `docs/tasks/`, `docs/epics/`, `docs/mini-tasks/`, `docs/issues/`, `Handoff.md`, `project_context.md` o `changelog.md`, corre `pnpm ops:validate --staged`. Errors bloquean commit; warnings no.
- **CI workflow** `.github/workflows/ops-registry-validate.yml`: corre `pnpm ops:index && pnpm ops:validate --strict` en cada PR. Strict bloquea merge en errors o warnings.
- **Anti-bypass**: NO usar `--no-verify` salvo emergencia documentada (mismo contrato del resto de los hooks Greenhouse).

### Tests mandatory

Para parser markdown (regex-prone) y file-system mutators (alta blast radius), tests son **obligatorios** en V1, no opcionales:

- Parser: golden fixtures por tipo de artefacto bajo `__fixtures__/`, edge cases (frontmatter inválido, lifecycle drift, relationships rotas)
- Validators: 1 test por validator con drift detectable inyectado
- Commands: integration tests sobre filesystem temporal (memfs o tempdir) cubriendo dry_run preview, capability denial, mutación exitosa, error sanitizado, rollback ante crash a mitad
- MCP tools: snapshot tests de respuestas dry_run

### Sentry domain rollup

Todos los errors del módulo usan `captureWithDomain(err, 'ops_registry', { extra })` de `src/lib/observability/capture.ts`. Subsystem `Ops Registry Health` rolla los incidents Sentry. NUNCA `Sentry.captureException(err)` directo.

### Output redaction

Cualquier error que cruce un boundary HTTP usa `redactErrorForResponse(err)` de `src/lib/observability/redact.ts`. NUNCA raw `error.message` ni `error.stack` en 4xx/5xx.

### Packaging strategy — progressive extraction

**Fase 1 (V1 — TASK-558/559/560)**: el core vive en `src/lib/ops-registry/**` dentro de greenhouse-eo, **arquitecturado como extractable**. Cero `import '@/...'` o paths Greenhouse-specific en el core. Toda especificidad detrás de `ops-registry.config.ts`. Extractability gate enforced por CI grep:

```bash
grep -rE "@/lib/|@/components/|@/types/" src/lib/ops-registry/
# debe retornar 0 resultados
```

**Fase 2 (TASK-561 — federación)**: cuando un segundo repo (Kortex, hubspot-bigquery, sister) lo necesite **de verdad**, extraer:

- bootstrap pnpm workspaces (`pnpm-workspace.yaml` + `packages/`)
- mover a `packages/ops-registry/` con `name: "@efeonce/ops-registry"` privado
- greenhouse-eo lo consume vía `workspace:*`
- publicar a **GitHub Packages npm** (`npm.pkg.github.com/@efeonce`) — reusa WIF + `gh` ya autenticados; cero infra nueva
- sister repos: `pnpm add -D @efeonce/ops-registry`

**Modos de consumo del paquete** (todos del mismo binario):

- bootstrap: `npx @efeonce/ops-registry init` (genera config + scripts en repo nuevo)
- daily ops: `pnpm exec ops-registry validate` (pinneado por lockfile, reproducible)
- library: `import { parseTask } from '@efeonce/ops-registry/parser'`
- MCP: `~/.claude/mcp_servers.json` apunta al bin

**Por qué progresivo y NO V1**: premature abstraction sin segundo consumidor; overhead pnpm workspaces sin retorno; CI velocity (workspace package activa rebuild de todo el grafo). Cuando hay segundo consumidor real, la extracción es mecánica gracias al gate de Fase 1.

### Rollout V1/V2 — clarificación

V1 explícitamente **NO incluye surface humana** (alineado con la sección Rollout original). La UI `/admin/ops-registry` se mueve a **TASK-814** (V2 rollout). V1 es agent-only: API HTTP interna + MCP server + CLI + outputs JSON. Cualquier task que prometa UI humana en V1 está mal especificada y debe rebajarse a V2.

### Hard rules (anti-regression)

- **NUNCA** reutilizar `platform.admin` como capability del write plane. Granular siempre.
- **NUNCA** mutar archivos sin emitir el outbox event v1 correspondiente en la misma tx.
- **NUNCA** dejar un signal del subsystem `Ops Registry Health` solo en JSON sin wirearlo a `getReliabilityOverview`.
- **NUNCA** introducir `import '@/...'` en `src/lib/ops-registry/**` (rompe extractability gate).
- **NUNCA** mutación que toque N archivos sin atomicity garantizada (temp + rename, o staging + bulk rename).
- **NUNCA** raw `Sentry.captureException` ni raw `error.message` en HTTP responses.
- **NUNCA** prometer surface humana en V1. Va a V2 (TASK-814).
- **SIEMPRE** golden fixtures para el parser y tests integration para los commands; mandatory, no opcional.
