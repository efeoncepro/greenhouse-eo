---
name: greenhouse-secret-hygiene
description: Audit, sanitize, rotate, and verify Greenhouse secrets across GCP Secret Manager, Vercel env vars, auth, webhooks, and PostgreSQL. Invoke when a task touches `*_SECRET_REF`, Secret Manager payloads, secret rotation, env drift, or runtime failures caused by secret/config contamination.
user-invocable: true
argument-hint: "[describe the issue: which secret, which environment, what symptom]"
---

# Greenhouse Secret Hygiene

You are an operations engineer auditing and remediating secrets in Greenhouse EO. You follow a safety-first protocol: audit before acting, verify consumers after acting, document incidents when they happen.

## When to invoke

- A task touches `*_SECRET_REF` or GCP Secret Manager
- A runtime failure is caused by secret contamination, env drift, or auth/webhook breakage
- A secret rotation is needed (planned or incident-driven)
- An agent or developer reports 401/403/connection errors that smell like credential issues

## First reads

Read only what the task needs, in this order:

1. `AGENTS.md` — operational rules
2. `CLAUDE.md` — project conventions
3. `project_context.md` — current context
4. `Handoff.md` — recent changes
5. `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
6. `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

If the task touches a specific secret family, also read:

- **Webhooks**: `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- **Resend email lifecycle**: `docs/operations/runbooks/resend-email-lifecycle-rollout.md`
- **PostgreSQL**: `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- **Past incident**: `docs/issues/resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md`

Always inspect the real consumers before acting:

- `src/lib/secrets/secret-manager.ts` — canonical resolver with sanitization
- `src/lib/auth-secrets.ts` — auth secret resolution
- `src/lib/nubox/client.ts` — Nubox bearer token

---

## Core rules

1. **Never print raw secret values** into chat, logs, docs, commits, or tests.
2. **Default to read-only audit.** Do not rotate, update, or delete secrets unless the user explicitly instructs it.
3. **Runtime sanitization is defense in depth**, not permission to keep dirty payloads at source. Always fix the source.
4. **Scalar secrets are raw scalars only** — no wrapping quotes, no literal `\n`/`\r`, no residual whitespace.
5. **Never assume a secret is healthy** just because a new version exists. Verify the real consumer.
6. **Call out high-risk rotations explicitly** before executing:

| Secret | Risk |
|--------|------|
| `NEXTAUTH_SECRET` | Invalidates all active sessions. Users must re-login. |
| `WEBHOOK_*` / signing secrets | Must re-verify HMAC/signature on the real endpoint. |
| `GREENHOUSE_POSTGRES_*` passwords | Must validate with `pnpm pg:doctor` or a real connection. |
| `GOOGLE_CLIENT_SECRET` / `AZURE_AD_CLIENT_SECRET` | Can break SSO login for all users. |
| `NUBOX_*` | Can break finance integrations (invoice download, DTE). |
| Cloud KMS `auth-server-es256` versions | Retiring/disabling the wrong version breaks verification of in-flight tokens; only via `pnpm auth-server:rotate-key`. |

7. If a secret publication error caused runtime degradation, **document it as `ISSUE-###`** even if the fix also includes defensive code.

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

### Auth server signing key (Cloud KMS HSM)

The native authorization server (`services/auth-server`, `TASK-1828` / EPIC-044) signs with `auth-server-es256`
(EC P-256, HSM) in Cloud KMS `us-east4/auth-server`. The private key NEVER leaves KMS: signing goes through the KMS
API (CRC32C-checked, mandatory local verification of every signature) and PostgreSQL (`greenhouse_auth.signing_keys`
+ append-only `signing_key_events`) holds only the PUBLIC JWK (no `d`) and the lifecycle. There is no secret value to
publish, rotate in Secret Manager, paste or export — a "copy of the key" anywhere is an incident, not a backup.

- Rotation is `pnpm auth-server:rotate-key` (`--status` | `--register <version>` | `--retire <kid> [--force]`):
  create the new KMS version, register it (it becomes `active`, ≤1 active by partial index; the previous one moves
  to `retiring` and stays in the JWKS so in-flight tokens still verify), then retire the previous one after the
  overlap window (≥ 1 h) and `gcloud kms keys versions disable` it. Never `INSERT` into `signing_keys` by hand;
  never sign with a key that is not `active`; never leave a `retiring` version around indefinitely. The CLI needs
  the Cloud SQL proxy (`GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`,
  `GREENHOUSE_POSTGRES_SSL=false`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=""`) and `AUTH_SERVER_KMS_KEY`.
- Minimum IAM, resource-level only: runtime SA `auth-server@efeonce-group` = `roles/cloudkms.signerVerifier` on the
  key (+ `cloudsql.client`); deployer `github-actions-deployer@` = `roles/cloudkms.viewer` on the key +
  `iam.serviceAccountUser` on `auth-server@`. Never grant KMS roles at project level; the deployer never gets
  `signerVerifier`.
- Service env vars (`AUTH_SERVER_ENABLED`, `AUTH_SERVER_ISSUER`, `AUTH_SERVER_ALLOWED_HOSTS`, `AUTH_SERVER_KMS_KEY`)
  live only in `services/auth-server/deploy.sh` (`--set-env-vars`, destructive). Never
  `gcloud run services update --update-env-vars` by hand. Never share `NEXTAUTH_SECRET` or portal cookies with the
  issuer — the auth server is its own trust boundary and the portal login does not change.
- Signals: `auth.signing_keys.lifecycle` (data_quality) and `auth.issuer.jwks_unreachable`. Runbook:
  `docs/operations/runbooks/auth-server.md`; invariants: `.claude/rules/auth-server.md`.

---

## Workflow

### Step 1 — Classify the secret family

| Family | Examples | Source of truth |
|--------|----------|-----------------|
| **auth** | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `AZURE_AD_CLIENT_SECRET` | Secret Manager via `*_SECRET_REF` |
| **webhook** | `WEBHOOK_NOTIFICATIONS_SECRET`, signing/bypass secrets | Secret Manager via `*_SECRET_REF` |
| **database** | `GREENHOUSE_POSTGRES_PASSWORD`, `GREENHOUSE_POSTGRES_HOST` | Secret Manager via `*_SECRET_REF` or direct env |
| **provider** | `NUBOX_BEARER_TOKEN`, `SLACK_*`, `SENTRY_*`, `SCIM_*` | Secret Manager via `*_SECRET_REF` or direct env |
| **agent** | `AGENT_AUTH_SECRET` | Direct env only |
| **signing key** | `auth-server-es256` (Cloud KMS HSM) | KMS key version; no secret value exists anywhere |

### Step 2 — Confirm the resolution path

Check whether the consumer resolves from:

1. Secret Manager via `*_SECRET_REF` → `src/lib/secrets/secret-manager.ts` resolves it
2. Env fallback → `process.env[envVarName]` after Secret Manager miss
3. Direct env only → no Secret Manager involvement

Inspect the canonical resolver:

```typescript
// src/lib/secrets/secret-manager.ts
// normalizeSecretValue() strips:
//   - wrapping quotes (single or double)
//   - literal \n / \r suffixes
//   - leading/trailing whitespace
```

### Step 3 — Audit without exposing values

Detect contamination patterns without printing the actual value:

```bash
# Check if payload has wrapping quotes (DO NOT print the value)
gcloud secrets versions access latest --secret=<secret-id> | wc -c
# Compare expected length vs actual — extra bytes = likely contamination
```

Contamination patterns to detect:
- `"value"` or `'value'` — wrapping quotes
- `value\n` — literal newline suffix
- ` value ` — leading/trailing whitespace
- Value differs across `staging` vs `production` unexpectedly

### Step 4 — Choose the smallest safe remediation

**Option A — Source-only correction** (preferred when the payload is clearly wrong):

```bash
printf %s "$CLEAN_VALUE" | gcloud secrets versions add <secret-id> --data-file=-
```

**Option B — Defensive code hardening** (when source correction alone doesn't prevent recurrence):
- Strengthen `normalizeSecretValue()` in `src/lib/secrets/secret-manager.ts`
- Add test coverage in `src/lib/secrets/secret-manager.test.ts`

**Option C — Both** (when a real incident occurred):
- Fix source + harden code + document as ISSUE

### Step 5 — Verify the real consumer

After any change, verify the actual endpoint or integration that uses the secret:

| Family | Verification |
|--------|-------------|
| **auth** | `pnpm staging:request /api/auth/providers --pretty` → 200 AND `pnpm staging:request /api/auth/session --pretty` → 200 |
| **webhook** | Trigger a real webhook event or verify HMAC signature on the endpoint |
| **database** | `pnpm pg:doctor` or `pnpm pg:connect` |
| **provider (Nubox)** | `pnpm staging:request /api/finance/income --pretty` → 200 |
| **provider (other)** | Hit the actual API route that uses the secret |

For production verification:
```bash
curl -s https://greenhouse.efeoncepro.com/api/auth/providers | head -c 100
curl -s https://greenhouse.efeoncepro.com/api/auth/session | head -c 100
```

### Step 6 — Close the loop in docs

| What changed | Where to document |
|-------------|-------------------|
| Runtime behavior or workflow | `changelog.md` |
| Matters to next agent | `Handoff.md` |
| Contract or operating rule changed | `project_context.md` |
| Real incident (runtime degradation) | `docs/issues/open/ISSUE-###-*.md` (follow ISSUE protocol in CLAUDE.md) |

---

## Contamination cheat sheet

| Pattern | Example | Fix |
|---------|---------|-----|
| Wrapping double quotes | `"my-secret-value"` | `printf %s 'my-secret-value' \| gcloud secrets versions add ...` |
| Wrapping single quotes | `'my-secret-value'` | Same — strip quotes at source |
| Literal `\n` suffix | `my-secret-value\n` | Re-publish without trailing newline |
| Literal `\r\n` | `my-secret-value\r\n` | Re-publish clean |
| Whitespace padding | ` my-secret-value ` | Re-publish trimmed |
| JSON-serialized string | `"\"my-secret-value\""` | Re-publish as raw scalar |

---

## Output expectations

When using this skill, report:

1. **Which secret family** is affected
2. **Root cause**: source contamination, env drift, consumer bug, or mix
3. **What was changed** (source, code, or both)
4. **What consumer was verified** and the exact verification command/result
5. **Residual risk**, if any

Keep reports concise and operational. No theory — just findings, actions, and verification.
