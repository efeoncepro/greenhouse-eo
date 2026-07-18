# TASK-1442 — Glitch Domain, State and API Foundation

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
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1440`
- Branch: `task/TASK-1442-glitch-domain-api-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el contrato server-side canónico para candidatas, ediciones, runs, evidencia, estados y mappings externos de Glitch, con commands/readers consumibles por skill, worker, CLI y futuros adapters.

## Why This Task Exists

Markdown y páginas externas no pueden garantizar dedupe, locking, historial, reintentos, idempotencia ni Full API Parity para un workflow agéntico recurrente.

## Goal

- Definir y migrar el modelo mínimo de dominio Glitch.
- Exponer commands/readers gobernados sin acoplar consumers a tablas.
- Probar invariantes de numeración, evidencia, concurrencia y audit.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`

Reglas obligatorias:

- Source of truth Postgres; Notion/WordPress son mappings externos.
- Consumers usan commands/readers, nunca tablas directas.
- Nada en browser recibe secretos o payloads internos de evidencia.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/glitch/GLITCH_AGENTIC_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1440`; retrospectiva de `TASK-1441` como input recomendado, no bloqueo duro.

### Blocks / Impacts

- `TASK-1444`, `TASK-1445` y cualquier UI/Nexa futura.

### Files owned

- `src/lib/content/glitch/`
- `src/types/glitch.ts`
- `scripts/migrations/`
- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`

## Current Repo State

### Already exists

- Patterns Postgres, API Platform, audit/reliability y Content Factory reutilizables.

### Gap

- No existe modelo ni primitive Glitch canónico.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/content/glitch/ dentro del monolito vigente`
- Future candidate home: `domain-package`
- Boundary: `commands/readers/types Glitch consumidos por worker, adapters y agentes`
- Server/browser split: `DB, evidence y providers server-only; DTO público separado si nace consumer browser`
- Build impact: `migración SQL y tests de dominio; sin SDK pesado`
- Extraction blocker: `transacción Postgres compartida y catálogo de capabilities/audit`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `nuevo dominio Postgres Glitch bajo nombre físico decidido en discovery`
- Consumidores afectados: `API, worker, skill runner, CLI, adapters Notion/WordPress`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- Contrato nuevo o modificado: `GlitchCandidate/Edition/Run + commands/readers versionados`
- Backward compatibility: `compatible`
- Full API parity: `toda acción mutante pasa por command gobernado y todo consumer lee DTO, no tabla`

### Data model and invariants

- Entidades/tablas/views afectadas: `nombres físicos a decidir en plan y congelar en ADR antes de migrar`
- Invariantes: edición numerada única; `glitchFlash` no consume número; Daily/Flash no producen publicación sin promoción confirmada; source/claim trazable; run state monotónico; mapping externo único por provider.
- Tenant/space boundary: `propiedad Efeonce explícita; diseño extraction-ready para scope futuro sin simular multi-tenant`
- Idempotency/concurrency: `keys por mode+window y edition number; advisory/row lock; replays no duplican writes`
- Audit/outbox/history: `historial append-only de runs/transiciones y eventos para adapters`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: `dry-run del corpus #12–#15 y candidatas; apply allowlist sólo tras revisión`
- Rollback path: `flag off + consumers apagados; preservar tablas aditivas hasta ventana de retiro`
- External coordination: `ninguna para schema; adapters se activan después`

### Security and access

- Auth/access gate: `capabilities server-side para reads/writes operativos`
- Sensitive data posture: `contenido público y metadata operativa; secretos fuera del modelo`
- Error contract: `errores canónicos conflict/not_found/invalid_transition/evidence_incomplete; captureWithDomain`
- Abuse/rate-limit posture: `quotas por mode/window y replay guard`

### Runtime evidence

- Local checks: `unit/contract tests + migration dry-run`
- DB/runtime checks: `pnpm pg:connect + queries de invariantes`
- Integration checks: `fixture #15 y shadow #16 sin writes externos`
- Reliability signals/logs: `run conflict, invalid transition, evidence incomplete, stale scheduled run`
- Production verification sequence: `migrate staging -> seed fixtures dry-run -> commands/readers smoke -> flag OFF prod -> migrate prod -> read-only verify`

### Acceptance criteria additions

- [ ] Source of truth, contratos, consumidores e invariantes usan objetos reales tras discovery.
- [ ] Boundary, idempotencia, migration/rollback, errores y señales tienen tests.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contract and migration

- Congelar nombres/estados/versiones y crear migración aditiva.
- Implementar stores internos con invariantes transaccionales.

### Slice 2 — Commands, readers and evidence

- Exponer primitives versionadas y DTOs.
- Agregar fixtures/backfill dry-run, audit y signals.

## Out of Scope

- Notion, WordPress, cron, prompts/skill y UI.

## Detailed Spec

El plan debe congelar nombres físicos, estados y schemas versionados antes de la migración. La API no expone tablas ni secretos y separa DTO operativo de cualquier proyección pública futura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- ADR aceptado -> contrato -> migration staging -> stores -> commands/readers -> audit/signals -> prod flag OFF.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar edición/run | DB | medium | unique keys + locks | run conflict |
| Backfill interpreta historia como vivo | migration | medium | dry-run allowlist | unexpected active state |

### Feature flags / cutover

Flag Glitch runtime default OFF; nombre final se define junto al catálogo existente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Migration | flag off; conservar schema aditivo | <10 min | sí |
| Commands/readers | revert PR | <30 min | sí |

### Production verification sequence

Staging completo, prod con flag OFF, queries de invariantes, fixture read-only y monitor 24h antes de adapters.

### Out-of-band coordination required

No requiere coordinación externa: esta task sólo aplica schema/primitives con flags OFF; las credenciales y writes Notion/WordPress pertenecen a TASK-1444.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Modelo y state machine están versionados y migrados aditivamente.
- [ ] `weeklyEdition` y `glitchFlash` no compiten por numeración y Daily/Flash no abren drafts por sí solos.
- [ ] Commands/readers cumplen Full API Parity e idempotencia concurrente.
- [ ] Backfill histórico es dry-run/allowlist y no activa runs.
- [ ] Audit, errores y señales tienen pruebas y evidencia Postgres.

## Verification

- `pnpm task:lint --task TASK-1442`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales + migration dry-run + `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, ADR runtime contract, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1444`, `TASK-1445`.
