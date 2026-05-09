# Pre-Launch Checklist

> Run before promoting a system or major feature to production. The implementation is done; this checklist ensures the system can survive contact with reality.

## Functional

- [ ] **Acceptance criteria met**: every Given/When/Then is verified
- [ ] **Manual smoke test of critical user flows** done in staging
- [ ] **Edge cases tested**: per the component specs
- [ ] **Cross-tenant isolation verified** in staging (multi-tenant systems)

## Performance

- [ ] **Load test against expected peak** has been run
- [ ] **p95 / p99 latency targets met** under load
- [ ] **Database query plans reviewed** for the critical paths (no surprise sequential scans)
- [ ] **Caching working as expected** (cache hit ratio measured)
- [ ] **For AI features**: TTFT (time to first token) and total completion time within SLO

## Reliability

- [ ] **Health check endpoints** implemented and monitored
- [ ] **Graceful shutdown** works (in-flight requests complete; new ones rejected)
- [ ] **Retry logic** configured with exponential backoff for external calls
- [ ] **Circuit breakers** in place for critical external dependencies
- [ ] **Database connection pooling** configured (no connection exhaustion under load)
- [ ] **Background jobs** are idempotent (can be retried without side effects)
- [ ] **Failure modes tested**: external API down, DB unavailable, cache miss storm

## Security

- [ ] **All endpoints behind auth** unless explicitly public
- [ ] **AuthZ enforced at the resource layer** (no client-side-only checks)
- [ ] **Secrets in secrets manager**, not env vars or code
- [ ] **Dependencies scanned** for vulnerabilities; high/critical patched
- [ ] **HTTPS enforced** with HSTS headers
- [ ] **Input validation** on every endpoint
- [ ] **Output encoding** prevents XSS
- [ ] **Rate limiting** in place at API gateway
- [ ] **For AI features**: prompt injection mitigations active; sandboxing for code execution if applicable
- [ ] **Audit log writing** verified for sensitive actions

## Compliance

- [ ] **Data classification applied** to schema (PII / restricted / confidential marked)
- [ ] **Encryption at rest** verified
- [ ] **Encryption in transit** verified (TLS 1.2+ everywhere)
- [ ] **Audit log retention** configured per compliance requirement
- [ ] **Data residency** correct for regulated tenants
- [ ] **Sub-processor agreements** in place for vendors handling PII
- [ ] **For LATAM**: Ley 21.719 (Chile) requirements met if applicable; LGPD (Brazil) requirements met if applicable

## Multi-tenancy

- [ ] **RLS policies enabled** on every tenant-scoped table
- [ ] **Cross-tenant test in CI** is passing (try to read tenant-A data as tenant-B; expect zero rows)
- [ ] **Per-tenant rate limits** configured
- [ ] **Tenant context** propagated to OTel as baggage
- [ ] **Per-tenant cost observability** working

## Observability

- [ ] **Logs flowing** to backend (Datadog, Honeycomb, etc.)
- [ ] **Metrics flowing**: request rate, error rate, latency, custom business metrics
- [ ] **Traces flowing** with proper context propagation
- [ ] **Dashboards** built for the critical user flows
- [ ] **Alerts configured** with the right severity (pages for user-impact, tickets for degradation)
- [ ] **Each alert has a runbook link**
- [ ] **For AI features**: LLM tracing in Langfuse / LangSmith working
- [ ] **DORA metrics tracked** (deployment frequency, lead time, change failure rate, MTTR)

## Cost controls

- [ ] **Cost monitoring** active per service / per tenant / per AI workflow
- [ ] **Cost alerts** configured at 50%, 80%, 100% of budget
- [ ] **AI workflow daily cost ceilings** with kill-switch verified working
- [ ] **No always-on staging at production cost** (auto-suspend / scale-to-zero where possible)

## Backups and DR

- [ ] **Backups running** on schedule
- [ ] **Backup restore tested** at least once (in a non-prod environment)
- [ ] **RPO and RTO documented**
- [ ] **For multi-region needs**: failover tested

## Operational readiness

- [ ] **Runbooks written** for the top expected incidents
- [ ] **On-call rotation** in place
- [ ] **Incident response process** documented (who responds, how to escalate)
- [ ] **Status page / customer communication path** ready
- [ ] **Deployment process documented**: how to deploy, how to roll back, who can approve
- [ ] **Feature flags** configured for risky launches; gradual rollout plan

## Rollback

- [ ] **Previous version known good** and re-deployable in <5 minutes
- [ ] **Database migration is expand-and-contract** (the contract phase comes later — old columns / tables not dropped yet)
- [ ] **Feature flag** allows instant disable
- [ ] **Cache invalidation strategy** for rollback case

## Communication

- [ ] **Customers informed** about new feature / launch (if user-facing)
- [ ] **Internal users trained** on changes (if internal tool)
- [ ] **Engineering team aware** of new system / on-call expectations
- [ ] **Stakeholders informed** about what's launching, when, what to watch

## Post-launch plan

- [ ] **What signals will indicate success in the first week**
- [ ] **What thresholds trigger pause / rollback**
- [ ] **Post-launch review scheduled** (1 week, 1 month)

---

## What to do with unchecked items

For each unchecked item, decide:

- **Block launch?** If yes, fix before going live.
- **Launch with awareness?** If yes, document the gap, communicate to ops/customers, and put a fix on the post-launch sprint.
- **Genuinely not applicable?** Mark as N/A with brief rationale.

The most common failure mode: launching with unchecked items the team "intends to address" — and then never does. Be honest about which gaps are fixable post-launch and which would cause real harm.
