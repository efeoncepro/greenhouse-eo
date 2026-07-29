# Solution Archetypes 2026

A solution archetype is a pattern that defines, by its nature, most of the architectural choices: data shape, scale curve, dominant risks, observability needs, and the kind of failures that hurt. Naming the archetype is the first step in design because it eliminates whole classes of decisions that are already made.

This file lists 13 archetypes. Most real systems blend 2-3. Always name the **primary** archetype (the one whose risks dominate) and any **secondaries** (the ones whose patterns also apply).

## Contents

Usage; B2B SaaS; agentic AI; data platform; headless content; internal tool; event-driven; mobile; edge AI; CRM/workflow; marketplace; developer tool; API/BFF; operating-system hybrid; multi-archetype classification.

## How to use this reference

For each candidate archetype, check:

1. **Signature match** — does the user's system fit the description?
2. **Dominant risks** — are the user's worries about these risks?
3. **Pre-decided trade-offs** — which decisions does this archetype already make?

Don't force-fit. If a system genuinely doesn't fit any archetype, it's probably a hybrid; pick the closest 2-3 and document the gaps.

---

## 1. B2B SaaS multi-tenant

**Signature**: One codebase, multiple paying customer organizations, each with their own users, data, branding, and access scope. Tenant boundary is the most important security and data design concern.

**Examples**: Greenhouse, Kortex, Salesforce, HubSpot, Linear, Notion (the platform).

**Pre-decided trade-offs**:
- Tenant isolation must be enforced at the data layer, not just application layer
- Schema migrations must be backward-compatible (you can't take all tenants down)
- Per-tenant metrics and observability are required from day one
- Onboarding flow is a first-class product feature, not an afterthought

**Dominant risks**:
- **Tenant data leakage** (a single missed `WHERE tenant_id = ?` is a breach)
- **Noisy neighbor** (one tenant's load degrades others)
- **Tier exhaustion** (the chosen multi-tenancy pattern doesn't scale to enterprise customers — see `06-multi-tenancy.md` for tiered isolation)
- **Customization sprawl** (per-tenant feature flags become unmanageable)

**Shape hypotheses to evaluate**: shared, partitioned, stamped, or dedicated serving planes; explicit tenant membership and authorization; isolation across every substrate; per-tenant quotas and cost attribution; privacy-safe tenant correlation in telemetry. Do not select database topology or telemetry propagation from the archetype alone.

**Critical questions to answer in the ADR**:
- Pool, schema, or silo? Or tiered (mix)?
- How is tenant context propagated through every request? Middleware, interceptor, or RLS context variable?
- What's the migration path from shared-schema to schema-per-tenant if enterprise clients demand it?
- Who owns the tenant onboarding flow (provisioning, schema creation, default data)?

---

## 2. Agentic AI system

**Signature**: One or more LLM-powered agents that plan, call tools, and execute multi-step workflows, often autonomously or semi-autonomously. The agent makes decisions at runtime that affect external systems.

**Examples**: Verk Agent, Nexa Phase 2/3, customer-support agents, coding agents (Claude Code, Codex), research agents.

**Pre-decided trade-offs**:
- Non-determinism is a feature, not a bug — design for it
- Every tool call needs auth, audit, and revocability
- Cost is a first-class concern, not an afterthought
- Evals are not optional; they are the equivalent of tests
- Autonomy must be tiered explicitly (observe / recommend / execute-with-log / autonomous)
- Context engineering replaces prompt engineering as the architectural concern

**Dominant risks**:
- **Prompt injection** (untrusted content in context becomes instructions)
- **Runaway cost** (a loop or a long context blows the budget)
- **Hallucination blast radius** (the agent acts on false premises)
- **Vendor lock-in to a single model** (the right model 6 months from now may not be the one you started with)
- **Cognitive debt** (humans stop understanding what the agent does or why)
- **Permission scope creep** (agents accumulate access over time)

**Shape hypotheses to evaluate**: deterministic workflow before open-ended agent; bounded runtime/checkpoints; explicit principal and tool policy; eval harness; privacy-safe tracing; sandboxed side effects; MCP/A2A only when interoperability needs justify them. Load `16-agentic-systems-assurance.md` before choosing tools.

**Critical questions to answer in the ADR**:
- What autonomy tier does each workflow run at?
- Which tools are available, with what scope, to which user roles?
- How is context assembled? (Static prompt? RAG? Progressive disclosure via skills?)
- How are evals run? Pre-merge? Post-merge? In production on sampled traffic?
- What's the kill-switch and the cost ceiling?
- Single-model or multi-model? If multi, who routes?

See `references/04-ai-native-patterns.md` for depth.

---

## 3. Data platform / analytical (OLAP)

**Signature**: System whose primary purpose is to ingest, transform, and serve analytical data — dashboards, reports, ML features, ad-hoc queries. Read-heavy, batch or streaming ETL/ELT, typed schemas, slow-moving by design.

**Examples**: ICO Engine, Greenhouse BigQuery datasets, Snowflake / Databricks deployments, dbt projects.

**Pre-decided trade-offs**:
- Eventual consistency between source-of-truth and analytical store is acceptable
- Cost-per-query matters more than latency for ad-hoc workloads
- Schemas evolve — design for backward and forward compatibility
- Lineage and freshness are observable metrics, not nice-to-have

**Dominant risks**:
- **Cost runaway** (a single bad query scans terabytes)
- **Stale data** (pipelines fail silently and dashboards show last-week's truth)
- **Schema drift** (source system changes break downstream silently)
- **Vendor lock-in** (platform-specific SQL dialects, proprietary table formats)

**Shape hypotheses to evaluate**: separate operational authority from analytical serving when workloads diverge; versioned data contracts; observable freshness/quality; lineage; owned semantic layer; incremental materialization; open formats only when portability value exceeds operating cost.

**Critical questions to answer in the ADR**:
- What's the read pattern (dashboards, ad-hoc, ML training, embedded analytics)?
- Open or closed table format? (Iceberg buys neutrality; proprietary formats buy convenience)
- What's the freshness SLA per dataset, and how is it monitored?
- Who owns the semantic layer? (Otherwise everyone redefines metrics)
- What's the cost ceiling per dataset, and where is the monitoring?

---

## 4. Headless content site

**Signature**: Public-facing website driven by a separate CMS, optimized for SEO, performance, and content velocity. Content edits are frequent; code edits are rarer.

**Examples**: Efeonce Web (Astro + WordPress), Vercel marketing site, modern editorial sites.

**Pre-decided trade-offs**:
- Build time matters (long builds block content publishing)
- ISR/SSG is preferable to SSR for most pages
- SEO and Core Web Vitals are product concerns, not optimization tasks
- Content schema in the CMS is a contract — breaking changes hurt content team

**Dominant risks**:
- **Build time explosion** (10k pages × static generation = 30-minute deploys)
- **Preview environment drift** (CMS preview shows different content than prod build)
- **Image / asset cost** (CDN bandwidth bills)
- **CMS lock-in** (custom field configurations are hard to migrate)

**Shape hypotheses to evaluate**: rendering and invalidation selected from content freshness/traffic; CMS contract separated from delivery; preview parity; CDN/cache strategy; image budget; structured data and accessibility verified in the published artifact.

**Critical questions to answer in the ADR**:
- ISR or full SSG? (Trade-off: build time vs cache invalidation complexity)
- Where does structured data (JSON-LD, OpenGraph) come from?
- How does the CMS preview deploy to a non-prod environment quickly?
- What's the rollback path if a content change breaks layout?

---

## 5. Internal tool / admin

**Signature**: Software for a known, finite, internal user population. Optimizes for productivity and correctness over polish. Has admin actions that change real-world state (issue refunds, suspend users, modify production data).

**Examples**: Greenhouse admin views, internal dashboards, support consoles, ops tooling.

**Pre-decided trade-offs**:
- RBAC is non-negotiable from day one
- Audit log of every state-changing action is non-negotiable
- UX can be functional, not beautiful — the user is paid to use this
- Speed of building > speed of running (within reason)

**Dominant risks**:
- **Privilege creep** (admins accumulate roles they no longer need)
- **No audit trail** (cannot trace who did what when)
- **Production write paths from the admin tool** (a single bug can corrupt production data)
- **Auth bypass** (someone shares a session, or a service account becomes a backdoor)

**Shape hypotheses to evaluate**: reuse the product platform where it reduces cognitive load; explicit view/entitlement separation; governed commands; immutable audit evidence; step-up or multi-party approval proportional to irreversible actions; safe read-only/degraded modes.

**Critical questions to answer in the ADR**:
- What roles exist, and what can each do?
- How is every state-changing action audited (who, when, what, why)?
- Are there destructive actions that require a second approver?
- Can admins impersonate users? If yes, how is that audited?

---

## 6. Real-time / event-driven

**Signature**: System where changes propagate to consumers within seconds, not minutes. Notifications, live dashboards, collaborative editing, real-time pricing, gaming, IoT.

**Examples**: Greenhouse SSE notifications, Slack messaging, Figma multiplayer, trading systems.

**Pre-decided trade-offs**:
- Backpressure must be designed for, not added later
- Ordering guarantees are explicit (per-key, per-partition, none)
- At-least-once vs at-most-once delivery is decided early
- Idempotency on consumers is mandatory

**Dominant risks**:
- **Lost messages** (consumer crashes mid-processing, message gone)
- **Duplicate processing** (retries without idempotency cause data corruption)
- **Backpressure cascade** (slow consumer brings down producer)
- **Ordering bugs** (events arrive in wrong order, derived state is wrong)

**Shape hypotheses to evaluate**: choose push/poll and broker from latency, fan-out, ordering, durability, replay, and operator capacity; use transactional publication when state and event must agree; require bounded queues, backpressure, idempotency, and repair.

**Critical questions to answer in the ADR**:
- Push to client (websocket, SSE, polling)?
- At-least-once or at-most-once? (Most production systems need at-least-once + idempotent consumers)
- What's the consumer's idempotency key strategy?
- How do you replay events when a consumer falls behind?

---

## 7. Mobile-first

**Signature**: Primary user surface is a native mobile app (iOS, Android), or both. Web may exist but is secondary. App store cycle, OTA updates, and offline-first are concerns.

**Examples**: Consumer apps, field service tools, courier apps.

**Pre-decided trade-offs**:
- Releases are gated by app stores (cycle of days, not minutes)
- OTA updates (CodePush, Expo Updates) for non-binary changes are required
- Offline-first is harder to add later than to design in
- Push notifications are infrastructure, not a feature

**Dominant risks**:
- **App store rejection cycles** (a critical fix waits 24-72h for review)
- **Multi-version-in-the-wild** (older app versions querying newer APIs)
- **Battery and data cost** (unhappy users uninstall fast)
- **Native module fragility** (a third-party native lib breaks on next OS version)

**Shape hypotheses to evaluate**: native versus cross-platform from device capabilities/team skills; offline state and conflict policy; multi-version API compatibility; observability and release/rollback within store/OTA constraints.

**Critical questions to answer in the ADR**:
- Single platform or both? (Flutter and RN both go cross-platform; native still wins for some categories)
- OTA strategy from day one
- API versioning strategy (multiple app versions hitting the same endpoint)
- Offline scope (read-only? full CRUD with sync?)

---

## 8. Embedded / edge AI

**Signature**: AI inference runs at the edge — on-device, in a CDN worker, or near the user — to minimize latency or cost or to handle data that cannot leave the user's region.

**Examples**: On-device LLMs, Cloudflare Workers AI, edge personalization, edge content moderation.

**Pre-decided trade-offs**:
- Cold start latency is a UX concern
- Model size is bounded by the runtime
- Updating models means a deploy, not a hot-swap
- Observability at the edge is harder (no central logger by default)

**Dominant risks**:
- **Model staleness** (deployed model versions diverge across edges)
- **Cold start latency** (first request to a worker takes seconds)
- **Cost surprises** (per-invocation pricing × user fanout)
- **Privacy assumptions broken** (data crosses regions you didn't expect)

**Shape hypotheses to evaluate**: execute near users/devices only when latency, privacy, availability, or egress evidence justifies distribution; quantify placement, model/artifact size, update, observability, consistency, and fallback constraints before selecting a platform.

**Critical questions to answer in the ADR**:
- What's the latency budget per request?
- Where do model updates come from, and how are they versioned?
- Where do failure cases fall back to (origin?)?
- How is observability aggregated across regions?

---

## 9. CRM / workflow

**Signature**: System that models a business process — sales, service, marketing, ops — with stages, owners, automations, and reports. Built around a system-of-record (HubSpot, Salesforce, custom) with extensions, integrations, and reports on top.

**Examples**: Praxis (Efeonce CRM methodology), HubSpot deployments, Salesforce orgs, custom CRMs.

**Pre-decided trade-offs**:
- Stay close to the system-of-record's data model; resist parallel models
- Integrations with the CRM are the riskiest part (API rate limits, schema drift)
- Custom UI extensions have a limited shelf life (vendor changes platform)
- Reporting tends to drift from operational reality without governance

**Dominant risks**:
- **Vendor platform deprecation** (HubSpot Projects v2025.1 deprecation, Salesforce API version sunset)
- **Sync drift** (CRM and downstream systems diverge silently)
- **Permission complexity** (object-level, field-level, per-team — easy to get wrong)
- **Custom code in the CRM that nobody owns** (admin leaves, code rots)

**Shape hypotheses to evaluate**: declare field/object authority; use webhooks plus reconciliation where delivery is not authoritative; minimize bidirectional ownership; preserve identity, lineage, rate-limit, replay, and manual-repair contracts.

**Critical questions to answer in the ADR**:
- What's the system-of-record for each object? (Don't have two)
- One-way sync or bi-directional? (One-way unless truly needed)
- How are platform deprecations tracked (HubSpot, Salesforce changelogs)?
- Who owns the CRM data model evolution?

---

## 10. Marketplace (two-sided)

**Signature**: Platform connecting two distinct user populations (buyers and sellers, riders and drivers, brands and creators) where the platform's value depends on having both sides liquid.

**Examples**: Airbnb, Uber, creator marketplaces, freelance platforms.

**Pre-decided trade-offs**:
- Cold-start liquidity problem (chicken-and-egg) is a strategy decision, not just engineering
- Trust mechanisms (reviews, verification, escrow) are core, not features
- Search and matching are the core algorithm; everything else is plumbing
- Two distinct UX surfaces and often two distinct mobile apps

**Dominant risks**:
- **Cold start failure** (one side never reaches liquidity)
- **Disintermediation** (users transact off-platform after first connection)
- **Trust collapse** (a single bad incident scares one side away)
- **Fraud at scale** (fake listings, fake reviews, payment fraud)

**Shape hypotheses to evaluate**: separate buyer/seller journeys and entitlements; ledger and settlement authority; search/matching quality; trust/safety and dispute workflows; identity verification; liquidity/network-effect instrumentation.

**Critical questions to answer in the ADR**:
- Who is the primary user (which side has more pain without the platform)?
- What prevents disintermediation (escrow, in-platform messaging, contracts)?
- How is trust bootstrapped before reputation exists?
- What's the take rate, and how does it interact with payment infra costs?

---

## 11. Developer tool / CLI

**Signature**: Software whose primary user is a developer, often run locally, with a command-line or terminal-based interface.

**Examples**: CLIs, dev tools, build tools, infrastructure tools.

**Pre-decided trade-offs**:
- Cross-platform support (macOS, Linux, Windows) is the default expectation
- Distribution channels (npm, Homebrew, cargo, pip) influence language choice
- Telemetry is sensitive — opt-in by default, transparent
- Performance matters because devs notice

**Dominant risks**:
- **Cross-platform bugs** (Windows path handling, Linux distros)
- **Dependency drift** (a transitive dep breaks the tool 6 months later)
- **Bad release** (a buggy v2.3.4 hits all users instantly via auto-update)
- **Telemetry backlash** (devs find out about telemetry they didn't expect)

**Shape hypotheses to evaluate**: distribution and runtime from target environments; stable machine-readable output and exit codes; cross-platform tests; signed/provenanced releases; explicit offline and telemetry/privacy posture.

**Critical questions to answer in the ADR**:
- What's the install path on each OS?
- How are updates delivered (auto-update, package manager, manual)?
- What telemetry, opt-in or opt-out, with what disclosure?
- What's the rollback path for a bad release?

---

## 12. API / Backend-for-Frontend

**Signature**: System whose primary surface is a programmatic API, consumed by other services or by frontends owned by the same team.

**Examples**: Greenhouse REST API + MCP server, public SaaS APIs, internal microservices, GraphQL gateways.

**Pre-decided trade-offs**:
- API contract is a product — versioning matters
- OpenAPI / GraphQL schema is documentation, validation, and SDK source
- Backwards compatibility is a contract with consumers
- Authentication, rate limiting, and quotas are infrastructure

**Dominant risks**:
- **Breaking changes** (consumers stop working without warning)
- **Inconsistent error formats** (debugging across endpoints is painful)
- **N+1 over the API** (consumers force chatty patterns)
- **Auth model fragility** (token rotation, scope creep, short-lived vs long-lived debates)

**Shape hypotheses to evaluate**: contract-first API with explicit owner/lifecycle; protocol selected from consumers and quality scenarios; consistent errors, idempotency, pagination, quotas, compatibility and contract tests; MCP only when agent interoperability has concrete consumers.

**Critical questions to answer in the ADR**:
- REST, GraphQL, gRPC, or a mix?
- Versioning strategy (URL, header, sunset window)
- AuthN/AuthZ model (API key, OAuth, JWT, mTLS)
- Is there an MCP layer for AI consumers, and what's its scope?

---

## 13. Hybrid: Operating-system-of-the-business

**Signature**: An internal platform that *is* the operating system of the company — the system through which the business runs, with portals for clients, internal tools for staff, integrations to external systems, analytics, automation, and AI features. Not a single archetype; multiple archetypes layered.

**Examples**: Greenhouse (Efeonce). Notion-as-internal-platform deployments at scale. Internal "super apps" at large orgs.

**Pre-decided trade-offs**:
- Domain-per-schema or domain-per-service to manage cognitive load
- Bidirectional integration with external systems (CRM, accounting, HR)
- Multi-tenant from day one if it serves clients; internal-only if not
- Observability and audit are first-class because the system is mission-critical

**Dominant risks**:
- **Cognitive load** (no one understands the whole system; brittle handoffs)
- **Integration fragility** (an external system change breaks core flows)
- **Schema sprawl** (every new module adds tables; cross-cutting concerns weaken)
- **Audit gaps** (something happened in the system, no one can reconstruct what or why)

**Shape hypotheses to evaluate**: domain boundaries and ownership before deployable boundaries; explicit operational/analytical sources of truth; governed integration and projections; view/entitlement access model; audit and tenancy across substrates; AI only where it adds measured value.

**Critical questions to answer in the ADR**:
- Modular monolith or microservices? (Modular monolith almost always wins until proven otherwise)
- What's the canonical store for each domain? (One source of truth per domain)
- How do modules talk to each other (in-process, events, internal API)?
- What's the audit and observability story across the whole system?

---

## When the system is multiple archetypes

Most real systems are 2-3 archetypes:

- Greenhouse = (13) Operating-system-of-the-business + (1) B2B SaaS multi-tenant + (3) Data platform + (5) Internal tool
- Kortex = (1) B2B SaaS multi-tenant + (9) CRM/workflow + (2) Agentic AI system
- Verk = (1) B2B SaaS multi-tenant + (12) API/BFF + (2) Agentic AI system + (3) Data platform
- Efeonce Web = (4) Headless content site
- Nexa = (2) Agentic AI system embedded inside (13) the operating-system-of-the-business

When listing archetypes, name the **primary** one whose risks dominate and the **secondaries** whose patterns also apply. The primary determines the dominant trade-offs; the secondaries add concerns that shouldn't be ignored.
