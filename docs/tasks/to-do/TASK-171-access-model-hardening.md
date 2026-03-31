# TASK-171 — Access Model Hardening: Route Group Unification, Type Safety & Fallback Strategy

**Status:** to-do
**Priority:** High
**Module:** Platform / Auth
**Estimated effort:** Medium (mostly refactor, no new features)

---

## Objetivo

Cerrar los 3 gaps críticos identificados en la auditoría del modelo de identidad y acceso de Greenhouse (2026-03-31):

1. **Route group derivation duplicada** — unificar en una sola función canónica
2. **Fallback vs persisted transition sin estrategia** — definir contrato claro
3. **Role codes como strings sin tipo** — crear constante tipada

Estos gaps no causan bugs visibles hoy pero crean riesgo de drift, typos silenciosos, y comportamiento inesperado durante la migración progresiva del modelo de governance.

## Motivación

La auditoría reveló que el sistema de acceso es robusto (15 roles, 10 route groups, 47 vistas gobernables, dual-layer protection) pero tiene fragilidades estructurales:

- Dos implementaciones paralelas de `deriveRouteGroups` que pueden divergir
- Un estado de transición donde hardcoded fallback y persisted assignments coexisten sin contrato explícito
- 50+ archivos usando role codes como strings sin validación de compilador

---

## Slice 1 — Unificar route group derivation (Gap 1)

### Problema

```
src/lib/tenant/access.ts          → deriveRouteGroups(roleCodes)
src/lib/admin/view-access-store.ts → deriveRouteGroupsForSingleRole(roleCode)
```

Dos funciones con la misma responsabilidad, implementadas por separado. Si se agrega un role o route group nuevo a una pero no a la otra, el acceso se rompe silenciosamente.

### Solución

Crear un archivo canónico de mapping:

```typescript
// src/lib/tenant/role-route-mapping.ts
import { ROLE_CODES } from '@/config/role-codes'

export type RouteGroup = 'internal' | 'admin' | 'client' | 'finance' | 'hr' | 'employee' | 'people' | 'my' | 'agency' | 'ai_tooling'

/** Canonical role → route group mapping. Single source of truth. */
export const ROLE_ROUTE_GROUPS: Record<string, RouteGroup[]> = {
  [ROLE_CODES.EFEONCE_ADMIN]: ['internal', 'admin', 'finance', 'hr', 'people', 'ai_tooling'],
  [ROLE_CODES.EFEONCE_OPERATIONS]: ['internal'],
  [ROLE_CODES.EFEONCE_ACCOUNT]: ['internal'],
  [ROLE_CODES.HR_PAYROLL]: ['internal', 'hr'],
  [ROLE_CODES.HR_MANAGER]: ['hr'],
  [ROLE_CODES.FINANCE_MANAGER]: ['internal', 'finance'],
  [ROLE_CODES.FINANCE_ADMIN]: ['finance'],
  [ROLE_CODES.FINANCE_ANALYST]: ['finance'],
  [ROLE_CODES.EMPLOYEE]: ['internal', 'employee'],
  [ROLE_CODES.PEOPLE_VIEWER]: ['people'],
  [ROLE_CODES.AI_TOOLING_ADMIN]: ['ai_tooling'],
  [ROLE_CODES.COLLABORATOR]: ['my'],
  [ROLE_CODES.CLIENT_EXECUTIVE]: ['client'],
  [ROLE_CODES.CLIENT_MANAGER]: ['client'],
  [ROLE_CODES.CLIENT_SPECIALIST]: ['client']
}

/** Derive route groups from a set of role codes. */
export const deriveRouteGroups = (roleCodes: string[]): RouteGroup[] => {
  const groups = new Set<RouteGroup>()
  for (const code of roleCodes) {
    for (const group of ROLE_ROUTE_GROUPS[code] ?? []) {
      groups.add(group)
    }
  }
  return [...groups]
}

/** Derive route groups for a single role. Used by view-access-store. */
export const deriveRouteGroupsForSingleRole = (roleCode: string): RouteGroup[] =>
  ROLE_ROUTE_GROUPS[roleCode] ?? []
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/tenant/role-route-mapping.ts` | **NUEVO** — canonical mapping |
| `src/lib/tenant/access.ts` | Eliminar `deriveRouteGroups` local, importar de `role-route-mapping` |
| `src/lib/admin/view-access-store.ts` | Eliminar `deriveRouteGroupsForSingleRole` local, importar de `role-route-mapping` |

### Criterio de aceptación
- [ ] Solo existe UNA implementación de `deriveRouteGroups` en todo el codebase
- [ ] `view-access-store.ts` importa de `role-route-mapping.ts`, no tiene lógica propia
- [ ] Tests existentes siguen pasando

---

## Slice 2 — Role codes tipados (Gap 3)

### Problema

```typescript
// 50+ archivos hacen esto:
roleCodes.includes('efeonce_admin')  // string literal, sin validación
roleCodes.includes('financ_manager') // typo silencioso → siempre false
```

### Solución

```typescript
// src/config/role-codes.ts
export const ROLE_CODES = {
  EFEONCE_ADMIN: 'efeonce_admin',
  EFEONCE_OPERATIONS: 'efeonce_operations',
  EFEONCE_ACCOUNT: 'efeonce_account',
  EMPLOYEE: 'employee',
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_ADMIN: 'finance_admin',
  FINANCE_ANALYST: 'finance_analyst',
  HR_PAYROLL: 'hr_payroll',
  HR_MANAGER: 'hr_manager',
  PEOPLE_VIEWER: 'people_viewer',
  AI_TOOLING_ADMIN: 'ai_tooling_admin',
  COLLABORATOR: 'collaborator',
  CLIENT_EXECUTIVE: 'client_executive',
  CLIENT_MANAGER: 'client_manager',
  CLIENT_SPECIALIST: 'client_specialist'
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]

/** Type guard: check if a string is a known role code. */
export const isRoleCode = (value: string): value is RoleCode =>
  Object.values(ROLE_CODES).includes(value as RoleCode)

/** Priority order for primary role selection (index 0 = highest). */
export const ROLE_PRIORITY: RoleCode[] = [
  ROLE_CODES.EFEONCE_ADMIN,
  ROLE_CODES.EMPLOYEE,
  ROLE_CODES.FINANCE_MANAGER,
  ROLE_CODES.FINANCE_ADMIN,
  ROLE_CODES.FINANCE_ANALYST,
  ROLE_CODES.HR_PAYROLL,
  ROLE_CODES.HR_MANAGER,
  ROLE_CODES.EFEONCE_OPERATIONS,
  ROLE_CODES.EFEONCE_ACCOUNT,
  ROLE_CODES.PEOPLE_VIEWER,
  ROLE_CODES.AI_TOOLING_ADMIN,
  ROLE_CODES.COLLABORATOR,
  ROLE_CODES.CLIENT_EXECUTIVE,
  ROLE_CODES.CLIENT_MANAGER,
  ROLE_CODES.CLIENT_SPECIALIST
]
```

### Migración

No se requiere migrar los 50+ archivos de golpe. La estrategia es:

1. Crear `src/config/role-codes.ts` con la constante
2. Migrar los archivos críticos (authorization.ts, access.ts, permissions.ts, view-access-store.ts, VerticalMenu.tsx)
3. Los demás archivos pueden migrar progresivamente — el string literal sigue siendo válido

### Archivos a migrar (primera ola — críticos)

| Archivo | Usos de role strings |
|---------|---------------------|
| `src/lib/tenant/authorization.ts` | ~15 checks |
| `src/lib/tenant/access.ts` | ~20 checks + rolePriority array |
| `src/lib/people/permissions.ts` | ~10 checks |
| `src/lib/admin/view-access-store.ts` | ~10 checks |
| `src/components/layout/vertical/VerticalMenu.tsx` | ~8 checks |

### Criterio de aceptación
- [ ] `ROLE_CODES` constante exportada con los 15 roles
- [ ] `RoleCode` type disponible para uso en interfaces
- [ ] Los 5 archivos críticos usan `ROLE_CODES.XXX` en vez de string literals
- [ ] `rolePriority` en access.ts usa `ROLE_PRIORITY` importado
- [ ] TypeScript detecta typos en compile time

---

## Slice 3 — Fallback vs persisted strategy (Gap 2)

### Problema

```typescript
// view-access-store.ts — resolveAuthorizedViewsForUser
if (persistedAssignments.length > 0) {
  // USA persisted — ignora hardcoded fallback completamente
} else {
  // USA hardcoded fallback
}
```

Si HR configura 1 sola view para un rol en el admin UI, el sistema asume que TODO está migrado para ese rol y deja de usar fallback para las demás views. Resultado: acceso inesperadamente reducido.

### Solución: "Additive persisted" strategy

Cambiar la lógica de resolución a:

```
1. Calcular baseline de views desde hardcoded fallback (siempre)
2. Aplicar persisted grants (+) encima del baseline
3. Aplicar persisted revokes (-) encima del resultado
4. Aplicar user overrides (grant/revoke) al final
```

Esto significa:
- Persisted assignments **agregan o revocan** sobre el baseline, no lo reemplazan
- El hardcoded fallback siempre está activo como floor
- Para quitar acceso hay que explícitamente revocar, no solo "no asignar"

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/admin/view-access-store.ts` | Refactor `resolveAuthorizedViewsForUser` a additive strategy |

### Criterio de aceptación
- [ ] Hardcoded fallback siempre se aplica como baseline (floor)
- [ ] Persisted grants agregan views sobre el baseline
- [ ] Persisted revokes quitan views del resultado
- [ ] User overrides se aplican último (grant/revoke)
- [ ] Un rol con 1 view persistida no pierde acceso a las demás views del fallback
- [ ] Test: crear un grant para 1 view → verificar que las demás siguen accesibles

---

## Dependencies & Impact

### Depende de
- `greenhouse_core.roles` — schema no cambia
- `greenhouse_core.role_view_assignments` — schema no cambia
- `greenhouse_core.user_view_overrides` — schema no cambia
- Sesión NextAuth — no cambia

### Impacta a
- **Todos los `require*TenantContext` checks** — indirectamente vía route group derivation
- **Navigation visibility** — `VerticalMenu.tsx` usa canSeeView
- **Admin > Vistas y acceso** — el cambio de strategy afecta cómo se resuelven permisos
- **TASK-136** (Admin Center View Access Governance) — complementa, no reemplaza

### Archivos owned
- `src/config/role-codes.ts` → **NUEVO**
- `src/lib/tenant/role-route-mapping.ts` → **NUEVO**
- `src/lib/tenant/access.ts` → refactor route group derivation
- `src/lib/tenant/authorization.ts` → migrar a ROLE_CODES
- `src/lib/admin/view-access-store.ts` → refactor resolución + route groups
- `src/lib/people/permissions.ts` → migrar a ROLE_CODES
- `src/components/layout/vertical/VerticalMenu.tsx` → migrar a ROLE_CODES

---

## Acceptance Criteria (global)

- [ ] Route group derivation tiene UNA sola implementación canónica
- [ ] 15 role codes tipados con `as const` y type guard
- [ ] Los 5 archivos críticos usan constantes tipadas, no strings
- [ ] Fallback strategy es additive (persisted agrega/revoca sobre baseline)
- [ ] Zero regresiones en navigation visibility para los roles existentes
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` pasan

---

## Recomendación de ejecución

| Orden | Slice | Riesgo | Esfuerzo |
|-------|-------|--------|----------|
| 1 | Slice 2 — Role codes tipados | Bajo (aditivo) | Bajo |
| 2 | Slice 1 — Unificar route groups | Medio (refactor de imports) | Medio |
| 3 | Slice 3 — Fallback strategy | Alto (cambia lógica de acceso) | Medio |

Slice 2 primero porque es la fundación para Slice 1 (ROLE_CODES se usa en el mapping). Slice 3 último porque es el cambio con más riesgo y requiere testing exhaustivo.
