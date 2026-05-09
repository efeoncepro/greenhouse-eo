# Stack Matrix 2026

> **Validated as of**: 2026-05-08. Treat any claim here as suspect if it has not been re-validated in the last 3 months. The skill ALWAYS forces a research pass (per `12-research-protocol.md`) before recommending a specific version, price, or vendor capability — this file is a starting point, not the source of truth.

This file lists the stack options worth considering by layer in 2026. For each option, the table gives:

- **Status**: Adopt / Trial / Assess / Hold (using ThoughtWorks Tech Radar Vol 34, April 2026, as anchor)
- **Best for**: which archetypes from `01-solution-archetypes.md` it serves well
- **Trade-offs**: the honest gotchas
- **Lock-in**: how hard it is to leave

When in doubt, default to the boring choice. In 2026, "boring" means PostgreSQL, Next.js, Postgres, OTel, MCP — these are boring because they are mature and converged on. Boring is a feature.

---

## Layer 1: Programming languages and runtimes

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **TypeScript on Node.js 22 LTS** | Adopt | Web apps, internal tools, BFFs, CLIs | Mature ecosystem; strict mode is now default; ESM-first works | Low — language is portable |
| **TypeScript on Bun 1.x** | Trial | New Node-style projects valuing speed | Faster than Node, smaller ecosystem gaps; production stability improving | Low — Bun runs Node code mostly |
| **Python 3.13** | Adopt | Data, ML, AI orchestration, scripting | GIL still constrains some workloads; uv replacing pip/poetry as default | Low |
| **Go 1.22+** | Adopt | High-throughput services, CLIs, infra tools | Boring in the best way; great for backend services that need to scale | Low |
| **Rust** | Adopt | Performance-critical services, CLIs, embedded | Higher development cost; team capacity matters | Low |
| **Java 21 LTS** | Adopt | Enterprise services, regulated industries | Boring, scales, but verbose; Quarkus/Micronaut for modern feel | Low |
| **Kotlin** | Adopt (JVM) / Trial (multiplatform) | JVM services, Android | Still JVM-bound for most uses; multiplatform improving | Low for JVM, medium for multiplatform |
| **Elixir / Phoenix** | Trial | Real-time, fault-tolerant systems | Niche talent pool; LiveView is genuinely good for real-time | Medium — paradigm shift to leave |

**Default for the user's archetype, if unspecified**: TypeScript on Node 22 LTS for any web/SaaS. Python 3.13 for any data/AI work. Go for high-throughput services without rich domain logic. Rust only if performance is genuinely the bottleneck.

---

## Layer 2: Frontend frameworks (web)

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **Next.js 16.x + React 19.2** | Adopt | B2B SaaS, dashboards, content-heavy apps | RSC is the future; Turbopack stable in dev/build; some footguns around Cache Components and async params | Medium — App Router patterns are non-trivial to migrate from |
| **Astro 6** | Adopt | Headless content sites, marketing, docs | Best-in-class for static + island interactivity; hits a ceiling for app-heavy use | Low — mostly standard web |
| **Remix / React Router v7** | Trial | Apps where the framework merger is ok | Remix merged into React Router; ecosystem in transition | Medium |
| **SvelteKit 2** | Trial | Apps where smaller bundle and reactivity matter | Smaller community than React; talent pool smaller | Medium |
| **Vue 3 / Nuxt 4** | Adopt | Teams with Vue background | Strong DX; smaller ecosystem than React | Medium |
| **Solid / SolidStart** | Assess | Performance-critical apps with React-like DX | Niche; ecosystem still maturing | Medium |
| **Modern.js (ByteDance)** | Trial | Apps with Module Federation needs | Tech Radar Trial: trigger is `nextjs-mf` going EOL — Modern.js is now the recommended path for federation-based architectures | Medium |
| **Pure HTML + htmx** | Trial | Simple internal tools, server-rendered apps with hx interactivity | Genuinely productive for the right shape; not for SPA-style apps | Low |

**Default**: Next.js 16 if doing app-style work and React is acceptable. Astro 6 for content-led sites.

**Hold**: Pages Router on Next.js (legacy); Create React App (deprecated since 2023); Gatsby (declining).

---

## Layer 3: Backend frameworks (Node.js / TypeScript)

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **Hono** | Adopt | APIs, edge runtimes, fast HTTP services | Lightweight, runs everywhere (Node, Bun, Deno, Cloudflare Workers); growing fast | Low |
| **Fastify** | Adopt | Node APIs needing performance + plugins | Mature, schema-first via JSON Schema; great DX | Low |
| **Elysia (Bun-first)** | Trial | Bun-native APIs | Bun-only; great if you're already on Bun | Medium |
| **NestJS** | Adopt (with reservations) | Teams familiar with Angular-style DI | Heavy; the framework imposes a lot; great for large teams | Medium-high |
| **tRPC** | Adopt | Type-safe APIs between TS frontend and TS backend | Doesn't replace REST; it's a different layer; great DX | Medium |
| **Express 5** | Hold | Legacy projects only | New projects should use Hono or Fastify | Low |

**Default for new APIs**: Hono if performance matters or running on edge; Fastify for traditional Node services.

---

## Layer 4: Backend frameworks (Python)

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **FastAPI** | Adopt | APIs, especially with AI/ML endpoints | Type-safe via Pydantic; great DX; async-first | Low |
| **Litestar** | Trial | Performance-sensitive Python APIs | Faster than FastAPI in some benchmarks; smaller community | Low |
| **Django 5** | Adopt | Full-stack apps with admin needs | Boring, mature, complete; ORM is good for OLTP | Medium |
| **Flask** | Hold for new projects | Legacy / minimal scripts | FastAPI is now the better default | Low |

**Default for AI/agentic services in Python**: FastAPI.

---

## Layer 5: Databases (OLTP)

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **PostgreSQL 16** | Adopt | Almost everything | The default. RLS for multi-tenancy. Rich JSON. Vector via pgvector | Low (open source, portable) |
| **PostgreSQL 17 (when stable)** | Trial | Same as 16, with newer features | Adopt once your hosting catches up | Low |
| **MySQL 8.4** | Adopt | Teams with MySQL ops experience | Less feature-rich than Postgres; PlanetScale is a good managed option | Low |
| **SQLite (with LiteFS or libSQL)** | Trial for distributed, Adopt for single-node | Edge apps, local-first apps, embedded | Distributed SQLite is genuinely viable now (Turso, LiteFS, libSQL) | Low |
| **CockroachDB** | Trial | Multi-region active-active OLTP | Expensive; only worth it if you genuinely need global distribution | Medium |
| **MongoDB** | Hold for new transactional systems | Document-shaped data, prototypes | Postgres JSON is now better than MongoDB for most cases | Medium |
| **DynamoDB** | Adopt within AWS | Key-value or simple-query workloads at scale | Single-table design is not boring; locked to AWS | High (AWS) |

**Default**: PostgreSQL 16 unless there's a clear reason otherwise. The default reasons to choose otherwise: AWS-only constraint (DynamoDB), edge-first app (SQLite/Turso), genuine global active-active (CockroachDB).

### Postgres hosting

| Option | Best for | Trade-offs |
|---|---|---|
| **Neon** | Serverless Postgres, branching for dev | Cold start on free tier; great DX; growing fast |
| **Supabase** | App with auth + storage + realtime + Postgres | Bundles a lot; you may not need it all; vendor-neutral underneath |
| **PlanetScale (Postgres)** | High-scale Postgres with branching | Newer than their MySQL offering; watch maturity |
| **AWS RDS / Aurora** | Enterprise AWS shops | Reliable, expensive, not the best DX |
| **GCP Cloud SQL** | GCP-native shops | Reliable, integrates with rest of GCP, not the best DX |
| **Self-hosted on Hetzner / OVH** | Cost-conscious, ops-capable teams | 5-10× cheaper than managed; you operate it |

---

## Layer 6: Analytical / OLAP databases

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **BigQuery** | Adopt for GCP shops | Serverless analytics, ML-adjacent | Pricing surprise risk on big scans; great with Iceberg now | Medium (proprietary SQL extensions) |
| **Snowflake** | Adopt | Multi-cloud analytics | Expensive at scale; powerful features | Medium-high |
| **Databricks** | Adopt | Lakehouse + ML + analytics | Best for ML-heavy data orgs; complex pricing | Medium-high |
| **DuckDB** | Adopt | Local / embedded analytics | Increasingly viable as a serverless analytics layer in apps; not a warehouse for the org | Low |
| **ClickHouse** | Adopt | High-performance analytics, real-time dashboards | Operates differently from row-store DBs; learning curve | Low |
| **Apache Iceberg (table format)** | Adopt | Vendor-neutral lakehouse | Works with all major platforms (BQ, Snowflake, Databricks, AWS); the bet against lock-in | Low (that's the point) |

**Default for analytics**: BigQuery if on GCP, Snowflake if multi-cloud, ClickHouse if you control the stack and need real-time. Use Iceberg as the table format whenever you can — it's the lock-in mitigation.

---

## Layer 7: Search and vectors

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **pgvector (Postgres extension)** | Adopt | Apps already on Postgres needing vector search | One database to operate; good for <100M vectors; not the fastest | Low |
| **Typesense** | Adopt | Self-hostable search with great DX | Smaller community than ES; very good for typo-tolerance and faceted search | Low |
| **Meilisearch** | Adopt | Same niche as Typesense | Excellent DX; pricing model on cloud is reasonable | Low |
| **Algolia** | Adopt for SaaS | Hosted full-text search | Expensive at scale; great DX; vendor lock | Medium |
| **Elasticsearch / OpenSearch** | Adopt for large-scale | Search at scale, log analytics | Operationally heavy; powerful when you need it | Medium |
| **Weaviate** | Trial | Vector-first apps with hybrid search | Vector-native; good if pgvector isn't enough | Medium |
| **Pinecone** | Trial | Hosted vector DB | Locked to vendor; convenient | Medium-high |
| **Qdrant** | Adopt | Self-hostable vector DB | Good performance; growing | Low |
| **Milvus** | Adopt for large-scale vectors | Billions of vectors | Heavy to operate; best for very large indexes | Low |

**Default**: pgvector if already on Postgres and corpus is moderate. Typesense or Meilisearch for full-text. Qdrant for serious vector workloads when pgvector hits limits.

---

## Layer 8: Message queues and streaming

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **PostgreSQL LISTEN/NOTIFY** | Adopt for small scale | Internal events, light pub-sub | Doesn't scale beyond ~hundreds of subscribers; one DB to operate | Low |
| **Redis Streams** | Adopt | Lightweight queues, rate limiting | Operationally simple; not a Kafka replacement | Low |
| **NATS / JetStream** | Adopt | Cloud-native messaging | Lightweight, fast, Kubernetes-native | Low |
| **Apache Kafka** | Adopt | High-throughput event streaming | Heavy operationally; the default for serious event-driven systems | Low (open) / Medium (Confluent) |
| **Redpanda** | Adopt | Kafka-compatible, simpler ops | Drop-in Kafka API, no ZooKeeper | Low (Kafka API) |
| **AWS SQS / SNS** | Adopt within AWS | Simple AWS-native queues | Locked to AWS; great for AWS-heavy stacks | High (AWS) |
| **Cloud Pub/Sub** | Adopt within GCP | Simple GCP-native queues | Locked to GCP | High (GCP) |

**Default**: Postgres LISTEN/NOTIFY for early stage. Kafka or Redpanda when throughput justifies operational cost.

---

## Layer 9: Authentication

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **Auth0** | Adopt | Enterprise needs, complex auth flows | Expensive at scale; Okta-owned now | Medium-high |
| **Clerk** | Adopt | B2B SaaS with rich org/team support | Modern DX, opinionated, growing fast | Medium |
| **WorkOS** | Adopt | B2B SaaS needing SSO/SCIM for enterprise | Best-in-class for "enterprise readiness" features | Medium |
| **Stytch** | Trial | Passwordless / passkey-first apps | Modern primitives | Medium |
| **Supabase Auth** | Adopt | Already on Supabase | Bundled, good for app-shaped use cases | Medium |
| **NextAuth.js / Auth.js** | Adopt | Self-hosted, Next.js apps | OSS; many provider integrations; you own the user store | Low |
| **AWS Cognito** | Adopt within AWS | AWS-heavy stacks | Functional but rough DX | High (AWS) |
| **Roll-your-own auth** | Hold | Toy projects only | The trap that ate every team that tried | Low (in theory) |

**Default for B2B SaaS**: WorkOS if enterprise is on the roadmap; Clerk for general B2B; NextAuth for self-hosted Next.js.

---

## Layer 10: Hosting and deployment

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **Vercel** | Adopt | Next.js, frontend-heavy apps | Best DX; expensive at scale; the egress and middleware costs surprise people | Medium (Next.js features tied to Vercel optimizations) |
| **Cloudflare Workers / Pages** | Adopt | Edge-first apps, global low-latency | Different runtime constraints; growing fast | Medium |
| **Fly.io** | Adopt | Apps wanting Vercel-like DX with full control | Region-aware, multi-region deploys; lighter than AWS | Low |
| **Railway** | Trial | Small teams wanting deploy-as-Heroku | Easy DX; pricing scales with usage | Low |
| **Render** | Adopt | Heroku replacement | Solid; nothing flashy | Low |
| **AWS (ECS / Fargate / Lambda)** | Adopt | Enterprise, AWS-shop | Most flexibility; most complexity | High (AWS-specific) |
| **GCP Cloud Run** | Adopt | Container-based serverless | Excellent for batch + HTTP; pairs well with GCP data | Medium (GCP) |
| **Kubernetes (self-managed)** | Hold for small teams | Large engineering orgs | If you have to ask whether you need it, you don't | Low (K8s is portable) |
| **Hetzner / OVH bare metal** | Trial | Cost-extreme workloads | 5-10× cheaper than managed; you operate it | Low |

**Default**: Vercel for Next.js apps. Cloud Run for backend services on GCP. Cloudflare Workers if edge-native is a real requirement. AWS only if other AWS services are central.

---

## Layer 11: Observability

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **OpenTelemetry (OTel)** | Adopt | Foundation layer for everything | The standard. Instrument once, send anywhere | Low (that's the point) |
| **Datadog** | Adopt | All-in-one paid observability | Excellent product; expensive; everything-in-one | High |
| **Grafana + Prometheus + Loki + Tempo** | Adopt | Self-hosted observability | OSS stack; you operate it | Low |
| **Honeycomb** | Adopt | Observability with BubbleUp / SLOs / wide events | Best-in-class for distributed traces | Medium |
| **Sentry** | Adopt | Error tracking, performance | The default for client-side errors | Medium |
| **Axiom** | Trial | Logs + traces with simple pricing | Simpler model than Datadog; growing | Medium |
| **Langfuse** | Adopt for AI workloads | LLM observability + evals + prompt mgmt | OTel-native; OSS or hosted; the default for LLM tracing in 2026 | Low (OTel-based) |
| **LangSmith** | Adopt for LangChain users | LLM tracing tied to LangChain | Smooth if already on LangChain; slightly more locked | Medium |

**Default**: OTel for instrumentation. Send to Datadog/Honeycomb/Grafana depending on budget and complexity. Langfuse for LLM-specific observability layered on top.

---

## Layer 12: AI / LLM providers

> **Critical**: this layer changes monthly. ALWAYS run a pricing validation before committing — `12-research-protocol.md` covers the protocol.

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **Anthropic Claude (Opus, Sonnet, Haiku)** | Adopt | Reasoning, agentic, complex instruction-following | Strong instruction-following; high context utilization; pricing competitive on Sonnet/Haiku | Medium (without abstraction) |
| **OpenAI (GPT-5, GPT-5-mini)** | Adopt | General-purpose, mature ecosystem | Largest tooling ecosystem; pricing varies | Medium |
| **Google Gemini (2.5 Pro, Flash)** | Adopt | Multimodal, GCP-native | Cheap Flash tier; strong multimodal; sometimes inconsistent on long-form reasoning | Medium |
| **Open-weight models (Llama 4, Mistral, Qwen)** | Trial / Adopt | Cost-extreme, on-prem, sovereignty | Quality gap with frontier closed; requires inference infra | Low |
| **xAI Grok** | Assess | Real-time / web-grounded | Less mature ecosystem; growing | Medium |

**Critical pattern**: wrap LLM calls behind a model-agnostic interface (or use a gateway like LiteLLM, agentgateway, or OpenRouter). This converts vendor choice from one-way to two-way.

**Default for production agentic systems**: Claude Sonnet 4 / Opus 4 for reasoning + Claude Haiku for cheap classification + Gemini Flash for multimodal/cheap bulk + a gateway in front so you can route or fail over.

---

## Layer 13: Agentic frameworks

| Option | Status | Best for | Trade-offs | Lock-in |
|---|---|---|---|---|
| **MCP (Model Context Protocol)** | Adopt | Tool exposure to any LLM | The substrate. Build MCP servers, not one-off integrations | Low |
| **Pydantic AI** | Adopt | Python agents needing typing + simplicity | Simpler than LangGraph; growing fast | Low |
| **OpenAI Agents SDK** | Adopt | OpenAI-first agent systems | Tight to OpenAI; clean API | Medium (OpenAI) |
| **Claude Agent SDK** | Adopt | Anthropic-first agent systems | Tight to Anthropic; clean API | Medium (Anthropic) |
| **Vercel AI SDK** | Adopt | TS/JS agents on Vercel/Next.js | The default for Next.js apps with AI | Low |
| **LangChain** | Adopt with reservations | Existing investment; framework-style devs | Heavy; abstractions sometimes get in the way | Medium |
| **LangGraph** | Trial (moved out of Adopt in Tech Radar V34) | Complex multi-agent state machines | Overkill for many cases; rigid graph structure | Medium-high |
| **Google ADK** | Trial | Multi-agent on Vertex AI | GCP-bound; mature | High (GCP) |
| **CrewAI** | Trial | Quick multi-agent prototypes | Less production-ready than alternatives | Medium |

**Default for new agentic systems in 2026**: Pydantic AI (Python) or Vercel AI SDK (TS/JS). MCP for tool exposure. Add LangGraph/ADK only when you have proven multi-agent state-machine needs.

---

## Layer 14: CI/CD and deployment automation

| Option | Status | Best for | Trade-offs |
|---|---|---|---|
| **GitHub Actions** | Adopt | Most teams | The default; ecosystem is rich; cost can grow |
| **GitLab CI** | Adopt | GitLab-native shops | Solid alternative |
| **CircleCI** | Adopt | Mature CI workflows | Good DX; pricing varies |
| **Buildkite** | Trial | Self-hosted runners with managed control plane | Best of both worlds for ops-capable teams |

---

## Anti-patterns to call out

These appear in proposals and should be challenged:

- **Microservices from day one** — almost always premature. Start with a modular monolith.
- **Kubernetes for a 3-engineer team** — you'll spend more time on K8s than the product.
- **Custom auth** — the failure mode is silent and bad. Use a provider.
- **MongoDB for transactional data** — Postgres JSON is now better.
- **REST + GraphQL + tRPC for the same endpoint** — pick one paradigm per consumer.
- **Multi-cloud from day one** — solve a real problem first.
- **Building an LLM gateway from scratch** — LiteLLM and others exist.
- **Pages Router on a new Next.js project** — App Router has been stable for two years.
- **Sticking with Webpack on Next.js 16** — Turbopack is the default; only opt out for specific reasons.

---

## Skill behavior with this matrix

When generating a stack recommendation:

1. Match the user's archetype(s) to the relevant rows in this matrix
2. **Validate the specific version, status, and pricing** against current sources — see `12-research-protocol.md`
3. Annotate every recommendation with **why** (which trade-offs it favors)
4. Annotate every recommendation with the **lock-in cost** (so the user knows what's reversible)
5. Note the **last-validated date** explicitly in the output
