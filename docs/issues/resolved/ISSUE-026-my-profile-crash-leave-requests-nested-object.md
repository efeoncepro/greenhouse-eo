# ISSUE-026 — Mi Perfil crash: leave.requests es objeto anidado, no array

## Ambiente

production + staging

## Detectado

2026-04-07, reporte directo del usuario al navegar a `/my/profile` tras deploy de TASK-272.

## Síntoma

Al entrar a `/my/profile` en producción, la página mostraba "Application error: a client-side exception has occurred" (pantalla blanca). Después del deploy del error boundary (chunk recovery), mostraba "Algo salio mal" con botón de reintentar. El error ocurría para todos los usuarios con faceta member (con leave requests).

Adicionalmente, el deploy a producción presentó tres problemas encadenados:

1. **Redirect a `/dashboard`**: usuarios internos con JWT stale (portalHomePath vacío) eran redirigidos a `/dashboard` que es solo para clientes, causando crash por falta de `clientId`.
2. **Rollback bloqueó promote**: `vercel rollback` fijó el dominio `greenhouse.efeoncepro.com` al deploy de PR #29. Los deploys posteriores via Git se marcaban como "production" pero el dominio seguía apuntando al rollback. Requirió `vercel promote` manual.
3. **Deploy via CLI**: `vercel deploy --prod` desde local bypaseó la integración Git, causando un deploy que no se vinculó correctamente al proyecto.

## Causa raíz

**Bug principal**: `GET /api/my/leave` retorna `{ requests: { requests: [...], summary: {...} }, ... }` — estructura doblemente anidada. `MyProfileView.tsx` línea 177 accedía a `leave?.requests` esperando un array directo, pero recibía un objeto. `.slice(0, 5)` lanzaba `TypeError: leave?.requests.slice is not a function`.

**Bug secundario (auth redirect)**: `/auth/landing` línea 14 tenía fallback `'/dashboard'` cuando `session.user.portalHomePath` era vacío. Para internal users con JWT cookies generadas antes de que `resolvePortalHomePath` retornara `/home`, esto los enviaba al dashboard de clientes que crasheaba por falta de `clientId`.

## Impacto

- `/my/profile` completamente inaccesible para todos los usuarios con leave requests (100% del equipo interno)
- Usuarios internos con sesiones viejas no podían entrar al portal (redirect loop `/auth/landing` → `/dashboard` → crash)

## Solución

Tres commits en secuencia:

1. **PR #32** — `fix(auth): change landing fallback from /dashboard to /home`
   - `/auth/landing`: fallback `'/dashboard'` → `'/home'`
   - `/dashboard/page.tsx`: no-access redirect fallback → `'/home'`

2. **PR #33** — `fix(my): MyProfileView crash — leave.requests nested object`
   - Extraer array real: `Array.isArray(leave?.requests) ? leave.requests : (leave?.requests?.requests ?? [])`

3. **Deploy recovery** — `vercel promote dpl_6D12ErjNu27ziYpkenj5opAsYfgM` para desbloquear dominio tras rollback.

## Verificación

- `/my/profile` carga correctamente con header rico, 5 tabs, activity timeline con leave requests reales
- Login de usuario interno redirige a `/home` (no a `/dashboard`)
- `greenhouse.efeoncepro.com` apunta al deploy correcto (PR #33, commit `6485d8fc`)

## Estado

resolved

## Relacionado

- TASK-272 — Mi Perfil rich view (commit que introdujo el bug)
- PR #31, #32, #33 — fixes incrementales
- `src/views/greenhouse/my/MyProfileView.tsx` — archivo afectado
- `src/app/auth/landing/page.tsx` — fallback de redirect
- `src/app/(dashboard)/error.tsx` — error boundary creado como parte de la investigación
- `src/lib/chunk-error.ts` — chunk load error detection creada como parte de la investigación
