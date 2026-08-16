# TASK-1732 — Identity-First People 360 Hiring Journey Reader

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader|api`
- Epic: `EPIC-011`
- Status real: `Diseno; journey existe pero entry path/member linkage no cubre historia pre-member completa`
- Rank: `TBD`
- Domain: `hr|data|identity`
- Blocked by: `TASK-1728, TASK-1731`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Generaliza People 360 para resolver el journey por `identity_profile_id` antes y después de existir `member`, con
todas las postulaciones/handoffs/activaciones paginadas y el perfil profesional/provenance autorizado. Elimina la
dependencia conceptual de un `candidate_facet.member_id` mutable como único puente.

## Why This Task Exists

El reader Hiring longitudinal existe, pero algunos entry paths de People 360 retornan antes de consultar Hiring si
no encuentran `member`; la UI actual además resume sólo el registro reciente. Esto oculta la fase candidata que se
quiere enriquecer desde `/my`.

## Goal

- Reader identity-first disponible pre-member y post-member.
- DTOs separados para operador y self-service, con minimización.
- Historia completa paginada sin duplicar write model.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`

## Normative Docs

- `docs/tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`

## Dependencies & Impact

### Depends on

- TASK-1728 profile reader y TASK-1731 authoritative activation linkage.

### Blocks / Impacts

- Bloquea `TASK-1733`; impacta People detail y Person 360 APIs.

### Files owned

- `src/lib/person-360/**`
- `src/lib/hiring/handoff/journey.ts` o sucesor canónico
- APIs/read DTOs People 360 relacionados

## Current Repo State

### Already exists

- `getHiringJourneyForPerson` y datos de applications/handoffs.

### Gap

- Entry member-first, link potencialmente drifted y consumo UI incompleto.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/person-360 y src/lib/hiring`
- Future candidate home: `domain-package`
- Boundary: `readPersonLongitudinalJourney(identity subject, viewer subject)`
- Server/browser split: `joins/redaction server-side; DTO bounded al browser`
- Build impact: `none`
- Extraction blocker: `joins cross-schema Identity/Hiring/HRIS`

## Backend/Data Contract

- Backend rigor: `backend-standard`; impacto reader/api; sin nuevo write SSOT.
- Invariantes: identity-first, paginación estable, viewer-specific allowlist, ausencia≠error, no raw notes/answer keys.
- Tenant/access: subject de sesión + capability interna o own-resource; no caller-supplied identity sin autorización.
- Compatibilidad: additive reader; shadow compare con People 360 actual.
- Migration: `none` salvo view/projection justificada; preferir composición server-side.
- Evidence: persona candidate-only, member-only, ambos, múltiples apps, rehire y foreign viewer deny.
- Full API parity: UI/operator/self-service usan adapters del mismo reader canónico.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Resolver identity-first y eliminar early return member-only.
2. Componer profile/candidate/applications/handoffs/activations/member relationships con cursores.
3. Definir DTO operador y DTO self-service allowlisted.
4. Shadow compare, performance budget, negative tests y signals.

## Out of Scope

- Writes, UI, duplicar historia en una tabla 360 o exponer notas/scores al candidato.

## Detailed Spec

El reader recibe subject persona y viewer autorizado, pagina por cursor estable y compone Identity/Hiring/HRIS sin escribir una tabla 360 paralela. Los DTOs operador y self-service se construyen mediante allowlists independientes sobre hechos comunes.

## Rollout Plan & Risk Matrix

- Reader nuevo shadow → APIs internas → TASK-1733; flag `PERSON_360_LONGITUDINAL_JOURNEY_ENABLED`.
- Riesgos: PII leak/query cost/link drift; mitigación DTOs positivos, indexes/EXPLAIN y linkage TASK-1731.
- Rollback: reader flag OFF y volver al reader actual sin borrar historia.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Candidate-only devuelve journey válido sin member.
- [ ] Candidate+member conserva todas las aplicaciones y relación laboral sin duplicar persona.
- [ ] DTO candidato e interno tienen allowlists y denials distintos probados.
- [ ] Paginación/performance y error/degraded son honestos.

## Verification

- `pnpm task:lint --task TASK-1732`
- lint/typecheck/tests + EXPLAIN/smoke PG con cohortes representativas.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog y arquitectura sincronizados.
- [ ] TASK-1733 recibe contrato versionado y fixtures reales/sintéticos seguros.

## Follow-ups

- `TASK-1733`.
