# Research Protocol

This protocol exists because architecture recommendations made from memory go stale fast. Versions change. Vendors raise prices. Frameworks deprecate features. A library that was healthy 12 months ago may have lost its maintainer. An LLM model that was state-of-the-art six months ago may now be more expensive than a better alternative.

The protocol forces validation against current 2026 reality before claims enter the architecture spec. It is not optional. The cost of a wrong recommendation in code is one PR; the cost of a wrong recommendation in architecture is months.

## When to research

Research is mandatory for:

- **Stack picks**: any time you recommend a specific framework, library, language version, cloud service, or LLM model
- **Pricing claims**: any cost estimate or "this is cheaper than X" comparison
- **"Currently best" claims**: any time you say something is "the current standard," "stable," "production-ready," or "deprecated"
- **Vendor capability claims**: any feature you describe a vendor as having (rate limits, regions, integrations)
- **Compliance claims**: regulatory or compliance requirements (GDPR specifics, SOC 2 controls, regional laws)

Research is **not needed** for:

- Architectural patterns that are language- and vendor-agnostic (CQRS, event sourcing, hexagonal architecture)
- Mathematical or logical claims (CAP theorem, Big-O of an algorithm)
- Historical facts about how a system evolved
- The user's own internal documentation when project knowledge has it

When in doubt, research. The penalty for over-researching is a few extra search calls. The penalty for under-researching is a wrong architecture.

## Source hierarchy

Not all sources are equal. Use this hierarchy and stop when you have enough confidence.

### Tier 1: Authoritative sources (use first)

- **Official changelogs and release notes**: Next.js blog, React releases, Postgres release notes, AWS / GCP / Azure docs, Vercel docs, Cloudflare docs
- **Official documentation**: docs.anthropic.com, platform.openai.com, ai.google.dev, kubernetes.io, postgresql.org
- **Official model cards and pricing pages**: Anthropic models, OpenAI models, Vertex AI catalog
- **Official MCP servers registry and protocol spec**
- **Vendor security advisories and CVE databases** for security claims

These are the ground truth for what a product currently does, costs, and supports.

### Tier 2: Expert / consensus sources

- **ThoughtWorks Tech Radar** (twice yearly, April and October) — the industry's most respected curated view of what's worth adopting, trialing, assessing, or avoiding
- **State of JS / State of CSS / State of HTML / State of DevOps** — annual surveys with adoption data
- **Stack Overflow Developer Survey** — broad adoption signals
- **InfoQ Architecture Trends Report** — quarterly synthesis from practitioners
- **GitHub Octoverse** — language and ecosystem trends
- **Artificial Analysis** (artificialanalysis.ai) — model benchmarks comparison

These give you the pulse of the ecosystem when you don't yet know which specific tools to compare.

### Tier 3: Independent technical analysis

- **endoflife.date** — when a version goes EOL
- **npm trends, libraries.io, ecosyste.ms** — comparative download / dependency metrics
- **GitHub repo activity** (commits in last 90 days, last release date, open issues / PR ratio) — is the project alive?
- **OpenSSF Security Scorecards** — supply-chain health
- **Independent benchmarks** from credible engineering blogs (with verification — benchmarks often favor the author's preferred tool)

These help you separate "popular" from "healthy" from "vendor marketing."

### Tier 4: Community and synthesis sources

- High-quality engineering blogs (Vercel, Cloudflare, Stripe, Netflix, Uber engineering)
- Recognized practitioner Substacks and newsletters
- Recent (last 6 months) Medium / Dev.to posts from engineers with clear track records

Useful for context and anecdotes, but never the only source for a claim.

### Tier 5: Last resort

- Aggregator sites, AI-generated comparison content, low-effort blog posts

If a search only returns these, the topic is either too obscure or you need different search terms. Don't cite from this tier.

## Search query patterns that work

Bad query: `"best frontend framework 2026"` — returns SEO bait.

Good queries:

- **For framework status**: `<framework> 16 stable production release notes` — gets you to the official source.
- **For deprecation**: `<framework> deprecation 2026` or `<feature> end of life` — gets official announcements.
- **For comparison**: `<option A> vs <option B> trade-offs` — gets engineering analyses, not marketing.
- **For pricing**: `<vendor> <product> pricing` — go to the vendor's pricing page.
- **For ecosystem health**: `<library> github` — go to the repo, check last commit and last release.
- **For benchmarks**: `<thing> benchmark <year>` plus skim multiple sources.

For LLM models specifically:

- `<model name> pricing context window` — vendor docs
- `<model> vs <model> benchmark` — Artificial Analysis or independent comparisons
- `<model> rate limits` — vendor docs

## What to verify per archetype

Different archetypes have different things that go stale. Use these checklists.

### For B2B SaaS / multi-tenant systems

- [ ] Database version: current major Postgres, MySQL, etc.
- [ ] RLS feature parity if using Postgres (Supabase, Neon, AWS Aurora, plain Postgres)
- [ ] Auth provider current pricing tiers (Auth0, Clerk, WorkOS, Stytch)
- [ ] Cloud provider region availability for the user's compliance needs

### For agentic / AI systems

- [ ] Current models from each provider, with pricing as of today
- [ ] Context window sizes and rate limits per model
- [ ] MCP support status in the framework you're recommending
- [ ] Eval framework versions (Langfuse, LangSmith, Braintrust, Promptfoo)
- [ ] Whether `<framework>` is in Adopt / Trial / Assess on latest Tech Radar

### For data platforms

- [ ] Current pricing model for the warehouse (BigQuery, Snowflake, Databricks)
- [ ] Open table format support (Iceberg, Delta, Hudi) on the chosen platform
- [ ] dbt / SQLMesh current versions and major changes

### For frontend / web

- [ ] Framework current version, LTS status, EOL dates of older versions
- [ ] Bundler default (Webpack vs Turbopack vs Vite vs Rolldown)
- [ ] React version compatibility
- [ ] Hosting platform features and pricing (Vercel, Cloudflare, Netlify, Fly)

### For infrastructure / cloud

- [ ] Service availability in user's required regions
- [ ] Pricing (egress, storage, compute) for the workload pattern
- [ ] Current security recommendations from the vendor (Well-Architected updates)

### For compliance

- [ ] Current regulatory text (laws change; what was true last year may not be)
- [ ] LATAM specifically: Ley 21.719 Chile (data protection, in effect since 2024-2025), LGPD Brasil, Habeas Data variations across countries
- [ ] EU: GDPR + AI Act (in force in stages through 2026)
- [ ] US: state-level updates (CCPA, CPRA, evolving)

## Documenting research in the artifact

Every claim that depends on current reality should have a source and a date. Use this format inside the artifact:

> **Claim**: Next.js 16 is stable as of October 2025 with Turbopack as default bundler.
> **Source**: nextjs.org/blog/next-16
> **Validated**: 2026-05-08

For ADRs specifically, the **Validated as of** field captures the most recent validation date for the ADR's claims.

For stack matrices, every row gets a `last_validated` cell.

## How to handle conflicting sources

When sources disagree:

1. **Trust Tier 1 over Tier 2 over Tier 3+** for factual claims (versions, prices, capabilities)
2. **Trust newer over older** when the discrepancy is recency-driven (a feature changed status)
3. **Note the disagreement** in the artifact ("X claims Y; Z claims not-Y; we resolved by checking the official changelog and confirmed Y") — this is itself useful context
4. **For quality-of-experience claims** (is this DX good?), embrace that there's no single truth; present the spread

## How to handle "I can't find a definitive answer"

It happens. The system is too new, the topic is too niche, or the evidence is contradictory.

In this case:

1. State it explicitly in the artifact: "We could not find authoritative confirmation that X. The closest sources say Y."
2. Lower the confidence level on any decision that depends on this.
3. Define a follow-up: "Validate before production: [specific test or contact]"
4. Don't fabricate. Don't soft-claim. Don't bury uncertainty.

## Cost-of-research budget

Research has a token / time cost. The right budget depends on the decision:

- **One-way doors with high blast radius** (database, cloud provider, multi-tenancy pattern, primary LLM): research deeply, 5-10 sources, 30+ minutes if needed. Worth it.
- **Two-way doors with bounded impact** (specific npm package, choice of UI library): one or two searches to verify it's alive and current. 5 minutes.
- **Reversible operational choices**: minimal research; a quick sanity check.

The skill biases toward researching too much, not too little — the cost of an incorrect Tier 1 fact in architecture is much higher than a few extra search calls.

## A note on the skill's own knowledge

The skill ships with stack matrices and vendor info that are validated as of a date. That date is in the file header. **If the validation date is more than 3 months old when the skill is used, treat the file as suspect** and verify before relying on its specifics.

Patterns and frameworks (this file, the decision frameworks file, the archetypes) age more slowly than specific stack and vendor details. But all of this skill's content has a shelf life. The protocol exists to compensate.
