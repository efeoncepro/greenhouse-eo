# Cloud Infrastructure — Vercel Deployment

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> Contratos vecinos: `GREENHOUSE_STAGING_ACCESS_V1.md` (SSO bypass + agent auth),
> `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (promoción develop→main), CLAUDE.md §Vercel
> Deployment Protection + §Vercel CLI Scope Discipline.

## Deployment

| Property | Value |
| --- | --- |
| Production URL | `greenhouse.efeoncepro.com` (branch `main`) |
| Shared non-prod URL | `dev-greenhouse.efeoncepro.com` (custom environment `staging`, branch `develop`) |
| Framework | Next.js 16.x con Turbopack |
| Build system | Vercel (automatic deploys from Git) |
| Proyecto canónico | `greenhouse-eo` (`prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`, team `efeonce-7670142f`) |

## Ignored build step — docs-only (2026-07-08)

`vercel.json` declara `ignoreCommand: "node scripts/ci/vercel-ignore-build.mjs"` para cortar
builds Vercel cuando el diff Git-triggered es demostrablemente docs-only o contexto local de
agentes. Usa `VERCEL_GIT_PREVIOUS_SHA` vs `VERCEL_GIT_COMMIT_SHA` y respeta la semántica
oficial: exit `0` cancela/ignora el build; exit `1` continúa.

Contrato vigente:

- Se puede ignorar un build en `develop`, custom staging y branch previews si todos los paths
  cambiados son documentación segura (`docs/**`, root docs, Markdown suelto, `.codex/**`,
  `.claude/**`, `.agents/**`).
- Cualquier path desconocido o no-doc continúa el build (fail-open): `src/**`, `app/**`,
  `public/**`, `package.json`, lockfiles, `vercel.json`, `.github/workflows/**`,
  `services/ops-worker/**`, scripts, env/config, migrations y cualquier superficie runtime.
- Docs de control de release/deploy se tratan como deploy-affecting aunque sean Markdown:
  release control plane, runbooks de production release/watchdog, preflight/orchestrator manual
  y feature-flag ledger.
- Si falta el SHA base/head, el clone shallow no contiene el commit de comparación o
  `git diff` falla, el comando continúa el build.
- `main`/Production no se ignora: el orquestador `production-release.yml` espera un deployment
  Vercel `READY` para el `target_sha`; habilitar skip docs-only en production requiere primero
  modelar el estado `vercel_skipped` en el release control plane.
- GitHub Actions mantiene el mismo criterio docs-only en `ci.yml`, `ci-deep.yml` y
  `reliability-verify.yml`; los workflows especializados por contrato (`task-contract`,
  `design-contract`, `claude-md-governance`, etc.) conservan sus propios triggers.

## Key environment variables

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_SECRET` | NextAuth.js session encryption |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Azure AD SSO provider |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth provider |
| `GCP_PROJECT` | Project ID efectivo para BigQuery/clients GCP |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name para Vercel OIDC |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service account a impersonar desde Vercel vía WIF |
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` | Cloud SQL Connector |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` / `_BASE64` | Fallback transicional (SA key) donde WIF no está activo |
| `GREENHOUSE_POSTGRES_HOST` | TCP directo para CLI tooling (migrations, codegen) — no runtime |
| `GREENHOUSE_POSTGRES_MIGRATOR_USER`, `..._PASSWORD` | Perfil migrator para `node-pg-migrate` |

Los secretos críticos usan además el contrato `*_SECRET_REF` (Secret Manager → env fallback):
ver [SECRETS.md](SECRETS.md).

## Crons

Ver [SCHEDULING.md](SCHEDULING.md) — SoT `vercel.json` (8 entries vigentes; el path async
crítico vive en Cloud Scheduler, no acá).
