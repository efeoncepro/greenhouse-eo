# TASK-1605 — Quality-of-Hire Outcomes and Selection-Failure Taxonomy

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
- Backend impact: `db|reader|command`
- Epic: `EPIC-038`
- Status real: `Baseline de lineage/validity verificado; outcome 30/60/90 y taxonomy siguen en diseño`
- Rank: `EPIC-038-phase-5`
- Domain: `hiring|hr|workforce|data`
- Blocked by: `TASK-1602`, `TASK-1603`
- Branch: `task/TASK-1605-quality-of-hire-outcome-selection-failure`
- GitHub Issue: `none`

## Summary

Conecta HiringHandoff con onboarding, 30/60/90, feedback y performance para distinguir `validated_hire`, `needs_support`, `role_mismatch`, `selection_failure` e `insufficient_evidence`.

## Why This Task Exists

Las salidas por falta de capacidad se observan después, pero no retroalimentan de forma estructurada el template, la decisión ni el proceso de selección.

## Goal

- Definir outcome y selección-failure taxonomy job-related.
- Capturar evidencia post-hire sin reescribir assessment histórico.
- Alimentar validity/learning por template, competencia, cuenta y contexto.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1364-assessment-validity-feedback-loop.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`, `TASK-1603`, `HiringHandoff`, onboarding y performance existentes.

### Blocks / Impacts

- `TASK-1609` validity/evals y `TASK-1610` read models.

### Files owned

- `src/lib/hiring/**`
- `src/lib/workforce/**`
- `migrations/**`
- validity readers y documentation HR

## Current Repo State

### Already exists

- `HiringHandoff`, onboarding/activation y el mapping durable
  `greenhouse_hr.hiring_activation_request` que enlaza exactamente application↔member.
- El reader `TASK-1364` de validity: usa ese mapping, toma ICO como outcome primario y `eval_summaries` como
  secundario, conserva el score al decidir y degrada a `insufficient_sample` cuando corresponde.

### Gap / start blockers

- No existe un contrato 30/60/90, taxonomía de selection failure, proyección quality-of-hire ni writer/audit de
  outcomes. No se debe inferirlos del estado de onboarding, ICO o una salida.
- El join debe usar activation request, no `identity_profile_id`, que es ambiguo con múltiples aplicaciones.
- Sigue bloqueada por `TASK-1602` y `TASK-1603` (que a su vez consume la policy aún pendiente de `TASK-1719`),
  además de definir Privacy/People la evidencia mínima y las fuentes autorizadas por período.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: Hiring + Workforce/People domains
- Future candidate home: `domain-package`
- Boundary: outcome projection consume canonical handoff/onboarding/performance; no overwrite of source records
- Server/browser split: server-side joins and allowlisted DTOs; no raw performance/PII in browser
- Build impact: `none`
- Extraction blocker: cross-domain mapping application↔member and privacy policy

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `db|reader|command`
- Source of truth: HiringHandoff, onboarding, performance/ICO y existing validity reader
- Invariantes: histórico assessment immutable; outcome no auto-reject; privacy/retention; mapping durable
- Idempotency: outcome events deduped by handoff/application and review period
- Audit/outbox: append-only outcome history and reason codes
- Migration posture: additive projection; backfill dry-run antes de apply
- Rollback: flag/read-only projection; no delete of historical evidence

## Scope

### Slice 1 — Taxonomy and outcome contract

- Define reasons, evidence minimum, reviewer and period.

### Slice 2 — 30/60/90 linkage and validity

- Materialize outcome projection and connect to existing validity reader without changing score.

## Out of Scope

- Automatic termination, compensation or performance ranking.

## Acceptance Criteria

- [ ] Selection-failure reasons distinguish capability, role mismatch, support and evidence gaps.
- [ ] 30/60/90 evidence links to application/handoff/member safely.
- [ ] Historical assessment snapshot remains intact.
- [ ] Validity reader can segment by template and competency.

## Rollout Plan & Risk Matrix

Taxonomy → shadow projection → allowlisted historical sample → live 30/60/90. Rollback: projection OFF, preserve append-only evidence.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Outcome atribuido a la selección sin evidencia | people/hiring | medium | evidence completeness y insufficient_evidence | `hiring.quality_outcome_insufficient_evidence` |
| Exposición de feedback sensible | identity/people | medium | field-level access y redaction | `people.feedback_access_denied` |

## Verification & Definition of Done

- [ ] Live synthetic journey decision→handoff→30/60/90→outcome.
- [ ] Privacy/access tests y validity regression.
- [ ] Manual y handoff actualizados.
