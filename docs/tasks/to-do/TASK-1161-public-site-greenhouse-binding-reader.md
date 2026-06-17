# TASK-1161 — Public Site Greenhouse Binding Reader (read-API-first)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|public-site|marketing-ops|integrations|ops`
- Blocked by: `none`
- Branch: `task/TASK-1161-public-site-binding-reader`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Primera pieza del control-plane de EPIC-019: un **reader read-only gobernado** que expone, **desde Greenhouse**, el estado del rail público Astro/Vercel — binding repo↔Vercel, estado de deploy (GitHub HEAD + Vercel deployments) y route ownership — como un contrato versionado `public-site-binding.v1`. Reusa los readers de GitHub/Vercel del Release Control Plane + el composer de Platform Health (TASK-672) con timeout por fuente y degradación honesta. **Solo lectura**: nada de deploy/rollback/asset writes (esos son tasks posteriores del epic).

## Why This Task Exists

TASK-1159 dejó el rail Astro production-grade y deployado (`efeonce-web.vercel.app`), pero ese sitio se gestiona hoy por **código + git + Vercel**, NO desde Greenhouse. El operador pidió explícitamente "controlar el sitio desde Greenhouse". El control-plane (EPIC-019) se construye read-first: antes de cualquier command de deploy/rollback, Greenhouse necesita **ver** el estado del rail como un contrato gobernado (Full API Parity — la UI/agente es cliente de un reader server-side, no de GitHub/Vercel directo).

La decisión `GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1` ya nombró las capabilities (`public_site.runtime_binding.read`, `public_site.route_ownership.read`) y el observability contract (`public_site.astro_deploy_failed`, `public_site.route_canonical_mismatch`, …). Esta task materializa el primer reader + las 2 capabilities read + el endpoint + la primera signal. Es el cimiento sobre el que se montan los commands (deploy/rollback/seo-preflight) en tasks siguientes.

## Goal

- Reader canónico server-only que compone el estado del rail público Astro/Vercel en un contrato versionado `public-site-binding.v1` (binding estático + estado live de repo/deploy + route ownership).
- Reusar los readers existentes de GitHub (`src/lib/release/github-helpers.ts`) y Vercel (`src/lib/release/preflight/checks/vercel-readiness.ts`) + el composer con timeout/degradación de Platform Health — no reinventar.
- Capabilities `public_site.runtime_binding.read` + `public_site.route_ownership.read` (catalog + DB registry seed + grant en runtime, mismo PR).
- Endpoint app-lane `GET /api/admin/public-site/binding` gobernado (auth + capability + errores sanitizados).
- Primera reliability signal del subsystem público (`public_site.astro_deploy_failed`).
- Degradación honesta: si GitHub/Vercel falla o timeouts, el contrato baja `confidence` y marca `degradedSources[]` — NUNCA un 5xx ni un estado falso-sano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md` — la decisión que nombra las capabilities `public_site.*` + el observability contract. Source of truth de los nombres.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — el programa; esta es la pieza read del control-plane.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lanes app/ecosystem + Platform Health V1 (el molde del composer).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — read-API-first: el reader es el SSOT, la UI/agente/MCP son clientes.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registro de la signal nueva.
- `docs/operations/public-site-astro-runtime-binding-20260616.json` — el binding manifest `v1` (repo/vercel coords). Fuente del binding estático.
- `docs/operations/public-site-route-ownership-matrix-20260616.md` — la route ownership matrix.

Reglas obligatorias:

- **Read-API-first (Full API Parity).** El reader vive en `src/lib/**` y expone un contrato versionado; la UI/agente/MCP lo consumen — NUNCA pegan a GitHub/Vercel directo.
- **Reuse, no reinvent.** GitHub via `src/lib/release/github-helpers.ts` + `github-app-token-resolver.ts`; Vercel via los helpers de `src/lib/release/preflight/checks/vercel-readiness.ts`; composición con `src/lib/platform-health/with-source-timeout.ts` + el patrón de `composer.ts`.
- **Degradación honesta** (Platform Health): cada fuente con timeout propio; una fuente caída → `degradedSources[]` + baja `confidence`, nunca 5xx ni estado falso-sano.
- **Capability grant coverage** (TASK-873/935): toda capability nueva se siembra en `src/config/entitlements-catalog.ts` + `greenhouse_core.capabilities_registry` (migración) + grant en `src/lib/entitlements/runtime.ts` **en el mismo PR**; el guard `capability-grant-coverage.test.ts` debe pasar.
- **Cero write.** Sin deploy/rollback/asset_change/seo_preflight — esos son `public_site.asset_change.*` / `public_site.*.deploy` en tasks posteriores.
- **Secretos server-only.** El token GitHub se resuelve con el resolver existente (GH App → PAT fallback); el token Vercel via el patrón existente. NUNCA exponer tokens en la respuesta ni en logs (`redactErrorForResponse`).

## Normative Docs

- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` — si emerge necesidad de refresco periódico (no en MVP; el reader es on-demand).

## Dependencies & Impact

### Depends on

- `EPIC-019` (programa) + la decisión `..._ASTRO_RUNTIME_STRATEGY_DECISION_V1`.
- Readers existentes: `src/lib/release/github-helpers.ts`, `src/lib/release/github-app-token-resolver.ts`, `src/lib/release/preflight/checks/vercel-readiness.ts`, `src/lib/platform-health/with-source-timeout.ts`.
- El binding manifest `docs/operations/public-site-astro-runtime-binding-20260616.json` (repo/vercel coords).

### Blocks / Impacts

- Desbloquea las tasks de commands del control-plane (deploy/rollback/seo-preflight) — todas consumen este reader.
- Habilita una futura UI de Public Site Ops en Greenhouse (read primero).

### Files owned

- `src/config/public-site-binding.ts` `[verificar/crear]` (binding estático tipado, derivado del manifest)
- `src/lib/public-site/binding-reader.ts` `[verificar/crear]` (reader canónico server-only)
- `src/lib/public-site/binding-types.ts` `[verificar/crear]` (contrato `public-site-binding.v1`)
- `src/app/api/admin/public-site/binding/route.ts` `[verificar/crear]`
- `src/config/entitlements-catalog.ts` (agregar las 2 capabilities)
- `src/lib/entitlements/runtime.ts` (grants)
- `migrations/<ts>_task-1161-public-site-binding-capabilities.sql` `[verificar/crear]`
- `src/lib/reliability/queries/public-site-astro-deploy-failed.ts` `[verificar/crear]`
- `src/lib/reliability/get-reliability-overview.ts` (wire de la signal)
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_BINDING_READER_V1.md` `[verificar/crear]` (spec del contrato)
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`, `docs/epics/to-do/EPIC-019-...md`

## Current Repo State

### Already exists

- Binding manifest `v1` con repo (`efeoncepro/efeonce-web`) + vercel (project `efeonce-web`, `prj_i52CnPvaoNB0Lweqk7L7cLimv7W9`, team `efeonce-7670142f`) + stack + readiness.
- Readers GitHub: `src/lib/release/github-helpers.ts` (`githubFetchJson`, `fetchGithubWithTimeout`, `githubRepoCoords`) + `github-app-token-resolver.ts` (GH App token + PAT fallback).
- Reader Vercel: `src/lib/release/preflight/checks/vercel-readiness.ts` (lee deployments + readiness) + `src/lib/cloud/vercel-billing.ts` (patrón de auth Vercel API).
- Composer pattern: `src/lib/platform-health/composer.ts` + `with-source-timeout.ts` (TASK-672) — el molde de "N fuentes en paralelo + timeout + degradación".
- Entitlements: `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` + el guard `capability-grant-coverage.test.ts`.

### Gap

- No existe ningún reader/contrato `public_site.*` en `src/lib/**` (la decisión nombró las capabilities pero no se materializaron).
- El binding manifest es un JSON estático en `docs/operations/`; no hay un config tipado ni un reader que lo componga con estado live.
- No hay endpoint, capabilities seedeadas, ni signal del subsystem público.
- La `readiness.knownBlockers` del manifest está **stale** (lista TASK-010/011 como no implementadas; TASK-1159 ya cerró SEO foundation + demo routes + landing shell). El reader debe leer **estado live**, no la readiness estática del manifest.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (+ `reader`, `api`)
- Source of truth afectado: binding manifest (estático) + GitHub API + Vercel API (live); contrato nuevo `public-site-binding.v1`
- Consumidores afectados: UI admin futura, agentes, MCP, commands posteriores del epic
- Runtime target: `production` (reads on-demand; sin worker/cron en MVP)

### Contract surface

- Contrato existente a respetar: Platform Health V1 (`with-source-timeout`, shape `degradedSources[]`/`confidence`), Full API Parity, capability catalog.
- Contrato nuevo: `public-site-binding.v1` (reader + endpoint) + capabilities `public_site.runtime_binding.read` / `public_site.route_ownership.read`.
- Backward compatibility: `not applicable` (todo nuevo, aditivo).
- Full API parity: la UI/agente/MCP consume `GET /api/admin/public-site/binding` (o el reader); NUNCA GitHub/Vercel directo.

### Data model and invariants

- Entidades: ninguna tabla nueva de datos (el binding estático vive en config tipado; el estado live es read-through de GitHub/Vercel). Capabilities en `greenhouse_core.capabilities_registry`.
- Invariantes:
  - El reader NUNCA escribe ni a GitHub ni a Vercel (read-only).
  - El contrato versionado `contractVersion: "public-site-binding.v1"` es estable; cambios breaking → `v2`.
  - Una fuente caída/timeout NUNCA produce un estado falso-sano: degrada (`degradedSources[]` + `confidence` baja).
- Tenant/space boundary: capability de tenant admin (no per-space); el sitio público es global de Efeonce.
- Idempotency/concurrency: read-only, sin estado mutable; cache in-process opcional TTL ~30s (patrón Platform Health).
- Audit/outbox/history: `none` con rationale — es un reader read-only; sin mutación, sin audit. (Los commands posteriores SÍ tendrán audit/outbox.)

### Migration, backfill and rollout

- Migration posture: `additive` (solo seed de 2 capabilities en `capabilities_registry`; sin tablas de datos, sin columnas mutadas).
- Default state: `read-only` (no hay flag; el endpoint nace gobernado por capability).
- Backfill plan: N/A (no hay datos a backfillear).
- Rollback path: `revert PR` (+ down-migration que marca las capabilities deprecadas; append-only, no DELETE).
- External coordination: confirmar que el token GitHub (GH App / PAT) y el token Vercel ya resueltos por los helpers existentes cubren los reads necesarios (deployments del proyecto `efeonce-web`); si falta scope, documentar.

### Security and access

- Auth/access gate: `requireAdminTenantContext` + `can(tenant, 'public_site.runtime_binding.read'|'public_site.route_ownership.read', 'read', 'tenant')`.
- Sensitive data posture: tokens GitHub/Vercel son server-only; NUNCA en la respuesta ni en logs.
- Error contract: `canonicalErrorResponse` + `redactErrorForResponse` + `captureWithDomain(err, 'cloud', { tags: { source: 'public_site_binding' } })` (o dominio nuevo `public_site` si se agrega al union).
- Abuse/rate-limit posture: cache TTL ~30s mitiga hammering de GitHub/Vercel; sin rate-limit dedicado en MVP (endpoint admin-only).

### Runtime evidence

- Local checks: unit tests del composer + degradación (mock GitHub/Vercel) + parser del binding estático.
- DB/runtime checks: `pnpm migrate:up` + verify las 2 capabilities en `capabilities_registry`; `capability-grant-coverage.test.ts` verde.
- Integration checks: smoke real contra GitHub (`efeoncepro/efeonce-web` HEAD) + Vercel (deployments del proyecto) — confirmar que el reader devuelve estado real (main=`4d050fb`, prod deploy `Ready`).
- Reliability signals/logs: `public_site.astro_deploy_failed` (steady=0) en `/admin/operations`.
- Production verification sequence: (1) migrate staging + verify capabilities; (2) deploy + `GET /api/admin/public-site/binding` con admin → 200 + estado real; (3) repetir en prod; (4) signal en steady.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes (read-only, contrato versionado, degradación honesta) + access boundary explícitos.
- [ ] Migration additive (solo seed de capabilities) + rollback (revert/deprecate) explícitos.
- [ ] Evidencia runtime: smoke real GitHub + Vercel + signal en steady.
- [ ] Tokens server-only, errores sanitizados, sin leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato + binding estático + composer skeleton

- `src/lib/public-site/binding-types.ts`: el contrato `public-site-binding.v1` (binding repo/vercel, estado live placeholder, route ownership, `degradedSources[]`, `confidence`, `contractVersion`).
- `src/config/public-site-binding.ts`: binding estático tipado derivado del manifest JSON (repo coords, vercel coords, stack, canonical URL).
- `src/lib/public-site/binding-reader.ts`: skeleton del reader que compone el binding estático + route ownership (de la matrix), con el shape del composer (sin fuentes live todavía). Unit tests del parser + shape.

### Slice 2 — Fuentes live (GitHub + Vercel) con timeout/degradación

- Wire del estado de repo via `release/github-helpers.ts` (HEAD de `main`/`develop`, último commit, last push de `efeoncepro/efeonce-web`).
- Wire del estado de deploy via los helpers de `preflight/checks/vercel-readiness.ts` (últimos deployments prod + staging del proyecto `efeonce-web`: status/url/sha/age).
- Cada fuente envuelta en `with-source-timeout`; degradación honesta (`degradedSources[]` + `confidence`). Tests de degradación (fuente caída → no 5xx, estado degradado).

### Slice 3 — Capabilities + endpoint gobernado

- Seed `public_site.runtime_binding.read` + `public_site.route_ownership.read` en `entitlements-catalog.ts` + migración a `capabilities_registry` + grant en `runtime.ts` (mismo PR; grant-coverage test verde). Grants: route_group admin ∪ EFEONCE_ADMIN (+ los internos que correspondan).
- `GET /api/admin/public-site/binding`: `requireAdminTenantContext` + `can(...)` + reader + `redactErrorForResponse`/`captureWithDomain`.

### Slice 4 — Reliability signal + spec doc

- `public_site.astro_deploy_failed` (kind=`incident`/`drift`, severity=error si el último deploy prod del proyecto es `Error`, steady=0); reader en `src/lib/reliability/queries/` + wire a `get-reliability-overview.ts` (subsystem nuevo `Public Site` o rollup `cloud`).
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_BINDING_READER_V1.md`: spec del contrato + reuse map; actualizar EPIC-019 (esta pieza read = done) + la `readiness.knownBlockers` stale del manifest.

## Out of Scope

- Cualquier **write**: deploy, rollback, asset_change, seo_preflight, crear/editar landings desde Greenhouse. Son tasks posteriores del epic (commands).
- UI de Public Site Ops (read view) — follow-up; MVP es el reader + endpoint (consumible por agente/MCP/curl).
- DNS / cutover del apex / tocar WordPress/Kinsta.
- Lane ecosystem (`/api/platform/ecosystem/*`) — MVP es app-lane admin; ecosystem es follow-up si una sister-platform lo necesita.
- Refresco periódico (cron/worker) — el reader es on-demand con cache TTL corto.

## Detailed Spec

- **Composición (Platform Health mold):** el reader corre las fuentes en paralelo (`Promise.all` + `with-source-timeout` por fuente): (a) binding estático (sync, config), (b) route ownership (sync, config), (c) GitHub repo state (async, timeout ~6s), (d) Vercel deploy state (async, timeout ~6s). Cada async source degradada → `degradedSources.push(name)` + `confidence` baja. El contrato nunca lanza por una fuente caída.
- **Estado live de Vercel:** reusar el patrón de `vercel-readiness.ts` para listar deployments del proyecto `efeonce-web` (team `efeonce-7670142f`), filtrar el último `Production` y el último `staging`, devolver `{ status, url, sha, age, environment }`. Verificado live 2026-06-16: prod `Ready` en `efeonce-web.vercel.app`.
- **Estado live de GitHub:** reusar `release/github-helpers.ts` para `GET /repos/efeoncepro/efeonce-web/commits/{main,develop}` → `{ sha, message, committedAt }`. El token via el resolver GH App existente.
- **Drift hint (read-only):** el contrato puede exponer un `notes[]` cuando el SHA del último deploy prod ≠ HEAD de `main` (sin actuar — solo visibilidad; el command de deploy es otra task).

## Rollout Plan & Risk Matrix

Cambio aditivo backend read-only: nuevo reader + endpoint gateado + 2 capabilities + 1 signal. Sin migración destructiva, sin writes externos, sin mutación de estado. El riesgo material es operacional (reads de API externa) + governance (capability seed), no de datos.

### Slice ordering hard rule

- Slice 1 (contrato + estático) → Slice 2 (fuentes live) → Slice 3 (capabilities + endpoint) → Slice 4 (signal + spec).
- Slice 3 (capability seed) DEBE incluir migración + grant en el mismo PR (grant-coverage test). El endpoint no se expone sin las capabilities seedeadas.
- Slice 4 puede correr en paralelo con Slice 3 una vez que el reader (Slice 2) cerró.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| GitHub/Vercel API caída o lenta → endpoint cuelga/5xx | integration | medium | `with-source-timeout` por fuente + degradación honesta (`degradedSources[]`, `confidence`); cache TTL 30s | endpoint devuelve `degraded`, no 5xx |
| Capability seedeada sin grant → 403 para todos | identity / access | medium | seed catalog + migración + grant runtime mismo PR; `capability-grant-coverage.test.ts` | guard test rompe build |
| Token GitHub/Vercel leakea en respuesta/logs | security | low | tokens server-only; `redactErrorForResponse`; nunca en el contrato | review del response shape |
| Token Vercel sin scope para leer deployments del proyecto | integration | low | confirmar scope en Discovery (Slice 2 smoke); degradar honesto si falta | source vercel = degraded |
| Binding estático drift vs realidad (repo renombrado, proyecto movido) | platform | low | el reader lee estado LIVE; el estático es solo coords; un drift se ve en `notes[]` | mismatch en el contrato |

### Feature flags / cutover

Sin flag — aditivo, read-only, gateado por capability desde el nacimiento. Cutover inmediato (el endpoint solo lo ve quien tiene la capability). Revert: `revert PR` + down-migration (deprecate capabilities, append-only).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert (solo agrega tipos/config/reader sin consumidor) | <5 min | si |
| Slice 2 | revert del wire de fuentes live | <10 min | si |
| Slice 3 | revert PR + down-migration marca capabilities deprecadas (append-only) | <15 min | si |
| Slice 4 | revert del wire de la signal | <10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging + verify las 2 capabilities en `capabilities_registry`.
2. `capability-grant-coverage.test.ts` + `pnpm test src/lib/public-site` verdes.
3. Deploy a staging + `GET /api/admin/public-site/binding` con sesión admin → 200 + estado real (main=HEAD, prod deploy status).
4. Smoke de degradación: simular timeout de una fuente → contrato `degraded`, no 5xx.
5. Repetir 1-3 en producción.
6. Verify `public_site.astro_deploy_failed` en steady (0) en `/admin/operations`.

### Out-of-band coordination required

- Confirmar que el token GitHub (GH App / PAT existente) y el token Vercel cubren reads del repo `efeonce-web` + deployments del proyecto. Si falta scope/secret, documentar y degradar honesto (no inventar secrets). Sin esto, repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/public-site/binding-reader.ts` que devuelve el contrato `public-site-binding.v1` (binding + estado live repo/deploy + route ownership).
- [ ] El reader reusa `release/github-helpers.ts` + los helpers Vercel de `preflight/checks/vercel-readiness.ts` + `with-source-timeout` (no reinventa).
- [ ] Degradación honesta: una fuente caída/timeout → `degradedSources[]` + `confidence` baja, NUNCA 5xx ni estado falso-sano (test).
- [ ] `public_site.runtime_binding.read` + `public_site.route_ownership.read` seedeadas (catalog + `capabilities_registry`) + grant en `runtime.ts`; `capability-grant-coverage.test.ts` verde.
- [ ] `GET /api/admin/public-site/binding` gateado por `requireAdminTenantContext` + `can(...)`, errores sanitizados, tokens nunca en la respuesta.
- [ ] `public_site.astro_deploy_failed` wired a `get-reliability-overview` (steady=0).
- [ ] Smoke real: el endpoint devuelve estado live correcto (main SHA + prod deploy `Ready` del proyecto `efeonce-web`).
- [ ] Cero write a GitHub/Vercel; cero deploy/rollback.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/public-site` + `capability-grant-coverage.test.ts`
- `pnpm migrate:up` + verify capabilities en `capabilities_registry`
- Smoke real: `GET /api/admin/public-site/binding` (agent session) → estado live de `efeonce-web`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-019 — marcar la pieza read; manifest readiness stale)
- [ ] spec `GREENHOUSE_PUBLIC_SITE_BINDING_READER_V1.md` creada y enlazada desde EPIC-019

## Follow-ups

- Command de deploy (`public_site.asset_change.deploy` / trigger build Vercel desde Greenhouse) — con audit/outbox + approval.
- Command de rollback (`public_site.asset_change.rollback`).
- `seo_preflight.run` (canonical/sitemap/redirects/HubSpot checks) como reader/command.
- UI Public Site Ops (read view) consumiendo este reader.
- Lane ecosystem si una sister-platform necesita leer el binding.

## Open Questions

- ¿Subsystem de reliability propio (`Public Site`) o rollup en `cloud`? Decidir en Plan Mode según cuántas signals emerjan.
- ¿El binding estático se queda como config tipado en `src/config/` o se promueve a una tabla `greenhouse_core` cuando haya >1 sitio? MVP: config tipado (YAGNI tabla).
- ¿Dominio Sentry `public_site` nuevo o reusar `cloud`? Si emergen varias signals/incidents propios, agregar el dominio al union de `captureWithDomain`.
