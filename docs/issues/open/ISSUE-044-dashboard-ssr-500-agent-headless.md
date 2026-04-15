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

**Sí es un problema de SSR runtime, pero no de lógica de negocio ni de sesión.**

Investigación y reproducción local en build de producción confirmaron:

1. `POST /api/auth/agent-session` funciona y la sesión queda válida
2. `GET /home` con header `RSC: 1` devuelve **200**
3. `GET /home` HTML devuelve **500**
4. El runtime local de producción registra el error exacto:

```text
ReferenceError: DOMMatrix is not defined
```

La causa concreta fue un **import transitive SSR-unsafe** desde el barrel `@/components/greenhouse`:

- el barrel exportaba `CertificatePreviewDialog`
- `CertificatePreviewDialog` importa `react-pdf`
- `react-pdf/pdfjs` toca `DOMMatrix` al evaluarse en Node SSR

Eso se activaba aunque la página no usara certificados directamente, porque:

1. los footers compartidos del layout importaban `BrandWordmark` desde el barrel
2. vistas como `GreenhouseSettings` importaban componentes seguros (`TeamDossierSection`) desde el mismo barrel

En ambos casos, el SSR de HTML evaluaba el barrel completo y arrastraba `react-pdf`, lo que rompía el render HTML del route group `(dashboard)`.

## Impacto

- **Verificación E2E automatizada:** No es posible verificar páginas del portal via agente headless. Solo APIs son verificables.
- **Funcionalidad del portal para usuarios reales:** No afectado — usuarios con browser + SSO acceden normalmente. El issue es específico del agent headless path.
- **CI/CD:** No hay tests E2E de páginas, solo de APIs.

## Solución

### Fix implementado

1. `src/components/layout/vertical/FooterContent.tsx`
   - dejó de importar `BrandWordmark` desde `@/components/greenhouse`
   - ahora importa directo desde `@/components/greenhouse/BrandWordmark`

2. `src/components/layout/horizontal/FooterContent.tsx`
   - mismo ajuste para cortar el arrastre del barrel en el layout compartido

3. `src/components/greenhouse/index.ts`
   - `CertificatePreviewDialog` fue removido del barrel compartido
   - se documentó explícitamente que debe importarse directo porque `react-pdf` no es safe para SSR compartido

### Qué protege este fix

- evita que el layout autenticado cargue `react-pdf` por accidente
- evita que vistas que consumen componentes seguros del barrel hereden `DOMMatrix` en SSR
- conserva contratos públicos visibles:
  - rutas
  - payloads
  - semántica de auth
  - UI del footer
  - imports directos de `CertificatePreviewDialog`

## Verificación

Verificado en build local de producción usando `agent-session` real:

- `GET /home` → HTTP 200
- `GET /admin` → HTTP 200
- `GET /settings` → HTTP 200
- `GET /dashboard` → HTTP 200
- `GET /updates` → HTTP 200

También se volvió a correr `pnpm build` sin reproducir `DOMMatrix is not defined`.

Pendiente para cerrar formalmente el issue:

- desplegar a `staging`
- validar `pnpm staging:request /home`
- validar `pnpm staging:request /admin`
- validar `pnpm staging:request /settings`

## Estado

open — fix implementado, pendiente verificación en staging

## Relacionado

- `TASK-378` — Dashboard SSR Error Resilience (hardening aplicado, causa raíz pendiente)
- `TASK-373` — Sidebar Reorganization (durante cuya verificación E2E se descubrió el issue)
- `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` — documentación de acceso staging
- `scripts/staging-request.mjs` — script de requests headless
- `src/app/(dashboard)/layout.tsx` — layout afectado
- `src/components/layout/vertical/FooterContent.tsx` — import transitive corregido
- `src/components/layout/horizontal/FooterContent.tsx` — import transitive corregido
- `src/components/greenhouse/index.ts` — barrel endurecido para SSR
