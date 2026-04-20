# ISSUE-054 — `/my/profile` returns HTTP 500 in staging

## Ambiente

staging — https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app

## Detectado

2026-04-19, durante smoke test E2E post-TASK-462 merge, usando agent headless (`user-agent-e2e-001`, rol `efeonce_admin`).

## Síntoma

La página `/my/profile` devuelve HTTP 500 consistentemente en staging, mientras que el resto de páginas bajo `/my/*` responden 200:

| Ruta | Status |
|---|---|
| `/my/profile` | **500** |
| `/my/payroll` | 200 |
| `/my/performance` | 200 |
| `/my/delivery` | 200 |
| `/my/assignments` | 200 |
| `/my/goals` | 200 |
| `/my/leave` | 200 |
| `/my/organization` | 200 |
| `/my/evaluations` | 200 |

El resto de páginas `(dashboard)` (`/home`, `/dashboard`, `/finance/*`, `/admin/*`, `/hr/*`, `/people/*`, `/agency/*`) responden 200. No es el patrón global de ISSUE-044 — es específico a `/my/profile`.

## Diagnóstico parcial

- **Página server component** ([src/app/(dashboard)/my/profile/page.tsx](../../../src/app/(dashboard)/my/profile/page.tsx)) es trivial: `getTenantContext` + `hasAuthorizedViewCode` + `redirect` + render de `<MyProfileView />`.
- **MyProfileView** ([src/views/greenhouse/my/MyProfileView.tsx](../../../src/views/greenhouse/my/MyProfileView.tsx)) es `'use client'` con imports a: `MyProfileHeader`, sub-tabs `ProfileTab`, `TeamsTab`, `ProjectsTab`, `ConnectionsTab`, `SecurityTab`, `SkillsCertificationsTab`, types de `@/types/person-complete-360`, `resolveProfileBanner` de `@/lib/person-360/resolve-banner`.
- **Hipótesis**: probablemente un import server-only filtrándose al client bundle (similar al fix de TASK-467 phase-2 `SELLABLE_ROLE_PRICING_CURRENCIES`), o un componente de los sub-tabs que lanza un error sincrónico durante SSR del initial HTML.
- **Endpoint relacionado**: `/api/people/profile` devuelve 404 — ese endpoint NO existe. Si MyProfileView lo llama y no maneja el error, es posible que el view crashee. El endpoint canónico de person 360 es probablemente otro (person-complete-360 federated reader, TASK-274).

## Impacto

- Operador humano y agentes no pueden ver/editar su perfil desde `/my/profile` en staging
- El resto de secciones personales (`/my/*`) funciona normal
- No bloquea otros flujos operativos críticos

## Solución propuesta

1. Ejecutar request a `/my/profile` con logs de servidor activos para capturar el stack trace específico del 500
2. Revisar imports de MyProfileView + sub-tabs buscando:
   - Imports que referencien `server-only` en files que no deberían
   - APIs llamadas que devuelvan shapes inesperados
   - `useEffect` que lance errores durante mount
3. Verificar que el endpoint que consume MyProfileView existe y responde el shape esperado
4. Agregar error boundary + logging específico para capturar crashes futuros

## Ownership sugerido

Codex — domain `identity/person` donde vive person-360 federated layer (TASK-274). TASK derivada: `TASK-472-my-profile-ssr-500-fix`.

## Verificación

Antes de cerrar este issue:
- [ ] `/my/profile` devuelve HTTP 200 en staging via agent-session
- [ ] Carga visualmente el view con header + tabs + datos de person 360
- [ ] No regresiones en otras páginas `/my/*`
- [ ] Regression test agregado al suite E2E
