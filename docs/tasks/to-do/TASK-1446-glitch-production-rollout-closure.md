# TASK-1446 — Glitch Production Rollout and Operational Closure

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-1445, TASK-1447`
- Branch: `task/TASK-1446-glitch-production-rollout-closure`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Compara shadow runs, activa gradualmente la operación hasta draft privado, valida recovery/QA real y cierra documentación, ownership y seguimiento sin ampliar el gate de publicación humana.

## Why This Task Exists

Código, jobs y tests no prueban calidad editorial ni operación cross-system. El programa sólo termina cuando produce ediciones privadas confiables, recupera fallos y deja un manual usable.

## Goal

- Validar calidad editorial y runtime durante ventanas reales.
- Activar Daily y Weekly gradualmente con rollback probado.
- Entregar runbook, manual, documentación funcional, ownership y métricas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `private` es el máximo nivel autónomo del epic.
- Rollout se basa en evidencia editorial y runtime, no sólo tests verdes.
- Cualquier deuda externa mantiene el estado `code complete, rollout pendiente`.

## Normative Docs

- `docs/operations/glitch/GLITCH_AGENTIC_OPERATING_MODEL_V1.md`
- `docs/operations/glitch/GLITCH_SCHEDULER_RUNBOOK_V1.md`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1445`, `TASK-1447` y evidencias de TASK-1441–1444/TASK-1448.

### Blocks / Impacts

- Cierre de EPIC-031 y futuras decisiones de cockpit/auto-publish.

### Files owned

- `docs/operations/glitch/`
- `docs/documentation/public-site/glitch-agentic-editorial-pipeline.md`
- `docs/manual-de-uso/public-site/operar-glitch-semanal.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Runbook agentic genérico y QA/deep inspection Content Factory.

### Gap

- Falta evidencia longitudinal, manual Glitch y cierre operacional del programa.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `ops-worker + Greenhouse domain + Notion/WordPress externos`
- Future candidate home: `worker`
- Boundary: `rollout/config/docs; no primitive nueva`
- Server/browser split: `operación server-side; browser sólo QA anónima`
- Build impact: `none salvo flags/config de rollout`
- Extraction blocker: `dependencias Notion, WordPress/Kinsta, scheduler y revisión humana`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `runtime Glitch construido por TASK-1442–1445`
- Consumidores afectados: `equipo editorial, ops-worker, Notion, WordPress`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `ADR + commands/readers/adapters/orchestrator del epic`
- Contrato nuevo o modificado: `configuración de rollout y SLO/ownership operativo`
- Backward compatibility: `gated`
- Full API parity: `no se agrega camino manual paralelo; manual opera primitives existentes`

### Data model and invariants

- Entidades/tablas/views afectadas: `sin schema nuevo; runs/editions/mappings existentes`
- Invariantes: cero publish automático; Daily/Flash internos; Weekly o promoción Glitch Flash confirmada como únicos caminos a private draft; audit completo; fallo nunca se presenta como éxito.
- Tenant/space boundary: `Efeonce`
- Idempotency/concurrency: `validar mediante fault injection/replay`
- Audit/outbox/history: `verificar completitud y retención del historial`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow`
- Backfill plan: `none`
- Rollback path: `kill switch + pause Scheduler + write flags off`
- External coordination: `sign-off editorial, Kinsta/Notion checks y cooldown`

### Security and access

- Auth/access gate: `cron/service capabilities y publish humano separado`
- Sensitive data posture: `secrets redacted; contenido público`
- Error contract: `verificar errores canónicos del programa`
- Abuse/rate-limit posture: `validar budgets/rate caps/circuit breakers`

### Runtime evidence

- Local checks: `full regression/evals`
- DB/runtime checks: `run/audit/mapping reconciliation`
- Integration checks: `shadow y private draft en ventanas reales`
- Reliability signals/logs: `SLO de run, stale, failure, partial write y budget`
- Production verification sequence: `shadow -> assisted -> Daily writes -> Weekly private -> 2 ventanas verdes -> closure`

### Acceptance criteria additions

- [ ] Runtime evidence, rollback, access, idempotencia y señales se verifican en producción proporcionalmente.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Shadow and assisted rollout

- Comparar selección/redacción del agente con review humano y registrar métricas/findings.
- Probar replay, provider failure, write parcial, kill switch y restore.

### Slice 2 — Production enablement and closure

- Activar Daily y luego Weekly hasta draft privado tras gates.
- Completar manuales, ownership, SLO, docs de cierre y estado del epic.

## Out of Scope

- Auto-publish, UI cockpit, rediseño público y expansión multi-cliente.

## Detailed Spec

La scorecard combina factualidad, diversidad, novedad, POV, voz, estructura, enlaces y calidad Gutenberg. Ningún promedio compensa un finding bloqueante de verdad, duplicación o publicación no autorizada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Shadow quality -> fault/recovery -> Daily controlled -> Weekly controlled -> dos ventanas verdes -> cierre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Calidad editorial insuficiente | editorial | medium | human scorecard + rollback a asistido | eval/review regression |
| Fallo cross-system silencioso | integrations | medium | reconcile + signals | partial/stale run |
| Gate público se amplía | WordPress | low | invariant/private assertion | published without approval |

### Feature flags / cutover

Activación escalonada por modo y write; kill switch global probado antes de cada flip.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Daily | write flag off; continuar shadow | <10 min | sí |
| Weekly | pause scheduler + private write off | <10 min | sí |

### Production verification sequence

Shadow, assisted, Daily, Weekly private, dos ciclos verdes, documentación/closure; stop ante cualquier signal rojo.

### Out-of-band coordination required

Sign-off del operador para cada flip y para cada publicación pública individual.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Dos ventanas semanales consecutivas completan sin duplicados ni recovery manual no documentado.
- [ ] Scorecard editorial cumple umbrales aceptados y conserva revisión humana.
- [ ] Kill switch, replay, provider degradation y partial-write recovery tienen evidencia.
- [ ] Daily/Flash quedan en candidate staging; Weekly y `glitchFlash` confirmado llegan como máximo a WordPress `private`.
- [ ] Runbook, manual, documentación funcional, changelog, Handoff, project_context e EPIC quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1446`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- Evals Glitch, Postgres reconciliation, Scheduler/Notion/WP smokes y QA live desktop/mobile.

## Closing Protocol

- [ ] Lifecycle/carpeta/README y EPIC-031 sincronizados.
- [ ] QA release auditor + documentation governor ejecutados.
- [ ] Estado reportado honestamente si faltan ventanas/cooldown/sign-off.

## Follow-ups

- Cockpit o auto-publish sólo mediante ADR/task separados y evidencia posterior.
