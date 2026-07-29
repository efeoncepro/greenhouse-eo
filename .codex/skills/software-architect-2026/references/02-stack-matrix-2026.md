# Technology option matrix

Use this reference to generate and narrow options. Do not treat it as a catalog of current versions, prices, models, or vendor capabilities. The filename remains for compatibility.

## Start with workload evidence

Before naming technology, capture:

- workload shape: request, batch, stream, interactive, offline, analytical, or agentic;
- scale envelope and growth assumptions;
- quality scenarios and critical user journeys;
- data classification, residency, retention, consistency, and recovery needs;
- team skills, on-call capacity, delivery deadline, and budget ceiling;
- existing platform capabilities and constraints;
- exit cost and acceptable vendor coupling.

If these are unknown, present conditional options rather than a definitive stack.

## Compare by decision area

| Area | Drivers to compare | Evidence to obtain before deciding |
|---|---|---|
| Runtime/language | team fluency, ecosystem, latency, concurrency, safety, lifecycle | supported releases, EOL, benchmarks matching workload, hiring/ownership |
| Application shape | modularity, deployment independence, failure isolation, coordination cost | domain boundaries, team topology, change coupling, incident history |
| Web/mobile | rendering, offline, accessibility, release cycle, device integration | stable framework/runtime status, compatibility, bundle/runtime measurements |
| Compute | execution duration, burstiness, state, isolation, portability | regional availability, quotas, cold/warm behavior, unit cost, operational load |
| OLTP | consistency, transactions, query shape, tenancy, recovery | version/support, restore drill, throughput/latency test, migration path |
| Analytics | freshness, query shape, volume, concurrency, governance | scan/compute pricing, lineage, quality, semantic ownership, representative queries |
| Messaging | delivery semantics, ordering, throughput, replay, backpressure | service limits, failure/replay test, schema compatibility, operator capacity |
| Search/retrieval | lexical/vector/hybrid needs, filtering, recall, freshness | representative corpus benchmark, quality metrics, update rate, cost |
| Identity/access | federation, lifecycle, tenant membership, entitlement complexity | threat model, revocation/expiry, portability, compliance, operational ownership |
| Observability | signal volume, cardinality, retention, privacy, portability | OTel/spec version, ingestion cost, query tests, pipeline failure behavior |
| AI/model | task quality, latency, safety, privacy, tool use, availability | dated model cards, evals on real tasks, rate limits, cost per successful outcome |
| Delivery | release frequency, rollback, provenance, environment parity | build evidence, supply-chain policy, deployment/rollback exercise |

## Apply proportional defaults

Prefer the simplest option that satisfies the measured scenarios and can be operated by the owning team. Treat these as hypotheses to test:

- one deployable with clear modules before independently deployed services;
- managed capabilities before self-operated infrastructure when control and exit needs allow;
- synchronous calls before messaging when coupling, latency, and failure behavior remain acceptable;
- one appropriate data store before polyglot persistence;
- deterministic workflows before agents when uncertainty adds no product value;
- single-region recovery before multi-region active-active when the SLO and business impact do not justify it.

Do not apply these defaults when a hard constraint or validated quality scenario disproves them.

## Record the comparison

For every shortlisted option record:

| Field | Requirement |
|---|---|
| Fit | Which scenarios it satisfies or fails |
| Evidence | Benchmark, experiment, official source, or verified repository/runtime fact |
| Operations | Skills, on-call load, failure and recovery behavior |
| Security/data | Trust boundaries, isolation, classification, residency, deletion |
| Cost | P50/P90/worst-case and dominant sensitivity; dated pricing source |
| Lock-in | Coupling, data gravity, contract surface, replacement estimate |
| Reversibility | Exit path, migration seam, data export, trigger to reconsider |
| Confidence | High/medium/low with unresolved assumptions |

Eliminate options that violate a hard constraint. Do not hide a dealbreaker inside a weighted score.

## Research gate

Before recommending a concrete technology:

1. Follow `12-research-protocol.md`.
2. Verify official release/support status, security posture, regional capability, quotas, and pricing as applicable.
3. Validate ecosystem health only when ownership depends on it.
4. Run a representative spike for a low-confidence or high-blast-radius choice.
5. Date every temporal claim and add/update its source in `source-catalog.json` when it becomes durable skill guidance.

No option is “adopt”, “trial”, or “avoid” globally. State the workload, constraints, evidence, and review trigger that make the classification true here.
