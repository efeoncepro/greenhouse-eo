# Cost and unit-economics modeling

Produce a rough order-of-magnitude decision model, not a quote. Never embed durable vendor prices, model names, or generic monthly ranges in architecture guidance.

## Contents

1. Define the unit of value
2. Build the demand model
3. Decompose cost
4. Model uncertainty and failure
5. Connect cost to architecture
6. Evidence and controls

## 1. Define the unit of value

Choose the unit that connects technical consumption to a useful outcome:

- active tenant/month;
- completed transaction, document, workflow, or successful agent outcome;
- GB ingested/stored/served;
- build, deployment, environment, or recovery exercise;
- request only when requests themselves represent value.

For AI, include unsuccessful runs, retries, retrieval, tools, sandbox/compute, evals, and human review. Track `cost per successful outcome`, not tokens alone.

## 2. Build the demand model

Document P50, P90, and credible worst-case assumptions:

| Driver | Inputs |
|---|---|
| Users/tenants | active count, concurrency, geography, tier mix |
| Requests/jobs/events | volume, burst, payload, duration, retries, fan-out |
| Data | ingest, retained size, growth, replicas, backup, query scan, egress |
| AI | attempts, turns, input/output, cache, tools, retrieval, eval sampling |
| Delivery | builds, artifacts, environments, test/runtime minutes |
| Operations | licenses, support, on-call, incident/recovery labor |

Make formulas visible. A reviewer must be able to change an assumption and reproduce the result.

## 3. Decompose cost

Model at least:

- compute: provisioned, request-based, accelerators, idle floor, burst;
- storage: operational, analytical, object, indexes, backups, logs/traces;
- network: ingress/egress, inter-zone/region, CDN, third-party transfer;
- managed services and licenses;
- AI/model/retrieval/tool/human-review consumption;
- observability and security retention/scanning;
- delivery/build environments;
- people and operating burden when it changes the option ranking.

Separate rate optimization from usage optimization. A discount does not fix waste; an efficient design does not remove contractual minimums.

## 4. Model uncertainty and failure

Use ranges and sensitivity analysis rather than false precision. Include:

- growth and traffic bursts;
- retry storms, duplicate delivery, cache miss, replay/backfill, and incident traffic;
- logging/cardinality mistakes;
- minimum capacity and multi-region/DR standby;
- price, currency, tax, and commitment changes;
- migration coexistence and decommissioning delay;
- abuse, adversarial input, or runaway agent loops.

Identify the two or three variables that dominate cost. Define a threshold and action for each.

## 5. Connect cost to architecture

For each alternative show:

- fixed floor and variable curve;
- unit economics by relevant tenant/tier/outcome;
- shared-cost allocation method;
- failure/recovery and migration cost;
- operational capacity required;
- lock-in and exit cost;
- value or quality attribute gained for the additional spend.

Do not optimize cost in isolation. Redundancy can buy reliability; isolation can buy security; observability can shorten incidents. State the trade-off and the business owner accepting it.

## 6. Evidence and controls

Before using any number:

1. Verify the official pricing/billing source and region/currency as of the decision date.
2. Confirm tiers, minimums, included usage, quotas, egress, support, and taxes.
3. Prefer a billing export or representative measurement over a calculator estimate when available.
4. Record source, date, assumptions, and confidence.
5. Define budgets, anomaly detection, allocation tags/labels, forecast owner, and degradation/kill policy.
6. Reconcile estimates against actuals after launch and update the decision model.

Use `templates/cost-estimate.md` and the FinOps section of `14-quality-reliability-platform.md`. Use FOCUS-compatible billing data when available, but do not make FOCUS adoption a prerequisite for a useful model.

## Exit checks

- [ ] Unit of value and business owner are explicit.
- [ ] P50/P90/worst-case demand and formulas are reproducible.
- [ ] Fixed, variable, shared, recovery, and people costs are considered.
- [ ] All prices are sourced and dated at use time.
- [ ] Sensitivity, ceilings, anomalies, and action owners are defined.
- [ ] Post-launch estimate-versus-actual review is scheduled.
