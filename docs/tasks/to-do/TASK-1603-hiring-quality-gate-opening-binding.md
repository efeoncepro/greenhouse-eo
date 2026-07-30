# TASK-1603 — Hiring Quality Gate and Opening/Template Binding

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
- Blocked by: `TASK-1602`
- Branch: `task/TASK-1603-hiring-quality-gate-opening-binding`
- GitHub Issue: `none`

## Summary

Extiende Hiring para que un opening crítico declare su estándar, competencias, assessment template y evidencia mínima antes de una decisión humana.

## Why This Task Exists

Hoy la plantilla puede existir sin quedar obligatoriamente vinculada a la demanda/opening y la decisión puede avanzar con evidencia incompleta. Eso permite repetir el fallo de selección observado en Berel.

## Goal

- Crear un quality gate derivado de `TalentDemand`, `HiringOpening`, `HiringApplication` y assessment existente.
- Bloquear o enrutar como `evidence_incomplete` sin auto-rechazar ni auto-contratar.
- Mostrar override humano explícito, motivo, actor y evidencia faltante.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/complete/TASK-1363-assessment-taking-review-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-1602`; `TalentDemand`, `HiringOpening`, `HiringApplication`, assessment templates y `HiringHandoff`.

### Blocks / Impacts

- `TASK-1604`, `TASK-1605`, `TASK-1610`.

### Files owned

- `src/lib/hiring/**`
- `src/app/api/hiring/**`
- `migrations/**`
- tests y docs de Hiring Quality Assurance

## Current Repo State

### Already exists

- Assessment engine, templates, instances y decisión humana.
- Vacancy publication operator canónico.

### Gap

- Falta el binding obligatorio/recomendado y el reader de completeness por rol/opening/application.

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

- Definir requisitos por role/template y completeness determinística.
- Exponer reason codes, missing evidence, overrideability y freshness.

### Slice 2 — Decision/handoff integration

- Enforcear el gate en el command de decisión/handoff sin auto-rechazo.
- Registrar override y readback.

## Out of Scope

- Agent autonomy, public badge, economics gate y cockpit UI.

## Acceptance Criteria

- [ ] Opening crítico declara template y evidencia mínima.
- [ ] Application incompleta muestra razones estables y no puede presentarse como verificada.
- [ ] Override humano queda auditado y reconstruible.
- [ ] Tests prueban no auto-hire/no auto-reject y no leakage.

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
