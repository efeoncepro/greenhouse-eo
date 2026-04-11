# TASK-314 — Talent Profile Enterprise Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-314-talent-profile-enterprise-program`
- Legacy ID: `programa follow-on de TASK-157 y TASK-313`
- GitHub Issue: `none`

## Delta 2026-04-11

- TASK-313 completada — ahora existe: 3 migraciones (social links, visibility en member_skills, member_certifications), servicio CRUD de certificaciones, 10 API routes (self-service + admin), tabs SkillsCertificationsTab y ProfessionalLinksCard en `/my/profile` y `/admin/users/[id]`
- Impacto: la fundación del programa (Slice 1) ya tiene su primera child task cerrada; TASK-315 y TASK-316 pueden avanzar sin blocker de TASK-313

## Summary

Coordinar la evolución del perfil profesional de Greenhouse desde una base de `skills y certificaciones` hacia una capability enterprise de talento: taxonomía canónica, verificación `Verificado por Efeonce`, discovery interno, perfiles cliente-safe, reputación/evidencia y analítica operativa.

## Why This Task Exists

`TASK-157` dejó el motor de staffing y `TASK-313` define el perfil profesional usable, pero el objetivo final es más amplio: una capa de talento confiable, verificable, filtrable y reusable hacia operaciones, staffing y surfaces cliente. Sin un programa coordinado, esos slices se implementarían desalineados y con taxonomías o reglas de visibilidad incompatibles.

## Goal

- Coordinar la fundación y los follow-ons del perfil profesional enterprise
- Alinear trust, discovery, client-safe surfacing y ops governance bajo una sola semántica
- Evitar duplicación entre HR, Agency, Identity y futuras surfaces cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- La identidad profesional sigue siendo `person/member`-centric; no crear un objeto paralelo de talento desligado de persona.
- `Verificado por Efeonce` es señal de confianza operativa y client-safe; no se trata como decoración visual sin workflow de respaldo.
- Las child tasks deben reutilizar foundations ya existentes (`TASK-157`, `TASK-313`, assets privados, `/my/profile`, `/admin/users/[id]`).

## Normative Docs

- `docs/tasks/complete/TASK-313-skills-certifications-profile-crud.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-313-skills-certifications-profile-crud.md`

### Blocks / Impacts

- estrategia de talento verificable
- staffing interno
- futuras vistas cliente de equipo/perfiles
- gobernanza de mantenimiento del perfil profesional

### Files owned

- `docs/tasks/complete/TASK-313-skills-certifications-profile-crud.md`
- `docs/tasks/to-do/TASK-315-talent-taxonomy-canonical-model.md`
- `docs/tasks/to-do/TASK-316-talent-trust-ops-verification-governance.md`
- `docs/tasks/to-do/TASK-317-internal-talent-discovery-search-ranking.md`
- `docs/tasks/to-do/TASK-318-client-safe-verified-talent-profiles.md`
- `docs/tasks/to-do/TASK-319-reputation-evidence-endorsements.md`
- `docs/tasks/to-do/TASK-320-talent-ops-analytics-maintenance-automation.md`

## Current Repo State

### Already exists

- `TASK-157` cerró skills + staffing engine
- `TASK-313` define el primer corte enterprise de perfil profesional usable
- existen surfaces reales para `Mi perfil`, `Admin > Usuario` y assets privados

### Gap

- no existe roadmap canónico ni orden de ejecución para llegar a una capability tipo marketplace enterprise

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fundaciones del programa

- `TASK-313` — perfil profesional usable con CRUD y certificados embebidos
- `TASK-315` — taxonomía y modelo canónico
- `TASK-316` — trust ops y verificación

### Slice 2 — Superficies de valor

- `TASK-317` — discovery interno, búsqueda y ranking
- `TASK-318` — perfiles cliente-safe verificados
- `TASK-319` — reputación, evidencia y endorsements

### Slice 3 — Operación escalable

- `TASK-320` — analítica, completitud, expiración y mantenimiento automatizado

## Out of Scope

- implementación directa de código en esta umbrella
- redefinir `TASK-313` o `TASK-157`

## Detailed Spec

Orden recomendado:

1. `TASK-313`
2. `TASK-315`
3. `TASK-316`
4. `TASK-317`
5. `TASK-318`
6. `TASK-319`
7. `TASK-320`

Dependencias lógicas:

- `313 -> 315 -> 316`
- `315 + 316 -> 317`
- `316 -> 318`
- `315 + 316 -> 319`
- `313 + 316 + 317 + 319 -> 320`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explícita de tasks para taxonomía, trust, discovery, perfil cliente, reputación y ops
- [ ] Cada child task tiene dependencia y objetivo distinguible
- [ ] La umbrella no duplica el alcance de `TASK-313`

## Verification

- Revisión manual de consistencia documental
- Verificar que `TASK-313` a `TASK-320` existen y están indexadas correctamente

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- re-priorizar slices según feedback del negocio — `TASK-313` ya completada (2026-04-11), siguiente: `TASK-315`

## Open Questions

- si el orden `318` vs `319` debe invertirse según el peso que el negocio quiera dar a evidencia vs surfacing cliente
