# Cost Modeling

This reference is loaded when the user asks for a cost estimate, or when scale (>10k users, >TB data, agentic systems with non-trivial volume) makes cost a first-class architectural concern.

The skill produces **rough order-of-magnitude estimates**, not finance-grade quotes. The goal is to surface whether the architecture is in the right cost ballpark and where the dominant cost levers are. Real pricing must always be verified at the time of decision.

> **Critical**: pricing changes constantly. Every number here is a 2026 baseline that must be re-validated via vendor pricing pages before being used in a real estimate. See `12-research-protocol.md`.

## The four cost layers

Almost all cloud + AI cost decomposes into:

1. **Compute**: where code runs (Vercel functions, Cloud Run, K8s, EC2, Lambda)
2. **Storage**: where data lives (Postgres, BigQuery, S3/GCS, Redis)
3. **Egress / network**: data leaving your cloud (CDN, API responses, cross-region)
4. **AI / external services**: LLM tokens, third-party APIs, paid SaaS

For most B2B SaaS at moderate scale, the cost ranking is typically:

1. **Compute** (40-50% — your hosting bill)
2. **Storage** (15-25% — Postgres, warehouse, object storage)
3. **AI / external** (15-30% — LLM bills, third-party APIs)
4. **Egress** (5-15% — usually small, sometimes surprises)

For AI-heavy products (agents, RAG-heavy apps), AI costs can flip to #1.

## The five cost levers in 2026

Architectural decisions that drive 80% of cost variance:

### 1. Hosting platform choice

| Stack | Approx cost shape (small/medium B2B SaaS) |
|---|---|
| **Vercel Pro + Neon Postgres** | $20-200/mo until traction; $500-3000/mo at moderate scale; can hit $10k+/mo with traffic |
| **Cloudflare Workers + Workers KV/D1** | Very low at low scale ($5-50); scales linearly without surprise — good predictability |
| **Cloud Run + Cloud SQL (GCP)** | $50-500/mo at moderate scale; predictable pricing; scales well |
| **AWS ECS + RDS** | $100-1000+/mo even at low scale; predictable for AWS-experienced teams |
| **Fly.io** | $5-50/mo for small apps; cost-competitive vs Vercel at scale |
| **Hetzner / OVH bare metal** | $20-100/mo for hardware that would cost $500-2000 managed |

**Rule**: Vercel is great until you grow into the parts of pricing that hurt (build minutes, function invocations, image optimization, edge middleware). At ~$2k/mo on Vercel, evaluate whether other hosts could be 3-5× cheaper.

### 2. Database choice and configuration

| Tier | Approx cost (Postgres) |
|---|---|
| Small managed (Neon free, Cloud SQL micro) | Free - $50/mo |
| Production-ready (Neon Pro, Cloud SQL standard, RDS small) | $50-200/mo |
| Scale (Cloud SQL high-mem, RDS Aurora) | $300-2000/mo |
| Enterprise (multi-AZ, read replicas, backups) | $1000-10000+/mo |

**Multi-tenancy multipliers**:
- Pool: 1× (one DB)
- Bridge: ~1.2× (more schema overhead, similar resource use)
- Silo: linear with tenant count — can be 10-100× pool cost

### 3. Warehouse / OLAP cost

The dimension that surprises teams. Patterns:

| Warehouse | Cost model | Watch out for |
|---|---|---|
| **BigQuery on-demand** | $5-7/TB scanned | A bad query scans terabytes and costs hundreds in seconds |
| **BigQuery flat-rate** | $2k+/mo for slot reservations | Predictable, but committed |
| **Snowflake** | Pay per credit; warehouse-size × time | Auto-suspend matters; costs can compound |
| **Databricks** | DBU-based; varies wildly | All-purpose vs jobs cluster matters a lot |
| **ClickHouse self-hosted** | Hardware cost | Operational cost not included |

**Cost-control patterns**:
- **Materialized views / incremental models** instead of querying raw data
- **Partitioned tables** — query a partition, not the table
- **Clustered tables** — colocate by query pattern
- **Cost ceiling alerts** at 50%, 80%, 100% of monthly budget
- **Quotas per user** — prevent one analyst from burning the budget

### 4. AI / LLM cost

This is the cost dimension most teams underestimate.

#### LLM pricing per million tokens (2026 baseline — verify before quoting)

> All numbers approximate. **Re-verify before any committed estimate.**

| Model | Input | Output | Best for |
|---|---|---|---|
| **Claude Opus 4.x** | $15-20 | $75-90 | Complex reasoning |
| **Claude Sonnet 4.x** | $3-5 | $15-20 | Default for production agents |
| **Claude Haiku 4.x** | $0.25-1 | $1-5 | Cheap classification, bulk |
| **GPT-5** | similar to Opus | similar | Complex reasoning |
| **GPT-5-mini** | similar to Sonnet | similar | General-purpose |
| **Gemini 2.5 Pro** | $3-7 | $10-20 | Multimodal, reasoning |
| **Gemini 2.5 Flash** | $0.10-0.30 | $0.30-1 | Cheap bulk processing |
| **Llama 4 (self-hosted)** | infrastructure cost | same | Cost-extreme |

#### Cost calculator: rough heuristic

For a feature that does N LLM calls per user-session, average M input tokens and K output tokens:

`cost_per_session ≈ N × (M × input_price + K × output_price) / 1_000_000`

For 1k sessions/day at:
- N=3 calls
- M=2000 input
- K=500 output
- Sonnet pricing ($4 input, $18 output average)

`cost_per_session ≈ 3 × (2000 × 4 + 500 × 18) / 1_000_000 = $0.051`
`monthly cost ≈ 1000 × 30 × 0.051 ≈ $1530/mo`

Order of magnitude. The skill produces these for sanity-check, not committed pricing.

#### Cost levers for LLM features

- **Model selection**: Sonnet → Haiku is often a 5-15× cost reduction; Opus → Sonnet is 4-5×
- **Prompt caching**: 50-90% cost reduction on the cached portion (Anthropic, OpenAI both support)
- **Context size**: every input token costs; trim aggressively
- **Output length**: cap with `max_tokens`
- **Batching**: 50% discount on Anthropic batch API; OpenAI batch similar
- **Multi-model routing**: Haiku for simple, Sonnet for medium, Opus for hard

#### Hidden AI costs

- **Embeddings**: cheap per token but high volume — embedding 100M tokens is $5-50 depending on model
- **Vector store**: pgvector is bundled with Postgres cost; managed vector DBs add a separate bill
- **Eval runs**: each eval run is itself LLM calls
- **Failed / retried calls**: errored calls usually still cost
- **Tool call overhead**: every tool call adds context → more input tokens

#### Cost ceiling: the kill-switch

For any AI workflow, set a **per-day cost ceiling**. Above the ceiling: halt, downgrade to cheaper model, or alert. This is non-negotiable for production AI.

### 5. Egress and data transfer

The dimension that bites unexpectedly:

- **Egress from cloud**: AWS / GCP charge $0.05-0.12 per GB egress to the internet. A viral content site can rack up serious bills.
- **Cross-region transfer**: replicating across regions has its own cost
- **Cloudflare**: zero egress (the standout) — relevant if egress dominates
- **CDN cache hit ratio**: dramatically affects egress; measure it
- **Image optimization**: re-sizing 10M images per month at $0.005 each = $50k

**Pattern**: if you serve a lot of content (videos, large images, datasets), egress cost may dominate. Cloudflare R2 + Workers becomes attractive as a hosting layer just for the no-egress economics.

## Cost by archetype: rough ranges

Rough monthly cost for a healthy production system at "moderate B2B SaaS" scale (1k tenants, 10k MAU, modest data):

| Archetype | Compute | Database | AI | Egress + Other | Total |
|---|---|---|---|---|---|
| **B2B SaaS multi-tenant** (no AI) | $200-1000 | $200-500 | — | $50-200 | **$500-2000** |
| **B2B SaaS with AI features** | $500-2000 | $200-500 | $500-3000 | $100-300 | **$1500-6000** |
| **Agentic system** | $500-2000 | $200-500 | $2000-20000+ | $100-300 | **$3000-25000** |
| **Data platform** | $200-1000 | $500-3000 (incl warehouse) | — | $50-200 | **$1000-4000** |
| **Headless content site** | $50-500 | $50-200 | — | $100-1000 | **$200-1500** |
| **Mobile + backend** | $200-1000 | $200-500 | — | $200-2000 (CDN) | **$600-3500** |

Numbers vary 5-10× based on traffic patterns, data volume, AI usage. These are sanity-check ranges, not predictions.

## When to do detailed cost modeling

The architecture spec should include cost when:

- The system has AI features at non-trivial scale
- The system has multi-tenancy where unit economics matter
- The system involves significant data volume (TB+)
- The user explicitly asks
- Decisions involve major vendor choices (AWS vs GCP, BigQuery vs Snowflake)

For systems at small scale or in design exploration, a sanity-check is enough.

## How to model: the structured approach

For each cost-significant component:

1. **Define the unit**: per-user-month, per-request, per-token, per-GB
2. **Estimate the volume**: orders of magnitude (don't pretend to precision)
3. **Multiply by the per-unit cost** (validated)
4. **Sum** across components
5. **Add a buffer**: 30-50% for unknowns (egress, retries, debugging, growth)

Document the assumptions explicitly. When the assumptions break, the estimate breaks.

## Optimization patterns

When a system is too expensive, the playbook (in order of effort vs reward):

### Quick wins (days)

- Add caching: HTTP cache, application cache, prompt cache
- Cap output sizes (LLMs especially)
- Identify the top 1-3 cost drivers and look at them specifically
- Audit dev/staging usage (often surprisingly large)
- Right-size compute: CPU/memory often over-provisioned

### Medium effort (weeks)

- Migrate hot data to cheaper storage tiers
- Switch to a cheaper model for routine LLM calls
- Enable prompt caching where the system prompt is long
- Implement query result caching for expensive analytics
- Reserved instances / committed use discounts for predictable load

### Hard work (months)

- Migrate to a cheaper hosting platform
- Re-architect for batch processing where real-time isn't needed
- Move from managed services to self-hosted at scale
- Restructure data model for query efficiency

## Common cost anti-patterns

- **Pay-per-request hosting at high traffic**: Vercel/Lambda/Workers can get expensive; flat-rate hosting is cheaper above a threshold
- **Always-on warehouse with low utilization**: BigQuery on-demand or Snowflake auto-suspend better
- **No prompt caching** in agentic systems with long system prompts
- **Always using the most powerful LLM**: Opus for everything when Sonnet or Haiku would do
- **No cost ceiling on AI workflows**: invitation to a five-figure incident
- **Dev/staging running 24×7** at production capacity
- **Logging everything at INFO level**: log storage adds up; sample below ERROR
- **Re-fetching data instead of caching**: especially for paid third-party APIs
- **No per-tenant cost visibility**: can't tell which customer is profitable

## What to put in the architecture spec for cost

For every system at scale, the spec should answer:

- [ ] **Cost ceiling** (monthly budget for the system)
- [ ] **Cost decomposition** by layer (compute, storage, AI, egress)
- [ ] **Per-tenant unit economics** for multi-tenant
- [ ] **Cost monitoring**: who watches, alert thresholds
- [ ] **AI cost ceiling** per workflow with kill-switch behavior
- [ ] **Optimization roadmap** (what's cheap to do later vs has to be designed in now)
- [ ] **Validated as of** date for any specific pricing claims
