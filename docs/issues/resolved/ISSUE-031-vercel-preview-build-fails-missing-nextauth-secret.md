# ISSUE-031 — Vercel Preview falla en build por drift de `NEXTAUTH_SECRET`

## Ambiente

preview

## Detectado

2026-04-08, durante la revisión de los PR `#41`, `#42` y `#43`.

## Síntoma

Los Preview Deployments de Vercel quedaban en `Error` aunque:

- `pnpm build` pasaba localmente con `.env.local`
- el diff de los PR no tocaba autenticación
- incluso un PR solo de docs (`#42`) fallaba igual

La reproducción aislada contra el snapshot real de `Preview` (`.vercel/.env.preview.local`), removiendo `.env.local` y `.env.production.local`, falló con:

```text
Error: NEXTAUTH_SECRET is not set
Error: Failed to collect page data for /api/admin/invite
```

## Causa raíz

El ambiente `Preview` de Vercel tenía drift respecto del baseline local y compartido:

- faltaba `NEXTAUTH_SECRET`
- faltaba `NEXTAUTH_URL`
- también faltaban `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON`

El fallo que rompía el deployment aparecía primero en `NEXTAUTH_SECRET` porque `src/lib/auth.ts` resolvía `authOptions` en import-time. Durante `page-data collection`, Next importaba routes y páginas que llamaban `getServerSession(authOptions)`, por lo que el build abortaba antes de terminar.

## Impacto

- PR previews quedaban rojos por un problema de entorno, no por el diff real.
- GitHub mostraba `Vercel: Error` sin preview URL utilizable.
- El diagnóstico era engañoso porque el build local normal seguía pasando con `.env.local`.

## Solución

Se endureció el carril de auth para que el drift de Preview no vuelva a bloquear el build:

- `src/lib/auth.ts` ahora construye `NextAuthOptions` de forma lazy (`getAuthOptions()`) en vez de hacerlo al importar el módulo.
- Los consumers server-side migraron de `getServerSession(authOptions)` a `getServerAuthSession()`.
- Si falta `NEXTAUTH_SECRET`, `getServerAuthSession()` degrada a sesión `null` en vez de romper el build.
- `src/app/api/auth/[...nextauth]/route.ts` ahora responde `503` controlado cuando la autenticación no está configurada en ese runtime, en vez de explotar durante import-time.

Esto no reemplaza la política operativa de Vercel: un Preview que necesite login real sigue debiendo tener `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` y credenciales Google válidas. Pero el deployment deja de caer silenciosamente por ese drift.

## Verificación

Validación local ejecutada sobre la rama del fix:

- `pnpm build` — OK
- `pnpm lint` — OK
- reproducción aislada de `Preview`:
  - mover temporalmente `.env.local` y `.env.production.local`
  - cargar solo `.vercel/.env.preview.local`
  - `pnpm build` — OK

La reproducción aislada confirmó el before/after:

- antes del fix: `NEXTAUTH_SECRET is not set` durante `page-data collection`
- después del fix: el build de `Preview` completa

## Estado

resolved

## Relacionado

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `project_context.md`
- `Handoff.md`
- `ISSUE-030`
