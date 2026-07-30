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
- Foundation history and task status: [TASK-1589](../../docs/tasks/in-progress/TASK-1589-efeonce-ui-package-foundation.md) when present.
- Release procedure: \`.codex/skills/greenhouse-production-release/SKILL.md\`.
- Secret procedure: \`.codex/skills/greenhouse-secret-hygiene/SKILL.md\`.

## Non-negotiable invariants

- \`@efeoncepro/axis-tokens\`, \`axis-ui-contracts\` and \`axis-ui-registry\` remain portable: no
  imports from MUI, Vuexy, Next, browser globals or product logic.
- AXIS names semantic roles; it does not become the owner of a product brand value. Check the
  current SSOT and drift gate before changing a token.
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
- change a shared contract without an owning ADR/gate;
- promote adapters beyond opt-in without product/commercial authorization;
- require a new machine identity or external account decision not yet approved;
- rely on a stale document when runtime, schema or deployed evidence says otherwise.
