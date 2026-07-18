# TASK-1451 — Notion Work Status, Results and Observed History

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Backend impact: `webhook`
- Epic: `EPIC-032`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1449`
- Branch: `task/TASK-1451-notion-work-status-results-observed-history`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye readers gobernados para consultar propiedades actuales, vencimiento, días restantes, progreso recursivo, resultado/evidencia e historia observada de trabajo Notion, reutilizando captures y calendario existentes sin fingir un historial que Greenhouse nunca observó.

## Why This Task Exists

Consultar sólo la página actual no responde si una tarea avanzó, qué cambió o cuándo; usar sólo la proyección histórica puede estar stale. Se necesita un contrato que combine live read, evidencia observada, freshness y coverage con semántica temporal honesta.

## Goal

- Entregar snapshot y health temporal de Project/Task por reader/API.
- Calcular progreso recursivo por hojas, sin doble conteo y con coverage explícito.
- Exponer resultado e historia observada reutilizando el ledger/captures vigentes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NOTION_WORK_MANAGEMENT_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`

Reglas obligatorias:

- La vista actual viene de live read cuando se solicita; webhook/sync es señal para re-fetch, no payload autoritativo.
- Historial significa `observed history`; ausencia de capture se reporta como unknown, no como “sin cambios”.
- Reusar `task_status_transitions`, due-date capture, operational calendar y reliability existentes antes de extender schema.
- Progreso recursivo se calcula sobre hojas terminales y declara coverage, freshness y nodos no evaluables.

## Normative Docs

- `.codex/skills/notion-platform/references/work-management.md`
- `.codex/skills/notion-platform/references/webhooks.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1449` completa.
- `src/lib/sync/projections/notion-status-transition-capture.ts` y calendario operacional vigentes.

### Blocks / Impacts

- `TASK-1452` y cualquier reporting/agent consumer de work status.
- Reliability/sync sólo si discovery demuestra una brecha real del ledger actual.

### Files owned

- `src/lib/notion-work/readers/`
- `src/lib/notion-work/projections/`
- `src/lib/sync/projections/notion-status-transition-capture.ts` sólo para extensión compatible.
- `src/lib/calendar/` sólo para reutilización o fix compartido justificado.

## Current Repo State

### Already exists

- Captura de transiciones de estado y cambio de due date.
- `greenhouse_delivery.task_status_transitions`, readers/signals de reliability y calendario hábil.
- Registry/adapter/fingerprint provistos por `TASK-1449`.

### Gap

- No hay DTO único de status/health/result ni cálculo recursivo multi-space.
- La cobertura/freshness histórica no se expresa al consumer.
- El resultado de ejecución no tiene convención de extracción compartida.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/notion-work/ con adapters a sync/calendar existentes`
- Future candidate home: `domain-package`
- Boundary: `GetNotionWorkStatus, GetNotionWorkHistory y GetNotionProjectProgress readers`
- Server/browser split: `live provider/DB server-only; DTO sanitizado y serializable para consumers`
- Build impact: `queries/readers y tests; sin SDK/provider en bundles browser`
- Extraction blocker: `ledger Postgres, business calendar y live provider access compartidos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `webhook`
- Source of truth afectado: `Notion live state + observed history en greenhouse_delivery.task_status_transitions y captures relacionados`
- Consumidores afectados: `API, CLI, agentes, reliability y futuros reportes`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `status transition capture, calendar y ADR del control plane`
- Contrato nuevo o modificado: `NotionWorkStatus/History/ProjectProgress DTOs y readers versionados`
- Backward compatibility: `compatible`
- Full API parity: `todo consumer usa readers canónicos; no consulta provider/tablas directamente`

### Data model and invariants

- Entidades/tablas/views afectadas: `ledger existente; extensión aditiva sólo si el ADR/discovery prueba insuficiencia`
- Invariantes que no se pueden romper:
  - `current` y `observed history` están diferenciados y cada dato declara observed_at/freshness.
  - Due states usan zona/horario/calendario explícitos; progreso no duplica parents y no oculta coverage incompleto.
- Tenant/space boundary: `space_id + registered source + provider object ID verificado`
- Idempotency/concurrency: `captures deduplicados por object/property/value/observed_at bucket; re-fetch seguro`
- Audit/outbox/history: `append-only; correcciones son nuevas observaciones, no rewrite silencioso`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `shadow`
- Backfill plan: `no inventar historia; importar sólo eventos verificables con provenance y observed_at`
- Rollback path: `deshabilitar readers/webhook consumer nuevo; conservar ledger append-only`
- External coordination: `webhook subscription sólo si ya no existe señal equivalente; secret/HMAC según contrato vigente`

### Security and access

- Auth/access gate: `capability read + scope del space`
- Sensitive data posture: `assignees, comentarios/resultados operativos; DTO y logs con minimización/redacción`
- Error contract: `not_found, destination_unready, stale_snapshot, history_unavailable, partial_coverage, provider_unavailable`
- Abuse/rate-limit posture: `cache/freshness policy, traversal budget y circuit breaker para live reads`

### Runtime evidence

- Local checks: `fixtures de due states, DST, history, unknown advancement y árboles profundos`
- DB/runtime checks: `queries de dedupe, ordering, provenance y coverage`
- Integration checks: `live read + webhook/reconcile en dos spaces`
- Reliability signals/logs: `notion.snapshot_stale, notion.history_gap, notion.progress_partial, notion.webhook_refetch_failed`
- Production verification sequence: `shadow compare -> staging webhook/reconcile -> prod read-only -> enable consumers gradual`

### Acceptance criteria additions

- [ ] Readers declaran source, observed_at, freshness, coverage y errores canónicos.
- [ ] Historial/webhook tiene evidencia real y rollback antes de habilitarse en producción.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Current status and due health

- Leer propiedades tipadas, assignee, status, dates, priority/impact/effort y resultado/evidence disponible.
- Calcular overdue/due today/días calendario y hábiles con timezone/calendario explícitos.

### Slice 2 — Recursive progress and result

- Traversar el árbol iterativamente y calcular progreso por hojas terminales con coverage/unknowns.
- Definir convención de resultado desde propiedades registradas y ancla Enhanced Markdown sin parseo ambiguo.

### Slice 3 — Observed history and advancement

- Reusar captures/ledger para timeline y `advanced: yes|no|unknown` respecto de baseline solicitado.
- Conectar webhook/reconciliation como refetch idempotente, con freshness y gap signals.

## Out of Scope

- Mutar trabajo, construir CLI/UI, fabricar historia previa al primer observation point o sustituir sync/ICO.

## Detailed Spec

El DTO separa `current`, `temporalHealth`, `progress`, `result`, `history` y `evidenceMeta`. `daysRemaining` distingue calendar/business y nunca mezcla timezones. Si un árbol supera el budget, devuelve cursor/resume token y `partial_coverage`, no un porcentaje aparentemente completo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Current snapshot -> due semantics -> recursive progress -> result contract -> history reuse -> webhook/refetch shadow -> consumer enablement.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reportar avance falso | data | medium | baseline + unknown explícito | notion.history_gap |
| Días restantes incorrectos | data | medium | timezone/calendar fixtures + DST | due health mismatch |
| Árbol parcial parece completo | integration | medium | coverage/cursor fail-visible | notion.progress_partial |

### Feature flags / cutover

Readers nuevos empiezan en shadow/read-only; webhook/refetch y cada consumer se habilitan por space después del compare.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Readers | retirar entrypoint/flag y volver a readers previos | <15 min | sí |
| History/webhook | deshabilitar consumer; preservar eventos append-only | <15 min | sí |

### Production verification sequence

Fixtures locales, query verify, shadow comparison staging, live read de dos spaces, webhook/reconcile controlado y prod read-only antes de habilitar CLI.

### Out-of-band coordination required

Si se crea o cambia una webhook subscription, coordinar secret/HMAC, endpoint y replay test con el owner de la integración; de lo contrario, usar reconciliation vigente.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Reader devuelve propiedades, estado temporal y días restantes con timezone/calendario explícitos.
- [ ] Progreso recursivo por hojas no duplica parents y expone coverage/cursor para árboles incompletos.
- [ ] Resultado/evidence usa mappings y anclas registradas, no heurísticas por copy.
- [ ] `advanced` distingue yes/no/unknown y nunca fabrica historia no observada.
- [ ] Webhook/reconciliation re-fetch es idempotente, auditable y probado multi-space.

## Verification

- `pnpm task:lint --task TASK-1451`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales + DB/live read/webhook smoke + `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, contratos reader/history, changelog, runbook y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1452`.
