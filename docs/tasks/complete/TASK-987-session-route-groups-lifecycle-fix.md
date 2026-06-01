# TASK-987 — session_360 route_groups lifecycle fix (revoked-role over-exposure)

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto` (over-exposure de acceso/navegación)
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete`
- Domain: `identity|access|reliability`
- Blocked by: `none`
- Branch: `develop` (instrucción del operador 2026-06-01)
- Issue: `ISSUE-083`

## Summary

El view `greenhouse_serving.session_360` derivaba `route_groups` **sin** el predicado de lifecycle (`ura.active AND effective window`) que sí aplica a `role_codes`. Resultado: roles **revocados** seguían aportando sus route groups, dándole a usuarios navegación más amplia que su rol activo (Valentina `collaborator` veía Personas/Comercial por un `efeonce_account` revocado; Humberly `collaborator` veía Finanzas+HR por 3 roles revocados). Fix de raíz + remediación de gobernanza (Humberly) + detector de drift.

## Why This Task Exists

Disparador: el operador preguntó "¿por qué Valentina ve Personas siendo collaborator?". La auditoría reveló que **no es un parche de un caso** — es una divergencia estructural en cómo el read model deriva acceso: `role_codes` honra el ciclo de vida de la asignación de rol, `route_groups` no. Es over-exposure sistémico (5 usuarios) que vivía silencioso por falta de detector.

## Architecture Alignment (arch-architect, 4-pilar)

**Decisión:** corregir la derivación canónica del read model (`session_360`) para que `route_groups` use el MISMO predicado de lifecycle que `role_codes`, + detector de drift, + remediar gobernanza re-otorgando roles activos donde el acceso es legítimo. NO parche per-usuario, NO hardcode.

**Alternativas descartadas:**
- *Filtrar solo el caso de Valentina* → parche; deja la clase viva (Humberly, futuros).
- *Reconciliar TS `ROLE_ROUTE_GROUPS` ↔ DB `roles.route_group_scope` ahora* → drift pre-existente (`people` en efeonce_operations/hr_payroll) es decisión de gobernanza de valores de mapping; se surface, no se cambia unilateralmente. Fuera de scope.
- *Hardcode finance/hr para Humberly* → exactamente el anti-patrón que estamos corrigiendo. En su lugar: roles activos canónicos.

**4 pilares:**
- **Safety**: un rol revocado NUNCA confiere route groups. Predicado idéntico al de `role_codes`. Defense-in-depth: las superficies de supervisor (Mi equipo/Aprobaciones) se gatean por `supervisorAccess` independiente — no por la fuga.
- **Robustness**: el FILTER de `route_groups` espeja byte-a-byte el de `role_codes`. DO block de verificación en la migración aborta si queda fuga o si la remediación de Humberly no quedó aplicada.
- **Resilience**: reliability signal `identity.session.route_group_drift` (steady=0) detecta cualquier regresión futura (re-rotura del FILTER o consumer alternativo). El bug vivió silencioso por la AUSENCIA de este detector.
- **Scalability**: derivación O(roles del usuario); sin overrides per-usuario. Cualquier rol/usuario nuevo entra sin tocar consumers.

## Product Design / IA (info-architecture + greenhouse-ux)

El menú gatea secciones por route group (`canSeePeople = internal||people||...`, `isCommercialUser`, etc.) y las superficies de supervisor por `supervisorAccess`. La fuga hacía que el menú mostrara superficies que el usuario no podía usar de verdad (sus `authorizedViews` eran solo `mi_ficha.*`) — viola "information scent" (Pirolli/Card) y wayfinding (mostrar rutas prohibidas). El fix realinea la navegación con la autorización efectiva. **No requiere cambio de componente UI**: el fix vive en la capa de derivación de acceso y el menú (VerticalMenu) se auto-corrige — items que ya no aplican simplemente desaparecen (degradación limpia). Verificado que supervisores conservan sus superficies scoped (Daniela: Aprobaciones; Valentina: equipo scoped).

## Scope (entregado)

1. **Migración** `20260601194051024` (atómica): (a) re-grant Humberly `finance_admin`+`hr_manager` ACTIVOS antes del fix (sin gap de acceso); (b) `CREATE OR REPLACE VIEW session_360` con `route_groups` lifecycle-filtered; (c) DO block de verificación (cero fuga + Humberly 2 roles).
2. **Reliability signal** `identity.session.route_group_drift` (`src/lib/reliability/queries/identity-session-route-group-drift.ts`) + wire-up en `get-reliability-overview.ts` + 4 tests.

## Out of Scope

- Reconciliar los VALORES del mapping TS↔DB (`people` en efeonce_operations/hr_payroll) — decisión de gobernanza, se surface como open question.
- Re-otorgar acceso a Valentina/Andres/Melkin — son collaborators; correctamente quedan en `[my]`. Si alguno necesitara acceso más amplio, se otorga un rol activo (no la fuga).
- Refactor de `deriveRouteGroupsFromRoles` (TS, fallback) — concuerda para los casos relevantes.

## Acceptance Criteria

- [x] `session_360.route_groups` deriva solo de roles activos+vigentes (mismo predicado que `role_codes`).
- [x] Valentina/Andres/Melkin (collaborator puro) → `[my]`.
- [x] Daniela (efeonce_operations activo) → `[internal,my]`; conserva Aprobaciones (supervisora).
- [x] Humberly → `[commercial,finance,hr,my]` vía roles activos canónicos (no fuga).
- [x] Signal `identity.session.route_group_drift` = ok (count 0) post-fix.
- [x] BQ fallback ya filtraba activo — sin cambio necesario (verificado).

## Verification

- Migración aplicada contra DB compartida; DO block pasó.
- Live: 6 usuarios verificados (ver ISSUE-083); signal count 0.
- tsc 0 · lint 0 · signal test 4/4 · full reliability suite + build (gate de cierre).

## Open Questions (gobernanza, follow-up)

- TS `ROLE_ROUTE_GROUPS` vs DB `roles.route_group_scope` difieren en `people` para `efeonce_operations` y `hr_payroll`. ¿Cuál es el canónico? Decisión de gobernanza del operador (no cambiada aquí). Un parity test/signal podría surfacearlo si se decide consolidar.

## Closing Protocol

- [x] ISSUE-083 → resolved + README issues.
- [x] Lifecycle complete + README/registry tasks.
- [x] Handoff + changelog.
- [x] CLAUDE.md invariant (derivación de route_groups debe honrar lifecycle).
