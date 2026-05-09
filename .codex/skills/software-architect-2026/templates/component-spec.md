# Component Spec: [Component Name]

> Used to hand off a designed component to an implementation agent (Claude Code, Codex) or to a human engineer. The architectural decisions are settled; this document tells the implementer **what to build** with enough precision that they don't re-design while building.
>
> One component spec per substantial component. For Efeonce, this maps cleanly to a TASK doc (see `efeonce-overlay/handoff-to-task.md` for conversion).

## Metadata

- **Component**: [name]
- **Belongs to system**: [system name; link to architecture spec]
- **Author (architect)**: [name]
- **Status**: `Specified` | `In implementation` | `Built`
- **Created**: YYYY-MM-DD
- **Implementation owner**: [agent / engineer / team]

## 1. Purpose

> One paragraph: what this component does, why it exists, what it makes possible. If you can't write this without referencing implementation details, the purpose isn't clear yet.

## 2. Boundaries (what this component is and isn't)

### Scope (this component does)
- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

### Out of scope (this component does NOT)
- [Things explicitly handled elsewhere — name where]
- [Things deferred to a future iteration]

## 3. Inputs and outputs

### Inputs

| Input | Source | Shape | Notes |
|---|---|---|---|
| [Name] | [Where it comes from — HTTP request, queue message, scheduled trigger] | [Type / schema] | [Validation rules, edge cases] |

### Outputs

| Output | Destination | Shape | Notes |
|---|---|---|---|
| [Name] | [Where it goes — HTTP response, DB write, queue message, side effect] | [Type / schema] | [Idempotency, retries] |

## 4. External dependencies

| Dependency | Purpose | How to call | Failure handling |
|---|---|---|---|
| [Service / library] | [What it provides] | [Client lib, API endpoint] | [Retry, circuit-break, fallback] |

## 5. Data model (if applicable)

### Tables / collections this component owns

> Schema definitions or links to migration files. New tables get full schema here; modifications to existing tables get the diff.

```sql
-- Example
CREATE TABLE component_things (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- ... fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policy if multi-tenant
ALTER TABLE component_things ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON component_things
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Tables this component reads (but doesn't own)

- `[table name]` — owned by `[other component]` — read for `[purpose]`

## 6. API surface (if applicable)

### Endpoints

| Method | Path | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/things` | List things for current tenant | JWT | Query: `?cursor=xxx&limit=20` | `{items: Thing[], nextCursor: string}` |
| POST | `/api/things` | Create a thing | JWT | `{name, ...}` | `{id, ...}` |
| GET | `/api/things/:id` | Get one thing | JWT | — | `Thing` |

### MCP tools exposed (if applicable)

| Tool name | Purpose | Inputs | Outputs |
|---|---|---|---|
| `[tool_name]` | [What it does] | [Schema] | [Schema] |

## 7. Behavior (the core logic)

> The interesting part. How does this component decide what to do?
>
> Use prose, pseudocode, or sequence diagrams as appropriate. Be precise about edge cases — these are what implementations get wrong without explicit guidance.

### Happy path

[Describe the main flow]

### Edge cases and how to handle them

| Edge case | Behavior |
|---|---|
| [Empty input] | [What to return / do] |
| [Concurrent modification] | [Lock strategy or last-write-wins or version check] |
| [Missing required reference] | [Error type, status code] |
| [Tenant suspended] | [Reject with specific error] |

### Idempotency contract

> If this component is called more than once with the same inputs, what happens?

[Describe — e.g., "POST is idempotent via `Idempotency-Key` header; same key returns the original result without side effects."]

## 8. Non-functional requirements

| Requirement | Target | How measured |
|---|---|---|
| Latency (p95) | < 200ms | OTel span duration |
| Throughput | 100 RPS sustained | Load test |
| Availability | 99.9% monthly | Synthetic monitor |
| Tenant isolation | No cross-tenant reads | CI test |
| Cost ceiling | < $X/month at expected scale | Datadog cost tags |

## 9. Observability

What this component instruments:

- **Spans**: [list of operations that get their own span]
- **Metrics** (counters, histograms): [list]
- **Logs** (structured, INFO+): [event names]
- **Custom attributes** on every span: `tenant.id`, `user.id`, [others]
- **AI-specific** (if applicable): LLM calls traced via [Langfuse / LangSmith]

## 10. Security considerations

> Pull from the threat model — what threats apply specifically to this component?

- [Threat] → [mitigation in this component]
- [Threat] → [mitigation]
- [Tenant data isolation] → [RLS policy + CI test]

## 11. Testing strategy

### Unit tests
- [What gets unit tested]

### Integration tests
- [Critical paths to cover]
- [Cross-tenant isolation tests]
- [Failure mode tests — DB unavailable, external API down]

### Load tests (if performance-critical)
- [Scenario]: [target]

### AI evals (if applicable)
- [Eval name and what it covers]

## 12. Deployment and rollout

- **Migration order**: [if this requires DB migrations or coordinated deploys]
- **Feature flag**: [name, default state]
- **Rollback plan**: [how to disable / revert]
- **Backfill needs** (if any): [data backfill required for this component to function]

## 13. Open questions

- [ ] [Question that needs resolution before / during implementation] — owner: [name]

## 14. References

- Architecture spec: [link]
- Related ADRs: [list]
- External docs: [vendor docs informing this design]

---

## Skill behavior when generating a component spec

1. **One component per spec.** If the spec describes 3 services, split into 3 specs.
2. **Match the level of detail to the implementer.** An agent (Claude Code, Codex) needs more precision than a senior engineer who already knows the codebase.
3. **Behavior section is the differentiator.** Everything else can be skimmed; the Behavior section is where the implementer learns what's actually special.
4. **Edge cases are mandatory.** A spec without explicit edge cases will produce buggy implementations. Force the architect to enumerate.
5. **Cross-link to the architecture spec.** The component is a node in a larger graph; the implementer needs to see the graph.
6. **For Efeonce**: convert this template to TASK_TEMPLATE_v2 format on handoff. See `efeonce-overlay/handoff-to-task.md`.
