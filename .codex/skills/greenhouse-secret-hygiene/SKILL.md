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
