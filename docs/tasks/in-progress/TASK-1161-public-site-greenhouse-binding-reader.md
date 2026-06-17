# TASK-1161 — Public Site Greenhouse Binding Reader (read-API-first)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `staging verified, production rollout pendiente`
- Rank: `TBD`
- Domain: `platform|public-site|marketing-ops|integrations|ops`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Primera pieza del control-plane de EPIC-019: un **reader read-only gobernado** que expone, **desde Greenhouse**, el estado del rail público Astro/Vercel — binding repo↔Vercel, estado de deploy (GitHub HEAD + Vercel deployments) y route ownership — como un contrato versionado `public-site-astro-binding.v1`. Reusa los readers de GitHub/Vercel del Release Control Plane + el composer de Platform Health (TASK-672) con timeout por fuente y degradación honesta. **Solo lectura**: nada de deploy/rollback/asset writes (esos son tasks posteriores del epic).

## Why This Task Exists

TASK-1159 dejó el rail Astro production-grade y deployado (`efeonce-web.vercel.app`), pero ese sitio se gestiona hoy por **código + git + Vercel**, NO desde Greenhouse. El operador pidió explícitamente "controlar el sitio desde Greenhouse". El control-plane (EPIC-019) se construye read-first: antes de cualquier command de deploy/rollback, Greenhouse necesita **ver** el estado del rail como un contrato gobernado (Full API Parity — la UI/agente es cliente de un reader server-side, no de GitHub/Vercel directo).

La decisión `GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1` ya nombró las capabilities (`public_site.runtime_binding.read`, `public_site.route_ownership.read`) y el observability contract (`public_site.astro_deploy_failed`, `public_site.route_canonical_mismatch`, …). Esta task materializa el primer reader + las 2 capabilities read + el endpoint + la primera signal. Es el cimiento sobre el que se montan los commands (deploy/rollback/seo-preflight) en tasks siguientes.

## Goal

- Reader canónico server-only que compone el estado del rail público Astro/Vercel en un contrato versionado `public-site-astro-binding.v1` (binding estático + estado live de repo/deploy + route ownership).
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
- `src/lib/public-site/runtime-binding.ts` + `docs/operations/public-site-runtime-repository-binding-20260614.json` — el binding **WordPress/Kinsta** preexistente (rail distinto). Awareness para NO colisionar: el reader Astro es independiente y vive bajo `src/lib/public-site/astro/`.

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

- `src/config/public-site-astro-binding.ts` `[verificar/crear]` (binding estático tipado, derivado del manifest `public-site-astro-runtime-binding-20260616.json`)
- `src/lib/public-site/astro/binding-reader.ts` `[verificar/crear]` (reader canónico server-only; namespace `astro/` para desambiguar del dominio WordPress preexistente en `src/lib/public-site/`)
- `src/lib/public-site/astro/binding-types.ts` `[verificar/crear]` (contrato `public-site-astro-binding.v1`)
- `src/app/api/admin/public-site/binding/route.ts` `[verificar/crear]`
- `src/config/entitlements-catalog.ts` (agregar las 2 capabilities)
- `src/lib/entitlements/runtime.ts` (grants)
- `migrations/<ts>_task-1161-public-site-binding-capabilities.sql` `[verificar/crear]`
- `src/lib/reliability/queries/public-site-astro-deploy-failed.ts` `[verificar/crear]`
- `src/lib/reliability/get-reliability-overview.ts` (wire de la signal)
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md` `[verificar/crear]` (spec del contrato)
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md`, `docs/epics/to-do/EPIC-019-...md`

## Current Repo State

### Already exists

- Binding manifest `v1` con repo (`efeoncepro/efeonce-web`) + vercel (project `efeonce-web`, `prj_i52CnPvaoNB0Lweqk7L7cLimv7W9`, team `efeonce-7670142f`) + stack + readiness.
- Readers GitHub: `src/lib/release/github-helpers.ts` (`githubFetchJson`, `fetchGithubWithTimeout`, `githubRepoCoords`) + `github-app-token-resolver.ts` (GH App token + PAT fallback).
- Reader Vercel: `src/lib/release/preflight/checks/vercel-readiness.ts` (lee deployments + readiness) + `src/lib/cloud/vercel-billing.ts` (patrón de auth Vercel API).
- Composer pattern: `src/lib/platform-health/composer.ts` + `with-source-timeout.ts` (TASK-672) — el molde de "N fuentes en paralelo + timeout + degradación".
- Entitlements: `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` + el guard `capability-grant-coverage.test.ts`.
- **Dominio `public_site` WordPress ya poblado en `src/lib/public-site/`** (trabajo previo, ~2026-06-14): `runtime-binding.ts` (drift-detector filesystem del sitio **WordPress/Kinsta**, contratos `public-site-repository-binding.v1` + `public-site-runtime-drift-report.v1`, manifest `...20260614.json`), `bridge-inspection.ts`/`bridge-signing.ts` (bridge headless WP, `public-site-bridge-inspection.v1`) y `content-factory/` (authoring Gutenberg). Consumido por `scripts/public-website/{runtime-status,deploy-dry-run}.ts`. **Es un rail distinto** (WordPress live) del rail Astro/Vercel que esta task modela (target no-cutover); coexisten durante la ventana de migración.

### Gap

- **No existe ningún reader/contrato del rail Astro/Vercel** en `src/lib/public-site/`. El dominio `public_site` existente (ver "Already exists") modela **WordPress/Kinsta** (drift filesystem + bridge headless + content-factory), NO el deploy state GitHub/Vercel del rail Astro. Las capabilities `public_site.runtime_binding.read` / `public_site.route_ownership.read` de la decisión no se materializaron.
- El reader Astro **NO reusa ni mezcla** `runtime-binding.ts` (WordPress) — son rails distintos. Nace bajo el namespace `src/lib/public-site/astro/` con contrato propio `public-site-astro-binding.v1`.
- El binding manifest Astro es un JSON estático en `docs/operations/`; no hay un config tipado ni un reader que lo componga con estado live de GitHub/Vercel.
- No hay endpoint, capabilities seedeadas, ni signal del subsystem público.
- La `readiness.knownBlockers` del manifest está **stale** (lista TASK-010/011 como no implementadas; TASK-1159 ya cerró SEO foundation + demo routes + landing shell). El reader debe leer **estado live**, no la readiness estática del manifest.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (+ `reader`, `api`)
- Source of truth afectado: binding manifest (estático) + GitHub API + Vercel API (live); contrato nuevo `public-site-astro-binding.v1`
- Consumidores afectados: UI admin futura, agentes, MCP, commands posteriores del epic
- Runtime target: `production` (reads on-demand; sin worker/cron en MVP)

### Contract surface

- Contrato existente a respetar: Platform Health V1 (`with-source-timeout`, shape `degradedSources[]`/`confidence`), Full API Parity, capability catalog.
- Contrato nuevo: `public-site-astro-binding.v1` (reader + endpoint) + capabilities `public_site.runtime_binding.read` / `public_site.route_ownership.read`.
- Backward compatibility: `not applicable` (todo nuevo, aditivo).
- Full API parity: la UI/agente/MCP consume `GET /api/admin/public-site/binding` (o el reader); NUNCA GitHub/Vercel directo.

### Data model and invariants

- Entidades: ninguna tabla nueva de datos (el binding estático vive en config tipado; el estado live es read-through de GitHub/Vercel). Capabilities en `greenhouse_core.capabilities_registry`.
- Invariantes:
  - El reader NUNCA escribe ni a GitHub ni a Vercel (read-only).
  - El contrato versionado `contractVersion: "public-site-astro-binding.v1"` es estable; cambios breaking → `v2`.
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

## Discovery — 2026-06-17 — Codex

### Intake / ownership

- Hook ejecutado: `pnpm codex:task-hook TASK-1161`.
- Branch actual: `develop` (`ahead 1`), sin cambio de rama ni worktree por regla local-first/multi-agente.
- Ownership activo verificado: no hay rama local `*1161*` ni PR abierto con `TASK-1161` (`gh pr list --search "TASK-1161"` retorna `[]`).
- Checkpoint derivado por proceso: `human` (P1 + Effort Medio). Este plan requiere confirmacion humana antes de escribir runtime code.

### AUDIT: TASK-1161

SUPUESTOS CORRECTOS:
- El rail WordPress/Kinsta ya existe bajo `src/lib/public-site/` y es distinto del rail Astro/Vercel; el reader nuevo debe vivir bajo `src/lib/public-site/astro/`.
- `docs/operations/public-site-astro-runtime-binding-20260616.json` existe y contiene repo `efeoncepro/efeonce-web`, Vercel project `efeonce-web` / `prj_i52CnPvaoNB0Lweqk7L7cLimv7W9`, team slug `efeonce-7670142f`.
- La route ownership matrix existe en `docs/operations/public-site-route-ownership-matrix-20260616.md`.
- `withSourceTimeout` existe en `src/lib/platform-health/with-source-timeout.ts` y es el molde canonico para degradacion honesta.
- `src/lib/release/github-helpers.ts` resuelve token GitHub por GH App/PAT fallback y expone `githubFetchJson`, `fetchGithubWithTimeout`, `buildGithubAuthHeaders`.
- `src/lib/release/preflight/checks/vercel-readiness.ts` contiene el patron de auth/fetch Vercel y timeout de 6s.

SUPUESTOS DESACTUALIZADOS:
- La task menciona en algunos indices `public-site-binding.v1`; la spec completa corrigio el contrato a `public-site-astro-binding.v1`. Accion: usar el nombre corregido en tipos/docs/indices.
- El manifest conserva `readiness.knownBlockers` stale heredados de 2026-06-16; el reader debe exponer estado live y notas honestas, no copiar esos blockers como verdad runtime.
- `vercel-readiness.ts` no exporta hoy su fetch interno de deployments. Accion: hacer refactor/export aditivo reutilizable o crear helper vecino minimo que preserve el mismo patron, evitando duplicacion opaca.

ARQUITECTURA / DOCS OBLIGATORIOS:
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md` — fuente del rail target, capabilities y observability contract.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — programa de control-plane Public Site; actualizar estado de la pieza read.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` + `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader server-side como SSOT programatico.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — signal `public_site.astro_deploy_failed` rollup en `platform/cloud` por MVP.
- `docs/operations/public-site-astro-runtime-binding-20260616.json` + `docs/operations/public-site-route-ownership-matrix-20260616.md` — inputs estaticos.

CÓDIGO EXISTENTE PARA REUTILIZAR:
- `src/lib/release/github-helpers.ts` → token + fetch GitHub.
- `src/lib/release/preflight/checks/vercel-readiness.ts` → patron Vercel API (`/v6/deployments`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`) via export/refactor aditivo.
- `src/lib/platform-health/with-source-timeout.ts` → per-source timeout/degradacion.
- `src/lib/kortex/github-control-plane/reader.ts` + `composer.ts` → molde reciente de reader GitHub con fuentes, warnings, confidence y tests.
- `src/app/api/admin/public-site/bridge-inspection/route.ts` + tests → molde de endpoint admin Public Site con `requireAdminTenantContext`, `can`, captura/redaccion.
- `migrations/20260616133046114_task-1152-roadmap-work-items-read-capability.sql` → seed additive + down migration deprecate.

SCHEMA / RUNTIME REAL:
- Sin tablas nuevas de datos. Solo seed additive en `greenhouse_core.capabilities_registry`.
- Access plane: `entitlements` via `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, migracion de registry y gate route handler.
- Reliability plane: `src/lib/reliability/get-reliability-overview.ts` consume readers preloaded y signals `ReliabilitySignal`; ejemplo reciente `src/lib/reliability/queries/kortex-github-ci-last-status.ts`.

ACCESS MODEL:
- Endpoint app-lane/admin: `requireAdminTenantContext()` + `can(tenant, 'public_site.runtime_binding.read', 'read', 'tenant')` y `can(tenant, 'public_site.route_ownership.read', 'read', 'tenant')`.
- Grants MVP: `EFEONCE_ADMIN` y route group interno/admin si el runtime pattern lo permite; mantener scope `tenant` segun spec.
- No agrega `views`/menu/UI en esta task.

SKILLS A USAR:
- `greenhouse-task-execution-hook` — aplicado por hook Codex TASK.
- `greenhouse-agent` — contexto Greenhouse/Next.js; aplica aunque no haya UI visible por route/server boundary.
- `greenhouse-task-planner` — aplicado para protocolo de task/lifecycle/backend-data.
- `greenhouse-qa-release-auditor` — usar antes de cierre por implementacion no trivial con integration/access/reliability.
- `greenhouse-documentation-governor` — usar en cierre por docs/architecture/changelog/handoff.

SUBAGENTES:
- Si. Cicero explora helpers GitHub/Vercel/Platform Health; Laplace explora capabilities/endpoint/reliability; Erdos revisa docs de cierre. No tienen ownership de escritura en runtime code durante discovery.

RIESGOS / BLAST RADIUS:
- Token GitHub/Vercel sin scope o ausente: debe degradar a `degradedSources[]`/confidence baja, no 5xx.
- Capability catalog sin grant/registry: 403 latente; cubrir con migration + runtime grant + tests.
- Mezclar rail Astro con WordPress/Kinsta: evitar reutilizar `runtime-binding.ts`; namespace `astro/`.
- Vercel deploy "antiguo" no es error: solo `ERROR` en latest production dispara signal.
- Exponer tokens o errores crudos: usar server-only y `redactErrorForResponse`.

OPEN QUESTIONS RESUELTAS:
- Reliability subsystem: MVP rollup en `platform/cloud`, no subsystem nuevo, hasta que haya varias signals Public Site.
- Binding estatico: config tipado en `src/config/public-site-astro-binding.ts`, no tabla.
- Sentry/capture domain: usar `cloud` con tag `source=public_site_binding`.

### Mapa De Conexiones

- Inputs estaticos: manifest Astro runtime binding + route ownership matrix.
- Fuentes live: GitHub REST commits/branches para `efeoncepro/efeonce-web`; Vercel REST deployments por project/team.
- Readers/helpers compartidos: release GitHub helpers, Vercel readiness helper refactor, with-source-timeout.
- Endpoint consumidor: `GET /api/admin/public-site/binding`.
- Access: entitlements catalog/runtime grants + `capabilities_registry`.
- Observabilidad: reliability signal `public_site.astro_deploy_failed` wired a overview.
- Consumidores futuros: Public Site Ops UI, commands deploy/rollback/seo-preflight, TASK-1167 repo/CI control plane.

## Plan — 2026-06-17 — Codex

1. Lifecycle/documental intake.
   - Mover task a `in-progress`, actualizar `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `Handoff.md`.
   - Verificacion: `pnpm task:lint --task TASK-1161` y `pnpm ops:lint --changed` despues de cambios documentales.

2. Contrato + binding estatico.
   - Crear `src/lib/public-site/astro/binding-types.ts` con `public-site-astro-binding.v1`, source status, confidence, repo/deploy/route ownership y notes.
   - Crear `src/config/public-site-astro-binding.ts` tipado desde el manifest JSON; incluir `currentProductionRuntime`, `isTargetFrontendRail` y coordenadas GitHub/Vercel.
   - Crear reader base `src/lib/public-site/astro/binding-reader.ts` para static binding + route ownership sin live sources.
   - Tests focales parser/shape en `src/lib/public-site/astro/*.test.ts`.

3. Fuentes live GitHub + Vercel.
   - GitHub: usar `resolveGithubToken` + `githubFetchJson` para commits/branches `main` y `develop` de `efeoncepro/efeonce-web`; si falta token, marcar fuente `not_configured`.
   - Vercel: extraer/exportar helper reusable desde `vercel-readiness.ts` o helper vecino con el mismo contrato (`VERCEL_TOKEN`, `teamId`, `projectId`, `/v6/deployments`, timeout).
   - Envolver cada fuente con `withSourceTimeout` (~6s) y computar `degradedSources[]`, `confidence`, `status: ok|degraded|empty`.
   - Tests: source caida/timeout/token ausente no lanza 5xx ni estado falso-sano.

4. Capabilities + endpoint.
   - Agregar `public_site.runtime_binding.read` y `public_site.route_ownership.read` en `src/config/entitlements-catalog.ts`.
   - Agregar grants en `src/lib/entitlements/runtime.ts`.
   - Crear migration con `pnpm migrate:create task-1161-public-site-binding-capabilities` y seed additive/deprecate-down.
   - Crear `src/app/api/admin/public-site/binding/route.ts` con `requireAdminTenantContext`, `can`, reader y errores sanitizados.
   - Tests route: 200, 403 sin capability, sanitizacion error.

5. Reliability signal.
   - Crear `src/lib/reliability/queries/public-site-astro-deploy-failed.ts` que consume el reader y emite `public_site.astro_deploy_failed`.
   - Wire en `src/lib/reliability/get-reliability-overview.ts` junto a signals platform/cloud recientes.
   - Tests: latest production deploy `ERROR` => `error`; `READY` o `empty/degraded` => `ok|unknown` honesto segun contrato.

6. Docs/spec cierre.
   - Crear `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md`.
   - Actualizar EPIC-019 child task/state, `project_context.md` si el estado vigente cambia, `changelog.md`, `Handoff.md`, README/registry/task lifecycle.
   - No tocar WordPress/Kinsta runtime ni DNS/cutover.

7. Verificacion.
   - Focal: `pnpm test src/lib/public-site src/app/api/admin/public-site src/lib/reliability/queries/public-site-astro-deploy-failed.test.ts` (ajustar paths reales).
   - Access: capability grant coverage/parity tests focales.
   - Types/lint: `pnpm lint`, `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false`.
   - Docs/tasks: `pnpm task:lint --task TASK-1161`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`.
   - Runtime smoke si secrets disponibles: `GET /api/admin/public-site/binding` con admin agent session; si faltan tokens/scopes, documentar degradacion honesta como rollout pendiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato + binding estático + composer skeleton

- `src/lib/public-site/astro/binding-types.ts`: el contrato `public-site-astro-binding.v1` (binding repo/vercel, estado live placeholder, route ownership, `degradedSources[]`, `confidence`, `contractVersion`).
- `src/config/public-site-astro-binding.ts`: binding estático tipado derivado del manifest JSON (repo coords, vercel coords, stack, canonical URL).
- `src/lib/public-site/astro/binding-reader.ts`: skeleton del reader que compone el binding estático + route ownership (de la matrix), con el shape del composer (sin fuentes live todavía). Unit tests del parser + shape.

### Slice 2 — Fuentes live (GitHub + Vercel) con timeout/degradación

- Wire del estado de repo via `release/github-helpers.ts` (HEAD de `main`/`develop`, último commit, last push de `efeoncepro/efeonce-web`).
- Wire del estado de deploy via los helpers de `preflight/checks/vercel-readiness.ts` (últimos deployments prod + staging del proyecto `efeonce-web`: status/url/sha/age).
- Cada fuente envuelta en `with-source-timeout`; degradación honesta (`degradedSources[]` + `confidence`). Tests de degradación (fuente caída → no 5xx, estado degradado).

### Slice 3 — Capabilities + endpoint gobernado

- Seed `public_site.runtime_binding.read` + `public_site.route_ownership.read` en `entitlements-catalog.ts` + migración a `capabilities_registry` + grant en `runtime.ts` (mismo PR; grant-coverage test verde). Grants: route_group admin ∪ EFEONCE_ADMIN (+ los internos que correspondan).
- `GET /api/admin/public-site/binding`: `requireAdminTenantContext` + `can(...)` + reader + `redactErrorForResponse`/`captureWithDomain`.

### Slice 4 — Reliability signal + spec doc

- `public_site.astro_deploy_failed` (kind=`incident`/`drift`, severity=error si el último deploy prod del proyecto es `Error`, steady=0); reader en `src/lib/reliability/queries/` + wire a `get-reliability-overview.ts` (subsystem nuevo `Public Site` o rollup `cloud`).
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md`: spec del contrato + reuse map; actualizar EPIC-019 (esta pieza read = done) + la `readiness.knownBlockers` stale del manifest.

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
- **Predicado de la signal `public_site.astro_deploy_failed`:** dispara cuando el **último deploy `Production` del proyecto está en estado `Error`**, NO por staleness/antigüedad. El rail Astro es target no-cutover: el apex `efeoncepro.com` aún sirve WordPress/Kinsta (`isCurrentLiveSourceOfTruth: false`) y el manifest reporta `observedDeploymentPosture: ready_and_error_deployments_65d_old` — un rail target legítimamente no deploya seguido, así que "no hubo deploy reciente" NO es una falla. El reader expone `currentProductionRuntime`/`isTargetFrontendRail` en el contrato para que el consumidor entienda el estado de migración sin inferirlo.
- **Estados del contrato:** distinguir explícitamente `ok` / `degraded` (fuente con timeout/caída) / `empty` (proyecto sin deployments todavía) — nunca colapsar a un estado ambiguo (`forms-ux`/`state-design` aplican aunque sea read API: el consumidor necesita saber por qué falta data).

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

- [x] Existe `src/lib/public-site/astro/binding-reader.ts` que devuelve el contrato `public-site-astro-binding.v1` (binding + estado live repo/deploy + route ownership).
- [x] El reader reusa `release/github-helpers.ts` + los helpers Vercel de `preflight/checks/vercel-readiness.ts` + `with-source-timeout` (no reinventa).
- [x] Degradación honesta: una fuente caída/timeout → `degradedSources[]` + `confidence` baja, NUNCA 5xx ni estado falso-sano (test).
- [x] `public_site.runtime_binding.read` + `public_site.route_ownership.read` seedeadas (catalog + `capabilities_registry`) + grant en `runtime.ts`; `capability-grant-coverage.test.ts` verde.
- [x] `GET /api/admin/public-site/binding` gateado por `requireAdminTenantContext` + `can(...)`, errores sanitizados, tokens nunca en la respuesta.
- [x] `public_site.astro_deploy_failed` wired a `get-reliability-overview` (steady=0 en tests; Vercel smoke real production/staging READY).
- [x] Smoke runtime del endpoint deployado con sesión admin en Vercel `staging`: deploy `greenhouse-3jckt2aq4-efeonce-7670142f.vercel.app` (`dpl_6r6aKuS6P8eBWYrzJRR6thppmquw`) `Ready`; `GET /api/admin/public-site/binding` → HTTP 200, `status=ok`, `confidence=high`, `degradedSources=[]`.
- [x] Smoke real de fuentes: Vercel production/staging `READY` y GitHub `main`/`develop` confirmados en SHA `4d050fb`; el reader degradó GitHub en local por falta de token app/PAT, como diseño.
- [x] Cero write a GitHub/Vercel; cero deploy/rollback.

## Verification

- `pnpm test src/lib/public-site/astro/binding-reader.test.ts src/app/api/admin/public-site/__tests__/binding-route.test.ts src/lib/reliability/queries/public-site-astro-deploy-failed.test.ts src/lib/entitlements/capability-grant-coverage.test.ts src/lib/capabilities-registry/parity.test.ts` → 5 files / 17 tests passed.
- `pnpm exec eslint src/lib/public-site/astro/binding-reader.ts src/lib/public-site/astro/binding-types.ts src/config/public-site-astro-binding.ts src/app/api/admin/public-site/binding/route.ts src/lib/reliability/queries/public-site-astro-deploy-failed.ts` → exit 0.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false` → exit 0.
- `pnpm pg:connect:migrate` → migration applied; Kysely types regenerated.
- Smoke reader local with real Vercel: production/staging deployments `READY`, SHA `4d050fb`.
- `gh api repos/efeoncepro/efeonce-web/commits/main` and `develop` → both SHA `4d050fb`.
- Reader local degraded GitHub via its own resolver because no GitHub app/PAT token was configured in the shell; this is expected degraded behavior and not a false-green state.
- `vercel deploy --target=staging --scope efeonce-7670142f --yes` → deploy `https://greenhouse-3jckt2aq4-efeonce-7670142f.vercel.app`, id `dpl_6r6aKuS6P8eBWYrzJRR6thppmquw`, target `staging`, status `Ready`, aliases `dev-greenhouse.efeoncepro.com` / `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`.
- `STAGING_URL=https://greenhouse-3jckt2aq4-efeonce-7670142f.vercel.app pnpm staging:request /api/admin/public-site/binding --pretty` → HTTP 200, `contractVersion=public-site-astro-binding.v1`, `status=ok`, `confidence=high`, GitHub `main`/`develop` at `4d050fb`, Vercel production/staging `READY`, `degradedSources=[]`.
- `/api/admin/reliability` staging incluye `public_site.astro_deploy_failed` con `severity=ok`, `production_status=READY` y deployment uid `dpl_8toLsToDdf4UPGVx1L3s5CkxemfB`.
- `vercel logs greenhouse-3jckt2aq4-efeonce-7670142f.vercel.app --no-follow --since 30m --level error --expand --scope efeonce-7670142f` → no error logs found.
- Pending before full operational closure: repetir smoke en `production` despues de release/promocion aprobada; no se hizo production deploy ni cutover.

## Closing Protocol

- [x] `Lifecycle` sincronizado como `in-progress` hasta production rollout smoke.
- [x] el archivo vive en la carpeta correcta (`docs/tasks/in-progress/`) para `staging verified, production rollout pendiente`.
- [x] `docs/tasks/README.md` sincronizado.
- [x] `Handoff.md` actualizado.
- [x] `changelog.md` actualizado.
- [x] chequeo de impacto cruzado (EPIC-019 — marcar la pieza read; manifest readiness stale).
- [x] spec `GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md` creada y enlazada desde EPIC-019.

## Follow-ups

- Command de deploy (`public_site.asset_change.deploy` / trigger build Vercel desde Greenhouse) — con audit/outbox + approval.
- Command de rollback (`public_site.asset_change.rollback`).
- `seo_preflight.run` (canonical/sitemap/redirects/HubSpot checks) como reader/command.
- UI Public Site Ops (read view) consumiendo este reader.
- Lane ecosystem si una sister-platform necesita leer el binding.

## Open Questions

- ¿Subsystem de reliability propio (`Public Site`) o rollup en `cloud`? **Recomendación MVP: rollup en `cloud`.** Promover a subsystem propio cuando emerjan ≥3 signals (la decisión nombra 7 futuras). YAGNI ahora.
- ¿El binding estático se queda como config tipado en `src/config/` o se promueve a una tabla `greenhouse_core` cuando haya >1 sitio? MVP: config tipado (YAGNI tabla).
- ¿Dominio Sentry `public_site` nuevo o reusar `cloud`? **Verificado: el union `CaptureDomain` (`src/lib/observability/capture.ts`) NO tiene `public_site`; sí tiene `cloud`.** MVP: usar `cloud` con `tags: { source: 'public_site_binding' }`. Agregar `public_site` al union solo si emergen incidents propios recurrentes.

### Resuelto en análisis arquitectónico (2026-06-17)

- **Naming/colisión:** el contrato es `public-site-astro-binding.v1` y los archivos viven bajo `src/lib/public-site/astro/` (+ `src/config/public-site-astro-binding.ts`). Esto desambigua del binding WordPress preexistente (`public-site-repository-binding.v1` en `runtime-binding.ts`) y sobrevive al cutover. El reader Astro NO reusa ni mezcla el dominio WordPress.
- **"Gap" corregido:** `src/lib/public-site/` ya está poblado por el dominio WordPress/Kinsta (drift filesystem + bridge headless + content-factory). El gap real es la ausencia del reader del rail **Astro/Vercel**, no del dominio entero.
- **Endpoint:** se mantiene `/api/admin/public-site/binding` (sin colisión HTTP — el rail WordPress es script-driven, no expone endpoint).
