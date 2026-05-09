# Trade-off Matrix Template

Used inside ADRs and stack picks when comparing real alternatives across multiple criteria. The matrix forces explicit articulation of criteria and fair evaluation of every option against every criterion — which catches the case of falling in love with one option and not evaluating the others honestly.

## Template

### Decision: [What is being decided]

**Context** (1-2 sentences): [The forces at play]

### Criteria

| Criterion | Weight | Description |
|---|---|---|
| [Criterion 1] | High | [Why it matters here] |
| [Criterion 2] | High | [Why it matters here] |
| [Criterion 3] | Medium | [Why it matters here] |
| [Criterion 4] | Medium | [Why it matters here] |
| [Criterion 5] | Low | [Why it matters here] |

### Options

#### Option A: [name]
[1-2 sentences: what it is]

#### Option B: [name]
[1-2 sentences]

#### Option C: [name]
[1-2 sentences]

### Comparison

| Criterion | Weight | Option A | Option B | Option C |
|---|---|---|---|---|
| [Criterion 1] | High | [Qualitative + brief annotation] | [...] | [...] |
| [Criterion 2] | High | [...] | [...] | [...] |
| [Criterion 3] | Medium | [...] | [...] | [...] |
| [Criterion 4] | Medium | [...] | [...] | [...] |
| [Criterion 5] | Low | [...] | [...] | [...] |

### Dealbreakers identified

- [Option X fails on Criterion Y because Z — eliminated, not just weighted down]

### Recommendation

**Pick: Option [letter]**

**Rationale**: [2-3 sentences. Name which trade-offs you're accepting and which you're prioritizing.]

**Confidence**: Low / Medium / High

---

## Example: Multi-tenancy pattern for Kortex

**Decision**: Choose multi-tenancy isolation pattern for Kortex CRM Intelligence Platform

**Context**: Kortex targets HubSpot agencies (each a tenant) managing N HubSpot portals each. Expected scale: 50 tenant agencies, ~500 client portals total at 12 months. Some agencies will require SOC 2 Type II isolation by Q4 2026.

### Criteria

| Criterion | Weight | Description |
|---|---|---|
| Tenant data isolation | High | Cross-tenant leakage is unacceptable; some clients require provable isolation |
| Operational cost | High | Small team — every operational burden compounds |
| Path to enterprise tier | High | At least some agencies will demand SOC 2-grade isolation |
| Onboarding speed | Medium | New agencies need to be productive in <1h |
| Schema migration friction | Medium | We will iterate the schema frequently early on |
| Cross-tenant analytics | Low | Internal use only; can be slower |

### Options

#### Option A: Pool (shared schema with `tenant_id` + RLS)
All agencies in one schema. RLS policies enforce isolation. `tenant_id` on every row.

#### Option B: Bridge (schema-per-tenant in shared DB)
Each tenant agency has its own Postgres schema in the same DB. Tenant routing maps `tenant_id` → schema name.

#### Option C: Tiered (Pool by default, Silo for enterprise)
Most tenants share the pool. Enterprise tenants graduate to dedicated DB instances.

### Comparison

| Criterion | Weight | Option A: Pool | Option B: Bridge | Option C: Tiered |
|---|---|---|---|---|
| Tenant data isolation | High | Medium (RLS — strong but app-layer dependent) | High (schema separation; cross-tenant impossible by default) | High for enterprise; Medium for pool tier |
| Operational cost | High | Low (one DB, one migration set) | Medium (N schema migrations per change) | Low+ (mostly pool; small overhead for silo) |
| Path to enterprise tier | High | Hard (migrate to silo is a 6-12 month project per tenant) | Medium (silo migration easier) | Easy by design (silo is part of the model) |
| Onboarding speed | Medium | Fast (insert row + seed) | Medium (schema creation + migrations on new schema) | Fast for pool; slower for enterprise |
| Schema migration friction | Medium | Low (one migration) | High (run on N schemas; must be idempotent) | Low for pool; medium for silo |
| Cross-tenant analytics | Low | Easy | Hard (UNION across schemas) | Mostly easy (pool); hard for silo joining |

### Dealbreakers identified

- Option A fails on "Path to enterprise tier" if SOC 2 buyer arrives in Q4 — converting one tenant to silo from pool is a 6-12 month effort. **Mitigation possible if we design routing layer**.
- Option B has high schema migration friction at 50 tenants and growing — every schema change requires running migrations N times.

### Recommendation

**Pick: Option C (Tiered)**

**Rationale**: Tiered gets us the cheapest operational path for the majority of tenants while preserving a clean graduation path to enterprise isolation. The cost is the routing-layer abstraction (every request resolves `tenant_id` → connection string), which is an upfront investment but converts a one-way decision (pure Pool or pure Silo) into a two-way decision (per-tenant tier choice). Bridge was tempting for cleaner default isolation but the schema migration overhead at the expected tenant count is real.

**Confidence**: Medium — depends on the assumption that <10% of tenants will need silo at the 12-month mark. If 30%+ go enterprise, Bridge becomes more attractive. We'll re-evaluate at 6 months with actual signal.

---

## Rules for a useful matrix

1. **4-7 criteria.** Fewer is shallow; more is noise.
2. **Weight as High / Medium / Low.** Don't give numerical scores — the precision is fake.
3. **Use qualitative cells.** "Low (one DB, one migration set)" tells the reader what kind of low. Numbers in qualitative comparisons are almost always made up.
4. **Identify dealbreakers explicitly.** If Option B fails on a High-weight dealbreaker, it's eliminated. Don't pretend a dealbreaker can be "weighted down."
5. **Annotate, don't just mark.** Every cell should have a short why.
6. **Pick** with rationale and confidence level. The matrix doesn't tell you which to pick — judgment does. The matrix makes the trade-offs visible.
7. **Be honest** when an option that "should" win on paper actually loses to schedule, team familiarity, or org constraints. Document those forces in the rationale.
