# ISSUE-149 — Drift TS↔DB en `roles.route_group_scope`: el superadmin sin bloque personal en el avatar

> **Tipo:** Incidente de datos / derivación de sesión (TASK-987 contract)
> **Ambiente:** Todos (la fila vive en `greenhouse_core.roles`, compartida)
> **Detectado:** 2026-08-11 — el operador reportó el menú del avatar vacío (solo identidad + salir) tras el rehome de TASK-1388, en staging y local
> **Resuelto:** 2026-08-11 (misma sesión) — migration `20260811111040053_issue-149-role-route-group-scope-parity.sql`
> **Severidad:** media — sin exposición; el efecto era acceso DE MENOS (superficies personales invisibles para roles internos)

## Síntoma

El dropdown del avatar de un `efeonce_admin` renderizaba solo identidad + "Salir del Greenhouse" —
sin el bloque `/my/*` que TASK-1388 rehomeó ahí. Persistía tras re-login y en localhost con el código
nuevo.

## Causa raíz

`greenhouse_core.roles.route_group_scope` es la fuente que **gana** al mintear el JWT
(`identity-store` → `session_360` VIEW → `access.ts:179`); el mapeo TS `ROLE_ROUTE_GROUPS` es solo
fallback cuando la fila viene vacía. Tres filas estaban drifteadas respecto del mapeo vigente:

| Rol | DB (drifteado) | Mapeo TS vigente |
|---|---|---|
| `efeonce_admin` | `{admin,commercial,internal}` | 9 grupos (+`client,finance,hr,people,my,ai_tooling`) |
| `efeonce_operations` | `{internal}` | `{internal,people}` |
| `hr_payroll` | `{internal,hr}` | `{internal,hr,people}` |

Sin `my` en el JWT, `isMyUser=false` y el bloque personal ni se computa. El resto del rail del admin
funcionaba porque los dominios operativos tienen `|| isAdminUser` — el personal es el único gated
estrictamente por `my`, y el rehome de TASK-1388 lo volvió visible como síntoma.

El contrato de paridad ya estaba declarado (seed del rol `designer`, TASK-1072: *"DEBE igualar
ROLE_ROUTE_GROUPS"*), pero nada lo verificaba para los roles pre-existentes.

## Resolución

- Migration forward idempotente sincronizando los 3 roles al mapeo TS, con bloque DO anti
  pre-up-marker que verifica igualdad de conjuntos (`@>` + `<@`) post-apply.
- **Sin re-login necesario**: el jwt callback re-lee los claims cada 5 min
  (`ACCESS_CLAIMS_REFRESH_INTERVAL_MS`, `auth.ts`) y `session_360` es VIEW — la corrección propagó a
  las sesiones vivas sola.

## Verificación

- Post-migration: `route_group_scope` de los 3 roles en paridad exacta (DO block + SELECT manual).
- Sesión viva del operador re-inspeccionada vía `/api/auth/session`: `routeGroups` pasó de 3 a 9
  grupos sin re-login, y el dropdown del avatar renderizó el bloque personal completo (verificado
  visualmente en localhost).

## Deuda señalada (no tocada acá)

- **2 roles fantasma en DB** sin entrada en `ROLE_ROUTE_GROUPS` ni `ROLE_CODES`: `employee`
  (`{internal,employee}` — `employee` ni siquiera es un route group válido) y `finance_manager`
  (`{commercial,finance,internal}`). Coinciden con la clase "roles fantasma" de
  `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1` — decidir retiro/conversión aparte.
- **Sin drift-guard mecánico TS↔DB**: la paridad se verificó a mano. Candidato: test live o señal de
  reliability que compare `roles.route_group_scope` contra `ROLE_ROUTE_GROUPS` (misma familia que el
  detector de `role_view_fallback_used`).
