---
name: greenhouse-secret-hygiene
description: Audit, sanitize, rotate safely, and verify Greenhouse secrets across GCP Secret Manager, Vercel env vars, auth, webhooks, and PostgreSQL. Use when a task touches `*_SECRET_REF`, Secret Manager payloads, secret rotation, env drift, or runtime failures caused by secret/config publication.
---

# Greenhouse Secret Hygiene

Use this skill when the task involves secrets, `*_SECRET_REF`, Secret Manager payloads, auth secrets, webhook signing secrets, provider bearer tokens, or PostgreSQL passwords.

## First reads

Read only what the task needs, in this order:

- `<repo>/AGENTS.md`
- `<repo>/CLAUDE.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `<repo>/docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `<repo>/docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `<repo>/docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `<repo>/docs/operations/ISSUE_OPERATING_MODEL_V1.md`

If the task touches a specific secret family, also read:

- webhooks: `<repo>/docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- Resend email lifecycle: `<repo>/docs/operations/runbooks/resend-email-lifecycle-rollout.md`
- PostgreSQL passwords: `<repo>/docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- recent incident context: `<repo>/docs/issues/resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md`

If code is being changed, inspect the real consumers before acting:

- `<repo>/src/lib/secrets/secret-manager.ts`
- `<repo>/src/lib/auth-secrets.ts`
- `<repo>/src/lib/nubox/client.ts`

## What this skill covers

- auditing Secret Manager and env-backed secrets
- detecting contamination patterns:
  - wrapping quotes
  - literal `\n` / `\r`
  - leading or trailing whitespace
  - branch or environment drift
- classifying risk by consumer:
  - auth
  - webhooks
  - PostgreSQL
  - third-party providers
- safe remediations
- post-rotation verification
- issue and handoff documentation when secrets break runtime

## Core rules

- Never print or paste raw secret values into the chat, logs, docs, commits, or tests.
- Default to read-only auditing unless the user explicitly wants rotation or source correction.
- A runtime sanitizer is defense in depth, not permission to keep dirty payloads at source.
- Treat scalar runtime secrets as raw scalars only:
  - no wrapping quotes
  - no literal `\n` / `\r`
  - no residual whitespace
- When writing or rotating a scalar secret, prefer:

```bash
printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
```

- Never assume a secret is healthy just because a new version exists. Verify the real consumer.
- High-risk rotations must be called out explicitly:
  - `NEXTAUTH_SECRET` can invalidate sessions and force re-login
  - webhook secrets require signature/HMAC verification
  - PostgreSQL passwords require `pnpm pg:doctor` or a real connection test
- If a secret publication error caused runtime degradation, document it as `ISSUE-###` even if the fix also includes defensive code.

### Resend webhook signing secret

Treat `RESEND_WEBHOOK_SIGNING_SECRET` as an inbound verification secret, separate from the outbound
`RESEND_API_KEY`. The Resend webhook is global email infrastructure, not Hiring-only, and its outage must never
block or disable `sendEmail`.

- The canonical source is Secret Manager through `RESEND_WEBHOOK_SIGNING_SECRET_SECRET_REF`; direct env is a
  governed fallback only. Publish the `whsec_` value as a raw scalar.
- Resend API/SDK create, get and list responses may contain `signing_secret`. Never print or serialize the full
  response. Transfer the secret directly to Secret Manager and retain only webhook ID, endpoint, event set,
  status and timestamp as evidence.
- A missing/unavailable secret, cold start or persistence failure must produce a retryable non-2xx response.
  Never acknowledge an unverifiable event as ignored.
- Verify over the raw body and Svix headers before parse/persist; retain `svix-id` only as the dedupe key. Never
  log signature headers, raw payload, email body, provider error or token-bearing URL.
- Deploy the handler without a subscription first; prove outbound sending independently; then register one
  minimal event, run a signed canary and only afterward expand the global event set.
- Rotation is complete only after a cold-start signed event and a replay/dedupe check. Disable the provider
  webhook during drift. Do not rotate or remove `RESEND_API_KEY` as webhook rollback.
- Resend click tracking is a domain-level provider setting. Read it through the API; do not enable assessment
  fragment links unless `click_tracking=false` and a received-href smoke preserves the fragment.
- Do not claim runtime readiness from code or docs. Migration, secret ref, provider registration, deploy,
  signed canary, reconciliation and readbacks are separate evidence.

### AXIS private package credential

Treat the AXIS package read credential as a provider/build secret, not as application configuration. The current production reference is `projects/efeonce-group/secrets/axis-packages-read-token`; the legacy `efeonce-globe` reference must not be reintroduced. Grant access only to the build identity that installs the private packages. Never print, paste, commit, or place the token in a Docker build argument, image, lockfile, deployment artifact, or log.

For Cloud Build, materialize the scoped `.npmrc` only in the ephemeral build workspace, run the frozen install, and remove or discard it before producing the artifact. Verify the package install, absence of `.npmrc` and the token from the resulting image, and the build/deployed digest relationship without revealing the secret. Use the repository's configured `gcloud` profile and Secret Manager IAM for inspection; do not substitute a bearer `curl` probe against Google APIs. A package-registry probe may verify the credential against GitHub Packages, but must stream the secret without printing it and report only status/metadata.

The current operator-owned PAT is a temporary distribution credential with an expiration recorded in the secret-rotation evidence. When creating it through an authenticated browser, request only `read:packages`, set the shortest practical expiry, record the token note/owner/expiry without recording the value, and stream it directly into Secret Manager. Do not paste it into chat, shell history, CI variables, files, or screenshots. Replace it with a dedicated Efeonce machine identity limited to `read:packages` before external/customer rollout, with an explicit rotation owner. A successful package install does not remove this residual risk or prove `TASK-1591` consumer integration is complete.

For a migration from the legacy AXIS credential: (1) inventory all code, workflow, Cloud Build, IAM, and runtime references; (2) create/enable the replacement secret in the control-plane project; (3) grant only the required build identities; (4) publish the temporary credential by stdin; (5) run a non-leaking package-install/build verification; (6) deploy and verify the consumer digest/revision; and only then (7) disable the legacy secret version and revoke the legacy credential. Keep the legacy container disabled, rather than deleting it immediately, if a short recovery window is required. Never revoke the replacement credential or delete the legacy secret before production evidence is complete.

## Workflow

1. Identify the secret lane

- `auth`: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `AZURE_AD_CLIENT_SECRET`
- `webhook`: `WEBHOOK_*`, signing or bypass secrets
- `database`: `GREENHOUSE_POSTGRES_*`
- `provider`: Nubox, Slack, Sentry, SCIM, others

2. Confirm the source of truth

- check whether the consumer resolves from:
  - Secret Manager via `*_SECRET_REF`
  - env fallback
  - direct env only
- inspect the real runtime helper before making assumptions

**Declared ≠ mounted ≠ permitted — three separate things, and a working runtime needs all three.**

| What you did | What it gives you | What it does NOT give you |
|---|---|---|
| Declare `X_SECRET_REF` as an env var | The async resolver a name to look up | The value in `process.env.X` |
| `ensure_secret_accessor_binding` (IAM) | Permission to read it | Anyone actually reading it |
| Mount it (`--update-secrets X=<ref>`) | The value in `process.env.X` at boot | — |

A binding without a mount grants permission to read something nobody is reading. Whether the ref alone
suffices depends entirely on the consumer: a **synchronous** reader (`process.env` or an already-warm
cache) needs the mount; only a consumer that awaits the async resolver can live on the ref. Source case
2026-09-05: `services/auth-server/deploy.sh` declared `RESEND_API_KEY_SECRET_REF` and granted its
accessor binding, but never mounted `RESEND_API_KEY` — and `sendEmail` resolves Resend through the
**synchronous** client. Production magic-link email failed for days with `RESEND_API_KEY is not
configured`. `services/ops-worker/deploy.sh` works because it mounts it.

3. Audit without exposing values

- detect whether the payload shape is likely contaminated
- compare source hygiene across affected environments
- classify the blast radius by consumer and environment

4. Choose the smallest safe remediation

- source-only correction in Secret Manager
- defensive code hardening in the canonical resolver
- both, if source correction alone is not enough to prevent recurrence

5. Verify the real consumer

- auth:
  - `/api/auth/providers`
  - `/api/auth/session`
- webhooks:
  - signature/HMAC verification path
  - live or staging consumer endpoint
- PostgreSQL:
  - `pnpm pg:doctor`
  - or a real connection through the intended profile
- provider secrets:
  - the actual API route or integration request that was failing

**`gcloud secrets versions access` is not verification.** It proves the payload exists and is clean in
Secret Manager; it says nothing about whether the runtime that needs it can see it. Exercise the **real
consumer** and read its own observable evidence — the delivery ledger row, the signed webhook, the
downstream write — not the store. In a runtime that is new to that secret, this is the only step that
catches a declared-but-unmounted ref.

6. Close the loop in docs

- `Handoff.md` if the change matters to the next agent
- `changelog.md` if runtime behavior or workflow changed
- `project_context.md` if the contract or operating rule changed
- `docs/issues/*` when the failure was a real incident

## Output expectations

When using this skill, report:

- which secret family is affected
- whether the root cause is source contamination, env drift, consumer bug, or a mix
- what was changed
- what exact consumer was verified
- what residual risk remains, if any

Prefer concise, operational language over long theory.
