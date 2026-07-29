# AI feature architecture checklist

> Run for every model-powered feature. For any planner, tool use, durable memory, delegation, or side effect, also load `../references/16-agentic-systems-assurance.md` and complete `../templates/ai-runtime-evaluation.md`. Evals complement deterministic tests; neither substitutes for the other.

## Value and system shape

- [ ] State the user outcome, non-AI baseline, owner, and measurable success criterion.
- [ ] Classify the design as deterministic software, model call, workflow, agent, or multi-agent system.
- [ ] Justify every model-directed control-flow decision with an evalable need.
- [ ] Prefer a workflow when code can own the transitions.
- [ ] Document failure consequences, affected subjects/tenants, and maximum blast radius.

## Autonomy and effects

- [ ] Assign an autonomy tier to each workflow/effect, not one tier to the product.
- [ ] Define permitted/forbidden actions, scopes, quotas, step/time/token/tool/delegation limits, and safe terminal states.
- [ ] Enforce irreversible, external, privileged, destructive, privacy-sensitive, legal, and material financial checkpoints outside the model.
- [ ] Bind approval to the exact actor, action, target, arguments, expiry, and idempotency key.
- [ ] Define graduation evidence: versioned eval slice, sample size, uncertainty, production window, threshold, owner, expiry.
- [ ] Define automatic downgrade, one-action kill-switch, rollback/compensation, and resume behavior.
- [ ] Prove denied, expired, revoked, cross-tenant, replayed, and over-budget paths.

## Identity, delegation, and protocols

- [ ] Authenticate the initiating principal and propagate actor, tenant, purpose, and delegated scope.
- [ ] Authorize every tool call server-side; never rely on prompt compliance.
- [ ] Use short-lived, audience-bound credentials; never place secrets in model context.
- [ ] Keep delegation depth/time/scope bounded and prevent re-delegation unless explicit.
- [ ] For MCP, record an absolute protocol version (latest verified stable: `2025-11-25` at the 2026-07-22 research cut), transport, Origin policy, OAuth resource/audience validation, and token-passthrough prohibition.
- [ ] For A2A, record a pinned version, trusted discovery strategy, Agent Card validation, peer allowlist, task cancellation, and credential separation.
- [ ] Treat tool descriptions, Agent Cards, remote results, retrieved text, and uploaded content as untrusted.

## Context, retrieval, and memory

- [ ] Inventory instructions, user input, tool definitions, retrieved sources, history, and memory with precedence/provenance.
- [ ] Bound the token budget and measure relevance; treat ~10k static tokens only as a review heuristic.
- [ ] Apply subject/tenant authorization before retrieval and generation.
- [ ] Define retrieval freshness, citation, conflict, abstention, poisoning, deletion, and re-index behavior.
- [ ] Give memory a purpose, typed schema, write policy, provenance, retention, correction, deletion, and tenant boundary.
- [ ] Prevent retrieved or remembered content from becoming instructions.
- [ ] Prove cross-tenant isolation, stale-source handling, deletion propagation, and poisoned-source containment.

## Models, tools, and runtime

- [ ] Pin model/provider route or document the provider's exact alias semantics and change notification.
- [ ] Validate fallback routes against the same critical eval slices; do not assume equivalence.
- [ ] Define structured outputs and deterministic validators before state changes.
- [ ] Specify tool schemas, read/write/irreversible classification, timeout, retry, idempotency, cancellation, and compensation.
- [ ] Sandbox code execution; restrict filesystem, network egress, credentials, CPU/memory, and wall time.
- [ ] Persist resumable checkpoints around effect boundaries and define replay semantics.
- [ ] Test partial failure, duplicate delivery, timeout-after-effect, provider outage, model refusal, cancellation, and recovery.

## Tests and evaluation validity

- [ ] Keep unit, contract, integration, migration, security, and resilience tests for deterministic invariants.
- [ ] Version eval dataset, rubric, scorer/judge, model route, prompt, tools, retrieval snapshot, and runtime config.
- [ ] Include representative, edge, adversarial, abstention, recovery, long-horizon, and critical-risk cases.
- [ ] Keep holdouts and expected answers inaccessible to the system under evaluation.
- [ ] Separate objective checks, rubric judgments, and human criteria; never auto-score an undeclared human criterion.
- [ ] Measure judge agreement, false passes, false failures, variance, and slice coverage before using a judge as a gate.
- [ ] Gate critical/hard-fail cases independently from aggregate score.
- [ ] Compare against the non-AI baseline and prior release with repeated runs where nondeterminism matters.
- [ ] Schedule affected pre-merge evals, full pre-release evals, privacy-governed production sampling, and drift response.

## Observability and privacy

- [ ] Trace run, model, retrieval, tool, policy, approval, delegation, retry, and terminal outcome boundaries.
- [ ] Pin OTel GenAI exactly; as validated 2026-07-22, default to GenAI commit `2e994c6d59a93bb4fc1752c5378eedb9b8e14d6b` plus core semantic conventions `v1.43.0` until the GenAI repository publishes a stable schema URL/release.
- [ ] Record versions/hashes, tokens, latency, cost, tool status, policy reason codes, evaluator version, and outcome.
- [ ] Do not request or persist hidden chain-of-thought; use user-visible rationale and structured decision evidence.
- [ ] Redact secrets, credentials, raw content, and PII by default; define explicit opt-in capture where justified.
- [ ] Define access, encryption, sampling, retention, regional storage, deletion, incident hold, and audit immutability.
- [ ] Test that telemetry itself cannot leak cross-tenant data or create uncontrolled high-cardinality cost.

## Security and abuse

- [ ] Threat-model prompt injection, poisoned retrieval/memory, insecure output handling, excessive agency, denial-of-wallet, exfiltration, identity confusion, and supply-chain changes.
- [ ] Separate instructions from untrusted data structurally and validate outputs before use.
- [ ] Restrict egress and arbitrary URL fetching; scan/sandbox attachments and generated code.
- [ ] Require least privilege, deny-by-default tools, allowlisted destinations, and deterministic policy checks.
- [ ] Define abuse monitoring, incident owner, evidence preservation, notification, and recovery criteria.

## Cost, capacity, and rollout

- [ ] Model cost per successful task, attempts per success, human-review time, failed-run waste, and p95 latency.
- [ ] Set per-run, per-user/tenant, workflow-daily, and global budgets with deterministic circuit breakers.
- [ ] Account for inference, retrieval, tools, observability, evals, retries, caching, and human review.
- [ ] Test quota isolation, cost-spike alerts, cancellation, kill-switch, and degraded/fail-closed modes.
- [ ] Roll out through offline → shadow → internal → canary → broader stages with entry/exit evidence.
- [ ] Keep autonomy graduation separate from traffic expansion and model-route promotion.

## Gate result

- [ ] **PASS:** all applicable hard controls have evidence and no critical eval fails.
- [ ] **CONDITIONAL:** only named, time-bound non-critical gaps remain, with owner and safe containment.
- [ ] **FAIL:** any missing server-side authorization, effect checkpoint, tenant isolation, deterministic budget, critical eval, rollback/downgrade, or privacy control blocks release/autonomy graduation.

Record unchecked items as `gap | owner | due date | containment | blocking decision`; never silently mark an item not applicable.
