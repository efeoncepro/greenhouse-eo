# Greenhouse EO — Ops Registry Architecture V1

## Status

- Owner: `Platform / Operations`
- Status: `Proposed`
- Scope: `Greenhouse EO + sister repos adopting the same operational framework`
- Last updated: `2026-04-21`

## Summary

Greenhouse necesita una capa operativa repo-native que permita navegar, validar y relacionar la documentacion viva del framework de desarrollo sin mover la source of truth fuera de Git. `Ops Registry` es esa capa.

No reemplaza markdown, Git, PRs, tasks ni arquitectura. Lee esos artefactos, extrae metadata y relaciones, valida inconsistencias y expone surfaces amigables para humanos y agentes.

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
2. `Ops Registry` es una capa derivada de indexación, validación, consulta y surfacing.
3. La primera versión debe montarse sobre `TypeScript + Node.js`, no sobre una base externa ni sobre Notion.
4. La arquitectura debe ser federable para repos hermanos mediante un schema común y configuración por repo.
5. El sistema debe ser dual:
   - amigable para humanos por UI/lectura/descubrimiento
   - amigable para agentes por JSON, CLI y endpoints consultables

## Principles

### Repo-native

El sistema vive encima del repo y entiende archivos reales, paths reales, lifecycle real y diffs reales.

### Read-first

V1 prioriza leer, indexar, validar y consultar. No intenta reemplazar la autoría humana en markdown.

### Human + agent duality

Cada capacidad importante debe tener una salida legible por personas y una salida estructurada por máquinas.

### Federation-ready

Cada repo conserva su truth local, pero todos pueden hablar un contrato derivado común.

### Validation over bureaucracy

El valor principal no es meter más workflow, sino detectar y hacer visible el drift operativo que hoy se corrige manualmente.

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

## Non-goals

- reemplazar Git como source of truth
- convertir Notion en base canónica del sistema técnico
- crear un clon interno de Jira / Linear / Notion
- introducir una base de datos central como dependencia obligatoria de V1
- abrir edición rica desde UI en la primera versión

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
  - core del parser, schema, graph builder, validators y query layer
- `scripts/ops-registry-*.mjs`
  - entrypoints de CLI y generación local/CI
- `.generated/ops-registry/**`
  - artefactos derivados y consumibles por humanos/agentes
- `src/app/api/internal/ops-registry/**`
  - endpoints internos JSON-first para agentes y surfaces admin
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

## Repo Config Contract

Cada repo hermano debe exponer una configuración local, por ejemplo `ops-registry.config.ts`, con:

- `repoId`
- `repoName`
- paths canónicos a indexar
- taxonomías habilitadas
- reglas obligatorias por repo
- aliases de dominio
- validaciones locales adicionales

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

## Query Layer

La primera capa operativa debe exponer consultas como:

- `pnpm ops:index`
- `pnpm ops:validate`
- `pnpm ops:query TASK-558`
- `pnpm ops:impact src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm ops:domain finance`
- `pnpm ops:stale`

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

## Human Surface

La surface humana objetivo debe vivir en el portal interno, por ejemplo `/admin/ops-registry`, con:

- búsqueda por texto, ID y path
- filtros por tipo, lifecycle, dominio y prioridad
- detalle del artefacto
- backlinks y dependencias
- warnings de validación
- panel de source of truth

El objetivo no es reemplazar la lectura del markdown, sino llegar más rápido al markdown correcto y exponer el contexto relevante alrededor.

## Agent Surface

La surface para agentes debe ser JSON-first:

- outputs generados en `.generated/ops-registry/`
- endpoints internos tipo:
  - `GET /api/internal/ops-registry/artifacts/:id`
  - `GET /api/internal/ops-registry/query`
  - `GET /api/internal/ops-registry/impact`
  - `GET /api/internal/ops-registry/validation-report`

Un agente no debería tener que “adivinar” qué leer; debe poder consultar el registry, recuperar relaciones y luego abrir solo los documentos relevantes.

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
2. Un agregador futuro puede leer outputs de varios repos.
3. La vista cross-repo nace después, sin quitar soberanía documental a cada repo.

## Rollout

### V1

- schema común
- parser markdown
- config por repo
- indexador
- validator
- query layer CLI
- JSON outputs derivados

### V2

- UI humana mínima en Admin
- endpoints internos
- búsqueda más rica
- paneles de drift y source-of-truth

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
