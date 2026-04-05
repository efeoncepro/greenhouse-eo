# Greenhouse Staging Access — Programmatic Bypass & Agent Auth

> **Version:** 1.0
> **Created:** 2026-04-05
> **Audience:** AI agents, CI pipelines, platform engineers
> **Related:** [GREENHOUSE_IDENTITY_ACCESS_V2.md](./GREENHOUSE_IDENTITY_ACCESS_V2.md) (Agent Auth), [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](./GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) (Cloud infra)

---

## 1. Problem Statement

Vercel Staging has **SSO Deployment Protection** active (`deploymentType: "all_except_custom_domains"`). Every HTTP request to Staging — including API calls — is intercepted by the Vercel authentication wall **before** reaching the Next.js application. This means agents, CI pipelines, and scripts cannot interact with Staging without first solving the SSO bypass.

The production custom domain (`greenhouse.efeoncepro.com`) is exempt from SSO. The staging custom domain (`dev-greenhouse.efeoncepro.com`) is **NOT exempt** — it receives the same protection.

## 2. Architecture

```
┌──────────────┐     ┌───────────────────────┐     ┌──────────────────────┐
│  Agent / CI  │────▶│  Vercel SSO Firewall  │────▶│  Next.js App Router  │
│              │     │                       │     │                      │
│  bypass hdr  │     │  checks x-vercel-     │     │  /api/auth/agent-    │
│  + cookie    │     │  protection-bypass    │     │  session → JWT       │
└──────────────┘     └───────────────────────┘     └──────────────────────┘
```

Two layers must be solved **sequentially**:

1. **Vercel SSO Bypass** — header `x-vercel-protection-bypass: <secret>` on every request
2. **NextAuth Session** — cookie from `/api/auth/agent-session` endpoint

Without the bypass header, Vercel returns an HTML SSO login page (HTTP 200, `text/html`) — the request never reaches Next.js.

## 3. Bypass Secret Resolution

The bypass secret is a UUID managed automatically by Vercel's system. It is **NOT** a user-created environment variable.

### 3.1 Where the secret lives

| Source                                            | Priority     | Notes                              |
| ------------------------------------------------- | ------------ | ---------------------------------- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` in env          | 1 (highest)  | Fast path — already resolved       |
| `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env.local` | 2            | Persisted by `staging-request.mjs` |
| Vercel API (`GET /v9/projects/{id}?teamId={tid}`) | 3 (fallback) | Requires Vercel CLI authentication |

### 3.2 Vercel API resolution

```
GET https://api.vercel.com/v9/projects/{projectId}?teamId={teamId}
Authorization: Bearer <vercel-cli-token>
```

Response includes:

```json
{
  "protectionBypass": {
    "<uuid-key>": {
      "scope": "automation-bypass"
    }
  }
}
```

The **UUID key** (not the value) is the bypass secret. The script picks the first entry with `scope === "automation-bypass"`.

### 3.3 Vercel CLI token location

The Vercel CLI stores its auth token at:

```
~/Library/Application Support/com.vercel.cli/auth.json
```

Format: `{ "token": "<bearer-token>" }`

### 3.4 Auto-persist

When the script fetches the secret from the Vercel API, it appends it to `.env.local` automatically for future runs.

## 4. Agent Authentication

After bypassing SSO, the agent authenticates against the Next.js application:

```
POST /api/auth/agent-session
Headers:
  Content-Type: application/json
  x-vercel-protection-bypass: <bypass-secret>
Body:
  { "secret": "<AGENT_AUTH_SECRET>", "email": "agent@greenhouse.efeonce.org" }
Response:
  { "ok": true, "cookieName": "...", "cookieValue": "...", "userId": "...", "portalHomePath": "..." }
```

The returned `cookieName=cookieValue` cookie must be sent on all subsequent requests, alongside the bypass header.

Full Agent Auth spec: [GREENHOUSE_IDENTITY_ACCESS_V2.md § Agent Auth](./GREENHOUSE_IDENTITY_ACCESS_V2.md)

## 5. Canonical Tool: `staging-request.mjs`

**Source:** `scripts/staging-request.mjs`
**pnpm alias:** `pnpm staging:request`

The script encapsulates the full pipeline: bypass resolution → agent auth → request → output.

### 5.1 Usage

```bash
# GET (default method)
pnpm staging:request /api/agency/operations

# POST with body
pnpm staging:request POST /api/some/endpoint '{"key":"value"}'

# Filter response keys matching a pattern
pnpm staging:request /api/agency/operations --grep reactive

# Pretty-print full response
pnpm staging:request /api/agency/operations --pretty

# Pipe-friendly (JSON to stdout, logs to stderr)
node scripts/staging-request.mjs /api/agency/operations | jq '.subsystems'
```

### 5.2 Flow

```
1. resolveBypassSecret()
   ├─ env var? → use it
   ├─ .env.local? → use it
   └─ Vercel API → fetch + persist to .env.local

2. agentAuth(bypassSecret)
   └─ POST /api/auth/agent-session with bypass header
   └─ returns { cookieName, cookieValue }

3. makeRequest(bypassSecret, cookie)
   └─ GET|POST target path with bypass + cookie
   └─ returns JSON body

4. Output
   ├─ --pretty → JSON.stringify(body, null, 2)
   ├─ --grep <pattern> → recursive key search
   └─ default → raw JSON to stdout
```

### 5.3 Environment variables

| Variable                          | Required          | Source                     | Purpose                                                        |
| --------------------------------- | ----------------- | -------------------------- | -------------------------------------------------------------- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | No (auto-fetched) | `.env.local` or Vercel API | SSO bypass                                                     |
| `AGENT_AUTH_SECRET`               | Yes               | `.env.local`               | Shared secret for agent-session endpoint                       |
| `AGENT_AUTH_EMAIL`                | No                | `.env.local`               | Override agent email (default: `agent@greenhouse.efeonce.org`) |
| `STAGING_URL`                     | No                | `.env.local`               | Override staging base URL                                      |

## 6. URLs

| URL                                                     | Use                                      | SSO? |
| ------------------------------------------------------- | ---------------------------------------- | ---- |
| `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` | Programmatic access (with bypass header) | Yes  |
| `dev-greenhouse.efeoncepro.com`                         | Browser access (human SSO login)         | Yes  |
| `greenhouse.efeoncepro.com`                             | Production (custom domain exempt)        | No   |

## 7. Security Rules

1. **NEVER** create `VERCEL_AUTOMATION_BYPASS_SECRET` manually in the Vercel dashboard. The variable is auto-managed by Vercel's system. A manual entry shadows the real value and silently breaks bypass.

2. **NEVER** `curl` directly to the `.vercel.app` staging URL without the bypass header. Vercel returns an HTML authentication page, not your API response.

3. **NEVER** commit `.env.local` or the bypass secret to Git.

4. The bypass secret can rotate when Vercel regenerates it. If requests start failing with HTML responses, delete `VERCEL_AUTOMATION_BYPASS_SECRET` from `.env.local` and re-run the script — it will auto-fetch the new value.

5. `AGENT_AUTH_SECRET` is compared using `crypto.timingSafeEqual` — no timing side-channel.

6. Agent Auth is **blocked in production** by default (`VERCEL_ENV === 'production'` → 403).

## 8. Vercel Project Reference

| Field        | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Project ID   | `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`                              |
| Team ID      | `efeonce-7670142f`                                              |
| Project name | `greenhouse-eo`                                                 |
| Staging URL  | `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` |
| Agent user   | `agent@greenhouse.efeonce.org` (`user-agent-e2e-001`)           |

## 9. Troubleshooting

| Symptom                       | Cause                                      | Fix                                                                                     |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| HTML response instead of JSON | Missing or wrong bypass header             | Check `VERCEL_AUTOMATION_BYPASS_SECRET` in `.env.local`. Delete and re-run to re-fetch. |
| 404 from agent-session        | `AGENT_AUTH_SECRET` not set in staging env | Verify variable exists in Vercel for Staging environment                                |
| 403 from agent-session        | Running against production                 | Agent Auth is blocked in production by default                                          |
| `ETIMEDOUT` fetching bypass   | Vercel CLI token expired                   | Run `vercel login` to refresh                                                           |
| Script finds no bypass entry  | `protectionBypass` empty in API response   | SSO Protection may be disabled — verify in Vercel project settings                      |
| Bypass works but auth fails   | Agent user not in PG                       | Verify `user-agent-e2e-001` exists in `greenhouse_core.users` on staging DB             |
