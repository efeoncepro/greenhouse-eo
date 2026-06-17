# TASK-1162 - Kortex Greenhouse Control Plane Reader MVP

<!-- ZONE 0 - IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP. -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Code complete local-first; rollout/staging endpoint smoke pendiente`
- Rank: `TBD`
- Domain: `platform|crm|integrations|ops|ecosystem`
- Blocked by: `none`
- Branch: `task/TASK-1162-kortex-control-plane-reader`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el primer reader gobernado para controlar Kortex desde Greenhouse sin absorber su runtime: repo status de `efeoncepro/kortex` via GitHub, estado runtime Kortex via Cloud Run/OpenAPI, resumen por portal/binding (`portal_id` / `hubspot_portal_id`), capabilities disponibles y salud operativa basica. El contrato nace read-only como `kortex-control-plane-reader.v1`; los commands mutativos quedan fuera hasta que Kortex tenga un adapter Greenhouse seguro con auth, idempotencia y audit.

## Why This Task Exists

El operador necesita poder controlar el repo de Kortex y sus capacidades desde Greenhouse. El descubrimiento confirma que Kortex ya existe como repo hermano (`efeoncepro/kortex`), tiene runtime propio en Cloud Run, Vercel, Cloud SQL, HubSpot OAuth, endpoints operativos (`/api/v1/audits/*`, `/api/v1/strategy/*`, `/api/v1/portals/{hubspot_portal_id}/adoption-kpis`) y un bridge read-only Kortex -> Greenhouse (`/api/v1/greenhouse/context`). Pero Greenhouse todavia no tiene el sentido inverso: un control plane que pueda observar Kortex, resolver bindings y exponer capacidades de forma gobernada.

La regla de ecosistema dice que Kortex sigue siendo peer system, no modulo del portal. Por eso el primer corte debe ser read-first: Greenhouse ve repo/runtime/capabilities/status con tenancy explicita, sin tocar HubSpot ni ejecutar release candidates. Los writes posteriores requieren un adapter Kortex especifico para Greenhouse; llamar directamente endpoints internos mutativos de Kortex desde Greenhouse seria acoplamiento fragil.

## Goal

- Crear un contrato server-side `kortex-control-plane-reader.v1` que componga repo status, runtime status y summary operativo Kortex por binding.
- Reutilizar `sister_platform_bindings` para resolver `portal_id` / `hubspot_portal_id` hacia scope Greenhouse sin inferencias por nombre.
- Consumir GitHub via helpers/CLI/API autenticados para repo status de `efeoncepro/kortex`.
- Consumir Kortex runtime read-only con timeouts, degradacion honesta y secretos server-only.
- Exponer un endpoint admin read-only en Greenhouse para agentes/UI futura.
- Dejar explicitamente fuera los commands mutativos hasta que exista un adapter Kortex Greenhouse-safe.

<!-- ZONE 1 - CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?" -->

## Architecture Alignment

Revisar y respetar:

- `docs/context/03_ecosistema-producto.md` - Kortex es plataforma independiente que alimenta Greenhouse como hub.
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` - boundary peer-system y ownership split.
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` - contrato marco de plataformas hermanas.
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md` - binding runtime y consumer auth existente.
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` - capability catalog y regla de no mezclar `kortex.*` en entitlements internos.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` - Full API Parity, lanes app/ecosystem y command/idempotency foundation.
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` - Kortex como repo hermano y source of truth de su propio runtime.
- `/Users/jreye/Documents/dev/kortex/AGENTS.md` - reglas del repo Kortex si la implementacion requiere adapter upstream.
- `/Users/jreye/Documents/dev/kortex/project_context.md` - estado runtime Kortex vigente.
- `/Users/jreye/Documents/dev/kortex/docs/system/runtime-connection-contract.md` - Cloud Run, Greenhouse bridge y env contract Kortex.

Reglas obligatorias:

- Kortex sigue siendo peer system. Greenhouse no lee Cloud SQL de Kortex directo ni comparte secrets/runtime.
- El primer corte es read-only. Nada de `execute`, `run-audit`, `compile`, `approve`, `deploy` ni `release-candidate execute`.
- El reader de Greenhouse no llama endpoints Kortex mutativos aunque esten disponibles en OpenAPI.
- Si se agregan capabilities `kortex.*`, deben vivir en el registry separado de ecosystem platform capabilities (TASK-885) o quedar como dependency formal; NUNCA en `ENTITLEMENT_CAPABILITY_CATALOG` interno.
- El binding se resuelve por `sister_platform_bindings`, no por match de nombre de cliente.
- Cualquier secreto Kortex/Greenhouse/GitHub se mantiene server-only y se redacta en errores/logs.
- Una fuente caida (GitHub, Kortex Cloud Run, Vercel Kortex, binding) degrada el contrato; no produce falso sano ni 5xx global salvo error de auth/acceso del requester.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`
- `docs/tasks/to-do/TASK-885-ecosystem-platform-registry-capability-catalog.md`
- `docs/tasks/to-do/TASK-889-ecosystem-access-admin-center-kortex-verk-pilot.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.sister_platform_bindings` and `greenhouse_core.sister_platform_consumers` from TASK-375/TASK-376.
- Existing Kortex repo `efeoncepro/kortex` and local checkout `/Users/jreye/Documents/dev/kortex`.
- Kortex runtime OpenAPI at `https://kortex-control-plane-758246035804.us-central1.run.app/openapi.json`.
- Kortex read surfaces observed during discovery:
  - `/api/v1/greenhouse/context`
  - `/portal-runtime/overview`
  - `/api/v1/audits/latest`
  - `/api/v1/portals/{hubspot_portal_id}/adoption-kpis`
  - `/api/v1/portals/{hubspot_portal_id}/deployment-summary`

### Blocks / Impacts

- Future Greenhouse UI for Kortex Ops / Ecosystem Control.
- Future commands: run portal audit, compile workspace, dry-run release, execute release candidate.
- Future ecosystem access pilot in TASK-889.
- Account 360 enrichment with Kortex CRM implementation/adoption state.
- Nexa/agentic tooling that needs to answer "what is Kortex doing for this account?"

### Files owned

- `src/lib/kortex/control-plane/types.ts` `[crear]`
- `src/lib/kortex/control-plane/repository-reader.ts` `[crear]`
- `src/lib/kortex/control-plane/runtime-reader.ts` `[crear]`
- `src/lib/kortex/control-plane/binding-reader.ts` `[crear]`
- `src/lib/kortex/control-plane/composer.ts` `[crear]`
- `src/app/api/admin/kortex/control-plane/route.ts` `[crear]`
- `src/lib/reliability/queries/kortex-control-plane-health.ts` `[crear si aplica]`
- `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md` `[solo si la implementacion cambia comportamiento runtime]`
- Upstream Kortex adapter files, only if Discovery proves existing read endpoints are not safe enough:
  - `/Users/jreye/Documents/dev/kortex/services/agent/kortex_agent/greenhouse_control_plane_api.py` `[crear en repo Kortex, si aplica]`
  - `/Users/jreye/Documents/dev/kortex/services/agent/kortex_agent/settings.py` `[extender en repo Kortex, si aplica]`
  - `/Users/jreye/Documents/dev/kortex/services/agent/kortex_agent/oauth_api.py` `[montar router en repo Kortex, si aplica]`

## Current Repo State

### Already exists

- Greenhouse has sister-platform binding runtime and read lanes:
  - `src/lib/sister-platforms/bindings.ts`
  - `src/lib/sister-platforms/external-auth.ts`
  - `src/app/api/integrations/v1/sister-platforms/context/route.ts`
  - `src/app/api/platform/ecosystem/*`
- Greenhouse architecture already treats Kortex as peer system:
  - `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Kortex has a Greenhouse read path:
  - `/Users/jreye/Documents/dev/kortex/services/agent/kortex_agent/greenhouse_runtime.py`
  - `/Users/jreye/Documents/dev/kortex/services/agent/kortex_agent/greenhouse_api.py`
  - `/Users/jreye/Documents/dev/kortex/apps/web/src/app/api/greenhouse/context/route.ts`
- Kortex OpenAPI exposes operational read and write surfaces, but its current OpenAPI does not declare security schemes.
- `gh` is authenticated and can inspect `efeoncepro/kortex`.

### Gap

- Greenhouse has no canonical `src/lib/kortex/**` reader.
- Greenhouse has no endpoint that composes Kortex repo status + runtime status + portal capability summary.
- There is no Greenhouse-side control-plane contract for Kortex capabilities.
- Kortex write endpoints exist, but there is no Greenhouse-safe adapter with auth, idempotency, command audit, tenant binding and rate limits.
- The older TASK-377 covers Kortex consuming Greenhouse context; it does not fully cover Greenhouse controlling Kortex.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (+ `reader`, `api`)
- Source of truth afectado: Greenhouse `sister_platform_bindings`, GitHub repo `efeoncepro/kortex`, Kortex Cloud Run read API/OpenAPI.
- Consumidores afectados: admin API, future UI, agents/Nexa, Account 360 enrichment, future commands.
- Runtime target: `local|staging|production|external` (read-only integration against GitHub + Kortex Cloud Run).

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1`, `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1`, Kortex OpenAPI.
- Contrato nuevo o modificado: `kortex-control-plane-reader.v1` + `GET /api/admin/kortex/control-plane`.
- Backward compatibility: `compatible` (new additive read endpoint).
- Full API parity: any future UI/agent consumes the Greenhouse server-side reader; no UI, agent or route calls GitHub/Kortex directly.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.sister_platform_bindings` read-only; no new Greenhouse data table in MVP unless Discovery proves a cache/snapshot is needed.
- Invariantes que no se pueden romper:
  - Kortex remains source of truth for Kortex runtime state.
  - Greenhouse binding remains source of truth for Greenhouse scope resolution.
  - The reader is read-only and cannot mutate Kortex, GitHub, HubSpot, Vercel or Greenhouse data.
  - `contractVersion: "kortex-control-plane-reader.v1"` is stable; breaking shape requires v2.
  - Missing GitHub/Kortex data is represented as `degradedSources[]`, not hidden.
- Tenant/space boundary: requester must pass through Greenhouse admin/internal guard; external Kortex scope resolves through active `sister_platform_bindings` when portal-scoped. Internal/global repo status must not leak client-specific data.
- Idempotency/concurrency: read-only. Optional in-process cache TTL <= 60s; no persistent mutable state in MVP.
- Audit/outbox/history: none for read-only MVP with rationale. Future commands must use `runEcosystemCommandRoute` or an equivalent command audit/idempotency helper.

### Migration, backfill and rollout

- Migration posture: `none` for MVP unless implementation adds capability seed or reliability signal metadata. If capability seed is added, it must be additive and respect ecosystem registry separation.
- Default state: `read-only`, endpoint admin-gated.
- Backfill plan: N/A.
- Rollback path: revert PR; if any additive capability/signal is seeded, deprecate/disable rather than delete historical registry rows.
- External coordination: Kortex may need a new `GREENHOUSE_CONTROL_PLANE_TOKEN` or HMAC secret if existing runtime reads are not safely authenticated. Provision via Secret Manager/Vercel/Cloud Run, never git.

### Security and access

- Auth/access gate: `requireAdminTenantContext` or equivalent internal/admin guard. If ecosystem access capabilities are available, prefer `ecosystem.access.platform.read` or a registry-backed Kortex read capability; do not place `kortex.*` in internal entitlements.
- Sensitive data posture: no secrets, no HubSpot tokens, no raw Kortex refresh-token refs, no personal contact/payment data. Return summaries only.
- Error contract: canonical JSON error shape, `redactErrorForResponse`, `captureWithDomain` under `ecosystem` or `cloud` as appropriate.
- Abuse/rate-limit posture: per-source timeout, cache TTL, no high-frequency polling; Kortex adapter should add token/HMAC and replay guard if created.

### Runtime evidence

- Local checks: unit tests for contract composer, degraded source handling, binding resolver, GitHub/Kortex client adapters.
- DB/runtime checks: read-only query/smoke that active Kortex binding resolves for known pilot portal if available.
- Integration checks: `gh repo view efeoncepro/kortex` equivalent through reader; Kortex OpenAPI/health/read endpoint smoke in staging; degraded behavior when Kortex source fails.
- Reliability signals/logs: optional `kortex.control_plane.reader_degraded` or rollup under `ecosystem.access.snapshot_stale` if the implementation adds a signal.
- Production verification sequence: staging smoke with admin session -> production smoke -> monitor degraded logs/signals for 24h.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 - PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md segun TASK_PROCESS.md. No llenar al crear la task. -->

<!-- ZONE 3 - EXECUTION SPEC
     "Que construyo exactamente, slice por slice?" -->

## Scope

### Slice 1 - Contract and binding discovery

- Create `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md` with the read-only contract, source map and explicit command boundary.
- Confirm the active Kortex binding rows from Greenhouse (read-only) and document how `portal_id` / `hubspot_portal_id` resolves to Greenhouse scope.
- Define TypeScript types for `kortex-control-plane-reader.v1`.

### Slice 2 - Repository status reader

- Build a server-only repository reader for `efeoncepro/kortex` using authenticated GitHub helpers or `gh`-equivalent API patterns already accepted in the repo.
- Return default branch, HEAD SHA, last commit, open PR/issue/workflow counts where safe, and `updatedAt`.
- Degrade honestly if GitHub auth/rate limit fails.

### Slice 3 - Kortex runtime read adapter

- Build a Kortex runtime client with base URL from env/config, per-source timeout and sanitized errors.
- Compose safe read-only runtime data:
  - OpenAPI availability/version.
  - portal runtime overview when `portal_id` or `hubspot_portal_id` is provided.
  - latest audit summary.
  - adoption KPI availability summary.
  - deployment summary availability.
- If existing Kortex endpoints are not safe/authenticated enough, stop before production rollout and create the minimal Kortex-side `greenhouse_control_plane_api.py` adapter in the sibling repo under its AGENTS protocol.

### Slice 4 - Greenhouse admin endpoint

- Add `GET /api/admin/kortex/control-plane` guarded by admin/internal access.
- Query params should support at least `portal_id` and `hubspot_portal_id`; global repo status is allowed only for internal/admin users.
- Return one composed packet with `contractVersion`, `generatedAt`, `binding`, `repository`, `runtime`, `capabilities`, `degradedSources[]`, `confidence`.

### Slice 5 - Observability and handoff to commands

- Add tests for degraded GitHub, degraded Kortex, missing binding, and happy path.
- Add reliability signal/log posture if implementation creates a reusable source freshness check.
- Create follow-up task(s) or update this task's Follow-ups for commands:
  - run portal audit
  - compile workspace
  - dry-run release candidate
  - execute release candidate
  Each must require Kortex adapter auth, idempotency, audit and human confirmation.

## Out of Scope

- Executing Kortex writes from Greenhouse.
- HubSpot mutations of any kind.
- Direct reads from Kortex Cloud SQL or Secret Manager.
- Building the full `/admin/ecosystem-access` UI.
- Implementing provisioning desired/observed/applied state from TASK-885..889.
- Moving Kortex into this repo, adding it as a submodule, or treating its Vuexy console as Greenhouse UI.

## Detailed Spec

The reader packet should be shaped for machines first:

```ts
type KortexControlPlaneReaderV1 = {
  contractVersion: 'kortex-control-plane-reader.v1'
  generatedAt: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  degradedSources: Array<{
    source: 'greenhouse_binding' | 'github' | 'kortex_runtime' | 'kortex_openapi'
    reason: string
  }>
  binding?: {
    sisterPlatformKey: 'kortex'
    externalScopeType?: string
    externalScopeId?: string
    greenhouseScopeType?: string
    publicId?: string
    status?: string
  }
  repository: {
    nameWithOwner: 'efeoncepro/kortex'
    url: string
    defaultBranch?: string
    headSha?: string
    updatedAt?: string
    status: 'available' | 'degraded' | 'unavailable'
  }
  runtime: {
    baseUrl?: string
    openapiAvailable: boolean
    portal?: Record<string, unknown>
    latestAudit?: Record<string, unknown>
    adoption?: Record<string, unknown>
    deployments?: Record<string, unknown>
    status: 'available' | 'degraded' | 'unavailable'
  }
  capabilities: Array<{
    key: string
    action: 'read' | 'run' | 'manage' | 'execute'
    maturity: 'observed' | 'read_ready' | 'command_planned' | 'blocked'
    commandSafe: boolean
    reason?: string
  }>
}
```

Initial capabilities should classify observed Kortex surfaces without granting write execution:

| Capability | Initial maturity | Command safe in this task? |
|---|---|---|
| `kortex.repository.read` | `read_ready` | false |
| `kortex.runtime_status.read` | `read_ready` | false |
| `kortex.crm_audit.read` | `read_ready` | false |
| `kortex.crm_audit.run` | `command_planned` | false |
| `kortex.crm_strategy.read` | `read_ready` | false |
| `kortex.crm_strategy.run` | `command_planned` | false |
| `kortex.release_candidate.execute` | `blocked` | false |
| `kortex.adoption_kpis.read` | `read_ready` | false |

These capability strings are descriptive inside the reader packet until TASK-885 materializes the formal ecosystem platform capability catalog. They must not be inserted into Greenhouse internal entitlements.

## Rollout Plan & Risk Matrix

Additive read-only integration. Risk is external integration/auth drift and accidental command scope creep, not data mutation.

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Slice 3 must prove read-only behavior before Slice 4 exposes an endpoint.
- Any Kortex-side adapter work must follow Kortex AGENTS/TASK protocol before code changes in `/Users/jreye/Documents/dev/kortex`.
- Commands cannot be added by extending this task; they require a follow-up task with Backend impact `command`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Greenhouse calls unsafe Kortex mutative endpoint | integration | medium | hard out-of-scope, allowlist read endpoints only, tests reject mutative route keys | code review/test failure |
| Kortex runtime endpoints are unauthenticated or not stable enough | security/integration | medium | create or require dedicated Kortex Greenhouse read adapter before prod rollout | source `kortex_runtime` degraded |
| GitHub API rate/auth failure | integration | medium | timeout + cache + degraded source packet | degraded source `github` |
| Binding mismatch leaks portal data across tenants | identity/platform | medium | resolve through active `sister_platform_bindings`; no name matching; tests for missing/mismatched binding | 403/404 anti-oracle path |
| `kortex.*` capabilities accidentally added to internal entitlements | identity | low | follow ecosystem access architecture; lint/task acceptance forbids it | grep/lint review |
| Reader becomes false-sano when Kortex is down | reliability | medium | confidence model + degraded sources + optional reliability signal | confidence != high |

### Feature flags / cutover

No feature flag for the read-only endpoint if it is admin-gated and additive. If Kortex-side adapter credentials are introduced, rollout is gated by env/secret provisioning in staging first.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert docs/types | <5 min | si |
| Slice 2 | revert repository reader | <10 min | si |
| Slice 3 | disable Kortex runtime source or unset env; endpoint degrades | <10 min | si |
| Slice 4 | revert route or guard route behind admin only | <10 min | si |
| Slice 5 | revert signal/test/doc wiring | <10 min | si |

### Production verification sequence

1. Local unit tests for composer/degradation/binding errors.
2. Staging call as admin without portal params: repo status only, no portal data.
3. Staging call as admin with pilot `hubspot_portal_id=51183921` or active binding: binding + runtime summaries resolve.
4. Simulate/force Kortex runtime source unavailable: endpoint remains 200 with degraded confidence.
5. Production deploy only after staging proves no token leaks and no mutative Kortex calls.
6. Monitor logs/signals for degraded Kortex source for 24h.

### Out-of-band coordination required

- Confirm whether Kortex Cloud Run should expose a dedicated Greenhouse read adapter before production.
- Provision any Kortex reader token/HMAC in Secret Manager/Cloud Run/Vercel if needed.
- If implementation touches `/Users/jreye/Documents/dev/kortex`, follow Kortex task protocol and document the cross-repo handoff here and in both repos' handoff files.

<!-- ZONE 4 - VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?" -->

## Acceptance Criteria

- [x] `kortex-control-plane-reader.v1` is documented and typed.
- [x] Greenhouse can read `efeoncepro/kortex` repo status through a server-only reader with degraded-source handling.
- [x] Greenhouse can compose safe Kortex runtime read summaries without calling mutative endpoints.
- [x] Binding resolution uses `sister_platform_bindings` or returns a safe degraded/anti-oracle response.
- [x] `GET /api/admin/kortex/control-plane` returns the composed packet behind admin/internal access.
- [x] The task does not add `kortex.*` entries to Greenhouse internal entitlements.
- [x] Future command surfaces are explicitly deferred to follow-up task(s) with command/idempotency/audit/human-confirmation posture.
- [x] Runtime evidence includes at least one staging smoke against GitHub and Kortex runtime or a documented operational block.

## Execution Notes

- Implemented `src/lib/kortex/control-plane/**` with repository, runtime, binding and composer readers.
- Added `GET /api/admin/kortex/control-plane`, guarded by `requireAdminTenantContext`.
- Added allowlist tests that reject Kortex mutative paths including `/api/v1/audits/run`, `/api/v1/strategy/workspaces/*/compile` and `/api/v1/strategy/release-candidates/*/execute`.
- Added route tests for admin gating, scoped query params and redacted unexpected failures.
- Added architecture doc `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md` and decision index entry.
- Added Sentry capture domain `integrations.kortex`.
- No Kortex repo changes were required.
- No `kortex.*` entries were added to Greenhouse internal entitlements.

### Runtime Evidence 2026-06-17

- GitHub smoke via reader: `efeoncepro/kortex`, default branch `main`, open issues `2`, open PRs `1`.
- Kortex OpenAPI smoke via reader: title `Kortex OAuth Service`, current OpenAPI has no declared security scheme; reader remains allowlist/read-only.
- Kortex context smoke for HubSpot portal `51183921`: resolves portal `0c0af3a3-627e-4e05-96f3-557712a2e06a`, status `active`, Greenhouse bridge binding `EO-SPB-0001`.
- Greenhouse binding smoke with `.env.local` + Cloud SQL proxy: `sister_platform_bindings` resolves `EO-SPB-0001`, status `active`, greenhouse scope `internal`.
- Kortex portal overview smoke: environment `staging`, installation `active`, latest deployment `failed`, live schema unavailable.
- Kortex latest audit smoke: status `completed`, finding count `3`, score `88`.
- Kortex `deployment-summary` and `adoption-kpis` returned `401 Unauthorized` without a dedicated read token; V1 degrades those optional sources and still surfaces deployment basics from `portal-runtime/overview`.
- Greenhouse staging endpoint smoke is pending until code is pushed/deployed.

## Verification

- [x] `pnpm exec vitest run src/lib/kortex/control-plane/runtime-reader.test.ts src/lib/kortex/control-plane/composer.test.ts src/app/api/admin/kortex/control-plane/route.test.ts`
- [x] `pnpm exec eslint src/lib/kortex/control-plane/types.ts src/lib/kortex/control-plane/runtime-reader.ts src/lib/kortex/control-plane/repository-reader.ts src/lib/kortex/control-plane/binding-reader.ts src/lib/kortex/control-plane/composer.ts src/lib/kortex/control-plane/index.ts src/lib/kortex/control-plane/runtime-reader.test.ts src/lib/kortex/control-plane/composer.test.ts src/app/api/admin/kortex/control-plane/route.ts src/app/api/admin/kortex/control-plane/route.test.ts src/lib/observability/capture.ts`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false`
- [x] Local/external composer smoke with GitHub + Kortex + Greenhouse binding via Cloud SQL proxy.
- [x] `pnpm qa:gates --changed --agent codex --task TASK-1162 --integration --runtime --auth --docs`
- [x] `pnpm route-reachability-gate`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` (endpoint included in build manifest; unrelated existing roadmap reader broad-pattern warning observed)
- [x] `pnpm task:lint --task TASK-1162`
- [x] `pnpm ops:lint --changed`
- [x] `pnpm docs:closure-check`
- [ ] Staging smoke of deployed `GET /api/admin/kortex/control-plane` with and without portal params.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado con el split Greenhouse vs Kortex.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento runtime.
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-377, TASK-885..889 y docs de arquitectura Kortex.
- [ ] Si se toco el repo Kortex, su `handoff.md` y task lifecycle quedaron actualizados tambien.

## Follow-ups

- Kortex command adapter for Greenhouse: run audit / compile / dry-run / execute with token/HMAC, idempotency, audit and human confirmation.
- Ecosystem capability registry adoption for formal `kortex.*` capabilities once TASK-885 is implemented.
- Admin UI for Kortex/Ecosystem control, likely after or alongside TASK-889.
- Account 360 Kortex card consuming the reader packet.
- Nexa tool/resource that answers Kortex status for an account from the Greenhouse reader.

## Open Questions

- Resolved for V1: consume existing safe read endpoints with an allowlist; create dedicated adapter/token as follow-up if production requires authenticated `deployment-summary`/`adoption-kpis`.
- Should repo status be global internal-only, or also visible to client-scoped users in a trimmed form later?
- Resolved for V1: repo status is admin-only through `GET /api/admin/kortex/control-plane`.
- Resolved for V1: Kortex runtime source freshness waits until observed snapshots / reliability signal work; this task only emits per-source health in the packet.
