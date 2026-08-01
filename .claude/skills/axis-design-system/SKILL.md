---
name: axis-design-system
description: "Use for any task involving the Efeonce AXIS design-system packages: tokens, contracts, registry, versioning, adapters, private-package consumption, canaries, release gates, rollback, or distribution credentials."
---

# AXIS Design System

## Purpose and boundaries

AXIS is the portable, versioned package foundation for tokens, contracts and registry metadata. It
is not MUI, Vuexy, a product runtime, or a replacement for Greenhouse's domain UI. Keep AXIS
runtime-agnostic and keep product-specific behavior in adapters.

Before changing a contract, token, package, consumer, canary or release, read only the relevant
canonical source:

- Architecture and ownership: [shared UI platform decision](../../docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md).
- Distribution and credentials: [private package runbook](../../docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
- Current continuity and evidence: [AXIS continuity map](../../docs/operations/AXIS_CONTINUITY_MAP_2026-07-29.md).
- Ownership decision: [AXIS ownership ADR](../../docs/architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md).
- Agent-facing visual guide: [AXIS `DESIGN.md`](https://github.com/efeoncepro/axis-design-system/blob/main/DESIGN.md), generated from the token package and pushed at commit `0e3c4d6`.
- Color ownership cutover: [TASK-1600](../../docs/tasks/in-progress/TASK-1600-axis-color-ownership-inversion.md).
- Foundation history and task status: [TASK-1589](../../docs/tasks/in-progress/TASK-1589-efeonce-ui-package-foundation.md) when present.
- Release procedure: \`.codex/skills/greenhouse-production-release/SKILL.md\`.
- Secret procedure: \`.codex/skills/greenhouse-secret-hygiene/SKILL.md\`.

## Non-negotiable invariants

- \`@efeoncepro/axis-tokens\`, \`axis-ui-contracts\` and \`axis-ui-registry\` remain portable: no
  imports from MUI, Vuexy, Next, browser globals or product logic.
- AXIS owns the portable value and semantic role; each product owns materialization in its own
  styling engine. AXIS may publish values, never painted components or engine-specific appearance.
- AXIS owns portable color values, semantic roles, neutral light/dark data and chart palettes. Products own
  engine-specific materialization such as MUI's `axisSemanticPalette`, product flags and layout/painted components.
  Brand-value changes are signed through the Greenhouse ADR/task governance before an AXIS package release.
- Consumers use exact published versions. Never use a floating range for a release-critical
  consumer, and never repoint an existing contract id to a different shape.
- Lifecycle promotion (\`candidate → trial → stable → deprecated → retired\`) is additive metadata.
  A shape change requires a major contract version or a new id.
- Adapters are \`reuse | extend | new\` decisions. Do not duplicate an existing primitive or move
  product UI into AXIS merely because it shares a visual token.
- Production release does not equal product-wide promotion: keep adapters opt-in until the
  consumer evidence and commercial/product gates explicitly authorize broader rollout.

## Choose the workflow

### Tokens, contracts or registry

1. Inspect the current ADR and package exports before editing.
2. Update the owning SSOT and its drift/shape gates together.
3. Keep package version, contract version and lifecycle metadata distinct.
4. Run the AXIS repository's build, typecheck, tests and promotion gates.
5. Record the published package version and consumer evidence in the runbook.

### Agent-facing visual guide

`../axis-design-system/DESIGN.md` is the AXIS visual guide for humans and coding agents. It follows the
Google `DESIGN.md` alpha format and passes the official linter with zero errors and warnings. It is a
generated projection, not a second source of truth: standard frontmatter values come from
`packages/tokens/src/tokens.ts`, while AXIS-specific brand, mode and role mappings remain governed by the
packages and ADRs.

When token values change, run `pnpm design:generate` in the AXIS repository and verify
`pnpm design:check`. Do not edit generated frontmatter by hand. Do not treat the AXIS guide as a replacement
for Greenhouse's root `DESIGN.md`, which remains the product-specific MUI/Vuexy contract.

### AXIS Lab

The Lab lives in `../axis-design-system/apps/lab`, not in Greenhouse. Its current runtime is Astro 7.1.6
with `output: 'static'`, public Vercel delivery, and no consumer adapter imports. The static reference is
derived from the published/workspace registry and tokens. Astro Content Loader validates contracts and generates
the catalog, per-pattern routes, MDX usage docs and sitemap; search uses a minimal vanilla script rather than a
hydrated React application.

For Lab work, run `pnpm --filter @efeonce/axis-design-system-lab build`, `typecheck`, `test` and `lint` in
the AXIS repository. `astro check` is the type/lint gate; `test` runs Vitest and `test:e2e` runs Playwright
desktop/mobile smoke. Do not add SSR, Actions, secrets, Greenhouse imports or product-specific adapters to
the Lab; a missing portable contract is an AXIS gap.

### Color ownership cutover (TASK-1600)

Treat this as a staged provenance migration, not a visual redesign:

1. Slice 0: align this skill with the accepted ownership ADR.
2. Slice 1: publish the complete portable color data in `@efeoncepro/axis-tokens@0.2.0`, preserving
   the existing `0.1.5` roles and values.
3. Slice 2: invert the consumer drift gate so Greenhouse proves it reflects AXIS; ship this before
   removing the local declaration.
4. Slice 3: make the five Greenhouse `axis-*.ts` files consume AXIS while keeping MUI materialization
   local; no consumer import path should change.
5. Slice 4: verify non-theme consumers, including Finance PDF and report artifacts.

Slice 1 publishes explicit light/dark neutrals; products resolve the active mode. `axisSemanticPalette` remains
local because it is MUI-shaped. Charts are portable AXIS data; product-specific subsets remain local. Do not run
Slice 3 before Slice 2 is green. Require unchanged contrast/drift tests, GVC diffs at 1440 px and 390 px
in light and dark, and before/after PDF comparisons. No feature flag is needed: exact package versions
provide pull-based rollback, and `0.1.5` remains the fallback if `0.2.0` is not adopted.

The boundary is: AXIS owns **what** (`#dc2e39`, semantic roles, portable data); the product owns **how**
(`theme.palette`, Tailwind utilities, layout and painted components). The separate `axis-headless` behavior
axis is not part of TASK-1600 and needs its own task.

### Private package consumption

Use \`GITHUB_TOKEN\` for GitHub Actions when repository package access is configured. Cloud Build uses
only \`projects/efeonce-group/secrets/axis-packages-read-token\` with least-privilege access for the
required build identities. The legacy \`efeonce-globe\` secret is retired and must not be recreated.

Never print, paste, commit, screenshot or log a credential. Stream a temporary \`read:packages\`
credential directly to Secret Manager; retain only non-sensitive metadata. The current temporary
operator-owned credential is an interim risk: replace it with a dedicated machine identity before
external/customer rollout.

For a migration, inventory active consumers first; create/enable the replacement; grant IAM; run
non-leaking package-install/build checks; deploy and verify revision/SHA/digest; only then disable
and revoke the legacy credential. Do not delete or revoke anything before production evidence is
green.

### Consumer canary

Canaries are opt-in, deterministic and read-only unless the contract requires a mutation. Use
\`playwright-core\` and \`chromium.launch({ channel: 'chrome' })\`; never download browsers or hardcode
an author's local executable/profile path. Exercise the real consumer surface, not a mock invented
by the canary. Artifacts may contain target SHA, package version, URL, assertions and redacted
console/network diagnostics, but never cookies, authorization headers or secrets.

### Release and rollback

Release evidence must include target SHA, package versions, CI/build run, image/deployment digest,
active revision, smoke/health result, canary result and the previous known-good rollback target.
Verify the artifact contains neither \`.npmrc\` nor the package credential. If a canary or runtime
check fails, stop promotion or restore the previous deployment, then verify health and smoke again;
preserve both digests and the build/credential configuration needed to reproduce the rollback.

## Stop conditions

Stop and surface the blocker when the requested change would:

- put a secret in source, logs, images, lockfiles or chat;
- move a color source or remove a local declaration before the preceding drift, visual and PDF evidence is green;
- change a shared contract without an owning ADR/gate;
- promote adapters beyond opt-in without product/commercial authorization;
- require a new machine identity or external account decision not yet approved;
- rely on a stale document when runtime, schema or deployed evidence says otherwise.
