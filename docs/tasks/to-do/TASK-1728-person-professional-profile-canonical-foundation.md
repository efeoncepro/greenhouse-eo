# TASK-1728 — Person-Scoped Professional Profile Canonical Foundation

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
- Backend impact: `migration|reader|command|sync`
- Epic: `EPIC-011`
- Status real: `Diseno; datos profesionales siguen mayoritariamente member-scoped`
- Rank: `TBD`
- Domain: `hr|data|identity|agency`
- Blocked by: `TASK-1727`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Extrae skills, herramientas, idiomas, certificaciones, links, bio, portfolio, evidencia y CV vigente hacia un
perfil profesional person-scoped, con provenance/versionado/verificación. Migra los datos `member_*` sin copy-on-
hire y mantiene proyecciones compatibles para staffing y `/my` legacy durante el cutover.

## Why This Task Exists

Los CRUD actuales enriquecen al `member`, por lo que no pueden existir antes de la contratación. Crear equivalentes
candidate-only y copiarlos al seleccionar reproduce drift, pierde historia y deja dos SSOT.

## Goal

- Un perfil profesional reutilizable antes y después de la activación laboral.
- Migración expand/contract con reconciliación y rollback.
- Provenance y verificación que no sobrevivan indebidamente a una edición.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1727` subject/ownership contract.
- CRUD/catalogs actuales de `member_skills`, `member_tools`, `member_languages`, `member_certifications` y links.

### Blocks / Impacts

- Bloquea `TASK-1730`; impacta Staffing, People 360 y `/my/profile`.

### Files owned

- `src/lib/person-professional-profile/**`
- `src/app/api/person/me/professional-profile/**`
- `migrations/*person*professional*`
- adapters legacy estrictamente necesarios en `src/lib/agency/**` y `src/lib/hr-core/**`

## Current Repo State

### Already exists

- Catálogos y CRUD ricos, evidencia/assets y enlace `member.identity_profile_id`.

### Gap

- Owner `member_id`, updates/deletes current-state, CV profesional versionado inexistente y drift de links.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib dentro del monolito Greenhouse`
- Future candidate home: `domain-package`
- Boundary: `ProfessionalProfile readers/commands y projections legacy`
- Server/browser split: `DB/assets/provenance server-side; browser sólo DTO allowlisted`
- Build impact: `none`
- Extraction blocker: `catálogos, assets, staffing readers y transacción PostgreSQL compartidos`

## Backend/Data Contract

- Backend rigor: `backend-critical`; impacto `migration|reader|command|sync`.
- SSOT: agregado profesional por `identity_profile_id`; consumidores `/my`, Hiring, Staffing y People 360.
- Compatibilidad: aditiva/gated; legacy readers conservan fallback hasta paridad.
- Invariantes: cero duplicado por faceta; edición supersede/invalida verificación; assets conservan ownership/history;
  datos workforce no migran al perfil profesional.
- Concurrency: versiones/optimistic lock e idempotency por command; backfill allowlisted y reconciliable.
- Audit: provenance/verification append-only; current state reconstruible.
- Rollout: expand → dry-run → backfill batch → shadow compare → reader cutover → writer cutover.
- Access: `person.self.professional_profile.*` own y capabilities internas existentes por projection.
- Evidence: migration verify, counts/hash parity, duplicate/conflict report, shadow drift y rollback rehearsal.
- Full API parity: UI y futuros consumers usan el mismo reader/commands; ninguna escritura vive en componentes.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Congelar matriz de campos person-scoped versus workforce-scoped.
2. Crear schema, commands, readers, history/provenance y CV version library/current pointer.
3. Backfill dry-run/apply por identidad con reporte de conflictos y anti-wipe.
4. Adaptar consumidores legacy mediante projection/fallback y shadow comparison.
5. Cortar writes por flags sólo después de paridad.

## Out of Scope

- CV snapshot de una aplicación, preguntas del rol, estado de postulación, UI o datos legales/payroll.

## Detailed Spec

La implementación define entidades versionadas por `identity_profile_id`, provenance/verification events y adapters hacia catálogos existentes. El backfill nunca elige silenciosamente entre valores conflictivos: produce reporte, conserva las fuentes y exige resolución/policy antes del writer cutover.

## Rollout Plan & Risk Matrix

- Riesgos: pérdida de verificación, duplicados y drift Staffing. Mitigación: append-only, reconciler, shadow y flags
  independientes `PERSON_PROFESSIONAL_PROFILE_READ_ENABLED`/`WRITE_ENABLED`.
- Rollback: readers a legacy, writers nuevos OFF; conservar schema/history y no ejecutar copy inversa.
- Producción: cohortes internas por lote, parity report cero bloqueantes, luego candidatos.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] La misma identidad lee el mismo perfil antes/después de obtener `memberId`.
- [ ] Backfill preserva datos/evidencia y reporta conflictos sin sobrescribirlos.
- [ ] Editar evidencia verificada genera nueva versión/estado, no confianza heredada.
- [ ] Staffing y `/my` legacy mantienen paridad durante rollback.

## Verification

- `pnpm task:lint --task TASK-1728`
- `pnpm lint && pnpm tsc --noEmit && pnpm test`
- Dry-run/backfill/reconcile y smoke PG de staging.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog y arquitectura sincronizados.
- [ ] Reporte de reconciliación y rollback quedan versionados.

## Follow-ups

- `TASK-1730`, `TASK-1732`.
