# Pre-design gate

Run before generating architecture artifacts. Apply proportionally: record each relevant item as `pass | gap | deferred | N/A`, with evidence or rationale. A `gap` in a blocking item stops design; a deferred item needs owner, date, and consequence.

## 1. Frame the decision — blocking

- [ ] State the user/business problem without embedding a solution.
- [ ] Name users, critical journeys, success outcomes, scope, and non-goals.
- [ ] Identify decision owner, affected operators/teams, reviewers, and deadline/trigger.
- [ ] Classify the mode and primary/secondary archetypes.
- [ ] Identify one-way doors and the evidence needed before committing.

## 2. Constraints and evidence — blocking when material

- [ ] Classify hard, soft, and aspirational constraints; include budget and team capacity.
- [ ] Quantify 12-month demand, data, peak rate, geography, growth, and uncertainty to useful orders of magnitude.
- [ ] Inventory existing systems, sources of truth, owners, integrations, reuse candidates, and active migrations.
- [ ] Identify applicable legal, contractual, privacy, residency, accessibility, safety, and audit obligations.
- [ ] Classify data and identify retention/deletion requirements.
- [ ] Validate time-sensitive stack/vendor/version/pricing claims per `references/12-research-protocol.md`; attach source and date.

## 3. Quality and operability — proportional

- [ ] Classify workload criticality and impact of wrong result, outage, data loss, and delayed recovery.
- [ ] Draft measurable quality scenarios for correctness, reliability, performance, security, accessibility, cost, and sustainability where relevant.
- [ ] Identify critical dependencies, correlated failure domains, likely capacity cliffs, RTO/RPO appetite, and minimum viable degraded service.
- [ ] Identify the owner/support model and whether an existing platform/golden path can satisfy the need.
- [ ] Choose a useful unit for cost/value; set a budget range if spend can change the design.
- [ ] Identify supply-chain assurance and provenance expectations proportional to risk.

## 4. Boundaries and distributed contracts — conditional blocking

If the design crosses a process, datastore, trust, tenant, vendor, or team boundary:

- [ ] Name capability owners, source of truth, invariant owner, and justification for distribution.
- [ ] Choose sync API, async command, event, webhook, or data product by required semantics.
- [ ] Define acceptable consistency, delivery, ordering, idempotency, replay, and uncertain-outcome behavior.
- [ ] Define identity/authorization and tenant propagation at each trust boundary.
- [ ] Identify schema compatibility, deprecation, reconciliation, and consumer ownership.

## 5. Specialized conditional gates

- [ ] **Multi-tenant:** isolation tier, cross-tenant capabilities, noisy-neighbor controls, and graduation path are understood.
- [ ] **AI/agents:** purpose, autonomy, eval strategy, human control, data exposure, and cost ceiling are understood; run `ai-feature.md`.
- [ ] **Migration:** current state, coexistence, data movement, rollback, and retirement constraints are known.
- [ ] **Critical/regulated:** security, privacy, compliance, DR/BCP, and independent review roles are identified.

## Exit rule

Proceed only when the problem, hard constraints, criticality, sources of truth, and one-way decisions are understood. Ask targeted questions for blocking gaps. Carry non-blocking uncertainty into the artifact as an assumption with validation owner and trigger; never silently guess.
