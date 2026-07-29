# Efeonce Embed Runtime Delivery and Isolation Decision V2

- Status: Accepted direction — provider selection and provisioning gated by `TASK-1515`
- Date: 2026-07-22
- Owner: Platform Engineering (accountable); Growth/Public Site (product acceptance); Security/Cloud (IAM acceptance)
- Scope: portable Forms, CTAs and Meetings renderers across WordPress, Think/Astro and future approved hosts
- Decision confidence: high for the provider-neutral runtime; medium for the final delivery provider until the bounded spike closes
- Reversibility: Vercel hardening is reversible; a new Firebase project is independently retireable; adding Firebase to
  shared `efeonce-group` is a one-way project mutation and is not authorized by this decision
- Supersedes: [Efeonce Embed Runtime Delivery Decision V1](GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V1.md)

## Context

The business outcome is not “move static files to Firebase”. It is to let Greenhouse-owned Forms, CTAs and Meetings
ship presentation changes to WordPress and Think/Astro without a Greenhouse application release, while preserving
portable contracts, GTM/CMP behavior, server-side conversion truth and inexpensive rollback.

V1 correctly established the Embed Runtime protocol, immutable product releases, mutable channel manifests, retained
fleet snapshots, neutral public origin and host/API separation. It selected Firebase Hosting inside the shared
`efeonce-group` project before proving two load-bearing assumptions:

1. that a routine publisher can be restricted to one Hosting site rather than project-wide Hosting resources; and
2. that the shared-project choice is more robust or economical than hardening the existing Vercel lane or using a
   dedicated GCP project under the same organization and billing account.

Runtime inspection also found that the current WIF provider is repository-restricted but the existing deployer has
permissions far beyond static publication. The shared project therefore does not provide the security, quota,
administrative-side-effect or billing boundary implied by a dedicated delivery plane.

## Decision

1. **The provider-neutral Embed Runtime remains accepted.** Greenhouse owns source, contracts, APIs, consent and
   business state. The delivery provider serves only public JS, CSS, JSON, manifests and health metadata.
2. **`TASK-1514` hardens the current Vercel lane first.** It freezes protocol V1, composes retained fleet snapshots,
   removes manifest-to-asset races, records provenance and proves WordPress/Think fixtures. This work is required
   regardless of the final provider.
3. **The final delivery provider is selected by a bounded, evidenced gate in `TASK-1515`.** The two finalists are:
   hardened Vercel and Firebase Hosting in a dedicated GCP project under the existing Efeonce organization and billing
   account. Google Cloud Storage + CDN remains a contingency, not a default.
4. **Do not enable Firebase in `efeonce-group`.** Shared-project Firebase is a third-choice exception and requires a
   new operator-approved ADR after proving site-scoped IAM or explicitly accepting project-wide reach, enablement
   residue, shared quotas and shared billing visibility.
5. **A dedicated GCP project is not a separate organizational control plane.** If Firebase wins, the project remains
   governed from this repository, uses the existing organization/billing account and may reuse the canonical WIF pool
   through a dedicated service account and exact GitHub subject binding. It contains no Firebase data products.
6. **No separate staging project is required initially.** The workload is static and stateless; preview channels plus
   Vercel dual-publish provide preproduction evidence. This exception is revisited if stateful Firebase products,
   external tenants or independent regulatory boundaries enter scope.
7. **The public contract remains `assets.efeoncepro.com`.** Provider hostnames and SDKs are forbidden in product code,
   host markup and cross-product dependencies.
8. **Promotion is single-writer and build-once.** One protected GitHub environment, exact workflow/environment/ref
   identity, immutable source SHA/digests, a serialized fleet concurrency group, pre-promotion live-digest re-read and
   post-promotion receipt are mandatory. `baseFleetDigest` alone is not treated as an atomic compare-and-swap.
9. **Routine out-of-band production writes are forbidden.** Bootstrap and break-glass identities are distinct from the
   publisher, audited and unable to become the normal release path.
10. **Meetings is the cutover pilot.** Forms and CTA may prepare independent releases and compatibility work after the
    foundation, but production cutovers remain gated by the selected plane and a successful Meetings soak/rollback.

## Provider Gate

`TASK-1515` must compare the same fleet artifact and traffic assumptions. A provider may be selected only when all
dealbreakers pass.

| Driver / dealbreaker | Hardened Vercel | Firebase dedicated project |
| --- | --- | --- |
| Independent renderer release, no Greenhouse app build | required | required |
| Immutable release retention and exact promotion | prove deployment/alias workflow | prove preview/clone workflow |
| Single-writer protected production path | prove GitHub environment and concurrency | prove GitHub environment, WIF and concurrency |
| Least privilege / blast-radius boundary | dedicated project/team/token scope | dedicated GCP project and publisher SA |
| Neutral domain, cache headers and rollback under 15 min | prove | prove |
| WordPress + Think/Astro compatibility | prove | prove |
| Cost and operator burden at measured traffic | measure | measure |
| Exit without host/product-code changes | prove | prove |

Selection policy:

- choose hardened Vercel when it meets every dealbreaker with lower operational cost and no weaker recovery posture;
- choose Firebase in a dedicated GCP project when its security/governance boundary or exact promotion model is
  materially stronger at acceptable cost;
- do not select a provider from preference, included credits or architectural familiarity alone;
- if neither passes, keep current stable URLs and return to architecture review. No consumer cutover is authorized.

## Quality Scenarios and Fitness Functions

| Scenario | Measure | Evidence / cadence | Owner / response |
| --- | --- | --- | --- |
| Approved visual-only change | preview available in ≤5 min; live after approval in ≤10 min; zero Greenhouse application releases | release receipt per run | Platform; stop promotion on breach |
| Static delivery | ≥99.9% monthly asset availability | external synthetics by product and host | Platform; freeze promotion and invoke fallback |
| Browser experience | loader-to-first-render p95 <1.5 s on agreed mobile profile | real-host synthetic and RUM without PII | Growth + Platform; investigate before next promotion |
| Responsive/accessibility | no renderer overflow at 2048/1440/820/390; keyboard/focus/reduced-motion pass | GVC per candidate | Product acceptance; block promotion |
| Recovery | previous verified fleet restored in <15 min | quarterly drill and every provider cutover | Platform; incident if missed |
| Supply chain | every live asset maps to source SHA, digest, protected workflow and approval | receipt/provenance per promotion | Security/Platform; quarantine unknown release |
| Cost | monthly provider cost and transfer observable against agreed budget | monthly FinOps review | Platform/Finance; revisit provider at threshold |

External synthetics and host-side loader error signals are authoritative for delivery availability because a loader
that fails to execute cannot report its own failure.

## Consequences

### Benefits

- The central outcome—fast renderer releases independent of Greenhouse deploys—continues immediately on the existing
  lane instead of waiting for cloud provisioning.
- Provider choice is evidence-based and remains replaceable behind a neutral origin.
- A Firebase choice receives a real project-level IAM, quota and administrative boundary without creating another
  account, billing relationship or repository.
- WordPress and Think/Astro remain first-class consumers of one contract.

### Costs and risks

- `TASK-1515` includes a decision checkpoint and cannot be executed as an unattended provisioning task.
- A dedicated GCP project adds IaC/IAM inventory and operational ownership even though it has no fixed project fee.
- Dual-publish temporarily operates two delivery rails.
- Host deep-selector debt must be converted into a documented compatibility surface or removed before markup changes.
- DNS/provider disaster fallback has a separate RTO from same-provider fleet rollback.

## Explicit Non-decisions

- No Firebase API, project, site, service account, DNS record or billing mutation is authorized by this ADR alone.
- No Firebase Auth, Firestore, Storage, Functions, App Hosting, Remote Config, Analytics or Web SDK enters the runtime.
- No API, submission, booking, consent ledger, targeting state or PII moves out of Greenhouse/its domain providers.
- No Vercel retirement is implied by selecting or provisioning another provider.

## Revisit Triggers

- Stateful Firebase services, external tenant ownership, regulated data or independent chargeback enter scope.
- Traffic exceeds the measured pricing envelope for three consecutive months.
- More than five independently released products make a single fleet snapshot operationally expensive.
- Provider IAM cannot enforce the approved publisher boundary.
- Recovery drill exceeds 15 minutes or a host requires iframe isolation.

## Evidence References

- [Firebase in an existing Google Cloud project](https://firebase.google.com/docs/projects/use-firebase-with-existing-cloud-project)
- [Firebase Hosting multisites](https://firebase.google.com/docs/hosting/multisites)
- [Firebase Hosting resource management and clone](https://firebase.google.com/docs/hosting/manage-hosting-resources)
- [Firebase Hosting IAM roles](https://cloud.google.com/iam/docs/roles-permissions/firebasehosting)
- [Workload Identity Federation for deployment pipelines](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [Firebase Hosting usage, quotas and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
