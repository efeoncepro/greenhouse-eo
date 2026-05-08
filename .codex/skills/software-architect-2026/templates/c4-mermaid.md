# C4 Diagrams in Mermaid

The C4 model has four levels:

1. **Context (L1)**: the system in its environment — users, external systems
2. **Container (L2)**: major components inside the system (deployable units)
3. **Component (L3)**: pieces inside a container
4. **Code (L4)**: classes / functions — usually skipped in architecture docs

This skill uses **L1 always, L2 always, L3 selectively** (only for the most complex containers). L4 is generated from code, not designed.

Mermaid is the default rendering — it lives in markdown, renders in GitHub / GitLab / VS Code preview / mkdocs, and is editable as text. No tool lock-in.

## Level 1: Context diagram

Shows: the system, the people who use it, the external systems it interacts with.

```mermaid
C4Context
    title Context Diagram - [System Name]

    Person(user, "User type", "Description of who they are")
    Person(admin, "Admin", "Description")

    System(system, "System Name", "What it does in one sentence")

    System_Ext(crm, "External CRM", "Third-party CRM provider")
    System_Ext(payments, "Payment Provider", "Stripe")
    System_Ext(llm, "LLM Provider", "Anthropic Claude API")

    Rel(user, system, "Uses for [primary use case]")
    Rel(admin, system, "Manages")
    Rel(system, crm, "Syncs customer data")
    Rel(system, payments, "Processes payments")
    Rel(system, llm, "Calls for AI features")
```

### Mermaid syntax notes for L1

- `Person(id, "label", "description")` — a user type
- `System(id, "label", "description")` — your system (rendered prominently)
- `System_Ext(id, "label", "description")` — external systems
- `Rel(from, to, "relationship label")` — directional arrow

If the C4 plugin isn't supported in the rendering environment, fall back to a simple `flowchart`:

```mermaid
flowchart LR
    user["👤 User"]
    admin["👤 Admin"]
    system["[System Name]<br/><i>What it does</i>"]
    crm["External CRM"]
    payments["Stripe"]
    llm["Anthropic Claude"]

    user --> system
    admin --> system
    system --> crm
    system --> payments
    system --> llm
```

## Level 2: Container diagram

Shows: the major components inside the system. A container is anything that runs as its own process — frontend, backend, database, worker, scheduler.

```mermaid
C4Container
    title Container Diagram - [System Name]

    Person(user, "User", "")

    System_Boundary(system, "System Name") {
        Container(web, "Web App", "Next.js 16, TypeScript", "Server-rendered UI; admin and user views")
        Container(api, "API", "Hono, TypeScript", "REST + MCP endpoints")
        Container(worker, "Background Worker", "Cloud Run", "Cron jobs, queue consumers")
        ContainerDb(db, "Postgres OLTP", "PostgreSQL 16 with RLS", "Operational data; multi-tenant")
        ContainerDb(warehouse, "BigQuery", "BigQuery", "Analytical store")
        Container(cache, "Cache", "Redis", "Session and query cache")
    }

    System_Ext(llm, "LLM API")

    Rel(user, web, "Uses")
    Rel(web, api, "Calls", "HTTPS / JSON")
    Rel(api, db, "Reads/writes")
    Rel(api, cache, "Reads/writes")
    Rel(api, llm, "Calls for AI features")
    Rel(worker, db, "Reads/writes")
    Rel(worker, warehouse, "ETL pipelines")
```

### Mermaid syntax notes for L2

- `Container(id, "label", "tech stack", "description")` — a runtime container
- `ContainerDb(id, ...)` — a database container (rendered as a cylinder)
- `ContainerQueue(id, ...)` — a queue or message broker
- `System_Boundary(id, "label") { ... }` — groups containers within a system

For systems too large for one diagram, split L2 by domain (e.g., one diagram per major bounded context).

## Level 3: Component diagram (selective use)

Use only for the 1-2 most complex containers — typically the API or the core service.

```mermaid
C4Component
    title Component Diagram - API Container

    Container(web, "Web App", "Next.js 16")

    Container_Boundary(api, "API") {
        Component(auth, "Auth Middleware", "JWT verification, tenant context propagation")
        Component(routes, "Route Handlers", "REST endpoints by domain")
        Component(mcp, "MCP Server", "Tools exposed to AI agents")
        Component(domain_hr, "HR Domain Service", "HR business logic")
        Component(domain_finance, "Finance Domain Service", "Finance business logic")
        Component(db_layer, "DB Layer", "Kysely query builder, connection pooling")
    }

    ContainerDb(db, "Postgres", "PostgreSQL 16")

    Rel(web, auth, "HTTPS")
    Rel(auth, routes, "Validated request with tenant context")
    Rel(routes, domain_hr, "Calls")
    Rel(routes, domain_finance, "Calls")
    Rel(routes, mcp, "Mounts")
    Rel(mcp, domain_hr, "Calls (read-only tools)")
    Rel(domain_hr, db_layer, "")
    Rel(domain_finance, db_layer, "")
    Rel(db_layer, db, "")
```

## Sequence diagrams for critical flows

C4 doesn't cover dynamic behavior. Add sequence diagrams for the 2-5 most critical flows.

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant API
    participant LLM
    participant DB

    User->>Web: Submits chat message
    Web->>API: POST /chat
    API->>DB: Load user + tenant context
    API->>LLM: Stream completion with context
    LLM-->>API: Streaming response
    API-->>Web: Server-sent events
    Web-->>User: Displays streamed response
    API->>DB: Persist conversation
```

## Data flow diagrams for pipelines

For analytical / data-platform archetypes, show how data moves.

```mermaid
flowchart LR
    subgraph Sources
        notion[Notion API]
        hubspot[HubSpot API]
    end

    subgraph Pipelines
        sync_notion[notion-bq-sync<br/>Cloud Function 03:00]
        sync_hs[hubspot-bq-sync<br/>Cloud Function 03:30]
        ico[ico-materialize<br/>Cloud Run Job 06:15]
    end

    subgraph Warehouse
        raw[(BigQuery raw_*)]
        conformed[(BigQuery conformed_*)]
        marts[(BigQuery marts_*)]
    end

    notion --> sync_notion --> raw
    hubspot --> sync_hs --> raw
    raw --> ico --> conformed --> marts
    marts --> dashboards[Dashboards / API]
```

## Deployment diagrams (when needed)

Show how containers map to infrastructure.

```mermaid
flowchart TB
    subgraph Vercel
        web_prod[Web App<br/>Next.js 16]
    end

    subgraph GCP
        subgraph cloudrun[Cloud Run]
            api[API<br/>Hono]
            worker[Background Worker]
        end
        subgraph cloudsql[Cloud SQL]
            db[(Postgres)]
        end
        bq[(BigQuery)]
    end

    subgraph External
        anthropic[Anthropic API]
        stripe[Stripe]
    end

    web_prod -->|HTTPS| api
    api --> db
    api --> anthropic
    api --> stripe
    worker --> db
    worker --> bq
```

## Skill behavior with C4 diagrams

When generating C4 diagrams:

1. **Always produce L1 and L2** for new design mode. L1 shows context; L2 shows the system internals.
2. **Use L3 sparingly** — only for the 1-2 most complex containers. Most systems don't need L3 in the spec.
3. **Use sequence diagrams** for the 2-5 most critical user-facing flows. They explain what static C4 can't.
4. **Use Mermaid by default**: it lives in the repo, renders in most tools, and is editable as text. Only suggest external tools (Structurizr, Lucidchart, draw.io) if the user explicitly asks for richer fidelity.
5. **Keep diagrams legible**: ~7-10 elements per diagram is the upper bound. More than that and you should split.
6. **Update diagrams as the architecture changes**: stale diagrams are worse than no diagrams. Treat them as living documentation, version-controlled with the code.
