# Migration and Evolution

This reference is loaded in **migration mode** (the user wants to move from system X to system Y) or whenever a design must accommodate evolution from a current state to a target state. Migrations are the most under-architected work in software — they get squeezed because they're not new features, but they fail loudly when done badly.

The 2026 reality: most teams are doing some flavor of migration most of the time. Cloud platforms shift, frameworks deprecate, AI capabilities reshape what's possible. The skill needed isn't "execute one migration" — it's "design for continuous evolution."

## The principle: incremental over big-bang

A 2026 architect almost never recommends a big-bang rewrite. The reasons:

- The old system has knowledge encoded in it (edge cases, regulatory quirks, performance optimizations) that takes years to rediscover
- Big-bang migrations under-deliver: 50% of features in 200% of time is the optimistic case
- Customers don't tolerate long stop-work windows
- The team that started the migration isn't the team that finishes; mid-migration handoffs are brutal

The right pattern is **incremental migration with parallel running**. The new system grows alongside the old; traffic shifts gradually; both run in parallel until the old is empty.

## The strangler fig pattern

Named after the strangler fig, which grows around a tree until eventually the tree is gone but the fig stands alone.

The pattern:

1. **Identify a seam** — a boundary in the existing system where you can intercept traffic (an API gateway, a router, a façade interface)
2. **Build the new behavior** behind the seam — the new system implements one slice of functionality
3. **Route a small percentage of traffic** to the new system
4. **Verify equivalence** — the new system produces the same results as the old (with tolerance for known differences)
5. **Increase traffic gradually** — 1% → 10% → 50% → 100%
6. **Decommission the old** when the new is handling 100% reliably

This works for:

- Replacing a monolith with services (one route at a time)
- Replacing one framework with another (one feature at a time)
- Migrating between databases (using dual-write or CDC)
- Moving from one cloud provider to another (one service at a time)
- Replacing one auth provider with another

The seam is the architectural commitment. Without a seam, strangling is impossible — you're stuck with big-bang.

## Branch by abstraction

A complementary pattern, especially useful inside a codebase you can't easily route:

1. Create an interface (abstraction) for the behavior you want to change
2. Have the existing code implement the interface
3. All consumers go through the interface (no direct calls to the old implementation)
4. Build a new implementation of the interface (the target state)
5. Switch consumers one by one to the new implementation, behind a feature flag
6. Remove the old implementation when no consumer uses it
7. Optionally remove the abstraction if it's no longer providing value

The cost is one indirection layer during the migration. The benefit is the migration is happening in production code, with both implementations live and tested.

This is how you migrate ORMs, auth systems, payment providers, or LLM model choice — without a big-bang.

## Dual-write (and dual-read) for data migrations

When migrating data from store A to store B:

### Phase 1: Dual-write

The application writes to both A (canonical) and B (copy). Reads still come from A. This proves the new schema works for live writes.

### Phase 2: Backfill

Copy existing data from A to B. Use a one-time migration job. Verify counts and spot-check correctness.

### Phase 3: Dual-read with verification

Reads happen against both A and B; results are compared. Discrepancies are logged. The application returns A's result (still canonical). This is when you find the corner cases.

### Phase 4: Read from B, write to both

Switch read traffic to B. A is still being written to as a fallback / safety net.

### Phase 5: Single write to B

Stop writing to A. B is now the only source.

### Phase 6: Decommission A

Remove the old store after a confirmation period.

This is six phases. Yes, it's slow. It's also how you migrate transactional data without losing anything or having a multi-hour downtime window.

## Feature flags as migration infrastructure

Feature flags are the lever for controlled rollout in nearly every migration pattern. Capabilities you need:

- **User-level targeting**: enable for one user, then 1%, then 10%
- **Tenant-level targeting**: critical for multi-tenant systems
- **Region-level targeting**: roll out per region
- **Kill-switch**: instant disable when something breaks
- **Sticky assignment**: a user that got the new behavior keeps it
- **Percentage rollouts**: gradual ramp without manual intervention

Tools (2026):

| Tool | Best for | Trade-offs |
|---|---|---|
| **LaunchDarkly** | Enterprise; mature; expensive | Best-in-class; cost is real |
| **Statsig** | Experimentation + flags | Strong analytics integration |
| **Unleash** | Self-hosted | OSS option; you operate it |
| **PostHog feature flags** | If already on PostHog | Bundled with product analytics |
| **GrowthBook** | OSS, self-hosted | Lighter than Unleash |
| **Vercel Edge Config / Flags SDK** | Vercel-deployed apps | Tight Vercel integration |

For migration work, you don't always need a heavy flag system — sometimes a database table with `feature_flags` and a simple lookup is enough. Pick based on the duration of the migration and the breadth of flagging needs.

## Schema migration patterns

The expand-and-contract pattern (already mentioned in `05-data-architecture.md`, more detail here):

### Adding a column

1. **Expand**: `ALTER TABLE users ADD COLUMN email_v2 TEXT` (no default — fast in PG16+)
2. **Backfill**: gradually populate `email_v2` from `email`
3. **Dual-write**: code writes to both `email` and `email_v2`
4. **Cut over reads**: code reads from `email_v2`
5. **Contract**: drop `email`

### Renaming a column

Same as above. There's no "rename" in production-safe migrations — it's add new, copy, drop old.

### Splitting a column (e.g., `name` → `first_name` + `last_name`)

1. Expand: add `first_name`, `last_name`
2. Backfill with best-effort split (real names are messy; expect imperfection)
3. Dual-write
4. Cut over reads
5. Contract `name`

### Changing a type

The most painful. Postgres `ALTER TABLE ALTER COLUMN TYPE` rewrites the table; on a large table, it's a long lock.

The safe pattern:

1. Add a new column with the new type
2. Backfill (in batches)
3. Dual-write
4. Cut over reads
5. Drop old column

### Splitting a table

Often needed when a table grew to handle two concerns. Strangler-fig-for-tables:

1. Create the new table(s)
2. Backfill from the old
3. Dual-write to old and new
4. Cut over reads to new
5. Drop the old (or keep it as a view if external systems depend on the name)

## Cloud / infrastructure migrations

### From one cloud to another (AWS → GCP, etc.)

Don't. Unless you have a strong business reason (cost differential at scale, regulatory, M&A), the cost of cloud migration usually exceeds the benefit.

If you must:

1. **Build the target environment** in parallel
2. **Migrate stateless services first** (compute is the easiest)
3. **Migrate the data store** (the hardest — use the dual-write pattern)
4. **Cut over traffic** with DNS or a global load balancer
5. **Run in parallel** for a confirmation window
6. **Decommission the old**

Plan for 6-18 months for a non-trivial system. Build a list of services that "leak" into cloud-specific features and abstract them first.

### From one hosting platform to another (Vercel → Cloudflare, etc.)

Easier, because the boundary is clearer. The issues:

- Build pipelines may need to be redone
- Edge / serverless function semantics differ between platforms
- Database connection patterns differ (connection pooling especially)
- Edge caching configuration is platform-specific

Pattern: deploy to both in parallel; route by DNS; cut over.

### From self-hosted to managed (and back)

Both directions are common in 2026. Going to managed: get the architecture right (don't lift-and-shift). Going from managed to self-hosted: anticipate the operational learning curve.

## Framework / language migrations

### From an old framework version to a new

Use codemods where available (Next.js, React provide them). Run incrementally. Keep both versions running by deploying behind a flag.

### From one framework to another (React → Vue, Express → Hono, etc.)

Strangler-fig at the route level. New framework handles new routes; old handles legacy. Migrate routes one by one.

### From one language to another (e.g., Python → Go for performance)

Service-by-service if the system is microservices. For monoliths, harder — usually a service-extraction pattern: pull the hot path into a new service in the new language; the old monolith calls it.

## LLM / AI migrations

The new dimension in 2026: LLM provider or model changes happen frequently.

### From one model to another (within the same provider)

Sonnet 3 → Sonnet 4: usually drop-in. **Run evals on the new model first** — output style and edge case behavior shift even within minor versions.

### From one provider to another (Anthropic → OpenAI, etc.)

Use a gateway (LiteLLM, agentgateway, OpenRouter) to abstract. Models behave differently:

- Tool-calling syntax may differ (handled by gateway)
- Output style differs — prompts often need tuning
- Token counts differ (cost calculations change)
- Context window sizes differ

Run an eval suite on both. Choose based on quality + cost + latency for your specific workloads, not vendor preference.

### Adding a new capability (e.g., adding RAG to an existing assistant)

Don't replace the existing prompt path; add the new path behind a flag. Compare outputs. Migrate when the new path is provably better.

## When migration is wrong: the "rewrite trap"

Sometimes someone proposes a rewrite. Common framings:

- "The current system is too messy"
- "We could move so much faster on a clean codebase"
- "The new framework is so much better"

The skill should push back, hard. Questions to ask:

1. **What specific problem does the current system fail to solve?** If the answer is "we don't like the code", that's not a problem worth a rewrite.
2. **What's the cost (in months × engineers)?** The honest answer is usually 2-3× the optimistic estimate.
3. **What's the customer impact during the migration?** Stop-work windows, feature freezes, regression risk.
4. **What knowledge encoded in the current system might be lost?** Edge cases, performance optimizations, regulatory compliance.
5. **Is there an incremental path?** If yes, why not take it?

A rewrite is occasionally the right call (e.g., the foundation is fundamentally wrong for the next 5 years of needs). But the bar should be high. Most "rewrites" are actually "I want to use a new framework."

## Sequencing: what migrates first

When multiple migrations are needed, sequence by:

1. **Lowest-risk first** to build team experience and confidence
2. **Highest-value first** if the value is uncertain — fail fast
3. **Blocking dependencies first** — if a is needed for B, do A first
4. **Most volatile / most-changed-soon first** — if a system is being heavily modified, migrate it before the work piles up

Sequencing is itself an architectural decision; document it as an ADR.

## Rollback plan

For every migration step, the spec must answer: **how do we roll back if this step fails?**

- Feature flag: instant disable
- Database expand-contract: keep the old column until well past confirmation
- Code deploy: previous version known good and re-deployable in <5 min
- Routing: previous routes can be restored

A migration without a rollback plan at every phase is a one-way door masquerading as a two-way door. Treat it accordingly.

## Communication during migration

Migrations affect humans:

- **Customers**: maintenance windows, expected differences, support escalation paths
- **Internal users**: training, documentation updates, gotchas during the transition
- **Engineers**: which systems are sunsetting, when, what the new patterns are
- **Stakeholders**: progress, risks, what's done and what's left

The architecture spec is incomplete without a communication plan. Migrations fail not because the technical plan was wrong but because the people plan was missing.

## What to put in the architecture spec for migration

For any migration mode design:

- [ ] **Current state diagram** (what we have)
- [ ] **Target state diagram** (what we want)
- [ ] **Migration approach**: strangler / branch by abstraction / dual-write / phased deploy
- [ ] **Sequencing**: what migrates first, why
- [ ] **Each step's rollback plan**: what triggers rollback, how
- [ ] **Verification criteria per phase**: what proves the new path works
- [ ] **Data integrity strategy**: how dual-stores stay consistent, how discrepancies are detected
- [ ] **Performance budget during migration**: extra latency, extra cost
- [ ] **Communication plan**: customers, internal users, engineers, stakeholders
- [ ] **Decommissioning criteria**: when can the old be removed?
- [ ] **Time and cost estimate**: realistic, with bands (best case, expected, worst case)
