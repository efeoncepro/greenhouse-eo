# ISSUE-044 — Dashboard pages return HTTP 500 via agent headless requests

## Ambiente

staging (verified across multiple deployments)

## Detectado

2026-04-11, during TASK-373 E2E verification via agent auth (`user-agent-e2e-001`)

## Síntoma

Todas las páginas bajo el route group `(dashboard)/` devuelven HTTP 500 cuando se acceden via agent headless requests en staging. Las APIs funcionan (HTTP 200), la sesión es válida, y páginas fuera del `(dashboard)` layout (login, register, forgot-password) devuelven 200.

| Request | Status | Nota |
|---------|--------|------|
| `POST /api/auth/agent-session` | 200 | Sesión válida, 63 authorizedViews |
| `GET /api/auth/session` | 200 | JWT decodifica OK |
| `GET /api/people` | 200 | PostgreSQL accesible |
| `GET /api/debug/layout-test` | 200 | Todas las llamadas async del layout pasan OK |
| `GET /login` | 200 | Página sin layout (dashboard) |
| `GET /register` | 200 | Página sin layout (dashboard) |
| `GET /forgot-password` | 200 | Página sin layout (dashboard) |
| `GET /home` (RSC header) | **200** | RSC payload válido con sesión completa |
| `GET /home` (HTML) | **500** | HTML error page con 404 reference interno |
| `GET /admin` | **500** | Idem |
| `GET /settings` | **500** | Idem |
| `GET /my/profile` | **500** | Idem |

## Causa raíz

**No es lógica de negocio.** Investigación exhaustiva descartó:

1. ~~`getOperatingEntityIdentity()` sin try-catch~~ — Verificado: devuelve datos OK vía diagnóstico API
2. ~~`getServerAuthSession()` falla~~ — Verificado: sesión válida, userId correcto
3. ~~`getMode()`/`getSystemMode()` falla~~ — Verificado: devuelven `light` correctamente
4. ~~Cookie inválida~~ — Verificado: sin cookie devuelve 307→/login (correcto), con cookie devuelve 500 (session encontrada pero rendering falla)
5. ~~Error boundary ausente~~ — Verificado: `error.tsx` ya existe con chunk recovery

**Evidencia clave:** La request con header `RSC: 1` devuelve **200** con payload RSC válido (incluye sesión completa, componentes, etc.). La misma request sin RSC header devuelve **500** como HTML. Esto indica que:
- El server component tree se renderiza correctamente (RSC OK)
- El error ocurre durante la **HTML streaming/serialización** del RSC payload a HTML
- El body HTML de 105KB contiene una referencia a un componente 404 interno de Next.js

**Hipótesis más probable:** Incompatibilidad entre Next.js 16 HTML streaming SSR y el stack de CSS-in-JS (MUI CssVarsProvider + Emotion AppRouterCacheProvider). El rendering RSC no necesita generar CSS, pero el HTML streaming sí — y es ahí donde falla.

**Pre-existente:** El issue se reproduce con deployments anteriores a cualquier cambio de la sesión del 2026-04-11. No fue introducido por los cambios de TASK-264, TASK-373, ni TASK-378.

## Impacto

- **Verificación E2E automatizada:** No es posible verificar páginas del portal via agente headless. Solo APIs son verificables.
- **Funcionalidad del portal para usuarios reales:** No afectado — usuarios con browser + SSO acceden normalmente. El issue es específico del agent headless path.
- **CI/CD:** No hay tests E2E de páginas, solo de APIs.

## Solución

### Ya aplicado (hardening defensivo — TASK-378):
- `src/components/Providers.tsx`: `getOperatingEntityIdentity()` envuelto en try-catch
- `src/app/(dashboard)/layout.tsx`: `getServerAuthSession()`, `getMode()`, `getSystemMode()` envueltos en try-catch
- Estas mejoras previenen futuros crashes por fallas de DB/auth pero NO resuelven el 500 actual

### Pendiente (investigación de infraestructura):
1. Investigar la interacción entre Next.js 16 streaming SSR y MUI/Emotion:
   - `InitColorSchemeScript` en root layout
   - `AppRouterCacheProvider` de `@mui/material-nextjs`
   - `ThemeProvider` con `CssVarsProvider` de MUI
   - `stylis-plugin-rtl` en la pipeline de Emotion
2. Verificar si el user-agent del `fetch()` de Node.js afecta el rendering path de Next.js (streaming vs buffered)
3. Evaluar si agregar headers de browser al fetch del agente resuelve el 500 (Accept, User-Agent, etc.)
4. Consultar issues de Next.js 16 + MUI 7 en GitHub para incompatibilidades conocidas

## Verificación

Cuando se resuelva:
- `pnpm staging:request /home` → HTTP 200
- `pnpm staging:request /admin` → HTTP 200
- `pnpm staging:request /settings` → HTTP 200

## Estado

open

## Relacionado

- `TASK-378` — Dashboard SSR Error Resilience (hardening aplicado, causa raíz pendiente)
- `TASK-373` — Sidebar Reorganization (durante cuya verificación E2E se descubrió el issue)
- `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` — documentación de acceso staging
- `scripts/staging-request.mjs` — script de requests headless
- `src/app/(dashboard)/layout.tsx` — layout afectado
- `src/components/Providers.tsx` — provider chain del layout
- `src/components/theme/index.tsx` — ThemeProvider con MUI CssVars
