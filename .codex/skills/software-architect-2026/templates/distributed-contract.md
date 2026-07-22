# Distributed contract — [boundary/operation]

**Status/version:** [draft | active | deprecated] / [semantic version]
**Provider/producer owner:** [team]
**Consumer/subscriber owners:** [teams]
**Validated as of:** YYYY-MM-DD
**Contract source:** [OpenAPI/AsyncAPI/schema/registry path]

## 1. Boundary and semantics

- Business capability and purpose: [why this boundary exists]
- Source of truth and invariant owner: [system/team]
- Interaction: [sync API | async command | event | webhook | data product]
- Why this interaction shape: [trade-off]
- Non-goals: [explicit exclusions]

## 2. Operation/message/data

- Stable name/type and version: [identifier]
- Request/payload schema and examples: [link]
- Response/receipt/status/error schema: [link]
- Envelope versus domain payload: [definition]
- Grain/keys/units/time semantics/classification: [for data]
- Size, rate, quota, freshness, and retention constraints: [limits]

## 3. Trust, identity, and tenancy

- Authentication: [mechanism]
- Authorization and resource/capability checks: [policy]
- Tenant/workspace derivation and scope: [verified source]
- Encryption/signature/replay-window requirements: [contract]
- Allowed context/correlation fields: [opaque, non-PII; never authorization]
- Data purpose, residency, access, deletion, and audit: [contract]

## 4. Delivery and consistency

| Concern | Contract |
|---|---|
| Consistency/invariant | [strong/causal/eventual + convergence] |
| Transaction/publication | [local transaction/outbox/etc.] |
| Delivery | [at-most/at-least once + actual scope] |
| Ordering | [none/per key/global + gap handling] |
| Idempotency/dedupe | [key, scope, retention, response replay] |
| Timeout/deadline | [budgets and propagation] |
| Retry/backoff | [retryable outcomes, cap, jitter] |
| Replay/redrive | [authority, side-effect protection, audit] |

## 5. Outcomes and recovery

| Outcome/failure | Producer behavior | Consumer behavior | Observability | Recovery/reconciliation |
|---|---|---|---|---|
| Success | [behavior] | [behavior] | [signal] | N/A |
| Rejected/permanent | [behavior] | [behavior] | [signal] | [path] |
| Retryable/transient | [behavior] | [behavior] | [signal] | [path] |
| Unknown/timeout | [behavior] | [behavior] | [signal] | [status/reconcile] |
| Poison/gap/skew | [behavior] | [behavior] | [signal] | [quarantine/fix/replay] |

## 6. Evolution and support

- Compatibility policy and CI conformance: [rules/tests]
- Consumer fixtures and failure tests: [links]
- Deprecation window, notice, adoption signal, and retirement owner: [contract]
- SLO/support/incident ownership: [target and route]
- Cost/allocation implications: [model]

## 7. Risks and acceptance

| Residual risk/assumption | Impact | Evidence or mitigation | Owner | Revisit trigger/date |
|---|---|---|---|---|
| [risk] | [impact] | [evidence] | [owner] | [trigger] |

**Provider approval:** [owner/date]
**Consumer approvals:** [owners/date]
**Security/data/ops review:** [as applicable]
