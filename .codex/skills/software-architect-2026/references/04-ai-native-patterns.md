# AI-native architecture patterns

> Use for every system that includes probabilistic models, retrieval, tools, agents, or agent-to-agent delegation. Validated against official sources on 2026-07-22. Pair with `16-agentic-systems-assurance.md` when a model can plan, call tools, retain memory, delegate, or cause side effects.

## Contents

1. [Start with the smallest sufficient system](#1-start-with-the-smallest-sufficient-system)
2. [Make autonomy an evidence-backed contract](#2-make-autonomy-an-evidence-backed-contract)
3. [Engineer context and memory](#3-engineer-context-and-memory)
4. [Integrate through governed capabilities](#4-integrate-through-governed-capabilities)
5. [Use evals alongside deterministic tests](#5-use-evals-alongside-deterministic-tests)
6. [Observe outcomes without recording private reasoning](#6-observe-outcomes-without-recording-private-reasoning)
7. [Bound cost and failure](#7-bound-cost-and-failure)
8. [Required architecture decisions](#8-required-architecture-decisions)
9. [Sources](#9-sources)

## 1. Start with the smallest sufficient system

Classify each capability before selecting a framework:

| Shape | Control flow | Prefer when | Escalate when |
|---|---|---|---|
| Deterministic software | Code owns every transition | Rules fully specify the job | Inputs require semantic interpretation |
| Model call | Code calls a model once | Classification, extraction, transformation | The model must retrieve or act |
| Workflow | Code owns the graph; models fill bounded steps | Repeatable sequence, compliance, predictable retries | The next step cannot be known in advance |
| Agent | Model selects steps or tools within a bounded policy | Open-ended tasks with measurable value | Never escalate merely for novelty |
| Multi-agent | Independent agents exchange task artifacts | Different trust domains, ownership, or independently useful specialties | Do not use when ordinary modules or parallel jobs suffice |

Default to a deterministic workflow. Adopt an agent only when evaluation evidence shows that model-directed control materially improves task success. Treat every additional agent, tool, memory store, and protocol boundary as more failure surface.

## 2. Make autonomy an evidence-backed contract

Specify autonomy per workflow, not per product:

| Tier | Permitted behavior | Minimum evidence |
|---|---|---|
| Observe | Read and summarize; no effects | Representative offline evals; privacy review |
| Recommend | Propose an action; human authorizes the exact effect | Observe evidence plus approval usability and rejection-path tests |
| Execute bounded | Perform reversible, low-impact effects within explicit limits | Staged shadow/canary evidence, deterministic policy enforcement, rollback and kill-switch drills |
| Autonomous bounded | Select and perform pre-authorized actions without per-action approval | Sustained production evidence, incident budget, continuous monitoring, downgrade rehearsal, named risk owner |

Graduation is a release decision. Record the eval set/version, sample size, confidence interval or uncertainty, failure taxonomy, production window, threshold, approver, expiry date, and rollback trigger. A global pass rate never overrides a critical-case failure.

Require a human checkpoint before any effect that is irreversible, externally communicative, legally consequential, privileged, destructive, privacy-sensitive, or materially financial. Enforce checkpoints outside the model in the command/tool boundary. A prompt is not an authorization control.

## 3. Engineer context and memory

Use four distinct stores and do not blur their trust semantics:

- **Instructions:** versioned policy and task constraints; highest precedence; never populated from retrieved content.
- **Working context:** task-local inputs, bounded by an explicit token budget and provenance.
- **Retrieval:** permission-filtered evidence with source, version, timestamp, and tenant/subject scope.
- **Memory:** an optional durable projection with purpose, schema, retention, correction, deletion, and provenance.

Treat retrieved and user-supplied content as untrusted data. Apply authorization before retrieval, not after generation. Cite the retrieved evidence used, detect stale or contradictory sources, and provide an abstention path.

The **10k static-token rule is a review heuristic, not a correctness limit**: when reusable static instructions and tool descriptions approach roughly 10,000 tokens, measure relevance and quality, then prefer retrieval or progressive disclosure if the task does not need all of it. Do not infer a universal model threshold from this heuristic.

Never let conversation history become an unbounded memory system. Summaries can lose constraints and inherit injected instructions. Persist typed facts or task checkpoints only after validation; give users and operators a way to inspect, correct, expire, and delete them.

## 4. Integrate through governed capabilities

The domain command remains the source of truth. An agent-facing tool is an adapter over the same authorization, validation, idempotency, audit, and policy boundary used by non-AI clients.

### MCP

Use MCP when interoperable discovery of resources, prompts, or tools across MCP hosts provides concrete value. It is not mandatory for every internal function. Pin and negotiate an **absolute protocol version** such as the latest verified stable version `2025-11-25` at the 2026-07-22 research cut; never write “latest MCP”.

For Streamable HTTP, validate `Origin`, authenticate every protected request, validate token audience, forbid token passthrough, use a separate downstream token, and keep local servers bound to loopback unless deliberately exposed. Tool descriptions and annotations are untrusted metadata unless their server is trusted. Curate tools by task; do not expose the whole capability estate.

### A2A

Use A2A when independent, potentially opaque agents need discovery, task lifecycle, or cross-organization interoperability. Do not use it as an in-process orchestration framework. Pin a reviewed A2A version and treat Agent Cards as claims: authenticate sensitive cards, verify declared security schemes and signatures where used, allowlist peers, constrain delegated scope, and propagate correlation without forwarding credentials.

### Tool contract

Every effectful tool declares:

- authenticated principal and delegated authority;
- tenant/resource boundary and server-side entitlement;
- input/output schema and size limits;
- read/write/irreversible classification;
- idempotency, timeout, retry, cancellation, and compensation behavior;
- policy checkpoint and human approval binding where required;
- sanitized audit event and stable error taxonomy.

## 5. Use evals alongside deterministic tests

**Evals complement tests; they do not replace them.** Use unit, contract, integration, security, migration, and resilience tests for deterministic invariants. Use evals for probabilistic behavior and end-to-end task quality.

Build evaluation in layers:

1. Deterministic assertions: schema, policy, tool selection constraints, citations, forbidden effects, idempotency.
2. Task-level evals: representative goals, edge cases, adversarial inputs, abstention, recovery, and long-horizon completion.
3. Human review: domain quality or consequences that cannot be safely reduced to an automatic score.
4. Production monitoring: sampled, privacy-governed outcomes and drift; never silently convert sampled traffic into a training corpus.

Version dataset, rubric, judge, model route, prompt, tool catalog, retrieval snapshot, and runtime configuration. Keep holdout cases and expected answers outside normal agent context. Test evaluator agreement and false-pass/false-fail rates. An LLM judge is another measurement instrument, not ground truth.

Gate on critical cases and per-slice thresholds, not only averages. Run pre-merge evals for affected behavior, broader pre-release suites, and risk-based production sampling. Keep the evaluation budget visible in the cost model.

## 6. Observe outcomes without recording private reasoning

Trace the whole run with correlated spans for model calls, retrieval, tools, policy decisions, checkpoints, delegation, retries, and final outcome. Record enough evidence to reproduce the system behavior without requesting or persisting hidden chain-of-thought.

Capture, subject to privacy policy:

- trace/run ID, workflow and version, model provider/name/version;
- prompt/template hash, tool catalog version, retrieval source IDs and freshness;
- input/output token counts, latency, retries, errors, and calculated cost;
- tool name, sanitized arguments/result status, authorization decision, approval receipt, idempotency key;
- terminal outcome, evaluator version, objective scores, human-review status, and rollback/downgrade event.

Do **not** log hidden chain-of-thought, secrets, raw credentials, unrestricted prompts, raw retrieved documents, or personal data by default. Prefer hashes, stable IDs, redacted summaries, policy reason codes, and user-visible rationale. Define access, regional storage, retention, deletion, sampling, and incident-hold rules.

Pin the telemetry convention source. As of 2026-07-22, the dedicated OpenTelemetry GenAI repository does not publish a stable schema URL or release tag; its `main` branch at commit `2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b` consumes core semantic conventions `v1.43.0`. Use that immutable GenAI commit plus the core version as the default reviewed pin, or record another exact validated commit/version. Do not invent a schema URL. Record the pin in runtime configuration and plan an explicit migration because the GenAI conventions are evolving.

## 7. Bound cost and failure

Model **cost per successful task**, not merely cost per call:

`cost_per_success = total_model_retrieval_tool_eval_cost / accepted_successful_tasks`

Also track attempts per success, human-review minutes, p50/p95 completion latency, wasted cost on failed/cancelled runs, and cost by tenant/workflow/model route.

Define per-run, per-user/tenant, workflow-daily, and global budgets. Bound steps, tokens, wall time, tool calls, retries, fan-out, and delegation depth outside the model. On exhaustion, fail closed for risky effects and return a resumable checkpoint when possible. Test the kill-switch, quota isolation, cancellation, and downgrade path.

Fallbacks must preserve semantics. A cheaper model, alternate provider, or deterministic path is valid only after passing the relevant eval slice. Multi-provider routing is not resilience if both routes share identity, region, gateway, quota, or correlated model failure.

## 8. Required architecture decisions

An AI feature is incomplete until its architecture records:

- user outcome and non-AI baseline;
- workflow versus agent rationale and autonomy tier per effect;
- instruction, context, retrieval, and memory contracts;
- model route, pinned versions, fallback semantics, and deprecation path;
- direct API, MCP, and/or A2A boundary with pinned protocol versions;
- tool identity, delegated authority, policy checkpoints, and compensation;
- deterministic test suites plus eval datasets, validity evidence, and release thresholds;
- privacy-safe telemetry with an exact OTel semantic-convention pin;
- cost-per-success target, budgets, circuit breakers, and capacity assumptions;
- staged rollout, downgrade, rollback, incident ownership, and evidence expiry.

Run `../checklists/ai-feature.md` and use `../templates/ai-runtime-evaluation.md` for agentic systems.

## 9. Sources

Official sources reviewed 2026-07-22:

- [Model Context Protocol specification, version 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP authorization, version 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [MCP Streamable HTTP transport security, version 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [A2A Protocol specification, version 0.3.0](https://a2a-protocol.org/v0.3.0/specification/)
- [OpenTelemetry GenAI semantic conventions, reviewed commit](https://github.com/open-telemetry/semantic-conventions-genai/tree/2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b)
- [OpenTelemetry core semantic conventions, version 1.43.0](https://github.com/open-telemetry/semantic-conventions/tree/v1.43.0)
- [NIST AI RMF and GenAI Profile resources](https://airc.nist.gov/)
- [OWASP Top 10 for LLM Applications, version 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
