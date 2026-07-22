# Efeonce technology resolution

Resolve technology choices from current evidence; never use a copied stack table.

## Resolution order

1. Inspect `package.json`, lockfiles, toolchain files, infrastructure definitions, deployment workflows, environment schemas, and runtime manifests.
2. Read the accepted domain/platform ADR and architecture.
3. Verify the deployed runtime when the decision depends on operational state.
4. Identify the owning team/service/repository using `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` and the domain router.
5. Research official vendor/framework sources for any new or current-capability claim.
6. Record deviations, migration seams, rollout, rollback, and review triggers.

## Guardrails

- Never infer database tenancy, RLS, pool ownership, session sharing, repository ownership, cron count, model/provider route, hosting target, or branch policy from this overlay.
- Never turn a present implementation into a universal Efeonce convention without an accepted owner and decision.
- Treat package versions, provider capabilities, pricing, regions, quotas, previews, and deployed flags as dynamic evidence.
- Prefer existing platform capabilities when they satisfy the quality scenarios; do not create topology to match a fashionable target state.

## Evidence record

For each material technology choice capture:

- repository/runtime evidence inspected;
- official external source and validation date;
- quality scenarios served;
- alternatives and operational burden;
- owner, lifecycle/support window, exit path, and revisit trigger.
