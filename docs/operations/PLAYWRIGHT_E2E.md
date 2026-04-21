# Playwright E2E Smoke Suite

> **Tipo de documento:** Operacional (how-to + convenciones)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (TASK-517)
> **Documentacion tecnica:** este archivo es la referencia canonica

## Que es

Suite de smoke tests end-to-end que corre sobre el portal real (localhost o Staging) autenticado con una sesion headless del usuario `agent@greenhouse.efeonce.org`. Cubre los flujos criticos: login/session, home, Finance Quotes, HR Payroll, People 360, Admin.

El suite es **smoke**, no integracion: verifica que los pages renderizan sin 5xx ni error boundary, que la sesion persiste entre navegaciones y que el usuario tiene acceso al shell autenticado. No ejecuta mutaciones (no crea cotizaciones, no cierra payrolls, no escribe en la DB).

## Que no es

- **No es visual regression** (Chromatic/Percy) — follow-up task.
- **No es integration test** para flujos de mutacion — se usa Vitest unit + integration para eso.
- **No corre en cada PR** — corre en `push` a `develop` y en `workflow_dispatch` manual.
- **No es multi-browser** V1 — solo Chromium. Firefox/WebKit queda como follow-up.

## Stack

| Pieza | Version |
| --- | --- |
| `@playwright/test` | `^1.59` |
| Browsers | Chromium (default) |
| Config canonica | `playwright.config.ts` |
| Specs | `tests/e2e/smoke/**/*.spec.ts` |
| Auth setup | `scripts/playwright-auth-setup.mjs` |
| Global setup | `tests/e2e/global-setup.ts` |
| Fixture auth | `tests/e2e/fixtures/auth.ts` |
| Workflow CI | `.github/workflows/playwright.yml` |

## Variables de entorno

| Variable | Uso | Requerida |
| --- | --- | --- |
| `AGENT_AUTH_SECRET` | Shared secret para `/api/auth/agent-session`. Generar con `openssl rand -hex 32`. | Si |
| `AGENT_AUTH_EMAIL` | Email del usuario de agente (default: `agent@greenhouse.efeonce.org`). | No |
| `PLAYWRIGHT_BASE_URL` | URL del portal a testear. Default: `http://localhost:3000`. | No |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass de Vercel Deployment Protection cuando `PLAYWRIGHT_BASE_URL` apunta a `.vercel.app`. | Solo staging |
| `PLAYWRIGHT_START_WEB_SERVER` | Si es `true`, Playwright levanta `pnpm dev` automaticamente. | No |
| `PLAYWRIGHT_SKIP_AUTH_SETUP` | Si es `true`, salta el global setup y requiere `.auth/storageState.json` pre-existente. | No |
| `AGENT_AUTH_STORAGE_PATH` | Path custom para `storageState.json`. Default: `.auth/storageState.json`. | No |

## Correr local

```bash
# 1. Con dev server corriendo en otra terminal:
pnpm dev

# 2. En otra terminal, con AGENT_AUTH_SECRET disponible:
pnpm test:e2e
```

**Primera vez:** Playwright descarga Chromium (~300 MB). Para instalarlo explicito:

```bash
pnpm exec playwright install chromium
```

**Modo UI (inspector interactivo):**

```bash
pnpm test:e2e:ui
```

**Regenerar storageState manualmente:**

```bash
pnpm test:e2e:setup
# escribe .auth/storageState.json con la cookie de sesion actual
```

**Saltar el auto-setup** (usar un storageState pre-existente):

```bash
PLAYWRIGHT_SKIP_AUTH_SETUP=true pnpm test:e2e
```

## Correr contra Staging

Staging tiene Vercel SSO Protection. Para que Playwright pueda hacer requests, necesita el bypass header:

```bash
PLAYWRIGHT_BASE_URL="https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app" \
VERCEL_AUTOMATION_BYPASS_SECRET="<secret>" \
AGENT_AUTH_SECRET="<secret>" \
pnpm test:e2e
```

`playwright.config.ts` inyecta el header `x-vercel-protection-bypass` automaticamente cuando `VERCEL_AUTOMATION_BYPASS_SECRET` esta seteado.

**Nota:** usar la URL `.vercel.app`, no el custom domain `dev-greenhouse.efeoncepro.com` — este ultimo tambien tiene SSO activa pero el bypass header solo aplica al dominio de deployment.

## Correr en CI

El workflow `.github/workflows/playwright.yml` dispara en:

1. **`workflow_dispatch`** (manual) — con input opcional `base_url` para override.
2. **`push` a `develop`** — smoke post-merge contra staging.

Requiere los siguientes **GitHub Secrets** (repo-level):

| Secret | Valor |
| --- | --- |
| `PLAYWRIGHT_BASE_URL` | URL `.vercel.app` de staging (o custom staging URL). |
| `AGENT_AUTH_SECRET` | Shared secret del agent auth endpoint. |
| `AGENT_AUTH_EMAIL` | Opcional, default `agent@greenhouse.efeonce.org`. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass de Vercel (auto-gestionado por Vercel — copiar de env vars). |

Si falta `PLAYWRIGHT_BASE_URL` o `AGENT_AUTH_SECRET`, el workflow falla en el guard inicial con un error claro.

**Artifacts** (retention 14 dias):

- `playwright-report` — HTML report navegable.
- `playwright-artifacts` — JSON de resultados + traces + screenshots + videos de fallos.

## Estructura del suite

```
tests/
  e2e/
    global-setup.ts              # regenera storageState si hace falta
    fixtures/
      auth.ts                    # test extendido + helpers gotoAuthenticated / expectAuthenticated
    smoke/
      login-session.spec.ts      # sesion persiste, cookie de NextAuth presente
      home.spec.ts               # /home renderiza, / redirige a portalHomePath
      finance-quotes.spec.ts     # /finance/quotes + /finance/quotes/new
      hr-payroll.spec.ts         # /hr/payroll (admin) + /my/payroll (collaborator)
      people-360.spec.ts         # /people directory
      admin-nav.spec.ts          # /admin dashboard
```

## Convenciones para escribir nuevos tests

- **Un test por endpoint** sobre el que quieras regression coverage.
- **Asserts minimos:** status < 400, body visible, no error text ("application error", "500 — internal"). Evitar asserts contra copy especifico que cambia con cada iteracion de UX.
- **Reusar `gotoAuthenticated(page, path)`** del fixture — asegura que el request paso y que la pagina no redirigio a `/login`.
- **No hacer mutaciones.** Smoke tests son read-only. Para pruebas de creacion/edicion, crear `tests/integration/` (out of scope V1).
- **Usar el fixture `test` de `fixtures/auth.ts`**, no el de `@playwright/test` directo — garantiza que todos los tests levantan sobre el storageState autenticado.
- **Data-testid > text match.** Si el test necesita interactuar con UI concreta, agregar `data-testid` al componente antes de hacer assert por texto (el texto cambia con redesigns, el testid no).

## Troubleshooting

| Sintoma | Causa probable | Fix |
| --- | --- | --- |
| `AGENT_AUTH_SECRET is required for Playwright auth setup` | Falta env var local. | Exportar secret o ponerlo en `.env.local`. |
| Tests caen a `/login` | Cookie expirada o secret invalido. | Borrar `.auth/storageState.json` y correr `pnpm test:e2e:setup`. |
| 401/403 contra staging | Falta bypass secret o esta desalineado. | Verificar `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel Settings -> Environment Variables. No crearlo manualmente. |
| `browserType.launch: Executable doesn't exist` | Chromium no instalado. | `pnpm exec playwright install chromium`. |
| Test timeouts en CI pero verdes local | Network lento en runners; storageState viejo. | CI ya regenera storageState en cada run via global-setup. Subir timeout en `playwright.config.ts` si se confirma. |

## Extensiones futuras

- **Multi-browser matrix** — agregar `firefox` y `webkit` como projects adicionales una vez estabilizado.
- **Visual regression** — integrar con Chromatic o Percy para capturar screenshots de pantallas clave.
- **Integration tests de mutacion** — crear `tests/integration/` con specs que ejecuten flujos de creacion/edicion sobre un tenant sandbox dedicado.
- **Preview deployments** — disparar el workflow en cada deployment `pull_request` de Vercel usando el `deployment_status` event.
- **Test parallelism** — aumentar `workers` en CI cuando la suite pase de 10 specs.

> Detalle tecnico:
> - `playwright.config.ts` — configuracion canonica.
> - `scripts/playwright-auth-setup.mjs` — generador de sesion headless.
> - `src/app/api/auth/agent-session/route.ts` — endpoint del agent auth.
> - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — contrato del agent auth flow.
> - `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` — bypass programatico de staging.
