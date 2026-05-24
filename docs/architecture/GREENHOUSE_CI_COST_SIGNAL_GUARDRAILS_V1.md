# Greenhouse CI Cost Signal Guardrails V1

> **Status:** Accepted
> **Date:** 2026-05-24
> **Owner:** Platform / Reliability
> **Scope:** GitHub Actions workflows, local-first development, release gates, cost observability
> **Reversibility:** two-way
> **Confidence:** high for gate taxonomy; medium for budget API automation because GitHub Budgets REST is public preview
> **Validated as of:** 2026-05-24 against repo workflows and GitHub official docs

## Context

Greenhouse uses Vibe Coding heavily. The platform needs early feedback because defects previously arrived too late in production, but repeated pushes to `develop` and PR branches can burn GitHub Actions minutes on superseded work.

GitHub Billing Usage shows the official invoice-level view. It does not attribute cost by workflow/job. The Actions Runs/Jobs APIs provide enough timestamps for a reproducible estimate of workflow/job hotspots, but that estimate is not the bill.

## Decision

Greenhouse optimizes CI by **cost per useful signal**, not by disabling checks.

The platform uses five lanes:

| Lane | Purpose | Remote behavior |
| --- | --- | --- |
| `fast feedback` | Cheap correctness signal for current code | Runs on code PR/develop current head. Must stay quick and deterministic. |
| `full verification` | Expensive confidence gate: unit suite, coverage, build, migration/test observability | Required before release/main. May be conditional for low-risk docs-only changes. |
| `e2e smoke` | Runtime confidence on critical surfaces | Path-aware; must run for auth, layout, navigation, admin, payroll, reliability and API-critical changes. |
| `release gate` | Production evidence and rollback readiness | Never relaxed for cost. Main/release runs are not cancelled for latest-only optimization. |
| `scheduled/deep` | Backstop and drift detection | Runs away from the human iteration loop; can be latest-only if each run is a snapshot. |

`latest commit wins` applies to PR/develop only. It does not apply to `main` or production release evidence.

Local-first remains the default agent loop:

```text
edit local -> validate local -> commit local -> ask before push
```

Remote CI is integration/release evidence, not the exploratory workbench.

## Runtime Contract

- `pnpm local:check`, `pnpm local:check:ui`, and `pnpm local:check:full` are the local evidence commands.
- `pnpm actions:cost:audit` is the repo-local workflow/job hotspot report.
- `src/lib/cloud/github-billing.ts:getGitHubBillingOverview` remains the official GitHub Billing reader.
- `.github/workflows/ci.yml` and `.github/workflows/playwright.yml` may skip docs-only changes when specialized gates cover those docs.
- Production workflows must preserve auditable evidence and release semantics from `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`.
- Any persisted workflow/job metrics belong to TASK-859 or a superseding ADR; TASK-931 V1 uses read-only API reporting.

## Alternatives Considered

### Disable Playwright/coverage on develop

Rejected. It lowers cost but reintroduces the original failure mode: regressions found late in production or release.

### Split every check into a separate GitHub job

Rejected as a blanket rule. Separate jobs duplicate checkout/install overhead unless the split is conditional or artifacts/caches are designed carefully.

### Persist workflow/job metrics now

Rejected for TASK-931 V1. TASK-859 already owns the canonical schema and DORA/flaky detector scope. V1 should not create parallel tables.

### Rely only on GitHub Billing Usage

Rejected. Billing Usage is official for gross/net spend but cannot explain which workflow/job caused the spend.

## Consequences

- Agents get a concrete command for monthly cost diagnosis before editing gates.
- Workflow changes must name what signal they preserve or replace.
- `main` and release evidence remain conservative.
- Budget automation may require elevated organization billing permissions.

## Revisit When

- TASK-859 ships persisted workflow/job metrics.
- CI cost remains high after 30 days even with latest-only + local-first.
- GitHub Budgets API leaves public preview or the org grants billing-manager automation.
- A required status check policy is introduced on `develop`/`main`.

## References

- GitHub Actions workflow syntax: `concurrency`, `paths-ignore`.
- GitHub Actions billing: minutes are billed to the repository owner; Linux 2-core baseline is `actions_linux` at USD 0.006/min as of 2026-05-24.
- GitHub Budgets REST API: organization budget endpoints require admin/billing-manager level permissions and are public preview as of 2026-05-24.
