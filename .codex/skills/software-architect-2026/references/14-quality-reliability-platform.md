# Quality, reliability, and platform operating model

Use this reference to turn non-functional aspirations into owned, testable workload obligations. It is provider-neutral: cloud Well-Architected frameworks are evidence inputs, not a requirement to adopt a vendor.

## Table of contents

- [Proportional assessment](#proportional-assessment)
- [Neutral Well-Architected lens](#neutral-well-architected-lens)
- [Quality scenarios and fitness functions](#quality-scenarios-and-fitness-functions)
- [Reliability and SRE](#reliability-and-sre)
- [Resilience patterns](#resilience-patterns)
- [DR and business continuity](#dr-and-business-continuity)
- [Operational excellence](#operational-excellence)
- [Platform engineering](#platform-engineering)
- [FinOps and unit economics](#finops-and-unit-economics)
- [Sustainability](#sustainability)
- [Software supply chain](#software-supply-chain)
- [Architecture output](#architecture-output)
- [Official sources](#official-sources)

## Proportional assessment

Classify workload criticality before prescribing controls:

| Class | Typical impact | Evidence expected |
|---|---|---|
| Experimental | Disposable, no material user/data impact | owner, cost/time limit, teardown, no-production-data rule |
| Standard | Recoverable business impact | SLOs, backups, rollback, telemetry, dependency and security review |
| Critical | Material revenue, safety, legal, contractual, or broad customer impact | quantified resilience/DR, tested failover/restore, on-call, capacity evidence, supply-chain controls |

Criticality is not traffic volume. A low-volume payroll or signing workflow may be critical. Apply each control as `required | deferred with owner/date | not applicable with rationale`. Avoid cargo-cult redundancy whose operational complexity exceeds the risk it removes.

## Neutral Well-Architected lens

Synthesize the common cloud frameworks into seven questions:

1. **Functional suitability and quality:** does the workload produce correct, accessible outcomes for its users?
2. **Security and privacy:** are identities, data, software, and operations protected across their lifecycle?
3. **Reliability:** can it meet availability, durability, and recovery objectives under realistic failures?
4. **Performance efficiency:** does it meet latency/throughput goals across expected and stressed demand?
5. **Operational excellence:** can a team safely deploy, observe, support, change, and retire it?
6. **Cost/value:** are unit economics, budgets, allocation, and value trade-offs explicit?
7. **Sustainability:** can useful work be delivered with less energy, carbon, water, and hardware impact where measurable?

For each relevant lens, capture requirement, current evidence, trade-off, residual risk, owner, and review trigger. Do not average pillar scores: one catastrophic gap is not canceled by six strong areas.

## Quality scenarios and fitness functions

Translate each important quality attribute into a scenario:

`source/stimulus → environment → component/workflow → expected response → measurable response bound`

Example: “When a zonal dependency becomes unavailable during peak load, already accepted writes remain durable and 99% of eligible requests recover within the agreed RTO without duplicate effects.”

Attach a fitness function where practical: contract test, load threshold, policy check, recovery exercise, static analysis, synthetic journey, or cost/carbon budget. State measurement location and exclusions. Resolve trade-offs explicitly—consistency versus availability, isolation versus cost, freshness versus energy, security versus operability—not through vague “best practice.”

## Reliability and SRE

Define user-centered SLIs/SLOs and an error-budget policy. Include correctness, durability, and freshness when availability alone can lie. Set targets from business impact and user need, not current performance or an arbitrary number of nines.

For every critical dependency and state store, record:

- owner, contract/SLO, failure and degradation behavior;
- timeout budget, bounded retries, overload and backpressure policy;
- capacity limit, scaling lag, quota and exhaustion behavior;
- data-loss modes, reconciliation source, and recovery procedure;
- correlated-failure risks (region, control plane, identity, DNS, vendor, human process);
- observability and a game-day hypothesis.

Use redundancy only across genuinely independent failure domains. Replication is not backup, and backup is not proven recovery.

## Resilience patterns

Select patterns by failure mode:

- deadlines and timeouts derived from the end-to-end latency budget;
- retries only for transient, safe/idempotent operations, with exponential backoff and jitter;
- idempotency keys and deduplication for retried commands;
- circuit breaking, concurrency limits, load shedding, and backpressure to contain overload;
- bulkheads to limit blast radius by dependency, tenant, or workload class;
- durable queues/outbox-inbox patterns where temporal decoupling is worth eventual consistency;
- graceful degradation with explicit stale/partial behavior;
- reconciliation for uncertain outcomes and duplicated, delayed, or reordered delivery.

Specify the behavior, not merely the pattern name. Every fallback introduces a dependency and must be tested.

## DR and business continuity

Start with a business impact analysis. For each critical business service define:

- maximum tolerable disruption and minimum viable service;
- **RTO** (time to restore acceptable service) and **RPO** (maximum tolerable data loss/time gap);
- dependencies, data consistency groups, restoration order, and manual workarounds;
- crisis authority, communications, alternate access, and vendor/contact paths.

Map business continuity to technical recovery tiers. Document declared disaster, failover, failback, reconciliation, security controls during emergency access, and exit criteria. Encrypt and isolate backups, protect deletion paths, verify retention, and run restoration tests against representative data. Exercise people and communication as well as infrastructure; record achieved RTO/RPO, gaps, owners, and retest date.

## Operational excellence

Require a named workload owner and service catalog entry proportional to criticality. The operating contract covers:

- deploy, rollback/roll-forward, migration, and configuration/secret changes;
- on-call or support window, escalation, incident command, customer communication, and status updates;
- observability, SLO/error-budget review, capacity and dependency review;
- runbooks for high-impact and likely failure modes;
- blameless learning with tracked corrective actions;
- lifecycle, patching, deprecation, data retention, and retirement.

Prefer small, reversible changes; progressive delivery is useful only when health signals and abort behavior are trustworthy.

## Platform engineering

Create a platform capability only when repeated product-team demand justifies a maintained product. Define internal users, jobs-to-be-done, service level, adoption signal, owner, roadmap, support, and retirement path.

Provide self-service golden paths through stable APIs/templates with secure defaults and policy guardrails. Allow justified escape hatches and feed exceptions into product discovery. Measure developer outcomes—time to first deploy, lead time, cognitive load, reliability, adoption, support burden—not portal activity. Avoid building an internal platform as a tool inventory or central ticket queue.

## FinOps and unit economics

Treat FinOps as collaborative technology-value management across engineering, finance, product, and leadership. For the workload:

- model fixed, variable, step-function, support, licensing, data-egress, and exit costs;
- allocate spend with durable ownership metadata; document shared-cost rules;
- select a business unit (tenant, transaction, document, inference, active account) and track cost per useful unit;
- establish budget, forecast range, anomaly threshold, and accountable response;
- test price/volume sensitivity and quota exhaustion;
- revisit placement, commitments, and architecture when demand, pricing, or value changes.

Cost optimization must preserve required quality and security. “Cheapest” without workload value and risk is not FinOps.

## Sustainability

First reduce unnecessary work: idle resources, over-retention, duplicate transfer, over-provisioning, inefficient models/queries, and unused environments. Then consider carbon-aware time/location shifting only when latency, residency, reliability, and energy-source evidence permit it.

Choose a functional unit and system boundary. Measure operational and embodied impact when data quality supports it; disclose estimates and uncertainty. The Software Carbon Intensity method (`SCI = (E × I + M) / R`) can provide an intensity metric, but it does not replace organizational greenhouse-gas accounting. Never infer sustainability from cost alone.

## Software supply chain

Apply risk-based secure development across source, build, dependencies, artifacts, deployment, and response:

- protected source control, reviewed changes, least-privilege automation, isolated builds;
- dependency inventory/SBOM, provenance, license and vulnerability policy;
- reproducible or hermetic builds where risk warrants; immutable artifact identity;
- sign/attest and verify at promotion/deployment boundaries;
- pin and govern third-party actions, builders, base images, registries, and package sources;
- patch/remediation owner, disclosure path, revocation and emergency rebuild capability;
- preserve evidence linking source, build inputs, tests, approvals, artifact, and runtime.

Use NIST SSDF as the lifecycle vocabulary and SLSA as an incremental supply-chain assurance model. Select an assurance target from threat and impact; do not claim a level without evidence.

## Architecture output

Produce a compact quality and operability appendix containing:

1. criticality and quality scenarios;
2. SLOs, error-budget policy, capacity assumptions, and dependency map;
3. failure-mode table with detection, containment, recovery, and residual risk;
4. RTO/RPO, recovery topology, restoration order, and exercise cadence;
5. operating ownership, runbooks, release/rollback and incident model;
6. platform reuse/new-capability decision;
7. cost/unit-economics and sustainability boundaries;
8. supply-chain assurance target and evidence;
9. deferred gaps with owner, due date, and launch impact.

## Official sources

Validated 2026-07-22:

- [AWS Well-Architected pillars](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html)
- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/what-is-well-architected-framework)
- [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework)
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [NIST SP 800-34 Rev. 1: Contingency Planning](https://csrc.nist.gov/pubs/sp/800/34/r1/final)
- [CNCF Platform Engineering TCG](https://contribute.cncf.io/community/tcgs/platform-engineering/)
- [CNCF Platforms for Cloud Native Computing](https://www.cncf.io/blog/2023/04/11/announcing-a-white-paper-on-platforms-for-cloud-native-computing/)
- [FinOps Framework 2026](https://www.finops.org/framework/)
- [ISO/IEC 21031:2024 Software Carbon Intensity](https://www.iso.org/standard/86612.html)
- [NIST SP 800-218 SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- [SLSA specification v1.2](https://slsa.dev/spec/v1.2/)
