# TASK-1152 — Roadmap work item index reader (Markdown SSOT)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `roadmap|platform|ops|data`
- Blocked by: `none`
- Branch: `task/TASK-1152-roadmap-work-item-index-reader`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation backend/read-only para que Greenhouse pueda leer el backlog operativo repo-native como source of truth Markdown: `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**`. El Roadmap no debe ver solo tasks: debe exponer un indice tipado de work items para humanos, manteniendo cada Markdown como contrato primario para agentes.

## Why This Task Exists

El backlog ya es demasiado grande para priorizar revisando Markdown uno por uno, pero mover la verdad a una UI romperia el flujo de agentes. Ademas, el trabajo real no vive solo en `TASK-*`: los epics agrupan programas, las mini-tasks capturan follow-ups acotados y los issues explican incidentes/runtime debt. Hace falta un reader que convierta todos esos artefactos en datos navegables sin crear un segundo source of truth ni permitir mutaciones desde la UI en V1.

## Goal

- Mantener `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**` como SSOT y construir un indice derivado, read-only y tolerante a formatos canonical + legacy.
- Exponer un contrato interno versionado para listar, filtrar y diagnosticar work items por kind, lifecycle/status, dominio, impacto, bloqueo, salud de template y readiness.
- Dejar la base lista para `TASK-1153` sin introducir DB writes, migraciones ni edicion de Markdown desde runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

Reglas obligatorias:

- `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**` siguen siendo source of truth; el reader solo genera una proyeccion derivada.
- No crear writes, lifecycle moves ni edicion de Markdown desde el API en V1.
- No duplicar el contrato de `pnpm task:lint`, `pnpm epic:lint` ni `pnpm mini:lint`; si se necesita salud de template, reusar o espejar su semantica de forma testeada. Issues no tienen linter dedicado hoy; el reader debe parsearlos con tolerancia y health honesto.
- El contrato debe ser apto para UI humana y agentes sin exponer secretos, rutas absolutas locales ni raw errors.

## Normative Docs

- `docs/epics/README.md`
- `docs/epics/EPIC_TEMPLATE.md`
- `docs/epics/EPIC_ID_REGISTRY.md`
- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `docs/mini-tasks/README.md`
- `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
- `docs/issues/README.md`

## Dependencies & Impact

### Depends on

- `docs/epics/**`
- `docs/tasks/**`
- `docs/mini-tasks/**`
- `docs/issues/**`
- `scripts/ci/epic-lint.mjs`
- `scripts/ci/task-lint.mjs`
- `scripts/ci/ops-lint.mjs`

### Blocks / Impacts

- Blocks `TASK-1153` (Roadmap cockpit UI).
- Impacts future backlog grooming, task discovery and agent handoff workflows.
- Impacts how humans relate epics, tasks, mini-tasks and issues before choosing execution order.

### Files owned

- `src/lib/roadmap/work-item-index/types.ts`
- `src/lib/roadmap/work-item-index/parser.ts`
- `src/lib/roadmap/work-item-index/reader.ts`
- `src/lib/roadmap/work-item-index/health.ts`
- `src/lib/roadmap/work-item-index/cache.ts`
- `src/app/api/roadmap/work-items/route.ts`
- `src/lib/roadmap/work-item-index/*.test.ts`
- `docs/documentation/plataforma/roadmap-cockpit.md`

## Current Repo State

### Already exists

- Epics live under `docs/epics/to-do/`, `docs/epics/in-progress/` and `docs/epics/complete/`.
- Formal tasks live under `docs/tasks/to-do/`, `docs/tasks/in-progress/` and `docs/tasks/complete/`.
- Mini-tasks live under `docs/mini-tasks/to-do/`, `docs/mini-tasks/in-progress/` and `docs/mini-tasks/complete/`.
- Issues live under `docs/issues/open/` and `docs/issues/resolved/`.
- `docs/*/README.md` and ID registries act as bootstrap indices where present.
- `pnpm task:lint`, `pnpm epic:lint`, `pnpm mini:lint` and `pnpm ops:lint --changed` validate the governed lanes.

### Gap

- There is no typed runtime reader for epics, tasks, mini-tasks and issues as one Roadmap graph.
- Humans must inspect Markdown files directly to prioritize backlog.
- The future UI has no safe contract to consume without parsing Markdown client-side or inventing a second backlog store.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `docs/epics/**/EPIC-*.md`, `docs/tasks/**/TASK-*.md`, `docs/mini-tasks/**/MINI-*.md`, `docs/issues/**/ISSUE-*.md`
- Consumidores afectados: `UI/API/agentes internos`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `docs/epics/EPIC_TEMPLATE.md`, `docs/tasks/TASK_TEMPLATE.md`, `docs/tasks/TASK_PROCESS.md`, `docs/mini-tasks/MINI_TASK_TEMPLATE.md`, `docs/issues/README.md`, `scripts/ci/task-lint.mjs`
- Contrato nuevo o modificado: `roadmap-work-item-index.v1` via `GET /api/roadmap/work-items`
- Backward compatibility: `compatible`
- Full API parity: la UI de Roadmap consumira el reader server-side; no leera archivos Markdown ni tablas internas directamente.

### Data model and invariants

- Entidades/tablas/views afectadas: `N/A — file-backed derived reader`
- Invariantes que no se pueden romper:
  - Markdown en `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**` sigue siendo SSOT.
  - El reader nunca mueve archivos, cambia lifecycle ni reescribe Markdown.
  - Un work item legacy o incompleto debe degradar a `health: legacy|needs_grooming`, no romper toda la respuesta.
  - La relacion epic -> task se deriva de `Epic: EPIC-###` y/o mentions, no de heuristicas opacas.
  - Issues son incidentes reactivos; no deben mezclarse como tasks ejecutables aunque aparezcan en Roadmap.
- Tenant/space boundary: acceso restringido a usuarios internos/autorizados; no deriva `space_id` porque el backlog es operativo interno del repo.
- Idempotency/concurrency: read-only; cache derivada por `mtime`/hash o invalidacion por proceso, sin writes concurrentes.
- Audit/outbox/history: `none` en V1 porque no hay mutacion; health/logs suficientes.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only`
- Backfill plan: `N/A — indice derivado en runtime/build`
- Rollback path: revert PR o apagar el consumo UI de `TASK-1153`; no hay datos persistidos.
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: session interna y/o capability propuesta `roadmap.tasks.read`
- Sensitive data posture: no secrets; exponer solo metadata de task y paths relativos del repo.
- Error contract: errores canonicos, sin rutas absolutas locales ni stack traces; capturar con dominio `platform` u `ops`.
- Abuse/rate-limit posture: cache read-through y paginacion/filtros para evitar parseos caros por request.

### Runtime evidence

- Local checks: parser/reader tests + `pnpm task:lint --changed`
- DB/runtime checks: `N/A — no DB`
- Integration checks: smoke local del endpoint y respuesta con conteo de tasks real.
- Reliability signals/logs: log/capture de parse failures agregados; no signal formal requerido en V1.
- Production verification sequence: deploy, llamar `GET /api/roadmap/work-items`, verificar conteos no cero por kind, filtros basicos y ausencia de errores por legacy items.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
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

### Slice 1 — Typed work item model and parsers

- Crear tipos `roadmap-work-item-index.v1` con `kind: epic|task|mini_task|issue`, summary, lifecycle/status, priority, impact, effort, domain, blockers, related IDs, owned files and health.
- Implementar parsers server-side para `EPIC-*`, `TASK-*`, `MINI-*` e `ISSUE-*`, degradando de forma honesta para formatos legacy o incompletos.
- Cubrir casos con tests: template completo, item legacy, campos faltantes, dominios multiples, path relativo, issue open/resolved y malformed Markdown.

### Slice 2 — Health and readiness classification

- Integrar o espejar las senales principales de `task:lint`, `epic:lint` y `mini:lint`: `template`, `legacy`, `errors`, `warnings`, `needs_grooming`. Para issues, clasificar por campos esperados del README y folder `open|resolved`.
- Agregar clasificacion operativa para `ready_to_execute`, `blocked`, `needs_triage`, `in_progress`, `complete`.
- Agregar relaciones derivadas: epic children, task blockers, issues related to tasks/epics y mini-tasks promoted/linked when declared.
- Evitar que un item con errores bloquee el indice completo.

### Slice 3 — Reader/cache and API route

- Crear reader server-side con cache derivada y filtros por kind, lifecycle/status, domain, profile, impact, blocked state, environment, text search and health.
- Exponer `GET /api/roadmap/work-items` con contrato estable, paginacion simple y errores canonicos.
- Asegurar acceso interno/capability antes de devolver el backlog.

### Slice 4 — Documentation and handoff to UI

- Documentar el contrato en `docs/documentation/plataforma/roadmap-cockpit.md`.
- Dejar ejemplos de payload para `TASK-1153`.
- Sincronizar README/registry si emergen follow-ups durante implementacion.

## Out of Scope

- Editar tasks desde UI o API.
- Mover files entre `to-do/`, `in-progress/` y `complete/`.
- Persistir prioridades/ranking en DB.
- Crear la experiencia visual del Roadmap (cubierto por `TASK-1153`).
- Crear un motor completo de dependencia/grafo multi-epic.

## Detailed Spec

El reader debe devolver una coleccion compacta orientada a backlog humano:

- identificacion: `id`, `kind`, `title`, `path`, `lifecycle/status`
- triage: `priority`, `impact`, `effort`, `type`, `rank`
- contratos: `executionProfile`, `uiImpact`, `backendImpact`, `domain` when applicable
- operacion: `blockedBy`, `branch`, `filesOwned`, `dependsOn`, `blocks`, `relatedIds`, `parentEpic`
- issue metadata: `environment`, `detectedAt`, `resolvedAt`, `severity` when parseable
- salud: `templateStatus`, `lintErrors`, `lintWarnings`, `needsGrooming`, `parseWarnings`
- resumen: `summary`, `why`, `goalPreview`

El endpoint debe aceptar filtros por query params simples. Si el parser no puede leer una seccion, debe devolver el work item con `parseWarnings` y metadata minima extraida desde filename.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (typed model/parser) -> Slice 2 (health) -> Slice 3 (reader/API) -> Slice 4 (docs).
- `TASK-1153` no debe implementarse contra parsing client-side; debe esperar el contrato de Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El reader interpreta mal items legacy y oculta trabajo importante | ops | medium | Degradar a `legacy/needs_grooming`, tests con fixtures reales y conteo total vs filesystem | Diferencia entre `rg --files docs/{epics,tasks,mini-tasks,issues}` y conteo API |
| Parseo por request degrada performance | API | medium | Cache por proceso/hash/mtime + paginacion | Latencia del endpoint y logs de cache miss |
| La UI futura trata el indice como SSOT editable | platform | low | Contrato/documentacion read-only y ausencia de write routes | PRs que agreguen PATCH/POST sin task nueva |
| Exposicion de rutas absolutas/locales | security | low | Normalizar paths relativos y sanitizar errores | Revision de payload + tests |

### Feature flags / cutover

Sin flag para el reader si queda gateado por acceso interno y no es enlazado por UI hasta `TASK-1153`. Cutover inmediato y aditivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR de parser/types | <15 min | si |
| Slice 2 | Revert health classifier o dejarlo fuera del response | <15 min | si |
| Slice 3 | Revert route o bloquear acceso al endpoint | <15 min | si |
| Slice 4 | Revert docs | <10 min | si |

### Production verification sequence

1. Deploy con route interna disponible.
2. Smoke `GET /api/roadmap/work-items` como usuario autorizado.
3. Verificar conteo de work items no cero por `kind=epic|task|mini_task|issue` y filtros `lifecycle=to-do`, `status=open`, `health=needs_grooming`, `executionProfile=ui-ux`.
4. Verificar que un item legacy no rompe el response.
5. Verificar que usuario sin acceso no puede leer el indice.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` y `docs/issues/**` permanecen como SSOT y no se agregan writes/lifecycle moves desde runtime.
- [ ] El reader devuelve `roadmap-work-item-index.v1` con metadata suficiente para construir el cockpit de `TASK-1153`.
- [ ] El parser soporta epics, tasks, mini-tasks e issues con degradacion honesta.
- [ ] El endpoint esta protegido por acceso interno/capability y no expone rutas absolutas ni raw errors.
- [ ] Filtros/paginacion cubren kind, lifecycle/status, domain, execution profile, UI/backend impact, blocked state, health, environment y texto.
- [ ] Tests focales cubren parser, health classifier, cache/reader y route.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/roadmap/work-item-index`
- `pnpm task:lint --changed`
- Smoke local de `GET /api/roadmap/work-items`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1153` fue actualizado si el contrato final difiere del esperado

## Follow-ups

- `TASK-1153` — Roadmap cockpit UI (main menu, non-admin).
- Future task: lifecycle/rank write commands, solo si se decide que Greenhouse puede editar Markdown via PR/agent workflow.

## Open Questions

- Definir durante Plan Mode si la capability final sera `roadmap.work_items.read` o si se reusa una capability interna existente.
