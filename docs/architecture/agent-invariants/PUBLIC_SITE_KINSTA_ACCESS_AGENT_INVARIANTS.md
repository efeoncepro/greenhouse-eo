# Public Site Kinsta Access — Agent Invariants

## Purpose

Prevent agents from treating a missing Kinsta API token or a replaced `.env.local` file as proof
that SSH/WP-CLI access is unavailable.

This contract applies to any operation against the live Efeonce WordPress runtime on Kinsta.

## Two Independent Access Lanes

Kinsta API and Kinsta SSH/WP-CLI are separate capabilities:

| Lane | Used for | Credential | Readiness command |
| --- | --- | --- | --- |
| SSH/WP-CLI | WordPress inspection, governed PHP via WP-CLI, runtime export and WP-CLI cache purge | Local SSH key + connection metadata | `pnpm public-website:ssh-check` |
| Kinsta API | Provider API automation such as backups and API-driven cache/deploy controls | `PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF` | Provider-specific API verification |

An unavailable or unconfigured API lane does **not** imply that SSH/WP-CLI is unavailable. Never
use `PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF` as the SSH readiness signal.

## Mandatory Preflight

Before any SSH, remote WP-CLI, live-code export or WP-CLI cache operation, run:

```bash
pnpm public-website:ssh-check
```

The command is read-only. It verifies that:

- the dedicated local operations profile is loaded;
- every required SSH field is configured;
- the configured private-key file exists;
- batch SSH authentication succeeds;
- WP-CLI reaches the expected WordPress installation and returns `https://efeoncepro.com` as home.

Do not diagnose SSH from `public-website:runtime-status` alone. That command reports local readiness
for both lanes, while `public-website:ssh-check` performs the real SSH/WP-CLI verification.

## Local Configuration Contract

Public-site commands load local configuration in this order:

1. `.env.public-website.local`
2. `.env.local`
3. `.env`

Use `.env.public-website.local` for Kinsta SSH metadata. It is gitignored and intentionally separate
from `.env.local`, because Vercel CLI may regenerate `.env.local` during `vercel env pull`.

Required variables:

```text
PUBLIC_WEBSITE_KINSTA_SSH_HOST
PUBLIC_WEBSITE_KINSTA_SSH_PORT
PUBLIC_WEBSITE_KINSTA_SSH_USER
PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH
PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH
```

The private key itself must remain under `~/.ssh/` and must never be committed, printed or copied
into documentation. A host alias such as `efeonce-kinsta` in `~/.ssh/config` is a convenience, not
the source of truth for repo commands.

## Failure Decision Tree

1. If `ssh-check` passes, use the canonical wrapper:
   `pnpm public-website:wpcli -- --eval-file ./tmp/<script>.php --wp-user 12`.
2. If variables are missing, inspect `.env.public-website.local` before generating keys or changing
   Kinsta access. Do not conclude that access was revoked.
3. If the key file is missing, inspect the existing `~/.ssh/` inventory and prior handoff before
   provisioning a replacement.
4. If authentication fails with a present key, verify host/user/port against MyKinsta and the key
   registered there. Do not fall back to passwords.
5. If SSH succeeds but WP-CLI reports another home URL, stop: the target installation is wrong.
6. Only use another operational lane after classifying why SSH is unsuitable. Do not use a public
   cache-purge endpoint as the primary path while governed SSH/WP-CLI is healthy.

## Mutation Boundary

Passing `ssh-check` proves connectivity only. It does not authorize mutation. Publishing, cache
purge, plugin changes, filesystem writes and WordPress writes still require the explicit user intent,
snapshot, rollback and live verification rules from the `efeonce-public-site-wordpress` skill.
