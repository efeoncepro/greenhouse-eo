# QA Release Audit - TASK-1494 Reference Intelligence / Style DNA

## Verdict

BLOCK

Closure state: operativamente bloqueado (canary positivo)

## Scope

- Changed files reviewed: TASK-1494-owned contracts/domain/provider seam, creative-runner analysis/Vertex
  adapter, Studio composition/identity adapter, package lock/dependency, tests and Greenhouse triple docs/task.
- Runtime or environment reviewed: local monorepo build/test, GitHub CI, Cloud SQL migration status, Cloud Run
  API/Studio revisions, immutable-perimeter smokes and private live negative commands/readers.
- Out of scope / unrelated worktree changes: TASK-1505 Producer files and generated creative artifacts in both
  shared checkouts; preserved without branch switch, revert, commit or push.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| API/command/provider seam | High | Shared transport-neutral command invokes an external billable analyzer. |
| Data/tenant safety | High | Profiles, cache leases, styles and route facts are workspace-scoped durable state. |
| Security/spend | Critical | Private reference bytes, provider errors, kill switch and pre-spend reservation are trust boundaries. |
| Runtime rollout | High | Migration/config/deploy are applied; a positive provider/cache/spend canary still requires an eligible governed asset. |

## Injected Skills

- `greenhouse-qa-release-auditor`: risk-based evidence and verdict.
- `software-architect-2026`: provider seam, boundary, ADR and deterministic-cache design.
- `greenhouse-secret-hygiene`: keyless provider path, secret/raw-error and server-only review.
- `greenhouse-documentation-governor`: architecture/functional/manual/task/handoff/changelog closure.
- QA CLI suggestions for browser, Teams, HubSpot and Vercel were caused by unrelated TASK-1505/shared dirty
  files or explicit broad flags; they are not TASK-1494 surfaces and were not injected into this scoped verdict.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Globe full check/build | PASS | `pnpm check && pnpm build`; creative-runner 213/213, Studio Web 188/188, all packages built. |
| Canonical API smoke | PASS | HTTP `globe.lab.reference.analyze` then `globe.lab.reference.profile.get` through `createStudioApp`. |
| Palette/provider/fence | PASS | Stable decoded palette, pure estimate, reservation/settlement/release, strict JSON and idempotent Vertex call tests. |
| Tenant/cache/version negatives | PASS | Cross-workspace identity is absent; caller model version rejected before identity/cache; cache hit avoids a second analysis. |
| Data/migration seam | PASS local | Migration checksum suite + reference store SQL seam 7/7; live migration/readback intentionally not claimed. |
| Secret/error hygiene | PASS local | No provider SDK/direct key path added; existing ADC transport reused; diff scan found no private-key/API-key signatures; raw failures sanitized. |
| Diff hygiene | PASS | `git diff --check`; no branch switch, commit, push, deploy or billable call. |
| Task/ops/docs | PASS | `task:lint --task TASK-1494`, `ops:lint --changed`, scoped `docs:closure-check`, and `docs:context-check:strict` all green. |
| CI and deploy | PASS | Globe CI `29966815213`; API deploy `29966942819` and Studio deploy `29966944103`, exact SHA `a5e128935577`, Ready/100%, perimeter smokes green. |
| Cloud SQL rollout | PASS | Migration plan `29966823795`: `0009` applied, `pending=[]`, `unexpected=[]`, `checksumMismatches=[]`, `clean=true`. |
| Live negative canary | PASS | Private API: missing asset `404 not_found`, unapproved model version `400 invalid_request`, cross-workspace `403 access_denied`. |
| Live positive canary | BLOCKED | `globe.asset.provenance.list` returned zero assets; no eligible governed image exists to prove `miss → hit` and single settlement. |
| IAM cleanup | PASS | Temporary operator `serviceAccountTokenCreator` binding removed; policy readback contains only the original development/staging WIF subjects. |

## Blockers

1. Operational completion remains blocked until the normal governed flow produces an internal, non-sensitive
   image asset that is active, clean, rights/consent verified and eligible for generation. Only then can the
   positive `miss → hit`/single-settlement canary run.

## Conditional Follow-Ups

1. Keep MCP blocked and do not infer UI usability from coverage until runtime data exists.
2. Do not enable private ingest, insert database fixtures, or bypass Model Readiness/rights solely to satisfy
   this canary; those controls have independent approval gates.

## False-Closure Traps Checked

- tests green but runtime missing: deployment is live, but the positive data/provider path lacks a governed input.
- UI screenshot/capture absent: not applicable to TASK-1494 (no visible UI diff); TASK-1505 evidence is separate.
- env/flag/redeploy/backfill pending: migration/config/deploy are complete; only positive canary evidence is pending.
- docs/task lifecycle drift: synchronized to deployed internal-only with the positive blocker and triple docs.
- Sentry/observability not verified: deploy workflow/perimeter and direct API results were verified; no incident claim.

## Final Call

The implementation and internal deployment satisfy the code, schema, configuration, revision, perimeter and
negative-security gates. It may be called **deployed internal-only**, but not fully operationally verified:
there is no governed reference asset with which to prove the real provider call, cache replay and one-time
settlement. The correct verdict remains `BLOCK` for that positive canary, without weakening unrelated
ingest/readiness/rights controls to manufacture evidence.
