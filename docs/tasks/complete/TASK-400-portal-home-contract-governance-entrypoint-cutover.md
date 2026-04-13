# TASK-400 — Portal Home Contract Governance, Entrypoint Cutover & Dashboard Compatibility

## Delta 2026-04-13 — Runtime principal ya quedó cortado a la policy canónica; resta cierre de drift residual

- El repo ya no está en el estado descrito por la versión inicial de esta spec.
- Estado real confirmado en discovery:
  - `GET /` y `auth/landing` ya redirigen solo a `session.user.portalHomePath`
  - `DEFAULT_PORTAL_HOME` de provisioning ya es `/home`
  - `resolvePortalHomePath()` ya centraliza aliases legacy y defaults por policy
  - `agent-session`, NextAuth y tenant access ya consumen la misma policy
  - existe `scripts/backfill-portal-home-contract.ts` para normalizar valores legacy en PostgreSQL + BigQuery
- Gap residual real:
  - drift documental en arquitectura/documentación viva que todavía presenta `/dashboard` o `/internal/dashboard` como home estructural
  - relictos visibles de navegación/copy que aún enlazan a `/dashboard` o `/dashboards`
  - split de store en provisioning, porque todavía lee `greenhouse.clients.portal_home_path` como contexto upstream aunque el runtime auth/login converge sobre `client_users.default_portal_home_path`
- Esta task ya no debe ejecutarse como foundation desde cero; debe cerrarse como lane de convergencia final y cleanup gobernado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Completada`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse ya tiene el core del contrato de entrada cortado a una policy canónica (`/`, `auth/landing`, NextAuth y `agent-session`), pero la lane sigue abierta porque aún quedan relictos visibles de `/dashboard`, drift documental y un split residual entre el carril de acceso/login y el contexto que consume provisioning. Esta task termina la convergencia, gobierna la compatibilidad legacy y deja el cierre documental y operativo del contrato de Home.

## Why This Task Exists

La investigacion reciente dejo dos hechos claros:

1. El SSR 500 headless del route group autenticado tenia una causa real y ya tiene fix minimo (`react-pdf` via barrel), pero ese hallazgo no resuelve el problema de fondo sobre **a donde debe entrar Greenhouse**.
2. El repo actual conserva multiples defaults hardcodeados hacia `/dashboard` incluso cuando el producto ya trata `/home` como la Home canonica para usuarios internos y para el portal moderno.

Ese drift tiene blast radius real:

- usuarios y agentes pueden caer en una ruta legacy o degradada al iniciar sesion
- provisioning sigue escribiendo defaults que no respetan la policy actual
- los guards de acceso redirigen a destinos no canónicos
- menús, dropdowns, search suggestions y root redirects no comparten una sola fuente de verdad
- cualquier bug puntual de `/dashboard` se amplifica porque la ruta sigue actuando como fallback estructural

La solucion robusta y escalable no es agregar otro redirect. Es gobernar el entrypoint como un contrato de plataforma con:

- resolucion canonica centralizada
- allowed values / normalizacion de rutas almacenadas
- compatibilidad explicita para legacy paths
- migracion / backfill de datos persistidos
- pruebas de blast radius sobre auth, root routing, menus, guards y rutas legacy

## Goal

- Dejar un solo contrato canonico para resolver el home del portal por tenant, rol y surface
- Hacer que `/home` sea el startup default de Greenhouse salvo landings especializadas justificadas (`/finance`, `/hr/payroll`, `/my`)
- Sacar a `/dashboard` del rol de fallback estructural y convertirlo en ruta gobernada de compatibilidad o feature route explicita

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- el entrypoint autenticado debe resolverse desde una sola policy compartida entre auth, routing, provisioning y navegación
- defaults legacy como `/dashboard` o `/internal/dashboard` no pueden seguir viviendo repartidos como strings sueltas en guards, pages y helpers
- la compatibilidad hacia rutas legacy debe ser explícita y medible; no puede seguir actuando como contrato implícito de fallback
- si existen valores persistidos en DB que contradicen la policy canónica, esta task debe contemplar normalización y backfill, no solo maquillaje en UI

## Normative Docs

- `docs/issues/open/ISSUE-044-dashboard-ssr-500-agent-headless.md`
- `docs/tasks/to-do/TASK-378-dashboard-ssr-error-resilience.md`
- `docs/architecture/schema-snapshot-baseline.sql`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/tenant/resolve-portal-home-path.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/agent-session/route.ts`
- `src/app/page.tsx`
- `src/app/auth/landing/page.tsx`

### Blocks / Impacts

- startup routing autenticado del portal
- compatibilidad de rutas legacy `/dashboard` y `/internal/dashboard`
- agent auth y verificacion headless
- guards de acceso en `src/app/(dashboard)/**`
- menus, search suggestions y dropdowns que todavía pueden filtrar enlaces legacy o defaults locales fuera del choke point canónico
- follow-on de `TASK-378`, porque endurecer SSR no corrige por si solo el contrato de entrada

### Files owned

- `src/lib/tenant/resolve-portal-home-path.ts`
- `src/lib/tenant/access.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/lib/tenant/identity-store.ts`
- `src/app/page.tsx`
- `src/app/auth/landing/page.tsx`
- `src/app/api/auth/agent-session/route.ts`
- `next.config.ts`
- `src/configs/themeConfig.ts`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `src/data/searchData.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/shared/search/DefaultSuggestions.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/notifications/welcome.ts`
- `src/lib/sync/projections/notifications.ts`
- `scripts/setup-postgres-identity-v2.sql`
- `scripts/backfill-postgres-identity-v2.ts`
- `scripts/backfill-portal-home-contract.ts`
- `src/app/(dashboard)/**`
- `docs/tasks/complete/TASK-400-portal-home-contract-governance-entrypoint-cutover.md`

## Current Repo State

### Already exists

- `resolvePortalHomePath()` ya concentra parte de la policy y normaliza `efeonce_internal + /internal/dashboard -> /home`
- `src/lib/auth.ts` ya usa `resolvePortalHomePath()` al construir JWT/session data
- `src/app/api/auth/agent-session/route.ts` ya devuelve `portalHomePath` desde la misma policy
- `src/lib/tenant/resolve-portal-home-path.test.ts` ya tiene una base de tests para internal, HR y finance
- `src/lib/tenant/get-tenant-context.ts` ya propaga un `portalHomePath` normalizado a pages y layouts
- `src/app/page.tsx` y `src/app/auth/landing/page.tsx` ya quedaron cortados al `portalHomePath` de sesión sin fallback legacy
- `next.config.ts` ya no fuerza `/ -> /dashboard`; el root vuelve a resolverse vía App Router y sesión
- `src/lib/admin/tenant-member-provisioning.ts` ya usa `DEFAULT_PORTAL_HOME = '/home'`
- `src/configs/themeConfig.ts`, menús base, `welcome.ts`, `view-access-catalog` y buena parte de la shell ya están alineados a `/home`
- existe `scripts/backfill-portal-home-contract.ts` para PG + BigQuery

### Gap

- `src/lib/admin/tenant-member-provisioning.ts` sigue leyendo `greenhouse.clients.portal_home_path` como contexto upstream del tenant, en paralelo a `client_users.default_portal_home_path`
- sobreviven algunos enlaces visibles legacy (`/dashboard` o `/dashboards`) fuera del choke point canónico
- la surface `/dashboard` sigue viva como compatibilidad/feature route, así que cualquier deep link residual puede reintroducirla como entrypoint de facto
- la surface `/dashboard` ademas tiene un bug funcional separado cuando faltan quality signals (`avgRpa` / `firstTimeRightPct` / `onTimePct`), lo que vuelve mas riesgoso seguir usandola como fallback masivo
- el contrato está partido entre stores:
  - BigQuery fallback en `src/lib/tenant/access.ts` lee `greenhouse.client_users.default_portal_home_path`
  - PostgreSQL path en `src/lib/tenant/identity-store.ts` solo ve `greenhouse_core.client_users.default_portal_home_path` vía `greenhouse_serving.session_360`
  - provisioning todavía toma contexto desde `greenhouse.clients.portal_home_path`
- la arquitectura viva también está desalineada:
  - `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` y otras specs aún documentan `/dashboard`, `/internal/dashboard`, `/finance/dashboard`, `/hr/leave` y `/my/profile` como homes base

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical home policy and store convergence

- definir una policy canonica reusable para startup y fallback del portal en vez de depender de strings sueltas
- separar claramente:
  - startup default del portal
  - homes especializados por rol
  - rutas legacy compatibles
  - redirects por falta de acceso
- converger el contrato entre PostgreSQL, BigQuery, `session_360`, provisioning y agent auth para que no existan home paths distintos según el lookup path
- ampliar tests de `resolvePortalHomePath()` o reemplazarlo por una capa mas expresiva sin romper el contrato de session

### Slice 2 — Root/auth/provisioning cutover

- cortar `GET /`, `auth/landing`, `agent-session`, provisioning y resolution paths a una sola fuente de verdad
- eliminar el default `/dashboard` de `DEFAULT_PORTAL_HOME` y de cualquier bootstrap equivalente
- normalizar `tenant.portalHomePath` antes de que llegue a pages/layouts/menus

### Slice 3 — Shared redirect guards and navigation hardening

- reemplazar los `portalHomePath || '/dashboard'` repartidos en pages, layouts, menús y dropdowns por helpers canonicos
- endurecer search suggestions y shortcuts que sigan apuntando a `/internal/dashboard`
- alinear `themeConfig`, data navigation, breadcrumbs, footers, notifications y `view-access-catalog` con la policy nueva
- dejar explícito qué surfaces pueden seguir enlazando a `/dashboard` como feature route y cuáles deben apuntar a `/home`

### Slice 4 — Stored data normalization and legacy compatibility

- diseñar y aplicar una migración o script de backfill para valores legacy almacenados (`/dashboard`, `/internal/dashboard` u otros equivalentes ambiguos)
- resolver explícitamente si el canonical source del home path vive solo en `client_users`, si `clients.portal_home_path` sigue existiendo como compat layer, o si debe retirarse del runtime path
- definir la política de compatibilidad de `/dashboard`:
  - redirect controlado a `/home`, o
  - feature route legacy explícita pero fuera del startup contract
- si `/dashboard` sigue accesible, endurecer el render ante ausencia de signals para que la compatibilidad no dependa de data perfecta

### Slice 5 — Blast radius verification and operational docs

- validar root routing autenticado, auth landing, agent auth, guards sin acceso, menus y rutas legacy
- dejar documentación corta en `Handoff.md`, `changelog.md` y, si aplica, actualizar `ISSUE-044`/`TASK-378` para separar claramente SSR resilience vs. contract governance

## Out of Scope

- rediseñar visualmente `Home` o `Dashboard`
- rehacer la arquitectura completa de navegación del portal
- cambiar roles o authorized views sin necesidad real
- mezclar esta lane con mejoras amplias de métricas o analytics fuera del hardening mínimo de compatibilidad para `/dashboard`

## Detailed Spec

### Principio rector

`portalHomePath` no debe seguir tratándose como un string libre con fallbacks locales. Debe pasar a modelarse como un contrato gobernado de plataforma.

### Solución robusta recomendada

1. **Resolver centralizado**
   - un helper canónico para startup / fallback / legacy compatibility
   - puede convivir con `resolvePortalHomePath()` si se evoluciona sin romper sesión, o reemplazarlo si se hace con tests y blast radius controlado

2. **Allowed values / normalization**
   - allowed set explícito de rutas de home soportadas
   - legacy aliases normalizados (`/internal/dashboard`, `/dashboard`)
   - rechazo o remapeo de valores no soportados
   - store contract explícito entre PG / BQ / session view / provisioning

3. **Contratos separados**
   - `startup home`: a dónde entra el usuario al autenticarse
   - `access denied fallback`: a dónde vuelve cuando intenta abrir una ruta sin permiso
   - `legacy route compatibility`: qué hacer si llega a una ruta vieja o si existe persistida en DB

4. **Backfill**
   - los valores persistidos deben converger con la policy y no depender de remapeo infinito on-read
   - incluir estrategia dry-run / conteo previo si la normalización toca datos reales de usuarios o tenants
   - contemplar que hoy el drift no es solo de valores legacy, sino de doble store (`client_users.default_portal_home_path` vs `clients.portal_home_path`)

5. **Compatibilidad controlada**
   - si `/dashboard` sigue existiendo, no debe seguir siendo default estructural
   - si queda como compat route, debe tener render resiliente para estados vacíos y data faltante

### Contratos que no deben romperse

- shape del JWT/session de NextAuth
- payload de `POST /api/auth/agent-session`
- landings especializadas existentes:
  - HR -> `/hr/payroll`
  - Finance -> `/finance`
  - collaborator puro -> `/my`
- enlaces explícitos a dashboards legacy cuando sean acciones deliberadas del producto y no fallbacks estructurales

### Módulos / flows que pueden verse afectados

- login -> redirect inicial
- `GET /`
- `GET /auth/landing`
- `POST /api/auth/agent-session`
- tenant access resolution y bootstrap de session
- provisioning de membresías / contactos
- navegación shell (sidebar, user dropdown, shortcuts, search suggestions)
- metadata operacional (welcome notifications, `view-access-catalog`, action URLs)
- redirects de guards en `src/app/(dashboard)/**`
- pruebas headless y smoke checks de staging

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `GET /` autenticado resuelve al home canonico y ya no depende de `|| '/dashboard'`
- [x] `auth/landing`, `agent-session`, session auth y provisioning usan la misma policy de home
- [x] no quedan fallbacks estructurales a `/dashboard` fuera de compatibilidad legacy explícitamente documentada
- [x] los valores legacy persistidos relevantes quedan normalizados o remapeados mediante policy + backfill gobernado
- [x] `/dashboard` deja de ser el startup contract del portal
- [x] si `/dashboard` sigue accesible por compatibilidad, no explota cuando faltan quality/delivery signals
- [x] existe cobertura de tests para internal, HR, finance, collaborator puro, legacy aliases y valores no soportados

## Verification

- `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- `pnpm staging:request /`
- `pnpm staging:request /home`
- `pnpm staging:request /dashboard`
- verificación manual de navegación autenticada en preview o staging

Verificación local efectiva de cierre:

- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src scripts`
- runtime local autenticado vía `POST /api/auth/agent-session` contra `http://localhost:3105`
  - `GET /` -> `307 /hr/payroll`
  - `GET /home` -> `200`
  - `GET /dashboard` -> `200`
  - `GET /hr/payroll` -> `200`
- hallazgo resuelto durante verificación:
  - `next.config.ts` todavía tenía un redirect global `/ -> /dashboard`; se eliminó para que el root respete la resolución canónica de `src/app/page.tsx`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `ISSUE-044` y `TASK-378` quedaron reconciliadas documentalmente para separar SSR issue de contract governance issue

## Follow-ups

- evaluar si `portalHomePath` debe evolucionar a una noción mas tipada que una ruta raw persistida
- agregar smoke automático de entrypoints autenticados al toolkit de verificación headless
- revisar si `person-context` y otros consumers con `defaultPortalHomePath` requieren normalización adicional
- reconciliar la documentación arquitectónica que aún trata `/dashboard` y `/internal/dashboard` como homes canónicos

## Open Questions

- para tenants cliente externos sin explicit override, ¿el startup canonico debe ser `/home`, `/my` o una lens cliente distinta en roadmap?
- ¿`/dashboard` quedará como redirect puro o como feature route legacy visible solo para cohortes concretas?
