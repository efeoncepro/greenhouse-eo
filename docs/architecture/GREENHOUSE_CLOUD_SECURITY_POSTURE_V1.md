# Greenhouse EO — Cloud Security & Operational Posture

> **Version:** 1.0
> **Created:** 2026-03-28
> **Audience:** Platform engineers, security reviewers, on-call operators
> **Companion doc:** `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (resource inventory)
> **Task track:** TASK-096, TASK-098 through TASK-103 (Cloud Posture Hardening 1–7)

---

## 1. Purpose

This document defines the target security posture, observability strategy, and operational resilience baseline for Greenhouse EO's cloud infrastructure. It serves as the architectural reference for the Cloud Posture Hardening track (7 tasks) and governs how secrets, credentials, monitoring, and database resilience should be managed going forward.

It is **not** a task execution plan — each task has its own detailed spec in `docs/tasks/to-do/`. This document is the "why" and "what"; the tasks are the "how".

---

## 2. Current State Assessment (March 2026)

### 2.1 Platform Profile

| Dimension | Value |
|-----------|-------|
| GCP Project | `efeonce-group` |
| Vercel Team | Efeonce Group |
| API Routes | 238 |
| Cron Jobs | 18 (Vercel) + 4 (Cloud Scheduler) |
| Cloud Run/Functions | 10 services |
| PostgreSQL schemas | 9 |
| BigQuery datasets | 13 (200+ tables) |
| Secrets | 18 total (6 critical) |
| Active developers | 1 |
| Data sensitivity | High — payroll, compensation, identity, tax documents (SII/Nubox) |

### 2.2 Security Scorecard (Pre-Hardening)

| Dimension | Score | Key Gap |
|-----------|-------|---------|
| Secret Management | 2/10 | Static SA key in env var, no rotation, no audit |
| Network Security | 1/10 | Cloud SQL open to `0.0.0.0/0`, optional SSL |
| Security Headers | 1/10 | No middleware.ts, no CSP/HSTS/X-Frame |
| Observability | 1/10 | `console.error()` only, zero external alerting |
| CI/CD Validation | 3/10 | Lint + build only, 86 test files not in CI |
| API Auth Consistency | 4/10 | 2 inconsistent cron auth patterns, no timing-safe |
| Database Resilience | 4/10 | Daily backup, no PITR, pool=5, no slow query logging |
| Cost Visibility | 0/10 | No budget alerts, no BigQuery cost guards |

### 2.3 Threat Model

| Threat | Current Exposure | Impact |
|--------|-----------------|--------|
| SA key leak (env var exfiltration) | **High** — never-expiring JSON key with BigQuery + Cloud SQL + Storage + Vertex AI access | Full GCP compromise |
| Cloud SQL brute force | **High** — `0.0.0.0/0` + optional SSL + password in env var | Database compromise (payroll, identity, finance) |
| XSS / Clickjacking | **Medium** — no CSP, no X-Frame-Options | Session hijacking, data exfiltration |
| Cron route spoofing | **Medium** — loose auth (Pattern A accepts x-vercel-cron without secret) | Unauthorized data mutation |
| BigQuery cost bomb | **Medium** — no `maximumBytesBilled` | $5-50 per accidental full-scan |
| Silent production failure | **High** — zero alerting on cron/webhook/projection failures | Data inconsistency, delayed detection |
| Backup unusable | **Medium** — never tested restore, no PITR | Unable to recover from corruption |

---

## 3. Target Architecture

### 3.1 Secret Management Strategy

#### Principle: Eliminate static credentials, not centralize them

The goal is **not** to move all 18 env vars to Secret Manager — that's overhead without proportional security gain. The strategy is:

1. **Eliminate the highest-risk credential** (SA key) via Workload Identity Federation
2. **Protect the 6 critical secrets** via Secret Manager with audit logging
3. **Leave low-risk config** in Vercel env vars (encrypted at rest)

#### Target Credential Flow

```
                        ┌──────────────────────────┐
                        │     Vercel Runtime        │
                        │                           │
  OIDC Token (ephemeral)│   ┌─────────────────┐    │
  ─────────────────────►│   │ google-          │    │
                        │   │ credentials.ts   │    │
                        │   └────────┬─────────┘    │
                        │            │               │
                        │     ┌──────▼──────┐        │
                        │     │  WIF Pool   │        │
                        │     │  (keyless)  │        │
                        │     └──────┬──────┘        │
                        │            │               │
                        │   ┌────────▼────────┐      │
                        │   │ Impersonate SA  │      │
                        │   │ greenhouse-     │      │
                        │   │ runtime@        │      │
                        │   └────────┬────────┘      │
                        │            │               │
                        └────────────┼───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                 │
              ┌─────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐
              │ BigQuery   │  │ Cloud SQL   │  │ Cloud       │
              │ (read/     │  │ (connector) │  │ Storage     │
              │  write)    │  │             │  │ (media)     │
              └────────────┘  └─────────────┘  └─────────────┘
```

**Key decisions:**
- Vercel OIDC token → WIF → SA impersonation (no static key in runtime)
- SA key retained **only** for Preview environments and local dev (fallback)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` removed from Production and Staging

#### Secret Classification

| Tier | Criteria | Storage | Rotation | Audit | Count |
|------|----------|---------|----------|-------|-------|
| **Critical** | Compromise = financial/legal/identity damage | GCP Secret Manager | Future: automated | Cloud Audit Logs | 6 |
| **Standard** | Compromise = limited blast radius | Vercel env vars (encrypted) | Manual | Vercel audit log | 10 |
| **Eliminated** | Replaced by keyless auth | N/A | N/A | N/A | 2 (SA key + base64 variant) |

**Critical secrets (Secret Manager):**
1. `GREENHOUSE_POSTGRES_PASSWORD` (runtime)
2. `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
3. `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
4. `NEXTAUTH_SECRET`
5. `AZURE_AD_CLIENT_SECRET`
6. `NUBOX_BEARER_TOKEN`

**Standard secrets (Vercel env vars):**
- `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `GREENHOUSE_INTEGRATION_API_TOKEN`, `CRON_SECRET`, `HR_CORE_TEAMS_WEBHOOK_SECRET`, `NUBOX_X_API_KEY`, `SLACK_ALERTS_WEBHOOK_URL`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

**Eliminated:**
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (replaced by WIF)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` (replaced by WIF)
- `GCP_ACCESS_TOKEN` (deprecated legacy)

### 3.2 Observability Strategy

#### Principle: Detect failures in minutes, not days

```
Error occurs
    │
    ├──► Sentry (automatic)
    │      • Stack trace + request context
    │      • Deduplication + alerting rules
    │      • Source maps for production debugging
    │
    ├──► Slack (cron failures only)
    │      • #greenhouse-alerts channel
    │      • 5 critical crons: outbox, webhook, sync, ico, nubox
    │
    └──► Health endpoint (deploy validation)
           • GET /api/internal/health
           • Validates: Postgres connectivity, BigQuery access
           • Returns: service status + git SHA + environment
```

**What we intentionally skip:**
- APM (Datadog/New Relic) — cost + complexity > value for 1 developer
- Distributed tracing (OpenTelemetry) — monolith, not microservices
- Structured logging library — Sentry captures what matters; console.error is fine for debug
- Uptime monitoring service — health endpoint enables this later if needed

### 3.3 Network Security

#### Cloud SQL Network Hardening

```
Before:  0.0.0.0/0 → Cloud SQL (any IP, optional SSL)
After:   Vercel IPs + Cloud Run NAT + Dev VPN → Cloud SQL (restricted, SSL enforced)
```

| Control | Before | After |
|---------|--------|-------|
| Authorized networks | `0.0.0.0/0` | Vercel egress CIDRs + Cloud Run NAT IP + dev VPN |
| SSL mode | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` | `ENCRYPTED_ONLY` |
| Cloud SQL Connector | Available, not mandatory | Preferred for all runtime connections |

#### Security Headers

```
middleware.ts (all routes)
├── X-Frame-Options: DENY
├── X-Content-Type-Options: nosniff
├── Referrer-Policy: strict-origin-when-cross-origin
├── Permissions-Policy: camera=(), microphone=(), geolocation=()
├── Strict-Transport-Security: max-age=63072000 (production only)
└── Content-Security-Policy: default-src 'self' ... (permissive initial, harden over time)
```

#### Cron Route Authentication

```
Before:  18 routes × 2 inconsistent patterns (some fail-open)
After:   1 helper × 18 routes (timing-safe, fail-closed)

requireCronAuth(request)
├── If CRON_SECRET not configured → 503 (fail-closed)
├── Bearer token present → timingSafeEqual comparison
├── Vercel cron header → accept as secondary factor
└── Neither → 401
```

### 3.4 Database Resilience

| Control | Before | After |
|---------|--------|-------|
| Backup | Daily 07:00 UTC, 7 days | Daily + **PITR enabled** (7 days WAL retention) |
| Slow queries | Invisible | `log_min_duration_statement=1000` → Cloud Logging |
| DDL audit | None | `log_statement=ddl` → Cloud Logging |
| Connection pool | 5 | 15 (Vercel serverless headroom) |
| Restore tested | Never | Tested once, documented |

### 3.5 Cost Management

| Control | Before | After |
|---------|--------|-------|
| GCP budget alerts | None | Monthly budget $200 (50/80/100% thresholds) |
| BigQuery budget | None | Monthly budget $50 |
| Query cost guard | None | `maximumBytesBilled: 1GB` default in bigquery.ts |
| Backfill override | N/A | Explicit `10GB` override for known-large queries |

---

## 4. Implementation Sequence

### Dependency Graph

```
                    TASK-100 (CI Tests)          TASK-103 (Budget)
                         │                            │
                    independent                  independent
                         │                            │
                    ┌────▼────┐                  ┌────▼────┐
                    │ Week 1  │                  │ Week 1  │
                    └─────────┘                  └─────────┘

    TASK-099 (Headers)        TASK-096 F1 (Cloud SQL)
         │                          │
    independent                     │
         │                     ┌────▼────┐
    ┌────▼────┐                │ Week 1  │
    │ Week 1  │                └────┬────┘
    └─────────┘                     │
                                    │ depends on
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
              │ TASK-096   │  │ TASK-098   │  │ TASK-102   │
              │ F2 (WIF)   │  │ (Sentry)   │  │ (DB Resil) │
              │ Week 2-3   │  │ Week 2-3   │  │ Week 4     │
              └─────┬──────┘  └─────┬──────┘  └────────────┘
                    │               │
                    │          depends on
                    │               │
              ┌─────▼──────┐  ┌────▼──────┐
              │ TASK-096   │  │ TASK-101   │
              │ F3 (SecMgr)│  │ (Cron Auth)│
              │ Week 4     │  │ Week 3     │
              └────────────┘  └────────────┘
```

### Execution Timeline

| Week | Tasks | Parallelizable | Gate |
|------|-------|---------------|------|
| **1** | TASK-100 (CI tests), TASK-099 (headers), TASK-096 Fase 1 (Cloud SQL), TASK-103 (budgets) | All four in parallel | Cloud SQL must stay accessible from Vercel post-restriction |
| **2-3** | TASK-096 Fase 2 (WIF), TASK-098 (Sentry + health + Slack) | Parallel | WIF must work in staging before touching production |
| **3** | TASK-101 (cron auth standardization) | After TASK-098 (uses Slack alerting) | All 18 crons must pass auth after migration |
| **4** | TASK-096 Fase 3 (Secret Manager), TASK-102 (DB resilience) | Parallel | Restore test must succeed before closing |

### Task Cross-Reference

| Task | ID | Sequence | Effort | Dependencies |
|------|----|----------|--------|-------------|
| CI Pipeline Test Step | TASK-100 | **1 of 7** | 1h | None |
| Security Headers Middleware | TASK-099 | **2 of 7** | 3h | None |
| GCP Secret Management (3 phases) | TASK-096 | **3 of 7** | 2w | Fase 2 needs Fase 1 complete |
| Observability MVP | TASK-098 | **4 of 7** | 1d | TASK-096 Fase 1 (health check validates post-hardening) |
| Cron Auth Standardization | TASK-101 | **5 of 7** | 2h | TASK-098 (integrates Slack alerting) |
| Database Resilience Baseline | TASK-102 | **6 of 7** | 0.5d | TASK-096 Fase 1 (no concurrent Cloud SQL changes) |
| GCP Budget Alerts | TASK-103 | **7 of 7** | 30m | None (independent) |

---

## 5. What We Intentionally Defer

These are common cloud strategy recommendations that we explicitly choose **not** to implement given the current team size (1 developer) and project maturity.

| Recommendation | Why Not Now | Trigger to Reconsider |
|---------------|------------|----------------------|
| **Terraform / Pulumi (IaC)** | ~10 GCP resources, manual provisioning is tractable. IaC overhead > value for 1 developer | Second developer joins, or >25 GCP resources |
| **Kubernetes / GKE** | Vercel + Cloud Run solve compute. K8s is a full-time job | Need for long-running background workers or custom networking |
| **Multiple service accounts per domain** | WIF eliminates the static key problem. Least-privilege SA separation is overhead | Security audit requires it, or second team/service |
| **Cloud Armor WAF** | Vercel Edge provides basic DDoS. Cloud Armor needs a GCP load balancer | Regulatory requirement, or DDoS incident |
| **Multi-region DR** | Audience is Chile + internal team. Latency doesn't justify dual-region | SLA commitment >99.9%, or international expansion |
| **Redis / external cache** | Next.js `unstable_cache` + ISR sufficient. Redis is another service to manage | Cache invalidation becomes a bottleneck at scale |
| **OpenTelemetry tracing** | Monolith → no service-to-service traces needed. Sentry covers errors | Decompose into microservices |
| **Automated secret rotation** | Manual rotation is acceptable at 6 critical secrets | Compliance requirement (SOC 2, ISO 27001) |
| **E2E tests (Playwright)** | 86 unit tests don't even run in CI yet. Fix that first | Unit tests stable in CI + high regression rate on UI flows |
| **GitOps / ArgoCD** | No Kubernetes → no GitOps target | Kubernetes adoption |
| **PgBouncer** | Pool of 15 is sufficient for current load. PgBouncer is ops overhead | Connection pool exhaustion under sustained load |
| **Global rate limiting** | Only auth tokens are rate-limited. API abuse risk is low (internal + authenticated users) | Public API exposure, or abuse incident |

---

## 6. Security Principles

These principles govern security decisions across the hardening track and future work:

1. **Fail-closed, not fail-open** — if a secret is missing or auth config is absent, reject the request (503), don't skip validation.

2. **Incremental hardening** — don't block feature development with a security big-bang. Each task is independently deployable and adds value.

3. **Fallback on every path** — WIF falls back to SA key, Secret Manager falls back to env var. Zero-downtime migration, always.

4. **Proportional investment** — protect critical secrets (payroll passwords, session keys, tax API tokens) with Secret Manager. Leave `CRON_SECRET` and `RESEND_API_KEY` in Vercel env vars.

5. **Verify before trusting** — test the restore, test the WIF token, test the auth helper. "It should work" is not the same as "it works".

6. **Minimize operational surface** — don't add infrastructure (Redis, PgBouncer, Vault) that requires ongoing maintenance. Prefer managed services and platform features.

---

## 7. Success Criteria (Post-Hardening)

| Dimension | Target | Measurement |
|-----------|--------|-------------|
| Secret Management | No static SA keys in production/staging | Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` absent from Vercel Production env |
| Network Security | Cloud SQL inaccessible from arbitrary IPs | `nmap 34.86.135.144` from non-authorized IP returns filtered |
| Observability | Cron failures detected in <5 minutes | Force a cron failure → verify Sentry alert + Slack message |
| CI Validation | No merge without passing tests | Push a broken test → verify CI blocks the PR |
| Auth Consistency | All 18 crons use single helper | `grep -r "requireCronAuth" src/app/api/cron/` returns 18 matches |
| DB Resilience | PITR enabled, restore tested | `gcloud sql instances describe` shows PITR = true + restore doc exists |
| Cost Visibility | Budget alerts configured | GCP Billing shows 2 active budgets |

---

## 8. Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-03-28 | 1.0 | Architecture review | Initial document — pre-hardening assessment + target architecture |

---

*This document supersedes the Security Notes section in `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` for secret management and security posture decisions. The infrastructure doc remains the authoritative source for resource inventory and service configuration.*

*End of document.*
