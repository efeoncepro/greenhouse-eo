# AI Content Factory and Gutenberg Workflows

Use this reference for Greenhouse AI Content Factory, Gutenberg posts, guided editorial refresh, draft/private clone plans, and content intelligence maps.

Canonical docs:

- `docs/documentation/public-site/public-site-content-factory-end-to-end.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/documentation/public-site/content-factory-golden-examples/README.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/tasks/in-progress/TASK-1123-greenhouse-ai-content-factory-agent-kit.md`

## Core Model

- Posts and landings are separate lanes.
- Posts should be Gutenberg/block-first because current Efeonce editorial posts use Gutenberg.
- Landings should be constrained Elementor/Ohio modules unless a reusable custom widget is justified.
- Existing content must be inspected before refresh/fix.
- Refresh/fix works on draft/private clone first. Direct mutation of published content requires explicit task/release approval.
- Treat `blockName` for Gutenberg and `widgetType` for Elementor as builder module identifiers; keep the native field in planning artifacts.

## Required Inspection Before Existing-Content Edits

Build or load a Content Intelligence Map covering:

- post/page id;
- editor model;
- blocks/widgets;
- Ohio/theme metas;
- Elementor settings;
- assets/media;
- SEO/Yoast;
- HubSpot/CTA;
- anchors;
- ownership/freshness/fingerprint.

## Commands

Read-only discovery and maps:

```bash
pnpm public-website:content-factory:inspect -- --write
pnpm public-website:content-factory:inspect -- --target <id[:label]> --write
pnpm public-website:content-factory:inspect -- --from-bridge-inspection <path> --write
pnpm public-website:content-factory:inspect-post-deep -- --post-id <id> --write
pnpm public-website:content-factory:patterns
pnpm public-website:content-factory:capabilities
```

Plan-only refresh/fix:

```bash
pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json> --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json> --write
pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan <patch-plan.json> --private --write
```

Generated drafts:

```bash
pnpm public-website:content-factory:plan -- --file ./tmp/content-brief.json --out ./tmp/generated-post-draft.json
pnpm public-website:content-factory:validate -- --file ./tmp/generated-post-draft.json
pnpm public-website:content-factory:smoke-plan -- --file ./tmp/generated-post-draft.json --private --write
```

Fast editorial pullquote lane:

```bash
pnpm public-website:content-factory:post-tool -- edit-pullquote --post-url <url> --near-heading "<heading>" --replacement "<text>" --apply --write
```

## Gutenberg Guardrails

- Do not generate flat paragraph-only drafts.
- WordPress post title owns the H1; generated `post_content` must not include H1.
- Prefer Gutenberg comments and governed blocks.
- Use `yoast-seo/table-of-contents` on long editorial posts when the composition profile requires it.
- Treat `core/freeform` as observable legacy debt for inspection/refresh, not as a generated block for new drafts.
- Validate drafts before any bridge write.
- `status=block` from validation is a hard stop; `status=warning` requires review.

## Existing Post Refresh Guardrails

- `post-deep-inspection` parses live `post_content` with `parse_blocks()` and emits paths/fingerprints.
- `refresh-plan` is local artifact only: no WordPress call, no write, no clone.
- `patch-plan` validates proposed operations against source fingerprint and block fingerprints.
- `ready_for_draft_clone` only means the artifact can feed a future clone/draft command; it still has not written WordPress.
- `refresh-draft-plan` emits a signed dry-run request for the bridge endpoint; it never sends by itself.
- Future sends require deployed bridge endpoint, writes enabled briefly, shared secret resolution, readback, and rollback evidence.

## Bridge Write Boundary

Draft/private smoke and bridge contracts are dry-run unless explicitly approved:

```bash
pnpm public-website:bridge-draft-contract
```

`--send` requires a configured shared secret and approved production/staging rollout. Do not use it as an ad-hoc write path.
