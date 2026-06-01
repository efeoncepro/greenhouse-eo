# TASK-988 — Reconciliar fuente de verdad rol→route_group (TS map ↔ DB) + parity gate

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (riesgo latente de gobernanza de acceso; impacto runtime hoy bajo)
- Effort: `Bajo`
- Type: `implementation` (gated por una decisión de gobernanza)
- Status real: `Backlog`
- Domain: `identity|access|governance`
- Blocked by: `decisión de política del operador (open question abajo)`
- Branch: `task/TASK-988-role-route-group-source-of-truth-reconciliation`
- Legacy ID: `none`

## Summary

La derivación "qué route groups otorga cada rol" está duplicada en dos fuentes que **divergen**: el mapa TS `ROLE_ROUTE_GROUPS` (`src/lib/tenant/role-route-mapping.ts`) y la columna DB `greenhouse_core.roles.route_group_scope`. Para `efeonce_operations` y `hr_payroll`, el TS incluye `people` y la DB no. Hay que decidir la fuente canónica, alinear la otra, y agregar un parity test que impida que vuelvan a desincronizarse.

## Why This Task Exists

Detectado durante TASK-987 (fix del leak de route groups por roles revocados). TASK-987 cerró la causa del **lifecycle** (roles revocados ya no filtran acceso) pero dejó visible una segunda divergencia: los **valores** del mapping rol→route_group difieren entre TS y DB. Hoy el runtime usa la DB (vía `session_360`), así que el TS es solo fallback y el impacto visible es bajo — pero dos fuentes contradictorias son deuda: cualquiera que "alinee" una con la otra (o un path que lea el TS) cambia el acceso de personas reales sin decisión explícita. Es la misma clase de riesgo que parió ISSUE-083.

## Goal

- Una sola fuente de verdad para rol→route_group, con la otra alineada o derivada de ella.
- Parity test que rompa el build ante drift TS↔DB (patrón canónico de parity, p.ej. capabilities registry TASK-611).
- Decisión de política explícita y documentada sobre si Operaciones/Nómina ven "Personas".

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (Role Catalog)
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §1.5 (matriz rol-route groups)
- `CLAUDE.md` → "Session access derivation must honor role-assignment lifecycle (TASK-987)"

## Normative Docs

- `src/lib/tenant/role-route-mapping.ts` (`ROLE_ROUTE_GROUPS` — fuente TS)
- `greenhouse_core.roles.route_group_scope` (fuente DB, consumida por `greenhouse_serving.session_360`)
- `src/lib/tenant/access.ts` (`normalizeTenantAccessRow` usa el TS solo como fallback cuando `row.route_groups` viene vacío)

## Dependencies & Impact

### Depende de
- **Decisión de gobernanza del operador** (open question): ¿Operaciones (`efeonce_operations`) y Nómina (`hr_payroll`) deben tener el route group `people` (pantalla "Personas")?

### Impacta a
- Cualquier usuario con `efeonce_operations` o `hr_payroll` activo (p.ej. Daniela Ferreira tiene `efeonce_operations` activo). Si se decide que esos roles SÍ otorgan `people` y se alinea la DB, su menú/acceso podría cambiar. Hoy esos roles igual tienen `internal`, y "Personas" también se abre con `internal`, por lo que el cambio visible probablemente sea menor — verificar.

### Archivos owned
- `src/lib/tenant/role-route-mapping.ts`
- migración nueva (si la fuente canónica es TS → seed/UPDATE de `roles.route_group_scope`)
- test de paridad nuevo (`src/lib/tenant/role-route-mapping.parity.*.ts` o equivalente)

## Current Repo State

### Ya existe
- TS `ROLE_ROUTE_GROUPS`: `efeonce_operations → [internal, people]`, `hr_payroll → [internal, hr, people]`.
- DB `roles.route_group_scope`: `efeonce_operations → [internal]`, `hr_payroll → [internal, hr]`.
- Runtime lee la DB vía `session_360` (el TS es fallback).
- Signal `identity.session.route_group_drift` (TASK-987) detecta route groups que no derivan de roles activos — NO detecta el drift TS↔DB de valores.

### Gap
- No hay parity test TS↔DB para `route_group_scope`.
- La política "Operaciones/Nómina ven Personas" no está decidida ni documentada.

## Scope

### Slice 1 — Decisión + alineación
- Resolver la open question (política). Documentar la decisión en la matriz canónica (`GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`).
- Alinear la fuente no-canónica: si canónico=TS → migración que actualiza `roles.route_group_scope`; si canónico=DB → editar `ROLE_ROUTE_GROUPS`.
- Verificar blast radius (usuarios con esos roles activos) antes/después.

### Slice 2 — Parity gate
- Test de paridad que asserta `ROLE_ROUTE_GROUPS[role]` == `roles.route_group_scope[role]` para todos los roles (live test gated por proxy/DB, patrón `parity.live.test.ts`, o snapshot test si se prefiere puro).

## Out of Scope

- Cambiar la semántica de otros roles cuyos mappings sí coinciden.
- El lifecycle de roles (ya cerrado por TASK-987).

## Rollout Plan & Risk Matrix

Cambio aditivo de bajo riesgo, pero toca acceso → verificar blast radius.

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Cambiar `people` altera menú de usuarios con esos roles | identity/UI | Media | Verificar blast radius live antes/después; `people` es redundante con `internal` para "Personas" en muchos paths | revisión manual + GVC |
| Parity test rompe build por otros drifts no vistos | CI | Baja | Correr el test localmente primero; reconciliar todos los drifts detectados | parity test |

- **Feature flags / cutover**: N/A (cambio de datos/mapping).
- **Rollback plan**: revert del PR + (si hubo migración) down migration que restaura el `route_group_scope` previo.
- **Production verification**: tras alinear, `identity.session.route_group_drift` debe seguir en 0 y el parity test verde.

## Acceptance Criteria

- [ ] Decisión de política documentada (Operaciones/Nómina ¿ven Personas?).
- [ ] TS `ROLE_ROUTE_GROUPS` y DB `roles.route_group_scope` coinciden para TODOS los roles.
- [ ] Parity test TS↔DB verde y wired al build/CI.
- [ ] Blast radius verificado (usuarios con `efeonce_operations`/`hr_payroll` activo) — sin cambios de acceso no intencionales.
- [ ] `identity.session.route_group_drift` sigue en 0.

## Verification

- Parity test + tsc/lint + (si migración) `pnpm migrate:up` + verificación live de route_groups de usuarios afectados.

## Closing Protocol

- [ ] Lifecycle complete + README/registry + Handoff + changelog.
- [ ] Actualizar matriz canónica en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`.

## Open Questions

- **(Bloqueante) ¿`efeonce_operations` (Operaciones) y `hr_payroll` (Nómina) deben otorgar el route group `people` (pantalla "Personas")?** El TS dice que sí; la DB dice que no. La respuesta define cuál es la fuente canónica y hacia dónde se alinea la otra. Decisión del operador (política de mínimo privilegio).
