# Route Card Contract

## Contents

- [Purpose and boundary](#purpose-and-boundary)
- [Card shape](#card-shape)
- [Cable states](#cable-states)
- [Evidence rules](#evidence-rules)
- [Promotion rule](#promotion-rule)
- [Adding another model](#adding-another-model)

## Purpose and boundary

A route card is a versioned, reviewable integration map for one model family or provider surface. It is useful for
discovery, implementation planning and verification. It is not a runtime catalog, a pricing ledger, an entitlement
grant or a promotion command.

The live Globe reader `globe.producer.fleet.list` owns availability. The human ledger
`docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` explains runtime evidence and pending work. A route
card may point to both, but must never copy mutable revisions, tokens, signed URLs or current balances into itself.

## Card shape

The machine-readable card is JSON and follows `route-card.schema.json`. Concrete cards live under
`docs/architecture/creative-studio/model-fleet/routes/`, outside the skill bundle, so they remain discoverable as
Greenhouse architecture evidence without becoming an implicit runtime catalog.

| Field | Meaning | Required rule |
|---|---|---|
| `schemaVersion` | Card contract version | Must be `model-route-card.v1` |
| `cardId` | Stable card identity | Must not be a provider slug or a route ID |
| `snapshot` | Observation date and freshness policy | `observedAt` and `maxAgeDays` are required |
| `authority` | Source-of-truth ownership | Names live availability, human ledger and provider evidence |
| `modelFamily` | Public family-level description | No secret, raw response or availability claim |
| `evidence` | Primary/secondary references | Every reference has authority, date and revalidation posture |
| `routes` | Exact executable route candidates | Each route has its own identity, contract and cable matrix |
| `providerSurfaces` | Provider capabilities not yet Globe routes | Use for direct APIs, Early Access or deferred variants |
| `implementationChecklist` | Cross-route work remaining | Each item names an owner boundary and blocking reason |

Each `routes[]` entry must declare:

```text
routeId, capability, operation, provider, model, version, identityState, endpointId, region, completionDriver, lifecycle,
inputs, controls, output, transport, completion, cables, evidenceRefs, blockers
```

`routeId` is the public fidelity identity. `endpointId`, wire model and provider transport are server-side
implementation details. A route may expose a human-readable model name, but never a vendor slug in the browser
catalog.

### Exposure is separate from lifecycle

When the route card has enough evidence to distinguish rollout surfaces, declare `exposure` explicitly:

```text
governed: candidate | sealed | promoted
reader: available | gated | unknown
producerUi: selectable | visible-gated | blocked | not-exposed
externalRollout: allowed | gated | deferred
```

`canary_passed`, `promoted` and a closed circuit do not by themselves mean that the live reader reports `available`,
that the Producer can supply mandatory inputs, or that external delivery is allowed. Use `exposure` to preserve those
four independent audiences. The route card still cannot override `globe.producer.fleet.list`; it records the observed
state and its evidence.

### Contract dimensions

- `inputs` describes semantic slots, media type, MIME, cardinality, order and limits.
- `controls` describes only values the route can honor. Each control has `owner`, `valueShape`, `mechanism` and
  evidence. Duration, aspect ratio and resolution belong to output shape, not creative controls.
- `output` describes the expected result envelope and what still needs byte-level verification. Do not turn a
  provider URL into a durable authority.
- `transport` identifies queue/direct/LRO behavior, authentication posture and whether the provider returns follow-up
  URLs. It must say `not_derived` when a tracking URL is only known after submit.
- `completion` identifies the provider-specific capture mechanism. Webhook, poll and LRO are different contracts;
  `poll` is not automatically a defect.
- `cables` is an exhaustive object. Missing keys are invalid, even when a capability is not planned.
- `blockers` are explicit reasons such as namespace ambiguity, missing pricing evidence, missing rights attestation
  or a contract delta. Do not hide them in prose outside the card.

## Cable states

The required cable keys are:

```text
provider_supported
contract_declared
adapter_wired
transport_verified
output_verified
billing_verified
rights_verified
evaluated
canary_passed
promoted
available
```

Every value is an object with `state`, `evidenceRefs` and an optional `note`. The allowed states are:

| State | Meaning |
|---|---|
| `verified` | Evidence proves this edge for this exact route identity |
| `proposed` | A design or task declares the intended edge, but runtime proof is absent |
| `wired` | Code/config exists, but transport/output/runtime proof is not complete |
| `not_started` | No implementation or verification is claimed |
| `blocked` | A named dependency prevents progress |
| `unsupported` | The provider or Globe deliberately does not support this edge |
| `unknown` | Evidence is insufficient to decide |
| `stale` | Evidence existed but is outside its freshness policy |
| `gated` | The route is deliberately held behind a rollout gate |
| `not_promoted` | Readiness may exist, but promotion has not occurred |
| `available` | The live reader confirms availability |

`available` is valid only for the `available` cable. `gated` and `not_promoted` are lifecycle states, not substitutes
for missing implementation evidence. A provider-supported route can therefore be `provider_supported=verified` and
`adapter_wired=not_started` at the same time.

## Evidence rules

Evidence is scoped to the exact route or provider surface. A family announcement may prove that a capability exists,
but it cannot prove a Fal queue namespace, output MIME, pricing unit, rights grant or Globe canary.

For volatile evidence, set `revalidateBeforeUse: true` and a bounded `ttlDays`/`expiresAt`; when those are omitted,
the card-level `snapshot.maxAgeDays` is the fallback policy. A stale card is a prompt to re-discover, not permission
to implement from memory. Terms and pricing require a new digest/version before
promotion; correcting them creates a new attestation/policy rather than editing an old fact.

Use these authority classes:

- `provider_primary`: official OpenAPI, API response, pricing API, terms or usage policy.
- `runtime_primary`: Globe reader, run, attempt, output, receipt, binding or deployment readback.
- `repo_primary`: accepted ADR, task, contract or code in the owning repository.
- `secondary`: announcement or internal summary that requires primary confirmation.

Do not place API keys, bearer values, cookies, raw payloads, signed provider URLs, webhook bodies or temporary
request identifiers in a card. Record the evidence reference and the fact that a controlled submit is required.

## Promotion rule

The minimum promotion evidence is route-specific:

```text
exact identity + current rate + rights attestation + exact evaluation report
+ binding/readiness/circuit readback + new UI canary + retained output
+ MIME/hash/asset-governance readback + one settlement
```

An announcement, a 200 response, a model catalog entry, a fake adapter test or a sibling route does not satisfy this
set. If one edge is missing, keep the route `gated` or `not_promoted` and create/continue the governing task.

## Adding another model

Copy the card contract, not the Flux facts. Add a new route card or provider surface, give it a new exact identity,
capture primary evidence, run the validator, mirror the bundle, and link the governing task/ADR. Never add a model by
appending a vendor slug to a global capability allowlist or by copying a neighboring route's cable status.
