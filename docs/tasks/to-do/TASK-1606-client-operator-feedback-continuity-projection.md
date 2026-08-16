# TASK-1606 — Client-Operator Feedback and Continuity Projection

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
- Backend impact: `reader|command|sync`
- Epic: `EPIC-038`
- Status real: `Inputs de assignment/capacity verificados; feedback y continuity projection no implementados`
- Rank: `EPIC-038-phase-5`
- Domain: `client|delivery|workforce|agency`
- Blocked by: `TASK-1602`, `TASK-1605`
- Branch: `task/TASK-1606-client-operator-feedback-continuity-projection`
- GitHub Issue: `none`

## Summary

Define feedback estructurado del operador del cliente y una proyección de continuidad de capacidad: owner, backup, memoria, riesgo, transición y comunicación.

## Why This Task Exists

El cliente interactúa con personas y necesita continuidad, pero el feedback no debe convertirse en una encuesta subjetiva ni exponer datos de colaboradores no relacionados.

## Goal

- Capturar señales job-related de calidad y experiencia del operador.
- Exponer continuidad por lane/capability, no prometer permanencia de una persona.
- Conectar feedback con memoria, backup y plan de transición.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/context/10_experiencia-cliente.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`, `TASK-1605`, Account/Delivery/Staff Augmentation existing primitives.

### Blocks / Impacts

- Client Experience y continuity agent.

### Files owned

- `src/lib/client/**`, `src/lib/workforce/**`, readers/commands y docs

## Current Repo State

### Already exists

- Assignment/capacity inputs de Workforce y Team Capacity, incluidos `member_capacity_economics`, son reutilizables
  para concentración y disponibilidad interna.
- El contrato de experiencia cliente exige transparencia sobre lo contratado, no acceso a roster o datos laborales
  ajenos.

### Gap / start blockers

- No existe command de feedback del operador, ciclo/corrección lineage, owner/backup/memory projection ni reader
  client-safe de continuidad. La capacidad interna no autoriza por sí sola publicar esos datos al cliente.
- Antes de schema se debe inventariar el owner/backup/memory source y aceptar con Client Experience, Delivery,
  Identity y Privacy qué evidencia es compartible por account/operator.
- Sigue bloqueada por `TASK-1602` y `TASK-1605`: el feedback puede ser evidencia contextual, no reemplaza outcome
  People ni habilita una acción adversa o reemplazo autónomo.

## Modular Placement Contract

- Topology impact: `api`
- Current home: Client Experience + Workforce/Delivery
- Future candidate home: `domain-package`
- Boundary: client-safe projection; feedback command separado de HR performance truth
- Server/browser split: authorization and redaction server-side; operator receives only scoped DTO
- Build impact: `none`
- Extraction blocker: tenant/account scope and existing assignment/backup data

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `reader|command`
- Invariantes: no personality/sympathy score; client sees scoped evidence; collaborator privacy; no auto adverse action
- Idempotency: one feedback submission per account/operator/cycle with correction lineage
- Audit/outbox: feedback audit and continuity signal when stale or incomplete
- Access: client operator entitlements only to own account; internal roles see broader governed projection
- Rollout: pilot account, shadow/read-only first

## Scope

### Slice 1 — Feedback contract

- Define dimensions: clarity, reliability, usefulness, handoff, collaboration and outcome evidence.

### Slice 2 — Continuity reader

- Project owner, backup, memory completeness, concentration and transition status.

## Out of Scope

- Public client score, performance compensation or autonomous replacement.

## Acceptance Criteria

- [ ] Feedback is structured, job-related and contestable.
- [ ] Client projection never exposes unrelated PII.
- [ ] Continuity reader identifies gaps and next actions with evidence.
- [ ] Human owner controls communication and replacement.

## Rollout Plan & Risk Matrix

Pilot → shadow → one account → staged expansion. Rollback: disable writes/read surface and preserve audit.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Feedback se convierte en simpatía | client/people | medium | rubric job-related y calibration | `client.feedback_quality_drift` |
| Continuity projection leaks roster | identity/client | low | tenant-safe reader tests | `client.continuity_projection_denied` |

## Verification & Definition of Done

- [ ] Account-scoped API smoke, privacy negatives y continuity synthetic case.
- [ ] Client/Collaborator experience docs y handoff actualizados.
