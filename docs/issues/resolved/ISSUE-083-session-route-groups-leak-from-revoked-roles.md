# ISSUE-083 — `session_360.route_groups` filtra route groups de roles revocados (over-exposure de navegación)

> **Estado:** resolved
> **Severidad:** alta (over-exposure de acceso, no breakage)
> **Detectado:** 2026-06-01 (auditoría a raíz de "¿por qué Valentina ve Personas?")
> **Resuelto:** 2026-06-01 por TASK-987
> **Ambiente:** dev/staging compartido (Cloud SQL `greenhouse-pg-dev`) + producción (misma definición de view)

## Síntoma

Valentina Hoyos, cuyo único rol ACTIVO es `collaborator`, veía en el menú "Personas" (`/people`) y "Comercial" (`/finance/intelligence/pipeline`) — superficies que un colaborador puro no debería ver. La auditoría mostró que su `route_groups` efectivo era `[commercial, internal, my]` aunque `collaborator → [my]` en el mapa canónico.

## Causa raíz

El view `greenhouse_serving.session_360` deriva dos agregados desde `user_role_assignments`:

- `role_codes` agrega **con** el predicado de lifecycle: `FILTER (WHERE ura.active AND role_code IS NOT NULL AND (effective_to IS NULL OR effective_to > now))`.
- `route_groups` agregaba **sin** ese predicado: `FILTER (WHERE rg.rg IS NOT NULL)`.

Resultado: una asignación de rol **revocada/expirada** seguía aportando su `roles.route_group_scope`. Valentina tenía un `efeonce_account` **revocado** (`route_group_scope = {commercial, internal}`) que seguía filtrando esos grupos a su sesión, aunque el rol ya no aparecía en `role_codes`.

El path de fallback BigQuery (`getIdentityAccessRecord`, `src/lib/tenant/access.ts`) **sí** filtraba `ura.active = TRUE AND status = 'active'` en el JOIN — solo este view PG divergía.

## Impacto (blast radius)

Sistémico: cualquier usuario con un rol revocado conservaba los route groups de ese rol. 5 usuarios internos afectados:

| Usuario | Rol activo | route_groups (con fuga) | route_groups (correcto) |
|---|---|---|---|
| valentina.hoyos | collaborator | commercial, **internal**, my | my |
| andres.carlosama | collaborator | **internal**, my | my |
| melkin.hernandez | collaborator | **internal**, my | my |
| daniela.ferreira | collaborator + efeonce_operations | **employee**, internal, my | internal, my |
| **humberly.henriquez** | collaborator | **commercial, finance, hr, internal**, my | (ver nota) |

Caso más grave: **Humberly** (collaborator) veía **Finanzas + HR** por roles revocados (`finance_manager` ghost + `hr_payroll` + `efeonce_operations`).

Nota: las superficies de supervisor (Mi equipo / Aprobaciones / Organigrama) NO dependen de route groups — se gatean por `supervisorAccess` (TASK-727), así que el fix no las toca.

## Solución (TASK-987)

1. **Fix de raíz** — `CREATE OR REPLACE VIEW session_360`: el agregado `route_groups` ahora usa el **mismo** predicado de lifecycle que `role_codes`. Una sola fuente de verdad temporal; sin divergencia.
2. **Remediación de gobernanza** — Humberly (cargo "Finance Manager") sí necesita Finanzas + HR: re-otorgados los roles ACTIVOS canónicos `finance_admin` + `hr_manager` (que cargan route_groups + vistas + entitlements), reemplazando la dependencia de la fuga. Decisión del operador.
3. **Defensa en profundidad** — reliability signal `identity.session.route_group_drift` (kind=drift, severity=error si >0, steady=0): detecta cualquier usuario cuyo `route_groups` no derive de un rol activo. Tras el fix = 0; cualquier regresión futura se hace visible.

## Verificación

Post-migración (live contra la DB compartida):

```
valentina  collaborator                          → [my]
andres     collaborator                          → [my]
melkin     collaborator                          → [my]
daniela    collaborator,efeonce_operations       → [internal,my]
humberly   collaborator,finance_admin,hr_manager → [commercial,finance,hr,my]
signal identity.session.route_group_drift = ok (count 0)
```

Daniela conserva Aprobaciones (supervisora con 3 reportes + `internal` activo). Valentina conserva sus superficies de supervisor scoped y deja de ver Personas/Comercial. Humberly conserva Finanzas + HR vía roles activos canónicos.

## Referencias

- Fix: `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql`
- Signal: `src/lib/reliability/queries/identity-session-route-group-drift.ts`
- Task: `docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md`
