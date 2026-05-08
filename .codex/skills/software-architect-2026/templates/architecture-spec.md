# Architecture Spec: [System name]

> Master architectural document for a system. Used in **new design** mode. Lives in the repo at `docs/architecture/architecture.md` (or per-system at `docs/architecture/<system>.md`). Updated as the architecture evolves; changes should be reflected in new ADRs as well.

## Metadata

- **Author**: [name(s)]
- **Status**: `Draft` | `Approved` | `In implementation` | `Live`
- **Created**: YYYY-MM-DD
- **Last updated**: YYYY-MM-DD
- **Version**: vX.Y (bump on substantive updates)
- **Related ADRs**: link to the ADR log

## 1. Problem statement

> One paragraph: what problem does this system solve, for whom, and why now? If you can't write this in 100-150 words, the problem isn't clear enough yet.

## 2. Goals and non-goals

### Goals
- [What this system must do]
- [What it must enable]
- [What metrics matter for success]

### Non-goals
- [What this system explicitly does NOT do]
- [What we're choosing not to optimize for]

> Non-goals are as important as goals. They prevent scope creep and clarify trade-offs.

## 3. Solution archetype(s)

> Match to the archetypes in `references/01-solution-archetypes.md`.

- **Primary**: [archetype #N — name]
- **Secondaries**: [archetype #M — name], [archetype #K — name]
- **Why this classification**: [brief rationale]

## 4. Constraints

### Hard constraints (cannot violate)
- [Regulatory, contractual, must-integrate-with X, etc.]

### Soft constraints (preferable to honor)
- [Team familiarity, existing tooling, hosting standardization, etc.]

### Aspirational constraints (nice to have)
- [Things that would be nice but are tradeable]

## 5. Scale assumptions

> Order of magnitude. Document the assumptions that, if wrong, would invalidate the design.

- **Users / tenants in 12 months**: [number]
- **Data volume in 12 months**: [GB / TB / PB]
- **Request rate**: [RPS at peak]
- **Geographic distribution**: [single region / multi-region / global]
- **Growth rate assumed**: [% per quarter]

## 6. Architecture (high level)

### 6.1 Context diagram (C4 Level 1)

> One diagram showing the system in its environment: who uses it, what external systems it interacts with. See `templates/c4-mermaid.md`.

```mermaid
[Mermaid C4 Level 1 here]
```

### 6.2 Container diagram (C4 Level 2)

> One diagram showing the major components inside the system and how they communicate.

```mermaid
[Mermaid C4 Level 2 here]
```

### 6.3 Component diagram (C4 Level 3) — for the most complex containers only

> Optional. Include only for the 1-2 containers complex enough to warrant decomposition.

## 7. Stack and infrastructure

### 7.1 Stack summary

| Layer | Choice | Rationale (link to ADR) |
|---|---|---|
| Language / runtime | [e.g., TypeScript / Node 22] | ADR-NNNN |
| Frontend framework | [e.g., Next.js 16] | ADR-NNNN |
| Backend framework | [e.g., Next.js API routes / Hono] | ADR-NNNN |
| OLTP database | [e.g., PostgreSQL 16] | ADR-NNNN |
| OLAP database | [e.g., BigQuery] | ADR-NNNN |
| Auth | [provider] | ADR-NNNN |
| Hosting | [Vercel / Cloud Run / etc.] | ADR-NNNN |
| Observability | [OTel + backend] | ADR-NNNN |
| AI provider(s) | [if applicable] | ADR-NNNN |

> All stack choices linked to their ADRs. Validated dates on each ADR.

### 7.2 External dependencies

| Service | Purpose | Lock-in level | Failure mode handling |
|---|---|---|---|
| [e.g., Stripe] | [Payments] | High | [How we handle outages] |
| [e.g., HubSpot] | [CRM] | Medium | [Fallback behavior] |

## 8. Data architecture

> Reference `references/05-data-architecture.md` for patterns.

- **Source-of-truth per domain**: [table or list]
- **OLTP/OLAP boundary**: [where each lives]
- **Sync pattern**: [batch / micro-batch / CDC / event-sourced]
- **Freshness SLA per dataset**: [examples]
- **Open vs closed table format**: [Iceberg / proprietary]
- **Semantic layer ownership**: [team]

## 9. Multi-tenancy (if applicable)

> Reference `references/06-multi-tenancy.md`.

- **Pattern**: pool / bridge / silo / tiered
- **Tenant context propagation**: [JWT claims / URL / etc.]
- **Database-level isolation**: [RLS policies / schema-per-tenant / etc.]
- **Noisy-neighbor controls**: [rate limits / quotas]
- **Tier-graduation runbook**: [link]

## 10. Security and compliance

> Reference `references/07-security-compliance.md`.

- **AuthN model**: [providers, MFA policy, session lifetimes]
- **AuthZ model**: [RBAC / ABAC / ReBAC]
- **Data classification**: [public / internal / confidential / restricted]
- **Encryption**: [at rest, in transit, field-level for restricted]
- **Compliance scope**: [GDPR / LGPD / Ley 21.719 / SOC 2 / others]
- **Threat model**: [link to threat-model document]
- **Audit log strategy**: [where, retention]
- **For AI features**: [prompt injection mitigations, sandboxing, cost ceilings]

## 11. Observability

> Reference `references/08-observability.md`.

- **OTel instrumentation strategy**: [SDK, automatic libraries, manual spans]
- **Backends**: [traces, metrics, logs targets]
- **AI-specific observability**: [Langfuse / LangSmith / etc.]
- **SLOs**: [per critical endpoint / workflow]
- **Alert hierarchy**: [pages vs tickets vs dashboards]
- **DORA metrics tracking**: [how]

## 12. AI / agentic features (if applicable)

> Reference `references/04-ai-native-patterns.md`.

For each AI-powered workflow:

- **Workflow name and purpose**:
- **Autonomy tier**: observe / recommend-with-approval / execute-with-logging / autonomous
- **Context strategy**: static / RAG / progressive disclosure
- **Integration model**: direct LLM API / MCP
- **Eval set location and approach**:
- **Cost ceiling per day and kill-switch behavior**:
- **Multi-model strategy**: single / routed / fallback
- **Sandboxing**: for code-executing agents
- **Prompt injection mitigations**:

## 13. Cost model

> Reference `references/09-cost-modeling.md`. Include rough order-of-magnitude estimate.

| Layer | Estimated monthly cost |
|---|---|
| Compute | $XXX |
| Storage (OLTP) | $XXX |
| Storage (OLAP) | $XXX |
| AI / external services | $XXX |
| Egress / network | $XXX |
| **Total (rough)** | **$XXX** |

- **Cost ceiling alerts**: [thresholds, who's notified]
- **Per-tenant unit economics**: [if multi-tenant]
- **Cost optimization roadmap**: [what to do later]

## 14. Risks and self-critique

> The Step 6 self-critique pass. Identify what could break.

### What breaks at the next scale level
[Most likely failure mode at 10× current scale]

### What breaks in 36 months
[Assumptions that won't hold]

### Cognitive debt risk
[See `references/10-cognitive-debt.md`. Will the team that runs this in 18 months understand it?]

### Vendor lock-in
[What would cost more than 1 quarter of effort to replace]

### Unobservable failures
[Where could a failure happen silently]

### AI-specific risks (if applicable)
[Prompt injection, runaway cost, autonomy mismatch, hallucination blast radius]

### Regional / compliance gaps
[Especially LATAM if applicable: Ley 21.719 Chile, LGPD Brasil]

## 15. Implementation plan

> High-level phases. Detailed work breakdown lives in TASK docs (or equivalent), not here.

### Phase 1: [name]
- [Outcome]
- [Estimated time]

### Phase 2: [name]
- [Outcome]
- [Estimated time]

### Phase N

## 16. Open questions

> Things the design doesn't yet answer. Each open question should have an owner and a target date for resolution.

- [ ] [Question] — owner: [name] — by: [date]
- [ ] [Question] — owner: [name] — by: [date]

## 17. References

- ADR log: [link]
- Related architecture specs: [links]
- External docs: [links to vendor docs that inform this design]
- This skill: software-architect-2026, validated YYYY-MM-DD
