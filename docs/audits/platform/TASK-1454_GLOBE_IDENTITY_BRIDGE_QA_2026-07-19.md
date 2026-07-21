# QA Release Audit - TASK-1454 Globe identity and SDK bridge

## Verdict

CONDITIONAL PASS

Closure state: complete for the approved internal non-production pilot

## Scope

- Changed files reviewed: Greenhouse broker/policy/routes, migration and generated DB types, Globe SDK client and WIF helper, seed/smoke scripts, Globe callback/API runtime, Cloud Build/provisioning scripts and governing docs.
- Runtime or environment reviewed: Greenhouse Vercel Preview `dpl_3XH5oDv3QdZxRVnMbKGMhRZZvH6x`; GCP project `efeonce-globe`; Cloud Run `globe-api-internal` and `globe-studio-internal`; shared `greenhouse-pg-dev/greenhouse_app` schema after approved additive migration.
- Out of scope / unrelated worktree changes: Campaign Layout Compiler, creative-model catalog and other pre-existing dirty files; Production, external clients, provider execution, Globe DB/storage and launch UI.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Auth/access/tenant safety | Critical | New sister-platform policy, human session, internal audience and revocation paths. |
| Secrets/WIF/IAM | Critical | OAuth secret, Vercel OIDC, service-account impersonation and Cloud Run invocation. |
| Data/schema | High | Additive shared-schema migration and Kortex policy backfill. |
| External runtime | High | Vercel Preview, Secret Manager, WIF, Cloud Build and two Cloud Run services. |
| SDK/API compatibility | Medium-High | New vendored Globe contracts/SDK and server-only WIF adapter. |

## Injected Skills

- `greenhouse-qa-release-auditor`: final risk and false-closure gate.
- `greenhouse-secret-hygiene`: secret resolution, log exposure and keyless identity review.
- `vercel-operations`: Preview target, protection/bypass and deployment readback.
- `greenhouse-browser-diagnostics`: authenticated internal/client persona smoke discipline.
- `software-architect-2026`: sister-platform, source-of-truth and cross-runtime boundary.
- `greenhouse-documentation-governor`: architecture, task, changelog and handoff closure.

The advisory scanner also suggested Teams and HubSpot skills because the shared dirty checkout contains unrelated files. They were not injected: TASK-1454 owns no Teams or HubSpot behavior.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Policy/SDK focal tests | PASS | `pnpm exec vitest run src/lib/sister-platforms/oauth-policy.test.ts src/lib/globe/client.test.ts`: 2 files, 9 tests. |
| Globe repo | PASS | `pnpm check && pnpm build`: all workspace typechecks/builds and 12 tests green. |
| Greenhouse typecheck | PASS | `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`. |
| Task contract | PASS | `pnpm task:lint --task TASK-1454`: template=1, errors=0, warnings=0. |
| Migration | PASS | `20260719095610467_task-1454-sister-platform-oauth-policy.sql` applied after explicit operator approval; schema/policy readback and regenerated `src/types/db.d.ts` verified. A later standalone `migrate:status` could not connect because its local proxy was not running; this does not supersede the applied migration/readback evidence. |
| Human allow | PASS | Internal agent completed authorize → callback → local session → revalidation; final Globe origin and correlation matched. |
| Tenant deny | PASS | Client-tenant agent received callback 403, session 401 and no local session. |
| Replay/revocation | PASS | Broker smoke rejected code replay; explicit revocation and client suspension were denied; live Globe revalidation converged to 401 `access_revoked`. |
| Workload allow/deny | PASS | Local SDK exact audience allowed; anonymous and wrong audience denied. Live Vercel OIDC → WIF → impersonated ID token → private Cloud Run returned 200 without a persistent key. |
| Runtime readback | PASS | Vercel deployment is Preview/Ready. `globe-api-internal` runs as `globe-api-runtime`; `globe-studio-internal` runs as `globe-web-runtime`. Anonymous API health is 403 and callback start returns 303 to the exact Greenhouse authorize route. |
| Least privilege | PASS | Four dedicated service accounts have zero user-managed keys; API `run.invoker` is caller-only; Production WIF subject absent. Preview diagnostic subject and temporary operator impersonation grant were removed. |
| Secret hygiene | CONDITIONAL | No secret is in committed diff and runtime secrets are Secret Manager references. Local `pnpm secrets:audit` without loaded runtime env reported all canonical vars unconfigured, so it is not positive runtime evidence. Live secret/IAM readbacks and smokes supply the relevant evidence. |
| Observability | PASS | OAuth audit records authorize/token/userinfo/revoke/client-status outcomes with correlation IDs; callback/API health and Cloud Run request logs exist without raw application errors. |

## Blockers

None within the explicitly approved internal-only TASK-1454 scope.

## Conditional Follow-Ups

1. Rotate the pre-existing Greenhouse operations DB credential that appeared in local diagnostic output. This requires a separate approved checkpoint and must happen before broader rollout.
2. Replace the temporary vendored `@efeonce-globe/contracts` and SDK tarballs with an authorized private registry/distribution path before release.
3. Evaluate callback log minimization or form-post response mode before widening access; Cloud Run request logs can retain one-time `code` and `state` query parameters.
4. Materialize GitHub WIF and reduce the bootstrap administrator's standing Owner access before a release pipeline.
5. Keep Production/external audience absent until a separately governed release and Access Control Plane rollout.

## False-Closure Traps Checked

- tests green but runtime missing: false; both human and workload paths were exercised live.
- UI screenshot/capture absent: expected; TASK-1454 has `UI impact: none`, and branding is a separate task.
- env/flag/redeploy/backfill pending: no internal-pilot blocker; migration, seed, Preview and Cloud Run revisions are active. Production is intentionally absent.
- docs/task lifecycle drift: synchronized in this closure; final path/index move remains the last mechanical step.
- Sentry/observability not verified: no incident closure depends on Sentry; domain audit/readback, health and Cloud Run signals were verified.

## Final Call

TASK-1454 can be called complete for the approved internal non-production pilot because Globe is reachable from Greenhouse, both identity planes work live, denial and revocation fail closed, Kortex is policy-backed, and no persistent workload key or external/Production access was introduced. The verdict remains conditional because credential rotation, private SDK distribution and callback-log hardening are required before any broader release.
