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

La causa real tenía dos capas:

- el `Preview` genérico de Vercel no tenía baseline compartido de auth/runtime
- varias variables críticas estaban definidas solo como overrides por branch (`develop` u otras ramas históricas), por lo que ramas nuevas no las heredaban

El entorno efectivo de una preview nueva resolvía solo un set mínimo (`NUBOX_*` y variables internas de Vercel) y dejaba afuera, al menos:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GCP_PROJECT`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GREENHOUSE_POSTGRES_*`

El fallo que rompía el deployment aparecía primero en `NEXTAUTH_SECRET` porque `src/lib/auth.ts` resolvía `authOptions` en import-time. Durante `page-data collection`, Next importaba routes y páginas que llamaban `getServerSession(authOptions)`, por lo que el build abortaba antes de terminar.

## Impacto

- PR previews quedaban rojos por un problema de entorno, no por el diff real.
- GitHub mostraba `Vercel: Error` sin preview URL utilizable.
- El diagnóstico era engañoso porque el build local normal seguía pasando con `.env.local`.

## Solución

Se resolvió por dos carriles complementarios.

### 1. Hardening de aplicación

Se endureció el carril de auth para que el drift de Preview no vuelva a bloquear el build:

- `src/lib/auth.ts` ahora construye `NextAuthOptions` de forma lazy (`getAuthOptions()`) en vez de hacerlo al importar el módulo.
- Los consumers server-side migraron de `getServerSession(authOptions)` a `getServerAuthSession()`.
- Si falta `NEXTAUTH_SECRET`, `getServerAuthSession()` degrada a sesión `null` en vez de romper el build.
- `src/app/api/auth/[...nextauth]/route.ts` ahora responde `503` controlado cuando la autenticación no está configurada en ese runtime, en vez de explotar durante import-time.

### 2. Alineación operativa de Vercel Preview

Se dejó creado un baseline genérico de `Preview` para ramas nuevas, en vez de seguir dependiendo de overrides por branch:

- auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`
- runtime GCP: `GCP_PROJECT`, `GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_WORKLOAD_IDENTITY_PROVIDER`
- runtime PostgreSQL: `GREENHOUSE_POSTGRES_DATABASE`, `GREENHOUSE_POSTGRES_HOST`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`, `GREENHOUSE_POSTGRES_IP_TYPE`, `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`, `GREENHOUSE_POSTGRES_PASSWORD`, `GREENHOUSE_POSTGRES_SSL`, `GREENHOUSE_POSTGRES_USER`
- baseline funcional: `GREENHOUSE_MEDIA_BUCKET`, `GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `GREENHOUSE_PUBLIC_MEDIA_BUCKET`
- acceso headless: `AGENT_AUTH_EMAIL`, `AGENT_AUTH_SECRET`
- referencia de webhook: `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`

Regla operativa consolidada:

- el hardening evita que el deployment quede rojo si vuelve a existir drift
- pero el baseline genérico de `Preview` ya no debe depender de overrides por branch para auth, DB o acceso de agente

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

Validación operativa posterior en Vercel:

- `vercel env pull --environment preview --git-branch fix/codex-preview-baseline-smoke` ya resuelve para una branch cualquiera:
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GCP_PROJECT`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GREENHOUSE_POSTGRES_*`
  - `AGENT_AUTH_*`
- se desplegó un preview fresco y:
  - `GET /api/auth/session` respondió `200` con body `{}` en vez de `503`
  - `POST /api/auth/agent-session` respondió `200` y devolvió `cookieName`, `cookieValue`, `portalHomePath`, `userId`

## Estado

resolved

## Relacionado

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `project_context.md`
- `Handoff.md`
- `ISSUE-030`
