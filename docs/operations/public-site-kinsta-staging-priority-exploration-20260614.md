# Public Site — Kinsta Staging and Content Factory Priority Exploration

> Date: 2026-06-14
> Scope: EPIC-019 / TASK-1116 operational discovery
> Runtime: `efeoncepro.com` on Kinsta / WordPress / Ohio / Elementor

## Question

Can EPIC-019 continue without paying for Kinsta staging, and what is the highest-priority path if the goal is to scale production of posts and landing pages?

## Findings

- Kinsta documentation says each WordPress install can have its own free Standard Staging environment, unless a custom plan restricts the number of staging environments.
- Kinsta Premium Staging is the paid add-on. Current Kinsta pricing/docs list Premium Staging at USD 20/month per environment, prorated, with up to five premium environments per site.
- This workspace cannot confirm the actual Efeonce account entitlement or whether a Standard Staging environment is already created because the Kinsta API token is still missing and MyKinsta dashboard state is not available from the repo.
- Current Greenhouse runtime evidence remains healthy: latest `pnpm public-website:runtime-status` reports runtime repo `main` at `a84490b`, clean, latest drift `0`, and blocked capabilities only for Kinsta cache clear, backup create and production deploy apply.
- Current `pnpm public-website:deploy-dry-run` reports no code file changes to apply (`would_create=0`, `would_update=0`, `noop=60`), still blocked by Kinsta API token for cache/backups and explicit production release policy.

Sources checked:

- `https://kinsta.com/docs/wordpress-hosting/staging-environment/`
- `https://kinsta.com/docs/wordpress-hosting/wordpress-add-ons/`
- `https://kinsta.com/add-ons/`
- `https://kinsta.com/pricing/`

## Priority Interpretation

Staging is useful, but it is not the main product bottleneck for scaling posts and landings.

The main bottleneck is the content factory contract:

1. Greenhouse needs reusable content models for posts and landings.
2. WordPress needs safe draft/private creation and preview.
3. Greenhouse needs review, versioning, diff and approval around those drafts.
4. Publishing/cache/backups can remain a later release lane.

For posts, the fastest scalable path is Gutenberg/block-first:

- Efeonce posts are already Gutenberg/block-editor content.
- Greenhouse can generate structured post drafts using block HTML in `post_content`.
- The bridge already inspects Gutenberg via `parse_blocks()`.
- A first smoke can create a private/draft post that is not linked publicly and can be deleted/trashed after validation.

For landings, the scalable path is not freeform Elementor patching:

- Reuse inspected Ohio/Elementor modules and templates.
- Prefer Greenhouse-owned drafts/private pages.
- Move toward constrained modules such as a custom Elementor widget only when a section is repeatable and fragile as raw Elementor structure.
- Keep Elementor `_elementor_data` mutation behind `Document::save()` and ownership metadata.

## Recommended Order

1. Add a Greenhouse content factory spec for two lanes:
   - `post_draft_gutenberg`
   - `landing_draft_elementor`
2. Implement draft/private smoke for a disposable Greenhouse-owned Gutenberg post first.
3. Add preview/status/rollback metadata to the bridge and Greenhouse reader.
4. Build the Greenhouse UI/API lane for inspection + prepare draft + preview review.
5. Use Kinsta Standard Staging if available, but do not block the content factory spec on Premium Staging.
6. Leave publish/cache-clear/backup automation for the explicit Kinsta API release lane.

## Open Verification

- Confirm in MyKinsta or via Kinsta API whether `efeoncepro.com` has a Standard Staging environment available/created.
- If Standard Staging exists, capture SSH/WP-CLI path and domain for the bridge smoke matrix.
- If no staging is available, use production draft/private-only smoke with a disposable `greenhouse-smoke-*` object, writes enabled for the shortest possible window, no publish, no cache clear, and rollback by trashing the smoke object.
