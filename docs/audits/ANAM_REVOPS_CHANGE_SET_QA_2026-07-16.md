# QA Release Audit — ANAM RevOps diagnosis and approval package

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Scope:** OAuth Product-read diagnosis and native Service proposal
> **Not a rollout approval:** no CRM schema write, Product write, Service migration, deploy or push

## Verdict

**PASS**

Closure state: **complete for diagnosis and approval-package preparation**. Downstream CRM execution and the durable Kortex control-plane fix remain separately gated work, not incomplete steps hidden inside this verdict.

## Scope

- Changed files reviewed: the three dated canonical artifacts, ANAM README/handoff/schema readback, root handoff/context/changelog, and Kortex `TASK-0130` technical evidence.
- Runtime reviewed: HubSpot portal `19893546`, Kortex installation `bfe1bc8b-84f8-4af3-99c9-86b155e7d62e`, Cloud Run authorization generator, HubSpot Product properties/search and native Service schema/pipeline/association labels.
- Out of scope: broad Kortex capability normalization, CRM writes, Product catalog seed, the duplicate ANAM Company data error, Service schema creation/migration, workflow/dashboard work, deploy and push.
- Unrelated worktree changes were preserved and not used as evidence.

## Risk classification

| Risk | Level | Why |
|---|---:|---|
| OAuth/auth integration | High | portal-scoped consent and token capability could affect the active installation |
| Service schema/migration | High | future properties, association semantics and backfill affect lifecycle analytics |
| Documentation | Medium | stale 109-scope/403 claims could mislead the next operator |

## Injected skills

- `hubspot-as-a-service`: managed-delivery workflow, proposal/write separation and ANAM context.
- `hubspot-greenhouse-bridge`: verified the Kortex-versus-Greenhouse credential/runtime ownership boundary.
- `software-architect-2026`: reviewed Service source-of-truth semantics.
- `greenhouse-secret-hygiene`: ensured portal-scoped secrets were consumed without printing or persisting their values.
- `greenhouse-browser-diagnostics`: inspected the real HubSpot consent/monitoring surfaces and handed the human grant step to the operator.
- `efeonce-agency`: checked that Product, Deal and Service grains align with the commercial lifecycle rather than activity metrics.
- `greenhouse-documentation-governor`: synchronized canonical docs, current state, handoff and changelog.
- `greenhouse-qa-release-auditor`: final evidence and false-closure gate.

`greenhouse-teams-message-operator` and `vercel-operations` were suggested mechanically from unrelated worktree/context signals. They were not injected because the owned delta contains no Teams message, Vercel configuration or Vercel deployment.

## Evidence

| Gate | Result | Evidence |
|---|---|---|
| Prior OAuth failure cause | PASS | three `AUTHORIZATION_GRANT` errors in HubSpot Developer Monitoring: `Please provide a valid recaptcha value` |
| Control-plane drift | PASS | deployed generator returns 68 required scopes and still omits `crm.objects.products.read`; both local manifests include Product read and are identical |
| Human consent | PASS | operator explicitly authorized and completed the grant; callback/activation succeeded at `2026-07-16T11:28:13Z` |
| Installation preservation | PASS | active, same installation ID, token version 4, scope count 109 → 110 |
| Least privilege | PASS | Product read present; Product write absent; no Product write attempted |
| Product runtime smoke | PASS | properties HTTP 200/65; search HTTP 200/22 Products |
| Service proposal evidence | PASS | live native fields, one Service, pipeline/stages, association types and missing self-labels read back |
| Exact Service contract | PASS | eight literal property-create payloads, exact enum values/order, three paired association definitions, deterministic key and quarantine rules |
| JSON validity | PASS | six fenced JSON blocks parsed successfully |
| HubSpot manifest | PASS | `hs project validate --account 48713323`; project `102901550`, deployed build `#13` |
| Docs/ops | PASS | `docs:closure-check` 0 warnings; `ops:lint --changed` 0 errors/0 warnings; `git diff --check` in both repos |
| Context continuity | PASS with existing warnings | `docs:context-check` 0 errors; two pre-existing size/history warnings for root `Handoff.md` |
| Secret exposure | PASS | owned diffs contain no credential values; only canonical secret/token names in historical policy text |

## Blockers

None for this diagnosis and proposal package.

## Conditional follow-ups

1. Kortex must fix/test its packaged required-scope source before a later control-plane deploy; successful manual consent does not close broad `TASK-0130`.
2. The duplicate ANAM Company records are an out-of-scope CRM data error and must not be corrected or merged in this work.
3. Service schema creation, migration and dashboards require separate approvals and post-write readback.
4. Functional documentation and operator manuals for the proposed Service behavior are intentionally deferred because it has not been accepted or executed. The technical proposal is the current authority; create/update those layers when runtime behavior exists.

## False-closure traps checked

- Tests green but runtime missing: avoided; Product capability was smoked against the active portal credential.
- UI evidence absent: no UI change was made; HubSpot browser use was diagnostic only.
- Env/flag/redeploy/backfill pending: the durable Kortex deploy, Company backfill and Service migration are explicitly outside this closure and remain gated.
- Docs/task lifecycle drift: current 110-scope/HTTP-200 state was reconciled across canonical readback, handoff, context, changelog and Kortex task; `TASK-0130` remains in progress.
- Observability not verified: callback and installation events were read back; no claim is made about long-term monitoring.

## Final call

The requested discovery continuation is supported by live evidence and the Company and Service proposals are executable without filling semantic gaps at implementation time. The package can be called complete as a read-only diagnosis and approval-ready design. It must not be interpreted as permission to perform any CRM write, merge, migration, deploy or Product catalog mutation.
