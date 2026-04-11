# TASK-357 — Assigned Team Canonical Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-357-assigned-team-canonical-program`
- Legacy ID: `follow-on de GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Coordinar la materializacion completa de `Equipo asignado` como capability enterprise cliente-facing de Greenhouse. Esta umbrella ordena semantic layer, permisos, UI principal, dossier individual, señales de capacidad, alertas y consumers cross-surface.

## Why This Task Exists

La arquitectura ya fijo que `Equipo asignado` no es un roster simple ni una pagina aislada de `/equipo`, sino una lens enterprise construida sobre `Organization / Space + assignments + client-safe profiles + capacity + health`. Hoy el repo tiene foundations parciales, pero no existe un programa amarrado que evite implementar la surface en pedazos inconexos.

## Goal

- Secuenciar la bajada a runtime de `Assigned Team` sin duplicar dominios ni lectores
- Separar foundation, policy, UI shared, módulo principal y consumers downstream
- Dejar un programa escalable para clientes enterprise con surfaces multi-superficie

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- `Equipo asignado` debe consumir verdad existente; no puede crear un dominio transaccional paralelo
- todo perfil expuesto al cliente debe salir del carril `client-safe`
- la capability debe soportar cards y entry points multi-superficie, no solo una pagina dedicada
- permisos y field masking deben vivir en policy compartida, no escondidos en componentes

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-318-client-safe-verified-talent-profiles.md`
- `src/views/greenhouse/GreenhouseClientTeam.tsx`
- `src/lib/team/client-safe-profile.ts`
- `src/lib/agency/space-360.ts`
- `src/lib/staff-augmentation/store.ts`

### Blocks / Impacts

- `TASK-358` a `TASK-366`
- `src/app/(dashboard)/equipo/page.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx`
- `src/components/greenhouse/*`

### Files owned

- `docs/tasks/to-do/TASK-357-assigned-team-canonical-program.md`
- `docs/tasks/to-do/TASK-358-assigned-team-semantic-layer-portfolio-readers.md`
- `docs/tasks/to-do/TASK-359-assigned-team-client-visibility-policy-field-access.md`
- `docs/tasks/to-do/TASK-360-assigned-team-shared-ui-primitives-cards.md`
- `docs/tasks/to-do/TASK-361-assigned-team-main-module-runtime.md`
- `docs/tasks/to-do/TASK-362-assigned-team-talent-detail-drawer-client-safe-dossier.md`
- `docs/tasks/to-do/TASK-363-assigned-team-capacity-health-signals-integration.md`
- `docs/tasks/to-do/TASK-364-assigned-team-risk-continuity-coverage-alerts.md`
- `docs/tasks/to-do/TASK-365-assigned-team-cross-surface-consumers.md`
- `docs/tasks/to-do/TASK-366-assigned-team-enterprise-hardening-observability-export.md`

## Current Repo State

### Already exists

- `src/views/greenhouse/GreenhouseClientTeam.tsx` ya ofrece una vista inicial de equipo para cliente
- `src/lib/team/client-safe-profile.ts` y `src/app/api/team/profiles/route.ts` ya resuelven perfiles client-safe
- `src/lib/team-capacity/*`, `src/app/api/team/capacity/route.ts` y `src/app/api/team/capacity-breakdown/route.ts` ya publican capacidad operativa
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` ya expresa parte de la semantica de coverage y staffing

### Gap

- no existe un `ClientWorkforcePortfolio` canónico
- no existe policy field-level para `Assigned Team`
- la UI shared enterprise todavía no está separada entre primitives, cards y composites
- no existe rollout coordinado hacia dashboard, home, account views y alerting

## Scope

### Slice 1 — Program sequencing

- fijar orden de implementación y dependencias reales entre data, security y UI
- explicitar qué tasks pueden correr en paralelo sin romper contratos

### Slice 2 — Rollout ownership

- dividir el programa entre semantic layer, access policy, main module y consumers
- dejar claro qué tasks son foundation y cuáles son follow-ons de experiencia

## Out of Scope

- implementar código de runtime
- redefinir la arquitectura ya aprobada de `Assigned Team`

## Detailed Spec

Secuencia recomendada:

1. `TASK-358`
2. `TASK-359` + `TASK-360` en paralelo controlado
3. `TASK-363`
4. `TASK-361`
5. `TASK-362` + `TASK-364`
6. `TASK-365`
7. `TASK-366`

## Acceptance Criteria

- [ ] Existe un bloque canónico `TASK-357` a `TASK-366` registrado en backlog
- [ ] Cada task tiene ownership, dependencies y scope sin superposición ambigua
- [ ] La secuencia de rollout queda explícita para agentes futuros

## Verification

- revisión manual de consistencia contra la arquitectura
- revisión manual del registro de IDs y del índice de tasks

## Closing Protocol

- [ ] actualizar el índice de `docs/tasks/README.md` cuando el bloque cambie de estado o secuencia

## Follow-ups

- `TASK-358`
- `TASK-359`
- `TASK-360`
- `TASK-361`
- `TASK-362`
- `TASK-363`
- `TASK-364`
- `TASK-365`
- `TASK-366`
