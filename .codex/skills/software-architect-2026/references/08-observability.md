# Observability

Observability is non-optional for any production system in 2026. The reason is simple: the systems we build are too complex, too distributed, and too AI-influenced for "we'll figure it out when something breaks" to work. By the time you're debugging in production, you needed the data you didn't collect.

This reference covers what to instrument, where to send it, and how to design observability into the architecture from the start — not bolt it on at the end.

## The three pillars (and the fourth)

Classical observability has three pillars:

1. **Logs** — events with context, queryable
2. **Metrics** — numerical time-series, aggregatable
3. **Traces** — causal chains across services and operations

The 2026 reality has added a fourth:

4. **AI traces** — hierarchical observation of LLM calls, tool calls, and agent runs

Most modern stacks unify these. OpenTelemetry is the standard. Each pillar is one OTel concept (`Log`, `Metric`, `Span`).

## OpenTelemetry: instrument once, send anywhere

The 2026 default. The principle: instrument with OTel SDK; export to whichever backend you prefer; switch backends without re-instrumenting.

OTel components:

- **SDK**: in your application, captures spans/metrics/logs
- **Collector**: optional middleware that receives, processes, and routes telemetry
- **Exporter**: sends to a backend (Datadog, Honeycomb, Grafana Cloud, Langfuse, etc.)

The Collector is where policy lives: PII redaction, sampling, fan-out to multiple backends, format translation. For non-trivial production, a Collector layer pays for itself.

### What to instrument by default

For every HTTP request:

- Request ID, trace ID
- HTTP method, path, status code
- Duration
- User ID, tenant ID (with PII discipline)
- Authenticated identity
- Custom attributes for the operation

For every database query:

- Duration
- Query type (read/write)
- Table or dataset name
- Rows affected (for writes)

For every external API call:

- Service called
- Endpoint
- Duration
- Status code
- Retry count if any

For every background job:

- Job name and version
- Duration
- Outcome (success / fail / retried)
- Input shape (cardinality, size)

### Tenant context propagation

For multi-tenant systems, tenant_id should be on **every span in a trace**, not just the root span. Filtering and aggregating by tenant requires this.

Use **OpenTelemetry Baggage** to propagate. Baggage is a built-in OTel mechanism that copies specified key-value pairs to all child spans automatically.

```python
from opentelemetry import baggage, context

ctx = baggage.set_baggage("tenant.id", "tenant_xyz")
context.attach(ctx)
# now every span downstream has tenant.id automatically
```

A `BaggageSpanProcessor` in the OTel pipeline can copy baggage into span attributes for the backend to use.

## Backend choices

| Tool | Best for | Trade-offs |
|---|---|---|
| **Grafana + Prometheus + Loki + Tempo** | Self-hosted; cost-controlled at scale | Operational cost; multiple components |
| **Datadog** | All-in-one; enterprise | Expensive at scale; everything-in-one |
| **Honeycomb** | Distributed traces, BubbleUp investigation | Best-in-class for trace analysis; specific use case fit |
| **Axiom** | Logs + traces with simple pricing | Simpler model; growing ecosystem |
| **New Relic** | Mature APM, broad enterprise | Aging UI; heavy |
| **Sentry** | Errors and performance, esp. frontend | Best for client-side; expanding to APM |
| **AWS / GCP / Azure native** | Already in their cloud | Tight integration; less portable |

For AI-specific:

| Tool | Best for | Trade-offs |
|---|---|---|
| **Langfuse** | LLM observability, evals, prompt mgmt | OTel-native; OSS or hosted; the 2026 default |
| **LangSmith** | LangChain-based agents | Tight to LangChain; smooth if already there |
| **Helicone** | Gateway-level LLM tracking | Also a gateway; cost tracking strong |
| **Arize** | ML observability + LLM | Enterprise-oriented; broader ML ops scope |
| **Traceloop / OpenLLMetry** | OTel-based LLM instrumentation | Vendor-neutral lib; works with any OTel backend |

The 2026 stack for serious AI systems: **OTel + Langfuse (or LangSmith)** for LLM-specific tracing, **+ general APM** for the rest. Same instrumentation foundation; different views.

## What to capture for AI features

For every LLM call:

- Model and version (e.g., `claude-opus-4-7`, `gemini-2.5-flash`, exact model string)
- Provider (Anthropic, OpenAI, Google, etc.)
- Input tokens, output tokens, total cost (calculated or from API)
- Latency: time-to-first-token (TTFT), time-to-completion
- Prompt hash or prompt version (link to prompt management)
- Tool calls made (name, arguments, results, durations)
- Errors (rate limit, content policy, timeout, malformed)
- User ID and tenant ID (with PII care)
- Eval scores if applicable
- Whether response came from cache

For agent runs (multi-step):

- Trace covers the whole run, with one span per LLM call and one per tool call
- Hierarchy preserved (which call led to which)
- Final outcome: completed, errored, exceeded budget, halted by user
- Total cost and duration of the full run

This is what enables debugging "why did the agent do X?" — you can replay the trace and see the chain of decisions.

## DORA metrics

Tech Radar Vol 34 explicitly placed DORA metrics back on the radar — not as new but as foundational discipline. The four metrics:

1. **Deployment Frequency**: how often you ship to production
2. **Lead Time for Changes**: from commit to production
3. **Change Failure Rate**: % of changes that cause failures
4. **Mean Time to Recovery (MTTR)**: time to restore service after failure

These don't require fancy tooling. A spreadsheet works for small teams. The point is to track them and use them to assess process health.

If your team's DORA metrics are static or worsening despite "improvements", the improvements aren't real.

## SLOs and error budgets

Service Level Objectives translate "we want it to work" into something measurable:

- **SLI** (indicator): a measurable thing — e.g., "99.5% of requests under 500ms"
- **SLO** (objective): the target for that SLI over a window — e.g., "99.5% over 30 days"
- **Error budget**: 100% - SLO. If you have 99.5% SLO, you have 0.5% error budget for the window

When the error budget is exhausted, deploy freezes / risky changes pause until reliability is restored. This forces a real conversation between speed and reliability.

For most B2B SaaS, define SLOs for:

- **API availability** per critical endpoint (99.5-99.9% typically)
- **API latency** per critical endpoint (p95 or p99 thresholds)
- **Background job success rate** per critical job
- **Data freshness** for analytical pipelines

For AI features specifically:

- **LLM call success rate** (excluding rate limits as a separate category)
- **End-to-end agent run latency**
- **Eval pass rate** on production sample (regression detection)

## Logging discipline

Logs are easy to dump, hard to use. Make them structured:

- **JSON logs**, not free-text
- **Consistent fields**: timestamp, level, service, trace_id, request_id, tenant_id, user_id
- **Key context**: business event names ("order.created"), not just "Created order"
- **No PII in logs** (unless classified and access-controlled)
- **No secrets in logs** (use a logger that redacts known secret patterns)

Log volumes are expensive at scale. Sample aggressively for non-critical paths. Keep ERROR-level always; sample INFO and DEBUG.

## Alerting that doesn't burn out the team

Bad alerting kills good observability. The hierarchy:

- **Pages** (wake someone at 3am): user-impacting, requires immediate action
- **Tickets** (next business day): degraded but not user-impacting
- **Dashboards** (visible to humans during the day): trends and indicators

Every alert needs:

- **Clear ownership**: which team is on call for this
- **Runbook link**: what to do when it fires
- **Severity justified**: don't page on metrics that don't require 3am response
- **Auto-resolution**: the alert clears when the condition does
- **Tested**: alerts can be silently broken; periodically inject the failure mode

**Anti-patterns**:
- Alerting on every error rate increase regardless of base rate
- Alerting on infrastructure that auto-heals
- Alerting on signal that's noisy and doesn't predict outage
- Alerting fan-out: 50 alerts for one underlying issue

## Cost observability

Cost is observability. In 2026 with cloud + AI bills, you need:

- **Per-service cost** (Datadog cost tags, GCP labels, AWS cost categories)
- **Per-tenant cost** for multi-tenant systems (the unit-economics signal)
- **Per-feature cost** for AI features (compare investment to value)
- **Anomaly detection** on cost (a 10× spike means something broke or someone abused)

Send cost data to the same place as other telemetry — Datadog has cost views; Vantage and Cloudability for multi-cloud cost; Helicone for LLM-specific cost.

## Performance budgets in CI

Don't catch performance regressions in production. Catch them in CI:

- **Build size budgets** for frontend bundles (warn at +5%, fail at +20%)
- **Lighthouse scores** for critical pages
- **Load test** in pre-production for critical APIs
- **Eval performance** for AI features (LLM response time, eval pass rate)

If a PR regresses these, the CI fails before merge. Fast feedback prevents the gradual degradation that nobody notices.

## Synthetic monitoring

External probes that test the full stack from outside:

- **Browser-based** (Playwright, Cypress) for critical user flows
- **API-based** for endpoints that aren't behind a UI
- **Multi-region** for systems with regional concerns

Synthetic monitoring catches what real-user monitoring misses (low-traffic paths) and gives you a real-user-equivalent SLI even when traffic is sparse.

## What to put in the architecture spec for observability

For every system, the spec must answer:

- [ ] **OTel instrumentation strategy**: SDK choice, automatic instrumentation libraries, manual span boundaries
- [ ] **Trace propagation**: HTTP headers, baggage for tenant_id and user_id
- [ ] **Backend(s)**: where traces, metrics, logs go — and why those choices
- [ ] **Per-tenant observability**: tenant_id on all spans
- [ ] **AI-specific observability**: LLM tracing tool, what's captured, where
- [ ] **DORA metrics**: how they're tracked
- [ ] **SLOs**: per critical endpoint or workflow
- [ ] **Alert hierarchy**: what pages, what tickets, what dashboards
- [ ] **Cost observability**: per service, per tenant, per feature
- [ ] **Log structure**: format, fields, retention
- [ ] **Synthetic monitoring**: which flows, where probed from
- [ ] **Performance budgets in CI**: bundle size, latency thresholds
- [ ] **Runbook locations**: where engineers find guidance during incidents
