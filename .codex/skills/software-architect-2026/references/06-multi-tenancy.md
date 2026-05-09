# Multi-Tenancy

This reference is loaded when the system serves multiple customer organizations from a shared codebase. Multi-tenancy is the dominant concern for B2B SaaS and any platform that hosts client workloads. Getting it right early is much cheaper than retrofitting later.

The core decision: how isolated do tenants need to be from each other, and at what cost?

## The three patterns

| Pattern | Isolation | Cost | Operational complexity | When to choose |
|---|---|---|---|---|
| **Pool (shared schema)** | Weakest | Lowest | Lowest | Many small tenants, low compliance requirements, cost-sensitive |
| **Bridge (schema-per-tenant)** | Medium | Medium | Medium | Mid-market customers with moderate compliance |
| **Silo (database-per-tenant)** | Strongest | Highest | Highest | Enterprise customers, strict regulatory requirements |

### Pool: shared schema with tenant_id

All tenants share the same tables. A `tenant_id` (or `organization_id`, `space_id`, etc.) column on every row marks ownership. Application or database-level controls enforce isolation.

**Pros**:
- Cheapest to operate: one database, one connection pool, one migration set, one backup strategy
- Scales to thousands or millions of tenants on a single DB
- Simplest analytics across all tenants

**Cons**:
- A single missed `WHERE tenant_id = ?` is a data leak
- Noisy-neighbor risk: one tenant's query can degrade others
- Schema changes affect everyone; you can't have one tenant on a slightly different version
- Tenant-level encryption is hard; everything shares the same encryption key

**Real-world**: most B2B SaaS at <5k tenants is pool. HubSpot, Slack at moderate scale, most consumer-facing SaaS use pool.

### Bridge: schema-per-tenant

Each tenant has its own PostgreSQL schema (or MySQL database) inside a shared database instance. Tables are duplicated across schemas; tenant context selects which schema to query (`SET search_path` in Postgres, or `USE database` in MySQL).

**Pros**:
- Cleaner isolation than pool: SQL queries can't accidentally cross tenants
- Different tenants can be on slightly different schema versions during rollouts
- Tenant deletion is simple (drop schema)
- Easier to back up or restore individual tenants

**Cons**:
- More schema objects to manage (every tenant has its own copy)
- Schema migrations are slower (apply N times) and need a coordinator
- Still shares the database engine; tenant load can affect others
- Cross-tenant queries (admin views, billing) require joins across schemas

**Real-world**: mid-market B2B SaaS where ~100-500 tenants is the order of magnitude. Many vertical SaaS use this pattern.

### Silo: database-per-tenant

Each tenant has its own database (or its own database server). Hard isolation at the engine level.

**Pros**:
- Strongest isolation: tenant data physically separated
- Can locate tenants in different regions for data residency
- Per-tenant performance: a runaway query only affects one tenant
- Per-tenant encryption keys, backup schedules, version control

**Cons**:
- Operational cost grows linearly with tenant count
- Schema migrations are expensive (one per tenant)
- Onboarding a new tenant requires database provisioning (slow, complex)
- Cross-tenant analytics requires aggregating from N databases

**Real-world**: enterprise SaaS with strict compliance (SOC 2 Type II, HIPAA, FINRA), or vertical SaaS where each customer is a large account.

## The tiered pattern (the 2026 maturity)

In practice, scaled SaaS platforms use **tiered isolation**: pool for the majority, bridge or silo for enterprise tenants who pay more and demand more isolation.

| Customer tier | Pattern | Trade-offs |
|---|---|---|
| Free / Basic | Pool | Lowest cost; tenant accepts shared infra |
| Professional / Growth | Pool with stricter quotas | Same infra; better resource isolation |
| Enterprise | Bridge or Silo | Higher price tier; tenant gets isolation |
| Regulated industries | Silo (often per region) | Highest price; data residency guarantees |

**Critical**: design the tier-graduation path from day one. Migrating a customer from pool to silo is a 1-2 month project per tenant if you didn't design for it.

The architectural pattern that enables tier-graduation:

1. The application code does not assume which pattern a tenant is on
2. A `tenant_routing` table (or service) maps `tenant_id` → connection string / schema name
3. Middleware reads `tenant_id` from auth, looks up routing, sets the connection or `search_path` for the request
4. Adding a tenant to a new tier means: provision the new infra, copy data, update routing — without touching application code

This is overhead at first, but it converts a one-way decision (the multi-tenancy pattern) into a two-way decision (per-tenant tier).

## Tenant context: where it lives and how it propagates

Tenant context is the single most important piece of state in a multi-tenant system. A bug here is a data leak. Patterns that work:

### JWT-based tenant context

The tenant_id is a claim in the JWT issued at login. Every request has the JWT in `Authorization`. Middleware extracts the tenant_id and either:

1. Sets it on a request-local context object, OR
2. Sets a session variable in Postgres for RLS to use

This is the default for most modern B2B SaaS.

**JWT structure**:
```json
{
  "sub": "user_abc",
  "tenant_id": "tenant_xyz",
  "tenant_slug": "acme-corp",
  "roles": ["admin", "billing"],
  "permissions": ["users:read", "orders:write"],
  "exp": 1750000000
}
```

### Tenant from URL / subdomain

Each tenant has its own subdomain or URL path: `acme.app.com` or `app.com/acme`. Middleware reads the subdomain/path, validates the user has access, and applies the tenant context.

Combines with JWT — JWT has the user; URL has the tenant; middleware verifies the match.

### Session-based tenant context

Web app tracks tenant context in the session cookie. Common in single-page apps with traditional session auth.

## Postgres Row-Level Security (RLS): the safety net

RLS is the database-level enforcement that no row leaks across tenants. The pattern:

```sql
-- Enable RLS on every tenant-scoped table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Define a policy that filters by current tenant
CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Application sets the session variable per request
SET app.current_tenant = 'tenant-uuid-here';
```

**Critical gotchas**:
- Enabling RLS without creating policies **silently blocks all rows** (everyone sees nothing)
- Policies must be enabled for every role that queries the table (including the application's role)
- The `BYPASSRLS` attribute on a role disables RLS — admin/migration roles that have this can leak across tenants
- `current_setting` returns empty string if unset; cast to UUID will fail (good — fail closed)
- Test with a non-superuser role; superuser bypasses RLS by default

**Best practice**: every tenant-scoped table has RLS enabled with a policy. The application sets `app.current_tenant` on every transaction. Migrations run as a role with `BYPASSRLS`. Every other operational role has RLS active.

**Test for tenant leakage** in CI:
- Create two test tenants
- Create rows for each
- Authenticate as user-of-tenant-A and try to query rows of tenant-B
- Assert: zero rows returned, no error
- Also try a `tenant_id=NULL` query: should fail or return empty

## Noisy neighbor mitigation

In pool and bridge patterns, one tenant can degrade others. Mitigations:

- **Per-tenant rate limits** at the API gateway: cap RPS per tenant
- **Per-tenant query timeouts**: kill long-running queries for a single tenant before they exhaust connections
- **Per-tenant connection pool quotas**: PgBouncer per-database pool limits
- **Per-tenant cost tracking**: Datadog/Honeycomb tags per tenant for visibility into spend
- **Background job queues per tenant**: a slow tenant doesn't block fast ones
- **Read replicas for analytical queries**: large queries hit replicas, not the primary

## Tenant lifecycle: onboarding, suspension, deletion

The lifecycle of a tenant is part of the architecture. Design for it.

### Onboarding (provisioning)

- Pool: insert a row in `tenants` table; assign default roles to the user; seed any default data
- Bridge: create the schema; run all migrations against the new schema; insert tenant routing
- Silo: provision the database; run migrations; configure backups; insert tenant routing

In bridge and silo, onboarding is async (it takes minutes). The user gets "your workspace is being set up" UX. Have a way to track and recover failed provisioning.

### Suspension (e.g., non-payment)

- Don't delete data — most jurisdictions require retention windows
- Block writes via a `tenant.status = 'suspended'` flag, checked in middleware before any write operation
- Reads may still be allowed (export your data) or blocked, depending on policy

### Deletion

- Hard delete vs soft delete vs export-then-delete
- GDPR / regional law may require hard delete on request, with audit trail of the deletion
- Bridge / silo deletion is simpler (drop schema or DB); pool deletion requires careful cascading deletes
- Be ready for legal hold — sometimes deletion is contractually deferred

## Migration paths between tiers

When customer X graduates from pool to silo, the steps:

1. **Provision new infra** (silo DB or schema)
2. **Take a consistent snapshot** of tenant X's data (Postgres logical replication or pg_dump with snapshot)
3. **Restore into new infra**
4. **Update tenant routing** to point tenant X to new infra
5. **Run a verification query** to ensure no data missed
6. **Clean up** old data from pool DB (after confirmation period)

The painful part is consistency during the cutover — writes happening during step 2-4. Options:

- **Read-only window**: tenant is read-only for 5-30 minutes during cutover. Acceptable for most B2B contexts.
- **Dual-write window**: writes go to both old and new during cutover; cut over reads when caught up. More complex; usually unnecessary.

## Audit logging

Multi-tenant systems need per-tenant audit logs:

- Who did what when, with what tenant context
- Tenant ID is part of every audit log entry
- Audit log isolation: tenant X cannot read tenant Y's audit log (except for super-admins)
- Retention: typically 1-7 years depending on industry

Pattern: a single `audit_log` table with RLS policies. Or a separate audit DB if compliance demands write-once storage.

## Common multi-tenant anti-patterns

- **Trusting application-layer filtering only** — works until a developer forgets a `WHERE` clause. Use RLS as a backstop.
- **Assuming tenant_id is always present** — middleware bug = no tenant context = `current_setting` returns empty = some queries return ALL tenants. Test for this.
- **Cross-tenant features built quickly without thinking** — admin views, "all-tenant" reports, support tooling. These often need to bypass RLS, which means they need their own audit and access controls.
- **Migrating one tenant breaks others** — schema migration on a single tenant in bridge/silo accidentally runs against shared resources.
- **Pricing tiers don't match the architecture** — the marketing team sells "dedicated infrastructure" while the architecture is pool with quotas.
- **Custom code per tenant** — every white-labeled feature is a per-tenant fork. The system becomes unmaintainable. Use feature flags + theming, not branches.
- **No noisy-neighbor controls** — one tenant's query brings down all others.
- **No tenant-aware observability** — you can't see whose load is causing the problem.

## What to put in the architecture spec for multi-tenancy

When designing a multi-tenant system, the spec must answer:

- [ ] **Tenancy pattern**: pool / bridge / silo / tiered
- [ ] **If tiered**: what tier corresponds to what isolation, and what are the graduation triggers?
- [ ] **Tenant context propagation**: JWT claims, URL routing, middleware contract
- [ ] **Database-level isolation**: RLS policies (even when the app filters); coverage tested
- [ ] **Noisy-neighbor controls**: rate limits, query timeouts, connection pool quotas
- [ ] **Per-tenant observability**: tenant_id propagated to OTel via baggage; per-tenant dashboards
- [ ] **Onboarding flow**: who triggers it, what happens, recovery from failure
- [ ] **Suspension and deletion policies**: with retention requirements
- [ ] **Audit logging**: per-tenant, queryable, retained
- [ ] **Tier-migration runbook**: how does a tenant move between tiers, and how is consistency maintained?
- [ ] **Cross-tenant operations**: admin views, support tooling — how do they bypass RLS, and how are those operations audited?
