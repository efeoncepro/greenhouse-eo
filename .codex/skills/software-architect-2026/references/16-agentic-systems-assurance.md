# Agentic systems assurance

> Load when a model can choose steps, call tools, retain memory, delegate, or create side effects. This reference turns an agent design into an evidence-bearing runtime contract. Validated against official sources on 2026-07-22.

## Contents

1. [Workflow or agent](#1-workflow-or-agent)
2. [Runtime and checkpoints](#2-runtime-and-checkpoints)
3. [Identity and delegation](#3-identity-and-delegation)
4. [MCP and A2A boundaries](#4-mcp-and-a2a-boundaries)
5. [Evaluation validity](#5-evaluation-validity)
6. [Memory and RAG](#6-memory-and-rag)
7. [Deterministic guardrails](#7-deterministic-guardrails)
8. [Privacy-safe observability](#8-privacy-safe-observability)
9. [Cost per successful outcome](#9-cost-per-successful-outcome)
10. [Autonomy evidence gates](#10-autonomy-evidence-gates)
11. [Sources](#11-sources)

## 1. Workflow or agent

Use an agent only for model-directed control flow. A workflow may contain model calls while code still owns its states and transitions. Require a written hypothesis that an agent improves a named task metric over a workflow or non-AI baseline, and test that hypothesis.

Reject multi-agent design when the proposed “agents” merely mirror code modules, personas, or pipeline stages. Accept it when boundaries require independent ownership, trust, lifecycle, or opaque cross-system collaboration. Each additional agent needs an explicit contract, unique value, bounded authority, and independent failure containment.

## 2. Runtime and checkpoints

Represent a run as a durable state machine even if the model selects the next permitted transition:

`accepted → planning → awaiting_policy/approval → executing → checkpointed → completed | failed | cancelled | quarantined`

Persist a checkpoint before and after every external effect. Include run ID, versioned inputs, actor/delegation, state, completed effects and idempotency keys, pending effect, budgets consumed/remaining, approvals, tool/model versions, and expiry. Do not persist hidden reasoning.

Define timeout, cancellation, duplicate delivery, retry class, compensation, and resume behavior per state. A timeout after an external call is an unknown outcome, not proof of failure; reconcile by idempotency/readback before retrying. Termination must be enforced by runtime counters, not model promises.

## 3. Identity and delegation

Keep these identities distinct:

- initiating human/service principal;
- agent/runtime workload identity;
- delegated authorization grant;
- downstream resource identity;
- model/provider account.

Bind delegated grants to subject, audience, tenant, purpose, capabilities, resource constraints, issuance/expiry, maximum depth, and revocation. Never broaden scope during delegation. A child agent receives a narrowed grant, never raw parent credentials. Re-authorize each effect at execution time because roles and grants can expire mid-run.

Audit `who requested`, `which workload executed`, `under which grant`, `what policy decided`, and `what effect occurred`. Preserve correlation IDs across boundaries without using user/tenant identifiers as globally visible trace attributes.

## 4. MCP and A2A boundaries

MCP connects a host to resources, prompts, and tools. A2A supports collaboration and task lifecycle between independent agents. They solve different boundaries and may coexist.

For MCP, pin an absolute version, negotiate it during initialization, validate Streamable HTTP Origin, use HTTPS and OAuth resource metadata where applicable, validate audience, and prohibit token passthrough. Treat the MCP server as an adapter over canonical domain capabilities, not a parallel authorization system.

For A2A, pin a reviewed version, validate Agent Cards and declared authentication, selectively disclose sensitive capabilities, allowlist or govern discovery, isolate credentials, enforce task cancellation, and constrain artifacts by type/size/classification. Treat remote agents as untrusted services even when their cards are signed.

For both protocols, test schema evolution, version mismatch, unavailable peer/tool, malformed output, confused deputy, replay, tenant isolation, cancellation, and partial completion. “Protocol-compliant” does not mean “authorized or safe.”

## 5. Evaluation validity

An eval result is valid only for its recorded system configuration and population. Version prompts, models, tools, policy, retrieval corpus/snapshot, memory seed, evaluator, dataset, and runtime. Declare intended users/tasks, exclusions, sample construction, and expected failure prevalence.

Protect against contamination: keep holdout inputs and expected answers outside the skill and runtime context; rotate exposed cases; prohibit tuning solely to aggregate scores. Do not include expected answers in public scenario manifests.

Use deterministic checks for invariants. Calibrate rubric or LLM judges against blinded domain-human labels, report inter-rater agreement and false-pass/false-fail rates, and re-calibrate after judge/model changes. Repeat nondeterministic cases enough to expose variance. Analyze slices and critical cases independently; averages conceal catastrophic minority failures.

Evals complement deterministic tests. A schema-valid but wrong action can fail an eval; a good-looking response with an authorization bypass must fail a test and the release gate.

## 6. Memory and RAG

Separate retrieval from durable memory. Retrieval reads a governed corpus; memory writes a projection about a subject or task. Both require provenance, authorization, tenant isolation, purpose, freshness, and deletion propagation.

Apply access control before retrieval. Return source identifiers and timestamps, detect conflicts, bound the result set, and support abstention. Test malicious instructions inside documents because source trust and content trust differ.

Validate memory writes against a typed schema. Distinguish observed facts, user assertions, model inferences, and preferences. Store confidence and origin where appropriate. Never silently turn a model inference into an authoritative fact. Provide correction, expiry, tombstone/deletion, and re-index/re-embedding paths.

## 7. Deterministic guardrails

Put non-negotiable controls outside probabilistic generation:

- authentication, authorization, tenant/resource filtering;
- allowed tools/actions/destinations and schema validation;
- approval verification and effect binding;
- quotas, spend, steps, tokens, wall time, fan-out, and delegation depth;
- idempotency, replay prevention, transaction/outbox rules, cancellation;
- content/data classification, egress policy, sandbox, and secret access;
- state-machine transition validity and terminal-state enforcement.

Guardrails fail closed for high-impact effects. A model can recommend a policy outcome but cannot be the sole enforcer. Exercise guardrails with negative and adversarial tests, including policy-service outages.

## 8. Privacy-safe observability

Use a run trace with child spans/events for model, retrieval, tool, policy, approval, delegation, and outcome. As of 2026-07-22, pin the OpenTelemetry GenAI conventions to commit `2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b` and core semantic conventions `v1.43.0`, or record another exact reviewed commit/version. The dedicated GenAI repository does not yet publish a stable schema URL; do not invent one.

Prefer structured evidence: versions/hashes, source IDs, token counts, latency, cost, sanitized tool status, policy/approval reason codes, evaluator version, and terminal outcome. Never request or retain hidden chain-of-thought. A user-visible rationale is a product artifact and must not be represented as the model's private reasoning.

Default content capture off. Define redaction before export, field allowlists, encryption, access, regional boundary, retention, deletion, sampling, incident hold, and high-cardinality controls. Test telemetry sinks as data processors and failure dependencies.

## 9. Cost per successful outcome

Compute:

`CPS = (inference + retrieval + tools + telemetry + eval allocation + retries + human review) / accepted successes`

Segment by workflow, tenant/tier, model route, outcome, and autonomy tier. Pair CPS with attempts/success, p95 completion time, reviewer minutes, failure waste, and user-value denominator. A cheap call that triggers retries or human cleanup can be an expensive task.

Enforce budgets per run, actor/tenant, workflow/day, and system. Bound retry amplification and multi-agent fan-out. Treat eval and observability spend as operating cost. Revalidate routing/fallbacks against both quality and CPS before promotion.

## 10. Autonomy evidence gates

| Gate | Required evidence | Hard blockers |
|---|---|---|
| Observe | Representative offline evals; privacy/security review; bounded read scope | Cross-tenant leak, secret exposure, unbounded context/cost |
| Recommend | Observe gate plus approval/rejection UX; proposed-vs-executed diff; human override metrics | Ambiguous effect, approval not bound to exact action |
| Execute bounded | Critical evals all pass; deterministic guardrails; shadow/canary window; rollback/kill-switch drill; on-call owner | Any unauthorized/irreversible critical failure, no reconciliation/idempotency, no downgrade |
| Autonomous bounded | Sustained production evidence; calibrated sampling; incident and cost budgets; repeated failure/recovery drills; executive/risk approval where material | Any expired evidence, unresolved severe incident, critical slice below threshold, inability to stop globally |

Evidence expires when the model, prompt, tool contract, policy, corpus, memory schema, critical dependency, target population, or risk classification changes materially. Re-run the affected slices before promotion. Traffic rollout, model-route promotion, and autonomy graduation are separate decisions.

## 11. Sources

Official sources reviewed 2026-07-22:

- [MCP specification, latest verified stable version 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [MCP transport security](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [A2A Protocol specification, version 0.3.0](https://a2a-protocol.org/v0.3.0/specification/)
- [A2A agent discovery guidance](https://a2a-protocol.org/latest/topics/agent-discovery/)
- [OpenTelemetry GenAI semantic conventions, reviewed commit](https://github.com/open-telemetry/semantic-conventions-genai/tree/2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b)
- [OpenTelemetry core semantic conventions, version 1.43.0](https://github.com/open-telemetry/semantic-conventions/tree/v1.43.0)
- [NIST AI Risk Management Framework resources](https://airc.nist.gov/)
- [NIST AI 600-1, Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [OWASP Top 10 for LLM Applications, version 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
