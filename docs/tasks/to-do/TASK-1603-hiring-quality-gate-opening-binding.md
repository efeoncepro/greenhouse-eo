# TASK-1603 — Hiring Quality Gate over Opening Assessment Policy

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command|reader`
- Epic: `EPIC-038`
- Status real: `Diseño`
- Rank: `EPIC-038-phase-1`
- Domain: `hiring|hr|data`
- Blocked by: `TASK-1602, TASK-1719`
- Branch: `task/TASK-1603-hiring-quality-gate-opening-binding`
- GitHub Issue: `none`

## Summary

Extiende Hiring para que un opening crítico derive y haga exigible su estándar, competencias y evidencia mínima
antes de una decisión humana. Consume la policy opening→assessment template canónica de `TASK-1719`; no crea
otro binding ni automatiza la asignación.

## Why This Task Exists

Aunque `TASK-1719` vincule opening y template y pueda asignar el test, la decisión todavía puede avanzar con
evidencia incompleta. Esta task convierte esa policy operacional en un quality gate determinístico y auditable,
sin apropiarse del lifecycle de asignación.

## Goal

- Crear un quality gate derivado de `TalentDemand`, `HiringOpening`, `HiringApplication`, policy `TASK-1719` y
  assessment existente.
- Bloquear o enrutar como `evidence_incomplete` sin auto-rechazar ni auto-contratar.
- Mostrar override humano explícito, motivo, actor y evidencia faltante.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/complete/TASK-1363-assessment-taking-review-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`, `TASK-1719`; `TalentDemand`, `HiringOpening`, `HiringApplication`, assessment templates y
  `HiringHandoff`.

### Blocks / Impacts

- `TASK-1604`, `TASK-1605`, `TASK-1610`.

### Files owned

- `src/lib/hiring/**`
- `src/app/api/hiring/**`
- `migrations/**`
- tests y docs de Hiring Quality Assurance

## Current Repo State

### Already exists

- Assessment engine, templates, instances y decisión humana. `TASK-1719` es dueña del binding/policy y la
  asignación manual/automática.
- Vacancy publication operator canónico.

### Gap

- Falta el reader de completeness por rol/opening/application, reason codes y enforcement/override de decisión.
  El binding operativo faltante queda resuelto upstream por `TASK-1719`.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/hiring` y schema `greenhouse_hiring`
- Future candidate home: `domain-package`
- Boundary: reader/command de Hiring consumido por desk, Nexa y quality gate
- Server/browser split: DB, stores, rúbricas y capabilities server-only; browser recibe DTO browser-safe
- Build impact: `none`
- Extraction blocker: transacción con HiringApplication/decision y capabilities existentes

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `command|reader`
- Source of truth afectado: `HiringOpening`, `HiringApplication`, assessment templates/instances
- Consumidores afectados: `Hiring Desk`, API, Nexa y handoff
- Runtime target: `local|staging|production`
- Contrato existente: `src/lib/hiring/assessment/**`, `HiringHandoff`, decision commands
- Invariantes: no auto-decision; score advisory; tenant/client boundary; answer keys/rúbricas nunca salen al candidato
- Idempotency/concurrency: gate derivado/read-only; override humano idempotente y auditado
- Audit/outbox/history: decision override append-only y evento de quality gate cuando aplique
- Migration posture: additive; no duplicar application ni assessment
- Rollback: flag off/read-only projection; no borrar evidencia histórica
- Auth/access: capabilities Hiring internas, nunca `client_*`
- Sensitive data: candidate evidence/PII allowlist y redacción
- Runtime evidence: unit, live DB smoke, API parity y decision negative tests

## Scope

### Slice 1 — Gate contract and reader

- Consumir la policy versionada de `TASK-1719`; definir requisitos por role/template y completeness determinística.
- Exponer reason codes, missing evidence, overrideability y freshness.

### Slice 2 — Decision/handoff integration

- Enforcear el gate en el command de decisión/handoff sin auto-rechazo.
- Registrar override y readback.

## Out of Scope

- Agent autonomy, public badge, economics gate y cockpit UI.

## Acceptance Criteria

- [ ] Opening crítico declara template y evidencia mínima.
- [ ] El template/binding se lee desde `TASK-1719`; no existe tabla, writer ni policy paralela en esta task.
- [ ] Application incompleta muestra razones estables y no puede presentarse como verificada.
- [ ] Override humano queda auditado y reconstruible.
- [ ] Tests prueban no auto-hire/no auto-reject y no leakage.

## Delta 2026-08-15 — Binding operativo extraído a EPIC-011

- `TASK-1719` pasa a ser dueña de la policy opening→template, assignment manual/por etapa, cancelación y
  comunicación. Esta task consume ese primitive y conserva ownership exclusivo de completeness, missing evidence,
  enforcement de decisión/handoff y override humano.
- Razón: la asignación básica es Hiring/EPIC-011 y no debe quedar bloqueada por el contrato de claims de
  `TASK-1602`; dos bindings producirían drift de template/policy.

## Rollout Plan & Risk Matrix

Orden: reader → shadow/read-only → human gate en staging → production. Flag OFF/read-only durante shadow; rollback apagando enforcement.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Bloqueo de hiring legítimo | hiring | medium | shadow, override humano y reason codes | `hiring.quality_gate_blocked` |
| Leakage de rúbrica | public assessment | low | projection allowlist + test anti-leak | `hiring.assessment_sensitive_projection` |

## Verification & Definition of Done

- [ ] Migration/readers/commands y capability coverage verificados.
- [ ] Smoke contra application real sintética y caso incompleto.
- [ ] `pnpm qa:gates --changed` y docs closure verdes.
