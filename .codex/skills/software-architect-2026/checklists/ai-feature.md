# AI Feature Checklist

> Run for any feature that uses an LLM or agent. Layered on top of `pre-design.md` / `pre-build.md` / `pre-launch.md` — these are the AI-specific concerns those checklists don't cover deeply.

## Purpose and value

- [ ] **The user-visible value is articulated** in plain language (not "AI does X" — "user can now Y in Z seconds")
- [ ] **The non-AI alternative is acknowledged** (would a form or report do the job?)
- [ ] **The metric for success is defined**: e.g., "users complete task in <30s in 80% of cases"
- [ ] **The failure mode is acceptable**: when the LLM is wrong, what's the cost to the user?

## Autonomy tier

- [ ] **The autonomy tier is explicit** for this feature:
  - **Observe**: AI watches but doesn't act
  - **Recommend with approval**: AI suggests; human approves before action
  - **Execute with logging**: AI acts; humans review the audit log later
  - **Autonomous**: AI acts without per-decision human review
- [ ] **The chosen tier matches the eval-proven reliability** (don't deploy autonomous before evals show it's reliable)
- [ ] **Tier graduation rules are defined**: what evidence is needed to move from approval-required to execute-with-logging?
- [ ] **Tier downgrade is one-click**: if reliability degrades, ops can demote without code changes (feature flag)

## Context strategy

- [ ] **What goes into the context window is documented**: system prompt, RAG sources, conversation history, tool descriptions
- [ ] **Token budget per call** is bounded (no unbounded context growth)
- [ ] **Sensitive data filtering** is in place (PII not sent to LLM unless required and authorized)
- [ ] **Context staleness** is acknowledged (RAG corpus update frequency; cache lifetimes)
- [ ] **Prompt caching** is configured if system prompt is large and repeated (Anthropic, OpenAI both support)

## Model and provider strategy

- [ ] **Primary model selected** with rationale (capability, cost, latency)
- [ ] **Fallback model** identified (what runs if primary is rate-limited or down)
- [ ] **Multi-model routing** considered (Haiku for simple, Sonnet for medium, Opus for hard)
- [ ] **Model abstraction layer** in place (gateway like LiteLLM, agentgateway, or thin wrapper) so model choice is two-way
- [ ] **Model version pinned** explicitly (don't use `claude-sonnet-4` aliases without knowing version semantics)

## Integration model

- [ ] **MCP vs. direct API decision made** with rationale
- [ ] **For MCP**: tool schemas defined; tools tested in isolation; MCP server is read-only or has explicit write scopes
- [ ] **Tool authz enforced server-side** (don't trust the LLM to respect scope)
- [ ] **Untrusted-content sandboxing**: anything web-fetched or user-uploaded is treated as untrusted

## Evals and quality

- [ ] **Eval set exists** before launch (not after)
- [ ] **Eval set is representative**: covers happy path + edge cases + adversarial inputs
- [ ] **Eval set has a target pass rate** (e.g., "90% on golden set")
- [ ] **Evals run on every deploy** (CI integration)
- [ ] **Production sample evaluation** scheduled (sample real production calls weekly, score them)
- [ ] **Regression detection**: when eval pass rate drops, alerts fire
- [ ] **Domain expert involved** in eval set design (especially for non-generic domains like CRM, finance)

## Observability

- [ ] **LLM call tracing** active (Langfuse / LangSmith / OpenLLMetry → general APM)
- [ ] **Per-call attributes captured**: model, version, input tokens, output tokens, latency, cost, eval score (if applicable)
- [ ] **Trace covers full agent run** (not just individual LLM calls) — tool calls in trace hierarchy
- [ ] **User and tenant ID propagated** to traces (with PII discipline)
- [ ] **Failure modes captured**: rate limit, timeout, content policy, malformed output, tool errors

## Cost controls

- [ ] **Per-day cost ceiling** set per workflow with kill-switch behavior
- [ ] **Per-tenant cost ceiling** set if multi-tenant
- [ ] **Anomaly detection** on cost (10× spike alerts)
- [ ] **Token budget per single agent run** capped (no infinite-loop risk)
- [ ] **Cost monitoring tested**: simulated cost spike triggers the alert and kill-switch as expected

## Security

- [ ] **Prompt injection mitigations** layered:
  - Structural separation: instructions in system prompt, data clearly framed as data
  - Strip / sandbox untrusted content
  - Output validation before high-impact action
  - Detect-and-confirm for irreversible actions
- [ ] **Data exfiltration mitigations**:
  - Network egress controls on agent (allowlist of APIs)
  - Output filtering for suspicious URLs / encoded data
  - No arbitrary URL fetching from agent context
- [ ] **For code-executing agents**: sandbox in ephemeral microVM or isolated container
- [ ] **Tool scope review**: agent has only the tools it needs, with minimum permissions per tool
- [ ] **Audit log of every agent action** with reasoning chain captured

## User experience

- [ ] **Users know they're interacting with AI** (transparency obligation under EU AI Act)
- [ ] **AI mistakes are recoverable**: undo, retry, escalate-to-human paths exist
- [ ] **Latency is acceptable** for the use case (streaming for chat; batch for offline work)
- [ ] **Failure messages are clear** (not "an error occurred" — actionable info)
- [ ] **Confidence is communicated honestly** (don't pretend the AI is more certain than it is)

## Compliance (EU AI Act and equivalents)

- [ ] **AI Act risk classification done**: prohibited / high-risk / limited-risk / general-purpose
- [ ] **For high-risk uses**: full compliance program in place (risk management, data governance, transparency, human oversight, robustness)
- [ ] **For limited-risk** (chatbots, generated content): disclosure obligations met
- [ ] **Data fed to LLM provider classified**: what's in scope of GDPR / Ley 21.719 / LGPD
- [ ] **Sub-processor agreement** in place with LLM provider (or self-hosting)

## Cognitive debt prevention

- [ ] **The agent's behavior is documented** at the prompt level (what's in the system prompt, why)
- [ ] **The eval set serves as documentation** for what "correct" looks like
- [ ] **Prompt versions are tracked** (Langfuse prompt management or git-tracked)
- [ ] **The team can reproduce** an agent's decision from the trace + prompts + tool inputs

## Rollout

- [ ] **Feature flag** for gradual rollout
- [ ] **Internal dogfooding** before customer rollout
- [ ] **A/B test** if comparing AI to non-AI baseline
- [ ] **Kill-switch tested** in staging
- [ ] **Rollback plan**: if the AI feature degrades, what happens to in-progress user sessions?

---

## What to do with unchecked items

- **Purpose / value gaps**: don't ship. AI features without clear value are tech demos.
- **Eval gaps**: never ship without evals. The eval set is the test suite for AI; without it, you have no idea if it works.
- **Cost ceiling gaps**: non-negotiable. Ship without a kill-switch and you'll wake up to a five-figure bill.
- **Security gaps**: layer the mitigations even if no single one is perfect. AI security is defense in depth.
- **Compliance gaps**: especially for EU users / Ley 21.719 / LGPD — get legal sign-off before launch.

For AI features more than any other category: **the failures are nonlinear**. The system works fine for 1000 calls and then fails catastrophically on the 1001st (a creative prompt injection, a runaway loop, a model deprecation). The checklist exists because intuition is unreliable here.
