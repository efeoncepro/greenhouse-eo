# AXIS Private Package Consumption Runbook V1

## Purpose

This runbook describes how Greenhouse, Globe and future Efeonce products consume the
private AXIS packages without coupling runtimes or placing personal credentials in
source control.

## Current state — 2026-07-28

- Package repository: `efeoncepro/axis-design-system`.
- Private packages published at version `0.1.2`:
  - `@efeoncepro/axis-tokens`
  - `@efeoncepro/axis-ui-contracts`
  - `@efeoncepro/axis-ui-registry`
- Lab: `https://axis-design-system-lab.vercel.app`.
- Greenhouse and Globe are not runtime consumers yet.
- The consumer rollout remains gated by `TASK-1591`.
- GitHub Actions read access is configured for `efeoncepro/greenhouse-eo` and
  `efeoncepro/efeonce-globe` on all three packages.
- Vercel `NPM_RC` is configured on `axis-design-system-lab` for Production and Preview.
- GCP Secret Manager secret `axis-packages-read-token` exists in `efeonce-globe`; the
  Compute Engine service account used by Cloud Build has secret-level
  `roles/secretmanager.secretAccessor`.
- The current PAT is operator-owned and expires on 2026-08-27. Replace it with a
  dedicated machine identity before the first external/customer rollout.

## Required GitHub package access

GitHub Packages requires authentication for private packages. For GitHub Actions,
`GITHUB_TOKEN` is sufficient only when the consuming repository has been granted read
access to the package. Configure this in each package's GitHub settings:

`Package settings → Manage Actions access → Add repository`

Add:

- `efeoncepro/greenhouse-eo`
- `efeoncepro/efeonce-globe`

Repeat for all three AXIS packages. Do not make the packages public as a shortcut.

## Consumer `.npmrc`

Do not commit a token. The build environment must provide the token through its secret
manager and materialize this configuration only for the install step:

```ini
@efeoncepro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${AXIS_PACKAGES_READ_TOKEN}
```

For local development, use a developer-owned `~/.npmrc` or an ignored project-local
file. Never add the resolved token to git, a deployment artifact or a log.

## Vercel

For a Vercel consumer, configure the project environment variable `NPM_RC` with the
`.npmrc` contents and select only the required environments (`Preview` first, then
`Production` after a successful canary). Vercel must receive an organization-owned
PAT classic with `read:packages` only; do not use a personal deployment token.

After setting `NPM_RC`, trigger a new deployment. Environment changes do not affect
previous deployments.

## Cloud Build / Globe

Store the organization-owned read-only token in Secret Manager in the `efeonce-globe`
project. Grant the build service account access to that one secret only. The build
step writes the `.npmrc` file to the ephemeral workspace, runs `pnpm install --frozen-lockfile`,
and removes the file before producing the artifact. The token must not be passed as a
Docker build argument or copied into the image.

Current secret reference:

```text
projects/efeonce-globe/secrets/axis-packages-read-token
```

Current build identity:

```text
818083690953-compute@developer.gserviceaccount.com
```

The deployment workflow must prove:

1. package installation succeeds;
2. the resulting image does not contain `.npmrc` or the token;
3. the deployed digest matches the build digest;
4. rollback restores the previous package version and image digest.

## Credential options

GitHub Packages currently supports a classic PAT for this registry. The preferred
operational model is a dedicated Efeonce machine account with `read:packages` only,
short expiration and documented rotation owner. Do not send the token through chat.

## Consumer integration sequence

1. Grant repository read access to all AXIS packages.
2. Configure the read-only token in Vercel and/or Secret Manager.
3. Add the scoped registry configuration without resolving the secret in source.
4. Add fixed package versions, starting at `0.1.2`.
5. Implement one simple and one complex adapter under the consumer's native runtime.
6. Run desktop, 390 px, keyboard, reduced-motion, accessibility and visual-diff evidence.
7. Record the consumer and evidence in the AXIS registry.
8. Promote only after rollback and a fresh install have passed.

## Rollback

Rollback means reverting the consumer package version or adapter flag. It does not mean
mutating the shared contract or deleting a package. Keep the last known-good package
version in the consumer lockfile and deployment evidence.

## Evidence and ownership

- Architecture: `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.
- Umbrella: `TASK-1588`.
- Consumer pilot: `TASK-1591`.
- Package foundation: `TASK-1589`.
- Registry/Lab: `TASK-1590` and `TASK-1592`.
- Package repository: `../axis-design-system`.
