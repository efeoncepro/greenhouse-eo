# Efeonce Experience LaunchOps — Agent Fabric & Worker Extension Architecture V1

> **Status:** Proposed — pilot architecture; no autonomous production publishing authorized.
> **Date:** 2026-07-26
> **Owner:** Wave + Product/Architecture + AI/Agent Engineering + Security/Privacy
> **Parent:** [`EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)
> **Related:** [`AGENT_ASSURANCE_EVALUATION_MODEL`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENT_ASSURANCE_EVALUATION_MODEL_V1.md), [`HUMAN_AUGMENTATION_PRODUCT_OPERATING_MODEL`](EFEONCE_EXPERIENCE_LAUNCHOPS_HUMAN_AUGMENTATION_PRODUCT_OPERATING_MODEL_V1.md)

## 1. Decision

Experience LaunchOps will use a provider-neutral **Agent Fabric**. The Fabric is owned by Wave/Efeonce and
coordinates client launches through governed workers, tools, adapters, deterministic validators and human approvals.

The product will call its bounded operational units **Workers**. A Worker is not an autonomous employee or a freeform
bot. It is a versioned capability with explicit inputs, outputs, tools, permissions, policies, evaluation, budget,
fallback and human authority.

The architecture separates:

| Concept | Meaning |
| --- | --- |
| Agent role | Reasoning specialization, such as SEO, UX or QA |
| Worker | Bounded operational package that performs a job through contracts and tools |
| Skill/recipe | Method, rules, templates and domain knowledge used by a worker |
| Adapter | Connection to an external platform or provider |
| Human role | Authority and accountability for decisions, approvals and craft |

## 2. Product boundary and location

The Agent Fabric belongs to Experience LaunchOps/Wave. It is not Greenhouse Nexa, not Globe and not the client's
CMS. Greenhouse may provide internal implementation patterns; Globe and other Efeonce capabilities may contribute
workers or recipes through explicit contracts.

```text
Launch Operator
       ↓
Experience LaunchOps Control Plane
  launch state · policy · approvals · evidence · memory
       ↓
Agent Fabric
  orchestrator · worker registry · context · provider gateway · evaluations
       ↓
Tool/MCP Gateway
  typed capabilities · authz · idempotency · audit
       ↓
Client Execution Plane
  CMS · DXP · DAM · PIM · analytics · CI/CD · ITSM · notifications
```

The control plane is the durable product memory. Provider conversations and model context are ephemeral and
reconstructable. A provider never becomes the source of truth for launch state, policy, approvals or evidence.

## 3. Deployment modes

| Mode | Control plane | Agent/runtime | Execution tools |
| --- | --- | --- | --- |
| Managed default | Wave/Efeonce isolated tenant | Wave/Efeonce runtime | Wave adapters or client-approved connectors |
| Enterprise hybrid | Wave/Efeonce or client-approved tenant | Wave runtime or client private runtime | Client-side Execution Runner for sensitive systems |
| Client-controlled | Client tenant/runtime with Wave contracts | Client cloud/provider | Client-owned adapters and credentials |

The customer can require data, credentials and execution to remain in its cloud. The product remains the same
through contracts; deployment location changes authority, network and operating responsibility.

## 4. Agent orchestration

Do not begin with an autonomous multi-agent swarm. Begin with one deterministic orchestrator and logical workers:

```text
Operator intent
  → context assembly
  → plan / worker selection
  → specialist workers in controlled sequence or parallel
  → critic + deterministic validators
  → artifact bundle and explainable diff
  → operator review
  → client approval when required
  → deterministic command executor
  → post-launch verification
```

Workers produce typed artifacts or action proposals. They do not receive arbitrary URLs, SQL, credentials or
endpoints. They request registered capabilities scoped by tenant, launch, environment and risk class.

## 5. LaunchOps Core Workers

The initial core catalogue is:

- Intake Worker
- Brief Worker
- Experience Spec Worker
- Brand Consistency Worker
- UI/UX Worker
- UX Content Worker
- SEO Worker
- AEO Worker
- Measurement Worker
- Compliance Worker
- QA Worker
- Release Worker
- Evidence Worker
- Post-Launch Worker

These are logical capabilities, not a mandatory fleet of independently deployed services or models. A runtime may
compose several workers in one process while preserving their contracts, audit and evaluation boundaries.

## 6. Client, partner and provider workers

### Client Workers

Workers configured or extended for a specific customer's CMS, design system, policy, market, approval process,
analytics stack or domain vocabulary. Examples:

- `Modyo Release Worker`
- `Acquia Governance Worker`
- `Client Design System Worker`
- `Banking Claims Worker`
- `Regulated Product Worker`
- `Internal Approval Worker`
- `Market Localization Worker`
- `GTM Measurement Worker`

### Partner Workers

Workers contributed by Globe, Efeonce Digital/Kortex or other Efeonce capabilities. They remain owned by their
practice and expose a versioned contract to LaunchOps.

### Provider Workers

Provider-specific capabilities, such as multimodal inspection, model-specific structured extraction or provider
deployment operations. They are adapters and must not leak provider assumptions into the canonical product model.

## 7. Custom Worker composition

Custom Workers are extensions, not forks of the product core:

```text
Core Worker
  + Client Policy Pack
  + Client Brand/System Profile
  + Approved Adapters
  + Custom Rules
  + Evaluation Set
  + Human Approval Policy
  = Client Worker
```

The extension layer must support configuration before code, and code only where a declared capability is genuinely
required. A custom worker may reuse core schemas, validators, recipes and safety policies.

## 8. Worker manifest contract

Every Worker, core or custom, must declare:

- stable ID, name, owner and version;
- purpose and non-goals;
- input/output schemas and artifact types;
- skills, recipes and policy sources;
- tools/adapters allowed;
- tenant, launch, environment and data scope;
- risk class and autonomy tier;
- provider/model routing policy;
- budget, rate, timeout and concurrency limits;
- human reviewer/approver and escalation path;
- evaluation set, thresholds and last evaluation;
- audit/provenance fields;
- fallback/manual procedure;
- IP and reuse classification;
- deprecation, migration and rollback path.

No Worker is production-eligible without a valid manifest.

## 9. Worker lifecycle

```text
Proposed → Designed → Sandbox → Shadow → Pilot → Approved
→ Production-scoped → Reviewed → Deprecated/Retired
```

Promotion requires evidence appropriate to risk. A model, tool, policy, adapter, provider, prompt, data scope or
output behavior change may trigger re-evaluation. A custom worker cannot silently acquire broader permissions by
being composed with another worker.

## 10. Provider Gateway

The Provider Gateway normalizes provider calls but does not erase provider-specific constraints. It owns:

- provider/model registry;
- routing by task, risk, data classification, region and client allowlist;
- structured output/tool-call normalization;
- timeout, retry, circuit breaker and cost budget;
- provider health and degradation state;
- request/response provenance and redaction;
- retention and zero/limited data retention policy;
- fallback or human handoff.

### Provider posture

| Provider rail | Best fit | Boundary |
| --- | --- | --- |
| Anthropic/Claude | Complex language, review, content, reasoning and tool-oriented work | Direct MCP connector constraints mean LaunchOps should retain its own MCP/tool gateway |
| OpenAI | General reasoning, structured tool calls, multimodal and alternative execution rail | Responses/Agents abstractions remain behind the Gateway; provider state is not canonical |
| Google Vertex AI | GCP-aligned clients, Gemini, enterprise networking/observability and managed agent runtime | Use as client/provider rail, not as LaunchOps domain source of truth |
| Microsoft Foundry | Azure/Entra-aligned clients, managed agents, enterprise tools and client-network requirements | Use as client/provider rail where Azure governance is decisive |

The initial production pilot should use one primary general provider plus one validated fallback. Adding four
providers before measuring quality, cost and operational complexity would be premature. Provider choice is routed by
policy, not by an ungoverned “best model” claim.

## 11. MCP and tools

MCP is a transport/discovery contract, not the domain source of truth. Internally, every tool delegates to typed
commands/readers with server-derived tenant context, authorization, idempotency, audit and canonical errors.

The Tool/MCP Gateway enforces:

- allowlisted servers and tools;
- OAuth/signed authentication and scoped credentials;
- input/output schema validation;
- rate, budget and timeout policy;
- data classification and redaction;
- replay protection and idempotency for mutations;
- human confirmation for material actions;
- tool health and honest degraded states.

## 11.1 Multi-transport integration strategy

Experience LaunchOps is **multi-transport**, not MCP-first:

| Transport | Primary job | Product posture |
| --- | --- | --- |
| API | Deterministic reads/commands, drafts, publish, permissions, idempotency, bulk and rollback | Backbone |
| MCP | Agent-facing discovery, semantic inspection, contextual tools and external-agent interoperability | Governed projection |
| CLI / Job Runner | Migrations, bulk jobs, deployment, local validation and private-network operations | Sandboxed operational arm |
| Webhooks / events | State changes, drift, completion, failure, retries and post-launch signals | Async synchronization |
| Browser automation | Legacy fallback where no reliable API/MCP/CLI exists | Last resort, bounded and observable |

MCP exposed by a CMS is consumed through the Tool/MCP Gateway. It does not replace the client's API, workflow,
versioning, bulk, rollback or approval contracts and is never exposed directly to an unscoped model.

Workers request business capabilities, not transport details:

```text
Worker → cms.page.publish → Capability Registry → API adapter
Worker → cms.page.inspect → Capability Registry → MCP or API adapter
Worker → cms.content.bulk_update → Capability Registry → CLI Job adapter
Worker → cms.release.verify → Capability Registry → API + webhook + fallback check
```

The `Capability Registry` and `Transport Resolver` choose the available transport according to policy, environment,
data classification, reliability and evidence requirements. A transport can change without changing the Worker or
canonical launch contract.

### Adapter manifest

Each adapter declares capability, available transports, system of record, authentication, scope, idempotency,
preview, rollback, rate limits, evidence, fallback, health and owner. CLI runners are sandboxed, command-allowlisted,
timeout-bound, artifact-producing and never expose arbitrary shell access to a model.

## 12. Memory and context

| Memory | Owner | Lifetime |
| --- | --- | --- |
| Launch state, policy, approvals and evidence | LaunchOps Control Plane | Durable, auditable |
| Client source content and system records | Client platforms | Client-controlled |
| Worker/recipe/evaluation versions | Wave/partner owner | Versioned reusable IP or client-scoped IP |
| Provider conversation/session | Provider gateway/runtime | Ephemeral or contract-defined |
| Run context/cache | Agent Fabric | Short-lived, redacted and reconstructable |

Do not create an opaque provider memory that can change launch decisions without a durable evidence reference.

## 13. Governance and economics of custom workers

Custom workers are a value-bearing extension and may be priced as setup, implementation, managed operation,
maintenance or capacity. They must not become invisible unpriced bespoke work.

The SOW declares:

- whether the worker is client-specific or reusable Efeonce IP;
- who supplies policies, examples, approvals and evaluation data;
- who owns ongoing maintenance and provider changes;
- which adapters and environments are supported;
- what happens at termination or offboarding;
- what data and artifacts are exportable.

## 14. Hard invariants

- No Worker directly publishes production without the release authority.
- No model receives unscoped client credentials or arbitrary tool access.
- No worker accepts tenant/identity scope from model-generated input.
- No custom worker bypasses core policy, audit, evidence or evaluation.
- No provider state is the canonical launch record.
- Failed, unavailable or uncertain provider/tool results remain visible as such.
- Human specialists retain domain authority and can reject, correct or override worker output.
- A custom worker can be disabled, rolled back and removed without corrupting the launch record.

## 15. Pilot acceptance criteria

- One core worker is used by the Launch Operator in a real launch.
- One client-specific worker is configured without forking the core runtime.
- Worker manifest, permissions, evaluation and provider routing are reviewable.
- At least one worker failure, refusal, fallback and human correction are captured.
- Provider can be changed for a bounded worker without rewriting the Control Plane.
- Tool/MCP calls produce the same governed command/audit path as UI actions.
- Cost, latency, quality, trust and human leverage are measured by worker.

## 16. External references

Provider capabilities are subject to change and must be revalidated before implementation:

- [OpenAI API quickstart and tools](https://platform.openai.com/docs/quickstart/make-your-first-api-request)
- [Anthropic MCP](https://docs.anthropic.com/en/docs/mcp)
- [Google Vertex AI Agent Engine](https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/overview)
- [Microsoft Foundry Agent Service](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/runtime-components)
