# Pre-Build Checklist

> Run before handing off the design to an implementation agent (Claude Code, Codex) or to engineers. The goal: ensure the design is precise enough to be implemented without re-design, and that the implementer has what they need.

## Architecture artifacts complete

- [ ] **Architecture spec** exists with the system's overall design (templates/architecture-spec.md)
- [ ] **C4 L1 + L2 diagrams** present and current
- [ ] **C4 L3 diagrams** for the 1-2 most complex containers (if needed)
- [ ] **Sequence diagrams** for the 2-5 most critical flows
- [ ] **Data model** documented: schemas, ownership, RLS policies for multi-tenant tables
- [ ] **API surface** defined: endpoints, methods, auth, request/response shapes

## Decisions documented

- [ ] **All major decisions captured as ADRs** with confidence and reversibility levels
- [ ] **Stack choices linked to ADRs** in the architecture spec
- [ ] **Trade-off matrices** included for the non-obvious choices
- [ ] **Open questions list** explicit; each has an owner and target resolution date

## Component specs

- [ ] **One spec per substantive component** to be built
- [ ] **Each spec covers**: purpose, scope/non-goals, inputs/outputs, behavior, edge cases, data model, API surface, NFRs, observability, security, testing
- [ ] **Edge cases enumerated** in each spec — not "TBD"
- [ ] **Idempotency contracts** explicit for any component that can be retried

## Conventions and guardrails

- [ ] **Repo conventions documented** (CONSTITUTION or equivalent) and the agent will load them
- [ ] **Naming conventions** clear (file structure, IDs, variable patterns)
- [ ] **Error handling patterns** consistent and documented
- [ ] **Test patterns** documented (unit, integration, E2E)
- [ ] **Reuse-before-create reminders** explicit in the spec for shared concerns (DB layer, auth, caching)

## Security verified

- [ ] **Threat model** done for new system or substantively changed feature
- [ ] **AuthN/Z model** specified (RBAC scopes, tenant context, JWT structure)
- [ ] **Data classification** applied: what's PII / restricted / confidential
- [ ] **Encryption** specified at rest, in transit, field-level for restricted data
- [ ] **Secrets management** specified — where they live, how rotated
- [ ] **Audit logging** specified — what events, retention, access
- [ ] **For AI features**: prompt injection mitigations, sandboxing, scope review

## Multi-tenancy verified (if applicable)

- [ ] **Tenant context propagation** specified (middleware, JWT claims, baggage)
- [ ] **RLS policies** specified for every tenant-scoped table
- [ ] **Cross-tenant operations** identified (admin views, reports) with their own access controls
- [ ] **Noisy-neighbor controls** specified (rate limits, query timeouts, pool quotas)
- [ ] **Tier-graduation path** specified if tiered isolation

## Observability planned

- [ ] **OTel instrumentation strategy** specified
- [ ] **Tenant ID propagation** via baggage if multi-tenant
- [ ] **SLOs** defined for critical endpoints / workflows
- [ ] **Alert hierarchy** defined: pages vs tickets vs dashboards
- [ ] **AI-specific observability** specified (Langfuse / LangSmith / equivalent)
- [ ] **Cost observability** specified (per service, per tenant, per AI workflow)

## Cost ceilings (if cost-significant)

- [ ] **Estimated monthly cost** documented with assumptions
- [ ] **Cost ceiling alerts** specified at thresholds (50%, 80%, 100%)
- [ ] **Per-AI-workflow cost ceiling** with kill-switch behavior
- [ ] **Validated-as-of** date on pricing assumptions

## Migration plan (if applicable)

- [ ] **Current state diagram** exists
- [ ] **Target state diagram** exists
- [ ] **Migration approach** specified (strangler / branch by abstraction / dual-write)
- [ ] **Phase-by-phase rollback plan** for each step
- [ ] **Verification criteria** per phase: what proves the new path works
- [ ] **Communication plan** for affected users

## Dependencies and sequencing

- [ ] **Build order** specified: which components or migrations come first
- [ ] **Blocking dependencies** identified (database migrations, infra setup, third-party integrations)
- [ ] **Parallel work streams** identified where possible
- [ ] **Critical path** clear

## Implementation owner has what they need

- [ ] **Clear acceptance criteria** per component (Given/When/Then if Efeonce-style)
- [ ] **Scope explicitly bounded** — implementer doesn't need to make architectural decisions
- [ ] **Test strategy** documented so implementer knows what proves "done"
- [ ] **Rollout / deployment instructions** specified

## Handoff communication

- [ ] **Implementation agent or engineer briefed** on the spec
- [ ] **Questions surfaced and answered** before implementation starts (or marked as `[NEEDS CLARIFICATION]`)
- [ ] **Reviewers identified** for the implementation PR
- [ ] **Architect available** for clarification during implementation (not "throw it over the wall")

## Self-critique done (Step 6)

- [ ] **Cognitive debt risk** assessed (per `references/10-cognitive-debt.md`)
- [ ] **Reversibility** flagged for any one-way decisions
- [ ] **Vendor lock-in** identified and acknowledged
- [ ] **AI-specific risks** flagged (prompt injection, autonomy mismatch, cost runaway)
- [ ] **Compliance gaps** flagged (especially LATAM if applicable)
- [ ] **What breaks at next scale level** documented
- [ ] **What breaks in 36 months** documented

---

## What to do with unchecked items

- **For Architecture artifacts / Component specs gaps**: the design isn't ready to hand off. Complete the spec.
- **For Conventions gaps**: write them down before the agent starts. Agents follow conventions they see; if they don't see them, they invent.
- **For Security / observability / cost gaps**: these should never be punted to implementation phase. The implementer will skip them. Get them in the spec.
- **For Open questions** still open: don't pretend they're resolved. Mark `[NEEDS CLARIFICATION]` and resolve before implementation goes deep.

A spec that fails this checklist will produce an implementation that requires re-work. Better to take an extra day completing the spec than to take an extra month re-implementing.
