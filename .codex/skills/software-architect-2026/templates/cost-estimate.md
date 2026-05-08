# Cost Estimate: [System Name]

> Rough order-of-magnitude estimate. Not a finance-grade quote. The goal is to surface whether the architecture is in the right cost ballpark and where the dominant levers are.
>
> See `references/09-cost-modeling.md` for methodology.

## Metadata

- **System**: [name]
- **Scenario**: [e.g., "Year 1 expected scale", "Year 2 stress case"]
- **Estimator**: [name]
- **Date**: YYYY-MM-DD
- **Validated against**: [pricing pages with dates]

## 1. Scale assumptions (the inputs)

> If these assumptions are wrong, the estimate is wrong. Be explicit.

| Variable | Assumption | Source / rationale |
|---|---|---|
| Tenants | [number] | [Why this number] |
| Active users / month | [number] | [Why] |
| Requests per day | [number] | [Why] |
| Data storage (OLTP) | [GB] | [Why] |
| Data storage (OLAP) | [GB / TB] | [Why] |
| LLM calls per day (if applicable) | [number × tokens] | [Why] |
| Egress GB/month | [GB] | [Why] |
| Geographic regions | [single / multi] | [Why] |

## 2. Cost decomposition

### Compute

| Item | Provider | Unit cost | Estimated monthly |
|---|---|---|---|
| Web app hosting | [Vercel / Cloud Run / etc.] | [Pricing model] | $XXX |
| API hosting | [provider] | [pricing] | $XXX |
| Background workers | [provider] | [pricing] | $XXX |
| **Compute subtotal** | | | **$XXX** |

### Storage

| Item | Provider | Unit cost | Estimated monthly |
|---|---|---|---|
| OLTP database | [Cloud SQL / Neon / etc.] | [tier × usage] | $XXX |
| OLAP warehouse | [BigQuery / Snowflake / etc.] | [storage + queries] | $XXX |
| Object storage | [S3 / GCS / R2] | [GB × egress] | $XXX |
| Cache (Redis, etc.) | [provider] | [tier] | $XXX |
| Vector store (if separate) | [Pinecone / Qdrant / etc.] | [tier × usage] | $XXX |
| **Storage subtotal** | | | **$XXX** |

### AI / LLM

| Item | Provider | Volume × cost | Estimated monthly |
|---|---|---|---|
| Primary LLM (e.g., Sonnet) | Anthropic | [N calls × M tokens × $price] | $XXX |
| Cheap LLM (e.g., Haiku) | Anthropic | [N calls × M tokens × $price] | $XXX |
| Embeddings | [provider] | [N × $] | $XXX |
| Eval runs | [provider] | [N runs × cost] | $XXX |
| **AI subtotal** | | | **$XXX** |

### External services

| Service | Purpose | Pricing tier | Estimated monthly |
|---|---|---|---|
| [Stripe] | Payments | % per txn | $XXX |
| [HubSpot Sync] | CRM | Plan tier | $XXX |
| [Auth provider] | AuthN | Plan tier | $XXX |
| [Observability] | OTel + backend | Plan tier | $XXX |
| **External subtotal** | | | **$XXX** |

### Egress and network

| Item | Volume | Unit cost | Estimated monthly |
|---|---|---|---|
| CDN / public traffic | [GB] | $X/GB | $XXX |
| Cross-region replication | [GB] | $X/GB | $XXX |
| Inter-cloud | [GB] | $X/GB | $XXX |
| **Egress subtotal** | | | **$XXX** |

### Buffer

[30-50% added for unknowns: retries, debugging traffic, growth, surprise pricing]

**Buffer**: $XXX

## 3. Total

| Layer | Estimated monthly |
|---|---|
| Compute | $XXX |
| Storage | $XXX |
| AI / LLM | $XXX |
| External services | $XXX |
| Egress / network | $XXX |
| Buffer (XX%) | $XXX |
| **TOTAL** | **$XXX** |

**Annual**: $XXX × 12 = **$XXX**

## 4. Per-tenant unit economics (if multi-tenant)

| Tenant tier | Tenants in tier | Monthly cost per tenant | Monthly revenue per tenant | Margin |
|---|---|---|---|---|
| Free | [N] | $X | $0 | -$X (acquisition cost) |
| Pro | [N] | $X | $Y | $Y-X |
| Enterprise | [N] | $X | $Y | $Y-X |

> **Sanity check**: do paying tenants cover free-tier costs + overhead?

## 5. Dominant cost drivers

> Where will surprise bills come from? Top 3.

1. **[Driver]**: [why dominant; sensitivity to assumption changes]
2. **[Driver]**: [why dominant]
3. **[Driver]**: [why dominant]

## 6. Cost ceilings and alerts

| Component | Daily ceiling | Monthly ceiling | Action when exceeded |
|---|---|---|---|
| LLM (per workflow) | $X | $XX | Kill-switch + alert |
| Warehouse query cost | $X | $XX | Alert at 50%, 80%, 100% |
| Total cloud bill | — | $X | Slack alert + investigation |

## 7. Sensitivity analysis

> If assumptions are wrong, how does the total change?

| Variable | If 2× | If 10× |
|---|---|---|
| Tenants | +$XXX | +$XXX |
| LLM call volume | +$XXX | +$XXX |
| Data storage | +$XXX | +$XXX |
| Egress | +$XXX | +$XXX |

## 8. Optimization opportunities

> Things we'd do later (or now) to reduce cost. From `references/09-cost-modeling.md`.

### Quick wins (could save $XXX/mo with days of effort)
- [ ] [Action]
- [ ] [Action]

### Medium effort (could save $XXX/mo with weeks of effort)
- [ ] [Action]
- [ ] [Action]

### Strategic (could save $XXX/mo with months of effort)
- [ ] [Action]
- [ ] [Action]

## 9. Validated as of

YYYY-MM-DD — pricing for [Vercel | Cloud Run | BigQuery | Anthropic | etc.] verified on this date.

> Pricing changes. After 6 months without re-validation, treat this estimate as stale.

## 10. References

- Vendor pricing pages used: [list with URLs]
- Internal usage data (if any): [link]
- Methodology: `references/09-cost-modeling.md`

---

## Skill behavior when generating cost estimates

1. **Validate every per-unit price** before producing the estimate. Vendor pricing pages, today's date.
2. **Show the math.** A reviewer should be able to challenge any line by checking the assumption × unit price.
3. **Use ranges or be explicit about uncertainty.** "$1,000-3,000/mo" is more honest than "$1,847/mo" for an estimate.
4. **Flag the sensitive assumptions.** Which assumption, if wrong by 2×, doubles the estimate?
5. **Always include the buffer.** Reality is messier than the model. 30-50% buffer is standard.
6. **Per-tenant unit economics** for multi-tenant systems — this is the signal nobody asks for and everybody needs.
7. **Cost ceilings are non-optional for AI features.** Always include the ceiling and the kill-switch behavior.
