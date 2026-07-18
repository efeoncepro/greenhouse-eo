# TASK-1449 — Notion Work Registry and Markdown Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-032`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1449-notion-work-registry-markdown-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Congela la arquitectura del control plane, reconcilia `TASK-880`/`TASK-577` con el runtime real y construye el registry multi-space, schema fingerprint y renderer seguro de Enhanced Markdown que consumirán todos los commands/readers Notion.

## Why This Task Exists

El repo tiene mappings, sources por space, un cliente parcial y documentación rica, pero no un contrato único para resolver destinos, detectar drift y transformar contenido estructurado sin que cada agente redescubra nombres, schemas o payloads.

## Goal

- Aceptar una decisión arquitectónica que deje un solo cliente seam y un solo write bridge.
- Resolver destinos por identidad canónica y property IDs con readiness/fingerprint verificables.
- Proveer Enhanced Markdown validado, seguro y testeable para páginas de proyecto/tarea.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`

Reglas obligatorias:

- Resolver por `space_id` + propósito + registry, nunca por prefijo de page ID, búsqueda global o acceso accidental.
- Persistir y comparar property IDs/tipos; los nombres visibles son metadata, no identidad.
- Un solo adapter server-only encapsula auth, versión, paginación, retry, rate limits y errores.
- La primera slice debe resolver por ADR si `TASK-880`/`TASK-577` continúan, se reducen o quedan parcialmente superseded.

## Normative Docs

- `.codex/skills/notion-platform/SKILL.md`
- `.codex/skills/notion-platform/references/enhanced-markdown.md`
- `.codex/skills/notion-platform/references/work-management.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.space_notion_sources` y `greenhouse_delivery.space_property_mappings` existentes.
- Discovery obligatorio de `TASK-880` y `TASK-577`; no son bloqueo de ejecución, sí contrato a reconciliar.

### Blocks / Impacts

- `TASK-1450`, `TASK-1451` y `TASK-1452`.
- Cualquier future consumer CLI, API, Nexa, Codex o Claude de work management Notion.

### Files owned

- `src/lib/notion-work/`
- `src/lib/space-notion/`
- `scripts/migrations/`
- `docs/architecture/GREENHOUSE_NOTION_WORK_MANAGEMENT_CONTROL_PLANE_DECISION_V1.md`

## Current Repo State

### Already exists

- `src/lib/space-notion/notion-client.ts`, `space-notion-store.ts` y `notion-governance-contract.ts`.
- Registry/mappings por space, sync readiness y governance checks materializados por tasks previas.
- Skill `notion-platform` con reglas de jerarquía, multi-space y Enhanced Markdown.

### Gap

- El wrapper genérico aún usa una versión antigua y no es el seam completo previsto por `TASK-880`.
- No existe work registry con roles Project/Task, fingerprint estable ni renderer/linter runtime compartido.
- La relación entre el write bridge `TASK-577` y este control plane no está decidida.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/notion-work/ y src/lib/space-notion/ dentro del monolito vigente`
- Future candidate home: `domain-package`
- Boundary: `NotionWorkRegistryReader, NotionProviderAdapter y EnhancedMarkdownRenderer consumidos sólo por commands/readers`
- Server/browser split: `provider, token, registry sensible y writes server-only; AST/DTO browser-safe sin secretos`
- Build impact: `migración aditiva, parser/renderer liviano y tests de contrato; sin SDK pesado en cliente`
- Extraction blocker: `secret refs por space, mappings Postgres y coordinación con sync/adapters existentes`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_core.space_notion_sources, greenhouse_delivery.space_property_mappings y extensión aditiva definida por ADR`
- Consumidores afectados: `commands, readers, CLI, API y agentes`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `src/lib/space-notion/ y GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- Contrato nuevo o modificado: `NotionWorkRegistry, SchemaFingerprint, EnhancedMarkdown AST/renderer y adapter canónico`
- Backward compatibility: `gated`
- Full API parity: `commands/readers futuros consumen el adapter; ningún consumer usa tablas o SDK directo`

### Data model and invariants

- Entidades/tablas/views afectadas: `extensión aditiva de registry/mappings; nombres físicos congelados en ADR antes de migrar`
- Invariantes que no se pueden romper:
  - `space` y destino son explícitos o resueltos sin ambigüedad; Project/Task roles no se mezclan.
  - Property IDs, tipos y relation targets deben coincidir con el fingerprint antes de habilitar writes.
- Tenant/space boundary: `space_id canónico + source_id registrado + secret ref del mismo space`
- Idempotency/concurrency: `upsert por identidad canónica y compare-and-swap de fingerprint/version`
- Audit/outbox/history: `audit append-only de discovery, drift, readiness y cambios de mapping`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: `discovery dry-run de sources registrados; apply sólo con allowlist y diff aprobado`
- Rollback path: `flag off + revert de consumers; conservar metadata aditiva hasta retiro seguro`
- External coordination: `integrations Notion deben compartir databases/data sources objetivo; no rotar tokens en esta task`

### Security and access

- Auth/access gate: `secret ref por space + capability server-side`
- Sensitive data posture: `tokens y payloads provider server-only; errores/logs redactados`
- Error contract: `space_ambiguous, destination_unready, schema_drift, provider_rate_limited y markdown_invalid`
- Abuse/rate-limit posture: `retry con jitter, circuit breaker, budgets y concurrency cap por integration`

### Runtime evidence

- Local checks: `unit, golden, round-trip, property pagination y fuzz tests`
- DB/runtime checks: `migration dry-run + consultas read-only de registry/fingerprint`
- Integration checks: `discovery contra Efeonce y un segundo space sin writes`
- Reliability signals/logs: `notion.destination_unready, notion.schema_drift, notion.provider_rate_limited`
- Production verification sequence: `ADR -> migration staging -> discovery read-only -> allowlist -> prod flag OFF -> read-only verify`

### Acceptance criteria additions

- [ ] Source of truth, límites, idempotencia, errores y rollout usan objetos reales tras discovery.
- [ ] Capability parity queda preparada sin exponer un nuevo write antes de `TASK-1450`.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — ADR and ownership reconciliation

- Auditar runtime y contratos de `TASK-880`/`TASK-577`; aceptar ADR con ownership, API version, auth, source-of-truth y migration path.
- Actualizar tasks afectadas si el ADR reduce, reutiliza o supersede parcialmente su scope.

### Slice 2 — Registry and readiness

- Materializar roles Project/Task, aliases controlados, property IDs, relation targets, capabilities y schema fingerprint.
- Exponer discovery/readiness idempotente con diff, paginación y dry-run multi-space.

### Slice 3 — Enhanced Markdown foundation

- Implementar AST/renderer/linter para headings, toggles, callouts, tablas, listas, code, links y escapes.
- Agregar fixtures golden/adversariales y límites seguros de tamaño, nesting y payload.

## Out of Scope

- Crear, editar o reparentar trabajo real; consultar progreso/resultado; CLI final; UI o MCP server.

## Detailed Spec

Enhanced Markdown debe compilar hacia bloques/API soportados sin concatenar payloads inseguros. El renderer preserva estructura, rechaza nesting inválido y degrada de forma explícita cuando Notion no representa una construcción. El registry nunca adivina un destino ambiguo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- ADR/reconciliación -> registry schema -> discovery/fingerprint -> renderer -> canary read-only. Ningún write se habilita en esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar cliente o bridge | integration | medium | ADR + imports guard/test | direct provider call detected |
| Mapping drift escribe mal después | migration | medium | fingerprint + readiness fail-closed | notion.schema_drift |
| Markdown produce bloques inválidos | integration | medium | AST tipado + golden/fuzz | markdown_invalid |

### Feature flags / cutover

Registry nuevo y adapter quedan read-only/flag OFF hasta `TASK-1450`; discovery no modifica Notion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| ADR/registry | revert PR; conservar columnas aditivas sin consumers | <30 min | sí |
| Renderer/adapter | desactivar flag y volver al seam anterior | <15 min | sí |

### Production verification sequence

Validar tests y migration en staging, ejecutar discovery read-only en dos spaces, confirmar fingerprints y desplegar prod con writes deshabilitados.

### Out-of-band coordination required

Owner de cada space debe confirmar que la integración comparte Project/Task sources objetivo; cualquier grant faltante deja el destino `unready`.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR aceptado elimina overlap ambiguo con `TASK-880`/`TASK-577` y deja un solo adapter seam.
- [ ] Registry resuelve al menos dos spaces por identidad canónica y falla cerrado ante ambigüedad/drift.
- [ ] Fingerprint cubre property IDs, tipos y relation targets con paginación completa.
- [ ] Enhanced Markdown cubre estructuras documentadas con tests golden, round-trip y adversariales.
- [ ] Tokens, provider payloads y errores sensibles no cruzan al browser ni logs.

## Verification

- `pnpm task:lint --task TASK-1449`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales + migration/discovery dry-run + `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, ADR, tasks reconciliadas, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1450`, `TASK-1451`.
