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

7. If a secret publication error caused runtime degradation, **document it as `ISSUE-###`** even if the fix also includes defensive code.

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
