# TASK-1729 — Candidate Application Self-Service Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Backend impact: `migration|reader|command|api`
- Epic: `EPIC-011`
- Status real: `Diseno; postulante sin reader/commands autenticados de sus aplicaciones`
- Rank: `TBD`
- Domain: `hr|data|identity|platform`
- Blocked by: `TASK-1727, TASK-1718`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Entrega el agregado/API own-resource para listar postulaciones, publicar estado candidato, gestionar acciones,
versionar CV por aplicación, responder cuestionarios del rol, declarar expectativa económica y retirar/corregir
una postulación sin exponer stages, notas, scores o decisiones no comunicadas.

## Why This Task Exists

Hiring conserva la evidencia interna, pero no existe un contrato candidato autenticado. El CV actual no distingue
formalmente librería profesional de snapshot evaluado; `expected_rate` person/facet-level no representa múltiples
roles y las preguntas específicas aún no tienen agregado versionado.

## Goal

- Un reader candidate-safe para todas las postulaciones propias.
- Writes versionados/auditados por application y política de etapa/deadline.
- Estado público derivado de comunicaciones candidate-facing, no del stage interno crudo.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_REVIEW_PACKET_DELEGATED_ACCESS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/tasks/in-progress/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`

## Dependencies & Impact

### Depends on

- TASK-1727 session/subject; TASK-1718 exact application-document grain; TASK-1362 private assets.

### Blocks / Impacts

- Bloquea `TASK-1730`; impacta status emails, CV assets y future role questionnaires.

### Files owned

- `src/lib/hiring/candidate-self-service/**`
- `src/app/api/my/applications/**`
- `migrations/*candidate*application*self*`

## Current Repo State

### Already exists

- Aplicaciones person-first, lifecycle emails, CV privado por application y assessment tokenizado.

### Gap

- No hay proyección pública, ownership API, CV versions/supersedes, questionnaire/answers ni expectativa per-app.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/hiring y App Router Greenhouse`
- Future candidate home: `domain-package`
- Boundary: `CandidateApplicationSelfService reader/commands/API`
- Server/browser split: `policy, joins, assets y writes server-side; browser consume DTO positivo`
- Build impact: `none`
- Extraction blocker: `Hiring transaction, assets, notifications y capability registry compartidos`

## Backend/Data Contract

- Backend rigor: `backend-critical`; SSOT `hiring_application` + aggregates versionados subordinados.
- Contrato: list/get/status/actions/CV snapshot/questions/economic expectation/withdraw commands.
- Compatibilidad: aditiva y flags OFF; Application 360 interno no cambia.
- Invariantes: exact application ownership; status sólo comunicado; CV snapshot inmutable; no answer keys/internal
  notes/scores; expectation no es payroll ni auto-reject.
- Concurrency: aggregate version + idempotency key; withdrawal gana sobre writes incompatibles.
- Audit/outbox: action events y candidate-facing publication ledger sin contenido sensible.
- Migration: additive, sin backfill de consentimiento/respuestas/salario inventado.
- Access: capabilities `hiring.self.*`, rate limit y 404 anti-oracle.
- Full API parity: `/my` y futuros hosts consumen primitives; no reglas en route/UI.
- Evidence: dos aplicaciones de una persona, dos CV, foreign ID, closed edit, stale version y decision-not-published.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Crear DTO y reader paginado candidate-safe con acciones/deadlines.
2. Materializar status público desde eventos candidate-facing.
3. Versionar CV profesional→snapshot por application sin reanclar/reescribir assets históricos.
4. Crear questionnaires versionados, answers/corrections y economic expectation per-app.
5. Crear withdraw/update commands, audit/outbox, errors/signals y Product API.

## Out of Scope

- UI, referencias profesionales V1, assessment answer keys, ranking, agenda o datos legales/onboarding.

## Detailed Spec

El contrato publica DTOs positivos y comandos con aggregate version. `ApplicationCvSnapshot` referencia la versión/asset exactos sin transferir ownership histórico; questionnaires conservan definition version y answers/corrections; public status depende del ledger candidate-facing.

## Rollout Plan & Risk Matrix

- Orden: schema OFF → readers synthetic → writes staging → emails/projection reconciliation → UI consumer.
- Flags: `CANDIDATE_APPLICATION_SELF_SERVICE_READ_ENABLED` y `WRITE_ENABLED`, separados.
- Riesgos: decisión prematura, cross-application CV y overwrite histórico; mitigados con publication ledger, exact join
  y immutable snapshots.
- Rollback: writes/readers OFF; preservar events/versions y mantener apply/Hiring Desk existentes.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Una persona con dos aplicaciones ve packets/estados/CV/expectativas separados.
- [ ] Una decisión interna no aparece hasta que el evento candidate-facing la publique.
- [ ] Actualizar CV/perfil no reescribe una postulación cerrada.
- [ ] Foreign ID, stage no editable, stale version y replay fallan con contrato seguro.

## Verification

- `pnpm task:lint --task TASK-1729`
- `pnpm lint && pnpm tsc --noEmit && pnpm test`
- Migration + fixtures two-app/two-CV + smoke autenticado staging.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog, arquitectura y manual sincronizados.
- [ ] Negative tests y rollback read/write independientes verificados.

## Follow-ups

- `TASK-1730`; referencias/recomendaciones avanzadas quedan post-MVP.
